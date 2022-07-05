<template>
  <ion-chip outline>
    <ion-icon :icon="locationOutline"/>
    <ion-select interface="popover" :placeholder="$t('facility location')" :value="currentFacilityLocation.locationSeqId" @ionChange="setFacilityLocation($event)">
    <ion-select-option v-for="facilityLocation in (facilityLocations ? facilityLocations : [])" :key="facilityLocation.locationSeqId" :value="facilityLocation.locationSeqId" >{{ facilityLocation.locationPath }}</ion-select-option>
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
      currentFacilityLocation: 'user/getCurrentFacilityLocation',
    })
  },
  methods: {
    setFacilityLocation(facilityLocation: any) {
      if (this.facilityLocations) {
        this.facilityLocations.map((location: any) => {
          if(location.locationSeqId === facilityLocation['detail'].value) {
            this.store.dispatch('user/setFacilityLocation', {'facilityLocation': location});
          }
        })
      }
    },
  },
  setup() {
    const store = useStore(); {
      return {
        locationOutline,
        store
      }
    }
  }
});
</script> 