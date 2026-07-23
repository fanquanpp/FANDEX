---
order: 90
tags:
  - cpp
  - c++26
  - c++23
  - c++20
  - metaprogramming
  - cmake
difficulty: advanced
title: 'C++26 与最新标准'
module: cpp
category: 'C++ Basics'
description: C++26/23/20/17/14/11标准演进、虚函数表原理、RAII原则、模板元编程、CMake构建系统、vcpkg包管理。
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/C++日期时间
  - cpp/C++格式化输出
  - cpp/STL容器与迭代器
  - cpp/并发编程
prerequisites:
  - cpp/概述与现代标准
---

## 1. C++26 标准（2026 年）

C++26 是 C++ 的下一个主要标准版本，计划于 2026 年发布。它引入了多项重大语言和库特性。

### 1.1 模式匹配 inspect

C++26 最令人期待的特性之一是结构化模式匹配，使用 `inspect` 关键字进行模式匹配。

```cpp
#include <iostream>
#include <string>
#include <variant>
#include <vector>

// 基本模式匹配
void describe(int n) {
    inspect (n) {
        0       => std::cout << "zero\n";
        1       => std::cout << "one\n";
        _       => std::cout << "other: " << n << "\n";
    }
}

// 带条件的模式匹配
std::string classify(int value) {
    return inspect (value) {
        0             => "zero";
        n if n < 0    => "negative";
        n if n > 100  => "large";
        _             => "small positive";
    };
}

// 结构解构匹配
struct Point { double x, y; };

void describe_point(const Point& p) {
    inspect (p) {
        Point{0.0, 0.0}   => std::cout << "origin\n";
        Point{x, 0.0}     => std::cout << "on x-axis at " << x << "\n";
        Point{0.0, y}     => std::cout << "on y-axis at " << y << "\n";
        Point{x, y}       => std::cout << "at (" << x << ", " << y << ")\n";
    }
}

// variant 匹配
using Value = std::variant<int, double, std::string>;

std::string to_string(const Value& v) {
    return inspect (v) {
        int i    => std::to_string(i);
        double d => std::to_string(d);
        std::string s => s;
    };
}

int main() {
    describe(0);
    describe(42);
    std::cout << classify(-5) << "\n";
    std::cout << classify(200) << "\n";

    Point p{3.0, 0.0};
    describe_point(p);

    Value v = std::string("hello");
    std::cout << to_string(v) << "\n";
    return 0;
}
```

### 1.2 契约编程

C++26 引入了契约编程（Contract Programming），允许在函数接口上指定前置条件、后置条件和不变式。

```cpp
#include <vector>
#include <cassert>
#include <iostream>

// 前置条件：使用 pre 条件
int safe_divide(int a, int b)
    [[pre: b != 0]]                    // 前置条件
    [[post result: result * b == a]]   // 后置条件
{
    return a / b;
}

// 不变式：类的不变量
class BankAccount {
    double balance_;
public:
    BankAccount(double init) : balance_(init)
        [[pre: init >= 0]]
    {}

    void deposit(double amount)
        [[pre: amount > 0]]
        [[post: balance_ >= 0]]
    {
        balance_ += amount;
    }

    void withdraw(double amount)
        [[pre: amount > 0]]
        [[pre: amount <= balance_]]
        [[post: balance_ >= 0]]
    {
        balance_ -= amount;
    }

    double get_balance() const
        [[post: result >= 0]]
    {
        return balance_;
    }
};

// 契约断言
template<typename T>
T safe_at(const std::vector<T>& v, std::size_t i) {
    [[assert: i < v.size()]];
    return v[i];
}

int main() {
    auto result = safe_divide(10, 3);
    std::cout << "10 / 3 = " << result << "\n";

    BankAccount acc(1000.0);
    acc.deposit(500.0);
    acc.withdraw(200.0);
    std::cout << "Balance: " << acc.get_balance() << "\n";
    return 0;
}
```

### 1.3 扩展 constexpr

C++26 进一步扩展了 `constexpr` 的能力，使更多代码可以在编译期执行。

