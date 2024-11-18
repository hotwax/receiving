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
  <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
    <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="translate('Search SKU or product name')" v-on:keyup.enter="queryString = $event.target.value; getProducts()" />
    
    <template v-if="products.length">
      <ion-list v-for="product in products" :key="product.productId">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <DxpShopifyImg :src="product.mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            <!-- Honouring the identifications set by the user on the settings page -->
            <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(product.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(product.productId)) : getProduct(product.productId).productName }}</h2>
            <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(product.productId)) }}</p>
          </ion-label>
          <ion-icon v-if="isProductAvailableInShipment(product.productId)" color="success" :icon="checkmarkCircle" />
          <ion-button v-else fill="outline" @click="addtoShipment(product)">{{ translate("Add to Shipment") }}</ion-button>
        </ion-item>
      </ion-list>
       <!--
        When searching for a keyword, and if the user moves to the last item, then the didFire value inside infinite scroll becomes true and thus the infinite scroll does not trigger again on the same page(https://github.com/hotwax/users/issues/84).
        Also if we are at the section that has been loaded by infinite-scroll and then move to the details page then the list infinite scroll does not work after coming back to the page
        In ionic v7.6.0, an issue related to infinite scroll has been fixed that when more items can be added to the DOM, but infinite scroll does not fire as the window is not completely filled with the content(https://github.com/ionic-team/ionic-framework/issues/18071).
        The above fix in ionic 7.6.0 is resulting in the issue of infinite scroll not being called again.
        To fix this we have maintained another variable `isScrollingEnabled` to check whether the scrolling can be performed or not.
        If we do not define an extra variable and just use v-show to check for `isScrollable` then when coming back to the page infinite-scroll is called programatically.
        We have added an ionScroll event on ionContent to check whether the infiniteScroll can be enabled or not by toggling the value of isScrollingEnabled whenever the height < 0.
       -->
      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" v-show="isScrollable" ref="infiniteScrollRef">
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
import { defineComponent, computed } from 'vue';
import { closeOutline, checkmarkCircle } from 'ionicons/icons';
import { mapGetters } from 'vuex'
import { useStore } from "@/store";
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
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
      queryString: this.selectedSKU ? this.selectedSKU : '',
      isScrollingEnabled: false
    }
  },
  props: ["selectedSKU"],
  computed: {
    ...mapGetters({
      products: 'product/getProducts',
      getProduct: 'product/getProduct',
      isScrollable: 'product/isScrollable',
      isProductAvailableInShipment: 'product/isProductAvailableInShipment',
      facilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId'
    })
  },
  mounted() {
    if(this.selectedSKU) this.getProducts()
  },
  async ionViewWillEnter() {
    this.isScrollingEnabled = false;
  },
  methods: {
    enableScrolling() {
      const parentElement = (this as any).$refs.contentRef.$el
      const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
      let scrollHeight = scrollEl.scrollHeight, infiniteHeight = (this as any).$refs.infiniteScrollRef.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
      const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
      if(distanceFromInfinite < 0) {
        this.isScrollingEnabled = false;
      } else {
        this.isScrollingEnabled = true;
      }
    },
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
       // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
       if(!(this.isScrollingEnabled && this.isScrollable)) {
        await event.target.complete();
      }
      this.getProducts(
        undefined,
        Math.ceil(this.products.length / process.env.VUE_APP_VIEW_SIZE).toString()
      ).then(async () => {
        await event.target.complete();
      });
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
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      currentFacility,
      closeOutline,
      checkmarkCircle,
      store,
      translate,
      getProductIdentificationValue,
      productIdentificationPref
    };
  },
});
</script>
