<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button data-testid="return-detail-page-back-btn" default-href="/returns" slot="start"></ion-back-button>
        <ion-title>{{ translate("Return Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content data-testid="return-detail-page-content">
      <main>
        <div class="doc-id">
          <ion-item lines="none">
            <h1> {{ current.shopifyOrderName ? current.shopifyOrderName : current.hcOrderId ? current.hcOrderId : current.externalId ? current.externalId : translate("Return Details") }}</h1>
            <!-- TODO: Fetch Customer name -->
            <!-- <p>{{ translate("Customer: <customer name>")}}</p> -->
          </ion-item>

          <div class="doc-meta">
            <ion-badge :color="statusColorMapping[current.statusDesc]" slot="end">{{ current.statusDesc }}</ion-badge>
            <ion-chip v-if="current.trackingCode" slot="end">{{ current.trackingCode }}</ion-chip>
          </div>
        </div>

        <div class="scanner">
          <ion-item>
            <ion-input data-testid="return-detail-page-scan-search-input" :label="translate(isReturnReceivable(current.statusId) ? 'Scan items' : 'Search items')" autofocus v-model="queryString" @keyup.enter="isReturnReceivable(current.statusId) ? updateProductCount() : searchProduct()" />
          </ion-item>

          <ion-button data-testid="return-detail-page-scan-btn" expand="block" fill="outline" @click="scanCode()" :disabled="!isReturnReceivable(current.statusId)">
            <ion-icon slot="start" :icon="barcodeOutline" />{{ translate("Scan") }}
          </ion-button>
        </div>

        <ion-card :data-testid="`return-detail-page-item-card-${item.productId}`" v-for="item in current.items" :key="item.id" :class="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : ''" :id="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
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
              <ion-button :data-testid="`return-detail-page-fetch-qoh-btn-${item.itemSeqId || item.productId}`" v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
              </ion-button>
              <ion-chip v-else outline>
                {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                <ion-icon color="medium" :icon="cubeOutline"/>
              </ion-chip>
            </div>

            <div class="product-count">
              <ion-item v-if="isReturnReceivable(current.statusId) && item.quantityReceived === 0">
                <ion-input :data-testid="`return-detail-page-qty-input-${item.itemSeqId || item.productId}`" :label="translate('Qty')" :disabled="isForceScanEnabled" label-placement="floating" type="number" min="0" v-model="item.quantityAccepted" />
              </ion-item>
              <ion-item v-else lines="none">
                <ion-label>{{ item.quantityAccepted }} {{ translate("received") }}</ion-label>
              </ion-item>
            </div>
          </div>

          <ion-item lines="none" class="border-top" v-if="item.returnQuantity > 0">
            <ion-button :data-testid="`return-detail-page-receive-all-btn-${item.itemSeqId || item.productId}`" v-if="isReturnReceivable(current.statusId) && item.quantityReceived === 0" :disabled="isForceScanEnabled" @click="receiveAll(item)" slot="start" fill="outline">
              {{ translate("Receive All") }}
            </ion-button>
            <ion-progress-bar :color="getRcvdToOrdrdFraction(item) === 1 ? 'success' : getRcvdToOrdrdFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrdrdFraction(item)" />
            <p slot="end">{{ item.returnQuantity }} {{ translate("returned") }}</p>
          </ion-item>
        </ion-card>
      </main>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button data-testid="return-detail-page-complete-btn" :disabled="!userStore.hasPermission('RECEIVING_ADMIN') || !isEligibleForReceivingReturns()" v-if="isReturnReceivable(current.statusId)" @click="completeShipment">
          <ion-icon :icon="checkmarkDone" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonBadge, IonButton, IonCard, IonChip, IonContent, IonHeader, IonFab, IonFabButton, IonIcon, IonItem, IonInput, IonLabel, IonPage, IonProgressBar, IonThumbnail, IonTitle, IonToolbar, modalController, alertController, onIonViewWillEnter, onIonViewDidLeave } from '@ionic/vue';
import { ref, computed, nextTick } from 'vue';
import { checkmarkDone, cubeOutline, barcodeOutline } from 'ionicons/icons';
import { DxpShopifyImg, translate, commonUtil, useEmbeddedAppStore, useShopify } from '@common';
import { useProductStore } from '@/store/productStore';
import { useReturnStore } from '@/store/return';
import { useProductStore as useProduct } from '@/store/product';
import { useShipmentStore } from '@/store/shipment';
import Scanner from "@/components/Scanner.vue";
import ImageModal from '@/components/ImageModal.vue';
import { useUserStore } from '@/store/user'
import router from '@/router';

const props = defineProps(['shipment']);

const returnStore = useReturnStore();
const product = useProduct();
const shipmentStore = useShipmentStore();
const productStore = useProductStore();
const userStore = useUserStore();
const route = router.currentRoute.value
const queryString = ref('');
const statusColorMapping = {
  'Received': 'success',
  'Approved': 'tertiary',
  'Cancelled': 'danger',
  'Shipped': 'medium',
  'Created': 'medium'
} as any;
const lastScannedId = ref('');
const productQoh = ref({} as any);
const observer = ref(null as IntersectionObserver | null);

const current = computed(() => returnStore.getCurrent);
const getProduct = computed(() => product.getProduct);
const isReturnReceivable = computed(() => returnStore.isReturnReceivable);
const isForceScanEnabled = computed(() => productStore.isProductStoreSettingEnabled('FORCE_SCAN'));
const barcodeIdentifier = computed(() => productStore.getBarcodeIdentifierPref);
const productIdentificationPref = computed(() => productStore.getProductIdentificationPref);

const getRcvdToOrdrdFraction = (item: any) => {
  return item.quantityAccepted / item.returnQuantity;
};

const openImage = async (imageUrl: string, productName: string) => {
  const imageModal = await modalController.create({
    component: ImageModal,
    componentProps: { imageUrl, productName }
  });
  return imageModal.present();
};

const observeProductVisibility = () => {
  if (observer.value) {
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

  nextTick(() => {
    const products = document.querySelectorAll('.product');
    if (products) {
      products.forEach((product: any) => {
        observer.value?.observe(product);
      });
    }
  });
};

const fetchQuantityOnHand = async (productId: any) => {
  productQoh.value[productId] = await product.getInventoryAvailableByFacility(productId);
};

const completeShipment = async () => {
  const alert = await alertController.create({
    header: translate("Receive Shipment"),
    message: translate("Make sure you have entered all the inventory you received. You cannot edit this information after proceeding.", {space: '<br /><br />'}),
    buttons: [
      {
        text: translate("Cancel"),
        role: 'cancel',
      }, 
      {
        text:translate('Proceed'),
        handler: () => {
          receiveReturn();
        },
      }
    ],
  });
  return alert.present();
};

const receiveReturn = async () => {
  const eligibleItems = current.value.items.filter((item: any) => item.quantityAccepted > 0)
  const shipmentId = current.value.shipment ? current.value.shipment.shipmentId : current.value.shipmentId 
  let isReturnReceived = await shipmentStore.receiveReturnShipment({ items: eligibleItems, shipmentId });
  if (isReturnReceived) {
    commonUtil.showToast(translate("Return received successfully", { shipmentId: shipmentId }))
    router.push('/returns');
  } else {
    commonUtil.showToast(translate('Something went wrong'));
    await returnStore.setCurrent({ shipmentId: route.params.id })
  }
};

const isEligibleForReceivingReturns = () => {
  return current.value.items.some((item: any) => item.quantityAccepted > 0)
};

const receiveAll = (item: any) => {
  const ele = current.value.items.find((ele: any) => ele.itemSeqId == item.itemSeqId);
  if (ele) {
    ele.quantityAccepted = ele.returnQuantity;
    ele.progress = ele.quantityAccepted / ele.returnQuantity;
  }
};

const updateProductCount = async (payload?: any) => {
  if (queryString.value) payload = queryString.value;
  if (!isReturnReceivable.value(current.value.statusId)) return;

  const result = await returnStore.updateReturnProductCount(payload);

  if (result.isProductFound) {
    commonUtil.showToast(translate("Scanned successfully.", { itemName: payload }))
    lastScannedId.value = payload
    const scannedElement = document.getElementById(payload);
    scannedElement && (scannedElement.scrollIntoView());

    setTimeout(() => {
      lastScannedId.value = ''
    }, 3000)
  } else {
    commonUtil.showToast(translate("Scanned item is not present within the shipment:", { itemName: payload }))
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

onIonViewWillEnter(async () => {
  await returnStore.setCurrent({ shipmentId: route.params.id })
  observeProductVisibility();
});

onIonViewDidLeave(() => {
  productQoh.value = {};
  if (observer.value) {
    observer.value.disconnect();
  }
});
</script>

<style scoped>
  ion-thumbnail {
    cursor: pointer;
  }

  .scanned-item {
    /*
      Todo: used outline for highliting items for now, need to use border
      Done this because currently ion-item inside ion-card is not inheriting highlighted background property.
    */
    outline: 2px solid var( --ion-color-medium-tint);
  }
</style>