```cpp
#include <array>
#include <algorithm>
#include <iostream>

// constexpr 中的虚函数调用（C++26）
struct Shape {
    constexpr virtual double area() const = 0;
    constexpr virtual ~Shape() = default;
};

struct Circle : Shape {
    double radius;
    constexpr Circle(double r) : radius(r) {}
    constexpr double area() const override { return 3.14159265 * radius * radius; }
};

struct Rectangle : Shape {
    double w, h;
    constexpr Rectangle(double w, double h) : w(w), h(h) {}
    constexpr double area() const override { return w * h; }
};

// 编译期计算
constexpr double total_area() {
    Circle c(5.0);
    Rectangle r(3.0, 4.0);
    return c.area() + r.area();
}

static_assert(total_area() > 0, "area should be positive");

// constexpr 中的更多标准库支持
constexpr std::array<int, 5> sorted() {
    std::array<int, 5> arr = {5, 3, 1, 4, 2};
    std::sort(arr.begin(), arr.end());
    return arr;
}

static_assert(sorted()[0] == 1);
static_assert(sorted()[4] == 5);

int main() {
    constexpr auto areas = total_area();
    std::cout << "Total area: " << areas << "\n";

    constexpr auto arr = sorted();
    for (auto x : arr) std::cout << x << " ";
    std::cout << "\n";
    return 0;
}
```

### 1.4 std::execution 并行算法

C++26 引入了 Senders/Receivers 模型的并行执行框架。

```cpp
#include <execution>
#include <algorithm>
#include <vector>
#include <iostream>
#include <numeric>

int main() {
    std::vector<int> data(10'000'000);
    std::iota(data.begin(), data.end(), 1);

    // 使用并行执行策略
    auto sum = std::reduce(
        std::execution::par,           // 并行执行
        data.begin(), data.end(),
        0LL
    );
    std::cout << "Sum: " << sum << "\n";

    // 使用并行不可排序执行策略（更高性能）
    std::sort(std::execution::par_unseq, data.begin(), data.end());

    // Senders/Receivers 模型（C++26）
    // auto snd = std::execution::schedule(std::execution::par)
    //     | std::execution::then([]{ return 42; })
    //     | std::execution::then([](int v){ return v * 2; });
    // auto result = std::execution::sync_wait(std::move(snd)).value();

    return 0;
}
```

## 2. C++23 标准特性

### 2.1 std::expected

`std::expected<T, E>` 是 C++23 引入的错误处理类型，类似于 Rust 的 `Result<T, E>`。

```cpp
#include <expected>
#include <string>
#include <iostream>
#include <fstream>

// 使用 expected 返回值或错误
std::expected<int, std::string> parse_int(const std::string& s) {
    try {
        size_t pos;
        int value = std::stoi(s, &pos);
        if (pos != s.size()) {
            return std::unexpected("trailing characters");
        }
        return value;
    } catch (const std::exception&) {
        return std::unexpected("invalid integer: " + s);
    }
}

// 链式错误处理
std::expected<double, std::string> safe_divide(int a, int b) {
    if (b == 0) {
        return std::unexpected("division by zero");
    }
    return static_cast<double>(a) / b;
}

// 使用 and_then 链式操作
std::expected<double, std::string> compute(int a, int b) {
    return safe_divide(a, b)
        .and_then([](double v) -> std::expected<double, std::string> {
            if (v < 0) return std::unexpected("negative result");
            return v;
        })
        .transform([](double v) { return v * 2.0; });
}

int main() {
    auto result = parse_int("42");
    if (result) {
        std::cout << "Parsed: " << *result << "\n";
    } else {
        std::cout << "Error: " << result.error() << "\n";
    }

    auto div = compute(10, 3);
    std::cout << "10/3*2 = " << div.value_or(0.0) << "\n";

    auto err = compute(10, 0);
    if (!err) {
        std::cout << "Error: " << err.error() << "\n";
    }
    return 0;
}
```

### 2.2 显式 this 参数（推导 this）

C++23 允许将 `this` 作为显式参数声明，简化了常量和非常量成员函数的重复编写。

```cpp
#include <iostream>
#include <string>

class Builder {
    std::string data_;
    int count_ = 0;

public:
    // 旧写法：需要两个版本
    // std::string& get_data() { return data_; }
    // const std::string& get_data() const { return data_; }

    // C++23 新写法：推导 this
    template<typename Self>
    auto&& get_data(this Self&& self) {
        return std::forward<Self>(self).data_;
    }

    // 链式调用也简化了
    template<typename Self>
    auto& set_count(this Self&& self, int n) {
        self.count_ = n;
        return self;
    }

    void print() const {
        std::cout << "data=" << data_ << ", count=" << count_ << "\n";
    }
};

// 递归 lambda（推导 this 的另一应用）
auto fibonacci = [](this auto self, int n) -> long long {
    if (n <= 1) return n;
    return self(n - 1) + self(n - 2);
};

int main() {
    Builder b;
    b.get_data() = "hello";
    b.set_count(5).print();

    const Builder& cb = b;
    std::cout << "const data: " << cb.get_data() << "\n";

    std::cout << "fib(10) = " << fibonacci(10) << "\n";
    return 0;
}
```

### 2.3 std::print 与 std::println

