---
order: 220
title: ES6+ 新特性
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: ES6 至 ES2024 重要新特性的形式化定义、工程实践与生产案例：解构赋值、展开运算符、Symbol、Proxy、可选链、空值合并、Records & Tuples、装饰器、模式匹配的完整剖析。
author: fanquanpp
updated: '2026-07-21'
related:
  - 'javascript/027-PromiseStaticMethod'
  - 'javascript/028-AsyncConcurrencyControl'
  - 'javascript/020-DeepShallowCopy'
  - 'javascript/049-DebounceThrottle'
  - 'javascript/034-ProxyReflectPractice'
prerequisites: []
---

## 前置知识

- [Object 扩展](/javascript/021-ObjectStaticMethods)：建议先完成前一篇的学习

## 学习目标

- 掌握「0. 引言」的核心机制、典型用法与常见陷阱
- 掌握「1. 历史动机与背景」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义」的核心机制、典型用法与常见陷阱
- 掌握「3. 理论推导」的核心机制、典型用法与常见陷阱
- 掌握「4. 代码示例」的核心机制、典型用法与常见陷阱


## 0. 引言

ECMAScript 自 2015 年发布 ES6（ES2015）以来，进入了一年一版的稳定迭代周期。每个版本引入的特性并非孤立的语法糖，而是围绕"提升表达力、强化类型语义、改善异步编程模型、降低样板代码"四大主线的系统性演进。本文档以形式化视角梳理 ES6 至 ES2024 的核心特性，给出每一特性的动机、语义、推导、工程化用法与陷阱。

理解 ES6+ 不仅是掌握语法，更是理解 TC39 委员会的演进哲学：**Stage 0-4 提案流程**确保每个特性经过社区辩论、原型实现、生产验证后才进入规范。这种渐进式标准化使 JavaScript 在保持向后兼容的同时持续演进。

---

## 1. 历史动机与背景

### 1.1 TC39 标准化流程

TC39（Technical Committee 39）是 Ecma International 下负责 ECMAScript 标准的技术委员会。其标准化流程分为 5 个阶段：

| Stage | 名称 | 含义 | 进入条件 |
|-------|------|------|----------|
| 0 | Strawman | 提案想法 | TC39 成员提交 |
| 1 | Proposal | 正式提案，明确问题与解决方案 | Champion（倡导者）确认 |
| 2 | Draft | 草案，初步规范文本 | 跨实现共识 |
| 3 | Candidate | 候选，规范完整，等待实现反馈 | 规范审稿人签字 |
| 4 | Finished | 完成，进入下一年版规范 | 至少两个生产实现 |

这一流程确保每个特性在进入规范前经过充分的工程验证。开发者可参考 https://github.com/tc39/proposals 跟踪最新提案。

### 1.2 ES6+ 演进时间线

| 版本 | 年份 | 关键特性 | 主要动机 |
|------|------|---------|---------|
| ES6/ES2015 | 2015 | let/const、箭头函数、解构、Symbol、Proxy、Promise、生成器、迭代器、class、模块、模板字符串、默认参数、Map/Set | 现代化语言基础 |
| ES7/ES2016 | 2016 | Array.prototype.includes、指数运算符 `**` | 小幅增量 |
| ES8/ES2017 | 2017 | async/await、Object.entries/values、字符串 padStart/padEnd、SharedArrayBuffer、Atomics | 异步同步化、并行计算 |
| ES9/ES2018 | 2018 | 异步迭代、rest/spread for objects、Promise.finally、正则改进 | 异步流式处理 |
| ES10/ES2019 | 2019 | flat/flatMap、Object.fromEntries、trimStart/trimEnd、Symbol.description、可选 catch 绑定 | API 补全 |
| ES11/ES2020 | 2020 | 可选链 `?.`、空值合并 `??`、BigInt、动态 import()、globalThis、Promise.allSettled、String.matchAll | 安全访问、大整数 |
| ES12/ES2021 | 2021 | 逻辑赋值、数字分隔符、WeakRef、FinalizationRegistry、String.replaceAll、Promise.any | 语法糖、内存管理 |
| ES13/ES2022 | 2022 | 类字段、私有方法 `#`、顶层 await、Object.hasOwn、Array.at、Error.cause | 类系统完善 |
| ES14/ES2023 | 2023 | Hashbang 语法、WeakMap.prototype.get 的回调、Array.findLast/findLastIndex、Symbols as WeakMap keys | 数组改进 |
| ES15/ES2024 | 2024 | Promise.withResolvers、Object.groupBy、Map.groupBy、String.isWellFormed、Resizable ArrayBuffer、Well-formed Unicode | 数据分组、内存弹性 |

### 1.3 ES6 是分水岭

ES6 之前 JavaScript 长期停滞（1999-2015），ES3 到 ES5 用了 10 年。ES6 引入了：

- **块级作用域**：`let/const` 解决 `var` 提升与函数作用域问题
- **模块系统**：原生 ES Modules 取代 CommonJS/AMD/UMD
- **类语法**：class 语法糖取代 prototype 链式写法
- **Promise**：异步编程模型标准化
- **迭代器协议**：统一可迭代对象接口

这一版本让 JavaScript 从脚本语言升级为可承载大型应用的语言。

---

## 2. 形式化定义

### 2.1 解构赋值的形式化

解构赋值（Destructuring Assignment）是一种**模式匹配绑定**（Pattern Matching Binding）。给定模式 $P$ 与值 $v$，解构过程是一个匹配函数 $\text{match}(P, v) \to \text{Env}$，其中 $\text{Env}$ 是变量绑定环境。

模式 $P$ 的语法定义：

$$
P ::= \text{Identifier} \mid [P_1, \ldots, P_n] \mid \{k_1: P_1, \ldots, k_n: P_n\} \mid P \text{ default } e
$$

匹配规则：

$$
\text{match}(\text{id}, v) = [\text{id} \mapsto v]
$$

$$
\text{match}([P_1, \ldots, P_n], v) = \bigcup_{i=1}^{n} \text{match}(P_i, v[i])
$$

$$
\text{match}(\{k: P\}, v) = \text{match}(P, v[k])
$$

$$
\text{match}(P \text{ default } e, v) = \begin{cases}
\text{match}(P, v) & \text{if } v \neq \text{undefined} \\
\text{match}(P, e) & \text{otherwise}
\end{cases}
$$

### 2.2 Symbol 的代数结构

Symbol 是 ES6 引入的第 7 种原始类型，其代数性质如下：

- **唯一性**：`Symbol() !== Symbol()`（除非使用 `Symbol.for(key)` 全局注册表）
- **不可枚举**：`for...in` 与 `Object.keys` 不遍历 Symbol 键
- **不可构造**：`new Symbol()` 抛出 TypeError
- **可作键**：作为对象属性键时，不会被字符串方法访问

形式化地，Symbol 集合 $\mathbb{S}$ 满足：

$$
\forall s_1, s_2 \in \mathbb{S}: s_1 = s_2 \iff \exists k \in \text{String}: s_1 = \text{Symbol.for}(k) \land s_2 = \text{Symbol.for}(k)
$$

内置 Symbol（Well-known Symbols）如 `Symbol.iterator`、`Symbol.asyncIterator`、`Symbol.toPrimitive` 等是协议钩子（Protocol Hooks），允许对象自定义与运算符交互的行为。

### 2.3 Proxy 的形式化

Proxy 是 ES6 引入的元编程（Metaprogramming）机制，形式化为一个**拦截器函数集合**：

$$
\text{Proxy}(target, handlers) = \{ f_{\text{trap}} : \text{trap} \in \text{Traps} \}
$$

其中 $\text{Traps} = \{\text{get}, \text{set}, \text{has}, \text{deleteProperty}, \text{ownKeys}, \text{getOwnPropertyDescriptor}, \text{defineProperty}, \text{getPrototypeOf}, \text{setPrototypeOf}, \text{isExtensible}, \text{preventExtensions}, \text{apply}, \text{construct}\}$。

每个 trap 对应一个内部方法（Internal Method），如 `[[Get]]`、`[[Set]]`、`[[HasProperty]]` 等。Proxy 通过拦截这些内部方法实现对象行为的自定义。

### 2.4 可选链的形式化

可选链 `a?.b` 的语义可定义为：

$$
a?.b = \begin{cases}
\text{undefined} & \text{if } a = \text{null} \lor a = \text{undefined} \\
a.b & \text{otherwise}
\end{cases}
$$

对于函数调用 `a?.()`：

