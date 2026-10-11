import { describe, expect, it } from 'vitest';
import { markItemsAsReceived, remainingIssuedQuantity } from './transferOrderBulkReceive';

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
});
