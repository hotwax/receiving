<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="purchase-order-close-items-modal-back-btn" @click="closeModal">
          <ion-icon slot="icon-only" :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Close purchase order items") }}</ion-title>
      <ion-buttons slot="end" @click="selectAllItems">
        <ion-button data-testid="purchase-order-close-items-select-all-btn" color="primary">{{ translate("Select all") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content data-testid="purchase-order-close-items-modal-content">
    <ion-item lines="none">
      <ion-list-header>{{ translate("To close the purchase order, select all.") }}</ion-list-header>
    </ion-item>
    <ion-list>
      <ion-item :button="isPOItemStatusPending(item)" v-for="(item, index) in getPOItems()" :key="index" :data-testid="`purchase-order-close-items-row-${item.orderItemSeqId || item.productId}`" @click="item.isChecked = !item.isChecked">
        <ion-thumbnail slot="start">
          <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p>{{ commonUtil.getFeatures(getProduct(item.productId).productFeatures) }}</p>
        </ion-label>
        <ion-buttons>
          <ion-checkbox aria-label="itemStatus" slot="end" :data-testid="`purchase-order-close-items-select-checkbox-${item.orderItemSeqId || item.productId}`" :modelValue="isPOItemStatusPending(item) ? item.isChecked : true" :disabled="isPOItemStatusPending(item) ? false : true" />
        </ion-buttons>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="purchase-order-close-items-save-btn" :disabled="!userStore.hasPermission('RECEIVING_ADMIN') || !isEligibleToClosePOItems()" @click="confirmSave">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonTitle, IonToolbar, IonThumbnail, alertController, modalController } from '@ionic/vue';
import { useUserStore } from '@/store/user'
import { arrowBackOutline, saveOutline } from 'ionicons/icons';
import { computed, onMounted } from 'vue';
import { useOrderStore } from '@/store/order';
import { useProductStore as useProduct } from '@/store/product';
import { DxpShopifyImg, translate, commonUtil, emitter } from '@common';
import { useProductStore } from '@/store/productStore';
import router from '@/router';

const props = defineProps(['isEligibileForCreatingShipment']);

const orderStore = useOrderStore();
const product = useProduct();
const productStore = useProductStore();
const userStore = useUserStore();

const getProduct = computed(() => product.getProduct);
const getPOItemAccepted = computed(() => orderStore.getPOItemAccepted);
const order = computed(() => orderStore.getCurrent);
const purchaseOrders = computed(() => orderStore.getPurchaseOrders);
const productIdentificationPref = computed(() => productStore.getProductIdentificationPref);

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const itemStatusChangeErrorAlert = async (error: any) => {
  const message = error.response?.data?.error?.message || 'Failed to update the status of purchase order items.';
  const alert = await alertController.create({
    header: translate('Error while receiving'),
    message,
    buttons: [{
      text: translate('Copy & Dismiss'),
      handler: async() => {
        commonUtil.copyToClipboard(message)
        return;
      }
    },
    {
      text: translate('Dismiss'),
      role: 'cancel',
    }]
  });
  await alert.present();
};

const isPOItemStatusPending = (item: any) => {
  return item.statusId !== "ITEM_COMPLETED" && item.statusId !== "ITEM_REJECTED"
};

const updatePOItemStatus = async () => {
  // Shipment can only be created if quantity is specified for atleast one PO item.
  // In some cases we don't need to create shipment instead directly need to close PO items.
  const currentOrder = JSON.parse(JSON.stringify(order.value));
  currentOrder.items.forEach((item: any) => {
    if (item.isChecked && isPOItemStatusPending(item)) {
      item.statusId = 'ITEM_COMPLETED';
    }
  });
  await orderStore.createAndReceiveIncomingShipment({ items: currentOrder.items, orderId: currentOrder.orderId })
  const isPOCompleted = !currentOrder.items.some((item: any) => isPOItemStatusPending(item))
  await orderStore.updateCurrentOrder(currentOrder)

  if(purchaseOrders.value.length) {
    let purchaseOrdersList = JSON.parse(JSON.stringify(purchaseOrders.value))
    if(isPOCompleted) {
      purchaseOrdersList = purchaseOrdersList.filter((purchaseOrder: any) => purchaseOrder.orderId !== currentOrder.orderId)
    }
    await orderStore.updatePurchaseOrders({ purchaseOrders: purchaseOrdersList })
  }
};

const confirmSave = async () => {
  const alert = await alertController.create({
    header: translate('Close purchase order items'),
    message: translate("The selected items won't be available for receiving later."),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel'
    },
    {
      text: translate('Proceed'),
      role: 'proceed',
      handler: async() => {
        emitter.emit("presentLoader", {message: translate('Receiving in progress...'), backdropDismiss: false});
        await updatePOItemStatus()
        modalController.dismiss()
        emitter.emit("dismissLoader");
        router.push('/purchase-orders');
      }
    }]
  });
  return alert.present();
};

const isEligibleToClosePOItems = () => {
  return order.value.items.some((item: any) => item.isChecked && isPOItemStatusPending(item))
};

const selectAllItems = () => {
  order.value.items.map((item:any) => {
    // Purchase Order may contains items without orderId, there status can't be updated
    // Hence not allowing to select those items.
    if(item.orderId && isPOItemStatusPending(item)) {
      item.isChecked = true;
    } 
  })
};

const getPOItems = () => {
  return order.value.items.filter((item: any) => item.orderId)
};

const checkAlreadyFulfilledItems = () => {
  order.value.items.map((item: any) => {
    if(isPOItemStatusPending(item) && getPOItemAccepted.value(item.productId) > 0) {
      item.isChecked = true;
    }
  })
};

onMounted(() => {
  checkAlreadyFulfilledItems()
});
</script>