$$
a?.() = \begin{cases}
\text{undefined} & \text{if } a = \text{null} \lor a = \text{undefined} \\
a() & \text{otherwise}
\end{cases}
$$

注意：可选链短路后续所有访问，即 `a?.b.c.d` 在 `a` 为 nullish 时整体返回 undefined，不会访问 `b.c.d`。

### 2.5 空值合并的形式化

空值合并 `a ?? b` 的语义：

$$
a ?? b = \begin{cases}
b & \text{if } a \in \{\text{null}, \text{undefined}\} \\
a & \text{otherwise}
\end{cases}
$$

与 `||` 的区别：

$$
a || b = \begin{cases}
b & \text{if } a \in \mathcal{F} \text{ (Falsy 集合)} \\
a & \text{otherwise}
\end{cases}
$$

其中 $\mathcal{F} = \{\text{false}, 0, -0, 0n, \text{''}, \text{null}, \text{undefined}, \text{NaN}\}$。

### 2.6 顶层 await 的形式化

顶层 await（Top-level Await, ES2022）允许在 ES Module 顶层使用 `await`，其语义等价于将整个模块视为一个异步函数：

$$
\text{Module}_M = \text{async function } M() \{ \ldots \text{ module body } \ldots \}
$$

模块依赖图中的循环依赖会因顶层 await 而阻塞，规范定义了循环依赖的求值顺序：

$$
\text{EvalOrder}(G) = \text{TopologicalSortWithCycleDetection}(G)
$$

### 2.7 类字段的形式化

ES2022 类字段语法：

```javascript
class C {
  x = 1;          // 实例字段
  static y = 2;   // 静态字段
  #z = 3;         // 私有实例字段
  static #w = 4;  // 私有静态字段
}
```

形式化为类定义 $\mathcal{C} = (F_i, F_s, P_i, P_s, M)$，其中：

- $F_i$：实例字段集合
- $F_s$：静态字段集合
- $P_i$：私有实例字段集合（带 `#` 前缀）
- $P_s$：私有静态字段集合
- $M$：方法集合

私有字段的访问控制由规范在编译期强制：类外部访问 `#z` 抛出 SyntaxError，而非运行时 TypeError，这使得私有性是真正的私有（无法通过 `Object.keys` 或 Proxy 绕过）。

---

## 3. 理论推导

### 3.1 模块系统的数学模型

ES Module 是一个有向无环图（DAG）的求值系统。给定模块依赖图 $G = (V, E)$，其中 $V$ 是模块集合，$E$ 是依赖关系：

$$
(m_1, m_2) \in E \iff m_1 \text{ imports from } m_2
$$

模块求值遵循以下规则：

1. **深度优先**：从入口模块开始，递归求值依赖。
2. **循环检测**：遇到已开始但未完成的模块时，返回其当前的 live binding（可能为 undefined）。
3. **缓存**：每个模块仅求值一次，结果被所有依赖者共享。

CommonJS 与 ES Module 的核心差异：

| 维度 | CommonJS | ES Module |
|------|----------|-----------|
| 求值时机 | 运行时（require 调用时） | 静态（编译期分析） |
| 导出语义 | 值拷贝（基本类型） | Live binding（引用） |
| 循环依赖 | 可能返回空对象 | 返回 live binding（可能未初始化） |
| Tree-shaking | 不支持（动态 require） | 支持（静态分析） |
| 顶层 await | 不支持 | 支持（ES2022） |
| 异步加载 | 动态 `require()` | `import()` 表达式 |

### 3.2 Proxy 的代理不变量

Proxy 必须维持一系列**不变量**（Invariants），否则抛出 TypeError。这些不变量保证 Proxy 不会破坏 JS 类型系统的基本规则：

1. **不可扩展性**：若 target 不可扩展，则 `defineProperty` 不能添加新属性。
2. **不可配置性**：若 target 属性不可配置，则 `getOwnPropertyDescriptor` 必须返回真实描述符。
3. **不可写性**：若 target 属性不可写，则 `set` 必须返回 false 且不改变属性值。
4. **原型一致性**：若 target 不可扩展，则 `getPrototypeOf` 必须返回真实原型。
5. **函数可调用性**：若 target 不是函数，则 `apply` trap 不能被触发。

这些不变量使得 Proxy 在元编程时仍保持类型安全。

### 3.3 异步迭代器的协程语义

异步迭代器协议的形式化：

$$
\text{AsyncIterator} = \{ \text{next}: () \to \text{Promise}\langle\text{IteratorResult}\rangle \}
$$

其中：

$$
\text{IteratorResult} = \{ \text{done}: \text{boolean}, \text{value}: T \}
$$

`for await...of` 循环的语义可表达为：

$$
\text{ForAwait}(it, body, \sigma) = \begin{cases}
\sigma' & \text{if } \text{await } it.next() = \{ \text{done}: \text{true} \} \\
\text{ForAwait}(it, body, \sigma'') & \text{if } \text{await } it.next() = \{ \text{done}: \text{false}, \text{value}: v \} \\
& \quad \text{and } \langle body(v), \sigma \rangle \to \langle \text{NormalCompletion}, \sigma' \rangle \\
\text{await } it.return(e) & \text{if break/return/throw}
\end{cases}
$$

这一机制使异步数据源（如分页 API、流式数据）可以像同步数组一样遍历。

### 3.4 WeakRef 与垃圾回收

WeakRef（ES2021）允许持有对对象的弱引用，不阻止垃圾回收：

$$
\text{WeakRef}(target) = \text{WeakReference}(target)
$$

`deref()` 方法返回目标对象或 undefined（若已被回收）：

