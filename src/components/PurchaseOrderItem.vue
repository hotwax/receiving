<template>
  <ion-item :data-testid="`purchase-order-list-item-row-${purchaseOrder.orderId}`" button @click="getOrderDetail(purchaseOrder.orderId)">
    <ion-label>
      <!-- TODO:- Handle this purchase order number property for now i have used OrderName or OrderId -->
      <h3>{{ purchaseOrder.orderExternalId }}</h3>
      <p>{{ purchaseOrder.orderName ? purchaseOrder.orderName : purchaseOrder.orderId }}</p>
    </ion-label>
    <ion-label class="ion-text-end" slot="end">
      <p>{{ purchaseOrder.estimatedDeliveryDate ? formatDate(purchaseOrder.estimatedDeliveryDate) : " - " }}</p>
      <ion-badge :data-testid="`purchase-order-list-item-status-badge-${purchaseOrder.orderId}`" :color="orderStatusColor[purchaseOrder.orderStatusId]">{{ purchaseOrder.orderStatusDesc }}</ion-badge>
    </ion-label>
  </ion-item>
</template>

<script setup lang="ts">
import { IonBadge, IonItem, IonLabel } from '@ionic/vue';
import { useOrderStore } from '@/store/order';
import { getCurrentInstance } from 'vue';
import router from '@/router';

const props = defineProps(["purchaseOrder"]);

const orderStore = useOrderStore();
const instance = getCurrentInstance();
const filters = instance?.appContext.config.globalProperties.$filters;

const orderStatusColor = {
  ORDER_CREATED: 'medium',
  ORDER_APPROVED: 'primary',
  ORDER_REJECTED: 'danger',
  ORDER_COMPLETED: 'success'
} as any;

const formatDate = (value: string) => {
  return filters?.formatUtcDate(value, 'YYYY-MM-DDTHH:mm:ssZ');
}

const getOrderDetail = async (orderId: string) => {
  await orderStore.getOrderDetail({ orderId })
    .then(() => router.push({ path: `/purchase-order-detail/${orderId}` }));
}
</script>
