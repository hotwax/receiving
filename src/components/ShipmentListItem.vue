<template>
  <ion-item button @click="viewProduct()">
    <ion-label>
      <h2>{{ product.id }}</h2>
      <p>{{ product.noOfItem }} {{ (product.noOfItem > 1 ? 'Items' : 'Item') }}</p>
    </ion-label>
    <ion-note slot="end">{{ product.estimatedArrivalDate && product.shipmentStatus !== "Received"  ? ($filters.formatDate(product.estimatedArrivalDate)) : product.shipmentStatus }}</ion-note>
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
  props: ["product"],
  methods: {
    async viewProduct () {
       this.store.dispatch('shipment/setCurrentProduct', { shipmentId: this.product.id }).then((resp) => {
        if (resp.items) {
          this.router.push({ path: `/shipment/${this.product.id}` });
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