import { GetterTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState';
import { computed } from 'vue';
import { useProductIdentificationStore } from '@hotwax/dxp-components';




const getters: GetterTree <UtilState, RootState> = {
  getStatusDesc: (state) => (statusId: string) => {
    return state.status[statusId]
  },
  isForceScanEnabled(state) {
    return state.isForceScanEnabled
  },
  getBarcodeIdentificationPref(state) {
    return state.barcodeIdentificationPref
  },
  getBarcodeIdentificationValue(state, getters, rootState, rootGetters) {
    const productIdentificationStore = useProductIdentificationStore();
    const productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref) as any;
    return productIdentificationPref.value[state.barcodeIdentificationPref]
  }
}
export default getters;