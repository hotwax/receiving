<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button data-testid="purchase-orders-page-menu-btn" slot="start" />
        <ion-title>{{ translate("Purchase Orders") }}</ion-title>
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
        <PurchaseOrderItem v-for="(order, index) in orders" :key="index" :purchaseOrder="order" />
        
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

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonLabel, IonMenuButton, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { cloudDownloadOutline, reload } from 'ionicons/icons'
import { computed, ref } from 'vue';
import PurchaseOrderItem from '@/components/PurchaseOrderItem.vue'
import { translate } from "@common"
import { useProductStore } from '@/store/productStore';
import { useOrderStore } from '@/store/order';
import router from '@/router';

const productStore = useProductStore();
const orderStore = useOrderStore();

const queryString = ref('');
const fetchingOrders = ref(false);
const showErrorMessage = ref(false);
const selectedSegment = ref("open");

const orders = computed(() => orderStore.getPurchaseOrders);
const ordersTotal = computed(() => orderStore.getPurchaseOrdersTotal);
const currentFacility = computed(() => productStore.getCurrentFacility);

const getPurchaseOrders = async (vSize?: any, vIndex?: any) => {
  queryString.value ? (showErrorMessage.value = true) : (showErrorMessage.value = false);
  fetchingOrders.value = true;
  const viewSize = vSize ? vSize : import.meta.env.VITE_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  const payload = {
    limit: viewSize,
    pageIndex: viewIndex,
    orderStatusId: selectedSegment.value === 'open' ? 'ORDER_APPROVED,ORDER_CREATED' : 'ORDER_COMPLETED',
    facilityId: currentFacility.value?.facilityId,
    keyword: queryString.value
  }

  await orderStore.findPurchaseOrders(payload);
  fetchingOrders.value = false;
};

const loadMoreOrders = async () => {
  getPurchaseOrders(
    undefined,
    Math.ceil(orders.value.length / (import.meta.env.VITE_VIEW_SIZE as any))
  );
};

const refreshPurchaseOrders = async (event?: any) => {
  getPurchaseOrders().then(() => {
    if (event) event.target.complete();
  })
};

const segmentChanged = () => {
  getPurchaseOrders();
};

onIonViewWillEnter(() => {
  const forwardRoute = (router as any).options.history.state.forward as any;
  if (!forwardRoute?.startsWith('/purchase-order-detail/')) selectedSegment.value = "open";
  getPurchaseOrders();
});
</script>

<style scoped>
@media (min-width: 991px) {
  ion-header > div {
    display: flex;
  }
}
</style>
