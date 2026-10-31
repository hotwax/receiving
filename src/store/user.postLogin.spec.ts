// Login must complete when the user's facility has no active product store link (GOR-444).
// The real user and product store stores run against an OMS mock that returns what Gorjana production returns for such a facility.
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
  cookieHelper: () => ({ get: vi.fn(), set: vi.fn() }),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  translate: (key: string) => key,
  useAuth: vi.fn(),
  useEmbeddedAppStore: () => ({ getPosLocationId: undefined }),
  useNotificationStore: () => ({ fetchAllNotificationPrefs: vi.fn() }),
  useSolrSearch: vi.fn()
}));
vi.mock('@/router', () => ({ default: { currentRoute: { value: { query: {} } } } }));
vi.mock('@/utils/firebaseUtil', () => ({ firebaseUtil: { initialiseFirebaseMessaging: vi.fn() } }));
vi.mock('@/db/receivingClient', () => ({ clearReceivingSession: vi.fn() }));
vi.mock('@/db/receivingSession', () => ({ beginReceivingLogin: vi.fn(), finishReceivingLogin: vi.fn() }));
vi.mock('@/store/order', () => ({ useOrderStore: vi.fn() }));
vi.mock('@/store/party', () => ({ usePartyStore: vi.fn() }));
vi.mock('@/store/product', () => ({ useProductStore: vi.fn() }));
vi.mock('@/store/return', () => ({ useReturnStore: vi.fn() }));
vi.mock('@/store/transferorder', () => ({ useTransferOrderStore: vi.fn() }));
vi.mock('@/store/util', () => ({ useUtilStore: vi.fn() }));

import { api } from '@common';
import { useProductStore } from '@/store/productStore';
import { useUserStore } from '@/store/user';

// Allen (247) is a real retail store with no ProductStoreFacility link; it is the facility the admin saved last.
const facility = { facilityId: '247', facilityName: 'Allen' };
const mockOms = () => {
  vi.mocked(api).mockImplementation(async (request: any) => {
    if (request.url === 'oms/facilities') return { data: [facility] } as any;
    if (request.url === 'admin/user/preferences') return { data: [{ preferenceKey: 'SELECTED_FACILITY', preferenceValue: '247' }] } as any;
    if (request.url === 'oms/facilities/247/productStores') return { data: [] } as any;
    return { data: [] } as any;
  });
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
  mockOms();
});

describe('postLogin for a user whose facility has no product store', () => {
  const prepareAdminLogin = () => {
    const user = useUserStore();
    // Admins resolve facilities from oms/facilities, as the Gorjana admin accounts do.
    user.permissions = ['COMMON_ADMIN'];
    user.current = { userId: 'M101147', partyId: 'P1', userLoginId: 'admin.user' };
    vi.spyOn(user, 'fetchUserProfile').mockResolvedValue(undefined as any);
    vi.spyOn(user, 'fetchPermissions').mockResolvedValue(undefined as any);
    return user;
  };

  it('completes login on the empty None product store instead of failing', async () => {
    const user = prepareAdminLogin();

    await expect(user.postLogin()).resolves.toBeUndefined();

    const productStore = useProductStore();
    expect(productStore.getCurrentFacility.facilityId).toBe('247');
    expect(productStore.getCurrentProductStore.productStoreId).toBe('');
  });

  it('completes every later login with the same saved facility', async () => {
    const user = prepareAdminLogin();

    await user.postLogin();
    // The saved facility preference is unchanged, so each new session resolves the same facility again.
    setActivePinia(createPinia());
    const nextSession = prepareAdminLogin();

    await expect(nextSession.postLogin()).resolves.toBeUndefined();
  });
});
