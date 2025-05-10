import { api, client, hasError } from "@/adapter";
import store from "@/store";
import { getCurrentFacilityId } from "@/utils";
import { translate } from "@hotwax/dxp-components";
import { showToast } from "@/utils";

const fetchTransferOrders = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "oms/transferOrders/",
    method: "get",
    baseURL,
    params,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}

export const TransferOrderService = {
  fetchTransferOrders
};