C++23 引入了类型安全的格式化输出，替代传统的 `printf` 和 `iostream`。

```cpp
#include <print>
#include <string>
#include <vector>

int main() {
    std::string name = "World";
    int value = 42;
    double pi = 3.14159265;

    // 基本格式化输出
    std::print("Hello, {}!\n", name);
    std::println("Value: {}", value);
    std::println("Pi: {:.2f}", pi);

    // 位置参数
    std::println("{0} {1} {0}", "hello", "world");

    // 宽度与对齐
    std::println("{:>10}", "right");   // 右对齐，宽度10
    std::println("{:<10}", "left");    // 左对齐，宽度10
    std::println("{:^10}", "center");  // 居中，宽度10

    // 数字格式
    std::println("{:d}", 42);          // 十进制
    std::println("{:x}", 255);         // 十六进制
    std::println("{:#x}", 255);        // 带前缀十六进制
    std::println("{:b}", 10);          // 二进制
    std::println("{:#010b}", 10);      // 带前缀补零二进制

    return 0;
}
```

### 2.4 std::mdspan

`std::mdspan` 是 C++23 引入的多维数组视图，提供对连续内存的多维访问。

```cpp
#include <mdspan>
#include <vector>
#include <iostream>

int main() {
    // 一维存储
    std::vector<double> flat(3 * 4, 0.0);

    // 创建 3x4 的二维视图
    std::mdspan<double, std::extents<size_t, 3, 4>> matrix(flat.data());

    // 填充数据
    for (size_t i = 0; i < matrix.extent(0); ++i) {
        for (size_t j = 0; j < matrix.extent(1); ++j) {
            matrix[i, j] = i * 10 + j;
        }
    }

    // 访问元素
    std::cout << "matrix[1, 2] = " << matrix[1, 2] << "\n";  // 12
    std::cout << "matrix[2, 3] = " << matrix[2, 3] << "\n";  // 23

    // 动态维度
    std::mdspan<double, std::dextents<size_t, 2>> dynamic_mat(flat.data(), 3, 4);

    // 子视图（slice）
    // auto row1 = std::submdspan(matrix, 1, std::full_extent);

    return 0;
}
```

## 3. C++20 标准特性

### 3.1 概念（Concepts）

概念为模板参数提供了命名约束，极大改善了模板编程的错误信息和可读性。

```cpp
#include <iostream>
#include <concepts>
#include <string>
#include <vector>

// 定义概念
template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::convertible_to<T>;
};

template<typename T>
concept Printable = requires(T t, std::ostream& os) {
    { os << t } -> std::convertible_to<std::ostream&>;
};

template<typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

// 使用概念约束模板
template<Addable T>
T add(T a, T b) {
    return a + b;
}

template<Numeric T>
T multiply(T a, T b) {
    return a * b;
}

// requires 子句
template<typename T>
    requires requires(T a, T b) { a < b; }
T min_val(T a, T b) {
    return (a < b) ? a : b;
}

// 标准库概念
template<std::ranges::range R>
void print_range(const R& r) {
    for (const auto& x : r) {
        std::cout << x << " ";
    }
    std::cout << "\n";
}

int main() {
    std::cout << add(3, 4) << "\n";
    std::cout << add(std::string("hello"), std::string(" world")) << "\n";
    std::cout << multiply(3, 4) << "\n";
    std::cout << min_val(3.14, 2.71) << "\n";

    std::vector<int> v = {1, 2, 3, 4, 5};
    print_range(v);
    return 0;
}
```

### 3.2 协程（Coroutines）

C++20 引入了协程支持，允许函数在执行中挂起和恢复。

```cpp
#include <iostream>
#include <coroutine>
#include <memory>

// 简单的生成器协程
template<typename T>
struct Generator {
    struct promise_type {
        T current_value;

        Generator get_return_object() {
            return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_always initial_suspend() { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void unhandled_exception() { throw; }

        std::suspend_always yield_value(T value) {
            current_value = value;
            return {};
        }
    };

    std::coroutine_handle<promise_type> handle;

    Generator(std::coroutine_handle<promise_type> h) : handle(h) {}
    ~Generator() { if (handle) handle.destroy(); }

    // 迭代器接口
    bool next() {
        handle.resume();
        return !handle.done();
    }

    T value() const {
        return handle.promise().current_value;
    }
};

// 使用协程生成斐波那契数列
Generator<int> fibonacci() {
    int a = 0, b = 1;
    while (true) {
        co_yield a;
        auto tmp = a + b;
        a = b;
        b = tmp;
    }
}

// 使用协程生成范围
Generator<int> range(int start, int end) {
    for (int i = start; i < end; ++i) {
        co_yield i;
    }
}

int main() {
    // 斐波那契数列前 10 个
    auto fib = fibonacci();
    for (int i = 0; i < 10; ++i) {
        std::cout << fib.value() << " ";
        fib.next();
    }
    std::cout << "\n";

    // 范围生成
    auto r = range(1, 6);
    while (r.next()) {
        std::cout << r.value() << " ";
    }
    std::cout << "\n";
    return 0;
}
```

