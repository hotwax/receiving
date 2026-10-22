# Receiving first interactive paint — 2 October 2026

The physical-iPad experiment reached a median **1.877 seconds** from Receiving iframe navigation to an unblocked transfer list, versus **2.149 seconds** before this change. The complete native POS opening experience is longer; the iframe number must not be presented as tile-to-ready time.

## Changes

- Preload the Shopify login and transfer-list JavaScript/CSS together with the main entry when opening the embedded login. This removes the request waterfalls that previously started those downloads after main evaluation and account setup. Normal browser visits and unrelated embedded routes do not issue these hints. Browsers without native module-preload support retain the normal loading path.
- Count the complete embedded preload graph against a separate **2 MB decoded / 500 KB gzip** budget. The final ordinary build contains **1,870,410 bytes / 463,091 bytes gzip** in this graph, including the main entry. The original standalone eager-entry guard remains **1.8 MB / 450 KB**. These changes alter download timing, not the amount of feature code ultimately required by POS.
- Stop permission paging when the authoritative response count has been collected. Demo Maarg returned 263 documents for a requested size of 200, with `count: 263`; the old loop made an unnecessary second request. APIs without a total retain empty-page termination.
- Load store names and receiving settings concurrently after obtaining the store IDs. Login and facility switching still wait for both to settle, including the receiving settings.
- Start the shared Shopify login at Ionic's view-will-enter hook. Request the Shopify token and current POS context concurrently. Keep the login page's visible status, but remove its redundant blocking loading overlay and dismissal delay.

Fresh user authorization, current POS location mapping, facility access and receiving settings remain prerequisites. No cached-auth shortcut, new entity, receipt protocol, backend API, security setting or inventory write was introduced.

## Measurement

Main Receiving checkout, starting at `05e95fe`; shared checkout starting at `1c3d99e`. Physical iPad Pro 11-inch (3rd generation), iPadOS 27.0, Shopify POS 11.15.0, hotwax-demo / Broadway, real Demo Maarg backend. Compiled production builds used the existing authorized local Shopify preview. Each candidate had its own fresh tunnel origin, followed by three warm reopens after hydration. Previous cache data was preserved.

The local instrumentation recorded a visible transfer row, a hydrated/enabled search control and absence of the blocking loading overlay. Native automation separately typed a no-match search, verified the empty result and cleared it to restore real rows. This is an operational readiness milestone, **not** a Lighthouse Time to Interactive score. It does not wait for every transfer detail to hydrate.

| Observation | Before | Candidate |
| --- | ---: | ---: |
| Fresh origin, first visible/unblocked list | 4,616 ms | 3,569 ms |
| Warm reopen 1 | 2,378 ms | 2,046 ms |
| Warm reopen 2 | 2,149 ms | 1,710 ms |
| Warm reopen 3 | 2,066 ms | 1,877 ms |
| **Warm median** | **2,149 ms** | **1,877 ms** |

Observed improvement: **22.7%** for the single fresh-origin pair; **12.7%** for the three-run warm median. These small samples include variable tunnel/backend latency and are not a percentile guarantee or proof that every millisecond of the difference was caused by code. Main-body-to-interactive median fell from **1,446 to 898 ms (37.9%)**, while pre-main delivery time was higher in the candidate warm samples.

The explicit bridge-creation-to-OMS-login-request interval was **22–47 ms** across these samples. The much larger previously labelled “Shopify initialization” interval also included app assets, route loading and main-thread initialization. Preloading reduced main-body-to-bridge-start from **223–340 ms to 30–37 ms**. The trace confirms one permissions request instead of two, and overlapping store-name/settings requests.

## Native host time is separate

The 10-fps recording of candidate warm run 2 shows the native Receiving window replacing Home at approximately **7.6 seconds** into the recording and transfer rows visible at **10.8 seconds**: approximately **3.2 seconds** from visible native opening to rows. In-page first-row timing for that run was **1.609 seconds**. Approximately **1.6 seconds** therefore occurred outside the iframe interval. These video boundaries are approximate; they do not establish an exact touch-event timestamp or isolate Shopify's individual host operations.

The recording contains WDA/recording setup time before the actual opening. Raw automation elapsed times include substantial idle waits and screenshot overhead and must not be substituted for user-visible loading latency. A trimmed native opening clip was retained locally. The full POS opening has **not** been demonstrated below two seconds.

## Validation and evidence

- **74/74 Receiving unit tests** passed, including authoritative permission totals, multi-page/missing-total fallback and overlapping store-name/settings reads with completion gating.
- **2/2 new shared Shopify startup tests** passed: independent bridge reads overlap; authentication waits for both; failed POS context does not update the session.
- Broad shared suite: **311 passed / the same six previously documented failures**, compared with 309 passes / six failures before these two new tests. No new shared failure.
- Fresh ordinary production build and Ionic diff checks passed. The final emitted main entry is approximately **1.701 MB / 426 KB gzip**.
- Executing the generated preload script against six controlled document contexts verified embedded login/root hints, no hints for standalone or unrelated routes, legacy fallback and existence of all referenced build files. This is generated-script validation, not a substitute for native UI testing.
- All three candidate warm native runs verified the actual preview iframe origin and working search/clear interactions. All eight measured page traces recorded **zero uncaught runtime errors/rejections**.
- Additional native navigation runs, `paint-startup-1790985663682` and final-source `paint-startup-1790986047393`, passed search/clear, opening M100057 detail and its scan control, Completed/Open navigation, Settings and returning to Transfers. They did not enter quantities or submit another receipt.
- The first candidate fresh run loaded the correct new origin but failed a stale expected-origin assertion after collecting startup evidence. Its captured iframe URL matches the CLI development manifest. The harness was corrected before the three successful warm runs; that initial run is not counted as an end-to-end pass.
- Browser automation could not bind the old localhost error tab because of its URL policy. No alternate browser-control mechanism was used to bypass that rejection. This follow-up's live interaction proof is from the physical iPad.

Native run IDs:

| Build | Fresh | Warm 1 | Warm 2 | Warm 3 |
| --- | --- | --- | --- | --- |
| Before | `paint-startup-1790984367742` | `paint-startup-1790984499898` | `paint-startup-1790984680212` | `paint-startup-1790984785924` |
| Candidate | `paint-startup-1790985022690` | `paint-startup-1790985109594` | `paint-startup-1790985253262` | `paint-startup-1790985388645` |

Remaining performance work: isolate the native Shopify host interval, measure repeatedly on the deployed CDN rather than the local tunnel, and reduce the remaining authenticated account/location/store request chain. The earlier [performance and receipt audit](performance-audit-2026-10-02.md) records the broader regression coverage and release dependencies.
