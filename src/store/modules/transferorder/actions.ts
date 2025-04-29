import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter'
import * as types from './mutation-types'

const actions: ActionTree<TransferOrderState, RootState> = {

  async fetchTransferOrders ({ commit, state }, payload = {}) {
    let resp;

    const params = {
      ...payload,
    }

    let orders = [];
    let orderList = [];
    let total = 0;

    try {
      resp = await TransferOrderService.fetchTransferOrders();
      if (!hasError(resp) && resp.data.ordersCount > 0) {
        total = resp.data.ordersCount;
        orders = resp.data.orders;

        orders = orders.map((order: any) => {
          return {
            orderId: order.orderId,
            externalId: order.orderExternalId,
            orderDate: order.orderDate,
            orderName: order.orderName,
            orderStatusId: order.orderStatusId,
            orderStatusDesc: order.orderStatusDesc
          };
        });

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

}

export default actions;