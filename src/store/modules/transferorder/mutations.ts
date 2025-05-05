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
  [types.ORDER_CURRENT_SHIPMENT_UPDATED](state, payload) {
    state.shipment.current = payload
  },
  [types.ORDER_CURRENT_SHIPMENT_CLEARED](state) {
    state.shipment.current = {}
  },
  [types.ORDER_CURRENT_CLEARED](state) {
    state.current = {}
  },
  [types.ORDER_REJECT_REASONS_UPDATED](state, payload) {
    state.rejectReasons = payload
  }
}
export default mutations;