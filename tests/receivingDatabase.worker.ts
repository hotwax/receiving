import { expose } from 'comlink';
import { ReceivingDB, replaceProducts } from '../src/db/receivingDatabase';
import { createReceivingQueue } from '../src/db/receivingQueue';

// Only used by the disposable IndexedDB browser check; this worker performs no network calls.
expose({
  async checkQueue(scope: string) {
    const enqueue = createReceivingQueue(() => scope, () => {});
    let active = 0, maximum = 0, receiptCommitted = false;
    const events: string[] = [];
    const reads = [1, 2, 3].map(id => enqueue(async () => {
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 20));
      events.push(`poll-${id}-commit`); active--;
    }, false, String(id)));
    const receipt = enqueue(async () => {
      if (active) throw new Error('A receipt overlapped a prior poll');
      receiptCommitted = true; events.push('receipt-commit');
    }, true);
    const later = enqueue(async () => {
      if (!receiptCommitted) throw new Error('A later poll overtook the receipt');
      events.push('later-poll');
    }, false, 'later');
    await Promise.all([...reads, receipt, later]);
    return { maximum, events };
  },
  async writeProduct(scope: string) {
    const db = new ReceivingDB(scope);
    try {
      await db.open();
      await replaceProducts(db, [{ productId: 'P1', productName: 'Worker refreshed shirt', goodIdentifications: ['UPCA/001', 'UPCA/002'] }], () => {});
    } finally { db.close(); }
  },
});
