import { api, client, hasError } from "@/adapter";
import store from "@/store";
import { getCurrentFacilityId } from "@/utils";
import { translate } from "@hotwax/dxp-components";
import { showToast } from "@/utils";

const fetchTransferOrders = async (): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];


  return client({
    url: `oms/transferOrders/?orderStatusId=ORDER_APPROVED&destinationFacilityId=${getCurrentFacilityId()}`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}

export const TransferOrderService = {
  fetchTransferOrders
};
