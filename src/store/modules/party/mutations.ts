import { MutationTree } from 'vuex'
import PartyState from './PartyState'
import * as types from './mutation-types'

const mutations: MutationTree <PartyState> = {
  [types.PARTY_NAMES_BY_LOGIN_ID_UPDATED] (state, receiversDetails) {
    Object.keys(receiversDetails).map((receiversLoginId: any) => {
      state.namesByLoginId[receiversLoginId] = receiversDetails[receiversLoginId];
    })
  }
}
export default mutations;