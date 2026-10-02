# Focused AccxUI imports in Receiving

Receiving consumes named helpers from the shared modules in [AccxUI #197](https://github.com/hotwax/accxui/pull/197). That prerequisite must merge before Receiving can build against AccxUI main.

```ts
import { translate } from '@common/core/i18n';
import api from '@common/core/remoteApi';
import { hasError } from '@common/utils/core';
import { formatUtcDate } from '@common/utils/date';
import { getProductIdentificationValue } from '@common/utils/product';
```

App and login/install routes use dynamic imports. The camera scanner loads on demand. Vue templates are compiled at build time, and Luxon resolves to a single ESM implementation. The shared image-preview directive loads its overlay on click. Existing helper signatures and the shared compatibility API remain supported.

Ordinary production analyzer, with public Demo shop mapping and private development login disabled:

| Modern entry | Previous baseline | Focused imports/build configuration |
| --- | ---: | ---: |
| JavaScript bytes | 2,823,745 | 1,699,400 |
| Gzip bytes | 706,388 | 425,169 |

The entry has no eager JavaScript chunk imports. Its module graph contains no CSV/encoding/cron dependencies, `commonUtil` compatibility object, auth screens or styles from unused shared components. Ionic datetime/date-button definitions still remain; removing those safely is a follow-up. The analyzer excludes worker/CSS/legacy output from the entry metric; it is not an end-to-end startup benchmark.

The expanded [performance and regression audit](performance-audit-2026-10-02.md) records current tests, main-branch failure comparison, live receipt-review/logout checks and compiled physical-iPad evidence. Manual text entry passed after expanding the iPad's retained compact keyboard through Show Keyboard; a one-tap full-keyboard guarantee is not claimed. No inventory receipt was submitted during this audit.

The production build checks the full eager JavaScript graph (entry plus static imports), with budgets of 1.8 MB decoded / 450 KB gzip, and rejects CSV/encoding/cron dependencies in that graph. Dynamic feature chunks are outside the startup budget. Review the dependency graph before raising these limits.

Audit compiled physical iPad run `run-1790977174956-285e0e93` passed: tracking search and Enter to shipment-filtered detail, manual text entry after expanding the compact keyboard, Open/Completed tabs, Settings, Purchase Orders and Returns, with the actual preview iframe origin verified. No uncaught runtime-error events were recorded and no inventory receipt was submitted. Final analyzer found zero CSV/encoding/cron library modules across all modern chunks; all modern JavaScript totaled 2,563,627 bytes.
