<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title v-if="closeTO">{{ translate("Complete transfer order") }}</ion-title>
      <ion-title v-else>{{ translate("Save receiving progress") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item lines="full" v-if="!closeTO">
      <ion-label v-html="translate('Your receiving progress will be saved and will be added to your inventory. Come back to this transfer order and finish receiving later. Fully received items auto close.', { space: '<br /><br />', units: receivedUnitsFraction })"></ion-label>
    </ion-item> 
    <ion-item lines="none">
      <ion-list-header v-if="closeTO">{{ translate("out of items were not received as expected. Please verify them before closing the transfer order", { totalItems: itemsToComplete.length, items: overReceivedTOItems.length }) }}</ion-list-header>
      <ion-list-header v-else>{{ translate("of items was over received or not expected. Please verify them before saving progress", { totalItems: itemsToComplete.length, items: (overReceivedTOItems.length || 0) }) }}</ion-list-header>
    </ion-item>
    <ion-list>
      <ion-item v-for="(item, index) in overReceivedTOItems" :key="index" @click="(item.isChecked = !item.isChecked)">
        <ion-thumbnail slot="start">
          <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
          <template v-if="item.orderItemSeqId">
            <ion-note v-if="!closeTO" color="danger">{{ translate("Over received:") }} {{ getOverReceivedQtyForItem(item) }}</ion-note>
            <ion-note v-else color="danger">{{ getOverReceivedQtyForItem(item) > 0 ? translate("Over received:") : translate("Under received:") }} {{ getOverReceivedQtyForItem(item) }}</ion-note>
          </template>
          <ion-note v-else color="danger">{{ translate("Not expected: ") }} {{ getOverReceivedQtyForItem(item) }}</ion-note>
        </ion-label>
        <ion-checkbox slot="end" :modelValue="item.isChecked">
          <ion-note>{{ "report discrepancy" }}</ion-note>
        </ion-checkbox>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-footer>
    <ion-toolbar class="ion-padding-start">
      <ion-label slot="start">{{ translate("Select all items to proceed") }}</ion-label>
      <ion-buttons slot="end">
        <ion-button fill="solid" color="primary" :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibleToCloseTOItems()" @click="saveProgress">{{ closeTO ? translate("Complete transfer order") : translate("Save progress") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonToolbar,
  IonThumbnail,
  modalController
} from '@ionic/vue';
import { Actions, hasPermission } from '@/authorization'
import { arrowBackOutline } from 'ionicons/icons';
import { computed, defineProps, onMounted, ref } from 'vue';
import { useStore } from 'vuex'
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { getFeatures } from '@/utils';

const store = useStore()
const productIdentificationStore = useProductIdentificationStore();

const getProduct = computed(() => (id: any) => store.getters["product/getProduct"](id));
const order = computed(() => store.getters["transferorder/getCurrent"])
const isReceivingByFulfillment = computed(() => store.getters["util/isReceivingByFulfillment"])
const getOverReceivedQtyForItem = computed(() => (item: any): number => ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0) - ((isReceivingByFulfillment.value ? item.totalIssuedQuantity : item.quantity) || 0)))
let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

let validTOItems = ref([])
let overReceivedTOItems: any = ref([])
let itemsToComplete: any = ref([])
let receivedQty: any = ref(0)

const props = defineProps(["closeTO", "items", "receivedUnitsFraction"])

onMounted(() => {
  validTOItems.value = props.items?.filter((item: any) => !['ITEM_REJECTED', 'ITEM_CANCELLED', 'ITEM_COMPLETED'].includes(item.statusId))
  // Mark all items as completed for which user has entered any qty, this will be equal to all the open items
  itemsToComplete.value = validTOItems.value.filter((item: any) => item.quantityAccepted >= 0)

  if(props.closeTO) {
    overReceivedTOItems.value = itemsToComplete.value.filter((item: any) => ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) != ((isReceivingByFulfillment.value ? item.totalIssuedQuantity : item.quantity) || 0))
  } else {
    overReceivedTOItems.value = itemsToComplete.value.filter((item: any) => ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) > ((isReceivingByFulfillment.value ? item.totalIssuedQuantity : item.quantity) || 0))
  }

  receivedQty.value = itemsToComplete.value.reduce((qty: any, item: any) => qty + (Number(item.quantityAccepted) || 0), 0)
})

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

function saveProgress() {
  modalController.dismiss({ updateItems: true });
}

function isEligibleToCloseTOItems() {
  return overReceivedTOItems.value.every((item: any) => item.isChecked)
}
</script>