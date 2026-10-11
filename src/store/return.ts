import { defineStore } from "pinia";
import { api, commonUtil, emitter, translate } from "@common";
import { useUtilStore } from "@/store/util";
import { useProductStore as useProduct } from "@/store/product";
import { useProductStore } from "@/store/productStore";

export const useReturnStore = defineStore("return", {
  state: () => ({
    current: {
      return: {} as any,
      items: [] as any,
    },
    returns: {
      list: [] as any,
      total: 0,
    },
    validStatusChange: {} as any,
  }),
  getters: {
    getReturns: (state) => state.returns.list,
    getReturnsTotal: (state) => state.returns.total,
    getCurrent: (state) => state.current,
    isReturnReceivable: (state) => (statusId: string) => state.validStatusChange[statusId]?.includes("PURCH_SHIP_RECEIVED"),
  },
  actions: {
    async findReturn(payload: any) {
      if (payload.pageIndex === 0) emitter.emit("presentLoader");
      let resp: any;
      try {
        resp = await api({
          url: "oms/returnShipments",
          method: "GET",
          params: payload
        });
        if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.returnShipments?.length > 0) {
          let returns = resp.data.returnShipments;
          const statusIds = [...new Set(returns.map((returnShipment: any) => returnShipment.statusId))] as Array<string>;
          const utilStore = useUtilStore();
          const statuses = await utilStore.fetchStatus(statusIds);
          returns.forEach((shipment: any) => {
            shipment.statusDesc = statuses[shipment.statusId];
          });
          if (payload.pageSize && payload.pageIndex > 0) returns = this.returns.list.concat(returns);
          this.returns = { list: returns, total: resp.data.count };
        } else {
          payload.pageIndex ? commonUtil.showToast(translate("Returns not found")) : (this.returns = { list: [], total: 0 });
        }
      } catch (error) {
        console.error(error);
        commonUtil.showToast(translate("Something went wrong"));
      }
      if (payload.pageIndex === 0) emitter.emit("dismissLoader");
      return resp;
    },

    async updateReturnProductCount(payload: any) {
      const product = useProduct();
      const productStore = useProductStore();
      const barcodeIdentifier = productStore.getBarcodeIdentifierPref;
      const getProduct = product.getProduct;

      const item = this.current.items.find((item: any) => {
        const itemVal = barcodeIdentifier
          ? commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))
          : item.internalName;
        return itemVal === payload;
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
        let returnShipment = this.returns.list.find((shipment: any) => shipment.shipmentId === payload.shipmentId);

        if (!returnShipment) {
          const getReturnShipmentPayload = {
            shipmentId: payload.shipmentId,
            fieldsToSelect: "shipmentId,externalId,statusId,shopifyOrderName,hcOrderId,trackingCode,destinationFacilityId",
            pageSize: 1,
            pageIndex: 0,
          } as any;
          resp = await api({
            url: "oms/returnShipments",
            method: "GET",
            params: getReturnShipmentPayload
          });
          if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.returnShipments?.length > 0) {
            returnShipment = resp.data.returnShipments[0];
            const utilStore = useUtilStore();
            const statuses = await utilStore.fetchStatus([returnShipment.statusId]);
            returnShipment.statusDesc = statuses[returnShipment.statusId];
          } else {
            commonUtil.showToast(translate("Something went wrong"));
            console.error("error", resp.data._ERROR_MESSAGE_);
            return;
          }
        }

        resp = await api({
          url: `oms/returnShipments/${payload.shipmentId}`,
          method: "GET",
        });

        if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.items) {
          const productStore = useProductStore();
          const facilityLocations = await productStore.getFacilityLocations(returnShipment.destinationFacilityId);
          if (facilityLocations.length) {
            const locationSeqId = facilityLocations[0].locationSeqId;
            resp.data.items.map((item: any) => {
              item.locationSeqId = locationSeqId;
              item.quantityReceived = item.quantityAccepted ? Number(item.quantityAccepted) : 0;
            });
          } else {
            commonUtil.showToast(
              translate(
                "Facility locations were not found corresponding to destination facility of return shipment. Please add facility locations to avoid receive return shipment failure."
              )
            );
          }

          this.current = { ...resp.data, ...returnShipment };
          const productIds = [...new Set(resp.data.items.map((item: any) => item.productId))] as Array<string>;

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

    clearReturns() {
      this.returns = { list: [], total: 0 };
      this.current = { return: {}, items: [] };
    },

    async fetchValidReturnStatuses() {
      let resp: any;
      try {
        resp = await api({
          url: "admin/statusFlows/transitions",
          method: "GET",
          params: {
            toStatusId: "PURCH_SHIP_RECEIVED",
            conditionExpression_op: "empty",
            pageSize: 100
          },
        });

        if (resp.status == 200 && resp.data.length && !commonUtil.hasError(resp)) {
          const returnStatusValidChange = resp.data.reduce((acc: any, obj: any) => {
            const status = obj["statusId"];
            if (!acc[status]) {
              acc[status] = [];
            }
            acc[status].push(obj.toStatusId);
            return acc;
          }, {});

          this.validStatusChange = returnStatusValidChange;
        } else {
          console.error("Unable to fetch valid return status change options");
        }
      } catch (err) {
        console.error(err);
      }
    },

    setItemLocationSeqId(payload: any) {
      const item = this.current.items.find((item: any) => item.itemSeqId === payload.item.itemSeqId);
      if (item) {
        item.locationSeqId = payload.locationSeqId;
      }
    },
  },
  persist: true,
});
