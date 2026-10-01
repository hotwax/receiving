<template>
  <ion-item :data-testid="`transfer-order-list-item-row-${transferOrder.orderId}`" :detail="true" button @click="getOrderDetail(transferOrder.orderId)">
    <ion-label>
      <div class="transfer-summary">
        <div>
          {{ transferOrder.orderName }}
          <p>{{ transferOrder.orderExternalId }}</p>
          <p>{{ transferOrder.orderId }}</p>
        </div>
        <p v-if="transferOrder.orderDate">{{ getTime(transferOrder.orderDate) }}</p>
      </div>
      <div v-if="transferOrder.trackingCodes?.length" class="tracking-badges">
        <ion-badge v-for="tracking in transferOrder.trackingCodes" :key="tracking.code"
          :color="tracking.shipped ? 'primary' : 'medium'" :data-testid="`tracking-badge-${tracking.code}`">
          {{ tracking.code }}<template v-if="tracking.status"> ({{ translate(tracking.status) }})</template>
        </ion-badge>
      </div>
    </ion-label>
  </ion-item>
</template>

<script setup lang="ts">
import router from '@/router';
import { IonBadge, IonItem, IonLabel } from '@ionic/vue';
import { translate } from '@common';
import { DateTime } from 'luxon';

defineProps(["transferOrder"]);


const getOrderDetail = (orderId: string) => {
  router.push({ path: `/transfer-order-detail/${orderId}` })
};

const getTime = (time: any) => {
  return DateTime.fromMillis(time).toFormat("dd MMMM yyyy t")
};
</script>

<style scoped>
.transfer-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacer-xs);
}
.tracking-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacer-xs);
  margin-block-start: var(--spacer-xs);
}
.tracking-badges ion-badge {
  max-inline-size: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: start;
}
</style>