### 3.3 范围（Ranges）

C++20 的 Ranges 库提供了组合式的数据处理管道。

```cpp
#include <iostream>
#include <vector>
#include <ranges>
#include <algorithm>
#include <string>

int main() {
    std::vector<int> nums = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

    // 管道式操作
    auto result = nums
        | std::views::filter([](int n) { return n % 2 == 0; })  // 过滤偶数
        | std::views::transform([](int n) { return n * n; })     // 平方
        | std::views::take(3);                                    // 取前3个

    for (int x : result) {
        std::cout << x << " ";  // 4 16 36
    }
    std::cout << "\n";

    // 更多视图操作
    auto reversed = nums | std::views::reverse | std::views::take(3);
    for (int x : reversed) {
        std::cout << x << " ";  // 10 9 8
    }
    std::cout << "\n";

    // 惰性求值
    auto view = std::views::iota(1)              // 无限序列 1,2,3,...
        | std::views::filter([](int n) { return n % 3 == 0; })
        | std::views::transform([](int n) { return n * 2; })
        | std::views::take(5);

    for (int x : view) {
        std::cout << x << " ";  // 6 12 18 24 30
    }
    std::cout << "\n";

    return 0;
}
```

### 3.4 模块（Modules）

C++20 模块替代了传统的头文件包含机制，提供更快的编译速度和更好的封装。

```cpp
// math_module.cppm — 模块接口文件
export module math_module;

export int add(int a, int b) {
    return a + b;
}

export int multiply(int a, int b) {
    return a * b;
}

// 内部符号不导出
int internal_helper(int x) {
    return x * x;
}

// 模块分区
export module math_module:advanced;

export double power(double base, int exp) {
    double result = 1.0;
    for (int i = 0; i < exp; ++i) result *= base;
    return result;
}
```

```cpp
// main.cpp — 使用模块
import math_module;
#include <iostream>

int main() {
    std::cout << add(3, 4) << "\n";
    std::cout << multiply(5, 6) << "\n";
    // internal_helper(5);  // 错误：未导出
    return 0;
}
```

## 4. C++17 标准特性

### 4.1 结构化绑定

```cpp
#include <iostream>
#include <map>
#include <tuple>
#include <array>

struct Point { double x, y, z; };

int main() {
    // 绑定 pair
    auto [key, value] = std::make_pair(std::string("name"), 42);
    std::cout << key << " = " << value << "\n";

    // 绑定 tuple
    auto [a, b, c] = std::make_tuple(1, 2.0, "three");
    std::cout << a << ", " << b << ", " << c << "\n";

    // 绑定结构体
    Point p{1.0, 2.0, 3.0};
    auto [x, y, z] = p;
    std::cout << "(" << x << ", " << y << ", " << z << ")\n";

    // 绑定数组
    std::array<int, 3> arr = {10, 20, 30};
    auto [first, second, third] = arr;

    // 遍历 map
    std::map<std::string, int> scores = {{"Alice", 95}, {"Bob", 87}};
    for (const auto& [name, score] : scores) {
        std::cout << name << ": " << score << "\n";
    }

    return 0;
}
```

### 4.2 if constexpr

```cpp
#include <iostream>
#include <type_traits>
#include <vector>
#include <string>

template<typename T>
auto to_string(const T& value) {
    if constexpr (std::is_integral_v<T>) {
        return std::to_string(value);
    } else if constexpr (std::is_floating_point_v<T>) {
        return std::to_string(value);
    } else if constexpr (std::is_same_v<T, std::string>) {
        return value;
    } else {
        return std::string("unknown");
    }
}

// 编译期分支消除
template<typename T>
void print_container(const T& container) {
    if constexpr (std::is_same_v<typename T::value_type, int>) {
        std::cout << "Integer container: ";
    } else {
        std::cout << "Other container: ";
    }
    for (const auto& x : container) {
        std::cout << x << " ";
    }
    std::cout << "\n";
}

int main() {
    std::cout << to_string(42) << "\n";
    std::cout << to_string(3.14) << "\n";
    std::cout << to_string(std::string("hello")) << "\n";

    std::vector<int> vi = {1, 2, 3};
    std::vector<std::string> vs = {"a", "b"};
    print_container(vi);
    print_container(vs);
    return 0;
}
```

