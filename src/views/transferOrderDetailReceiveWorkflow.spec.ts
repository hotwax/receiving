import { describe, expect, it, vi } from 'vitest';
import { useReceiveFlowState } from '@/composables/useReceiveFlowState';
import { runTransferOrderDetailReceiveWorkflow, type TransferOrderReceiveMode } from './transferOrderDetailReceiveWorkflow';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
};

const createWorkflow = (mode: TransferOrderReceiveMode) => {
  const flow = useReceiveFlowState();
  const presentConfirmationOverlay = vi.fn(async () => true);
  const receiveTransferOrder = vi.fn(async () => true);
  const refresh = vi.fn(async () => undefined);
  const navigate = vi.fn(async () => undefined);

  const run = () => runTransferOrderDetailReceiveWorkflow({
    mode,
    startConfirmation: flow.startConfirmation,
    startSubmission: flow.startSubmission,
    reset: flow.reset,
    confirm: presentConfirmationOverlay,
    submit: receiveTransferOrder,
    refresh,
    navigate
  });

  return { flow, presentConfirmationOverlay, receiveTransferOrder, refresh, navigate, run };
};

describe('TransferOrderDetail receive workflow', () => {
  it('allows one overlay and one receipt submission for rapid concurrent Save Progress actions', async () => {
    const workflow = createWorkflow('save-progress');
    const confirmation = deferred<boolean>();
    workflow.presentConfirmationOverlay.mockImplementation(() => confirmation.promise);

    const firstRun = workflow.run();
    const secondRun = workflow.run();

    expect(workflow.presentConfirmationOverlay).toHaveBeenCalledTimes(1);
    expect(await secondRun).toBe(false);

    confirmation.resolve(true);
    expect(await firstRun).toBe(true);
    expect(workflow.receiveTransferOrder).toHaveBeenCalledTimes(1);
    expect(workflow.refresh).toHaveBeenCalledTimes(1);
    expect(workflow.navigate).not.toHaveBeenCalled();
  });

  it('keeps the completion submission locked until navigation finishes', async () => {
    const workflow = createWorkflow('complete');
    const navigation = deferred<void>();
    workflow.navigate.mockImplementation(() => navigation.promise);

    const firstRun = workflow.run();
    await vi.waitFor(() => expect(workflow.navigate).toHaveBeenCalledTimes(1));

    expect(workflow.flow.state.value).toBe('submitting');
    expect(await workflow.run()).toBe(false);
    expect(workflow.presentConfirmationOverlay).toHaveBeenCalledTimes(1);
    expect(workflow.receiveTransferOrder).toHaveBeenCalledTimes(1);
    expect(workflow.refresh).not.toHaveBeenCalled();

    navigation.resolve();
    expect(await firstRun).toBe(true);
    expect(workflow.flow.state.value).toBe('idle');
  });

  it('releases the lock when confirmation is cancelled', async () => {
    const workflow = createWorkflow('save-progress');
    workflow.presentConfirmationOverlay.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    expect(await workflow.run()).toBe(false);
    expect(workflow.flow.state.value).toBe('idle');
    expect(await workflow.run()).toBe(true);
    expect(workflow.receiveTransferOrder).toHaveBeenCalledTimes(1);
  });

  it('releases the lock when receipt submission fails', async () => {
    const workflow = createWorkflow('save-progress');
    workflow.receiveTransferOrder.mockResolvedValue(false);

    expect(await workflow.run()).toBe(false);
    expect(workflow.flow.state.value).toBe('idle');
    expect(workflow.refresh).not.toHaveBeenCalled();
    expect(workflow.navigate).not.toHaveBeenCalled();
  });
});
