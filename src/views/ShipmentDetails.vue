<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button data-testid="shipment-detail-page-back-btn" default-href="/" slot="start"></ion-back-button>
        <ion-title>{{ translate("Shipment Details") }}</ion-title>
        <ion-buttons slot="end" v-if="!isShipmentReceived()">
          <ion-button data-testid="shipment-detail-page-add-product-btn" :aria-label="translate('Add product')" :disabled="!userStore.hasPermission('RECEIVING_ADMIN')" @click="addProduct"><ion-icon :icon="add"/></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content data-testid="shipment-detail-page-content">
      <main>
        <ion-item lines="none">
          <ion-label>
            <p class="overline" v-show="current.externalOrderId || current.externalOrderName">{{ current.externalOrderName ? current.externalOrderName : current.externalOrderId }}</p>
            <h1 v-if="current.externalId">{{ translate("External ID") }}: {{ current.externalId }}</h1>
            <h1 v-else>{{ translate("Shipment ID") }}: {{ current.shipmentId }}</h1>
            <p>{{ translate("Item count:", { count: current.items.length }) }}</p>
          </ion-label>
          <ion-chip v-show="current.trackingIdNumber">{{current.trackingIdNumber}}</ion-chip>
          <ion-badge v-if="isShipmentReceived()">{{ translate("Completed") }}</ion-badge>
        </ion-item>

        <div class="scanner">
          <ion-item>
            <ion-input data-testid="shipment-detail-page-scan-search-input" :label="translate(isShipmentReceived() ? 'Search items' : 'Scan items')" autofocus v-model="queryString" @keyup.enter="isShipmentReceived() ? searchProduct() : updateProductCount()"></ion-input>
          </ion-item>

          <ion-button data-testid="shipment-detail-page-scan-btn" expand="block" fill="outline" @click="scanCode()" :disabled="isShipmentReceived()">
            <ion-icon slot="start" :icon="cameraOutline" />{{ translate("Scan") }}
          </ion-button>
        </div>

        <ion-card :data-testid="`shipment-detail-page-item-card-${item.productId}`" v-for="item in current.items" :key="item.id" :class="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : ''" :id="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
          <div class="product" :data-product-id="item.productId">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                  <p>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  <p>{{ commonUtil.getFeatures(getProduct(item.productId).productFeatures) }}</p>
                </ion-label>
              </ion-item>
            </div>

            <div class="location">
              <ion-button :data-testid="`shipment-detail-page-fetch-qoh-btn-${item.itemSeqId || item.productId}`" v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
              </ion-button>
              <ion-chip v-else outline>
                {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                <ion-icon color="medium" :icon="cubeOutline"/>
              </ion-chip>
            </div>

            <div class="product-count">
              <ion-item v-if="!isShipmentReceived() && item.quantityReceived === 0">
                <ion-input :data-testid="`shipment-detail-page-qty-input-${item.itemSeqId || item.productId}`" :label="translate('Qty')" :disabled="isForceScanEnabled" label-placement="floating" type="number" min="0" v-model="item.quantityAccepted" />
              </ion-item>
              <div v-else>
                <ion-item lines="none">
                  <ion-label slot="end">{{ translate("/ received", { receivedCount: item.quantityAccepted, orderedCount: item.quantityOrdered }) }}</ion-label>
                  <ion-icon :icon="(item.quantityReceived == item.quantityOrdered) ? checkmarkDoneCircleOutline : warningOutline" :color="(item.quantityReceived == item.quantityOrdered) ? '' : 'warning'" slot="end" />
                </ion-item>
              </div>
            </div>
          </div>

          <ion-item lines="none" class="border-top" v-if="item.quantityOrdered > 0 && !isShipmentReceived() && item.quantityReceived === 0">
            <ion-button :data-testid="`shipment-detail-page-receive-all-btn-${item.itemSeqId || item.productId}`" @click="receiveAll(item)" :disabled="isForceScanEnabled" slot="start" fill="outline">
              {{ translate("Receive All") }}
            </ion-button>

            <ion-progress-bar :color="getRcvdToOrdrdFraction(item) === 1 ? 'success' : getRcvdToOrdrdFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrdrdFraction(item)" />
            
            <p slot="end">{{ item.quantityOrdered }} {{ translate("shipped") }}</p>
          </ion-item>
        </ion-card>
      </main>

      <!-- Removing fab when the shipment is already received, this case can occur when directly hitting the shipment detail page for an already received shipment -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="!isShipmentReceived()">
        <ion-fab-button data-testid="shipment-detail-page-complete-btn" :disabled="!userStore.hasPermission('RECEIVING_ADMIN') || !isEligibleForReceivingShipment()" @click="completeShipment">
          <ion-icon :icon="checkmarkDone" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonBadge, IonButton, IonButtons, IonCard, IonContent, IonHeader, IonFab, IonFabButton, IonIcon, IonItem, IonInput, IonLabel, IonPage, IonProgressBar, IonThumbnail, IonTitle, IonToolbar, IonChip, modalController, alertController, onIonViewDidLeave } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { add, checkmarkDone, checkmarkDoneCircleOutline, cameraOutline, cubeOutline, locationOutline, warningOutline } from 'ionicons/icons';
