<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("History") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item>
        <ion-thumbnail slot="start">
          <Image src="https://demo-resources.hotwax.io/resources/uploads/images/product/m/h/mh01-black_main.jpg" />
        </ion-thumbnail>
        <ion-label>
          User
          <p>Shipment reference number</p>
        </ion-label>
        <!-- TODO: Use appropriate css properties to align below label as like as figma design. -->
        <ion-label>
          <ion-note>50 received | 4 rejected</ion-note>
          <ion-note>12:30 PM 23/12/2020</ion-note>
        </ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script>
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { close } from 'ionicons/icons';
import Image from "@/components/Image.vue";

export default defineComponent({
  name: "ReceivingHistoryModal",
  components: {
    Image,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonThumbnail,
    IonTitle,
    IonToolbar,
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    return {
      close,
    };
  },
});
</script>

<style scoped>
ion-note {
  display: block;
  text-align: end;
}
</style>
