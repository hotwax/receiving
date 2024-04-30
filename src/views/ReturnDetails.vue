<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/returns" slot="start"></ion-back-button>
        <ion-title>{{ translate("Return Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="doc-id">
          <ion-item lines="none">
            <h1>{{ current.shopifyOrderName ? current.shopifyOrderName : current.hcOrderId }}</h1>
            <!-- TODO: Fetch Customer name -->
            <!-- <p>{{ translate("Customer: <customer name>")}}</p> -->
          </ion-item>

          <div class="doc-meta">
            <ion-badge :color="statusColorMapping[current.statusDesc]" slot="end">{{ current.statusDesc }}</ion-badge>
            <ion-chip v-if="current.trackingCode" slot="end">{{ current.trackingCode }}</ion-chip>
          </div>
        </div>

  
        <div class="scanner">
          <ion-item>
            <ion-input :label="translate('Scan items')" autofocus :placeholder="translate('Scan barcodes to receive them')" v-model="queryString" @keyup.enter="updateProductCount()" />
          </ion-item>

          <ion-button expand="block" fill="outline" @click="scanCode()">
            <ion-icon slot="start" :icon="barcodeOutline" />{{ translate("Scan") }}
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
              <ion-chip outline :disabled="true">
                <ion-icon :icon="locationOutline" />
                <ion-label>{{ current.locationSeqId }}</ion-label>
              </ion-chip>
            </div>

            <div class="product-count">
              <ion-item v-if="isReturnReceivable(current.statusId)">
                <ion-input :label="translate('Qty')" label-placement="floating" type="number" min="0" v-model="item.quantityAccepted" />
              </ion-item>
              <ion-item v-if="!isReturnReceivable(current.statusId)" lines="none">
                <ion-label>{{ item.quantityAccepted }} {{ translate("received") }}</ion-label>
              </ion-item>
            </div>
          </div>
  
          <ion-item lines="none" class="border-top" v-if="item.quantityOrdered > 0">
            <ion-button v-if="isReturnReceivable(current.statusId)" @click="receiveAll(item)" slot="start" fill="outline">
              {{ translate("Receive All") }}
            </ion-button>
            <ion-progress-bar :color="getRcvdToOrdrdFraction(item) === 1 ? 'success' : getRcvdToOrdrdFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrdrdFraction(item)" />
            <p slot="end">{{ item.quantityOrdered }} {{ translate("returned") }}</p>
          </ion-item>
        </ion-card>
      </main>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibleForReceivingReturns()" v-if="isReturnReceivable(current.statusId)" @click="completeShipment">
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
  IonCard,
  IonChip,
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
  modalController,
  alertController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { checkmarkDone, barcodeOutline, locationOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import AddProductModal from '@/views/AddProductModal.vue'
import { DxpShopifyImg, translate, getProductIdentificationValue } from '@hotwax/dxp-components';
import { useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue";
import ImageModal from '@/components/ImageModal.vue';
import { hasError } from '@/utils';
import { showToast } from '@/utils'
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: "ReturnDetails",
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonCard,
    IonChip,
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
  },
  props: ["shipment"],
  data() {
    return {
      queryString: '',
      statusColorMapping: {
        'Received': 'success',
        'Approved': 'tertiary',
        'Cancelled': 'danger',
        'Shipped': 'medium',
        'Created': 'medium'
      } as any,
      lastScannedId: ''
    }
  },
  async ionViewWillEnter() {
    const current = await this.store.dispatch('return/setCurrent', { shipmentId: this.$route.params.id })

    if(!this.isReturnReceivable(current.statusId)) {
      showToast(translate("This return has been and cannot be edited.", { status: current?.statusDesc?.toLowerCase() }));
    }
  },
  computed: {
    ...mapGetters({
      current: 'return/getCurrent',
      user: 'user/getCurrentFacility',
      getProduct: 'product/getProduct',
      facilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId',
      returns: 'return/getReturns',
      validStatusChange: 'return/isReturnReceivable',
      isReturnReceivable: 'return/isReturnReceivable',
      productIdentificationPref: 'user/getProductIdentificationPref'
    }),
  },
  methods: {
    getRcvdToOrdrdFraction(item: any){
      return item.quantityAccepted / item.quantityOrdered;
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
              this.receiveReturn();
            },
          }
        ],
      });
      return alert.present();
    },
    async receiveReturn() {
      const eligibleItems = this.current.items.filter((item: any) => item.quantityAccepted > 0)
      const shipmentId = this.current.shipment ? this.current.shipment.shipmentId : this.current.shipmentId 
      let resp = await this.store.dispatch('return/receiveReturn', { items: eligibleItems, shipmentId });
      if(resp.status === 200 && !hasError(resp)) {
        this.router.push('/returns');
      }
    },
    isEligibleForReceivingReturns() {
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
    async updateProductCount(payload?: any){
      if(this.queryString) payload = this.queryString
      // if not a valid status, skip updating the qunatity
      if(!this.isReturnReceivable(this.current.statusId)) return;

      const result = await this.store.dispatch('return/updateReturnProductCount', payload)

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
        showToast(translate("Scanned item is not present within the shipment:", { itemName: payload }))
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

    return {
      Actions,
      barcodeOutline,
      checkmarkDone,
      hasPermission,
      locationOutline,
      store,
      router,
      translate,
      getProductIdentificationValue
    };
  },
});
</script>

<style scoped>
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
</style>
  