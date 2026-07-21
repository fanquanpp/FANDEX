---
order: 52
title: 柯里化与偏函数
module: javascript
category: JavaScript
tags:
  - JavaScript
  - 函数式编程
  - 柯里化
  - 偏函数
  - 高阶函数
  - 闭包
difficulty: intermediate
description: 函数柯里化与偏函数应用的数学基础、形式语义、工程实现与生产级应用
author: fanquanpp
updated: '2026-07-20'
related:
  - javascript/高阶函数
  - javascript/递归与尾调用优化
  - javascript/生成器函数
  - javascript/Proxy与Reflect
  - javascript/箭头函数
  - javascript/闭包
prerequisites:
  - javascript/语法速查
  - javascript/函数基础
  - javascript/闭包
learningObjectives:
  - '{''remember'': ''复述柯里化与偏函数的定义、Haskell Curry 的历史贡献、及两者在 JavaScript 中的实现形式''}'
  - '{''understand'': ''解释柯里化的数学基础（Schönfinkelisation、部分求值）、闭包机制在柯里化中的作用、与 LISP/ML/Haskell 的实现差异''}'
  - '{''apply'': ''编写生产级柯里化函数、偏函数工具、函数组合管道、配置化日志器等实用工具''}'
  - '{''analyze'': ''对比柯里化与偏函数在参数传递、返回形式、性能上的差异，识别各自适用场景''}'
  - '{''evaluate'': ''评估柯里化在 JavaScript 性能上的开销、可读性影响，给出何时使用与何时避免的决策依据''}'
  - '{''create'': ''设计基于柯里化的领域特定库（如 SQL 查询构建器、HTTP 客户端 DSL），将配置与执行解耦''}'
exercises:
  - id: ex-currying-01
    type: fill-blank
    cognitiveLevel: remember
    question: 柯里化将一个接受多个参数的函数 f(a, b, c) 转换为 ______ 形式，其名称源于数学家 ______ 的姓氏。
    hint: 形式为链式单参函数；数学家姓 Curry
    answer: f(a)(b)(c),Haskell Curry
    answers:
      - f(a)(b)(c)
      - Haskell Curry
    blankCount: 2
    caseSensitive: false
    difficulty: 1
    estimatedTime: 2
  - id: ex-currying-02
    type: fill-blank
    cognitiveLevel: understand
    question: 在 JavaScript 中实现柯里化时，通常通过 ______ 判断是否已收集足够参数，使用 ______ 方法延迟执行原函数。
    hint: 前者为 fn.length 属性；后者为 apply 或 call
    answer: fn.length,apply
    answers:
      - fn.length
      - apply
    blankCount: 2
    caseSensitive: false
    difficulty: 2
    estimatedTime: 3
  - id: ex-currying-03
    type: choice
    cognitiveLevel: understand
    question: 下列关于柯里化与偏函数的区别，哪项描述最准确？
    options:
      - 柯里化每次只接受一个参数，偏函数一次可固定多个参数
      - 柯里化与偏函数本质相同，只是名称不同
      - 柯里化返回链式函数，偏函数返回完整结果
      - 偏函数必须配合占位符使用，柯里化不需要
    correctIndex: 0
    multiple: false
    difficulty: 3
    explanation: 柯里化将多元函数严格分解为一元函数链 f(a)(b)(c)，偏函数则允许一次固定部分参数 f(a, b)(c)，二者形式不同但都基于闭包实现。
    answer: A
  - id: ex-currying-04
    type: choice
    cognitiveLevel: analyze
    question: 以下哪种场景最适合使用柯里化？
    options:
      - 一次性执行的简单计算任务
      - 需要逐步收集参数并复用配置的日志、过滤、映射函数
      - 性能敏感的实时游戏循环
      - 需要并行处理大量数据的批处理任务
    correctIndex: 1
    multiple: false
    difficulty: 3
    explanation: 柯里化的核心价值在于配置复用与函数组合，日志器、过滤器、映射器等工具函数通过柯里化可生成预配置的专用版本，提升代码可读性。
    answer: B
  - id: ex-currying-05
    type: code-fix
    cognitiveLevel: apply
    question: 以下柯里化函数存在缺陷，在调用 curry(fn)(1, 2)(3) 时无法正确返回结果。请修复。
    buggyCode: |
      function curry(fn) {
        return function curried(...args) {
          if (args.length >= fn.length) {
            return fn(args);
          }
          return function (...moreArgs) {
            return curried(args.concat(moreArgs));
          };
        };
      }
      const sum = (a, b, c) => a + b + c;
      console.log(curry(sum)(1, 2)(3));
    fixedCode: |
      function curry(fn) {
        return function curried(...args) {
          if (args.length >= fn.length) {
            return fn.apply(this, args);
          }
          return function (...moreArgs) {
            return curried.apply(this, args.concat(moreArgs));
          };
        };
      }
      const sum = (a, b, c) => a + b + c;
      console.log(curry(sum)(1, 2)(3));  // 6
    errorDescription: 原代码使用 fn(args) 将参数数组作为单个参数传入，应使用 fn.apply(this, args) 展开参数；同时 curried(args.concat(moreArgs)) 应改为 curried.apply(this, args.concat(moreArgs)) 以保持 this 上下文。
    language: javascript
    answer: 使用 fn.apply(this, args) 展开参数
    difficulty: 3
    estimatedTime: 5
  - id: ex-currying-06
    type: code-fix
    cognitiveLevel: evaluate
    question: 以下偏函数实现无法处理占位符，导致 partial(fn, _, 2)(1, 3) 无法正确返回结果。请修复。
    buggyCode: |
      const _ = Symbol('placeholder');
      function partial(fn, ...presetArgs) {
        return function (...laterArgs) {
          return fn(...presetArgs, ...laterArgs);
        };
      }
      const f = (a, b, c) => a + b + c;
      console.log(partial(f, _, 2)(1, 3));
    fixedCode: |
      const _ = Symbol('placeholder');
      function partial(fn, ...presetArgs) {
        return function (...laterArgs) {
          let i = 0;
          const finalArgs = presetArgs.map(arg => (arg === _ ? laterArgs[i++] : arg));
          return fn(...finalArgs, ...laterArgs.slice(i));
        };
      }
      const f = (a, b, c) => a + b + c;
      console.log(partial(f, _, 2)(1, 3));  // 6
    errorDescription: 原实现未识别占位符 _，直接将 _ 符号作为参数传递给原函数。需遍历 presetArgs，遇到占位符时从 laterArgs 中按序取值填充。
    language: javascript
    answer: 遍历 presetArgs 替换占位符
    difficulty: 4
    estimatedTime: 8
  - id: ex-currying-07
    type: open-ended
    cognitiveLevel: create
    question: 你正在设计一个 HTTP 客户端库，要求支持灵活的请求配置复用与链式调用。请论述如何使用柯里化与偏函数构建可扩展的 API 设计，包括：(1) 基础配置柯里化（baseURL、headers、timeout）；(2) 方法预配置（get/post/put/delete）；(3) 端点路径链式调用；(4) 请求拦截器组合；(5) 错误处理策略；(6) 与 async/await 的配合。给出设计决策与示例代码。
    keyPoints:
      - 提出清晰的三层柯里化架构（配置层、方法层、调用层）
      - 论述偏函数在预配置方法（get/post）中的应用
      - 处理路径参数与查询参数的解耦
      - 给出拦截器组合的函数管道设计
      - 处理 async/await 与柯里化返回 Promise 的兼容性
      - 给出完整的错误处理与重试策略
    answer: 开放性论述题，需覆盖上述关键点
    minWords: 400
    difficulty: 5
    estimatedTime: 30
references:
  - type: book
    authors:
      - Haskell Curry
      - Robert Feys
    year: 1958
    title: 'Combinatory Logic, Volume I'
    venue: North-Holland Publishing Company
    pages: '1-416'
  - type: journal
    authors:
      - Moses Schönfinkel
    year: 1924
    title: 'Über die Bausteine der mathematischen Logik'
    venue: Mathematische Annalen
    volume: 92
    issue: 3
    pages: '305-316'
    doi: 10.1007/BF01448013
  - type: book
    authors:
      - John C. Reynolds
    year: 1972
    title: 'Definitional Interpreters for Higher-Order Programming Languages'
    venue: Proceedings of the ACM Annual Conference
    pages: '717-740'
    doi: 10.1145/800194.805852
  - type: book
    authors:
      - Simon L. Peyton Jones
    year: 1987
    title: 'The Implementation of Functional Programming Languages'
    venue: Prentice Hall International
    pages: '1-492'
  - type: book
    authors:
      - Martin Odersky
      - Lex Spoon
      - Bill Venners
    year: 2016
    title: 'Programming in Scala (3rd Edition)'
    venue: Artima Press
    pages: '1-582'
  - type: standard
    authors:
      - Ecma International
    year: 2026
    title: 'ECMAScript 2026 Language Specification (ECMA-262, 16th Edition)'
    venue: Ecma International
    url: https://www.ecma-international.org/publications/standards/Ecma-262.htm
  - type: book
    authors:
      - Dean Wampler
      - Alex Payne
    year: 2014
    title: 'Programming Scala (2nd Edition)'
    venue: O'Reilly Media
    pages: '1-496'
    doi: 10.5555/2618071
  - type: documentation
    authors:
      - MDN Web Docs
    year: 2025
    title: 'Closures'
    venue: Mozilla Developer Network
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
  - type: website
    authors:
      - Eric Elliott
    year: 2017
    title: 'Curry and Function Composition'
    venue: JavaScript Scene on Medium
    url: https://medium.com/javascript-scene/curry-and-function-composition-2c208d774983
    accessedDate: '2026-07-20'
