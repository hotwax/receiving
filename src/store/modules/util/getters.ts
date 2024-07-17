import { GetterTree } from 'vuex'
import RootState from '../../RootState'
import UtilState from './UtilState';

const getters: GetterTree <UtilState, RootState> = {
  getStatusDesc: (state) => (statusId: string) => {
    return state.status[statusId]
  },
  getProductIdentifications: (state) => {
    return state.productIdentifications
  },
  isForceScanEnabled(state) {
    return state.isForceScanEnabled
  },
  getBarcodeIdentificationPref(state) {
    return state.barcodeIdentificationPref
  },
  getBarcodeIdentificationValue(state, getters, rootState, rootGetters) {
    return rootGetters['user/getProductIdentificationPref'][state.barcodeIdentificationPref]
  }
}
export default getters;