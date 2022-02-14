import { GetterTree } from "vuex";
import OrderState from "./OrderState";
import RootState from "../../RootState";

const getters: GetterTree<OrderState, RootState> = {
  getPurchaseOrders(state) {
    return state.purchaseOrders.list;
  },
  isScrolleable(state) {
    return state.purchaseOrders.list.length > 0 && state.purchaseOrders.list.length < state.purchaseOrders.total
  }
};
export default getters;