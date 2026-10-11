import { computed, readonly, ref } from 'vue';

export type ReceiveFlowState = 'idle' | 'confirming' | 'submitting';

export const useReceiveFlowState = () => {
  const state = ref<ReceiveFlowState>('idle');
  const isBusy = computed(() => state.value !== 'idle');

  const startConfirmation = () => {
    if (state.value !== 'idle') {
      return false;
    }

    state.value = 'confirming';
    return true;
  };

  const startSubmission = () => {
    if (state.value !== 'confirming') {
      return false;
    }

    state.value = 'submitting';
    return true;
  };

  const reset = () => {
    state.value = 'idle';
  };

  return {
    state: readonly(state),
    isBusy,
    startConfirmation,
    startSubmission,
    reset
  };
};
