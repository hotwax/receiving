import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { showToast } from '@/utils'
import { getProductIdentificationValue, translate } from '@hotwax/dxp-components'
import store from "@/store";

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
        if (params.pageIndex && params.pageIndex > 0) {
          orders = state.transferOrder.list.concat(resp.data.orders);
        } else {
          orders = resp.data.orders;
        }
        commit(types.ORDER_TRANSFER_UPDATED, { list: orders, total });
      } else {
        if (params.pageIndex && params.pageIndex > 0) {
          showToast(translate("Transfer orders not found"));
        } else {
          commit(types.ORDER_TRANSFER_UPDATED, { list: [], total: 0 });
        }
      }
        } catch (err) {
          console.error('No transfer orders found', err);
          showToast(translate("Something went wrong"));
          commit(types.ORDER_TRANSFER_UPDATED, { list: [], total: 0 });
        }
  
    commit(types.ORDER_TRANSFER_QUERY_UPDATED, { ...transferOrderQuery });
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
  async updateProductCount({ commit, state }, payload ) {
  const barcodeIdentifier = store.getters['util/getBarcodeIdentificationPref'];
  const getProduct = store.getters['product/getProduct'];

  const item = state.current.items.find((item: any) => {
    const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) : item.internalName;
    return itemVal === payload;
  });

  if (item) {
    if(item.statusId === 'ITEM_COMPLETED') return { isCompleted: true }

    item.totalIssuedQuantity = item.totalIssuedQuantity ? parseInt(item.totalIssuedQuantity) + 1 : 1;
    commit(types.ORDER_CURRENT_UPDATED, state.current )
    return { isProductFound: true }
  }

  return { isProductFound: false }
  },
}

export default actions;