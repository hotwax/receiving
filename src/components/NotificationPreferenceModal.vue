<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Notification Preference") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div v-if="!notificationPrefs.length" class="ion-text-center">
      <p>{{ translate("Notification preferences not found.")}}</p>
    </div>
    <ion-list v-else>
      <ion-item :key="pref.enumId" v-for="pref in notificationPrefs">
        <ion-toggle label-placement="start" @click="toggleNotificationPref(pref.enumId, $event)" :checked="pref.isEnabled">{{ pref.description }}</ion-toggle>
      </ion-item>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="isButtonDisabled" @click="confirmSave()">
        <ion-icon :icon="save" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonList, IonTitle, IonToggle, IonToolbar, modalController, alertController } from "@ionic/vue";
import { computed, onBeforeMount, ref } from "vue";
import { closeOutline, save } from "ionicons/icons";
import { commonUtil, emitter, firebaseMessaging, logger, translate, useNotificationStore } from "@common";
import { useUserStore as useDxpUserStore } from "@/store/user";
import { useProductStore } from "@/store/productStore";
const productStore = useProductStore();
const notificationPrefState = ref<Record<string, boolean>>({});
const notificationPrefToUpdate = ref({ subscribe: [] as string[], unsubscribe: [] as string[] });
const initialNotificationPrefState = ref<Record<string, boolean>>({});

const notificationPrefs = computed(() => useNotificationStore().notificationPrefs);
const currentFacility = computed(() => productStore.getCurrentFacility);

const isButtonDisabled = computed(() => {
  const enumTypeIds = Object.keys(initialNotificationPrefState.value);
  return enumTypeIds.every((enumTypeId: string) => notificationPrefState.value[enumTypeId] === initialNotificationPrefState.value[enumTypeId]);
});

onBeforeMount(async () => {
  const userStore = useDxpUserStore();
  const notificationStore = useNotificationStore();
  const omsInstanceName = commonUtil.getOMSInstanceName();
  await (notificationStore as any).fetchNotificationPreferences(import.meta.env.VITE_NOTIF_ENUM_TYPE_ID, import.meta.env.VITE_NOTIF_APP_ID, userStore.getUserProfile.userLoginId, (enumId: string) => firebaseMessaging.generateTopicName(omsInstanceName, productStore.getCurrentFacility.facilityId, enumId));
  notificationPrefState.value = notificationPrefs.value.reduce((prefs: any, pref: any) => {
    prefs[pref.enumId] = pref.isEnabled;
    return prefs;
  }, {});
  initialNotificationPrefState.value = JSON.parse(JSON.stringify(notificationPrefState.value));
});

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const toggleNotificationPref = (enumId: string, event: any) => {
  const value = !event.target.checked;
  if (value !== initialNotificationPrefState.value[enumId]) {
    value ? notificationPrefToUpdate.value.subscribe.push(enumId) : notificationPrefToUpdate.value.unsubscribe.push(enumId);
  } else {
    !value ? notificationPrefToUpdate.value.subscribe.splice(notificationPrefToUpdate.value.subscribe.indexOf(enumId), 1) : notificationPrefToUpdate.value.unsubscribe.splice(notificationPrefToUpdate.value.subscribe.indexOf(enumId), 1);
  }
  notificationPrefState.value[enumId] = value;
};

const handleTopicSubscription = async () => {
  const userStore = useDxpUserStore();
  const omsInstanceName = commonUtil.getOMSInstanceName();
  const facilityId = (currentFacility.value as any)?.facilityId;
  const subscribeRequests = [] as any;
  const notificationStore = useNotificationStore();
  notificationPrefToUpdate.value.subscribe.map((enumId: string) => {
    const topicName = firebaseMessaging.generateTopicName(omsInstanceName, facilityId, enumId);
    subscribeRequests.push((notificationStore as any).subscribeTopic(topicName, import.meta.env.VITE_NOTIF_APP_ID as any));
  });

  const unsubscribeRequests = [] as any;
  notificationPrefToUpdate.value.unsubscribe.map((enumId: string) => {
    const topicName = firebaseMessaging.generateTopicName(omsInstanceName, facilityId, enumId);
    unsubscribeRequests.push((notificationStore as any).unsubscribeTopic(topicName, import.meta.env.VITE_NOTIF_APP_ID as any));
  });

  const responses = await Promise.allSettled([...subscribeRequests, ...unsubscribeRequests]);
  const hasFailedResponse = responses.some((response: any) => response.status === "rejected");
  commonUtil.showToast(hasFailedResponse ? translate("Notification preferences not updated. Please try again.") : translate("Notification preferences updated."));
};

const updateNotificationPref = async () => {
  emitter.emit("presentLoader");
  try {
    await handleTopicSubscription();
  } catch (error) {
    logger.error(error);
  } finally {
    emitter.emit("dismissLoader");
  }
};

const confirmSave = async () => {
  const message = translate("Are you sure you want to update the notification preferences?");
  const alert = await alertController.create({
    header: translate("Update notification preferences"),
    message,
    buttons: [
      { text: translate("Cancel") },
      {
        text: translate("Confirm"),
        handler: async () => {
          await updateNotificationPref();
          modalController.dismiss({ dismissed: true });
        }
      }
    ]
  });
  return alert.present();
};
</script>
