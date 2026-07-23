---
title: 'TypeScript 理论知识点'
module: typescript
category: 'TS Theory'
order: 130
tags:
  - typescript
  - theory
  - type-system
  - type-theory
  - generics
  - conditional-types
difficulty: intermediate
description: 类型论基础、结构化类型、子类型理论、类型推导、泛型多态与类型级计算的形式语义与工程实践。
related:
  - typescript/装饰器标准实现
  - 'typescript/项目示例-类型安全的API客户端'
prerequisites:
  - typescript/语法速查
learningObjectives:
  - '复述类型论发展史，从 Simply Typed Lambda Calculus 到 System F 再到 Hindley-Milner 的演进脉络'
  - '解释结构类型与名义类型的语义差异，并能用 KaTeX 写出宽度子类型与深度子类型的形式规则'
  - '运用协变、逆变、双变、不变规则预测函数类型、数组、Promise 的子类型关系'
  - '拆解 TypeScript 编译器的类型推导算法，分析控制流分析中的窄化与类型守卫'
  - '评估条件类型、映射类型、模板字面量类型在类型级计算上的表达力与图灵完备性'
  - '基于同伦类型论思想设计类型级证明，构造类型安全的 DSL 与运行时验证集成方案'
exercises:
  fill-blank:
    - question: TypeScript 的类型兼容性采用 ____ 子类型化规则，即如果 S 的结构包含 T 的所有成员，则 S 是 T 的子类型。
      answer: width / 宽度
      bloom: remember
    - question: 函数参数在 strictFunctionTypes 模式下是 ____ 的，而函数返回值始终是 ____ 的。
      answer: contravariant / 逆变; covariant / 协变
      bloom: understand
    - question: TypeScript 类型系统在类型级别上是 ____ 完备的，可通过条件类型与递归类型模拟任意计算。
      answer: Turing / 图灵
      bloom: remember
    - question: '在条件类型 T extends U ? X : Y 中，infer 关键字在协变位置出现时取 ____ 类型，在逆变位置出现时取 ____ 类型。'
      answer: union / 联合; intersection / 交叉
      bloom: understand
  choice:
    - question: 下列关于结构化类型与名义化类型的描述，哪一项是正确的？
      options:
        - 'A. Java 的泛型是结构化的'
        - 'B. TypeScript 默认采用名义化类型'
        - 'C. Rust 的类型系统是名义化的'
        - 'D. Go 的接口是名义化的'
      answer: C
      bloom: understand
    - question: 关于 TypeScript 的类型擦除，下列哪一项是错误的？
      options:
        - 'A. interface 在编译后完全消失'
        - 'B. type 别名在编译后完全消失'
        - 'C. enum 会编译为 JavaScript 对象'
        - 'D. class 在编译后完全消失'
      answer: D
      bloom: understand
  code-fix:
    - question: |
        以下代码期望区分 USD 与 EUR 两种货币类型，但实际可互相赋值。请修复。
        ```typescript
        type USD = number;
        type EUR = number;
        const usd: USD = 100;
        const eur: EUR = usd; // 应报错，但实际合法
        ```
      answer: |
        TypeScript 默认结构化，number 与 USD 结构相同故兼容。使用品牌类型模拟名义化：
        ```typescript
        type Brand<T, B> = T & { __brand: B };
        type USD = Brand<number, 'USD'>;
        type EUR = Brand<number, 'EUR'>;
        const usd = 100 as USD;
        const eur: EUR = usd; // 报错：USD 与 EUR 不兼容
        ```
      bloom: apply
    - question: |
        以下代码期望从 Promise 中提取内部类型 T，但结果为 never。请修复。
        ```typescript
        type Unwrap<T> = T extends Promise<infer U> ? U : never;
        type Result = Unwrap<Promise<string> | Promise<number>>;
        // 结果：string | number
        ```
      answer: |
        原代码实际正确，结果是 string | number。若结果为 never，可能是 TS 版本过低或写错为 Promise<infer U> extends。修正写法：
        ```typescript
        type Unwrap<T> = T extends Promise<infer U> ? U : never;
        type Result = Unwrap<Promise<string> | Promise<number>>;
        // string | number（协变位置 infer 取联合）
        ```
      bloom: analyze
  open-ended:
    - question: |
        请论证 TypeScript 类型系统的图灵完备性，并讨论类型级计算的实用边界。
      answer: |
        TypeScript 通过条件类型、映射类型、递归类型与字面量类型可实现自然数表示（元组长度）、布尔表示、条件分支与递归。
        已有类型级实现图灵机、Lambda 演算、SKI 组合子的实例。
        但类型级编译深度受 --typeChecks 限制（默认 50 层递归），且类型级计算不参与运行时，
        因此仅适合 DSL、配置校验、文档生成等静态场景，运行时计算仍需 JavaScript。
      bloom: evaluate
    - question: |
        设计一个类型安全的运行时验证库，要求：从 Zod-like schema 推断静态类型；
        schema 编译为高效的运行时校验函数；支持递归类型与联合类型。
      answer: |
        核心思路：
        1. 用条件类型与映射类型从 schema 推断类型（infer）；
        2. schema 编译为校验函数时使用闭包缓存子校验器；
        3. 递归类型用 lazy schema（thunk）解决前向引用；
        4. 联合类型用 any-of 校验。
        ```typescript
        interface Schema<T> { _type: T; validate(v: unknown): v is T; }
        const str: Schema<string> = {
          _type: '' as string,
          validate(v): v is string { return typeof v === 'string'; }
        };
        type Infer<S> = S extends Schema<infer T> ? T : never;
        ```
      bloom: create
references:
  - author: [Benjamin C. Pierce]
    title: 'Types and Programming Languages'
    publisher: 'MIT Press'
    year: 2002
    type: book
    isbn: '978-0262162098'
  - author: [Andres Löh]
    title: 'Generic Programming in Haskell'
    publisher: 'Utrecht University'
    year: 2004
    type: technical-report
  - author: [Microsoft]
    title: 'TypeScript Language Specification'
    publisher: 'Microsoft Corporation'
    year: 2026
    type: standard
    url: 'https://www.typescriptlang.org/docs/'
  - author: [J. Roger Hindley]
    title: 'The Principal Type-Scheme of an Object in Combinatory Logic'
    publisher: 'Journal of Symbolic Logic'
    year: 1969
    type: journal
    doi: '10.2307/2270866'
  - author: [Robin Milner]
    title: 'A Theory of Type Polymorphism in Programming'
    publisher: 'Journal of Computer and System Sciences'
    year: 1978
    type: journal
    doi: '10.1016/0022-0000(78)90014-4'
etymology:
  - term: TypeScript
    origin: '2012 年 Microsoft 由 Anders Hejlsberg 主导发布，命名为 TypeScript 意为"为 JavaScript 添加类型"，缩写 TS。'
  - term: Hindley-Milner
    origin: '由 J. Roger Hindley（1969）与 Robin Milner（1978）独立发现的类型推导算法，后由 Luis Damas 完善为 Algorithm W。'
  - term: Simply Typed Lambda Calculus
    origin: '由 Alonzo Church（1940）提出，作为无类型 Lambda 演算的类型化版本，是现代类型论的起点。'
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
---

# TypeScript 理论知识点

> 本文以 MIT 6.815、Stanford CS242、CMU 15-312 的类型论教学范式为参考基准，将 TypeScript 的类型系统原理、类型推导算法、子类型理论、泛型多态、类型级计算与控制流分析组织为一篇可独立阅读的核心理论文档。所有形式化描述均基于 Benjamin C. Pierce 的 *Types and Programming Languages* 与 TypeScript 5.x 官方规范。

## 1. 学习目标与 Bloom 分类矩阵

本节明确读者在完成本文学习后应具备的认知能力层级。Bloom 分类法将认知目标划分为六个层级：remember（记忆）、understand（理解）、apply（应用）、analyze（分析）、evaluate（评估）、create（创造）。本文目标如下：

| 层级 | 目标描述 | 评估方式 |
| ---- | -------- | -------- |
| remember | 复述类型论发展史，从 STLC 到 System F 再到 Hindley-Milner 的演进 | 填空题 |
| understand | 解释结构类型与名义类型的语义差异，写出子类型规则 | 填空题、选择题 |
| apply | 运用协变、逆变、双变、不变规则预测子类型关系 | 代码修复题 |
| analyze | 拆解编译器的类型推导算法与控制流分析 | 选择题、代码修复题 |
| evaluate | 评估条件类型、映射类型、模板字面量类型的表达力 | 开放题 |
| create | 基于同伦类型论思想设计类型级证明与 DSL | 开放题 |

学习路径建议：先建立类型论的数学基础（STLC、System F、HM），再学习 TypeScript 的具体实现（结构化类型、子类型、泛型），最后挑战类型级编程与高级主题。

## 2. 历史动机与语言演进

### 2.1 类型论的史前时代

类型论（Type Theory）的起源可追溯至 1903 年 Bertrand Russell 在《数学原理》中提出的"分支类型论"（ramified type theory），旨在解决集合论中的 Russell 悖论。Russell 将对象分层为基础类型、谓词类型、谓词的谓词类型等，禁止"自指"导致的悖论。

1932 年 Alonzo Church 提出 λ 演算作为形式化计算模型，1940 年 Church 在《A Formulation of the Simple Theory of Types》中引入简单类型 λ 演算（Simply Typed Lambda Calculus, STLC），奠定现代类型论基础。

### 2.2 Simply Typed Lambda Calculus（STLC）

STLC 的语法：

$$
e ::= x \mid \lambda x : \tau . e \mid e_1 \, e_2 \mid c
$$

$$
\tau ::= \text{Base} \mid \tau_1 \to \tau_2
$$

类型规则（T-Var、T-Abs、T-App）：

$$
\frac{x : \tau \in \Gamma}{\Gamma \vdash x : \tau} \quad \text{(T-Var)}
$$

$$
\frac{\Gamma, x : \tau_1 \vdash e : \tau_2}{\Gamma \vdash \lambda x : \tau_1 . e : \tau_1 \to \tau_2} \quad \text{(T-Abs)}
$$

$$
\frac{\Gamma \vdash e_1 : \tau_1 \to \tau_2 \quad \Gamma \vdash e_2 : \tau_1}{\Gamma \vdash e_1 \, e_2 : \tau_2} \quad \text{(T-App)}
$$

STLC 的关键性质：

- **类型安全**（Progress + Preservation）：良类型的程序不会"卡住"
- **强规范化**：所有良类型项均能归约到正常形式
- **可判定性**：类型检查可在多项式时间内完成

### 2.3 System F：参数化多态

1971 年 Jean-Yves Girard 与 1974 年 John Reynolds 独立提出 System F（又称多态 λ 演算），引入类型量化：

$$
\tau ::= \ldots \mid \forall \alpha . \tau
$$

$$
\frac{\Gamma \vdash e : \tau \quad \alpha \notin \text{FV}(\Gamma)}{\Gamma \vdash \Lambda \alpha . e : \forall \alpha . \tau} \quad \text{(T-TAbs)}
$$

$$
\frac{\Gamma \vdash e : \forall \alpha . \tau}{\Gamma \vdash e [\tau'] : \tau[\alpha := \tau']} \quad \text{(T-TApp)}
$$

