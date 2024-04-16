<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Add a product") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="translate('Search SKU or product name')" v-on:keyup.enter="queryString = $event.target.value; getProducts()" />
    
    <template v-if="products.length">
      <ion-list v-for="product in products" :key="product.productId">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <DxpShopifyImg :src="product.mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            <!-- Honouring the identifications set by the user on the settings page -->
            <h2>{{ product[productIdentificationPref.primaryId] }}</h2>
            <p>{{ product[productIdentificationPref.secondaryId] }}</p>
          </ion-label>
          <ion-icon v-if="isProductAvailableInShipment(product.productId)" color="success" :icon="checkmarkCircle" />
          <ion-button v-else fill="outline" @click="addtoShipment(product)">{{ translate("Add to Shipment") }}</ion-button>
        </ion-item>
      </ion-list>
        <!--
          When searching for a keyword, and if the user moves to the last item, then the didFire value inside infinite scroll becomes true and thus the infinite scroll does not trigger again on the same page(https://github.com/hotwax/users/issues/84).
          In ionic v7.6.0, an issue related to infinite scroll has been fixed that when more items can be added to the DOM, but infinite scroll does not fire as the window is not completely filled with the content(https://github.com/ionic-team/ionic-framework/issues/18071).
          The above fix in ionic 7.6.0 is resulting in the issue of infinite scroll not being called again.
          To fix this, we have added a key with value as queryString(searched keyword), so that the infinite scroll component can be re-rendered
          whenever the searched string is changed resulting in the correct behaviour for infinite scroll
        -->
      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable" :key="queryString">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </template>
    <div v-else class="empty-state">
      <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
      <p>{{ translate("Enter a SKU, or product name to search a product") }}</p>
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
import { defineComponent } from 'vue';
import { closeOutline, checkmarkCircle } from 'ionicons/icons';
import { mapGetters } from 'vuex'
import { useStore } from "@/store";
import { DxpShopifyImg, translate } from '@hotwax/dxp-components';
import { showToast } from '@/utils'

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
    DxpShopifyImg
  },
  data() {
    return {
      queryString: this.selectedSKU ? this.selectedSKU : ''
    }
  },
  props: ["selectedSKU"],
  computed: {
    ...mapGetters({
      products: 'product/getProducts',
      isScrollable: 'product/isScrollable',
      isProductAvailableInShipment: 'product/isProductAvailableInShipment',
      productIdentificationPref: 'user/getProductIdentificationPref',
      currentFacility: 'user/getCurrentFacility',
      facilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId'
    })
  },
  mounted() {
    if(this.selectedSKU) this.getProducts()
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
      product.locationSeqId = this.facilityLocationsByFacilityId(this.currentFacility.facilityId) ? this.facilityLocationsByFacilityId(this.currentFacility.facilityId)[0]?.locationSeqId : ''
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
    return {
      closeOutline,
      checkmarkCircle,
      store,
      translate
    };
  },
});
</script>
