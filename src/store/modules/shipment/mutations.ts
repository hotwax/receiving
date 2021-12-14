import { MutationTree } from 'vuex'
import ShipmentState from './ShipmentState'
import * as types from './mutation-types'

const mutations: MutationTree <ShipmentState> = {
  [types.PRODUCT_SEARCH_UPDATED] (state, payload) {
    payload.products.map((shipment: any) => {
      state.products.list[shipment.id] = shipment;
    })
  },
  [types.PRODUCT_CURRENT] (state, payload) {
    state.current = payload.current;
  },
  [types.PRODUCT_ADD_TO_SHPMT_PRDTS] (state, payload) {
      state.updateShipmentProducts = payload.products;
  },
  [types.PRODUCT_REMOVE_FROM_SHPMT_PRDTS] (state, payload) {
     delete state.products.list[payload.shipmentId];
  }
}
export default mutations;

