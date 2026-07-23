/**
 * FANDEX Service Worker - PWA 离线缓存（Phase 10）
 *
 * 缓存策略：
 * - HTML 页面：Stale While Revalidate（优先缓存，后台更新）
 * - JS/CSS（含 hash）：Cache First（缓存优先，回退网络）
 * - 图片/字体：Cache First + 7 天过期（LRU 淘汰）
 * - Pagefind 索引：Cache First（不更新，永久缓存）
 * - 导航请求：Cache First，回退网络，再回退离线页
 *
 * 缓存上限：100 个条目，LRU 淘汰
 *
 * 生命周期：
 * - install：预缓存核心资源（首页、仪表盘、搜索、路线、manifest、icons）
 * - activate：清理旧版本缓存
 * - fetch：根据请求类型路由到不同策略
 *
 * 兼容性：
 * - 原生 JS（无 TypeScript），SW 直接在浏览器执行
 * - 不使用 import（SW 不支持 ES modules 除非 type: 'module'）
 * - 使用 self.addEventListener 注册生命周期事件
 * - 使用 caches.open / caches.match / fetch API
 * - 兼容 GitHub Pages 子路径部署（BASE 路径处理）
 * - 兼容 Tauri 桌面端（base 为 '/'）
 *
 * 降级：导航请求失败时回退到 '/'（首页，已预缓存）
 */

/** @type {string} 缓存版本号 */
const CACHE_VERSION = 'fandex-v3.0.0';

/** @type {string} 主缓存名（用于 HTML / JS / CSS / 图片 / 字体） */
const CACHE_NAME = 'fandex-v3.0.0';

/** @type {string} Pagefind 索引缓存名（独立缓存，不参与 LRU 淘汰） */
const PAGEFIND_CACHE_NAME = 'fandex-pagefind-v3.0.0';

/** @type {string} 站点基础路径（支持 GitHub Pages 与 Tauri） */
const BASE = (typeof self !== 'undefined' && self.location && self.location.pathname
  ? self.location.pathname.replace(/\/sw\.js$/, '/')
  : '/');

/** @type {string[]} 预缓存核心资源列表 */
const PRECACHE_URLS = [
  BASE,
  BASE + 'dashboard/',
  BASE + 'search/',
  BASE + 'roadmap/',
  BASE + 'manifest.json',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
  BASE + 'icons/icon.svg',
  BASE + 'offline.html',
];

/** @type {Set<string>} 含 hash 的资源扩展名，可长期缓存 */
const HASHED_EXTS = new Set(['.css', '.js', '.woff2', '.woff', '.ttf']);

/** @type {RegExp} 需要后台更新的 JSON 数据文件 */
const JSON_DATA_PATTERN = /\/data\/[^/]+\.json$/;

/** @type {RegExp} HTML 页面模式（路径以 / 结尾或 .html 结尾） */
const HTML_PATTERN = /\/$|\.html$/;

/** @type {RegExp} 图片资源模式 */
const IMAGE_PATTERN = /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/i;

/** @type {RegExp} 字体资源模式 */
const FONT_PATTERN = /\.(woff2|woff|ttf|otf|eot)$/i;

/** @type {RegExp} Pagefind 索引模式 */
const PAGEFIND_PATTERN = /\/pagefind\/|^pagefind\//;

/** @type {number} 缓存最大条目数（LRU 淘汰） */
const CACHE_MAX_ENTRIES = 100;

/** @type {number} 图片/字体缓存过期时间（7 天，毫秒） */
const ASSET_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** @type {number} 预缓存分批大小（避免单次 addAll 失败） */
const PRECACHE_BATCH_SIZE = 50;

/**
 * Service Worker 安装事件
 *
 * 预缓存核心资源，实现完全离线可用。
 * 预缓存失败时仅记录警告，不阻止安装。
 *
 * @param {ExtendableEvent} event
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      /** 分批预缓存，避免单次 addAll 失败导致全部回退 */
      for (let i = 0; i < PRECACHE_URLS.length; i += PRECACHE_BATCH_SIZE) {
        const batch = PRECACHE_URLS.slice(i, i + PRECACHE_BATCH_SIZE);
        try {
          await cache.addAll(batch);
        } catch (err) {
          console.warn('[SW] 预缓存批次失败，跳过:', err && err.message);
        }
      }
      self.skipWaiting();
    })(),
  );
});

/**
 * Service Worker 激活事件
 *
 * 清除旧版本缓存，立即接管所有客户端。
 * 通知所有客户端有新版本可用。
 *
 * @param {ExtendableEvent} event
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      /** 清除非当前版本的缓存 */
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== PAGEFIND_CACHE_NAME)
          .map((k) => caches.delete(k)),
      );
      self.clients.claim();

      /** 通知客户端 SW 已更新 */
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
      }
    })(),
  );
});

