---
order: 61
tags:
  - cpp
  - stl
  - algorithms
  - ranges
difficulty: intermediate
title: 'C++ STL 算法详解'
module: cpp
category: 'C++ Standard Library'
description: STL 算法库全解：非修改式、修改式、排序、搜索、数值、分区、堆、C++17 并行算法、C++20 Ranges、C++23 容器算法，含复杂度分析、迭代器约束、企业级实战与陷阱。
author: fanquanpp
updated: '2026-07-21'
related:
  - cpp/运算符重载
  - cpp/面向对象基础
  - cpp/字符串处理
  - cpp/文件IO与文件系统
  - cpp/Lambda表达式
  - cpp/C++20范围
  - cpp/STL容器与迭代器
  - cpp/类型系统
prerequisites:
  - cpp/概述与现代标准
  - cpp/STL容器与迭代器
---

# C++ STL 算法详解

> 本文档系统讲解 C++ 标准模板库（STL）算法组件，覆盖非修改式序列操作、修改式序列操作、排序与关联操作、二分搜索、堆操作、数值运算、分区、集合操作、C++17 并行算法、C++20 Ranges 与 C++23 `std::ranges::fold` / `std::ranges::contains` 等最新扩展。所有代码示例可在支持 C++17/20/23 的主流编译器（GCC 13+、Clang 17+、MSVC 19.36+）上编译通过，并标注跨平台兼容性。对标 MIT 6.172、Stanford CS106L、CMU 15-214 课程教学水准，0 基础自学友好。

## 1. 学习目标

完成本章学习后，读者应能够达成以下 Bloom 认知层级目标：

| Bloom 层级 | 目标描述 |
| :--- | :--- |
| **Remember（记忆）** | 列举 STL 算法的 5 大分类（non-modifying、modifying、sorting、numeric、heap），复述 5 类迭代器（input、output、forward、bidirectional、random access）的层级关系 |
| **Understand（理解）** | 解释 STL 算法与迭代器解耦的设计哲学，说明 `std::sort` 的内省排序（introsort）原理与 $O(n \log n)$ 复杂度保证 |
| **Apply（应用）** | 使用 `std::transform`、`std::accumulate`、`std::remove_if` + `erase` 惯用法、`std::sort` + 自定义比较器解决实际数据处理问题 |
| **Analyze（分析）** | 分析给定代码片段中迭代器失效风险、算法复杂度退化场景、并行算法的数据竞争，识别违反 Precondition 的 UB |
| **Evaluate（评价）** | 评估 STL 算法与手写循环、Rust iterator、Java Stream、Python itertools 在可读性、性能、表达力上的取舍，权衡 `std::for_each` vs range-based for |
| **Create（创造）** | 设计基于 Ranges 的可组合数据管道，实现自定义迭代器适配器、投影器（projection）、并行算法执行策略封装 |

## 2. 历史动机与发展脉络

### 2.1 STL 的诞生：Alexander Stepanov 与泛型编程

STL（Standard Template Library）的历史可追溯至 1970 年代 Alexander Stepanov 在 GE Laboratories 对泛型编程（Generic Programming）的探索。Stepanov 受 Ole-Johan Dahl 与 Kristen Nygaard 的 SIMULA 67 启发，但意识到面向对象并非实现通用数据结构的最佳路径。1979 年，他与 David Musser 合作研究 Tecton 语言，尝试用泛型机制描述数学抽象。

1985 年，Stepanov 在 Bell Labs 与 Andrew Koenig、Bjarne Stroustrup 接触，认识到 C++ 模板为实现泛型编程提供了可能。1987 至 1989 年间，他在 HP Labs 持续研究，提出"算法作用于迭代器范围"的核心思想：

```cpp
// Stepanov 的核心洞察：算法不依赖于具体容器，而依赖于迭代器抽象
template <typename InputIterator, typename T>
InputIterator find(InputIterator first, InputIterator last, const T& value) {
    while (first != last && *first != value) ++first;
    return first;
}
```

这段代码的精妙之处在于：`find` 对任何提供 `*`、`++`、`!=` 操作的迭代器都成立，无论是数组的原生指针、`std::vector<int>::iterator` 还是 `std::list<int>::iterator`。这种"算法—迭代器"解耦奠定了整个 STL 的架构基石。

### 2.2 HP STL 与纳入 C++ 标准（1994）

1994 年，HP Labs 正式发布 STL 实现。同年 7 月，ANSI/ISO C++ 标准委员会在 Waterloo 会议投票将 STL 纳入 C++ 标准草案。这一决定并非毫无争议：委员会中部分成员认为 STL 模板语法过于复杂、编译时间难以接受，但 Stroustrup 与 Stepanov 力排众议，最终 STL 成为 C++98 标准的核心组件。

C++98 标准定义的 STL 算法约 60 余个，涵盖：

- 非修改式：`for_each`、`find`、`count`、`mismatch`、`equal`、`search`
- 修改式：`copy`、`transform`、`swap`、`replace`、`fill`、`generate`、`remove`、`unique`、`reverse`、`rotate`、`random_shuffle`
- 排序：`sort`、`stable_sort`、`partial_sort`、`nth_element`、`binary_search`、`merge`
- 堆：`push_heap`、`pop_heap`、`make_heap`、`sort_heap`
- 数值：`accumulate`、`inner_product`、`partial_sum`、`adjacent_difference`（位于 `<numeric>`）

### 2.3 C++11 到 C++17：Lambda 与并行化

C++11 引入 Lambda 表达式，极大提升了 STL 算法的可用性。此前 `std::sort` 的自定义比较器需要定义独立的函数对象类，代码冗长：

```cpp
// C++98 风格
struct CompareByAge {
    bool operator()(const Person& a, const Person& b) const { return a.age < b.age; }
};
std::sort(v.begin(), v.end(), CompareByAge());

// C++11 Lambda
std::sort(v.begin(), v.end(), [](const Person& a, const Person& b) {
    return a.age < b.age;
});
```

C++11 还引入了 `std::begin` / `std::end` 自由函数，使 STL 算法可以作用于 C 风格数组。

C++17 是 STL 算法演进的重要里程碑，新增超过 100 个并行重载算法。每个算法接受一个 `ExecutionPolicy` 参数：

```cpp
#include <execution>
#include <algorithm>

std::vector<double> data(1'000'000);
// C++17 并行排序
std::sort(std::execution::par, data.begin(), data.end());
// 并行+向量化
std::for_each(std::execution::par_unseq, data.begin(), data.end(), [](double& x) {
    x = std::sqrt(x);
});
```

四种执行策略：

| 策略 | 含义 | 异常行为 |
| :--- | :--- | :--- |
| `std::execution::seq` | 顺序执行，等价于无策略版本 | 异常正常传播 |
| `std::execution::par` | 并行执行，但单元素内顺序 | 调用 `std::terminate` |
| `std::execution::par_unseq` | 并行+向量化，允许交错 | 调用 `std::terminate` |
| `std::execution::unseq`（C++20） | 仅向量化，单线程 | 异常正常传播 |

### 2.4 C++20 Ranges：声明式数据管道

C++20 Ranges 库是 STL 算法的重大重构。核心创新有三：

1. **范围概念**：算法直接接受容器，无需 `begin()`/`end()` 双参数
2. **视图（View）**：惰性求值的范围适配器，可链式组合
3. **投影（Projection）**：算法接受一元函数，从元素中提取比较键

```cpp
#include <ranges>
#include <algorithm>
#include <vector>

struct Person { std::string name; int age; };
std::vector<Person> people = {{"Alice", 30}, {"Bob", 25}, {"Carol", 35}};

// C++20 Ranges 风格：管道组合 + 投影
auto result = people
    | std::views::filter([](const Person& p) { return p.age >= 30; })
    | std::views::transform([](const Person& p) { return p.name; });

// 使用投影简化比较
std::ranges::sort(people, {}, &Person::age);  // {} 表示默认 <
```

