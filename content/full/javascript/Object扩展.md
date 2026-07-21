---
order: 55
title: Object扩展
module: javascript
category: JavaScript
difficulty: intermediate
description: ES6+ Object 静态方法体系、属性描述符、对象不可变性、TC39 演进时间线与工程实践
author: fanquanpp
updated: '2026-07-20'
related:
  - javascript/生成器函数
  - javascript/Proxy与Reflect
  - javascript/事件循环
  - javascript/具名捕获组
  - javascript/浏览器对象模型
prerequisites:
  - javascript/语法速查
tags:
  - Object
  - ES6
  - PropertyDescriptor
  - Immutability
  - TC39
  - structuredClone
  - Reflection
learningObjectives:
  - '列举 ES6 以来 Object 静态方法的演进时间线，复述每个方法所属的 ECMAScript 版本'
  - '解释属性描述符的数据属性与访问器属性两种模型，区分 writable 与 configurable 的语义'
  - '使用 Object.assign、Object.fromEntries、Object.groupBy、Object.hasOwn 等方法处理真实业务场景'
  - '拆解 Object.create、Object.setPrototypeOf、Reflect.set 在原型链操作上的行为差异'
  - '评估 Object.freeze/seal/preventExtensions 三层不可变性的适用场景与性能开销'
  - '设计一个支持深冻结、深克隆与原型快照的不可变数据工具库，集成结构化克隆算法'
exercises:
  - id: ex-obj-01
    type: fill-blank
    cognitiveLevel: remember
    question: "Object.is(NaN, NaN) 返回 ______，而 NaN === NaN 返回 ______。"
    answer: "true；false"
    blankCount: 2
    answers:
      - "true"
      - "false"
    caseSensitive: false
    explanation: "Object.is 采用 SameValue(x, y) 算法，对 NaN 与 -0 +0 做特殊处理；=== 使用 Strict Equality Comparison，NaN 与任何值都不相等（包括自身）。"
  - id: ex-obj-02
    type: choice
    cognitiveLevel: analyze
    question: "下列代码输出是什么？\n```javascript\nconst obj = Object.create(null);\nobj.foo = 1;\nconsole.log(Object.hasOwn(obj, 'foo'));\nconsole.log(obj.hasOwnProperty('foo'));\n```"
    options:
      - "A. true true"
      - "B. true false"
      - "C. true 抛出 TypeError"
      - "D. false 抛出 TypeError"
    correctIndex: 2
    answer: "C"
    multiple: false
    explanation: "Object.hasOwn 对 null 原型对象能正常工作返回 true；而 obj.hasOwnProperty 需要从 Object.prototype 继承，null 原型对象没有此方法，会抛出 TypeError。"
  - id: ex-obj-03
    type: code-fix
    cognitiveLevel: analyze
    question: |
      以下代码尝试深度冻结配置对象，但在生产环境出现"未冻结"报告。请修复：
      ```javascript
      function deepFreeze(obj) {
        Object.freeze(obj);
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            deepFreeze(obj[key]);
          }
        }
        return obj;
      }
      const config = { db: { host: 'localhost' }, list: [{ id: 1 }] };
      deepFreeze(config);
      ```
    buggyCode: |
      function deepFreeze(obj) {
        Object.freeze(obj);
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            deepFreeze(obj[key]);
          }
        }
        return obj;
      }
    language: javascript
    fixedCode: |
      function deepFreeze(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        Object.freeze(obj);
        // 使用 Object.getOwnPropertyNames 而非 for...in，避免遍历原型链
        // 使用 Object.values 简化，并处理数组与普通对象
        for (const value of Object.values(obj)) {
          if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
          }
        }
        return obj;
      }
    errorDescription: "原代码两个问题：(1) for...in 会遍历原型链上的可枚举属性；(2) 未检查 Object.isFrozen 导致循环引用时栈溢出；(3) 未对 null 与非 object 类型做基线判断。"
    answer: |
      在 deepFreeze 入口加基线判断 if (obj === null || typeof obj !== 'object') return obj；将 for...in 换为 for (const value of Object.values(obj))；递归前加 !Object.isFrozen(value) 判断避免循环引用栈溢出。这样既避免遍历原型链，又防止循环引用。
  - id: ex-obj-04
    type: open-ended
    cognitiveLevel: create
    question: "请设计一个 immutable 配置管理库，要求：(1) 支持深度冻结；(2) 提供 update(path, value) 接口返回新对象而不修改原对象；(3) 支持 TypeScript 类型推导；(4) 性能优于 JSON.parse(JSON.stringify(obj))。请描述数据结构与算法。"
    keyPoints:
      - "结构性共享（persistent data structure，类似 Immutable.js 的 HAMT）"
      - "基于 Proxy 的写入拦截"
      - "路径数组解析（lodash.set 风格）"
      - "结构化克隆回退"
      - "TypeScript 泛型与递归类型 Readonly<T>"
      - "性能基准测试对比 JSON 序列化"
    answer: "应包括：结构性共享（persistent data structure，类似 Immutable.js 的 HAMT）、基于 Proxy 的写入拦截、路径数组解析（lodash.set 风格）、结构化克隆回退、TypeScript 泛型与递归类型 Readonly<T>、性能基准测试对比 JSON 序列化。"
    minWords: 200
references:
  - type: website
    authors:
      - "ECMA International"
    title: "ECMAScript 2026 Language Specification - Objects"
    venue: "ECMA-262, 17th Edition"
    year: 2026
    url: "https://tc39.es/ecma262/#sec-objects"
  - type: website
    authors:
      - "TC39"
    title: "Proposal: Object.groupBy and Map.groupBy"
    venue: "TC39 Proposals"
    year: 2024
    url: "https://github.com/tc39/proposal-array-grouping"
  - type: website
    authors:
      - "TC39"
    title: "Proposal: Error Cause (includes Object.hasOwn rationale)"
    venue: "TC39 Proposals"
    year: 2022
    url: "https://github.com/tc39/proposal-error-cause"
  - type: website
    authors:
      - "WHATWG"
    title: "HTML Living Standard - Structured clone algorithm"
    venue: "Web Hypertext Application Technology Working Group"
    year: 2026
    url: "https://html.spec.whatwg.org/multipage/structured-data.html#structuredclone"
  - type: documentation
    authors:
      - "Mozilla Developer Network"
    title: "Object reference"
    venue: "MDN Web Docs"
    year: 2026
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object"
etymology:
  - term: "Object"
    english: "Object"
    origin: "Object 作为 JavaScript 语言的根构造器，由 Brendan Eich 在 1995 年实现。其原型 Object.prototype 是所有对象的隐式原型链终点。ES5（2009）首次引入 Object.keys、Object.freeze 等静态方法，开启了 Object API 的扩展时代；ES6（2015）大规模补全了 Reflect、Object.assign、Object.setPrototypeOf 等；ES2022-2024 进一步引入 Object.hasOwn 与 Object.groupBy。"
lastReviewed: '2026-07-20'
reviewer: FANDEX Content Engineering Team
---

# Object 扩展（ES6+ 静态方法体系）

## 0. 导言

`Object` 是 JavaScript 中所有对象的根构造器，也是 ECMAScript 标准库中静态方法最多的内置类型之一。自 ES5（2009）首次引入 `Object.keys`、`Object.freeze`、`Object.defineProperty` 以来，TC39 在 ES6（2015）、ES2017、ES2022、ES2024 等版本中持续向 `Object` 注入新的静态方法，形成了一套覆盖"创建、合并、遍历、保护、原型操作、判等"的完整 API 体系。

掌握 `Object` 扩展 API 是现代 JavaScript 工程师的必备技能：

- React 状态更新的不可变范式依赖 `Object.assign` 与展开运算符
- TypeScript 类型体操建立在 `keyof`、`Object.keys`、`Object.entries` 的语义之上
- 库与框架的配置冻结、原型链操作、深拷贝都依赖 `Object` 静态方法
- TC39 提案流程（Stage 1-4）在 `Object` 扩展史上有完整呈现，是理解 JS 标准化的最佳样本

> **核心命题**：ES5 之前 JavaScript 缺乏对对象属性的精细控制能力，开发者只能通过原型链 hack 与约定式命名（如 `_private`）模拟封装。`Object.defineProperty`（ES5）与后续静态方法的引入，让 JavaScript 拥有了与 Java/C# 等语言相当的对象模型表达能力。

---

## 1. 学习目标与认知地图

完成本章后，学习者应能够：

1. **复述**（remember）ES5 至 ES2024 期间 `Object` 静态方法的演进时间线。
2. **解释**（understand）属性描述符的数据属性与访问器属性两种模型。
3. **应用**（apply）`Object.assign`、`Object.fromEntries`、`Object.groupBy`、`Object.hasOwn` 等方法解决实际工程问题。
4. **分析**（analyze）`Object.create`、`Object.setPrototypeOf`、`Reflect.set` 在原型链操作上的行为差异。
5. **评估**（evaluate）`Object.freeze` / `seal` / `preventExtensions` 三层不可变性的适用场景。
6. **设计**（create）一个支持深冻结、深克隆与原型快照的不可变数据工具库。

### 1.1 知识体系

```
Object 扩展
├── 静态方法分类
│   ├── 创建与原型
│   │   ├── Object.create
│   │   ├── Object.getPrototypeOf
│   │   └── Object.setPrototypeOf
│   ├── 属性定义与查询
│   │   ├── Object.defineProperty / defineProperties
│   │   ├── Object.getOwnPropertyDescriptor / getOwnPropertyDescriptors
│   │   └── Object.getOwnPropertyNames / getOwnPropertySymbols
│   ├── 合并与转换
│   │   ├── Object.assign（ES6）
│   │   ├── Object.fromEntries（ES2019）
│   │   └── Object.groupBy（ES2024）
│   ├── 遍历
│   │   ├── Object.keys / values / entries（ES5/ES2017）
│   │   └── 与 for...in / Reflect.ownKeys 的关系
│   ├── 判等与判属性
│   │   ├── Object.is（ES6）
│   │   └── Object.hasOwn（ES2022）
│   └── 不可变性
│       ├── Object.preventExtensions
│       ├── Object.seal
│       └── Object.freeze
├── 属性描述符
│   ├── 数据属性（value/writable/enumerable/configurable）
│   ├── 访问器属性（get/set/enumerable/configurable）
│   └── 默认值规则
├── 深度操作
│   ├── 深冻结（deepFreeze）
│   ├── 深比较（deepEqual）
│   └── 深克隆（structuredClone）
└── 工程实践
    ├── 不可变更新范式（Redux/React）
    ├── 配置对象冻结
    ├── 原型污染防护
    └── 性能基准
```

