<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Purchase Orders") }}</ion-title>
      </ion-toolbar>
      <div>
        <ion-searchbar :placeholder="translate('Search purchase orders')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getPurchaseOrders()" />

        <ion-segment v-model="selectedSegment" @ionChange="segmentChanged()">
          <ion-segment-button value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>
    <ion-content>
      <main>
        <PurchaseOrderItem v-for="(order, index) in orders" :key="index" :purchaseOrder="order.doclist.docs[0]" />
        
        <div v-if="orders.length < ordersTotal" class="load-more-action ion-text-center">
          <ion-button fill="outline" color="dark" @click="loadMoreOrders()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ translate("Load more purchase order") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div class="empty-state" v-if="!orders.length && !fetchingOrders">
          <p v-if="showErrorMessage">{{ translate("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ translate("There are no purchase orders to receive")}}</p>
          <ion-button fill="outline" color="dark" @click="refreshPurchaseOrders()">
            <ion-icon :icon="reload" slot="start" />
            {{ translate("Refresh") }}
          </ion-button>
        </div>

        <ion-refresher slot="fixed" @ionRefresh="refreshPurchaseOrders($event)">
          <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
        </ion-refresher>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { cloudDownloadOutline, reload } from 'ionicons/icons'
import { defineComponent, computed } from 'vue';
import { mapGetters, useStore } from 'vuex';
import PurchaseOrderItem from '@/components/PurchaseOrderItem.vue'
import { translate, useUserStore } from "@hotwax/dxp-components"
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'PurchaseOrders',
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonIcon, 
    IonLabel,
    IonMenuButton,
    IonPage,
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
      selectedSegment: "open"
    }
  },
  computed: {
    ...mapGetters({
      orders: 'order/getPurchaseOrders',
      ordersTotal:'order/getPurchaseOrdersTotal',
      isScrollable: 'order/isScrollable',
    })
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
            "group.limit": 10000,
            "group.ngroups": true,
          } as any,
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
        Math.ceil(this.orders.length / process.env.VUE_APP_VIEW_SIZE)
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