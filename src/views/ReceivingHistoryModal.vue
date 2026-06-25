<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="receiving-history-modal-close-btn" @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("History") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content data-testid="receiving-history-modal-content">
    <ion-list v-for="(item, index) in items" :key="index" :data-testid="`receiving-history-modal-list-${item.orderItemSeqId || item.productId || item.shipmentId || item.datetimeReceived || 'entry'}`">
      <ion-item :data-testid="`receiving-history-modal-row-${item.orderItemSeqId || item.productId || item.shipmentId || item.datetimeReceived || 'entry'}`">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          {{ item.receiversFullName }}
        </ion-label>
        <ion-label>
          <ion-note>{{ item.quantityAccepted }} {{ translate("received") }} | {{ item.quantityRejected }} {{ translate("rejected") }}</ion-note>
          <ion-note>{{ item.datetimeReceived ? getTime(item.datetimeReceived) : "-" }}</ion-note>
        </ion-label>
      </ion-item>
    </ion-list>

    <!-- Empty state -->
    <div data-testid="receiving-history-modal-empty-state" class="empty-state" v-if="!items.length">
      <img src="../assets/images/empty-state-history-modal.png" alt="empty state">
      <p v-html="emptyStateMessage"></p>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonThumbnail, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { computed } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { DxpShopifyImg, translate, commonUtil } from '@common';
import { useProductStore as useProduct } from '@/store/product';
import { useProductStore } from '@/store/productStore';
import { useOrderStore } from '@/store/order';
import { useTransferOrderStore } from '@/store/transferorder';
import { DateTime } from 'luxon';

const props = defineProps({
  productId: String,
  orderItemSeqId: String,
  orderType: {
    type: String,
    default: 'purchaseOrder',
    validator: (val: string) => ['transferOrder', 'purchaseOrder'].includes(val)
  }
});

const orderStore = useOrderStore();
const transferOrderStore = useTransferOrderStore();
const product = useProduct();
const productStore = useProductStore();

const poHistory = computed(() => orderStore.getPOHistory);
const toHistory = computed(() => transferOrderStore.getTOHistory);
const getProduct = computed(() => product.getProduct);
const productIdentificationPref = computed(() => productStore.getProductIdentificationPref);

const items = computed(() => {
  const history = props.orderType === 'purchaseOrder' ? poHistory.value : toHistory.value;
  if (!history?.items) return [];
  
  if (props.orderItemSeqId) {
    return history.items.filter((item: any) => item.orderItemSeqId === props.orderItemSeqId)
  } else if (props.productId) {
    return history.items.filter((item: any) => item.productId === props.productId)
  } else {
    return history.items;
  }
});

const emptyStateMessage = computed(() => {
  if (props.productId) {
    const product = getProduct.value(props.productId);
    const identifier =
      commonUtil.getProductIdentificationValue(productIdentificationPref.value.primaryId, product) ||
      commonUtil.getProductIdentificationValue(productIdentificationPref.value.secondaryId, product) ||
      product?.productName ||
      product?.productId;
    return translate("No receipts have been created against yet", { lineBreak: '<br />', productIdentifier: identifier });
  }
  if (props.orderType === 'transferOrder') {
    return translate("No receipts have been created against this transfer order yet", { lineBreak: '<br />' });
  }
  return translate("No shipments have been received against this purchase order yet", { lineBreak: '<br />' });
});

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const getTime = (time: any) => {
  return DateTime.fromMillis(time).toFormat("H:mm a dd/MM/yyyy")
};
</script>

<style scoped>
ion-note {
  display: block;
  text-align: end;
}
</style>
