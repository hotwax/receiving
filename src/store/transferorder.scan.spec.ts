import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@common', () => ({ api: vi.fn(), commonUtil: {}, translate: (value: string) => value }));
vi.mock('@/store/util', () => ({ useUtilStore: vi.fn() }));
vi.mock('@/store/party', () => ({ usePartyStore: vi.fn() }));
vi.mock('@/store/user', () => ({ useUserStore: vi.fn() }));
vi.mock('@/store/productStore', () => ({ useProductStore: () => ({ getBarcodeIdentifierPref: 'SKU' }) }));
vi.mock('@/store/product', () => ({ useProductStore: () => ({ cached: {}, getProduct: () => ({ goodIdentifications: ['SKU/ADDED'] }) }) }));
vi.mock('@/db/receivingClient', () => ({ getReceivingDb: async () => ({}) }));
vi.mock('@/db/receivingQueries', () => ({ findIdentifierProducts: vi.fn(), readDetail: vi.fn(), readHistory: vi.fn() }));

import { findIdentifierProducts } from '@/db/receivingQueries';
import { useTransferOrderStore } from './transferorder';

describe('Barcode matching against the current transfer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(findIdentifierProducts).mockReset().mockResolvedValue(['P1']);
  });
  function setup() {
    const store = useTransferOrderStore();
    store.draftScope = 'F1/T1';
    store.current = { orderId: 'T1', identifiersReady: true, items: [
      { itemKey: 'T1-01', orderItemSeqId: '01', productId: 'P1', statusId: 'ITEM_PENDING_RECEIPT' },
      { itemKey: 'T1-02', orderItemSeqId: '02', productId: 'P2', statusId: 'ITEM_PENDING_RECEIPT' },
    ] };
    return store;
  }
  it('increments only the matching active line', async () => {
    const store = setup();
    expect(await store.updateProductCount('CODE')).toMatchObject({ isProductFound: true });
    expect(store.current.items.map((item: any) => item.quantityAccepted)).toEqual([1, undefined]);
  });
  it('preserves duplicate-line ambiguity and resolves it only within the selected box', async () => {
    const store = setup();
    store.current.items[1].productId = 'P1';
    expect(await store.updateProductCount('CODE')).toEqual({ isAmbiguous: true });
    expect(await store.updateProductCount('CODE', ['T1-02'])).toMatchObject({ isProductFound: true });
    expect(store.current.items.map((item: any) => item.quantityAccepted)).toEqual([undefined, 1]);
  });
  it('does not increment a completed line', async () => {
    const store = setup();
    store.current.items[0].statusId = 'ITEM_COMPLETED';
    expect(await store.updateProductCount('CODE')).toEqual({ isCompleted: true });
    expect(store.current.items[0].quantityAccepted).toBeUndefined();
  });
  it('still matches newly added products outside the persisted identifier index', async () => {
    const store = setup();
    vi.mocked(findIdentifierProducts).mockResolvedValue([]);
    store.current.items.push({ productId: 'ADDED' });
    expect(await store.updateProductCount('ADDED')).toMatchObject({ isProductFound: true, item: { productId: 'ADDED', quantityAccepted: 1 } });
  });
  it('discards an in-flight lookup when the facility draft scope changes on the same order', async () => {
    const store = setup();
    let finish!: (ids: string[]) => void;
    vi.mocked(findIdentifierProducts).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const lookup = store.matchingBarcodeItems('CODE');
    await vi.waitFor(() => expect(findIdentifierProducts).toHaveBeenCalled());
    store.draftScope = 'F2/T1';
    finish(['P1']);
    expect(await lookup).toEqual([]);
  });
});