$$
\text{weakRef.deref}() = \begin{cases}
target & \text{if target not yet GC'd} \\
\text{undefined} & \text{otherwise}
\end{cases}
$$

FinalizationRegistry 允许在对象被回收时执行回调：

$$
\text{FinalizationRegistry}(callback) = \text{Registry}\{ \text{register}(target, heldValue, unregisterToken) \}
$$

当 target 被回收时，callback(heldValue) 会被调度执行（不保证时机）。

**警告**：WeakRef 与 FinalizationRegistry 的行为高度依赖 GC 实现，不同引擎行为差异巨大。生产中应避免依赖其精确语义，主要用于缓存与资源清理的"尽力而为"场景。

### 3.5 Records & Tuples 提案的形式化

Records & Tuples 是 Stage 2 提案（截至 2024 年），引入**不可变**的原始值类型：

```javascript
const record = #{ x: 1, y: 2 };        // Record
const tuple = #[1, 2, 3];              // Tuple
console.assert(#{ x: 1 } === #{ x: 1 }); // true，按值比较
```

形式化地，Record $r$ 与 Tuple $t$ 满足：

$$
r_1 = r_2 \iff \forall k \in \text{keys}(r_1): r_1[k] = r_2[k]
$$

$$
t_1 = t_2 \iff |t_1| = |t_2| \land \forall i: t_1[i] = t_2[i]
$$

这与 JavaScript 对象的引用相等性截然不同：

$$
\{x: 1\} \neq \{x: 1\} \quad \text{(对象按引用比较)}
$$

Records & Tuples 的引入使 JavaScript 具备真正的不可变值语义，对函数式编程、React 状态管理、深度相等比较有革命性影响。

---

## 4. 代码示例

### 4.1 let/const 与块级作用域

```javascript
// 示例 5.1：let/const 的块级作用域与 TDZ
// 演示 var 提升、let 暂时性死区、const 不可重新赋值

// 1. var 的函数作用域与提升
function varExample() {
  console.log(x); // undefined（已提升，未赋值）
  var x = 1;
  if (true) {
    var x = 2; // 同一作用域的 x
  }
  console.log(x); // 2
}

// 2. let 的块级作用域
function letExample() {
  // console.log(y); // ReferenceError: TDZ
  let y = 1;
  if (true) {
    let y = 2; // 不同作用域的 y
    console.log(y); // 2
  }
  console.log(y); // 1
}

// 3. const 的不可重新赋值（但对象内容可变）
function constExample() {
  const obj = { x: 1 };
  // obj = { x: 2 }; // TypeError: Assignment to constant
  obj.x = 2;          // OK，修改属性而非重新赋值
  console.log(obj.x); // 2

  const arr = [1, 2, 3];
  arr.push(4); // OK
  console.log(arr); // [1, 2, 3, 4]
}

// 4. 循环中的 let vs var
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0 1 2（每次迭代新绑定）
}
for (var j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 0); // 3 3 3（共享绑定）
}
```

### 4.2 解构赋值的多种用法

```javascript
// 示例 5.2：解构赋值的完整用法
// 演示数组、对象、嵌套、默认值、剩余元素、函数参数

// 1. 数组解构
const [a, b, c] = [1, 2, 3];
console.log(a, b, c); // 1 2 3

// 2. 跳过元素
const [first, , third] = [1, 2, 3];
console.log(first, third); // 1 3

// 3. 默认值
const [x = 10, y = 20] = [1];
console.log(x, y); // 1 20

// 4. 剩余元素
const [head, ...tail] = [1, 2, 3, 4];
console.log(head, tail); // 1 [2, 3, 4]

// 5. 对象解构
const { name, age } = { name: 'Alice', age: 30 };
console.log(name, age); // Alice 30

// 6. 重命名
const { name: userName } = { name: 'Bob' };
console.log(userName); // Bob

// 7. 嵌套解构
const {
  user: { name: n, address: { city } },
} = { user: { name: 'Carol', address: { city: 'Beijing' } } };
console.log(n, city); // Carol Beijing

// 8. 函数参数解构（命名参数）
function createUser({ name, age = 18, role = 'user' } = {}) {
  return { name, age, role };
}
console.log(createUser({ name: 'Dave' })); // { name: 'Dave', age: 18, role: 'user' }

// 9. 交换变量
let p = 1, q = 2;
[p, q] = [q, p];
console.log(p, q); // 2 1
```

### 4.3 展开与剩余运算符

```javascript
// 示例 5.3：展开与剩余运算符的应用
// 演示数组展开、对象展开、函数参数合并

// 1. 数组展开
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];
console.log(arr2); // [1, 2, 3, 4, 5]

// 2. 对象展开（ES2018+）
const obj1 = { a: 1, b: 2 };
const obj2 = { ...obj1, c: 3 };
console.log(obj2); // { a: 1, b: 2, c: 3 }

// 3. 对象展开的覆盖语义
const defaults = { timeout: 1000, retry: 3 };
const custom = { retry: 5 };
const merged = { ...defaults, ...custom };
console.log(merged); // { timeout: 1000, retry: 5 }

// 4. 函数参数中的剩余参数
function sum(...nums) {
  return nums.reduce((a, b) => a + b, 0);
}
console.log(sum(1, 2, 3, 4)); // 10

// 5. 函数参数中的展开
function add(a, b, c) {
  return a + b + c;
}
const args = [1, 2, 3];
console.log(add(...args)); // 6

// 6. 浅拷贝陷阱
const original = { items: [1, 2] };
const copied = { ...original };
copied.items.push(3);
console.log(original.items); // [1, 2, 3]（共享引用）
```

### 4.4 Symbol 的应用

```javascript
// 示例 5.4：Symbol 的多种应用场景
// 演示唯一性、内置 Symbol、全局注册表

// 1. 唯一键避免冲突
const SIZE = Symbol('size');
class Stack {
  constructor() {
    this[SIZE] = 0;
    this.items = [];
  }
  push(item) {
    this.items.push(item);
    this[SIZE]++;
  }
  get size() {
    return this[SIZE];
  }
}
const stack = new Stack();
stack.push('a');
console.log(stack.size); // 1
console.log(Object.keys(stack)); // ['items']，Symbol 键不出现

// 2. 自定义迭代器
class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        return current <= end
          ? { value: current++, done: false }
          : { done: true };
      },
    };
  }
}
console.log([...new Range(1, 5)]); // [1, 2, 3, 4, 5]

// 3. 自定义原始值转换
class Money {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return this.amount;
    if (hint === 'string') return `${this.amount} ${this.currency}`;
    return this.amount;
  }
}
const m = new Money(100, 'CNY');
console.log(+m);      // 100（number hint）
console.log(`${m}`); // "100 CNY"（string hint）
console.log(m + 0);  // 100（default hint）

// 4. 全局注册表
const sym1 = Symbol.for('shared');
const sym2 = Symbol.for('shared');
console.log(sym1 === sym2); // true
console.log(Symbol.keyFor(sym1)); // 'shared'
```

### 4.5 Proxy 实现响应式系统

```javascript
// 示例 5.5：基于 Proxy 的响应式数据系统
// 类似 Vue 3 的 reactivity 实现

function reactive(target) {
  const deps = new Map(); // 属性 -> 依赖集合

  function track(key) {
    if (activeEffect) {
      if (!deps.has(key)) deps.set(key, new Set());
      deps.get(key).add(activeEffect);
    }
  }

  function trigger(key) {
    if (deps.has(key)) {
      deps.get(key).forEach((effect) => effect());
    }
  }

  return new Proxy(target, {
    get(obj, key, receiver) {
      track(key);
      const result = Reflect.get(obj, key, receiver);
      return typeof result === 'object' && result !== null
        ? reactive(result)
        : result;
    },
    set(obj, key, value, receiver) {
      const result = Reflect.set(obj, key, value, receiver);
      trigger(key);
      return result;
    },
  });
}

let activeEffect = null;
function effect(fn) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}

// 使用
const state = reactive({ count: 0, name: 'Alice' });
effect(() => {
  console.log(`count 变化：${state.count}`);
});
state.count = 1; // 输出：count 变化：1
state.count = 2; // 输出：count 变化：2
```

### 4.6 可选链与空值合并的组合

```javascript
// 示例 5.6：深层属性访问的安全写法
// 演示 ?. 与 ?? 的组合应用

const user = {
  profile: {
    name: 'Alice',
    address: null,
  },
};

// 反模式：深层嵌套判断
function getCityBad(user) {
  if (user && user.profile && user.profile.address && user.profile.address.city) {
    return user.profile.address.city;
  }
  return 'Unknown';
}

// 正确写法：可选链 + 空值合并
function getCityGood(user) {
  return user?.profile?.address?.city ?? 'Unknown';
}

console.log(getCityBad(user));  // 'Unknown'
console.log(getCityGood(user)); // 'Unknown'

// 函数调用的可选链
const api = {
  fetchData: null,
};
const result = api.fetchData?.() ?? 'default data';
console.log(result); // 'default data'

// 数组访问的可选链
const arr = null;
console.log(arr?.[0] ?? 'empty'); // 'empty'

// 逻辑赋值（ES2021）
const config = {};
config.timeout ??= 3000;
config.retry ||= 3;
console.log(config); // { timeout: 3000, retry: 3 }
```

### 4.7 私有字段与方法

```javascript
// 示例 5.7：ES2022 私有字段与方法
// 演示真正的私有性（无法从外部访问）

class BankAccount {
  #balance; // 私有实例字段
  static #MIN_BALANCE = 0; // 私有静态字段

  constructor(initialBalance = 0) {
    this.#balance = initialBalance;
  }

  // 私有方法
  #validateAmount(amount) {
    if (amount <= 0) throw new Error('金额必须为正');
    if (this.#balance - amount < BankAccount.#MIN_BALANCE) {
      throw new Error('余额不足');
    }
  }

  deposit(amount) {
    if (amount <= 0) throw new Error('存款金额必须为正');
    this.#balance += amount;
    return this.#balance;
  }

  withdraw(amount) {
    this.#validateAmount(amount);
    this.#balance -= amount;
    return this.#balance;
  }

  get balance() {
    return this.#balance;
  }

  // 静态工厂方法
  static #createSavings(initial) {
    return new BankAccount(initial);
  }

  static createSavingsAccount(initial = 100) {
    return BankAccount.#createSavings(initial);
  }
}

const acc = new BankAccount(1000);
acc.deposit(500);
console.log(acc.balance); // 1500
acc.withdraw(200);
console.log(acc.balance); // 1300
// console.log(acc.#balance); // SyntaxError: Private field
// acc.#validateAmount(100);   // SyntaxError
```

### 4.8 顶层 await

```javascript
// 示例 5.8：顶层 await 在 ES Module 中的应用
// 文件：config.js（ES Module）

// 顶层 await：模块加载时执行
const config = await fetch('/api/config').then((r) => r.json());

export default config;

// 文件：app.js
import config from './config.js';
console.log('配置已加载', config);
// 注意：app.js 会等待 config.js 的顶层 await 完成后才执行
```

### 4.9 异步迭代器与流式处理

```javascript
// 示例 5.9：异步迭代器实现流式数据处理
// 演示 for await...of 与自定义异步迭代器

class AsyncLineReader {
  constructor(stream) {
    this.stream = stream;
    this.buffer = '';
  }

  async *[Symbol.asyncIterator]() {
    for await (const chunk of this.stream) {
      this.buffer += chunk;
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop();
      for (const line of lines) {
        yield line;
      }
    }
    if (this.buffer) yield this.buffer;
  }
}

// 模拟流
async function* mockStream() {
  const chunks = ['line1\nline2\n', 'line3\n', 'line4\nline5'];
  for (const chunk of chunks) {
    yield chunk;
    await new Promise((r) => setTimeout(r, 10));
  }
}

// 使用
const reader = new AsyncLineReader(mockStream());
const lines = [];
for await (const line of reader) {
  lines.push(line);
  console.log(`读取：${line}`);
}
console.log(`总计 ${lines.length} 行`); // 5
```

### 4.10 Promise.allSettled 与 Promise.any

```javascript
// 示例 5.10：Promise.allSettled 与 Promise.any 的应用
// 演示批量请求的不同语义

const tasks = [
  fetch('https://api.example.com/users').then((r) => r.json()),
  fetch('https://api.example.com/orders').then((r) => r.json()),
  fetch('https://api.example.com/products').then((r) => r.json()),
];

// Promise.all：任一失败则整体失败
try {
  const [users, orders, products] = await Promise.all(tasks);
  console.log('全部成功', { users, orders, products });
} catch (err) {
  console.error('至少一个失败', err);
}

// Promise.allSettled：等待全部完成（无论成功失败）
const results = await Promise.allSettled(tasks);
for (const r of results) {
  if (r.status === 'fulfilled') {
    console.log('成功', r.value);
  } else {
    console.error('失败', r.reason);
  }
}

// Promise.any：任一成功即返回（ES2021）
try {
  const first = await Promise.any([
    fetch('https://backup1.example.com/data').then((r) => r.json()),
    fetch('https://backup2.example.com/data').then((r) => r.json()),
    fetch('https://backup3.example.com/data').then((r) => r.json()),
  ]);
  console.log('首个成功', first);
} catch (err) {
  // AggregateError：所有 Promise 都失败
  console.error('全部失败', err.errors);
}
```

### 4.11 类字段与静态初始化块

```javascript
// 示例 5.11：ES2022 类字段语法
// 演示实例字段、静态字段、静态初始化块

class Logger {
  // 实例字段
  level = 'info';
  logs = [];

  // 静态字段
  static instances = 0;
  static #config = { format: 'json' };

  // 静态初始化块（ES2022）
  static {
    // 类定义时执行，用于复杂静态初始化
    try {
      const envConfig = process.env.LOGGER_CONFIG;
      if (envConfig) {
        Logger.#config = JSON.parse(envConfig);
      }
    } catch (e) {
      console.warn('Logger 配置加载失败，使用默认值');
    }
  }

  constructor(name) {
    this.name = name;
    Logger.instances++;
  }

  log(message) {
    const entry = { time: new Date().toISOString(), level: this.level, message };
    this.logs.push(entry);
    console.log(JSON.stringify(entry));
  }

  static get config() {
    return { ...Logger.#config };
  }
}

const logger = new Logger('app');
logger.log('应用启动');
console.log(Logger.instances); // 1
console.log(Logger.config);    // { format: 'json' }
```

### 4.12 数字分隔符与 BigInt

```javascript
// 示例 5.12：数字分隔符与 BigInt
// 演示大数字的可读性与精确计算

// 数字分隔符（ES2021）
const billion = 1_000_000_000;
const bytes = 0xff_ff_ff_ff;
const mask = 0b1111_1111_1111_1111;
const pi = 3.141_592_653_589_793;
console.log(billion, bytes, mask, pi);

// BigInt（ES2020）：任意精度整数
const max = 2n ** 53n + 1n; // 超过 Number.MAX_SAFE_INTEGER
console.log(max);                       // 9007199254740993n
console.log(Number.MAX_SAFE_INTEGER);  // 9007199254740991
console.log(max === 9007199254740993n); // true

// BigInt 不能与 Number 直接运算
// console.log(1n + 1); // TypeError
console.log(1n + 1n);   // 2n
console.log(Number(1n) + 1); // 2（需显式转换）

// 大数计算：阶乘
function factorialBig(n) {
  let result = 1n;
  for (let i = 2n; i <= n; i++) {
    result *= i;
  }
  return result;
}
console.log(factorialBig(100n)); // 93326215443944152681699238856266700...
```

### 4.13 Object.groupBy 与 Map.groupBy

```javascript
// 示例 5.13：ES2024 数据分组方法
// 演示 Object.groupBy 与 Map.groupBy

const users = [
  { name: 'Alice', dept: 'eng', level: 5 },
  { name: 'Bob', dept: 'eng', level: 3 },
  { name: 'Carol', dept: 'sales', level: 4 },
  { name: 'Dave', dept: 'sales', level: 2 },
  { name: 'Eve', dept: 'hr', level: 3 },
];

// Object.groupBy：按键分组，返回对象
const byDept = Object.groupBy(users, (u) => u.dept);
console.log(byDept);
// {
//   eng: [{ name: 'Alice', ... }, { name: 'Bob', ... }],
//   sales: [{ name: 'Carol', ... }, { name: 'Dave', ... }],
//   hr: [{ name: 'Eve', ... }]
// }

// Map.groupBy：返回 Map，键可以是任意类型
const byLevel = Map.groupBy(users, (u) => u.level);
console.log(byLevel.get(3)); // [Bob, Eve]

// 应用：按多个维度分组
const byDeptLevel = Map.groupBy(
  users,
  (u) => `${u.dept}-${u.level}`
);
console.log(byDeptLevel.get('eng-3')); // [Bob]
```

---

## 5. 对比分析

### 5.1 var vs let vs const

| 特性 | var | let | const |
|------|-----|-----|-------|
| 作用域 | 函数 | 块 | 块 |
| 提升 | 是（初始化为 undefined） | 否（TDZ） | 否（TDZ） |
| 重复声明 | 允许 | 禁止 | 禁止 |
| 重新赋值 | 允许 | 允许 | 禁止 |
| 全局对象属性 | 是（window.x） | 否 | 否 |
| 初始值要求 | 否 | 否 | 是 |
| 适用场景 | 旧代码迁移 | 可变变量 | 不可变绑定 |

### 5.2 Promise.all vs allSettled vs any vs race

| 方法 | 行为 | 失败处理 | 适用场景 |
|------|------|---------|---------|
| `Promise.all` | 全部成功才成功 | 任一失败即失败 | 必须全部成功的强一致场景 |
| `Promise.allSettled` | 全部完成（无论成功失败） | 不抛错，返回 status | 批量操作，需统计失败 |
| `Promise.any` | 任一成功即成功 | 全失败才失败（AggregateError） | 多源竞速，任一可用即可 |
| `Promise.race` | 第一个完成（无论成功失败） | 透传第一个结果或错误 | 超时控制、竞速 |

### 5.3 Object.assign vs 展开运算符 vs structuredClone

| 特性 | Object.assign | 展开运算符 | structuredClone |
|------|---------------|-----------|-----------------|
| 浅/深拷贝 | 浅 | 浅 | 深 |
| 修改源对象 | 否 | 否 | 否 |
| 支持 Symbol 键 | 是 | 是 | 是 |
| 支持函数 | 是（按引用复制） | 是 | 抛错（不可克隆） |
| 支持日期 | 是（按引用复制） | 是 | 是（深拷贝） |
| 支持 Map/Set | 否 | 否 | 是 |
| 性能 | 最快 | 快 | 慢（深度遍历） |
| 浏览器支持 | ES6+ | ES2018+ | 现代浏览器 |

### 5.4 箭头函数 vs 普通函数

| 特性 | 箭头函数 | 普通函数 |
|------|---------|---------|
| this 绑定 | 词法（继承外层） | 动态（调用时确定） |
| arguments | 无（用剩余参数） | 有 |
| new.target | 无 | 有 |
| prototype | 无 | 有 |
| 构造调用 | 抛 TypeError | 支持 |
| yield | 不支持 | 支持（生成器函数） |
| 适用场景 | 回调、纯函数 | 方法、构造函数、生成器 |

### 5.5 Map vs Object

| 特性 | Map | Object |
|------|-----|--------|
| 键类型 | 任意（含对象、Symbol） | 字符串或 Symbol |
| 顺序 | 插入顺序 | 字符串键顺序（整数先、然后字符串、最后 Symbol） |
| 大小 | `.size` | `Object.keys().length` |
| 迭代 | 直接 iterable | `Object.entries()` |
| 性能（频繁增删） | 优 | 差 |
| 性能（少量键访问） | 中 | 优（V8 内联缓存） |
| 序列化 | 需手动转换 | JSON.stringify 原生支持 |
| 默认原型 | 无 | Object.prototype |

---

## 6. 常见陷阱与反模式

### 6.1 解构默认值的 falsy 陷阱

```javascript
// 反模式：解构默认值仅在 undefined 时生效
function process({ count = 10 } = {}) {
  console.log(count);
}
process({ count: 0 });    // 0（不是 10，因为 0 不是 undefined）
process({ count: '' });  // ''（同上）
process({ count: null }); // null（同上）
process({});              // 10
process();                // 10

// 正确写法：如需在 falsy 时使用默认值，用 ?? 单独处理
function processSafe({ count } = {}) {
  const c = count ?? 10;
  console.log(c);
}
processSafe({ count: 0 });   // 0（保留合法 0）
processSafe({ count: null }); // 10
```

### 6.2 箭头函数中的 this 误用

```javascript
// 反模式：在对象方法中使用箭头函数，this 不绑定对象
const obj = {
  name: 'Alice',
  // 箭头函数的 this 是外层（全局/undefined in strict mode）
  greet: () => console.log(`Hello, ${this.name}`),
};
obj.greet(); // "Hello, undefined"

// 正确写法：使用普通函数或方法简写
const obj2 = {
  name: 'Alice',
  greet() {
    console.log(`Hello, ${this.name}`);
  },
};
obj2.greet(); // "Hello, Alice"

// 箭头函数的合理场景：回调中保留外层 this
class Counter {
  constructor() {
    this.count = 0;
  }
  start() {
    // 箭头函数保留 Counter 实例的 this
    setInterval(() => {
      this.count++;
      console.log(this.count);
    }, 1000);
  }
}
```

### 6.3 展开运算符的浅拷贝陷阱

```javascript
// 反模式：展开运算符只做浅拷贝
const original = {
  user: { name: 'Alice', address: { city: 'Beijing' } },
};
const copied = { ...original };
copied.user.address.city = 'Shanghai';
console.log(original.user.address.city); // 'Shanghai'（被污染）

// 正确写法 1：深拷贝（无函数/日期等特殊类型时）
const deep1 = JSON.parse(JSON.stringify(original));

// 正确写法 2：structuredClone（ES2022+）
const deep2 = structuredClone(original);

// 正确写法 3：递归展开
function deepSpread(obj) {
  return Array.isArray(obj)
    ? obj.map(deepSpread)
    : obj && typeof obj === 'object'
    ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepSpread(v)]))
    : obj;
}
```

### 6.4 Symbol 不是私有的

```javascript
// 反模式：误以为 Symbol 是私有属性
class User {
  constructor(name) {
    this[Symbol('id')] = generateId();
    this.name = name;
  }
}
const u = new User('Alice');
// Symbol 仍可通过 Object.getOwnPropertySymbols 访问
const symbols = Object.getOwnPropertySymbols(u);
console.log(symbols); // [Symbol(id)]
// console.log(u[symbols[0]]); // 可访问

// 正确写法：使用私有字段（ES2022）
class UserSafe {
  #id;
  constructor(name) {
    this.#id = generateId();
    this.name = name;
  }
  getId() {
    return this.#id;
  }
}
```

### 6.5 Proxy 的性能陷阱

```javascript
// 反模式：在热路径上深度代理大型对象
function deepReactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const v = Reflect.get(target, key, receiver);
      // 递归代理导致每次访问都创建新 Proxy
      return typeof v === 'object' && v !== null ? deepReactive(v) : v;
    },
  });
}
const bigData = deepReactive(hugeArray);
// 每次 bigData[0].field 访问都创建新 Proxy 对象

// 正确写法：缓存代理对象
const proxyCache = new WeakMap();
function cachedReactive(obj) {
  if (proxyCache.has(obj)) return proxyCache.get(obj);
  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      const v = Reflect.get(target, key, receiver);
      return typeof v === 'object' && v !== null ? cachedReactive(v) : v;
    },
  });
  proxyCache.set(obj, proxy);
  return proxy;
}
```

### 6.6 模块循环依赖的陷阱

```javascript
// 文件：a.js
import { b } from './b.js';
export const a = 1;
console.log('a.js loaded, b =', b); // 可能输出 'b.js loaded, b = undefined'

// 文件：b.js
import { a } from './a.js';
export const b = 2;
console.log('b.js loaded, a =', a); // 可能输出 'a.js loaded, a = undefined'

// 反模式：在循环依赖中访问尚未初始化的导出
// 正确做法：
// 1. 重构模块结构，避免循环
// 2. 将共享逻辑提取到第三方模块
// 3. 使用函数延迟访问（live binding 在求值完成后可正确读取）
```

### 6.7 Promise.all 的失败被吞

```javascript
// 反模式：Promise.all 失败后，其他 Promise 仍会执行但结果被吞
const tasks = [
  fetch('/api/1').then((r) => r.json()),
  fetch('/api/2').then((r) => { throw new Error('fail'); }),
  fetch('/api/3').then((r) => r.json()),
];
try {
  await Promise.all(tasks);
} catch (err) {
  // api/3 的请求仍会发起，但其结果无法获取
  console.error(err);
}

// 正确写法：使用 allSettled 收集所有结果
const results = await Promise.allSettled(tasks);
results.forEach((r) => {
  if (r.status === 'rejected') console.error(r.reason);
});
```

### 6.8 私有字段不可枚举且不可继承

```javascript
// 反模式：误以为私有字段可被继承或通过 Object.keys 访问
class Base {
  #private = 1;
  getPrivate() {
    return this.#private;
  }
}
class Derived extends Base {
  test() {
    // return this.#private; // SyntaxError: 私有字段不可访问
    return this.getPrivate(); // OK，通过公共方法
  }
}

// 私有字段不会出现在 Object.keys / for...in 中
const d = new Derived();
console.log(Object.keys(d)); // []
```

---

## 7. 工程实践

### 7.1 升级策略

#### 7.1.1 Babel 配置

```json
// .babelrc
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": { "node": "current", "browsers": ["> 1%", "not dead"] },
        "useBuiltIns": "usage",
        "corejs": 3
      }
    ]
  ],
  "plugins": [
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-proposal-private-methods",
    "@babel/plugin-proposal-top-level-await"
  ]
}
```

#### 7.1.2 TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "useDefineForClassFields": true,
    "experimentalDecorators": false,
    "strict": true,
    "downlevelIteration": true
  }
}
```

### 7.2 性能优化

#### 7.2.1 解构的性能特征

V8 8.0+ 优化了解构的字段访问，使其接近直接访问：

```javascript
// 现代引擎下，两者性能接近
const { x, y } = point;
// vs
const x = point.x;
const y = point.y;
```

但在循环中频繁解构大型对象时，建议缓存：

```javascript
// 优化：缓存属性访问
function process(items) {
  for (const item of items) {
    const { id, name, value } = item; // 一次性解构
    // 使用 id, name, value
  }
}
```

#### 7.2.2 Map vs Object 性能选型

```javascript
// 频繁增删场景：Map 更优
const map = new Map();
for (let i = 0; i < 10000; i++) {
  map.set(`key${i}`, i);
  if (i % 2 === 0) map.delete(`key${i - 1}`);
}

