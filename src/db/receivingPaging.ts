import type { Row } from './receivingDatabase';

// A1 filters after paging. The existing grouped endpoint supplies a pre-filter upper bound,
// so even an empty eligible page must advance until every possible underlying page was read.
export function advancePendingPage(page: Row, pageIndex: number, seen: Set<string>, candidateCount: number, pageSize = 100) {
  if (!Number.isSafeInteger(candidateCount) || candidateCount < 0 || !Number.isSafeInteger(pageSize) || pageSize < 1 ||
      !Number.isSafeInteger(pageIndex) || pageIndex < 0 || !Array.isArray(page.orders) || page.orders.length > pageSize) {
    throw new Error('Invalid transfer pagination');
  }
  for (const row of page.orders) {
    const key = JSON.stringify([row.orderId, row.facilityId, row.orderFacilityId]);
    if (seen.has(key)) throw new Error('Transfer pagination repeated its records');
    seen.add(key);
  }
  if (seen.size > candidateCount) throw new Error('Transfer candidates changed during sync');
  const complete = (pageIndex + 1) * pageSize >= candidateCount;
  return { complete, next: complete ? undefined : pageIndex + 1 };
}
