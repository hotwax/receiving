import { ShipmentService } from "@/services/ShipmentService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ShipmentState from './ShipmentState'
import * as types from './mutation-types'
import { hasError, showToast, getCurrentFacilityId } from '@/utils'
import { getProductIdentificationValue, translate, useUserStore } from '@hotwax/dxp-components'
import emitter from '@/event-bus'
import store from "@/store";
import { DateTime } from 'luxon';
import { UploadService } from "@/services/UploadService";
import { toHandlerKey } from "vue";

const actions: ActionTree<ShipmentState, RootState> = {
  async findShipment ({ commit, state }, payload) {
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;
    try {
      resp = await ShipmentService.fetchShipments(payload)
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        let shipments = resp.data.docs;
        const statusIds = [...new Set(shipments.map((shipment: any) => shipment.statusId))]
        const statuses = await this.dispatch('util/fetchStatus', statusIds);

        const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId);
        const shipmentAttributes = await ShipmentService.fetchShipmentAttributes(shipmentIds)
        const trackingCodes = await ShipmentService.fetchTrackingCodes(shipmentIds)
        
        shipments.map(async (shipment: any) => {
          shipment.statusDesc = statuses[shipment.statusId]
          shipment.trackingIdNumber = trackingCodes?.[shipment.shipmentId];
          shipment.externalOrderId = shipmentAttributes[shipment.shipmentId]?.['EXTERNAL_ORDER_ID']
          shipment.externalOrderName = shipmentAttributes[shipment.shipmentId]?.['EXTERNAL_ORDER_NAME']
        });

        if (payload.viewIndex && payload.viewIndex > 0) shipments = state.shipments.list.concat(shipments);
        commit(types.SHIPMENT_LIST_UPDATED, { shipments })
      } else {
        payload.viewIndex ? showToast(translate("Shipments not found")) : commit(types.SHIPMENT_LIST_UPDATED, { shipments: [] })
      }
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
    }
    if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    return resp;
  },

  async updateShipmentProductCount ({ commit, state }, payload) {
    const barcodeIdentifier = store.getters['util/getBarcodeIdentificationPref'];
    const getProduct = store.getters['product/getProduct'];

    const item = state.current.items.find((item: any) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) : item.internalName;
      return itemVal === payload && item.quantityReceived === 0;
    });

    if (item) {
      item.quantityAccepted = item.quantityAccepted ? parseInt(item.quantityAccepted) + 1 : 1;
      commit(types.SHIPMENT_CURRENT_UPDATED, state);
      return { isProductFound: true }
    }

    return { isProductFound: false }
  },
  async setCurrent ({ commit }, payload) {
    let resp;
    try {
      resp = await ShipmentService.getShipmentDetail(payload);
      if (resp.status === 200 && resp.data.items&& !hasError(resp)) {
        const shipmentDetail = resp.data;
        const shipmentAttributes = await ShipmentService.fetchShipmentAttributes([shipmentDetail.shipmentId])
        const orderShipmentData = await ShipmentService.fetchOrderShipments(shipmentDetail.shipmentId)
        shipmentDetail.externalOrderId = shipmentAttributes?.[shipmentDetail.shipmentId]?.['EXTERNAL_ORDER_ID']
        shipmentDetail.externalOrderName = shipmentAttributes?.[shipmentDetail.shipmentId]?.['EXTERNAL_ORDER_NAME']
        const facilityLocations = await this.dispatch('user/getFacilityLocations', getCurrentFacilityId());
        if(facilityLocations.length){
          const locationSeqId = facilityLocations[0].locationSeqId
          resp.data.items.map((item: any) => {
            const orderShipment = orderShipmentData[shipmentDetail.shipmentId + "-" + item.itemSeqId];
            item.locationSeqId = locationSeqId;
            item.quantityReceived = item.quantityAccepted ? Number(item.quantityAccepted) : 0,
            item.orderId = orderShipment?.orderId,
            item.orderItemSeqId = orderShipment?.orderItemSeqId
          });
        } else {
          showToast(translate("Facility locations were not found corresponding to destination facility of return shipment. Please add facility locations to avoid receive return shipment failure."))
        }
        commit(types.SHIPMENT_CURRENT_UPDATED, { current: shipmentDetail })
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
  async receiveShipmentItem ({ commit }, payload) {
    let areAllSuccess = true;

    for (const item of payload.items) {
      if(payload.isMultiReceivingEnabled || item.quantityReceived === 0) {
        if (!item.locationSeqId) {
          console.error("Missing locationSeqId on item");
          areAllSuccess = false;
          continue;
        }

        const params = {
          shipmentId: payload.shipmentId,
          facilityId: getCurrentFacilityId(),
          shipmentItemSeqId: item.itemSeqId,
          productId: item.productId,
          quantityAccepted: item.quantityAccepted,
          orderId: item.orderId,
          orderItemSeqId: item.orderItemSeqId,
          unitCost: 0.00,
          locationSeqId: item.locationSeqId
        }

        try {
          const resp = await ShipmentService.receiveShipmentItem(params)
          if(hasError(resp)){
            throw resp.data;
          }
        } catch(error: any) {
          areAllSuccess = false
        }
      }
    }

    return areAllSuccess;
  },
  async receiveShipmentJson ({ dispatch }, payload) {
    emitter.emit("presentLoader");
    const fileName = `ReceiveShipment_${payload.shipmentId}_${DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}.json`;
    const params = {
      "configId": "RECEIVE_SHIP_ITEMS"
    }
    if(!payload.isMultiReceivingEnabled) {
      payload.items = payload.items.filter((item: any) => item.quantityReceived === 0)
    }
    const uploadData = payload.items.map((item: any) => {
      return {
        shipmentId: payload.shipmentId,
        facilityId: getCurrentFacilityId(),
        shipmentItemSeqId: item.itemSeqId,
        productId: item.productId,
        quantityAccepted: item.quantityAccepted,
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        unitCost: 0.00,
        locationSeqId: item.locationSeqId
      };
    })

    try {
      const uploadPayload = UploadService.prepareUploadJsonPayload({
        uploadData,
        fileName,
        params
      });
      let resp = await UploadService.uploadJsonFile(uploadPayload);
      if (resp.status == 200 && !hasError(resp)) {
        const uploadFileContentId = resp.data.uploadFileContentId;
        if (uploadFileContentId) {
          resp = await UploadService.fetchDataManagerLog({
            "inputFields": {
              "configId": "RECEIVE_SHIP_ITEMS",
              "uploadFileContentId": uploadFileContentId,
              "errorRecordContentId_op": "empty",
              "statusI": "SERVICE_FINISHED",
            },
            "fieldList": ["logId", "configId", "uploadFileContentId", "errorRecordContentId", "statusId"],
            "entityName": "DataManagerLog",
            "viewSize": 1
          });
          if (!hasError(resp) && resp.data.docs.length) {
            //If there is no error and file is processed then mark the shipment as received
            resp = await ShipmentService.receiveShipment({
              "shipmentId": payload.shipmentId,
              "statusId": "PURCH_SHIP_RECEIVED"
            })
            if (resp.status == 200 && !hasError(resp)) {
              return true;
            } else {
              throw resp.data;
            }
          } else {
            throw resp.data;
          }
        }
      } else {
        throw resp.data;
      }
    } catch (err) {
      showToast(translate("Something went wrong, please try again"));
    }
    emitter.emit("dismissLoader");
    return false;
  },

  async receiveShipment ({ dispatch }, payload) {
    emitter.emit("presentLoader", {message: 'Receiving in-progress.', backdropDismiss: false});
    const areAllSuccess = await dispatch("receiveShipmentItem", payload);
    if(areAllSuccess) {
      try {
        const resp = await ShipmentService.receiveShipment({
          "shipmentId": payload.shipmentId,
          "statusId": "PURCH_SHIP_RECEIVED"
        })

        if (resp.status == 200 && !hasError(resp)) {
          showToast(translate("Shipment received successfully", { shipmentId: payload.shipmentId }))
          emitter.emit("dismissLoader");
          return true;
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        console.error(error);
      }
    }
    emitter.emit("dismissLoader");
    return false;
  },
  async addShipmentItem ({ state, commit, dispatch }, payload) {
    const item = payload.shipmentId ? { ...(payload.item) } : { ...payload }
    const product = {
      ...item,
      quantityAccepted: 0,
      quantityOrdered: 0,
      quantityReceived: 0
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
    if(resp.status == 200 && !hasError(resp) && resp.data.shipmentId && resp.data.shipmentItemSeqId) {
      dispatch('updateProductCount', { shipmentId: resp.data.shipmentId })
      if (!payload.shipmentId) {
        // When adding item to a shipment from details page, then adding the shipmentItemSeqId to item level, as we do not generate shipmentItemSeqId app side,
        // when adding an item to shipment
        commit(types.SHIPMENT_CURRENT_PRODUCT_ADDED, {
          ...product,
          itemSeqId: resp.data.shipmentItemSeqId
        })
      }
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
