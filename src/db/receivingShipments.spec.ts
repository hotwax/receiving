import { describe, expect, it } from 'vitest';
import { boxBoundaries, itemBoxAllocations, shipmentRows } from './receivingShipments';
import { trackingBadges } from './receivingQueries';

const shipment = (id: string, quantity: number, status = 'SHIPMENT_SHIPPED', facility = 'B') => ({
  orderId: 'T1', orderFacilityId: facility, shipmentId: id, shipmentStatusId: status,
  packages: [{ shipmentId: id, shipmentPackageSeqId: '01', trackingCode: `CODE-${id}`,
    items: [{ orderId: 'T1', shipmentId: id, shipmentPackageSeqId: '01', shipmentItemSeqId: '01', orderItemSeqId: '01', productId: 'P1', quantity }] }],
});

describe('Receiving shipment cache', () => {
  it('deduplicates repeated API joins while preserving the same line split between boxes', () => {
    const first = shipment('S1', 10);
    const snapshot = shipmentRows([first, first, shipment('S2', 2)], 'T1', 'B', 1);
    expect(snapshot.packages).toHaveLength(2);
    expect(snapshot.items).toHaveLength(2);
    const allocations = itemBoxAllocations(snapshot.packages, snapshot.items, { orderItemSeqId: '01', productId: 'P1' });
    expect(allocations.map(box => box.quantity)).toEqual([10, 2]);
    expect(boxBoundaries(allocations, 15).map(tick => tick.position)).toEqual([10 / 15, 12 / 15]);
    expect(itemBoxAllocations(snapshot.packages, snapshot.items, { orderItemSeqId: '02', productId: 'P1' })).toEqual([]);
  });

  it('rejects conflicting duplicate quantities and responses for another order', () => {
    expect(() => shipmentRows([shipment('S1', 10), shipment('S1', 11)], 'T1', 'B')).toThrow('Conflicting package quantity');
    expect(() => shipmentRows([{ ...shipment('S1', 1), orderId: 'T2' }], 'T1', 'B')).toThrow('scope');
    const bad = shipment('S1', 1); bad.packages[0].items[0].productId = '';
    expect(() => shipmentRows([bad], 'T1', 'B')).toThrow('content');
  });

  it('keeps tracking for unshipped boxes without treating them as pending receipt allocations', () => {
    const snapshot = shipmentRows([shipment('S1', 2, 'SHIPMENT_PACKED'), shipment('S2', 3, 'SHIPMENT_APPROVED'), shipment('S3', 1, 'SHIPMENT_CANCELLED'), shipment('S4', 1, 'SHIPMENT_SHIPPED', 'C')], 'T1', 'B');
    expect(snapshot.packages.map(pkg => pkg.shipmentId)).toEqual(['S1', 'S2']);
    expect(snapshot.items).toEqual([]);
    expect(trackingBadges(snapshot.packages)).toEqual([
      { code: 'CODE-S1', shipped: false, status: 'Packed' }, { code: 'CODE-S2', shipped: false, status: 'Not shipped' },
    ]);
  });

  it('deduplicates badges, handles fractional box quantities and omits out-of-range ticks', () => {
    expect(trackingBadges([{ trackingCode: '00123', shipmentStatusId: 'SHIPMENT_PACKED' }, { trackingCode: '00123', shipmentStatusId: 'SHIPMENT_SHIPPED' }])).toEqual([{ code: '00123', shipped: true, status: '' }]);
    expect(boxBoundaries([{ label: 'A', quantity: 0.5 }, { label: 'B', quantity: 1.5 }], 2)).toEqual([{ label: 'A', quantity: 0.5, position: 0.25 }]);
    expect(boxBoundaries([{ label: 'A', quantity: 2 }], 2)).toEqual([]);
    expect(boxBoundaries([{ label: 'A', quantity: 2 }, { label: 'B', quantity: 2 }], 0)).toEqual([]);
  });
});
