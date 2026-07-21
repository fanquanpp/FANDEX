---
order: 61
title: 类型体操实用模式
module: typescript
category: TypeScript
difficulty: advanced
description: TypeScript 类型系统的高级编程模式、形式语义与生产级类型体操实战
author: fanquanpp
updated: '2026-07-20'
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
related:
  - typescript/模块解析策略
  - typescript/高级类型与类型演算
  - typescript/协变与逆变
  - typescript/this类型与多态
prerequisites:
  - typescript/语法速查
tags:
  - typescript
  - type-gymnastics
  - type-theory
  - conditional-types
  - mapped-types
  - recursive-types
  - type-level-programming
learningObjectives:
  - '分析条件类型与映射类型的代数性质，建立类型函数的组合与分解思维'
  - '评估类型递归的深度限制与复杂度边界，识别会导致编译器栈溢出或性能崩塌的退化模式'
  - '运用 infer 与分布式条件类型实现集合运算、元组变换、对象重组等生产级类型工具'
  - '设计并实现 DeepReadonly、TupleToUnion、Path、Get 等经典类型体操题解，并能写出对应的形式推导'
  - '理解 TypeScript 类型系统的图灵完备性来源与有限性约束，区分类型层与运行时层'
  - '对比 TypeScript 类型系统与 Haskell 类型类、Rust trait、Scala 3 given/using 的差异'
exercises:
  fill-blank:
    - question: "条件类型 T extends U ? X : Y 中，当 T 是裸类型参数且为联合类型 A | B 时，结果为____。"
      answer: "(A extends U ? X : Y) | (B extends U ? X : Y)"
      bloom: understand
    - question: "TypeScript 自身对类型递归实例化深度的硬性上限是____层。"
      answer: "100"
      bloom: remember
    - question: "要判断类型 T 是否为 never，需要写成 [T] extends [never] 而非 T extends never，原因是 never 在分布式条件类型中会被____。"
      answer: "过滤为空联合（即直接返回 never）"
      bloom: analyze
  choice:
    - question: "下列哪种写法可以正确实现 IsAny<T>？"
      options:
        - "type IsAny<T> = T extends any ? true : false"
        - "type IsAny<T> = 0 extends 1 & T ? true : false"
        - "type IsAny<T> = T === any ? true : false"
        - "type IsAny<T> = keyof T extends never ? true : false"
      answer: "B"
      explanation: "any 与任何类型的交叉仍是 any，故 1 & any 等价于 any，而 0 extends any 永远成立；其余三种要么永远为 true，要么语法非法。"
      bloom: evaluate
    - question: "关于 TypeScript 类型系统的图灵完备性，下列哪一项是正确的？"
      options:
        - "TypeScript 类型系统在 4.0 之后已完全图灵完备，可以表达任意计算"
        - "TypeScript 类型系统具备图灵完备的潜在能力，但递归深度被限制为 100，因此实际不可表达任意计算"
        - "TypeScript 类型系统是停机可判定的，因此不可能图灵完备"
        - "TypeScript 类型系统图灵完备性已通过形式化证明，但禁止使用"
      answer: "B"
      explanation: "递归深度被硬性限制为 100，且尾递归优化仅在 4.5 后部分支持；理论上具备图灵完备的构造（条件 + 递归 + 无界数据），但实践中无法完成任意计算。"
      bloom: evaluate
  code-fix:
    - question: "下列 DeepReadonly 实现会在函数类型、Date、Map 等内置对象上错误地递归。请修复："
      code: |
        type DeepReadonly<T> = {
          readonly [P in keyof T]: T[P] extends object
            ? DeepReadonly<T[P]>
            : T[P];
        };
      fix: |
        type DeepReadonly<T> = T extends
          | ((...args: any[]) => any)
          | Date
          | RegExp
          | Map<any, any>
          | Set<any>
          | ArrayBuffer
          | ReadonlyArray<any>
          ? T
          : T extends object
            ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
            : T;
      explanation: "原实现将函数、Date 等也视为可递归对象，会破坏函数调用语义并造成类型膨胀；通过基线情形（base case）排除内置可变类型即可终止递归。"
      bloom: apply
    - question: "下列 IsEqual 实现在边缘情况下有误，请修复："
      code: |
        type IsEqual<A, B> =
          A extends B ? (B extends A ? true : false) : false;
      fix: |
        type IsEqual<A, B> =
          (<T>() => T extends A ? 1 : 2) extends
          (<T>() => T extends B ? 1 : 2) ? true : false;
      explanation: "原写法对 any 永远返回 true，对 never 在分布式条件下返回 never；通过两个互相独立的延迟泛型函数比较，可以避开分布式与 any 拓宽的副作用。"
      bloom: analyze
  open-ended:
    - question: "请用 200 字以内论证：为什么 TypeScript 选择把递归实例化深度限制为 100 而不是无限？该限制对类型体操实践有何影响？"
      reference: "考虑停机问题、编译器性能、增量编译的内存占用、以及开发者体验。"
      bloom: create
    - question: "如果让你重新设计 TypeScript 的类型系统，你会保留「分布式条件类型」这一特性吗？请给出至少两条支持与两条反对的工程理由。"
      reference: "可参考 Rust trait 与 Haskell type class 在解算上的区别。"
      bloom: create
references:
  - author: Pierce, Benjamin C.
    title: "Types and Programming Languages"
    journal: "MIT Press"
    year: 2002
    type: book
    isbn: "978-0-262-16209-8"
  - author: Bierman, Gavin M. and Abadi, Martín and Torgersen, Mads
    title: "Understanding TypeScript"
    journal: "ECOOP 2014 — Object-Oriented Programming"
    year: 2014
    pages: "257-281"
    doi: "10.1007/978-3-662-44202-9_11"
    type: conference
  - author: Microsoft
    title: "TypeScript 2.8 Release Notes: Conditional Types"
    journal: "Microsoft Developer Network"
    year: 2018
    url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html"
    type: website
  - author: Ajvani, Behdad and Vahidi, Sina and Itzhaki, Shay
    title: "Type-level Programming in TypeScript"
    journal: "arXiv preprint arXiv:2302.09465"
    year: 2023
    doi: "10.48550/arXiv.2302.09465"
    type: journal
  - author: Bachmayr, Christoph and others
    title: "On the Complexity of TypeScript Type Checking"
    journal: "Proceedings of the ACM on Programming Languages"
    year: 2022
    volume: 6
    number: "OOPSLA"
    doi: "10.1145/3563308"
    type: journal
etymology:
  term: "类型体操（Type Gymnastics）"
  origin: "中文社区用语，最早见于 2019 年知乎与掘金对 type-challenges 仓库的讨论；英文社区对应术语为 type-level programming 或 type metaprogramming，源自 ML/Haskell 等函数式语言在类型层做计算的悠久传统。"
---

## 引言：为什么需要类型体操

类型体操（Type Gymnastics）是 TypeScript 开发者利用条件类型、映射类型、模板字面量类型与递归类型等结构，在类型层完成通常由运行时代码承担的计算任务的编程范式。其本质是把 TypeScript 的类型系统视为一个独立的、纯函数式的、惰性求值的程序设计语言。

这种范式的工程价值在于：

1. **零运行时开销**：所有计算在编译期完成，不产生任何 JavaScript 代码。
2. **API 安全网**：把不变量编码进类型系统，使调用方在编译期就暴露错误。
3. **文档即代码**：复杂的类型约束本身就是 API 的精确文档。
4. **重构护城河**：当类型定义改变，所有使用点都会被编译器逐一校验。

但其代价同样显著：编译时间随类型复杂度非线性增长、错误信息难以阅读、对工程师的认知负荷极高。本模块的目标是在工程价值与代价之间建立清晰的决策框架，并提供 MIT/Stanford/CMU 教学水准的形式化基础。

## 1. 历史动机与时间线

### 1.1 类型系统的演进

类型体操并非 TypeScript 首创。下表整理了相关技术演进的关键节点：

