import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import ReturnState from './ReturnState'
import RootState from '../../RootState'

const returnModule: Module<ReturnState, RootState> = {
  namespaced: true,
  state: {
    current: {
      return: {},
      items: []
    },
    returns: {
      list: [],
      total: 0,
    },
    validStatusChange: {}
  },
  getters,
  actions,
  mutations,
}

export default returnModule;