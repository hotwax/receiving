import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { Settings } from 'luxon';
import { getUserFacilities, logout, updateInstanceUrl, updateToken, resetConfig } from '@/adapter'
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions
} from '@/authorization'
import { translate, useAuthStore, useProductIdentificationStore } from '@hotwax/dxp-components'
import emitter from '@/event-bus'
import store from '@/store'

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch }, payload) {
    try {
      const {token, oms} = payload;
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

      //fetching user facilities
      const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_RECVG_ADMIN");
      const baseURL = store.getters['user/getBaseUrl'];
      const facilities = await getUserFacilities(token, baseURL, userProfile?.partyId, "", isAdminUser);

      if (!facilities.length) throw 'Unable to login. User is not assocaited with any facility'

      userProfile.facilities = facilities

      // Getting unique facilities
      userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
        if(uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1);
        else uniqueFacilities.push(facility.facilityId);
        return uniqueFacilities
      }, []);

      const currentFacility = userProfile.facilities[0];
      const currentEComStore = await UserService.getEComStores(token, currentFacility.facilityId);

      const productStoreId = currentEComStore?.productStoreId;

      await useProductIdentificationStore().getIdentificationPref(productStoreId)
        .catch((error) => console.error(error));

      setPermissions(appPermissions);
      if (userProfile.userTimeZone) {
        Settings.defaultZone = userProfile.userTimeZone;
      }
      updateToken(token)

      // TODO user single mutation
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_CURRENT_FACILITY_UPDATED, currentFacility);
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, currentEComStore);
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: token })
      // Get facility location of selected facility
      dispatch('getFacilityLocations', currentFacility.facilityId);
      // TODO: fetch product identifications from enumeration instead of storing it in env
      this.dispatch('util/getForceScanSetting', currentEComStore?.productStoreId);
      this.dispatch('util/getBarcodeIdentificationPref', currentEComStore?.productStoreId);
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
  async logout ({ commit }, payload) {
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
   *  update current eComStore information
  */
  async setEComStore({ commit, dispatch }, payload) {
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, payload.eComStore);
    await UserService.setUserPreference({
      'userPrefTypeId': 'SELECTED_BRAND',
      'userPrefValue': payload.eComStore.productStoreId
    });
    await useProductIdentificationStore().getIdentificationPref(payload.eComStore.productStoreId);
    this.dispatch('util/getForceScanSetting', payload.ecomStore.productStoreId)
    this.dispatch('util/getBarcodeIdentificationPref', payload.ecomStore.productStoreId)
  },

  /**
   * update current facility information
   */
  async setFacility ({ commit, dispatch }, payload) {
    const eComStore = await UserService.getEComStores(undefined, payload.facility.facilityId);

    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, eComStore);
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
    await dispatch('getFacilityLocations', payload.facility.facilityId)
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
  }
}

export default actions;