import AddProductModal from '@/views/AddProductModal.vue'
import { DxpShopifyImg, translate, commonUtil, useEmbeddedAppStore, useShopify } from '@common';
import { useProductStore } from '@/store/productStore';
import router from '@/router';
import Scanner from "@/components/Scanner.vue";
import ImageModal from '@/components/ImageModal.vue';
import { useUserStore } from '@/store/user'
import { useShipmentStore } from '@/store/shipment';
import { useProductStore as useProduct } from '@/store/product';
import { useUtilStore } from '@/store/util';

const route = router.currentRoute.value;
const shipmentStore = useShipmentStore();
const product = useProduct();
const utilStore = useUtilStore();
const userStore = useUserStore();
const productStore = useProductStore();

const queryString = ref('');
const lastScannedId = ref('');
const productQoh = ref({} as any);
const observer = ref({} as IntersectionObserver);

const current = computed(() => shipmentStore.getCurrent);
const getProduct = computed(() => product.getProduct);
const isForceScanEnabled = computed(() => productStore.isProductStoreSettingEnabled('FORCE_SCAN'));
const barcodeIdentifier = computed(() => productStore.getBarcodeIdentifierPref);
const productIdentificationPref = computed(() => productStore.getProductIdentificationPref);

const getRcvdToOrdrdFraction = (item: any) => {
  return item.quantityAccepted / item.quantityOrdered;
};

const isShipmentReceived = () => {
  return current.value?.statusId === 'PURCH_SHIP_RECEIVED'
};

const openImage = async (imageUrl: string, productName: string) => {
  const imageModal = await modalController.create({
    component: ImageModal,
    componentProps: { imageUrl, productName }
  });
  return imageModal.present();
};

const addProduct = async () => {
  const modal = await modalController.create({
    component: AddProductModal
  })
  modal.onDidDismiss().then(() => {
    product.clearSearchedProducts()
    observeProductVisibility();
  })
  return modal.present();
};

const observeProductVisibility = () => {
  if (observer.value.root) {
    observer.value.disconnect();
  }

  observer.value = new IntersectionObserver((entries: any) => {
    entries.forEach((entry: any) => {
      if (entry.isIntersecting) {
        const productId = entry.target.getAttribute('data-product-id');
        if (productId && !productQoh.value[productId]) {
          fetchQuantityOnHand(productId);
        }
      }
    });
  }, {
    root: null,
    threshold: 0.4
  });

  const products = document.querySelectorAll('.product');
  if (products) {
    products.forEach((product: any) => {
      observer.value.observe(product);
    });
  }
};

const fetchQuantityOnHand = async (productId: any) => {
  productQoh.value[productId] = await product.getInventoryAvailableByFacility(productId);
};

const completeShipment = async () => {
  const alert = await alertController.create({
    header: translate("Receive Shipment"),
    message: translate("Make sure you have entered all the inventory you received. You cannot edit this information after proceeding.", { space: '<br /><br />' }),
    buttons: [
      {
        text: translate("Cancel"),
        role: 'cancel',
      },
      {
        text: translate('Proceed'),
        handler: () => {
          receiveShipment();
        },
      }
    ],
  });
  return alert.present();
};

