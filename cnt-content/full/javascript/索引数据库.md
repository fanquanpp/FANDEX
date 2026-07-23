---
order: 64
title: 索引数据库
module: javascript
category: JavaScript
tags:
  - JavaScript
  - IndexedDB
  - NoSQL
  - 浏览器存储
  - 事务
  - 索引
  - 离线优先
difficulty: advanced
description: 浏览器端事务型 NoSQL 数据库的形式语义、事务模型、索引机制与生产级工程实践
author: fanquanpp
updated: '2026-07-20'
related:
  - javascript/Web存储API
  - javascript/Promise与async
  - javascript/迭代器帮助器
  - javascript/ServiceWorker
  - javascript/网络请求API
prerequisites:
  - javascript/语法速查
  - javascript/Promise与async
  - javascript/Web存储API
learningObjectives:
  - '{''remember'': ''复述 IndexedDB 的核心特性（事务型、NoSQL、异步、同源隔离）、容量限制、API 形式与标准化历程''}'
  - '{''understand'': ''解释 IndexedDB 的事务模型（ACID、隔离级别）、对象存储与索引结构（B+ 树）、游标机制与版本升级流程''}'
  - '{''apply'': ''编写生产级 IndexedDB 封装库，包括 Promise 化、事务抽象、索引管理、批量操作、错误处理与数据迁移''}'
  - '{''analyze'': ''对比 IndexedDB 与 localStorage、SQL 数据库、其他 NoSQL 在容量、性能、查询能力、事务支持上的差异''}'
  - '{''evaluate'': ''评估 IndexedDB 在离线优先应用、大数据存储、复杂数据查询场景下的适用性，给出架构决策依据''}'
  - '{''create'': ''设计基于 IndexedDB 的离线优先应用架构，结合 Service Worker、同步策略、冲突解决机制''}'
exercises:
  - id: ex-indexeddb-01
    type: fill-blank
    cognitiveLevel: remember
    question: IndexedDB 是一种 ______ 型数据库，所有读写操作必须在 ______ 中执行，且 API 为 ______ 以避免阻塞主线程。
    hint: 类型为 NoSQL/事务型；操作须在事务中；API 为异步
    answer: NoSQL/事务,事务,异步
    answers:
      - NoSQL/事务
      - 事务
      - 异步
    blankCount: 3
    caseSensitive: false
    difficulty: 1
    estimatedTime: 2
  - id: ex-indexeddb-02
    type: fill-blank
    cognitiveLevel: understand
    question: IndexedDB 使用 ______ 事件触发 schema 升级，通过 ______ 方法创建对象存储，使用 ______ 方法创建索引；事务的隔离级别默认为 ______。
    hint: 事件名 onupgradeneeded；方法 createObjectStore / createIndex；隔离级别基于读写锁
    answer: onupgradeneeded,createObjectStore,createIndex,readwrite/readonly
    answers:
      - onupgradeneeded
      - createObjectStore
      - createIndex
      - readwrite/readonly
    blankCount: 4
    caseSensitive: false
    difficulty: 3
    estimatedTime: 4
  - id: ex-indexeddb-03
    type: choice
    cognitiveLevel: understand
    question: 关于 IndexedDB 事务的描述，下列哪项是错误的？
    options:
      - 事务在没有活跃请求后自动提交，无需显式 commit
      - readwrite 事务按作用域对象存储的字母顺序排序获取锁
      - 同一事务中多个对象存储的操作共享同一个事务上下文
      - readonly 事务与 readwrite 事务可同时访问同一对象存储
    correctIndex: 3
    multiple: false
    difficulty: 3
    explanation: readonly 事务可与 readwrite 事务同时访问同一对象存储，但 readwrite 事务之间必须串行。IndexedDB 的事务锁粒度基于对象存储而非行，遵循「readwrite 事务按作用域排序」规则以避免死锁。
    answer: D
  - id: ex-indexeddb-04
    type: choice
    cognitiveLevel: analyze
    question: 在以下场景中，哪种存储机制最不合适？
    options:
      - 离线邮件客户端缓存数千封邮件正文 —— IndexedDB
      - 用户主题偏好（明/暗模式）—— localStorage
      - 实时聊天应用的离线消息队列与索引查询 —— IndexedDB
      - 频繁更新的股票实时价格（每秒数百次小数据写入）—— IndexedDB
    correctIndex: 3
    multiple: false
    difficulty: 4
    explanation: IndexedDB 每次写入都需创建事务，存在固定开销，不适合每秒数百次的小数据高频写入。对于此类场景，应使用内存缓冲批量写入（攒批后一次性 commit），或考虑 localStorage + 内存映射。其他三项场景与对应存储机制匹配合理。
    answer: D
  - id: ex-indexeddb-05
    type: code-fix
    cognitiveLevel: apply
    question: 以下 IndexedDB 数据读取函数存在缺陷，无法正确返回结果。请修复。
    buggyCode: |
      function getUser(db, id) {
        const tx = db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        const request = store.get(id);
        return request.result;
      }
    fixedCode: |
      function getUser(db, id) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction('users', 'readonly');
          const store = tx.objectStore('users');
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
      // 使用示例
      const user = await getUser(db, 1);
    errorDescription: 原代码同步返回 request.result，但 IndexedDB 是异步 API，request.result 在 request.onsuccess 触发前为 undefined。需用 Promise 封装，在 onsuccess 回调中 resolve 结果。
    language: javascript
    answer: 用 Promise 封装异步结果
    difficulty: 2
    estimatedTime: 4
  - id: ex-indexeddb-06
    type: code-fix
    cognitiveLevel: evaluate
    question: 以下事务批量插入函数在大量数据时性能极差，且可能丢失数据。请修复。
    buggyCode: |
      async function bulkInsert(db, storeName, items) {
        for (const item of items) {
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).add(item);
        }
      }
    fixedCode: |
      async function bulkInsert(db, storeName, items, batchSize = 1000) {
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
            for (const item of batch) {
              store.add(item);
            }
          });
        }
      }
    errorDescription: 原实现为每条数据创建独立事务，每事务有固定开销（约 1-5ms），10000 条数据需 10-50 秒。修复后使用单事务批量插入，并按 batchSize 分片避免事务过长被浏览器中止；同时等待 tx.oncomplete 确保数据落盘。
    language: javascript
    answer: 单事务批量插入并分片
    difficulty: 4
    estimatedTime: 8
  - id: ex-indexeddb-07
    type: open-ended
    cognitiveLevel: create
    question: 你正在设计一个支持离线编辑与跨设备同步的笔记应用，要求：(1) 离线时所有编辑即时保存；(2) 网络恢复后增量同步；(3) 冲突检测与解决；(4) 历史版本可追溯；(5) 全文搜索；(6) 多端登录状态隔离。请论述如何使用 IndexedDB 设计数据 schema、事务策略、同步队列、冲突解决算法、索引设计、存储配额管理。给出完整架构设计与关键代码。
    keyPoints:
      - 设计 notes / pendingOps / revisions / syncMeta 四个对象存储
      - 使用 syncStatus 字段标记同步状态（pending/synced/conflict）
      - 给出 LWW（Last-Write-Wins）与 CRDT 两种冲突解决策略的权衡
      - 设计多字段索引（updatedAt、userId、tags）支持复杂查询
      - 使用 IDBKeyRange 与游标实现分页与全文搜索
      - 处理存储配额检测、自动清理旧版本、数据压缩策略
    answer: 开放性论述题，需覆盖上述关键点
    minWords: 600
    difficulty: 5
    estimatedTime: 40
references:
  - type: standard
    authors:
      - Nikhil Marathe
      - Jonas Sicking
    year: 2026
    title: 'Indexed Database API 3.0'
    venue: W3C
    url: https://www.w3.org/TR/IndexedDB-3/
  - type: standard
    authors:
      - Nikhil Marathe
    year: 2015
    title: 'Indexed Database API 1.0 - W3C Recommendation'
    venue: W3C
    url: https://www.w3.org/TR/2015/REC-IndexedDB-20150108/
  - type: conference
    authors:
      - Jonas Sicking
    year: 2010
    title: 'IndexedDB Proposal: Async API and Rationale'
    venue: W3C WebApps Working Group
    url: https://www.w3.org/TR/IndexedDB/
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
      - Eric Freeman
      - Elisabeth Robson
    year: 2014
    title: 'Head First JavaScript Programming'
    venue: O'Reilly Media
    pages: '1-700'
  - type: journal
    authors:
      - Theo Härder
      - Andreas Reuter
    year: 1983
    title: 'Principles of Transaction-Oriented Database Recovery'
    venue: ACM Computing Surveys
    volume: 15
    issue: 4
    pages: '287-317'
    doi: 10.1145/289.291
  - type: book
    authors:
      - Raghu Ramakrishnan
      - Johannes Gehrke
    year: 2003
    title: 'Database Management Systems (3rd Edition)'
    venue: McGraw-Hill
    pages: '1-1064'
  - type: documentation
    authors:
      - MDN Web Docs
    year: 2025
    title: 'IndexedDB API'
    venue: Mozilla Developer Network
    url: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
  - type: website
    authors:
      - Jake Archibald
    year: 2015
    title: 'IndexedDB: A Database in Your Browser'
    venue: web.dev
    url: https://web.dev/articles/indexeddb
    accessedDate: '2026-07-20'
