import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import TransferOrderState from './TransferOrderState'
import RootState from '../../RootState'

const orderModule: Module<TransferOrderState, RootState> = {
  namespaced: true,
  state: {
    transferOrder: {
      list: [],
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: process.env.VUE_APP_VIEW_SIZE,
        queryString: '',
        selectedShipmentMethods: [],
        selectedStatuses: ['ORDER_APPROVED']
      }
    },
    current: {
      orderId: '',
      orderName: '',
      externalId: '',
      status: '',
      statusId: '',
      items: [],
      toHistory: {
        items: []
      },
      shippedTransfer:[],
    }
  },
  getters,
  actions,
  mutations
}

export default orderModule;