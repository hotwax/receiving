<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ translate('Review receipt') }}</ion-title>
      <ion-buttons slot="end"><ion-button @click="modalController.dismiss()">{{ translate('Cancel') }}</ion-button></ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <p>{{ translate('The receipt response was lost. Compare this submission with receiving history before clearing the receiving block.') }}</p>
    <ion-list>
      <ion-item><ion-label>{{ operation.orderId }}<p>{{ submittedAt }}</p></ion-label></ion-item>
      <ion-item v-for="item in operation.payload?.items || []" :key="item.orderItemSeqId || item.productId">
        <ion-label>{{ item.productId }}<p>{{ item.orderItemSeqId }}</p></ion-label>
        <ion-note slot="end">{{ item.quantityAccepted || 0 }}</ion-note>
      </ion-item>
      <ion-item v-if="!operation.payload"><ion-label>{{ translate('This older receipt has no saved submission details. Verify its outcome in OMS before continuing.') }}</ion-label></ion-item>
    </ion-list>
    <ion-item lines="none">
      <ion-checkbox v-model="reviewed" label-placement="end" justify="start">
        <ion-label class="ion-text-wrap">{{ translate('I verified this receipt in receiving history or OMS.') }}</ion-label>
      </ion-checkbox>
    </ion-item>
    <p>{{ translate('Resolving this block does not submit inventory. Draft quantities will be cleared so you can scan from the refreshed totals.') }}</p>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-buttons slot="end"><ion-button :disabled="!reviewed" @click="modalController.dismiss({ reviewed: true })">{{ translate('Resolve reviewed receipt') }}</ion-button></ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem, IonLabel, IonNote, IonCheckbox, IonFooter, modalController } from '@ionic/vue';
import { translate } from '@common';
import { DateTime } from 'luxon';
import type { ReceiptOperation } from '@/db/receiptOperations';

const props = defineProps<{ operation: ReceiptOperation }>();
const reviewed = ref(false);
const submittedAt = computed(() => props.operation.startedAt ? DateTime.fromMillis(props.operation.startedAt).toLocaleString(DateTime.DATETIME_MED) : '');
</script>
