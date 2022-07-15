import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { showToast } from '@/utils'
import emitter from '@/event-bus'
import { translate } from '@/i18n'
import { isError } from '@hotwax/oms-api/src/util'
import { fetchProducts } from '@hotwax/oms-api/src/product'

const actions: ActionTree<ProductState, RootState> = {
  async fetchProducts ({commit, state}, { productIds }) {
    const cachedProductIds = Object.keys(state.cached)
    const productIdFilter= productIds.reduce((filter: Array<any>, productId: any) => {
      // If product does not exist in cached products then add the id
      if (!cachedProductIds.includes(productId) && productId) {
        filter.push(productId);
      }
      return filter;
    }, []);

    // If there are no product ids to search skip the API call
    if (productIdFilter.length <= 0) return;
    const resp = await fetchProducts({
      filters: { 'productId': productIdFilter },
      viewSize: productIdFilter.length,
      viewIndex: 0
    })
    if (!isError(resp)) {
      const products = resp.products;
      // Handled empty response in case of failed query
      if (products) {
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
      resp = await fetchProducts({
        "filters": { 'isVirtual': false },
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex * payload.viewSize,
        "queryString": payload.queryString
      })
      if (!isError(resp)) {
        console.log('resp', resp)
        let products = resp.products;
        const total = resp.totalProductsCount;

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
  async fetchProductInformation( { commit }, payload) {
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
    commit(types.PRODUCT_LIST_UPDATED, { products: {}, total: 0 })
  }
}

export default actions;