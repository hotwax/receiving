import { expose } from 'comlink';
import { liveQuery } from 'dexie';
import { createSyncHarness } from '@common/db/sync/pollingWorkerHarness';
import { registerSyncDomain } from '@common/db/sync/syncRegistry';
import { ReceivingApi, ReceivingRequestError, type ReceivingConnection } from './receivingApi';
import { ReceivingDB, openReceivingDb, mergePendingPage, reconcilePending, reconcileOrderPending, replaceDetail, replaceOrderRows, replaceOrderShipments, replaceProducts, tuple, uniqueIds, type Row } from './receivingDatabase';
import { filterList, readListCorpus, readListSync, trackingBadges } from './receivingQueries';
import { advancePendingPage } from './receivingPaging';
import { createReceivingQueue } from './receivingQueue';
import { createReceivingSync } from './receivingSync';

let db: ReceivingDB, api: ReceivingApi, stopped = false;
let listSubscription: { unsubscribe(): void } | undefined;
let syncSubscription: { unsubscribe(): void } | undefined;
let corpus: Awaited<ReturnType<typeof readListCorpus>> = { rows: [] };
let listSync: Row | undefined;
let listError: string | undefined;
let filteredList: ReturnType<typeof filterList> = { list: [], total: 0 };
let listCallback: ((value: any) => void) | undefined;
let search = '', limit = 20;
const fence = () => { if (stopped) throw new Error('Receiving session changed'); };
const enqueue = createReceivingQueue(() => db.name, fence);
const harness = createSyncHarness(() => db);
const sessionChannel = new BroadcastChannel('receiving-session');
sessionChannel.onmessage = event => {
  if (event.data?.type === 'logout' && event.data?.scope === api?.connection.scope) {
    stopped = true; harness.stop(); listSubscription?.unsubscribe(); syncSubscription?.unsubscribe();
  }
};

async function status(key: string, data: Row) {
  fence();
  await db.transaction('rw', db.syncMeta, async () => { fence(); await db.syncMeta.put({ key, ...data }); });
}

function failedState(previous: Row | undefined, error: string): Row {
  const failures = (previous?.failures || 0) + 1;
  return { ...previous, error, failures, failedAt: Date.now(), retryAfter: Date.now() + Math.min(300000, 30000 * 2 ** Math.min(failures - 1, 4)) };
}

async function hydrateProducts(ids: string[], force = false) {
  return navigator.locks.request(tuple(db.name, 'product-hydration'), async () => {
    fence();
    const unique = uniqueIds(ids);
    const existing = await db.table('products').bulkGet(unique);
    const missing = unique.filter((_id, i) => force || !existing[i] ||
      existing[i].identifierConflict && !existing[i].canonicalDocument || Date.now() - existing[i].updatedAt > 24 * 60 * 60 * 1000);
    const documents = missing.length ? await api.products(missing) : [];
    if (documents.length) await replaceProducts(db, documents, fence);
    const products = await db.table('products').bulkGet(unique);
    return {
      missingProductIds: missing.filter(id => !documents.some(row => row.productId === id)),
      conflictingProductIds: products.filter(row => row?.identifierConflict).map(row => row!.productId),
      unresolvedProductIds: products.filter(row => row?.identifierConflict && !row.canonicalDocument).map(row => row!.productId),
    };
  });
}

const receiverLookups = new Set<string>();
async function enrichReceivers(receipts: Row[]) {
  const ids = uniqueIds(receipts.map(row => row.receivedByUserLoginId));
  const old = await db.table('receivingUsers').bulkGet(ids);
  const missing = ids.filter((id, i) => !receiverLookups.has(id) && (!old[i] ||
    Date.now() >= (old[i].retryAfter || 0) && (!old[i].fetchedAt || Date.now() - old[i].fetchedAt > 24 * 60 * 60 * 1000)));
  missing.forEach(id => receiverLookups.add(id));
  try {
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    try {
      const users = await api.users(batch);
      const byId = new Map(users.map(user => [user.userLoginId, user]));
      await db.transaction('rw', db.table('receivingUsers'), async () => {
        fence();
        for (const userLoginId of batch) {
          const raw = byId.get(userLoginId);
          const previous = await db.table('receivingUsers').get(userLoginId);
          await db.table('receivingUsers').put(raw ? {
            userLoginId, partyId: raw.partyId, statusId: raw.statusId, firstName: raw.firstName, lastName: raw.lastName,
            fullName: [raw.firstName, raw.lastName].filter(Boolean).join(' ') || userLoginId,
            fetchedAt: Date.now(), lastReferencedAt: Date.now(),
          } : { ...previous, userLoginId, fetchedAt: previous?.fetchedAt || 0, lastReferencedAt: Date.now(), retryAfter: Date.now() + 300000 });
        }
        fence();
      });
    } catch (error) {
      await db.transaction('rw', db.table('receivingUsers'), async () => {
        fence();
        for (const userLoginId of batch) {
          const previous = await db.table('receivingUsers').get(userLoginId);
          await db.table('receivingUsers').put({ ...failedState(previous, 'Receiver name unavailable'), userLoginId, lastReferencedAt: Date.now() });
        }
        fence();
      });
      throw error;
    }
  }
  } finally { missing.forEach(id => receiverLookups.delete(id)); }
}

