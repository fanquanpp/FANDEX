---
order: 50
title: 字面量类型与联合类型
module: typescript
category: TypeScript
difficulty: advanced
description: 字面量类型、联合类型、可辨识联合的形式语义、类型论基础与穷尽性检查的工程实践
author: fanquanpp
updated: '2026-07-20'
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
related:
- typescript/接口与类型别名
- typescript/函数与泛型
- typescript/类与装饰器
- typescript/交叉类型与类型合并
- typescript/条件类型与infer
- typescript/映射类型与键重映射
prerequisites:
- typescript/语法速查
- typescript/泛型与类型约束
tags:
- typescript
- literal-types
- union-types
- discriminated-union
- exhaustiveness-checking
- type-narrowing
- pattern-matching
- singleton-types
- type-theory
learningObjectives:
- 复述 singleton types（单例类型）的类型论定义，识别字面量类型在 TypeScript 类型系统中的位置
- 解释联合类型的代数性质（吸收律、分配律、结合律），理解联合类型与和类型（sum type）的等价关系
- 实现可辨识联合（discriminated union）模式，运用 kind 字段实现类型收窄与穷尽性检查
- 分析 TypeScript 控制流分析算法（CFA）在类型收窄中的角色，识别 typeof / instanceof / in / truthy / 自定义守卫的适用边界
- 评估 never 类型在穷尽性检查中的关键作用，对比 TypeScript 与 Rust / Haskell / Scala 3 的穷尽性保证机制
- 设计一个基于可辨识联合的状态机（FSM），覆盖所有状态转换的编译期验证，并实现类型安全的模式匹配
exercises:
- id: ex-literal-01
  type: fill-blank
  cognitiveLevel: remember
  question: TypeScript 中字面量类型属于____类型（singleton type），即类型空间中只包含一个值的类型。
  hint: 回顾 2.1 节类型论基础
  answer: 单例
  blankCount: 1
  answers:
  - 单例
  caseSensitive: false
  difficulty: 1
  explanation: 字面量类型如 'left' / 42 / true 在类型空间中各只有一个值，故称单例类型，是和类型（sum type）的最小构造单元。
  estimatedTime: 1
- id: ex-literal-02
  type: fill-blank
  cognitiveLevel: understand
  question: 在 TypeScript 中，若联合类型 T 包含一个分支是____类型，则该分支在穷尽性检查中会被自动忽略（即任何 case 都不必显式处理）。
  hint: 参考 4.3 节 never 在穷尽性检查中的作用
  answer: never
  blankCount: 1
  answers:
  - never
  caseSensitive: false
  difficulty: 2
  explanation: never 是空类型（bottom type），表示永不存在的值，穷尽性检查时 TypeScript 自动忽略 never 分支。
  estimatedTime: 2
- id: ex-literal-03
  type: choice
  cognitiveLevel: apply
  question: 下列哪种写法实现了类型安全的可辨识联合？
  options:
  - 'type Shape = { kind: string; radius?: number; size?: number }'
  - 'type Shape = { kind: ''circle''; radius: number } | { kind: ''square''; size: number }'
  - 'type Shape = { kind: string } & ({ radius: number } | { size: number })'
  - 'type Shape = circle | square; type circle = { radius: number }; type square = { size: number }'
  correctIndex: 1
  multiple: false
  difficulty: 2
  explanation: B 用字面量类型作为 kind 字段，构成可辨识联合，TypeScript 能根据 kind 收窄到具体分支；A 用 string 丧失字面量性，无法收窄；C 用交叉类型不会建立 kind 与字段的对应关系；D 缺少 kind 字段。
  estimatedTime: 2
  answer: B. B 用字面量类型作为 kind 字段，构成可辨识联合，TypeScript 能根据 kind 收窄到具体分支；A 用 string 丧失字面量性，无法收窄；C 用交叉类型不会建立 kind 与字段的对应关系；D 缺少 kind 字段。
- id: ex-literal-04
  type: choice
  cognitiveLevel: analyze
  question: 关于 TypeScript 的穷尽性检查（exhaustiveness checking），下列哪项描述最准确？
  options:
  - TypeScript 编译器对 switch 语句自动进行穷尽性检查，无需任何额外代码
  - 通过 default 分支赋值给 never 类型变量，可强制穷尽性检查
  - 穷尽性检查仅在 strict 模式下启用
  - 穷尽性检查通过 if/else 链也能实现，无需 switch
  correctIndex: 1
  multiple: false
  difficulty: 4
  explanation: TypeScript 不强制穷尽性检查；需在 default 分支将参数赋给 never 类型变量（assertNever 模式），未处理的分支会让该赋值在编译期失败；A 错误；C 错误，与 strict 无关；D 错误，if 链的穷尽性需手动维护。
  estimatedTime: 3
  answer: B. TypeScript 不强制穷尽性检查；需在 default 分支将参数赋给 never 类型变量（assertNever 模式），未处理的分支会让该赋值在编译期失败；A 错误；C 错误，与 strict 无关；D 错误，if 链的穷尽性需手动维护。
- id: ex-literal-05
  type: code-fix
  cognitiveLevel: apply
  question: 下列 switch 实现缺少穷尽性检查，未来新增 Shape 分支不会报错。请修复：
  buggyCode: "type Shape =\n  | { kind: 'circle'; radius: number }\n  | { kind: 'square'; size: number };\n\nfunction area(s: Shape): number {\n  switch (s.kind) {\n    case 'circle': return Math.PI * s.radius ** 2;\n    case 'square': return s.size ** 2;\n  }\n}\n"
  language: typescript
  fixedCode: "type Shape =\n  | { kind: 'circle'; radius: number }\n  | { kind: 'square'; size: number };\n\nfunction area(s: Shape): number {\n  switch (s.kind) {\n    case 'circle': return Math.PI * s.radius ** 2;\n    case 'square': return s.size ** 2;\n    default:\n      // 编译期穷尽性检查：未处理的 kind 会在此报错\n      const _exhaustive: never = s;\n      throw new Error(`Unhandled: ${JSON.stringify(_exhaustive)}`);\n  }\n}\n"
  errorDescription: 原实现若 Shape 新增 'triangle' 分支，area 函数运行时返回 undefined（无 default），编译期无任何提示。
  difficulty: 3
  explanation: 在 default 分支将 s 赋给 never 类型变量，新增 kind 后 s 在 default 分支不再是 never，赋值报错，强制开发者补全分支。
  estimatedTime: 5
  answer: 原实现若 Shape 新增 'triangle' 分支，area 函数运行时返回 undefined（无 default），编译期无任何提示。 关键修复：// 编译期穷尽性检查：未处理的 kind 会在此报错
- id: ex-literal-06
  type: code-fix
  cognitiveLevel: analyze
  question: 下列 instanceof 守卫在某些情况下会失效。请用类型谓词替换：
  buggyCode: "class A { a(): void {} }\nclass B { b(): void {} }\n\nfunction handle(x: A | B) {\n  if (x instanceof A) {\n    x.a();\n  } else {\n    x.b();\n  }\n}\n"
  language: typescript
  fixedCode: "class A { a(): void {} }\nclass B { b(): void {} }\n\nfunction isA(x: A | B): x is A {\n  return x instanceof A;\n}\n\nfunction handle(x: A | B) {\n  if (isA(x)) {\n    x.a();\n  } else {\n    x.b();\n  }\n}\n"
  errorDescription: instanceof 守卫在跨 iframe / 跨 realm 场景下失效（不同 realm 的同一类构造器不共享原型链）；用类型谓词封装可在单一处替换为更稳健的检测逻辑。
  difficulty: 4
  explanation: x is A 是用户定义类型谓词（user-defined type predicate），允许开发者在单一函数中实现任意检测逻辑；当 instanceof 不可靠时可替换为 duck-typing 或 Symbol.toStringTag。
  estimatedTime: 6
  answer: instanceof 守卫在跨 iframe / 跨 realm 场景下失效（不同 realm 的同一类构造器不共享原型链）；用类型谓词封装可在单一处替换为更稳健的检测逻辑。 x is A 是用户定义类型谓词（user-defined type predicate），允许开发者在单一函数中实现任意检测逻辑；当 instanceof 不可靠时可替换为 duck-typing 或 Symbol.toStringTag。
