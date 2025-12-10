<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("What's next") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item lines="full">
        <ion-label>
          <h2>{{ translate("out of items open", { openItems, items }) }}</h2>
          <p v-html="translate('Submit a quantity on all open items to receive and close them. Enter 0 quantity for items you didn’t receive complete quantities for.', { space: '<br/>' })"></p>
          <p>{{ translate("Use the open tab to view outstanding items.") }}</p>
        </ion-label>
      </ion-item>
      <ion-item lines="none">
        <ion-label>
          <h2>{{ translate("Receive and complete") }}</h2>
          <p>{{ translate("Once all quantities are submitted, click 'Receive and complete' at the bottom of the page. Review any discrepancies and close this transfer order.") }}</p>
        </ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "ReceivingInstructions",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      queryString: this.selectedSKU ? this.selectedSKU : '',
    }
  },
  props: ["items", "openItems"],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    }
  },
  setup() {
    return {
      closeOutline,
      translate
    };
  },
});
</script>