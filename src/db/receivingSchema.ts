import { defineEntity } from '@common/db/schema/defineEntity';
import { defineSchema } from '@common/db/schema/defineSchema';

// Each declaration projects an existing API response; no display/search rows are persisted.
const receiptFields = {
  orderId: 'text', orderItemSeqId: 'text', productId: 'text', facilityId: 'text', shipmentId: 'text',
  datetimeReceived: 'date', receivedAtSort: 'date', receivedByUserLoginId: 'text', productStoreId: 'text',
  quantity: 'count', quantityAccepted: 'count', quantityRejected: 'count',
} as const;

export const receivingSchema = defineSchema({
  transferOrders: defineEntity({
    primaryKey: 'orderId',
    fields: {
      orderId: 'text', orderName: 'text', externalId: 'text', statusId: 'text', status: 'text',
      orderDate: 'date', productStoreId: 'text', statusFlowId: 'text', currencyUom: 'text',
      originFacilityIds: 'structured', destinationFacilityIds: 'structured', pendingReceiptFacilityIds: 'structured',
    },
    rename: { externalId: 'orderExternalId', statusId: 'orderStatusId', status: 'orderStatusDesc' },
  }),
  transferItems: defineEntity({
    primaryKey: 'itemKey',
    fields: {
      itemKey: 'text', orderId: 'text', orderItemSeqId: 'text', productId: 'text', shipGroupSeqId: 'text',
      facilityId: 'text', orderFacilityId: 'text', statusId: 'text', quantity: 'count',
      totalIssuedQuantity: 'count', totalReceivedQuantity: 'count', cancelQuantity: 'count',
    },
    indexes: ['[orderId+orderFacilityId+statusId]', 'productId'],
  }),
  // AccxUI has no shared product entity in this checkout. Match Inventory Count's
  // products/identifications split, retaining multiple values per identification type.
  products: defineEntity({
    primaryKey: 'productId',
    fields: {
      productId: 'text', productName: 'text', parentProductName: 'text', internalName: 'text',
      sku: 'text', upc: 'text', smallImageUrl: 'text', mediumImageUrl: 'text', largeImageUrl: 'text',
      mainImageUrl: 'text', productFeatures: 'structured', goodIdentifications: 'structured',
      identifierConflict: 'structured', canonicalDocument: 'structured', updatedAt: 'date',
    },
    indexes: ['updatedAt'],
  }),
  productIdentification: defineEntity({
    primaryKey: 'identificationKey',
    fields: { identificationKey: 'text', productId: 'text', identKey: 'text', value: 'text' },
    indexes: ['productId', '[identKey+value]', 'value'],
  }),
  transferPackages: defineEntity({
    primaryKey: 'packageKey',
    fields: {
      packageKey: 'text', orderId: 'text', facilityId: 'text', shipmentId: 'text',
      shipmentPackageSeqId: 'text', shipmentStatusId: 'text', trackingCode: 'text',
    },
    indexes: ['[facilityId+orderId]', '[facilityId+trackingCode]'],
  }),
  transferPackageItems: defineEntity({
    primaryKey: 'contentKey',
    fields: {
      contentKey: 'text', packageKey: 'text', orderId: 'text', facilityId: 'text',
      orderItemSeqId: 'text', shipmentItemSeqId: 'text', productId: 'text', quantity: 'count',
    },
    indexes: ['[facilityId+orderId]', 'packageKey', '[orderId+orderItemSeqId]'],
  }),
  transferMisShippedReceipts: defineEntity({
    primaryKey: 'receiptId', fields: { receiptId: 'text', ...receiptFields },
    indexes: ['productId', '[orderId+receivedAtSort+receiptId]', '[orderId+productId+receivedAtSort+receiptId]'],
  }),
  transferReceiptGroups: defineEntity({
    primaryKey: 'receiptGroupKey', fields: { receiptGroupKey: 'text', ...receiptFields },
    indexes: ['[orderId+receivedAtSort+receiptGroupKey]', '[orderId+orderItemSeqId+receivedAtSort+receiptGroupKey]'],
  }),
  receivingUsers: defineEntity({
    primaryKey: 'userLoginId', fields: { userLoginId: 'text', fullName: 'text', fetchedAt: 'date' },
  }),
});

// The shared declaration validator does not yet support Dexie's multi-entry syntax.
receivingSchema.stores.transferOrders += ', *originFacilityIds, *destinationFacilityIds, *pendingReceiptFacilityIds';
