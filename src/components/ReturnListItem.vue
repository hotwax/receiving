<template>
  <ion-item button @click="viewReturn()">
    <ion-label>
      <h2>{{ returnShipment.trackingCode ? returnShipment.trackingCode : returnShipment.externalId ? returnShipment.externalId : returnShipment.shipmentId }}</h2>
      <p>{{ returnShipment.shopifyOrderName ? returnShipment.shopifyOrderName : returnShipment.hcOrderId }}</p>
    </ion-label>
    <ion-badge :color="statusColorsMapping[returnShipment.statusDesc] ? statusColorsMapping[returnShipment.statusDesc] : 'medium'" slot="end">{{ returnShipment.statusDesc }}</ion-badge>
  </ion-item>
</template>
  
<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonBadge,
  IonItem,
  IonLabel,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { mapGetters, useStore } from 'vuex';

export default defineComponent({
  name: "ReturnListItem",
  data() {
    return {
      statusColorsMapping: {
        'Received': 'success',
        'Approved': 'tertiary',
        'Cancelled': 'danger',
        'Shipped': 'medium',
        'Created': 'medium'
      } as any
    }
  },
  components: {
    IonBadge,
    IonItem,
    IonLabel,
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