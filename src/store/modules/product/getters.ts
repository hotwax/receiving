import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getShippingProducts (state) {
    return state.list;
  },
  getCurrent (state) {
    return state.current;
  },
};
export default getters;