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
    <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="translate('Search SKU or product name')" @keyup.enter="handleSearch" @ionInput='handleInput'/>
    <template v-if="products.length">
      <ion-list v-for="product in products" :key="product.productId">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <DxpShopifyImg :src="product.mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            <!-- Honouring the identificcomponents/AddProductToTOModal.vueations set by the user on the settings page -->
            <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(product.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(product.productId)) : getProduct(product.productId).productName }}</h2>
            <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(product.productId)) }}</p>
          </ion-label>
          <ion-icon v-if="isProductAvailableInOrder(product.productId)" color="success" :icon="checkmarkCircle" />
          <ion-button v-else fill="outline" @click="addtoOrder(product)">{{ translate("Add to Transfer Order") }}</ion-button>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" v-show="isScrollable" ref="infiniteScrollRef">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </template>
    <div v-else-if="queryString && isSearching && !products.length" class="empty-state">
      <p>{{ translate("No products found") }}</p>
    </div>
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
  name: "AddProductToTOModal",
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
      isScrollingEnabled: false,
      isSearching: false
    }
  },
  props: ["selectedSKU"],
  computed: {
    ...mapGetters({
      products: 'product/getProducts',
      getProduct: 'product/getProduct',
      isScrollable: 'product/isScrollable',
      isProductAvailableInOrder: 'transferorder/isProductAvailableInOrder',
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
    async getProducts( vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        viewSize,
        viewIndex,
        queryString: this.queryString.trim()
      }
      await this.store.dispatch("product/findProduct", payload);
    },
    async handleSearch(){    
      if (!this.queryString.trim()){
        showToast(translate("Enter product sku to search"))
        this.isSearching = false
        this.store.dispatch("product/clearSearchedProducts")
        return
      }
      await this.getProducts()
      this.isSearching = true
    },
    async handleInput(){
      if (!this.queryString.trim()){
        this.isSearching = false
        this.store.dispatch("product/clearSearchedProducts")
      }
    },
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
    async addtoOrder (product: any) {
      product.locationSeqId = this.facilityLocationsByFacilityId(this.currentFacility.facilityId) ? this.facilityLocationsByFacilityId(this.currentFacility.facilityId)[0]?.locationSeqId : ''
      this.store.dispatch('transferorder/addOrderItem', product)
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
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref);
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