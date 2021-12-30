import { GetterTree } from 'vuex'
import ProductState from './ProductState'
import RootState from '../../RootState'

const getters: GetterTree <ProductState, RootState> = {
  getCurrent (state) {
    return state.current
  },
  getProduct: (state) => (productId: string) => {
    return state.current[productId] ? state.current[productId] : 0
  }
}
export default getters;