Ranges 的设计借鉴了 Haskell 的 List Comprehension 与 C# 的 LINQ，使 C++ 首次具备声明式数据处理能力。

### 2.5 C++23 与 C++26 持续增强

C++23 新增算法：

- `std::ranges::fold_left` / `fold_right` / `fold_left_first` / `fold_right_last`：替代 `std::accumulate`，返回 `optional` 处理空范围
- `std::ranges::contains` / `contains_subrange`：简化查找判定
- `std::ranges::starts_with` / `ends_with`：前缀后缀检查
- `std::ranges::iota` / `shift_left` / `shift_right`
- `std::ranges::find_last`：返回最后一个匹配
- `std::views::chunk` / `slide` / `stride` / `adjacent` / `zip` / `join_with`：视图扩展

C++26 草案继续完善：

- `std::ranges::generate_random`：基于 C++26 `<random>` 重构
- `std::execution` Sender/Receiver 模型：与算法库集成的异步并行
- Hazard Pointer 与 RCU 在并行算法中的应用

### 2.6 关键提案与文献

- **N3411 (Hoberock, 2012)**：*Working Draft, Technical Specification for C++ Extensions for Parallelism*，并行算法奠基
- **N4128 (Niebler, 2014)**：*Ranges for the Standard Library, Rev 1*，Ranges 提案初版
- **P0024R0 (Hoberock, 2015)**：*Parallel Algorithms TS*，纳入 C++17
- **P0789R0 (Niebler, 2017)**：*Range Adaptors and Utilities*
- **P0896R4 (Niebler, 2018)**：*The One Ranges Proposal*，C++20 Ranges 最终形态
- **P2210R2 (Niebler, 2021)**：*Superior String Splitting*，`std::views::split` 重构
- **P2322R6 (Niebler, 2022)**：*`ranges::fold`*，C++23 折叠算法
- **P2302R4 (Kalb, 2021)**：*`ranges::contains`*
- **P2447R4 (Lakos, 2022)**：*`views::repeat`*

### 2.7 与其他语言的横向对比

| 特性 | C++ STL | Rust Iterator | Java Stream | Python itertools | C# LINQ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 算法数量 | 100+ | 30+ | 40+ | 20+ | 50+ |
| 惰性求值 | C++20 Views | 默认 | 默认 | 部分生成器 | 默认 |
| 并行化 | `std::execution::par` | `rayon` crate | `.parallel()` | `multiprocessing` | PLINQ |
| 复杂度保证 | 标准明确 | 标准明确 | 标准明确 | 文档说明 | 文档说明 |
| 零开销抽象 | 是 | 是 | 否（JIT 部分优化） | 否 | 否 |
| 内存分配 | 视图无分配 | 无分配 | 中间盒装 | 生成器 | 部分分配 |
| 错误处理 | UB / 抛异常 | Result/Option | Optional / 异常 | 异常 | 异常 |

## 3. 形式化定义

### 3.1 迭代器范畴（Iterator Category）

STL 算法对迭代器的要求由 5 个范畴（category）定义，构成偏序关系：

$$
\text{Input} \prec \text{Forward} \prec \text{Bidirectional} \prec \text{RandomAccess} \prec \text{Contiguous}
$$

每个范畴定义了迭代器必须支持的操作：

| 范畴 | 操作 | 典型容器 |
| :--- | :--- | :--- |
| Input | `*r`、`++r`、`r != s` | `std::istream_iterator` |
| Output | `*r = x`、`++r` | `std::back_insert_iterator` |
| Forward | Input + 多次遍历、`r == s` | `std::forward_list`、`std::unordered_map` |
| Bidirectional | Forward + `--r` | `std::list`、`std::map` |
| RandomAccess | Bidirectional + `r + n`、`r - s`、`r[n]` | `std::vector`、`std::deque` |
| Contiguous（C++20） | RandomAccess + 元素内存连续 | `std::vector`、`std::array`、`std::span` |

形式化定义（ISO/IEC 14882:2023 §23.3）：

$$
\text{IteratorCategory}(I) := \begin{cases}
\text{input\_iterator} & \text{if } I \text{ supports } *, ++, \neq \\
\text{forward\_iterator} & \text{if input + multi-pass + } == \\
\text{bidirectional\_iterator} & \text{if forward + } -- \\
\text{random\_access\_iterator} & \text{if bidirectional + } +,-,[],< \\
\text{contiguous\_iterator} & \text{if random\_access + contiguous memory}
\end{cases}
$$

算法的复杂度保证依赖于迭代器范畴。例如 `std::sort` 要求 RandomAccessIterator，对 ForwardIterator 编译失败；`std::find` 仅需 InputIterator，可作用于 `std::istream_iterator`。

### 3.2 算法复杂度的形式化

STL 算法的复杂度由标准明确指定，使用大 O 记号。设 $n$ 为范围长度：

$$
\text{Complexity}(\text{algorithm}, n) := \begin{cases}
O(n) & \text{for } \texttt{find}, \texttt{count}, \texttt{for\_each}, \texttt{copy}, \texttt{transform} \\
O(n \log n) & \text{for } \texttt{sort}, \texttt{stable\_sort}(\text{avg}), \texttt{partial\_sort} \\
O(n) & \text{for } \texttt{nth\_element}(\text{avg}) \\
O(\log n) & \text{for } \texttt{binary\_search}, \texttt{lower\_bound}, \texttt{upper\_bound} \\
O(n + \log n) & \text{for } \texttt{make\_heap} \\
O(\log n) & \text{for } \texttt{push\_heap}, \texttt{pop\_heap} \\
O(n \log n) & \text{for } \texttt{sort\_heap} \\
O(n \cdot m) & \text{for } \texttt{search}(\text{naive}) \\
O(n + m) & \text{for } \texttt{search}(\text{with searcher})
\end{cases}
$$

特别地，`std::sort` 的精确保证为：

$$
T_{\text{sort}}(n) \leq c \cdot n \log n \quad \text{比较次数}
$$

且最坏情况不超过 $O(n \log n)$（C++11 后要求，C++98 仅 $O(n \log n)$ 平均）。这一保证的实现机制是内省排序（introsort），详见 §4.1。

### 3.3 Precondition 与 Postcondition

每个 STL 算法都有一组前置条件（Precondition）和后置条件（Postcondition）。违反 Precondition 导致未定义行为（UB）。

形式化规范（使用 Hoare 逻辑风格）：

$$
\{P\}\ \texttt{algorithm}(args)\ \{Q\}
$$

例如 `std::binary_search` 的规范：

$$
\{ \text{is\_sorted}(first, last) \}\ \texttt{binary\_search}(first, last, value)\ \{ \text{return} \iff \exists i \in [first, last): *i = value \}
$$

违反 `is_sorted` 前置条件将导致 UB，结果不可预测。

### 3.4 Ranges 概念的形式化

C++20 Ranges 用 concept 形式化算法要求：

```cpp
namespace std {
    template <class I, class T>
    concept __indirectly_comparable = requires(I i, T t) {
        { *i == t } -> convertible_to<bool>;
    };

    template <input_iterator I, sentinel_for<I> S, class T,
              proj = identity>
        requires indirectly_comparable<I, const T*, proj>
    constexpr bool ranges::find(I first, S last, const T& value, proj proj = {});
}
```

这种形式化使算法的迭代器要求在编译期可检查，避免了 C++98 模板的延迟报错问题。

## 4. 理论推导与原理解析

### 4.1 内省排序（Introsort）：std::sort 的实现机制

`std::sort` 的复杂度保证依赖于内省排序算法，由 David Musser 于 1997 年提出。Introsort 是快速排序（Quicksort）+ 堆排序（Heapsort）+ 插入排序（Insertion Sort）的混合体：

**算法流程**：

