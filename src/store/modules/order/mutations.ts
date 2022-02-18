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
      state.current.orderId = payload.orderId;
      state.current.externalOrderId = payload.externalOrderId;
      state.current.items = payload.items;
    } else {
      state.current = payload;
    }
  },
  [types.ORDER_CURRENT_PRODUCT_ADDED] (state, payload) {
    state.current.items.push(payload)
  },
}
export default mutations;