import { MutationTree } from 'vuex'
import ShipmentState from './ShipmentState'
import * as types from './mutation-types'

const mutations: MutationTree <ShipmentState> = {
  [types.SHIPMENT_LIST_UPDATED] (state, payload) {
    payload.shipments.map((shipment: any) => {
      state.shipments.list[shipment.id] = shipment;
    })
  },
  [types.SHIPMENT_CURRENT_UPDATED] (state, payload) {
    state.current = payload.current;
  }
}
export default mutations;