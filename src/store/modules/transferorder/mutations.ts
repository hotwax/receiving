import { MutationTree } from 'vuex'
import TransferOrderState from './TransferOrderState'
import * as types from './mutation-types'

const mutations: MutationTree <TransferOrderState> = {
  [types.ORDER_CURRENT_UPDATED] (state, payload) {
    state.current = payload
  },
  [types.ORDER_TRANSFER_UPDATED] (state, payload) {
    state.transferOrder.list = payload.list;
    state.transferOrder.total = payload.total;
  },
  [types.ORDER_TRANSFER_QUERY_UPDATED](state, payload) {
    state.transferOrder.query = payload
  },
  [types.ORDER_TRANSFER_LIST_CLEARED](state) {
    state.transferOrder.list = [];
    state.transferOrder.total = 0;
  },
  [types.ORDER_TRANSFER_QUERY_CLEARED](state) {
    state.transferOrder.query = {
      viewIndex: 0,
      viewSize: process.env.VUE_APP_VIEW_SIZE,
      queryString: '',
      selectedShipmentMethods: [],
      selectedStatuses: ['ORDER_APPROVED']
    }
  },
  [types.ORDER_CURRENT_CLEARED](state) {
    state.current = {}
  },
  [types.ORDER_CURRENT_PRODUCT_ADDED] (state, payload) {
    state.current.items.push(payload)
  },
  [types.ORDER_CURRENT_SHIPPED_TRANSFER] (state, payload) {
    state.current.shippedTransfer = payload;
  }
}
export default mutations;