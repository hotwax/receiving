<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button data-testid="transfer-orders-page-menu-btn" slot="start" />
        <ion-title>{{ translate("Transfer Orders") }}</ion-title>
        <!-- <ion-buttons slot="end">
          <ion-button data-testid="notifications-button" @click="viewNotifications()">
            <ion-icon slot="icon-only" :icon="notificationsOutline" :color="(unreadNotificationsStatus && notifications.length) ? 'primary' : ''" />
          </ion-button>
        </ion-buttons> -->
      </ion-toolbar>
      <div>
        <ion-searchbar data-testid="transfer-orders-page-search-input" :placeholder="translate('Search transfer orders')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getTransferOrders()" />

        <ion-segment data-testid="transfer-orders-page-segment" v-model="selectedSegment" @ionChange="segmentChanged()">
          <ion-segment-button data-testid="transfer-orders-page-open-tab" value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="transfer-orders-page-completed-tab" value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>
    <ion-content data-testid="transfer-orders-page-content">
      <main>
        <TransferOrderItem v-for="(order, index) in orders.list" :key="index" :transferOrder="order" />
        <div data-testid="transfer-orders-page-load-more-section" v-if="orders.list.length < orders.total" class="load-more-action ion-text-center">
          <ion-button data-testid="transfer-orders-page-load-more-btn" fill="outline" color="dark" @click="loadMoreOrders()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ translate("Load more transfer order") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div data-testid="transfer-orders-page-empty-state" class="empty-state" v-if="!orders.total && !fetchingOrders">
          <p v-if="showErrorMessage">{{ translate("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ translate("There are no transfer orders to receive")}}</p>
          <ion-button data-testid="transfer-orders-page-refresh-btn" fill="outline" color="dark" @click="refreshTransferOrders()">
            <ion-icon :icon="reload" slot="start" />
            {{ translate("Refresh") }}
          </ion-button>
        </div>

        <ion-refresher data-testid="transfer-orders-page-refresher" slot="fixed" @ionRefresh="refreshTransferOrders($event)">
          <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
        </ion-refresher>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonLabel, IonMenuButton, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { cloudDownloadOutline, reload } from 'ionicons/icons'
import { ref, computed } from 'vue';
import { useTransferOrderStore } from '@/store/transferorder';
import { useUserStore } from '@/store/user';
import TransferOrderItem from '@/components/TransferOrderItem.vue'
import { translate, commonUtil, emitter } from "@common"
import { useProductStore } from '@/store/productStore';

const transferOrderStore = useTransferOrderStore();
const productStore = useProductStore();

const queryString = ref('');
const fetchingOrders = ref(false);
const showErrorMessage = ref(false);
const selectedSegment = ref("open");

const orders = computed(() => transferOrderStore.getTransferOrders);
const currentFacility: any = computed(() => productStore.getCurrentFacility);

const getTransferOrders = async (vSize?: any, vIndex?: any) => {
  queryString.value ? showErrorMessage.value = true : showErrorMessage.value = false;
  fetchingOrders.value = true;
  const limit = vSize ? vSize : import.meta.env.VITE_VIEW_SIZE;
  const pageIndex = vIndex ? vIndex : 0;

  let orderStatusId;
  if (selectedSegment.value === 'open') {
    orderStatusId = 'ORDER_APPROVED';
  } else {
    orderStatusId = 'ORDER_COMPLETED';
  }

  const payload = {
    orderStatusId,
    destinationFacilityId: currentFacility.value?.facilityId,
    excludeOriginFacilityIds: "REJECTED_ITM_PARKING",
    statusFlowId: ["TO_Fulfill_And_Receive", "TO_Receive_Only"],
    limit,
    pageIndex,
    orderName: queryString.value?.trim() || undefined,
    keyword: queryString.value?.trim() || undefined,
    fieldsToSelect: "orderId,orderName,orderExternalId,orderStatusId,orderStatusDesc,facilityId,orderFacilityId,orderDate"
  };

  emitter.emit('presentLoader');
  await transferOrderStore.fetchTransferOrders(payload);
  emitter.emit('dismissLoader');
  fetchingOrders.value = false;
};

const loadMoreOrders = async () => {
  const limit = import.meta.env.VITE_VIEW_SIZE;
  const pageIndex = Math.ceil(orders.value.list.length / limit);
  await getTransferOrders(limit, pageIndex);
};

const refreshTransferOrders = async (event?: any) => {
  getTransferOrders().then(() => {
    if (event) event.target.complete();
  })
};

const segmentChanged = () => {
  getTransferOrders();
};

onIonViewWillEnter(async () => {
  await getTransferOrders();
});
</script>

<style scoped>
@media (min-width: 991px) {
  ion-header > div {
    display: flex;
  }
}
</style>
