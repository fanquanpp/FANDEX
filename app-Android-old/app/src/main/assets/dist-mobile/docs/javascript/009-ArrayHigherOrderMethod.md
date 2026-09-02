# 数组高阶方法（Array Higher-Order Methods）

## 前置知识

- [函数、作用域与闭包](/javascript/008-FunctionScopeClosure)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 历史动机与发展脉络（Historical Motivation & Evolution）」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义（Formal Definitions）」的核心机制、典型用法与常见陷阱
- 掌握「3. 理论推导与原理解析（Theoretical Derivation）」的核心机制、典型用法与常见陷阱
- 掌握「4. 代码示例（Production-Ready Examples）」的核心机制、典型用法与常见陷阱
- 掌握「5. 对比分析（Comparative Analysis）」的核心机制、典型用法与常见陷阱


> 本篇对标 MIT 6.031（Software Construction）、Stanford CS110L（Safety in Systems Programming）与 CMU 15-150（Functional Programming）教学水准，系统讲授 JavaScript 数组高阶方法的形式语义、工程实践与性能权衡。所有数学公式使用 KaTeX 渲染，参考文献采用 ACM Reference Format。

---

## 1. 历史动机与发展脉络（Historical Motivation & Evolution）

### 1.1 函数式编程的谱系

数组高阶方法的根源可追溯至 1958 年 John McCarthy 在 MIT 设计的 Lisp 语言。Lisp 的 `mapcar`、`remove-if-not`（即 `filter`）、`reduce` 三大原语奠定了"列表作为统一数据结构"的函数式范式。随后，ML 语言（1973，Robin Milner，爱丁堡大学）引入了类型化的代数数据类型（Algebraic Data Type, ADT）与模式匹配，Haskell（1990）进一步将 `Functor`、`Monad`、`Foldable` 抽象为 type class。

JavaScript 的数组高阶方法本质上是这些函数式原语在动态类型语言中的工程化落地。Brendan Eich 在 1995 年设计 JavaScript 时，受 Scheme（Lisp 方言）影响，将函数视为一等公民（first-class citizen），为后续的高阶方法奠定了语义基础。

### 1.2 JavaScript 1.0 → ES5：奠基期（1995–2009）

- **1995（JavaScript 1.0）**：Netscape 2.0 发布，JavaScript 仅有 `for` / `while` / `for..in` 循环，无数组高阶方法。
- **1997（ECMAScript 1）**：ECMA-262 第 1 版标准化，数组仅含 `join / reverse / sort / concat / slice / splice / push / pop / shift / unshift`。
- **1999（ECMAScript 3）**：新增 `forEach / map / filter / some / every / reduce / reduceRight / indexOf / lastIndexOf`，由 Mozilla 的 Brendan Eich 与 Dave Herman 推动，对标 Python 的列表推导与 Ruby 的 `Enumerable` 模块。**这是 JavaScript 数组方法的关键里程碑**。
- **2009（ES5）**：正式纳入规范，新增严格模式（strict mode），明确回调签名为 `(element, index, array)`，并引入 `thisArg` 参数以支持 `this` 绑定。

### 1.3 ES6 → ES2024：现代化与函数式补全（2015–2024）

| 版本 | 年份 | 新增方法 | TC39 提案 |
| --- | --- | --- | --- |
| ES2015 | 2015 | `Array.from` / `Array.of` / `find` / `findIndex` / `entries` / `keys` / `values` / `copyWithin` / `fill` | Array.prototype.find / findIndex |
| ES2019 | 2019 | `flat` / `flatMap` | Array.prototype.flat / flatMap（Brian Terlson、Michael Ficarra） |
| ES2023 | 2023 | `findLast` / `findLastIndex` / `toReversed` / `toSorted` / `toSpliced` / `with`（不可变变体，Change Array by Copy） | Change Array by Copy（Ashley Claymore） |
| ES2024 | 2024 | `Object.groupBy` / `Map.groupBy`（数组分组） | Array.prototype.group（Justin Ridgewell） |
| ES2025（候选） | 2025 | `Iterator.prototype.map / filter / take / drop / reduce`（Iterator Helpers） | Iterator Helpers（Michael Ficarra） |

### 1.4 设计哲学的转向

ES2019 的 `flat` / `flatMap` 与 ES2023 的"Change Array by Copy"系列标志着 JavaScript 数组方法的设计哲学从"原地变更"（in-place mutation）向"不可变纯函数"（immutable pure function）转向，这与 React 的不可变状态管理、Redux 的 reducer 纯函数约束形成共振，是函数式编程范式在前端工程中全面渗透的体现。

> **Brendan Eich 设计注记**：JavaScript 最初被要求"看起来像 Java"，但 Eich 在 10 天内完成原型时，悄悄植入了 Scheme 的一等函数与 Self 的原型继承。这种"Java 的皮、Scheme 的骨"的设计，使得 JavaScript 天然适合承载函数式数组操作。

---

## 2. 形式化定义（Formal Definitions）

### 2.1 ECMAScript 规范引用

本节所有方法的语义以 ECMA-262 第 14 版（ES2024）为准。规范文本位于 <https://tc39.es/ecma262/>。

- `Array.prototype.map`：§23.1.3.13 `Array.prototype.map ( callbackfn [ , thisArg ] )`
- `Array.prototype.filter`：§23.1.3.9 `Array.prototype.filter ( callbackfn [ , thisArg ] )`
- `Array.prototype.reduce`：§23.1.3.21 `Array.prototype.reduce ( callbackfn [ , initialValue ] )`
- `Array.prototype.flatMap`：§23.1.3.11 `Array.prototype.flatMap ( mapperFunction [ , thisArg ] )`

### 2.2 高阶函数的形式定义

**定义 3.2.1（高阶函数）**：函数 $f$ 称为高阶函数，当且仅当它满足以下任一条件：

1. 接受一个或多个函数作为输入：$f : (A \to B) \to C$
2. 返回一个函数作为输出：$f : A \to (B \to C)$
3. 两者兼具：$f : (A \to B) \to (C \to D)$

JavaScript 的 `map` / `filter` / `reduce` 等数组方法均属于第一类高阶函数。

### 2.3 Functor 类型类

**定义 3.3.1（Functor）**：设 $F$ 为类型构造子（type constructor），$F$ 是 Functor 当且仅当存在一个 `map` 操作（在 Haskell 中记作 `fmap`）满足以下类型签名与两条公理：

类型签名：

$$\text{map} : F\,A \to (A \to B) \to F\,B$$

公理（Functor Laws）：

