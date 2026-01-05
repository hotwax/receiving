<template>
  <ion-item detail="true" button @click="getOrderDetail(transferOrder.orderId)">
    <ion-label>
      {{ transferOrder.orderName }}
      <p>{{ transferOrder.orderExternalId }}</p>
      <p>{{ transferOrder.orderId }}</p>
    </ion-label>
    <ion-label class="ion-text-end" slot="end">
      <p v-if="transferOrder.orderDate">{{ getTime(transferOrder.orderDate) }}</p>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonItem,
  IonLabel
} from '@ionic/vue'
import { DateTime } from 'luxon';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: "TransferOrderItem",
  components: {
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
      this.router.push({ path: `/transfer-order-detail/${orderId}` })
    },
    getTime(time: any) {
      return DateTime.fromMillis(time).toFormat("dd MMMM yyyy t")
    },
  },
  setup() {
    const router = useRouter();
    
    return {
      router
    }
  },
})
</script>