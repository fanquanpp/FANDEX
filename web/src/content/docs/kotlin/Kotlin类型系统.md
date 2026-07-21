---
order: 64
title: Kotlin类型系统
module: kotlin
category: Kotlin
difficulty: advanced
description: 'Kotlin 类型系统深度解析：泛型、型变（协变 out / 逆变 in / 不变）、星投影、类型擦除、reified 类型参数、上下界约束、declaration-site 与 use-site variance 的形式化定义、编译器实现与企业级工程实践。对标 MIT 6.005、Stanford CS193P、CMU 15-312 教学水准。'
author: fanquanpp
updated: '2026-07-21'
related:
  - kotlin/Kotlin集合操作
  - kotlin/Kotlin作用域函数
  - kotlin/Kotlin与Compose
  - kotlin/Kotlin与Gradle
  - kotlin/空安全详解
  - kotlin/密封类与密封接口
  - kotlin/概述与环境配置
prerequisites:
  - kotlin/概述与环境配置
  - kotlin/类与对象
---

# Kotlin 类型系统深度解析（Kotlin Type System in Depth）

> 本文档对标 MIT 6.005 Software Construction、Stanford CS193P、CMU 15-312 Principles of Programming Languages 等海外名校课程的教学水准，系统讲解 Kotlin 类型系统的核心机制：泛型（Generics）、型变（Variance）、星投影（Star Projection）、类型擦除（Type Erasure）、`reified` 类型参数、上下界约束（Bounds）。本文不假设读者具备 Scala 或 Haskell 的类型理论前置知识，所有概念均从"为什么需要"出发，逐步深入到 JVM 字节码与 K2 编译器实现层面。完成本文学习后，读者将能够独立设计类型安全的泛型 API、正确使用 `out`/`in`/`*` 修饰符、理解协变与逆变的本质区别，并能在 Android、KMP、Spring 等工程实践中应用类型系统理论。

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

- 复述 Kotlin 泛型（Generics）的语法形式：`class Box<T>(val value: T)`、`fun <T> identity(x: T): T = x`。
- 列举型变（Variance）的三种形式：协变（covariant, `out`）、逆变（contravariant, `in`）、不变（invariant, 默认）。
- 背诵星投影（Star Projection, `*`）的语义：`List<*>` 表示"未知类型参数的 List"，等价于 `List<out Any?>`。
- 记忆类型擦除（Type Erasure）的规则：JVM 平台上 `List<String>` 与 `List<Int>` 在运行时都是 `List`，类型参数 `<String>` 与 `<Int>` 不存在于字节码中。
- 复述 `reified` 关键字的作用：在 `inline` 函数中保留类型参数到运行时，可通过 `T::class.java` 访问。
- 列举上界约束（Upper Bound）的语法：`<T : Comparable<T>>` 与 `where T : Comparable<T>, T : Any`。
- 记忆 `out` 与 `in` 的语义差异：`out T` 表示 T 只能出现在"产出"位置（返回值），`in T` 表示 T 只能出现在"消费"位置（参数）。
- 背诵 declaration-site variance（声明处型变）与 use-site variance（使用处型变）的区别：前者在类声明处用 `out`/`in`，后者在使用处用 `out`/`in` 投影。
- 记忆 Kotlin 集合的型变设计：`List<out E>` 是协变的，`MutableList<E>` 是不变的。

### 1.2 Understand（理解）

- 用自己的语言解释为什么 `List<String>` 不能赋给 `List<Any>`：因为 `List` 默认不变（invariant），即使 `String` 是 `Any` 的子类型，`List<String>` 也不是 `List<Any>` 的子类型。这是为了类型安全（避免通过 `List<Any>` 写入非 String 元素）。
- 解释协变（covariant）的本质：如果 `Producer<out T>` 协变，则 `Producer<String>` 是 `Producer<Any>` 的子类型，因为 Producer 只"产出" T 而不"消费" T，不会发生类型污染。
- 解释逆变（contravariant）的本质：如果 `Consumer<in T>` 逆变，则 `Consumer<Any>` 是 `Consumer<String>` 的子类型，因为 Consumer 只"消费" T，接受 `Any` 的消费者可以安全地接受 `String`。
- 阐述星投影 `*` 的类型推断：`List<*>` 读取元素得到 `Any?`（因为类型参数上界未知），但写入元素受限（除了 `null`）。
- 解释类型擦除的历史原因：Java 5 引入泛型时为了向后兼容 Java 1.4 的非泛型集合，选择擦除类型参数到上界（默认 `Object`）。
- 描述 `reified` 的实现原理：`inline` 函数被内联展开时，调用处的类型实参会被替换进函数体，因此 `T::class.java` 实际访问的是调用处的具体类型。
- 理解 `where` 子句的多重约束：`<T> where T : Comparable<T>, T : Any` 表示 T 必须同时实现 `Comparable<T>` 且非空。
- 解释型变与继承的独立性：`class Derived : Base()` 并不自动让 `Generic<Derived>` 成为 `Generic<Base>` 的子类型，型变需要显式声明。

### 1.3 Apply（应用）

- 设计一个协变的不可变容器 `class ImmutableList<out T>`，确保 T 只出现在返回位置。
- 设计一个逆变的回调接口 `interface Listener<in T> { fun onEvent(event: T) }`，确保 T 只出现在参数位置。
- 使用 `reified` 实现类型安全的 JSON 反序列化：`inline fun <reified T> parse(json: String): T = mapper.readValue(json, T::class.java)`。
- 使用星投影处理"未知类型参数"的场景：`fun printList(list: List<*>) { list.forEach { println(it) } }`。
- 使用 `where` 子句约束类型参数：`fun <T> sort(list: List<T>): List<T> where T : Comparable<T> { return list.sorted() }`。
- 在函数式 API 中使用 `in` 投影：`fun consume(consumer: Consumer<in String>) { consumer.onEvent("hello") }`。
- 实现一个类型安全的 `Result<out T>` 密封类，利用协变让 `Result<Nothing>` 是 `Result<T>` 的子类型。

### 1.4 Analyze（分析）

- 反编译 Kotlin 泛型代码，分析 JVM 字节码中类型参数被擦除为 `Object` 或上界的过程。
- 对比 `List<out E>`（声明处协变）与 `List<out E>` 投影（使用处协变）在字节码层面的差异：无差异，都是通过 `out` 修饰符标记，编译器在调用处检查。
- 分析 `inline` + `reified` 的性能权衡：内联消除了函数调用开销，但增加了字节码体积；reified 保留了类型信息，但仅限于内联函数。
- 解构 Kotlin 编译器的型变检查机制：在赋值、参数传递、返回值时，编译器检查源类型是否为目标类型的子类型，考虑型变修饰符。
- 分析星投影 `*` 在不同型变下的语义：
  - `Covariant<*>` 等价于 `Covariant<out Any?>`。
  - `Contravariant<*>` 等价于 `Contravariant<in Nothing>`。
  - `Invariant<*>` 同时具有 `out Any?`（读）与 `in Nothing`（写）的限制。
- 分析 `List<*>` 与 `List<Any?>` 的区别：前者类型参数未知，只能读不能写；后者类型参数是 `Any?`，可以读写。

### 1.5 Evaluate（评价）

- 评价 Kotlin 选择 declaration-site variance（与 Java 不同）的设计权衡：声明处型变让库作者一次性声明，使用方无需重复投影，但牺牲了使用方的灵活性。
- 评价 Kotlin 选择类型擦除（与 Java 一致）而非实化（与 C# 不同）的策略：兼容 Java 生态，但运行时无法获取泛型类型信息，需用 `reified` 弥补。
- 评估 `reified` 的局限性：只能在 `inline` 函数中使用，无法在普通类、普通函数、属性类型中使用。
- 评价 Kotlin 默认不变（invariant）的选择：相比 Scala 默认不变，Kotlin 强制开发者显式声明型变，提高类型安全性但增加代码量。
- 评估星投影 `*` 的实用性：在处理"未知类型参数"时有用，但牺牲了类型信息，应优先使用具体类型。
- 评价 Kotlin 类型系统的"实用优于纯粹"取向：不引入高级类型（higher-kinded types）、不引入隐式参数，换取了简洁性与可维护性。

### 1.6 Create（创造）

- 设计并实现一个完整的类型安全的 ORM 框架，利用泛型、型变、`reified` 实现 `Repository<T : Entity>`、`Query<T>`、`Mapper<T>` 等核心抽象。
- 设计一个函数式效果系统 `Effect<out A, out E>`，利用密封类与协变建模成功、失败、未决三种状态。
- 实现一个类型类（typeclass）模拟库，通过 `interface` + 扩展函数 + 上下文参数模拟 Haskell 的 typeclass，绕过 Kotlin 不支持高级类型的限制。
- 撰写一份团队泛型 API 设计规范：何时用 `out`、何时用 `in`、何时用 `*`、何时用 `reified`、何时用 `where`。
- 设计一个基于 `reified` 的依赖注入容器，实现 `inline fun <reified T : Any> get(): T = container[T::class]!!`。

---

## 2. 历史动机与发展脉络

### 2.1 问题背景：Java 泛型的痛点

Java 5（2004）引入泛型（Generics），目的是让集合类型安全。但 Java 泛型有几个痛点：

1. **类型擦除（Type Erasure）**：为了向后兼容 Java 1.4 的非泛型集合（`List` 而非 `List<T>`），Java 选择擦除类型参数到上界（默认 `Object`）。运行时 `List<String>` 与 `List<Int>` 都是 `List`，无法区分。

2. **使用处型变（Use-site Variance）的繁琐**：Java 的通配符 `? extends T`（上界）与 `? super T`（下界）在使用处声明，每次使用都要重复写：
   ```java
   // Java
   public void copy(List<? extends Number> src, List<? super Number> dst) { ... }
   ```

3. **PECS 原则的记忆负担**：Joshua Bloch 在《Effective Java》中提出 PECS（Producer Extends, Consumer Super），开发者需要每次手动判断该用 `? extends` 还是 `? super`。

4. **原始类型（Raw Type）的安全漏洞**：Java 允许 `List list = new ArrayList<String>()`，绕过泛型检查，导致运行时 `ClassCastException`。

Kotlin 的设计目标：

- **declaration-site variance**：让库作者一次性声明型变，使用方无需重复（借鉴 Scala）。
- **消除 raw type**：所有泛型类型必须带类型参数，`List` 必须写作 `List<*>`。
- **简洁语法**：用 `out T`/`in T` 替代 `? extends T`/`? super T`，语义更清晰。
- **保持类型擦除**：为了 JVM 互操作，保留类型擦除，但提供 `reified` 弥补运行时类型信息缺失。

### 2.2 学术背景：型变理论

型变（Variance）的概念源于类型理论（Type Theory）：

- **子类型（Subtyping）**：如果 `S` 是 `T` 的子类型（记作 $S \sqsubseteq T$），则任何 `T` 类型的值都可以被 `S` 类型的值替换（Liskov 替换原则）。
- **型变（Variance）**：描述复合类型 `C<T>` 与子类型 `C<S>` 之间的关系。
  - **协变（Covariant）**：$S \sqsubseteq T \implies C<S> \sqsubseteq C<T>$。
  - **逆变（Contravariant）**：$S \sqsubseteq T \implies C<T> \sqsubseteq C<S>$。
  - **不变（Invariant）**：$S \sqsubseteq T$ 与 $C<S>$、$C<T>$ 之间无子类型关系。
  - **双变（Bivariant）**：同时协变与逆变（罕见，如 TypeScript 的 `any`）。

型变的安全条件（Soundness）：

