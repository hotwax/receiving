import api from '@/api';

const fetchPurchaseOrders = async (payload: any): Promise <any>  => {
  return api({
    url: "/solr-query", 
    method: "POST",
    data: payload
  });
}

export const OrderService = {
  fetchPurchaseOrders
}