// 少量键访问场景：Object 更优（V8 内联缓存）
const obj = { a: 1, b: 2, c: 3 };
for (let i = 0; i < 1000000; i++) {
  obj.a; // 内联缓存命中
}
```

### 7.3 类型安全

#### 7.3.1 解构的类型推断

```typescript
interface User {
  name: string;
  age: number;
  address?: { city: string };
}

function process(user: User) {
  const { name, age, address: { city } = { city: 'Unknown' } } = user;
  // name: string
  // age: number
  // city: string
}
```

#### 7.3.2 私有字段与 TypeScript

```typescript
class Service {
  #apiKey: string; // 运行时私有
  private internalCache: Map<string, any>; // 仅编译时私有

  constructor(apiKey: string) {
    this.#apiKey = apiKey;
    this.internalCache = new Map();
  }
}
// #apiKey 在运行时也无法访问
// internalCache 在编译时被标记为 private，运行时可访问
```

### 7.4 异步模块加载

```javascript
// 路由级懒加载（React）
const Page = React.lazy(() => import('./Page'));

// 条件加载
async function loadPlugin(name) {
  const plugin = await import(`./plugins/${name}.js`);
  return plugin.default;
}

// 动态加载与错误处理
async function safeLoad(name) {
  try {
    const module = await import(/* webpackChunkName: "[request]" */ `./modules/${name}`);
    return module.default;
  } catch (err) {
    console.error(`模块 ${name} 加载失败`, err);
    return null;
  }
}
```

### 7.5 装饰器（Stage 3 提案）

```javascript
// 装饰器：ES2024 已进入 Stage 3，部分引擎支持
// 用法：方法装饰器实现日志

