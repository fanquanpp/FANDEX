---
order: 109
title: C++20概念
module: cpp
category: 'dev-lang'
difficulty: advanced
description: 'C++20 Concepts约束模板详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/可变参数模板与折叠表达式
  - cpp/C++20协程
  - cpp/C++23新特性
  - cpp/模板
prerequisites:
  - cpp/概述与现代标准
---

# C++20 概念 (Concepts)

> 本文档系统讲解 C++20 Concepts 机制的形式化基础、语法体系、语义模型、标准库概念族、子句驱动重载解析与工程实践。内容覆盖 ISO/IEC 14882:2020 [temp.concepts]、[temp.constr]、[temp.req] 等核心条款，对照 SFINAE、`std::enable_if`、标签分发等历史方案，结合 `<concepts>`、`<ranges>`、`<iterator>` 标准库设计实践，目标达到海外高校教学水准。

---

## 1. 学习目标

本节使用 Bloom 分类法刻画学习者应达到的认知层级。每一层级对应可观测的行为动词，便于自评与教学评估。

### 1.1 记忆（Remember）

- 列举 C++20 Concepts 的三大核心语法元素：`concept` 定义、`requires` 表达式、`requires` 子句。
- 复述 `requires` 表达式的四种要求类型：简单要求、类型要求、复合要求、嵌套要求。
- 背诵标准库 `<concepts>` 头文件的九大概念族：语言相关、类型关系、比较、对象语义、可调用、范围、迭代器、算法、可构造。
- 列举 C++20 Concepts 的四种使用形式：尾置 `requires` 子句、`requires` 子句前置、概念名替代 `typename`、简写模板（abbreviated template）。

### 1.2 理解（Understand）

- 解释 SFINAE 与 Concepts 的本质差异：前者基于"替换失败即非错误"的隐式机制，后者基于显式约束的语义建模。
- 阐述原子约束 (atomic constraint) 与约束归一化 (constraint normalization) 的过程：将复杂约束表达式分解为合取/析取的原子命题。
- 描述子句包含 (subsumption) 关系：当且仅当一个约束蕴含另一个约束时，重载解析才能基于约束排序。
- 区分 `requires` 表达式与 `requires` 子句：前者求值为 `bool` 常量表达式，后者引入约束谓词参与重载解析。
- 解释简写模板 `void f(auto x)` 与 `void f(std::integral auto x)` 的等价关系：前者等价于 `template<typename T> void f(T x)`，后者等价于 `template<std::integral T> void f(T x)`。

### 1.3 应用（Apply）

- 使用 `concept` 定义自定义概念，覆盖算术类型、容器接口、可调用对象等多种语义。
- 使用 `requires` 子句为模板添加约束，支持基于约束的重载分发。
- 使用简写模板语法简化常见模板声明，提升可读性。
- 在项目中替换既有 `std::enable_if` 代码为 `requires` 子句，保持向后兼容。

### 1.4 分析（Analyze）

- 对比 Concepts 与 Rust trait bounds、Haskell type classes、Swift protocols、Java bounded generics 在表达能力、推导机制、运行时开销上的差异。
- 解构约束归一化的算法步骤：将 `concept C = A && B || C;` 分解为合取范式 (CNF) 或析取范式 (DNF) 的原子约束集。
- 分析子句包含关系的判定算法：基于原子约束的偏序关系，构建蕴含图。
- 评估 C++20 Concepts 在编译时间、二进制体积、错误信息质量上的工程影响。

### 1.5 评价（Evaluate）

- 评估在库设计中应采用 SFINAE 还是 Concepts：考虑目标 C++ 标准版本、编译器支持、用户迁移成本。
- 判断特定 `requires` 表达式是否存在过度约束（如要求 `operator+` 但实际仅需 `operator+=`）。
- 评审一份使用 Concepts 的模板代码，识别约束不充分（漏约束）、约束过强（阻止合理实例化）、约束冗余（与已有约束重复）等问题。

### 1.6 创造（Create）

- 设计一套面向领域的概念层级（如数值分析、线性代数、图形渲染），包含基础概念、组合概念、特定领域概念。
- 构建一个完全基于 Concepts 的泛型算法库，提供清晰错误信息与强类型保证。
- 为开源项目编写 Concepts 迁移指南，覆盖从 SFINAE 到 Concepts 的逐步重构路径。

---

## 2. 历史动机与发展脉络

C++ Concepts 的演进是 C++ 标准化史上最漫长、最曲折的提案之一，历经近二十年才最终落地。

### 2.1 模板的诞生与"无约束泛型"困境（1990s）

C++ 模板由 Bjarne Stroustrup 在 1980 年代末设计，C++98 标准化时正式纳入。模板的初衷是支持泛型编程 (generic programming)，让算法与数据结构能跨类型复用。Alexander Stepanov 据此设计了 STL（Standard Template Library），成为 C++ 标准库的核心组成部分。

但早期模板缺乏对模板参数的语义约束机制。例如：

```cpp
template<typename T>
T find_max(T a, T b) {
    return a > b ? a : b;  // 若 T 不支持 operator>，编译失败
}
```

调用 `find_max(1, 2)` 工作正常，但 `find_max(std::complex<double>(1, 2), std::complex<double>(3, 4))` 会因 `std::complex` 无 `operator>` 而失败。问题在于：

1. **错误延迟**：模板错误在实例化时才暴露，而非声明时。
2. **错误信息冗长**：编译器输出的错误信息可能长达数百行，涉及模板实例化栈。
3. **无契约文档**：模板参数的语义要求未在源码中明示，依赖注释或文档。
4. **重载分发困难**：基于模板参数特性选择不同实现需要复杂的 SFINAE 技巧。

### 2.2 SFINAE：权宜之计（2003 - 2010s）

C++03 引入 SFINAE (Substitution Failure Is Not An Error) 原则，提供了一种"软"约束机制。David Vandevoorde 首次形式化该原则，Jaakko Järvi 等人基于此设计 `boost::enable_if`，后被纳入 C++11 标准库为 `std::enable_if`。

典型 SFINAE 用法：

```cpp
// C++11，使用 std::enable_if 区分整数与浮点
template<typename T,
         typename = std::enable_if_t<std::is_integral_v<T>>>
T process(T x) { return x * 2; }

template<typename T,
         typename = std::enable_if_t<std::is_floating_point_v<T>>>
T process(T x) { return x * 3.14; }
```

SFINAE 的问题：

1. **语法笨重**：默认模板参数 + `enable_if` + `_t` 后缀，代码冗长。
2. **可读性差**：约束条件隐藏在模板参数列表末尾，初学者难以理解。
3. **重载分发脆弱**：两个 `enable_if` 互斥的函数模板在调用时可能产生歧义。
4. **错误信息更糟糕**：SFINAE 失败被静默排除，剩余候选函数的错误信息更加难以解读。
5. **表达力受限**：复杂约束（如"类型 T 必须有成员函数 foo() 返回 int"）需要 `decltype` + `declval` + `void_t` 等技巧。

`std::void_t` 由 Walter Brown 在 C++17 提案 N3911 中提出，简化了 SFINAE：

```cpp
// C++17，使用 void_t 检测成员类型
template<typename, typename = void>
struct has_value_type : std::false_type {};

template<typename T>
struct has_value_type<T, std::void_t<typename T::value_type>> : std::true_type {};
```

但 `void_t` 仍是 SFINAE 技巧，未从根本上解决模板约束问题。

### 2.3 Concepts 的早期提案（2003 - 2009）

C++ Concepts 的最初构想可追溯到 2003 年，由 Bjarne Stroustrup、Gabriel Dos Reis 等人推动。其设计目标：

1. **显式契约**：模板参数的语义要求以独立语法声明。
2. **清晰错误**：违反约束时给出明确错误信息，定位到具体概念。
3. **重载分发**：基于概念约束自动选择重载。
4. **算法泛化**：STL 算法的类型要求以概念形式表达。

**Indiana/Texas A&M 提案（2003-2008）**：

由 Douglas Gregor、Andrew Lumsdaine、Jaakko Järvi、Sean Parent、Bjarne Stroustrup 等人主导，提出基于"use-case"语法的概念定义：

```cpp
// 早期概念提案语法（未采纳）
concept EqualityComparable<typename T> {
    bool operator==(T, T);
    bool operator!=(T a, T b) { return !(a == b); }
}

template<EqualityComparable T>
bool find(T* first, T* last, T value);
```

此提案在 C++0x 草案 N2914（2009）中较为完整，进入 C++0x 工作草案。但 2009 年 Frankfurt 会议中，由于以下问题被否决：

1. **概念地图 (concept maps) 过于复杂**：允许类型显式"建模"概念，引入额外语法层。
2. **实现复杂度**：编译器实现成本高，GCC 概念分支维护负担重。
3. **与现有代码不兼容**：需要重写大量 STL 代码以使用概念。
4. **性能担忧**：早期实现报告指出部分用例编译时间增加。

### 2.4 Concepts Lite 与 C++20 标准化（2013 - 2020）

