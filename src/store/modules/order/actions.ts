import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'


const actions: ActionTree<OrderState, RootState> = {

  async findPurchaseOrders ({ commit, state }, payload) {

    let resp;
    try {
      resp = await OrderService.fetchPurchaseOrders(payload)

      if (resp.status === 200 && !hasError(resp) && resp.data.grouped) {
        const orders = resp.data.grouped.orderId
        
        if (payload.json.params.start && payload.json.params.start > 0) orders.groups = state.purchaseOrders.list.concat(orders.groups);
        commit(types.ORDER_PRCHS_ORDRS_UPDATED, {
          list: orders.groups,
          total: orders.ngroups
        })
      } else {
        //showing error whenever not getting Orders
        showToast(translate("Orders not found"));
      }
    } catch(error){
      console.log(error)
      showToast(translate("Something went wrong"));
    }
    return resp;
  },
  async addOrderItem ({ state, commit }, payload) {
    const product = { 
      ...payload,
      quantityAccepted: 0,
      quantityOrdered: 0
    }
    commit(types.ORDER_CURRENT_PRODUCT_ADDED, product)
  },
  async getOrderDetail({ commit, state }, { orderId }) {
    let resp;

    const current = state.current as any
    const orders = state.purchaseOrders.list as any

    if (current.length && current[0]?.orderId === orderId) { return current }

    else if(orders.length > 0) {
      return orders.some((order: any) => {
        if (order.doclist.docs[0]?.orderId === orderId) {
          this.dispatch('product/fetchProductInformation',  { order: order.doclist.docs });
          commit(types.ORDER_CURRENT_UPDATED, { orderId : order.doclist.docs[0]?.orderId, externalOrderId: order.doclist.docs[0]?.externalOrderId, order: order.doclist.docs })
          return current;
        }
      })
    }
    try {
      const payload = {
        "json": {
          "params": {
            "rows": 10,
            "group": true,
            "group.field": "orderId",
            "group.limit": 10000
          },
          "query": "docType:ORDER",
          "filter": [
            `orderTypeId: PURCHASE_ORDER AND orderId: ${orderId} AND facilityId: ${this.state.user.currentFacility.facilityId}`
          ]
        }
      }
      resp = await OrderService.fetchPODetail(payload);

      if (resp.status === 200 && !hasError(resp) && resp.data.grouped) {
        const order = resp.data.grouped.orderId.groups[0].doclist.docs

        this.dispatch('product/fetchProductInformation', { order });
        commit(types.ORDER_CURRENT_UPDATED, { order })
      }
      else {
        showToast(translate("Something went wrong"));
      }
    } catch (error) {
      showToast(translate("Something went wrong"));
    }
    return resp;
  }
}

export default actions;