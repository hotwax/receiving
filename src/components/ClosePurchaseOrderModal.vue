<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Close purchase order items") }}</ion-title>
      <ion-buttons slot="end" @click="selectAllItems">
        <ion-button color="primary">{{ $t("Select all") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item lines="none">
      <ion-list-header>{{ $t("To close the purchase order, select all.") }}</ion-list-header>
    </ion-item>
    <ion-list>
      <ion-item :button="isPOItemStatusPending(item)" v-for="(item, index) in getPOItems()" :key="index" @click="item.isChecked = !item.isChecked">
        <ion-thumbnail slot="start">
          <ShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ productHelpers.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) }}</h2>
          <p>{{ productHelpers.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
        </ion-label>
        <ion-buttons>
          <ion-badge v-if="item.orderItemStatusId === 'ITEM_COMPLETED'" slot="end">{{ $t("Completed") }}</ion-badge>
          <ion-badge v-else-if="item.orderItemStatusId === 'ITEM_REJECTED'" color="danger" slot="end">{{ $t("Rejected") }}</ion-badge>
          <ion-checkbox v-else slot="end" :modelValue="item.isChecked" />
        </ion-buttons>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibleToClosePOItems()" @click="confirmSave">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonToolbar,
  IonThumbnail,
  alertController,
  modalController
} from '@ionic/vue';
import { Actions, hasPermission } from '@/authorization'
import { closeOutline, checkmarkCircle, arrowBackOutline, saveOutline } from 'ionicons/icons';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex'
import { OrderService } from "@/services/OrderService";
import { productHelpers } from '@/utils';
import { ShopifyImg } from '@hotwax/dxp-components';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: "ClosePurchaseOrderModal",
  components: {
    IonBadge,
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonTitle,
    IonThumbnail,
    IonToolbar,
    ShopifyImg
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      order: 'order/getCurrent',
      productIdentificationPref: 'user/getProductIdentificationPref'
    })
  },
  props: ['isEligibileForCreatingShipment'],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async confirmSave() {
      const alert = await alertController.create({
        header: this.$t('Close purchase order items'),
        message: this.$t('Are you sure you have received the purchase order for the selected items? Once closed, the shipments for the selected items wont be available for receiving later.', { space: '<br /><br />' }),
        buttons: [{
          text: this.$t('Cancel'),
          role: 'cancel'
        },
        {
          text: this.$t('Proceed'),
          role: 'proceed',
          handler: async() => {
            await this.updatePOItemStatus()
            modalController.dismiss()
            this.router.push('/purchase-orders')
          }
        }]
      });
      return alert.present();
    },
    async updatePOItemStatus() {
      // Shipment can only be created if quantity is specified for atleast one PO item.
      // In some cases we don't need to create shipment instead directly need to close PO items.
      if(this.isEligibileForCreatingShipment) {
        const eligibleItemsForShipment = this.order.items.filter((item: any) => item.quantityAccepted > 0)
        await this.store.dispatch('order/createPurchaseShipment', { items: eligibleItemsForShipment, orderId: this.order.orderId })
      }

      const eligibleItems = this.order.items.filter((item: any) => item.isChecked && this.isPOItemStatusPending(item))
      const responses = await Promise.allSettled(eligibleItems.map(async (item: any) => {
        await OrderService.updatePOItemStatus({
          orderId: item.orderId,
          orderItemSeqId: item.orderItemSeqId,
          statusId: "ITEM_COMPLETED"
        })
      }))
      const failedItemsCount = responses.filter((response) => response.status === 'rejected').length
      if(failedItemsCount){
        console.error('Failed to update the status of purchase order items.')
      }
    },
    isEligibleToClosePOItems() {
      return this.order.items.some((item: any) => item.isChecked && this.isPOItemStatusPending(item))
    },
    isPOItemStatusPending(item: any) {
      return item.orderItemStatusId !== "ITEM_COMPLETED" && item.orderItemStatusId !== "ITEM_REJECTED"
    },
    selectAllItems() {
      this.order.items.map((item:any) => {
        // Purchase Order may contains items without orderId, there status can't be updated
        // Hence not allowing to select those items.
        if(item.orderId && this.isPOItemStatusPending(item)) {
          item.isChecked = true;
        } 
      })
    },
    getPOItems() {
      return this.order.items.filter((item: any) => item.orderId)
    }
  },
  setup() {
    const router = useRouter()
    const store = useStore()

    return {
      arrowBackOutline,
      Actions,
      closeOutline,
      checkmarkCircle,
      hasPermission,
      OrderService,
      productHelpers,
      router,
      saveOutline,
      store
    };
  }
});
</script>