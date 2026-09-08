---
order: 300
title: History API
module: 'html5'
category: 前端技术
difficulty: intermediate
description: History API（pushState、replaceState）
author: fanquanpp
updated: '2026-09-08'
related:
  - 'html5/029-ServiceWorkerPWA'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---

> 前置依赖：先接触过 SPA 路由概念（Vue Router 或 React Router）再读本篇。

## pushState 与 replaceState

**pushState 添加历史条目**
`history.pushState([state], [unused], [url])`
```javascript
// 添加新历史条目
history.pushState({ page: 'about' }, '', '/about');

// 不修改 URL
history.pushState({ page: 'about' }, '');

// 带 state 对象
history.pushState(
  { userId: 123, section: 'profile' },
  '',
  '/users/123/profile'
);

// 查询参数
history.pushState(null, '', '?page=2&sort=desc');

// 锚点
history.pushState(null, '', '#section1');
```

**replaceState 修改当前条目**
`history.replaceState([state], [unused], [url])`
```javascript
// 修改当前历史条目(不新增)
history.replaceState({ page: 'home' }, '', '/home');

// 更新 state 但保留 URL
history.replaceState({ updated: true }, '');
```

**参数说明**

| 参数      | 说明                                              |
| --------- | ------------------------------------------------- |
| `state`   | 状态对象(任意可序列化数据,最大约 640KB)         |
| `unused`  | 历史保留参数,建议传 `''`                          |
| `url`     | 新 URL(必须同源,可相对路径)                     |

> **注意**:`pushState` 和 `replaceState` 不会触发 `popstate` 事件,也不会加载新页面。

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
## History 对象属性

**history 属性**
```javascript
history.length;                 // 历史栈中的条目数
history.state;                  // 当前条目的状态对象
history.scrollRestoration;      // 滚动恢复策略 'auto' | 'manual'
```

**scrollRestoration 设置**
```javascript
// 自动恢复滚动位置(默认)
history.scrollRestoration = 'auto';

// 手动管理滚动
history.scrollRestoration = 'manual';

// 查询
if (history.scrollRestoration === 'manual') {
  // 手动恢复
  window.scrollTo(0, savedScrollY);
}
```

---

## 导航方法

**back / forward / go**
```javascript
history.back();       // 后退一页
history.forward();    // 前进一页
history.go(-2);       // 后退 2 步
history.go(1);        // 前进 1 步
history.go(0);        // 刷新当前页
```

| 方法         | 说明               |
| ------------ | ------------------ |
| `back()`     | 等价于 `go(-1)`    |
| `forward()`  | 等价于 `go(1)`     |
| `go(n)`      | 前进/后退 n 步     |

---

## popstate 事件

**监听前进/后退**
```javascript
window.addEventListener('popstate', (event) => {
  console.log('state:', event.state); // 历史条目的 state 对象
  if (event.state) {
    renderPage(event.state.page);
  }
});
```

**触发 popstate 的操作**
- 浏览器后退按钮
- 浏览器前进按钮
- `history.back()` / `history.forward()` / `history.go()`
- 点击带 `#` 锚点链接(同源)

**手动触发(测试用)**
```javascript
// 不会触发 popstate
history.pushState({ page: 'test' }, '', '/test');

// 触发 popstate 事件
window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
```

---

## hashchange 事件

**URL 锚点变化**
```javascript
window.addEventListener('hashchange', (event) => {
  console.log('旧 hash:', event.oldURL);
  console.log('新 hash:', event.newURL);
  console.log('当前 hash:', location.hash);
});

// 通过修改 hash 触发
location.hash = 'section2';
```

---

## SPA 路由实现

**HashRouter 哈希路由**
```javascript
class HashRouter {
  constructor() {
    this.routes = {};
    window.addEventListener('hashchange', () => this.resolve());
    window.addEventListener('load', () => this.resolve());
  }

  addRoute(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  navigate(path) {
    location.hash = path;
  }

  resolve() {
    const path = location.hash.slice(1) || '/';
    (this.routes[path] || this.routes['*'])?.();
  }
}

// 使用
const router = new HashRouter();
router
  .addRoute('/', () => renderHome())
  .addRoute('/about', () => renderAbout())
  .addRoute('/contact', () => renderContact());

// 导航
router.navigate('/about'); // URL 变为 #/about
```

