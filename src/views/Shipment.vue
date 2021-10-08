<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start"></ion-back-button>
        <ion-title>Shipment Details</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="addProduct"><ion-icon :icon="add"/></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div>
        <ion-item lines="none">
          <h1>Shipment ID: SHPMNT_001</h1>
        </ion-item>
        <ion-item>
          <ion-label>
            <ion-input placeholder="Scan barcodes to receive"></ion-input>
          </ion-label>
        </ion-item>
        <ion-card>
          <ion-card-content>
            <ion-row>
              <ion-col size="9">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <img
                      src="https://cdn.shopify.com/s/files/1/0069/7384/9727/products/test-track.jpg?v=1626255137"
                    />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>Chaz Kangeroo Hoodie-XS-Green</h2>
                    <p>12203</p>
                  </ion-label>
                </ion-item>
              </ion-col>
              <ion-col size="3" class="ion-align-self-center">
                <ion-item>
                  <ion-input type="number" value="0" min="0"></ion-input>
                </ion-item>
              </ion-col>
            </ion-row>
          </ion-card-content>
          <ion-item class="border-top">
            <ion-button color="dark" slot="start" fill="outline">
              {{ $t("ReceiveAll") }}
            </ion-button>
            <ion-progress-bar value="1" color="dark"></ion-progress-bar>
            <p slot="end">5</p>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-content>
            <ion-row>
              <ion-col size="9">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <img
                      src="https://demo-resources.hotwax.io/resources/uploads/images/product/m/h/mh01-black_main.jpg"
                    />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>Chaz Kangeroo Hoodie-XS-Black</h2>
                    <p>12209</p>
                  </ion-label>
                </ion-item>
              </ion-col>
              <ion-col size="3" class="ion-align-self-center">
                <ion-item>
                  <ion-input type="number" value="0" min="0"></ion-input>
                </ion-item>
              </ion-col>
            </ion-row>
          </ion-card-content>
        </ion-card>
        <ion-card>
          <ion-card-content>
            <ion-row>
              <ion-col size="9">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <img
                      src="https://demo-resources.hotwax.io/resources/uploads/images/product/m/h/mh01-gray_main.jpg"
                    />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>Chaz Kangeroo Hoodie-XS-Gray</h2>
                    <p>12204</p>
                  </ion-label>
                </ion-item>
              </ion-col>
              <ion-col size="3" class="ion-align-self-center">
                <ion-item>
                  <ion-input type="number" value="0" min="0"></ion-input>
                </ion-item>
              </ion-col>
            </ion-row>
          </ion-card-content>
        </ion-card>
      </div>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="completeShipment" color="dark">
          <ion-icon :icon="checkmarkDone" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonHeader,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonInput,
  IonLabel,
  IonPage,
  IonProgressBar,
  IonRow,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
  alertController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { add, checkmarkDone } from 'ionicons/icons';
import AddProductModal from '@/views/AddProductModal.vue'

export default defineComponent({
  name: "Shipment details",
  components: {
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCol,
    IonContent,
    IonHeader,
    IonFab,
    IonFabButton,
    IonIcon,
    IonItem,
    IonInput,
    IonLabel,
    IonPage,
    IonProgressBar,
    IonRow,
    IonThumbnail,
    IonTitle,
    IonToolbar,
  },
  methods: {
    async addProduct() {
      const modal = await modalController
        .create({
          component: AddProductModal
        })
      return modal.present();
    },
    async completeShipment() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Complete Shipment",
        message:
          "Make sure you have entered the correct quantities for each item before proceeding.",
        buttons: ["Cancel", "Complete"],
      });
      return alert.present();
    },
  }, 
  setup() {
    return {
      add,
      checkmarkDone,
    };
  },
});
</script>
<style scoped>
ion-content div {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}

img {
  object-fit: contain;
}

.border-top {
  border-top: 1px solid #ccc;
}
</style>