1. **同一律（Identity）**：$\text{map}(id) = id$，即对恒等函数 $id(x) = x$ 做 map 不改变原结构。
2. **复合律（Composition）**：$\text{map}(g \circ f) = \text{map}(g) \circ \text{map}(f)$。

JavaScript 数组 `Array<T>` 是 Functor 的实例。验证同一律：

```javascript
// ES2015 — 验证 Functor 同一律
const id = (x) => x;
const arr = [1, 2, 3];
console.log(JSON.stringify(arr.map(id)) === JSON.stringify(arr)); // true
```

验证复合律：

```javascript
// ES2015 — 验证 Functor 复合律
const f = (x) => x + 1;
const g = (x) => x * 2;
const arr = [1, 2, 3];
const lhs = arr.map((x) => g(f(x)));        // map(g ∘ f)
const rhs = arr.map(f).map(g);             // map(g) ∘ map(f)
console.log(JSON.stringify(lhs) === JSON.stringify(rhs)); // true
```

### 2.4 Monad 类型类与 flatMap

**定义 3.4.1（Monad）**：设 $M$ 为类型构造子，$M$ 是 Monad 当且仅当存在：

- `of`（即 `pure` / `return`）：$A \to M\,A$
- `flatMap`（即 `bind` / `>>=`）：$M\,A \to (A \to M\,B) \to M\,B$

并满足三条 Monad 律：

1. **左单位律（Left Identity）**：$\text{flatMap}(\text{of}(x), f) = f(x)$
2. **右单位律（Right Identity）**：$\text{flatMap}(m, \text{of}) = m$
3. **结合律（Associativity）**：$\text{flatMap}(\text{flatMap}(m, f), g) = \text{flatMap}(m, (x) => \text{flatMap}(f(x), g))$

JavaScript 数组在"嵌套即 Monad 上下文"的解读下近似满足 Monad 律（`of` 对应 `[x]`，`flatMap` 对应 `Array.prototype.flatMap`）。需要说明的是，JavaScript 数组并非严格意义上的 Monad，因为其语义超载（既是 Functor 又是"非确定性计算"的载体），但在工程实践中按 Monad 模式使用是安全的。

### 2.5 Foldable 类型类与 reduce

**定义 3.5.1（Foldable）**：类型 $F$ 是 Foldable 当且仅当存在 `foldr`（右折叠）与 `foldl`（左折叠）：

$$\text{foldr} : (A \to B \to B) \to B \to F\,A \to B$$

$$\text{foldl} : (B \to A \to B) \to B \to F\,A \to B$$

JavaScript 的 `reduce` 对应 `foldl`（左折叠），`reduceRight` 对应 `foldr`（右折叠）。

形式化语义（ECMA-262 §23.1.3.21 简化）：

$$\text{reduce}(f, \text{init}, [a_0, a_1, \dots, a_{n-1}]) = f(f(\dots f(f(\text{init}, a_0), a_1) \dots, a_{n-2}), a_{n-1})$$

递归定义：

$$\text{reduce}(f, \text{acc}, []) = \text{acc}$$

$$\text{reduce}(f, \text{acc}, [x, \dots, xs]) = \text{reduce}(f, f(\text{acc}, x), xs)$$

### 2.6 时间复杂度形式化

设 $n$ 为数组长度，$T_f$ 为回调函数单次执行时间，各方法的时间复杂度与空间复杂度形式化如下：

| 方法 | 时间复杂度 | 空间复杂度 | 备注 |
| --- | --- | --- | --- |
| `forEach` | $O(n \cdot T_f)$ | $O(1)$ | 无返回值，仅副作用 |
| `map` | $O(n \cdot T_f)$ | $O(n)$ | 分配新数组 |
| `filter` | $O(n \cdot T_f)$ | $O(n)$ 最坏 | 最坏分配新数组 |
| `reduce` | $O(n \cdot T_f)$ | $O(1)$ | 累加器模式 |
| `find` / `findLast` | $O(k \cdot T_f)$，$k \leq n$ | $O(1)$ | 早终止 |
| `some` / `every` | $O(k \cdot T_f)$，$k \leq n$ | $O(1)$ | 短路求值 |
| `flat` | $O(n \cdot d)$，$d$ 为深度 | $O(n)$ | 递归展平 |
| `flatMap` | $O(n \cdot T_f)$ | $O(n)$ | map + flat(1) |
| `sort` | $O(n \log n)$ | $O(n)$ | V8 使用 TimSort |

---

## 3. 理论推导与原理解析（Theoretical Derivation）

### 3.1 归约的代数结构

考虑数组的求和归约：

$$S = \sum_{i=0}^{n-1} a_i = a_0 + a_1 + \dots + a_{n-1}$$

用 `reduce` 表达：

```javascript
const sum = (arr) => arr.reduce((acc, x) => acc + x, 0);
```

从代数角度看，求和操作构成一个**么半群（Monoid）**：

- 封闭性：$a + b \in \mathbb{R}$
- 结合律：$(a + b) + c = a + (b + c)$
- 单位元：$0 + a = a + 0 = a$

**定理 4.1.1**：若二元运算 $\oplus$ 构成么半群，单位元为 $e$，则 $\text{reduce}(\oplus, e, \text{arr})$ 的结果与折叠方向无关（在满足结合律的前提下）。

证明：由结合律，$(a \oplus b) \oplus c = a \oplus (b \oplus c)$，归纳可证任意分组折叠结果一致。$\square$

这意味着：对于求和、求积、字符串拼接、数组合并等满足结合律的操作，`reduce` 与 `reduceRight` 结果相同（在无浮点误差时）。

### 3.2 短路求值的形式化

`some` 与 `every` 实现了短路求值（short-circuit evaluation）：

$$\text{some}(p, [a_0, \dots, a_{n-1}]) = \bigvee_{i=0}^{n-1} p(a_i)$$

$$\text{every}(p, [a_0, \dots, a_{n-1}]) = \bigwedge_{i=0}^{n-1} p(a_i)$$

其中 $\vee$ 为逻辑或，$\wedge$ 为逻辑与。短路性质：

$$\text{some}(p, \text{arr}) = \text{true} \implies \exists k, \forall i < k, p(a_i) = \text{false}, p(a_k) = \text{true}$$

即一旦遇到第一个 `true`，立即返回，不再评估后续元素。这一性质使得 `some` / `every` 可用于"早终止"场景，时间复杂度从 $O(n)$ 降至 $O(k)$。

### 3.3 map 与 filter 的融合（Fusion）

考虑链式调用 `arr.map(f).filter(p)`，其语义为：

$$\text{result} = \{ f(x) \mid x \in \text{arr}, p(f(x)) \}$$

