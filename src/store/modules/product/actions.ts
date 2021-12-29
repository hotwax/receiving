import { ProductService } from '@/services/ProductService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'

const actions: ActionTree<ProductState, RootState> = {

  /**
   * Set Current Product
   */
  async setCurrentProduct ( {commit, state}, { productIds }) {
    const productIdFilter = productIds.reduce((filter: string, productId: any) => {
      if (filter !== '') filter += ' OR '
      return filter += productId;
    }, '');

    if(productIdFilter === '') return;

    const resp = await ProductService.fetchProducts({
      "filters": ['productId: (' + productIdFilter + ')']
    })
    if (resp.status === 200 && !hasError(resp)) {
      const products = resp.data.response.docs;
      if (resp.data) commit(types.PRODUCT_CURRENT, { products });
    }

    return resp;
  }
}
export default actions;