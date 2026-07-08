<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button data-testid="shipments-page-menu-btn" slot="start" />
        <ion-title>{{ translate("Shipments") }}</ion-title>
      </ion-toolbar>

      <div>
        <ion-searchbar data-testid="shipments-page-search-input" :placeholder="translate('Search')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getShipments();" />

        <ion-segment data-testid="shipments-page-segment" v-model="selectedSegment" @ionChange="segmentChanged()">
          <ion-segment-button data-testid="shipments-page-open-tab" value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="shipments-page-completed-tab" value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>
    <ion-content>
      <main>
        <ShipmentListItem v-for="shipment in shipments" :key="shipment.shipmentId" :shipment="shipment"/>

        <div data-testid="shipments-page-load-more-section" v-if="shipments.length < shipmentsTotal" class="load-more-action ion-text-center">
          <ion-button data-testid="shipments-page-load-more-btn" fill="outline" color="dark" @click="loadMoreShipments()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ translate("Load more shipments") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div data-testid="shipments-page-empty-state" class="empty-state" v-if="!shipments.length && !fetchingShipments">
          <p v-if="showErrorMessage">{{ translate("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ translate("There are no incoming shipments")}}</p>
          <ion-button data-testid="shipments-page-refresh-btn" fill="outline" color="dark" @click="refreshShipments()">
            <ion-icon :icon="reload" slot="start" />
            {{ translate("Refresh") }}
          </ion-button>
        </div>

        <ion-refresher data-testid="shipments-page-refresher" slot="fixed" @ionRefresh="refreshShipments($event)">
          <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
        </ion-refresher>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonLabel, IonMenuButton, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { cloudDownloadOutline, reload } from 'ionicons/icons'
import { computed, ref } from 'vue'
import ShipmentListItem from '@/components/ShipmentListItem.vue'
import { translate } from "@common"
import { useProductStore } from '@/store/productStore';
import router from '@/router';
import { useShipmentStore } from '@/store/shipment';

const productStore = useProductStore();
const shipmentStore = useShipmentStore();

const queryString = ref('');
const fetchingShipments = ref(false);
const showErrorMessage = ref(false);
const selectedSegment = ref("open");

const shipments = computed(() => shipmentStore.getShipments);
const shipmentsTotal = computed(() => shipmentStore.getTotalShipments);
const currentFacility = computed(() => productStore.getCurrentFacility);

const getShipments = async (vSize?: any, vIndex?: any) => {
  queryString.value ? (showErrorMessage.value = true) : (showErrorMessage.value = false);
  fetchingShipments.value = true;
  const viewSize = vSize ? vSize : import.meta.env.VITE_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  const payload = {
    "inputFields": {
      "destinationFacilityId": (currentFacility.value as any).facilityId,
      "statusId": selectedSegment.value === "open" ? "PURCH_SHIP_SHIPPED" : "PURCH_SHIP_RECEIVED",
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
    "fieldList": ["shipmentId", "primaryShipGroupSeqId", "partyIdFrom", "partyIdTo", "estimatedArrivalDate", "destinationFacilityId", "statusId", "shipmentItemCount", "externalId", "externalOrderId", "shipmentTypeId"],
    "noConditionFind": "Y",
    "viewSize": viewSize,
    "viewIndex": viewIndex,
  } as any
  if (queryString.value) {
    payload.inputFields["shipmentId_value"] = queryString.value
    payload.inputFields["shipmentId_op"] = 'contains'
    payload.inputFields["shipmentId_ic"] = 'Y'
    payload.inputFields["shipmentId_grp"] = '2'
    payload.inputFields["externalOrderId_value"] = queryString.value
    payload.inputFields["externalOrderId_op"] = 'contains'
    payload.inputFields["externalOrderId_ic"] = 'Y'
    payload.inputFields["externalOrderId_grp"] = '2'
    payload.inputFields["externalOrderName_value"] = queryString.value
    payload.inputFields["externalOrderName_op"] = 'contains'
    payload.inputFields["externalOrderName_ic"] = 'Y'
    payload.inputFields["externalOrderName_grp"] = '2'
    payload.inputFields["grp_op_2"] = 'OR'
  }
  await shipmentStore.findShipment(payload);
  fetchingShipments.value = false;
};

const loadMoreShipments = () => {
  getShipments(import.meta.env.VITE_VIEW_SIZE, Math.ceil(shipments.value.length / (import.meta.env.VITE_VIEW_SIZE as any)));
};

const refreshShipments = async (event?: any) => {
  getShipments().then(() => {
    if (event) event.target.complete();
  })
};

const segmentChanged = () => {
  getShipments()
};

onIonViewWillEnter(() => {
  const forwardRoute = (router as any).options.history.state.forward as any;
  if (!forwardRoute?.startsWith('/shipment/')) selectedSegment.value = "open";
  getShipments();
});
</script>

<style scoped>
@media (min-width: 991px) {
  ion-header > div {
    display: flex;
  }
}
</style>
