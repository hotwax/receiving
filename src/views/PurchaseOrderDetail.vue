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
<<<<<<< HEAD
          <h1>{{$t("Purchase Order")}}: {{ orderDetail[0]?.externalOrderId }}</h1>
=======
          <ion-label>{{$t("Purchase Order")}}: PO10291</ion-label>
>>>>>>> #1xhjpgd
        </ion-item>
        <ion-item>
          <ion-label>{{$t("Scan Items")}}</ion-label>
        </ion-item>
        <ion-card v-for="(item, index) in orderDetail" :key="index">
          <div class="product-info">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image src="https://cdn.shopify.com/s/files/1/0069/7384/9727/products/test-track.jpg?v=1626255137" />
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
import { addOutline, saveOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { useStore, mapGetters } from 'vuex';
import Image from "@/components/Image.vue";

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
    }
  }, 
  setup() {
    const store = useStore();
    return {
      addOutline,
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
  grid-template-columns: auto .25fr;
  align-items: center;
  padding: 16px;
}

.product-count {
  min-width: 9ch;
}
</style>
