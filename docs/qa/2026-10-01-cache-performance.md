# Receiving cache performance — first pass

Base: merged PR #739, commit `6f188a1`. Validated with AccxUI `c91b85d`.

## Changes

1. Removed the recurring facility-wide shipped-package request. Existing per-order shipment hydration supplies tracking codes and box contents; download completeness now uses that coverage.
2. Split search data and sync-status subscriptions. Status updates reuse the filtered list. Unchanged membership, detail, shipment and receipt snapshots skip source writes; changed rows and deletions still commit atomically using the shared stale-key helper.
3. Barcode lookup returns matching product IDs and checks the current transfer's loaded lines, including the selected-box and duplicate-line rules. It no longer reads historical transfer lines for the same product.

Changes are Receiving-only. No API, shared AccxUI, database schema, receipt-submission contract, or UI layout changes.

## Validation

- 42 unit tests passed across 11 files, including new scanner scope/ambiguity tests and independent data/status publication tests.
- Production build passed. Existing dependency `eval` and large-chunk warnings remain.
- Real Chromium IndexedDB checks passed for database joins and cross-worker invalidation, shipment tracking/filtering, and migrations preserving uncertain receipt state.
- Nine additional real IndexedDB performance/regression checks passed using a disposable fixture containing 20 pending lines, 2,000 archived lines and 500 archived boxes. These measurements concern local database work, not live OMS response times.

| Operation | Measured result |
| --- | --- |
| Pending-list data read | 20 pending lines and one active box; archived lines/boxes excluded |
| Sync metadata update | Zero search-corpus evaluations; zero item/package reads |
| Unchanged membership/detail/shipment/receipt refresh | Zero source-table writes; zero additional corpus evaluations |
| Barcode lookup with 2,001 cached lines for the matched product | Zero transfer-line reads |
| Changed quantities, renamed tracking and deleted lines/contents | Persisted correctly and refreshed the live query |

The browser tests exercised bundled modules from the feature checkout through the existing local browser, using disposable databases that were deleted afterward. The user's running app checkout and signed-in cache were preserved. The complete modified app was not launched or deployed, and no inventory receipt was submitted in this pass.

## Repeatable checks

From a wrapper whose active Receiving entry is this branch:

```sh
VITE_APP_VERSION_CONFIG='{}' pnpm --filter receiving test:unit --run
VITE_APP_VERSION_CONFIG='{}' pnpm --filter receiving build
```

With that checkout served by its local Vite app, invoke the exported checks in the browser's development console:

```js
await (await import('/tests/receivingPerformance.browser.ts')).checkReceivingPerformance();
await (await import('/tests/receivingDatabase.browser.ts')).checkReceivingDatabase();
await (await import('/tests/receivingShipments.browser.ts')).checkReceivingShipments();
await (await import('/tests/receivingMigration.browser.ts')).checkReceivingMigration();
```

The four recovery findings from the post-merge review remain separate follow-up work. This pass does not claim to resolve them or establish tagged-release compatibility.
