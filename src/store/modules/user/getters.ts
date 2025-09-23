import { GetterTree } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const getters: GetterTree <UserState, RootState> = {
    isAuthenticated (state) {
        return !!state.token;
    },
    isUserAuthenticated(state) {
        return state.token && state.current
    },
    getBaseUrl (state) {
        let baseURL = process.env.VUE_APP_BASE_URL;
        if (!baseURL) baseURL = state.instanceUrl;
        return baseURL.startsWith('http') ? baseURL.includes('/api') ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`;
    },
    getUserToken (state) {
        return state.token
    },
    getUserProfile (state) {
        return state.current
    },
    getInstanceUrl (state) {
        const baseUrl = process.env.VUE_APP_BASE_URL;
        return baseUrl ? baseUrl : state.instanceUrl;
    },
    getUserPermissions (state) {
        return state.permissions;
    },
    getCurrentProductStore(state) {
        return state.currentProductStore
    },
    getFacilityLocationsByFacilityId: (state) => (facilityId: string) => {
        return state.facilityLocationsByFacilityId[facilityId];
    },
    getPwaState(state) {
        return state.pwaState;
    },
    getMaargBaseUrl (state) {
        const url = state.omsRedirectionInfo.url
        return url.startsWith('http') ? url.includes('/rest/s1/') ? url : `${url}/rest/s1/` : `https://${url}.hotwax.io/rest/s1/`;
    },
    getOmsRedirectionInfo(state) {
        return state.omsRedirectionInfo
    },
}
export default getters;