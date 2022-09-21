import api from '@/api';

const fetchReturns = async (query: any): Promise <any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: query,
    cache: true
  });
}

const getReturnDetail = async (query: any): Promise<any> => {
  return api({
    url: "shipment-detail",
    data: query,
    method: 'post'
  });
}

const receiveReturnItem = async (payload: any): Promise <any> => {
  return api({
    url: "receiveShipmentItem",
    method: "post",
    data: payload
  });
}

const receiveReturn = async (query: any): Promise <any> => {
  return api({
    url: "receiveShipment",
    method: "post",
    data: query
  })
}

const addReturnItem = async (query: any): Promise <any> =>{
  return api({
    url: "addShipmentItem",
    method: "post",
    data: query
  })
}

export const ReturnService = {
  fetchReturns,
  getReturnDetail,
  receiveReturnItem,
  receiveReturn,
  addReturnItem
}