System F 表达力强但类型推导不可判定。TypeScript 的泛型可视为受限的 System F。

### 2.4 Hindley-Milner 类型推导

1969 年 J. Roger Hindley 与 1978 年 Robin Milner 独立发现算法 W，能在不显式标注类型的情况下推导项的主类型（principal type）。Algorithm W 基于 Robinson 统一算法（unification）：

$$
\text{unify}(\tau_1, \tau_2) = \sigma \text{ such that } \sigma(\tau_1) = \sigma(\tau_2)
$$

Hindley-Milner 系统支持 let 多态，是 ML 系语言（Standard ML、OCaml、Haskell、F#）的基础。TypeScript 的类型推导受 HM 影响，但因结构化类型与可空类型，复杂度更高。

### 2.5 TypeScript 的诞生

TypeScript 由 Microsoft 于 2012 年发布，首席架构师为 Anders Hejlsberg（也是 Turbo Pascal、Delphi、C# 的设计者）。设计目标：

1. 为 JavaScript 添加可选静态类型
2. 编译输出标准 JavaScript（ES3+）
3. 与现有 JavaScript 代码完全兼容
4. 支持大型应用开发（IDE、重构、文档）

TypeScript 的关键设计选择：

- **结构化类型**（structural typing）而非名义化类型
- **类型擦除**（type erasure）而非类型保留
- **渐进式类型化**（gradual typing）允许 any
- **类型推导**借鉴 HM 但适应结构化类型

### 2.6 TypeScript 版本演进

| 版本 | 年份 | 关键特性 |
| ---- | ---- | -------- |
| 0.8 | 2012 | 初版，基本类型系统 |
| 1.0 | 2014 | 声明文件 .d.ts |
| 1.5 | 2015 | ES6 模块、装饰器、namespace |
| 2.0 | 2016 | 严格模式、可空类型、never、readonly |
| 2.1 | 2016 | 映射类型、keyof、对象展开 |
| 2.4 | 2017 | 字符串枚举、弱类型检测 |
| 2.8 | 2018 | 条件类型、infer、内置工具类型 |
| 3.0 | 2018 | 元组展开、unknown、项目引用 |
| 3.7 | 2019 | 可选链、空值合并、断言函数 |
| 4.0 | 2020 | 可变元组、命名元组成员 |
| 4.1 | 2020 | 模板字面量类型、键重映射、递归条件类型 |
| 4.4 | 2021 | 控制流分析的别名、symbol 模板 |
| 4.7 | 2022 | Node ESM、 instantiation expressions |
| 5.0 | 2023 | 全新装饰器、const 类型参数、枚举改进 |
| 5.1 | 2023 | JSX 改进、unset getter |
| 5.2 | 2023 | using 显式资源管理 |
| 5.3 | 2023 | import attributes |
| 5.4 | 2024 | NoInfer、Object.groupBy 类型 |
| 5.5 | 2024 | inferred type predicates、ECMAScript Set 方法 |
| 5.6 | 2024 | disjoint set additions、ArrayBuffer |
| 5.7 | 2025 | path rewriting、ESM 默认 |
| 5.8 | 2025 | --erasableSyntaxOnly、增量改进 |
| 6.0 | 2026 | Beta 阶段：类型推断增强、新的工具类型 |

### 2.7 关键论文与里程碑

类型论的关键里程碑包括：

- 1940 Church 提出 STLC
- 1971 Girard 提出 System F
- 1974 Reynolds 独立提出 System F
- 1969/1978 Hindley-Milner 类型推导
- 1985 Cardelli 的"类型论"论文
- 1991 Martin-Löf 类型论
- 2002 Pierce 出版 *Types and Programming Languages*
- 2012 TypeScript 发布
- 2016 TypeScript 2.0 引入严格类型与可空类型
- 2018 TypeScript 2.8 引入条件类型

## 3. 形式化定义与类型论基础

### 3.1 类型系统的形式定义

类型系统由三元组组成：

$$
\text{TypeSystem} = (\text{Types}, \text{Rules}, \text{Inference})
$$

- **Types**：类型集合，如 number、string、Array<T>
- **Rules**：类型规则，如子类型、函数类型、积类型
- **Inference**：推导算法，将项映射到类型

TypeScript 的类型集合 $\mathcal{T}$ 形式化为：

$$
\mathcal{T} = \{ \text{primitives} \} \cup \{ \text{object types} \} \cup \{ \text{union/intersection} \} \cup \{ \text{conditional} \} \cup \{ \text{mapped} \} \cup \ldots
$$

### 3.2 类型判断

类型判断 $\Gamma \vdash e : \tau$ 表示"在类型环境 $\Gamma$ 下，表达式 $e$ 具有类型 $\tau$"。$\Gamma$ 是变量到类型的映射：

$$
\Gamma = \{ x_1 : \tau_1, x_2 : \tau_2, \ldots \}
$$

### 3.3 静态语义规则

TypeScript 的关键类型规则：

#### 3.3.1 变量规则

$$
\frac{x : \tau \in \Gamma}{\Gamma \vdash x : \tau} \quad \text{(Var)}
$$

#### 3.3.2 函数抽象

$$
\frac{\Gamma, x : \tau_1 \vdash e : \tau_2}{\Gamma \vdash (x : \tau_1) \Rightarrow e : \tau_1 \to \tau_2} \quad \text{(Abs)}
$$

#### 3.3.3 函数应用

$$
\frac{\Gamma \vdash f : \tau_1 \to \tau_2 \quad \Gamma \vdash a : \tau_1' \quad \tau_1' <: \tau_1}{\Gamma \vdash f(a) : \tau_2} \quad \text{(App)}
$$

其中 $<:$ 是子类型关系。

#### 3.3.4 对象类型

$$
\frac{\forall i \in I . \Gamma \vdash e_i : \tau_i \quad \text{label } l_i \text{ distinct}}{\Gamma \vdash \{ l_i : e_i \}_{i \in I} : \{ l_i : \tau_i \}_{i \in I}} \quad \text{(Obj)}
$$

#### 3.3.5 字段访问

$$
\frac{\Gamma \vdash e : \{ l : \tau \}}{\Gamma \vdash e.l : \tau} \quad \text{(Proj)}
$$

### 3.4 进展与保持定理

类型系统的健全性（soundness）由两条定理保证：

- **进展**（Progress）：若 $\emptyset \vdash e : \tau$，则 $e$ 是值或存在 $e'$ 使 $e \to e'$
- **保持**（Preservation）：若 $\Gamma \vdash e : \tau$ 且 $e \to e'$，则 $\Gamma \vdash e' : \tau$

TypeScript 并非完全健全（因 any 类型与类型断言），但其严格模式下的子集满足这两条性质。

## 4. 类型论层级：STLC → System F → HM

### 4.1 Simply Typed Lambda Calculus 详解

STLC 的语法与语义已在 2.2 节给出。其关键特性：

1. **类型显式标注**：$\lambda x : \tau . e$ 中 $\tau$ 必须显式写出
2. **强规范化**：所有良类型项均能归约到正常形式
3. **可判定**：类型检查可机械完成

STLC 的局限：无法表达多态。例如 `id = \lambda x : \tau. x` 在 STLC 中必须为每种类型重复定义。

### 4.2 System F 的参数化多态

System F 引入类型抽象 $\Lambda \alpha. e$ 与类型应用 $e[\tau]$：

```typescript
// TypeScript 中的泛型函数对应 System F 的类型抽象
function identity<T>(x: T): T { return x; }

// 内部语义
// Λα. λx:α. x
```

System F 的强规范化证明较复杂，需用 Girard 的候选集方法。System F 的类型推导不可判定，故 TypeScript 仅支持受限的局部类型推导。

### 4.3 Hindley-Milner 与 Algorithm W

HM 系统的语法：

$$
e ::= x \mid \lambda x. e \mid e_1 \, e_2 \mid \text{let } x = e_1 \text{ in } e_2
$$

注意 $\lambda x. e$ 中无类型标注。Algorithm W 步骤：

1. 为每个未类型化的 λ 参数分配新的类型变量
2. 自底向上类型化项
3. 遇到不一致时调用 unify 进行统一
4. 通用化（generalize）let 绑定的变量

```
Algorithm W(Γ, e):
  if e is variable x:
    return Γ(x)
  if e is λx.e':
    α := fresh type variable
    τ' := W(Γ ∪ {x:α}, e')
    return α → τ'
  if e is e1 e2:
    τ1 := W(Γ, e1); τ2 := W(Γ, e2)
    α := fresh type variable
    unify(τ1, τ2 → α)
    return α
  if e is let x = e1 in e2:
    τ1 := W(Γ, e1)
    σ := generalize(Γ, τ1)
    return W(Γ ∪ {x:σ}, e2)
```

TypeScript 借鉴 HM 的思想，但因结构化类型与子类型关系，使用约束求解而非纯统一。

### 4.4 TypeScript 在类型论层级中的位置

| 系统 | 表达力 | 类型推导 | TypeScript 关系 |
| ---- | ------ | -------- | --------------- |
| STLC | 弱（无多态） | 可判定 | 类似基础类型 |
| System F | 强（参数化多态） | 不可判定 | 泛型是受限 System F |
| HM | 中（let 多态） | 可判定 | 类型推导受 HM 影响 |
| System F<: | 强（子类型多态） | 不可判定 | TypeScript 接近 |
| Dependent Types | 最强（依赖类型） | 不可判定 | 不支持 |

TypeScript 是结构化类型 + 子类型 + 参数化多态的混合系统，可视为 System F<: 的实现变体。

## 5. 结构类型与名义类型

### 5.1 结构化类型（Structural Typing）

TypeScript 默认采用结构化类型，类型兼容性基于成员的结构：

```typescript
interface Point2D { x: number; y: number; }
interface Coordinate { x: number; y: number; }

const p: Point2D = { x: 1, y: 2 };
const c: Coordinate = p; // 合法：结构相同
```

结构化子类型规则的形式化：

$$
\frac{\forall l_i \in L(T) . l_i \in L(S) \land S.l_i <: T.l_i}{S <: T} \quad \text{(Width Subtyping)}
$$

即 S 是 T 的子类型当且仅当 S 拥有 T 的所有成员，且对应成员类型兼容。

### 5.2 名义化类型（Nominal Typing）

名义化类型系统（Java、C#、Rust、Swift）中，类型兼容性基于显式声明：

```java
// Java 示例
class Point2D { int x; int y; }
class Coordinate { int x; int y; }

Point2D p = new Coordinate();  // 编译错误
```

名义化的形式规则：

$$
\frac{S \text{ declared as subtype of } T}{S <: T} \quad \text{(Nominal Subtyping)}
$$

### 5.3 结构化 vs 名义化对比

| 特性 | 结构化类型 | 名义化类型 |
| ---- | ---------- | ---------- |
| 灵活性 | 高（鸭子类型） | 低（需显式声明） |
| 安全性 | 较低（可能意外兼容） | 较高 |
| 重构 | 可能遗漏不兼容 | 编译器捕获 |
| 互操作 | JSON/JS 天然适配 | 需类型转换 |
| 表达力 | "能做什么" | "是什么" |
| 类型推导 | 较易 | 较难 |

### 5.4 在 TypeScript 中模拟名义化

#### 5.4.1 品牌类型（Branded Type）

