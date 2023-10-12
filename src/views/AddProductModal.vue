<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Add a product") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="$t('Search SKU or product name')" v-on:keyup.enter="queryString = $event.target.value; getProducts()" />
    
    <ion-list v-for="product in products" :key="product.productId">
      <ion-item lines="none">
        <ion-thumbnail slot="start">
          <ShopifyImg :src="product.mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <!-- Honouring the identifications set by the user on the settings page -->
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, product) ? getProductIdentificationValue(productIdentificationPref.primaryId, product) : product.productName }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, product) }}</p>
        </ion-label>
        <ion-icon v-if="isProductAvailableInShipment(product.productId)" color="success" :icon="checkmarkCircle" />
        <ion-button v-else fill="outline" @click="addtoShipment(product)">{{ $t("Add to Shipment") }}</ion-button>
      </ion-item>
    </ion-list>

    <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable">
      <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')" />
    </ion-infinite-scroll>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { closeOutline, checkmarkCircle } from 'ionicons/icons';
import { mapGetters } from 'vuex'
import { useStore } from "@/store";
import { getProductIdentificationValue, ShopifyImg, useProductIdentificationStore } from '@hotwax/dxp-components';
import { showToast } from '@/utils'
import { translate } from '@/i18n'

export default defineComponent({
  name: "Modal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonSearchbar,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    ShopifyImg
  },
  data() {
    return {
      queryString: ''
    }
  },
  computed: {
    ...mapGetters({
      products: 'product/getProducts',
      isScrollable: 'product/isScrollable',
      isProductAvailableInShipment: 'product/isProductAvailableInShipment'
    })
  },
  methods: {
    async getProducts( vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        viewSize,
        viewIndex,
        queryString: this.queryString
      }
      if (this.queryString) {
        await this.store.dispatch("product/findProduct", payload);
      }
      else {
        showToast(translate("Enter product sku to search"))
      }
    },
    async loadMoreProducts(event: any) {
      this.getProducts(
        undefined,
        Math.ceil(this.products.length / process.env.VUE_APP_VIEW_SIZE).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    async addtoShipment (product: any) {
      this.store.dispatch('shipment/addShipmentItem', product)
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
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      closeOutline,
      checkmarkCircle,
      getProductIdentificationValue,
      productIdentificationPref,
      store,
    };
  },
});
</script>
