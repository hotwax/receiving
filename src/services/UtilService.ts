import { api } from '@/adapter';

const fetchStatus = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: payload
  })
}

const updateForceScanSetting = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreSetting",
    method: "post",
    data: payload
  });
}

const createForceScanSetting = async (payload: any): Promise<any> => {
  return api({
    url: "service/createProductStoreSetting",
    method: "post",
    data: payload
  });
}

const getProductStoreSetting = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

export const UtilService = {
  createForceScanSetting,
  fetchStatus,
  getProductStoreSetting,
  updateForceScanSetting
}