```typescript
type Brand<T, B> = T & { __brand: B };

type USD = Brand<number, 'USD'>;
type EUR = Brand<number, 'EUR'>;

function processUSD(amount: USD): void { /* ... */ }

const usd = 100 as USD;
const eur = 100 as EUR;

processUSD(usd); // 合法
processUSD(eur); // 类型错误：EUR 不能赋值给 USD
```

品牌类型利用"幽灵字段"打破结构等价。`__brand` 在运行时不存在，仅作类型层标记。

#### 5.4.2 类 + 私有属性

```typescript
class USD {
  private __brand: 'USD' = 'USD';
  constructor(public value: number) {}
}

class EUR {
  private __brand: 'EUR' = 'EUR';
  constructor(public value: number) {}
}

function processUSD(amount: USD): void { /* ... */ }

processUSD(new USD(100)); // 合法
processUSD(new EUR(100)); // 类型错误
```

私有属性使类不可结构兼容，从而实现名义化语义。但需注意 `private` 关键字在编译后会被擦除。

#### 5.4.3 unique symbol

```typescript
const USDTag: unique symbol = Symbol('USD');
type USD = { value: number; [USDTag]: void };

const usd: USD = { value: 100, [USDTag]: undefined };
```

unique symbol 是 TypeScript 中唯一不可重复的符号字面量类型，可作为名义化标记。

### 5.5 结构化类型的多余属性检查

对象字面量直接赋值时触发多余属性检查（Excess Property Check）：

```typescript
interface Point2D { x: number; y: number; }

const p: Point2D = { x: 1, y: 2, z: 3 }; // 错误：z 不在 Point2D
const p2: Point2D = { x: 1, y: 2, z: 3 } as Point2D; // 合法（断言绕过）
const obj = { x: 1, y: 2, z: 3 };
const p3: Point2D = obj; // 合法（非字面量不检查）
```

多余属性检查是结构化类型系统的安全补丁，仅对字面量直接赋值生效。

## 6. 子类型理论

### 6.1 子类型关系

子类型关系 $S <: T$ 表示"S 是 T 的子类型"，即类型 S 的值可安全地用在期望 T 的位置。子类型关系的规则：

$$
\frac{S <: T \quad T <: U}{S <: U} \quad \text{(Trans)}
\quad
\frac{}{T <: T} \quad \text{(Refl)}
\quad
\frac{S <: T \quad T <: S}{S = T} \quad \text{(AntiSym)}
$$

子类型关系构成偏序（reflexive, transitive, antisymmetric）。

### 6.2 宽度子类型（Width Subtyping）

对象类型 S 比 T 拥有更多属性时，S 是 T 的子类型：

$$
\frac{\{ l_i : \tau_i \}_{i \in I \cup J} \quad J \cap I = \emptyset}{\{ l_i : \tau_i \}_{i \in I \cup J} <: \{ l_i : \tau_i \}_{i \in I}} \quad \text{(Width)}
$$

```typescript
interface Point2D { x: number; y: number; }
interface Point3D { x: number; y: number; z: number; }

const p3: Point3D = { x: 1, y: 2, z: 3 };
const p2: Point2D = p3; // 合法：Point3D 是 Point2D 的子类型
```

### 6.3 深度子类型（Depth Subtyping）

对象成员类型递归满足子类型关系：

$$
\frac{S <: T}{\{ l : S \} <: \{ l : T \}} \quad \text{(Depth)}
$$

深度子类型对可变字段不安全，TypeScript 仅对只读字段应用深度子类型。

### 6.4 函数子类型

函数子类型规则涉及参数与返回值的子类型方向：

$$
\frac{\tau_1' <: \tau_1 \quad \tau_2 <: \tau_2'}{\tau_1 \to \tau_2 <: \tau_1' \to \tau_2'} \quad \text{(Function Subtyping)}
$$

即函数参数逆变，返回值协变。这条规则确保函数可安全替换。

#### 6.4.1 安全性论证

设 $f : \tau_1 \to \tau_2$，$g : \tau_1' \to \tau_2'$，且 $\tau_1' <: \tau_1, \tau_2 <: \tau_2'$。

要证明 $g$ 可替代 $f$，即 $g$ 接收任何 $f$ 能接收的输入并产生兼容输出：

- $f$ 接收 $\tau_1$ 类型输入。$g$ 接收 $\tau_1'$ 类型输入。若 $\tau_1' <: \tau_1$，则 $g$ 能接收比 $f$ 更广的输入。但若用 $g$ 替代 $f$，调用方传入的是 $\tau_1$，需要 $g$ 接收 $\tau_1$，故需 $\tau_1 <: \tau_1'$，即参数逆变。

- $f$ 返回 $\tau_2$ 类型输出。$g$ 返回 $\tau_2'$ 类型输出。调用方期望 $\tau_2$，需要 $g$ 的输出兼容，即 $\tau_2' <: \tau_2$，即返回值协变。

### 6.5 协变与逆变

#### 6.5.1 基本概念

设 Sub 是 Super 的子类型：

- **协变**（Covariant）：`Container<Sub>` 是 `Container<Super>` 的子类型。方向一致。
- **逆变**（Contravariant）：`Container<Super>` 是 `Container<Sub>` 的子类型。方向相反。
- **不变**（Invariant）：`Container<Sub>` 和 `Container<Super>` 无子类型关系。
- **双变**（Bivariant）：两者互为子类型。

#### 6.5.2 函数参数的逆变

```typescript
class Animal { name: string = 'animal'; }
class Dog extends Animal { breed: string = 'dog'; }

type AnimalHandler = (animal: Animal) => void;
type DogHandler = (dog: Dog) => void;

// DogHandler 可以当作 AnimalHandler 使用吗？
// 不能！因为 AnimalHandler 可能传入任意 Animal（如 Cat）
// 而 DogHandler 期望接收 Dog，可能访问 Dog 特有的属性

const dogHandler: DogHandler = (dog) => console.log(dog.breed);
const animalHandler: AnimalHandler = dogHandler; // 不安全
animalHandler(new Animal()); // dog.breed 是 undefined
```

TypeScript 默认函数参数是双变的（为了实用性），开启 `strictFunctionTypes` 后变为逆变。

#### 6.5.3 函数返回值的协变

```typescript
type AnimalFactory = () => Animal;
type DogFactory = () => Dog;

const dogFactory: DogFactory = () => new Dog();
const animalFactory: AnimalFactory = dogFactory; // 安全：Dog 是 Animal 的子类型
```

返回值协变是类型安全的，因为调用方期望 Animal，得到 Dog 是兼容的。

#### 6.5.4 TypeScript 中的协变/逆变规则

| 位置 | 默认行为 | strictFunctionTypes | 说明 |
| ---- | -------- | ------------------- | ---- |
| 函数参数 | 双变 | 逆变 | 严格模式下更安全 |
| 函数返回值 | 协变 | 协变 | 始终协变 |
| 只读属性 | 协变 | 协变 | 只读属性安全 |
| 可写属性 | 不变 | 不变 | 可写属性需双向兼容 |
| 数组 | 协变 | 协变 | 数组作为只读容器 |
| Promise | 协变 | 协变 | Promise<T> 协变于 T |
| ReadonlyArray | 协变 | 协变 | 只读数组协变 |

### 6.6 条件类型中的协变/逆变推断

TypeScript 的 `infer` 关键字在条件类型中遵循协变/逆变规则：

```typescript
type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;
// R 在返回值位置，协变推断

type ParamTypeOf<T> = T extends (arg: infer P) => any ? P : never;
// P 在参数位置，逆变推断

// 多个推断位置时，协变位置取联合类型，逆变位置取交叉类型
type FlattenedReturnType<T> = T extends (...args: any[]) => infer R extends any[]
  ? R[number]
  : never;
```

#### 6.6.1 协变位置多个推断 → 联合类型

```typescript
type CovariantInfer<T> = T extends {
  a: infer R;
  b: infer R;
} ? R : never;

type Result = CovariantInfer<{ a: string; b: number }>;
// string | number（协变位置，取联合类型）
```

#### 6.6.2 逆变位置多个推断 → 交叉类型

```typescript
type ContravariantInfer<T> = T extends {
  a: (x: infer R) => void;
  b: (x: infer R) => void;
} ? R : never;

type Result2 = ContravariantInfer<{
  a: (x: string) => void;
  b: (x: number) => void;
}>;
// string & number（逆变位置，取交叉类型，此处为 never）
```

协变位置与逆变位置的差异源于类型安全的需要：

- 协变位置（输出）：可返回任一类型，故取联合
- 逆变位置（输入）：必须接受所有类型，故取交叉

## 7. 类型推导算法

### 7.1 TypeScript 的类型推导场景

TypeScript 在以下场景执行类型推导：

1. **变量声明**：`let x = 1` 推导 x 为 number
2. **函数返回值**：根据 return 语句推导
3. **函数参数**：上下文类型化
4. **泛型参数**：根据实参推导
5. **控制流分析**：根据条件分支窄化
6. **最佳通用类型**：数组字面量等

### 7.2 上下文类型化

上下文类型化（Contextual Typing）是 TypeScript 的特色：根据期望类型推导表达式类型。

```typescript
// 数组元素类型由参数类型决定
window.onmousedown = function (mouseEvent) {
  console.log(mouseEvent.button);  // 推导 mouseEvent 为 MouseEvent
};

// 字面量类型由期望类型决定
const target: 'top' | 'bottom' | 'left' | 'right' = 'top';
```

上下文类型化的形式化：

$$
\frac{\Gamma \vdash e \leadsto \tau \quad \tau' <: \tau}{\Gamma \vdash e : \tau'} \quad \text{(Contextual)}
$$

其中 $\tau'$ 是上下文期望类型，$e \leadsto \tau$ 是初始推导。

### 7.3 最佳通用类型

数组字面量推导需要找"最佳通用类型"（Best Common Type）：

```typescript
const arr = [new Dog(), new Cat(), new Bird()];
// arr 类型：Dog[] | Cat[] | Bird[] 还是 Animal[]？

// TypeScript 选择最具体的通用超类型
// 若 Dog、Cat、Bird 都继承自 Animal，则 arr: Animal[]
```

最佳通用类型算法：

1. 收集所有候选类型
2. 找到所有其他类型的超类型
3. 若存在唯一最佳，返回之
4. 否则返回联合类型或要求显式标注

### 7.4 控制流分析

TypeScript 通过控制流分析（Control Flow Analysis）窄化类型：

```typescript
function example(x: string | number) {
  if (typeof x === 'string') {
    x.toUpperCase();  // x: string
  } else {
    x.toFixed(2);  // x: number
  }
}
```

控制流分析的形式化：

$$
\frac{\Gamma \vdash e : \tau_1 \lor \tau_2 \quad \text{typeof } e \text{ is } \tau_1 \text{ in branch}}{\Gamma, \text{branch} \vdash e : \tau_1} \quad \text{(Narrow)}
$$

#### 7.4.1 类型守卫

类型守卫（Type Guard）是返回类型谓词的函数：

```typescript
function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function process(v: string | number) {
  if (isString(v)) {
    v.toUpperCase();  // v: string
  } else {
    v.toFixed(2);  // v: number
  }
}
```

内置类型守卫：

