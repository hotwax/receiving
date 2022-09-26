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
        const statusIds = [...new Set(shipments.map((shipment: any) => shipment.statusId))]
        const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId)
        const statuses = await this.dispatch('util/fetchStatus', statusIds);
        shipments.map(async (shipment: any) => {
          shipment.statusDesc = statuses[shipment.statusId]
        });
        if (payload.viewIndex && payload.viewIndex > 0) shipments = state.shipments.list.concat(shipments);
        commit(types.SHIPMENT_LIST_UPDATED, { shipments })
      } else {
        if(!payload.viewIndex) commit(types.SHIPMENT_LIST_UPDATED, { shipments: [] })
        showToast(translate("Shipments not found"));
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
    }
    return resp;
  },

  async updateShipmentProductCount ({ commit, state }, payload) {
    await state.current.items.find((item: any) => {
      if(item.sku === payload){
        item.quantityAccepted = parseInt(item.quantityAccepted) + 1;
      }
    });
    commit(types.SHIPMENT_CURRENT_UPDATED, state);
  },
  async setCurrent ({ commit }, payload) {
    let resp;
    try {
      resp = await ShipmentService.getShipmentDetail(payload);
      if (resp.status === 200 && resp.data.items&& !hasError(resp)) {
        commit(types.SHIPMENT_CURRENT_UPDATED, { current: resp.data })
        let productIds: any = new Set();
        const facilityLocations = this.state.user.facilityLocationsByFacilityId[this.state.user.currentFacility.facilityId];
        resp.data.items.map((item: any) => {
          productIds.add(item.productId)
          item.locationSeqId = facilityLocations[0].locationSeqId;
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
    const payload = data.shipment ? {
      shipmentId: data.shipment.shipmentId,
    } : {
      shipmentId: data.shipmentId,
    }
    return Promise.all(data.items.map((item: any) => {
      const params = {
        ...payload,
        facilityId: this.state.user.currentFacility.facilityId,
        shipmentItemSeqId: item.itemSeqId,
        productId: item.productId,
        quantityAccepted: item.quantityAccepted,
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        unitCost: 0.00,
        locationSeqId: item.locationSeqId
      }
      return ShipmentService.receiveShipmentItem(params).catch((err) => {
        return err;
      })
    }))
  },
  async receiveShipment ({ dispatch }, {payload}) {
    emitter.emit("presentLoader");
    return await dispatch("receiveShipmentItem", payload).then(async( ) => {
      const resp = await ShipmentService.receiveShipment({
        "shipmentId": payload.shipment ? payload.shipment.shipmentId : payload.shipmentId,
        "statusId": "PURCH_SHIP_RECEIVED"
      })
      if (resp.status == 200 && !hasError(resp)) {
        showToast(translate("Shipment Received Successfully") + ' ' + (payload.shipment ? payload.shipment.shipmentId : payload.shipmentId))
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => err);
  },
  async addShipmentItem ({ state, commit, dispatch }, payload) {
    const item = payload.shipmentId ? { ...(payload.item) } : { ...payload }
    const product = {
      ...item,
      quantityAccepted: 0,
      quantityOrdered: 0
    }
    const params = {
      orderId: payload.orderId,
      productId: product.productId,
      quantity: 0,
      shipmentId: payload.shipmentId ? payload.shipmentId : state.current.shipmentId,
      shipmentItemSeqId: payload.shipmentItemSeqId,
      locationSeqId: product.locationSeqId
    }
    const resp = await ShipmentService.addShipmentItem(params);
    if(resp.status == 200 && !hasError(resp)){
      dispatch('updateProductCount', { shipmentId: resp.data.shipmentId })
      if (!payload.shipmentId) commit(types.SHIPMENT_CURRENT_PRODUCT_ADDED, product)
      return resp;
    }
    else {
      showToast(translate('Something went wrong'));
      console.log("error", resp._ERROR_MESSAGE_);
      return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
    }
  },

  async updateProductCount({ commit, state }, payload ) {
    const shipments = state.shipments.list;
    shipments.forEach((shipment: any) => {
      if(shipment.id === payload.shipmentId) {
        shipment.noOfItem = parseInt(shipment.noOfItem) + 1;
        return;
      }
    })

    commit(types.SHIPMENT_LIST_UPDATED, { shipments })
  },

  async clearShipments({ commit }) {
    commit(types.SHIPMENT_LIST_UPDATED, { shipments: [] })
    commit(types.SHIPMENT_CURRENT_UPDATED, { current: {} })
  },

  setItemLocationSeqId({ commit }, payload) {
    commit(types.SHIPMENT_ITEM_LOCATION_SEQ_ID_UPDATED, payload)
  }
}

export default actions;