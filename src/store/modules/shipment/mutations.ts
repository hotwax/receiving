import { MutationTree } from 'vuex'
import ShipmentState from './ShipmentState'
import * as types from './mutation-types'

const mutations: MutationTree <ShipmentState> = {
  [types.SHIPMENT_LIST_UPDATED] (state, payload) {
    state.shipments.list = payload.shipments;
  },
  [types.SHIPMENT_CURRENT_UPDATED] (state, payload) {
    state.current = payload.current;
  },
  [types.SHIPMENT_CURRENT_PRODUCT_ADDED] (state, payload) {
    state.current.items.push(payload)
  },
  [types.SHIPMENT_STATUS_UPDATED](state, payload) {
    state.status = payload;
}, 
}
export default mutations;