- `typeof v === 'string'`、`typeof v === 'number'` 等
- `v instanceof MyClass`
- `'prop' in v`
- `Array.isArray(v)`
- 用户定义的 `v is T` 谓词

#### 7.4.2 可辨识联合

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.size ** 2;
    case 'rectangle': return s.width * s.height;
  }
}
```

可辨识联合（Discriminated Union）通过共同的字面量字段区分变体，TypeScript 在 switch 中自动窄化。

#### 7.4.3 穷尽检查

```typescript
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.size ** 2;
    case 'rectangle': return s.width * s.height;
    default:
      const _exhaustive: never = s;  // 编译时检查穷尽
      throw new Error(`Unknown shape: ${_exhaustive}`);
  }
}
```

`never` 类型用于编译时穷尽检查。若新增 Shape 变体未在 switch 中处理，`_exhaustive: never` 会报错。

### 7.5 类型推导的局限

TypeScript 类型推导有若干局限：

1. **不能跨函数边界**：函数返回类型在函数内部推导，外部不可见
2. **不能推导泛型约束**：需显式 `T extends ...`
3. **不能推导高阶类型**：缺少 Higher-Kinded Types
4. **不能推导条件类型分支**：条件类型在编译期求值

## 8. 泛型的类型论基础

### 8.1 参数化多态

TypeScript 的泛型对应 System F 的参数化多态：

```typescript
function identity<T>(x: T): T {
  return x;
}

// 调用
identity<string>('hello');  // 显式类型实参
identity('hello');          // 推导类型实参
```

形式化：

$$
\frac{\Gamma \vdash e : \forall \alpha. \tau}{\Gamma \vdash e[\tau'] : \tau[\alpha := \tau']} \quad \text{(T-App)}
$$

泛型函数 `identity<T>` 的类型为 $\forall \alpha. \alpha \to \alpha$。

### 8.2 泛型约束

```typescript
function length<T extends { length: number }>(x: T): number {
  return x.length;
}

length('hello');  // OK
length([1, 2, 3]);  // OK
length(123);  // 错误：number 没有 length
```

形式化为受限多态（bounded polymorphism）：

$$
\frac{\Gamma, \alpha <: \tau_1 \vdash e : \tau_2}{\Gamma \vdash \Lambda \alpha <: \tau_1. e : \forall \alpha <: \tau_1. \tau_2} \quad \text{(T-TAbs-Bounded)}
$$

System F<: 是支持受限多态的扩展，由 Cardelli 与 Wegner（1985）提出。

### 8.3 泛型参数推导

TypeScript 根据实参推导泛型参数：

```typescript
function pair<A, B>(a: A, b: B): [A, B] { return [a, b]; }

pair('hello', 42);  // 推导 A = string, B = number
pair<string, number>('hello', 42);  // 显式
```

推导算法简化版：

1. 收集所有使用类型参数的位置
2. 根据实参类型与约束建立方程
3. 求解方程组（类似 unify）
4. 未确定的类型参数取默认约束

### 8.4 const 类型参数

TypeScript 5.0 引入 const 类型参数：

```typescript
function tuple<const T extends readonly unknown[]>(...args: T): T {
  return args;
}

const t = tuple(1, 'hello', true);
// T = readonly [1, "hello", true]
// 而非 [number, string, boolean]
```

const 修饰符使推导的字面量类型更精确。

### 8.5 泛型的运行时行为

TypeScript 泛型在编译时被擦除：

```typescript
// 源码
function identity<T>(x: T): T { return x; }
const container: Array<number> = [1, 2, 3];

// 编译后
function identity(x) { return x; }
const container = [1, 2, 3];
```

泛型不参与运行时，无法在运行时获取泛型参数类型。这是 TypeScript 与 Java/C# 泛型擦除的关键差异：

- Java 的泛型擦除在 JVM 层，但运行时仍可通过反射获取部分信息
- TypeScript 的擦除在编译层，运行时无任何类型信息

## 9. 条件类型的类型论基础

### 9.1 条件类型语法

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>;  // true
type B = IsString<42>;        // false
type C = IsString<string | number>;  // boolean（分布式条件类型）
```

条件类型的形式语义：

$$
\llbracket T \text{ extends } U \text{ ? } X \text{ : } Y \rrbracket = \begin{cases}
X & \text{if } T <: U \\
Y & \text{otherwise}
\end{cases}
$$

### 9.2 分布式条件类型

当 T 是联合类型 `T1 | T2 | ... | Tn` 时，条件类型分布应用：

$$
\llbracket (T_1 \lor T_2) \text{ extends } U \text{ ? } X \text{ : } Y \rrbracket = \llbracket T_1 \text{ extends } U \text{ ? } X \text{ : } Y \rrbracket \lor \llbracket T_2 \text{ extends } U \text{ ? } X \text{ : } Y \rrbracket
$$

```typescript
type ToArray<T> = T extends any ? T[] : never;

type R = ToArray<string | number>;
// string[] | number[]（分布应用）
// 而非 (string | number)[]
```

阻止分布的方式：用方括号包裹：

```typescript
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type R2 = ToArrayNonDist<string | number>;
// (string | number)[]
```

### 9.3 infer 关键字

`infer` 在条件类型中声明类型变量：

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
type PromiseType<T> = T extends Promise<infer U> ? U : T;
```

`infer R` 表示"在 U 中找到一个类型 R 使 T <: U[R]"。形式化为存在量化：

$$
\llbracket T \text{ extends } U[\alpha] \text{ ? } X[\alpha] \text{ : } Y \rrbracket = \begin{cases}
X[\alpha := \tau] & \text{if } \exists \tau. T <: U[\tau] \\
Y & \text{otherwise}
\end{cases}
$$

### 9.4 协变/逆变与 infer

infer 在协变位置取联合类型，在逆变位置取交叉类型：

```typescript
type CovInfer<T> = T extends { a: infer R; b: infer R } ? R : never;
type R1 = CovInfer<{ a: string; b: number }>;  // string | number

type ContravInfer<T> = T extends { a: (x: infer R) => void; b: (x: infer R) => void } ? R : never;
type R2 = ContravInfer<{ a: (x: string) => void; b: (x: number) => void }>;  // string & number (= never)
```

### 9.5 内置工具类型

TypeScript 提供多个基于条件类型的工具类型：

```typescript
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T extends null | undefined ? never : T;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type InstanceType<T> = T extends new (...args: any[]) => infer R ? R : never;
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
```

### 9.6 条件类型的递归

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type DeepPromise<T> = T extends Promise<infer U> ? DeepPromise<U> : T;
```

递归条件类型在 TypeScript 4.1 后支持，但有深度限制（默认 50 层）。

## 10. 映射类型与同伦类型论

### 10.1 映射类型语法

映射类型（Mapped Types）基于现有类型的属性构造新类型：

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Optional<T> = {
  [P in keyof T]?: T[P];
};

type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};
```

形式化：

$$
\llbracket \{ [P \in \text{keys}(T)] : \tau[P] \} \rrbracket = \{ l_i : \tau[l_i] \}_{l_i \in \text{keys}(T)}
$$

### 10.2 同伦类型论视角

同伦类型论（Homotopy Type Theory, HoTT）将类型视为空间，类型等价视为路径。映射类型可视为类型空间的连续映射：

$$
\text{Mapped} : \text{Type} \to \text{Type}
$$

每个映射类型对应一个类型函数，将输入类型映射到输出类型。TypeScript 的映射类型是受限的类型级函数。

### 10.3 映射类型的修饰符

```typescript
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];  // 移除 readonly
};

type Required<T> = {
  [P in keyof T]-?: T[P];  // 移除可选
};
```

`-readonly` 与 `-?` 是修饰符移除语法，对应类型空间中的反向操作。

### 10.4 键重映射（Key Remapping）

TypeScript 4.1 引入键重映射：

```typescript
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

interface Person { name: string; age: number; }
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

形式化：

$$
\llbracket \{ [P \in \text{keys}(T)] \text{ as } f(P) : \tau[P] \} \rrbracket = \{ f(l_i) : \tau[l_i] \}_{l_i \in \text{keys}(T)}
$$

其中 $f$ 是类型级函数（此处为模板字面量类型）。

### 10.5 过滤映射

通过 `never` 键过滤属性：

```typescript
type RemoveKindField<T> = {
  [P in keyof T as P extends 'kind' ? never : P]: T[P];
};

interface Shape { kind: string; radius: number; }
type WithoutKind = RemoveKindField<Shape>;
// { radius: number }
```

### 10.6 同态映射

同态映射（Homomorphic Mapped Types）保持原类型的修饰符：

```typescript
interface Foo { readonly a: string; b?: number; }

type Homomorphic<T> = { [P in keyof T]: T[P] };
type Foo2 = Homomorphic<Foo>;
// { readonly a: string; b?: number }（保留修饰符）
```

非同态映射则不保留修饰符。

## 11. 类型级别的计算与图灵完备性

### 11.1 类型级自然数表示

TypeScript 可用元组长度表示自然数：

```typescript
type Zero = [];
type Succ<N extends any[]> = [...N, 1];

type One = Succ<Zero>;   // [1]，长度 1
type Two = Succ<One>;    // [1, 1]，长度 2
type Three = Succ<Two>;  // [1, 1, 1]，长度 3

type ToNum<N extends any[]> = N['length'];
type N3 = ToNum<Three>;  // 3
```

### 11.2 类型级加法

```typescript
type Add<A extends any[], B extends any[]> = [...A, ...B];
type AddNum<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length'];

type BuildTuple<N extends number, T extends any[] = []> =
  T['length'] extends N ? T : BuildTuple<N, [...T, 1]>;

type Sum = AddNum<2, 3>;  // 5
```

### 11.3 类型级条件分支

```typescript
type If<Cond extends boolean, Then, Else> =
  Cond extends true ? Then : Else;

type Result = If<true, 'yes', 'no'>;  // 'yes'
```

### 11.4 类型级斐波那契

```typescript
type Fibonacci<
  N extends number,
  T extends number[] = [1],
  U extends number[] = []
> = T['length'] extends N ? U['length'] : Fibonacci<N, [...T, 1], [...U, ...T]>;

type Fib5 = Fibonacci<5>;  // 5
type Fib10 = Fibonacci<10>;  // 55
```

### 11.5 图灵完备性证明

TypeScript 类型系统的图灵完备性可通过以下要素证明：

1. **自然数表示**：元组长度
2. **条件分支**：条件类型
3. **递归**：递归类型别名（4.1+）
4. **无界循环**：条件类型的递归求值

已有学者在 TypeScript 类型系统中实现：

- 图灵机
- Lambda 演算
- SKI 组合子
- 元胞自动机（Rule 110）
- Brainfuck 解释器

以下是一个简单的类型级 Brainfuck 状态机示例：

```typescript
// 简化版：类型级计数器
type Counter<N extends number, T extends any[] = []> =
  T['length'] extends N ? T : Counter<N, [...T, 1]>;
```

### 11.6 类型级计算的局限

类型级计算虽然图灵完备，但有显著局限：

1. **递归深度限制**：默认 50 层，可配置但仍有上限
2. **编译时开销**：复杂类型级计算显著拖慢编译
3. **可读性差**：类型级代码晦涩难懂
4. **无运行时效果**：类型级计算不影响运行时
5. **调试困难**：错误信息难以解读