- id: ex-literal-07
  type: open-ended
  cognitiveLevel: create
  question: 请设计一个基于可辨识联合的有限状态机（FSM），描述订单状态机（pending → paid → shipped → delivered / cancelled），要求：(1) 类型层保证状态转换合法性；(2) 实现 transition 函数；(3) 讨论穷尽性检查如何防止遗漏状态。
  keyPoints:
  - '状态用可辨识联合表达：type State = { status: ''pending'' } | { status: ''paid''; paidAt: Date } | ...'
  - 转换函数 transition(state, event) 应返回 State 类型，编译期保证不会进入非法状态
  - event 同样用可辨识联合，每个 event 只允许特定的当前状态
  - 在 switch 的 default 分支用 assertNever(state) + assertNever(event) 实现双重穷尽性检查
  - 新增状态时所有 transition 函数自动报错，强制补全处理逻辑
  difficulty: 5
  minWords: 200
  estimatedTime: 20
  answer: '状态用可辨识联合表达：type State = { status: ''pending'' } | { status: ''paid''; paidAt: Date } | ...；转换函数 transition(state, event) 应返回 State 类型，编译期保证不会进入非法状态；event 同样用可辨识联合，每个 event 只允许特定的当前状态；在 switch 的 default 分支用 assertNever(state) + assertNever(event) 实现双重穷尽性检查；新增状态时所有 transition 函数自动报错，强制补全处理逻辑'
references:
- type: book
  authors:
  - Pierce, Benjamin C.
  year: 2002
  title: Types and Programming Languages
  venue: MIT Press
  isbn: 978-0-262-16209-8
- type: conference
  authors:
  - Bierman, Gavin M.
  - Abadi, Martín
  - Torgersen, Mads
  year: 2014
  title: Understanding TypeScript
  venue: ECOOP 2014 — Object-Oriented Programming
  pages: 257-281
  doi: 10.1007/978-3-662-44202-9_11
- type: journal
  authors:
  - Xi, Hongwei
  - Pfenning, Frank
  year: 1998
  title: Eliminating Array Bound Checking Through Dependent Types
  venue: Proceedings of the ACM SIGPLAN 1998 Conference on Programming Language Design and Implementation (PLDI)
  pages: 249-257
  doi: 10.1145/277650.277732
- type: conference
  authors:
  - Freeman, Tim
  - Pfenning, Frank
  year: 1991
  title: Refinement Types for ML
  venue: Proceedings of the 1991 ACM Conference on Programming Language Design and Implementation (PLDI)
  pages: 268-277
  doi: 10.1145/113445.113468
- type: journal
  authors:
  - Dunfield, Joshua
  - Krishnaswami, Neel
  year: 2021
  title: Bidirectional Typing
  venue: ACM Computing Surveys (CSUR)
  volume: 54
  issue: 5
  pages: 1-38
  doi: 10.1145/3450952
- type: journal
  authors:
  - Appel, Andrew W.
  year: 1998
  title: SSA is Functional Programming
  venue: ACM SIGPLAN Notices
  volume: 33
  issue: 4
  pages: 17-20
  doi: 10.1145/278283.278285
- type: conference
  authors:
  - Hofer, Christian
  - Ostermann, Klaus
  - Rendel, Tillmann
  - Moors, Adriaan
  year: 2008
  title: Polymorphic Embedding of DSLs
  venue: Proceedings of the 7th International Conference on Generative Programming and Component Engineering (GPCE)
  pages: 137-148
  doi: 10.1145/1449913.1449935
- type: journal
  authors:
  - Hejlsberg, Anders
  - Torgersen, Mads
  year: 2018
  title: 'TypeScript 2.0 Release Notes: Tagged Unions'
  venue: Microsoft Developer Network
  url: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html
- type: journal
  authors:
  - Rosenwasser, Daniel
  year: 2021
  title: 'TypeScript 4.5 Release Notes: Tail-Recursion Elimination on Conditional Types'
  venue: Microsoft Developer Network
  url: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html
- type: documentation
  authors:
  - Microsoft Corporation
  year: 2024
  title: 'TypeScript Handbook: Narrowing'
  venue: TypeScript Official Documentation
  url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- type: documentation
  authors:
  - Microsoft Corporation
  year: 2024
  title: 'TypeScript Handbook: Everyday Types'
  venue: TypeScript Official Documentation
  url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- type: journal
  authors:
  - Maranget, Luc
  year: 2007
  title: Compiling Pattern Matching to Good Decision Trees
  venue: Proceedings of the 2007 Workshop on ML
  pages: 35-46
  doi: 10.1145/1292535.1292540
- type: book
  authors:
  - Gamma, Erich
  - Helm, Richard
  - Johnson, Ralph
  - Vlissides, John
  year: 1994
  title: 'Design Patterns: Elements of Reusable Object-Oriented Software'
  venue: Addison-Wesley Professional
  pages: 293-303
  doi: 10.5555/186897
- type: journal
  authors:
  - Pierce, Benjamin C.
  - Turner, David N.
  year: 2000
  title: Local Type Inference
  venue: ACM Transactions on Programming Languages and Systems (TOPLAS)
  volume: 22
  issue: 1
  pages: 1-44
  doi: 10.1145/345099.345100
etymology:
- term: 字面量类型（Literal Type）
  english: Literal Type
  origin: TypeScript 1.3（2014）首次引入字符串字面量类型，受 OCaml 的 polymorphic variants 与 Flow 的 refined types 启发；类型论中称为 singleton type（单例类型），即类型空间中只有一个值的类型。
- term: 联合类型（Union Type）
  english: Union Type
  origin: 源自类型论的和类型（sum type / tagged union），最早见于 ML 系列（Standard ML, OCaml）；TypeScript 2.0（2016）正式引入；与积类型（product type，即元组/对象类型）共同构成代数数据类型（ADT）。
- term: 可辨识联合（Discriminated Union）
  english: Discriminated Union
  origin: 源自 Pascal 的 variant record（1970）与 ML 的 tagged union；TypeScript 2.0 引入 'Tagged Union' 概念，官方称 discriminated union；其判别字段（discriminant）在类型论中称 tag 或 label。
- term: 穷尽性检查（Exhaustiveness Checking）
  english: Exhaustiveness Checking
  origin: 源自 ML/Haskell 的模式匹配（pattern matching）系统；TypeScript 通过 never 类型与 default 分支的赋值错误实现近似穷尽性检查；标准 ML 与 Haskell 是真正的穷尽性检查（编译器强制 switch/match 覆盖所有分支）。
- term: 类型收窄（Type Narrowing）
  english: Type Narrowing
  origin: 源自 Flow（Facebook 2014）的控制流分析（control flow analysis, CFA）；TypeScript 2.0 起逐步引入 typeof / instanceof / in 与用户定义类型谓词；理论基础上溯到 Appel 1998 的 SSA 是 Functional Programming 一文。
---

## 引言：从 JavaScript 的灵活性到 TypeScript 的精确性

JavaScript 是动态类型语言，所有值在运行时携带类型信息，但编译期无类型约束。这导致大量"undefined is not a function"类错误。TypeScript 的核心价值在于：**把运行时类型信息上移到编译期**，让开发者在编写代码时就暴露类型不匹配。

字面量类型与联合类型是 TypeScript 类型系统的两大基石。前者把"值的精确身份"编码进类型，后者把"多种可能性"编码进类型。二者结合产生**可辨识联合（Discriminated Union）**这一模式，是 TypeScript 表达复杂业务领域模型（如状态机、AST 节点、API 响应）的核心工具。

本模块以 MIT 6.5810 Software Construction 与 Stanford CS143 Compilers 课程的标准，系统讲解：

1. **类型论基础**：singleton types、sum types、代数数据类型（ADT）的形式化定义；
2. **TypeScript 实现**：字面量类型、联合类型、可辨识联合、模式匹配、类型收窄；
3. **穷尽性检查**：never 类型的角色、assertNever 模式、与 Rust/Haskell/Scala 3 对比；
4. **工程实践**：FSM、AST、API 响应建模，与 zod / effect 等 Schema 库的集成。

