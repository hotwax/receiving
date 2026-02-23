<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button data-testid="notifications-page-back-btn" slot="start" default-href="/transfer-orders" />
        <ion-title>{{ translate("Notifications") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content data-testid="notifications-page-content">
      <main>
          <ion-list data-testid="notifications-page-list" v-if="notifications.length">
            <ion-item v-for="(notification, index) in notifications" :key="index" :data-testid="`notifications-page-row-${notification.time}`">
              <ion-label class="ion-text-wrap">
                <h3>{{ notification.data.title }}</h3>
                <p>{{ notification.data.body }}</p>
              </ion-label>
              <ion-note slot="end">{{ timeTillNotification(notification.time) }}</ion-note>
            </ion-item>
          </ion-list>
          <div v-else data-testid="notifications-page-empty-state" class="ion-text-center">
            {{ translate('No notifications to show') }}
          </div>
      </main>
      <ion-fab slot="fixed" size="small" vertical="top" horizontal="end" :edge="true">
        <ion-fab-button data-testid="notifications-page-settings-btn" size="small" @click="openNotificationSettings()">
          <ion-icon :icon="cogOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { cogOutline } from 'ionicons/icons';
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { DateTime } from "luxon";
import NotificationPreferenceModal from '@/components/NotificationPreferenceModal.vue'
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: "Notifications",
  components: {
    IonBackButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonPage,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      notifications: 'user/getNotifications',
    })
  },
  methods: {
    async openNotificationSettings() {
      const timeZoneModal = await modalController.create({
        component: NotificationPreferenceModal,
      });
      return timeZoneModal.present();
    },
    timeTillNotification(time: number) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    }
  },
  setup() {
    const store = useStore();

    return {
      cogOutline,
      translate,
      store
    }
  }
});
</script>

<style scoped>
main {
  margin: var(--spacer-base) auto 0;
}

@media (min-width: 991px) {
  main {
    display: flex;
    justify-content: center;
  }

  main > ion-list {
    max-width: 50ch;
    flex: 1;
  }
}
</style>
