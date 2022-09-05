import { MutationTree } from 'vuex'
import ReturnState from './ReturnState'
import * as types from './mutation-types'

const mutations: MutationTree <ReturnState> = {
  [types.RETURN_LIST_UPDATED] (state, payload) {
    state.returns.list = payload.returns;
  },
  [types.RETURN_CURRENT_UPDATED] (state, payload) {
    state.current = payload.current;
  },
  [types.RETURN_CURRENT_PRODUCT_ADDED] (state, payload) {
    state.current.items.push(payload)
  }
}
export default mutations;