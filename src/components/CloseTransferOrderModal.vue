<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Close transfer order items") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item lines="none">
      <ion-list-header>{{ translate("out of items were not received as expected. Please verify them before closing the transfer order", { totalItems: order.items.length, items: getTOItems().length }) }}</ion-list-header>
    </ion-item>
    <ion-list>
      <ion-item :button="isItemQtyAccepted(item)" v-for="(item, index) in getTOItems()" :key="index" @click="isItemQtyAccepted(item) && (item.isChecked = !item.isChecked)">
        <ion-thumbnail slot="start">
          <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
          <ion-note v-if="getItemReceivingError(item)" color="danger">{{ getItemReceivingError(item) }}</ion-note>
        </ion-label>
        <ion-checkbox aria-label="itemStatus" slot="end" :modelValue="item.isChecked" :disabled="!isItemQtyAccepted(item)"/>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-footer>
    <ion-toolbar class="ion-padding-start">
      <ion-label slot="start">{{ translate("Select all items to proceed") }}</ion-label>
      <ion-buttons slot="end">
        <ion-button fill="solid" color="primary" :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibleToCloseTOItems()" @click="confirmSave">{{ translate("Complete transfer order") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonToolbar,
  IonThumbnail,
  alertController,
  modalController
} from '@ionic/vue';
import { Actions, hasPermission } from '@/authorization'
import { arrowBackOutline } from 'ionicons/icons';
import { defineComponent, computed } from 'vue';
import { mapGetters, useStore } from 'vuex'
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { useRouter } from 'vue-router';
import { TransferOrderService } from '@/services/TransferOrderService';
import { getFeatures, showToast } from '@/utils';
import { DateTime } from 'luxon';
import emitter from "@/event-bus";

export default defineComponent({
  name: "CloseTransferOrderModal",
  components: {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonTitle,
    IonThumbnail,
    IonToolbar,
    DxpShopifyImg
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      order: 'transferorder/getCurrent'
    }),
    isItemQtyAccepted() {
      return (item: any) => (item.quantityAccepted && Number(item.quantityAccepted) >= 0)
    },
    getItemReceivingError(): (item: any) => string {
      return (item: any): string => {
        const receivedQty = ((Number(item.totalReceivedQuantity) || 0) + (Number(item.quantityAccepted) || 0)) - (Number(item.quantity) || 0)
        if(receivedQty <= 0) {
          return `Under received: ${receivedQty}`
        } else {
          return `Over received: ${receivedQty}`
        }
      }
    }
  },
  props: ['isEligibileForCreatingShipment'],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async confirmSave() {
      const alert = await alertController.create({
        header: translate('Close transfer order items'),
        message: translate("The transfer order items won't be available for receiving later."),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        },
        {
          text: translate('Proceed'),
          role: 'proceed',
          handler: async () => {
            // Dismiss the alert immediately when proceed is clicked
            alert.dismiss();
            emitter.emit("presentLoader", { message: "Loading...", backdropDismiss: false });

            try {
              const success = await this.updateTOItemStatus();
              if (success) {
                modalController.dismiss();
                this.router.push('/transfer-orders');
              }
            } finally {
              emitter.emit("dismissLoader");
            }
          }
        }]
      });
      return alert.present();
    },
    getCurrentFacilityId() {
      const currentFacility: any = useUserStore().getCurrentFacility;
      return currentFacility?.facilityId
    },
    async updateTOItemStatus() {
      // Get only checked and pending items
      const eligibleItems = this.order.items.filter((item: any) => item.isChecked && this.isTOItemStatusPending(item));
      if (!eligibleItems.length) return false;

      // Prepare payload for API, always sending quantityAccepted (default 0)
      const payload = {
        facilityId: this.getCurrentFacilityId(),
        receivedDateTime: DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
        items: eligibleItems.map((item: any) => ({
          orderItemSeqId: item.orderItemSeqId,
          productId: item.productId,
          quantityAccepted: Number(item.quantityAccepted) || 0,
          statusId: "ITEM_COMPLETED"
        }))
      };

      try {
        await TransferOrderService.receiveTransferOrder(this.order.orderId, payload);
        return true;
      } catch (error) {
        showToast(translate("Failed to update the status of transfer order items."));
        return false;
      }
    },
    isEligibleToCloseTOItems() {
      return this.order.items.every((item: any) => item.isChecked && this.isTOItemStatusPending(item))
    },
    isTOItemStatusPending(item: any) {
      return item.statusId === "ITEM_PENDING_RECEIPT"
    },
    getTOItems() {
      return this.order.items.filter((item: any) => item.orderItemSeqId && !['ITEM_REJECTED', 'ITEM_CANCELLED', 'ITEM_COMPLETED'].includes(item.statusId))
    }
  },
  setup() {
    const router = useRouter()
    const store = useStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      arrowBackOutline,
      Actions,
      getFeatures,
      hasPermission,
      router,
      store,
      translate,
      getProductIdentificationValue,
      productIdentificationPref
    };
  }
});
</script>