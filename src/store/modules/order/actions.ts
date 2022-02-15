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

      if (resp.status === 200 && !hasError(resp) && resp.data.grouped) {
        const orders = resp.data.grouped.orderId
        
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
      console.log(error)
      showToast(translate("Something went wrong"));
    }
    return resp;
  },
  async getOrderDetail({ commit, state }, { payload, orderId }) {
    let resp;
    const current = state.current as any
    if (current.length && current[0]?.doclist && current[0]?.doclist.docs[0].orderId === orderId)
      return current;
    try {
      resp = await OrderService.fetchPODetail(payload);

      if (resp.status === 200 && !hasError(resp) && resp.data.grouped) {
        const orderDetail = resp.data.grouped.orderId.groups[0].doclist.docs

        this.dispatch('product/fetchProductInformation', { order: orderDetail });
        commit(types.ORDER_PRCHS_DTAIL_UPDATED, { orderDetail })
      }
      else {
        showToast(translate("Something went wrong"));
      }
    } catch (error) {
      showToast(translate("Something went wrong"));
    }
    return resp;
  }
}

export default actions;