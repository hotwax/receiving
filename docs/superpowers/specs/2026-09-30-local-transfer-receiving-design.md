# Local transfer receiving data

Status: implemented and tested against the original AccxUI baseline; draft integration with current AccxUI main is blocked by shared database interface changes. See the [2026-10-01 validation notes](../../qa/2026-10-01-local-receiving.md) for observed results and remaining acceptance gaps.

The [API contracts and entity map](2026-09-30-receiving-api-entity-map.md) specifies the exact calls, envelopes, field mappings, keys, Dexie indexes, query paths, and write boundaries. Its revised entity model is authoritative for implementation.

## Outcome

Download all transfers awaiting receipt at the selected receiving facility, including their items and product identification data. After that initial download, the transfer list, order detail, barcode lookup, and item filters read from IndexedDB without initiating network requests. Background synchronization keeps these reads current. A receipt submission remains an online backend operation.

Use AccxUI's existing Dexie database and worker architecture. Reuse shared entities and primitives where their contracts fit; define missing transfer entities and synchronization behavior inside Receiving. Dexie is the library over IndexedDB, so this is one persistence layer.

“Store” means the destination facility selected in Receiving. Preserve the existing product-store settings and access checks. The pending set initially follows Receiving's current filters: ORDER_APPROVED, destinationFacilityId, TO_Fulfill_And_Receive / TO_Receive_Only, excluding REJECTED_ITM_PARKING as an origin. Do not silently substitute a quantity-derived definition of eligibility.

The completed-order archive, purchase orders, returns, new filter controls, and offline receipt submission are outside this migration. Existing completed-order access must continue working. Existing detail filters become local; the list search can match order identifiers and the locally hydrated products within those orders.

## Verified starting point

- Original tested baseline: Receiving 7fd8a25 with AccxUI 2e4a524, plus the implementation described here. Shared database interfaces below refer to that baseline; current AccxUI main requires the migration documented in the validation notes.
- Receiving currently stores transfers/products in persisted Pinia state. TransferOrders.vue fetches on entry, search, segment change, and load-more. TransferOrderDetail.vue clears its detail and sequentially loads mis-shipped items, detail/packages, and all receipt history.
- The wrapper's common/db provides BaseDB, defineDbEntity, projections, liveQuery-based readers, a domain registry, polling harness, worker transport, and mutation-refresh dispatch.
- COMMON_DB_SCHEMA has reusable facilities, product stores, statuses, and other reference data. Reuse Cycle Count's products and productIdentification model. Its separate productInventory table is excluded: Receiving inventory stays live. These durable product entities are currently app-owned, while common/useProducts is an in-memory resolver.
- registerSnapshotDomain is a once-per-login reference-data helper. It is not sufficient by itself for pending transfers that change throughout a receiving session.
- The shared polling harness starts recurring ticks only with baseTickMs. It does not currently consult the registry's cadenceMs scheduling helper. Manual and by-key refreshes also need serialization with recurring work.
- Source contracts were initially inspected locally. Subsequent Demo API and UI observations, including the revised client-only enumeration comparison, are recorded in the linked validation notes. Local source alone does not establish deployment parity.

## Approach

Use app-owned transfer tables with the shared DB, projection, worker, and reactive-read primitives. Keep the synchronization rules for these mutable aggregates in one Receiving domain. A small app-owned worker/service adapter supplies facility scope, lifecycle cancellation, serialized refreshes, and explicit sync status that the shared bootstrap interface does not currently expose.

Persist normalized source records, with indexed facility-ID arrays directly on each transfer. Derive list summaries and search results through read-only Dexie liveQuery functions and in-memory computation. Dexie tracks dependency reads and reruns those functions after relevant writes; application code supplies the joins and calculations. Do not create a facility-membership table, persisted transferListRows/transferSearchRows tables, or manual view-maintenance loops. Consider materialization later only for a measured bottleneck.