---

## 2. 历史动机与技术演进

### 2.1 ES3 之前的对象模型缺陷（1995-2009）

JavaScript 1.0 至 ES3（1999）期间，对象模型存在严重缺陷：

| 缺陷 | 表现 | 影响 |
| --- | --- | --- |
| 无法精细控制属性 | 只能通过赋值添加属性，所有属性默认可写、可枚举、可配置 | 无法实现真正的私有属性 |
| 无法获取属性描述符 | 没有 API 查询属性的 writable/enumerable/configurable | 调试困难 |
| 无法阻止原型链扩展 | 任何对象都可被添加属性 | 配置对象可被意外修改 |
| 原型操作低效且不安全 | 仅能通过 `obj.__proto__`（非标准）访问原型 | 跨浏览器行为不一致 |
| 缺乏统一的判等 | `===` 对 `NaN` 与 `-0` 的处理不符合直觉 | 数值比较易出错 |

### 2.2 ES5 革命：属性描述符与对象保护（2009）

ES5 是 `Object` API 的第一次大规模扩展，引入了 12 个静态方法：

| 方法 | 用途 |
| --- | --- |
| `Object.create(proto, descriptors)` | 显式指定原型创建对象 |
| `Object.defineProperty(obj, key, desc)` | 定义或修改单个属性描述符 |
| `Object.defineProperties(obj, descs)` | 批量定义属性描述符 |
| `Object.getOwnPropertyDescriptor(obj, key)` | 查询单个属性描述符 |
| `Object.getOwnPropertyNames(obj)` | 获取所有自身属性名（含不可枚举） |
| `Object.keys(obj)` | 获取所有可枚举自身属性名 |
| `Object.preventExtensions(obj)` | 阻止添加新属性 |
| `Object.seal(obj)` | 阻止添加/删除属性 |
| `Object.freeze(obj)` | 完全不可变 |
| `Object.isExtensible(obj)` | 检查可扩展性 |
| `Object.isSealed(obj)` | 检查是否被密封 |
| `Object.isFrozen(obj)` | 检查是否被冻结 |
| `Object.getPrototypeOf(obj)` | 标准化原型访问 |

### 2.3 ES6 至 ES2024 演进时间线

| 版本 | 年份 | 新增方法 | 核心动机 |
| --- | --- | --- | --- |
| ES6 | 2015 | `Object.assign`、`Object.is`、`Object.setPrototypeOf`、`Object.getOwnPropertySymbols` | 模块合并、精确判等、标准化原型操作 |
| ES2016 | 2016 | （无新增） | — |
| ES2017 | 2017 | `Object.values`、`Object.entries`、`Object.getOwnPropertyDescriptors` | 与 `Object.keys` 对称、深拷贝支持 |
| ES2019 | 2019 | `Object.fromEntries` | 与 `Object.entries` 互逆，支持 Map → Object 转换 |
| ES2020 | 2020 | （无新增） | — |
| ES2022 | 2022 | `Object.hasOwn` | 替代 `obj.hasOwnProperty`，对 null 原型对象友好 |
| ES2024 | 2024 | `Object.groupBy`、`Object.hasOwn`（稳定化） | 类 Lodash 分组操作的标准化 |

### 2.4 TC39 提案流程

每个新方法都经过 TC39 的四阶段提案流程：

| 阶段 | 含义 | 典型耗时 |
| --- | --- | --- |
| Stage 0 | Strawman（初步想法） | 任意 |
| Stage 1 | Proposal（提案，明确问题与解决方案） | 数月 |
| Stage 2 | Draft（草案，初版规范文本） | 数月至一年 |
| Stage 3 | Candidate（候选，规范审阅完成，等待实现反馈） | 半年至一年 |
| Stage 4 | Finished（完成，进入下一版标准） | — |

以 `Object.groupBy` 为例：

- 2021-02：Stage 1（最初作为 `Array.prototype.groupBy` 提案）
- 2021-10：因与原型链库的兼容性问题，迁移至 `Object.groupBy` 静态方法
- 2023-07：Stage 3
- 2024-04：Stage 4，进入 ES2024

> **学术溯源**：`Object` 静态方法的扩展模式可追溯至 Smalltalk-80 的"类方法"概念——将对象的元操作（创建、复制、比较）放在类本身而非实例上。JavaScript 进一步发展为"静态方法集合"模式，被 Reflect 与 Symbol 沿用。

---

## 3. 形式化定义

### 3.1 属性描述符的代数模型

JavaScript 对象的每个属性由一个**属性描述符**（Property Descriptor）表示。属性描述符分为两类：

**数据属性描述符**：

$$
\text{DataDescriptor} = \langle \text{value}, \text{writable}, \text{enumerable}, \text{configurable} \rangle
$$

**访问器属性描述符**：

$$
\text{AccessorDescriptor} = \langle \text{get}, \text{set}, \text{enumerable}, \text{configurable} \rangle
$$

一个属性不能同时具有 `value` 与 `get`/`set`，形式化约束为：

$$
\forall d \in \text{Descriptor}: (\text{has}(d, \text{value}) \lor \text{has}(d, \text{writable})) \Rightarrow \neg(\text{has}(d, \text{get}) \lor \text{has}(d, \text{set}))
$$

### 3.2 默认值规则

通过 `Object.defineProperty` 定义属性时，未指定的字段使用默认值：

| 字段 | 默认值（defineProperty） | 默认值（赋值语法 `obj.k = v`） |
| --- | --- | --- |
| `value` | `undefined` | 指定的值 |
| `writable` | `false` | `true` |
| `enumerable` | `false` | `true` |
| `configurable` | `false` | `true` |

这一不对称性是初学者的常见陷阱：通过 `defineProperty` 创建的属性默认不可写、不可枚举、不可配置。

### 3.3 原型链的形式化定义

每个对象都有一个隐式原型 `[[Prototype]]`，构成原型链：

$$
\text{PrototypeChain}(o) = [o, \text{proto}(o), \text{proto}^2(o), \ldots, \text{null}]
$$

其中 $\text{proto}(o) = o.[\![\text{Prototype}]\!]$。属性查找沿原型链向上：

$$
\text{lookup}(o, k) = \begin{cases}
o[k] & \text{if } k \in \text{ownKeys}(o) \\
\text{lookup}(\text{proto}(o), k) & \text{otherwise}
\end{cases}
$$

终止条件为 $\text{proto}^n(o) = \text{null}$。

### 3.4 不可变性的层级

JavaScript 提供三层不可变性，形式化定义如下：

| 操作 | preventExtensions | seal | freeze |
| --- | --- | --- | --- |
| 添加属性 | 禁止 | 禁止 | 禁止 |
| 删除属性 | 允许 | 禁止 | 禁止 |
| 修改属性值 | 允许 | 允许 | 禁止 |
| 修改描述符 | 允许（部分） | 禁止 | 禁止 |

形式化地：

$$
\text{freeze}(o) \Rightarrow \text{seal}(o) \Rightarrow \text{preventExtensions}(o)
$$

即冻结强于密封，密封强于阻止扩展。

### 3.5 Object.is 的同值语义

`Object.is(x, y)` 实现 **SameValue** 抽象操作，与 `===` 的差异在于两个边界值：

$$
\text{Object.is}(x, y) = \begin{cases}
\text{true} & \text{if } x = \text{NaN} \land y = \text{NaN} \\
\text{false} & \text{if } x = +0 \land y = -0 \text{ (or vice versa)} \\
x = y & \text{otherwise}
\end{cases}
$$

这两个差异源于 IEEE 754 浮点数标准的设计：`NaN` 与自身不等（用于检测未初始化值），`+0` 与 `-0` 在 `===` 下相等但在某些数学运算中表现不同（如 `1/+0 = +Infinity`，`1/-0 = -Infinity`）。

---

## 4. Object 静态方法详解

### 4.1 Object.assign：合并与浅拷贝

`Object.assign(target, ...sources)` 将所有可枚举自身属性从源对象复制到目标对象。

```javascript
/**
 * Object.assign 演示
 * 注意：仅复制可枚举自身属性，使用 = 赋值（触发 setter）
 */
const target = { a: 1, b: 2 };
const source = { b: 4, c: 5 };

const merged = Object.assign(target, source);
console.log(merged);   // { a: 1, b: 4, c: 5 }
console.log(target);   // { a: 1, b: 4, c: 5 }（注意：target 被修改）
console.log(merged === target);  // true

// 浅拷贝：嵌套对象仍是引用
const original = { list: [1, 2, 3] };
const copy = Object.assign({}, original);
copy.list.push(4);
console.log(original.list);  // [1, 2, 3, 4]（原对象也被修改）
```

`Object.assign` 的关键语义：

1. **触发 setter**：使用 `[[Set]]` 操作赋值，会调用目标对象（或其原型链上）的 setter。
2. **仅可枚举自身属性**：跳过继承属性与不可枚举属性。
3. **Symbol 属性**：ES6 起会复制 Symbol 键属性。
4. **异常中断**：复制过程中抛出错误会立即停止，已复制的属性保留。

```javascript
// 异常中断示例
const target = {};
const source = {
  get bad() { throw new Error('boom'); },
  good: 1,
};

try {
  Object.assign(target, source);
} catch (e) {
  console.log(e.message);  // 'boom'
}
console.log(target);  // {}（good 在 bad 之后，但定义顺序是 bad 先）
```

### 4.2 Object.is：精确判等

```javascript
// 与 === 的两处差异
Object.is(NaN, NaN);   // true（NaN === NaN 为 false）
Object.is(-0, 0);      // false（-0 === 0 为 true）
Object.is(-0, -0);     // true
Object.is(+0, +0);     // true

// 其他情况与 === 完全一致
Object.is(1, 1);           // true
Object.is('a', 'a');       // true
Object.is({}, {});         // false（不同引用）
Object.is(null, null);     // true
Object.is(undefined, undefined);  // true
```

