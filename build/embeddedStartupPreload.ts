import { gzipSync } from 'node:zlib';
import type { Plugin, ResolvedConfig } from 'vite';

// Start the two known POS startup routes while the main app downloads. Preload
// only in the embedded login entry; normal browser visits keep Shopify lazy.
export function embeddedStartupPreload(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'receiving-embedded-startup-preload',
    apply: 'build',
    configResolved(value) { config = value; },
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        if (!bundle) return;
        // The legacy plugin renders its separate output before modern HTML.
        if (!Object.values(bundle).some(chunk => chunk.type === 'chunk' && chunk.isEntry &&
          !chunk.fileName.includes('-legacy') && chunk.facadeModuleId?.endsWith('/index.html'))) return;
        const entries = Object.values(bundle).filter(chunk => chunk.type === 'chunk' &&
          !chunk.fileName.includes('-legacy') &&
          ['/common/components/ShopifyLogin.vue', '/src/views/TransferOrders.vue'].some(path => chunk.facadeModuleId?.endsWith(path)));
        if (entries.length !== 2) throw new Error('Unable to locate both embedded Receiving startup routes.');
        const pending = entries.map(chunk => chunk.fileName), scripts = new Set<string>(), styles = new Set<string>();
        let bytes = 0, gzip = 0;
        while (pending.length) {
          const file = pending.pop()!;
          if (scripts.has(file)) continue;
          const chunk = bundle[file];
          if (!chunk || chunk.type !== 'chunk') continue;
          scripts.add(file);
          bytes += Buffer.byteLength(chunk.code);
          gzip += gzipSync(chunk.code).byteLength;
          pending.push(...chunk.imports);
          for (const css of chunk.viteMetadata?.importedCss || []) styles.add(css);
        }
        // Budget the full graph this hint will fetch, including its main chunk.
        if (bytes > 2_000_000 || gzip > 500_000) throw new Error(`Embedded startup preload exceeds its budget: ${bytes} bytes / ${gzip} gzip.`);
        config.logger.info(`Receiving embedded startup JS: ${bytes} bytes / ${gzip} gzip (${scripts.size} chunks).`);
        const links = [
          ...[...scripts].map(file => ['modulepreload', config.base + file]),
          ...[...styles].map(file => ['stylesheet', config.base + file]),
        ];
        return [{ tag: 'script', injectTo: 'head', children: `(function () {
          var support = document.createElement('link').relList;
          if (!support || !support.supports || !support.supports('modulepreload')) return;
          if (window.parent === window || !(/\\/shopify-login$/.test(location.pathname) || /[?&]shop=[^&]+/.test(location.search) && /[?&]host=[^&]+/.test(location.search))) return;
          var links = ${JSON.stringify(links)};
          for (var i = 0; i < links.length; i++) {
            var link = document.createElement('link');
            link.rel = links[i][0]; link.href = links[i][1]; link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
          }
        })();` }];
      },
    },
  };
}
