// Rendering/lifecycle ordering only; real OMS loading is checked separately in browser QA.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@common', () => ({ api: vi.fn(), commonUtil: { hasError: (response: any) => !!response.data.errors, showToast: vi.fn() }, translate: (text: string) => text }));
vi.mock('@/store/user', () => ({ useUserStore: vi.fn() }));
vi.mock('@/store/productStore', () => ({ useProductStore: vi.fn() }));
vi.mock('@/store/product', () => ({ useProductStore: () => ({ cached: {} }) }));
vi.mock('dexie', async original => ({ ...await original<any>(), liveQuery: () => ({ subscribe: () => ({ unsubscribe() {} }) }) }));
vi.mock('@/db/receivingClient', () => ({
  getReceivingDb: async () => ({ name: 'receiving-test' }), receivingOperations: { value: undefined },
  setActiveReceivingOrder: async () => {}, ensureReceivingOrder: vi.fn(), loadReceivingTracking: vi.fn(),
}));
vi.mock('@/db/receivingQueries', () => ({ readDetail: vi.fn(), readHistory: vi.fn() }));

import { api } from '@common';
import { ensureReceivingOrder, loadReceivingTracking } from '@/db/receivingClient';
import { readDetail } from '@/db/receivingQueries';
import { useTransferOrderStore } from './transferorder';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const params = { orderStatusId: 'ORDER_COMPLETED', destinationFacilityId: 'F1', pageIndex: 0 };
const response = (orderId: string) => ({ data: { orders: [{ orderId }], ordersCount: 2 } });
const badges = [{ code: 'TRACKING', shipped: true, status: '' }];
beforeEach(() => {
  setActivePinia(createPinia()); vi.resetAllMocks();
  vi.mocked(api).mockResolvedValue(response('T1') as any);
  vi.mocked(loadReceivingTracking).mockResolvedValue([{ orderId: 'T1', trackingCodes: badges }]);
});

describe('Completed list publication', () => {
  it('keeps current rows until the replacement includes tracking badges', async () => {
    const store = useTransferOrderStore();
    store.transferOrder.list = [{ orderId: 'T1', trackingCodes: badges }];
    const previous = store.transferOrder.list;
    const tracking = deferred<any>();
    vi.mocked(loadReceivingTracking).mockReturnValue(tracking.promise);
    const refresh = store.fetchTransferOrders(params);
    await vi.waitFor(() => expect(loadReceivingTracking).toHaveBeenCalledOnce());
    expect(store.transferOrder.list).toBe(previous);
    tracking.resolve([{ orderId: 'T1', trackingCodes: badges }]);
    await refresh;
    expect(store.transferOrder.list).toEqual([{ orderId: 'T1', trackingCodes: badges }]);
  });

  it('hydrates only the incoming page and preserves existing rows when appending', async () => {
    const store = useTransferOrderStore();
    store.transferOrder.list = [{ orderId: 'PREVIOUS', trackingCodes: badges }];
    const previous = store.transferOrder.list[0];
    await store.fetchTransferOrders({ ...params, pageIndex: 1 });
    expect(loadReceivingTracking).toHaveBeenCalledWith(['T1'], expect.any(Function));
    expect(store.transferOrder.list[0]).toBe(previous);
    expect(store.transferOrder.list[1]).toEqual({ orderId: 'T1', trackingCodes: badges });
  });

  it('ignores an older search that finishes enrichment after a newer search', async () => {
    const store = useTransferOrderStore(), first = deferred<any>();
    vi.mocked(loadReceivingTracking).mockReturnValueOnce(first.promise);
    const oldSearch = store.fetchTransferOrders(params);
    await vi.waitFor(() => expect(loadReceivingTracking).toHaveBeenCalledOnce());
    vi.mocked(api).mockResolvedValueOnce(response('T2') as any);
    vi.mocked(loadReceivingTracking).mockResolvedValueOnce([{ orderId: 'T2', trackingCodes: [] }]);
    await store.fetchTransferOrders(params);
    first.resolve([{ orderId: 'T1', trackingCodes: badges }]);
    await oldSearch;
    expect(store.transferOrder.list).toEqual([{ orderId: 'T2', trackingCodes: [] }]);
  });

  it('cannot restore rows after logout resets the store', async () => {
    const store = useTransferOrderStore(), tracking = deferred<any>();
    vi.mocked(loadReceivingTracking).mockReturnValueOnce(tracking.promise);
    const refresh = store.fetchTransferOrders(params);
    await vi.waitFor(() => expect(loadReceivingTracking).toHaveBeenCalledOnce());
    store.$reset();
    tracking.resolve([{ orderId: 'T1', trackingCodes: badges }]);
    await refresh;
    expect(store.transferOrder.list).toEqual([]);
  });

  it.each(['network', 'error envelope'])('does not collapse the current list on %s failure', async (failure) => {
    const store = useTransferOrderStore();
    store.transferOrder.list = [{ orderId: 'T1', trackingCodes: badges }];
    const previous = store.transferOrder.list;
    if (failure === 'network') vi.mocked(api).mockRejectedValueOnce(new Error('Connection lost'));
    else vi.mocked(api).mockResolvedValueOnce({ data: { errors: ['Request failed'] } } as any);
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await store.fetchTransferOrders(params);
      expect(store.transferOrder.list).toBe(previous);
    } finally { logger.mockRestore(); }
  });

  it('retains known badges when optional shipment enrichment fails', async () => {
    const store = useTransferOrderStore();
    store.transferOrder.list = [{ orderId: 'T1', trackingCodes: badges }];
    vi.mocked(loadReceivingTracking).mockRejectedValueOnce(new Error('Shipment refresh unavailable'));
    await store.fetchTransferOrders(params);
    expect(store.transferOrder.list).toEqual([{ orderId: 'T1', trackingCodes: badges }]);
  });
});

describe('Detail loading boundary', () => {
  const snapshot = { orderId: 'T1', items: [], products: [], ready: true, shipmentsReady: true, hydrated: false };
  it('waits for products as well as the order and packages on the first load', async () => {
    const store = useTransferOrderStore(), hydration = deferred<void>();
    vi.mocked(readDetail).mockResolvedValue(snapshot as any);
    vi.mocked(ensureReceivingOrder).mockReturnValue(hydration.promise);
    let loaded = false;
    const opening = store.openLocalDetail('T1', 'F1').then(() => { loaded = true; });
    await vi.waitFor(() => expect(ensureReceivingOrder).toHaveBeenCalledOnce());
    expect(loaded).toBe(false);
    vi.mocked(readDetail).mockResolvedValue({ ...snapshot, hydrated: true } as any);
    hydration.resolve();
    await opening;
    expect(store.current.hydrated).toBe(true);
    store.closeLocalDetail();
  });

  it('opens a hydrated cached detail without waiting for network refresh', async () => {
    const store = useTransferOrderStore(), hydration = deferred<void>();
    vi.mocked(readDetail).mockResolvedValue({ ...snapshot, hydrated: true } as any);
    vi.mocked(ensureReceivingOrder).mockReturnValue(hydration.promise);
    await store.openLocalDetail('T1', 'F1');
    expect(store.current.orderId).toBe('T1');
    hydration.resolve(); store.closeLocalDetail();
  });
});
