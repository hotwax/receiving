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
  async fetchMisShippedItems({ commit }, payload) {
    let misShippedItems: any = [];
    const orderId = payload.orderId;

    try {
      const resp = await TransferOrderService.fetchMisShippedItems(orderId);
      if(!hasError(resp) && resp.data?.length){
        misShippedItems = resp.data.map((item: any) => ({
          ...item,
          statusId: 'ITEM_COMPLETED'
        }));
      }
    } catch (error) {
      console.error(error);
    }
    
    commit(types.ORDER_MISSHIPPED_ITEMS_UPDATED, misShippedItems);
  },
  async fetchTransferOrderDetail({ commit }, payload) {
    let resp;
    let order: any = {};
    const orderId = payload.orderId;
    const misShippedItems = store.getters['transferorder/getMisShippedItems'];

    try {
      resp = await TransferOrderService.fetchTransferOrderDetail(orderId);

      if (resp.status === 200 && !hasError(resp) && resp.data.order) {
        order = resp.data.order;
        // Append mis-shipped items to order
        order.items = order.items.concat(misShippedItems);

        const trackingResp = await TransferOrderService.fetchOrderTrackingDetails(orderId);
        if (!hasError(trackingResp) && trackingResp.data) {
          order.shipmentPackages = trackingResp.data.shipmentPackages;
        } else {
          order.shipmentPackages = [];
        }

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
    const misShippedItems = store.getters['transferorder/getMisShippedItems'];
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

      if (misShippedItems?.length) {
        allHistory.push(...misShippedItems);
      }
  
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
  },
  async fetchOutboundShipmentsHistory({ commit ,state },params ){
    let resp;
    const current = state.current as any;
    const payload = { ...params, shipmentStatusId: "SHIPMENT_SHIPPED" };
    try {
      resp = await TransferOrderService.fetchOutboundShipmentsHistory(payload);
      if (!hasError(resp)) {
        const shipmentData = resp.data.shipments || [];
    
        const shipmentDetails = shipmentData.flatMap((shipment:any) => {
          return shipment.packages.flatMap((pkg:any) => {
            return pkg.items.map((item:any) => ({
              statusDate:shipment.statusDate,
              shipmentId: shipment.shipmentId,
              orderId: shipment.orderId,
              shipmentStatus: shipment.shipmentStatusId,
              packageSeqId: pkg.shipmentPackageSeqId,
              trackingCode: pkg.trackingCode,
              ...item
            }));
          });
        });
        current.shipmentHistory = { items :shipmentDetails};
        commit(types.ORDER_CURRENT_UPDATED, current);
      }
      else{
        throw resp.data;
      }
    } catch (err) {
      console.error('No transfer Shipment found', err);
      current.shipmentHistory = { items: [] };
      commit(types.ORDER_CURRENT_UPDATED, current );
    }
    return resp;
  },

  clearTransferOrderDetail({commit}){
    commit(types.ORDER_CURRENT_CLEARED);
  }
}

export default actions;
