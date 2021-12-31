import api from '@/api';

const fetchPurchaseOrders = async (payload: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "/solr-query", 
    method: "POST",
    data: payload
  });
}

const fetchPODetails = async (query: any): Promise <any> => {
  return api({
    url: "purchase-orders/13150",
    method: "GET",
    data: query
  })
}

export const PurchaseOrdersService = {
  fetchPurchaseOrders
}