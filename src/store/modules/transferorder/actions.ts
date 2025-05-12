import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter'
import * as types from './mutation-types'

const actions: ActionTree<TransferOrderState, RootState> = {

  async fetchTransferOrders({ commit, state }, params = {}) {
    // clear the existing transfer orders
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
      } else {
        throw resp.data;
      }
    } catch (err) {
      console.error('No transfer orders found', err);
    }

    commit(types.ORDER_TRANSFER_UPDATED, { list: orderList.length > 0 ? orderList : orders, total });

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