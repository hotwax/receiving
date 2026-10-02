import { expose } from 'comlink';
import { createSyncHarness, type HarnessStartPayload } from '@common/db/sync/pollingWorkerHarness';
import { registerSyncDomain } from '@common/db/sync/syncRegistry';
import { dbClient } from '@common/db/storage/dbClient';
import { ReceivingApi, type ReceivingConnection } from './receivingApi';
import { receivingCache, cacheKeys, readCacheState, mergePendingPage, reconcilePending, reconcileOrderPending, replaceDetail, replaceOrderRows, replaceOrderShipments, replaceProducts, tuple, uniqueIds, type ReceivingDB, type Row, type CacheState } from './receivingDatabase';
import { receivingSchema } from './receivingSchema';
import { advancePendingPage } from './receivingPaging';
import { receiptLock } from './receiptOperations';
import type { SyncContext } from '@common/db/types';

let db: ReceivingDB, api: ReceivingApi;
const fence = () => { if (!db.isOpen()) throw new Error('Receiving session changed'); };
const harness = createSyncHarness(() => db);
const lock = <T>(action: () => Promise<T>, orderId?: string): Promise<T> =>
  navigator.locks.request(receiptLock(api.connection.scope), { mode: orderId ? 'shared' : 'exclusive' }, () =>
    orderId ? navigator.locks.request(tuple(db.name, orderId), action) : action());

async function status(key: string, data: Omit<CacheState, 'key'>) {
  await db.syncMeta.put({ ...data, key } satisfies CacheState);
}