2009 年提案否决后，Bjarne Stroustrup、Andrew Sutton 等人重启简化版设计，称为 "Concepts Lite"。核心简化：

1. **去除概念地图**：概念仅作为约束谓词，类型不显式声明建模关系。
2. **保留约束机制**：通过 `requires` 子句为模板添加约束。
3. **简短语法**：`template<C T>` 形式直观表达约束。

2013 年 N3580 提案奠定了 C++20 Concepts 的基础。Andrew Sutton 在 GCC 6 中实现实验版本（`-fconcepts` 选项），积累实践经验。

2017 年 Jacksonville 会议，Concepts 正式进入 C++20 工作草案。2018 年 Rapperswil 会议，`<concepts>` 标准库头文件确定。2020 年 9 月，ISO/IEC 14882:2020 正式发布，Concepts 成为 C++20 四大核心特性之一（与 Ranges、Modules、Coroutines 并列）。

### 2.5 Ranges：Concepts 的旗舰应用（2018 - 2020）

C++20 Ranges 库由 Eric Niebler 主导设计，是 Concepts 的首个大规模应用。Ranges 完全基于概念设计：

```cpp
// std::ranges::sort 仅接受 random_access_iterator
namespace std::ranges {
    template<std::random_access_iterator I, std::sentinel_for<I> S,
             typename Comp = std::ranges::less, typename Proj = std::identity>
    requires std::sortable<I, Comp, Proj>
    constexpr I sort(I first, S last, Comp comp = {}, Proj proj = {});
}
```

Ranges 的设计展示了 Concepts 的核心价值：

1. **算法约束明示**：`sort` 需要 `random_access_iterator`，`copy` 需要 `input_iterator` + `output_iterator`。
2. **错误信息可读**：用 `std::list<int>::iterator` 调用 `sort` 会得到"不满足 `random_access_iterator`"的明确错误。
3. **投影与组合**：`Proj` 投影类型通过 `indirectly_readable` 等概念约束，支持复杂组合。

### 2.6 C++23 与 C++26 的演进（2021 - 至今）

C++23 在 Concepts 上做了小幅增强：

1. **`std::span` 概念化**：`std::ranges::contiguous_range` 与 `std::span` 的协同。
2. **`std::expected` 使用概念**：约束 `E` 与 `T` 不互相转换。
3. **`<flat_map>` 等新容器**：使用概念约束键比较器。

C++26 草案中的相关进展：

1. **反射 (Reflection)**：P2996 提案，反射元编程与概念协同。
2. **Contracts**：P2900 提案，契约检查与概念约束可能在泛型编程中协同。
3. **`<linalg>` 线性代数库**：P1673 提案，基于概念约束矩阵类型。
4. **Pattern Matching**：P2688 提案，模式匹配与概念约束结合。

### 2.7 演进时间线

```text
1988  C++ 模板设计               Stroustrup
1994  STL 由 HP 实现             Stepanov & Lee
1998  C++98 标准化               模板正式纳入
2003  SFINAE 原则形式化          Vandevoorde
2003  Indiana 概念提案启动       Gregor, Lumsdaine
2008  C++0x 草案 N2914           概念进入草案
2009  Frankfurt 会议否决         概念地图过于复杂
2013  Concepts Lite (N3580)      Stroustrup & Sutton
2014  GCC 6 实验性实现           -fconcepts 选项
2017  Jacksonville 进入 C++20    ISO/IEC WG21
2018  Rapperswil <concepts> 定稿 Eric Niebler
2019  Ranges 完成标准化          P0896 合入
2020  C++20 发布                 ISO/IEC 14882:2020
2021  主流编译器完整支持         GCC 10+, Clang 10+, MSVC 19.29+
2023  C++23 小幅增强             expected / flat_map
2026  C++26 草案                 反射 + 概念协同
```

---

## 3. 形式化定义

本节给出 C++20 Concepts 相关的形式化定义，涵盖标准条款引用、概念的形式语义、约束归一化算法与子句包含关系。

### 3.1 ISO/IEC 14882:2020 标准条款

C++20 Concepts 的标准化分布在以下核心条款：

- **[temp.concepts]** 概念定义：`concept` 关键字的语法与语义。
- **[temp.constr.atomic]** 原子约束：约束的最小不可分单元。
- **[temp.constr.normal]** 约束归一化：将约束表达式转换为原子约束的合取/析取范式。
- **[temp.constr.order]** 约束排序：基于子句包含 (subsumption) 的偏序关系。
- **[temp.constr.decl]** 约束声明：`requires` 子句的语法。
- **[temp.constr.constr]** 约束构造：约束的逻辑组合（合取 `&&`、析取 `||`）。
- **[temp.req]** 要求：`requires` 表达式的四种要求类型。
- **[temp.pre]** 前置条件：模板参数的隐式约束。

### 3.2 概念的形式化定义

概念 (concept) 是一个命名的模板，其求值为 `bool` 类型的编译期常量。形式化地，概念 $C$ 是一个谓词：

$$
C : \mathcal{T} \to \{\text{true}, \text{false}\}
$$

其中 $\mathcal{T}$ 是类型集合。概念定义的语法形式为：

$$
\texttt{template}<\texttt{typename}~T>~\texttt{concept}~C = E
$$

其中 $E$ 是约束表达式 (constraint-expression)，求值为 `bool` 类型的常量表达式。

例如：

```cpp
template<typename T>
concept Integral = std::is_integral_v<T>;
```

这里 $E = \texttt{std::is\_integral\_v<T>}$，$C = \text{Integral}$。

### 3.3 约束归一化 (Constraint Normalization)

约束归一化是将复杂的约束表达式转换为原子约束的逻辑组合的过程。形式化地，定义归一化函数：

$$
\text{normalize} : E \to \text{DNF}(E)
$$

其中 $\text{DNF}(E)$ 是 $E$ 的析取范式 (Disjunctive Normal Form)，形式为：

$$
\text{DNF}(E) = \bigvee_{i=1}^{n} \bigwedge_{j=1}^{m_i} P_{ij}
$$

其中 $P_{ij}$ 是原子约束 (atomic constraint)。原子约束是约束的最小不可分单元，形式为：

$$
P = (C<T_1, T_2, \ldots, T_k>, \text{mapping})
$$

其中 $C$ 是概念名，$T_i$ 是类型参数，$\text{mapping}$ 是概念参数到模板参数的映射（用于子句包含判定）。

归一化规则：

1. **概念引用**：`C<T>` 归一化为 $C$ 的定义体归一化，参数替换为 $T$。
2. **合取**：$A \land B$ 归一化为 $\text{normalize}(A) \land \text{normalize}(B)$，分配律展开为 DNF。
3. **析取**：$A \lor B$ 归一化为 $\text{normalize}(A) \lor \text{normalize}(B)$，直接合并 DNF。
4. **`requires` 表达式**：求值为 `bool` 常量，作为原子约束。

例如，对于概念：

```cpp
template<typename T>
concept Number = std::integral<T> || std::floating_point<T>;

template<typename T>
concept Signed = std::signed_integral<T> || (std::floating_point<T> && std::is_signed_v<T>);
```

`Number<int>` 归一化为 $\texttt{integral<int>} \lor \texttt{floating\_point<int>}$，求值为 $\text{true} \lor \text{false} = \text{true}$。

### 3.4 原子约束的等价性

两个原子约束 $P_1 = (C_1, \text{mapping}_1)$ 与 $P_2 = (C_2, \text{mapping}_2)$ 等价，当且仅当：

1. $C_1$ 与 $C_2$ 引用同一个概念定义（相同的源码位置）。
2. $\text{mapping}_1$ 与 $\text{mapping}_2$ 是相同的类型替换。

形式化地：

$$
P_1 \equiv P_2 \iff C_1 = C_2 \land \text{mapping}_1 = \text{mapping}_2
$$

注意：两个不同概念即使语义相同（如自定义 `MyIntegral` 与 `std::integral`），其原子约束不等价，无法触发子句包含。

### 3.5 子句包含 (Subsumption)

子句包含是约束之间的偏序关系。定义约束 $A$ 包含约束 $B$（记 $A \models B$，或 $B \sqsubseteq A$），当且仅当：

$$
\forall \text{原子约束 } P \in \text{DNF}(B) : \exists \text{原子约束 } Q \in \text{DNF}(A) : Q \equiv P
$$

即 $B$ 的每个析取项中的每个原子约束，都在 $A$ 的某个析取项中存在等价的原子约束。

子句包含的判定算法：

1. 将 $A$ 与 $B$ 归一化为 DNF。
2. 对 $B$ 的每个析取项 $B_i$（合取式）：
   - 检查是否存在 $A$ 的析取项 $A_j$，使得 $B_i$ 的每个原子约束都在 $A_j$ 中存在等价约束。
3. 若所有 $B_i$ 都满足，则 $A \models B$。

子句包含在重载解析中的作用：

- 若约束 $A \models B$ 且 $B \not\models A$，则 $A$ 比 $B$ 更严格 (more constrained)。
- 在重载解析中，更严格的候选优先选择。

