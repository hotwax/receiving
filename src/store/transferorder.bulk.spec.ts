import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@common', () => ({ api: vi.fn(), commonUtil: {}, translate: (value: string) => value }));
vi.mock('@/store/util', () => ({ useUtilStore: vi.fn() }));
vi.mock('@/store/party', () => ({ usePartyStore: vi.fn() }));
vi.mock('@/store/user', () => ({ useUserStore: vi.fn() }));
vi.mock('@/store/productStore', () => ({ useProductStore: vi.fn() }));
vi.mock('@/store/product', () => ({ useProductStore: () => ({ cached: {} }) }));
vi.mock('@/db/receivingClient', () => ({ submitReceipt: vi.fn() }));

import { submitReceipt } from '@/db/receivingClient';
import { useTransferOrderStore } from './transferorder';

describe('Scoped bulk receipt drafts', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(submitReceipt).mockReset().mockResolvedValue({ status: 200, data: {}, refreshed: true });
  });

  function setup() {
    const store = useTransferOrderStore();
    const lines = ['01', '02'].map(id => ({ itemKey: `T1-${id}`, orderId: 'T1', orderItemSeqId: id, productId: `P${id}`,
      orderFacilityId: 'F1', statusId: 'ITEM_PENDING_RECEIPT', quantity: 5, totalIssuedQuantity: 5, totalReceivedQuantity: 0 }));
    store.applyLocalDetail({ orderId: 'T1', ready: true, products: [], items: lines }, 'F1/T1');
    store.current.items[0].quantityAccepted = 1;
    store.current.items[1].quantityAccepted = 2;
    store.saveLocalDraft();
    const payload = { items: [{ orderItemSeqId: '01', productId: 'P01', quantityAccepted: 5, statusId: 'ITEM_COMPLETED' }] };
    return { store, payload, baseline: [{ ...lines[0] }] };
  }

  it('uses the confirmed baseline and preserves hidden drafts through another local refresh', async () => {
    const { store, payload, baseline } = setup();
    await store.receiveTransferOrder('T1', payload, { baseline, preserveOtherDrafts: true });
    expect(submitReceipt).toHaveBeenCalledWith('T1', payload, baseline);
    expect(store.current.items[0].quantityAccepted).toBeUndefined();
    expect(store.current.items[1].quantityAccepted).toBe(2);
    expect(store.draftsByScope['F1/T1'].map(item => item.orderItemSeqId)).toEqual(['02']);
    store.applyLocalDetail({ orderId: 'T1', ready: true, products: [], items: [
      { ...baseline[0], statusId: 'ITEM_COMPLETED', totalReceivedQuantity: 5 },
      { ...store.baseline[1] },
    ] }, 'F1/T1');
    expect(store.current.cacheConflict).toBe(false);
    expect(store.current.items[1].quantityAccepted).toBe(2);
  });

  it('preserves every draft after a failed receipt', async () => {
    const { store, payload, baseline } = setup();
    vi.mocked(submitReceipt).mockRejectedValue(new Error('Transfer changed'));
    await expect(store.receiveTransferOrder('T1', payload, { baseline, preserveOtherDrafts: true })).rejects.toThrow('Transfer changed');
    expect(store.current.items.map((item: any) => item.quantityAccepted)).toEqual([1, 2]);
    expect(store.draftsByScope['F1/T1']).toHaveLength(2);
  });
});
