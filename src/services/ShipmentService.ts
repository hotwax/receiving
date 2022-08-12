import api from '@/api';
import { hasError } from '@/utils';

const getShipmentItemCount = async (shipmentIds: any): Promise<any> => {
  let resp;
  try {
    resp = await fetchShipmentItemCount({
      "entityName": "ShipmentItem",
      "noConditionFind": "Y",
      "inputFields": {
        "shipmentId": shipmentIds,
      },
      // Passing viewSize 100, to fetch all shipment items
      //TODO: need to handle this on backend
      "viewSize": 100,
      "fieldList": ["shipmentId", "shipmentItemSeqId"]
    })
    if(resp.status === 200 && !hasError(resp) && resp.data?.docs.length){
      const itemCount = resp.data.docs.reduce((itemCount: any, shipment: any) => {
        itemCount[shipment.shipmentId] ? itemCount[shipment.shipmentId]++ : itemCount[shipment.shipmentId] = 1;
        return itemCount;
      }, {});
      return itemCount;
    } else {
      console.error("Could not fetch shipment item count.")
      return {};
    }
  } catch (err) {
    console.error(err);
    return {};
  }
}

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

const fetchShipmentItemCount = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: payload
  })
}

export const ShipmentService = {
  fetchShipments,
  getShipmentDetail,
  receiveShipmentItem,
  receiveShipment,
  addShipmentItem,
  fetchShipmentItemCount,
  getShipmentItemCount
}