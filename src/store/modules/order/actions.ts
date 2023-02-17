import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'


const actions: ActionTree<OrderState, RootState> = {

  async findPurchaseOrders ({ commit, state }, payload) {
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
        //showing error whenever not getting Orders
        showToast(translate("Orders not found"));
      }
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
    }
    return resp;
  },
  async updateProductCount({ commit, state }, payload ) {
    state.current.items.find((item: any) => {
      if (item.internalName === payload) {
        item.quantityAccepted = item.quantityAccepted + 1;
      }
    });
    commit(types.ORDER_CURRENT_UPDATED, state.current )
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
          commit(types.ORDER_CURRENT_UPDATED, { ...state.current, orderId: order.doclist.docs[0]?.orderId, externalOrderId: order.doclist.docs[0]?.externalOrderId, items: order.doclist.docs })
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
        commit(types.ORDER_CURRENT_UPDATED, { orderId: order.groupValue, externalOrderId: order.doclist.docs[0]?.externalOrderId, items: order.doclist.docs, poHistory: [] })
      }
      else {
        showToast(translate("Something went wrong"));
        commit(types.ORDER_CURRENT_UPDATED, { orderId, externalOrderId: '', items: [], poHistory: [] })
      }
    } catch (error) {
      showToast(translate("Something went wrong"));
      commit(types.ORDER_CURRENT_UPDATED, { orderId, externalOrderId: '', items: [], poHistory: [] })
    }
    return resp;
  },
  async createPurchaseShipment({ commit }, payload) {

    let resp;
    try {
      const params = {
        orderId: payload.order.orderId,
        facilityId: this.state.user.currentFacility.facilityId
      }

      resp = await OrderService.createPurchaseShipment(params)

      if (resp.status === 200 && !hasError(resp) && resp.data.shipmentId) {
        const shipmentId = resp.data.shipmentId

        Promise.all(payload.order.items.map((item: any, index: number) => {
          // TODO: improve code to don't pass shipmentItemSeqId
          const shipmentItemSeqId = `0000${index+1}`
          return this.dispatch('shipment/addShipmentItem', {item, shipmentId, shipmentItemSeqId, orderId: params.orderId})
        })).then(async (resp) => {

          // adding shipmentItemSeqId property in item
          resp.map((response: any) => {
            payload.order.items.map((item: any) => {
              if (item.productId === response.data.productId) {
                item.itemSeqId = response.data.shipmentItemSeqId
              }
            })
          })

          const poShipment = {
            shipment: {
              shipmentId,
            },
            items: payload.order.items
          }
          await this.dispatch('shipment/receiveShipment', {payload: poShipment}).catch((err) => console.error(err))
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

  async getPOHistory({ commit, state, dispatch }, payload) {
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
      dispatch("getReceiverDetails");
      if (resp.status === 200 && !hasError(resp) && resp.data?.count > 0) {
        const poHistory = resp.data.docs;
        current.poHistory.items = poHistory;
        const facilityLocationByProduct = poHistory.reduce((products: any, item: any) => {
          products[item.productId] = item.locationSeqId
          return products
        }, {});
        
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
      showToast(translate("Something went wrong"));
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
  clearPurchaseOrders({commit}){
    commit(types.ORDER_PRCHS_ORDRS_UPDATED, {
      list: [],
      total: 0
    })
  },
  async getReceiverDetails({commit}) {
    let resp;
    try {
      const params = {
        "inputFields": {
          "userLoginId": 'hotwax.user'
        },
        "fieldList": ["firstName", "lastName"],
        "entityName": "PersonAndUserLoginAndContactDetails",
      }
      resp = await OrderService.getReceiverDetails(params);
      console.log(resp);
    } catch(err) {
      console.error(err);
    }
  }
}

export default actions;
