interface TransferLine {
  orderItemSeqId?: string;
  productId: string;
  statusId: string;
  quantity?: number | string | null;
  totalIssuedQuantity?: number | string | null;
  totalReceivedQuantity?: number | string | null;
  quantityAccepted?: number | string;
}

export function scanAllQuantity(item: TransferLine, options: { issuedOnly?: boolean; packageQuantity?: number } = {}): number {
  // A selected box always comes from issued shipment contents, including when
  // the store otherwise permits receiving against the ordered quantity.
  const issued = Number(options.issuedOnly === false && options.packageQuantity === undefined ? item.quantity ?? 0 : item.totalIssuedQuantity ?? 0);
  const received = Number(item.totalReceivedQuantity ?? 0);
  if (!item.orderItemSeqId || ['ITEM_COMPLETED', 'ITEM_REJECTED', 'ITEM_CANCELLED'].includes(item.statusId) ||
    !Number.isFinite(issued) || !Number.isFinite(received) || received < 0) return 0;
  const remaining = Math.max(issued - received, 0);
  if (options.packageQuantity === undefined) return remaining;
  // Receipts are order-line totals: do not assign earlier receipts to a box.
  return Number.isFinite(options.packageQuantity) && options.packageQuantity >= 0
    ? Math.min(options.packageQuantity, remaining) : 0;
}

export function remainingIssuedQuantity(item: TransferLine): number {
  return scanAllQuantity(item);
}

// Fill the current receipt draft rather than accumulating on repeated clicks.
// The existing footer remains responsible for submission.
export function markItemsAsReceived(visibleItems: TransferLine[], quantityForItem = remainingIssuedQuantity) {
  for (const item of visibleItems) {
    const remaining = quantityForItem(item);
    if (remaining > 0) item.quantityAccepted = remaining;
  }
}
