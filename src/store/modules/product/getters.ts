import { GetterTree } from "vuex";
import ShipmentState from "./ShipmentState";
import RootState from "../../RootState";

const getters: GetterTree<ShipmentState, RootState> = {
  getSearchProducts(state) {
    return state.products.list;
  },
  getCurrent (state) {
    return state.current;
  },
  getUpdateShipmentProducts(state) {
    return state.updateShipmentProducts;
  },
};
export default getters;
