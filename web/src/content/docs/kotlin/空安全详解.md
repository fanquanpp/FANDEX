---
order: 50
title: 空安全详解
module: kotlin
category: 'dev-lang'
difficulty: intermediate
description: 'Kotlin 空安全深度解析：可空类型、智能转换、平台类型、lateinit、Elvis 运算符的形式化定义、字节码实现与企业级工程实践。'
author: fanquanpp
updated: '2026-07-21'
related:
  - kotlin/扩展函数
  - kotlin/密封类与代数数据类型
  - kotlin/DSL与领域特定语言
  - kotlin/测试与最佳实践
  - kotlin/委托属性
prerequisites:
  - kotlin/概述与环境配置
  - kotlin/类与对象
  - kotlin/属性与字段
---

# 空安全详解（Null Safety in Depth）

> 本文档对标 MIT 6.005、Stanford CS193P、CMU 15-410 教学水准，系统讲解 Kotlin 空安全（Null Safety）机制从设计哲学到 JVM 字节码实现的完整链路。内容覆盖 Kotlin 1.0 至 2.0 的演进，包括可空类型、智能转换（Smart Casts）、平台类型（Platform Types）、`lateinit`、`Elvis` 运算符、安全调用链等核心主题，配套企业级生产代码、跨语言对比、形式化推导与习题解析。

## 目录

