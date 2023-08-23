<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Purchase Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <ion-searchbar :placeholder="$t('Search purchase orders')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getPurchaseOrders()" />

        <PurchaseOrderItem v-for="(order, index) in orders" :key="index" :purchaseOrder="order.doclist.docs[0]" />
        
        <div v-if="orders.length" class="load-more-action ion-text-center">
          <ion-button fill="outline" color="dark" @click="loadMoreOrders()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ $t("Load more purchase order") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div class="empty-state" v-if="!orders.length && !fetchingOrders">
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ $t("There are no purchase orders to receive")}}</p>
          <ion-button fill="outline" color="dark" @click="refreshPurchaseOrders()">
            <ion-icon :icon="reload" slot="start" />
            {{ $t("Refresh") }}
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
  IonMenuButton,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { cloudDownloadOutline, reload } from 'ionicons/icons'
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import PurchaseOrderItem from '@/components/PurchaseOrderItem.vue'
import { showToast } from '@/utils';
import { translate } from '@/i18n';

export default defineComponent({
  name: 'PurchaseOrders',
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonIcon, 
    IonMenuButton,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    PurchaseOrderItem
  },
  data() {
    return {
      queryString: '',
      fetchingOrders: false
    }
  },
  computed: {
    ...mapGetters({
      orders: 'order/getPurchaseOrders',
      isScrollable: 'order/isScrollable',
      currentFacility: 'user/getCurrentFacility'
    })
  },
  methods: {
    async getPurchaseOrders(vSize?: any, vIndex?: any){
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
          "filter": `docType: ORDER AND orderTypeId: PURCHASE_ORDER AND orderStatusId: (ORDER_APPROVED OR ORDER_CREATED) AND facilityId: ${this.currentFacility.facilityId}`
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
        if(!this.orders.length) showToast(translate("Orders not found"));
      })
    },
  },
  mounted () {
    this.getPurchaseOrders();
  },
  setup () {
    const store = useStore();

    return {
      cloudDownloadOutline,
      reload,
      store
    }
  }
});
</script>