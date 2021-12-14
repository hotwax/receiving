import { GetterTree } from "vuex";
import PurchaseOrderState from "./PurchaseOrderState";
import RootState from "../../RootState";

const getters: GetterTree<PurchaseOrderState, RootState> = {
  getPurchaseOrders(state) {
    return state.purchaseOrders.list;
  }
};
export default getters;