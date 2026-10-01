interface TransferLine {
  orderItemSeqId?: string;
  productId: string;
  statusId: string;
  totalIssuedQuantity?: number | string | null;
  totalReceivedQuantity?: number | string | null;
  quantityAccepted?: number | string;
}

export function remainingIssuedQuantity(item: TransferLine): number {
  const issued = Number(item.totalIssuedQuantity ?? 0);
  const received = Number(item.totalReceivedQuantity ?? 0);
  if (!item.orderItemSeqId || ['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId) ||
    !Number.isFinite(issued) || !Number.isFinite(received) || received < 0) return 0;
  return Math.max(issued - received, 0);
}

// Tracking filters select order lines; entered quantities remain line totals
// across all shipments. Marking only fills drafts; the existing footer submits.
export function markItemsAsReceived(visibleItems: TransferLine[]) {
  for (const item of visibleItems) {
    const remaining = remainingIssuedQuantity(item);
    if (remaining > 0) item.quantityAccepted = remaining;
  }
}
