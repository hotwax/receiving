// A facility with no active product store link must still resolve to a usable product store (GOR-444).
// Store logic only: the real OMS responses are replaced by the api mock below.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@common', () => ({
  api: vi.fn(),
  commonUtil: {
    hasError: (response: any) => !!response?.data?._ERROR_MESSAGE_,
    isAppEmbedded: () => false,
    showToast: vi.fn(),
    getErrorMessage: () => ''
  },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  translate: (key: string) => key,
  useEmbeddedAppStore: () => ({ getPosLocationId: undefined }),
  useSolrSearch: vi.fn()
}));
vi.mock('@/store/user', () => ({ useUserStore: vi.fn() }));

import { api } from '@common';
import { useProductStore } from '@/store/productStore';

const NONE_STORE = { productStoreId: '', storeName: 'None' };

// Routes the OMS calls fetchProductStores makes; `facilityStores` is the facility's ProductStoreFacility links.
const mockOms = (facilityStores: any[]) => {
  vi.mocked(api).mockImplementation(async (request: any) => {
    if (/^oms\/facilities\/[^/]+\/productStores$/.test(request.url)) return { data: facilityStores } as any;
    if (request.url === 'admin/productStores') {
      return { data: [{ productStoreId: 'STORE', storeName: 'Gorjana Retail' }, { productStoreId: 'OLD', storeName: 'Old Store' }] } as any;
    }
    return { data: [] } as any;
  });
};
const settingsCalls = () => vi.mocked(api).mock.calls.filter(([request]: any) => /\/settings$/.test(request.url));
// fetchProductStores starts setCurrentProductStore without awaiting it, so let it settle before asserting.
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('Product store resolution for a facility', () => {
  it('falls back to the empty None store when the facility has no active product store link', async () => {
    mockOms([]);
    const store = useProductStore();
    store.currentFacility = { facilityId: '247', facilityName: 'Allen', productStores: [] };

    await store.fetchProductStores('247');
    await settle();

    // Create Order reads productStores[0] and login/Settings read currentProductStore.productStoreId directly.
    expect(store.getCurrentProductStore.productStoreId).toBe('');
    expect(store.getCurrentProductStore).toEqual(NONE_STORE);
    expect(store.getProductStores).toEqual([NONE_STORE]);
    // No product store, so no settings request for a store that does not exist.
    expect(settingsCalls()).toHaveLength(0);
  });

  it('resolves the facility switcher sequence for a facility with no product store without throwing', async () => {
    mockOms([]);
    const store = useProductStore();

    // What Settings.vue runs after the switcher saves the chosen facility.
    await store.fetchProductStores('247');
    await expect(store.fetchProductStoreDependencies(store.getCurrentProductStore.productStoreId)).resolves.toBeUndefined();
    await settle();

    expect(store.getCurrentProductStore.productStoreId).toBe('');
  });

  it('keeps the first active product store and adds no None option when the facility has product stores', async () => {
    mockOms([
      { productStoreId: 'STORE', facilityId: '228' },
      { productStoreId: 'OLD', facilityId: '228', thruDate: 1700000000000 }
    ]);
    const store = useProductStore();
    store.currentFacility = { facilityId: '228', facilityName: 'Store 228', productStores: [] };

    await store.fetchProductStores('228');
    await settle();

    expect(store.getProductStores).toEqual([{ productStoreId: 'STORE', facilityId: '228', storeName: 'Gorjana Retail' }]);
    expect(store.getCurrentProductStore.productStoreId).toBe('STORE');
    expect(settingsCalls().map(([request]: any) => request.url)).toEqual(['/admin/productStores/STORE/settings']);
  });
});