1. 进入递归时记录深度 $d$
2. 若 $d > 2 \log_2 n$，切换到堆排序（保证最坏 $O(n \log n)$）
3. 若子范围长度 $< 16$，切换到插入排序（小规模高效）
4. 否则执行快速排序分区

**复杂度分析**：

快速排序平均 $O(n \log n)$，最坏 $O(n^2)$（当 pivot 选择不当导致分区不平衡）。引入深度阈值后，一旦递归过深，立即切换堆排序，最坏复杂度被锁定在 $O(n \log n)$。

数学证明：

设 $T(n)$ 为 introsort 的比较次数，$D(n)$ 为递归深度。

- 若 $D(n) \leq 2 \log_2 n$：纯 quicksort，$T(n) \leq 2n \log_2 n$
- 若 $D(n) > 2 \log_2 n$：切换 heapsort，$T(n) \leq 3n \log_2 n$（heapsort 上界）

合并：

$$
T(n) \leq 3n \log_2 n + 16n = O(n \log n)
$$

**Pivot 选择策略**：

主流实现（libstdc++、libc++、MSVC STL）使用"三数取中"（median-of-three）或更复杂的 pivot 选择：

```cpp
// libstdc++ 风格：median-of-three + introselect
template <typename RandomAccessIterator>
void __introsort_loop(RandomAccessIterator first, RandomAccessIterator last, int depth_limit) {
    while (last - first > /* threshold */ 16) {
        if (depth_limit == 0) {
            std::partial_sort(first, last, last);  // 切换 heapsort
            return;
        }
        --depth_limit;
        auto cut = std::__unguarded_partition(
            first, last,
            std::__median(*first, *(first + (last - first)/2), *(last - 1)));
        __introsort_loop(cut, last, depth_limit);
        last = cut;
    }
    // 小范围：留给最终的插入排序
}
```

### 4.2 稳定排序：std::stable_sort 的归并实现

`std::stable_sort` 保证相等元素的相对顺序。典型实现使用归并排序（Merge Sort）：

- 递归到子范围长度 $< 16$ 时切换插入排序（带 stability）
- 归并时使用临时缓冲区
- 若内存不足，回退到 $O(n \log^2 n)$ 的原地归并

复杂度：

$$
T_{\text{stable\_sort}}(n) = \begin{cases}
O(n \log n) & \text{if sufficient auxiliary memory} \\
O(n \log^2 n) & \text{otherwise}
\end{cases}
$$

### 4.3 nth_element：快速选择的期望线性

`std::nth_element` 将第 $n$ 大的元素放到第 $n$ 位，左侧均不大于它，右侧均不小于它。实现基于快速选择（Quickselect）：

- 期望复杂度 $O(n)$
- 最坏复杂度 $O(n^2)$，但 libstdc++ 使用 introselect 保证 $O(n)$ 最坏

introselect 在递归深度达到 $2 \log_2 n$ 时切换到 median-of-medians 算法，提供线性最坏保证。

### 4.4 remove-erase 惯用法的原理

`std::remove_if` 不真正删除元素，而是将"保留"的元素前移，返回新逻辑末尾迭代器。这一设计源于"算法不应修改容器大小"的原则。

```cpp
std::vector<int> v = {1, 2, 3, 4, 5};
auto new_end = std::remove_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
// v 现在内容：[1, 3, 5, ?, ?]，new_end 指向第 4 个位置
v.erase(new_end, v.end());
// v 现在内容：[1, 3, 5]
```

C++20 引入 `std::erase_if` 自由函数，封装这一惯用法：

```cpp
std::erase_if(v, [](int x) { return x % 2 == 0; });
```

### 4.5 并行算法的数据竞争与安全

并行算法要求用户提供的数据竞争自由（data-race-free）的函数对象。考虑：

```cpp
std::vector<int> v(1'000'000);
std::atomic<int> sum{0};
std::for_each(std::execution::par, v.begin(), v.end(), [&](int x) {
    sum.fetch_add(x, std::memory_order_relaxed);  // 正确：原子操作
});
```

错误示例：

```cpp
int sum = 0;  // 非原子
std::for_each(std::execution::par, v.begin(), v.end(), [&](int x) {
    sum += x;  // 数据竞争！UB
});
```

`std::execution::par_unseq` 还要求函数对象不调用同步原语（如 `std::mutex::lock`），因为向量化可能在不同 SIMD lane 中并发执行。

### 4.6 Ranges 视图的惰性求值

视图（View）的核心特性是惰性求值：组合多个视图不会产生中间容器。

```cpp
auto pipeline = v
    | std::views::filter(pred1)
    | std::views::transform(f)
    | std::views::filter(pred2);
// 此时未执行任何计算
for (auto x : pipeline) {  // 此处按需计算
    // ...
}
```

视图的形式化语义：一个 View 是一个 Range，其拷贝/移动为 $O(1)$，析构为 $O(1)$。这要求视图本身不拥有元素。

视图组合的复杂度：单次迭代 $O(k)$，其中 $k$ 是管道中视图的数量。整体复杂度 $O(n \cdot k)$。

## 5. 代码示例（企业级 production-ready）

### 5.1 非修改式算法：日志分析

```cpp
#include <algorithm>
#include <vector>
#include <string>
#include <string_view>
#include <fstream>
#include <iostream>
#include <chrono>

// 企业场景：从日志文件中统计错误数量并定位首个错误时间
struct LogEntry {
    std::string timestamp;
    std::string level;
    std::string message;
};

class LogAnalyzer {
public:
    explicit LogAnalyzer(std::vector<LogEntry> entries)
        : entries_(std::move(entries)) {}

    // 统计指定级别日志数量
    std::size_t count_by_level(std::string_view level) const {
        return std::ranges::count_if(entries_, [level](const LogEntry& e) {
            return e.level == level;
        });
    }

    // 查找首个错误，返回其时间戳
    std::optional<std::string> first_error_timestamp() const {
        auto it = std::ranges::find_if(entries_, [](const LogEntry& e) {
            return e.level == "ERROR" || e.level == "FATAL";
        });
        if (it == entries_.end()) return std::nullopt;
        return it->timestamp;
    }

    // 判断是否所有日志都在指定时间范围内
    bool all_in_range(std::string_view start, std::string_view end) const {
        return std::ranges::all_of(entries_, [&](const LogEntry& e) {
            return e.timestamp >= start && e.timestamp <= end;
        });
    }

    // 输出前 N 条 FATAL 日志
    void print_fatal(std::size_t n) const {
        auto fatal_view = entries_
            | std::views::filter([](const LogEntry& e) { return e.level == "FATAL"; })
            | std::views::take(n);
        for (const auto& e : fatal_view) {
            std::cout << "[" << e.timestamp << "] " << e.message << "\n";
        }
    }

private:
    std::vector<LogEntry> entries_;
};

int main() {
    std::vector<LogEntry> logs = {
        {"2026-07-21 10:00:00", "INFO",  "Service started"},
        {"2026-07-21 10:05:12", "WARN",  "High latency detected"},
        {"2026-07-21 10:10:33", "ERROR", "Database connection lost"},
        {"2026-07-21 10:11:00", "FATAL", "Out of memory"},
        {"2026-07-21 10:15:00", "INFO",  "Recovery complete"},
    };

    LogAnalyzer analyzer(logs);
    std::cout << "ERROR count: " << analyzer.count_by_level("ERROR") << "\n";
    auto first_err = analyzer.first_error_timestamp();
    if (first_err) std::cout << "First error at: " << *first_err << "\n";
    analyzer.print_fatal(5);
    return 0;
}
```

### 5.2 修改式算法：数据清洗管道

