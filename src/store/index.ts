import { createStore, useStore as useVuexStore } from "vuex"
import mutations  from './mutations'
import getters  from './getters'
import actions from './actions'
import RootState from './RootState'
import createPersistedState from "vuex-persistedstate";
import userModule from './modules/user';
import orderModule from './modules/order'
import shipmentModule from "./modules/shipment"
import productModule from "./modules/product"
import utilModule from "./modules/util"
import returnModule from "./modules/return"
import partyModule from './modules/party'


// TODO check how to register it from the components only
// Handle same module registering multiple time on page refresh
//store.registerModule('user', userModule);


const state: any = {

}

const persistState = createPersistedState({
    paths: ['user', 'return.validStatusChange', 'util.productIdentifications'],
    fetchBeforeUse: true
})

// Added modules here so that hydration takes place before routing
const store = createStore<RootState>({
    state,
    actions,
    mutations,
    getters,
    plugins: [ persistState ],
    modules: { 
        'user': userModule,
        'order': orderModule,
        'product': productModule,
        'return': returnModule,
        'shipment': shipmentModule,
        'util': utilModule,
        'party': partyModule
    },
})

export default store
export function useStore(): typeof store {
    return useVuexStore()
}