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
  getCurrentShipment (state) {
    return state.shipment.current
  },
  getRejectReasons(state) {
    return state.rejectReasons;
  }
};
export default getters;