import api from '@/api';

const fetchProducts = async (query: any): Promise<any> => {
  return api({
    url: "searchProducts",
    method: "post",
    data: query,
    cache: true
  });
}
const findProducts = async (query: any): Promise<any> => {
  return api({
    url: "searchProducts",
    method: "post",
    data: query
  })
}

export const ProductService = {
  fetchProducts,
  findProducts
}