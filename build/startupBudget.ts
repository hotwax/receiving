import { gzipSync } from 'node:zlib';
import type { Plugin } from 'vite';

/** Check the whole eager JS graph, so splitting an entry cannot hide a regression. */
export function receivingStartupBudget(): Plugin {
  return {
    name: 'receiving-startup-budget',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const entry of Object.values(bundle)) {
        if (entry.type !== 'chunk' || !entry.isEntry || entry.fileName.includes('legacy') ||
            !entry.facadeModuleId?.endsWith('/index.html')) continue;
        const seen = new Set<string>();
        const pending = [entry.fileName];
        let bytes = 0, gzip = 0;
        while (pending.length) {
          const file = pending.pop()!;
          if (seen.has(file)) continue;
          seen.add(file);
          const chunk = bundle[file];
          if (!chunk || chunk.type !== 'chunk') continue;
          bytes += Buffer.byteLength(chunk.code);
          gzip += gzipSync(chunk.code).byteLength;
          pending.push(...chunk.imports);
          for (const id of Object.keys(chunk.modules)) {
            if (/encoding-japanese|cron-parser|cronstrue|papaparse|file-saver/.test(id)) {
              this.error(`Receiving startup includes optional CSV/cron dependency ${id}. Load that feature dynamically.`);
            }
          }
        }
        if (bytes > 1_800_000 || gzip > 450_000) {
          this.error(`Receiving eager JS exceeds its budget: ${bytes} bytes / ${gzip} gzip bytes. Limits: 1800000 / 450000. Review the import graph before changing the limits.`);
        }
        this.info(`Receiving eager JS: ${bytes} bytes / ${gzip} gzip bytes (${seen.size} chunks).`);
      }
    },
  };
}
