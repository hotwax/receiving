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
          <ion-button @click="addProduct">
            <ion-icon slot="icon-only" :icon="addOutline"/>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="po-id">
          <ion-item lines="none">
            <h1>{{$t("Purchase Order")}}: {{ order.externalOrderId }}</h1>
          </ion-item>
          
          <div class="po-meta">
            <ion-chip>{{ order.orderId }}</ion-chip>
          </div>
        </div>
        
        <div class="po-scanner">
          <ion-item>
            <ion-label position="fixed">{{$t("Scan items")}}</ion-label>
            <ion-input :placeholder="$t('Scan barcodes to receive them')" v-model="queryString" @keyup.enter="updateProductCount()" />
          </ion-item>
          <ion-button expand="block" fill="outline" @click="scan">
            <ion-icon slot="start" :icon="cameraOutline" />
            {{ $t("Scan") }}
          </ion-button>
        </div>
        
        <ion-card v-for="(item, index) in order.items" :key="index">
          <div class="product">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).images?.mainImageUrl, getProduct(item.productId).productName)">
                  <Image :src="getProduct(item.productId).images?.mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  {{ getProduct(item.productId).productName }}
                  <p>{{ item.productId }}</p>
                </ion-label>
              </ion-item>
            </div>

            <div class="po-item-history">
              <ion-chip outline>
                <ion-icon :icon="checkmarkDone"/>
                <ion-label> {{ getPOItemAccepted(item.productId) }} {{ $t("received") }} </ion-label>
              </ion-chip>
            </div>

            <div class="product-count">
              <ion-item>
                <ion-label position="floating">{{ $t("Qty") }}</ion-label>       
                <ion-input type="number" value="0" min="0" v-model="item.quantityAccepted" />
              </ion-item>
            </div>
          </div>

          <ion-item lines="none" class="border-top" v-if="item.quantity > 0">
            <ion-button @click="receiveAll(item)" slot="start" fill="outline">
              {{ $t("Receive All") }}
            </ion-button>
            <ion-progress-bar :value="item.quantityAccepted/item.quantity" />
            <p slot="end">{{ item.quantity }} {{ $t("ordered") }}</p>
          </ion-item>
        </ion-card>
      </main>  
      
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
import { useRouter } from 'vue-router';
import Scanner from "@/components/Scanner.vue"
import AddProductToPOModal from '@/views/AddProductToPOModal.vue'
import ImageModal from '@/components/ImageModal.vue';

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
  data() {
    return {
      queryString: ''
    }
  },
  computed: {
    ...mapGetters({
      order: 'order/getCurrent',
      getProduct: 'product/getProduct',
      getPOItemAccepted: 'order/getPOItemAccepted'
    })
  },
  methods: {
    async openImage(imageUrl: string, productName: string) {
      const imageModal = await modalController.create({
        component: ImageModal,
        componentProps: { imageUrl , productName }
      });
      return imageModal.present();
    },
    async scan() {
      const modal = await modalController
      .create({
        component: Scanner,
      });
      modal.onDidDismiss()
      .then((result) => {
        this.updateProductCount(result.role);
      })
      return modal.present();
    },
    async updateProductCount(payload: any) {
      if(this.queryString) payload = this.queryString
      this.store.dispatch('order/updateProductCount', payload)
    },
    async addProduct() {
      const modal = await modalController
        .create({
          component: AddProductToPOModal
        })
      modal.onDidDismiss()
      .then(() => {
        this.store.dispatch('product/clearSearchedProducts');
      })  
      return modal.present();
    },
    async receivingHistory() {
      const modal = await modalController
        .create({
          component: ReceivingHistoryModal,
          componentProps: {order: this.order}
        })
      return modal.present();
    },
    async savePODetails() {
      const alert = await alertController.create({
        header: this.$t('Receive inventory'),
        message: this.$t('Inventory can be received for purchase orders in multiple shipments. Proceeding will receive a new shipment for this purchase order but it will still be available for receiving later', { space: '<br /><br />' }),
        buttons: [{
          text: this.$t('Cancel'),
          role: 'cancel'
        },
        {
          text: this.$t('Proceed'),
          role: 'proceed',
          handler: () => {
            this.createShipment();
          }
        }]
      });
      return alert.present();
    },
    async createShipment() {
      this.store.dispatch('order/createPurchaseShipment', { order: this.order }).then(() => {
        this.router.push('/purchase-orders')
      })
    },
    receiveAll(item: any) {
      this.order.items.filter((ele: any) => {
        if(ele.productId == item.productId) {
          ele.quantityAccepted = ele.quantity;
          ele.progress = ele.quantityAccepted / ele.quantity;
        }
      })
    }
  },
  mounted() {
    this.store.dispatch("order/getOrderDetail", { orderId: this.$route.params.slug }).then(() => {
      this.store.dispatch('order/getPOHistory', { orderId: this.order.orderId })
    })
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      addOutline,
      cameraOutline,
      checkmarkDone,
      router,
      saveOutline,
      store,
      timeOutline
    };
  },
});
</script>

<style scoped>
.po-meta {
  padding: 0 10px;
}

.po-scanner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(343px, 1fr));
  gap: 8px;
  margin-bottom: 20px;
}

ion-thumbnail {
  cursor: pointer;
}

.product {
  display: grid;
  grid: "info    count" 
        "history history" 
        / 1fr .35fr;
  align-items: center;
  padding: 16px;
  padding-left: 0;
}

.product-info {
  grid-area: info;
}

.po-item-history {
  grid-area: history;
  justify-self: center;
}

.product-count {
  grid-area: count;
  min-width: 9ch;
}

.product-count > ion-item {
  max-width: 20ch;
  margin-left: auto;
}

@media (min-width: 720px) {
  .po-id {
    display: flex;
    justify-content: space-between;
    align-items: center;
   }

  .product {
    grid: "info history count" /  1fr max-content 1fr;
  }
}
</style>