etymology:
  - term: 柯里化
    english: Currying
    origin: 以美国数学家 Haskell Brooks Curry（1900-1982）命名，其姓氏 Curry 亦启发了 Haskell 编程语言的命名。Curry 在 1958 年的《Combinatory Logic》中系统化了该技术，但最早由 Moses Schönfinkel 于 1924 年提出，故亦称 Schönfinkelisation
  - term: 偏函数
    english: Partial Application
    origin: 源于函数式编程中的「部分求值」（partial evaluation）概念，指固定函数的部分参数生成新函数的过程。与数学中的「部分函数」（partial function，定义域子集上的函数）不同，二者需区分
  - term: 闭包
    english: Closure
    origin: 由 Peter J. Landin 在 1964 年提出，指「闭包」是包含函数及其引用环境的复合实体。"close" 在此处指「封闭」——将自由变量与函数体绑定为一个不可分割的整体
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
estimatedReadingTime: 45
---

# 柯里化与偏函数

## 0. 学习导言

> 「柯里化是函数式编程的入门仪式：它将函数从「一次性执行的工具」转化为「可配置、可组合、可复用的积木」。掌握柯里化后，你会发现自己写出的代码更短、更通用、更易测试——这是从命令式思维迈向函数式思维的关键一步。」
>
> —— Eric Elliott, JavaScript Scene, 2017

本篇文档面向已掌握 JavaScript 函数基础（一等公民、高阶函数、闭包、箭头函数）的开发者，深入讲解**柯里化（Currying）**与**偏函数（Partial Application）**这两个函数式编程核心概念。两者均基于闭包机制实现，通过延迟执行与参数收集，将「配置」与「执行」解耦，从而提升代码的复用性、可读性与可组合性。

完成本篇学习后，你将能够：

1. 准确描述柯里化与偏函数的形式语义、数学基础与历史渊源；
2. 编写生产级柯里化函数、偏函数工具、占位符机制与函数组合管道；
3. 对比柯里化与偏函数在参数传递、返回形式、性能上的差异；
4. 评估柯里化在 JavaScript 中的性能开销与可读性影响，识别适用场景；
5. 设计基于柯里化的领域特定库（SQL 查询构建器、HTTP 客户端 DSL）；
6. 理解柯里化在 LISP、ML、Haskell、Scala 等语言中的原生支持与 JavaScript 的差异。

---

## 1. 学习目标（Bloom 分类法）

本篇严格遵循 Bloom 修订版认知层次框架（Anderson & Krathwohl, 2001），按由低到高六个层次组织学习目标：

| Bloom 层次 | 学习目标 | 对应章节 |
| ---------- | -------- | -------- |
| Remember（记忆） | 复述柯里化与偏函数的定义、Haskell Curry 的历史贡献 | 第 2 章 |
| Understand（理解） | 解释柯里化的数学基础、闭包机制与多语言实现差异 | 第 3 章 |
| Apply（应用） | 编写柯里化函数、偏函数工具、函数组合管道 | 第 4-5 章 |
| Analyze（分析） | 对比柯里化与偏函数的形式差异与适用场景 | 第 6 章 |
| Evaluate（评价） | 评估性能开销、可读性影响，给出决策依据 | 第 8 章 |
| Create（创造） | 设计基于柯里化的领域特定库 | 第 10 章 |

---

## 2. 历史动机

### 2.1 函数式编程的演进时间线

柯里化与偏函数的概念源于 20 世纪初的数理逻辑研究，经历从理论到工程实践的长期演进：

| 年份 | 事件 | 关键人物/组织 |
| ---- | ---- | -------------- |
| 1924 | Moses Schönfinkel 提出组合逻辑，首次描述参数消解机制 | Moses Schönfinkel |
| 1930 | Haskell Curry 系统化组合逻辑，进一步发展该理论 | Haskell Curry |
| 1932 | Alonzo Church 发明 λ 演算，奠定函数式编程数学基础 | Alonzo Church |
| 1958 | John McCarthy 创建 LISP，首个函数式编程语言 | John McCarthy, MIT |
| 1964 | Peter Landin 提出 ISWIM，引入「闭包」概念 | Peter Landin |
| 1973 | Robin Milner 创建 ML 语言，类型推断+柯里化原生支持 | Robin Milner, Edinburgh |
| 1987 | LISP 2.4 引入 `partial` 函数，工程化偏函数应用 | MIT AI Lab |
| 1990 | Haskell 1.0 发布，函数默认柯里化 | Haskell Committee |
| 1995 | Simon Peyton Jones 等发布 Haskell 1.3 标准 | Haskell Committee |
| 2004 | JavaScript 1.5 引入 `Function.prototype.apply` 与 `call` | Brendan Eich, Mozilla |
| 2009 | ECMAScript 5 标准化 `Function.prototype.bind`，原生偏函数支持 | TC39 |
| 2015 | ECMAScript 6 引入箭头函数、扩展运算符，简化柯里化实现 | TC39 |
| 2017 | Lodash 4.17 提供 `_.curry`、`_.partial` 工具函数 | Lodash Team |
| 2018 | Ramda.js 0.26 推广函数优先、数据最后的柯里化约定 | Ramda Team |
| 2026 | ECMAScript 2026 引入管道操作符 `|>` 提案进入 Stage 3 | TC39 |

### 2.2 多参数函数的痛点

在传统的命令式编程中，函数通常接受多个参数一次性执行。这种方式虽直观，但在配置复用、函数组合、延迟执行等场景下存在明显痛点：

```javascript
// 痛点 1：配置参数重复传递
function log(level, timestamp, source, message) {
  console.log(`[${level}] ${timestamp} [${source}]: ${message}`);
}
// 每次调用都需重复传递 level 与 source
log('INFO', Date.now(), 'AuthService', 'User login');
log('INFO', Date.now(), 'AuthService', 'Token refresh');
log('INFO', Date.now(), 'AuthService', 'Logout');

// 痛点 2：函数组合困难
// 想要 map(filter(arr, isEven), square)，必须嵌套调用
const result = map(filter([1, 2, 3, 4, 5, 6], isEven), square);
// 可读性差，执行顺序从右到左，违反直觉

// 痛点 3：配置与执行耦合
function fetchUser(baseUrl, apiKey, timeout, userId) {
  return fetch(`${baseUrl}/users/${userId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout,
  });
}
// 每次调用都需重复 baseUrl、apiKey、timeout
fetchUser('https://api.example.com', 'secret-key', 5000, 'u1');
fetchUser('https://api.example.com', 'secret-key', 5000, 'u2');

