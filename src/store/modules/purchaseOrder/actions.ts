import { PurchaseOrdersService } from "@/services/PurchaseOrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PurchaseOrderState from './PurchaseOrderState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'


const actions: ActionTree<PurchaseOrderState, RootState> = {

  // Find Product
  async findPurchaseOrders ({ commit, state }, payload) {

    // Show loader only when new query and not the infinite scroll
    // if (payload.viewIndex === 0) emitter.emit("presentLoader");

    let resp;

    try {
      resp = await PurchaseOrdersService.fetchPurchaseOrders(payload)

      // resp.data.response.numFound tells the number of items in the response
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped) {
        const orders = resp.data.grouped.orderId.groups
        commit(types.PURCHASE_ORDER_UPDATED, {
          list: orders,
          total: orders.length
        })
      } else {
        //showing error whenever getting no products in the response or having any other error
        showToast(translate("Product not found"));
      }
      // Remove added loader only when new query and not the infinite scroll
      // if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.log(error)
      showToast(translate("Something went wrong"));
    }
    // TODO Handle specific error
    return resp;
  },
  async getOrderDetails({ commit, state }, { payload, orderId }) {
    let resp;
    const current = state.current as any
    if (current.length && current[0]?.doclist && current[0]?.doclist.docs[0].orderId === orderId) 
      return current;
    try {
      resp = await PurchaseOrdersService.fetchPODetails(payload);

      if(resp.status === 200 && !hasError(resp) && resp.data.grouped){
        const orderDetail = resp.data.grouped.orderId.groups[0].doclist.docs
        commit(types.PURCHASE_ORDER_DETAIL_UPDATED, { orderDetail })
      }
      else{
        showToast(translate("Something went wrong"));
      }
    } catch (error) {
      showToast(translate("Something went wrong"));
    }
  }
}

export default actions;