Two alternatives were considered: retaining Pinia as the main cache would leave two competing read/write paths; building a new shared transfer subsystem would expand this change across apps before its contract is proven. The app-owned extension meets the requested ownership boundary and can be promoted later.

```text
Backend reads -> Receiving worker -> Dexie transactions -> reactive queries -> screens
Receipt POST  -> server success -> worker refresh by order ID -> same Dexie/read path
```

All durable server-data writes go through the Receiving worker and Dexie. Views consume data and own temporary input state. Fetches and normalization occur before a short database transaction; no network requests run inside a transaction. Dexie documents this transaction constraint and propagates committed Dexie writes to live queries across worker contexts.

## Data ownership

Use an app DB scoped to the canonical OMS connection and authenticated user. Also include the selected Maarg connection in the scope identity when it can vary independently. Require an explicit identity; do not fall back to a global database. The selected facility is not part of the DB name. Store canonical orders/items/products once per connection/user DB, retaining data for previously visited facilities. Store originFacilityIds, destinationFacilityIds, and pendingReceiptFacilityIds as multi-entry indexed arrays on each transferOrders row, and retain original origin/destination fields on items. Keep sync coverage per destination facility in syncMeta; recreate local read subscriptions and transient view results when that scope changes. Detail reads also enforce the destination on each item.

| Data | Ownership and identity |
| --- | --- |
| Facilities, statuses, product stores | Reuse applicable COMMON_DB_SCHEMA entries and projections. Activate only reference domains Receiving needs and can read. |
| Transfer headers and facility associations | transferOrders keyed by orderId, with indexed originFacilityIds/destinationFacilityIds derived from all items/ship groups, and indexed pendingReceiptFacilityIds maintained from A1's pending results. A2 preserves that pending array. Normalize list/detail aliases and preserve list-only orderDate. Store header raw without duplicating its items array. No facility/order relationship table. |
| Transfer items | transferItems keyed by orderId + orderItemSeqId. shipGroupSeqId remains a mutable attribute. Index order/destination/status and product for local reads and reverse lookup. Keep server quantities/status separate from input quantities. |
| Product master | Reuse products keyed by productId and productIdentification from Cycle Count's model. Adapt identifier keys to retain multiple values per type and replace obsolete identifiers atomically. Preserve display fields and add features. Batch hydration by unique product IDs; use explicit current/legacy Solr adapters. Inventory quantities are excluded. |
| Packages | transferPackages keyed by shipmentId + shipmentPackageSeqId, indexed by facility/order and facility/trackingCode. Choose facility-wide versus order-scoped paging based on actual package volume; facility results can include older transfers. |
| Receipt data | transferMisShippedReceipts uses receiptId; transferReceiptGroups uses the exact non-aggregate grouping tuple returned by the history view. Index by order/item/time for narrow history reads. receivingUsers caches only names referenced by loaded receipts/orders, fetched in filtered batches when missing or stale; never sync the full OMS user directory. |
| Derived screen results | Read-only liveQuery functions calculate list counts and join source data for detail/search. Keep emitted results and the active search corpus in memory; no persisted view tables. Pinia owns controls, selection, preferences, and drafts. |
| Synchronization state | Use the shared syncMeta table with facility/order-qualified keys: membership completeness, hydrated orders, product coverage, last successful sync, retry state, and generation. |

A header-only response must never replace a hydrated order aggregate or erase its items. A missing product record is a hydration failure or explicit missing-record state, not a silently successful complete download. Resolve all item identifiers, including standalone products; the current shared Solr helper's default isVariant:true is not sufficient for an unrestricted ID lookup. Duplicate Solr documents must not cause early termination before all requested IDs have been resolved or exhausted.

Do not start by bulk-copying all reference domains or the entire product catalog. Hydrate products referenced by this facility's pending transfers. Product images remain browser/CDN resources; caching their metadata does not make image bytes available offline.

