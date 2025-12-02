import { GetterTree } from "vuex";
import ShipmentState from "./ShipmentState";
import RootState from "../../RootState";

const getters: GetterTree<ShipmentState, RootState> = {
  getShipments(state) {
    return state.shipments.list;
  },
  getTotalShipments(state){
    return state.shipments.total;
  },
  getCurrent (state) {
    return state.current;
  }
};
export default getters;