`Object.is` 的典型应用场景：

```javascript
// 场景 1：检测 NaN
function isNaNSafe(value) {
  return Object.is(value, NaN);
}
console.log(isNaNSafe(NaN));  // true（比全局 isNaN 更准确，比 Number.isNaN 兼容性更好）

// 场景 2：检测 -0（用于数学库）
function isNegativeZero(value) {
  return Object.is(value, -0);
}
console.log(isNegativeZero(-0));  // true
console.log(isNegativeZero(0));   // false

// 场景 3：React 状态比较（早期版本）
// React 内部使用 Object.is 比较状态变化，避免 NaN 触发误更新
```

### 4.3 Object.keys / values / entries

```javascript
const obj = { a: 1, b: 2, c: 3 };

Object.keys(obj);     // ['a', 'b', 'c']
Object.values(obj);   // [1, 2, 3]
Object.entries(obj);  // [['a', 1], ['b', 2], ['c', 3]]

// 三个方法都仅遍历可枚举自身属性
const obj2 = Object.create({ inherited: 99 });
obj2.own = 1;
Object.defineProperty(obj2, 'hidden', { value: 2, enumerable: false });

Object.keys(obj2);  // ['own']（不含 inherited 与 hidden）
```

属性遍历顺序的规范（ES2020 起）：

1. 整数索引键（如 `'0'`、`'1'`）按数值升序
2. 字符串键按添加顺序
3. Symbol 键按添加顺序

```javascript
const obj = {};
obj.b = 1;
obj[2] = 2;
obj.a = 3;
obj[1] = 4;
obj[Symbol('x')] = 5;

console.log(Object.keys(obj));
// ['1', '2', 'b', 'a']
// 整数索引升序，字符串按添加顺序，Symbol 不在 Object.keys 中
console.log(Reflect.ownKeys(obj));
// ['1', '2', 'b', 'a', Symbol(x)]
```

### 4.4 Object.fromEntries

`Object.fromEntries(iterable)` 是 `Object.entries` 的逆运算，接受可迭代对象（每个元素为 `[key, value]` 二元组）。

```javascript
// Map → Object 转换
const map = new Map([['a', 1], ['b', 2]]);
const obj = Object.fromEntries(map);
console.log(obj);  // { a: 1, b: 2 }

// 数组 → Object
const entries = [['name', 'Alice'], ['age', 25]];
const person = Object.fromEntries(entries);

// 过滤与转换（结合 map/filter）
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];
const userMap = Object.fromEntries(
  users.map(u => [u.id, u.name])
);
console.log(userMap);
// { '1': 'Alice', '2': 'Bob', '3': 'Charlie' }

// URL 查询参数解析
const params = Object.fromEntries(new URLSearchParams('a=1&b=2'));
console.log(params);  // { a: '1', b: '2' }
```

### 4.5 Object.groupBy（ES2024）

`Object.groupBy(items, callbackFn)` 按回调返回的键对可迭代元素分组，返回一个普通对象（不是数组）。

```javascript
const inventory = [
  { name: 'asparagus', type: 'vegetables', quantity: 9 },
  { name: 'bananas', type: 'fruit', quantity: 5 },
  { name: 'goat', type: 'meat', quantity: 2 },
  { name: 'cherries', type: 'fruit', quantity: 8 },
  { name: 'fish', type: 'meat', quantity: 6 },
];

// 按类型分组
const result = Object.groupBy(inventory, ({ type }) => type);
console.log(result);
// {
//   vegetables: [{ name: 'asparagus', ... }],
//   fruit: [{ name: 'bananas', ... }, { name: 'cherries', ... }],
//   meat: [{ name: 'goat', ... }, { name: 'fish', ... }],
// }

// 按数量分组（动态键）
const byQuantity = Object.groupBy(inventory, ({ quantity }) =>
  quantity < 5 ? 'low' : quantity < 8 ? 'medium' : 'high'
);
console.log(byQuantity);
// { low: [...], medium: [...], high: [...] }

// 配合 Map.groupBy 保留键的原始类型
const map = Map.groupBy(inventory, ({ type }) => type);
console.log(map.get('fruit'));
// [{ name: 'bananas', ... }, { name: 'cherries', ... }]
```

`Object.groupBy` 与 Lodash `_.groupBy` 的差异：

| 特性 | Object.groupBy | _.groupBy |
| --- | --- | --- |
| 键类型 | 仅字符串或 Symbol | 字符串 |
| 返回值类型 | 普通对象（null 原型） | 普通对象 |
| 元素类型 | 数组 | 数组 |
| 回调参数 | (element, index) | (value, index, array) |
| 性能 | 引擎优化 | 用户态实现 |

注意：`Object.groupBy` 返回的对象是 `null` 原型对象（无 `toString` 等方法），避免与原型链属性冲突。

```javascript
const result = Object.groupBy([1, 2, 3], n => n % 2 === 0 ? 'even' : 'odd');
console.log(Object.getPrototypeOf(result));  // null
console.log(result.hasOwnProperty);  // undefined（需用 Object.hasOwn）
```

### 4.6 Object.hasOwn（ES2022）

`Object.hasOwn(obj, key)` 是 `obj.hasOwnProperty(key)` 的安全替代，解决两个问题：

1. **对象覆盖 hasOwnProperty**：若对象自身定义了 `hasOwnProperty` 属性，原方法失效。
2. **null 原型对象**：`Object.create(null)` 创建的对象没有 `hasOwnProperty` 方法。

```javascript
// 问题 1：对象覆盖
const obj = {
  hasOwnProperty: () => false,
  foo: 1,
};
obj.hasOwnProperty('foo');  // false（被覆盖）
Object.hasOwn(obj, 'foo');  // true

// 问题 2：null 原型对象
const dict = Object.create(null);
dict.bar = 2;
dict.hasOwnProperty('bar');  // TypeError: dict.hasOwnProperty is not a function
Object.hasOwn(dict, 'bar');  // true

// 安全的属性检查函数
function hasOwnSafe(obj, key) {
  // 优先使用 Object.hasOwn（ES2022+），降级到 call 形式
  if (typeof Object.hasOwn === 'function') {
    return Object.hasOwn(obj, key);
  }
  return Object.prototype.hasOwnProperty.call(obj, key);
}
```

### 4.7 Object.create 与原型操作

`Object.create(proto, propertiesObject)` 显式指定原型创建新对象。

```javascript
// 1. 创建 null 原型对象（用作字典）
const dict = Object.create(null);
dict.key = 'value';
// 优点：不担心 __proto__ 等原型属性被误访问
// 缺点：没有 toString、hasOwnProperty 等方法

// 2. 实现原型继承
const animal = {
  describe() {
    return `${this.name} is a ${this.type}`;
  },
};
const dog = Object.create(animal);
dog.name = 'Rex';
dog.type = 'dog';
console.log(dog.describe());  // 'Rex is a dog'

// 3. 同时定义属性描述符
const obj = Object.create(Object.prototype, {
  foo: {
    value: 42,
    writable: false,
    enumerable: true,
    configurable: false,
  },
  bar: {
    get() { return this._bar; },
    set(v) { this._bar = v; },
    enumerable: true,
    configurable: true,
  },
});
```

#### Object.create vs new vs 字面量

```javascript
// 三种创建对象的等价方式
const literal = {};           // 等价于 Object.create(Object.prototype)
const newObj = new Object();  // 等价于 Object.create(Object.prototype)
const created = Object.create(Object.prototype);

// 原型链对比
console.log(Object.getPrototypeOf({}) === Object.prototype);  // true
console.log(Object.getPrototypeOf(Object.create(null)) === null);  // true

// 性能对比（V8 引擎下）
// 字面量 {} 最快（V8 优化路径）
// new Object() 次之
// Object.create(Object.prototype) 略慢
// Object.create(null) 最慢（特殊原型路径）
```

### 4.8 Object.setPrototypeOf 与 Object.getPrototypeOf

```javascript
// 获取原型
const proto = { greet() { return 'hello'; } };
const obj = Object.create(proto);
console.log(Object.getPrototypeOf(obj) === proto);  // true

// 修改原型（ES6 标准化，但性能差）
const obj2 = { a: 1 };
Object.setPrototypeOf(obj2, proto);
console.log(obj2.greet());  // 'hello'

// 不推荐：动态修改原型会破坏 V8 的隐藏类优化
// 推荐替代：Object.create 在创建时指定原型
const obj3 = Object.create(proto, {
  a: { value: 1, writable: true, enumerable: true, configurable: true },
});
```

> **性能警示**：`Object.setPrototypeOf` 会触发 V8 的隐藏类（hidden class / map）迁移，性能开销可达 100 倍以上。生产环境应避免在已创建的对象上修改原型。

### 4.9 Object.defineProperty / defineProperties

```javascript
// 单个属性定义
const obj = {};
Object.defineProperty(obj, 'hidden', {
  value: 42,
  enumerable: false,  // 不可枚举
  configurable: false,  // 不可重新定义
  writable: false,  // 不可写
});

console.log(obj.hidden);      // 42
console.log(Object.keys(obj));  // []（hidden 不可枚举）

// 尝试修改不可写属性（严格模式抛错，非严格模式静默失败）
'use strict';
try {
  obj.hidden = 100;
} catch (e) {
  console.log(e);  // TypeError: Cannot assign to read only property 'hidden'
}

// 尝试重新定义不可配置属性
try {
  Object.defineProperty(obj, 'hidden', { writable: true });
} catch (e) {
  console.log(e);  // TypeError: Cannot redefine property: hidden
}

// 批量定义
Object.defineProperties(obj, {
  prop1: {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: true,
  },
  prop2: {
    get() { return this._prop2; },
    set(v) { this._prop2 = v * 2; },
    enumerable: true,
    configurable: true,
  },
});
```

#### Vue 3 响应式原理中的应用

```javascript
// Vue 3 早期响应式实现（已被 Proxy 取代，但思路一致）
function defineReactive(obj, key, val) {
  let internalValue = val;
  const dep = new Set();  // 依赖收集

  Object.defineProperty(obj, key, {
    get() {
      // 读取时收集依赖（简化版）
      if (window.activeEffect) {
        dep.add(window.activeEffect);
      }
      return internalValue;
    },
    set(newVal) {
      if (newVal === internalValue) return;
      internalValue = newVal;
      // 触发更新
      dep.forEach(fn => fn());
    },
    enumerable: true,
    configurable: true,
  });
}

const state = {};
defineReactive(state, 'count', 0);
```

