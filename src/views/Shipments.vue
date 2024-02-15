<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Shipments") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <ion-searchbar :placeholder="translate('Scan ASN to start receiving')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getShipments();" />

        <ShipmentListItem v-for="shipment in shipments" :key="shipment.shipmentId" :shipment="shipment"/>

        <div v-if="shipments.length" class="load-more-action ion-text-center">
          <ion-button fill="outline" color="dark" @click="loadMoreShipments()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ translate("Load more shipments") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div class="empty-state" v-if="!shipments.length && !fetchingShipments">
          <p v-if="showErrorMessage">{{ translate("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ translate("There are no incoming shipments")}}</p>
          <ion-button fill="outline" color="dark" @click="refreshShipments()">
            <ion-icon :icon="reload" slot="start" />
            {{ translate("Refresh") }}
          </ion-button>
        </div>

        <ion-refresher slot="fixed" @ionRefresh="refreshShipments($event)">
          <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
        </ion-refresher>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { cloudDownloadOutline, reload } from 'ionicons/icons'
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import ShipmentListItem from '@/components/ShipmentListItem.vue'
import { translate } from "@hotwax/dxp-components"

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
    IonRefresher,
    IonRefresherContent,
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
  data() {
    return {
      queryString: '',
      fetchingShipments: false,
      showErrorMessage: false 
    }
  },
  ionViewWillEnter () {
    this.getShipments();
  },
  methods: {
    async getShipments(vSize?: any, vIndex?: any) {
      this.queryString ? this.showErrorMessage = true : this.showErrorMessage = false;
      this.fetchingShipments = true;
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        "inputFields": {
          "destinationFacilityId": this.user.facilityId,
          "statusId": "PURCH_SHIP_SHIPPED",
          "grp_op": "AND",
          "shipmentTypeId_value": "INCOMING_SHIPMENT",
          "shipmentTypeId_op": "equals",
          "shipmentTypeId_grp": "1",
          "parentTypeId_value": "INCOMING_SHIPMENT",
          "parentTypeId_op": "equals",
          "parentTypeId_grp": "1",
          "grp_op_1": "OR"
        },
        "entityName": "ShipmentAndTypeAndItemCount",
        "fieldList" : [ "shipmentId","primaryShipGroupSeqId","partyIdFrom","partyIdTo","estimatedArrivalDate","destinationFacilityId","statusId", "shipmentItemCount", "externalId", "externalOrderId", "shipmentTypeId" ],
        "noConditionFind": "Y",
        "viewSize": viewSize,
        "viewIndex": viewIndex,
      } as any
      if(this.queryString){
          payload.inputFields["shipmentId_value"] = this.queryString
          payload.inputFields["shipmentId_op"] = 'contains'
          payload.inputFields["shipmentId_ic"] = 'Y'
          payload.inputFields["shipmentId_grp"] = '2'
          payload.inputFields["externalOrderId_value"] = this.queryString
          payload.inputFields["externalOrderId_op"] = 'contains'
          payload.inputFields["externalOrderId_ic"] = 'Y'
          payload.inputFields["externalOrderId_grp"] = '2'
          payload.inputFields["grp_op_2"] = 'OR'
      }
      await this.store.dispatch("shipment/findShipment", payload);
      this.fetchingShipments = false;
      return Promise.resolve();
    },
    loadMoreShipments() {
      this.getShipments(process.env.VUE_APP_VIEW_SIZE, Math.ceil(this.shipments.length / process.env.VUE_APP_VIEW_SIZE));
    },
    async refreshShipments(event?: any) {
      this.getShipments().then(() => {
        if (event) event.target.complete();
      })
    },
  },
  setup() {
    const store = useStore();
    return {
      cloudDownloadOutline,
      reload,
      store,
      translate
    }
  }
})
</script>