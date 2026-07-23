---
order: 82
title: C++代码规范
module: cpp
category: C++
difficulty: beginner
description: C++编码规范与最佳实践
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/内存管理
  - cpp/C++与Rust对比
  - cpp/C++与WebAssembly
  - cpp/C++反射与元编程
prerequisites:
  - cpp/概述与现代标准
---

# C++ 代码规范

> 本文档系统讲解 C++ 代码规范的形式化基础、主流规范体系、工具链落地与工程实践。内容覆盖 ISO/IEC 14882:2023 中与编码约束相关的条款、MISRA C++:2023、AUTOSAR C++14、Google C++ Style Guide、LLVM Coding Standards、CppCoreGuidelines、clang-tidy、clang-format 等主流规范与工具，目标达到海外高校教学水准。

---

## 1. 学习目标

本节使用 Bloom 分类法刻画学习者应达到的认知层级。每一层级对应可观测的行为动词，便于自评与教学评估。

### 1.1 记忆（Remember）

- 列举五大主流 C++ 代码规范体系的名称：MISRA C++、AUTOSAR C++、Google C++ Style Guide、LLVM Coding Standards、CppCoreGuidelines。
- 复述命名规范的四种主流风格：PascalCase、camelCase、snake_case、UPPER_CASE。
- 背诵 `clang-format` 的核心配置项：`BasedOnStyle`、`IndentWidth`、`ColumnLimit`、`AllowShortFunctionsOnASingleLine`。
- 列举 `clang-tidy` 的六类检查类别：`bugprone-`、`cert-`、`cppcoreguidelines-`、`google-`、`llvm-`、`modernize-`。

### 1.2 理解（Understand）

- 解释 C++ 代码规范存在的根本动机：可读性、可维护性、安全性、可移植性、团队协作。
- 阐述 MISRA C++ 与 AUTOSAR C++ 在安全关键系统中的作用，以及它们与 ISO 26262、IEC 61508 的关系。
- 描述 `clang-format` 与 `clang-tidy` 的分工：前者负责格式化（syntax-level），后者负责语义检查（semantic-level）。
- 区分"规则 (rule)"、"指南 (guideline)"、"约定 (convention)"三者的层次差异。

### 1.3 应用（Apply）

- 使用 `clang-format` 配置文件为项目统一格式化风格。
- 使用 `clang-tidy` 配置文件启用特定检查类别，并修复报告的违规。
- 在 CMake 工程中集成 `clang-format` 与 `clang-tidy`，实现提交前自动检查。
- 实现符合 Google C++ Style Guide 的命名、头文件、类设计规范。

### 1.4 分析（Analyze）

- 对比五大主流规范在命名、异常、模板、并发等核心议题上的立场差异。
- 解构 CppCoreGuidelines 的设计哲学：类型安全、资源安全、错误处理的统一框架。
- 分析 `clang-tidy` 静态分析的能力边界与误报率控制策略。
- 评估特定规则（如"禁用异常"、"禁用 RTTI"）在不同应用场景下的合理性。

### 1.5 评价（Evaluate）

- 评估在创业团队、大型企业、开源社区、安全关键系统四类组织下应采用何种规范策略。
- 判断特定代码片段违反了哪些规范条目，并给出修复优先级。
- 评审一份既有项目的代码规范合规度，给出改进路线图。

### 1.6 创造（Create）

- 设计一份适合团队规模的内部 C++ 代码规范文档，融合主流规范的优点。
- 构建一套基于 `clang-tidy` 自定义检查的工程化方案，捕获项目特定模式。
- 为开源项目编写 `CONTRIBUTING.md` 中的代码规范章节，配套自动化校验工具链。

---

## 2. 历史动机与发展脉络

C++ 代码规范的演进反映了语言复杂度、工程实践与安全需求之间的持续博弈。

### 2.1 早期：无规范时代（1985 - 1995）

C++ 早期（Cfront 时代）几乎没有统一的代码规范。Bjarne Stroustrup 在《The C++ Programming Language》第一版（1985）中给出了一些命名建议（如类型名首字母大写、变量名小写），但并未形成系统性规范。各组织自行约定，代码风格差异巨大。

这一时期的主要问题：

1. 命名混乱：`HungarianNotation`、`m_member`、`member_` 等多种风格并存。
2. 头文件包含无序，导致编译依赖爆炸。
3. 资源管理依赖手工 `new`/`delete`，内存泄漏频发。
4. 异常安全意识薄弱，构造函数抛异常导致资源泄漏。

### 2.2 企业规范的兴起（1995 - 2005）

随着 C++ 在电信、金融、航空等领域的普及，企业开始制定内部规范：

- **1996 年**：Lockheed Martin 发布 JSF AV C++ Coding Standards（F-35 项目）。
- **1998 年**：MISRA C:1998 发布，奠定安全关键 C 规范基础。
- **2000 年**：Google 内部 C++ Style Guide 起步（基于 C++98）。
- **2003 年**：Sutter 与 Alexandrescu 出版《C++ Coding Standards: 101 Rules, Guidelines, and Best Practices》，成为业界广泛参考。

### 2.3 MISRA C++ 与 AUTOSAR C++（2008 - 至今）

**MISRA C++:2008** 由 MISRA 联盟发布，基于 C++03，提供 200+ 条规则，覆盖安全关键系统。规则分级：

- **Mandatory（强制）**：不可违反，违反将导致严重风险。
- **Required（必须）**：强制遵守，违反需记录偏离 (deviation)。
- **Advisory（建议）**：推荐遵守，违反需评估影响。

**MISRA C++:2023** 基于 C++17/C++20 更新，新增对智能指针、`constexpr`、concept、协程的规则，是当前最新版本。

**AUTOSAR C++14** 由汽车软件联盟发布，基于 C++14，专注汽车 ECU。规则更严格，覆盖更广：

- A0-1-1：项目应使用单一 C++ 标准。
- A7-1-1：`const` 应优先于 `constexpr` 用于编译期常量（除非必要）。
- A18-5-2：禁用全局 `new`/`delete`，必须用 placement new。
- A27-0-1：禁用 `std::shared_ptr`（在安全关键场景）。

### 2.4 Google C++ Style Guide（2003 - 至今）

Google C++ Style Guide 是业界最有影响力的开源 C++ 规范之一。其设计哲学：

1. **可读性优先**：代码阅读次数远多于编写。
2. **一致性**：全公司代码风格统一。
3. **保守性**：避免使用易误用的特性（如异常、RTTI、多重继承）。
4. **可管理性**：大规模代码库（数十亿行）的可维护性。

Google 规范的若干争议点：

- **禁用异常**：Google 因历史代码库兼容性禁用异常，但这与现代 C++ 实践相悖。
- **禁用 RTTI**：`dynamic_cast` 与 `typeid` 被限制使用。
- **头文件包含顺序**：强制按"对应头文件、C 系统头、C++ 系统头、其他库头、本项目头"排序。
- **命名风格**：类型 `PascalCase`、函数 `CamelCase`、变量 `snake_case`、常量 `kCamelCase`。

### 2.5 LLVM Coding Standards（2003 - 至今）

LLVM 项目的编码规范服务于编译器、调试器、JIT 等系统软件的开发。与 Google 规范的差异：

- 允许异常（但 LLVM 代码本身不使用）。
- 函数名 `camelCase`，与 Google 的 `CamelCase` 不同。
- 强调"避免过早抽象"。
- 对 `auto` 的使用更宽松。

### 2.6 CppCoreGuidelines（2015 - 至今）

CppCoreGuidelines 由 Bjarne Stroustrup 与 Herb Sutter 主导，目标是"帮助程序员编写更现代、更安全的 C++"。其核心思想：

1. **类型安全 (type safety)**：消除类型违规（如 `void*` 滥用、不安全转换）。
2. **资源安全 (resource safety)**：通过 RAII 保证资源不泄漏。
3. **错误安全 (error safety)**：通过异常、`std::expected`、错误码统一错误处理。
4. **可维护性 (maintainability)**：减少晦涩语法，提高可读性。

CppCoreGuidelines 配套 GSL (Guideline Support Library) 与 `clang-tidy` 检查，实现"可执行的规范"。

### 2.7 工具链的成熟（2010 - 至今）

代码规范的工程化落地依赖工具链：

- **clang-format**（2013）：基于 Clang 前端的格式化工具，支持 LLVM、Google、Chromium、Mozilla、WebKit 等内置风格，以及完全自定义配置。
- **clang-tidy**（2014）：基于 Clang 的静态分析工具，支持 600+ 内置检查，可通过 `.clang-tidy` 配置文件定制。
- **Include What You Use (IWYU)**（2010）：检查头文件包含的完整性。
- **cppcheck**（2007）：独立静态分析工具，专注常见错误模式。
- **PC-lint Plus**（2019）：商业静态分析工具，支持 MISRA C++、AUTOSAR C++ 规则集。

### 2.8 演进时间线

```text
1985  C++ 1.0                       Stroustrup
1995  企业内部规范兴起               电信、金融、航空
1996  JSF AV C++ Standards          Lockheed Martin F-35
2000  Google C++ Style Guide 起步   Google 内部
2003  Sutter《C++ Coding Standards》 101 Rules
2007  cppcheck                      Daniel Marjamäki
2008  MISRA C++:2008                MISRA 联盟
2010  Include What You Use          Google
2013  clang-format                  LLVM
2014  AUTOSAR C++14                 汽车软件联盟
2014  clang-tidy                    LLVM
2015  CppCoreGuidelines             Stroustrup & Sutter
2017  GSL (Guideline Support Lib)   Microsoft
2019  PC-lint Plus                  Gimpel
2023  MISRA C++:2023                基于 C++17/C++20
2026  C++26 草案规范                 ISO/IEC CD 14882
```

---

## 3. 形式化定义

本节给出 C++ 代码规范相关的形式化定义，涵盖标准引用、规则建模与工具能力刻画。

### 3.1 ISO/IEC 14882 标准中的约束条款

C++ 标准本身不规定"代码规范"，但若干条款与规范直接相关：