- 如果 `C<T>` 只"产出" T（如只读容器、生产者），则可以协变。
- 如果 `C<T>` 只"消费" T（如回调、消费者），则可以逆变。
- 如果 `C<T>` 同时"产出"与"消费" T（如可变容器），则必须不变。

这一理论由 Luca Cardelli 在 1988 年的论文《On Understanding Types, Data Abstraction, and Polymorphism》中形式化。

### 2.3 Scala 的影响：declaration-site variance

Scala（2004）首次在主流语言中引入 declaration-site variance：

```scala
// Scala
class Covariant[+T]  // 协变
class Contravariant[-T]  // 逆变
class Invariant[T]  // 不变
```

Scala 用 `+T` 表示协变、`-T` 表示逆变，Kotlin 借鉴了这一思路但改用 `out T`、`in T`：

```kotlin
// Kotlin
class Covariant<out T>
class Contravariant<in T>
class Invariant<T>
```

Kotlin 选择 `out`/`in` 的理由：

1. **语义直观**：`out` 表示"产出"，`in` 表示"输入/消费"，比 `+`/`-` 更易理解。
2. **避免与算术运算符混淆**：`+`/`-` 在数学上下文中容易引起误解。
3. **与 Kotlin 的 `in` 操作符统一**：`in` 既用于"包含检查"也用于"逆变声明"，语义一致。

### 2.4 Kotlin 1.0（2016）：泛型初版

Kotlin 1.0 引入完整的泛型系统：

```kotlin
// Kotlin 1.0
class Box<T>(val value: T)

// declaration-site variance
class Producer<out T> { fun produce(): T }
class Consumer<in T> { fun consume(item: T) }

// use-site variance (projection)
fun copy(from: Array<out Number>, to: Array<in Number>) { ... }

// 上界约束
fun <T : Comparable<T>> sort(list: List<T>) = list.sorted()

// 类型擦除（与 Java 一致）
val list: List<String> = listOf("a", "b")
// 运行时 list 的类型是 List，<String> 被擦除
```

1.0 的核心特性：

1. declaration-site variance（`out`/`in`）。
2. use-site variance（投影）。
3. 星投影 `*`。
4. 上界约束 `<T : Bound>`。
5. 多重约束 `where`。
6. 类型擦除（与 Java 互操作）。

### 2.5 Kotlin 1.1-1.2（2017-2018）：泛型改进

Kotlin 1.1 引入：

- **类型别名（typealias）**：`typealias StringList = List<String>`，让复杂泛型类型更易读。
- **枚举值泛型改进**：`Enum.entries` 的类型推断更准确。

Kotlin 1.2 引入：

- **`Array<out T>` 投影优化**：编译器对数组协变检查更精确。
- **KMP 中的泛型一致性**：JVM、JS、Native 平台的泛型行为一致。

### 2.6 Kotlin 1.3（2018）：inline class 与契约

Kotlin 1.3 引入实验性特性：

- **inline class**：`inline class UserId(val value: Long)`，在运行时表示为 `Long`，零开销的类型包装。
- **契约（Contracts）**：`contract { callsInPlace(lambda, EXACTLY_ONCE) }`，让编译器知道 lambda 的调用次数，改进类型推断。

### 2.7 Kotlin 1.4-1.5（2020-2021）：泛型推断改进

Kotlin 1.4 改进：

- **更智能的类型推断**：在嵌套泛型场景下推断更准确，如 `mapNotNull` 返回 `List<R>` 而非 `List<R?>`。
- **SAM 转换改进**：单抽象方法接口的 Lambda 转换更智能。

Kotlin 1.5 改进：

- **`value class` 稳定**：从 `inline class` 升级为 `value class`，允许实现接口。
- **密封类跨文件**：密封类子类可在同一包内任意文件声明，配合泛型建模更灵活。

### 2.8 Kotlin 1.6-1.7（2021-2022）：递归类型推断

Kotlin 1.6-1.7 改进：

- **递归类型推断**：在递归函数中推断类型参数更准确，如 `fun <T> deepCopy(node: T): T`。
- **`Builder Inference`**：在构建器模式中推断类型参数，如 `buildList { add("a") }` 推断为 `List<String>`。
- **K2 编译器 Alpha**：新编译器对泛型推断重写，更准确。

### 2.9 Kotlin 1.8-1.9（2023）：K2 Beta 与跨平台泛型

Kotlin 1.8-1.9 改进：

- **K2 Beta**：泛型推断性能提升约 30%，错误信息更友好。
- **`@JvmName` 与泛型**：在 KMP 项目中，泛型函数的 JVM 名称可以定制。
- **跨平台泛型一致性**：JS、Native 平台的泛型行为与 JVM 一致（尽管 JS/Native 无类型擦除问题）。

### 2.10 Kotlin 2.0（2024）：K2 稳定与 Builder Inference

Kotlin 2.0 的 K2 编译器对泛型进行全面优化：

1. **Builder Inference 稳定**：`buildList { }`、`buildMap { }` 等构建器函数的类型推断稳定。
2. **更精确的型变检查**：K2 能识别更多边界条件，减少误报。
3. **跨模块泛型一致性**：K2 在编译时检查跨模块的泛型类型一致性。
4. **更友好的错误信息**：K2 能精确指出型变违反的位置与原因。

### 2.11 时间线总览

```
2004  Java 5 — 引入泛型，类型擦除，使用处型变
2004  Scala — declaration-site variance (+T / -T)
2016  Kotlin 1.0 — 完整泛型系统，out/in/星投影
2017  Kotlin 1.1 — typealias
2018  Kotlin 1.3 — inline class 实验，契约
2020  Kotlin 1.4 — 智能类型推断
2021  Kotlin 1.5 — value class 稳定
2022  Kotlin 1.7 — Builder Inference 改进
2024  Kotlin 2.0 — K2 稳定，Builder Inference 稳定
```

### 2.12 JetBrains 的设计哲学

JetBrains 在设计 Kotlin 类型系统时遵循以下哲学：

1. **declaration-site 优先**：库作者一次声明，使用方无需重复投影。
2. **类型安全优于便利**：默认不变，强制显式声明型变。
3. **与 Java 互操作**：保留类型擦除，通过 `reified` 弥补。
4. **简洁优于冗长**：`out`/`in` 比 `? extends`/`? super` 更简洁。
5. **实用优于纯粹**：不引入高级类型，保持简单。

---

## 3. 形式化定义

### 3.1 类型系统的结构

设 $\tau$ 为 Kotlin 的类型集合。Kotlin 的类型系统可形式化为：

$$
\tau ::= \text{Primitive} \mid \text{Class} \mid \text{Interface} \mid \text{Nullable}(\tau) \mid \text{Generic}(\tau, \tau^*) \mid \text{Function}(\tau^*, \tau) \mid \text{TypeAlias}(\tau)
$$

其中：

- $\text{Primitive}$ 是基本类型（`Int`、`Long`、`Double` 等）。
- $\text{Class}$ 与 $\text{Interface}$ 是用户定义类型。
- $\text{Nullable}(\tau) = \tau \cup \{\text{Null}\}$ 是可空类型。
- $\text{Generic}(\tau, \tau^*)$ 是泛型类型，如 `List<String>`。
- $\text{Function}(\tau^*, \tau)$ 是函数类型，如 `(Int) -> String`。
- $\text{TypeAlias}(\tau)$ 是类型别名。

### 3.2 子类型关系（Subtyping）

子类型关系 $\sqsubseteq$ 是类型集合 $\tau$ 上的偏序关系，满足：

1. **自反性**：$\forall T, T \sqsubseteq T$。
2. **传递性**：$\forall T_1, T_2, T_3, T_1 \sqsubseteq T_2 \land T_2 \sqsubseteq T_3 \implies T_1 \sqsubseteq T_3$。
3. **反对称性**：$\forall T_1, T_2, T_1 \sqsubseteq T_2 \land T_2 \sqsubseteq T_1 \implies T_1 = T_2$。

Kotlin 的子类型关系包括：

- **继承关系**：`class Derived : Base()` 则 `Derived $\sqsubseteq$ Base`。
- **实现关系**：`class Impl : Iface` 则 `Impl $\sqsubseteq$ Iface`。
- **可空关系**：`T $\sqsubseteq$ T?`（任何非空类型是其可空版本的子类型）。
- **底层类型**：`Nothing $\sqsubseteq$ T`（`Nothing` 是所有类型的子类型）。
- **顶层类型**：`T $\sqsubseteq$ Any?`（`Any?` 是所有类型的父类型）。

### 3.3 泛型类型构造器

泛型类型构造器（Type Constructor）是一个从类型到类型的函数：

$$
C : \tau^n \to \tau
$$

其中 $n$ 是类型参数的个数（arity）。例如：

- `List<T>` 是 arity 为 1 的类型构造器：`List : $\tau \to \tau$`。
- `Map<K, V>` 是 arity 为 2 的类型构造器：`Map : $\tau \times \tau \to \tau$`。

类型构造器本身不是类型，必须应用到类型实参才成为类型：

- `List` 是类型构造器（kind: $\tau \to \tau$）。
- `List<String>` 是类型（kind: $\tau$）。

### 3.4 型变（Variance）的形式化定义

设 $C$ 是 arity 为 1 的类型构造器，$S \sqsubseteq T$ 是子类型关系。$C$ 的型变分为四种：

**协变（Covariant）**，记作 `C<out T>`：

$$
S \sqsubseteq T \implies C<S> \sqsubseteq C<T>
$$

**逆变（Contravariant）**，记作 `C<in T>`：

$$
S \sqsubseteq T \implies C<T> \sqsubseteq C<S>
$$

**不变（Invariant）**，记作 `C<T>`：

$$
S \sqsubseteq T \nRightarrow C<S> \sqsubseteq C<T> \land C<T> \nRightarrow C<S>
$$

即 $C<S>$ 与 $C<T>$ 之间无子类型关系（除非 $S = T$）。

**双变（Bivariant）**（罕见）：

$$
S \sqsubseteq T \implies C<S> \sqsubseteq C<T> \land C<T> \sqsubseteq C<S>
$$

### 3.5 declaration-site variance 的形式化

declaration-site variance 在类声明处指定型变：

$$
\text{class } C\langle \text{out } T \rangle \quad \text{(协变)} \\
\text{class } C\langle \text{in } T \rangle \quad \text{(逆变)} \\
\text{class } C\langle T \rangle \quad \text{(不变)}
$$

协变约束：类型参数 $T$ 只能出现在"产出"位置（返回值、只读属性），不能出现在"消费"位置（参数、可变属性）。

逆变约束：类型参数 $T$ 只能出现在"消费"位置，不能出现在"产出"位置。

形式化地，设 $C\langle T \rangle$ 是一个类，$T$ 的出现位置可分为：

- **协变位置（covariant position）**：返回类型、只读属性类型、生产者角色。
- **逆变位置（contravariant position）**：参数类型、可变属性类型的 setter、消费者角色。
- **不变位置（invariant position）**：可变属性类型（同时读写）、`var` 属性。

协变声明 `out T` 要求 $T$ 只出现在协变位置；逆变声明 `in T` 要求 $T$ 只出现在逆变位置。

### 3.6 use-site variance（投影）的形式化

use-site variance 在使用处（变量声明、参数、返回值）临时指定型变：

$$
C\langle \text{out } T \rangle \quad \text{(协变投影)} \\
C\langle \text{in } T \rangle \quad \text{(逆变投影)} \\
C\langle * \rangle \quad \text{(星投影)}
$$

形式化地，投影 $C\langle \text{out } T' \rangle$ 表示"未知类型 $T'$，但 $T' \sqsubseteq T$"。这意味着：

