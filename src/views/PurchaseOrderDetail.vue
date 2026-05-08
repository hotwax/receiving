<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button data-testid="purchase-order-detail-page-back-btn" default-href="/purchase-orders" slot="start" />
        <ion-title> {{ translate("Purchase Order Details") }} </ion-title>
        <ion-buttons slot="end">
          <ion-button data-testid="purchase-order-detail-page-history-btn" @click="receivingHistory()">
            <ion-icon slot="icon-only" :icon="timeOutline"/>
          </ion-button>
          <ion-button data-testid="purchase-order-detail-page-add-product-btn" :disabled="!userStore.hasPermission('RECEIVING_ADMIN') || isPOReceived()" @click="addProduct">
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content data-testid="purchase-order-detail-page-content">
      <main>
        <div class="doc-id">
          <ion-label class="ion-padding">
            <h1>{{ translate("Purchase Order")}}: {{ order.externalOrderId }}</h1>
            <p>{{ translate("Item count") }}: {{ order.items.length }}</p>
          </ion-label>

          <div class="doc-meta">
            <ion-chip data-testid="purchase-order-detail-page-order-id-chip" @click="commonUtil.copyToClipboard(order.orderId, 'Internal ID saved to clipboard')">{{ order.orderId }}<ion-icon :icon="copyOutline"/></ion-chip>
            <ion-badge :color="order.orderStatusId === 'ORDER_CREATED' ? 'medium' : 'primary'">{{ order.orderStatusDesc }}</ion-badge>
          </div>
        </div>

        <div class="scanner">
          <ion-item>
            <ion-input data-testid="purchase-order-detail-page-scan-search-input" :label="translate(isPOReceived() ? 'Search items' : 'Scan items')" label-placement="fixed" autofocus v-model="queryString" @keyup.enter="isPOReceived() ? searchProduct() : updateProductCount()" />
          </ion-item>
          <ion-button data-testid="purchase-order-detail-page-scan-btn" expand="block" fill="outline" @click="scan" :disabled="isPOReceived()">
            <ion-icon slot="start" :icon="cameraOutline" />
            {{ translate("Scan") }}
          </ion-button>
        </div>

        <ion-item lines="none" v-if="!isPOReceived()">
          <ion-label v-if="getPOItems('pending').length > 1" color="medium" class="ion-margin-end">
            {{ translate("Pending: items", { itemsCount: getPOItems('pending').length }) }}
          </ion-label>
          <ion-label v-else color="medium" class="ion-margin-end">
            {{ translate("Pending: item", { itemsCount: getPOItems('pending').length }) }}
          </ion-label>
        </ion-item>

        <template v-if="!isPOReceived()">
          <ion-card :data-testid="`purchase-order-detail-page-pending-item-card-${item.orderItemSeqId || item.productId}`" v-for="(item, index) in getPOItems('pending')" v-show="item.statusId !== 'ITEM_COMPLETED' && item.statusId !== 'ITEM_REJECTED'" :key="index" :class="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
            <div  class="product">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                    <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label class="ion-text-wrap">
                    <h2>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                    <p>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                    <p>{{ commonUtil.getFeatures(getProduct(item.productId).productFeatures) }}</p>
                  </ion-label>
                </ion-item>
              </div>

              <div class="location">
                <LocationPopover :item="item" type="order" :facilityId="currentFacility?.facilityId" />
              </div>

              <div class="product-count">
                <ion-item>
                  <ion-input :data-testid="`purchase-order-detail-page-qty-input-${item.orderItemSeqId || item.productId}`" :label="translate('Qty')" label-placement="floating" type="number" value="0" min="0" v-model="item.quantityAccepted" :disabled="isForceScanEnabled" />
                </ion-item>
              </div>
            </div>

            <div class="action border-top" v-if="item.quantity > 0">
              <div class="receive-all-qty">
                <ion-button :data-testid="`purchase-order-detail-page-receive-all-btn-${item.orderItemSeqId || item.productId}`" @click="receiveAll(item)" :disabled="isForceScanEnabled || isItemReceivedInFull(item)" slot="start" size="small" fill="outline">
                  {{ translate("Receive All") }}
                </ion-button>
              </div>

              <div class="qty-progress">
                <!-- TODO: improve the handling of quantityAccepted -->
                <ion-progress-bar :color="getRcvdToOrderedFraction(item) === 1 ? 'success' : getRcvdToOrderedFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrderedFraction(item)" />
              </div>

              <div class="po-item-history">
                <ion-chip :data-testid="`purchase-order-detail-page-item-history-chip-${item.orderItemSeqId || item.productId}`" outline @click="receivingHistory(item.productId)">
                  <ion-icon :icon="checkmarkDone"/>
                  <ion-label> {{ getPOItemAccepted(item.productId) }} {{ translate("received") }} </ion-label>
                </ion-chip>
              </div>

              <div class="qty-ordered">
                <ion-label>{{ item.quantity }} {{ translate("ordered") }}</ion-label>
              </div>
            </div>
          </ion-card>
        </template>

        <ion-item lines="none" v-if="!isPOReceived()">
          <ion-text v-if="getPOItems('completed').length > 1" color="medium" class="ion-margin-end">
            {{ translate("Completed: items", { itemsCount: getPOItems('completed').length }) }}
          </ion-text>
          <ion-text v-else color="medium" class="ion-margin-end">
            {{ translate("Completed: item", { itemsCount: getPOItems('completed').length }) }}
          </ion-text>
          <ion-button data-testid="purchase-order-detail-page-toggle-completed-btn" size="default" v-if="getPOItems('completed').length" @click="showCompletedItems = !showCompletedItems" color="medium" fill="clear">
            <ion-icon :icon="showCompletedItems ? eyeOutline : eyeOffOutline" slot="icon-only" />
          </ion-button>
        </ion-item>
        
        <ion-card :data-testid="`purchase-order-detail-page-completed-item-card-${item.orderItemSeqId || item.productId}`" v-for="(item, index) in getPOItems('completed')" v-show="showCompletedItems && item.statusId === 'ITEM_COMPLETED'" :key="index" :class="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
          <div class="product">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                  <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                  <p>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  <p>{{ commonUtil.getFeatures(getProduct(item.productId).productFeatures) }}</p>
                </ion-label>
              </ion-item>
            </div>
            
            <div class="location">
              <ion-chip :disabled="true" outline>
                <ion-icon :icon="locationOutline"/>
                <ion-label>{{ item.locationSeqId }}</ion-label>
              </ion-chip>
            </div>
            
            <div>
              <ion-item lines="none">
                <ion-label slot="end">{{ translate("/ received", { receivedCount: getPOItemAccepted(item.productId), orderedCount: item.quantity }) }}</ion-label>
                <ion-icon :icon="(getPOItemAccepted(item.productId) == item.quantity) ? checkmarkDoneCircleOutline : warningOutline" :color="(getPOItemAccepted(item.productId) == item.quantity) ? '' : 'warning'" slot="end" />
              </ion-item>
            </div>
          </div>
        </ion-card>
      </main>  
    </ion-content>

    <ion-footer data-testid="purchase-order-detail-page-footer" v-if="!isPOReceived()">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button data-testid="purchase-order-detail-page-receive-close-btn" fill="outline" size="small" color="primary" :disabled="!userStore.hasPermission('RECEIVING_ADMIN')" class="ion-margin-end" @click="closePO">{{ translate("Receive And Close") }}</ion-button>
          <ion-button data-testid="purchase-order-detail-page-receive-btn" fill="solid" size="small" color="primary" :disabled="!userStore.hasPermission('RECEIVING_ADMIN') || !isEligibileForCreatingShipment()" @click="savePODetails">{{ translate("Receive") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonBadge, IonButton, IonButtons, IonCard, IonChip, IonContent, IonHeader, IonFooter, IonIcon, IonItem, IonInput, IonLabel, IonPage, IonProgressBar, IonText, IonThumbnail, IonTitle, IonToolbar, alertController, modalController, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref } from 'vue';
import { addOutline, cameraOutline, checkmarkDone, checkmarkDoneCircleOutline, copyOutline, eyeOffOutline, eyeOutline, locationOutline, saveOutline, timeOutline, warningOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { DxpShopifyImg, translate, commonUtil, useEmbeddedAppStore, useShopify } from '@common';
import { useRoute, useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue"
import AddProductToPOModal from '@/views/AddProductToPOModal.vue'
import ClosePurchaseOrderModal from '@/components/ClosePurchaseOrderModal.vue'
import LocationPopover from '@/components/LocationPopover.vue'
import ImageModal from '@/components/ImageModal.vue';

import { useOrderStore } from '@/store/order';
import { useProductStore as useProduct } from '@/store/product';
import { useUserStore } from '@/store/user';
import { useProductStore } from '@/store/productStore';
import router from '@/router';

const route = router.currentRoute.value
const orderStore = useOrderStore();
const product = useProduct();
const userStore = useUserStore();
const productStore = useProductStore();



const queryString = ref('');
const showCompletedItems = ref(false);
const lastScannedId = ref('');

const order = computed(() => orderStore.getCurrent);
const getProduct = computed(() => product.getProduct);
const getPOItemAccepted = computed(() => orderStore.getPOItemAccepted);
const isForceScanEnabled = computed(() => productStore.isProductStoreSettingEnabled('FORCE_SCAN'));
const barcodeIdentifier = computed(() => productStore.getBarcodeIdentifierPref);
const productIdentificationPref = computed(() => productStore.getProductIdentificationPref);
const currentFacility = computed(() => productStore.getCurrentFacility);

const isPOReceived = () => order.value.orderStatusId === "ORDER_COMPLETED";

const isItemReceivedInFull = (item: any) => {
  const qtyAlreadyAccepted = getPOItemAccepted.value(item.productId)
  return order.value.items.some((ele: any) => ele.productId == item.productId && qtyAlreadyAccepted >= ele.quantity)
};

const getRcvdToOrderedFraction = (item: any) => {
  return (parseInt(item.quantityAccepted || 0) + getPOItemAccepted.value(item.productId)) / (item.quantity)
};

const openImage = async (imageUrl: string, productName: string) => {
  const imageModal = await modalController.create({
    component: ImageModal,
    componentProps: { imageUrl, productName }
  });
  return imageModal.present();
};

const scan = async () => {
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
  })
  return modal.present();
  }
};