etymology:
  - term: 索引数据库
    english: Indexed Database API
    origin: 由 Oracle 的 Nikhil Marathe 与 Mozilla 的 Jonas Sicking 主导设计，2010 年发布草案，2015 年成为 W3C 推荐标准。"Indexed" 强调其索引查询能力，区别于简单的键值存储（localStorage）；"Database" 表明其具备事务、索引、游标等完整数据库特性
  - term: 事务
    english: Transaction
    origin: '源于数据库理论，由 Jim Gray 在 1970 年代系统化。ACID（原子性、一致性、隔离性、持久性）特性由 Härder 与 Reuter 在 1983 年的论文《Principles of Transaction-Oriented Database Recovery》中正式定义（DOI: 10.1145/289.291）'
  - term: 对象存储
    english: Object Store
    origin: 借鉴自对象数据库（Object-Oriented Database）概念，1970 年代由 Malcolm Atkinson 等提出。IndexedDB 中的对象存储类似 SQL 数据库中的表，但无固定 schema，存储任意结构化对象
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
estimatedReadingTime: 55
---

# 索引数据库（IndexedDB）

## 0. 学习导言

> 「IndexedDB 是浏览器从『键值存储』迈向『真正数据库』的关键跃迁。它为 Web 应用提供了事务、索引、游标、范围查询等完整数据库能力，使离线优先（offline-first）应用成为可能。掌握 IndexedDB，你就能在浏览器中构建出不输原生应用的复杂数据层。」
>
> —— Jake Archibald, Google Chrome 团队, 2015

本篇文档面向已掌握 JavaScript 异步编程（Promise、async/await）与 Web 存储基础（localStorage）的开发者，深入讲解 **IndexedDB**——浏览器内置的事务型 NoSQL 数据库。IndexedDB 提供了远超 localStorage 的存储容量（数百 MB 到数 GB）、丰富的查询能力（索引、游标、范围查询）与 ACID 事务保证，是构建离线优先 PWA 应用的核心基石。

完成本篇学习后，你将能够：

1. 准确描述 IndexedDB 的事务模型、对象存储、索引结构、游标机制与版本管理；
2. 编写生产级 IndexedDB 封装库，包括 Promise 化、批量操作、事务抽象、错误处理；
3. 对比 IndexedDB 与 localStorage、SQL 数据库、其他 NoSQL 的差异，识别适用场景；
4. 评估高频写入、大数据存储、复杂查询场景下的性能与架构决策；
5. 设计基于 IndexedDB 的离线优先应用架构，结合 Service Worker 与同步策略；
6. 处理数据迁移、版本升级、存储配额、跨标签页协调等工程化问题。

---

## 1. 学习目标（Bloom 分类法）

本篇严格遵循 Bloom 修订版认知层次框架（Anderson & Krathwohl, 2001），按由低到高六个层次组织学习目标：

| Bloom 层次 | 学习目标 | 对应章节 |
| ---------- | -------- | -------- |
| Remember（记忆） | 复述 IndexedDB 的特性、容量、API 形式与标准化历程 | 第 2 章 |
| Understand（理解） | 解释事务模型、对象存储、索引结构、游标机制 | 第 3-7 章 |
| Apply（应用） | 编写 Promise 封装、批量操作、索引查询、数据迁移 | 第 5-9 章 |
| Analyze（分析） | 对比各存储机制差异，识别适用场景 | 第 10 章 |
| Evaluate（评价） | 评估性能开销、架构选型、同步策略 | 第 12 章 |
| Create（创造） | 设计离线优先应用架构、同步队列、冲突解决 | 第 15 章 |

---

## 2. 历史动机

### 2.1 IndexedDB 演进时间线

IndexedDB 的诞生是 Web 平台从「文档展示」迈向「应用平台」的关键一步，经历了长期的标准化演进：

| 年份 | 事件 | 关键人物/组织 |
| ---- | ---- | -------------- |
| 2007 | Web SQL Database 提案（基于 SQLite） | W3C |
| 2009 | Web SQL 在 Safari/Chrome 实现，但遭 Mozilla 反对 | Apple, Google |
| 2010 | IndexedDB 草案发布，Oracle 与 Mozilla 主导 | Nikhil Marathe, Jonas Sicking |
| 2011 | Chrome 11 实现 IndexedDB | Google |
| 2012 | Firefox 10 完整支持 IndexedDB | Mozilla |
| 2014 | IE 10/Edge 实现 IndexedDB（带前缀 msIndexedDB） | Microsoft |
| 2015 | IndexedDB 1.0 成为 W3C 推荐标准 | W3C |
| 2015 | Safari 10 终于支持 IndexedDB（最后主流浏览器） | Apple |
| 2017 | IndexedDB 2.0 推荐，支持 binary keys、getKey() | W3C |
| 2018 | navigator.storage.estimate() 提供配额查询 | W3C |
| 2020 | IndexedDB 3.0 草案，引入 Promise API | W3C |
| 2023 | Chrome 支持 IndexedDB 观察 API（observe()） | Google |
| 2025 | Safari 17 全面支持 IndexedDB 3.0 草案 | Apple |
| 2026 | IndexedDB 3.0 推荐标准，原生 Promise API 落地 | W3C |

### 2.2 Web SQL Database 的失败教训

在 IndexedDB 之前，W3C 曾于 2009 年标准化 **Web SQL Database**——一个基于 SQLite 的浏览器 SQL 数据库。该规范最终于 2010 年被废弃，原因包括：

```javascript
// Web SQL Database（已废弃）的 API 风格
const db = openDatabase('mydb', '1.0', 'My Database', 2 * 1024 * 1024);
db.transaction((tx) => {
  tx.executeSql('CREATE TABLE users (id, name)');
  tx.executeSql('INSERT INTO users VALUES (?, ?)', [1, 'Alice']);
  tx.executeSql('SELECT * FROM users', [], (tx, result) => {
    console.log(result.rows);
  });
});
```

**废弃原因：**

1. **标准化困境**：Web SQL 依赖 SQLite 实现，但 SQLite 并非开放标准，W3C 无法规范 SQL 方言
2. **Mozilla 拒绝实现**：Mozilla 认为 SQL 在浏览器中过于复杂，且 SQLite 的 GPL 许可证与 Mozilla 不兼容
3. **安全风险**：SQL 注入风险、动态 schema 变更难以控制
4. **API 设计问题**：回调地狱、错误处理繁琐、缺乏类型安全

### 2.3 IndexedDB 的设计哲学

为吸取 Web SQL 的教训，IndexedDB 采用了一套全新的设计哲学：

- **NoSQL 而非 SQL**：使用对象存储（key-value）而非表，避免 SQL 方言标准化困境
- **事务型而非直接执行**：所有操作必须在事务中，保证 ACID 特性
- **异步而非同步**：所有 API 异步，避免阻塞主线程
- **事件驱动而非回调**：使用 IDBRequest 与事件监听，提供更灵活的错误处理
- **同源策略隔离**：每个源有独立的 IndexedDB 数据库集，跨源访问被禁止
- **支持索引与游标**：弥补 NoSQL 查询能力弱的短板

### 2.4 关键人物与原始规范

IndexedDB 规范的奠基者包括：

- **Jonas Sicking**（1978-）：Mozilla 的核心工程师，IndexedDB 规范的主导者。他坚定反对 Web SQL Database，主张设计一个事务型 NoSQL 数据库，使浏览器具备真正的数据持久化能力。 Jonas 还主导了 FileReader API、Blob API 等 Web 平台 API 设计。

- **Nikhil Marathe**：Oracle 工程师，IndexedDB 规范的联合作者。他将 Oracle 在数据库领域的深厚经验带入 IndexedDB 设计，特别是事务隔离级别与锁机制。

- **Jim Gray**（1944-2007）：图灵奖得主，事务处理系统的奠基者。他在 1970 年代系统化了 ACID 事务概念，其理论成果直接影响了 IndexedDB 的事务模型设计。

- **Theo Härder 与 Andreas Reuter**：1983 年发表《Principles of Transaction-Oriented Database Recovery》（DOI: `10.1145/289.291`），首次正式定义 ACID 概念，是所有事务型数据库（包括 IndexedDB）的理论基础。

---

## 3. 形式化定义

### 3.1 数据库与对象存储

IndexedDB 数据库是一个由同源策略隔离的命名容器，内部包含若干**对象存储（Object Store）**与**索引（Index）**。

**定义 3.1（数据库）**：数据库 $D$ 是一个三元组：

$$D = (S, I, V)$$

其中 $S$ 是对象存储的集合，$I$ 是索引的集合，$V \in \mathbb{N}^+$ 是数据库的版本号（schema 版本）。

**定义 3.2（对象存储）**：对象存储 $s \in S$ 是一个键值映射：

$$s: K \rightarrow V$$

其中 $K$ 是键空间（string、number、Date、ArrayBuffer 或上述类型的数组），$V$ 是值空间（任意可结构化克隆的 JavaScript 值）。

**定义 3.3（键路径）**：键路径 $kp$ 是一个字符串或字符串数组，指定从对象中提取主键的路径。例如 `kp = 'id'` 表示 $s$ 中每个对象的 `id` 字段作为主键；`kp = ['user', 'id']` 表示嵌套路径。

### 3.2 事务的 ACID 特性

IndexedDB 事务严格遵循 ACID 特性（Härder & Reuter, 1983）：

| 特性 | 英文 | IndexedDB 实现 |
| ---- | ---- | -------------- |
| 原子性 | Atomicity | 事务内所有操作要么全部成功，要么全部回滚（abort） |
| 一致性 | Consistency | 事务完成后数据库满足所有约束（如唯一索引） |
| 隔离性 | Isolation | readwrite 事务之间串行，readonly 事务可并发 |
| 持久性 | Durability | 事务 oncomplete 后数据已持久化到磁盘 |

