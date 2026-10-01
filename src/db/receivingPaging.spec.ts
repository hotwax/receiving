import { describe, expect, it } from 'vitest';
import { advancePendingPage } from './receivingPaging';

describe('Pending transfer enumeration contract', () => {
  it('continues across empty eligible pages until the pre-filter candidate bound is exhausted', () => {
    const signatures = new Set<string>();
    expect(advancePendingPage({ orders: [], ordersCount: 0 }, 0, signatures, 250)).toEqual({ complete: false, next: 1 });
    expect(advancePendingPage({ orders: [{ orderId: 'T2', facilityId: 'O', orderFacilityId: 'A' }] }, 1, signatures, 250)).toEqual({ complete: false, next: 2 });
    expect(advancePendingPage({ orders: [] }, 2, signatures, 250)).toEqual({ complete: true, next: undefined });
  });

  it('ignores post-filter page counts and accepts a proven empty candidate scope', () => {
    expect(advancePendingPage({ orders: [], ordersCount: 0 }, 0, new Set(), 101).complete).toBe(false);
    expect(advancePendingPage({ orders: [], ordersCount: 0 }, 0, new Set(), 0)).toEqual({ complete: true, next: undefined });
    expect(advancePendingPage({ orders: [{ orderId: 'T1' }], ordersCount: 1 }, 0, new Set(), 100)).toEqual({ complete: true, next: undefined });
  });

  it('rejects invalid bounds, an underestimated bound, and repeated records across different pages', () => {
    expect(() => advancePendingPage({ orders: [] }, 0, new Set(), -1)).toThrow('Invalid');
    expect(() => advancePendingPage({ orders: [{ orderId: 'T1' }] }, 0, new Set(), 0)).toThrow('changed');
    const signatures = new Set<string>();
    const row = { orderId: 'T1', facilityId: 'O', orderFacilityId: 'A' };
    advancePendingPage({ orders: [row] }, 0, signatures, 200);
    expect(() => advancePendingPage({ orders: [{ ...row, orderId: 'T2' }, row] }, 1, signatures, 200)).toThrow('repeated');
  });

  it('keeps distinct origins for the same transfer while bounding actual pages', () => {
    const seen = new Set<string>();
    expect(advancePendingPage({ orders: [
      { orderId: 'T1', facilityId: 'O1', orderFacilityId: 'A' },
      { orderId: 'T1', facilityId: 'O2', orderFacilityId: 'A' },
    ] }, 0, seen, 3, 2)).toEqual({ complete: false, next: 1 });
    expect(advancePendingPage({ orders: [] }, 1, seen, 3, 2)).toEqual({ complete: true, next: undefined });
  });
});
