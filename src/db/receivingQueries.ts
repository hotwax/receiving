import type { ReceiptOperations } from './receiptOperations';
import { type ReceivingDB, type Row, uniqueIds, cacheKeys } from './receivingDatabase';

export async function readDetail(db: ReceivingDB, orderId: string, facilityId: string, operations?: ReceiptOperations) {
  const detail = await db.transaction('r', ['transferOrders', 'transferItems', 'transferMisShippedReceipts', 'transferPackages', 'transferPackageItems', 'products', 'syncMeta'], () => readDetailSnapshot(db, orderId, facilityId));
  const receiptOperation = await operations?.receipts.get(orderId);
  return detail && { ...detail, receiptOperation, needsReadback: !!receiptOperation,
    cacheError: detail.cacheError || (receiptOperation?.state === 'unknown' ? 'Receipt outcome is unknown. Review receiving history before resolving it.' : undefined) };
}

async function readDetailSnapshot(db: ReceivingDB, orderId: string, facilityId: string) {
  const header = await db.table('transferOrders').get(orderId);
  if (!header) return undefined;
  const [items, allMisShipped, packages, detailState, hydrationState, packageItems, shipmentState] = await Promise.all([
    db.table('transferItems').where('[orderId+orderFacilityId]').equals([orderId, facilityId]).toArray(),
    db.table('transferMisShippedReceipts').where('orderId').equals(orderId).toArray(),
    db.table('transferPackages').where('[facilityId+orderId]').equals([facilityId, orderId]).toArray(),
    db.syncMeta.get(cacheKeys.detail(orderId)),
    db.syncMeta.get(cacheKeys.hydrate(facilityId, orderId)),
    db.table('transferPackageItems').where('[facilityId+orderId]').equals([facilityId, orderId]).toArray(),
    db.syncMeta.get(cacheKeys.shipments(facilityId, orderId)),
  ]);
  // The receipt's own receiving facility, when supplied, wins over the selected context.
  const misShipped = allMisShipped.filter(row => row.facilityId === facilityId);
  const products = await db.table('products').bulkGet(uniqueIds([...items, ...allMisShipped.filter(row => !row.facilityId || row.facilityId === facilityId)].map(row => row.productId)));
  return {
    ...header, items: [...items, ...misShipped.map(row => ({ ...row, statusId: 'ITEM_COMPLETED' }))],
    shipmentPackages: packages, shipmentPackageItems: packageItems, shipmentsReady: !!shipmentState?.ready,
    shipmentError: shipmentState?.error, products: products.filter(Boolean),
    ready: !!detailState?.ready, checkedAt: detailState?.checkedAt,
    identifiersReady: !!detailState?.ready && products.every(row => row && (!row.identifierConflict || row.canonicalDocument)) && !hydrationState?.missingProductIds?.length,
    cacheError: hydrationState?.error || (hydrationState?.conflictingProductIds?.length ? 'Product records contain conflicting identifiers. Refresh to retry.' : undefined),
  };
}

export async function readHistory(db: ReceivingDB, orderId: string, facilityId: string) {
  return db.transaction('r', ['transferItems', 'transferReceiptGroups', 'transferMisShippedReceipts', 'receivingUsers', 'syncMeta'], () => readHistorySnapshot(db, orderId, facilityId));
}

async function readHistorySnapshot(db: ReceivingDB, orderId: string, facilityId: string) {
  const [items, groups, misShipped, state] = await Promise.all([
    db.table('transferItems').where('[orderId+orderFacilityId]').equals([orderId, facilityId]).toArray(),
    db.table('transferReceiptGroups').where('orderId').equals(orderId).toArray(),
    db.table('transferMisShippedReceipts').where('orderId').equals(orderId).toArray(),
    db.syncMeta.get(cacheKeys.receipts('transferReceiptGroups', orderId)),
  ]);
  const itemIds = new Set(items.map(row => row.orderItemSeqId));
  const receipts = [...groups.filter(row => itemIds.has(row.orderItemSeqId)), ...misShipped.filter(row => !row.facilityId || row.facilityId === facilityId)]
    .sort((a, b) => b.receivedAtSort - a.receivedAtSort || String(a.receiptGroupKey || a.receiptId).localeCompare(String(b.receiptGroupKey || b.receiptId)));
  const loginIds = uniqueIds(receipts.map(row => row.receivedByUserLoginId));
  const users = await db.table('receivingUsers').bulkGet(loginIds);
  const names = new Map(users.filter(Boolean).map(user => [user!.userLoginId, user!.fullName]));
  return { ready: !!state?.ready, error: state?.error, items: receipts.map(row => ({ ...row, receiversFullName: names.get(row.receivedByUserLoginId) || row.receivedByUserLoginId })) };
}

function text(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return Object.values(value).map(text).join(' ');
  return String(value).normalize('NFKC').toLocaleLowerCase();
}

// Only referenced records are joined. The computed search corpus is never persisted.
export async function readListCorpus(db: ReceivingDB, facilityId: string) {
  return db.transaction('r', ['transferOrders', 'transferItems', 'transferPackages', 'transferMisShippedReceipts', 'products'], () => readListSnapshot(db, facilityId));
}

