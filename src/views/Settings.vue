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
              <Image :src="userProfile.partyImageUrl" />
            </ion-avatar>
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile?.username }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.userFullName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button v-if="!commonUtil.isAppEmbedded()" color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button v-if="!commonUtil.isAppEmbedded()" fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>
      </div>

      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>

      <section>
        <DxpOmsInstanceNavigator :is-embedded="commonUtil.isAppEmbedded()" />
        <DxpFacilitySwitcher @updateFacility="fetchFacilityDependencies($event)" />
      </section>
      <hr />
      <DxpAppVersionInfo />

      <section>
        <DxpProductIdentifier />
        <DxpTimeZoneSwitcher />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Force scan") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content v-html="barcodeContentMessage"></ion-card-content>
          <ion-item lines="none" :disabled="!userStore.hasPermission('COMMON_ADMIN')">
            <ion-toggle label-placement="start" :checked="isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')" @click.prevent="updateForceScanStatus($event)">{{ translate("Require scan") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none" :disabled="!userStore.hasPermission('COMMON_ADMIN')">
            <ion-select :label="translate('Barcode Identifier')" interface="popover" :placeholder="translate('Select')" :value="barcodeIdentificationPref" @ionChange="setBarcodeIdentificationPref($event.detail.value)">
              <ion-select-option v-for="identification in barcodeIdentificationOptions" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId">{{ identification.description ? translate(identification.description) : identification.goodIdentificationTypeId }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card v-if="notificationPrefs.length">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Notification Preference") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Select the notifications you want to receive.') }}
          </ion-card-content>
          <ion-list>
            <ion-item :key="pref.enumId" v-for="pref in notificationPrefs" lines="none">
              <ion-toggle label-placement="start" @click.prevent="confirmNotificationPrefUpdate(pref.enumId, $event)" :checked="pref.isEnabled">{{ pref.description }}</ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Inventory receiving flow") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("Inventory of the transferred items will be received by fulfillment app.") }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!userStore.hasPermission('COMMON_ADMIN')">
            <ion-toggle label-placement="start" :checked="isProductStoreSettingEnabled('RECEIVE_BY_FULFILL')" @click.prevent="confirmReceiveByFulfillment($event)">{{ translate("Receive by fulfillment") }}</ion-toggle>
          </ion-item>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle, IonContent, IonHeader, IonIcon, IonItem, IonList, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToggle, IonToolbar, alertController, onIonViewWillEnter } from "@ionic/vue";
import { computed } from "vue";
import { openOutline } from "ionicons/icons";
import { commonUtil, emitter, firebaseMessaging, logger, translate, useNotificationStore, useAuth } from "@common";
import { useProductStore } from "@/store/productStore";
import { useUserStore } from "@/store/user";
import Image from "@/components/Image.vue";
import DxpOmsInstanceNavigator from "@/components/DxpOmsInstanceNavigator.vue";
import DxpFacilitySwitcher from "@/components/DxpFacilitySwitcher.vue";
import DxpAppVersionInfo from "@/components/DxpAppVersionInfo.vue";
import DxpProductIdentifier from "@/components/DxpProductIdentifier.vue";
import DxpTimeZoneSwitcher from "@/components/DxpTimeZoneSwitcher.vue";
import { firebaseUtil } from "@/utils/firebaseUtil"

const userStore = useUserStore();
const productStore = useProductStore();
const notificationStore = useNotificationStore();

const barcodeContentMessage = translate("Only allow received quantity to be incremented by scanning the barcode of products. If the identifier is not found, the scan will default to using the internal name.", { space: "<br /><br />" });

const userProfile = computed(() => userStore.getUserProfile);
const notifications = computed(() => notificationStore.getNotifications);
const unreadNotificationsStatus = computed(() => notificationStore.getUnreadNotificationsStatus);
const notificationPrefs = computed(() => notificationStore.getNotificationPrefs);
const allNotificationPrefs = computed(() => notificationStore.getAllNotificationPrefs);
const firebaseDeviceId = computed(() => notificationStore.getFirebaseDeviceId);
const isProductStoreSettingEnabled = computed(() => (settingTypeEnumId: string) => productStore.isProductStoreSettingEnabled(settingTypeEnumId));
const barcodeIdentificationPref = computed(() => productStore.getBarcodeIdentifierPref);
const currentFacility = computed(() => productStore.getCurrentFacility);
const preferredStore = computed(() => productStore.getCurrentProductStore);
const barcodeIdentificationOptions = computed(() => productStore.getBarcodeIdentifierOptions);

