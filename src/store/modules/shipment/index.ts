import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import ShipmentState from './ShipmentState'
import RootState from '../../RootState'

const shipmentModule: Module<ShipmentState, RootState> = {
    namespaced: true,
    state: {
      current: {},
      fetchShipmentDetail:{},
      shipments: {
        list: {}
      },
    },
    getters,
    actions,
    mutations,
}

export default shipmentModule;