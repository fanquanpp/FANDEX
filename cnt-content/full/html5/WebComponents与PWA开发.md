---
order: 60
tags:
  - html5
difficulty: intermediate
title: 'Web Components 与 PWA 开发'
module: html5
category: 'HTML5 Basics'
description: Web组件与渐进式Web应用开发
author: fanquanpp
updated: '2026-05-03'
related:
  - html5/嵌入式内容
  - html5/progress与meter
  - html5/拖拽API
  - html5/地理位置定位
prerequisites:
  - html5/概述与核心特性
---

## 1. Web Components 概述

Web Components 是一组 Web 平台 API，允许开发者创建可重用的自定义元素，这些元素可以在任何 HTML 页面中使用，无论使用什么框架。

### 核心技术

- **Custom Elements**：创建自定义 HTML 元素
- **Shadow DOM**：封装组件样式和结构
- **HTML Templates**：定义可重用的 HTML 结构
- **HTML Imports**：导入组件（已被 ES 模块取代）

## 2. Custom Elements

### 2.1 定义自定义元素

```javascript
class MyElement extends HTMLElement {
  constructor() {
    super();
    // 元素初始化
  }
  // 当元素被添加到 DOM 时调用
  connectedCallback() {
    this.innerHTML = `<p>Hello, Web Components!</p>`;
  }
  // 当元素从 DOM 中移除时调用
  disconnectedCallback() {
    // 清理资源
  }
  // 当属性变化时调用
  attributeChangedCallback(name, oldValue, newValue) {
    // 处理属性变化
  }
  // 定义需要观察的属性
  static get observedAttributes() {
    return ['title'];
  }
}
// 注册自定义元素
customElements.define('my-element', MyElement);
```

### 2.2 使用自定义元素

```html
<my-element title="Hello"></my-element>
```

## 3. Shadow DOM

### 3.1 创建 Shadow DOM

```javascript
class MyElement extends HTMLElement {
  constructor() {
    super();
    // 创建 Shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });
    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
  p {
  color: blue;
  font-size: 18px;
  }
  `;
    // 创建内容
    const p = document.createElement('p');
    p.textContent = 'Hello from Shadow DOM!';
    // 添加到 Shadow DOM
    shadow.appendChild(style);
    shadow.appendChild(p);
  }
}
customElements.define('my-shadow-element', MyElement);
```

## 4. HTML Templates

### 4.1 定义模板

```html
<template id="my-template">
  <style>
    .container {
      padding: 20px;
      background: #f0f0f0;
      border-radius: 8px;
    }
    h3 {
      color: #333;
    }
  </style>
  <div class="container">
    <h3></h3>
    <p></p>
  </div>
