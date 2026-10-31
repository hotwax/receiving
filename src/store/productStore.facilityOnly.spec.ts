// Product store is an optional lookup for Receiving settings and transfer order creation: it never decides login or the facility list (GOR-444, #763).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// The app reads its setting defaults from the build environment; pin them so the spec does not depend on a local .env.
vi.hoisted(() => {
  (import.meta as any).env.VITE_DEFAULT_PRODUCT_STORE_SETTINGS = JSON.stringify({
    PRDT_IDEN_PREF: { stateKey: 'productIdentifier.productIdentificationPref', value: { primaryId: 'SKU', secondaryId: 'productId' } },
    RECEIVE_FORCE_SCAN: { stateKey: 'forceScan', value: 'N' },
    BARCODE_IDEN_PREF: { stateKey: 'barcodeIdentifier.barcodeIdentifierPref', value: 'SKU' },
    RECEIVE_BY_FULFILL: { stateKey: 'receiveByFulfillment', value: 'false' }
  });
});

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

import { api, commonUtil } from '@common';
import { useProductStore } from '@/store/productStore';

type Oms = { stores?: Array<{ productStoreId: string; thruDate?: string }>; settings?: Array<{ settingTypeEnumId: string; settingValue: string }>; storesFail?: boolean };

const mockOms = ({ stores = [], settings = [], storesFail = false }: Oms = {}) => {
  vi.mocked(api).mockImplementation(async (request: any) => {
    if (/^oms\/facilities\/[^/]+\/productStores$/.test(request.url)) {
      if (storesFail) throw new Error('productStores unavailable');
      return { data: stores } as any;
    }
    if (request.url === 'admin/productStores') return { data: stores.map((store) => ({ productStoreId: store.productStoreId, storeName: `Name of ${store.productStoreId}` })) } as any;
    if (/^\/?admin\/productStores\/[^/]+\/settings$/.test(request.url) && request.method === 'GET') return { data: settings } as any;
    return { data: [] } as any;
  });
};

