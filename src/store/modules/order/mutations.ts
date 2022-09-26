import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDER_PRCHS_ORDRS_UPDATED] (state, payload) {
    state.purchaseOrders.list = payload.list;
    state.purchaseOrders.total = payload.total;
  },
  [types.ORDER_CURRENT_UPDATED](state, payload) {
    state.current = payload
  },
  [types.ORDER_CURRENT_PRODUCT_ADDED] (state, payload) {
    state.current.items.push(payload)
  },
  [types.ORDER_ITEM_LOCATION_SEQ_ID_UPDATED] (state, payload) {
    const item = state.current.items.find((item: any) => item.orderItemSeqId === payload.item.orderItemSeqId)
    if(item){
      item.locationSeqId = payload.locationSeqId
    }
  }
}
export default mutations;