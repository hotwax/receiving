import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'


const actions: ActionTree<ProductState, RootState> = {

  async findProducts ({ commit }, payload) {
    let resp;

    try {
      resp = await ProductService.getShipments({
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex,
        "facilityId": payload.facilityId,
        "statusId": 'PURCH_SHIP_SHIPPED'
      });

      if (resp.status === 200 && resp.data.shipments && !hasError(resp)) {
        commit(types.PRODUCT_ITEMS, { list: resp.data.shipments })
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

  async setCurrentShipping ({ commit }, payload) {
    let resp;

    try {
      resp = await ProductService.getShipmentProducts(payload);

      if (resp.status === 200 && resp.data.shipmentProducts && !hasError(resp)) {
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