const defaults = {
  productIdentificationPref: { primaryId: 'SKU', secondaryId: 'productId' },
  forceScan: 'N',
  barcodeIdentifierPref: 'SKU',
  receiveByFulfillment: 'false'
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('loadFacilitySettings', () => {
  it('keeps the default settings and no product store for a facility that has none', async () => {
    mockOms();
    const productStore = useProductStore();
    productStore.currentFacility = { facilityId: '247', facilityName: 'Allen' };

    await expect(productStore.loadFacilitySettings('247')).resolves.toBeUndefined();

    expect(productStore.getCurrentProductStore).toEqual({});
    expect(productStore.getProductIdentificationPref).toEqual(defaults.productIdentificationPref);
    expect(productStore.getBarcodeIdentifierPref).toBe(defaults.barcodeIdentifierPref);
    expect(productStore.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')).toBe(false);
    expect(productStore.isProductStoreSettingEnabled('RECEIVE_BY_FULFILL')).toBe(false);
  });

  it('applies the settings of the facility product store when there is one', async () => {
    mockOms({
      stores: [{ productStoreId: 'STORE_A' }],
      settings: [
        { settingTypeEnumId: 'RECEIVE_FORCE_SCAN', settingValue: 'Y' },
        { settingTypeEnumId: 'BARCODE_IDEN_PREF', settingValue: 'UPCA' },
        { settingTypeEnumId: 'PRDT_IDEN_PREF', settingValue: JSON.stringify({ primaryId: 'internalName', secondaryId: '' }) }
      ]
    });
    const productStore = useProductStore();
    productStore.currentFacility = { facilityId: 'A' };

    await productStore.loadFacilitySettings('A');

    expect(productStore.getCurrentProductStore.productStoreId).toBe('STORE_A');
    expect(productStore.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')).toBe(true);
    expect(productStore.getBarcodeIdentifierPref).toBe('UPCA');
    expect(productStore.getProductIdentificationPref).toEqual({ primaryId: 'internalName', secondaryId: '' });
  });

  it('never fails, and falls back to the defaults, when the product store lookup fails', async () => {
    mockOms({ storesFail: true });
    const productStore = useProductStore();
    productStore.currentFacility = { facilityId: 'A' };
    productStore.settings.forceScan = 'Y';

    await expect(productStore.loadFacilitySettings('A')).resolves.toBeUndefined();

    expect(productStore.getCurrentProductStore).toEqual({});
    expect(productStore.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')).toBe(false);
  });

  it('does not use the settings of the previous facility after the user moves to a facility without a product store', async () => {
    const productStore = useProductStore();
    productStore.currentFacility = { facilityId: 'A' };
    mockOms({ stores: [{ productStoreId: 'STORE_A' }], settings: [{ settingTypeEnumId: 'RECEIVE_FORCE_SCAN', settingValue: 'Y' }] });
    await productStore.loadFacilitySettings('A');
    expect(productStore.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')).toBe(true);

    productStore.currentFacility = { facilityId: 'C' };
    mockOms();
    await productStore.loadFacilitySettings('C');

    expect(productStore.getCurrentProductStore).toEqual({});
    expect(productStore.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')).toBe(false);
  });

  it('drops the result for a facility the user has already left', async () => {
    const productStore = useProductStore();
    productStore.currentFacility = { facilityId: 'A' };
    let release: () => void = () => undefined;
    vi.mocked(api).mockImplementation(async (request: any) => {
      if (request.url === 'oms/facilities/A/productStores') {
        await new Promise<void>((resolve) => { release = resolve; });
        return { data: [{ productStoreId: 'STORE_A' }] } as any;
      }
      return { data: [] } as any;
    });

    const loading = productStore.loadFacilitySettings('A');
    productStore.currentFacility = { facilityId: 'C' };
    release();
    await loading;

    expect(productStore.getCurrentProductStore).toEqual({});
  });

  it('does not keep the previous facility product store while the next one is being resolved', async () => {
    const productStore = useProductStore();
    productStore.currentFacility = { facilityId: 'A' };
    mockOms({ stores: [{ productStoreId: 'STORE_A' }] });
    await productStore.loadFacilitySettings('A');
    expect(productStore.getCurrentProductStore.productStoreId).toBe('STORE_A');

    let release: () => void = () => undefined;
    vi.mocked(api).mockImplementation(async (request: any) => {
      if (request.url === 'oms/facilities/C/productStores') await new Promise<void>((resolve) => { release = resolve; });
      return { data: [] } as any;
    });
    productStore.currentFacility = { facilityId: 'C' };
    const loading = productStore.loadFacilitySettings('C');

    // Settings saved now must not be written to facility A's product store.
    expect(productStore.getCurrentProductStore).toEqual({});
    release();
    await loading;
  });

  it('does not apply fetched settings once the user has moved to another facility', async () => {
    const productStore = useProductStore();
    productStore.currentFacility = { facilityId: 'A' };
    let release: () => void = () => undefined;
    vi.mocked(api).mockImplementation(async (request: any) => {
      if (request.url === 'oms/facilities/A/productStores') return { data: [{ productStoreId: 'STORE_A' }] } as any;
      if (request.url === '/admin/productStores/STORE_A/settings') {
        await new Promise<void>((resolve) => { release = resolve; });
        return { data: [{ settingTypeEnumId: 'RECEIVE_FORCE_SCAN', settingValue: 'Y' }] } as any;
      }
      return { data: [] } as any;
    });

    const loading = productStore.loadFacilitySettings('A');
    // Wait until the settings request is in flight.
    await vi.waitFor(() => expect(vi.mocked(api).mock.calls.some(([request]: any) => request.url === '/admin/productStores/STORE_A/settings')).toBe(true));
    productStore.currentFacility = { facilityId: 'C' };
    release();
    await loading;

    expect(productStore.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')).toBe(false);
  });

  it('does not change the facility list', async () => {
    mockOms({ stores: [{ productStoreId: 'STORE_A' }] });
    const productStore = useProductStore();
    productStore.userFacilities = [{ facilityId: 'A' }, { facilityId: 'C' }];
    productStore.currentFacility = { facilityId: 'C' };

    await productStore.loadFacilitySettings('C');

    expect(productStore.getFacilities.map((facility: any) => facility.facilityId)).toEqual(['A', 'C']);
    expect(productStore.getCurrentFacility.facilityId).toBe('C');
  });
});

describe('setProductStoreSetting without a product store', () => {
  it('shows a message and sends nothing instead of saving against an empty product store', async () => {
    mockOms();
    const productStore = useProductStore();

    await productStore.setProductStoreSetting('', 'RECEIVE_FORCE_SCAN', 'Y');

    expect(vi.mocked(api)).not.toHaveBeenCalled();
    expect(commonUtil.showToast).toHaveBeenCalledTimes(1);
    expect(productStore.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')).toBe(false);
  });
});

describe('fetchFacilityProductStores', () => {
  it('returns the active product stores linked to the facility with their names', async () => {
    mockOms({ stores: [{ productStoreId: 'STORE_A' }, { productStoreId: 'STORE_OLD', thruDate: '2026-01-01 00:00:00.000' }] });
    const productStore = useProductStore();

    const stores = await productStore.fetchFacilityProductStores('A');

    expect(stores.map((store: any) => [store.productStoreId, store.storeName])).toEqual([['STORE_A', 'Name of STORE_A']]);
  });

  it('returns no stores for a facility without a link, or when the lookup fails', async () => {
    const productStore = useProductStore();
    mockOms();
    await expect(productStore.fetchFacilityProductStores('C')).resolves.toEqual([]);

    mockOms({ storesFail: true });
    await expect(productStore.fetchFacilityProductStores('C')).resolves.toEqual([]);
  });
});
