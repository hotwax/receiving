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
  },
  isProductAvailableInOrder: (state, getters, rootState, rootGetters) => (productId: string) => {
    return rootGetters['order/getCurrent'].items.some((item: any) => item.productId === productId);
  }
};
export default getters;