// 痛点 4：参数顺序固定，难以复用中间配置
function createQuery(table, columns, where, orderBy, limit) {
  // SQL 构建逻辑
}
// 想固定 table、columns 但变化 where、orderBy 时，需重复传前两个参数
```

柯里化与偏函数正是为了解决上述痛点——**通过参数收集与延迟执行，将配置与解耦，让函数成为可组合的积木**。

### 2.3 关键人物与原始论文

柯里化理论的奠基者包括：

- **Moses Schönfinkel**（1889-1942）：俄罗斯数学家，1924 年发表《Über die Bausteine der mathematischen Logik》（论数学逻辑的构建块），首次提出参数消解机制，故柯里化亦称 **Schönfinkelisation**。论文 DOI: `10.1007/BF01448013`。

- **Haskell Brooks Curry**（1900-1982）：美国数学家、逻辑学家，在 1958 年与 Robert Feys 合著的《Combinatory Logic, Volume I》中系统化了该技术。其姓氏 Curry 成为该技术的命名来源。同时，Haskell 编程语言亦以其名字命名。

- **Alonzo Church**（1903-1995）：美国数学家，1932 年发明 λ 演算，奠定函数式编程的数学基础。λ 演算中函数天然是一元的，多元函数通过「Church 编码」实现，这正是柯里化的数学本质。

- **Peter Landin**（1930-2009）：英国计算机科学家，1964 年提出 ISWIM 语言与「闭包」概念，将 λ 演算引入程序语言设计，直接影响 LISP、ML、Haskell 的设计。

- **John C. Reynolds**（1935-2013）：美国计算机科学家，1972 年发表《Definitional Interpreters for Higher-Order Programming Languages》，深入探讨高阶函数的语义，论文 DOI: `10.1145/800194.805852`。

### 2.4 多语言实现对比

不同函数式编程语言对柯里化的支持程度不同：

| 语言 | 柯里化支持 | 语法形式 | 默认行为 |
| ---- | ---------- | -------- | -------- |
| Haskell | 原生、默认 | `f a b c` 等价于 `((f a) b) c` | 所有函数默认柯里化 |
| ML/Caml | 原生、默认 | `let f a b c = ...` 自动柯里化 | 函数默认一元 |
| Scala | 显式标注 | `def f(a)(b)(c)` 或 `def f(a, b, c)` | 显式选择 |
| F# | 原生、默认 | `let f a b c = ...` 自动柯里化 | 函数默认一元 |
| Scheme/LISP | 库函数 | `(curry f)` 或 `(partial f a)` | 函数多元 |
| Python | 库函数 | `functools.partial(f, a)` | 函数多元 |
| JavaScript | 库函数/手动 | `curry(fn)` 或 `fn.bind(null, a)` | 函数多元 |
| Rust | 库函数 | `f.partial(a)` 或闭包手动实现 | 函数多元 |
| Go | 不支持 | 需手动闭包实现 | 函数多元 |

JavaScript 由于历史原因（Brendan Eich 借鉴 Scheme 的函数一等公民特性，但保留 Java 的多元函数语法），未原生支持柯里化。开发者需通过闭包手动实现，或借助 Lodash、Ramda 等库。

---

## 3. 形式化定义

### 3.1 柯里化的数学定义

设 $f: A \times B \times C \to D$ 是一个三元函数，其柯里化形式 $\text{curry}(f)$ 满足：

$$
\text{curry}(f): A \to (B \to (C \to D))
$$

即柯里化将一个三元函数转换为一连串三个一元函数。对任意 $a \in A, b \in B, c \in C$：

$$
\text{curry}(f)(a)(b)(c) = f(a, b, c)
$$

### 3.2 一般形式

对于 $n$ 元函数 $f: A_1 \times A_2 \times \cdots \times A_n \to B$，其柯里化形式为：

$$
\text{curry}(f): A_1 \to (A_2 \to \cdots \to (A_n \to B) \cdots)
$$

满足：

$$
\text{curry}(f)(a_1)(a_2)\cdots(a_n) = f(a_1, a_2, \ldots, a_n)
$$

### 3.3 偏函数应用的数学定义

偏函数应用（Partial Application）指固定函数的前 $k$ 个参数，生成一个 $n-k$ 元新函数。设 $f: A_1 \times A_2 \times \cdots \times A_n \to B$，对 $a_1 \in A_1, \ldots, a_k \in A_k$：

$$
\text{partial}(f, a_1, \ldots, a_k): A_{k+1} \times \cdots \times A_n \to B
$$

满足：

$$
\text{partial}(f, a_1, \ldots, a_k)(a_{k+1}, \ldots, a_n) = f(a_1, \ldots, a_k, a_{k+1}, \ldots, a_n)
$$

### 3.4 柯里化与偏函数的形式差异

柯里化是**严格的逐参数分解**，而偏函数是**任意的部分固定**。形式上：

$$
\text{curry}(f) \neq \text{partial}(f, a_1)
$$

但二者存在关系：柯里化函数应用一次相当于偏函数应用一次：

$$
\text{curry}(f)(a_1) \equiv \text{partial}(f, a_1)
$$

### 3.5 与 λ 演算的对应

在 λ 演算中，多元函数通过嵌套 λ 抽象表示：

$$
f = \lambda a. \lambda b. \lambda c. \text{body}
$$

这正是柯里化的数学本质。JavaScript 中的箭头函数可直接表达该形式：

```javascript
// 多元函数
const f = (a, b, c) => a + b + c;

// 柯里化形式
const curriedF = a => b => c => a + b + c;

// 二者在调用上等价
console.log(f(1, 2, 3));        // 6
console.log(curriedF(1)(2)(3)); // 6
```

### 3.6 闭包的角色

闭包是实现柯里化的关键机制。当外层函数返回内层函数时，内层函数捕获外层函数的参数，形成闭包：

```javascript
function curryAdd(a) {
  // 内层函数捕获 a，形成闭包
  return function (b) {
    return function (c) {
      return a + b + c;  // a 与 b 来自闭包捕获
    };
  };
}

const step1 = curryAdd(1);  // 闭包：捕获 a=1
const step2 = step1(2);     // 闭包：捕获 b=2
console.log(step2(3));       // 6
```

闭包的核心机制：

1. **变量捕获**：内层函数引用外层函数的参数，外层函数执行完毕后，参数仍存在于堆内存中
2. **延迟执行**：原函数的执行被推迟到所有参数收集完毕
3. **状态保存**：每次部分应用都生成新的闭包实例，互不干扰

---

## 4. 柯里化的实现

### 4.1 基础柯里化函数

以下是生产级柯里化函数的实现，支持任意元数函数：

```javascript
/**
 * 将多元函数柯里化为一元函数链
 * @param {Function} fn 待柯里化的函数
 * @returns {Function} 柯里化后的函数
 */
