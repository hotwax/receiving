import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getCurrent: (state) => {
    return JSON.parse(JSON.stringify(state.current));
  },
  getSearchProducts(state) {
    return state.products.list;
  },
};
export default getters;