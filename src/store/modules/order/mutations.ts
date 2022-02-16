import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_PRCHS_ORDRS_UPDATED] (state, payload) {
    state.purchaseOrders.list = payload.list;
    state.purchaseOrders.total = payload.total;
  },
  [types.ORDER_CURRENT_UPDATED](state, payload) {
    if (payload.order) {
      state.current.items = payload.order
      state.current.orderId = payload.order[0]?.orderId;
      state.current.externalOrderId = payload.order[0]?.externalOrderId;
    } else {
      state.current = payload;
    }
  },
  [types.ORDER_CURRENT_PRODUCT_ADDED] (state, payload) {
    state.current.items.push(payload)
  },
  [types.ORDER_PRCHS_HISTRY_UPDATED] (state, payload) {
    state.poHistory.total = payload.poHistory.count;
    state.poHistory.items = payload.poHistory.docs;
  }
}
export default mutations;