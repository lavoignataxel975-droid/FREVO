import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p) => resolve(import.meta.dirname, p);
const PAGES = ['menu', 'events', 'contact', 'responsive-preview'];

/**
 * Gabarits partagés, résolus au build comme en dev :
 *   <include src="header"></include>  → partials/header.html
 *   {{icon:arrow-up-right}}           → SVG Phosphor (graisse light), hérite de currentColor ; {{iconf:…}} en graisse fill
 *   {{img:counter|sizes|alt|class|eager}} → <img> WebP responsive (srcset généré par scripts/images.mjs)
 *   {{srcset:plate-amber}}            → srcset seul, pour un <source> de <picture>
 */
function partials() {
  const manifest = JSON.parse(readFileSync(r('public/img/manifest.json'), 'utf8'));
  const icon = (name, weight = 'light') =>
    readFileSync(r(`node_modules/@phosphor-icons/core/assets/${weight}/${name}-${weight}.svg`), 'utf8')
      .replace('<svg ', '<svg aria-hidden="true" focusable="false" class="icon" ');
  const img = (spec) => {
    const [name, sizes = '100vw', alt = '', cls = '', loading = 'lazy'] = spec.split('|');
    const m = manifest[name];
    if (!m) throw new Error(`Image inconnue : ${name}`);
    const srcset = m.widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', ');
    const fallback = m.widths.find((w) => w >= 1200) ?? m.widths.at(-1);
    return `<img src="/img/${name}-${fallback}.webp" srcset="${srcset}" sizes="${sizes}" width="${m.width}" height="${m.height}" alt="${alt}"${cls ? ` class="${cls}"` : ''} loading="${loading}" decoding="async"${loading === 'eager' ? ' fetchpriority="high"' : ''}>`;
  };
  const expand = (html, depth = 0) => {
    if (depth > 4) return html;
    return html
      .replace(/<include src="([\w-]+)"><\/include>/g, (_, name) => expand(readFileSync(r(`partials/${name}.html`), 'utf8'), depth + 1))
      .replace(/\{\{icon:([\w-]+)\}\}/g, (_, name) => icon(name))
      .replace(/\{\{iconf:([\w-]+)\}\}/g, (_, name) => icon(name, 'fill'))
      .replace(/\{\{img:([^}]+)\}\}/g, (_, spec) => img(spec))
      .replace(/\{\{srcset:([\w-]+)\}\}/g, (_, name) => manifest[name].widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', '));
  };
  return {
    name: 'frevo-partials',
    transformIndexHtml: { order: 'pre', handler: (html) => expand(html) },
    handleHotUpdate({ file, server }) {
      if (file.includes('/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

/** URLs propres en dev / preview : /menu → /menu/ (Vercel ou Netlify font de même en production). */
function cleanUrls() {
  const rewrite = (req, _res, next) => {
    const [path, query] = req.url.split('?');
    if (PAGES.includes(path.replace(/^\/|\/$/g, '')) && !path.endsWith('/')) req.url = `${path}/${query ? `?${query}` : ''}`;
    next();
  };
  return {
    name: 'frevo-clean-urls',
    configureServer(s) { s.middlewares.use(rewrite); },
    configurePreviewServer(s) { s.middlewares.use(rewrite); },
  };
}

export default defineConfig({
  plugins: [partials(), cleanUrls()],
  server: { host: true },
  build: {
    rollupOptions: {
      input: { main: r('index.html'), ...Object.fromEntries(PAGES.map((p) => [p, r(`${p}/index.html`)])) },
    },
  },
});
