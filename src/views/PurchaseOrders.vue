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
      <PurchaseOrderItem />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonContent, IonHeader, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
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
  mounted () {
    this.store.dispatch('purchaseOrder/findPurchaseOrders');
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