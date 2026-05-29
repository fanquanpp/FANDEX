const CACHE_NAME = 'codex-v1';
const BASE = '/MyNotebook/';

const PRECACHE_URLS = [BASE, BASE + 'data/glossary-index.json'];

const CACHE_FIRST_EXTS = new Set([
  '.css',
  '.js',
  '.woff2',
  '.woff',
  '.ttf',
  '.webp',
  '.svg',
  '.png',
]);
const STALE_REVALIDATE_EXTS = new Set(['.json']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
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
  if (!url.pathname.startsWith(BASE)) return;

  const ext = getExt(url.pathname);

  if (CACHE_FIRST_EXTS.has(ext)) {
    event.respondWith(cacheFirst(event.request));
  } else if (STALE_REVALIDATE_EXTS.has(ext)) {
    event.respondWith(staleWhileRevalidate(event.request));
  } else {
    event.respondWith(networkFirst(event.request));
  }
});

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
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function cacheFirst(request) {
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
    .catch(() => cached || new Response('', { status: 503 }));
  return cached || fetchPromise;
}

function getExt(path) {
  const idx = path.lastIndexOf('.');
  return idx > 0 ? path.substring(idx) : '';
}
