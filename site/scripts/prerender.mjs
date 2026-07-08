import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const distDir = path.join(siteRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');
const ssrDir = path.join(distDir, '.ssr');
const siteUrl = 'https://mood-tracker.jianghong.site/';

const entryCandidates = [
  path.join(ssrDir, 'entry-server.js'),
  path.join(ssrDir, 'entry-server.mjs'),
];

const entryPath = entryCandidates.find((candidate) => existsSync(candidate));

if (!entryPath) {
  throw new Error(`Cannot find SSR entry in ${ssrDir}`);
}

const { render } = await import(pathToFileURL(entryPath).href);
const appHtml = render();
const indexHtml = await fs.readFile(indexPath, 'utf8');

if (!indexHtml.includes('<div id="root"></div>')) {
  throw new Error('Cannot find empty root element in built index.html');
}

await fs.writeFile(
  indexPath,
  indexHtml.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
);

await fs.writeFile(
  path.join(distDir, 'robots.txt'),
  [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${new URL('/sitemap.xml', siteUrl).href}`,
    '',
  ].join('\n')
);

await fs.writeFile(
  path.join(distDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
);

await fs.rm(ssrDir, { recursive: true, force: true });
