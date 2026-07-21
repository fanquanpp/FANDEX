---
order: 75
title: C++23与C++26新特性
module: cpp
category: C++
difficulty: intermediate
description: 最新C++标准特性
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/C++与Rust对比
  - cpp/C++与Python交互
  - cpp/C++序列化
  - cpp/C++图形编程
prerequisites:
  - cpp/概述与环境配置
---

## 概述

C++ 标准每三年发布一个新版本。C++23 于 2023 年定稿，带来了 std::expected、std::print、std::flat_map 等实用特性；C++26 正在制定中，预计引入反射、契约、线性代数库等重大特性。了解这些新特性可以让你写出更简洁、更安全、更高效的代码。

为什么需要关注新特性？C++ 的新特性通常是为了解决现有语法的痛点。std::expected 让错误处理不再依赖异常，std::print 让控制台输出不再需要 iostream 的繁琐，flat_map 提供了更高效的关联容器。掌握新特性能让你的代码更现代、更高效。

## 基础概念

**std::expected**：一种可以包含期望值或错误的对象，是 std::optional 的推广。适合替代异常进行错误处理。

**std::print**：类型安全的格式化输出，类似 Python 的 print 和 Rust 的 println。替代 std::cout 的繁琐语法。

**std::flat_map / std::flat_set**：基于有序数组的关联容器，对于小数据集比 std::map 更高效（缓存友好）。

**std::generator**：协程生成器，用于惰性生成序列数据。

**deducing this**：允许成员函数根据对象的表达方式（左值/右值、const/non-const）自动推导 this 的类型。

## 快速上手

### std::print（C++23）

```cpp
#include <print>

int main() {
    // 基本输出
    std::print("你好，世界！\n");

    // 格式化输出
    std::string name = "张三";
    int age = 25;
    double score = 95.5;

    std::print("姓名: {}, 年龄: {}, 成绩: {:.1f}\n", name, age, score);

    // 带位置参数的格式化
    std::print("{0} 今年 {1} 岁，{0} 的成绩是 {2:.1f}\n", name, age, score);

    // 输出到标准错误
    std::println(stderr, "错误信息");

    // println 自动添加换行
    std::println("不需要手动加换行符");
}
```

### std::expected（C++23）

```cpp
#include <expected>
#include <string>
#include <iostream>

// 定义错误类型
enum class ParseError {
    EmptyInput,
    InvalidCharacter,
    OutOfRange
};

// 返回 expected：成功时包含 int，失败时包含 ParseError
std::expected<int, ParseError> parseInteger(const std::string& str) {
    if (str.empty()) {
        return std::unexpected(ParseError::EmptyInput);
    }

    // 检查是否都是数字
    for (char c : str) {
        if (!std::isdigit(c)) {
            return std::unexpected(ParseError::InvalidCharacter);
        }
    }

    try {
        int value = std::stoi(str);
        return value;
    } catch (...) {
        return std::unexpected(ParseError::OutOfRange);
    }
}

int main() {
    auto result = parseInteger("42");

    if (result.has_value()) {
        std::println("解析成功: {}", result.value());
    } else {
        switch (result.error()) {
            case ParseError::EmptyInput:
                std::println("错误: 输入为空");
                break;
            case ParseError::InvalidCharacter:
                std::println("错误: 包含非数字字符");
                break;
            case ParseError::OutOfRange:
                std::println("错误: 数值超出范围");
                break;
        }
    }
}
```

## 详细用法

### std::flat_map 和 std::flat_set（C++23）

```cpp
#include <flat_map>
#include <flat_set>
#include <string>
#include <iostream>

void flatContainerDemo() {
    // flat_map：基于有序数组的 map
    // 对于小数据集，比 std::map 更快（缓存友好、无节点分配开销）
    std::flat_map<std::string, int> scores;

    scores["张三"] = 95;
    scores["李四"] = 87;
    scores["王五"] = 92;

    // 遍历（按键排序）
    for (const auto& [name, score] : scores) {
        std::println("{}: {}", name, score);
    }

    // 查找
    if (auto it = scores.find("张三"); it != scores.end()) {
        std::println("找到: {}", it->second);
    }

    // flat_set：基于有序数组的 set
    std::flat_set<int> uniqueNumbers = {5, 3, 1, 4, 2, 3, 1};
    // 自动排序并去重: {1, 2, 3, 4, 5}

    // 何时使用 flat_map 而非 std::map？
    // - 数据量小（通常少于 100 个元素）
    // - 读取多，插入/删除少
    // - 需要更好的缓存性能
}
```

