<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Shipments") }}</ion-title>
      </ion-toolbar>

      <div>
        <ion-searchbar :placeholder="translate('Search')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getShipments();" />

        <ion-segment v-model="selectedSegment" @ionChange="segmentChanged()">
          <ion-segment-button value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>
    <ion-content>
      <main>
        <ShipmentListItem v-for="shipment in shipments" :key="shipment.shipmentId" :shipment="shipment"/>

        <div v-if="shipments.length < shipmentsTotal" class="load-more-action ion-text-center">
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
  IonLabel,
  IonMenuButton,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { cloudDownloadOutline, reload } from 'ionicons/icons'
import { defineComponent, computed } from 'vue'
import { mapGetters, useStore } from 'vuex'
import ShipmentListItem from '@/components/ShipmentListItem.vue'
import { translate, useUserStore } from "@hotwax/dxp-components"
import { useRouter } from 'vue-router';

export default defineComponent({
  name: "Shipments",
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonLabel,
    IonMenuButton,
    IonSearchbar,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    ShipmentListItem
  },
  computed: {
    ...mapGetters({
      shipments: 'shipment/getShipments',
      shipmentsTotal: 'shipment/getTotalShipments',
    })
  },
  data() {
    return {
      queryString: '',
      fetchingShipments: false,
      showErrorMessage: false,
      selectedSegment: "open"
    }
  },
  ionViewWillEnter () {
    // Using forward instead of back property because when navigating back from a details page, the details page route is stored in forward property in router.
    const forwardRoute = this.router.options.history.state.forward as any;
    if(!forwardRoute?.startsWith('/shipment/')) this.selectedSegment = "open";
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
          "destinationFacilityId": this.currentFacility.facilityId,
          "statusId": this.selectedSegment === "open" ? "PURCH_SHIP_SHIPPED" : "PURCH_SHIP_RECEIVED",
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
          payload.inputFields["externalOrderName_value"] = this.queryString
          payload.inputFields["externalOrderName_op"] = 'contains'
          payload.inputFields["externalOrderName_ic"] = 'Y'
          payload.inputFields["externalOrderName_grp"] = '2'
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
    segmentChanged() {
      this.getShipments()
    }
  },
  setup() {
    const router = useRouter()
    const store = useStore();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      cloudDownloadOutline,
      currentFacility,
      reload,
      router,
      store,
      translate
    }
  }
})
</script>

<style scoped>
@media (min-width: 991px) {
  ion-header > div {
    display: flex;
  }
}
</style>