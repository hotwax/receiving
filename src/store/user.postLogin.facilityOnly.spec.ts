// Receiving is a facility function: login and the facility list depend only on the facilities the user is linked to (GOR-444, #763).
// The real user and product store stores run against an OMS mock that answers the endpoints the app calls.
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

type Link = { facilityId: string; thruDate?: string };

// Facilities that exist in the OMS. D exists but the user is not linked to it.
const catalog = [
  { facilityId: 'A', facilityName: 'Store A' },
  { facilityId: 'B', facilityName: 'Store B' },
  { facilityId: 'C', facilityName: 'Store C' },
  { facilityId: 'D', facilityName: 'Store D' }
];

let requestedUrls: string[] = [];

// `linked` is what admin/user/{partyId}/facilities returns; `storeByFacility` is the active product store link of a facility, if any.
const mockOms = ({ linked, savedFacilityId, storeByFacility = {} }: { linked: Link[]; savedFacilityId?: string; storeByFacility?: Record<string, string> }) => {
  requestedUrls = [];
  vi.mocked(api).mockImplementation(async (request: any) => {
    requestedUrls.push(request.url);
    if (request.url === 'admin/user/P1/facilities') return { data: linked } as any;
    if (request.url === 'oms/facilities') {
      const ids = request.params?.facilityId ? String(request.params.facilityId).split(',') : null;
      return { data: ids ? catalog.filter((facility) => ids.includes(facility.facilityId)) : catalog } as any;
    }
    if (request.url === 'admin/user/preferences') {
      return { data: savedFacilityId ? [{ preferenceKey: 'SELECTED_FACILITY', preferenceValue: savedFacilityId }] : [] } as any;
    }
    const storeLink = /^oms\/facilities\/([^/]+)\/productStores$/.exec(request.url);
    if (storeLink) return { data: storeByFacility[storeLink[1]] ? [{ productStoreId: storeByFacility[storeLink[1]] }] : [] } as any;
    if (request.url === 'admin/productStores') return { data: [{ productStoreId: 'STORE_A', storeName: 'Store A online' }] } as any;
    if (/^\/?admin\/productStores\/[^/]+\/settings$/.test(request.url)) return { data: [] } as any;
    return { data: [] } as any;
  });
};

// A store user: not an admin, so the facilities come from the user's own facility links.
const prepareStoreUserLogin = () => {
  const user = useUserStore();
  user.permissions = [];
  user.current = { userId: 'M1', partyId: 'P1', userLoginId: 'store.user' };
  vi.spyOn(user, 'fetchUserProfile').mockResolvedValue(undefined as any);
  vi.spyOn(user, 'fetchPermissions').mockResolvedValue(undefined as any);
  return user;
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('postLogin is driven by the facilities the user is linked to', () => {
  it('logs a user in and shows their facility when that facility has no product store', async () => {
    mockOms({ linked: [{ facilityId: 'C' }], savedFacilityId: 'C' });
    const user = prepareStoreUserLogin();

    await expect(user.postLogin()).resolves.toBeUndefined();

    const productStore = useProductStore();
    expect(productStore.getCurrentFacility.facilityId).toBe('C');
    expect(productStore.getFacilities.map((facility: any) => facility.facilityId)).toEqual(['C']);
  });

  it('lets that user log in again with the same saved facility', async () => {
    mockOms({ linked: [{ facilityId: 'C' }], savedFacilityId: 'C' });
    await prepareStoreUserLogin().postLogin();

    // The saved facility preference does not change, so every new session resolves the same facility.
    setActivePinia(createPinia());
    await expect(prepareStoreUserLogin().postLogin()).resolves.toBeUndefined();
    expect(useProductStore().getCurrentFacility.facilityId).toBe('C');
  });

  it('lists exactly the linked facilities, whether or not they have a product store', async () => {
    // A has a product store, C has none, B's link has ended, D is not linked to this user.
    mockOms({
      linked: [{ facilityId: 'A' }, { facilityId: 'B', thruDate: '2026-01-01 00:00:00.000' }, { facilityId: 'C' }],
      savedFacilityId: 'C',
      storeByFacility: { A: 'STORE_A' }
    });
    const user = prepareStoreUserLogin();

    await user.postLogin();

    const productStore = useProductStore();
    expect(productStore.getFacilities.map((facility: any) => facility.facilityId)).toEqual(['A', 'C']);
    expect(productStore.getCurrentFacility.facilityId).toBe('C');
    expect(vi.mocked(api).mock.calls.find(([request]: any) => request.url === 'oms/facilities')?.[0]).toMatchObject({ params: { facilityId: 'A,C', facilityId_op: 'in' } });
  });

  it('makes no product store request while logging in', async () => {
    mockOms({ linked: [{ facilityId: 'A' }], savedFacilityId: 'A', storeByFacility: { A: 'STORE_A' } });
    const user = prepareStoreUserLogin();

    await user.postLogin();

    expect(requestedUrls.filter((url) => /productStore/i.test(url))).toEqual([]);
  });
});
