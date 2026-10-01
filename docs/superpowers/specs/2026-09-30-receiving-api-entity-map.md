# Receiving API contracts and local entities

This is the API/data-model companion to the [Receiving local-data design](2026-09-30-local-transfer-receiving-design.md). Store normalized source entities in IndexedDB, with indexed facility-ID arrays directly on each transfer. Derive list/search results with Dexie liveQuery and in-memory computations; persisted materialized views are deferred until measurements justify them.

## Evidence boundary

The shapes below originally came from Receiving call sites, local REST mappings, service actions, entity views, and Moqui's REST/pagination implementation. On 2026-10-01, authenticated Demo checks confirmed the list/detail/product envelopes, nonempty package records, receipt history, receiver-name enrichment, and live inventory. Signed-in Receiving QA verified partial, complete, over- and under-receiving with authoritative readbacks. Local SKU and tracking-code searches also passed. A live comparison verified client-only enumeration using the existing grouped-transfer count: ten pages returned the same 96 eligible Brooklyn rows as a full read, within 98 candidates. No backend changes are permitted or required by this revised approach. See the [validation notes](../../qa/2026-10-01-local-receiving.md) for evidence and limitations, and the [resolved current AccxUI integration](../../qa/2026-10-01-current-accxui.md).

| Source | Inspected revision and primary files |
| --- | --- |
| Receiving | [7fd8a25: transfer store](https://github.com/hotwax/receiving/blob/7fd8a25e50dac5477eb2940f263853e8457101d4/src/store/transferorder.ts), [product store](https://github.com/hotwax/receiving/blob/7fd8a25e50dac5477eb2940f263853e8457101d4/src/store/product.ts) |
| AccxUI | [2e4a524: common/db](https://github.com/hotwax/accxui/tree/2e4a524fca7bf4c913e43124b5a76bff5c6ecb98/common/db), [product response normalization](https://github.com/hotwax/accxui/blob/2e4a524fca7bf4c913e43124b5a76bff5c6ecb98/common/composables/useSolrSearch.ts) |
| Cycle Count | [35de458: existing product tables](https://github.com/hotwax/inventory-count/blob/35de4582f2c3c92b85df0193c5c4e7919083580b/src/services/commonDatabase.ts), [product master](https://github.com/hotwax/inventory-count/blob/35de4582f2c3c92b85df0193c5c4e7919083580b/src/composables/useProductMaster.ts). Inspected on codex/pos-count-admin-build; an unrelated package.json modification was left untouched. |
| OMS | [a68cd7f: TransferOrderServices](https://github.com/hotwax/oms/blob/a68cd7fd6d817dee2116ef42884b3dd7cec11432/service/co/hotwax/orderledger/order/TransferOrderServices.xml), [order views](https://github.com/hotwax/oms/blob/a68cd7fd6d817dee2116ef42884b3dd7cec11432/entity/OmsViewEntities.xml), [product document builder](https://github.com/hotwax/oms/blob/a68cd7fd6d817dee2116ef42884b3dd7cec11432/service/co/hotwax/oms/search/SearchServices.xml) |
| Poorti | [40443ed: REST mapping](https://github.com/hotwax/hotwax-poorti/blob/40443edf87de0d0630e2aeaf462dfd56991fc09b/service/poorti.rest.xml), [transfer services](https://github.com/hotwax/hotwax-poorti/blob/40443edf87de0d0630e2aeaf462dfd56991fc09b/service/co/hotwax/poorti/TransferOrderFulfillmentServices.xml), [receipt views](https://github.com/hotwax/hotwax-poorti/blob/40443edf87de0d0630e2aeaf462dfd56991fc09b/entity/FulfillmentViewEntities.xml) |
| Maarg util | [7cb7ffa: Solr request service](https://github.com/hotwax/hotwax-maarg-util/blob/7cb7ffac57721437469b66835885bc3a4daf54b4/service/co/hotwax/solr/SolrServices.xml), [response wrapper](https://github.com/hotwax/hotwax-maarg-util/blob/7cb7ffac57721437469b66835885bc3a4daf54b4/src/main/groovy/co/hotwax/solr/SolrServices.groovy) |
| Framework | [4fb412e: entity REST responses](https://github.com/hotwax/moqui-framework/blob/4fb412e24079545ed0d71fe9669f01333fded0c0/framework/src/main/groovy/org/moqui/impl/service/RestApi.groovy), [search-form pagination](https://github.com/hotwax/moqui-framework/blob/4fb412e24079545ed0d71fe9669f01333fded0c0/framework/src/main/groovy/org/moqui/impl/entity/EntityFindBase.groovy) |

These commits identify what was inspected; they do not imply deployment. Shared database contracts in this document refer to AccxUI 2e4a524. The publication branch now uses the storage, entity, and sync-harness contracts from AccxUI `c91b85d`, with an in-place Receiving cache migration that preserves receipt guards. See the current compatibility follow-up above.

## 1. API-to-entity map

Routes below include the Moqui prefix. Resolve the configured Maarg base and current auth exactly as Receiving's shared api does; never derive the backend from the localhost frontend URL. Existing calls use the shared Authorization bearer flow. Worker helpers return parsed bodies, whereas main-thread Axios callers access response.data. Adapters must not mix those two envelopes.

| ID | Request and scope | Successful body | Local destination | Refresh/write ownership |
| --- | --- | --- | --- | --- |
| A0 | GET /rest/s1/oms/transferOrders/grouped, selected destination, approved status and receiving flows; pageSize=1 | { orders: CandidateRecord[], ordersCount: number } with a true count before receiving eligibility | Transient enumeration bound; no entity | Read before and after A1 traversal. Changed/invalid counts prevent pruning. |
| A1 | GET /rest/s1/oms/transferOrders, selected destination facility, every page | { orders: TransferListRecord[], ordersCount: number } | transferOrders header fields and pendingReceiptFacilityIds, plus partial origin/destination arrays | Reconcile only the selected facility's presence in the array after complete enumeration. Preserve other facilities and hydrated items. |
| A2 | GET /rest/s1/oms/transferOrders/{orderId} | { order: TransferDetail } with items[] and shipGroups[] | transferOrders and transferItems | Atomic replacement of one validated order's server snapshot; liveQuery refreshes dependent results. |
| A3 | GET /rest/s1/poorti/transferShipments/packages, destinationFacilityId, pageIndex=0, limit expanded to the returned total when needed | { shipmentPackages: PackageRecord[], shipmentPackagesCount: number } | transferPackages | Full facility package snapshot, intersected with pending membership. An orderId-scoped request is available for targeted refresh. |
| A3b | GET /rest/s1/poorti/transferShipments, orderId (existing unpaged service) | { shipments: [{ shipmentId, shipmentStatusId, orderFacilityId, packages: [{ shipmentPackageSeqId, trackingCode, items }] }] } | transferPackages + transferPackageItems | Worker atomically replaces order/destination packages and shipped contents. Deduplicate repeated entity joins by source identity. Noncancelled unshipped tracking remains labelled; only shipped quantities drive receipt filters. |
| A4 | POST /rest/s1/admin/search/query, batches of referenced product IDs | { response: { responseHeader: ..., response: { numFound, start, docs: ProductDocument[] } } } | Existing product-master model: products + productIdentification | Product batch hydration/refresh. The POST is a read query. |
| A4b | POST /rest/s1/admin/runSolrQuery when the current app selects the legacy product-search mode | { responseHeader: ..., response: { numFound, start, docs: ProductDocument[] } } | Same products/productIdentification entities as A4 | Mode-specific alternative to A4, not a second request for each batch. |
| A5 | GET /rest/s1/poorti/transferOrders/{orderId}/misShippedItems | MisShippedReceipt[] | transferMisShippedReceipts; referenced products hydrated through A4 | Complete per-order snapshot, keyed by receipt identity. |
| A6 | GET /rest/s1/poorti/transferOrders/{orderId}/receipts | ReceiptGroup[] | transferReceiptGroups | Complete per-order aggregate-history replacement. |
| A7 | GET /rest/s1/oms/users, filtered batches of distinct login IDs referenced by loaded receipts/orders | ReceiverRecord[] | receivingUsers (referenced-user enrichment only) | Fetch missing/expired names. Never enumerate the OMS user directory. |
| A8 | POST /rest/s1/poorti/transferOrders/{orderId}/receipts | { orderStatusIds: string[], receiptIds: string[] } | Triggers A2/A5/A6 and membership reconciliation; does not directly overwrite an order | Existing backend mutation followed by authoritative readback. |
| A9 | GET /rest/s1/poorti/getInventoryAvailableByFacility, facilityId + productId | { atp, qoh, minimumStock, computedAtp } | Transient UI state only; no IndexedDB entity | Fetch live when inventory is shown/requested; refresh affected visible values after receipt success. Independent of pending-order and local-search readiness. |

No new reference-data API fan-out is required to render these responses: statuses already include descriptions, and the selected facility/product-store preferences already exist in Receiving. If reference records are moved into this DB, reuse common facilities/productStores/statuses schemas and projections. Do not fetch the entire common seed catalog just to activate transfer storage.

### A1. Pending membership and header fields

Request parameters:

```text
destinationFacilityId = selected facility
orderStatusId = ORDER_APPROVED
statusFlowId = [TO_Fulfill_And_Receive, TO_Receive_Only]
excludeOriginFacilityIds = [REJECTED_ITM_PARKING]
limit = 100                         # initial proposed batch size
pageIndex = 0, 1, ...
orderBy = orderId,facilityId         # tie-break distinct origin rows; verify deployment
fieldsToSelect = orderId,orderName,orderExternalId,orderStatusId,
                orderStatusDesc,orderDate,productStoreId,statusFlowId,
                facilityId,orderFacilityId
```

Do not send search terms during enumeration. Arrays must retain the existing shared serializer's semantics.

| Returned field | Normalized meaning |
| --- | --- |
| orderId | Canonical order identity; required string. |
| orderName | Display/search order name. |
| orderExternalId | The list's alias for header externalId. |
| orderStatusId / orderStatusDesc | The list's aliases for header statusId / status description. |
| orderDate | Server date, normalized to epoch milliseconds for sort; retain original in raw. |
| productStoreId / statusFlowId | Required eligibility context. |
| facilityId | Origin facility. It is NOT the selected receiving facility. |
| orderFacilityId | Destination facility; must agree with the membership scope. |

The service's receive-only eligibility branch reads statusFlowId and productStoreId from the selected record. Include those fields; a reduced projection that omits them can change server-side filtering. The current app's smaller fieldsToSelect does omit them.

The underlying view can produce more than one row per order when origins/ship groups differ. Store one transferOrders record per orderId; deduplicate origin/destination arrays and add the requested destination to pendingReceiptFacilityIds once. Do not count each row as another transfer or let the last row overwrite an origin filter's meaning.

Pagination correction from deeper source inspection: although the XML initially declares offset=pageIndex, its search-form-inputs calls searchFormMap after that. EntityFindBase then uses pageIndex * pageSize, with the existing limit as the default page size. The inspected framework therefore does implement page-number pagination here. The shared pager still needs an endpoint adapter because it does not supply this service's declared limit.

The service assigns ordersCount from orders.size() after eligibility filtering. A short or even empty eligible page can precede more eligible orders, so A1's count never determines exhaustion. Use the existing A0 grouped endpoint instead, with orderFacilityId, orderStatusId=ORDER_APPROVED, the same two statusFlowId values, fieldsToSelect=orderId,facilityId,orderFacilityId, pageSize=1, pageIndex=0, and orderByField=orderId,facilityId. Its ordersCount comes from the underlying distinct find count. These selected fields define the same order/origin/destination identity as A1; A1's remaining selected fields depend on the order header. A0 includes rejected origins and does not apply A1's receive-only eligibility filter, so its count is an upper bound rather than the final pending total.

Traverse max(1, ceil(A0.ordersCount / 100)) A1 pages even if an intermediate eligible page is empty. Reject repeated identities, invalid counts, and results exceeding the bound. Re-read A0 after traversal; reconcile removals only if its count is unchanged. A failure or changing count preserves the previous pending set and retries on the next pass. Offset pagination is eventually reconciled under concurrent backend changes; an unchanged count is not a server snapshot token. No new API fields, omitted eligibility fields, or server deployment is used. The live Brooklyn comparison with limit=10 matched the full-read identity set, including distinct origins, with zero duplicates.

### A2. Detail aggregate and item identity

The service builds this shape (field presence/nullability must be validated at the boundary):

```ts
type DecimalWire = number | string;
type TransferDetail = {
  orderId: string;
  orderName?: string; externalId?: string;
  statusId: string; status?: string;
  currencyUom?: string; productStoreId?: string; statusFlowId?: string;
  grandTotal?: DecimalWire;
  maySplit?: string;
  facilityId?: string; orderFacilityId?: string;
  carrierPartyId?: string; shipmentMethodTypeId?: string;
  items: TransferItemRecord[];
  shipGroups: Record<string, unknown>[];
};
type TransferItemRecord = {
  orderItemSeqId: string; shipGroupSeqId?: string;
  productId: string; statusId: string; status?: string;
  quantity: DecimalWire; cancelQuantity?: DecimalWire;
  totalIssuedQuantity: DecimalWire; totalReceivedQuantity?: DecimalWire | null;
  itemDescription?: string; maySplit?: string; unitPrice?: DecimalWire;
  facilityId?: string; orderFacilityId?: string;
  carrierPartyId?: string; shipmentMethodTypeId?: string;
};
```

The item records do not select orderId themselves; inject the validated envelope orderId. Use (orderId, orderItemSeqId) as item identity. shipGroupSeqId is an attribute of the OrderItem in the inspected view, not an additional identity dimension. Moving a line to a ship group must update the same local row and preserve its draft association. Duplicate item identities with conflicting data invalidate the aggregate instead of silently taking the last row.

The detail response does not select orderDate. Preserve the list-sourced date. Normalize list aliases on ingestion and merge only explicitly supplied fields; undefined is not an instruction to erase a known field, while an explicit null retains its source meaning.

The top-level origin/destination/carrier values are copied from the first item. For facility scope, use each item's orderFacilityId and the ship-group records, not the top-level first-item shortcut. A pending membership is insufficient to authorize receiving every item of a multi-destination order. Test the actual dataset for such orders and preserve the destination boundary in local reads/submissions.

totalIssuedQuantity is computed from SHIPMENT_SHIPPED shipment items; totalReceivedQuantity comes from ShipmentReceiptSummary. Retain these authoritative values. Do not rederive them by summing the history endpoint, subtract cancelQuantity again, or count duplicate product IDs as the same line. The detail service performs per-item backend work, so excessive parallel detail requests can move the bottleneck to the server.

Split the aggregate before storing: header raw excludes items; each item is stored once in transferItems. Retain the small original shipGroups array unindexed on the header for scope/compatibility; do not also make a second copy in a separate ship-group table without a query that needs it.

### A3. Tracking packages

Call with destinationFacilityId, shipmentStatusId=SHIPMENT_SHIPPED, limit=100, pageIndex=0. The service also accepts orderId, shipmentId, originFacilityId, orderName, trackingNumber, and fromShipmentPackageCreatedDate. shipmentPackagesCount is computed from the find count. If the total exceeds the limit, repeat page zero with limit equal to that total, then accept only a complete snapshot whose row count matches the returned total. Retry a growing count at most three times; otherwise preserve the last-good snapshot and retry later.

This endpoint excludes ordinary sales shipments in the inspected source: get#TransferOrderShipmentPackage queries co.hotwax.shipment.TransferOrderShipmentPackage, whose entity-condition hardcodes shipmentTypeId=OUT_TRANSFER ([view condition](https://github.com/hotwax/hotwax-poorti/blob/40443edf87de0d0630e2aeaf462dfd56991fc09b/entity/FulfillmentViewEntities.xml#L772-L774)). SHIPMENT_SHIPPED is an additional status filter, not the transfer-type restriction. The client does not need to send an undeclared shipmentTypeId parameter.

The facility query does not, however, restrict order status to the A1 pending set. It can include packages for older/completed transfers whose shipments remain shipped. Intersecting with pending membership prevents storing those rows but does not save their network cost. Measure the full facility package count before treating this as a throughput win; compare it with orderId-scoped fetching for the pending orders. A large historical package set may favor those scoped calls or a separately verified backend batch-order filter. Do not invent an orderId-list parameter or assume the facility result contains only pending transfers.

Each selected row contains orderId, orderName, orderExternalId, shipmentId, shipmentPackageSeqId, shipmentPackageCreatedDate, trackingCode. It does not select facility IDs or shipment status; attach the validated request's facility as local scope metadata rather than pretending those fields came from the row.

Natural identity is (shipmentId, shipmentPackageSeqId). Deduplicate by this pair, never trackingCode or orderId. Multiple packages may share a tracking code. Fetch the facility's package snapshot once per pass rather than making a package request for every order. Persist only packages associated with that facility's retained pending memberships. Reconcile an order-scoped refresh only within that order/scope.

The source sorts by creation date only. Reading all rows in one bounded page-zero response avoids relying on tie order across offset pages and requires no server-side sort change. A creation-date lower bound does not capture later tracking edits/cancellations, so it is not a valid change cursor. The previous detail-time call could miss packages beyond the default 20. Live Demo validation expanded a one-row probe to the reported total and returned 35 unique Brooklyn packages.

### A4. Products and identification values

For the Moqui route use the service's JSON request body directly, without the legacy outer json key:

```ts
{
  query: "*:*",
  filter: ["docType:PRODUCT", "productId:(<escaped quoted IDs>)"],
  fields: "productId,productName,parentProductName,internalName,sku,upc,goodIdentifications," +
          "productFeatures,mainImageUrl,isVariant,isVirtual,updatedDatetime," +
          "docType-identifier",
  params: { rows: 200, start: 0, sort: "docType-identifier asc" }
}
```

This is a request template, not an executed query. Start with 100 unique referenced IDs per batch, page the returned documents, and verify the configured collection's unique sort field. No isVariant:true predicate: both standalone and variant products must resolve. Do not import the current main-thread searchProducts helper into the worker unchanged; it adds the variant filter and its catch path converts failures into an empty result.

The product builder emits goodIdentifications as strings such as typeId/idValue, and productFeatures as typeId/description. The frontend additionally tolerates identification objects {type,value}. The source sets sku from internalName and upc from UPCA; those shortcuts are not guaranteed to equal a configured SKU identification.

Normalize each identification to {type,value}; preserve the value's leading zeroes, case, punctuation, and any slashes after the first delimiter. Preserve order for compatibility with the existing first-match lookup, and retain distinct values of the same type. Treat ShopifyShopProduct/shopId/productId as a namespaced reference, not a UPC. Add explicit direct-field identifiers for configured productId/internalName/sku/upc preferences; do not invent uppercase aliases.

Keep typed exact identifier keys for scanning and separately normalized text for human search. Product display and scanner resolution must use the configured identifier preference, including its fallback behavior. If a preference references an additional valid product field, include it in the selected fields and adapter explicitly.

The wire body from execute#SolrQuery is nested: body.response is the raw Solr result; its response.docs is the document array. The app's normalizeSearchResponse flattens this for Axios consumers. A worker adapter validates body.response.response.docs, numFound, and start.

The existing app also selects A4b when commonUtil.isMoqui() is false. The inspected admin REST mapping exposes it through co.hotwax.search.SearchServices.run#SolrQuery. A4b accepts {json: <the query object above>} and returns responseHeader/response/facets/grouped at the top level, so its docs path is body.response.docs. Select the adapter from the app's actual product-search mode; do not change modes during this migration or accept whichever array appears first. Both modes use the configured Maarg REST base in these call sites. Preserve mode in the worker configuration alongside that explicit base.

numFound counts documents, not unique product IDs. Exhaust the document pages needed to prove coverage; deduplicate by productId. Prefer a matching canonical PRODUCT-{productId} document when present, otherwise use a documented deterministic winner after examining duplicate contents. Conflicting identifiers must be reported, not unioned blindly into valid scan codes. Missing IDs remain explicitly unresolved and are retried or resolved through a verified authoritative fallback; no assumed fallback endpoint is specified here.

### A5/A6. Mis-shipped receipts and aggregate history are different entities

A5 maps to co.hotwax.shipment.TransferOrderMisShippedReceipt. It returns a bare array of ShipmentReceipt fields plus orderName, orderExternalId, statusFlowId, orderDate, entryDate. The view selects only receipts with no shipmentId/shipmentItemSeqId and no orderItemSeqId, but with an orderId. Preserve receiptId as the required receipt identity once confirmed in the deployed alias-all response. Store productId, orderId, facilityId when returned, quantityAccepted, quantityRejected, datetimeReceived, receivedByUserLoginId and the remaining raw receipt fields. The current UI assigns ITEM_COMPLETED for presentation; this is a derived display status, not an OrderItem status from A5. Do not create a fake transfer item sequence ID.

A6 maps to co.hotwax.shipment.TransferOrderItemReceipt. Its bare array contains these exact aliases:

```ts
type ReceiptGroup = {
  orderId: string; orderItemSeqId: string;
  datetimeReceived?: number | string | null;
  quantityAccepted: number | string;             // SUM in the view
  quantityRejected?: number | string | null;    // grouping field, NOT SUM
  receivedByUserLoginId?: string | null;
  productStoreId?: string | null; productId?: string | null;
  quantity?: number | string | null;            // ordered quantity, grouping field
};
```

There is no receiptId or shipmentId in A6. Create receiptGroupKey from the entire non-aggregate grouping tuple: orderId, orderItemSeqId, datetimeReceived, quantityRejected, receivedByUserLoginId, productStoreId, productId, quantity. Exclude the summed quantityAccepted. This is an encoded local aggregate key, never a fabricated server receipt ID. Canonicalize timestamps and decimal key values without rounding; distinguish null from zero/empty. Replace/prune only the successfully completed order-history scope. Since grouping dimensions can change, append-only history sync is incorrect here.

Page both endpoints with pageIndex and pageSize=200. Moqui entity-list operations provide X-Total-Count, X-Page-Index, X-Page-Size and related headers; retain those headers when readable and verify CORS exposure. The shared workerGet currently discards them, so the app adapter must preserve response metadata where it is needed. Strict array validation and a stable ordered, exhausted page walk remain necessary. Choose orderByField from the actual view fields: datetimeReceived/orderItemSeqId/receiver/group dimensions for A6 and datetimeReceived/receiptId for A5. Validate ordering against tied dates and overlapping pages.

### A7/A8/A9. Receiver labels, mutation acknowledgement, and inventory

A7 is co.hotwax.party.UserLoginNameView with userLoginId, partyId, statusId, firstName, middleName, lastName, groupName. It is a selective enrichment call, never a directory bootstrap or a poll of all OMS users. In the current API shapes the concrete dependency is receivedByUserLoginId from A5/A6; A1/A2 do not require receiver-name enrichment.

After receipt rows commit, collect their distinct nonempty receivedByUserLoginId values. Read those keys from receivingUsers with bulkGet; enqueue only missing names or names older than the proposed 24-hour label TTL, and coalesce duplicates already in flight. Start with at most 50 IDs per request using userLoginId plus userLoginId_op=in and explicit pageSize/pageIndex; verify the existing serializer and deployed filter behavior. Never send an empty ID filter or retry an unsupported filter as an unfiltered list request. Accept/cache only requested IDs. If batch filtering is unsupported, block that adapter and use login IDs until a verified targeted lookup is available.

Store userLoginId, partyId, statusId, firstName, middleName, lastName, groupName, derived fullName and fetchedAt/lastReferencedAt. Match the current display rule (firstName + lastName, otherwise login ID). Reuse cached labels immediately; refresh expired labels only while they are referenced. Names never gate list/detail readiness. A failed response preserves cached labels and retries with backoff; a successfully exhausted filtered result that omits an ID records a short missing-name retry delay, not a deleted user or a blank replacement name. Prune enrichment rows unreferenced by retained order/receipt data and active views after a proposed seven-day idle period. Storage and requests scale with participating users, not total OMS users.

A8 retains Receiving's current payload: facilityId, receivedDateTime, items[{orderItemSeqId?,productId,quantityAccepted,statusId}]. The service also declares optional shipment context in the inspected version, but this migration does not change the submission mode. Successful orderStatusIds/receiptIds are an acknowledgement, not a hydrated transfer. Mark the order refreshing, refetch A2/A5/A6, refresh A9 for affected products whose inventory is currently shown, and reconcile A1 membership. Never repeat the POST merely because the local readback failed.

A9 requires productId/facilityId and returns atp,qoh,minimumStock,computedAtp. These are live inventory values, excluded from IndexedDB, persisted Pinia state, product-master snapshots, and background transfer hydration. Fetch when the inventory value is shown or explicitly requested; retain the response only as transient state for that view. On revisiting the view or changing facility/product, fetch again. After a receipt succeeds, clear the affected displayed values and fetch fresh values if that inventory view remains visible. Reject obsolete in-flight responses so a pre-receipt request cannot restore old values.

A missing ProductFacility explicitly produces zero values in the service. A transport/error response must display unavailable/retry state rather than zero or an old value presented as current. Keep A9 outside bootstrap/search readiness. Local order/item filtering does not trigger inventory requests; explicitly viewing inventory does. Do not add Cycle Count's productInventory table to Receiving or replace this live endpoint with its inventory data-document workflow.

## 2. Concrete Dexie schema

### Reuse the existing product master

Cycle Count already defines products and productIdentification in src/services/commonDatabase.ts, with normalization, batch upserts, cached reads, and liveProduct in useProductMaster.ts. Reuse these product-master entity names and field contracts; remove the previously proposed transferProducts entity. Its separate productInventory table is excluded because Receiving will fetch inventory live. Product master data is not transfer-specific. AccxUI's common/composables/useProducts.ts also resolves products, but currently keeps an in-memory Map rather than durable tables; COMMON_DB_SCHEMA does not yet export these product entities.

The integration boundary is the product schema, pure normalization, and product/identifier transaction. Cycle Count's composable imports its own initialized DB, stores, and count/variance workflows, so do not import that whole app module into Receiving or open its CommonDB singleton. For this first migration keep the adapted product entities in Receiving, as requested for entities missing from common; factor the reusable definitions into common when they are promoted. Preserve product-master fields, including parentProductName and goodIdentifications, and add productFeatures plus validated source fields required by Receiving. No second transfer-only product cache.

Two correctness adaptations are required: Cycle Count's existing [productId+identKey] key holds only one value per identifier type, and its bulkPut-only writer leaves removed identification types behind. Receiving uses identificationKey=tuple(productId,identKey,value), a productId index for replacement, and [identKey+value] for exact typed lookup. Retain a value index for product-master prefix search. In one transaction, diff and replace identifiers only for successfully refreshed products and upsert those products. Dependent live queries refresh their results after commit; there is no persisted transfer-search document to rebuild. Missing/failed products do not erase identifiers. Keep every matching product when a barcode is ambiguous. Use bulkGet for requested product IDs instead of copying Cycle Count's whole-table prefetch scan or its first-match identifier lookup.

This reuses the established model with explicit adapter changes; it does not claim byte-for-byte schema compatibility. Table/schema reuse also does not imply that separate deployed app origins share the same physical browser database. Receiving retains the connection/user-scoped DB and worker lifecycle below.

### Tables and indexes

The DB is isolated by canonical backend connection(s) and authenticated user, not by the currently selected facility. Keep records for previously visited facilities in this same DB so switching A -> B -> A can reuse A's downloaded orders, items, products, packages, and history. Store each canonical order once, including all its facility-ID arrays; sync coverage stays facility-scoped in syncMeta. Presentation/search results are computed in memory for the active facility. All synthesized keys use a collision-safe tuple encoder, not delimiter concatenation with unspecified escaping. IDs remain strings.

This schema lists keys/indexes only; it does not enumerate every stored field. BaseDB adds syncMeta itself. Shared reference schemas are composed only when those reference tables are actually needed.

Persist deduplicated string arrays directly on transferOrders:

- originFacilityIds: origin relationships from all items/ship groups, indexed for origin filtering.
- destinationFacilityIds: destination relationships from all items/ship groups, indexed for destination filtering.
- pendingReceiptFacilityIds: destinations where A1 has returned this transfer as pending receipt, indexed for the Receiving list. This is local scope metadata derived from A1, not a field returned by A2.

Derive complete origin/destination arrays from validated A2 items/ship groups (item facilityId is origin, orderFacilityId is destination); before detail hydration, retain A1's discovered associations as partial seeds. A1 for one facility must not replace associations learned for another facility. A complete A2 snapshot may replace the origin/destination arrays, but must preserve pendingReceiptFacilityIds and trigger A1 reconciliation when eligibility may have changed. Destination alone does not prove pending-receipt eligibility.

There is no separate facility-membership table or facility/order record. Facility selection queries the transferOrders multi-entry index directly. To reconcile facility F, collect the distinct orderIds across its validated A1 pages. Add F to returned orders as pages arrive; only after proven complete enumeration remove F from orders absent from that result. Never remove another facility from an array or delete the whole order during this step. Re-read and merge current arrays inside the fenced write transaction, so detail refreshes and other facility updates cannot overwrite them. Commit completion metadata with the final reconciliation; interrupted/failed enumeration never removes F. Order/data cleanup is a separate retention decision that must respect other facility relationships, active queries, and drafts.

```ts
const RECEIVING_SCHEMA = {
  transferOrders: "orderId, *originFacilityIds, *destinationFacilityIds, *pendingReceiptFacilityIds",
  transferItems: "itemKey, [orderId+orderFacilityId+statusId], productId",
  products: "productId, updatedAt",
  productIdentification: "identificationKey, productId, [identKey+value], value",
  transferPackages: "packageKey, [facilityId+orderId], [facilityId+trackingCode]",
  transferPackageItems: "contentKey, [facilityId+orderId], packageKey, [orderId+orderItemSeqId]",
  transferMisShippedReceipts:
    "receiptId, productId, [orderId+receivedAtSort+receiptId], " +
    "[orderId+productId+receivedAtSort+receiptId]",
  transferReceiptGroups:
    "receiptGroupKey, [orderId+receivedAtSort+receiptGroupKey], " +
    "[orderId+orderItemSeqId+receivedAtSort+receiptGroupKey]",
  receivingUsers: "userLoginId",
};
```

Compound indexes supply their leading-prefix queries; no redundant orderId/facilityId indexes are needed where a declared compound index already starts with that field. The * prefix creates a multi-entry index over each facility array, allowing an equals(facilityId) query to return every related order. Keep these as separate multi-entry indexes, not compound indexes containing arrays. These choices follow [Dexie's compound-index](https://dexie.org/docs/Compound-Index) and [multi-entry-index](https://dexie.org/docs/MultiEntry-Index) contracts. There is no persisted search-token index in the initial schema; the query paths below distinguish indexed lookups from in-memory text filtering.

| Entity | Source -> stored fields | Key and write boundary |
| --- | --- | --- |
| transferOrders | A1 aliases -> orderId/orderName/externalId/statusId/status/orderDate/productStoreId/statusFlowId, partial origin/destination arrays, and presence of the requested destination in pendingReceiptFacilityIds. A2 -> same server fields plus currencyUom/grandTotal/first-item summary/shipGroups; derive complete originFacilityIds/destinationFacilityIds from all items/ship groups. Indexed arrays are top-level fields; header raw excludes items and does not pretend local pendingReceiptFacilityIds came from the server. | orderId. Shared across retained facilities. A2 atomically updates header/lines while preserving A1-only date and pendingReceiptFacilityIds. A1 adds/removes only its own facility from the pending array, with removals gated on complete enumeration. Dependent live queries refresh. Header-only records carry detailReady=false in sync metadata. |
| transferItems | A2 item + envelope orderId -> itemKey, orderId, orderItemSeqId, shipGroupSeqId, productId, statusId, orderFacilityId, facilityId, normalized quantity/issued/received/cancel values, raw original item. | itemKey=tuple(orderId,orderItemSeqId). Full A2 replaces that order's item set atomically, including deletion of removed lines. |
| products | Existing product-master fields from A4 -> productId, productName, parentProductName, internalName, mainImageUrl, goodIdentifications; add productFeatures, selected direct identifiers, source updatedDatetime, local updatedAt and selected raw document. | productId. Batch upsert; no global deletion because one queried batch omitted a product. Missing/conflicting products tracked separately. |
| productIdentification | A4 normalized identifications -> productId, identKey (identifier type), value, identificationKey; include configured direct-field identifiers under explicit, collision-safe field namespaces. | identificationKey=tuple(productId,identKey,value). Exact typed lookup through [identKey+value]; atomic per-product replacement with products. |
| transferPackages | A3 row -> packageKey, facilityId from request scope, orderId, shipmentId, shipmentPackageSeqId, trackingCode, package-created time, raw. | packageKey=tuple(shipmentId,shipmentPackageSeqId). Index [facilityId+trackingCode] for tracking lookup/filtering and [facilityId+orderId] for order packages. Tracking is non-unique. Replace completed facility or order+facility scope only. |
| transferMisShippedReceipts | A5 -> receiptId, orderId, productId, original facility when present, receivedAtSort, accepted/rejected values, receiver ID, raw. | receiptId. Full per-order snapshot; keep separate from normal items and grouped receipts. |
| transferReceiptGroups | A6 -> receiptGroupKey, orderId, orderItemSeqId, productId, receivedAtSort, quantityAccepted/rejected, receiver/store IDs, ordered quantity, raw group. | Full grouping tuple defined above. Full per-order snapshot; quantityAccepted changes update one aggregate. |
| receivingUsers | Filtered A7 -> userLoginId, partyId, names/groupName/statusId, derived fullName, fetchedAt/lastReferencedAt, raw selected receiver. | userLoginId. Only referenced users; batch upsert/expiry by requested IDs. No directory sync or name-search indexes. |
| syncMeta (shared) | Worker results -> scope/generation, membership completeness, per-order detail/product/history/package coverage, last successful check, error/retry state, writer lease. | Namespaced keys. Update coverage only after the corresponding successful data transaction. No tokens/credentials. |

Use the shared projection convention for individual source records: indexed/normalized fields at the top level, a raw subrecord, syncedAt. This is source-field normalization, not a persisted multi-table view. Split source aggregates into subrecords before projection; retaining raw does not mean duplicating the original order.items in every representation. Consumers needing projected fields must read DbRow, not assume shared records/all() returns both raw and projections.

Do not index quantity, productName, every header field, or raw objects without a specific indexed query. Sort the selected facility's matching headers in memory, including the default date sort; there is no cross-table facility/date index in this normalized schema. Missing dates use a computed numeric sort fallback of 0 while raw preserves missing/null. Required scope/status fields must be present for compound indexes; invalid records fail validation rather than disappearing from an index silently.

## 3. Read paths and throughput

### Reactive views, without persisted view tables

Use Dexie liveQuery to execute read-only query functions over the normalized tables. We write the joins, filters, and arithmetic; Dexie tracks the reads and reruns a query when relevant Dexie writes commit, including worker writes. It does not incrementally maintain a persisted materialized view. This follows [Dexie's liveQuery contract](https://dexie.org/docs/liveQuery%28%29). AccxUI's existing useDbList/useDbRecord already expose live-query results as Vue refs; multi-table reads need app query functions using the same subscription lifecycle.

Perform all dependency reads inside the liveQuery callback, using a read transaction where a consistent multi-table snapshot is needed. Do not hide source reads in a long-lived external cache that Dexie cannot observe. Keep API requests and DB writes outside these callbacks. Facility, filter, and sort changes are UI inputs: explicitly recompute results or recreate the appropriate subscription, since Dexie does not observe arbitrary Pinia state. Dispose obsolete subscriptions and reject results from old scope/query generations.

Pinia owns selected facility, search/filter/sort controls, selection, and drafts. Composables hold current result pages and the active order's view model in memory. There is no second persisted Pinia dataset and no transferListRows or transferSearchRows table.

### Pending list

Read the selected facility's transfers directly with db.transferOrders.where("pendingReceiptFacilityIds").equals(facilityId) inside liveQuery. Origin/destination relationship filters use originFacilityIds/destinationFacilityIds; they do not replace pending eligibility. Filter and sort the matching headers in memory by orderDate ascending and orderId as a stable tie-break, preserving the current default. Paginate after filtering/sorting; do not limit the facility query before knowing which orders match. Keep this header result reactive and reuse it for UI-only sort/filter changes rather than rereading it on every keystroke. There is no membership-to-header join. A later newest-first default is a separate product choice.

For the visible page, read its destination-scoped transferItems through [orderId+orderFacilityId+statusId] and calculate display counts in a live query. Fetch products/packages only when the displayed fields require them; receipt history is not part of the default list join. If a filter or sort depends on calculated item counts, evaluate those counts across the full candidate set before paging. Missing detail is a loading/partial state, not zero items. These are application query functions, not automatic SQL joins, so measure their cost on the real facility dataset.

### Switching facilities

Switch the transferOrders live query to the selected facility's pendingReceiptFacilityIds index entry, derive its view locally, and show its last good data with its own freshness state without waiting for the network. Local joins/search-corpus construction may run again on a revisit; this design avoids a network redownload, not all local computation. Do not clear tables, remove the previous facility from any order's arrays, change the database name, or reset shared products when the selected facility changes. Reuse hydrated canonical order detail and products; schedule missing/stale work and reconcile the newly active facility's pending set. Coverage for A is never evidence that B is complete. Inactive facilities retain their last successful snapshots; pause their periodic work and reconcile when revisited rather than continuously polling every visited facility.

Fence requests from the previous facility generation before they write or update the selected view. Preserve drafts under (facilityId,orderId), so A's entered quantities cannot appear in B. Reconciliation after a complete B enumeration may remove only B from pendingReceiptFacilityIds on absent orders. Keep their origin/destination relationships, other pending facility IDs, and cached detail. Switching alone never deletes an order. Account/connection changes and logout keep their separate isolation/cleanup rules. ATP/QOH still requires a live request when shown after a switch.

### Order/product/tracking search

For an exact tracking-code filter, query transferPackages through [facilityId+trackingCode] using the selected facility and code. Return every matching package, deduplicate orderIds, bulkGet their transferOrders rows, and keep those whose pendingReceiptFacilityIds contains the selected facility. Preserve strings including leading zeroes; multiple packages/orders may share a code. Updating the package record updates its native index; liveQuery reruns dependent reads. No separate search-row write is needed.

For an exact SKU/barcode filter, query productIdentification through [identKey+value]; for identifier prefix search use its value index and apply the requested identifier type. Resolve every matching productId through the productId indexes on transferItems and, when relevant, transferMisShippedReceipts. Enforce the selected destination/receipt facility, deduplicate orderIds, bulkGet headers and check pendingReceiptFacilityIds, then sort/page matching headers. An exact productId can use those reverse indexes directly. A shared identifier must return all matching orders. Do not cap product matches before resolving/filtering orders and silently lose valid results.

For general text across order ID/name/external ID, product names/parent names/identifiers/features, and tracking, use a facility-scoped liveQuery to read transferOrders through pendingReceiptFacilityIds, destination-scoped items/mis-shipped receipts, referenced products via bulkGet, and scoped packages. Derive a compact searchable corpus in worker memory from those reads. Rebuild it when relevant data changes; typing filters the latest corpus in memory without repeating the DB joins. Normalize human-search text separately from exact scan values. Apply all terms and filters before paging; cancel obsolete query results by generation. This corpus is transient, read-derived, and discarded on scope/session changes, not another IndexedDB table or durable Pinia cache.

General substring/phrase matching is an in-memory scan, not an indexed full-text query. The corpus excludes unrelated facilities and receipt history. Measure its initial build time, live-query rerun cost, memory use, and search latency. Dexie may rerun the callback for a changed quantity even if its searchable fields are unchanged; do not claim incremental materialized-view maintenance. Never truncate terms, candidate products, or orders silently to meet a size cap.

### Detail, filters, and barcode scans

Within a liveQuery callback and local read transaction: get one transferOrders row, query transferItems by orderId + selected orderFacilityId, bulkGet the distinct productIds, and read that order's scoped packages/mis-shipped receipts. Map products once per emitted source result. Keep a lightweight in-memory view model for the active order and build its typed barcode -> eligible item IDs map once per relevant product/item change. A scan then performs a map lookup and modifies the draft; it does not query the network or re-scan every cached product.

All/Open/Received filters run on the active order's local items or its compound status index. Preserve the current status rules: Open excludes ITEM_COMPLETED/ITEM_REJECTED/ITEM_CANCELLED; Received includes ITEM_COMPLETED. Keep mis-shipped receipt presentation separate until building the view model. Do not collapse different item sequence IDs for the same product. Ambiguous barcode matches retain candidate identities and must follow the established receiving rule, rather than silently overwriting one map entry.

History reads use the order/time index or order/item/time index on transferReceiptGroups, merge the corresponding order/product mis-shipped receipts when relevant, and bulkGet distinct receiver names. Use receivedAtSort plus the row key as a stable local history cursor. Reading one item's history does not deserialize every receipt in the facility.

Apply the returned facility to mis-shipped receipt presentation. A6 does not expose a receipt facility: its order/item history cannot prove the historical receiving destination if an item has moved between destinations. Keep that distinction explicit instead of manufacturing facility metadata from the selected store. A product-only history lookup can filter the bounded order-history result locally; it does not justify another index until that query is measured.

### Materialized views are a later optimization

The initial implementation does not persist list summaries or search documents and has no worker loop to maintain them. An order refresh writes its changed header/items and coverage metadata; a product refresh writes the product and identification records. Dexie observes those writes and refreshes dependent read results. The productId indexes on items/mis-shipped receipts support identifier-to-order queries, not search-document maintenance.

If measured list joins or text search miss the agreed latency/memory targets, first inspect query scope, batching, and rerun frequency. Consider a narrowly scoped persisted projection only when a demonstrated bottleneck justifies its storage, rebuild, and consistency costs. Specify and test that projection's update rules separately; it is not part of this first implementation.

## 4. Fetch/write schedule tied to those entities

| Trigger | Calls | Atomic writes and follow-up |
| --- | --- | --- |
| Facility selected / first bootstrap | Reuse that facility's local source rows first; A1 all pages; A3 facility pages in lower priority; A2/A5 for missing or due orders; A4 missing/expired unique products; A6/A7 lower priority | Retain other facilities' snapshots. Merge A1 header fields and its facility-array entry in the same transferOrders row; commit each A2 header/item snapshot atomically while preserving pendingReceiptFacilityIds. Commit A5/A3 in their own validated scopes and coverage metadata with the corresponding data. Live queries derive visible results. Final A1 array removals require authoritative enumeration for this facility. |
| Pending-set tick | A1 full traversal until a proven incremental contract exists | Merge list-sourced header fields and add this facility to pendingReceiptFacilityIds for returned orders. After complete enumeration, remove only this facility from absent orders' pending arrays. Keep all other facility IDs and cached detail. No whole-order deletion during reconciliation. |
| Detail sweep / foreground order refresh | A2 + A5 for due orders; A4 only unresolved/expired product batches | Bounded work queue, no overlapping request generation per order. Membership unchanged does not imply quantities unchanged. Write source snapshots and let dependent live queries refresh. |
| Tracking reconciliation | A3 facility pages or verified order-scoped pages | Write changed packages; remove absent packages only within successful scope. Dexie maintains native package indexes and refreshes dependent live queries. No creation-only cursor. |
| History background/explicit refresh | A6 for due order; filtered A7 for missing/stale users referenced by either A5 or A6 | Replace complete grouped history for the order, then update labels. Names never gate core order hydration. A history still downloading is shown as such, not as empty. |
| Receipt success | A2 + A5 + A6; targeted eligibility check/reconciliation through A1; fresh A9 for affected visible inventory | Fence off older reads; replace authoritative source snapshots. Live queries recalculate displayed counts/results. A9 updates transient UI state only. Keep success distinct from a failed readback; no automatic POST retry. |
| Product refresh | A4 due referenced IDs | Write changed products and replace their identification sets atomically; dependent live queries refresh. Retain quantity drafts and unrelated products. |

Networking stays outside Dexie transactions. Batch writes with bulkPut/bulkDelete, let a transaction failure abort the whole affected snapshot, and publish ready/freshness markers only on commit. A package, history, or product failure must not erase a previously complete core order. Cache errors are not valid empty responses.

Use one bounded queue for network work and serialize commits/generations so the timer, manual refresh, and mutation readback cannot interleave stale writes. Proposed initial concurrency is three requests; this is a measured-tuning starting point, not a backend capacity claim. Account/facility changes invalidate queued work before it commits. Multi-tab writer ownership and logout sequencing remain as specified in the main design.

Separate server rows from draft quantities. Read a stable server baseline for the draft, preserve entered amounts across liveQuery updates, and reconcile changed/removed lines before submission. No draft quantities go into transferItems.raw as if they were a server result.

### Request and storage budget

Let L be pending-list pages bounded by A0, N distinct pending orders, M all A5 pages across those orders, P product-document pages across unique-ID batches, K facility package snapshot requests, H history pages, and U receiver batches. Core hydration costs 2 + L + N + M + P reads, including the before/after A0 count checks; K + H + U are supplemental work. A4 uses POST transport but is included as a read. A9 is additional only when QOH is requested. This accounting does not assume that an entire endpoint fits its default page size.

Facility-wide package hydration costs K calls; order-scoped hydration costs the sum of package pages across N pending orders. K includes older transfers that still have shipped shipments, so fewer calls or bytes must be measured rather than assumed. Product hydration scales with unique products, not item count. Server calls during a warm list search/item filter are zero; continuing background calls must be reported separately. First-time order hydration and a manual refresh may still require the worker to fetch data.

Canonical storage is proportional to distinct orders + items + products + identification records + packages + receipt groups + mis-shipped receipts + referenced users. Facility relationships are small indexed arrays on each order; only shared sync metadata is stored separately. Display summaries and the active facility's searchable corpus consume transient memory and are rebuilt from local source records when needed. Do not copy product documents into every item or persist joined list/search DTOs. Do not persist image binaries, unused dynamic Solr price/category fields, or duplicate receiver names on every history row.

The two-minute detail-age target in the main design is conditional on N and measured A2/A5 latency. If the queue cannot meet it, report actual oldest snapshot age and adjust the design; do not overlap sweeps indefinitely or display a misleading fresh marker.

## 5. Validation before implementation acceptance

Specification check completed: installed Dexie successfully parsed the revised eight-table schema and shared syncMeta. Confirmed all three transfer facility arrays have non-unique multi-entry indexes, the facility/tracking index remains, and no membership or persisted view table is declared. No database was opened. This checks schema declarations only; it is not a live IndexedDB transaction, API-contract, or throughput test. Live inventory and derived list/search results have no tables in this schema.

1. Capture redacted successful bodies and pagination metadata from the actual demo instance for A1-A7/A9, including more than one page and tied dates. Record counts/shape only in reports; never store credentials or raw private responses in the spec.
2. Prove A1 completeness against the existing A0 candidate count and compare its bounded paged identity set with a full read. Test empty intermediate eligible pages and concurrent membership changes. All changes remain client-side; do not add API fields or deploy backend patches.
3. Check A2 item identity, per-item destination, null quantity behavior, and absence of orderDate. Confirm A5 receiptId. Verify aggregate A6 groups sharing a timestamp remain distinct. Do not call unit fixtures live API proof.
4. Verify A4 wrapper, escaped ID query, fields selection, stable document paging, standalone products, duplicate documents, configured identifiers, and barcode values with leading zeroes/slashes.
5. Test snapshot replacement, removal after completion, scope changes, post-receipt readback races, malformed/partial responses, products shared by orders, and preservation of dirty drafts.
   Verify A -> B -> A shows retained A rows before refresh, does not refetch fresh shared products/detail, and never prunes A from B's enumeration. Cover an order with multiple destinations, moved items, independent facility freshness, and facility-qualified drafts.
   Verify worker writes to headers/items/products/identifications/packages and pendingReceiptFacilityIds additions/removals refresh subscribed list/detail/search results without membership/view-table writes. Cover multi-facility arrays, adding/removing B without losing A, repeated A1 rows, an A2 refresh preserving pending arrays, and failed enumeration causing no removals. Cover previously missing product insertion, result reordering, filter-before-pagination correctness, scope/subscription disposal, and draft preservation. Confirm a reopened app reconstructs results entirely from normalized local data. Use real IndexedDB for these client checks; fixtures do not establish live API correctness.
   Include two identifiers of the same type, removal of an old identifier, typed barcode collisions, and preservation of product-master display fields. For user enrichment, verify deduplication, zero unfiltered directory calls, ID-filter enforcement, failed/missing-name fallback, and reuse of one cached name across many orders.
   Verify A9 never persists inventory values, refetches when shown again, and rejects pre-receipt responses after a successful receipt. A failed live read must not show zero or stale inventory as current.
6. On the real browser/device, measure bootstrap time and request count; list/detail local join time; search-corpus build/rebuild time, memory and search p50/p95; live-query rerun frequency during background sync; scan-to-quantity-update time; DB bytes/row counts; transaction duration; and worker sync CPU/network load. Compare the same dataset before/after. Set acceptance thresholds after the baseline rather than claiming an unmeasured throughput gain. Require measured evidence before adding a persisted materialized view.

Additional implementation source: [Dexie bulkGet](https://dexie.org/docs/Table/Table.bulkGet%28%29), [bulkPut](https://dexie.org/docs/Table/Table.bulkPut%28%29), and [transaction practices](https://dexie.org/docs/Tutorial/Best-Practices).

## Tracking and box filters implemented October 1, 2026

The v2 Dexie migration adds `transferPackageItems` without deleting the existing scoped database. Version-one package rows came from the shipped-only endpoint and retain that status during migration. New contents participate in the existing worker queue, destination fencing, sync metadata and logout cleanup.

A3b is the existing full shipment response, not a new API. Each package is keyed by `(shipmentId, shipmentPackageSeqId)`. Contents use `(orderId, shipmentId, shipmentPackageSeqId, shipmentItemSeqId, orderItemSeqId)` and store destination, product and numeric quantity. Repeated identical join rows collapse; conflicting duplicates reject the snapshot. Cancelled shipments and other destinations are excluded; only shipped contents become receiving allocations. Full order snapshots replace metadata/contents in one transaction and take precedence over A3 discovery, which cannot erase packed-box tracking. Polls retry with the existing bounded backoff. Failed box enrichment remains visible without blocking core order hydration.

Pending-list badges and text search derive from cached package rows. Enter performs an exact, trimmed, destination-indexed tracking lookup and opens only one distinct pending approved TO; partial text, no match and shared tracking across orders stay on the list. A unique matching shipped box is preselected and the product scanner receives focus. Completed pages hydrate tracking only for the displayed archive orders; known cached exact tracking codes can also search that archive. This does not cache or claim complete search coverage of the entire completed archive.

The detail chips filter pending lines by shipped package contents. Their selection is transient Vue state. Draft quantities remain order-line totals across boxes; changing a chip never reallocates or resets them. Scans are restricted to eligible lines in the selected box. Receive All is available with All shipments selected; completing a TO clears the box filter so every line is visible for review. Receipt API payloads and server-baseline checks remain unchanged.

Ionic Progress Bar does not expose a tick-mark property. The UI retains the Ionic bar and overlays separators at cumulative package quantities divided by the existing ordered/fulfilled denominator, with per-box quantities below it. The API does not attribute historic receipts to particular boxes, so the bar represents total line receipt progress and package allocations, not invented per-box receipt balances. Box joins are computed once per cached snapshot and queried by item identity while rendering.

Demo tracking metadata was added through the existing `PUT /rest/s1/poorti/updateShipmentTracking` endpoint, using `shipmentId`, `shipmentRouteSegmentId`, `shipmentPackageSeqId` and `trackingIdNumber`. No service, API or shipment-status changes were deployed. See the [QA record](../../qa/2026-10-01-local-receiving.md).
