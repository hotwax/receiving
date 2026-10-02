import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ worker: null as any, observers: [] as any[], filter: vi.fn() }));
vi.mock('comlink', () => ({ expose: (worker: any) => { state.worker = worker; } }));
vi.mock('dexie', () => ({ liveQuery: () => ({ subscribe: (observer: any) => {
  state.observers.push(observer); return { unsubscribe() {} };
} }) }));
vi.mock('@common/db/sync/pollingWorkerHarness', () => ({ createSyncHarness: () => ({ start: async () => {}, stop() {} }) }));
vi.mock('@common/db/sync/syncRegistry', () => ({ registerSyncDomain() {} }));
vi.mock('./receivingDatabase', () => ({ ReceivingDB: class {}, openReceivingDb: async () => {}, tuple: (...parts: unknown[]) => JSON.stringify(parts) }));
vi.mock('./receivingApi', () => ({ ReceivingApi: class { constructor(public connection: unknown) {} } }));
vi.mock('./receivingQueries', () => ({ filterList: state.filter }));
vi.stubGlobal('BroadcastChannel', class { onmessage: unknown; });

describe('Independent list data and sync status publication', () => {
  beforeEach(async () => {
    vi.resetModules();
    state.observers = [];
    state.filter.mockReset().mockImplementation(corpus => ({ list: corpus.rows.map((row: any) => row.order), total: corpus.rows.length }));
    await import('./receiving.worker');
    await state.worker.start({ scope: 'test', facilityId: 'F1' });
  });

  it('publishes new progress without filtering or rebuilding unchanged result rows', () => {
    const publish = vi.fn();
    state.worker.watchList(publish);
    state.observers[0].next({ rows: [{ order: { orderId: 'T1' }, search: 'shirt' }] });
    state.observers[1].next({ readyOrders: 1, checkedAt: 1 });
    state.observers[1].next({ readyOrders: 1, checkedAt: 2 });
    expect(state.filter).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenLastCalledWith({ list: [{ orderId: 'T1' }], total: 1, sync: { readyOrders: 1, checkedAt: 2 } });
    state.worker.search('shirt', 10);
    expect(state.filter).toHaveBeenLastCalledWith(expect.anything(), 'shirt', 10);
    expect(state.filter).toHaveBeenCalledTimes(2);
  });

  it('does not hide a storage failure when independent sync status updates arrive', () => {
    const publish = vi.fn();
    state.worker.watchList(publish);
    state.observers[0].error(new Error('storage unavailable'));
    state.observers[1].next({ complete: true });
    expect(publish).toHaveBeenLastCalledWith({ list: [], total: 0,
      sync: { complete: true, error: 'Local transfer storage is unavailable.' } });
  });
});
