import { MutationTree } from 'vuex'
import ProductState from './ProductState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.PRODUCT_CURRENT] (state, payload) {
    payload.products.map((curr: any) => {
      state.current[curr.productId] = curr
    })
  }
}
export default mutations;