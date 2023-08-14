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
        const facilityLocations = await this.dispatch('user/getFacilityLocations', this.state.user.currentFacility.facilityId);
        if(facilityLocations.length){
          const locationSeqId = facilityLocations[0].locationSeqId
          resp.data.items.map((item: any) => {
            item.locationSeqId = locationSeqId;
          });
        } else {
          showToast(translate("Facility locations were not found corresponding to destination facility of return shipment. Please add facility locations to avoid receive return shipment failure."))
        }
        commit(types.SHIPMENT_CURRENT_UPDATED, { current: resp.data })
        let productIds: any = new Set();
        resp.data.items.map((item: any) => {
          productIds.add(item.productId)
        }); 
        productIds = [...productIds]
        if(productIds.length) {
          this.dispatch('product/fetchProducts', { productIds })
        }
        return resp.data;
      } else {
        showToast(translate('Something went wrong'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }

    } catch (err: any) {
      showToast(translate('Something went wrong'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
  },
  receiveShipmentItem ({ commit }, payload) {
    return Promise.all(payload.items.map(async (item: any) => {
      const params = {
        shipmentId: payload.shipmentId,
        facilityId: this.state.user.currentFacility.facilityId,
        shipmentItemSeqId: item.itemSeqId,
        productId: item.productId,
        quantityAccepted: item.quantityAccepted,
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        unitCost: 0.00,
        locationSeqId: item.locationSeqId
      }
      const resp = await ShipmentService.receiveShipmentItem(params)
      if(resp.status === 200 && !hasError(resp)){
        return Promise.resolve(resp);
       } else {
        return Promise.reject(resp);
       }
    }))
  },
  async receiveShipment ({ dispatch }, payload) {
    emitter.emit("presentLoader");
    return await dispatch("receiveShipmentItem", payload).then(async () => {
      const resp = await ShipmentService.receiveShipment({
        "shipmentId": payload.shipmentId,
        "statusId": "PURCH_SHIP_RECEIVED"
      })
      if (resp.status == 200 && !hasError(resp)) {
        showToast(translate("Shipment received successfully", { shipmentId: payload.shipmentId }))
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => {
      console.error(err)
      return err;
    });
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
    } else {
      showToast(translate('Something went wrong'));
      console.error("error", resp._ERROR_MESSAGE_);
      return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
    }
  },

  async updateProductCount({ commit, state }, payload ) {
    const shipments = state.shipments.list;
    shipments.forEach((shipment: any) => {
      if(shipment.shipmentId === payload.shipmentId) {
        shipment.shipmentItemCount = parseInt(shipment.shipmentItemCount) + 1;
        return;
      }
    })

    commit(types.SHIPMENT_LIST_UPDATED, { shipments })
  },

  async clearShipments({ commit }) {
    commit(types.SHIPMENT_LIST_UPDATED, { shipments: [] })
    commit(types.SHIPMENT_CURRENT_UPDATED, { current: {} })
  },

  setItemLocationSeqId({ state, commit }, payload) {
    const item = state.current.items.find((item: any) => item.itemSeqId === payload.item.itemSeqId)
    if(item){
      item.locationSeqId = payload.locationSeqId
    }
    commit(types.SHIPMENT_CURRENT_UPDATED, { current: state.current })
  }
}

export default actions;