- **[intro.compliance]** 实现合规性：定义"合规实现"与"未定义行为"的边界。
- **[lex.charset]** 字符集：源代码字符集（UTF-8 自 C++20 起）。
- **[basic.scope]** 作用域：命名空间、块作用域的可见性规则。
- **[class.member.lookup]** 成员查找：避免命名冲突的形式化规则。
- **[conv.ptr]** 指针转换：`void*` 与具体类型指针的安全转换边界。
- **[expr.const]** 常量表达式：`constexpr` 的求值约束。
- **[except]** 异常处理：异常安全保证的形式化模型。

### 3.2 规则的形式化建模

一条代码规范规则可形式化为四元组：

$$
R = (P, C, S, L)
$$

其中：

- $P$：规则前提 (precondition)，描述规则适用的代码模式。
- $C$：规则结论 (conclusion)，描述合规代码应满足的性质。
- $S$：规则严重性 (severity)，取值 $\{\text{mandatory}, \text{required}, \text{advisory}\}$。
- $L$：规则层级 (level)，取值 $\{\text{style}, \text{semantic}, \text{safety}\}$。

例如，MISRA C++ 规则 A5-2-3（"指针不应转换为更对齐的类型"）可建模为：

$$
P = \exists \text{ cast } c : T_1^* \to T_2^* \text{ where } \text{alignof}(T_2) > \text{alignof}(T_1)
$$

$$
C = \text{no such cast exists}, \quad S = \text{required}, \quad L = \text{safety}
$$

### 3.3 命名规范的形式语法

命名规范可形式化为上下文无关文法 (CFG)。例如 Google 风格：

```ebnf
identifier ::= type-name | function-name | variable-name | constant-name | member-name

type-name        ::= PascalCase
function-name    ::= CamelCase
variable-name    ::= snake_case
constant-name    ::= "k" PascalCase
member-name      ::= snake_case "_"
enum-name        ::= PascalCase
enum-value       ::= kPascalCase | UPPER_CASE
namespace-name   ::= lower-case
file-name        ::= lower-case-with-dashes
```

其中：

- `PascalCase`：`[A-Z][a-zA-Z0-9]*`
- `CamelCase`：`[a-z][a-zA-Z0-9]*`
- `snake_case`：`[a-z][a-z0-9_]*`
- `UPPER_CASE`：`[A-Z][A-Z0-9_]*`

### 3.4 格式化的形式化模型

`clang-format` 的格式化过程可建模为语法树变换：

$$
\text{format} : \text{AST} \times \text{Config} \to \text{Source}
$$

其中 `Config` 是格式化选项的键值对集合，`Source` 是格式化后的源代码字符串。`clang-format` 的核心算法：

1. 解析源代码为 Clang AST。
2. 遍历 AST 节点，应用配置项决定缩进、换行、对齐、空格。
3. 生成格式化后的源代码。

关键配置项的形式化语义：

| 配置项                    | 类型           | 语义                                       |
| ------------------------- | -------------- | ------------------------------------------ |
| `IndentWidth`             | `int`          | 单次缩进的空格数                           |
| `ColumnLimit`             | `int`          | 单行最大字符数，超出则换行                 |
| `AllowShortFunctionsOnASingleLine` | `bool` | 是否允许短函数单行书写            |
| `BreakBeforeBraces`       | `enum`         | 大括号前的换行策略（`Allman`、`K&R`、等） |
| `PointerAlignment`        | `enum`         | 指针 `*` 的对齐方式                       |

### 3.5 静态分析的可判定性

静态分析的核心问题是：给定规则 $R = (P, C, S, L)$，判断程序 $\Pi$ 是否违反 $R$。

形式化地，定义违反函数：

$$
\text{violate} : R \times \Pi \to \{\text{true}, \text{false}, \text{unknown}\}
$$

返回 `unknown` 表示分析无法确定（由于停机问题等不可判定性）。三类分析精度：

1. **健全 (sound)**：若 $\text{violate}(R, \Pi) = \text{true}$，则 $\Pi$ 确实违反 $R$；但可能有漏报 (false negative)。
2. **完备 (complete)**：若 $\Pi$ 违反 $R$，则 $\text{violate}(R, \Pi) = \text{true}$；但可能有误报 (false positive)。
3. **健全且完备**：理论上不可达（因不可判定性）。

`clang-tidy` 的检查多数为"健全但非完备"，即可能漏报但避免误报。

---

## 4. 理论推导与原理解析

本节深入解析代码规范背后的理论原理。

### 4.1 命名规范的可读性模型

命名规范的核心目标是降低阅读成本。可读性可形式化为：

$$
\text{readability}(s) = \alpha \cdot \text{descriptiveness}(s) + \beta \cdot \text{consistency}(s) - \gamma \cdot \text{length}(s)
$$

其中：

- `descriptiveness`：名称的描述性，长且语义清晰的名称得分高。
- `consistency`：与周围代码的一致性，符合规范的名称得分高。
- `length`：名称长度，过长降低可读性。
- $\alpha, \beta, \gamma$：权重系数。

实证研究（Lawrie et al., 2007）表明，描述性比长度更重要。例如 `calculateTotalPrice` 比 `calcTP` 可读性高，尽管前者更长。

### 4.2 异常安全的数学保证

异常安全保证分为四级：

| 保证级别           | 形式化定义                                                |
| ------------------ | --------------------------------------------------------- |
| **No-throw**       | $\forall e : \text{throw}(e) \implies \text{false}$       |
| **Strong**         | 失败时状态回滚，$\text{fail} \implies \text{state}' = \text{state}$ |
| **Basic**          | 失败时不泄漏资源，$\text{fail} \implies \text{no-leak}$   |
| **No-throw-neutral**| 调用者异常穿透，不增加新异常                              |

CppCoreGuidelines 推荐：

- 析构函数、`swap`、移动操作、内存释放：**No-throw**。
- 公共 API：**Strong** 或 **Basic**。
- 内部辅助函数：**Basic** 即可。

实现 Strong 保证的关键技术是"复制-交换" (copy-and-swap)：

```cpp
T& T::operator=(const T& other) {
    T tmp(other);      // 强保证：若构造失败，*this 不变
    swap(*this, tmp);  // nothrow
    return *this;
}
```

### 4.3 RAII 的资源安全证明

RAII (Resource Acquisition Is Initialization) 保证资源生命周期与对象生命周期绑定。形式化地：

$$
\text{live}(r) \iff \text{live}(o) \quad \text{where } o \text{ owns } r
$$

其中 $r$ 是资源，$o$ 是 RAII 对象。当 $o$ 析构时，$r$ 被释放，无论析构原因（正常作用域退出、异常展开、`return` 等）。

RAII 的核心价值在于异常安全：

```cpp
void f() {
    std::lock_guard<std::mutex> lk(mtx);  // 加锁
    // ... 若此处抛异常，lk 析构自动解锁
    do_work();
}  // 正常退出，lk 析构解锁
```

对比 C 风格：

```cpp
void f() {
    pthread_mutex_lock(&mtx);
    do_work();  // 若抛异常（C 无异常，但 C++ 调用 C 代码可能），锁泄漏
    pthread_mutex_unlock(&mtx);
}
```

### 4.4 头文件依赖的编译时间模型

C++ 头文件包含是文本展开，导致依赖传递。设文件 $F$ 包含头文件集合 $H(F)$，则其传递闭包：

$$
H^*(F) = H(F) \cup \bigcup_{h \in H(F)} H^*(h)
$$

编译时间 $T(F)$ 近似为：

$$
T(F) \approx \sum_{h \in H^*(F)} t(h)
$$

其中 $t(h)$ 是头文件 $h$ 的解析时间。大型项目若不控制头文件依赖，$H^*(F)$ 可达数千个文件，编译时间爆炸。

减少依赖的技术：

1. **前向声明 (forward declaration)**：仅需指针/引用时，声明类而非包含头。
2. **PImpl 惯用法**：将实现细节移至 `.cpp`，头文件仅暴露指针。
3. **预编译头 (PCH)**：编译一次，多次复用。
4. **C++20 模块**：语义化模块边界，替代文本包含。

PImpl 的形式化效果：

$$
H^*(F_{\text{header}}) \supset H^*(F_{\text{pimpl-header}})
$$

即 PImpl 版本的头文件依赖严格减少。

### 4.5 类型安全的数学刻画

类型安全可分为三级：

| 级别                  | 定义                                                 | C++ 状态 |
| --------------------- | ---------------------------------------------------- | -------- |
| **强类型 (strong)**   | 无隐式类型违规，无 `void*` 滥用                      | 部分满足 |
| **弱类型 (weak)**     | 允许受控的隐式转换                                   | 默认状态 |
| **无类型 (untyped)**  | 无类型检查                                           | 不适用   |

CppCoreGuidelines 的目标是"尽可能接近强类型"。形式化地，类型违规集合：

$$
V(\Pi) = \{ \text{cast} : T_1 \to T_2 \mid \text{cast is unsafe} \}
$$

规范要求 $V(\Pi) = \emptyset$，即消除所有不安全转换。

常见不安全转换：

1. `reinterpret_cast`：类型双关，违反严格别名 (strict aliasing)。
2. `const_cast`：去除 `const`，可能导致 UB。
3. C 风格转换 `(T)x`：等价于多种 cast 的组合，最危险。
4. `void*` 中转：丢失类型信息。

### 4.6 一致性与团队协作的博弈

代码规范在团队中的一致性可建模为协调博弈 (coordination game)。设团队有 $n$ 个开发者，每人选择风格 $s_i \in S$（风格集合）。收益函数：

$$
u_i(s_i, s_{-i}) = \alpha \cdot \mathbb{1}[s_i = \text{preferred}_i] + \beta \cdot |\{j : s_j = s_i\}|
$$

其中第一项是个人偏好满足，第二项是与其他成员的一致性。当 $\beta > \alpha$ 时，纳什均衡为全员统一风格；当 $\alpha > \beta$ 时，可能分裂为多个风格派系。

代码规范的强制工具（如 `clang-format`）将博弈转化为单点解：开发者无选择权，一致性自动达成。

### 4.7 静态分析的复杂度

`clang-tidy` 检查的复杂度因规则而异：

| 检查类别              | 时间复杂度       | 空间复杂度     | 说明                          |
| --------------------- | ---------------- | -------------- | ----------------------------- |
| 词法检查              | $O(n)$           | $O(1)$         | 命名、格式                    |
| 语法检查              | $O(n)$           | $O(\log n)$    | 大括号、缩进                  |
| 语义检查（局部）      | $O(n \cdot k)$   | $O(k)$         | $k$ 为函数规模，如变量未用    |
| 语义检查（跨函数）    | $O(n^2)$         | $O(n)$         | 调用图分析                    |
| 数据流分析            | $O(n \cdot d^v)$ | $O(d^v)$       | $d$ 为分支因子，$v$ 为变量数  |

