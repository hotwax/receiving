<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Returns") }}</ion-title>
      </ion-toolbar>

      <div>
        <ion-searchbar :placeholder="translate('Search returns')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getReturns()" />

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
        <ReturnListItem v-for="returnShipment in returns" :key="returnShipment.shipmentId" :returnShipment="returnShipment" />

        <div v-if="returns.length" class="load-more-action ion-text-center">
          <ion-button fill="outline" color="dark" @click="loadMoreReturns()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ translate("Load more returns") }}
          </ion-button>
        </div>

        <!-- Empty state -->
        <div class="empty-state" v-if="!returns.length && !fetchingReturns">
          <p v-if="showErrorMessage">{{ translate("No results found")}}</p>
          <img src="../assets/images/empty-state.png" alt="empty state">
          <p>{{ translate("There are no returns to receive")}}</p>
          <ion-button fill="outline" color="dark" @click="refreshReturns()">
            <ion-icon :icon="reload" slot="start" />
            {{ translate("Refresh") }}
          </ion-button>
        </div>

        <ion-refresher slot="fixed" @ionRefresh="refreshReturns($event)">
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
import ReturnListItem from '@/components/ReturnListItem.vue'
import { translate, useUserStore } from "@hotwax/dxp-components"

export default defineComponent({
  name: "Returns",
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
    ReturnListItem
  },
  computed: {
    ...mapGetters({
      returns: 'return/getReturns',
    })
  },
  data () {
    return {
      queryString: '',
      fetchingReturns: false,
      showErrorMessage: false,
      selectedSegment: "open"
    }
  },
  mounted () {
    this.store.dispatch('return/fetchValidReturnStatuses');
  },
  ionViewDidEnter(){
    this.getReturns();
  },
  methods: {
    async getReturns(vSize?: any, vIndex?: any) {
      this.queryString ? this.showErrorMessage = true : this.showErrorMessage = false;
      this.fetchingReturns = true;
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        "entityName": "SalesReturnShipmentView",
        "inputFields": {
          "destinationFacilityId": this.currentFacility?.facilityId,
          "statusId": "PURCH_SHIP_RECEIVED",
          "statusId_op": this.selectedSegment === "open" ? "notEqual" : "equals"
        },
        "fieldList" : [ "shipmentId","externalId","statusId","shopifyOrderName","hcOrderId","trackingCode", "destinationFacilityId" ],
        "noConditionFind": "Y",
        "viewSize": viewSize,
        "viewIndex": viewIndex,
        "orderBy": "createdDate ASC"
      } as any
      
      if(this.queryString){
        // Search query done on shipmentId, trackingCode and externalId
        payload.inputFields["shipmentId"] = this.queryString;
        payload.inputFields["shipmentId_op"] = "contains";
        payload.inputFields["shipmentId_ic"] = "Y";
        payload.inputFields["shipmentId_grp"] = "1";
        payload.inputFields["trackingCode"] = this.queryString;
        payload.inputFields["trackingCode_op"] = "contains";
        payload.inputFields["trackingCode_ic"] = "Y";
        payload.inputFields["trackingCode_grp"] = "2";
        payload.inputFields["externalId"] = this.queryString;
        payload.inputFields["externalId_op"] = "contains";
        payload.inputFields["externalId_ic"] = "Y";
        payload.inputFields["externalId_grp"] = "3";
        payload.inputFields["hcOrderId"] = this.queryString;
        payload.inputFields["hcOrderId_op"] = "contains";
        payload.inputFields["hcOrderId_ic"] = "Y";
        payload.inputFields["hcOrderId_grp"] = "4";
        payload.inputFields["shopifyOrderName"] = this.queryString;
        payload.inputFields["shopifyOrderName_op"] = "contains";
        payload.inputFields["shopifyOrderName_ic"] = "Y";
        payload.inputFields["shopifyOrderName_grp"] = "5";
      }
      await this.store.dispatch("return/findReturn", payload);
      this.fetchingReturns = false;
      return Promise.resolve();
    },
    loadMoreReturns() {
      this.getReturns(process.env.VUE_APP_VIEW_SIZE, Math.ceil(this.returns.length / process.env.VUE_APP_VIEW_SIZE));
    },
    async refreshReturns(event?: any) {
      this.getReturns().then(() => {
        if (event) event.target.complete();
      })
    },
    segmentChanged() {
      this.getReturns();
    }
  },
  setup() {
    const store = useStore();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      cloudDownloadOutline,
      currentFacility,
      reload,
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