## 1. 历史动机与技术演进

### 1.1 时间线

| 年份 | 事件 | 主要贡献者 |
| ---- | ---- | ---------- |
| 1970 | Pascal 引入 variant record（可辨识联合雏形） | Niklaus Wirth |
| 1973 | ML 语言引入代数数据类型（ADT）| Robin Milner |
| 1978 | Scheme 引入 tagged data | Gerald Sussman, Guy Steele |
| 1985 | Standard ML 形式化 sum type 与模式匹配 | Robin Milner |
| 1990 | Haskell 1.0 引入 algebraic data type 与 pattern matching | Haskell Committee |
| 1991 | Freeman & Pfenning 提出 refinement types | Tim Freeman, Frank Pfenning |
| 1998 | Xi & Pfenning 引入 dependent types 用于消除运行时检查 | Hongwei Xi, Frank Pfenning |
| 2002 | Pierce 出版《Types and Programming Languages》形式化 sum type | Benjamin C. Pierce |
| 2012 | TypeScript 0.8 首次发布 | Microsoft / Anders Hejlsberg |
| 2014 | TypeScript 1.3 引入字符串字面量类型 | Microsoft |
| 2014 | Flow 由 Facebook 发布，引入 refinement types | Facebook |
| 2016 | TypeScript 2.0 引入可辨识联合与控制流分析 | Microsoft |
| 2018 | TypeScript 3.0 引入 unknown 类型 | Microsoft |
| 2020 | TypeScript 4.1 引入模板字面量类型 | Microsoft |
| 2021 | TypeScript 4.5 引入条件类型尾递归优化 | Microsoft |
| 2023 | TypeScript 5.0 重写解析器，性能大幅提升 | Microsoft |
| 2024 | TC39 Stage 1 提案：Pattern Matching | TC39 |

### 1.2 设计动机

TypeScript 团队在 2014 年（v1.3）引入字符串字面量类型的动机记录在 PR #3112 与官方 release notes：

1. **取代 enum 的局限**：enum 是数值类型，无法表达 HTTP 状态码、CSS 单位、事件名等场景。
2. **支持 overloaded string parameter**：函数 `createElement(tagName: 'div' | 'span' | 'img')` 比 `tagName: string` 更精确。
3. **配合 switch 收窄**：让 TypeScript 能根据字符串值收窄到具体分支。

随后 v2.0（2016）引入**可辨识联合**（官方称 tagged union）：

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'rectangle'; width: number; height: number };
```

这是 TypeScript 类型系统从"宽松描述"走向"精确建模"的分水岭。Bierman 等人在 ECOOP 2014 的论文《Understanding TypeScript》（DOI 10.1007/978-3-662-44202-9_11）首次形式化了 TypeScript 的类型规则，为后续的 control flow analysis 与 type narrowing 奠定理论基础。

### 1.3 联合类型与和类型的关系

类型论中的**和类型（sum type）** $\tau_1 + \tau_2$ 是包含 $\tau_1$ 或 $\tau_2$ 的值的类型，其构造子为 `inl : τ₁ → τ₁ + τ₂` 与 `inr : τ₂ → τ₁ + τ₂`，消去子为模式匹配：

$$
\frac{\Gamma \vdash e : \tau_1 + \tau_2 \quad \Gamma, x : \tau_1 \vdash e_1 : \tau \quad \Gamma, y : \tau_2 \vdash e_2 : \tau}{\Gamma \vdash \text{case } e \text{ of } \text{inl}(x) \Rightarrow e_1 \mid \text{inr}(y) \Rightarrow e_2 : \tau}
\quad
(\text{E-Sum})
$$

TypeScript 的联合类型 `A | B` 是和类型的工程化实现，差异在于：

- **无显式 tag**：和类型要求显式 `inl` / `inr` 标签；TypeScript 通过判别字段（kind）或结构差异自动识别。
- **无强制模式匹配**：和类型的消去子是模式匹配，TypeScript 用 if/switch + 类型收窄近似实现。
- **开放性**：和类型是封闭的（fixed set of variants），TypeScript 联合是开放的（可通过类型增强扩展）。

### 1.4 代数数据类型（ADT）

代数数据类型由**和类型（sum）**与**积类型（product）**组合而成：

- **积类型**：`(A, B)` 即 TypeScript 的元组 `[A, B]` 或对象 `{ a: A; b: B }`，其基数 $|A \times B| = |A| \cdot |B|$。
- **和类型**：`A | B`，其基数 $|A + B| = |A| + |B|$。

例：枚举一周七天

```typescript
type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
// |Day| = 7

type WorkHour = { day: Day; start: number; end: number };
// |WorkHour| = |Day| × |number| × |number| = 7 × 2^53 × 2^53（理论上）
```

代数数据类型的核心价值：**类型与值的一一对应**。每个值都有唯一类型，每个类型都对应确定数量的值（含无穷类型如 string）。这让类型系统能精确描述业务领域模型，避免运行时非法状态。

## 2. 形式化定义

### 2.1 字面量类型与单例类型

设 $\mathcal{V}$ 为运行时值的全集。字面量类型 $\text{Lit}_v$ 是仅包含单个值 $v$ 的类型：

$$
\text{Lit}_v = \{ v \}
$$

即类型 $\text{Lit}_v$ 的 inhabitants 集合只有 $v$ 一个元素。例如：

- `'left'` 类型只有字符串 `'left'` 一个值；
- `42` 类型只有数字 42 一个值；
- `true` 类型只有布尔值 `true` 一个值。

字面量类型在类型论中称为**单例类型（singleton type）**。

TypeScript 中的字面量类型有四种：

```typescript
type Str = 'hello';           // 字符串字面量类型
type Num = 42;                 // 数字字面量类型
type Bool = true;              // 布尔字面量类型
type BigInt = 100n;            // BigInt 字面量类型（TS 4.0+）

