<template>
  <ion-item button @click="getOrderDetail(purchaseOrder.orderId)">
    <ion-label>
      <!-- TODO:- Handle this purchase order number property for now i have used OrderName or OrderId -->
      <h3>{{ purchaseOrder.externalOrderId }}</h3>
      <p>{{ purchaseOrder.orderName ? purchaseOrder.orderName : purchaseOrder.orderId }}</p>
      <p>Received Qty: {{ receivedQuantity }} / {{ purchaseOrder.totalQty }}</p>
      
    </ion-label>
    <ion-label class="ion-text-end" slot="end">
      <p>{{ purchaseOrder.estimatedDeliveryDate ? $filters.formatUtcDate(purchaseOrder.estimatedDeliveryDate, 'YYYY-MM-DDTHH:mm:ssZ') : " - " }}</p>
      <ion-badge :color="orderStatusColor[purchaseOrder.orderStatusId]">{{ purchaseOrder.orderStatusDesc }}</ion-badge>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonBadge,
  IonItem,
  IonLabel
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';

// ---------- Declare types here ----------
interface ShipmentReceipt {
  receivedQty: number;
}

interface PurchaseOrder {
  orderId: string;
  orderName: string;
  externalOrderId: string;
  totalQty: number;
  shipmentReceipts?: ShipmentReceipt[];
  orderStatusId?: string;
  orderStatusDesc?: string;
  estimatedDeliveryDate?: string;
}
// ----------------------------------------

export default defineComponent({
  name: "PurchaseOrderItem",
  components: {
    IonBadge,
    IonItem,
    IonLabel
  },
 props: {
  purchaseOrder: {
    type: Object as () => PurchaseOrder,
    required: true
  }
},
  data(){
    return {
      orderStatusColor: {
        ORDER_CREATED: 'medium',
        ORDER_APPROVED: 'primary',
        ORDER_REJECTED: 'danger',
        ORDER_COMPLETED: 'success'
      }
    }
  },
  computed: {
  receivedQuantity(): number {
   const order = this.purchaseOrder;
   if (!order.shipmentReceipts) return 0;
   return order.shipmentReceipts.reduce(
    (total: number, receipt: ShipmentReceipt) => total + receipt.receivedQty,
     0
    );
  }
},

  methods: {
    async getOrderDetail(orderId?: any) {
      await this.store.dispatch("order/getOrderDetail", {orderId})
      .then(() => this.router.push({ path: `/purchase-order-detail/${orderId}` }))
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