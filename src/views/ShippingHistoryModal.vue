<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("History") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
        <ion-item v-for="(item, index) in items" :key="index">
          <ion-thumbnail slot="start">
            <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}
            <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
            <p v-if="orderType !== 'transferOrder'">
              {{ translate("Shipment ID") }}: {{ item.shipmentId }}
            </p>
          </ion-label>
          <ion-label>
            <ion-note> {{ item.quantity }} {{ translate('Shipped') }} | {{ item.totalIssuedQuantity }} {{ translate("Ordered") }}</ion-note>
            <ion-note>{{ item.statusDate ? getTime(item.statusDate) : "-" }}</ion-note>
          </ion-label>
        </ion-item>
    </ion-list>

    <!-- Empty state -->
    <div class="empty-state" v-if="items && !items.length">
      <img src="../assets/images/empty-state-history-modal.png" alt="empty state">
      <p v-html="emptyStateMessage"></p>
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
  IonItem,
  IonThumbnail,
  IonList,
  IonLabel,
  IonNote,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import store from '@/store';
import { translate, DxpShopifyImg, getProductIdentificationValue, useProductIdentificationStore } from '@hotwax/dxp-components';
import { computed ,defineProps, onMounted } from 'vue';
import { DateTime } from 'luxon';

    
const props = defineProps({
  productId: String,
  orderItemSeqId: String,
  orderId:String,
  orderType: {
    type: String,
    default: 'purchaseOrder',
    validator: val => ['transferOrder', 'purchaseOrder'].includes(val as any)
  }
})

const productIdentificationStore = useProductIdentificationStore();
let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref);
const shipmentHistory = computed(() => store.getters["transferorder/getShipmentHistory"]);
const getProduct = computed(() => (id: any) => store.getters["product/getProduct"](id));
const items = computed(() => {
  return shipmentHistory.value?.items.filter((item:any) => item.productId == props.productId);
})
const emptyStateMessage= computed(()=>{
  if (props.productId) {
    const product = getProduct.value(props.productId);
    const identifier = getProductIdentificationValue(productIdentificationPref.value.primaryId, product) || getProductIdentificationValue(productIdentificationPref.value.secondaryId, product) ||product?.productName || product.productId;
    return translate("No Shipment have been created against yet", { lineBreak: '<br />', productIdentifier: identifier });
  }
  return translate("No Shipment have been created against this transfer order yet", { lineBreak: '<br />' });
})

function getTime(time:number) {
  return DateTime.fromMillis(time).toFormat("H:mm a dd/MM/yyyy")
}
onMounted(async() => {
  await store.dispatch('transferorder/fetchOutboundShipmentsHistory',{ orderId: props.orderId });
})

const closeModal= ()=>{
  modalController.dismiss({ dismissed: true });
}

</script>

<style scoped>
ion-note {
  display: block;
  text-align: end;
}
</style>