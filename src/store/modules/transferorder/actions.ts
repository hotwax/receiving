import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { getProductIdentificationValue } from '@hotwax/dxp-components'
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
  async updateProductCount({ commit, state }, payload ) {
    const barcodeIdentifier = store.getters['util/getBarcodeIdentificationPref'];
    const getProduct = store.getters['product/getProduct'];

    const item = state.current.items.find((item: any) => {
      const itemVal = barcodeIdentifier
        ? getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))
        : item.internalName;
      return itemVal === payload;
    });

    if (item) {
      if(item.statusId === 'ITEM_COMPLETED') return { isCompleted: true }

      item.quantityAccepted = Number(item.quantityAccepted) ? Number(item.quantityAccepted) + 1 : 1;
      commit(types.ORDER_CURRENT_UPDATED, state.current)
      return { isProductFound: true }
    }
    
    return { isProductFound: false }
  },

async fetchTOHistory({ commit, state }, { payload }) {
  const current = state.current as any;
  const pageSize = Number(process.env.VUE_APP_VIEW_SIZE) ;
  let pageIndex = 0;
  let allHistory: any[] = [];
  let resp;

  try {
    do {
      resp = await TransferOrderService.fetchTransferOrderHistory({
        ...payload,
        pageSize,
        pageIndex
      });
      if (!hasError(resp) && resp.data.length > 0) {
        allHistory = allHistory.concat(resp.data);
        pageIndex++;
      }
    } while (resp.data.length >= pageSize);

    if (allHistory.length > 0) {
      const receiversLoginIds = [...new Set(allHistory.map((item: any) => item.receivedByUserLoginId))];
      const receiversDetails = await this.dispatch('party/getReceiversDetails', receiversLoginIds);
      allHistory.forEach((item: any) => {
        item.receiversFullName = receiversDetails[item.receivedByUserLoginId]?.fullName || item.receivedByUserLoginId;
      });
      current.toHistory = { items: allHistory };
    } else {
      current.toHistory = { items: [] };
    }
  } catch (error) {
    console.error(error);
    current.toHistory = { items: [] };
  }
  commit(types.ORDER_CURRENT_UPDATED, current);
  return allHistory;
}
}

export default actions;