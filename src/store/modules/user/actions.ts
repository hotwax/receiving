import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import moment from 'moment';
import emitter from '@/event-bus'
import "moment-timezone";

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch }, { username, password }) {
    try {
      const resp = await UserService.login(username, password)
      if (resp.status === 200 && resp.data) {
        if (resp.data.token) {
          const permissionId = process.env.VUE_APP_PERMISSION_ID;
          if (permissionId) {
            const checkPermissionResponse = await UserService.checkPermission({
              data: {
                permissionId
              },
              headers: {
                Authorization:  'Bearer ' + resp.data.token,
                'Content-Type': 'application/json'
              }
            });

            if (checkPermissionResponse.status === 200 && !hasError(checkPermissionResponse) && checkPermissionResponse.data && checkPermissionResponse.data.hasPermission) {
              commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
              dispatch('getProfile')
              if (resp.data._EVENT_MESSAGE_ && resp.data._EVENT_MESSAGE_.startsWith("Alert:")) {
              // TODO Internationalise text
                showToast(translate(resp.data._EVENT_MESSAGE_));
              }
              return resp.data;
            } else {
              const permissionError = 'You do not have permission to access the app.';
              showToast(translate(permissionError));
              console.error("error", permissionError);
              return Promise.reject(new Error(permissionError));
            }
          } else {
            commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
            await dispatch('getProfile')
            return resp.data;
          }
        } else if (hasError(resp)) {
          showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
          console.error("error", resp.data._ERROR_MESSAGE_);
          return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
        }
      } else {
        showToast(translate('Something went wrong'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }
    } catch (err) {
      showToast(translate('Something went wrong'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
    // return resp
  },

  /**
   * Logout user
   */
  async logout ({ commit }) {
    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    
  },

  /**
   * Get User profile
   */
  async getProfile ( { commit, dispatch }) {
    const resp = await UserService.getProfile()
    if (resp.status === 200) {
      const localTimeZone = moment.tz.guess();
      if (resp.data.userTimeZone !== localTimeZone) {
        emitter.emit('timeZoneDifferent', { profileTimeZone: resp.data.userTimeZone, localTimeZone});
      }

      commit(types.USER_INFO_UPDATED, resp.data);
      if (resp.data.facilities.length > 0) {
        await dispatch('getEComStores', { facilityId: resp.data.facilities[0].facilityId })
      }
      // TODO: fetch product identifications from enumeration instead of storing it in env
      this.dispatch('util/setProductIdentifications', process.env.VUE_APP_PRDT_IDENT ? JSON.parse(process.env.VUE_APP_PRDT_IDENT) : [])
      commit(types.USER_CURRENT_FACILITY_UPDATED, resp.data.facilities.length > 0 ? resp.data.facilities[0] : {});
      // TODO: Need to remove this check once adding support to not allow user login without facilities.
      if(resp.data.facilities.length > 0) dispatch('getFacilityLocations', resp.data.facilities[0].facilityId)
    }
    return resp;
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
    await dispatch('getProductIdentificationPref', payload.eComStore.productStoreId);
  },

  /**
   * update current facility information
   */
  async setFacility ({ commit, dispatch }, payload) {
    const facilityLocations = await dispatch('getFacilityLocations', payload.facility.facilityId)
    await dispatch("getEComStores", { facilityId: payload.facility.facilityId });
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
  },
  
  /**
   * Update user timeZone
   */
  async setUserTimeZone ( { state, commit }, payload) {
    const resp = await UserService.setUserTimeZone(payload)
    if (resp.status === 200 && !hasError(resp)) {
      const current: any = state.current;
      current.userTimeZone = payload.tzId;
      commit(types.USER_INFO_UPDATED, current);
      showToast(translate("Time zone updated successfully"));
    }
  },

  // Set User Instance Url
  setUserInstanceUrl ({ commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
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
     
  async getEComStores({ state, commit, dispatch }, payload) {
    let resp;

    try {
      const param = {
        "inputFields": {
          "facilityId": payload.facilityId,
          "storeName_op": "not-empty"
        },
        "fieldList": ["productStoreId", "storeName"],
        "entityName": "ProductStore",
        "distinct": "Y",
        "noConditionFind": "Y"
      }

      resp = await UserService.getEComStores(param);
      if(resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0) {
        const user = state.current as any;
        user.stores = [{
          productStoreId: '',
          storeName: 'None'
        }, ...(resp.data.docs ? resp.data.docs : [])]

        let userPrefStore = ''

        try {
          const userPref =  await UserService.getUserPreference({
           'userPrefTypeId': 'SELECTED_BRAND'
          });
          userPrefStore = user.stores.find((store: any) => store.productStoreId == userPref.data.userPrefValue)
        } catch (err) {
          console.error(err)
        }

        dispatch('setEComStore', { eComStore: userPrefStore ? userPrefStore : user.stores.length > 0 ? user.stores[0] : {} });
        commit(types.USER_INFO_UPDATED, user);
        return user.stores
      } else {
        console.error(resp);
      }
    } catch(error) {
      console.error(error);
    }
    return []
  },

  async setProductIdentificationPref({ commit, state }, payload) {
    let prefValue = JSON.parse(JSON.stringify(state.productIdentificationPref))

    // when selecting none as ecom store, not updating the pref as it's not possible to store pref with empty productStoreId
    if(!(state.currentEComStore as any).productStoreId) {
      commit(types.USER_PREF_PRODUCT_IDENT_CHANGED, prefValue)
      return;
    }

    prefValue[payload.id] = payload.value

    const params = {
      "fromDate": prefValue.fromDate,
      "productStoreId": (state.currentEComStore as any).productStoreId,
      "settingTypeEnumId": "PRODUCT_STORE_PREF",
      "settingValue": JSON.stringify({'primaryId': prefValue.primaryId,'secondaryId': prefValue.secondaryId})
    }

    try {
      const resp = await UserService.updateProductStoreSetting(params) as any

      if(resp.status == 200) {
        showToast(translate('Product Identifier preference updated successfully'))
      } else {
        showToast(translate('Failed to update Product Identifier preference'))
        prefValue = JSON.parse(JSON.stringify(state.productIdentificationPref))
      }
    } catch(err) {
      showToast(translate('Failed to update Product Identifier preference'))
      prefValue = JSON.parse(JSON.stringify(state.productIdentificationPref))
      console.error(err)
    }
    commit(types.USER_PREF_PRODUCT_IDENT_CHANGED, prefValue)
  },

  async createProductIdentificationPref({ commit, state }, payload) {
    const params = {
      "fromDate": payload.fromDate,
      "productStoreId": (state.currentEComStore as any).productStoreId,
      "settingTypeEnumId": "PRODUCT_STORE_PREF",
      "settingValue": JSON.stringify({'primaryId': payload.primaryId,'secondaryId': payload.secondaryId})
    }

    try {
      const resp = await UserService.createProductStoreSetting(params) as any

      if(resp.status == 200) {
        commit(types.USER_PREF_PRODUCT_IDENT_CHANGED, payload)
      } else {
        commit(types.USER_PREF_PRODUCT_IDENT_CHANGED, JSON.parse(JSON.stringify(state.productIdentificationPref)))
      }
    } catch(err) {
      console.error(err)
    }
  },

  async getProductIdentificationPref({ commit, dispatch }, eComStoreId) {
    const value = {
      primaryId: 'productId',
      secondaryId: '',
      fromDate: Date.now()
    }

    // when selecting none as ecom store, not fetching the pref as it returns all the entries with the pref id
    if(!eComStoreId) {
      commit(types.USER_PREF_PRODUCT_IDENT_CHANGED, value)
      return;
    }

    const payload = {
      "inputFields": {
        "productStoreId": eComStoreId,
        "settingTypeEnumId": "PRODUCT_STORE_PREF"
      },
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingValue", "fromDate"],
      "viewSize": 1
    }

    try {
      const resp = await UserService.getProductStoreSetting(payload) as any
      if(resp.status == 200 && resp.data.count > 0) {
        const respValue = JSON.parse(resp.data.docs[0].settingValue)

        value.primaryId = respValue['primaryId'] ?? 'productId'
        value.secondaryId = respValue['secondaryId'] ?? ''
        value.fromDate = resp.data.docs[0].fromDate
        commit(types.USER_PREF_PRODUCT_IDENT_CHANGED, value)
      } else if(resp.status == 200 && resp.data.error) {
        dispatch('createProductIdentificationPref', value)
      }
    } catch(err) {
      console.error(err)
    }
  }
}

export default actions;