async function hydrateOrder(orderId: string, force = false) {
  const hydrateKey = tuple('hydrate', api.connection.facilityId, orderId);
  const state = await db.syncMeta.get(hydrateKey);
  await hydrateShipments(orderId, force);
  if (!force && state?.retryAfter > Date.now()) return;
  if (!force && state?.ready && Date.now() - state.checkedAt < 120000) return;
  try {
    const detailState = await db.syncMeta.get(tuple('detail', orderId));
    let items: Row[];
    if (force || !detailState?.ready || Date.now() - detailState.checkedAt >= 120000) {
      const order = await api.detail(orderId);
      await replaceDetail(db, order, fence);
      items = order.items;
    } else items = await db.table('transferItems').where('orderId').equals(orderId).toArray();
    const misState = await db.syncMeta.get(tuple('transferMisShippedReceipts', orderId, ''));
    const misShipped = force || !misState?.ready || Date.now() - misState.checkedAt >= 120000
      ? await api.receipts(orderId, false) : undefined;
    if (misShipped) await replaceOrderRows(db, 'transferMisShippedReceipts', orderId, misShipped, fence);
    const receipts = misShipped || await db.table('transferMisShippedReceipts').where('orderId').equals(orderId).toArray();
    const coverage = await hydrateProducts([
      ...items.filter(row => row.orderFacilityId === api.connection.facilityId),
      ...receipts.filter(row => row.facilityId === api.connection.facilityId),
    ].map(row => row.productId), force);
    const unresolved = coverage.missingProductIds.length || coverage.unresolvedProductIds.length;
    await status(hydrateKey, { ready: !unresolved, ...coverage, checkedAt: Date.now(), retryAfter: unresolved ? Date.now() + 30000 : 0 });
  } catch (error) {
    await status(hydrateKey, failedState(state, 'Unable to refresh transfer data'));
    throw error;
  }
}

async function hydrateShipments(orderId: string, force = false) {
  const facilityId = api.connection.facilityId, key = tuple('shipments', facilityId, orderId);
  const state = await db.syncMeta.get(key);
  if (!force && (state?.retryAfter > Date.now() || state?.ready && Date.now() - state.checkedAt < 120000)) return;
  try {
    await replaceOrderShipments(db, orderId, facilityId, await api.shipments(orderId), fence);
  } catch {
    // Optional box enrichment must not prevent order quantities or identifiers refreshing.
    await status(key, failedState(state, 'Unable to refresh shipment contents. Refresh to retry.'));
  }
}

async function hydrateHistory(orderId: string, force = false) {
  const key = tuple('transferReceiptGroups', orderId, '');
  const state = await db.syncMeta.get(key);
  if (!force && state?.retryAfter > Date.now()) return;
  if (!force && state?.ready && Date.now() - state.checkedAt < 120000) return;
  let receipts: Row[];
  try {
    receipts = await api.receipts(orderId, true);
    await replaceOrderRows(db, 'transferReceiptGroups', orderId, receipts, fence);
  } catch (error) {
    await status(key, failedState(state, 'Unable to refresh receiving history.'));
    throw error;
  }
  const misShipped = await db.table('transferMisShippedReceipts').where('orderId').equals(orderId).toArray();
  // Receiver labels are optional enrichment; a failed lookup must not hide receipt history.
  try { await enrichReceivers([...receipts, ...misShipped]); }
  catch { await status(tuple('users', orderId), { error: 'Receiver names unavailable', checkedAt: Date.now() }); }
}

