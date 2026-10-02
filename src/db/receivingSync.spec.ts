import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReceivingSync } from './receivingSync';

function setup() {
  const tasks = {
    membership: vi.fn().mockResolvedValue(undefined),
    pendingIds: vi.fn().mockResolvedValue(['pending']),
    detail: vi.fn().mockResolvedValue(undefined),
    history: vi.fn().mockResolvedValue(undefined),
    stopped: vi.fn().mockReturnValue(false),
  };
  return { tasks, loop: createReceivingSync(tasks) };
}
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
afterEach(() => { vi.useRealTimers(); });

describe('Independent receiving refresh domains', () => {
  it('refreshes saved detail and history after membership fails and during its backoff', async () => {
    vi.useFakeTimers();
    const { tasks, loop } = setup();
    tasks.membership.mockRejectedValue(new Error('membership unavailable'));
    await expect(loop.sync()).rejects.toThrow('membership unavailable');
    await settle();
    expect(tasks.history).toHaveBeenCalledWith('pending');
    await loop.sync();
    await settle();
    expect(tasks.membership).toHaveBeenCalledTimes(1);
    expect(tasks.detail).toHaveBeenCalledTimes(2);
    expect(tasks.history).toHaveBeenCalledTimes(2);
    tasks.membership.mockResolvedValue(undefined);
    await loop.sync(true);
    expect(tasks.membership).toHaveBeenCalledTimes(2);
  });

  it('continues receipt history when detail refresh fails', async () => {
    const { tasks, loop } = setup();
    tasks.detail.mockRejectedValue(new Error('detail unavailable'));
    await loop.sync();
    await settle();
    expect(tasks.history).toHaveBeenCalledWith('pending');
  });

  it('polls the open completed order and removes it on close, without refreshing other archived orders', async () => {
    const { tasks, loop } = setup();
    loop.setActiveOrder('completed');
    await loop.sync();
    await settle();
    expect(tasks.detail.mock.calls.map(([id]) => id)).toEqual(['pending', 'completed']);
    expect(tasks.history).toHaveBeenCalledWith('completed');
    tasks.detail.mockClear();
    loop.setActiveOrder();
    await loop.sync();
    await settle();
    expect(tasks.detail.mock.calls.map(([id]) => id)).toEqual(['pending']);
  });

  it('deduplicates an open pending order and prevents overlapping hydration jobs', async () => {
    const { tasks, loop } = setup();
    let finish!: () => void;
    tasks.detail.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    loop.setActiveOrder('pending');
    await loop.sync();
    await loop.sync();
    expect(tasks.detail).toHaveBeenCalledTimes(1);
    finish(); await settle();
    expect(tasks.history).toHaveBeenCalledTimes(1);
  });

  it('does not queue history after the session is stopped', async () => {
    const { tasks, loop } = setup();
    tasks.detail.mockImplementation(async () => { tasks.stopped.mockReturnValue(true); });
    await loop.sync(); await settle();
    expect(tasks.history).not.toHaveBeenCalled();
  });
});
