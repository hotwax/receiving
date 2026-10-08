import { getMaargURL as utilGetMaargURL, getOmsURL as utilGetOmsURL, hasError as utilHasError, isAppEmbedded as utilIsAppEmbedded, showToast as utilShowToast } from '@common/utils/core';
import { default as api } from '@common/core/remoteApi';
import { cookieHelper } from '@common/helpers/cookieHelper';
import { default as logger } from '@common/core/logger';
import { translate } from '@common/core/i18n';
import { useNotificationStore } from '@common/store/notification';
import { useEmbeddedAppStore } from '@common/store/embeddedApp';
import { useAuth } from '@common/composables/useAuth';
import { defineStore } from "pinia";
import { DateTime, Settings } from "luxon";
import { accxuiConfig } from '@common/core/configRegistry';
import { useProductStore } from "@/store/productStore";
import { useOrderStore } from "@/store/order";
import { usePartyStore } from "@/store/party";
import { useProductStore as useProduct } from "@/store/product";
import { useReturnStore } from "@/store/return";
import { useTransferOrderStore } from "@/store/transferorder";
import { useUtilStore } from "@/store/util";
import { firebaseUtil } from "@/utils/firebaseUtil";
import { clearReceivingSession } from '@/db/receivingClient';
import { beginReceivingLogin, finishReceivingLogin } from '@/db/receivingSession';

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
  appVersion: string | undefined
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
    oms: "",
    // The app version this deployment is pinned to. undefined = not resolved yet, "" = no version
    // configured, "vX.Y.Z" = pinned. Resolved from the OMS by useAuth().fetchAppVersion() on Login.
    appVersion: undefined as string | undefined
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
    getAppVersion(state: UserState) {
      return state.appVersion
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
      url: utilGetOmsURL(),
      token: cookieHelper().get("token")
    }),
    getMaargBaseUrl: (state) => utilGetMaargURL(),
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
        utilShowToast(translate("Failed to fetch user profile information"));
        console.error("error", error);
        useAuth().clearAuth();
        return Promise.reject(new Error(error));
      }
    },
    async fetchPermissions() {
      const permissionId = import.meta.env.VITE_APP_PERMISSION_ID
      const serverPermissions = [] as string[]
      const viewSize = 200
      let viewIndex = 0

      try {
        let resp
        do {
          resp = await api({
            url: "admin/user/permissions",
            method: "get",
            params: { viewIndex, viewSize }
          }) as any

          if (resp.status === 200 && resp.data.docs?.length && !utilHasError(resp)) {
            serverPermissions.push(...resp.data.docs.map((permission: any) => permission.permissionId))
            // Maarg returns the authoritative total; it can return more than
            // viewSize. Do not fetch an extra empty page once all rows arrived.
            if (Number.isSafeInteger(resp.data.count) && resp.data.count >= 0 && serverPermissions.length >= resp.data.count) break
            viewIndex++
          } else {
            resp = null
          }
        } while (resp)

        if(permissionId) {
          const hasPermission = serverPermissions.includes(permissionId)
          if(!hasPermission) {
            const permissionError = "You do not have permission to access the app."
            await utilShowToast(translate(permissionError))
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
        Settings.defaultZone = tzId;
      } catch (error: any) {
        console.error("Failed to set user time zone", error);
        utilShowToast(translate("Failed to set user time zone"));
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
        if (resp.status === 200 && !utilHasError(resp)) {
          this.timeZones = resp.data.timeZones.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
        }
      } catch (err) {
        console.error('Error', err)
      }
    },
    async postLogin() {
      beginReceivingLogin();
      try {
        const productStore = useProductStore();
        // Both depend on the authenticated session; facility access needs both results.
        const account = await Promise.allSettled([this.fetchUserProfile(), this.fetchPermissions()]);
        for (const result of account) if (result.status === 'rejected') throw result.reason;
        const notificationStore = useNotificationStore();
        // Notification setup needs the account, but not facility or store settings.
        const setup = await Promise.allSettled([
          (async () => {
            await productStore.fetchUserFacilities();
            // Embedded facility discovery already resolves and restricts the POS location.
            if (!utilIsAppEmbedded() || !useEmbeddedAppStore().getPosLocationId) {
              await productStore.fetchFacilityPreference();
            }
            await productStore.fetchProductStores();
          })(),
          (async () => {
            await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID as any, this.current.userId);
            await firebaseUtil.initialiseFirebaseMessaging();
          })(),
        ]);
        for (const result of setup) if (result.status === 'rejected') throw result.reason;

        const launchQuery = accxuiConfig.value.router.currentRoute.query;
        const facilityId = launchQuery.facilityId
        if (facilityId) {
          const facility = productStore.getFacilities.find((facility: any) => facility.facilityId === facilityId);
          if (facility) {
            productStore.currentFacility = facility
            const orderId = launchQuery.orderId
            if (orderId) {
              localStorage.setItem("requestedPagePath", `/transfer-order-detail/${orderId}`)
            }
          } else {
            utilShowToast(translate("Redirecting to home page due to incorrect information being passed."))
          }
        }
        finishReceivingLogin();
      } catch (error: any) {
        return Promise.reject(error);
      }
    },
    async preLogout() {
      await clearReceivingSession();
      try {
        const notificationStore = useNotificationStore();
        if (notificationStore.getFirebaseDeviceId) await notificationStore.removeClientRegistrationToken(notificationStore.getFirebaseDeviceId, import.meta.env.VITE_NOTIF_APP_ID as any);
      } catch (error) {
        logger.error(error);
      }

      if (utilIsAppEmbedded()) {
        setTimeout(() => {
          window.location.href = window.location.origin + `/shopify-login?shop=${useEmbeddedAppStore().getShop}&host=${useEmbeddedAppStore().getHost}&embedded=1`;
        }, 100);
        useEmbeddedAppStore().$reset();
      }
    },
    async postLogout() {
      // AccxUI skips preLogout for expired/invalid sessions. Always clear the
      // receiving cache before resetting stores; manual logout is idempotent.
      await clearReceivingSession().catch(error => logger.error(error));
      useTransferOrderStore().closeLocalDetail();
      useNotificationStore().clearNotificationState();
      useOrderStore().$reset();
      usePartyStore().$reset();
      useProduct().$reset();
      useProductStore().$reset();
      useReturnStore().$reset();
      useTransferOrderStore().$reset();
      // appVersion is preserved across this reset by useAuth().logout() (it's deployment config, not
      // session state), so a plain $reset() is fine here.
      this.$reset();
      useUtilStore().$reset();
    }
  },
  persist: true
})