const receiveShipment = async () => {
  const eligibleItems = current.value.items.filter((item: any) => item.quantityAccepted > 0)
  const shipmentId = current.value.shipment ? current.value.shipment.shipmentId : current.value.shipmentId
  const isShipmentReceived = await shipmentStore.receiveShipmentJson({ items: eligibleItems, shipmentId })
  if (isShipmentReceived) {
    commonUtil.showToast(translate("Shipment received successfully", { shipmentId: shipmentId }))
    router.push('/shipments');
  } else {
    commonUtil.showToast(translate("Failed to receive shipment"))
    shipmentStore.setCurrent({ shipmentId: route.params.id as string })
  }
};

const isEligibleForReceivingShipment = () => {
  return current.value.items.some((item: any) => item.quantityAccepted > 0)
};

const receiveAll = (item: any) => {
  current.value.items.find((ele: any) => {
    if (ele.itemSeqId == item.itemSeqId) {
      ele.quantityAccepted = ele.quantityOrdered;
      ele.progress = ele.quantityAccepted / ele.quantityOrdered
      return true;
    }
  })
};

const updateProductCount = async (payload?: any) => {
  if (queryString.value) payload = queryString.value

  if (!payload) {
    commonUtil.showToast(translate("Please provide a valid barcode identifier."))
    return;
  }
  const result = await shipmentStore.updateShipmentProductCount(payload)

  if (result.isProductFound) {
    commonUtil.showToast(translate("Scanned successfully.", { itemName: payload }))
    lastScannedId.value = payload
    const scannedElement = document.getElementById(payload);
    scannedElement && (scannedElement.scrollIntoView());
    setTimeout(() => {
      lastScannedId.value = ''
    }, 3000)
  } else {
    commonUtil.showToast(translate("Scanned item is not present within the shipment:", { itemName: payload }), {
      buttons: [{
        text: translate('Add'),
        handler: async () => {
          const modal = await modalController.create({
            component: AddProductModal,
            componentProps: { selectedSKU: payload }
          })
          modal.onDidDismiss().then(() => {
            product.clearSearchedProducts()
          })
          return modal.present();
        }
      }]
    })
  }
  queryString.value = ''
};

const scanCode = async () => {
  if (useEmbeddedAppStore().getPosLocationId) {
    try {
      const scannedCode = await useShopify().openPosScanner();
      if (scannedCode) updateProductCount(scannedCode);
    } catch (err) {
      console.error("POS Scanner error:", err);
    }
  } else {
  if (!(await commonUtil.hasWebcamAccess())) {
    commonUtil.showToast(translate("Camera access not allowed, please check permissions."));
    return;
  }
  const modal = await modalController.create({
    component: Scanner,
  });
  modal.onDidDismiss().then((result) => {
    if (result.role) {
      updateProductCount(result.role);
    }
  });
  return modal.present();
  }
};

const searchProduct = () => {
  if (!queryString.value) {
    commonUtil.showToast(translate("Please provide a valid barcode identifier."))
    return;
  }
  const scannedElement = document.getElementById(queryString.value);
  if (scannedElement) {
    lastScannedId.value = queryString.value
    scannedElement.scrollIntoView()
    setTimeout(() => {
      lastScannedId.value = ''
    }, 3000)
  } else {
    commonUtil.showToast(translate("Searched item is not present within the shipment:", { itemName: queryString.value }));
  }
  queryString.value = ''
};

onMounted(async () => {
  await shipmentStore.setCurrent({ shipmentId: route.params.id as string })
  observeProductVisibility();
});

onIonViewDidLeave(() => {
  productQoh.value = {};
});
</script>

<style scoped>
ion-content > main {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}

ion-thumbnail {
  cursor: pointer;
}

.border-top {
  border-top: 1px solid #ccc;
}

.scanned-item {
  /*
    Todo: used outline for highliting items for now, need to use border
    Done this because currently ion-item inside ion-card is not inheriting highlighted background property.
  */
  outline: 2px solid var( --ion-color-medium-tint);
}
</style>
