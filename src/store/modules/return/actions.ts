import { ReturnService } from "@/services/ReturnService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ReturnState from './ReturnState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'

const actions: ActionTree<ReturnState, RootState> = {
  async findReturn ({ commit, state }, payload) {
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
        if(!payload.viewIndex) commit(types.RETURN_LIST_UPDATED, [])
        showToast(translate("Returns not found"));
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
    }
    return resp;
  },
  async updateReturnProductCount ({ commit, state }, payload) {
    await state.current.items.find((item: any) => {
      if(item.sku === payload){
        item.quantityAccepted = parseInt(item.quantityAccepted) + 1;
      }
    });
    commit(types.RETURN_CURRENT_UPDATED, state);
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

    } catch (err) {
      showToast(translate('Something went wrong'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
  },
  receiveReturnItem ({ state, commit }, data) {
    const payload = {
      shipmentId: data.shipmentId,
    }
    const facilityId = state.current.destinationFacilityId;
    return Promise.all(data.items.map(async (item: any) => {
      const params = {
        ...payload,
        facilityId,
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
  async receiveReturn ({ dispatch }, {payload}) {
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
        showToast(translate("Return Received Successfully") + ' ' + (payload.shipmentId))
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