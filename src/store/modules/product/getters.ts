import { GetterTree } from 'vuex'
import ProductState from './ProductState'
import RootState from '../../RootState'

const getters: GetterTree <ProductState, RootState> = {
  getProduct: (state) => (productId: string) => {
    return state.current[productId] ? state.current[productId] : 0
  }
}
export default getters