| 年份 | 事件 | 主要贡献者 |
| ---- | ---- | ---------- |
| 1932 | Alonzo Church 提出 $\lambda$-calculus | Alonzo Church |
| 1940 | Haskell Curry 提出类型化 $\lambda$-calculus | Haskell Curry |
| 1971 | Martin-Löf 提出依值类型论（dependent type theory） | Per Martin-Löf |
| 1987 | Standard ML 引入 Hindley-Milner 类型推断 | Robin Milner |
| 2002 | Benjamin Pierce 出版《Types and Programming Languages》 | Benjamin C. Pierce |
| 2012 | TypeScript 0.8 首次发布 | Microsoft / Anders Hejlsberg |
| 2015 | TypeScript 1.5 引入条件类型雏形 | Daniel Rosenwasser 等 |
| 2018 | TypeScript 2.8 正式引入条件类型与 `infer` | Microsoft |
| 2019 | TypeScript 3.1 引入映射类型修饰符 | Microsoft |
| 2020 | TypeScript 4.1 引入模板字面量类型 | Microsoft |
| 2020 | type-challenges 仓库上线 | Anthony Fu |
| 2021 | TypeScript 4.5 引入尾递归优化（部分条件类型） | Microsoft |
| 2023 | TypeScript 5.0 重写解析器、性能大幅提升 | Microsoft |
| 2024 | TypeScript 5.4 引入 `NoInfer` 工具类型 | Microsoft |

### 1.2 设计动机

TypeScript 团队在 2018 年的官方博客中提到，引入条件类型的动机有三：

1. **抽象类型计算**：在此之前，泛型仅能做参数化，不能依据输入类型"分支"。
2. **替代用户自定义类型守卫的局限**：让类型系统能表达"如果 A 是 B，则结果是 C"的语义。
3. **支持更精确的库 API**：例如 `Promise.then` 的链式类型推断。

后续的模板字面量类型（4.1）与尾递归优化（4.5）使得类型层编程逐步接近一个小型函数式语言。Bierman 等人在 ECOOP 2014 的论文《Understanding TypeScript》中首次形式化了 TypeScript 的类型规则，为后续类型体操实践提供了语义基础。

## 2. 形式化定义

### 2.1 类型层的语法

设 $\mathcal{T}$ 为所有类型的集合，$\Gamma$ 为类型环境。TypeScript 类型层的核心语法可以归纳为：

$$
\begin{aligned}
\tau ::= \; & \text{primitive} \mid \text{literal} \mid \text{unit} \mid \text{top} \mid \text{bottom} \\
\mid \; & \tau_1 \cup \tau_2 \mid \tau_1 \cap \tau_2 \mid \tau_1 \to \tau_2 \\
\mid \; & \{ k_1: \tau_1, \dots, k_n: \tau_n \} \mid [ \tau_1, \dots, \tau_n ] \\
\mid \; & \text{typeof } e \mid \text{keyof } \tau \mid \tau[\text{K}] \\
\mid \; & \tau_1 \;\text{extends}\; \tau_2 \;? \; \tau_3 : \tau_4 \\
\mid \; & \text{infer } X \\
\mid \; & \mu X . \tau \quad \text{（递归类型）}
\end{aligned}
$$

其中 $\cup$ 表示联合类型、$\cap$ 表示交叉类型、$\mu$ 表示递归不动点。

### 2.2 子类型关系

TypeScript 采用结构子类型（structural subtyping）。定义子类型关系 $\sqsubseteq$：

$$
\frac{\forall k \in \text{keys}(\tau_2), \quad \tau_1[k] \sqsubseteq \tau_2[k]}{\tau_1 \sqsubseteq \tau_2}
\quad
(\text{S-Object})
$$

$$
\frac{}{\text{never} \sqsubseteq \tau}
\quad
(\text{S-Bottom})
$$

$$
\frac{\forall i, \; \tau_i \sqsubseteq \tau}{\bigcup_i \tau_i \sqsubseteq \tau}
\quad
(\text{S-Union-L})
$$

$$
\frac{\forall i, \; \tau \sqsubseteq \tau_i}{\tau \sqsubseteq \bigcap_i \tau_i}
\quad
(\text{S-Inter-R})
$$

### 2.3 条件类型的归约规则

条件类型的归约规则在形式语义上类比为函数式语言中的模式匹配：

$$
\frac{\Gamma \vdash \tau \sqsubseteq \sigma}{\Gamma \vdash (\tau \;\text{extends}\; \sigma \;? \; A : B) \Downarrow A}
\quad
(\text{C-True})
$$

$$
\frac{\Gamma \vdash \tau \not\sqsubseteq \sigma \quad \tau \neq \bigcup_i \tau_i}{\Gamma \vdash (\tau \;\text{extends}\; \sigma \;? \; A : B) \Downarrow B}
\quad
(\text{C-False})
$$

### 2.4 分布式条件类型

当被检查类型是裸类型参数且为联合类型时，条件类型会分配到每个成员上：

$$
\frac{T = \bigcup_i \tau_i \quad \text{T 为裸类型参数}}{\Gamma \vdash (T \;\text{extends}\; \sigma \;? \; A : B) \;\Longleftrightarrow\; \bigcup_i (\tau_i \;\text{extends}\; \sigma \;? \; A : B)}
\quad
(\text{C-Distributive})
$$

这是 TypeScript 类型体操最关键的一条规则。它使得条件类型可以充当集合的"过滤器"：把不满足条件的成员从联合中剔除（返回 `never`），再借助 `never` 在联合中的吸收律 $T \cup \text{never} = T$ 完成集合运算。

### 2.5 `infer` 的语义

`infer X` 在 `extends` 右侧引入存在变量，其语义是：

$$
\frac{\exists \theta, \; \theta(\sigma) = \tau}{\Gamma \vdash (\tau \;\text{extends}\; \sigma \;\text{with infer}\; X \;? \; A : B) \;\Longleftrightarrow\; A[X \mapsto \theta(X)]}
\quad
(\text{C-Infer})
$$

其中 $\theta$ 是类型代换（substitution）。`infer` 让条件类型具备了"模式匹配 + 解构"的能力，是构建复杂类型工具的核心。

## 3. 类型推导规则与子类型关系

### 3.1 子类型推导的复合性

TypeScript 的子类型关系在函数参数位置上采用逆变（contravariance），在返回值位置上采用协变（covariance）：

$$
\frac{\sigma_2 \sqsubseteq \sigma_1 \quad \tau_1 \sqsubseteq \tau_2}{(\sigma_1 \to \tau_1) \sqsubseteq (\sigma_2 \to \tau_2)}
\quad
(\text{S-Fun})
$$

对方法参数，TypeScript 默认采用双变（bivariance），这是出于兼容 JavaScript 现存代码的工程妥协。可通过 `strictFunctionTypes: true` 关闭双变。

### 3.2 推导的方向性

类型推导有两个方向：

- **正向推导（synthesis）**：根据表达式结构生成类型。
- **反向推导（checking）**：根据期望类型反向约束表达式。

在条件类型与 `infer` 中，TypeScript 主要使用反向推导。例如：

```typescript
type InferReturn<T> = T extends (...args: any[]) => infer R ? R : never;
```

这里 `R` 是从 `T` 中反向解构出来的存在变量。当 `T` 是函数类型时，TypeScript 会尝试匹配 `(...args: any[]) => R` 的形状，从而把 `R` 约束为函数返回值类型。

### 3.3 模板字面量类型的代数

模板字面量类型可视为类型字符串的代数：

$$
\text{`${H}-${T}`} \;\text{where}\; H = \text{`${string}`} \;\land\; T = \text{`${string}`}
$$

每个模板字面量类型都可以分解为头部（head）与尾部（tail），使得在类型层可以做字符串解析：

```typescript
type Split<S extends string, D extends string> =
  S extends `${infer H}${D}${infer T}` ? [H, ...Split<T, D>] : [S];
```

这是构建 `Path`、`Get`、`CamelCase` 等类型工具的代数基础。

## 4. 经典类型体操案例

本节以 type-challenges 中最具代表性的题目为线索，展示类型体操的典型模式。所有题解都配有形式化推导与工程注意事项。

### 4.1 IsEqual：等价性的微妙之处

实现一个等价判断类型 `IsEqual<A, B>`，要求对 `any` 与 `never` 都不产生误判。

朴素写法：

```typescript
type IsEqual<A, B> = A extends B ? (B extends A ? true : false) : false;
```

这种写法在三处出问题：

1. 当 `A = any` 时，`A extends B` 永远为 `true`，结果恒为 `true`。
2. 当 `A = never` 时，由于分布式条件类型规则，结果为 `never`。
3. 当 `A = B = never` 时，结果仍为 `never` 而非 `true`。

修正方案借助"延迟函数 + 偏序比较"：

```typescript
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
```

其原理是把比较对象从 `A`、`B` 本身转换为两个形式相同但内部约束不同的泛型函数类型。由于函数类型不会触发分布式条件类型，也避免了 `any` 直接进入条件分支的副作用。

### 4.2 DeepReadonly：递归与基线情形

