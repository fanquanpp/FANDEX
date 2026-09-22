import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.LHCI_PORT || 4173);
const BASE = process.env.DESKTOP_BUILD === '1' ? '/' : '/FANDEX/';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const rel = BASE !== '/' && pathname.startsWith(BASE) ? pathname.slice(BASE.length - 1) : pathname;
    const safeRel = normalize(rel).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(DIST, safeRel);
    if (!filePath.startsWith(DIST + sep) && filePath !== DIST) throw new Error('path traversal');

    const info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) filePath = join(filePath, 'index.html');
    else if (!info) filePath = join(DIST, '404.html');

    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end('internal error');
  }
});

server.listen(PORT, () => {
  console.log(`[lhci-server] dist served at http://localhost:${PORT} (base ${BASE})`);
});
