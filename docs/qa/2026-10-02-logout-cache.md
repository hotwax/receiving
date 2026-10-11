# Logout cache verification — 2026-10-02

Tested the PR #740 checkout at localhost:8104 against Demo Maarg, Brooklyn.
No inventory was changed.

## Failure reproduced before the fix

Settings → Logout reached `/login`, but all ten Receiving cache tables kept
their rows. `clearReceivingSession()` called `configureReceiving()`, which
explicitly closed its Dexie handle, before invoking AccxUI's
`clearDatabaseTables()`. The shared function catches the resulting closed-database
error, so logout appeared successful without clearing the cache.

AccxUI also skips `preLogout` on unauthorized/invalid sessions. Receiving only
cleared its cache from that hook.

## Fix

- Stop sync, detach the session, and capture the existing database as before.
- Reopen that captured handle under the receiving lock before calling the
  existing AccxUI transactional clear; close it afterward.
- Also run cleanup in `postLogout`, before resetting stores, to cover expired
  sessions. Repeated cleanup after a manual logout is harmless. Store resets
  still run if storage cleanup fails.
- Keep unresolved receipt operations in their separate durable journal.
  They cannot be treated as disposable cached OMS records.

No shared AccxUI or server changes.

## Browser results

| Table | Before manual logout | After corrected manual logout |
| --- | ---: | ---: |
| transferOrders | 66 | 0 |
| transferItems | 393 | 0 |
| transferMisShippedReceipts | 1 | 0 |
| transferPackages | 56 | 0 |
| transferPackageItems | 375 | 0 |
| transferReceiptGroups | 24 | 0 |
| products | 129 | 0 |
| productIdentification | 1416 | 0 |
| receivingUsers | 3 | 0 |
| syncMeta | 340 | 0 |

Counts were read directly through native IndexedDB after logout, without opening
Receiving's session/cache bootstrap. A later check still found every table empty.

After re-login, explicitly invoking AccxUI's existing
`useAuth().logout({ isUserUnauthorised: true })` cleared all ten tables again and
detached the client. This exercises the expiry handler; it does not simulate an
OMS HTTP 401 response.

Final re-login restored 66/66 ready transfers, 393 items, and 129 products.
The actual session's unresolved-receipt journal contained zero entries throughout.
The existing disposable IndexedDB migration/recovery suite passed 28 assertions,
including preservation of unknown/confirmed receipt operations during cache clearing.

## Automated validation

- 45 unit tests pass, including a regression for clearing an explicitly closed
  handle and repeated logout cleanup.
- Receiving production build passes.

These results cover logout/cache cleanup, not overall PR acceptance or the
outstanding package-quantity and unexpected-item findings.
