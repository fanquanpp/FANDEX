---
order: 52
title: Lambda表达式
module: cpp
category: C++
difficulty: intermediate
description: C++11 至 C++23 Lambda 表达式的捕获语义、闭包类型、性能模型与工程实践
author: fanquanpp
updated: '2026-07-21'
related:
  - cpp/函数对象与仿函数
  - cpp/STL算法
  - cpp/多线程
  - cpp/C++14新特性
  - cpp/C++20概念
  - cpp/智能指针详解
  - cpp/模板进阶
prerequisites:
  - cpp/函数
  - cpp/模板进阶
  - cpp/概述与现代标准
---

## 学习目标

本节按照 Bloom 分类法的认知层级组织学习目标,读者完成本章学习后应能够达到以下层级。

### 识记层 (Remembering)

- 列举 Lambda 表达式的六个组成部分:捕获列表、参数列表、`mutable`、`noexcept`、尾随返回类型、函数体
- 说出值捕获、引用捕获、`[=]`、`[&]`、`[this]`、`[*this]`、`[name = expr]` 七种捕获形式的语义
- 复述 C++14 泛型 Lambda、C++17 `constexpr lambda` 与 `[*this]`、C++20 模板 Lambda 与包展开捕获、C++23 显式对象参数递归 Lambda 的引入版本
- 识别闭包类型 (closure type) 与闭包对象 (closure object) 的区别

### 理解层 (Understanding)

- 解释 Lambda 表达式如何被编译器转换为唯一的匿名函数对象类,捕获变量成为类成员,函数体成为 `operator()` 实现
- 阐述值捕获的 const 语义:不加 `mutable` 时 `operator()` 是 const 成员函数,值捕获的变量不可修改
- 描述无捕获 Lambda 到函数指针的隐式转换条件,以及该转换在 C++17 后的 `noexcept` 兼容性
- 区分 `std::function`、模板参数、`auto` 三种存储 Lambda 的方式在性能与类型上的差异

### 应用层 (Applying)

- 使用初始化捕获 (init capture) 实现移动捕获、计算捕获与重命名捕获
- 应用 C++20 模板 Lambda 语法 `[]<typename T>(T x){}` 配合 concepts 进行类型约束
- 使用 C++23 显式对象参数 (`this auto self`) 实现递归 Lambda,替代 Y-combinator
- 应用 Lambda 与 STL 算法 (`std::sort`、`std::find_if`、`std::transform`、`std::accumulate`) 组合

### 分析层 (Analyzing)

- 分析 `std::function` 的类型擦除、SBO (Small Buffer Optimization) 与堆分配开销对性能的影响
- 解构 Lambda 在不同捕获模式下的对象大小,推导 `sizeof(lambda)` 与捕获变量的关系
- 对比内联 Lambda、`std::function`、函数指针、虚函数四种调用方式在流水线、分支预测、寄存器分配上的差异

### 评价层 (Evaluating)

- 评估何时应使用 `auto` 存储 Lambda、何时应使用 `std::function`、何时应使用模板参数
- 判断一段使用 `[&]` 默认引用捕获的代码是否存在悬空引用风险
- 在泛型代码设计中权衡模板 Lambda、`std::function`、概念约束的取舍

### 创造层 (Creating)

- 设计一个类型安全的回调注册系统,支持 Lambda、`std::function`、协程等多种可调用对象
- 构建一个零开销的事件分发框架,利用 C++20 模板 Lambda 与 concepts 实现编译期分发
- 提出一种基于 Lambda 表达式的 DSL (Domain-Specific Language) 设计方案

## 历史动机与背景

Lambda 表达式是现代 C++ 最具影响力的特性之一,其引入彻底改变了 C++ 的回调、算法组合与异步编程风格。

### 1958-2000:函数式编程的长期积淀

Lambda 演算由 Alonzo Church 于 1936 年提出,是 Lisp (1958) 的核心机制。函数式语言 (Scheme、ML、Haskell) 长期将 Lambda 作为一等公民 (first-class citizen),支持闭包、高阶函数、柯里化。C++ 作为系统编程语言,早期并不直接支持 Lambda,而是通过函数指针 (function pointer) 与函数对象 (functor) 间接实现回调。

### 2000-2009:C++03 的回调困境

C++03 时代,STL 算法的回调只能通过三种方式:

- **函数指针**:`std::sort(v.begin(), v.end(), &cmp)`,无法携带状态
- **函数对象**:`struct Cmp { bool operator()(int, int) const; };`,需在类外定义,代码割裂
- **`std::bind1st`/`std::bind2st`**:笨拙且限制多,只能绑定一个参数

Boost.Lambda (2001) 与 Boost.Phoenix (2005) 试图通过表达式模板 (expression template) 模拟 Lambda,但语法笨重 (`_1 + _2`)、错误信息晦涩,未能普及。C++ 社区迫切需要语言级 Lambda 支持。

### 2009-2011:C++11 的诞生

2009 年 Bjarne Stroustrup、Jaakko Järvi、Gary Powell 等人在 C++ 标准委员会提案 N2550、N2671 中提出 Lambda 表达式方案。核心设计目标:

- **就地定义**:在调用点附近定义回调,避免代码割裂
- **捕获外部变量**:支持值捕获与引用捕获,携带上下文状态
- **零开销抽象**:无捕获 Lambda 可转换为函数指针,有捕获 Lambda 通过模板内联零开销
- **类型安全**:每个 Lambda 有唯一类型,编译期类型推导

C++11 (ISO/IEC 14882:2011) §5.1.2 正式引入 Lambda 表达式。其语法 `[capture](params) mutable -> ret { body }` 简洁直观,迅速成为现代 C++ 的标志性特性。Herb Sutter 在《Exceptional C++》中评价:"Lambda 是 C++11 中最影响日常编程风格的特性"。

### 2011-2017:C++14 的泛型化

C++11 Lambda 的限制:参数类型必须显式指定,无法泛型。C++14 (ISO/IEC 14882:2014) 引入两项关键改进:

- **泛型 Lambda (Generic Lambda)**:参数可使用 `auto`,编译器生成模板 `operator()`
- **初始化捕获 (Init Capture)**:`[name = expr]` 允许在捕获时计算表达式、移动捕获、重命名

```cpp
// C++14 泛型 Lambda
auto less = [](auto a, auto b) { return a < b; };

// C++14 初始化捕获 (移动捕获)
auto p = std::make_unique<int>(42);
auto f = [up = std::move(p)] { return *up; };
```

### 2017-2020:C++17 与 C++20 的进化

C++17 引入:

- **`[*this]` 捕获**:按值拷贝当前对象,解决 `[this]` 在异步场景的悬空指针问题
- **`constexpr lambda`**:Lambda 可在常量表达式上下文使用

C++20 引入:

- **模板 Lambda**:`[]<typename T>(T x){}` 显式模板参数,支持 concepts 约束
- **包展开捕获 (Pack Expansion Capture)**:`[...args = std::move(args)]` 捕获参数包
- **`consteval` Lambda**:编译期强制求值

### 2020 至今:C++23 的递归 Lambda

C++23 引入显式对象参数 (deducing this),使 Lambda 可自然递归:

```cpp
// C++23 递归 Lambda
auto fib = [](this auto self, int n) -> int {
    return n <= 1 ? n : self(n - 1) + self(n - 2);
};
```

这彻底解决了长期困扰 C++ 的"Lambda 无法自引用"问题,无需 Y-combinator 等技巧。同时 C++23 还放宽了 `[=]` 隐式捕获 `this` 的弃用警告,允许显式 `[=, this]`。

### 核心动因总结

Lambda 表达式的演化动因可归纳为:

- **代码 locality**:回调就地定义,提升可读性
- **状态携带**:捕获机制让回调携带上下文,取代笨拙的函数对象
- **零开销抽象**:模板内联确保性能不劣于手写函数对象
- **泛型能力**:从 C++14 泛型 Lambda 到 C++20 模板 Lambda,逐步达到函数对象的全部能力
- **现代异步支持**:移动捕获、`[*this]`、递归 Lambda 适配异步、协程、函数式风格

## 形式化定义

### Lambda 表达式的语法结构

Lambda 表达式的完整 BNF 范式 (C++23):

$$
\lambda \text{Expr} ::= [\text{Capture}] (\text{Params}) \text{Specifiers} \to \text{RetType} \{ \text{Body} \}
$$

其中:

- $\text{Capture} ::= \epsilon \mid \text{default} \mid \text{capture-list}$
- $\text{default} ::= = \mid \&$
- $\text{capture-list} ::= \text{capture} (, \text{capture})^*$
- $\text{capture} ::= \text{identifier} \mid \&\text{identifier} \mid \text{this} \mid *\text{this} \mid \text{identifier} = \text{expr} \mid \&\text{identifier} = \text{expr} \mid \ldots\text{identifier} = \text{expr}$
- $\text{Specifiers} ::= \epsilon \mid \text{mutable} \mid \text{noexcept} \mid \text{constexpr} \mid \text{consteval}$
- $\text{Params}$ 可包含 `auto` (C++14) 或 `<typename T>` 模板参数 (C++20)

