<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Receiving") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div>
        <ion-searchbar :placeholder="$t('Scan ASN to start receiving')"/>

        <product-list-item v-for="product in products" :key="product.productId" :product="product"/>

        <div class="ion-text-center">
          <ion-button fill="outline" color="dark"><ion-icon :icon="cloudDownloadOutline" slot="start" @click="loadMoreShipments()" />{{ $t("Load more shipments") }}</ion-button>
        </div>
        </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { cloudDownloadOutline } from 'ionicons/icons'
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import ProductListItem from '@/components/ProductListItem.vue'

export default defineComponent({
  name: "Receiving",
  components: {
     IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonSearchbar,
    IonPage,
    IonTitle,
    IonToolbar,
    ProductListItem
  },
  computed: {
    ...mapGetters({
      products: 'shipment/getSearchProducts',
      user: 'user/getCurrentFacility'
    })
  },
  data(){
    return{
      viewSize:'',
      viewIndex:''
    }
  },
  mounted () {
    this.getProducts(null, null);
  },
  methods: {
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async getProducts(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        viewSize,
        viewIndex,
        facilityId: this.user.facilityId
      }
      await this.store.dispatch("shipment/findShipment", payload);
    },
  },
  setup() {
    const store = useStore();
    return {
      cloudDownloadOutline,
      store
    }
  },
})
</script>

<style scoped>
ion-content div {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}
</style>