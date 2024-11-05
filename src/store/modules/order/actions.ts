import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { getProductIdentificationValue, translate } from '@hotwax/dxp-components'
import emitter from "@/event-bus";
import store from "@/store";


const actions: ActionTree<OrderState, RootState> = {

  async findPurchaseOrders ({ commit, state }, payload) {
    if (payload.json.params.start === 0) emitter.emit("presentLoader");
    let resp;
    try {
      resp = await OrderService.fetchPurchaseOrders(payload)

      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.orderId.groups?.length > 0) {
        const orders = resp.data.grouped.orderId
        
        orders.groups.forEach((order: any) => {
          order.doclist.docs.forEach((item: any) => {
            item.quantityAccepted = 0;
          })
        })

        if (payload.json.params.start && payload.json.params.start > 0) orders.groups = state.purchaseOrders.list.concat(orders.groups);
        commit(types.ORDER_PRCHS_ORDRS_UPDATED, {
          list: orders.groups,
          total: orders.ngroups
        })
      } else {
        payload.json.params.start ? showToast(translate("Orders not found")) : commit(types.ORDER_PRCHS_ORDRS_UPDATED, { list: [], total: 0 });
      }
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
    }
    if (payload.json.params.start === 0) emitter.emit("dismissLoader");
    return resp;
  },
  async updateProductCount({ commit, state }, payload ) {
    const barcodeIdentifier = store.getters['util/getBarcodeIdentificationPref'];
    const getProduct = store.getters['product/getProduct'];

    const item = state.current.items.find((item: any) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) : item.internalName;
      return itemVal === payload;
    });

    if (item) {
      if(item.orderItemStatusId === 'ITEM_COMPLETED') return { isCompleted: true }

      item.quantityAccepted = item.quantityAccepted ? parseInt(item.quantityAccepted) + 1 : 1;
      commit(types.ORDER_CURRENT_UPDATED, state.current )
      return { isProductFound: true }
    }

    return { isProductFound: false }
  },
  async addOrderItem ({ commit }, payload) {
    const product = { 
      ...payload,
      quantityAccepted: 0,
      quantityOrdered: 0
    }
    commit(types.ORDER_CURRENT_PRODUCT_ADDED, product)
  },
  async getOrderDetail({ commit, state }, { orderId }) {
    let resp;

    const current = state.current as any
    const orders = state.purchaseOrders.list as any

    if (current.length && current[0]?.orderId === orderId) { return current }

    else if(orders.length > 0) {
      return orders.some((order: any) => {
        if (order.doclist.docs[0]?.orderId === orderId) {
          this.dispatch('product/fetchProductInformation',  { order: order.doclist.docs });
          commit(types.ORDER_CURRENT_UPDATED, { ...state.current, orderId: order.doclist.docs[0]?.orderId, externalOrderId: order.doclist.docs[0]?.externalOrderId, orderStatusId: order.doclist.docs[0]?.orderStatusId, orderStatusDesc: order.doclist.docs[0]?.orderStatusDesc, items: JSON.parse(JSON.stringify(order.doclist.docs)) })
          return current;
        }
      })
    }
    try {
      const payload = {
        "json": {
          "params": {
            "rows": 10,
            "group": true,
            "group.field": "orderId",
            "group.limit": 10000
          },
          "query": "docType:ORDER",
          "filter": [
            `orderTypeId: PURCHASE_ORDER AND orderId: ${orderId} AND orderStatusId: (ORDER_APPROVED OR ORDER_CREATED) AND facilityId: ${this.state.user.currentFacility.facilityId}`
          ]
        }
      }
      resp = await OrderService.fetchPODetail(payload);

      if (resp.status === 200 && !hasError(resp) && resp.data.grouped) {
        const order = resp.data.grouped.orderId.groups[0]
        order.doclist.docs.forEach((product: any) => {
          product.quantityAccepted = 0;
        })
        this.dispatch('product/fetchProductInformation', { order: order.doclist.docs });
        commit(types.ORDER_CURRENT_UPDATED, { orderId: order.groupValue, externalOrderId: order.doclist.docs[0]?.externalOrderId, orderStatusId: order.doclist.docs[0]?.orderStatusId, orderStatusDesc: order.doclist.docs[0]?.orderStatusDesc, items: order.doclist.docs, poHistory: [] })
      }
      else {
        showToast(translate("Something went wrong"));
        commit(types.ORDER_CURRENT_UPDATED, { orderId, externalOrderId: '', orderStatusId: '', orderStatusDesc: '', items: [], poHistory: [] })
      }
    } catch (error) {
      showToast(translate("Something went wrong"));
      commit(types.ORDER_CURRENT_UPDATED, { orderId, externalOrderId: '', orderStatusId: '', orderStatusDesc: '', items: [], poHistory: [] })
    }
    return resp;
  },
  async createPurchaseShipment({ commit }, payload) {
    let resp;
    try {
      const params = {
        orderId: payload.orderId,
        facilityId: this.state.user.currentFacility.facilityId
      }

      resp = await OrderService.createPurchaseShipment(params)

      if (resp.status === 200 && !hasError(resp) && resp.data.shipmentId) {
        const shipmentId = resp.data.shipmentId

        Promise.all(payload.items.map((item: any, index: number) => {
          // TODO: improve code to don't pass shipmentItemSeqId
          const shipmentItemSeqId = `0000${index+1}`
          return this.dispatch('shipment/addShipmentItem', { item, shipmentId, shipmentItemSeqId, orderId: params.orderId })
        })).then(async (resp) => {
          // adding shipmentItemSeqId property in item
          resp.map((response: any) => {
            payload.items.map((item: any) => {
              if (item.productId === response.data.productId) {
                item.itemSeqId = response.data.shipmentItemSeqId
              }
            })
          })

          const poShipment = {
            shipmentId,
            items: payload.items,
            isMultiReceivingEnabled: true
          }
          await this.dispatch('shipment/receiveShipment', poShipment).catch((err) => console.error(err))
        })
      } else {
        showToast(translate("Something went wrong"));
      }
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
    }
    return resp;
  },

  async getPOHistory({ commit, state }, payload) {
    let resp;
    const current = state.current as any;
    try {
      const params = {
        "inputFields":{
          "orderId": [payload.orderId],
          "orderId_op": "in"
        },
        "entityName": "ShipmentReceiptAndItem",
        "fieldList": ["datetimeReceived", "productId", "quantityAccepted", "quantityRejected", "receivedByUserLoginId", "shipmentId", 'locationSeqId'],
        "orderBy": 'datetimeReceived DESC'
      }
      const facilityLocations = await this.dispatch('user/getFacilityLocations', this.state.user.currentFacility.facilityId);
      const locationSeqId = facilityLocations.length > 0 ? facilityLocations[0].locationSeqId : "";
      resp = await OrderService.fetchPOHistory(params)
      if (resp.status === 200 && !hasError(resp) && resp.data?.count > 0) {
        const poHistory = resp.data.docs;
        current.poHistory.items = poHistory;
        const facilityLocationByProduct = poHistory.reduce((products: any, item: any) => {
          products[item.productId] = item.locationSeqId
          return products
        }, {});

        const receiversLoginIds = [...new Set(current.poHistory.items.map((item: any) => item.receivedByUserLoginId))]
        const receiversDetails = await this.dispatch('party/getReceiversDetails', receiversLoginIds);
        current.poHistory.items.map((item: any) => {
          item.receiversFullName = receiversDetails[item.receivedByUserLoginId].fullName;
        })
        current.items.map((item: any) => {
          item.locationSeqId = facilityLocationByProduct[item.productId] ? facilityLocationByProduct[item.productId] : locationSeqId;
        });

        commit(types.ORDER_CURRENT_UPDATED, current);
        return poHistory;
      } else {
        current.items.map((item: any) => {
          item.locationSeqId = locationSeqId;
        });
        current.poHistory.items = [];
      }
    } catch(error){
      console.error(error)
      current.poHistory.items = [];
    }
    commit(types.ORDER_CURRENT_UPDATED, current);
    return resp;
  },
  setItemLocationSeqId({ state, commit }, payload) {
    const item = state.current.items.find((item: any) => item.orderItemSeqId === payload.item.orderItemSeqId)
    if(item){
      item.locationSeqId = payload.locationSeqId
    }
    commit(types.ORDER_CURRENT_UPDATED, state.current)
  },
  updateCurrentOrder({ commit }, payload) {
    commit(types.ORDER_CURRENT_UPDATED, payload)
  },
  clearPurchaseOrders({commit}){
    commit(types.ORDER_PRCHS_ORDRS_UPDATED, {
      list: [],
      total: 0
    })
  },
  updatePurchaseOrders({commit, state}, payload){
    commit(types.ORDER_PRCHS_ORDRS_UPDATED, {
      list: payload.purchaseOrders,
      total: payload.total ? payload.total : state.purchaseOrders.total
    })
  }
}

export default actions;
