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
    let status = 200;
    if (info?.isDirectory()) filePath = join(filePath, 'index.html');
    else if (!info) {
      // 缺失资源回退 404.html 时必须携带真实 404 状态：
      // 冒烟测试与 Lighthouse 都依赖状态码判定可达性，200 会令断言恒真
      filePath = join(DIST, '404.html');
      status = 404;
    }

    const body = await readFile(filePath);
    res.writeHead(status, { 'content-type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end('internal error');
  }
});

server.listen(PORT, () => {
  console.log(`[lhci-server] dist served at http://localhost:${PORT} (base ${BASE})`);
});
