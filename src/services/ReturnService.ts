import api from '@/api';

const fetchReturns = async (query: any): Promise <any>  => {
  return api({
    url: "incoming-returns", 
    method: "post",
    data: query,
    cache: true
  });
}

const getReturnDetail= async (query: any): Promise<any> => {
  return api({
    url: "return-detail",
    data: query,
    method: 'post'
  });
}

const receiveReturnItem = async (payload: any): Promise <any> => {
  return api({
    url: "receiveReturnItem",
    method: "post",
    data: payload
  });
}

const receiveReturn = async (query: any): Promise <any> => {
  return api({
    url: "receiveReturn",
    method: "post",
    data: query
  })
}

const addReturnItem = async (query: any): Promise <any> =>{
  return api({
    url: "addReturnItem",
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