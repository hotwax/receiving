import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import * as types from './mutation-types'
import { hasError } from '@/utils'
import UtilState from './UtilState'
import { UtilService } from '@/services/UtilService'

const actions: ActionTree<UtilState, RootState> = {

  async fetchStatus({ state, commit }, statusIds) {
    let resp;

    const cachedStatus = JSON.parse(JSON.stringify(state.status));
    const statusIdFilter = statusIds.reduce((filter: Array<string>, statusId: any) => {
      if (!cachedStatus[statusId]) {
        filter.push(statusId)
      }
      return filter;
    }, []);

    if (statusIdFilter.length <= 0) return cachedStatus;

    try {
      resp = await UtilService.fetchStatus({
        "entityName": "StatusItem",
        "noConditionFind": "Y",
        "distinct": "Y",
        "viewSize": statusIdFilter.length,
        "inputFields": {
          "statusId": statusIdFilter,
          "statusId_op": "in"
        },
        "fieldList": ["statusId", "description"],
      })
      if (resp.status === 200 && !hasError(resp) && resp.data?.count) {
        const statuses = resp.data.docs;
        statuses.reduce((cachedStatus: any, status: any) => {
          cachedStatus[status.statusId] = status.description;
          return cachedStatus;
        }, cachedStatus)
        commit(types.UTIL_STATUS_UPDATED, cachedStatus)
      }
    } catch(err) {
      console.error('Something went wrong while fetching status for shipments')
    }
    return cachedStatus;
  },
  async setProductIdentifications({ commit }, payload) {
    commit(types.UTIL_PRODUCT_IDENT_UPDATED, payload)
  }
}

export default actions;