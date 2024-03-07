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
          <ion-button color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
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

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Facility") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ translate("Select facility") }}</ion-label>
            <ion-select interface="popover" :value="currentFacility.facilityId" @ionChange="setFacility($event)">
              <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.facilityName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
      </section>
      <hr />

      <DxpAppVersionInfo />

      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Product Identifier') }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ translate('Choosing a product identifier allows you to view products with your preferred identifiers.') }}
          </ion-card-content>

          <ion-item>
            <ion-label>{{ translate("Primary Product Identifier") }}</ion-label>
            <ion-select :disabled="!hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE) || !currentEComStore?.productStoreId" interface="popover" :placeholder="translate('primary identifier')" :value="productIdentificationPref.primaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'primaryId')">
              <ion-select-option v-for="identification in productIdentifications" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label>{{ translate("Secondary Product Identifier") }}</ion-label>
            <ion-select :disabled="!hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE) || !currentEComStore?.productStoreId" interface="popover" :placeholder="translate('secondary identifier')" :value="productIdentificationPref.secondaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'secondaryId')">
              <ion-select-option v-for="identification in productIdentifications" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
              <ion-select-option value="">{{ translate("None") }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Timezone') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('The timezone you select is used to ensure automations you schedule are always accurate to the time you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label> {{ userProfile && userProfile.userTimeZone ? userProfile.userTimeZone : '-' }} </ion-label>
            <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ translate("Change") }}</ion-button>
          </ion-item>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { alertController, IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,IonIcon, IonItem, IonLabel, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVertical, openOutline, saveOutline, globeOutline, personCircleOutline, storefrontOutline} from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import Image from '@/components/Image.vue'
import { DateTime } from 'luxon';
import TimeZoneModal from '@/views/TimezoneModal.vue';
import { Actions, hasPermission } from '@/authorization';
import { translate } from "@hotwax/dxp-components"
import { DxpAppVersionInfo } from '@hotwax/dxp-components/lib/components';

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
    IonLabel,
    IonMenuButton,
    IonPage, 
    IonSelect, 
    IonSelectOption,
    IonTitle, 
    IonToolbar,
    Image
  },
  data() {
    return {
      baseURL: process.env.VUE_APP_BASE_URL,
      currentStore: '',
      appInfo: (process.env.VUE_APP_VERSION_INFO ? JSON.parse(process.env.VUE_APP_VERSION_INFO) : {}) as any,
      appVersion: ""
    };
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      currentEComStore: 'user/getCurrentEComStore',
      productIdentifications: 'util/getProductIdentifications',
      productIdentificationPref: 'user/getProductIdentificationPref'
    })
  },
  mounted() {
    this.appVersion = this.appInfo.branch ? (this.appInfo.branch + "-" + this.appInfo.revision) : this.appInfo.tag;
  },
  methods: {
    async changeTimeZone() {
      const timeZoneModal = await modalController.create({
        component: TimeZoneModal,
      });
      return timeZoneModal.present();
    },
    setFacility (facility: any) {
      // Checking if current facility is not equal to the facility selected to avoid extra api call on logging in again after logout.
      if(this.currentFacility.facilityId != facility['detail'].value && this.userProfile?.facilities) {
        this.userProfile?.facilities?.map((fac: any) => {
          if (fac.facilityId == facility['detail'].value) {
            this.store.dispatch('shipment/clearShipments');
            this.store.dispatch('user/setFacility', {'facility': fac});
          }
        })
      }
    },
    async presentAlert () {
      const alert = await alertController.create({
        header: translate('Logout'),
        message: translate('The products in the upload list will be removed.'),
        buttons: [{
          text: translate('Cancel')
        },
        {
          text: translate('Ok'),
          handler: () => {
            this.store.dispatch('user/logout', { isUserUnauthorised: false }).then((redirectionUrl) => {
              this.store.dispatch('product/clearUploadProducts');

              // if not having redirection url then redirect the user to launchpad
              if (!redirectionUrl) {
                const redirectUrl = window.location.origin + '/login'
                window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
              }
            })
          }
        }]
      });
      await alert.present();
    },
    logout() {
      this.store.dispatch('user/logout', { isUserUnauthorised: false }).then((redirectionUrl) => {
        this.store.dispatch('shipment/clearShipments');
        this.store.dispatch('return/clearReturns');
        this.store.dispatch("party/resetReceiversDetails");

        // if not having redirection url then redirect the user to launchpad
        if (!redirectionUrl) {
          const redirectUrl = window.location.origin + '/login'
          window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
        }
      })
    },
    goToLaunchpad() {
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
    },
    setProductIdentificationPref(value: string, id: string) {
      // Not dispatching an action if the value for id is same as saved in state
      if(this.productIdentificationPref[id] == value) {
        return;
      }
      this.store.dispatch('user/setProductIdentificationPref', { id, value })
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    }
  },
  setup(){
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      codeWorkingOutline,
      ellipsisVertical,
      globeOutline,
      hasPermission,
      personCircleOutline,
      openOutline,
      saveOutline,
      storefrontOutline,
      store,
      router,
      translate
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
