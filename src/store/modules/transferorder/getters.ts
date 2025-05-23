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
  isProductAvailableInOrder: (state, getters, rootState, rootGetters) => (productId: string) => {
    return rootGetters['transferorder/getCurrent'].items.some((item: any) => item.productId === productId);
  },
};
export default getters;