### 4.3 std::variant / std::optional / std::filesystem

```cpp
#include <iostream>
#include <variant>
#include <optional>
#include <filesystem>
#include <string>

// std::variant: 类型安全的联合体
using Value = std::variant<int, double, std::string>;

struct Visitor {
    void operator()(int i) const { std::cout << "int: " << i << "\n"; }
    void operator()(double d) const { std::cout << "double: " << d << "\n"; }
    void operator()(const std::string& s) const { std::cout << "string: " << s << "\n"; }
};

// std::optional: 可能为空的值
std::optional<int> find_index(const std::vector<int>& v, int target) {
    for (size_t i = 0; i < v.size(); ++i) {
        if (v[i] == target) return static_cast<int>(i);
    }
    return std::nullopt;
}

int main() {
    // variant 使用
    Value v = 42;
    std::visit(Visitor{}, v);
    v = 3.14;
    std::visit(Visitor{}, v);
    v = std::string("hello");
    std::visit(Visitor{}, v);

    // optional 使用
    auto idx = find_index({10, 20, 30}, 20);
    if (idx) {
        std::cout << "Found at index: " << *idx << "\n";
    }
    auto not_found = find_index({10, 20, 30}, 99);
    std::cout << "Not found: " << not_found.has_value() << "\n";

    // filesystem 使用
    namespace fs = std::filesystem;
    fs::path p = "/usr/include";
    std::cout << "Path: " << p << "\n";
    std::cout << "Filename: " << p.filename() << "\n";
    std::cout << "Parent: " << p.parent_path() << "\n";
    std::cout << "Exists: " << fs::exists(p) << "\n";

    return 0;
}
```

## 5. C++14/11 核心特性回顾

### 5.1 移动语义与完美转发

```cpp
#include <iostream>
#include <utility>
#include <vector>
#include <string>

class Buffer {
    int* data_;
    size_t size_;
public:
    // 构造函数
    explicit Buffer(size_t n) : data_(new int[n]()), size_(n) {
        std::cout << "Construct " << size_ << "\n";
    }

    // 析构函数
    ~Buffer() {
        delete[] data_;
        std::cout << "Destruct " << size_ << "\n";
    }

    // 拷贝构造
    Buffer(const Buffer& other) : data_(new int[other.size_]), size_(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
        std::cout << "Copy " << size_ << "\n";
    }

    // 移动构造
    Buffer(Buffer&& other) noexcept : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;
        other.size_ = 0;
        std::cout << "Move " << size_ << "\n";
    }

    // 拷贝赋值与移动赋值省略...
};

// 完美转发
template<typename T, typename... Args>
std::unique_ptr<T> make_unique_custom(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}

int main() {
    Buffer a(100);          // 构造
    Buffer b = a;           // 拷贝构造
    Buffer c = std::move(a); // 移动构造

    auto ptr = make_unique_custom<Buffer>(50);
    return 0;
}
```

### 5.2 Lambda 表达式

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <functional>

int main() {
    // 基本 lambda
    auto add = [](int a, int b) { return a + b; };
    std::cout << add(3, 4) << "\n";

    // 捕获变量
    int factor = 10;
    auto multiply = [factor](int x) { return x * factor; };
    std::cout << multiply(5) << "\n";  // 50

    // 引用捕获
    int counter = 0;
    auto inc = [&counter]() { counter++; };
    inc(); inc(); inc();
    std::cout << "counter: " << counter << "\n";  // 3

    // 初始化捕获（C++14）
    auto ptr = [p = std::make_unique<int>(42)]() { return *p; };
    std::cout << "ptr value: " << ptr() << "\n";

    // 泛型 lambda（C++14）
    auto generic = [](auto x, auto y) { return x + y; };
    std::cout << generic(1, 2) << "\n";
    std::cout << generic(1.5, 2.5) << "\n";

    // 在算法中使用
    std::vector<int> v = {5, 2, 8, 1, 9, 3};
    std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });
    for (int x : v) std::cout << x << " ";
    std::cout << "\n";

    return 0;
}
```

### 5.3 auto、nullptr、override/final

```cpp
#include <iostream>
#include <vector>
#include <memory>

class Base {
public:
    virtual void foo() { std::cout << "Base::foo\n"; }
    virtual void bar() final { std::cout << "Base::bar (final)\n"; }
    virtual ~Base() = default;
};

class Derived : public Base {
public:
    void foo() override { std::cout << "Derived::foo\n"; }
    // void bar() override {}  // 错误：bar 是 final
};