### 4.10 Object.getOwnPropertyDescriptors

`Object.getOwnPropertyDescriptors(obj)` 返回所有自身属性的描述符（含 Symbol 键、不可枚举属性）。

```javascript
const obj = {};
Object.defineProperty(obj, 'hidden', { value: 1, enumerable: false });
obj.normal = 2;
obj[Symbol('s')] = 3;

console.log(Object.getOwnPropertyDescriptors(obj));
// {
//   hidden: { value: 1, writable: false, enumerable: false, configurable: false },
//   normal: { value: 2, writable: true, enumerable: true, configurable: true },
//   [Symbol(s)]: { value: 3, writable: true, enumerable: true, configurable: true },
// }

// 应用：完整克隆对象（保留描述符）
function cloneWithDescriptors(obj) {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  return Object.create(
    Object.getPrototypeOf(obj),
    descriptors
  );
}

// 应用：Object.assign 的局限
const original = {};
Object.defineProperty(original, 'hidden', {
  value: 1, enumerable: false, configurable: true,
});
const copy1 = Object.assign({}, original);
console.log(Object.keys(copy1));  // []（assign 跳过不可枚举属性）

const copy2 = cloneWithDescriptors(original);
console.log(Object.getOwnPropertyNames(copy2));  // ['hidden']
```

### 4.11 Object.getOwnPropertyNames / getOwnPropertySymbols / Reflect.ownKeys

```javascript
const obj = {};
obj.normal = 1;
Object.defineProperty(obj, 'hidden', { value: 2, enumerable: false });
obj[Symbol('first')] = 3;
obj[Symbol('second')] = 4;

// 仅字符串键（含不可枚举）
console.log(Object.getOwnPropertyNames(obj));  // ['normal', 'hidden']

// 仅 Symbol 键
console.log(Object.getOwnPropertySymbols(obj));  // [Symbol(first), Symbol(second)]

// Reflect.ownKeys = getOwnPropertyNames + getOwnPropertySymbols
console.log(Reflect.ownKeys(obj));
// ['normal', 'hidden', Symbol(first), Symbol(second)]
```

遍历顺序的完整规则（ES2020+）：

1. 整数索引键（升序）
2. 字符串键（添加顺序）
3. Symbol 键（添加顺序）

```javascript
const obj = {};
obj[Symbol('c')] = 1;
obj[1] = 2;
obj.a = 3;
obj[0] = 4;
obj[Symbol('a')] = 5;
obj.b = 6;

console.log(Reflect.ownKeys(obj));
// ['0', '1', 'a', 'b', Symbol(c), Symbol(a)]
```

---

## 5. 属性描述符详解

### 5.1 数据属性 vs 访问器属性

```javascript
// 数据属性
const dataObj = {};
Object.defineProperty(dataObj, 'value', {
  value: 42,
  writable: true,
  enumerable: true,
  configurable: true,
});

// 访问器属性
const accessorObj = {
  _age: 0,
};
Object.defineProperty(accessorObj, 'age', {
  get() {
    console.log('读取 age');
    return this._age;
  },
  set(value) {
    if (value < 0) throw new Error('年龄不能为负');
    console.log('设置 age =', value);
    this._age = value;
  },
  enumerable: true,
  configurable: true,
});

accessorObj.age = 25;  // '设置 age = 25'
console.log(accessorObj.age);  // '读取 age' → 25

// 描述符查询
console.log(Object.getOwnPropertyDescriptor(accessorObj, 'age'));
// { get: [Function: get], set: [Function: set], enumerable: true, configurable: true }
// 注意：没有 value 与 writable 字段
```

### 5.2 configurable 的真实含义

`configurable: false` 不仅阻止删除属性，还限制描述符的修改：

```javascript
const obj = {};
Object.defineProperty(obj, 'frozen', {
  value: 1,
  writable: true,       // 可写
  enumerable: true,
  configurable: false,  // 不可配置
});

// 可以修改值（writable 仍为 true）
obj.frozen = 100;
console.log(obj.frozen);  // 100

// 可以将 writable 从 true 改为 false（单向）
Object.defineProperty(obj, 'frozen', { writable: false });
obj.frozen = 200;  // 严格模式抛错

// 不能将 writable 从 false 改回 true
try {
  Object.defineProperty(obj, 'frozen', { writable: true });
} catch (e) {
  console.log(e);  // TypeError
}

// 不能删除属性
try {
  delete obj.frozen;
} catch (e) {
  console.log(e);  // TypeError
}

// 不能修改 getter/setter
try {
  Object.defineProperty(obj, 'frozen', { get() {} });
} catch (e) {
  console.log(e);  // TypeError
}
```

### 5.3 enumerable 与遍历

```javascript
const obj = {};
Object.defineProperties(obj, {
  visible: { value: 1, enumerable: true },
  hidden: { value: 2, enumerable: false },
});

// for...in 遍历可枚举属性（含原型链）
for (const key in obj) {
  console.log(key);  // 'visible'
}

// Object.keys 仅可枚举自身属性
console.log(Object.keys(obj));  // ['visible']

// JSON.stringify 仅序列化可枚举属性
console.log(JSON.stringify(obj));  // '{"visible":1}'

// 获取所有自身属性（含不可枚举）
console.log(Object.getOwnPropertyNames(obj));  // ['visible', 'hidden']
```

### 5.4 实战：实现真正的私有属性

ES2022 的 `#private` 语法之前，开发者常用闭包或 `Object.defineProperty` 模拟私有：

```javascript
// 方案 1：闭包（每个实例独立存储）
function createCounter() {
  let count = 0;  // 真正私有
  return {
    increment() { return ++count; },
    getCount() { return count; },
  };
}

// 方案 2：WeakMap 存储私有数据
const privateData = new WeakMap();

class Counter {
  constructor() {
    privateData.set(this, { count: 0 });
  }
  increment() {
    const data = privateData.get(this);
    data.count++;
    return data.count;
  }
}

// 方案 3：不可枚举属性（不算真正私有，但避免遍历）
class Counter2 {
  constructor() {
    Object.defineProperty(this, '_count', {
      value: 0,
      writable: true,
      enumerable: false,
      configurable: false,
    });
  }
  increment() {
    return ++this._count;
  }
}

// 方案 4：ES2022 私有字段（推荐）
class Counter3 {
  #count = 0;
  increment() {
    return ++this.#count;
  }
}
```

---

## 6. 对象保护与不可变性

### 6.1 三层保护机制

```javascript
// Level 1: preventExtensions（不可添加新属性）
const obj1 = { a: 1 };
Object.preventExtensions(obj1);
console.log(Object.isExtensible(obj1));  // false
obj1.b = 2;  // 静默失败（非严格模式）
// 'use strict'; obj1.b = 2;  // TypeError

// Level 2: seal（不可添加/删除，可修改现有属性值）
const obj2 = { a: 1, b: 2 };
Object.seal(obj2);
console.log(Object.isSealed(obj2));  // true
obj2.a = 100;  // 允许
delete obj2.b;  // 静默失败
obj2.c = 3;    // 静默失败

// Level 3: freeze（完全不可变，浅层）
const obj3 = { a: 1, b: 2 };
Object.freeze(obj3);
console.log(Object.isFrozen(obj3));  // true
obj3.a = 100;  // 静默失败
delete obj3.b;  // 静默失败
obj3.c = 3;    // 静默失败
```

### 6.2 浅层不可变性的陷阱

`Object.freeze` 是浅层的，嵌套对象仍可修改：

```javascript
const config = {
  server: { host: 'localhost', port: 3000 },
  features: ['auth', 'logging'],
};
Object.freeze(config);

config.server.host = 'example.com';  // 成功（嵌套对象未冻结）
config.features.push('cache');       // 成功
console.log(config);  // { server: { host: 'example.com', ... }, features: ['auth', 'logging', 'cache'] }
```

### 6.3 深度冻结实现

```javascript
/**
 * 深度冻结对象（递归冻结所有嵌套对象）
 * @param {any} obj - 待冻结对象
 * @returns {any} 冻结后的对象
 */
function deepFreeze(obj) {
  // 基本类型与 null 直接返回
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 已冻结则跳过（避免循环引用导致栈溢出）
  if (Object.isFrozen(obj)) {
    return obj;
  }

  // 先冻结自身
  Object.freeze(obj);

  // 递归冻结所有属性值
  // 使用 Object.getOwnPropertyNames 而非 for...in，避免遍历原型链
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = obj[key];
    if (value !== null && typeof value === 'object') {
      deepFreeze(value);
    }
  }

  // 处理 Symbol 键
  for (const sym of Object.getOwnPropertySymbols(obj)) {
    const value = obj[sym];
    if (value !== null && typeof value === 'object') {
      deepFreeze(value);
    }
  }

  return obj;
}

const config = {
  server: { host: 'localhost', port: 3000 },
  features: ['auth', 'logging'],
  nested: { deep: { value: 42 } },
};
deepFreeze(config);

config.server.host = 'example.com';  // 静默失败（严格模式抛错）
config.features.push('cache');       // 静默失败
console.log(config.server.host);     // 'localhost'
```

### 6.4 深度密封与深度阻止扩展

```javascript
// 深度密封：允许修改值，但不允许增删
function deepSeal(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Object.isSealed(obj)) return obj;

  Object.seal(obj);
  for (const key of Reflect.ownKeys(obj)) {
    const value = obj[key];
    if (value !== null && typeof value === 'object') {
      deepSeal(value);
    }
  }
  return obj;
}

// 深度阻止扩展：允许修改与删除，但不允许添加
function deepPreventExtensions(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (!Object.isExtensible(obj)) return obj;

  Object.preventExtensions(obj);
  for (const key of Reflect.ownKeys(obj)) {
    const value = obj[key];
    if (value !== null && typeof value === 'object') {
      deepPreventExtensions(value);
    }
  }
  return obj;
}
```

### 6.5 不可变性的性能影响

