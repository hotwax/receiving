// Real IndexedDB measurements against disposable fixtures. No OMS requests or user-cache writes.
import { liveQuery } from 'dexie';
import { ReceivingDB, mergePendingPage, reconcilePending, replaceDetail, replaceOrderRows, replaceOrderShipments, replaceProducts, tuple } from '../src/db/receivingDatabase';
import { findIdentifierProducts, readListCorpus, readListSync } from '../src/db/receivingQueries';

export async function checkReceivingPerformance() {
  const db = new ReceivingDB(`performance-check-${crypto.randomUUID()}`), fence = () => {};
  const passed: string[] = [], check = (ok: unknown, label: string) => { if (!ok) throw new Error(label); passed.push(label); };
  const settle = () => new Promise(resolve => setTimeout(resolve, 100));
  let subscription: { unsubscribe(): void } | undefined;
  const reads = { items: 0, packages: 0 }, writes: Record<string, number> = {};
  let evaluations = 0, latest: Awaited<ReturnType<typeof readListCorpus>> | undefined;
  try {
    await db.open();
    const listRow = { orderId: 'T1', orderName: 'Pending transfer', orderStatusId: 'ORDER_APPROVED', orderDate: 1000, facilityId: 'O', orderFacilityId: 'A' };
    const order = { orderId: 'T1', statusId: 'ORDER_APPROVED', items: Array.from({ length: 20 }, (_, i) => ({
      orderItemSeqId: String(i), productId: `P${i}`, facilityId: 'O', orderFacilityId: 'A',
      statusId: 'ITEM_PENDING_RECEIPT', quantity: 10, totalIssuedQuantity: 10, totalReceivedQuantity: 0,
    })) };
    const snapshot = { packages: [{ packageKey: 'BOX', orderId: 'T1', facilityId: 'A', trackingCode: 'TRACK', shipmentStatusId: 'SHIPMENT_SHIPPED', syncedAt: 1 }],
      items: [{ contentKey: 'CONTENT', packageKey: 'BOX', orderId: 'T1', facilityId: 'A', orderItemSeqId: '0', productId: 'P0', quantity: 10 }] };
    await mergePendingPage(db, [listRow], 'A', fence);
    await replaceDetail(db, order, fence);
    await replaceOrderShipments(db, 'T1', 'A', snapshot, fence);
    await replaceProducts(db, order.items.map(item => ({ productId: item.productId, productName: `Product ${item.productId}`, goodIdentifications: [`SKU/${item.productId}`] })), fence);
    await reconcilePending(db, ['T1'], 'A', fence);
    await db.syncMeta.put({ key: tuple('hydrate', 'A', 'T1'), ready: true });
    await db.table('transferItems').bulkPut(Array.from({ length: 2000 }, (_, i) => ({
      itemKey: `history-${i}`, orderId: `OLD-${i}`, productId: 'P0', orderFacilityId: 'A', statusId: 'ITEM_COMPLETED',
    })));
    await db.table('transferPackages').bulkPut(Array.from({ length: 500 }, (_, i) => ({
      packageKey: `old-box-${i}`, orderId: `OLD-${i}`, facilityId: 'A', trackingCode: `OLD-TRACK-${i}`,
    })));
    db.table('transferItems').hook('reading', row => { reads.items++; return row; });
    db.table('transferPackages').hook('reading', row => { reads.packages++; return row; });
    for (const name of ['transferOrders', 'transferItems', 'transferPackages', 'transferPackageItems', 'transferMisShippedReceipts']) {
      writes[name] = 0;
      db.table(name).hook('creating', () => { writes[name]++; });
      db.table(name).hook('updating', () => { writes[name]++; });
      db.table(name).hook('deleting', () => { writes[name]++; });
    }
    await new Promise<void>((resolve, reject) => {
      subscription = liveQuery(() => { evaluations++; return readListCorpus(db, 'A'); }).subscribe({ next(value) { latest = value; resolve(); }, error: reject });
    });
    check(reads.items === 20 && reads.packages === 1, 'Search joins read 20 pending lines and one box, excluding 2,000 archived lines and 500 archived boxes');
    check((await readListSync(db, 'A'))?.downloadComplete, 'Per-order shipment coverage completes download without a facility package sweep');
    const initialEvaluations = evaluations;
    reads.items = 0; reads.packages = 0;
    await db.syncMeta.put({ key: tuple('facility', 'A'), complete: true, checkedAt: Date.now(), syncing: true });
    await settle();
    check(evaluations === initialEvaluations && reads.items === 0 && reads.packages === 0, 'Status-only update causes zero corpus evaluations and zero item/package reads');
    await mergePendingPage(db, [listRow], 'A', fence);
    await replaceDetail(db, order, fence);
    await replaceOrderShipments(db, 'T1', 'A', { ...snapshot, packages: snapshot.packages.map(row => ({ ...row, syncedAt: 2 })) }, fence);
    await replaceOrderRows(db, 'transferMisShippedReceipts', 'T1', [], fence);
    await settle();
    check(Object.values(writes).every(value => value === 0), 'Unchanged membership/detail/shipment/receipt snapshots perform zero source-table writes');
    check(evaluations === initialEvaluations, 'Unchanged refresh performs zero additional corpus evaluations');
    reads.items = 0;
    check(JSON.stringify(await findIdentifierProducts(db, 'SKU', 'P0')) === '["P0"]' && reads.items === 0, 'Barcode lookup reads no transfer lines despite 2,001 cached lines for the matched SKU');
    await replaceDetail(db, { ...order, items: [{ ...order.items[0], totalReceivedQuantity: 2 }] }, fence);
    await replaceOrderShipments(db, 'T1', 'A', { packages: [{ ...snapshot.packages[0], trackingCode: 'TRACK-NEW' }], items: [] }, fence);
    await settle();
    check(latest?.rows[0].search.includes('track-new') && !latest.rows[0].search.includes('product p1'), 'Changed shipment and deleted item refresh the live search corpus');
    check((await db.table('transferItems').get(tuple('T1', '0'))).totalReceivedQuantity === 2 &&
      await db.table('transferItems').where('orderId').equals('T1').count() === 1, 'Changed quantities persist and obsolete lines are removed');
    check(await db.table('transferPackageItems').where('[facilityId+orderId]').equals(['A', 'T1']).count() === 0, 'Removed box contents are deleted');
    return { passed, fixture: { pendingLines: 20, archivedLines: 2000, archivedPackages: 500 },
      statusOnlyCorpusEvaluations: 0, unchangedSourceWrites: 0, barcodeTransferLineReads: 0 };
  } finally { subscription?.unsubscribe(); await db.delete(); }
}