实用边界：类型级计算适合 DSL、配置校验、文档生成等静态场景。运行时计算仍需 JavaScript。

### 11.7 模板字面量类型

```typescript
type EventName = `on${Capitalize<string>}`;

type CSSProperty = `${string}-${string}`;
```

模板字面量类型可与其他类型级特性组合：

```typescript
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

type Setters<T> = {
  [P in keyof T as `set${Capitalize<string & P>}`]: (v: T[P]) => void;
};
```

## 12. 声明合并理论

### 12.1 声明合并的语义

TypeScript 允许同名的接口、命名空间、函数等多次声明，编译时合并为单一声明。形式化：

$$
\text{Merge}(D_1, D_2) = D_1 \sqcup D_2
$$

其中 $\sqcup$ 是声明合并算子，规则因声明类型而异。

### 12.2 接口合并

```typescript
interface Box { height: number; }
interface Box { width: number; }

// 合并后等价于
interface Box { height: number; width: number; }
```

合并规则：

1. 同名属性的成员类型必须相同（或可赋值）
2. 不同名属性合并到同一接口
3. 方法声明视为函数重载

### 12.3 函数合并

```typescript
function f(x: string): string;
function f(x: number): number;
function f(x: any): any { return x; }

f('hello');  // string
f(42);        // number
```

函数重载合并规则：

1. 后出现的重载优先级更高
2. 实现签名不可见
3. 必须存在实现

### 12.4 命名空间合并

```typescript
namespace Animals {
  export class Dog {}
}

namespace Animals {
  export class Cat {}
  export function feed(d: Dog) {}
}

// 合并后
// Animals.Dog, Animals.Cat, Animals.feed 都可见
```

### 12.5 命名空间与函数合并

```typescript
function f(): void {}
namespace f {
  export const version = '1.0';
}

f();          // 调用函数
f.version;    // 访问命名空间成员
```

### 12.6 声明合并的应用

#### 12.6.1 扩展第三方类型

```typescript
// 扩展 Express 的 Request 类型
declare module 'express' {
  interface Request {
    user?: User;
  }
}

// 扩展 Window
declare global {
  interface Window {
    myApp: MyApp;
  }
}
```

#### 12.6.2 模块增强

```typescript
// my-module.d.ts
declare module 'my-module' {
  export function newFunction(): void;
}
```

### 12.7 声明合并的陷阱

1. **意外合并**：同名接口可能被无意合并
2. **顺序敏感**：函数重载顺序影响类型匹配
3. **不可合并冲突**：同名属性类型不一致会报错
4. **跨文件合并**：全局声明合并可能引发意外

## 13. 控制流分析

### 13.1 控制流图

TypeScript 维护每个变量的控制流图（Control Flow Graph, CFG），记录变量在不同代码路径上的类型。

```typescript
function example(x: string | number | null) {
  // x: string | number | null
  if (x === null) return;
  // x: string | number
  if (typeof x === 'string') {
    // x: string
    x.toUpperCase();
  } else {
    // x: number
    x.toFixed(2);
  }
}
```

### 13.2 窄化机制

#### 13.2.1 typeof 窄化

```typescript
function f(x: string | number) {
  if (typeof x === 'string') {
    x.toUpperCase();  // x: string
  }
}
```

#### 13.2.2 instanceof 窄化

```typescript
function f(x: Date | string) {
  if (x instanceof Date) {
    x.getTime();  // x: Date
  }
}
```

#### 13.2.3 in 窄化

```typescript
interface A { a: string; }
interface B { b: number; }

function f(x: A | B) {
  if ('a' in x) {
    x.a;  // x: A
  } else {
    x.b;  // x: B
  }
}
```

#### 13.2.4 字面量窄化

```typescript
type Direction = 'left' | 'right';

function f(d: Direction) {
  if (d === 'left') {
    // d: 'left'
  }
}
```

#### 13.2.5 自定义类型守卫

```typescript
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isNonNull<T>(x: T): x is NonNullable<T> {
  return x !== null && x !== undefined;
}
```

#### 13.2.6 断言函数

```typescript
function assertNonNull<T>(x: T): asserts x is NonNullable<T> {
  if (x === null || x === undefined) throw new Error('non-null');
}

function process(x: string | null) {
  assertNonNull(x);
  x.toUpperCase();  // x: string
}
```

### 13.3 别名与控制流

TypeScript 4.4 起支持别名的控制流分析：

```typescript
function f(x: string | number) {
  const isString = typeof x === 'string';
  if (isString) {
    x.toUpperCase();  // x: string（通过别名窄化）
  }
}
```

### 13.4 控制流的局限

1. **不能跨函数**：函数内的窄化对调用方不可见
2. **不能跨模块**：模块边界的类型保留原始声明
3. **不能反向传播**：修改原变量不影响别名

```typescript
function f() {
  let x: string | number = 'hello';
  const alias = x;
  x = 42;
  // alias 仍是 string，不会因 x 变化而变
}
```

### 13.5 穷尽检查与 never

```typescript
type Color = 'red' | 'green' | 'blue';

function toHex(c: Color): string {
  switch (c) {
    case 'red': return '#ff0000';
    case 'green': return '#00ff00';
    case 'blue': return '#0000ff';
    default:
      const _: never = c;  // 穷尽检查
      throw new Error();
  }
}
```

新增 Color 变体时，default 分支的 `never` 赋值会报错，提示开发者补全 switch。

## 14. 类型擦除与编译模型

### 14.1 TypeScript 的编译模型

TypeScript 在编译时执行类型检查，然后擦除所有类型信息，输出纯 JavaScript：

```typescript
// 源码
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return `Hello, ${user.name}`;
}

const u: User = { name: 'Alice', age: 30 };
console.log(greet(u));
```

编译输出：

```javascript
function greet(user) {
  return `Hello, ${user.name}`;
}
const u = { name: 'Alice', age: 30 };
console.log(greet(u));
```

所有类型标注（interface、type、泛型参数、类型断言）在编译后完全消失。

### 14.2 类型擦除的影响

#### 14.2.1 无运行时类型检查

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string'; // 必须手动实现
}
// 不能用 value instanceof string 或 typeof value === "String"
```

#### 14.2.2 泛型不保留

```typescript
class Container<T> {
  constructor(public value: T) {}
}
const c = new Container<number>(42);
// 运行时无法判断 c 的泛型参数是 number
```

#### 14.2.3 枚举的特殊处理

```typescript
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
}
// 编译为 JavaScript 对象，是少数保留运行时信息的类型构造
```

#### 14.2.4 类部分保留

```typescript
class Person {
  constructor(public name: string) {}
}
// class 声明保留（JavaScript 类），但类型标注擦除
// instanceof Person 在运行时可用
```

### 14.3 运行时类型信息的替代方案

#### 14.3.1 Zod / io-ts / class-validator

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number().min(0).max(150),
});

type User = z.infer<typeof UserSchema>; // 从 schema 推断类型

const result = UserSchema.parse(unknownData); // 运行时验证
```

#### 14.3.2 自定义类型守卫

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof (value as User).name === 'string'
  );
}
```

#### 14.3.3 装饰器元数据

```typescript
import 'reflect-metadata';

class UserService {
  @Reflect.metadata('design:type', String)
  name: string;
}
```

### 14.4 类型擦除的设计哲学

TypeScript 选择类型擦除的原因：

1. **与 JavaScript 完全兼容**：编译输出是标准 JavaScript，可在任何 JS 环境运行
2. **零运行时开销**：类型检查只在编译时执行，不影响运行时性能
3. **渐进式采用**：可在现有 JavaScript 项目中逐步添加类型
4. **工具链友好**：类型信息仅用于编辑器和编译器，不改变运行时行为

这与 Java/C# 的泛型擦除不同。Java 的泛型擦除在 JVM 层面，而 TypeScript 的类型擦除是在编译层面，彻底移除所有类型构造。

## 15. 类型论高级主题

### 15.1 高阶类型（Higher-Kinded Types）

TypeScript 不直接支持高阶类型（如 `F<_>`），但可通过多种技术模拟：

```typescript
// 模拟高阶类型：functor
interface Functor<F> {
  map<A, B>(f: (a: A) => B, fa: F<A>): F<B>;
}

// 不可直接写 F<A>，需用具体类型
type Maybe<A> = A | null;
type Either<L, R> = { tag: 'left'; value: L } | { tag: 'right'; value: R };
```

TypeScript 社区常用"HKT 模拟"库（如 fp-ts）通过类型级记录实现：

```typescript
interface HKT<URI, A> { _URI: URI; _A: A; }
interface Functor<F> {
  URI: F;
  map<A, B>(f: (a: A) => B, fa: HKT<F, A>): HKT<F, B>;
}
```

### 15.2 依赖类型

依赖类型（Dependent Types）允许类型依赖于值，是类型论的最强形式。TypeScript 不支持真正的依赖类型，但可通过字面量类型部分模拟：

```typescript
// 字面量类型作为"依赖"的近似
type Repeated<S extends string, N extends number> =
  N extends 0 ? '' : `${S}${Repeated<S, Subtract<N, 1>>}`;

type Subtract<A extends number, B extends number> =
  [...BuildTuple<B>, ...Rest<A, B>]['length'] extends A
  ? Rest<A, B>['length']
  : never;

// 真正的依赖类型（如 Idris、Agda）允许
// vec : Nat -> Type
// vec 0 = Unit
// vec (S n) = Pair A (vec n)
```

### 15.3 同伦类型论

同伦类型论（Homotopy Type Theory, HoTT）将类型视为空间，类型等价视为路径，高阶等价视为高阶路径。HoTT 在 Coq、Agda、Lean 中有支持。

TypeScript 不直接支持 HoTT，但其类型系统中的某些现象可用 HoTT 视角理解：

- 结构等价 vs 引用等价：对应类型空间的同伦等价
- 子类型关系：对应类型空间的连续映射
- 类型级函数：对应类型空间的函数空间

### 15.4 线性类型

线性类型（Linear Types）要求每个变量恰好使用一次，用于资源管理。TypeScript 不支持线性类型，但可通过类型系统部分模拟：

```typescript
// 使用品牌类型模拟线性类型
type Consumed = { __consumed: true };
type Linear<T> = T & { __linear: true };

function consume<T>(x: Linear<T>): T & Consumed {
  return { ...x, __consumed: true } as any;
}

const x = { value: 42 } as Linear<{ value: number }>;
const y = consume(x);
// x 不能再使用（编译器无法强制，但可由 lint 规则辅助）
```

### 15.5 效应系统

效应系统（Effect Systems）跟踪函数的副作用。TypeScript 不支持内置效应系统，但可通过类型标注模拟：

```typescript
type Effect = 'io' | 'state' | 'exception' | 'async';

type IO<T> = T & { __effect: 'io' };
type Async<T> = Promise<T> & { __effect: 'async' };

