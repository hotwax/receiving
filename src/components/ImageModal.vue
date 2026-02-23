<template>
  <ion-header data-testid="product-image-modal-header" :translucent="true">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="product-image-modal-close-btn" @click="closeModal">
          <ion-icon :icon="closeOutline" slot="icon-only" />
        </ion-button>
      </ion-buttons>
      <ion-title data-testid="product-image-modal-title">{{ productName }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content data-testid="product-image-modal-content" class="ion-text-center">
    <DxpShopifyImg data-testid="product-image-modal-preview-img" :src="imageUrl" />

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
