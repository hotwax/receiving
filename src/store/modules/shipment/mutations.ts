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
  [types.SHIPMENT_REMOVE_FROM_SHPMT_PRDTS] (state, payload) {
    delete state.shipments.list[payload.shipmentId];
  }
}
export default mutations;