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


export const ShipmentService = {
  fetchShipments,
  getShipmentProduct,
  receiveShipmentItems,
  updateShipments
}