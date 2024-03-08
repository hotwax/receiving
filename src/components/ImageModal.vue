<template>
  <ion-header :translucent="true">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="closeOutline" slot="icon-only" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ productName }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-text-center">
    <DxpShopifyImg :src="imageUrl" />

  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { DxpShopifyImg } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'ImageModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    DxpShopifyImg
  },
  props: ["imageUrl", "productName"],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    return {
      closeOutline,
    };
  },
});
</script>

<style scoped>
img { 
  max-height: 530px;
}
</style>