- 读取元素得到 $T$（因为 $T'$ 是 $T$ 的子类型，可以安全赋值）。
- 写入元素受限（因为编译器不知道具体 $T'$，写入任何非 `null` 值都不安全）。

### 3.7 星投影（Star Projection）的形式化

星投影 $C\langle * \rangle$ 的语义取决于 $C$ 的 declaration-site variance：

**$C$ 协变（`C<out T>`）**：

$$
C<*> \equiv C<\text{out } \text{Nothing}>
$$

即"未知类型，但只读"。读取元素得到上界类型（如 `Any?`）。

**$C$ 逆变（`C<in T>`）**：

$$
C<*> \equiv C<\text{in } \text{Nothing}>
$$

即"未知类型，但只写"。写入元素类型为 `Nothing`（即不能写入任何值）。

**$C$ 不变（`C<T>`）**：

$$
C<*> \equiv C<\text{out } \text{Any?}> \cap C<\text{in } \text{Nothing}>
$$

即"未知类型，可读（得到 `Any?`）不可写"。

### 3.8 类型参数约束的形式化

类型参数约束（Bounds）的形式化：

$$
\text{fun } \langle T : B \rangle f(x: T) \quad \text{等价于} \quad \forall T, T \sqsubseteq B \implies f \text{ 可调用}
$$

即类型参数 $T$ 必须是 $B$ 的子类型。

多重约束（`where` 子句）：

$$
\text{fun } \langle T \rangle f(x: T) \text{ where } T \sqsubseteq B_1, T \sqsubseteq B_2 \quad \text{等价于} \quad \forall T, T \sqsubseteq B_1 \cap B_2 \implies f \text{ 可调用}
$$

即 $T$ 必须同时是 $B_1$ 与 $B_2$ 的子类型（交集类型）。

### 3.9 类型擦除的形式化

JVM 平台上的类型擦除（Type Erasure）规则：

设 $C\langle T \rangle$ 是泛型类型，$T$ 的上界为 $B$（默认 `Any?`）。擦除规则：

$$
\text{erase}(C\langle T \rangle) = C\langle B \rangle
$$

即类型参数 $T$ 被擦除为其上界 $B$。

具体例子：

- `List<String>` 擦除为 `List<Any?>`（在字节码中是 `List`）。
- `List<Int>` 擦除为 `List<Any?>`。
- `Repository<User>` 擦除为 `Repository<Any?>`。

类型擦除导致：

1. 运行时无法获取泛型类型参数：`list::class.java` 得到 `List.class`，无法得到 `<String>`。
2. 重载冲突：`fun foo(list: List<String>)` 与 `fun foo(list: List<Int>)` 在 JVM 上签名相同，需要 `@JvmName` 区分。
3. `is` 检查受限：`list is List<String>` 编译错误，只能 `list is List<*>` 或 `list is List`。

### 3.10 reified 的形式化

`reified` 类型参数的形式化：

$$
\text{inline fun } \langle \text{reified } T \rangle f() \quad \text{等价于} \quad \text{inline fun } \langle T \rangle f() \text{ with } T \text{ 的具体类型在调用处已知}
$$

实现机制：

1. `inline` 函数在调用处被内联展开。
2. 调用处的类型实参（如 `foo<String>()` 中的 `String`）被替换进函数体。
3. 函数体中的 `T::class.java` 实际访问的是调用处的具体类型。

形式化地：

$$
\text{inline fun } \langle \text{reified } T : B \rangle f() : R = e[T] \quad \xrightarrow{\text{inline}} \quad f_{\text{caller}}() : R = e[\text{CallerType}]
$$

即 `reified` 让 $T$ 在编译时被替换为调用处的具体类型。

### 3.11 型变的安全条件

型变的安全条件（Soundness Condition）由以下定理保证：

**定理（型变安全）**：设 $C\langle T \rangle$ 是类型构造器。

1. 如果 $C$ 协变（`out T`），则 $T$ 只能出现在协变位置（返回值、只读属性）。
2. 如果 $C$ 逆变（`in T`），则 $T$ 只能出现在逆变位置（参数）。
3. 如果 $C$ 不变，则 $T$ 可以出现在任意位置。

**证明（协变安全）**：设 $C$ 协变，$S \sqsubseteq T$，$c : C<S>$。要证 $c$ 可安全用作 $C<T>$。

- 由于 $T$ 只出现在协变位置，$c$ 的所有方法都不会"消费" $T$（即不会接受 $T$ 类型的参数）。
- $c$ 的所有方法都"产出" $T$（返回 $T$ 类型的值）。由于 $S \sqsubseteq T$，产出 $S$ 类型的值可安全用作 $T$。
- 因此 $c$ 可安全用作 $C<T>$。$\square$

**逆变安全**类似：由于 $T$ 只出现在逆变位置，$c$ 只"消费" $T$。如果 $c$ 是 $C<T>$，则它可接受 $T$ 类型的值；由于 $S \sqsubseteq T$，它也能接受 $S$ 类型的值。因此 $c$ 可安全用作 $C<S>$。$\square$

### 3.12 Liskov 替换原则

型变安全性的理论基础是 Liskov 替换原则（LSP）：

**LSP**：设 $S \sqsubseteq T$，则任何接受 $T$ 类型对象的函数，都应该能接受 $S$ 类型对象而不产生错误。

LSP 对型变的约束：

- 协变位置（返回值）可以是子类型：如果父类返回 $T$，子类可以返回 $S$（$S \sqsubseteq T$）。
- 逆变位置（参数）可以是父类型：如果父类接受 $T$，子类可以接受 $T$ 的父类型。

这一原则保证了继承关系下的类型安全，也是型变设计的核心依据。

---

## 4. 理论推导与原理解析

### 4.1 为什么默认不变（Invariance）

考虑 Java 早期没有泛型时的问题：

```java
// Java（无泛型）
List list = new ArrayList();
list.add("hello");
list.add(42);  // 编译通过，运行时 ClassCastException
```

引入泛型后，Java 5 让 `List<String>` 只能添加 `String`：

```java
// Java 5+
List<String> list = new ArrayList<>();
list.add("hello");
list.add(42);  // 编译错误
```

但问题是：`List<String>` 能否赋给 `List<Object>`？

如果允许（协变），则：

```java
List<String> strings = new ArrayList<>();
strings.add("hello");

List<Object> objects = strings;  // 如果允许
objects.add(42);  // 编译通过（因为 42 是 Object）

String s = strings.get(1);  // ClassCastException！
```

这就是"协变污染"（Covariant Pollution）：通过父类型引用写入了子类型不兼容的元素，导致读取时类型转换失败。

为了避免这一问题，Java 的泛型默认不变：`List<String>` 不能赋给 `List<Object>`。

Kotlin 继承了这一设计：默认不变，强制显式声明型变。

### 4.2 协变（Covariance）的安全条件

协变的必要条件：类型参数只出现在"产出"位置。

考虑一个只读容器 `Producer<out T>`：

```kotlin
class Producer<out T>(private val value: T) {
    fun produce(): T = value  // T 只在返回位置
}
```

由于 `Producer` 只"产出" T 而不"消费" T，可以安全协变：

```kotlin
val p: Producer<String> = Producer("hello")
val q: Producer<Any> = p  // 协变：Producer<String> 是 Producer<Any> 的子类型
val v: Any = q.produce()  // 安全：String 可赋给 Any
```

如果违反安全条件，让 T 出现在"消费"位置：

```kotlin
class BadProducer<out T>(private var value: T) {
    fun produce(): T = value
    fun consume(item: T) { value = item }  // 编译错误：T 在 in 位置
}
```

编译器会拒绝，因为 `consume` 会破坏协变安全性。

### 4.3 逆变（Contravariance）的安全条件

逆变的必要条件：类型参数只出现在"消费"位置。

考虑一个回调 `Consumer<in T>`：

```kotlin
interface Consumer<in T> {
    fun consume(item: T)  // T 只在参数位置
}
```

由于 `Consumer` 只"消费" T 而不"产出" T，可以安全逆变：

```kotlin
val anyConsumer: Consumer<Any> = object : Consumer<Any> {
    override fun consume(item: Any) { println(item) }
}

val strConsumer: Consumer<String> = anyConsumer  // 逆变：Consumer<Any> 是 Consumer<String> 的子类型
strConsumer.consume("hello")  // 安全：String 是 Any，anyConsumer 能处理
```

如果违反安全条件，让 T 出现在"产出"位置：

```kotlin
interface BadConsumer<in T> {
    fun consume(item: T)
    fun produce(): T  // 编译错误：T 在 out 位置
}
```

### 4.4 declaration-site vs use-site variance

Kotlin 同时支持 declaration-site（声明处）与 use-site（使用处）型变：

**declaration-site**：

```kotlin
class Producer<out T> {  // 声明处协变
    fun produce(): T
}

// 使用时无需投影
val p: Producer<Any> = Producer<String>()  // 自动协变
```

**use-site**：

```kotlin
class Container<T>(var value: T)  // 不变

fun copy(from: Container<out Number>, to: Container<in Number>) {
    to.value = from.value  // from 只读，to 只写
}
```

declaration-site 的优势：库作者一次声明，使用方无需重复。use-site 的优势：使用方灵活性高，可以针对不变类型临时投影。

Kotlin 的策略：

- 标准库中的只读集合（`List`、`Set`、`Map`）用 declaration-site 协变。
- 可变集合（`MutableList`、`MutableSet`、`MutableMap`）不变，使用时按需投影。

### 4.5 星投影 `*` 的语义

星投影 `*` 表示"未知类型参数"，在不同型变下语义不同：

**协变类型 `C<out T>` 的星投影 `C<*>`**：

- 等价于 `C<out Any?>`（T 的上界是 `Any?`）。
- 读取元素得到 `Any?`（因为不知道具体 T，但 T 是 `Any?` 的子类型）。
- 不能写入元素（因为不知道具体 T）。

```kotlin
class Producer<out T>(val value: T)

val p: Producer<*> = Producer("hello")
val v: Any? = p.value  // 读取得到 Any?
// p.value = "world"  // 编译错误：不能写入
```

**逆变类型 `C<in T>` 的星投影 `C<*>`**：

- 等价于 `C<in Nothing>`。
- 不能读取元素（因为不知道具体 T，且 T 可能是 `Nothing`）。
- 只能写入 `Nothing`（即不能写入任何值）。

```kotlin
interface Consumer<in T> {
    fun consume(item: T)
}

val c: Consumer<*> = object : Consumer<Any> {
    override fun consume(item: Any) { println(item) }
}
// c.consume("hello")  // 编译错误：不能调用（参数类型 Nothing）
```

**不变类型 `C<T>` 的星投影 `C<*>`**：

- 同时具有协变与逆变的限制：可读（得到 `Any?`）不可写。

```kotlin
class Container<T>(var value: T)

val c: Container<*> = Container("hello")
val v: Any? = c.value  // 读取得到 Any?
// c.value = "world"  // 编译错误：不能写入
```

### 4.6 类型擦除的实现机制

JVM 平台上类型擦除的实现：

```kotlin
// 源码
val list: List<String> = listOf("a", "b")
val map: Map<String, Int> = mapOf("a" to 1)
```

编译为字节码后：

```java
// 字节码（反编译）
List list = CollectionsKt.listOf("a", "b");  // 类型参数 <String> 被擦除
Map map = CollectionsKt.mapOf(Pair("a", 1));  // <String, Int> 被擦除
```

类型擦除的规则：

1. **无界类型参数**：擦除为 `Object`（Kotlin 中是 `Any?`）。
   - `List<T>` 擦除为 `List<Object>`。
2. **有界类型参数**：擦除为上界。
   - `Repository<T : Entity>` 擦除为 `Repository<Entity>`。