工程实践中，跨函数分析因复杂度过高，通常限制为单翻译单元或禁用。

---

## 5. 代码示例

### 5.1 命名规范示例

**标准**：C++17，Google C++ Style Guide

```cpp
// file: order_processor.h
// 对应实现文件：order_processor.cc

#pragma once

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace inventory {

// 类型名：PascalCase
class OrderProcessor {
public:
    // 常量：kPascalCase
    static constexpr int kMaxOrders = 1000;

    // 构造函数：PascalCase
    explicit OrderProcessor(std::uint64_t capacity);

    // 公共成员函数：CamelCase
    void ProcessOrder(const std::string& order_id);
    std::size_t GetOrderCount() const { return orders_.size(); }

    // 禁用拷贝（业务语义）
    OrderProcessor(const OrderProcessor&) = delete;
    OrderProcessor& operator=(const OrderProcessor&) = delete;

private:
    // 私有成员变量：snake_case_（末尾下划线）
    std::uint64_t capacity_;
    std::vector<std::string> orders_;
};

// 枚举类：PascalCase，枚举值 kPascalCase
enum class OrderStatus {
    kPending,
    kProcessing,
    kShipped,
    kDelivered,
    kCancelled,
};

// 自由函数：CamelCase
std::uint64_t CalculateTotalValue(const std::vector<std::string>& order_ids);

}  // namespace inventory
```

### 5.2 RAII 资源管理示例

**标准**：C++17，CppCoreGuidelines

```cpp
// file: raii_file.h
// RAII 封装文件句柄，保证异常安全

#pragma once

#include <cstdio>
#include <stdexcept>
#include <string>
#include <utility>

class RaiiFile {
public:
    // 构造函数获取资源
    explicit RaiiFile(const std::string& path, const std::string& mode)
        : file_(std::fopen(path.c_str(), mode.c_str())) {
        if (!file_) {
            throw std::runtime_error("Failed to open file: " + path);
        }
    }

    // 析构函数释放资源，noexcept 保证
    ~RaiiFile() noexcept {
        if (file_) {
            std::fclose(file_);
        }
    }

    // 移动构造：转移所有权
    RaiiFile(RaiiFile&& other) noexcept : file_(other.file_) {
        other.file_ = nullptr;
    }

    // 移动赋值：先释放自身，再转移
    RaiiFile& operator=(RaiiFile&& other) noexcept {
        if (this != &other) {
            if (file_) std::fclose(file_);
            file_ = other.file_;
            other.file_ = nullptr;
        }
        return *this;
    }

    // 禁用拷贝
    RaiiFile(const RaiiFile&) = delete;
    RaiiFile& operator=(const RaiiFile&) = delete;

    // 业务接口
    std::size_t Write(const void* data, std::size_t size) {
        return std::fwrite(data, 1, size, file_);
    }

    std::size_t Read(void* buffer, std::size_t size) {
        return std::fread(buffer, 1, size, file_);
    }

    std::FILE* Get() const noexcept { return file_; }

private:
    std::FILE* file_;
};
```

### 5.3 PImpl 惯用法示例

**标准**：C++17，Google C++ Style Guide

```cpp
// file: widget.h
// PImpl 惯用法：减少头文件依赖

#pragma once

#include <memory>
#include <string>

class Widget {
public:
    explicit Widget(const std::string& name);
    ~Widget();  // 必须在 .cpp 中定义，因 unique_ptr 需完整类型

    Widget(Widget&&) noexcept;
    Widget& operator=(Widget&&) noexcept;

    Widget(const Widget&) = delete;
    Widget& operator=(const Widget&) = delete;

    void DoSomething();
    std::string GetName() const;

private:
    // 前向声明实现类，避免在头文件中暴露实现细节
    class Impl;
    std::unique_ptr<Impl> impl_;
};
```

```cpp
// file: widget.cc
#include "widget.h"
#include "internal_dependency.h"  // 实现依赖，不污染头文件

#include <vector>

// 实现类定义
class Widget::Impl {
public:
    explicit Impl(const std::string& name) : name_(name) {}

    void DoSomething() {
        // 实现细节，可使用 internal_dependency.h 中的类型
        data_.push_back(name_);
    }

    std::string GetName() const { return name_; }

private:
    std::string name_;
    std::vector<std::string> data_;
};

// 构造函数：在 .cpp 中创建 Impl
Widget::Widget(const std::string& name)
    : impl_(std::make_unique<Impl>(name)) {}

// 析构函数：在 .cpp 中定义，此时 Impl 已完整
Widget::~Widget() = default;

Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;

void Widget::DoSomething() { impl_->DoSomething(); }
std::string Widget::GetName() const { return impl_->GetName(); }
```

### 5.4 `.clang-format` 配置示例

```yaml
# .clang-format
# 基于 Google 风格，适度调整

---
BasedOnStyle: Google
Language: Cpp
Standard: c++17

# 缩进
IndentWidth: 4
TabWidth: 4
UseTab: Never
ContinuationIndentWidth: 4
AccessModifierOffset: -4

# 行宽
ColumnLimit: 100
ReflowComments: true

# 大括号
BreakBeforeBraces: Attach
AllowShortFunctionsOnASingleLine: Inline
AllowShortIfStatementsOnASingleLine: Never
AllowShortLoopsOnASingleLine: false
AllowShortBlocksOnASingleLine: Empty

# 指针对齐
PointerAlignment: Left
DerivePointerAlignment: false

# 包含排序
IncludeBlocks: Regroup
IncludeCategories:
  - Regex: '^"config\.h"'
    Priority: -1
  - Regex: '^<.*\.h>'
    Priority: 1
  - Regex: '^<.*>'
    Priority: 2
  - Regex: '.*'
    Priority: 3

# 空格
SpaceAfterCStyleCast: false
SpaceBeforeAssignmentOperators: true
SpaceBeforeParens: ControlStatements
SpacesInParentheses: false
SpacesInSquareBrackets: false
SpacesInAngles: false

# 对齐
AlignAfterOpenBracket: Align
AlignConsecutiveAssignments: false
AlignConsecutiveDeclarations: false
AlignEscapedNewlines: Left
AlignOperands: true
AlignTrailingComments: true

# 其他
AlwaysBreakTemplateDeclarations: Yes
ConstructorInitializerIndentWidth: 4
Cpp11BracedListStyle: true
FixNamespaceComments: true
NamespaceIndentation: None
SortIncludes: true
SpacesBeforeTrailingComments: 2
```

### 5.5 `.clang-tidy` 配置示例

```yaml
# .clang-tidy
# 基于 CppCoreGuidelines 与 Google 规范

---
Checks: >
  -*,
  bugprone-*,
  cert-*,
  cppcoreguidelines-*,
  google-*,
  llvm-*,
  modernize-*,
  performance-*,
  readability-*,
  -bugprone-easily-swappable-parameters,
  -cppcoreguidelines-avoid-magic-numbers,
  -cppcoreguidelines-pro-bounds-array-to-pointer-decay,
  -cppcoreguidelines-pro-bounds-pointer-arithmetic,
  -google-readability-todo,
  -google-runtime-references,
  -modernize-use-trailing-return-type,
  -readability-magic-numbers,
  -readability-identifier-length

WarningsAsErrors: ''
HeaderFilterRegex: '^(?!.*(third_party|build|generated)).*$'

CheckOptions:
  - key: readability-identifier-naming.ClassCase
    value: CamelCase
  - key: readability-identifier-naming.FunctionCase
    value: camelBack
  - key: readability-identifier-naming.VariableCase
    value: lower_case
  - key: readability-identifier-naming.PrivateMemberSuffix
    value: '_'
  - key: readability-identifier-naming.ConstantPrefix
    value: 'k'
  - key: readability-identifier-naming.NamespaceCase
    value: lower_case
  - key: modernize-use-override.IgnoreDestructors
    value: 'true'
  - key: performance-unnecessary-value-param.AllowedTypes
    value: 'std::string_view;std::span'
...
```

### 5.6 CMake 集成示例

```cmake
# CMakeLists.txt
# 集成 clang-format 与 clang-tidy

cmake_minimum_required(VERSION 3.20)
project(code_style_example LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 选项：是否启用 clang-tidy
option(ENABLE_CLANG_TIDY "Enable clang-tidy checks" OFF)
# 选项：是否将警告视为错误
option(WARNINGS_AS_ERRORS "Treat warnings as errors" OFF)

# 查找 clang-format
find_program(CLANG_FORMAT NAMES clang-format clang-format-17)

if(CLANG_FORMAT)
    message(STATUS "Found clang-format: ${CLANG_FORMAT}")

    # 获取所有源文件
    file(GLOB_RECURSE ALL_SOURCES
        "${CMAKE_SOURCE_DIR}/src/*.cpp"
        "${CMAKE_SOURCE_DIR}/src/*.h"
        "${CMAKE_SOURCE_DIR}/src/*.hpp"
    )

    # 添加格式化目标
    add_custom_target(format
        COMMAND ${CLANG_FORMAT} -i --style=file ${ALL_SOURCES}
        COMMENT "Running clang-format on all sources"
    )

    # 添加格式检查目标
    add_custom_target(format-check
        COMMAND ${CLANG_FORMAT} --style=file --dry-run --Werror ${ALL_SOURCES}
        COMMENT "Checking code formatting"
    )
endif()

# 查找 clang-tidy
if(ENABLE_CLANG_TIDY)
    find_program(CLANG_TIDY NAMES clang-tidy clang-tidy-17)
    if(CLANG_TIDY)
        message(STATUS "Found clang-tidy: ${CLANG_TIDY}")
        set(CMAKE_CXX_CLANG_TIDY "${CLANG_TIDY};--config-file=${CMAKE_SOURCE_DIR}/.clang-tidy")
        if(WARNINGS_AS_ERRORS)
            set(CMAKE_CXX_CLANG_TIDY "${CMAKE_CXX_CLANG_TIDY};--warnings-as-errors=*")
        endif()
    else()
        message(WARNING "clang-tidy not found")
    endif()
endif()

# 源文件
add_executable(app src/main.cpp)
target_include_directories(app PRIVATE src)
```

