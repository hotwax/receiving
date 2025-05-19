<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Close transfer order items") }}</ion-title>
      <ion-buttons slot="end" @click="selectAllItems">
        <ion-button color="primary">{{ translate("Select all") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item lines="none">
      <ion-list-header>{{ translate("To close the transfer order, select all.") }}</ion-list-header>
    </ion-item>
    <ion-list>
      <ion-item :button="isTOItemStatusPending(item)" v-for="(item, index) in getTOItems()" :key="index" @click="item.isChecked = !item.isChecked">
        <ion-thumbnail slot="start">
          <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
        </ion-label>
        <ion-buttons>
          <ion-checkbox aria-label="itemStatus" slot="end" :modelValue="isTOItemStatusPending(item) ? item.isChecked : true" :disabled="isTOItemStatusPending(item) ? false : true" />
        </ion-buttons>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="!hasPermission(Actions.APP_SHIPMENT_UPDATE) || !isEligibleToCloseTOItems()" @click="confirmSave">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import {
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
import { arrowBackOutline, saveOutline } from 'ionicons/icons';
import { defineComponent, computed } from 'vue';
import { mapGetters, useStore } from 'vuex'
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components';
import { useRouter } from 'vue-router';
import { TransferOrderService } from '@/services/TransferOrderService';

export default defineComponent({
  name: "CloseTransferOrderModal",
  components: {
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
    DxpShopifyImg
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      order: 'transferorder/getCurrent'
    })
  },
  props: ['isEligibileForCreatingShipment'],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async confirmSave() {
      const alert = await alertController.create({
        header: translate('Close transfer order items'),
        message: translate("The selected items won't be available for receiving later."),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        },
        {
          text: translate('Proceed'),
          role: 'proceed',
          handler: async() => {
            await this.updateTOItemStatus()
            modalController.dismiss()
            this.router.push('/transfer-orders')
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
      if (!eligibleItems.length) return;

      // Prepare payload for API, always sending quantityAccepted (default 0)
      const payload = {
        facilityId: this.getCurrentFacilityId(),
        orderItems: eligibleItems.map((item: any) => ({
          orderItemSeqId: item.orderItemSeqId,
          productId: item.productId,
          quantityAccepted: Number(item.quantityAccepted) || 0,
          statusId: "ITEM_COMPLETED"
        }))
      };

      try {
        await TransferOrderService.receiveTransferOrder(this.order.orderId, payload);
      } catch (error) {
        console.error('Failed to update the status of transfer order items.', error);
      }
    },
    isEligibleToCloseTOItems() {
      return this.order.items.some((item: any) => item.isChecked && this.isTOItemStatusPending(item))
    },
    isTOItemStatusPending(item: any) {
      return item.statusId !== "ITEM_COMPLETED" && item.statusId !== "ITEM_REJECTED"
    },
    selectAllItems() {
      this.order.items.map((item:any) => {
          item.isChecked = true;
    })
    },
    getTOItems() {
      return this.order.items.filter((item: any) => item.orderItemSeqId)
    },
  },
  setup() {
    const router = useRouter()
    const store = useStore()
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      arrowBackOutline,
      Actions,
      hasPermission,
      router,
      saveOutline,
      store,
      translate,
      getProductIdentificationValue,
      productIdentificationPref
    };
  }
});
</script>