3. **多重约束**：擦除为第一个约束。
   - `<T> where T : Comparable<T>, T : Serializable` 擦除为 `Comparable`。

类型擦除的后果：

1. 运行时无法获取类型参数：`list is List<String>` 编译错误。
2. 重载冲突：`fun foo(list: List<String>)` 与 `fun foo(list: List<Int>)` 在 JVM 上签名相同。
3. 反射受限：无法通过反射获取 `List<String>` 的 `<String>`。

### 4.7 reified 的实现机制

`reified` 通过 `inline` 实现：

```kotlin
// 源码
inline fun <reified T : Any> typeOf(): KClass<T> = T::class

// 调用
val stringClass = typeOf<String>()
val intClass = typeOf<Int>()
```

内联展开后：

```kotlin
// 编译器展开
val stringClass = String::class  // T 被替换为 String
val intClass = Int::class  // T 被替换为 Int
```

`reified` 的限制：

1. 只能在 `inline` 函数中使用（非内联函数无法内联展开）。
2. 不能在普通类、普通函数、属性类型中使用。
3. 不能作为类型参数传递给非 `reified` 的函数。

### 4.8 型变检查的编译器实现

Kotlin 编译器在以下位置进行型变检查：

1. **赋值**：`val p: Producer<Any> = Producer<String>()`，检查 `Producer<String> $\sqsubseteq$ Producer<Any>`（协变成立）。
2. **参数传递**：`fun foo(p: Producer<Any>)` 调用 `foo(Producer<String>())`，同上。
3. **返回值**：`fun bar(): Producer<Any> = Producer<String>()`，同上。
4. **类型成员**：协变类型的成员方法参数不能是 T（逆变位置冲突）。

编译器的型变检查算法：

1. 构建"型变位置"图（variance position graph）。
2. 对每个类型参数的出现，标记其位置（协变、逆变、不变）。
3. 检查 declaration-site variance 声明与实际位置是否一致。
4. 对 use-site variance 投影，检查读写操作的安全性。

### 4.9 Builder Inference 的原理

Kotlin 2.0 的 Builder Inference 让构建器函数能推断类型参数：

```kotlin
val list = buildList {
    add("hello")
    add("world")
}
// list 的类型推断为 List<String>
```

实现原理：

1. 编译器先分析 lambda 体，收集对 `add` 的调用。
2. 根据 `add` 的参数类型，推断 `T` 的候选类型（这里是 `String`）。
3. 结合所有候选类型，求最公共父类型（common supertype）。
4. 将推断出的 `T` 应用于 `buildList<T>`。

### 4.10 K2 编译器对泛型的优化

K2 编译器对泛型处理的改进：

1. **FIR（Frontend Intermediate Representation）**：在 FIR 中显式表示型变信息，避免重复分析。
2. **增量类型推断**：仅对修改的部分重新推断，加速编译。
3. **更精确的错误信息**：能精确指出型变违反的具体位置与原因。
4. **跨模块一致性检查**：在编译时检查跨模块的泛型类型一致性。

---

## 5. 代码示例

### 5.1 基础泛型

```kotlin
// 泛型类
class Box<T>(val value: T) {
    fun get(): T = value
}

// 泛型函数
fun <T> identity(x: T): T = x

// 泛型扩展函数
fun <T> List<T>.second(): T? = if (size >= 2) this[1] else null

// 使用
val box: Box<String> = Box("hello")
val s: String = box.get()
val i: Int = identity(42)
val list = listOf("a", "b", "c")
val second: String? = list.second()
```

### 5.2 declaration-site variance

```kotlin
// 协变：Producer 只产出 T
class Producer<out T>(private val value: T) {
    fun produce(): T = value
}

// 逆变：Consumer 只消费 T
interface Consumer<in T> {
    fun consume(item: T)
}

// 不变：Container 既读又写 T
class Container<T>(var value: T) {
    fun get(): T = value
    fun set(v: T) { value = v }
}

fun main() {
    // 协变
    val p1: Producer<String> = Producer("hello")
    val p2: Producer<Any> = p1  // Producer<String> 是 Producer<Any> 的子类型
    val v: Any = p2.produce()

    // 逆变
    val c1: Consumer<Any> = object : Consumer<Any> {
        override fun consume(item: Any) { println("consumed: $item") }
    }
    val c2: Consumer<String> = c1  // Consumer<Any> 是 Consumer<String> 的子类型
    c2.consume("hello")

    // 不变
    val box1: Container<String> = Container("hello")
    // val box2: Container<Any> = box1  // 编译错误：Container 不变
}
```

### 5.3 use-site variance（投影）

```kotlin
// 不变类型，使用时投影
class Container<T>(var value: T)

// 协变投影：只读
fun readValue(container: Container<out String>): String {
    return container.value  // 只读
}

// 逆变投影：只写
fun writeValue(container: Container<in String>) {
    container.value = "hello"  // 只写
}

// 星投影：未知类型
fun printAll(containers: List<Container<*>>) {
    containers.forEach { c ->
        val v: Any? = c.value  // 读取得到 Any?
        println(v)
    }
}
```

### 5.4 上界约束

```kotlin
// 单上界
fun <T : Comparable<T>> max(a: T, b: T): T = if (a > b) a else b

// 多重约束（where 子句）
fun <T> sortAndSerialize(list: List<T>): List<String>
    where T : Comparable<T>,
          T : Serializable {
    return list.sorted().map { it.toString() }
}

// 上界与型变结合
class Repository<T : Entity>(private val items: MutableList<T> = mutableListOf()) {
    fun add(item: T) { items.add(item) }
    fun find(id: String): T? = items.find { it.id == id }
}

abstract class Entity {
    abstract val id: String
}

class User(override val id: String, val name: String) : Entity()

// 使用
val repo = Repository<User>()
repo.add(User("1", "Alice"))
val user = repo.find("1")
```

### 5.5 reified 类型参数

```kotlin
// reified：在 inline 函数中保留类型信息
inline fun <reified T> typeOf(): KClass<T> = T::class

inline fun <reified T> isInstance(value: Any): Boolean = value is T

inline fun <reified T : Any> filterByType(list: List<Any?>): List<T> {
    return list.filterIsInstance<T>()
}

// JSON 反序列化
inline fun <reified T : Any> String.parseJson(): T = jacksonMapper.readValue(this, T::class.java)

// 使用
val stringClass = typeOf<String>()
val list = listOf(1, "two", 3, "four", 5)
val ints: List<Int> = filterByType(list)  // [1, 3, 5]
val strings: List<String> = filterByType(list)  // ["two", "four"]

val json = """{"name":"Alice","age":30}"""
val user: User = json.parseJson()
```

### 5.6 协变集合 API 设计

```kotlin
// 协变 List（标准库的设计）
interface MyList<out E> {
    fun get(index: Int): E
    fun size(): Int
    // fun add(element: E)  // 编译错误：E 在 in 位置
}

// 不变 MutableList
interface MyMutableList<E> : MyList<E> {
    fun add(element: E)
    fun removeAt(index: Int): E
}

// 逆变 Consumer
interface MyConsumer<in E> {
    fun accept(item: E)
    // fun get(): E  // 编译错误：E 在 out 位置
}

// 使用协变
fun process(list: MyList<Any>) {
    val e: Any = list.get(0)
}

val strings: MyList<String> = ...
process(strings)  // 协变：MyList<String> 是 MyList<Any> 的子类型
```

### 5.7 递归泛型类型

```kotlin
// 递归类型约束：Comparable<T> 中 T 是当前类
class NaturalNumber(val value: Int) : Comparable<NaturalNumber> {
    override fun compareTo(other: NaturalNumber): Int = value.compareTo(other.value)
}

// 使用
fun <T : Comparable<T>> List<T>.sorted(): List<T> = sorted()

val numbers = listOf(NaturalNumber(3), NaturalNumber(1), NaturalNumber(2))
val sorted = numbers.sorted()  // [1, 2, 3]
```

### 5.8 高阶类型模拟

```kotlin
// Kotlin 不支持高级类型（Higher-Kinded Types），但可以模拟

// 类型类（typeclass）模拟：Functor
interface Functor<F<_>> {
    fun <A, B> map(fa: F<A>, f: (A) -> B): F<B>
}

// 由于 Kotlin 不支持 F<_>，用接口扩展模拟
interface FunctorOf<A> {
    fun <B> map(f: (A) -> B): FunctorOf<B>
}

class JustFunctor<A>(val value: A) : FunctorOf<A> {
    override fun <B> map(f: (A) -> B): JustFunctor<B> = JustFunctor(f(value))
}

// Monad 模拟
interface MonadOf<A> {
    fun <B> flatMap(f: (A) -> MonadOf<B>): MonadOf<B>
}

class JustMonad<A>(val value: A) : MonadOf<A> {
    override fun <B> flatMap(f: (A) -> MonadOf<B>): MonadOf<B> = f(value)
}
```

### 5.9 星投影的实际应用

```kotlin
// 处理未知类型参数的集合
fun printList(list: List<*>) {
    list.forEach { println(it) }  // it 类型是 Any?
}

// 数组的协变与 Array<*> 投影
fun copyArray(src: Array<*>, dst: Array<in Any?>) {
    for (i in src.indices) {
        dst[i] = src[i]  // src 只读，dst 只写
    }
}

// 反射场景
fun inspectClass(cls: KClass<*>) {
    println("Class: ${cls.simpleName}")
    println("Is sealed: ${cls.isSealed}")
    println("Is data: ${cls.isData}")
}

// 使用
printList(listOf("a", 1, true))
inspectClass(String::class)
```

### 5.10 类型别名（typealias）

```kotlin
// 类型别名：让复杂泛型类型更易读
typealias StringList = List<String>
typealias IntMap<V> = Map<Int, V>
typealias Predicate<T> = (T) -> Boolean
typealias Callback<T> = (T) -> Unit

// 使用
val strings: StringList = listOf("a", "b", "c")
val intValues: IntMap<String> = mapOf(1 to "one", 2 to "two")
val isPositive: Predicate<Int> = { it > 0 }
val onResult: Callback<Result> = { result -> println(result) }
```

### 5.11 不可空类型参数

```kotlin
// 不可空类型参数：T : Any
fun <T : Any> requireNotNull(value: T?): T {
    return value ?: throw IllegalArgumentException("value is null")
}

// 与可空类型参数对比
fun <T> process(value: T?) {
    if (value != null) {
        // value 类型是 T & Any（智能转换）
        println(value)
    }
}

// 使用
val s: String = requireNotNull(getName())
```

### 5.12 协变密封类与 `Nothing`

```kotlin
// 协变密封类：用 Nothing 表示"失败"或"空"
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>()
    data class Failure(val error: Throwable) : Result<Nothing>()  // 协变：Nothing 是 T 的子类型
    object Loading : Result<Nothing>()
}

fun <T> Result<T>.getOrElse(default: T): T = when (this) {
    is Result.Success -> value
    is Result.Failure -> default
    Result.Loading -> default
}

// 使用
val r1: Result<String> = Result.Success("hello")
val r2: Result<String> = Result.Failure(RuntimeException("error"))
val r3: Result<String> = Result.Loading

println(r1.getOrElse("default"))  // hello
println(r2.getOrElse("default"))  // default
println(r3.getOrElse("default"))  // default
```

### 5.13 逆变的实际应用：事件处理器