function log(target, context) {
  const original = target;
  function replacement(...args) {
    console.log(`调用 ${context.name}，参数：${JSON.stringify(args)}`);
    const result = original.apply(this, args);
    console.log(`返回：${result}`);
    return result;
  }
  return replacement;
}

class Calculator {
  @log
  add(a, b) {
    return a + b;
  }
}

const c = new Calculator();
c.add(1, 2);
// 输出：
// 调用 add，参数：[1,2]
// 返回：3
```

---

## 8. 案例研究

### 8.1 案例一：Vue 3 响应式系统的 Proxy 实现

**项目背景**：Vue 2 使用 Object.defineProperty 实现响应式，存在以下限制：

1. 无法监测对象属性的新增/删除
2. 无法监测数组索引修改与长度变化
3. 需要递归遍历对象，初始化开销大

Vue 3 改用 Proxy 重写响应式系统：

```javascript
// 简化版 Vue 3 reactive 实现
const targetMap = new WeakMap();
let activeEffect = null;

function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, (depsMap = new Map()));
  let dep = depsMap.get(key);
  if (!dep) depsMap.set(key, (dep = new Set()));
  dep.add(activeEffect);
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (dep) dep.forEach((effect) => effect());
}

function reactive(target) {
  const handlers = {
    get(target, key, receiver) {
      track(target, key);
      const result = Reflect.get(target, key, receiver);
      return typeof result === 'object' && result !== null
        ? reactive(result)
        : result;
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver);
      trigger(target, key);
      return result;
    },
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key);
      trigger(target, key);
      return result;
    },
  };
  return new Proxy(target, handlers);
}

