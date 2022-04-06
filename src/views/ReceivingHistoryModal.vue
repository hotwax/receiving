<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("History") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list v-for="(item, index) in poHistory.items" :key="index">
      <ion-item>
        <ion-thumbnail slot="start">
          <Image :src="getProduct(item.productId).mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          {{ item.receivedByUserLoginId }}
          <p>{{ item.shipmentId }}</p>
        </ion-label>
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
import { closeOutline } from 'ionicons/icons';
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
      closeOutline,
      store
    };
  },
});
</script>

<style scoped>
ion-note {
  display: block;
  text-align: end;
}
</style>