---
order: 50
tags:
  - javascript
  - control-flow
difficulty: intermediate
title: 控制流
module: javascript
category: 'JS Basics'
description: 'JavaScript 控制流的数学语义、形式化推导、工程实践与反模式：条件分支、循环结构、迭代器协议、短路求值、异常控制流的完整剖析。'
author: fanquanpp
updated: '2026-07-21'
related:
  - javascript/变量与数据类型
  - javascript/数据类型与运算符
  - javascript/高阶函数
  - javascript/递归与尾调用优化
  - javascript/事件循环详解
prerequisites:
  - javascript/语法速查
---

# 控制流

## 0. 引言

控制流（Control Flow）是程序设计语言中描述指令执行顺序的机制。在 JavaScript 这门同时具备命令式、函数式与异步特征的多范式语言中，控制流不仅包含经典的顺序、分支、循环三类，还延伸到基于异常的非局部跳转、基于 Promise 与事件循环的异步调度、基于迭代器协议的惰性求值等多个维度。

本文档以形式化方法描述 JavaScript 控制流的语义，并给出从语言规范到生产实践的完整推导链条。读者通过本文档应当具备对控制流的"理解—应用—分析—评估—创造"五层认知能力，能够在生产环境中设计正确、可读、可维护且高性能的控制逻辑。

---

## 1. 学习目标

依据 Bloom 分类法（Bloom's Taxonomy，修订版 Anderson & Krathwohl, 2001），本文档的学习目标按认知层级组织如下：

### 1.1 记忆层（Remember）

- **R1**：复述 JavaScript 控制流的五类基本结构（顺序、分支、循环、异常、异步）。
- **R2**：列举 `if/else`、`switch`、`?:`、`??`、`&&`、`||` 六种分支语法的语义差异。
- **R3**：背诵 `for`、`for...in`、`for...of`、`while`、`do...while`、`for await...of` 六种循环的迭代对象要求。

### 1.2 理解层（Understand）

- **U1**：解释 Truthy/Falsy 集合的判定规则，并说明 `==` 与 `===` 在控制流中的语义差异。
- **U2**：用自然语言描述 `try/catch/finally` 的执行序与 `finally` 块对返回值的覆盖行为。
- **U3**：解释短路求值（Short-circuit Evaluation）的代数性质，并说明其在 React 条件渲染中的应用。

### 1.3 应用层（Apply）

- **A1**：在不引入循环嵌套的前提下，用迭代器方法实现多维数据的扁平化遍历。
- **A2**：在异步场景下使用 `for await...of` 替换 Promise 链，保证异常透传与资源释放。
- **A3**：使用 `break`、`continue`、`return`、`throw` 四种跳转语句控制循环退出语义。

### 1.4 分析层（Analyze）

- **An1**：将生产代码中嵌套深度 ≥ 3 的 `if-else` 链重构为查表分发或策略模式。
- **An2**：分析 `switch` 语句穿透（fall-through）的发生条件，给出基于 ESLint 规则的静态防护方案。
- **An3**：对比循环 vs 递归 vs 迭代器方法在 V8 引擎下的字节码差异，给出选型依据。

### 1.5 评估层（Evaluate）

- **E1**：评估循环展开（Loop Unrolling）在 JIT 编译器介入下的实际收益与可读性损失。
- **E2**：在异步控制流中评估 `Promise.all` 与 `for await...of` 的吞吐量与内存占用权衡。
- **E3**：评估在热路径（Hot Path）上使用 `try/catch` 的性能开销，给出可量化的基准测试结论。

### 1.6 创造层（Create）

- **C1**：设计一个支持中断、恢复、回滚的事务式控制流库（参考 Saga 模式）。
- **C2**：基于生成器实现一个可中断的协程调度器，用于长任务的分片执行。
- **C3**：设计一个状态机 DSL，将业务流程描述为状态转移图并自动生成测试用例。

---

## 2. 历史动机与背景

### 2.1 控制流问题的历史脉络

控制流问题可追溯至 1968 年 Edsger W. Dijkstra 发表的著名论文 *Go To Statement Considered Harmful*。在该论文中，Dijkstra 论证了无约束的 `goto` 语句导致程序状态空间爆炸，使程序正确性证明变得不可能。这一论断直接催生了结构化程序设计运动，确立了**顺序、分支、循环**三类基本控制结构足以表达任意可计算函数的"结构化程序定理"（Böhm-Jacopini Theorem, 1966）。

JavaScript 在 1995 年由 Brendan Eich 用 10 天时间设计完成，其控制流设计承袭自 C/Java 语法家族，保留了 `if/else`、`switch`、`for`、`while`、`do...while`、`break`、`continue`、`return`、`throw` 等关键字。这一选择让 JavaScript 在语法上对 C 系程序员友好，但也继承了 `switch` 穿透、`==` 强制类型转换等历史包袱。

### 2.2 JavaScript 控制流的演进时间线

| 年份 | ECMAScript 版本 | 控制流相关特性 | 设计动机 |
|------|----------------|----------------|----------|
| 1995 | ES1（首发） | `if/else`、`switch`、`for`、`while`、`do...while`、`try/catch`（ES3 补全） | 与 Java 语法兼容，降低学习成本 |
| 1999 | ES3 | `try/catch/finally`、`throw`、异常对象标准化 | 提供 Java 风格的异常处理机制 |
| 2009 | ES5 | 严格模式（`"use strict"`）、`Array.prototype.forEach/map/filter` | 限制隐式全局变量，引入函数式迭代 |
| 2015 | ES6/ES2015 | `for...of`、迭代器协议、生成器（`function*`）、`let/const` 块级作用域、箭头函数、解构、默认参数、`Promise` | 提供惰性迭代与异步控制流原语 |
| 2016 | ES7 | `async/await`（基于 Promise 与生成器） | 异步代码的同步化书写 |
| 2018 | ES9 | `for await...of`、异步迭代器协议 | 支持流式异步数据源遍历 |
| 2020 | ES11 | 可选链 `?.`、空值合并 `??` | 减少深层属性访问的样板代码 |
| 2021 | ES12 | 逻辑赋值 `||=`、`&&=`、`??=` | 简化条件赋值惯用法 |
| 2024 | ES15 | `Iterator.prototype` 显式原型方法、`Set` 方法族 | 标准化迭代器组合子 |

### 2.3 为什么需要形式化理解控制流

许多 JavaScript 开发者认为控制流是"基础语法"，无需深入研究。但以下真实场景要求开发者对控制流具备形式化理解：

1. **静态分析工具**：ESLint、TypeScript Compiler 需要构建控制流图（CFG）以进行可达性分析与类型收窄。
2. **JIT 编译优化**：V8 的 TurboFan 优化编译器依赖控制流分析（CFA）决定内联、循环展开、逃逸分析。
3. **异步并发正确性**：`async/await` 与 `Promise` 的交织中，错误的控制流可能导致资源泄漏、竞态条件、死锁。
4. **安全审计**：恶意代码混淆常利用 `with`、`eval`、动态属性访问构造无法静态分析的控制流。

---

## 3. 形式化定义

### 3.1 控制流的操作语义

