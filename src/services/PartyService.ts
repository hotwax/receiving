import { api } from '@/adapter';

const getReceiversDetails = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

export const PartyService = {
  getReceiversDetails
}