```kotlin
// 逆变事件处理器
interface EventHandler<in E> {
    fun handle(event: E)
}

// 基础事件
open class Event
class ClickEvent(val x: Int, val y: Int) : Event()
class KeyPressEvent(val key: Char) : Event()

// 通用事件处理器（接受任何 Event）
class AnyEventHandler : EventHandler<Event> {
    override fun handle(event: Event) {
        println("Event: $event")
    }
}

// 由于逆变，AnyEventHandler 可以作为 EventHandler<ClickEvent>
val handler: EventHandler<ClickEvent> = AnyEventHandler()
handler.handle(ClickEvent(100, 200))
```

### 5.14 协变的实际应用：工厂模式

```kotlin
// 协变工厂
interface Factory<out T> {
    fun create(): T
}

class StringFactory : Factory<String> {
    override fun create(): String = "default"
}

class IntFactory : Factory<Int> {
    override fun create(): Int = 0
}

// 使用协变
fun <T> useFactory(factory: Factory<T>): T = factory.create()

val anyFactory: Factory<Any> = StringFactory()  // 协变
val result: Any = useFactory(anyFactory)
```

### 5.15 多重约束的实战

```kotlin
// 类型参数同时满足多个约束
interface Comparable<T> {
    operator fun compareTo(other: T): Int
}

interface Serializable

class User(val name: String) : Comparable<User>, Serializable {
    override fun compareTo(other: User): Int = name.compareTo(other.name)
}

// 多重约束
fun <T> findMax(list: List<T>): T?
    where T : Comparable<T>,
          T : Serializable {
    return list.maxByOrNull { it }
}

// 使用
val users = listOf(User("Alice"), User("Bob"), User("Charlie"))
val maxUser = findMax(users)
```

---

## 6. 对比分析

### 6.1 Kotlin vs Java 泛型

| 维度                | Kotlin                                      | Java                                                |
| ------------------- | ------------------------------------------- | --------------------------------------------------- |
| declaration-site    | 支持（`out`/`in`）                          | 不支持（仅 use-site）                               |
| use-site            | 支持（`out T`/`in T` 投影）                 | 支持（`? extends T`/`? super T` 通配符）            |
| 星投影              | `List<*>`                                   | `List<?>`                                           |
| 类型擦除            | 是（JVM 平台）                              | 是                                                  |
| reified             | 支持（`inline` + `reified`）                | 不支持                                              |
| 原始类型（raw type）| 不允许（必须 `List<*>`）                    | 允许（`List`，但警告）                              |
| 数组型变            | 不变（`Array<String>` 不是 `Array<Any>`）   | 协变（`String[]` 是 `Object[]`，但有运行时检查）   |
| 多重约束            | `where T : A, T : B`                        | `<T extends A & B>`                                 |
| 不可空类型参数      | `<T : Any>`                                 | 不支持                                              |
| 语法简洁性          | `out T`/`in T`                              | `? extends T`/`? super T`                           |

### 6.2 Kotlin vs Scala 泛型

| 维度                | Kotlin                       | Scala                           |
| ------------------- | ---------------------------- | ------------------------------- |
| 协变语法            | `class C<out T>`             | `class C[+T]`                  |
| 逆变语法            | `class C<in T>`              | `class C[-T]`                  |
| 星投影              | `List<*>`                    | `List[?]`（存在类型）          |
| 类型擦除            | 是（JVM）                    | 是（JVM）                       |
| 高级类型            | 不支持                       | 支持（`F[_]`）                  |
| 隐式参数            | 不支持                       | 支持（`implicit`）             |
| 型变检查            | 编译时                       | 编译时                          |
| 实化                | `reified`                    | `ClassTag`/`TypeTag`            |
| 学习曲线            | 平缓                         | 陡峭                            |

### 6.3 Kotlin vs C# 泛型

| 维度                | Kotlin                          | C#                              |
| ------------------- | ------------------------------- | ------------------------------- |
| 类型擦除            | 是（JVM）                       | 否（CLR 实化泛型）              |
| 运行时类型信息      | 无（需 `reified`）             | 有（`typeof(T)`）               |
| declaration-site    | 支持                            | 支持（`out`/`in`）              |
| use-site            | 支持                            | 不支持                          |
| 星投影              | `List<*>`                       | 不支持                          |
| 性能                | 擦除，无运行时开销              | 实化，有运行时开销              |
| 互操作              | 与 Java 互操作                  | 与 .NET 互操作                  |

### 6.4 Kotlin vs TypeScript 泛型

| 维度                | Kotlin                       | TypeScript                              |
| ------------------- | ---------------------------- | --------------------------------------- |
| 类型系统            | 静态                         | 结构类型（structural）                  |
| 型变                | declaration-site + use-site  | 仅 declaration-site（`out`/`in`）       |
| 类型擦除            | 是（JVM）                    | 是（编译为 JS）                         |
| 高级类型            | 不支持                       | 支持（`F<T>`）                          |
| 条件类型            | 不支持                       | 支持（`T extends U ? X : Y`）          |
| 映射类型            | 不支持                       | 支持（`{ [K in keyof T]: ... }`）      |
| 运行时检查          | `is`                         | `typeof`、`instanceof`                  |

### 6.5 Kotlin vs Rust 泛型

| 维度                | Kotlin                       | Rust                                  |
| ------------------- | ---------------------------- | ------------------------------------- |
| 类型擦除            | 是（JVM）                    | 否（单态化，monomorphization）        |
| 运行时类型信息      | 无                           | 有（每个具体类型独立编译）            |
| declaration-site    | 支持                         | 支持（`+`/`-` 生命周期）               |
| 型变                | 子类型型变                   | 生命周期型变                          |
| Trait 约束          | `<T : Comparable<T>>`         | `<T: Comparable>`                     |
| 性能                | 擦除，无代码膨胀             | 单态化，代码膨胀                      |

### 6.6 declaration-site vs use-site variance 对比

**declaration-site 的优势**：

```kotlin
// 声明一次，使用简单
class Producer<out T> { fun produce(): T }

// 使用方无需重复
val p: Producer<Any> = Producer<String>()  // 自动协变
```

**use-site 的优势**：

```kotlin
// 不变类型，临时投影
class Container<T>(var value: T)

fun copy(from: Container<out Number>, to: Container<in Number>) {
    to.value = from.value
}
```

**何时用 declaration-site**：

- 类型在语义上是"生产者"或"消费者"（如 `List`、`Consumer`）。
- 库作者能确定型变语义。

**何时用 use-site**：

- 类型本身不变，但某个操作需要协变或逆变。
- 使用方需要灵活性。

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：误用协变导致类型不安全

```kotlin
// 错误：试图让可变容器协变
class BadList<out T>(private val items: MutableList<T>) {
    fun get(index: Int): T = items[index]
    fun add(item: T) { items.add(item) }  // 编译错误：T 在 in 位置
}
```

**最佳实践**：可变容器必须不变，只有只读容器才能协变。

### 7.2 陷阱：类型擦除导致的重载冲突

```kotlin
// 错误：JVM 上签名相同
fun process(list: List<String>) { println("strings") }
fun process(list: List<Int>) { println("ints") }  // 编译错误：platform declaration clash
```

**解决方案**：用 `@JvmName` 区分。

```kotlin
@JvmName("processStrings")
fun process(list: List<String>) { println("strings") }

@JvmName("processInts")
fun process(list: List<Int>) { println("ints") }
```

### 7.3 陷阱：`is` 检查无法获取泛型类型

```kotlin
// 错误：无法检查泛型类型
fun isStringList(list: Any): Boolean {
    return list is List<String>  // 编译错误：cannot check for instance of erased type
}
```

**解决方案**：用 `reified` 或反射。

```kotlin
// 方案1：reified
inline fun <reified T> isListOf(list: Any): Boolean {
    return list is List<*> && list.all { it is T }
}

// 方案2：反射（不推荐，性能差）
fun isStringList(list: Any): Boolean {
    if (list !is List<*>) return false
    return list.all { it is String }
}
```

### 7.4 陷阱：星投影的读写限制

```kotlin
class Container<T>(var value: T)

fun main() {
    val c: Container<*> = Container("hello")
    val v: Any? = c.value  // 读取得到 Any?，OK
    // c.value = "world"  // 编译错误：不能写入
}
```

**最佳实践**：需要写入时，使用具体类型或逆变投影 `Container<in String>`。

### 7.5 陷阱：`reified` 只能在 inline 函数中使用

```kotlin
// 错误：reified 不能在普通函数中使用
// fun <reified T> foo() { ... }  // 编译错误：reified type parameter not allowed in non-inline function

// 正确：reified 必须配合 inline
inline fun <reified T> foo() { println(T::class) }
```

**最佳实践**：需要运行时类型信息时，用 `inline` + `reified`，但注意字节码膨胀。

### 7.6 陷阱：协变类型的继承

```kotlin
// 错误：继承协变类时，子类不能消费 T
open class Producer<out T> {
    open fun produce(): T = TODO()
}

class BadProducer<T>(private var value: T) : Producer<T>() {
    override fun produce(): T = value
    fun consume(item: T) { value = item }  // 编译错误：T 在 in 位置（继承协变类）
}
```

**最佳实践**：继承协变类时，子类也必须遵守协变约束。

### 7.7 陷阱：逆变类型的产出

```kotlin
// 错误：逆变类不能产出 T
interface Consumer<in T> {
    fun consume(item: T)
    fun produce(): T  // 编译错误：T 在 out 位置
}
```

**最佳实践**：如果需要同时产出 T，改为不变或拆分为两个接口。

### 7.8 陷阱：递归类型约束的复杂性

```kotlin
// 递归类型约束：T : Comparable<T>
class NaturalNumber(val value: Int) : Comparable<NaturalNumber> {
    override fun compareTo(other: NaturalNumber): Int = value.compareTo(other.value)
}

// 复杂：自引用类型约束
class Tree<T : Tree<T>>(val children: List<T>)  // 递归约束，难以理解
```

**最佳实践**：递归类型约束应谨慎使用，确保文档清晰。

### 7.9 陷阱：平台类型与泛型

```kotlin
// Java 互操作：平台类型
val list: MutableList<String> = java.util.ArrayList()  // 平台类型 String!
list.add("hello")
list.add(null as String?)  // 运行时可能 NPE
```

**最佳实践**：从 Java 接收的泛型集合，应显式标注可空性。

### 7.10 陷阱：协变与 in/out 投影的混淆

```kotlin
// 混淆：declaration-site 与 use-site
class Producer<out T> { fun produce(): T = TODO() }

fun main() {
    val p: Producer<out String> = Producer<String>()  // 多余：declaration-site 已协变
}
```

**最佳实践**：declaration-site 已声明型变时，无需 use-site 投影。

### 7.11 陷阱：泛型数组的协变

```kotlin
// Kotlin 数组：不变
val strings: Array<String> = arrayOf("a", "b")
// val anys: Array<Any> = strings  // 编译错误：Array 不变

// 但 Java 数组协变，可能导致 ArrayStoreException
// Java: Object[] arr = new String[10]; arr[0] = 1;  // ArrayStoreException
```

**最佳实践**：Kotlin 数组不变，避免 Java 的 ArrayStoreException。

### 7.12 陷阱：`*` 投影的方法调用限制

```kotlin
class Container<T>(var value: T) {
    fun set(v: T) { value = v }
    fun get(): T = value
}

fun main() {
    val c: Container<*> = Container("hello")
    val v: Any? = c.get()  // OK
    // c.set("world")  // 编译错误：不能调用带 T 参数的方法
}
```

**最佳实践**：`*` 投影限制写操作，需要写操作时用具体类型。

### 7.13 陷阱：型变与反射

```kotlin
// 反射无法获取泛型类型参数
val list = listOf("a", "b")
val cls: KClass<out List<*>> = list::class
// cls 无法获取 <String>，因为类型擦除
```

**最佳实践**：需要运行时泛型类型信息时，用 `reified` 或显式传递 `KClass`。

