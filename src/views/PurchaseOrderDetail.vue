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
            <ion-icon :icon="addOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div>
        <ion-item lines="none">
          <ion-label>{{$t("Purchase Order")}}: {{ orderDetail[0]?.externalOrderId }}</ion-label>
        </ion-item>
        <div class="po-scanner">
          <ion-item class="action-text">
            {{$t("Scan Items")}}
            <ion-label>
              <ion-input :placeholder="$t('Scan barcodes to receive them')"></ion-input>
            </ion-label>
          </ion-item>
          <ion-button class="action-button" fill="outline" @click="scanCode()">
            <ion-icon slot="start" :icon="cameraOutline" />
            {{ $t("Scan") }}
          </ion-button>
        </div>
        <ion-card v-for="(item, index) in orderDetail" :key="index">
          <div class="product-info">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image :src="getProduct(item.productId).mainImageUrl" />
              </ion-thumbnail>
              <ion-label>
                {{ getProduct(item.productId).productName }}
                <p>{{ item.productId }}</p>
              </ion-label>
            </ion-item>
            <ion-item class="product-count">
              <ion-input type="number" value="0" min="0" />
            </ion-item>
          </div>
          <ion-item class="border-top">
            <ion-button slot="start" fill="outline">
              {{ $t("ReceiveAll") }}
            </ion-button>
            <ion-progress-bar value="1" />
            <p slot="end">5</p>
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
import { addOutline, cameraOutline, saveOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { useStore, mapGetters } from 'vuex';
import Image from "@/components/Image.vue";
import Scanner from "./Scanner.vue";

export default defineComponent({
  name: "PurchaseOrderDetails",
  components: {
    Image,
    IonBackButton,
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
    updateProductCount(payload: any){
      this.store.dispatch('purchaseOrder/updatePoProductCount', payload)
    },
    async scanCode(){
      const modal = await modalController
        .create({
          component: Scanner,
        });
        modal.onDidDismiss()
          .then((result) => {
            this.updateProductCount(result.role);
          })
        return modal.present();
    }
  }, 
  setup() {
    const store = useStore();
    return {
      addOutline,
      cameraOutline,
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

.po-scanner {
  display: flex;
}

.action-text {
  flex: 1;
  align-items: center;
}

.action-button {
  flex: 1;
}

.product-info {
  display: grid;
  grid-template-columns: auto .25fr;
  align-items: center;
  padding: 16px;
}

.product-count {
  min-width: 9ch;
}
</style>