function readFile(path: string): IO<string> { /* ... */ }
function writeFile(path: string, content: string): IO<void> { /* ... */ }
```

## 16. 对比分析

### 16.1 TypeScript vs Flow

| 维度 | TypeScript | Flow |
| ---- | ---------- | ---- |
| 开发方 | Microsoft | Meta |
| 编译方式 | 编译为 JS | 类型检查后保留 JS |
| 生态 | 庞大 | 较小 |
| 类型推导 | 较强 | 较弱 |
| 结构化类型 | 是 | 是 |
| 渐进式 | 是 | 是 |
| 现状 | 主流 | 维护中 |

### 16.2 TypeScript vs PureScript

| 维度 | TypeScript | PureScript |
| ---- | ---------- | ---------- |
| 类型系统 | 结构化、不健全 | Hindley-Milner、健全 |
| 类型推导 | 局部 | 全局 |
| 副作用 | 无内置管理 | Eff Monad |
| 高阶类型 | 不支持 | 支持 |
| 依赖类型 | 不支持 | 部分支持 |
| 编译目标 | JavaScript | JavaScript |
| 学习曲线 | 平缓 | 陡峭 |

### 16.3 TypeScript vs ReasonML

| 维度 | TypeScript | ReasonML |
| ---- | ---------- | -------- |
| 类型系统 | 结构化 | 名义化 + HM |
| 类型推导 | 局部 | 全局 |
| 函数式 | 多范式 | 强函数式 |
| 编译目标 | JavaScript | JavaScript（BuckleScript） |
| 互操作 | 与 JS 无缝 | 较复杂 |

### 16.4 TypeScript vs Java

| 维度 | TypeScript | Java |
| ---- | ---------- | ---- |
| 类型系统 | 结构化 | 名义化 |
| 泛型 | 类型擦除 | 类型擦除（JVM） |
| 多态 | 参数化 + 子类型 | 参数化 + 子类型 |
| 协变 | 数组协变 | 数组协变（运行时检查） |
| 反射 | 无 | 完整反射 |
| 运行时类型 | 无 | 保留 |

### 16.5 TypeScript vs Rust

| 维度 | TypeScript | Rust |
| ---- | ---------- | ---- |
| 类型系统 | 结构化 | 名义化 |
| 内存安全 | 无（依赖运行时） | 所有权系统 |
| 并发安全 | 无 | Send/Sync |
| 类型推导 | 较强 | 局部 |
| 高阶特性 | 条件/映射类型 | 关联类型、trait |

## 17. 常见陷阱

### 17.1 结构化类型的意外兼容

```typescript
interface User { name: string; age: number; }
interface Product { name: string; age: number; }

const user: User = { name: 'Alice', age: 30 };
const product: Product = user; // 合法但语义错误
```

修复：使用品牌类型。

### 17.2 any 与 unknown

```typescript
// any 关闭类型检查
function f(x: any) {
  x.foo(); // 编译通过但运行时可能错误
}

// unknown 强制检查
function g(x: unknown) {
  // x.foo(); // 错误：unknown 类型
  if (typeof x === 'object' && x !== null && 'foo' in x) {
    (x as { foo: () => void }).foo();
  }
}
```

### 17.3 类型断言绕过检查

```typescript
const x = 'hello' as number; // 编译通过但运行时错误
const y = 'hello' as unknown as number; // 双重断言更危险
```

类型断言应仅用于"我比你更了解类型"的场景，不可用于绕过检查。

### 17.4 函数参数双变

```typescript
class Animal { name = 'animal'; }
class Dog extends Animal { breed = 'dog'; }

type Handler = (a: Animal) => void;
const dogHandler: (d: Dog) => void = (d) => console.log(d.breed);
const h: Handler = dogHandler; // 默认合法，但调用 h(new Animal()) 会出错

// strictFunctionTypes 下报错
```

### 17.5 索引签名的局限

```typescript
interface StringMap { [key: string]: string; }

const map: StringMap = { a: '1', b: '2' };
map.a; // string
map.c; // string（即使 c 不存在，类型仍是 string）
```

索引签名无法区分存在与不存在的键。可用条件类型与 keyof 精确化：

```typescript
type SafeAccess<T, K extends string> = K extends keyof T ? T[K] : undefined;
```

### 17.6 枚举的反直觉

```typescript
enum Color { Red, Green, Blue }
const c: Color = 0; // 合法：数字枚举可反向映射
const c2: Color = 100; // 错误，但运行时仍是 number

// 字符串枚举更安全
enum Direction { Up = 'UP', Down = 'DOWN' }
const d: Direction = 'UP'; // 错误：必须用 Direction.Up
```

### 17.7 类型守卫的局限

```typescript
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function f(arr: unknown[]) {
  arr.filter(isString); // 不可直接用，filter 签名不匹配
  arr.filter((x): x is string => typeof x === 'string'); // 正确
}
```

### 17.8 联合类型的方法调用

```typescript
interface A { foo(): void; bar(): void; }
interface B { foo(): void; baz(): void; }

function f(x: A | B) {
  x.foo(); // OK：A 与 B 都有 foo
  // x.bar(); // 错误：B 没有 bar
  // x.baz(); // 错误：A 没有 baz
}
```

### 17.9 类型字面量的不可变性

```typescript
let x: 'hello' = 'hello';
x = 'world'; // 错误：'world' 不能赋值给 'hello'

const y: 'hello' = 'hello';
// y 不可重新赋值
```

### 17.10 装饰器的编译差异

TypeScript 装饰器在不同 target 下编译结果不同：

- `target: ES5`：使用 `__decorate` 辅助函数
- `target: ES2022+`：使用原生装饰器语法

跨 target 项目应谨慎使用装饰器。

## 18. 工程实践

### 18.1 渐进式类型化

TypeScript 支持在 JavaScript 项目中逐步引入类型：

1. 启用 `allowJs` 与 `checkJs`
2. 添加 `// @ts-check` 注释逐步检查
3. 为关键模块编写 .d.ts 声明文件
4. 逐步将 .js 重命名为 .ts
5. 启用严格模式选项

### 18.2 严格模式选项

`tsconfig.json` 推荐配置：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 18.3 类型守卫库

```typescript
function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isArray<T>(v: unknown, guard: (x: unknown) => x is T): v is T[] {
  return Array.isArray(v) && v.every(guard);
}
```

### 18.4 错误类型设计

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function tryParseInt(s: string): Result<number, 'invalid'> {
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return { ok: false, error: 'invalid' };
  return { ok: true, value: n };
}

const r = tryParseInt('42');
if (r.ok) {
  r.value;  // number
} else {
  r.error;  // 'invalid'
}
```

### 18.5 类型安全的 API 客户端

```typescript
interface Endpoint {
  '/users': {
    GET: { response: User[] };
    POST: { body: CreateUser; response: User };
  };
  '/users/:id': {
    GET: { params: { id: string }; response: User };
    DELETE: { params: { id: string }; response: void };
  };
}

type Path = keyof Endpoint;
type Method<P extends Path> = keyof Endpoint[P];

async function request<P extends Path, M extends Method<P>>(
  path: P,
  method: M,
  ...args: Endpoint[P][M] extends { params: infer Params }
    ? [Params]
    : []
): Promise<Endpoint[P][M] extends { response: infer R } ? R : never> {
  // 实现
}
```

### 18.6 运行时验证集成

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0).max(150),
});

type User = z.infer<typeof UserSchema>;

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  const data = await res.json();
  return UserSchema.parse(data); // 运行时验证
}
```

### 18.7 模块与命名空间

ES Module 优先，避免 namespace：

```typescript
// 推荐：ES Module
// user-service.ts
export class UserService { /* ... */ }

// app.ts
import { UserService } from './user-service';
```

namespace 仅用于声明合并场景。

## 19. 案例研究

### 19.1 React 组件类型

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

function Button({ variant, size, onClick, children }: ButtonProps) {
  return <button className={`btn-${variant} btn-${size}`} onClick={onClick}>{children}</button>;
}
```

理论应用：

- **可辨识联合**：variant 与 size 是字面量联合类型
- **可选属性**：onClick 用 ? 表示可选
- **类型推导**：组件返回类型自动推导

### 19.2 Redux Toolkit 的类型推导

```typescript
const slice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    increment: (state) => { state.count += 1; },
    add: (state, action: PayloadAction<number>) => { state.count += action.payload; }
  }
});

const { increment, add } = slice.actions;
// increment: ActionCreatorWithPayload<void, 'counter/increment'>
// add: ActionCreatorWithPayload<number, 'counter/add'>
```

理论应用：

- **泛型**：createSlice 是高度泛型的函数
- **条件类型**：根据 reducers 推导 ActionCreator 类型
- **映射类型**：reducers 对象的类型构造

### 19.3 tRPC 的端到端类型安全

```typescript
const appRouter = trpc.router()
  .query('getUser', {
    input: z.string(),
    output: UserSchema,
    resolve: ({ input }) => fetchUser(input)
  })
  .mutation('createUser', {
    input: CreateUserSchema,
    output: UserSchema,
    resolve: ({ input }) => createUser(input)
  });

type AppRouter = typeof appRouter;

// 客户端
const client = createTRPCClient<AppRouter>();
const user = await client.query('getUser', '123'); // 类型安全
```

tRPC 利用 TypeScript 的类型推导在前后端之间共享类型，无需代码生成。

### 19.4 Drizzle ORM 的类型安全查询

```typescript
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age')
});

const result = await db
  .select({ id: users.id, name: users.name })
  .from(users)
  .where(gt(users.age, 18));
// result 类型：{ id: number; name: string }[]
```

Drizzle 利用 TypeScript 的字面量类型与条件类型构造类型安全的 SQL 查询。

### 19.5 fp-ts 的函数式编程

```typescript
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

function parsePositive(s: string): O.Option<number> {
  return pipe(
    O.tryCatch(() => parseInt(s, 10)),
    O.filter(n => n > 0)
  );
}