### 3.6 `requires` 表达式的形式语义

`requires` 表达式 (requires expression) 是 C++20 引入的求值为 `bool` 常量的语法结构。形式化地：

$$
\texttt{requires}~(x_1 : T_1, \ldots, x_n : T_n)~\{ r_1; r_2; \ldots; r_k; \}
$$

求值规则：若所有要求 $r_i$ 都满足，则表达式求值为 `true`；否则为 `false`。要求类型：

1. **简单要求 (simple requirement)**：$r = E$，求值表达式 $E$ 是否有效。
2. **类型要求 (type requirement)**：$r = \texttt{typename}~T::U$，检查嵌套类型是否存在。
3. **复合要求 (compound requirement)**：$r = \{ E \} \to C$，检查表达式 $E$ 有效且其返回类型满足概念 $C$。
4. **嵌套要求 (nested requirement)**：$r = \texttt{requires}~E$，引入嵌套约束。

形式化地，`requires` 表达式求值：

$$
\llbracket \texttt{requires}(\vec{x}) \{ \vec{r} \} \rrbracket = \bigwedge_{i=1}^{k} \llbracket r_i \rrbracket
$$

其中 $\llbracket r_i \rrbracket$ 是要求 $r_i$ 的求值结果。

### 3.7 简写模板的形式化

简写模板 (abbreviated template) 是 C++20 引入的语法糖。形式化等价：

| 简写形式 | 等价的完整形式 |
| -------- | -------------- |
| `void f(auto x)` | `template<typename T> void f(T x)` |
| `void f(std::integral auto x)` | `template<std::integral T> void f(T x)` |
| `auto g(auto x) -> auto` | `template<typename T, typename R> auto g(T x) -> R` |
| `void f(const std::integral auto& x)` | `template<std::integral T> void f(const T& x)` |

简写模板的约束同样参与重载解析与子句包含判定。

### 3.8 模板实参推导与约束

C++20 的模板实参推导 (template argument deduction) 与约束协同工作。形式化地，对于函数模板：

```cpp
template<std::integral T>
void f(T x);
```

调用 `f(42)` 时，编译器：

1. 推导 $T = \texttt{int}$。
2. 检查约束 $\texttt{integral<int>}$ 求值为 `true`。
3. 将 `f(int)` 加入候选集。
4. 若无更优候选，选择 `f(int)`。

若调用 `f(3.14)`，推导 $T = \texttt{double}$，约束 $\texttt{integral<double>} = \text{false}$，候选被排除。

---

## 4. 理论推导与原理解析

本节深入解析 Concepts 背后的理论原理，包括约束逻辑、归一化算法、子句包含判定与重载解析的形式语义。

### 4.1 约束的命题逻辑模型

C++20 Concepts 的约束表达式可建模为命题逻辑。设原子约束为命题变量 $p_1, p_2, \ldots, p_n$，则约束表达式 $E$ 是命题逻辑公式：

$$
E ::= p \mid E_1 \land E_2 \mid E_1 \lor E_2
$$

求值规则：

- $p$ 在类型 $T$ 上的求值：$\llbracket p \rrbracket_T \in \{\text{true}, \text{false}\}$。
- $\llbracket E_1 \land E_2 \rrbracket_T = \llbracket E_1 \rrbracket_T \land \llbracket E_2 \rrbracket_T$。
- $\llbracket E_1 \lor E_2 \rrbracket_T = \llbracket E_1 \rrbracket_T \lor \llbracket E_1 \rrbracket_T$。

但与经典命题逻辑的关键差异：C++ 的约束归一化使用 DNF（析取范式），而非任意等价公式。这导致语义等价但语法不同的约束可能产生不同的子句包含判定。

例如：

```cpp
template<typename T>
concept A = std::integral<T> || std::floating_point<T>;

template<typename T>
concept B = !(!std::integral<T> && !std::floating_point<T>);  // 逻辑等价 A
```

虽然 $A$ 与 $B$ 在经典逻辑下等价，但 $B$ 的归一化涉及 `!`（非操作），C++ 标准不支持原子约束的否定，故 $B$ 无法归一化为 DNF，无法参与子句包含。

### 4.2 归一化算法的形式描述

约束归一化算法形式描述如下：

```
function normalize(E):
    if E is concept reference C<T1, ..., Tk>:
        return DNF of C's definition with T1, ..., Tk substituted
    if E is (E1 && E2):
        N1 = normalize(E1)
        N2 = normalize(E2)
        return distribute_and(N1, N2)  // DNF 合取分配
    if E is (E1 || E2):
        N1 = normalize(E1)
        N2 = normalize(E2)
        return N1 ∪ N2  // DNF 析取合并
    if E is requires expression:
        return {(E, identity_mapping)}  // 单原子约束
```

`distribute_and` 实现 DNF 合取分配：

$$
\text{distribute\_and}\left(\bigvee_i A_i, \bigvee_j B_j\right) = \bigvee_{i,j} (A_i \land B_j)
$$

### 4.3 子句包含的判定复杂度

子句包含判定的算法复杂度：

设 $A$ 的 DNF 有 $n_A$ 个析取项，$B$ 的 DNF 有 $n_B$ 个析取项，每个析取项最多有 $m$ 个原子约束。

判定 $A \models B$：

- 对 $B$ 的每个析取项 $B_i$（共 $n_B$ 个）：
  - 对 $A$ 的每个析取项 $A_j$（共 $n_A$ 个）：
    - 检查 $B_i$ 的每个原子约束（最多 $m$ 个）是否在 $A_j$ 中存在等价约束。
    - 等价约束判定：$O(m)$ 时间。
  - 若存在 $A_j$ 包含 $B_i$，继续下一个 $B_i$；否则返回 `false`。
- 返回 `true`。

总复杂度：$O(n_A \cdot n_B \cdot m^2)$。

实际工程中，概念定义通常较简单（$n_A, n_B \leq 5$，$m \leq 10$），判定开销可忽略。但深层组合概念可能产生 DNF 爆炸，编译器实现需优化。

### 4.4 重载解析的约束排序

C++20 重载解析中，约束参与候选函数排序。形式化地，对于两个候选函数 $f_1$ 与 $f_2$，约束分别为 $C_1$ 与 $C_2$：

1. 若 $C_1 \models C_2$ 且 $C_2 \not\models C_1$，则 $f_1$ 比 $f_2$ 更受约束 (more constrained)，$f_1$ 优先。
2. 若 $C_2 \models C_1$ 且 $C_1 \not\models C_2$，则 $f_2$ 比 $f_1$ 更受约束，$f_2$ 优先。
3. 若 $C_1 \models C_2$ 且 $C_2 \models C_1$，则 $f_1$ 与 $f_2$ 约束等价，转入其他排序规则。
4. 若 $C_1 \not\models C_2$ 且 $C_2 \not\models C_1$，则 $f_1$ 与 $f_2$ 约束不可比，调用产生歧义。

示例：

```cpp
template<typename T> requires std::integral<T>
void f(T);  // f1

template<typename T> requires std::signed_integral<T>
void f(T);  // f2

f(42);    // f1 与 f2 都满足；signed_integral<int> 蕴含 integral<int>，f2 更受约束，选 f2
f(42u);   // 仅 f1 满足（unsigned 不满足 signed_integral），选 f1
```

`std::signed_integral<T>` 标准库定义为 `std::integral<T> && std::is_signed_v<T>`，故 `signed_integral ⊨ integral`，但 `integral ⊨ signed_integral` 不成立（`unsigned` 是 `integral` 但非 `signed_integral`）。

### 4.5 约束的传递性

子句包含关系具有传递性：

$$
A \models B \land B \models C \implies A \models C
$$

这是由于原子约束等价性的传递性（基于源码位置与参数映射）。

传递性允许构建概念层级：

```cpp
template<typename T> concept Regular = std::copyable<T> && std::default_initializable<T> && std::equality_comparable<T>;
template<typename T> concept Ordered = Regular<T> && std::totally_ordered<T>;
template<typename T> concept Numeric = Ordered<T> && std::regular<T> /* ... */;
```

`Numeric ⊨ Ordered ⊨ Regular`，调用时优先选择 `Numeric` 约束的版本。

### 4.6 错误信息的语义模型

C++20 Concepts 改善错误信息的核心机制：

1. **早期失败**：约束检查在模板实例化前进行，避免深入实例化失败栈。
2. **定位明确**：错误信息直接指向违反的概念，而非内部模板代码。
3. **要求列表**：编译器可输出概念的所有要求，帮助用户理解契约。

形式化地，错误信息模型：

$$
\text{Error} = (\text{Concept}, \text{FailedRequirement}, \text{Type})
$$

例如，调用 `std::ranges::sort(std::list<int>::iterator, ...)` 的错误：

```text
error: no matching function for call to 'sort(...)'
note: candidate template ignored: constraints not satisfied
  requires std::random_access_iterator<I>
note: because 'std::_List_iterator<int>' does not satisfy 'random_access_iterator'
  because 'std::_List_iterator<int>' does not satisfy 'bidirectional_iterator'
  ... (递归展开)
```

