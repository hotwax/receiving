<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Receiving") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <div>
        <ion-searchbar :placeholder="$t('Scan ASN to start receiving')"></ion-searchbar>
        
        <ReceivingListItem />

        <div class="ion-text-center">
          <ion-button fill="outline" color="dark"><ion-icon :icon="cloudDownloadOutline" slot="start" />{{ $t("Load more shipments") }}</ion-button>
        </div>
      </div> 
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { cloudDownloadOutline } from 'ionicons/icons'
import ReceivingListItem from '@/components/ReceivingListItem.vue'

export default defineComponent({
  name: 'Receiving',
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonSearchbar,
    IonPage,
    IonTitle,
    IonToolbar,
    ReceivingListItem
  },
  setup(){
    return {
      cloudDownloadOutline
    }
  }
});
</script>

<style scoped>
ion-content div {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}
</style>