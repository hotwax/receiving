import { ReturnService } from "@/services/ReturnService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ReturnState from './ReturnState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { getProductIdentificationValue, translate } from '@hotwax/dxp-components'
import emitter from '@/event-bus'
import store from "@/store";

const actions: ActionTree<ReturnState, RootState> = {
  async findReturn ({ commit, state }, payload) {
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;
    try {
      resp = await ReturnService.findReturns(payload)
      if (resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0) {
        let returns = resp.data.docs;
        const statusIds = [...new Set(returns.map((returnShipment: any) => returnShipment.statusId))]
        const statuses = await this.dispatch('util/fetchStatus', statusIds);
        returns.map(async (shipment: any) => {
          shipment.statusDesc = statuses[shipment.statusId]
        });
        if (payload.viewIndex && payload.viewIndex > 0) returns = state.returns.list.concat(returns);
        commit(types.RETURN_LIST_UPDATED, returns )
      } else {
        payload.viewIndex ? showToast(translate("Returns not found")) : commit(types.RETURN_LIST_UPDATED, []);
      }
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
    }
    if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    return resp;
  },
  async updateReturnProductCount ({ commit, state }, payload) {
    const barcodeIdentifier = store.getters['util/getBarcodeIdentificationPref'];
    const getProduct = store.getters['product/getProduct'];

    const item = state.current.items.find((item: any) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) : item.internalName;
      return itemVal === payload;
    });

    if (item) {
      item.quantityAccepted = item.quantityAccepted ? parseInt(item.quantityAccepted) + 1 : 1;
      commit(types.RETURN_CURRENT_UPDATED, state);
      return { isProductFound: true }
    }

    return { isProductFound: false }
  },
  async setCurrent ({ commit, state }, payload) {
    let resp;
    try {
      // Check if already exist in the returns list
      let returnShipment = state.returns.list.find((returnShipment: any) => returnShipment.shipmentId === payload.shipmentId);

      if (!returnShipment) {
        // Fetch shipment records if miss in return list
        const getReturnShipmentPayload = {
          "entityName": "SalesReturnShipmentView",
          "inputFields": {
            "shipmentId": payload.shipmentId
          },
          "fieldList" : [ "shipmentId","externalId","statusId","shopifyOrderName","hcOrderId","trackingCode", "destinationFacilityId" ],
          "noConditionFind": "Y",
          "viewSize": 1,
          "viewIndex": 0,
        } as any
        resp = await ReturnService.findReturns(getReturnShipmentPayload)
        if (resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0) {
          returnShipment = resp.data.docs[0];
          const statuses = await this.dispatch('util/fetchStatus', [ returnShipment.statusId ]);
          returnShipment.statusDesc = statuses[returnShipment.statusId]
        } else {
          showToast(translate('Something went wrong'));
          console.error("error", resp.data._ERROR_MESSAGE_);
          return;
        }
      }

      // Get shipment items of return shipment
      resp = await ReturnService.getReturnDetail(payload);

      if (resp.status === 200 && !hasError(resp) && resp.data.items) {
        // Current should have data of return shipment as well as items
        const facilityLocations = await this.dispatch('user/getFacilityLocations', returnShipment.destinationFacilityId)
        if(facilityLocations.length){
          const locationSeqId = facilityLocations[0].locationSeqId
          resp.data.items.map((item: any) => {
            item.locationSeqId = locationSeqId;
          });
        } else {
          showToast(translate("Facility locations were not found corresponding to destination facility of return shipment. Please add facility locations to avoid receive return shipment failure."))
        }
        
        commit(types.RETURN_CURRENT_UPDATED, { current: { ...resp.data, ...returnShipment} })
        const productIds = [ ...new Set(resp.data.items.map((item: any) => item.productId)) ]

        if(productIds.length) {
          this.dispatch('product/fetchProducts', { productIds })
        }
        
        return resp.data;
      } else {
        showToast(translate('Something went wrong'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }

    } catch (err: any) {
      showToast(translate('Something went wrong'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
  },
  receiveReturnItem ({ state }, payload) {
    const facilityId = state.current.destinationFacilityId;
    return Promise.all(payload.items.map(async (item: any) => {
      const params = {
        facilityId,
        shipmentId: payload.shipmentId,
        shipmentItemSeqId: item.itemSeqId,
        productId: item.productId,
        quantityAccepted: item.quantityAccepted,
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        unitCost: 0.00,
        locationSeqId: item.locationSeqId
      }
      return ReturnService.receiveReturnItem(params).catch((err) => err)
    }))
  },
  async receiveReturn ({ dispatch }, payload) {
    emitter.emit("presentLoader");
    return await dispatch("receiveReturnItem", payload).then(async (response: any) => {

      if (response.some((res: any) => res.status !== 200 || hasError(res))) {
        showToast(translate('Failed to receive some of the items'));
        emitter.emit("dismissLoader");
        return;
      }

      const resp = await ReturnService.receiveReturn({
        "shipmentId": payload.shipmentId,
        "statusId": "PURCH_SHIP_RECEIVED"
      })
      if (resp.status === 200 && !hasError(resp)) {
        showToast(translate("Return received successfully", { shipmentId: payload.shipmentId }))
      } else {
        showToast(translate('Something went wrong'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => {
      console.error(err)
      return err;
    });  
  },
  async clearReturns({ commit }) {
    commit(types.RETURN_LIST_UPDATED, { returns: [] })
    commit(types.RETURN_CURRENT_UPDATED, { current: {} })
  },
  async fetchValidReturnStatuses({ commit }) {
    let resp;
    try {
      resp = await ReturnService.fetchStatusChange({
        "inputFields": {
          "statusIdTo": "PURCH_SHIP_RECEIVED",
          "statusTypeId": "PURCH_SHIP_STATUS",
          "conditionExpression_op": "empty"
        },
        "fieldList": ["statusId", "statusIdTo"],
        "entityName": "StatusValidChangeToDetail",
        "noConditionFind": "Y",
        "viewSize": 100
      });

      if (resp.status == 200 && resp.data.count && !hasError(resp)) {
        const returnStatusValidChange = resp.data.docs.reduce((acc: any, obj: any) => {
          const status = obj['statusId']
          if (!acc[status]) {
            acc[status] = []
          }
          acc[status].push(obj.statusIdTo)
          return acc
        }, {})
        
        commit(types.RETURN_VALID_STATUS_CHANGE_UPDATED, returnStatusValidChange)
      } else {
        console.error('Unable to fetch valid return status change options')
      }
    } catch (err) {
      console.error(err)
    }
  },
  setItemLocationSeqId({ state, commit }, payload) {
    const item = state.current.items.find((item: any) => item.itemSeqId === payload.item.itemSeqId)
    if(item){
      item.locationSeqId = payload.locationSeqId
    }
    commit(types.RETURN_CURRENT_UPDATED, { current: state.current})
  }
}

export default actions;