**形式化定义**：设 $T_1, T_2$ 是两个 readwrite 事务，作用于对象存储集合 $\text{scope}(T_1), \text{scope}(T_2)$，则：

$$\text{scope}(T_1) \cap \text{scope}(T_2) \neq \emptyset \implies T_1 \text{ 与 } T_2 \text{ 串行执行}$$

为避免死锁，IndexedDB 规定 readwrite 事务按其作用域对象存储的**字典序**排序获取锁。

### 3.3 索引的 B+ 树结构

IndexedDB 索引采用 **B+ 树**结构，其查询复杂度为对数级：

$$T_{\text{lookup}}(n) = O(\log_m n)$$

其中 $n$ 是记录数，$m$ 是 B+ 树的阶（通常等于磁盘页大小除以键大小）。

**对比线性扫描**：

| 查询方式 | 复杂度 | 1 万条记录 | 100 万条记录 |
| -------- | ------ | ---------- | ------------ |
| 全表扫描（游标遍历） | $O(n)$ | ~10ms | ~1000ms |
| 索引查找 | $O(\log_m n)$ | ~0.1ms | ~0.2ms |
| 索引范围查询 | $O(\log_m n + k)$ | ~1ms | ~10ms |

其中 $k$ 是结果集大小。

### 3.4 同源策略与存储隔离

IndexedDB 遵循**同源策略（Same-Origin Policy）**：

$$\text{Origin} = (\text{scheme}, \text{host}, \text{port})$$

不同源的页面无法访问对方的 IndexedDB 数据库。这意味着 `https://a.com` 与 `https://b.com` 的 IndexedDB 完全隔离，即使两者在同一浏览器中。

**例外**：`file://` 协议的源被视为不透明源，IndexedDB 在 `file://` 下行为不一致，建议避免使用。

### 3.5 存储容量模型

IndexedDB 的容量受浏览器配额管理：

$$\text{Quota}_{\text{total}} = \min(\text{disk}_{\text{available}} \times \alpha, \text{browser}_{\text{limit}})$$

其中 $\alpha$ 因浏览器而异（Chrome 为 60%，Firefox 为 50%，Safari 为 1GB/源）。

通过 `navigator.storage.estimate()` 可查询当前配额与使用量：

```javascript
const estimate = await navigator.storage.estimate();
console.log(`已用: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB`);
console.log(`配额: ${(estimate.quota / 1024 / 1024).toFixed(2)} MB`);
console.log(`使用率: ${((estimate.usage / estimate.quota) * 100).toFixed(2)}%`);
```

---

## 4. 数据库连接与版本管理

### 4.1 打开数据库

IndexedDB 通过 `indexedDB.open()` 打开或创建数据库：

```javascript
// 打开数据库（不存在则创建），版本号默认为 1
const request = indexedDB.open('MyDatabase', 1);

// 数据库不存在或版本号提升时触发（用于初始化 schema）
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  console.log(`升级到版本 ${event.newVersion}（从 ${event.oldVersion}）`);

  // 创建对象存储与索引
  if (!db.objectStoreNames.contains('users')) {
    const store = db.createObjectStore('users', { keyPath: 'id' });
    store.createIndex('name', 'name', { unique: false });
    store.createIndex('email', 'email', { unique: true });
  }
};

// 成功打开数据库
request.onsuccess = (event) => {
  const db = event.target.result;
  console.log('数据库已打开:', db.name, db.version);
};

// 打开失败
request.onerror = (event) => {
  console.error('打开数据库失败:', event.target.error);
};

// 数据库被阻塞（其他标签页持有连接未关闭）
request.onblocked = (event) => {
  console.warn('数据库升级被阻塞，请关闭其他标签页');
};
```

### 4.2 版本升级流程

版本升级是 IndexedDB schema 演进的核心机制：

```javascript
/**
 * 数据库升级示例：从 v1 升级到 v3
 * 演示如何处理多版本迁移
 */
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const tx = event.target.transaction;
  const oldVersion = event.oldVersion;

  // 版本 1：初始 schema
  if (oldVersion < 1) {
    const userStore = db.createObjectStore('users', { keyPath: 'id' });
    userStore.createIndex('email', 'email', { unique: true });
  }

  // 版本 2：添加 orders 表
  if (oldVersion < 2) {
    const orderStore = db.createObjectStore('orders', { keyPath: 'orderId' });
    orderStore.createIndex('userId', 'userId', { unique: false });
    orderStore.createIndex('createdAt', 'createdAt', { unique: false });
  }

  // 版本 3：为 users 添加 age 索引
  if (oldVersion < 3) {
    const userStore = tx.objectStore('users');
    userStore.createIndex('age', 'age', { unique: false });
  }
};
```

**关键规则：**

1. `onupgradeneeded` 是唯一能修改 schema（创建/删除对象存储与索引）的地方
2. 升级事务是隐式的 readwrite 事务，通过 `event.target.transaction` 获取
3. 必须处理 `onblocked` 事件——其他标签页持有的旧连接会阻塞升级

### 4.3 关闭数据库连接

```javascript
/**
 * 关闭数据库连接
 * 升级版本前必须关闭其他标签页的连接
 */
function closeDatabase(db) {
  if (db) {
    db.close();
    console.log('数据库连接已关闭');
  }
}

// 监听版本变化事件（其他标签页触发升级时）
db.onversionchange = (event) => {
  console.log('其他标签页请求升级数据库，关闭当前连接');
  event.target.close();
  // 提示用户刷新页面以加载新 schema
  alert('数据库已升级，请刷新页面');
};
```

### 4.4 删除数据库

```javascript
// 删除整个数据库
const deleteRequest = indexedDB.deleteDatabase('MyDatabase');
deleteRequest.onsuccess = () => console.log('数据库已删除');
deleteRequest.onerror = () => console.error('删除失败');
deleteRequest.onblocked = () => {
  console.warn('删除被阻塞，请关闭其他标签页');
};
```

---

## 5. 对象存储与索引

### 5.1 创建对象存储

```javascript
// 选项说明：
// - keyPath：主键路径（不设则使用 out-of-line keys）
// - autoIncrement：主键自增（仅当 keyPath 未设或为数字时有效）
const store1 = db.createObjectStore('users', { keyPath: 'id' });
const store2 = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
const store3 = db.createObjectStore('temp', { autoIncrement: true }); // out-of-line keys
```

### 5.2 创建索引

```javascript
/**
 * 创建索引
 * @param {string} name - 索引名称
 * @param {string|string[]} keyPath - 索引键路径
 * @param {object} options - { unique: boolean, multiEntry: boolean }
 */
store.createIndex('email', 'email', { unique: true }); // 唯一索引
store.createIndex('age', 'age', { unique: false }); // 普通索引
store.createIndex('tags', 'tags', { multiEntry: true }); // 多值索引（数组每个元素都建索引）
store.createIndex('name_age', ['lastName', 'age'], { unique: false }); // 复合索引
```

**multiEntry 索引示例：**

```javascript
// 假设有以下记录
store.add({ id: 1, name: 'Alice', tags: ['admin', 'editor'] });
store.add({ id: 2, name: 'Bob', tags: ['editor'] });
store.add({ id: 3, name: 'Charlie', tags: ['viewer'] });

// multiEntry 索引下，tags 索引会有以下条目：
// 'admin' -> [record 1]
// 'editor' -> [record 1, record 2]
// 'viewer' -> [record 3]

// 查询所有带 'editor' 标签的用户
const index = store.index('tags');
index.getAll('editor').onsuccess = (e) => {
  console.log(e.target.result); // [record 1, record 2]
};
```

### 5.3 删除对象存储与索引

```javascript
// 删除对象存储（仅在 onupgradeneeded 中可调用）
db.deleteObjectStore('temp');

// 删除索引（仅在 onupgradeneeded 中可调用）
store.deleteIndex('age');
```

---

## 6. 事务详解

### 6.1 事务的创建与作用域

```javascript
/**
 * 创建事务
 * @param {string|string[]} storeNames - 作用域对象存储
 * @param {string} mode - 'readonly'（默认）或 'readwrite'
 */
const tx = db.transaction(['users', 'orders'], 'readwrite');

// 事务生命周期
tx.oncomplete = () => console.log('事务提交完成');
tx.onerror = () => console.error('事务失败:', tx.error);
tx.onabort = () => console.warn('事务被中止');

// 主动中止事务（触发回滚）
tx.abort();
```

### 6.2 事务的自动提交机制

IndexedDB 事务在没有**活跃请求**时自动提交，这一机制常导致陷阱：

```javascript
// 陷阱：异步操作间事务已自动提交
const tx = db.transaction('users', 'readwrite');
const store = tx.objectStore('users');

// 第一个请求
store.add({ id: 1, name: 'Alice' });

// 异步等待（如 fetch），此时事务无活跃请求，自动提交！
await fetch('/api/validate').then(r => r.json());

// 第二个请求 —— 报错：事务已 inactive
store.add({ id: 2, name: 'Bob' }); // InvalidStateError
```

**正确做法：**

```javascript
// 方案 1：所有请求一次性发出，不穿插异步等待
const tx = db.transaction('users', 'readwrite');
const store = tx.objectStore('users');
store.add({ id: 1, name: 'Alice' });
store.add({ id: 2, name: 'Bob' });
// 事务在所有请求完成后自动提交

// 方案 2：先完成异步操作，再开启事务
const validation = await fetch('/api/validate').then(r => r.json());
const tx = db.transaction('users', 'readwrite');
const store = tx.objectStore('users');
store.add({ id: 1, name: 'Alice', validated: validation.ok });
```

