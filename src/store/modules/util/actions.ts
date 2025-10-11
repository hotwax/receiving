import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import UtilState from './UtilState'
import { UtilService } from '@/services/UtilService'
import store from '@/store';
import { translate } from '@hotwax/dxp-components'

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

  async getForceScanSetting({ commit, dispatch }, productStoreId) {
    const payload = {
      "inputFields": {
        "productStoreId": productStoreId,
        "settingTypeEnumId": "RECEIVE_FORCE_SCAN"
      },
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingValue", "settingTypeEnumId"],
      "viewSize": 1
    }

    try {
      const resp = await UtilService.getProductStoreSetting(payload) as any
      if(!hasError(resp)) {
        const respValue = resp.data.docs[0].settingValue
        commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, respValue === "true")
      } else {
        dispatch('createForceScanSetting');
      }
    } catch(err) {
      console.error(err)
      commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, "false")
    }
  },

  async createForceScanSetting({ commit }) {
    const productStore = store.getters['user/getCurrentProductStore'];
    let isSettingExists = false;

    try {
      if(!await UtilService.isEnumExists("RECEIVE_FORCE_SCAN")) {
        const resp = await UtilService.createEnumeration({
          "enumId": "RECEIVE_FORCE_SCAN",
          "enumTypeId": "PROD_STR_STNG",
          "description": "Impose force scanning of items while packing from receiving app",
          "enumName": "Receiving Force Scan",
          "enumCode": "RECEIVE_FORCE_SCAN"
        })

        if(hasError(resp)) {
          throw resp.data;
        }
      }

      const params = {
        "productStoreId": productStore.productStoreId,
        "settingTypeEnumId": "RECEIVE_FORCE_SCAN",
        "settingValue": "false"
      }

      await UtilService.createForceScanSetting(params) as any
      isSettingExists = true
    } catch(err) {
      console.error(err)
    }

    // not checking for resp success and fail case as every time we need to update the state with the
    // default value when creating a scan setting
    commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, false)
    return isSettingExists;
  },

  async setForceScanSetting({ commit, dispatch, state }, value) {
    let prefValue = state.isForceScanEnabled
    const productStoreId = store.getters['user/getCurrentProductStore'].productStoreId;

    // when selecting none as ecom store, not updating the pref as it's not possible to save pref with empty productStoreId
    if(!productStoreId) {
      showToast(translate("Unable to update force scan preference since no product store config found."))
      commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, prefValue)
      return;
    }

    let isSettingExists = false;

    try {
      const resp = await UtilService.getProductStoreSetting({
        "inputFields": {
          "productStoreId": productStoreId,
          "settingTypeEnumId": "RECEIVE_FORCE_SCAN"
        },
        "entityName": "ProductStoreSetting",
        "fieldList": ["settingTypeEnumId"],
        "viewSize": 1
      }) as any
      if(!hasError(resp) && resp.data.docs[0]?.settingTypeEnumId) {
        isSettingExists = true;
      }
    } catch(err) {
      console.error(err)
    }

    if(!isSettingExists) {
      isSettingExists = await dispatch("createForceScanSetting");
    }

    if(!isSettingExists) {
      showToast(translate("Failed to update force scan preference."))
      commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, prefValue)
      return;
    }

    const params = {
      "productStoreId": productStoreId,
      "settingTypeEnumId": "RECEIVE_FORCE_SCAN",
      "settingValue": `${value}`
    }

    try {
      const resp = await UtilService.updateForceScanSetting(params) as any

      if((!hasError(resp))) {
        showToast(translate("Force scan preference updated successfully."))
        prefValue = value
      } else {
        throw resp.data;
      }
    } catch(err) {
      showToast(translate("Failed to update force scan preference."))
      console.error(err)
    }
    commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, prefValue)
  },

  async getBarcodeIdentificationPref({ commit, dispatch }, productStoreId) {
    const payload = {
      "inputFields": {
        "productStoreId": productStoreId,
        "settingTypeEnumId": "BARCODE_IDEN_PREF"
      },
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingValue", "settingTypeEnumId"],
      "viewSize": 1
    }

    try {
      const resp = await UtilService.getProductStoreSetting(payload) as any
      if(!hasError(resp)) {
        const respValue = resp.data.docs[0].settingValue
        commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, respValue)
      } else {
        dispatch("cretaBarcodeIdentificationPref");
      }
    } catch(err) {
      console.error(err)
      commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, "internalName")
    }
  },

  async cretaBarcodeIdentificationPref({ commit }) {
    const productStore = store.getters['user/getCurrentProductStore'];
    let isSettingExists = false

    try {
      if(!await UtilService.isEnumExists("BARCODE_IDEN_PREF")) {
        const resp = await UtilService.createEnumeration({
          "enumId": "BARCODE_IDEN_PREF",
          "enumTypeId": "PROD_STR_STNG",
          "description": "Identification preference to be used for scanning items.",
          "enumName": "Barcode Identification Preference",
          "enumCode": "BARCODE_IDEN_PREF"
        })

        if(hasError(resp)) {
          throw resp.data;
        }
      }

      const params = {
        "productStoreId": productStore.productStoreId,
        "settingTypeEnumId": "BARCODE_IDEN_PREF",
        "settingValue": "internalName"
      }  

      await UtilService.createBarcodeIdentificationPref(params) as any
      isSettingExists = true
    } catch(err) {
      console.error(err)
    }

    // not checking for resp success and fail case as every time we need to update the state with the
    // default value when creating a scan setting
    commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, "internalName")
    return isSettingExists;
  },

  async setBarcodeIdentificationPref({ commit, dispatch, state }, value) {
    let prefValue = state.barcodeIdentificationPref
    const productStoreId = store.getters['user/getCurrentProductStore'].productStoreId;

    // when selecting none as ecom store, not updating the pref as it's not possible to save pref with empty productStoreId
    if(!productStoreId) {
      showToast(translate("Unable to update barcode identification preference since no product store config found."))
      commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, prefValue)
      return;
    }

    let isSettingExists = false;

    try {
      const resp = await UtilService.getProductStoreSetting({
        "inputFields": {
          "productStoreId": productStoreId,
          "settingTypeEnumId": "BARCODE_IDEN_PREF"
        },
        "entityName": "ProductStoreSetting",
        "fieldList": ["settingTypeEnumId"],
        "viewSize": 1
      }) as any
      if(!hasError(resp) && resp.data.docs[0]?.settingTypeEnumId) {
        isSettingExists = true
      }
    } catch(err) {
      console.error(err)
    }

    if(!isSettingExists) {
      isSettingExists = await dispatch("createBarcodeIdentificationPref");
    }

    if(!isSettingExists) {
      showToast(translate("Failed to update barcode identification preference."))
      commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, prefValue)
      return;
    }

    const params = {
      "productStoreId": productStoreId,
      "settingTypeEnumId": "BARCODE_IDEN_PREF",
      "settingValue": value
    }

    try {
      const resp = await UtilService.updateBarcodeIdentificationPref(params) as any

      if((!hasError(resp))) {
        showToast(translate("Barcode identification preference updated successfully."))
        prefValue = value
      } else {
        throw resp.data;
      }
    } catch(err) {
      showToast(translate("Failed to update barcode identification preference."))
      console.error(err)
    }
    commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, prefValue)
  },

  async updateForceScanStatus({ commit }, payload) { 
    commit(types.UTIL_FORCE_SCAN_STATUS_UPDATED, payload)
  },

  async updateBarcodeIdentificationPref({ commit }, payload) { 
    commit(types.UTIL_BARCODE_IDENTIFICATION_PREF_UPDATED, payload)
  }
}

export default actions;