## Synchronization and writes

### 1. Initial download

After login/session restoration and facility selection, display existing local rows immediately and schedule a facility sync. Walk the entire pending-order collection with an endpoint-specific pager. Fetch detail for each order with bounded concurrency, initially three requests at a time, prioritizing an order the user opens. Batch product resolution and fetch supplemental collections separately.

Commit each validated order header/items batch and corresponding readiness metadata atomically. Merge A1 header fields and the selected facility's pendingReceiptFacilityIds entry together on transferOrders; A2 preserves that array. Write A3/A5/A6 in their validated scopes; subscribed live queries recompute screen results after commits. The list may appear before every detail is hydrated; show a simple downloading state until the selected facility's coverage is complete. Keep history/names lower priority than usable detail. A first-time order that is still downloading may wait for the worker. Warm order navigation and filtering must not issue page-triggered requests.

Mark a facility's pending snapshot complete only after proven exhaustion of every page. Validate the expected envelope and every record key. Reject malformed/partial pages, repeated-page loops, and safety-cap exits as incomplete. Collect seen orderIds during enumeration; add the selected facility to returned orders' pendingReceiptFacilityIds. Only after a successful complete pass remove that facility from pending arrays on absent orders. A valid, proven empty set may remove that facility from all pending arrays. Preserve every other facility ID and the order itself. Re-read/merge arrays inside fenced write transactions; commit completion metadata with final removals. Failed or interrupted enumeration never removes pending facility IDs.

### 2. Ongoing reconciliation

Run one serialized domain loop with an explicit interval and backoff. Proposed starting values are a 30-second membership check and a bounded round-robin detail refresh targeting a two-minute maximum age for the pending set; actual volume and endpoint timings must determine the final settings. The active order and mutation-triggered refreshes have priority. Do not claim that an order-header timestamp detects changes to child shipments or receipts.

Prefer existing server-supported incremental filters only after proving stable ordering and child-change coverage. The inspected transfer-list service does not expose a reliable aggregate change cursor, so use complete membership reconciliation plus bounded detail refreshes. No client clock masquerades as a server cursor. If measured volume makes the initial cadence excessive, tune the client cadence and active-order priority using the existing APIs; server-side changes are outside the authorized scope.

Skip unchanged writes where practical so each polling pass does not unnecessarily rerender the list. Keep user-facing local queries responsive while work runs. On reconnect or app resume, schedule reconciliation. Network failures retain the last good data, record staleness, and retry with capped backoff; they never turn the local set into an authoritative empty result.

### 3. After receipt submission

Keep the existing server POST and duplicate-submit guard. On confirmed success, refresh the affected order through the same worker write path, including received quantities, status, mis-shipped receipts, and relevant history. Reconcile its pending membership. If affected ATP/QOH values are currently displayed, clear them and fetch fresh values through the live inventory endpoint, rejecting any older in-flight response. The current receipt response contains identifiers/status information, not a complete updated aggregate, so an authoritative readback is required.

Prevent a poll started before the receipt from overwriting the newer readback: serialize per-order work and reject obsolete generations. Until readback finishes, mark the affected order as updating and prevent another submission against the stale baseline. If readback fails after the POST succeeded, show that the receipt succeeded but data refresh is pending; retry the GET, never automatically resend the receipt POST. An ambiguous POST outcome requires reconciliation before another submission.

### 4. Facility, account, and session changes

On a facility switch, keep the same DB and all previously loaded facility snapshots. Query transferOrders through pendingReceiptFacilityIds for the selected facility, derive its view from local headers/items/products, and reconcile missing/stale data in the background. Retain separate facility coverage and last-success times; pause periodic work for inactive facilities until revisited. Switching A -> B -> A must not clear A's data or trigger a full product/detail download for fresh records, though local joins/search-corpus construction may run again. Keep drafts keyed by facilityId + orderId. A complete sync may remove only its own facility from absent orders' pending arrays. It does not delete an order or erase origin/destination relationships; any later retention cleanup must respect other facilities, active queries, and drafts.

