<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Add a Product") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-searchbar
      :placeholder="$t('Search SKU or product name')"
    ></ion-searchbar>
    <ion-list>
      <ion-item>
        <ion-thumbnail slot="start">
          <img
            src="https://demo-resources.hotwax.io/resources/uploads/images/product/m/h/mh01-black_main.jpg"
          />
        </ion-thumbnail>
        <ion-label>
          <h2>Chaz Kangeroo Hoodie-XS-Black</h2>
          <p>10001</p>
        </ion-label>
        <ion-button fill="outline" color="dark">{{ $t("Add to Shipment") }}</ion-button>
      </ion-item>
      <ion-item>
        <ion-thumbnail slot="start">
          <img
            src="https://demo-resources.hotwax.io/resources/uploads/images/product/m/h/mh01-gray_main.jpg"
          />
        </ion-thumbnail>
        <ion-label>
          <h2>Chaz Kangeroo Hoodie-XS-Gray</h2>
          <p>10002</p>
        </ion-label>
        <ion-button fill="outline" color="dark">{{ $t("Add to Shipment") }}</ion-button>
      </ion-item>
      <ion-item>
        <ion-thumbnail slot="start">
          <img
            src="https://demo-resources.hotwax.io/resources/uploads/images/product/m/h/mh01-orange_main.jpg"
          />
        </ion-thumbnail>
        <ion-label>
          <h2>Chaz Kangeroo Hoodie-XS-Orange</h2>
          <p>10003</p>
        </ion-label>
        <ion-icon :icon="checkmarkCircle" color="success" />
      </ion-item>
      <ion-item>
        <ion-thumbnail slot="start">
          <img
            src="https://demo-resources.hotwax.io/resources/uploads/images/product/m/h/mh01-black_main.jpg"
          />
        </ion-thumbnail>
        <ion-label>
          <h2>Chaz Kangeroo Hoodie-XS-Black</h2>
          <p>10004</p>
        </ion-label>
        <ion-button fill="outline" color="dark">{{ $t("Add to Shipment") }}</ion-button>
      </ion-item>
      <ion-item>
        <ion-thumbnail slot="start">
          <img
            src="https://demo-resources.hotwax.io/resources/uploads/images/product/m/h/mh01-gray_main.jpg"
          />
        </ion-thumbnail>
        <ion-label>
          <h2>Chaz Kangeroo Hoodie-XS-Gray</h2>
          <p>10005</p>
        </ion-label>
        <ion-button fill="outline" color="dark">{{ $t("Add to Shipment") }}</ion-button>
      </ion-item>
      <ion-item>
        <ion-thumbnail slot="start">
          <img
            src="https://demo-resources.hotwax.io/resources/uploads/images/product/m/h/mh01-orange_main.jpg"
          />
        </ion-thumbnail>
        <ion-label>
          <h2>Chaz Kangeroo Hoodie-XS-Orange</h2>
          <p>10006</p>
        </ion-label>
        <ion-button fill="outline" color="dark">{{ $t("Add to Shipment") }}</ion-button>
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
  IonSearchbar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { close, checkmarkCircle } from 'ionicons/icons';

export default defineComponent({
  name: "Modal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSearchbar,
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
      checkmarkCircle,
    };
  },
});
</script>

<style scoped>
img {
  object-fit: contain;
}
</style>