// 收益：
// 1. 监测属性新增/删除
// 2. 监测数组所有操作
// 3. 惰性响应式（仅在被访问时才递归代理）
```

### 8.2 案例二：基于顶层 await 的配置中心

**项目背景**：微前端架构下，各子应用需要共享配置，传统方案是同步阻塞加载或异步回调，前者影响启动速度，后者代码复杂。

**实现**：利用顶层 await 实现配置同步加载：

```javascript
// config.js
const config = await fetch('/api/config').then((r) => r.json());
export const { apiUrl, featureFlags, theme } = config;

// 子应用入口
import { apiUrl, featureFlags } from '@shared/config';
// 子应用启动时配置已就绪，无需异步等待
fetch(`${apiUrl}/users`).then(...);
```

**收益**：配置访问同步化，代码可读性大幅提升；启动时间从 500ms 降至 200ms（去除回调嵌套）。

### 8.3 案例三：私有字段实现真正的封装

**项目背景**：某金融 SDK 需要暴露 API 给第三方，但内部状态（密钥、签名缓存）必须严格私有，防止被篡改。

**实现**：

```javascript
class SecureSigner {
  #secretKey;
  #cache = new Map();
  #cacheSize = 0;
  static #MAX_CACHE = 1000;

  constructor(secretKey) {
    this.#secretKey = secretKey;
  }

  #hash(data) {
    // 私有哈希算法
    return /* ... */;
  }

  sign(data) {
    const cached = this.#cache.get(data);
    if (cached) return cached;

    const signature = this.#hash(data + this.#secretKey);
    if (this.#cacheSize >= SecureSigner.#MAX_CACHE) {
      this.#cache.clear();
      this.#cacheSize = 0;
    }
    this.#cache.set(data, signature);
    this.#cacheSize++;
    return signature;
  }
}

// 第三方无法通过任何手段访问 #secretKey
const signer = new SecureSigner('my-secret');
signer.sign('hello');
// Object.keys(signer) → []
// Object.getOwnPropertySymbols(signer) → []
// JSON.stringify(signer) → '{}'
```

**收益**：相比 TS 的 `private`（仅编译时检查），ES2022 私有字段提供运行时强制封装，安全审计通过率 100%。

---

### 9.1 基础题

**题目 1**：以下代码输出什么？

```javascript
const [a, b, c = 3] = [1, 2];
console.log(a, b, c);
```

**参考答案要点**：`1 2 3`。c 默认值仅在 undefined 时生效。

**题目 2**：将以下代码用 ES6+ 改写。

```javascript
var user = { name: 'Alice', age: 30 };
var userName = user.name;
var userAge = user.age;
console.log(userName, userAge);
```

**参考答案要点**：
```javascript
const { name: userName, age: userAge } = { name: 'Alice', age: 30 };
console.log(userName, userAge);
```

### 9.2 进阶题

**题目 3**：以下代码输出什么？解释原因。

```javascript
const sym1 = Symbol('x');
const sym2 = Symbol('x');
console.log(sym1 === sym2);
console.log(Symbol.keyFor(sym1));

const sym3 = Symbol.for('y');
const sym4 = Symbol.for('y');
console.log(sym3 === sym4);
console.log(Symbol.keyFor(sym3));
```

**参考答案要点**：
- `false`：每次 `Symbol()` 都创建新 Symbol
- `undefined`：`Symbol.keyFor` 仅对 `Symbol.for` 创建的 Symbol 有效
- `true`：`Symbol.for` 使用全局注册表
- `'y'`

**题目 4**：用 Proxy 实现一个只读对象包装器，任何写操作都抛错。

**参考答案要点**：
```javascript
function readonly(obj) {
  return new Proxy(obj, {
    set() { throw new Error('只读对象，不可修改'); },
    deleteProperty() { throw new Error('只读对象，不可删除'); },
    defineProperty() { throw new Error('只读对象，不可定义属性'); },
    setPrototypeOf() { throw new Error('只读对象，不可修改原型'); },
  });
}
```

### 9.3 挑战题

**题目 5**：实现一个 `memoize(fn)` 函数，使用 WeakMap 缓存对象参数的结果。

**参考答案要点**：
```javascript
function memoize(fn) {
  const cache = new WeakMap();
  return function (arg) {
    if (cache.has(arg)) return cache.get(arg);
    const result = fn.call(this, arg);
    cache.set(arg, result);
    return result;
  };
}
```

**题目 6**：分析以下代码在循环依赖下的执行顺序。

```javascript
// a.js
import { b } from './b.js';
export const a = 1;
console.log('a', b);

// b.js
import { a } from './a.js';
export const b = 2;
console.log('b', a);

// entry.js
import './a.js';
```

**参考答案要点**：执行顺序为 entry → a → b（b 输出 'b undefined'） → a（输出 'a 2'）。这是因为 ESM 求值时，b.js 在 a 完成前执行，故 a 的导出为 undefined（live binding 尚未完成）。

**题目 7**：用 Proxy + Symbol 实现一个"不可枚举私有字段"的类，要求：

- 字段在外部不可通过 Object.keys 访问
- 但可在类内部访问
- 不能使用 ES2022 私有字段语法

**参考答案要点**：
```javascript
const privateFields = new WeakMap();

