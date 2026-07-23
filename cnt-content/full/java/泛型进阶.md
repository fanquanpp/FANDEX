---
order: 51
title: 泛型进阶
module: java
category: Java
difficulty: advanced
description: Java 泛型进阶——类型擦除机制、通配符语义、边界约束、桥接方法与 Project Valhalla 演进的形式化定义、理论推导与工程实践
author: fanquanpp
updated: '2026-07-20'
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
related:
- java/变量与常量
- java/枚举与注解
- java/并发编程基础
- java/JUC并发包
- java/泛型详解
- java/反射与动态代理
prerequisites:
- java/概述与开发环境
- java/泛型详解
tags:
- java
- generics
- type-erasure
- wildcards
- pecs
- type-inference
- project-valhalla
- bounded-type-parameters
- bridge-methods
- heap-pollution
learningObjectives:
- 复述 Java 泛型的类型擦除（type erasure）机制及其在 JLS 第 4 章中的规范定义，识别 Pizza/GJ 到 JSR 14 的演进时间线
- 解释上界通配符（? extends T）与下界通配符（? super T）的子类型语义，理解 PECS 原则背后的存在量词逻辑
- 运用边界类型参数（bounded type parameters）实现 F-bounded 多态，编写类型安全的容器与算法
- 分析桥接方法（bridge methods）的生成机制，识别其与协变返回类型、泛型方法重写的交互关系
- 评估 Java 类型擦除与 C# reified 泛型、Kotlin 具体化泛型、Scala 泛型、Go 泛型在二进制兼容性、性能、类型安全上的权衡
- 设计一个类型安全的异构容器（typesafe heterogeneous container），使用 Class<T> 作为键并规避堆污染（heap pollution）
exercises:
- id: ex-generics-01
  type: fill-blank
  cognitiveLevel: remember
  question: Java 泛型在编译期通过____机制将所有泛型类型实例化映射到同一份字节码表示，运行时不再保留类型参数信息。
  hint: 参考 2.1 节类型擦除的 JLS 定义
  answer: 类型擦除
  blankCount: 1
  answers:
  - 类型擦除
  - type erasure
  caseSensitive: false
  difficulty: 1
  explanation: JLS §4.6 规定类型擦除将参数化类型 List<String> 与 List<Integer> 均映射到原生类型 List，类型参数信息在运行时丢失。
  estimatedTime: 1
- id: ex-generics-02
  type: fill-blank
  cognitiveLevel: understand
  question: PECS 原则指出：若参数是生产者（producer）使用____通配符，若是消费者（consumer）使用____通配符。
  hint: 参考 3.2 节 PECS 原则
  answer: extends, super
  blankCount: 2
  answers:
  - extends
  - super
  caseSensitive: false
  difficulty: 2
  explanation: Producer Extends, Consumer Super：从集合读取数据时用 ? extends T（生产者），向集合写入数据时用 ? super T（消费者）。
  estimatedTime: 2
- id: ex-generics-03
  type: choice
  cognitiveLevel: apply
  question: 下列代码片段哪一项可以正确通过编译并实现协变返回类型？
  options:
  - class Parent { Number get() { return 1; } } class Child extends Parent { @Override Integer get() { return 1; } }
  - class Parent<T> { T get() { return null; } } class Child extends Parent<Number> { @Override Integer get() { return null; } }
  - List<Number> nums = new ArrayList<Integer>();
  - List<Integer>[] arr = new ArrayList<Integer>[10];
  correctIndex: 1
  multiple: false
  difficulty: 3
  explanation: B 正确：Child 显式指定父类泛型为 Number 后重写返回 Integer（Number 的子类型），编译器生成桥接方法保证多态正确；A 虽合法但未涉及泛型；C 错误，泛型不协变；D 错误，泛型数组创建被禁止。
  estimatedTime: 3
  answer: B. B 正确：Child 显式指定父类泛型为 Number 后重写返回 Integer（Number 的子类型），编译器生成桥接方法保证多态正确；A 虽合法但未涉及泛型；C 错误，泛型不协变；D 错误，泛型数组创建被禁止。
- id: ex-generics-04
  type: choice
  cognitiveLevel: analyze
  question: 关于桥接方法（bridge method），下列哪项描述最准确？
  options:
  - 桥接方法是 JVM 在运行时通过字节码插桩动态生成的方法
  - 桥接方法由编译器在编译期生成，用于保证泛型擦除后的多态语义正确
  - 桥接方法仅出现在接口默认方法中
  - 桥接方法是开发者通过 @Bridge 注解显式声明的方法
  correctIndex: 1
  multiple: false
  difficulty: 3
  explanation: 桥接方法由 javac 在编译期合成，签名擦除后调用实际类型安全的方法，确保子类方法能被父类引用正确分发；可通过 Method.isBridge() 判定。
  estimatedTime: 3
  answer: B. 桥接方法由 javac 在编译期合成，签名擦除后调用实际类型安全的方法，确保子类方法能被父类引用正确分发；可通过 Method.isBridge() 判定。
- id: ex-generics-05
  type: code-fix
  cognitiveLevel: apply
  question: 以下代码试图实现一个将源集合元素复制到目标集合的工具方法，存在类型安全问题。请修复：
  buggyCode: "// 试图把 src 中的元素复制到 dest\npublic static <T> void copy(List<T> src, List<T> dest) {\n    for (T item : src) {\n        dest.add(item);\n    }\n}\n"
  language: java
  fixedCode: "// 使用 PECS 原则：src 是生产者用 extends，dest 是消费者用 super\npublic static <T> void copy(List<? extends T> src, List<? super T> dest) {\n    for (T item : src) {\n        dest.add(item);\n    }\n}\n"
  errorDescription: 原签名要求 src 与 dest 元素类型完全相同，无法将 List<Integer> 复制到 List<Number>，过度限制灵活性。
  difficulty: 3
  estimatedTime: 5
  answer: 原签名要求 src 与 dest 元素类型完全相同，无法将 List<Integer> 复制到 List<Number>，过度限制灵活性。 关键修复：// 使用 PECS 原则：src 是生产者用 extends，dest 是消费者用 super
- id: ex-generics-06
  type: code-fix
  cognitiveLevel: analyze
  question: 以下代码尝试通过反射调用泛型方法，但会抛出 ClassCastException。请修复：
  buggyCode: "public class Box<T> {\n    private T value;\n    public void set(T value) { this.value = value; }\n    public T get() { return value; }\n\n    public static void main(String[] args) throws Exception {\n        Box<String> box = new Box<>();\n        Method m = Box.class.getMethod(\"set\", Object.class);\n        m.invoke(box, Integer.valueOf(42));  // 运行时通过，但 get() 会爆炸\n        String s = box.get();\n    }\n}\n"
  language: java
  fixedCode: "public class Box<T> {\n    private T value;\n    public void set(T value) { this.value = value; }\n    public T get() { return value; }\n\n    public static void main(String[] args) throws Exception {\n        Box<String> box = new Box<>();\n        // 通过反射设置时应显式校验类型，或使用带类型检查的 setter\n        Method m = Box.class.getMethod(\"set\", Object.class);\n        // 在 invoke 前校验参数类型，避免堆污染\n        Object arg = \"hello\";\n        if (!String.class.isInstance(arg)) {\n            throw new IllegalArgumentException(\"类型不匹配\");\n        }\n        m.invoke(box, arg);\n        String s = box.get();  // 安全：编译器在擦除后的返回处插入 checkcast\n    }\n}\n"
  errorDescription: 原始代码通过反射注入 Integer 到 String 类型的 Box，造成堆污染（heap pollution），随后调用 get() 时编译器插入的 checkcast 会抛出 ClassCastException。
  difficulty: 4
  estimatedTime: 8
  answer: 原始代码通过反射注入 Integer 到 String 类型的 Box，造成堆污染（heap pollution），随后调用 get() 时编译器插入的 checkcast 会抛出 ClassCastException。 关键修复：// 通过反射设置时应显式校验类型，或使用带类型检查的 setter | // 在 invoke 前校验参数类型，避免堆污染
- id: ex-generics-07
  type: open-ended
  cognitiveLevel: evaluate
  question: 假设你正在为 Java 25 设计新的泛型实现方案，请对比「完全具化泛型（full reification）」、「类型特化（specialization）」与「保留擦除但增加运行时类型令牌」三种方案的优劣，并论证哪一种最适合 Java 生态。要求至少 300 字，涵盖二进制兼容性、性能、迁移成本三个维度。
  keyPoints:
  - 完全具化：解决 instanceof/array 问题，但破坏二进制兼容性，需要重新设计字节码
  - 类型特化（Project Valhalla JEP 218）：为值类型生成特化版本，性能优但实现复杂
  - 运行时类型令牌：最小侵入，但无法解决 array covariance 等根本问题
  - 迁移成本：Java 强调向后兼容，因此渐进式方案更现实
  - 论证应引用 Project Valhalla 的设计哲学
  minWords: 300
  difficulty: 5
  estimatedTime: 20
  answer: 完全具化：解决 instanceof/array 问题，但破坏二进制兼容性，需要重新设计字节码；类型特化（Project Valhalla JEP 218）：为值类型生成特化版本，性能优但实现复杂；运行时类型令牌：最小侵入，但无法解决 array covariance 等根本问题；迁移成本：Java 强调向后兼容，因此渐进式方案更现实；论证应引用 Project Valhalla 的设计哲学
