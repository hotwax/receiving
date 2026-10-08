// Transport/lifecycle fault injection. Live OMS receipt behavior is verified separately in browser QA.
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  api: vi.fn(), start: vi.fn(), refetch: vi.fn(), stop: vi.fn(), open: vi.fn(), clear: vi.fn(), syncDomain: vi.fn(),
  journals: new Map<string, Map<string, any>>(), dbs: new Map<string, any>(),
  serviceState: { running: false, written: {} as Record<string, number>, errors: {} as Record<string, string> },
  onStatus: undefined as ((status: Record<string, any>) => void) | undefined,
  logout: vi.fn(),
  receivingChannel: undefined as any,
}));
vi.mock('@common/composables/useAuth', () => ({ useAuth: () => ({ logout: state.logout }) }));
vi.mock('@common/core/remoteApi', () => ({ default: state.api }));
vi.mock('@common/utils/commonUtil', () => ({ commonUtil: { hasError: (response: any) => !!response?.data?.errors } }));
vi.mock('@common/db/sync/syncService', () => ({
  serviceState: state.serviceState,
  createSyncService: (options: any) => {
    state.onStatus = options.onStatus;
    return { start: state.start, stop: state.stop, refetchOne: state.refetch, syncDomainNow: state.syncDomain, setDomains: async () => {} };
  },
  clearDomainErrors: (domain: string) => { delete state.serviceState.errors[domain]; }, clearScopeError() {},
  recordSyncError: (domain: string, message: string) => { state.serviceState.errors[domain] = message; },
}));
vi.mock('dexie', async original => ({ ...await original<any>(), liveQuery: () => ({ subscribe: () => ({ unsubscribe() {} }) }) }));
vi.mock('./receivingDatabase', () => ({
  tuple: (...parts: unknown[]) => JSON.stringify(parts), cacheKeys: { hydrate: () => 'hydrate' }, readCacheState: async () => undefined,
  openReceivingDb: state.open, clearReceivingData: state.clear,
  receivingCache: {
    setOmsInstanceResolver() {},
    get(scope: string) {
      if (!state.dbs.has(scope)) state.dbs.set(scope, {
        name: scope, closed: false,
        async open() { this.closed = false; },
        close() { this.closed = true; },
      });
      return state.dbs.get(scope);
    },
    raw: () => ({}),
  },
}));
vi.mock('./receiptOperations', async original => {
  const actual = await original<any>();
  return { ...actual, importLegacyReceipts: async () => {}, ReceiptOperations: class {
    rows: Map<string, any>;
    constructor(scope: string) {
      if (!state.journals.has(scope)) state.journals.set(scope, new Map());
      this.rows = state.journals.get(scope)!;
    }
    receipts = {
      get: async (key: string) => this.rows.get(key),
      put: async (row: any) => { this.rows.set(row.orderId, structuredClone(row)); },
      update: async (key: string, patch: any) => { Object.assign(this.rows.get(key), patch); },
      delete: async (key: string) => { this.rows.delete(key); },
    };
    transaction(_mode: string, _table: unknown, run: () => unknown) { return run(); }
    close() {}
  } };
});

const connection = { scope: 'tenant/user', facilityId: 'A', token: 'test', maargUrl: 'https://example.invalid/rest/s1/', moqui: true };
const line = { orderItemSeqId: '01', productId: 'P1', orderFacilityId: 'A', statusId: 'ITEM_APPROVED', quantity: 5, totalIssuedQuantity: 5, totalReceivedQuantity: 0 };
const payload = { facilityId: 'A', receivedDateTime: '123', items: [{ orderItemSeqId: '01', productId: 'P1', quantityAccepted: 2 }] };
let client: typeof import('./receivingClient');
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); state.journals.clear(); state.dbs.clear(); state.serviceState.errors = {};
  state.open.mockResolvedValue(undefined); state.start.mockResolvedValue(undefined); state.refetch.mockResolvedValue(1);
  state.clear.mockImplementation(async db => { if (db.closed) throw new Error('DatabaseClosedError'); });
  state.api.mockImplementation(async (request: any) => request.method === 'get' ? { data: { order: { items: [line] } } } : { status: 200, data: {} });
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, run: () => unknown) => run() } });
  vi.stubGlobal('BroadcastChannel', class {
    onmessage: any;
    constructor(name: string) { if (name === 'receiving-session') state.receivingChannel = this; }
    postMessage() {} close() {}
  });
  client = await import('./receivingClient');
  await client.configureReceiving(connection);
});
const postCount = () => state.api.mock.calls.filter(([request]) => request.method === 'post').length;

