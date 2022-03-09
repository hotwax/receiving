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
    <Image :src="imageUrl" />
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import Image from '@/components/Image.vue';

export default defineComponent({
  name: 'ImageModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonToolbar,
    Image,
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
