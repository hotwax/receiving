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
            commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
            await dispatch('getProfile')
            return resp.data;
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
      if(resp.data.facilities.length > 0) {
        const payload = {
          "inputFields": {
            "facilityId": resp.data.facilities[0].facilityId
          },
          "fieldList": ["locationSeqId", "areaId", "aisleId", "sectionId", "levelId", "positionId"],
          "entityName": "FacilityLocation",
          "distinct": "Y",
          "noConditionFind": "Y"
        }
        await dispatch('getFacilityLocations', payload).then((locations: any) => {
          resp.data.facilityLocations = locations;
        })
      }

      commit(types.USER_INFO_UPDATED, resp.data);
      commit(types.USER_CURRENT_FACILITY_LOCATION_UPDATED, resp.data.facilityLocations.length > 0 ? resp.data.facilityLocations[0] : {});
      commit(types.USER_CURRENT_FACILITY_UPDATED, resp.data.facilities.length > 0 ? resp.data.facilities[0] : {});
    }
  },

  /**
   * update current facility information
   */
  async setFacility ({ state, commit, dispatch }, payload) {
    const user = state.current as any;
    
    const param = {
      "inputFields": {
        "facilityId": payload.facility.facilityId
      },
      "viewSize": 20,
      "fieldList": ["locationSeqId", "areaId", "aisleId", "sectionId", "levelId", "positionId"],
      "entityName": "FacilityLocation",
      "distinct": "Y",
      "noConditionFind": "Y"
    }

    await dispatch('getFacilityLocations', param).then((locations: any) => {
      user.facilityLocations = locations
    })

    commit(types.USER_INFO_UPDATED, user);
    commit(types.USER_CURRENT_FACILITY_LOCATION_UPDATED, user.facilityLocations.length > 0 ? user.facilityLocations[0] : {});
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
  },

  async setFacilityLocation({ commit }, payload) {
    commit(types.USER_CURRENT_FACILITY_LOCATION_UPDATED, payload.facilityLocation);
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

  async getFacilityLocations( { commit },payload ) {
    let resp;
    try{
      resp = await UserService.getFacilityLocations(payload);
      if(resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        let facilityLocations = resp.data.docs
        facilityLocations = facilityLocations.map((location: any) => {
          return {
            locationSeqId: location.locationSeqId,
            locationPath: location.areaId + location.aisleId + location.sectionId + location.levelId + location.positionId
          }
        })

        return facilityLocations;
      } else {
        console.error(resp);
      }
    } catch(err) {
      console.error(err);
    }
    return []
  }
}

export default actions;