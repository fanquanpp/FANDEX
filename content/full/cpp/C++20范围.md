---
order: 55
title: C++20范围
module: cpp
category: C++
difficulty: advanced
description: Ranges库与视图组合
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/Lambda表达式
  - cpp/模板元编程
  - cpp/C++20模块
  - cpp/C++23与C++26新特性
prerequisites:
  - cpp/概述与现代标准
---

## 概述

C++20 引入的 Ranges 库为标准库算法带来了范式级的变革。它将算法与数据源解耦，通过视图（View）实现惰性求值的链式管道操作，使数据处理代码更加声明式和高效。传统 STL 算法依赖迭代器对，而 Ranges 以"范围"为基本抽象，配合管道操作符 `|` 实现数据流的组合变换，代码可读性显著提升。

Ranges 的核心设计理念是：算法不应关心数据的存储方式，数据变换应该像流水线一样可组合。视图是轻量级的范围适配器，不会复制底层数据，仅在迭代时按需计算。

## 基础概念

### 范围（Range）

范围是对可迭代数据的抽象，任何提供 `begin()` 和 `end()` 的类型都是范围。C++20 通过 `std::ranges::range` 概念约束范围类型，包括容器、数组、初始化列表等。

### 视图（View）

视图是惰性求值的范围适配器，具有以下特性：

- 不拥有数据，仅引用底层范围
- 复制、赋值和销毁的复杂度为 O(1)
- 惰性求值，仅在迭代时才执行计算
- 可通过管道操作符 `|` 链式组合

### 常用视图一览

| 视图        | 说明                      |
| ----------- | ------------------------- |
| `filter`    | 根据谓词过滤元素          |
| `transform` | 对每个元素应用转换函数    |
| `take`      | 取前 n 个元素             |
| `drop`      | 跳过前 n 个元素           |
| `reverse`   | 反转元素顺序              |
| `sort`      | 排序（C++20 ranges 算法） |
| `unique`    | 去除连续重复元素          |
| `join`      | 展平嵌套范围              |
| `zip`       | 合并多个范围（C++23）     |
| `enumerate` | 带索引遍历（C++23）       |
| `chunk`     | 分块（C++23）             |
| `slide`     | 滑动窗口（C++23）         |

## 快速上手

### 管道式数据变换

```cpp
#include <ranges>
#include <vector>
#include <iostream>

int main() {
    std::vector<int> nums = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

    // 链式管道：过滤偶数 -> 平方 -> 取前5个
    auto result = nums
        | std::views::filter([](int n) { return n % 2 == 0; })
        | std::views::transform([](int n) { return n * n; })
        | std::views::take(5);

    for (int n : result) {
        std::cout << n << " ";  // 输出: 4 16 36 64 100
    }
    return 0;
}
```

### 使用 iota 生成序列

```cpp
#include <ranges>

// 生成 1 到 99 的整数序列
auto nums = std::views::iota(1, 100);

// 过滤偶数并求平方，取前5个
auto even_squared = nums
    | std::views::filter([](int n) { return n % 2 == 0; })
    | std::views::transform([](int n) { return n * n; })
    | std::views::take(5);

for (int n : even_squared) {
    std::cout << n << " ";  // 输出: 4 16 36 64 100
}
```

## 详细用法

### filter -- 条件过滤

```cpp
#include <ranges>
#include <vector>
#include <string>

struct Student {
    std::string name;
    int score;
};

int main() {
    std::vector<Student> students = {
        {"张三", 85}, {"李四", 62}, {"王五", 91}, {"赵六", 58}
    };

    // 筛选成绩及格的学生
    auto passed = students
        | std::views::filter([](const Student& s) { return s.score >= 60; });

    for (const auto& s : passed) {
        std::cout << s.name << ": " << s.score << std::endl;
    }
    return 0;
}
```

### transform -- 元素转换

```cpp
#include <ranges>
#include <vector>

int main() {
    std::vector<std::string> words = {"hello", "world", "cpp20"};

    // 转换为大写（简化示例，实际需逐字符转换）
    auto lengths = words
        | std::views::transform([](const std::string& s) { return s.size(); });

    for (size_t len : lengths) {
        std::cout << len << " ";  // 输出: 5 5 4
    }
    return 0;
}
```

### take 和 drop -- 截取与跳过

```cpp
#include <ranges>
#include <vector>
#include <iostream>

int main() {
    std::vector<int> data = {10, 20, 30, 40, 50, 60, 70};

    // 取前3个
    auto first3 = data | std::views::take(3);
    for (int n : first3) std::cout << n << " ";  // 10 20 30
    std::cout << std::endl;

    // 跳过前3个
    auto skip3 = data | std::views::drop(3);
    for (int n : skip3) std::cout << n << " ";  // 40 50 60 70
    std::cout << std::endl;

    // 组合使用：取中间部分
    auto middle = data | std::views::drop(2) | std::views::take(3);
    for (int n : middle) std::cout << n << " ";  // 30 40 50
    return 0;
}
```

### reverse 和 keys/values

```cpp
#include <ranges>
#include <map>
#include <iostream>

int main() {
    std::map<std::string, int> scores = {
        {"语文", 90}, {"数学", 85}, {"英语", 92}
    };

    // 遍历键
    for (const auto& key : std::views::keys(scores)) {
        std::cout << key << " ";  // 数学 英语 语文（按字典序）
    }
    std::cout << std::endl;

    // 遍历值并反转
    auto reversed_values = std::views::values(scores) | std::views::reverse;
    for (int v : reversed_values) {
        std::cout << v << " ";  // 92 85 90
    }
    return 0;
}
```

### join -- 展平嵌套范围

