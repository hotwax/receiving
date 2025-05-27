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
  getTOHistory(state) {
    return state.current.toHistory;
  },
  isProductAvailableInOrder: (state) => (productId: string) => {
    return state.current.items.some((item: any) => item.productId === productId);
  }
};
export default getters;