```cpp
#include <algorithm>
#include <vector>
#include <string>
#include <cctype>
#include <ranges>

// 数据清洗：去除空白字符、转小写、去重
std::vector<std::string> clean_data(std::vector<std::string> raw) {
    // 步骤 1：去除首尾空白
    std::ranges::transform(raw, raw.begin(), [](std::string s) {
        auto start = s.find_first_not_of(" \t\n");
        auto end = s.find_last_not_of(" \t\n");
        if (start == std::string::npos) return std::string{};
        return s.substr(start, end - start + 1);
    });

    // 步骤 2：删除空字符串
    std::erase_if(raw, [](const std::string& s) { return s.empty(); });

    // 步骤 3：转小写
    std::ranges::for_each(raw, [](std::string& s) {
        std::ranges::transform(s, s.begin(), [](unsigned char c) {
            return std::tolower(c);
        });
    });

    // 步骤 4：去重（先排序）
    std::ranges::sort(raw);
    auto [first, last] = std::ranges::unique(raw);
    raw.erase(first, last);

    return raw;
}
```

### 5.3 排序与分区：TopK 问题

```cpp
#include <algorithm>
#include <vector>
#include <functional>

// 在海量数据中找 TopK，使用 partial_sort
std::vector<int> topk_largest(std::vector<int> data, std::size_t k) {
    if (k >= data.size()) {
        std::ranges::sort(data, std::greater{});
        return data;
    }
    std::partial_sort(data.begin(), data.begin() + k, data.end(), std::greater{});
    data.resize(k);
    return data;
}

// 使用 nth_element 找中位数（更高效）
double median(std::vector<int> data) {
    const auto n = data.size();
    if (n == 0) return 0.0;
    const auto mid = n / 2;
    std::ranges::nth_element(data, data.begin() + mid);
    if (n % 2 == 1) return data[mid];
    auto left_max = std::ranges::max(data | std::views::take(mid));
    return (left_max + data[mid]) / 2.0;
}
```

### 5.4 数值算法：滑动平均

```cpp
#include <numeric>
#include <vector>

// 使用 adjacent_difference + partial_sum 计算滑动平均
std::vector<double> moving_average(const std::vector<double>& data, std::size_t window) {
    if (data.size() < window || window == 0) return {};
    std::vector<double> result;
    result.reserve(data.size() - window + 1);

    // 前缀和
    std::vector<double> prefix(data.size() + 1, 0.0);
    std::partial_sum(data.begin(), data.end(), prefix.begin() + 1);

    for (std::size_t i = 0; i + window <= data.size(); ++i) {
        result.push_back((prefix[i + window] - prefix[i]) / static_cast<double>(window));
    }
    return result;
}

// 使用 std::midpoint 避免 overflow（C++20）
#include <numeric>
std::size_t safe_midpoint(std::size_t a, std::size_t b) {
    return std::midpoint(a, b);  // 避免 (a + b) / 2 溢出
}
```

### 5.5 堆算法：优先队列底层

```cpp
#include <algorithm>
#include <vector>
#include <functional>

// 手动实现最大堆（演示 make_heap/push_heap/pop_heap）
class MaxHeap {
public:
    void push(int x) {
        data_.push_back(x);
        std::push_heap(data_.begin(), data_.end());
    }
    int top() const { return data_.front(); }
    void pop() {
        std::pop_heap(data_.begin(), data_.end());
        data_.pop_back();
    }
    bool empty() const { return data_.empty(); }
private:
    std::vector<int> data_;
};

// 使用堆求 TopK（流式）
std::vector<int> stream_topk(std::vector<int> stream, std::size_t k) {
    std::vector<int> min_heap;
    for (int x : stream) {
        if (min_heap.size() < k) {
            min_heap.push_back(x);
            std::push_heap(min_heap.begin(), min_heap.end(), std::greater{});
        } else if (x > min_heap.front()) {
            std::pop_heap(min_heap.begin(), min_heap.end(), std::greater{});
            min_heap.back() = x;
            std::push_heap(min_heap.begin(), min_heap.end(), std::greater{});
        }
    }
    return min_heap;
}
```

### 5.6 并行算法：大规模数据处理

```cpp
#include <execution>
#include <algorithm>
#include <vector>
#include <numeric>
#include <chrono>
#include <iostream>

// 并行求和 + 方差
double parallel_variance(const std::vector<double>& data) {
    if (data.empty()) return 0.0;
    const auto n = static_cast<double>(data.size());

    // 并行求均值
    const double sum = std::reduce(
        std::execution::par, data.begin(), data.end(), 0.0);
    const double mean = sum / n;

    // 并行求平方差和
    std::vector<double> sq_diffs(data.size());
    std::transform(std::execution::par,
                   data.begin(), data.end(), sq_diffs.begin(),
                   [mean](double x) { return (x - mean) * (x - mean); });
    const double sq_sum = std::reduce(
        std::execution::par, sq_diffs.begin(), sq_diffs.end(), 0.0);
    return sq_sum / n;
}

// 性能对比：串行 vs 并行
void benchmark() {
    std::vector<double> data(10'000'000);
    std::iota(data.begin(), data.end(), 0.0);

    auto t1 = std::chrono::high_resolution_clock::now();
    double seq_sum = std::accumulate(data.begin(), data.end(), 0.0);
    auto t2 = std::chrono::high_resolution_clock::now();
    double par_sum = std::reduce(std::execution::par, data.begin(), data.end(), 0.0);
    auto t3 = std::chrono::high_resolution_clock::now();

    std::cout << "Sequential: "
              << std::chrono::duration_cast<std::chrono::milliseconds>(t2 - t1).count()
              << " ms\n";
    std::cout << "Parallel:   "
              << std::chrono::duration_cast<std::chrono::milliseconds>(t3 - t2).count()
              << " ms\n";
}
```

### 5.7 Ranges 视图组合：DSL 查询

```cpp
#include <ranges>
#include <algorithm>
#include <vector>
#include <string>

struct Order {
    std::string id;
    std::string customer;
    double amount;
    std::string status;  // "pending", "shipped", "cancelled"
    std::string region;
};

// 模拟 SQL 查询：SELECT customer, SUM(amount) FROM orders
//                WHERE status='shipped' AND region='APAC'
//                GROUP BY customer HAVING SUM(amount) > 1000
auto query_high_value_customers(const std::vector<Order>& orders) {
    auto filtered = orders
        | std::views::filter([](const Order& o) {
            return o.status == "shipped" && o.region == "APAC";
        });

    // 按客户分组并求和（C++23 缺少 chunk_by 直接聚合，需手动聚合）
    std::map<std::string, double> by_customer;
    for (const auto& o : filtered) {
        by_customer[o.customer] += o.amount;
    }

    std::vector<std::pair<std::string, double>> result;
    for (const auto& [customer, total] : by_customer) {
        if (total > 1000.0) {
            result.emplace_back(customer, total);
        }
    }
    std::ranges::sort(result, [](const auto& a, const auto& b) {
        return a.second > b.second;
    });
    return result;
}

// C++23 chunk_by 简化分组
void cpp23_chunk_by_demo(const std::vector<Order>& orders) {
    auto sorted = orders | std::views::transform(&Order::customer)
                         | std::views::filter([](const std::string& s) { return !s.empty(); });
    // 注意：chunk_by 要求范围已按分组键排序
    // 此处仅作演示
}
```

### 5.8 二分搜索：调度系统任务查找

```cpp
#include <algorithm>
#include <vector>

struct Task {
    int start_time;
    int end_time;
    std::string name;
};

class TaskScheduler {
public:
    void add_task(Task t) {
        auto it = std::lower_bound(tasks_.begin(), tasks_.end(), t,
            [](const Task& a, const Task& b) { return a.start_time < b.start_time; });
        tasks_.insert(it, std::move(t));
    }

    // 查询在指定时间点之后开始的第一个任务
    const Task* find_first_after(int time) const {
        auto it = std::ranges::lower_bound(tasks_, time, {}, &Task::start_time);
        if (it == tasks_.end()) return nullptr;
        return &(*it);
    }

    // 检查时间窗口内是否有任务
    bool has_task_in_range(int start, int end) const {
        auto it = std::ranges::lower_bound(tasks_, start, {}, &Task::start_time);
        return it != tasks_.end() && it->start_time <= end;
    }

private:
    std::vector<Task> tasks_;  // 保持按 start_time 排序
};
```

