<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{$t("Purchase Order Details")}}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="receivingHistory">
            <ion-icon :icon="timeOutline"/>
          </ion-button>
          <ion-button>
            <ion-icon :icon="add"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div>
        <ion-item lines="none">
          <h1>{{$t("Purchase Order")}}: {{ orderDetail[0]?.externalOrderId }}</h1>
        </ion-item>
        <!-- TODO: add styling on chip -->
        <div>
          <ion-chip>
            <ion-label>Arrival date</ion-label>
          </ion-chip>
          <ion-chip>
            <ion-label>External ID</ion-label>
          </ion-chip>        
        </div>
        <ion-item slot="end">
          <ion-label>{{$t("Scan Items")}}</ion-label>
          <ion-label>
            <ion-input placeholder="Scan barcodes to receive" />
          </ion-label>
        </ion-item>
        <ion-card v-for="(item, index) in orderDetail" :key="index">
          <div class="product-info">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <img :src="getProduct(item.productId).mainImageUrl" />
              </ion-thumbnail>
              <ion-label>
                <ion-label>{{ getProduct(item.productId).productName }}</ion-label>
                <p>{{ item.productId }}</p>
              </ion-label>
            </ion-item>
            <div class="producy-chip">
              <ion-chip outline>
                <ion-icon :icon="checkmarkDoneOutline"/>
                <ion-label>50 {{ $t("received") }}</ion-label>
              </ion-chip>
            </div>
            <ion-item class="product-count">
              <ion-label position="floating" color="dark">Qty</ion-label>
              <ion-input type="number" min="0" v-model="item.quantityAccepted" />
            </ion-item>
          </div>
          <ion-item class="border-top" v-if="item.quantityOrdered > 0">
            <ion-button @click="receiveAll(item)" slot="start" fill="outline">
              {{ $t("ReceiveAll") }}
            </ion-button>
            <ion-progress-bar :value="item.quantityAccepted/item.quantityOrdered" />
            <p slot="end">{{ item.quantityOrdered }}</p>
          </ion-item>
        </ion-card>
      </div>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="savePODetails">
          <ion-icon :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
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
import { add, checkmarkDoneOutline, saveOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { useStore, mapGetters } from 'vuex';

export default defineComponent({
  name: "Purchase order details",
  components: {
    IonBackButton,
    IonButton,
    IonButtons,
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
  },
  computed: {
    ...mapGetters({
      orderDetail: 'purchaseOrder/getOrderDetails',
      getProduct: 'product/getProduct'
    })
  },
  methods: {
    async receivingHistory() {
      const modal = await modalController
        .create({
          component: ReceivingHistoryModal
        })
      return modal.present();
    },
    async savePODetails() {
      const alert = await alertController.create({
        header: this.$t('Receive inventory'),
        message: 
          this.$t('Inventory can be received for purchase orders in multiple shipments. Proceeding will recieve a new shipment for this purchase order but it will still be available for receiving later', { space: '<br /><br />' }),
        buttons: [{
          text: this.$t('Cancel'),
          role: 'cancel'
        },
        {
          text: this.$t('Proceed'),
          handler: () => {
            //TODO: this is functional need to work on this
            this.store.dispatch('purchaseOrder/receiveInventory')
          },
        }]
      });
      return alert.present();
    },
    async getorderDetails(orderId?: any) {
      const payload = {
        "json": {
          "params": {
            "rows": 10,
            "group": true,
            "group.field": "orderId",
            "group.limit": 10000
          },
          "query": "docType:ORDER", 
          "filter": [
              `orderTypeId: PURCHASE_ORDER AND orderId: ${orderId}`
          ]
        }
      }
      this.store.dispatch("purchaseOrder/getOrderDetails", {payload, orderId});
    },
    receiveAll(item: any) {
      this.orderDetail.filter((ele: any) => {
        if(ele.itemSeqId == item.itemSeqId) {
          ele.quantityAccepted = ele.quantityOrdered;
          ele.progress = ele.quantityAccepted / ele.quantityOrdered
        }
      })
    },
  }, 
  mounted() {
    this.store.dispatch('product/setCurrentProduct')
    this.getorderDetails(this.$route.params.slug);
  },
  setup() {
    const store = useStore();
    return {
      add,
      checkmarkDoneOutline,
      saveOutline,
      store,
      timeOutline
    };
  },
});
</script>

<style scoped>
ion-content div {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}

img {
  object-fit: contain;
}

.border-top {
  border-top: 1px solid #ccc;
}

.product-info {
  display: grid;
  grid-template-columns: auto 1fr .25fr;
  align-items: center;
  padding: 16px;
}

.producy-chip {
  justify-self: center;
}

.product-count {
  min-width: 9ch;
}
</style>
