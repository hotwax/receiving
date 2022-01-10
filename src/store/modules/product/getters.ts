import { GetterTree } from 'vuex'
import ProductState from './ProductState';
import RootState from '@/store/RootState'

const getters: GetterTree <ProductState, RootState> = {
    getCached (state) {
        return state.cached
    },
    getProduct: (state) => {
        return state.list.items
    },
    getCurrent: (state) => {
        return state.current;
    },
}
export default getters;
