import { computed, reactive, shallowRef } from 'vue';
import { liveQuery } from 'dexie';
import api from '@common/core/remoteApi';
import { commonUtil } from '@common/utils/commonUtil';
import { setupAppDbSync, type AppDbSync } from '@common/db/sync/setupAppDbSync';
import { createSyncService, serviceState } from '@common/db/sync/syncService';
import receivingWorkerUrl from './receiving.worker.ts?worker&url';
import { receivingCache, openReceivingDb, clearReceivingData, cacheKeys, readCacheState, tuple, type ReceivingDB, type Row } from './receivingDatabase';
import type { ReceivingConnection } from './receivingApi';
import { filterList, findExactTracking, readListCorpus, readListSync, trackingBadges } from './receivingQueries';
import { ReceiptOperations, importLegacyReceipts, receiptLock, clearReceiptOperation, validateReceipt, type ReceiptPayload } from './receiptOperations';

export const receivingDb = shallowRef<ReceivingDB>();
export const receivingOperations = shallowRef<ReceiptOperations>();
export const receivingError = shallowRef('');
const corpus = shallowRef<Awaited<ReturnType<typeof readListCorpus>>>({ rows: [] });
const coverage = shallowRef<Awaited<ReturnType<typeof readListSync>>>();
const syncingDomains = reactive(new Map<string, { completed: number; total: number; running: boolean }>());
const syncProgress = computed(() => {
  const work = [...syncingDomains.values()];
  const total = work.reduce((sum, domain) => sum + domain.total, 0);
  return total ? work.reduce((sum, domain) => sum + domain.completed, 0) / total : 0;
});
const searchText = shallowRef(''), pageLimit = shallowRef(20);
const filtered = computed(() => filterList(corpus.value, searchText.value, pageLimit.value));
export const receivingList = computed(() => ({ ...filtered.value, sync: {
  ...coverage.value, progress: syncProgress.value,
  syncing: serviceState.running || [...syncingDomains.values()].some(domain => domain.running),
  error: receivingError.value || coverage.value?.error || serviceState.errors.receivingMembership || serviceState.errors.receivingOrders,
} }));
let active: ReceivingConnection | undefined;
let sync: AppDbSync | undefined;
let ready: Promise<void> = Promise.resolve();
let generation = 0, sessionEnabled = true;
let sessionController = new AbortController();
let subscriptions: Array<{ unsubscribe(): void }> = [];
const domains = (connection: ReceivingConnection, activeOrder?: string) =>
  ['receivingMembership', 'receivingOrders', 'receivingHistory'].map(name => ({ name, args: { ...connection, token: undefined, activeOrder } }));
const channel = new BroadcastChannel('receiving-session');
channel.onmessage = event => {
  if (event.data?.type === 'logout' && event.data.scope === active?.scope) {
    sessionEnabled = false;
    void configureReceiving();
    void import('@common/composables/useAuth').then(({ useAuth }) =>
      useAuth().logout({ isUserUnauthorised: true })
    );
  }
};

export function receivingScope(maargUrl: string, omsUrl: string, userId: string) {
  const normalize = (url: string) => url.trim() ? new URL(url.trim()).href.replace(/\/+$/, '') : '';
  return tuple(normalize(maargUrl), normalize(omsUrl), userId);
}

