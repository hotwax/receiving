import { defineStore } from "pinia";
import { api, commonUtil, emitter, translate, useSolrSearch } from "@common";
import { useProductStore as useProduct } from "@/store/product";
import { useProductStore } from "@/store/productStore";
import { useShipmentStore } from "@/store/shipment";
import { usePartyStore } from "@/store/party";

export const useOrderStore = defineStore("order", {
  state: () => ({
    purchaseOrders: {
      list: [] as any,
      total: 0,
    },
    current: {
      orderId: "",
      externalOrderId: "",
      orderStatusId: "",
      orderStatusDesc: "",
      items: [] as any,
      poHistory: {
        items: [] as any,
      },
    },
  }),
  getters: {
    getPurchaseOrders: (state) => state.purchaseOrders.list,
    getPurchaseOrdersTotal: (state) => state.purchaseOrders.total,
    isScrollable: (state) => state.purchaseOrders.list.length > 0 && state.purchaseOrders.list.length < state.purchaseOrders.total,
    getCurrent: (state) => state.current,
    isProductAvailableInOrder: (state) => (productId: string) => state.current.items.some((item: any) => item.productId === productId),
    getPOHistory: (state) => state.current.poHistory,
    getPOItemAccepted: (state) => {
      // Memoize PO history items accepted quantity to optimize lookups in lists.
      const acceptedMap = state.current.poHistory.items?.reduce((acc: any, item: any) => {
        acc[item.productId] = (acc[item.productId] || 0) + (Number(item.quantityAccepted) || 0);
        return acc;
      }, {}) || {};
      return (productId: string) => acceptedMap[productId] || 0;
    },
  },
  actions: {
    async findPurchaseOrders(payload: any) {
      const start = (payload.limit || 0) * (payload.pageIndex || 0)
      if (start == 0) emitter.emit("presentLoader");
      let resp: any;
      try {
        resp = await api({
          url: "oms/purchaseOrders",
          method: "GET",
          params: payload
        })

        if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.orders?.length > 0) {
          let orders = resp.data.orders;

          if (start > 0) orders = this.purchaseOrders.list.concat(orders);
          this.purchaseOrders = {
            list: orders,
            total: resp.data.totalOrdersCount,
          };
        } else {
          start
            ? commonUtil.showToast(translate("Purchase orders not found"))
            : (this.purchaseOrders = { list: [], total: 0 });
        }
      } catch (error) {
        console.error(error);
        commonUtil.showToast(translate("Something went wrong"));
      }
      if (start == 0) emitter.emit("dismissLoader");
      return resp;
    },

    async updateProductCount(payload: any) {
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
        if (item.orderItemStatusId === "ITEM_COMPLETED") return { isCompleted: true };

        item.quantityAccepted = item.quantityAccepted ? parseInt(item.quantityAccepted) + 1 : 1;
        return { isProductFound: true };
      }

      return { isProductFound: false };
    },

    async addOrderItem(payload: any) {
      const product = {
        ...payload,
        quantityAccepted: 0,
        quantityOrdered: 0,
      };
      this.current.items.push(product);
    },

    async getOrderDetail({ orderId }: { orderId: string }) {
      let resp: any;

      try {
        resp = await api({
          url: `oms/purchaseOrders/${orderId}`,
          method: "GET"
        })

        if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data?.order) {
          const order = resp.data.order
          order.items.forEach((product: any) => {
            product.quantityAccepted = 0;
          });
          const product = useProduct();
          product.fetchProductInformation({ order: order.items });
          this.current = {
            orderId: order.orderId,
            externalOrderId: order.externalId,
            orderStatusId: order.statusId,
            orderStatusDesc: order.orderStatusDesc,
            items: order.items,
            poHistory: { items: [] },
          };
        } else {
          commonUtil.showToast(translate("Something went wrong"));
          this.current = {
            orderId,
            externalOrderId: "",
            orderStatusId: "",
            orderStatusDesc: "",
            items: [],
            poHistory: { items: [] },
          };
        }
      } catch (error) {
        commonUtil.showToast(translate("Something went wrong"));
        this.current = {
          orderId,
          externalOrderId: "",
          orderStatusId: "",
          orderStatusDesc: "",
          items: [],
          poHistory: { items: [] },
        };
      }
      return resp;
    },

    async createPurchaseShipment(payload: any) {
      let resp: any;
      try {
        const params = {
          orderId: payload.orderId,
          facilityId: useProductStore().getCurrentFacility.facilityId,
        };

        resp = await api({
          url: "/service/createPurchaseShipment",
          method: "POST",
          baseURL: commonUtil.getOmsURL(),
          data: params,
        });

        if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.shipmentId) {
          const shipmentId = resp.data.shipmentId;
          const shipmentStore = useShipmentStore();

          await Promise.all(
            payload.items.map((item: any, index: number) => {
              const shipmentItemSeqId = `0000${index + 1}`;
              return shipmentStore.addShipmentItem({ item, shipmentId, shipmentItemSeqId, orderId: params.orderId });
            })
          ).then(async (resp) => {
            resp.map((response: any) => {
              payload.items.map((item: any) => {
                if (item.productId === response.data.productId) {
                  item.itemSeqId = response.data.shipmentItemSeqId;
                }
              });
            });

            const poShipment = {
              shipmentId,
              items: payload.items,
              isMultiReceivingEnabled: true,
            };
            await shipmentStore.receiveShipment(poShipment).catch((err) => console.error(err));
          });
        } else {
          commonUtil.showToast(translate("Something went wrong"));
        }
      } catch (error) {
        console.error(error);
        commonUtil.showToast(translate("Something went wrong"));
      }
      return resp;
    },

    async createAndReceiveIncomingShipment(payload: any) {
      let resp: any;
      try {
        const params = {
          orderId: payload.orderId,
          facilityId: useProductStore().getCurrentFacility.facilityId,
          items: payload.items,
        };
        resp = await api({
          url: `oms/purchaseOrders/${payload.orderId}/receive`,
          method: "POST",
          data: params
        });

        if (resp.status !== 200 || commonUtil.hasError(resp)) {
          commonUtil.showToast(translate("Something went wrong"));
        }
      } catch (error) {
        console.error(error);
        commonUtil.showToast(translate("Something went wrong"));
        return Promise.reject(error);
      }
    },

    async fetchPOHistory(payload: any) {
      let resp: any;
      let viewIndex = 0;
      const viewSize = 250;
      let currentPOHistory = [] as Array<any>;
      let locationSeqId = "";
      try {
        const productStore = useProductStore();
        const facilityLocations = await productStore.getFacilityLocations(useProductStore().getCurrentFacility.facilityId);
        locationSeqId = facilityLocations.length > 0 ? facilityLocations[0].locationSeqId : "";

        do {
          resp = await api({
            url: `oms/purchaseOrders/${payload.orderId}/receipts`,
            method: "GET",
            params: {
              pageSize: viewSize,
              pageIndex: viewIndex,
              orderId: payload.orderId,
              orderByField: "datetimeReceived DESC"
            },
          });
          if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.length > 0) {
            currentPOHistory = [...currentPOHistory, ...resp.data];
          }
          viewIndex++;
        } while (resp?.data?.length >= viewSize);
      } catch (error) {
        console.error(error);
        currentPOHistory = [];
        this.current.poHistory.items = [];
      }

      this.current.poHistory.items = currentPOHistory;
      if (this.current.poHistory.items.length) {
        const receiversLoginIds = [
          ...new Set(this.current.poHistory.items.map((item: any) => item.receivedByUserLoginId)),
        ];
        const partyStore = usePartyStore();
        const receiversDetails = await partyStore.getReceiversDetails(receiversLoginIds);
        this.current.poHistory.items.map((item: any) => {
          item.receiversFullName = receiversDetails[item.receivedByUserLoginId]?.fullName || item.receivedByUserLoginId;
        });
      }

      const facilityLocationByProduct = this.current.poHistory.items.reduce((products: any, item: any) => {
        products[item.productId] = item.locationSeqId;
        return products;
      }, {});

      this.current.items.forEach((item: any) => {
        item.locationSeqId = facilityLocationByProduct[item.productId] ? facilityLocationByProduct[item.productId] : locationSeqId;
      });

      return resp;
    },
    async updatePOItemStatus(payload: any) {
      return api({
        url: "service/changeOrderItemStatus",
        method: "POST",
        baseURL: commonUtil.getOmsURL(),
        data: payload,
      });
    },
    setItemLocationSeqId(payload: any) {
      const item = this.current.items.find((item: any) => item.orderItemSeqId === payload.item.orderItemSeqId);
      if (item) {
        item.locationSeqId = payload.locationSeqId;
      }
    },
    updateCurrentOrder(payload: any) {
      this.current = payload;
    },
    clearPurchaseOrders() {
      this.purchaseOrders = {
        list: [],
        total: 0,
      };
    },
    updatePurchaseOrders(payload: any) {
      this.purchaseOrders = {
        list: payload.purchaseOrders,
        total: payload.total ? payload.total : this.purchaseOrders.total,
      };
    },
  },
  persist: true,
});
