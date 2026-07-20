<template>
  <ion-toolbar data-testid="scanner-modal-toolbar">
    <ion-buttons slot="end" @click="closeScanner()" >
      <ion-button data-testid="scanner-modal-close-btn" >
        <ion-icon :icon="closeOutline" />
      </ion-button>
    </ion-buttons>  
  </ion-toolbar>   
  <div data-testid="scanner-modal-content" class="scanner">
    <StreamBarcodeReader
      data-testid="scanner-modal-barcode-reader"
      @decode="onDecode"
      @loaded="onLoaded"
    />
  </div> 
</template>

<script setup lang="ts">
import { StreamBarcodeReader } from "vue-barcode-reader";
import { IonButton, IonButtons, IonIcon, IonToolbar, modalController } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';

const onDecode = (result: string) => {
  modalController.dismiss({ dismissed: true }, result);
};

const onLoaded = () => {
  console.info('Scanner loaded');
};

const closeScanner = () => {
  modalController.dismiss({ dismissed: true });
};
</script>
