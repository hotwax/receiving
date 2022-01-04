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
    <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="$t('Search SKU or product name')" v-on:keyup.enter="getProduct()"></ion-searchbar>
    <div v-for="product in products" :key="product.productId">
      <ion-item v-bind:key="product.groupValue" v-for="product in products" lines="none" @click="() => router.push({ name: 'Modal', payload: { id: product.groupValue }})">
        <ion-thumbnail slot="start">
          <Image :src="getProduct(product.groupValue).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ getProduct(product.groupValue).productName}}</h2>
          <p>{{ getProduct(product.groupValue ).productId}}}</p>
        </ion-label>
        <ion-button fill="outline" color="dark" @click="addtoShipment()">{{ $t("Add to Shipment") }}</ion-button>
      </ion-item>
    </div> 
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { close, checkmarkCircle } from 'ionicons/icons';
import { mapGetters } from 'vuex'
import { useStore } from "@/store";

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
    IonSearchbar,
    IonThumbnail,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      products:'product/getProduct'
    })
  },
  methods: {
    async getProduct(vSize?: any, vIndex?: any) {  
    const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
    const viewIndex = vIndex ? vIndex : 0;
    const payload = {
      viewSize,
      viewIndex,
      groupByField: 'parentProductId',
    }
    this.store.dispatch("product/findProducts", payload);
  },
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
  },
  setup() {
    const store = useStore();
    return {
      close,
      checkmarkCircle,
      store,
    };
  },
});
</script>

<style scoped>
img {
  object-fit: contain;
}
</style>
