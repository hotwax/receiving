import { GetterTree } from 'vuex'
import RootState from '../../RootState'
import ProductState from './ProductState'

const getters: GetterTree <ProductState, RootState> = {
  getProduct: (state) => (productId: string) => {
    return state.cached[productId] ? state.cached[productId] : {};
  },
  getSearchedProduct: (state) => {
    return state.searchedProduct
  } 
}
export default getters
