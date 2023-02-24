import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import PartyState from './PartyState'
import RootState from '../../RootState'

const OrderModule: Module<PartyState, RootState> = {
    namespaced: true,
    state: {
      namesByUserLogin: {},
    },
    getters,
    actions,
    mutations,
}

export default OrderModule;