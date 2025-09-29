import { api } from "@/adapter";

const fetchTransferOrders = async (params: any): Promise<any> => {
  return api({
    url: "oms/transferOrders",
    method: "get",
    params,
    systemType: "MOQUI"
  });
}

const fetchTransferOrderDetail = async (orderId: string): Promise<any> => {
  return api({
    url: `oms/transferOrders/${orderId}`,
    method: "get",
    systemType: "MOQUI"
  });
};

const fetchOrderTrackingDetails = async (orderId: string): Promise<any> => {
  return api({
    url: `poorti/transferShipments/packages?orderId=${orderId}`,
    method: "get",
    systemType: "MOQUI"
  });
};

const receiveTransferOrder = async (orderId: string, payload: any): Promise<any> => {
  return api({
    url: `poorti/transferOrders/${orderId}/receipts`,
    method: "post",
    data: payload,
    systemType: "MOQUI"
  });
};

const fetchTransferOrderHistory = async (payload: any): Promise<any> => {
  return api({
    url: `poorti/transferOrders/${payload.orderId}/receipts`,
    method: "get",
    params: payload,
    systemType: "MOQUI"
  });
};

export const TransferOrderService = {
  fetchTransferOrders,
  fetchTransferOrderDetail,
  receiveTransferOrder,
  fetchTransferOrderHistory,
  fetchOrderTrackingDetails
};