### 5.7 Pre-Commit Hook 示例

```bash
#!/bin/bash
# .git/hooks/pre-commit
# 提交前检查：clang-format 与 clang-tidy

set -e

# 获取暂存的 C++ 文件
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(cpp|h|hpp|cc)$' || true)

if [ -z "$FILES" ]; then
    exit 0
fi

echo "Running clang-format check..."
for file in $FILES; do
    clang-format --style=file --dry-run --Werror "$file" || {
        echo "Format error in $file. Run 'clang-format -i $file' to fix."
        exit 1
    }
done

echo "Running clang-tidy check..."
for file in $FILES; do
    # 仅检查已修改的文件
    clang-tidy --config-file=.clang-tidy "$file" -- -std=c++17 || {
        echo "Lint error in $file."
        exit 1
    }
done

echo "Pre-commit checks passed."
exit 0
```

---

## 6. 对比分析

### 6.1 五大主流规范对比

| 维度          | MISRA C++:2023        | AUTOSAR C++14         | Google C++ Style      | LLVM Coding Standards | CppCoreGuidelines     |
| ------------- | --------------------- | --------------------- | --------------------- | --------------------- | --------------------- |
| 发布组织      | MISRA 联盟            | 汽车软件联盟          | Google                | LLVM 项目             | ISO C++ 委员会        |
| 基础标准      | C++17/C++20           | C++14                 | C++17（持续更新）     | C++17（持续更新）     | C++17/C++20           |
| 目标领域      | 安全关键系统          | 汽车 ECU              | 通用软件              | 编译器/系统软件       | 通用现代 C++          |
| 异常          | 限制使用              | 限制使用              | 禁用                  | 允许（但代码不使用）  | 推荐使用              |
| RTTI          | 限制使用              | 限制使用              | 禁用                  | 允许                  | 允许                  |
| 模板          | 限制使用              | 限制使用              | 允许                  | 允许                  | 推荐                  |
| 多重继承      | 限制                  | 限制                  | 限制                  | 允许                  | 谨慎使用              |
| 全局变量      | 限制                  | 限制                  | 允许                  | 允许                  | 限制                  |
| 规则数量      | ~300                  | ~400                  | ~100                  | ~50                   | ~400                  |
| 配套工具      | PC-lint, clang-tidy   | PC-lint, clang-tidy   | cpplint, clang-tidy   | clang-format, clang-tidy | clang-tidy, GSL       |
| 严重性分级    | Mandatory/Required/Advisory | 类似 MISRA      | 无明确分级            | 无明确分级            | 无明确分级            |
| 与 ISO 26262  | 直接关联              | 直接关联              | 无关联                | 无关联                | 无关联                |

### 6.2 命名规范对比

| 类型         | Google        | LLVM          | MISRA C++     | CppCoreGuidelines | 本文档推荐    |
| ------------ | ------------- | ------------- | ------------- | ----------------- | ------------- |
| 类型名       | PascalCase    | PascalCase    | PascalCase    | PascalCase        | PascalCase    |
| 函数名       | CamelCase     | camelCase     | PascalCase    | snake_case 或 CamelCase | camelCase |
| 变量名       | snake_case    | PascalCase    | snake_case    | snake_case        | snake_case    |
| 成员变量     | snake_case_   | m_PascalCase  | m_snake_case  | snake_case_       | snake_case_   |
| 常量         | kPascalCase   | UPPER_CASE    | UPPER_CASE    | UPPER_CASE        | kPascalCase   |
| 枚举值       | kPascalCase   | PascalCase    | UPPER_CASE    | PascalCase        | kPascalCase   |
| 命名空间     | snake_case    | lower-case    | snake_case    | snake_case        | lower-case    |
| 文件名       | lower-case    | PascalCase    | 无规定        | snake_case        | lower-case    |

### 6.3 格式化工具对比

| 工具          | 语言支持       | 配置方式              | 速度     | 集成度   | 推荐度 |
| ------------- | -------------- | --------------------- | -------- | -------- | ------ |
| clang-format  | C/C++/ObjC     | YAML 配置文件         | 快       | 高       | 高     |
| astyle        | C/C++/Java     | 命令行选项            | 快       | 中       | 中     |
| uncrustify    | C/C++/C#/Java  | CFG 配置文件          | 中       | 中       | 中     |
| GNU indent    | C              | 命令行选项            | 快       | 低       | 低     |
|.editorconfig  | 通用           | INI 格式              | N/A      | 中       | 辅助   |

`clang-format` 因基于 Clang 前端，对 C++ 语法理解最准确，是当前主流选择。

### 6.4 静态分析工具对比

| 工具          | 检查类型       | 误报率 | 速度     | 规则集                  | 商业/开源 | 推荐度 |
| ------------- | -------------- | ------ | -------- | ----------------------- | --------- | ------ |
| clang-tidy    | 语义、风格     | 中     | 中       | CppCoreGuidelines, Google, CERT 等 | 开源      | 高     |
| cppcheck      | 语义           | 低     | 快       | 自有                    | 开源      | 中     |
| PC-lint Plus  | 语义、规范     | 中     | 中       | MISRA, AUTOSAR          | 商业      | 高（安全场景）|
| Coverity      | 语义、数据流   | 低     | 慢       | 自有                    | 商业      | 高（企业）|
| PVS-Studio    | 语义           | 中     | 中       | 自有                    | 商业      | 中     |
| SonarQube     | 语义、风格     | 中     | 中       | 自有                    | 商业      | 中     |

### 6.5 异常使用对比

| 规范              | 立场              | 理由                                  | 适用场景                |
| ----------------- | ----------------- | ------------------------------------- | ----------------------- |
| Google            | 禁用              | 历史代码库兼容性、性能、二进制体积     | 大规模服务端            |
| MISRA C++         | 限制              | 异常展开时间不可预测                  | 安全关键系统            |
| AUTOSAR C++       | 限制              | 同 MISRA                              | 汽车 ECU                |
| CppCoreGuidelines | 推荐              | RAII 依赖异常、错误处理统一           | 通用现代 C++            |
| LLVM              | 允许但不使用      | 历史原因                              | 系统软件                |
| Boost             | 强制              | 异常是错误处理的标准方式              | 通用库                  |

---

## 7. 常见陷阱与最佳实践

### 7.1 十大常见陷阱

#### 陷阱 1：过度依赖 `auto`

```cpp
// 反例：auto 滥用，类型不明确
auto x = 3.14;       // double? float? 
auto y = f();        // 返回类型未知
auto& z = container; // 引用还是对象？

// 正例：明确类型
double x = 3.14;
ReturnType y = f();
ContainerType& z = container;
```

**原则**：当类型显而易见（如迭代器、模板参数）时用 `auto`，否则明确写出。

#### 陷阱 2：忽视异常安全级别

```cpp
// 反例：仅 Basic 保证的赋值运算符
T& T::operator=(const T& other) {
    delete[] data_;              // 先释放自身
    data_ = new Type[other.size]; // 若此处抛异常，data_ 悬空！
    size = other.size;
    std::copy(other.data_, other.data_ + size, data_);
    return *this;
}

// 正例：copy-and-swap 实现 Strong 保证
T& T::operator=(T other) noexcept {  // 按值传递，自身拷贝
    swap(*this, other);  // nothrow
    return *this;
}  // other 析构，释放旧资源
```

#### 陷阱 3：头文件循环依赖

```cpp
// a.h
#include "b.h"
class A { B* b; };

// b.h
#include "a.h"  // 循环！
class B { A* a; };

// 正例：使用前向声明
// a.h
class B;  // 前向声明
class A { B* b; };

// b.h
class A;  // 前向声明
class B { A* a; };
```

#### 陷阱 4：滥用 `using namespace std`

```cpp
// 反例：污染命名空间
using namespace std;
string s;  // 是 std::string 还是自定义 string？

// 正例：显式限定
std::string s;
```

#### 陷阱 5：未使用 `nullptr` 替代 `NULL`

```cpp
// 反例：NULL 在 C++ 中是 0，导致重载歧义
void f(int);
void f(char*);
f(NULL);  // 调用 f(int)！非预期

// 正例：nullptr 是 std::nullptr_t，无歧义
f(nullptr);  // 调用 f(char*)
```

#### 陷阱 6：移动语义误用

```cpp
// 反例：返回局部变量的移动
std::string make() {
    std::string local = "hello";
    return std::move(local);  // 阻止 RVO！
}

// 正例：直接返回，编译器 RVO
std::string make() {
    std::string local = "hello";
    return local;  // NRVO 或移动
}
```

#### 陷阱 7：智能指针误用

```cpp
// 反例：shared_ptr 滥用
std::shared_ptr<int> p(new int(42));  // 两次堆分配

// 正例：make_shared 合并分配
auto p = std::make_shared<int>(42);  // 一次堆分配

// 反例：循环引用导致泄漏
struct Node {
    std::shared_ptr<Node> next;
    std::shared_ptr<Node> prev;  // 循环！
};

// 正例：weak_ptr 打破循环
struct Node {
    std::shared_ptr<Node> next;
    std::weak_ptr<Node> prev;  // 不增加引用计数
};
```

#### 陷阱 8：忽略 `const` 正确性

```cpp
// 反例：const 缺失，限制使用场景
class Container {
    int* data;
public:
    int* GetData() { return data; }  // const 对象无法调用
};

// 正例：const 版本与非 const 版本
class Container {
    int* data;
public:
    int* GetData() { return data; }
    const int* GetData() const { return data; }
};
```

#### 陷阱 9：模板元编程过度

```cpp
// 反例：SFINAE 地狱
template<typename T,
         typename = std::enable_if_t<std::is_integral_v<T>>>
void f(T x);

template<typename T,
         typename = std::enable_if_t<std::is_floating_point_v<T>>,
         typename = void>
void f(T x);

// 正例：C++20 concept
template<typename T>
    requires std::integral<T>
void f(T x);

template<typename T>
    requires std::floating_point<T>
void f(T x);
```

#### 陷阱 10：未考虑 `noexcept` 的影响

