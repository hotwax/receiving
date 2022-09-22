<template>
    <ion-page>
      <ion-header :translucent="true">
        <ion-toolbar>
          <ion-back-button default-href="/" slot="start"></ion-back-button>
          <ion-title>{{ $t("Return Details") }}</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content>
        <main>
          <ion-item lines="none">
            <h1>{{ $t("Shipment ID") }}: {{ current.shipmentId }}</h1>
          </ion-item>
  
          <div class="shipment-scanner">
            <ion-item>
              <ion-label>{{ $t("Scan items") }}</ion-label>
              <ion-input :placeholder="$t('Scan barcodes to receive them')" v-model="queryString" @keyup.enter="updateProductCount()" />
            </ion-item>
  
            <ion-button expand="block" fill="outline" @click="scanCode()">
              <ion-icon slot="start" :icon="barcodeOutline" />{{ $t("Scan") }}
            </ion-button>
          </div>
  
          <ion-card v-for="item in current.items" :key="item.id">
            <div class="product-info">
              <ion-item lines="none">
                <ion-thumbnail slot="start" @click="openImage(getProduct(item.productId).mainImageUrl, getProduct(item.productId).productName)">
                  <Image :src="getProduct(item.productId).mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ getProduct(item.productId).productName }}</h2> 
                  <p>{{ getProduct(item.productId).productId }}</p>
                </ion-label>
              </ion-item>
              <ion-item class="product-count">
                <ion-label position="floating">{{ $t("Qty") }}</ion-label>
                <ion-input type="number" min="0" v-model="item.quantityAccepted" />
              </ion-item>
            </div>
  
            <ion-item class="border-top" v-if="item.quantityOrdered > 0">
              <ion-button @click="receiveAll(item)" slot="start" fill="outline">
                {{ $t("Receive All") }}
              </ion-button>
              <ion-progress-bar :value="item.quantityAccepted/item.quantityOrdered" />
              <p slot="end">{{ item.quantityOrdered }}</p>
            </ion-item>
          </ion-card>
        </main>
  
        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button v-if="validStatusChange(current.statusId)" @click="completeShipment">
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
  import { checkmarkDone, barcodeOutline } from 'ionicons/icons';
  import { mapGetters, useStore } from "vuex";
  import AddProductModal from '@/views/AddProductModal.vue'
  import Image from "@/components/Image.vue";
  import { useRouter } from 'vue-router';
  import Scanner from "@/components/Scanner.vue";
  import ImageModal from '@/components/ImageModal.vue';
  
  export default defineComponent({
    name: "ReturnDetails",
    components: {
      IonBackButton,
      IonButton,
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
    props: ["shipment"],
    data() {
      return {
        queryString: ''
      }
    },
    mounted() {
      this.store.dispatch('return/setCurrent', { shipmentId: this.$route.params.id })
    },
    computed: {
      ...mapGetters({
        current: 'return/getCurrent',
        getProduct: 'product/getProduct',
        validStatusChange: 'return/isReturnReceivable'
      }),
    },
    methods: {
      async openImage(imageUrl: string, productName: string) {
        const imageModal = await modalController.create({
          component: ImageModal,
          componentProps: { imageUrl , productName }
        });
        return imageModal.present();
      },
      async addProduct() {
        const modal = await modalController
          .create({
            component: AddProductModal
          })
          modal.onDidDismiss()
          .then( () => {
            this.store.dispatch('product/clearSearchedProducts')
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
          header: this.$t("Receive Shipment"),
          message: this.$t("Make sure you have entered all the inventory you received. You cannot edit this information after proceeding.", {space: '<br /><br />'}),
          buttons: [
            {
              text: this.$t("Cancel"),
              role: 'cancel',
            }, 
            {
              text:this.$t('Proceed'),
              handler: () => {
                this.receiveReturn();
              },
            }
          ],
        });
        return alert.present();
      },
      async receiveReturn() {
        await this.store.dispatch('return/receiveReturn', {payload: this.current}).then(() => {
          this.router.push('/returns');
        })   
      },
      receiveAll(item: any) {
        this.current.items.filter((ele: any) => {
          if(ele.itemSeqId == item.itemSeqId) {
            ele.quantityAccepted = ele.quantityOrdered;
            ele.progress = ele.quantityAccepted / ele.quantityOrdered
          }
        })
      },
      updateProductCount(payload: any){
        if(this.queryString) payload = this.queryString
        this.store.dispatch('return/updateReturnProductCount', payload)
      },
      async scanCode () {
        const modal = await modalController
          .create({
            component: Scanner,
          });
          modal.onDidDismiss()
          .then((result) => {
            this.updateProductCount(result.role);
        });
        return modal.present();
      },
    }, 
    setup() {
      const store = useStore(); 
      const router = useRouter();
  
      return {
        barcodeOutline,
        checkmarkDone,
        store,
        router
      };
    },
  });
  </script>
  
  <style scoped>
  .shipment-scanner {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(343px, 1fr));
    gap: 8px;
    margin-bottom: 20px;
  }
  
  ion-thumbnail {
    cursor: pointer;
  }
  
  .border-top {
    border-top: 1px solid #ccc;
  }
  
  .product-info {
    display: grid;
    grid-template-columns: 1fr .25fr;
    align-items: center;
    padding: 16px;
    padding-left: 0;
  }
  
  .product-count {
    min-width: 9ch;
  }
  </style>
  