朴素实现会产生中间数组 `arr.map(f)`，再对其执行 `filter`，空间复杂度 $O(2n)$。

通过**融合律（Fusion Law）**，可将其等价改写为单遍 `reduce`：

$$\text{result} = \text{reduce}((\text{acc}, x) \Rightarrow p(f(x)) ? \text{acc} \cup \{f(x)\} : \text{acc}, \emptyset, \text{arr})$$

空间复杂度降为 $O(k)$（$k$ 为结果元素数）。这是函数式编程中 deforestation（去森林化，Wadler, 1990）的特例，也是 transducer 的理论基础。

### 3.4 flatMap 的 Monad 结合律验证

验证 `flatMap` 的结合律：

```javascript
// ES2019 — 验证 flatMap 结合律
const m = [1, 2, 3];
const f = (x) => [x, x * 10];
const g = (x) => [x, -x];

// 左侧：flatMap(flatMap(m, f), g)
const lhs = m.flatMap(f).flatMap(g);

// 右侧：flatMap(m, x => flatMap(f(x), g))
const rhs = m.flatMap((x) => f(x).flatMap(g));

console.log(JSON.stringify(lhs) === JSON.stringify(rhs)); // true
```

### 3.5 sort 的 TimSort 分析

V8 自 v7.0（2018）起采用 TimSort（Tim Peters, 2002）替代原地快排。TimSort 的时间复杂度：

$$T(n) = \begin{cases} O(n) & \text{若数组已部分有序（存在长 run）} \\ O(n \log n) & \text{最坏情况} \end{cases}$$

空间复杂度 $O(n)$。TimSort 的核心是识别"自然有序段"（natural run）并合并。对于近乎有序的数组，TimSort 接近 $O(n)$，优于快排。

**稳定性**：TimSort 是稳定排序，即相等元素的相对顺序保持不变。这与 ES2019 起规范要求的"稳定排序"一致（ES2018 之前规范未要求稳定性，不同引擎行为不一）。

---

## 4. 代码示例（Production-Ready Examples）

### 4.1 工程项目配置

以下示例基于 Node.js 18+ 与原生 ES Modules。`package.json` 配置：

```json
{
  "name": "array-hof-demo",
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test",
    "bench": "node --inspect-brk src/bench.js"
  },
  "devDependencies": {
    "@types/node": "^20.10.0"
  }
}
```

### 4.2 map — 结构化映射

```javascript
// ES2015 — 将原始用户记录映射为视图模型
// 生产场景：API 响应清洗，去除敏感字段，格式化日期
const rawUsers = [
  { id: 1, name: 'Alice', email: 'alice@example.com', password_hash: 'xxx', created_at: 1700000000000 },
  { id: 2, name: 'Bob', email: 'bob@example.com', password_hash: 'yyy', created_at: 1700000001000 },
];

const toUserView = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  // 保留 UTC 时间戳的可读形式
  createdAt: new Date(u.created_at).toISOString(),
});

const userViews = rawUsers.map(toUserView);
console.log(userViews);
// [ { id: 1, name: 'Alice', ... }, { id: 2, name: 'Bob', ... } ]
```

### 4.3 filter — 谓词筛选

```javascript
// ES2015 — 按多条件筛选订单
// 生产场景：报表系统按时间段、状态、金额过滤
const orders = [
  { id: 'O-1', status: 'paid', amount: 120, ts: 1700000000000 },
  { id: 'O-2', status: 'pending', amount: 50, ts: 1700000001000 },
  { id: 'O-3', status: 'paid', amount: 300, ts: 1700000002000 },
];

const isHighValuePaid = (o) =>
  o.status === 'paid' && o.amount >= 100;

const highValueOrders = orders.filter(isHighValuePaid);
// [ { id: 'O-1', ... }, { id: 'O-3', ... } ]
```

### 4.4 reduce — 万能归约（核心方法）

#### 4.4.1 数组求和与统计

```javascript
// ES5 — 基础归约：求和、求积、极值
const nums = [1, 2, 3, 4, 5];

const sum = nums.reduce((acc, x) => acc + x, 0);            // 15
const product = nums.reduce((acc, x) => acc * x, 1);        // 120
const max = nums.reduce((acc, x) => Math.max(acc, x), -Infinity); // 5
const min = nums.reduce((acc, x) => Math.min(acc, x), Infinity);  // 1
```

#### 4.4.2 数组扁平化（reduce 版）

```javascript
// ES5 — 在 flat 出现前的经典写法
const nested = [[1, 2], [3, 4], [5]];
const flat = nested.reduce((acc, arr) => acc.concat(arr), []);
// [1, 2, 3, 4, 5]
```

#### 4.4.3 按字段分组

```javascript
// ES2015 — 按属性分组（ES2024 后可用 Object.groupBy 替代）
const people = [
  { name: 'Alice', dept: 'Eng' },
  { name: 'Bob', dept: 'Sales' },
  { name: 'Carol', dept: 'Eng' },
];

const byDept = people.reduce((acc, p) => {
  (acc[p.dept] ||= []).push(p);
  return acc;
}, {});
// { Eng: [{...}, {...}], Sales: [{...}] }
```

#### 4.4.4 管道化函数组合

```javascript
// ES2015 — 用 reduce 组合函数管道，对标 Ramda pipe / lodash flow
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);

const trim = (s) => s.trim();
const toLower = (s) => s.toLowerCase();
const kebab = (s) => s.replace(/\s+/g, '-');

const slugify = pipe(trim, toLower, kebab);
console.log(slugify('  Hello World  ')); // 'hello-world'
```

#### 4.4.5 状态机归约

```javascript
// ES2015 — 用 reduce 实现有限状态机（FSM）
// 场景：解析事件流，输出状态轨迹
const events = [
  { type: 'START' },
  { type: 'DATA', value: 1 },
  { type: 'DATA', value: 2 },
  { type: 'END' },
];

const transitions = {
  IDLE: { START: 'RUNNING' },
  RUNNING: { DATA: 'RUNNING', END: 'DONE' },
  DONE: {},
};

const trace = events.reduce(
  (state, evt) => transitions[state][evt.type] || state,
  'IDLE'
);
console.log(trace); // 'DONE'
```

### 4.5 flatMap — 映射后展平

```javascript
// ES2019 — flatMap 经典应用：分词与映射
const sentences = ['hello world', 'foo bar baz'];

const words = sentences.flatMap((s) => s.split(' '));
// ['hello', 'world', 'foo', 'bar', 'baz']

// 等价于 sentences.map(s => s.split(' ')).flat()
```

#### 4.5.1 一对多映射

