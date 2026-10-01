import { BaseDB } from '@common/db/storage/baseDb';
import { projectRow, toMillis } from '@common/db/storage/projection';
import { defineEntity } from '@common/db/schema/defineEntity';

export type Row = Record<string, any>;
export const tuple = (...parts: unknown[]) => JSON.stringify(parts);
export const uniqueIds = (values: unknown[]): string[] => [...new Set(values.filter(value => typeof value === 'string' && value.length > 0) as string[])];

const RECEIVING_V1_SCHEMA = {
  transferOrders: 'orderId, *originFacilityIds, *destinationFacilityIds, *pendingReceiptFacilityIds',
  transferItems: 'itemKey, [orderId+orderFacilityId+statusId], productId',
  products: 'productId, updatedAt',
  productIdentification: 'identificationKey, productId, [identKey+value], value',
  transferPackages: 'packageKey, [facilityId+orderId], [facilityId+trackingCode]',
  transferMisShippedReceipts: 'receiptId, productId, [orderId+receivedAtSort+receiptId], [orderId+productId+receivedAtSort+receiptId]',
  transferReceiptGroups: 'receiptGroupKey, [orderId+receivedAtSort+receiptGroupKey], [orderId+orderItemSeqId+receivedAtSort+receiptGroupKey]',
  receivingUsers: 'userLoginId',
};

export const RECEIVING_SCHEMA = {
  ...RECEIVING_V1_SCHEMA,
  transferPackageItems: 'contentKey, [facilityId+orderId], packageKey, [orderId+orderItemSeqId]',
};

export const RECEIVING_DB_VERSION = 3;
const versionMarker = () => ({ key: 'schemaVersion', version: RECEIVING_DB_VERSION, timestamp: Date.now() });

export class ReceivingDB extends BaseDB {
  constructor(scope: string) {
    super(`receiving-v1:${scope}`, RECEIVING_SCHEMA, RECEIVING_DB_VERSION);
    this.version(1).stores({ ...RECEIVING_V1_SCHEMA, syncMeta: 'key' });
    this.version(2).stores({ ...RECEIVING_SCHEMA, syncMeta: 'key' }).upgrade(transaction =>
      transaction.table('transferPackages').toCollection().modify(row => {
        // Version one only downloaded SHIPMENT_SHIPPED packages.
        row.shipmentStatusId = 'SHIPMENT_SHIPPED';
      }));
    // Preserve receiptReadback markers: an uncertain receipt cannot be reconstructed
    // safely by dropping the cache. Migrate before the shared harness checks its version.
    this.version(RECEIVING_DB_VERSION).upgrade(transaction =>
      transaction.table('syncMeta').put(versionMarker()).then(() => undefined));
    this.on('populate', transaction => transaction.table('syncMeta').put(versionMarker()).then(() => undefined));
  }
}

export async function openReceivingDb(db: ReceivingDB) {
  // Open errors and unexpected markers must fail closed, before the shared helper's
  // rebuild fallback can discard pending receipt reconciliation state.
  await db.open();
  if ((await db.syncMeta.get('schemaVersion'))?.version !== db.declaredVersion) {
    throw new Error('Receiving storage version could not be verified.');
  }
}

export async function clearReceivingData(db: ReceivingDB) {
  await openReceivingDb(db);
  await db.transaction('rw', db.getTableNames(), async () => {
    for (const table of db.getTableNames()) await db.table(table).clear();
    await db.syncMeta.put(versionMarker());
  });
}

const headerProjection = defineEntity({
  primaryKey: 'orderId',
  fields: {
    orderId: 'text', orderName: 'text', externalId: 'text', statusId: 'text', status: 'text',
    orderDate: 'date', productStoreId: 'text', statusFlowId: 'text', currencyUom: 'text',
  },
  rename: { externalId: 'orderExternalId', statusId: 'orderStatusId', status: 'orderStatusDesc' },
});

function requireId(row: Row, field: string): string {
  if (typeof row[field] !== 'string' || !row[field]) throw new Error(`Missing ${field} in receiving response`);
  return row[field];
}

