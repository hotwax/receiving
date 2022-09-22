import { GetterTree } from "vuex";
import ReturnState from "./ReturnState";
import RootState from "../../RootState";

const getters: GetterTree<ReturnState, RootState> = {
  getReturns(state) {
    return state.returns.list;
  },
  getCurrent (state) {
    return state.current;
  },
  getReturnValidStatusChange: (state) => (statusId: string) => {
    return state.validStatusChange[statusId]
  }
};
export default getters;