```javascript
// ES2019 — 订单展开为订单项
const orders = [
  { id: 'O-1', items: [{ sku: 'A', qty: 2 }, { sku: 'B', qty: 1 }] },
  { id: 'O-2', items: [{ sku: 'C', qty: 5 }] },
];

const lineItems = orders.flatMap((o) =>
  o.items.map((it) => ({ orderId: o.id, ...it }))
);
// [ {orderId:'O-1',sku:'A',qty:2}, {orderId:'O-1',sku:'B',qty:1}, {orderId:'O-2',sku:'C',qty:5} ]
```

### 4.6 find / findLast — 查找首个匹配

```javascript
// ES2015 / ES2023 — 查找与逆序查找
const users = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob', active: false },
  { id: 3, name: 'Carol', active: true },
];

const firstActive = users.find((u) => u.active);   // { id: 1, ... }
const lastActive = users.findLast((u) => u.active); // { id: 3, ... }（ES2023）
const firstActiveIdx = users.findIndex((u) => u.active);        // 0
const lastActiveIdx = users.findLastIndex((u) => u.active);     // 2（ES2023）
```

### 4.7 some / every — 存在量词与全称量词

```javascript
// ES5 — 等价于一阶逻辑的 ∃ 与 ∀
const nums = [1, 3, 5, 7];

const hasEven = nums.some((x) => x % 2 === 0);    // false
const allOdd = nums.every((x) => x % 2 === 1);    // true

// 短路示例：some 在遇到第一个 true 时停止
const checks = [0, 0, 1, 2];
const hasTruthy = checks.some((x) => {
  console.log('checking', x);
  return Boolean(x);
});
// 输出 checking 0, checking 0, checking 1，然后返回 true
```

### 4.8 sort — 排序与比较器

```javascript
// ES2019+ — 稳定排序
const arr = [3, 1, 4, 1, 5, 9, 2, 6];
arr.sort((a, b) => a - b); // 升序：[1, 1, 2, 3, 4, 5, 6, 9]
arr.sort((a, b) => b - a); // 降序

// ES2023 — 不可变排序（不修改原数组）
const sorted = arr.toSorted((a, b) => a - b);
console.log(arr === sorted); // false（新数组）
```

#### 4.8.1 自定义对象排序

```javascript
// ES2015 — 多字段排序
const employees = [
  { name: 'Alice', dept: 'Eng', salary: 120 },
  { name: 'Bob', dept: 'Sales', salary: 90 },
  { name: 'Carol', dept: 'Eng', salary: 110 },
];

// 先按部门升序，部门相同按薪资降序
const cmp = (a, b) => {
  if (a.dept !== b.dept) return a.dept < b.dept ? -1 : 1;
  return b.salary - a.salary;
};
employees.sort(cmp);
```

### 4.9 Object.groupBy / Map.groupBy（ES2024）

```javascript
// ES2024 — 原生分组方法
const inventory = [
  { name: 'Apple', category: 'fruit' },
  { name: 'Carrot', category: 'veg' },
  { name: 'Banana', category: 'fruit' },
];

const grouped = Object.groupBy(inventory, (x) => x.category);
// { fruit: [...], veg: [...] }

const groupedMap = Map.groupBy(inventory, (x) => x.category);
// Map(2) { 'fruit' => [...], 'veg' => [...] }
```

### 4.10 Change Array by Copy（ES2023）

```javascript
// ES2023 — 不可变更体系，适配 React/Redux 不可变约束
const original = [3, 1, 2];

const reversed = original.toReversed();      // [2, 1, 3]，original 不变
const sorted = original.toSorted();          // [1, 2, 3]
const spliced = original.toSpliced(1, 1);    // [3, 2]
const replaced = original.with(0, 99);       // [99, 1, 2]
```

### 4.11 综合示例：ETL 管道

```javascript
// ES2024 — 综合运用 map/filter/reduce/flatMap/groupBy
// 场景：从原始日志中统计各服务的错误率
const logs = [
  { service: 'api', level: 'error', ts: 1 },
  { service: 'api', level: 'info', ts: 2 },
  { service: 'web', level: 'error', ts: 3 },
  { service: 'api', level: 'error', ts: 4 },
  { service: 'web', level: 'info', ts: 5 },
];

const byService = Object.groupBy(logs, (l) => l.service);
const errorRate = Object.fromEntries(
  Object.entries(byService).map(([svc, entries]) => {
    const total = entries.length;
    const errors = entries.filter((e) => e.level === 'error').length;
    return [svc, { total, errors, rate: errors / total }];
  })
);
console.log(errorRate);
// { api: { total: 3, errors: 2, rate: 0.667 }, web: { total: 2, errors: 1, rate: 0.5 } }
```

---

## 5. 对比分析（Comparative Analysis）

### 5.1 与 TypeScript 的对比

TypeScript 在 JavaScript 高阶方法之上增加了类型安全。`map` / `filter` / `reduce` 在 TS 中的类型签名：

```typescript
// TypeScript 5.x
interface Array<T> {
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown): T[];
  reduce<U>(callbackfn: (prev: U, cur: T, idx: number, arr: T[]) => U, initial: U): U;
}
```

关键差异：

| 维度 | JavaScript | TypeScript |
| --- | --- | --- |
| 类型推断 | 运行时动态 | 编译期静态，`map` 能推断 `U[]` |
| `filter` 类型窄化 | 无 | TS 5.5+ 支持类型谓词窄化（Type Predicate） |
| `reduce` 初始值类型 | 任意 | 必须显式标注，否则易推断为 `T` 而非 `U` |
| 空安全 | 需运行时检查 | 可用 `optional chaining` + `nullish coalescing` 表达 |

### 5.2 与 Python 的对比

```python
# Python — 列表推导 vs map/filter
nums = [1, 2, 3, 4, 5]

# 列表推导（Pythonic 推荐）
squared_evens = [x * x for x in nums if x % 2 == 0]

# 等价 JS：nums.filter(x => x % 2 === 0).map(x => x * x)
```

| 维度 | JavaScript | Python |
| --- | --- | --- |
| 首选写法 | `map` / `filter` 链式 | 列表推导 `[f(x) for x in xs if p(x)]` |
| 惰性求值 | 需 Generator 手写 | `generator` + `itertools` 原生支持 |
| `reduce` 位置 | `Array.prototype.reduce` | `functools.reduce`（非内置） |
| 性能 | V8 JIT 优化 | CPython 解释执行，循环通常更快 |

### 5.3 与 Rust 的对比

