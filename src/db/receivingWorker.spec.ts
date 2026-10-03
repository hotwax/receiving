// Scheduling/failure tests; physical POS tests verify the real OMS contracts separately.
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  domains: new Map<string, any>(), cache: new Map<string, any>(),
  shipments: vi.fn(), detail: vi.fn(), receipts: vi.fn(), products: vi.fn(),
  writeDetail: vi.fn(), writeReceipts: vi.fn(), writeShipments: vi.fn(), status: vi.fn(),
  exposed: undefined as any,
}));
vi.mock('comlink', () => ({ expose: (value: any) => { state.exposed = value; } }));
vi.mock('@common/db/sync/pollingWorkerHarness', () => ({ createSyncHarness: () => ({
  start: vi.fn(), setDomains: vi.fn(), syncDomainNow: vi.fn().mockResolvedValue(0),
}) }));
vi.mock('@common/db/sync/syncRegistry', () => ({ registerSyncDomain: (domain: any) => state.domains.set(domain.name, domain) }));
vi.mock('./receivingApi', () => ({ ReceivingApi: class {
  constructor(public connection: any) {}
  shipments = state.shipments; detail = state.detail; receipts = state.receipts; products = state.products;
} }));
vi.mock('./receivingDatabase', async original => ({
  ...await original<any>(),
  receivingCache: { get: () => ({
    name: 'worker-test', isOpen: () => true, syncMeta: { put: state.status },
    table: () => ({ bulkGet: async () => [], where: () => ({ equals: () => ({ toArray: async () => [], primaryKeys: async () => ['T1'] }) }) }),
  }) },
  readCacheState: async (_db: any, key: string) => state.cache.get(key),
  replaceDetail: state.writeDetail, replaceOrderRows: state.writeReceipts, replaceOrderShipments: state.writeShipments,
}));
import { cacheKeys } from './receivingDatabase';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const refresh = () => state.domains.get('receivingOrders').refetchOne({ token: 'test' }, { orderId: 'T1', facilityId: 'A' });
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); state.domains.clear(); state.cache.clear();
  state.shipments.mockResolvedValue({ packages: [], items: [] });
  state.detail.mockResolvedValue({ orderId: 'T1', items: [] });
  state.receipts.mockResolvedValue([]); state.products.mockResolvedValue([]);
  vi.stubGlobal('navigator', { locks: { request: async (_key: string, options: any, action?: () => unknown) => (action || options)() } });
  vi.spyOn(self, 'postMessage').mockImplementation(() => {});
  await import('./receiving.worker');
  await state.exposed.start({ token: 'test', maargUrl: 'https://example.invalid', domains: [{
    name: 'receivingMembership', args: { scope: 'test', facilityId: 'A', moqui: true },
  }] });
});

it('starts independent reads together before their responses are available', async () => {
  const shipment = deferred<any>(); state.shipments.mockReturnValueOnce(shipment.promise);
  const work = refresh();
  await vi.waitFor(() => expect(state.receipts).toHaveBeenCalledWith('T1', false));
  expect(state.shipments).toHaveBeenCalledOnce(); expect(state.detail).toHaveBeenCalledOnce();
  expect(state.writeDetail).not.toHaveBeenCalled();
  shipment.resolve({ packages: [], items: [] }); await work;
  expect(state.writeDetail).toHaveBeenCalledOnce(); expect(state.writeReceipts).toHaveBeenCalledOnce();
});

it('keeps the order operation pending until other reads settle after a detail failure', async () => {
  const receipts = deferred<any>(); state.receipts.mockReturnValueOnce(receipts.promise);
  const failure = new Error('Detail unavailable'); state.detail.mockRejectedValueOnce(failure);
  let settled = false;
  const work = refresh().finally(() => { settled = true; });
  const rejected = expect(work).rejects.toBe(failure);
  await vi.waitFor(() => expect(state.receipts).toHaveBeenCalledOnce());
  expect(settled).toBe(false);
  receipts.resolve([]); await rejected;
  expect(state.writeDetail).not.toHaveBeenCalled(); expect(state.writeReceipts).toHaveBeenCalledOnce();
});

it('preserves fresh detail when discrepancies fail, after every read settles', async () => {
  const shipment = deferred<any>(); state.shipments.mockReturnValueOnce(shipment.promise);
  const failure = new Error('Discrepancies unavailable'); state.receipts.mockRejectedValueOnce(failure);
  const detail = { orderId: 'T1', items: [{ orderItemSeqId: '01', productId: 'P1', totalReceivedQuantity: 2 }] };
  state.detail.mockResolvedValueOnce(detail);
  let settled = false;
  const work = refresh().finally(() => { settled = true; });
  const rejected = expect(work).rejects.toBe(failure);
  await vi.waitFor(() => expect(state.receipts).toHaveBeenCalledOnce());
  expect(settled).toBe(false);
  expect(state.writeDetail).not.toHaveBeenCalled();
  shipment.resolve({ packages: [], items: [] }); await rejected;
  expect(state.writeDetail).toHaveBeenCalledOnce();
  expect(state.writeDetail).toHaveBeenCalledWith(expect.anything(), detail, expect.any(Function));
  expect(state.writeReceipts).not.toHaveBeenCalled();
  expect(state.status).toHaveBeenCalledWith(expect.objectContaining({ key: cacheKeys.hydrate('A', 'T1'), error: 'Unable to refresh transfer data' }));
  expect(state.status).not.toHaveBeenCalledWith(expect.objectContaining({ key: cacheKeys.hydrate('A', 'T1'), ready: true }));
});

it('keeps item hydration working when optional shipments fail', async () => {
  state.shipments.mockRejectedValueOnce(new Error('Shipments unavailable'));
  await refresh();
  expect(state.writeDetail).toHaveBeenCalledOnce(); expect(state.writeReceipts).toHaveBeenCalledOnce();
  expect(state.status).toHaveBeenCalledWith(expect.objectContaining({ key: cacheKeys.shipments('A', 'T1'), error: expect.any(String) }));
  expect(state.status).toHaveBeenCalledWith(expect.objectContaining({ key: cacheKeys.hydrate('A', 'T1'), ready: true }));
});

it('does not refetch fresh cached orders on an automatic tick', async () => {
  for (const key of [cacheKeys.hydrate('A', 'T1'), cacheKeys.shipments('A', 'T1')]) {
    state.cache.set(key, { ready: true, checkedAt: Date.now() });
  }
  await state.domains.get('receivingOrders').sync({ token: 'test' }, {}, { force: false });
  expect(state.shipments).not.toHaveBeenCalled(); expect(state.detail).not.toHaveBeenCalled();
  expect(state.receipts).not.toHaveBeenCalled(); expect(state.products).not.toHaveBeenCalled();
});
