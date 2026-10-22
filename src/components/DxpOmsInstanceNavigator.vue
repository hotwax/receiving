<template>
  <ion-card>
    <ion-card-header>
      <ion-card-subtitle>
        {{ translate('OMS instance') }}
      </ion-card-subtitle>
      <ion-card-title>
        {{ oms }}
      </ion-card-title>
    </ion-card-header>
    <ion-card-content>
      {{ translate('This is the name of the OMS you are connected to right now. Make sure that you are connected to the right instance before proceeding.') }}
    </ion-card-content>
    <ion-button v-if="!isEmbedded && !utilIsMoqui()" :standalone-hidden="!hasStandAloneAccess" @click="utilGoToOms" fill="clear" :disabled="!hasOmsAccess">
      {{ translate('Go to OMS') }}
      <ion-icon slot="end" :icon="openOutline" />
    </ion-button>
  </ion-card>
</template>

<script setup lang="ts">
import { getOMSInstanceName as utilGetOMSInstanceName, goToOms as utilGoToOms, isMoqui as utilIsMoqui } from '@common/utils/core';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonIcon } from '@ionic/vue';
import { cookieHelper } from '@common/helpers/cookieHelper';
import { translate } from '@common/core/i18n';
import { openOutline } from 'ionicons/icons';

const props = defineProps({
  isEmbedded: {
    type: Boolean,
    default: false
  },
  hasStandAloneAccess: {
    type: Boolean,
    default: true
  },
  hasOmsAccess: {
    type: Boolean,
    default: true
  }
});

const oms = utilGetOMSInstanceName();
</script>

<style scoped>
/* Added conditional hiding in standalone mode that respects user permissions */
@media (display-mode: standalone) {
  [standalone-hidden] {
    display: none;
  }
}
</style>