// 模板字面量类型（4.1+）— 字面量类型的推广
type EventName = `on${Capitalize<'click' | 'hover'>}`;  // 'onClick' | 'onHover'
```

### 2.2 子类型关系

字面量类型是其对应宽类型的子类型：

$$
\text{Lit}_v \sqsubseteq \text{typeof}(v)
$$

例如：

```typescript
let s: string = 'hello';  // 'hello' 是 string 的子类型
let n: number = 42;       // 42 是 number 的子类型
let b: boolean = true;    // true 是 boolean 的子类型
```

子类型规则的形式化：

$$
\frac{v : \text{Lit}_v \quad \text{Lit}_v \sqsubseteq \tau}{v : \tau}
\quad
(\text{S-Lit-Widen})
$$

即字面量值总是可以 widening 到其宽类型。

### 2.3 联合类型的代数性质

联合类型 $A \cup B$ 满足以下代数性质：

**幂等律（Idempotent）**：

$$
A \cup A = A
$$

```typescript
type T1 = string | string;  // string
```

**交换律（Commutative）**：

$$
A \cup B = B \cup A
$$

```typescript
type T2 = string | number;  // 与 number | string 等价
```

**结合律（Associative）**：

$$
(A \cup B) \cup C = A \cup (B \cup C)
$$

**吸收律（Absorption）**：

$$
A \cup \text{never} = A
$$

```typescript
type T3 = string | never;  // string
```

**分配律（Distributive，与交叉类型配合）**：

$$
A \cap (B \cup C) = (A \cap B) \cup (A \cap C)
$$

```typescript
type T4 = { x: number } & ({ y: string } | { z: boolean });
// 等价于 { x: number; y: string } | { x: number; z: boolean }
```

### 2.4 联合类型的基数

对于有限类型 $\tau_1, \dots, \tau_n$，联合类型 $\tau_1 \cup \dots \cup \tau_n$ 的基数：

$$
|\tau_1 \cup \dots \cup \tau_n| \leq |\tau_1| + \dots + |\tau_n|
$$

不等号是因为联合类型自动去重（吸收律）。例：

```typescript
type T = 'a' | 'b' | 'a';  // 'a' | 'b'，基数 2（不是 3）
```

### 2.5 可辨识联合的形式化

可辨识联合是联合类型的一个子集，其每个分支共享一个判别字段（discriminant）：

$$
\text{DU}_K = \bigcup_i \{ \text{kind} : k_i \} \cap \tau_i
$$

其中 $k_i$ 是字面量类型，$\tau_i$ 是该分支的其他字段类型。形式化定义：

$$
\frac{\forall i, \; \tau_i = \{ \text{kind} : \text{Lit}_{k_i}, \dots \} \quad k_i \neq k_j \text{ if } i \neq j}{\bigcup_i \tau_i \text{ 是可辨识联合}}
\quad
(\text{DU-Form})
$$

判别字段 $k_i$ 必须互不相同（每个分支有唯一的判别值），这样 TypeScript 才能根据 kind 字段精确收窄。

### 2.6 类型收窄的语义

类型收窄（type narrowing）是基于控制流分析（CFA）的类型细化。其语义规则如下：

**规则 N1（typeof 收窄）**：

$$
\frac{\Gamma \vdash e : \tau \quad \text{typeof}(e) = s \in \{ \text{'string'}, \text{'number'}, \dots \}}{\Gamma \vdash_{\text{then}} e : \tau \cap \text{typeof}^{-1}(s) \quad \Gamma \vdash_{\text{else}} e : \tau \setminus \text{typeof}^{-1}(s)}
\quad
(\text{N-Typeof})
$$

其中 $\text{typeof}^{-1}(s)$ 是 typeof 字符串对应的 TypeScript 类型。

**规则 N2（判别字段收窄）**：

$$
\frac{\Gamma \vdash e : \bigcup_i \{ \text{kind} : k_i, \dots \} \quad \Gamma \vdash e.\text{kind} = k_j}{\Gamma \vdash e : \{ \text{kind} : k_j, \dots \}}
\quad
(\text{N-Discriminant})
$$

这是可辨识联合的核心收窄规则。

**规则 N3（in 操作符收窄）**：

$$
\frac{\Gamma \vdash e : \tau \quad k \in \text{keys}(\sigma)}{\Gamma \vdash_{\text{then}} e : \tau \cap \sigma \quad \Gamma \vdash_{\text{else}} e : \tau \setminus \sigma}
\quad
(\text{N-In})
$$

### 2.7 穷尽性检查的语义

穷尽性检查要求 switch 或 if-else 链覆盖联合类型的所有分支。形式化：

$$
\frac{\Gamma \vdash e : \bigcup_i \tau_i \quad \text{cases} = \{ \tau_{j_1}, \dots, \tau_{j_m} \} \quad \{ \tau_1, \dots, \tau_n \} \subseteq \text{cases}}{\text{switch is exhaustive}}
\quad
(\text{E-Exhaustive})
$$

TypeScript 通过 never 类型实现穷尽性检查的编译期保证：

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${JSON.stringify(x)}`);
}

function handle(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.size ** 2;
    case 'rectangle': return s.width * s.height;
    default:
      return assertNever(s);  // 若未处理某分支，s 非 never，赋值给 never 参数报错
  }
}
```

## 3. 字面量类型详解

### 3.1 字符串字面量类型

```typescript
type Direction = 'left' | 'right' | 'up' | 'down';

function move(d: Direction): void {
  console.log(`Moving ${d}`);
}

move('left');    // OK
move('Left');    // Error: '"Left"' is not assignable to '"left" | "right" | "up" | "down"'
move('lefts');   // Error
```

应用场景：

- **事件名**：`type EventName = 'click' | 'hover' | 'focus' | 'blur'`
- **API 端点**：`type Endpoint = '/users' | '/posts' | '/comments'`
- **CSS 属性**：`type Position = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'`
- **HTTP 方法**：`type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'`

### 3.2 数字字面量类型

```typescript
type HTTPStatus = 200 | 301 | 404 | 500;
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
type Bit = 0 | 1;

function describeStatus(s: HTTPStatus): string {
  switch (s) {
    case 200: return 'OK';
    case 301: return 'Moved Permanently';
    case 404: return 'Not Found';
    case 500: return 'Internal Server Error';
  }
}
```

### 3.3 布尔字面量类型

```typescript
type True = true;
type False = false;
type Bool = true | false;  // 等价于 boolean

interface CheckboxProps {
  checked: true;  // 必须为 true，用于受控组件
  onChange: () => void;
}
```

### 3.4 BigInt 字面量类型（TS 4.0+）

```typescript
type SmallBig = 0n | 1n | 2n | 3n;

function add(a: SmallBig, b: SmallBig): bigint {
  return a + b;
}
```

### 3.5 模板字面量类型（TS 4.1+）

模板字面量类型是字面量类型的推广，支持类型层字符串拼接：

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;

type MouseEvent = EventName<'click' | 'down' | 'up'>;
// 'onClick' | 'onMouseDown' | 'onMouseUp'

type CSSValue = `${number}${'px' | 'em' | 'rem' | '%'}`;
// '12px' | '1.5em' | '100%' | ...

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiPath = `/api/${string}`;
type Endpoint = `${HttpMethod} ${ApiPath}`;
// 'GET /api/...' | 'POST /api/...' | ...
```

### 3.6 字面量推断与 const 断言

TypeScript 默认对字面量值做 widening（拓宽）：

```typescript
const s = 'hello';   // 类型: 'hello'（const 自动保留字面量类型）
let s2 = 'hello';    // 类型: string（let 自动拓宽）

const arr = ['a', 'b'];     // 类型: string[]（元素自动拓宽）
const arr2 = ['a', 'b'] as const;  // 类型: readonly ['a', 'b']（保留字面量类型）
```

`as const` 是声明字面量类型的关键工具，应用于：

```typescript
// 配置常量
const CONFIG = {
  apiBase: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
} as const;
// 类型: { readonly apiBase: 'https://api.example.com'; readonly timeout: 5000; readonly retries: 3 }

// 枚举替代
const Status = {
  Pending: 'pending',
  Paid: 'paid',
  Shipped: 'shipped',
} as const;
type Status = typeof Status[keyof typeof Status];
// 'pending' | 'paid' | 'shipped'
```

## 4. 联合类型详解

### 4.1 基础联合

```typescript
type ID = string | number;
type Nullable<T> = T | null | undefined;
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function findUser(id: ID): Nullable<User> {
  // ...
  return null;
}
```

### 4.2 可辨识联合

可辨识联合（Discriminated Union）是联合类型的特殊形式，每个分支通过判别字段区分：

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':    return Math.PI * s.radius ** 2;
    case 'square':    return s.size ** 2;
    case 'rectangle': return s.width * s.height;
  }
}

// TypeScript 根据 s.kind 自动收窄：
//   case 'circle' 内 s: { kind: 'circle'; radius: number }
//   case 'square' 内 s: { kind: 'square'; size: number }
```

判别字段可以是任意字面量类型（string / number / boolean / bigint），不限于 `kind`，也可是 `type`、`status`、`tag` 等。

### 4.3 never 类型与穷尽性检查

`never` 类型是空类型（bottom type），表示永不存在的值。它在穷尽性检查中起关键作用：

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${JSON.stringify(x)}`);
}

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':    return Math.PI * s.radius ** 2;
    case 'square':    return s.size ** 2;
    case 'rectangle': return s.width * s.height;
    default:
      // 若 Shape 新增分支（如 triangle），此处 s 不是 never，赋值给 never 参数报错
      return assertNever(s);
  }
}
```

#### never 的代数性质

- `T | never = T`（吸收律，never 在联合中被吸收）
- `T & never = never`（与 never 交叉得到 never）
- `never` 是所有类型的子类型（bottom type）

```typescript
type T1 = string | never;  // string
type T2 = string & never;  // never
type T3 = ReturnType<() => never>;  // never
```

#### assertNever 的变体

```typescript
// 1. 抛错版本（最常用）
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${JSON.stringify(x)}`);
}

// 2. 返回 fallback 值
function exhaustivenessCheck(x: never, fallback: unknown): unknown {
  console.warn(`Unexpected case: ${JSON.stringify(x)}`);
  return fallback;
}