**HistoryRouter History API 路由**
```javascript
class HistoryRouter {
  constructor() {
    this.routes = {};
    window.addEventListener('popstate', () => this.resolve());

    // 拦截链接点击
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
    const path = location.pathname;
    (this.routes[path] || this.routes['*'])?.(history.state);
  }
}

// 使用
const router = new HistoryRouter();
router
  .addRoute('/', () => renderHome())
  .addRoute('/users', () => renderUsers())
  .addRoute('/users/:id', () => renderUserDetail());
```

---

## URL 对象操作

**URL 解析**
```javascript
const url = new URL('https://example.com/path?name=Alice&age=30#section');

url.protocol; // 'https:'
url.host;     // 'example.com'
url.hostname; // 'example.com'
url.port;     // ''
url.pathname; // '/path'
url.search;   // '?name=Alice&age=30'
url.hash;     // '#section'
url.origin;   // 'https://example.com'
```

**URLSearchParams 查询参数**
```javascript
const params = new URLSearchParams('?name=Alice&age=30');

params.get('name');      // 'Alice'
params.getAll('tag');    // 数组
params.has('age');       // true
params.set('age', '25'); // 修改
params.append('tag', 'a'); // 添加
params.delete('name');   // 删除
params.toString();       // 'age=25&tag=a'

// 遍历
for (const [key, value] of params) {
  console.log(key, value);
}
```

**修改当前 URL 参数**
```javascript
const url = new URL(location.href);
url.searchParams.set('page', '2');
url.searchParams.delete('filter');
history.pushState(null, '', url.toString());
```

---

## 注意事项

**同源策略**
```javascript
// 错误:跨域 URL
history.pushState(null, '', 'https://other.com/page'); // 抛出 SecurityError

// 正确:同源 URL
history.pushState(null, '', '/page');
history.pushState(null, '', location.origin + '/page');
```

**state 大小限制**
```javascript
// 状态对象最大约 640KB(序列化后)
history.pushState({ data: 'large data...' }, '', '/page');

// 推荐用 sessionStorage / IndexedDB 存储大对象
sessionStorage.setItem('pageState', JSON.stringify(largeData));
history.pushState({ storageKey: 'pageState' }, '', '/page');
```

**服务端配置**
```javascript
// SPA 所有路由需服务端返回 index.html
// Nginx 配置示例:
// location / {
//   try_files $uri $uri/ /index.html;
// }
```

## 动手试试

### 入门版（必做）

1. 写三个按钮：跳转 `/page1`、`/page2`、返回上一页，分别用 `pushState` 和 `back()` 实现；
2. 监听 `popstate`，在页面显示当前路径；
3. 用 `replaceState` 把当前路径替换为 `/updated`，观察后退行为与 `pushState` 的差异。

### 进阶版（选做）

1. 实现一个 10 行的迷你路由：点击站内链接切换“首页/关于/联系”三个视图；
2. 用 `URLSearchParams` 实现分页参数 `?page=1` 的读写；
3. 对比 hash 路由与 history 路由在“直接刷新/分享链接”时的行为差异。

## 核心知识点

> 一句话记住 History API：`pushState` 加条目，`replaceState` 换当前；`popstate` 响应前进后退，路由刷新靠 JS 重渲染。

- `pushState(state, '', url)` 新增历史条目，不刷新页面；
- `replaceState` 替换当前条目，适合状态保存；
- `popstate` 在前进/后退时触发，读取 `event.state` 恢复页面；
- `back()`/`forward()`/`go(n)` 操作历史栈；
- `pushState` 要求同源 URL，不触发 `popstate`；
- hashchange 是更简单的替代方案，适合无需服务器配置的场景。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 刷新后 404 | history 路由刷新时服务器无对应文件 | 服务器配置 SPA fallback 到 index.html |
| 忘记监听 `popstate` | 前进后退页面不更新 | 路由初始化时注册 `popstate` |
| 站外链接被拦截 | 误拦截外部跳转 | 校验 `link.origin === location.origin` |
| state 存超大对象 | 超过 640KB 抛异常 | 只存 ID 等轻量信息，数据放 Store/IndexedDB |
| 用 hash 存业务状态 | URL 变脏且与锚点冲突 | 业务状态用 history 模式或查询参数 |
| 忽略滚动恢复 | 后退后位置丢失 | 配合 `scrollRestoration` 或手动恢复 |

## 扩展学习

- 路由框架：Vue Router / React Router 的 history 模式配置；
- 前端路由原理：`javascript/039-ModuleDynamicImportCodeSplitting` 与路由懒加载；
- URL 标准：`javascript/011-Regex` 或 WHATWG URL 规范；
- 服务器配置：Nginx `try_files` 的 SPA fallback 写法。