export function configureReceiving(connection?: ReceivingConnection) {
  if (connection && !sessionEnabled) return ready;
  if (connection && !receivingError.value && active?.scope === connection.scope && active.facilityId === connection.facilityId) {
    active = connection;
    return ready;
  }
  const currentGeneration = ++generation;
  sessionController.abort(); sessionController = new AbortController();
  sync?.syncService()?.stop();
  subscriptions.forEach(subscription => subscription.unsubscribe()); subscriptions = [];
  receivingDb.value?.close(); receivingOperations.value?.close();
  receivingDb.value = undefined; receivingOperations.value = undefined;
  active = connection; sync = undefined;
  syncingDomains.clear();
  corpus.value = { rows: [] }; coverage.value = undefined; receivingError.value = '';
  if (!connection) return ready = Promise.resolve();
  receivingCache.setOmsInstanceResolver(() => connection.scope);
  const db = receivingCache.get(connection.scope), operations = new ReceiptOperations(connection.scope);
  receivingDb.value = db; receivingOperations.value = operations;
  const bootstrap = setupAppDbSync({
    db: receivingCache,
    getWorkerUrl: () => new URL(receivingWorkerUrl, import.meta.url),
    createSyncService: options => createSyncService({ ...options, domains: domains(connection) }),
    onStatus: status => {
      if (currentGeneration !== generation || !status.domain || status.scope) return;
      if (status.type === 'sync-start') {
        if (![...syncingDomains.values()].some(domain => domain.running)) syncingDomains.clear();
        syncingDomains.set(status.domain, { completed: 0, total: 1, running: true });
      } else {
        const domain = syncingDomains.get(status.domain);
        if (!domain?.running) return;
        if (status.type === 'sync-progress') {
          domain.completed = status.completed;
          domain.total = status.total;
        } else if (['sync-end', 'sync-error', 'auth-error'].includes(status.type)) {
          domain.running = false;
          if (status.type === 'sync-end') domain.completed = domain.total;
        }
      }
    },
  });
  sync = bootstrap;
  ready = (async () => {
    await navigator.locks.request(receiptLock(connection.scope), () => importLegacyReceipts(connection.scope, operations));
    if (currentGeneration !== generation) return;
    await openReceivingDb(db);
    if (currentGeneration !== generation) return;
    subscriptions = [
      liveQuery(() => readListCorpus(db, connection.facilityId)).subscribe({
        next: value => { if (currentGeneration === generation) corpus.value = value; },
        error: () => { if (currentGeneration === generation) receivingError.value = 'Local transfer storage is unavailable.'; },
      }),
      liveQuery(() => readListSync(db, connection.facilityId)).subscribe({
        next: value => { if (currentGeneration === generation) coverage.value = value; },
        error: () => { if (currentGeneration === generation) receivingError.value = 'Local transfer status is unavailable.'; },
      }),
    ];
    await bootstrap.startAppDbSync();
    if (currentGeneration === generation && !bootstrap.syncService()) throw new Error('Storage startup failed');
  })().catch(() => {
    if (currentGeneration === generation) receivingError.value = 'Local transfer storage could not start. Refresh to retry.';
  });
  return ready;
}

async function session() {
  if (receivingError.value && active) await configureReceiving(active);
  const connection = active, db = receivingDb.value, operations = receivingOperations.value, bootstrap = sync;
  const signal = sessionController.signal;
  await new Promise<void>((resolve, reject) => {
    const changed = () => reject(new Error('Receiving session changed. Reopen the transfer before continuing.'));
    signal.addEventListener('abort', changed, { once: true });
    ready.then(resolve, reject).finally(() => signal.removeEventListener('abort', changed));
  });
  const check = () => {
    if (signal.aborted || !connection || connection.scope !== active?.scope || connection.facilityId !== active.facilityId || db !== receivingDb.value) {
      throw new Error('Receiving session changed. Reopen the transfer before continuing.');
    }
    if (receivingError.value) throw new Error(receivingError.value);
  };
  check();
  if (!db || !operations || !bootstrap?.syncService()) throw new Error('Select a receiving facility first.');
  return { connection: connection!, db, operations, bootstrap, check };
}

