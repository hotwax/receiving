import { MutationTree } from 'vuex'
import ProductState from './ProductState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
[types.PRODUCT_ADD_TO_CACHED_MULTIPLE] (state, payload) {
if (payload.products) {
payload.products.forEach((product: any) => {
state.cached[product.productId] = product
});
}
},
[types.PRODUCT_CURRENT_UPDATED] (state, payload) {
    state.current = payload.current
},
}
export default mutations;
