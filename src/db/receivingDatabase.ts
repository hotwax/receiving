import { BaseDB, ensureDbReady, clearDatabaseTables } from '@common/db/storage/baseDb';
import { defineAppDb } from '@common/db/schema/defineAppDb';
import { dbClient } from '@common/db/storage/dbClient';
import { diffStaleKeys, projectRow, toMillis } from '@common/db/storage/projection';
import { receivingSchema } from './receivingSchema';
import type { Table } from 'dexie';

export type Row = Record<string, any>;
export const tuple = (...parts: unknown[]) => JSON.stringify(parts);
export const uniqueIds = (values: unknown[]): string[] => [...new Set(values.filter(value => typeof value === 'string' && value.length > 0) as string[])];
export const receivingCache = defineAppDb({ suffix: 'ReceivingCache', version: 2, schema: receivingSchema });
export type ReceivingDB = BaseDB;
export const openReceivingDb = ensureDbReady;
export const clearReceivingData = clearDatabaseTables;

// Disposable freshness/coverage only. Receipt operations live outside this cache.
export interface CacheState {
  key: string;
  ready?: boolean;
  complete?: boolean;
  checkedAt?: number;
  error?: string;
  missingProductIds?: string[];
  conflictingProductIds?: string[];
  unresolvedProductIds?: string[];
}
export const cacheKeys = {
  facility: (facilityId: string) => tuple('facility', facilityId),
  detail: (orderId: string) => tuple('detail', orderId),
  hydrate: (facilityId: string, orderId: string) => tuple('hydrate', facilityId, orderId),
  shipments: (facilityId: string, orderId: string) => tuple('shipments', facilityId, orderId),
  receipts: (table: string, orderId: string) => tuple(table, orderId, ''),
};
export const readCacheState = (db: ReceivingDB, key: string) => db.table<CacheState>('syncMeta').get(key);
const headerProjection = receivingSchema.entities.transferOrders;

function requireId(row: Row, field: string): string {
  if (typeof row[field] !== 'string' || !row[field]) throw new Error(`Missing ${field} in receiving response`);
  return row[field];
}

export function headerRow(raw: Row, now: number): Row {
  requireId(raw, 'orderId');
  const { items: _items, ...header } = raw;
  const row: Row = { ...projectRow(header, headerProjection, now)! };
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
    const row: Row = { ...projectRow({ ...raw, orderId, itemKey }, receivingSchema.entities.transferItems, now)! };
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
    products.push(projectRow({ ...raw, productId, goodIdentifications: values, identifierConflict, canonicalDocument, updatedAt: now }, receivingSchema.entities.products, now)!);
  }
  return { products, identifications };
}

// A6 is an aggregate. Its key contains every non-aggregated grouping field, never quantityAccepted.
export function receiptRows(records: Row[], orderId: string, grouped: boolean, now: number): Row[] {
  return records.map(raw => {
    if (raw.orderId && raw.orderId !== orderId) throw new Error('Receipt belongs to another transfer');
    const row: Row = { ...raw, orderId, receivedAtSort: toMillis(raw.datetimeReceived) ?? 0, syncedAt: now };
    requireId(raw, 'productId');
    if (grouped) {
      requireId(raw, 'orderItemSeqId');
      row.receiptGroupKey = tuple(orderId, raw.orderItemSeqId, toMillis(raw.datetimeReceived) ?? null, decimalKey(raw.quantityRejected),
        raw.receivedByUserLoginId ?? null, raw.productStoreId ?? null, raw.productId, decimalKey(raw.quantity));
    } else requireId(raw, 'receiptId');
    return projectRow(row, receivingSchema.entities[grouped ? 'transferReceiptGroups' : 'transferMisShippedReceipts'], now)!;
  });
}

export type Fence = () => void;

// Freshness lives in syncMeta. A no-change refresh should not invalidate data queries.
function sourceChanged(previous: Row | undefined, next: Row) {
  const { syncedAt: _previousSync, ...before } = previous || {};
  const { syncedAt: _nextSync, ...after } = next;
  return JSON.stringify(before) !== JSON.stringify(after);
}

async function replaceSnapshot(table: Table, previous: Row[], rows: Row[]) {
  const key = table.schema.primKey.keyPath as string;
  rows = rows.map(row => projectRow(row, receivingSchema.entities[table.name], row.syncedAt ?? Date.now())!);
  const old = new Map(previous.map(row => [row[key], row]));
  const removed = diffStaleKeys(previous.map(row => row[key]), rows.map(row => row[key]));
  const changed = rows.filter(row => sourceChanged(old.get(row[key]), row));
  const entity = dbClient(table.db as ReceivingDB, receivingSchema.entities).entity(table.name);
  if (removed.length) await entity.bulkRemove(removed);
  if (changed.length) await entity.bulkPut(changed);
}