### 闭包类型的等价转换

每个 Lambda 表达式 $L$ 对应一个唯一的闭包类型 $C_L$,可形式化等价转换:

$$
L = [\text{capt}_1, \ldots, \text{capt}_n](p_1, \ldots, p_m) \text{ mutable } \to R \{ \text{body} \}
$$

等价于:

```cpp
struct __closure_L {
    // 值捕获成为成员变量
    T1 capt1;
    T2 capt2;
    // ...

    // operator() 的 const 性由 mutable 决定
    R operator()(P1 p1, ..., Pm pm) [const] [noexcept] {
        // body 中对 capt 的访问:
        //   值捕获 + 无 mutable:capt 是 const,不可修改
        //   值捕获 + mutable:capt 可修改,但不影响原变量
        //   引用捕获:capt 是引用,修改影响原变量
        body;
    }

    // 无捕获 Lambda 可转换为函数指针
    using FuncPtr = R (*)(P1, ..., Pm);
    operator FuncPtr() const noexcept;  // 仅当无捕获时
};
```

### 捕获语义的形式化

设外部变量 $v$ 类型为 $T$:

| 捕获形式            | 等价成员类型          | `operator()` 内语义             | 修改是否影响原变量 |
| ------------------- | --------------------- | ------------------------------- | ------------------ |
| `[v]`               | `const T v;`          | 只读访问 $v$ 的副本             | 否                 |
| `[v] mutable`       | `T v;`                | 可读写 $v$ 的副本               | 否                 |
| `[&v]`              | `T& v;` (引用成员)    | 引用访问原变量                   | 是                 |
| `[=]`               | 每个 used 变量 `const T v;` | 隐式值捕获所有 used 变量    | 否                 |
| `[&]`               | 每个 used 变量 `T& v;` | 隐式引用捕获所有 used 变量      | 是                 |
| `[this]`            | `C* this;`            | 通过指针访问当前对象成员          | 是                 |
| `[*this]` (C++17)   | `C this;` (副本)      | 访问当前对象的副本                | 否                 |
| `[v = expr]` (C++14)| `auto v = expr;`      | 初始化捕获,可移动、可计算        | 否                 |
| `[&v = expr]` (C++14)| `auto& v = expr;`    | 引用初始化捕获                    | 是                 |

### 闭包对象的复制与移动语义

闭包类型 $C_L$ 的复制/移动语义遵循默认规则:

$$
\text{Copyable}(C_L) \iff \forall \text{capt}_i \in L: \text{Copyable}(\text{type}(\text{capt}_i))
$$

$$
\text{Movable}(C_L) \iff \forall \text{capt}_i \in L: \text{Movable}(\text{type}(\text{capt}_i))
$$

若 Lambda 引用捕获 `std::unique_ptr`,闭包对象仍可复制 (因为引用可复制);若值捕获 `std::unique_ptr` (经移动捕获),闭包对象只能移动。

### Lambda 到函数指针的转换

无捕获 Lambda 可隐式转换为函数指针,形式化:

$$
\text{Convertible}(L, R(*)(P_1, \ldots, P_m)) \iff \text{Capture}(L) = \emptyset \land \text{RetType}(L) = R
$$

C++17 起,若 Lambda 声明 `noexcept`,可转换为 `noexcept` 函数指针。该转换是 `static_cast` 安全的。

### `std::function` 的类型擦除

`std::function<Signature>` 是可调用对象的多态包装器,通过类型擦除 (type erasure) 隐藏具体闭包类型:

$$
\text{std::function}<R(P_1, \ldots, P_m)> = \exists C. \{ C \text{ closure}, R (C::\text{operator()})(P_1, \ldots, P_m) \}
$$

实现上,`std::function` 内部持有:

- 一个函数指针 (指向 invoke 调用器)
- 一个 SBO (Small Buffer Optimization) 缓冲区 (典型 16-32 字节)
- 若闭包大小超过 SBO,则在堆上分配

## 理论推导

### 闭包大小的计算

闭包对象的大小是所有值捕获变量大小之和 (考虑对齐):

$$
\text{sizeof}(C_L) = \text{align}\left(\sum_{i=1}^{n} \text{sizeof}(\text{type}(\text{capt}_i))\right) + \text{padding}
$$

引用捕获在大多数实现中是指针大小:

$$
\text{sizeof}(\text{capt}_i = \&v) = \text{sizeof}(T^*) \approx 8 \text{ (64-bit)}
$$

推导:

- 空捕获 Lambda `[]`:$\text{sizeof} = 1$ (空类至少 1 字节)
- 值捕获 `int`:`sizeof = 4` (对齐到 4)
- 值捕获两个 `int`:`sizeof = 8`
- 引用捕获一个变量:`sizeof = 8` (指针)
- 值捕获 `std::string` (SSO 实现):`sizeof ≈ 32`
- 移动捕获 `std::unique_ptr<int>`:`sizeof = 8`

### `std::function` 的性能模型

`std::function` 调用开销分解:

$$
T_{\text{std::function}} = T_{\text{indirect-call}} + T_{\text{type-check}} + T_{\text{SBO-or-heap}}
$$

- $T_{\text{indirect-call}}$:间接调用 (函数指针),无法内联,~5-10 周期
- $T_{\text{type-check}}$:空检查与异常处理,~1-2 周期
- $T_{\text{SBO-or-heap}}$:若 SBO 命中无开销;若堆分配,首次构造 +1 次堆分配 (~100-300 周期)

对比直接内联 Lambda:

$$
T_{\text{inline-lambda}} = T_{\text{body}} \text{ (编译器内联优化)}
$$

典型场景:`std::function` 调用比内联 Lambda 慢 2-10 倍。热路径 (hot path) 应避免 `std::function`。

### SBO 的临界点

`std::function` 的 SBO 缓冲区大小 $S_{\text{SBO}}$ 因实现而异:

| 实现                | $S_{\text{SBO}}$ (字节) | 说明                    |
| ------------------- | ----------------------- | ----------------------- |
| libstdc++ (GCC)     | 16                      | 2 个指针                |
| libc++ (Clang)      | 24                      | 3 个指针                |
| MSVC STL            | 32 (x64) / 24 (x86)     | 含 vtable 指针          |

当 $\text{sizeof}(C_L) \leq S_{\text{SBO}}$ 且对齐匹配时,SBO 命中,无需堆分配。推导:

- 捕获 1-2 个指针的 Lambda:SBO 命中
- 捕获 `std::string` (32 字节):libstdc++ 溢出堆分配,libc++ 边界,MSVC SBO 命中
- 捕获大型结构体:必然堆分配

### 内联性与编译器优化

Lambda 通过模板参数传递时,编译器可见具体闭包类型,可进行:

- **内联展开**:消除函数调用开销
- **常量传播**:若捕获的是编译期常量,可常量折叠
- **死代码消除**:未使用的捕获可被消除

形式化:模板参数传递 Lambda 等价于直接内联函数体:

$$
\text{template}<F> \text{apply}(F f) \{ f(); \} \quad \text{with } f = [\text{capt}]\{ \text{body} \}
$$

编译后等价于:

$$
\text{apply} \equiv \text{body}[\text{capt}/\text{free-vars}]
$$

而 `std::function` 传递则失去内联机会:

$$
\text{apply}(\text{std::function}) \equiv \text{indirect-call}(\text{closure}) + \text{body}
$$

### Lambda 与函数对象的等价性

任何 Lambda 可改写为等价的函数对象,反之亦然。性能上二者等价 (均通过 `operator()` 调用,均可内联)。Lambda 的优势在于:

- **就地定义**:无需在类外声明
- **类型推导**:用 `auto` 存储,无需命名类型
- **简洁语法**:`[](int x){...}` 比 `struct F { void operator()(int x){...} };` 简洁

### 递归 Lambda 的不动点理论

C++23 前,Lambda 无法自引用,需用 Y-combinator 实现递归。Y-combinator 形式化:

$$
Y = \lambda f. (\lambda x. f (x x)) (\lambda x. f (x x))
$$

满足 $Y(F) = F(Y(F))$,即 $Y(F)$ 是 $F$ 的不动点。C++ 实现需借助 `std::function`:

```cpp
template<typename F>
struct Y {
    F f;
    template<typename... Args>
    auto operator()(Args&&... args) const {
        return f(*this, std::forward<Args>(args)...);
    }
};

auto fib = Y{[](auto self, int n) -> int {
    return n <= 1 ? n : self(n - 1) + self(n - 2);
}};
```

C++23 显式对象参数 `this auto self` 直接实现自引用,无需 Y-combinator:

```cpp
auto fib = [](this auto self, int n) -> int {
    return n <= 1 ? n : self(n - 1) + self(n - 2);
};
```

形式化等价:

$$
\lambda_{\text{rec}}(n) = \text{body}[\text{self}/\lambda_{\text{rec}}]
$$

### 捕获求值时机

值捕获在 Lambda **创建时** 求值,引用捕获在 Lambda **调用时** 求值。形式化:

$$
\text{value-capture}: \text{capt}_i = \text{copy}(\text{var}_i) \text{ at } t_{\text{create}}
$$