Capture scope and generation at the start of each operation; validate them again before commit. Stop/terminate the previous worker on an account or connection change, unsubscribe old queries, and initialize the new scope. On logout, stop the writer before clearing the session's data. Token refresh updates the existing worker's credentials in memory; never store tokens in IndexedDB or broadcast messages.

Coalesce timer/manual/resume/mutation work so it cannot overlap inconsistently. For multiple tabs in the same scope, use a writer lease with a fencing generation checked in the write transaction, or an equivalent supported shared ownership primitive. Local readers remain available in every tab. Worker lifetime is tied to the app session; synchronization is not promised while the browser is closed.

## Reads, search, and draft receiving quantities

Read transferOrders.where("pendingReceiptFacilityIds").equals(facilityId) inside liveQuery. The native multi-entry index selects matching orders directly; no membership/header join is needed. Use originFacilityIds/destinationFacilityIds for relationship filters, while pendingReceiptFacilityIds represents receiving eligibility. Filter and sort headers in memory before paging; calculate item counts for the displayed orders through scoped indexed item reads. Filters/sorts based on counts must calculate across the candidate set before paging. No facility/date view index is assumed. Fetch only the selected order's destination-scoped items and bulkGet their distinct products on the detail page.

Use [facilityId+trackingCode] for exact tracking lookup, [identKey+value] for typed identifiers, and productId reverse indexes on items/mis-shipped receipts to find matching orders. Read matching headers and retain those whose pendingReceiptFacilityIds includes the selected facility. For general text across order identifiers, products/features, and tracking, a facility-scoped liveQuery builds a compact transient corpus in worker memory. Typing filters that corpus; relevant DB changes rebuild it. This text scan is not an indexed full-text query. Do not repeat the joins on every keystroke, load unrelated facilities/history, or render the entire dataset at once.

All dependency reads must occur inside the liveQuery callback. Keep network requests and writes outside it. Recompute or resubscribe when UI controls change, dispose obsolete subscriptions, and reject old-generation results. Use the existing AccxUI reactive-reader conventions; Pinia does not maintain another complete source or derived dataset. Measure join time, rerun frequency, corpus memory, and search latency before introducing any persisted materialized view.

Use shared entity/read helpers where they implement the required query. The current shared buildQuery handles only the first equals key and does not provide arbitrary sorting; compound scope and ordering must be explicit in app queries. A generic hydrated flag is not proof that every pending order and product has synced; use the facility coverage metadata.

Receiving input quantities are an editable draft over the server baseline. A background update must not overwrite scanned/entered quantities or publish them as server facts. Reconcile by stable item identity, retain the draft, and flag removed/closed/changed lines for review before submission. Readiness for scanning requires resolved identifiers for the relevant items.

Preserve current receipt arithmetic, receive-by-fulfillment settings, over/under-receipt confirmation, and add-product behavior. Keep Pinia for preferences and draft/UI state; remove competing persisted transfer/product copies only for the migrated path and retain compatibility for purchase orders/returns. ATP/QOH remains live: fetch when shown/requested, keep only transient UI state, and never persist it in IndexedDB or Pinia. Item filtering stays local; explicitly viewing inventory requires its live request.

## Contract checks before implementation is accepted

The local OMS TransferOrderServices.get#TransferOrders accepts limit and pageIndex, while shared pageAll supplies pageSize/viewSize. Framework tracing confirms that search-form-inputs converts the page number to pageIndex * pageSize despite the earlier XML offset assignment. Its ordersCount is computed after eligibility filtering, so neither that count nor a short/empty eligible page proves exhaustion. Include statusFlowId/productStoreId in fieldsToSelect because the eligibility branch reads them. The revised client uses the existing grouped-transfer endpoint's distinct candidate count to bound every underlying page, then verifies that count again before pruning. The grouped scope is a superset of eligible receiving rows. Demo validation compared ten pages with a full read and found the same 96 Brooklyn rows within 98 candidates. See A0/A1 in the entity map for the exact projection, filters, concurrency limits, and request cost. Backend changes are explicitly excluded by the user's instruction.