it('clears receiving immediately and runs shared auth teardown once after same-scope cross-tab logout', async () => {
  const db = await client.getReceivingDb();
  const event = { data: { type: 'logout', scope: connection.scope } };
  state.receivingChannel.onmessage(event);
  state.receivingChannel.onmessage(event);
  expect(client.receivingDb.value).toBeUndefined();
  expect(db.closed).toBe(true);
  await vi.waitFor(() => expect(state.logout).toHaveBeenCalledOnce());
  expect(state.logout).toHaveBeenCalledWith({ isUserUnauthorised: true });
  expect(postCount()).toBe(0);
  await client.configureReceiving(connection);
  expect(client.receivingDb.value).toBeUndefined();
  client.enableReceivingSession();
  await client.configureReceiving(connection);
  await expect(client.getReceivingDb()).resolves.toBe(db);
});

it('does not end this session for another tenant or user logout', async () => {
  const db = await client.getReceivingDb();
  state.receivingChannel.onmessage({ data: { type: 'logout', scope: 'other-tenant/user' } });
  await Promise.resolve();
  expect(client.receivingDb.value).toBe(db);
  expect(db.closed).toBe(false);
  expect(state.logout).not.toHaveBeenCalled();
});

it('reopens the captured cache for shared logout cleanup and closes it afterward', async () => {
  const db = await client.getReceivingDb();
  await client.clearReceivingSession();
  expect(state.clear).toHaveBeenCalledOnce();
  expect(state.clear).toHaveBeenCalledWith(db);
  expect(state.dbs.get(connection.scope).closed).toBe(true);
  expect(client.receivingDb.value).toBeUndefined();
  await client.clearReceivingSession();
  expect(state.clear).toHaveBeenCalledOnce();
});

describe('Live receiving progress', () => {
  it('advances from actual work and retains finished work while another domain is running', () => {
    const emit = state.onStatus!;
    emit({ type: 'sync-start', domain: 'receivingMembership' });
    expect(client.receivingList.value.sync.progress).toBe(0);
    emit({ type: 'sync-progress', domain: 'receivingMembership', completed: 1, total: 4 });
    expect(client.receivingList.value.sync.progress).toBe(0.25);
    emit({ type: 'sync-start', domain: 'receivingOrders' });
    emit({ type: 'sync-progress', domain: 'receivingOrders', completed: 2, total: 6 });
    emit({ type: 'sync-end', domain: 'receivingMembership' });
    expect(client.receivingList.value.sync.progress).toBe(0.6);
    expect(client.receivingList.value.sync.syncing).toBe(true);
    emit({ type: 'sync-end', domain: 'receivingOrders' });
    expect(client.receivingList.value.sync.progress).toBe(1);
    expect(client.receivingList.value.sync.syncing).toBe(false);
    emit({ type: 'sync-start', domain: 'receivingOrders' });
    expect(client.receivingList.value.sync.progress).toBe(0);
  });
  it('clears progress on facility changes and ignores the old worker', async () => {
    const oldStatus = state.onStatus!;
    oldStatus({ type: 'sync-start', domain: 'receivingOrders' });
    oldStatus({ type: 'sync-progress', domain: 'receivingOrders', completed: 3, total: 10 });
    await client.configureReceiving({ ...connection, facilityId: 'B' });
    oldStatus({ type: 'sync-progress', domain: 'receivingOrders', completed: 9, total: 10 });
    expect(client.receivingList.value.sync.progress).toBe(0);
    expect(client.receivingList.value.sync.syncing).toBe(false);
  });
});

