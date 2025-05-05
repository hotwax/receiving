import { GetterTree } from "vuex";
import TransferOrderState from "./TransferOrderState";
import RootState from "../../RootState";

const getters: GetterTree<TransferOrderState, RootState> = {
  getTransferOrders (state) {
    return state.transferOrder;
  },
  getCurrent (state) {
    return state.current
  },
  getTOItemShipped: (state) => (productId: string) => {
    return state.current.toHistory?.items?.filter((item: any) => {
      return item.productId === productId;
    }).reduce((sum: any, item: any) => {
      return sum + item.quantity;
    }, 0);
  },
  getCurrentShipment (state) {
    return state.shipment.current
  },
  getRejectReasons(state) {
    return state.rejectReasons;
  }
};
export default getters;