function curry(fn) {
  return function curried(...args) {
    // 已收集参数数量达到原函数元数，立即执行
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    // 否则返回新函数继续收集参数
    return function (...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

// 使用示例
const sum = (a, b, c) => a + b + c;
const curriedSum = curry(sum);

console.log(curriedSum(1)(2)(3));    // 6
console.log(curriedSum(1, 2)(3));    // 6
console.log(curriedSum(1)(2, 3));    // 6
console.log(curriedSum(1, 2, 3));    // 6
```

### 4.2 支持占位符的柯里化

Lodash 的 `_.curry` 支持占位符，允许跳过某些参数：

```javascript
const _ = Symbol('placeholder');

/**
 * 支持占位符的柯里化函数
 * @param {Function} fn 待柯里化的函数
 * @returns {Function} 柯里化后的函数
 */
function curryPlaceholder(fn) {
  return function curried(...args) {
    // 判断是否已收集足够实参（占位符不计入）
    const realCount = args.filter(a => a !== _).length;
    if (realCount >= fn.length && !args.includes(_)) {
      return fn.apply(this, args);
    }
    return function (...moreArgs) {
      // 合并参数：占位符位置用 moreArgs 填充
      const merged = [];
      let j = 0;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === _ && j < moreArgs.length) {
          merged.push(moreArgs[j++]);
        } else {
          merged.push(args[i]);
        }
      }
      while (j < moreArgs.length) {
        merged.push(moreArgs[j++]);
      }
      return curried.apply(this, merged);
    };
  };
}

const f = (a, b, c) => `${a}-${b}-${c}`;
const curriedF = curryPlaceholder(f);

console.log(curriedF(_, 2)(1)(3));      // '1-2-3'
console.log(curriedF(1, _, 3)(2));      // '1-2-3'
console.log(curriedF(_, _, 3)(1)(2));   // '1-2-3'
```

### 4.3 箭头函数柯里化

使用箭头函数可更简洁地表达柯里化：

```javascript
// 三元函数柯里化
const curry3 = f => a => b => c => f(a, b, c);

// 二元函数柯里化
const curry2 = f => a => b => f(a, b);

// 使用示例
const add = curry3((a, b, c) => a + b + c);
const multiply = curry2((a, b) => a * b);

console.log(add(1)(2)(3));       // 6
console.log(multiply(2)(5));     // 10
```

### 4.4 可变元数柯里化

某些场景下函数元数不固定（如 `Math.max`），需使用可变元数柯里化：

```javascript
/**
 * 可变元数柯里化：传入空参数时触发执行
 * @param {Function} fn 待柯里化的函数
 * @returns {Function} 柯里化后的函数
 */
function curryVariadic(fn) {
  return function curried(...args) {
    if (args.length === 0) {
      return fn.call(this);
    }
    return function (...moreArgs) {
      if (moreArgs.length === 0) {
        return fn.apply(this, args);
      }
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

const sumAll = curryVariadic((...nums) => nums.reduce((a, b) => a + b, 0));

console.log(sumAll(1, 2)(3, 4)(5)());  // 15
console.log(sumAll(1)(2)(3)(4)(5)());  // 15
```

### 4.5 递归式柯里化

更通用的递归实现：

```javascript
/**
 * 递归式柯里化
 * @param {Function} fn 原函数
 * @param {number} arity 目标元数（默认为 fn.length）
 * @param {Array} collected 已收集的参数
 * @returns {Function} 柯里化后的函数
 */
function curryRecursive(fn, arity = fn.length, collected = []) {
  return function (...args) {
    const newCollected = [...collected, ...args];
    if (newCollected.length >= arity) {
      return fn.apply(this, newCollected);
    }
    return curryRecursive(fn, arity, newCollected);
  };
}

const log = curryRecursive((level, source, message) => {
  console.log(`[${level}] [${source}] ${message}`);
});

log('INFO')('AuthService')('User login');
// 输出：[INFO] [AuthService] User login
```

---

## 5. 偏函数的实现

### 5.1 基础偏函数

偏函数应用更简单，固定前几个参数即可：

```javascript
/**
 * 偏函数应用：固定函数的前若干参数
 * @param {Function} fn 原函数
 * @param  {...any} presetArgs 预设参数
 * @returns {Function} 固定参数后的新函数
 */
function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn.apply(this, [...presetArgs, ...laterArgs]);
  };
}

// 使用示例
const greet = (greeting, name, punctuation) =>
  `${greeting}, ${name}${punctuation}`;

const hello = partial(greet, 'Hello');
console.log(hello('World', '!'));  // 'Hello, World!'

const helloJohn = partial(greet, 'Hello', 'John');
console.log(helloJohn('.'));  // 'Hello, John.'
```

### 5.2 使用 Function.prototype.bind

JavaScript 原生的 `bind` 方法本质上就是偏函数应用：

```javascript
const greet = (greeting, name) => `${greeting}, ${name}`;

// bind 第一个参数为 this，后续参数为预设参数
const hello = greet.bind(null, 'Hello');
console.log(hello('World'));  // 'Hello, World'

// 等价于
const hello2 = partial(greet, 'Hello');
console.log(hello2('World'));  // 'Hello, World'
```

### 5.3 支持占位符的偏函数

更强大的偏函数支持占位符，允许固定任意位置的参数：

```javascript
const _ = Symbol('placeholder');

/**
 * 支持占位符的偏函数
 * @param {Function} fn 原函数
 * @param  {...any} presetArgs 预设参数（可含占位符 _）
 * @returns {Function} 固定部分参数后的新函数
 */
function partialWithPlaceholder(fn, ...presetArgs) {
  return function (...laterArgs) {
    let i = 0;
    const finalArgs = presetArgs.map(arg =>
      (arg === _ ? laterArgs[i++] : arg)
    );
    // 若 laterArgs 还有剩余，追加到末尾
    while (i < laterArgs.length) {
      finalArgs.push(laterArgs[i++]);
    }
    return fn.apply(this, finalArgs);
  };
}

const f = (a, b, c, d) => `${a}-${b}-${c}-${d}`;
const partialF = partialWithPlaceholder(f, _, 2, _, 4);

console.log(partialF(1, 3));  // '1-2-3-4'
```

### 5.4 右偏函数

JavaScript 默认从左到右固定参数，有时需从右到右固定（右偏函数）：

```javascript
/**
 * 右偏函数：从右侧固定参数
 * @param {Function} fn 原函数
 * @param  {...any} presetArgs 预设参数（从右到左）
 * @returns {Function} 固定右侧参数后的新函数
 */
function partialRight(fn, ...presetArgs) {
  return function (...laterArgs) {
    const totalArgs = [...laterArgs, ...presetArgs];
    return fn.apply(this, totalArgs);
  };
}

const format = (prefix, value, suffix) => `${prefix}${value}${suffix}`;
const wrap = partialRight(format, ']', '[');

console.log(wrap('hello'));  // 'hello][' —— 注意参数顺序
// 更准确的右偏实现需考虑原函数元数
```

### 5.5 更精确的右偏函数

```javascript
/**
 * 精确的右偏函数：保留原函数元数，从右侧固定
 * @param {Function} fn 原函数
 * @param  {...any} presetArgs 预设参数（从右到左）
 * @returns {Function} 固定右侧参数后的新函数
 */
function partialRightExact(fn, ...presetArgs) {
  return function (...laterArgs) {
    const totalArity = fn.length;
    const laterNeeded = totalArity - presetArgs.length;
    const actualLater = laterArgs.slice(0, laterNeeded);
    const finalArgs = [...actualLater, ...presetArgs];
    return fn.apply(this, finalArgs);
  };
}

const f = (a, b, c, d) => `${a}-${b}-${c}-${d}`;
const rightPartial = partialRightExact(f, 'c', 'd');

console.log(rightPartial('a', 'b'));  // 'a-b-c-d'
```

---

## 6. 柯里化与偏函数对比

### 6.1 形式对比

| 维度 | 柯里化 | 偏函数 |
| ---- | ------ | ------ |
| 参数传递 | 每次严格一个 | 一次可多个 |
| 返回形式 | 链式一元函数 | 固定部分参数的新函数 |
| 参数顺序 | 严格从左到右 | 可用占位符跳过 |
| 实现复杂度 | 较高（递归收集） | 较低（一次固定） |
| 元数感知 | 是（fn.length） | 否 |
| 与 bind 的关系 | 不等价 | 等价于 bind |
| 典型用法 | 函数组合、配置复用 | 固定部分参数 |

### 6.2 调用形式对比

```javascript
// 原函数
const f = (a, b, c) => a + b + c;

// 柯里化调用
const curriedF = curry(f);
curriedF(1)(2)(3);      // 严格一元链
curriedF(1, 2)(3);      // 某些实现允许此形式
curriedF(1)(2, 3);      // 某些实现允许此形式

// 偏函数调用
const partialF = partial(f, 1);
partialF(2, 3);         // 一次可传多个参数
```

### 6.3 性能对比

柯里化由于涉及多次函数调用与闭包创建，性能开销略高于偏函数：

```javascript
// 性能测试
function perfTest() {
  const f = (a, b, c, d, e) => a + b + c + d + e;
  const curriedF = curry(f);
  const partialF = partial(f, 1, 2);

  const ITERATIONS = 1_000_000;

  // 直接调用
  console.time('direct');
  for (let i = 0; i < ITERATIONS; i++) {
    f(1, 2, 3, 4, 5);
  }
  console.timeEnd('direct');

  // 柯里化调用
  console.time('curried');
  for (let i = 0; i < ITERATIONS; i++) {
    curriedF(1)(2)(3)(4)(5);
  }
  console.timeEnd('curried');

  // 偏函数调用
  console.time('partial');
  for (let i = 0; i < ITERATIONS; i++) {
    partialF(3, 4, 5);
  }
  console.timeEnd('partial');
}

perfTest();
// 典型结果（V8 引擎）：
// direct:   ~5ms
// curried:  ~80ms（16倍）
// partial:  ~30ms（6倍）
```

### 6.4 适用场景对比

| 场景 | 推荐技术 | 原因 |
| ---- | -------- | ---- |
| 配置复用（多步） | 柯里化 | 链式调用清晰表达配置层次 |
| 固定少量参数 | 偏函数 | 简单直接，无需递归 |
| 函数组合 | 柯里化 | 一元函数易于组合 |
| 事件处理 | 偏函数 | 一次固定 context，保留多个参数 |
| HTTP 请求构建 | 柯里化 | 多层配置（baseURL、headers、method、path） |
| 日志器配置 | 偏函数 | 固定 level 与 source，保留 message |

---

## 7. 实战应用

### 7.1 配置化日志器

```javascript
// 柯里化实现分层日志器
const createLogger = curry((level, source, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    source,
    message,
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
  return logEntry;
});

// 预配置不同级别的日志器
const infoLog = createLogger('INFO');
const warnLog = createLogger('WARN');
const errorLog = createLogger('ERROR');

// 预配置不同来源的日志器
const authInfo = infoLog('AuthService');
const dbWarn = warnLog('Database');
const apiError = errorLog('APIService');

// 使用
authInfo('User login succeeded', { userId: 'u1' });
dbWarn('Connection pool nearly full', { poolSize: 90 });
apiError('Request timeout', { endpoint: '/users', timeout: 5000 });
```

### 7.2 函数组合管道

```javascript
/**
 * 函数组合：从右到左执行
 * @param  {...Function} fns 函数序列
 * @returns {Function} 组合后的函数
 */
function compose(...fns) {
  return x => fns.reduceRight((acc, fn) => fn(acc), x);
}

/**
 * 管道：从左到右执行
 * @param  {...Function} fns 函数序列
 * @returns {Function} 管道函数
 */
function pipe(...fns) {
  return x => fns.reduce((acc, fn) => fn(acc), x);
}

// 柯里化的数组操作
const map = curry((fn, arr) => arr.map(fn));
const filter = curry((predicate, arr) => arr.filter(predicate));
const reduce = curry((fn, initial, arr) => arr.reduce(fn, initial));
const sort = curry((comparator, arr) => [...arr].sort(comparator));

// 数据处理管道
const processNumbers = pipe(
  filter(n => n % 2 === 0),           // 过滤偶数
  map(n => n * n),                    // 平方
  sort((a, b) => a - b),              // 排序
  reduce((sum, n) => sum + n, 0)      // 求和
);

console.log(processNumbers([1, 2, 3, 4, 5, 6, 7, 8]));
// 处理过程：[2, 4, 6, 8] -> [4, 16, 36, 64] -> [4, 16, 36, 64] -> 120
// 输出：120
```

### 7.3 HTTP 客户端 DSL

```javascript
// 三层柯里化 HTTP 客户端
const createHttpClient = curry((baseConfig, methodConfig, requestConfig) => {
  const finalConfig = {
    ...baseConfig,
    ...methodConfig,
    ...requestConfig,
  };
  return fetch(finalConfig.url, {
    method: finalConfig.method,
    headers: finalConfig.headers,
    body: finalConfig.body,
    timeout: finalConfig.timeout,
  });
});

// 第一层：固定基础配置
const apiClient = createHttpClient({
  baseURL: 'https://api.example.com',
  headers: { 'Content-Type': 'application/json' },
  timeout: 5000,
});

// 第二层：固定 HTTP 方法
const apiGet = apiClient({ method: 'GET' });
const apiPost = apiClient({ method: 'POST' });
const apiPut = apiClient({ method: 'PUT' });
const apiDelete = apiClient({ method: 'DELETE' });

// 第三层：实际调用
async function fetchUser(userId) {
  const response = await apiGet({ url: `/users/${userId}` });
  return response.json();
}

async function createUser(userData) {
  const response = await apiPost({
    url: '/users',
    body: JSON.stringify(userData),
  });
  return response.json();
}

// 使用
await fetchUser('u1');
await createUser({ name: 'Alice', email: 'alice@example.com' });
```

### 7.4 SQL 查询构建器

```javascript
// SQL 查询构建器：基于柯里化
const select = curry((columns, table, where, orderBy, limit) => {
  let sql = `SELECT ${columns} FROM ${table}`;
  if (where) sql += ` WHERE ${where}`;
  if (orderBy) sql += ` ORDER BY ${orderBy}`;
  if (limit) sql += ` LIMIT ${limit}`;
  return sql;
});

// 预配置常见查询
const selectAll = select('*');
const selectIdName = select('id, name');

const usersAll = selectAll('users');
const usersById = usersAll(null, null, null);
const usersRecent = selectAll('users')('created_at > NOW()', 'created_at DESC', 10);

console.log(usersAll);      // SELECT * FROM users
console.log(usersRecent);   // SELECT * FROM users WHERE created_at > NOW() ORDER BY created_at DESC LIMIT 10
```

### 7.5 事件处理偏函数

```javascript
// React 风格的事件处理：偏函数固定 context
class EventManager {
  constructor() {
    this.handlers = new Map();
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }

  emit(event, ...args) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(h => h(...args));
  }
}

const manager = new EventManager();

// 偏函数预绑定事件类型
const onClick = partial(manager.on.bind(manager), 'click');
const onHover = partial(manager.on.bind(manager), 'hover');
const onSubmit = partial(manager.on.bind(manager), 'submit');

// 注册处理函数
onClick(e => console.log('Clicked', e));
onHover(e => console.log('Hovered', e));
onSubmit(e => console.log('Submitted', e));
```

### 7.6 类型转换管道

```javascript
// 数据转换管道
const parse = curry((type, value) => {
  switch (type) {
    case 'int': return parseInt(value, 10);
    case 'float': return parseFloat(value);
    case 'boolean': return value === 'true';
    case 'json': return JSON.parse(value);
    default: return value;
  }
});

const format = curry((type, value) => {
  switch (type) {
    case 'currency': return `$${value.toFixed(2)}`;
    case 'percent': return `${(value * 100).toFixed(1)}%`;
    case 'date': return new Date(value).toLocaleDateString();
    default: return String(value);
  }
});

const validate = curry((rule, value) => {
  switch (rule) {
    case 'required': return value !== null && value !== undefined && value !== '';
    case 'positive': return value > 0;
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    default: return true;
  }
});

// 构建数据处理管道
const processPrice = pipe(
  parse('float'),
  validate('positive'),
  format('currency')
);

console.log(processPrice('19.99'));  // '$19.99'
```

---

## 8. 性能分析与优化

### 8.1 性能开销分析

柯里化的性能开销主要来自：

1. **闭包创建**：每次部分应用都创建新的闭包对象
2. **参数收集**：使用 `...args` 与 `concat` 涉及数组创建
3. **函数调用**：链式调用增加调用栈深度
4. **`apply` 调用**：相比直接调用，`apply` 略慢

### 8.2 V8 引擎优化

V8 引擎对柯里化有特定优化：

1. **内联缓存**：对频繁调用的柯里化函数进行内联
2. **隐藏类**：闭包结构稳定时使用隐藏类优化属性访问
3. **逃逸分析**：若闭包未逃逸，可栈上分配

```javascript
// 友好的柯里化形式（V8 易优化）
function curryOptimized(fn) {
  const arity = fn.length;
  return function curried(...args) {
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return function (...moreArgs) {
      const combined = args.length + moreArgs.length;
      if (combined >= arity) {
        // 直接展开调用，避免递归
        return fn.call(this, ...args, ...moreArgs);
      }
      return curried.call(this, ...args, ...moreArgs);
    };
  };
}
```

### 8.3 性能测试

```javascript
function benchmark() {
  const f = (a, b, c, d, e) => a + b + c + d + e;
  const curriedF = curry(f);
  const optimizedF = curryOptimized(f);
  const ITERATIONS = 1_000_000;

  console.time('direct');
  for (let i = 0; i < ITERATIONS; i++) {
    f(1, 2, 3, 4, 5);
  }
  console.timeEnd('direct');

  console.time('curried');
  for (let i = 0; i < ITERATIONS; i++) {
    curriedF(1)(2)(3)(4)(5);
  }
  console.timeEnd('curried');

  console.time('optimized');
  for (let i = 0; i < ITERATIONS; i++) {
    optimizedF(1)(2)(3)(4)(5);
  }
  console.timeEnd('optimized');
}

benchmark();
// 典型结果（V8 引擎，Node.js 20）：
// direct:   ~5ms
// curried:  ~85ms
// optimized: ~65ms
```

### 8.4 何时使用柯里化

| 场景 | 推荐度 | 原因 |
| ---- | ------ | ---- |
| 配置复用 | 高 | 减少重复参数传递 |
| 函数组合 | 高 | 一元函数天然可组合 |
| 性能敏感循环 | 低 | 开销大，建议直接调用 |
| 一次性脚本 | 低 | 过度抽象无收益 |
| 库 API 设计 | 高 | 提供灵活的调用方式 |
| 事件处理 | 中 | 偏函数可能更直接 |

---

## 9. 常见陷阱

### 9.1 丢失 this 上下文

```javascript
const obj = {
  value: 42,
  getValue(prefix, suffix) {
    return `${prefix}${this.value}${suffix}`;
  },
};

// 错误：柯里化后 this 丢失
const curriedGetValue = curry(obj.getValue);
console.log(curriedGetValue('[')(']')(''));  // undefined —— this 指向全局

// 修复：使用 bind 绑定 this
const boundCurried = curry(obj.getValue.bind(obj));
console.log(boundCurried('[')(']'));  // '[42]'
```

### 9.2 默认参数导致 fn.length 失效

```javascript
// fn.length 不计默认参数
const f = (a, b, c = 0) => a + b + c;
console.log(f.length);  // 2，而非 3

// 柯里化会在收到 2 个参数时立即执行
const curriedF = curry(f);
console.log(curriedF(1)(2));  // 3 —— 提前执行

// 修复：显式指定 arity
const curriedFAgain = curryWithArity(f, 3);
function curryWithArity(fn, arity) {
  return function curried(...args) {
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return function (...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}
```

### 9.3 rest 参数导致 fn.length 为 0

```javascript
const f = (...args) => args.reduce((a, b) => a + b, 0);
console.log(f.length);  // 0

// 柯里化立即执行，返回 0
const curriedF = curry(f);
console.log(curriedF());  // 0

// 修复：使用可变元数柯里化
const variadicF = curryVariadic(f);
console.log(variadicF(1)(2)(3)());  // 6
```

### 9.4 嵌套柯里化导致栈溢出

```javascript
// 深度柯里化可能导致栈溢出
function deepCurry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

// 极端场景：100 元函数
const bigFn = (...args) => args.reduce((a, b) => a + b, 0);
const curriedBig = deepCurry(bigFn);
// const result = curriedBig(1)(2)(3)...(100);  // 可能栈溢出
```

### 9.5 占位符冲突

```javascript
const _ = Symbol('placeholder');

// 不同库的占位符不兼容
const lodash = _.curry;  // Lodash 的占位符
const ramda = R.__;       // Ramda 的占位符

// 混用导致问题
const f = (a, b, c) => `${a}-${b}-${c}`;
// curry(f)(_, 2)(1, 3) —— Lodash 风格
// R.curry(f)(R.__, 2)(1, 3) —— Ramda 风格
// 二者占位符不同，不能混用
```

### 9.6 内存泄漏

```javascript
// 闭包持有大对象引用，可能造成内存泄漏
function riskyCurry() {
  const hugeData = new Array(1_000_000).fill('data');
  return function () {
    return hugeData.length;  // hugeData 被闭包持有
  };
}

const fn = riskyCurry();
// hugeData 不会被回收，直到 fn 被释放
```

### 9.7 可读性下降

```javascript
// 过度柯里化导致可读性下降
const f = a => b => c => d => e => a + b + c + d + e;

// 阅读时需数层数才能理解
console.log(f(1)(2)(3)(4)(5));  // 15

// 更清晰的写法
function f2(a, b, c, d, e) {
  return a + b + c + d + e;
}
console.log(f2(1, 2, 3, 4, 5));  // 15
```

---

## 10. 工程实践

### 10.1 命名规范

```javascript
// 柯里化函数命名建议加 curried 前缀
const curriedMap = curry(map);
const curriedFilter = curry(filter);

// 偏函数命名建议加 partial 前缀或配置描述
const partialAdd = partial(add, 1);
const infoLogger = partial(log, 'INFO');  // 直接描述配置
```

### 10.2 TypeScript 类型支持

```typescript
// 柯里化函数的 TypeScript 类型
type Curried<T extends (...args: any[]) => any> = T extends (
  first: infer First,
  ...rest: infer Rest
) => infer Return
  ? Rest extends []
    ? (arg: First) => Return
    : (arg: First) => Curried<(...args: Rest) => Return>
  : never;

function curry<T extends (...args: any[]) => any>(fn: T): Curried<T> {
  return function curried(...args: any[]) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (...moreArgs: any[]) {
      return curried.apply(this, args.concat(moreArgs));
    };
  } as Curried<T>;
}

// 使用
const sum = (a: number, b: number, c: number) => a + b + c;
const curriedSum = curry(sum);
const result = curriedSum(1)(2)(3);  // 类型推导为 number
```

### 10.3 与 Ramda.js 集成

```javascript
const R = require('ramda');

// Ramda 的柯里化函数默认柯里化所有函数
const sum = R.curry((a, b, c) => a + b + c);
console.log(sum(1)(2)(3));    // 6
console.log(sum(1, 2)(3));    // 6
console.log(sum(1)(2, 3));    // 6

// Ramda 的偏函数
const greet = R.partial((greeting, name, punctuation) =>
  `${greeting}, ${name}${punctuation}`, ['Hello']);
console.log(greet('World', '!'));  // 'Hello, World!'

// Ramda 的占位符
const f = R.curry((a, b, c) => `${a}-${b}-${c}`);
console.log(f(R.__, 2, 3)(1));  // '1-2-3'
```

### 10.4 与 Lodash 集成

```javascript
const _ = require('lodash');

// Lodash 的柯里化
const sum = _.curry((a, b, c) => a + b + c);
console.log(sum(1)(2)(3));  // 6

// Lodash 的偏函数
const greet = _.partial((greeting, name, punctuation) =>
  `${greeting}, ${name}${punctuation}`, 'Hello');
console.log(greet('World', '!'));  // 'Hello, World!'

// Lodash 的占位符
const f = _.partial((a, b, c) => `${a}-${b}-${c}`, _, 2, _);
console.log(f(1, 3));  // '1-2-3'
```

### 10.5 单元测试

```javascript
// 使用 Jest 测试柯里化函数
describe('curry', () => {
  test('完整参数调用', () => {
    const sum = (a, b, c) => a + b + c;
    const curriedSum = curry(sum);
    expect(curriedSum(1, 2, 3)).toBe(6);
  });

  test('链式调用', () => {
    const sum = (a, b, c) => a + b + c;
    const curriedSum = curry(sum);
    expect(curriedSum(1)(2)(3)).toBe(6);
  });

  test('混合调用', () => {
    const sum = (a, b, c) => a + b + c;
    const curriedSum = curry(sum);
    expect(curriedSum(1, 2)(3)).toBe(6);
    expect(curriedSum(1)(2, 3)).toBe(6);
  });

  test('保留 this 上下文', () => {
    const obj = {
      multiplier: 10,
      multiply(a, b) {
        return (a + b) * this.multiplier;
      },
    };
    const curriedMultiply = curry(obj.multiply.bind(obj));
    expect(curriedMultiply(1)(2)).toBe(30);
  });
});
```

### 10.6 ESLint 规则

```json
{
  "rules": {
    "prefer-arrow-callback": "error",
    "no-loop-func": "error",
    "consistent-return": "error"
  }
}
```

---

## 11. 案例研究

### 11.1 Lodash 的 curry 实现

Lodash 的 `_.curry` 是工业级实现，支持：

- 占位符（`_.placeholder`）
- 元数指定（`_.curry(fn, arity)`）
- 与 `bind` 兼容

```javascript
// Lodash curry 简化版源码分析
function curry(func, arity = func.length) {
  const curried = function (...args) {
    const placeholder = curry.placeholder;
    if (args.length >= arity && !args.includes(placeholder)) {
      return func.apply(this, args);
    }
    return function (...restArgs) {
      const newArgs = args.map(arg =>
        arg === placeholder ? restArgs.shift() : arg
      );
      return curried.apply(this, [...newArgs, ...restArgs]);
    };
  };
  curried.placeholder = Symbol('placeholder');
  return curried;
}
```

### 11.2 Ramda.js 的设计哲学

Ramda.js 的核心设计原则：

1. **函数优先，数据最后**：所有核心函数都柯里化，数据参数放最后
2. **纯函数**：所有函数无副作用
3. **不可变数据**：所有操作返回新数据

```javascript
// Ramda 风格：函数优先，数据最后
const R = require('ramda');

const isEven = n => n % 2 === 0;
const square = n => n * n;
const sum = (a, b) => a + b;

// 数据在最后，便于组合
const processNumbers = R.pipe(
  R.filter(isEven),
  R.map(square),
  R.reduce(sum, 0)
);

console.log(processNumbers([1, 2, 3, 4, 5, 6]));  // 4 + 16 + 36 = 56
```

### 11.3 React Hooks 中的偏函数

React Hooks 中 `useCallback` 本质上是偏函数应用：

```jsx
function useDebouncedCallback(callback, delay) {
  const timerRef = useRef(null);

  const debounced = useCallback(
    (...args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );

  return debounced;
}

// 使用：偏函数固定 delay
const debouncedSearch = useDebouncedCallback(query => {
  searchAPI(query);
}, 300);
```

### 11.4 Express.js 中间件

Express 中间件本质上是偏函数：

```javascript
// 认证中间件工厂（偏函数）
function authMiddleware(requiredRole) {
  return function (req, res, next) {
    if (req.user.role !== requiredRole) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
}

// 使用：偏函数固定 requiredRole
app.get('/admin', authMiddleware('admin'), adminHandler);
app.get('/user', authMiddleware('user'), userHandler);
```

### 11.5 Redux 的 connect 函数

Redux 的 `connect` 是典型的柯里化设计：

```javascript
// connect 是柯里化函数：connect(mapStateToProps, mapDispatchToProps)(Component)
const mapStateToProps = state => ({
  user: state.user,
});

const mapDispatchToProps = dispatch => ({
  login: credentials => dispatch(loginAction(credentials)),
});

const ConnectedComponent = connect(
  mapStateToProps,
  mapDispatchToProps
)(MyComponent);
```

---

## 12. 习题

### 12.1 习题详解

本节提供 7 道习题，覆盖填空、选择、代码修正、开放性问题四类题型，对应 Bloom 六个认知层次。

**习题 1（填空题，Remember）**

题目：柯里化将一个接受多个参数的函数 $f(a, b, c)$ 转换为 ______ 形式，其名称源于数学家 ______ 的姓氏。

答案：`f(a)(b)(c)`、`Haskell Curry`

解析：柯里化的形式定义是将 $n$ 元函数转换为 $n$ 个一元函数的链式调用。该技术以 Haskell Brooks Curry（1900-1982）命名，其姓氏 Curry 亦是 Haskell 编程语言的命名来源。

**习题 2（填空题，Understand）**

题目：在 JavaScript 中实现柯里化时，通常通过 ______ 判断是否已收集足够参数，使用 ______ 方法延迟执行原函数。

答案：`fn.length`、`apply`

解析：`Function.prototype.length` 属性返回函数的形式参数数量（不含默认参数与 rest 参数），用于判断参数是否收集完毕。`Function.prototype.apply` 方法允许以数组形式传入参数并指定 `this` 上下文。

**习题 3（选择题，Understand）**

题目：下列关于柯里化与偏函数的区别，哪项描述最准确？

正确答案：A（柯里化每次只接受一个参数，偏函数一次可固定多个参数）

解析：柯里化将多元函数严格分解为一元函数链 $f(a)(b)(c)$，偏函数则允许一次固定部分参数 $f(a, b)(c)$。二者形式不同但都基于闭包实现。选项 B 错误（二者形式不同），选项 C 错误（偏函数可返回完整函数），选项 D 错误（偏函数并非必须用占位符）。

**习题 4（选择题，Analyze）**

题目：以下哪种场景最适合使用柯里化？

正确答案：B（需要逐步收集参数并复用配置的日志、过滤、映射函数）

解析：柯里化的核心价值在于配置复用与函数组合。日志器、过滤器、映射器等工具函数通过柯里化可生成预配置的专用版本，提升代码可读性。选项 A（一次性任务）无需柯里化的灵活性；选项 C（性能敏感场景）应避免柯里化的开销；选项 D（并行处理）与柯里化无关。

**习题 5（代码修正题，Apply）**

题目：以下柯里化函数存在缺陷，在调用 `curry(fn)(1, 2)(3)` 时无法正确返回结果。请修复。

修复要点：
1. 使用 `fn.apply(this, args)` 展开参数数组
2. 递归调用使用 `curried.apply(this, args.concat(moreArgs))`

解析：原代码使用 `fn(args)` 将参数数组作为单个参数传入，导致原函数收到 `[[1, 2]]` 而非 `[1, 2]`。`apply` 方法可正确展开数组为参数列表。

**习题 6（代码修正题，Evaluate）**

题目：以下偏函数实现无法处理占位符，导致 `partial(fn, _, 2)(1, 3)` 无法正确返回结果。请修复。

修复要点：遍历 `presetArgs`，遇到占位符时从 `laterArgs` 中按序取值填充。

解析：原实现未识别占位符 `_`，直接将 `_` 符号作为参数传递给原函数。修复后，占位符位置从后续调用参数中按序填充。

**习题 7（开放性问题，Create）**

题目：你正在设计一个 HTTP 客户端库，要求支持灵活的请求配置复用与链式调用。请论述如何使用柯里化与偏函数构建可扩展的 API 设计。

关键评分点：
1. 提出清晰的三层柯里化架构（配置层、方法层、调用层）
2. 论述偏函数在预配置方法（get/post）中的应用
3. 处理路径参数与查询参数的解耦
4. 给出拦截器组合的函数管道设计
5. 处理 async/await 与柯里化返回 Promise 的兼容性
6. 给出完整的错误处理与重试策略

---

## 13. 参考文献

1. Curry, H. B. and Feys, R. 1958. *Combinatory Logic, Volume I*. North-Holland Publishing Company, 1-416.

2. Schönfinkel, M. 1924. Über die Bausteine der mathematischen Logik. *Mathematische Annalen* 92, 3, 305-316. DOI: 10.1007/BF01448013.

3. Reynolds, J. C. 1972. Definitional interpreters for higher-order programming languages. In *Proceedings of the ACM Annual Conference*. ACM, 717-740. DOI: 10.1145/800194.805852.

4. Peyton Jones, S. L. 1987. *The Implementation of Functional Programming Languages*. Prentice Hall International, 1-492.

5. Odersky, M., Spoon, L., and Venners, B. 2016. *Programming in Scala* (3rd ed.). Artima Press, 1-582.

6. Ecma International. 2026. *ECMAScript 2026 Language Specification (ECMA-262, 16th Edition)*. Ecma International. Retrieved from https://www.ecma-international.org/publications/standards/Ecma-262.htm

7. Wampler, D. and Payne, A. 2014. *Programming Scala* (2nd ed.). O'Reilly Media, 1-496. DOI: 10.5555/2618071.

8. MDN Web Docs. 2025. *Closures*. Mozilla Developer Network. Retrieved from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures

9. Elliott, E. 2017. Curry and function composition. *JavaScript Scene on Medium*. Retrieved July 20, 2026, from https://medium.com/javascript-scene/curry-and-function-composition-2c208d774983

---

## 14. 延伸阅读

### 14.1 函数式编程经典著作

- **《Structure and Interpretation of Computer Programs》**（Abelson & Sussman, 1985）：MIT 经典教材，深入讲解函数式编程与闭包
- **《Learn You a Haskell for Great Good!》**（Miran Lipovača, 2011）：Haskell 入门最佳读物，原生柯里化语言
- **《Real-World Functional Programming》**（Tomas Petricek, 2009）：F# 与函数式编程实践
- **《Functional JavaScript》**（Michael Fogus, 2013）：JavaScript 函数式编程专题

### 14.2 在线资源

- **Ramda.js 文档**：https://ramdajs.com/ —— JavaScript 函数式编程库
- **Lodash 文档**：https://lodash.com/ —— 实用工具函数库
- **Fantasy Land Specification**：https://github.com/fantasyland/fantasy-land —— 函数式代数结构规范
- **Folktale**：https://folktale.origamitower.com/ —— JavaScript 函数式编程库

### 14.3 相关主题

- **高阶函数**：函数作为参数或返回值
- **闭包**：柯里化的实现基础
- **函数组合**：将多个函数组合为新函数
- **范畴论**：函数式编程的数学基础
- **Monad**：函数式编程的核心抽象
- **不可变数据**：函数式编程的核心理念

### 14.4 学术论文

- **Hughes, J. 1989. Why Functional Programming Matters**. Computer Journal 32, 2, 98-107. —— 函数式编程的优势论述
- **Wadler, P. 1990. Comprehending Monads**. Mathematical Structures in Computer Science 2, 4, 461-493. —— Monad 的经典论文
- **Appel, A. W. 1992. Compiling with Continuations**. Cambridge University Press. —— 续延传递风格

---

## 15. 附录

### 15.1 语法速查表

```javascript
// 柯里化基础实现
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

// 偏函数基础实现
function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn.apply(this, [...presetArgs, ...laterArgs]);
  };
}

// 使用 bind 实现偏函数
const partialFn = fn.bind(null, arg1, arg2);

// 函数组合
const compose = (...fns) => x => fns.reduceRight((acc, fn) => fn(acc), x);

// 管道
const pipe = (...fns) => x => fns.reduce((acc, fn) => fn(acc), x);
```

### 15.2 兼容性表

| 特性 | Chrome | Firefox | Safari | Edge | Node.js |
| ---- | ------ | ------- | ------ | ---- | ------- |
| 箭头函数 | 45+ | 22+ | 10+ | 12+ | 4+ |
| 扩展运算符 | 46+ | 16+ | 8+ | 12+ | 5+ |
| Function.prototype.bind | 7+ | 4+ | 5.1+ | 12+ | 0.10+ |
| rest 参数 | 47+ | 15+ | 10+ | 12+ | 6+ |

### 15.3 Lodash 与 Ramda 对比

| 特性 | Lodash | Ramda |
| ---- | ------ | ----- |
| 设计哲学 | 实用工具库 | 函数式编程库 |
| 函数顺序 | 数据优先 | 函数优先，数据最后 |
| 默认柯里化 | 否（需显式调用 `_.curry`） | 是（所有函数默认柯里化） |
| 不可变性 | 可选（`_.cloneDeep`） | 默认 |
| 占位符 | `_.placeholder` | `R.__` |
| 包大小 | ~25KB（按需引入） | ~30KB |

### 15.4 类型定义

```typescript
// 柯里化函数类型
type Curried<T extends (...args: any[]) => any> = T extends (
  first: infer First,
  ...rest: infer Rest
) => infer Return
  ? Rest extends []
    ? (arg: First) => Return
    : (arg: First) => Curried<(...args: Rest) => Return>
  : never;

// 偏函数类型
type Partial<T extends (...args: any[]) => any> = T extends (
  ...args: infer Args
) => infer Return
  ? <P extends Partial<Args>>(
      ...presetArgs: P
    ) => (...rest: Exclude<Args, P>) => Return
  : never;
```

### 15.5 性能优化速查

```javascript
// 1. 避免深度柯里化（>5 层）
// 2. 性能敏感场景使用直接调用
// 3. 频繁调用的柯里化函数可考虑缓存中间结果
// 4. 使用 V8 友好的柯里化形式（避免递归）
// 5. 大数据量处理避免柯里化导致的多次数组创建
```

### 15.6 函数式编程术语表

| 术语 | 英文 | 定义 |
| ---- | ---- | ---- |
| 柯里化 | Currying | 将多元函数转换为一元函数链 |
| 偏函数应用 | Partial Application | 固定函数部分参数生成新函数 |
| 函数组合 | Function Composition | 将多个函数组合为新函数 |
| 高阶函数 | Higher-Order Function | 接受或返回函数的函数 |
| 闭包 | Closure | 函数及其引用环境的复合体 |
| 纯函数 | Pure Function | 无副作用、输出仅依赖输入的函数 |
| 不可变性 | Immutability | 数据创建后不可修改 |
| Monad | Monad | 函数式编程的核心抽象 |
| 范畴论 | Category Theory | 函数式编程的数学基础 |
| λ 演算 | Lambda Calculus | 函数式编程的数学模型 |

### 15.7 修订记录

| 日期 | 版本 | 修订内容 | 修订人 |
| ---- | ---- | -------- | ------ |
| 2026-07-20 | 1.0 | 初始金标准版本 | FANDEX Content Engineering Team |

### 15.8 致谢

本篇文档参考了以下开源项目与文档：

- Lodash 项目：提供工业级柯里化实现参考
- Ramda.js 项目：函数式编程设计哲学启发
- MDN Web Docs：闭包与函数 API 的权威文档
- TC39 ECMAScript 规范：语言标准的权威来源

### 15.9 学习路径

| 阶段 | 主题 | 推荐资源 |
| ---- | ---- | -------- |
| 入门 | 函数基础 | MDN 函数教程 |
| 进阶 | 闭包与高阶函数 | 《JavaScript 高级程序设计》第 10 章 |
| 高级 | 柯里化与偏函数 | 本篇文档 |
| 实战 | 函数式编程库 | Ramda.js 文档 |
| 深入 | 范畴论与 Monad | 《Category Theory for Programmers》 |

### 15.10 教学建议

**面向不同学习者的教学策略：**

1. **初学者**：从箭头函数与简单柯里化入手，强调「配置复用」的直觉
2. **中级开发者**：结合 Lodash/Ramda 实战，讲解库 API 设计哲学
3. **高级开发者**：深入形式语义、λ 演算、范畴论，探讨函数式编程本质

**常见教学误区：**

1. 过早引入复杂的形式化定义，让初学者望而生畏
2. 忽略性能开销，让学习者误以为柯里化适合所有场景
3. 不区分柯里化与偏函数，导致概念混淆

### 15.11 FAQ

**Q1: 柯里化与偏函数哪个更好？**

A: 二者无绝对优劣，需根据场景选择。柯里化适合多层配置复用与函数组合，偏函数适合简单固定少量参数。性能敏感场景建议直接调用。

**Q2: 柯里化会影响性能吗？**

A: 是的，柯里化涉及多次函数调用与闭包创建，相比直接调用有 10-20 倍的性能开销。但在大多数业务场景下，可读性收益远大于性能损失。

**Q3: JavaScript 何时原生支持柯里化？**

A: 目前 TC39 暂无原生柯里化提案。管道操作符 `|>` 提案（Stage 3）与部分应用提案 `?.`（Stage 1）正在推进中，未来可能简化函数式编程语法。

**Q4: 如何在 TypeScript 中正确类型化柯里化函数？**

A: 使用递归条件类型 `Curried<T>`，参考本篇附录 15.4 的类型定义。对于复杂场景，可借助 `ramda` 的类型定义库 `@types/ramda`。

**Q5: 柯里化与 React Hooks 有关系吗？**

A: 有间接关系。`useCallback` 本质上是偏函数应用，`useMemo` 类似于惰性求值。React 函数式编程风格与柯里化思想相通。

### 15.12 总结

柯里化与偏函数是函数式编程的核心技术，通过参数收集与延迟执行，将「配置」与「执行」解耦，提升代码的复用性、可读性与可组合性。

**核心要点回顾：**

1. 柯里化将 $n$ 元函数转换为 $n$ 个一元函数链：$f(a, b, c) \to f(a)(b)(c)$
2. 偏函数固定部分参数生成新函数：$\text{partial}(f, a)(b, c) = f(a, b, c)$
3. 二者均基于闭包机制实现，本质是 λ 演算的工程化
4. 性能开销约为直接调用的 10-20 倍，但可读性收益显著
5. 推荐在库 API 设计、配置复用、函数组合场景使用
6. 性能敏感场景应避免深度柯里化

**未来发展方向：**

1. 管道操作符 `|>` 提案将简化函数组合语法
2. 部分应用提案 `?.` 可能提供原生偏函数语法
3. 类型系统对柯里化的支持将更加完善
4. 函数式编程范式在 React 等主流框架中的渗透将持续深化

---

## 16. 实战项目：构建函数式数据处理库

### 16.1 项目目标

构建一个基于柯里化与偏函数的数据处理库，支持：

1. 链式数据转换（map、filter、reduce）
2. 配置化日志与监控
3. 错误处理与重试
4. 类型安全的管道组合

### 16.2 完整实现

```javascript
/**
 * 函数式数据处理库 FpUtils
 * 基于柯里化与偏函数实现
 */
const FpUtils = (function () {
  // ============================================================
  // 核心工具函数
  // ============================================================

  /**
   * 柯里化函数
   */
  function curry(fn) {
    return function curried(...args) {
      if (args.length >= fn.length) {
        return fn.apply(this, args);
      }
      return function (...moreArgs) {
        return curried.apply(this, args.concat(moreArgs));
      };
    };
  }

  /**
   * 偏函数应用
   */
  function partial(fn, ...presetArgs) {
    return function (...laterArgs) {
      return fn.apply(this, [...presetArgs, ...laterArgs]);
    };
  }

  /**
   * 函数组合（从右到左）
   */
  function compose(...fns) {
    return x => fns.reduceRight((acc, fn) => fn(acc), x);
  }

  /**
   * 管道（从左到右）
   */
  function pipe(...fns) {
    return x => fns.reduce((acc, fn) => fn(acc), x);
  }

  // ============================================================
  // 柯里化的数组操作
  // ============================================================

  const map = curry((fn, arr) => arr.map(fn));
  const filter = curry((predicate, arr) => arr.filter(predicate));
  const reduce = curry((fn, initial, arr) => arr.reduce(fn, initial));
  const sort = curry((comparator, arr) => [...arr].sort(comparator));
  const find = curry((predicate, arr) => arr.find(predicate));
  const some = curry((predicate, arr) => arr.some(predicate));
  const every = curry((predicate, arr) => arr.every(predicate));
  const flatMap = curry((fn, arr) => arr.flatMap(fn));
  const slice = curry((start, end, arr) => arr.slice(start, end));
  const chunk = curry((size, arr) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  });

  // ============================================================
  // 柯里化的对象操作
  // ============================================================

  const prop = curry((key, obj) => obj?.[key]);
  const pick = curry((keys, obj) =>
    keys.reduce((acc, key) => {
      if (key in obj) acc[key] = obj[key];
      return acc;
    }, {})
  );
  const omit = curry((keys, obj) =>
    Object.keys(obj).reduce((acc, key) => {
      if (!keys.includes(key)) acc[key] = obj[key];
      return acc;
    }, {})
  );
  const merge = curry((source, target) => ({ ...target, ...source }));
  const path = curry((keys, obj) =>
    keys.reduce((acc, key) => (acc ? acc[key] : undefined), obj)
  );

  // ============================================================
  // 配置化日志器
  // ============================================================

  const createLogger = curry((level, source, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, source, message, ...meta };
    console.log(JSON.stringify(logEntry));
    return logEntry;
  });

  const logger = {
    info: createLogger('INFO'),
    warn: createLogger('WARN'),
    error: createLogger('ERROR'),
    debug: createLogger('DEBUG'),
  };

  // ============================================================
  // 错误处理与重试
  // ============================================================

  /**
   * 带重试的函数调用
   */
  const withRetry = curry((options, fn) => async (...args) => {
    const { retries = 3, delay = 1000, backoff = 2 } = options;
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          logger.warn('RetryService')(
            `Attempt ${attempt + 1} failed, retrying...`,
            { error: error.message, nextAttempt: attempt + 2 }
          );
          await new Promise(resolve =>
            setTimeout(resolve, delay * Math.pow(backoff, attempt))
          );
        }
      }
    }
    throw lastError;
  });

  /**
   * 异步管道
   */
  const pipeAsync = (...fns) => async x => {
    let result = x;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };

  // ============================================================
  // 数据处理管道示例
  // ============================================================

  /**
   * 用户数据处理管道
   */
  const processUsers = pipe(
    filter(u => u.active),                        // 过滤活跃用户
    map(pick(['id', 'name', 'email'])),           // 提取关键字段
    sort((a, b) => a.name.localeCompare(b.name)), // 按名排序
    chunk(10)                                      // 分页，每页 10 条
  );

  /**
   * 订单统计管道
   */
  const analyzeOrders = pipe(
    filter(o => o.status === 'completed'),
    map(o => ({ ...o, total: o.price * o.quantity })),
    reduce(
      (acc, o) => {
        acc.totalRevenue += o.total;
        acc.orderCount += 1;
        acc.avgOrder = acc.totalRevenue / acc.orderCount;
        return acc;
      },
      { totalRevenue: 0, orderCount: 0, avgOrder: 0 }
    )
  );

  // ============================================================
  // 导出 API
  // ============================================================

  return {
    // 核心工具
    curry,
    partial,
    compose,
    pipe,
    pipeAsync,
    // 数组操作
    map,
    filter,
    reduce,
    sort,
    find,
    some,
    every,
    flatMap,
    slice,
    chunk,
    // 对象操作
    prop,
    pick,
    omit,
    merge,
    path,
    // 日志
    logger,
    createLogger,
    // 错误处理
    withRetry,
    // 业务管道
    processUsers,
    analyzeOrders,
  };
})();

