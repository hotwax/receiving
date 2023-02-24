import { MutationTree } from 'vuex'
import PartyState from './PartyState'
import * as types from './mutation-types'

const mutations: MutationTree <PartyState> = {
  [types.PARTY_RECEIVERS_DETAIL_UPDATED] (state, receiversDetails) {
    Object.keys(receiversDetails).map((receiversLoginId: any) => {
      state.namesByUserLogin[receiversLoginId] = receiversDetails[receiversLoginId];
    })
  }
}
export default mutations;