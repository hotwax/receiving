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
                <ion-label>{{ getProduct(item.productId).productName }}</ion-label>
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
import { add, saveOutline, timeOutline } from 'ionicons/icons';
import ReceivingHistoryModal from '@/views/ReceivingHistoryModal.vue'
import { useStore, mapGetters } from 'vuex';

export default defineComponent({
  name: "Purchase order details",
  components: {
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
        cssClass: "my-custom-class",
        header: "Receive inventory",
        message:
          "Inventory can be received for purchase orders in multiple shipments. <br/><br/> Proceeding will recieve a new shipment for this purchase order but it will still be available for receiving later",
        buttons: ["Cancel", "Proceed"],
      });
      return alert.present();
    }
  }, 
  setup() {
    const store = useStore();
    return {
      add,
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