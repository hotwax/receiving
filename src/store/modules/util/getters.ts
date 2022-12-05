import { GetterTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState';

const getters: GetterTree <UtilState, RootState> = {
  getStatusDesc: (state) => (statusId: string) => {
    return state.status[statusId]
  }
}
export default getters;