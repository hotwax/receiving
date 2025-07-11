<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Transfer Orders") }}</ion-title>
      </ion-toolbar>
      <div>
        <ion-searchbar :placeholder="translate('Search transfer orders')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getTransferOrders()" />

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
        <TransferOrderItem v-for="(order, index) in orders.list" :key="index" :transferOrder="order" />
        <div v-if="orders.list.length" class="load-more-action ion-text-center">
          <ion-button fill="outline" color="dark" @click="loadMoreOrders()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ translate("Load more transfer order") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div class="empty-state" v-if="!orders.total && !fetchingOrders">
          <p v-if="showErrorMessage">{{ translate("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ translate("There are no transfer orders to receive")}}</p>
          <ion-button fill="outline" color="dark" @click="refreshTransferOrders()">
            <ion-icon :icon="reload" slot="start" />
            {{ translate("Refresh") }}
          </ion-button>
        </div>

        <ion-refresher slot="fixed" @ionRefresh="refreshTransferOrders($event)">
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
import TransferOrderItem from '@/components/TransferOrderItem.vue'
import { translate, useUserStore } from "@hotwax/dxp-components"
import emitter from '@/event-bus';

export default defineComponent({
  name: 'TransferOrders',
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
    TransferOrderItem
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
      orders: 'transferorder/getTransferOrders',
      isScrollable: 'order/isScrollable',
    })
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
        limit,
        pageIndex,
        orderName: this.queryString
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
    }
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
      reload,
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