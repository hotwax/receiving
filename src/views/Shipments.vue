<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Shipments") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <ion-searchbar :placeholder="$t('Scan ASN to start receiving')"/>

        <ShipmentListItem v-for="shipment in shipments" :key="shipment.shipmentId" :shipment="shipment"/>

        <div class="load-more-action ion-text-center">
          <ion-button fill="outline" color="dark" @click="loadMoreShipments()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ $t("Load more shipments") }}
          </ion-button>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonMenuButton, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { cloudDownloadOutline } from 'ionicons/icons'
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import ShipmentListItem from '@/components/ShipmentListItem.vue'

export default defineComponent({
  name: "Shipments",
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonSearchbar,
    IonPage,
    IonTitle,
    IonToolbar,
    ShipmentListItem
  },
  computed: {
    ...mapGetters({
      shipments: 'shipment/getShipments',
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
        "inputFields": {
          "destinationFacilityId": this.user.facilityId,
          statusId: "PURCH_SHIP_SHIPPED",
          "shipmentTypeId_fld0_value": "INCOMING_SHIPMENT",
          "shipmentTypeId_fld0_op": "equals",
          "shipmentTypeId_fld0_grp": "1",
          "parentTypeId_fld0_value": "INCOMING_SHIPMENT",
          "parentTypeId_fld0_op": "equals",
          "parentTypeId_fld0_grp": "2",
        },
        "entityName": "ShipmentAndType",
        "fieldList" : [ "shipmentId","primaryShipGroupSeqId","partyIdFrom","partyIdTo","estimatedArrivalDate","destinationFacilityId","statusId"],
        "noConditionFind": "Y",
        "viewSize": viewSize,
        "viewIndex": viewIndex,
      }
      await this.store.dispatch("shipment/findShipment", payload);
    },
    loadMoreShipments() {
      this.getShipments(process.env.VUE_APP_VIEW_SIZE, Math.ceil(this.shipments.length / process.env.VUE_APP_VIEW_SIZE));
    }
  },
  setup() {
    const store = useStore();
    return {
      cloudDownloadOutline,
      store
    }
  }
})
</script>