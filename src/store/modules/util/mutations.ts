import { MutationTree } from 'vuex'
import * as types from './mutation-types'
import UtilState from './UtilState'

const mutations: MutationTree <UtilState> = {
  [types.UTIL_STATUS_UPDATED](state, payload) {
    state.status = payload
  },
  [types.UTIL_FORCE_SCAN_STATUS_UPDATED](state, payload) {
    state.isForceScanEnabled = payload
  },
  [types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED](state, payload) {
    state.barcodeIdentificationPref = payload
  }
}
export default mutations;