### 6.3 事务隔离级别

```javascript
// readonly 事务之间可并发
const tx1 = db.transaction('users', 'readonly');
const tx2 = db.transaction('users', 'readonly'); // 与 tx1 并发执行

// readwrite 事务之间串行
const tx3 = db.transaction('users', 'readwrite');
const tx4 = db.transaction('users', 'readwrite'); // 等待 tx3 完成后执行

// readwrite 与 readonly 可并发（但 readonly 可能读到旧数据）
const tx5 = db.transaction('users', 'readwrite');
const tx6 = db.transaction('users', 'readonly'); // 与 tx5 并发，读到 tx5 提交前的数据
```

### 6.4 跨对象存储事务

```javascript
// 在单个事务中操作多个对象存储，保证原子性
const tx = db.transaction(['users', 'orders'], 'readwrite');

try {
  const userStore = tx.objectStore('users');
  const orderStore = tx.objectStore('orders');

  // 扣减用户余额
  const getUserReq = userStore.get(userId);
  getUserReq.onsuccess = () => {
    const user = getUserReq.result;
    if (user.balance < orderAmount) {
      tx.abort(); // 余额不足，回滚整个事务
      return;
    }
    user.balance -= orderAmount;
    userStore.put(user);

    // 创建订单
    orderStore.add({
      orderId: generateOrderId(),
      userId,
      amount: orderAmount,
      createdAt: Date.now(),
    });
  };
} catch (e) {
  tx.abort();
}
```

---

## 7. CRUD 操作

### 7.1 增（add / put）

```javascript
const tx = db.transaction('users', 'readwrite');
const store = tx.objectStore('users');

// add：键已存在时报错
store.add({ id: 1, name: 'Alice', email: 'alice@example.com' });

// put：键已存在时覆盖
store.put({ id: 1, name: 'Alice Updated', email: 'alice@new.com' });

// out-of-line keys（无 keyPath 时）
store.add({ name: 'Bob' }, 100); // 显式指定键为 100
```

### 7.2 查（get / getAll）

```javascript
const tx = db.transaction('users', 'readonly');
const store = tx.objectStore('users');

// 按主键查询单条
store.get(1).onsuccess = (e) => {
  console.log(e.target.result); // { id: 1, name: 'Alice', ... }
};

// 获取全部记录
store.getAll().onsuccess = (e) => {
  console.log(e.target.result); // [所有用户]
};

// 限制结果数量
store.getAll(null, 10).onsuccess = (e) => {
  console.log(e.target.result); // 前 10 条
};

// 通过键范围查询
store.getAll(IDBKeyRange.bound(1, 100)).onsuccess = (e) => {
  console.log(e.target.result); // id 在 1-100 之间的用户
};

// 仅获取键（不获取值，性能更高）
store.getAllKeys().onsuccess = (e) => {
  console.log(e.target.result); // [1, 2, 3, ...]
};

// count
store.count().onsuccess = (e) => {
  console.log(`总记录数: ${e.target.result}`);
};
```

### 7.3 改（put）

```javascript
/**
 * 更新记录（必须先 get 再修改再 put，避免覆盖字段）
 */
async function updateUser(db, id, updates) {
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');

  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const user = getReq.result;
      if (!user) {
        reject(new Error(`User ${id} not found`));
        return;
      }
      Object.assign(user, updates, { updatedAt: Date.now() });
      store.put(user);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

### 7.4 删（delete / clear）

```javascript
// 按主键删除
store.delete(1);

// 清空整个对象存储
store.clear();

// 范围删除
store.delete(IDBKeyRange.bound(1, 100)); // 删除 id 1-100 的记录
```

---

## 8. 索引与查询

### 8.1 通过索引查询

```javascript
const tx = db.transaction('users', 'readonly');
const store = tx.objectStore('users');
const emailIndex = store.index('email');

// 按邮箱查询
emailIndex.get('alice@example.com').onsuccess = (e) => {
  console.log(e.target.result); // { id: 1, name: 'Alice', email: 'alice@example.com' }
};

// 按年龄范围查询
const ageIndex = store.index('age');
ageIndex.getAll(IDBKeyRange.bound(18, 65)).onsuccess = (e) => {
  console.log(e.target.result); // 年龄在 18-65 之间的用户
};

// 复合索引查询
const nameAgeIndex = store.index('name_age');
nameAgeIndex.get(['Smith', 30]).onsuccess = (e) => {
  console.log(e.target.result); // lastName='Smith' 且 age=30 的用户
};
```

### 8.2 IDBKeyRange 键范围

```javascript
// 精确匹配
IDBKeyRange.only(25);

// 下界（>= 18）
IDBKeyRange.lowerBound(18);

// 下界（> 18，开区间）
IDBKeyRange.lowerBound(18, true);

// 上界（<= 65）
IDBKeyRange.upperBound(65);

// 上界（< 65，开区间）
IDBKeyRange.upperBound(65, true);

// 闭区间 [18, 65]
IDBKeyRange.bound(18, 65);

// 开区间 (18, 65)
IDBKeyRange.bound(18, 65, true, true);

// 半开区间 [18, 65)
IDBKeyRange.bound(18, 65, false, true);
```

### 8.3 游标遍历

游标是 IndexedDB 处理大数据集的核心机制，支持分页、惰性遍历与条件过滤：

```javascript
const tx = db.transaction('users', 'readonly');
const store = tx.objectStore('users');

// 基本游标遍历
store.openCursor().onsuccess = (event) => {
  const cursor = event.target.result;
  if (cursor) {
    console.log(cursor.key, cursor.value);
    cursor.continue(); // 移动到下一条
  } else {
    console.log('遍历完成');
  }
};

// 倒序遍历
store.openCursor(null, 'prev').onsuccess = (event) => {
  const cursor = event.target.result;
  if (cursor) {
    console.log(cursor.key, cursor.value);
    cursor.continue();
  }
};

// 带键范围的游标
store.openCursor(IDBKeyRange.bound(1, 100)).onsuccess = (event) => {
  const cursor = event.target.result;
  if (cursor) {
    console.log(cursor.key);
    cursor.continue();
  }
};

// 仅遍历键（性能更高）
store.openKeyCursor().onsuccess = (event) => {
  const cursor = event.target.result;
  if (cursor) {
    console.log(cursor.key); // 不加载 value
    cursor.continue();
  }
};

// 游标前进（跳过 N 条）
store.openCursor().onsuccess = (event) => {
  const cursor = event.target.result;
  if (cursor) {
    console.log(cursor.key);
    cursor.advance(10); // 跳过接下来 10 条
  }
};

// 在索引上使用游标
const ageIndex = store.index('age');
ageIndex.openCursor(IDBKeyRange.bound(18, 65), 'next').onsuccess = (event) => {
  const cursor = event.target.result;
  if (cursor) {
    console.log(cursor.key, cursor.value); // key 是 age，value 是完整记录
    cursor.continue();
  }
};
```

### 8.4 分页实现

```javascript
/**
 * 基于 cursor.advance 的分页查询
 * @param {IDBDatabase} db - 数据库连接
 * @param {string} storeName - 对象存储名
 * @param {number} page - 页码（从 1 开始）
 * @param {number} pageSize - 每页大小
 * @returns {Promise<{items: Array, hasMore: boolean}>}
 */
function paginate(db, storeName, page, pageSize) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const items = [];
    let skipped = 0;
    let hasMore = false;
    const skipCount = (page - 1) * pageSize;

    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) {
        resolve({ items, hasMore: false });
        return;
      }
      if (skipped < skipCount) {
        skipped++;
        cursor.advance(1);
        return;
      }
      if (items.length < pageSize) {
        items.push(cursor.value);
        cursor.continue();
      } else {
        hasMore = true;
        resolve({ items, hasMore });
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

// 使用示例
const page1 = await paginate(db, 'users', 1, 20);
const page2 = await paginate(db, 'users', 2, 20);
```

---

## 9. Promise 封装与生产级工具库

### 9.1 基础 Promise 封装

```javascript
/**
 * 将 IDBRequest 包装为 Promise
 * @param {IDBRequest} request - IndexedDB 请求对象
 * @returns {Promise<any>}
 */
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 打开数据库并自动处理升级
 * @param {string} name - 数据库名
 * @param {number} version - 版本号
 * @param {Function} onUpgrade - 升级回调
 * @returns {Promise<IDBDatabase>}
 */
function openDB(name, version, onUpgrade) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const tx = event.target.transaction;
      onUpgrade(db, tx, event.oldVersion, event.newVersion);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('数据库升级被阻塞，请关闭其他标签页'));
  });
}
```

### 9.2 完整的 IndexedDB 工具类

```javascript
/**
 * 生产级 IndexedDB 封装库
 * 提供事务抽象、Promise 化 API、批量操作、错误处理
 */
class IndexedDBWrapper {
  constructor(name, version, upgradeCallback) {
    this.name = name;
    this.version = version;
    this.upgradeCallback = upgradeCallback;
    this.db = null;
  }

  /**
   * 初始化数据库连接
   */
  async init() {
    this.db = await openDB(this.name, this.version, this.upgradeCallback);
    this.db.onversionchange = () => {
      this.db.close();
      console.warn('数据库版本变化，连接已关闭');
    };
    return this;
  }

