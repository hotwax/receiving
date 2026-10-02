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
          <ion-button data-testid="transfer-order-detail-page-add-product-btn" :disabled="!userStore.hasPermission(Actions.APP_SHIPMENT_UPDATE) || isTOReceived()" @click="addProduct">
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content data-testid="transfer-order-detail-page-content">
      <main>
        <ion-item v-if="order.cacheError || order.needsReadback" lines="none">
          <ion-label>{{ order.cacheError || translate('Receipt saved. Refresh to load the latest quantities.') }}</ion-label>
          <ion-button slot="end" fill="clear" @click="refreshLocalOrder">{{ translate('Refresh') }}</ion-button>
        </ion-item>
        <ion-item v-if="order.cacheConflict" lines="none">
          <ion-label>
            {{ translate('Transfer quantities changed. Review them before receiving.') }}
            <p v-for="draft in order.missingDrafts" :key="draft.itemKey">{{ translate('Line removed') }}: {{ draft.productId }} ({{ draft.quantityAccepted }})</p>
          </ion-label>
          <ion-button slot="end" fill="clear" @click="transferOrderStore.acknowledgeLocalChanges()">{{ translate("I've reviewed") }}</ion-button>
        </ion-item>
        <div class="doc-id">
          <div class="ion-padding">
            <ion-label>
              <p class="overline">{{ order.orderId }}</p>
              <h1>{{ translate("Transfer Order")}}: {{ order.orderName ? order.orderName : order.externalId ? order.externalId : order.orderId }}</h1>
              <p>{{ translate("Item count") }}: {{ order.items?.length }}</p>
              <p v-if="isReceivingByFulfillment && !isTOReceived()">{{ translate("Unfulfilled items") }}: {{ order.items?.length - fulfilledItems }}</p>
            </ion-label>
            <div v-if="!isTOReceived()" class="shipment-filters" role="group" :aria-label="translate('Filter by shipment box')">
              <ion-chip data-testid="shipment-filter-all" role="button" tabindex="0" :aria-pressed="!selectedPackageKey"
                :outline="!!selectedPackageKey" :color="!selectedPackageKey ? 'primary' : undefined"
                @click="selectPackage('')" @keydown.enter.prevent="selectPackage('')" @keydown.space.prevent="selectPackage('')">
                {{ translate('All shipments') }}
              </ion-chip>
              <ion-chip v-for="pkg in shipmentBoxes" :key="pkg.packageKey" :data-testid="`shipment-filter-${pkg.shipmentId}-${pkg.shipmentPackageSeqId}`"
                role="button" tabindex="0" :aria-pressed="selectedPackageKey === pkg.packageKey"
                :outline="selectedPackageKey !== pkg.packageKey" :color="selectedPackageKey === pkg.packageKey ? 'primary' : undefined"
                @click="selectPackage(pkg.packageKey)" @keydown.enter.prevent="selectPackage(pkg.packageKey)" @keydown.space.prevent="selectPackage(pkg.packageKey)">
                {{ pkg.trackingCode || pkg.shipmentId }} / {{ translate('Box') }} {{ pkg.shipmentPackageSeqId }}
              </ion-chip>
            </div>
            <ion-note v-if="order.shipmentError">{{ order.shipmentError }}</ion-note>
            <ion-note v-else-if="!order.shipmentsReady && !isTOReceived()">{{ translate('Loading shipment contents…') }}</ion-note>
            <ion-note v-if="selectedPackageKey">{{ translate('Showing pending items in this box. Entered quantities are totals across all boxes for this receipt.') }}</ion-note>
            <ion-note v-if="unshippedTrackingMatch">{{ translate('This tracking code belongs to a shipment that has not shipped yet.') }}</ion-note>
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
            <ion-input ref="scanInput" data-testid="transfer-order-detail-page-scan-input" :class="{ 'ion-invalid ion-touched': scanErrorText }" :error-text="scanErrorText" :label="translate('Scan items')" label-placement="fixed" autofocus v-model="queryString" @keyup.enter="updateProductCount(null)" @ionInput="scanErrorText = ''"/>
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

        <ion-toolbar v-if="!isTOReceived() && selectedSegment !== 'received' && !isForceScanEnabled">
          <ion-buttons slot="start">
            <ion-button data-testid="transfer-order-detail-page-receive-all-btn" fill="outline"
              :disabled="!canBulkReceive" @click="markAllAsReceived">
              {{ translate('Auto scan all') }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>

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
                      {{ translate("Scan all") }}
                    </ion-button>
                  </div>

                  <div class="qty-progress">
                    <!-- TODO: improve the handling of quantityAccepted -->
                    <TransferItemProgress :item="item" :value="getRcvdToOrderedFraction(item)" :total="getItemQty(item)"
                      :allocations="getBoxAllocations(item)" :selected-package-key="selectedPackageKey" />
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
            <ion-card :data-testid="`transfer-order-detail-page-open-item-card-${item.orderItemSeqId || item.productId}`" v-for="(item, index) in visibleOpenItems" :key="index" :class="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="commonUtil.getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
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
                    {{ translate("Scan all") }}
                  </ion-button>
                </div>

                <div class="qty-progress">
                  <!-- TODO: improve the handling of quantityAccepted -->
                  <TransferItemProgress :item="item" :value="getRcvdToOrderedFraction(item)" :total="getItemQty(item)"
                      :allocations="getBoxAllocations(item)" :selected-package-key="selectedPackageKey" />
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
            <div data-testid="transfer-order-detail-page-open-empty-state" v-if="!visibleOpenItems.length" class="empty-state">
              <ion-label>
                {{ selectedPackageKey ? translate('No pending items in this box') : translate('No items available for receiving, check completed tab') }}
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
          <ion-button data-testid="transfer-order-detail-page-save-progress-btn" :disabled="!areAllItemsHaveQty || isReceiveFlowBusy || order.cacheConflict || order.needsReadback || !order.ready" class="ion-margin-end" fill="outline" size="small" color="primary" @click="receiveTO">{{ translate("Save Progress") }}{{ ":" }} {{ getReceivedUnits() }}</ion-button>
          <ion-button data-testid="transfer-order-detail-page-receive-complete-btn" :disabled="!areAllItemsHaveQty || isReceiveFlowBusy || order.cacheConflict || order.needsReadback || !order.ready" fill="solid" size="small" color="primary" @click="receiveAndCloseTO">{{ translate("Receive and complete") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonCard, IonChip, IonContent, IonHeader, IonFooter, IonIcon, IonItem, IonInput, IonLabel, IonPage, IonNote, IonSegment, IonSegmentButton, IonText, IonThumbnail, IonTitle, IonToast, IonToolbar, alertController, modalController, onIonViewWillEnter, onIonViewDidLeave } from '@ionic/vue';
import { nextTick, ref, computed, watch } from 'vue';
import { ensureReceivingOrder, receivingDb } from '@/db/receivingClient';
import { addOutline, cameraOutline, checkmarkDone, cubeOutline, informationCircleOutline, openOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { DxpShopifyImg, translate, commonUtil, emitter, useEmbeddedAppStore, useShopify } from '@common';
import { useProductStore } from '@/store/productStore';
import { useTransferOrderStore } from '@/store/transferorder';
import { useUserStore } from '@/store/user';
import { useProductStore as useProduct } from '@/store/product';
import { useUtilStore } from '@/store/util';
import Scanner from "@/components/Scanner.vue"
import ImageModal from '@/components/ImageModal.vue';
import TransferItemProgress from '@/components/TransferItemProgress.vue';
import { buildBoxAllocations } from '@/db/receivingShipments';
import { tuple } from '@/db/receivingDatabase';

import AddProductToTOModal from '@/components/AddProductToTOModal.vue';
import { DateTime } from 'luxon';
import ReceivingInstructions from '@/components/ReceivingInstructions.vue';
import ReceiveTransferOrder from '@/components/ReceiveTransferOrder.vue';
import router from '@/router';
import { useReceiveFlowState } from '@/composables/useReceiveFlowState';
import { runTransferOrderDetailReceiveWorkflow } from '@/views/transferOrderDetailReceiveWorkflow';
import { markItemsAsReceived, remainingIssuedQuantity } from '@/views/transferOrderBulkReceive';
import Actions from "@/authorization/actions";

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
const scanInput = ref();
const selectedPackageKey = ref('');
let trackingSelectionApplied = false;
const showCompletedItems = ref(false);
const lastScannedId = ref('');
const productQoh = ref({} as any);
const pendingQoh = new Set<string>();
const attemptedQoh = new Set<string>();
let qohGeneration = 0;
const detailActive = ref(false);
let detailLoadGeneration = 0;
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
const isForceScanEnabled = computed(() => productStore.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN'));
const isReceivingByFulfillment = computed(() => productStore.isProductStoreSettingEnabled('RECEIVE_BY_FULFILL'));
const barcodeIdentifier = computed(() => productStore.getBarcodeIdentifierPref);
const productIdentificationPref = computed(() => productStore.getProductIdentificationPref);

const toastButtons = [
  {
    text: translate("Receive and complete"),
    handler: async () => receiveAndCloseTO()
  }
];

const boxAllocations = computed(() => buildBoxAllocations(order.value.shipmentPackages || [], order.value.shipmentPackageItems || []));
const getBoxAllocations = (item: any) => boxAllocations.value.get(tuple(item.orderItemSeqId, item.productId)) || [];
const shipmentBoxes = computed(() => (order.value.shipmentPackages || []).filter((pkg: any) =>
  pkg.shipmentStatusId === 'SHIPMENT_SHIPPED' && (order.value.shipmentPackageItems || []).some((row: any) => row.packageKey === pkg.packageKey)));
const inSelectedPackage = (item: any) => !selectedPackageKey.value || getBoxAllocations(item).some(box => box.packageKey === selectedPackageKey.value);
const visibleOpenItems = computed(() => openItems.value.filter(inSelectedPackage));
const unshippedTrackingMatch = computed(() => (order.value.shipmentPackages || []).some((pkg: any) =>
  pkg.trackingCode === router.currentRoute.value.query.tracking && pkg.shipmentStatusId !== 'SHIPMENT_SHIPPED'));
const focusScanner = async () => {
  await nextTick();
  const input = await scanInput.value?.$el?.getInputElement();
  if (detailActive.value) input?.focus({ preventScroll: true });
};
const selectPackage = (packageKey: string) => {
  showAllOpenItems();
  selectedPackageKey.value = packageKey;
  selectedSegment.value = 'open';
  scanErrorText.value = '';
  void focusScanner();
};
watch([() => order.value.shipmentsReady, shipmentBoxes], () => {
  if (!detailActive.value || !order.value.shipmentsReady) return;
  if (selectedPackageKey.value && !shipmentBoxes.value.some((pkg: any) => pkg.packageKey === selectedPackageKey.value)) selectedPackageKey.value = '';
  if (trackingSelectionApplied) return;
  trackingSelectionApplied = true;
  const tracking = router.currentRoute.value.query.tracking;
  const matches = shipmentBoxes.value.filter((pkg: any) => pkg.trackingCode === tracking);
  if (matches.length === 1) selectedPackageKey.value = matches[0].packageKey;
  void focusScanner();
});

const areAllItemsHaveQty = computed(() => {
  if (openItemsTemp.value.length) {
    const isAllItemsReceived = visibleOpenItems.value.every((item: any) => (item.quantityAccepted && Number(item.quantityAccepted) >= 0))
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

const getAllItems = computed(() => (openItemsTemp.value.length ? openItems.value : filteredItems.value).filter((item: any) =>
  inSelectedPackage(item) && (!selectedPackageKey.value || !['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId))));

const receiptItems = computed(() => [...openItems.value, ...openItemsTemp.value].filter(inSelectedPackage));
const bulkReceiptItems = computed(() => selectedSegment.value === 'all' ? getAllItems.value : visibleOpenItems.value);
const canBulkReceive = computed(() => bulkReceiptItems.value.some((item: any) => remainingIssuedQuantity(item) > 0) &&
  userStore.hasPermission(Actions.APP_SHIPMENT_UPDATE) && !isForceScanEnabled.value &&
  !isReceiveFlowBusy.value && !order.value.cacheConflict && !order.value.needsReadback && order.value.ready &&
  (!selectedPackageKey.value || order.value.shipmentsReady && !order.value.shipmentError));

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
  const items = receiptItems.value;
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
    const matches = await transferOrderStore.matchingBarcodeItems(payload);
    const item = openItems.value.find((item: any) => matches.includes(item));

    if (!item) {
      queryString.value = "";
      scanErrorText.value = "Scanned item not found in filtered view, switch to all open items and scan again";
      return;
    }
  }

  if (selectedPackageKey.value && !order.value.shipmentsReady) {
    scanErrorText.value = translate('Shipment contents are still downloading.');
    return;
  }
  const allowedItemKeys = selectedPackageKey.value ? visibleOpenItems.value.map((item: any) => item.itemKey) : undefined;
  const result = await transferOrderStore.updateProductCount(payload, allowedItemKeys);
  if (selectedPackageKey.value && !result.isProductFound && !result.identifiersUnavailable && !result.isAmbiguous) {
    scanErrorText.value = translate('This item is not pending receipt in the selected box. Select another shipment and scan again.');
    queryString.value = '';
    return;
  }

  if (result.identifiersUnavailable) {
    scanErrorText.value = translate('Product identifiers are still downloading. Wait for the download or refresh this transfer.');
  } else if (result.isAmbiguous) {
    scanErrorText.value = translate('This barcode matches multiple lines. Enter the quantity on the correct line.');
  } else if (result.isCompleted) {
    commonUtil.showToast(translate("Product is already received:", { itemName: payload }));
  } else if (result.isProductFound) {
    commonUtil.showToast(translate("Scanned successfully.", { itemName: payload }));
    lastScannedId.value = payload;

    const item = result.item;
    if (item?.statusId === "ITEM_COMPLETED") {
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

          modal.onDidDismiss().then(() => {
            updateVisibleItems();
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
  modal.onDidDismiss().then(() => {
    product.clearSearchedProducts();

    updateVisibleItems();
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

  if (!userStore.hasPermission(Actions.APP_SHIPMENT_UPDATE)) {
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
    message: selectedPackageKey.value ? translate("Only the visible items will be received and completed. Hidden items will stay open.") : translate("All the TO items will be marked as completed"),
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
  return receiptItems.value.some((item: any) => ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) > getItemQty(item));
};

const confirmSaveProgress = async () => {
  dismissToast();
  if (!isEligibleForCreatingShipment() || !userStore.hasPermission(Actions.APP_SHIPMENT_UPDATE)) {
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
      items: receiptItems.value,
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
  if (!isEligibleForCreatingShipment(true) || !userStore.hasPermission(Actions.APP_SHIPMENT_UPDATE)) {
    await receivingAlert();
    return false;
  }

  const itemsNotReceived = [] as any;
  receiptItems.value.forEach((item: any) => {
    if (!(item.quantityAccepted && item.quantityAccepted >= 0)) {
      itemsNotReceived.push(item);
    }
  });
  if (itemsNotReceived.length) {
    openItemsTemp.value = [...openItems.value, ...openItemsTemp.value].filter((item: any) => !itemsNotReceived.includes(item));
    openItems.value = itemsNotReceived;
    document.querySelector("ion-segment")?.scrollIntoView();
    return false;
  }

  const items = receiptItems.value;
  const isAnyItemUnderReceived = items.some((item: any) => ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) != getItemQty(item));
  if (!isAnyItemOverReceived() && !isAnyItemUnderReceived) {
    return confirmComplete();
  }

  const modal = await modalController.create({
    component: ReceiveTransferOrder,
    componentProps: {
      closeTO: true,
      items: receiptItems.value,
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
const receiveAndCloseTO = () => {
  return runReceiveWorkflow(true, confirmReceiveAndClose);
};

const markAllAsReceived = () => {
  if (!canBulkReceive.value) return;
  markItemsAsReceived(bulkReceiptItems.value);
};

const receiveTransferOrder = async (isClosingTO = false) => {
  let eligibleItems: any = [];
  const itemsToReceive = JSON.parse(JSON.stringify(receiptItems.value));
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
    receivedDateTime: String(DateTime.now().toMillis()),
    items: eligibleItems.map((item: any) => ({
      orderItemSeqId: item.orderItemSeqId,
      productId: item.productId,
      quantityAccepted: item.quantityAccepted,
      statusId: item.statusId
    }))
  };

  return submitTransferReceipt(order.value.orderId, payload, selectedPackageKey.value ? {
    baseline: transferOrderStore.baseline.filter(inSelectedPackage), preserveOtherDrafts: true,
  } : undefined);
};

const submitTransferReceipt = async (orderId: string, payload: any, options?: { baseline: any[]; preserveOtherDrafts: boolean }) => {
  try {
    const resp = await transferOrderStore.receiveTransferOrder(orderId, payload, options);
    if (!commonUtil.hasError(resp)) {
      productQoh.value = {};
      attemptedQoh.clear(); pendingQoh.clear();
      qohGeneration++;
      commonUtil.showToast(translate("Transfer order received successfully", { orderId }));
      if (!resp.refreshed) commonUtil.showToast(translate('Receipt saved. Refresh to load the latest quantities.'));
      return true;
    }
  } catch (error: any) {
    commonUtil.showToast(error?.message || translate("Error in receiving transfer order", { orderId: order.value.orderId }));
  }
  return false;
};

const isEligibleForCreatingShipment = (isClosingTO = false) => {
  return receiptItems.value.some((item: any) => !isClosingTO ? (item.quantityAccepted && Number(item.quantityAccepted) > 0) : (item.quantityAccepted && Number(item.quantityAccepted) >= 0));
};

const receiveAll = (item: any) => {
  const qtyAlreadyAccepted = Number(item.totalReceivedQuantity) || 0;
  const qty = isReceivingByFulfillment.value ? item.totalIssuedQuantity : item.quantity;
  item.quantityAccepted = Math.max(qty - qtyAlreadyAccepted, 0);
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
        if (productId && !attemptedQoh.has(productId)) {
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
  if (pendingQoh.has(productId)) return;
  const generation = qohGeneration;
  pendingQoh.add(productId);
  attemptedQoh.add(productId);
  try {
    const value = await product.getInventoryAvailableByFacility(productId);
    if (generation === qohGeneration) productQoh.value[productId] = value;
  } finally { if (generation === qohGeneration) pendingQoh.delete(productId); }
};

const refreshLocalOrder = async () => {
  try { await ensureReceivingOrder(order.value.orderId, true); }
  catch { commonUtil.showToast(translate('Unable to refresh transfer data.')); }
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

const updateVisibleItems = () => {
  filteredItems.value = order.value.items ? [...order.value.items] : [];
  completedItems.value = filteredItems.value.filter((item: any) => item.statusId === 'ITEM_COMPLETED');
  const parkedIds = new Set(openItemsTemp.value.map((item: any) => item.itemKey || item.productId));
  const allOpen = filteredItems.value.filter((item: any) => !['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId));
  openItemsTemp.value = allOpen.filter((item: any) => parkedIds.has(item.itemKey || item.productId));
  openItems.value = allOpen.filter((item: any) => !parkedIds.has(item.itemKey || item.productId));
  fulfilledItems.value = filteredItems.value.filter((item: any) => item.totalIssuedQuantity)?.length;
  showCompletedItems.value = isTOReceived();
  if (detailActive.value) observeProductVisibility();
};
watch(() => order.value.items, updateVisibleItems);

const loadLocalDetail = async () => {
  const generation = ++detailLoadGeneration;
  productQoh.value = {};
  pendingQoh.clear(); attemptedQoh.clear(); qohGeneration++;
  openItemsTemp.value = [];
  selectedPackageKey.value = '';
  trackingSelectionApplied = false;
  selectedSegment.value = 'open';
  try {
    await transferOrderStore.openLocalDetail(String(router.currentRoute.value.params.slug), (productStore.getCurrentFacility as any)?.facilityId);
    if (generation === detailLoadGeneration) updateVisibleItems();
  } catch {
    if (generation === detailLoadGeneration) transferOrderStore.current.cacheError = 'Unable to load transfer details. Refresh to retry.';
  }
};
watch(receivingDb, db => {
  if (!detailActive.value) return;
  if (db) void loadLocalDetail();
  else { detailLoadGeneration++; transferOrderStore.clearTransferOrderDetail(); }
});

onIonViewWillEnter(async () => {
  detailActive.value = true;
  await loadLocalDetail();
});

onIonViewDidLeave(() => {
  detailLoadGeneration++;
  detailActive.value = false;
  transferOrderStore.closeLocalDetail();
  productQoh.value = {};
  qohGeneration++;
  pendingQoh.clear(); attemptedQoh.clear();
  observer.value?.disconnect();
});
</script>

<style scoped>
.shipment-filters {
  display: flex;
  flex-wrap: wrap;
}

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
