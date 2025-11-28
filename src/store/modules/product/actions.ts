import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import emitter from '@/event-bus'
import { searchProducts } from '@/adapter'

const actions: ActionTree<ProductState, RootState> = {
  async fetchProducts ({commit, state}, { productIds }) {
    const cachedProductIds = Object.keys(state.cached)
    const productIdFilter = productIds.filter((productId: any) => !cachedProductIds.includes(productId));
    const viewSize = productIdFilter.length;
    // If there are no products skip the API call
    if (!viewSize) return;

    const resp = await searchProducts({
        filters: { 
          "productId": {
            value: productIdFilter,
            op: 'OR'
          }
        },
        viewSize
      })
    if (resp.total) {
      const products = resp.products;
      commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
    }
    
    return resp;
  },
  async findProduct({ commit, state }, payload) {
    let resp;
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    try {
      resp = await searchProducts({
        keyword:  payload.queryString,
        viewSize: payload.viewSize,
        viewIndex: payload.viewIndex,
        filters: {}
      })
      if (resp.total) {
        let products = resp.products;
        const total = resp.total;

        if (payload.viewIndex && payload.viewIndex > 0) products = state.list.items.concat(products)
        commit(types.PRODUCT_LIST_UPDATED, { products, total });
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
      } else {
        throw resp;
      }
    } catch (error) {
      commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0 });
    }
    if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    
    return resp;
  },
  async fetchProductInformation(_, payload) {
    let productIds: any = new Set();

    payload.order.map((item: any) => {
      if (item.productId) productIds.add(item.productId);
    })
    productIds = [...productIds]
    if (productIds.length) {
      this.dispatch('product/fetchProducts', { productIds })
    }
  },
  async clearSearchedProducts({ commit }) {
    commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0 })
  }
}

export default actions;