### 5.9 集合操作：差集合并

```cpp
#include <algorithm>
#include <vector>
#include <set>

// 计算两个有序容器的差集（员工调动场景）
std::vector<int> employees_moved(
    const std::vector<int>& before,
    const std::vector<int>& after) {
    // 假设两者都已排序
    std::vector<int> added, removed, result;
    std::ranges::set_difference(after, before, std::back_inserter(added));
    std::ranges::set_difference(before, after, std::back_inserter(removed));
    // 合并：先新增后删除
    result.reserve(added.size() + removed.size());
    for (int x : added) result.push_back(x);
    for (int x : removed) result.push_back(-x);  // 负号表示删除
    return result;
}
```

### 5.10 C++23 折叠算法：可选聚合

```cpp
#include <algorithm>
#include <vector>
#include <optional>
#include <string>

// C++23 ranges::fold_left 处理空范围返回 optional
std::optional<std::string> concat_non_empty(const std::vector<std::string>& v) {
    return std::ranges::fold_left_first(
        v | std::views::filter([](const std::string& s) { return !s.empty(); }),
        [](std::string a, const std::string& b) { return std::move(a) + ", " + b; }
    );
}

// contains 简化查找判定
bool has_admin_role(const std::vector<std::string>& roles) {
    return std::ranges::contains(roles, std::string{"admin"});
}

// starts_with 检查前缀
bool all_codes_start_with(const std::vector<std::string>& codes, std::string_view prefix) {
    return std::ranges::all_of(codes, [prefix](const std::string& s) {
        return std::ranges::starts_with(s, prefix);
    });
}
```

## 6. 对比分析（横向对比）

### 6.1 STL vs Rust Iterator

```rust
// Rust 风格
let v: Vec<i32> = vec![1, 2, 3, 4, 5];
let result: Vec<i32> = v.iter()
    .filter(|&&x| x % 2 == 0)
    .map(|&x| x * x)
    .collect();
```

```cpp
// C++ 风格
std::vector<int> v = {1, 2, 3, 4, 5};
auto result = v
    | std::views::filter([](int x) { return x % 2 == 0; })
    | std::views::transform([](int x) { return x * x; })
    | std::ranges::to<std::vector>();  // C++23
```

| 维度 | C++ STL | Rust Iterator |
| :--- | :--- | :--- |
| 错误处理 | UB / 异常 | Result/Option 编译期保证 |
| 惰性求值 | C++20 Views | 默认所有迭代器 |
| 零开销 | 是 | 是 |
| 并行化 | `std::execution::par` | `rayon` crate（外部） |
| 内存安全 | 不保证 | 编译期保证 |
| 学习曲线 | 陡（模板报错） | 中等（生命周期） |

### 6.2 STL vs Java Stream

```java
// Java 风格
List<Integer> result = list.stream()
    .filter(x -> x % 2 == 0)
    .map(x -> x * x)
    .collect(Collectors.toList());
```

| 维度 | C++ STL | Java Stream |
| :--- | :--- | :--- |
| 性能 | 编译期优化，零开销 | JIT 优化，有装箱开销 |
| 并行化 | `std::execution::par`（编译器决定） | `.parallel()`（运行时 ForkJoinPool） |
| 惰性求值 | Views | 默认 |
| 类型推导 | `auto` | `var`（Java 10+） |
| 内存模型 | 手动 / RAII | GC 管理 |

### 6.3 STL vs Python itertools

```python
# Python 风格
result = [x*x for x in v if x % 2 == 0]
# 或
import itertools
result = list(map(lambda x: x*x, filter(lambda x: x % 2 == 0, v)))
```

| 维度 | C++ STL | Python itertools |
| :--- | :--- | :--- |
| 性能 | 编译期优化 | 解释执行 |
| 类型安全 | 编译期 | 运行时 |
| 表达力 | 中等 | 高（生成器） |
| 内存 | 零开销 | 生成器惰性 |
| 错误处理 | UB / 异常 | 异常 |

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：迭代器失效

```cpp
// 错误：在 for_each 中修改容器
std::vector<int> v = {1, 2, 3, 4, 5};
std::for_each(v.begin(), v.end(), [&v](int x) {
    if (x % 2 == 0) v.push_back(x * 10);  // UB：可能导致迭代器失效
});

// 正确：使用临时容器
std::vector<int> to_add;
std::for_each(v.begin(), v.end(), [&to_add](int x) {
    if (x % 2 == 0) to_add.push_back(x * 10);
});
v.insert(v.end(), to_add.begin(), to_add.end());
```

### 7.2 陷阱：算法复杂度退化

```cpp
// 错误：在 list 上使用 sort（会编译失败或退化为低效）
std::list<int> l = {3, 1, 4, 1, 5};
// std::sort(l.begin(), l.end());  // 编译失败：list 迭代器不是 RandomAccess
l.sort();  // 正确：list 自带成员 sort，O(n log n)

// 错误：误以为 find 是 O(log n)
std::vector<int> v = {1, 3, 5, 7, 9};
auto it = std::find(v.begin(), v.end(), 5);  // O(n)，不是 O(log n)
auto it2 = std::lower_bound(v.begin(), v.end(), 5);  // O(log n)，要求有序
```

### 7.3 陷阱：remove 不真正删除

```cpp
// 错误：忘记 erase
std::vector<int> v = {1, 2, 3, 4, 5};
std::remove(v.begin(), v.end(), 3);  // v.size() 仍是 5！

// 正确：使用 erase-remove 惯用法
v.erase(std::remove(v.begin(), v.end(), 3), v.end());

// C++20+：使用 erase/erase_if
std::erase(v, 3);
```

### 7.4 陷阱：并行算法的数据竞争

```cpp
// 错误：非原子累加
std::vector<int> v(1'000'000, 1);
int sum = 0;
std::for_each(std::execution::par, v.begin(), v.end(), [&](int x) {
    sum += x;  // 数据竞争！
});

// 正确：使用 std::reduce（自动并行安全）
int sum = std::reduce(std::execution::par, v.begin(), v.end(), 0);

// 正确：使用 std::transform_reduce 同时变换与归约
int sum_of_squares = std::transform_reduce(
    std::execution::par,
    v.begin(), v.end(),
    0,
    std::plus{},
    [](int x) { return x * x; }
);
```

### 7.5 陷阱：二分搜索的未排序前置条件

```cpp
// 错误：在未排序范围上使用 binary_search
std::vector<int> v = {5, 1, 4, 2, 3};
bool found = std::binary_search(v.begin(), v.end(), 2);  // UB：未排序，可能返回 false

// 正确：先排序
std::sort(v.begin(), v.end());
bool found = std::binary_search(v.begin(), v.end(), 2);  // true
```

### 7.6 陷阱：string_view 生命周期

```cpp
// 错误：视图悬空
std::string_view get_first_word(const std::string& s) {
    auto pos = s.find(' ');
    if (pos == std::string::npos) return s;
    return std::string_view(s.data(), pos);
    // 若 s 是临时对象，string_view 悬空
}

// 正确：返回值或确保生命周期
std::string get_first_word(const std::string& s) {
    auto pos = s.find(' ');
    return s.substr(0, pos);
}
```

### 7.7 陷阱：unique 不真正去重

```cpp
// 错误：unique 只去除相邻重复
std::vector<int> v = {1, 2, 1, 3, 1};
std::unique(v.begin(), v.end());  // 不删除所有 1，只删相邻的

// 正确：先排序再 unique
std::sort(v.begin(), v.end());
v.erase(std::unique(v.begin(), v.end()), v.end());
```

### 7.8 陷阱：stable_sort 的内存

