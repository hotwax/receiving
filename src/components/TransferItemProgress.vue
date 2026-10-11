<template>
  <div class="box-progress" :data-testid="`shipment-progress-${item.orderItemSeqId}`">
    <div class="progress-track">
      <ion-progress-bar :color="value === 1 ? 'success' : value > 1 ? 'danger' : 'primary'" :value="value" />
      <span v-for="boundary in boundaries" :key="boundary.label" class="box-tick"
        :style="{ insetInlineStart: `${boundary.position * 100}%` }" aria-hidden="true" />
    </div>
    <ion-note v-if="allocations.length > 1" class="box-quantities">
      <span v-for="box in allocations" :key="box.packageKey" :data-selected="box.packageKey === selectedPackageKey">
        {{ box.label }}: {{ box.quantity }}
      </span>
    </ion-note>
    <ion-note v-else-if="selectedBox">{{ translate('In this box') }}: {{ selectedBox.quantity }}</ion-note>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonNote, IonProgressBar } from '@ionic/vue';
import { translate } from '@common/core/i18n';
import { boxBoundaries } from '@/db/receivingShipments';
const props = defineProps<{
  item: Record<string, any>;
  value: number;
  total: number;
  allocations: { packageKey: string; label: string; quantity: number }[];
  selectedPackageKey: string;
}>();
const boundaries = computed(() => boxBoundaries(props.allocations, props.total));
const selectedBox = computed(() => props.allocations.find(box => box.packageKey === props.selectedPackageKey));
</script>

<style scoped>
.progress-track { position: relative; }
.box-tick {
  position: absolute;
  inset-block: 0;
  border-inline-start: 2px solid;
  pointer-events: none;
}
.box-quantities {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacer-xs);
}
[data-selected="true"] { text-decoration: underline; }
</style>
