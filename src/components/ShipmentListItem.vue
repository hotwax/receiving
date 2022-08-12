<template>
  <ion-item button @click="viewShipment()">
    <ion-label>
      <h2>{{ shipment.shipmentId }}</h2>
      <p v-if="shipment.noOfItem">{{ shipment.noOfItem }} {{ (shipment.noOfItem > 1 ? 'Items' : 'Item') }}</p>
    </ion-label>
    <ion-note slot="end">{{ shipment.estimatedArrivalDate && shipment.statusDesc !== "Received"  ? ($filters.formatDate(shipment.estimatedArrivalDate)) : shipment.statusDesc }}</ion-note>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonItem,
  IonLabel,
  IonNote
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';

export default defineComponent({
  name: "ShipmentListItem",
  components: {
    IonItem,
    IonLabel,
    IonNote,
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