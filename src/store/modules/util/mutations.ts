import { MutationTree } from 'vuex'
import * as types from './mutation-types'
import UtilState from './UtilState'

const mutations: MutationTree <UtilState> = {
  [types.UTIL_STATUS_UPDATED](state, payload) {
    state.status = payload
  }
}
export default mutations;