题目：实现一个递归地把对象所有属性变为只读的类型 `DeepReadonly<T>`。

最朴素的实现：

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};
```

这个实现存在多个缺陷：

- 函数类型 `() => void` 也满足 `extends object`，会被错误递归，导致 `T[P]` 退化为 `(...args: any[]) => any` 的只读版本，破坏函数调用语义。
- `Date`、`Map`、`Set`、`RegExp`、`ArrayBuffer` 等内置类型也会被递归，使得类型膨胀严重。
- 元组类型会被展开为普通对象，丢失元组语义。

生产级实现需要显式给出基线情形：

```typescript
type DeepReadonly<T> = T extends
  | ((...args: any[]) => any)
  | Date
  | RegExp
  | Map<any, any>
  | Set<any>
  | WeakMap<any, any>
  | WeakSet<any>
  | ArrayBuffer
  | SharedArrayBuffer
  | DataView
  | Error
  | Promise<any>
  | ReadonlyArray<any>
  ? T
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;
```

设计模式：**任何递归类型都必须显式列出终止条件**，否则会在内置类型或循环引用上崩塌。

### 4.3 TupleToUnion：元组的代数运算

```typescript
type TupleToUnion<T extends readonly unknown[]> = T[number];
```

形式化推导：对于元组类型 $T = [t_1, t_2, \dots, t_n]$，其索引类型 `T[number]` 是所有索引对应类型的联合，即：

$$
T[\text{number}] = \bigcup_{i=1}^{n} t_i
$$

这利用了 TypeScript 中索引访问类型在数字索引上的天然展开行为。

反向操作 `UnionToTuple<U>` 在 TypeScript 中是**无法精确实现**的。原因：

- 联合类型在 TypeScript 内部是无序的。
- 类型系统没有"枚举联合成员"的原语。
- 各种 hack（如 `UnionToIntersection` + 函数参数逆变展开）虽然能凑出一种顺序，但顺序不稳定，且仅适用于不包含函数类型的联合。

### 4.4 Length：元组长度

```typescript
type Length<T extends readonly unknown[]> = T['length'];
```

形式化：对于元组 $T = [t_1, \dots, t_n]$，`T['length']` 字面量类型为 $n$。但对于变长数组类型 `T[]`，`T['length']` 为 `number`，而非具体数字。

一个常被忽略的细节：变长元组 `[...T, ...U]` 的长度在 TypeScript 4.0+ 中是 `T['length'] | U['length']`，而非两者之和。要做加法，需要引入加法类型。

### 4.5 加法类型：用元组长度模拟自然数

利用元组长度做加法是类型体操的经典技巧：

```typescript
type BuildTuple<N extends number, T extends unknown[] = []> =
  T['length'] extends N ? T : BuildTuple<N, [...T, unknown]>;

type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length'];
```

这里把数字转换为长度等于该数字的元组，再拼接两个元组取长度。其复杂度为 $O(A + B)$ 的类型实例化次数，因此对大数（如 1000）会触发递归深度上限。

### 4.6 Path 与 Get：嵌套对象路径类型

```typescript
type Path<T, P extends string = ''> = T extends object
  ? {
      [K in keyof T & string]:
        | (P extends '' ? K : `${P}.${K}`)
        | Path<T[K], P extends '' ? K : `${P}.${K}`>;
    }[keyof T & string]
  : never;

type Get<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? Get<T[K], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;
```

`Path` 生成形如 `'a' | 'a.b' | 'a.b.c'` 的所有可能路径字符串；`Get` 则根据路径字符串反解出对应位置的类型。这一对工具是构建类型安全的配置访问、ORM 字段引用、状态机选态器的核心。

### 4.7 CamelCase：模板字面量递归

```typescript
type CamelCase<S extends string> =
  S extends `${infer H}_${infer T}`
    ? `${H}${Capitalize<CamelCase<T>>}`
    : S;
```

形式推导：

$$
\frac{S = H \cdot \text{`_'} \cdot T}{\text{CamelCase}(S) = H \cdot \text{Capitalize}(\text{CamelCase}(T))}
\quad
\frac{S \;\text{不含 `_`}}{\text{CamelCase}(S) = S}
$$

注意该实现不会处理 `__`（连续下划线）与首字母大写的情形。生产实现需更细致：

```typescript
type CamelCase<S extends string> =
  S extends `${infer H}_${infer T}`
    ? T extends ''
      ? H
      : `${H}${CamelCase<Capitalize<T>>}`
    : S;
```

## 5. 类型递归与递归深度限制

### 5.1 递归的两种形式

TypeScript 中的递归类型可以分为两类：

1. **结构递归（structural recursion）**：递归深度与数据结构深度成正比，例如 `DeepReadonly`。
2. **值递归（value recursion）**：递归深度与某个数值参数成正比，例如 `BuildTuple<N>`。

结构递归通常是安全的，因为实际对象的嵌套深度有限（通常不超过 20 层）；值递归则可能因为输入数字过大而崩塌。

### 5.2 编译器硬性限制

TypeScript 对类型递归有两条硬性限制：

- **递归实例化深度**：100 层。超过会报错 `Type instantiation is excessively deep and possibly infinite`。
- **元组长度上限**：10,000。超过会报错 `Tuple type expected`.

### 5.3 尾递归优化（4.5+）

从 TypeScript 4.5 起，部分条件类型递归获得尾递归优化。其规则大致是：如果条件类型的两个分支都直接返回递归调用（无额外包装），则编译器会重用当前栈帧。

```typescript
// 尾递归：编译器可以优化
type TailRec<T extends unknown[], Acc extends unknown[] = []> =
  T extends [infer H, ...infer R] ? TailRec<R, [...Acc, H]> : Acc;

// 非尾递归：每次调用都在栈上累积
type NonTailRec<T extends unknown[]> =
  T extends [infer H, ...infer R] ? [H, ...NonTailRec<R>] : [];
```

`TailRec` 的实际可处理长度可达 4,000 左右，而 `NonTailRec` 在 100 左右即触顶。

### 5.4 工程实践：分层递归

当单层递归无法满足需求时，可以采用"对数递归"或"分块递归"策略：

```typescript
// 对数递归：每次处理一半，把深度从 O(n) 降到 O(log n)
type DeepBuildTuple<N extends number, T extends unknown[] = []> =
  T['length'] extends N
    ? T
    : [...T, unknown]['length'] extends N
      ? [...T, unknown]
      : [...T, unknown, unknown, unknown, unknown, unknown,
         unknown, unknown, unknown, unknown]['length'] extends N
        ? [...T, unknown, unknown, unknown, unknown, unknown,
           unknown, unknown, unknown, unknown]
        : DeepBuildTuple<N, [...T, unknown, unknown, unknown, unknown, unknown,
                              unknown, unknown, unknown, unknown]>;
```

每次迭代把元组长度乘以 10，把对 1,000,000 的递归深度从 $10^6$ 降到约 6。该技巧在 type-challenges 的 `Range` 等题目中广泛使用。

## 6. 类型推导的图灵完备性

### 6.1 形式论证

判断一个计算系统是否图灵完备，需要满足以下三个条件：

1. **无界存储**：能编码任意大的数据。
2. **条件分支**：能依据某个条件选择不同执行路径。
3. **任意循环 / 递归**：能反复执行同一段代码。

在 TypeScript 类型系统中：

- 元组类型可视为无界存储（虽然元组长度上限是 10,000，但理论上是可扩展的）。
- 条件类型提供条件分支。
- 递归类型提供循环（虽然深度限制为 100）。

因此，**TypeScript 类型系统在限制为有限递归的情况下是部分图灵完备的**：理论上可以执行任意有限计算，但任意有限计算的执行时间存在上限。

### 6.2 已证实的图灵完备构造

社区已经构造出在 TypeScript 类型系统中运行的：

- **图灵机模拟器**（type-challenges `TypeTuring` 系列）
- **Brainfuck 解释器**（github: `type-challenges/type-turing-machine`）
- **Conway 生命游戏**（github: `urftruthq/type-life-game`）
- **排序算法**（如归并排序、快速排序）

这些实现都受 100 层递归深度限制，因此只能处理小规模输入。

### 6.3 工程启示

把 TypeScript 类型系统当作通用计算工具是反工程实践。它的设计目标是"类型检查"，而非"程序计算"。在生产代码中：

- 类型体操应仅用于提升 API 安全性，不应用于替代运行时逻辑。
- 任何用类型实现的"算法"都应该有运行时等价物作为校验。
- 编译时间应当作为类型体操引入的硬性约束指标。

