<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="transfer-order-add-product-modal-close-btn" @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Add a product") }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar data-testid="transfer-order-add-product-search-input" @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="translate('Search SKU or product name')" @keyup.enter="handleSearch" @ionInput='handleInput'/>
    </ion-toolbar>
  </ion-header>
  <ion-content data-testid="transfer-order-add-product-modal-content" ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
    <template v-if="products.length">
      <ion-list v-for="product in products" :key="product.productId" :data-testid="`transfer-order-add-product-row-${product.productId}`">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <DxpShopifyImg :src="product.mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            <!-- Honouring the identifications set by the user on the settings page -->
            <h2>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(product.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(product.productId)) : getProduct(product.productId).productName }}</h2>
            <p>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(product.productId)) }}</p>
            <p>{{ commonUtil.getFeatures(getProduct(product.productId).productFeatures) }}</p>
          </ion-label>
          <ion-icon v-if="isProductAvailableInOrder(product.productId)" :data-testid="`transfer-order-add-product-added-icon-${product.productId}`" color="success" :icon="checkmarkCircle" />
          <ion-button v-else :data-testid="`transfer-order-add-product-add-btn-${product.productId}`" fill="outline" @click="addtoOrder(product)">{{ translate("Add to Transfer Order") }}</ion-button>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll data-testid="transfer-order-add-product-infinite-scroll" @ionInfinite="loadMoreProducts($event)" threshold="100px" v-show="isScrollable" ref="infiniteScrollRef">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </template>
    <div v-else-if="queryString && isSearching && !products.length" data-testid="transfer-order-add-product-search-empty-state" class="empty-state">
      <p>{{ translate("No products found") }}</p>
    </div>
    <div v-else data-testid="transfer-order-add-product-empty-state" class="empty-state">
      <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
      <p>{{ translate("Enter a SKU, or product name to search a product") }}</p>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonSearchbar, IonThumbnail, IonTitle, IonToolbar, modalController, onIonViewWillEnter } from '@ionic/vue';
import { ref, computed, onMounted } from 'vue';
import { closeOutline, checkmarkCircle } from 'ionicons/icons';
import { useProductStore as useProduct } from "@/store/product";
import { useTransferOrderStore } from "@/store/transferorder";
import { useProductStore } from "@/store/productStore";
import { useUserStore } from "@/store/user";
import { commonUtil, DxpShopifyImg, translate } from '@common';

const props = defineProps(["selectedSKU"]);

const product = useProduct();
const transferOrderStore = useTransferOrderStore();
const userStore = useUserStore();
const productStore = useProductStore();


const queryString = ref(props.selectedSKU ? props.selectedSKU : '');
const isScrollingEnabled = ref(false);
const isSearching = ref(false);
const contentRef = ref(null as any);
const infiniteScrollRef = ref(null as any);

const products = computed(() => product.getProducts);
const getProduct = computed(() => product.getProduct);
const isScrollable = computed(() => product.isScrollable);
const isProductAvailableInOrder = computed(() => transferOrderStore.isProductAvailableInOrder);
const facilityLocationsByFacilityId = computed(() => productStore.getFacilityLocationsByFacilityId);
const currentFacility = computed(() => productStore.getCurrentFacility);
const productIdentificationPref = computed(() => productStore.getProductIdentificationPref);

onMounted(() => {
  if (props.selectedSKU) handleSearch()
});

onIonViewWillEnter(() => {
  isScrollingEnabled.value = false;
});

const getProducts = async (vSize?: any, vIndex?: any) => {
  const viewSize = vSize ? vSize : import.meta.env.VITE_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  const payload = {
    viewSize,
    viewIndex,
    queryString: queryString.value.trim()
  }
  await product.findProduct(payload);
};

const handleSearch = async () => {    
  if (!queryString.value.trim()){
    commonUtil.showToast(translate("Enter product sku to search"))
    isSearching.value = false
    product.clearSearchedProducts()
    return
  }
  await getProducts()
  isSearching.value = true
};

const handleInput = async () => {
  if (!queryString.value.trim()){
    isSearching.value = false
    product.clearSearchedProducts()
  }
};

const enableScrolling = () => {
  const parentElement = contentRef.value?.$el
  if (!parentElement) return;
  const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']")
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef.value?.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
};

const loadMoreProducts = async (event: any) => {
   // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
   if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  getProducts(
    undefined,
    Math.ceil(products.value.length / (import.meta.env.VITE_VIEW_SIZE as any)).toString()
  ).then(async () => {
    await event.target.complete();
  });
};

const addtoOrder = async (product: any) => {
  const facilityId = currentFacility.value.facilityId;
  product.locationSeqId = facilityLocationsByFacilityId.value(facilityId) ? facilityLocationsByFacilityId.value(facilityId)[0]?.locationSeqId : ''
  await transferOrderStore.addOrderItem(product)
  modalController.dismiss({ dismissed: true, product });
};

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const selectSearchBarText = (event: any) => {
  event.target.getInputElement().then((element: any) => {
    element.select();
  })
};
</script>
