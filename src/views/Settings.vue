<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-list>
        <ion-item>
          <ion-icon :icon="globeOutline" slot="start" />
          <ion-label>{{ $t("eCom Store") }}</ion-label>
          <ion-select interface="popover" :value="currentEComStore.productStoreId" @ionChange="setEComStore($event)">
            <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId" :value="store.productStoreId" >{{ store.storeName }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-icon :icon="storefrontOutline" slot="start" />
          <ion-label>{{ $t("Store") }}</ion-label>
          <ion-select interface="popover" :placeholder="$t('store name')" :value="currentFacility.facilityId" @ionChange="setFacility($event)">
            <ion-select-option v-for="facility in (userProfile && userProfile.facilities ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.name }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-icon :icon="codeWorkingOutline" slot="start"/>
          <ion-label>{{ $t("OMS") }}</ion-label>
          <p slot="end">{{ instanceUrl }}</p>
        </ion-item>

        <ion-item>
          <ion-icon :icon="fileTrayOutline" slot="start" />
          <ion-label>{{ $t("Primary Product Identifier") }}</ion-label>
          <ion-select interface="popover" :placeholder="$t('primary identifier')" :value="productIdentificationPref.primaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'primaryId')">
            <ion-select-option v-for="identification in productIdentifications" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-icon :icon="fileTrayStackedOutline" slot="start" />
          <ion-label>{{ $t("Secondary Product Identifier") }}</ion-label>
          <ion-select interface="popover" :placeholder="$t('secondary identifier')" :value="productIdentificationPref.secondaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'secondaryId')">
            <ion-select-option v-for="identification in productIdentifications" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
            <ion-select-option value="">{{ $t("None") }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-icon :icon="personCircleOutline" slot="start" />
          <ion-label>{{ userProfile !== null ? userProfile.partyName : '' }}</ion-label>
          <ion-button slot="end" fill="outline" color="dark" @click="logout()">{{ $t("Logout") }}</ion-button>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { alertController, IonButton, IonContent, IonHeader,IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVertical, fileTrayOutline, fileTrayStackedOutline, globeOutline, personCircleOutline, storefrontOutline} from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Settings',
  components: {
    IonButton, 
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonLabel,
    IonList,
    IonMenuButton,
    IonPage, 
    IonSelect, 
    IonSelectOption,
    IonTitle, 
    IonToolbar
  },
  data() {
    return {
      baseURL: process.env.VUE_APP_BASE_URL
    };
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      currentEComStore: 'user/getCurrentEComStore',
      instanceUrl: 'user/getInstanceUrl',
      productIdentifications: 'util/getProductIdentifications',
      productIdentificationPref: 'user/getProductIdentificationPref'
    })
  },
  methods: {
    setEComStore(store: any) {
      if(this.userProfile) {
        this.store.dispatch('user/setEComStore', {
          'eComStore': this.userProfile.stores.find((str: any) => str.productStoreId == store['detail'].value)
        })
      }
    },
    setFacility (facility: any) {
      // Checking if current facility is not equal to the facility selected to avoid extra api call on logging in again after logout.
      if(this.currentFacility.facilityId != facility['detail'].value && this.userProfile?.facilities) {
        this.userProfile.facilities.map((fac: any) => {
          if (fac.facilityId == facility['detail'].value) {
            this.store.dispatch('shipment/clearShipments');
            this.store.dispatch('user/setFacility', {'facility': fac});
          }
        })
      }
    },
    async presentAlert () {
      const alert = await alertController.create({
        header: this.$t('Logout'),
        message: this.$t('The products in the upload list will be removed.'),
        buttons: [{
          text: this.$t('Cancel')
        },
        {
          text: this.$t('Ok'),
          handler: () => {
            this.store.dispatch('product/clearUploadProducts');
            this.store.dispatch('user/logout').then(() => {
            this.router.push('/login');
            })
          }
        }]
      });
      await alert.present();
    },
    logout () {
      this.store.dispatch('user/logout').then(() => {
        this.store.dispatch('shipment/clearShipments');
        this.store.dispatch('return/clearReturns');
        this.router.push('/login');
      })
    },
    setProductIdentificationPref(value: string, id: string) {
      if(this.productIdentificationPref[id] == value) {
        return;
      }
      this.store.dispatch('user/setProductIdentificationPref', { id, value })
    }
  },
  ionViewDidEnter() {
    this.store.dispatch('user/getProductIdentificationPref', this.currentEComStore.productStoreId);
  },
  setup(){
    const store = useStore();
    const router = useRouter();

    return {
      codeWorkingOutline,
      ellipsisVertical,
      fileTrayOutline,
      fileTrayStackedOutline,
      globeOutline,
      personCircleOutline,
      storefrontOutline,
      store,
      router
    }
  }
});
</script>
