<template>
  <ion-menu content-id="main-content" type="overlay" :disabled="!isUserAuthenticated">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ currentFacility.facilityName }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list id="receiving-list">
        <ion-menu-toggle auto-hide="false" v-for="(p, i) in getValidMenuItems()" :key="i">
          <ion-item button router-direction="root" :router-link="p.url" class="hydrated" :class="{ selected: selectedIndex === i }">
            <ion-icon slot="start" :ios="p.iosIcon" :md="p.mdIcon" />
            <ion-label>{{ p.title }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import {
  IonContent,
  IonIcon,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  IonMenu,
  IonMenuToggle,
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters } from "vuex";
import { calendar, download, gitPullRequestOutline, settings, arrowBackOutline } from "ionicons/icons";
import { useStore } from "@/store";
import { useUserStore } from "@hotwax/dxp-components"
import { useRouter } from "vue-router";
import { hasPermission } from "@/authorization";

export default defineComponent({
  name: "Menu",
  components: {
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonTitle,
    IonLabel,
    IonList,
    IonToolbar,
    IonMenu,
    IonMenuToggle,
  },
  computed: {
    ...mapGetters({
      isUserAuthenticated: 'user/isUserAuthenticated',
    })
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    const appPages = [
      {
        title: "Shipments",
        url: "/shipments",
        childRoutes: ["/shipment/"],
        iosIcon: download,
        mdIcon: download,
        meta: {
          permissionId: "APP_SHIPMENTS_VIEW"
        }
      },
      {
        title: "Transfer Orders",
        url: "/transfer-orders",
        childRoutes: ["/transfer-order-detail/"],
        iosIcon: arrowBackOutline,
        mdIcon: arrowBackOutline,
        meta: {
          permissionId: "APP_TRANSFERORDERS_VIEW"
        }
      },
      {
        title: "Returns",
        url: "/returns",
        childRoutes: ["/return/"],
        iosIcon: gitPullRequestOutline,
        mdIcon: gitPullRequestOutline,
        meta: {
          permissionId: "APP_RETURNS_VIEW"
        }
      },
      {
        title: "Purchase Orders",
        url: "/purchase-orders",
        childRoutes: ["/purchase-order-detail/"],
        iosIcon: calendar,
        mdIcon: calendar,
        meta: {
          permissionId: "APP_PURCHASEORDERS_VIEW"
        }
      },
      {
        title: "Settings",
        url: "/settings",
        iosIcon: settings,
        mdIcon: settings,
      }
    ];

    function getValidMenuItems() {
      return appPages.filter((appPage: any) => {
        // Handling the case to hide TO page dynamically and not added generic code,
        // as this is not something that needs to be handled for all the pages  and this might need to be removed in future
        if(hasPermission("APP_SHIPMENTS_VIEW") && hasPermission("APP_TRANSFERORDERS_VIEW") && appPage.title === "Transfer Orders") {
          return false;
        } else if(!hasPermission("APP_SHIPMENTS_VIEW") && !hasPermission("APP_TRANSFERORDERS_VIEW") && appPage.title === "Shipments") {
          return true;
        }
        return (!appPage.meta || !appPage.meta.permissionId) || hasPermission(appPage.meta.permissionId)
      });
    }

    const selectedIndex = computed(() => {
      const path = router.currentRoute.value.path
      const validPages = getValidMenuItems();
      return validPages.findIndex((screen) => screen.url === path || screen.childRoutes?.includes(path) || screen.childRoutes?.some((route) => path.includes(route)))
    })

    return {
      currentFacility,
      selectedIndex,
      appPages,
      download,
      settings,
      store,
      calendar,
      getValidMenuItems
    };
  }
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