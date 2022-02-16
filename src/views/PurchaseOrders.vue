<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Purchase Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-searchbar :placeholder="$t('Search')" v-model="queryString" @keyup.enter="getPurchaseOrders()" />
      <PurchaseOrderItem v-for="(order, index) in orders" :key="index" :purchaseOrder="order.doclist.docs[0]" />
      
      <div class="ion-text-center">
        <ion-button fill="outline" color="dark" @click="loadMoreOrders()">
          <ion-icon :icon="cloudDownloadOutline" slot="start" />
          {{ $t("Load more purchase order") }}
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { cloudDownloadOutline } from 'ionicons/icons'
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import PurchaseOrderItem from '@/components/PurchaseOrderItem.vue'

export default defineComponent({
  name: 'PurchaseOrders',
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonIcon, 
    IonPage,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    PurchaseOrderItem
  },
  data() {
    return {
      queryString: ''
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
          "filter": `docType: ORDER AND orderTypeId: PURCHASE_ORDER AND facilityId: ${this.currentFacility.facilityId}`
        }
      }
      if(this.queryString) {
        payload.json.query = '*' + this.queryString + '*';
        payload.json.params.defType = "edismax";
        payload.json.params.qf = "orderId";
        payload.json.params['q.op'] = "AND";
      }
      this.store.dispatch('order/findPurchaseOrders', payload);
    },
    async loadMoreOrders() {
      this.getPurchaseOrders(
        undefined,
        Math.ceil(this.orders.length / process.env.VUE_APP_VIEW_SIZE)
      );
    }
  },
  mounted () {
    this.getPurchaseOrders();
  },
  setup () {
    const store = useStore();

    return {
      cloudDownloadOutline,
      store
    }
  }
});
</script>

<style scoped>
</style>