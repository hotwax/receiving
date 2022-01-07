import { MutationTree } from 'vuex'
import PurchaseOrderState from './PurchaseOrderState'
import * as types from './mutation-types'

const mutations: MutationTree <PurchaseOrderState> = {
  [types.PURCHASE_ORDER_UPDATED] (state, payload) {
    state.purchaseOrders.list = payload.list;
    state.purchaseOrders.total = payload.total;
  },
  [types.PURCHASE_ORDER_DETAIL_UPDATED] (state,payload) {
    state.current = payload.orderDetail
  },
  [types.PURCHASE_ORDER_PRODUCT_COUNT_UPDATED](state, payload) {
    state.current.items.forEach((item: any) => {
      if (item.productId === payload) {
        item.quantityAccepted = parseInt(item.quantityAccepted) + 1;
      }
    });
  }
}
export default mutations;