export function headerRow(raw: Row, now: number): Row {
  requireId(raw, 'orderId');
  const { items: _items, ...header } = raw;
  const row: Row = { ...projectRow(header, headerProjection, now)!, raw: header };
  for (const field of Object.keys(headerProjection.fields)) {
    const source = field in header ? field : headerProjection.rename?.[field];
    if (source && header[source] === null) row[field] = null;
  }
  return row;
}

// Normalize grouping decimals as text, preserving their exact value rather than rounding a float.
export function decimalKey(value: unknown): string | null {
  if (value == null || value === '') return null;
  const match = String(value).match(/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
  if (!match) throw new Error('Invalid receipt decimal');
  const exponent = Number(match[4] || 0);
  if (Math.abs(exponent) > 1000) throw new Error('Invalid receipt decimal exponent');
  const digits = match[2] + (match[3] || '');
  const point = match[2].length + exponent;
  const integer = (point <= 0 ? '0' : digits.slice(0, point).padEnd(point, '0')).replace(/^0+(?=\d)/, '');
  const fraction = (point <= 0 ? '0'.repeat(-point) + digits : digits.slice(point)).replace(/0+$/, '');
  return (match[1] === '-' && (integer !== '0' || fraction) ? '-' : '') + integer + (fraction ? '.' + fraction : '');
}

export function itemRows(order: Row, now: number): Row[] {
  const orderId = requireId(order, 'orderId');
  if (!Array.isArray(order.items)) throw new Error('Missing transfer items');
  const seen = new Set<string>();
  return order.items.map((raw: Row) => {
    const orderItemSeqId = requireId(raw, 'orderItemSeqId');
    const itemKey = tuple(orderId, orderItemSeqId);
    if (seen.has(itemKey)) throw new Error('Duplicate transfer item');
    seen.add(itemKey);
    const row: Row = { ...raw, orderId, itemKey, raw, syncedAt: now };
    for (const field of ['productId', 'orderFacilityId', 'statusId']) requireId(row, field);
    for (const field of ['quantity', 'totalIssuedQuantity', 'totalReceivedQuantity', 'cancelQuantity']) {
      if (raw[field] == null) continue;
      const value = Number(raw[field]);
      if (!Number.isFinite(value)) throw new Error(`Invalid transfer ${field}`);
      row[field] = value;
    }
    return row;
  });
}

function productIdentifiers(raw: Row) {
  const values = new Map<string, { type: string; value: string }>();
    for (const identifier of raw.goodIdentifications || []) {
      const slash = typeof identifier === 'string' ? identifier.indexOf('/') : -1;
      const type = typeof identifier === 'string' ? identifier.slice(0, slash) : identifier.type || identifier.goodIdentificationTypeId;
      const value = typeof identifier === 'string' ? identifier.slice(slash + 1) : identifier.value || identifier.idValue;
      if ((typeof identifier === 'string' && slash < 1) || typeof type !== 'string' || typeof value !== 'string' || !value) continue;
      values.set(tuple(type, value), { type, value });
    }
  return [...values.values()].sort((a, b) => tuple(a.type, a.value).localeCompare(tuple(b.type, b.value)));
}

export function productRows(documents: Row[], now: number) {
  const grouped = new Map<string, Row[]>();
  for (const doc of documents) {
    const id = requireId(doc, 'productId');
    grouped.set(id, [...(grouped.get(id) || []), doc]);
  }
  const products: Row[] = [], identifications: Row[] = [];
  for (const [productId, docs] of grouped) {
    // Canonical wins. Without one, use the lexically first document identity for display;
    // conflicting codes remain reported and unavailable for scanning until a canonical resolves them.
    const raw = docs.find(doc => doc['docType-identifier'] === `PRODUCT-${productId}`) ||
      [...docs].sort((a, b) => String(a['docType-identifier'] || '').localeCompare(String(b['docType-identifier'] || '')))[0];
    const values = productIdentifiers(raw);
    const identifierConflict = new Set(docs.map(doc => JSON.stringify([productIdentifiers(doc), doc.sku ?? null, doc.upc ?? null, doc.internalName ?? null]))).size > 1;
    const canonicalDocument = raw['docType-identifier'] === `PRODUCT-${productId}`;
    if (!identifierConflict || canonicalDocument) {
      for (const { type, value } of values) identifications.push({ identificationKey: tuple(productId, type, value), productId, identKey: type, value });
      for (const field of ['sku', 'upc', 'internalName', 'productId']) {
        if (typeof raw[field] === 'string' && raw[field]) identifications.push({ identificationKey: tuple(productId, `field:${field}`, raw[field]), productId, identKey: `field:${field}`, value: raw[field] });
      }
    }
    products.push({ ...raw, productId, goodIdentifications: values, identifierConflict, canonicalDocument, updatedAt: now, raw, syncedAt: now });
  }
  return { products, identifications };
}

// A6 is an aggregate. Its key contains every non-aggregated grouping field, never quantityAccepted.
export function receiptRows(records: Row[], orderId: string, grouped: boolean, now: number): Row[] {
  return records.map(raw => {
    if (raw.orderId && raw.orderId !== orderId) throw new Error('Receipt belongs to another transfer');
    const row: Row = { ...raw, orderId, receivedAtSort: toMillis(raw.datetimeReceived) ?? 0, raw, syncedAt: now };
    requireId(raw, 'productId');
    if (grouped) {
      requireId(raw, 'orderItemSeqId');
      row.receiptGroupKey = tuple(orderId, raw.orderItemSeqId, toMillis(raw.datetimeReceived) ?? null, decimalKey(raw.quantityRejected),
        raw.receivedByUserLoginId ?? null, raw.productStoreId ?? null, raw.productId, decimalKey(raw.quantity));
    } else requireId(raw, 'receiptId');
    return row;
  });
}

export type Fence = () => void;

// These writes run only in the app's serialized sync worker. Check scope again inside every transaction.
export async function mergePendingPage(db: ReceivingDB, records: Row[], facilityId: string, fence: Fence) {
  const now = Date.now();
  const rows = records.map(raw => ({ raw, row: headerRow(raw, now) }));
  await db.transaction('rw', db.table('transferOrders'), async () => {
    fence();
    for (const { raw, row } of rows) {
      const old = await db.table('transferOrders').get(row.orderId);
      await db.table('transferOrders').put({
        ...old, ...row, raw: { ...old?.raw, ...row.raw },
        originFacilityIds: uniqueIds([...(old?.originFacilityIds || []), raw.facilityId]),
        destinationFacilityIds: uniqueIds([...(old?.destinationFacilityIds || []), raw.orderFacilityId, facilityId]),
        pendingReceiptFacilityIds: uniqueIds([...(old?.pendingReceiptFacilityIds || []), facilityId]),
      });
    }
    fence();
  });
}

export async function reconcilePending(db: ReceivingDB, orderIds: string[], facilityId: string, fence: Fence) {
  const found = new Set(orderIds);
  await db.transaction('rw', ['transferOrders', 'syncMeta'], async () => {
    fence();
    const previous = await db.table('transferOrders').where('pendingReceiptFacilityIds').equals(facilityId).toArray();
    await db.table('transferOrders').bulkPut(previous.filter(row => !found.has(row.orderId)).map(row => ({
      ...row, pendingReceiptFacilityIds: row.pendingReceiptFacilityIds.filter((id: string) => id !== facilityId),
    })));
    await db.syncMeta.put({ key: tuple('facility', facilityId), complete: true, checkedAt: Date.now(), syncing: false });
    fence();
  });
}

export async function reconcileOrderPending(db: ReceivingDB, orderId: string, facilityId: string, pending: boolean, fence: Fence) {
  await db.transaction('rw', ['transferOrders'], async () => {
    fence();
    const row = await db.table('transferOrders').get(orderId);
    if (!row) throw new Error('Transfer detail is missing during receipt readback');
    await db.table('transferOrders').update(orderId, {
      pendingReceiptFacilityIds: pending ? uniqueIds([...row.pendingReceiptFacilityIds, facilityId])
        : row.pendingReceiptFacilityIds.filter((id: string) => id !== facilityId),
    });
    fence();
  });
}

export async function replaceFacilityPackages(db: ReceivingDB, facilityId: string, packages: Row[], fence: Fence) {
  await db.transaction('rw', ['transferOrders', 'transferPackages', 'syncMeta'], async () => {
    fence();
    const pending = await db.table('transferOrders').where('pendingReceiptFacilityIds').equals(facilityId).primaryKeys();
    const retained = new Set(pending);
    // Keep explicit archived-order lookups: the completed archive is outside the pending sync.
    await db.table('transferPackages').where('facilityId').equals(facilityId)
      .filter(row => row.snapshotScope !== 'order').delete();
    // Full order snapshots include packed boxes too. The shipped-only discovery read
    // must not erase those or overwrite a newer snapshot with an older response.
    for (const pkg of packages.filter(row => retained.has(row.orderId))) {
      const old = await db.table('transferPackages').get(pkg.packageKey);
      if (old?.snapshotScope !== 'order') await db.table('transferPackages').put(pkg);
    }
    await db.syncMeta.put({ key: tuple('packages', facilityId), ready: true, checkedAt: Date.now() });
    fence();
  });
}

export async function replaceOrderShipments(db: ReceivingDB, orderId: string, facilityId: string,
  snapshot: { packages: Row[]; items: Row[] }, fence: Fence) {
  await db.transaction('rw', ['transferPackages', 'transferPackageItems', 'syncMeta'], async () => {
    fence();
    for (const table of ['transferPackages', 'transferPackageItems']) {
      await db.table(table).where('[facilityId+orderId]').equals([facilityId, orderId]).delete();
    }
    await db.table('transferPackages').bulkPut(snapshot.packages);
    await db.table('transferPackageItems').bulkPut(snapshot.items);
    await db.syncMeta.put({ key: tuple('shipments', facilityId, orderId), ready: true, checkedAt: Date.now() });
    fence();
  });
}

export async function replaceDetail(db: ReceivingDB, order: Row, fence: Fence) {
  const now = Date.now(), header = headerRow(order, now), items = itemRows(order, now);
  const associations = [...items, ...(Array.isArray(order.shipGroups) ? order.shipGroups : [])];
  await db.transaction('rw', ['transferOrders', 'transferItems', 'syncMeta'], async () => {
    fence();
    const previous = await db.table('transferOrders').get(order.orderId);
    await db.table('transferOrders').put({
      ...previous, ...header, raw: { ...previous?.raw, ...header.raw },
      originFacilityIds: uniqueIds(associations.map(row => row.facilityId)),
      destinationFacilityIds: uniqueIds(associations.map(row => row.orderFacilityId)),
      pendingReceiptFacilityIds: previous?.pendingReceiptFacilityIds || [],
    });
    await db.table('transferItems').where('orderId').equals(order.orderId).delete();
    await db.table('transferItems').bulkPut(items);
    await db.syncMeta.put({ key: tuple('detail', order.orderId), ready: true, checkedAt: now });
    fence();
  });
}

export async function replaceProducts(db: ReceivingDB, documents: Row[], fence: Fence) {
  const { products, identifications } = productRows(documents, Date.now());
  await db.transaction('rw', ['products', 'productIdentification'], async () => {
    fence();
    await db.table('productIdentification').where('productId').anyOf(products.map(row => row.productId)).delete();
    await db.table('products').bulkPut(products);
    await db.table('productIdentification').bulkPut(identifications);
    fence();
  });
}

export async function replaceOrderRows(db: ReceivingDB, table: string, orderId: string, rows: Row[], fence: Fence, facilityId?: string) {
  await db.transaction('rw', [table, 'syncMeta'], async () => {
    fence();
    const old = facilityId ? db.table(table).where('[facilityId+orderId]').equals([facilityId, orderId]) : db.table(table).where('orderId').equals(orderId);
    await old.delete();
    await db.table(table).bulkPut(rows);
    await db.syncMeta.put({ key: tuple(table, orderId, facilityId || ''), ready: true, checkedAt: Date.now() });
    fence();
  });
}
