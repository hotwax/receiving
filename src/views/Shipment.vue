<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start"></ion-back-button>
        <ion-title>{{ $t("Shipment Details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="addProduct"><ion-icon :icon="add"/></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div>
        <ion-item lines="none">
          <h1>{{ $t("Shipment ID") }} : {{ items.shipmentId }}</h1>
        </ion-item>
        <ion-item>
          <ion-label>
            <ion-input :placeholder="$t('Scan barcodes to receive')"></ion-input>
          </ion-label>
        </ion-item>
        <ion-card v-for="item in items.items" :key="item.id">
          <div class="product-info">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image :src="item.imageUrl" />
              </ion-thumbnail>
              <ion-label>
                <h2>{{ item.productName }}</h2>
                <p>{{ item.productId }}</p>
              </ion-label>
            </ion-item>
            <ion-item class="product-count">
              <ion-input type="number" min="0" v-model="item.quantityAccepted"></ion-input>
            </ion-item>
          </div>
          <ion-item class="border-top" v-if="item.quantityOrdered > 0">
            <ion-button @click="receiveAll(item)" color="dark" slot="start" fill="outline">
              {{ $t("ReceiveAll") }}
            </ion-button>
            <ion-progress-bar :value="item.quantityAccepted/item.quantityOrdered" color="dark"></ion-progress-bar>
            <p slot="end">{{ item.quantityOrdered }}</p>
          </ion-item>
        </ion-card>
      </div>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="completeShipment" color="dark">
          <ion-icon :icon="checkmarkDone" />
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
import { add, checkmarkDone } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import AddProductModal from '@/views/AddProductModal.vue'
import Image from "@/components/Image.vue";
import { useRouter } from 'vue-router';
import { showToast } from '@/utils'
import { translate } from '@/i18n'

export default defineComponent({
  name: "Shipment details",
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
    Image
  },
  props: ["product"],
  computed: {
    progress() {
      return 0;
    },
    ...mapGetters({
      items: 'shipment/getCurrent',
      user: 'user/getCurrentFacility',
      product: 'product/fetchProducts'
    }),
  },
  methods: {
    async addProduct() {
      const modal = await modalController
        .create({
          component: AddProductModal
        })
      return modal.present();
    },
    async fetchProducts(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        viewSize,
        viewIndex,
      }
        await this.store.dispatch("product/fetchProducts", payload);
    },
    async completeShipment() {
      const alert = await alertController.create({
        header: "Complete Shipment",
        message:
          (translate("Make sure you have entered the correct quantities for each item before proceeding.")),
        buttons: [
          {
            text: this.$t("Cancel"),
            role: 'cancel',
          }, 
          {
            text:this.$t('Complete'),
            handler: () => {
              this.updateShipments();
            },
          }
        ],
      });
      return alert.present();
    },
    async updateShipments() {
      this.items.items.filter((item: any) => {
        if(item.quantityAccepted > 0) {
          const payload = {
            shipmentId: this.items.shipmentId,
            facilityId: this.user.facilityId,
            shipmentItemSeqId: item.itemSeqId,
            productId: item.productId,
            quantityAccepted: item.quantityAccepted,
            locationSeqId: this.items.locationSeqId
          }
          this.store.dispatch('shipment/updateShipmentProducts', payload).then(() => {
            this.router.push('/receiving');
            })
        } else {
          showToast(translate("ZeroQuantity"))
        }
      })
    },
    receiveAll(item: any) {
      this.items.items.filter((ele: any) => {
        if(ele.itemSeqId == item.itemSeqId) {
          ele.quantityAccepted = ele.quantityOrdered;
          ele.progress = ele.quantityAccepted / ele.quantityOrdered
        }
      })
    },
  }, 
  setup() {
    const store = useStore(); 
    const router = useRouter();

    return {
      add,
      checkmarkDone,
      store,
      router
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
