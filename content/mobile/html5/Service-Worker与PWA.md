# Service Worker 与 PWA 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## Service Worker 注册

**注册 Service Worker**
`navigator.serviceWorker.register(<scriptURL>, [options]).then(<回调>)`
```javascript
// 基础注册
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((reg) => console.log('注册成功,作用域:', reg.scope))
    .catch((err) => console.error('注册失败:', err));
}
```

| options 字段 | 说明                       | 示例                |
| ------------ | -------------------------- | ------------------- |
| `scope`      | 控制范围(子目录路径)       | `scope: '/'`        |
| `type`       | worker 类型 classic/module | `type: 'module'`    |
| `updateViaCache` | 缓存策略               | `updateViaCache: 'none'` |

**生命周期方法**
```javascript
// 获取注册对象
const reg = await navigator.serviceWorker.ready;

// 手动更新
await reg.update();

// 取消注册
await reg.unregister();

// 监听更新事件
reg.addEventListener('updatefound', () => {
  console.log('发现新版本');
});
```

---

## Service Worker 生命周期事件

**install 事件(安装阶段)**
`self.addEventListener('install', (event) => { event.waitUntil(<Promise>) })`
```javascript
const CACHE_NAME = 'app-v1';
const CACHE_URLS = ['/', '/index.html', '/styles.css', '/app.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting()) // 跳过等待,立即激活
  );
});
```

**activate 事件(激活阶段)**
`self.addEventListener('activate', (event) => { event.waitUntil(<Promise>) })`
```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n !== CACHE_NAME)
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim()) // 立即接管所有客户端
  );
});
```

**生命周期阶段**

| 阶段       | 事件       | 说明                  |
| ---------- | ---------- | --------------------- |
| Installing | `install`  | 安装中,预缓存资源     |
| Waiting    | -          | 等待旧 SW 释放        |
| Activating | `activate` | 激活中,清理旧缓存     |
| Activated  | -          | 已激活,可拦截请求     |
| Redundant  | -          | 安装失败或被替换      |

---

## fetch 事件与缓存策略

**fetch 事件**
`self.addEventListener('fetch', (event) => { event.respondWith(<Response>) })`
```javascript
// Cache First 优先缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

**Cache First(适合静态资源)**
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
```

**Network First(适合 API 请求)**
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
```

**Stale While Revalidate(缓存即时响应,后台更新)**
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
        return cached || fetchPromise;
      })
    )
  );
});
```

**缓存策略对比**

| 策略                       | 说明                   | 适用场景     |
| -------------------------- | ---------------------- | ------------ |
| **Cache First**            | 优先缓存,无则请求网络  | 静态资源     |
| **Network First**          | 优先网络,失败用缓存    | API 请求     |
| **Stale While Revalidate** | 缓存即时响应,后台更新  | 非关键 API   |
| **Network Only**           | 仅网络                 | 实时数据     |
| **Cache Only**             | 仅缓存                 | 离线资源     |

---

## Cache Storage API

**缓存操作方法**
```javascript
// 打开缓存
const cache = await caches.open('my-cache-v1');

// 添加单个资源
await cache.add('/api/data');

// 批量添加
await cache.addAll(['/', '/styles.css', '/app.js']);

// 添加自定义响应
await cache.put('/api/custom', new Response('{"a":1}'));

// 匹配请求
const response = await cache.match('/api/data');

// 删除缓存项
await cache.delete('/api/data');

// 查询所有缓存名
const names = await caches.keys();

// 删除整个缓存
await caches.delete('my-cache-v1');
```

---

## Web App Manifest

**manifest.json 字段**
```json
{
  "name": "我的应用",
  "short_name": "我的App",
  "description": "应用描述",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#1976d2",
  "lang": "zh-CN",
  "dir": "ltr",
  "categories": ["productivity", "utilities"],
  "icons": [
    {
      "src": "/icons/192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "新消息",
      "url": "/messages/new",
      "icons": [{ "src": "/icons/msg.png", "sizes": "96x96" }]
    }
  ]
}
```

| 字段              | 说明                              | 示例值                          |
| ----------------- | --------------------------------- | ------------------------------- |
| `name`            | 应用全名                          | `"我的应用"`                    |
| `short_name`      | 短名(主屏图标)                    | `"我的App"`                     |
| `start_url`       | 启动 URL                          | `"/"`                           |
| `scope`           | 作用域                            | `"/"`                           |
| `display`         | 显示模式                          | `standalone` / `fullscreen` / `minimal-ui` / `browser` |
| `theme_color`     | 主题色                            | `"#1976d2"`                     |
| `background_color`| 启动背景色                        | `"#ffffff"`                     |
| `orientation`     | 屏幕方向                          | `portrait-primary` / `landscape` |
| `icons`           | 图标数组                          | `[{src, sizes, type, purpose}]` |

**HTML 中引用 manifest**
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1976d2" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/icons/apple-180.png" />
```

**display 显示模式检测**
```javascript
// 检测是否以 PWA 方式启动
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone;

window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
  console.log(e.matches ? 'PWA 模式' : '浏览器模式');
});
```

---

## 推送通知

**Notification API**
```javascript
// 请求通知权限
const permission = await Notification.requestPermission();
// permission: 'granted' | 'denied' | 'default'

// 显示通知
new Notification('标题', {
  body: '通知正文',
  icon: '/icons/192.png',
  badge: '/icons/badge.png',
  tag: 'unique-id', // 相同 tag 会替换
  data: { url: '/page' },
  vibrate: [100, 50, 100],
  requireInteraction: true, // 用户必须手动关闭
});
```

**Push API(服务端推送)**
```javascript
// 主线程:订阅推送
const reg = await navigator.serviceWorker.ready;
const subscription = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
});
// 将 subscription 发送到服务端保存
await fetch('/api/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription),
  headers: { 'Content-Type': 'application/json' },
});
```

**Service Worker 处理推送**
```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: '新消息', body: '' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/192.png',
      data: data.url,
    })
  );
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});
```

---

## 后台同步

**注册后台同步**
```javascript
const reg = await navigator.serviceWorker.ready;
await reg.sync.register('sync-data');
```

**Service Worker 处理同步**
```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ data: 'sync data' }),
    });
  } catch (e) {
    throw e; // 抛出错误会自动重试
  }
}
```

**Periodic Sync(周期同步)**
```javascript
// 注册周期同步
const reg = await navigator.serviceWorker.ready;
const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
if (status.state === 'granted') {
  await reg.periodicSync.register('update-content', {
    minInterval: 24 * 60 * 60 * 1000, // 24 小时
  });
}
```

---

## Clients API

**与客户端通信**
```javascript
// 获取所有客户端
const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });

// 向所有客户端发送消息
clients.forEach((client) => client.postMessage({ type: 'UPDATE' }));

// 打开新窗口
await self.clients.openWindow('https://example.com');

// 获取当前客户端
const client = await self.clients.get(clientId);
```

---

## PWA 安装

**beforeinstallprompt 事件**
```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

document.getElementById('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(outcome); // 'accepted' | 'dismissed'
  deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
  console.log('应用已安装');
});
```
