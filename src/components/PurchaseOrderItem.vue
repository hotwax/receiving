<template>
  <ion-item button @click="viewPurchaseOrder()" lines="none">
    <ion-label>
      <!-- TODO:- Handle this purchase order number property for now i have used OrderName or OrderId -->
      <h3>{{ purchaseOrder.doclist.docs[0]?.orderName ? purchaseOrder.doclist.docs[0]?.orderName : purchaseOrder.doclist.docs[0]?.orderId }}</h3>
      <!-- TODO:- Handle this external PO number -->
      <p>{{purchaseOrder.doclist.docs[0].externalOrderId}}</p>
    </ion-label>
    <h6>{{ $filters.formatUtcDate(purchaseOrder.doclist.docs[0].estimatedDeliveryDate, 'YYYY-MM-DDTHH:mm:ssZ') }}</h6>
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
    async viewPurchaseOrder () {
      //TODO need to implement updateCurrentProduct action
      // await this.store.dispatch('product/updateCurrentProduct', {product: this.product});
      this.router.push({ path: `/purchase-order/${this.purchaseOrder.doclist.docs[0].orderId}` })
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