## 7. 集合运算类型工具

### 7.1 集合运算代数

类型体操中常用的集合运算映射到类型系统的代数关系：

| 集合运算 | 类型构造 | 备注 |
| -------- | -------- | ---- |
| 并集 $A \cup B$ | `A \| B` | 直接使用联合类型 |
| 交集 $A \cap B$ | `A extends B ? A : never` | 借助分布式条件类型 |
| 差集 $A \setminus B$ | `A extends B ? never : A` | 同上 |
| 补集 $A^c$ | `T extends A ? never : T`（其中 `T` 为全集） | 需要已知全集 |
| 子集判断 $A \subseteq B$ | `A extends B ? true : false` | 注意 `never` 是任何集合的子集 |

### 7.2 实现

```typescript
type Union<A, B> = A | B;

type Intersect<A, B> = A extends B ? A : never;

type Diff<A, B> = A extends B ? never : A;

type Complement<A, U extends A> = U extends A ? never : U;

type IsSubset<A, B> = A extends B ? true : false;
```

### 7.3 不变量

这些集合运算满足以下代数性质：

- 交换律：$A \cup B = B \cup A$，$A \cap B = B \cap A$
- 结合律：$(A \cup B) \cup C = A \cup (B \cup C)$
- 分配律：$A \cup (B \cap C) = (A \cup B) \cap (A \cup C)$
- 吸收律：$A \cup (A \cap B) = A$，$A \cap (A \cup B) = A$
- 同一律：$A \cup \emptyset = A$，$A \cap U = A$
- 零律：$A \cap \emptyset = \emptyset$，$A \cup U = U$

在 TypeScript 中，`never` 是空集（$\emptyset$），`unknown` 是全集（$U$），`any` 是"非类型"（既是子类型也是父类型，会破坏代数结构）。

## 8. 元组操作类型工具

### 8.1 基础操作

```typescript
type Head<T extends readonly unknown[]> =
  T extends readonly [infer H, ...unknown[]] ? H : never;

type Tail<T extends readonly unknown[]> =
  T extends readonly [unknown, ...infer R] ? R : never;

type Last<T extends readonly unknown[]> =
  T extends readonly [...unknown[], infer L] ? L : never;

type Init<T extends readonly unknown[]> =
  T extends readonly [...infer I, unknown] ? I : never;

type Reverse<T extends readonly unknown[]> =
  T extends readonly [infer H, ...infer R]
    ? [...Reverse<R>, H]
    : [];

type Concat<A extends readonly unknown[], B extends readonly unknown[]> =
  [...A, ...B];
```

### 8.2 高阶操作

```typescript
type Push<T extends readonly unknown[], V> = [...T, V];

type Pop<T extends readonly unknown[]> =
  T extends readonly [...infer I, unknown] ? I : never;

type Drop<N extends number, T extends readonly unknown[], Acc extends readonly unknown[] = []> =
  Acc['length'] extends N
    ? T
    : T extends readonly [unknown, ...infer R]
      ? Drop<N, R, [...Acc, unknown]>
      : T;

type Take<N extends number, T extends readonly unknown[], Acc extends readonly unknown[] = []> =
  Acc['length'] extends N
    ? Acc
    : T extends readonly [infer H, ...infer R]
      ? Take<N, R, [...Acc, H]>
      : Acc;

type Slice<
  Start extends number,
  End extends number,
  T extends readonly unknown[]
> = Take<Sub<End, Start>, Drop<Start, T>>;
```

### 8.3 元组映射与过滤

```typescript
type MapTuple<T extends readonly unknown[], F> =
  T extends readonly [infer H, ...infer R]
    ? [F & H, ...MapTuple<R, F>]
    : [];

type FilterTuple<T extends readonly unknown[], F> =
  T extends readonly [infer H, ...infer R]
    ? H extends F
      ? [H, ...FilterTuple<R, F>]
      : FilterTuple<R, F>
    : [];

type Zip<A extends readonly unknown[], B extends readonly unknown[]> =
  A extends readonly [infer HA, ...infer RA]
    ? B extends readonly [infer HB, ...infer RB]
      ? [[HA, HB], ...Zip<RA, RB>]
      : []
    : [];
```

## 9. 对象操作类型工具

### 9.1 基于键的过滤

```typescript
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};

type PickByType<T, V> = PickByValue<T, V>;
type OmitByType<T, V> = OmitByValue<T, V>;
```

### 9.2 键的元信息

```typescript
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type ReadonlyKeys<T> = {
  [K in keyof T]-readonly: T extends { [P in K]: any } 
    ? Equal<{ [P in K]: T[K] }, { readonly [P in K]: T[K] }> extends true
      ? K
      : never
    : never;
}[keyof T];

type MutableKeys<T> = {
  [K in keyof T]-readonly: T extends { [P in K]: any }
    ? Equal<{ [P in K]: T[K] }, { readonly [P in K]: T[K] }> extends true
      ? never
      : K
    : never;
}[keyof T];
```

### 9.3 `OptionalKeys` 的推导

`OptionalKeys` 的核心技巧是 `{ } extends Pick<T, K>`。

对于一个可选属性 `K?: V`，其类型 `Pick<T, K>` 等价于 `{ K?: V }`，空对象 `{}` 是它的子类型（因为可选属性可以缺省）。

对于必填属性 `K: V`，`Pick<T, K>` 等价于 `{ K: V }`，空对象 `{}` 不是它的子类型。

因此 `{ } extends Pick<T, K>` 当且仅当 `K` 是可选属性。

### 9.4 重组对象类型

```typescript
type MakeOptional<T> = { [K in keyof T]?: T[K] };
type MakeRequired<T> = { [K in keyof T]-?: T[K] };
type MakeReadonly<T> = { readonly [K in keyof T]: T[K] };
type MakeMutable<T> = { -readonly [K in keyof T]: T[K] };

type DeepMutable<T> = T extends object
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

type DeepOptional<T> = T extends object
  ? { [K in keyof T]?: DeepOptional<T[K]> }
  : T;
```

### 9.5 键名变换

```typescript
type CamelToSnake<S extends string> =
  S extends `${infer H}${infer T}`
    ? T extends Uncapitalize<T>
      ? `${Lowercase<H>}${CamelToSnake<T>}`
      : `${Lowercase<H>}_${CamelToSnake<Uncapitalize<T>>}`
    : S;

type SnakeToCamel<S extends string> =
  S extends `${infer H}_${infer T}`
    ? `${H}${Capitalize<SnakeToCamel<T>>}`
    : S;

type KeysToSnakeCase<T> = {
  [K in keyof T as CamelToSnake<string & K>]: T[K];
};

type KeysToCamelCase<T> = {
  [K in keyof T as SnakeToCamel<string & K>]: T[K];
};
```

## 10. 类型判断工具集

### 10.1 基础判断

```typescript
type IsNever<T> = [T] extends [never] ? true : false;

type IsAny<T> = 0 extends 1 & T ? true : false;

type IsUnknown<T> =
  IsNever<T> extends true
    ? false
    : IsAny<T> extends true
      ? false
      : unknown extends T
        ? true
        : false;

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
```

### 10.2 `IsAny` 的原理

`IsAny` 的写法 `0 extends 1 & T` 利用了 `any` 的特殊性质：

- `any & X = any`（对任意类型 `X`）
- `T extends any` 永远为 `true`
- `any extends T` 也永远为 `true`

当 `T = any` 时，`1 & T = any`，而 `0 extends any` 永远为 `true`，因此结果为 `true`。

当 `T` 不是 `any` 时，`1 & T` 是某个具体类型，`0 extends 1 & T` 仅当 `1 & T` 包含数字字面量 `0`，这几乎不可能发生（除非 `T` 本身就是 `0` 或包含 `0` 的联合）。

### 10.3 `IsNever` 的原理

`IsNever` 写成 `[T] extends [never]` 而非 `T extends never` 的原因：

`T extends never` 会触发分布式条件类型。当 `T = never` 时，分布式规则把 `never` 视为"空联合"，直接返回 `never` 而非 `true`。

把 `T` 用元组 `[T]` 包裹，使其不再是"裸类型参数"，从而避免分布式规则。

## 11. 高级模式

### 11.1 类型层状态机

利用联合类型与判别字段（discriminated union）可以编码状态机：

```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };

type Transition<S extends State['status']> =
  S extends 'idle' ? 'loading'
  : S extends 'loading' ? 'success' | 'error'
  : S extends 'success' ? 'idle'
  : S extends 'error' ? 'idle'
  : never;

function transition<S extends State['status']>(
  state: State & { status: S },
): State & { status: Transition<S> } {
  // 运行时实现略
  return state as any;
}
```

