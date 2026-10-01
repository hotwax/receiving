// Real IndexedDB upgrade checks against current AccxUI. Only disposable local
// databases are touched; no OMS requests or signed-in user data are used.
import Dexie from 'dexie';
import { wrap } from 'comlink';
import { ensureDbReady } from '@common/db/storage/baseDb';
import { ReceivingDB, RECEIVING_SCHEMA, RECEIVING_DB_VERSION, openReceivingDb, clearReceivingData, tuple } from '../src/db/receivingDatabase';

export async function checkReceivingMigration() {
  const passed: string[] = [];
  const check = (ok: unknown, label: string) => { if (!ok) throw new Error(label); passed.push(label); };
  const receiptKey = tuple('receiptReadback', 'T1');
  for (const previousVersion of [0, 1, 2]) {
    const scope = `migration-check-${previousVersion}-${crypto.randomUUID()}`;
    const db = new ReceivingDB(scope);
    let worker: Worker | undefined;
    try {
      if (previousVersion) {
        const old = new Dexie(db.name);
        const { transferPackageItems: _, ...v1 } = RECEIVING_SCHEMA;
        old.version(previousVersion).stores({ ...(previousVersion === 1 ? v1 : RECEIVING_SCHEMA), syncMeta: 'key' });
        await old.open();
        try {
          await old.table('transferOrders').put({ orderId: 'T1', pendingReceiptFacilityIds: ['A', 'B'] });
          await old.table('transferPackages').put({ packageKey: 'legacy', trackingCode: '000123', shipmentStatusId: 'SHIPMENT_PACKED' });
          await old.table('syncMeta').put({ key: receiptKey, pending: true, startedAt: 123 });
        } finally { old.close(); }
      }
      await openReceivingDb(db);
      check(db.verno === RECEIVING_DB_VERSION && (await db.syncMeta.get('schemaVersion'))?.version === db.declaredVersion,
        `v${previousVersion}: declared version is recorded before the shared helper runs`);
      if (!previousVersion) {
        await db.table('transferOrders').put({ orderId: 'T1', pendingReceiptFacilityIds: ['A', 'B'] });
        await db.syncMeta.put({ key: receiptKey, pending: true, startedAt: 123 });
      }
      await ensureDbReady(db);
      check((await db.table('transferOrders').where('pendingReceiptFacilityIds').equals('B').count()) === 1,
        `v${previousVersion}: facility indexes and cached transfers survive shared initialization`);
      check((await db.syncMeta.get(receiptKey))?.startedAt === 123,
        `v${previousVersion}: an uncertain receipt remains blocked after upgrade`);
      if (previousVersion) check((await db.table('transferPackages').get('legacy'))?.shipmentStatusId ===
        (previousVersion === 1 ? 'SHIPMENT_SHIPPED' : 'SHIPMENT_PACKED'), `v${previousVersion}: package status migration preserves tracking`);

      worker = new Worker(new URL('./receivingDatabase.worker.ts', import.meta.url), { type: 'module' });
      const remote = wrap<{ verifyMigratedDb(scope: string): Promise<boolean> }>(worker);
      check(await remote.verifyMigratedDb(scope), `v${previousVersion}: a second worker realm preserves cached data and receipt guards`);
      worker.terminate(); worker = undefined;
      db.close();
      await openReceivingDb(db);
      check((await db.syncMeta.get(receiptKey))?.pending, `v${previousVersion}: reopening retains the receipt guard`);
      await clearReceivingData(db);
      db.close();
      await openReceivingDb(db);
      check(await db.table('transferOrders').count() === 0 && await db.syncMeta.count() === 1,
        `v${previousVersion}: logout clears user data and retains only the version marker for re-login`);

      await db.syncMeta.put({ key: receiptKey, pending: true });
      await db.syncMeta.delete('schemaVersion');
      db.close();
      let rejected = false;
      try { await openReceivingDb(db); } catch { rejected = true; }
      check(rejected && (await db.syncMeta.get(receiptKey))?.pending,
        `v${previousVersion}: unexpected metadata fails without erasing an uncertain receipt`);
    } finally { worker?.terminate(); await db.delete(); }
  }
  return { passed };
}
