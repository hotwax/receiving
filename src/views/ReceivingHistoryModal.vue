<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("History") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-list v-for="(item, index) in poHistory.items" :key="index">
      <ion-item>
        <ion-thumbnail slot="start">
          <Image :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          {{ item.receivedByUserLoginId }}
          <p>{{ item.shipmentId }}</p>
        </ion-label>
        <!-- TODO: Use appropriate css properties to align below label as like as figma design. -->
        <ion-label>
          <ion-note>{{ item.quantityAccepted }} {{ $t("received") }} | {{ item.quantityRejected }} {{ $t("rejected") }}</ion-note>
          <ion-note>{{ item.datetimeReceived ? $filters.formatDate(item.datetimeReceived, undefined, "H:MM A DD/MM/YYYY") : "-" }}</ion-note>
        </ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script>
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { close } from 'ionicons/icons';
import Image from "@/components/Image.vue";
import { mapGetters, useStore } from "vuex";

export default defineComponent({
  name: "ReceivingHistoryModal",
  components: {
    Image,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonThumbnail,
    IonTitle,
    IonToolbar,
  },
  props: ["order"],
  computed: {
    ...mapGetters({
      poHistory: 'order/getPOHistory',
      getProduct: 'product/getProduct'
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    const store = useStore();

    return {
      close,
      store
    };
  },
});
</script>

<style scoped>
img {
  object-fit: contain;
}
</style>
