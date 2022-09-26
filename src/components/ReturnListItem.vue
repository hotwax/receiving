<template>
  <ion-item button @click="viewReturn()">
    <ion-label>
      <h2>{{ returnShipment.shipmentId }}</h2>
      <p>{{ returnShipment.shipmentItemCount }} {{ (returnShipment.shipmentItemCount > 1 ? 'Items' : 'Item') }}</p>
    </ion-label>
    <ion-note slot="end">{{ returnShipment.estimatedArrivalDate ? ($filters.formatDate(returnShipment.estimatedArrivalDate)) : returnShipment.statusDesc }}</ion-note>
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
import { mapGetters, useStore } from 'vuex';

export default defineComponent({
  name: "ReturnListItem",
  components: {
    IonItem,
    IonLabel,
    IonNote,
  },
  props: ["returnShipment"],
  computed: {
    ...mapGetters({
      facilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId',
    }),
  },
  methods: {
    async viewReturn () {
      if(this.returnShipment.destinationFacilityId && !this.facilityLocationsByFacilityId(this.returnShipment.destinationFacilityId)){
        await this.store.dispatch('user/getFacilityLocations', this.returnShipment.destinationFacilityId);
      }      
      this.store.dispatch('return/setCurrent', { shipmentId: this.returnShipment.shipmentId }).then((resp) => {
        if (resp.items) {
          this.router.push({ path: `/return/${this.returnShipment.shipmentId}` });
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