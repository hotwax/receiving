import api, {client} from '@/api'
import store from '@/store';
const login = async (username: string, password: string): Promise <any> => {
  return api({
    url: "login", 
    method: "post",
    data: {
      'USERNAME': username, 
      'PASSWORD': password
    }
  });
}

const checkPermission = async (payload: any): Promise <any>  => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: "checkPermission",
    method: "post",
    baseURL: baseURL,
    ...payload
  });
}

const getProfile = async (): Promise <any>  => {
    return api({
      url: "user-profile", 
      method: "get",
    });
}
const getAvailableTimeZones = async (): Promise <any>  => {
  return api({
    url: "getAvailableTimeZones",
    method: "get",
    cache: true
  });
}
const setUserTimeZone = async (payload: any): Promise <any>  => {
  return api({
    url: "setUserTimeZone",
    method: "post",
    data: payload
  });
}

const getFacilityLocations = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "POST",
    data: payload
  })
}
  
const getEComStores = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const setUserPreference = async (payload: any): Promise<any> => {
  return api({
    url: "service/setUserPreference",
    method: "post",
    data: payload
  });
}

const getUserPreference = async (payload: any): Promise<any> => {
  return api({
    url: "service/getUserPreference",
    //TODO Due to security reasons service model OMS 1.0 does not support sending parameters in get request that's why we use post here
    method: "post",
    data: payload
  });
}

const updateProductIdentificationPref = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreSetting",
    method: "post",
    data: payload
  });
}

const createProductIdentificationPref = async (payload: any): Promise<any> => {
  return api({
    url: "service/createProductStoreSetting",
    method: "post",
    data: payload
  });
}

const getProductIdentificationPref = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    //TODO Due to security reasons service model OMS 1.0 does not support sending parameters in get request that's why we use post here
    method: "post",
    data: payload,
    cache: true
  });
}

export const UserService = {
    login,
    getAvailableTimeZones,
    getProfile,
    setUserTimeZone,
    getFacilityLocations,
    getEComStores,
    getProductIdentificationPref,
    createProductIdentificationPref,
    updateProductIdentificationPref,
    setUserPreference,
    getUserPreference,
    checkPermission
}