import { GetterTree } from "vuex";
import ReturnState from "./ReturnState";
import RootState from "../../RootState";

const getters: GetterTree<ReturnState, RootState> = {
  getReturns(state) {
    return state.returns.list;
  },
  getCurrent (state) {
    return state.current;
  }
};
export default getters;