```javascript
// V8 引擎对冻结对象的优化：极速属性访问
const frozen = Object.freeze({ a: 1, b: 2, c: 3 });
const normal = { a: 1, b: 2, c: 3 };

// 冻结对象：V8 使用 "frozen" 隐藏类，省去写入检查
// 普通对象：每次写入需检查可写性

// 性能基准（V8 7.0+ 起冻结对象读取快 5-15%）
function benchmark(obj, label) {
  const start = performance.now();
  for (let i = 0; i < 1e8; i++) {
    const x = obj.a + obj.b + obj.c;
  }
  console.log(`${label}: ${(performance.now() - start).toFixed(2)}ms`);
}

benchmark(frozen, 'frozen');
benchmark(normal, 'normal');
```

---

## 7. 对象迭代与遍历

### 7.1 各种遍历方式对比

```javascript
const proto = { inherited: 'from proto' };
const obj = Object.create(proto);
obj.own = 'own property';
Object.defineProperty(obj, 'hidden', {
  value: 'hidden', enumerable: false,
});
obj[Symbol('sym')] = 'symbol';

// 1. for...in：遍历自身与原型链的可枚举字符串属性
const forInKeys = [];
for (const key in obj) forInKeys.push(key);
console.log(forInKeys);  // ['own', 'inherited']

// 2. Object.keys：仅自身可枚举字符串属性
console.log(Object.keys(obj));  // ['own']

// 3. Object.values / entries：与 keys 对应
console.log(Object.values(obj));   // ['own property']
console.log(Object.entries(obj));  // [['own', 'own property']]

// 4. Object.getOwnPropertyNames：自身所有字符串属性（含不可枚举）
console.log(Object.getOwnPropertyNames(obj));  // ['own', 'hidden']

// 5. Object.getOwnPropertySymbols：自身所有 Symbol 属性
console.log(Object.getOwnPropertySymbols(obj));  // [Symbol(sym)]

// 6. Reflect.ownKeys：自身所有属性（字符串 + Symbol，含不可枚举）
console.log(Reflect.ownKeys(obj));  // ['own', 'hidden', Symbol(sym)]
```

### 7.2 遍历顺序的完整规则

ES2020 起，对象属性的遍历顺序被标准化：

```javascript
const obj = {};
obj[Symbol('s1')] = 1;
obj.b = 2;
obj[2] = 3;
obj.a = 4;
obj[1] = 5;
obj[Symbol('s2')] = 6;
obj[0] = 7;
obj.c = 8;

console.log(Reflect.ownKeys(obj));
// ['0', '1', '2', 'b', 'a', 'c', Symbol(s1), Symbol(s2)]

// 顺序规则：
// 1. 整数索引键（如 '0'、'1'、'2'），按数值升序
// 2. 字符串键（如 'b'、'a'、'c'），按添加顺序
// 3. Symbol 键（如 Symbol(s1)、Symbol(s2)），按添加顺序
```

### 7.3 安全遍历模式

```javascript
// 安全遍历：避免原型污染与 Symbol 误访问
function safeIterate(obj) {
  const result = [];
  // 仅遍历自身可枚举字符串属性
  for (const key of Object.keys(obj)) {
    // 跳过 __proto__ 等危险键
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    result.push([key, obj[key]]);
  }
  return result;
}

// 处理 null 原型对象
const dict = Object.create(null);
dict.key1 = 'value1';
dict.key2 = 'value2';

// for...in 在 null 原型对象上仍可工作，但 Object.prototype 上的方法不可用
for (const key in dict) {
  console.log(key);  // 'key1', 'key2'
}

// Object.keys 同样工作
console.log(Object.keys(dict));  // ['key1', 'key2']
```

---

## 8. 对象创建与原型操作

### 8.1 原型链的三种操作方式

```javascript
// 1. __proto__（非标准但事实通用，ES6 起被规范附录承认）
const obj = {};
console.log(obj.__proto__ === Object.prototype);  // true

// 设置原型（不推荐，性能差）
const obj2 = { __proto__: { inherited: 1 } };
console.log(obj2.inherited);  // 1

// 2. Object.getPrototypeOf / Object.setPrototypeOf（ES6 标准）
const proto = { greet() { return 'hi'; } };
const obj3 = Object.create(proto);
Object.getPrototypeOf(obj3) === proto;  // true

const obj4 = {};
Object.setPrototypeOf(obj4, proto);
obj4.greet();  // 'hi'

// 3. Object.create（推荐，创建时指定）
const obj5 = Object.create(proto, {
  name: { value: 'Alice', enumerable: true },
});
```

### 8.2 原型污染攻击与防护

```javascript
// 原型污染漏洞：恶意修改 Object.prototype
const malicious = JSON.parse('{"__proto__": {"isAdmin": true}}');

// 错误的合并实现（会触发原型污染）
function unsafeMerge(target, source) {
  for (const key in source) {
    target[key] = source[key];  // 危险：若 key 为 __proto__，会修改原型
  }
}
unsafeMerge({}, malicious);
console.log({}.isAdmin);  // true（所有对象被污染！）

// 安全的合并实现
function safeMerge(target, source) {
  for (const key of Object.keys(source)) {
    // 显式拒绝危险键
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    target[key] = source[key];
  }
  return target;
}

// 更推荐：使用 Object.assign（不会触发原型污染）
const safe = Object.assign({}, malicious);
console.log({}.isAdmin);  // undefined（Object.assign 安全）
```

### 8.3 创建 null 原型对象的三种方式

```javascript
// 方式 1：Object.create(null)
const dict1 = Object.create(null);

// 方式 2：字面量 + __proto__（ES6+）
const dict2 = { __proto__: null };

// 方式 3：new 关键字无法创建 null 原型对象
// new Object() 总是创建 Object.prototype 原型对象

// 应用场景：哈希表 / 字典
class HashTable {
  constructor() {
    this._data = Object.create(null);  // 避免 __proto__ 等键的干扰
  }
  set(key, value) { this._data[key] = value; }
  get(key) { return this._data[key]; }
  has(key) { return key in this._data; }  // 注意：null 原型对象上 in 仍可用
}

const ht = new HashTable();
ht.set('key', 'value');
ht.set('__proto__', 'safe');  // 不会污染原型
console.log(ht.get('__proto__'));  // 'safe'
```

---

## 9. 对比分析

### 9.1 Object.assign vs 展开运算符 vs structuredClone

```javascript
const original = {
  str: 'hello',
  num: 42,
  arr: [1, 2, 3],
  nested: { a: 1 },
  date: new Date(),
  map: new Map([['k', 'v']]),
  set: new Set([1, 2]),
};

// 方案 1: Object.assign（浅拷贝）
const copy1 = Object.assign({}, original);
copy1.arr === original.arr;  // true（共享引用）
copy1.nested === original.nested;  // true
copy1.date === original.date;  // true
copy1.map === original.map;  // true

// 方案 2: 展开运算符（浅拷贝，与 assign 等价但更简洁）
const copy2 = { ...original };
copy2.arr === original.arr;  // true

// 方案 3: structuredClone（深拷贝，支持 Date/Map/Set）
const copy3 = structuredClone(original);
copy3.arr === original.arr;  // false（独立副本）
copy3.nested === original.nested;  // false
copy3.date === original.date;  // false
copy3.map === original.map;  // false（Map 被克隆）

// 方案 4: JSON.parse(JSON.stringify())（深拷贝，但丢失 Date/Map/Set）
const copy4 = JSON.parse(JSON.stringify(original));
copy4.date instanceof Date;  // false（变为字符串）
copy4.map instanceof Map;  // false（变为普通对象）
```

| 特性 | Object.assign | 展开运算符 | structuredClone | JSON 序列化 |
| --- | --- | --- | --- | --- |
| 拷贝深度 | 浅 | 浅 | 深 | 深 |
| 触发 setter | 是 | 否 | 否 | 否 |
| 保留 Date | 是 | 是 | 是 | 否（转字符串） |
| 保留 Map/Set | 是 | 是 | 是 | 否（转普通对象） |
| 保留 RegExp | 是 | 是 | 是 | 否（转空对象） |
| 保留 Symbol | 是 | 是 | 否 | 否 |
| 保留函数 | 是（引用） | 是（引用） | 抛错 | 丢失 |
| 保留原型 | 否 | 否 | 是 | 否 |
| 循环引用 | 抛错 | 抛错 | 支持 | 抛错 |
| 性能 | 最快 | 最快 | 中等 | 中等 |

### 9.2 Object.hasOwn vs hasOwnProperty vs in

```javascript
const obj = Object.create({ inherited: 1 });
obj.own = 2;
Object.defineProperty(obj, 'hidden', { value: 3, enumerable: false });

// 1. in 操作符：检查自身与原型链，含不可枚举
console.log('inherited' in obj);  // true
console.log('own' in obj);        // true
console.log('hidden' in obj);     // true

// 2. hasOwnProperty：仅自身，含不可枚举
console.log(obj.hasOwnProperty('inherited'));  // false
console.log(obj.hasOwnProperty('own'));        // true
console.log(obj.hasOwnProperty('hidden'));     // true

// 3. Object.hasOwn：与 hasOwnProperty 相同，但更安全
console.log(Object.hasOwn(obj, 'inherited'));  // false
console.log(Object.hasOwn(obj, 'own'));        // true
console.log(Object.hasOwn(obj, 'hidden'));     // true

// null 原型对象的差异
const dict = Object.create(null);
dict.key = 'value';

'key' in dict;                    // true
Object.hasOwn(dict, 'key');       // true
dict.hasOwnProperty('key');       // TypeError!
Object.prototype.hasOwnProperty.call(dict, 'key');  // true
```

### 9.3 Object.keys vs Reflect.ownKeys vs for...in

| 特性 | Object.keys | Reflect.ownKeys | for...in |
| --- | --- | --- | --- |
| 范围 | 自身可枚举字符串键 | 自身所有键（含 Symbol 与不可枚举） | 自身与原型链可枚举字符串键 |
| 顺序 | 整数升序 + 字符串添加序 + Symbol 添加序 | 同 Object.keys 规则 | 实现相关（通常与 keys 一致） |
| 返回值 | 数组 | 数组 | 无（迭代） |
| 性能 | 最快 | 中等 | 最慢（需检查原型链） |

### 9.4 Object.freeze vs Seal vs preventExtensions

