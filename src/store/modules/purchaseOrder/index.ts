import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import PurchaseOrderState from './PurchaseOrderState'
import RootState from '../../RootState'

const purchaseOrderModule: Module<PurchaseOrderState, RootState> = {
    namespaced: true,
    state: {
      purchaseOrders: {
        list: [],
        total: 0
      }
    },
    getters,
    actions,
    mutations,
}

export default purchaseOrderModule;