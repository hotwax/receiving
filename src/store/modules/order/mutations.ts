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
  [types.ORDER_RECEIVERS_DETAIL_UPDATED] (state, receiversDetails) {
    Object.keys(receiversDetails).map((receiversLoginId: any) => {
      state.receiversDetails[receiversLoginId] = receiversDetails[receiversLoginId];
    })
  }
}
export default mutations;