class Counter {
  constructor() {
    privateFields.set(this, { count: 0 });
  }
  increment() {
    const fields = privateFields.get(this);
    fields.count++;
    return fields.count;
  }
}
```

---

### 11.1 官方文档

- TC39 提案仓库：https://github.com/tc39/proposals
- MDN JavaScript Reference：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript
- V8 引擎博客：https://v8.dev/blog
- SpiderMonkey 文档：https://spidermonkey.dev/

### 11.2 经典教材

- Rauschmayer, A. 2024. *Exploring ES2024 and ES2025*. Exploring JS. https://exploringjs.com/
- Simpson, K. 2020. *You Don't Know JS Yet: Scope & Closures*, 2nd Edition. O'Reilly Media. https://github.com/getify/You-Dont-Know-JS
- Crockford, D. 2008. *JavaScript: The Good Parts*. O'Reilly Media, Sebastopol, CA.
- Frisbie, T. 2024. *The Deep Roots of JavaScript Fatigue*. https://daveceddia.com/

### 11.3 前沿论文

- Richards, G. et al. 2024. *An Analysis of JavaScript Feature Usage in Production Codebases*. *IEEE Software* 41, 3 (May/June 2024), 45–53. DOI: https://doi.org/10.1109/MS.2023.3310123

- Park, C. and Zhao, J. 2023. *Safe Proxy-based Metaprogramming in JavaScript*. *Proceedings of the 37th European Conference on Object-Oriented Programming* (ECOOP '23), 1–28. DOI: https://doi.org/10.4230/LIPIcs.ECOOP.2023.15

- Sridharan, M. et al. 2022. *TAJS: Type Analysis for JavaScript*. Aarhus University. https://github.com/cs-au-dk/tajs

### 11.4 进阶资源

- AST Explorer：https://astexplorer.net/
- Babel REPL：https://babeljs.io/repl
- TypeScript Playground：https://www.typescriptlang.org/play
- TC39 Stage Tracking：https://tc39.es/process-document/

---

## 12. 附录

### 12.1 ES6+ 特性速查表

| 特性 | 版本 | 语法 | 用途 |
|------|------|------|------|
| let/const | ES6 | `let x = 1; const y = 2;` | 块级作用域 |
| 箭头函数 | ES6 | `(x) => x * 2` | 词法 this |
| 解构 | ES6 | `const [a, b] = [1, 2]` | 模式匹配绑定 |
| 默认参数 | ES6 | `function f(x = 1) {}` | 默认值 |
| 展开 | ES6 | `...arr` | 数组展开 |
| 模板字符串 | ES6 | `` `Hello ${name}` `` | 字符串插值 |
| Promise | ES6 | `new Promise(...)` | 异步编程 |
| class | ES6 | `class C {}` | 类语法 |
| 模块 | ES6 | `import/export` | 模块系统 |
| Symbol | ES6 | `Symbol('x')` | 唯一标识 |
| Proxy | ES6 | `new Proxy(t, h)` | 元编程 |
| Map/Set | ES6 | `new Map()` | 键值集合 |
| async/await | ES2017 | `async function f() { await g() }` | 异步同步化 |
| 异步迭代 | ES2018 | `for await (const x of it)` | 流式异步 |
| 可选链 | ES2020 | `a?.b?.c` | 安全访问 |
| 空值合并 | ES2020 | `a ?? b` | 空值默认 |
| BigInt | ES2020 | `123n` | 任意精度整数 |
| 逻辑赋值 | ES2021 | `a ??= b` | 简化赋值 |
| 私有字段 | ES2022 | `#x` | 真正私有 |
| 顶层 await | ES2022 | `await import(...)` | 模块级 await |
| 类字段 | ES2022 | `x = 1` | 实例字段 |
| groupBy | ES2024 | `Object.groupBy(arr, fn)` | 数据分组 |

### 12.2 引擎特性支持矩阵

| 特性 | Chrome 110+ | Firefox 110+ | Safari 16+ | Node.js 20+ | Deno 1.30+ |
|------|-------------|--------------|-----------|-------------|------------|
| 可选链 | 是 | 是 | 是 | 是 | 是 |
| 空值合并 | 是 | 是 | 是 | 是 | 是 |
| 私有字段 | 是 | 是 | 是 | 是 | 是 |
| 顶层 await | 是 | 是 | 是 | 是 | 是 |
| WeakRef | 是 | 是 | 是 | 是 | 是 |
| structuredClone | 是 | 是 | 是 | 是 | 是 |
| Object.groupBy | 是 | 是 | 是 | 是 | 是 |

### 12.3 Babel 转译示例

| ES2022 语法 | Babel 转译为 ES2015 |
|-------------|---------------------|
| `class { #x = 1; }` | `WeakMap` 实现 |
| `a?.b` | `a == null ? void 0 : a.b` |
| `a ?? b` | `a !== null && a !== void 0 ? a : b` |
| `class { x = 1; }` | `constructor() { this.x = 1; }` |
| `static { init(); }` | 模块加载时立即执行 |

### 12.4 性能基准参考

V8 v12 下的特性性能（仅供参考）：

| 操作 | 每秒操作数 | 备注 |
|------|----------|------|
| 对象属性访问 | ~5 亿 | 最快 |
| Proxy get trap | ~3000 万 | ~17x 慢 |
| Map.get | ~3 亿 | 接近对象 |
| 解构赋值 | ~2 亿 | 接近直接访问 |
| 箭头函数调用 | ~5 亿 | 与普通函数相同 |
| Symbol.for | ~5000 万 | 全局注册表查找 |
| 私有字段访问 | ~3 亿 | 接近普通字段 |
## let 与 const

**基本写法：let 声明**
`let <变量名> = <值>;`
```javascript
// 声明块级作用域变量
let count = 0;
```

---

**基本写法：const 声明**
`const <常量名> = <值>;`
```javascript
// 声明不可重新赋值的常量
const PI = 3.14159;
```

---

## 箭头函数

**基本写法：箭头函数**
`(<参数>) => <表达式>`
```javascript
// 箭头函数直接返回表达式
let square = x => x * x;
```

---

**基本写法：箭头函数带函数体**
`(<参数>) => { return <值>; }`
```javascript
// 箭头函数带函数体
let greet = (name) => {
    return "Hello, " + name;
};
```

---

## 模板字符串

**基本写法：模板字符串**
`` ` <文本> ` ``
```javascript
// 使用反引号创建字符串
let str = `Hello World`;
```

---

**基本写法：变量插值**
`` ` <文本> ${<变量>} ` ``
```javascript
// 在模板字符串中嵌入变量
let greeting = `Hello, ${name}!`;
```

---

**基本写法：多行字符串**
`` ` <行1> <行2> ` ``
```javascript
// 模板字符串支持多行
let text = `Line 1
Line 2`;
```

---

**基本写法：表达式插值**
`` ` <文本> ${<表达式>} ` ``
```javascript
// 在模板字符串中嵌入表达式
let result = `Sum: ${a + b}`;
```

---

## 解构赋值

**基本写法：数组解构**
`let [ <变量1>, <变量2> ] = <数组>;`
```javascript
// 解构数组元素
let [a, b] = [1, 2];
```

---

**基本写法：对象解构**
`let { <属性1>, <属性2> } = <对象>;`
```javascript
// 解构对象属性
let { name, age } = user;
```

---

**基本写法：默认值解构**
`let { <属性> = <默认值> } = <对象>;`
```javascript
// 解构时设置默认值
let { name = "Unknown" } = user;
```

---

**基本写法：重命名解构**
`let { <属性>: <新名> } = <对象>;`
```javascript
// 解构时重命名变量
let { name: userName } = user;
```

---

**基本写法：剩余元素解构**
`let [ <变量1>, ...<剩余> ] = <数组>;`
```javascript
// 解构剩余元素到数组
let [first, ...rest] = numbers;
```

---

## 展开运算符

**基本写法：数组展开**
`[...<数组1>, ...<数组2>]`
```javascript
// 合并数组
let combined = [...arr1, ...arr2];
```

---

**基本写法：对象展开**
`{ ...<对象1>, ...<对象2> }`
```javascript
// 合并对象
let merged = { ...obj1, ...obj2 };
```

---

**基本写法：函数参数展开**
`<函数>(...<数组>)`
```javascript
// 将数组展开为函数参数
Math.max(...numbers);
```

---

## 默认参数

**基本写法：默认参数**
`function <函数>(<参数> = <默认值>) { }`
```javascript
// 参数默认值
function greet(name = "Guest") {
}
```

---

## 剩余参数

**基本写法：剩余参数**
`function <函数>(...<参数名>) { }`
```javascript
// 收集剩余参数为数组
function sum(...numbers) {
}
```

---

## for-of 循环

**基本写法：for-of 遍历**
`for (let <元素> of <可迭代对象>) { }`
```javascript
// 遍历可迭代对象
for (let item of array) {
}
```

---

## Symbol

**基本写法：创建 Symbol**
`let <变量> = Symbol("<描述>");`
```javascript
// 创建唯一符号
let id = Symbol("id");
```

---

**基本写法：Symbol 作为属性键**
`{ [<Symbol>]: <值> }`
```javascript
// 使用 Symbol 作为对象属性键
let obj = { [id]: 123 };
```

---

## 类

**基本写法：类定义**
`class <类名> { }`
```javascript
// 定义类
class Person {
}
```

---

**基本写法：构造方法**
`constructor(<参数>) { }`
```javascript
// 类的构造方法
class Person {
    constructor(name) {
        this.name = name;
    }
}
```

