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

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { DxpShopifyImg } from '@common';

defineProps(['imageUrl', 'productName']);

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};
</script>

<style scoped>
img { 
  max-height: 530px;
}
</style>