const logout = async () => {
  await useAuth().logout({ isUserUnauthorised: false })
}

const goToLaunchpad = () => {
  window.location.href = `${import.meta.env.VITE_LOGIN_URL}`
};

const fetchFacilityDependencies = async (facility: any) => {
  await productStore.fetchProductStores(facility?.facilityId)
  await productStore.fetchProductStoreDependencies(productStore.getCurrentProductStore.productStoreId)
  await notificationStore.fetchNotificationPreferences(import.meta.env.VITE_NOTIF_ENUM_TYPE_ID, import.meta.env.VITE_NOTIF_APP_ID, userStore.getUserProfile.userLoginId, (enumId: string) => firebaseMessaging.generateTopicName(commonUtil.getOMSInstanceName(), productStore.getCurrentFacility.facilityId, enumId));
};

const updateForceScanStatus = async (event: any) => {
  event.stopImmediatePropagation();
  await productStore.setProductStoreSetting(
    preferredStore.value.productStoreId,
    "RECEIVE_FORCE_SCAN",
    !isProductStoreSettingEnabled.value("RECEIVE_FORCE_SCAN") ? "Y" : "N"
  );
};

const confirmReceiveByFulfillment = async (event: any) => {
  event.stopImmediatePropagation();
  const isChecked = !isProductStoreSettingEnabled.value("RECEIVE_BY_FULFILL");
  const message = translate("Are you sure you want to perform this action?");
  const header = isChecked ? translate("Receive by fulfillment") : translate("Do not receive by fulfillment");

  const alert = await alertController.create({
    header,
    message,
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel"
      },
      {
        text: translate("Confirm"),
        handler: async () => {
          await productStore.setProductStoreSetting(
            preferredStore.value.productStoreId,
            "RECEIVE_BY_FULFILL",
            isChecked ? "Y" : "N"
          );
        }
      }
    ]
  });
  return alert.present();
};

const updateNotificationPref = async (enumId: string) => {
  let isToggledOn = false;
  try {
    const notificationPref = notificationStore.getNotificationPrefs.find((pref: any) => pref.enumId === enumId);
    const topicName = firebaseMessaging.generateTopicName(commonUtil.getOMSInstanceName(), currentFacility.value.facilityId, enumId);
    notificationPref.isEnabled
      ? await notificationStore.unsubscribeTopic(topicName, import.meta.env.VITE_NOTIF_APP_ID as any)
      : await notificationStore.subscribeTopic(topicName, import.meta.env.VITE_NOTIF_APP_ID as any);

    notificationPref.isEnabled = !notificationPref.isEnabled;
    notificationStore.setNotificationPrefs(notificationPrefs.value);
    isToggledOn = notificationPref.isEnabled;
    commonUtil.showToast(translate("Notification preferences updated."));
  } catch (error) {
    commonUtil.showToast(translate("Notification preferences not updated. Please try again."));
  } finally {
    emitter.emit("dismissLoader");
  }
  try {
    if (!allNotificationPrefs.value.length && isToggledOn) {
      await firebaseUtil.initialiseFirebaseMessaging();
    } else if (allNotificationPrefs.value.length === 1 && !isToggledOn) {
      await notificationStore.unsubscribeTopic(firebaseDeviceId.value, import.meta.env.VITE_NOTIF_APP_ID)
    }
    await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID, userProfile.value?.userId);
  } catch (error) {
    logger.error(error);
  }
};

const confirmNotificationPrefUpdate = async (enumId: string, event: CustomEvent) => {
  event.stopImmediatePropagation();

  const message = translate("Are you sure you want to update the notification preferences?");
  const alert = await alertController.create({
    header: translate("Update notification preferences"),
    message,
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel"
      },
      {
        text: translate("Confirm"),
        handler: async () => {
          await updateNotificationPref(enumId);
        }
      }
    ]
  });
  return alert.present();
};

const setBarcodeIdentificationPref = async (value: string) => {
  await productStore.setProductStoreSetting(
    preferredStore.value.productStoreId,
    "BARCODE_IDEN_PREF",
    value
  );
};

onIonViewWillEnter(async () => {
  await productStore.fetchProductStoreSettings(preferredStore.value.productStoreId);
  await notificationStore.fetchNotificationPreferences(import.meta.env.VITE_NOTIF_ENUM_TYPE_ID, import.meta.env.VITE_NOTIF_APP_ID, userStore.getUserProfile.userLoginId, (enumId: string) => firebaseMessaging.generateTopicName(commonUtil.getOMSInstanceName(), productStore.getCurrentFacility.facilityId, enumId));
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
