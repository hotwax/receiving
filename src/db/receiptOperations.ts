import Dexie, { type Table } from 'dexie';
import type { Row } from './receivingDatabase';

export interface ReceiptPayload {
  facilityId: string;
  receivedDateTime: string;
  items: Array<{ orderItemSeqId?: string; productId: string; quantityAccepted?: number; statusId?: string }>;
}
export interface ReceiptOperation {
  orderId: string;
  operationId: string;
  state: 'unknown' | 'confirmed';
  startedAt: number;
  payload?: ReceiptPayload;
  baseline?: Row[];
}

// These records are NOT a rebuildable OMS cache. Keep only unresolved operations,
// scoped to the same tenant/user as Receiving, until readback or explicit review.
export class ReceiptOperations extends Dexie {
  receipts!: Table<ReceiptOperation, string>;
  constructor(scope: string) {
    super(`receiving-receipts:${scope}`);
    this.version(1).stores({ receipts: 'orderId' });
  }
}
export const receiptLock = (scope: string) => `receiving-v1:${scope}`;

export async function clearReceiptOperation(operations: ReceiptOperations, orderId: string, operationId: string) {
  await operations.transaction('rw', operations.receipts, async () => {
    if ((await operations.receipts.get(orderId))?.operationId === operationId) await operations.receipts.delete(orderId);
  });
}

// Import before opening the disposable cache. Copy first, then remove the legacy
// marker; interrupted imports are idempotent and cannot erase an unresolved POST.
export async function importLegacyReceipts(scope: string, operations: ReceiptOperations) {
  const name = receiptLock(scope);
  if (!await Dexie.exists(name)) return;
  const legacy = new Dexie(name);
  try {
    await legacy.open();
    if (!legacy.tables.some(table => table.name === 'syncMeta')) return;
    const markers = await legacy.table('syncMeta').where('key').startsWith('["receiptReadback",').toArray();
    for (const marker of markers) {
      const orderId = JSON.parse(marker.key)[1];
      if (marker.pending && !await operations.receipts.get(orderId)) {
        await operations.receipts.put({ orderId, operationId: `legacy:${orderId}`, startedAt: marker.startedAt || marker.confirmedAt || 0,
          state: marker.confirmedAt ? 'confirmed' : 'unknown' });
      }
      await legacy.table('syncMeta').delete(marker.key);
    }
  } finally { legacy.close(); }
}

export function validateReceipt(payload: ReceiptPayload, baseline: Row[], latest: Row) {
  for (const item of payload.items) {
    if (item.quantityAccepted !== undefined && (!Number.isFinite(item.quantityAccepted) || item.quantityAccepted < 0)) {
      throw new Error('Enter a valid receiving quantity.');
    }
    if (!item.orderItemSeqId) continue;
    const current = latest.items.find((row: Row) => row.orderItemSeqId === item.orderItemSeqId);
    const original = baseline.find(row => row.orderItemSeqId === item.orderItemSeqId);
    if (!current || !original || current.productId !== item.productId || current.orderFacilityId !== payload.facilityId ||
        ['statusId', 'quantity', 'totalIssuedQuantity', 'totalReceivedQuantity'].some(field => String(current[field] ?? 0) !== String(original[field] ?? 0))) {
      throw new Error('This transfer changed. Review the refreshed quantities before receiving.');
    }
  }
}
