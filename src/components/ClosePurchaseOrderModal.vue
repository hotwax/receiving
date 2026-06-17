<template>
  <ion-header>
    <ion-toolbar>
        <ion-buttons slot="start">
        <ion-button data-testid="purchase-order-close-items-modal-back-btn" :aria-label="translate('Back')" @click="closeModal">
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
import { useRouter } from 'vue-router';

const props = defineProps(['isEligibileForCreatingShipment']);

const orderStore = useOrderStore();
const product = useProduct();
const productStore = useProductStore();
const router = useRouter();
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
  return item.orderItemStatusId !== "ITEM_COMPLETED" && item.orderItemStatusId !== "ITEM_REJECTED"
};

const updatePOItemStatus = async () => {
  // Shipment can only be created if quantity is specified for atleast one PO item.
  // In some cases we don't need to create shipment instead directly need to close PO items.
  if(props.isEligibileForCreatingShipment) {
    const eligibleItemsForShipment = order.value.items.filter((item: any) => item.quantityAccepted > 0)
    await orderStore.createPurchaseShipment({ items: eligibleItemsForShipment, orderId: order.value.orderId })
  }

  const eligibleItems = order.value.items.filter((item: any) => item.isChecked && isPOItemStatusPending(item))
  let hasFailedItems = false;
  let completedItems = [] as any;
  let lastItem = {} as any;

  if(eligibleItems.length > 1) {
    const itemsToBatchUpdate = eligibleItems.slice(0, -1);
    lastItem = eligibleItems[eligibleItems.length - 1];
   
    const batchSize = 10;
    while(itemsToBatchUpdate.length) {
      const itemsToUpdate = itemsToBatchUpdate.splice(0, batchSize)

      const responses = await Promise.allSettled(itemsToUpdate.map(async(item: any) => {
        await orderStore.updatePOItemStatus({
          orderId: item.orderId,
          orderItemSeqId: item.orderItemSeqId,
          statusId: "ITEM_COMPLETED"
        })
        return item.orderItemSeqId
      }))

      responses.map((response: any) => {
        if(response.status === "fulfilled") {
          completedItems.push(response.value)
        } else {
          hasFailedItems = true
        }
      })
    }
  } else {
    lastItem = eligibleItems[0]
  }

  try{
    const resp = await orderStore.updatePOItemStatus({
      orderId: lastItem.orderId,
      orderItemSeqId: lastItem.orderItemSeqId,
      statusId: "ITEM_COMPLETED"
    })

    if(!commonUtil.hasError(resp)) {
      completedItems.push(lastItem.orderItemSeqId)
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    hasFailedItems = true;
    await itemStatusChangeErrorAlert(error);
  }

  if(hasFailedItems){
    console.error('Failed to update the status of purchase order items.')
  }

  if(!completedItems.length) return;

  order.value.items.map((item: any) => {
    if(completedItems.includes(item.orderItemSeqId)) {
      item.orderItemStatusId = "ITEM_COMPLETED"
    }
  })
  await orderStore.updateCurrentOrder(order.value)

  if(purchaseOrders.value.length) {
    let purchaseOrdersList = JSON.parse(JSON.stringify(purchaseOrders.value))
    const currentOrder = purchaseOrdersList.find((purchaseOrder: any) => purchaseOrder.groupValue === order.value.orderId)
    let isPOCompleted = true;

    currentOrder.doclist.docs.map((item: any) => {
      if(completedItems.includes(item.orderItemSeqId)) {
        item.orderItemStatusId = "ITEM_COMPLETED"
      } else if(item.orderItemStatusId !== "ITEM_COMPLETED" && item.orderItemStatusId !== "ITEM_REJECTED") {
        isPOCompleted = false
      }
    })

    if(isPOCompleted) {
      purchaseOrdersList = purchaseOrdersList.filter((purchaseOrder: any) => purchaseOrder.groupValue !== currentOrder.groupValue)
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
