<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button data-testid="returns-page-menu-btn" slot="start" />
        <ion-title>{{ translate("Returns") }}</ion-title>
      </ion-toolbar>

      <div>
        <ion-searchbar data-testid="returns-page-search-input" :placeholder="translate('Search returns')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getReturns()" />

        <ion-segment data-testid="returns-page-segment" v-model="selectedSegment" @ionChange="segmentChanged()">
          <ion-segment-button data-testid="returns-page-open-tab" value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="returns-page-completed-tab" value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>
    <ion-content>
      <main>
        <ReturnListItem v-for="returnShipment in returns" :key="returnShipment.shipmentId" :returnShipment="returnShipment" />

        <div data-testid="returns-page-load-more-section" v-if="returns.length < returnsTotal" class="load-more-action ion-text-center">
          <ion-button data-testid="returns-page-load-more-btn" fill="outline" color="dark" @click="loadMoreReturns()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ translate("Load more returns") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div data-testid="returns-page-empty-state" class="empty-state" v-if="!returns.length && !fetchingReturns">
          <p v-if="showErrorMessage">{{ translate("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ translate("There are no returns to receive")}}</p>
          <ion-button data-testid="returns-page-refresh-btn" fill="outline" color="dark" @click="refreshReturns()">
            <ion-icon :icon="reload" slot="start" />
            {{ translate("Refresh") }}
          </ion-button>
        </div>

        <ion-refresher data-testid="returns-page-refresher" slot="fixed" @ionRefresh="refreshReturns($event)">
          <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
        </ion-refresher>        
      </main>
    </ion-content>
  </ion-page>
</template>
  
<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonLabel, IonMenuButton, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, onIonViewDidEnter } from '@ionic/vue';
import { cloudDownloadOutline, reload } from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'
import ReturnListItem from '@/components/ReturnListItem.vue'
import { translate } from "@common"
import { useProductStore } from '@/store/productStore';
import { useReturnStore } from '@/store/return';
import router from '@/router';

const productStore = useProductStore();
const returnStore = useReturnStore();

const queryString = ref('');
const fetchingReturns = ref(false);
const showErrorMessage = ref(false);
const selectedSegment = ref("open")

const returns = computed(() => returnStore.getReturns);
const returnsTotal = computed(() => returnStore.getReturnsTotal);
const currentFacility = computed(() => productStore.getCurrentFacility);

const getReturns = async (vSize?: any, vIndex?: any) => {
  queryString.value ? (showErrorMessage.value = true) : (showErrorMessage.value = false);
  fetchingReturns.value = true;
  const viewSize = vSize ? vSize : import.meta.env.VITE_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  const payload = {
    destinationFacilityId: (currentFacility.value as any)?.facilityId,
    statusId: "PURCH_SHIP_RECEIVED",
    statusId_not: selectedSegment.value === "open" ? "Y" : "N",
    fieldsToSelect: "shipmentId,externalId,statusId,shopifyOrderName,hcOrderId,trackingCode,destinationFacilityId",
    pageSize: viewSize,
    pageIndex: viewIndex,
    orderByField: "createdDate ASC"
  } as any

  if (queryString.value) {
    payload.keyword = queryString.value
  }
  await returnStore.findReturn(payload);
  fetchingReturns.value = false;
  return Promise.resolve();
};

const loadMoreReturns = () => {
  getReturns(import.meta.env.VITE_VIEW_SIZE, Math.ceil(returns.value.length / (import.meta.env.VITE_VIEW_SIZE as any)));
};

const refreshReturns = async (event?: any) => {
  getReturns().then(() => {
    if (event) event.target.complete();
  })
};

const segmentChanged = () => {
  getReturns();
};

onMounted(() => {
  returnStore.fetchValidReturnStatuses();
});

onIonViewDidEnter(() => {
  const forwardRoute = (router as any).options.history.state.forward as any;
  if (!forwardRoute?.startsWith('/return/')) selectedSegment.value = "open";
  getReturns();
});
</script>

<style scoped>
@media (min-width: 991px) {
  ion-header > div {
    display: flex;
  }
}
</style>
