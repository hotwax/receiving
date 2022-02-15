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
    state.current.forEach((item: any) => {
      if (item.productId === payload) {
        console.log("First",item.quantityAccepted);
        item.quantityAccepted = item.quantityAccepted + 1;
        console.log(item.quantityAccepted);
        console.log(typeof(item.quantityAccepted));
      }
    });
  }
}
export default mutations;