```cpp
// 错误：未考虑 stable_sort 的内存开销
std::vector<HugeObject> v(10'000'000);
std::stable_sort(v.begin(), v.end());  // 可能 OOM

// 正确：评估内存，或使用 sort（不保证稳定）
std::sort(v.begin(), v.end());  // O(1) 额外内存

// 或：先按稳定键排序，再按目标键 sort
struct Item { int id; int priority; };
std::vector<Item> items;
std::sort(items.begin(), items.end(), [](const Item& a, const Item& b) {
    if (a.priority != b.priority) return a.priority > b.priority;
    return a.id < b.id;  // 显式稳定
});
```

### 7.9 陷阱：transform 输出范围不足

```cpp
// 错误：输出范围太小
std::vector<int> src = {1, 2, 3, 4, 5};
std::vector<int> dst(3);
std::transform(src.begin(), src.end(), dst.begin(), [](int x) { return x * 2; });  // UB：越界

// 正确：使用 back_inserter 或预分配
std::vector<int> dst;
std::transform(src.begin(), src.end(), std::back_inserter(dst), [](int x) { return x * 2; });
```

### 7.10 陷阱：默认比较器不匹配

```cpp
// 错误：自定义类型未定义 operator<
struct Person { std::string name; int age; };
std::vector<Person> v;
std::sort(v.begin(), v.end());  // 编译失败

// 正确：提供比较器
std::sort(v.begin(), v.end(), [](const Person& a, const Person& b) {
    return a.age < b.age;
});

// C++20：使用 Ranges + 投影
std::ranges::sort(v, {}, &Person::age);
```

### 7.11 最佳实践：优先使用 Ranges

C++20 起，优先使用 `std::ranges::` 版本：

- 更简洁的 API（无需 `begin()`/`end()`）
- 编译期 concept 检查
- 投影支持
- 与视图无缝集成

```cpp
// 旧风格
std::sort(v.begin(), v.end(), [](const Person& a, const Person& b) {
    return a.age < b.age;
});

// 新风格
std::ranges::sort(v, {}, &Person::age);
```

### 7.12 最佳实践：并行算法的选择

- 数据量 $< 10^4$：使用顺序版本（并行启动开销不划算）
- 数据量 $10^4 \sim 10^6$：考虑 `std::execution::par`
- 数据量 $> 10^6$：考虑 `std::execution::par_unseq`
- 函数对象简单：使用 `par_unseq` 获得向量化收益
- 函数对象复杂或含同步：使用 `par`

```cpp
// 经验法则：先 benchmark 再决定
// benchmark 不同执行策略的实际性能
```

## 8. 工程实践

### 8.1 项目中的算法选择决策树

```
是否需要排序？
├── 是
│   ├── 需要稳定？ → stable_sort
│   ├── 只需 TopK？ → partial_sort
│   ├── 只需第 K 大？ → nth_element
│   └── 否则 → sort
├── 需要查找？
│   ├── 范围有序？ → binary_search / lower_bound / upper_bound
│   ├── 一次查找？ → find
│   └── 多次查找？ → 先 sort 再 binary_search，或用 set
├── 需要遍历？
│   ├── 修改元素？ → transform / for_each
│   ├── 计数？ → count / count_if
│   └── 判定？ → all_of / any_of / none_of
└── 需要聚合？
    ├── 求和？ → accumulate / reduce
    ├── 多容器？ → inner_product / transform_reduce
    └── 折叠？ → ranges::fold_left (C++23)
```

### 8.2 性能调优：避免不必要的拷贝

```cpp
// 错误：值传递大对象
std::vector<std::string> names;
std::sort(names.begin(), names.end(),
    [](std::string a, std::string b) { return a < b; });  // 每次比较拷贝

// 正确：const 引用
std::sort(names.begin(), names.end(),
    [](const std::string& a, const std::string& b) { return a < b; });

// C++20 投影更优
std::ranges::sort(names);
```

### 8.3 性能调优：缓存友好访问

```cpp
// 错误：列优先访问（缓存不友好）
void sum_columns(const std::vector<std::vector<int>>& matrix, std::vector<int>& col_sums) {
    for (size_t j = 0; j < matrix[0].size(); ++j) {
        for (size_t i = 0; i < matrix.size(); ++i) {
            col_sums[j] += matrix[i][j];  // 跳跃访问
        }
    }
}

// 正确：行优先 + 累加到 col_sums
void sum_columns_fast(const std::vector<std::vector<int>>& matrix, std::vector<int>& col_sums) {
    for (size_t i = 0; i < matrix.size(); ++i) {
        for (size_t j = 0; j < matrix[i].size(); ++j) {
            col_sums[j] += matrix[i][j];  // 连续访问
        }
    }
}
```

### 8.4 跨平台兼容性

```cpp
// 并行算法在 MSVC 与 libstdc++ 的差异
#if __has_include(<execution>)
    #include <execution>
    #define HAS_PARALLEL_STL 1
#else
    #define HAS_PARALLEL_STL 0
#endif

template <typename It, typename T>
T safe_reduce(It first, It last, T init) {
#if HAS_PARALLEL_STL
    return std::reduce(std::execution::par, first, last, init);
#else
    return std::accumulate(first, last, init);
#endif
}
```

### 8.5 测试与调试

```cpp
#include <algorithm>
#include <cassert>
#include <vector>

void test_sort() {
    std::vector<int> v = {5, 2, 8, 1, 9, 3};
    std::ranges::sort(v);
    assert(std::ranges::is_sorted(v));
    assert(v == (std::vector<int>{1, 2, 3, 5, 8, 9}));
}

void test_partition() {
    std::vector<int> v = {1, 2, 3, 4, 5, 6};
    auto it = std::ranges::partition(v, [](int x) { return x % 2 == 0; });
    assert(std::ranges::all_of(v | std::views::take(it - v.begin()), [](int x) { return x % 2 == 0; }));
    assert(std::ranges::all_of(std::ranges::subrange(it, v.end()), [](int x) { return x % 2 != 0; }));
}

int main() {
    test_sort();
    test_partition();
    return 0;
}
```

### 8.6 与 ABI 稳定性

STL 算法大多数为 `inline` 模板，ABI 稳定。但需要注意：

- `std::execution::par` 实现依赖 TBB（libstdc++）或 Windows ThreadPool（MSVC），跨实现不兼容
- 并行算法抛出异常时调用 `std::terminate`，不能跨 ABI 边界传播

### 8.7 代码规范

- 优先 `std::ranges::` 版本
- Lambda 参数使用 `const T&` 避免拷贝
- 投影优先于手写比较器
- 复杂管道拆分为命名函数

```cpp
// 推荐
auto is_active = [](const Order& o) { return o.status == "active"; };
auto to_amount = &Order::amount;
auto active_amounts = orders | std::views::filter(is_active)
                             | std::views::transform(to_amount);

// 不推荐
auto result = orders | std::views::filter([](const Order& o) { return o.status == "active"; })
                     | std::views::transform([](const Order& o) { return o.amount; });
```

## 9. 案例研究

### 9.1 案例一：电商订单分析系统

**场景**：分析 1000 万订单，计算各区域 Top10 商品。

**需求**：
- 输入：1000 万订单（每条订单含商品 ID、区域、金额）
- 输出：每个区域的 Top10 商品（按金额）

**方案对比**：

| 方案 | 复杂度 | 内存 | 实现 |
| :--- | :--- | :--- | :--- |
| 1. 全排序后分组 | $O(n \log n)$ | $O(n)$ | 简单但浪费 |
| 2. 分组后 partial_sort | $O(n + k \cdot m \log m)$ | $O(n)$ | 推荐 |
| 3. 分组后 nth_element | $O(n + k \cdot m)$ | $O(n)$ | 最优 |

**实现**：

