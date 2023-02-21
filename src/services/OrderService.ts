import { api } from '@/adapter';

const fetchPurchaseOrders = async (payload: any): Promise <any>  => {
  return api({
    url: "/solr-query", 
    method: "POST",
    data: payload
  });
}

const fetchPODetail = async (payload: any): Promise<any> => {
  return api({
    url: "/solr-query",
    method: "POST",
    data: payload
  })
}

const createPurchaseShipment = async (payload: any): Promise<any> => {
  return api({
    url: "/service/createPurchaseShipment",
    method: "POST",
    data: payload
  })
}

const fetchPOHistory = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "POST",
    data: payload
  })
}

const getReceiversDetails = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

export const OrderService = {
  fetchPurchaseOrders,
  fetchPODetail,
  createPurchaseShipment,
  fetchPOHistory,
  getReceiversDetails
}