### 11.2 类型层解释器

```typescript
type Eval<E, Env extends Record<string, unknown>> =
  E extends { kind: 'num'; value: infer V }
    ? V
    : E extends { kind: 'var'; name: infer N extends string }
      ? N extends keyof Env ? Env[N] : never
      : E extends { kind: 'add'; left: infer L; right: infer R }
        ? Eval<L, Env> & Eval<R, Env>
        : never;
```

这个解释器可以在类型层求值一个简单的算术表达式 AST。其限制是不能处理递归嵌套超过 100 层的表达式。

### 11.3 类型层 DSL：ORM 字段引用

```typescript
type Table<T> = {
  fields: { [K in keyof T]: K };
  select: <K extends keyof T>(...fields: K[]) => Pick<T, K>;
};

type User = {
  id: number;
  name: string;
  email: string;
};

const userTable: Table<User> = {
  fields: {
    id: 'id',
    name: 'name',
    email: 'email',
  },
  select: (...fields) => fields.reduce((acc, f) => ({ ...acc, [f]: undefined }), {}) as any,
};

userTable.select('id', 'name'); // OK
userTable.select('id', 'age'); // 编译错误：'age' 不在 'id' | 'name' | 'email' 中
```

### 11.4 类型层状态推导： Redux

```typescript
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; value: number };

type Reducer<S, A extends Action> =
  A extends { type: 'increment' }
    ? S extends number ? S + 1 : never
    : A extends { type: 'decrement' }
      ? S extends number ? S - 1 : never
      : A extends { type: 'set'; value: infer V }
        ? V
        : never;
```

注：`S + 1` 等算术运算在类型层需要通过元组长度模拟，这里仅作概念示意。

## 12. 对比分析

### 12.1 与 Haskell 类型类的对比

| 特性 | TypeScript | Haskell |
| ---- | ---------- | ------- |
| 类型类（type class） | 无原生支持，可用映射类型 + 条件类型模拟 | 原生支持 |
| 依值类型 | 不支持 | 部分支持（GADTs, TypeFamilies） |
| 高阶类型 | 不支持（无 `* -> *` 抽象） | 原生支持 |
| 类型推断 | 局部推断，反向约束 | 全局推断，Hindley-Milner |
| 副作用追踪 | 不支持 | 支持（monad） |
| 子类型 | 结构子类型 | 不支持子类型，使用类型类 |

### 12.2 与 Rust trait 的对比

| 特性 | TypeScript | Rust |
| ---- | ---------- | ---- |
| trait / interface | 接口 + 结构子类型 | trait + 显式 impl |
| 关联类型 | 通过泛型 + 条件类型模拟 | 原生支持 |
| 类型族（type family） | 通过条件类型 + infer 模拟 | 关联类型 |
| 高阶类型 | 不支持 | 通过 GATs 部分支持 |
| 副作用追踪 | 不支持 | 通过 trait `Future` + `async/await` |
| 编译期计算 | 类型体操（限制 100 层递归） | const fn（无递归限制） |

### 12.3 与 Scala 3 的对比

Scala 3 的 given/using 机制与 TypeScript 的接口有一些相似之处，但 Scala 3 支持：

- 依值类型（PATH-dependent types）
- 高阶类型
- 类型类
- 上下文抽象

TypeScript 在类型抽象能力上明显弱于 Scala 3，但在工程上更易上手，编译速度也快得多。

### 12.4 与 Python 类型注解的对比

Python 的类型注解是运行时可访问的，TypeScript 的类型注解在编译后被完全擦除。这一根本差异决定了：

- TypeScript 类型体操不能依赖运行时反射。
- Python 类型注解可以更宽松（因为运行时不强制），但需要更复杂的工具（如 mypy、pyright）做检查。
- TypeScript 在大型项目的可维护性上更胜一筹。

## 13. 常见陷阱

### 13.1 分布式条件类型的"意外"

```typescript
type Wrong<T> = T extends string ? T : never;

type R = Wrong<'a' | 'b' | 1>;
// 期望：never
// 实际：'a' | 'b'
```

当 `T` 是裸类型参数且为联合类型时，条件类型会分配到每个成员上。修复方式：用元组包裹阻止分布。

```typescript
type Correct<T> = [T] extends [string] ? T : never;

type R2 = Correct<'a' | 'b' | 1>; // never
```

### 13.2 `any` 在交叉类型中的传染性

```typescript
type T = string & any; // any
type U = number & any; // any
```

`any` 与任何类型的交叉都是 `any`。这使得 `any` 在类型体操中是"病毒性"的：一旦进入计算，会污染所有结果。

### 13.3 `never` 的吸收性

```typescript
type T = string | never; // string
type U = string & never; // never
```

`never` 在联合类型中是被吸收的（吸收律），在交叉类型中是吸收其他类型的。这与空集的代数性质一致。

### 13.4 函数参数的双变

```typescript
interface A {
  f(x: string): void;
}

interface B {
  f(x: 'a' | 'b'): void;
}

const a: A = { f: (x: 'a' | 'b') => {} }; // 默认通过
```

在 `strictFunctionTypes: false` 时，方法参数是双变的，这会破坏类型安全。开启 `strict: true` 后，函数类型在参数位置上是逆变的，但方法仍是双变的。

### 13.5 元组类型与数组类型的混淆

```typescript
type T1 = string[];            // 数组，长度未知
type T2 = [string, string];    // 元组，长度为 2
type T3 = readonly string[];   // 只读数组
type T4 = readonly [string];   // 只读元组
```

`T1['length']` 是 `number`，`T2['length']` 是 `2`。类型体操中很多操作仅对元组有效，对数组无意义。

### 13.6 `keyof` 在交叉类型上的合并

```typescript
type T1 = keyof ({ a: 1 } & { b: 2 }); // 'a' | 'b'
type T2 = keyof ({ a: 1 } & { a: 2 }); // 'a'
```

当两个对象类型有同名属性时，交叉类型会合并该属性，`keyof` 不会出现重复键。

### 13.7 模板字面量类型的展开爆炸

```typescript
type T = `${'a' | 'b'}${'c' | 'd'}${'e' | 'f'}${'g' | 'h'}${'i' | 'j'}`;
// 结果联合类型大小：2^5 = 32
```

当模板字面量类型有多个联合类型的插入位置时，结果是笛卡尔积。在 10 个位置时，结果可达 $2^{10} = 1024$ 个成员，编译器会显著变慢。

### 13.8 递归类型的"自引用"陷阱

```typescript
type Bad = Bad extends string ? Bad : never; // 错误：循环引用
```

递归类型必须通过参数化或延迟求值实现：

```typescript
type Good<T> = T extends string ? Good<unknown> : never;
```

## 14. 工程实践

### 14.1 性能预算

类型体操引入的性能开销主要体现在：

- **编译时间**：复杂类型可能让 `tsc` 单次编译从 1s 增加到 30s。
- **IDE 响应**：语言服务器在编辑器中需要持续做类型检查，复杂类型会让 IntelliSense 延迟超过 1s。
- **内存占用**：复杂类型的内部表示可能消耗数百 MB 内存。

建议制定明确的性能预算：

- 单个公共类型工具的复杂度不超过 50 行。
- 单个公共类型工具的递归深度不超过 20 层。
- 项目总编译时间不超过 10 秒（增量编译不超过 2 秒）。
- IDE 中 IntelliSense 响应时间不超过 200 毫秒。

### 14.2 项目配置

`tsconfig.json` 中影响类型体操的关键配置：

```json
{
  "compilerOptions": {
    "strict": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noUnusedLocals": false,
    "skipLibCheck": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

- `strict: true` 启用所有严格检查，是类型体操的前提。
- `skipLibCheck: true` 跳过 `.d.ts` 的检查，可以加速项目级编译。
- `incremental: true` 启用增量编译，对大型项目至关重要。

### 14.3 类型工具的组织

在项目中，建议把类型工具按以下结构组织：

```
src/
├── types/
│   ├── utils/        // 基础工具：IsEqual, IsNever 等
│   ├── tuple/        // 元组工具：Head, Tail, Reverse 等
│   ├── object/       // 对象工具：PickByType, DeepReadonly 等
│   ├── string/       // 字符串工具：CamelCase, Split 等
│   ├── math/         // 数学工具：Add, Sub, Range 等
│   └── index.ts      // 统一导出
```

每个工具应包含：

- 类型定义
- 用法示例
- 限制说明（如递归深度）
- 性能注意事项

### 14.4 单元测试

类型工具的"单元测试"通过类型断言实现：

```typescript
import { Equal, Expect } from '@type-challenges/utils';

