# Receiving performance and regression audit — 2 October 2026

Later follow-up: [first interactive paint measurements](first-interactive-paint-2026-10-02.md) cover the next startup changes, including a 1.877-second warm iframe median and the separate native Shopify host interval. The measurements below describe the preceding bundle/receipt audit.

The performance refactor has a verified 39.8% reduction in the modern entry bundle, with no new failures in the comparable shared test suite. Browser receiving reviews and compiled physical-iPad navigation passed. The subsequent Scan all correction passed browser checks and an actual two-unit receipt from the physical iPad, with OMS inventory readback. CI still has dependency/install gates, and a 1–2 second startup has not been demonstrated.

## Audited scope

- [Receiving #745](https://github.com/hotwax/receiving/pull/745), application source `696d639`, against main `b575ce1`.
- [AccxUI #197](https://github.com/hotwax/accxui/pull/197), shared source `61edf6a`, against main `c91b85d`.
- Main checkouts were used. No new Git worktree, API change, merge or deployment was made. The initial performance audit was read-only; the explicitly authorized follow-up receipt is recorded below.
- Real backend: Demo Maarg. Desktop browser: Brooklyn. Compiled embedded Shopify POS: hotwax-demo, Broadway, physical iPad Pro 11-inch (3rd generation), iPadOS 27.0, Shopify POS 11.15.0.
- Desktop QA used the verified Receiving listener on localhost:8103. Compiled POS QA used the existing authorized local preview; the actual child iframe origin was asserted. The ordinary fresh build used separate output to preserve that running preview.

## Measured bundle savings

Paired ordinary production analyzer reports, with private development login disabled and the same public Demo shop mapping:

| Metric | Before | Candidate | Reduction |
| --- | ---: | ---: | ---: |
| Modern entry JavaScript | 2,823,745 B | 1,699,400 B | 1,124,345 B / **39.8%** |
| Modern entry gzip, default Node zlib compression | 706,388 B | 425,169 B | 281,219 B / **39.8%** |
| All modern browser JavaScript chunks | 3,359,809 B | 2,563,627 B | 796,182 B / **23.7%** |

These are analyzer chunk measurements. They exclude worker, CSS, images and legacy-browser output. Both measured entries have zero static JavaScript imports, so the entry comparison is also their eager JavaScript graph comparison. Deferred route/auth chunks still load when those features are needed.

A fresh production build during this audit passed. Its final emitted entry was **1,701,140 B / 425,895 B gzip**. The small difference from the analyzer comes from build metadata and final legacy-plugin wrapping; generator-phase chunk numbers are not exact final-file sizes. Both are below the current 1.8 MB / 450 KB budget. The guard traverses static imports and rejects CSV/encoding/cron modules; it does not budget dynamic auth/route requests, CSS, worker or HTML inline scripts.

The final analyzer found **zero encoding-japanese, cron-parser, cronstrue, Papa Parse or file-saver modules across all modern browser chunks**. These libraries remain available through focused imports and the legacy shared API. The camera scanner is deferred: 358,531 B decoded / 94,827 B gzip, loaded only when requested.

What produced the savings:

1. Replace broad shared entry/object imports with named core, date and product imports; remove internal shared-barrel imports from Shopify login/install.
2. Lazy-load app/auth routes, the camera scanner and the shared image-preview overlay.
3. Defer cache-adapter, Firebase messaging and federation initialization until the relevant feature uses them.
4. Use runtime-only Vue in production and one Luxon ESM implementation.
5. Parallelize independent account/setup and order-hydration reads, preserving their dependency gates and operation locks; discover due worker work every second while keeping the existing domain refresh intervals.

The experimental rewrite of Ionic generated code is excluded from these PRs and from the reported shipping-candidate savings.

## Startup evidence and remaining latency

| Observed sample | Cache conditions | First transfer row | Tracking badges |
| --- | --- | ---: | ---: |
| Earlier pre-bundle sample | Fresh origin / empty store cache | 5,830 ms | 6,856 ms |
| Compiled shipping candidate, `run-1790974080104-a5005311` | Fresh preview origin | **5,352 ms** | **6,263 ms** |
| Audit run, `run-1790977174956-285e0e93` | Warm assets and IndexedDB | **3,018 ms** | **3,018 ms** |

Times come from in-page DOM milestones relative to iframe navigation, not WDA screenshot timings. The warm run revalidated the entry from cache (300 transferred bytes, zero decoded response body); it is not a cold-start result. The fresh-origin observation is 8.2% lower than the earlier sample, but these are individual observations with varying tunnel/network/backend conditions, not a controlled latency benchmark or a percentile guarantee. Do not present a 39.8% bundle reduction as a 39.8% startup reduction.

The fresh compiled trace spent approximately 1.72 seconds from app-bridge login starting to final store-settings response. The warm trace still spent about 1.33 seconds on that account/facility/store chain. Shared profile and permission reads overlap, but location, facility, stores and their settings retain sequential dependencies. Auth starts after the entry and Shopify bootstrap have loaded. That explains why warm data alone does not yet produce sub-two-second startup.

The saved production traces break the observed startup into these non-overlapping intervals:

| Interval | Fresh origin | Warm |
| --- | ---: | ---: |
| Iframe navigation to first OMS app-bridge login request | 2,908 ms | 1,383 ms |
| Login request start to final store-settings response | 1,724 ms | 1,331 ms |
| Store-settings response to first transfer row | 720 ms | 304 ms |
| Total | **5,352 ms** | **3,018 ms** |

The first interval includes frontend delivery, evaluation and Shopify bootstrap; it is not an isolated JavaScript parse measurement. Native tile-tap time before iframe navigation is excluded. These are existing compiled-build observations, not timings from the development-mode receipt follow-up.

There is no demonstrated three-second minimum. The largest next experiment is to reuse a validated same-user/shop/location context to show scoped cached transfers earlier, refresh noncritical configuration in the background, and retain authentication and receiving-permission gates before mutations. Further supported Ionic import reduction and translation precompilation may shorten the first interval. Measure repeated cold and warm runs on the deployed CDN as well: the local tunnel and backend round trips influence these samples. No additional latency saving or sub-two-second result is claimed before those experiments.

Earlier instrumented worker observations reduced the gap from worker start to hydration start from 5,209 to 1,004 ms, consistent with the 5-second-to-1-second scheduling change. Those are historical diagnostic observations. Full-store readiness and current-worker throughput were not rebenchmarked in the uninstrumented shipping-candidate run. No heap, long-task or native barcode-throughput benchmark was performed.

Largest remaining candidates are Ionic component registration/import overhead, the i18n message compiler, and the startup account/configuration chain. Module `renderedBytes` values are unminified contributions and must not be treated as final transfer-size savings. Investigate each with a measured experiment and compatible runtime validation before changing the shipping PR.

## Automated and source validation

| Check | Audit result | What it establishes |
| --- | --- | --- |
| Receiving suite, including Scan all follow-up | **70/70 passed**, 14 files | Receipt/draft validation, selected-box limits, duplicate-submit locks, shipment parsing, cache/readback fencing, logout/session isolation, completed publication, paging and startup ordering |
| Broad shared suite | **309 passed / 6 failed**, 315 cases | SDK lifecycle fault paths, notifications, utilities, DB/sync and shared component coverage |
| Same shared suite on archived AccxUI main source | **297 passed / same 6 failed**, 303 cases | No added shared-suite failure; all 12 added cases pass |
| Utility extraction AST comparison | **63/63 declarations identical**, all **57 legacy object keys retained** | Moving functions preserved implementations and compatibility names |
| Fresh Receiving production build | Passed | Normal shipping configuration compiles and passes the startup guard |
| AccxUI CI build matrix | **8/10 passed** | Fulfillment, BOPIS, Receiving, Job Manager, Order Routing, Transfers, Company and Products compile against the shared candidate |
| iOS test toolkit unit suite | **282/282 passed** | Harness regression coverage; not app/backend acceptance proof |
| iOS test toolkit typecheck | Existing TS2367 failure in `open-hotwax-reject-preview.spec.ts:228` | Toolkit-wide validation is not fully green; this unrelated file was unchanged |

The shared suite is now reproducible with `pnpm exec vitest run --config vitest.common.config.ts` from AccxUI. Worker and Blob cases use Node; UI/session cases use jsdom and the Vue plugin. An initial all-jsdom attempt produced worker/Blob harness failures and was discarded after fixing the test environments. The candidate and baseline comparisons use the same corrected configuration.

Six existing shared failed expectations reproduced on main: three local OMS URL cases, invalid-version comparison, bare-string product-feature normalization and the default Solr-query assertion. Their presence on main does not make them acceptable or prove each is a production defect; it establishes that these optimizations did not introduce them. They remain separate follow-up work.

There are no runtime `template:`/Vue `compile()` consumers in the inspected Receiving/shared source requiring the removed Vue template compiler. Existing Vue SFCs are compiled during build.

## Real-browser and physical-POS validation

Desktop, real Demo data:

- Login using saved local configuration and a direct detail-page reload succeeded.
- Tracking badge search for M100107 produced one match; Enter opened detail with the matching shipped box selected. Packed tracking remained labeled and excluded from receiving-box chips.
- Shipment chips filtered visible lines. Primary/secondary identifiers, product features, multi-box quantities and progress marks rendered.
- Scanning the product's actual configured UPCA incremented its matching draft to one. The draft was cleared afterward. An unmatched identifier produced scan feedback rather than incrementing a line.
- Over-receipt review showed **Over received: 2**; under-receipt review showed **Under received: -9**. Final completion was disabled until discrepancy acknowledgement. Both reviews were cancelled, the draft cleared, and history still showed the original receipts (2 units and 1 unit). No final receipt was submitted.
- Completed search hint was `Search completed orders`; M100103 rendered both completed product cards with no scanner or receiving footer.
- Empty local search displayed `No results found`.
- History and product-image overlays opened and closed. Create Transfer Order and its Ionic calendar opened; Cancel dismissed the calendar without saving an order.
- Purchase Orders and Returns lists loaded their real empty states for Brooklyn. Their detail/mutation paths were not exercised because no open records were available there.
- Live logout reached Login and cleared the four inspected cache tables: orders **66 → 0**, lines **392 → 0**, products **129 → 0**, packages **55 → 0**. Re-login returned to Transfers without a saved-transfers stall; subsequent read-only counts showed 65 orders, 390 lines, 129 products and 47 packages repopulated. These counts verify clearing and refetch, not an identical backend snapshot across logins.

Desktop console inspection also found three Ionic errors: the detail tab buttons reference absent segment-content IDs `all`, `open` and `received`. Those `content-id` attributes are unchanged from main; the page uses conditional Vue templates instead of Ionic segment-content panels. This is an existing markup issue, so desktop console cleanliness is not claimed. It needs a small separate cleanup even though the audited tab navigation worked.

Compiled physical POS run **`run-1790977174956-285e0e93` passed**: unlocked Home, local iframe origin, tracking search, Enter to selected-box detail, hidden keyboard on automatic focus, manual text entry, Open/Completed tabs, Settings, Purchase Orders, Returns and back to Transfers. Runtime-error telemetry recorded **zero uncaught errors/rejections**.

The iPad retained a compact keyboard state. A strict full-keyboard assertion initially failed. Native inspection showed the `Keyboard → Show Keyboard` menu; selecting it displayed the full keyboard, and `audit-entry` was typed, asserted and cleared. WDA's clear action dismissed the full keyboard, so cleanup now tolerates that observed state. The final run explicitly allowed expanding the compact keyboard: it proves manual input works, not that every tap forces the full keyboard open regardless of iPad state. No system/security setting was changed. Native scanner opening/capture remains outside this audit's live coverage. Actual receipt/readback was subsequently verified below.

## Scan all correction and physical-iPad receipt follow-up

**Corrected:** on M100107, MH01-XS-Black has 12 issued, 2 previously received, and allocations of 10 and 2 units in two boxes. Both Auto scan all and item-level Scan all previously staged **10** with the two-unit box selected. Both now suggest the selected box's quantity, capped by the remaining issued balance. Repeated clicks replace the draft rather than add to it. Unfiltered header behavior still uses the remaining issued balance, and unfiltered item behavior preserves the store's ordered-versus-fulfilled setting.

Real Demo browser checks verified both buttons stage **2**, including repeated clicks and replacing a draft of 10. All shipments fills **[10, 14, 40]**; selecting the small box then fills only its visible line, leaving **[2, 14, 40]** after returning to All shipments. All browser drafts were cleared afterward. Five regression cases cover box limits, the remaining balance, hidden drafts, invalid allocations and ordered-quantity mode. The 70-test suite, a fresh ordinary production build and the Ionic diff checker passed.

Receipt quantities remain order-line totals. Historical receipts are not reliably allocated to specific boxes by the available API, so the app does not pretend it knows which box was previously received. Selecting another box replaces the suggestion for a shared line; it does not accumulate box quantities automatically.

An explicitly authorized real receipt then passed on the physical iPad in Shopify POS, using the same main-checkout source through the existing local preview in **development mode**. This verifies the corrected source in the embedded app; it is separate from the compiled-build performance measurements above.

| Evidence | Before | After |
| --- | --- | --- |
| Demo Maarg / Broadway order M100053 (TRO00000135) | ORDER_APPROVED | ORDER_COMPLETED |
| Item 01 / product 10481, issued 2 | Received 0; ITEM_PENDING_RECEIPT | Received **2**; ITEM_COMPLETED |
| Broadway quantity on hand | **109** | **111** |
| Receipt history | Empty | One receipt for **2** accepted units |

Native run `receipt-M100053-1790980627941` passed in 39.9 seconds. It searched tracking code `78552488`, pressed Enter, used Auto scan all twice and item Scan all, asserted a draft of two, opened the receipt confirmation and pressed Proceed once. A fresh API check immediately before submission verified the original receipt/inventory baseline. Post-submit readback verified the order, item, history and inventory changes. The test then opened Completed and reopened the detail page: it displayed **2 Received | 2 Fulfilled | 2 Ordered**, **111 on hand**, and no receiving footer. Screenshots and video were retained locally.

This proves real native submission and the updated list/detail after readback. Direct inspection of the iPad's IndexedDB stores was not available through the cross-origin native web context; reopened UI evidence and the existing automated cache-write tests are separate evidence, not a claimed direct database dump. An initial attempt stopped at the POS PIN overlay before submission; the successful run used the toolkit's saved-PIN mapping, with no security-setting changes or duplicate receipt attempt.

## Release gates

1. Merge AccxUI #197 before Receiving #745 can build against the focused modules. Receiving's current CI loads AccxUI main and fails with missing `common/utils/core`.
2. Resolve or explicitly disposition AccxUI's frozen-lockfile failures for Order Manager and Inventory Count. Both stop before compiling the changed source. Other eight app builds passed. [AccxUI run](https://github.com/hotwax/accxui/actions/runs/37062641908), [Receiving run](https://github.com/hotwax/receiving/actions/runs/37063180261).
3. Obtain the required Receiving review and green CI after its prerequisite is available. No merge/deployment has been performed.
4. Treat native scanner operation, populated PO/Return details, broad facility switching, direct native IndexedDB inspection and controlled repeated cold starts as remaining acceptance checks. Actual native receipt, inventory readback and reopened order UI are now verified above.

The import/lazy-loading refactor materially reduces shipped JavaScript, preserves utility contracts, adds no shared-suite failures, and survives the audited browser and compiled iPad paths. The subsequent Scan all correction also passed an actual native receipt with inventory readback. The requested 1–2 second cold-start target remains unproven.