</template>
```

### 4.2 使用模板

```javascript
class MyTemplateElement extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    // 获取模板
    const template = document.getElementById('my-template');
    const content = template.content.cloneNode(true);
    // 设置内容
    content.querySelector('h3').textContent = this.getAttribute('title') || 'Default Title';
    content.querySelector('p').textContent = this.getAttribute('message') || 'Default message';
    shadow.appendChild(content);
  }
}
customElements.define('my-template-element', MyTemplateElement);
```

## 5. 组件生命周期

### 5.1 生命周期回调

| 回调方法                                             | 触发时机             |
| :--------------------------------------------------- | :------------------- |
| `constructor()`                                      | 元素创建时           |
| `connectedCallback()`                                | 元素添加到 DOM 时    |
| `disconnectedCallback()`                             | 元素从 DOM 中移除时  |
| `attributeChangedCallback(name, oldValue, newValue)` | 属性变化时           |
| `adoptedCallback()`                                  | 元素被移动到新文档时 |

## 6. PWA (Progressive Web App) 概述

PWA 是一种结合了 Web 和原生应用优点的应用程序，具有安装到主屏幕、离线访问、推送通知等特性。

### 核心特性

- **可安装**：可以添加到主屏幕
- **离线工作**：使用 Service Worker 缓存资源
- **推送通知**：发送推送消息
- **后台同步**：在网络可用时同步数据
- **响应式**：适配不同屏幕尺寸

## 7. PWA 配置

### 7.1 Web App Manifest

```json
{
  "name": "My PWA",
  "short_name": "PWA",
  "description": "A progressive web app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4A90E2",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 7.2 注册 Manifest

```html
<link rel="manifest" href="/manifest.json" /> <meta name="theme-color" content="#4A90E2" />
```

## 8. Service Worker

### 8.1 注册 Service Worker

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
```

### 8.2 Service Worker 实现

```javascript
 // service-worker.js
 const CACHE_NAME = 'my-pwa-cache-v1';
 const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/icons/icon-192x192.png'
 ]
 // 安装 Service Worker
 self.addEventListener('install', event => {
  event.waitUntil(
  caches.open(CACHE_NAME)
  .then(cache => {
  return cache.addAll(ASSETS);
  })
  .then(() => self.skipWaiting())
  );
 }
 // 激活 Service Worker
 self.addEventListener('activate', event => {
  event.waitUntil(
  caches.keys()
  .then(cacheNames => {
  return Promise.all(
  cacheNames
  .filter(name => name !== CACHE_NAME)
  .map(name => caches.delete(name))
  );
  })
  .then(() => self.clients.claim())
  );
 }
 // 拦截网络请求
 self.addEventListener('fetch', event => {
  event.respondWith(
  caches.match(event.request)
  .then(response => {
  // 如果在缓存中找到响应，则返回缓存的响应
  if (response) {
  return response;
  }
  // 否则，发送网络请求
  return fetch(event.request)
  .then(response => {
  // 如果响应有效，则将其添加到缓存
  if (response && response.status === 200 && response.type === 'basic') {
  const responseToCache = response.clone();
  caches.open(CACHE_NAME)
  .then(cache => {
  cache.put(event.request, responseToCache);
  });
  }
  return response;
  });
  })
  );
 }
```

## 9. 离线功能

### 9.1 缓存策略

- **Cache First**：优先使用缓存，缓存不存在时请求网络
- **Network First**：优先请求网络，网络失败时使用缓存
- **Stale While Revalidate**：使用缓存的同时请求网络更新缓存
- **Network Only**：只使用网络
- **Cache Only**：只使用缓存

## 10. 推送通知

### 10.1 请求通知权限

```javascript
if ('Notification' in window) {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('Notification permission granted');
    }
  });
}
```

### 10.2 发送推送通知

```javascript
function sendNotification() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification('Hello PWA!', {
        body: 'This is a push notification from your PWA',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge.png',
        vibrate: [100, 50, 100],
        data: {
          url: '/notifications',
        },
      });
    });
  }
}
```

## 11. 后台同步

### 11.1 注册后台同步

```javascript
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready
    .then((registration) => {
      return registration.sync.register('sync-data');
    })
    .then(() => {
      console.log('Background sync registered');
    })
    .catch((error) => {
      console.error('Background sync registration failed:', error);
    });
}
```

### 11.2 处理后台同步

```javascript
// service-worker.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});
async function syncData() {
  try {
    // 同步数据的逻辑
    const response = await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ data: 'sync data' }),
    });
    console.log('Background sync completed:', await response.json());
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
```

## 12. PWA 最佳实践

1. **响应式设计**：确保在所有设备上都有良好的用户体验
2. **离线优先**：设计应用时考虑离线场景
3. **快速加载**：优化资源加载速度
4. **安全**：使用 HTTPS
5. **可安装**：提供清晰的安装提示
6. **推送通知**：合理使用推送通知，避免过度打扰用户
7. **后台同步**：使用后台同步确保数据一致性
8. **性能监控**：监控应用性能，持续优化

## 13. 项目实战

### 13.1 Web Components 项目结构

```
 web-components/
 ├── components/
 │ ├── my-header/
 │ │ ├── my-header.js
 │ │ └── my-header.css
 │ ├── my-footer/
 │ │ ├── my-footer.js
 │ │ └── my-footer.css
 │ └── my-card/
 │ ├── my-card.js
 │ └── my-card.css
 ├── index.html
 └── main.js
```

### 13.2 PWA 项目结构

```
 pwa-project/
 ├── icons/
 │ ├── icon-192x192.png
 │ └── icon-512x512.png
 ├── index.html
 ├── manifest.json
 ├── service-worker.js
 ├── styles.css
 └── app.js
```

## 14. 工具与库

### 14.1 Web Components 库

- **Lit**：Google 开发的轻量级 Web Components 库
- **Stencil**：Ionic 团队开发的 Web Components 编译器
- **Svelte**：可以编译为 Web Components 的前端框架

### 14.2 PWA 工具

- **Workbox**：Google 开发的 Service Worker 工具库
- **Lighthouse**：PWA 性能和质量评估工具
- **PWABuilder**：PWA 生成和打包工具

## 15. 浏览器支持

### 15.1 Web Components 支持

- Chrome：完全支持
- Firefox：完全支持
- Safari：支持（需要 polyfill 用于旧版本）
- Edge：完全支持

### 15.2 PWA 支持

- Chrome：完全支持
- Firefox：部分支持
- Safari：部分支持（推送通知有限制）
- Edge：完全支持

## 16. 常见问题与解决方案

### 16.1 Web Components 问题

**问题**：自定义元素在某些浏览器中不工作
**解决方案**：使用 Web Components polyfill
**问题**：样式隔离问题
**解决方案**：使用 Shadow DOM 确保样式隔离

### 16.2 PWA 问题

**问题**：Service Worker 缓存更新问题
**解决方案**：实现版本控制和缓存清理策略
**问题**：推送通知权限被拒绝
**解决方案**：在合适的时机请求权限，提供清晰的使用说明

## 17. 延伸阅读

- [Web Components 官方文档](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [PWA 官方文档](https://web.dev/progressive-web-apps/)
- [Workbox 文档](https://developers.google.com/web/tools/workbox)
- [Lit 文档](https://lit.dev/docs/)
  通过本教程，你已经了解了 Web Components 和 PWA 的核心概念和实践技巧。在实际项目中，你可以结合这些技术创建具有原生应用体验的 Web 应用，提升用户体验和性能。