// ============================================================
// 使用示例
// ============================================================

// 示例 1：用户数据处理
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', active: true, age: 30 },
  { id: 2, name: 'Bob', email: 'bob@example.com', active: false, age: 25 },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', active: true, age: 35 },
];

const processedPages = FpUtils.processUsers(users);
console.log(processedPages);
// [[{ id: 1, name: 'Alice', email: 'alice@example.com' },
//   { id: 3, name: 'Charlie', email: 'charlie@example.com' }]]

// 示例 2：订单统计
const orders = [
  { id: 1, status: 'completed', price: 100, quantity: 2 },
  { id: 2, status: 'pending', price: 50, quantity: 1 },
  { id: 3, status: 'completed', price: 200, quantity: 3 },
];

const stats = FpUtils.analyzeOrders(orders);
console.log(stats);
// { totalRevenue: 800, orderCount: 2, avgOrder: 400 }

// 示例 3：带重试的 API 调用
const fetchWithRetry = FpUtils.withRetry({
  retries: 3,
  delay: 1000,
  backoff: 2,
});

const fetchUser = fetchWithRetry(async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});

// 调用：fetchUser('u1').then(user => console.log(user));
```

### 16.3 项目总结

本项目展示了柯里化与偏函数在生产环境下的完整应用：

1. **核心工具**：`curry`、`partial`、`compose`、`pipe` 提供基础函数式编程能力
2. **数组操作**：所有数组方法柯里化，数据参数放最后，便于组合
3. **对象操作**：`prop`、`pick`、`omit`、`path` 等常用操作柯里化
4. **日志系统**：三层柯里化（level、source、message）支持灵活配置
5. **错误处理**：`withRetry` 实现指数退避重试，`pipeAsync` 支持异步管道
6. **业务管道**：`processUsers`、`analyzeOrders` 展示实际业务场景应用

---

## 17. 与未来 ECMAScript 提案的关联

### 17.1 管道操作符 `|>` 提案

TC39 管道操作符提案（Stage 3）将极大简化函数组合：

```javascript
// 当前写法
const result = pipe(
  filter(isEven),
  map(square),
  reduce(sum, 0)
)([1, 2, 3, 4, 5, 6]);

