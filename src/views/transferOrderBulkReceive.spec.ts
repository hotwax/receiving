import { describe, expect, it } from 'vitest';
import { markItemsAsReceived, remainingIssuedQuantity, scanAllQuantity } from './transferOrderBulkReceive';

const line = (orderItemSeqId: string, extra = {}) => ({
  orderItemSeqId, productId: `P${orderItemSeqId}`, statusId: 'ITEM_PENDING_RECEIPT',
  quantity: 20, totalIssuedQuantity: 8, totalReceivedQuantity: 3, quantityAccepted: 0, ...extra,
});

describe('Marking visible transfer lines as received', () => {
  it('fills only the remaining issued balance, independent of ordered or drafted quantities', () => {
    const item = line('01', { quantityAccepted: 100 });
    markItemsAsReceived([item]);
    expect(item.quantityAccepted).toBe(5);
    expect(item.statusId).toBe('ITEM_PENDING_RECEIPT');
    expect(item.totalReceivedQuantity).toBe(3);
  });

  it('leaves hidden lines and their drafts untouched', () => {
    const all = [line('01'), line('02', { quantityAccepted: 2 }), line('03')];
    markItemsAsReceived(all.filter(item => item.orderItemSeqId !== '02'));
    expect(all.map(item => item.quantityAccepted)).toEqual([5, 2, 5]);
  });

  it('skips closed, unissued, fully received, overreceived, invalid, and manually added lines', () => {
    const items = [
      ...['ITEM_COMPLETED', 'ITEM_CANCELLED', 'ITEM_REJECTED'].map(statusId => line(statusId, { statusId })),
      line('unissued', { totalIssuedQuantity: 0, totalReceivedQuantity: 0 }),
      line('received', { totalReceivedQuantity: 8 }),
      line('over', { totalReceivedQuantity: 9 }),
      line('invalid', { totalIssuedQuantity: 'bad' }),
      line('negative', { totalReceivedQuantity: -1 }),
      line('added', { orderItemSeqId: undefined }),
    ];
    expect(items.map(remainingIssuedQuantity)).toEqual(items.map(() => 0));
    markItemsAsReceived(items);
    expect(items.map(item => item.quantityAccepted)).toEqual(items.map(() => 0));
  });

  it('handles null received quantities and decimal string quantities', () => {
    const items = [line('01', { totalIssuedQuantity: '2.5', totalReceivedQuantity: null }), line('02', { totalIssuedQuantity: '4.5', totalReceivedQuantity: '1.25' })];
    markItemsAsReceived(items);
    expect(items.map(item => item.quantityAccepted)).toEqual([2.5, 3.25]);
  });

  it('does not accumulate quantity when clicked repeatedly', () => {
    const item = line('01');
    markItemsAsReceived([item]);
    markItemsAsReceived([item]);
    expect(item.quantityAccepted).toBe(5);
  });

  it('fills the selected two-unit box instead of the ten-unit remaining order balance', () => {
    const item = line('01', { totalIssuedQuantity: 12, totalReceivedQuantity: 2, quantityAccepted: 10 });
    const fillBox = () => markItemsAsReceived([item], row => scanAllQuantity(row, { packageQuantity: 2 }));
    fillBox();
    fillBox();
    expect(item.quantityAccepted).toBe(2);
    expect(item.totalReceivedQuantity).toBe(2);
  });

  it('caps box contents by the remaining issued balance without allocating earlier receipts to a box', () => {
    const item = line('01', { totalIssuedQuantity: 12, totalReceivedQuantity: 11 });
    expect(scanAllQuantity(item, { packageQuantity: 2 })).toBe(1);
    expect(scanAllQuantity({ ...item, totalReceivedQuantity: 12 }, { packageQuantity: 2 })).toBe(0);
  });

  it('applies each visible line allocation and leaves a hidden draft untouched', () => {
    const items = [line('01'), line('02', { quantityAccepted: 4 }), line('03')];
    const quantities = new Map([['01', 2], ['03', 3]]);
    markItemsAsReceived([items[0], items[2]], item => scanAllQuantity(item, { packageQuantity: quantities.get(item.orderItemSeqId!) ?? 0 }));
    expect(items.map(item => item.quantityAccepted)).toEqual([2, 4, 3]);
  });

  it('does not suggest quantities for missing or invalid box contents or closed lines', () => {
    for (const packageQuantity of [0, -1, NaN, Infinity]) {
      expect(scanAllQuantity(line('01'), { packageQuantity })).toBe(0);
    }
    expect(scanAllQuantity(line('01', { statusId: 'ITEM_COMPLETED' }), { packageQuantity: 2 })).toBe(0);
  });

  it('preserves unfiltered ordered-quantity receiving while boxes stay bounded by issued quantity', () => {
    const item = line('01');
    expect(scanAllQuantity(item, { issuedOnly: false })).toBe(17);
    expect(scanAllQuantity(item, { issuedOnly: false, packageQuantity: 10 })).toBe(5);
  });
});
