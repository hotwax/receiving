import { defineStore } from "pinia";
import { api, commonUtil, emitter, translate } from "@common";
import { DateTime } from "luxon";
import { useProductStore as useProduct } from "@/store/product";
import { useProductStore } from "@/store/productStore";
import { useUtilStore } from "@/store/util";

export const useShipmentStore = defineStore("shipment", {
  state: () => ({
    shipments: {
      list: [] as any,
      total: 0,
    },
    current: {} as any,
  }),
  getters: {
    getShipments: (state) => state.shipments.list,
    getTotalShipments: (state) => state.shipments.total,
    getCurrent: (state) => state.current,
  },
  actions: {
    async findShipment(payload: any) {
      if (payload.viewIndex === 0) emitter.emit("presentLoader");
      let resp: any;
      try {
        resp = await api({
          url: "/performFind",
          method: "post",
          baseURL: commonUtil.getOmsURL(),
          data: payload,
          cache: true,
        });
        if (resp.status === 200 && resp.data.docs?.length > 0 && !commonUtil.hasError(resp)) {
          let shipments = resp.data.docs;
          const statusIds = [...new Set(shipments.map((shipment: any) => shipment.statusId))] as Array<string>;
          const utilStore = useUtilStore();
          const statuses = await utilStore.fetchStatus(statusIds);

          const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId);
          const shipmentAttributes = await this.fetchShipmentAttributes(shipmentIds);
          const trackingCodes = await this.fetchTrackingCodes(shipmentIds);

          shipments.map((shipment: any) => {
            shipment.statusDesc = statuses[shipment.statusId];
            shipment.trackingIdNumber = trackingCodes?.[shipment.shipmentId];
            shipment.externalOrderId = shipmentAttributes[shipment.shipmentId]?.["EXTERNAL_ORDER_ID"];
            shipment.externalOrderName = shipmentAttributes[shipment.shipmentId]?.["EXTERNAL_ORDER_NAME"];
          });

          if (payload.viewIndex && payload.viewIndex > 0) shipments = this.shipments.list.concat(shipments);
          this.shipments = { list: shipments, total: resp.data.count };
        } else {
          payload.viewIndex ? commonUtil.showToast(translate("Shipments not found")) : (this.shipments = { list: [], total: 0 });
        }
      } catch (error) {
        console.error(error);
        commonUtil.showToast(translate("Something went wrong"));
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      return resp;
    },

    async updateShipmentProductCount(payload: any) {
      const productStore = useProductStore();
      const product = useProduct();
      const barcodeIdentifier = productStore.getBarcodeIdentifierPref;
      const getProduct = product.getProduct;

      const item = this.current.items.find((item: any) => {
        const itemVal = barcodeIdentifier
          ? commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))
          : item.internalName;
        return itemVal === payload && item.quantityReceived === 0;
      });

      if (item) {
        item.quantityAccepted = item.quantityAccepted ? parseInt(item.quantityAccepted) + 1 : 1;
        return { isProductFound: true };
      }

      return { isProductFound: false };
    },

    async setCurrent(payload: any) {
      let resp: any;
      try {
        resp = await api({
          url: "shipment-detail",
          data: payload,
          method: "post",
        });
        if (resp.status === 200 && resp.data.items && !commonUtil.hasError(resp)) {
          const shipmentDetail = resp.data;
          const shipmentAttributes = await this.fetchShipmentAttributes([shipmentDetail.shipmentId]);
          const orderShipmentData = await this.fetchOrderShipments(shipmentDetail.shipmentId);
          shipmentDetail.externalOrderId = shipmentAttributes?.[shipmentDetail.shipmentId]?.["EXTERNAL_ORDER_ID"];
          shipmentDetail.externalOrderName = shipmentAttributes?.[shipmentDetail.shipmentId]?.["EXTERNAL_ORDER_NAME"];

          const productStore = useProductStore();
          const facilityLocations = await productStore.getFacilityLocations(productStore.getCurrentFacility.facilityId);
          if (facilityLocations.length) {
            const locationSeqId = facilityLocations[0].locationSeqId;
            resp.data.items.map((item: any) => {
              const orderShipment = orderShipmentData[shipmentDetail.shipmentId + "-" + item.itemSeqId];
              item.locationSeqId = locationSeqId;
              item.quantityReceived = item.quantityAccepted ? Number(item.quantityAccepted) : 0;
              item.orderId = orderShipment?.orderId;
              item.orderItemSeqId = orderShipment?.orderItemSeqId;
            });
          } else {
            commonUtil.showToast(
              translate(
                "Facility locations were not found corresponding to destination facility of return shipment. Please add facility locations to avoid receive return shipment failure."
              )
            );
          }
          this.current = shipmentDetail;
          let productIds: any = new Set();
          resp.data.items.map((item: any) => {
            productIds.add(item.productId);
          });
          productIds = [...productIds];
          if (productIds.length) {
            const product = useProduct();
            product.fetchProducts({ productIds });
          }
          return resp.data;
        } else {
          commonUtil.showToast(translate("Something went wrong"));
          console.error("error", resp.data._ERROR_MESSAGE_);
          return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
        }
      } catch (err: any) {
        commonUtil.showToast(translate("Something went wrong"));
        console.error("error", err);
        return Promise.reject(new Error(err));
      }
    },

    async receiveReturnShipment(payload: any) {
      emitter.emit("presentLoader");
      const productStore = useProductStore();
      const itemsToReceive = payload.isMultiReceivingEnabled
        ? payload.items
        : payload.items.filter((item: any) => item.quantityReceived === 0);
      const items = itemsToReceive.map((item: any) => {
        return {
          shipmentItemSeqId: item.itemSeqId,
          productId: item.productId,
          quantityAccepted: item.quantityAccepted,
          orderId: item.orderId,
          orderItemSeqId: item.orderItemSeqId,
          unitCost: 0.0,
          locationSeqId: item.locationSeqId,
        };
      });

      try {
        const resp = await api({
          url: `oms/returnShipments/${payload.shipmentId}/receive`,
          method: "POST",
          data: {
            shipmentId: payload.shipmentId,
            items,
            facilityId: productStore.getCurrentFacility.facilityId
          }
        });

        if (resp && resp?.status === 200) {
          emitter.emit("dismissLoader");
          return true;
        }
      } catch (err) {
        commonUtil.showToast(translate("Something went wrong, please try again"));
      }
      emitter.emit("dismissLoader");
      return false;
    },

    async receiveShipmentJson(payload: any) {
      emitter.emit("presentLoader");
      const productStore = useProductStore();
      const fileName = `ReceiveShipment_${payload.shipmentId}_${DateTime.now().toLocaleString(
        DateTime.DATETIME_MED_WITH_SECONDS
      )}.json`;
      const params = {
        configId: "RECEIVE_SHIP_ITEMS",
      };
      if (!payload.isMultiReceivingEnabled) {
        payload.items = payload.items.filter((item: any) => item.quantityReceived === 0);
      }
      const uploadData = payload.items.map((item: any) => {
        return {
          shipmentId: payload.shipmentId,
          facilityId: productStore.getCurrentFacility.facilityId,
          shipmentItemSeqId: item.itemSeqId,
          productId: item.productId,
          quantityAccepted: item.quantityAccepted,
          orderId: item.orderId,
          orderItemSeqId: item.orderItemSeqId,
          unitCost: 0.0,
          locationSeqId: item.locationSeqId,
        };
      });

      try {
        const uploadPayload = this.prepareUploadJsonPayload({
          uploadData,
          fileName,
          params,
        });
        let resp: any = await api({
          url: "uploadAndImportFile",
          method: "post",
          baseURL: commonUtil.getOmsURL(),
          ...uploadPayload,
        });
        if (resp.status == 200 && !commonUtil.hasError(resp)) {
          const uploadFileContentId = resp.data.uploadFileContentId;
          if (uploadFileContentId) {
            resp = await api({
              url: "/performFind",
              method: "POST",
              baseURL: commonUtil.getOmsURL(),
              data: {
                inputFields: {
                  configId: "RECEIVE_SHIP_ITEMS",
                  uploadFileContentId: uploadFileContentId,
                  errorRecordContentId_op: "empty",
                  statusI: "SERVICE_FINISHED",
                },
                fieldList: ["logId", "configId", "uploadFileContentId", "errorRecordContentId", "statusId"],
                entityName: "DataManagerLog",
                viewSize: 1,
              },
            });
            if (!commonUtil.hasError(resp) && resp.data.docs.length) {
              resp = await api({
                url: "receiveShipment",
                method: "post",
                baseURL: commonUtil.getOmsURL(),
                data: {
                  shipmentId: payload.shipmentId,
                  statusId: "PURCH_SHIP_RECEIVED",
                },
              });
              if (resp.status == 200 && !commonUtil.hasError(resp)) {
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
        commonUtil.showToast(translate("Something went wrong, please try again"));
      }
      emitter.emit("dismissLoader");
      return false;
    },

    async addShipmentItem(payload: any) {
      const item = payload.shipmentId ? { ...payload.item } : { ...payload };
      const product = {
        ...item,
        quantityAccepted: 0,
        quantityOrdered: 0,
        quantityReceived: 0,
      };
      const params = {
        orderId: payload.orderId,
        productId: product.productId,
        quantity: 0,
        shipmentId: payload.shipmentId ? payload.shipmentId : this.current.shipmentId,
        shipmentItemSeqId: payload.shipmentItemSeqId,
        locationSeqId: product.locationSeqId,
      };
      const resp: any = await api({
        url: "addShipmentItem",
        method: "post",
        data: params,
      });
      if (resp.status == 200 && !commonUtil.hasError(resp) && resp.data.shipmentId && resp.data.shipmentItemSeqId) {
        this.updateProductCount({ shipmentId: resp.data.shipmentId });
        if (!payload.shipmentId) {
          this.current.items.push({
            ...product,
            itemSeqId: resp.data.shipmentItemSeqId,
          });
        }
        return resp;
      } else {
        commonUtil.showToast(translate("Something went wrong"));
        console.error("error", resp._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }
    },

    updateProductCount(payload: any) {
      const shipments = this.shipments.list;
      shipments.forEach((shipment: any) => {
        if (shipment.shipmentId === payload.shipmentId) {
          shipment.shipmentItemCount = parseInt(shipment.shipmentItemCount) + 1;
        }
      });
      this.shipments.list = shipments;
    },

    clearShipments() {
      this.shipments = { list: [], total: 0 };
      this.current = {};
    },

    setItemLocationSeqId(payload: any) {
      const item = this.current.items.find((item: any) => item.itemSeqId === payload.item.itemSeqId);
      if (item) {
        item.locationSeqId = payload.locationSeqId;
      }
    },
    prepareUploadJsonPayload(request: any) {
      const blob = new Blob([JSON.stringify(request.uploadData)], { type: "application/json" });
      const formData = new FormData();
      const fileName = request.fileName ? request.fileName : Date.now() + ".json";

      formData.append("uploadedFile", blob, fileName);

      if (request.params) {
        for (const key in request.params) {
          formData.append(key, request.params[key]);
        }
      }

      return {
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data;",
        },
      };
    },
    async fetchTrackingCodes(shipmentIds: Array<string>) {
      let shipmentTrackingCodes = {} as any;
      const params = {
        entityName: "ShipmentRouteSegment",
        inputFields: {
          shipmentId: shipmentIds,
          shipmentId_op: "in",
        },
        fieldList: ["shipmentId", "trackingIdNumber"],
        viewSize: 250,
        distinct: "Y",
      };

      try {
        const resp = await api({
          url: "performFind",
          method: "get",
          baseURL: commonUtil.getOmsURL(),
          params,
        });

        if (!commonUtil.hasError(resp)) {
          shipmentTrackingCodes = resp?.data.docs.reduce(
            (codes: any, item: any) => ((codes[item.shipmentId] = item.trackingIdNumber), codes),
            {}
          );
        } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
          return Promise.reject(resp?.data.error);
        }
      } catch (err) {
        console.error("Failed to fetch tracking codes for shipments", err);
      }

      return shipmentTrackingCodes;
    },
    async fetchShipmentAttributes(shipmentIds: Array<string>) {
      const shipmentAttributes = {} as any;
      const params = {
        entityName: "ShipmentAttribute",
        inputFields: {
          shipmentId: shipmentIds,
          shipmentId_op: "in",
        },
        fieldList: ["shipmentId", "attrName", "attrValue"],
        viewSize: 250,
        distinct: "Y",
      };

      try {
        const resp: any = await api({
          url: "performFind",
          method: "get",
          baseURL: commonUtil.getOmsURL(),
          params,
        });

        if (!commonUtil.hasError(resp)) {
          resp?.data.docs.forEach((attribute: any) => {
            const { shipmentId, attrName, attrValue } = attribute;
            if (!shipmentAttributes[shipmentId]) {
              shipmentAttributes[shipmentId] = {};
            }
            shipmentAttributes[shipmentId][attrName] = attrValue;
          });
        } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
          return Promise.reject(resp?.data.error);
        }
      } catch (err) {
        console.error("Failed to fetch shipment attributes", err);
      }

      return shipmentAttributes;
    },
    async fetchOrderShipments(shipmentId: string) {
      let orderShipmentData = {} as any;
      const params = {
        entityName: "OrderShipment",
        inputFields: {
          shipmentId,
        },
        viewSize: 250,
      };

      try {
        const resp: any = await api({
          url: "performFind",
          method: "get",
          baseURL: commonUtil.getOmsURL(),
          params,
        });

        if (!commonUtil.hasError(resp)) {
          orderShipmentData = resp?.data?.docs.reduce((shipmentData: any, shipment: any) => {
            const key = `${shipment.shipmentId}-${shipment.shipmentItemSeqId}`;
            shipmentData[key] = shipment;
            return shipmentData;
          }, {});
        } else {
          throw resp.data;
        }
      } catch (err) {
        console.error("Failed to fetch order shipments", err);
      }

      return orderShipmentData;
    },
  },
  persist: true,
});