int main() {
    // auto 类型推导
    auto x = 42;              // int
    auto pi = 3.14;           // double
    auto name = std::string("hello");  // std::string

    // auto 与容器
    std::vector<int> v = {1, 2, 3};
    for (auto it = v.begin(); it != v.end(); ++it) {
        std::cout << *it << " ";
    }
    std::cout << "\n";

    // nullptr 替代 NULL
    int* p = nullptr;         // 类型安全的空指针
    // int* q = NULL;        // 旧写法，不推荐

    // override 确保正确重写
    Derived d;
    Base& ref = d;
    ref.foo();  // Derived::foo

    return 0;
}
```

## 6. 虚函数表原理

### 6.1 vtable 内存布局

```cpp
#include <iostream>

/*
 * 虚函数表（vtable）是 C++ 实现多态的核心机制：
 *
 * 1. 每个含有虚函数的类都有一个 vtable（虚函数表）
 * 2. 每个对象实例包含一个指向 vtable 的指针（vptr）
 * 3. 虚函数调用通过 vptr -> vtable -> 函数指针 间接完成
 *
 * 内存布局示意：
 *
 * class Base {                    Base vtable:
 *   virtual void foo();          +-----------+
 *   virtual void bar();          | &Base::foo|
 *   int base_data;               | &Base::bar|
 * };                             +-----------+
 *
 * Base 对象内存：                 Derived vtable:
 * +-----------+                  +--------------+
 * | vptr ----+---> Base vtable   | &Derived::foo|
 * | base_data |                  | &Base::bar   |
 * +-----------+                  +--------------+
 */

class Base {
public:
    virtual void foo() { std::cout << "Base::foo\n"; }
    virtual void bar() { std::cout << "Base::bar\n"; }
    int base_data = 1;
};

class Derived : public Base {
public:
    void foo() override { std::cout << "Derived::foo\n"; }
    int derived_data = 2;
};

// 手动模拟 vtable 调用（仅演示原理，不可移植）
void demonstrate_vtable() {
    Derived d;
    Base* ptr = &d;

    // 正常虚函数调用
    ptr->foo();  // Derived::foo（通过 vtable 间接调用）
    ptr->bar();  // Base::bar

    // sizeof 分析
    std::cout << "sizeof(Base): " << sizeof(Base) << "\n";
    // 通常 = sizeof(void*) + sizeof(int) = 8 + 4 = 12（可能有对齐填充）

    std::cout << "sizeof(Derived): " << sizeof(Derived) << "\n";
    // 通常 = sizeof(Base) + sizeof(int) = 12 + 4 = 16（可能有对齐填充）
}

int main() {
    demonstrate_vtable();
    return 0;
}
```

### 6.2 多重继承与虚继承

```cpp
#include <iostream>

class A {
public:
    virtual void fa() { std::cout << "A::fa\n"; }
    int a_data = 1;
};

class B {
public:
    virtual void fb() { std::cout << "B::fb\n"; }
    int b_data = 2;
};

class C : public A, public B {
public:
    void fa() override { std::cout << "C::fa\n"; }
    void fb() override { std::cout << "C::fb\n"; }
    int c_data = 3;
};

/*
 * 多重继承内存布局：
 *
 * C 对象:
 * +-----------+
 * | vptr_A    | ---> C vtable for A part (含 &C::fa)
 * | a_data    |
 * +-----------+
 * | vptr_B    | ---> C vtable for B part (含 &C::fb)
 * | b_data    |
 * +-----------+
 * | c_data    |
 * +-----------+
 */

int main() {
    C c;
    A* pa = &c;
    B* pb = &c;   // pb 指针需要调整偏移量

    pa->fa();     // C::fa
    pb->fb();     // C::fb

    std::cout << "sizeof(A): " << sizeof(A) << "\n";
    std::cout << "sizeof(B): " << sizeof(B) << "\n";
    std::cout << "sizeof(C): " << sizeof(C) << "\n";

    return 0;
}
```

## 7. RAII 原则

### 7.1 RAII 核心思想

RAII（Resource Acquisition Is Initialization）是 C++ 最重要的编程范式之一：资源的获取在构造函数中完成，释放则在析构函数中完成。

```cpp
#include <iostream>
#include <fstream>
#include <mutex>
#include <memory>

// RAII 文件管理
class FileRAII {
    std::FILE* fp_;
    std::string path_;
public:
    FileRAII(const std::string& path, const char* mode)
        : fp_(std::fopen(path.c_str(), mode)), path_(path)
    {
        if (!fp_) throw std::runtime_error("Cannot open: " + path);
    }

    ~FileRAII() {
        if (fp_) {
            std::fclose(fp_);
            std::cout << "File closed: " << path_ << "\n";
        }
    }

