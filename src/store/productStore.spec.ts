import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { watch } from 'vue';
const api = vi.hoisted(() => vi.fn());
vi.mock('@common/core/remoteApi', () => ({ default: api }));
vi.mock('@common/core/logger', () => ({ default: {error: vi.fn()} }));
vi.mock('@common/core/i18n', () => ({ translate: (text: string) => text }));
vi.mock('@common/store/embeddedApp', () => ({ useEmbeddedAppStore: vi.fn() }));
vi.mock('@common/composables/useSolrSearch', () => ({ useSolrSearch: vi.fn() }));
vi.mock('@/store/user', () => ({ useUserStore: vi.fn() }));
import { useProductStore } from './productStore';
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); api.mockReset(); });
it('waits for the selected product store settings before returning its product stores', async () => {
  const store = useProductStore(); store.currentFacility = {facilityId: 'BROADWAY', productStores: []};
  api.mockResolvedValueOnce({data:[{productStoreId:'STORE'}]}).mockResolvedValueOnce({data:[{productStoreId:'STORE',storeName:'Demo'}]});
  let resolve!: () => void;
  const settings = new Promise<void>(done => {resolve=done;});
  const dependencies = vi.spyOn(store, 'fetchProductStoreDependencies').mockReturnValue(settings);
  let settled = false;
  const fetch = store.fetchProductStores().then(() => {settled=true;});
  await vi.waitFor(() => expect(dependencies).toHaveBeenCalledWith('STORE'));
  expect(settled).toBe(false);
  resolve(); await fetch;
  expect(dependencies).toHaveBeenCalledOnce();
  expect(store.getCurrentProductStore.productStoreId).toBe('STORE');
});

it('starts receiving settings before store names finish and waits for both', async () => {
  const store = useProductStore(); store.currentFacility = {facilityId:'BROADWAY',productStores:[]};
  let namesReady!: (value: any) => void;
  const names = new Promise(done => { namesReady = done; });
  api.mockResolvedValueOnce({data:[{productStoreId:'STORE'}]}).mockReturnValueOnce(names);
  const dependencies = vi.spyOn(store, 'fetchProductStoreDependencies').mockResolvedValue(undefined);
  let settled = false;
  const fetch = store.fetchProductStores().then(() => { settled = true; });
  await vi.waitFor(() => expect(dependencies).toHaveBeenCalledWith('STORE'));
  expect(settled).toBe(false);
  const nameChanged = vi.fn();
  const stop = watch(() => store.getCurrentProductStore.storeName, nameChanged, {flush:'sync'});
  namesReady({data:[{productStoreId:'STORE',storeName:'Demo'}]});
  await fetch;
  expect(store.getCurrentProductStore.storeName).toBe('Demo');
  expect(nameChanged).toHaveBeenCalledWith('Demo', undefined, expect.any(Function));
  stop();
});

it.each(['network', 'error response', 'missing data'])('rejects product store setup after a settings %s failure without replacing settings with defaults', async (failureKind) => {
  const store = useProductStore();
  store.currentFacility = { facilityId: 'BROADWAY', productStores: [] };
  store.currentProductStore = { productStoreId: 'PREVIOUS' };
  store.settings.forceScan = 'Y';
  store.settings.receiveByFulfillment = true;
  api.mockImplementation(async ({ url }) => {
    if (url.includes('/settings')) {
      if (failureKind === 'network') throw new Error('Settings unavailable');
      return failureKind === 'error response' ? { data: { errors: 'Settings unavailable' } } : {};
    }
    return { data: [{ productStoreId: 'STORE', storeName: 'Demo' }] };
  });

  await expect(store.fetchProductStores()).rejects.toThrow();
  expect(store.settings.forceScan).toBe('Y');
  expect(store.settings.receiveByFulfillment).toBe(true);
  expect(store.currentProductStore.productStoreId).toBe('PREVIOUS');
});

it('allows a successful empty settings response to use configured defaults', async () => {
  const store = useProductStore();
  store.settings.forceScan = 'Y';
  store.settings.receiveByFulfillment = true;
  api.mockResolvedValue({ data: [] });

  await store.setCurrentProductStore({ productStoreId: 'STORE' });
  expect(store.currentProductStore.productStoreId).toBe('STORE');
  expect(store.isProductStoreSettingEnabled('RECEIVE_FORCE_SCAN')).toBe(false);
  expect(store.isProductStoreSettingEnabled('RECEIVE_BY_FULFILL')).toBe(false);
});
