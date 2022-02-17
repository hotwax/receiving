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
  },
  getPOHistory(state) {
    return state.current.poHistory;
  },
  getPOItemAccepted: (state) => (productId: string) => {
    return state.current.poHistory.items.filter((item: any) => {
      return item.productId === productId;
    }).reduce((sum: any, item: any) => {
      return sum + item.quantityAccepted;
    }, 0);
  }
};
export default getters;