// 3. 编译期检查但不抛错
function checkExhaustive(x: never): void {
  // 函数体空，仅用于触发编译期检查
}
```

### 4.4 类型收窄机制

TypeScript 的类型收窄（type narrowing）基于控制流分析（CFA），通过以下方式触发：

#### typeof 收窄

```typescript
function pad(value: string | number, len: number): string {
  if (typeof value === 'string') {
    return value.padStart(len);  // value: string
  } else {
    return value.toFixed(len);   // value: number
  }
}
```

typeof 支持的字符串：`'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function'`。注意 `typeof null === 'object'`。

#### instanceof 收窄

```typescript
class Cat { meow(): void {} }
class Dog { bark(): void {} }

function speak(animal: Cat | Dog): void {
  if (animal instanceof Cat) {
    animal.meow();  // animal: Cat
  } else {
    animal.bark();  // animal: Dog
  }
}
```

注意：instanceof 在跨 iframe / 跨 realm 场景下失效（不同 realm 的同一类构造器不共享原型链）。

#### in 操作符收窄

```typescript
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird): void {
  if ('swim' in animal) {
    animal.swim();  // animal: Fish
  } else {
    animal.fly();   // animal: Bird
  }
}
```

#### 判别字段收窄

```typescript
function area(s: Shape): number {
  if (s.kind === 'circle') {
    return Math.PI * s.radius ** 2;  // s: { kind: 'circle'; radius: number }
  }
  // s: { kind: 'square'; size: number } | { kind: 'rectangle'; width: number; height: number }
  if (s.kind === 'square') {
    return s.size ** 2;
  }
  // s: { kind: 'rectangle'; width: number; height: number }
  return s.width * s.height;
}
```

#### 用户定义类型谓词（User-Defined Type Guard）

```typescript
type Square = { kind: 'square'; size: number };
type Circle = { kind: 'circle'; radius: number };

function isCircle(s: Square | Circle): s is Circle {
  return s.kind === 'circle';
}

function describe(s: Square | Circle): string {
  if (isCircle(s)) {
    return `Circle with radius ${s.radius}`;
  }
  return `Square with size ${s.size}`;
}
```

类型谓词 `x is T` 是 TypeScript 类型系统的扩展，让开发者自定义收窄规则。

#### truthy / falsy 收窄

```typescript
function process(value: string | null | undefined): string {
  if (value) {
    return value.toUpperCase();  // value: string
  }
  return 'default';  // value: null | undefined
}
```

注意 falsy 值包括 `false`、`0`、`''`、`null`、`undefined`、`NaN`。truthy 收窄对 `0` 与 `''` 也生效：

```typescript
function f(x: number | null) {
  if (x) {
    // x: number（非 0）
  } else {
    // x: number | null（含 0）
  }
}
```

#### 等值收窄

```typescript
function f(x: 'a' | 'b' | 'c') {
  if (x === 'a') {
    // x: 'a'
  } else {
    // x: 'b' | 'c'
  }
}
```

### 4.5 类型收窄的限制

TypeScript 的 CFA 是保守的，存在以下限制：

#### 闭包中收窄失效

```typescript
function f() {
  let x: string | number = 'hello';
  setTimeout(() => {
    // x: string | number（在闭包中收窄失效，因为可能在异步间被修改）
  });
}
```

#### 函数调用后收窄失效

```typescript
function f() {
  let x: string | number = 'hello';
  console.log(x.toUpperCase());  // x: string
  someFunction();  // 可能修改 x
  console.log(x.toUpperCase());  // Error: x: string | number
}
```

#### 复杂条件收窄有限

```typescript
function f(x: string | number, y: string | number) {
  if (typeof x === 'string' || typeof y === 'string') {
    // x: string | number, y: string | number
    // TypeScript 不会精确推断 (x: string, y: any) | (x: any, y: string)
  }
}
```

### 4.6 分布式条件类型与联合

条件类型在联合类型上是分布式的：

```typescript
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<string | number>;  // string[] | number[]

// 阻止分布
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type R2 = ToArrayNonDist<string | number>;  // (string | number)[]
```

利用分布式条件类型可实现集合运算：

```typescript
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

type T1 = Exclude<'a' | 'b' | 'c', 'a'>;  // 'b' | 'c'
type T2 = Extract<'a' | 'b' | 'c', 'a' | 'b'>;  // 'a' | 'b'
```

## 5. 模式匹配与类型收窄

### 5.1 TypeScript 中的模式匹配现状

TypeScript 没有内建模式匹配语法（Haskell/Rust 的 match），但可通过以下方式近似：

#### switch-case 模式

```typescript
function handle(s: Shape): number {
  switch (s.kind) {
    case 'circle':    return Math.PI * s.radius ** 2;
    case 'square':    return s.size ** 2;
    case 'rectangle': return s.width * s.height;
    default:          return assertNever(s);
  }
}
```

#### 解构 + 字面量比较

```typescript
function handle(s: Shape): number {
  const { kind } = s;
  if (kind === 'circle') {
    const { radius } = s;  // s 已收窄
    return Math.PI * radius ** 2;
  }
  // ...
}
```

#### TC39 Pattern Matching 提案

```javascript
// TC39 Stage 1 提案（未来标准）
const result = match(shape) {
  when { kind: 'circle', radius }: Math.PI * radius ** 2,
  when { kind: 'square', size }: size ** 2,
  when { kind: 'rectangle', width, height }: width * height,
};
```

### 5.2 自实现模式匹配工具

```typescript
type Match<T, Cases extends Record<string, (x: any) => any>> = {
  [K in keyof Cases]: Cases[K] extends (x: infer V) => any
    ? V extends { kind: K }
      ? ReturnType<Cases[K]>
      : never
    : never
}[keyof Cases];

function matchShape<T extends Shape, R>(
  s: T,
  cases: {
    circle: (s: Extract<T, { kind: 'circle' }>) => R;
    square: (s: Extract<T, { kind: 'square' }>) => R;
    rectangle: (s: Extract<T, { kind: 'rectangle' }>) => R;
  }
): R {
  switch (s.kind) {
    case 'circle':    return cases.circle(s);
    case 'square':    return cases.square(s);
    case 'rectangle': return cases.rectangle(s);
  }
}

// 使用
const area = matchShape(shape, {
  circle: (s) => Math.PI * s.radius ** 2,
  square: (s) => s.size ** 2,
  rectangle: (s) => s.width * s.height,
});
```

### 5.3 ts-pattern 库

`ts-pattern` 是 TypeScript 社区流行的模式匹配库，提供接近 Haskell/Rust 的体验：

```typescript
import { match, P } from 'ts-pattern';

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'rectangle'; width: number; height: number };

const area = (shape: Shape): number =>
  match(shape)
    .with({ kind: 'circle' }, (s) => Math.PI * s.radius ** 2)
    .with({ kind: 'square' }, (s) => s.size ** 2)
    .with({ kind: 'rectangle' }, (s) => s.width * s.height)
    .exhaustive();  // 强制穷尽性检查
```

特点：

- `.with(pattern, handler)` 链式 API；
- `.exhaustive()` 强制穷尽性；
- `.otherwise(handler)` 提供默认分支；
- 支持 `P.string`、`P.number`、`P.array`、`P.when(predicate)` 等通配模式。

## 6. 与其他语言对比

### 6.1 Haskell 的代数数据类型

```haskell
data Shape
  = Circle { radius :: Double }
  | Square { size :: Double }
  | Rectangle { width :: Double, height :: Double }

area :: Shape -> Double
area shape = case shape of
  Circle r      -> pi * r ** 2
  Square s      -> s ** 2
  Rectangle w h -> w * h
```

特点：

- `data` 关键字定义 ADT，构造子前缀自动成为 tag；
- `case ... of` 是模式匹配，编译器强制穷尽性检查；
- 类型推断基于 Hindley-Milner，无需类型注解。

对比 TypeScript：

| 维度 | Haskell | TypeScript |
| ---- | ------- | ---------- |
| ADT 定义 | `data` 关键字 | 联合类型 + 字面量字段 |
| 模式匹配 | `case ... of` | `switch` / `if` + CFA |
| 穷尽性 | 编译器强制 | 手动 `assertNever` |
| 类型推断 | Hindley-Milner | 局部推断 |
| 嵌套模式 | 支持 | 不支持 |

### 6.2 Rust 的 enum

Rust 的 enum 是和类型，支持模式匹配：

```rust
enum Shape {
    Circle { radius: f64 },
    Square { size: f64 },
    Rectangle { width: f64, height: f64 },
}