| 维度 | preventExtensions | seal | freeze |
| --- | --- | --- | --- |
| 添加属性 | 禁止 | 禁止 | 禁止 |
| 删除属性 | 允许 | 禁止 | 禁止 |
| 修改属性值 | 允许 | 允许 | 禁止 |
| 修改描述符 | 允许 | 禁止 | 禁止 |
| 修改原型 | 禁止 | 禁止 | 禁止 |
| 性能开销 | 低 | 中 | 高 |
| V8 优化 | 无 | "sealed" 隐藏类 | "frozen" 隐藏类（最快读取） |
| 典型用途 | 防止意外扩展 | API 对象保护 | 配置冻结、React state |

---

## 10. 常见陷阱与修复

### 10.1 陷阱：浅拷贝导致的状态污染

```javascript
// 问题：React 中使用 Object.assign 更新嵌套状态
function updateUser(state, userId, newData) {
  const user = state.users[userId];
  // 错误：直接修改嵌套对象
  Object.assign(user, newData);
  return state;  // state 引用未变，React 不重新渲染
}

// 修复：返回新对象
function updateUserFixed(state, userId, newData) {
  return {
    ...state,
    users: {
      ...state.users,
      [userId]: { ...state.users[userId], ...newData },
    },
  };
}
```

### 10.2 陷阱：Object.keys 顺序的不确定假设

```javascript
// 问题：假设 Object.keys 按插入顺序
const obj = {};
obj[2] = 'two';
obj[1] = 'one';
obj.a = 'a';

// 开发者期望 ['2', '1', 'a']
console.log(Object.keys(obj));  // ['1', '2', 'a']
// 实际：整数索引按数值升序，字符串按添加顺序

// 修复：需要保持插入顺序时，使用 Map
const map = new Map();
map.set(2, 'two');
map.set(1, 'one');
map.set('a', 'a');
console.log([...map.keys()]);  // [2, 1, 'a']（保持插入顺序）
```

### 10.3 陷阱：Object.freeze 不能冻结数组内容

```javascript
// 问题：冻结数组后仍可 push
const arr = [1, 2, 3];
Object.freeze(arr);
arr.push(4);  // 严格模式抛错，非严格模式静默失败
console.log(arr);  // [1, 2, 3]（严格模式）或 [1, 2, 3]（非严格）

// 但修改嵌套对象仍可
const nested = [{ a: 1 }];
Object.freeze(nested);
nested[0].a = 100;  // 成功
console.log(nested[0].a);  // 100

// 修复：深度冻结
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    deepFreeze(value);
  }
  return obj;
}

const safe = deepFreeze([{ a: 1 }]);
safe[0].a = 100;  // 静默失败
console.log(safe[0].a);  // 1
```

### 10.4 陷阱：原型污染

```javascript
// 问题：合并用户输入时被注入 __proto__
const userInput = JSON.parse('{"__proto__": {"isAdmin": true}}');
const config = {};
Object.assign(config, userInput);  // 危险？实际上 Object.assign 不会触发原型污染
console.log({}.isAdmin);  // undefined（assign 安全）

// 但 for...in 合并会触发
function unsafeMerge(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
  return target;
}
unsafeMerge({}, userInput);
console.log({}.isAdmin);  // true（污染！）

// 修复方案 1：使用 Object.assign
// 修复方案 2：过滤危险键
function safeMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    target[key] = source[key];
  }
  return target;
}
// 修复方案 3：使用 null 原型对象
const safe = Object.create(null);
Object.assign(safe, userInput);
```

### 10.5 陷阱：Object.is 与 === 的差异

```javascript
// 问题：用 === 判断 NaN 永远为 false
function findNaN(arr) {
  return arr.filter(x => x === NaN);  // 永远返回 []
}

// 修复：使用 Object.is
function findNAFfixed(arr) {
  return arr.filter(x => Object.is(x, NaN));
}
console.log(findNAFfixed([1, NaN, 3]));  // [NaN]

// 问题：判断 -0
function clearPosition(x) {
  if (x === 0) console.log('已清零');  // -0 也会触发
}
clearPosition(-0);  // '已清零'

// 修复：区分 +0 与 -0
function clearPositionFixed(x) {
  if (Object.is(x, -0)) console.log('负零');
  else if (Object.is(x, +0)) console.log('正零');
}
```

### 10.6 陷阱：defineProperty 的默认值

```javascript
// 问题：默认描述符不可写、不可枚举、不可配置
const obj = {};
Object.defineProperty(obj, 'key', { value: 1 });
console.log(Object.keys(obj));  // []（不可枚举）
obj.key = 2;  // 静默失败
delete obj.key;  // 静默失败

// 修复：显式指定描述符
Object.defineProperty(obj, 'key2', {
  value: 2,
  writable: true,
  enumerable: true,
  configurable: true,
});
console.log(Object.keys(obj));  // ['key2']
```

### 10.7 陷阱：setPrototypeOf 的性能

```javascript
// 问题：动态修改原型导致 V8 隐藏类失效
function BadClass() {}
BadClass.prototype = { method1() {} };

const instance = new BadClass();
// 性能差：修改原型触发隐藏类迁移
Object.setPrototypeOf(instance, { method2() {} });

// 修复：创建时指定正确原型
const correctProto = { method1() {}, method2() {} };
const goodInstance = Object.create(correctProto);
```

---

## 11. 工程实践

### 11.1 不可变状态管理（Redux 风格）

```javascript
/**
 * 不可变状态管理工具
 * 所有更新操作返回新对象，不修改原对象
 */
class ImmutableState {
  constructor(initialState) {
    this._state = deepFreeze(structuredClone(initialState));
  }

  get state() {
    return this._state;
  }

  /**
   * 在指定路径设置值，返回新状态
   * @param {string[]} path - 属性路径
   * @param {any} value - 新值
   * @returns {ImmutableState} 新状态实例
   */
  setIn(path, value) {
    const newState = this._setInRecursive(this._state, path, value, 0);
    return new ImmutableState(newState);
  }

  _setInRecursive(obj, path, value, depth) {
    if (depth === path.length) return value;
    const key = path[depth];
    return {
      ...obj,
      [key]: this._setInRecursive(obj[key] || {}, path, value, depth + 1),
    };
  }

  /**
   * 在指定路径获取值
   */
  getIn(path) {
    return path.reduce((acc, key) => (acc == null ? undefined : acc[key]), this._state);
  }

  /**
   * 合并部分更新
   */
  merge(partial) {
    return new ImmutableState({ ...this._state, ...partial });
  }
}

const state = new ImmutableState({
  user: { name: 'Alice', address: { city: 'Beijing' } },
});
const newState = state.setIn(['user', 'address', 'city'], 'Shanghai');
console.log(state.getIn(['user', 'address', 'city']));    // 'Beijing'
console.log(newState.getIn(['user', 'address', 'city'])); // 'Shanghai'
```

### 11.2 配置对象冻结

```javascript
/**
 * 应用配置管理
 * 配置在加载时深度冻结，防止运行时被意外修改
 */
class ConfigManager {
  constructor() {
    this._config = null;
  }

  load(configObject) {
    // 深度克隆后冻结，避免外部引用修改
    this._config = deepFreeze(structuredClone(configObject));
  }

  get(path) {
    const keys = path.split('.');
    return keys.reduce((acc, key) => (acc == null ? undefined : acc[key]), this._config);
  }
}

const config = new ConfigManager();
config.load({
  api: { baseURL: 'https://api.example.com', timeout: 5000 },
  features: { auth: true, logging: false },
});

// 任何修改都会静默失败（或严格模式抛错）
// config.get('api').baseURL = 'wrong';  // 失败
```

### 11.3 类型安全的对象操作（TypeScript）

```typescript
// 利用 keyof 与 Object.keys 实现类型安全的遍历
type ObjectKey<T> = keyof T;

function typedEntries<T extends object>(obj: T): Array<[ObjectKey<T>, T[ObjectKey<T>]]> {
  return Object.entries(obj) as Array<[ObjectKey<T>, T[ObjectKey<T>]]>;
}

function typedKeys<T extends object>(obj: T): Array<ObjectKey<T>> {
  return Object.keys(obj) as Array<ObjectKey<T>>;
}

interface User {
  name: string;
  age: number;
  email: string;
}

const user: User = { name: 'Alice', age: 25, email: 'alice@example.com' };

// 类型安全的遍历
for (const [key, value] of typedEntries(user)) {
  // key 类型为 'name' | 'age' | 'email'
  // value 类型为 string | number
  console.log(`${key}: ${value}`);
}

// 类型安全的部分更新
function updateUser<T extends object>(obj: T, updates: Partial<T>): T {
  return { ...obj, ...updates };
}

const updated = updateUser(user, { age: 26 });
// updated 类型仍为 User
```

### 11.4 深拷贝工具函数

```javascript
/**
 * 完整的深拷贝实现
 * 优先使用 structuredClone，降级到手动实现
 */
function deepClone(obj, options = {}) {
  const { preservePrototype = false } = options;

  // 优先使用原生 structuredClone（支持 Date/Map/Set/循环引用）
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (e) {
      // 包含函数等不支持类型时降级
    }
  }

  // 降级实现
  return deepCloneManual(obj, preservePrototype, new WeakMap());
}

function deepCloneManual(obj, preservePrototype, visited) {
  // 基本类型与 null
  if (obj === null || typeof obj !== 'object') return obj;

  // 处理循环引用
  if (visited.has(obj)) return visited.get(obj);

  // 处理 Date
  if (obj instanceof Date) return new Date(obj.getTime());

  // 处理 RegExp
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);

  // 处理 Map
  if (obj instanceof Map) {
    const clone = new Map();
    visited.set(obj, clone);
    for (const [k, v] of obj) {
      clone.set(deepCloneManual(k, preservePrototype, visited), deepCloneManual(v, preservePrototype, visited));
    }
    return clone;
  }

  // 处理 Set
  if (obj instanceof Set) {
    const clone = new Set();
    visited.set(obj, clone);
    for (const v of obj) {
      clone.add(deepCloneManual(v, preservePrototype, visited));
    }
    return clone;
  }

  // 处理 Array
  if (Array.isArray(obj)) {
    const clone = [];
    visited.set(obj, clone);
    for (const item of obj) {
      clone.push(deepCloneManual(item, preservePrototype, visited));
    }
    return clone;
  }

  // 处理普通对象
  const proto = preservePrototype ? Object.getPrototypeOf(obj) : Object.prototype;
  const clone = Object.create(proto);
  visited.set(obj, clone);

  // 复制所有自身属性（含 Symbol）
  for (const key of Reflect.ownKeys(obj)) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (descriptor.value !== undefined) {
      descriptor.value = deepCloneManual(descriptor.value, preservePrototype, visited);
    }
    Object.defineProperty(clone, key, descriptor);
  }

  return clone;
}
```

