<template>
  <ion-list>
    <ion-item @click="() => router.push('/shipment')">
      <ion-label>
        <h2>SHPMNT_001</h2>
        <p>3 {{ $t("items") }}</p>
      </ion-label>
      <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>
        <h2>SHPMNT_002</h2>
        <p>2 {{ $t("items") }}</p>
      </ion-label>
      <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>
        <h2>SHPMNT_003</h2>
        <p>6 {{ $t("items") }}</p>
      </ion-label>
      <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>
        <h2>SHPMNT_004</h2>
        <p>4 {{ $t("items") }}</p>
      </ion-label>
      <ion-note slot="end">{{ $t("Shipped") }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>
        <h2>SHPMNT_005</h2>
        <p>1 {{ $t("item") }}</p>
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