```cpp
#include <ranges>
#include <vector>
#include <iostream>

int main() {
    std::vector<std::vector<int>> nested = {{1, 2}, {3, 4, 5}, {6}};

    // 展平为一维
    auto flat = nested | std::views::join;

    for (int n : flat) {
        std::cout << n << " ";  // 输出: 1 2 3 4 5 6
    }
    return 0;
}
```

## 常见场景

### 数据清洗管道

```cpp
#include <ranges>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> raw_data = {0, -3, 5, 0, 8, -1, 12, 0, 7};

    // 清洗流程：去除零值 -> 过滤负数 -> 排序 -> 去重
    auto cleaned = raw_data
        | std::views::filter([](int n) { return n != 0; })
        | std::views::filter([](int n) { return n > 0; });

    // 排序和去重需要复制到容器（sort 会修改原数据）
    std::vector<int> result(cleaned.begin(), cleaned.end());
    std::ranges::sort(result);
    result.erase(std::ranges::unique(result).begin(), result.end());

    for (int n : result) {
        std::cout << n << " ";  // 输出: 5 7 8 12
    }
    return 0;
}
```

### 字符串分割与处理

```cpp
#include <ranges>
#include <string>
#include <iostream>

int main() {
    std::string text = "hello world from cpp20 ranges";

    // 按空格分割字符串（C++20 lazy split）
    auto words = std::views::split(text, ' ');

    for (const auto& word : words) {
        // word 是一个子范围，需要构造为 string
        std::string s(word.begin(), word.end());
        std::cout << s << std::endl;
    }
    return 0;
}
```

## 注意事项

- 视图是惰性求值的，每次迭代都会重新计算，如果需要多次遍历结果，应将视图复制到容器中
- 视图不拥有数据，底层容器被销毁后视图将变为悬空引用，使用时需确保底层容器的生命周期
- `std::views::filter` 和 `std::views::transform` 返回的视图不满足 `common_range`，其 `end()` 返回哨兵而非迭代器，某些需要双向迭代的场景需注意
- 部分视图（如 `filter`）的迭代器性能略低于原生循环，在对性能极其敏感的热路径中应进行基准测试
- `std::views::split` 在 C++20 中返回的子范围类型使用不便，C++23 的 `std::views::split` 改进了接口
- Ranges 算法（如 `std::ranges::sort`）会直接修改原容器，与视图的惰性语义不同，使用时需区分

## 进阶用法

### 自定义视图适配器

```cpp
#include <ranges>
#include <concepts>

// 自定义视图：每 N 个元素取一个（采样）
template<std::ranges::view V>
struct SampleView : std::ranges::view_interface<SampleView<V>> {
    V base_;
    std::size_t step_;

    // 迭代器实现（简化版）
    class iterator {
        std::ranges::iterator_t<V> current_;
        std::ranges::sentinel_t<V> end_;
        std::size_t step_;
    public:
        iterator(std::ranges::iterator_t<V> cur,
                 std::ranges::sentinel_t<V> end,
                 std::size_t step)
            : current_(cur), end_(end), step_(step) {}

        auto operator*() const { return *current_; }

        iterator& operator++() {
            // 前进 step 步
            for (std::size_t i = 0; i < step_ && current_ != end_; ++i) {
                ++current_;
            }
            return *this;
        }
    };

    auto begin() { return iterator{base_.begin(), base_.end(), step_}; }
    auto end() { return std::default_sentinel; }
};

// 适配器闭包对象（支持管道语法）
struct SampleFn {
    std::size_t step;
    template<std::ranges::viewable_range R>
    auto operator()(R&& r) const {
        return SampleView<std::views::all_t<R>>{
            std::views::all(std::forward<R>(r)), step
        };
    }
};

// 使用方式
// auto sampled = data | SampleFn{3};  // 每3个取1个
```

### C++23 新增视图

```cpp
#include <ranges>

// enumerate: 带索引遍历
std::vector<std::string> items = {"apple", "banana", "cherry"};
for (auto [index, value] : std::views::enumerate(items)) {
    std::cout << index << ": " << value << std::endl;
}

// zip: 合并多个范围
std::vector<int> ids = {1, 2, 3};
std::vector<std::string> names = {"张三", "李四", "王五"};
for (auto [id, name] : std::views::zip(ids, names)) {
    std::cout << id << " - " << name << std::endl;
}

// chunk: 分块处理
std::vector<int> data = {1, 2, 3, 4, 5, 6, 7};
for (auto chunk : std::views::chunk(data, 3)) {
    // 第一轮: {1, 2, 3}，第二轮: {4, 5, 6}，第三轮: {7}
    for (int n : chunk) std::cout << n << " ";
    std::cout << std::endl;
}

// slide: 滑动窗口
for (auto window : std::views::slide(data, 3)) {
    // {1,2,3}, {2,3,4}, {3,4,5}, {4,5,6}, {5,6,7}
    for (int n : window) std::cout << n << " ";
    std::cout << std::endl;
}
```

### Ranges 与投影（Projection）

Ranges 算法支持投影参数，避免编写简单的 lambda：

```cpp
#include <ranges>
#include <algorithm>
#include <vector>

struct Employee {
    std::string name;
    int age;
    double salary;
};

int main() {
    std::vector<Employee> employees = {
        {"张三", 28, 15000.0},
        {"李四", 35, 22000.0},
        {"王五", 24, 12000.0}
    };

    // 按年龄排序，使用投影替代 lambda
    std::ranges::sort(employees, {}, &Employee::age);

    // 按薪资降序排序
    std::ranges::sort(employees, std::greater{}, &Employee::salary);

    // 查找薪资最高的员工
    auto it = std::ranges::max_element(employees, {}, &Employee::salary);
    std::cout << "最高薪资: " << it->name << std::endl;
    return 0;
}
```
