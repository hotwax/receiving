import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import OrderState from './OrderState'
import RootState from '../../RootState'

const OrderModule: Module<OrderState, RootState> = {
    namespaced: true,
    state: {
      purchaseOrders: {
        list: [],
        total: 0
      },
      current: {
        orderId: '',
        externalOrderId: '',
        items: [],
        poHistory: {
          items: []
        }
      }
    },
    getters,
    actions,
    mutations,
}

export default OrderModule;