  /**
   * 在事务中执行操作
   * @param {string|string[]} stores - 对象存储名
   * @param {string} mode - 'readonly' 或 'readwrite'
   * @param {Function} fn - 操作函数，接收 tx 参数
   * @returns {Promise<any>}
   */
  async transaction(stores, mode, fn) {
    if (!this.db) throw new Error('数据库未初始化，请先调用 init()');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(stores, mode);
      let result;

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('事务被中止'));

      try {
        result = fn(tx);
      } catch (e) {
        tx.abort();
        reject(e);
      }
    });
  }

  /**
   * 插入单条记录
   */
  async add(storeName, value, key) {
    return this.transaction(storeName, 'readwrite', (tx) => {
      const request = tx.objectStore(storeName).add(value, key);
      return promisifyRequest(request);
    });
  }

  /**
   * 插入或更新单条记录
   */
  async put(storeName, value, key) {
    return this.transaction(storeName, 'readwrite', (tx) => {
      const request = tx.objectStore(storeName).put(value, key);
      return promisifyRequest(request);
    });
  }

  /**
   * 按主键查询
   */
  async get(storeName, key) {
    return this.transaction(storeName, 'readonly', (tx) => {
      return promisifyRequest(tx.objectStore(storeName).get(key));
    });
  }

  /**
   * 查询全部
   */
  async getAll(storeName, query, count) {
    return this.transaction(storeName, 'readonly', (tx) => {
      return promisifyRequest(tx.objectStore(storeName).getAll(query, count));
    });
  }

  /**
   * 按主键删除
   */
  async delete(storeName, key) {
    return this.transaction(storeName, 'readwrite', (tx) => {
      return promisifyRequest(tx.objectStore(storeName).delete(key));
    });
  }

  /**
   * 通过索引查询
   */
  async getByIndex(storeName, indexName, query) {
    return this.transaction(storeName, 'readonly', (tx) => {
      const index = tx.objectStore(storeName).index(indexName);
      return promisifyRequest(index.get(query));
    });
  }

  /**
   * 批量插入（高性能）
   * @param {string} storeName - 对象存储名
   * @param {Array} items - 待插入数组
   * @param {number} batchSize - 每批大小（默认 1000）
   * @returns {Promise<number>} 插入条数
   */
  async bulkAdd(storeName, items, batchSize = 1000) {
    let inserted = 0;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await this.transaction(storeName, 'readwrite', (tx) => {
        const store = tx.objectStore(storeName);
        for (const item of batch) {
          store.add(item);
        }
      });
      inserted += batch.length;
    }
    return inserted;
  }

  /**
   * 使用游标遍历（避免一次性加载全部）
   * @param {string} storeName - 对象存储名
   * @param {Function} callback - 处理每条记录的回调
   * @param {IDBKeyRange} query - 键范围
   * @param {string} direction - 'next' 或 'prev'
   */
  async forEach(storeName, callback, query = null, direction = 'next') {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const cursorReq = store.openCursor(query, direction);

      cursorReq.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor) {
          try {
            await callback(cursor.value, cursor.key);
            cursor.continue();
          } catch (e) {
            reject(e);
          }
        } else {
          tx.oncomplete = () => resolve();
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  }

  /**
   * 关闭数据库
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
```

### 9.3 使用示例

```javascript
// 初始化数据库
const db = new IndexedDBWrapper('AppDB', 1, (db, tx, oldV, newV) => {
  if (!db.objectStoreNames.contains('users')) {
    const store = db.createObjectStore('users', { keyPath: 'id' });
    store.createIndex('email', 'email', { unique: true });
    store.createIndex('age', 'age', { unique: false });
  }
});

await db.init();

// CRUD 操作
await db.add('users', { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 });
await db.put('users', { id: 1, name: 'Alice Updated', email: 'alice@new.com', age: 31 });
const user = await db.get('users', 1);
const byEmail = await db.getByIndex('users', 'email', 'alice@new.com');
await db.delete('users', 1);

// 批量插入
const users = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `User${i}`,
  email: `user${i}@example.com`,
  age: 20 + (i % 50),
}));
const inserted = await db.bulkAdd('users', users, 1000);
console.log(`已插入 ${inserted} 条`);

// 游标遍历
await db.forEach('users', (user, key) => {
  if (user.age > 30) console.log(user.name);
});
```

---

## 10. 对比分析

### 10.1 与其他浏览器存储机制对比

| 维度 | localStorage | sessionStorage | IndexedDB | Cache API |
| ---- | ------------ | -------------- | --------- | --------- |
| 容量 | 5-10MB | 5-10MB | 数百MB-数GB | 数百MB-数GB |
| API 形式 | 同步键值对 | 同步键值对 | 异步事务型 NoSQL | 异步键值对（Response） |
| 数据类型 | string | string | 任意结构化克隆值 | Response 对象 |
| 查询能力 | 按键查询 | 按键查询 | 索引、范围、游标 | 按键查询 |
| 事务支持 | 否 | 否 | 是（ACID） | 否 |
| 索引支持 | 否 | 否 | 是 | 否 |
| 异步 | 否（阻塞主线程） | 否 | 是 | 是 |
| 生命周期 | 永久 | 标签页关闭 | 永久 | 永久（需手动清理） |
| 适用场景 | 简单偏好 | 临时数据 | 大数据、复杂查询 | HTTP 资源缓存 |

### 10.2 与 SQL 数据库对比

| 维度 | IndexedDB | SQL（SQLite/MySQL） |
| ---- | --------- | ------------------- |
| 数据模型 | NoSQL（对象存储） | 关系型（表） |
| 查询语言 | JavaScript API | SQL |
| Schema | 动态（无强制） | 静态（DDL） |
| 事务 | ACID | ACID |
| 索引 | B+ 树 | B+ 树 |
| JOIN | 不支持（需手动） | 原生支持 |
| 聚合 | 不支持（需手动遍历） | GROUP BY、SUM 等 |
| 部署位置 | 浏览器内 | 服务器或本地进程 |
| 跨标签页 | 通过 storage 事件协调 | 需进程间通信 |

### 10.3 与其他 NoSQL 数据库对比

| 维度 | IndexedDB | MongoDB | Redis | PouchDB |
| ---- | --------- | ------- | ----- | ------- |
| 运行环境 | 浏览器 | 服务器 | 服务器 | 浏览器/Node |
| 数据格式 | 结构化克隆 | BSON | 多种 | JSON |
| 查询 | 索引+游标 | 丰富查询 | 键值+数据结构 | MapReduce |
| 同步 | 无 | 无 | 无 | CouchDB 同步协议 |
| 离线支持 | 原生 | 无 | 无 | 原生 |
| 容量 | 受浏览器配额 | 受磁盘 | 受内存 | 受 IndexedDB |

---

## 11. 常见陷阱

### 11.1 事务自动提交陷阱

```javascript
// 错误：异步等待导致事务已 inactive
async function buggyTransfer(db, fromId, toId, amount) {
  const tx = db.transaction(['accounts'], 'readwrite');
  const store = tx.objectStore('accounts');

  const from = await promisifyRequest(store.get(fromId));
  // 此时事务无活跃请求，自动提交！
  const to = await promisifyRequest(store.get(toId)); // InvalidStateError
}

// 正确：一次性发起所有请求
async function correctTransfer(db, fromId, toId, amount) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['accounts'], 'readwrite');
    const store = tx.objectStore('accounts');
    const fromReq = store.get(fromId);
    const toReq = store.get(toId);

    let from, to;
    fromReq.onsuccess = () => {
      from = fromReq.result;
      if (to) doTransfer();
    };
    toReq.onsuccess = () => {
      to = toReq.result;
      if (from) doTransfer();
    };

    function doTransfer() {
      if (from.balance < amount) {
        tx.abort();
        reject(new Error('余额不足'));
        return;
      }
      from.balance -= amount;
      to.balance += amount;
      store.put(from);
      store.put(to);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

### 11.2 索引不生效陷阱

```javascript
// 陷阱：在未建索引的字段上查询，只能全表扫描
const tx = db.transaction('users', 'readonly');
const store = tx.objectStore('users');

// 错误：试图用 store.index('nonExistent')
// store.index('nonExistent'); // 抛出 NotFoundError

// 正确：先检查索引是否存在
if (store.indexNames.contains('age')) {
  const ageIndex = store.index('age');
  ageIndex.getAll(IDBKeyRange.bound(18, 65));
} else {
  // 退化为全表扫描
  store.openCursor().onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      if (cursor.value.age >= 18 && cursor.value.age <= 65) {
        console.log(cursor.value);
      }
      cursor.continue();
    }
  };
}
```

### 11.3 版本升级阻塞陷阱

```javascript
// 陷阱：多个标签页打开同一应用时，升级被阻塞
// 标签页 A：db = await openDB('app', 2, ...)
// 标签页 B：仍持有 v1 连接，阻塞 A 的升级

// 正确：监听 onversionchange，主动关闭连接
db.onversionchange = () => {
  db.close();
  alert('应用已更新，请刷新页面');
};

// 同时处理 onblocked
const request = indexedDB.open('app', 2);
request.onblocked = () => {
  alert('请关闭其他标签页以完成升级');
};
```

### 11.4 嵌套事务陷阱

```javascript
// IndexedDB 不支持嵌套事务
// 错误：内层事务会被忽略
const tx1 = db.transaction('users', 'readwrite');
const tx2 = db.transaction('users', 'readwrite'); // 新事务，tx1 被自动提交！

// 正确：在单个事务内完成所有操作
const tx = db.transaction('users', 'readwrite');
const store = tx.objectStore('users');
store.add({ id: 1, name: 'Alice' });
store.add({ id: 2, name: 'Bob' });
```

### 11.5 存储配额超限

```javascript
// 陷阱：未监控配额，突然 QuotaExceededError
async function safeAdd(db, storeName, item) {
  try {
    await db.add(storeName, item);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // 处理配额超限
      const estimate = await navigator.storage.estimate();
      console.error(`配额超限：已用 ${estimate.usage} / ${estimate.quota}`);

      // 策略 1：清理旧数据
      await cleanupOldData(db, storeName);

      // 策略 2：请求持久化存储
      const persisted = await navigator.storage.persist();
      if (persisted) {
        console.log('已升级为持久化存储');
      }

      // 重试
      return db.add(storeName, item);
    }
    throw e;
  }
}
```

### 11.6 隐私模式限制

```javascript
// 隐私模式下 IndexedDB 可能不可用或容量为 0
function isIndexedDBAvailable() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('__test__', 1);
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        request.result.close();
        indexedDB.deleteDatabase('__test__');
        resolve(true);
      };
    } catch (e) {
      resolve(false);
    }
  });
}

if (!(await isIndexedDBAvailable())) {
  // 降级到 localStorage 或内存存储
  console.warn('IndexedDB 不可用，降级到内存存储');
}
```

---

## 12. 工程实践

### 12.1 数据库 Schema 设计原则

1. **主键选择**：优先使用稳定的唯一标识符（如 UUID），避免使用自增整数（多设备同步易冲突）
2. **索引按需创建**：每个索引都有存储与写入开销，只为常用查询字段建索引
3. **对象存储分域**：按业务领域划分（如 users、orders、products），避免单表过大
4. **预留扩展字段**：使用动态字段（如 `metadata: {}`）应对未来需求

### 12.2 TypeScript 类型支持

```typescript
/**
 * IndexedDB TypeScript 类型定义
 */
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  createdAt: number;
  updatedAt: number;
}

