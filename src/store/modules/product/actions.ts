import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { ProductService } from '@/services/ProductService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'

const actions: ActionTree<ProductState, RootState> = {
  async fetchProducts ( { commit, state }, { productIds }) {
    const cachedProductIds = Object.keys(state.cached);
    const productIdFilter= productIds.reduce((filter: string, productId: any) => {
      if (filter !== '') filter += ' OR '
      // If product already exist in cached products skip
      if (cachedProductIds.includes(productId)) {
        return filter;
      } else {
        return filter += productId;
      }
    }, '');
      // If there are no products skip the API call
      if (productIdFilter === '') return;
      const resp = await ProductService.fetchProducts({
        "filters": ['productId: (' + productIdFilter + ')']
      })
      if (resp.status === 200 && !hasError(resp)) {
        const products = resp.data.response.docs;
        // Handled empty response in case of failed query
        if (resp.data) commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
      }
      if (productIds.viewIndex === 0) emitter.emit("dismissLoader");
      // TODO Handle specific error
      return resp;  
    },
  async findProducts ( { commit, state, dispatch }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;
    try {
      resp = await ProductService.findProducts(payload)
      if (resp.status === 200 && !hasError(resp)) {
        const products = resp.data.grouped.parentProductId;
        // Add stock information to Stock module to show on UI
        dispatch('getProductsInformation', { products });
        // Handled case for infinite scroll
        if (payload.viewIndex && payload.viewIndex > 0) products.groups = state.list.items.concat(products.groups)
        commit(types.PRODUCT_LIST_UPDATED, { products });
      } else {
        showToast(translate("Something went wrong"));
      }
      // Remove added loader only when new query and not the infinite scroll
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      showToast(translate("Something went wrong"));
    }
    // TODO Handle specific error
    return resp;
  },
  async getProductsInformation  ( context , { products }) {
    // To remove redundant value Set is used
    let productIds: any = new Set();
    products.groups.forEach((product: any) => {
      productIds.add(product.groupValue);
    });
    // Converted to list as methods like reduce not supported
    productIds = [...productIds]
    if (productIds.length) {
      this.dispatch('product/fetchProducts', { productIds })
    }
  },
}

export default actions;