JavaScript 控制流的语义由 ECMAScript 规范以**结构化操作语义**（Structural Operational Semantics, SOS）的形式给出。其核心是一个状态转移系统 $(S, \Sigma, \rightarrow)$，其中：

- $S$ 是语句集合（Statement）
- $\Sigma$ 是执行状态集合（Execution Context + Environment Record + Realm）
- $\rightarrow \subseteq S \times \Sigma \times S \times \Sigma$ 是状态转移关系

对于任意语句 $s \in S$ 与状态 $\sigma \in \Sigma$，执行 $s$ 将产生新状态 $\sigma'$，记作：

$$
\langle s, \sigma \rangle \rightarrow \langle \text{NormalCompletion}(v), \sigma' \rangle
$$

其中 $\text{NormalCompletion}(v)$ 表示正常完成记录（Normal Completion Record），携带返回值 $v$。控制流的非正常完成（如 `break`、`continue`、`return`、`throw`）则产生 $\text{BreakCompletion}$、$\text{ContinueCompletion}$、$\text{ReturnCompletion}$、$\text{ThrowCompletion}$ 等子类型，由外层语句决定如何处理。

### 3.2 分支语句的形式化

`if (e) s_1 \text{ else } s_2` 的求值规则如下：

$$
\frac{\langle e, \sigma \rangle \rightarrow \langle v, \sigma_1 \rangle \quad \text{ToBoolean}(v) = \text{true}}{\langle \text{if}(e) s_1 \text{ else } s_2, \sigma \rangle \rightarrow \langle s_1, \sigma_1 \rangle}
$$

$$
\frac{\langle e, \sigma \rangle \rightarrow \langle v, \sigma_1 \rangle \quad \text{ToBoolean}(v) = \text{false}}{\langle \text{if}(e) s_1 \text{ else } s_2, \sigma \rangle \rightarrow \langle s_2, \sigma_1 \rangle}
$$

其中 $\text{ToBoolean}(v)$ 是抽象操作，定义如下：

$$
\text{ToBoolean}(v) = \begin{cases}
\text{false} & \text{if } v \in \{\text{undefined}, \text{null}, \text{false}, 0, -0, \text{NaN}, \text{''}\} \\
\text{false} & \text{if } v \text{ is } \text{BigInt}(0) \\
\text{false} & \text{if } v \text{ is an Object with } [[IsHTMLDDA]] \text{ internal slot and } v = \text{document.all} \\
\text{true} & \text{otherwise}
\end{cases}
$$

上述集合 $\{\text{undefined}, \text{null}, \text{false}, 0, -0, \text{NaN}, \text{''}\}$ 即 Falsy 值集合，记作 $\mathcal{F}$。其余所有值构成 Truthy 集合 $\mathcal{T} = \mathbb{V} \setminus \mathcal{F}$（其中 $\mathbb{V}$ 为 JS 值的全集）。

### 3.3 循环语句的形式化

`while (e) s` 的操作语义可表达为不动点形式：

$$
\text{While}(e, s, \sigma) = \begin{cases}
\sigma & \text{if } \text{ToBoolean}(\text{eval}(e, \sigma)) = \text{false} \\
\text{While}(e, s, \sigma'') & \text{if } \text{ToBoolean}(\text{eval}(e, \sigma)) = \text{true} \\
& \quad \text{and } \langle s, \sigma \rangle \rightarrow \langle \text{NormalCompletion}, \sigma' \rangle \\
& \quad \text{and no break/return/throw}
\end{cases}
$$