对比 SFINAE 的典型错误（数百行模板实例化栈），Concepts 错误信息可读性提升数十倍。

### 4.7 概念与类型类 (Type Class) 的对比

Haskell 类型类 (type class) 与 C++ 概念在形式上有相似性，但本质不同：

| 维度 | Haskell Type Class | C++20 Concept |
| ---- | ------------------- | -------------- |
| 声明 | `class Eq a where (==) :: a -> a -> Bool` | `template<typename T> concept Eq = requires(T a, T b) { { a == b } -> std::convertible_to<bool>; };` |
| 实例声明 | `instance Eq Int where ...` 显式声明 | 隐式：类型满足要求即自动建模 |
| 字典传递 | 编译器自动生成字典传递，运行时多态 | 完全编译期，无运行时开销 |
| 全局唯一性 | 全局唯一实例 (Global Uniqueness) | 无此约束，可基于不同概念多次建模 |
| 多参数类 | `class Collection c e | c -> e where ...` | `template<typename C, typename E> concept Collection = ...` |
| 函数依赖 | `c -> e` 函数依赖 | 无显式函数依赖，需手动约束 |

核心差异：Haskell 类型类是"声明式"（类型显式声明属于类），C++ 概念是"结构式"（类型满足结构要求即属于概念）。结构式约束更灵活但缺乏"概念地图"的显式控制。

---

## 5. 代码示例

### 5.1 概念定义基础示例

**标准**：C++20

```cpp
#include <concepts>
#include <type_traits>

// 5.1.1 基于类型特性的概念
template<typename T>
concept Integral = std::is_integral_v<T>;

template<typename T>
concept SignedIntegral = std::is_integral_v<T> && std::is_signed_v<T>;

template<typename T>
concept UnsignedIntegral = std::is_integral_v<T> && !std::is_signed_v<T>;

// 5.1.2 基于 requires 表达式的概念
template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
    { a += b } -> std::same_as<T&>;
};

template<typename T>
concept Numeric = requires(T a, T b) {
    { a + b } -> std::convertible_to<T>;
    { a - b } -> std::convertible_to<T>;
    { a * b } -> std::convertible_to<T>;
    { a / b } -> std::convertible_to<T>;
    { -a } -> std::convertible_to<T>;
};

// 5.1.3 容器概念
template<typename T>
concept Container = requires(T t) {
    typename T::value_type;
    typename T::size_type;
    typename T::iterator;
    typename T::const_iterator;
    { t.begin() } -> std::same_as<typename T::iterator>;
    { t.end() } -> std::same_as<typename T::iterator>;
    { t.size() } -> std::convertible_to<typename T::size_type>;
    { t.empty() } -> std::convertible_to<bool>;
};

// 5.1.4 可调用概念
template<typename F, typename... Args>
concept Callable = requires(F f, Args... args) {
    { f(args...) };
};

template<typename F, typename R, typename... Args>
concept ReturnableCallable = requires(F f, Args... args) {
    { f(args...) } -> std::convertible_to<R>;
};
```

### 5.1.5 概念的组合

**标准**：C++20

```cpp
#include <concepts>

// 概念可通过逻辑运算符组合
template<typename T>
concept Regular = std::copyable<T> && std::default_initializable<T> &&
                  std::equality_comparable<T>;

template<typename T>
concept Ordered = Regular<T> && std::totally_ordered<T>;

template<typename T>
concept NumericType = Ordered<T> && requires(T a, T b) {
    { a + b } -> std::convertible_to<T>;
    { a - b } -> std::convertible_to<T>;
    { a * b } -> std::convertible_to<T>;
    { a / b } -> std::convertible_to<T>;
    T{0};
    T{1};
};
```

### 5.2 使用概念的四种语法形式

**标准**：C++20

```cpp
#include <concepts>
#include <iostream>

// 5.2.1 形式一：requires 子句（前置）
template<typename T>
requires std::integral<T>
T add_one(T x) {
    return x + 1;
}

// 5.2.2 形式二：requires 子句（尾置）
template<typename T>
T add_two(T x) requires std::integral<T> {
    return x + 2;
}

// 5.2.3 形式三：概念名替代 typename
template<std::integral T>
T add_three(T x) {
    return x + 3;
}

// 5.2.4 形式四：简写模板
auto add_four(std::integral auto x) {
    return x + 4;
}

// 5.2.5 多参数约束
template<typename T, typename U>
requires std::integral<T> && std::integral<U>
auto common_add(T a, U b) {
    return a + b;
}

// 5.2.6 简写模板多参数
auto common_add_short(std::integral auto a, std::integral auto b) {
    return a + b;
}

int main() {
    std::cout << add_one(10) << '\n';     // 11
    std::cout << add_two(10) << '\n';     // 12
    std::cout << add_three(10) << '\n';   // 13
    std::cout << add_four(10) << '\n';    // 14
    std::cout << common_add(10, 20L) << '\n';  // 30
    // add_one(3.14);  // 编译错误：double 不满足 std::integral
    return 0;
}
```

### 5.3 `requires` 表达式的四种要求

**标准**：C++20

```cpp
#include <concepts>
#include <iterator>
#include <vector>

// 5.3.1 简单要求 (simple requirement)
template<typename T>
concept SimpleAddable = requires(T a, T b) {
    a + b;        // 检查 a + b 是否合法
    a += b;       // 检查 a += b 是否合法
    -a;           // 检查 -a 是否合法
};

// 5.3.2 类型要求 (type requirement)
template<typename T>
concept HasValueType = requires {
    typename T::value_type;        // 检查嵌套类型
    typename T::reference;         // 检查嵌套类型
    typename T::const_reference;   // 检查嵌套类型
};

// 5.3.3 复合要求 (compound requirement)
template<typename T>
concept IteratorLike = requires(T it) {
    { *it } -> std::convertible_to<typename T::value_type>;  // 表达式 + 返回类型约束
    { ++it } -> std::same_as<T&>;                            // 表达式 + 精确类型
    { it == it } -> std::convertible_to<bool>;               // 表达式 + 可转换
};

// 5.3.4 嵌套要求 (nested requirement)
template<typename T>
concept StrictlyAddable = requires(T a, T b) {
    requires std::same_as<decltype(a + b), T>;  // 嵌套要求
    requires std::same_as<decltype(a += b), T&>;
};

// 5.3.5 综合示例：迭代器概念
template<typename T>
concept MyInputIterator = requires(T it) {
    typename T::value_type;
    typename T::reference;
    typename T::pointer;
    typename T::difference_type;
    typename T::iterator_category;
    { *it } -> std::same_as<typename T::reference>;
    { ++it } -> std::same_as<T&>;
    { it++ } -> std::same_as<T>;
    { it == it } -> std::convertible_to<bool>;
    { it != it } -> std::convertible_to<bool>;
};

static_assert(MyInputIterator<typename std::vector<int>::iterator>);
```

### 5.4 基于约束的重载分发

**标准**：C++20

```cpp
#include <concepts>
#include <iostream>
#include <string>

// 5.4.1 通用版（最弱约束）
template<typename T>
void process(T value) {
    std::cout << "Generic: " << value << '\n';
}

// 5.4.2 整数特化（更强约束）
template<typename T>
requires std::integral<T>
void process(T value) {
    std::cout << "Integral: " << value << '\n';
}

// 5.4.3 有符号整数特化（更强约束）
template<typename T>
requires std::signed_integral<T>
void process(T value) {
    std::cout << "Signed: " << value << '\n';
}

// 5.4.4 浮点特化
template<typename T>
requires std::floating_point<T>
void process(T value) {
    std::cout << "Floating: " << value << '\n';
}

// 5.4.5 字符串特化
template<typename T>
requires std::convertible_to<T, std::string>
void process(T value) {
    std::cout << "String: " << value << '\n';
}

int main() {
    process(42);        // Signed: 42（最约束）
    process(42u);       // Integral: 42（unsigned 不满足 signed_integral）
    process(3.14);      // Floating: 3.14
    process("hello");   // String: hello
    process(true);      // Integral: 1（bool 是 integral）
    return 0;
}
```

### 5.5 替代 `std::enable_if` 的典型场景

**标准**：C++20

