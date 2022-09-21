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
      resp = await ReturnService.fetchReturns(payload)
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
  async setCurrent ({ commit }, payload) {
    let resp;
    try {
      resp = await ReturnService.getReturnDetail(payload);
      if (resp.status === 200 && !hasError(resp) && resp.data.items) {
        commit(types.RETURN_CURRENT_UPDATED, { current: resp.data })
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
  receiveReturnItem ({ commit }, data) {
    const payload = data.return ? {
      returnId: data.return.returnId,
      locationSeqId: data.return.locationSeqId
    } : {
      returnId: data.returnId,
      locationSeqId: data.locationSeqId
    }
    return Promise.all(data.items.map((item: any) => {
      const params = {
        ...payload,
        facilityId: this.state.user.currentFacility.facilityId,
        returnItemSeqId: item.itemSeqId,
        productId: item.productId,
        quantityAccepted: item.quantityAccepted,
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        unitCost: 0.00
      }
      return ReturnService.receiveReturnItem(params).catch((err) => {
        return err;
      })
    }))
  },
  async receiveReturn ({ dispatch }, {payload}) {
    emitter.emit("presentLoader");
    return await dispatch("receiveReturnItem", payload).then(async( ) => {
      const resp = await ReturnService.receiveReturn({
        "returnId": payload.return ? payload.return.returnId : payload.returnId,
        "statusId": "PURCH_RET_RECEIVED"
      })
      if (resp.status === 200 && !hasError(resp)) {
        showToast(translate("Return Received Successfully") + ' ' + (payload.return ? payload.return.returnId : payload.returnId))
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => err);
  },
  async addReturnItem ({ state, commit, dispatch }, payload) {
    const item = payload.returnId ? { ...(payload.item) } : { ...payload }
    const product = {
      ...item,
      quantityAccepted: 0,
      quantityOrdered: 0
    }
    const params = {
      orderId: payload.orderId,
      productId: product.productId,
      quantity: 0,
      returnId: payload.returnId ? payload.returnId : state.current.returnId,
      returnItemSeqId: payload.returnItemSeqId
    }
    const resp = await ReturnService.addReturnItem(params);
    if (resp.status == 200 && !hasError(resp)){
      dispatch('updateProductCount', { returnId: resp.data.returnId })
      if (!payload.returnId) commit(types.RETURN_CURRENT_PRODUCT_ADDED, product)
      return resp;
    } else {
      showToast(translate('Something went wrong'));
      console.error("error", resp._ERROR_MESSAGE_);
      return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
    }
  },
  async updateProductCount({ commit, state }, payload ) {
    const returns = state.returns.list;
    returns.map((returnShipment: any) => {
      if(returnShipment.shipmentId === payload.shipmentId) {
        returnShipment.shipmentItemCount = parseInt(returnShipment.shipmentItemCount) + 1;
        return;
      }
    })
    commit(types.RETURN_LIST_UPDATED, { returns })
  },
  async clearReturns({ commit }) {
    commit(types.RETURN_LIST_UPDATED, { returns: [] })
    commit(types.RETURN_CURRENT_UPDATED, { current: {} })
  }
}

export default actions;