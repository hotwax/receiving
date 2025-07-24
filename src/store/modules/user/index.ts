import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const userModule: Module<UserState, RootState> = {
    namespaced: true,
    state: {
      token: '',
      current: {},
      currentEComStore: {},
      permissions: [],
      instanceUrl: '',
      facilityLocationsByFacilityId: {},
      pwaState: {
        updateExists: false,
        registration: null,
      },
      omsRedirectionInfo: {
         url: "",
         token: ""
      },
      isExternal: false
    },
    getters,
    actions,
    mutations,
}

// TODO
// store.registerModule('user', userModule);
export default userModule;