const updateProductCount = async (payload?: any) => {
  if (queryString.value) payload = queryString.value

  if (!payload) {
    commonUtil.showToast(translate("Please provide a valid barcode identifier."))
    return;
  }
  const result = await orderStore.updateProductCount(payload)

  if (result.isCompleted) {
    commonUtil.showToast(translate("Product is already received:", { itemName: payload }))
  } else if (result.isProductFound) {
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
            component: AddProductToPOModal,
            componentProps: { selectedSKU: payload }
          })
          modal.onDidDismiss().then(() => {
            product.clearSearchedProducts();
          })
          return modal.present();
        }
      }]
    })
  }
  queryString.value = ''
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

const getPOItems = (orderType: string) => {
  if (orderType === 'completed') {
    return order.value.items.filter((item: any) => item.statusId === 'ITEM_COMPLETED')
  } else {
    return order.value.items.filter((item: any) => item.statusId !== 'ITEM_COMPLETED' && item.statusId !== 'ITEM_REJECTED')
  }
};

const addProduct = async () => {
  const modal = await modalController.create({
    component: AddProductToPOModal
  })
  modal.onDidDismiss().then(() => {
    product.clearSearchedProducts();
  })
  return modal.present();
};

const receivingHistory = async (productId?: string) => {
  const modal = await modalController.create({
    component: ReceivingHistoryModal,
    componentProps: { productId }
  })
  return modal.present();
};

