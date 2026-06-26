<template>
  <ion-chip data-testid="location-popover-open-btn" outline @click="triggerOpen($event)">
    <ion-select data-testid="location-popover-location-select" ref="selectRef" aria-label="Facility Location" interface="popover" :placeholder="translate('facility location')" :value="item.locationSeqId" @ionChange="setFacilityLocation($event)">
      <ion-icon slot="start" :icon="locationOutline"/>
      <ion-select-option v-for="facilityLocation in (getFacilityLocationsByFacilityId(facilityId) ? getFacilityLocationsByFacilityId(facilityId) : [])" :key="facilityLocation.locationSeqId" :data-testid="`location-popover-location-option-${facilityLocation.locationSeqId}`" :value="facilityLocation.locationSeqId" >{{ facilityLocation.locationPath ? facilityLocation.locationPath : facilityLocation.locationSeqId }}</ion-select-option>
    </ion-select>
  </ion-chip>
</template>

<script setup lang="ts">
import { IonChip, IonIcon, IonSelect, IonSelectOption } from '@ionic/vue';
import { ref, computed } from 'vue';
import { locationOutline } from 'ionicons/icons'
import { translate } from '@common';
import { useUserStore } from '@/store/user';
import { useProductStore } from '@/store/productStore';
import { useShipmentStore } from '@/store/shipment';
import { useReturnStore } from '@/store/return';
import { useTransferOrderStore } from '@/store/transferorder';

const props = defineProps(['item', 'type', 'facilityId']);
const userStore = useUserStore();
const productStore = useProductStore();
const selectRef = ref(null) as any;

const getFacilityLocationsByFacilityId = computed(() => productStore.getFacilityLocationsByFacilityId);

const setFacilityLocation = (event: CustomEvent) => {
  const locationSeqId = event.detail.value;
  const facilityLocations = productStore.getFacilityLocationsByFacilityId(props.facilityId);
  if (facilityLocations) {
    const facilityLocation = facilityLocations.find((location: any) => location.locationSeqId === locationSeqId);
    if (facilityLocation) {
      let store: any;
      if (props.type === 'shipment') {
        store = useShipmentStore();
      } else if (props.type === 'return') {
        store = useReturnStore();
      } else if (props.type === 'transferorder') {
        store = useTransferOrderStore();
      }

      if (store) {
        store.setItemLocationSeqId({ item: props.item, locationSeqId: facilityLocation.locationSeqId });
      }
    }
  }
};

const triggerOpen = (event: CustomEvent) => {
  const selectEl = selectRef.value?.$el;
  if (selectEl) {
    selectEl.open(event);
  }
};
</script>

<style scoped>
ion-chip > ion-select {
  min-height: 0px;
}
</style>