```cpp
#include <concepts>
#include <type_traits>
#include <string>

// 5.5.1 旧：SFINAE + enable_if（C++11/14/17）
#if __cplusplus < 202002L
template<typename T,
         typename = std::enable_if_t<std::is_integral_v<T>>>
T old_multiply(T a, T b) { return a * b; }

template<typename T,
         std::enable_if_t<std::is_floating_point_v<T>, int> = 0>
T old_multiply(T a, T b) { return a * b; }
#endif

// 5.5.2 新：C++20 Concepts
template<std::integral T>
T new_multiply(T a, T b) { return a * b; }

template<std::floating_point T>
T new_multiply(T a, T b) { return a * b; }

// 5.5.3 构造函数 SFINAE → Concepts
class StringWrapper {
public:
    // 旧方式：enable_if 控制构造函数
    template<typename T,
             typename = std::enable_if_t<std::is_convertible_v<T, std::string>>>
    StringWrapper(T&& value) : str_(std::forward<T>(value)) {}

    // 新方式：可同时定义多个重载
    StringWrapper(std::convertible_to<std::string> auto&& value)
        : str_(std::forward<decltype(value)>(value)) {}

private:
    std::string str_;
};

// 5.5.4 返回类型 SFINAE → Concepts
template<typename T>
requires std::integral<T>
auto compute(T x) -> T {
    return x * 2;
}

template<typename T>
requires std::floating_point<T>
auto compute(T x) -> T {
    return x * 3.14;
}
```

### 5.6 自定义容器概念与算法

**标准**：C++20

```cpp
#include <concepts>
#include <cstddef>
#include <iostream>
#include <vector>
#include <list>

// 5.6.1 自定义 SequenceContainer 概念
template<typename C>
concept SequenceContainer = requires(C c) {
    typename C::value_type;
    typename C::size_type;
    typename C::reference;
    typename C::const_reference;
    typename C::iterator;
    { c.size() } -> std::same_as<typename C::size_type>;
    { c.empty() } -> std::same_as<bool>;
    { c.begin() } -> std::same_as<typename C::iterator>;
    { c.end() } -> std::same_as<typename C::iterator>;
    { c.front() } -> std::same_as<typename C::reference>;
    { c.push_back(std::declval<typename C::value_type>()) };
};

// 5.6.2 受约束的泛型算法
template<SequenceContainer C>
typename C::size_type count_elements(const C& c) {
    typename C::size_type n = 0;
    for (auto it = c.begin(); it != c.end(); ++it) {
        ++n;
    }
    return n;
}

template<SequenceContainer C>
requires std::equality_comparable<typename C::value_type>
typename C::size_type count_value(const C& c, const typename C::value_type& v) {
    typename C::size_type n = 0;
    for (const auto& x : c) {
        if (x == v) ++n;
    }
    return n;
}

template<SequenceContainer C>
void print_container(const C& c) {
    std::cout << "[";
    bool first = true;
    for (const auto& x : c) {
        if (!first) std::cout << ", ";
        std::cout << x;
        first = false;
    }
    std::cout << "]\n";
}

int main() {
    std::vector<int> v = {1, 2, 3, 2, 4, 2};
    std::list<std::string> l = {"a", "b", "a", "c"};

    print_container(v);
    std::cout << "count_elements: " << count_elements(v) << '\n';
    std::cout << "count_value(2): " << count_value(v, 2) << '\n';

    print_container(l);
    std::cout << "count_value(\"a\"): " << count_value(l, std::string("a")) << '\n';

    // count_value(v, "hello");  // 编译错误：const char* 与 int 不可比较
    return 0;
}
```

### 5.7 数值算法的概念层级

**标准**：C++20

```cpp
#include <concepts>
#include <iterator>
#include <numeric>
#include <vector>
#include <list>
#include <iostream>

// 5.7.1 概念层级
template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
    { T{0} };
};

template<typename T>
concept Subtractable = requires(T a, T b) {
    { a - b } -> std::same_as<T>;
};

template<typename T>
concept Multiplicable = requires(T a, T b) {
    { a * b } -> std::same_as<T>;
    { T{1} };
};

template<typename T>
concept Numeric = Addable<T> && Subtractable<T> && Multiplicable<T>;

// 5.7.2 受约束的累加算法
template<typename Iter, typename T = typename std::iterator_traits<Iter>::value_type>
requires std::input_iterator<Iter> && Numeric<T>
T my_accumulate(Iter first, Iter last, T init = T{0}) {
    while (first != last) {
        init = init + *first;
        ++first;
    }
    return init;
}

// 5.7.3 受约束的均值算法
template<typename Iter, typename T = typename std::iterator_traits<Iter>::value_type>
requires std::input_iterator<Iter> && Numeric<T>
&& std::convertible_to<T, double>
double my_average(Iter first, Iter last) {
    T sum = T{0};
    std::size_t count = 0;
    while (first != last) {
        sum = sum + *first;
        ++count;
        ++first;
    }
    return count == 0 ? 0.0 : static_cast<double>(sum) / count;
}

int main() {
    std::vector<int> v = {1, 2, 3, 4, 5};
    std::cout << "Sum: " << my_accumulate(v.begin(), v.end()) << '\n';        // 15
    std::cout << "Average: " << my_average(v.begin(), v.end()) << '\n';       // 3.0

    std::list<double> l = {1.5, 2.5, 3.5};
    std::cout << "Sum: " << my_accumulate(l.begin(), l.end()) << '\n';        // 7.5
    std::cout << "Average: " << my_average(l.begin(), l.end()) << '\n';       // 2.5
    return 0;
}
```

### 5.8 接口设计：可打印概念

**标准**：C++20

```cpp
#include <concepts>
#include <iostream>
#include <sstream>
#include <string>

// 5.8.1 可打印概念
template<typename T>
concept Printable = requires(const T& x, std::ostream& os) {
    { os << x } -> std::same_as<std::ostream&>;
};

template<typename T>
concept Formattable = requires(const T& x, std::ostream& os) {
    { x.format(os) } -> std::same_as<void>;
};

template<typename T>
concept Displayable = Printable<T> || Formattable<T>;

// 5.8.2 通用打印函数
void print(const Displayable auto& x) {
    if constexpr (Formattable<decltype(x)>) {
        x.format(std::cout);
    } else {
        std::cout << x;
    }
}

// 5.8.3 自定义类型，实现 Formattable
struct Point {
    int x, y;
    void format(std::ostream& os) const {
        os << '(' << x << ", " << y << ')';
    }
};

// 5.8.4 通用日志函数
template<Displayable T>
void log(const std::string& tag, const T& value) {
    std::cout << '[' << tag << "] ";
    print(value);
    std::cout << '\n';
}

int main() {
    log("int", 42);
    log("string", std::string("hello"));
    log("point", Point{3, 4});
    return 0;
}
```

### 5.9 RAII 容器与资源管理概念

**标准**：C++20

```cpp
#include <concepts>
#include <memory>
#include <type_traits>

// 5.9.1 资源管理概念
template<typename T>
concept ResourceType = requires(T t) {
    { t.acquire() };
    { t.release() };
    { t.is_valid() } -> std::convertible_to<bool>;
};

template<typename T>
concept Handle = requires(T t) {
    typename T::handle_type;
    { t.get() } -> std::convertible_to<typename T::handle_type>;
    { T::invalid() } -> std::convertible_to<typename T::handle_type>;
};

// 5.9.2 通用 RAII 包装器
template<typename R>
requires ResourceType<R>
class RaiiWrapper {
public:
    RaiiWrapper(R resource) : resource_(std::move(resource)) {
        resource_.acquire();
    }
    ~RaiiWrapper() {
        if (resource_.is_valid()) {
            resource_.release();
        }
    }
    RaiiWrapper(const RaiiWrapper&) = delete;
    RaiiWrapper& operator=(const RaiiWrapper&) = delete;
    RaiiWrapper(RaiiWrapper&& other) noexcept
        : resource_(std::move(other.resource_)) {
        other.resource_ = R{};  // 使 other 失效
    }
    RaiiWrapper& operator=(RaiiWrapper&& other) noexcept {
        if (this != &other) {
            if (resource_.is_valid()) {
                resource_.release();
            }
            resource_ = std::move(other.resource_);
            other.resource_ = R{};
        }
        return *this;
    }
    R& get() { return resource_; }
    const R& get() const { return resource_; }
private:
    R resource_;
};

// 5.9.3 示例资源：文件
struct FileResource {
    int fd_;
    FileResource() : fd_(-1) {}
    FileResource(int fd) : fd_(fd) {}
    void acquire() { /* 打开文件 */ }
    void release() { /* 关闭文件 */ }
    bool is_valid() const { return fd_ >= 0; }
};

static_assert(ResourceType<FileResource>);

using FileGuard = RaiiWrapper<FileResource>;
```

### 5.10 完整的 Range 适配器示例

**标准**：C++20

