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
  [types.SHIPMENT_UPDATE_PRODUCT_COUNT] (state, payload) {
    state.current.items.find((item: any) => {
      if(item.productId === payload.id){
        item.quantityAccepted = parseInt(item.quantityAccepted)+1;
      }
    });
  } 
}
export default mutations;