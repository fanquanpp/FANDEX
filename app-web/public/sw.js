
const CACHE_NAME = 'fandex-v8';
const BASE = '/FANDEX/';
const OFFLINE_URL = `${BASE}offline.html`;
const HTML_CACHE_LIMIT = 40;

const PRECACHE_URLS = [OFFLINE_URL];

const HASHED_EXTS = new Set(['.css', '.js', '.woff2', '.woff', '.ttf']);
const JSON_DATA_PATTERN = /\/data\/[^/]+\.json$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            } else {
              console.warn(`[sw] 预缓存资源 ${url} 返回非 2xx：${response.status}`);
            }
          } catch (e) {
            console.warn(`[sw] 预缓存资源 ${url} 失败：`, e?.message || e);
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE)) return;

  const ext = getExt(url.pathname);
  const isHTML = ext === '' || ext === '.html' || url.pathname.endsWith('/');

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

const STALE_REVALIDATE_EXTS = new Set(['.webp', '.svg', '.png', '.avif', '.json']);

async function htmlStaleWhileRevalidate(request, url) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = url.pathname;
  const cached = await cache.match(cacheKey);

  const fetchPromise = (async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        if (cached && (await contentDiffers(cached, response))) {
          await notifyContentUpdated(cacheKey);
        }
        await putHtmlWithLimit(cache, cacheKey, response);
      }
      return response;
    } catch {
      return null;
    }
  })();

  if (cached) return cached;

  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;
  const offline = await cache.match(OFFLINE_URL);
  return (
    offline ||
    new Response('Offline', { status: 503, statusText: 'Offline' })
  );
}

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

async function notifyContentUpdated(pathname) {
  const clientList = await self.clients.matchAll({ type: 'window' });
  for (const client of clientList) {
    client.postMessage({ type: 'SW_CONTENT_UPDATED', pathname });
  }
}

async function putHtmlWithLimit(cache, cacheKey, response) {
  await cache.put(cacheKey, response.clone());
  const keys = await cache.keys();
  const htmlKeys = keys.filter((req) => {
    const path = new URL(req.url).pathname;
    return path.startsWith(BASE) && getExt(path) === '';
  });
  if (htmlKeys.length <= HTML_CACHE_LIMIT) return;
  const excess = htmlKeys.length - HTML_CACHE_LIMIT;
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(htmlKeys[i]);
  }
}

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

function getExt(path) {
  const idx = path.lastIndexOf('.');
  if (idx <= 0) return '';
  const ext = path.substring(idx);
  if (ext.includes('/')) return '';
  return ext;
}
