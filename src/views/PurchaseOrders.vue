<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Purchase Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-searchbar :placeholder="$t('Search')" v-model="queryString" @keyup.enter="getPurchaseOrders()" />
      <PurchaseOrderItem v-for="(order, index) in orders" :key="index" :purchaseOrder="order.doclist.docs[0]" />
      
      <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" id="infinite-scroll" :disabled="!isScrollable">
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
      orders: 'order/getPurchaseOrders',
      isScrollable: 'order/isScrollable'
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
          "filter": 'docType: ORDER AND orderTypeId: PURCHASE_ORDER'
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
    async loadMoreOrders(event: any) {
      this.getPurchaseOrders(
        undefined,
        Math.ceil(this.orders.length / process.env.VUE_APP_VIEW_SIZE)
      ).then(() => event.target.complete());
    }
  },
  mounted () {
    this.getPurchaseOrders();
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