```cpp
// 反例：std::vector 扩容时 noexcept 缺失导致拷贝而非移动
class Widget {
public:
    Widget(Widget&&) {}  // 未标记 noexcept
};

std::vector<Widget> v;
v.push_back(Widget{});  // 调用拷贝构造！因 move 非 noexcept

// 正例：标记 noexcept
class Widget {
public:
    Widget(Widget&&) noexcept {}  // 标记 noexcept
};
// vector 优先使用移动
```

### 7.2 最佳实践清单

1. **使用 RAII 管理所有资源**：内存、文件、锁、网络连接。
2. **优先 `const`**：变量、参数、成员函数能 `const` 则 `const`。
3. **优先 `constexpr`**：编译期常量与计算。
4. **使用 `nullptr` 替代 `NULL` 或 `0`**。
5. **使用 `enum class` 替代 `enum`**：避免命名污染与隐式转换。
6. **优先 `std::array` 替代 C 数组**：边界安全。
7. **优先范围 `for` 循环**：替代手动索引。
8. **使用智能指针**：`unique_ptr`、`shared_ptr`、`weak_ptr`。
9. **优先移动语义**：避免不必要的拷贝。
10. **使用 `noexcept` 标记不抛异常的函数**：尤其是移动操作与析构。
11. **遵循三/五/零法则**：资源管理类的特殊成员函数。
12. **启用最高警告级别**：`-Wall -Wextra -Wpedantic -Werror`。
13. **使用静态分析工具**：`clang-tidy`、`cppcheck`。
14. **自动化格式化**：`clang-format` 提交前检查。
15. **编写可测试代码**：依赖注入、单一职责。
16. **文档化接口契约**：前置条件、后置条件、异常保证。
17. **避免魔术数字**：使用命名常量。
18. **限制单文件长度**：建议 500 行以内。
19. **限制单函数长度**：建议 50 行以内。
20. **限制嵌套深度**：建议 4 层以内。

---

## 8. 工程实践

### 8.1 项目规范落地流程

引入代码规范到既有项目的标准流程：

```text
1. 评估现状
   ├── 收集既有代码的风格分布
   ├── 识别主要违规模式
   └── 评估技术债规模

2. 选择规范基线
   ├── 确定主规范（如 Google、CppCoreGuidelines）
   ├── 识别必要的偏离（如禁用异常的项目）
   └── 编写项目特定规范文档

3. 配置工具链
   ├── 编写 .clang-format
   ├── 编写 .clang-tidy
   ├── 集成到 CMake/构建系统
   └── 配置 CI/CD 检查

4. 渐进式实施
   ├── Phase 1: 格式化（clang-format -i）
   ├── Phase 2: 启用低严重性检查
   ├── Phase 3: 启用中严重性检查
   └── Phase 4: 启用高严重性检查

5. 团队培训
   ├── 规范文档宣讲
   ├── 工具使用培训
   └── Code Review 实践

6. 持续改进
   ├── 定期回顾违规数据
   ├── 调整规则配置
   └── 更新规范文档
```

### 8.2 CI/CD 集成

GitHub Actions 示例：

```yaml
# .github/workflows/code-quality.yml
name: Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  clang-format-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install clang-format
        run: |
          sudo apt-get update
          sudo apt-get install -y clang-format-17

      - name: Run clang-format check
        run: |
          find src -name '*.cpp' -o -name '*.h' -o -name '*.hpp' | \
            xargs clang-format-17 --style=file --dry-run --Werror

  clang-tidy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y clang-tidy-17 cmake build-essential

      - name: Configure CMake
        run: |
          cmake -B build \
            -DCMAKE_CXX_CLANG_TIDY="clang-tidy-17;--config-file=.clang-tidy" \
            -DENABLE_CLANG_TIDY=ON \
            -DWARNINGS_AS_ERRORS=ON

      - name: Build
        run: cmake --build build

  cppcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install cppcheck
        run: |
          sudo apt-get update
          sudo apt-get install -y cppcheck

      - name: Run cppcheck
        run: |
          cppcheck --enable=all --error-exitcode=1 \
            --suppress=missingIncludeSystem \
            -I src src/
```

### 8.3 编译器警告策略

```cmake
# CMake 警告配置

# GCC/Clang
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(
        -Wall
        -Wextra
        -Wpedantic
        -Werror
        -Wconversion
        -Wsign-conversion
        -Wold-style-cast
        -Wnull-dereference
        -Wdouble-promotion
        -Wformat=2
        -Wimplicit-fallthrough
        -Wmisleading-indentation
        -Wduplicated-cond
        -Wduplicated-branches
        -Wlogical-op
        -Wuseless-cast
    )

    # 仅 GCC
    if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
        add_compile_options(-Wnoexcept)
    endif()

    # 仅 Clang
    if(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
        add_compile_options(
            -Wdocumentation
            -Wno-gnu-statement-expression
        )
    endif()
endif()

# MSVC
if(MSVC)
    add_compile_options(
        /W4
        /WX
        /permissive-
        /Zc:__cplusplus
        /Zc:preprocessor
        /Zc:referenceBinding
        /Zc:rvalueCast
        /Zc:throwingNew
        /utf-8
    )
endif()
```

### 8.4 Code Review 检查清单

```markdown
# Code Review Checklist

## 通用
- [ ] 代码符合项目规范（clang-format、clang-tidy 通过）
- [ ] 无明显性能问题（无不必要的拷贝、无 O(n^2) 循环）
- [ ] 无内存泄漏（RAII、智能指针）
- [ ] 无未定义行为（无空指针解引用、无越界访问）
- [ ] 异常安全级别明确（No-throw / Strong / Basic）

## 命名
- [ ] 类型、函数、变量、常量命名符合规范
- [ ] 名称具有描述性，无缩写歧义
- [ ] 成员变量使用统一后缀（如 `_`）

## 头文件
- [ ] 头文件包含最小化（使用前向声明）
- [ ] 头文件保护（`#pragma once` 或 include guard）
- [ ] 头文件与实现文件命名一致

## 类设计
- [ ] 遵循单一职责原则
- [ ] 公共接口最小化
- [ ] 成员变量私有化
- [ ] 遵循三/五/零法则
- [ ] `const` 正确性

## 函数
- [ ] 函数长度 < 50 行
- [ ] 参数数量 < 5 个
- [ ] 避免输出参数（优先返回值）
- [ ] `noexcept` 标记正确

## 错误处理
- [ ] 错误处理策略一致（异常或错误码，不混用）
- [ ] 资源释放不依赖错误处理
- [ ] 错误信息具有上下文

## 测试
- [ ] 单元测试覆盖核心逻辑
- [ ] 边界条件测试
- [ ] 错误路径测试
- [ ] 测试命名清晰
```

### 8.5 文档生成

使用 Doxygen 生成 API 文档：

```cmake
# CMakeLists.txt
find_package(Doxygen)

if(DOXYGEN_FOUND)
    set(DOXYGEN_IN ${CMAKE_SOURCE_DIR}/docs/Doxyfile.in)
    set(DOXYGEN_OUT ${CMAKE_BINARY_DIR}/Doxyfile)

    configure_file(${DOXYGEN_IN} ${DOXYGEN_OUT} @ONLY)

    add_custom_target(docs
        COMMAND ${DOXYGEN_EXECUTABLE} ${DOXYGEN_OUT}
        WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
        COMMENT "Generating API documentation with Doxygen"
        VERBATIM
    )
endif()
```

```cpp
/// @file order_processor.h
/// @brief 订单处理器接口
/// @author fanquanpp
/// @date 2026-06-14

#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace inventory {

/// @brief 订单处理器，管理订单生命周期
///
/// 该类负责接收、验证、处理订单，并维护订单状态。
/// 线程安全：所有公共成员函数线程安全。
class OrderProcessor {
public:
    /// @brief 构造函数
    /// @param capacity 最大订单容量
    /// @throws std::invalid_argument 若 capacity 为 0
    explicit OrderProcessor(std::uint64_t capacity);

    /// @brief 处理订单
    /// @param order_id 订单 ID
    /// @return 处理结果，true 表示成功
    /// @throws std::runtime_error 若处理失败
    /// @note 强异常保证
    bool ProcessOrder(const std::string& order_id);

    /// @brief 获取订单数量
    /// @return 当前订单数
    [[nodiscard]] std::size_t GetOrderCount() const noexcept;

private:
    std::uint64_t capacity_;
    std::vector<std::string> orders_;
};

}  // namespace inventory
```

---

## 9. 案例研究

### 9.1 案例一：Chromium 项目

Chromium 是 Google 主导的开源浏览器项目，代码量超过 3000 万行 C++。其规范特点：

1. **基于 Google C++ Style Guide**，但有若干偏离（如允许部分异常）。
2. **严格的代码所有权 (ownership) 制度**：每个目录有 OWNERS 文件，列出可批准代码合并的开发者。
3. **Presubmit 脚本**：提交前自动检查格式、规范、测试覆盖。
4. **`git cl format`**：封装 `clang-format`，确保格式一致。
5. **Blink 渲染引擎**使用 Oilpan GC，规范要求理解 GC 与 RAII 的交互。

Chromium 的规范文档：`https://chromium.googlesource.com/chromium/src/+/main/styleguide/c++/c++.md`

### 9.2 案例二：LLVM 项目

LLVM 是编译器基础设施项目，代码量约 200 万行 C++。其规范特点：

1. **异常不使用**，但允许（历史代码兼容）。
2. **RTTI 不使用**（`-fno-rtti`），用 `classof` 模式替代。
3. **函数名 `camelCase`**，与 Google 的 `CamelCase` 不同。
4. **`StringRef` 替代 `const std::string&`**：避免临时 `std::string` 构造。
5. **`isa<>`/`dyn_cast<>`/`cast<>`** 替代 `dynamic_cast`：类型安全且无 RTTI 依赖。

LLVM 规范的启示：系统软件项目常因性能与二进制体积考虑，禁用 RTTI 与异常，需配套的自有抽象。

### 9.3 案例三：Tesla Autopilot

Tesla Autopilot 是自动驾驶系统，需满足 ISO 26262 ASIL-D 安全等级。其规范特点：

1. **基于 MISRA C++:2008 与 AUTOSAR C++14**。
2. **禁用动态内存**：所有内存在编译期分配或静态池。
3. **禁用异常**：错误通过返回码传播。
4. **强制 WCET 分析**：每条路径有上界。
5. **代码覆盖率要求**：MC/DC 100% 覆盖。
6. **形式化验证**：关键算法通过 TLA+ 或 Coq 验证。

