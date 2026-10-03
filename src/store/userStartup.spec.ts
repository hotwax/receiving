import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const fixtures = vi.hoisted(() => ({
  embedded: false,
  location: '',
  productStore: {
    fetchUserFacilities: vi.fn(), fetchFacilityPreference: vi.fn(), fetchProductStores: vi.fn(),
    fetchProductStoreDependencies: vi.fn(), getFacilities: [],
  },
  notification: { fetchAllNotificationPrefs: vi.fn() },
  finishLogin: vi.fn(),
  api: vi.fn(),
}));
vi.mock('@common', () => ({
  api: fixtures.api,
  commonUtil: { isAppEmbedded: () => fixtures.embedded, hasError: () => false },
  cookieHelper: vi.fn(), logger: { error: vi.fn() }, translate: (text: string) => text,
  useNotificationStore: () => fixtures.notification,
  useEmbeddedAppStore: () => ({ getPosLocationId: fixtures.location }), useAuth: vi.fn(),
}));
vi.mock('@/router', () => ({ default: { currentRoute: { value: { query: {} } } } }));
vi.mock('@/store/productStore', () => ({ useProductStore: () => fixtures.productStore }));
vi.mock('@/store/order', () => ({ useOrderStore: vi.fn() }));
vi.mock('@/store/party', () => ({ usePartyStore: vi.fn() }));
vi.mock('@/store/product', () => ({ useProductStore: vi.fn() }));
vi.mock('@/store/return', () => ({ useReturnStore: vi.fn() }));
vi.mock('@/store/transferorder', () => ({ useTransferOrderStore: vi.fn() }));
vi.mock('@/store/util', () => ({ useUtilStore: vi.fn() }));
vi.mock('@/utils/firebaseUtil', () => ({ firebaseUtil: { initialiseFirebaseMessaging: vi.fn() } }));
vi.mock('@/db/receivingClient', () => ({ clearReceivingSession: vi.fn() }));
vi.mock('@/db/receivingSession', () => ({ beginReceivingLogin: vi.fn(), finishReceivingLogin: fixtures.finishLogin }));
import { useUserStore } from './user';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};

