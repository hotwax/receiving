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
          <ion-label class="ion-padding">
            <h1>{{ translate("Transfer Order")}}: {{ order.externalId ? order.externalId : order.orderName ? order.orderName : order.orderId }}</h1>
            <p>{{ translate("Item count") }}: {{ order.items?.length || 0 }}</p>
          </ion-label>

          <div class="doc-meta">
            <ion-chip @click="copyToClipboard(order.orderId, 'Internal ID saved to clipboard')">{{ order.orderId }}<ion-icon :icon="copyOutline"/></ion-chip>
            <ion-badge :color="order.statusId === 'ORDER_APPROVED' ? 'primary' : 'medium'">{{ order.status }}</ion-badge>
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

        <ion-item lines="none" v-if="!isTOReceived()">
          <ion-label v-if="getTOItems('pending').length > 1" color="medium" class="ion-margin-end">
            {{ translate("Pending: items", { itemsCount: getTOItems('pending').length }) }}
          </ion-label>
          <ion-label v-else color="medium" class="ion-margin-end">
            {{ translate("Pending: item", { itemsCount: getTOItems('pending').length }) }}
          </ion-label>
        </ion-item>

          <ion-card v-for="(item, index) in order.items" v-show="!['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId)" :key="index" :class="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
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
                  <ion-input :label="translate('Qty')" label-placement="floating" type="number" value="0" min="0" v-model="item.quantityAccepted" :disabled="isForceScanEnabled" />
                </ion-item>
              </div>
            </div>

            <div class="action border-top" v-if="item.quantity > 0">
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
                <ion-chip outline @click="receivingHistory(item.productId)">
                  <ion-icon :icon="checkmarkDone"/>
                  <ion-label> {{ item.totalReceivedQuantity ?? 0 }} {{ translate("received") }} </ion-label>
                </ion-chip>
              </div>

              <div class="qty-ordered">
                <ion-label>{{ item.quantity }} {{ translate("ordered") }}</ion-label>
              </div>
            </div>
          </ion-card>

        <ion-item lines="none" v-if="!isTOReceived()">
          <ion-text v-if="getTOItems('completed').length > 1" color="medium" class="ion-margin-end">
            {{ translate("Completed: items", { itemsCount: getTOItems('completed').length }) }}
          </ion-text>
          <ion-text v-else color="medium" class="ion-margin-end">
            {{ translate("Completed: item", { itemsCount: getTOItems('completed').length }) }}
          </ion-text>
          <ion-button v-if="getTOItems('completed').length" @click="showCompletedItems = !showCompletedItems" color="medium" fill="clear">
            <ion-icon :icon="showCompletedItems ? eyeOutline : eyeOffOutline" slot="icon-only" />
          </ion-button>
        </ion-item>
        
        <ion-card v-for="(item, index) in getTOItems('completed')" v-show="showCompletedItems && item.statusId === 'ITEM_COMPLETED'" :key="index" :class="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : '' " :id="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
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
              <!-- <ion-chip :disabled="true" outline>
                <ion-icon :icon="locationOutline"/>
                <ion-label>{{ item.locationSeqId }}</ion-label>
              </ion-chip> -->
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
                <ion-label slot="end">{{ translate("/ received", { receivedCount: Number(item.totalReceivedQuantity), orderedCount: item.quantity }) }}</ion-label>
                <ion-icon :icon="(item.totalReceivedQuantity == item.quantity) ? checkmarkDoneCircleOutline : warningOutline" :color="(item.totalReceivedQuantity  == item.quantity) ? '' : 'warning'" slot="end" />
              </ion-item>
            </div>
          </div>
        </ion-card>
      </main>   
    </ion-content>

    <ion-footer v-if="!isTOReceived()">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="outline" size="small" color="primary" :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE)" class="ion-margin-end" @click="receiveAndCloseTO">{{ translate("Receive And Close") }}</ion-button>
          <ion-button fill="solid" size="small" color="primary" :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibileForCreatingShipment()" @click="receiveTO">{{ translate("Receive") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonBadge,
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
  IonText,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  alertController,
  modalController
} from '@ionic/vue';
import { defineComponent, computed } from 'vue';
import { addOutline, cameraOutline, checkmarkDone, checkmarkDoneCircleOutline, copyOutline, cubeOutline, eyeOffOutline, eyeOutline, locationOutline, saveOutline, timeOutline, warningOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { useStore, mapGetters } from 'vuex';
import { useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue"
import CloseTransferOrderModal from '@/components/CloseTransferOrderModal.vue';
import ImageModal from '@/components/ImageModal.vue';
import { copyToClipboard, getFeatures, hasError, showToast, hasWebcamAccess } from '@/utils';
import { Actions, hasPermission } from '@/authorization'
import { TransferOrderService } from '@/services/TransferOrderService';
import AddProductToTOModal from '@/components/AddProductToTOModal.vue';
import { DateTime } from 'luxon';
import { ProductService } from '@/services/ProductService';

export default defineComponent({
  name: "TransferOrderDetails",
  components: {
    DxpShopifyImg,
    IonBackButton,
    IonBadge,
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
    IonText,
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
      observer: {} as IntersectionObserver
    }
  },
  computed: {
    ...mapGetters({
      order: 'transferorder/getCurrent',
      getProduct: 'product/getProduct',
      facilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId',
      isForceScanEnabled: 'util/isForceScanEnabled',
      barcodeIdentifier: 'util/getBarcodeIdentificationPref',
    })
  },
  methods: {
    isItemReceivedInFull(item: any) {
      return (Number(item.totalReceivedQuantity) || 0) >= (Number(item.quantity) || 0)
    },
    getRcvdToOrderedFraction(item: any) {
      return ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) / (Number(item.quantity) || 1)
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
        if (result.role) {
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
        // Highlight specific element
        const scannedElement = document.getElementById(payload);
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

              modal.onDidDismiss().then(() => {
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
    getTOItems(orderType: string) {
      if (!this.order.items) return [];
      if (orderType === 'completed') {
        return this.order.items.filter((item: any) => item.statusId === 'ITEM_COMPLETED')
      } else {
        return this.order.items.filter((item: any) => !['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId))
      }
    },
    async addProduct() {
      const modal = await modalController
        .create({
          component: AddProductToTOModal
        })
      modal.onDidDismiss()
      .then(() => {
        this.store.dispatch('product/clearSearchedProducts');
        this.observeProductVisibility();
      })
      return modal.present();
    },
    async receivingHistory(productId?: string) {
      const modal = await modalController
        .create({
          component: ReceivingHistoryModal,
          componentProps: {
            productId,
            orderType: 'transferOrder'
          }
        })
      return modal.present();
    },
    async receiveTO() {
      const alert = await alertController.create({
        header: translate('Receive inventory'),
        message: translate('Inventory can be received for transfer orders in multiple receipts. Proceeding will receive the item of the transfer order but it will still be available for receiving later.', { space: '<br /><br />' }),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        },
        {
          text: translate('Proceed'),
          role: 'proceed',
          handler: () => {
            this.receiveTransferOrder();
          }
        }]
      });
      return alert.present();
    },
    async receiveAndCloseTO() {
      const modal = await modalController.create({
        component: CloseTransferOrderModal,
        componentProps: {
          isEligibileForCreatingShipment: this.isEligibileForCreatingShipment(),
        }
      })

      return modal.present();
    },
    getCurrentFacilityId() {
      const currentFacility: any = useUserStore().getCurrentFacility;
      return currentFacility?.facilityId
    },
    async receiveTransferOrder() {
      const eligibleItems = this.order.items.filter((item: any) => item.quantityAccepted > 0)
      const payload = {
        facilityId: this.getCurrentFacilityId(),
        receivedDateTime: DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
        items: eligibleItems.map((item: any) => ({
          orderItemSeqId: item.orderItemSeqId,
          productId: item.productId,
          quantityAccepted: item.quantityAccepted
        }))
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
    isEligibileForCreatingShipment() {
      return this.order.items?.some((item: any) => !!item.quantityAccepted && Number(item.quantityAccepted) > 0)
    },
    receiveAll(item: any) {
      const qtyAlreadyAccepted = Number(item.totalReceivedQuantity) || 0
      item.quantityAccepted = Math.max(item.quantity - qtyAlreadyAccepted, 0);
      item.progress = item.quantityAccepted / item.quantity;
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
  }, 
  ionViewWillEnter() {
    this.store.dispatch("transferorder/fetchTransferOrderDetail", { orderId: this.$route.params.slug }).then(async () => {
      await this.store.dispatch('transferorder/fetchTOHistory', {
        payload: { 
          orderId: this.order.orderId,
          orderByField: "-datetimeReceived"
        }
      })
      if(this.isTOReceived()) {
        this.showCompletedItems = true;
      }
      this.observeProductVisibility();
    })
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
      checkmarkDoneCircleOutline,
      copyOutline,
      copyToClipboard,
      cubeOutline,
      currentFacility,
      eyeOffOutline,
      eyeOutline,
      getFeatures,
      hasPermission,
      locationOutline,
      router,
      saveOutline,
      store,
      timeOutline,
      translate,
      getProductIdentificationValue,
      productIdentificationPref,
      warningOutline
    };
  },
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
