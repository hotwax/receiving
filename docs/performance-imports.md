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
| JavaScript bytes | 2,823,745 | 1,699,924 |
| Gzip bytes | 706,388 | 425,440 |

The entry has no eager JavaScript chunk imports. Its module graph contains no CSV/encoding/cron dependencies, `commonUtil` compatibility object, auth screens or styles from unused shared components. Ionic datetime/date-button definitions still remain; removing those safely is a follow-up. The analyzer excludes worker/CSS/legacy output from the entry metric; it is not an end-to-end startup benchmark.

Validation: 65 Receiving tests passed, 65 selected shared lifecycle tests and three utility compatibility tests passed, and Receiving/Company/Fulfillment production builds passed. The broader shared suite has an unresolved product-feature normalization failure; existing URL/semver cases are outside this change.

CI at publication: Receiving cannot find the focused shared modules until AccxUI #197 merges. AccxUI inventory-count and order-manager jobs stop at frozen-lockfile installation mismatches, before compiling the changed source. Those package/lockfile issues are outside this refactor.

Physical iPad QA verified startup, the actual local iframe origin, tracking search and Enter navigation to the shipment-filtered detail. The full software-keyboard assertion for manual scan entry remains unresolved: the compact iPad Keyboard control appears without the full keyboard. A click-handler attempt did not fix it and was removed. Navigation-only QA is being run separately; it does not validate the software-keyboard assertion. No inventory receipt is submitted.
