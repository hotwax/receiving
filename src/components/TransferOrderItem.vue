<template>
  <ion-item button @click="getOrderDetail(transferOrder.orderId)">
    <ion-label>
      <h3>{{ transferOrder.externalOrderId }}</h3>
      <p>{{ transferOrder.orderName ? transferOrder.orderName : transferOrder.orderId }}</p>
    </ion-label>
    <ion-label class="ion-text-end" slot="end">
      <p>{{ transferOrder.estimatedDeliveryDate ? $filters.formatUtcDate(transferOrder.estimatedDeliveryDate, 'YYYY-MM-DDTHH:mm:ssZ') : " - " }}</p>
      <ion-badge :color="orderStatusColor[transferOrder.orderStatusId]">{{ transferOrder.orderStatusDesc }}</ion-badge>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonBadge,
  IonItem,
  IonLabel
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';

export default defineComponent({
  name: "TransferOrderItem",
  components: {
    IonBadge,
    IonItem,
    IonLabel
  },
  props: ["transferOrder"],
  data(){
    return {
      orderStatusColor: {
        ORDER_CREATED: 'medium',
        ORDER_APPROVED: 'primary',
        // ORDER_REJECTED: 'danger', as of now we are not dealing with this status
        ORDER_COMPLETED: 'success'
      }
    }
  },
  methods: {
    async getOrderDetail(orderId?: any) {
      await this.store.dispatch("order/getOrderDetail", {orderId})
      .then(() => this.router.push({ path: `/transfer-order-detail/${orderId}` }))
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