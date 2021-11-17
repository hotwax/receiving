<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Receiving") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <div>
        <ion-searchbar :placeholder="$t('Scan ASN to start receiving')"></ion-searchbar>
        
        <ReceivingListItem v-for="product in products" :key="product.Id" :product="product" />

        <div class="ion-text-center">
          <ion-button fill="outline" color="dark"><ion-icon :icon="cloudDownloadOutline" slot="start" />{{ $t("Load more shipments") }}</ion-button>
        </div>
      </div> 
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex'
import { cloudDownloadOutline } from 'ionicons/icons'
import ReceivingListItem from '@/components/ReceivingListItem.vue'
import { translate } from '@/i18n';
import { showToast } from '@/utils';

export default defineComponent({
  name: 'Receiving',
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonSearchbar,
    IonPage,
    IonTitle,
    IonToolbar,
    ReceivingListItem
  },
  data (){
    return {
      queryString: ''
    }
  },
  mounted() {
    this.getProducts;
  },
  computed: {
    ...mapGetters({
      products: 'product/getSearchProducts',
    })
  },
  methods: {
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async getProducts(vSize: any, vIndex: any) {
      const viewSize = vSize;
      const viewIndex = vIndex;
      const payload = {
        viewSize,
        viewIndex,
      }
      if (this.queryString) {
        await this.store.dispatch("product/findProduct", payload);
      } else {
        showToast(translate("Enter shipment id to search"))
      }
    },
    
  },
  setup(){
    const store = useStore();
    return {
      cloudDownloadOutline,
      store
    }
  }
});
</script>

<style scoped>
ion-content div {
  max-width: 1110px;
  margin-right: auto;
  margin-left: auto;
}
</style>