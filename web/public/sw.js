/**
 * FANDEX Service Worker
 * 缓存策略：
 * - HTML 页面：不缓存，直接走网络（浏览器自带条件请求机制）
 * - 含 hash 的资源（CSS/JS/字体）：Cache First（长期缓存）
 * - JSON 数据文件：Network First
 * - 图片/其他：Stale While Revalidate
 */

/** @type {string} 缓存版本号，更新时修改以清除旧缓存 */
const CACHE_NAME = 'fandex-v6';
/** @type {string} 站点基础路径 */
const BASE = '/FANDEX-web/';

/** @type {string[]} 预缓存资源列表（仅静态资源，不含 HTML） */
const PRECACHE_URLS = [BASE + 'data/glossary-index.json'];

/** @type {Set<string>} 含 hash 的资源扩展名，可长期缓存 */
const HASHED_EXTS = new Set(['.css', '.js', '.woff2', '.woff', '.ttf']);
/** @type {RegExp} 需要网络优先的 JSON 数据文件 */
const JSON_DATA_PATTERN = /\/data\/[^/]+\.json$/;

/**
 * Service Worker 安装事件：预缓存关键资源，跳过等待立即激活
 * 容错策略：逐项 put 替代 cache.addAll，避免单个资源失败导致整体 install reject
 *   - addAll 是原子操作：任一资源 fetch 失败即整体回滚，SW 无法激活
 *   - 逐项 put 允许非关键资源（如 glossary-index.json）单独失败时仍完成安装
 *   - 失败资源仅记录 warn，不阻断 SW 激活流程
 * @param {ExtendableEvent} event
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            // 用单独的 fetch + put 替代 addAll 的原子性
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            } else {
              console.warn(`[sw] 预缓存资源 ${url} 返回非 2xx：${response.status}`);
            }
          } catch (e) {
            // 单个资源失败不阻断安装，记录 warn 便于运维定位
            console.warn(`[sw] 预缓存资源 ${url} 失败：`, e?.message || e);
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

/**
 * Service Worker 激活事件：清除旧版本缓存，立即接管所有客户端
 * @param {ExtendableEvent} event
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

/**
 * Fetch 事件：根据资源类型选择缓存策略
 * HTML 页面不经过 SW 缓存，确保用户始终看到最新版本
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (!url.pathname.startsWith(BASE)) return;

  const ext = getExt(url.pathname);
  const isHTML = ext === '' || ext === '.html' || url.pathname.endsWith('/');

  // HTML 页面：不缓存，直接走网络，由浏览器管理缓存
  if (isHTML) return;

  if (HASHED_EXTS.has(ext)) {
    event.respondWith(cacheFirstLong(event.request));
  } else if (JSON_DATA_PATTERN.test(url.pathname)) {
    event.respondWith(networkFirst(event.request));
  } else {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

/** @type {Set<string>} Stale While Revalidate 适用的扩展名 */
const STALE_REVALIDATE_EXTS = new Set(['.webp', '.svg', '.png', '.avif', '.json']);

/**
 * Cache First 策略：优先从缓存读取，缓存未命中时回退网络
 * 适用于含 hash 的静态资源（文件名变化即视为新资源）
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function cacheFirstLong(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

/**
 * Network First 策略：优先从网络获取，网络失败时回退缓存
 * 适用于需要保持新鲜的数据文件
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

/**
 * Stale While Revalidate 策略：先返回缓存，后台更新
 * 适用于图片等可容忍短暂过期的资源
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || new Response('Offline', { status: 503, statusText: 'Offline' }));
  return cached || fetchPromise;
}

/**
 * 从路径中提取文件扩展名
 * @param {string} path
 * @returns {string}
 */
function getExt(path) {
  const idx = path.lastIndexOf('.');
  if (idx <= 0) return '';
  const ext = path.substring(idx);
  if (ext.includes('/')) return '';
  return ext;
}