async function syncPending() {
  const facilityId = api.connection.facilityId, key = tuple('facility', facilityId);
  const previous = await db.syncMeta.get(key);
  await status(key, { ...previous, syncing: true, error: undefined });
  const orderIds = new Set<string>(), pageSignatures = new Set<string>();
  let pageIndex = 0;
  try {
    const candidateCount = await api.pendingCandidateCount();
    for (;;) {
      const page = await api.pendingPage(pageIndex);
      const cursor = advancePendingPage(page, pageIndex, pageSignatures, candidateCount);
      await mergePendingPage(db, page.orders, facilityId, fence);
      for (const order of page.orders) orderIds.add(order.orderId);
      if (cursor.complete) {
        if (await api.pendingCandidateCount() !== candidateCount) throw new Error('Transfer candidates changed during sync');
        await reconcilePending(db, [...orderIds], facilityId, fence);
        break;
      }
      pageIndex = cursor.next!;
    }
  } catch (error) {
    await status(key, { ...previous, syncing: false, complete: false, error: 'Unable to refresh transfers; showing saved data.', checkedAt: Date.now() });
    throw error;
  }
  return [...orderIds];
}

const refreshLoop = createReceivingSync({
  membership: () => enqueue(async () => {
    await syncPending();
    try { await pruneReceiverNames(); }
    catch { if (!stopped) await status(tuple('receiverRetention'), { error: 'Receiver cleanup deferred', checkedAt: Date.now() }); }
  }, true),
  pendingIds: async () => (await db.table('transferOrders').where('pendingReceiptFacilityIds').equals(api.connection.facilityId).primaryKeys()).map(String),
  detail: orderId => enqueue(() => hydrateOrder(orderId), false, orderId),
  history: orderId => enqueue(() => hydrateHistory(orderId), false, orderId),
  stopped: () => stopped,
});

async function refreshOrderMembership(orderId: string) {
  // Eligibility filtering is order-wide. With an exact orderId, an empty first page means that
  // order is ineligible even on the legacy contract; other orders cannot hide it on later pages.
  const page = await api.pendingPage(0, orderId);
  await mergePendingPage(db, page.orders, api.connection.facilityId, fence);
  await reconcileOrderPending(db, orderId, api.connection.facilityId, !!page.orders.length, fence);
}

async function pruneReceiverNames() {
  const key = tuple('receiverRetention');
  if (Date.now() - ((await db.syncMeta.get(key))?.checkedAt || 0) < 86400000) return;
  await db.transaction('rw', ['receivingUsers', 'transferReceiptGroups', 'transferMisShippedReceipts', 'syncMeta'], async () => {
    fence();
    const old = await db.table('receivingUsers').filter(row => (row.lastReferencedAt || 0) < Date.now() - 7 * 86400000).primaryKeys();
    if (old.length) {
      const referenced = new Set<string>();
      await db.table('transferReceiptGroups').each(row => { if (row.receivedByUserLoginId) referenced.add(row.receivedByUserLoginId); });
      await db.table('transferMisShippedReceipts').each(row => { if (row.receivedByUserLoginId) referenced.add(row.receivedByUserLoginId); });
      await db.table('receivingUsers').bulkDelete(old.filter(id => !referenced.has(String(id))));
    }
    await db.syncMeta.put({ key, checkedAt: Date.now() });
    fence();
  });
}

registerSyncDomain({ name: 'receiving', label: 'Transfers pending receipt', syncClass: 'A', intervalMs: 30000, sync: () => refreshLoop.sync() });

function publishList(updateRows = false) {
  if (updateRows) filteredList = filterList(corpus, search, limit);
  listCallback?.({ ...filteredList, sync: listError ? { ...listSync, error: listError } : listSync });
}

