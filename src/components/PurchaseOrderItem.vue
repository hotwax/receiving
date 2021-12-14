<template>
  <ion-item button @click="viewPurchaseOrder()" lines="none">
    <ion-label>
      <h3>Purchase order number</h3>
      <p>External PO number</p>
    </ion-label>
    <h6>ETA</h6>
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
      this.router.push({ path: `/purchase-order/${this.purchaseOrder.id}` })
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