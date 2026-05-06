<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button data-testid="purchase-orders-page-menu-btn" slot="start" />
        <ion-title data-testid="purchase-orders-page-title">{{ translate("Purchase Orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button data-testid="purchase-orders-page-sort-btn" id="sort-popover-trigger">
            <ion-icon slot="icon-only" :icon="swapVerticalOutline" />
          </ion-button>
        </ion-buttons>
        <ion-popover data-testid="purchase-orders-page-sort-popover" trigger="sort-popover-trigger" trigger-action="click" :dismiss-on-select="true">
          <ion-content>
            <ion-list>
              <ion-radio-group :value="sortOption">
                <ion-item lines="none" button @click="sortOption = 'orderDate desc'; getPurchaseOrders()">
                  <ion-label>{{ translate("Newest First") }}</ion-label>
                  <ion-radio slot="end" value="orderDate desc" />
                </ion-item>
                <ion-item lines="none" button @click="sortOption = 'orderDate asc'; getPurchaseOrders()">
                  <ion-label>{{ translate("Oldest First") }}</ion-label>
                  <ion-radio slot="end" value="orderDate asc" />
                </ion-item>
              </ion-radio-group>
            </ion-list>
          </ion-content>
        </ion-popover>
      </ion-toolbar>
      <div>
        <ion-searchbar data-testid="purchase-orders-page-search-input" :placeholder="translate('Search purchase orders')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getPurchaseOrders()" />

        <ion-segment data-testid="purchase-orders-page-segment" v-model="selectedSegment" @ionChange="segmentChanged()">
          <ion-segment-button data-testid="purchase-orders-page-open-tab" value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="purchase-orders-page-completed-tab" value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>
    <ion-content data-testid="purchase-orders-page-content">
      <main>
        <div data-testid="purchase-orders-page-list">
          <PurchaseOrderItem v-for="(order, index) in sortedOrders" :key="index" :purchaseOrder="order.doclist.docs[0]" />
        </div>
        
        <div data-testid="purchase-orders-page-load-more-section" v-if="orders.length < ordersTotal" class="load-more-action ion-text-center">
          <ion-button data-testid="purchase-orders-page-load-more-btn" fill="outline" color="dark" @click="loadMoreOrders()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ translate("Load more purchase order") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div data-testid="purchase-orders-page-empty-state" class="empty-state" v-if="!orders.length && !fetchingOrders">
          <p v-if="showErrorMessage">{{ translate("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ translate("There are no purchase orders to receive")}}</p>
          <ion-button data-testid="purchase-orders-page-refresh-btn" fill="outline" color="dark" @click="refreshPurchaseOrders()">
            <ion-icon :icon="reload" slot="start" />
            {{ translate("Refresh") }}
          </ion-button>
        </div>

        <ion-refresher data-testid="purchase-orders-page-refresher" slot="fixed" @ionRefresh="refreshPurchaseOrders($event)">
          <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
        </ion-refresher>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonPage,
  IonPopover,
  IonRadio,
  IonRadioGroup,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { cloudDownloadOutline, reload, swapVerticalOutline } from 'ionicons/icons'
import { defineComponent, computed } from 'vue';
import { mapGetters, useStore } from 'vuex';
import PurchaseOrderItem from '@/components/PurchaseOrderItem.vue'
import { translate, useUserStore } from "@hotwax/dxp-components"
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'PurchaseOrders',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon, 
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonPage,
    IonPopover,
    IonRadio,
    IonRadioGroup,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    PurchaseOrderItem
  },
  data() {
    return {
      queryString: '',
      fetchingOrders: false,
      showErrorMessage: false,
      selectedSegment: "open",
      sortOption: "orderDate desc"
    }
  },
  computed: {
    ...mapGetters({
      orders: 'order/getPurchaseOrders',
      ordersTotal: 'order/getPurchaseOrdersTotal',
      isScrollable: 'order/isScrollable',
    }),
    sortedOrders() {
      const isAscending = this.sortOption.endsWith('asc');
      return [...(this as any).orders].sort((firstOrder: any, secondOrder: any) => {
        const firstDoc = firstOrder?.doclist?.docs?.[0] || {};
        const secondDoc = secondOrder?.doclist?.docs?.[0] || {};

        const firstDate = firstDoc.estimatedDeliveryDate || firstDoc.createdDate || firstDoc.orderDate || "";
        const secondDate = secondDoc.estimatedDeliveryDate || secondDoc.createdDate || secondDoc.orderDate || "";

        const firstTimestamp = Date.parse(firstDate);
        const secondTimestamp = Date.parse(secondDate);

        if (!Number.isNaN(firstTimestamp) && !Number.isNaN(secondTimestamp)) {
          return isAscending ? firstTimestamp - secondTimestamp : secondTimestamp - firstTimestamp;
        }
        if (!Number.isNaN(firstTimestamp)) return isAscending ? 1 : -1;
        if (!Number.isNaN(secondTimestamp)) return isAscending ? -1 : 1;
        
        const idCompare = (secondDoc.orderId || "").localeCompare(firstDoc.orderId || "", undefined, { numeric: true });
        return isAscending ? -idCompare : idCompare;
      });
    }
  },
  methods: {
    async getPurchaseOrders(vSize?: any, vIndex?: any){
      this.queryString ? this.showErrorMessage = true : this.showErrorMessage = false;
      this.fetchingOrders = true;
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        "json": {
          "params": {
            "rows": viewSize,
            "start": viewSize * viewIndex,
            "group": true,
            "group.field": "orderId",
            "group.sort": this.sortOption,
            "group.limit": 10000,
            "group.ngroups": true,
            "sort": this.sortOption
          } as any,
          "sort": this.sortOption,
          "query": "*:*",
          "filter": `docType: ORDER AND orderTypeId: PURCHASE_ORDER AND orderStatusId: ${this.selectedSegment === 'open' ? '(ORDER_APPROVED OR ORDER_CREATED)' : 'ORDER_COMPLETED'} AND facilityId: ${this.currentFacility?.facilityId}`
        }
      }
      if(this.queryString) {
        payload.json.query = this.queryString;
        payload.json.params.defType = "edismax";
        payload.json.params.qf = "orderId externalOrderId";
        payload.json.params['q.op'] = "AND";
      }
      await this.store.dispatch('order/findPurchaseOrders', payload);
      this.fetchingOrders = false;
      return Promise.resolve();
    },
    async loadMoreOrders() {
      this.getPurchaseOrders(
        undefined,
        Math.ceil((this as any).orders.length / (process.env.VUE_APP_VIEW_SIZE as any))
      );
    },
    async refreshPurchaseOrders(event?: any) {
      this.getPurchaseOrders().then(() => {
        if (event) event.target.complete();
      })
    },
    segmentChanged() {
      this.getPurchaseOrders();
    }
  },
  ionViewWillEnter () {
    const forwardRoute = this.router.options.history.state.forward as any;
    if(!forwardRoute?.startsWith('/purchase-order-detail/')) this.selectedSegment = "open";
    this.getPurchaseOrders();
  },
  setup () {
    const router = useRouter();
    const store = useStore();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      cloudDownloadOutline,
      currentFacility,
      reload,
      router,
      store,
      swapVerticalOutline,
      translate
    }
  }
});
</script>

<style scoped>
@media (min-width: 991px) {
  ion-header > div {
    display: flex;
  }
}
</style>