```rust
// Rust — Iterator trait，零成本抽象
let v: Vec<i32> = vec![1, 2, 3, 4, 5];
let result: Vec<i32> = v.iter()
    .filter(|&&x| x % 2 == 0)
    .map(|&x| x * x)
    .collect();
// [4, 16]
```

| 维度 | JavaScript | Rust |
| --- | --- | --- |
| 求值策略 | 及早求值（eager），分配中间数组 | 默认惰性（lazy），`collect` 时求值 |
| 零成本抽象 | 否，有闭包调用开销 | 是，编译期单态化，无运行时开销 |
| 所有权 | 无 | 借用检查器保证内存安全 |
| 融合优化 | 需手写 transducer | 编译器自动 fusion |

### 5.4 与 WebAssembly（Wasm）的对比

Wasm 本身无高阶函数概念，数组操作需通过循环实现。但 Wasm 可作为 JS 高阶方法的性能加速后端（如 AssemblyScript 编译 TS → Wasm）。在数值计算密集场景，Wasm 可比 JS 快 5-20 倍，但对于含闭包的高阶方法，JS 的 JIT 优化通常优于 Wasm 的函数调用开销。

---

## 6. 常见陷阱与最佳实践（Pitfalls & Best Practices）

### 6.1 陷阱：在 `map` 中产生副作用

```javascript
// 反模式：用 map 替代 forEach，忽略返回值
const arr = [1, 2, 3];
arr.map((x) => console.log(x)); // 能工作但语义错误

// 正确：用 forEach 表达副作用
arr.forEach((x) => console.log(x));
```

**原则**：`map` 用于"转换"，`forEach` 用于"副作用"。混用会误导读者，且 `map` 会分配无用数组。

### 6.2 陷阱：`reduce` 缺少初始值

```javascript
// 陷阱：空数组 reduce 无初始值会抛 TypeError
const empty = [];
empty.reduce((acc, x) => acc + x); // TypeError: Reduce of empty array with no initial value

// 正确：始终提供初始值
empty.reduce((acc, x) => acc + x, 0); // 0
```

### 6.3 陷阱：`sort` 默认按字符串排序

```javascript
// 陷阱：数字数组默认按字典序排序
[10, 2, 1].sort(); // [1, 10, 2]  ← 不是 [1, 2, 10]

// 正确：提供数值比较器
[10, 2, 1].sort((a, b) => a - b); // [1, 2, 10]
```

### 6.4 陷阱：`map` 解构回调误用 `this`

```javascript
// 陷阱：箭头函数无 this 绑定，传统函数有
const obj = {
  multiplier: 10,
  nums: [1, 2, 3],
  bad() {
    return this.nums.map(function (x) {
      return x * this.multiplier; // this 不是 obj
    });
  },
  good() {
    return this.nums.map((x) => x * this.multiplier); // 箭头函数继承 this
  },
};
```

### 6.5 陷阱：`flatMap` 深度仅 1

```javascript
// 陷阱：flatMap 只展平一层
[[[1, 2]]].flatMap((x) => x); // [[1, 2]]，仍嵌套

// 正确：用 flat(depth) 指定深度
[[[1, 2]]].flat(2); // [1, 2]
```

### 6.6 陷阱：链式调用的可读性崩塌

```javascript
// 反模式：超长链式调用
const result = data
  .filter(x => x.active)
  .map(x => x.items)
  .flatMap(items => items)
  .filter(item => item.price > 10)
  .map(item => ({ ...item, tax: item.price * 0.1 }))
  .reduce((acc, item) => ({ ...acc, [item.id]: item }), {});

// 改进：拆分为命名步骤
const activeData = data.filter((x) => x.active);
const allItems = activeData.flatMap((x) => x.items);
const pricedItems = allItems
  .filter((i) => i.price > 10)
  .map((i) => ({ ...i, tax: i.price * 0.1 }));
const byId = pricedItems.reduce((acc, i) => ((acc[i.id] = i), acc), {});
```

### 6.7 陷阱：`forEach` 无法 `break`

```javascript
// 陷阱：forEach 不支持 break / continue
[1, 2, 3].forEach((x) => {
  if (x === 2) return; // 这不是 break，只是跳过当前迭代
  console.log(x);
});

// 需要 break 时用 for..of 或 some/every
for (const x of [1, 2, 3]) {
  if (x === 2) break;
  console.log(x);
}
```

### 6.8 最佳实践汇总

1. **纯函数优先**：回调应为纯函数，避免修改外部状态。
2. **不可变优先**：优先使用 `toSorted` / `toReversed` 等 ES2023 不可变方法，适配 React/Redux。
3. **初始值必填**：`reduce` 始终提供初始值，避免空数组异常。
4. **短路早终止**：仅需判断存在性时用 `some` / `every`，避免 `find` 后取值。
5. **类型注解**：在 TypeScript 项目中为 `reduce` 泛型显式标注。
6. **性能敏感路径用 `for`**：V8 中 `for` 循环比 `forEach` 快约 3-5 倍，热路径慎用高阶方法。

---

## 7. 工程实践（Engineering Practice）

### 7.1 构建与打包

数组高阶方法是 ES5+ 原生 API，无需 polyfill（除 `flat` / `flatMap` 需 ES2019，`findLast` / `toSorted` 需 ES2023，`groupBy` 需 ES2024）。使用 Babel / SWC 时配置 `targets`：

```json
// .browserslistrc
> 0.5%
last 2 versions
not dead
```

对于需支持旧浏览器（IE11）的项目，使用 `core-js` 按 usage 注入 polyfill：

```javascript
// 入口文件顶部
import 'core-js/stable/array/flat';
import 'core-js/stable/array/flat-map';
```

### 7.2 性能基准测试

使用 `mitata` 或 Node.js 内置 `perf_hooks` 做微基准：

```javascript
// ES2015 — 性能对比：for vs forEach vs map
import { performance } from 'node:perf_hooks';

const N = 1_000_000;
const arr = Array.from({ length: N }, (_, i) => i);

function bench(name, fn) {
  const t0 = performance.now();
  fn();
  const t1 = performance.now();
  console.log(`${name}: ${(t1 - t0).toFixed(2)} ms`);
}

bench('for', () => {
  let sum = 0;
  for (let i = 0; i < N; i++) sum += arr[i];
});

bench('forEach', () => {
  let sum = 0;
  arr.forEach((x) => (sum += x));
});

bench('reduce', () => {
  arr.reduce((acc, x) => acc + x, 0);
});

bench('map (waste)', () => {
  arr.map((x) => x); // 故意分配新数组
});
```

典型结果（Node 20, V8 11.3, M1 MacBook Air）：

