<template>
  <ion-item :data-testid="`transfer-order-list-item-row-${transferOrder.orderId}`" :detail="true" button @click="getOrderDetail(transferOrder.orderId)">
    <ion-label>
      {{ transferOrder.orderName }}
      <p>{{ transferOrder.orderExternalId }}</p>
      <p>{{ transferOrder.orderId }}</p>
      <p v-if="transferOrder.itemCount !== undefined">{{ translate('Item count') }}: {{ transferOrder.itemCount }}</p>
      <div v-if="transferOrder.trackingCodes?.length" class="tracking-badges">
        <ion-badge v-for="tracking in transferOrder.trackingCodes" :key="tracking.code"
          :color="tracking.shipped ? 'primary' : 'medium'" :data-testid="`tracking-badge-${tracking.code}`">
          {{ tracking.code }}<template v-if="tracking.status"> ({{ translate(tracking.status) }})</template>
        </ion-badge>
      </div>
    </ion-label>
    <ion-note v-if="transferOrder.orderDate" slot="end">{{ getTime(transferOrder.orderDate) }}</ion-note>
  </ion-item>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IonBadge, IonItem, IonLabel, IonNote } from '@ionic/vue';
import { translate } from '@common/core/i18n';
import { DateTime } from 'luxon';

defineProps(["transferOrder"]);
const router = useRouter();

const getOrderDetail = (orderId: string) => {
  router.push({ path: `/transfer-order-detail/${orderId}` })
};

const getTime = (time: any) => {
  return DateTime.fromMillis(time).toFormat("dd MMMM yyyy t")
};
</script>

<style scoped>
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