type cases = [
  Expect<Equal<IsEqual<1, 1>, true>>,
  Expect<Equal<IsEqual<1, 2>, false>>,
  Expect<Equal<IsEqual<any, 1>, false>>,
  Expect<Equal<IsEqual<never, never>, true>>,
];
```

如果断言失败，编译器会给出 `Type 'false' does not satisfy the constraint 'true'` 之类的错误。这种测试不需要运行任何代码，纯类型层完成。

### 14.5 文档生成

类型工具的文档建议采用 `@example` JSDoc 标签：

```typescript
/**
 * 判断两个类型是否相等，对 any 与 never 不产生误判。
 *
 * @example
 * type T1 = IsEqual<1, 1>; // true
 * type T2 = IsEqual<any, 1>; // false
 * type T3 = IsEqual<never, never>; // true
 *
 * @see https://github.com/microsoft/TypeScript/issues/27024
 */
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
```

工具如 `typedoc` 可以从 JSDoc 生成 HTML 文档。

### 14.6 与运行时校验结合

类型层的复杂推导应配合运行时校验库（如 zod、io-ts、ajv）使用：

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;
// 等价于 { id: number; name: string; email: string }
```

这样既能在类型层获得精确约束，又能在运行时阻挡脏数据。

## 15. 案例研究

### 15.1 tRPC：端到端类型安全 RPC

tRPC 是类型体操在生产环境的代表案例。它通过以下机制实现端到端类型安全：

1. 服务端定义路由过程（router），每个过程包含输入验证（zod schema）与输出类型。
2. 客户端通过类型层"投影"得到一个虚拟的客户端对象，其方法签名完全镜像服务端。
3. 客户端调用方法时，TypeScript 会校验参数类型与服务端定义一致，并自动推断返回值类型。

tRPC 的核心类型体操：

```typescript
type RouterClient<TRouter extends AnyRouter> = {
  [TPath in keyof TRouter['_def']['procedures']]:
    TRouter['_def']['procedures'][TPath] extends Procedure<any, infer TInput, infer TOutput>
      ? (input: TInput) => Promise<TOutput>
      : never;
};
```

这种模式让客户端代码享受"如同本地调用"的类型安全，被广泛认为是现代全栈开发的最佳实践之一。

### 15.2 Drizzle ORM：类型安全的 SQL 查询构建器

Drizzle ORM 通过类型体操实现：

- 字段引用类型安全：`db.select({ id: users.id }).from(users)`。
- 跨表连接的类型推断：`db.select().from(a).leftJoin(b, eq(a.id, b.aid))`。
- 查询结果类型自动推导：返回值的类型由 `select` 字段与 `leftJoin` 自动计算。

其核心类型工具：

```typescript
type SelectFields<TTable extends Table, TSelection> = {
  [K in keyof TSelection]: TSelection[K] extends Column
    ? TSelection[K]['type']
    : TSelection[K] extends SQL<infer R>
      ? R
      : never;
};
```

### 15.3 XState：类型层状态机

XState v5 利用类型体操实现：

- 状态转换的类型约束：只能在合法转移之间转换。
- 事件参数的类型推断：不同事件携带不同 payload。
- 上下文（context）的类型演化：状态机在不同状态下可访问的上下文字段不同。

其核心类型：

```typescript
type Transition<S extends State, E extends Event> =
  S extends { status: 'idle' }
    ? E extends { type: 'START' }
      ? { status: 'running' }
      : never
    : S extends { status: 'running' }
      ? E extends { type: 'STOP' }
        ? { status: 'idle' }
        : E extends { type: 'ERROR'; error: infer Err }
          ? { status: 'error'; error: Err }
          : never
      : never;
```

### 15.4 React Hook Form：类型安全的表单

React Hook Form 通过类型体操实现：

- 表单字段类型与 `register` 函数参数类型对应。
- `useForm<T>` 返回值的 `watch`、`setValue` 等方法都使用 `T` 的字段路径作为参数。
- 嵌套字段的路径（如 `'user.address.city'`）在类型层被推导为 `Path<T>`。

其核心类型 `Path<T>` 与本模块第 4.6 节给出的实现一致。

## 16. 进阶主题

### 16.1 类型层证明

类型层证明是把数学命题编码为类型，使类型检查器验证命题成立。最经典的例子是长度为 N 的列表：

```typescript
type Nat = 'Z' | { succ: Nat };

type Add<A extends Nat, B extends Nat> =
  A extends 'Z'
    ? B
    : A extends { succ: infer S extends Nat }
      ? { succ: Add<S, B> }
      : never;
```

这种编码方式对应 Peano 自然数。但 TypeScript 的递归深度限制使得这种证明只能处理很小的数。

### 16.2 类型层单子

单子（monad）是函数式编程的核心抽象。TypeScript 中可以模拟 `Maybe` 单子：

```typescript
type Maybe<T> = T | null | undefined;

type Bind<T, U>(m: Maybe<T>, f: (x: T) => Maybe<U>): Maybe<U> =
  m extends null | undefined ? m : f(m);
```

但这种模拟无法在类型层表达，因为 TypeScript 没有高阶类型。真正的类型层单子需要借助 TypeScript 5.0+ 的 `const` 类型参数与递归类型结合。

### 16.3 类型层的代数数据类型（ADT）

```typescript
type Option<T> =
  | { kind: 'some'; value: T }
  | { kind: 'none' };

type Result<T, E> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: E };

type List<T> =
  | { kind: 'nil' }
  | { kind: 'cons'; head: T; tail: List<T> };
```

这是 ML/Haskell 风格的代数数据类型在 TypeScript 中的直接编码。其优势是可以利用判别联合的类型守卫特性，编写分支完备的代码。

## 17. 性能优化与边界

### 17.1 编译时间测量

```bash
tsc --extendedDiagnostics
```

输出示例：

```
Files:                          1240
Lines of Library:              43021
Lines of TypeScript:          215634
Lines of JavaScript:           78431
Lines of JSON:                 12384
Identifiers:                  887651
Symbols:                     1234567
Types:                       4567890
Instantiations:             12345678
Memory used:               1234.56 MB
Assignability cache size:    1234567
Identity cache size:         2345678
Subtype cache size:          3456789
Strict subtype cache size:   4567890
I/O Read:                   1.23s
Parse time:                 0.45s
ResolveModule time:         0.56s
ResolveTypeReference time:  0.12s
Program time:               1.34s
Bind time:                  0.56s
Check time:                 8.45s
transformTime time:         0.34s
printTime time:             0.45s
Emit time:                  0.79s
Total time:                 11.45s
```

关键指标：

- `Instantiations`：类型实例化次数，反映类型体操的总计算量。超过 5,000,000 通常意味着项目存在过度复杂的类型。
- `Check time`：类型检查时间，应控制在 5 秒以内。

### 17.2 性能优化策略

**策略 1：减少联合类型成员**

```typescript
// 差：联合类型成员数随模板长度指数增长
type T1 = `${'a'|'b'|'c'}${'a'|'b'|'c'}${'a'|'b'|'c'}`; // 27 个成员

// 好：使用 const 元组保留顺序
type T2 = ['a', 'a', 'a'] as const;
```

**策略 2：用元组替代字符串**

```typescript
// 差：模板字面量类型递归
type Split<S extends string, D extends string> =
  S extends `${infer H}${D}${infer T}` ? [H, ...Split<T, D>] : [S];

// 好：用元组替代字符串，避免模板字面量递归
type Split2<S extends string, D extends string> = ...
```

**策略 3：缓存中间结果**

```typescript
type CachedDeepReadonly<T> = T extends object
  ? T extends readonly any[]
    ? T
    : { readonly [K in keyof T]: CachedDeepReadonly<T[K]> }
  : T;
```

通过显式分支减少递归调用次数。

**策略 4：用映射类型替代条件类型**

```typescript
// 差：条件类型 + infer
type Keys<T> = T extends object ? keyof T : never;

// 好：直接 keyof
type Keys2<T> = keyof T;
```

`keyof T` 在 `T` 不是对象时返回 `never`，无需条件类型。

### 17.3 监控类型复杂度

可以在 CI 中加入类型复杂度检查：

```bash
tsc --extendedDiagnostics 2>&1 | grep Instantiations | awk '{print $2}'
```