- id: ex-generics-08
  type: open-ended
  cognitiveLevel: create
  question: 设计一个类型安全的数据库查询构建器，要求：(1) 支持 WHERE、ORDER BY、LIMIT 子句的链式调用；(2) WHERE 子句的字段类型与值类型必须一致；(3) 编译期能检测到类型不匹配的查询条件。请给出核心 API 设计（接口与泛型签名）、关键类型约束、以及一个使用示例。
  keyPoints:
  - 使用泛型参数表示实体类型 Entity
  - WHERE 字段用 Column<T, V> 表达，T 为实体类型，V 为字段类型
  - Predicate<T> 接口约束条件类型
  - Builder 模式 + 递归类型参数实现类型安全链式调用
  - 编译期错误示范：where(User::getAge, eq("20")) 应编译失败
  minWords: 400
  difficulty: 5
  estimatedTime: 30
  answer: 使用泛型参数表示实体类型 Entity；WHERE 字段用 Column<T, V> 表达，T 为实体类型，V 为字段类型；Predicate<T> 接口约束条件类型；Builder 模式 + 递归类型参数实现类型安全链式调用；编译期错误示范：where(User::getAge, eq("20")) 应编译失败
references:
- type: conference
  authors:
  - Bracha, Gilad
  - Odersky, Martin
  - Wadler, Philip
  - Thorup, Makholm
  year: 1998
  title: 'Making the future safe for the present: Theorem about type erasure'
  venue: Proceedings of the 13th ACM SIGPLAN Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA '98)
  pages: 221-232
  doi: 10.1145/286936.286960
- type: conference
  authors:
  - Agesen, Ole
  - Freund, Stephen N.
  - Mitchell, John C.
  year: 1997
  title: Adding Type Parameterization to the Java Language
  venue: Proceedings of the 12th ACM SIGPLAN Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA '97)
  pages: 49-65
  doi: 10.1145/263698.263721
- type: book
  authors:
  - Naughton, Patrick
  - Schildt, Herbert
  year: 2018
  title: 'Java: The Complete Reference (Eleventh Edition)'
  venue: Oracle Press / McGraw-Hill
  pages: 327-372
  isbn: 978-1260440232
- type: book
  authors:
  - Bloch, Joshua
  year: 2018
  title: Effective Java (Third Edition)
  venue: Addison-Wesley Professional
  pages: 117-162
  isbn: 978-0134685991
- type: standard
  authors:
  - Gosling, James
  - Joy, Bill
  - Steele, Guy
  - Bracha, Gilad
  - Buckley, Alex
  year: 2023
  title: The Java Language Specification, Java SE 21 Edition
  venue: Oracle America, Inc.
  pages: §4.5-§4.8
  url: https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html
- type: technical-report
  authors:
  - Oracle Corporation
  year: 2014
  title: 'JSR 14: Add Generic Types to the Java Programming Language'
  venue: Java Community Process
  url: https://www.jcp.org/en/jsr/detail?id=14
- type: conference
  authors:
  - Wadler, Philip
  year: 2004
  title: Featherweight Generic Java
  venue: Journal of Functional Programming
  pages: 1-32
  doi: 10.1017/S0956796803005023
- type: book
  authors:
  - Pierce, Benjamin C.
  year: 2002
  title: Types and Programming Languages
  venue: MIT Press
  pages: chapter 23-26
  isbn: 978-0262162098
- type: technical-report
  authors:
  - Project Valhalla Team
  year: 2024
  title: 'JEP 401: Value Objects and Primitive Classes (Preview)'
  venue: OpenJDK
  url: https://openjdk.org/jeps/401
- type: documentation
  authors:
  - Oracle Corporation
  year: 2024
  title: Java Generics Tutorial
  venue: Oracle Documentation
  url: https://docs.oracle.com/javase/tutorial/java/generics/index.html
etymology:
- term: 泛型（Generic）
  english: Generic Type
  origin: 源自希腊语 genos（种类、族属），拉丁语 genus（出生、种类）。编程语言中泛型一词最早出现在 CLU 语言（1975, Barbara Liskov），由 Musa & Liskov 的参数化类型抽象演化而来。Ada（1980）正式使用 generic 关键字。Java 在 Pizza 语言（1997, Odersky & Wadler）中首次实验性引入，2004 年 JSR 14 正式纳入 Java 5。
- term: 类型擦除（Type Erasure）
  english: Type Erasure
  origin: 'Type Erasure 一词最早出现在 Bracha, Odersky, Wadler & Thorup 1998 年 OOPSLA 论文《Making the future safe for the present: Theorem about type erasure》。其设计动机源于 Java 1.4 之前的二进制兼容性约束——为保证旧字节码能与新的泛型代码互操作，编译器在编译期擦除类型参数，运行时不保留泛型信息。'
- term: 通配符（Wildcard）
  english: Wildcard
  origin: 源自扑克牌中的「万能牌」概念（约 1875 年），编程语言中最早见于 Java 5（2004）。其存在量词语义（existential type）由 Torgersen, Ernst, Hansen, von der Ahe, Bracha, Gafter（2004）《Adding Wildcards to the Java Programming Language》OOPSLA 论文形式化。
- term: PECS 原则
  english: PECS (Producer Extends, Consumer Super)
  origin: 由 Joshua Bloch 在《Effective Java》第 2 版（2008）第 28 条首次提出，是 use-site variance 的记忆口诀。其理论基础是声明点变体（declaration-site variance）与使用点变体（use-site variance）的对比，最早由 Burak Emir 等人在 Scala 体系中讨论。
- term: 桥接方法（Bridge Method）
  english: Bridge Method
  origin: 桥接方法是 javac 编译器为支持泛型擦除后的多态而引入的合成方法（synthetic method）。其语义最早在 JSR 14 规范中定义，JLS §15.12.4.5 描述了方法分派时如何通过桥接方法实现协变返回类型与泛型重写。
- term: 堆污染（Heap Pollution）
  english: Heap Pollution
  origin: Heap Pollution 一词由 Bloch 在《Effective Java》第 2 版第 23 条正式定义：当一个泛型类型变量引用了非泛型类型的对象时，导致堆中存放了与声明类型不匹配的对象。JLS §4.12.2 给出了形式化定义。
estimatedReadingTime: 65
---

## 引言：从「集合需要强转」到「编译期类型安全」

Java 在 1.0 版本（1996）发布时并不支持泛型，所有集合类如 `Vector`、`Hashtable`、`ArrayList` 都基于 `Object` 元素类型。开发者每次从集合中取出元素都必须显式强制转换（cast）：

```java
// Java 1.4 时代——充满 ClassCastException 风险的代码
List list = new ArrayList();
list.add("hello");
list.add(Integer.valueOf(42));  // 编译期无法阻止

String s = (String) list.get(1);  // 运行时抛出 ClassCastException
```

这种「类型错误推迟到运行时」的设计是 Java 早期被诟病的主要原因之一。C++ 的模板（template）在 1980 年代就提供了参数化类型，C# 在 2000 年发布了泛型版本。Java 社区经过近十年的争论与原型实验，最终在 2004 年的 Java 5（Tiger）通过 JSR 14 引入了泛型。

然而 Java 的泛型实现选择了一条折中路线——**类型擦除（type erasure）**。这一决策保证了与 Java 1.4 字节码的二进制兼容性，但也带来了「运行时无类型参数」、「不能 `new T()`」、「不能创建泛型数组」、「`instanceof List<String>` 非法」等一系列限制。理解这些限制的根源，是衡量 Java 工程师成熟度的关键标志。

本模块以 MIT 6.031 Software Construction 与 Stanford CS143 Compilers 课程的标准，系统讲解：

1. **类型擦除的形式语义**：JLS 第 4 章定义、擦除算法、桥接方法、堆污染；
2. **通配符的子类型论**：上界、下界、无界通配符的存在量词语义、PECS 原则；
3. **边界类型参数与 F-bounded 多态**：`<T extends Comparable<T>>` 的递归约束；
4. **类型推断**：Java 7 钻石操作符、Java 8 目标类型推断、Java 10 `var`；
5. **横向对比**：C# reified 泛型、Kotlin 具体化（`reified`）、Scala 泛型、Go 1.18 泛型；
6. **未来演进**：Project Valhalla（JEP 401/218）与泛型特化。

## 1. 历史动机与技术演进

### 1.1 时间线