| 方法 | 耗时（ms） | 相对倍数 |
| --- | --- | --- |
| `for` | 2.1 | 1.0x |
| `forEach` | 6.8 | 3.2x |
| `reduce` | 8.5 | 4.0x |
| `map`（带分配） | 18.2 | 8.7x |

### 7.3 调试技巧

1. **断点在回调内**：在 `map` / `filter` 回调内设置条件断点，按 `index === N` 过滤。
2. **Chrome DevTools Performance**：录制 profile，查看 `Array.map` 的闭包调用栈与耗时分布。
3. **Node.js `--inspect-brk`**：在 VS Code 中附加调试器，逐步执行 reduce。
4. **`console.table`**：对数组输出表格，便于观察 `map` 后的结构。

```javascript
const result = users.map((u) => ({ id: u.id, name: u.name }));
console.table(result);
```

### 7.4 ESLint 规则推荐

```json
// .eslintrc.json
{
  "rules": {
    "array-callback-return": "error",      // 强制 map/filter 回调返回值
    "prefer-arrow-callback": "warn",       // 优先箭头函数避免 this 问题
    "no-return-assign": "error",           // 禁止 reduce 中赋值副作用
    "unicorn/no-fn-reference-in-iterator": "off",
    "unicorn/prefer-array-flat": "warn",   // 优先 flat
    "unicorn/prefer-array-flat-map": "warn" // 优先 flatMap
  }
}
```

### 7.5 与不可变数据库集成

在 Redux Toolkit、Zustand、Immer 场景中，优先使用 ES2023 不可变方法：

```javascript
// 配合 Immer 的 produce
import { produce } from 'immer';

const nextState = produce(state, (draft) => {
  // 这里可使用 push 等 mutation，Immer 会生成新对象
  draft.items.push(newItem);
});

// 或使用原生不可变方法
const nextState = {
  ...state,
  items: [...state.items, newItem].toSorted((a, b) => a.id - b.id),
};
```

---

## 8. 案例研究（Case Studies）

### 8.1 Lodash 的实现剖析

Lodash 的 `_.map` / `_.reduce` 在 JavaScript 原生方法之上增加了：

- **惰性链式**：`_.chain(arr).map(f).filter(p).value()` 通过 `LazyWrapper` 延迟求值，避免中间数组。
- **类型守卫**：处理 `null` / `undefined` 输入不抛错，返回 `[]`。
- **字符串支持**：`_.map('abc', c => c.charCodeAt(0))` 自动将字符串转为字符数组。

源码节选（lodash 4.17.21 `arrayMap.js`）：

```javascript
function arrayMap(array, iteratee) {
  var index = -1,
    length = array == null ? 0 : array.length,
    result = Array(length);
  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}
```

对比原生 `map`，Lodash 用 `while` 循环替代 `for` 以减少字节码开销，在旧引擎上有 10-30% 性能优势，但在 V8 5.9+（2017）后差距已基本消失。

### 8.2 Ramda 与函数式编程

Ramda 是严格的函数式库，其 `map` / `filter` / `reduce` 是**柯里化**的：

```javascript
// Ramda — 柯里化与 point-free 风格
const R = require('ramda');

const getActiveNames = R.pipe(
  R.filter(R.propEq('active', true)),
  R.map(R.prop('name'))
);

const users = [{ name: 'Alice', active: true }, { name: 'Bob', active: false }];
getActiveNames(users); // ['Alice']
```

Ramda 的 `transduce` 实现了 map/filter 融合：

```javascript
const xf = R.compose(
  R.map(R.multiply(2)),
  R.filter(R.gte(R.__, 10))
);
R.transduce(xf, R.flip(R.append), [], [1, 2, 3, 4, 5]); // [20]
```

### 8.3 React 中的数组渲染

React 列表渲染是 `map` 最高频场景：

```jsx
// React 18 — 列表渲染
function UserList({ users }) {
  return (
    <ul>
      {users
        .filter((u) => u.active)
        .map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
    </ul>
  );
}
```

**关键点**：

- `key` 必须唯一稳定，避免用 `index` 作 key（在动态增删时会导致状态错乱）。
- 避免在 render 中执行高复杂度 `reduce`，应通过 `useMemo` 缓存。

### 8.4 Three.js 中的顶点数组处理

Three.js 的 BufferGeometry 使用 `Float32Array`，但构建时常先用普通数组 `map` / `flatMap` 生成顶点数据，再 `set` 进 TypedArray：

```javascript
// Three.js — 生成球面顶点
const segments = 32;
const vertices = [];
for (let i = 0; i <= segments; i++) {
  for (let j = 0; j <= segments; j++) {
    const theta = (i / segments) * Math.PI;
    const phi = (j / segments) * Math.PI * 2;
    vertices.push(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    );
  }
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
```

### 8.5 jQuery 的 toArray 与 each

jQuery 的 `$.each` / `$.map` 是早期（2006 年）对 ES3 缺失高阶方法的补充。jQuery 3 后已基本对齐原生语义，但仍保留对"类数组对象"的支持：

```javascript
// jQuery — 将 NodeList 转数组并 map
const $items = $('li').toArray().map((el) => el.textContent);
```

现代代码应直接用 `Array.from(nodeList).map(...)` 或 `[...nodeList].map(...)`。

---

### 填空题知识点讲解

**常见疑问 6**：`[1,2,3,4,5].reduce((acc, x) => acc + x, 10)` 的结果是 ____。

**解析讲解**：25

**解析讲解**：初始值 10，依次累加 1+2+3+4+5 = 15，10 + 15 = 25。

---

**常见疑问 7**：`[1,2,3].map(x => x * 2).filter(x => x > 2)` 的结果是 ____。

**解析讲解**：`[4, 6]`

**解析讲解**：map 后 `[2, 4, 6]`，filter 后保留 `> 2` 的 `[4, 6]`。

---

**常见疑问 8**：ECMAScript ____ 规范引入了 `Array.prototype.flat` 与 `flatMap`。

**解析讲解**：ES2019（第 10 版）

---

**常见疑问 9**：`Array.prototype.find` 的返回值是 ____，若未找到则返回 ____。

**解析讲解**：第一个匹配元素；`undefined`

---

**常见疑问 10**：Functor 的两条公理是 ____ 与 ____。

**解析讲解**：同一律（Identity）；复合律（Composition）

---

### 编程题知识点讲解

**常见疑问 11**：实现 `chunk(arr, size)`，将数组按 `size` 分块。

**解析讲解**：

