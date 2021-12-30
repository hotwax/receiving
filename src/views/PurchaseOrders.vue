<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Purchase Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div>
        <ion-searchbar :placeholder="$t('Search')" />
      </div>
      <PurchaseOrderItem v-for="(order, index) in orders" :key="index" :purchaseOrder="order" />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonContent, IonHeader, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { mapGetters, useStore } from 'vuex';
import PurchaseOrderItem from '@/components/PurchaseOrderItem.vue'

export default defineComponent({
  name: 'PurchaseOrders',
  components: {
    IonContent,
    IonHeader,
    IonSearchbar,
    IonPage,
    IonTitle,
    IonToolbar,
    PurchaseOrderItem
  },
  computed: {
    ...mapGetters({
      orders: 'purchaseOrder/getPurchaseOrders',
      totalOrders: 'purchaseOrder/getTotalPurchaseOrder'
    })
  },
  methods: {
    async getPurchaseOrder(){
      const paylaod = {
        "json": {
          "params": {
            "rows": 10,
            "group": true,
            "group.field": "orderId",
            "group.limit": 10000
          },
          "query": "docType:ORDER", 
          "filter": [
            "orderTypeId: PURCHASE_ORDER"
          ]
        }
      }
      this.store.dispatch('purchaseOrder/findPurchaseOrders', paylaod);
    }
  },
  mounted () {
    this.getPurchaseOrder();
  },
  setup () {
    const router = useRouter();
    const store = useStore();

    return {
      router,
      store
    }
  }
});
</script>

<style scoped>
</style>