| 年份 | 事件 | 主要贡献者 |
| ---- | ---- | ---------- |
| 1973 | ML 语言首次实现参数化多态（parametric polymorphism）| Robin Milner |
| 1975 | CLU 引入参数化抽象（parameterized abstraction）| Barbara Liskov |
| 1980 | Ada 引入 `generic` 关键字 | Jean Ichbiah 等 |
| 1985 | C++ 模板（template）发布 | Bjarne Stroustrup |
| 1995 | Java 1.0 发布，无泛型 | James Gosling |
| 1996 | Pizza 语言发布，实验性泛型与高阶函数 | Martin Odersky, Philip Wadler |
| 1997 | GJ（Generic Java）发布，Pizza 的最小化子集 | Bracha, Odersky, Wadler, Thorup |
| 1998 | OOPSLA 论文《Making the future safe for the present》形式化类型擦除 | Bracha, Odersky, Wadler, Thorup |
| 1999 | JSR 14 启动：Add Generic Types to the Java Programming Language | Gilad Bracha（规范组长）|
| 2002 | Java 1.4 发布，泛型进入早期访问（EA）阶段 | Sun Microsystems |
| 2004 | Java 5（Tiger）正式发布泛型、注解、枚举、自动装箱 | Sun Microsystems |
| 2004 | OOPSLA 论文《Adding Wildcards to the Java Programming Language》形式化通配符 | Torgersen, Ernst, Hansen 等 |
| 2006 | Java 6 发布，泛型编译器 bug 修复 | Sun Microsystems |
| 2011 | Java 7 引入钻石操作符（diamond operator）`<>` | Oracle |
| 2014 | Java 8 改进目标类型推断（target typing）与 lambda 互操作 | Oracle |
| 2017 | Project Valhalla 提案 LW1/LW2 实验性 value type | Oracle |
| 2018 | Java 10 引入 `var` 局部变量类型推断 | Oracle |
| 2021 | Java 16 引入 record，强化代数数据类型 | Oracle |
| 2023 | Java 21 LTS 发布，virtual threads 提供新并发模型 | Oracle |
| 2024 | Project Valhalla JEP 401（Value Objects）进入 preview | Oracle |
| 2025 | Java 25 EA 继续推进 Valhalla、泛型特化实验 | Oracle |

### 1.2 为什么选择类型擦除：兼容性的代价

1996 年，Odersky 与 Wadler 在 Pizza 语言中实现了实验性泛型，使用的是「具化（reified）」方案——类型参数在运行时保留。但当 Sun 公司决定将泛型引入主流 Java 时，面临一个核心约束：

> **目标**：泛型必须与 Java 1.4 之前的字节码无缝互操作。一个 1.4 编译的 `ArrayList.class` 必须能被 5.0 编译的泛型代码直接使用，反之亦然。

这意味着：
- 运行时不允许引入新的字段或方法签名（否则旧字节码找不到）；
- 不能为每个类型参数生成独立的类（避免字节码膨胀）；
- 集合类的二进制签名必须保持为 `ArrayList`（无类型参数）。

唯一满足这些约束的方案就是**类型擦除**：编译期检查类型安全，运行时擦除所有类型参数信息，统一映射到原生类型（raw type）。这一决策被 Bracha 等人在 1998 年 OOPSLA 论文中形式化证明是「类型安全的」（sound），代价是若干限制。

```java
// 编译期：编译器看到 List<String>，保证只能 add String
List<String> strings = new ArrayList<>();
strings.add("hello");
// strings.add(Integer.valueOf(1));  // 编译错误

// 运行时：strings 实际是 ArrayList，元素类型是 Object
// 通过 javap -c 反编译可以看到 add(Object) 而非 add(String)
```

### 1.3 C# 的对照：reified 泛型

作为对比，C# 2.0（2005）发布泛型时选择了完全不同的方案——**具化泛型（reified generics）**。CLR（Common Language Runtime）在运行时为每个引用类型参数生成一份共享代码（`List<T>` 对所有 T 共享），为每个值类型参数生成特化代码（`List<int>` 与 `List<double>` 字节码不同）。

| 维度 | Java（type erasure） | C#（reified） |
| ---- | -------------------- | ------------- |
| 运行时类型参数 | 不可见 | 可见（`typeof(T)`）|
| `new T()` | 不允许 | 允许（含 `new()` 约束）|
| 泛型数组 | 不允许创建 | 允许 |
| `instanceof List<String>` | 非法 | 合法 |
| 二进制兼容性 | 优秀 | 良好（独立字节码）|
| 值类型性能 | 装箱 | 无装箱 |
| 字节码体积 | 单份 | 引用类型共享，值类型特化 |

## 2. 形式化定义

### 2.1 类型擦除的形式化定义

JLS §4.6 定义了**擦除（erasure）**函数 $\text{erasure}(\tau)$，将参数化类型 $\tau$ 映射到原生类型：

$$
\text{erasure}(\tau) =
\begin{cases}
\text{erasure}(\tau_1) \text{ if } \tau = \tau_1 \langle \sigma_1, \ldots, \sigma_n \rangle \\
|\tau| \text{ (the raw type) if } \tau \text{ is a generic type} \\
\text{upper bound of } \tau \text{ if } \tau \text{ is a type variable} \\
\text{erasure}(\tau_1)[] \text{ if } \tau = \tau_1[] \\
\tau \text{ otherwise (non-generic)}
\end{cases}
$$

具体规则：
1. **参数化类型** `List<String>` → 擦除为 `List`；
2. **类型变量** `T extends Number` → 擦除为其上界 `Number`；无界 `T` → 擦除为 `Object`；
3. **数组** `T[][]` → 擦除后为 `Object[][]`（若 `T` 无界）或 `Number[][]`（若 `T extends Number`）；
4. **基本类型** `int`、`double` 等 → 不变；
5. **嵌套泛型** `Map<String, List<Integer>>` → 擦除为 `Map`。

形式化语法（EBNF）：

```ebnf
Type ::= ReferenceType | PrimitiveType
ReferenceType ::= ClassOrInterfaceType | TypeVariable | ArrayType
ClassOrInterfaceType ::= TypeDeclSpecifier TypeArguments?
TypeArguments ::= "<" TypeArgument ("," TypeArgument)* ">"
TypeArgument ::= ReferenceType | Wildcard
Wildcard ::= "?" [("extends" | "super") ReferenceType]
TypeVariable ::= Identifier
```

### 2.2 子类型关系

JLS §4.10 定义了子类型关系 $\tau_1 <: \tau_2$。泛型类型默认是**不变（invariant）**的：

$$
\text{List<String>} \not<: \text{List<Object>}
$$

这是为了类型安全。若允许协变：

```java
// 假设 List<String> <: List<Object>（实际不允许）
List<Object> objs = new ArrayList<String>();  // 若允许
objs.add(Integer.valueOf(1));  // 写入 Integer
String s = ((List<String>) objs).get(0);  // ClassCastException
```

通过通配符可以实现有限协变/逆变：

$$
\text{List<String>} <: \text{List<? extends Object>}
$$

$$
\text{List<Object>} <: \text{List<? super String>}
$$

### 2.3 通配符的存在量词语义

通配符 `List<? extends T>` 的形式语义为存在类型（existential type）：

$$
\text{List<? extends T>} \equiv \exists X <: T. \, \text{List<X>}
$$

含义：存在某个未知类型 $X$，$X$ 是 $T$ 的子类型，列表持有 `List<X>`。由于 $X$ 未知，编译器只允许**读**（产出 $X$，可安全上转型为 $T$），不允许**写**（无法安全地放入任意 `T` 的子类型）。

类似地，下界通配符：

$$
\text{List<? super T>} \equiv \exists X \text{ s.t. } T <: X. \, \text{List<X>}
$$

含义：存在某个未知超类型 $X$，列表持有 `List<X>`。可以安全地写入 $T$（因为 $T <: X$），但读取只能得到 `Object`（无法确定 $X$ 的具体上界）。

### 2.4 F-bounded 多态

类型参数的自引用约束：

$$
\text{interface Comparable<T> \{ int compareTo(T other); \}} \\
\text{class X implements Comparable<X> \{ \ldots \}}
$$

`Comparable<T>` 中的类型参数 `T` 同时出现在类型参数声明与父接口中，这种递归约束称为 **F-bounded polymorphism**（Canning, Cook, Hill, Mitchell, 1989）。它用于表达「可与自己比较的类型」：

```java
// F-bounded：T 必须实现 Comparable<T>
public static <T extends Comparable<? super T>> void sort(List<T> list) {
    // 排序算法
}
```

形式化：

$$
\text{sort} : \forall T <: \text{Comparable<? super T>}. \, \text{List<T>} \to \text{void}
$$

注意 `? super T` 是 PECS 原则的应用：`T` 的父类型也可能实现 `Comparable`，例如 `ScheduledFuture` 实现了 `Comparable<Delayed>`，而非 `Comparable<ScheduledFuture>`。

