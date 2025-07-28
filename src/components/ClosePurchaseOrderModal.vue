<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Close purchase order items") }}</ion-title>
      <ion-buttons slot="end" @click="selectAllItems">
        <ion-button color="primary">{{ translate("Select all") }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item lines="none">
      <ion-list-header>{{ translate("To close the purchase order, select all.") }}</ion-list-header>
    </ion-item>
    <ion-list>
      <ion-item :button="isPOItemStatusPending(item)" v-for="(item, index) in getPOItems()" :key="index" @click="item.isChecked = !item.isChecked">
        <ion-thumbnail slot="start">
          <DxpShopifyImg size="small" :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p>{{ getFeatures(getProduct(item.productId).productFeatures) }}</p>
        </ion-label>
        <ion-buttons>
          <ion-checkbox aria-label="itemStatus" slot="end" :modelValue="isPOItemStatusPending(item) ? item.isChecked : true" :disabled="isPOItemStatusPending(item) ? false : true" />
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
import { defineComponent, computed } from 'vue';
import { mapGetters, useStore } from 'vuex'
import { OrderService } from "@/services/OrderService";
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore } from '@hotwax/dxp-components';
import { useRouter } from 'vue-router';
import { copyToClipboard, getFeatures, hasError } from '@/utils';

export default defineComponent({
  name: "ClosePurchaseOrderModal",
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
      getPOItemAccepted: 'order/getPOItemAccepted',
      order: 'order/getCurrent',
      purchaseOrders: 'order/getPurchaseOrders'
    })
  },
  props: ['isEligibileForCreatingShipment'],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async confirmSave() {
      const alert = await alertController.create({
        header: translate('Close purchase order items'),
        message: translate("The selected items won't be available for receiving later."),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        },
        {
          text: translate('Proceed'),
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
    async serverErrorAlert(error: any) {
      const message = error.response?.data?.error?.message || 'Failed to update the status of purchase order items.';
      const alert = await alertController.create({
        header: translate('Error while receiving'),
        message,
        buttons: [{
          text: translate('Copy & Dismiss'),
          handler: async() => {
            copyToClipboard(message)
            return;
          }
        },
        {
          text: translate('Dismiss'),
          role: 'cancel',
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
      let hasFailedItems = false;
      let completedItems = [] as any;
      let lastItem = {} as any;

      if(eligibleItems.length > 1) {
        const itemsToBatchUpdate = eligibleItems.slice(0, -1);
        lastItem = eligibleItems[eligibleItems.length - 1];
       
        const batchSize = 10;
        while(itemsToBatchUpdate.length) {
          const itemsToUpdate = itemsToBatchUpdate.splice(0, batchSize)
  
          const responses = await Promise.allSettled(itemsToUpdate.map(async(item: any) => {
            await OrderService.updatePOItemStatus({
              orderId: item.orderId,
              orderItemSeqId: item.orderItemSeqId,
              statusId: "ITEM_COMPLETED"
            })
            return item.orderItemSeqId
          }))

          responses.map((response: any) => {
            if(response.status === "fulfilled") {
              completedItems.push(response.value)
            } else {
              hasFailedItems = true
            }
          })
        }
      } else {
        lastItem = eligibleItems[0]
      }

      try{
        const resp = await OrderService.updatePOItemStatus({
          orderId: lastItem.orderId,
          orderItemSeqId: lastItem.orderItemSeqId,
          statusId: "ITEM_COMPLETED"
        })

        if(!hasError(resp)) {
          completedItems.push(lastItem.orderItemSeqId)
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        hasFailedItems = true;
        await this.serverErrorAlert(error);
      }

      if(hasFailedItems){
        console.error('Failed to update the status of purchase order items.')
      }

      if(!completedItems.length) return;

      this.order.items.map((item: any) => {
        if(completedItems.includes(item.orderItemSeqId)) {
          item.orderItemStatusId = "ITEM_COMPLETED"
        }
      })
      this.store.dispatch("order/updateCurrentOrder", this.order)

      if(this.purchaseOrders.length) {
        let purchaseOrders = JSON.parse(JSON.stringify(this.purchaseOrders))
        const currentOrder = purchaseOrders.find((purchaseOrder: any) => purchaseOrder.groupValue === this.order.orderId)
        let isPOCompleted = true;

        currentOrder.doclist.docs.map((item: any) => {
          if(completedItems.includes(item.orderItemSeqId)) {
            item.orderItemStatusId = "ITEM_COMPLETED"
          } else if(item.orderItemStatusId !== "ITEM_COMPLETED" && item.orderItemStatusId !== "ITEM_REJECTED") {
            isPOCompleted = false
          }
        })

        if(isPOCompleted) {
          purchaseOrders = purchaseOrders.filter((purchaseOrder: any) => purchaseOrder.groupValue !== currentOrder.groupValue)
        }
        this.store.dispatch("order/updatePurchaseOrders", { purchaseOrders })
      }
      this.router.push('/purchase-orders');
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
    },
    checkAlreadyFulfilledItems() {
      this.order.items.map((item: any) => {
        if(this.isPOItemStatusPending(item) && this.getPOItemAccepted(item.productId) > 0) {
          item.isChecked = true;
        }
      })
    }
  },
  mounted() {
    this.checkAlreadyFulfilledItems()
  },
  setup() {
    const router = useRouter()
    const store = useStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      arrowBackOutline,
      Actions,
      closeOutline,
      checkmarkCircle,
      getFeatures,
      hasPermission,
      OrderService,
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