```cpp
#include <concepts>
#include <ranges>
#include <vector>
#include <algorithm>
#include <iostream>

// 5.10.1 自定义 Range 概念
template<typename R>
concept NumericRange = std::ranges::range<R> &&
    std::integral<std::ranges::range_value_t<R>>;

template<typename R>
concept SortedRange = std::ranges::forward_range<R> &&
    std::totally_ordered<std::ranges::range_value_t<R>>;

// 5.10.2 受约束的 Range 算法
template<NumericRange R>
std::ranges::range_value_t<R> sum_range(R&& r) {
    std::ranges::range_value_t<R> total = 0;
    for (auto&& x : r) {
        total += x;
    }
    return total;
}

template<SortedRange R>
bool is_sorted_strict(R&& r) {
    auto it = std::ranges::begin(r);
    auto end = std::ranges::end(r);
    if (it == end) return true;
    auto prev = *it;
    ++it;
    for (; it != end; ++it) {
        if (!(*it > prev)) return false;
        prev = *it;
    }
    return true;
}

// 5.10.3 与 std::ranges 适配器组合
template<std::ranges::input_range R>
auto squared(R&& r) {
    return std::views::transform(std::forward<R>(r),
        [](auto x) { return x * x; });
}

template<std::ranges::input_range R>
auto filtered_positive(R&& r) {
    return std::views::filter(std::forward<R>(r),
        [](auto x) { return x > 0; });
}

int main() {
    std::vector<int> v = {-3, -1, 2, 4, -5, 6};

    // 链式适配器：过滤正数 → 平方 → 求和
    auto sq_pos = v | filtered_positive | squared;
    std::cout << "Sum of squared positives: " << sum_range(sq_pos) << '\n';  // 56

    std::vector<int> sorted_v = {1, 2, 3, 4, 5};
    std::cout << "is_sorted_strict: " << is_sorted_strict(sorted_v) << '\n';  // 1
    return 0;
}
```

---

## 6. 对比分析

### 6.1 C++20 Concepts 与 SFINAE / `std::enable_if` 对比

| 维度 | SFINAE + `std::enable_if` | C++20 Concepts |
| ---- | ------------------------- | -------------- |
| **语法** | `template<typename T, typename = std::enable_if_t<C<T>>>` | `template<C T>` 或 `template<typename T> requires C<T>` |
| **可读性** | 差，约束隐藏在模板参数列表 | 优，约束显式声明 |
| **错误信息** | 数百行模板实例化栈 | 简洁，指向违反的概念 |
| **重载分发** | 通过互斥 `enable_if` 条件实现，易产生歧义 | 基于子句包含自动排序 |
| **复杂约束** | 需 `void_t` + `decltype` + `declval` 技巧 | `requires` 表达式直接表达 |
| **编译速度** | 较慢，需多次模板替换尝试 | 较快，约束检查早于实例化 |
| **诊断精度** | 低，失败被静默排除 | 高，明确指出失败约束 |
| **标准化** | C++11 起标准化 | C++20 标准化 |
| **向后兼容** | C++11/14/17/20/23 全支持 | 仅 C++20+ |
| **编译器支持** | 所有主流编译器 | GCC 10+, Clang 10+, MSVC 19.29+ |

### 6.2 C++20 Concepts 与 Rust Trait Bounds 对比

| 维度 | C++20 Concepts | Rust Trait Bounds |
| ---- | -------------- | ------------------ |
| **声明方式** | `template<typename T> concept C = ...;` | `trait C { fn method(&self); }` |
| **类型实现** | 隐式：满足结构要求即建模 | 显式：`impl C for T { ... }` |
| **运行时开销** | 无，完全编译期 | 无（单态化）或动态分发（`dyn Trait`） |
| **孤儿规则** | 无：可在任意命名空间定义概念 | 有：实现 trait 受孤儿规则限制 |
| **关联类型** | 通过 `typename T::U` 在 requires 中表达 | `type Item;` 显式声明 |
| **泛型推导** | 强，基于函数参数推导 | 强，基于函数参数推导 |
| **多约束组合** | `requires C1<T> && C2<T>` | `T: C1 + C2` |
| **概念地图** | 无（结构式） | 显式 impl（声明式） |
| **错误信息** | 较好，但深度概念可能复杂 | 优秀，明确指出缺失的 trait |

### 6.3 C++20 Concepts 与 Haskell Type Classes 对比

| 维度 | C++20 Concepts | Haskell Type Classes |
| ---- | -------------- | -------------------- |
| **声明** | `template<typename T> concept C = requires(T a) { ... };` | `class C a where method :: a -> ...` |
| **实例** | 隐式（结构式） | 显式（声明式） |
| **字典传递** | 无运行时字典 | 编译器自动生成字典传递 |
| **全局唯一性** | 无约束 | 全局唯一（除非使用 `MULTIPARAMTYPECLASSES`） |
| **函数依赖** | 无 | `class C a b | a -> b` |
| **高阶多态** | 受限，通过模板模板参数 | 完整支持高阶多态 |
| **类型族** | 无对应概念 | `type family F a` 关联类型族 |
| **性能** | 零运行时开销 | 零（特化）或字典传递开销 |

### 6.4 C++20 Concepts 与 Java Bounded Generics 对比

| 维度 | C++20 Concepts | Java Bounded Generics |
| ---- | -------------- | --------------------- |
| **约束语法** | `template<C T>` | `<T extends C>` |
| **类型擦除** | 无，模板实例化生成独立代码 | 有，运行时擦除到 `Object` |
| **运行时类型信息** | 无 | 有（可通过 `instanceof` 检查） |
| **方法调用** | 编译期决议，可内联 | 通过虚表分发，不可内联 |
| **接口实现** | 隐式（结构式） | 显式 `implements C` |
| **运行时开销** | 零 | 装箱/拆箱 + 虚调用 |
| **错误信息** | 编译期明确 | 编译期一般 |

### 6.5 C++20 Concepts 与 Swift Protocols 对比

| 维度 | C++20 Concepts | Swift Protocols |
| ---- | -------------- | --------------- |
| **声明** | `concept C = requires(T a) { ... };` | `protocol C { func method() }` |
| **实现** | 隐式 | 显式 `extension T: C { ... }` |
| **静态分发** | 默认 | 默认（generic constraints） |
| **动态分发** | 不支持 | 支持（`protocol` existentials） |
| **关联类型** | 通过 `typename T::U` | `associatedtype Item` |
| **Witness Table** | 无 | 有（动态分发用） |

### 6.6 概念的"结构式"vs"声明式"权衡

C++20 Concepts 采用**结构式** (structural) 约束：类型 T 满足概念 C 的所有要求即视为 T 建模 C，无需显式声明。这与 Rust/Haskell/Java 的**声明式** (nominal) 约束相反。

结构式的优点：

1. **非侵入式**：可为已有类型添加新概念支持，无需修改类型定义。
2. **组合性**：概念可自由组合，类型自动满足复合概念。
3. **适配器友好**：第三方库可定义领域概念，应用于标准库类型。

结构式的缺点：

1. **意外满足**：类型可能意外满足概念，导致非预期重载分发。
2. **无概念地图**：无法显式声明"类型 T 建模概念 C"，编译器无法验证意图。
3. **隐式约束变化**：修改类型可能无意中破坏概念满足关系。

C++0x 早期提案（2008-2009）曾包含概念地图 (concept maps)，允许显式声明 `concept_map C<T> { ... }`，但因复杂度过高被否决。C++20 选择了纯结构式，简化实现但牺牲了显式性。

---

## 7. 常见陷阱与最佳实践

### 7.1 常见陷阱

#### 陷阱 1：过度约束

```cpp
// 反例：要求 operator+ 但实际只需 operator+=
template<typename T>
concept BadAddable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

template<typename T>
requires BadAddable<T>
T sum(const std::vector<T>& v) {
    T result = T{};
    for (const auto& x : v) {
        result = result + x;  // 实际可以用 += 优化
    }
    return result;
}

// 正例：根据实际需要约束
template<typename T>
concept GoodAddable = requires(T a, T b) {
    { a += b } -> std::same_as<T&>;  // 仅要求 +=
};

template<typename T>
requires GoodAddable<T>
T sum(const std::vector<T>& v) {
    T result = T{};
    for (const auto& x : v) {
        result += x;
    }
    return result;
}
```

#### 陷阱 2：约束与 `if constexpr` 冗余

```cpp
// 反例：约束已保证 T 是整数，仍用 if constexpr 检查
template<std::integral T>
void process(T x) {
    if constexpr (std::is_integral_v<T>) {  // 冗余，恒为 true
        std::cout << x;
    }
}

// 正例：约束已表达意图，无需运行时检查
template<std::integral T>
void process(T x) {
    std::cout << x;
}

// 正例：用约束分发实现不同行为
template<std::integral T>
void process(T x) {
    std::cout << "Integral: " << x;
}

template<std::floating_point T>
void process(T x) {
    std::cout << "Floating: " << x;
}
```

#### 陷阱 3：概念递归导致归一化爆炸

```cpp
// 反例：递归概念，归一化可能导致编译器栈溢出
template<typename T>
concept DeeplyNested = requires(T t) {
    requires DeeplyNested<decltype(t.next())>;  // 递归约束
};

// 正例：用迭代或展开替代递归
template<typename T>
concept Iterable = requires(T t) {
    { t.begin() };
    { t.end() };
    { *t.begin() };
    { ++t.begin() };
};
```

#### 陷阱 4：原子约束不等价导致子句包含失败

