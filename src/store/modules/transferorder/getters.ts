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
  getTOItemAccepted: (state) => (productId: string) => {
    return state.current.items?.filter((item: any) => item.productId === productId)
      .reduce((sum: number, item: any) => sum + (Number(item.totalReceivedQuantity) || 0), 0);
  }
};
export default getters;