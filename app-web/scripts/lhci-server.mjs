/**
 * Lighthouse CI 本地静态服务器（零依赖）
 * =============================================================================
 * 背景：站点以 GitHub Pages 项目站点形式构建（base = /FANDEX/），产物内全部
 * 链接与资源引用都带 /FANDEX/ 前缀。LHCI 内置静态服务器按 dist 根目录映射，
 * 无法处理该前缀（/FANDEX/ 会 404），因此提供本服务器：
 * - 剥离 /FANDEX/ 前缀后映射到 dist/ 内文件
 * - 目录路径自动补 index.html；未命中回退 404.html（Astro 构建的独立 404 页）
 * - 防路径穿越：归一化后强制限制在 dist 内
 *
 * 用途：Lighthouse CI（lighthouserc.json 的 startServerCommand）与本地校准。
 * =============================================================================
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** dist 目录（以本文件位置定位，与进程 CWD 无关） */
const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
/** 监听端口（LHCI 配置与本地调试共用） */
const PORT = Number(process.env.LHCI_PORT || 4173);
/** 站点基础路径（与 astro.config.ts 的 SITE_BASE 保持一致） */
const BASE = process.env.DESKTOP_BUILD === '1' ? '/' : '/FANDEX/';

/** 常见静态资源 MIME 映射（Lighthouse 需要 text/html 才按页面度量） */
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
    // 剥离 /FANDEX/ 前缀（保留开头的 /）
    const rel = BASE !== '/' && pathname.startsWith(BASE) ? pathname.slice(BASE.length - 1) : pathname;
    // 归一化并强制限制在 dist 内（防 ../ 穿越）
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