### 7.14 陷阱：泛型函数的默认参数

```kotlin
// 错误：默认参数中无法引用 T
fun <T> create(default: T = T()) {  // 编译错误：T() 无法实例化
    TODO()
}
```

**最佳实践**：用工厂函数或 `reified`。

```kotlin
inline fun <reified T> create(factory: () -> T = { T::class.java.newInstance() }): T {
    return factory()
}
```

### 7.15 陷阱：型变与扩展函数

```kotlin
// 错误：扩展函数中误用型变
fun <T> List<T>.firstOrDefault(default: T): T =
    if (isEmpty()) default else first()

// 正确：协变 List 中 T 只在 out 位置，default 也是 T，OK
```

**最佳实践**：扩展函数的型变由接收类型决定，无需额外声明。

---

## 8. 工程实践

### 8.1 设计协变集合 API

```kotlin
// 协变只读集合
interface ReadOnlyCollection<out E> {
    val size: Int
    operator fun get(index: Int): E
    fun iterator(): Iterator<E>
}

// 不变可变集合
interface MutableCollection<E> : ReadOnlyCollection<E> {
    fun add(element: E): Boolean
    fun remove(element: E): Boolean
}

// 使用协变
fun <E> ReadOnlyCollection<E>.toList(): List<E> = toList()

val strings: ReadOnlyCollection<String> = ...
val anys: ReadOnlyCollection<Any> = strings  // 协变
```

### 8.2 设计逆变事件处理器

```kotlin
// 逆变事件处理器
interface EventListener<in E : Event> {
    fun onEvent(event: E)
}

abstract class Event
class ClickEvent(val x: Int, val y: Int) : Event()
class KeyPressEvent(val key: Char) : Event()

// 通用事件监听器
class UniversalEventListener : EventListener<Event> {
    override fun onEvent(event: Event) {
        println("Received: $event")
    }
}

// 逆变：UniversalEventListener 可作为 EventListener<ClickEvent>
val listener: EventListener<ClickEvent> = UniversalEventListener()
listener.onEvent(ClickEvent(100, 200))
```

### 8.3 实现 reified JSON 解析器

```kotlin
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper

private val mapper = jacksonObjectMapper()

// reified JSON 解析
inline fun <reified T> String.parseJson(): T = mapper.readValue(this, T::class.java)

// reified JSON 序列化
fun <T> T.toJson(): String = mapper.writeValueAsString(this)

// reified 类型过滤
inline fun <reified T : Any> List<Any?>.filterByType(): List<T> = filterIsInstance<T>()

// 使用
data class User(val name: String, val age: Int)

val json = """{"name":"Alice","age":30}"""
val user: User = json.parseJson()
println(user)  // User(name=Alice, age=30)

val users = listOf(User("A", 1), "hello", User("B", 2), 42)
val onlyUsers: List<User> = users.filterByType()
```

### 8.4 设计类型安全的 Repository

```kotlin
// 抽象实体
abstract class Entity<T : Entity<T>>(val id: String) {
    abstract fun merge(other: T): T
}

// 协变结果密封类
sealed class RepositoryResult<out T> {
    data class Success<T>(val entity: T) : RepositoryResult<T>()
    data class Failure(val error: String) : RepositoryResult<Nothing>()
    object NotFound : RepositoryResult<Nothing>()
}

// 泛型 Repository
abstract class Repository<T : Entity<T>> {
    private val storage = mutableMapOf<String, T>()

    fun save(entity: T): RepositoryResult<T> {
        storage[entity.id] = entity
        return RepositoryResult.Success(entity)
    }

    fun findById(id: String): RepositoryResult<T> {
        return storage[id]?.let { RepositoryResult.Success(it) } ?: RepositoryResult.NotFound
    }

    fun update(id: String, transform: (T) -> T): RepositoryResult<T> {
        val current = storage[id] ?: return RepositoryResult.NotFound
        val updated = transform(current)
        storage[id] = updated
        return RepositoryResult.Success(updated)
    }
}

// 具体实体
class User(id: String, val name: String, val email: String) : Entity<User>(id) {
    override fun merge(other: User): User = User(id, other.name, other.email)
}

class UserRepository : Repository<User>()

// 使用
val repo = UserRepository()
repo.save(User("1", "Alice", "alice@example.com"))
when (val result = repo.findById("1")) {
    is RepositoryResult.Success -> println("Found: ${result.entity}")
    is RepositoryResult.Failure -> println("Error: ${result.error}")
    RepositoryResult.NotFound -> println("Not found")
}
```

### 8.5 设计协变 Either 类型

```kotlin
// 协变 Either 类型（函数式错误处理）
sealed class Either<out L, out R> {
    data class Left<out L>(val value: L) : Either<L, Nothing>()
    data class Right<out R>(val value: R) : Either<Nothing, R>()
}

fun <L, R, R2> Either<L, R>.map(f: (R) -> R2): Either<L, R2> = when (this) {
    is Either.Left -> Either.Left(value)
    is Either.Right -> Either.Right(f(value))
}

fun <L, R, L2> Either<L, R>.mapLeft(f: (L) -> L2): Either<L2, R> = when (this) {
    is Either.Left -> Either.Left(f(value))
    is Either.Right -> Either.Right(value)
}

fun <L, R, R2> Either<L, R>.flatMap(f: (R) -> Either<L, R2>): Either<L, R2> = when (this) {
    is Either.Left -> Either.Left(value)
    is Either.Right -> f(value)
}

// 使用
fun parseAge(s: String): Either<String, Int> =
    if (s.matches(Regex("\\d+"))) Either.Right(s.toInt())
    else Either.Left("Invalid age: $s")

fun validateAge(age: Int): Either<String, Int> =
    if (age in 0..150) Either.Right(age)
    else Either.Left("Age out of range: $age")

fun processAge(s: String): Either<String, Int> =
    parseAge(s).flatMap { validateAge(it) }

when (val result = processAge("25")) {
    is Either.Left -> println("Error: ${result.value}")
    is Either.Right -> println("Valid age: ${result.value}")
}
```

### 8.6 设计类型安全的 ORM 模型

```kotlin
// 类型安全的列定义
class Column<T>(val name: String, val type: KClass<T>)

// 类型安全的表定义
abstract class Table<T : Entity<T>> {
    abstract val name: String
    abstract val columns: List<Column<*>>

    inline fun <reified C : Any> column(name: String): Column<C> = Column(name, C::class)
}

// 具体 User 表
class UserTable : Table<User>() {
    override val name = "users"
    val id = column<String>("id")
    val name = column<String>("name")
    val email = column<String>("email")
    override val columns = listOf(id, name, email)
}

// 类型安全的查询构建器
class QueryBuilder<T : Entity<T>>(private val table: Table<T>) {
    private val conditions = mutableListOf<String>()

    fun where(condition: String): QueryBuilder<T> {
        conditions.add(condition)
        return this
    }

    fun build(): String {
        val whereClause = if (conditions.isEmpty()) "" else " WHERE ${conditions.joinToString(" AND ")}"
        return "SELECT * FROM ${table.name}$whereClause"
    }
}

// 使用
val userTable = UserTable()
val query = QueryBuilder(userTable)
    .where("name = 'Alice'")
    .where("age > 18")
    .build()
println(query)  // SELECT * FROM users WHERE name = 'Alice' AND age > 18
```

### 8.7 设计协变 Result 与异常处理

```kotlin
// 协变 Result 类型
sealed class Result<out T> {
    data class Success<out T>(val value: T) : Result<T>()
    data class Failure(val error: Throwable) : Result<Nothing>()

    inline fun <R> map(f: (T) -> R): Result<R> = when (this) {
        is Success -> Success(f(value))
        is Failure -> this
    }

    inline fun <R> flatMap(f: (T) -> Result<R>): Result<R> = when (this) {
        is Success -> f(value)
        is Failure -> this
    }

    inline fun getOrElse(default: () -> T): T = when (this) {
        is Success -> value
        is Failure -> default()
    }
}

inline fun <T> runCatching(block: () -> T): Result<T> = try {
    Result.Success(block())
} catch (e: Throwable) {
    Result.Failure(e)
}

// 使用
fun fetchUser(id: String): Result<User> = runCatching {
    httpClient.get("/users/$id").body()
}

fun processUser(id: String): Result<String> =
    fetchUser(id)
        .map { it.name }
        .map { "Hello, $it!" }

when (val result = processUser("1")) {
    is Result.Success -> println(result.value)
    is Result.Failure -> println("Error: ${result.error.message}")
}
```

### 8.8 设计类型安全的依赖注入

```kotlin
// 类型安全的 DI 容器
class DIContainer {
    private val instances = mutableMapOf<KClass<*>, Any>()

    inline fun <reified T : Any> bind(instance: T) {
        instances[T::class] = instance
    }

    inline fun <reified T : Any> get(): T {
        return instances[T::class] as? T
            ?: throw IllegalStateException("No binding for ${T::class}")
    }

    inline fun <reified T : Any> getOrNull(): T? {
        return instances[T::class] as? T
    }
}

// 使用
val container = DIContainer()
container.bind(UserRepository())
container.bind(AuthService())

val userRepo: UserRepository = container.get()
val auth: AuthService = container.get()
```

### 8.9 设计逆变日志适配器

```kotlin
// 逆变日志适配器
interface Logger<in T> {
    fun log(item: T): String
}

// 通用日志适配器（接受 Any）
class AnyLogger : Logger<Any> {
    override fun log(item: Any): String = "[INFO] ${item.toString()}"
}

// 由于逆变，AnyLogger 可作为 Logger<User>
data class User(val name: String, val age: Int)

val userLogger: Logger<User> = AnyLogger()
println(userLogger.log(User("Alice", 30)))  // [INFO] User(name=Alice, age=30)
```

### 8.10 设计类型安全的路由 DSL

```kotlin
// 类型安全的 HTTP 路由 DSL
class RouteBuilder {
    private val routes = mutableListOf<Route>()

    inline fun <reified Req : Any, reified Res : Any> get(
        path: String,
        noinline handler: (Req) -> Res
    ) {
        routes.add(Route(path, "GET", Req::class, Res::class, handler))
    }

    inline fun <reified Req : Any, reified Res : Any> post(
        path: String,
        noinline handler: (Req) -> Res
    ) {
        routes.add(Route(path, "POST", Req::class, Res::class, handler))
    }

    fun build(): List<Route> = routes.toList()
}

data class Route(
    val path: String,
    val method: String,
    val requestType: KClass<*>,
    val responseType: KClass<*>,
    val handler: (Any) -> Any
)

// 使用
data class CreateUserRequest(val name: String, val email: String)
data class UserResponse(val id: String, val name: String)

val routes = RouteBuilder().apply {
    get<EmptyBody, UserResponse>("/users") { EmptyBody ->
        UserResponse("1", "Alice")
    }
    post<CreateUserRequest, UserResponse>("/users") { req ->
        UserResponse("2", req.name)
    }
}.build()

object EmptyBody
```

---

## 9. 案例研究

### 9.1 案例一：Kotlin 标准库的 `List<out E>` 设计

Kotlin 标准库的 `List` 接口采用 declaration-site 协变：

```kotlin
// 标准库简化版
interface List<out E> : Collection<E> {
    operator fun get(index: Int): E
    fun indexOf(element: @UnsafeVariance E): Int
    fun subList(fromIndex: Int, toIndex: Int): List<E>
}

interface MutableList<E> : List<E>, MutableCollection<E> {
    override fun add(element: E): Boolean
    override fun remove(element: E): Boolean
    operator fun set(index: Int, element: E): E
}
```

设计要点：

