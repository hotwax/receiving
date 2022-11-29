import { MutationTree } from 'vuex'
import UserState from './UserState'
import * as types from './mutation-types'

const mutations: MutationTree <UserState> = {
    [types.USER_TOKEN_CHANGED] (state, payload) {
        state.token = payload.newToken
    },
    [types.USER_END_SESSION] (state) {
      state.token = ''
      state.current = null
      state.currentFacility = {},
      state.facilityLocationsByFacilityId = {}
    },
    [types.USER_INFO_UPDATED] (state, payload) {
        state.current = payload
    },
    [types.USER_CURRENT_FACILITY_UPDATED] (state, payload) {
        state.currentFacility = payload;
    },
    [types.USER_INSTANCE_URL_UPDATED] (state, payload) {
        state.instanceUrl = payload;
    },
    [types.USER_CURRENT_ECOM_STORE_UPDATED](state, payload) {
        state.currentEComStore = payload;
    },
    [types.USER_FACILITY_LOCATIONS_BY_FACILITY_ID] (state, payload) {
        state.facilityLocationsByFacilityId[payload.facilityId] = payload.facilityLocations;
    },
    [types.USER_PREF_PRODUCT_IDENT_UPDATED](state, payload) {
        state.productIdentificationPref[payload.id] = payload.value
    },
    [types.USER_PREF_PRODUCT_IDENT_CHANGED](state, payload) {
        state.productIdentificationPref = payload
    }
}
export default mutations;