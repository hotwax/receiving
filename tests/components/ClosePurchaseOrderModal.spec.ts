import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  alertButtons: [] as any[],
  receive: vi.fn(),
  dismissModal: vi.fn(),
  push: vi.fn(),
  emit: vi.fn(),
}));

vi.mock('@ionic/vue', async original => ({
  ...await original<any>(),
  alertController: { create: async (options: any) => { state.alertButtons = options.buttons; return { present: async () => {} }; } },
  modalController: { dismiss: state.dismissModal },
}));
vi.mock('@common', () => ({
  DxpShopifyImg: { template: '<img />' },
  translate: (key: string) => key,
  commonUtil: { getProductIdentificationValue: () => '', copyToClipboard: vi.fn() },
  emitter: { emit: state.emit },
}));
vi.mock('@/router', () => ({ default: { push: state.push } }));
vi.mock('@/store/user', () => ({ useUserStore: () => ({ hasPermission: () => true }) }));
vi.mock('@/store/product', () => ({ useProductStore: () => ({ getProduct: () => ({}) }) }));
vi.mock('@/store/productStore', () => ({ useProductStore: () => ({ getProductIdentificationPref: {} }) }));
vi.mock('@/store/order', () => ({
  useOrderStore: () => ({
    getCurrent: { orderId: 'PO1', items: [{ orderItemSeqId: '01', productId: 'P1', quantity: 2, statusId: 'ITEM_APPROVED', isChecked: true }] },
    getPurchaseOrders: [],
    getPOItemAccepted: () => 0,
    createAndReceiveIncomingShipment: state.receive,
    updateCurrentOrder: async () => {},
    updatePurchaseOrders: async () => {},
  }),
}));

import ClosePurchaseOrderModal from './ClosePurchaseOrderModal.vue';

const proceed = async () => {
  const wrapper = mount(ClosePurchaseOrderModal, { props: { isEligibileForCreatingShipment: true } });
  await wrapper.find('[data-testid="purchase-order-close-items-save-btn"]').trigger('click');
  await flushPromises();
  return state.alertButtons.find(button => button.role === 'proceed').handler;
};

// A second tap on "Proceed" while the first is still receiving must not send the receipt again (#593).
describe('Closing purchase order items', () => {
  beforeEach(() => { vi.clearAllMocks(); state.alertButtons = []; });

  it('receives once when Proceed is tapped twice', async () => {
    let finish!: () => void;
    state.receive.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    const handler = await proceed();

    const first = handler();
    const second = await handler();
    finish();
    await first;

    expect(second).toBe(false);
    expect(state.receive).toHaveBeenCalledOnce();
    expect(state.push).toHaveBeenCalledWith('/purchase-orders');
  });

  it('hides the loader and stays on the modal when receiving fails, so the user can retry', async () => {
    state.receive.mockRejectedValueOnce(new Error('failed'));
    const handler = await proceed();

    await handler();

    expect(state.emit).toHaveBeenCalledWith('dismissLoader');
    expect(state.dismissModal).not.toHaveBeenCalled();
    expect(state.push).not.toHaveBeenCalled();

    state.receive.mockResolvedValueOnce(undefined);
    await handler();
    expect(state.receive).toHaveBeenCalledTimes(2);
  });
});
