<template>
  <ion-menu content-id="main-content" type="overlay" :disabled="!isUserAuthenticated">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ currentFacility.facilityName }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list id="receiving-list">
        <ion-menu-toggle auto-hide="false" v-for="(p, i) in appPages" :key="i">
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
import { calendar, download, gitPullRequestOutline, settings } from "ionicons/icons";
import { useStore } from "@/store";
import { useUserStore } from "@hotwax/dxp-components"
import { useRouter } from "vue-router";

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
      },
      {
        title: "Returns",
        url: "/returns",
        childRoutes: ["/return/"],
        iosIcon: gitPullRequestOutline,
        mdIcon: gitPullRequestOutline,
      },
      {
        title: "Purchase Orders",
        url: "/purchase-orders",
        childRoutes: ["/purchase-order-detail/"],
        iosIcon: calendar,
        mdIcon: calendar
      },
      {
        title: "Settings",
        url: "/settings",
        iosIcon: settings,
        mdIcon: settings,
      }
    ];

    const selectedIndex = computed(() => {
      const path = router.currentRoute.value.path
      return appPages.findIndex((screen) => screen.url === path || screen.childRoutes?.includes(path) || screen.childRoutes?.some((route) => path.includes(route)))
    })

    return {
      currentFacility,
      selectedIndex,
      appPages,
      download,
      settings,
      store,
      calendar
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