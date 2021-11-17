import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'


const actions: ActionTree<ProductState, RootState> = {

  async findProduct ({ commit, state }, payload) {
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;
    try {
      resp = await ProductService.getShipments({
        "filters": ['viewSize: ' + payload.viewSize , 'viewIndex' + payload.viewIndex , 'facilityId: ' + payload.facilityId , 'statusId: ' + "PURCH_SHIP_SHIPPED"] 
      })
      if (resp.status === 200 && resp.data.response.numFound > 0 && !hasError(resp)) {
        let products = resp.data.response.docs;
               const totalProductsCount = resp.data.response.numFound;

        if (payload.viewIndex && payload.viewIndex > 0) products = state.products.list.concat(products)
        commit(types.PRODUCT_SEARCH_UPDATED, { products: products, totalProductsCount: totalProductsCount })
      } else {
        showToast(translate("Product not found"));
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.log(error)
      showToast(translate("Something went wrong"));
    }
    return resp;
  },

  async setCurrent ({ commit }, payload) {
    let currentProduct;
    if ( currentProduct || payload.product) {
      commit(types.PRODUCT_CURRENT_UPDATED, { product: currentProduct ? currentProduct : payload.product });
      return currentProduct ? currentProduct : payload.product;
    } else {
      try {
        const query = {
          "filters": ['shipmentId: ' + payload.queryString]
        }
        const resp = await ProductService.getShipments(query)
        if (resp.status === 200 && resp.data.response.numFound > 0 && !hasError(resp)) {
          currentProduct = resp.data.response.docs[0];
          commit(types.PRODUCT_CURRENT_UPDATED, { product: currentProduct });
        } else {
          showToast(translate("Product not found"));
        }
        emitter.emit("dismissLoader");
      } catch(error){
        console.log(error)
        showToast(translate("Something went wrong"));
      }
    }
    return currentProduct;
  }
}

export default actions;