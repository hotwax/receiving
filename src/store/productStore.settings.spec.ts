import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@common', () => ({
  api: vi.fn(),
  commonUtil: { hasError: () => false, showToast: vi.fn() },
  logger: { error: vi.fn() },
  translate: (value: string) => value,
  useEmbeddedAppStore: vi.fn(),
  useSolrSearch: vi.fn()
}));
vi.mock('@/store/user', () => ({ useUserStore: vi.fn() }));

vi.stubEnv('VITE_DEFAULT_PRODUCT_STORE_SETTINGS', JSON.stringify({
  RECEIVE_BY_FULFILL: { stateKey: 'receiveByFulfillment', value: 'N' },
  RECEIVE_FORCE_SCAN: { stateKey: 'forceScan', value: 'N' }
}));

const { api } = await import('@common');
const { useProductStore } = await import('./productStore');

describe('Receiving product store setting compatibility', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(api).mockReset();
  });

  it.each(['true', 'false'])('reads legacy fulfillment setting %s', async (settingValue) => {
    vi.mocked(api).mockResolvedValue({ data: [
      { settingTypeEnumId: 'RECEIVE_BY_FULFILL', settingValue }
    ] } as any);
    const store = useProductStore();
    await store.fetchProductStoreSettings('STORE');
    expect(store.isProductStoreSettingEnabled('RECEIVE_BY_FULFILL')).toBe(settingValue === 'true');
  });

  it.each(['Y', 'N'])('preserves indicator setting %s for force scan', async (settingValue) => {
    vi.mocked(api).mockResolvedValue({ data: [
      { settingTypeEnumId: 'RECEIVE_FORCE_SCAN', settingValue }
    ] } as any);
    const store = useProductStore();
    await store.fetchProductStoreSettings('STORE');
    expect(store.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')).toBe(settingValue === 'Y');
  });

  it.each(['true', 'false'])('keeps the fulfillment setting consistent immediately after saving %s and after reload', async (settingValue) => {
    vi.mocked(api).mockResolvedValueOnce({ data: {} } as any);
    const store = useProductStore();
    await store.setProductStoreSetting('STORE', 'RECEIVE_BY_FULFILL', settingValue);
    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      data: { productStoreId: 'STORE', settingTypeEnumId: 'RECEIVE_BY_FULFILL', settingValue }
    }));
    expect(store.isProductStoreSettingEnabled('RECEIVE_BY_FULFILL')).toBe(settingValue === 'true');

    vi.mocked(api).mockResolvedValueOnce({ data: [
      { settingTypeEnumId: 'RECEIVE_BY_FULFILL', settingValue }
    ] } as any);
    await store.fetchProductStoreSettings('STORE');
    expect(store.isProductStoreSettingEnabled('RECEIVE_BY_FULFILL')).toBe(settingValue === 'true');
  });

  it('leaves fulfillment receiving disabled when the setting is absent', async () => {
    vi.mocked(api).mockResolvedValue({ data: [] } as any);
    const store = useProductStore();
    await store.fetchProductStoreSettings('STORE');
    expect(store.isProductStoreSettingEnabled('RECEIVE_BY_FULFILL')).toBe(false);
  });
});
