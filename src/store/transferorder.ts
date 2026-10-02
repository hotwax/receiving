import { defineStore } from "pinia";
import { api, commonUtil, translate } from "@common";
import { useProductStore as useProduct } from "@/store/product";
import { useProductStore } from "@/store/productStore";
import { useUserStore } from "@/store/user";
import { liveQuery } from 'dexie';
import { setActiveReceivingOrder, ensureReceivingOrder, ensureReceivingHistory, getReceivingDb, receivingOperations, loadReceivingTracking, submitReceipt } from '@/db/receivingClient';
import { findIdentifierProducts, readDetail, readHistory } from '@/db/receivingQueries';
import { tuple } from '@/db/receivingDatabase';

let detailSubscription: { unsubscribe(): void } | undefined;
let historySubscription: { unsubscribe(): void } | undefined;
let detailGeneration = 0;
const baselineFields = ['statusId', 'quantity', 'totalIssuedQuantity', 'totalReceivedQuantity', 'orderFacilityId'];
const baselineChanged = (a: any, b: any) => baselineFields.some(field => String(a?.[field] ?? 0) !== String(b?.[field] ?? 0));
const itemIdentity = (item: any) => item.itemKey || item.receiptId || tuple('added', item.productId);

export const useTransferOrderStore = defineStore("transferorder", {
  state: () => ({
    transferOrder: {
      list: [] as any,
      total: 0,
      query: {
        viewIndex: 0,
        viewSize: import.meta.env.VITE_VIEW_SIZE || 10,
        queryString: "",
        selectedShipmentMethods: [] as Array<string>,
        selectedStatuses: [] as Array<string>,
      },
    },
    current: {
      items: [] as any,
      toHistory: {
        items: [] as any,
      },
    } as any,
    misShippedItems: [] as any,
    draftScope: '',
    draftsByScope: {} as Record<string, any[]>,
    baseline: [] as any[],
  }),
  getters: {
    getTransferOrders: (state) => state.transferOrder,
    getCurrent: (state) => state.current,
    getTOHistory: (state) => state.current.toHistory,
    isProductAvailableInOrder: (state) => (productId: string) => state.current.items.some((item: any) => item.productId === productId),
    getMisShippedItems: (state) => state.misShippedItems,
  },
  actions: {
    saveLocalDraft() {
      if (!this.draftScope) return;
      this.draftsByScope[this.draftScope] = [...(this.current.items || []), ...(this.current.missingDrafts || [])].filter((item: any) => !item.receiptId && (item.quantityAccepted !== undefined || item.isChecked === true || !item.orderItemSeqId))
        .map((item: any) => {
          item._draftBaseline ||= this.baseline.find(row => row.orderItemSeqId === item.orderItemSeqId);
          return { ...item, baseline: item._draftBaseline };
        });
    },
    applyLocalDetail(detail: any, scope: string) {
      if (!detail?.ready) return;
      if (scope === this.draftScope) this.saveLocalDraft();
      const drafts = this.draftsByScope[scope] || [];
      const oldItems = new Map((scope === this.draftScope ? this.current.items || [] : []).map((row: any) => [itemIdentity(row), row]));
      let conflict = false;
      const missingDrafts: any[] = [];
      const items = detail.items.map((row: any) => {
        const draft = drafts.find(item => itemIdentity(item) === itemIdentity(row));
        if (draft?.baseline && baselineChanged(draft.baseline, row)) conflict = true;
        const existing: any = oldItems.get(itemIdentity(row)) || {};
        return Object.assign(existing, row, draft ? { quantityAccepted: draft.quantityAccepted, isChecked: draft.isChecked, _draftBaseline: draft.baseline } : {});
      });
      for (const draft of drafts) {
        if (!draft.orderItemSeqId && !draft.receiptId && !items.some((row: any) => itemIdentity(row) === itemIdentity(draft))) {
          items.push(Object.assign(oldItems.get(itemIdentity(draft)) || {}, draft));
        }
        else if (draft.orderItemSeqId && !items.some((row: any) => row.orderItemSeqId === draft.orderItemSeqId)) {
          conflict = true;
          missingDrafts.push(draft);
        }
      }
      const products = useProduct();
      for (const product of detail.products) products.cached[product.productId] = product;
      const { products: _products, ...header } = detail;
      this.baseline = detail.items.filter((row: any) => row.orderItemSeqId).map((row: any) => ({ ...row }));
      this.current = { ...header, items, missingDrafts, cacheConflict: conflict, toHistory: this.current.toHistory || { items: [] } };
      this.draftScope = scope;
    },
    acknowledgeLocalChanges() {
      this.current.cacheConflict = false;
      this.current.missingDrafts = [];
      for (const item of this.current.items || []) delete item._draftBaseline;
      this.saveLocalDraft();
    },
    async openLocalDetail(orderId: string, facilityId: string) {
      this.closeLocalDetail();
      this.current = { items: [], toHistory: { items: [] } };
      this.draftScope = '';
      const generation = ++detailGeneration;
      const db = await getReceivingDb();
      const scope = tuple(db.name, facilityId, orderId);
      const operations = receivingOperations.value;
      const snapshot = await readDetail(db, orderId, facilityId, operations);
      if (generation !== detailGeneration) return;
      void setActiveReceivingOrder(orderId).catch(() => undefined);
      this.applyLocalDetail(snapshot, scope);
      detailSubscription = liveQuery(() => readDetail(db, orderId, facilityId, operations)).subscribe({
        next: detail => { if (generation === detailGeneration) this.applyLocalDetail(detail, scope); },
        error: () => { if (generation === detailGeneration) this.current.cacheError = 'Unable to read saved transfer data.'; },
      });
      historySubscription = liveQuery(() => readHistory(db, orderId, facilityId)).subscribe({
        next: history => { if (generation === detailGeneration) this.current.toHistory = history; },
        error: () => { if (generation === detailGeneration) this.current.toHistory = { items: [], error: 'Unable to load receiving history.' }; },
      });
      const refresh = ensureReceivingOrder(orderId);
      if (!snapshot?.ready || !snapshot?.shipmentsReady) await refresh;
      else void refresh.catch(() => undefined);
      // Warm navigation is a local read. The background worker owns freshness and polling.
      if (generation === detailGeneration && (!snapshot?.ready || !snapshot?.shipmentsReady)) this.applyLocalDetail(await readDetail(db, orderId, facilityId, operations), scope);
    },
    closeLocalDetail() {
      void setActiveReceivingOrder().catch(() => undefined);
      this.saveLocalDraft();
      detailGeneration++;
      detailSubscription?.unsubscribe(); historySubscription?.unsubscribe();
      detailSubscription = undefined; historySubscription = undefined;
    },
    async fetchTransferOrders(params: any = {}) {
      let resp;
      const transferOrderQuery = JSON.parse(JSON.stringify(this.transferOrder.query));
      let orders = [];
      let total = 0;

      try {
        const tracking = params.keyword?.trim();
        const packages = tracking ? await (await getReceivingDb()).table('transferPackages').where('[facilityId+trackingCode]').equals([params.destinationFacilityId, tracking]).toArray() : [];
        const trackingIds = [...new Set(packages.map(row => row.orderId))];
        if (trackingIds.length && params.orderStatusId === 'ORDER_COMPLETED') {
          const matched = new Map<string, any>();
          for (const orderId of trackingIds) {
            const result = await api({ url: 'oms/transferOrders/', method: 'get',
              params: { ...params, orderId, orderName: undefined, keyword: undefined, pageIndex: 0 } });
            if (commonUtil.hasError(result)) throw new Error('Unable to search tracking');
            for (const order of result.data.orders) matched.set(order.orderId, order);
          }
          resp = { data: { orders: [...matched.values()], ordersCount: matched.size } };
        } else {
          resp = await api({ url: 'oms/transferOrders/', method: 'get', params });
        }
        if (!commonUtil.hasError(resp) && resp.data.orders.length > 0) {
          total = resp.data.ordersCount;
          if (params.pageIndex && params.pageIndex > 0) {
            orders = this.transferOrder.list.concat(resp.data.orders);
          } else {
            orders = resp.data.orders;
          }
          this.transferOrder = { list: orders, total, query: transferOrderQuery };
          // The archive remains paged on the server; only visible orders hydrate tracking.
          const list = this.transferOrder.list;
          void loadReceivingTracking(orders.map((row: any) => row.orderId)).then(trackingRows => {
            if (this.transferOrder.list !== list) return;
            const byOrder = new Map(trackingRows.map(row => [row.orderId, row.trackingCodes]));
            for (const order of list) order.trackingCodes = byOrder.get(order.orderId) || [];
          }).catch(() => undefined);
        } else {
          if (params.pageIndex && params.pageIndex > 0) {
            commonUtil.showToast(translate("Transfer orders not found"));
          } else {
            this.transferOrder = { list: [], total: 0, query: transferOrderQuery };
          }
        }
      } catch (err) {
        console.error("No transfer orders found", err);
        commonUtil.showToast(translate("Something went wrong"));
        this.transferOrder = { list: [], total: 0, query: transferOrderQuery };
      }
      return resp;
    },

    async matchingBarcodeItems(payload: string) {
      const product = useProduct();
      const productStore = useProductStore();
      const barcodeIdentifier = productStore.getBarcodeIdentifierPref || 'internalName';
      const orderId = this.current.orderId;
      const scope = this.draftScope;
      const db = await getReceivingDb();
      const productIds = new Set(await findIdentifierProducts(db, barcodeIdentifier, payload));
      if (this.current.orderId !== orderId || this.draftScope !== scope) return [];
      return this.current.items.filter((item: any) => {
        if (item.orderItemSeqId) return productIds.has(item.productId);
        // Newly added products may not yet have persisted identifiers.
        const data = product.getProduct(item.productId);
        return data[barcodeIdentifier] === payload || data.goodIdentifications?.some((ident: any) =>
          typeof ident === 'string' ? ident === `${barcodeIdentifier}/${payload}` : ident.type === barcodeIdentifier && ident.value === payload);
      });
    },

    async updateProductCount(payload: any, allowedItemKeys?: string[]) {
      if (!this.current.identifiersReady) return { identifiersUnavailable: true };
      const matches = (await this.matchingBarcodeItems(payload)).filter((item: any) =>
        !allowedItemKeys || allowedItemKeys.includes(item.itemKey));
      const openMatches = matches.filter((item: any) => !['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId));
      if (openMatches.length > 1) return { isAmbiguous: true };
      const item = openMatches[0] || matches[0];

      if (item) {
        if (['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId)) return { isCompleted: true };

        item.quantityAccepted = Number(item.quantityAccepted) ? Number(item.quantityAccepted) + 1 : 1;
        return { isProductFound: true, item };
      }

      return { isProductFound: false };
    },

    async addOrderItem(payload: any) {
      const product = {
        ...payload,
        quantityAccepted: 0,
        quantity: 0,
      };
      this.current.items = [...this.current.items, product];
    },

    async fetchTOHistory({ payload }: { payload: any }) {
      await ensureReceivingHistory(payload.orderId);
      return this.current.toHistory?.items || [];
    },

    async createOrder(payload: any): Promise<any> {
      return api({
        url: "oms/transferOrders",
        method: "post",
        data: payload,
      });
    },

    async receiveTransferOrder(orderId: string, payload: any, options?: { baseline: any[]; preserveOtherDrafts: boolean }) {
      if (this.current.cacheConflict) throw new Error('Review the refreshed transfer quantities before receiving.');
      if (this.current.needsReadback) throw new Error('The previous receipt still needs reconciliation. Check receiving history before receiving again.');
      const scope = this.draftScope;
      const result = await submitReceipt(orderId, payload, options?.baseline || this.baseline);
      const submitted = (item: any) => !options?.preserveOtherDrafts || payload.items.some((row: any) =>
        row.orderItemSeqId === item.orderItemSeqId && row.productId === item.productId);
      if (options?.preserveOtherDrafts) this.draftsByScope[scope] = (this.draftsByScope[scope] || []).filter(item => !submitted(item));
      else delete this.draftsByScope[scope];
      if (scope === this.draftScope) for (const item of this.current.items || []) {
        if (!submitted(item)) continue;
        delete item.quantityAccepted;
        delete item.isChecked;
        delete item._draftBaseline;
      }
      return result;
    },

    clearTransferOrderDetail() {
      this.closeLocalDetail();
      this.draftScope = "";
      this.baseline = [];
      this.current = {
        items: [],
        toHistory: { items: [] },
      };
    },
  },

});
