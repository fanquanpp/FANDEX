---
order: 610
title: ES2023-ES2025 新特性与 ES2026 展望
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 按"解决什么问题"串讲 ES2023-ES2025 全部定稿特性，并展望 ES2026 的 Temporal 与显式资源管理。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'javascript/031-IteratorHelper'
  - 'javascript/062-JavaScriptLatestFeature'
  - 'javascript/064-ExplicitResourceManagement'
  - 'javascript/063-TemporalJavaScriptAPI'
prerequisites:
  - 'javascript/008-FunctionScopeClosure'
  - 'javascript/023-MapSetWeakMapWeakSet'
---

## 0. 一句话理解

> ES2023 给了"非破坏性数组方法"，ES2024 给了"分组与 Promise.withResolvers"，ES2025 给了"迭代器辅助、Set 集合运算、Import Attributes 与正则三连"；ES2026 已经锁定 Temporal 与显式资源管理。本篇按年份串讲每个特性"解决什么问题、怎么用、边界在哪"。

## 0.1 版本机制：为什么特性按年份命名

TC39 从 ES2015 起采用**年度发布**节奏：每年 3 月冻结该年度进入 Stage 4 的提案集合，7 月发布新版 ECMA-262。因此：

1. **ES2025 = 2025 年 6 月定稿的第 16 版**，包含当年 3 月前全部升到 Stage 4 的提案；
2. 想预判"明年有什么"，看 [TC39 提案仓库](https://github.com/tc39/proposals) 里 Stage 3 的队列即可；
3. 运行时支持永远滞后于规范：ES2025 特性在 2025-2026 年才陆续进入浏览器与 Node（Node 24+/Chrome 134+ 覆盖度最好）。

## 1. ES2023：数组的不变性与尾部查找

### 1.1 解决什么问题

`sort()`、`reverse()`、`splice()` 会**修改原数组**，在 React/Vue 等状态驱动的框架里极易引发"原地改状态"的 Bug。ES2023 补齐了对应的非破坏版本。

### 1.2 四个非破坏方法与两个尾部查找

```javascript
const arr = [3, 1, 2];

arr.toSorted();        // [1, 2, 3]，arr 仍是 [3, 1, 2]
arr.toReversed();      // [2, 1, 3]
arr.toSpliced(0, 1);   // [1, 2]，对应 splice 的非破坏版
arr.with(0, 9);        // [9, 1, 2]，替换指定索引并返回新数组

[1, 2, 3, 4].findLast(x => x % 2 === 0);       // 4，从尾部向前找
[1, 2, 3, 4].findLastIndex(x => x % 2 === 0);  // 3
```

**边界**：`toSorted()` 的比较函数语义与 `sort()` 一致（默认按字符串 Unicode 码位排序，数字要传比较函数）。

## 2. ES2024：分组、可控 Promise 与 ArrayBuffer 扩展

### 2.1 Object.groupBy 与 Map.groupBy

```javascript
const list = [
  { type: 'a', name: 'x' },
  { type: 'b', name: 'y' },
  { type: 'a', name: 'z' },
];

Object.groupBy(list, item => item.type);  // { a: [...], b: [...] }
Map.groupBy(list, item => item.type);     // Map(2)，键可为任意类型
```

**选型**：分组键是字符串/数字用 `Object.groupBy`；键是对象、Symbol 或需要保持插入顺序遍历时用 `Map.groupBy`。

### 2.2 Promise.withResolvers

旧写法要在 `new Promise` 执行器里把 `resolve`/`reject` 赋给外部变量，非常啰嗦。ES2024 一次返回三件套：

```javascript
const { promise, resolve, reject } = Promise.withResolvers();

stream.on('data', chunk => buffer.push(chunk));
stream.on('end', resolve);
stream.on('error', reject);
await promise;
```

典型场景：把事件回调、自定义加载器改造成 `await` 风格。

### 2.3 ArrayBuffer.prototype.resize / transfer

```javascript
const buf = new ArrayBuffer(8, { maxByteLength: 16 });
buf.resize(16);          // 可增长缓冲区（需 maxByteLength）
const moved = buf.transfer();  // 所有权转移，原 buf 长度归零
```

这两个方法服务于 WebAssembly 内存与零拷贝场景，普通业务代码用得少，见到时理解语义即可。

## 3. ES2025：本年度七大特性

### 3.1 Iterator Helpers：迭代器上的惰性链式调用

数组方法会生成中间数组，迭代器辅助方法全程惰性，只遍历一次：

```javascript
// 传统：filter + map 产生两个中间数组
[1, 2, 3, 4, 5].filter(x => x % 2).map(x => x * 10);

// 迭代器版：零中间数组，惰性求值
const result = [1, 2, 3, 4, 5].values()
  .filter(x => x % 2)
  .map(x => x * 10)
  .take(2)
  .toArray();  // [10, 30]
```

可用方法：`map`、`filter`、`take`、`drop`、`flatMap`、`reduce`、`toArray`、`forEach`、`some`、`every`、`find`。无限迭代器（如生成器）只有配合 `take` 才安全。完整机制见 `javascript/031-IteratorHelper`。

### 3.2 Set 集合运算：告别手写差集

七个新方法覆盖数学集合运算，全部返回**新 Set**、不修改原集合：

```javascript
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

a.union(b);                  // {1,2,3,4} 并集
a.intersection(b);           // {2,3} 交集
a.difference(b);             // {1} 差集（a 有 b 无）
a.symmetricDifference(b);    // {1,4} 对称差
a.isSubsetOf(b);             // false
a.isSupersetOf(b);           // false
a.isDisjointFrom(b);         // false（有共同元素）
```

参数接受任何 Set-like 对象；复杂度 O(n+m)，比手写 `filter + includes` 的 O(n*m) 快。

### 3.3 Import Attributes 与 JSON 模块

```javascript
// 静态导入 JSON 模块（会打包进产物）
import config from './config.json' with { type: 'json' };

// 动态导入同样支持
const data = await import('./data.json', { with: { type: 'json' } });
```

`with` 声明模块类型，让运行时与打包器明确"这是 JSON 不是 JS"，同时防御内容类型篡改。注意 `type: 'json'` 模块的默认导出就是解析后的对象。

### 3.4 Promise.try：统一同步/异步错误入口

```javascript
// 旧写法：同步抛错不会进入 catch 链
Promise.resolve().then(parseConfig).catch(handle);  // 需要包一层 then

// ES2025：同步函数直接交给 Promise.try
Promise.try(parseConfig).catch(handle);
```

`Promise.try(fn)` 立即调用 `fn`：同步抛错转为 rejected Promise，返回值包装为 fulfilled。比 `new Promise` 或 `Promise.resolve().then()` 语义更直白，且不引入多余微任务。

### 3.5 正则三连：escape、内联标志、重复命名组

```javascript
// 1. RegExp.escape：把用户输入安全地嵌入正则
const keyword = 'C:\\Program Files (x86)';
const re = new RegExp(RegExp.escape(keyword));  // 元字符全部转义

// 2. 内联标志：只对子模式生效
/HELLO(?i: World)/.test('HELLO world');  // true，前半段仍区分大小写

// 3. 重复命名捕获组：多分支复用同一组名
const r = /(?<year>\d{4})-(?<month>\d{2})|(?<month>\d{2})\/(?<year>\d{4})/;
'03/2026'.match(r).groups;  // { year: '2026', month: '03' }
```

第三项解决了一个历史痛点：此前同一正则的两个分支不能使用相同组名，只能靠索引取值。

### 3.6 Float16Array：半精度浮点

```javascript
const f16 = new Float16Array(4);   // 每元素仅 2 字节
f16[0] = 1.5;
Math.f16round(1.337);              // 按 float16 精度舍入
new DataView(buf).setFloat16(0, 1.5);  // DataView 同步支持
```

面向 GPU 交互、机器学习推理数据交换等带宽敏感场景；精度只有约 3 位十进制有效数字，常规业务不要用。

### 3.7 RegExp v 标志的补全（ES2024 交集/差集字符类）

```javascript
// v 标志支持字符类集合运算
/[\p{Script_Extensions=Greek}&&\p{Letter}]/v;  // 希腊字母与字母的交集
```

`u` 标志的升级版，支持 `&&`（交集）、`--`（差集）与嵌套字符类，写多语言匹配时明显更清晰。

## 4. ES2026 展望：两个已锁定的大特性

### 4.1 Temporal：进入标准

Temporal 已于 2026 年升入 **Stage 4 并纳入 ES2026** 草案——历时九年的现代日期时间 API 正式定稿。不可变类型、原生时区与历法支持，替代几乎所有 `Date` 的使用场景。完整教学见 `javascript/063-TemporalJavaScriptAPI`。

### 4.2 显式资源管理：using 与 await using

`using` 声明已在 2025 年 5 月进入 Stage 4，Chrome 134+ 与 Firefox 均已落地，是 ES2026 的核心特性之一：以确定性的方式释放文件句柄、数据库连接、事件监听器。完整教学见 `javascript/064-ExplicitResourceManagement`。

### 4.3 仍在路上的提案

- **装饰器（Decorators）**：仍停留 Stage 3（2022 年至今），TypeScript 5.x 与 Babel 可用，但尚未定稿；
- **Pattern Matching、Pipeline Operator**：长期 Stage 1-2，生产环境继续观望。

## 5. 版本采用策略：transpile 还是 polyfill

| 策略 | 机制 | 适用 |
| --- | --- | --- |
| 语法转译 | Babel/esbuild 把新语法编译成旧语法 | 类、可选链等**语法**特性 |
| polyfill | 注入运行时实现 | `Promise.try`、Set 方法等**内置对象**特性 |
| 目标环境升级 | 提升 browserslist / `--target` | 运行时可控的 Node/内部工具 |

要点：语法转译不能替代 polyfill——`Array.fromAsync` 转译不出来，必须垫片；反之 `?.` 转译后无需垫片。现代工程用 `core-js` + browserslist 自动按目标环境注入。

## 6. 动手试试

1. 用 `Object.groupBy` 把订单按状态分组，再用 `Map.groupBy` 按日期对象分组，体会两种键的差异；
2. 用 `Promise.withResolvers` 重写一个"等待任意事件触发"的工具函数；
3. 用迭代器辅助方法处理一个 100 万元素的生成器，对比数组方法的内存峰值；
4. 检查你的项目 `browserslist` 配置，确认哪些 ES2025 特性可以直接用。

## 7. 一句话记住

> ES2023 管数组不可变，ES2024 管分组与 Promise 便利性，ES2025 补齐迭代器、Set 运算与正则；ES2026 已锁定 Temporal 与 `using`——升级节奏由 browserslist 决定，语法靠转译、内置靠垫片。