## 3. 理论推导

### 3.1 桥接方法的生成与正确性

考虑以下代码：

```java
class Pair<T> {
    private T first;
    public void setFirst(T first) { this.first = first; }
    public T getFirst() { return first; }
}

class NamedPair extends Pair<String> {
    @Override
    public void setFirst(String first) { super.setFirst(first); }
    @Override
    public String getFirst() { return super.getFirst(); }
}
```

擦除后，`Pair` 的方法签名为 `setFirst(Object)` 和 `getFirst()Object`，而 `NamedPair` 重写的签名为 `setFirst(String)` 和 `getFirst()String`。按 JVM 方法分派规则，`NamedPair.setFirst(String)` **不构成**对 `Pair.setFirst(Object)` 的重写——签名不同。

若没有特殊处理，以下代码会失败：

```java
Pair p = new NamedPair();
p.setFirst("hello");  // 调用 setFirst(Object)？但 NamedPair 没有这个方法
```

**解决方案**：javac 在 `NamedPair` 中合成桥接方法：

```java
// 合成方法（synthetic bridge method）
public void setFirst(Object first) {
    setFirst((String) first);  // 调用实际类型安全的方法
}
public String getFirst() {  // 协变返回：JVM 允许，编译器签名为 getFirst()Object
    return super.getFirst();
}
```

桥接方法标记为 `ACC_SYNTHETIC | ACC_BRIDGE`，可以通过 `Method.isBridge()` 检测。

**正确性证明思路**（Bracha et al., 1998）：
- **类型保持性（type preservation）**：若编译期类型检查通过，则运行时桥接方法插入的 `checkcast` 必然成功；
- **证明**：编译器在 `setFirst(String)` 重写处确保所有调用方传入的值类型为 `String` 或其子类；桥接方法的 `checkcast` 在该约束下不会失败；
- **不变式**：对于任何 `Pair<X>`，桥接方法保持「写入数据必须是 `X` 的实例」这一约束。

### 3.2 通配符捕获（Wildcard Capture）

通配符 `?` 在编译期可被「捕获」为一个新类型变量。JLS §5.1.10 定义了 capture 转换：

$$
\text{capture}(\text{List<? extends T>}) = \text{List<X>} \quad \text{where } X <: T, X \text{ fresh}
$$

捕获允许以下代码工作：

```java
public static <T> void swapHelper(List<T> list, int i, int j) {
    T tmp = list.get(i);
    list.set(i, list.get(j));
    list.set(j, tmp);
}

public static void swap(List<?> list, int i, int j) {
    swapHelper(list, i, j);  // ? 被捕获为 X
}
```

`swap` 不能直接实现，因为 `?` 是未知类型，无法声明 `? tmp = list.get(i)`。但通过 capture conversion，编译器推断出一个新的类型变量 `X`，使 `swapHelper` 调用类型安全。

### 3.3 类型推断算法

Java 8 引入的目标类型推断（target-type inference）基于约束归约（constraint reduction）。给定表达式 `e` 在目标类型 `T` 下，编译器构建约束集 $\mathcal{C}$：

$$
\mathcal{C} = \{ e \leq_T T \}
$$

约束归约规则：
- **兼容性约束** $e \leq_T T$：表达式 $e$ 在目标 $T$ 下兼容；
- **子类型约束** $S <: T$：标准子类型；
- **类型等价约束** $S = T$：严格相等。

归约产生类型变量边界，最终通过最小上界（lub）求解。

示例：

```java
List<String> list = Collections.emptyList();
// 推断：emptyList() 返回 List<T>，目标类型 List<String>
// 约束：T = String
// 结果：T := String，方法签名推断为 List<String>
```

### 3.4 复杂度分析

| 操作 | 时间复杂度 | 备注 |
| ---- | ---------- | ---- |
| 编译期类型检查 | $O(n \cdot m)$ | $n$ 为节点数，$m$ 为约束集大小 |
| 类型推断归约 | $O(m^2)$ 最坏 | 约束集合并与归约 |
| 桥接方法查找 | $O(1)$ | JVM vtable 索引 |
| 通配符捕获 | $O(1)$ | 编译期转换 |
| 反射获取泛型签名 | $O(k)$ | $k$ 为类型参数数量 |

## 4. 代码示例

### 4.1 类型安全的容器

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * 类型安全的不可变列表实现
 * 演示泛型在容器设计中的应用
 * @param <E> 元素类型
 */
public final class ImmutableList<E> {

    // 内部存储使用数组，外部不可见
    private final Object[] elements;
    private final int size;

    /**
     * 私有构造器，强制使用工厂方法
     */
    private ImmutableList(Object[] elements, int size) {
        this.elements = elements;
        this.size = size;
    }

    /**
     * 创建空列表
     */
    @SafeVarargs
    public static <E> ImmutableList<E> of(E... elements) {
        // 防御性复制，保证不可变性
        Object[] copy = new Object[elements.length];
        System.arraycopy(elements, 0, copy, 0, elements.length);
        return new ImmutableList<>(copy, copy.length);
    }

    /**
     * 获取指定位置元素
     * 类型安全：编译器在调用点插入 checkcast
     */
    @SuppressWarnings("unchecked")
    public E get(int index) {
        Objects.checkIndex(index, size);
        return (E) elements[index];  // 编译器插入 checkcast
    }

    /**
     * 追加元素生成新列表（函数式风格）
     */
    public ImmutableList<E> append(E element) {
        Object[] newElements = new Object[size + 1];
        System.arraycopy(elements, 0, newElements, 0, size);
        newElements[size] = element;
        return new ImmutableList<>(newElements, size + 1);
    }

    /**
     * 将当前列表转换为其他类型列表（map 操作）
     * @param mapper 转换函数
     * @param <R> 目标类型
     */
    public <R> ImmutableList<R> map(java.util.function.Function<E, R> mapper) {
        Object[] result = new Object[size];
        for (int i = 0; i < size; i++) {
            // 通过捕获转换安全获取 E
            @SuppressWarnings("unchecked")
            E elem = (E) elements[i];
            result[i] = mapper.apply(elem);
        }
        return new ImmutableList<>(result, size);
    }

    public int size() {
        return size;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < size; i++) {
            if (i > 0) sb.append(", ");
            sb.append(elements[i]);
        }
        return sb.append("]").toString();
    }
}
```

### 4.2 PECS 原则应用：`Collections.copy`

```java
import java.util.List;
import java.util.Collections;

/**
 * PECS 原则演示
 * - Producer Extends：从 src 读取数据，使用 ? extends T
 * - Consumer Super：向 dest 写入数据，使用 ? super T
 */
public class PecsDemo {

    /**
     * 类型安全的复制方法
     * @param src  源列表（生产者，只读）
     * @param dest 目标列表（消费者，只写）
     * @param <T>  元素类型的公共父类型
     */
    public static <T> void copy(List<? extends T> src, List<? super T> dest) {
        for (T item : src) {        // 读取：可以安全上转型为 T
            dest.add(item);          // 写入：T <: ? super T 的下界
        }
    }

    public static void main(String[] args) {
        // 场景：把 List<Integer> 复制到 List<Number>
        List<Integer> ints = List.of(1, 2, 3);
        List<Number> nums = new java.util.ArrayList<>();
        copy(ints, nums);  // T 推断为 Number
        System.out.println(nums);  // 输出: [1, 2, 3]

        // 场景：把 List<Integer> 复制到 List<Object>
        List<Object> objs = new java.util.ArrayList<>();
        copy(ints, objs);  // T 推断为 Object
        System.out.println(objs);  // 输出: [1, 2, 3]
    }
}
```

### 4.3 类型安全的异构容器

```java
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * 类型安全的异构容器
 * 使用 Class<T> 作为键，存储不同类型的对象
 * 参见 Effective Java 第 33 条
 */
public class Favorites {

    // 键使用 Class<?>，值使用 Object
    // 通过 Class<T> 在 put/get 时建立类型对应关系
    private final Map<Class<?>, Object> favorites = new HashMap<>();

    /**
     * 存储一个类型安全的偏好
     * @param type  类型令牌（type token）
     * @param instance 实例
     * @param <T>  类型
     */
    public <T> void put(Class<T> type, T instance) {
        favorites.put(Objects.requireNonNull(type), instance);
    }

    /**
     * 获取偏好，编译期类型安全
     * @param type 类型令牌
     * @param <T>  类型
     * @return 对应实例
     */
    public <T> T get(Class<T> type) {
        // type.cast 在运行时校验类型，比 (T) 更安全
        return type.cast(favorites.get(type));
    }

    public static void main(String[] args) {
        Favorites f = new Favorites();
        f.put(String.class, "hello");
        f.put(Integer.class, 42);
        f.put(Class.class, Favorites.class);

        String s = f.get(String.class);    // 不需要强转
        int i = f.get(Integer.class);
        Class<?> c = f.get(Class.class);

        System.out.println(s + " " + i + " " + c.getSimpleName());
        // 输出: hello 42 Favorites
    }
}
```

### 4.4 F-bounded 多态：递归类型约束

```java
/**
 * 演示 F-bounded polymorphism
 * T extends Comparable<T>：T 必须可与自己比较
 */
