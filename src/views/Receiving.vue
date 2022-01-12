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

        <ShipmentListItem v-for="shipment in shipments" :key="shipment.productId" :shipment="shipment"/>

        <div class="ion-text-center">
          <ion-button fill="outline" color="dark" @click="loadMoreShipments()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ $t("Load more shipments") }}
          </ion-button>
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
import ShipmentListItem from '@/components/ShipmentListItem.vue'

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
    ShipmentListItem
  },
  computed: {
    ...mapGetters({
      shipments: 'shipment/getSearchProducts',
      user: 'user/getCurrentFacility'
    })
  },
  mounted () {
    this.getShipments();
  },
  methods: {
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async getShipments(vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        viewSize,
        viewIndex,
        facilityId: this.user.facilityId
      }
      await this.store.dispatch("shipment/findShipment", payload);
    },
    loadMoreShipments(){
      this.getShipments(process.env.VUE_APP_VIEW_SIZE , Math.ceil(Object.getOwnPropertyNames(this.shipments).length / process.env.VUE_APP_VIEW_SIZE));
    }
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