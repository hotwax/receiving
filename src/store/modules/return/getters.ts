import { GetterTree } from "vuex";
import ReturnState from "./ReturnState";
import RootState from "../../RootState";

const getters: GetterTree<ReturnState, RootState> = {
  getReturns(state) {
    return state.returns.list;
  },
  getReturnsTotal(state) {
    return state.returns.total;
  },
  getCurrent (state) {
    return state.current;
  },
  isReturnReceivable: (state) => (statusId: string) => {
    return state.validStatusChange[statusId]?.includes('PURCH_SHIP_RECEIVED')
  }
};
export default getters;