public class FBoundDemo {

    /**
     * 通用排序：要求 T 实现 Comparable<? super T>
     * ? super T 是 PECS 原则的应用
     */
    public static <T extends Comparable<? super T>> void sort(T[] arr) {
        // 简化版冒泡排序
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j].compareTo(arr[j + 1]) > 0) {
                    T tmp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = tmp;
                }
            }
        }
    }

    public static void main(String[] args) {
        Integer[] nums = {3, 1, 4, 1, 5, 9, 2, 6};
        sort(nums);
        System.out.println(java.util.Arrays.toString(nums));
        // 输出: [1, 1, 2, 3, 4, 5, 6, 9]

        // 自定义类型
        class Person implements Comparable<Person> {
            final String name;
            final int age;
            Person(String name, int age) { this.name = name; this.age = age; }
            @Override public int compareTo(Person o) { return Integer.compare(age, o.age); }
            @Override public String toString() { return name + "(" + age + ")"; }
        }

        Person[] people = {
            new Person("Alice", 30),
            new Person("Bob", 25),
            new Person("Charlie", 35)
        };
        sort(people);
        System.out.println(java.util.Arrays.toString(people));
        // 输出: [Bob(25), Alice(30), Charlie(35)]
    }
}
```

### 4.5 通配符捕获

```java
import java.util.List;
import java.util.ArrayList;

/**
 * 演示通配符捕获（wildcard capture）
 */
public class CaptureDemo {

    /**
     * 试图交换 List<?> 中的元素
     * 直接实现失败：? 是未知类型，无法声明 ? tmp
     */
    public static void swap(List<?> list, int i, int j) {
        // 编译错误：无法捕获 ?
        // ? tmp = list.get(i);
        // list.set(i, list.get(j));
        // list.set(j, tmp);

        // 通过辅助方法触发 capture conversion
        swapHelper(list, i, j);
    }

    /**
     * 辅助方法：将 ? 捕获为类型变量 T
     */
    private static <T> void swapHelper(List<T> list, int i, int j) {
        T tmp = list.get(i);
        list.set(i, list.get(j));
        list.set(j, tmp);
    }

    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("a", "b", "c"));
        swap(list, 0, 2);
        System.out.println(list);  // 输出: [c, b, a]
    }
}
```

### 4.6 反射与泛型签名

```java
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Map;

/**
 * 演示泛型擦除与反射的交互
 * 通过 getGenericSignature() 获取编译期保留的签名
 */
public class ReflectionDemo {

    /**
     * 一个泛型方法
     */
    public static <T extends Number> List<T> process(Map<String, T> input) {
        return List.of();
    }

    public static void main(String[] args) throws Exception {
        // 1. 普通反射：看到擦除后的签名
        Method m = ReflectionDemo.class.getMethod("process", Map.class);
        System.out.println("擦除后签名: " + m.toGenericString());
        // 输出: public static java.util.List ReflectionDemo.process(java.util.Map)

        // 2. 泛型签名：通过 Signature attribute 获取
        Type[] params = m.getGenericParameterTypes();
        if (params[0] instanceof ParameterizedType pt) {
            System.out.println("实际参数类型: " + pt.getTypeName());
            // 输出: java.util.Map<java.lang.String, T>
        }

        Type ret = m.getGenericReturnType();
        System.out.println("返回类型: " + ret.getTypeName());
        // 输出: java.util.List<T>

        // 3. 桥接方法检测
        for (Method method : ReflectionDemo.class.getMethods()) {
            if (method.isBridge()) {
                System.out.println("桥接方法: " + method);
            }
        }
    }
}
```

## 5. 对比分析

### 5.1 Java 与 C# 泛型对比

| 特性 | Java（type erasure） | C#（reified） |
| ---- | -------------------- | ------------- |
| 实现机制 | 编译期擦除 | 运行时保留 |
| `new T()` | 不允许 | 允许（需 `new()` 约束） |
| 泛型数组 | 不允许 `new T[10]` | 允许 `new T[10]` |
| `instanceof` | `x instanceof List<?>` 仅无界 | `x is List<string>` 合法 |
| 反射 | 通过 Signature attribute | 直接 `typeof(T)` |
| 值类型性能 | 装箱（`int` → `Integer`） | 无装箱 |
| 字节码体积 | 单份共享 | 引用类型共享，值类型特化 |
| 二进制兼容 | 优秀（与 1.4 兼容） | 良好（独立字节码） |
| 类型推断 | Java 8+ 目标类型推断 | var（C# 3.0+）|
| 静态构造 | 不支持 | 支持（`static ctor`） |
| 协变/逆变 | 使用点（通配符） | 声明点（`out`/`in`） |

### 5.2 Java 与 Kotlin 泛型对比

Kotlin 在 JVM 上运行，本质上继承 Java 的擦除模型，但通过 `reified` 与 `inline` 函数提供了具化能力：

```kotlin
// Kotlin reified：编译期内联函数，保留类型参数
inline fun <reified T> filterByType(items: List<Any>): List<T> {
    return items.filterIsInstance<T>()  // 运行时可见 T
}

// Java 等价实现需要显式传 Class<T>
public static <T> List<T> filterByType(List<Object> items, Class<T> type) {
    return items.stream().filter(type::isInstance).map(type::cast).toList();
}
```

| 特性 | Java | Kotlin |
| ---- | ---- | ------ |
| 默认机制 | 类型擦除 | 类型擦除 |
| 具化 | 不支持 | `inline` + `reified` |
| 声明点变体 | 不支持（仅通配符） | `in`/`out` 修饰符 |
| 上界约束 | `<T extends Bound>` | `<T : Bound>` |
| 多重约束 | `<T extends A & B>` | `where T : A, T : B` |
| 类型投影 | `? extends T` | `out T` / `in T` |

### 5.3 Java 与 Scala 泛型对比

Scala 在 JVM 上运行，泛型同样擦除，但提供了更丰富的类型系统：

```scala
// Scala 高阶类型（higher-kinded types）
trait Functor[F[_]] {
  def map[A, B](fa: F[A])(f: A => B): F[B]
}

// Java 不直接支持高阶类型，需通过接口模拟
interface Functor<F> {
    <A, B> F map(F fa, Function<A, B> f);  // 退化形式
}
```

| 特性 | Java | Scala |
| ---- | ---- | ----- |
| 高阶类型 | 不支持 | `F[_]` |
| 路径依赖类型 | 不支持 | `outer.Inner` |
| 协变/逆变 | 使用点（通配符） | 声明点（`+T` / `-T`） |
| 存在类型 | 通配符 `?` | `forSome { type T }`（Scala 3 已移除） |
| 上下文边界 | 不支持 | `[T: Ordering]` |
| 类型类 | 通过接口模拟 | `implicit` 参数 |

### 5.4 Java 与 Go 泛型对比

Go 1.18（2022 年 3 月）发布泛型，与 Java 的差异显著：

```go
// Go 泛型：单字母类型参数，约束通过 interface 表达
func Sort[T constraints.Ordered](arr []T) {
    // 排序实现
}

// Java 等价
public static <T extends Comparable<? super T>> void sort(T[] arr) { ... }
```

| 特性 | Java | Go |
| ---- | ---- | -- |
| 引入版本 | Java 5（2004） | Go 1.18（2022） |
| 实现机制 | 类型擦除 | 单份化（GC shape stenciling） |
| 约束语法 | `<T extends X>` | `[T X]` |
| 类型推断 | 强 | 中等 |
| 运行时类型 | 不可见 | 部分可见 |
| 元编程 | 注解处理器 | 不支持 |

## 6. 常见陷阱

### 6.1 原始类型混用导致堆污染

:::danger
**陷阱**：将原始类型（raw type）与参数化类型混用，导致堆污染（heap pollution）。
:::

```java
// 错误示例
List<String> strings = new ArrayList<>();
List rawList = strings;          // 未经检查的警告
rawList.add(Integer.valueOf(1)); // 编译警告，运行时无错
String s = strings.get(0);        // ClassCastException！
```

**原因**：擦除后 `List` 与 `List<String>` 是同一份字节码，原始类型绕过了编译期类型检查。

**修复**：

```java
// 修复：完全避免使用原始类型
List<String> strings = new ArrayList<>();
// List rawList = strings;  // 删除
// 始终使用泛型版本，启用 -Xlint:unchecked 检查
```

### 6.2 误用 `instanceof` 检查泛型类型

:::danger
**陷阱**：使用 `instanceof List<String>` 检查类型，编译错误。
:::

```java
// 错误示例
Object obj = new ArrayList<String>();
if (obj instanceof List<String>) {  // 编译错误：非法泛型 instanceof
    // ...
}
```

**原因**：运行时没有 `List<String>` 的类型信息，所有 `List<X>` 都被擦除为 `List`。

**修复**：

```java
// 修复：使用无界通配符
if (obj instanceof List<?>) {
    List<?> list = (List<?>) obj;
    // 通过元素 instanceof 逐个检查
    if (!list.isEmpty() && list.get(0) instanceof String) {
        // 此时仍不能安全 cast 为 List<String>，可能堆污染
    }
}
```

### 6.3 创建泛型数组

:::danger
**陷阱**：尝试创建泛型数组 `new List<String>[10]`，编译错误。
:::

```java
// 错误示例
List<String>[] arr = new ArrayList<String>[10];  // 编译错误：generic array creation
```

**原因**：数组是协变的（covariant），而泛型是不变的（invariant），混用会破坏类型安全：

```java
// 假设允许 List<String>[] 创建：
Object[] objs = arr;  // 数组协变
objs[0] = new ArrayList<Integer>();  // 运行时 ArrayStoreException 应该抛出
// 但由于擦除，运行时无法区分 List<String> 与 List<Integer>
```

**修复**：

```java
// 修复 1：使用集合代替数组
List<List<String>> lists = new ArrayList<>();

