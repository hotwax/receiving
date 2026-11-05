import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@common', () => ({ api: vi.fn(), commonUtil: {}, emitter: {}, logger: {}, translate: (value: string) => value, useSolrSearch: vi.fn() }));
vi.mock('@/store/product', () => ({ useProductStore: vi.fn() }));
vi.mock('@/store/productStore', () => ({ useProductStore: vi.fn() }));
vi.mock('@/store/party', () => ({ usePartyStore: vi.fn() }));

import { useOrderStore } from './order';

describe('Changing the location of a purchase order item', () => {
  beforeEach(() => setActivePinia(createPinia()));

  function setup() {
    const store = useOrderStore();
    store.current.items = [
      { orderItemSeqId: '01', productId: 'P1' },
      { orderItemSeqId: '02', productId: 'P1' },
      { productId: 'ADDED1' },
      { productId: 'ADDED2' },
    ] as any;
    return store;
  }
  const locations = (store: any) => store.current.items.map((item: any) => item.locationSeqId);

  it('updates the order line with the same orderItemSeqId', () => {
    const store = setup();
    store.setItemLocationSeqId({ item: { orderItemSeqId: '02', productId: 'P1' }, locationSeqId: 'L2' });
    expect(locations(store)).toEqual([undefined, 'L2', undefined, undefined]);
  });

  it('updates a product added in the app, which has no orderItemSeqId, by productId', () => {
    const store = setup();
    store.setItemLocationSeqId({ item: { productId: 'ADDED2' }, locationSeqId: 'L3' });
    expect(locations(store)).toEqual([undefined, undefined, undefined, 'L3']);
  });
});
