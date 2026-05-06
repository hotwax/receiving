<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button data-testid="transfer-orders-page-menu-btn" slot="start" />
        <ion-title>{{ translate("Transfer Orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button data-testid="transfer-orders-page-sort-btn" id="transfer-sort-popover-trigger">
            <ion-icon slot="icon-only" :icon="swapVerticalOutline" />
          </ion-button>
        </ion-buttons>
        <ion-popover data-testid="transfer-orders-page-sort-popover" trigger="transfer-sort-popover-trigger" trigger-action="click" :dismiss-on-select="true">
          <ion-content>
            <ion-list>
              <ion-radio-group :value="sortOption">
                <ion-item lines="none" button @click="sortOption = 'orderDate desc'; getTransferOrders()">
                  <ion-label>{{ translate("Newest First") }}</ion-label>
                  <ion-radio slot="end" value="orderDate desc" />
                </ion-item>
                <ion-item lines="none" button @click="sortOption = 'orderDate asc'; getTransferOrders()">
                  <ion-label>{{ translate("Oldest First") }}</ion-label>
                  <ion-radio slot="end" value="orderDate asc" />
                </ion-item>
              </ion-radio-group>
            </ion-list>
          </ion-content>
        </ion-popover>
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
        <TransferOrderItem v-for="(order, index) in sortedOrders" :key="index" :transferOrder="order" />
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
import { cloudDownloadOutline, notificationsOutline, reload, swapVerticalOutline } from 'ionicons/icons'
import { defineComponent, computed } from 'vue';
import { mapGetters, useStore } from 'vuex';
import TransferOrderItem from '@/components/TransferOrderItem.vue'
import { translate, useUserStore } from "@hotwax/dxp-components"
import emitter from '@/event-bus';

export default defineComponent({
  name: 'TransferOrders',
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
    TransferOrderItem
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
      orders: 'transferorder/getTransferOrders',
      isScrollable: 'order/isScrollable',
      notifications: 'user/getNotifications',
      unreadNotificationsStatus: 'user/getUnreadNotificationsStatus'
    }),
    sortedOrders() {
      const isAscending = this.sortOption.endsWith('asc');
      return [...(this as any).orders.list].sort((firstOrder: any, secondOrder: any) => {
        const firstTimestamp = firstOrder.orderDate || 0;
        const secondTimestamp = secondOrder.orderDate || 0;

        if (firstTimestamp && secondTimestamp) {
          return isAscending ? firstTimestamp - secondTimestamp : secondTimestamp - firstTimestamp;
        }
        if (firstTimestamp) return isAscending ? 1 : -1;
        if (secondTimestamp) return isAscending ? -1 : 1;
        
        const idCompare = (secondOrder.orderId || "").localeCompare(firstOrder.orderId || "", undefined, { numeric: true });
        return isAscending ? -idCompare : idCompare;
      });
    }
  },
  methods: {
    async getTransferOrders(vSize?: any, vIndex?: any){
      this.queryString ? this.showErrorMessage = true : this.showErrorMessage = false;
      this.fetchingOrders = true;
      const limit = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const pageIndex = vIndex ? vIndex : 0;

      let orderStatusId;
      if (this.selectedSegment === 'open') {
        orderStatusId = 'ORDER_APPROVED';
      } else {
        orderStatusId = 'ORDER_COMPLETED';
      }

      const payload = {
        orderStatusId,
        destinationFacilityId: this.currentFacility?.facilityId,
        excludeOriginFacilityIds: "REJECTED_ITM_PARKING",
        statusFlowId: ["TO_Fulfill_And_Receive", "TO_Receive_Only"],
        limit,
        pageIndex,
        orderBy: this.sortOption,
        orderName: this.queryString?.trim() || undefined,
        keyword: this.queryString?.trim() || undefined
      };

      emitter.emit('presentLoader');
      await this.store.dispatch('transferorder/fetchTransferOrders', payload);
      emitter.emit('dismissLoader');
      this.fetchingOrders = false;
      return Promise.resolve();
    },
    async loadMoreOrders() {
      const limit = process.env.VUE_APP_VIEW_SIZE;
      const pageIndex = Math.ceil(this.orders.list.length / limit);
      await this.getTransferOrders(limit, pageIndex);
    },
    async refreshTransferOrders(event?: any) {
      this.getTransferOrders().then(() => {
        if (event) event.target.complete();
      })
    },
    segmentChanged() {
      this.getTransferOrders();
    },
    viewNotifications() {
      this.store.dispatch('user/setUnreadNotificationsStatus', false)
      this.$router.push({ path: '/notifications' })
    },
  },
  async ionViewWillEnter () {
    await this.getTransferOrders();
  },
  setup () {
    const store = useStore();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      cloudDownloadOutline,
      currentFacility,
      notificationsOutline,
      reload,
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