1. [学习目标](#1-学习目标)
2. [历史动机与发展脉络](#2-历史动机与发展脉络)
3. [形式化定义](#3-形式化定义)
4. [理论推导与原理解析](#4-理论推导与原理解析)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践)
8. [工程实践](#8-工程实践)
9. [案例研究](#9-案例研究)
10. [习题](#10-习题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标

本章节遵循 Bloom 教育目标分类学（Bloom's Taxonomy）的六个认知层级，由低阶到高阶逐层递进。

### 1.1 Remember（记忆）

完成本章节后，学习者应能够准确记忆以下知识点：

- 复述 Kotlin 区分可空类型（`T?`）与不可空类型（`T`）的类型系统设计。
- 列举四大空安全操作符：安全调用 `?.`、Elvis 运算符 `?:`、非空断言 `!!`、安全转换 `as?`。
- 背诵智能转换（Smart Casts）的触发条件：`is` 检查、`null` 检查、`when` 分支。
- 记忆 `lateinit` 与 `lazy` 的语义差异：前者用于 `var` 延迟初始化，后者用于 `val` 惰性求值。
- 列举平台类型（Platform Type）的表示形式：`String!`、`List<Int!>!`、`Map<String!, Int!>!`。
- 复述 `filterNotNull`、`mapNotNull`、`forEachNotNull` 三个集合操作函数的签名与用途。
- 记忆 `requireNotNull`、`checkNotNull` 两个前置条件函数的语义：失败时抛出 `IllegalArgumentException` 与 `IllegalStateException`。
- 列举 `OrNull` 系列扩展：`firstOrNull`、`lastOrNull`、`getOrNull`、`minOrNull`、`maxOrNull`。

### 1.2 Understand（理解）

- 用自己的语言解释"-billion-dollar mistake"（Tony Hoare 1965 年引入空引用）的历史背景与代价。
- 解释可空类型在 JVM 字节码层面的表示：通过 `@Nullable` 注解（`org.jetbrains.annotations`）实现，运行时无类型差异。
- 描述智能转换的实现机制：编译器在控制流图中维护类型细化（Type Narrowing）信息，在安全分支内将 `T?` 细化为 `T`。
- 阐述平台类型的必要性：Java 代码不携带空安全信息，Kotlin 无法确定其是否可空，因此推迟到使用处决策。
- 解释 `?.let { ... }` 与 `?.run { ... }` 在空安全处理中的差异：前者通过 `it` 引用，后者通过 `this` 引用。
- 理解 `?:` 与 `||` 的语义差异：前者用于 null 合并，后者用于布尔或运算。
- 解释 `lateinit` 的实现：编译器在字段上添加 `@NotNull` 注解，并在 getter 中插入 null 检查（抛出 `UninitializedPropertyAccessException`）。
- 描述契约（Contract）机制对智能转换的辅助作用：`requireNotNull(x)` 后编译器知道 `x` 不为 null。

### 1.3 Apply（应用）

- 在 API 响应处理中使用 `?.` 链式调用与 `?:` 默认值，优雅处理深层嵌套的 null。
- 在集合操作中使用 `filterNotNull`、`mapNotNull` 过滤 null 元素，得到非空类型集合。
- 使用 `requireNotNull` 与 `?:` 配合，实现函数前置参数校验与状态检查。
- 使用 `lateinit` 实现 Android `Activity` 的 `ViewBinding` 延迟初始化。
- 使用 `safeLet`、`zipValues` 等自定义扩展，处理多个可空值的同时非空逻辑。
- 在 Java 互操作场景中显式标注 `@Nullable` / `@NotNull`，消除平台类型歧义。
- 使用 `sealed class` + `Nothing` 表示"不可能有值"的分支，借助编译器穷尽性检查。

### 1.4 Analyze（分析）

- 反编译 Kotlin 代码，分析 `?.` 在字节码中等价于 `if (x != null) f(x) else null` 的实现。
- 对比 `lateinit var` 与 `by lazy { }` 在字节码层面的差异：前者是字段 + null 检查，后者是 `Lazy` 对象 + 双重检查锁。
- 分析智能转换在复杂控制流中的限制：跨函数、跨线程、`val` vs `var` 的差异。
- 解构平台类型的传播规则：`String!` 传给 Kotlin 函数时，按目标类型推断（`String` 或 `String?`）。
- 分析 `contract` 的实现原理：通过 `callsInPlace`、`returns` 等契约告知编译器控制流信息。

### 1.5 Evaluate（评价）

- 评价 Kotlin 选择"类型系统层"而非"运行时检查"实现空安全的设计权衡。
- 评价 `!!` 操作符的存在价值：是"逃生舱"还是"代码异味"？
- 评价平台类型的设计：是"实用性妥协"还是"类型安全漏洞"？
- 评估 `lateinit` 的设计：相比 `lazy`，它的不可空保证较弱，是否值得引入？
- 评价智能转换的语义限制：在多线程场景下智能转换可能失效，是否过于宽松？
- 评估 `Result<T>` 类型在空安全中的角色：是否应替代 `T?` 用于"可能失败"的场景？

### 1.6 Create（创造）

- 设计并实现一个完整的"可空值组合器"（Nullable Combinator）：支持 `map2`、`map3`、`flatMap` 等高阶操作。
- 设计一个基于 `sealed class` 的 `Optional<T>` 类型，提供 `map`、`flatMap`、`filter`、`getOrElse` 操作。
- 实现一个"防御式 Java 互操作层"：自动将平台类型转换为可空类型，并提供 `requireNotNull` 包装。
- 撰写一份团队空安全规范：何时用 `lateinit`、何时用 `lazy`、何时用 `T?`、何时禁用 `!!`。
- 设计一个基于契约的自定义智能转换函数：`fun <T> T?.requireNonNull(): T` 在调用后使编译器知道 `this` 非 null。

---

## 2. 历史动机与发展脉络

### 2.1 问题背景：十亿美元的错误

1965 年，Tony Hoare 在设计 ALGOL W 时引入了"空引用"（Null Reference）概念。他后来在 2009 年的 QCon 演讲中将其称为"my billion-dollar mistake"：

> I call it my billion-dollar mistake. It was the invention of the null reference in 1965. ... This has led to innumerable errors, vulnerabilities, and system crashes, which have probably caused a billion dollars of pain and damage in the last forty years.

空引用的根本问题：

1. **类型系统漏洞**：任何引用类型 `T` 都可以赋值为 `null`，但 `null` 并不是 `T` 的有效实例。
2. **运行时错误**：对 `null` 调用方法会抛出 `NullPointerException`（NPE），难以预测与防御。
3. **传播性**：`null` 会沿着调用链传播，导致错误源头难以定位。
4. **API 文档负担**：开发者必须依赖文档或约定标注可空性，编译器无法强制。

Kotlin 的设计目标：

- **类型系统层解决**：在编译期区分可空与不可空类型，将 NPE 从运行时提前到编译期。
- **显式空处理**：开发者必须显式处理可空值，避免遗漏。
- **Java 互操作**：通过平台类型平滑过渡，不破坏既有 Java 生态。
- **零开销**：在 JVM 平台不增加运行时开销，仅依赖注解与编译器检查。

### 2.2 学术背景：Option 类型与类型系统

Kotlin 空安全的思想根植于函数式编程与类型理论：

- **ML 语言（1973）**：引入 `option` 类型，用 `SOME(v)` 与 `NONE` 显式表示"可能没有值"。
- **Haskell（1990）**：`Maybe a = Just a | Nothing`，通过 Monad 实现 `>>=` 链式操作。
- **Scala（2004）**：`Option[T]` 类型，`Some[T]` 与 `None`，配合 `flatMap` 链式处理。
- **Rust（2010）**：`Option<T>` 枚举，强制 match 穷尽性检查。
- **Swift（2014）**：`Optional<T>` 类型，语法糖 `T?`，与 Kotlin 高度相似。

Kotlin 的设计选择：

- **语法糖 `T?`**：借鉴 Swift，比 Haskell 的 `Maybe` 更轻量。
- **操作符 `?.` / `?:`**：借鉴 Groovy 的安全导航运算符。
- **不引入 Monad**：与 Scala/Haskell 不同，Kotlin 不强制 `Option` 作为容器类型，保持 `T?` 与 `T` 的高度互操作。

### 2.3 Kotlin 1.0（2016）：空安全初版

Kotlin 1.0 引入完整的空安全类型系统：

```kotlin
// Kotlin 1.0
var name: String = "Alice"  // 不可空
var nick: String? = null    // 可空

val len: Int? = name?.length  // 安全调用
val length: Int = name?.length ?: 0  // Elvis
```

此时已包含：

1. 可空类型 `T?` 与不可空类型 `T`。
2. 安全调用 `?.`、Elvis `?:`、非空断言 `!!`、安全转换 `as?`。
3. 智能转换：`if (x != null) { x.length }`。
4. 平台类型 `T!`：Java 互操作时的延迟决策。
5. `lateinit var`：延迟初始化的不可空属性。
6. 集合的 `filterNotNull`、`mapNotNull` 扩展。

### 2.4 Kotlin 1.1（2017）：契约预览与 provideDelegate

Kotlin 1.1 引入了 `provideDelegate` 运算符（详见[委托属性](./委托属性.md)），间接改进了空安全：

```kotlin
class User {
    val name: String by notNullProperty { "default" }
}
```

同时引入实验性的"契约"（Contracts）API：

```kotlin
// 实验性
fun requireNotNull(x: T?): T {
    contract { returns() implies (x != null) }
    if (x == null) throw IllegalArgumentException()
    return x
}
```

### 2.5 Kotlin 1.2-1.3（2018）：契约稳定与 KMP

Kotlin 1.3 将契约机制稳定化，并扩展到标准库：

1. **`requireNotNull` 契约**：调用后编译器知道参数非 null。
2. **`checkNotNull` 契约**：同上，但抛出 `IllegalStateException`。
3. **`assert` 契约**：断言后编译器细化类型。
4. **KMP 一致性**：JVM、JS、Native 平台的空安全行为完全一致。

### 2.6 Kotlin 1.4-1.5（2020-2021）：跨平台空安全改进

Kotlin 1.4-1.5 在跨平台空安全方面有显著改进：

1. **`@Nullable` 注解标准化**：全面支持 JSpecify、JSR-305、JetBrains Annotations。
2. **`Enum.entries`**：替代 `values()`，避免数组拷贝。
3. **`orEmpty` 系列扩展**：`String?.orEmpty()`、`Collection<T>?.orEmpty()`。

### 2.7 Kotlin 1.6-1.7（2021-2022）：K2 与智能转换优化

Kotlin 1.6-1.7 的 K2 编译器预览对智能转换进行了优化：

1. **更精细的控制流分析**：K2 能在更多场景下推断类型细化，减少冗余的 `!!`。
2. **跨函数智能转换**：K2 能识别 `requireNotNull`、`checkNotNull` 的契约。
3. **更友好的错误信息**：K2 能精确指出智能转换失败的原因。

### 2.8 Kotlin 1.8-1.9（2023）：与 JSpecify 集成

Kotlin 1.8-1.9 与 JSpecify（Java 标准空安全注解）深度集成：

1. **JSpecify 注解识别**：`@Nullable`、`@NonNull`、`@NullMarked`。
2. **类型参数级空安全**：`List<@Nullable String>` 与 `List<String>` 区分。
3. **跨模块空安全**：KMP 项目中可空类型信息在模块间传递。

### 2.9 Kotlin 2.0（2024 年 5 月）：K2 全面成熟

Kotlin 2.0 的 K2 编译器对空安全进行了全面优化：

1. **更精确的智能转换**：K2 能识别更多边界条件，如 `when` 分支、`try` 表达式。
2. **更快的类型推断**：K2 的类型推断速度提升约 30%，减少编译时间。
3. **跨模块空安全检查**：K2 在编译时检查跨模块的可空类型一致性。
4. **更友好的平台类型警告**：K2 能精确指出平台类型的风险点。

### 2.10 JetBrains 的设计哲学

JetBrains 在设计 Kotlin 空安全时遵循了以下哲学：

1. **编译期优先**：错误在编译期暴露，而非运行时崩溃。
2. **显式优于隐式**：可空类型必须显式声明（`T?`），不可空是默认。
3. **渐进式严格**：初学者用 `?.` 与 `?:`，高级用户用契约与 `Result`。
4. **Java 互操作优先**：平台类型保证与 Java 代码无缝互操作。
5. **零运行时开销**：JVM 上不增加额外的 null 检查字节码（除 `lateinit` 与 `!!`）。
6. **可读性**：`?.` 与 `?:` 比 `Optional.flatMap` 更接近"自然语言"。

### 2.11 时间线总览

```
1965  ALGOL W — Tony Hoare 引入空引用（"十亿美元的错误"）
1973  ML — 引入 option 类型，函数式空安全开端
1990  Haskell — Maybe monad，类型系统化空安全
2004  Scala — Option[T]，函数式容器
2014  Swift — Optional<T>，语法糖 T?
2016  Kotlin 1.0 — 空安全初版，T?/?. /?:/!!/as?
2017  Kotlin 1.1 — 实验性契约 API
2018  Kotlin 1.3 — 契约稳定，KMP 一致性
2020  Kotlin 1.4 — @Nullable 注解标准化
2022  Kotlin 1.7 — K2 预览，智能转换优化
2023  Kotlin 1.9 — JSpecify 集成
2024  Kotlin 2.0 — K2 GA，跨模块空安全检查
```

---

## 3. 形式化定义

### 3.1 类型系统的空安全扩展

设 $\tau$ 为 Kotlin 的类型集合。Kotlin 在 $\tau$ 上定义可空类型构造器 $?$：

$$
? : \tau \to \tau_\top
$$

其中 $\tau_\top$ 是包含原类型与 $\text{Null}$ 的扩展类型集合。即：

$$
\forall T \in \tau, \quad T? := T \cup \{\text{Null}\}
$$

不可空类型 $T$ 与可空类型 $T?$ 的关系：

$$
T \sqsubseteq T?
$$

即 $T$ 是 $T?$ 的子类型。任何 $T$ 类型的值都可以赋给 $T?$ 类型的变量，反之不行。

### 3.2 Null 类型

`Null` 是 Kotlin 类型系统的"底层类型"（Bottom Type），记作 `Nothing?`：

$$
\text{Null} ::= \text{Nothing?}
$$

`Nothing?` 是所有可空类型的子类型：

$$
\forall T \in \tau, \quad \text{Nothing?} \sqsubseteq T?
$$

这意味着 `null` 可以赋给任何可空类型 $T?$，但不能赋给不可空类型 $T$。

### 3.3 子类型关系的形式化

Kotlin 的子类型关系 $\sqsubseteq$ 在引入可空性后变为：

$$
\forall T_1, T_2 \in \tau, \quad T_1 \sqsubseteq T_2 \implies T_1 \sqsubseteq T_2? \land T_1? \not\sqsubseteq T_2
$$

即：如果 $T_1$ 是 $T_2$ 的子类型，则 $T_1$ 也是 $T_2?$ 的子类型；但 $T_1?$ 不是 $T_2$ 的子类型。

特殊地：

$$
\text{String} \sqsubseteq \text{String?}, \quad \text{String?} \not\sqsubseteq \text{String}
$$

### 3.4 安全调用操作符 `?.`

安全调用操作符的形式化定义：

$$
?. : T? \times (T \to R) \to R?
$$

$$
x?.f = \begin{cases}
f(x) & \text{if } x \neq \text{null} \\
\text{null} & \text{otherwise}
\end{cases}
$$

更精确地，对于方法调用 `x?.method(args)`：

$$
x?.\text{method}(\text{args}) = \begin{cases}
x.\text{method}(\text{args}) & \text{if } x \neq \text{null} \\
\text{null} & \text{otherwise}
\end{cases}
$$

返回类型为 $R?$，其中 $R$ 是 `method` 的返回类型。

### 3.5 Elvis 运算符 `?:`

Elvis 运算符的形式化定义：

$$
?: : T? \times T \to T
$$

$$
x ?: y = \begin{cases}
x & \text{if } x \neq \text{null} \\
y & \text{otherwise}
\end{cases}
$$

更一般地，右侧可以是任意表达式：

$$
x ?: e = \begin{cases}
x & \text{if } x \neq \text{null} \\
e & \text{otherwise}
\end{cases}
$$

返回类型为 $T$，即不可空。

### 3.6 非空断言操作符 `!!`

非空断言的形式化定义：

$$
!! : T? \to T
$$

$$
x!! = \begin{cases}
x & \text{if } x \neq \text{null} \\
\text{throw NPE} & \text{otherwise}
\end{cases}
$$

`!!` 是"逃生舱"，将可空类型强制转换为不可空类型，但代价是可能的运行时 NPE。

### 3.7 安全转换操作符 `as?`

安全转换的形式化定义：

$$
as? : T \times \tau \to U?
$$

$$
x \text{ as? } U = \begin{cases}
x \text{ as } U & \text{if } x \text{ is } U \\
\text{null} & \text{otherwise}
\end{cases}
$$

返回类型为 $U?$，转换失败时返回 `null` 而非抛出 `ClassCastException`。

### 3.8 智能转换（Smart Casts）

智能转换的形式化定义涉及控制流分析（CFA）。设 $\Gamma$ 为类型环境，$P$ 为谓词（如 `is`、`!= null`）：

$$
\Gamma, x : T? \vdash P(x) \implies \Gamma, x : T
$$

即在 `P(x)` 成立的分支内，$x$ 的类型从 $T?$ 细化为 $T$。

更具体地，对于 `if (x != null)`：

$$
\text{if } (x \neq \text{null}) \{ \text{branch} \} \implies \text{in branch: } x : T
$$

智能转换的有效性依赖于：

1. **变量不可变**：`val` 或 `final` 属性；`var` 在多线程下可能被修改。
2. **作用域内**：智能转换仅在控制流分支内有效。
3. **无副作用**：检查与使用之间变量未被重新赋值。

### 3.9 平台类型（Platform Types）

平台类型的形式化定义：

$$
T! := T \cup \{\text{Null}\} \cup T_\text{unknown}
$$

其中 $T_\text{unknown}$ 表示"未知可空性"。平台类型在 Kotlin 中无法直接声明，仅通过 Java 互操作引入。

平台类型的传播规则：

1. **赋值给可空类型**：`val x: String? = java.getString()`，按 `String?` 处理。
2. **赋值给不可空类型**：`val x: String = java.getString()`，按 `String` 处理，但运行时可能 NPE。
3. **传递给 Kotlin 函数**：按目标参数类型推断。
4. **链式调用**：`java.getList().size` 的类型是 `Int!`，传播平台类型。

### 3.10 lateinit 的形式化

`lateinit var` 的形式化定义：

$$
\text{lateinit var } x : T := \text{var } x : T_\text{uninitialized}
$$

其中 $T_\text{uninitialized}$ 是一个特殊的内部类型，在初始化前为"未初始化状态"，初始化后为 $T$。

访问语义：

$$
\text{get}(x) = \begin{cases}
x.\text{value} & \text{if initialized} \\
\text{throw UninitializedPropertyAccessException} & \text{otherwise}
\end{cases}
$$

### 3.11 契约（Contracts）的形式化

契约机制允许函数告知编译器关于参数或控制流的信息：

$$
\text{contract} : \text{Function} \times \text{Effect} \to \text{Unit}
$$

其中 `Effect` 包括：

- `returns() implies (condition)`：函数返回时条件成立。
- `callsInPlace(lambda, kind)`：lambda 在函数内被调用。
- `returns(value) implies (condition)`：返回特定值时条件成立。

形式化地，`requireNotNull` 的契约：

$$
\text{requireNotNull}(x : T?) : T \quad \text{with contract} \quad \text{returns()} \implies (x \neq \text{null})
$$

编译器利用此契约进行智能转换：

```kotlin
fun process(x: String?) {
    requireNotNull(x)
    // 此处 x 已被智能转换为 String
    println(x.length)
}
```

### 3.12 JVM 字节码层面的空安全

在 JVM 字节码层面，`T` 与 `T?` 没有运行时差异（都是引用类型）。空安全通过以下机制实现：

1. **编译时检查**：编译器在调用 `?.`、`?:`、`!!` 时插入 null 检查。
2. **注解**：通过 `@Nullable`、`@NotNull` 注解（`org.jetbrains.annotations`）在字节码中标注可空性，供 Java 调用者使用。
3. **`Intrinsics.checkNotNull`**：Kotlin 编译器在公共 API 参数上插入运行时检查（默认启用，可通过 `-Xno-param-assertions` 关闭）。

`?.` 的字节码等价物：

```java
// 源码：x?.length
// 字节码等价：
Integer length = (x != null) ? x.length() : null;
```

`?:` 的字节码等价物：

```java
// 源码：x ?: ""
// 字节码等价：
String result = (x != null) ? x : "";
```

`!!` 的字节码等价物：

```java
// 源码：x!!
// 字节码等价：
if (x == null) {
    Intrinsics.throwNpe();
}
String result = x;
```

---

## 4. 理论推导与原理解析

### 4.1 子类型关系的代数性质

Kotlin 的可空类型构造器 $?$ 满足以下代数性质：

1. **吸收律（左）**：$T?? = T?$。即对可空类型再取可空，结果仍是可空类型。
2. **单位律**：$T \sqsubseteq T?$。任何不可空类型是其可空版本的子类型。
3. **传递律**：若 $T_1 \sqsubseteq T_2$，则 $T_1? \sqsubseteq T_2?$。
4. **反单调性**：若 $T_1? \sqsubseteq T_2$，则 $T_1 \sqsubseteq T_2$（即不可空版本也是子类型）。

形式化证明性质 1：

$$
T?? = (T \cup \{\text{Null}\})? = (T \cup \{\text{Null}\}) \cup \{\text{Null}\} = T \cup \{\text{Null}\} = T?
$$

### 4.2 智能转换的正确性证明

智能转换的核心是控制流分析（CFA）。考虑：

```kotlin
fun process(x: String?) {
    if (x != null) {
        // 此处 x: String
        println(x.length)
    }
}
```

证明在 `if` 分支内 $x : \text{String}$：

1. 进入分支的条件是 $x \neq \text{null}$。
2. $x$ 是 `val`（不可变），在分支内 $x$ 的值不会改变。
3. 由 $x : \text{String?}$ 与 $x \neq \text{null}$，推出 $x : \text{String}$（因为 $\text{String?} = \text{String} \cup \{\text{Null}\}$）。

形式化地：

$$
\frac{\Gamma \vdash x : \text{String?} \quad \Gamma \vdash x \neq \text{null}}{\Gamma \vdash x : \text{String}} \text{ (SmartCast)}
$$

### 4.3 智能转换的失效场景

智能转换在以下场景失效：

1. **`var` 属性**：多线程下可能被修改。
2. **开放属性**：子类可能覆盖 getter，返回值不一致。
3. **委托属性**：getter 行为不确定。
4. **跨函数**：函数调用后变量可能被修改。
5. **非局部属性**：可能被其他代码修改。

```kotlin
class Example {
    var x: String? = null
    
    fun process() {
        if (x != null) {
            // 错误：x 是 var 属性，智能转换失效
            // println(x.length)  // 编译错误
            println(x!!.length)  // 需要 !!
        }
    }
}
```

编译器保守地认为 `var` 属性在 `if` 检查与使用之间可能被其他线程修改，因此不应用智能转换。

### 4.4 平台类型的传播规则

平台类型 $T!$ 在 Kotlin 代码中的传播遵循以下规则：

1. **直接赋值**：根据目标类型推断。
2. **函数调用**：根据参数类型推断。
3. **链式调用**：平台类型传播到结果。
4. **集合操作**：`List<String!>!` 表示列表本身与元素都可空性未知。

```kotlin
// Java 代码：String getName()
val name = javaService.getName()  // 类型推断为 String!

// 赋值给可空：String?
val nullableName: String? = javaService.getName()

// 赋值给不可空：String（运行时可能 NPE）
val nonNullName: String = javaService.getName()
```

形式化地，平台类型的传播：

$$
\frac{\Gamma \vdash e : T! \quad \Gamma \vdash \text{target} : U?}{\Gamma \vdash e : U?} \text{ (AssignToNullable)}
$$

$$
\frac{\Gamma \vdash e : T! \quad \Gamma \vdash \text{target} : U}{\Gamma \vdash e : U \text{ (with runtime check)}} \text{ (AssignToNonNull)}
$$

### 4.5 `?.` 链式的类型推导

考虑：

```kotlin
val street: String? = company?.department?.manager?.address?.street
```

类型推导规则：

$$
\text{company} : \text{Company?}
\xrightarrow{?.\text{department}}
\text{Department?}
\xrightarrow{?.\text{manager}}
\text{Manager?}
\xrightarrow{?.\text{address}}
\text{Address?}
\xrightarrow{?.\text{street}}
\text{String?}
$$

即链式 `?.` 的结果类型是"所有链节点的可空类型的累积"。任何一节为 `null`，整个表达式为 `null`。

### 4.6 `?:` 与 `?.` 的等价性

`x ?: default` 等价于 `if (x != null) x else default`，也等价于 `x?.let { it } ?: default`（但后者有额外开销）。

形式化地：

$$
x ?: y \equiv \text{if } (x \neq \text{null}) \text{ then } x \text{ else } y
$$

编译器对 `?:` 进行优化，避免重复计算 $x$。

### 4.7 `lateinit` 与 `lazy` 的字节码对比

`lateinit var x: String` 的字节码（简化）：

```java
// 字段
private String x;

// getter
public String getX() {
    if (this.x == null) {
        Intrinsics.throwUninitializedPropertyAccessException("x");
    }
    return this.x;
}

// setter
public void setX(String x) {
    this.x = x;
}
```

`val x: String by lazy { "hello" }` 的字节码（简化）：

```java
// 委托字段
private final Lazy<String> x$delegate = LazyKt.lazy(() -> "hello");

// getter
public String getX() {
    return this.x$delegate.getValue();
}
```

对比：

| 特性 | `lateinit var` | `by lazy` |
|------|----------------|-----------|
| 类型 | `var` | `val` |
| 初始化 | 显式赋值 | 自动求值 |
| 线程安全 | 否 | 是（默认 `SYNCHRONIZED`） |
| 字节码 | 字段 + null 检查 | `Lazy` 对象 |
| 性能 | 直接字段访问 | 委托调用 |
| 适用场景 | 已知初始化时机 | 惰性求值 |

### 4.8 契约机制的实现原理

契约通过 `kotlin.contracts` 包实现。`requireNotNull` 的源码（简化）：

```kotlin
public inline fun <T : Any> requireNotNull(value: T?): T {
    contract {
        returns() implies (value != null)
    }
    if (value == null) {
        throw IllegalArgumentException("Required value was null.")
    }
    return value
}
```

编译器在遇到 `requireNotNull(x)` 后，根据契约 `returns() implies (x != null)` 进行智能转换：

```kotlin
fun process(x: String?) {
    requireNotNull(x)
    // 编译器根据契约知道 x != null
    // 因此智能转换为 String
    println(x.length)
}
```

形式化地，契约是一个"编译期断言"：

$$
\text{requireNotNull}(x) \implies \text{contract}(\text{returns()} \implies x \neq \text{null})
$$

$$
\text{After call: } \Gamma, x : \text{String?} \vdash x \neq \text{null} \implies \Gamma, x : \text{String}
$$

### 4.9 `Result<T>` 与 `T?` 的语义差异

`Result<T>` 是 Kotlin 标准库提供的"可能失败"类型：

```kotlin
public value class Result<out T> {
    public companion object {
        public inline fun <T> success(value: T): Result<T>
        public inline fun <T> failure(exception: Throwable): Result<T>
    }
}
```

`Result<T>` 与 `T?` 的对比：

| 维度 | `T?` | `Result<T>` |
|------|-------|-------------|
| 表示 | 值或 null | 值或异常 |
| 信息 | 仅有"无值" | 包含异常信息 |
| 传播 | `?.` 与 `?:` | `getOrElse`、`map`、`recover` |
| 强制 | 编译器强制处理 | 函数式风格 |
| 适用 | 缺失值 | 可能失败的操作 |

`Result` 在"需要区分'无值'与'失败'"的场景下优于 `T?`。

### 4.10 集合的可空性

Kotlin 区分四种集合类型：

1. `List<String>`：列表本身不可空，元素不可空。
2. `List<String?>`：列表本身不可空，元素可空。
3. `List<String>?`：列表本身可空，元素不可空。
4. `List<String?>?`：列表本身可空，元素可空。

形式化地：

$$
\text{List}\langle T \rangle \neq \text{List}\langle T? \rangle \neq \text{List}\langle T \rangle? \neq \text{List}\langle T? \rangle?
$$

```kotlin
val names: List<String?> = listOf("Alice", null, "Bob")
val filtered: List<String> = names.filterNotNull()  // ["Alice", "Bob"]
val lengths: List<Int> = names.mapNotNull { it?.length }  // [5, 3]
```

`filterNotNull` 的形式化：

$$
\text{filterNotNull} : \text{List}\langle T? \rangle \to \text{List}\langle T \rangle
$$

---

## 5. 代码示例

### 5.1 基础：可空类型与不可空类型

```bash
# 编译与运行
kotlinc -script nullable_basic.kts
```

```kotlin
// nullable_basic.kts
fun main() {
    var name: String = "Alice"  // 不可空
    var nick: String? = null    // 可空
    
    // 不可空类型不能赋值为 null
    // name = null  // 编译错误：Null can not be a value of a non-null type String
    
    // 可空类型的成员不能直接访问
    // println(nick.length)  // 编译错误：Only safe (?.) or non-null asserted (!!.) calls are allowed on a nullable receiver of type String?
    
    // 安全调用
    val len: Int? = nick?.length
    println("Length: $len")  // null
    
    // Elvis 运算符
    val length: Int = nick?.length ?: 0
    println("Length with default: $length")  // 0
    
    // 非空断言
    var value: String? = "Hello"
    println(value!!.length)  // 5
    // value = null
    // println(value!!.length)  // 运行时：NullPointerException
    
    // 安全转换
    val obj: Any = "hello"
    val str: String? = obj as? String  // "hello"
    val num: Int? = obj as? Int  // null
    println("String: $str, Int: $num")
}
```

### 5.2 智能转换：控制流细化

```bash
kotlinc -script smart_casts.kts
```

```kotlin
// smart_casts.kts
fun process(s: String?) {
    // if 分支内的智能转换
    if (s != null) {
        // s 自动从 String? 转换为 String
        println(s.length)  // 无需 ?. 或 !!
    }
}

fun describe(x: Any) = when (x) {
    is String -> x.length      // x 自动转换为 String
    is Int -> x.toDouble()     // x 自动转换为 Int
    is List<*> -> x.size       // x 自动转换为 List
    else -> "未知类型"
}

fun handle(value: Any) {
    if (value is String) {
        println(value.uppercase())  // value 自动转换为 String
    }
    
    // !is 检查
    if (value !is String) {
        println("Not a string")
        return
    }
    // 此处 value 自动转换为 String（因 !is 分支返回）
    println(value.length)
}

// while 循环中的智能转换
fun readInput(): String? = readLine()

fun processInput() {
    var input: String? = readInput()
    while (input != null) {
        process(input)  // input 自动转换为 String
        input = readInput()
    }
}

fun process(s: String) {
    println("Processed: $s")
}

fun main() {
    process("hello")
    println(describe(42))
    println(describe("world"))
    println(describe(listOf(1, 2, 3)))
}
```

### 5.3 安全调用链：深层嵌套

```bash
kotlinc -script safe_chain.kts
```

```kotlin
// safe_chain.kts
data class Address(val street: String?, val city: String?)
data class User(val name: String?, val address: Address?)

fun getStreet(user: User?): String {
    // 链式安全调用 + Elvis 默认值
    return user?.address?.street ?: "未知街道"
}

fun getFullInfo(user: User?): String {
    val name = user?.name ?: "匿名"
    val street = user?.address?.street ?: "未知街道"
    val city = user?.address?.city ?: "未知城市"
    return "$name, $street, $city"
}

fun main() {
    val user = User("Alice", Address("Main St", "NYC"))
    println(getStreet(user))  // Main St
    println(getStreet(null))  // 未知街道
    
    val nullUser: User? = null
    println(getFullInfo(nullUser))  // 匿名, 未知街道, 未知城市
    
    // 链式调用中的多个 ?. 与 ?: 混合
    val result = user?.address?.city?.takeIf { it.length > 2 } ?: "短"
    println(result)  // NYC
}
```

### 5.4 let、run、with 处理空值

```bash
kotlinc -script scope_functions.kts
```

```kotlin
// scope_functions.kts
data class User(val name: String?, val age: Int?)

fun main() {
    val user = User("Alice", 25)
    
    // let：对非空值执行操作（通过 it 引用）
    user.name?.let {
        println("名字: $it, 长度: ${it.length}")
    }
    
    // run：对非空值执行代码块（通过 this 引用）
    user.name?.run {
        println("名字: $this, 长度: ${length}")
    }
    
    // also：执行副作用，返回原值
    val processedName = user.name?.also {
        println("处理中: $it")
    }?.uppercase()
    println("处理结果: $processedName")
    
    // takeIf / takeUnless：条件判断
    val validName = user.name?.takeIf { it.length > 2 }
    val invalidName = user.name?.takeUnless { it.isBlank() }
    println("Valid: $validName, Invalid: $invalidName")
    
    // 组合使用
    user.age?.let { age ->
        if (age >= 18) {
            println("成年人")
        } else {
            println("未成年")
        }
    } ?: println("年龄未知")
}
```

### 5.5 集合的可空处理

```bash
kotlinc -script nullable_collections.kts
```

```kotlin
// nullable_collections.kts
fun main() {
    val names: List<String?> = listOf("Alice", null, "Bob", null, "Charlie")
    
    // filterNotNull：过滤 null 值，得到非空类型列表
    val nonNull: List<String> = names.filterNotNull()
    println(nonNull)  // [Alice, Bob, Charlie]
    
    // mapNotNull：映射并过滤 null
    val lengths: List<Int> = names.mapNotNull { it?.length }
    println(lengths)  // [5, 3, 7]
    
    // forEach 中处理 null
    names.forEach { name ->
        name?.let {
            println("名字: $it, 长度: ${it.length}")
        }
    }
    
    // OrNull 系列
    val list = listOf("a", "b", "c")
    val first = list.firstOrNull()
    val last = list.lastOrNull()
    val element = list.getOrNull(5)  // null
    println("First: $first, Last: $last, Element at 5: $element")
    
    val numbers = listOf(3, 1, 4, 1, 5, 9, 2, 6)
    val min = numbers.minOrNull()
    val max = numbers.maxOrNull()
    println("Min: $min, Max: $max")
    
    // 空列表的 firstOrNull / lastOrNull
    val empty = emptyList<String>()
    println("Empty first: ${empty.firstOrNull()}")  // null
    
    // indexOfFirst / indexOfLast
    val index = names.indexOfFirst { it == "Bob" }
    println("Bob index: $index")
}
```

### 5.6 前置条件检查

```bash
kotlinc -script preconditions.kts
```

```kotlin
// preconditions.kts
fun processName(name: String?) {
    // requireNotNull：参数校验，失败抛 IllegalArgumentException
    requireNotNull(name) { "姓名不能为空" }
    // 此处 name 自动智能转换为 String（依赖契约）
    println("姓名长度: ${name.length}")
}

fun processAge(age: Int?) {
    require(age != null) { "年龄不能为 null" }
    require(age >= 0) { "年龄不能为负数: $age" }
    require(age <= 150) { "年龄异常: $age" }
    println("有效年龄: $age")
}

class Service {
    private var initialized: Boolean = false
    
    fun process() {
        // checkNotNull：状态检查，失败抛 IllegalStateException
        check(initialized) { "服务未初始化，请先调用 init()" }
        // 处理逻辑
    }
    
    fun init() {
        initialized = true
    }
}

class Config {
    private var _value: String? = null
    val value: String
        get() {
            // 自定义错误处理
            return _value ?: throw IllegalStateException("配置未加载")
        }
}

fun main() {
    processName("Alice")
    processAge(25)
    // processName(null)  // IllegalArgumentException: 姓名不能为空
    
    val service = Service()
    // service.process()  // IllegalStateException: 服务未初始化
    service.init()
    service.process()
    
    val config = Config()
    // config.value  // IllegalStateException: 配置未加载
}
```

### 5.7 lateinit 延迟初始化

```bash
kotlinc -script lateinit_demo.kts
```

```kotlin
// lateinit_demo.kts
class UserController {
    // lateinit 只能用于 var，且类型必须非空
    lateinit var userService: UserService
    lateinit var repository: UserRepository
    
    fun setup() {
        userService = UserService()
        repository = UserRepository()
    }
    
    fun processUser(id: String): String {
        // 访问未初始化的 lateinit 会抛出 UninitializedPropertyAccessException
        return userService.getUser(id)
    }
    
    // 检查是否已初始化（Kotlin 1.2+）
    fun isReady(): Boolean {
        return ::userService.isInitialized && ::repository.isInitialized
    }
}

class UserService {
    fun getUser(id: String): String = "User-$id"
}

class UserRepository

// Android ViewBinding 场景
class MainActivity {
    private lateinit var binding: ViewBinding
    
    fun onCreate() {
        binding = ViewBinding.inflate()
        binding.textView.text = "Hello"
    }
}

class ViewBinding {
    val textView = TextView()
    companion object {
        fun inflate(): ViewBinding = ViewBinding()
    }
}

class TextView {
    var text: String = ""
}

fun main() {
    val controller = UserController()
    println("Ready: ${controller.isReady()}")  // false
    controller.setup()
    println("Ready: ${controller.isReady()}")  // true
    println(controller.processUser("123"))
}
```

### 5.8 lazy 惰性求值

```bash
kotlinc -script lazy_demo.kts
```

```kotlin
// lazy_demo.kts
import kotlin.properties.Delegates

class Config {
    // lazy 委托，惰性求值
    val databaseUrl: String by lazy {
        println("Initializing database URL...")
        System.getenv("DATABASE_URL") ?: "default-url"
    }
    
    // observable：监听属性变化
    var featureFlag: Boolean by Delegates.observable(false) { _, old, new ->
        println("Feature flag changed: $old -> $new")
    }
    
    // vetoable：校验新值
    var port: Int by Delegates.vetoable(8080) { _, old, new ->
        if (new in 1..65535) {
            true  // 接受
        } else {
            println("Invalid port: $new, keeping $old")
            false  // 拒绝
        }
    }
}

fun main() {
    val config = Config()
    
    // lazy 只在首次访问时初始化
    println("Before access")
    println("URL: ${config.databaseUrl}")
    println("URL again: ${config.databaseUrl}")  // 不会再次初始化
    
    // observable
    config.featureFlag = true   // 输出: Feature flag changed: false -> true
    config.featureFlag = false  // 输出: Feature flag changed: true -> false
    
    // vetoable
    config.port = 3000  // 接受
    println("Port: ${config.port}")
    config.port = 99999  // 拒绝
    println("Port: ${config.port}")  // 仍是 3000
}
```

### 5.9 自定义契约

```bash
kotlinc -script custom_contract.kts
```

```kotlin
// custom_contract.kts
import kotlin.contracts.*

// 自定义契约函数
fun requireNonEmpty(value: String?) {
    contract {
        returns() implies (value != null && value.isNotEmpty())
    }
    if (value.isNullOrEmpty()) {
        throw IllegalArgumentException("Value must be non-empty")
    }
}

fun requirePositive(value: Int) {
    contract {
        returns() implies (value > 0)
    }
    if (value <= 0) {
        throw IllegalArgumentException("Value must be positive")
    }
}

fun process(value: String?) {
    requireNonEmpty(value)
    // 此处 value 已被智能转换为非空 String
    // 且契约保证 isNotEmpty()
    println("Processing: ${value.length} chars")
}

fun calculate(n: Int) {
    requirePositive(n)
    // 编译器知道 n > 0
    val result = 100 / n  // 不会除零
    println("Result: $result")
}

fun main() {
    process("hello")
    calculate(10)
    // process(null)  // IllegalArgumentException
    // calculate(-1)  // IllegalArgumentException
}
```

### 5.10 Result 类型：函数式错误处理

```bash
kotlinc -script result_type.kts
```

```kotlin
// result_type.kts
import java.io.File

// 使用 Result 包装可能失败的操作
fun readFile(path: String): Result<String> = runCatching {
    File(path).readText()
}

fun parseInt(s: String): Result<Int> = runCatching {
    s.toInt()
}

fun divide(a: Int, b: Int): Result<Int> = runCatching {
    if (b == 0) throw ArithmeticException("Division by zero")
    a / b
}

fun main() {
    // 基本使用
    val result = readFile("nonexistent.txt")
    println("Success: ${result.isSuccess}")
    println("Failure: ${result.isFailure}")
    println("Get: ${result.getOrNull()}")
    println("Exception: ${result.exceptionOrNull()?.message}")
    
    // getOrElse：失败时返回默认值
    val content = readFile("nonexistent.txt").getOrElse { "default" }
    println("Content: $content")
    
    // map：转换成功值
    val length = readFile("nonexistent.txt")
        .map { it.length }
        .getOrElse { 0 }
    println("Length: $length")
    
    // recover：失败时恢复
    val recovered = divide(10, 0)
        .recover { e ->
            println("Error: ${e.message}")
            -1
        }
        .getOrThrow()
    println("Recovered: $recovered")
    
    // 链式处理
    val finalResult = parseInt("42")
        .mapCatching { it * 2 }
        .getOrThrow()
    println("Final: $finalResult")
    
    // T? 与 Result<T> 的互转
    val nullable: String? = "hello"
    val result2 = nullable?.let { Result.success(it) } ?: Result.failure(NullPointerException())
    println("From nullable: ${result2.getOrNull()}")
    
    val toNullable: String? = result2.getOrNull()
    println("To nullable: $toNullable")
}
```

### 5.11 Java 互操作：平台类型

```bash
# 假设有 Java 类 JavaService
kotlinc -cp . -script platform_types.kts
```

```kotlin
// platform_types.kts
// 假设 JavaService 是 Java 类：
// public class JavaService {
//     public String getName() { return null; }
//     public List<String> getNames() { return null; }
// }

// 模拟 Java 服务
class JavaService {
    // 模拟 Java 方法（不标注可空性）
    fun getName(): String? = null  // 在 Kotlin 中显式声明可空
    fun getNames(): List<String>? = null
}

fun main() {
    val service = JavaService()
    
    // 平台类型：JavaService.getName() 的类型是 String!（平台类型）
    // 在 Kotlin 中，根据使用方式推断
    val name1: String = service.getName()!!  // 强制非空（运行时可能 NPE）
    val name2: String? = service.getName()  // 安全处理
    val name3 = service.getName()  // 推断为 String?（因方法签名标注）
    
    println("Name1: ${name1 ?: "null"}")
    println("Name2: $name2")
    println("Name3: $name3")
    
    // 安全调用链
    val length = service.getName()?.length ?: 0
    println("Length: $length")
    
    // 集合的平台类型
    val names = service.getNames()
    val size = names?.size ?: 0
    println("Names size: $size")
}

// 推荐做法：为 Java 互操作添加 @Nullable / @Nullable 注解
// Java 代码：
// @NotNull
// public String getName() { return "Alice"; }
//
// @Nullable
// public String getOptionalName() { return null; }
```

### 5.12 sealed class 与空安全

```bash
kotlinc -script sealed_nullable.kts
```

```kotlin
// sealed_nullable.kts
// 使用 sealed class 替代可空类型，提供更多信息
sealed class UserResult {
    data class Success(val user: User) : UserResult()
    object NotFound : UserResult()
    data class Error(val message: String) : UserResult()
}

data class User(val id: String, val name: String)

class UserService {
    private val users = mapOf(
        "1" to User("1", "Alice"),
        "2" to User("2", "Bob")
    )
    
    // 返回 sealed class，而非 User?
    fun findById(id: String): UserResult = when (id) {
        in users -> UserResult.Success(users[id]!!)
        "error" -> UserResult.Error("Service unavailable")
        else -> UserResult.NotFound
    }
}

fun process(result: UserResult) {
    // when 表达式穷尽性检查
    when (result) {
        is UserResult.Success -> println("Found: ${result.user.name}")
        UserResult.NotFound -> println("User not found")
        is UserResult.Error -> println("Error: ${result.message}")
    }
}

// 使用 Optional<T> 自定义类型
sealed class Optional<out T> {
    object None : Optional<Nothing>()
    data class Some<T>(val value: T) : Optional<T>()
    
    companion object {
        fun <T> of(value: T?): Optional<T> = if (value != null) Some(value) else None
        fun <T> empty(): Optional<T> = None
    }
}

fun <T, R> Optional<T>.map(f: (T) -> R): Optional<R> = when (this) {
    is Optional.None -> Optional.None
    is Optional.Some -> Optional.Some(f(value))
}

fun <T, R> Optional<T>.flatMap(f: (T) -> Optional<R>): Optional<R> = when (this) {
    is Optional.None -> Optional.None
    is Optional.Some -> f(value)
}

fun <T> Optional<T>.getOrElse(default: T): T = when (this) {
    is Optional.None -> default
    is Optional.Some -> value
}

fun main() {
    val service = UserService()
    
    process(service.findById("1"))
    process(service.findById("999"))
    process(service.findById("error"))
    
    // Optional 使用
    val value: String? = "hello"
    val opt = Optional.of(value)
    
    val length = opt.map { it.length }.getOrElse(0)
    println("Length: $length")
    
    val empty: String? = null
    val emptyOpt = Optional.of(empty)
    val emptyLength = emptyOpt.map { it.length }.getOrElse(-1)
    println("Empty length: $emptyLength")
}
```

### 5.13 多值可空组合：自定义 safeLet

```bash
kotlinc -script safe_let.kts
```

```kotlin
// safe_let.kts
// 自定义多值可空组合

// 双值组合
fun <T1, T2, R> safeLet(
    v1: T1?,
    v2: T2?,
    block: (T1, T2) -> R
): R? {
    return if (v1 != null && v2 != null) block(v1, v2) else null
}

// 三值组合
fun <T1, T2, T3, R> safeLet(
    v1: T1?,
    v2: T2?,
    v3: T3?,
    block: (T1, T2, T3) -> R
): R? {
    return if (v1 != null && v2 != null && v3 != null) block(v1, v2, v3) else null
}

// 四值组合
fun <T1, T2, T3, T4, R> safeLet(
    v1: T1?,
    v2: T2?,
    v3: T3?,
    v4: T4?,
    block: (T1, T2, T3, T4) -> R
): R? {
    return if (v1 != null && v2 != null && v3 != null && v4 != null) block(v1, v2, v3, v4) else null
}

// 使用 Optional + 契约
import kotlin.contracts.*

fun <T1, T2, R> zipValues(
    v1: T1?,
    v2: T2?,
    block: (T1, T2) -> R
): R? {
    contract { callsInPlace(block, InvocationKind.EXACTLY_ONCE) }
    return if (v1 != null && v2 != null) block(v1, v2) else null
}

data class User(val name: String, val age: Int)
data class Address(val city: String, val zip: String)

fun main() {
    val name: String? = "Alice"
    val age: Int? = 25
    val city: String? = "NYC"
    val zip: String? = "10001"
    
    // 双值组合
    val user = safeLet(name, age) { n, a -> User(n, a) }
    println("User: $user")
    
    // 三值组合
    val info = safeLet(name, age, city) { n, a, c -> "$n ($a) from $c" }
    println("Info: $info")
    
    // 四值组合
    val fullInfo = safeLet(name, age, city, zip) { n, a, c, z -> "$n ($a) from $c, $z" }
    println("Full: $fullInfo")
    
    // 任一为 null 时返回 null
    val nullName: String? = null
    val partial = safeLet(nullName, age) { n, a -> User(n, a) }
    println("Partial: $partial")  // null
    
    // zipValues（带契约，支持智能转换）
    val result = zipValues(name, age) { n, a -> "$n is $a years old" }
    println("Zipped: $result")
}
```

### 5.14 Android 视图绑定

```bash
# Android 项目，假设有 ViewBinding
# 详见 Android 官方文档
```

```kotlin
// AndroidViewBinding.kt（示意）
// 使用委托属性封装 ViewBinding

import kotlin.properties.ReadOnlyProperty
import kotlin.reflect.KProperty

// 自定义委托：封装 ViewBinding 的延迟初始化
class ViewBindingDelegate<T> : ReadOnlyProperty<androidx.fragment.app.Fragment, T> {
    private var binding: T? = null
    
    override fun getValue(thisRef: androidx.fragment.app.Fragment, property: KProperty<*>): T {
        // 已缓存则返回
        binding?.let { return it }
        
        // 否则创建（实际项目中通过反射或 Generated Binding）
        throw IllegalStateException("ViewBinding not initialized")
    }
    
    fun clear() {
        binding = null
    }
}

// 使用示例（伪代码，需 Android 环境）
/*
class MyFragment : Fragment() {
    private val binding: MyFragmentBinding by ViewBindingDelegate()
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = MyFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.textView.text = "Hello"
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        // 清理 binding 引用
        (binding as? ViewBindingDelegate<*>)?.clear()
    }
}
*/

// 简化版：使用 lazy + viewLifecycleOwner
class SimpleFragment {
    private val binding by lazy {
        // 实际：MyFragmentBinding.inflate(layoutInflater)
        "MyFragmentBinding"
    }
    
    fun onViewCreated() {
        println("Binding: $binding")
    }
}

fun main() {
    val fragment = SimpleFragment()
    fragment.onViewCreated()
}
```

### 5.15 数据库实体可空处理

```bash
kotlinc -script db_entities.kts
```

```kotlin
// db_entities.kts
// 数据库实体中可空字段的正确处理

// 模拟数据库行
class DataRow {
    private val data = mutableMapOf<String, Any?>()
    
    fun put(key: String, value: Any?) {
        data[key] = value
    }
    
    // 返回平台类型
    fun get(key: String): Any? = data[key]
    
    // 类型安全的获取
    inline fun <reified T> getTyped(key: String): T? {
        val value = data[key] ?: return null
        return if (value is T) value else null
    }
}

// 实体定义
data class UserEntity(
    val id: Long,
    val name: String,           // NOT NULL
    val email: String?,         // NULLABLE
    val age: Int?,               // NULLABLE
    val deletedAt: String?      // NULLABLE
)

// 映射函数
fun mapUser(row: DataRow): UserEntity {
    return UserEntity(
        id = row.getTyped<Long>("id") ?: throw IllegalStateException("id is required"),
        name = row.getTyped<String>("name") ?: throw IllegalStateException("name is required"),
        email = row.getTyped<String>("email"),
        age = row.getTyped<Int>("age"),
        deletedAt = row.getTyped<String>("deleted_at")
    )
}

fun main() {
    val row = DataRow()
    row.put("id", 1L)
    row.put("name", "Alice")
    row.put("email", null)
    row.put("age", 25)
    // deleted_at 未设置
    
    val user = mapUser(row)
    println("User: $user")
    println("Email is null: ${user.email == null}")
    
    // 使用 ?. 与 ?: 处理可空字段
    val displayEmail = user.email ?: "未填写"
    println("Display email: $displayEmail")
    
    // 条件判断
    if (user.age != null && user.age >= 18) {
        println("成年人")
    }
    
    // 已删除用户
    if (user.deletedAt != null) {
        println("用户已删除于: ${user.deletedAt}")
    } else {
        println("活跃用户")
    }
}
```

### 5.16 Kotlin 与 Java 互操作最佳实践

```bash
# 假设有 Java 类，使用 @Nullable / @NotNull 注解
kotlinc -cp . -script interop_best.kts
```

```kotlin
// interop_best.kts
// 模拟带注解的 Java 类
import org.jetbrains.annotations.Nullable
import org.jetbrains.annotations.NotNull

class JavaServiceWithAnnotations {
    @NotNull
    fun getRequiredName(): String = "Alice"
    
    @Nullable
    fun getOptionalName(): String? = null
    
    @NotNull
    fun getList(): List<String> = listOf("a", "b", "c")
}

class JavaServiceWithoutAnnotations {
    // 无注解的 Java 方法（平台类型）
    fun getName(): String = "Bob"  // Kotlin 中当作 String!
}

fun main() {
    val service1 = JavaServiceWithAnnotations()
    
    // 有注解时，Kotlin 能正确推断
    val name: String = service1.getRequiredName()  // String
    val optional: String? = service1.getOptionalName()  // String?
    val list: List<String> = service1.getList()  // List<String>
    
    println("Required: $name")
    println("Optional: $optional")
    println("List: $list")
    
    val service2 = JavaServiceWithoutAnnotations()
    
    // 无注解时，平台类型
    // 推荐做法 1：赋值给可空类型
    val name2: String? = service2.getName()
    println("Platform nullable: $name2")
    
    // 推荐做法 2：使用安全调用
    val length = service2.getName()?.length ?: 0
    println("Platform safe: $length")
    
    // 不推荐：直接赋值给不可空（运行时可能 NPE）
    // val unsafe: String = service2.getName()
}
```

---

## 6. 对比分析

### 6.1 与 Java 的对比

| 特性 | Java | Kotlin |
|------|------|--------|
| 空安全类型系统 | 无（所有引用可空） | 有（`T` vs `T?`） |
| 空安全操作符 | 无 | `?.`、`?:`、`!!`、`as?` |
| 智能转换 | 无 | 有 |
| NPE 防御 | 运行时检查 | 编译时检查 |
| 注解支持 | JSR-305、JetBrains、JSpecify | 完全兼容 |
| Optional | `java.util.Optional<T>` | `T?`（语言级） |
| 语法糖 | 无 | `T?`、`?.`、`?:` |
| 平台类型 | 无 | 有（`T!`） |

```java
// Java 代码
String name = getName();  // 可能为 null
if (name != null) {
    System.out.println(name.length());
}

// Optional
Optional<String> opt = Optional.ofNullable(getName());
opt.ifPresent(n -> System.out.println(n.length()));
```

```kotlin
// Kotlin 代码
val name: String? = getName()
name?.let { println(it.length) }
```

### 6.2 与 Swift 的对比

| 特性 | Swift | Kotlin |
|------|-------|--------|
| 可空类型 | `Optional<T>`，`T?` | `T?` |
| 语法糖 | `T?`、`!`、`?` | `T?`、`!!`、`?.` |
| 强制解包 | `x!` | `x!!` |
| 可选链 | `x?.property` | `x?.property` |
| Nil 合并 | `x ?? default` | `x ?: default` |
| 智能转换 | if-let 绑定 | if-null 检查 |
| 平台类型 | 无（与 Objective-C 互操作） | 有（与 Java 互操作） |

```swift
// Swift 代码
let name: String? = getName()
if let n = name {
    print(n.count)
}

// Optional chaining
let length = name?.count ?? 0
```

### 6.3 与 C# 的对比

| 特性 | C# | Kotlin |
|------|-----|--------|
| 空安全类型系统 | C# 8.0+ 引入 | 原生支持 |
| 可空引用类型 | `string?` | `String?` |
| 空条件操作符 | `x?.Method()` | `x?.method()` |
| Null 合并操作符 | `x ?? default` | `x ?: default` |
| 强制非空 | 无 | `!!` |
| 平台类型 | 无 | 有 |

```csharp
// C# 8.0+
string? name = GetName();
int? length = name?.Length;
int safeLength = name?.Length ?? 0;
```

### 6.4 与 TypeScript 的对比

| 特性 | TypeScript | Kotlin |
|------|-----------|--------|
| 空安全类型系统 | `T | null`、`T | undefined` | `T?` |
| 严格空检查 | `strictNullChecks` | 默认开启 |
| 可选链 | `x?.method()` | `x?.method()` |
| Null 合并 | `x ?? default` | `x ?: default` |
| 非空断言 | `x!` | `x!!` |
| 平台类型 | 无 | 有 |

```typescript
// TypeScript
let name: string | null = getName();
let length: number | null = name?.length;
let safeLength: number = name?.length ?? 0;

// 非空断言
let forced: string = name!;
```

### 6.5 与 Rust 的对比

| 特性 | Rust | Kotlin |
|------|------|--------|
| 可空类型 | `Option<T>` | `T?` |
| 表示方式 | `Some(v)` / `None` | `value` / `null` |
| 语法糖 | 无（需 match） | `?.`、`?:` |
| 强制处理 | match 穷尽性 | 编译器强制 |
| 零开销抽象 | 是 | 是（JVM 上） |
| 副作用 | 无 | 无 |

```rust
// Rust 代码
let name: Option<String> = get_name();
match name {
    Some(n) => println!("{}", n.len()),
    None => println!("No name"),
}

// if let 语法糖
if let Some(n) = name {
    println!("{}", n.len());
}
```

### 6.6 与 Go 的对比

| 特性 | Go | Kotlin |
|------|-----|--------|
| 空安全类型系统 | 无（指针可空） | 有（`T` vs `T?`） |
| 零值 | 类型默认零值 | 无（必须显式初始化） |
| 多返回值 | `(value, error)` | `Result<T>` 或 `T?` |
| 错误处理 | `if err != nil` | `try/catch` 或 `Result` |
| 语法糖 | 无 | `?.`、`?:` |

```go
// Go 代码
name, err := getName()
if err != nil {
    return err
}
// 使用 name
```

```kotlin
// Kotlin 代码
val name = getName()  // 返回 String? 或 Result<String>
name?.let { /* 使用 */ }
```

### 6.7 跨语言对比表

| 语言 | 可空类型 | 语法糖 | 智能转换 | 平台类型 | 强制处理 |
|------|---------|--------|---------|---------|---------|
| Kotlin | `T?` | `?.` `?:` `!!` `as?` | 有 | 有 | 编译时 |
| Java | 无 | 无 | 无 | 无 | 运行时 |
| Swift | `Optional<T>` | `?` `!` `?.` `??` | if-let | 与 OC 互操作 | 编译时 |
| C# 8+ | `T?` | `?.` `??` | 无 | 无 | 编译时 |
| TypeScript | `T \| null` | `?.` `??` `!` | 有（类型守卫） | 无 | 编译时 |
| Rust | `Option<T>` | match | 模式匹配 | 无 | 编译时 |
| Go | 无 | 无 | 无 | 无 | 运行时 |
| Haskell | `Maybe a` | `>>=` `=<<` | 模式匹配 | 无 | 编译时 |
| Scala | `Option[T]` | `map` `flatMap` | 模式匹配 | 无 | 编译时 |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱 1：过度使用 `!!`

**反模式**：

```kotlin
// 错误：过度使用 !!
val user = getUser()!!
val name = user.name!!
val length = name.length!!
```

**问题**：`!!` 会将可空类型强制转换为不可空，但代价是运行时 NPE。每个 `!!` 都是潜在的崩溃点。

**最佳实践**：

```kotlin
// 正确：使用 ?. 与 ?: 优雅处理
val length = getUser()?.name?.length ?: 0
```

何时可以使用 `!!`：

1. **明确知道值非空**：如刚初始化的 `lateinit var`。
2. **第三方 API 文档保证**：但应优先用 `requireNotNull`。
3. **测试代码**：测试中可以使用 `!!` 简化断言。

### 7.2 陷阱 2：`lateinit` 用于可空场景

**反模式**：

```kotlin
// 错误：lateinit 用于可能不初始化的场景
class UserController {
    lateinit var userService: UserService  // 如果 setup() 未调用则崩溃
    
    fun process() {
        userService.process()  // UninitializedPropertyAccessException
    }
}
```

**最佳实践**：

```kotlin
// 正确：使用可空类型 + 显式检查
class UserController {
    private var userService: UserService? = null
    
    fun setup() {
        userService = UserService()
    }
    
    fun process() {
        userService?.process() ?: throw IllegalStateException("Not initialized")
    }
}

// 或使用 lazy
class UserController {
    val userService: UserService by lazy { UserService() }
    
    fun process() {
        userService.process()
    }
}
```

`lateinit` 适用场景：

1. **确定会被初始化**：如 Android `Activity.onCreate`。
2. **不可空的引用类型**：`lateinit` 不支持 `Int`、`Boolean` 等基本类型。
3. **需要可变**：`lateinit` 必须是 `var`。

### 7.3 陷阱 3：平台类型未显式处理

**反模式**：

```kotlin
// 错误：未显式处理平台类型
val name = javaService.getName()  // 类型是 String!（平台类型）
println(name.length)  // 如果 name 为 null，运行时 NPE
```

**最佳实践**：

```kotlin
// 正确：显式声明可空性
val name: String? = javaService.getName()  // 当作可空
val length = name?.length ?: 0

// 或强制非空（确保不抛 NPE）
val safeName: String = javaService.getName() ?: "default"

// 推荐：为 Java API 添加 @Nullable / @NotNull 注解
// Java 代码：
// @Nullable String getName()
// @NotNull String getRequiredName()
```

### 7.4 陷阱 4：智能转换失效

**反模式**：

```kotlin
// 错误：var 属性智能转换失效
class Example {
    var name: String? = null
    
    fun process() {
        if (name != null) {
            // 编译错误：Smart cast to 'String' is impossible, because 'name' is a mutable property
            // println(name.length)
            println(name!!.length)  // 需要 !!
        }
    }
}
```

**原因**：`var` 属性在多线程下可能被修改，编译器保守地不应用智能转换。

**最佳实践**：

```kotlin
// 正确：使用局部变量
class Example {
    var name: String? = null
    
    fun process() {
        val n = name  // 局部变量
        if (n != null) {
            println(n.length)  // 智能转换生效
        }
    }
}

// 或使用 val
class Example {
    val name: String? = null  // val 时智能转换可能生效
    
    fun process() {
        if (name != null) {
            // name 是 final val，智能转换生效
            println(name.length)
        }
    }
}
```

### 7.5 陷阱 5：`?.let` 与智能转换的混淆

**反模式**：

```kotlin
// 错误：误以为 ?.let 内的 it 是原变量
fun process(x: String?) {
    x?.let {
        // it 是 String 类型，但 x 仍是 String?
        // 试图修改 x 不会影响 it
    }
}
```

**正确理解**：

```kotlin
fun process(x: String?) {
    x?.let { nonNull ->
        // nonNull 是 String 类型（it 的别名）
        println(nonNull.length)
        
        // 但 x 仍然是 String?，因为 let 接收的是 x 的非空拷贝
        // 不能在 let 内通过 x 访问非空成员
    }
}
```

### 7.6 陷阱 6：`?:` 优先级问题

**反模式**：

```kotlin
// 错误：误以为 ?: 优先级低于 +
val result = x ?: "default" + "suffix"
// 实际解析为：x ?: ("default" + "suffix")
// 而非：(x ?: "default") + "suffix"
```

**最佳实践**：

```kotlin
// 正确：使用括号明确优先级
val result = (x ?: "default") + "suffix"
```

`?:` 的优先级低于 `+`、`-`、`*`、`/`，与 `||` 相同。

### 7.7 陷阱 7：`as?` 与泛型

**反模式**：

```kotlin
// 错误：as? 与泛型类型擦除
val list: List<*> = listOf(1, 2, 3)
val stringList = list as? List<String>  // 不会返回 null（类型擦除）
stringList?.forEach { 
    // 运行时：ClassCastException（实际是 List<Int>）
    println(it.length)
}
```

**原因**：JVM 的泛型类型擦除导致 `as?` 无法检查元素类型。

**最佳实践**：

```kotlin
// 正确：使用 filterIsNotNull 或显式检查
val list: List<*> = listOf(1, 2, 3)
val stringList: List<String> = list.filterIsInstance<String>()
println(stringList)  // []（无 String 元素）

// 或手动检查
val first = list.firstOrNull()
if (first is String) {
    println(first.length)
}
```

### 7.8 陷阱 8：`lateinit` 用于基本类型

**反模式**：

```kotlin
// 错误：lateinit 不支持基本类型
class Example {
    // lateinit var count: Int  // 编译错误：'lateinit' modifier is not allowed on properties of primitive types
    // lateinit var flag: Boolean  // 编译错误
    
    // 替代方案 1：使用可空类型
    var count: Int? = null
    
    // 替代方案 2：使用 Delegates.notNull
    var port: Int by Delegates.notNull()
}
```

### 7.9 陷阱 9：`requireNotNull` 后的智能转换

**反模式**：

```kotlin
// 误以为 requireNotNull 后 x 变为非空
fun process(x: String?) {
    requireNotNull(x)
    // 编译器根据契约知道 x != null
    // 但如果 x 是 var 属性，智能转换可能失效
    println(x.length)  // 在局部变量场景下生效
}

class Example {
    var x: String? = null
    
    fun process() {
        requireNotNull(x)
        // 错误：x 是 var 属性，契约不保证后续访问
        // println(x.length)  // 编译错误
        println(x!!.length)
    }
}
```

### 7.10 陷阱 10：`Result` 的误用

**反模式**：

```kotlin
// 错误：将 Result 用作返回类型（官方不推荐）
fun findUser(id: String): Result<User> {
    // ...
}

// 在 Stream 中使用
val users = ids.map { findUser(it) }
    .filter { it.isSuccess }
    // ...
```

**官方建议**：`Result` 不应用作公共 API 的返回类型，而是用于内部错误处理。公共 API 应使用 `T?` 或 `sealed class`。

```kotlin
// 正确：公共 API 使用 sealed class
sealed class FindResult {
    data class Success(val user: User) : FindResult()
    object NotFound : FindResult()
}

fun findUser(id: String): FindResult {
    // ...
}
```

### 7.11 陷阱 11：`forEach` 中的 null 检查

**反模式**：

```kotlin
// 错误：在 forEach 中使用 !!
val names: List<String?> = listOf("Alice", null, "Bob")
names.forEach {
    println(it!!.length)  // NPE
}
```

**最佳实践**：

```kotlin
// 正确：使用 ?. 或 filterNotNull
names.forEach { name ->
    name?.let { println(it.length) }
}

// 或先过滤
names.filterNotNull().forEach { println(it.length) }
```

### 7.12 陷阱 12：契约的滥用

**反模式**：

```kotlin
// 错误：滥用契约，提供错误信息
fun isNotNull(x: Any?): Boolean {
    contract {
        returns(true) implies (x != null)
    }
    return x != null
}

// 使用
fun process(x: String?) {
    if (isNotNull(x)) {
        // 编译器认为 x 非 null
        println(x.length)
    }
}
```

**问题**：虽然语法正确，但契约应反映函数的真实行为，不能误导编译器。

**最佳实践**：契约应与函数实现一致，且用于表达编译器无法自动推断的事实。

### 7.13 最佳实践总结

1. **优先使用 `?.` 与 `?:`**，避免 `!!`。
2. **`lateinit` 用于确定会初始化的场景**，否则用 `lazy` 或可空类型。
3. **平台类型显式声明**，避免隐式传播。
4. **使用局部变量触发智能转换**，避免对 `var` 属性的多次访问。
5. **`filterNotNull` 与 `mapNotNull` 优于手动过滤**。
6. **`requireNotNull` 与 `checkNotNull` 用于前置条件**。
7. **公共 API 优先使用 `sealed class`**，而非 `Result` 或 `T?`。
8. **跨模块 API 添加空安全注解**（`@Nullable` / `@NotNull`）。
9. **测试代码可适度使用 `!!`** 简化断言。
10. **`safeLet` 等组合器用于多值同时非空**，避免嵌套 `?.let`。

---

## 8. 工程实践

### 8.1 团队规范建议

#### 8.1.1 空安全规范

```kotlin
// 规范示例
class UserService {
    // 公共 API：明确标注可空性
    fun findById(id: String): User? {
        // ...
    }
    
    fun requireById(id: String): User {
        return findById(id) ?: throw UserNotFoundException(id)
    }
    
    // 内部方法：使用 requireNotNull 简化
    fun process(id: String) {
        val user = requireNotNull(findById(id)) { "User $id not found" }
        // 此处 user 是 User（非空）
    }
}
```

#### 8.1.2 Detekt 规则

```yaml
# detekt.yml
complexity:
  active: true
  LongMethod:
    threshold: 60

potential-bugs:
  active: true
  UnsafeCallOnNullableType:
    active: true  # 禁止 !!
  LateinitUsage:
    active: false  # 允许 lateinit，但建议在规范中约束

style:
  active: true
  ReturnCount:
    active: false  # 允许多 return
  MandatoryBracesLoops:
    active: false
```

#### 8.1.3 团队约定

```markdown
# 空安全团队规范

## 必须
- 公共 API 必须明确标注可空性
- 使用 `?.` 与 `?:` 处理可空值
- `lateinit` 仅用于确定会初始化的属性

## 禁止
- 禁止在业务代码中使用 `!!`（测试代码除外）
- 禁止将平台类型直接赋值给不可空类型
- 禁止在公共 API 中返回 `Result<T>`

## 推荐
- 使用 `sealed class` 表示"可能失败"的结果
- 使用 `requireNotNull` / `checkNotNull` 做前置条件检查
- 使用 `safeLet` 处理多个可空值的同时非空
```

### 8.2 单元测试中的空安全

```kotlin
// UserServiceTest.kt
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertNotNull

class UserServiceTest {
    private val service = UserService()
    
    @Test
    fun `findById returns null for non-existent user`() {
        val user = service.findById("non-existent")
        assertNull(user)
    }
    
    @Test
    fun `findById returns user for existing user`() {
        val user = service.findById("1")
        assertNotNull(user)
        assertEquals("Alice", user!!.name)  // 测试中可用 !!
    }
    
    @Test
    fun `requireById throws for non-existent user`() {
        assertFailsWith<UserNotFoundException> {
            service.requireById("non-existent")
        }
    }
    
    @Test
    fun `process handles null user`() {
        // 测试不抛异常
        service.process("non-existent")
    }
}
```

### 8.3 调试空安全

#### 8.3.1 检查平台类型

```kotlin
// 使用 ::returnType 检查类型
fun debugPlatformType() {
    val result = javaService.getData()
    // 在 IDE 中查看 result 的类型，如果显示 String! 则为平台类型
    println(result?.javaClass?.name)
}
```

#### 8.3.2 启用严格空检查

```kotlin
// 在 build.gradle.kts 中启用严格空检查
kotlin {
    compilerOptions {
        freeCompilerArgs.addAll(
            "-Xjsr305=strict",  // 严格处理 JSR-305 注解
            "-Xenhance-type-parameter-types-to-default-bounds"  // 增强类型参数
        )
    }
}
```

### 8.4 Java 互操作的空安全加固

```kotlin
// 为 Java API 创建 Kotlin 包装层
class SafeJavaService(private val delegate: JavaService) {
    // 明确返回可空类型
    fun getName(): String? = delegate.getName()
    
    // 明确返回非空类型（带默认值）
    fun getNameOrDefault(): String = delegate.getName() ?: "default"
    
    // 明确抛出异常
    fun requireName(): String = delegate.getName() 
        ?: throw IllegalStateException("Name is null")
}

// 使用扩展函数
fun JavaService.safeGetName(): String? = this.getName()
```

### 8.5 与 Kotlin 协程集成

```kotlin
import kotlinx.coroutines.*

class UserService {
    // 协程中的空安全
    suspend fun findById(id: String): User? = withContext(Dispatchers.IO) {
        // 数据库查询，可能返回 null
        database.findUserById(id)
    }
    
    suspend fun requireById(id: String): User = findById(id) 
        ?: throw UserNotFoundException(id)
    
    // 使用协程处理可空值
    suspend fun process(id: String): String? {
        val user = findById(id) ?: return null  // 提前返回
        return "Processed: ${user.name}"
    }
}

// 在 ViewModel 中使用
class UserViewModel(private val service: UserService) {
    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user
    
    fun loadUser(id: String) {
        viewModelScope.launch {
            _user.value = service.findById(id)
        }
    }
}
```

### 8.6 与 Flow 集成

```kotlin
import kotlinx.coroutines.flow.*

class UserService {
    // Flow 中的空安全
    fun observeUsers(): Flow<List<User>> = flow {
        // 发射非空列表
        emit(database.getAllUsers())
    }
    
    // 处理可空元素
    fun observeNames(): Flow<String> = observeUsers()
        .map { users -> users.mapNotNull { it.name } }  // 过滤 null name
        .flowOn(Dispatchers.IO)
    
    // filterNotNull 过滤 null 元素
    fun observeNonNullUsers(): Flow<User> = flow {
        val user = database.getUser()
        if (user != null) emit(user)
    }.filterNotNull()
}
```

### 8.7 与 KMP 集成

```kotlin
// commonMain
expect class PlatformDate {
    fun format(): String?
}

// JVM 实现
actual class PlatformDate {
    actual fun format(): String? = "2024-01-01"
}

// JS 实现
actual class PlatformDate {
    actual fun format(): String? = js("new Date().toISOString()")
}

// 在通用代码中处理可空性
fun getFormattedDate(): String {
    val date = PlatformDate()
    return date.format() ?: "unknown"
}
```

### 8.8 性能考虑

#### 8.8.1 `?.` 的性能开销

```kotlin
// 源码：x?.length
// 字节码：
//   if (x != null) x.length else null
//   一条 if 判断，无额外开销

// 源码：x?.let { it.length }
// 字节码：
//   if (x != null) { val tmp = x; lambda(tmp) } else null
//   额外的 let 调用与 lambda 实例化

// 性能对比：?. 直接访问 vs ?.let
// 简单访问：用 ?.（避免 let 开销）
// 复杂逻辑：用 ?.let（可读性更好）
```

#### 8.8.2 `lateinit` 与 `lazy` 的性能

```kotlin
// lateinit：直接字段访问，仅初始化前有 null 检查
class Example1 {
    lateinit var service: Service
    fun use() {
        service.process()  // 直接调用，无开销
    }
}

// lazy（SYNCHRONIZED）：每次访问都通过 Lazy 对象
class Example2 {
    val service: Service by lazy { Service() }
    fun use() {
        service.process()  // 通过 Lazy.getValue()，有 synchronized 开销
    }
}

// lazy（NONE）：无同步开销，但不线程安全
class Example3 {
    val service: Service by lazy(LazyThreadSafetyMode.NONE) { Service() }
    fun use() {
        service.process()  // 无同步开销
    }
}
```

#### 8.8.3 集合操作的性能

```kotlin
// filterNotNull：O(n) 遍历
val list = listOf("a", null, "b", null, "c")
val filtered = list.filterNotNull()  // ["a", "b", "c"]

// mapNotNull：单次遍历
val lengths = list.mapNotNull { it?.length }  // [1, 1, 1]

// 优于分开操作
val lengths2 = list.filterNotNull().map { it.length }  // 两次遍历
```

### 8.9 Detekt 规则与空安全

```yaml
# detekt.yml（节选）
potential-bugs:
  active: true
  UnsafeCallOnNullableType:
    active: true
    excludes: ['**/test/**']  # 测试中允许 !!
  
  LateinitUsage:
    active: false  # 不强制，但建议团队规范约束
  
  ImplicitDefaultLocale:
    active: true

style:
  active: true
  ForbiddenImport:
    active: true
    imports: []
  
  ReturnCount:
    active: false
```

### 8.10 与 Spring Boot 集成

```kotlin
// Spring Boot 服务端空安全
@RestController
class UserController(private val userService: UserService) {
    
    @GetMapping("/users/{id}")
    fun getUser(@PathVariable id: String): ResponseEntity<UserDto> {
        val user = userService.findById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(user.toDto())
    }
    
    @PostMapping("/users")
    fun createUser(@RequestBody request: CreateUserRequest): ResponseEntity<UserDto> {
        // 请求体使用 @NotNull 注解
        val user = userService.create(request.name!!, request.email)
        return ResponseEntity.ok(user.toDto())
    }
}

// DTO 中的空安全
data class CreateUserRequest(
    @field:NotNull val name: String,
    val email: String?
)

// JPA 实体中的空安全
@Entity
class UserEntity(
    @Id @GeneratedValue var id: Long = 0,
    
    @Column(nullable = false)
    var name: String,  // 不可空
    
    @Column(nullable = true)
    var email: String?  // 可空
)
```

---

## 9. 案例研究

### 9.1 案例研究 1：API 响应处理

**场景**：处理一个嵌套的 JSON API 响应。

```kotlin
// 模拟 API 响应
data class ApiResponse(
    val status: String,
    val data: DataResponse?
)

data class DataResponse(
    val user: UserResponse?,
    val meta: MetaResponse?
)

data class UserResponse(
    val id: String?,
    val name: String?,
    val email: String?
)

data class MetaResponse(
    val timestamp: String?,
    val version: String?
)

class ApiClient {
    fun fetchUser(userId: String): ApiResponse {
        // 模拟 API 调用
        return if (userId == "1") {
            ApiResponse(
                status = "ok",
                data = DataResponse(
                    user = UserResponse(
                        id = "1",
                        name = "Alice",
                        email = null
                    ),
                    meta = MetaResponse(
                        timestamp = "2024-01-01T00:00:00Z",
                        version = "1.0"
                    )
                )
            )
        } else {
            ApiResponse(status = "error", data = null)
        }
    }
}

// 处理函数
class UserService(private val client: ApiClient) {
    fun getUserName(userId: String): String {
        val response = client.fetchUser(userId)
        return response.data?.user?.name ?: "Unknown"
    }
    
    fun getUserEmail(userId: String): String {
        val response = client.fetchUser(userId)
        return response.data?.user?.email ?: "no-email"
    }
    
    fun getFullUserInfo(userId: String): UserDisplay {
        val response = client.fetchUser(userId)
        val user = response.data?.user
        
        return UserDisplay(
            id = user?.id ?: "unknown",
            name = user?.name ?: "Anonymous",
            email = user?.email ?: "no-email"
        )
    }
}

data class UserDisplay(
    val id: String,
    val name: String,
    val email: String
)

fun main() {
    val service = UserService(ApiClient())
    
    println(service.getUserName("1"))  // Alice
    println(service.getUserName("2"))  // Unknown
    
    println(service.getUserEmail("1"))  // no-email
    
    val display = service.getFullUserInfo("1")
    println(display)
}
```

### 9.2 案例研究 2：数据库实体映射

**场景**：将数据库行映射到 Kotlin 实体。

```kotlin
// 模拟数据库行
class ResultSet {
    private val data = mutableMapOf<String, Any?>()
    
    fun put(key: String, value: Any?) {
        data[key] = value
    }
    
    fun getString(key: String): String? = data[key] as? String
    fun getInt(key: String): Int? = data[key] as? Int
    fun getLong(key: String): Long? = data[key] as? Long
    fun getBoolean(key: String): Boolean? = data[key] as? Boolean
}

// 实体定义
data class UserEntity(
    val id: Long,              // NOT NULL
    val name: String,          // NOT NULL
    val email: String?,        // NULLABLE
    val age: Int?,             // NULLABLE
    val isActive: Boolean,     // NOT NULL DEFAULT TRUE
    val deletedAt: String?    // NULLABLE
)

// 映射器
class UserMapper {
    fun map(row: ResultSet): UserEntity? {
        val id = row.getLong("id") ?: return null  // 主键为空，跳过
        val name = row.getString("name") ?: return null  // 必填字段为空，跳过
        
        return UserEntity(
            id = id,
            name = name,
            email = row.getString("email"),
            age = row.getInt("age"),
            isActive = row.getBoolean("is_active") ?: true,  // 默认值
            deletedAt = row.getString("deleted_at")
        )
    }
    
    fun mapAll(rows: List<ResultSet>): List<UserEntity> {
        return rows.mapNotNull { map(it) }
    }
}

fun main() {
    val rs = ResultSet()
    rs.put("id", 1L)
    rs.put("name", "Alice")
    rs.put("email", "alice@example.com")
    rs.put("age", 25)
    // is_active 未设置
    // deleted_at 未设置
    
    val mapper = UserMapper()
    val user = mapper.map(rs)
    println(user)
    
    // 测试 null 主键
    val rs2 = ResultSet()
    rs2.put("id", null)
    rs2.put("name", "Bob")
    val user2 = mapper.map(rs2)
    println("User2: $user2")  // null
}
```

### 9.3 案例研究 3：Android Bundle 恢复

**场景**：在 Android `Activity` 中保存与恢复状态。

```kotlin
// AndroidActivity.kt（示意）
class MainActivity {
    private var currentUserId: String? = null
    private lateinit var restoredState: SavedState
    
    fun onCreate(savedInstanceState: Map<String, Any?>?) {
        // 从 saved state 恢复
        savedInstanceState?.let { state ->
            currentUserId = state["user_id"] as? String
            restoreState(state)
        } ?: run {
            // 全新启动
            currentUserId = "default"
        }
    }
    
    private fun restoreState(state: Map<String, Any?>) {
        val userId = state["user_id"] as? String
        val count = state["count"] as? Int
        val enabled = state["enabled"] as? Boolean
        
        // 使用 safeLet 处理多值
        safeLet(userId, count, enabled) { id, c, e ->
            restoredState = SavedState(id, c, e)
        } ?: run {
            restoredState = SavedState("default", 0, false)
        }
    }
    
    fun onSaveInstanceState(): Map<String, Any?> {
        return mapOf(
            "user_id" to currentUserId,
            "count" to restoredState.count,
            "enabled" to restoredState.enabled
        )
    }
}

data class SavedState(
    val userId: String,
    val count: Int,
    val enabled: Boolean
)

fun <T1, T2, T3, R> safeLet(
    v1: T1?, v2: T2?, v3: T3?,
    block: (T1, T2, T3) -> R
): R? = if (v1 != null && v2 != null && v3 != null) block(v1, v2, v3) else null

fun main() {
    val activity = MainActivity()
    
    // 模拟全新启动
    activity.onCreate(null)
    
    // 模拟恢复
    val saved = mapOf(
        "user_id" to "user123",
        "count" to 42,
        "enabled" to true
    )
    activity.onCreate(saved)
}
```

### 9.4 案例研究 4：KMP 跨平台配置

**场景**：跨平台配置管理。

```kotlin
// commonMain
expect class PlatformConfig {
    fun getString(key: String): String?
    fun putString(key: String, value: String?)
}

class ConfigManager(private val platform: PlatformConfig) {
    // 使用可空类型表示配置可能不存在
    fun getApiUrl(): String? = platform.getString("api_url")
    
    fun getApiUrlOrDefault(): String = getApiUrl() ?: "https://api.default.com"
    
    fun setApiUrl(url: String?) {
        platform.putString("api_url", url)
    }
    
    // 类型安全的配置访问
    inline fun <reified T> get(key: String): T? {
        val value = platform.getString(key) ?: return null
        return when (T::class) {
            String::class -> value as T
            Int::class -> value.toIntOrNull() as? T
            Boolean::class -> value.toBooleanStrictOrNull() as? T
            else -> null
        }
    }
}

// JVM 实现
actual class PlatformConfig {
    private val props = java.util.Properties()
    
    actual fun getString(key: String): String? = props.getProperty(key)
    actual fun putString(key: String, value: String?) {
        if (value != null) {
            props.setProperty(key, value)
        } else {
            props.remove(key)
        }
    }
}

// 使用
fun main() {
    val config = ConfigManager(PlatformConfig())
    config.setApiUrl("https://api.example.com")
    println(config.getApiUrl())  // https://api.example.com
    
    config.setApiUrl(null)
    println(config.getApiUrl())  // null
    println(config.getApiUrlOrDefault())  // https://api.default.com
}
```

### 9.5 案例研究 5：响应式表单验证

**场景**：表单字段的实时验证。

```kotlin
data class FormState(
    val name: String?,
    val email: String?,
    val age: String?
)

sealed class ValidationResult {
    object Valid : ValidationResult()
    data class Invalid(val message: String) : ValidationResult()
}

class FormValidator {
    fun validateName(name: String?): ValidationResult {
        if (name.isNullOrBlank()) {
            return ValidationResult.Invalid("Name is required")
        }
        if (name.length < 2) {
            return ValidationResult.Invalid("Name too short")
        }
        return ValidationResult.Valid
    }
    
    fun validateEmail(email: String?): ValidationResult {
        if (email.isNullOrBlank()) {
            return ValidationResult.Invalid("Email is required")
        }
        val emailRegex = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")
        if (!emailRegex.matches(email)) {
            return ValidationResult.Invalid("Invalid email format")
        }
        return ValidationResult.Valid
    }
    
    fun validateAge(age: String?): ValidationResult {
        if (age.isNullOrBlank()) {
            return ValidationResult.Invalid("Age is required")
        }
        val ageInt = age.toIntOrNull()
            ?: return ValidationResult.Invalid("Age must be a number")
        if (ageInt < 0 || ageInt > 150) {
            return ValidationResult.Invalid("Age must be 0-150")
        }
        return ValidationResult.Valid
    }
    
    fun validateAll(state: FormState): Map<String, ValidationResult> {
        return mapOf(
            "name" to validateName(state.name),
            "email" to validateEmail(state.email),
            "age" to validateAge(state.age)
        )
    }
    
    fun isFormValid(state: FormState): Boolean {
        return validateAll(state).values.all { it is ValidationResult.Valid }
    }
}

fun main() {
    val validator = FormValidator()
    
    // 有效表单
    val validState = FormState("Alice", "alice@example.com", "25")
    println("Valid: ${validator.isFormValid(validState)}")  // true
    
    // 无效表单
    val invalidState = FormState("", "invalid-email", "abc")
    val results = validator.validateAll(invalidState)
    results.forEach { (field, result) ->
        when (result) {
            is ValidationResult.Valid -> println("$field: OK")
            is ValidationResult.Invalid -> println("$field: ${result.message}")
        }
    }
}
```

### 9.6 案例研究 6：缓存委托（TTL）

**场景**：使用委托属性实现带 TTL 的缓存。

```kotlin
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

class CachedProperty<T>(
    private val ttl: Long,  // 毫秒
    private val loader: () -> T
) : ReadWriteProperty<Any?, T> {
    private var value: T? = null
    private var expireAt: Long = 0
    private val lock = Any()
    
    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        synchronized(lock) {
            val now = System.currentTimeMillis()
            if (value == null || now >= expireAt) {
                value = loader()
                expireAt = now + ttl
            }
            return value!!
        }
    }
    
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        synchronized(lock) {
            this.value = value
            this.expireAt = System.currentTimeMillis() + ttl
        }
    }
    
    fun invalidate() {
        synchronized(lock) {
            value = null
            expireAt = 0
        }
    }
}

class ApiClient {
    // 缓存 5 分钟
    val userList: List<String> by CachedProperty(5 * 60 * 1000) {
        println("Fetching user list...")
        listOf("Alice", "Bob", "Charlie")
    }
    
    // 缓存 1 秒
    var currentTime: String by CachedProperty(1000) {
        println("Loading time...")
        java.time.Instant.now().toString()
    }
}

fun main() {
    val client = ApiClient()
    
    println(client.userList)  // 触发加载
    println(client.userList)  // 使用缓存
    
    Thread.sleep(100)
    println(client.userList)  // 仍是缓存
    
    Thread.sleep(5000)
    println(client.userList)  // TTL 过期，重新加载
    
    println(client.currentTime)
    Thread.sleep(500)
    println(client.currentTime)  // 仍是缓存
    Thread.sleep(600)
    println(client.currentTime)  // TTL 过期，重新加载
}
```

### 9.7 案例研究 7：JSON 解析

**场景**：解析 JSON 字符串到对象。

```kotlin
// 简化版 JSON 解析器（仅演示空安全）
class JsonObject(private val data: Map<String, Any?>) {
    fun getString(key: String): String? = data[key] as? String
    fun getInt(key: String): Int? = data[key] as? Int
    fun getBoolean(key: String): Boolean? = data[key] as? Boolean
    fun getObject(key: String): JsonObject? = (data[key] as? Map<String, Any?>)?.let { JsonObject(it) }
    fun getArray(key: String): List<Any?>? = data[key] as? List<Any?>
}

data class User(
    val id: Long,
    val name: String,
    val email: String?,
    val age: Int?
)

class UserParser {
    fun parse(json: JsonObject): User? {
        // 使用 safeLet 处理必填字段
        val id = json.getString("id")?.toLongOrNull()
        val name = json.getString("name")
        
        if (id == null || name == null) {
            return null
        }
        
        return User(
            id = id,
            name = name,
            email = json.getString("email"),
            age = json.getInt("age")
        )
    }
    
    // 使用 Map 委托（见委托属性章节）
    fun parseWithDelegate(json: JsonObject): User? {
        return try {
            val id = json.getString("id")?.toLongOrNull() ?: return null
            val name = json.getString("name") ?: return null
            User(
                id = id,
                name = name,
                email = json.getString("email"),
                age = json.getInt("age")
            )
        } catch (e: Exception) {
            null
        }
    }
}

fun main() {
    val json = JsonObject(mapOf(
        "id" to "123",
        "name" to "Alice",
        "email" to "alice@example.com",
        "age" to 25
    ))
    
    val parser = UserParser()
    val user = parser.parse(json)
    println(user)
    
    // 缺失必填字段
    val invalidJson = JsonObject(mapOf(
        "id" to null,
        "name" to "Bob"
    ))
    val invalidUser = parser.parse(invalidJson)
    println("Invalid: $invalidUser")  // null
}
```

### 9.8 案例研究 8：Android ViewModel 与 LiveData

```kotlin
// AndroidViewModel.kt（示意）
import kotlinx.coroutines.flow.*

class UserViewModel(private val repository: UserRepository) {
    // 使用 StateFlow 管理状态
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState
    
    fun loadUser(id: String) {
        _uiState.value = UiState.Loading
        repository.findById(id) { user ->
            _uiState.value = user?.let { UiState.Success(it) } ?: UiState.NotFound
        }
    }
}

sealed class UiState {
    object Loading : UiState()
    data class Success(val user: User) : UiState()
    object NotFound : UiState()
    data class Error(val message: String) : UiState()
}

data class User(val id: String, val name: String)

class UserRepository {
    private val users = mapOf("1" to User("1", "Alice"))
    
    fun findById(id: String, callback: (User?) -> Unit) {
        callback(users[id])
    }
}

fun main() {
    val viewModel = UserViewModel(UserRepository())
    
    viewModel.loadUser("1")
    println(viewModel.uiState.value)
    
    viewModel.loadUser("999")
    println(viewModel.uiState.value)
}
```

---

## 10. 习题

### 10.1 基础题

**习题 1**：以下代码的输出是什么？

```kotlin
val x: String? = null
val y: String = x ?: "default"
val z: Int? = x?.length
println("y=$y, z=$z")
```

**答案**：`y=default, z=null`

**解析**：`x ?: "default"` 在 `x` 为 null 时返回 `"default"`；`x?.length` 在 `x` 为 null 时返回 `null`。

**习题 2**：以下代码是否能编译通过？为什么？

```kotlin
var name: String? = "Alice"
if (name != null) {
    println(name.length)
}
name = null
```

**答案**：能编译通过。

**解析**：`name` 是局部 `var` 变量，在 `if (name != null)` 分支内智能转换生效。修改 `name` 在分支外，不影响分支内的智能转换。

**习题 3**：以下代码会输出什么？

```kotlin
val list: List<String?> = listOf("a", null, "b", null, "c")
println(list.filterNotNull())
println(list.mapNotNull { it?.length })
```

**答案**：
```
[a, b, c]
[1, 1, 1]
```

### 10.2 进阶题

**习题 4**：以下代码为什么编译错误？如何修复？

```kotlin
class Example {
    var name: String? = null
    
    fun process() {
        if (name != null) {
            println(name.length)  // 编译错误
        }
    }
}
```

**答案**：`name` 是 `var` 属性，编译器认为在 `if` 检查与使用之间可能被其他线程修改，因此智能转换失效。

**修复方案**：

```kotlin
// 方案 1：使用局部变量
fun process() {
    val n = name
    if (n != null) {
        println(n.length)
    }
}

// 方案 2：使用 !!
fun process() {
    if (name != null) {
        println(name!!.length)
    }
}

// 方案 3：使用 ?.let
fun process() {
    name?.let { println(it.length) }
}
```

**习题 5**：以下代码的输出是什么？

```kotlin
fun foo(x: String?) {
    requireNotNull(x)
    println(x.length)
}

fun main() {
    foo(null)
}
```

**答案**：抛出 `IllegalArgumentException: Required value was null.`。

**解析**：`requireNotNull` 在参数为 null 时抛出异常，不会执行后续代码。

### 10.3 应用题

**习题 6**：实现一个函数，接受三个可空字符串，返回它们拼接后的结果（任一为 null 则用空字符串替代）。

**答案**：

```kotlin
fun concat(a: String?, b: String?, c: String?): String {
    return (a ?: "") + (b ?: "") + (c ?: "")
}

// 或使用 buildString
fun concat2(a: String?, b: String?, c: String?): String = buildString {
    a?.let { append(it) }
    b?.let { append(it) }
    c?.let { append(it) }
}

fun main() {
    println(concat("Hello", null, "World"))  // HelloWorld
    println(concat(null, null, null))  // (空字符串)
}
```

**习题 7**：实现一个函数，接受一个可空列表，返回非空元素的数量。

**答案**：

```kotlin
fun countNonNulls(list: List<String?>?): Int {
    return list?.count { it != null } ?: 0
}

// 或使用 filterNotNull
fun countNonNulls2(list: List<String?>?): Int {
    return list?.filterNotNull()?.size ?: 0
}

fun main() {
    val list = listOf("a", null, "b", null, "c")
    println(countNonNulls(list))  // 3
    println(countNonNulls(null))  // 0
}
```

### 10.4 分析题

**习题 8**：分析以下代码的性能问题，并给出优化方案。

```kotlin
fun process(users: List<User?>): List<Int> {
    return users.filterNotNull().map { it.age }
}

data class User(val age: Int)
```

**分析**：`filterNotNull().map { }` 会创建两个中间列表，遍历列表两次。

**优化**：使用 `mapNotNull` 单次遍历。

```kotlin
fun process(users: List<User?>): List<Int> {
    return users.mapNotNull { it?.age }
}
```

### 10.5 设计题

**习题 9**：设计一个 `Optional<T>` 类型，提供 `map`、`flatMap`、`filter`、`getOrElse` 操作。

**答案**：

```kotlin
sealed class Optional<out T> {
    object None : Optional<Nothing>()
    data class Some<T>(val value: T) : Optional<T>()
    
    companion object {
        fun <T> of(value: T?): Optional<T> = if (value != null) Some(value) else None
        fun <T> empty(): Optional<T> = None
    }
}

fun <T, R> Optional<T>.map(f: (T) -> R): Optional<R> = when (this) {
    is Optional.None -> Optional.None
    is Optional.Some -> Optional.Some(f(value))
}

fun <T, R> Optional<T>.flatMap(f: (T) -> Optional<R>): Optional<R> = when (this) {
    is Optional.None -> Optional.None
    is Optional.Some -> f(value)
}

fun <T> Optional<T>.filter(predicate: (T) -> Boolean): Optional<T> = when (this) {
    is Optional.None -> this
    is Optional.Some -> if (predicate(value)) this else Optional.None
}

fun <T> Optional<T>.getOrElse(default: T): T = when (this) {
    is Optional.None -> default
    is Optional.Some -> value
}

fun <T> Optional<T>.getOrNull(): T? = when (this) {
    is Optional.None -> null
    is Optional.Some -> value
}

fun main() {
    val opt = Optional.of("hello")
    println(opt.map { it.length }.getOrElse(0))  // 5
    
    val empty = Optional.of<String>(null)
    println(empty.map { it.length }.getOrElse(0))  // 0
    
    val filtered = Optional.of(42).filter { it > 0 }
    println(filtered.getOrNull())  // 42
    
    val filtered2 = Optional.of(-1).filter { it > 0 }
    println(filtered2.getOrNull())  // null
}
```

**习题 10**：设计一个防御式 Java 互操作层，将平台类型自动转换为可空类型。

**答案**：

```kotlin
// 包装 Java 服务，将所有返回类型显式标注为可空
class SafeJavaService(private val delegate: Any) {
    // 假设 delegate 是 JavaService
    // 实际项目中使用反射或手写包装
    
    fun getString(key: String): String? {
        // 调用 Java 方法，返回值视为可空
        val result = callJavaMethod(delegate, "getString", key)
        return result as? String
    }
    
    fun requireString(key: String): String {
        return getString(key) ?: throw IllegalStateException("Key not found: $key")
    }
    
    private fun callJavaMethod(target: Any, method: String, vararg args: Any?): Any? {
        // 简化：实际应使用反射
        return when (method) {
            "getString" -> "default-value"  // 模拟返回
            else -> null
        }
    }
}

// 使用扩展函数为 Java 类添加安全包装
fun <T : Any> Any.safeCall(block: () -> T): T? {
    return try {
        block()
    } catch (e: Exception) {
        null
    }
}

fun main() {
    val service = SafeJavaService(Object())
    val value = service.getString("key")
    println("Value: $value")
    
    val required = service.requireString("key")
    println("Required: $required")
}
```

---

## 11. 参考文献

### 11.1 官方文档

1. JetBrains. "Null Safety." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/null-safety.html.

2. JetBrains. "Smart Casts." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/typecasts.html#smart-casts.

3. JetBrains. "Platform Types." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/java-interop.html#null-safety-and-platform-types.

4. JetBrains. "Contracts." *Kotlin Documentation*, 2024. https://kotlinlang.org/api/latest/jvm/stdlib/kotlin.contracts/.

5. JetBrains. "lateinit properties." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/properties.html#late-initialized-properties-and-variables.

### 11.2 学术论文

6. Hoare, Tony. "Null References: The Billion Dollar Mistake." *QCon*, 2009.

7. Hoare, Tony. "The Emperor's Old Clothes." *Communications of the ACM*, 24(2):75-83, 1981.

8. Conway, Melvin E. "Design of a Separable Transition-Diagram Compiler." *Communications of the ACM*, 6(7):396-408, 1963.

9. Reynolds, John C. "Definitional Interpreters for Higher-Order Programming Languages." *Proceedings of the ACM Annual Conference*, 1972.

10. Abadi, Martín, et al. "A Theory of Objects." *Springer-Verlag*, 1996.

### 11.3 KEEP 提案

11. JetBrains. "KEEP-104: Contracts." *Kotlin Evolution and Enhancement Process*, 2018. https://github.com/Kotlin/KEEP/blob/master/proposals/contracts.md.

12. JetBrains. "KEEP-97: Sealed Classes." *Kotlin Evolution and Enhancement Process*, 2017. https://github.com/Kotlin/KEEP/blob/master/proposals/sealed-class-inheritance.md.

### 11.4 跨语言参考

13. Apple. "The Swift Programming Language: Optionals." *Swift Documentation*, 2024. https://docs.swift.org/swift-book/LanguageGuide/TheBasics.html.

14. Microsoft. "Nullable reference types." *C# Programming Guide*, 2024. https://docs.microsoft.com/dotnet/csharp/nullable-references.

15. TypeScript Team. "TypeScript Handbook: Nullable Types." *TypeScript Documentation*, 2024. https://www.typescriptlang.org/docs/handbook/2/everyday-types.html.

16. Rust Team. "The Rust Programming Language: Option." *Rust Documentation*, 2024. https://doc.rust-lang.org/std/option/.

### 11.5 工程实践

17. JetBrains. "Coding Conventions." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/coding-conventions.html.

18. Detekt Team. "Detekt Static Analysis." *GitHub Repository*, 2024. https://github.com/detekt/detekt.

19. JSpecify. "J Specification: Nullness Annotations." *GitHub Repository*, 2024. https://jspecify.dev/.

20. JetBrains. "JetBrains Annotations." *GitHub Repository*, 2024. https://github.com/JetBrains/java-annotations.

### 11.6 KMP 与跨平台

21. JetBrains. "Kotlin Multiplatform." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/multiplatform.html.

22. JetBrains. "Kotlin/JVM, Kotlin/JS, Kotlin/Native interop." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/multiplatform.html.

### 11.7 性能与优化

23. Shin, Sihyeon. "Kotlin Performance: Understanding the JVM bytecode." *Medium*, 2023. https://medium.com/kotlin-performance.

24. JetBrains. "K2 Compiler." *Kotlin Documentation*, 2024. https://kotlinlang.org/docs/whatsnew20.html.

### 11.8 测试

25. Kotlin Test Team. "kotlin.test." *Kotlin Documentation*, 2024. https://kotlinlang.org/api/latest/kotlin.test/.

26. JUnit Team. "JUnit 5 User Guide." *JUnit Documentation*, 2024. https://junit.org/junit5/docs/current/user-guide/.

---

## 12. 延伸阅读

### 12.1 进阶主题

- **协程与空安全**：见[协程调度器与上下文](./协程调度器与上下文.md)与[协程异常处理](./协程异常处理.md)
- **委托属性**：见[委托属性](./委托属性.md)，深入 `lazy`、`observable`、`vetoable` 的字节码实现
- **密封类与代数数据类型**：见[密封类与代数数据类型](./密封类与代数数据类型.md)
- **DSL 设计**：见[DSL与领域特定语言](./DSL与领域特定语言.md)，结合空安全构建类型安全的 DSL
- **扩展函数**：见[扩展函数](./扩展函数.md)，为可空类型添加扩展

### 12.2 相关项目

- **Arrow.kt**：函数式编程库，提供 `Option`、`Either`、`Try` 等类型
  - https://arrow-kt.io/

- **Kotest**：测试框架，提供 `shouldBe`、`shouldThrow` 等断言
  - https://kotest.io/

- **Kotlinx Serialization**：序列化框架，处理可空字段的序列化
  - https://github.com/Kotlin/kotlinx.serialization

- **Ktor**：Web 框架，使用空安全 API
  - https://ktor.io/

### 12.3 书籍推荐

- **"Kotlin in Action"** - Dmitry Jemerov, Svetlana Isakova
  - 第 6 章 "Nullability" 深入讲解空安全

- **"Effective Kotlin"** - Marcin Moskala
  - 第 1 章 "Safety" 包含空安全最佳实践

- **"Programming Kotlin"** - Venkat Subramaniam
  - 第 4 章 "Working with Nullability"

- **"The Joy of Kotlin"** - Pierre-Yves Saumont
  - 函数式视角下的空安全与 `Result` 类型

### 12.4 社区资源

- **Kotlin Slack**：https://kotlinlang.slack.com/
  - `#nullability` 频道讨论空安全问题

- **Kotlin Discussions**：https://discuss.kotlinlang.org/
  - 空安全相关问题与最佳实践

- **Stack Overflow**：https://stackoverflow.com/questions/tagged/kotlin+nullpointerexception
  - Kotlin 空安全常见问题

### 12.5 实践项目

- **Android 应用**：实践 `lateinit` 与 `ViewBinding` 的延迟初始化
- **Spring Boot 服务**：实践 `@Nullable` 注解与 Kotlin 互操作
- **KMP 库**：实现跨平台的配置管理，使用空安全 API
- **DSL 设计**：构建 HTML/SQL 构建器，使用 `sealed class` 表示"不可为空"的约束

### 12.6 相关 Kotlin 文档

- [Kotlin 与 Java 互操作](./Kotlin与Java互操作.md)
- [扩展函数](./扩展函数.md)
- [密封类与代数数据类型](./密封类与代数数据类型.md)
- [委托属性](./委托属性.md)
- [DSL与领域特定语言](./DSL与领域特定语言.md)
- [测试与最佳实践](./测试与最佳实践.md)
- [协程调度器与上下文](./协程调度器与上下文.md)
- [协程异常处理](./协程异常处理.md)
- [Flow冷流与SharedFlow和StateFlow](./Flow冷流与SharedFlow和StateFlow.md)
- [作用域函数区别](./作用域函数区别.md)
