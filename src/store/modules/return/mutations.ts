import { MutationTree } from 'vuex'
import ReturnState from './ReturnState'
import * as types from './mutation-types'

const mutations: MutationTree <ReturnState> = {
  [types.RETURN_LIST_UPDATED] (state, payload) {
    state.returns.list = payload;
  },
  [types.RETURN_CURRENT_UPDATED] (state, payload) {
    state.current = payload.current;
  },
  [types.RETURN_CURRENT_PRODUCT_ADDED] (state, payload) {
    state.current.items.push(payload)
  },
  [types.RETURN_VALID_STATUS_CHANGE_UPDATED] (state, payload) {
    state.validStatusChange = payload
  },
  [types.RETURN_ITEM_LOCATION_SEQ_ID_UPDATED] (state, payload) {
    const item = state.current.items.find((item: any) => item.itemSeqId === payload.item.itemSeqId)
    if(item){
      item.locationSeqId = payload.facilityLocation?.locationSeqId
    }
  }
}
export default mutations;