// 管道操作符写法（未来）
const result = [1, 2, 3, 4, 5, 6]
  |> (% |> filter(isEven, %))
  |> (% |> map(square, %))
  |> (% |> reduce(sum, 0, %));
```

### 17.2 部分应用提案

TC39 部分应用提案（Stage 1）将提供原生偏函数语法：

```javascript
// 当前写法
const hello = greet.bind(null, 'Hello');

// 部分应用写法（未来）
const hello = greet('Hello', ?, ?);
```

### 17.3 模式匹配提案

模式匹配提案（Stage 1）与柯里化结合可实现强大的数据解构：

```javascript
// 未来模式匹配
const result = match(data) {
  when { type: 'user', name: String } => formatUser(data),
  when { type: 'order', id: Number } => formatOrder(data),
  when _ => 'Unknown'
};
```

### 17.4 Records & Tuples 提案

不可变数据结构提案（Stage 2）与函数式编程天然契合：

```javascript
// 不可变记录
const user = #{ name: 'Alice', age: 30 };
const updated = #{ ...user, age: 31 };  // 新记录

// 不可变元组
const numbers = #[1, 2, 3];
const doubled = numbers.map(x => x * 2);  // 新元组
```

### 17.5 对函数式编程的影响

上述提案若全部通过，将显著改善 JavaScript 函数式编程体验：

1. 管道操作符替代 `pipe` 函数，语法更直观
2. 部分应用替代 `bind` 与 `partial`，原生支持
3. 模式匹配简化条件分支，减少 `if-else` 嵌套
4. 不可变数据结构消除手动 `cloneDeep`，提升性能与安全性

**未来展望：** JavaScript 函数式编程正在向 Haskell、Scala 等语言靠拢。柯里化与偏函数作为基础技术，其理念将贯穿未来 ECMAScript 的演进。掌握这些核心概念，将有助于开发者在语言演进中保持竞争力。

