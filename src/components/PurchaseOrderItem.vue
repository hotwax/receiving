<template>
  <ion-item button @click="getOrderDetail(purchaseOrder.orderId)">
    <ion-label>
      <!-- TODO:- Handle this purchase order number property for now i have used OrderName or OrderId -->
      <h3>{{ purchaseOrder.externalOrderId }}</h3>
      <p>{{ purchaseOrder.orderName ? purchaseOrder.orderName : purchaseOrder.orderId }}</p>
    </ion-label>
    <ion-note slot="end">{{ purchaseOrder.estimatedDeliveryDate ? $filters.formatUtcDate(purchaseOrder.estimatedDeliveryDate, 'YYYY-MM-DDTHH:mm:ss') : " - " }}</ion-note>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonItem,
  IonNote,
  IonLabel
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';

export default defineComponent({
  name: "PurchaseOrderItem",
  components: {
    IonItem,
    IonNote,
    IonLabel
  },
  props: ["purchaseOrder"],
  methods: {
    async getOrderDetail(orderId?: any) {
      await this.store.dispatch("order/getOrderDetail", {orderId})
      .then(() => this.router.push({ path: `/purchase-order-detail/${orderId}` }))
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    
    return {
      router,
      store
    }
  },
})
</script>