1. `List<out E>` 协变，让 `List<String>` 是 `List<Any>` 的子类型。
2. `indexOf(element: @UnsafeVariance E)` 用 `@UnsafeVariance` 绕过型变检查（因为 `indexOf` 实际不修改列表）。
3. `MutableList<E>` 不变，因为它同时读写 E。

**为什么 `indexOf` 用 `@UnsafeVariance`**：

`indexOf(element: E)` 接受 E 类型参数，这在逆变位置。如果 List 协变，这会违反型变约束。但实际上 `indexOf` 只是查询，不修改列表，所以是安全的。`@UnsafeVariance` 告诉编译器"我知道这看起来不安全，但实际上是安全的"。

### 9.2 案例二：Jetpack Compose 的 `StateFlow<out T>`

Jetpack Compose 的 `StateFlow` 是协变的：

```kotlin
// 简化版
interface StateFlow<out T> : Flow<T> {
    val value: T
}

interface MutableStateFlow<T> : StateFlow<T> {
    override var value: T
    fun compareAndSet(expect: T, update: T): Boolean
}
```

设计要点：

1. `StateFlow<out T>` 协变，让 `StateFlow<String>` 是 `StateFlow<Any>` 的子类型。
2. `MutableStateFlow<T>` 不变，因为它同时读写 T。
3. 这让 ViewModel 可以暴露 `StateFlow<User>`（只读），内部用 `MutableStateFlow<User>`（可写）。

### 9.3 案例三：Arrow 库的 `Either<out L, out R>`

Arrow 库（Kotlin 函数式编程库）的 `Either` 是双重协变的：

```kotlin
sealed class Either<out A, out B> {
    data class Left<out A>(val value: A) : Either<A, Nothing>()
    data class Right<out B>(val value: B) : Either<Nothing, B>()
}
```

设计要点：

1. `Either<out A, out B>` 双重协变，让 `Either<Nothing, R>` 是 `Either<L, R>` 的子类型（任意 L）。
2. `Left<A>` 是 `Either<A, Nothing>`，因为 Left 不持有 B（用 `Nothing` 占位）。
3. 这让 `Left<String>("error")` 可以作为 `Either<String, Int>` 使用。

### 9.4 案例四：Retrofit 的 reified API

Retrofit 的 `@GET` 与 `@POST` 方法可以配合 `reified` 实现类型安全的 HTTP 客户端：

```kotlin
interface ApiService {
    @GET("users/{id}")
    suspend fun getUser(@Path("id") id: String): Response<User>

    @POST("users")
    suspend fun createUser(@Body user: CreateUserRequest): Response<UserResponse>
}

// 类型安全的调用
suspend inline fun <reified T : Any> ApiService.get(path: String): T {
    val response = getRawResponse(path)
    return response.parse<T>()
}

inline fun <reified T : Any> String.parse(): T =
    jacksonMapper.readValue(this, T::class.java)
```

### 9.5 案例五：Spring Framework 的 Kotlin 扩展

Spring Framework 5.0+ 提供了 Kotlin 扩展，利用泛型与 `reified` 简化 API：

```kotlin
// Spring 的 reified bean 获取
inline fun <reified T : Any> ApplicationContext.getBean(): T = getBean(T::class.java)

// Spring Data 的 reified repository
inline fun <reified T : Any, ID> CrudRepository<T, ID>.findById(id: ID): T? {
    return findById(id, T::class.java)
}

// 使用
val user: User = applicationContext.getBean()
```

### 9.6 案例六：Kotlin Coroutines 的 `Deferred<out T>`

Kotlin Coroutines 的 `Deferred` 接口是协变的：

```kotlin
interface Deferred<out T> : Job {
    suspend fun await(): T
}

// 这让 Deferred<String> 可以作为 Deferred<Any> 使用
suspend fun <T> List<Deferred<T>>.awaitAll(): List<T> = map { it.await() }

// 使用
val deferred1: Deferred<String> = async { "hello" }
val deferred2: Deferred<Int> = async { 42 }
val results = listOf(defer1, deferred2)  // List<Deferred<Any>>
```

### 9.7 案例七：Kotlinx Serialization 的泛型

Kotlinx Serialization 利用泛型实现类型安全的序列化：

```kotlin
@Serializable
data class User(val name: String, val age: Int)

// 泛型序列化
inline fun <reified T> String.decode(): T = Json.decodeFromString(this)

// 使用
val json = """{"name":"Alice","age":30}"""
val user: User = json.decode<User>()
```

### 9.8 案例八：KMP 的 expect/actual 泛型

Kotlin Multiplatform 中的 `expect`/`actual` 可以声明泛型：

```kotlin
// commonMain
expect class AtomicRef<T> {
    fun get(): T
    fun set(value: T)
    fun compareAndSet(expect: T, update: T): Boolean
}

// jvmMain
actual class AtomicRef<T> {
    private val ref = java.util.concurrent.atomic.AtomicReference<T>()
    actual fun get(): T = ref.get()
    actual fun set(value: T) { ref.set(value) }
    actual fun compareAndSet(expect: T, update: T): Boolean = ref.compareAndSet(expect, update)
}

// jsMain
actual class AtomicRef<T> {
    private var value: T? = null
    actual fun get(): T = value!!
    actual fun set(value: T) { this.value = value }
    actual fun compareAndSet(expect: T, update: T): Boolean {
        if (value != expect) return false
        value = update
        return true
    }
}
```

### 9.9 案例九：协变密封类构建有限状态机

```kotlin
// 协变密封类表示状态机
sealed class State<out T> {
    object Idle : State<Nothing>()
    object Loading : State<Nothing>()
    data class Success<T>(val data: T) : State<T>()
    data class Error(val message: String) : State<Nothing>()
}

class StateMachine<T>(private var state: State<T> = State.Idle) {
    fun transition(newState: State<T>) {
        state = newState
    }

    fun <R> map(f: (T) -> R): State<R> = when (val s = state) {
        State.Idle -> State.Idle
        State.Loading -> State.Loading
        is State.Success -> State.Success(f(s.data))
        is State.Error -> s
    }
}

// 使用
val machine = StateMachine<String>()
machine.transition(State.Loading)
machine.transition(State.Success("hello"))

when (val s = machine.map { it.length }) {
    is State.Success -> println("Length: ${s.data}")  // Length: 5
    else -> {}
}
```

### 9.10 案例十：ArrowFx 的 Resource 管理

Arrow 库的 `Resource` 类型利用泛型管理资源生命周期：

```kotlin
class Resource<out A> private constructor(
    private val acquire: () -> A,
    private val release: (A) -> Unit
) {
    fun <B> use(f: (A) -> B): B {
        val a = acquire()
        try {
            return f(a)
        } finally {
            release(a)
        }
    }

    companion object {
        fun <A> fromAutoCloseable(acquire: () -> A): Resource<A> where A : AutoCloseable =
            Resource(acquire) { it.close() }
    }
}

// 使用
val fileResource = Resource.fromAutoCloseable { FileInputStream("file.txt") }
val content = fileResource.use { it.readBytes() }
```

---

## 10. 习题

### 10.1 基础题

**题目 1**：判断以下代码是否能编译，并解释原因。

```kotlin
class Container<T>(var value: T)
val c: Container<Any> = Container<String>("hello")
```

**答案**：不能编译。`Container` 是不变的（默认），即使 `String` 是 `Any` 的子类型，`Container<String>` 也不是 `Container<Any>` 的子类型。

**题目 2**：以下代码输出什么？

```kotlin
val list: List<Any> = listOf("a", "b", "c")
println(list.first()::class)
```

**答案**：输出 `class kotlin.String`。`List<out E>` 协变，`listOf("a", "b", "c")` 返回 `List<String>`，可以赋给 `List<Any>`。但运行时元素类型仍是 `String`。

### 10.2 型变题

**题目 3**：为以下接口选择正确的型变修饰符，并说明理由。

```kotlin
interface Producer<T> { fun produce(): T }
interface Consumer<T> { fun consume(item: T) }
interface Container<T> { fun get(): T; fun set(v: T) }
```

**答案**：

```kotlin
interface Producer<out T> { fun produce(): T }  // 协变：T 只在 out 位置
interface Consumer<in T> { fun consume(item: T) }  // 逆变：T 只在 in 位置
interface Container<T> { fun get(): T; fun set(v: T) }  // 不变：T 同时在 in 和 out 位置
```

**题目 4**：以下代码是否能编译？

```kotlin
class Box<out T>(var value: T)  // 注意 var
```

**答案**：不能编译。`var value: T` 让 T 在 in 位置（setter），与 `out T` 矛盾。应改为 `val` 或去掉 `out`。

### 10.3 星投影题

**题目 5**：以下代码输出什么？

```kotlin
val list: List<*> = listOf(1, "two", 3.0)
list.forEach { println(it::class) }
```

**答案**：输出 `class kotlin.Int`、`class kotlin.String`、`class kotlin.Double`。`List<*>` 只是类型未知，元素的实际类型不变。

**题目 6**：以下代码是否能编译？

```kotlin
val list: MutableList<*> = mutableListOf(1, 2, 3)
list.add(4)
```

**答案**：不能编译。`MutableList<*>` 是星投影，不能写入元素（除了 `null`，但 Kotlin 不允许 `add(null)` 在 `MutableList<*>` 上）。

### 10.4 reified 题

**题目 7**：为什么以下代码不能编译？

```kotlin
fun <reified T> foo() = T::class
```

**答案**：`reified` 只能在 `inline` 函数中使用。应改为 `inline fun <reified T> foo() = T::class`。

**题目 8**：实现一个 `filterByType` 函数，从列表中筛选指定类型的元素。

**答案**：

```kotlin
inline fun <reified T : Any> List<Any?>.filterByType(): List<T> = filterIsInstance<T>()

// 使用
val list = listOf(1, "two", 3, "four")
val ints: List<Int> = list.filterByType()  // [1, 3]
val strings: List<String> = list.filterByType()  // ["two", "four"]
```

### 10.5 综合题

**题目 9**：设计一个类型安全的 `Cache<K, V>` 类，要求：

- `K` 必须是 `Hashable`（即 `Any`，因为有 `hashCode`/`equals`）。
- `V` 是协变的（`out V`）。
- 提供 `get(key: K): V?` 方法。
- 不提供 `put` 方法（因为协变不能写）。

**答案**：

```kotlin
interface Cache<in K : Any, out V> {
    fun get(key: K): V?
}

class MutableCache<K : Any, V> : Cache<K, V> {
    private val map = mutableMapOf<K, V>()

    override fun get(key: K): V? = map[key]

    fun put(key: K, value: V) {
        map[key] = value
    }
}

// 使用
val cache: Cache<String, Any> = MutableCache<String, String>().apply {
    put("a", "hello")
}
val v: Any? = cache.get("a")  // hello
```

**题目 10**：解释为什么 `Array<String>` 不能赋给 `Array<Any>`，而 `List<String>` 可以赋给 `List<Any>`。

**答案**：

- `Array` 在 Kotlin 中是可变的（`Array<T>` 有 `set(index, value: T)`），所以必须不变。如果允许协变，则可以通过 `Array<Any>` 写入非 String 元素，导致 `ArrayStoreException`（Java 的问题）。
- `List` 在 Kotlin 中是只读的（`List<out E>` 协变），没有 `set` 方法，所以可以安全协变。
- `MutableList` 是可变的，所以不变。

---

## 11. 参考文献

### 11.1 学术论文