const worker = {
  async start(connection: ReceivingConnection) {
    stopped = false;
    db = new ReceivingDB(connection.scope);
    // Open explicitly first: storage errors preserve the last-good database; no destructive rebuild.
    await openReceivingDb(db);
    api = new ReceivingApi(connection, fence);
    listSubscription = liveQuery(() => readListCorpus(db, connection.facilityId)).subscribe({
      next(value) { corpus = value; listError = undefined; publishList(true); },
      error() { corpus = { rows: [] }; listError = 'Local transfer storage is unavailable.'; publishList(true); },
    });
    syncSubscription = liveQuery(() => readListSync(db, connection.facilityId)).subscribe({
      next(value) { listSync = value; publishList(); },
      error() { listSync = { error: 'Local transfer status is unavailable.' }; publishList(); },
    });
    void harness.start({ token: connection.token, maargUrl: connection.maargUrl, omsInstance: connection.scope, domains: [{ name: 'receiving' }], baseTickMs: 30000 })
      .catch(() => listCallback?.({ list: [], total: 0, sync: { error: 'Transfer refresh could not start. Refresh to retry.' } }));
  },
  watchList(callback: (value: any) => void) { listCallback = callback; publishList(); },
  search(query: string, pageLimit: number) { search = query; limit = pageLimit; publishList(true); },
  setActiveOrder(orderId?: string) { refreshLoop.setActiveOrder(orderId); },
  async ensureOrder(orderId: string, force = false) {
    try {
      await enqueue(async () => {
        const pending = await db.syncMeta.get(tuple('receiptReadback', orderId));
        await hydrateOrder(orderId, force || pending?.pending);
        if (pending?.pending) {
          await hydrateHistory(orderId, true);
          await refreshOrderMembership(orderId);
          // A GET cannot prove whether an unacknowledged POST committed. Keep that receipt blocked.
          await status(tuple('receiptReadback', orderId), { ...pending, pending: !pending.confirmedAt, checkedAt: Date.now() });
        }
      }, true, orderId);
    } finally {
      if (!stopped) void enqueue(() => hydrateHistory(orderId, force), false, orderId).catch(() => undefined);
    }
  },
  async history(orderId: string) { await enqueue(() => hydrateHistory(orderId), true, orderId); },
  async orderTracking(orderIds: string[]) {
    return Promise.all(uniqueIds(orderIds).map(orderId => enqueue(async () => {
      await hydrateShipments(orderId);
      const packages = await db.table('transferPackages').where('[facilityId+orderId]').equals([api.connection.facilityId, orderId]).toArray();
      return { orderId, trackingCodes: trackingBadges(packages) };
    }, false, orderId)));
  },
  async refresh() { await refreshLoop.sync(true); },
  // Keep request credentials scoped to this session. The shared harness owns its
  // own token-channel subscription; it no longer exposes updateToken().
  updateToken(token: string) { api.connection.token = token; },
  async receive(orderId: string, payload: Row, baseline: Row[]) {
    return enqueue(async () => {
      // Refresh before submitting, while holding the cross-tab writer lock.
      const latest = await api.detail(orderId);
      await replaceDetail(db, latest, fence);
      const mutationState = await db.syncMeta.get(tuple('receiptReadback', orderId));
      if (mutationState?.pending) throw new Error('The previous receipt needs a refresh before you can receive again.');
      if (payload.facilityId !== api.connection.facilityId) throw new Error('Receiving facility changed.');
      for (const item of payload.items) {
        if (!item.orderItemSeqId) continue;
        const current = latest.items.find((row: Row) => row.orderItemSeqId === item.orderItemSeqId);
        const original = baseline.find(row => row.orderItemSeqId === item.orderItemSeqId);
        if (!current || !original || current.orderFacilityId !== payload.facilityId ||
            ['statusId', 'quantity', 'totalIssuedQuantity', 'totalReceivedQuantity'].some(field => String(current[field] ?? 0) !== String(original[field] ?? 0))) {
          throw new Error('This transfer changed. Review the refreshed quantities before receiving.');
        }
      }
      const readbackKey = tuple('receiptReadback', orderId);
      // Record the in-flight mutation before sending it. Even a lost acknowledgement must block a retry.
      await status(readbackKey, { pending: true, startedAt: Date.now() });
      let body: Row;
      try {
        ({ body } = await api.request(`poorti/transferOrders/${encodeURIComponent(orderId)}/receipts`, {}, payload));
      } catch (error) {
        if (error instanceof ReceivingRequestError && error.status >= 400 && error.status < 500) {
          await status(readbackKey, { pending: false, checkedAt: Date.now() });
          throw error;
        }
        throw new Error('Receipt outcome is unknown. Refresh and check receiving history before trying again.');
      }
      let refreshed = false;
      try {
        await status(readbackKey, { pending: true, confirmedAt: Date.now() });
        await hydrateOrder(orderId, true);
        await hydrateHistory(orderId, true);
        await refreshOrderMembership(orderId);
        await status(readbackKey, { pending: false, checkedAt: Date.now() });
        refreshed = true;
      } catch { /* A confirmed receipt must never be presented as a failed POST or retried. */ }
      return { status: 200, data: body, refreshed };
    }, true);
  },
  async stop() { stopped = true; harness.stop(); listSubscription?.unsubscribe(); syncSubscription?.unsubscribe(); listCallback = undefined; db?.close(); },
};
export type ReceivingWorker = typeof worker;
expose(worker);
