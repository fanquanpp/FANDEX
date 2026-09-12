/**
 * FANDEX Service Worker
 * =============================================================================
 * 缓存策略（v8）：
 * - HTML 页面：Stale While Revalidate（先回缓存秒开，后台拉取最新版覆盖）
 *   - 缓存键归一化为 pathname（忽略 ?sidebar / ?pen 等视图参数，避免缓存碎片）
 *   - 上限 40 页（LRU 淘汰），兼顾离线覆盖与存储占用
 *   - 高延迟网络下重复访问 TTFB 从秒级降到毫秒级；后台更新保证下次进入是新版
 * - 含 hash 的资源（CSS/JS/字体）：Cache First（长期缓存）
 * - JSON 数据文件：Network First
 * - 图片/其他：Stale While Revalidate
 * - 离线兜底：HTML 无缓存且网络失败时返回 offline.html（预缓存保证可用）
 */

/** @type {string} 缓存版本号，更新时修改以清除旧缓存 */
const CACHE_NAME = 'fandex-v8';
/** @type {string} 站点基础路径（与 astro.config.ts base 一致） */
const BASE = '/FANDEX/';
/** @type {string} 离线兜底页路径 */
const OFFLINE_URL = `${BASE}offline.html`;
/** @type {number} HTML 页面缓存上限（超出后按最旧淘汰） */
const HTML_CACHE_LIMIT = 40;

/** @type {string[]} 预缓存资源列表（离线兜底页必须预缓存） */
const PRECACHE_URLS = [OFFLINE_URL];

/** @type {Set<string>} 含 hash 的资源扩展名，可长期缓存 */
const HASHED_EXTS = new Set(['.css', '.js', '.woff2', '.woff', '.ttf']);
/** @type {RegExp} 需要网络优先的 JSON 数据文件 */
const JSON_DATA_PATTERN = /\/data\/[^/]+\.json$/;

/**
 * Service Worker 安装事件：预缓存关键资源，跳过等待立即激活
 * 容错策略：逐项 put 替代 cache.addAll，避免单个资源失败导致整体 install reject
 *   - addAll 是原子操作：任一资源 fetch 失败即整体回滚，SW 无法激活
 *   - 逐项 put 允许非关键资源单独失败时仍完成安装
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
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE)) return;

  const ext = getExt(url.pathname);
  const isHTML = ext === '' || ext === '.html' || url.pathname.endsWith('/');

  // HTML 页面：SWR（含离线兜底）
  if (isHTML) {
    event.respondWith(htmlStaleWhileRevalidate(event.request, url));
    return;
  }

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
 * HTML 页面 Stale While Revalidate：
 * 1. 缓存命中 → 立即返回缓存副本，同时后台拉取最新版并更新缓存
 * 2. 缓存未命中 → 等待网络响应并写入缓存；网络失败回退 offline.html
 * 缓存键使用 pathname（忽略查询参数），视图状态参数不产生缓存碎片
 * @param {Request} request
 * @param {URL} url - 请求 URL 对象
 * @returns {Promise<Response>}
 */
async function htmlStaleWhileRevalidate(request, url) {
  const cache = await caches.open(CACHE_NAME);
  // 归一化缓存键：仅保留 pathname，查询参数不参与匹配
  const cacheKey = url.pathname;
  const cached = await cache.match(cacheKey);

  // 后台更新：无论是否命中都拉取最新版（失败静默，不打扰用户）
  const fetchPromise = (async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        // 命中缓存且后台拿到了不同内容：通知页面弹出「内容已更新」提示条，
        // 弥补 SWR"本次读到旧版"的体验缺口（详见 lib/sw-update）
        if (cached && (await contentDiffers(cached, response))) {
          await notifyContentUpdated(cacheKey);
        }
        await putHtmlWithLimit(cache, cacheKey, response);
      }
      return response;
    } catch {
      // 网络失败：有缓存时静默忽略；无缓存时由下方兜底
      return null;
    }
  })();

  if (cached) return cached;

  // 缓存未命中：等待网络；仍失败则回退离线兜底页
  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;
  const offline = await cache.match(OFFLINE_URL);
  return (
    offline ||
    new Response('Offline', { status: 503, statusText: 'Offline' })
  );
}

/**
 * 比对缓存副本与后台新响应的 HTML 是否不同
 * 优先比较 ETag（两者都有时零开销）；任一方缺失时回退全文比对
 * @param {Response} cached - 缓存中的旧副本
 * @param {Response} fresh - 后台拉取的新响应
 * @returns {Promise<boolean>} 内容是否发生变化
 */
async function contentDiffers(cached, fresh) {
  const cachedTag = cached.headers.get('etag');
  const freshTag = fresh.headers.get('etag');
  if (cachedTag && freshTag) return cachedTag !== freshTag;
  const [cachedText, freshText] = await Promise.all([
    cached.clone().text(),
    fresh.clone().text(),
  ]);
  return cachedText !== freshText;
}

/**
 * 向所有打开的页面广播内容更新事件
 * @param {string} pathname - 发生更新的页面路径（归一化缓存键）
 */
async function notifyContentUpdated(pathname) {
  const clientList = await self.clients.matchAll({ type: 'window' });
  for (const client of clientList) {
    client.postMessage({ type: 'SW_CONTENT_UPDATED', pathname });
  }
}

/**
 * 写入 HTML 缓存并执行 LRU 上限淘汰
 * 通过请求时间戳排序，超出上限时删除最旧的条目
 * @param {Cache} cache
 * @param {string} cacheKey - 归一化缓存键（pathname）
 * @param {Response} response - 最新响应（函数内部 clone）
 */
async function putHtmlWithLimit(cache, cacheKey, response) {
  await cache.put(cacheKey, response.clone());
  const keys = await cache.keys();
  const htmlKeys = keys.filter((req) => {
    const path = new URL(req.url).pathname;
    return path.startsWith(BASE) && getExt(path) === '';
  });
  if (htmlKeys.length <= HTML_CACHE_LIMIT) return;
  // keys() 返回顺序即创建顺序，淘汰最旧的超出部分
  const excess = htmlKeys.length - HTML_CACHE_LIMIT;
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(htmlKeys[i]);
  }
}

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
