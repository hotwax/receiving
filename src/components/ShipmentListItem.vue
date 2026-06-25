<template>
  <ion-item :data-testid="`shipment-list-item-row-${shipment.shipmentId}`" button @click="viewShipment()">
    <ion-label>
      <p class="overline" v-show="shipment.externalOrderId || shipment.externalOrderName">{{ shipment.externalOrderName ? shipment.externalOrderName : shipment.externalOrderId }}</p>
      <h2>{{ shipment.externalId ? shipment.externalId : shipment.shipmentId }}</h2>
      <p v-if="shipment.shipmentItemCount">{{ shipment.shipmentItemCount }} {{ (shipment.shipmentItemCount > 1 ? 'Items' : 'Item') }}</p>
    </ion-label>
    <ion-label class="ion-text-end" slot="end">
      <p>{{ shipment.estimatedArrivalDate ? formatDate(shipment.estimatedArrivalDate) : shipment.statusDesc }}</p>
      <p class="overline"> {{ shipment.trackingIdNumber }}</p>
    </ion-label>
  </ion-item>
</template>

<script setup lang="ts">
import { IonItem, IonLabel } from '@ionic/vue';
import router from '@/router';
import { useShipmentStore } from '@/store/shipment';
import { getCurrentInstance } from 'vue';

const props = defineProps(['shipment']);
const shipmentStore = useShipmentStore();
const instance = getCurrentInstance();
const filters = instance?.appContext.config.globalProperties.$filters;

const formatDate = (value: string) => {
  return filters?.formatDate(value);
};

const viewShipment = async () => {
  shipmentStore.setCurrent({ shipmentId: props.shipment.shipmentId }).then((resp: any) => {
    if (resp?.items) {
      router.push({ path: `/shipment/${props.shipment.shipmentId}` });
    }
  });
};
</script>
