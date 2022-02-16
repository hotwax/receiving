<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/purchase-orders" slot="start" />
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
        <ion-item lines="none" class="po-primary">
          <h1>
            {{$t("Purchase Order")}}: {{ order.orderId }}
          </h1>
        </ion-item>
        
        <div class="po-meta">
          <ion-chip>{{ order.externalOrderId }}</ion-chip>
        </div>
        
        <div class="po-scanner">
          <ion-item>
            {{$t("Scan Items")}}
            <ion-input :placeholder="$t('Scan barcodes to receive')" />
          </ion-item>
          <ion-button fill="outline">
            <ion-icon slot="start" :icon="cameraOutline" />
            {{ $t("Scan") }}
          </ion-button>
        </div>
        
        <div class="po-items">
          <ion-card v-for="(item, index) in order.items" :key="index">
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
              <p slot="end">{{ item.quantity }} {{ $t("ordered") }}</p>
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
import Image from "@/components/Image.vue";
import { useStore, mapGetters } from 'vuex';

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
      order: 'order/getCurrent',
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
  }, 
  mounted() {
    this.store.dispatch("order/getOrderDetail", { orderId: this.$route.params.slug })
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
ion-content > div {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40ch, 1fr));
  column-gap: 8px;
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
  justify-self: end;
  align-self: center;
  padding: 0 10px 0 0;
}

.po-scanner {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
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