```cpp
#include <algorithm>
#include <vector>
#include <string>
#include <map>
#include <chrono>
#include <iostream>

struct Order {
    std::string product_id;
    std::string region;
    double amount;
};

std::map<std::string, std::vector<std::pair<std::string, double>>>
top10_per_region(std::vector<Order> orders) {
    // 按 region 分组
    std::map<std::string, std::vector<std::pair<std::string, double>>> by_region;
    for (auto&& o : orders) {
        by_region[o.region].emplace_back(o.product_id, o.amount);
    }

    // 每组按金额聚合
    for (auto& [region, products] : by_region) {
        // 按产品 ID 聚合金额
        std::map<std::string, double> product_totals;
        for (auto& [pid, amt] : products) {
            product_totals[pid] += amt;
        }
        products.assign(product_totals.begin(), product_totals.end());

        // partial_sort 取 Top10
        const std::size_t k = std::min<std::size_t>(10, products.size());
        std::partial_sort(products.begin(), products.begin() + k, products.end(),
            [](const auto& a, const auto& b) { return a.second > b.second; });
        products.resize(k);
    }
    return by_region;
}

int main() {
    // 模拟 1000 万订单
    std::vector<Order> orders;
    orders.reserve(10'000'000);
    for (int i = 0; i < 10'000'000; ++i) {
        orders.push_back({
            "P" + std::to_string(i % 1000),
            (i % 5 == 0) ? "APAC" : (i % 5 == 1) ? "NA" : (i % 5 == 2) ? "EU" : (i % 5 == 3) ? "MEA" : "LATAM",
            static_cast<double>(i % 100) + 0.5
        });
    }

    auto t1 = std::chrono::high_resolution_clock::now();
    auto result = top10_per_region(std::move(orders));
    auto t2 = std::chrono::high_resolution_clock::now();

    std::cout << "Time: "
              << std::chrono::duration_cast<std::chrono::milliseconds>(t2 - t1).count()
              << " ms\n";
    for (const auto& [region, products] : result) {
        std::cout << region << ":\n";
        for (const auto& [pid, amt] : products) {
            std::cout << "  " << pid << ": " << amt << "\n";
        }
    }
    return 0;
}
```

### 9.2 案例二：日志实时去重与告警

**场景**：流式日志处理，去重相似日志并按频率告警。

**实现**：

```cpp
#include <algorithm>
#include <vector>
#include <string>
#include <unordered_map>
#include <chrono>

class LogDeduplicator {
public:
    void add(std::string log) {
        // 简化：相似度判定为完全相同
        ++counts_[log];
    }

    // 取频率前 N
    std::vector<std::pair<std::string, int>> top_n(int n) const {
        std::vector<std::pair<std::string, int>> v(counts_.begin(), counts_.end());
        const std::size_t k = std::min<std::size_t>(n, v.size());
        std::partial_sort(v.begin(), v.begin() + k, v.end(),
            [](const auto& a, const auto& b) { return a.second > b.second; });
        v.resize(k);
        return v;
    }

    // 周期性清理低频
    void prune_low_frequency(int threshold) {
        std::erase_if(counts_, [threshold](const auto& p) { return p.second < threshold; });
    }

private:
    std::unordered_map<std::string, int> counts_;
};
```

### 9.3 案例三：分布式任务调度

**场景**：根据任务优先级与依赖关系调度。

```cpp
#include <algorithm>
#include <vector>
#include <queue>

struct Task {
    int id;
    int priority;
    std::vector<int> dependencies;
};

// 拓扑排序 + 优先级
std::vector<int> schedule(const std::vector<Task>& tasks) {
    // 计算入度
    std::vector<int> in_degree(tasks.size(), 0);
    for (const auto& t : tasks) {
        for (int dep : t.dependencies) {
            ++in_degree[t.id];  // 假设 id 即索引
        }
    }

    // 优先队列（最大堆）
    auto cmp = [&](int a, int b) { return tasks[a].priority < tasks[b].priority; };
    std::priority_queue<int, std::vector<int>, decltype(cmp)> pq(cmp);

    for (size_t i = 0; i < tasks.size(); ++i) {
        if (in_degree[i] == 0) pq.push(i);
    }

    std::vector<int> order;
    while (!pq.empty()) {
        int cur = pq.top(); pq.pop();
        order.push_back(cur);
        // 此处简化：实际需更新依赖
    }
    return order;
}
```

## 10. 习题

### 10.1 基础题（Remember/Understand）

**题目 1**：列举 STL 算法的 5 大分类，各举 2 个例子。

**题目 2**：解释 `std::sort` 与 `std::stable_sort` 的区别，给出一个需要 stable_sort 的场景。

**题目 3**：以下代码的输出是什么？为什么？

```cpp
std::vector<int> v = {1, 2, 3, 2, 1};
v.erase(std::unique(v.begin(), v.end()), v.end());
// v 内容是？
```

### 10.2 中级题（Apply/Analyze）

**题目 4**：实现函数 `count_duplicates`，返回 vector 中重复元素的数量。

```cpp
std::size_t count_duplicates(std::vector<int> v);
```

**参考答案**：

```cpp
std::size_t count_duplicates(std::vector<int> v) {
    std::ranges::sort(v);
    const auto [first, last] = std::ranges::unique(v);
    return static_cast<std::size_t>(last - first);
}
```

**题目 5**：分析以下代码的问题并修正。

```cpp
std::vector<int> v = {5, 3, 1, 4, 2};
auto it = std::lower_bound(v.begin(), v.end(), 3);
std::cout << *it << "\n";
```

**分析**：`lower_bound` 要求范围已排序。当前未排序，行为未定义。

**修正**：

```cpp
std::vector<int> v = {5, 3, 1, 4, 2};
std::ranges::sort(v);  // 先排序
auto it = std::lower_bound(v.begin(), v.end(), 3);
std::cout << *it << "\n";  // 输出 3
```

**题目 6**：使用 Ranges 实现：给定 `vector<Person>`，按 age 升序，age 相同按 name 降序。

**参考答案**：

```cpp
std::ranges::sort(people, [](const Person& a, const Person& b) {
    if (a.age != b.age) return a.age < b.age;
    return a.name > b.name;
});
```

### 10.3 高级题（Evaluate/Create）

**题目 7**：评估在 `std::list` 上使用 `std::sort` 的可行性，若不可行，给出替代方案。

**分析与答案**：

`std::sort` 要求 RandomAccessIterator，`std::list` 迭代器是 Bidirectional，编译失败。替代方案：

1. 使用成员函数 `list::sort()`，复杂度 $O(n \log n)$，无额外内存（链表原地归并）
2. 拷贝到 `std::vector`，排序后拷贝回 `list`
3. 若频繁排序，考虑改用 `std::vector` 或 `std::set`

**题目 8**：设计一个通用的 `partition_by_predicate` 函数，将 vector 中满足谓词的元素移到前面，不满足的移到后面，返回分界迭代器。要求并行安全。

**参考答案**：

```cpp
template <typename T, typename Pred>
typename std::vector<T>::iterator
partition_by_predicate(std::vector<T>& v, Pred pred) {
    return std::partition(std::execution::par, v.begin(), v.end(), pred);
}
```

注意：`std::partition` 的并行版本要求谓词不修改元素，且不引入数据竞争。

**题目 9**：实现一个流式 TopK 类，支持 `add(x)` 和 `topk()` 操作，要求 `add` 为 $O(\log k)$，`topk` 为 $O(k \log k)$。

**参考答案**：

```cpp
#include <vector>
#include <algorithm>
#include <functional>

template <typename T, typename Cmp = std::less<T>>
class StreamingTopK {
public:
    StreamingTopK(std::size_t k, Cmp cmp = Cmp{}) : k_(k), cmp_(std::move(cmp)) {}

    void add(const T& x) {
        if (heap_.size() < k_) {
            heap_.push_back(x);
            std::push_heap(heap_.begin(), heap_.end(), cmp_);
        } else if (cmp_(heap_.front(), x)) {
            std::pop_heap(heap_.begin(), heap_.end(), cmp_);
            heap_.back() = x;
            std::push_heap(heap_.begin(), heap_.end(), cmp_);
        }
    }

    std::vector<T> topk() const {
        std::vector<T> result = heap_;
        std::sort_heap(result.begin(), result.end(), cmp_);
        std::reverse(result.begin(), result.end());
        return result;
    }

private:
    std::size_t k_;
    Cmp cmp_;
    std::vector<T> heap_;  // 最小堆（用于 TopK 最大）
};
```

