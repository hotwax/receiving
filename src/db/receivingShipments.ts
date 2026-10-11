import { tuple, type Row } from './receivingDatabase';

// The endpoint repeats shipment/package rows across its entity joins. Deduplicate
// by source identity, never by product: a line can legitimately span several boxes.
export function shipmentRows(shipments: Row[], orderId: string, facilityId: string, now = Date.now()) {
  const packages = new Map<string, Row>(), items = new Map<string, Row>();
  for (const shipment of shipments) {
    if (shipment.orderId !== orderId || !shipment.shipmentId || !shipment.shipmentStatusId ||
        !shipment.orderFacilityId || !Array.isArray(shipment.packages)) {
      throw new Error('Invalid transfer shipment scope');
    }
    if (shipment.orderFacilityId !== facilityId || shipment.shipmentStatusId === 'SHIPMENT_CANCELLED') continue;
    for (const pkg of shipment.packages) {
      if (pkg.shipmentId !== shipment.shipmentId || !pkg.shipmentPackageSeqId || !Array.isArray(pkg.items)) {
        throw new Error('Invalid transfer package');
      }
      const packageKey = tuple(shipment.shipmentId, pkg.shipmentPackageSeqId);
      const row = {
        packageKey, orderId, facilityId, shipmentId: shipment.shipmentId,
        shipmentPackageSeqId: pkg.shipmentPackageSeqId, shipmentStatusId: shipment.shipmentStatusId,
        trackingCode: String(pkg.trackingCode || '').trim(), snapshotScope: 'order', syncedAt: now,
      };
      if (packages.has(packageKey) && JSON.stringify(packages.get(packageKey)) !== JSON.stringify(row)) {
        throw new Error('Conflicting transfer package');
      }
      packages.set(packageKey, row);
      // Only shipped contents can guide pending receipt. Packed contents may still change.
      if (shipment.shipmentStatusId !== 'SHIPMENT_SHIPPED') continue;
      for (const item of pkg.items) {
        const quantity = Number(item.quantity);
        if (item.orderId !== orderId || item.shipmentId !== shipment.shipmentId ||
            item.shipmentPackageSeqId !== pkg.shipmentPackageSeqId || !item.shipmentItemSeqId ||
            !item.orderItemSeqId || !item.productId || item.quantity == null || !Number.isFinite(quantity) || quantity < 0) {
          throw new Error('Invalid package content');
        }
        const contentKey = tuple(orderId, shipment.shipmentId, pkg.shipmentPackageSeqId, item.shipmentItemSeqId, item.orderItemSeqId);
        const content = { contentKey, packageKey, orderId, facilityId, orderItemSeqId: item.orderItemSeqId,
          shipmentItemSeqId: item.shipmentItemSeqId, productId: item.productId, quantity };
        if (items.has(contentKey) && JSON.stringify(items.get(contentKey)) !== JSON.stringify(content)) {
          throw new Error('Conflicting package quantity');
        }
        items.set(contentKey, content);
      }
    }
  }
  return { packages: [...packages.values()], items: [...items.values()] };
}

export function buildBoxAllocations(packages: Row[], contents: Row[]) {
  const byPackage = new Map(packages.filter(pkg => pkg.shipmentStatusId === 'SHIPMENT_SHIPPED').map(pkg => [pkg.packageKey, pkg]));
  const byItem = new Map<string, Map<string, { packageKey: string; label: string; quantity: number }>>();
  for (const row of contents) {
    const pkg = byPackage.get(row.packageKey);
    if (!pkg || row.quantity <= 0) continue;
    const key = tuple(row.orderItemSeqId, row.productId), boxes = byItem.get(key) || new Map();
    const box = boxes.get(row.packageKey) || { packageKey: row.packageKey,
      label: pkg.trackingCode || `${pkg.shipmentId} / ${pkg.shipmentPackageSeqId}`, quantity: 0 };
    box.quantity += row.quantity;
    boxes.set(row.packageKey, box); byItem.set(key, boxes);
  }
  return new Map([...byItem].map(([key, boxes]) => [key, [...boxes.values()].sort((a, b) => a.packageKey.localeCompare(b.packageKey))]));
}

export function boxBoundaries(allocations: { quantity: number; label: string }[], total: number) {
  if (allocations.length < 2 || total <= 0) return [];
  let quantity = 0;
  return allocations.map(box => ({ label: box.label, quantity: box.quantity, position: (quantity += box.quantity) / total }))
    .filter(box => box.position > 0 && box.position < 1);
}
