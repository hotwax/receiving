<template>
  <ion-list>
    <ion-item v-for="shipment in shipments" :key="shipment.id" @click="() => router.push('/shipment')">
      <ion-label>
        <h2>{{ shipment?.id }}</h2>
        <p>{{ shipment?.noOfItem }} {{ (shipment?.noOfItem > 1 ? 'Items' : 'Item') }}</p>
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

export default defineComponent({
  name: "ReceivingListItem",
  components: {
    IonItem,
    IonLabel,
    IonList,
    IonNote
  },
  setup(){
    const router = useRouter();
    return {
      router
    }
  }
})
</script>