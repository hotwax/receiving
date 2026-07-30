<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button data-testid="transfer-order-detail-page-back-btn" default-href="/transfer-orders" slot="start" />
        <ion-title> {{ translate("Transfer Order Details") }} </ion-title>
        <ion-buttons slot="end">
          <ion-button data-testid="transfer-order-detail-page-history-btn" @click="receivingHistory()">
            <ion-icon slot="icon-only" :icon="timeOutline"/>
          </ion-button>
          <ion-button data-testid="transfer-order-detail-page-add-product-btn" :disabled="!userStore.hasPermission('RECEIVING_ADMIN') || isTOReceived()" @click="addProduct">
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content data-testid="transfer-order-detail-page-content">
      <main>
        <div class="doc-id">
          <div class="ion-padding">
            <ion-label>
              <p class="overline">{{ order.orderId }}</p>
              <h1>{{ translate("Transfer Order")}}: {{ order.orderName ? order.orderName : order.externalId ? order.externalId : order.orderId }}</h1>
              <p>{{ translate("Item count") }}: {{ order.items?.length }}</p>
              <p v-if="isReceivingByFulfillment && !isTOReceived()">{{ translate("Unfulfilled items") }}: {{ order.items?.length - fulfilledItems }}</p>
            </ion-label>
            <ion-row>
              <ion-chip v-for="(pkg, index) in trackedPackages" :key="index" @click="commonUtil.copyToClipboard(pkg.trackingCode, 'Tracking code copied to clipboard')">
                {{ pkg.trackingCode }}
                <ion-icon :icon="copyOutline"/>
              </ion-chip>
            </ion-row>
          </div>

          <div class="doc-meta" v-if="!isTOReceived()">
            <ion-item data-testid="transfer-order-detail-page-instructions-btn" button lines="none" @click="openTOReceivingInstructions">
              <ion-icon :icon="informationCircleOutline" slot="start" />
              <ion-label slot="end">
                {{ translate("Finish receiving the open items to complete this transfer order", { items: getTOItems("open").length }) }}
                <p><ion-text color="danger">{{ translate("This transfer order can only be received on one device at a time. Make sure this transfer order is not open on any other device") }}</ion-text></p>
                <p>{{ translate("Tap to learn more") }}</p>
              </ion-label>
            </ion-item>
          </div>
        </div>

        <div class="scanner">
          <ion-item :lines="scanErrorText ? 'none' : 'full'">
            <ion-input data-testid="transfer-order-detail-page-scan-input" :class="{ 'ion-invalid ion-touched': scanErrorText }" :error-text="scanErrorText" :label="translate('Scan items')" label-placement="fixed" autofocus v-model="queryString" @keyup.enter="updateProductCount(null)" @ionInput="scanErrorText = ''"/>
          </ion-item>
          <ion-button data-testid="transfer-order-detail-page-scan-btn" expand="block" fill="outline" @click="scan">
            <ion-icon slot="start" :icon="cameraOutline" />
            {{ translate("Scan") }}
          </ion-button>
        </div>

        <ion-segment data-testid="transfer-order-detail-page-segment" v-if="!isTOReceived()" :value="selectedSegment" @ionChange="segmentChanged($event.detail.value as any)">
          <ion-segment-button data-testid="transfer-order-detail-page-all-tab" value="all" content-id="all">
            <ion-label>{{ translate("All") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="transfer-order-detail-page-open-tab" value="open" content-id="open">
            <ion-label>{{ getTOItems("open")?.length }} {{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="transfer-order-detail-page-received-tab" value="received" content-id="received">
            <ion-label>{{ getTOItems("received")?.length }} {{ translate("Received and completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- TODO: create a common component for the item card -->
        <div v-if="!isTOReceived()">
          <template v-if="selectedSegment === 'all'">
            <ion-item v-if="openItemsTemp.length" lines="none">
              <ion-label color="danger">
                {{ translate("To close this order, enter the actual quantity received or enter '0' if the item was not received.") }}
              </ion-label>
              <ion-button fill="clear" slot="end" @click="showAllOpenItems">
                {{ translate("Back to all items") }}
              </ion-button>
            </ion-item>
            <ion-card :data-testid="`transfer-order-detail-page-all-item-card-${item.orderItemSeqId || item.productId}`" v-for="(item, index) in getAllItems" :key="index">
              <div class="product" :data-product-id="item.productId">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).itemDescription)">
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
                  <ion-button :data-testid="`transfer-order-detail-page-fetch-qoh-btn-${item.orderItemSeqId || item.productId}`" v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>
                  <ion-chip v-else outline>
                    {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                    <ion-icon color="medium" :icon="cubeOutline"/>
                  </ion-chip>
                </div>

                <template v-if="!['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId)">
                  <div class="product-count">
                    <ion-input :data-testid="`transfer-order-detail-page-qty-input-${item.orderItemSeqId || item.productId}`" fill="outline" :class="{ 'ion-invalid ion-touched': openItemsTemp.length }" :label="translate('Qty')" label-placement="floating" type="number" min="0" v-model="item.quantityAccepted" :disabled="isForceScanEnabled" :error-text="openItemsTemp.length ? translate('Input quantity') : ''" />
                  </div>
                </template>
                <template v-else-if="!item.orderItemSeqId">
                  <ion-item lines="none">
                    <ion-label slot="end">
                      {{ translate(' Received', { received: item.quantityAccepted ?? 0 }) }}
                      <p>{{ translate('Manually added') }}</p>
                    </ion-label>
                  </ion-item>
                </template>
                <template v-else>
                  <div>
                    <ion-item lines="none">
                      <ion-label slot="end">{{ translate(' Received | Fulfilled | Ordered',{ received: item.totalReceivedQuantity ?? 0, fulfilled:item.totalIssuedQuantity ?? 0 , ordered: item.quantity }) }}</ion-label>
                    </ion-item>
                  </div>
                </template>
              </div>

              <template v-if="!['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId)">
                <div class="action border-top" v-if="item.orderItemSeqId">
                  <div class="receive-all-qty">
                    <ion-button :data-testid="`transfer-order-detail-page-receive-all-btn-${item.orderItemSeqId || item.productId}`" @click="receiveAll(item)" :disabled="isForceScanEnabled || isItemReceivedInFull(item)" slot="start" size="small" fill="outline">
                      {{ translate("Receive All") }}
                    </ion-button>
                  </div>

                  <div class="qty-progress">
                    <!-- TODO: improve the handling of quantityAccepted -->
                    <ion-progress-bar :color="getRcvdToOrderedFraction(item) === 1 ? 'success' : getRcvdToOrderedFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrderedFraction(item)" />
                  </div>

                  <div class="to-item-history">
                    <ion-chip :data-testid="`transfer-order-detail-page-item-history-chip-${item.orderItemSeqId || item.productId}`" outline @click="receivingHistory(item.productId, item.orderItemSeqId)">
                      <ion-icon :icon="checkmarkDone"/>
                      <ion-label> {{ item.totalReceivedQuantity ?? 0 }} {{ translate("received") }} </ion-label>
                    </ion-chip>
                  </div>

                  <div class="qty-ordered">
                    <ion-label v-if="isReceivingByFulfillment">{{ item.totalIssuedQuantity || 0 }} {{ translate("fulfilled") }}</ion-label>
                    <ion-label v-else>{{ item.quantity }} {{ translate("ordered") }}</ion-label>
                  </div>
                </div>
              </template>
            </ion-card>
            <ion-item v-if="openItemsTemp.length" lines="none">
              <ion-label>
                {{ openItemsTemp.length }} {{ translate("more items are ready to be received") }}
              </ion-label>
            </ion-item>
          </template>
          <template v-if="selectedSegment === 'open'">
            <ion-item v-if="openItemsTemp.length" lines="none">
              <ion-label color="danger">
                {{ translate("To close this order, enter the actual quantity received or enter '0' if the item was not received.") }}
              </ion-label>
              <ion-button fill="clear" slot="end" @click="showAllOpenItems">
                {{ translate("Back to open items") }}
              </ion-button>
            </ion-item>
            <ion-card :data-testid="`transfer-order-detail-page-open-item-card-${item.orderItemSeqId || item.productId}`" v-for="(item, index) in openItems" :key="index" :class="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
              <div class="product" :data-product-id="item.productId">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).itemDescription)">
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
                  <ion-button :data-testid="`transfer-order-detail-page-open-fetch-qoh-btn-${item.orderItemSeqId || item.productId}`" color="medium" v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                    <ion-icon slot="icon-only" :icon="cubeOutline" />
                  </ion-button>
                  <ion-chip v-else outline>
                    {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                    <ion-icon color="medium" :icon="cubeOutline"/>
                  </ion-chip>
                </div>

                <div class="product-count">
                  <ion-input :data-testid="`transfer-order-detail-page-open-qty-input-${item.orderItemSeqId || item.productId}`" fill="outline" :class="{ 'ion-invalid ion-touched': openItemsTemp.length }" :label="translate('Qty')" label-placement="floating" type="number" min="0" v-model="item.quantityAccepted" :disabled="isForceScanEnabled" :error-text="openItemsTemp.length ? translate('Input quantity') : ''" />
                </div>
              </div>

              <div class="action border-top" v-if="item.orderItemSeqId">
                <div class="receive-all-qty">
                  <ion-button :data-testid="`transfer-order-detail-page-open-receive-all-btn-${item.orderItemSeqId || item.productId}`" @click="receiveAll(item)" :disabled="isForceScanEnabled || isItemReceivedInFull(item)" size="small" fill="outline">
                    {{ translate("Receive All") }}
                  </ion-button>
                </div>

                <div class="qty-progress">
                  <!-- TODO: improve the handling of quantityAccepted -->
                  <ion-progress-bar :color="getRcvdToOrderedFraction(item) === 1 ? 'success' : getRcvdToOrderedFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrderedFraction(item)" />
                </div>

                <div class="to-item-history">
                  <ion-chip :data-testid="`transfer-order-detail-page-open-history-chip-${item.orderItemSeqId || item.productId}`" outline @click="receivingHistory(item.productId, item.orderItemSeqId)">
                    <ion-icon :icon="checkmarkDone"/>
                    <ion-label> {{ item.totalReceivedQuantity ?? 0 }} {{ translate("received") }} </ion-label>
                  </ion-chip>
                </div>

                <div class="qty-ordered">
                  <ion-label v-if="isReceivingByFulfillment">{{ item.totalIssuedQuantity || 0 }} {{ translate("fulfilled") }}</ion-label>
                  <ion-label v-else>{{ item.quantity }} {{ translate("ordered") }}</ion-label>
                </div>
              </div>
            </ion-card>
            <div data-testid="transfer-order-detail-page-open-empty-state" v-if="!openItems?.length" class="empty-state">
              <ion-label>
                {{ "No items available for receiving, check completed tab" }}
              </ion-label>
              <ion-button data-testid="transfer-order-detail-page-open-empty-received-btn" fill="clear" @click="segmentChanged('received')">
                <ion-icon slot="icon-only" :icon="openOutline" />
              </ion-button>
            </div>
            <ion-item v-if="openItemsTemp.length" lines="none">
              <ion-label>
                {{ openItemsTemp.length }} {{ translate("more items are ready to be received") }}
              </ion-label>
            </ion-item>
          </template>
          <template v-if="selectedSegment === 'received'">
            <ion-card :data-testid="`transfer-order-detail-page-received-item-card-${item.orderItemSeqId || item.productId}`" v-for="(item, index) in completedItems" :key="index" :class="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
              <div class="product" :data-product-id="item.productId">
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
                  <ion-button :data-testid="`transfer-order-detail-page-received-fetch-qoh-btn-${item.orderItemSeqId || item.productId}`" v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>
                  <ion-chip v-else outline>
                    {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                    <ion-icon color="medium" :icon="cubeOutline"/>
                  </ion-chip>
                </div>

                <div>
                  <ion-item lines="none">
                    <ion-label slot="end">
                      <template v-if="!item.orderItemSeqId">
                        {{ translate(' Received', { received: item.quantityAccepted ?? 0 }) }}
                        <p>{{ translate('Manually added') }}</p>
                      </template>
                      <template v-else>
                        {{ translate(' Received | Fulfilled | Ordered',{ received: item.totalReceivedQuantity ?? 0, fulfilled:item.totalIssuedQuantity ?? 0 , ordered: item.quantity }) }}
                      </template>
                    </ion-label>
                  </ion-item>
                </div>
              </div>
            </ion-card>
            <div data-testid="transfer-order-detail-page-received-empty-state" v-if="!completedItems?.length" class="empty-state">
              <ion-label>
                {{ "No items are marked as completed, check Open tab" }}
              </ion-label>
              <ion-button data-testid="transfer-order-detail-page-received-empty-open-btn" fill="clear" @click="segmentChanged('open')">
                <ion-icon slot="icon-only" :icon="openOutline" />
              </ion-button>
            </div>
          </template>
        </div>

        <!-- TODO: update UI to have this information using the segment view -->
        <template v-if="isTOReceived()">
          <ion-card :data-testid="`transfer-order-detail-page-completed-item-card-${item.orderItemSeqId || item.productId}`" v-for="(item, index) in completedItems" :key="index" :class="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
            <div class="product" :data-product-id="item.productId">
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
                <ion-button :data-testid="`transfer-order-detail-page-completed-fetch-qoh-btn-${item.orderItemSeqId || item.productId}`" v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                  <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                </ion-button>
                <ion-chip v-else outline>
                  {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                  <ion-icon color="medium" :icon="cubeOutline"/>
                </ion-chip>
              </div>

              <div>
                <ion-item lines="none">
                  <ion-label slot="end">
                    <template v-if="!item.orderItemSeqId">
                      {{ translate(' Received', { received: item.quantityAccepted ?? 0 }) }}
                      <p>{{ translate('Manually added') }}</p>
                    </template>
                    <template v-else>
                      {{ translate(' Received | Fulfilled | Ordered',{ received: item.totalReceivedQuantity ?? 0, fulfilled:item.totalIssuedQuantity ?? 0 , ordered: item.quantity }) }}
                    </template>
                  </ion-label>
                </ion-item>
              </div>
            </div>
          </ion-card>
        </template>
      </main>

      <ion-toast
        :isOpen="isToastOpen"
        :message="translate('All items are ready for receiving')"
        position="bottom"
        :buttons="toastButtons"
        position-anchor="footer"
      ></ion-toast>
    </ion-content>

    <ion-footer data-testid="transfer-order-detail-page-footer" id="footer" ref="footer" v-if="!isTOReceived() && selectedSegment !== 'received'">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button data-testid="transfer-order-detail-page-save-progress-btn" :disabled="!areAllItemsHaveQty || isReceiveFlowBusy" class="ion-margin-end" fill="outline" size="small" color="primary" @click="receiveTO">{{ translate("Save Progress") }}{{ ":" }} {{ getReceivedUnits() }}</ion-button>
          <ion-button data-testid="transfer-order-detail-page-receive-complete-btn" :disabled="!areAllItemsHaveQty || isReceiveFlowBusy" fill="solid" size="small" color="primary" @click="receiveAndCloseTO">{{ translate("Receive and complete") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonCard, IonChip, IonContent, IonHeader, IonFooter, IonIcon, IonItem, IonInput, IonLabel, IonPage, IonProgressBar, IonRow, IonSegment, IonSegmentButton, IonText, IonThumbnail, IonTitle, IonToast, IonToolbar, alertController, modalController, onIonViewWillEnter, onIonViewDidLeave } from '@ionic/vue';
import { nextTick, ref, computed } from 'vue';
import { addOutline, cameraOutline, checkmarkDone, copyOutline, cubeOutline, informationCircleOutline, openOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { DxpShopifyImg, translate, commonUtil, emitter, useEmbeddedAppStore, useShopify } from '@common';
import { useProductStore } from '@/store/productStore';
import { useTransferOrderStore } from '@/store/transferorder';
import { useUserStore } from '@/store/user';
import { useProductStore as useProduct } from '@/store/product';
import { useUtilStore } from '@/store/util';
import Scanner from "@/components/Scanner.vue"
import ImageModal from '@/components/ImageModal.vue';

import AddProductToTOModal from '@/components/AddProductToTOModal.vue';
import { DateTime } from 'luxon';
import ReceivingInstructions from '@/components/ReceivingInstructions.vue';
import ReceiveTransferOrder from '@/components/ReceiveTransferOrder.vue';
import router from '@/router';
import { useReceiveFlowState } from '@/composables/useReceiveFlowState';
import { runTransferOrderDetailReceiveWorkflow } from '@/views/transferOrderDetailReceiveWorkflow';

const transferOrderStore = useTransferOrderStore();
const product = useProduct();
const utilStore = useUtilStore();
const userStore = useUserStore();
const productStore = useProductStore();
const {
  isBusy: isReceiveFlowBusy,
  startConfirmation: startReceiveConfirmation,
  startSubmission: startReceiveSubmission,
  reset: resetReceiveFlow
} = useReceiveFlowState();

const queryString = ref('');
const showCompletedItems = ref(false);
const lastScannedId = ref('');
const productQoh = ref({} as any);
const observer = ref(null as IntersectionObserver | null);
const selectedSegment = ref("open");
const filteredItems = ref([] as any);
const openItems = ref([] as any);
const completedItems = ref([] as any);
const openItemsTemp = ref([] as any);
const fulfilledItems = ref(0);
const isToastOpen = ref(false);
const scanErrorText = ref("");

const order = computed(() => transferOrderStore.getCurrent);
const getProduct = computed(() => product.getProduct);
const isForceScanEnabled = computed(() => productStore.isProductStoreSettingEnabled('FORCE_SCAN'));
const isReceivingByFulfillment = computed(() => productStore.isProductStoreSettingEnabled('RECEIVE_BY_FULFILLMENT'));
const barcodeIdentifier = computed(() => productStore.getBarcodeIdentifierPref);
const productIdentificationPref = computed(() => productStore.getProductIdentificationPref);

const toastButtons = [
  {
    text: translate("Receive and complete"),
    handler: async () => receiveAndCloseTO()
  }
];

const trackedPackages = computed(() => order.value?.shipmentPackages?.filter((pkg: any) => pkg.trackingCode) || []);

const areAllItemsHaveQty = computed(() => {
  if (openItemsTemp.value.length) {
    const isAllItemsReceived = openItems.value.every((item: any) => (item.quantityAccepted && Number(item.quantityAccepted) >= 0))
    if (isAllItemsReceived) {
      displayToast();
    } else {
      dismissToast();
    }
    return isAllItemsReceived
  } else {
    return true;
  }
});

const getTOItems = (orderType: string) => {
  let items: Array<any> = [];
  if (!order.value.items) return items;
  if (orderType === "received") {
    items = order.value.items.filter((item: any) => item.statusId === 'ITEM_COMPLETED')
  } else if (orderType === "open") {
    items = order.value.items.filter((item: any) => !['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId))
  } else {
    items = order.value.items
  }
  return items;
};

const getAllItems = computed(() => openItemsTemp.value.length ? openItems.value : filteredItems.value);

const displayToast = () => {
  isToastOpen.value = true;
};

const dismissToast = () => {
  isToastOpen.value = false;
};

const getItemQty = (item: any) => {
  return (isReceivingByFulfillment.value ? Number(item.totalIssuedQuantity) : Number(item.quantity)) || 0;
};

const getReceivedUnits = () => {
  const items = [...openItems.value, ...openItemsTemp.value];
  const totalReceived = items.reduce((qty: any, item: any) => qty + (Number(item.quantityAccepted) || 0), 0);
  const totalUnits = items.reduce((qty: any, item: any) => qty + ((isReceivingByFulfillment.value ? item.totalIssuedQuantity : item.quantity) - item.totalReceivedQuantity || 0), 0);
  return `${totalReceived} / ${totalUnits >= 0 ? totalUnits : 0} units`;
};

const segmentChanged = (value: string) => {
  selectedSegment.value = value;
};

const isItemReceivedInFull = (item: any) => {
  return (Number(item.totalReceivedQuantity) || 0) >= getItemQty(item);
};

const getRcvdToOrderedFraction = (item: any) => {
  const totalQty = (Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0);
  if (!totalQty) {
    return 0;
  }
  return ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) / ((isReceivingByFulfillment.value ? Number(item.totalIssuedQuantity) : Number(item.quantity)) || (isReceivingByFulfillment.value ? 0 : 1));
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
    if (result.role && result.role !== 'backdrop') {
      updateProductCount(result.role);
    }
  });
  return modal.present();
  }
};

const updateProductCount = async (payload: any) => {
  if (queryString.value) payload = queryString.value;

  if (!payload) {
    commonUtil.showToast(translate("Please provide a valid barcode identifier."));
    return;
  }

  if (openItemsTemp.value.length) {
    const item = openItems.value.find((item: any) => commonUtil.getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(item.productId)) === payload);

    if (!item) {
      queryString.value = "";
      scanErrorText.value = "Scanned item not found in filtered view, switch to all open items and scan again";
      return;
    }
  }

  const result = await transferOrderStore.updateProductCount(payload);

  if (result.isCompleted) {
    commonUtil.showToast(translate("Product is already received:", { itemName: payload }));
  } else if (result.isProductFound) {
    commonUtil.showToast(translate("Scanned successfully.", { itemName: payload }));
    lastScannedId.value = payload;

    const item = filteredItems.value.find((item: any) => commonUtil.getProductIdentificationValue(barcodeIdentifier.value, getProduct.value(item.productId)) === payload);
    if (item.statusId === "ITEM_COMPLETED") {
      segmentChanged("received");
    } else {
      segmentChanged("open");
    }

    await nextTick();

    const scannedElement = document.getElementById(payload);
    scannedElement && (scannedElement.scrollIntoView({ behavior: 'smooth', block: 'center' }));

    setTimeout(() => {
      lastScannedId.value = '';
    }, 3000);
  } else {
    commonUtil.showToast(translate("Scanned item is not present within the shipment:", { itemName: payload }), {
      buttons: [{
        text: translate('Add'),
        handler: async () => {
          const modal = await modalController.create({
            component: AddProductToTOModal,
            componentProps: { selectedSKU: payload }
          });

          modal.onDidDismiss().then((value: any) => {
            if (value.data.product?.productId) {
              openItems.value.push(value.data.product);
              filteredItems.value.push(value.data.product);
            }
            product.clearSearchedProducts();
          });

          return modal.present();
        }
      }]
    });
  }
  queryString.value = '';
};

const addProduct = async () => {
  const modal = await modalController.create({
    component: AddProductToTOModal
  });
  modal.onDidDismiss().then((value: any) => {
    product.clearSearchedProducts();

    if (value.data.product?.productId) {
      openItems.value.push(value.data.product);
      filteredItems.value.push(value.data.product);
    }

    observeProductVisibility();
  });
  return modal.present();
};

const receivingHistory = async (productId?: string, orderItemSeqId?: string) => {
  const modal = await modalController.create({
    component: ReceivingHistoryModal,
    componentProps: {
      productId,
      orderItemSeqId,
      orderType: 'transferOrder'
    }
  });
  return modal.present();
};

const receivingAlert = async () => {
  let message = "Specify quantity for at least one of the items to receive";

  if (!userStore.hasPermission('RECEIVING_ADMIN')) {
    message = "You do not have permission to receive items";
  }

  const alert = await alertController.create({
    header: translate("Receiving"),
    message: translate(message),
    buttons: [{
      text: translate("Ok"),
      role: "cancel"
    }]
  });

  await alert.present();
  await alert.onDidDismiss();
};

const confirmComplete = async () => {
  const alert = await alertController.create({
    header: translate("Close transfer order items"),
    message: translate("All the TO items will be marked as completed"),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    },
    {
      text: translate("Proceed"),
      role: "proceed"
    }]
  });
  await alert.present();
  const result = await alert.onDidDismiss();
  return result.role === 'proceed';
};

const isAnyItemOverReceived = () => {
  return [...openItems.value, ...openItemsTemp.value].some((item: any) => ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) > getItemQty(item));
};

const confirmSaveProgress = async () => {
  dismissToast();
  if (!isEligibleForCreatingShipment() || !userStore.hasPermission('RECEIVING_ADMIN')) {
    await receivingAlert();
    return false;
  }

  if (!isAnyItemOverReceived()) {
    const alert = await alertController.create({
      header: translate("Save progress and receive more later"),
      message: translate("Your receiving progress will be saved and will be added to your inventory. Come back to this transfer order and finish receiving later. Fully received items auto close.", { space: "<br /><br />", units: getReceivedUnits() }),
      buttons: [{
        text: translate('Cancel'),
        role: 'cancel'
      },
      {
        text: translate('Proceed'),
        role: 'proceed'
      }]
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'proceed';
  }

  const modal = await modalController.create({
    component: ReceiveTransferOrder,
    componentProps: {
      items: filteredItems.value,
      receivedUnitsFraction: getReceivedUnits()
    }
  });

  await modal.present();
  const value = await modal.onDidDismiss();
  filteredItems.value.forEach((item: any) => item.isChecked = false);
  return Boolean(value?.data?.updateItems);
};

const showAllOpenItems = () => {
  openItems.value = [...openItemsTemp.value, ...openItems.value].sort((a, b) => (Number(a.orderItemSeqId) || 0) - (Number(b.orderItemSeqId) || 0));
  openItemsTemp.value = [];
};

const confirmReceiveAndClose = async () => {
  dismissToast();
  if (!isEligibleForCreatingShipment(true) || !userStore.hasPermission('RECEIVING_ADMIN')) {
    await receivingAlert();
    return false;
  }

  const itemsReceived = [] as any;
  const itemsNotReceived = [] as any;
  openItems.value.map((item: any) => {
    if (!(item.quantityAccepted && item.quantityAccepted >= 0)) {
      itemsNotReceived.push(item);
    } else {
      itemsReceived.push(item);
    }
  });
  if (itemsNotReceived.length) {
    openItemsTemp.value = itemsReceived;
    openItems.value = itemsNotReceived;
    document.querySelector("ion-segment")?.scrollIntoView();
    return false;
  }

  const items = [...openItems.value, ...openItemsTemp.value];
  const isAnyItemUnderReceived = items.some((item: any) => ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) != getItemQty(item));
  if (!isAnyItemOverReceived() && !isAnyItemUnderReceived) {
    return confirmComplete();
  }

  const modal = await modalController.create({
    component: ReceiveTransferOrder,
    componentProps: {
      closeTO: true,
      items: filteredItems.value,
      receivedUnitsFraction: getReceivedUnits()
    }
  });

  await modal.present();
  const value = await modal.onDidDismiss();
  filteredItems.value.forEach((item: any) => item.isChecked = false);
  return Boolean(value?.data?.updateItems);
};

const runReceiveWorkflow = (isClosingTO: boolean, confirm: () => Promise<boolean>) => {
  return runTransferOrderDetailReceiveWorkflow({
    startConfirmation: startReceiveConfirmation,
    startSubmission: startReceiveSubmission,
    reset: resetReceiveFlow,
    confirm,
    submit: () => receiveTransferOrder(isClosingTO),
    navigate: async () => {
      await router.push('/transfer-orders');
    },
    onSubmissionStart: () => {
      emitter.emit("presentLoader", { message: translate("Receiving in progress..."), backdropDismiss: false });
    },
    onSubmissionEnd: () => {
      emitter.emit("dismissLoader");
    }
  });
};

const receiveTO = () => runReceiveWorkflow(false, confirmSaveProgress);
const receiveAndCloseTO = () => runReceiveWorkflow(true, confirmReceiveAndClose);

const receiveTransferOrder = async (isClosingTO = false) => {
  let eligibleItems: any = [];
  const itemsToReceive = JSON.parse(JSON.stringify([...openItems.value, ...openItemsTemp.value]));
  if (!isClosingTO) {
    itemsToReceive.forEach((item: any) => {
      const isItemFullyReceived = item.quantityAccepted >= 0 && ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) >= getItemQty(item);
      if (isItemFullyReceived) {
        item.statusId = "ITEM_COMPLETED";
      }

      if (item.quantityAccepted > 0) {
        eligibleItems.push(item);
      }
    });
  } else {
    eligibleItems = itemsToReceive.map((item: any) => ({
      ...item,
      statusId: "ITEM_COMPLETED"
    }));
  }

  const payload = {
    facilityId: (productStore.getCurrentFacility as any)?.facilityId,
    receivedDateTime: DateTime.now().toMillis(),
    items: eligibleItems.map((item: any) => ({
      orderItemSeqId: item.orderItemSeqId,
      productId: item.productId,
      quantityAccepted: item.quantityAccepted,
      statusId: item.statusId
    }))
  };

  try {
    const resp = await transferOrderStore.receiveTransferOrder(order.value.orderId, payload);
    if (!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Transfer order received successfully", { orderId: order.value.orderId }));
      return true;
    }
  } catch (error) {
    commonUtil.showToast(translate("Error in receiving transfer order", { orderId: order.value.orderId }));
  }
  return false;
};

const isEligibleForCreatingShipment = (isClosingTO = false) => {
  return [...openItems.value, ...openItemsTemp.value]?.some((item: any) => !isClosingTO ? (item.quantityAccepted && Number(item.quantityAccepted) > 0) : (item.quantityAccepted && Number(item.quantityAccepted) >= 0));
};

const receiveAll = (item: any) => {
  const qtyAlreadyAccepted = Number(item.totalReceivedQuantity) || 0;
  const qty = isReceivingByFulfillment.value ? item.totalIssuedQuantity : item.quantity;
  item.quantityAccepted = Math.max(qty - qtyAlreadyAccepted, 0);
  item.progress = item.quantityAccepted / qty;
};

const isTOReceived = () => order.value.statusId === "ORDER_COMPLETED";

const observeProductVisibility = () => {
  if (observer.value) {
    observer.value.disconnect();
  }

  observer.value = new IntersectionObserver((entries: any) => {
    entries.forEach((entry: any) => {
      if (entry.isIntersecting) {
        const productId = entry.target.getAttribute('data-product-id');
        if (productId && (!productQoh.value[productId] && productQoh.value[productId] !== 0)) {
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

const openTOReceivingInstructions = async () => {
  const modal = await modalController.create({
    component: ReceivingInstructions,
    componentProps: {
      openItems: [...openItems.value, ...openItemsTemp.value].length,
      items: filteredItems.value.length
    }
  });
  return modal.present();
};

onIonViewWillEnter(async () => {
  emitter.emit('presentLoader', { backdropDismiss: false, message: translate("Fetching details...") });
  transferOrderStore.clearTransferOrderDetail();

  await transferOrderStore.fetchMisShippedItems({ orderId: router.currentRoute.value.params.slug });
  await transferOrderStore.fetchTransferOrderDetail({ orderId: router.currentRoute.value.params.slug });
  await transferOrderStore.fetchTOHistory({
    payload: {
      orderId: order.value.orderId,
      orderByField: "-datetimeReceived"
    }
  });
  if (isTOReceived()) {
    showCompletedItems.value = true;
  }

  filteredItems.value = order.value.items ? [...order.value.items] : [];
  completedItems.value = filteredItems.value.filter((item: any) => item.statusId === 'ITEM_COMPLETED');
  openItems.value = filteredItems.value.filter((item: any) => !['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId));
  fulfilledItems.value = filteredItems.value.filter((item: any) => item.totalIssuedQuantity)?.length;

  observeProductVisibility();
  emitter.emit('dismissLoader');
});

onIonViewDidLeave(() => {
  productQoh.value = {};
  if (observer.value) {
    observer.value.disconnect();
  }
});
</script>

<style scoped>
.doc-meta {
  flex-basis: 60%;
}

.doc-meta > ion-item {
  --border-color: var(--ion-color-medium);
  --border-radius: 8px;
  --border-width: 1px;
}

.scanner {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: var(--ion-background-color);
  padding: var(--spacer-base);
}

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

.to-item-history {
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
