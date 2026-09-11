---
order: 330
title: React 与 PWA
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 渐进式 Web 应用实战：manifest 与安装条件、Service Worker 生命周期、缓存策略（cache-first/network-first/stale-while-revalidate）、vite-plugin-pwa 接入与版本更新提示。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/310-ReactMicroFrontend'
  - 'react/320-ReactAccessibility'
  - 'react/340-ReactCanvas'
  - 'react/350-ReactD3'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

PWA（Progressive Web App）是让 Web 应用获得"类原生"能力的一组技术：**离线可用（Service Worker 缓存）、可安装到桌面/主屏（manifest）、消息推送与后台同步**。类比：普通网页是"每次进店现做"，PWA 是"店里囤好货"——断网也能营业，二次打开秒开。它不是框架而是配置集合：React 侧只需要三件事——提供 manifest、注册 Service Worker、处理"新版本可用"的更新交互。现代项目用 `vite-plugin-pwa`（底层 Workbox）一条龙解决。

```bash
npm i -D vite-plugin-pwa
```

## 2. PWA 三要素与安装条件

1. **HTTPS**：Service Worker 只在安全上下文注册（localhost 除外）。
2. **manifest.json**：应用名、图标、主题色、显示模式。
3. **Service Worker（SW）**：一段独立于页面的后台脚本，拦截网络请求并决定"缓存还是联网"。

可安装（触发浏览器安装提示）的硬性条件：HTTPS + 合法 manifest（含 `name`、192/512px 图标、`start_url`、`display: standalone`）+ 注册了带 `fetch` 处理的 SW。

```json
// public/manifest.webmanifest
{
  "name": "FANDEX 学习",
  "short_name": "FANDEX",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3367d6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## 3. vite-plugin-pwa 接入：声明式配置

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'prompt', // 新版本就绪时交给代码决定何时激活（见第 5 节）
      manifest: { /* 同上 manifest 内容，也可引用 public/manifest.webmanifest */ },
      workbox: {
        // 预缓存：构建时带哈希的静态资源全部进 install 缓存
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html', // SPA 路由刷新兜底
        runtimeCaching: [
          {
            // 运行时缓存：API 请求走"网络优先，失败回缓存"
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // 图片走"缓存优先，后台更新"
            urlPattern: /\.(?:png|jpg|webp)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'images' },
          },
        ],
      },
    }),
  ],
};
```

构建后插件自动生成 `manifest`、注入注册代码、产出带预缓存清单（precache manifest）的 `sw.js`——不需要手写 Service Worker。

## 4. Service Worker 生命周期与缓存策略

SW 的生命周期：**install**（预缓存下载）-> **waiting**（新版本待命，旧页面还开着）-> **activate**（接管、清理旧缓存）-> 之后持续拦截 `fetch`。理解"新版本要等所有旧标签页关闭才能激活"是处理更新提示的前提。

三大缓存策略按资源性质选择：

| 策略 | 行为 | 适用 |
| :--- | :--- | :--- |
| Cache First（缓存优先） | 有缓存绝不联网 | 带哈希的静态资源、字体 |
| Network First（网络优先） | 联网为主，失败回缓存 | API 数据、时效性内容 |
| Stale While Revalidate | 先回缓存，同时后台更新 | 图片、不敏感的静态内容 |

原则：**HTML/JS/CSS 走构建期预缓存**（文件名带哈希，内容即版本）；API 与用户数据走运行时缓存 + 明确的过期策略，避免"离线看到一周前的旧数据"被当成 bug。

## 5. 版本更新提示：不要让用户用到旧版本

`registerType: 'prompt'` 时，插件暴露注册结果，新 SW 进入 waiting 即可提示用户刷新：

```tsx
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function App() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [update, setUpdate] = useState<() => Promise<void>>(async () => {});

  useEffect(() => {
    // registerSW 返回更新控制器；onNeedRefresh 在新版本就绪时触发
    const pwaUpdate = registerSW({
      onNeedRefresh() {
        setUpdate(() => pwaUpdate ?? (async () => {}));
        setNeedRefresh(true);
      },
    });
    setUpdate(() => pwaUpdate);
  }, []);

  return (
    <>
      {/* 业务界面 ... */}
      {needRefresh && (
        <div role="alert">
          发现新版本
          <button onClick={() => update(true)}>刷新更新</button>
          {/* update(true) 让 waiting 的 SW skipWaiting 并 reload 页面 */}
        </div>
      )}
    </>
  );
}
```