fn area(s: &Shape) -> f64 {
    match s {
        Shape::Circle { radius } => std::f64::consts::PI * radius.powi(2),
        Shape::Square { size } => size.powi(2),
        Shape::Rectangle { width, height } => width * height,
    }
}
```

特点：

- enum 是真正的和类型，构造子是类型的一部分；
- `match` 强制穷尽性检查，未覆盖分支编译失败；
- 支持嵌套模式与 guard 子句。

对比 TypeScript：

| 维度 | Rust | TypeScript |
| ---- | ---- | ---------- |
| ADT 定义 | `enum` 关键字 | 联合类型 |
| 穷尽性 | 编译器强制 | 手动 assertNever |
| 模式匹配 | `match` 表达式 | switch 语句 |
| 嵌套模式 | 支持 | 不支持 |
| Guard 子句 | `if` 子句 | 外层 if |

### 6.3 Scala 3 的 enum 与 union types

Scala 3 引入新的 enum 语法：

```scala
enum Shape:
  case Circle(radius: Double)
  case Square(size: Double)
  case Rectangle(width: Double, height: Double)

def area(s: Shape): Double = s match
  case Shape.Circle(r)      => math.Pi * r * r
  case Shape.Square(s)      => s * s
  case Shape.Rectangle(w, h) => w * h
```

特点：

- enum 既是类型也是值；
- `match` 强制穷尽性；
- 支持 union types（`A | B`）；
- 与 GADT（Generalized Algebraic Data Types）兼容。

### 6.4 OCaml 的 variant type

```ocaml
type shape =
  | Circle of float
  | Square of float
  | Rectangle of float * float

let area = function
  | Circle r -> 3.14159 *. r *. r
  | Square s -> s *. s
  | Rectangle (w, h) -> w *. h
```

OCaml 的 variant 是 ADT 的标准实现，`function` 关键字直接做模式匹配。

### 6.5 Python 的 Literal 类型

Python 3.8+ 通过 `typing.Literal` 提供字面量类型：

```python
from typing import Literal, Union

Direction = Literal['left', 'right', 'up', 'down']

def move(d: Direction) -> None:
    print(f"Moving {d}")
```

特点：

- 类型注解，运行时不强制；
- 与 mypy / pyright 配合做静态检查；
- 无穷尽性检查机制。

### 6.6 对比总结

| 语言 | 字面量类型 | 联合类型 | 可辨识联合 | 穷尽性检查 | 模式匹配 |
| ---- | ---------- | -------- | ---------- | ---------- | -------- |
| TypeScript | 是（string/number/bool/bigint） | 是 | 是（kind 字段） | 手动 assertNever | switch/if |
| Haskell | 是 | 是 | 是（data） | 编译器强制 | case ... of |
| Rust | 是 | 是 | 是（enum） | 编译器强制 | match |
| Scala 3 | 是 | 是 | 是（enum） | 编译器强制 | match |
| OCaml | 是 | 是 | 是（variant） | 编译器强制 | function |
| Python | 是（typing.Literal） | 是（typing.Union） | 弱 | 无 | 无 |
| Flow | 是 | 是 | 是 | 手动 | switch/if |

TypeScript 的穷尽性检查是工程化近似，需要开发者主动使用 `assertNever` 模式；Rust/Haskell/Scala 是编译器强制的，更安全。

## 7. 常见陷阱与修复

### 7.1 陷阱 1：对象字面量自动拓宽

```typescript
const config = { mode: 'production' };
// config.mode 类型: string（自动拓宽）

function init(mode: 'production' | 'development'): void {
  // ...
}

init(config.mode);  // Error: string 不能赋值给 'production' | 'development'
```

**修复**：用 `as const` 保留字面量类型：

```typescript
const config = { mode: 'production' } as const;
// config.mode 类型: 'production'

init(config.mode);  // OK
```

### 7.2 陷阱 2：联合类型不收窄

```typescript
type Square = { size: number };
type Circle = { radius: number };

function area(s: Square | Circle): number {
  if ('size' in s) {
    return s.size ** 2;  // OK，TypeScript 通过 in 收窄
  }
  return Math.PI * s.radius ** 2;
}
```

但若两个分支都有同名字段，in 无法收窄：

```typescript
type A = { x: number; y: number };
type B = { x: number; z: number };

function f(s: A | B): number {
  if ('y' in s) {
    return s.y;  // OK，s: A
  }
  return s.z;  // OK，s: B
}
```

**陷阱**：若两个类型结构相同（duck typing），in 无法区分。此时必须用判别字段：

```typescript
type A = { kind: 'a'; x: number };
type B = { kind: 'b'; x: number };

function f(s: A | B): void {
  if (s.kind === 'a') {
    // s: A
  } else {
    // s: B
  }
}
```

### 7.3 陷阱 3：switch 缺少 default 与穷尽性

```typescript
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':    return Math.PI * s.radius ** 2;
    case 'square':    return s.size ** 2;
    case 'rectangle': return s.width * s.height;
  }
  // 缺 default，新增 triangle 分支时返回 undefined
}
```

**修复**：用 assertNever：

```typescript
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':    return Math.PI * s.radius ** 2;
    case 'square':    return s.size ** 2;
    case 'rectangle': return s.width * s.height;
    default:          return assertNever(s);
  }
}
```

### 7.4 陷阱 4：类型谓词返回错误

```typescript
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

// 错误：谓词与实现不符
function isNumber(x: unknown): x is number {
  return typeof x === 'string';  // 实现 bug
}
```

TypeScript 不会校验类型谓词的实现，开发者必须保证一致性。可通过测试覆盖。

### 7.5 陷阱 5：交叉类型 + 联合类型不收窄

```typescript
type A = { kind: 'a'; x: number };
type B = { kind: 'b'; y: string };
type Combined = A & B;  // { kind: 'a'; x: number } & { kind: 'b'; y: string }
// kind 字段冲突，Combined.kind: never，Combined 实际为不可达类型
```

**修复**：避免在交叉类型中对同名字段使用不同字面量类型。

### 7.6 陷阱 6：穷尽性检查在 if-else 链中失效

```typescript
function area(s: Shape): number {
  if (s.kind === 'circle') return Math.PI * s.radius ** 2;
  if (s.kind === 'square') return s.size ** 2;
  // 缺 else，TypeScript 不强制穷尽性
  return 0;  // 静默返回错误值
}
```

**修复**：在最后一个 else 中调用 assertNever：

```typescript
function area(s: Shape): number {
  if (s.kind === 'circle') return Math.PI * s.radius ** 2;
  if (s.kind === 'square') return s.size ** 2;
  if (s.kind === 'rectangle') return s.width * s.height;
  return assertNever(s);  // 强制穷尽性
}
```

### 7.7 陷阱 7：联合类型与可辨识联合的运行时性能

```typescript
// 大规模可辨识联合
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown'; key: string }
  | { type: 'scroll'; scrollTop: number }
  | ... // 50+ 分支

function handle(e: Event): void {
  switch (e.type) {
    case 'click': /* ... */ break;
    // ...
  }
}
```

V8 中 switch 字符串匹配是 hash table，性能接近 O(1)；但分支过多会让代码体积膨胀，影响 JIT 优化。建议超过 20 个分支时拆分为多个 handler 函数。

## 8. 工程实践

### 8.1 状态机建模

```typescript
type OrderState =
  | { status: 'pending'; createdAt: Date }
  | { status: 'paid'; paidAt: Date; transactionId: string }
  | { status: 'shipped'; shippedAt: Date; trackingNumber: string }
  | { status: 'delivered'; deliveredAt: Date }
  | { status: 'cancelled'; cancelledAt: Date; reason: string };

type OrderEvent =
  | { type: 'pay'; transactionId: string }
  | { type: 'ship'; trackingNumber: string }
  | { type: 'deliver' }
  | { type: 'cancel'; reason: string };

function assertNever(x: never): never {
  throw new Error(`Unexpected: ${JSON.stringify(x)}`);
}

