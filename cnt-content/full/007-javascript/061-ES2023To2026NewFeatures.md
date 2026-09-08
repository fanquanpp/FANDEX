---
order: 610
title: ES2023-ES2026 新特性全景
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 按"解决什么问题"串讲 ES2023-ES2025 全部定稿特性，并梳理 ES2026/ES2027 批次的 Temporal、显式资源管理与其余定稿提案。
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

> ES2023 给了"非破坏性数组方法"，ES2024 给了"分组、Promise.withResolvers 与 RegExp v 标志"，ES2025 给了"迭代器辅助、Set 集合运算、Import Attributes 与正则三连"；ES2026 批次已锁定 Upsert、Array.fromAsync 等定稿提案，Temporal 与显式资源管理也已在 2026 年定稿。本篇按年份串讲每个特性"解决什么问题、怎么用、边界在哪"。

## 0.1 版本机制：为什么特性按年份命名

TC39 从 ES2015 起采用**年度发布**节奏：每年 3 月冻结该年度进入 Stage 4 的提案集合，6-7 月发布新版 ECMA-262。因此：

1. **ES2025 = 2025 年发布的第 16 版**，收录截止 2025 年 3 月前全部升到 Stage 4 的提案；
2. 3 月截稿**之后**才进 Stage 4 的提案（无论何时定稿）自动进入下一年度版本——所以 2026 年定稿的 Temporal 预计随 ES2027 正式出版；
3. 想预判"明年有什么"，看 [TC39 提案仓库](https://github.com/tc39/proposals) 里 Stage 3 的队列即可；
4. 运行时支持永远滞后于规范：ES2025 特性在 2025-2026 年才陆续进入浏览器与 Node（Node 24+/Chrome 134+ 覆盖度最好）。

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

### 2.4 RegExp v 标志：字符类的集合运算

`v` 标志（ES2024，RegExp v flag with set notation）是 `u` 标志的升级版，新增字符类内的**集合运算**与字符串级匹配：

```javascript
// 交集 &&：既是希腊字母又是 Letter
/[\p{Script_Extensions=Greek}&&\p{Letter}]/v.test('π');  // true

// 差集 --：字母但排除希腊字母
/[\p{Letter}--\p{Script=Greek}]/v;

// 支持嵌套字符类与字符串字面量（u 标志做不到）
/[[a-z]--q]/v.test('r');  // true，小写字母去掉 q
```

与 `u` 的差异：`v` 中字符类必须「非嵌套地」书写集合运算；匹配对象可以是多码点的字符串（如 emoji 序列），这是 `u` 标志无法表达的。

## 3. ES2025：定稿特性速览

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

可用方法：`map`、`filter`、`take`、`drop`、`flatMap`、`reduce`、`toArray`、`forEach`、`some`、`every`、`find`，外加静态方法 `Iterator.from`。注意迭代器上**没有** `findLast`/`findLastIndex`（那是数组的专属方法）；无限迭代器（如生成器）只有配合 `take` 才安全。完整机制见 `javascript/031-IteratorHelper`。

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

## 4. ES2026 批次与 2026 年定稿：已定稿的前沿

按 3 月截稿规则，以下提案已全部定稿（Stage 4），将随 ES2026 或 ES2027 进入正式文本。它们不再是"提案前瞻"，可以开始规划采用；运行时落地进度以 MDN 为准。

### 4.1 Temporal：现代日期时间 API

Temporal 已于 **2026 年正式定稿（Stage 4）**，按年度发布节奏预计随 ES2027 正式出版。不可变类型、原生时区与历法支持，替代几乎所有 `Date` 的使用场景。完整教学见 `javascript/063-TemporalJavaScriptAPI`。

```javascript
// 一行获得不可变、带时区的当前时间
const meeting = Temporal.PlainDate.from('2026-12-01').add({ days: 30 });
```

### 4.2 显式资源管理：using 与 await using

显式资源管理（Explicit Resource Management）已于 2026 年定稿（预计随 ES2027 出版），`using` 语法在 Chrome 134+ 等引擎已先行落地，其余引擎以 MDN 为准。它以确定性方式释放文件句柄、数据库连接、事件监听器：

```javascript
{
  using handle = acquireResource();  // 离开作用域自动调用 handle[Symbol.dispose]()
  await using conn = await openDB(); // 异步资源用 await using，离开时等待异步释放
}  // 此处确定性释放，无需等待 GC
```

完整教学见 `javascript/064-ExplicitResourceManagement`。

### 4.3 Upsert：Map.prototype.getOrInsert

"不存在则插入"是最常见的 Map 操作模式，此前要写两行（`get` + `set`），并发场景还会竞态。Upsert 提案为 Map 与 WeakMap 提供原子语义的四个方法：

```javascript
const cache = new Map();

// getOrInsert：键不存在时插入默认值，返回"最终值"
const val1 = cache.getOrInsert('user:1', defaultValue());       // 默认值总是被求值
// getOrInsertComputed：默认值惰性求值（键存在则跳过昂贵计算）
const val2 = cache.getOrInsertComputed('user:2', buildExpensive);
```

命名与语义以最终规范文本为准；落地前可用 `if (!map.has(k)) map.set(k, v)` 等价替代。

### 4.4 JSON.parse source text access：保留数字原始文本

`JSON.parse` 会把 `1.0000` 解析成 `1`，损失金融/科学场景需要的原始精度。该提案提供 `JSON.rawJSON` 与 `JSON.isRawJSON`，并给 reviver 增加携带原始文本的上下文：

```javascript
// rawJSON：声明"这段文本按原样参与序列化"
const price = JSON.rawJSON('1.0000');
JSON.stringify({ price });        // '{"price":1.0000}'，不丢精度

// reviver 的第二个参数携带 source 原始文本
JSON.parse('{"n": 1.0000}', (key, value, context) => {
  if (key === 'n') return context.source;  // '1.0000'
  return value;
});
```

Node 21+ 等运行时已提前实现 `JSON.rawJSON`，可用性较好。

### 4.5 Iterator Sequencing 与数组之外的新入口

`Iterator.concat`（Iterator Sequencing 提案）把多个可迭代对象惰性拼接为一个迭代器，不物化中间数组：

```javascript
// 惰性拼接：遍历完 a 再遍历 b，全程不复制元素
const combined = Iterator.concat([1, 2], new Set([3, 4]));
console.log([...combined]);  // [1, 2, 3, 4]
```

### 4.6 其他随批次定稿的内置能力

| 能力 | API | 解决什么问题 |
| --- | --- | --- |
| Array.fromAsync | `await Array.fromAsync(gen)` | 把异步可迭代对象收集为数组，替代手写 for-await + push |
| Error.isError | `Error.isError(v)` | 可靠判断"是不是 Error"（`instanceof` 跨 realm 会失效） |
| Uint8Array base64/hex | `u8.toBase64()` / `Uint8Array.fromBase64(s)` / `toHex()` 等 | 浏览器原生编解码，替代手写 btoa 补丁 |
| Math.sumPrecise | `Math.sumPrecise([0.1, 0.2])` | 补偿求和避免浮点误差累积，结果 `0.30000000000000004` 变为 `0.3` |

```javascript
// Array.fromAsync：一行收拢异步流
const lines = await Array.fromAsync(readLines(file));

// Math.sumPrecise：注意参数必须是可迭代的数字，不能直接传多个参数
Math.sumPrecise([0.1, 0.2]);  // 0.3

// Uint8Array 与 base64 双向转换
const bytes = Uint8Array.fromBase64('aGVsbG8=');
console.log(bytes.toBase64());  // 'aGVsbG8='
```

### 4.7 ES2027 批次前瞻（已定稿待出版）

- **Atomics.pause**：自旋等待时提示 CPU，优化忙等场景的功耗与吞吐；
- **Joint Iteration**：`Iterator.zip` / `Iterator.zipKeyed`，按位打包多个迭代器。

### 4.8 仍在路上的提案（不得写成标准）

- **装饰器（Decorators，含 Decorator Metadata）**：仍停留 Stage 3，TypeScript 5.x 与 Babel 可用，但尚未定稿；
- **Source Phase Imports（`import source`）**、**延迟模块求值（`import defer`）**：Stage 3；
- **iterator chunking/includes/join**、**Pattern Matching、Pipeline Operator**：Stage 2 及更早，生产环境继续观望。

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

> ES2023 管数组不可变，ES2024 管分组、Promise 便利性与 RegExp v 标志，ES2025 补齐迭代器、Set 运算与正则；ES2026 批次带来 Upsert、fromAsync 与 base64 原生编解码，Temporal 与 `using` 也已在 2026 年定稿——记住 3 月截稿规则就能推断归属，语法靠转译、内置靠垫片。
