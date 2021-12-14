import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import ShipmentState from './ShipmentState'
import RootState from '../../RootState'

const productModule: Module<ShipmentState, RootState> = {
    namespaced: true,
    state: {
      current: {},
      updateShipmentProducts:{},
      products: {
        list: {}
      }
    },
    getters,
    actions,
    mutations,
}

export default productModule;