interface Order {
  orderId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed';
  createdAt: number;
}

// 数据库 Schema 类型
interface AppDBSchema {
  users: {
    key: string;
    value: User;
    indexes: {
      email: string;
      age: number;
      'createdAt': number;
    };
  };
  orders: {
    key: string;
    value: Order;
    indexes: {
      userId: string;
      status: string;
      createdAt: number;
    };
  };
}

// 类型安全的封装类
class TypedIndexedDB<Schemas> {
  // 类型安全的 get/put/delete 等方法
  async get<K extends keyof Schemas>(
    storeName: K,
    key: Schemas[K]['key']
  ): Promise<Schemas[K]['value'] | undefined> {
    // 实现...
    return undefined;
  }
}
```

### 12.3 数据迁移与版本升级

```javascript
/**
 * 生产级版本升级管理
 * 每个版本对应一个迁移函数，按顺序执行
 */
const migrations = {
  1: (db, tx) => {
    const users = db.createObjectStore('users', { keyPath: 'id' });
    users.createIndex('email', 'email', { unique: true });
  },
  2: (db, tx) => {
    const orders = db.createObjectStore('orders', { keyPath: 'orderId' });
    orders.createIndex('userId', 'userId', { unique: false });
  },
  3: (db, tx) => {
    // 添加 age 索引
    tx.objectStore('users').createIndex('age', 'age', { unique: false });
  },
  4: (db, tx) => {
    // 数据迁移：为所有现有用户添加 createdAt 字段
    const users = tx.objectStore('users');
    const cursorReq = users.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const user = cursor.value;
        if (!user.createdAt) {
          user.createdAt = Date.now();
          cursor.update(user);
        }
        cursor.continue();
      }
    };
  },
};

async function openAppDB(name, targetVersion) {
  return openDB(name, targetVersion, (db, tx, oldV, newV) => {
    console.log(`迁移: ${oldV} -> ${newV}`);
    for (let v = oldV + 1; v <= newV; v++) {
      if (migrations[v]) {
        console.log(`执行迁移 v${v}`);
        migrations[v](db, tx);
      }
    }
  });
}
```

### 12.4 单元测试

```javascript
/**
 * 使用 fake-indexeddb 进行单元测试
 * npm install --save-dev fake-indexeddb
 */
import 'fake-indexeddb/auto';
import assert from 'assert';

describe('IndexedDBWrapper', () => {
  let db;

  before(async () => {
    db = new IndexedDBWrapper('TestDB', 1, (db) => {
      const store = db.createObjectStore('users', { keyPath: 'id' });
      store.createIndex('email', 'email', { unique: true });
    });
    await db.init();
  });

  after(() => {
    db.close();
    indexedDB.deleteDatabase('TestDB');
  });

  beforeEach(async () => {
    await db.clear('users');
  });

  it('应正确插入与查询用户', async () => {
    await db.add('users', { id: 1, name: 'Alice', email: 'alice@example.com' });
    const user = await db.get('users', 1);
    assert.strictEqual(user.name, 'Alice');
  });

  it('应通过邮箱索引查询', async () => {
    await db.add('users', { id: 1, name: 'Alice', email: 'alice@example.com' });
    const user = await db.getByIndex('users', 'email', 'alice@example.com');
    assert.strictEqual(user.id, 1);
  });

  it('应支持批量插入', async () => {
    const users = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `User${i}`,
      email: `user${i}@example.com`,
    }));
    const inserted = await db.bulkAdd('users', users, 100);
    assert.strictEqual(inserted, 1000);
  });

  it('应拒绝重复邮箱', async () => {
    await db.add('users', { id: 1, name: 'Alice', email: 'dup@example.com' });
    try {
      await db.add('users', { id: 2, name: 'Bob', email: 'dup@example.com' });
      assert.fail('应抛出 ConstraintError');
    } catch (e) {
      assert.strictEqual(e.name, 'ConstraintError');
    }
  });
});
```

### 12.5 性能优化策略

```javascript
// 1. 批量操作（单事务 vs 多事务）
// 错误：10000 次单事务插入需 10-50 秒
for (const item of items) {
  await db.add('store', item); // 每次新事务
}

// 正确：单事务批量插入，10000 条仅需 100-500ms
await db.bulkAdd('store', items, 1000);

// 2. 只查询必要字段
// 错误：getAll 加载完整记录
const all = await db.getAll('users'); // 占用大量内存

// 正确：使用游标按需处理
await db.forEach('users', (user) => {
  // 流式处理，不占用大量内存
});

// 3. 合理使用索引
// 错误：全表扫描过滤
await db.forEach('users', (u) => {
  if (u.age > 18) console.log(u);
});

// 正确：通过索引范围查询
const adults = await db.getAllByIndex('users', 'age', IDBKeyRange.lowerBound(18));

// 4. 避免长事务
// 错误：在事务中执行网络请求
const tx = db.transaction('users', 'readwrite');
const user = await fetch('/api/user').then(r => r.json());
tx.objectStore('users').put(user); // 事务可能已 inactive

// 正确：先获取数据，再开事务
const user = await fetch('/api/user').then(r => r.json());
await db.put('users', user);
```

---

## 13. 案例研究

### 13.1 Notion 的 IndexedDB 使用

Notion 的 Web 版本大量使用 IndexedDB 缓存文档数据，实现：

- **离线编辑**：所有编辑先写入 IndexedDB，网络恢复后同步
- **快速加载**：从 IndexedDB 读取缓存的文档，秒开
- **增量同步**：仅同步变化的数据块（CRDT-like）
- **历史版本**：存储文档的多个版本用于撤销/重做

### 13.2 Google Docs 离线模式

Google Docs 使用 IndexedDB 实现：

- **文档缓存**：完整文档结构存储于 IndexedDB
- **操作队列**：离线时的编辑操作排队，联网后重放
- **协作冲突**：使用 OT（Operational Transformation）算法解决多人编辑冲突

### 13.3 Twitter PWA

Twitter Progressive Web App 使用 IndexedDB：

- **时间线缓存**：缓存最近 1000 条推文
- **图片缓存**：与 Cache API 协作缓存图片资源
- **草稿存储**：未发送的推文草稿
- **离线阅读**：联网时预取，离线时可阅读

### 13.4 Figma 的协同设计

Figma 使用 IndexedDB：

- **文档树缓存**：整个设计文件的结构化数据
- **图层渲染数据**：加速大型设计文件的渲染
- **撤销栈**：多步撤销操作的本地存储
- **多标签页协调**：通过 storage 事件同步状态

### 13.5 VS Code Web 版

VS Code Web 使用 IndexedDB：

- **文件系统模拟**：将用户工作区文件存于 IndexedDB
- **扩展数据**：扩展的配置与状态
- **最近打开**：最近文件列表与光标位置
- **语言服务缓存**：TypeScript 类型缓存

---

## 14. 习题详解

### 14.1 习题 1（fill-blank，remember）

**题目**：IndexedDB 是一种 ______ 型数据库，所有读写操作必须在 ______ 中执行，且 API 为 ______ 以避免阻塞主线程。

**答案**：NoSQL/事务、事务、异步

**解析**：IndexedDB 是事务型 NoSQL 数据库，与 Web SQL 的关系型不同。所有读写必须包裹在事务中以保证 ACID。API 异步设计避免阻塞主线程，与 localStorage 的同步 API 形成对比。

### 14.2 习题 2（fill-blank，understand）

**题目**：IndexedDB 使用 ______ 事件触发 schema 升级，通过 ______ 方法创建对象存储，使用 ______ 方法创建索引；事务的隔离级别默认为 ______。

**答案**：onupgradeneeded、createObjectStore、createIndex、readwrite/readonly

**解析**：schema 升级只能在 `onupgradeneeded` 回调中进行；`createObjectStore` 与 `createIndex` 必须在该回调内调用；事务隔离基于对象存储锁，readwrite 串行、readonly 可并发。

### 14.3 习题 3（choice，understand）

**答案**：D

**解析**：D 项错误——readonly 事务可与 readwrite 事务并发访问同一对象存储，但 readwrite 之间必须串行。IndexedDB 锁粒度基于对象存储，readwrite 事务按作用域字典序排序获取锁以避免死锁。

### 14.4 习题 4（choice，analyze）

**答案**：D

**解析**：IndexedDB 每次写入需创建事务，存在固定开销（1-5ms），不适合每秒数百次的小数据高频写入。应使用内存缓冲批量写入，或考虑其他机制。

### 14.5 习题 5（code-fix，apply）

**解析**：原代码同步返回 `request.result`，但 IndexedDB 是异步 API，需用 Promise 封装在 `onsuccess` 回调中 resolve 结果。

### 14.6 习题 6（code-fix，evaluate）

**解析**：原实现为每条数据创建独立事务，性能极差。修复后使用单事务批量插入并分片，避免事务过长被浏览器中止。

### 14.7 习题 7（open-ended，create）

**评分要点**：

1. 设计 notes（笔记）、pendingOps（待同步操作）、revisions（历史版本）、syncMeta（同步元数据）四个对象存储
2. 使用 syncStatus 字段标记同步状态
3. 给出 LWW（简单但易丢数据）与 CRDT（复杂但保证收敛）的权衡
4. 设计多字段索引支持复杂查询
5. 使用 IDBKeyRange 与游标实现分页与全文搜索
6. 处理存储配额检测、自动清理旧版本、数据压缩

---

## 15. 实战项目：离线优先邮件客户端

### 15.1 项目目标

构建一个支持离线收发邮件的 PWA 应用：

1. 网络在线时同步邮件到 IndexedDB
2. 离线时可阅读已缓存邮件、撰写新邮件
3. 网络恢复后自动发送离线撰写的邮件
4. 支持按发件人、主题、时间索引查询

### 15.2 数据库 Schema 设计

```javascript
/**
 * 邮件客户端 IndexedDB Schema
 */
