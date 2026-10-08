<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button data-testid="transfer-orders-page-menu-btn" slot="start" />
        <ion-title>{{ translate("Transfer Orders") }}</ion-title>
        <ion-progress-bar
          v-if="loadingOrders"
          data-testid="transfer-orders-page-progress"
          type="determinate"
          :value="loadingProgress"
          :aria-label="translate('Loading')"
        />
        <!-- <ion-buttons slot="end">
          <ion-button data-testid="notifications-button" @click="viewNotifications()">
            <ion-icon slot="icon-only" :icon="notificationsOutline" :color="(unreadNotificationsStatus && notifications.length) ? 'primary' : ''" />
          </ion-button>
        </ion-buttons> -->
      </ion-toolbar>
      <div>
        <ion-searchbar data-testid="transfer-orders-page-search-input" :placeholder="selectedSegment === 'completed' ? translate('Search completed orders') : translate('Search orders, products or tracking codes')" v-model="queryString" @keyup.enter="submitSearch" />

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
        <ion-item v-if="selectedSegment === 'open' && localSyncError" lines="none">
          <ion-label>{{ localSyncError }}</ion-label>
        </ion-item>
        <TransferOrderItem v-for="order in visibleOrders" :key="order.orderId" :transferOrder="order" />
        <div data-testid="transfer-orders-page-load-more-section" v-if="orders.list.length < orders.total" class="load-more-action ion-text-center">
          <ion-button data-testid="transfer-orders-page-load-more-btn" fill="outline" color="dark" :disabled="fetchingOrders" @click="loadMoreOrders()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ translate("Load more transfer order") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div data-testid="transfer-orders-page-empty-state" class="empty-state" v-if="!orders.total && !fetchingOrders && (selectedSegment !== 'open' || receivingList.sync?.complete)">
          <p v-if="queryString.trim() || showErrorMessage">{{ translate("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p v-if="!queryString.trim()">{{ translate("There are no transfer orders to receive")}}</p>
          <ion-button data-testid="transfer-orders-page-refresh-btn" fill="outline" color="dark" @click="refreshTransferOrders()">
            <ion-icon :icon="reload" slot="start" />
            {{ translate("Refresh") }}
          </ion-button>
        </div>

        <ion-refresher data-testid="transfer-orders-page-refresher" slot="fixed" @ionRefresh="refreshTransferOrders($event)">
          <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
        </ion-refresher>
      </main>

      <ion-fab v-if="userStore.hasPermission(Actions.APP_TRANSFERORDER_CREATE)" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button data-testid="transfer-orders-page-create-order-btn" @click="router.push('/create-order')">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { showToast as utilShowToast } from '@common/utils/core';
import { IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonMenuButton, IonPage, IonProgressBar, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { addOutline, cloudDownloadOutline, reload } from 'ionicons/icons';
import { ref, computed, watch } from 'vue';
import { receivingList, receivingError, searchReceiving, refreshReceiving, resolveReceivingTracking } from '@/db/receivingClient';
import { useRouter } from 'vue-router';
import { useTransferOrderStore } from '@/store/transferorder';
import { useUserStore } from '@/store/user';
import TransferOrderItem from '@/components/TransferOrderItem.vue'
import { translate } from '@common/core/i18n';
import { useProductStore } from '@/store/productStore';
import Actions from "@/authorization/actions"

const router = useRouter();
const transferOrderStore = useTransferOrderStore();
const productStore = useProductStore();
const userStore = useUserStore();

const queryString = ref('');
const fetchingOrders = ref(false);
const completedProgress = ref(0);
let completedRequest = 0;
const showErrorMessage = ref(false);
const selectedSegment = ref("open");

const localLimit = ref(Number(import.meta.env.VITE_VIEW_SIZE) || 20);
const orders = computed(() => selectedSegment.value === 'open' ? receivingList.value : transferOrderStore.getTransferOrders);
// The archive API can repeat an order for different origins. Keep raw rows for
// pagination, but render one keyed row per order.
const visibleOrders = computed(() => [...new Map<string, any>(orders.value.list.map((order: any) => [order.orderId, order] as const)).values()]);
const localSyncError = computed(() => receivingError.value || receivingList.value.sync?.error);
const loadingOrders = computed(() => {
  if (selectedSegment.value === 'completed') return fetchingOrders.value;
  const sync = receivingList.value.sync;
  return !localSyncError.value && (!sync.complete || sync.downloading || sync.syncing);
});
const loadingProgress = computed(() => selectedSegment.value === 'open' ? receivingList.value.sync.progress : completedProgress.value);
const currentFacility: any = computed(() => productStore.getCurrentFacility);
let openingTracking = false;
const submitSearch = async () => {
  if (selectedSegment.value === 'completed') return getTransferOrders();
  if (openingTracking) return;
  const query = queryString.value.trim(), facilityId = currentFacility.value?.facilityId;
  if (!query) return;
  openingTracking = true;
  try {
    const matches = await resolveReceivingTracking(query);
    if (matches.length === 1 && queryString.value.trim() === query &&
        currentFacility.value?.facilityId === facilityId && selectedSegment.value === 'open') {
      await router.push({ path: `/transfer-order-detail/${matches[0]!.orderId}`, query: { tracking: query } });
    }
  } catch { utilShowToast(translate('Unable to look up this tracking code. Refresh to retry.')); }
  finally { openingTracking = false; }
};
watch([queryString, selectedSegment], ([query, segment], [previousQuery]) => {
  localLimit.value = Number(import.meta.env.VITE_VIEW_SIZE) || 20;
  if (!query.trim()) showErrorMessage.value = false;
  if (segment === 'open') void searchReceiving(query, localLimit.value).catch(() => undefined);
  else if (!query.trim() && previousQuery.trim()) void getTransferOrders();
});

const getTransferOrders = async (vSize?: any, vIndex?: any) => {
  if (selectedSegment.value === 'open') {
    await searchReceiving(queryString.value, localLimit.value);
    return;
  }
  queryString.value ? showErrorMessage.value = true : showErrorMessage.value = false;
  fetchingOrders.value = true;
  completedProgress.value = 0;
  const request = ++completedRequest;
  const limit = vSize ? vSize : import.meta.env.VITE_VIEW_SIZE;
  const pageIndex = vIndex ? vIndex : 0;

  const payload = {
    orderStatusId: 'ORDER_COMPLETED',
    destinationFacilityId: currentFacility.value?.facilityId,
    excludeOriginFacilityIds: "REJECTED_ITM_PARKING",
    statusFlowId: ["TO_Fulfill_And_Receive", "TO_Receive_Only"],
    limit,
    pageIndex,
    keyword: queryString.value?.trim() || undefined,
    fieldsToSelect: "orderId,orderName,orderExternalId,orderStatusId,orderStatusDesc,facilityId,orderFacilityId,orderDate"
  };

  try {
    await transferOrderStore.fetchTransferOrders(payload, (completed, total) => {
      if (request === completedRequest) completedProgress.value = completed / total;
    });
  } finally {
    if (request === completedRequest) fetchingOrders.value = false;
  }
};

const loadMoreOrders = async () => {
  if (selectedSegment.value === 'open') {
    localLimit.value += Number(import.meta.env.VITE_VIEW_SIZE) || 20;
    await searchReceiving(queryString.value, localLimit.value);
    return;
  }
  const limit = import.meta.env.VITE_VIEW_SIZE;
  const pageIndex = Math.ceil(orders.value.list.length / limit);
  await getTransferOrders(limit, pageIndex);
};

const refreshTransferOrders = async (event?: any) => {
  try {
    if (selectedSegment.value === 'open') await refreshReceiving();
    else await getTransferOrders();
  } finally { event?.target.complete(); }
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
