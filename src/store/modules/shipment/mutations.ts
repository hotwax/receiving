import { MutationTree } from 'vuex'
import ShipmentState from './ShipmentState'
import * as types from './mutation-types'

const mutations: MutationTree <ShipmentState> = {
  [types.SHIPMENT_LIST_UPDATED] (state, payload) {
    state.shipments.list = payload.shipments;
  },
  [types.SHIPMENT_CURRENT_UPDATED] (state, payload) {
    state.current.shipment = payload.current;
    state.current.items = payload.current.items;
  },
  [types.SHIPMENT_CURRENT_PRODUCT_ADDED] (state, payload) {
    state.current.items = [ ...state.current.shipment.items, payload]
  }
}
export default mutations;