function transition(state: OrderState, event: OrderEvent): OrderState {
  switch (state.status) {
    case 'pending':
      switch (event.type) {
        case 'pay':      return { status: 'paid', paidAt: new Date(), transactionId: event.transactionId };
        case 'cancel':   return { status: 'cancelled', cancelledAt: new Date(), reason: event.reason };
        case 'ship':
        case 'deliver':
          throw new Error(`Cannot ${event.type} from pending`);
        default:         return assertNever(event);
      }

    case 'paid':
      switch (event.type) {
        case 'ship':     return { status: 'shipped', shippedAt: new Date(), trackingNumber: event.trackingNumber };
        case 'cancel':   return { status: 'cancelled', cancelledAt: new Date(), reason: event.reason };
        case 'pay':
        case 'deliver':
          throw new Error(`Cannot ${event.type} from paid`);
        default:         return assertNever(event);
      }

    case 'shipped':
      switch (event.type) {
        case 'deliver':  return { status: 'delivered', deliveredAt: new Date() };
        case 'pay':
        case 'ship':
        case 'cancel':
          throw new Error(`Cannot ${event.type} from shipped`);
        default:         return assertNever(event);
      }

    case 'delivered':
    case 'cancelled':
      throw new Error(`Cannot ${event.type} from ${state.status}`);

    default:
      return assertNever(state);
  }
}
```

特点：

- 状态转换合法性在编译期保证；
- 新增状态或事件时，所有未处理的 transition 自动报错；
- 双重穷尽性检查（state + event）。

### 8.2 AST 节点建模

```typescript
type ASTNode =
  | { type: 'NumberLiteral'; value: number }
  | { type: 'StringLiteral'; value: string }
  | { type: 'Identifier'; name: string }
  | { type: 'BinaryOp'; operator: '+' | '-' | '*' | '/'; left: ASTNode; right: ASTNode }
  | { type: 'FunctionCall'; callee: ASTNode; args: ASTNode[] }
  | { type: 'IfStatement'; test: ASTNode; consequent: ASTNode; alternate: ASTNode | null };

function evaluate(node: ASTNode, env: Map<string, unknown>): unknown {
  switch (node.type) {
    case 'NumberLiteral':  return node.value;
    case 'StringLiteral':  return node.value;
    case 'Identifier':     return env.get(node.name);
    case 'BinaryOp':
      const l = evaluate(node.left, env) as number;
      const r = evaluate(node.right, env) as number;
      switch (node.operator) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
      }
      return assertNever(node.operator);
    case 'FunctionCall':
      // ...
      return undefined;
    case 'IfStatement':
      return evaluate(node.test, env)
        ? evaluate(node.consequent, env)
        : node.alternate ? evaluate(node.alternate, env) : undefined;
    default:
      return assertNever(node);
  }
}
```

### 8.3 API 响应建模

```typescript
type ApiResponse<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
  | { status: 'refetching'; data: T };

function render<T>(response: ApiResponse<T>): string {
  switch (response.status) {
    case 'loading':    return 'Loading...';
    case 'success':    return `Data: ${JSON.stringify(response.data)}`;
    case 'error':      return `Error: ${response.error}`;
    case 'refetching': return `Refreshing: ${JSON.stringify(response.data)}`;
    default:           return assertNever(response);
  }
}
```

### 8.4 React 中的可辨识联合

```tsx
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function useAsync<T>(fn: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });

  useEffect(() => {
    setState({ status: 'loading' });
    fn()
      .then((data) => setState({ status: 'success', data }))
      .catch((error) => setState({ status: 'error', error }));
  }, []);

  return state;
}

function UserProfile({ userId }: { userId: string }) {
  const state = useAsync(() => fetchUser(userId));

  switch (state.status) {
    case 'idle':       return <div>Click to load</div>;
    case 'loading':    return <div>Loading...</div>;
    case 'success':    return <div>{state.data.name}</div>;
    case 'error':      return <div>Error: {state.error.message}</div>;
    default:           return assertNever(state);
  }
}
```

### 8.5 zod 运行时校验

zod 提供 schema 驱动的运行时校验，与 TypeScript 类型对齐：

```typescript
import { z } from 'zod';

const ShapeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('circle'), radius: z.number() }),
  z.object({ kind: z.literal('square'), size: z.number() }),
  z.object({ kind: z.literal('rectangle'), width: z.number(), height: z.number() }),
]);

type Shape = z.infer<typeof ShapeSchema>;

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':    return Math.PI * s.radius ** 2;
    case 'square':    return s.size ** 2;
    case 'rectangle': return s.width * s.height;
    default:          return assertNever(s);
  }
}

// 运行时校验
const input = JSON.parse('{"kind":"circle","radius":5}');
const shape: Shape = ShapeSchema.parse(input);  // 类型安全 + 运行时校验
console.log(area(shape));
```

### 8.6 effect / Schema 库

Effect-Ts 的 Schema 是 zod 的替代，更注重性能与组合：

```typescript
import { Schema } from 'effect';

const ShapeSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal('circle'), radius: Schema.Number }),
  Schema.Struct({ kind: Schema.Literal('square'), size: Schema.Number }),
  Schema.Struct({ kind: Schema.Literal('rectangle'), width: Schema.Number, height: Schema.Number }),
);

type Shape = Schema.Schema.Type<typeof ShapeSchema>;

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':    return Math.PI * s.radius ** 2;
    case 'square':    return s.size ** 2;
    case 'rectangle': return s.width * s.height;
  }
}
```

## 9. 高级主题

### 9.1 类型层穷尽性证明

```typescript
type AssertExhaustive<T extends never> = T;

function assertNeverExhaustive<T extends never>(x: T): never {
  throw new Error(`Unexpected: ${JSON.stringify(x)}`);
}

// 编译期证明：所有分支都被处理
type AllKindsHandled<S extends Shape, K extends S['kind']> =
  K extends 'circle' | 'square' | 'rectangle' ? true : false;
```

### 9.2 递归可辨识联合

```typescript
type JSONValue =
  | null
  | boolean
  | number
  | string
  | JSONValue[]
  | { [key: string]: JSONValue };

function stringify(value: JSONValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stringify).join(',')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}:${stringify(v)}`).join(',')}}`;
}
```

### 9.3 GADT 风格（Generalized ADT）

TypeScript 不能直接表达 GADT，但可近似：

```typescript
type Expr<T>
  = T extends number ? { type: 'num'; value: number }
  : T extends string ? { type: 'str'; value: string }
  : T extends boolean ? { type: 'bool'; value: boolean }
  : never;

function evaluate<T>(e: Expr<T>): T {
  return e.value;
}

const numExpr: Expr<number> = { type: 'num', value: 42 };
const result: number = evaluate(numExpr);  // 42
```

### 9.4 模板字面量类型与联合

```typescript
type EventName = 'click' | 'hover' | 'focus';
type Handler<T extends string> = `on${Capitalize<T>}`;
type Handlers = Handler<EventName>;
// 'onClick' | 'onHover' | 'onFocus'

type ApiEndpoint = `/api/${'users' | 'posts' | 'comments'}/${string}`;
// '/api/users/...' | '/api/posts/...' | '/api/comments/...'
```

### 9.5 类型层的等价性证明

```typescript
type IsSameType<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

type T1 = IsSameType<'a' | 'b', 'b' | 'a'>;  // true（交换律）
type T2 = IsSameType<'a' | 'a', 'a'>;          // true（幂等律）
type T3 = IsSameType<'a' | never, 'a'>;        // true（吸收律）
```

## 10. 测试与验证

### 10.1 类型层测试（tsd）

```typescript
import { expectType, expectError } from 'tsd';

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number };

// 类型谓词测试
function isCircle(s: Shape): s is Extract<Shape, { kind: 'circle' }> {
  return s.kind === 'circle';
}

const s: Shape = { kind: 'circle', radius: 5 };
if (isCircle(s)) {
  expectType<number>(s.radius);
}

// 错误用例
expectError(() => {
  const wrong: Shape = { kind: 'circle' };  // 缺少 radius
});

expectError(() => {
  const wrong: Shape = { kind: 'triangle', side: 1 };  // kind 不在联合中
});
```

### 10.2 运行时测试

```typescript
import { describe, it, expect } from 'vitest';

