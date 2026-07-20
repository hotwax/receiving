<template>
  <ion-item :data-testid="`transfer-order-list-item-row-${transferOrder.orderId}`" :detail="true" button @click="getOrderDetail(transferOrder.orderId)">
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

<script setup lang="ts">
import router from '@/router';
import { IonItem, IonLabel } from '@ionic/vue';
import { DateTime } from 'luxon';

defineProps(["transferOrder"]);


const getOrderDetail = (orderId: string) => {
  router.push({ path: `/transfer-order-detail/${orderId}` })
};

const getTime = (time: any) => {
  return DateTime.fromMillis(time).toFormat("dd MMMM yyyy t")
};
</script>
