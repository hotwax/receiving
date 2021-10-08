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
        <ion-list>
          <ion-item @click="() => router.push('/shipment')">
            <ion-label>
              <h2>SHPMNT_001</h2>
              <p>3 {{ $t("items") }}</p>
            </ion-label>
            <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>
              <h2>SHPMNT_002</h2>
              <p>2 {{ $t("items") }}</p>
            </ion-label>
            <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>
              <h2>SHPMNT_003</h2>
              <p>6 {{ $t("items") }}</p>
            </ion-label>
            <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>
              <h2>SHPMNT_004</h2>
              <p>4 {{ $t("items") }}</p>
            </ion-label>
            <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>
              <h2>SHPMNT_005</h2>
              <p>1 {{ $t("item") }}</p>
            </ion-label>
            <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
          </ion-item>
        </ion-list>
        <div class="ion-text-center">
          <ion-button fill="outline" color="dark"><ion-icon :icon="cloudDownloadOutline" slot="start" />{{ $t("Load more shipments") }}</ion-button>
        </div>
      </div> 
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { cloudDownloadOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Receiving',
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSearchbar,
    IonPage,
    IonTitle,
    IonToolbar
  },
  setup(){
    const router = useRouter();
    return {
      cloudDownloadOutline,
      router
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