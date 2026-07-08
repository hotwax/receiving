<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="transfer-order-receiving-instructions-modal-close-btn" @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title data-testid="transfer-order-receiving-instructions-modal-title">{{ translate("What's next") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content data-testid="transfer-order-receiving-instructions-modal-content">
    <ion-list data-testid="transfer-order-receiving-instructions-list">
      <ion-item data-testid="transfer-order-receiving-instructions-open-items-section" lines="full">
        <ion-label>
          <h2>{{ translate("out of items open", { openItems, items }) }}</h2>
          <p v-html="translate('Submit a quantity on all open items to receive and close them. Enter 0 quantity for items you didn’t receive complete quantities for.', { space: '<br/>' })"></p>
          <p>{{ translate("Use the open tab to view outstanding items.") }}</p>
        </ion-label>
      </ion-item>
      <ion-item data-testid="transfer-order-receiving-instructions-complete-section" lines="none">
        <ion-label>
          <h2>{{ translate("Receive and complete") }}</h2>
          <p>{{ translate("Once all quantities are submitted, click 'Receive and complete' at the bottom of the page. Review any discrepancies and close this transfer order.") }}</p>
        </ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { translate } from '@common';

defineProps(["items", "openItems"]);

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};
</script>
