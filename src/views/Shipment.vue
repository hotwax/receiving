<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start"></ion-back-button>
        <ion-title>Shipment Details</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="addProduct"><ion-icon :icon="add"/></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div>
        <ion-item lines="none">
          <h1>Shipment ID: {{ items.shipmentId }}</h1>
        </ion-item>
        <ion-item>
          <ion-label>
            <ion-input placeholder="Scan barcodes to receive"></ion-input>
          </ion-label>
        </ion-item>
        <ion-card v-for="item in items.items" :key="item.id">
          <ion-card-content>
            <ion-row>
              <ion-col size="9">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <Image :src="item.imageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>{{ item.sku }}</h2>
                    <p>{{ item.productId }}</p>
                  </ion-label>
                </ion-item>
              </ion-col>
              <ion-col size="3" class="ion-align-self-center">
                <ion-item>
                  <ion-input type="number" v-model="item.quantityAccepted"></ion-input>
                </ion-item>
              </ion-col>
            </ion-row>
          </ion-card-content>
          <ion-item class="border-top">
            <ion-button color="dark" slot="start" fill="outline">
              {{ $t("ReceiveAll") }}
            </ion-button>
            <ion-progress-bar value="1" color="dark"></ion-progress-bar>
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
  IonCardContent,
  IonCol,
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
  IonRow,
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
    IonCardContent,
    IonCol,
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
    IonRow,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    Image
  },
  props: ["product"],
  computed: {
    ...mapGetters({
      items: 'product/getCurrent',
      user: 'user/getCurrentFacility'

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
    async completeShipment() {
      const alert = await alertController.create({
        header: "Complete Shipment",
        message:
          "Make sure you have entered the correct quantities for each item before proceeding.",
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
            },],
      });
      return alert.present();
    },
    async updateShipments() {
      this.items.items.filter((item: any) => {
        if(item.quantityAccepted > 0) {
          const payload = {
            shipmentId: this.items.shipmentId,
            facilityId: this.user.facilityId,
            shipmentItemSeqId: this.items.shipmentItemSeqId,
            productId: item.productId,
            quantityAccepted: item.quantityAccepted,
            locationSeqId: this.items.locationSeqId
          }
          this.store.dispatch('product/updateShipmentProducts', payload).then(() => {
            this.router.push('/receiving');
            })
        } else {
          showToast(translate("ZeroQuantity"))
        }
      }
      )
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
</style>
