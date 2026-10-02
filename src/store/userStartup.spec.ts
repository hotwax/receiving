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
}));
vi.mock('@common/core/remoteApi', () => ({ default: vi.fn() }));
vi.mock('@common/utils/core', () => ({ isAppEmbedded: () => fixtures.embedded }));
vi.mock('@common/helpers/cookieHelper', () => ({ cookieHelper: vi.fn() }));
vi.mock('@common/core/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('@common/core/i18n', () => ({ translate: (text: string) => text }));
vi.mock('@common/store/notification', () => ({ useNotificationStore: () => fixtures.notification }));
vi.mock('@common/store/embeddedApp', () => ({ useEmbeddedAppStore: () => ({ getPosLocationId: fixtures.location }) }));
vi.mock('@common/composables/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@common/core/configRegistry', () => ({ accxuiConfig: { value: { router: { currentRoute: { query: {} } } } } }));
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
