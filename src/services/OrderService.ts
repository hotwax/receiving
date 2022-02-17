import api from '@/api';

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

const fetchPOHistory = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "POST",
    data: payload
  })
}

export const OrderService = {
  fetchPurchaseOrders,
  fetchPODetail,
  fetchPOHistory
}