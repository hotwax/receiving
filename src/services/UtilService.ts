import { api, hasError } from '@/adapter';

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

const updateBarcodeIdentificationPref = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreSetting",
    method: "post",
    data: payload
  });
}

const createBarcodeIdentificationPref = async (payload: any): Promise<any> => {
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

const isEnumExists = async (enumId: string): Promise<any> => {
  try {
    const resp = await api({
      url: 'performFind',
      method: 'POST',
      data: {
        entityName: "Enumeration",
        inputFields: {
          enumId
        },
        viewSize: 1,
        fieldList: ["enumId"],
        noConditionFind: 'Y'
      }
    }) as any

    if (!hasError(resp) && resp.data.docs.length) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

const createEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: "service/createEnumeration",
    method: "post",
    data: payload
  })
}

const updateReceiveByFulfillmentSetting = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreSetting",
    method: "post",
    data: payload
  });
}

export const UtilService = {
  createBarcodeIdentificationPref,
  createEnumeration,
  createForceScanSetting,
  fetchStatus,
  getProductStoreSetting,
  isEnumExists,
  updateBarcodeIdentificationPref,
  updateForceScanSetting,
  updateReceiveByFulfillmentSetting
}