### 9.4 案例四：SpaceX 飞行软件

SpaceX 的 Dragon 飞船与 Falcon 火箭使用 C++ 开发飞行软件。规范特点：

1. **基于 JSF AV C++ Standards**。
2. **禁用异常、RTTI、动态内存**。
3. **使用 `static_vector` 替代 `std::vector`**：避免动态分配。
4. **三模冗余**：关键计算三份独立执行，多数表决。
5. **代码审查极其严格**：每行代码至少两人审查。

### 9.5 案例五：Folly（Facebook）

Folly 是 Facebook 的 C++ 基础库，代码量约 50 万行。规范特点：

1. **基于 C++17/C++20，激进采用新特性**。
2. **广泛使用模板元编程**：`fbvector`、`/small_vector` 等优化容器。
3. **异常允许且推荐**：与现代 C++ 实践一致。
4. **`folly::Expected` 早于 `std::expected`**：错误处理前置。
5. **`folly::Poly`**：值语义的多态，替代传统继承。

Folly 的启示：互联网服务端项目可激进采用现代 C++ 特性，与安全关键项目的保守策略形成对比。

### 9.6 案例六：Qt 6

Qt 6 是跨平台 GUI 框架，代码量约 100 万行 C++。规范特点：

1. **基于 C++17**，部分模块使用 C++20。
2. **信号槽机制**：基于 `moc` 元对象编译器，扩展 C++ 语法。
3. **`Q_OBJECT` 宏**：每个支持信号槽的类必须包含。
4. **命名规范**：类名 `PascalCase`、函数 `camelCase`、信号 `camelCase`、槽 `camelCase`。
5. **内存管理**：`QObject` 树形所有权，父对象析构时删除子对象。

Qt 的启示：大型框架常需扩展 C++ 语法（通过代码生成），规范需考虑工具链配合。

---

## 10. 习题

### 10.1 选择题

**题目 1**：以下哪个规范明确禁用异常？

A. MISRA C++:2023
B. Google C++ Style Guide
C. CppCoreGuidelines
D. Boost 规范

**答案**：B。Google C++ Style Guide 因历史代码库兼容性禁用异常。

---

**题目 2**：`clang-format` 与 `clang-tidy` 的核心区别是？

A. 前者检查格式，后者检查语义
B. 前者基于 GCC，后者基于 Clang
C. 前者是商业工具，后者是开源工具
D. 前者只支持 C，后者只支持 C++

**答案**：A。`clang-format` 负责格式化（缩进、换行、对齐），`clang-tidy` 负责语义检查（命名、类型、最佳实践）。

---

**题目 3**：MISRA C++ 规则的三个严重性级别是？

A. Error / Warning / Info
B. Mandatory / Required / Advisory
C. Critical / Major / Minor
D. Blocker / High / Low

**答案**：B。MISRA 使用 Mandatory（强制）、Required（必须）、Advisory（建议）三级。

---

**题目 4**：以下哪个不是 PImpl 惯用法的优点？

A. 减少头文件依赖
B. 加快编译速度
C. 隐藏实现细节
D. 提高运行时性能

**答案**：D。PImpl 增加一次间接访问（指针解引用），略微降低运行时性能，但换来编译速度与 ABI 稳定。

---

**题目 5**：RAII 的核心保证是？

A. 资源永不泄漏
B. 资源生命周期与对象生命周期绑定
C. 资源分配总是成功
D. 资源访问总是线程安全

**答案**：B。RAII 保证资源获取即初始化，释放即析构，资源生命周期与对象生命周期严格绑定。

---

**题目 6**：`std::unique_ptr` 与 `std::shared_ptr` 的主要区别是？

A. 前者线程安全，后者不是
B. 前者独占所有权，后者共享所有权
C. 前者更快，后者更慢
D. 前者支持数组，后者不支持

**答案**：B。`unique_ptr` 独占所有权（不可拷贝），`shared_ptr` 共享所有权（引用计数）。

---

**题目 7**：以下哪种命名风格符合 Google C++ Style Guide？

A. 函数名 `processOrder`
B. 函数名 `ProcessOrder`
C. 函数名 `process_order`
D. 函数名 `PROCESS_ORDER`

**答案**：B。Google 规范要求函数名使用 `CamelCase`（首字母大写）。

---

**题目 8**：`noexcept` 关键字的主要作用是？

A. 标记函数不抛异常，允许优化器优化
B. 替代 `try-catch` 块
C. 禁用异常处理
D. 强制函数返回 `void`

**答案**：A。`noexcept` 标记函数不抛异常，标准库容器（如 `vector`）在扩容时优先调用 `noexcept` 移动构造。

---

### 10.2 填空题

**题目 1**：CppCoreGuidelines 的三大核心目标是______、______、______。

**答案**：类型安全、资源安全、错误安全。

---

**题目 2**：`clang-tidy` 的检查类别前缀包括 `bugprone-`、`cert-`、`cppcoreguidelines-`、`google-`、`llvm-`、______。

**答案**：`modernize-`、`performance-`、`readability-`。

---

**题目 3**：异常安全的四个级别是______、______、______、______。

**答案**：No-throw（nothrow guarantee）、Strong（strong exception guarantee）、Basic（basic exception guarantee）、No-throw-neutral（throw-neutral guarantee）。

---

**题目 4**：PImpl 惯用法中，头文件仅暴露______，实现细节放在______。

**答案**：前向声明的 `Impl` 类与 `std::unique_ptr<Impl>` 成员；`.cpp` 文件中的 `Impl` 类完整定义。

---

**题目 5**：Google C++ Style Guide 中，常量命名使用前缀______。

**答案**：`k`（如 `kMaxSize`）。

---

**题目 6**：MISRA C++:2023 基于 C++______标准。

**答案**：C++17/C++20。

---

**题目 7**：`clang-format` 的配置文件格式是______。

**答案**：YAML（`.clang-format`）。

---

### 10.3 编程题

**题目 1**：重构以下代码，使其符合 CppCoreGuidelines。

```cpp
// 原始代码
class Stack {
    int* data;
    int size;
    int capacity;
public:
    Stack(int cap) : data(new int[cap]), size(0), capacity(cap) {}
    ~Stack() { delete[] data; }
    void push(int x) {
        if (size >= capacity) throw std::runtime_error("full");
        data[size++] = x;
    }
    int pop() {
        if (size == 0) throw std::runtime_error("empty");
        return data[--size];
    }
};
```

**参考答案**：

```cpp
#include <gsl/pointers>
#include <memory>
#include <stdexcept>
#include <vector>

class Stack {
public:
    explicit Stack(std::size_t capacity)
        : data_(capacity > 0 ? capacity : throw std::invalid_argument("capacity must be positive")),
          capacity_(capacity) {}

    // noexcept 析构
    ~Stack() noexcept = default;

    // 禁用拷贝（避免浅拷贝问题）
    Stack(const Stack&) = delete;
    Stack& operator=(const Stack&) = delete;

    // 允许移动
    Stack(Stack&&) noexcept = default;
    Stack& operator=(Stack&&) noexcept = default;

    // Strong 异常保证
    void push(int value) {
        if (size_ >= capacity_) {
            throw std::runtime_error("stack full");
        }
        data_[size_++] = value;  // 不抛异常
    }

    // Strong 异常保证
    [[nodiscard]] int pop() {
        if (size_ == 0) {
            throw std::runtime_error("stack empty");
        }
        return data_[--size_];
    }

    [[nodiscard]] std::size_t size() const noexcept { return size_; }
    [[nodiscard]] std::size_t capacity() const noexcept { return capacity_; }
    [[nodiscard]] bool empty() const noexcept { return size_ == 0; }

private:
    std::unique_ptr<int[]> data_;  // RAII
    std::size_t size_{0};
    std::size_t capacity_;
};
```

改进点：

1. 使用 `std::unique_ptr` 替代裸指针，RAII 自动释放。
2. 明确异常安全级别（`noexcept` 标记）。
3. 禁用拷贝，启用移动（三/五/零法则）。
4. 构造函数校验参数（前置条件）。
5. `[[nodiscard]]` 标记不应忽略返回值。
6. `explicit` 防止隐式转换。
7. 成员变量后缀 `_`。

---

**题目 2**：为以下类编写符合规范的单元测试。

```cpp
class Calculator {
public:
    int add(int a, int b) const noexcept { return a + b; }
    int divide(int a, int b) const {
        if (b == 0) throw std::invalid_argument("division by zero");
        return a / b;
    }
};
```

**参考答案**：

```cpp
#include "calculator.h"

#include <gtest/gtest.h>

#include <stdexcept>

// 测试夹具
class CalculatorTest : public ::testing::Test {
protected:
    Calculator calc;
};

// 正常情况测试
TEST_F(CalculatorTest, AddPositiveNumbers) {
    EXPECT_EQ(calc.add(2, 3), 5);
}

TEST_F(CalculatorTest, AddNegativeNumbers) {
    EXPECT_EQ(calc.add(-2, -3), -5);
}

TEST_F(CalculatorTest, AddZero) {
    EXPECT_EQ(calc.add(0, 5), 5);
    EXPECT_EQ(calc.add(5, 0), 5);
}

TEST_F(CalculatorTest, AddOverflow) {
    // 有符号整数溢出是 UB，此处仅测试不崩溃
    EXPECT_NO_THROW(calc.add(INT_MAX, 1));
}

// 除法测试
TEST_F(CalculatorTest, DivideNormalCase) {
    EXPECT_EQ(calc.divide(10, 2), 5);
}

TEST_F(CalculatorTest, DivideNegativeNumbers) {
    EXPECT_EQ(calc.divide(-10, 2), -5);
    EXPECT_EQ(calc.divide(10, -2), -5);
}

TEST_F(CalculatorTest, DivideByZeroThrows) {
    EXPECT_THROW(calc.divide(10, 0), std::invalid_argument);
    EXPECT_THROW({ calc.divide(10, 0); }, std::invalid_argument);
}

// noexcept 测试
TEST_F(CalculatorTest, AddIsNoexcept) {
    EXPECT_TRUE(noexcept(calc.add(1, 2)));
}

TEST_F(CalculatorTest, DivideIsNotNoexcept) {
    EXPECT_FALSE(noexcept(calc.divide(1, 1)));
}
```

