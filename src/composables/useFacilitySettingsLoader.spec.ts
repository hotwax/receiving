// Settings follow the current facility after login; they are never part of login itself (GOR-444, #763).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick, ref } from 'vue';

vi.mock('@common', () => ({
  api: vi.fn(),
  commonUtil: { hasError: () => false, isAppEmbedded: () => false, showToast: vi.fn(), getErrorMessage: () => '' },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  translate: (key: string) => key,
  useEmbeddedAppStore: () => ({ getPosLocationId: undefined }),
  useSolrSearch: vi.fn()
}));
vi.mock('@/store/user', () => ({ useUserStore: vi.fn() }));

import { useProductStore } from '@/store/productStore';
import { useFacilitySettingsLoader } from './useFacilitySettingsLoader';

let scope = effectScope();

beforeEach(() => {
  setActivePinia(createPinia());
  scope = effectScope();
});

afterEach(() => {
  scope.stop();
});

const setup = (state: { loginReady: boolean; authenticated: boolean; facilityId?: string }) => {
  const productStore = useProductStore();
  const load = vi.spyOn(productStore, 'loadFacilitySettings').mockResolvedValue(undefined);
  if (state.facilityId) productStore.currentFacility = { facilityId: state.facilityId };
  const loginReady = ref(state.loginReady);
  const authenticated = ref(state.authenticated);
  scope.run(() => useFacilitySettingsLoader(loginReady, authenticated));
  return { productStore, load, loginReady, authenticated };
};

describe('useFacilitySettingsLoader', () => {
  it('does not look anything up while login is still running', async () => {
    const { load, loginReady } = setup({ loginReady: false, authenticated: true, facilityId: 'C' });
    await nextTick();
    expect(load).not.toHaveBeenCalled();

    loginReady.value = true;
    await nextTick();
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith('C');
  });

  it('loads the settings of the facility the user switches to', async () => {
    const { productStore, load } = setup({ loginReady: true, authenticated: true, facilityId: 'A' });
    expect(load).toHaveBeenLastCalledWith('A');

    productStore.currentFacility = { facilityId: 'C' };
    await nextTick();

    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenLastCalledWith('C');
  });

  it('does nothing without a signed-in user or a facility', async () => {
    const signedOut = setup({ loginReady: true, authenticated: false, facilityId: 'A' });
    await nextTick();
    expect(signedOut.load).not.toHaveBeenCalled();
    scope.stop();

    setActivePinia(createPinia());
    scope = effectScope();
    const noFacility = setup({ loginReady: true, authenticated: true });
    await nextTick();
    expect(noFacility.load).not.toHaveBeenCalled();
  });
});