async function readListSnapshot(db: ReceivingDB, facilityId: string) {
  const headers = await db.table('transferOrders').where('pendingReceiptFacilityIds').equals(facilityId).toArray();
  const pending = headers.filter(row => row.statusId === 'ORDER_APPROVED');
  const orderIds = pending.map(row => row.orderId);
  const [items, packages, misShipped] = await Promise.all([
    db.table('transferItems').where('[orderId+orderFacilityId]').anyOf(orderIds.map(orderId => [orderId, facilityId])).toArray(),
    db.table('transferPackages').where('[facilityId+orderId]').anyOf(orderIds.map(orderId => [facilityId, orderId])).toArray(),
    db.table('transferMisShippedReceipts').where('orderId').anyOf(orderIds).toArray(),
  ]);
  const scopedItems = [...items.filter(row => row.orderFacilityId === facilityId), ...misShipped.filter(row => row.facilityId === facilityId)];
  const itemCounts = new Map<string, number>();
  for (const item of items) itemCounts.set(item.orderId, (itemCounts.get(item.orderId) || 0) + 1);
  const products = await db.table('products').bulkGet(uniqueIds(scopedItems.map(row => row.productId)));
  const productText = new Map(products.filter(Boolean).map(product => [product!.productId, text([
    product!.productId, product!.productName, product!.parentProductName, product!.internalName,
    product!.goodIdentifications, product!.sku, product!.upc, product!.productFeatures,
  ])]));
  const byOrder = new Map<string, string[]>();
  for (const item of scopedItems) {
    const values = byOrder.get(item.orderId) || [];
    values.push(item.productId, productText.get(item.productId) || ''); byOrder.set(item.orderId, values);
  }
  const packagesByOrder = new Map<string, Row[]>();
  for (const pkg of packages) {
    const orderPackages = packagesByOrder.get(pkg.orderId) || [];
    orderPackages.push(pkg); packagesByOrder.set(pkg.orderId, orderPackages);
    const values = byOrder.get(pkg.orderId) || [];
    values.push(pkg.trackingCode || ''); byOrder.set(pkg.orderId, values);
  }
  const rows = pending.map(header => ({
    order: { ...header, orderExternalId: header.externalId, orderStatusId: header.statusId, orderStatusDesc: header.status,
      itemCount: itemCounts.get(header.orderId),
      trackingCodes: trackingBadges(packagesByOrder.get(header.orderId) || []) },
    search: text([header.orderId, header.orderName, header.externalId, byOrder.get(header.orderId)]),
  })).sort((a, b) => (a.order.orderDate || 0) - (b.order.orderDate || 0) || a.order.orderId.localeCompare(b.order.orderId));
  return { rows };
}

// Progress timestamps must not invalidate the joins and search text above.
export async function readListSync(db: ReceivingDB, facilityId: string) {
  return db.transaction('r', ['transferOrders', 'syncMeta'], async () => {
    const pending = await db.table('transferOrders').where('pendingReceiptFacilityIds').equals(facilityId)
      .filter(row => row.statusId === 'ORDER_APPROVED').primaryKeys();
    const [membership, hydration, shipmentStates] = await Promise.all([
      db.syncMeta.get(cacheKeys.facility(facilityId)),
      db.syncMeta.bulkGet(pending.map(orderId => cacheKeys.hydrate(facilityId, String(orderId)))),
      db.syncMeta.bulkGet(pending.map(orderId => cacheKeys.shipments(facilityId, String(orderId)))),
    ]);
    const readyOrders = hydration.filter((state, i) => state?.ready && shipmentStates[i]?.ready).length;
    const missingProductIds = uniqueIds(hydration.flatMap(state => state?.missingProductIds || []));
    const conflictingProductIds = uniqueIds(hydration.flatMap(state => state?.conflictingProductIds || []));
    return membership && {
      ...membership, complete: !!membership.complete, readyOrders, totalOrders: pending.length, missingProductIds, conflictingProductIds,
      downloading: readyOrders < pending.length,
      downloadComplete: membership.complete && readyOrders === pending.length,
      error: membership.error || hydration.find(state => state?.error)?.error || shipmentStates.find(state => state?.error)?.error ||
        (missingProductIds.length ? 'Some product identifiers could not be downloaded. Refresh to retry.' : undefined) ||
        (conflictingProductIds.length ? 'Product records contain conflicting identifiers. Refresh to retry.' : undefined),
    };
  });
}

export function filterList(corpus: Awaited<ReturnType<typeof readListCorpus>>, query: string, limit: number) {
  const terms = text(query).trim().split(/\s+/).filter(Boolean);
  const rows = corpus.rows.filter(row => terms.every(term => row.search.includes(term)));
  return { list: rows.slice(0, limit).map(row => row.order), total: rows.length };
}

export async function findExactTracking(db: ReceivingDB, facilityId: string, code: string) {
  if (!code.trim()) return [];
  return db.transaction('r', ['transferPackages', 'transferOrders'], async () => {
    const packages = await db.table('transferPackages').where('[facilityId+trackingCode]').equals([facilityId, code.trim()]).toArray();
    const orders = await db.table('transferOrders').bulkGet(uniqueIds(packages.map(row => row.orderId)));
    return orders.filter(row => row?.statusId === 'ORDER_APPROVED' && row?.pendingReceiptFacilityIds?.includes(facilityId));
  });
}

export function trackingBadges(packages: Row[]) {
  const byCode = new Map<string, Row>();
  for (const pkg of packages) {
    if (!pkg.trackingCode) continue;
    const shipped = !pkg.shipmentStatusId || pkg.shipmentStatusId === 'SHIPMENT_SHIPPED';
    if (!byCode.has(pkg.trackingCode) || shipped) byCode.set(pkg.trackingCode, {
      code: pkg.trackingCode, shipped,
      status: shipped ? '' : pkg.shipmentStatusId === 'SHIPMENT_PACKED' ? 'Packed' : 'Not shipped',
    });
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export async function findIdentifierProducts(db: ReceivingDB, identKey: string, value: string) {
  const matches = await db.table('productIdentification').where('[identKey+value]').anyOf([[identKey, value], [`field:${identKey}`, value]]).toArray();
  return uniqueIds(matches.map(row => row.productId));
}
