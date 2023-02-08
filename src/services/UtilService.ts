import { api } from '@/adapter';

const fetchStatus = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: payload
  })
}

export const UtilService = {
  fetchStatus
}