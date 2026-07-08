<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <ion-menu content-id="main-content" type="overlay" :disabled="!isAuthenticated || (router.currentRoute.value.name as string) === 'Login'">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ currentFacility.facilityName }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list id="receiving-list">
            <ion-menu-toggle :auto-hide="false" v-for="(p, i) in menuItems" :key="i">
              <ion-item button router-direction="root" :router-link="p.url" class="hydrated" :class="{ selected: selectedIndex === i }">
                <ion-icon slot="start" :ios="p.icon" :md="p.icon" />
                <ion-label>{{ translate(p.title) }}</ion-label>
              </ion-item>
            </ion-menu-toggle>
          </ion-list>
        </ion-content>
      </ion-menu>
      <ion-router-outlet id="main-content"></ion-router-outlet>
    </ion-split-pane>
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle, IonRouterOutlet, IonSplitPane, IonTitle, IonToolbar, loadingController } from '@ionic/vue';
import { ref, computed, onBeforeMount, onMounted, onUnmounted } from 'vue';
import router from '@/router'
import { Settings } from 'luxon';
import { translate, emitter, useNotificationStore, logger, useAuth } from "@common";
import { firebaseUtil } from '@/utils/firebaseUtil';
import { useUserStore } from '@/store/user';
import { useProductStore } from '@/store/productStore';

const userStore = useUserStore();
const productStore = useProductStore();

const { isAuthenticated } = useAuth();

const currentFacility = computed(() => productStore.getCurrentFacility);

const menuItems = computed(() => {
  return router.getRoutes()
    .filter(route => route.meta && route.meta.menuIndex)
    .filter(route => {
      if(userStore.hasPermission("FULFILLMENT_LEGACY_APP_VIEW") && userStore.hasPermission("FULFILLMENT_APP_VIEW") && route.meta.title === "Transfer Orders") {
        return false;
      } else if(!userStore.hasPermission("FULFILLMENT_LEGACY_APP_VIEW") && !userStore.hasPermission("FULFILLMENT_APP_VIEW") && route.meta.title === "Shipments") {
        return true;
      }
      return !route.meta.permissionId || userStore.hasPermission(route.meta.permissionId as string);
    })
    .sort((a, b) => (a.meta!.menuIndex as number) - (b.meta!.menuIndex as number))
    .map(route => ({
      title: route.meta!.title as string,
      url: route.path,
      icon: route.meta!.icon as string,
      childRoutes: route.meta!.childRoutes as string[]
    }));
});

const selectedIndex = computed(() => {
  const path = router.currentRoute.value.path;
  return menuItems.value.findIndex((item) => item.url === path || item.childRoutes?.includes(path) || item.childRoutes?.some((route: any) => path.includes(route)));
});

const loader = ref(null as any);
const userProfile = computed(() => userStore.getUserProfile);
const allNotificationPrefs = computed(() => useNotificationStore().getAllNotificationPrefs);



const presentLoader = async (options = { message: '', backdropDismiss: true }) => {
  // When having a custom message remove already existing loader
  if (options.message && loader.value) dismissLoader();

  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: options.message ? translate(options.message) : translate("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: options.backdropDismiss
      });
  }
  await loader.value.present();
};

const dismissLoader = () => {
  if (loader.value) {
    loader.value.dismiss();
    loader.value = null;
  } else {
    // Added this else case as there are some scenarios in which the loader is not created and before that the dismissLoader gets called, resulting in the loader not getting dismissed
    // So checking that when the loader is not found then try dismissing the loader again after 3 secs.
    // The above case appears when directly hitting the shipment detail page and then the receive shipment api throws error
    // TODO: need to find a more better approach to dismiss the loader in such case
    setTimeout(() => {
      if (loader.value) {
        dismissLoader();
      }
    }, 3000)
  }
};

onBeforeMount(() => {
  emitter.on('presentLoader', (options: any) => {
    presentLoader(options);
  });
  emitter.on('dismissLoader', dismissLoader);
});

onMounted(async () => {
  const currentProductStore: any = productStore.getCurrentProductStore;
  if (isAuthenticated.value && currentProductStore?.productStoreId) {
    await productStore.fetchProductStoreSettings(currentProductStore.productStoreId).catch((error) => logger.error(error));

    if (allNotificationPrefs.value?.length) {
      await firebaseUtil.initialiseFirebaseMessaging();
    }
  }

  // Handles case when user resumes or reloads the app
  // Luxon timezzone should be set with the user's selected timezone
  if (userProfile.value && userProfile.value.timeZone) {
    Settings.defaultZone = userProfile.value.timeZone;
  }
});

onUnmounted(() => {
  emitter.off('presentLoader', (options: any) => {
    presentLoader(options);
  });
  emitter.off('dismissLoader', dismissLoader);
});
</script>

<style scoped>
ion-item.selected ion-icon {
  color: var(--ion-color-secondary);
}
ion-item.selected {
  --color: var(--ion-color-secondary);
}
</style>