1. Cardelli, L., & Wegner, P. (1985). "On Understanding Types, Data Abstraction, and Polymorphism." *ACM Computing Surveys*, 17(4), 471-523.
2. Liskov, B. H., & Wing, J. M. (1994). "A Behavioral Notion of Subtyping." *ACM Transactions on Programming Languages and Systems*, 16(6), 1811-1841.
3. Igarashi, A., Pierce, B. C., & Wadler, P. (2001). "Featherweight Java: A Minimal Core Calculus for Java and GJ." *ACM Transactions on Programming Languages and Systems*, 23(3), 396-450.
4. Torgersen, M., Ernst, E., Hansen, C. P., von der Ahé, P., Bracha, G., & Gafter, N. (2004). "Adding Wildcards to the Java Programming Language." *Journal of Object Technology*, 3(11), 97-116.
5. Tate, R., Lepiller, A., & Huang, M. (2010). "Java Wildcards Are Hard." *Proceedings of the 9th International Conference on Generative Programming and Component Engineering*.

### 11.2 官方文档

6. JetBrains. (2024). "Kotlin Generics." *Kotlin Documentation*. https://kotlinlang.org/docs/generics.html
7. JetBrains. (2024). "Variance." *Kotlin Documentation*. https://kotlinlang.org/docs/generics.html#variance
8. JetBrains. (2024). "Type Projections." *Kotlin Documentation*. https://kotlinlang.org/docs/generics.html#type-projections
9. JetBrains. (2024). "Reified Type Parameters." *Kotlin Documentation*. https://kotlinlang.org/docs/inline-functions.html#reified-type-parameters
10. JetBrains. (2024). "Generic Constraint." *Kotlin Documentation*. https://kotlinlang.org/docs/generics.html#generic-constraints
11. Oracle. (2024). "Java Generics." *Java Documentation*. https://docs.oracle.com/javase/tutorial/java/generics/

### 11.3 经典教材

12. Eckel, B. (2006). *Thinking in Java* (4th ed.). Prentice Hall. （Java 泛型章节）
13. Bloch, J. (2018). *Effective Java* (3rd ed.). Addison-Wesley. （Item 28-33: Generics）
14. Naftalin, M., & Wadler, P. (2006). *Java Generics and Collections*. O'Reilly Media.
15. Odersky, M., Spoon, L., & Venners, B. (2019). *Programming in Scala* (5th ed.). Artima Press. （Variance 章节）
16. Pierce, B. C. (2002). *Types and Programming Languages*. MIT Press.
17. Cline, M. (2019). *Kotlin in Action* (2nd ed.). Manning Publications.

### 11.4 在线资源

18. Kotlin Playground. https://play.kotlinlang.org/
19. Kotlin by Example: Generics. https://play.kotlinlang.org/byExample/01_introduction/05_Functions
20. KotlinConf talks on type system. https://kotlinconf.com/
21. Arrow library documentation. https://arrow-kt.io/
22. Kotlin Standard Library source code. https://github.com/JetBrains/kotlin/tree/master/libraries/stdlib

---

## 12. 延伸阅读

### 12.1 高级类型理论

- **Higher-Kinded Types (HKT)**：Kotlin 不支持 HKT（如 `F[_>`），但可通过接口模拟。参考 Arrow 库的 `Kind<F, A>` 实现。
- **Dependent Types**：依赖类型（如 `Vec(n)` 表示长度为 n 的向量），Kotlin 不支持。
- **Refinement Types**：精化类型（如 `Int { it > 0 }`），Kotlin 不支持，但可通过契约部分实现。
- **Intersection Types**：交集类型，Kotlin 通过 `where T : A, T : B` 模拟。
- **Union Types**：联合类型，Kotlin 不支持，但可通过密封类模拟。

### 12.2 Kotlin 类型系统的演进

- **K2 编译器**：FIR 与 IR 的分离，让类型推断更准确、更快速。
- **Builder Inference**：在构建器模式中推断类型参数。
- **Context Receivers**（实验）：让函数依赖上下文，模拟 typeclass。
- **Contract DSL**：让编译器知道函数行为，改进类型推断。

### 12.3 与其他语言的对比

- **Scala**：支持 HKT、隐式参数、更强大的类型系统，但学习曲线陡峭。
- **Rust**：单态化（monomorphization）替代类型擦除，性能更好但代码膨胀。
- **C#**：CLR 实化泛型，运行时有类型信息。
- **TypeScript**：结构类型系统，支持条件类型、映射类型等高级特性。
- **Haskell**：完全的 H-M 类型系统，支持 HKT、typeclass、更高阶的多态。

### 12.4 工程实践深入

- **Kotlin Coroutines 中的泛型**：`Flow<out T>`、`Channel<T>`、`StateFlow<out T>` 等。
- **Jetpack Compose 中的泛型**：`@Composable` 函数的泛型约束、`MutableState<T>` 等。
- **Spring Framework 中的 Kotlin 泛型**：`CoroutineCrudRepository<T, ID>`、`reified` 扩展等。
- **Arrow 库**：`Either<out L, out R>`、`Validated<out E, out A>`、`Option<out A>` 等函数式类型。
- **Kotlinx Serialization**：`KSerializer<T>`、`@Serializable`、泛型序列化等。

### 12.5 形式化验证

- **Kotline 类型系统的健全性证明**：参考 Igarashi 等人的 Featherweight Java，扩展至 Kotlin。
- **型变安全性的形式化**：基于 Cardelli & Wegner 的型变理论。
- **类型擦除的语义**：参考 Java 的类型擦除形式化，扩展至 Kotlin。

### 12.6 未来方向

- **Kotlin 2.x 的类型系统改进**：Context Receivers、Builder Inference 的进一步完善。
- **Value class 与泛型结合**：`value class UserId<T>` 等类型安全的 ID 类型。
- **KMP 中的泛型一致性**：跨平台的泛型行为统一。
- **类型推断的进一步改进**：基于 ML 的类型推断，更准确更快速。

---

## 附录 A：Kotlin 类型参数位置速查表

| 位置                  | 语法                                | 说明                                     |
| --------------------- | ----------------------------------- | ---------------------------------------- |
| 类声明                | `class C<T>`                        | 类型参数在类声明处                       |
| 函数声明              | `fun <T> f(x: T): T`                | 类型参数在函数声明处                     |
| 属性声明              | `val <T> x: T`                      | 类型参数在属性声明处                     |
| 类型别名              | `typealias L<T> = List<T>`          | 类型参数在别名声明处                     |
| 扩展函数              | `fun <T> List<T>.foo()`             | 类型参数在扩展函数声明处                 |
| Lambda 参数           | `(T) -> R`                          | 函数类型中的类型参数                     |
| 上界约束              | `<T : Bound>`                       | T 必须是 Bound 的子类型                  |
| 多重约束              | `where T : A, T : B`                | T 必须同时满足 A 与 B                    |
| 协变                  | `class C<out T>`                    | T 只在 out 位置                          |
| 逆变                  | `class C<in T>`                     | T 只在 in 位置                           |
| 星投影                | `C<*>`                              | 未知类型参数                             |
| use-site 协变投影     | `C<out T>`                          | 临时协变投影                             |
| use-site 逆变投影     | `C<in T>`                           | 临时逆变投影                             |
| reified               | `inline fun <reified T> f()`        | 内联函数中保留类型信息                   |
| 不可空约束            | `<T : Any>`                         | T 必须非空                               |

## 附录 B：型变安全条件速查表

| declaration-site | use-site | 读取元素类型    | 写入元素类型    | 适用场景                     |
| ---------------- | -------- | --------------- | ---------------- | ---------------------------- |
| `out T` (协变)   | `out T`  | `T`             | 不允许           | 只读容器                     |
| `in T` (逆变)    | `in T`   | 不允许          | `T`              | 只写消费者                   |
| `T` (不变)       | `*`      | `Any?`          | 不允许（除 null）| 未知类型只读访问            |
| `T` (不变)       | `out T`  | `T`             | 不允许           | 临时协变投影                 |
| `T` (不变)       | `in T`   | 不允许          | `T`              | 临时逆变投影                 |
| `T` (不变)       | `T`      | `T`             | `T`              | 可变容器                     |

## 附录 C：型变检查规则速查表

| declaration-site | T 出现在 out 位置 | T 出现在 in 位置 | T 出现在不变位置 | 结论                         |
| ---------------- | ----------------- | ---------------- | ----------------- | ---------------------------- |
| `out T`          | 允许              | 编译错误         | 编译错误          | 协变：T 只能产出             |
| `in T`           | 编译错误          | 允许             | 编译错误          | 逆变：T 只能消费             |
| `T` (不变)       | 允许              | 允许             | 允许              | 不变：T 可读可写             |

## 附录 D：类型擦除规则速查表

| 源码类型              | JVM 字节码类型         | 说明                              |
| --------------------- | ---------------------- | --------------------------------- |
| `List<String>`        | `List`                 | 类型参数 `<String>` 擦除          |
| `List<Int>`           | `List`                 | 类型参数 `<Int>` 擦除             |
| `Map<String, Int>`    | `Map`                  | `<String, Int>` 擦除              |
| `Repository<User>`    | `Repository`           | `<User>` 擦除                     |
| `Repository<T : Entity>` | `Repository<Entity>` | T 擦除为上界 Entity               |
| `Pair<String, Int>`   | `Pair`                 | `<String, Int>` 擦除              |
| `Function0<String>`   | `Function0`            | `<String>` 擦除                   |

## 附录 E：reified 限制速查表

| 场景                                | 是否支持 reified | 说明                                 |
| ----------------------------------- | ---------------- | ------------------------------------ |
| `inline fun`                        | 支持             | 唯一支持 reified 的位置              |
| 普通函数                            | 不支持           | 非内联函数无法内联展开                |
| 类                                  | 不支持           | 类的泛型参数不能 reified             |
| 属性                                | 不支持           | 属性的泛型参数不能 reified           |
| 属性类型                            | 不支持           | 不能声明 `val x: reified T`         |
| 作为类型参数传递                    | 部分支持         | 只能传递给另一个 reified 参数        |
| `is T` 检查                         | 支持             | 可通过 `value is T` 检查类型        |
| `T::class`                          | 支持             | 可获取运行时类                       |
| `Array<T>`                          | 支持             | 可创建 `arrayOf<T>()`               |

---

## 总结

本文档系统讲解了 Kotlin 类型系统的核心机制：

1. **泛型（Generics）**：类型参数化的基础，支持类、函数、属性的泛型声明。
2. **型变（Variance）**：协变（`out`）、逆变（`in`）、不变（默认）三种形式，以及 declaration-site 与 use-site variance 的区别。
3. **星投影（Star Projection, `*`）**：表示"未知类型参数"，在不同型变下语义不同。
4. **类型擦除（Type Erasure）**：JVM 平台的运行时类型信息缺失，以及 `reified` 的弥补方案。
5. **类型参数约束（Bounds）**：上界约束、多重约束（`where` 子句）、不可空约束。
6. **型变安全条件**：协变要求 T 只在 out 位置，逆变要求 T 只在 in 位置。
7. **对比分析**：与 Java、Scala、C#、TypeScript、Rust 的泛型对比。
8. **工程实践**：协变集合 API、逆变事件处理器、reified JSON 解析器、类型安全 Repository、协变 Either 等。

通过掌握这些概念，开发者能够设计类型安全、可维护、可扩展的 Kotlin 泛型 API，并在 Android、KMP、Spring 等工程实践中应用类型系统理论。

完成本文学习后，建议继续学习：

- [密封类与密封接口](./密封类与密封接口.md)：与协变结合的代数数据类型。
- [空安全详解](./空安全详解.md)：与类型系统结合的空安全机制。
- [协程基础](./协程基础.md)：协程中的泛型（`Deferred<out T>`、`Flow<out T>`）。
- [委托属性](./委托属性.md)：泛型属性委托。
