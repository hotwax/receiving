import { describe, expect, it } from 'vitest';
import { useReceiveFlowState } from './useReceiveFlowState';

describe('useReceiveFlowState', () => {
  it('rejects repeated confirmation attempts until the active flow resets', () => {
    const flow = useReceiveFlowState();

    expect(flow.startConfirmation()).toBe(true);
    expect(flow.state.value).toBe('confirming');
    expect(flow.isBusy.value).toBe(true);
    expect(flow.startConfirmation()).toBe(false);

    flow.reset();

    expect(flow.state.value).toBe('idle');
    expect(flow.isBusy.value).toBe(false);
    expect(flow.startConfirmation()).toBe(true);
  });

  it('only starts submission from an active confirmation flow', () => {
    const flow = useReceiveFlowState();

    expect(flow.startSubmission()).toBe(false);
    expect(flow.state.value).toBe('idle');

    flow.startConfirmation();

    expect(flow.startSubmission()).toBe(true);
    expect(flow.state.value).toBe('submitting');
    expect(flow.startSubmission()).toBe(false);
    expect(flow.startConfirmation()).toBe(false);
  });
});
