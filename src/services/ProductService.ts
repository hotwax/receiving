import api from '@/api';

const fetchProducts = async (query: any): Promise <any>  => {
  return api({
    url: "searchProducts", 
    method: "post",
    data: query,
    cache: true
  });
}

const getShipments = async (query: any): Promise<any> => {
  return api({
    url: 'incoming-shipments?', 
    method: 'get',
    data: query,
    cache: true
  });
}

const getShipmentProducts = async (query: any): Promise<any> => {
  return api({
    url: `shipment-details?`,
    method: 'get',
    data: query
  });
}

export const ProductService = {
  fetchProducts,
  getShipments,
  getShipmentProducts
}