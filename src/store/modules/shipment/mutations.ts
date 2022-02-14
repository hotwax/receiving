import { MutationTree } from 'vuex'
import ShipmentState from './ShipmentState'
import * as types from './mutation-types'

const mutations: MutationTree <ShipmentState> = {
  [types.SHIPMENT_LIST_UPDATED] (state, payload) {
      state.shipments.list = payload.shipments;
  },
  [types.SHIPMENT_CURRENT_UPDATED] (state, payload) {
    if(payload.current){
      state.current = payload.current;
    }  
    if(payload.id){
      state.current.items.find((item: any) => {
        if(item.productId === payload.id){
          item.quantityAccepted = parseInt(item.quantityAccepted) + 1;
        }
      });
    }
  },
}
export default mutations;