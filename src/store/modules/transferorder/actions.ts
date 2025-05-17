import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { showToast } from '@/utils'
import { translate } from '@hotwax/dxp-components'

const actions: ActionTree<TransferOrderState, RootState> = {

  async fetchTransferOrders({ commit, state }, params = {}) {
    // clear the existing transfer orderss
    commit(types.ORDER_TRANSFER_LIST_CLEARED, {});
    let resp;
    let orders = [];
    let orderList = [];
    let total = 0;

    try {
      resp = await TransferOrderService.fetchTransferOrders(params);
      if (!hasError(resp) && resp.data.ordersCount > 0) {
        total = resp.data.ordersCount;
        orders = resp.data.orders;
        orderList = JSON.parse(JSON.stringify(state.transferOrder.list)).concat(orders);
       // Only commit if there are orders to update
        if ((orderList && orderList.length > 0) || (orders && orders.length > 0)) {
          commit(types.ORDER_TRANSFER_UPDATED, { list: orderList.length > 0 ? orderList : orders, total });
        }
      } else {
          showToast(translate("Orders not found"));
      }
    } catch (err) {
      console.error('No transfer orders found', err);
      showToast(translate("Something went wrong"));
    }
    return resp;
  },
  async fetchTransferOrderDetail({ commit }, payload) {
    let resp;
    const orderId = payload.orderId;

    try {
      resp = await TransferOrderService.fetchTransferOrderDetail(orderId);
//orderName, status, statusId, orderId, items, externalId

      if (resp.status === 200 && !hasError(resp) && resp.data.order) {
        const order = resp.data.order
        commit(types.ORDER_CURRENT_UPDATED, order)
      }
      else {
        // showToast(translate("Something went wrong"));
        commit(types.ORDER_CURRENT_UPDATED, {})
      }
    } catch (error) {
      // showToast(translate("Something went wrong"));
      commit(types.ORDER_CURRENT_UPDATED, {})
    }
    return resp;
  },

}

export default actions;