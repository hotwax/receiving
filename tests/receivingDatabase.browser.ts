// Run from the local Vite app to check real IndexedDB transactions and liveQuery invalidation.
// Uses an isolated disposable database; it never calls an OMS API or reads the signed-in user's DB.
import { liveQuery } from 'dexie';
import { wrap } from 'comlink';
import { ReceivingDB, mergePendingPage, reconcilePending, reconcileOrderPending, replaceDetail, replaceOrderShipments, replaceOrderRows, replaceProducts, tuple } from '../src/db/receivingDatabase';
import { findExactTracking, findIdentifierProducts, readDetail, readHistory, readListCorpus, readListSync } from '../src/db/receivingQueries';

export async function checkReceivingDatabase() {
  const scope = `browser-check-${crypto.randomUUID()}`;
  const db = new ReceivingDB(scope);
  const passed: string[] = [];
  const fence = () => {};
  const check = (ok: unknown, label: string) => { if (!ok) throw new Error(label); passed.push(label); };
  let subscription: { unsubscribe(): void } | undefined;
  let writer: Worker | undefined;
  try {
    await db.open();
    const listRecord = { orderId: 'T1', orderStatusId: 'ORDER_APPROVED', orderDate: 1000, facilityId: 'ORIGIN', orderFacilityId: 'A' };
    await mergePendingPage(db, [listRecord, { ...listRecord, facilityId: 'ORIGIN_2' }], 'A', fence);
    await mergePendingPage(db, [{ ...listRecord, orderFacilityId: 'B' }], 'B', fence);
    const shared = await db.table('transferOrders').get('T1');
    check(shared.pendingReceiptFacilityIds.length === 2 && shared.originFacilityIds.length === 2, 'Repeated list rows merge facility arrays');
    await replaceDetail(db, { orderId: 'T1', statusId: 'ORDER_APPROVED', items: [
      { orderItemSeqId: '01', statusId: 'ITEM_APPROVED', productId: 'P1', orderFacilityId: 'A', facilityId: 'ORIGIN', quantity: 5, totalIssuedQuantity: 5, totalReceivedQuantity: 0 },
      { orderItemSeqId: '02', statusId: 'ITEM_APPROVED', productId: 'P2', orderFacilityId: 'B', facilityId: 'ORIGIN_2', quantity: 3, totalIssuedQuantity: 3, totalReceivedQuantity: 0 },
    ] }, fence);
    const detail = await readDetail(db, 'T1', 'A');
    check(detail?.items.length === 1 && detail.items[0].productId === 'P1', 'Detail only includes selected destination lines');
    check(detail?.orderDate === 1000 && detail.pendingReceiptFacilityIds.length === 2, 'Detail preserves list date and pending facilities');

    let latest: any;
    let resolveUpdate: (() => void) | undefined;
    subscription = liveQuery(() => readListCorpus(db, 'A')).subscribe(value => { latest = value; resolveUpdate?.(); });
    async function nextWrite(write: () => Promise<unknown>) {
      let timer: ReturnType<typeof setTimeout>;
      const changed = new Promise<void>((resolve, reject) => {
        resolveUpdate = resolve;
        timer = setTimeout(() => reject(new Error('liveQuery did not update')), 5000);
      });
      try { await write(); await changed; }
      finally { clearTimeout(timer!); resolveUpdate = undefined; }
    }
    await nextWrite(async () => {
      await replaceProducts(db, [{ productId: 'P1', productName: 'Blue shirt', goodIdentifications: ['UPCA/001', 'UPCA/002'] }], fence);
    });
    // A live query may have emitted its initial result before the write. Wait for the product result.
    if (!latest.rows[0]?.search.includes('blue shirt')) await nextWrite(() => db.table('products').update('P1', { productName: 'Blue shirt updated' }));
    check(latest.rows[0].search.includes('blue shirt'), 'New product data refreshes live list joins');
    writer = new Worker(new URL('./receivingDatabase.worker.ts', import.meta.url), { type: 'module' });
    const remote = wrap<{ writeProduct(scope: string): Promise<void>; checkQueue(scope: string): Promise<{ maximum: number; events: string[] }> }>(writer);
    await nextWrite(() => remote.writeProduct(scope));
    check(latest.rows[0].search.includes('worker refreshed shirt'), 'Worker Dexie writes invalidate main-thread liveQuery');
    const queue = await remote.checkQueue(scope);
    check(queue.maximum === 3 && queue.events[3] === 'receipt-commit' && queue.events[4] === 'later-poll', 'Three reads run concurrently and receipt commits fence earlier and later polls');
    check(JSON.stringify(await findIdentifierProducts(db, 'UPCA', '002')) === '["P1"]', 'Barcode index matches a second identifier of the same type');
    check((await findIdentifierProducts(db, 'UPCA', 'MISSING')).length === 0, 'Unknown barcode has no product matches');
    await replaceProducts(db, [{ productId: 'P1', productName: 'Blue shirt', goodIdentifications: ['SKU/NEW'] }], fence);
    check(await db.table('productIdentification').where('[identKey+value]').equals(['UPCA', '001']).count() === 0, 'Product refresh removes obsolete identifiers');
    await replaceOrderRows(db, 'transferPackages', 'T1', [
      { packageKey: tuple('S1', '01'), orderId: 'T1', facilityId: 'A', trackingCode: '000TRACK', raw: {} },
      { packageKey: tuple('S1', '02'), orderId: 'T1', facilityId: 'A', trackingCode: '000TRACK', raw: {} },
    ], fence, 'A');
    check((await findExactTracking(db, 'A', '000TRACK')).length === 1, 'Tracking lookup deduplicates packages without dropping matches');
    await replaceOrderRows(db, 'transferPackages', 'ARCHIVE', [{ packageKey: 'archive', orderId: 'ARCHIVE', facilityId: 'A', snapshotScope: 'order', raw: {} }], fence, 'A');
    await replaceOrderShipments(db, 'T1', 'A', { packages: [{ packageKey: 'active', orderId: 'T1', facilityId: 'A', trackingCode: 'TRACK2', raw: {} }], items: [] }, fence);
    check(!!(await db.table('transferPackages').get('archive')) && !!(await db.table('transferPackages').get('active')), 'Order package refresh preserves explicit archive lookups');
    await reconcileOrderPending(db, 'T1', 'A', false, fence);
    check(JSON.stringify((await db.table('transferOrders').get('T1')).pendingReceiptFacilityIds) === '["B"]', 'Targeted receipt reconciliation preserves other facility memberships');
    await reconcileOrderPending(db, 'T1', 'A', true, fence);
    await replaceOrderRows(db, 'transferReceiptGroups', 'T1', [
      { receiptGroupKey: 'old', orderId: 'T1', orderItemSeqId: '01', receivedAtSort: 100, raw: { datetimeReceived: 100 } },
      { receiptGroupKey: 'new', orderId: 'T1', orderItemSeqId: '01', receivedAtSort: 200, raw: { datetimeReceived: 200 } },
      { receiptGroupKey: 'other-facility', orderId: 'T1', orderItemSeqId: '02', receivedAtSort: 300, raw: { datetimeReceived: 300 } },
    ], fence);
    const history = await readHistory(db, 'T1', 'A');
    check(history.items.length === 2 && history.items[0].datetimeReceived === 200, 'History is destination-scoped and newest first');
    await db.syncMeta.put({ key: tuple('receiptReadback', 'T1'), pending: true });
    const ambiguous = await readDetail(db, 'T1', 'A');
    check(ambiguous?.needsReadback && !ambiguous.receiptConfirmed && ambiguous.cacheError?.includes('unknown'), 'An unacknowledged receipt is blocked without claiming success');
    await db.syncMeta.put({ key: tuple('facility', 'A'), complete: true });
    check(!(await readListSync(db, 'A'))?.downloadComplete, 'Membership completeness alone does not claim detail coverage');
    await db.syncMeta.delete(tuple('shipments', 'A', 'T1'));
    await db.syncMeta.put({ key: tuple('hydrate', 'A', 'T1'), ready: true });
    check(!(await readListSync(db, 'A'))?.downloadComplete, 'Detail hydration alone does not claim box contents are downloaded');
    await db.syncMeta.put({ key: tuple('shipments', 'A', 'T1'), ready: true });
    check((await readListSync(db, 'A'))?.downloadComplete, 'Coverage requires membership, detail hydration and shipment contents');
    try { await mergePendingPage(db, [{ ...listRecord, orderId: 'T2' }], 'A', () => { throw new Error('scope changed'); }); } catch { /* Expected. */ }
    check(!(await db.table('transferOrders').get('T2')), 'A fenced write commits no records');
    await reconcilePending(db, [], 'B', fence);
    check(JSON.stringify((await db.table('transferOrders').get('T1')).pendingReceiptFacilityIds) === '["A"]', 'Reconciliation removes only the selected facility');
    subscription.unsubscribe(); subscription = undefined;
    db.close(); await db.open();
    check((await readDetail(db, 'T1', 'A'))?.items.length === 1, 'Reopened database reconstructs detail without network');
    return { passed };
  } finally {
    subscription?.unsubscribe();
    writer?.terminate();
    await db.delete();
  }
}
