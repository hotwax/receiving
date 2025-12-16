<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/transfer-orders" slot="start" />
        <ion-title> {{ translate("Transfer Order Details") }} </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="receivingHistory()">
            <ion-icon slot="icon-only" :icon="timeOutline"/>
          </ion-button>
          <ion-button :disabled="!hasPermission(Actions.APP_SHIPMENT_ADMIN) || isTOReceived()" @click="addProduct">
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="doc-id">
          <div>
            <ion-label class="ion-padding">
              <p class="overline">{{ order.orderId }}</p>
              <h1>{{ translate("Transfer Order")}}: {{ order.orderName ? order.orderName : order.externalId ? order.externalId : order.orderId }}</h1>
              <p>{{ translate("Item count") }}: {{ order.items?.length }}</p>
              <p v-if="isReceivingByFulfillment && !isTOReceived()">{{ translate("Unfulfilled items") }}: {{ order.items?.length - fulfilledItems }}</p>
            </ion-label>
            <ion-row>
              <ion-chip v-for="(pkg, index) in trackedPackages" :key="index" @click="copyToClipboard(pkg.trackingCode, 'Tracking code copied to clipboard')">
                {{ pkg.trackingCode }}
                <ion-icon :icon="copyOutline"/>
              </ion-chip>
            </ion-row>
          </div>

          <div class="doc-meta" v-if="!isTOReceived()">
            <ion-item button lines="none" @click="openTOReceivingInstructions">
              <ion-icon :icon="informationCircleOutline" />
              <ion-label slot="end">
                {{ translate("Finish receiving the open items to complete this transfer order", { items: getTOItems("open").length }) }}
                <p>{{ translate("Tap to learn more") }}</p>
              </ion-label>
            </ion-item>
          </div>
        </div>

        <div class="scanner">
          <ion-item>
            <ion-input :label="translate('Scan items')" label-placement="fixed" autofocus v-model="queryString" @keyup.enter="updateProductCount(null)" />
          </ion-item>
          <ion-button expand="block" fill="outline" @click="scan">
            <ion-icon slot="start" :icon="cameraOutline" />
            {{ translate("Scan") }}
          </ion-button>
        </div>

        <ion-segment v-if="!isTOReceived()" :value="selectedSegment" @ionChange="segmentChanged($event.detail.value)">
          <ion-segment-button value="all" content-id="all">
            <ion-label>{{ translate("All") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="open" content-id="open">
            <ion-label>{{ getTOItems("open")?.length }} {{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="received" content-id="received">
            <ion-label>{{ getTOItems("received")?.length }} {{ translate("Received and completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- TODO: create a common component for the item card -->
        <ion-segment-view v-if="!isTOReceived()">
          <ion-segment-content id="all">
            <ion-card v-for="(item, index) in filteredItems" :key="index" :class="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
              <div class="product" :data-product-id="item.productId">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).itemDescription)">
                      <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label class="ion-text-wrap">
                      <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                      <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                      <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
                    </ion-label>
                  </ion-item>
                </div>

                <div class="location">
                  <ion-button v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>
                  <ion-chip v-else outline>
                    {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                    <ion-icon color="medium" :icon="cubeOutline"/>
                  </ion-chip>
                </div>

                <template v-if="!['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId)">
                  <div class="product-count">
                    <ion-item>
                      <ion-input :label="translate('Qty')" label-placement="floating" type="number" min="0" v-model="item.quantityAccepted" :disabled="isForceScanEnabled" />
                    </ion-item>
                  </div>
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
                    <ion-button @click="receiveAll(item)" :disabled="isForceScanEnabled || isItemReceivedInFull(item)" slot="start" size="small" fill="outline">
                      {{ translate("Receive All") }}
                    </ion-button>
                  </div>

                  <div class="qty-progress">
                    <!-- TODO: improve the handling of quantityAccepted -->
                    <ion-progress-bar :color="getRcvdToOrderedFraction(item) === 1 ? 'success' : getRcvdToOrderedFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrderedFraction(item)" />
                  </div>

                  <div class="to-item-history">
                    <ion-chip outline @click="receivingHistory(item.productId, item.orderItemSeqId)">
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
          </ion-segment-content>
          <ion-segment-content id="open">
            <ion-item v-if="openItemsTemp.length" lines="none">
              <ion-label>
                {{ translate("Enter 0 quantity on items with outstanding quantity that need to be closed.") }}
              </ion-label>
              <ion-button fill="clear" slot="end" @click="showAllOpenItems">
                {{ translate("Back to open items") }}
              </ion-button>
            </ion-item>
            <ion-card v-for="(item, index) in openItems" :key="index" :class="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
              <div class="product" :data-product-id="item.productId">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).itemDescription)">
                      <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label class="ion-text-wrap">
                      <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                      <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                      <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
                    </ion-label>
                  </ion-item>
                </div>

                <div class="location">
                  <ion-button v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>
                  <ion-chip v-else outline>
                    {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                    <ion-icon color="medium" :icon="cubeOutline"/>
                  </ion-chip>
                </div>

                <div class="product-count">
                  <ion-item>
                    <ion-input :label="translate('Qty')" label-placement="floating" type="number" min="0" v-model="item.quantityAccepted" :disabled="isForceScanEnabled" />
                  </ion-item>
                </div>
              </div>

              <div class="action border-top" v-if="item.orderItemSeqId">
                <div class="receive-all-qty">
                  <ion-button @click="receiveAll(item)" :disabled="isForceScanEnabled || isItemReceivedInFull(item)" slot="start" size="small" fill="outline">
                    {{ translate("Receive All") }}
                  </ion-button>
                </div>

                <div class="qty-progress">
                  <!-- TODO: improve the handling of quantityAccepted -->
                  <ion-progress-bar :color="getRcvdToOrderedFraction(item) === 1 ? 'success' : getRcvdToOrderedFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrderedFraction(item)" />
                </div>

                <div class="to-item-history">
                  <ion-chip outline @click="receivingHistory(item.productId, item.orderItemSeqId)">
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
            <div v-if="!openItems?.length" class="empty-state">
              <ion-label>
                {{ "No items available for receiving, check completed tab" }}
              </ion-label>
              <ion-button fill="clear" @click="segmentChanged('received')">
                <ion-icon slot="icon-only" :icon="openOutline" />
              </ion-button>
            </div>
            <ion-item v-if="openItemsTemp.length" lines="none">
              <ion-label>
                {{ openItemsTemp.length }} {{ translate("more items are ready to be received") }}
              </ion-label>
            </ion-item>
          </ion-segment-content>
          <ion-segment-content id="received">
            <ion-card v-for="(item, index) in completedItems" :key="index" :class="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
              <div class="product" :data-product-id="item.productId">
                <div class="product-info">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                      <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label class="ion-text-wrap">
                      <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                      <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                      <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
                    </ion-label>
                  </ion-item>
                </div>

                <div class="location">
                  <ion-button v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>
                  <ion-chip v-else outline>
                    {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                    <ion-icon color="medium" :icon="cubeOutline"/>
                  </ion-chip>
                </div>

                <div>
                  <ion-item lines="none">
                    <ion-label slot="end">{{ translate(' Received | Fulfilled | Ordered',{ received: item.totalReceivedQuantity ?? 0, fulfilled:item.totalIssuedQuantity ?? 0 , ordered: item.quantity }) }}</ion-label>
                  </ion-item>
                </div>
              </div>
            </ion-card>
            <div v-if="!completedItems?.length" class="empty-state">
              <ion-label>
                {{ "No items are marked as completed, check Open tab" }}
              </ion-label>
              <ion-button fill="clear" @click="segmentChanged('open')">
                <ion-icon slot="icon-only" :icon="openOutline" />
              </ion-button>
            </div>
          </ion-segment-content>
        </ion-segment-view>

        <!-- TODO: update UI to have this information using the segment view -->
        <template v-if="isTOReceived()">
          <ion-card v-for="(item, index) in completedItems" :key="index" :class="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
            <div class="product" :data-product-id="item.productId">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                    <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label class="ion-text-wrap">
                    <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                    <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                    <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
                  </ion-label>
                </ion-item>
              </div>

              <div class="location">
                <ion-button v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)">
                  <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                </ion-button>
                <ion-chip v-else outline>
                  {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                  <ion-icon color="medium" :icon="cubeOutline"/>
                </ion-chip>
              </div>

              <div>
                <ion-item lines="none">
                  <ion-label slot="end">{{ translate(' Received | Fulfilled | Ordered',{ received: item.totalReceivedQuantity ?? 0, fulfilled:item.totalIssuedQuantity ?? 0 , ordered: item.quantity }) }}</ion-label>
                </ion-item>
              </div>
            </div>
          </ion-card>
        </template>
      </main>
    </ion-content>

    <ion-footer v-if="!isTOReceived() && selectedSegment === 'open'">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button :disabled="!areAllItemsHaveQty" class="ion-margin-end" fill="outline" size="small" color="primary" @click="receiveTO">{{ translate("Partially receive") }}{{ ":" }} {{ getReceivedUnits() }}</ion-button>
          <ion-button :disabled="!areAllItemsHaveQty" fill="solid" size="small" color="primary" @click="receiveAndCloseTO">{{ translate("Receive and complete") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonChip,
  IonContent,
  IonHeader,
  IonFooter,
  IonIcon,
  IonItem,
  IonInput,
  IonLabel,
  IonPage,
  IonProgressBar,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonSegmentContent,
  IonSegmentView,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  alertController,
  modalController
} from '@ionic/vue';
import { defineComponent, computed } from 'vue';
import { addOutline, cameraOutline, checkmarkDone, copyOutline, cubeOutline, eyeOffOutline, eyeOutline, informationCircleOutline, locationOutline, openOutline, saveOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { useStore, mapGetters } from 'vuex';
import { useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue"
import ImageModal from '@/components/ImageModal.vue';
import { copyToClipboard, getFeatures, hasError, showToast, hasWebcamAccess } from '@/utils';
import { Actions, hasPermission } from '@/authorization'
import { TransferOrderService } from '@/services/TransferOrderService';
import AddProductToTOModal from '@/components/AddProductToTOModal.vue';
import { DateTime } from 'luxon';
import { ProductService } from '@/services/ProductService';
import emitter from "@/event-bus";
import ReceivingInstructions from '@/components/ReceivingInstructions.vue';
import ReceiveTransferOrder from '@/components/ReceiveTransferOrder.vue';

export default defineComponent({
  name: "TransferOrderDetails",
  components: {
    DxpShopifyImg,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonChip,
    IonContent,
    IonHeader,
    IonFooter,
    IonIcon,
    IonItem,
    IonInput,
    IonLabel,
    IonPage,
    IonProgressBar,
    IonRow,
    IonSegment,
    IonSegmentButton,
    IonSegmentContent,
    IonSegmentView,
    IonThumbnail,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      queryString: '',
      showCompletedItems: false,
      lastScannedId: '',
      productQoh: {} as any,
      observer: {} as IntersectionObserver,
      selectedSegment: "open",
      filteredItems: [] as any,
      openItems: [] as any,
      completedItems: [] as any,
      openItemsTemp: [] as any,
      fulfilledItems: 0
    }
  },
  computed: {
    ...mapGetters({
      order: 'transferorder/getCurrent',
      getProduct: 'product/getProduct',
      isForceScanEnabled: 'util/isForceScanEnabled',
      isReceivingByFulfillment: 'util/isReceivingByFulfillment',
      barcodeIdentifier: 'util/getBarcodeIdentificationPref',
    }),
    trackedPackages(): any[] {
      return this.order?.shipmentPackages?.filter((pkg: any) => pkg.trackingCode) || [];
    },
    areAllItemsHaveQty(): boolean {
      if(this.openItemsTemp.length) {
        return this.openItems.every((item: any) => (item.quantityAccepted && Number(item.quantityAccepted) >= 0))
      } else {
        return true;
      }
    },
    getTOItems() {
      return (orderType: string) => {
        let items: Array<any> = [];
        if (!this.order.items) return items;
        if (orderType === "received") {
          items = this.order.items.filter((item: any) => item.statusId === 'ITEM_COMPLETED')
        } else if(orderType === "open") {
          items = this.order.items.filter((item: any) => !['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId))
        } else {
          items = this.order.items
        }

        return items
      }
    }
  },
  methods: {
    getItemQty(item: any) {
      return (this.isReceivingByFulfillment ? Number(item.totalIssuedQuantity) : Number(item.quantity)) || 0
    },
    getReceivedUnits() {
      const totalReceived = this.filteredItems.reduce((qty: any, item: any) => qty + (Number(item.quantityAccepted) || 0), 0)
      const totalUnits = this.filteredItems.reduce((qty: any, item: any) => qty + ((this.isReceivingByFulfillment ? item.totalIssuedQuantity : item.quantity) - item.totalReceivedQuantity || 0), 0)
      return `${totalReceived} / ${totalUnits} units`
    },
    segmentChanged(value: string) {
      this.selectedSegment = value
    },
    isItemReceivedInFull(item: any) {
      return (Number(item.totalReceivedQuantity) || 0) >= this.getItemQty(item)
    },
    getRcvdToOrderedFraction(item: any) {
      return ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) / ((this.isReceivingByFulfillment ? Number(item.totalIssuedQuantity) : Number(item.quantity)) || 1)
    },
    async openImage(imageUrl: string, productName: string) {
      const imageModal = await modalController.create({
        component: ImageModal,
        componentProps: { imageUrl , productName }
      });
      return imageModal.present();
    },
    async scan() {
      if (!(await hasWebcamAccess())) {
        showToast(translate("Camera access not allowed, please check permissons."));
        return;
      } 
      const modal = await modalController
      .create({
        component: Scanner,
      });
      modal.onDidDismiss()
      .then((result) => {
        if (result.role && result.role !=='backdrop') {
          this.updateProductCount(result.role);
        }
      })
      return modal.present();
    },
    async updateProductCount(payload: any) {
      if(this.queryString) payload = this.queryString

      if(!payload) {
        showToast(translate("Please provide a valid barcode identifier."))
        return;
      }
      const result = await this.store.dispatch('transferorder/updateProductCount', payload)

      if(result.isCompleted) {
        showToast(translate("Product is already received:", { itemName: payload }))
      } else if(result.isProductFound) {
        showToast(translate("Scanned successfully.", { itemName: payload }))
        this.lastScannedId = payload

        // Identify the scanned value belongs to which segment and change the segment
        const item = this.filteredItems.find((item: any) => getProductIdentificationValue(this.barcodeIdentifier, this.getProduct(item.productId)) === payload)
        if(item.statusId === "ITEM_COMPLETED") {
          this.segmentChanged("received")
        } else {
          this.segmentChanged("open")
        }

        // Highlight specific element
        const scannedElement = document.getElementById(`${this.selectedSegment} > ${payload}`);
        scannedElement && (scannedElement.scrollIntoView());

        // Scanned product should get un-highlighted after 3s for better experience hence adding setTimeOut
        setTimeout(() => {
          this.lastScannedId = ''
        }, 3000)
      } else {
        showToast(translate("Scanned item is not present within the shipment:", { itemName: payload }), {
          buttons: [{
            text: translate('Add'),
            handler: async() => {
              const modal = await modalController.create({
                component: AddProductToTOModal,
                componentProps: { selectedSKU: payload }
              })

              modal.onDidDismiss().then((value: any) => {
                if(value.data.product?.productId) {
                  this.openItems.push(value.data.product)
                  this.filteredItems.push(value.data.product)
                }
                this.store.dispatch('product/clearSearchedProducts');
              })

              return modal.present();
            }
          }],
          duration: 5000
        })
      }
      this.queryString = ''
    },
    searchProduct() {
      if(!this.queryString) {
        showToast(translate("Please provide a valid barcode identifier."))
        return;
      }
      const scannedElement = document.getElementById(this.queryString);
      if(scannedElement) {
        this.lastScannedId = this.queryString
        scannedElement.scrollIntoView()
        // Scanned product should get un-highlighted after 3s for better experience hence adding setTimeOut
        setTimeout(() => {
          this.lastScannedId = ''
        }, 3000)
      } else {
        showToast(translate("Searched item is not present within the shipment:", { itemName: this.queryString }));
      }
      this.queryString = ''
    },
    async addProduct() {
      const modal = await modalController
        .create({
          component: AddProductToTOModal
        })
      modal.onDidDismiss().then((value: any) => {
        this.store.dispatch('product/clearSearchedProducts');

        if(value.data.product?.productId) {
          this.openItems.push(value.data.product)
          this.filteredItems.push(value.data.product)
        }

        this.observeProductVisibility();
      })
      return modal.present();
    },
    async receivingHistory(productId?: string, orderItemSeqId?: string) {
      const modal = await modalController
        .create({
          component: ReceivingHistoryModal,
          componentProps: {
            productId,
            orderItemSeqId,
            orderType: 'transferOrder'
          }
        })
      return modal.present();
    },
    async receivingAlert() {
      let message = "Specify quantity for at least one of the items to receive"

      if(!hasPermission(Actions.APP_SHIPMENT_UPDATE)) {
        message = "You do not have permission to receive items"
      }

      const alert = await alertController.create({
        header: translate("Receiving"),
        message: translate(message),
        buttons: [{
          text: translate("Ok"),
          role: "cancel"
        }]
      });

      return alert.present();
    },
    async confirmComplete() {
      const alert = await alertController.create({
        header: translate("Close transfer order items"),
        message: translate("All the TO items will be marked as completed"),
        buttons: [{
          text: translate("Cancel"),
          role: "cancel"
        },
        {
          text: translate("Proceed"),
          role: "proceed",
          handler: async () => {
            // Dismiss alert before showing loader to prevent overlay stacking
            alert.dismiss();
            emitter.emit("presentLoader", { message: "Receiving in progress...", backdropDismiss: false });
            try {
              await this.receiveTransferOrder(true);
            } finally {
              emitter.emit("dismissLoader");
            }
          }
        }]
      });
      return alert.present();
    },
    isAnyItemOverReceived() {
      return [...this.openItems, ...this.openItemsTemp].some((item: any) => ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) > this.getItemQty(item))
    },
    async receiveTO() {
      if(!this.isEligibileForCreatingShipment() || !hasPermission(Actions.APP_SHIPMENT_UPDATE)) {
        return await this.receivingAlert();
      }

      if(!this.isAnyItemOverReceived()) {
        const alert = await alertController.create({
          header: translate("Save progress and receive more later"),
          message: translate("Your receiving progress will be saved and will be added to your inventory. Come back to this transfer order and finish receiving later. Fully received items auto close.", { space: "<br /><br />", units: this.getReceivedUnits() }),
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          },
          {
            text: translate('Proceed'),
            role: 'proceed',
            handler: async () => {
              // Dismiss alert before showing loader to prevent overlay stacking
              alert.dismiss();
              emitter.emit("presentLoader", { message: "Receiving in progress...", backdropDismiss: false });
              try {
                await this.receiveTransferOrder();
              } finally {
                emitter.emit("dismissLoader");
              }
            }
          }]
        });
        return alert.present();
      } else {
        const modal = await modalController
          .create({
            component: ReceiveTransferOrder,
            componentProps: {
              items: this.filteredItems,
              receivedUnitsFraction: this.getReceivedUnits()
            }
          });

        modal.onDidDismiss().then(async (value: any) => {
          this.filteredItems.forEach((item: any) => item.isChecked = false)
          if(value?.data?.updateItems) {
            emitter.emit("presentLoader", { message: "Receiving in progress...", backdropDismiss: false });
            try { 
              await this.receiveTransferOrder();
            } finally {
              emitter.emit("dismissLoader");
            }
          }
        })
        
        return modal.present();
      }
    },
    showAllOpenItems() {
      this.openItems = [...this.openItemsTemp, ...this.openItems].sort((a, b) => (Number(a.orderItemSeqId) || 0) - (Number(b.orderItemSeqId) || 0))
      this.openItemsTemp = [];
    },
    async receiveAndCloseTO() {
      if(!this.isEligibileForCreatingShipment(true) || !hasPermission(Actions.APP_SHIPMENT_UPDATE)) {
        return await this.receivingAlert();
      }

      let itemsReceived = [] as any
      let itemsNotReceived = [] as any
      this.openItems.map((item: any) => {
        if(!(item.quantityAccepted && item.quantityAccepted >= 0)) {
          itemsNotReceived.push(item)
        } else {
          itemsReceived.push(item)
        }
      })
      if(itemsNotReceived.length) {
        this.openItemsTemp = itemsReceived
        this.openItems = itemsNotReceived
        document.querySelector("ion-segment")?.scrollIntoView();
        return;
      }

      const items = [...this.openItems, ...this.openItemsTemp]

      const isAnyItemUnderReceived = items.some((item: any) => ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) != this.getItemQty(item))
      if(!this.isAnyItemOverReceived() && !isAnyItemUnderReceived) {
        return await this.confirmComplete()
      }

      const modal = await modalController.create({
        component: ReceiveTransferOrder,
        componentProps: {
          closeTO: true,  // define if we need to initiate close TO flow from the modal
          items: this.filteredItems,
          receivedUnitsFraction: this.getReceivedUnits()
        }
      })

      // Mark as the items as unchecked
      modal.onDidDismiss().then(async (value: any) => {
        this.filteredItems.forEach((item: any) => item.isChecked = false)
        if(value?.data?.updateItems) {
          emitter.emit("presentLoader", { message: "Receiving in progress...", backdropDismiss: false });
          try { 
            await this.receiveTransferOrder(true);
          } finally {
            emitter.emit("dismissLoader");
          }
        }
      })

      return modal.present();
    },
    getCurrentFacilityId() {
      const currentFacility: any = useUserStore().getCurrentFacility;
      return currentFacility?.facilityId
    },
    async receiveTransferOrder(isClosingTO = false) {
      let eligibleItems: any = []
      const itemsToReceive =  [...this.openItems, ...this.openItemsTemp]
      if(!isClosingTO) {
        itemsToReceive.forEach((item: any) => {
          const isItemFullyReceived = item.quantityAccepted >= 0 && ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) >= this.getItemQty(item)
          if(isItemFullyReceived) {
            item.statusId = "ITEM_COMPLETED"
          }
  
          if(item.quantityAccepted > 0) {
            eligibleItems.push(item)
          }
        })
      } else {
        eligibleItems = itemsToReceive.map((item: any) => ({
          ...item,
          statusId: "ITEM_COMPLETED"
        }))
      }

      const payload = {
        facilityId: this.getCurrentFacilityId(),
        receivedDateTime: DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
        items: eligibleItems.map((item: any) => {
          const params = {          
            orderItemSeqId: item.orderItemSeqId,
            productId: item.productId,
            quantityAccepted: item.quantityAccepted,
            statusId: item.statusId
          } as any

          return params;
        })
      }

      try {
        const resp = await TransferOrderService.receiveTransferOrder(this.order.orderId, payload)
        if (!hasError(resp)) {
          showToast(translate("Transfer order received successfully", { orderId: this.order.orderId }))
          this.router.push('/transfer-orders')
        } 
      } catch (error) {
        showToast(translate("Error in receiving transfer order", { orderId: this.order.orderId }))
      }
    },
    isEligibileForCreatingShipment(isClosingTO = false) {
      return [...this.openItems, ...this.openItemsTemp]?.some((item: any) => !isClosingTO ? (item.quantityAccepted && Number(item.quantityAccepted) > 0) : (item.quantityAccepted && Number(item.quantityAccepted) >= 0))
    },
    receiveAll(item: any) {
      const qtyAlreadyAccepted = Number(item.totalReceivedQuantity) || 0
      const qty = this.isReceivingByFulfillment ? item.totalIssuedQuantity : item.quantity
      item.quantityAccepted = Math.max(qty - qtyAlreadyAccepted, 0);
      item.progress = item.quantityAccepted / qty;
    },
    isTOReceived() {
      return this.order.statusId === "ORDER_COMPLETED"
    },
    observeProductVisibility() {
      if(this.observer.root) {
        this.observer.disconnect();
      }

      this.observer = new IntersectionObserver((entries: any) => {
        entries.forEach((entry: any) => {
          if (entry.isIntersecting) {
            const productId = entry.target.getAttribute('data-product-id');
            if (productId && (!this.productQoh[productId] && this.productQoh[productId] !== 0)) {
              this.fetchQuantityOnHand(productId);
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
          this.observer.observe(product);
        });
      }
    },
    async fetchQuantityOnHand(productId: any) {
      this.productQoh[productId] = await ProductService.getInventoryAvailableByFacility(productId);
    },
    async openTOReceivingInstructions() {
      const modal = await modalController
        .create({
          component: ReceivingInstructions,
          componentProps: {
            openItems: [...this.openItems, ...this.openItemsTemp].length,
            items: this.filteredItems.length
          }
        });
      
      return modal.present();
    }
  }, 
  async ionViewWillEnter() {
    emitter.emit('presentLoader', { backdropDismiss: false, message: "Fetching details..." });
    this.store.dispatch("transferorder/clearTransferOrderDetail");

    await this.store.dispatch("transferorder/fetchTransferOrderDetail", { orderId: this.$route.params.slug }).then(async () => {
      await this.store.dispatch('transferorder/fetchTOHistory', {
        payload: { 
          orderId: this.order.orderId,
          orderByField: "-datetimeReceived"
        }
      })
      if(this.isTOReceived()) {
        this.showCompletedItems = true;
      }

      this.filteredItems = JSON.parse(JSON.stringify(this.order.items))
      this.completedItems = this.filteredItems.filter((item: any) => item.statusId === 'ITEM_COMPLETED')
      this.openItems = this.filteredItems.filter((item: any) => !['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId))

      this.fulfilledItems = this.filteredItems.filter((item: any) => item.totalIssuedQuantity)?.length

      this.observeProductVisibility();
    })
    emitter.emit('dismissLoader');
  },
  ionViewDidLeave() {
    this.productQoh = {};
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref);
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      Actions,
      addOutline,
      cameraOutline,
      checkmarkDone,
      copyOutline,
      copyToClipboard,
      cubeOutline,
      currentFacility,
      eyeOffOutline,
      eyeOutline,
      getFeatures,
      hasPermission,
      informationCircleOutline,
      locationOutline,
      router,
      openOutline,
      saveOutline,
      store,
      timeOutline,
      translate,
      getProductIdentificationValue,
      productIdentificationPref,
    };
  },
});
</script>

<style scoped>

.doc-meta > ion-item {
  --border-color: var(--ion-color-medium);
  --border-radius: 8px;
  --border-width: 1px;
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