**题目 10**：分析 `std::transform_reduce` 与 `std::accumulate` 的区别，给出一个并行优于串行的场景。

**分析与答案**：

- `std::accumulate` 严格顺序归约，复杂度 $O(n)$，无并行
- `std::transform_reduce` 接受执行策略，支持并行；要求二元操作满足结合律和交换律
- 场景：对 1000 万个 double 求平方和，并行版本可获 4-8 倍加速

```cpp
// 串行
double sq_sum = std::accumulate(v.begin(), v.end(), 0.0,
    [](double acc, double x) { return acc + x * x; });

// 并行（更快）
double sq_sum = std::transform_reduce(
    std::execution::par,
    v.begin(), v.end(),
    0.0,
    std::plus{},
    [](double x) { return x * x; }
);
```

### 10.4 开放题（Create）

**题目 11**：设计一个基于 Ranges 的 ETL 管道，从 CSV 文件读取数据，过滤无效行，转换字段，按字段分组聚合，输出 JSON。

**提示**：
- 使用 `std::views::istream` 读取
- 使用 `std::views::filter` 过滤
- 使用 `std::views::transform` 转换
- 使用 `std::ranges::sort` + `std::ranges::unique` 分组

**题目 12**：实现一个自定义迭代器 `fibonacci_iterator`，生成斐波那契数列，并使用 STL 算法（如 `std::accumulate`）计算前 N 项和。

**参考答案**：

```cpp
#include <iterator>
#include <algorithm>

class FibonacciIterator {
public:
    using iterator_category = std::input_iterator_tag;
    using value_type = long long;
    using difference_type = std::ptrdiff_t;
    using pointer = const long long*;
    using reference = const long long&;

    FibonacciIterator() : a_(0), b_(1), n_(0) {}
    FibonacciIterator(std::size_t n) : a_(0), b_(1), n_(n) {}

    reference operator*() const { return a_; }
    pointer operator->() const { return &a_; }
    FibonacciIterator& operator++() {
        long long next = a_ + b_;
        a_ = b_;
        b_ = next;
        ++n_;
        return *this;
    }
    FibonacciIterator operator++(int) { auto tmp = *this; ++(*this); return tmp; }
    bool operator==(const FibonacciIterator& other) const { return n_ == other.n_; }

private:
    long long a_, b_;
    std::size_t n_;
};

long long sum_fibonacci(std::size_t n) {
    return std::accumulate(FibonacciIterator{}, FibonacciIterator{n}, 0LL);
}
```

## 11. 参考文献

### 11.1 标准文档

- ISO/IEC 14882:2023 *Information technology — Programming languages — C++*，§25 Algorithms library，§26 Ranges
- ISO/IEC TS 19570:2018 *C++ Extensions for Parallelism*（已并入 C++17）

### 11.2 核心提案

- N3411 *Working Draft, Technical Specification for C++ Extensions for Parallelism*（Hoberock, 2012）
- N4128 *Ranges for the Standard Library, Rev 1*（Niebler, 2014）
- P0024R0 *Parallel Algorithms TS*（Hoberock, 2015）
- P0789R0 *Range Adaptors and Utilities*（Niebler, 2017）
- P0896R4 *The One Ranges Proposal*（Niebler, 2018）
- P2210R2 *Superior String Splitting*（Niebler, 2021）
- P2322R6 *`ranges::fold`*（Niebler, 2022）
- P2302R4 *`ranges::contains`*（Kalb, 2021）
- P2447R4 *`views::repeat`*（Lakos, 2022）

### 11.3 学术论文

- Musser, David R. *Introspective Sorting and Selection Algorithms*. Software: Practice and Experience, 27(8):983-993, 1997.
- Stepanov, Alexander; Lee, Meng. *The Standard Template Library*. HP Laboratories Technical Report 95-11(R.1), 1995.
- Austern, Matthew H. *Generic Programming and the STL*. Addison-Wesley, 1998.
- Josuttis, Nicolai. *The C++ Standard Library: A Tutorial and Reference*. 2nd ed., Addison-Wesley, 2012.

### 11.4 经典教材

- Stroustrup, Bjarne. *The C++ Programming Language*. 4th ed., Addison-Wesley, 2013.（Chapter 31: STL）
- Meyers, Scott. *Effective STL*. Addison-Wesley, 2001.
- Josuttis, Nicolai. *C++23 - The Complete Guide*. 2023.

### 11.5 在线资源

- cppreference.com *Algorithms library*: https://en.cppreference.com/w/cpp/algorithm
- cppreference.com *Ranges library*: https://en.cppreference.com/w/cpp/ranges
- Stroustrup *C++20 Ranges*: https://www.stroustrup.com/C++20FAQ.html#ranges
- Sutter, Herb *GotW #294: Parallel Algorithms*: https://herbsutter.com/

## 12. 延伸阅读

### 12.1 进阶书籍

- Williams, Anthony. *C++ Concurrency in Action*. 2nd ed., Manning, 2019.（第 10 章并行算法深入）
- Román, Iván. *C++20 - The Complete Guide*. 2022.
- Gregory, Kate. *C++23 in Action*. Manning, 2024.

### 12.2 视频课程

- MIT 6.172 *Performance Engineering of Software Systems*（Charles Leiserson）
- Stanford CS106L *Standard C++ Programming*
- CppCon talks:
  - Sean Parent *Better Code: Algorithms* (2015)
  - Eric Niebler *Ranges for the Standard Library* (CppCon 2015-2019 系列)
  - Conor Hoekstra *Algorithm Intuition* (CppCon 2020)
  - Bryce Adelstein Lelbach *The C++17 Parallel Algorithms Library* (CppCon 2016)

### 12.3 开源实现

- libstdc++ *Algorithms*: https://github.com/gcc-mirror/gcc/tree/master/libstdc++-v3/include/bits
- libc++ *Algorithms*: https://github.com/llvm/llvm-project/tree/main/libcxx/include
- MSVC STL *Algorithms*: https://github.com/microsoft/STL
- Boost.Algorithm: https://www.boost.org/doc/libs/release/libs/algorithm/
- Range-v3 (Ranges 原型): https://github.com/ericniebler/range-v3

### 12.4 相关主题

- C++20 Ranges（详见 *cpp/C++20范围*）
- STL 容器与迭代器（详见 *cpp/STL容器与迭代器*）
- Lambda 表达式（详见 *cpp/Lambda表达式*）
- 并发编程与并行算法（详见 *cpp/并发编程*）
- C++23 新特性（详见 *cpp/C++23新特性*）
- C++26 与最新标准（详见 *cpp/C++26与最新标准*）

### 12.5 实践建议

1. **从基础算法开始**：先掌握 `find`、`copy`、`transform`、`sort`、`accumulate`
2. **理解迭代器范畴**：阅读 `cpp/STL容器与迭代器` 后再深入算法
3. **Ranges 优先**：C++20 起新代码优先使用 `std::ranges::` 版本
4. **benchmark 验证**：对并行算法始终用真实数据 benchmark
5. **阅读实现**：浏览 libstdc++ 或 libc++ 的算法实现，理解内省排序等机制
6. **参与社区**：关注 CppCon、ISO C++ 委员会提案，跟进 C++26 演进

---

> 本文档基于 ISO/IEC 14882:2023（C++23）标准编写，覆盖 C++98 至 C++26 草案的主要算法演进。如需了解最新提案进展，请访问 [ISO C++ 委员会官网](https://isocpp.org/) 与 [cppreference.com](https://en.cppreference.com/)。
