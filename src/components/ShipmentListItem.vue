<template>
  <ion-item button @click="viewShipment()">
    <ion-label>
      <p class="overline" v-show="shipment.externalOrderId || shipment.externalOrderName">{{ shipment.externalOrderName ? shipment.externalOrderName : shipment.externalOrderId }}</p>
      <h2>{{ shipment.externalId ? shipment.externalId : shipment.shipmentId }}</h2>
      <p v-if="shipment.shipmentItemCount">{{ shipment.shipmentItemCount }} {{ (shipment.shipmentItemCount > 1 ? 'Items' : 'Item') }}</p>
    </ion-label>
    <ion-label class="ion-text-end" slot="end">
      <p class="overline"> {{ shipment.trackingIdNumber }}</p>
      <p>{{ shipment.estimatedArrivalDate ? ($filters.formatDate(shipment.estimatedArrivalDate)) : shipment.statusDesc }}</p>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonItem,
  IonLabel
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';

export default defineComponent({
  name: "ShipmentListItem",
  components: {
    IonItem,
    IonLabel,

  },
  props: ["shipment"],
  methods: {
    async viewShipment () {
      this.store.dispatch('shipment/setCurrent', { shipmentId: this.shipment.shipmentId }).then((resp) => {
        if (resp.items) {
          this.router.push({ path: `/shipment/${this.shipment.shipmentId}` });
        }
      });
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