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
    let resp;
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    try {
      resp = await ProductService.findProducts(payload)
      if (resp.status === 200 && !hasError(resp)) {
        const products = resp.data.response.docs;
        if (payload.viewIndex && payload.viewIndex > 0) products.groups = state.list.items.concat(products)
        commit(types.PRODUCT_LIST_UPDATED, { products });
      } else {
        showToast(translate("Something went wrong"));
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      showToast(translate("Something went wrong"));
    }
    return resp;
  },
}

export default actions;
