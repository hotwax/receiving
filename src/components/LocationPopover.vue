<template>
  <ion-list>
    <ion-list-header>Select location</ion-list-header>
    <ion-item><ion-label>location id 1</ion-label></ion-item>
    <ion-item><ion-label>location id 2</ion-label></ion-item>
    <ion-item><ion-label>location id 3</ion-label></ion-item>
    <ion-item><ion-label>location id 4</ion-label></ion-item>  
  </ion-list>
</template>

<script lang="ts">
import {
  IonItem,
  IonList,
  IonListHeader,  
} from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LocationPopover',
  components: {
    IonItem,
    IonList,
    IonListHeader
  },
});
</script>