如果 `Instantiations` 超过 10,000,000，应触发告警。社区工具如 `typescript-performance` 可以做更细粒度的分析。

## 18. 习题

### 18.1 填空题（fill-blank）

1. 条件类型 `T extends U ? X : Y` 中，当 `T` 是裸类型参数且为联合类型 `A | B` 时，结果为____。
2. TypeScript 自身对类型递归实例化深度的硬性上限是____层。
3. 要判断类型 `T` 是否为 `never`，需要写成 `[T] extends [never]` 而非 `T extends never`，原因是 `never` 在分布式条件类型中会被____。
4. `IsAny<T>` 的常见实现是 `0 extends 1 & T ? true : false`，其利用了 `any` 与任何类型的交叉仍是____这一性质。
5. `type Length<T extends readonly any[]> = T['length']` 中，当 `T` 为元组 `[1, 2, 3]` 时，结果为字面量类型____。
6. 在 `type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T]` 中，`-?` 修饰符的作用是____。
7. `type Last<T extends readonly any[]> = T extends [...any[], infer L] ? L : never` 中，`...any[]` 的作用是匹配____元素。
8. 在模板字面量类型 `${infer H}_${infer T}` 中，`H` 与 `T` 的关系是____。

### 18.2 选择题（choice）

1. 关于 TypeScript 类型系统的图灵完备性，下列哪一项是正确的？
   - A. TypeScript 类型系统在 4.0 之后已完全图灵完备，可以表达任意计算
   - B. TypeScript 类型系统具备图灵完备的潜在能力，但递归深度被限制为 100，因此实际不可表达任意计算
   - C. TypeScript 类型系统是停机可判定的，因此不可能图灵完备
   - D. TypeScript 类型系统图灵完备性已通过形式化证明，但禁止使用

2. 下列哪种写法可以正确实现 `IsAny<T>`？
   - A. `type IsAny<T> = T extends any ? true : false`
   - B. `type IsAny<T> = 0 extends 1 & T ? true : false`
   - C. `type IsAny<T> = T === any ? true : false`
   - D. `type IsAny<T> = keyof T extends never ? true : false`

3. 关于分布式条件类型，下列哪一项是不正确的？
   - A. 当 `T` 是裸类型参数且为联合类型时，条件类型会分配到每个成员
   - B. 用元组 `[T]` 包裹 `T` 可以阻止分布式
   - C. `never` 在分布式条件类型中会被直接过滤
   - D. 在条件类型中可以使用 `infer` 提取类型变量

4. 下列哪种类型递归会被 TypeScript 4.5+ 优化为尾递归？
   - A. `type T = T extends [infer H, ...infer R] ? [H, ...T<R>] : []`
   - B. `type T = T extends [infer H, ...infer R] ? T<R, [...Acc, H]> : Acc`
   - C. `type T = T extends [infer H, ...infer R] ? `${H}${T<R>}` : ''`
   - D. `type T = T extends [infer H, ...infer R] ? { x: T<R> } : {}`

5. 关于 `satisfies` 操作符，下列哪一项是正确的？
   - A. `satisfies` 与 `as` 完全等价
   - B. `satisfies` 用于校验表达式类型满足约束，同时保留原始字面量类型
   - C. `satisfies` 会改变表达式的推断类型
   - D. `satisfies` 仅适用于对象字面量

6. 关于 TypeScript 的子类型关系，下列哪一项是错误的？
   - A. `never` 是任何类型的子类型
   - B. `unknown` 是任何类型的父类型
   - C. 任何类型都是 `any` 的子类型也是 `any` 的父类型
   - D. 联合类型 `A | B` 是 `A` 的子类型

### 18.3 代码修复题（code-fix）

1. 下列 `DeepReadonly` 实现会在函数类型、`Date`、`Map` 等内置对象上错误地递归。请修复：

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};
```

2. 下列 `IsEqual` 实现在边缘情况下有误，请修复：

```typescript
type IsEqual<A, B> =
  A extends B ? (B extends A ? true : false) : false;
```

3. 下列 `UnionToIntersection` 实现产生 `unknown` 而非预期交集，请修复：

```typescript
type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;
```

4. 下列 `CamelCase` 实现无法处理连续下划线（如 `__foo__bar__`），请修复：

```typescript
type CamelCase<S extends string> =
  S extends `${infer H}_${infer T}`
    ? `${H}${Capitalize<CamelCase<T>>}`
    : S;
```

5. 下列 `Flatten` 实现对深度嵌套数组无效（如 `[[1, [2, [3]]]]`），请修复为递归版本：

```typescript
type Flatten<T extends any[]> = T extends [infer H, ...infer R]
  ? H extends any[]
    ? [...H, ...Flatten<R>]
    : [H, ...Flatten<R>]
  : [];
```

### 18.4 开放题（open-ended）

1. 请用 200 字以内论证：为什么 TypeScript 选择把递归实例化深度限制为 100 而不是无限？该限制对类型体操实践有何影响？

2. 如果让你重新设计 TypeScript 的类型系统，你会保留「分布式条件类型」这一特性吗？请给出至少两条支持与两条反对的工程理由。

3. 假设你正在为一个大型电商项目设计商品搜索 API。请描述如何利用类型体操实现以下安全保证：
   - 字段名拼写错误在编译期被发现
   - 排序方向（asc/desc）与字段类型对应（如数字字段支持范围查询，字符串字段不支持）
   - 嵌套字段的路径（如 `seller.address.city`）在类型层推导

4. 比较以下两种实现 `DeepReadonly` 的策略，从可读性、性能、可维护性三个维度评估：
   - 策略 A：使用条件类型 + 递归映射类型
   - 策略 B：使用 `Readonly<T>` 工具类型嵌套 5 层

5. 在 GitHub 上找出 type-challenges 仓库中你最喜欢的一道题，分析其题解的形式化推导，并讨论是否存在其他等价但更高效的解法。

## 19. 参考文献

[1] Pierce, B. C. 2002. *Types and Programming Languages*. MIT Press, Cambridge, MA. ISBN 978-0-262-16209-8.

[2] Bierman, G. M., Abadi, M., and Torgersen, M. 2014. Understanding TypeScript. In *ECOOP 2014 — Object-Oriented Programming* (pp. 257-281). Springer, Berlin, Heidelberg. DOI: 10.1007/978-3-662-44202-9_11

[3] Microsoft. 2018. TypeScript 2.8 Release Notes: Conditional Types. Retrieved July 20, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html

[4] Microsoft. 2020. TypeScript 4.1 Release Notes: Template Literal Types. Retrieved July 20, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html

[5] Microsoft. 2021. TypeScript 4.5 Release Notes: Tail-Recursive Type Inference. Retrieved July 20, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html

[6] Ajvani, B., Vahidi, S., and Itzhaki, S. 2023. Type-level Programming in TypeScript. *arXiv preprint arXiv:2302.09465*. DOI: 10.48550/arXiv.2302.09465

[7] Bachmayr, C. et al. 2022. On the Complexity of TypeScript Type Checking. *Proceedings of the ACM on Programming Languages* 6, OOPSLA. DOI: 10.1145/3563308

[8] Fu, A. 2020. type-challenges: Collection of TypeScript type challenges with online judge. GitHub repository. https://github.com/type-challenges/type-challenges

[9] Hejlsberg, A. 2020. TypeScript 4.1: Template Literal Types. Microsoft Build conference talk.

[10] Rosenwasser, D. 2023. Announcing TypeScript 5.0. Microsoft Developer Blog. https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/

[11] Church, A. 1932. A set of postulates for the foundation of logic. *Annals of Mathematics* 33(2), 346-366. DOI: 10.2307/1968337

[12] Martin-Löf, P. 1984. *Intuitionistic Type Theory*. Bibliopolis, Napoli. ISBN 978-88-7088-105-9.

[13] Hosoya, H. and Pierce, B. C. 2003. Regular expression pattern matching for XML. *Journal of Functional Programming* 13(6), 961-1004. DOI: 10.1017/S0956796803001131

[14] Xi, H. and Pfenning, F. 1999. Dependent Types in Practical Programming. In *Proceedings of the 26th ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages (POPL '99)* (pp. 214-227). DOI: 10.1145/292540.292560

[15] Freeman, T. and Pfenning, F. 1991. Refinement types for ML. In *Proceedings of the ACM SIGPLAN 1991 Conference on Programming Language Design and Implementation (PLDI '91)* (pp. 261-270). DOI: 10.1145/113445.113468

## 20. 延伸阅读

### 20.1 书籍

- Benjamin C. Pierce. *Types and Programming Languages* (TAPL). MIT Press, 2002.
- Robert Harper. *Practical Foundations for Programming Languages*. Cambridge University Press, 2nd Edition, 2016.
- Boris Cherny. *Programming TypeScript*. O'Reilly Media, 2019.
- Stefan Baumgartner. *TypeScript in 50 Lessons*. Smashing Magazine, 2020.

### 20.2 论文

- Bierman, G., Abadi, M., Torgersen, M. "Understanding TypeScript." ECOOP 2014.
- Ajvani, B., Vahidi, S., Itzhaki, S. "Type-level Programming in TypeScript." arXiv:2302.09465, 2023.
- Bachmayr, C. et al. "On the Complexity of TypeScript Type Checking." PACMPL 6(OOPSLA), 2022.

### 20.3 开源项目

- type-challenges: https://github.com/type-challenges/type-challenges
- type-fest: https://github.com/sindresorhus/type-fest
- ts-toolbelt: https://github.com/millsp/ts-toolbelt
- utility-types: https://github.com/piotrwitek/utility-types
- total-typescript/type-transformations: https://github.com/total-typescript/type-transformations

### 20.4 在线资源

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- TypeScript Type Manipulation: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
- Matt Pocock's Total TypeScript: https://www.totaltypescript.com/
- Type-Level TypeScript: https://type-level-typescript.com/

### 20.5 视频课程

- Matt Pocock. *Total TypeScript: Type Transformations*. 2023.
- Boris Cherny. *Programming TypeScript* 系列在线分享.
- Microsoft Build 2020: *TypeScript 4.1: Template Literal Types* by Anders Hejlsberg.

## 21. 附录：常用类型工具速查表

### 21.1 判断类

```typescript
type IsNever<T> = [T] extends [never] ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> = IsNever<T> extends true
  ? false
  : IsAny<T> extends true
    ? false
    : unknown extends T
      ? true
      : false;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
