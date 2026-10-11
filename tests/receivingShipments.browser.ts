import { ReceivingDB } from './receivingTestDb';
import { ensureDbReady } from '@common/db/storage/baseDb';
// Isolated real IndexedDB checks; no OMS requests or signed-in database writes.
import Dexie from 'dexie';
import { tuple, mergePendingPage, replaceDetail, replaceOrderShipments } from '../src/db/receivingDatabase';
import { findExactTracking, readDetail, readListCorpus, filterList } from '../src/db/receivingQueries';

export async function checkReceivingShipments() {
  const scope = `shipment-check-${crypto.randomUUID()}`, name = `receiving-v1:${scope}`;
  const passed: string[] = [], check = (ok: unknown, label: string) => { if (!ok) throw new Error(label); passed.push(label); };
  const db = new ReceivingDB(scope), fence = () => {};
  try {
    await ensureDbReady(db);
    check(db.getTableNames().includes('transferPackageItems'), 'Logout includes the new contents table');
    const order = (orderId: string) => ({ orderId, orderStatusId: 'ORDER_APPROVED', orderFacilityId: 'A', facilityId: 'O' });
    await mergePendingPage(db, [order('T1'), order('T2')], 'A', fence);
    await replaceDetail(db, { orderId: 'T1', statusId: 'ORDER_APPROVED', items: [
      { orderItemSeqId: '01', productId: 'P1', orderFacilityId: 'A', statusId: 'ITEM_PENDING_RECEIPT', quantity: 12 },
    ] }, fence);
    const packages = [{ packageKey: 'one', orderId: 'T1', facilityId: 'A', shipmentId: 'S1', shipmentPackageSeqId: '01', trackingCode: '00123', shipmentStatusId: 'SHIPMENT_SHIPPED', snapshotScope: 'order' },
      { packageKey: 'two', orderId: 'T1', facilityId: 'A', shipmentId: 'S2', shipmentPackageSeqId: '01', trackingCode: '00123', shipmentStatusId: 'SHIPMENT_PACKED', snapshotScope: 'order' }];
    const contents = [{ contentKey: 'item', packageKey: 'one', orderId: 'T1', facilityId: 'A', orderItemSeqId: '01', productId: 'P1', quantity: 10 }];
    await replaceOrderShipments(db, 'T1', 'A', { packages, items: contents }, fence);
    check((await findExactTracking(db, 'A', ' 00123 ')).length === 1, 'One order across two packages opens once; whitespace is trimmed');
    check((await findExactTracking(db, 'A', '0012')).length === 0, 'Partial tracking matches do not auto-open');
    check((await findExactTracking(db, 'B', '00123')).length === 0, 'Tracking lookup stays in the selected facility');
    await replaceOrderShipments(db, 'T2', 'A', { packages: [{ ...packages[0], packageKey: 'three', orderId: 'T2' }], items: [] }, fence);
    check((await findExactTracking(db, 'A', '00123')).length === 2, 'Shared tracking across orders remains ambiguous');
    await db.table('transferOrders').update('T2', { statusId: 'ORDER_COMPLETED' });
    check((await findExactTracking(db, 'A', '00123')).length === 1, 'Completed transfers are excluded from receive navigation');
    const corpus = await readListCorpus(db, 'A');
    check(filterList(corpus, '00123', 10).total === 1 && corpus.rows[0].order.trackingCodes.length === 1, 'List searches tracking and deduplicates badges');
    check(!!await db.table('transferPackages').get('two'), 'Order hydration retains packed boxes');
    const detail = await readDetail(db, 'T1', 'A');
    check(detail?.shipmentsReady && detail.shipmentPackageItems.length === 1, 'Detail reads package metadata and contents atomically');
    await replaceOrderShipments(db, 'T1', 'A', { packages: [], items: [] }, fence);
    check((await readDetail(db, 'T1', 'A'))?.shipmentPackageItems.length === 0 && (await findExactTracking(db, 'A', '00123')).length === 0, 'Order refresh removes obsolete boxes, contents and tracking matches');
    return { passed };
  } finally { await db.delete(); }
}