describe('Shape area', () => {
  it('should compute circle area', () => {
    const s: Shape = { kind: 'circle', radius: 5 };
    expect(area(s)).toBeCloseTo(Math.PI * 25, 5);
  });

  it('should throw on unexpected kind', () => {
    const invalid = { kind: 'hexagon', side: 1 } as unknown as Shape;
    expect(() => area(invalid)).toThrow();
  });
});
```

## 11. 设计决策记录

### 11.1 为什么 TypeScript 不强制穷尽性检查

TypeScript 团队在多个 issue（#5803、#9412、#26533）中讨论过强制穷尽性，结论是不强制：

1. **JavaScript 兼容性**：JS 代码大量使用 switch without default，强制报错会破坏迁移。
2. **渐进式类型**：TypeScript 设计目标之一是渐进式类型化，强制穷尽性会阻碍未完全类型化的代码。
3. **可选 assertNever**：通过 `assertNever` 模式让需要的项目自行启用。

### 11.2 字面量类型 vs enum

```typescript
// enum
enum Status { Pending, Paid, Shipped }

// 字面量联合
type Status = 'pending' | 'paid' | 'shipped';
```

| 维度 | enum | 字面量联合 |
| ---- | ---- | ---------- |
| 运行时 | 生成对象 | 无运行时代码 |
| Tree-shaking | 不友好 | 友好 |
| 序号隐含 | 是（0, 1, 2...） | 否 |
| 字符串值 | 需显式 `enum Status { Pending = 'pending' }` | 自然 |
| 反向映射 | 支持（Status[0] === 'Pending'） | 不支持 |
| 跨文件合并 | 支持（declaration merging） | 通过类型增强 |

现代 TypeScript 项目倾向用字面量联合 + `as const` 对象替代 enum。

### 11.3 选择判别字段名

约定俗成的判别字段名：

- `kind`：TypeScript 官方文档示例；
- `type`：Redux action、AST 节点；
- `status`：状态机；
- `tag`：ML 风格的 tagged union。

选择建议：与项目已有约定一致；同一项目内统一一个字段名。

## 12. 参考资料

### 12.1 类型论经典

1. Pierce, B. C. (2002). *Types and Programming Languages*. MIT Press. ISBN: 978-0-262-16209-8
2. Pierce, B. C. & Turner, D. N. (2000). *Local Type Inference*. ACM TOPLAS, 22(1), 1-44. DOI: 10.1145/345099.345100
3. Dunfield, J. & Krishnaswami, N. (2021). *Bidirectional Typing*. ACM Computing Surveys, 54(5), 1-38. DOI: 10.1145/3450952

### 12.2 Refinement Types 与 Dependent Types

4. Freeman, T. & Pfenning, F. (1991). *Refinement Types for ML*. PLDI 1991, 268-277. DOI: 10.1145/113445.113468
5. Xi, H. & Pfenning, F. (1998). *Eliminating Array Bound Checking Through Dependent Types*. PLDI 1998, 249-257. DOI: 10.1145/277650.277732

### 12.3 TypeScript 形式化

6. Bierman, G. M., Abadi, M., & Torgersen, M. (2014). *Understanding TypeScript*. ECOOP 2014, 257-281. DOI: 10.1007/978-3-662-44202-9_11

### 12.4 控制流分析与 SSA

7. Appel, A. W. (1998). *SSA is Functional Programming*. ACM SIGPLAN Notices, 33(4), 17-20. DOI: 10.1145/278283.278285

### 12.5 模式匹配编译

8. Maranget, L. (2007). *Compiling Pattern Matching to Good Decision Trees*. ML 2007, 35-46. DOI: 10.1145/1292535.1292540

### 12.6 DSL 与 Polymorphic Embedding

9. Hofer, C., Ostermann, K., Rendel, T., & Moors, A. (2008). *Polymorphic Embedding of DSLs*. GPCE 2008, 137-148. DOI: 10.1145/1449913.1449935

### 12.7 官方文档

10. Microsoft. (2024). *TypeScript Handbook: Narrowing*. https://www.typescriptlang.org/docs/handbook/2/narrowing.html
11. Microsoft. (2024). *TypeScript Handbook: Everyday Types*. https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
12. Microsoft. (2018). *TypeScript 2.0 Release Notes: Tagged Unions*. https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html
13. Microsoft. (2021). *TypeScript 4.5 Release Notes: Tail-Recursion Elimination*. https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html

### 12.8 设计模式

14. Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns*. Addison-Wesley. DOI: 10.5555/186897

## 13. 延伸阅读

### 13.1 书籍

- Pierce, B. C. *Types and Programming Languages*（第 11 章 Subtyping、第 15 章 Subtyping Algorithm）
- Appel, A. W. *Modern Compiler Implementation in ML*（控制流分析章节）
- Maranget, L. *Compiling Pattern Matching to Good Decision Trees*

### 13.2 论文

- Xi, H. & Pfenning, F. (1998). *Eliminating Array Bound Checking Through Dependent Types*
- Freeman, T. & Pfenning, F. (1991). *Refinement Types for ML*
- Bierman, G. M. et al. (2014). *Understanding TypeScript*

### 13.3 开源项目

- [ts-pattern](https://github.com/gvergnaud/ts-pattern)：TypeScript 模式匹配库
- [zod](https://github.com/colinhacks/zod)：运行时 schema 校验
- [effect](https://github.com/effect-ts/effect)：Schema 驱动的 TypeScript 框架
- [type-fest](https://github.com/sindresorhus/type-fest)：TypeScript 工具类型集合

### 13.4 在线资源

- TypeScript Handbook: [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- TypeScript Handbook: [Type Aliases](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases)
- Basarat's TypeScript Guide: [Discriminated Unions](https://basarat.gitbook.io/typescript/type-system/discriminated-unions)
- TC39 Pattern Matching Proposal: [GitHub](https://github.com/tc39/proposal-pattern-matching)

### 13.5 视频课程

- MIT 6.5810: Software Construction - [Type Systems](https://ocw.mit.edu/)
- Stanford CS143: Compilers - [Type Checking](https://web.stanford.edu/class/cs143/)
- Cornell CS 3110: Data Structures and Functional Programming - [Algebraic Data Types](https://cs3110.github.io/textbook/)
- University of Washington CSE 505: Programming Languages - [Sum Types and Pattern Matching](https://courses.cs.washington.edu/courses/cse505/)

## 14. 总结

字面量类型与联合类型是 TypeScript 类型系统的核心构造块。本模块从类型论与工程实践两个维度系统讲解了：

1. **类型论基础**：singleton types、sum types、ADT 的形式化定义与代数性质（吸收律、分配律、结合律、幂等律）。
2. **TypeScript 实现**：字符串/数字/布尔/BigInt 字面量类型、模板字面量类型、const 断言、联合类型、可辨识联合。
3. **类型收窄**：typeof / instanceof / in / 判别字段 / 用户定义类型谓词 / truthy / 等值收窄的语义规则与限制。
4. **穷尽性检查**：never 类型、assertNever 模式、TypeScript vs Rust/Haskell/Scala/OCaml 的对比。
5. **工程实践**：状态机建模、AST 节点、API 响应、React 异步状态、zod/effect 运行时校验。
6. **高级主题**：递归可辨识联合、GADT 风格、模板字面量与联合、类型层等价性证明。
7. **常见陷阱**：对象字面量自动拓宽、in 操作符失效、switch 缺 default、类型谓词返回错误、交叉类型冲突等七大陷阱。

核心设计原则：

- **优先用字面量联合替代 enum**：tree-shaking 友好、无运行时代码；
- **可辨识联合优先用 kind 字段**：TypeScript 收窄最精确；
- **所有 switch 必须配 assertNever**：保证新增分支时编译期报错；
- **跨 realm 场景避免 instanceof**：用类型谓词封装可替换的检测逻辑；
- **运行时校验用 zod/effect**：与编译时类型对齐，防止 schema 漂移。

掌握字面量类型与联合类型的设计与实现，是构建类型安全 TypeScript 应用的关键基础。后续模块将基于这一基础设施，探讨更高级的类型体操、模式匹配与领域建模技术。