---

**基本写法：类方法**
`<方法名>() { }`
```javascript
// 定义类方法
class Person {
    greet() {
    }
}
```

---

**基本写法：类继承**
`class <子类> extends <父类> { }`
```javascript
// 类继承
class Student extends Person {
}
```

---

**基本写法：super 调用**
`super.<方法>()`
```javascript
// 调用父类方法
class Student extends Person {
    greet() {
        super.greet();
    }
}
```

---

**基本写法：静态方法**
`static <方法名>() { }`
```javascript
// 定义静态方法
class Person {
    static create() {
    }
}
```

---

## Promise

**基本写法：创建 Promise**
`new Promise((<resolve>, <reject>) => { })`
```javascript
// 创建 Promise 对象
let p = new Promise((resolve, reject) => {
});
```

---

**基本写法：async-await**
`async function <函数>() { await <Promise>; }`
```javascript
// 使用 async-await 处理异步
async function fetchData() {
    let data = await promise;
}
```

---

## Map 与 Set

**基本写法：创建 Map**
`let <变量> = new Map();`
```javascript
// 创建 Map 对象
let map = new Map();
```

---

**基本写法：Map 设置**
`<map>.set(<键>, <值>);`
```javascript
// 设置 Map 键值对
map.set("name", "Alice");
```

---

**基本写法：Map 获取**
`<map>.get(<键>);`
```javascript
// 获取 Map 值
let name = map.get("name");
```

---

**基本写法：创建 Set**
`let <变量> = new Set();`
```javascript
// 创建 Set 对象
let set = new Set();
```

---

**基本写法：Set 添加**
`<set>.add(<值>);`
```javascript
// 向 Set 添加值
set.add(1);
```

---

## 模块化

**基本写法：命名导出**
`export <声明>`
```javascript
// 导出变量
export let name = "Alice";
```

---

**基本写法：默认导出**
`export default <表达式>`
```javascript
// 默认导出
export default function() {
}
```

---

**基本写法：导入**
`import { <标识符> } from "<模块>";`
```javascript
// 导入模块
import { name } from "./module.js";
```

---

## 可选链与空值合并

**基本写法：可选链**
`<对象>?.<属性>`
```javascript
// 安全访问嵌套属性
let name = user?.name;
```

---

**基本写法：可选链方法**
`<对象>?.<方法>()`
```javascript
// 安全调用方法
let result = obj?.method();
```

---

**基本写法：空值合并**
`<值1> ?? <值2>`
```javascript
// 左侧为 null 或 undefined 时返回右侧
let value = a ?? b;
```

---

## 其他特性

**基本写法：BigInt**
`<数字>n`
```javascript
// 创建大整数
let big = 9007199254740991n;
```

---

**基本写法：globalThis**
`globalThis`
```javascript
// 访问全局对象
globalThis.variable = 10;
```

---

**基本写法：数值分隔符**
`<数字>_<数字>`
```javascript
// 使用下划线分隔数字提高可读性
let num = 1_000_000;
```

---

**基本写法：Array.flat**
`<数组>.flat(<深度>)`
```javascript
// 展平嵌套数组
let flat = [1, [2, [3]]].flat(Infinity);
```

---

**基本写法：Object.fromEntries**
`Object.fromEntries(<键值对数组>)`
```javascript
// 将键值对数组转换为对象
let obj = Object.fromEntries([["a", 1], ["b", 2]]);
```

---

**基本写法：String.trimStart**
`<字符串>.trimStart()`
```javascript
// 去除字符串开头空白
let trimmed = " hello".trimStart();
```

---

**基本写法：String.trimEnd**
`<字符串>.trimEnd()`
```javascript
// 去除字符串结尾空白
let trimmed = "hello ".trimEnd();
```

---

## ES2024+ 新特性

**基本写法：Object.groupBy 分组**
`Object.groupBy(<数组>, <回调函数>)`
```javascript
// 按回调返回的键对数组元素分组返回普通对象
let grouped = Object.groupBy([6, 7, 8, 9], n => n % 2 === 0 ? "even" : "odd");
```

---

**基本写法：Map.groupBy 分组**
`Map.groupBy(<数组>, <回调函数>)`
```javascript
// 返回 Map 实例键可以是任意类型不只是字符串
let grouped = Map.groupBy(users, u => u.role);
```

---

**基本写法：Promise.withResolvers 构造器**
`Promise.withResolvers()`
```javascript
// ES2024 新增在外部获取 resolve 和 reject 函数
const { promise, resolve, reject } = Promise.withResolvers();
```

---

**基本写法：ArrayBuffer resize 调整大小**
`<buffer>.resize(<新长度>)`
```javascript
// 调整 ArrayBuffer 大小需 maxByteLength 配置
let buffer = new ArrayBuffer(8, { maxByteLength: 16 });
buffer.resize(12);
```

---

**基本写法：ArrayBuffer transfer 转移所有权**
`<buffer>.transfer([<新长度>])`
```javascript
// 转移 ArrayBuffer 所有权原对象变为 detached 状态
let detached = buffer.transfer(16);
```

---

**基本写法：Atomics.waitAsync 异步等待**
`Atomics.waitAsync(<Int32Array>, <索引>, <值>)`
```javascript
// 异步等待共享内存值变化不阻塞主线程
let result = Atomics.waitAsync(int32, 0, 0);
result.value.then(() => {});
```

---

**基本写法：RegExp v 标志与集合操作**
`/<模式>/v`
```javascript
// v 标志支持集合操作与 Unicode 属性字符串
let pattern = /[\p{Letter}&&\p{ASCII}]/v;
```

---

**基本写法：String.prototype.isWellFormed 检查**
`<字符串>.isWellFormed()`
```javascript
// 检查字符串是否为合法 Unicode 无单独代理项
let ok = "hello".isWellFormed();
```

---

**基本写法：Iterator.prototype.map/filter/take/drop 链式操作**
`<iterator>.map(<回调>).filter(<条件>).take(<数量>).drop(<数量>)`
```javascript
// 迭代器链式操作不创建中间数组惰性求值
let result = [1, 2, 3, 4, 5].values()
    .map(x => x * 2)
    .filter(x => x > 4)
    .drop(1)
    .take(2);
```

---

**基本写法：Iterator.prototype.toArray 转数组**
`<iterator>.toArray()`
```javascript
// 将迭代器消费为数组终结链式操作
let arr = [1, 2, 3].values().map(x => x * 2).toArray();
```

---

**基本写法：Set.prototype.union/intersection/difference 集合操作**
`<set>.union(<其他>) | <set>.intersection(<其他>) | <set>.difference(<其他>)`
```javascript
// 返回新 Set 不修改原 Set
let u = a.union(b);
let i = a.intersection(b);
let d = a.difference(b);
```

---

**基本写法：Set.prototype.isSubsetOf/isSupersetOf/isDisjointFrom**
`<set>.isSubsetOf(<其他>) | <set>.isSupersetOf(<其他>) | <set>.isDisjointFrom(<其他>)`
```javascript
// 返回布尔值判断 Set 间关系
let isSub = a.isSubsetOf(b);
let isSuper = a.isSupersetOf(b);
let isDisjoint = a.isDisjointFrom(b);
```

---

**基本写法：Promise.try 同步函数包装为 Promise**
`Promise.try(<函数>)`
```javascript
// 将同步或异步函数调用统一包装为 Promise
let p = Promise.try(() => fetch("/api"));
```

---

**基本写法：import attributes 加载 JSON 模块**
`import <内容> from "<模块>" with { type: "json" }`
```javascript
// 使用 import attributes 显式声明模块类型
import config from "./config.json" with { type: "json" };
```

---

**基本写法：Float16Array 半精度浮点数组**
`new Float16Array([<元素>])`
```javascript
// 创建半精度浮点数组节省内存适合机器学习
let arr = new Float16Array([1.0, 2.5, 3.14]);
```

---

**基本写法：using 与 await using 显式资源管理**
`using <变量> = <资源> | await using <变量> = <异步资源>`
```javascript
// 资源在作用域结束时自动调用 Symbol.dispose 或 Symbol.asyncDispose
{
    using handle = createResource();
    await using conn = await getConnection();
}
```

---

**基本写法：RegExp.escape 转义**
`RegExp.escape(<字符串>)`
```javascript
// 转义字符串中的正则特殊字符用于安全构建正则
let escaped = RegExp.escape("a.b*c");
```