describe('Receipt writes and shared AccxUI reconciliation', () => {
  it('awaits shared readback before removing a confirmed receipt operation', async () => {
    state.refetch.mockImplementation(async (domain, pk) => {
      expect(domain).toBe('receivingReceipt'); expect(pk).toEqual({ orderId: 'T1', facilityId: 'A' });
      expect(state.journals.get(connection.scope)?.get('T1')?.state).toBe('confirmed');
      return 1;
    });
    expect(await client.submitReceipt('T1', payload, [line])).toMatchObject({ refreshed: true });
    expect(postCount()).toBe(1); expect(state.journals.get(connection.scope)?.has('T1')).toBe(false);
  });
  it('retries only GET/readback after a successful POST whose cache refresh failed', async () => {
    state.refetch.mockRejectedValueOnce(new Error('readback unavailable'));
    expect(await client.submitReceipt('T1', payload, [line])).toMatchObject({ refreshed: false });
    expect(state.journals.get(connection.scope)?.get('T1')?.state).toBe('confirmed');
    await expect(client.submitReceipt('T1', payload, [line])).rejects.toThrow('previous receipt');
    await client.ensureReceivingOrder('T1', true);
    expect(postCount()).toBe(1); expect(state.journals.get(connection.scope)?.has('T1')).toBe(false);
  });
  it('keeps an unknown POST blocked through refresh and logout/re-login until explicit review', async () => {
    state.api.mockImplementation(async (request: any) => {
      if (request.method === 'post') throw new TypeError('network connection lost');
      return { data: { order: { items: [line] } } };
    });
    await expect(client.submitReceipt('T1', payload, [line])).rejects.toThrow('could not be confirmed');
    const pending = state.journals.get(connection.scope)!.get('T1');
    expect(pending.payload).toEqual(payload); expect(pending.baseline).toEqual([line]);
    await client.clearReceivingSession(); client.enableReceivingSession(); await client.configureReceiving(connection);
    await client.ensureReceivingOrder('T1', true);
    await expect(client.submitReceipt('T1', payload, [line])).rejects.toThrow('previous receipt');
    await client.resolveReceipt('T1', pending.operationId);
    expect(postCount()).toBe(1); expect(state.journals.get(connection.scope)?.has('T1')).toBe(false);
  });
  it('does not write inventory when the authoritative baseline changed', async () => {
    state.api.mockResolvedValue({ data: { order: { items: [{ ...line, totalReceivedQuantity: 1 }] } } });
    await expect(client.submitReceipt('T1', payload, [line])).rejects.toThrow('transfer changed');
    expect(postCount()).toBe(0);
  });
  it('refreshes every domain and waits for history even when membership fails', async () => {
    let finishHistory!: () => void;
    state.syncDomain.mockImplementation((domain: string) => {
      if (domain === 'receivingMembership') return Promise.reject(new Error('membership failed'));
      if (domain === 'receivingHistory') return new Promise<void>(resolve => { finishHistory = resolve; });
      return Promise.resolve(1);
    });
    let settled = false;
    const refresh = client.refreshReceiving().then(() => { settled = true; }, error => { settled = true; return error; });
    await vi.waitFor(() => expect(state.syncDomain).toHaveBeenCalledTimes(3));
    expect(settled).toBe(false);
    finishHistory();
    expect(await refresh).toMatchObject({ message: 'membership failed' });
  });
  it('allows startup to recover on the next request after transient storage failure', async () => {
    await client.configureReceiving();
    state.open.mockRejectedValueOnce(new Error('storage temporarily unavailable'));
    await client.configureReceiving(connection);
    expect(client.receivingError.value).toContain('could not start');
    await expect(client.getReceivingDb()).resolves.toMatchObject({ name: connection.scope });
    expect(client.receivingError.value).toBe('');
  });
  it('never submits the old facility draft after switching facilities during preflight', async () => {
    state.api.mockImplementation(async () => {
      await client.configureReceiving({ ...connection, facilityId: 'B' });
      return { data: { order: { items: [line] } } };
    });
    await expect(client.submitReceipt('T1', payload, [line])).rejects.toThrow('session changed');
    expect(postCount()).toBe(0);
  });
});
