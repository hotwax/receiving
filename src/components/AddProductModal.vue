<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="add-product-close-btn" @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Add product") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar data-testid="add-product-searchbar" v-model="queryString" :placeholder="translate('Search SKU or product name')" @keyup.enter="handleSearch" @ionInput="handleInput"/>

    <template v-if="products.length">
      <ion-list v-for="product in products" :key="product.productId" :data-testid="`add-product-row-${product.productId}`">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <Image :src="product.mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            <h2>{{ commonUtil.getProductIdentificationValue(useProductStore().getProductIdentificationPref.primaryId, product) || getProduct(product.productId).productName }}</h2>
            <p>{{ commonUtil.getProductIdentificationValue(useProductStore().getProductIdentificationPref.secondaryId, product) }}</p>
          </ion-label>
          <ion-icon v-if="isProductInOrder(product.productId)" color="success" :icon="checkmarkCircle" data-testid="add-product-in-order-${product.productId}" />
          <ion-button v-else data-testid="add-product-btn-${product.productId}" fill="outline" @click="addItemToOrder(product)" :disabled="pendingProductIds.has(product.productId)">
            {{ pendingProductIds.has(product.productId) ? translate("Adding...") : translate("Add to order") }}
          </ion-button>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll data-testid="add-product-infinite-scroll" @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable()">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </template>

    <div v-else-if="queryString && isSearching && !products.length" class="empty-state" data-testid="add-product-no-results">
      <p>{{ translate("No product found") }}</p>
    </div>
    <div v-else class="empty-state" data-testid="add-product-empty">
      <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
      <p>{{ translate("Enter a SKU, or product name to search a product") }}</p>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
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
} from "@ionic/vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { closeOutline, checkmarkCircle } from "ionicons/icons";
import Image from "@/components/Image.vue"
import { commonUtil, logger, translate, useSolrSearch } from "@common";
import { useProductStore } from "@/store/productStore";
import { useProductStore as useProduct } from "@/store/product";

const props = defineProps(["query", "addProductToQueue", "pendingProductIds", "isProductInOrder", "onProductAdded"])

const getProduct = computed(() => useProduct().getProduct)

let queryString = ref(props.query || '')
const isSearching = ref(false);
const products = ref([]) as any;
const total = ref(0) as any;

onMounted(() => {
  if(queryString.value) {
    handleSearch()
  }
})

onUnmounted(() => {
  products.value = []
})

async function handleSearch() {
  if (!queryString.value.trim()) {
    isSearching.value = false;
    products.value = [];
    return;
  }
  await getProducts();
  isSearching.value = true;
}

async function getProducts( vSize?: any, vIndex?: any) {
  const viewSize = vSize ? vSize : import.meta.env.VITE_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;

  try {
    const payload = {
      filters: {
        isVirtual: { value: "false" },
        isVariant: { value: "true" }
      },
      keyword: queryString.value.trim(),
      viewSize,
      viewIndex
    } as any

    const resp = await useSolrSearch().searchProducts(payload)

    if(resp?.products?.length) {
      const productsList = resp?.products
      if(viewIndex) {
        products.value = products.value.concat(productsList);
      } else {
        products.value = productsList;
        total.value = resp?.total;
      }
      useProduct().addProductToCachedMultiple({ products: productsList })
    } else {
      products.value = viewIndex ? products.value : [];
    }
  } catch(error) {
    logger.error(error)
  }
}

function isScrollable() {
  return products.value?.length && products.value?.length < total.value
}

async function loadMoreProducts(event: any) {
  getProducts(
    undefined,
    Math.ceil(products.value.length / Number(import.meta.env.VITE_VIEW_SIZE)).toString()
  ).then(() => {
    event.target.complete();
  })
}

function addItemToOrder(product: any) {
  const itemToAdd = {
    product: product,
    onSuccess: () => {
      props.onProductAdded?.();
    },
    onError: (product: any, error: any) => {
      logger.error(`Failed to add product ${product.productId}:`, error);
    }
  }
  props.addProductToQueue(itemToAdd);
}

function closeModal() {
  modalController.dismiss();
}

function handleInput() {
  if (!queryString.value.trim()) {
    isSearching.value = false;
    products.value = []
  }
}
</script>
