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
  let resp;
  const transferOrderQuery = JSON.parse(JSON.stringify(state.transferOrder.query));
  let orders = [];
  let total = 0;

  try {
    resp = await TransferOrderService.fetchTransferOrders(params);
    if (!hasError(resp) && resp.data.ordersCount > 0) {
      total = resp.data.ordersCount;
      if (transferOrderQuery.viewIndex > 0) {
        orders = state.transferOrder.list.concat(resp.data.orders);
      } else {
        orders = resp.data.orders;
      }
    } else {
      throw resp?.data;
    }
  } catch (err) {
    console.error('No transfer orders found', err);
  }

  commit(types.ORDER_TRANSFER_QUERY_UPDATED, { ...transferOrderQuery });
  commit(types.ORDER_TRANSFER_UPDATED, { list: orders, total });

  return resp;
  },
  async fetchTransferOrderDetail({ commit }, payload) {
    let resp;
    let order: any = {};
    const orderId = payload.orderId;

    try {
      resp = await TransferOrderService.fetchTransferOrderDetail(orderId);

      if (resp.status === 200 && !hasError(resp) && resp.data.order) {
        order = resp.data.order;
        if (order.items && order.items.length) {
          this.dispatch('product/fetchProductInformation', { order: order.items });
        }
      }
    } catch (error) {
      console.error(error);
    }

    commit(types.ORDER_CURRENT_UPDATED, order);
    return resp;
  },

}

export default actions;