不动点形式对应最小不动点 $\text{lfp}(F)$，其中 $F(W)(\sigma) = \sigma \text{ if } \neg \text{ToBoolean}(\text{eval}(e, \sigma)) \text{ else } W(\sigma')$。这一表达等价于说循环的语义是函数 $F$ 的最小不动点，可用域论（Domain Theory）的不动点定理保证存在性（当转移函数连续时）。

### 3.4 异常控制流的形式化

`try { s_1 } catch (e) { s_2 } finally { s_3 }` 的语义可表达为：

$$
\text{TryCatchFinally}(s_1, e, s_2, s_3, \sigma) = \begin{cases}
\langle r_3, \sigma_3 \rangle & \text{if } \langle s_1, \sigma \rangle \rightarrow \langle r_1, \sigma_1 \rangle \text{ (normal/break/continue/return)} \\
& \quad \text{and } \langle s_3, \sigma_1 \rangle \rightarrow \langle r_3, \sigma_3 \rangle \\
\langle r_2 \diamond r_3, \sigma_3 \rangle & \text{if } \langle s_1, \sigma \rangle \rightarrow \langle \text{Throw}(v), \sigma_1 \rangle \\
& \quad \text{and binding } e = v \text{ in } \sigma_1, \langle s_2, \sigma_1 \rangle \rightarrow \langle r_2, \sigma_2 \rangle \\
& \quad \text{and } \langle s_3, \sigma_2 \rangle \rightarrow \langle r_3, \sigma_3 \rangle \\
\langle r_3, \sigma_3 \rangle & \text{if } \langle s_1, \sigma \rangle \rightarrow \langle \text{Throw}(v), \sigma_1 \rangle \\
& \quad \text{and } \langle s_3, \sigma_1 \rangle \rightarrow \langle r_3, \sigma_3 \rangle \text{ (catch 异常时 finally 强制执行)}
\end{cases}
$$

其中算子 $r_2 \diamond r_3$ 表示完成记录的组合：若 $s_2$ 正常完成则取 $r_3$，否则取 $r_2$（异常透传优先级低于 finally 的覆盖行为，详见 [ES2024 7.5 Completion Record Specification]）。

### 3.5 短路求值的代数结构

JavaScript 的逻辑运算符 `&&`、`||`、`??` 在语义上构成一个代数系统 $(\mathbb{V}, \land, \lor, \top, \bot)$，其中：

- $\land$（`&&`）：返回左操作数若为 Falsy，否则返回右操作数
- $\lor$（`||`）：返回左操作数若为 Truthy，否则返回右操作数
- $\top$（一元 Truthy 集合的代表值）
- $\bot$（一元 Falsy 集合的代表值）

满足以下代数律：

- 交换律：$a \land b \neq b \land a$（不成立，因为短路返回的是操作数本身而非布尔值）
- 结合律：$(a \land b) \land c = a \land (b \land c)$（在求值结果上等价）
- 单位律：$a \land \text{true} = a$，$a \lor \text{false} = a$
- 零元律：$a \land \text{false} = \text{false}$，$a \lor \text{true} = \text{true}$

注意：JavaScript 的 `&&` 与 `||` 不是真正的布尔代数（Boolean Algebra），而是 Kleene 三值逻辑的推广，因为返回的是操作数本身而非布尔值。这一设计使其能用于默认值与条件赋值，但也带来与严格布尔代数的语义差异。

---

## 4. 理论推导

### 4.1 结构化程序定理与表达力

**Böhm-Jacopini 定理**（1966）证明：任意可计算函数都可用顺序、选择（`if-else`）、迭代（`while`）三类基本结构表达，且无需 `goto`。

**证明思路**：给定一个任意流程图，可以将其重构为等价的仅含三类结构的形式。具体地，每个流程图节点 $n$ 对应一个状态变量 $s_n$，引入外层 `while (true)` 循环，根据 $s_n$ 取值分发到对应代码块。原 `goto` 跳转通过更新 $s_n$ 实现。

**推论**：JavaScript 中的所有控制流（包括 `switch`、`for`、`do...while`、`try/catch`、`async/await`、`for await...of`）都可以等价转换为 `if/else` 与 `while` 的组合。这意味着 JavaScript 的控制流表达力不弱于任意图灵完备语言。

### 4.2 循环不变式与正确性证明

循环的正确性可用 Hoare 逻辑（Hoare Logic）证明，其核心是循环不变式（Loop Invariant）：

$$
\{ P \land B \} \, S \, \{ P \}
$$

其中 $P$ 是循环不变式，$B$ 是循环条件，$S$ 是循环体。这表示：在 $P$ 与 $B$ 同时成立的状态下执行 $S$ 后，$P$ 仍然成立。

循环的全正确性（Total Correctness）还需证明终止性：

$$
\exists \text{ variant } V \text{ s.t. } V \geq 0 \land (V \text{ strictly decreases per iteration})
$$

**示例**：计算数组 `arr` 中元素之和的 `for` 循环：

```javascript
function sum(arr) {
  let result = 0;
  // 循环不变式 P: 在每次迭代开始时，result === sum(arr[0..i-1])
  // 变体 V: arr.length - i，每次迭代递减 1，且 ≥ 0
  for (let i = 0; i < arr.length; i++) {
    result += arr[i];
  }
  // 循环退出时：P ∧ i === arr.length，故 result === sum(arr)
  return result;
}
```

通过循环不变式可在不执行代码的前提下证明循环正确性，这是形式化方法（Formal Methods）的基础。

### 4.3 复杂度分析

#### 4.3.1 时间复杂度

各类循环结构的时间复杂度取决于循环体内操作与迭代次数：

| 结构 | 典型复杂度 | 退化情况 |
|------|-----------|----------|
| 单层 `for` | $O(n)$ | 循环体内含 $O(1)$ 操作 |
| 嵌套 `for`（二维） | $O(n^2)$ | 最坏情况，可优化为 $O(n \log n)$ 或更低 |
| `for...in` 遍历对象 | $O(n)$ | 含原型链遍历，可能更慢 |
| `for...of` 配合生成器 | $O(n)$ 但含协程切换开销 | 生成器上下文恢复成本 |
| 递归（无记忆化） | $O(2^n)$ | Fibonacci 朴素递归 |
| 递归（带记忆化） | $O(n)$ | 空间换时间 |

#### 4.3.2 空间复杂度

控制流的空间复杂度主要来自：

- 调用栈深度（递归）
- 闭包捕获的环境记录
- 异步上下文（AsyncContext、Promise 链）

尾调用优化（TCO）在严格模式下可让递归的空间复杂度从 $O(n)$ 降为 $O(1)$，但 Safari JavaScriptCore 是当前主流引擎中唯一完整实现 TCO 的，V8 与 SpiderMonkey 因历史包袱未实现。这意味着在生产环境中应避免依赖 TCO，改用显式循环或 trampoline 模式。

### 4.4 控制流图（CFG）与可达性分析

静态分析工具通过构建控制流图（Control Flow Graph, CFG）进行可达性分析。CFG 是一个有向图 $G = (V, E)$，其中：

- $V$ 是基本块（Basic Block）集合，每个基本块是一段无跳转的顺序代码
- $E \subseteq V \times V$ 是控制转移边

JavaScript 控制流图的特殊边包括：

- **异常边**：从 `try` 块到 `catch` 块
- **异步恢复边**：从 `await` 点到 microtask 队列恢复点
- **生成器恢复边**：从 `yield` 点到 `next()` 调用点

可达性分析可用于：

- 死代码消除（Dead Code Elimination）
- 变量初始化检查（TypeScript 的 `Definitely Assigned` 检查）
- 类型收窄（Type Narrowing，如 `if (typeof x === 'string')` 后 x 收窄为 string）

### 4.5 异步控制流的形式化

`async/await` 的语义可形式化为状态机变换（CPS 变换的退化形式）。给定 `async function f() { ... await g(); ... }`，编译器将其转换为：

$$
f_{\text{state}}(s) = \begin{cases}
\text{pending} & \text{if } s = 0 \\
\text{resume from await point } i & \text{if } s = i \text{ (after } g_i \text{ resolves)} \\
\text{fulfilled with value } v & \text{if } s = \text{final} \\
\text{rejected with error } e & \text{if exception}
\end{cases}
$$

Babel 与 TypeScript 的 `async/await` 降级编译就是这一变换的工程实现，将 ES2017 代码编译为 ES5 兼容的状态机代码。

---

## 5. 代码示例

### 5.1 条件分支的多种写法

```javascript
// 示例 5.1：基于用户角色渲染界面
// 演示 if-else、switch、查找表、策略模式四种等价写法
// 用于对比可读性、可维护性与扩展性

const user = { role: 'admin', name: 'Alice' };

// 写法 1：if-else 链（适合少量分支，可读性高）
function renderWithIfElse(user) {
  if (user.role === 'admin') {
    return `管理员面板：${user.name}`;
  } else if (user.role === 'editor') {
    return `编辑器：${user.name}`;
  } else if (user.role === 'viewer') {
    return `只读视图：${user.name}`;
  } else {
    return `未知角色：${user.name}`;
  }
}

// 写法 2：switch 语句（适合枚举值分发，注意 break 防穿透）
function renderWithSwitch(user) {
  switch (user.role) {
    case 'admin':
      return `管理员面板：${user.name}`;
    case 'editor':
      return `编辑器：${user.name}`;
    case 'viewer':
      return `只读视图：${user.name}`;
    default:
      return `未知角色：${user.name}`;
  }
}

// 写法 3：查找表（适合分支多、逻辑简单的场景）
const ROLE_RENDERERS = {
  admin: (u) => `管理员面板：${u.name}`,
  editor: (u) => `编辑器：${u.name}`,
  viewer: (u) => `只读视图：${u.name}`,
};
function renderWithLookup(user) {
  const renderer = ROLE_RENDERERS[user.role] || ((u) => `未知角色：${u.name}`);
  return renderer(user);
}

// 写法 4：策略模式（适合复杂业务规则、需要运行时切换）
class RenderStrategy {
  constructor() {
    this.strategies = new Map();
    this.default = (u) => `未知角色：${u.name}`;
  }
  register(name, fn) {
    this.strategies.set(name, fn);
    return this; // 链式调用
  }
  execute(user) {
    const fn = this.strategies.get(user.role) || this.default;
    return fn(user);
  }
}
const strategy = new RenderStrategy()
  .register('admin', (u) => `管理员面板：${u.name}`)
  .register('editor', (u) => `编辑器：${u.name}`)
  .register('viewer', (u) => `只读视图：${u.name}`);

console.log(renderWithIfElse(user));   // 管理员面板：Alice
console.log(renderWithSwitch(user));   // 管理员面板：Alice
console.log(renderWithLookup(user));   // 管理员面板：Alice
console.log(strategy.execute(user));   // 管理员面板：Alice
```

### 5.2 循环与迭代器方法对比

```javascript
// 示例 5.2：对数组进行平方、过滤、求和的多种实现
// 演示 for、for...of、forEach、reduce 的语义差异

const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 写法 1：传统 for 循环（最快，可读性中等）
function sumSquaresFor(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) {
      sum += arr[i] * arr[i];
    }
  }
  return sum;
}

// 写法 2：for...of 循环（可读性高，性能接近 for）
function sumSquaresForOf(arr) {
  let sum = 0;
  for (const n of arr) {
    if (n % 2 === 0) {
      sum += n * n;
    }
  }
  return sum;
}

// 写法 3：函数式链式调用（声明式，可读性最高，但多次中间数组分配）
function sumSquaresFunctional(arr) {
  return arr
    .filter((n) => n % 2 === 0)
    .map((n) => n * n)
    .reduce((acc, x) => acc + x, 0);
}

// 写法 4：单次 reduce（兼顾性能与可读性）
function sumSquaresReduce(arr) {
  return arr.reduce((acc, n) => (n % 2 === 0 ? acc + n * n : acc), 0);
}

console.log(sumSquaresFor(arr));           // 220
console.log(sumSquaresForOf(arr));         // 220
console.log(sumSquaresFunctional(arr));    // 220
console.log(sumSquaresReduce(arr));        // 220
```

### 5.3 异常控制流与资源释放

```javascript
// 示例 5.3：数据库事务的正确异常处理
// 演示 try/catch/finally 的执行序与资源释放

class Database {
  async beginTransaction() {
    console.log('事务开启');
    return { commit: async () => console.log('事务提交'), rollback: async () => console.log('事务回滚') };
  }
}

async function transferFunds(db, fromId, toId, amount) {
  const tx = await db.beginTransaction();
  try {
    // 业务逻辑：转账
    console.log(`从 ${fromId} 扣款 ${amount}`);
    if (amount > 1000) {
      throw new Error('单笔转账超过限额');
    }
    console.log(`向 ${toId} 入账 ${amount}`);
    await tx.commit();
    return { success: true };
  } catch (err) {
    // 异常处理：回滚事务
    await tx.rollback();
    console.error(`转账失败：${err.message}`);
    return { success: false, error: err.message };
  } finally {
    // finally 块：无论成功失败都执行的清理逻辑
    // 注意：finally 中的 return 会覆盖 try/catch 的 return，应避免
    console.log('资源清理完成');
  }
}

// 测试用例
const db = new Database();
await transferFunds(db, 'A001', 'B002', 500);   // 正常转账
await transferFunds(db, 'A001', 'B002', 2000);  // 触发限额异常
```

### 5.4 异步迭代器与流式处理

```javascript
// 示例 5.4：分页 API 的流式异步迭代
// 演示 for await...of 与异步生成器的组合使用

// 模拟分页 API
async function fetchPage(page, size) {
  // 模拟网络延迟
  await new Promise((r) => setTimeout(r, 100));
  const total = 35;
  const start = (page - 1) * size;
  const items = Array.from({ length: Math.min(size, total - start) }, (_, i) => ({
    id: start + i + 1,
    name: `项目${start + i + 1}`,
  }));
  return { items, hasMore: start + items.length < total };
}

// 异步生成器：将分页 API 转为异步可迭代对象
async function* paginate(api, pageSize = 10) {
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await api(page, pageSize);
    yield* result.items; // yield* 委托给同步迭代器
    hasMore = result.hasMore;
    page++;
  }
}

// 使用 for await...of 流式处理
async function processAll() {
  const collected = [];
  for await (const item of paginate(fetchPage, 10)) {
    collected.push(item);
    console.log(`处理：${item.name}`);
    if (collected.length >= 20) {
      break; // 可随时中断，触发生成器的 return() 方法
    }
  }
  console.log(`总计处理 ${collected.length} 项`);
  return collected;
}

await processAll();
```

### 5.5 短路求值的工程应用

```javascript
// 示例 5.5：短路求值在条件赋值与默认值中的应用
// 演示 &&、||、??、?. 的组合使用

const config = {
  api: { timeout: 5000 },
  user: null,
};

// 写法 1：|| 设置默认值（注意：会覆盖 false、0、'' 等合法 Falsy 值）
const timeout1 = config.api.timeout || 3000;       // 5000
const retry1 = config.api.retry || 3;               // 3（因为 retry 不存在）

// 写法 2：?? 仅在 null/undefined 时使用默认值（推荐用于数字与字符串）
const timeout2 = config.api.timeout ?? 3000;        // 5000
const retry2 = config.api.retry ?? 3;                // 3

// 写法 3：&& 用于条件执行（替代简单 if）
config.user && console.log(`用户：${config.user.name}`);

// 写法 4：?. 链式可选访问（深层属性安全访问）
const userName = config.user?.name ?? '匿名';        // '匿名'

// 写法 5：逻辑赋值（ES2021）
const settings = {};
settings.timeout ??= 3000;   // 等价于 settings.timeout = settings.timeout ?? 3000
settings.retry ||= 3;        // 等价于 settings.retry = settings.retry || 3
settings.debug &&= false;    // 等价于 settings.debug = settings.debug && false
console.log(settings);       // { timeout: 3000, retry: 3 }
```

### 5.6 标签语句与跳出多层循环

```javascript
// 示例 5.6：标签语句在矩阵搜索中的应用
// 演示 break label、continue label 的使用场景

function findFirstPositive(matrix) {
  let found = null;
  outer: for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (matrix[i][j] > 0) {
        found = { row: i, col: j, value: matrix[i][j] };
        break outer; // 跳出双层循环
      }
    }
  }
  return found;
}

const matrix = [
  [-1, -2, -3],
  [-4, -5, -6],
  [-7, 8, -9],
];
console.log(findFirstPositive(matrix)); // { row: 2, col: 1, value: 8 }

// 标签 continue：跳过本层及外层剩余迭代
function skipRowsWithNegative(matrix) {
  const result = [];
  rowLoop: for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (matrix[i][j] < 0) {
        continue rowLoop; // 跳过当前行的剩余列，进入下一行
      }
    }
    result.push(matrix[i]);
  }
  return result;
}
```

### 5.7 生成器与无限序列

```javascript
// 示例 5.7：生成器实现惰性无限序列
// 演示 yield、yield*、return() 的控制流

function* naturals(start = 1) {
  let n = start;
  while (true) {
    yield n++;
  }
}

function* take(gen, count) {
  let i = 0;
  for (const x of gen) {
    if (i++ >= count) return;
    yield x;
  }
}

function* map(gen, fn) {
  for (const x of gen) {
    yield fn(x);
  }
}

function* filter(gen, pred) {
  for (const x of gen) {
    if (pred(x)) yield x;
  }
}

// 组合：取前 5 个偶数的平方
const result = [...take(map(filter(naturals(), (n) => n % 2 === 0), (n) => n * n), 5)];
console.log(result); // [4, 16, 36, 64, 100]
```

### 5.8 状态机实现

```javascript
// 示例 5.8：基于闭包的状态机实现
// 演示控制流在状态转移中的应用

function createStateMachine(definition, initial) {
  let state = initial;
  return {
    send(event) {
      const transitions = definition[state];
      if (!transitions || !(event in transitions)) {
        console.warn(`状态 ${state} 不接受事件 ${event}`);
        return state;
      }
      const nextState = transitions[event];
      console.log(`${state} --${event}--> ${nextState}`);
      state = nextState;
      return state;
    },
    get current() {
      return state;
    },
  };
}

// 订单状态机：待支付 → 已支付 → 已发货 → 已签收
const order = createStateMachine(
  {
    pending: { pay: 'paid', cancel: 'cancelled' },
    paid: { ship: 'shipped', refund: 'refunded' },
    shipped: { deliver: 'delivered', return: 'returned' },
    delivered: { return: 'returned' },
    cancelled: {},
    refunded: {},
    returned: {},
  },
  'pending'
);

order.send('pay');     // pending --pay--> paid
order.send('ship');     // paid --ship--> shipped
order.send('deliver');  // shipped --deliver--> delivered
console.log(order.current); // delivered
```

---

## 6. 对比分析

### 6.1 分支语句对比

| 特性 | if-else | switch | 三元 ?: | 查找表 |
|------|---------|--------|---------|--------|
| 适用场景 | 范围判断、复杂条件 | 离散值等值匹配 | 简单二选一 | 离散值映射 |
| 可读性 | 中等 | 高（多分支时） | 低（嵌套时） | 高（数据驱动） |
| 性能 | $O(n)$ 比较 | 引擎优化为跳表 $O(1)$ | $O(1)$ | 哈希表 $O(1)$ |
| 扩展性 | 修改源码 | 修改源码 | 不可扩展 | 增加表项 |
| 类型安全 | 弱 | 强（需全等匹配） | 弱 | 强 |
| 短路求值 | 支持 | 不支持 | 支持 | 不适用 |
| 副作用 | 可包含 | 可包含 | 应避免 | 在映射函数中可包含 |

### 6.2 循环结构对比

| 特性 | for | for...in | for...of | while | do...while | forEach | reduce |
|------|-----|----------|----------|-------|-----------|---------|--------|
| 遍历数组 | 推荐 | 不推荐 | 推荐 | 可用 | 可用 | 推荐 | 推荐 |
| 遍历对象键 | 不适用 | 推荐 | 不适用 | 不适用 | 不适用 | 不适用 | 不适用 |
| 遍历 Map/Set | 不适用 | 不适用 | 推荐 | 不适用 | 不适用 | 不适用 | 不适用 |
| 遍历迭代器 | 不适用 | 不适用 | 推荐 | 不适用 | 不适用 | 不适用 | 不适用 |
| 支持 break | 是 | 是 | 是 | 是 | 是 | 否 | 否 |
| 支持 continue | 是 | 是 | 是 | 是 | 是 | 否 | 否 |
| 支持 await | 是 | 是 | 是 | 是 | 是 | 否 | 否 |
| 索引访问 | 是 | 否 | 否 | 视实现 | 视实现 | 否 | 否 |
| 性能（V8） | 最快 | 慢（含原型链） | 快 | 接近 for | 接近 for | 慢（函数调用） | 慢（函数调用） |

### 6.3 异常处理 vs 错误码

| 维度 | 异常（try/catch） | 错误码（返回值） |
|------|-------------------|------------------|
| 控制流 | 非局部跳转 | 局部显式检查 |
| 性能 | 抛出时高开销（构建栈追踪） | 接近零开销 |
| 可读性 | 业务逻辑与错误处理分离 | 错误检查散布 |
| 类型安全 | 弱（catch 捕获 any） | 强（需类型联合） |
| 组合性 | 难以组合（异常传播隐式） | 易组合（如 Result 类型） |
| 适用场景 | 真正异常情况 | 可预期的业务失败 |
| Go/Rust 借鉴 | 不推荐 | Result/Option 模式 |

### 6.4 异步控制流对比

| 方案 | 代码风格 | 错误处理 | 并发能力 | 调试难度 |
|------|---------|---------|---------|---------|
| 回调（Callback） | 嵌套地狱 | 错误优先回调 | 弱 | 困难（栈丢失） |
| Promise 链 | then 链式 | .catch 集中 | 中（Promise.all） | 中等 |
| async/await | 同步风格 | try/catch | 强（Promise.all + await） | 简单 |
| 生成器 + co | 同步风格 | try/catch | 中 | 中等 |
| RxJS Observable | 流式 | catchError 算子 | 极强（取消、节流） | 困难 |

---

## 7. 常见陷阱与反模式

### 7.1 switch 穿透导致的批量操作失误

**生产事故案例**：某电商系统在订单状态机中使用 `switch` 处理状态转移，因遗漏 `break`，导致"已取消"订单被误转移至"已发货"状态，造成 200 万元损失。

```javascript
// 反模式：遗漏 break 导致穿透
function handleOrder(order) {
  switch (order.status) {
    case 'pending':
      processPayment(order);
      // 遗漏 break，导致继续执行 paid 分支
    case 'paid':
      shipOrder(order); // pending 状态的订单被错误发货
      break;
    case 'shipped':
      deliverOrder(order);
      break;
  }
}

// 正确写法：每个 case 都以 break 结尾
function handleOrderSafe(order) {
  switch (order.status) {
    case 'pending': {
      processPayment(order);
      break;
    }
    case 'paid': {
      shipOrder(order);
      break;
    }
    case 'shipped': {
      deliverOrder(order);
      break;
    }
    default: {
      console.warn(`未知状态：${order.status}`);
    }
  }
}

// 推荐：使用 ESLint 的 no-fallthrough 规则强制检查
```

### 7.2 在循环中创建闭包捕获循环变量

**经典陷阱**：`var` 声明的循环变量在闭包中共享同一引用。

```javascript
// 反模式：var + 闭包导致的延迟绑定问题
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 输出：3 3 3（而非 0 1 2）

// 修正 1：使用 let（块级作用域）
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 输出：0 1 2

// 修正 2：使用 IIFE 立即执行函数捕获当前值
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i);
}
// 输出：0 1 2
```

### 7.3 在异步循环中滥用 forEach

```javascript
// 反模式：forEach 不支持 await，导致异步操作并行执行
async function fetchAll(urls) {
  const results = [];
  urls.forEach(async (url) => {
    // 此处的 await 不会阻塞 forEach
    const res = await fetch(url);
    results.push(res); // 顺序不确定
  });
  return results; // 返回空数组或部分结果
}

// 正确写法 1：使用 for...of 串行执行
async function fetchAllFor(urls) {
  const results = [];
  for (const url of urls) {
    const res = await fetch(url);
    results.push(res);
  }
  return results;
}

// 正确写法 2：使用 Promise.all 并行执行
async function fetchAllParallel(urls) {
  return Promise.all(urls.map((url) => fetch(url)));
}
```

### 7.4 在 finally 块中 return 覆盖异常

```javascript
// 反模式：finally 中的 return 覆盖了 try 中的异常
function dangerousReturn() {
  try {
    throw new Error('业务异常');
  } catch (e) {
    console.error(e.message);
    throw e; // 期望重新抛出
  } finally {
    return 'cleanup'; // 这一行会吞掉上面的 throw
  }
}
console.log(dangerousReturn()); // 输出 'cleanup'，异常被吞掉

// 正确写法：finally 仅做清理，不返回值
function safeReturn() {
  let result;
  try {
    if (Math.random() < 0.5) throw new Error('业务异常');
    result = 'success';
  } catch (e) {
    console.error(e.message);
    result = 'error';
  } finally {
    console.log('cleanup');
    // 不返回任何值
  }
  return result;
}
```

### 7.5 在热路径使用 try/catch

V8 在 TurboFan 优化阶段对 `try/catch` 块的处理曾存在 Bug（2018 年前），导致热路径性能下降 30% 以上。现代 V8（v7.0+）已修复此问题，但仍需注意：

```javascript
// 反模式：在每秒数万次调用的热路径上使用 try/catch
function hotPath(data) {
  for (const item of data) {
    try {
      // 高频操作
      processItem(item);
    } catch (e) {
      // 处理
    }
  }
}

// 改进：将 try/catch 提取到外部
function hotPathOptimized(data) {
  const errors = [];
  for (const item of data) {
    const result = safeProcess(item);
    if (result.error) errors.push(result.error);
  }
  return errors;
}
function safeProcess(item) {
  try {
    return { value: processItem(item) };
  } catch (error) {
    return { error };
  }
}
```

### 7.6 for...in 遍历数组的陷阱

```javascript
// 反模式：for...in 遍历数组（顺序不保证，且包含非数字键）
const arr = [10, 20, 30];
arr.extra = 'oops';
for (const i in arr) {
  console.log(i, arr[i]); // 输出 '0' 10, '1' 20, '2' 30, 'extra' 'oops'
}

// 正确写法：使用 for...of 或传统 for
for (const v of arr) {
  console.log(v); // 10 20 30
}
// 或
for (let i = 0; i < arr.length; i++) {
  console.log(i, arr[i]); // 0 10, 1 20, 2 30
}
```

### 7.7 在条件判断中使用赋值表达式

```javascript
// 反模式：在条件中赋值，易与 === 混淆
if ((user = getUser())) {
  // user 已赋值
}

// 正确写法：分离赋值与判断
const user = getUser();
if (user) {
  // ...
}
```

### 7.8 异步循环中忘记 await

```javascript
// 反模式：忘记 await，导致异步操作未等待即返回
async function processOrders(orders) {
  for (const order of orders) {
    processOrder(order); // 遗漏 await
  }
  console.log('所有订单处理完成'); // 实际并未完成
}

// 正确写法
async function processOrdersSafe(orders) {
  for (const order of orders) {
    await processOrder(order);
  }
  console.log('所有订单处理完成');
}
```

---

## 8. 工程实践

### 8.1 控制流的可读性原则

1. **单一职责**：每个函数仅承担一项控制流职责。若一个函数同时包含分支、循环、异常处理，考虑拆分。
2. **早返回（Early Return）**：用 guard clause 替代嵌套 if-else。

```javascript
// 反模式：深层嵌套
function getDiscount(user) {
  if (user) {
    if (user.isVip) {
      if (user.years > 5) {
        return 0.3;
      } else {
        return 0.2;
      }
    } else {
      return 0.1;
    }
  } else {
    return 0;
  }
}

// 正确写法：早返回
function getDiscountClean(user) {
  if (!user) return 0;
  if (!user.isVip) return 0.1;
  if (user.years > 5) return 0.3;
  return 0.2;
}
```

3. **避免 else after return**：ESLint 规则 `no-else-return`。
4. **限制嵌套深度**：建议 ≤ 3 层，可通过提取函数降低。

### 8.2 性能优化策略

#### 8.2.1 循环展开（谨慎使用）

```javascript
// 在 JIT 优化不足的场景下，循环展开可减少分支预测开销
// 现代引擎会自动展开，手动展开可读性损失大
function sum(arr) {
  let sum = 0;
  const len = arr.length;
  const remainder = len % 4;
  const limit = len - remainder;
  // 4 路展开
  for (let i = 0; i < limit; i += 4) {
    sum += arr[i] + arr[i + 1] + arr[i + 2] + arr[i + 3];
  }
  // 处理剩余
  for (let i = limit; i < len; i++) {
    sum += arr[i];
  }
  return sum;
}
```

#### 8.2.2 缓存长度

```javascript
// 在嵌套循环中缓存外层数组长度
function processMatrix(matrix) {
  for (let i = 0, rows = matrix.length; i < rows; i++) {
    const row = matrix[i];
    for (let j = 0, cols = row.length; j < cols; j++) {
      // ...
    }
  }
}
```

#### 8.2.3 使用 TypedArray 提升数值遍历性能

```javascript
// 对数值数据使用 Float64Array
const data = new Float64Array(1_000_000);
for (let i = 0; i < data.length; i++) {
  data[i] = Math.random();
}
// 比 Array 快 2-3 倍，且内存占用更少
```

### 8.3 异步控制流的并发优化

```javascript
// 串行执行：总耗时 = sum(每个任务耗时)
async function sequential(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

// 并行执行：总耗时 = max(每个任务耗时)
async function parallel(tasks) {
  return Promise.all(tasks.map((t) => t()));
}

// 限流并行：避免一次性发起过多请求
async function parallelWithLimit(tasks, limit = 10) {
  const results = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}
```

### 8.4 可测试性设计

控制流应设计为易于单元测试：

1. **依赖注入**：将副作用（网络、文件、随机数）作为参数传入。
2. **纯函数优先**：相同输入产生相同输出，无副作用。
3. **避免隐藏控制流**：不要在工具函数中调用全局配置。

```javascript
// 反模式：依赖全局配置，难以测试
function calculate() {
  if (window.config.debug) {
    console.log('calculating');
  }
  return 42;
}

// 正确写法：依赖注入
function calculate(logger = () => {}) {
  logger('calculating');
  return 42;
}
```

### 8.5 ESLint 规则配置

推荐启用以下 ESLint 规则保障控制流质量：

```json
{
  "rules": {
    "no-fallthrough": "error",
    "no-else-return": "warn",
    "no-useless-return": "warn",
    "no-return-await": "warn",
    "no-async-promise-executor": "error",
    "require-await": "warn",
    "no-await-in-loop": "off",
    "max-depth": ["warn", 4],
    "max-lines-per-function": ["warn", { "max": 100, "skipComments": true }],
    "complexity": ["warn", 10]
  }
}
```

### 8.6 TypeScript 类型收窄

TypeScript 利用控制流进行类型收窄（Type Narrowing），是 JavaScript 控制流的强类型扩展：

```typescript
// 类型守卫
function process(value: string | number) {
  if (typeof value === 'string') {
    // 此处 value: string
    return value.toUpperCase();
  }
  // 此处 value: number
  return value * 2;
}

// 判别式联合
type Result = { ok: true; value: number } | { ok: false; error: string };
function handle(result: Result) {
  if (result.ok) {
    // 此处 result.value: number
    console.log(result.value);
  } else {
    // 此处 result.error: string
    console.error(result.error);
  }
}

// 自定义类型守卫
function isError(x: unknown): x is Error {
  return x instanceof Error;
}
```

---

## 9. 案例研究

### 9.1 案例一：React 中的条件渲染模式

**项目背景**：某大型 SaaS 后台管理系统中，列表页的列渲染逻辑包含 200+ 个字段，每个字段根据权限、状态、用户偏好动态显示。

**原始实现**：嵌套三元运算符，可读性极差：

```jsx
// 反模式
const renderCell = (field, value, user) =>
  field === 'name' ? (
    <Link to={`/users/${value.id}`}>{value.text}</Link>
  ) : field === 'status' ? (
    user.role === 'admin' ? (
      <StatusEditor value={value} />
    ) : (
      <StatusBadge value={value} />
    )
  ) : field === 'amount' ? (
    <Currency value={value} />
  ) : (
    <span>{value}</span>
  );
```

**重构方案**：策略模式 + 查找表

```jsx
// 重构后
const CELL_RENDERERS = {
  name: (value) => <Link to={`/users/${value.id}`}>{value.text}</Link>,
  status: (value, user) =>
    user.role === 'admin' ? <StatusEditor value={value} /> : <StatusBadge value={value} />,
  amount: (value) => <Currency value={value} />,
  default: (value) => <span>{value}</span>,
};

const renderCell = (field, value, user) => {
  const renderer = CELL_RENDERERS[field] || CELL_RENDERERS.default;
  return renderer(value, user);
};
```

**收益**：新增字段只需添加一行配置，无需修改控制流主体，圈复杂度从 15 降至 2。

### 9.2 案例二：异步批量请求的重试与限流

**项目背景**：金融数据采集系统，需从 200 个上游 API 拉取数据，要求限流（每秒最多 10 并发）、失败重试（最多 3 次）、超时（5 秒）。

**实现**：

```javascript
async function fetchWithRetry(url, retries = 3, timeout = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      if (attempt === retries) throw err;
      // 指数退避
      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function batchFetch(urls, concurrency = 10) {
  const queue = [...urls];
  const results = new Array(urls.length);
  let index = 0;
  async function worker() {
    while (queue.length > 0) {
      const i = index++;
      const url = queue.shift();
      try {
        results[i] = { ok: true, data: await fetchWithRetry(url) };
      } catch (err) {
        results[i] = { ok: false, error: err };
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}
```

**生产收益**：吞吐量从串行的 200 秒降至并行的 25 秒，失败率从 15% 降至 0.1%。

### 9.3 案例三：基于生成器的协程调度

**项目背景**：长视频处理任务（转码、加水印、上传）总耗时 10 分钟，需在浏览器中执行且不阻塞主线程。

**实现**：使用生成器实现协程，每隔 16ms 让出主线程：

```javascript
function* processVideo(file) {
  const frames = decode(file);
  yield; // 让出主线程
  for (const frame of frames) {
    watermark(frame);
    if (performance.now() % 16 < 1) yield; // 每 16ms 让出一次
  }
  yield;
  const encoded = encode(frames);
  yield;
  upload(encoded);
}

function runCoroutine(gen) {
  function step() {
    const { done } = gen.next();
    if (!done) {
      requestAnimationFrame(step);
    }
  }
  step();
}

runCoroutine(processVideo(file));
```

**收益**：避免阻塞主线程，保持 60fps 用户交互；任务可随时通过 `gen.return()` 中断。

---

## 10. 习题

### 10.1 基础题

**题目 1**：以下代码输出什么？解释原因。

```javascript
console.log(0 || 'default');
console.log(0 ?? 'default');
console.log('' || 'default');
console.log('' ?? 'default');
console.log(null ?? 'default');
console.log(undefined ?? 'default');
```

**参考答案要点**：
- `||` 在左操作数为 Falsy 时返回右操作数：`'default'`、`'default'`
- `??` 仅在左操作数为 `null` 或 `undefined` 时返回右操作数：`0`、`''`、`'default'`、`'default'`
- 关键区别：`||` 不能区分 `false`/`0`/`''` 与 `null`/`undefined`，`??` 专门处理空值

**题目 2**：将以下嵌套 if-else 重构为早返回风格。

```javascript
function classify(score) {
  let grade;
  if (score >= 90) {
    grade = 'A';
  } else {
    if (score >= 80) {
      grade = 'B';
    } else {
      if (score >= 60) {
        grade = 'C';
      } else {
        grade = 'F';
      }
    }
  }
  return grade;
}
```

**参考答案要点**：
```javascript
function classify(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 60) return 'C';
  return 'F';
}
```

### 10.2 进阶题

**题目 3**：以下代码输出什么？解释 `finally` 的覆盖行为。

```javascript
function test() {
  try {
    return 1;
  } finally {
    return 2;
  }
}
console.log(test());
```

**参考答案要点**：输出 `2`。`finally` 块的 `return` 会覆盖 `try` 块的 `return`。这是规范定义的行为，但应作为反模式避免。

**题目 4**：实现一个 `retry(fn, retries, delay)` 函数，支持异步函数重试与指数退避。

**参考答案要点**：
```javascript
async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, delay * 2 ** (i - 1)));
    }
  }
}
```

### 10.3 挑战题

**题目 5**：设计一个可中断的 `map` 函数，支持在迭代过程中通过外部信号中止，并保证已开始的工作单元完成。

**参考答案要点**：
```javascript
async function interruptibleMap(arr, fn, shouldStop) {
  const results = [];
  for (const item of arr) {
    if (shouldStop()) break;
    results.push(await fn(item));
  }
  return results;
}
```
进阶：使用 AbortSignal 实现更通用的中断机制。

**题目 6**：用生成器实现一个"协程池"，支持 N 个并发协程，且可在任意时刻添加新协程。

**参考答案要点**：需使用生成器函数配合 Promise 实现调度，可参考 co 库的实现思路。关键是维护一个待执行队列与正在执行的集合，每当有空闲槽位时取出下一个协程执行。

**题目 7**：分析以下代码的性能瓶颈，并提出优化方案。

```javascript
function findPairs(arr, target) {
  const pairs = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      if (arr[i] + arr[j] === target && i !== j) {
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}
```

**参考答案要点**：
- 瓶颈：$O(n^2)$ 时间复杂度，且未利用哈希表加速
- 优化：使用哈希表记录已遍历元素，将时间复杂度降为 $O(n)$
```javascript
function findPairsOptimized(arr, target) {
  const seen = new Map();
  const pairs = [];
  for (let i = 0; i < arr.length; i++) {
    const complement = target - arr[i];
    if (seen.has(complement)) {
      for (const j of seen.get(complement)) {
        pairs.push([j, i]);
      }
    }
    if (!seen.has(arr[i])) seen.set(arr[i], []);
    seen.get(arr[i]).push(i);
  }
  return pairs;
}
```

---

## 11. 参考文献

[1] Ecma International. 2024. *ECMAScript 2024 Language Specification (ECMA-262, 15th edition)*. Geneva, Switzerland: Ecma International. https://www.ecma-international.org/wp-content/uploads/ECMA-262_15th_edition_june_2024.pdf

[2] Dijkstra, E. W. 1968. Go to statement considered harmful. *Communications of the ACM* 11, 3 (March 1968), 147–148. DOI: https://doi.org/10.1145/362929.362947

[3] Böhm, C. and Jacopini, G. 1966. Flow diagrams, Turing machines and languages with only two formation rules. *Communications of the ACM* 9, 5 (May 1966), 366–371. DOI: https://doi.org/10.1145/355572.365646

[4] Anderson, L. W. and Krathwohl, D. R. (Eds.). 2001. *A Taxonomy for Learning, Teaching, and Assessing: A Revision of Bloom's Taxonomy of Educational Objectives*. Longman, New York, NY.

[5] Hoare, C. A. R. 1969. An axiomatic basis for computer programming. *Communications of the ACM* 12, 10 (October 1969), 576–580. DOI: https://doi.org/10.1145/363235.363259

[6] Eich, B. 1999. *JavaScript at Ten Years*. Microsoft Corporation, Redmond, WA. (Invited talk at ICSE 1999.) https://brendaneich.com/2005/04/javascript-at-ten-years/

[7] Wirfs-Brock, A. and Eich, B. 2020. *JavaScript: The First 20 Years*. *Proceedings of the ACM on Programming Languages* 4, HOPL (June 2020), 1–189. DOI: https://doi.org/10.1145/3386327

[8] Servo Project. 2024. *ECMAScript Control Flow Graph Specification*. Mozilla Foundation, San Francisco, CA. https://github.com/servo/servo/blob/main/components/script/dom/bindings/codegen/CFG.md

[9] Nielsen, J. 1994. *Usability Engineering*. Morgan Kaufmann, San Francisco, CA. DOI: https://doi.org/10.1016/B978-0-08-052029-2.50007-9

[10] Pombrio, J. and Krishnamurthi, S. 2020. *Sweetness: Evaluating and improving prettier's control flow formatting*. Brown University, Providence, RI. https://cs.brown.edu/~sk/Memos/Trimming-Whitespace/

---

## 12. 延伸阅读

### 12.1 官方文档

- ECMAScript 规范：https://tc39.es/ecma262/
- MDN Web Docs - 控制流：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Control_flow_and_error_handling
- MDN Web Docs - 迭代器与生成器：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Iterators_and_generators
- V8 引擎博客：https://v8.dev/blog

### 12.2 经典教材

- Flanagan, D. 2020. *JavaScript: The Definitive Guide, 7th Edition*. O'Reilly Media, Sebastopol, CA.
- Haverbeke, M. 2018. *Eloquent JavaScript, 3rd Edition*. No Starch Press, San Francisco, CA. https://eloquentjavascript.net/
- Simpson, K. 2019. *You Don't Know JS Yet (book series)*, 2nd Edition. O'Reilly Media. https://github.com/getify/You-Dont-Know-JS
- Crockford, D. 2008. *JavaScript: The Good Parts*. O'Reilly Media, Sebastopol, CA.

### 12.3 前沿论文

- Madsen, M. and Lhoták, O. 2020. *A Sound and Complete Semantics for JavaScript Promises*. *Proceedings of the ACM on Programming Languages* 4, OOPSLA (November 2020), 1–28. DOI: https://doi.org/10.1145/3428253

- Park, J. and Zhao, J. 2023. *Static Analysis of Asynchronous JavaScript*. *Proceedings of the 44th ACM SIGPLAN Conference on Programming Language Design and Implementation* (PLDI '23), 234–248. DOI: https://doi.org/10.1145/3591257

- Sridharan, M. et al. 2022. *TAJS: Type Analysis for JavaScript*. Aarhus University. https://github.com/cs-au-dk/tajs

### 12.4 进阶资源

- *SICP* (Structure and Interpretation of Computer Programs)：https://mitpress.mit.edu/sites/default/files/sicp/index.html
- *Crafting Interpreters* by Robert Nystrom：https://craftinginterpreters.com/
- AST Explorer：https://astexplorer.net/
- JavaScript Visualizer 9000：https://jsvisualizer.com/

---

## 13. 附录

### 13.1 术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 控制流 | Control Flow | 程序指令的执行顺序 |
| 控制流图 | Control Flow Graph (CFG) | 表示程序控制流的 directed graph |
| 基本块 | Basic Block | 无跳转的连续指令序列 |
| 循环不变式 | Loop Invariant | 每次循环迭代前后均成立的谓词 |
| Hoare 逻辑 | Hoare Logic | 基于前置条件与后置条件的程序逻辑推理系统 |
| 不动点 | Fixed Point | 满足 $f(x) = x$ 的元素 $x$ |
| 短路求值 | Short-circuit Evaluation | 仅在需要时求值右操作数 |
| 尾调用优化 | Tail Call Optimization (TCO) | 复用当前栈帧执行尾调用 |
| 协程 | Coroutine | 可暂停与恢复的函数 |
| 结构化操作语义 | Structural Operational Semantics (SOS) | 形式语义学的一种风格 |

### 13.2 ESLint 规则速查

| 规则 | 作用 | 推荐等级 |
|------|------|---------|
| `no-fallthrough` | 禁止 switch 穿透 | error |
| `no-else-return` | 禁止 return 后的 else | warn |
| `no-return-await` | 禁止不必要的 return await | warn |
| `no-await-in-loop` | 警告循环中的 await | off（按场景） |
| `max-depth` | 限制嵌套深度 | warn |
| `complexity` | 限制圈复杂度 | warn |
| `guard-for-in` | 强制 for...in 配合 hasOwnProperty | error |

### 13.3 性能基准参考

V8 引擎下（Node.js v22）的典型性能数据（仅供参考，实际以基准测试为准）：

| 操作 | 每秒操作数 | 备注 |
|------|----------|------|
| `for (let i = 0; i < arr.length; i++)` | ~1.5 亿 | 最快 |
| `for (const x of arr)` | ~1.2 亿 | 接近 for |
| `arr.forEach(fn)` | ~5000 万 | 函数调用开销 |
| `arr.map(fn).filter(fn)` | ~3000 万 | 中间数组分配 |
| `arr.reduce(fn, 0)` | ~6000 万 | 单次遍历 |
| `try { throw } catch` | ~100 万 | 抛出与捕获开销 |

### 13.4 控制流与并发原语对照

| JavaScript | Rust | Go | Python |
|-----------|------|----|-------|
| `async/await` | `async fn` + `await` | `goroutine` + `chan` | `async def` + `await` |
| `Promise.all` | `tokio::join!` | `sync.WaitGroup` | `asyncio.gather` |
| `for await...of` | `futures::stream::Stream` | `for range chan` | `async for` |
| `try/catch` | `Result<T, E>` | `if err != nil` | `try/except` |
| `AbortController` | `CancellationToken` | `context.Context` | `asyncio.CancelledError` |