export async function getReceivingDb() { return (await session()).db; }
export async function searchReceiving(query: string, limit: number) { searchText.value = query; pageLimit.value = limit; }
export async function refreshReceiving() {
  const current = await session();
  // syncDomainNow waits for each domain even if an automatic tick is already running.
  const results = await Promise.allSettled(domains(current.connection).map(domain => current.bootstrap.syncService()!.syncDomainNow(domain.name)));
  current.check();
  for (const result of results) if (result.status === 'rejected') throw result.reason;
}
export async function resolveReceivingTracking(code: string) {
  const current = await session();
  const result = await findExactTracking(current.db, current.connection.facilityId, code);
  current.check(); return result;
}
export async function setActiveReceivingOrder(orderId?: string) {
  const current = await session();
  await current.bootstrap.syncService()!.setDomains(domains(current.connection, orderId));
}
export async function ensureReceivingOrder(orderId: string, force = false) {
  if (!orderId) throw new Error('Missing transfer ID');
  const current = await session(), pending = await current.operations.receipts.get(orderId);
  const state = await readCacheState(current.db, cacheKeys.hydrate(current.connection.facilityId, orderId));
  if (!force && !pending && state?.ready && Date.now() - (state.checkedAt || 0) < 120000) return;
  await current.bootstrap.syncService()!.refetchOne('receivingReceipt', { orderId, facilityId: current.connection.facilityId });
  if (pending?.state === 'confirmed') await clearReceiptOperation(current.operations, orderId, pending.operationId);
  current.check();
}
export async function ensureReceivingHistory(orderId: string) {
  const current = await session();
  await current.bootstrap.syncService()!.refetchOne('receivingHistory', { orderId, facilityId: current.connection.facilityId });
}
export async function loadReceivingTracking(orderIds: string[], onProgress?: (completed: number) => void) {
  const current = await session();
  let completed = 0;
  return Promise.all(orderIds.map(async orderId => {
    await current.bootstrap.syncService()!.refetchOne('receivingOrders', { orderId, facilityId: current.connection.facilityId, shipmentsOnly: true });
    current.check();
    const trackingCodes = trackingBadges(await current.db.table('transferPackages').where('[facilityId+orderId]').equals([current.connection.facilityId, orderId]).toArray());
    onProgress?.(++completed);
    return { orderId, trackingCodes };
  }));
}
export async function submitReceipt(orderId: string, payload: ReceiptPayload, baseline: Row[]) {
  const current = await session();
  const operation = { orderId, operationId: crypto.randomUUID(), state: 'unknown' as const,
    startedAt: Date.now(), payload: JSON.parse(JSON.stringify(payload)), baseline: JSON.parse(JSON.stringify(baseline)) };
  let response: any;
  await navigator.locks.request(receiptLock(current.connection.scope), async () => {
    current.check();
    if (payload.facilityId !== current.connection.facilityId) throw new Error('Receiving facility changed.');
    if (await current.operations.receipts.get(orderId)) throw new Error('Review the previous receipt before receiving again.');
    const latest: any = await api({ url: `oms/transferOrders/${encodeURIComponent(orderId)}`, method: 'get', baseURL: current.connection.maargUrl });
    current.check();
    if (commonUtil.hasError(latest) || !Array.isArray(latest.data?.order?.items)) throw new Error('Unable to validate current transfer quantities.');
    validateReceipt(operation.payload, operation.baseline, latest.data.order);
    await current.operations.receipts.put(operation);
    try {
      response = await api({ url: `poorti/transferOrders/${encodeURIComponent(orderId)}/receipts`, method: 'post', data: operation.payload, baseURL: current.connection.maargUrl });
    } catch (error: any) {
      if ([400, 401, 403, 404, 422].includes(error?.response?.status)) {
        await clearReceiptOperation(current.operations, orderId, operation.operationId);
        const message = error.response.data?.errors;
        throw new Error(typeof message === 'string' ? message : 'Receiving server rejected the receipt.');
      }
      throw new Error('Receipt could not be confirmed. Check receiving history before trying again.');
    }
    if (commonUtil.hasError(response)) {
      await clearReceiptOperation(current.operations, orderId, operation.operationId);
      throw new Error('Receiving server rejected the receipt.');
    }
    // A confirmed POST is never converted into a retryable submission failure.
    await current.operations.receipts.update(orderId, { state: 'confirmed' }).catch(() => undefined);
  });
  try {
    current.check();
    await current.bootstrap.refreshAfterMutation('receivingReceipt', { orderId, facilityId: payload.facilityId });
    await clearReceiptOperation(current.operations, orderId, operation.operationId);
    return { ...response, refreshed: true };
  } catch { return { ...response, refreshed: false }; }
}

export async function resolveReceipt(orderId: string, operationId: string) {
  const current = await session();
  const operation = await current.operations.receipts.get(orderId);
  if (operation?.payload && operation.payload.facilityId !== current.connection.facilityId) throw new Error('Switch to the receipt facility before resolving it.');
  await ensureReceivingOrder(orderId, true);
  await navigator.locks.request(receiptLock(current.connection.scope), async () => {
    current.check();
    const pending = await current.operations.receipts.get(orderId);
    if (pending?.operationId !== operationId) throw new Error('Receipt state changed. Review it again.');
    await clearReceiptOperation(current.operations, orderId, operationId);
  });
}
export async function clearReceivingSession() {
  sessionEnabled = false;
  const old = receivingDb.value, scope = active?.scope;
  if (scope) channel.postMessage({ type: 'logout', scope });
  void configureReceiving();
  if (old && scope) await navigator.locks.request(receiptLock(scope), async () => {
    // Session teardown closes this handle. Dexie does not auto-open an explicitly
    // closed database, so reopen it before AccxUI's shared transactional clear.
    try { await old.open(); await clearReceivingData(old); } finally { old.close(); }
  });
}
export function enableReceivingSession() { sessionEnabled = true; }
