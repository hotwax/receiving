// Real IndexedDB recovery boundaries, using disposable databases only.
import Dexie from 'dexie';
import { ensureDbReady, clearDatabaseTables } from '@common/db/storage/baseDb';
import { ReceiptOperations, importLegacyReceipts, clearReceiptOperation, receiptLock } from '../src/db/receiptOperations';
import { ReceivingDB } from './receivingTestDb';

export async function checkReceivingMigration() {
  const passed: string[] = [];
  const check = (ok: unknown, label: string) => { if (!ok) throw new Error(label); passed.push(label); };
  for (const version of [1, 2, 3]) {
    const scope = `migration-check-${version}-${crypto.randomUUID()}`;
    const legacy = new Dexie(receiptLock(scope)), db = new ReceivingDB(scope), operations = new ReceiptOperations(scope);
    legacy.version(version).stores({ syncMeta: 'key' });
    try {
      await legacy.table('syncMeta').bulkPut([
        { key: '["receiptReadback","T1"]', pending: true, startedAt: 123 },
        { key: '["receiptReadback","T2"]', pending: true, confirmedAt: 456 },
        { key: '["receiptReadback","T3"]', pending: false },
      ]);
      await importLegacyReceipts(scope, operations);
      await ensureDbReady(db);
      check((await operations.receipts.get('T1'))?.state === 'unknown', `v${version}: uncertain legacy receipt is retained`);
      check((await operations.receipts.get('T2'))?.state === 'confirmed', `v${version}: acknowledged receipt needs readback only`);
      check(!await operations.receipts.get('T3'), `v${version}: resolved receipts are not retained`);
      await clearDatabaseTables(db);
      check(await operations.receipts.count() === 2, `v${version}: logout/cache cleanup cannot delete receipt operations`);
      operations.close(); await operations.open();
      check((await operations.receipts.get('T1'))?.startedAt === 123, `v${version}: reload preserves uncertain receipt`);
      await operations.receipts.put({ orderId: 'T1', operationId: 'newer', state: 'unknown', startedAt: 999 });
      await clearReceiptOperation(operations, 'T1', 'legacy:T1');
      check((await operations.receipts.get('T1'))?.operationId === 'newer', `v${version}: late readback cannot erase a newer operation`);
      await importLegacyReceipts(scope, operations);
      check((await operations.receipts.get('T1'))?.operationId === 'newer', `v${version}: repeated migration cannot overwrite a newer operation`);
      await clearReceiptOperation(operations, 'T1', 'newer');
      await importLegacyReceipts(scope, operations);
      check(!await operations.receipts.get('T1'), `v${version}: resolved legacy guards are not resurrected`);
    } finally { await legacy.delete(); await db.delete(); await operations.delete(); }
  }
  return { passed };
}