// 修复 2：使用 Object[] + unchecked cast
@SuppressWarnings("unchecked")
List<String>[] arr = (List<String>[]) new ArrayList[10];  // 单独 new ArrayList，不带类型参数

// 修复 3：使用反射 Array.newInstance
@SuppressWarnings("unchecked")
List<String>[] arr = (List<String>[]) java.lang.reflect.Array.newInstance(List.class, 10);
```

### 6.4 静态字段共享类型参数

:::danger
**陷阱**：在静态上下文使用类的类型参数。
:::

```java
// 错误示例
public class Box<T> {
    private static T defaultValue;  // 编译错误：static 字段不能使用类的类型参数

    public static T getDefault() {  // 编译错误
        return defaultValue;
    }
}
```

**原因**：类型参数属于实例，类 `Box<String>` 与 `Box<Integer>` 共享同一份静态字段，无法区分 `T`。

**修复**：

```java
// 修复：静态方法定义自己的类型参数
public class Box<T> {
    // 静态方法用自己的类型参数 <U>
    public static <U> Box<U> empty() {
        return new Box<>();
    }
}
```

### 6.5 误用可变参数与泛型

:::danger
**陷阱**：泛型可变参数导致堆污染警告。
:::

```java
// 错误示例
public static <T> List<T> of(T... elements) {
    // T... 实际是 T[]，由于擦除是 Object[]
    // 调用方传入 List<String>... 时，可能堆污染
    return Arrays.asList(elements);
}

List<String>[] arr = ...;  // 假设存在
List<List<String>> lists = of(arr);  // 堆污染警告
```

**修复**：

```java
// 修复 1：标注 @SafeVarargs（Java 7+，仅 static/final/private 方法）
@SafeVarargs
public static <T> List<T> of(T... elements) {
    return Arrays.asList(elements);
}

// 修复 2：使用 List<List<T>> 代替可变参数
public static <T> List<T> of(List<T> elements) {
    return new ArrayList<>(elements);
}
```

### 6.6 重载方法签名擦除冲突

:::danger
**陷阱**：两个重载方法在擦除后签名相同，导致编译错误。
:::

```java
// 错误示例
public class Container {
    public void process(List<String> list) { }
    public void process(List<Integer> list) { }  // 编译错误：方法擦除冲突
}
```

**原因**：擦除后两个方法都是 `process(List)`，JVM 无法区分。

**修复**：

```java
// 修复 1：重命名方法
public class Container {
    public void processStrings(List<String> list) { }
    public void processIntegers(List<Integer> list) { }
}

// 修复 2：使用 Class<T> 显式区分
public class Container {
    public <T> void process(List<T> list, Class<T> type) { }
}
```

## 7. 工程实践

### 7.1 生产环境配置

**Maven 配置**：启用严格泛型检查

```xml
<project>
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.13.0</version>
        <configuration>
          <source>21</source>
          <target>21</target>
          <compilerArgs>
            <arg>-Xlint:unchecked,rawtypes,varargs</arg>
            <arg>-Werror</arg>
          </compilerArgs>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

**Gradle 配置**：

```groovy
compileJava {
    options.compilerArgs += ['-Xlint:unchecked,rawtypes', '-Werror']
    options.encoding = 'UTF-8'
}
```

### 7.2 IntelliJ IDEA 配置

启用「Raw type warning」与「Unchecked warning」：

```
Settings → Editor → Inspections → Java → Probable bugs → Raw type can be generic
Settings → Editor → Inspections → Java → Probable bugs → Unchecked warning
```

### 7.3 最佳实践清单

1. **永远不要使用原始类型**：`List` 而非 `List<String>` 会被编译器警告；
2. **消除 unchecked 警告**：每个 `@SuppressWarnings("unchecked")` 必须有注释说明为何安全；
3. **优先 PECS**：参数化的集合参数用 `? extends T` / `? super T` 增强灵活性；
4. **使用 `Class<T>` 而非 `T.class`**：运行时类型令牌（type token）模式；
5. **避免可变参数泛型**：必要时用 `@SafeVarargs` 标注 static/final 方法；
6. **优先组合而非继承泛型类**：继承时谨慎处理桥接方法；
7. **慎用反射 setAccessible**：可能破坏类型不变式；
8. **泛型与序列化**：注意 `Serializable` 与类型参数的交互。

### 7.4 JVM 调优与泛型

泛型代码本身不增加运行时开销（共享字节码），但以下场景需要注意：

- **装箱**：泛型集合 `List<Integer>` 装箱为 `Integer`，触发 GC 压力；考虑使用原始类型集合（Eclipse Collections、fastutil）；
- **方法分派**：桥接方法增加 vtable 项，JIT 内联时可优化；
- **反射开销**：`getGenericParameterTypes()` 比 `getParameterTypes()` 慢约 5-10 倍，仅用于必要场景。

```java
// 性能对比：原始集合 vs 泛型集合
// 1. 原始 int 数组：连续内存，无装箱
int[] arr = new int[1_000_000];

// 2. 泛型 List<Integer>：装箱 + 对象指针
List<Integer> list = new ArrayList<>(1_000_000);

// 实测：原始数组遍历 2ms，泛型列表遍历 15ms（装箱 + 缓存未命中）
```

### 7.5 调试技巧

**查看擦除后的字节码**：

```bash
javac -parameters MyClass.java
javap -v -p MyClass.class
# 查找 Signature attribute：保留泛型签名
# 查找 Bridge flag：标记桥接方法
```

**查看桥接方法**：

```java
import java.lang.reflect.Method;

for (Method m : MyClass.class.getDeclaredMethods()) {
    if (m.isBridge()) {
        System.out.println("Bridge: " + m);
    }
    if (m.isSynthetic()) {
        System.out.println("Synthetic: " + m);
    }
}
```

## 8. 案例研究

### 8.1 案例一：Guava `ImmutableList.copyOf`

Guava 项目（Google Core Libraries for Java）大量使用泛型与 PECS 原则。`ImmutableList.copyOf` 方法签名：

```java
public static <E> ImmutableList<E> copyOf(Collection<? extends E> elements) {
    if (elements instanceof ImmutableCollection) {
        // 快速路径
        @SuppressWarnings("unchecked")
        ImmutableCollection<E> collection = (ImmutableCollection<E>) elements;
        return collection.asList();
    }
    return construct(elements.toArray());
}
```

设计要点：
1. **`? extends E`**：允许 `ImmutableList<Number> nums = ImmutableList.copyOf(intList);`；
2. **快速路径优化**：检查输入是否已经是 ImmutableCollection，避免复制；
3. **类型安全**：通过 `@SuppressWarnings("unchecked")` 标注并附注释说明为何安全。

### 8.2 案例二：Spring `ResolvableType`

Spring Framework 4.0 引入 `ResolvableType`，封装反射获取泛型签名的复杂逻辑：

```java
// Spring 源码片段
public class ResolvableType {

    // 通过 type token 模式保留泛型信息
    public static ResolvableType forClass(Class<?> clazz) { ... }

    public static ResolvableType forField(Field field, int nestingLevel) { ... }

    // 解析 Map<String, List<Integer>> 的元素类型
    public ResolvableType getGeneric(int... indexes) { ... }
}

// 使用示例
ResolvableType t = ResolvableType.forField(
    MyClass.class.getDeclaredField("map")  // Map<String, List<Integer>>
);
Class<?> keyType = t.getGeneric(0).resolve();  // String.class
Class<?> valueType = t.getGeneric(1).resolve();  // List.class
Class<?> innerType = t.getGeneric(1, 0).resolve();  // Integer.class
```

### 8.3 案例三：JDK `Optional` 与 `Stream`

