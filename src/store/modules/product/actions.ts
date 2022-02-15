import { ProductService } from '@/services/ProductService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'

const actions: ActionTree<ProductState, RootState> = {
  async fetchProducts ({commit, state}, { productIds }) {
    const cachedProductIds = Object.keys(state.cached)
    const productIdFilter = productIds.reduce((filter: string, productId: any) => {
      // If product already exist in cached products skip
      if (cachedProductIds.includes(productId)) {
        return filter;
      } else {
        if (filter !== '') filter += ' OR '
        return filter += productId;
      }
    }, '');

    if(productIdFilter === '') return;
    const resp = await ProductService.fetchProducts({
      "filters": ['productId: (' + productIdFilter + ')']
    })
    if (resp.status === 200 && !hasError(resp)) {
      const products = resp.data.response.docs;
      // Handled empty response in case of failed query
      if (resp.data) {
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
      }
    }
    
    if (productIds.viewIndex === 0) emitter.emit("dismissLoader");
    // TODO Handle specific error
    return resp;
  },
  async findProduct({ commit, state }, payload) {
    let resp;
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    try {
      resp = await ProductService.fetchProducts({
        // used sku as we are currently only using sku to search for the product
        "filters": ['sku: ' + payload.queryString, 'isVirtual: false'],
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex
      })
      if (resp.status === 200 && resp.data.response?.docs.length > 0 && !hasError(resp)) {
        let products = resp.data.response.docs;
        const total = resp.data.response.numFound;

        if (payload.viewIndex && payload.viewIndex > 0) products = state.list.items.concat(products)
        commit(types.PRODUCT_LIST_UPDATED, { products, total });
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
      }
    } catch (error) {
      showToast(translate("Something went wrong"));
    }
    if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    
    return resp;
  },

  async clearSearchedProducts({ commit }) {
    commit(types.PRODUCT_LIST_UPDATED, { products: {}, total: 0})
  }

}

export default actions;