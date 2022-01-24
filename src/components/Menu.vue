<template>
    <ion-menu content-id="main-content" type="overlay" :disabled="!isUserAuthenticated">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ currentFacility.name }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list id="receiving-list">
            <ion-menu-toggle auto-hide="false" v-for="(p, i) in appPages" :key="i">
              <ion-item
                button
                @click="selectedIndex = i"
                router-direction="root"
                :router-link="p.url"
                class="hydrated"
                :class="{ selected: selectedIndex === i }"
              >
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
import { defineComponent, ref } from "vue";
import { mapGetters } from "vuex";
import { calendar, downloadOutline, settings } from "ionicons/icons";
import { useStore } from "@/store";

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
  created() {
    // When open any specific page it should show that page selected
    this.selectedIndex = this.appPages.findIndex((page) => {
      return page.url === this.$router.currentRoute.value.path;
    })
  },
  computed: {
    ...mapGetters({
      isUserAuthenticated: 'user/isUserAuthenticated',
      currentFacility: 'user/getCurrentFacility',
    })
  },
  watch:{
    $route (to) {
      // When logout and login it should point to Oth index
      if (to.path === '/login') {
        this.selectedIndex = 0;
      }
    },
  }, 
  setup() {
    const store = useStore();
    const selectedIndex = ref(0);
    const appPages = [
      {
        title: "Receiving",
        url: "/receiving",
        iosIcon: downloadOutline,
        mdIcon: downloadOutline,
      },
      {
        title: "Purchase Orders",
        url: "/purchase-orders",
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
    return {
      selectedIndex,
      appPages,
      downloadOutline,
      settings,
      store,
      calendar
    };
  },
});
</script>