---

**题目 3**：编写 `.clang-tidy` 配置，启用 CppCoreGuidelines 与现代 C++ 改造检查，排除过于严格的规则。

**参考答案**：

```yaml
---
Checks: >
  -*,
  bugprone-*,
  cert-*,
  cppcoreguidelines-*,
  modernize-*,
  performance-*,
  readability-*,
  -bugprone-easily-swappable-parameters,
  -cppcoreguidelines-avoid-magic-numbers,
  -cppcoreguidelines-avoid-non-const-global-variables,
  -cppcoreguidelines-pro-bounds-array-to-pointer-decay,
  -cppcoreguidelines-pro-bounds-pointer-arithmetic,
  -cppcoreguidelines-pro-type-const-cast,
  -cppcoreguidelines-pro-type-cstyle-cast,
  -cppcoreguidelines-pro-type-reinterpret-cast,
  -cppcoreguidelines-special-member-functions,
  -modernize-use-nodiscard,
  -modernize-use-trailing-return-type,
  -modernize-use-transparent-functors,
  -readability-magic-numbers,
  -readability-identifier-length

WarningsAsErrors: ''
HeaderFilterRegex: '^(?!.*(third_party|build|generated|test)).*$'

CheckOptions:
  - key: readability-identifier-naming.ClassCase
    value: CamelCase
  - key: readability-identifier-naming.FunctionCase
    value: camelBack
  - key: readability-identifier-naming.VariableCase
    value: lower_case
  - key: readability-identifier-naming.PrivateMemberSuffix
    value: '_'
  - key: readability-identifier-naming.ConstantPrefix
    value: 'k'
  - key: readability-identifier-naming.NamespaceCase
    value: lower_case
  - key: modernize-use-override.IgnoreDestructors
    value: 'true'
  - key: modernize-use-default-member-init.UseAssignment
    value: '1'
  - key: performance-unnecessary-value-param.AllowedTypes
    value: 'std::string_view;std::span;std::function'
...
```

---

### 10.4 思考题

**题目 1**：为什么 Google 禁用异常，而 CppCoreGuidelines 推荐异常？这种分歧的根本原因是什么？

**参考答案**：根本原因是应用场景与历史包袱的差异。Google 拥有数十亿行的既有 C++ 代码库，这些代码在 C++ 异常机制成熟前编写，异常安全改造成本极高；且 Google 的服务端架构通过进程隔离与快速失败 (fail-fast) 替代异常处理。CppCoreGuidelines 面向新项目与现代 C++，异常是 RAII 错误处理的自然补充，禁用异常会削弱资源安全保证。

---

**题目 2**：在什么场景下应使用 `std::shared_ptr`，什么场景下应使用 `std::unique_ptr`？

**参考答案**：

- `unique_ptr`：默认选择，独占所有权，零开销抽象。适用于大多数资源管理场景。
- `shared_ptr`：当所有权需要在多个对象间共享且生命周期不确定时使用。如 DAG 结构、观察者模式、异步回调中的对象捕获。
- 避免 `shared_ptr` 的场景：单线程独占资源、循环引用（需 `weak_ptr`）、性能敏感路径（原子操作开销）。

---

**题目 3**：MISRA C++ 限制模板的使用，这与现代 C++ 的模板元编程趋势是否矛盾？如何调和？

**参考答案**：表面矛盾，实质是不同场景的权衡。MISRA 面向安全关键系统，模板元编程的复杂性与调试难度增加风险。调和方式：

1. 使用模板的"简单"子集（如 `std::vector`、`std::array`），避免深度元编程。
2. 使用 C++20 concept 替代 SFINAE，提高可读性。
3. 对模板代码进行严格单元测试与形式化验证。
4. 限制模板实例化深度与复杂度。

MISRA C++:2023 已适度放宽对模板的限制，反映现代 C++ 的接受度提升。

---

**题目 4**：为什么 `clang-format` 不能替代 `clang-tidy`，反之亦然？

**参考答案**：两者分工不同：

- `clang-format` 处理词法与语法层面（缩进、换行、空格），不改变语义。
- `clang-tidy` 处理语义层面（命名规范、类型安全、最佳实践），可能涉及代码重构。

例如，`clang-format` 可以让 `int*x;` 变成 `int* x;`，但不能检测 `int* x = nullptr;` 后未初始化的使用；`clang-tidy` 可以检测后者，但不能统一格式。两者互补，缺一不可。

---

**题目 5**：在既有项目中引入代码规范，应采用"大爆炸式"（一次性全量改造）还是"渐进式"（分阶段改造）？各自的优缺点？

**参考答案**：

- **大爆炸式**：优点是一次达成一致，避免规范与代码长期不一致；缺点是改动巨大，易引入 bug，阻塞业务开发。
- **渐进式**：优点是风险可控，可与业务迭代并行；缺点是过渡期长，规范与代码长期不一致。

推荐渐进式，具体策略：

1. 先统一格式化（`clang-format`），无语义风险。
2. 再启用低严重性 `clang-tidy` 检查，修复简单违规。
3. 逐步启用高严重性检查，与新功能开发并行。
4. 对长期不合规的代码，制定技术债清单，分批偿还。

---

**题目 6**：为什么 C++ 代码规范如此之多（MISRA、AUTOSAR、Google、LLVM、CppCoreGuidelines），却没有一个"统一规范"？

**参考答案**：C++ 应用于极其广泛的领域（安全关键、服务端、游戏、嵌入式、系统软件），各领域的约束差异巨大：

- 安全关键：可预测性、可验证性优先，禁用动态特性。
- 服务端：开发效率优先，允许动态特性。
- 嵌入式：资源受限，禁用堆分配。
- 游戏：性能优先，允许手动优化。

这些约束相互冲突，无法统一。规范的多样性反映 C++ 的"多范式、多领域"特性。学习者应根据目标领域选择合适规范，而非追求"统一"。

---

### 10.5 综合题

**题目**：假设你是一家自动驾驶初创公司的 C++ 技术负责人，团队规模 20 人，项目需满足 ISO 26262 ASIL-B 安全等级。请设计一套完整的 C++ 代码规范方案，包括：

1. 规范选型与依据
2. 工具链配置
3. 实施路线图
4. 团队培训计划
5. 持续改进机制

**参考答案**：

**1. 规范选型**

- **主规范**：AUTOSAR C++14（面向汽车 ECU，与 ISO 26262 直接关联）。
- **补充规范**：CppCoreGuidelines（现代 C++ 最佳实践）。
- **偏离记录**：对 AUTOSAR 过于严格的规则（如禁用模板），记录偏离依据。
- **C++ 标准**：C++17（AUTOSAR C++14 的超集，工具链支持成熟）。

**2. 工具链**

- **编译器**：GCC 12 或 Clang 15（ASIL 合规工具链）。
- **静态分析**：PC-lint Plus（AUTOSAR 规则集）+ `clang-tidy`（补充检查）。
- **格式化**：`clang-format`（自定义配置，基于 LLVM 风格）。
- **运行时检查**：AddressSanitizer、UndefinedBehaviorSanitizer（测试阶段）。
- **覆盖率**：GCov + LCov（MC/DC 覆盖率）。
- **CI/CD**：GitHub Actions，集成上述工具。

**3. 实施路线图**

```text
Month 1: 规范文档编写、工具链配置
Month 2: 团队培训、试点模块改造
Month 3-6: 全量改造（分模块）
Month 7+: 持续改进、外部审计准备
```

**4. 培训计划**

- Week 1-2: AUTOSAR C++ 规则讲解
- Week 3-4: 现代 C++（C++17）特性
- Week 5-6: 工具链使用（clang-tidy、PC-lint）
- Week 7-8: 异常安全与 RAII
- Week 9-10: 并发编程规范
- Week 11-12: 案例分析与实践

**5. 持续改进**

- 月度规范回顾会议
- 季度外部审计
- 年度规范更新（跟踪 AUTOSAR 与 C++ 标准演进）
- 违规数据看板（违规数量、修复率、热点模块）

---

## 11. 参考文献

### 11.1 标准与规范

1. ISO/IEC. *ISO/IEC 14882:2023 Information technology — Programming languages — C++*. International Organization for Standardization, 2023.

2. MISRA. *MISRA C++:2023 Guidelines for the use of the C++ language in critical systems*. MIRA Limited, 2023. ISBN: 978-1-906400-10-1.

3. AUTOSAR. *AUTOSAR C++14 Guidelines for the use of the C++14 language in critical and safety-related systems*. Automotive Open System Architecture, 2023. Document ID: 619.

4. Lockheed Martin. *JSF AV C++ Coding Standards*. Lockheed Martin Aeronautics, 2005. Document Number: 2RDU00001.

5. Google. *Google C++ Style Guide*. Google LLC, 2024. Available: https://google.github.io/styleguide/cppguide.html

6. LLVM Project. *LLVM Coding Standards*. LLVM Foundation, 2024. Available: https://llvm.org/docs/CodingStandards.html

7. Stroustrup, B. and Sutter, H. *C++ Core Guidelines*. ISO C++ Foundation, 2024. Available: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines

### 11.2 学术论文

8. Sutter, H. and Alexandrescu, A. *C++ Coding Standards: 101 Rules, Guidelines, and Best Practices*. Addison-Wesley Professional, 2004. ISBN: 978-0321113580.