// The worker holds scope/order locks; each transaction checks its connection again.
export async function mergePendingPage(db: ReceivingDB, records: Row[], facilityId: string, fence: Fence) {
  const now = Date.now();
  const rows = records.map(raw => ({ raw, row: headerRow(raw, now) }));
  await db.transaction('rw', db.table('transferOrders'), async () => {
    fence();
    const stored = await db.table('transferOrders').bulkGet(uniqueIds(rows.map(({ row }) => row.orderId)));
    const old = new Map(stored.filter(Boolean).map(row => [row!.orderId, row!]));
    const updates = new Map<string, Row>();
    for (const { raw, row } of rows) {
      const previous = updates.get(row.orderId) || old.get(row.orderId);
      updates.set(row.orderId, {
        ...previous, ...row,
        originFacilityIds: uniqueIds([...(previous?.originFacilityIds || []), raw.facilityId]),
        destinationFacilityIds: uniqueIds([...(previous?.destinationFacilityIds || []), raw.orderFacilityId, facilityId]),
        pendingReceiptFacilityIds: uniqueIds([...(previous?.pendingReceiptFacilityIds || []), facilityId]),
      });
    }
    const changed = [...updates.values()].filter(row => sourceChanged(old.get(row.orderId), row));
    if (changed.length) await db.table('transferOrders').bulkPut(changed);
    fence();
  });
}

export async function reconcilePending(db: ReceivingDB, orderIds: string[], facilityId: string, fence: Fence) {
  const found = new Set(orderIds);
  await db.transaction('rw', ['transferOrders', 'syncMeta'], async () => {
    fence();
    const previous = await db.table('transferOrders').where('pendingReceiptFacilityIds').equals(facilityId).toArray();
    await db.table('transferOrders').bulkPut(previous.filter(row => !found.has(row.orderId)).map(row => ({
      ...row, pendingReceiptFacilityIds: (row.pendingReceiptFacilityIds || []).filter((id: string) => id !== facilityId),
    })));
    await db.syncMeta.put({ key: cacheKeys.facility(facilityId), complete: true, checkedAt: Date.now() } satisfies CacheState);
    fence();
  });
}

export async function reconcileOrderPending(db: ReceivingDB, orderId: string, facilityId: string, pending: boolean, fence: Fence) {
  await db.transaction('rw', ['transferOrders'], async () => {
    fence();
    const row = await db.table('transferOrders').get(orderId);
    if (!row) throw new Error('Transfer detail is missing during receipt readback');
    await db.table('transferOrders').update(orderId, {
      pendingReceiptFacilityIds: pending ? uniqueIds([...(row.pendingReceiptFacilityIds || []), facilityId])
        : (row.pendingReceiptFacilityIds || []).filter((id: string) => id !== facilityId),
    });
    fence();
  });
}

export async function replaceOrderShipments(db: ReceivingDB, orderId: string, facilityId: string,
  snapshot: { packages: Row[]; items: Row[] }, fence: Fence) {
  await db.transaction('rw', ['transferPackages', 'transferPackageItems', 'syncMeta'], async () => {
    fence();
    for (const table of ['transferPackages', 'transferPackageItems']) {
      const previous = await db.table(table).where('[facilityId+orderId]').equals([facilityId, orderId]).toArray();
      await replaceSnapshot(db.table(table), previous, table === 'transferPackages' ? snapshot.packages : snapshot.items);
    }
    await db.syncMeta.put({ key: cacheKeys.shipments(facilityId, orderId), ready: true, checkedAt: Date.now() } satisfies CacheState);
    fence();
  });
}

export async function replaceDetail(db: ReceivingDB, order: Row, fence: Fence) {
  const now = Date.now(), header = headerRow(order, now), items = itemRows(order, now);
  const associations = [...items, ...(Array.isArray(order.shipGroups) ? order.shipGroups : [])];
  await db.transaction('rw', ['transferOrders', 'transferItems', 'syncMeta'], async () => {
    fence();
    const previous = await db.table('transferOrders').get(order.orderId);
    const updated = {
      ...previous, ...header,
      originFacilityIds: uniqueIds(associations.map(row => row.facilityId)),
      destinationFacilityIds: uniqueIds(associations.map(row => row.orderFacilityId)),
      pendingReceiptFacilityIds: previous?.pendingReceiptFacilityIds || [],
    };
    if (sourceChanged(previous, updated)) await db.table('transferOrders').put(updated);
    const previousItems = await db.table('transferItems').where('orderId').equals(order.orderId).toArray();
    await replaceSnapshot(db.table('transferItems'), previousItems, items);
    await db.syncMeta.put({ key: cacheKeys.detail(order.orderId), ready: true, checkedAt: now } satisfies CacheState);
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

export async function replaceOrderRows(db: ReceivingDB, table: string, orderId: string, rows: Row[], fence: Fence) {
  await db.transaction('rw', [table, 'syncMeta'], async () => {
    fence();
    const old = db.table(table).where('orderId').equals(orderId);
    await replaceSnapshot(db.table(table), await old.toArray(), rows);
    await db.syncMeta.put({ key: cacheKeys.receipts(table, orderId), ready: true, checkedAt: Date.now() } satisfies CacheState);
    fence();
  });
}
