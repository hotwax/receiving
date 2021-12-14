import { PurchaseOrdersService } from "@/services/PurchaseOrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PurchaseOrderState from './PurchaseOrderState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'


const actions: ActionTree<PurchaseOrderState, RootState> = {

  // Find Product
  async findPurchaseOrders ({ commit, state }) {

    // Show loader only when new query and not the infinite scroll
    // if (payload.viewIndex === 0) emitter.emit("presentLoader");

    let resp;

    try {
      resp = await PurchaseOrdersService.fetchPurchaseOrders()

      // resp.data.response.numFound tells the number of items in the response
      if (resp.status === 200 && !hasError(resp)) {
        console.log(resp);
      } else {
        //showing error whenever getting no products in the response or having any other error
        showToast(translate("Product not found"));
      }
      // Remove added loader only when new query and not the infinite scroll
      // if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.log(error)
      showToast(translate("Something went wrong"));
    }
    // TODO Handle specific error
    return resp;
  },
}

export default actions;