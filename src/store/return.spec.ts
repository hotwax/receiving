import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
const api = vi.hoisted(() => vi.fn());
vi.mock('@common/core/remoteApi', () => ({ default: api }));
vi.mock('@common/core/emitter', () => ({ default: { emit: vi.fn() } }));
vi.mock('@common/core/i18n', () => ({ translate: (text: string) => text }));
vi.mock('@common/utils/core', () => ({ hasError: () => false, showToast: vi.fn() }));
vi.mock('@/store/util', () => ({ useUtilStore: () => ({ fetchStatus: async () => ({ PURCH_SHIP_CREATED: 'Created' }) }) }));
vi.mock('@/store/product', () => ({ useProductStore: () => ({ fetchProducts: vi.fn() }) }));
vi.mock('@/store/productStore', () => ({ useProductStore: () => ({ getFacilityLocations: async () => [{ locationSeqId: '01' }] }) }));
import { useReturnStore } from './return';
beforeEach(() => { setActivePinia(createPinia()); api.mockReset(); });
it('initializes receiving permissions when opening a return directly without visiting the list', async () => {
  api.mockImplementation(async ({ url }) => {
    if (url === 'admin/statusFlows/transitions') return { status: 200, data: [{ statusId: 'PURCH_SHIP_CREATED', toStatusId: 'PURCH_SHIP_RECEIVED' }] };
    if (url === 'oms/returnShipments') return { status: 200, data: { returnShipments: [{ shipmentId: 'R1', statusId: 'PURCH_SHIP_CREATED', destinationFacilityId: 'F1' }] } };
    return { status: 200, data: { items: [{ productId: 'P1', itemSeqId: '01', returnQuantity: 3 }] } };
  });
  const store = useReturnStore();
  await store.setCurrent({ shipmentId: 'R1' });
  expect(store.isReturnReceivable(store.getCurrent.statusId)).toBe(true);
});
it('uses only statuses that can transition to Received for Open results', async () => {
  api.mockResolvedValue({ status: 200, data: [
    { statusId: 'PURCH_SHIP_CREATED', toStatusId: 'PURCH_SHIP_RECEIVED' },
    { statusId: 'PURCH_SHIP_SHIPPED', toStatusId: 'PURCH_SHIP_RECEIVED' },
  ] });
  const store = useReturnStore();
  await store.fetchValidReturnStatuses();
  expect(store.getReceivableStatusIds).toEqual(['PURCH_SHIP_CREATED', 'PURCH_SHIP_SHIPPED']);
  expect(store.isReturnReceivable('PURCH_SHIP_CANCELLED')).toBeFalsy();
  expect(store.isReturnReceivable('PURCH_SHIP_RECEIVED')).toBeFalsy();
});
