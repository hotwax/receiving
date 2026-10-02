import { workerGet, workerPost } from '@common/core/workerRemoteApi';
import type { SyncContext } from '@common/db/types';
import { receiptRows, type Row } from './receivingDatabase';
import { shipmentRows } from './receivingShipments';

export interface ReceivingConnection {
  scope: string;
  maargUrl: string;
  token: string;
  facilityId: string;
  moqui: boolean;
}

export class ReceivingApi {
  constructor(public connection: ReceivingConnection, private fence: () => void) {}

  async request(path: string, params: Row = {}, data?: Row) {
    this.fence();
    const context: SyncContext = { ...this.connection, omsInstance: this.connection.scope, now: Date.now() };
    const body = data ? await workerPost(context, path, data) : await workerGet(context, path, params);
    this.fence();
    if (body?._ERROR_MESSAGE_ || body?._ERROR_MESSAGE_LIST_?.length || body?.errors?.length) throw new Error('Receiving server rejected the request');
    return { body };
  }

  async pendingPage(pageIndex: number, orderId?: string) {
    const { body } = await this.request('oms/transferOrders', {
      destinationFacilityId: this.connection.facilityId, orderStatusId: 'ORDER_APPROVED',
      excludeOriginFacilityIds: ['REJECTED_ITM_PARKING'], statusFlowId: ['TO_Fulfill_And_Receive', 'TO_Receive_Only'],
      limit: 100, pageIndex, orderId, orderBy: 'orderId,facilityId',
      fieldsToSelect: 'orderId,orderName,orderExternalId,orderStatusId,orderStatusDesc,orderDate,productStoreId,statusFlowId,facilityId,orderFacilityId',
    });
    if (!Array.isArray(body.orders)) throw new Error('Invalid transfer list response');
    if (body.orders.some((row: Row) => !row.orderId || row.orderStatusId !== 'ORDER_APPROVED' ||
        !['TO_Fulfill_And_Receive', 'TO_Receive_Only'].includes(row.statusFlowId))) throw new Error('Invalid pending transfer eligibility');
    if (body.orders.some((row: Row) => row.orderFacilityId !== this.connection.facilityId)) throw new Error('Transfer destination does not match receiving facility');
    if (orderId && body.orders.some((row: Row) => row.orderId !== orderId)) throw new Error('Transfer response does not match requested order');
    return body;
  }

  async pendingCandidateCount() {
    // This existing endpoint counts distinct order/origin/destination rows BEFORE the
    // receiving list's eligibility filter. Including rejected origins makes it an upper bound.
    const { body } = await this.request('oms/transferOrders/grouped', {
      orderFacilityId: this.connection.facilityId, orderStatusId: 'ORDER_APPROVED',
      statusFlowId: ['TO_Fulfill_And_Receive', 'TO_Receive_Only'],
      fieldsToSelect: 'orderId,facilityId,orderFacilityId',
      pageSize: 1, pageIndex: 0, orderByField: 'orderId,facilityId',
    });
    if (!Array.isArray(body.orders) || !Number.isSafeInteger(body.ordersCount) || body.ordersCount < body.orders.length ||
        body.ordersCount < 0 || body.orders.some((row: Row) => !row.orderId || row.orderFacilityId !== this.connection.facilityId)) {
      throw new Error('Invalid transfer candidate count');
    }
    return body.ordersCount as number;
  }

  async detail(orderId: string) {
    const { body } = await this.request(`oms/transferOrders/${encodeURIComponent(orderId)}`);
    if (body.order?.orderId !== orderId || !Array.isArray(body.order.items)) throw new Error('Invalid transfer detail response');
    return body.order as Row;
  }

  async shipments(orderId: string) {
    const { body } = await this.request('poorti/transferShipments', { orderId });
    if (!Array.isArray(body.shipments)) throw new Error('Invalid transfer shipments response');
    return shipmentRows(body.shipments, orderId, this.connection.facilityId);
  }

  async receipts(orderId: string, grouped: boolean) {
    const rows: Row[] = [], seen = new Set<string>();
    let pageIndex = 0;
    for (;;) {
      const { body } = await this.request(`poorti/transferOrders/${encodeURIComponent(orderId)}/${grouped ? 'receipts' : 'misShippedItems'}`, {
        pageSize: 200, pageIndex,
        orderByField: grouped ? 'datetimeReceived,orderItemSeqId,productId,receivedByUserLoginId,quantityRejected,productStoreId,quantity' : 'datetimeReceived,receiptId',
      });
      if (!Array.isArray(body)) throw new Error('Invalid receipt response');
      for (const row of receiptRows(body, orderId, grouped, Date.now())) {
        const key = grouped ? row.receiptGroupKey : row.receiptId;
        if (seen.has(key)) throw new Error('Receipt pagination repeated a row');
        seen.add(key); rows.push(row);
      }
      if (body.length < 200) return rows;
      pageIndex++;
    }
  }

  async products(productIds: string[]) {
    const documents: Row[] = [];
    for (let offset = 0; offset < productIds.length; offset += 100) {
      const ids = productIds.slice(offset, offset + 100), allowed = new Set(ids);
      let start = 0, total: number | undefined;
      const seen = new Set<string>();
      do {
        const query = {
          query: '*:*', filter: ['docType:PRODUCT', `productId:(${ids.map(id => `"${id.replace(/([\\"])/g, '\\$1')}"`).join(' OR ')})`],
          params: { start, rows: 100, sort: 'productId asc,docType-identifier asc',
            fl: 'productId,productName,parentProductName,internalName,sku,upc,goodIdentifications,productFeatures,mainImageUrl,isVariant,isVirtual,updatedDatetime,docType-identifier' },
        };
        const { body } = await this.request(this.connection.moqui ? 'admin/search/query' : 'admin/runSolrQuery', {}, this.connection.moqui ? query : { json: query });
        const result = this.connection.moqui ? body.response?.response : body.response;
        if (!Array.isArray(result?.docs) || !Number.isInteger(result.numFound) || result.numFound < 0 || Number(result.start) !== start) throw new Error('Invalid product response');
        if (total !== undefined && result.numFound !== total) throw new Error('Product results changed during sync');
        total = result.numFound;
        for (const doc of result.docs) {
          if (!allowed.has(doc.productId)) throw new Error('Product response outside requested scope');
          const key = doc['docType-identifier'];
          if (!key || seen.has(key)) throw new Error('Product pagination repeated a document');
          seen.add(key); documents.push(doc);
        }
        if (!result.docs.length && start < total!) throw new Error('Incomplete product response');
        start += result.docs.length;
      } while (start < total!);
    }
    return documents;
  }

  async users(userLoginIds: string[]) {
    if (!userLoginIds.length) return [];
    const allowed = new Set(userLoginIds);
    const { body } = await this.request('oms/users', { userLoginId: userLoginIds, userLoginId_op: 'in', pageSize: userLoginIds.length });
    if (!Array.isArray(body) || body.some(row => !allowed.has(row.userLoginId))) throw new Error('Invalid receiver response');
    return body as Row[];
  }
}
