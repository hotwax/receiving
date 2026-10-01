import { createPinia, getActivePinia, setActivePinia } from 'pinia';
import { useTransferOrderStore } from '../src/store/transferorder';
import { useProductStore } from '../src/store/product';

// Isolated in-memory stores only. No subscriptions, app connection, persistence plugin, or API calls.
export function checkReceivingDrafts() {
  const previous = getActivePinia(), pinia = createPinia();
  const store = useTransferOrderStore(pinia);
  const passed: string[] = [];
  const check = (value: unknown, label: string) => { if (!value) throw new Error(label); passed.push(label); };
  const line = { itemKey: 'T1-01', orderId: 'T1', orderItemSeqId: '01', productId: 'P1', orderFacilityId: 'A', statusId: 'ITEM_APPROVED', quantity: 5, totalIssuedQuantity: 5, totalReceivedQuantity: 0 };
  const detail = (items: any[]) => ({ orderId: 'T1', ready: true, products: [], items });
  try {
    store.applyLocalDetail(detail([{ ...line }]), 'A/T1');
    store.current.items[0].quantityAccepted = 2;
    store.applyLocalDetail(detail([{ ...line, totalReceivedQuantity: 1 }]), 'A/T1');
    check(store.current.items[0].quantityAccepted === 2 && store.current.cacheConflict, 'A background receipt preserves the draft and requires review');
    store.applyLocalDetail(detail([{ ...line, totalReceivedQuantity: 1 }]), 'A/T1');
    check(store.current.cacheConflict, 'Repeated refreshes cannot silently acknowledge a changed baseline');
    store.acknowledgeLocalChanges();
    store.applyLocalDetail(detail([{ ...line, totalReceivedQuantity: 1 }]), 'A/T1');
    check(!store.current.cacheConflict && store.current.items[0].quantityAccepted === 2, 'Explicit review adopts the current baseline and retains entered quantity');
    store.applyLocalDetail(detail([]), 'A/T1');
    store.applyLocalDetail(detail([]), 'A/T1');
    check(store.current.cacheConflict && store.current.missingDrafts[0]?.quantityAccepted === 2, 'Removed-line drafts survive repeated background updates');
    store.saveLocalDraft();
    store.applyLocalDetail(detail([{ ...line, orderFacilityId: 'B' }]), 'B/T1');
    check(store.current.items[0].quantityAccepted === undefined, 'Facility B never inherits facility A input');
    store.saveLocalDraft();
    store.applyLocalDetail(detail([]), 'A/T1');
    check(store.current.cacheConflict && store.current.missingDrafts[0]?.quantityAccepted === 2, 'Returning to facility A restores its unresolved draft');
    store.acknowledgeLocalChanges();
    store.applyLocalDetail(detail([]), 'A/T1');
    check(!store.current.cacheConflict && !store.current.missingDrafts.length, 'Reviewed removed lines no longer block receiving');
    // The store action has no await before updating state; the same item must back the UI draft.
    void store.addOrderItem({ productId: 'ADDED' });
    const added = store.current.items[0];
    added.quantityAccepted = 3;
    store.applyLocalDetail(detail([]), 'A/T1');
    check(store.current.items[0] === added && added.quantityAccepted === 3, 'Added products keep the same editable object across background refreshes');
    return { passed };
  } finally {
    useProductStore(pinia).$dispose(); store.$dispose(); setActivePinia(previous);
  }
}