Other checks: detail returns the full items collection with stable item identity and per-item destinations; mis-shipped receipt pagination and receipt IDs are complete; aggregate receipt groups sharing timestamps remain distinct; package paging handles tied creation dates; product queries include standalone items and exhaust duplicate documents; worker transport uses the same backend, REST prefix, product-search mode, and authentication behavior as the existing app. Exact mappings and query plans are in the companion API/entity map.

## Proposed Receiving files

- src/db/receivingDb.ts and entity definitions: normalized source schema, source-field projections, transfer facility-array indexes, DB identity.
- src/workers/appSync.worker.ts and a receiving transfer domain: shared harness composition, endpoint adapters, serialized writes, membership and detail reconciliation.
- src/services/appDbSync.ts: WorkerFactory lifecycle, scope/token changes, refresh-by-order dispatch.
- src/composables/useReceivingTransfers.ts and useReceivingTransfer.ts, with read-only query functions: live-query joins, list counts, detail/search results, subscription lifecycle, and coverage state.
- App.vue, store/user.ts, and the facility selection lifecycle: start/stop/scope wiring.
- TransferOrders.vue, TransferOrderDetail.vue, ReceivingHistoryModal.vue, and transfer/product stores: migrate reads, preserve drafts, refresh after success.

Reuse Cycle Count's product model and pure mapping/transaction pattern, with the explicit adaptations in the companion spec. Keep definitions missing from common app-owned initially; do not couple Receiving to Cycle Count's DB initializer or count/variance workflows. Any later extraction into common should preserve existing consumers and be a separately scoped change.

## Acceptance evidence

Focused tests must cover multi-page completeness, partial/error snapshots, legitimate empty scope, key collisions, facility/account isolation, interrupted hydration, disappearing/completed transfers, background updates with dirty drafts, and a poll racing a successful receipt. Verify pendingReceiptFacilityIds additions/removals refresh live queries, a B sync preserves A's entries, A2 preserves pending arrays, failed enumeration removes nothing, and duplicate source rows do not duplicate orders. Verify filters run before pagination, reopening rebuilds results from local source rows, and obsolete subscriptions cannot update the current facility. Use an actual IndexedDB implementation for transaction/live-query behavior. Test fixtures verify client rules; they do not prove the deployed API contract.

Run the declared Receiving build and relevant tests. Then validate on the real demo instance and device: compare pending IDs/items with the backend, verify local search and order opening after warm-up, show zero page-triggered data requests while filtering, confirm worker-driven updates from another session, perform an explicitly authorized test receipt, and verify its local readback. Measure cold bootstrap separately from warm search/navigation, including dataset size, request count, search latency, and time to usable order detail. Do not promise a speed multiplier before these measurements.

## References

- AccxUI: common/db/baseDb.ts, types.ts, projection.ts, useDbList.ts, domains/commonSeedEntities.ts, sync/snapshotDomain.ts, sync/pollingWorkerHarness.ts, sync/appDbBootstrap.ts, sync/workerFetch.ts.
- Receiving: src/views/TransferOrders.vue, src/views/TransferOrderDetail.vue, src/store/transferorder.ts, src/store/product.ts.
- Local backend source: OMS TransferOrderServices.xml; Poorti poorti.rest.xml and FulfillmentViewEntities.xml. Deployment parity is unverified.
- [Dexie liveQuery](https://dexie.org/docs/liveQuery%28%29), [bulkPut](https://dexie.org/docs/Table/Table.bulkPut%28%29), [transaction best practices](https://dexie.org/docs/Tutorial/Best-Practices).