### 11.5 性能基准测试

```javascript
/**
 * Object 操作性能基准
 */
function bench(label, fn, iterations = 1e6) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  console.log(`${label}: ${elapsed.toFixed(2)}ms (${(iterations / elapsed / 1000).toFixed(0)} ops/ms)`);
}

const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 };

// 1. 遍历性能对比
bench('Object.keys + forEach', () => {
  Object.keys(obj).forEach(k => obj[k]);
});
bench('for...in', () => {
  for (const k in obj) obj[k];
});
bench('Object.entries', () => {
  for (const [, v] of Object.entries(obj)) v;
});

// 2. 浅拷贝性能对比
bench('Object.assign', () => Object.assign({}, obj));
bench('spread', () => ({ ...obj }));
bench('JSON', () => JSON.parse(JSON.stringify(obj)));

// 3. 属性访问性能
const frozen = Object.freeze({ ...obj });
const normal = { ...obj };

bench('frozen access', () => {
  frozen.a; frozen.b; frozen.c;
});
bench('normal access', () => {
  normal.a; normal.b; normal.c;
});
```

---

## 12. 案例研究

### 12.1 案例 1：Immutable.js 的设计思路

Immutable.js 的 `Map` 与 `List` 通过 **HAMT（Hash Array Mapped Trie）** 实现结构性共享：

```javascript
// 简化版：基于结构性共享的不可变对象
class ImmutableMap {
  constructor(data = {}) {
    this._data = Object.freeze({ ...data });
  }

  set(key, value) {
    return new ImmutableMap({ ...this._data, [key]: value });
  }

  get(key) {
    return this._data[key];
  }

  delete(key) {
    const { [key]: _, ...rest } = this._data;
    return new ImmutableMap(rest);
  }

  toJS() {
    return { ...this._data };
  }
}

const map1 = new ImmutableMap({ a: 1, b: 2 });
const map2 = map1.set('c', 3);
console.log(map1.get('a'));  // 1（原对象未变）
console.log(map2.get('c'));  // 3
console.log(map1 === map2);  // false（新实例）
```

### 12.2 案例 2：Vue 3 响应式系统（早期 defineProperty 版本）

Vue 2 的响应式基于 `Object.defineProperty`，存在以下限制：

```javascript
// Vue 2 响应式核心（简化版）
class Observer {
  constructor(value) {
    this.value = value;
    this.walk(value);
  }

  walk(obj) {
    for (const key of Object.keys(obj)) {
      this.defineReactive(obj, key, obj[key]);
    }
  }

  defineReactive(obj, key, val) {
    const dep = new Dep();  // 依赖收集器

    // 递归观察嵌套对象
    if (typeof val === 'object' && val !== null) {
      new Observer(val);
    }

    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        dep.depend();  // 收集依赖
        return val;
      },
      set(newVal) {
        if (newVal === val) return;
        val = newVal;
        // 新值若是对象也需观察
        if (typeof newVal === 'object' && newVal !== null) {
          new Observer(newVal);
        }
        dep.notify();  // 触发更新
      },
    });
  }
}

// 局限：
// 1. 无法检测属性添加/删除（需 Vue.set / Vue.delete）
// 2. 无法检测数组索引与 length 变化（需重写数组方法）
// 3. 初始化时递归遍历，性能开销大
```

Vue 3 改用 Proxy 解决这些问题：

```javascript
// Vue 3 响应式核心（简化版）
function reactive(target) {
  return new Proxy(target, {
    get(obj, key, receiver) {
      track(obj, key);  // 依赖收集
      const result = Reflect.get(obj, key, receiver);
      // 懒代理：嵌套对象在访问时才代理
      if (typeof result === 'object' && result !== null) {
        return reactive(result);
      }
      return result;
    },
    set(obj, key, value, receiver) {
      const result = Reflect.set(obj, key, value, receiver);
      trigger(obj, key);  // 触发更新
      return result;
    },
    deleteProperty(obj, key) {
      const result = Reflect.deleteProperty(obj, key);
      trigger(obj, key);
      return result;
    },
  });
}
```

### 12.3 案例 3：Lodash 的 mergeWith 实现

```javascript
/**
 * 深度合并，支持自定义合并策略
 * 简化版 Lodash mergeWith
 */
function mergeWith(target, ...sources) {
  const customizer = typeof sources[sources.length - 1] === 'function'
    ? sources.pop()
    : undefined;

  for (const source of sources) {
    if (source == null) continue;

    for (const key of Object.keys(source)) {
      const targetValue = target[key];
      const sourceValue = source[key];

      // 自定义合并优先
      const customized = customizer ? customizer(targetValue, sourceValue, key, target, source) : undefined;

      if (customized !== undefined) {
        target[key] = customized;
      } else if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
        // 两个对象递归合并
        target[key] = mergeWith({ ...targetValue }, sourceValue);
      } else if (Array.isArray(sourceValue)) {
        target[key] = [...sourceValue];
      } else if (sourceValue !== undefined) {
        target[key] = sourceValue;
      }
    }
  }
  return target;
}

function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// 应用：合并 Webpack 配置
const baseConfig = {
  entry: { main: './src/index.js' },
  output: { path: 'dist', filename: '[name].js' },
  module: { rules: [{ test: /\.js$/, use: 'babel-loader' }] },
};

const devConfig = {
  output: { filename: '[name].[hash].js' },
  devServer: { port: 3000 },
};

const finalConfig = mergeWith({}, baseConfig, devConfig, (target, source) => {
  // 数组 concat 而非替换
  if (Array.isArray(target) && Array.isArray(source)) {
    return [...target, ...source];
  }
});
```

### 12.4 案例 4：React 的 shallowEqual

```javascript
/**
 * React 浅比较实现（用于 PureComponent 与 memo）
 * 基于 Object.is 进行同值比较
 */
function shallowEqual(objA, objB) {
  // 1. 同值比较（含 NaN 与 -0 处理）
  if (Object.is(objA, objB)) {
    return true;
  }

  // 2. 任一非对象则不相等
  if (typeof objA !== 'object' || objA === null ||
      typeof objB !== 'object' || objB === null) {
    return false;
  }

  // 3. 比较自身可枚举属性数量
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }

  // 4. 逐属性比较（仅一层）
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(objB, key) ||
        !Object.is(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}

// React.memo 应用
const MyComponent = React.memo(function MyComponent(props) {
  return <div>{props.name}</div>;
}, shallowEqual);
```

### 12.5 案例 5：JSON Schema 验证器

```javascript
/**
 * 简化版 JSON Schema 验证器
 * 利用 Object 方法实现属性检查
 */
class SchemaValidator {
  constructor(schema) {
    this.schema = deepFreeze(structuredClone(schema));
  }

  validate(data) {
    return this._validate(data, this.schema, '');
  }

  _validate(data, schema, path) {
    if (schema.type && typeof data !== schema.type) {
      return { valid: false, error: `${path}: 期望 ${schema.type}，实际 ${typeof data}` };
    }

    if (schema.type === 'object' && schema.properties) {
      // 检查必需属性
      for (const requiredKey of schema.required || []) {
        if (!Object.hasOwn(data, requiredKey)) {
          return { valid: false, error: `${path}.${requiredKey}: 缺少必需属性` };
        }
      }

      // 检查每个属性
      for (const [key, subschema] of Object.entries(schema.properties)) {
        if (Object.hasOwn(data, key)) {
          const result = this._validate(data[key], subschema, `${path}.${key}`);
          if (!result.valid) return result;
        }
      }
    }

    return { valid: true };
  }
}

const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
  },
  required: ['name'],
};

const validator = new SchemaValidator(userSchema);
console.log(validator.validate({ name: 'Alice', age: 25 }));
// { valid: true }
console.log(validator.validate({ age: 25 }));
// { valid: false, error: '.name: 缺少必需属性' }
```

---

## 13. 习题

### 13.1 填空题（fill-blank）

1. **（remember）** `Object.keys` 仅返回对象的 ______ 属性，而 `Object.getOwnPropertyNames` 返回所有 ______ 属性。

   答案：可枚举自身字符串；自身字符串（含不可枚举）

2. **（remember）** ES2024 引入的 `Object.groupBy` 返回的对象原型为 ______，目的是避免 ______。

   答案：null；原型链属性冲突

3. **（understand）** `Object.assign` 使用 ______ 操作赋值，因此会触发目标对象（或其原型链上）的 ______。

   答案：`[[Set]]`；setter

### 13.2 选择题（choice）

1. **（analyze）** 下列代码的输出是？

   ```javascript
   const a = { x: 1 };
   const b = Object.assign({}, a);
   console.log(b === a, b.x === a.x);
   ```

   选项：
   - A. true true
   - B. false true
   - C. false false
   - D. true false

   答案：B

   解释：`Object.assign` 返回新对象，故 `b === a` 为 false；但 `x` 是基本类型，被复制，故 `b.x === a.x` 为 true。

2. **（analyze）** 下列代码的输出是？

   ```javascript
   const obj = Object.freeze({ list: [1, 2, 3] });
   obj.list.push(4);
   console.log(obj.list.length);
   ```

   选项：
   - A. 3
   - B. 4
   - C. 抛出 TypeError
   - D. undefined

   答案：B

   解释：`Object.freeze` 是浅层冻结，嵌套数组未被冻结，`push` 成功。

3. **（evaluate）** 下列哪种方式能正确克隆一个含 `Date` 与 `Map` 的对象？

   选项：
   - A. `Object.assign({}, obj)`
   - B. `{ ...obj }`
   - C. `JSON.parse(JSON.stringify(obj))`
   - D. `structuredClone(obj)`

   答案：D

   解释：A/B 是浅拷贝；C 会丢失 Date 与 Map；D 是深拷贝且支持 Date/Map/Set。