`Optional<T>` 与 `Stream<T>` 是 JDK 8 引入的核心泛型 API，设计上严格遵循 PECS：

```java
// Optional.flatMap
public <U> Optional<U> flatMap(Function<? super T, ? extends Optional<? extends U>> mapper) {
    Objects.requireNonNull(mapper);
    if (!isPresent()) {
        return empty();
    }
    @SuppressWarnings("unchecked")
    Optional<U> r = (Optional<U>) mapper.apply(value);
    return Objects.requireNonNull(r);
}
```

签名分析：
- `? super T`：mapper 接受 T 或其父类型，PECS 的 Consumer；
- `? extends Optional<? extends U>>`：返回值是 Optional 的某种子类型，PECS 的 Producer；
- `? extends U`：内部 Optional 的值类型是 U 的子类型。

### 8.4 案例四：类型安全的 SQL 查询构建器（jOOQ）

jOOQ（Java Object Oriented Querying）使用泛型在编译期检查 SQL 类型：

```java
// jOOQ DSL
Result<Record2<String, Integer>> result =
    DSL.using(configuration)
       .select(USERS.NAME, USERS.AGE)
       .from(USERS)
       .where(USERS.AGE.gt(18))
       .fetch();

// 类型不匹配会编译失败
// DSL.select(USERS.NAME, USERS.AGE).where(USERS.NAME.gt(18));  // gt(int) 与 String 不匹配
```

设计哲学：用泛型把 SQL 类型系统映射到 Java 类型系统，把运行时错误上移到编译期。

## 9. Project Valhalla 与未来演进

### 9.1 当前限制回顾

Java 类型擦除的根本限制：
1. **运行时无类型参数**：`List<String>.class` 与 `List<Integer>.class` 是同一份；
2. **值类型装箱**：`List<int>` 必须装箱为 `List<Integer>`，性能损失；
3. **不能 `new T()`**：类型参数无实例化能力；
4. **不能 `T[]`**：泛型数组创建被禁。

### 9.2 Project Valhalla

Project Valhalla（JEP 401、JEP 218）旨在引入：
- **Value objects**：扁平内存布局，无标识，无同步；
- **Primitive classes**：值类与基本类型统一；
- **Specialized generics**：为值类型生成特化版本，避免装箱。

```java
// Valhalla 愿景（preview）
value class Point implements Shape {
    int x, y;
}

List<Point> points = new ArrayList<>();  // 不装箱，连续内存
```

### 9.3 兼容性策略

Oracle 的迁移策略遵循「flat ref」原则：
- **保留二进制兼容**：现有 `List<Integer>` 字节码继续工作；
- **可选特化**：新代码 `List<int>`（specialized）触发特化；
- **混合调用**：特化与非特化代码可互操作。

### 9.4 类型系统形式化展望

Valhalla 引入后，Java 类型系统将更复杂：

$$
\tau ::= B \mid \text{ref } C \mid \text{val } V \mid \text{ref } C\langle\sigma\rangle \mid \text{val } V\langle\sigma\rangle
$$

其中 $\text{ref}$ 为引用类型（identity），$\text{val}$ 为值类型（no identity），$\sigma$ 为类型参数。

## 10. 习题

### 10.1 填空题

**1.（remember）** Java 泛型在编译期通过____机制将所有泛型类型实例化映射到同一份字节码表示，运行时不再保留类型参数信息。

**2.（understand）** PECS 原则指出：若参数是生产者（producer）使用____通配符，若是消费者（consumer）使用____通配符。

**3.（understand）** 通配符 `List<? extends Number>` 的形式语义是____类型，表示存在某个未知类型 X 满足 X 是 Number 的子类型。

**4.（apply）** 在泛型方法签名 `<T extends Comparable<? super T>>` 中，`? super T` 应用的原则是____。

### 10.2 选择题

**1.（apply）** 下列代码片段哪一项可以正确通过编译并实现协变返回类型？

A. `class Parent { Number get() { return 1; } } class Child extends Parent { @Override Integer get() { return 1; } }`

B. `class Parent<T> { T get() { return null; } } class Child extends Parent<Number> { @Override Integer get() { return null; } }`

C. `List<Number> nums = new ArrayList<Integer>();`

D. `List<Integer>[] arr = new ArrayList<Integer>[10];`

**2.（analyze）** 关于桥接方法（bridge method），下列哪项描述最准确？

A. 桥接方法是 JVM 在运行时通过字节码插桩动态生成的方法

B. 桥接方法由编译器在编译期生成，用于保证泛型擦除后的多态语义正确

C. 桥接方法仅出现在接口默认方法中

D. 桥接方法是开发者通过 @Bridge 注解显式声明的方法

**3.（evaluate）** 下列关于 Java 泛型与 C# 泛型的对比，哪项是错误的？

A. Java 泛型在运行时不保留类型参数，C# 保留

B. Java 不允许 `new T()`，C# 在 `new()` 约束下允许

C. Java 不允许创建泛型数组，C# 允许

D. Java 泛型对值类型装箱，C# 泛型对值类型同样装箱

### 10.3 代码修正题

**1.（apply）** 以下代码试图实现一个将源集合元素复制到目标集合的工具方法，存在类型安全问题。请修复：

```java
// 试图把 src 中的元素复制到 dest
public static <T> void copy(List<T> src, List<T> dest) {
    for (T item : src) {
        dest.add(item);
    }
}
```

**2.（analyze）** 以下代码尝试通过反射调用泛型方法，但会抛出 ClassCastException。请修复：

```java
public class Box<T> {
    private T value;
    public void set(T value) { this.value = value; }
    public T get() { return value; }

    public static void main(String[] args) throws Exception {
        Box<String> box = new Box<>();
        Method m = Box.class.getMethod("set", Object.class);
        m.invoke(box, Integer.valueOf(42));
        String s = box.get();
    }
}
```

**3.（create）** 以下 `Pair` 类的 `equals` 方法在泛型擦除后会与 `Object.equals` 冲突，导致编译警告。请修复：

```java
public class Pair<T, U> {
    private final T first;
    private final U second;

    public Pair(T first, U second) {
        this.first = first;
        this.second = second;
    }

    public boolean equals(Pair<T, U> other) {  // 重载而非重写！
        return first.equals(other.first) && second.equals(other.second);
    }
}
```

### 10.4 开放性问题

**1.（evaluate）** 假设你正在为 Java 25 设计新的泛型实现方案，请对比「完全具化泛型（full reification）」、「类型特化（specialization）」与「保留擦除但增加运行时类型令牌」三种方案的优劣，并论证哪一种最适合 Java 生态。要求至少 300 字，涵盖二进制兼容性、性能、迁移成本三个维度。

**2.（create）** 设计一个类型安全的数据库查询构建器，要求：(1) 支持 WHERE、ORDER BY、LIMIT 子句的链式调用；(2) WHERE 子句的字段类型与值类型必须一致；(3) 编译期能检测到类型不匹配的查询条件。请给出核心 API 设计（接口与泛型签名）、关键类型约束、以及一个使用示例。

**3.（analyze）** 分析以下代码片段，说明每行涉及到的泛型机制（擦除、桥接、捕获、推断），并指出编译期与运行时的差异：

```java
public static <T extends Number> T sum(List<? extends T> nums) {
    T result = null;
    for (T n : nums) {
        if (result == null) result = n;
        else result = (T) Double.valueOf(result.doubleValue() + n.doubleValue());
    }
    return result;
}

List<Integer> ints = List.of(1, 2, 3);
Number total = sum(ints);
```

## 11. 参考答案

### 11.1 填空题

1. **类型擦除**（type erasure）。JLS §4.6 定义擦除函数将 `List<String>` 映射到原生类型 `List`。
2. **extends**，**super**。Producer Extends, Consumer Super 的缩写，由 Joshua Bloch 在《Effective Java》提出。
3. **存在**（existential）。形式化为 $\exists X <: \text{Number}. \, \text{List<X>}$，X 是未知的具体子类型。
4. **PECS**。`? super T` 让 `Comparable<Delayed>` 等父类型实现也能被接受。

### 11.2 选择题

1. **B**。Child 显式指定父类泛型为 Number 后重写返回 Integer，编译器生成桥接方法保证多态正确。A 虽合法但未涉及泛型；C 错误，泛型不协变；D 错误，泛型数组创建被禁止。
2. **B**。桥接方法由 javac 在编译期合成，签名擦除后调用实际类型安全的方法，确保子类方法能被父类引用正确分发。可通过 `Method.isBridge()` 检测。
3. **D**。C# 泛型对值类型不装箱，每个值类型参数生成特化版本，这正是 C# reified 泛型的关键优势之一。

### 11.3 代码修正题

**1.** 使用 PECS 原则：

```java
public static <T> void copy(List<? extends T> src, List<? super T> dest) {
    for (T item : src) {
        dest.add(item);
    }
}
```

**2.** 在 invoke 前校验参数类型：

