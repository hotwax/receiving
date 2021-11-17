<template>
  <ion-list>
    <ion-item @click="viewProduct()">
      <ion-label>
        <h2>{{ product.id }}</h2>
        <p>{{ product.noOfItem }}</p>
      </ion-label>
      <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
    </ion-item>
  </ion-list>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonItem,
  IonLabel,
  IonList,
  IonNote
} from '@ionic/vue'
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

export default defineComponent({
  name: "ReceivingListItem",
  components: {
    IonItem,
    IonLabel,
    IonList,
    IonNote
  },
  props: ["product"],
 methods: {
    async viewProduct () {
      await this.store.dispatch('product/setCurrent', {product: this.product});
      this.router.push({ path: `/shipment/${this.product.id}` })
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