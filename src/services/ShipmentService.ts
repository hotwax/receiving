import api from '@/api';

const fetchShipments = async (query: any): Promise <any>  => {
  return api({
    url: "incoming-shipments", 
    method: "post",
    data: query,
    cache: true
  });
}

const getShipmentProduct= async (query: any): Promise<any> => {
  return api({
    url: "shipment-detail",
    data: query,
    method: 'post'
  });
}

const receiveShipmentItems = async (query: any): Promise <any> => {
  return api({
    url: "receiveShipmentItem",
    method: "post",
    data: query
  });
}

const updateShipments = async (query: any): Promise <any> => {
  return api({
    url: "updateShipment",
    method: "post",
    data: query
  })
}

const addShipmentItem= async (payload: any): Promise<any> => {
  return api({
    url: "shipment-detail",
    data: payload,
    method: 'post'
  });
}

export const ShipmentService = {
  fetchShipments,
  getShipmentProduct,
  receiveShipmentItems,
  updateShipments,
  addShipmentItem
}