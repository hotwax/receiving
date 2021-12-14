<template>
  <ion-item button @click="viewShipment()">
    <ion-label>
      <h2>{{ shipment.id }}</h2>
      <p>{{ shipment.noOfItem }} {{ (shipment.noOfItem > 1 ? 'Items' : 'Item') }}</p>
    </ion-label>
    <ion-note slot="end">{{ shipment.estimatedArrivalDate && shipment.shipmentStatus !== "Received"  ? ($filters.formatDate(shipment.estimatedArrivalDate)) : shipment.shipmentStatus }}</ion-note>
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
       this.store.dispatch('shipment/setCurrentShipment', { shipmentId: this.shipment.id }).then((resp) => {
        if (resp.items) {
          this.router.push({ path: `/shipment/${this.shipment.id}` });
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