$$
\text{reference-capture}: \text{capt}_i = \&\text{var}_i \text{ at } t_{\text{create}}, \text{access}(\text{capt}_i) = \text{access}(\text{var}_i) \text{ at } t_{\text{call}}
$$

这是引用捕获悬空引用的根因:若 $t_{\text{call}} > t_{\text{lifetime-of-var}}$,访问悬空引用导致 UB。

## 代码示例

### 示例 1:Lambda 基础语法与捕获模式

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <string>

// 演示 Lambda 的所有捕获模式与基础语法
int main() {
    int a = 10, b = 20;
    std::string s = "hello";

    // 1. 无捕获 Lambda:可转换为函数指针
    auto add = [](int x, int y) { return x + y; };
    int (*fp)(int, int) = add;  // 隐式转换
    std::cout << "无捕获: " << add(3, 4) << "\n";  // 7

    // 2. 值捕获:捕获 a 的副本,创建后修改 a 不影响 Lambda
    auto captureByValue = [a]() { return a * 2; };
    a = 100;  // 修改原变量
    std::cout << "值捕获 (a=10 时捕获): " << captureByValue() << "\n";  // 20,不是 200

    // 3. 引用捕获:捕获 a 的引用,调用时读取当前值
    auto captureByRef = [&a]() { return a * 2; };
    std::cout << "引用捕获 (a=100 时调用): " << captureByRef() << "\n";  // 200

    // 4. 全部值捕获 [=]:隐式捕获所有 used 变量
    auto allByValue = [=]() { return a + b; };
    std::cout << "[=] 全部值捕获: " << allByValue() << "\n";  // 120

    // 5. 全部引用捕获 [&]:隐式引用捕获所有 used 变量
    auto allByRef = [&]() { a++; b++; };
    allByRef();
    std::cout << "[&] 修改后: a=" << a << " b=" << b << "\n";  // 101 21

    // 6. 混合捕获:默认 [=],但 a 引用捕获
    auto mixed = [=, &a]() { a++; return b; };
    int old_b = mixed();
    std::cout << "混合捕获: a=" << a << " 返回 b=" << old_b << "\n";

    // 7. mutable:允许修改值捕获的副本
    int counter = 0;
    auto mutLambda = [counter]() mutable {
        counter++;  // 修改的是副本
        return counter;
    };
    std::cout << "mutable 第一次: " << mutLambda() << "\n";  // 1
    std::cout << "mutable 第二次: " << mutLambda() << "\n";  // 2 (副本状态保留)
    std::cout << "原 counter: " << counter << "\n";  // 0 (原变量未变)

    // 8. 在 STL 算法中使用 Lambda
    std::vector<int> nums = {5, 2, 8, 1, 9, 3};
    std::sort(nums.begin(), nums.end(), [](int x, int y) { return x > y; });
    std::cout << "降序排序: ";
    for (int n : nums) std::cout << n << " ";  // 9 8 5 3 2 1
    std::cout << "\n";

    return 0;
}
```

### 示例 2:C++14 初始化捕获与泛型 Lambda

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>
#include <algorithm>

// 演示 C++14 初始化捕获 (移动捕获、计算捕获、重命名) 与泛型 Lambda
int main() {
    // 1. 移动捕获:将 unique_ptr 移入 Lambda
    auto ptr = std::make_unique<int>(42);
    std::cout << "移动前 ptr 是否有效: " << (ptr ? "是" : "否") << "\n";  // 是

    // [up = std::move(ptr)]:在捕获列表中声明 up,初始化为 std::move(ptr)
    auto owner = [up = std::move(ptr)]() {
        std::cout << "Lambda 持有值: " << *up << "\n";
    };
    std::cout << "移动后 ptr 是否有效: " << (ptr ? "是" : "否") << "\n";  // 否
    owner();  // 42

    // 2. 计算捕获:在捕获时计算表达式
    int base = 100;
    int factor = 3;
    // [scaled = base * factor]:捕获 base*factor 的结果
    auto scaler = [scaled = base * factor](int x) {
        return x * scaled;
    };
    std::cout << "计算捕获 (base*factor=300): " << scaler(2) << "\n";  // 600

    // 3. 重命名捕获:用更短的名字
    std::string longVariableName = "world";
    auto greeter = [s = longVariableName]() {
        return "Hello, " + s + "!";
    };
    std::cout << greeter() << "\n";  // Hello, world!

    // 4. 泛型 Lambda:参数使用 auto,编译器生成模板 operator()
    auto maximum = [](auto a, auto b) {
        return a > b ? a : b;
    };
    std::cout << "泛型 int: " << maximum(3, 7) << "\n";        // 7
    std::cout << "泛型 double: " << maximum(3.14, 2.71) << "\n";  // 3.14
    std::cout << "泛型 string: " << maximum("apple", "banana") << "\n";  // banana

    // 5. 泛型 Lambda 与容器配合
    auto printContainer = [](const auto& container) {
        for (const auto& item : container) {
            std::cout << item << " ";
        }
        std::cout << "\n";
    };
    std::vector<int> vi = {1, 2, 3};
    std::vector<std::string> vs = {"a", "b", "c"};
    printContainer(vi);  // 1 2 3
    printContainer(vs);  // a b c

    // 6. 完美转发泛型 Lambda (C++14)
    auto forwarder = [](auto&&... args) {
        return std::make_tuple(std::forward<decltype(args)>(args)...);
    };
    auto t = forwarder(1, 2.0, "three");
    std::cout << "完美转发: " << std::get<0>(t) << " "
              << std::get<1>(t) << " " << std::get<2>(t) << "\n";

    return 0;
}
```

### 示例 3:C++17 `[*this]` 与 `constexpr lambda`

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <memory>

// 演示 C++17 [*this] 捕获与 constexpr lambda
class Worker {
    int id_;
    std::string name_;
public:
    Worker(int id, std::string name) : id_(id), name_(std::move(name)) {}

    // [this] 捕获:this 指针,异步场景可能悬空
    auto makeTaskThis() {
        return [this]() {
            std::cout << "[this] Worker " << id_ << ": " << name_ << "\n";
        };
    }

    // [*this] 捕获 (C++17):拷贝当前对象,异步安全
    auto makeTaskCopy() {
        return [*this]() {
            std::cout << "[*this] Worker " << id_ << ": " << name_ << "\n";
        };
    }

    int getId() const { return id_; }
};

// constexpr lambda:可在常量表达式上下文使用
auto constexpr_square = [](int x) constexpr {
    return x * x;
};

// 编译期使用
static_assert(constexpr_square(5) == 25, "constexpr lambda works");

