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
        <ion-searchbar :placeholder="$t('Scan ASN to start receiving')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getShipments();" />

        <ShipmentListItem v-for="shipment in shipments" :key="shipment.shipmentId" :shipment="shipment"/>

        <div v-if="shipments.length" class="load-more-action ion-text-center">
          <ion-button fill="outline" color="dark" @click="loadMoreShipments()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ $t("Load more shipments") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div class="empty-state" v-if="!shipments.length && !fetchingShipments">
          <p v-if="showErrorMessage">{{ $t("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ $t("There are no incoming shipments")}}</p>
          <ion-button fill="outline" color="dark" @click="refreshShipments()">
            <ion-icon :icon="reload" slot="start" />
            {{ $t("Refresh") }}
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
import { showToast } from '@/utils';
import { translate } from '@/i18n';

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
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async getShipments(vSize?: any, vIndex?: any) {
      this.queryString ? this.showErrorMessage = true : this.showErrorMessage = false;
      this.fetchingShipments = true;
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        "inputFields": {
          "destinationFacilityId": this.user.facilityId,
          "statusId": "PURCH_SHIP_SHIPPED",
          "shipmentTypeId_fld0_value": "INCOMING_SHIPMENT",
          "shipmentTypeId_fld0_op": "equals",
          "shipmentTypeId_fld0_grp": "1",
          "parentTypeId_fld0_value": "INCOMING_SHIPMENT",
          "parentTypeId_fld0_op": "equals",
          "parentTypeId_fld0_grp": "2",
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
          payload.inputFields["shipmentId_grp"] = '1'
          payload.inputFields["externalOrderId_value"] = this.queryString
          payload.inputFields["externalOrderId_op"] = 'contains'
          payload.inputFields["externalOrderId_ic"] = 'Y'
          payload.inputFields["externalOrderId_grp"] = '2'
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
      store
    }
  }
})
</script>