9. Lawrie, D., Morrell, C., Feild, H., and Binkley, D. "What's in a Name? A Study of Identifiers." *Proceedings of the 14th IEEE International Conference on Program Comprehension (ICPC'06)*, 2006, pp. 3-12. DOI: 10.1109/ICPC.2006.51.

10. Liblit, B., Aiken, A., and Zheng, A. "Managing Restricted Memory in Embedded Systems." *ACM Transactions on Programming Languages and Systems (TOPLAS)*, vol. 29, no. 4, 2007, pp. 1-42. DOI: 10.1145/1255450.1255452.

11. Sadowski, C., Stolee, K., and Elbaum, S. "How Developers Refactor Code: An Empirical Study." *Journal of Systems and Software*, vol. 85, no. 10, 2012, pp. 2279-2293. DOI: 10.1016/j.jss.2012.05.021.

12. Cifuentes, C. and Ho, A. "Static Analysis of C++ Code: A Tool Perspective." *Proceedings of the 2015 ACM SIGPLAN International Conference on Systems, Programming, Languages and Applications: Software for Humanity (SPLASH)*, 2015, pp. 12-15. DOI: 10.1145/2814189.2814195.

### 11.3 工具与文档

13. LLVM Project. *Clang-Format Documentation*. LLVM Foundation, 2024. Available: https://clang.llvm.org/docs/ClangFormat.html

14. LLVM Project. *Clang-Tidy Documentation*. LLVM Foundation, 2024. Available: https://clang.llvm.org/extra/clang-tidy/

15. Regehr, J. *A Guide to Undefined Behavior in C and C++*. University of Utah, 2010. Available: https://blog.regehr.org/archives/213

16. Stroustrup, B. *The C++ Programming Language*. 4th ed., Addison-Wesley Professional, 2013. ISBN: 978-0321563842.

17. Meyers, S. *Effective Modern C++: 42 Specific Ways to Improve Your Use of C++11 and C++14*. O'Reilly Media, 2014. ISBN: 978-1491903995.

18. Sutter, H. and Alexandrescu, A. *C++ Coding Standards*. Addison-Wesley, 2004. DOI: 10.5555/996352.

### 11.4 行业报告

19. Coverity. *Coverity Scan: Open Source Report*. Synopsys, 2023. Available: https://scan.coverity.com/

20. SonarSource. *State of Code Quality Report 2024*. SonarSource SA, 2024. Available: https://www.sonarsource.com/resources/

---

## 12. 延伸阅读

### 12.1 书籍

- **Sutter, H. and Alexandrescu, A.** *C++ Coding Standards: 101 Rules, Guidelines, and Best Practices*. Addison-Wesley, 2004. 经典入门，虽基于 C++03 但思想历久弥新。
- **Meyers, S.** *Effective Modern C++*. O'Reilly, 2014. 现代 C++ 最佳实践。
- **Stroustrup, B.** *A Tour of C++*. 3rd ed., Addison-Wesley, 2022. C++20 概览。
- **Williams, A.** *C++ Concurrency in Action*. 2nd ed., Manning, 2019. 并发编程规范。
- **Dewhurst, S.** *C++ Common Knowledge*. Addison-Wesley, 2005. C++ 常见陷阱。

### 12.2 在线资源

- **CppCoreGuidelines**：https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
- **Google C++ Style Guide**：https://google.github.io/styleguide/cppguide.html
- **LLVM Coding Standards**：https://llvm.org/docs/CodingStandards.html
- **clang-format 文档**：https://clang.llvm.org/docs/ClangFormat.html
- **clang-tidy 文档**：https://clang.llvm.org/extra/clang-tidy/
- **AUTOSAR C++ Guidelines**：https://www.autosar.org/standards/
- **MISRA 官方**：https://www.misra.org.uk/

### 12.3 课程

- **MIT 6.172 Performance Engineering**：涉及代码规范对性能的影响。
- **Stanford CS106L**：C++ 高级主题，涵盖规范与最佳实践。
- **CMU 15-411 Compiler Design**：理解静态分析的底层原理。
- **CppCon YouTube 频道**：年度 C++ 大会，多个规范相关讲座。

### 12.4 实践项目

- **阅读 LLVM 源码**：学习系统软件的规范实践。
- **阅读 Chromium 源码**：学习大规模项目的规范落地。
- **阅读 Folly 源码**：学习现代 C++ 的激进应用。
- **贡献 Boost 项目**：参与开源，接受规范审查。
- **实现 MISRA 规则检查器**：深入理解规则的形式化建模。

### 12.5 社区

- **ISO C++ Foundation**：https://isocpp.org/
- **Reddit r/cpp**：https://www.reddit.com/r/cpp/
- **Stack Overflow C++ tag**：https://stackoverflow.com/questions/tagged/c++
- **C++ Slack**：https://cppalliance.org/slack/
- **Include <cpp> YouTube**：https://www.youtube.com/@IncludeCpp

---

## 附录 A：`.clang-format` 配置速查

### A.1 基于 Google 风格

```yaml
BasedOnStyle: Google
IndentWidth: 4
ColumnLimit: 100
```

### A.2 基于 LLVM 风格

```yaml
BasedOnStyle: LLVM
IndentWidth: 4
ColumnLimit: 100
BreakBeforeBraces: Attach
```

### A.3 基于 Microsoft 风格

```yaml
BasedOnStyle: Microsoft
IndentWidth: 4
ColumnLimit: 120
```

### A.4 常用配置项

| 配置项                          | 类型    | 默认值   | 说明                       |
| ------------------------------- | ------- | -------- | -------------------------- |
| `IndentWidth`                   | int     | 4        | 缩进宽度                   |
| `TabWidth`                      | int     | 4        | Tab 宽度                   |
| `UseTab`                        | enum    | Never    | 是否使用 Tab               |
| `ColumnLimit`                   | int     | 80       | 行宽限制                   |
| `BreakBeforeBraces`             | enum    | Attach   | 大括号位置                 |
| `AllowShortFunctionsOnASingleLine` | enum | All      | 短函数单行                 |
| `PointerAlignment`              | enum    | Right    | 指针对齐                   |
| `AlignAfterOpenBracket`         | enum    | Align    | 括号后对齐                 |
| `AlwaysBreakTemplateDeclarations` | enum  | Yes      | 模板声明换行               |
| `SortIncludes`                  | bool    | true     | 排序 include               |
| `IncludeBlocks`                 | enum    | Preserve | include 块处理             |

---

## 附录 B：`clang-tidy` 检查类别速查

### B.1 主要检查类别

| 类别                | 前缀                    | 说明                              |
| ------------------- | ----------------------- | --------------------------------- |
| Bugprone            | `bugprone-`             | 易错模式                          |
| CERT                | `cert-`                 | CERT 安全编码标准                 |
| CppCoreGuidelines   | `cppcoreguidelines-`    | CppCoreGuidelines 规则            |
| Google              | `google-`               | Google C++ Style Guide            |
| LLVM                | `llvm-`                 | LLVM Coding Standards             |
| Modernize           | `modernize-`            | 现代 C++ 改造                     |
| Performance         | `performance-`          | 性能优化                          |
| Readability         | `readability-`          | 可读性                            |
| Clang-Analyzer      | `clang-analyzer-`       | Clang 静态分析器                  |
| Misc                | `misc-`                 | 杂项                              |
| HICPP               | `hicpp-`                | High Integrity C++                |
| MPI                 | `mpi-`                  | MPI 相关                          |
| OpenMP              | `openmp-`               | OpenMP 相关                       |

### B.2 常用检查项

```yaml
# 现代 C++ 改造
- modernize-use-nullptr          # NULL 替换为 nullptr
- modernize-use-override         # 添加 override
- modernize-use-using            # typedef 替换为 using
- modernize-use-default-member-init  # 默认成员初始化
- modernize-use-noexcept         # throw() 替换为 noexcept
- modernize-use-equals-default   # = default
- modernize-use-equals-delete    # = delete
- modernize-make-shared          # shared_ptr(new T) 替换为 make_shared
- modernize-make-unique          # unique_ptr(new T) 替换为 make_unique
- modernize-loop-convert         # C 风格循环转范围 for
- modernize-pass-by-value        # const& + 拷贝转值传递 + 移动

# 性能优化
- performance-for-range-copy     # 避免范围 for 中的拷贝
- performance-unnecessary-copy-initialization  # 避免不必要拷贝
- performance-unnecessary-value-param  # 避免值传递参数
- performance-faster-string-find  # string::find 使用字符字面量
- performance-implicit-conversion-in-loop  # 避免循环中隐式转换

# 可读性
- readability-identifier-naming  # 命名规范
- readability-function-size      # 函数大小限制
- readability-else-after-return  # return 后避免 else
- readability-delete-null-pointer  # delete 前检查 null
- readability-simplify-boolean-expr  # 简化布尔表达式
- readability-non-const-parameter  # 避免不必要的 const 参数
```

---

## 附录 C：术语表

| 术语             | 英文                    | 定义                                                  |
| ---------------- | ----------------------- | ----------------------------------------------------- |
| 代码规范         | Coding Standard         | 代码编写的强制规则                                    |
| 编码指南         | Coding Guideline        | 代码编写的推荐做法                                    |
| 编码约定         | Coding Convention       | 团队约定的具体风格                                    |
| 静态分析         | Static Analysis         | 不运行代码的分析                                      |
| 动态分析         | Dynamic Analysis        | 运行代码的分析                                        |
| RAII             | Resource Acquisition Is Initialization | 资源获取即初始化                        |
| 异常安全         | Exception Safety        | 异常发生时的状态保证                                  |
| 类型安全         | Type Safety             | 类型系统的正确使用                                    |
| 资源安全         | Resource Safety         | 资源不泄漏的保证                                      |
| PImpl            | Pointer to Implementation | 指向实现的指针                                      |
| SFINAE           | Substitution Failure Is Not An Error | 替换失败非错误                          |
| Concept          | Concept                 | C++20 概念，模板约束                                  |
| Noexcept         | Noexcept                | 不抛异常的标记                                        |
| Rule of Zero     | Rule of Zero            | 零法则：类不定义特殊成员函数                          |
| Rule of Five     | Rule of Five            | 五法则：定义析构、拷贝构造、拷贝赋值、移动构造、移动赋值 |
| Rule of Three    | Rule of Three           | 三法则：定义析构、拷贝构造、拷贝赋值                  |
| GSL              | Guideline Support Library | CppCoreGuidelines 支持库                            |
| MISRA            | Motor Industry Software Reliability Association | 汽车工业软件可靠性协会      |
| AUTOSAR          | Automotive Open System Architecture | 汽车开放系统架构                          |
| ISO 26262        | ISO 26262               | 道路车辆功能安全标准                                  |
| IEC 61508        | IEC 61508               | 电气/电子/可编程电子安全相关系统功能安全              |
| ASIL             | Automotive Safety Integrity Level | 汽车安全完整性等级                          |
| MC/DC            | Modified Condition/Decision Coverage | 修正条件/判定覆盖                      |
| WCET             | Worst-Case Execution Time | 最坏执行时间                                        |
| UB               | Undefined Behavior      | 未定义行为                                            |
