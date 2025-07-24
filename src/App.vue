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
import { Settings } from 'luxon';
import { initialise, resetConfig } from '@/adapter'
import { useRouter } from 'vue-router';
import { translate , useProductIdentificationStore } from "@hotwax/dxp-components"

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
      maxAge: process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0
    }
  },
  computed: {
    ...mapGetters({
      currentEComStore: 'user/getCurrentEComStore',
      userProfile: 'user/getUserProfile',
      userToken: 'user/getUserToken',
      instanceUrl: 'user/getInstanceUrl',
      isEmbedded: 'user/isEmbedded'
    })
  },
  methods: {
    async presentLoader(options = { message: '', backdropDismiss: true }) {
      // When having a custom message remove already existing loader
      if(options.message && this.loader) this.dismissLoader();

      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: options.message ? translate(options.message) : translate("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: options.backdropDismiss
          });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        this.loader = null as any;
      } else {
        // Added this else case as there are some scenarios in which the loader is not created and before that the dismissLoader gets called, resulting in the loader not getting dismissed
        // So checking that when the loader is not found then try dismissing the loader again after 3 secs.
        // The above case appears when directly hitting the shipment detail page and then the receive shipment api throws error
        // TODO: need to find a more better approach to dismiss the loader in such case
        setTimeout(() => {
          if (this.loader) {
            this.dismissLoader();
          }
        }, 3000)
      }
    },
    async unauthorized() {
      // Mark the user as unauthorised, this will help in not making the logout api call in actions
      this.store.dispatch("user/logout", { isUserUnauthorised: true });
      const redirectUrl = window.location.origin + '/login';
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`;
    }
  },
  created() {
    initialise({
      token: this.userToken,
      instanceUrl: this.instanceUrl,
      cacheMaxAge: this.maxAge,
      events: {
        unauthorised: this.unauthorized,
        responseError: () => {
          setTimeout(() => this.dismissLoader(), 100);
        },
        queueTask: (payload: any) => {
          emitter.emit("queueTask", payload);
        }
      }
    })
  },
  beforeMount() {
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
  },
  async mounted(){
    if(this.userToken) {
      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getIdentificationPref(this.currentEComStore?.productStoreId)
        .catch((error) => console.error(error));
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
    resetConfig()
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      router,
      store
    }
  }
});
</script>

<style>
  ion-split-pane {
    --side-width: 304px;
  }
</style>
