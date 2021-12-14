import { MutationTree } from 'vuex'
import PurchaseOrderState from './PurchaseOrderState'
import * as types from './mutation-types'

const mutations: MutationTree <PurchaseOrderState> = {
  [types.PURCHASE_ORDER_UPDATED] (state, payload) {
    state.purchaseOrders.list = payload.orders;
    state.purchaseOrders.total = payload.totalOrdersCount;
  }
}
export default mutations;