    // 禁止拷贝
    FileRAII(const FileRAII&) = delete;
    FileRAII& operator=(const FileRAII&) = delete;

    // 允许移动
    FileRAII(FileRAII&& other) noexcept : fp_(other.fp_), path_(std::move(other.path_)) {
        other.fp_ = nullptr;
    }

    std::FILE* get() const { return fp_; }
};

// RAII 锁管理（标准库已提供 std::lock_guard / std::unique_lock）
std::mutex mtx;
int shared_counter = 0;

void safe_increment() {
    std::lock_guard<std::mutex> lock(mtx);  // RAII: 构造时加锁
    shared_counter++;
    // 析构时自动解锁，即使抛出异常也能正确释放
}

// 自定义 RAII 资源管理
class GDIObject {
    void* handle_;
public:
    explicit GDIObject(void* h) : handle_(h) {
        if (!h) throw std::runtime_error("Invalid handle");
    }
    ~GDIObject() {
        if (handle_) {
            // 释放 GDI 资源: DeleteObject(handle_);
            std::cout << "GDI resource freed\n";
        }
    }
    FileRAII(const FileRAII&) = delete;
    FileRAII& operator=(const FileRAII&) = delete;
};

int main() {
    {
        FileRAII file("test.txt", "w");
        std::fprintf(file.get(), "Hello RAII!\n");
    }  // file 在此处自动关闭

    safe_increment();
    return 0;
}
```

## 8. 模板元编程

### 8.1 SFINAE 与类型萃取

```cpp
#include <iostream>
#include <type_traits>
#include <vector>
#include <string>

// SFINAE: 替换失败不是错误
// 通过函数重载在编译期选择不同的实现

// 方式1: enable_if
template<typename T>
typename std::enable_if<std::is_integral_v<T>, T>::type
process(T value) {
    std::cout << "Integral: " << value << "\n";
    return value * 2;
}

template<typename T>
typename std::enable_if<std::is_floating_point_v<T>, T>::type
process(T value) {
    std::cout << "Floating: " << value << "\n";
    return value * 1.5;
}

// 方式2: void_t 检测成员（C++17）
template<typename T, typename = void>
struct has_size_method : std::false_type {};

template<typename T>
struct has_size_method<T, std::void_t<decltype(std::declval<T>().size())>>
    : std::true_type {};

// 方式3: constexpr if 替代 SFINAE（C++17 推荐）
template<typename T>
auto process_modern(T value) {
    if constexpr (std::is_integral_v<T>) {
        return value * 2;
    } else if constexpr (std::is_floating_point_v<T>) {
        return value * 1.5;
    } else {
        return value;
    }
}

int main() {
    process(42);        // Integral
    process(3.14);      // Floating

    std::cout << has_size_method<std::vector<int>>::value << "\n";  // 1
    std::cout << has_size_method<int>::value << "\n";               // 0

    std::cout << process_modern(10) << "\n";       // 20
    std::cout << process_modern(2.5) << "\n";      // 3.75
    return 0;
}
```

### 8.2 变参模板

```cpp
#include <iostream>
#include <string>

// 递归终止
void print() {
    std::cout << "\n";
}

// 变参模板递归展开
template<typename T, typename... Args>
void print(T first, Args... rest) {
    std::cout << first;
    if constexpr (sizeof...(rest) > 0) {
        std::cout << ", ";
    }
    print(rest...);
}

// 折叠表达式（C++17）
template<typename... Args>
auto sum(Args... args) {
    return (args + ...);  // 右折叠: (arg1 + (arg2 + (arg3 + arg4)))
}

template<typename... Args>
auto product(Args... args) {
    return (... * args);  // 左折叠: ((arg1 * arg2) * arg3) * arg4
}

// 编译期计算参数个数
template<typename... Args>
constexpr std::size_t arity = sizeof...(Args);

// 完美转发变参
template<typename... Args>
void forward_print(Args&&... args) {
    print(std::forward<Args>(args)...);
}

int main() {
    print(1, 2.5, "hello", 'x');
    std::cout << "sum = " << sum(1, 2, 3, 4, 5) << "\n";       // 15
    std::cout << "product = " << product(1, 2, 3, 4) << "\n";   // 24
    std::cout << "arity = " << arity<int, double, char> << "\n"; // 3
    return 0;
}
```

## 9. CMake 构建系统

### 9.1 基本 CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyProject VERSION 1.0.0 LANGUAGES CXX)

# 设置 C++ 标准
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 源文件
add_executable(myapp
    src/main.cpp
    src/utils.cpp
    src/math_utils.cpp
)

# 包含目录
target_include_directories(myapp PRIVATE
    ${CMAKE_SOURCE_DIR}/include
)

# 链接库
target_link_libraries(myapp PRIVATE
    Threads::Threads
)

# 编译选项
target_compile_options(myapp PRIVATE
    -Wall -Wextra -Wpedantic
    $<$<CONFIG:Debug>:-g -fsanitize=address>
    $<$<CONFIG:Release>:-O2>
)

# 编译定义
target_compile_definitions(myapp PRIVATE
    $<$<CONFIG:Debug>:DEBUG_MODE>
)
```