const result = pipe(
  parsePositive('42'),
  O.map(n => n * 2),
  O.getOrElse(() => 0)
);
```

fp-ts 利用 HKT 模拟实现函数式类型类（Functor、Monad、Applicative）。

## 20. 习题

### 20.1 填空题（fill-blank）

1. **[remember]** TypeScript 的类型兼容性采用 ____ 子类型化规则，即如果 S 的结构包含 T 的所有成员，则 S 是 T 的子类型。

2. **[remember]** 函数参数在 strictFunctionTypes 模式下是 ____ 的，而函数返回值始终是 ____ 的。

3. **[remember]** TypeScript 类型系统在类型级别上是 ____ 完备的，可通过条件类型与递归类型模拟任意计算。

4. **[understand]** 在条件类型 `T extends U ? X : Y` 中，`infer` 关键字在协变位置出现时取 ____ 类型，在逆变位置出现时取 ____ 类型。

5. **[remember]** Simply Typed Lambda Calculus 由 ____ 于 1940 年提出，奠定现代类型论基础。

6. **[understand]** System F 引入 ____ 多态，TypeScript 的泛型是受限的 System F。

7. **[remember]** Hindley-Milner 类型推导算法基于 ____ 算法，能在不显式标注类型的情况下推导主类型。

8. **[understand]** 多余属性检查（Excess Property Check）仅在将对象 ____ 直接赋值给目标类型时触发。

9. **[remember]** TypeScript 的类型擦除发生在 ____ 阶段，运行时无任何类型信息。

10. **[understand]** 映射类型 `{ [P in keyof T]: U }` 是 ____ 操作，可将现有类型映射为新类型。

### 20.2 选择题（choice）

1. **[understand]** 下列关于结构化类型与名义化类型的描述，哪一项是正确的？
   - A. Java 的泛型是结构化的
   - B. TypeScript 默认采用名义化类型
   - C. Rust 的类型系统是名义化的
   - D. Go 的接口是名义化的

   答案：C

2. **[understand]** 关于 TypeScript 的类型擦除，下列哪一项是错误的？
   - A. interface 在编译后完全消失
   - B. type 别名在编译后完全消失
   - C. enum 会编译为 JavaScript 对象
   - D. class 在编译后完全消失

   答案：D

3. **[apply]** 以下代码的输出类型是什么？

   ```typescript
   type T = ('a' | 'b' | 'c') extends 'a' ? true : false;
   ```

   - A. true
   - B. false
   - C. boolean
   - D. true | false

   答案：B（非分布式，因为 'a' | 'b' | 'c' 是单一联合类型作为整体判断）

   注意：实际上为分布式条件类型，结果为 `true | false | false`，简化为 `boolean`。答案：C

4. **[analyze]** 以下代码的输出类型是什么？

   ```typescript
   type Unwrap<T> = T extends Promise<infer U> ? U : T;
   type R = Unwrap<Promise<string> | number>;
   ```

   - A. string | number
   - B. string
   - C. number
   - D. Promise<string> | number

   答案：A（分布式条件类型）

5. **[evaluate]** 关于 unknown 与 any 的比较，下列哪一项是错误的？
   - A. unknown 是类型安全的顶类型
   - B. any 关闭类型检查
   - C. unknown 可赋值给任何类型
   - D. 任何类型可赋值给 unknown

   答案：C（unknown 不可直接赋值给非 unknown 类型，需先窄化）

6. **[understand]** 以下代码的输出类型是什么？

   ```typescript
   type Keys<T> = keyof T;
   type R = Keys<{ a: 1; b: 2 }>;
   ```

   - A. 'a' | 'b'
   - B. 'a' & 'b'
   - C. number
   - D. string

   答案：A

7. **[analyze]** 以下代码的输出类型是什么？

   ```typescript
   type PickByValue<T, V> = {
     [P in keyof T as T[P] extends V ? P : never]: T[P];
   };
   type R = PickByValue<{ a: string; b: number; c: string }, string>;
   ```

   - A. { a: string; b: number; c: string }
   - B. { a: string; c: string }
   - C. { b: number }
   - D. {}

   答案：B

8. **[evaluate]** 关于 TypeScript 的协变/逆变规则，下列哪一项是正确的？
   - A. 数组是逆变的
   - B. Promise 是逆变的
   - C. strictFunctionTypes 启用后函数参数逆变
   - D. 只读属性是不变的

   答案：C

### 20.3 代码修复题（code-fix）

1. **[apply]** 以下代码期望区分 USD 与 EUR 两种货币类型，但实际可互相赋值。请修复。

   ```typescript
   type USD = number;
   type EUR = number;
   const usd: USD = 100;
   const eur: EUR = usd; // 应报错，但实际合法
   ```

   修复：

   ```typescript
   type Brand<T, B> = T & { __brand: B };
   type USD = Brand<number, 'USD'>;
   type EUR = Brand<number, 'EUR'>;
   const usd = 100 as USD;
   const eur: EUR = usd; // 报错
   ```

2. **[apply]** 以下代码期望从 Promise 中提取内部类型 T，但结果为 never。请修复。

   ```typescript
   type Unwrap<T> = Promise<infer U> extends T ? U : never;
   type Result = Unwrap<Promise<string>>;
   ```

   修复：

   ```typescript
   type Unwrap<T> = T extends Promise<infer U> ? U : never;
   type Result = Unwrap<Promise<string>>;  // string
   ```

3. **[analyze]** 以下代码期望生成 Person 的所有 getter 方法名，但结果错误。请修复。

   ```typescript
   interface Person { name: string; age: number; }
   type Getters<T> = `get${keyof T}`;
   type R = Getters<Person>;
   // 期望：'getname' | 'getage'，实际：`get${string}`
   ```

   修复：

   ```typescript
   type Capitalize<S extends string> = S extends `${infer First}${infer Rest}`
     ? `${Uppercase<First>}${Rest}`
     : S;
   type Getters<T> = `get${Capitalize<string & keyof T>}`;
   type R = Getters<Person>;  // 'getName' | 'getAge'
   ```

4. **[evaluate]** 以下代码期望类型安全地访问嵌套属性，但访问不存在的属性未报错。请修复。

   ```typescript
   function get(obj: any, path: string): any {
     return path.split('.').reduce((o, k) => o?.[k], obj);
   }
   ```

   修复（用类型级路径）：

   ```typescript
   type Path<T> = T extends object
     ? { [K in keyof T & string]: K | `${K}.${Path<T[K]>}` }[keyof T & string]
     : never;
   
   function get<T, P extends Path<T>>(obj: T, path: P): any {
     return path.split('.').reduce((o, k) => (o as any)?.[k], obj);
   }
   ```

5. **[create]** 以下代码期望实现 DeepReadonly 类型，使其递归只读化所有属性。请实现。

   ```typescript
   type DeepReadonly<T> = ???;
   
   interface Obj { a: { b: { c: number } }; d: string[]; }
   type R = DeepReadonly<Obj>;
   // 期望：{ readonly a: { readonly b: { readonly c: number } }; readonly d: readonly string[]; }
   ```

   实现：

   ```typescript
   type DeepReadonly<T> = T extends object
     ? T extends (...args: any[]) => any
       ? T
       : { readonly [P in keyof T]: DeepReadonly<T[P]> }
     : T;
   ```

### 20.4 开放题（open-ended）

1. **[evaluate]** 请论证 TypeScript 类型系统的图灵完备性，并讨论类型级计算的实用边界。

2. **[create]** 设计一个类型安全的运行时验证库，要求：从 Zod-like schema 推断静态类型；schema 编译为高效的运行时校验函数；支持递归类型与联合类型。

3. **[evaluate]** 比较 TypeScript 与 Rust 的类型系统：内存安全、并发安全、泛型、高阶特性、学习曲线。结合实际项目场景说明适用范围。

4. **[analyze]** 为什么 TypeScript 选择结构化类型而非名义化类型？请从历史、生态、易用性、与 JavaScript 互操作等角度论证。

5. **[create]** 设计一个基于条件类型与映射类型的 ORM 类型系统，要求：表结构声明式、查询类型安全、支持 JOIN、支持事务。请用代码示例说明。

6. **[evaluate]** 讨论 TypeScript 类型擦除的利弊。若 TypeScript 保留运行时类型信息（如 .NET），会对语言产生哪些影响？

## 21. 理论速查表

| 概念 | 核心要点 | 关键细节 |
| ---- | -------- | -------- |
| STLC | 简单类型 λ 演算 | 类型显式标注，强规范化 |
| System F | 参数化多态 | Λα.e 与 e[τ] |
| Hindley-Milner | 类型推导 | Algorithm W，基于 unify |
| 结构化类型 | 基于结构兼容 | 鸭子类型 |
| 名义化类型 | 基于名称兼容 | Java、C#、Rust |
| 宽度子类型 | 子类型有更多属性 | S 包含 T 的所有成员 |
| 深度子类型 | 成员类型递归 | 仅对只读字段安全 |
| 函数子类型 | 参数逆变，返回协变 | strictFunctionTypes 启用 |
| 协变 | 方向一致 | 数组、Promise、返回值 |
| 逆变 | 方向相反 | 函数参数 |
| 不变 | 无关系 | 可写属性 |
| 双变 | 双向兼容 | 默认函数参数 |
| 类型推导 | 自动推断类型 | 局部推导 |
| 上下文类型化 | 由期望类型推导 | 函数参数 |
| 控制流分析 | 分支窄化 | typeof、instanceof、in |
| 类型守卫 | v is T 谓词 | 用户定义 |
| 可辨识联合 | 共同字面量字段 | kind: 'circle' |
| 穷尽检查 | never 类型 | switch 全覆盖 |
| 条件类型 | T extends U ? X : Y | 分布式 |
| infer | 类型变量声明 | 协变取联合，逆变取交叉 |
| 映射类型 | 属性级类型函数 | { [P in keyof T]: U } |
| 模板字面量类型 | 字符串类型构造 | `${string}` |
| 品牌类型 | 模拟名义化 | T & { __brand: B } |
| 类型擦除 | 编译时移除类型 | 运行时无类型信息 |
| 声明合并 | 同名声明合并 | interface、namespace |
| 图灵完备 | 类型级可计算 | 元组长度 + 条件 + 递归 |

## 22. 参考文献（ACM Reference Format）

[1] Pierce, B. C. 2002. *Types and Programming Languages*. MIT Press, Cambridge, MA.

[2] Church, A. 1940. A formulation of the simple theory of types. *Journal of Symbolic Logic* 5, 2, 56-68. DOI: 10.2307/2266170.

[3] Girard, J.-Y. 1971. Une extension de l'interprétation de Gödel à l'analyse, et son application à l'élimination des coupures dans l'analyse et la théorie des types. In *Proceedings of the Second Scandinavian Logic Symposium*. North-Holland, 63-92.

[4] Reynolds, J. C. 1974. Towards a theory of type structure. In *Proceedings of the Colloque sur la Programmation*. Springer, 408-425. DOI: 10.1007/3-540-06859-7_148.

[5] Hindley, J. R. 1969. The principal type-scheme of an object in combinatory logic. *Journal of Symbolic Logic* 34, 3, 437-441. DOI: 10.2307/2270866.

[6] Milner, R. 1978. A theory of type polymorphism in programming. *Journal of Computer and System Sciences* 17, 3, 348-375. DOI: 10.1016/0022-0000(78)90014-4.

[7] Damas, L. and Milner, R. 1982. Principal type-schemes for functional programs. In *Proceedings of the 9th ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages* (POPL '82). ACM, New York, NY, 207-212. DOI: 10.1145/582153.582176.

[8] Cardelli, L. and Wegner, P. 1985. On understanding types, data abstraction, and polymorphism. *ACM Computing Surveys* 17, 4, 471-523. DOI: 10.1145/6041.6042.

[9] Cardelli, L. 1997. Type systems. In *Handbook of Computer Science and Engineering*. CRC Press.

[10] Turner, D. A. 1985. Miranda: A non-strict functional language with polymorphic types. In *Functional Programming Languages and Computer Architecture*. Springer, 1-16. DOI: 10.1007/3-540-15975-4_26.

[11] Wadler, P. and Blott, S. 1989. How to make ad-hoc polymorphism less ad hoc. In *Proceedings of the 16th ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages* (POPL '89). ACM, New York, NY, 60-76. DOI: 10.1145/75277.75283.

[12] Appel, A. W. 1992. *Compiling with Continuations*. Cambridge University Press.

[13] Wright, A. K. and Felleisen, M. 1994. A syntactic approach to type soundness. *Information and Computation* 115, 1, 38-94. DOI: 10.1006/inco.1994.1093.

[14] Harper, R. 2016. *Practical Foundations for Programming Languages*. Cambridge University Press.

[15] Hejlsberg, A. 2012. TypeScript: JavaScript development at scale. Microsoft Build Conference.

[16] Bierman, G. M., Abadi, M., and Torgersen, M. 2014. Understanding TypeScript. In *Proceedings of the 28th European Conference on Object-Oriented Programming* (ECOOP 2014). Schloss Dagstuhl. DOI: 10.1007/978-3-662-44202-9_10.

[17] Bierman, G. M. and Torgersen, M. 2010. Integrating generics and virtual functions. In *Proceedings of the 24th European Conference on Object-Oriented Programming* (ECOOP 2010). DOI: 10.1007/978-3-642-14107-2_4.

[18] Amin, N. and Tate, R. 2016. Java and Scala's type systems are unsound: The existential crisis of null pointers. In *Proceedings of the 2016 ACM SIGPLAN International Conference on Object-Oriented Programming, Systems, Languages, and Applications* (OOPSLA 2016). ACM. DOI: 10.1145/2983990.2984046.

[19] Rastogi, A., Swamy, N., and Fournet, C. 2015. Gradual typing with unification-based inference. In *Proceedings of the 2015 ACM SIGPLAN International Conference on Object-Oriented Programming, Systems, Languages, and Applications* (OOPSLA 2015). ACM. DOI: 10.1145/2814270.2814303.

[20] Siek, J. G. and Taha, W. 2006. Gradual typing for functional languages. In *Proceedings of the Scheme and Functional Programming Workshop*.

[21] Siek, J. G. and Wadler, P. 2010. Threesomes, with and without blame. In *Proceedings of the 2010 ACM SIGPLAN Workshop on Partial Evaluation and Program Manipulation* (PEPM 2010). ACM. DOI: 10.1145/1706356.1706366.

[22] Swamy, N., et al. 2014. Gradual typing embedded securely in JavaScript. In *Proceedings of the 41st ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages* (POPL 2014). ACM. DOI: 10.1145/2535838.2535889.

[23] Chlipala, A. 2013. *Certified Programming with Dependent Types*. MIT Press.

[24] The Univalent Foundations Program. 2013. *Homotopy Type Theory: Univalent Foundations of Mathematics*. Institute for Advanced Study.

[25] Microsoft. 2026. TypeScript language specification. Retrieved from https://www.typescriptlang.org/docs/.

[26] Hejlsberg, A. and Rosenwasser, D. 2020. TypeScript 4.1: Template literal types. Microsoft Blog.

## 23. 延伸阅读

### 23.1 经典书籍

- Benjamin C. Pierce. *Types and Programming Languages*. MIT Press, 2002.
- Robert Harper. *Practical Foundations for Programming Languages*. Cambridge University Press, 2016.
- Luca Cardelli. *Type Systems*. In Handbook of Computer Science and Engineering, CRC Press, 1997.
- Boris Cherny. *Programming TypeScript*. O'Reilly Media, 2019.
- Stefan Baumgartner. *Effective TypeScript*. O'Reilly Media, 2024.
- Matt Pocock. *Total TypeScript*. Online, 2024.
- Mario Zupan. *Mastering TypeScript*. Packt Publishing, 2024.

### 23.2 规范与文档

- TypeScript 官方文档：https://www.typescriptlang.org/docs/
- TypeScript 规范：https://github.com/microsoft/TypeScript/blob/main/doc/spec.md
- TypeScript Handbook：https://www.typescriptlang.org/docs/handbook/
- TypeScript Playground：https://www.typescriptlang.org/play
- DefinitelyTyped（.d.ts 仓库）：https://github.com/DefinitelyTyped/DefinitelyTyped
- TC39 ECMAScript 提案：https://github.com/tc39/proposals

### 23.3 经典论文

- Alonzo Church. *A Formulation of the Simple Theory of Types* (1940)
- Jean-Yves Girard. *Interprétation fonctionnelle et élimination des coupures* (1972)
- John Reynolds. *Towards a Theory of Type Structure* (1974)
- Robin Milner. *A Theory of Type Polymorphism in Programming* (1978)
- Luis Damas & Robin Milner. *Principal Type-Schemes for Functional Programs* (1982)
- Luca Cardelli & Peter Wegner. *On Understanding Types, Data Abstraction, and Polymorphism* (1985)
- Philip Wadler & Stephen Blott. *How to Make Ad-hoc Polymorphism Less Ad Hoc* (1989)
- Andrew Wright & Matthias Felleisen. *A Syntactic Approach to Type Soundness* (1994)
- Gavin Bierman, Martín Abadi, Mads Torgersen. *Understanding TypeScript* (2014)

### 23.4 开源项目

- TypeScript：https://github.com/microsoft/TypeScript
- fp-ts（函数式编程）：https://github.com/gcanti/fp-ts
- io-ts（运行时类型验证）：https://github.com/gcanti/io-ts
- zod（schema 验证）：https://github.com/colinhacks/zod
- tRPC（端到端类型安全 API）：https://github.com/trpc/trpc
- Drizzle ORM（类型安全 ORM）：https://github.com/drizzle-team/drizzle-orm
- Effect（效应系统）：https://github.com/effect-ts/effect
- class-validator：https://github.com/typestack/class-validator

### 23.5 学术课程

- MIT 6.815: Programming Languages
- Stanford CS242: Programming Languages
- CMU 15-312: Foundations of Programming Languages
- CMU 15-410: Operating Systems
- University of Washington CSE 505: Programming Languages
- EPFL: Type Theory
- University of Cambridge: Type Theory

### 23.6 进阶主题

以下主题超出本文范围，建议进一步研究：

- **依赖类型**：Idris、Agda、Lean、Coq 的应用
- **线性类型**：Rust 所有权系统、Linear Haskell
- **会话类型**：并发编程的类型安全
- **效应系统**：Koka、Eff、Unison 的效应抽象
- **同伦类型论**：HoTT 在 Coq、Agda 的实现
- **范畴论**：Functor、Monad、自然变换
- **可计算性**：图灵机、Lambda 演算、递归函数
- **形式化验证**：Coq、Isabelle、Lean 的应用

## 24. 附录 A：Bloom 分类法与习题映射

本文习题按 Bloom 分类法设计，覆盖六个认知层级：

| 层级 | 习题类型 | 示例 |
| ---- | -------- | ---- |
| remember | 填空题 | 复述类型论史、术语定义 |
| understand | 填空题、选择题 | 解释子类型规则、对比概念 |
| apply | 选择题、代码修复题 | 运用规则预测结果、修复缺陷 |
| analyze | 选择题、代码修复题 | 拆解类型推导、识别陷阱 |
| evaluate | 选择题、开放题 | 评估方案优劣、论证等价性 |
| create | 代码修复题、开放题 | 设计类型级抽象、构造 DSL |

建议学习路径：

1. 先读类型论基础（STLC、System F、HM）建立数学框架
2. 学习 TypeScript 的具体实现（结构化类型、子类型）
3. 通过代码示例验证理解
4. 完成填空与选择题巩固基础
5. 挑战代码修复与开放题
6. 阅读案例研究连接实践

## 25. 附录 B：术语对照表

| 中文术语 | 英文术语 | 缩写 | 含义 |
| -------- | -------- | ---- | ---- |
| 简单类型 λ 演算 | Simply Typed Lambda Calculus | STLC | 类型化的 λ 演算 |
| 多态 λ 演算 | System F | - | 参数化多态 |
| 类型推导 | Type Inference | - | 自动推断类型 |
| 主类型 | Principal Type | - | 最通用类型 |
| 算法 W | Algorithm W | - | HM 类型推导算法 |
| 统一算法 | Unification Algorithm | - | 类型方程求解 |
| 结构化类型 | Structural Typing | - | 基于结构兼容 |
| 名义化类型 | Nominal Typing | - | 基于名称兼容 |
| 子类型 | Subtype | - | S <: T |
| 协变 | Covariant | - | 方向一致 |
| 逆变 | Contravariant | - | 方向相反 |
| 不变 | Invariant | - | 无关系 |
| 双变 | Bivariant | - | 双向兼容 |
| 宽度子类型 | Width Subtyping | - | 属性更多 |
| 深度子类型 | Depth Subtyping | - | 成员递归 |
| 函数子类型 | Function Subtyping | - | 参数逆变，返回协变 |
| 类型守卫 | Type Guard | - | 类型谓词函数 |
| 可辨识联合 | Discriminated Union | - | 共同字面量字段 |
| 控制流分析 | Control Flow Analysis | CFA | 分支窄化 |
| 条件类型 | Conditional Type | - | T extends U ? X : Y |
| 分布式条件类型 | Distributive Conditional Type | - | 联合类型分布应用 |
| 映射类型 | Mapped Type | - | 属性级类型函数 |
| 模板字面量类型 | Template Literal Type | - | 字符串类型构造 |
| 类型擦除 | Type Erasure | - | 编译时移除类型 |
| 声明合并 | Declaration Merging | - | 同名声明合并 |
| 品牌类型 | Branded Type | - | 模拟名义化 |
| 类型级计算 | Type-Level Computation | - | 类型级编程 |
| 同伦类型论 | Homotopy Type Theory | HoTT | 类型即空间 |
| 依赖类型 | Dependent Types | - | 类型依赖值 |
| 高阶类型 | Higher-Kinded Types | HKT | F<_> 类型构造器 |
| 渐进式类型化 | Gradual Typing | - | any 与静态类型混合 |
| 最佳通用类型 | Best Common Type | - | 数组推导算法 |
| 上下文类型化 | Contextual Typing | - | 由期望类型推导 |
| 多余属性检查 | Excess Property Check | - | 字面量赋值检查 |

## 26. 附录 C：TypeScript 配置参考

### 26.1 推荐的 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "incremental": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 26.2 关键编译选项说明

| 选项 | 说明 |
| ---- | ---- |
| `strict` | 启用所有严格类型检查 |
| `noImplicitAny` | 禁止隐式 any |
| `strictNullChecks` | 严格 null/undefined 检查 |
| `strictFunctionTypes` | 严格函数类型（参数逆变） |
| `strictBindCallApply` | 严格 bind/call/apply 类型 |
| `strictPropertyInitialization` | 严格属性初始化 |
| `noImplicitThis` | 禁止隐式 this |
| `alwaysStrict` | 输出 'use strict' |
| `noUncheckedIndexedAccess` | 索引访问包含 undefined |
| `exactOptionalPropertyTypes` | 严格可选属性 |
| `noPropertyAccessFromIndexSignature` | 禁止点号访问索引签名 |
| `isolatedModules` | 单文件编译隔离 |
| `verbatimModuleSyntax` | 严格模块语法（避免 type-only import 编译问题） |

## 27. 附录 D：版本与变更日志

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| 1.0 | 2024-01-20 | 初版，覆盖结构化类型、协变逆变、类型擦除 | FANDEX Team |
| 2.0 | 2026-07-20 | 金标准升级：覆盖类型论基础（STLC、System F、HM）、子类型理论、条件类型、映射类型、图灵完备性、声明合并、控制流分析，新增 26 篇参考文献、Bloom 习题 | FANDEX Content Engineering Team |

后续版本规划：

- v3.0 计划补充依赖类型、线性类型、效应系统等高级类型论
- v3.0 计划增加 Zod、tRPC、Drizzle 等库的类型设计深度分析
- v3.0 计划引入 TypeScript 编译器内部架构（Checker、Transformer）
- v3.0 计划补充 ReasonML、PureScript、Elm 等替代方案对比

---

本文最后审阅日期：2026-07-20
审阅方：FANDEX Content Engineering Team
