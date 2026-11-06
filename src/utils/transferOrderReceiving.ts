export const hasFulfilledQuantity = (item: any): boolean => {
  const quantity = Number(item?.totalIssuedQuantity);

  return Number.isFinite(quantity) && quantity > 0;
};

export const canCompleteTransferOrder = (items: any[] = []): boolean => {
  const orderedItems = items.filter((item: any) => item.orderItemSeqId && !["ITEM_CANCELLED", "ITEM_REJECTED"].includes(item.statusId));

  return orderedItems.length > 0 && orderedItems.every(hasFulfilledQuantity);
};
