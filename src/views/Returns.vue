<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Returns") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <ion-searchbar :placeholder="$t('Scan ASN to start receiving')" v-model="queryString" @keyup.enter="queryString = $event.target.value; getReturns()" />
  
        <ReturnListItem v-for="returnShipment in returns" :key="returnShipment.shipmentId" :returnShipment="returnShipment" />

        <div class="load-more-action ion-text-center">
          <ion-button fill="outline" color="dark" @click="loadMoreReturns()">
            <ion-icon :icon="cloudDownloadOutline" slot="start" />
            {{ $t("Load more returns") }}
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
  import ReturnListItem from '@/components/ReturnListItem.vue'
  
  export default defineComponent({
    name: "Returns",
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
      ReturnListItem
    },
    computed: {
      ...mapGetters({
        returns: 'return/getReturns',
      })
    },
    data () {
      return {
        queryString: ''
      }
    },
    mounted () {
      this.getReturns();
    },
    methods: {
      async getReturns(vSize?: any, vIndex?: any) {
        const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
        const viewIndex = vIndex ? vIndex : 0;
        const payload = {
          "inputFields": {
            "shipmentTypeId": "SALES_RETURN",
          },
          "entityName": "ShipmentAndTypeAndItemCount",
          "fieldList" : [ "shipmentId","primaryShipGroupSeqId","partyIdFrom","partyIdTo","estimatedArrivalDate","destinationFacilityId","statusId", "shipmentItemCount" ],
          "noConditionFind": "Y",
          "viewSize": viewSize,
          "viewIndex": viewIndex,
        } as any
        
        if(this.queryString){
          payload.inputFields["shipmentId"] = this.queryString;
          payload.inputFields["shipmentId_op"] = "contains";
          payload.inputFields["shipmentId_ic"] = "Y";
        }
        await this.store.dispatch("return/findReturn", payload);
      },
      loadMoreReturns() {
        this.getReturns(process.env.VUE_APP_VIEW_SIZE, Math.ceil(this.returns.length / process.env.VUE_APP_VIEW_SIZE));
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