### 9.2 多模块项目

```cmake
# 顶层 CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(MyApp VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)  # 生成 compile_commands.json

# 子目录
add_subdirectory(libs/core)
add_subdirectory(libs/network)
add_subdirectory(apps)

# libs/core/CMakeLists.txt
add_library(core STATIC
    core.cpp
    logger.cpp
)
target_include_directories(core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)

# libs/network/CMakeLists.txt
add_library(network STATIC
    tcp_client.cpp
    http_parser.cpp
)
target_link_libraries(network PUBLIC core)
find_package(Threads REQUIRED)
target_link_libraries(network PUBLIC Threads::Threads)

# apps/CMakeLists.txt
add_executable(myapp main.cpp)
target_link_libraries(myapp PRIVATE core network)
```

### 9.3 第三方库集成

```cmake
# 使用 find_package
find_package(fmt REQUIRED)
target_link_libraries(myapp PRIVATE fmt::fmt)

find_package(Boost REQUIRED COMPONENTS filesystem system)
target_link_libraries(myapp PRIVATE Boost::filesystem Boost::system)

# FetchContent（下载并构建）
include(FetchContent)
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.14.0
)
FetchContent_MakeAvailable(googletest)

enable_testing()
add_executable(tests test_main.cpp)
target_link_libraries(tests PRIVATE GTest::gtest_main core)
add_test(NAME MyTests COMMAND tests)
```

## 10. vcpkg 包管理

### 10.1 安装与配置

```bash
# 克隆 vcpkg
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg
bootstrap-vcpkg.bat       # Windows
# bootstrap-vcpkg.sh      # Linux/macOS

# 安装包
vcpkg install fmt
vcpkg install boost-filesystem
vcpkg install nlohmann-json
vcpkg install opencv4
vcpkg install spdlog

# 集成到系统（全局）
vcpkg integrate install

# 集成到 CMake
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=path/to/vcpkg/scripts/buildsystems/vcpkg.cmake
```

### 10.2 vcpkg.json 清单文件

```json
{
  "name": "myproject",
  "version": "1.0.0",
  "dependencies": [
    "fmt",
    "spdlog",
    "nlohmann-json",
    {
      "name": "boost-filesystem",
      "version>=": "1.83.0"
    },
    {
      "name": "opencv4",
      "features": ["contrib"]
    }
  ],
  "overrides": [
    {
      "name": "fmt",
      "version": "10.1.1"
    }
  ],
  "builtin-baseline": "a34c873a9717a888af58c3f0a6e1e3ee2d3a4a5e"
}
```

### 10.3 CMake 集成示例

```cmake
cmake_minimum_required(VERSION 3.20)
project(vcpkg_demo LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)

find_package(fmt CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)

add_executable(demo main.cpp)

target_link_libraries(demo PRIVATE
    fmt::fmt
    spdlog::spdlog
    nlohmann_json::nlohmann_json
)
```

```cpp
// main.cpp
#include <fmt/core.h>
#include <spdlog/spdlog.h>
#include <nlohmann/json.hpp>
#include <iostream>

using json = nlohmann::json;

int main() {
    // fmt 格式化
    fmt::print("Hello from fmt! Pi = {:.2f}\n", 3.14159);

    // spdlog 日志
    spdlog::info("Welcome to spdlog!");
    spdlog::warn("This is a warning");
    spdlog::set_level(spdlog::level::debug);
    spdlog::debug("Debug message");

    // nlohmann/json
    json j = {
        {"name", "Alice"},
        {"age", 30},
        {"skills", {"C++", "Python", "Rust"}}
    };
    std::cout << j.dump(2) << "\n";

    return 0;
}
```

## 11. 延伸阅读

- [C++26 草案 N4981](https://www.open-std.org/jtc1/sc22/wg21/)
- [C++ Reference](https://en.cppreference.com/w/cpp)
- [CMake 官方文档](https://cmake.org/documentation/)
- [vcpkg 官方仓库](https://github.com/microsoft/vcpkg)
- [Compiler Support Table](https://en.cppreference.com/w/cpp/compiler_support)