### 13.3 代码修复题（code-fix）

1. **（analyze）** 以下代码尝试实现深度冻结，但在循环引用对象上会栈溢出。请修复：

   ```javascript
   function deepFreeze(obj) {
     Object.freeze(obj);
     for (const key in obj) {
       if (typeof obj[key] === 'object') {
         deepFreeze(obj[key]);
       }
     }
     return obj;
   }
   const circular = { a: 1 };
   circular.self = circular;
   deepFreeze(circular);  // 栈溢出
   ```

   答案：

   ```javascript
   function deepFreeze(obj, visited = new WeakSet()) {
     if (obj === null || typeof obj !== 'object') return obj;
     if (visited.has(obj) || Object.isFrozen(obj)) return obj;
     visited.add(obj);
     Object.freeze(obj);
     for (const key of Object.keys(obj)) {
       deepFreeze(obj[key], visited);
     }
     return obj;
   }
   ```

2. **（apply）** 以下代码尝试合并两个配置，但会触发原型污染。请修复：

   ```javascript
   function merge(target, source) {
     for (const key in source) {
       target[key] = source[key];
     }
     return target;
   }
   ```

   答案：

   ```javascript
   function merge(target, source) {
     for (const key of Object.keys(source)) {
       if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
         continue;
       }
       target[key] = source[key];
     }
     return target;
   }
   // 或直接使用 Object.assign({}, source)
   ```

### 13.4 开放题（open-ended）

1. **（evaluate）** 比较三种实现不可变状态的方式：`Object.freeze`、Immutable.js、Immer。请从性能、开发体验、学习曲线、生态支持四个维度评估。

   参考答案：应包括：
   - `Object.freeze`：性能最差（浅层、需手动递归）、开发体验一般、学习曲线最低、无依赖
   - Immutable.js`：性能最佳（HAMT 结构性共享）、开发体验需适应 API（`getIn`、`Map()`）、学习曲线陡、生态成熟但与原生 API 不兼容
   - Immer`：性能良好（Proxy + Copy-on-Write）、开发体验最佳（直接修改 draft）、学习曲线低、与原生 API 兼容

2. **（create）** 设计一个支持时间旅行的状态管理库，要求：(1) 保存历史状态快照；(2) 支持回溯到任意历史点；(3) 支持分支时间线；(4) 内存占用优于完整深拷贝。请描述数据结构与算法。

   参考答案：应包括：
   - 数据结构：基于 HAMT 的不可变树，每次更新产生新根，旧版本通过共享节点保留
   - 历史栈：链表或树形结构（支持分支），每个节点引用一个不可变状态根
   - 时间复杂度：O(log n) 的更新与查询（n 为节点数）
   - 空间复杂度：每次更新 O(log n) 新增节点
   - GC 策略：可配置保留最近 N 个版本，或基于引用计数

---

## 14. 延伸阅读

### 14.1 书籍

- **Nicholas C. Zakas**：《Principles of Object-Oriented JavaScript》（No Starch Press, 2014）——深入讲解 JavaScript 对象模型与原型链。
- **Kyle Simpson**：《You Don't Know JS: this & Object Prototypes》（O'Reilly, 2014）——对象原型系统的经典讲解。
- **David Flanagan**：《JavaScript: The Definitive Guide, 7th Edition》（O'Reilly, 2020）——第 6 章详细讲解对象与属性描述符。
- **Axel Rauschmayer**：《Speaking JavaScript》（O'Reilly, 2014）——第 17 章对象作为字典的精细讲解。

### 14.2 论文与规范

- **ECMA-262, 17th Edition (2026)**：第 7 章 Objects，第 20 章 Object 对象。规范文本，权威来源。
- **Phil Bagwell (2002)**："Ideal Hash Trees"——HAMT 数据结构原始论文，Immutable.js 的理论基础。
- **Rich Hickey (2008)**："The Value of Values"——不可变数据哲学的奠基性演讲。

### 14.3 开源项目

- **Immutable.js** (https://github.com/immutable-js/immutable-js)：Facebook 出品的不可变数据库，基于 HAMT。
- **Immer** (https://github.com/immerjs/immer)：基于 Proxy 的 Copy-on-Write 不可变库，开发体验最佳。
- **Lodash** (https://github.com/lodash/lodash)：`_.merge`、`_.cloneDeep`、`_.set` 等工具函数的工业实现。
- **Ramda** (https://github.com/ramda/ramda)：函数式编程库，强调不可变与无副作用。

### 14.4 在线资源

- **MDN: Object** (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)：最完整的 API 参考。
- **TC39 Proposals** (https://github.com/tc39/proposals)：所有进入流程的提案列表。
- **You Don't Know JS** (https://github.com/getify/You-Dont-Know-JS)：开源版系列书籍。

---

## 15. 附录

### 15.1 Object 静态方法完整速查表

| 方法 | 版本 | 功能 | 是否触发原型链 |
| --- | --- | --- | --- |
| `Object.assign(target, ...sources)` | ES6 | 合并可枚举自身属性 | 否（仅自身） |
| `Object.create(proto, descs)` | ES5 | 创建指定原型对象 | 创建时指定 |
| `Object.defineProperty(obj, key, desc)` | ES5 | 定义属性描述符 | 否 |
| `Object.defineProperties(obj, descs)` | ES5 | 批量定义描述符 | 否 |
| `Object.entries(obj)` | ES2017 | 自身可枚举 [key, value] 数组 | 否 |
| `Object.freeze(obj)` | ES5 | 完全冻结 | 否 |
| `Object.fromEntries(iterable)` | ES2019 | [key, value] 数组转对象 | 否 |
| `Object.getOwnPropertyDescriptor(obj, key)` | ES5 | 查询单个描述符 | 否 |
| `Object.getOwnPropertyDescriptors(obj)` | ES2017 | 查询所有描述符 | 否 |
| `Object.getOwnPropertyNames(obj)` | ES5 | 自身所有字符串键 | 否 |
| `Object.getOwnPropertySymbols(obj)` | ES6 | 自身所有 Symbol 键 | 否 |
| `Object.getPrototypeOf(obj)` | ES5 | 获取原型 | — |
| `Object.groupBy(items, cb)` | ES2024 | 按回调分组 | 否（返回 null 原型） |
| `Object.hasOwn(obj, key)` | ES2022 | 判自身属性 | 否 |
| `Object.is(a, b)` | ES6 | 同值比较 | — |
| `Object.isExtensible(obj)` | ES5 | 检查可扩展性 | — |
| `Object.isFrozen(obj)` | ES5 | 检查冻结 | — |
| `Object.isSealed(obj)` | ES5 | 检查密封 | — |
| `Object.keys(obj)` | ES5 | 自身可枚举字符串键 | 否 |
| `Object.preventExtensions(obj)` | ES5 | 阻止扩展 | 否 |
| `Object.seal(obj)` | ES5 | 密封 | 否 |
| `Object.setPrototypeOf(obj, proto)` | ES6 | 设置原型 | — |
| `Object.values(obj)` | ES2017 | 自身可枚举值数组 | 否 |

### 15.2 属性遍历方式对照表

| 方式 | 自身可枚举 | 自身不可枚举 | Symbol | 原型链 | 顺序保证 |
| --- | --- | --- | --- | --- | --- |
| `for...in` | 是 | 否 | 否 | 是 | 实现相关 |
| `Object.keys` | 是 | 否 | 否 | 否 | ES2020+ |
| `Object.values`/`entries` | 是 | 否 | 否 | 否 | ES2020+ |
| `Object.getOwnPropertyNames` | 是 | 是 | 否 | 否 | ES2020+ |
| `Object.getOwnPropertySymbols` | — | — | 是 | 否 | ES2020+ |
| `Reflect.ownKeys` | 是 | 是 | 是 | 否 | ES2020+ |

### 15.3 不可变性层级表

| 操作 | preventExtensions | seal | freeze | deepFreeze |
| --- | --- | --- | --- | --- |
| 添加属性 | 禁止 | 禁止 | 禁止 | 禁止（深层） |
| 删除属性 | 允许 | 禁止 | 禁止 | 禁止（深层） |
| 修改值 | 允许 | 允许 | 禁止 | 禁止（深层） |
| 修改描述符 | 允许 | 禁止 | 禁止 | 禁止（深层） |
| 修改原型 | 禁止 | 禁止 | 禁止 | — |
| 嵌套对象保护 | 否 | 否 | 否 | 是 |
| V8 性能影响 | 无 | 中 | 高（但读取快） | 高 |

### 15.4 TC39 提案状态参考（截至 2026-07）

| 提案 | 阶段 | 说明 |
| --- | --- | --- |
| `Object.groupBy` / `Map.groupBy` | Stage 4（ES2024） | 已标准化 |
| `Object.hasOwn` | Stage 4（ES2022） | 已标准化 |
| `Array.fromAsync` | Stage 4（ES2024） | 已标准化 |
| Change Array by Copy | Stage 4（ES2023） | `toReversed`/`toSorted` 等 |
| Symbols as WeakMap keys | Stage 4（ES2023） | Symbol 可作 WeakMap 键 |
| `Structs`（结构化类型） | Stage 2 | 可变值类型，未来可能影响对象模型 |

---

## 16. 修订日志

| 日期 | 版本 | 修订内容 | 修订人 |
| --- | --- | --- | --- |
| 2026-06-14 | v1.0 | 初版，覆盖基础 Object 静态方法 | fanquanpp |
| 2026-07-20 | v2.0 | 金标准升级：补充 12 项质量基准、TC39 时间线、形式化定义、5 个案例研究、性能基准、深度冻结/克隆实现 | FANDEX Content Engineering Team |

---

> **结语**：`Object` 静态方法是 JavaScript 工程师日常最频繁使用的 API 之一。理解其背后的属性描述符模型、原型链语义、不可变性层级与 TC39 演进历程，是写出健壮、可维护代码的基础。掌握 `Object.freeze` 与 `structuredClone` 的边界、`Object.assign` 的 setter 触发语义、`Object.groupBy` 的 null 原型返回值等细节，能在生产环境避免大量隐蔽 Bug。后续学习推荐结合 `Proxy`/`Reflect`（ES6 反射 API）与 `Symbol`（ES6 新原始类型）章节，构建完整的对象模型知识体系。