function progress(domain: string, completed: number, total: number) {
  self.postMessage({ type: 'sync-progress', domain, completed, total });
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

async function enrichReceivers(receipts: Row[]) {
  const ids = uniqueIds(receipts.map(row => row.receivedByUserLoginId));
  const old = await db.table('receivingUsers').bulkGet(ids);
  const missing = ids.filter((_id, i) => !old[i] || Date.now() - old[i].fetchedAt > 86400000);
  for (let i = 0; i < missing.length; i += 50) {
    const users = await api.users(missing.slice(i, i + 50));
    await dbClient(db, receivingSchema.entities).entity('receivingUsers').upsertMany(users.map(user => ({
      userLoginId: user.userLoginId, fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.userLoginId,
      fetchedAt: Date.now(),
    })));
  }
}

async function hydrateOrder(orderId: string, force = false) {
  const hydrateKey = cacheKeys.hydrate(api.connection.facilityId, orderId);
  const state = await readCacheState(db, hydrateKey);
  await hydrateShipments(orderId, force);
  if (!force && state?.ready && Date.now() - (state.checkedAt || 0) < 120000) return;
  try {
    const detailState = await readCacheState(db, cacheKeys.detail(orderId));
    let items: Row[];
    if (force || !detailState?.ready || Date.now() - (detailState.checkedAt || 0) >= 120000) {
      const order = await api.detail(orderId);
      await replaceDetail(db, order, fence);
      items = order.items;
    } else items = await db.table('transferItems').where('orderId').equals(orderId).toArray();
    const misState = await readCacheState(db, cacheKeys.receipts('transferMisShippedReceipts', orderId));
    const misShipped = force || !misState?.ready || Date.now() - (misState.checkedAt || 0) >= 120000
      ? await api.receipts(orderId, false) : undefined;
    if (misShipped) await replaceOrderRows(db, 'transferMisShippedReceipts', orderId, misShipped, fence);
    const receipts = misShipped || await db.table('transferMisShippedReceipts').where('orderId').equals(orderId).toArray();
    const coverage = await hydrateProducts([
      ...items.filter(row => row.orderFacilityId === api.connection.facilityId),
      ...receipts.filter(row => !row.facilityId || row.facilityId === api.connection.facilityId),
    ].map(row => row.productId));
    const unresolved = coverage.missingProductIds.length || coverage.unresolvedProductIds.length;
    await status(hydrateKey, { ready: !unresolved, ...coverage, checkedAt: Date.now() });
  } catch (error) {
    await status(hydrateKey, { ...state, error: 'Unable to refresh transfer data' });
    throw error;
  }
}

async function hydrateShipments(orderId: string, force = false) {
  const facilityId = api.connection.facilityId, key = cacheKeys.shipments(facilityId, orderId);
  const state = await readCacheState(db, key);
  if (!force && state?.ready && Date.now() - (state.checkedAt || 0) < 120000) return;
  try {
    await replaceOrderShipments(db, orderId, facilityId, await api.shipments(orderId), fence);
  } catch {
    // Optional box enrichment must not prevent order quantities or identifiers refreshing.
    await status(key, { ...state, error: 'Unable to refresh shipment contents. Refresh to retry.' });
  }
}

async function hydrateHistory(orderId: string, force = false) {
  const key = cacheKeys.receipts('transferReceiptGroups', orderId);
  const state = await readCacheState(db, key);
  if (!force && state?.ready && Date.now() - (state.checkedAt || 0) < 120000) return;
  let receipts: Row[];
  try {
    receipts = await api.receipts(orderId, true);
    await replaceOrderRows(db, 'transferReceiptGroups', orderId, receipts, fence);
  } catch (error) {
    await status(key, { ...state, error: 'Unable to refresh receiving history.' });
    throw error;
  }
  const misShipped = await db.table('transferMisShippedReceipts').where('orderId').equals(orderId).toArray();
  // Receiver labels are optional enrichment; a failed lookup must not hide receipt history.
  try { await enrichReceivers([...receipts, ...misShipped]); }
  catch { /* User labels are optional; keep the receiver login ID available. */ }
}

async function syncPending() {
  const facilityId = api.connection.facilityId, key = cacheKeys.facility(facilityId);
  const previous = await readCacheState(db, key);
  const orderIds = new Set<string>(), pageSignatures = new Set<string>();
  let pageIndex = 0;
  try {
    const candidateCount = await api.pendingCandidateCount();
    // Count discovery, every candidate page (including filtered-empty pages),
    // and the final count check. The first response establishes the denominator.
    const total = Math.max(1, Math.ceil(candidateCount / 100)) + 2;
    progress('receivingMembership', 1, total);
    for (;;) {
      const page = await api.pendingPage(pageIndex);
      const cursor = advancePendingPage(page, pageIndex, pageSignatures, candidateCount);
      await mergePendingPage(db, page.orders, facilityId, fence);
      progress('receivingMembership', pageIndex + 2, total);
      for (const order of page.orders) orderIds.add(order.orderId);
      if (cursor.complete) {
        if (await api.pendingCandidateCount() !== candidateCount) throw new Error('Transfer candidates changed during sync');
        await reconcilePending(db, [...orderIds], facilityId, fence);
        progress('receivingMembership', total, total);
        break;
      }
      pageIndex = cursor.next!;
    }
  } catch (error) {
    await status(key, { ...previous, complete: false, error: 'Unable to refresh transfers; showing saved data.', checkedAt: Date.now() });
    throw error;
  }
  return [...orderIds];
}

async function refreshOrderMembership(orderId: string) {
  // Eligibility filtering is order-wide. With an exact orderId, an empty first page means that
  // order is ineligible even on the legacy contract; other orders cannot hide it on later pages.
  const page = await api.pendingPage(0, orderId);
  await mergePendingPage(db, page.orders, api.connection.facilityId, fence);
  await reconcileOrderPending(db, orderId, api.connection.facilityId, !!page.orders.length, fence);
}

// The shared harness owns cadence, coalescing, errors, token updates and teardown.
// These adapters own only Receiving's API scopes and bounded per-order hydration.
async function refreshOrders(ctx: SyncContext, args: unknown, force: boolean, history = false) {
  api.connection.token = ctx.token;
  const ids = uniqueIds([...(await db.table('transferOrders').where('pendingReceiptFacilityIds').equals(api.connection.facilityId).primaryKeys()), (args as { activeOrder?: string } | undefined)?.activeOrder]);
  const domain = history ? 'receivingHistory' : 'receivingOrders';
  let completed = 0;
  progress(domain, completed, ids.length);
  let failure: unknown;
  for (let i = 0; i < ids.length; i += 3) {
    const results = await Promise.allSettled(ids.slice(i, i + 3).map(id =>
      lock(() => history ? hydrateHistory(id, force) : hydrateOrder(id, force), id)
        .finally(() => progress(domain, ++completed, ids.length))));
    for (const result of results) if (result.status === 'rejected') failure = result.reason;
  }
  if (failure) throw failure;
  return ids.length;
}
registerSyncDomain({ name: 'receivingMembership', label: 'Pending transfers', syncClass: 'A', intervalMs: 30000,
  sync: ctx => { api.connection.token = ctx.token; return lock(async () => (await syncPending()).length); } });
registerSyncDomain({ name: 'receivingOrders', label: 'Transfer items and shipments', syncClass: 'A', intervalMs: 30000,
  sync: (ctx, args, options) => refreshOrders(ctx, args, !!options?.force),
  refetchOne: (ctx, pk) => {
    api.connection.token = ctx.token;
    if (!pk.orderId || pk.facilityId !== api.connection.facilityId) throw new Error('Invalid transfer scope');
    return lock(async () => { await (pk.shipmentsOnly ? hydrateShipments(String(pk.orderId), true) : hydrateOrder(String(pk.orderId), true)); return 1; }, String(pk.orderId));
  } });
registerSyncDomain({ name: 'receivingHistory', label: 'Receiving history', syncClass: 'A', intervalMs: 120000,
  sync: (ctx, args, options) => refreshOrders(ctx, args, !!options?.force, true),
  refetchOne: (ctx, pk) => {
    api.connection.token = ctx.token;
    if (!pk.orderId || pk.facilityId !== api.connection.facilityId) throw new Error('Invalid transfer scope');
    return lock(async () => { await hydrateHistory(String(pk.orderId), true); return 1; }, String(pk.orderId));
  } });
registerSyncDomain({ name: 'receivingReceipt', label: 'Receipt readback', syncClass: 'C',
  sync: async () => 0,
  refetchOne: async (ctx, pk) => {
    if (typeof pk.orderId !== 'string' || !pk.orderId || pk.facilityId !== api.connection.facilityId) throw new Error('Invalid receipt refresh scope');
    api.connection.token = ctx.token;
    const orderId = pk.orderId;
    return lock(async () => {
      const results = await Promise.allSettled([hydrateOrder(orderId, true), hydrateHistory(orderId, true), refreshOrderMembership(orderId)]);
      for (const result of results) if (result.status === 'rejected') throw result.reason;
      return 1;
    }, orderId);
  },
});

expose({
  ...harness,
  async start(payload: HarnessStartPayload) {
    const connection = payload.domains?.[0]?.args as ReceivingConnection;
    if (!connection?.scope || !connection.facilityId) throw new Error('Select a receiving facility first.');
    db = receivingCache.get(connection.scope);
    api = new ReceivingApi({ ...connection, token: payload.token, maargUrl: payload.maargUrl }, fence);
    // Open saved data before the first full-store sync; warm navigation never waits for it.
    await harness.start({ ...payload, domains: [] });
    harness.setDomains(payload.domains!);
    void harness.syncDomainNow('receivingMembership').catch(() => undefined); // The harness reports domain errors.
  },
});
