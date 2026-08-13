<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="select-facility-close-btn" @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Select facility") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar data-testid="select-facility-searchbar" @ionFocus="selectSearchBarText($event)" :placeholder="translate('Search facilities')" v-model="queryString" @keyup.enter="queryString = $event.target.value; findFacility()" @keydown="preventSpecialCharacters($event)"/>
    <ion-radio-group data-testid="select-facility-radio-group" v-model="selectedFacilityIdValue">
      <ion-item v-for="facility in facilities" :key="facility.facilityId" :data-testid="`select-facility-row-${facility.facilityId}`">
        <ion-radio label-placement="end" justify="start" :value="facility.facilityId">
          <ion-label>
            {{ facility.facilityName ? facility.facilityName : facility.facilityId }}
            <p>{{ facility.facilityId }}</p>
          </ion-label>
        </ion-radio>
      </ion-item>
    </ion-radio-group>
    <!-- Empty state -->
    <div v-if="!facilities.length" class="empty-state">
      <p>{{ translate("No facilities found") }}</p>
    </div>
  </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="select-facility-save-btn" :disabled="selectedFacilityIdValue === selectedFacilityId" @click="saveFacility">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonRadio, IonRadioGroup, IonSearchbar, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { defineProps, onMounted, ref } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { translate } from '@common'

const props = defineProps(["selectedFacilityId", "facilities"]);

const selectedFacilityIdValue = ref("");
const facilities = ref([]);
const queryString = ref("");

onMounted(() => {
  selectedFacilityIdValue.value = props.selectedFacilityId
  facilities.value=props.facilities;
})

const findFacility = () => {
  const searchedString = queryString.value.trim().toLowerCase();
  if (searchedString) {
      facilities.value = props.facilities.filter((facility: any) =>
      facility.facilityName?.toLowerCase().includes(searchedString) ||
      facility.facilityId?.toLowerCase().includes(searchedString)
    );
  } else {
    facilities.value = props.facilities;
  }
};

async function selectSearchBarText(event: any) {
  const element = await event.target.getInputElement();
  element.select();
}

function preventSpecialCharacters($event: any) {
  if (/[`!@#$%^&*()_+\-=\\|,.<>?~]/.test($event.key)) $event.preventDefault();
}

function closeModal(payload = {}) {
  modalController.dismiss({ ...payload });
}

function saveFacility() {
  closeModal({ selectedFacilityId: selectedFacilityIdValue.value })
}

</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}
</style>
