# Transfer loading layout QA

Tested on 2026-10-02 against Demo Maarg, Queens, using the primary AccxUI
Receiving checkout served on localhost:8100. Browser measurements used real
OMS responses; the unit tests exercise publication and request ordering only.

## Reproduced causes

- Completed published headers before asynchronously attaching tracking badges.
  Each of four visible rows grew by 26 px; the fourth row moved from 342 to
  420 px. Refresh also removed and re-added existing badges.
- Cold detail rendered an empty order's controls before the real status,
  products and packages were available.
- Cold completed detail also raced membership reconciliation against its first
  header write. The failing reconciliation briefly displayed a load-error row
  above successfully loaded detail, then removed it, moving the content 48 px.
- History used an in-content loading row that disappeared when receipts loaded.

## Changes

- Publish each completed page with its badges attached. Retain visible rows
  during refresh, enrich only the incoming page, ignore superseded responses,
  and retain existing rows/badges on failed refresh/enrichment.
- Keep the toolbar progress indicator active through enrichment and advance it
  as the page and its shipment reads finish. Disable repeated Load More taps.
- Show initial detail content after its order, product and shipment load has
  settled. Cached hydrated detail still opens without waiting for its network
  refresh. Loading controls live in the toolbar; failed loads retain a retry.
- Reconcile membership after the detail write; history still runs concurrently.
- Move history loading into its toolbar. Require an actual tracking query
  before showing the unshipped-tracking notice.

## Results

- Completed first paint: all four rows already had badges; final heights were
  110, 90, 90, 110 px. No later expansion or layout-shift events in that capture.
- Repeated Completed visits and return from detail retained those row positions
  while the progress bar advanced. Mobile (390 x 844) also recorded one stable
  completed-row geometry and zero layout-shift events.
- Cold detail M103472: first confirmed absent from the cache. After finding and
  fixing the reconciliation race, retested by evicting only its recoverable
  completed header and detail/hydration metadata (no pending receipt operation).
  The real OMS restored the cache. No false error row or receiving footer;
  heading offset stayed 16 px, scanner offset 151 px, and card height 135 px.
- That completed-detail capture retained a small 0.000609 layout-shift entry
  during stock-chip content replacement; the heading and card did not move.
- Mobile open detail M100428: heading height stayed 401 px; six card heights
  stayed 287, 287, 287, 267, 287, 287 px; zero layout-shift entries. No empty-state
  flash. Product identifiers and shipment chip were present on first paint.
- Visually checked mobile detail top and final card/footer boundary, plus the
  history modal's first/last receipt. No inventory receipt was submitted.
- All 54 unit tests passed (11 files), including nine loading-order regressions.
  Production build, whitespace checks and AccxUI UI diff checks passed.

This is focused loading/layout validation, not acceptance of the other open
Receiving audit findings. Existing bundle-size warnings remain.