const savePODetails = async () => {
  const alert = await alertController.create({
    header: translate('Receive inventory'),
    message: translate('Inventory can be received for purchase orders in multiple shipments. Proceeding will receive a new shipment for this purchase order but it will still be available for receiving later', { space: '<br /><br />' }),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel'
    },
    {
      text: translate('Proceed'),
      role: 'proceed',
      handler: () => {
        createShipment();
      }
    }]
  });
  return alert.present();
};

const closePO = async () => {
  const modal = await modalController.create({
    component: ClosePurchaseOrderModal,
    componentProps: {
      isEligibileForCreatingShipment: isEligibileForCreatingShipment()
    }
  })
  return modal.present();
};

const createShipment = async () => {
  const eligibleItems = order.value.items.filter((item: any) => item.quantityAccepted > 0)
  const isShipmentReceived = await orderStore.createAndReceiveIncomingShipment({ items: eligibleItems, orderId: order.value.orderId })
  if (isShipmentReceived) {
    commonUtil.showToast(translate("Purchase order received successfully", { orderId: order.value.orderId }))
    router.push('/purchase-orders')
  } else {
    orderStore.getOrderDetail({ orderId: route.params.slug as string }).then(() => {
      orderStore.fetchPOHistory({ orderId: order.value.orderId })
    })
  }
};

const isEligibileForCreatingShipment = () => {
  return order.value.items.some((item: any) => item.quantityAccepted > 0)
};

const receiveAll = (item: any) => {
  const qtyAlreadyAccepted = getPOItemAccepted.value(item.productId)
  order.value.items.find((ele: any) => {
    if (ele.productId == item.productId) {
      ele.quantityAccepted = ele.quantity - qtyAlreadyAccepted;
      ele.progress = ele.quantityAccepted / ele.quantity;
      return true;
    }
  })
};

onIonViewWillEnter(() => {
  orderStore.getOrderDetail({ orderId: route.params.slug as string }).then(async () => {
    await orderStore.fetchPOHistory({ orderId: order.value.orderId })
    if (isPOReceived()) {
      showCompletedItems.value = true;
    }
  })
});
</script>

<style scoped>

.action {
  display: grid;
  grid: "progressbar ordered"
        "receive     history" 
        / 1fr max-content; 
  gap: var(--spacer-xs);
  padding: var(--spacer-xs);
  align-items: center;
}

.receive-all-qty {
  grid-area: receive;
}

.qty-progress {
  grid-area: progressbar;
}

.po-item-history {
  grid-area: history;
  justify-self: center;
}

.qty-ordered {
  grid-area: ordered;
  text-align: end;
  font-size: 16px;
}

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

@media (min-width: 720px) {
  .doc-id {
    display: flex;
    justify-content: space-between;
    align-items: center;
   }

  .action {
    grid: "receive progressbar history ordered" /  max-content 1fr max-content max-content;
    padding-left: var(--spacer-sm);
  }
}
</style>
