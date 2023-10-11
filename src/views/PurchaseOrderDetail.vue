<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/purchase-orders" slot="start" />
        <ion-title> {{$t("Purchase Order Details")}} </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="receivingHistory()">
            <ion-icon slot="icon-only" :icon="timeOutline"/>
          </ion-button>
          <ion-button :disabled="!hasPermission(Actions.APP_SHIPMENT_ADMIN)" @click="addProduct">
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="doc-id">
          <ion-item lines="none">
            <ion-label>
              <h1>{{ $t("Purchase Order")}}: {{ order.externalOrderId }}</h1>
              <p>{{ $t("Item count") }}: {{ order.items.length }}</p>
            </ion-label>
          </ion-item>

          <div class="doc-meta">
            <ion-chip @click="copyToClipboard(order.orderId, 'Internal ID saved to clipboard')">{{ order.orderId }}<ion-icon :icon="copyOutline"/></ion-chip>
            <ion-badge :color="order.orderStatusId === 'ORDER_CREATED' ? 'medium' : 'primary'">{{ order.orderStatusDesc }}</ion-badge>
          </div>
        </div>

        <div class="scanner">
          <ion-item>
            <ion-label position="fixed">{{$t("Scan items")}}</ion-label>
            <ion-input autofocus :placeholder="$t('Scan barcodes to receive them')" v-model="queryString" @keyup.enter="updateProductCount()" />
          </ion-item>
          <ion-button expand="block" fill="outline" @click="scan">
            <ion-icon slot="start" :icon="cameraOutline" />
            {{ $t("Scan") }}
          </ion-button>
        </div>

        <ion-item lines="none">
          <ion-label v-if="getPOItems('pending').length > 1" color="medium" class="ion-margin-end">
            {{ $t("PENDING: ITEMS", { itemsCount: getPOItems('pending').length }) }}
          </ion-label>
          <ion-label v-else color="medium" class="ion-margin-end">
            {{ $t("PENDING: ITEM", { itemsCount: getPOItems('pending').length }) }}
          </ion-label>
        </ion-item>

        <ion-card v-for="(item, index) in getPOItems('pending')" v-show="item.orderItemStatusId !== 'ITEM_COMPLETED' && item.orderItemStatusId !== 'ITEM_REJECTED'" :key="index">
          <div  class="product">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                  <ShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ productHelpers.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) }}</h2>
                  <p>{{ productHelpers.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                </ion-label>
              </ion-item>
            </div>

            <div class="location">
              <LocationPopover :item="item" type="order" :facilityId="currentFacility.facilityId" />
            </div>

            <div class="product-count">
              <ion-item>
                <ion-label position="floating">{{ $t("Qty") }}</ion-label>       
                <ion-input type="number" value="0" min="0" v-model="item.quantityAccepted" />
              </ion-item>
            </div>
          </div>

          <div class="action border-top" v-if="item.quantity > 0">
            <div class="receive-all-qty">
              <ion-button @click="receiveAll(item)" slot="start" size="small" fill="outline">
                {{ $t("Receive All") }}
              </ion-button>
            </div>

            <div class="qty-progress">
              <!-- TODO: improve the handling of quantityAccepted -->
              <ion-progress-bar :color="getRcvdToOrderedFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrderedFraction(item)" />
            </div>

            <div class="po-item-history">
              <ion-chip outline @click="receivingHistory(item.productId)">
                <ion-icon :icon="checkmarkDone"/>
                <ion-label> {{ getPOItemAccepted(item.productId) }} {{ $t("received") }} </ion-label>
              </ion-chip>
            </div>

            <div class="qty-ordered">
              <ion-label>{{ item.quantity }} {{ $t("ordered") }}</ion-label>   
            </div>         
          </div>
        </ion-card>

        <ion-item lines="none">
          <ion-text v-if="getPOItems('completed').length > 1" color="medium" class="ion-margin-end">
            {{ $t("COMPLETED: ITEMS", { itemsCount: getPOItems('completed').length }) }}
          </ion-text>
          <ion-text v-else color="medium" class="ion-margin-end">
            {{ $t("COMPLETED: ITEM", { itemsCount: getPOItems('completed').length }) }}
          </ion-text>
          <ion-icon v-if="getPOItems('completed').length" :icon="showCompletedItems ? eyeOutline : eyeOffOutline" @click="showCompletedItems = !showCompletedItems" />
        </ion-item>
        
        <ion-card v-for="(item, index) in getPOItems('completed')" v-show="showCompletedItems && item.orderItemStatusId === 'ITEM_COMPLETED'" :key="index">
          <div class="product">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                  <ShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ productHelpers.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) }}</h2>
                  <p>{{ productHelpers.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
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
                <ion-badge color="medium" slot="end">{{ item.quantity }} {{ $t("ordered") }}</ion-badge>
                <ion-badge color="success" class="ion-margin-start" slot="end">{{ getPOItemAccepted(item.productId) }} {{ $t("received") }}</ion-badge>
              </ion-item>
            </div>
          </div>
        </ion-card>
      </main>  
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-item slot="end">
          <ion-button :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE)" fill="outline" class="ion-margin-end" @click="closePO">{{ $t("Receive And Close") }}</ion-button>
          <ion-button :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibileForCreatingShipment()" @click="savePODetails">{{ $t("Receive") }}</ion-button>
        </ion-item>
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
import { defineComponent } from 'vue';
import { addOutline, cameraOutline, checkmarkDone, copyOutline, eyeOffOutline, eyeOutline, locationOutline, saveOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { ShopifyImg } from '@hotwax/dxp-components';
import { useStore, mapGetters } from 'vuex';
import { useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue"
import AddProductToPOModal from '@/views/AddProductToPOModal.vue'
import ClosePurchaseOrderModal from '@/views/ClosePurchaseOrderModal.vue'
import LocationPopover from '@/components/LocationPopover.vue'
import ImageModal from '@/components/ImageModal.vue';
import { copyToClipboard, hasError, productHelpers } from '@/utils';
import { Actions, hasPermission } from '@/authorization'
import emitter from "@/event-bus"

export default defineComponent({
  name: "PurchaseOrderDetails",
  components: {
    ShopifyImg,
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
      showCompletedItems: false
    }
  },
  computed: {
    ...mapGetters({
      order: 'order/getCurrent',
      getProduct: 'product/getProduct',
      getPOItemAccepted: 'order/getPOItemAccepted',
      facilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId',
      currentFacility: 'user/getCurrentFacility',
      productIdentificationPref: 'user/getProductIdentificationPref'
    })
  },
  mounted() {
    emitter.on('create-shipment', this.createShipment)
  },
  methods: {
    getRcvdToOrderedFraction(item: any){
      return (parseInt(item.quantityAccepted) +  this.getPOItemAccepted(item.productId))/(item.quantity)
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
        this.updateProductCount(result.role);
      })
      return modal.present();
    },
    async updateProductCount(payload: any) {
      if(this.queryString) payload = this.queryString
      this.store.dispatch('order/updateProductCount', payload)
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
        header: this.$t('Receive inventory'),
        message: this.$t('Inventory can be received for purchase orders in multiple shipments. Proceeding will receive a new shipment for this purchase order but it will still be available for receiving later', { space: '<br /><br />' }),
        buttons: [{
          text: this.$t('Cancel'),
          role: 'cancel'
        },
        {
          text: this.$t('Proceed'),
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
      const resp = await this.store.dispatch('order/createPurchaseShipment', { items: eligibleItems, orderId: this.order.orderId })
      if (resp.status === 200 && !hasError(resp)) {
        this.router.push('/purchase-orders')
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
    }
  }, 
  ionViewWillEnter() {
    this.store.dispatch("order/getOrderDetail", { orderId: this.$route.params.slug }).then(() => {
      this.store.dispatch('order/getPOHistory', { orderId: this.order.orderId })
    })
  },
  unmounted() {
    emitter.off('create-shipment', this.createShipment)
  },
  setup() {
    const store = useStore();
    const router = useRouter();

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
      productHelpers,
      router,
      saveOutline,
      store,
      timeOutline
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
