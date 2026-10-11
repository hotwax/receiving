import { expose } from 'comlink';
import { ensureDbReady } from '@common/db/storage/baseDb';
import { replaceProducts } from '../src/db/receivingDatabase';
import { ReceivingDB } from './receivingTestDb';

// Real cross-worker invalidation; no network calls.
expose({
  async writeProduct(scope: string) {
    const db = new ReceivingDB(scope);
    try {
      await ensureDbReady(db);
      await replaceProducts(db, [{ productId: 'P1', productName: 'Worker refreshed shirt', goodIdentifications: ['UPCA/001', 'UPCA/002'] }], () => {});
    } finally { db.close(); }
  },
});
