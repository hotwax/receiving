import { client } from "@/adapter";
import store from "@/store";

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

const fetchTransferOrderDetail = async (orderId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `oms/transferOrders/${orderId}`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
};

const fetchOrderTrackingDetails = async (orderId: string): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `poorti/transferShipments/packages?orderId=${orderId}`,
    method: "get",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
};

const receiveTransferOrder = async (orderId: string, payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `poorti/transferOrders/${orderId}/receiptsV2`,
    method: "post",
    baseURL,
    data: payload,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
};

const fetchTransferOrderHistory = async (payload: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `poorti/transferOrders/${payload.orderId}/receipts`,
    method: "get",
    baseURL,
    params: payload,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
};
const fetchOutboundShipmentsHistory = async (params: any): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];
  
  return client({
    url: "poorti/transferShipments",
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
  fetchTransferOrders,
  fetchTransferOrderDetail,
  receiveTransferOrder,
  fetchTransferOrderHistory,
  fetchOrderTrackingDetails,
  fetchOutboundShipmentsHistory
};