```javascript
// ES2015 — 数组分块
const chunk = (arr, size) =>
  arr.reduce((acc, x, i) => {
    const idx = Math.floor(i / size);
    (acc[idx] ||= []).push(x);
    return acc;
  }, []);

console.log(chunk([1, 2, 3, 4, 5], 2)); // [[1,2],[3,4],[5]]
```

**解析讲解**：利用 `i / size` 计算块索引，`||=` 确保块数组存在。时间复杂度 $O(n)$。

---

**常见疑问 12**：实现 `uniqueBy(arr, keyFn)`，按自定义键去重。

**解析讲解**：

```javascript
// ES2015 — 按键去重
const uniqueBy = (arr, keyFn) => {
  const seen = new Map();
  return arr.filter((x) => {
    const k = keyFn(x);
    if (seen.has(k)) return false;
    seen.set(k, true);
    return true;
  });
};

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Alice2' },
];
console.log(uniqueBy(users, (u) => u.id));
// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
```

**解析讲解**：用 `Map` 记录已见键，$O(n)$ 时间复杂度。比 `indexOf` 方案（$O(n^2)$）高效。

---

**常见疑问 13**：实现 `pipe` 与 `compose`，分别从左到右与从右到左组合函数。

**解析讲解**：

```javascript
// ES2015 — 函数组合
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);

const f = (x) => x + 1;
const g = (x) => x * 2;

console.log(pipe(f, g)(3));      // (3+1)*2 = 8
console.log(compose(f, g)(3));   // 3*2+1 = 7
```

**解析讲解**：`pipe` 用 `reduce`（左折叠），`compose` 用 `reduceRight`（右折叠）。

---

**常见疑问 14**：实现 `transduce`，将 map/filter 融合为单遍遍历。

**解析讲解**：

```javascript
// ES2015 — Transducer 实现
const mapReducer = (fn) => (next) => (acc, x) => next(acc, fn(x));
const filterReducer = (pred) => (next) => (acc, x) =>
  pred(x) ? next(acc, x) : acc;

const transduce = (xf, reducer, init, arr) =>
  arr.reduce(xf(reducer), init);

// 示例：map(x*2) ∘ filter(x>10)
const xf = (reducer) =>
  filterReducer((x) => x > 10)(mapReducer((x) => x * 2)(reducer));

const result = transduce(xf, (acc, x) => [...acc, x], [], [1, 2, 3, 4, 5, 6]);
// [12, 16, 20]
```

**解析讲解**：transducer 将 map/filter 转化为 reducer 的组合，避免中间数组。这是 Rich Hickey 在 Clojure 中引入的技术。

---

### 11.1 书籍

- **《JavaScript: The Good Parts》**（Douglas Crockford, 2008, O'Reilly）：第 6 章详述数组方法的设计哲学。
- **《Functional-Light JavaScript》**（Kyle Simpson, 2017）：以轻量方式讲解函数式编程与 map/filter/reduce。
- **《Professor Frisby's Mostly Adequate Guide to Functional Programming》**（Brian Lonsdorf, 2016）：免费在线，深入 Functor/Monad 与 JavaScript。
- **《High Performance JavaScript》**（Nicholas C. Zakas, 2010）：第 4 章分析数组方法性能。
- **《Effective TypeScript》**（Dan Vanderkam, 2019）：第 3 章讲解 `reduce` 的类型陷阱。

### 11.2 论文与技术报告

- Philip Wadler. 1992. *Theorems for Free!* FPCA '89. DOI: <https://doi.org/10.1145/99370.99404>（参数化定理，分析 map 的类型不变量）
- Conor McBride and Ross Paterson. 2008. *Applicative Programming with Effects*. Journal of Functional Programming 18, 1. DOI: <https://doi.org/10.1017/S0956796807006326>（Applicative Functor 理论）

### 11.4 开源项目源码

- **Lodash**：<https://github.com/lodash/lodash>（参考 `arrayMap.js`, `arrayReduce.js`）
- **Ramda**：<https://github.com/ramda/ramda>（参考 `map.js`, `transduce.js`）
- **V8 Array Implementation**：<https://github.com/v8/v8/tree/main/src/js>（`array.js` 中的 `ArrayMap`, `ArrayReduce` 字节码）
- **Core-JS Polyfills**：<https://github.com/zloirock/core-js>（`flat`, `flatMap`, `groupBy` 的 polyfill 实现）

### 11.5 进阶主题

- **Transducer**：Clojure 的 transducer 设计，Ramda 在 JS 中的实现。
- **Deforestation**：Wadler 1990 论文，函数式程序的自动融合优化。
- **Stream Fusion**：Haskell GHC 的流融合优化，Rust Iterator trait 的理论源头。
- **Iterator Helpers（ES2025）**：将 map/filter/reduce 推广到所有 Iterator，实现惰性求值。

---

> **结语**：数组高阶方法是 JavaScript 函数式编程的基石。理解其背后的 Functor / Monad / Foldable 类型类理论，掌握其在 V8 引擎中的性能特性，并在工程实践中遵循纯函数与不可变原则，是每一位前端工程师进阶为架构师的关键路径。本篇对标 MIT 6.031 / Stanford CS110L / CMU 15-150 的教学水准，旨在为学习者提供一条从语法到语义、从实践到理论的完整路径。
## map 方法

**基本写法：map 转换元素**
`<数组>.map(<回调函数>)`
```javascript
// 将数组元素转换为新值
let doubled = numbers.map(n => n * 2);
```

---

**基本写法：map 提取属性**
`<数组>.map(<回调函数>)`
```javascript
// 从对象数组提取属性
let names = users.map(user => user.name);
```

---

**基本写法：map 带索引**
`<数组>.map((<元素>, <索引>) => <表达式>)`
```javascript
// map 回调函数使用索引
let indexed = numbers.map((n, i) => `${i}: ${n}`);
```

---

## filter 方法

**基本写法：filter 过滤**
`<数组>.filter(<条件函数>)`
```javascript
// 过滤满足条件的元素
let evens = numbers.filter(n => n % 2 === 0);
```

---

**基本写法：filter 过滤对象**
`<数组>.filter(<条件函数>)`
```javascript
// 过滤对象数组
let adults = users.filter(user => user.age >= 18);
```

---

**基本写法：filter 去重**
`<数组>.filter((<元素>, <索引>, <数组>) => <条件>)`
```javascript
// 使用 filter 去重
let unique = arr.filter((item, index, array) => array.indexOf(item) === index);
```

---

## reduce 方法

**基本写法：reduce 求和**
`<数组>.reduce((<累加器>, <当前值>) => <表达式>, <初始值>)`
```javascript
// 计算数组元素总和
let sum = numbers.reduce((acc, n) => acc + n, 0);
```

---

