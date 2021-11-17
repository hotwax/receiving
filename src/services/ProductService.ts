import api from '@/api';

const getShipments = async (query: any): Promise<any> => {
  return api({
    url: 'incoming-shipments', 
    method: 'get',
    data: query,
    cache: true
  });
}

export const ProductService = {
  getShipments
}