const emailDBUpgrade = (db, tx, oldV, newV) => {
  if (oldV < 1) {
    // 邮件存储
    const emails = db.createObjectStore('emails', { keyPath: 'id' });
    emails.createIndex('folder', 'folder', { unique: false });
    emails.createIndex('from', 'from.address', { unique: false });
    emails.createIndex('receivedAt', 'receivedAt', { unique: false });
    emails.createIndex('unread', 'unread', { unique: false });
    emails.createIndex('threadId', 'threadId', { unique: false });

    // 待发送队列
    const outbox = db.createObjectStore('outbox', {
      keyPath: 'id',
      autoIncrement: true,
    });
    outbox.createIndex('status', 'status', { unique: false });
    outbox.createIndex('createdAt', 'createdAt', { unique: false });

    // 同步元数据
    db.createObjectStore('syncMeta', { keyPath: 'key' });
  }
};
```

### 15.3 核心实现

```javascript
/**
 * 离线优先邮件客户端
 */
class OfflineMailClient {
  constructor() {
    this.db = new IndexedDBWrapper('MailAppDB', 1, emailDBUpgrade);
    this.syncInterval = null;
  }

  async init() {
    await this.db.init();
    await this.syncInbox();
    this.startAutoSync();
  }

  /**
   * 同步收件箱
   */
  async syncInbox() {
    try {
      const lastSync = await this.db.get('syncMeta', 'lastInboxSync') || { time: 0 };
      const response = await fetch(`/api/emails?since=${lastSync.time}`);
      const newEmails = await response.json();

      if (newEmails.length > 0) {
        await this.db.bulkAdd('emails', newEmails);
        await this.db.put('syncMeta', {
          key: 'lastInboxSync',
          time: Date.now(),
          count: newEmails.length,
        });
        console.log(`已同步 ${newEmails.length} 封新邮件`);
      }
    } catch (e) {
      console.warn('同步失败（可能离线）:', e.message);
    }
  }

  /**
   * 撰写邮件（离线可用）
   */
  async composeEmail(to, subject, body) {
    const email = {
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      from: { address: 'me@example.com' },
      to: [{ address: to }],
      subject,
      body,
      folder: 'sent',
      receivedAt: Date.now(),
      unread: false,
      syncStatus: 'pending',
    };

    // 写入发件箱
    await this.db.add('outbox', {
      email,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
    });

    // 立即尝试发送
    if (navigator.onLine) {
      await this.flushOutbox();
    }

    return email;
  }

  /**
   * 刷新发件箱（发送待发邮件）
   */
  async flushOutbox() {
    const pending = await this.db.getAll('outbox');

    for (const item of pending) {
      if (item.status !== 'pending') continue;

      try {
        const response = await fetch('/api/emails/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.email),
        });

        if (response.ok) {
          // 标记为已发送
          await this.db.put('outbox', { ...item, status: 'sent' });
          // 存入已发送邮件
          await this.db.put('emails', { ...item.email, syncStatus: 'synced' });
        }
      } catch (e) {
        console.warn(`发送失败: ${item.email.subject}`, e.message);
        // 增加重试次数，超过 5 次标记为失败
        const retryCount = (item.retryCount || 0) + 1;
        await this.db.put('outbox', {
          ...item,
          retryCount,
          status: retryCount >= 5 ? 'failed' : 'pending',
        });
      }
    }
  }

  /**
   * 查询邮件（按文件夹）
   */
  async getEmailsByFolder(folder, page = 1, pageSize = 20) {
    const tx = this.db.db.transaction('emails', 'readonly');
    const index = tx.objectStore('emails').index('folder');
    const range = IDBKeyRange.only(folder);

    return new Promise((resolve, reject) => {
      const items = [];
      let skipped = 0;
      const skipCount = (page - 1) * pageSize;

      const cursorReq = index.openCursor(range, 'prev');
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          resolve({ items, hasMore: false });
          return;
        }
        if (skipped < skipCount) {
          skipped++;
          cursor.advance(1);
          return;
        }
        if (items.length < pageSize) {
          items.push(cursor.value);
          cursor.continue();
        } else {
          resolve({ items, hasMore: true });
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  }

  /**
   * 搜索邮件（按主题）
   */
  async searchBySubject(keyword) {
    const results = [];
    await this.db.forEach('emails', (email) => {
      if (email.subject.toLowerCase().includes(keyword.toLowerCase())) {
        results.push(email);
      }
    });
    return results;
  }

  /**
   * 自动同步
   */
  startAutoSync() {
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncInbox();
        this.flushOutbox();
      }
    }, 60000); // 每分钟同步一次

    window.addEventListener('online', () => {
      console.log('网络恢复，开始同步');
      this.syncInbox();
      this.flushOutbox();
    });
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// 使用
const mailClient = new OfflineMailClient();
await mailClient.init();
await mailClient.composeEmail('friend@example.com', '你好', '这是一封测试邮件');
const inbox = await mailClient.getEmailsByFolder('inbox', 1, 20);
```

---

## 16. 与 Service Worker 集成

### 16.1 后台同步

```javascript
// Service Worker 中注册同步事件
self.addEventListener('sync', (event) => {
  if (event.tag === 'mail-sync') {
    event.waitUntil(syncMailbox());
  }
});

async function syncMailbox() {
  // 从 IndexedDB 读取待同步数据
  const db = await openDB('MailAppDB', 1);
  const pending = await getAllFromStore(db, 'outbox');

  for (const item of pending) {
    if (item.status === 'pending') {
      try {
        await fetch('/api/emails/send', {
          method: 'POST',
          body: JSON.stringify(item.email),
        });
        // 更新状态
        await updateStoreItem(db, 'outbox', { ...item, status: 'sent' });
      } catch (e) {
        throw e; // 抛出错误以触发重试
      }
    }
  }
}

// 主页面中注册同步
async function registerSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('mail-sync');
    console.log('已注册后台同步');
  }
}
```

### 16.2 定期同步

```javascript
// Service Worker 中注册定期同步
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mail-poll') {
    event.waitUntil(pollNewMails());
  }
});

// 主页面中注册定期同步（每 12 小时）
async function registerPeriodicSync() {
  const reg = await navigator.serviceWorker.ready;
  try {
    await reg.periodicSync.register('mail-poll', {
      minInterval: 12 * 60 * 60 * 1000,
    });
  } catch (e) {
    console.warn('定期同步不可用:', e);
  }
}
```

---

## 17. 与未来 Web 标准的关联

### 17.1 IndexedDB 3.0 Promise API

IndexedDB 3.0 引入了原生 Promise API，简化异步编程：

```javascript
// 旧 API（事件驱动）
const req = indexedDB.open('db', 1);
req.onsuccess = () => { /* ... */ };
req.onerror = () => { /* ... */ };

// 新 API（Promise，2026 标准）
const db = await indexedDB.open('db', 1);
const result = await db.transaction('users', 'readonly').objectStore('users').get(1);
```

### 17.2 IndexedDB Observer API

Chrome 117+ 引入了观察 API，监听数据变化：

```javascript
// 监听对象存储变化
const observer = (records) => {
  for (const record of records) {
    console.log(`操作: ${record.operation}, 键: ${record.key}`);
  }
};

db.observe('users', observer, { operation: ['put', 'delete'] });

