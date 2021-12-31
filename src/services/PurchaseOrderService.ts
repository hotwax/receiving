import api from '@/api';

const fetchPurchaseOrders = async (payload: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "/solr-query", 
    method: "POST",
    data: payload
  });
}

const fetchPODetails = async (payload: any): Promise <any> => {
  return api({
    url: "/solr-query",
    method: "POST",
    data: payload
  })
}

export const PurchaseOrdersService = {
  fetchPurchaseOrders,
  fetchPODetails
}