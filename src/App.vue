<template>
  <ion-app>
    <IonSplitPane content-id="main-content" when="lg">
      <Menu />
      <ion-router-outlet id="main-content"></ion-router-outlet>
    </IonSplitPane>
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import Menu from '@/components/Menu.vue';
import { defineComponent } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import { mapGetters, useStore } from "vuex";
import { showToast } from './utils';
import { translate } from "@/i18n";
import { Settings } from 'luxon';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet,
    IonSplitPane,
    Menu
  },
  data() {
    return {
      loader: null as any,
      refreshing: false,
      registration: null,
      updateExists: false,
    }
  },
  created() {
    document.addEventListener('swUpdated', this.updateAvailable, { once: true })
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.refreshing) return
      this.refreshing = true
      window.location.reload()
    })
  },
  computed: {
    ...mapGetters({
      currentEComStore: 'user/getCurrentEComStore',
      productIdentifications: 'util/getProductIdentifications',
      userProfile: 'user/getUserProfile'
    })
  },
  methods: {
    async presentLoader() {
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: this.$t("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: true
          });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        this.loader = null as any;
      }
    },
    updateAvailable($event: any) {
      this.registration = $event.detail
      this.updateExists = true
      showToast(translate("New version available, please update the app."), [{
        text: translate('Update'),
        role: 'Update',
        handler: this.refreshApp
      }])
    },
    refreshApp() {
      this.updateExists = false
      if (!this.registration || !(this.registration as any).waiting) return
      (this.registration as any).waiting.postMessage({ type: 'SKIP_WAITING' })
    },
  },
  async mounted() {
    this.loader = await loadingController
      .create({
        message: this.$t("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);

    if(this.productIdentifications.length <= 0) {
      // TODO: fetch product identifications from enumeration instead of storing it in env
      this.store.dispatch('util/setProductIdentifications', process.env.VUE_APP_PRDT_IDENT ? JSON.parse(process.env.VUE_APP_PRDT_IDENT) : [])
    }

    if(this.userProfile) {
      this.store.dispatch('user/getProductIdentificationPref', this.currentEComStore.productStoreId);
    }
    // Handles case when user resumes or reloads the app
    // Luxon timezzone should be set with the user's selected timezone
    if (this.userProfile && this.userProfile.userTimeZone) {
      Settings.defaultZone = this.userProfile.userTimeZone;
    }
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
  setup() {
    const store = useStore();

    return {
      store
    }
  }
});
</script>