```cpp
// 反例：两个语义相同但语法不同的概念，无法触发子句包含
template<typename T>
concept Integral1 = std::is_integral_v<T>;

template<typename T>
concept Integral2 = std::is_integral_v<T>;  // 看似相同，但是独立定义

template<typename T>
requires Integral1<T>
void f(T);  // f1

template<typename T>
requires Integral2<T>
void f(T);  // f2

f(42);  // 歧义错误：Integral1 与 Integral2 不等价（不同源码位置）

// 正例：复用同一概念定义
template<typename T>
requires std::integral<T>
void g(T);  // g1

template<typename T>
requires std::signed_integral<T>  // 标准库概念，定义明确
void g(T);  // g2

g(42);  // 选 g2：signed_integral 蕴含 integral
```

#### 陷阱 5：简写模板的意外约束

```cpp
// 反例：简写模板的 auto 可能引入意外约束
void print(const auto& x) {
    std::cout << x;
}

struct NotPrintable {};

print(NotPrintable{});  // 编译错误，但错误信息可能指向 std::ostream 的内部实现

// 正例：显式约束
template<typename T>
requires requires(T t, std::ostream& os) { os << t; }
void print(const T& x) {
    std::cout << x;
}

print(NotPrintable{});  // 明确错误：不满足概念要求
```

#### 陷阱 6：`requires` 子句与 `requires` 表达式混淆

```cpp
// 反例：requires 子句中嵌套 requires 表达式，语法混乱
template<typename T>
requires requires(T t) { t.foo(); }  // 两个 requires 关键字
void call_foo(T t) {
    t.foo();
}

// 这是合法语法但风格不佳。改进方案：
template<typename T>
concept HasFoo = requires(T t) {
    t.foo();
};

template<typename T>
requires HasFoo<T>  // 清晰：引用命名概念
void call_foo(T t) {
    t.foo();
}
```

#### 陷阱 7：约束的析取导致重载歧义

```cpp
// 反例：析取约束可能产生不可比分发
template<typename T>
concept A = std::integral<T> || std::floating_point<T>;

template<typename T>
concept B = std::integral<T> || std::is_pointer_v<T>;

template<typename T> requires A<T> void f(T);  // f1
template<typename T> requires B<T> void f(T);  // f2

f(42);  // 歧义：A 与 B 不可比（A 有 floating_point，B 有 pointer）
f(3.14);  // 仅 A 满足，选 f1
f(nullptr);  // 仅 B 满足，选 f2

// 正例：用合取（更强约束）实现分发
template<typename T>
concept IntegralAndSigned = std::integral<T> && std::is_signed_v<T>;

template<typename T>
concept IntegralAndUnsigned = std::integral<T> && !std::is_signed_v<T>;

template<typename T> requires IntegralAndSigned<T> void g(T);
template<typename T> requires IntegralAndUnsigned<T> void g(T);

g(42);   // 选 IntegralAndSigned
g(42u);  // 选 IntegralAndUnsigned
```

### 7.2 最佳实践

#### 实践 1：命名概念，避免内联约束

```cpp
// 反例：内联 requires 表达式
template<typename T>
requires requires(T t) { t.foo(); t.bar(); } && std::integral<T>
void process(T t) { /* ... */ }

// 正例：提取命名概念
template<typename T>
concept FooBar = requires(T t) {
    t.foo();
    t.bar();
};

template<typename T>
concept IntegralFooBar = FooBar<T> && std::integral<T>;

template<typename T>
requires IntegralFooBar<T>
void process(T t) { /* ... */ }
```

#### 实践 2：概念分层，构建概念层级

```cpp
// 基础概念
template<typename T> concept Addable = requires(T a, T b) { { a + b } -> std::same_as<T>; };
template<typename T> concept Subtractable = requires(T a, T b) { { a - b } -> std::same_as<T>; };
template<typename T> concept Multiplicable = requires(T a, T b) { { a * b } -> std::same_as<T>; };
template<typename T> concept Divisible = requires(T a, T b) { { a / b } -> std::same_as<T>; };

// 组合概念
template<typename T> concept Arithmetic = Addable<T> && Subtractable<T> && Multiplicable<T>;
template<typename T> concept Field = Arithmetic<T> && Divisible<T>;

// 特化概念
template<typename T> concept OrderedField = Field<T> && std::totally_ordered<T>;

// 使用时按层级约束
template<OrderedField T>
T abs_diff(T a, T b) {
    return a > b ? a - b : b - a;
}
```

#### 实践 3：用概念替代 `static_assert`

```cpp
// 反例：static_assert 检查
template<typename T>
class Vector {
    static_assert(std::is_default_constructible_v<T>, "T must be default constructible");
    // ...
};

// 正例：概念约束
template<typename T>
requires std::default_initializable<T>
class Vector {
    // ...
};
```

#### 实践 4：概念文档化语义意图

```cpp
// 良好：概念名清晰表达语义
template<typename T>
concept Hashable = requires(T t) {
    { std::hash<T>{}(t) } -> std::convertible_to<std::size_t>;
};

template<typename T>
concept Comparable = requires(T a, T b) {
    { a < b } -> std::convertible_to<bool>;
    { a == b } -> std::convertible_to<bool>;
};

// 反例：概念名过于泛化
template<typename T>
concept Type1 = requires(T t) { t.foo(); };  // Type1 不表达语义
```

#### 实践 5：约束检查与编译期测试

```cpp
#include <concepts>
#include <type_traits>

template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

// 编译期单元测试：验证概念满足关系
static_assert(Addable<int>);
static_assert(Addable<double>);
static_assert(Addable<std::string>);
static_assert(!Addable<void*>);  // 指针无 operator+

// 验证子句包含
template<typename T>
concept SignedAddable = Addable<T> && std::signed_integral<T>;

static_assert(SignedAddable<int>);
static_assert(!SignedAddable<unsigned>);  // unsigned 不满足 signed_integral
```

#### 实践 6：错误信息友好化

```cpp
// 反例：错误信息指向内部模板
template<typename Iter>
auto sum(Iter first, Iter last) {
    typename Iter::value_type s{};
    while (first != last) { s += *first; ++first; }
    return s;
}

sum(42, 100);  // 错误信息可能指向 std::iterator_traits 内部

// 正例：用概念提供清晰错误
template<typename Iter>
requires std::input_iterator<Iter>
auto sum(Iter first, Iter last) {
    std::iter_value_t<Iter> s{};
    while (first != last) { s += *first; ++first; }
    return s;
}

sum(42, 100);  // 错误：int 不满足 std::input_iterator
```

#### 实践 7：跨标准兼容

```cpp
// 兼容 C++17/20 的宏方案
#if __cplusplus >= 202002L
    #define REQUIRES_INTEGRAL std::integral
    #define ENABLE_IF_INTEGRAL(T)
#else
    #define REQUIRES_INTEGRAL typename
    #define ENABLE_IF_INTEGRAL(T) , typename = std::enable_if_t<std::is_integral_v<T>>
#endif

template<REQUIRES_INTEGRAL T ENABLE_IF_INTEGRAL(T)>
T add_one(T x) { return x + 1; }
```

---

## 8. 工程实践

### 8.1 项目结构组织

推荐的项目结构：

```text
project/
├── CMakeLists.txt
├── include/
│   └── mylib/
│       ├── concepts/
│       │   ├── numeric.hpp        # 数值概念
│       │   ├── container.hpp      # 容器概念
│       │   ├── callable.hpp       # 可调用概念
│       │   └── iterator.hpp       # 迭代器概念
│       ├── algorithms/
│       │   ├── sorting.hpp
│       │   └── numeric.hpp
│       └── mylib.hpp              # 总头文件
├── tests/
│   └── concepts/
│       └── test_numeric.cpp
└── examples/
    └── demo.cpp
```

### 8.2 概念库的组织模式

**`include/mylib/concepts/numeric.hpp`**：

```cpp
#pragma once

#include <concepts>
#include <type_traits>

namespace mylib {

// 基础数值概念
template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

template<typename T>
concept Subtractable = requires(T a, T b) {
    { a - b } -> std::same_as<T>;
};

template<typename T>
concept Multiplicable = requires(T a, T b) {
    { a * b } -> std::same_as<T>;
};

template<typename T>
concept Divisible = requires(T a, T b) {
    { a / b } -> std::same_as<T>;
    { T{1} };
};

// 组合数值概念
template<typename T>
concept Arithmetic = Addable<T> && Subtractable<T> && Multiplicable<T>;

template<typename T>
concept Field = Arithmetic<T> && Divisible<T>;

template<typename T>
concept OrderedField = Field<T> && std::totally_ordered<T>;

// 数值类型特化
template<typename T>
concept IntegralLike = std::integral<T> && Arithmetic<T>;

template<typename T>
concept FloatingPointLike = std::floating_point<T> && Field<T>;

}  // namespace mylib
```

### 8.3 CMake 集成

**`CMakeLists.txt`**：

```cmake
cmake_minimum_required(VERSION 3.20)
project(mylib CXX)

# 要求 C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 编译器选项
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    add_compile_options(-Wall -Wextra -Wpedantic -Wconversion)
    add_compile_options(-fconcepts)  # 早期 GCC 需要显式开启
endif()

# 库目标
add_library(mylib INTERFACE)
target_include_directories(mylib INTERFACE
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# 测试
enable_testing()
add_executable(test_concepts tests/concepts/test_numeric.cpp)
target_link_libraries(test_concepts PRIVATE mylib)
add_test(NAME test_concepts COMMAND test_concepts)

# 示例
add_executable(demo examples/demo.cpp)
target_link_libraries(demo PRIVATE mylib)
```

