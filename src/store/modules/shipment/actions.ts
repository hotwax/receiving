import { ShipmentService } from "@/services/ShipmentService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ShipmentState from './ShipmentState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'

const actions: ActionTree<ShipmentState, RootState> = {
  async findShipment ({ commit, state }, payload) {
    let resp;
    try {
      resp = await ShipmentService.fetchShipments(payload)
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        let shipments = resp.data.docs;
        if (payload.viewIndex && payload.viewIndex > 0) shipments = state.shipments.list.concat(shipments);
        commit(types.SHIPMENT_LIST_UPDATED, { shipments })
      } else {
        showToast(translate("Shipments not found"));
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
    }
    return resp;
  },
  async setCurrent ({ commit }, payload) {
    let resp;
    try {
      resp = await ShipmentService.getShipmentDetail(payload);
      if (resp.status === 200 && resp.data.items&& !hasError(resp)) {
        commit(types.SHIPMENT_CURRENT_UPDATED, { current: resp.data })
        let productIds: any = new Set();
        resp.data.items.forEach((item: any) => {
          productIds.add(item.productId)
        });

        productIds = [...productIds]
        if(productIds.length) {
          this.dispatch('product/fetchProducts', { productIds })
        }
        return resp.data;
      } else {
        showToast(translate('Something went wrong'));
        console.log("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }

    } catch (err) {
      showToast(translate('Something went wrong'));
      console.log("error", err);
      return Promise.reject(new Error(err))
    }
  },
  receiveShipmentItem ({ commit }, data) {
    const payload = {
      'shipmentId': data.shipmentId
    }
    return Promise.all(data.items.map((item: any) => {
        const params = {
        ...payload,
        shipmentId: item.shipmentId,
        facilityId: this.state.user.currentFacility.facilityId,
        shipmentItemSeqId: item.itemSeqId,
        productId: item.productId,
        quantityAccepted: item.quantityAccepted,
        locationSeqId: item.locationSeqId
      }
      return ShipmentService.receiveShipmentItem({'payload': params}).catch((err) => { 
        return err;
      })
    }))
  },
  async receiveShipment ({ dispatch }, {payload}) {
    emitter.emit("presentLoader");
    return await dispatch("receiveShipmentItem", payload).then(async(response) => {
      const resp = await ShipmentService.receiveShipment({
        "shipmentId": payload.shipmentId,
        "statusId": "PURCH_SHIP_RECEIVED"
      })
      if (resp.status == 200 && !hasError(resp)) {
        showToast(translate("Shipment Received Successfully") + ' ' + payload.shipmentId)
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => err);
  }
}

export default actions;