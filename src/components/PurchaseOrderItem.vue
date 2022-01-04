<template>
  <ion-item button @click="getOrderDetails(purchaseOrder.doclist.docs[0].orderId)" lines="none">
    <ion-label>
      <!-- TODO:- Handle this purchase order number property for now i have used OrderName or OrderId -->
      <h3>{{ purchaseOrder.orderName ? purchaseOrder.orderName : purchaseOrder.orderId }}</h3>
      <p>{{ purchaseOrder.externalOrderId }}</p>
    </ion-label>
    <h6>{{ $filters.formatUtcDate(purchaseOrder.estimatedDeliveryDate, 'YYYY-MM-DDTHH:mm:ssZ') }}</h6>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonItem,
  IonLabel
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';

export default defineComponent({
  name: "PurchaseOrderItem",
  components: {
    IonItem,
    IonLabel
  },
  props: ["purchaseOrder"],
  methods: {
    async getOrderDetails(orderId?: any) {
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
              `orderTypeId: PURCHASE_ORDER AND orderId: ${orderId}`
          ]
        }
      }
      await this.store.dispatch("purchaseOrder/getOrderDetails", {payload, orderId})
      this.router.push({ path: `/purchase-order-details/${orderId}` })
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    
    return {
      router,
      store
    }
  },
})
</script>