describe('Receiving login bootstrap', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); fixtures.embedded = false; fixtures.location = '';
    vi.stubEnv('VITE_APP_PERMISSION_ID', '');
  });
  it('uses the returned permission total even when Maarg returns more than the requested page size', async () => {
    const docs = Array.from({ length: 263 }, (_, i) => ({ permissionId: `PERMISSION_${i}` }));
    fixtures.api.mockResolvedValueOnce({ status: 200, data: { docs, count: 263 } });
    const user = useUserStore();
    await user.fetchPermissions();
    expect(user.permissions).toHaveLength(263);
    expect(fixtures.api).toHaveBeenCalledOnce();
  });
  it('keeps fetching permission pages until the reported total is complete', async () => {
    fixtures.api.mockResolvedValueOnce({ status: 200, data: { docs: [{ permissionId: 'VIEW' }], count: 2 } })
      .mockResolvedValueOnce({ status: 200, data: { docs: [{ permissionId: 'RECEIVE' }], count: 2 } });
    const user = useUserStore();
    await user.fetchPermissions();
    expect(user.permissions).toEqual(['VIEW', 'RECEIVE']);
    expect(fixtures.api).toHaveBeenCalledTimes(2);
  });
  it('retains empty-page termination when the permissions API supplies no total', async () => {
    fixtures.api.mockResolvedValueOnce({ status: 200, data: { docs: [{ permissionId: 'VIEW' }] } })
      .mockResolvedValueOnce({ status: 200, data: { docs: [] } });
    const user = useUserStore();
    await user.fetchPermissions();
    expect(user.permissions).toEqual(['VIEW']);
    expect(fixtures.api).toHaveBeenCalledTimes(2);
  });
  it('starts profile and permissions together, but waits for both before facility access', async () => {
    const user = useUserStore(), profile = deferred(), permissions = deferred();
    vi.spyOn(user, 'fetchUserProfile').mockReturnValue(profile.promise);
    const fetchPermissions = vi.spyOn(user, 'fetchPermissions').mockReturnValue(permissions.promise);
    const login = user.postLogin();
    expect(fetchPermissions).toHaveBeenCalledOnce();
    expect(fixtures.productStore.fetchUserFacilities).not.toHaveBeenCalled();
    profile.resolve(); await Promise.resolve();
    expect(fixtures.productStore.fetchUserFacilities).not.toHaveBeenCalled();
    permissions.resolve(); await login;
    expect(fixtures.productStore.fetchUserFacilities).toHaveBeenCalledOnce();
    expect(fixtures.finishLogin).toHaveBeenCalledOnce();
  });
  it('settles the account reads and prevents facility access after a permission failure', async () => {
    const user = useUserStore(), profile = deferred(), failure = new Error('Access denied');
    vi.spyOn(user, 'fetchUserProfile').mockReturnValue(profile.promise);
    vi.spyOn(user, 'fetchPermissions').mockRejectedValue(failure);
    const login = user.postLogin();
    const rejected = expect(login).rejects.toBe(failure);
    expect(fixtures.productStore.fetchUserFacilities).not.toHaveBeenCalled();
    profile.resolve(); await rejected;
    expect(fixtures.productStore.fetchUserFacilities).not.toHaveBeenCalled();
    expect(fixtures.finishLogin).not.toHaveBeenCalled();
  });
  it('uses the facility resolved for POS and does not fetch settings a second time', async () => {
    fixtures.embedded = true; fixtures.location = 'demo-location';
    const user = useUserStore();
    vi.spyOn(user, 'fetchUserProfile').mockResolvedValue(undefined);
    vi.spyOn(user, 'fetchPermissions').mockResolvedValue(undefined);
    await user.postLogin();
    expect(fixtures.productStore.fetchUserFacilities).toHaveBeenCalledOnce();
    expect(fixtures.productStore.fetchFacilityPreference).not.toHaveBeenCalled();
    expect(fixtures.productStore.fetchProductStores).toHaveBeenCalledOnce();
    expect(fixtures.productStore.fetchProductStoreDependencies).not.toHaveBeenCalled();
  });
  it('still resolves the saved facility preference outside POS', async () => {
    const user = useUserStore();
    vi.spyOn(user, 'fetchUserProfile').mockResolvedValue(undefined);
    vi.spyOn(user, 'fetchPermissions').mockResolvedValue(undefined);
    await user.postLogin();
    expect(fixtures.productStore.fetchFacilityPreference).toHaveBeenCalledOnce();
  });
  it('does not finish login when receiving settings cannot be loaded', async () => {
    const user = useUserStore(), failure = new Error('Settings unavailable');
    vi.spyOn(user, 'fetchUserProfile').mockResolvedValue(undefined);
    vi.spyOn(user, 'fetchPermissions').mockResolvedValue(undefined);
    fixtures.productStore.fetchProductStores.mockRejectedValueOnce(failure);

    await expect(user.postLogin()).rejects.toBe(failure);
    expect(fixtures.finishLogin).not.toHaveBeenCalled();
  });
  it('starts notification setup while facility discovery is pending and waits for both', async () => {
    const user = useUserStore(), facilities = deferred(), notifications = deferred();
    vi.spyOn(user, 'fetchUserProfile').mockResolvedValue(undefined);
    vi.spyOn(user, 'fetchPermissions').mockResolvedValue(undefined);
    fixtures.productStore.fetchUserFacilities.mockReturnValueOnce(facilities.promise);
    fixtures.notification.fetchAllNotificationPrefs.mockReturnValueOnce(notifications.promise);
    const login = user.postLogin();
    await vi.waitFor(() => expect(fixtures.notification.fetchAllNotificationPrefs).toHaveBeenCalledOnce());
    expect(fixtures.productStore.fetchUserFacilities).toHaveBeenCalledOnce();
    facilities.resolve(); await Promise.resolve();
    expect(fixtures.finishLogin).not.toHaveBeenCalled();
    notifications.resolve(); await login;
    expect(fixtures.finishLogin).toHaveBeenCalledOnce();
  });
  it('settles notification setup before reporting a facility failure', async () => {
    const user = useUserStore(), notifications = deferred(), failure = new Error('Facility denied');
    vi.spyOn(user, 'fetchUserProfile').mockResolvedValue(undefined);
    vi.spyOn(user, 'fetchPermissions').mockResolvedValue(undefined);
    fixtures.productStore.fetchUserFacilities.mockRejectedValueOnce(failure);
    fixtures.notification.fetchAllNotificationPrefs.mockReturnValueOnce(notifications.promise);
    let settled = false;
    const login = user.postLogin().finally(() => { settled = true; });
    const rejected = expect(login).rejects.toBe(failure);
    await vi.waitFor(() => expect(fixtures.notification.fetchAllNotificationPrefs).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    notifications.resolve(); await rejected;
    expect(fixtures.finishLogin).not.toHaveBeenCalled();
  });
});
