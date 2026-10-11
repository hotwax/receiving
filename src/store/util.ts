import { defineStore } from "pinia";
import { api, commonUtil, logger } from "@common";

export const useUtilStore = defineStore("util", {
  state: () => ({
    status: {} as any,
    shipmentMethodsByCarrier: {} as Record<string, any[]>,
    carrierDesc: {} as Record<string, string>,
  }),
  getters: {
    getStatusDesc: (state) => (statusId: string) => state.status[statusId],
    getShipmentMethodsByCarrier: (state) => state.shipmentMethodsByCarrier,
    getCarrierDesc: (state) => (partyId: string) => state.carrierDesc[partyId] ? state.carrierDesc[partyId] : partyId,
  },
  actions: {
    async fetchStatus(statusIds: Array<string>) {
      const cachedStatus = JSON.parse(JSON.stringify(this.status));
      const statusIdFilter = statusIds.reduce((filter: Array<string>, statusId: any) => {
        if (!cachedStatus[statusId]) {
          filter.push(statusId);
        }
        return filter;
      }, []);

      if (statusIdFilter.length <= 0) return cachedStatus;

      try {
        const resp = await api({
          url: "admin/status",
          method: "GET",
          params: {
            pageSize: statusIdFilter.length,
            statusId: statusIdFilter,
            statusId_op: "in",
          },
        });
        if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.length > 0) {
          const statuses = resp.data;
          statuses.reduce((cached: any, status: any) => {
            cached[status.statusId] = status.description;
            return cached;
          }, cachedStatus);
          this.status = cachedStatus;
        }
      } catch (err) {
        console.error("Something went wrong while fetching status");
      }
      return cachedStatus;
    },
    async getInventoryAvailableByFacility(query: any): Promise<any> {
      return api({
        url: "poorti/getInventoryAvailableByFacility",
        method: "GET",
        params: query,
      });
    },
    async fetchProductsAverageCost(productIds: any, facilityId: any): Promise<any> {
      if (!productIds.length) return [];
      const requests = [];
      const productIdList = [...productIds];
      const productAverageCostDetail = {} as any;

      while (productIdList.length) {
        const ids = productIdList.splice(0, 100);
        requests.push({
          customParametersMap: {
            facilityId,
            productId: ids,
            productId_op: "in",
            orderByField: "-fromDate",
            pageIndex: 0,
            pageSize: 100,
          },
          dataDocumentId: "ProductWeightedAverageCost",
          filterByDate: true,
        });
      }

      const responses = await Promise.allSettled(requests.map((data) => api({
        url: "oms/dataDocumentView",
        method: "POST",
        data,
      })));

      if (responses.some((response: any) => response.status !== "fulfilled")) return {};

      responses.forEach((response: any) => {
        if (response.value.data?.entityValueList?.length) {
          response.value.data.entityValueList.forEach((item: any) => {
            if (!productAverageCostDetail[item.productId]) productAverageCostDetail[item.productId] = item.averageCost;
          });
        }
      });

      return productAverageCostDetail;
    },
    async fetchStoreCarrierAndMethods(productStoreId: string) {
      let shipmentMethodsByCarrier = {} as Record<string, any[]>;

      try {
        const resp = await api({
          url: "oms/dataDocumentView",
          method: "POST",
          data: {
            customParametersMap: {
              productStoreId,
              roleTypeId: "CARRIER",
              shipmentMethodTypeId: "STOREPICKUP",
              shipmentMethodTypeId_op: "equals",
              shipmentMethodTypeId_not: "Y",
              pageIndex: 0,
              pageSize: 100,
            },
            dataDocumentId: "ProductStoreShipmentMethod",
            filterByDate: true,
          },
        });

        if (!commonUtil.hasError(resp)) {
          shipmentMethodsByCarrier = resp.data.entityValueList.reduce((result: Record<string, any[]>, storeCarrierAndMethod: any) => {
            const { partyId, shipmentMethodTypeId, description } = storeCarrierAndMethod;

            if (!result[partyId]) result[partyId] = [];
            result[partyId].push({ shipmentMethodTypeId, description });
            return result;
          }, {});
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error("Error fetching store carriers and shipment methods", error);
      }

      this.shipmentMethodsByCarrier = shipmentMethodsByCarrier;
    },
    async fetchCarriersDetail() {
      if (Object.keys(this.carrierDesc).length) return;

      const carrierDesc = {} as Record<string, string>;
      try {
        const resp = await api({
          url: "oms/shippingGateways/carrierParties",
          method: "GET",
          params: {
            roleTypeId: "CARRIER",
            fieldsToSelect: ["partyId", "partyTypeId", "roleTypeId", "firstName", "lastName", "groupName"],
            distinct: "Y",
            pageSize: 20,
          },
        });

        if (!commonUtil.hasError(resp)) {
          resp.data.forEach((carrier: any) => {
            carrierDesc[carrier.partyId] = carrier.groupName || [carrier.firstName, carrier.lastName].filter(Boolean).join(" ") || carrier.partyId;
          });
        } else {
          throw resp.data;
        }
      } catch (error) {
        logger.error("Error fetching carriers detail", error);
      }

      this.carrierDesc = carrierDesc;
    },
  },
  persist: true,
});
