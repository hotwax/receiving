import { MutationTree } from 'vuex'
import ProductState from './ProductState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.PRODUCT_CURRENT] (state, payload) {
    state.current = payload.current;
  },
  [types.PRODUCT_ITEMS] (state, payload) {
    state.list = payload.list;
  },
}
export default mutations;