import api from '@/api';

const fetchProducts = async (query: any): Promise <any>  => {
  return api({
    url: "incoming-shipments", 
    method: "post",
    data: query,
    cache: true
  });
}

const getShipmentProduct= async (query: any): Promise<any> => {
  return api({
    url: `shipment-detail`,
    data: query,
    method: 'post'
  });
}

export const ProductService = {
  fetchProducts,
  getShipmentProduct
}