// 取消观察
db.unobserve('users', observer);
```

### 17.3 Web Locks API 与跨标签页协调

```javascript
// 使用 Web Locks API 协调跨标签页的数据库访问
navigator.locks.request('db-upgrade', async (lock) => {
  // 在锁保护下执行升级
  const db = await openDB('app', 2, upgradeCallback);
  // 锁释放后其他标签页可继续
});
```

### 17.4 Storage Access API

跨站访问 IndexedDB（用于嵌入式应用）：

```javascript
// 请求跨站存储访问权限
const hasAccess = await document.requestStorageAccess();
if (hasAccess) {
  // 可访问第三方源的 IndexedDB
  const db = await indexedDB.open('thirdPartyDB');
}
```

### 17.5 File System Access API 集成

将 IndexedDB 数据导出到文件系统：

```javascript
async function exportToCSV(storeName) {
  const handle = await window.showSaveFilePicker({
    suggestedName: `${storeName}.csv`,
    types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }],
  });
  const writable = await handle.createWritable();

  await db.forEach(storeName, (record) => {
    const row = Object.values(record).join(',') + '\n';
    writable.write(row);
  });

  await writable.close();
}
```

---

## 18. 参考文献

1. **Marathe, N. and Sicking, J. 2026.** Indexed Database API 3.0. W3C. https://www.w3.org/TR/IndexedDB-3/
2. **Marathe, N. 2015.** Indexed Database API 1.0 - W3C Recommendation. W3C. https://www.w3.org/TR/2015/REC-IndexedDB-20150108/
3. **Sicking, J. 2010.** IndexedDB Proposal: Async API and Rationale. W3C WebApps Working Group. https://www.w3.org/TR/IndexedDB/
4. **Flanagan, D. 2020.** JavaScript: The Definitive Guide (7th Edition). O'Reilly Media. DOI: 10.5555/3372471
5. **Härder, T. and Reuter, A. 1983.** Principles of Transaction-Oriented Database Recovery. ACM Computing Surveys 15, 4, 287-317. DOI: 10.1145/289.291
6. **Ramakrishnan, R. and Gehrke, J. 2003.** Database Management Systems (3rd Edition). McGraw-Hill.
7. **MDN Web Docs. 2025.** IndexedDB API. Mozilla Developer Network. https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
8. **Archibald, J. 2015.** IndexedDB: A Database in Your Browser. web.dev. https://web.dev/articles/indexeddb

---

## 19. 延伸阅读

### 19.1 官方文档与规范

- **W3C IndexedDB 3.0**：https://www.w3.org/TR/IndexedDB-3/ —— 最新规范
- **MDN IndexedDB API**：https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API —— 完整 API 文档
- **web.dev: IndexedDB**：https://web.dev/articles/indexeddb —— Google 团队权威指南

### 19.2 开源库与工具

- **idb**：https://github.com/jakearchibald/idb —— Jake Archibald 的 Promise 封装库
- **Dexie.js**：https://dexie.org/ —— 功能强大的 IndexedDB 封装库
- **localForage**：https://github.com/localForage/localForage —— 跨存储抽象层
- **PouchDB**：https://pouchdb.com/ —— 支持 CouchDB 同步的 IndexedDB 封装
- **fake-indexeddb**：https://github.com/dumbmatter/fakeIndexedDB —— 单元测试用内存实现

### 19.3 相关主题

- **Service Worker**：离线优先的核心技术
- **Cache API**：HTTP 资源缓存
- **Web Locks API**：跨标签页协调
- **Storage Access API**：跨站存储访问
- **File System Access API**：本地文件系统集成
- **WebAssembly 与 SQLite**：在浏览器中运行 SQLite 的替代方案

### 19.4 学术论文

- **Gray, J. 1978.** Notes on Data Base Operating Systems. Operating Systems, Springer. —— 事务处理奠基
- **Härder, T. and Reuter, A. 1983.** Principles of Transaction-Oriented Database Recovery. —— ACID 正式定义
- **Bernstein, P. et al. 1987.** Concurrency Control and Recovery in Database Systems. —— 并发控制理论

---

## 20. 附录

### 20.1 语法速查表

```javascript
// 打开数据库
const req = indexedDB.open('name', version);
req.onupgradeneeded = (e) => { /* schema */ };
req.onsuccess = (e) => { const db = e.target.result; };

// 事务
const tx = db.transaction(['store1', 'store2'], 'readwrite');
tx.oncomplete = () => {};
tx.onerror = () => {};
tx.onabort = () => {};
tx.abort();

// 对象存储
const store = tx.objectStore('users');
store.add(value, key);
store.put(value, key);
store.get(key);
store.getAll(query, count);
store.getAllKeys(query, count);
store.count(query);
store.delete(key);
store.clear();

// 索引
const index = store.index('email');
index.get(key);
index.getAll(query, count);
index.openCursor(query, direction);
index.openKeyCursor(query, direction);

// 键范围
IDBKeyRange.only(value);
IDBKeyRange.lowerBound(lower, open);
IDBKeyRange.upperBound(upper, open);
IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);

// 游标
store.openCursor(query, 'next' | 'prev' | 'nextunique' | 'prevunique');
cursor.continue();
cursor.advance(count);
cursor.update(value);
cursor.delete();

// 存储配额
const estimate = await navigator.storage.estimate();
await navigator.storage.persist();
```

### 20.2 兼容性表

| 特性 | Chrome | Firefox | Safari | Edge |
| ---- | ------ | ------- | ------ | ---- |
| IndexedDB 1.0 | 24+ | 16+ | 10+ | 12+ |
| IndexedDB 2.0 | 58+ | 51+ | 10.1+ | 79+ |
| binary keys | 58+ | 51+ | 10.1+ | 79+ |
| getKey() | 58+ | 51+ | 10.1+ | 79+ |
| navigator.storage.estimate | 61+ | 57+ | 15.2+ | 79+ |
| navigator.storage.persist | 55+ | 57+ | 15.2+ | 79+ |
| Background Sync | 49+ | 不支持 | 不支持 | 79+ |
| IndexedDB 3.0 Promise API | 119+ | 122+ | 17+ | 119+ |

### 20.3 术语表

| 术语 | 英文 | 定义 |
| ---- | ---- | ---- |
| 数据库 | Database | 命名的数据容器 |
| 对象存储 | Object Store | 类似表，存储键值对 |
| 索引 | Index | 加速查询的辅助结构 |
| 主键 | Key | 记录的唯一标识 |
| 键路径 | Key Path | 从对象提取主键的路径 |
| 事务 | Transaction | 原子操作集合 |
| 游标 | Cursor | 遍历结果的迭代器 |
| 键范围 | Key Range | 查询的键区间 |
| 升级 | Upgrade | schema 版本变迁 |
| 同源策略 | Same-Origin Policy | 跨源隔离机制 |

### 20.4 学习路径

| 阶段 | 主题 | 资源 |
| ---- | ---- | ---- |
| 入门 | localStorage 与同步存储 | MDN Web Storage |
| 进阶 | IndexedDB 基础与事务 | 本篇文档 |
| 高级 | Promise 封装与索引查询 | 第 9-10 章 |
| 实战 | Service Worker 与离线优先 | web.dev PWA |
| 深入 | Dexie.js 与 PouchDB | 官方文档 |

### 20.5 FAQ

**Q1: IndexedDB 与 Web SQL Database 有何区别？**

A: Web SQL 是基于 SQLite 的关系型数据库，已于 2010 年废弃。IndexedDB 是事务型 NoSQL 数据库，使用 JavaScript API 而非 SQL，支持索引、游标、事务，是当前推荐的浏览器端数据库方案。

**Q2: 如何选择 IndexedDB 与 localStorage？**

A: 简单键值对、容量小（<5MB）、需要同步访问选 localStorage；结构化数据、大容量、需要事务、需要异步、需要索引查询选 IndexedDB。

**Q3: IndexedDB 的事务为什么容易失败？**

A: 事务在没有活跃请求时自动提交，如果事务中插入异步等待（如 await fetch），事务会变为 inactive 状态，后续操作报错。需保证所有请求一次性发出，或先完成异步操作再开事务。

**Q4: 如何处理跨标签页的数据库冲突？**

A: 使用 Web Locks API 协调跨标签页操作；监听 storage 事件通知其他标签页；使用 last-write-wins 或 CRDT 策略解决冲突。

**Q5: IndexedDB 数据会被浏览器自动清理吗？**

A: 默认情况下，浏览器在存储压力下可能清除 IndexedDB 数据。调用 `navigator.storage.persist()` 可请求持久化存储，避免被自动清理。

### 20.6 总结

IndexedDB 是浏览器内置的强大事务型 NoSQL 数据库，为 Web 应用提供了远超 localStorage 的存储能力。掌握其事务模型、索引机制、游标遍历与 Promise 封装，是构建离线优先 PWA 应用的核心能力。

**核心要点：**

1. IndexedDB 是异步事务型 NoSQL 数据库，支持 ACID 特性
2. 所有 schema 修改必须在 `onupgradeneeded` 中完成
3. 事务自动提交机制要求避免穿插异步等待
4. 索引基于 B+ 树，查询复杂度 $O(\log_m n)$
5. 批量操作应使用单事务，避免每条数据独立事务
6. 同源策略隔离不同源的数据库
7. 与 Service Worker、Cache API 协作构建离线优先架构

**未来发展方向：**

1. IndexedDB 3.0 原生 Promise API 简化开发
2. Observer API 支持数据变化监听
3. Web Locks API 改善跨标签页协调
4. 与 File System Access API 深度集成
