<template>
  <ion-page data-testid="return-details-page">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/returns" slot="start" data-testid="return-details-back-button"></ion-back-button>
        <ion-title data-testid="return-details-title">{{ translate("Return Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="doc-id">
          <ion-item lines="none" data-testid="return-details-order-item">
            <h1 data-testid="return-details-order-name">{{ current.shopifyOrderName ? current.shopifyOrderName : current.hcOrderId ? current.hcOrderId : current.externalId ? current.externalId : translate("Return Details") }}</h1>
            <!-- TODO: Fetch Customer name -->
            <!-- <p>{{ translate("Customer: <customer name>")}}</p> -->
          </ion-item>

          <div class="doc-meta">
            <ion-badge :color="statusColorMapping[current.statusDesc]" slot="end" data-testid="return-details-status-badge">{{ current.statusDesc }}</ion-badge>
            <ion-chip v-if="current.trackingCode" slot="end" data-testid="return-details-tracking-chip">{{ current.trackingCode }}</ion-chip>
          </div>
        </div>

        <div class="scanner">
          <ion-item>
            <ion-input :label="translate(isReturnReceivable(current.statusId) ? 'Scan items' : 'Search items')" autofocus v-model="queryString" @keyup.enter="isReturnReceivable(current.statusId) ? updateProductCount() : searchProduct()" data-testid="return-details-search-input" />
          </ion-item>

          <ion-button expand="block" fill="outline" @click="scanCode()" :disabled="!isReturnReceivable(current.statusId)" data-testid="return-details-scan-button">
            <ion-icon slot="start" :icon="barcodeOutline" />{{ translate("Scan") }}
          </ion-button>
        </div>

        <ion-card v-for="item in current.items" :key="item.id" :class="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId)) === lastScannedId ? 'scanned-item' : ''" :id="getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))" :data-testid="`return-details-item-card-${item.id}`">
          <div class="product" :data-product-id="item.productId">
            <div class="product-info">
              <ion-item lines="none" :data-testid="`return-details-item-info-${item.id}`">
                <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)" data-testid="'return-details-item-thumbnail-' + item.id">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap" :data-testid="`return-details-item-label-${item.id}`">
                  <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                  <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
                </ion-label>
              </ion-item>
            </div>

            <div class="location">
              <ion-button v-if="!productQoh[item.productId] && productQoh[item.productId] !== 0" fill="clear" @click.stop="fetchQuantityOnHand(item.productId)" :data-testid="`return-details-fetch-qoh-button-${item.id}`">
                <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
              </ion-button>
              <ion-chip v-else outline :data-testid="`return-details-qoh-chip-${item.id}`">
                {{ translate("on hand", { qoh: productQoh[item.productId] }) }}
                <ion-icon color="medium" :icon="cubeOutline"/>
              </ion-chip>
            </div>

            <div class="product-count">
              <ion-item v-if="isReturnReceivable(current.statusId) && item.quantityReceived === 0" :data-testid="`return-details-quantity-item-${item.id}`">
                <ion-input :label="translate('Qty')" :disabled="isForceScanEnabled" label-placement="floating" type="number" min="0" v-model="item.quantityAccepted" data-testid="'return-details-quantity-input-' + item.id" />
              </ion-item>
              <ion-item v-else lines="none" :data-testid="`return-details-received-item-${item.id}`">
                <ion-label data-testid="'return-details-received-label-' + item.id">{{ item.quantityAccepted }} {{ translate("received") }}</ion-label>
              </ion-item>
            </div>
          </div>

          <ion-item lines="none" class="border-top" v-if="item.quantityOrdered > 0" :data-testid="`return-details-progress-item-${item.id}`">
            <ion-button v-if="isReturnReceivable(current.statusId) && item.quantityReceived === 0" :disabled="isForceScanEnabled" @click="receiveAll(item)" slot="start" fill="outline" :data-testid="`return-details-receive-all-button-${item.id}`">
              {{ translate("Receive All") }}
            </ion-button>
            <ion-progress-bar :color="getRcvdToOrdrdFraction(item) === 1 ? 'success' : getRcvdToOrdrdFraction(item) > 1 ? 'danger' : 'primary'" :value="getRcvdToOrdrdFraction(item)" :data-testid="`return-details-progress-bar-${item.id}`" />
            <p slot="end" :data-testid="`return-details-returned-quantity-label-${item.id}`">{{ item.quantityOrdered }} {{ translate("returned") }}</p>
          </ion-item>
        </ion-card>
      </main>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibleForReceivingReturns()" v-if="isReturnReceivable(current.statusId)" @click="completeShipment" data-testid="return-details-complete-shipment-button">
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
import { defineComponent, computed } from 'vue';
import { checkmarkDone, cubeOutline, barcodeOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore } from '@hotwax/dxp-components';
import { useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue";
import ImageModal from '@/components/ImageModal.vue';
import { getFeatures, showToast, hasWebcamAccess } from '@/utils'
import { Actions, hasPermission } from '@/authorization'
import { ProductService } from '@/services/ProductService';

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
      lastScannedId: '',
      productQoh: {} as any,
      observer: {} as IntersectionObserver
    }
  },
  async ionViewWillEnter() {
    await this.store.dispatch('return/setCurrent', { shipmentId: this.$route.params.id })
    this.observeProductVisibility();
  },
  ionViewDidLeave() {
    this.productQoh = {};
  },
  computed: {
    ...mapGetters({
      current: 'return/getCurrent',
      getProduct: 'product/getProduct',
      facilityLocationsByFacilityId: 'user/getFacilityLocationsByFacilityId',
      returns: 'return/getReturns',
      validStatusChange: 'return/isReturnReceivable',
      isReturnReceivable: 'return/isReturnReceivable',
      isForceScanEnabled: 'util/isForceScanEnabled',
      barcodeIdentifier: 'util/getBarcodeIdentificationPref'
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
    observeProductVisibility() {
      if(this.observer.root) {
        this.observer.disconnect();
      }
      
      this.observer = new IntersectionObserver((entries: any) => {
        entries.forEach((entry: any) => {
          if (entry.isIntersecting) {
            const productId = entry.target.getAttribute('data-product-id');
            if (productId && !this.productQoh[productId]) {
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
      let isReturnReceived = await this.store.dispatch('shipment/receiveShipmentJson', { items: eligibleItems, shipmentId });
      if (isReturnReceived) {
        showToast(translate("Return received successfully", { shipmentId: shipmentId }))
        this.router.push('/returns');
      } else {
        showToast(translate('Something went wrong'));
        await this.store.dispatch('return/setCurrent', { shipmentId: this.$route.params.id })
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
          if(result.role) {
            this.updateProductCount(result.role);
          }
      });
      return modal.present();
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
    }
  }, 
  setup() {
    const store = useStore(); 
    const router = useRouter();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      Actions,
      barcodeOutline,
      checkmarkDone,
      cubeOutline,
      getFeatures,
      hasPermission,
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
