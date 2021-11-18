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
    let resp;
    try {
      resp = await ProductService.fetchProducts({
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex,
        "facilityId": payload.facilityId,
        "statusId": "PURCH_SHIP_SHIPPED"
      })
      if (resp.status === 200 && resp.data.count> 0 && !hasError(resp)) {
        let products = resp.data.docs;
        const totalProductsCount = resp.data.count;

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
  async setCurrentProduct ({ commit }, payload) {
    let resp;

    try {
      resp = await ProductService.getShipmentProduct({
        "shipmentId": payload.shipmentId,
      });
      console.log(payload);
      if (resp.status === 200 && resp.data.items&& !hasError(resp)) {
        commit(types.PRODUCT_CURRENT, { current: resp.data })
        return resp.data;
      } else {
        showToast(translate('Something went wrong'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }

    } catch (err) {
      showToast(translate('Something went wrong'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
  },
}

export default actions;