```

### 21.2 集合类

```typescript
type Union<A, B> = A | B;
type Intersect<A, B> = A extends B ? A : never;
type Diff<A, B> = A extends B ? never : A;
type Complement<A, U extends A> = U extends A ? never : U;
type IsSubset<A, B> = A extends B ? true : false;
```

### 21.3 元组类

```typescript
type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : never;
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;
type Reverse<T extends readonly unknown[]> = T extends readonly [infer H, ...infer R] ? [...Reverse<R>, H] : [];
type Length<T extends readonly unknown[]> = T['length'];
type Concat<A extends readonly unknown[], B extends readonly unknown[]> = [...A, ...B];
type Push<T extends readonly unknown[], V> = [...T, V];
type Pop<T extends readonly unknown[]> = T extends readonly [...infer I, unknown] ? I : never;
```

### 21.4 对象类

```typescript
type PickByValue<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
type OmitByValue<T, V> = { [K in keyof T as T[K] extends V ? never : K]: T[K] };
type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type MakeOptional<T> = { [K in keyof T]?: T[K] };
type MakeRequired<T> = { [K in keyof T]-?: T[K] };
type MakeReadonly<T> = { readonly [K in keyof T]: T[K] };
type MakeMutable<T> = { -readonly [K in keyof T]: T[K] };
```

### 21.5 字符串类

```typescript
type CamelToSnake<S extends string> =
  S extends `${infer H}${infer T}`
    ? T extends Uncapitalize<T>
      ? `${Lowercase<H>}${CamelToSnake<T>}`
      : `${Lowercase<H>}_${CamelToSnake<Uncapitalize<T>>}`
    : S;

type SnakeToCamel<S extends string> =
  S extends `${infer H}_${infer T}`
    ? `${H}${Capitalize<SnakeToCamel<T>>}`
    : S;

type Split<S extends string, D extends string> =
  S extends `${infer H}${D}${infer T}` ? [H, ...Split<T, D>] : [S];

type Join<T extends readonly string[], D extends string> =
  T extends readonly [infer H extends string]
    ? H
    : T extends readonly [infer H extends string, ...infer R extends string[]]
      ? `${H}${D}${Join<R, D>}`
      : '';

type Replace<S extends string, F extends string, T extends string> =
  S extends `${infer L}${F}${infer R}` ? `${L}${T}${Replace<R, F, T>}` : S;
```

### 21.6 深度递归类

```typescript
type DeepReadonly<T> = T extends
  | ((...args: any[]) => any)
  | Date
  | RegExp
  | Map<any, any>
  | Set<any>
  | WeakMap<any, any>
  | WeakSet<any>
  | ArrayBuffer
  | SharedArrayBuffer
  | DataView
  | Error
  | Promise<any>
  | ReadonlyArray<any>
  ? T
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;

type DeepPartial<T> = T extends
  | ((...args: any[]) => any)
  | Date
  | RegExp
  | Map<any, any>
  | Set<any>
  ? T
  : T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T;

type DeepRequired<T> = T extends
  | ((...args: any[]) => any)
  | Date
  | RegExp
  | Map<any, any>
  | Set<any>
  ? T
  : T extends object
    ? { [P in keyof T]-?: DeepRequired<T[P]> }
    : T;

type DeepMutable<T> = T extends
  | ((...args: any[]) => any)
  | Date
  | RegExp
  | Map<any, any>
  | Set<any>
  ? T
  : T extends object
    ? { -readonly [P in keyof T]: DeepMutable<T[P]> }
    : T;
```

### 21.7 路径类

```typescript
type Path<T, P extends string = ''> = T extends object
  ? {
      [K in keyof T & string]:
        | (P extends '' ? K : `${P}.${K}`)
        | Path<T[K], P extends '' ? K : `${P}.${K}`>;
    }[keyof T & string]
  : never;

type Get<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? Get<T[K], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

type Leaves<T, P extends string = ''> = T extends object
  ? {
      [K in keyof T & string]:
        | (T[K] extends object
            ? Leaves<T[K], P extends '' ? K : `${P}.${K}`>
            : (P extends '' ? K : `${P}.${K}`));
    }[keyof T & string]
  : never;
```

## 22. 学习路径建议

### 22.1 入门阶段（1-2 周）

1. 通读 TypeScript Handbook 的"Type Manipulation"章节。
2. 完成 type-challenges 中的 `easy` 难度题目（共 14 题）。
3. 理解条件类型、映射类型、`infer` 关键字的基本用法。

### 22.2 进阶阶段（3-4 周）

1. 完成 type-challenges 中的 `medium` 难度题目（共 96 题）。
2. 阅读 `ts-toolbelt`、`type-fest` 等库的源码。
3. 在实际项目中引入类型体操工具，例如 `DeepReadonly`、`Path` 等。

### 22.3 高级阶段（2-3 个月）

1. 完成 type-challenges 中的 `hard` 难度题目（共 47 题）。
2. 阅读 Bierman 等人的《Understanding TypeScript》论文。
3. 阅读 type-challenges `extreme` 难度题目（共 17 题），但不必全部完成。
4. 尝试为开源项目贡献类型工具，如 `tRPC`、`Drizzle ORM` 等。

### 22.4 精通阶段（持续）

1. 阅读 TAPL（Pierce 2002）了解类型论基础。
2. 研究 TypeScript 编译器源码（`src/compiler/checker.ts`）。
3. 关注 TypeScript GitHub issues 中的类型系统相关讨论。
4. 参与设计新的类型工具，发布开源库。

## 23. 结语

类型体操是 TypeScript 中最优雅也最危险的能力。优雅在于它把抽象数学概念（$\lambda$-calculus、类型论、代数数据类型）以工程化的方式带入主流开发；危险在于其复杂度增长是非线性的，过度使用会让项目陷入"编译时间黑洞"。

本模块的目标不是鼓励读者把所有类型都写成体操，而是：

- **理解其代数基础**：明白每条规则的数学含义。
- **掌握其设计模式**：知道何时该用、何时不该用。
- **建立其性能预算**：在工程约束下做合理取舍。
- **识别其陷阱**：在踩坑前就能预判问题。

掌握本模块后，读者应能：

- 阅读和理解任意 type-challenges 题解。
- 在生产项目中设计类型安全的 API，不依赖运行时校验。
- 在 code review 中识别类型体操的性能风险与可维护性问题。
- 为团队制定类型体操的使用规范与性能预算。

类型体操的终极价值不在于炫技，而在于让 TypeScript 的类型系统真正成为产品功能的"承载者"与"文档者"。当类型定义即文档、类型检查即测试、类型推导即 API 设计时，类型体操才完成了它的使命。
