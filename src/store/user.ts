import { api, commonUtil, cookieHelper, logger, translate, useNotificationStore, useEmbeddedAppStore, useAuth } from "@common";
import { defineStore } from "pinia"
import { DateTime, Settings } from "luxon"
import router from '@/router';
import { useProductStore } from "@/store/productStore";
import { useOrderStore } from "@/store/order";
import { usePartyStore } from "@/store/party";
import { useProductStore as useProduct } from "@/store/product";
import { useReturnStore } from "@/store/return";
import { useTransferOrderStore } from "@/store/transferorder";
import { useUtilStore } from "@/store/util";
import { firebaseUtil } from "@/utils/firebaseUtil";

interface UserState {
  permissions: any[]
  current: any
  pwaState: {
    updateExists: boolean
    registration: any
  }
  timeZones: any[],
  isEmbedded: boolean
  oms: any
}

export const useUserStore = defineStore("user", {
  state: (): UserState => ({
    permissions: [],
    current: {},
    pwaState: {
      updateExists: false,
      registration: null
    },
    timeZones: [],
    isEmbedded: false,
    oms: ""
  }),
  getters: {
    getTimeZones: (state) => state.timeZones,
    getCurrentTimeZone: (state) => state.current.timeZone,
    getUserPermissions(state: UserState) {
      return state.permissions
    },
    getUserProfile(state: UserState) {
      return state.current
    },
    getPwaState(state: UserState) {
      return state.pwaState
    },
    hasPermission: (state: UserState) => (permissionId: string): boolean => {
      const permissions = state.permissions;

      if (!permissionId) {
        return true;
      }

      // Handle OR/AND logic in permission string
      if (permissionId.includes(' OR ')) {
        const parts = permissionId.split(' OR ');
        return parts.some(part => useUserStore().hasPermission(part.trim()));
      }

      if (permissionId.includes(' AND ')) {
        const parts = permissionId.split(' AND ');
        return parts.every(part => useUserStore().hasPermission(part.trim()));
      }

      return permissions.includes(permissionId);
    },
    getOmsRedirectionInfo: (state) => ({
      url: commonUtil.getOmsURL(),
      token: cookieHelper().get("token")
    }),
    getMaargBaseUrl: (state) => commonUtil.getMaargURL(),
  },
  actions: {
    updateUserInfo(payload: any) {
      this.current = { ...this.current, ...payload }
    },
    setPermissionsState(payload: any) {
      this.permissions = payload
    },
    setPwaState(payload: any) {
      this.pwaState.registration = payload.registration
      this.pwaState.updateExists = payload.updateExists
    },
    updatePwaState(payload: any) {
      this.pwaState.registration = payload.registration;
      this.pwaState.updateExists = payload.updateExists;
    },
    async fetchUserProfile() {
      try {
        const userProfileResp = await api({
          url: "admin/user/profile",
          method: "get",
        }) as any;
        this.current = userProfileResp.data
        useAuth().updateUserId(this.current.userId)

        if (this.current.timeZone) {
          Settings.defaultZone = this.current.timeZone;
        }
        // TODO: This should be set from the Login Component
        this.oms = cookieHelper().get("oms");
      } catch (error: any) {
        commonUtil.showToast(translate("Failed to fetch user profile information"));
        console.error("error", error);
        useAuth().clearAuth();
        return Promise.reject(new Error(error));
      }
    },
    async fetchPermissions() {
      const permissionId = import.meta.env.VITE_APP_PERMISSION_ID
      const serverPermissions = [] as string[]
      const viewSize = 50
      let viewIndex = 0

      try {
        let resp
        do {
          resp = await api({
            url: "admin/user/permissions",
            method: "get",
            params: { viewIndex, viewSize }
          }) as any

          if (resp.status === 200 && resp.data.docs?.length && !commonUtil.hasError(resp)) {
            serverPermissions.push(...resp.data.docs.map((permission: any) => permission.permissionId))
            viewIndex++
          } else {
            resp = null
          }
        } while (resp)

        if(permissionId) {
          const hasPermission = serverPermissions.includes(permissionId)
          if(!hasPermission) {
            const permissionError = "You do not have permission to access the app."
            await commonUtil.showToast(translate(permissionError))
            logger.error("error", permissionError)
            return Promise.reject(new Error(permissionError))
          }
        }

        this.permissions = serverPermissions
      } catch (error: any) {
        return Promise.reject(error)
      }
    },

    async setUserTimeZone(tzId: string) {
      try {
        await api({
          url: "admin/user/profile",
          method: "POST",
          data: { userId: this.current.userId, timeZone: tzId },
        });
        this.updateUserInfo({ userTimeZone: tzId })
        this.current.timeZone = tzId
      } catch (error: any) {
        console.error("Failed to set user time zone", error);
        commonUtil.showToast(translate("Failed to set user time zone"));
      }
    },

    async getAvailableTimeZones() {
      // Do not fetch timeZones information, if already available
      if (this.timeZones.length) {
        return;
      }

      try {
        const resp = await api({
          url: "admin/user/getAvailableTimeZones",
          method: "get",
          cache: true
        }) as any;
        if (resp.status === 200 && !commonUtil.hasError(resp)) {
          this.timeZones = resp.data.timeZones.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
        }
      } catch (err) {
        console.error('Error', err)
      }
    },
    async postLogin() {
      try {
        const productStore = useProductStore();
        await this.fetchUserProfile()
        await this.fetchPermissions()
        await productStore.fetchUserFacilities()
        await productStore.fetchFacilityPreference();
        await productStore.fetchProductStores()
        await productStore.fetchProductStoreDependencies(productStore.getCurrentProductStore.productStoreId)

        const notificationStore = useNotificationStore();
        await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID as any, this.current.userId)
        await firebaseUtil.initialiseFirebaseMessaging();

        const facilityId = router.currentRoute.value.query.facilityId
        if (facilityId) {
          const facility = productStore.getFacilities.find((facility: any) => facility.facilityId === facilityId);
          if (facility) {
            productStore.currentFacility = facility
          } else {
            commonUtil.showToast(translate("Redirecting to home page due to incorrect information being passed."))
          }
        }
      } catch (error: any) {
        return Promise.reject(error);
      }
    },
    async preLogout() {
      try {
        const notificationStore = useNotificationStore();
        if (notificationStore.getFirebaseDeviceId) await notificationStore.removeClientRegistrationToken(notificationStore.getFirebaseDeviceId, import.meta.env.VITE_NOTIF_APP_ID as any);
      } catch (error) {
        logger.error(error);
      }

      if (commonUtil.isAppEmbedded()) {
        setTimeout(() => {
          window.location.href = window.location.origin + `/shopify-login?shop=${useEmbeddedAppStore().getShop}&host=${useEmbeddedAppStore().getHost}&embedded=1`;
        }, 100);
        useEmbeddedAppStore().$reset();
      }
    },
    async postLogout() {
      useNotificationStore().clearNotificationState();
      useOrderStore().$reset();
      usePartyStore().$reset();
      useProduct().$reset();
      useProductStore().$reset();
      useReturnStore().$reset();
      useTransferOrderStore().$reset();
      this.$reset();
      useUtilStore().$reset();
    }
  },
  persist: true
})
