import { defineStore } from "pinia";
import { api, commonUtil, emitter, useSolrSearch } from "@common";
import { useShipmentStore } from "@/store/shipment";
import { useProductStore as useFacilityStore } from "@/store/productStore";

export const useProductStore = defineStore("product", {
  state: () => ({
    cached: {} as any,
    list: {
      items: [] as any,
      total: 0,
    },
  }),
  getters: {
    getProduct: (state) => (productId: string) => state.cached[productId] ? state.cached[productId] : {},
    getProducts: (state) => state.list.items,
    isScrollable: (state) => state.list.items.length > 0 && state.list.items.length < state.list.total,
    isProductAvailableInShipment: (state) => (productId: string) => {
      const shipmentStore = useShipmentStore();
      return shipmentStore.getCurrent.items.some((item: any) => item.productId === productId);
    },
  },
  actions: {
    async fetchProducts({ productIds }: { productIds: Array<string> }) {
      const cachedProductIds = Object.keys(this.cached);
      const productIdFilter = productIds.filter((productId: any) => !cachedProductIds.includes(productId));
      const viewSize = productIdFilter.length;
      if (!viewSize) return;

      const resp = await useSolrSearch().searchProducts({
        filters: {
          productId: {
            value: productIdFilter,
            op: "OR",
          },
        },
        viewSize,
      });
      if (resp.total) {
        resp.products.forEach((product: any) => {
          this.cached[product.productId] = product;
        });
      }
      return resp;
    },
    async findProduct(payload: any) {
      let resp;
      if (payload.viewIndex === 0) emitter.emit("presentLoader");
      try {
        resp = await useSolrSearch().searchProducts({
          keyword: payload.queryString,
          viewSize: payload.viewSize,
          viewIndex: payload.viewIndex,
          filters: {},
        });
        if (resp.total) {
          let products = resp.products;
          const total = resp.total;

          if (payload.viewIndex && payload.viewIndex > 0) products = this.list.items.concat(products);
          this.list = { items: products, total };
          products.forEach((product: any) => {
            this.cached[product.productId] = product;
          });
        } else {
          throw resp;
        }
      } catch (error) {
        this.list = { items: [], total: 0 };
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      return resp;
    },
    async getInventoryAvailableByFacility(productId: string) {
      let productQoh = "";
      const payload = {
        productId,
        facilityId: useFacilityStore().getCurrentFacility.facilityId,
      };

      try {
        const resp: any = await api({
          url: "poorti/getInventoryAvailableByFacility",
          method: "GET",
          params: payload,
        });

        if (!commonUtil.hasError(resp)) {
          productQoh = resp?.data.qoh;
        } else {
          throw resp.data;
        }
      } catch (err) {
        console.error(err);
      }

      return productQoh;
    },
    async fetchProductInformation(payload: any) {
      let productIds: any = new Set();
      payload.order.map((item: any) => {
        if (item.productId) productIds.add(item.productId);
      });
      productIds = [...productIds];
      if (productIds.length) {
        this.fetchProducts({ productIds });
      }
    },
    clearSearchedProducts() {
      this.list = { items: [], total: 0 };
    },
  },
  persist: true,
});
