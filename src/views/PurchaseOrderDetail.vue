<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title> {{$t("Purchase Order Details")}} </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="receivingHistory">
            <ion-icon slot="icon-only" :icon="timeOutline"/>
          </ion-button>
          <ion-button>
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div>
        <ion-item lines="none">
          <h1>{{$t("Purchase Order")}}: {{ orderDetail[0]?.externalOrderId }}</h1>
        </ion-item>
        <ion-item>
          <ion-label>{{$t("Scan Items")}}</ion-label>
          <ion-label>
            <ion-input placeholder="Scan barcodes to receive" />
          </ion-label>
        </ion-item>
        <ion-card v-for="(item, index) in orderDetail" :key="index">
          <div class="product-info">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <!-- TODO:- handle this getter when another pull request get merged -->
                <img src="getProduct(item.productId).mainImageUrl" />
              </ion-thumbnail>
              <ion-label>
                <ion-label>{{ item.productName }}</ion-label>
                <p>{{ item.productId }}</p>
              </ion-label>
            </ion-item>
            <ion-item class="product-count">
              <ion-input type="number" value="0" min="0"></ion-input>
            </ion-item>
          </div>
          <ion-item class="border-top">
            <ion-button slot="start" fill="outline">
              {{ $t("ReceiveAll") }}
            </ion-button>
            <ion-progress-bar value="1"></ion-progress-bar>
            <p slot="end">5</p>
          </ion-item>
          <ion-button fill="outline">
            <ion-icon slot="start" :icon="cameraOutline" />
            {{ $t("Scan") }}
          </ion-button>
        </div>
        
        <div class="po-items">
          <ion-card>
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <Image src="https://cdn.shopify.com/s/files/1/0069/7384/9727/products/test-track.jpg?v=1626255137" />
                </ion-thumbnail>
                <ion-label>
                  Shopify SKU
                  <p>Parent product</p>
                </ion-label>
              </ion-item>

              <ion-chip outline="true" class="po-item-history">
                <ion-icon :icon="checkmarkDone"/>
                <ion-label> 50 {{ $t("received") }} </ion-label>
              </ion-chip>

              <ion-item class="product-count">
                <ion-input type="number" value="0" min="0" />
              </ion-item>
            </div>
            <ion-item lines="none" class="border-top">
              <ion-button slot="start" fill="outline">
                {{ $t("Receive All") }}
              </ion-button>
              <ion-progress-bar value="1" />
              <p slot="end">5 ordered</p>
            </ion-item>
          </ion-card>
        </div>  
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
import { addOutline, cameraOutline, checkmarkDone, saveOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { useStore } from 'vuex';
import { mapGetters } from "vuex";

export default defineComponent({
  name: "PurchaseOrderDetails",
  components: {
    Image,
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
          role: 'proceed'
        }]
      });
      return alert.present();
    },
    async getorderDetails(orderId?: any){
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
    }
  }, 
  mounted(){
    this.getorderDetails(this.$route.params.slug);
  },
  setup() {
    const store = useStore();
    return {
      addOutline,
      cameraOutline,
      checkmarkDone,
      saveOutline,
      store,
      timeOutline
    };
  },
});
</script>

<style scoped>
ion-content div {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.po-meta {
  display: flex;
  gap: 8px;
}

.po-scanner {
  grid-column: 1 / -1;
  display: flex;
}

.po-scanner > * {
  flex: 1;
}

.po-items {
  grid-column: 1 / -1;
}

.product-info {
  display: grid;
  grid-template-columns: 1fr 1fr .25fr;
  align-items: center;
  padding: 0 16px 0 0;
}

.po-item-history {
  justify-self: center;
}

.product-count {
  min-width: 9ch;
}
</style>
