---
order: 64
title: 'History-API'
module: html5
category: HTML5
difficulty: intermediate
description: 'History API（pushState、replaceState）'
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/Web工作线程
  - 'html5/Service-Worker与PWA'
  - html5/全双工通信
  - html5/实时通信
prerequisites:
  - html5/概述与核心特性
---

## 1. History API 概述

History API 允许 JavaScript 操作浏览器的历史记录栈，实现无刷新页面导航。

| 属性                | 说明                        |
| ------------------- | --------------------------- |
| `length`            | 历史记录栈中的条目数        |
| `scrollRestoration` | 滚动恢复策略（auto/manual） |
| `state`             | 当前历史条目的状态对象      |

## 2. 导航方法

```javascript
history.back(); // 后退
history.forward(); // 前进
history.go(-2); // 后退2步
```

### pushState 与 replaceState

```javascript
// 添加新历史条目
history.pushState({ page: 'about' }, '', '/about');

// 修改当前历史条目
history.replaceState({ page: 'home' }, '', '/home');
```

> **注意**：`pushState` 和 `replaceState` 不会触发 `popstate` 事件。

## 3. popstate 事件

```javascript
window.addEventListener('popstate', (event) => {
  if (event.state) renderPage(event.state.page);
});
```

## 4. SPA 路由实现

```javascript
class Router {
  constructor() {
    this.routes = {};
    window.addEventListener('popstate', () => this.resolve());
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (link && link.origin === location.origin) {
        e.preventDefault();
        this.navigate(link.pathname);
      }
    });
  }
  addRoute(path, handler) {
    this.routes[path] = handler;
    return this;
  }
  navigate(path, state = {}) {
    history.pushState(state, '', path);
    this.resolve();
  }
  resolve() {
    (this.routes[location.pathname] || this.routes['*'])?.(history.state);
  }
}
```

## 5. 注意事项

- URL 必须同源
- 状态对象有大小限制（约 640KB）
- SPA 需服务端配置所有路由返回 index.html