### std::generator（C++23）

```cpp
#include <generator>
#include <iostream>

// 生成斐波那契数列
std::generator<int> fibonacci() {
    int a = 0, b = 1;
    while (true) {
        co_yield a;        // 惰性生成一个值
        int temp = a + b;
        a = b;
        b = temp;
    }
}

// 生成范围内的整数
std::generator<int> range(int start, int end) {
    for (int i = start; i < end; i++) {
        co_yield i;
    }
}

// 过滤生成器
std::generator<int> evenNumbers(std::generator<int> source) {
    for (int value : source) {
        if (value % 2 == 0) {
            co_yield value;
        }
    }
}

int main() {
    // 使用生成器
    for (int value : fibonacci()) {
        if (value > 100) break;
        std::println("{}", value);
    }

    // 组合生成器
    for (int value : evenNumbers(range(0, 20))) {
        std::println("偶数: {}", value);
    }
}
```

### std::expected 链式操作

```cpp
#include <expected>
#include <string>
#include <fstream>

// 文件操作可能失败
std::expected<std::string, std::string> readFile(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) {
        return std::unexpected("无法打开文件: " + path);
    }
    std::string content((std::istreambuf_iterator<char>(file)),
                         std::istreambuf_iterator<char>());
    return content;
}

// 解析可能失败
std::expected<int, std::string> parseConfig(const std::string& content) {
    if (content.empty()) {
        return std::unexpected("配置内容为空");
    }
    // 简化：返回内容长度作为配置值
    return static_cast<int>(content.size());
}

// 链式处理
void processConfig(const std::string& configPath) {
    auto result = readFile(configPath)
        .and_then([](const std::string& content) {
            return parseConfig(content);
        })
        .transform([](int value) {
            return value * 2;
        });

    if (result.has_value()) {
        std::println("处理结果: {}", result.value());
    } else {
        std::println("错误: {}", result.error());
    }
}
```

### if consteval（C++23）

```cpp
#include <cmath>

// consteval 函数：必须在编译期执行
consteval int square(int n) {
    return n * n;
}

// if consteval：判断当前是否在编译期执行
constexpr double compute(double x) {
    if consteval {
        // 编译期路径：只能使用 constexpr 函数
        return x * x;
    } else {
        // 运行期路径：可以使用任何函数
        return std::pow(x, 2);
    }
}

int main() {
    // 编译期计算
    constexpr auto a = compute(3.0);  // 走 consteval 分支

    // 运行期计算
    double x = 3.0;
    auto b = compute(x);  // 走 else 分支

    return 0;
}
```

### 多维下标运算符（C++23）

```cpp
#include <vector>
#include <cassert>

// 二维矩阵类
class Matrix {
    std::vector<double> data_;
    size_t rows_, cols_;

public:
    Matrix(size_t rows, size_t cols)
        : data_(rows * cols), rows_(rows), cols_(cols) {}

    // C++23：多维下标运算符
    double& operator[](size_t row, size_t col) {
        return data_[row * cols_ + col];
    }

    const double& operator[](size_t row, size_t col) const {
        return data_[row * cols_ + col];
    }
};

int main() {
    Matrix mat(3, 4);

    // C++23 语法：直接使用多维下标
    mat[1, 2] = 3.14;

    // 之前需要用函数调用
    // mat(1, 2) = 3.14;  或  mat.at(1, 2) = 3.14;

    return 0;
}
```

### std::string 的改进（C++23）

