<template>
  <ion-chip outline @click="openSelect">
    <ion-select ref="facilitySelect" aria-label="Facility Location" interface="popover" :placeholder="translate('facility location')" :value="item.locationSeqId" @ionChange="setFacilityLocation($event)">
      <ion-icon slot="start" :icon="locationOutline"/>
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
import { translate } from '@hotwax/dxp-components';

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
          this.store.dispatch(`${this.type}/setItemLocationSeqId`, { item: this.item, locationSeqId: facilityLocation.locationSeqId });
        }
      }
    },
    openSelect() {
      const select = this.$refs.facilitySelect as any;
      if (select && select.$el) {
        select.$el.click();
      }
    }
  },
  setup() {
    const store = useStore();
    return {
      locationOutline,
      store,
      translate
    }
  }
});
</script>

<style scoped>
ion-chip > ion-select {
  min-height: 0px;
}
</style>