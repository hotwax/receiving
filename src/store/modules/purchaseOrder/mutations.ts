import { MutationTree } from 'vuex'
import PurchaseOrderState from './PurchaseOrderState'
import * as types from './mutation-types'

const mutations: MutationTree <PurchaseOrderState> = {
  [types.PURCHASE_ORDER_UPDATED] (state, payload) {
    state.purchaseOrders.list = payload.list;
    state.purchaseOrders.total = payload.total;
  },
  [types.PURCHASE_ORDER_DETAIL_UPDATED] (state,payload) {
    if(payload.orderDetail)
    {state.current = payload.orderDetail}
    else{
      state.current = payload;
    }
    
  },
}
export default mutations;