预期行为：发布新版后，已打开的旧页面底部出现"发现新版本"提示条；点击后新 SW 立即接管并刷新页面，之后完全运行在新版本上。若选择 `registerType: 'autoUpdate'` 则自动完成上述过程，但用户可能丢失未保存的表单内容——交互型应用建议 prompt。

## 6. 离线体验设计

- **离线兜底页**：导航请求失败时回退到缓存的 `index.html`（SPA）或专门的离线页，提示"当前离线，展示的是缓存内容"。
- **写操作排队**：离线期间的表单提交不能丢弃；用 `background sync`（支持的浏览器）或本地队列（IndexedDB）+ 恢复联网后重放，并用 `navigator.onLine` 事件更新 UI 状态。
- **容量感知**：`navigator.storage.estimate()` 查询配额；缓存要有 `expiration` 上限（见第 3 节配置），防撑爆用户磁盘。

## 7. 常见陷阱

- **开发环境被 SW 缓存坑**：SW 在 localhost 也可能注册，改了代码没生效；开发时禁用 SW 或用无痕窗口，生产构建再验证。
- **旧 SW 残留**：改过缓存策略后用户仍命中旧规则——SW 更新慢且顽固；测试时在 DevTools Application 面板 Unregister + Clear storage，并理解 waiting 机制。
- **缓存了不该缓存的**：把 `/api/user` 这类个性化响应做了长缓存，导致看到别人的数据或自己的旧数据；运行时缓存只用于确定可缓存的路径，鉴权接口默认 NetworkFirst 甚至不缓存。
- **HTML 预缓存与路由兜底混淆**：SPA 必须 `navigateFallback: '/index.html'`，否则离线状态下刷新 `/orders/1` 直接 404。
- **iOS 差异**：Safari 支持基本 PWA 但无安装横幅（需用户手动"添加到主屏幕"）、推送与后台同步能力有限、存储配额更紧；特性检测而非假设全平台一致。
- **更新提示做不彻底**：只 `skipWaiting` 不 `reload`，页面里跑的还是旧 JS 而新缓存已生效，出现"半新半旧"的诡异状态；提示刷新时两件事一起做。

## 8. 小结

初学者要点：

- PWA = HTTPS + manifest + Service Worker；用 vite-plugin-pwa 配置化接入，不必手写 SW。
- 静态资源预缓存（构建期清单），API 按策略走运行时缓存：时效数据 NetworkFirst，图片 StaleWhileRevalidate。
- 新版本用 prompt 模式给用户"发现新版本，点击刷新"的提示，更新即 skipWaiting + reload。

进阶注意：

- SW 的 waiting 机制决定了"新版本激活需要用户配合"，理解生命周期才能处理更新与调试。
- 离线体验是产品设计的一部分：兜底页、写操作排队、配额感知，缺一环就是线上事故。
- 平台差异（尤其 iOS）靠特性检测兜底；缓存策略永远避开个性化接口。

## 速查

**manifest 最小集**

```json
{
  "name": "App", "short_name": "App",
  "start_url": "/", "display": "standalone",
  "icons": [{ "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }],
  "theme_color": "#3367d6", "background_color": "#ffffff"
}
```

**Workbox 三策略**

```ts
// CacheFirst：带哈希静态资源；NetworkFirst：API；StaleWhileRevalidate：图片
workbox: { runtimeCaching: [{ urlPattern: /\/api\//, handler: 'NetworkFirst' }] }
```

**注册与更新**

```tsx
const updateSW = registerSW({ onNeedRefresh: () => setNeedRefresh(true) });
// 用户点击"刷新更新"：await updateSW(true); // skipWaiting + reload
```

**安装条件速记**

HTTPS + manifest（name、192/512 图标、start_url、standalone）+ 带 fetch 的已注册 SW。
