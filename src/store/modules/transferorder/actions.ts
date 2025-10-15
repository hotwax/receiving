import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import TransferOrderState from './TransferOrderState'
import { TransferOrderService } from '@/services/TransferOrderService';
import { hasError } from '@/adapter'
import * as types from './mutation-types'
import { showToast } from '@/utils'
import { getProductIdentificationValue, translate } from '@hotwax/dxp-components'
import store from "@/store";
import { getOrder, saveOrder } from '@/utils/dexie';

const actions: ActionTree<TransferOrderState, RootState> = {

  async fetchTransferOrders({ commit, state }, params = {}) {
    let resp;
    const transferOrderQuery = JSON.parse(JSON.stringify(state.transferOrder.query));
    let orders = [];
    let total = 0;

    try {
      resp = await TransferOrderService.fetchTransferOrders(params);
      if (!hasError(resp) && resp.data.orders.length > 0) {
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
      // Check for cached order
      const cachedOrder = await getOrder(orderId);

      if (cachedOrder) {
        order = cachedOrder.data;
      } else {
        // No cache found, proceed with API call
        resp = await TransferOrderService.fetchTransferOrderDetail(orderId);

        if (resp.status === 200 && !hasError(resp) && resp.data.order) {
          order = resp.data.order;
          const trackingResp = await TransferOrderService.fetchOrderTrackingDetails(orderId);
          if (!hasError(trackingResp) && trackingResp.data) {
            order.shipmentPackages = trackingResp.data.shipmentPackages;
          } else {
            order.shipmentPackages = [];
          }

          if (order.items && order.items.length) {
            this.dispatch('product/fetchProductInformation', { order: order.items });
          }
          // Save to Dexie for future use
          await saveOrder(orderId, order);
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
  
  async addOrderItem ({ commit }, payload) {
    const product = { 
      ...payload,
      quantityAccepted: 0,
      quantity: 0

    }
    commit(types.ORDER_CURRENT_PRODUCT_ADDED, product)
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
