<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Purchase Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div>
        <ion-searchbar :placeholder="$t('Search')" v-model="queryString" @keyup.enter="getPurchaseOrder()" />
      </div>
      <PurchaseOrderItem v-for="(order, index) in orders" :key="index" :purchaseOrder="order" />
      
      <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" id="infinite-scroll" :disabled="!isScrolleable">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonContent, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import PurchaseOrderItem from '@/components/PurchaseOrderItem.vue'

export default defineComponent({
  name: 'PurchaseOrders',
  components: {
    IonContent,
    IonHeader,
    IonInfiniteScroll, 
    IonInfiniteScrollContent,
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
      orders: 'purchaseOrder/getPurchaseOrders',
      isScrolleable: 'purchaseOrder/isScrolleable'
    })
  },
  methods: {
    async getPurchaseOrder(vSize?: any, vIndex?: any){
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      const paylaod = {
        "json": {
          "params": {
            "rows": viewSize,
            "start": viewSize * viewIndex,
            "group": true,
            "group.field": "orderId",
            "group.limit": 10000,
            "group.ngroups": true,
            "defType": "edismax",
            "q.op": "AND",
            "qf": "orderId"
          },
          "query": `(*${this.queryString}*) OR "${this.queryString}"^100`,
          "filter": `docType: ORDER AND orderTypeId: PURCHASE_ORDER`
        }
      }
      this.store.dispatch('purchaseOrder/findPurchaseOrders', paylaod);
    },
    async loadMoreOrders(event: any) {
      console.log(this.orders)
      this.getPurchaseOrder(
        undefined,
        Math.ceil(this.orders.length / process.env.VUE_APP_VIEW_SIZE)
      ).then(() => event.target.complete());
    }
  },
  mounted () {
    this.getPurchaseOrder();
  },
  setup () {
    const store = useStore();

    return {
      store
    }
  }
});
</script>

<style scoped>
</style>