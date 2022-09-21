<template>
  <ion-chip outline>
    <ion-icon :icon="locationOutline"/>
    <ion-select interface="popover" :placeholder="$t('facility location')" :value="item.locationSeqId ? item.locationSeqId : facilityLocations[0]?.locationSeqId" @ionChange="setFacilityLocation($event)">
      <ion-select-option v-for="facilityLocation in (facilityLocations ? facilityLocations : [])" :key="facilityLocation.locationSeqId" :value="facilityLocation.locationSeqId" >{{ facilityLocation.locationPath ? facilityLocation.locationPath : facilityLocation.locationSeqId }}</ion-select-option>
    </ion-select>
  </ion-chip>
</template>

<script lang="ts">
import {
  IonChip,
  IonIcon,  
  IonSelect,
  IonSelectOption 
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import { locationOutline } from 'ionicons/icons'

export default defineComponent({
  name: 'LocationPopover',
  components: {
    IonChip,
    IonIcon,
    IonSelect,
    IonSelectOption
  },
  computed: {
    ...mapGetters({
      facilityLocations: 'user/getFacilityLocations',
    })
  },
  props: ['item', 'type'],
  methods: {
    setFacilityLocation(event: CustomEvent) {
      if (this.facilityLocations) {
        const facilityLocation = this.facilityLocations.find((location: any) => location.locationSeqId === event['detail'].value)
        if(facilityLocation) {
          this.type === 'purchaseOrder' ? this.store.dispatch('order/setItemLocationSeqId', { item: this.item, facilityLocation }) : this.store.dispatch('shipment/setItemLocationSeqId', { item: this.item, facilityLocation });
        }
      }
    },
  },
  setup() {
    const store = useStore();
    return {
      locationOutline,
      store
    }
  }
});
</script> 