### 8.4 概念的单元测试

**`tests/concepts/test_numeric.cpp`**：

```cpp
#include <concepts>
#include <cstdint>
#include <string>
#include <mylib/concepts/numeric.hpp>

using namespace mylib;

// 基础类型满足关系
static_assert(Addable<int>);
static_assert(Addable<std::string>);
static_assert(!Addable<void*>);

static_assert(Arithmetic<int>);
static_assert(Arithmetic<double>);
static_assert(!Arithmetic<std::string>);  // string 不支持 -

static_assert(Field<double>);
static_assert(Field<float>);
static_assert(!Field<int>);  // int 整除，不是 Field

static_assert(OrderedField<double>);
static_assert(!OrderedField<std::string>);

// 子句包含关系验证
template<typename T> requires Field<T> void f1(T);
template<typename T> requires OrderedField<T> void f2(T);

// 若 OrderedField ⊨ Field，则 f2 应优先于 f1（在两者都满足时）
// 可通过重载决议测试验证

int main() { return 0; }
```

### 8.5 编译器支持矩阵

| 编译器 | 版本 | Concepts 支持 | 备注 |
| ------ | ---- | -------------- | ---- |
| GCC | 10.1+ | 完整支持 | 10.0 需 `-fconcepts`，10.1+ 默认开启 |
| GCC | 11+ | 完整支持 | 含 `<ranges>` |
| Clang | 10+ | 实验性 | 需 `-fconcepts` 或 `-std=c++20` |
| Clang | 12+ | 完整支持 | 含 `<ranges>` |
| MSVC | 19.29 (VS 16.11) | 完整支持 | `/std:c++20` |
| MSVC | 19.32+ | 完整支持 | 含 `<ranges>` |
| Apple Clang | 13+ | 完整支持 | macOS 12+ |

### 8.6 CI/CD 配置

**`.github/workflows/ci.yml`**：

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        compiler: [g++-10, g++-11, g++-12, clang++-12, clang++-14]
    steps:
      - uses: actions/checkout@v3
      - name: Install compiler
        run: |
          sudo apt-get update
          sudo apt-get install -y ${{ matrix.compiler }}
      - name: Configure
        env:
          CXX: ${{ matrix.compiler }}
        run: cmake -B build -DCMAKE_BUILD_TYPE=Release
      - name: Build
        run: cmake --build build -j
      - name: Test
        run: cd build && ctest --output-on-failure
```

### 8.7 性能影响分析

Concepts 对编译时间与运行时性能的影响：

**编译时间**：

- 概念检查本身的开销：极小，约 1-5% 增加。
- 减少模板实例化失败的开销：节省 10-30% 的错误路径开销。
- 净影响：多数项目编译时间持平或略降。

**运行时性能**：

- 零运行时开销：所有约束检查在编译期完成。
- 内联机会：基于约束的分发允许编译器内联，相比 SFINAE 无差异。
- 代码生成：与无约束模板相同，无额外指令。

**二进制体积**：

- 概念本身不增加体积。
- 基于约束的重载分发可能导致多个特化版本，增加体积。
- 实践中影响可忽略（<1%）。

### 8.8 与既有代码兼容

C++20 Concepts 与 C++17 代码共存策略：

```cpp
// 兼容方案：宏抽象
#if __cplusplus >= 202002L || (defined(_MSVC_LANG) && _MSVC_LANG >= 202002L)
    #define MYLIB_HAS_CONCEPTS 1
#else
    #define MYLIB_HAS_CONCEPTS 0
#endif

#if MYLIB_HAS_CONCEPTS
    #include <concepts>
    #define MYLIB_REQUIRES_INTEGRAL std::integral
    #define MYLIB_REQUIRES_FLOATING std::floating_point
    #define MYLIB_CONSTRAINT(C, T) C<T>
#else
    #define MYLIB_REQUIRES_INTEGRAL typename
    #define MYLIB_REQUIRES_FLOATING typename
    #define MYLIB_CONSTRAINT(C, T) true
#endif

template<typename T>
#if MYLIB_HAS_CONCEPTS
requires std::integral<T>
#else
typename = std::enable_if_t<std::is_integral_v<T>>
#endif
T add_one(T x) { return x + 1; }
```

---

## 9. 案例研究

### 9.1 案例一：标准库 `<ranges>` 设计

C++20 `<ranges>` 库是 Concepts 应用的旗舰案例。其设计原则：

1. **基于概念分层**：迭代器概念（`input_iterator` → `forward_iterator` → `bidirectional_iterator` → `random_access_iterator` → `contiguous_iterator`）形成层级。
2. **算法约束明示**：`std::ranges::sort` 要求 `random_access_iterator`，`std::ranges::copy` 要求 `input_iterator` + `output_iterator`。
3. **投影机制**：通过 `Proj` 投影类型约束，支持基于元素属性的算法。

```cpp
// std::ranges::sort 的实际签名
namespace std::ranges {
    template<std::random_access_iterator I, std::sentinel_for<I> S,
             class Comp = ranges::less, class Proj = std::identity>
    requires std::sortable<I, Comp, Proj>
    constexpr I sort(I first, S last, Comp comp = {}, Proj proj = {});
}
```

`std::sortable` 概念组合：

```cpp
template<typename I, typename C = ranges::less, typename P = identity>
concept sortable =
    permutable<I> &&
    indirect_strict_weak_order<C, projected<I, P>>;
```

层层递归的概念约束，确保 `sort` 仅在合理类型上实例化，错误信息清晰。

### 9.2 案例二：`std::expected` (C++23)

C++23 引入的 `std::expected<T, E>` 大量使用概念约束：

```cpp
namespace std {
    template<class T, class E>
    class expected {
        static_assert(!std::is_reference_v<T>);
        static_assert(!std::is_void_v(T));
        // ...
    };

    template<class T, class E>
    concept Expected = /* ... */;
}
```

`expected` 的 `and_then`、`or_else`、`transform` 等组合操作均通过概念约束参数：

```cpp
template<class T, class E>
template<class F>
constexpr auto and_then(F&& f) &&
requires std::invocable<F, T> {
    using U = std::remove_cvref_t<std::invoke_result_t<F, T>>;
    static_assert(/* U 是 expected 特化 */);
    // ...
}
```

### 9.3 案例三：协程 (Coroutines) 与概念

C++20 协程的 `promise_type` 接口可通过概念约束：

```cpp
template<typename T>
concept Promise = requires {
    typename T::promise_type;
    requires requires(typename T::promise_type p) {
        p.initial_suspend();
        p.final_suspend();
        p.get_return_object();
        p.unhandled_exception();
    };
};

template<Promise P>
class CoroutineWrapper {
public:
    explicit CoroutineWrapper(P&& promise) : promise_(std::forward<P>(promise)) {}
    // ...
private:
    P promise_;
};
```

### 9.4 案例四：数值线性代数库

P1673 `<linalg>` 提案基于概念约束矩阵类型：

```cpp
template<class T>
concept in_vector = std::ranges::input_range<T> &&
    /* vector layout */;

template<class T>
concept out_vector = std::ranges::output_range<T> &&
    /* vector layout */;

template<class T>
concept in_matrix = /* ... */;

template<in_vector InVec, out_vector OutVec>
void copy(InVec src, OutVec dst) {
    // 实现
}

template<in_matrix InMat, out_matrix OutMat>
requires std::same_as<typename InMat::value_type, typename OutMat::value_type>
void copy_matrix(InMat src, OutMat dst) {
    // 实现
}
```

### 9.5 案例五：Boost 1.75+ 的 Concepts 迁移

Boost 库在 1.75 起逐步迁移至 C++20 Concepts。以 Boost.Multiprecision 为例：

```cpp
// Boost.Multiprecision 的概念约束（简化）
template<typename T>
concept BoostNumber = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
    { a - b } -> std::same_as<T>;
    { a * b } -> std::same_as<T>;
    { a / b } -> std::same_as<T>;
    { -a } -> std::same_as<T>;
    { T{0} };
    { T{1} };
};

template<BoostNumber T>
T compute(T a, T b) {
    return (a + b) * (a - b);
}
```

迁移收益：

1. **错误信息改善**：用户传入不兼容类型时，错误信息直接指向 `BoostNumber` 概念。
2. **重载分发清晰**：基于概念自动选择 `int`、`float`、`boost::multiprecision::cpp_int` 等实现。
3. **文档化语义**：概念显式声明类型的语义要求，替代散落的 `static_assert`。

### 9.6 案例六：企业级 ORM 库

某企业 ORM 库使用概念约束查询构建器：

```cpp
template<typename T>
concept Entity = requires {
    typename T::id_type;
    requires std::default_initializable<T>;
    requires