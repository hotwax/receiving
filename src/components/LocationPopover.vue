<template>
  <ion-chip outline>
    <ion-icon :icon="locationOutline"/>
    <ion-select interface="popover" :placeholder="$t('facility location')" :value="item.locationSeqId" @ionChange="setFacilityLocation($event)">
      <ion-select-option v-for="facilityLocation in (getFacilityLocationsByFacilityId(facilityId) ? getFacilityLocationsByFacilityId(facilityId) : [])" :key="facilityLocation.locationSeqId" :value="facilityLocation.locationSeqId" >{{ facilityLocation.locationPath ? facilityLocation.locationPath : facilityLocation.locationSeqId }}</ion-select-option>
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
      getFacilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId',
    })
  },
  props: ['item', 'type', 'facilityId'],
  methods: {
    setFacilityLocation(event: CustomEvent) {
      const facilityLocations = this.getFacilityLocationsByFacilityId(this.facilityId)
      if (facilityLocations) {
        const facilityLocation = facilityLocations.find((location: any) => location.locationSeqId === event['detail'].value)
        if(facilityLocation) {
          this.store.dispatch(`${this.type}/setItemLocationSeqId`, { item: this.item, facilityLocation });
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