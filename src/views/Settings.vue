<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile.userLoginId }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile.partyName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" v-if="!authStore.isEmbedded" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button :standalone-hidden="!hasPermission(Actions.APP_PWA_STANDALONE_ACCESS)" fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ translate("Reset password") }}</ion-button> -->
        </ion-card>
      </div>

      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>
      <section>
        <DxpOmsInstanceNavigator />
        <DxpFacilitySwitcher @updateFacility="updateFacility" />
      </section>
      <hr />

      <DxpAppVersionInfo />

      <section>
        <DxpProductIdentifier />
        <DxpTimeZoneSwitcher @timeZoneUpdated="timeZoneUpdated" />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Force scan") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content v-html="barcodeContentMessage"></ion-card-content>
          <ion-item :disabled="!hasPermission(Actions.APP_UPDT_FULFILL_FORCE_SCAN_CONFIG)">
            <ion-toggle label-placement="start" :checked="isForceScanEnabled" @click.prevent="updateForceScanStatus($event)">{{ translate("Require scanning") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-select :label="translate('Barcode Identifier')" interface="popover" :placeholder="translate('Select')" :value="barcodeIdentificationPref" @ionChange="setBarcodeIdentificationPref($event.detail.value)">
              <ion-select-option v-for="identification in barcodeIdentificationOptions" :key="identification" :value="identification.goodIdentificationTypeId" >{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Receive flow type") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("Define the receiving flow for TO items") }}
          </ion-card-content>
          <ion-item :disabled="!hasPermission(Actions.APP_UPDT_RECEIVE_FLOW_CONFIG)">
            <ion-toggle label-placement="start" :checked="isReceivingByFulfillment" @click.prevent="updateReceiveFlowType($event)">{{ translate("Receive by fulfillment") }}</ion-toggle>
          </ion-item>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,IonIcon, IonItem, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToggle, IonToolbar } from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { openOutline } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import Image from '@/components/Image.vue'
import { Actions, hasPermission } from '@/authorization';
import { getAppLoginUrl, translate, useAuthStore, useProductIdentificationStore } from "@hotwax/dxp-components"

export default defineComponent({
  name: 'Settings',
  components: {
    IonAvatar,
    IonButton, 
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonMenuButton,
    IonPage, 
    IonSelect, 
    IonSelectOption,
    IonTitle, 
    IonToggle,
    IonToolbar,
    Image
  },
  data() {
    return {
      baseURL: process.env.VUE_APP_BASE_URL,
      currentStore: '',
      appInfo: (process.env.VUE_APP_VERSION_INFO ? JSON.parse(process.env.VUE_APP_VERSION_INFO) : {}) as any,
      appVersion: "",
      barcodeContentMessage: translate("Only allow received quantity to be incremented by scanning the barcode of products. If the identifier is not found, the scan will default to using the internal name.", { space: '<br /><br />' })
    };
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentEComStore: 'user/getCurrentEComStore',
      isForceScanEnabled: 'util/isForceScanEnabled',
      isReceivingByFulfillment: 'util/isReceivingByFulfillment',
      barcodeIdentificationPref: 'util/getBarcodeIdentificationPref'
    })
  },
  mounted() {
    this.appVersion = this.appInfo.branch ? (this.appInfo.branch + "-" + this.appInfo.revision) : this.appInfo.tag;
  },
  methods: {
    async timeZoneUpdated(tzId: string) {
      await this.store.dispatch("user/setUserTimeZone", tzId)
    },
    async updateFacility(facility: any) {
      this.store.dispatch('shipment/clearShipments');
      await this.store.dispatch('user/setFacility', facility?.facilityId);
    },
    logout() {
      this.store.dispatch('user/logout', { isUserUnauthorised: false }).then((redirectionUrl) => {
        this.store.dispatch('shipment/clearShipments');
        this.store.dispatch('return/clearReturns');
        this.store.dispatch("party/resetReceiversDetails");

        // if not having redirection url then redirect the user to launchpad
        if (!redirectionUrl) {
          const redirectUrl = window.location.origin + '/login'
          window.location.href = `${getAppLoginUrl()}?isLoggedOut=true&redirectUrl=${redirectUrl}`
        }
      })
    },
    goToLaunchpad() {
      window.location.href = getAppLoginUrl();
    },
    setBarcodeIdentificationPref(value: string) {
      this.store.dispatch('util/setBarcodeIdentificationPref', value)
    },
    async updateForceScanStatus(event: any) {
      event.stopImmediatePropagation();
      this.store.dispatch("util/setForceScanSetting", !this.isForceScanEnabled)
    },
    async updateReceiveFlowType(event: any) {
      event.stopImmediatePropagation();
      this.store.dispatch("util/setReceivingByFulfillmentSetting", !this.isReceivingByFulfillment)
    },
  },
  setup(){
    const store = useStore();
    const router = useRouter();
    const productIdentificationStore = useProductIdentificationStore();
    let barcodeIdentificationOptions = computed(() => productIdentificationStore.getGoodIdentificationOptions)
    const authStore = useAuthStore();
    return {
      Actions,
      barcodeIdentificationOptions,
      hasPermission,
      openOutline,
      store,
      router,
      translate,
      authStore
    }
  }
});
</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
  }
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-items: start;
  }
  .user-profile {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  hr {
    border-top: 1px solid var(--ion-color-medium);
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacer-xs) 10px 0px;
  }
</style>
