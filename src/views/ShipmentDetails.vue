<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start"></ion-back-button>
        <ion-title>{{ translate("Shipment Details") }}</ion-title>
        <ion-buttons slot="end" v-if="!isShipmentReceived()">
          <ion-button :disabled="!hasPermission(Actions.APP_SHIPMENT_ADMIN)" @click="addProduct"><ion-icon :icon="add"/></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-item lines="none">
          <ion-label>
            <p class="overline" v-show="current.externalOrderId || current.externalOrderName">{{ current.externalOrderName ? current.externalOrderName : current.externalOrderId }}</p>
            <h1 v-if="current.externalId">{{ translate("External ID") }}: {{ current.externalId }}</h1>
            <h1 v-else>{{ translate("Shipment ID") }}: {{ current.shipmentId }}</h1>
          </ion-label>
          <ion-chip v-show="current.trackingIdNumber">{{current.trackingIdNumber}}</ion-chip>
        </ion-item>

        <div class="scanner" v-if="!isShipmentReceived()">
          <ion-item>
            <ion-input :label="translate('Scan items')" autofocus :placeholder="translate('Scan barcodes to receive them')" v-model="queryString" @keyup.enter="updateProductCount()"></ion-input>
          </ion-item>

          <ion-button expand="block" fill="outline" @click="scanCode()">
            <ion-icon slot="start" :icon="cameraOutline" />{{ translate("Scan") }}
          </ion-button>
        </div>

        <ion-card v-for="item in current.items" :key="item.id" :class="item.sku === lastScannedId ? 'scanned-item' : ''" :id="item.sku">
          <div class="product">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                  <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>                
                </ion-label>
              </ion-item>
            </div>

            <div class="location">
              <LocationPopover v-if="!isShipmentReceived()" :item="item" type="shipment" :facilityId="currentFacility.facilityId" />
              <ion-chip :disabled="true" outline v-else>
                <ion-icon :icon="locationOutline"/>
                <ion-label>{{ item.locationSeqId }}</ion-label>
              </ion-chip>
            </div>

            <div class="product-count">
              <ion-item v-if="!isShipmentReceived()">
                <ion-input :label="translate('Qty')" :disabled="isForceScanEnabled" label-placement="floating" type="number" min="0" v-model="item.quantityAccepted" />
              </ion-item>
              <div v-else>
                <ion-item lines="none">
                  <ion-badge color="medium" slot="end">{{ item.quantityOrdered }} {{ translate("ordered") }}</ion-badge>
                  <ion-badge color="success" class="ion-margin-start" slot="end">{{ item.quantityAccepted }} {{ translate("received") }}</ion-badge>
                </ion-item>
              </div>
            </div>
          </div>

          <ion-item lines="none" class="border-top" v-if="item.quantityOrdered > 0 && !isShipmentReceived()">
            <ion-button @click="receiveAll(item)" :disabled="isForceScanEnabled" slot="start" fill="outline">
              {{ translate("Receive All") }}
            </ion-button>

            <ion-progress-bar :color="getRcvdToOrdrdFraction(item) === 1 ? 'success' : getRcvdToOrdrdFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrdrdFraction(item)" />
            
            <p slot="end">{{ item.quantityOrdered }} {{ translate("shipped") }}</p>
          </ion-item>
        </ion-card>
      </main>

      <!-- Removing fab when the shipment is already received, this case can occur when directly hitting the shipment detail page for an already received shipment -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="!isShipmentReceived()">
        <ion-fab-button :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibleForReceivingShipment()" @click="completeShipment">
          <ion-icon :icon="checkmarkDone" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonInput,
  IonLabel,
  IonPage,
  IonProgressBar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  IonChip,
  modalController,
  alertController,
} from '@ionic/vue';
import { defineComponent, computed } from 'vue';
import { add, checkmarkDone, cameraOutline, locationOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import AddProductModal from '@/views/AddProductModal.vue'
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore } from '@hotwax/dxp-components';
import { useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue";
import LocationPopover from '@/components/LocationPopover.vue'
import ImageModal from '@/components/ImageModal.vue';
import { hasError, showToast } from '@/utils'
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: "ShipmentDetails",
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonContent,
    IonHeader,
    IonFab,
    IonFabButton,
    IonIcon,
    IonItem,
    IonInput,
    IonLabel,
    IonPage,
    IonProgressBar,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    DxpShopifyImg,
    IonChip,
    LocationPopover
  },
  props: ["shipment"],
  data() {
    return {
      queryString: '',
      lastScannedId: ''
    }
  },
  mounted() {
    this.store.dispatch('shipment/setCurrent', { shipmentId: this.$route.params.id })
  },
  computed: {
    ...mapGetters({
      current: 'shipment/getCurrent',
      user: 'user/getCurrentFacility',
      getProduct: 'product/getProduct',
      facilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId',
      currentFacility: 'user/getCurrentFacility',
      productIdentificationPref: 'user/getProductIdentificationPref',
      isForceScanEnabled: 'util/isForceScanEnabled',
    }),
  },
  methods: {
    getRcvdToOrdrdFraction(item: any){
      return item.quantityAccepted / item.quantityOrdered;
    },
    isShipmentReceived() {
      return this.current?.statusId === 'PURCH_SHIP_RECEIVED'
    },
    async openImage(imageUrl: string, productName: string) {
      const imageModal = await modalController.create({
        component: ImageModal,
        componentProps: { imageUrl , productName }
      });
      return imageModal.present();
    },
    async addProduct() {
      const modal = await modalController
        .create({
          component: AddProductModal
        })
        modal.onDidDismiss()
        .then( () => {
          this.store.dispatch('product/clearSearchedProducts')
        })
      return modal.present();
    },
    async fetchProducts(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        viewSize,
        viewIndex,
      }
        await this.store.dispatch("product/fetchProducts", payload);
    },
    async completeShipment() {
      const alert = await alertController.create({
        header: translate("Receive Shipment"),
        message: translate("Make sure you have entered all the inventory you received. You cannot edit this information after proceeding.", {space: '<br /><br />'}),
        buttons: [
          {
            text: translate("Cancel"),
            role: 'cancel',
          }, 
          {
            text:translate('Proceed'),
            handler: () => {
              this.receiveShipment();
            },
          }
        ],
      });
      return alert.present();
    },
    async receiveShipment() {
      const eligibleItems = this.current.items.filter((item: any) => item.quantityAccepted > 0)
      const shipmentId = this.current.shipment ? this.current.shipment.shipmentId : this.current.shipmentId 
      const resp = await this.store.dispatch('shipment/receiveShipment', { items: eligibleItems, shipmentId })
      if (resp.status === 200 && !hasError(resp)) {
        this.router.push('/shipments');
      } else {
        showToast(translate("Failed to receive shipment"))
      }
    },
    isEligibleForReceivingShipment() {
      return this.current.items.some((item: any) => item.quantityAccepted > 0)
    },
    receiveAll(item: any) {
      this.current.items.find((ele: any) => {
        if(ele.itemSeqId == item.itemSeqId) {
          ele.quantityAccepted = ele.quantityOrdered;
          ele.progress = ele.quantityAccepted / ele.quantityOrdered
          return true;
        }
      })
    },
    async updateProductCount(payload: any){
      if(this.queryString) payload = this.queryString

      if(!payload) {
        showToast(translate("Please provide a valid valid barcode identifier."))
        return;
      }
      const result = await this.store.dispatch('shipment/updateShipmentProductCount', payload)

      if(result.isProductFound) {
        showToast(translate("Scanned successfully.", { itemName: payload }))
        this.lastScannedId = payload
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
            handler: async () => {
              const modal = await modalController.create({
                component: AddProductModal,
                componentProps: { selectedSKU: payload }
              })

              modal.onDidDismiss().then(() => {
                this.store.dispatch('product/clearSearchedProducts')
              })

              return modal.present();
            }
          }],
          duration: 5000
        })
      }
      this.queryString = ''
    },
    async scanCode () {
      const modal = await modalController
        .create({
          component: Scanner,
        });
        modal.onDidDismiss()
        .then((result) => {
          if(result.role) {
            this.updateProductCount(result.role);
          }
      });
      return modal.present();
    },
  }, 
  setup() {
    const store = useStore(); 
    const router = useRouter();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      Actions,
      add,
      cameraOutline,
      checkmarkDone,
      hasPermission,
      locationOutline,
      store,
      router,
      translate,
      getProductIdentificationValue,
      productIdentificationPref
    };
  },
});
</script>

<style scoped>
ion-content > main {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}

ion-thumbnail {
  cursor: pointer;
}

.border-top {
  border-top: 1px solid #ccc;
}

.scanned-item {
  /*
    Todo: used outline for highliting items for now, need to use border
    Done this because currently ion-item inside ion-card is not inheriting highlighted background property.
  */
  outline: 2px solid var( --ion-color-medium-tint);
}
</style>