**基本写法：reduce 求最大值**
`<数组>.reduce((<累加器>, <当前值>) => <表达式>)`
```javascript
// 查找数组最大值
let max = numbers.reduce((a, b) => Math.max(a, b));
```

---

**基本写法：reduce 计数**
`<数组>.reduce((<累加器>, <当前值>) => <表达式>, <初始值>)`
```javascript
// 统计元素出现次数
let count = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
}, {});
```

---

**基本写法：reduce 数组转对象**
`<数组>.reduce((<累加器>, <当前值>) => <表达式>, <初始值>)`
```javascript
// 将数组转换为对象
let obj = users.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
}, {});
```

---

## find 方法

**基本写法：find 查找元素**
`<数组>.find(<条件函数>)`
```javascript
// 查找第一个满足条件的元素
let user = users.find(u => u.age > 18);
```

---

**基本写法：findIndex 查找索引**
`<数组>.findIndex(<条件函数>)`
```javascript
// 查找第一个满足条件的元素索引
let index = users.findIndex(u => u.age > 18);
```

---

## some 方法

**基本写法：some 判断存在**
`<数组>.some(<条件函数>)`
```javascript
// 判断是否有元素满足条件
let hasAdult = users.some(u => u.age >= 18);
```

---

## every 方法

**基本写法：every 判断全部**
`<数组>.every(<条件函数>)`
```javascript
// 判断是否所有元素都满足条件
let allAdult = users.every(u => u.age >= 18);
```

---

## flat 方法

**基本写法：flat 展平一层**
`<数组>.flat()`
```javascript
// 展平数组一层
let flat = [1, [2, 3], [4]].flat();
```

---

**基本写法：flat 展平多层**
`<数组>.flat(<深度>)`
```javascript
// 展平数组指定深度
let flat = [1, [2, [3, [4]]]].flat(Infinity);
```

---

## flatMap 方法

**基本写法：flatMap 映射并展平**
`<数组>.flatMap(<回调函数>)`
```javascript
// 先映射再展平一层
let result = numbers.flatMap(n => [n, n * 2]);
```

---

## sort 方法

**基本写法：sort 数字升序**
`<数组>.sort((<a>, <b>) => <a> - <b>)`
```javascript
// 数字升序排序
numbers.sort((a, b) => a - b);
```

---

**基本写法：sort 数字降序**
`<数组>.sort((<a>, <b>) => <b> - <a>)`
```javascript
// 数字降序排序
numbers.sort((a, b) => b - a);
```

---

**基本写法：sort 对象数组**
`<数组>.sort((<a>, <b>) => <a>.<属性> - <b>.<属性>)`
```javascript
// 按对象属性排序
users.sort((a, b) => a.age - b.age);
```

---

## 链式调用

**基本写法：filter 链 map**
`<数组>.filter(<条件>).map(<映射>)`
```javascript
// 过滤后映射
let names = users.filter(u => u.age >= 18).map(u => u.name);
```

---

**基本写法：map 链 filter**
`<数组>.map(<映射>).filter(<条件>)`
```javascript
// 映射后过滤
let evens = numbers.map(n => n * 2).filter(n => n > 10);
```

---

**基本写法：filter 链 reduce**
`<数组>.filter(<条件>).reduce(<累加>, <初始值>)`
```javascript
// 过滤后求和
let sum = numbers.filter(n => n > 0).reduce((acc, n) => acc + n, 0);
```

---

**换行写法：多方法链式**
`<数组>.filter(<条件>).map(<映射>).reduce(<累加>, <初始值>)`
```javascript
// 多方法链式调用换行书写
let result = numbers
    .filter(n => n > 0)
    .map(n => n * 2)
    .reduce((acc, n) => acc + n, 0);
```

---

## 其他高阶方法

**基本写法：fill 填充**
`<数组>.fill(<值>, <起始>, <结束>)`
```javascript
// 用指定值填充数组
let arr = new Array(5).fill(0);
```

---

**基本写法：copyWithin**
`<数组>.copyWithin(<目标位置>, <起始>, <结束>)`
```javascript
// 数组内部复制
[1, 2, 3, 4, 5].copyWithin(0, 3);
```

---

**基本写法：at 访问**
`<数组>.at(<索引>)`
```javascript
// 使用 at 方法访问元素支持负索引
let last = numbers.at(-1);
```

---

## 数组判断

**基本写法：Array.isArray**
`Array.isArray(<变量>)`
```javascript
// 判断变量是否为数组
let isArray = Array.isArray(numbers);
```

---

**基本写法：includes 判断**
`<数组>.includes(<元素>)`
```javascript
// 判断数组是否包含元素
let has = numbers.includes(3);
```

---

## 数组转换

**基本写法：join 转字符串**
`<数组>.join("<分隔符>")`
```javascript
// 将数组连接为字符串
let str = numbers.join(", ");
```

---

**基本写法：toString**
`<数组>.toString()`
```javascript
// 数组转字符串默认逗号分隔
let str = numbers.toString();
```

---

**基本写法：entries 获取迭代器**
`<数组>.entries()`
```javascript
// 获取键值对迭代器
let entries = numbers.entries();
```

---

**基本写法：keys 获取键迭代器**
`<数组>.keys()`
```javascript
// 获取键索引迭代器
let keys = numbers.keys();
```

---

**基本写法：values 获取值迭代器**
`<数组>.values()`
```javascript
// 获取值迭代器
let values = numbers.values();
```

---

## ES2025 Iterator Helpers

**基本写法：Iterator.map 链式映射**
`<iterator>.map(<回调函数>)`
```javascript
// 迭代器映射元素不创建中间数组惰性求值
let iter = [1, 2, 3].values().map(x => x * 2);
```

---

**基本写法：Iterator.filter 链式过滤**
`<iterator>.filter(<条件函数>)`
```javascript
// 迭代器过滤满足条件的元素
let iter = [1, 2, 3, 4].values().filter(x => x % 2 === 0);
```

---

**基本写法：Iterator.take 取前 N 个**
`<iterator>.take(<数量>)`
```javascript
// 从迭代器取前 N 个元素后停止迭代
let iter = [1, 2, 3, 4].values().take(2);
```

---

**基本写法：Iterator.drop 跳过前 N 个**
`<iterator>.drop(<数量>)`
```javascript
// 跳过迭代器前 N 个元素返回剩余元素
let iter = [1, 2, 3, 4].values().drop(2);
```

---

**基本写法：Iterator.toArray 转数组**
`<iterator>.toArray()`
```javascript
// 将迭代器消费为数组终结链式操作
let arr = [1, 2, 3].values().map(x => x * 2).toArray();
```