/**
 * Fetch 事件：根据资源类型选择缓存策略
 *
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /**
   * 路径匹配逻辑：
   * - 绝对路径模式（GitHub Pages）：检查 pathname 是否以 BASE 开头
   * - 同源检查：Tauri 环境下仅处理同源请求
   */
  if (BASE.startsWith('/')) {
    if (!url.pathname.startsWith(BASE) && url.pathname !== '/') return;
  } else {
    if (url.origin !== self.location.origin) return;
  }

  const ext = getExt(url.pathname);
  const isNavigation = request.mode === 'navigate';
  const isHTML = isNavigation || ext === '' || ext === '.html' || url.pathname.endsWith('/');
  const isJSorCSS = ext === '.js' || ext === '.css';
  const isImage = IMAGE_PATTERN.test(url.pathname);
  const isFont = FONT_PATTERN.test(url.pathname);
  const isJSON = JSON_DATA_PATTERN.test(url.pathname);
  const isPagefind = PAGEFIND_PATTERN.test(url.pathname);

  /** 导航请求：Cache First -> 网络 -> 离线页 */
  if (isNavigation) {
    event.respondWith(handleNavigation(request));
    return;
  }

  /** Pagefind 索引：Cache First（不更新，永久缓存） */
  if (isPagefind) {
    event.respondWith(cacheFirstPagefind(request));
    return;
  }

  /** HTML 子资源：Stale While Revalidate */
  if (isHTML) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  /** JS/CSS（含 hash）：Cache First */
  if (isJSorCSS || HASHED_EXTS.has(ext)) {
    event.respondWith(cacheFirstLong(request));
    return;
  }

  /** 图片/字体：Cache First + 7 天过期 */
  if (isImage || isFont) {
    event.respondWith(cacheFirstWithExpiry(request, ASSET_EXPIRY_MS));
    return;
  }

  /** JSON 数据：Stale While Revalidate */
  if (isJSON) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  /** 其他资源：Stale While Revalidate */
  event.respondWith(staleWhileRevalidate(request));
});

/**
 * 处理导航请求
 *
 * 输入：导航 Request
 * 输出：Response（缓存优先 -> 网络 -> 离线页）
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  /** 尝试匹配缓存（处理 /path 和 /path/index.html 两种形式） */
  let cached = await cache.match(request);
  if (!cached) {
    const url = new URL(request.url);
    cached = await cache.match(url.pathname + 'index.html');
  }

  if (cached) {
    /** 后台更新缓存 */
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
          enforceLRU(cache);
        }
      })
      .catch(() => {});
    return cached;
  }

  /** 缓存未命中，走网络 */
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      enforceLRU(cache);
    }
    return response;
  } catch {
    /** 网络失败，返回首页（已预缓存） */
    const offlineUrl = BASE + 'offline.html';
    const offlinePage = await cache.match(offlineUrl);
    if (offlinePage) return offlinePage;
    /** 离线页不存在时回退到首页 */
    const homePage = await cache.match(BASE);
    return homePage || new Response('离线模式', { status: 503, statusText: 'Offline' });
  }
}

/**
 * Stale While Revalidate 策略
 *
 * 先返回缓存，后台更新。适用于 HTML 页面与 JSON 数据。
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        enforceLRU(cache);
      }
      return response;
    })
    .catch(() => cached || new Response('Offline', { status: 503, statusText: 'Offline' }));

  return cached || fetchPromise;
}

/**
 * Cache First 策略（长期缓存，含 hash 的资源）
 *
 * 适用于含 hash 的静态资源，文件名变化即视为新资源。
 *
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
      await cache.put(request, response.clone());
      enforceLRU(cache);
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

/**
 * Cache First + 过期检查策略（图片 / 字体）
 *
 * 7 天过期，过期后下次请求会重新获取。
 *
 * @param {Request} request
 * @param {number} expiryMs - 过期时间（毫秒）
 * @returns {Promise<Response>}
 */
async function cacheFirstWithExpiry(request, expiryMs) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    /** 检查缓存时间 */
    const cachedTime = cached.headers.get('date');
    if (cachedTime) {
      const age = Date.now() - new Date(cachedTime).getTime();
      if (age < expiryMs) {
        /** 未过期，返回缓存 */
        return cached;
      }
    } else {
      /** 无日期头，直接返回缓存 */
      return cached;
    }
  }

  /** 缓存未命中或已过期，走网络 */
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      enforceLRU(cache);
    }
    return response;
  } catch {
    /** 网络失败，返回过期缓存（如果有） */
    if (cached) return cached;
    return new Response('', { status: 503 });
  }
}

/**
 * Cache First 策略（Pagefind 索引）
 *
 * Pagefind 索引不更新（构建时已确定），永久缓存。
 * 使用独立的缓存名，不参与 LRU 淘汰。
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function cacheFirstPagefind(request) {
  const cache = await caches.open(PAGEFIND_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

/**
 * LRU 淘汰机制
 *
 * 当缓存条目超过 CACHE_MAX_ENTRIES 时，删除最早的条目。
 * 使用 caches 的 keys 顺序作为 LRU 顺序（最近写入的在末尾）。
 *
 * @param {Cache} cache
 */
async function enforceLRU(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= CACHE_MAX_ENTRIES) return;

    /** 删除最早的条目（保留最近 CACHE_MAX_ENTRIES 个） */
    const toDelete = keys.slice(0, keys.length - CACHE_MAX_ENTRIES);
    await Promise.all(toDelete.map((req) => cache.delete(req)));
  } catch {
    /* LRU 淘汰失败时静默降级 */
  }
}

/**
 * 从路径中提取文件扩展名
 *
 * @param {string} path
 * @returns {string}
 */
function getExt(path) {
  const idx = path.lastIndexOf('.');
  if (idx <= 0) return '';
  const ext = path.substring(idx);
  if (ext.includes('/')) return '';
  return ext.toLowerCase();
}