int main() {
    // 1. [*this] 在异步场景的安全性
    std::function<void()> task;

    {
        Worker w(1, "Alice");
        task = w.makeTaskCopy();  // 拷贝 w 到 Lambda
    }  // w 在此析构,但 Lambda 持有副本
    task();  // 安全:输出 "[*this] Worker 1: Alice"

    // 2. constexpr lambda 在运行时使用
    std::cout << "constexpr square(7): " << constexpr_square(7) << "\n";  // 49

    // 3. constexpr lambda 在编译期排序
    auto constexpr_sort = [](std::array<int, 5> arr) constexpr {
        for (int i = 0; i < 5; ++i) {
            for (int j = i + 1; j < 5; ++j) {
                if (arr[i] > arr[j]) {
                    int tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }
        }
        return arr;
    };

    constexpr auto sorted = constexpr_sort({5, 3, 1, 4, 2});
    static_assert(sorted[0] == 1 && sorted[4] == 5, "constexpr sort works");

    return 0;
}
```

### 示例 4:C++20 模板 Lambda 与 concepts 约束

```cpp
#include <iostream>
#include <vector>
#include <concepts>
#include <string>
#include <memory>

// 演示 C++20 模板 Lambda:显式模板参数与 concepts 约束
int main() {
    // 1. 基础模板 Lambda:显式 typename
    auto identity = []<typename T>(T x) { return x; };
    std::cout << identity(42) << "\n";           // 42
    std::cout << identity(3.14) << "\n";         // 3.14
    std::cout << identity("hello") << "\n";      // hello

    // 2. 带 concepts 约束的模板 Lambda
    auto squareIntegral = []<std::integral T>(T x) -> T {
        return x * x;
    };
    std::cout << "squareIntegral(5): " << squareIntegral(5) << "\n";  // 25
    // squareIntegral(3.14);  // 编译错误:double 不满足 std::integral

    // 3. 多模板参数 Lambda
    auto makePair = []<typename A, typename B>(A a, B b) {
        return std::pair<A, B>{std::move(a), std::move(b)};
    };
    auto p = makePair(1, std::string("two"));
    std::cout << "pair: " << p.first << ", " << p.second << "\n";

    // 4. 模板 Lambda 与容器
    auto containerSize = []<typename C>(const C& c) {
        return c.size();
    };
    std::vector<int> v = {1, 2, 3};
    std::cout << "vector size: " << containerSize(v) << "\n";  // 3

    // 5. 模板 Lambda 处理 pair 的两个元素
    auto transformPair = []<typename A, typename B>(std::pair<A, B> p) {
        return std::pair<B, A>{p.second, p.first};
    };
    auto swapped = transformPair(std::make_pair(1, std::string("hello")));
    std::cout << "swapped: " << swapped.first << ", " << swapped.second << "\n";

    // 6. C++20 包展开捕获:捕获可变参数
    auto makeCallback = []<typename... Args>(Args... args) {
        // [...args = std::move(args)]:将参数包移动捕获
        return [...args = std::move(args)]() {
            std::cout << "包展开捕获: ";
            ((std::cout << args << " "), ...);
            std::cout << "\n";
        };
    };
    auto cb = makeCallback(1, "two", 3.0);
    cb();  // 包展开捕获: 1 two 3

    // 7. 模板 Lambda 的特化调用
    auto process = []<typename T>(T x) {
        if constexpr (std::is_integral_v<T>) {
            std::cout << "整数: " << x << "\n";
        } else if constexpr (std::is_floating_point_v<T>) {
            std::cout << "浮点: " << x << "\n";
        } else {
            std::cout << "其他: " << x << "\n";
        }
    };
    process(42);      // 整数: 42
    process(3.14);    // 浮点: 3.14
    process("hi");    // 其他: hi

    return 0;
}
```

### 示例 5:C++23 递归 Lambda 与显式对象参数

```cpp
#include <iostream>
#include <vector>
#include <memory>
#include <functional>

// 树节点定义
struct TreeNode {
    int value;
    std::unique_ptr<TreeNode> left;
    std::unique_ptr<TreeNode> right;

    TreeNode(int v) : value(v) {}
};

// 演示 C++23 显式对象参数实现递归 Lambda
int main() {
    // 1. 简单递归:阶乘
    auto factorial = [](this auto self, int n) -> long long {
        return n <= 1 ? 1 : n * self(n - 1);
    };
    std::cout << "5! = " << factorial(5) << "\n";  // 120
    std::cout << "10! = " << factorial(10) << "\n";  // 3628800

    // 2. Fibonacci
    auto fib = [](this auto self, int n) -> long long {
        return n <= 1 ? n : self(n - 1) + self(n - 2);
    };
    std::cout << "fib(20) = " << fib(20) << "\n";  // 6765

    // 3. 树遍历:中序遍历
    auto root = std::make_unique<TreeNode>(1);
    root->left = std::make_unique<TreeNode>(2);
    root->right = std::make_unique<TreeNode>(3);
    root->left->left = std::make_unique<TreeNode>(4);
    root->left->right = std::make_unique<TreeNode>(5);

    auto inorder = [](this auto self, const TreeNode* node) -> void {
        if (!node) return;
        self(node->left.get());
        std::cout << node->value << " ";
        self(node->right.get());
    };
    std::cout << "中序遍历: ";
    inorder(root.get());  // 4 2 5 1 3
    std::cout << "\n";

    // 4. 递归 Lambda 求和
    auto sumVector = [](this auto self, const std::vector<int>& v, size_t i) -> int {
        return i >= v.size() ? 0 : v[i] + self(v, i + 1);
    };
    std::vector<int> data = {1, 2, 3, 4, 5};
    std::cout << "sumVector: " << sumVector(data, 0) << "\n";  // 15

    // 5. 对比:C++23 前的 Y-combinator 方式 (繁琐)
    // 仅作对比展示,实际应优先使用 C++23 显式对象参数
    auto yFib = [f = [](auto self, int n) -> long long {
        return n <= 1 ? n : self(self, n - 1) + self(self, n - 2);
    }](int n) -> long long {
        return f(f, n);
    };
    std::cout << "Y-combinator fib(10): " << yFib(10) << "\n";  // 55

    // 6. 显式对象参数还可用于 CRTP 风格
    auto counter = [](this auto& self, int n) -> int {
        std::cout << n << " ";
        return n == 0 ? 0 : self(n - 1);
    };
    std::cout << "递减: ";
    int result = counter(5);  // 5 4 3 2 1 0
    std::cout << "\n结果: " << result << "\n";

    return 0;
}
```

### 示例 6:Lambda 与 `std::function` 性能对比

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <functional>
#include <chrono>
#include <cmath>

// 演示内联 Lambda、std::function、函数指针的性能差异
// 编译:g++ -O2 -std=c++20

// 1. 模板参数传递:编译器可内联
template<typename F>
double sumTemplate(const std::vector<double>& v, F func) {
    double s = 0;
    for (double x : v) {
        s += func(x);
    }
    return s;
}

// 2. std::function 传递:无法内联
double sumFunction(const std::vector<double>& v, std::function<double(double)> func) {
    double s = 0;
    for (double x : v) {
        s += func(x);
    }
    return s;
}

// 3. 函数指针传递:无法内联 (除非全局优化)
double sumFuncPtr(const std::vector<double>& v, double (*func)(double)) {
    double s = 0;
    for (double x : v) {
        s += func(x);
    }
    return s;
}

double heavyOp(double x) {
    return std::sin(x) + std::cos(x) + std::sqrt(x + 1);
}

int main() {
    std::vector<double> data(1'000'000);
    for (size_t i = 0; i < data.size(); ++i) {
        data[i] = static_cast<double>(i) * 0.001;
    }

    auto lambda = [](double x) {
        return std::sin(x) + std::cos(x) + std::sqrt(x + 1);
    };

    // 预热
    volatile double sink = 0;
    sink += sumTemplate(data, lambda);

    // 测试:模板 Lambda (内联)
    auto t1 = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 10; ++i) {
        sink = sumTemplate(data, lambda);
    }
    auto t2 = std::chrono::high_resolution_clock::now();
    auto msTemplate = std::chrono::duration_cast<std::chrono::milliseconds>(t2 - t1).count();
    std::cout << "模板 Lambda (内联): " << msTemplate << " ms\n";

    // 测试:std::function (无法内联)
    std::function<double(double)> func = lambda;
    t1 = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 10; ++i) {
        sink = sumFunction(data, func);
    }
    t2 = std::chrono::high_resolution_clock::now();
    auto msFunction = std::chrono::duration_cast<std::chrono::milliseconds>(t2 - t1).count();
    std::cout << "std::function: " << msFunction << " ms\n";

    // 测试:函数指针 (无法内联)
    t1 = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 10; ++i) {
        sink = sumFuncPtr(data, heavyOp);
    }
    t2 = std::chrono::high_resolution_clock::now();
    auto msFuncPtr = std::chrono::duration_cast<std::chrono::milliseconds>(t2 - t1).count();
    std::cout << "函数指针: " << msFuncPtr << " ms\n";

    std::cout << "结论:模板 Lambda 最快,std::function 与函数指针接近\n";

    return 0;
}
```

### 示例 7:Lambda 实现 Y-combinator (C++23 前)

```cpp
#include <iostream>
#include <functional>
#include <memory>

// 演示 C++23 前的递归 Lambda 实现方式 (Y-combinator)
// 这些技术在 C++23 后可由显式对象参数替代

// 方式 1:std::function 包装
template<typename Ret, typename... Args>
std::function<Ret(Args...)> makeRecursive1(std::function<std::function<Ret(Args...)>(std::function<Ret(std::function<Ret(Args...)>, Args...)>)> f) {
    return [f](Args... args) -> Ret {
        std::function<Ret(std::function<Ret(Args...)>, Args...)> g = f;
        std::function<Ret(Args...)> h = [g](Args... a) -> Ret {
            return g(h, a...);  // 注意:h 在此捕获自身 (需 std::function)
        };
        return h(args...);
    };
}

// 方式 2:简洁版 - 直接传递 self
auto fibRecursive = [](auto self, int n) -> long long {
    return n <= 1 ? n : self(self, n - 1) + self(self, n - 2);
};

// 方式 3:struct 包装 (推荐,避免 std::function 开销)
template<typename F>
struct Recursive {
    F f;
    template<typename... Args>
    auto operator()(Args&&... args) const {
        return f(*this, std::forward<Args>(args)...);
    }
};

template<typename F>
Recursive<F> makeRecursive(F f) {
    return Recursive<F>{std::move(f)};
}

int main() {
    // 方式 2 调用:需传递 self
    std::cout << "fibRecursive(10) = " << fibRecursive(fibRecursive, 10) << "\n";  // 55

    // 方式 3 调用:自动包装,无需传 self
    auto fib = makeRecursive([](auto self, int n) -> long long {
        return n <= 1 ? n : self(n - 1) + self(n - 2);
    });
    std::cout << "fib(15) = " << fib(15) << "\n";  // 610

    // 方式 3 处理更复杂逻辑
    auto factorial = makeRecursive([](auto self, int n) -> long long {
        return n <= 1 ? 1 : n * self(n - 1);
    });
    std::cout << "factorial(8) = " << factorial(8) << "\n";  // 40320

    // 方式 3 与 STL 算法配合
    auto treeSum = makeRecursive([](auto self, int arr[], size_t i, size_t n) -> int {
        if (i >= n) return 0;
        return arr[i] + self(arr, 2 * i + 1, n) + self(arr, 2 * i + 2, n);
    });
    int tree[] = {1, 2, 3, 4, 5, 6, 7};
    std::cout << "treeSum: " << treeSum(tree, 0, 7) << "\n";  // 28

    return 0;
}
```

### 示例 8:Lambda 与多线程捕获的陷阱与正确做法

```cpp
#include <iostream>
#include <vector>
#include <thread>
#include <mutex>
#include <memory>
#include <functional>

// 演示 Lambda 在多线程场景的捕获陷阱与正确做法
int main() {
    // 陷阱 1:引用捕获局部变量,线程退出后悬空
    // 错误示例 (注释掉,运行会崩溃):
    // {
    //     int x = 0;
    //     std::thread t([&x]() { x++; });
    // }  // x 在此析构,t 仍可能访问
    // t.join();

    // 正确做法 1:值捕获,线程内部修改副本
    {
        int x = 0;
        std::thread t([x]() mutable {
            int local = x;
            local++;
            std::cout << "线程内副本: " << local << "\n";
        });
        t.join();
        std::cout << "主线程 x: " << x << "\n";  // 0
    }

    // 正确做法 2:使用 std::ref 显式传递引用 (配合 join)
    {
        int x = 0;
        std::thread t([&x]() { x++; });
        t.join();  // 必须 join,确保 x 生命周期
        std::cout << "join 后 x: " << x << "\n";  // 1
    }

    // 正确做法 3:移动捕获 shared_ptr 共享所有权
    {
        auto counter = std::make_shared<int>(0);
        std::vector<std::thread> threads;

        for (int i = 0; i < 4; ++i) {
            // [counter]:值捕获 shared_ptr (引用计数 +1)
            threads.emplace_back([counter]() {
                for (int j = 0; j < 1000; ++j) {
                    (*counter)++;  // 注意:非原子,仅演示
                }
            });
        }

        for (auto& t : threads) t.join();
        std::cout << "shared_ptr counter: " << *counter << "\n";  // 可能 < 4000 (数据竞争)
    }

    // 正确做法 4:异步任务使用 std::move 捕获转移所有权
    {
        auto data = std::make_unique<std::vector<int>>(100, 42);
        std::cout << "移动前 data 有效: " << (data ? "是" : "否") << "\n";

        // [d = std::move(data)]:C++14 移动捕获
        std::thread t([d = std::move(data)]() {
            int sum = 0;
            for (int x : *d) sum += x;
            std::cout << "线程求和: " << sum << "\n";  // 4200
        });
        t.join();
        std::cout << "移动后 data 有效: " << (data ? "是" : "否") << "\n";  // 否
    }

    // 正确做法 5:[*this] 在异步场景 (C++17)
    class AsyncWorker {
        int id_;
    public:
        AsyncWorker(int id) : id_(id) {}

        std::function<void()> makeTask() {
            // [*this] 拷贝当前对象,任务可在对象析构后执行
            return [*this]() {
                std::cout << "异步任务 Worker " << id_ << " 执行\n";
            };
        }
    };

    std::function<void()> task;
    {
        AsyncWorker w(99);
        task = w.makeTask();
    }  // w 析构,但 task 持有副本
    task();  // 安全:输出 "异步任务 Worker 99 执行"

    return 0;
}
```

## 对比分析

### 捕获模式对比

| 捕获形式            | 引入版本 | 是否可修改原变量 | 异步安全性 | 适用场景                     |
| ------------------- | -------- | ---------------- | ---------- | ---------------------------- |
| `[v]` 值捕获        | C++11    | 否               | 安全       | 需要变量快照                 |
| `[&v]` 引用捕获     | C++11    | 是               | 危险       | 同步场景,需控制生命周期      |
| `[=]` 全部值捕获    | C++11    | 否               | 安全       | 简单场景,但显式列出更安全    |
| `[&]` 全部引用捕获  | C++11    | 是               | 危险       | 不推荐,易引入悬空引用        |
| `[this]` 捕获       | C++11    | 是 (通过指针)    | 危险       | 成员函数内,同步场景          |
| `[*this]` 捕获      | C++17    | 否 (副本)        | 安全       | 异步任务回调                 |
| `[v = expr]` 初始化 | C++14    | 否               | 安全       | 移动捕获、计算捕获           |
| `[&v = expr]` 初始化| C++14    | 是               | 危险       | 引用初始化                   |

### 存储方式对比

| 存储方式          | 类型擦除 | 内联优化 | 堆分配 | 复制开销 | 适用场景                     |
| ----------------- | -------- | -------- | ------ | -------- | ---------------------------- |
| `auto`            | 否       | 是       | 否     | 1:1      | 同作用域,热路径              |
| 模板参数 `F`      | 否       | 是       | 否     | 1:1      | 泛型算法,库 API              |
| `std::function`   | 是       | 否       | 可能   | 可能堆分配| 异构回调存储,接口边界        |
| 函数指针          | 是       | 否       | 否     | 1 指针   | C API 兼容,无捕获回调        |
| `std::move_only_function` (C++23) | 是 | 否 | 可能 | 移动 | 异步任务,非复制回调           |

### Lambda 版本演进对比

| 特性                | C++11 | C++14 | C++17 | C++20 | C++23 |
| ------------------- | ----- | ----- | ----- | ----- | ----- |
| 基础 Lambda          | 是    | -     | -     | -     | -     |
| 值/引用捕获          | 是    | -     | -     | -     | -     |
| `mutable`           | 是    | -     | -     | -     | -     |
| 泛型 Lambda (`auto`) | -     | 是    | -     | -     | -     |
| 初始化捕获           | -     | 是    | -     | -     | -     |
| `[*this]`           | -     | -     | 是    | -     | -     |
| `constexpr lambda`  | -     | -     | 是    | -     | -     |
| 模板 Lambda          | -     | -     | -     | 是    | -     |
| 包展开捕获           | -     | -     | -     | 是    | -     |
| 显式对象参数 (递归)  | -     | -     | -     | -     | 是    |
| `[=]` 隐式 this 弃用 | -     | -     | -     | 是    | 放宽  |

### Lambda 与函数对象对比

| 维度        | Lambda                          | 函数对象 (Functor)              |
| ----------- | ------------------------------- | ------------------------------- |
| 定义位置    | 调用点就地定义                  | 类外或嵌套类                    |
| 类型名      | 匿名,用 `auto` 存储             | 显式命名                        |
| 状态携带    | 捕获                            | 成员变量                        |
| 模板支持    | C++20 模板 Lambda               | 模板类                          |
| 递归        | C++23 显式对象参数              | 普通成员函数                    |
| 调试可读性  | 较差 (匿名)                     | 较好 (有名字)                   |
| 重用性      | 局限 (类型唯一)                 | 高 (可实例化多次)               |
| 性能        | 与函数对象等价                  | 与 Lambda 等价                  |

### 调用方式性能对比

| 调用方式           | 内联可能 | 间接调用 | 堆分配 | 典型开销 (相对) |
| ------------------ | -------- | -------- | ------ | ---------------- |
| 内联 Lambda (auto) | 是       | 否       | 否     | 1x               |
| 模板参数 Lambda    | 是       | 否       | 否     | 1x               |
| `std::function`    | 否       | 是       | 可能   | 2-5x             |
| 函数指针           | 否       | 是       | 否     | 2-3x             |
| 虚函数             | 否       | 是       | 否     | 3-5x             |
| `std::bind`        | 否       | 是       | 可能   | 3-8x (已弃用)    |

## 常见陷阱与反模式

### 反模式 1:引用捕获悬空引用

```cpp
// 反模式:[&] 捕获局部变量,Lambda 生命周期超过变量
std::function<int()> makeBadLambda() {
    int x = 42;
    return [&x]() { return x; };  // x 在函数返回后析构,Lambda 持有悬空引用
}

// 正确做法:值捕获
std::function<int()> makeGoodLambda() {
    int x = 42;
    return [x]() { return x; };  // 拷贝 x 到 Lambda
}
```

**事故案例**:某金融系统在异步任务中使用 `[&]` 捕获循环变量,任务执行时循环已结束,变量被销毁,导致读取垃圾值,交易金额计算错误,损失数百万。

### 反模式 2:`[this]` 在异步场景悬空

```cpp
// 反模式:成员函数返回 [this] Lambda,对象析构后悬空
class BadWorker {
    int* data_;
public:
    std::function<int()> getTask() {
        return [this]() { return *data_; };  // this 可能失效
    }
};

void useBad() {
    std::function<int()> task;
    {
        BadWorker w;
        task = w.getTask();
    }  // w 析构
    task();  // UB:访问已析构对象
}

// 正确做法:[*this] (C++17)
class GoodWorker {
    int data_;
public:
    std::function<int()> getTask() {
        return [*this]() { return data_; };  // 拷贝整个对象
    }
};
```

### 反模式 3:`mutable` 滥用导致状态污染

```cpp
// 反模式:mutable Lambda 多次调用状态累积,难以调试
auto badFilter = [count = 0](int x) mutable {
    count++;  // 每次调用都修改状态
    return x > count;
};

// 在 STL 算法中调用,状态不确定
std::vector<int> v = {1, 2, 3, 4, 5};
std::remove_if(v.begin(), v.end(), badFilter);  // 行为依赖调用次数

// 正确做法:纯函数,不依赖 mutable 状态
auto goodFilter = [threshold = 3](int x) {
    return x > threshold;  // 纯函数,可预测
};
```

### 反模式 4:`std::function` 在热路径

```cpp
// 反模式:热路径使用 std::function,失去内联
void processHot(const std::vector<int>& data,
                std::function<bool(int)> pred) {  // 无法内联
    for (int x : data) {
        if (pred(x)) { /* ... */ }
    }
}

// 正确做法:模板参数,编译器内联
template<typename Pred>
void processHot(const std::vector<int>& data, Pred pred) {  // 可内联
    for (int x : data) {
        if (pred(x)) { /* ... */ }
    }
}
```

### 反模式 5:默认捕获 `[=]`/`[&]` 隐式捕获意外变量

```cpp
// 反模式:[=] 隐式捕获所有 used 变量,可能捕获不需要的
void bad(int a, int b, int c) {
    // 意图:只捕获 a,但 [=] 会捕获 b 和 c
    auto f = [=]() { return a + b; };  // c 未使用,不捕获
    // 若后续修改 b,Lambda 仍是旧值
}

// 正确做法:显式列出捕获变量
void good(int a, int b, int c) {
    auto f = [a, b]() { return a + b; };  // 明确只捕获 a 和 b
}
```

**说明**:C++20 起 `[=]` 隐式捕获 `this` 已弃用,应显式写 `[=, this]` 或 `[=, *this]`。

### 反模式 6:Lambda 递归用 `std::function` 导致性能损失

```cpp
// 反模式:用 std::function 实现递归 Lambda,有间接调用开销
std::function<int(int)> fib;
fib = [&fib](int n) -> int {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
};

// 正确做法:C++23 显式对象参数,零开销
auto fib = [](this auto self, int n) -> int {
    return n <= 1 ? n : self(n - 1) + self(n - 2);
};

// 或:struct 包装 (C++20 前)
template<typename F>
struct Recursive { F f; auto operator()(auto... a) const { return f(*this, a...); } };
```

### 反模式 7:浮点数捕获精度问题

```cpp
// 反模式:值捕获浮点数,编译器优化可能改变精度
double threshold = 0.1;
auto f = [threshold](double x) { return x < threshold; };
// 不同编译选项 (-ffast-math) 可能导致 threshold 精度不一致

// 正确做法:高精度场景使用定点数或显式控制精度
int64_t thresholdMillis = 100;  // 0.1 用 100 毫表示
auto f = [thresholdMillis](int64_t xMillis) { return xMillis < thresholdMillis; };
```

### 反模式 8:Lambda 捕获大对象导致 `std::function` 堆分配

```cpp
// 反模式:捕获大对象存入 std::function,触发堆分配
std::array<int, 1000> bigData = {/* ... */};
std::function<int(int)> f = [bigData](int i) { return bigData[i]; };
// sizeof(lambda) ≈ 4000,超过 SBO,堆分配

// 正确做法 1:shared_ptr 共享
auto sharedData = std::make_shared<std::array<int, 1000>>(bigData);
std::function<int(int)> f = [sharedData](int i) { return (*sharedData)[i]; };
// sizeof(lambda) ≈ 16 (一个指针),SBO 命中

// 正确做法 2:模板参数 (若 API 支持)
template<typename F>
void process(F f) { /* ... */ }
process([bigData](int i) { return bigData[i]; });  // 无堆分配
```

### 反模式 9:`auto` 存储递归 Lambda 错误

```cpp
// 反模式:auto 存储 Lambda,Lambda 内部无法引用自身
auto fib = [](int n) -> int {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);  // 编译错误:fib 不可见
};

// C++23 前的正确做法
auto fib = [](auto self, int n) -> int {
    return n <= 1 ? n : self(self, n - 1) + self(self, n - 2);
};
fib(fib, 10);

// C++23 正确做法
auto fib = [](this auto self, int n) -> int {
    return n <= 1 ? n : self(n - 1) + self(n - 2);
};
fib(10);
```

### 反模式 10:Lambda 捕获枚举类型未初始化

```cpp
// 反模式:捕获未初始化的枚举,行为未定义
enum class Status { Ok, Error };
Status s;  // 未初始化
auto f = [s]() { return s == Status::Ok; };  // UB:s 值不确定

// 正确做法:初始化
Status s = Status::Ok;
auto f = [s]() { return s == Status::Ok; };
```

## 工程实践

### 实践 1:优先使用显式捕获而非默认捕获

```cpp
// 推荐:显式列出每个捕获变量
void process(const std::vector<int>& data, int threshold) {
    int localSum = 0;
    std::for_each(data.begin(), data.end(),
        [threshold, &localSum](int x) {
            if (x > threshold) localSum += x;
        });
}

// 不推荐:[&] 隐式捕获,易出错
void processBad(const std::vector<int>& data, int threshold) {
    int localSum = 0;
    std::for_each(data.begin(), data.end(),
        [&](int x) {  // 哪些变量被捕获?需查看函数体
            if (x > threshold) localSum += x;
        });
}
```

**依据**:Google C++ Style Guide 与 LLVM Coding Standards 均建议避免 `[=]`/`[&]`,显式捕获提升可读性与安全性。

### 实践 2:异步任务使用移动捕获与 `[*this]`

```cpp
#include <memory>
#include <thread>
#include <future>

class AsyncService {
    std::shared_ptr<Config> config_;
public:
    // 异步任务:移动捕获 shared_ptr,避免悬空
    std::future<void> startTask() {
        auto cfg = config_;  // 引用计数 +1
        return std::async(std::launch::async,
            [cfg = std::move(cfg), *this]() {  // 移动捕获 + 拷贝 this
                // 即使 AsyncService 析构,任务仍安全
                processWithConfig(cfg);
            });
    }
};
```

### 实践 3:回调注册使用 `std::move_only_function` (C++23)

```cpp
#include <functional>
#include <map>
#include <string>

// C++23 前:std::function 限制只能复制回调
// C++23:std::move_only_function 支持移动语义回调
class EventBus {
    std::map<std::string, std::move_only_function<void()>> handlers_;
public:
    void subscribe(std::string event, std::move_only_function<void()> handler) {
        handlers_[std::move(event)] = std::move(handler);
    }

    void emit(const std::string& event) {
        if (auto it = handlers_.find(event); it != handlers_.end()) {
            it->second();
        }
    }
};

// 使用:可注册移动捕获 unique_ptr 的 Lambda
EventBus bus;
auto resource = std::make_unique<int>(42);
bus.subscribe("init", [r = std::move(resource)]() {
    std::cout << "init with resource: " << *r << "\n";
});
```

### 实践 4:热路径避免 `std::function`

```cpp
// 热路径:模板参数传递 Lambda,编译器内联
template<typename Pred>
void filterHot(std::vector<int>& data, Pred pred) {
    data.erase(std::remove_if(data.begin(), data.end(), pred), data.end());
}

// 冷路径:std::function 提供类型擦除灵活性
void filterCold(std::vector<int>& data, std::function<bool(int)> pred) {
    data.erase(std::remove_if(data.begin(), data.end(), pred), data.end());
}

// 使用
std::vector<int> v = {1, 2, 3, 4, 5};
filterHot(v, [](int x) { return x % 2 == 0; });  // 内联,快
```

### 实践 5:LIFT 宏与完美转发 Lambda

```cpp
// LIFT 宏:将函数名包装为完美转发 Lambda (C++14 技巧)
#define LIFT(...) \
    [](auto&&... args) noexcept(noexcept(__VA_ARGS__(std::forward<decltype(args)>(args)...))) \
        -> decltype(__VA_ARGS__(std::forward<decltype(args)>(args)...)) { \
        return __VA_ARGS__(std::forward<decltype(args)>(args)...); \
    }

// 用途:将重载函数名传递给需要可调用对象的 API
#include <algorithm>
#include <vector>
struct Foo { void bar(int); void bar(double); };

std::vector<Foo> foos;
// 错误:&Foo::bar 有重载,无法直接传递
// std::for_each(foos.begin(), foos.end(), &Foo::bar);

// 正确:LIFT 完美转发
std::for_each(foos.begin(), foos.end(), LIFT(&Foo::bar));
```

### 实践 6:Lambda 与 `std::bind` 的取舍

```cpp
#include <functional>

// C++11 早期:std::bind 常用于参数绑定
auto bound = std::bind(add, std::placeholders::_1, 42);

// 现代 C++:优先使用 Lambda,Lambda 更清晰、更易优化
auto boundLambda = [](int x) { return add(x, 42); };

// std::bind 的劣势:
// 1. 错误信息晦涩 (深度模板嵌套)
// 2. 无法内联 (类型擦除)
// 3. 占位符 _1, _2 可读性差
// 4. 对完美转发支持有限

// 准则:除非维护旧代码,否则用 Lambda 替代 std::bind
```

### 实践 7:Lambda 编译期求值 (`consteval` C++20)

```cpp
// C++20 consteval Lambda:强制编译期求值
auto constexprHash = [](const char* s) consteval -> size_t {
    size_t h = 0;
    while (*s) {
        h = h * 31 + *s++;
    }
    return h;
};

// 编译期计算
constexpr size_t hash = constexprHash("hello");
static_assert(hash == 99162322, "编译期哈希");

// 运行期使用:编译期已计算,无运行时开销
std::cout << "hash of \"hello\": " << hash << "\n";
```

## 案例研究

### 案例 1:Facebook Folly 的 `std::function` 优化

Facebook 的 C++ 基础库 Folly 提供了 `folly::Function`,针对 `std::function` 的性能瓶颈进行优化:

- **更大的 SBO**:libstdc++ `std::function` SBO 仅 16 字节,Folly Function SBO 达 32 字节,覆盖更多场景
- ** noexcept 感知**:区分 `Function<R(Args...)>` 与 `Function<R(Args...) noexcept>`,减少异常处理开销
- **移动优先**:支持 `move_only_function` 语义 (C++23 前就提供)

性能数据:Folly Function 在 Facebook 服务中减少 3-8% 的堆分配,热路径延迟降低 5-15%。

### 案例 2:LLVM/Clang 的 Lambda 编译优化

LLVM 在 IR 层对 Lambda 进行激进的优化:

- **SROA (Scalar Replacement of Aggregates)**:将闭包对象拆分为独立标量,便于寄存器分配
- **Mem2Reg**:捕获的变量提升到 SSA 寄存器
- **Inline**:模板参数传递的 Lambda 几乎总能内联

Clang 编译 `std::sort(v.begin(), v.end(), [](int a, int b){ return a < b; })` 时,Lambda 完全内联,生成与手写循环等价的代码。这是 C++ 高性能的关键:零开销抽象。

### 案例 3:ClickHouse 的 Lambda 与向量化

ClickHouse (Yandex 开源的列式数据库) 大量使用 Lambda 配合向量化引擎:

```cpp
// ClickHouse 的 Lambda 使用模式 (简化示意)
auto filterLambda = [](const ColumnPtr& col, size_t n) -> ColumnPtr {
    auto result = ColumnInt64::create();
    for (size_t i = 0; i < n; ++i) {
        if (col->getInt(i) > 0) {  // Lambda 内联
            result->insert(col->getInt(i));
        }
    }
    return result;
};

// 配合 SIMD:编译器将内联的 Lambda 自动向量化
// -O3 下,上述循环可能编译为 AVX2/AVX-512 指令
```

ClickHouse 的分析查询性能在 10-100 倍于传统行式数据库,Lambda 内联是关键之一。

### 案例 4:TensorFlow C++ API 的回调系统

TensorFlow C++ 后端使用 Lambda 实现异步计算图执行:

```cpp
// TensorFlow 的回调 (简化)
class Executor {
public:
    void schedule(std::function<void()> task) {
        threadPool_.schedule([task = std::move(task)]() {
            task();
        });
    }
};

// 使用:Lambda 嵌套捕获
executor.schedule([tensor, op = std::move(op)]() {
    op->compute(tensor);
    // 计算完成后调度后续
    executor.schedule([tensor, callback = std::move(callback)]() {
        callback(tensor);
    });
});
```

**教训**:早期版本使用 `[&]` 捕获,导致异步任务访问已析构变量。后改为显式移动捕获,消除悬空引用。

### 案例 5:Rust 闭包与 C++ Lambda 对比

Rust 闭包与 C++ Lambda 在设计哲学上有显著差异:

| 维度        | Rust 闭包                          | C++ Lambda                          |
| ----------- | ---------------------------------- | ----------------------------------- |
| 捕获推断    | 编译器自动推断 `Fn`/`FnMut`/`FnOnce` | 显式指定 `[=]`/`[&]`/`[v]`           |
| 生命周期    | 借用检查器强制                      | 程序员负责                          |
| 移动捕获    | `move` 关键字                       | `[v = std::move(v)]`                |
| 递归        | 直接支持                            | C++23 显式对象参数                  |
| 性能        | 零开销 (编译器内联)                 | 零开销 (模板内联)                   |
| 安全性      | 编译期保证无悬空引用                | 运行时 UB                          |

Rust 的优势:编译期杜绝悬空引用。C++ 的优势:灵活性高,无借用检查负担。

### 案例 6:Seastar 框架的 Lambda 链式调用

Seastar (ScyllaDB 的高性能框架) 大量使用 Lambda 实现异步 futures:

```cpp
// Seastar 风格的 Lambda 链 (简化)
future<> processRequest(Request req) {
    return parseRequest(std::move(req)).then([] (ParsedRequest parsed) {
        return validateRequest(parsed);
    }).then([] (ParsedRequest validated) {
        return fetchData(validated);
    }).then([] (Data data) {
        return processData(data);
    }).then([] (Result result) {
        return sendResponse(result);
    }).handle_exception([] (std::exception_ptr ep) {
        // 错误处理 Lambda
        return sendError(ep);
    });
}
```

Seastar 利用模板参数传递 Lambda,确保每个 `.then` 回调内联,实现零开销异步。这与 C++20 协程的设计理念一致,但 Seastar 早于协程标准化多年。

## 习题

### 基础题

**习题 1**:写出以下 Lambda 的等价函数对象类:

```cpp
int x = 10;
auto f = [x](int y) mutable { return ++x + y; };
```

**参考答案要点**:
```cpp
struct __closure_f {
    int x;
    int operator()(int y) {  // 非 const,因为 mutable
        return ++x + y;
    }
};
// 使用:__closure_f f{x}; f(5); 调用后 f.x 变为 11
```

**习题 2**:以下代码输出什么?解释原因。

```cpp
int x = 0;
auto f = [x]() mutable { x++; return x; };
std::cout << f() << " " << f() << " " << x << "\n";
```

**参考答案要点**:输出 `1 2 0`。值捕获 `x` 的副本到 Lambda,`mutable` 允许修改副本。每次调用 `f()` 副本递增,但原变量 `x` 不受影响。

**习题 3**:为什么以下代码编译错误?如何修复?

```cpp
auto fib = [](int n) -> int {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
};
```

**参考答案要点**:`fib` 在 Lambda 内部不可见 (Lambda 类型在声明语句结束后才完整)。修复方式:
- C++23:`auto fib = [](this auto self, int n) -> int { ... self(n-1) ... };`
- C++23 前:`auto fib = [](auto self, int n) -> int { ... self(self, n-1) ... };` 并以 `fib(fib, n)` 调用
- 或用 `std::function` 包装 (有性能损失)

### 进阶题

**习题 4**:实现一个 `compose` 函数,组合两个 Lambda:

```cpp
auto f = [](int x) { return x + 1; };
auto g = [](int x) { return x * 2; };
auto h = compose(f, g);  // h(x) = f(g(x)) = 2x + 1
```

**参考答案要点**:
```cpp
template<typename F, typename G>
auto compose(F f, G g) {
    return [f = std::move(f), g = std::move(g)](auto x) {
        return f(g(x));
    };
}
// 测试:compose(f, g)(5) = f(g(5)) = f(10) = 11
```

**习题 5**:分析以下代码的 `sizeof`,并解释:

```cpp
int a;
double b;
std::string s = "hello";
auto f1 = [a]() {};
auto f2 = [a, b]() {};
auto f3 = [s]() {};
auto f4 = [&s]() {};
```

**参考答案要点**:
- `sizeof(f1)` = 4 (一个 int,对齐 4)
- `sizeof(f2)` = 16 (int 4 + padding 4 + double 8)
- `sizeof(f3)` = 32 (libstdc++ std::string SSO 大小)
- `sizeof(f4)` = 8 (一个指针)

**习题 6**:使用 C++20 模板 Lambda 与 concepts 实现一个通用的 `clamp` 函数:

```cpp
auto clamp = []<???>(??? value, ??? lo, ??? hi) { ... };
```

**参考答案要点**:
```cpp
auto clamp = []<std::totally_ordered T>(T value, T lo, T hi) -> T {
    return value < lo ? lo : (hi < value ? hi : value);
};
// 使用:clamp(5, 1, 10), clamp(3.14, 0.0, 1.0)
```

### 挑战题

**习题 7**:实现一个编译期字符串字面量 Lambda,可在 `consteval` 上下文使用:

```cpp
auto constexprConcat = [](const char* a, const char* b) consteval {
    // 实现:返回编译期拼接的字符串
};
```

**参考答案要点**:
```cpp
// 难点:consteval 不能返回动态分配内存
// 方案:返回 std::array<char, N>,N 编译期计算
template<size_t N, size_t M>
auto constexprConcat(const char (&a)[N], const char (&b)[M]) consteval {
    std::array<char, N + M - 1> result{};
    for (size_t i = 0; i < N - 1; ++i) result[i] = a[i];
    for (size_t i = 0; i < M; ++i) result[N - 1 + i] = b[i];
    return result;
}
```

**习题 8**:分析以下代码的性能瓶颈,并优化:

```cpp
std::vector<std::function<int(int)>> callbacks;
for (int i = 0; i < 1000; ++i) {
    callbacks.push_back([i](int x) { return x + i; });
}
int sum = 0;
for (auto& cb : callbacks) {
    sum += cb(10);
}
```

**参考答案要点**:
- 瓶颈 1:每个 Lambda 捕获 `int i`,`sizeof` = 4,SBO 命中,无堆分配
- 瓶颈 2:`std::function` 调用无法内联,1000 次间接调用
- 优化 1:若 API 支持,用模板参数传递 Lambda
- 优化 2:用 `std::vector<std::pair<int, std::function<int(int)>>>` 或直接存储参数
- 优化 3:重构为 `int sum = 0; for (int i = 0; i < 1000; ++i) sum += 10 + i;`

**习题 9**:使用 C++23 显式对象参数实现一个递归 Lambda,计算二叉树的深度:

```cpp
struct Node { Node* left; Node* right; };
auto depth = [](this auto self, Node* n) -> int { ... };
```

**参考答案要点**:
```cpp
auto depth = [](this auto self, Node* n) -> int {
    if (!n) return 0;
    return 1 + std::max(self(n->left), self(n->right));
};
```

**习题 10**:对比以下三种回调存储方式,分析各自适用场景:

```cpp
// 方式 A:std::function
std::vector<std::function<void(int)>> callbacksA;

// 方式 B:模板参数
template<typename F>
void registerCallback(F&& cb) { /* ... */ }

// 方式 C:类型擦除 + 移动 (C++23)
std::vector<std::move_only_function<void(int)>> callbacksC;
```

**参考答案要点**:
- **方式 A (std::function)**:适用回调需复制、API 边界、异构回调混合存储。缺点:有堆分配与间接调用开销。
- **方式 B (模板参数)**:适用热路径、库内泛型算法。缺点:无法在运行时动态注册,类型泄漏到 API。
- **方式 C (move_only_function)**:适用异步任务、移动捕获资源。缺点:不可复制,需 C++23。

## 参考文献

[1] ISO/IEC 14882:2011. Information technology — Programming languages — C++ [S]. Geneva: ISO, 2011. https://www.iso.org/standard/50372.html

[2] ISO/IEC 14882:2014. Information technology — Programming languages — C++ [S]. Geneva: ISO, 2014. https://www.iso.org/standard/64029.html

[3] ISO/IEC 14882:2017. Information technology — Programming languages — C++ [S]. Geneva: ISO, 2017. https://www.iso.org/standard/68564.html

[4] ISO/IEC 14882:2020. Information technology — Programming languages — C++ [S]. Geneva: ISO, 2020. https://www.iso.org/standard/79358.html

[5] ISO/IEC 14882:2024. Information technology — Programming languages — C++ [S]. Geneva: ISO, 2024. https://www.iso.org/standard/83614.html

[6] Stroustrup B. The C++ Programming Language [M]. 4th ed. Upper Saddle River: Addison-Wesley, 2013. ISBN 978-0-321-56384-2

[7] Stroustrup B, Järvi J, Powell G, et al. Lambda Expressions and Closures: Wording for Monomorphic Lambdas (N2550) [R]. ISO/IEC JTC1/SC22/WG21, 2008. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2008/n2550.pdf

[8] Willcock J, Järvi J, Gregor D, et al. Lambda Expressions and Closures for C++ (N2329) [R]. ISO/IEC JTC1/SC22/WG21, 2007. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2007/n2329.pdf

[9] Sutter H. Exceptional C++: 47 Engineering Puzzles, Programming Problems, and Solutions [M]. Upper Saddle River: Addison-Wesley, 1999. ISBN 978-0-201-61562-3

[10] Sutter H, Alexandrescu A. C++ Coding Standards: 101 Rules, Guidelines, and Best Practices [M]. Upper Saddle River: Addison-Wesley, 2004. ISBN 978-0-321-11358-0

[11] Meyers S. Effective Modern C++: 42 Specific Ways to Improve Your Use of C++11 and C++14 [M]. Sebastopol: O'Reilly Media, 2014. ISBN 978-1-4919-0399-5

[12] Järvi J, Powell G, Lumsdaine A. Lambda Expressions and Closures for C++ [C]//Proceedings of the 2007 ACM Symposium on Applied Computing (SAC'07). New York: ACM, 2007: 1158-1163. DOI: 10.1145/1244002.1244256

[13] Gregor D, Järvi J, Siek J, et al. Generic Programming in C++: Concepts and Their Implementation [C]//Proceedings of the 2006 ACM Symposium on Applied Computing (SAC'06). New York: ACM, 2006: 162-167. DOI: 10.1145/1141277.1141317

[14] Sutter H. Thoughts on `std::function` Performance [EB/OL]. (2019-03-15). https://herbsutter.com/2019/03/15/should-you-store-stdfunction/

[15] Alexandrescu A. Modern C++ Design: Generic Programming and Design Patterns Applied [M]. Boston: Addison-Wesley, 2001. ISBN 978-0-201-70431-0

[16] Kiss C, Järvi J. Generic Lambdas: C++14 Language Feature and Its Implementation [C]//Proceedings of the 2014 C++Now Conference. 2014. https://github.com/boostcon/cppnow_presentations_2014

[17] Spertus M. Deducing This (P0847R7) [R]. ISO/IEC JTC1/SC22/WG21, 2021. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2021/p0847r7.html

[18] Doust B. Generalized Lambda Capture (Init-capture) (N3648) [R]. ISO/IEC JTC1/SC22/WG21, 2013. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2013/n3648.html

[19] Wang Z. Pack Expansion in Lambda Init-Capture (P0780R2) [R]. ISO/IEC JTC1/SC22/WG21, 2019. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2019/p0780r2.html

[20] Reis G D, Stroustrup B. General Constant Expressions for System Programming (N3291) [R]. ISO/IEC JTC1/SC22/WG21, 2011. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2011/n3291.pdf

[21] Sutton A. C++20 Concepts: The Definitive Guide [EB/OL]. (2020-04-01). https://brevzin.github.io/c++/2020/04/01/concepts-tutorial/

[22] Folly. Folly::Function Documentation [EB/OL]. (2023). https://github.com/facebook/folly/blob/main/folly/docs/Function.md

## 延伸阅读

### 官方文档

- cppreference: Lambda expressions [EB/OL]. https://en.cppreference.com/w/cpp/language/lambda
- cppreference: std::function [EB/OL]. https://en.cppreference.com/w/cpp/utility/functional/function
- cppreference: `std::move_only_function` (C++23) [EB/OL]. https://en.cppreference.com/w/cpp/utility/functional/move_only_function
- ISO C++ FAQ: Lambda expressions [EB/OL]. https://isocpp.org/wiki/faq/cpp11-language#lambda

### 经典教材

- Stroustrup B. A Tour of C++ [M]. 3rd ed. Boston: Addison-Wesley, 2022. (Chapter 11: Lambdas)
- Williams A. C++ Concurrency in Action [M]. 2nd ed. Manning, 2019. (Chapter 4: Synchronization with Lambda)
- Josuttis N M. C++20: The Complete Guide [M]. http://www.cppstd20.com, 2021. (Chapter 7: Lambda Improvements)
- Grimm R. C++23: The Next Big Step [EB/OL]. https://www.modernescpp.com/index.php/c23-the-next-big-step

### 前沿论文与提案

- P0200R0: Generic Lambda Capture Initialization [R]. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2016/p0200r0.html
- P0428R2: Familiar Template Syntax for Generic Lambdas [R]. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/p0428r2.pdf
- P0624R2: Default Constructible and Assignable Stateless Lambdas [R]. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/p0624r2.pdf
- P0847R7: Deducing This (C++23 Recursive Lambda) [R]. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2021/p0847r7.html
- P2280R4: Using Unknown References in Constant Expressions [R]. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2022/p2280r4.html

### 在线资源

- Jason Turner. C++ Weekly Episode 42: Lambda Expressions [EB/OL]. https://www.youtube.com/watch?v=9LF6Jj_9tAM
- Jason Turner. C++ Weekly Episode 167: C++20's Template Lambdas [EB/OL]. https://www.youtube.com/watch?v=8U8eQyAyNMQ
- Bartek Filipek. C++20: Lambdas in C++20 [EB/OL]. https://www.cppstories.com/2020/07/lambdas-cpp20.html
- Bartek Filipek. C++23: Deducing This [EB/OL]. https://www.cppstories.com/2023/02/deducing-this-cpp23/

### 实战项目

- Folly: https://github.com/facebook/folly (Folly::Function 优化实现)
- Seastar: https://github.com/scylladb/seastar (Lambda 链式异步)
- ClickHouse: https://github.com/ClickHouse/ClickHouse (Lambda 向量化)
- Range-v3: https://github.com/ericniebler/range-v3 (Lambda 与范围)

### 相关课程

- MIT 6.172: Performance Engineering of Software Systems [EB/OL]. https://ocw.mit.edu/courses/6-172-performance-engineering-of-software-systems-fall-2018/
- Stanford CS106L: Standard C++ Programming [EB/OL]. http://web.stanford.edu/class/cs106l/
- CPPCon: Back to Basics: Lambdas from Scratch [EB/OL]. https://www.youtube.com/watch?v=3jRpSfr5F2A