```cpp
#include <string>
#include <iostream>

void stringImprovements() {
    std::string text = "Hello, World!";

    // contains：检查是否包含子串（C++23 之前需要用 find）
    if (text.contains("World")) {
        std::println("包含 'World'");
    }

    // starts_with / ends_with（C++20 引入，C++23 完善支持）
    if (text.starts_with("Hello")) {
        std::println("以 'Hello' 开头");
    }
    if (text.ends_with("!")) {
        std::println("以 '!' 结尾");
    }
}
```

### C++26 预览特性

```cpp
// 1. 契约（Contracts）- C++26 预计引入
// 允许在函数上添加前置条件、后置条件和断言

// 预计语法（具体语法可能变化）：
// int divide(int a, int b)
//     [[pre: b != 0]]           // 前置条件
//     [[post r: r == a / b]]    // 后置条件
// {
//     return a / b;
// }

// 2. 反射（Reflection）- C++26 可能引入
// 允许在编译期检查和操作类型信息
// 类似 C# 的反射但在编译期执行

// 3. 线性代数库 std::linalg
// 基于 BLAS 的线性代数操作
#include <linalg>  // C++26 预计

// 矩阵乘法等操作将标准化
// std::linalg::matrix_multiply(A, B, C);

// 4. 调试工具 std::is_debugger_present
// 检查是否在调试器中运行
// if (std::is_debugger_present()) { ... }

// 5. hazard_pointer 和 rcu
// 无锁数据结构的标准化支持
```

## 常见场景

### 使用 std::expected 替代异常

```cpp
#include <expected>
#include <string>
#include <vector>

// 定义统一的错误类型
struct Error {
    int code;
    std::string message;
};

// 数据库操作
std::expected<std::vector<User>, Error> queryUsers(const std::string& sql) {
    if (sql.empty()) {
        return std::unexpected(Error{400, "SQL 不能为空"});
    }

    // 模拟数据库查询
    if (!isConnected()) {
        return std::unexpected(Error{503, "数据库未连接"});
    }

    std::vector<User> users = executeQuery(sql);
    return users;
}

// 使用
void displayUsers() {
    auto result = queryUsers("SELECT * FROM users");
    if (result.has_value()) {
        for (const auto& user : result.value()) {
            std::println("{}", user.name);
        }
    } else {
        std::println("错误 [{}]: {}", result.error().code, result.error().message);
    }
}
```

## 注意事项

**编译器支持**：C++23 和 C++26 的特性需要较新的编译器版本。GCC 13+、Clang 16+、MSVC 19.34+ 支持大部分 C++23 特性。

**渐进采用**：不需要一次性迁移所有代码到新特性。可以在新代码中使用新特性，旧代码保持不变。

**std::expected 与异常的选择**：expected 适合可预期的错误（如文件不存在、格式错误），异常适合不可预期的错误（如内存不足）。两者可以共存。

**flat_map 的适用场景**：flat_map 在插入和删除时需要移动元素，时间复杂度为 O(n)。不适合频繁插入删除的大数据集。

**C++26 特性不稳定**：C++26 的特性仍在制定中，具体语法和行为可能变化。不建议在生产代码中使用未定稿的特性。

## 进阶用法

### deducing this（C++23）

```cpp
// deducing this：成员函数根据对象的值类别自动推导
struct Widget {
    int value = 0;

    // 传统写法：需要四个重载
    // int& get() { return value; }
    // const int& get() const { return value; }
    // int&& get() && { return std::move(value); }
    // const int&& get() const && { return std::move(value); }

    // C++23：一个函数搞定
    template<typename Self>
    auto&& get(this Self&& self) {
        return std::forward<Self>(self).value;
    }
};

int main() {
    Widget w;
    w.get();            // 返回 int&

    const Widget cw;
    cw.get();           // 返回 const int&

    Widget().get();     // 返回 int&&
}
```

### std::unreachable（C++23）

```cpp
#include <utility>

enum class Color { Red, Green, Blue };

std::string_view colorName(Color c) {
    switch (c) {
        case Color::Red:   return "红色";
        case Color::Green: return "绿色";
        case Color::Blue:  return "蓝色";
    }
    // 告诉编译器这个位置不可达
    // 如果运行到这里，行为未定义（但编译器可以优化）
    std::unreachable();
}
```
