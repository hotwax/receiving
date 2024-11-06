<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/purchase-orders" slot="start" />
        <ion-title> {{ translate("Purchase Order Details") }} </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="receivingHistory()">
            <ion-icon slot="icon-only" :icon="timeOutline"/>
          </ion-button>
          <ion-button :disabled="!hasPermission(Actions.APP_SHIPMENT_ADMIN) || isPOReceived()" @click="addProduct">
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="doc-id">
          <ion-label class="ion-padding">
            <h1>{{ translate("Purchase Order")}}: {{ order.externalOrderId }}</h1>
            <p>{{ translate("Item count") }}: {{ order.items.length }}</p>
          </ion-label>

          <div class="doc-meta">
            <ion-chip @click="copyToClipboard(order.orderId, 'Internal ID saved to clipboard')">{{ order.orderId }}<ion-icon :icon="copyOutline"/></ion-chip>
            <ion-badge :color="order.orderStatusId === 'ORDER_CREATED' ? 'medium' : 'primary'">{{ order.orderStatusDesc }}</ion-badge>
          </div>
        </div>

        <div class="scanner">
          <ion-item>
            <ion-input :label="translate(isPOReceived() ? 'Search items' : 'Scan items')" label-placement="fixed" autofocus v-model="queryString" @keyup.enter="isPOReceived() ? searchProduct() : updateProductCount()" />
          </ion-item>
          <ion-button expand="block" fill="outline" @click="scan" :disabled="isPOReceived()">
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
          <ion-card v-for="(item, index) in getPOItems('pending')" v-show="item.orderItemStatusId !== 'ITEM_COMPLETED' && item.orderItemStatusId !== 'ITEM_REJECTED'" :key="index" :class="item.internalName === lastScannedId ? 'scanned-item' : '' " :id="item.internalName">
            <div  class="product">
              <div class="product-info">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                    <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label class="ion-text-wrap">
                    <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                    <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  </ion-label>
                </ion-item>
              </div>

              <div class="location">
                <LocationPopover :item="item" type="order" :facilityId="currentFacility.facilityId" />
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

              <div class="po-item-history">
                <ion-chip outline @click="receivingHistory(item.productId)">
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
          <ion-button v-if="getPOItems('completed').length" @click="showCompletedItems = !showCompletedItems" color="medium" fill="clear">
            <ion-icon :icon="showCompletedItems ? eyeOutline : eyeOffOutline" slot="icon-only" />
          </ion-button>
        </ion-item>
        
        <ion-card v-for="(item, index) in getPOItems('completed')" v-show="showCompletedItems && item.orderItemStatusId === 'ITEM_COMPLETED'" :key="index">
          <div class="product">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                  <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                  <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
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
                <ion-badge color="medium" slot="end">{{ item.quantity }} {{ translate("ordered") }}</ion-badge>
                <ion-badge color="success" class="ion-margin-start" slot="end">{{ getPOItemAccepted(item.productId) }} {{ translate("received") }}</ion-badge>
              </ion-item>
            </div>
          </div>
        </ion-card>
      </main>  
    </ion-content>

    <ion-footer v-if="!isPOReceived()">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="outline" size="small" color="primary" :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE)" class="ion-margin-end" @click="closePO">{{ translate("Receive And Close") }}</ion-button>
          <ion-button fill="solid" size="small" color="primary" :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibileForCreatingShipment()" @click="savePODetails">{{ translate("Receive") }}</ion-button>
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
import { addOutline, cameraOutline, checkmarkDone, copyOutline, eyeOffOutline, eyeOutline, locationOutline, saveOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore } from '@hotwax/dxp-components';
import { useStore, mapGetters } from 'vuex';
import { useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue"
import AddProductToPOModal from '@/views/AddProductToPOModal.vue'
import ClosePurchaseOrderModal from '@/components/ClosePurchaseOrderModal.vue'
import LocationPopover from '@/components/LocationPopover.vue'
import ImageModal from '@/components/ImageModal.vue';
import { copyToClipboard, hasError, showToast } from '@/utils';
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: "PurchaseOrderDetails",
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
    IonToolbar,
    LocationPopover
  },
  data() {
    return {
      queryString: '',
      showCompletedItems: false,
      lastScannedId: ''
    }
  },
  computed: {
    ...mapGetters({
      order: 'order/getCurrent',
      getProduct: 'product/getProduct',
      getPOItemAccepted: 'order/getPOItemAccepted',
      facilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId',
      currentFacility: 'user/getCurrentFacility',
      isForceScanEnabled: 'util/isForceScanEnabled',
    })
  },
  methods: {
    isItemReceivedInFull(item: any) {
      const qtyAlreadyAccepted = this.getPOItemAccepted(item.productId)
      return this.order.items.some((ele: any) => ele.productId == item.productId && qtyAlreadyAccepted >= ele.quantity)
    },
    getRcvdToOrderedFraction(item: any) {
      return (parseInt(item.quantityAccepted || 0) + this.getPOItemAccepted(item.productId))/(item.quantity)
    },
    async openImage(imageUrl: string, productName: string) {
      const imageModal = await modalController.create({
        component: ImageModal,
        componentProps: { imageUrl , productName }
      });
      return imageModal.present();
    },
    async scan() {
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
      const result = await this.store.dispatch('order/updateProductCount', payload)

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
                component: AddProductToPOModal,
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
    getPOItems(orderType: string) {
      if(orderType === 'completed'){
        return this.order.items.filter((item: any) => item.orderItemStatusId === 'ITEM_COMPLETED')
      } else {
        return this.order.items.filter((item: any) => item.orderItemStatusId !== 'ITEM_COMPLETED' && item.orderItemStatusId !== 'ITEM_REJECTED')
      }
    },
    async addProduct() {
      const modal = await modalController
        .create({
          component: AddProductToPOModal
        })
      modal.onDidDismiss()
      .then(() => {
        this.store.dispatch('product/clearSearchedProducts');
      })  
      return modal.present();
    },
    async receivingHistory(productId?: string) {
      const modal = await modalController
        .create({
          component: ReceivingHistoryModal,
          componentProps: {productId}
        })
      return modal.present();
    },
    async savePODetails() {
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
            this.createShipment();
          }
        }]
      });
      return alert.present();
    },
    async closePO() {
      const modal = await modalController.create({
        component: ClosePurchaseOrderModal,
        componentProps: {
          isEligibileForCreatingShipment: this.isEligibileForCreatingShipment()
        }
      })

      return modal.present();
    },
    async createShipment() {
      const eligibleItems = this.order.items.filter((item: any) => item.quantityAccepted > 0)
      const isShipmentReceived = await this.store.dispatch('order/createAndReceiveIncomingShipment', { items: eligibleItems, orderId: this.order.orderId })
      if (isShipmentReceived) {
        showToast(translate("Purchase order received successfully", { orderId: this.order.orderId }))
        this.router.push('/purchase-orders')
      } else {
        this.store.dispatch("order/getOrderDetail", { orderId: this.$route.params.slug }).then(() => {
          this.store.dispatch('order/getPOHistory', { orderId: this.order.orderId })
        })
      }
    },
    isEligibileForCreatingShipment() {
      return this.order.items.some((item: any) => item.quantityAccepted > 0)
    },
    receiveAll(item: any) {
      const qtyAlreadyAccepted = this.getPOItemAccepted(item.productId)
      this.order.items.find((ele: any) => {
        if(ele.productId == item.productId) {
          ele.quantityAccepted = ele.quantity - qtyAlreadyAccepted;
          ele.progress = ele.quantityAccepted / ele.quantity;
          return true;
        }
      })
    },
    isPOReceived() {
      return this.order.orderStatusId === "ORDER_COMPLETED"
    }
  }, 
  ionViewWillEnter() {
    this.store.dispatch("order/getOrderDetail", { orderId: this.$route.params.slug }).then(async () => {
      await this.store.dispatch('order/getPOHistory', { orderId: this.order.orderId })
      if(this.isPOReceived()) {
        this.showCompletedItems = true;
      }
    })
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref);

    return {
      Actions,
      addOutline,
      cameraOutline,
      checkmarkDone,
      copyOutline,
      copyToClipboard,
      eyeOffOutline,
      eyeOutline,
      hasPermission,
      locationOutline,
      router,
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
