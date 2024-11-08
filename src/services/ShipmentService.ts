import { api, hasError } from '@/adapter';

const fetchShipments = async (query: any): Promise <any>  => {
  return api({
    url: "/performFind",
    method: "post",
    data: query,
    cache: true
  });
}

const getShipmentDetail= async (query: any): Promise<any> => {
  return api({
    url: "shipment-detail",
    data: query,
    method: 'post'
  });
}

const receiveShipmentItem = async (payload: any): Promise <any> => {
  return api({
    url: "receiveShipmentItem",
    method: "post",
    data: payload
  });
}

const receiveShipment = async (query: any): Promise <any> => {
  return api({
    url: "receiveShipment",
    method: "post",
    data: query
  })
}

const addShipmentItem = async (query: any): Promise <any> =>{
  return api({
    url: "addShipmentItem",
    method: "post",
    data: query
  })
}

const fetchTrackingCodes = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentTrackingCodes = {};
  const params = {
    "entityName": "ShipmentRouteSegment",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
    },
    "fieldList": ["shipmentId", "trackingIdNumber"],
    "viewSize": 250,  // maximum records we could have
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipmentTrackingCodes = resp?.data.docs.reduce((codes:any, item:any) => (codes[item.shipmentId] = item.trackingIdNumber, codes), {});

    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    console.error('Failed to fetch tracking codes for shipments', err)
  }

  return shipmentTrackingCodes;
}

const fetchShipmentAttributes = async (shipmentIds: Array<string>): Promise<any> => {
  const shipmentAttributes = {} as any;
  const params = {
    "entityName": "ShipmentAttribute",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
    },
    "fieldList": ["shipmentId", "attrName", "attrValue"],
    "viewSize": 250,  // maximum records we could have
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      resp?.data.docs.forEach((attribute:any) => {
        const { shipmentId, attrName, attrValue } = attribute;
        if (!shipmentAttributes[shipmentId]) {
          shipmentAttributes[shipmentId] = {};
        }
        shipmentAttributes[shipmentId][attrName] = attrValue;
      });

    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    console.error('Failed to fetch shipment attributes', err)
  }

  return shipmentAttributes;
}

const getInventoryAvailableByFacility = async (query: any): Promise <any> => {
  return api({
    url: "service/getInventoryAvailableByFacility",
    method: "post",
    data: query
  });
}

export const ShipmentService = {
  fetchShipments,
  fetchShipmentAttributes,
  fetchTrackingCodes,
  getShipmentDetail,
  receiveShipmentItem,
  receiveShipment,
  addShipmentItem,
  getInventoryAvailableByFacility
}