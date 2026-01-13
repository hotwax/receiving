import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { getCurrentFacilityId, hasError, showToast } from '@/utils'
import { DateTime, Settings } from 'luxon';
import { logout, updateInstanceUrl, updateToken, resetConfig } from '@/adapter'
import { NotificationService } from '@/services/NotificationService'
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions
} from '@/authorization'
import { translate, useAuthStore, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components'
import { generateDeviceId, generateTopicName } from '@/utils/firebase'
import emitter from '@/event-bus'
import store from '@/store'
import router from '@/router'

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch }, payload) {
    try {
      const {token, oms, omsRedirectionUrl} = payload;
      dispatch("setUserInstanceUrl", oms);
      // Getting the permissions list from server
      const permissionId = process.env.VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = getServerPermissionsFromRules();
      if (permissionId) serverPermissionsFromRules.push(permissionId);

      const serverPermissions = await UserService.getUserPermissions({
        permissionIds: [...new Set(serverPermissionsFromRules)]
      }, token);
      const appPermissions = prepareAppPermissions(serverPermissions);


      // Checking if the user has permission to access the app
      // If there is no configuration, the permission check is not enabled
      if (permissionId) {
        // As the token is not yet set in the state passing token headers explicitly
        // TODO Abstract this out, how token is handled should be part of the method not the callee
        const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId );
        // If there are any errors or permission check fails do not allow user to login
        if (!hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          console.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      const userProfile = await UserService.getUserProfile(token);
      const moquiUser = await UserService.getMoquiUserProfile(omsRedirectionUrl, token);
      userProfile.moquiUserId = moquiUser.userId;

      //fetching user facilities
      const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_RECVG_ADMIN");
      const facilities = await useUserStore().getUserFacilities(userProfile?.partyId, "", isAdminUser)
      await useUserStore().getFacilityPreference('SELECTED_FACILITY')

      if (!facilities.length) throw 'Unable to login. User is not associated with any facility'

      userProfile.facilities = facilities

      // Getting unique facilities
      userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
        if(uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1);
        else uniqueFacilities.push(facility.facilityId);
        return uniqueFacilities
      }, []);

      const facilityId = router.currentRoute.value.query.facilityId
      let isQueryFacilityFound = false
      if (facilityId) {
        const facility = userProfile.facilities.find((facility: any) => facility.facilityId === facilityId);
        if (facility) {
          isQueryFacilityFound = true
          useUserStore().currentFacility = facility
        } else {
          showToast(translate("Redirecting to home page due to incorrect information being passed."))
        }
      }

      const currentFacilityId: any = getCurrentFacilityId();
      const currentEComStore = await UserService.getEComStores(token, currentFacilityId);
      useUserStore().currentEComStore = currentEComStore
      const productStoreId = currentEComStore?.productStoreId;


      setPermissions(appPermissions);
      if (userProfile.userTimeZone) {
        Settings.defaultZone = userProfile.userTimeZone;
      }

      if(omsRedirectionUrl) {
        const api_key = await UserService.moquiLogin(omsRedirectionUrl, token)
        if(api_key) {
          dispatch("setOmsRedirectionInfo", { url: omsRedirectionUrl, token: api_key })
        } else {
          showToast(translate("Some of the app functionality will not work due to missing configuration."))
          console.error("Some of the app functionality will not work due to missing configuration.");
        }
      } else {
        showToast(translate("Some of the app functionality will not work due to missing configuration."))
        console.error("Some of the app functionality will not work due to missing configuration.")
      }

      updateToken(token)

      // TODO user single mutation
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, currentEComStore);
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: token })

      await useProductIdentificationStore().getIdentificationPref(productStoreId)
        .catch((error) => console.error(error));

      // Get facility location of selected facility
      dispatch('getFacilityLocations', currentFacilityId);
      // TODO: fetch product identifications from enumeration instead of storing it in env
      this.dispatch('util/getForceScanSetting', currentEComStore?.productStoreId);
      this.dispatch('util/getReceivingByFulfillmentSetting', currentEComStore?.productStoreId);
      this.dispatch('util/getBarcodeIdentificationPref', currentEComStore?.productStoreId);
      await dispatch("fetchAllNotificationPrefs");

      const orderId = router.currentRoute.value.query.orderId
      if (isQueryFacilityFound && orderId) {
        return `/transfer-order-detail/${orderId}`;
      }
    } catch (err: any) {
      // If any of the API call in try block has status code other than 2xx it will be handled in common catch block.
      // TODO Check if handling of specific status codes is required.
      showToast(translate('Something went wrong while login. Please contact administrator'));
      console.error("error", err);
      return Promise.reject(err instanceof Object ? err : new Error(err))
    }
  },

  /**
   * Logout user
   */
  async logout ({ commit, dispatch }, payload) {
    // store the url on which we need to redirect the user after logout api completes in case of SSO enabled
    let redirectionUrl = ''

    // Calling the logout api to flag the user as logged out, only when user is authorised
    // if the user is already unauthorised then not calling the logout api as it returns 401 again that results in a loop, thus there is no need to call logout api if the user is unauthorised
    if(!payload?.isUserUnauthorised) {
      emitter.emit('presentLoader', { message: 'Logging out', backdropDismiss: false })

      let resp;

      // wrapping the parsing logic in try catch as in some case the logout api makes redirection, and then we are unable to parse the resp and thus the logout process halts
      try {
        resp = await logout();

        // Added logic to remove the `//` from the resp as in case of get request we are having the extra characters and in case of post we are having 403
        resp = JSON.parse(resp.startsWith('//') ? resp.replace('//', '') : resp)
      } catch(err) {
        console.error('Error parsing data', err)
      }

      if(resp?.logoutAuthType == 'SAML2SSO') {
        redirectionUrl = resp.logoutUrl
      }
    }

    const authStore = useAuthStore()

    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    dispatch('clearNotificationState')
    this.dispatch('order/clearPurchaseOrders');
    this.dispatch('util/updateForceScanStatus', false)
    this.dispatch('util/updateBarcodeIdentificationPref', "")
    resetPermissions();
    resetConfig();

    // reset plugin state on logout
    authStore.$reset()

    // If we get any url in logout api resp then we will redirect the user to the url
    if(redirectionUrl) {
      window.location.href = redirectionUrl
    }

    emitter.emit('dismissLoader')
    return redirectionUrl;
  },

  /**
   * update current facility information
   */
  async setFacility ({ commit, dispatch }, facilityId) {
    const token = store.getters['user/getUserToken'];
    const previousEComStore = await useUserStore().getCurrentEComStore as any
    const eComStore = await UserService.getEComStores(token, facilityId);
    await dispatch('getFacilityLocations', facilityId)
    // Initialize or update eComStore based on productStoreId changes
    if(!Object.keys(eComStore).length) {
      useUserStore().currentEComStore = {}
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, '');
      await dispatch('updateSettingsToDefault')
      await useProductIdentificationStore().getIdentificationPref("")
        .catch((error) => console.error(error));
    } else if(previousEComStore.productStoreId !== eComStore.productStoreId) {
      await useUserStore().setEComStorePreference(eComStore);
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, eComStore);
      this.dispatch('util/getForceScanSetting', eComStore.productStoreId)
      this.dispatch('util/getReceivingByFulfillmentSetting', eComStore.productStoreId)
      this.dispatch('util/getBarcodeIdentificationPref', eComStore.productStoreId)
      await useProductIdentificationStore().getIdentificationPref(eComStore.productStoreId)
        .catch((error) => console.error(error));
    }
  },
  
  async updateSettingsToDefault() {
    this.dispatch('util/updateForceScanStatus', false)
    this.dispatch('util/updateBarcodeIdentificationPref', "internalName")
  },
  /**
   * Update user timeZone
   */
  async setUserTimeZone ( { state, commit }, timeZoneId) {
    const current: any = state.current;
    current.userTimeZone = timeZoneId;
    commit(types.USER_INFO_UPDATED, current);
    Settings.defaultZone = current.userTimeZone;
  },

  // Set User Instance Url
  setUserInstanceUrl ({ commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
    updateInstanceUrl(payload)
  },

  async getFacilityLocations( { commit }, facilityId ) {
    const facilityLocations = this.state.user.facilityLocationsByFacilityId[facilityId];
    if(facilityLocations){
      return facilityLocations;
    }
    let resp;
    const payload = {
      "inputFields": {
        facilityId
      },
      // Assuming we will not have more than 20 facility locations, hardcoded the viewSize value 20.
      "viewSize": 20,
      "fieldList": ["locationSeqId", "areaId", "aisleId", "sectionId", "levelId", "positionId"],
      "entityName": "FacilityLocation",
      "distinct": "Y",
      "noConditionFind": "Y"
    }
    try{
      resp = await UserService.getFacilityLocations(payload);
      if(resp.status === 200 && !hasError(resp) && resp.data?.count > 0) {
        let facilityLocations = resp.data.docs

        facilityLocations = facilityLocations.map((location: any) => {
          const locationPath = [location.areaId, location.aisleId, location.sectionId, location.levelId, location.positionId].filter((value: any) => value).join("");
          return {
            locationSeqId: location.locationSeqId,
            locationPath: locationPath
          }
        })
        commit(types.USER_FACILITY_LOCATIONS_BY_FACILITY_ID, { facilityLocations, facilityId });
        return facilityLocations;
      } else {
        console.error(resp);
        return [];
      }
    } catch(err) {
      console.error(err);
      return [];
    }
  },

  updatePwaState({ commit }, payload) {
    commit(types.USER_PWA_STATE_UPDATED, payload);
  },

  setOmsRedirectionInfo({ commit }, payload) {
    commit(types.USER_OMS_REDIRECTION_INFO_UPDATED, payload)
  },

  /**
   * Stores the client's Firebase registration token for push notifications.
   * Generates a unique device ID, commits it to the store, and sends both the registration token
   * and device ID to the notification service for registration.
   */
  async storeClientRegistrationToken({ commit }, registrationToken) {
    const firebaseDeviceId = generateDeviceId()
    commit(types.USER_FIREBASE_DEVICEID_UPDATED, firebaseDeviceId)

    try {
      await NotificationService.storeClientRegistrationToken(registrationToken, firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID)
    } catch (error) {
      console.error(error)
    }
  },

  /**
   * Adds a new notification to the user's notification list and updates the store state.
   * Optionally displays a toast message if the app is in the foreground.
   */
  addNotification({ state, commit }, payload) {
    const notifications = JSON.parse(JSON.stringify(state.notifications))
    notifications.push({ ...payload.notification, time: DateTime.now().toMillis() })
    commit(types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED, true)
    if (payload.isForeground) {
      showToast(translate("New notification received."));
    }
    commit(types.USER_NOTIFICATIONS_UPDATED, notifications)
  },

  /**
   * Fetches all notification preferences for the current user and facility.
   * Retrieves notification preference type IDs from the NotificationService and commits the result to the store.
   */
  async fetchAllNotificationPrefs({ commit, state }) {
    let allNotificationPrefs = [];

    try {
      const resp = await NotificationService.getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID, state.current.moquiUserId, {
        "topic": getCurrentFacilityId(),
        "topic_op": "contains"
      })
      allNotificationPrefs = resp
    } catch(error) {
      console.error(error)
    }

    commit(types.USER_ALL_NOTIFICATION_PREFS_UPDATED, allNotificationPrefs)
  },

  /**
   * Fetches the user's notification preferences and updates the state with the results.
   * This action retrieves notification enumeration IDs and user preference type IDs,
   * then constructs a list of notification preferences indicating whether each is enabled.
   */
  async fetchNotificationPreferences({ commit, state }) {
    let resp = {} as any
    let notificationPreferences = [], enumerationResp = [], userPrefIds = [] as any

    try {
      resp = await NotificationService.getNotificationEnumIds(process.env.VUE_APP_NOTIF_ENUM_TYPE_ID)
      enumerationResp = resp
      resp = await NotificationService.getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID, state.current.moquiUserId, {
        "topic": getCurrentFacilityId(),
        "topic_op": "contains"
      })
      userPrefIds = resp.map((userPref: any) => userPref.topic)
    } catch (error) {
      console.error(error)
    } finally {
      // checking enumerationResp as we want to show disbaled prefs if only getNotificationEnumIds returns
      // data and getNotificationUserPrefTypeIds fails or returns empty response (all disbaled)
      if (enumerationResp?.length) {
        notificationPreferences = enumerationResp.reduce((notificationPref: any, pref: any) => {
          const userPrefTypeIdToSearch = generateTopicName(getCurrentFacilityId(), pref.enumId)
          notificationPref.push({ ...pref, isEnabled: userPrefIds.includes(userPrefTypeIdToSearch) })
          return notificationPref
        }, [])
      }
      commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, notificationPreferences)
    }
  },

  async updateNotificationPreferences({ commit }, payload) {
    commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, payload)
  },

  clearNotificationState({ commit }) {
    commit(types.USER_NOTIFICATIONS_UPDATED, [])
    commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, [])
    commit(types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED, true)
  },

  clearDeviceId({ commit }) {
    commit(types.USER_FIREBASE_DEVICEID_UPDATED, '')
  },

  setUnreadNotificationsStatus({ commit }, payload) {
    commit(types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED, payload)
  },
}

export default actions;