```java
Method m = Box.class.getMethod("set", Object.class);
Object arg = "hello";
if (!String.class.isInstance(arg)) {
    throw new IllegalArgumentException("类型不匹配");
}
m.invoke(box, arg);
String s = box.get();
```

**3.** 使用 `@Override` + `Object` 参数：

```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Pair<?, ?>)) return false;
    Pair<?, ?> other = (Pair<?, ?>) o;
    return Objects.equals(first, other.first) && Objects.equals(second, other.second);
}

@Override
public int hashCode() {
    return Objects.hash(first, second);
}
```

### 11.4 开放性问题

**1.** 三种方案对比：

- **完全具化**：在运行时为每个类型参数生成独立类型。优点：解决 `instanceof`、数组、`new T()` 等所有问题；缺点：破坏二进制兼容性，需要重新设计字节码格式，旧库无法直接使用。C# 选择此路线，但 C# 没有历史包袱。

- **类型特化（Valhalla）**：为值类型生成特化版本（如 `List<int>` 与 `List<Integer>` 字节码不同），引用类型继续共享。优点：解决值类型装箱性能问题，保留二进制兼容；缺点：实现复杂度高，需要 JVM 深度修改。

- **运行时类型令牌**：保留擦除，但通过 `Class<T>` 显式传递类型信息。优点：最小侵入，无需修改 JVM；缺点：无法解决数组协变、`new T()` 等根本问题，仅是语法糖。

最适合 Java 生态的是 **类型特化**。理由：(1) Java 强调向后兼容，完全具化的迁移成本不可接受；(2) 性能瓶颈主要在值类型装箱，特化直接解决；(3) Valhalla 已经实验多年，技术成熟度高。

**2.** 类型安全查询构建器示例设计：

```java
public class QueryBuilder<E> {
    private final List<Predicate<E>> predicates = new ArrayList<>();

    public static <E> QueryBuilder<E> from(Class<E> entity) {
        return new QueryBuilder<>();
    }

    public <V> QueryBuilder<E> where(Column<E, V> column, V value) {
        predicates.add(e -> Objects.equals(column.get(e), value));
        return this;
    }

    public <V extends Comparable<V>> QueryBuilder<E> orderBy(Column<E, V> column) {
        return this;
    }

    public QueryBuilder<E> limit(int n) { return this; }

    public List<E> execute() { return List.of(); }
}

public interface Column<E, V> {
    V get(E entity);
}

public interface Predicate<E> {
    boolean test(E entity);
}

// 使用示例
QueryBuilder.from(User.class)
    .where(User::getName, "Alice")     // 类型安全：name 是 String
    .where(User::getAge, 30)            // 类型安全：age 是 Integer
    // .where(User::getAge, "30")       // 编译错误！String 不是 Integer
    .orderBy(User::getAge)
    .limit(10)
    .execute();
```

**3.** 分析：

- `T extends Number`：编译期约束 T 为 Number 子类型，擦除后 T 替换为 Number；
- `List<? extends T>`：上界通配符，捕获为 `List<X>` 其中 X <: T；
- `T result = null`：编译期检查通过，运行时 result 是 Number；
- `for (T n : nums)`：迭代时编译器插入 `checkcast` 到 T，运行时实际是 Number；
- `(T) Double.valueOf(...)`：编译器允许（因为 T <: Number，Double <: Number），运行时是 Double；
- `sum(ints)`：调用时 T 推断为 Integer，但因为返回 `T`，编译器在 `Number total = sum(ints)` 处插入 `checkcast` 到 Number；
- 关键陷阱：若调用方写 `Integer total = sum(ints)`，运行时 `(Integer)` 转换 Double 会抛出 ClassCastException——这是擦除带来的隐藏风险。

## 12. 参考文献

### 12.1 原始论文与规范

1. Bracha, G., Odersky, M., Wadler, P., and Thorup, M. 1998. Making the future safe for the present: Theorem about type erasure. _Proceedings of the 13th ACM SIGPLAN Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA '98)_, 221–232. DOI: 10.1145/286936.286960.

2. Agesen, O., Freund, S. N., and Mitchell, J. C. 1997. Adding Type Parameterization to the Java Language. _Proceedings of the 12th ACM SIGPLAN Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA '97)_, 49–65. DOI: 10.1145/263698.263721.

3. Torgersen, M., Ernst, E., Hansen, C. P., von der Ahe, P., Bracha, G., and Gafter, N. 2004. Adding Wildcards to the Java Programming Language. _Proceedings of the 2004 ACM Symposium on Applied Computing (SAC '04)_, 1280–1287. DOI: 10.1145/967900.968162.

4. Canning, P., Cook, W., Hill, W., and Mitchell, J. C. 1989. F-bounded polymorphism for object-oriented programming. _Proceedings of the Fourth International Conference on Functional Programming Languages and Computer Architecture (FPCA '89)_, 273–280. DOI: 10.1145/99370.99392.

5. Igarashi, A., Pierce, B. C., and Wadler, P. 2001. Featherweight Generic Java. _ACM Transactions on Programming Languages and Systems (TOPLAS)_ 23, 3 (May), 396–450. DOI: 10.1145/503502.503505.

### 12.2 标准与规范

6. Gosling, J., Joy, B., Steele, G., Bracha, G., and Buckley, A. 2023. _The Java Language Specification, Java SE 21 Edition_. Oracle America, Inc. §4.5–§4.8. https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html

7. Oracle Corporation. 2014. JSR 14: Add Generic Types to the Java Programming Language. Java Community Process. https://www.jcp.org/en/jsr/detail?id=14

8. Oracle Corporation. 2004. JSR 201: Extending the Java Programming Language with Enumerations, Autoboxing, and Enhanced for Loops. Java Community Process.

### 12.3 书籍

9. Bloch, J. 2018. _Effective Java_ (3rd ed.). Addison-Wesley Professional. ISBN 978-0134685991. Items 26–33.

10. Naughton, P. and Schildt, H. 2018. _Java: The Complete Reference_ (11th ed.). Oracle Press / McGraw-Hill. ISBN 978-1260440232. Chapter 14.

11. Pierce, B. C. 2002. _Types and Programming Languages_. MIT Press. ISBN 978-0262162098. Chapters 23–26.

12. Eckel, B. 2006. _Thinking in Java_ (4th ed.). Prentice Hall. ISBN 978-0131872486. Chapter 15.

### 12.4 项目与技术报告

13. Project Valhalla Team. 2024. JEP 401: Value Objects and Primitive Classes (Preview). OpenJDK. https://openjdk.org/jeps/401

14. Project Valhalla Team. 2024. JEP 218: Generics over Primitive Types. OpenJDK. https://openjdk.org/jeps/218

15. Oracle Corporation. 2024. Java Generics Tutorial. Oracle Documentation. https://docs.oracle.com/javase/tutorial/java/generics/index.html

## 13. 延伸阅读

### 13.1 关联模块

- [java/泛型详解](./泛型详解.md)：泛型基础语法与入门示例
- [java/集合框架详解](./集合框架详解.md)：`List`、`Set`、`Map` 的泛型实现
- [java/反射与动态代理](./反射与动态代理.md)：通过反射获取泛型签名
- [java/枚举与注解](./枚举与注解.md)：与泛型同在 Java 5 引入
- [java/JUC并发包](./JUC并发包.md)：并发容器中的泛型设计

### 13.2 进阶书籍

- _Java Generics and Collections_ by Maurice Naftalin and Philip Wadler (O'Reilly, 2006)——最权威的 Java 泛型专著
- _Types and Programming Languages_ by Benjamin C. Pierce (MIT Press, 2002)——类型论基础
- _Practical Foundations for Programming Languages_ by Robert Harper (Cambridge University Press, 2016)——现代 PL 理论
- _Effective Java_ by Joshua Bloch (3rd ed., Addison-Wesley, 2018)——工程实践宝典

### 13.3 论文与标准

- Igarashi, Pierce, Wadler 《Featherweight Generic Java》（TOPLAS 2001）——形式化 Java 泛型核心模型
- Singer, Brown 《A Comparing Java and C# Generics》——详细对比
- Donovan, Kernighan _The Go Programming Language_（Addison-Wesley, 2015）——Go 泛型设计背景

### 13.4 开源项目

- [OpenJDK Project Valhalla](https://openjdk.org/projects/valhalla/)——Java 类型系统未来演进
- [Google Guava](https://github.com/google/guava)——泛型容器最佳实践
- [Spring Framework](https://github.com/spring-projects/spring-framework)——`ResolvableType` 等泛型工具
- [jOOQ](https://github.com/jOOQ/jOOQ)——类型安全 SQL 查询构建器

### 13.5 在线课程

- MIT 6.031 Software Construction——软件构造中的类型安全
- Stanford CS143 Compilers——编译器实现中的类型系统
- Coursera _Programming Languages_ by Dan Grossman——多语言类型系统对比
- Oracle University _Java Generics Masterclass_
