import { GetterTree } from "vuex";
import OrderState from "./OrderState";
import RootState from "../../RootState";

const getters: GetterTree<OrderState, RootState> = {
  getPurchaseOrders(state) {
    return state.purchaseOrders.list;
  },
  isScrollable(state) {
    return state.purchaseOrders.list.length > 0 && state.purchaseOrders.list.length < state.purchaseOrders.total
  },
  getCurrent(state) {
    return state.current
  }
};
export default getters;