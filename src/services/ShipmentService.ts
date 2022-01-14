import api from '@/api';

const fetchShipments = async (query: any): Promise <any>  => {
  return api({
    url: "incoming-shipments", 
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

export const ShipmentService = {
  fetchShipments,
  getShipmentDetail,
  receiveShipmentItem,
  receiveShipment
}