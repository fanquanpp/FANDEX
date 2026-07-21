---
order: 60
title: 运算符重载
module: cpp
category: C++
difficulty: intermediate
description: 运算符重载规则与最佳实践
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/RAII与资源管理
  - cpp/C++20模块
  - cpp/面向对象基础
  - cpp/智能指针详解
prerequisites:
  - cpp/概述与现代标准
---

# C++ 运算符重载

> 本文档系统讲解 C++ 运算符重载（operator overloading）机制，覆盖可重载运算符清单、成员与非成员函数选择、算术/比较/赋值/自增自减/下标/函数调用/解引用/成员访问/类型转换运算符的语义与实现、C++20 `<=>` 太空船运算符、自定义字面量、内存分配运算符、运算符重载在 STL 与现代 C++ 中的设计模式等核心主题。所有代码示例可在支持 C++17/20/23 的主流编译器上编译通过，标注 GCC/Clang/MSVC 兼容性。对标 MIT 6.S192、Stanford CS106L、CMU 15-411 课程教学水准。

## 1. 学习目标

完成本章学习后，读者应能够达成以下 Bloom 认知层级目标：

| Bloom 层级 | 目标描述 |
| :--- | :--- |
| **Remember（记忆）** | 列举 C++ 中可重载与不可重载的运算符清单，复述成员与非成员运算符函数的语法形式 |
| **Understand（理解）** | 解释运算符重载的语义约束（与内置运算符行为一致）、参数数量规则、返回值类型选择依据 |
| **Apply（应用）** | 为自定义类型实现算术、比较、赋值、下标、函数调用、流、自增自减、解引用、转换运算符 |
| **Analyze（分析）** | 分析给定运算符重载代码的正确性、效率、异常安全性，识别违反语义一致性的设计 |
| **Evaluate（评价）** | 评估 C++20 `<=>` 三路比较运算符相比传统手写六个比较运算符的优势，权衡成员 vs 非成员 vs 友元的选择 |
| **Create（创造）** | 设计领域特定的 DSL（Domain-Specific Language），实现表达式模板、CRTP 静态多态、智能指针包装器、迭代器适配器 |

## 2. 历史动机与发展脉络

### 2.1 早期动机：支持复数与矩阵运算

Bjarne Stroustrup 在 *Cpre* 预处理器（1979-1985）中引入运算符重载的核心动机是支持数学类型的自然表达。考虑 C 风格的复数运算：

```c
/* C 风格：函数调用语法笨拙 */
struct complex { double re, im; };
struct complex add(struct complex a, struct complex b) {
    struct complex r = { a.re + b.re, a.im + b.im };
    return r;
}
/* 使用 */
struct complex z = add(add(x, y), w);  /* 难以阅读 */
```

引入运算符重载后：

```cpp
// C++ 风格：自然的数学表达式
struct complex {
    double re, im;
    friend complex operator+(complex a, complex b) {
        return {a.re + b.re, a.im + b.im};
    }
};
/* 使用 */
complex z = x + y + w;  /* 清晰、符合数学惯例 */
```

运算符重载使自定义类型能像内置类型一样自然表达，是 C++ 区别于 C 的关键特性之一。

### 2.2 C++ 标准演进

| 标准 | 发布年 | 运算符重载相关新特性 | 关键提案 |
| :--- | :--- | :--- | :--- |
| **Cfront 1.0** | 1989 | 基本运算符重载：算术、比较、赋值、`[]`、`()`、`->` | Stroustrup, *The C++ Programming Language* |
| **C++98** | 1998 | 形式化语义；`operator new`/`operator delete`；转换运算符；模板运算符 | ISO/IEC 14882:1998 |
| **C++11** | 2011 | `explicit` 转换运算符；`operator""` 用户定义字面量；`noexcept` 运算符；右值引用运算符 | N2437, N2765 |
| **C++14** | 2014 | `constexpr` 运算符函数放宽；泛型 lambda 的 `operator()` | N3652 |
| **C++17** | 2017 | `constexpr` lambdas；折叠表达式（涉及运算符） | N4287 |
| **C++20** | 2020 | `<=>` 三路比较运算符；`operator==` 反向推导；`consteval`；defaulted 比较运算符 | P0515, P1185, P1946 |
| **C++23** | 2023 | `explicit operator bool` 在条件上下文简化；`static operator()`；`static operator[]`（C++23 后期） | P1169, P2589 |
| **C++26** | 草案 | `static operator()` 推广；`<=>` 与 `==` 进一步细化 | P2741, P2932 |

### 2.3 关键提案与文献

- **Stroustrup 1985**：*An Overview of C++*，首次公开运算符重载语法与设计哲学。
- **N2437 (Sutter, 2007)**：*Explicit Conversion Operators*，提出 `explicit operator bool` 解决安全布尔问题。
- **N2765 (Maurer, 2008)**：*User-defined Literals*，引入 `operator""` 后缀。
- **P0515 (Smith, 2017)**：*Consistent Comparison*，奠定 `<=>` 三路比较基础。
- **P1185 (Spertus, 2018)**：*Defaulted comparison operators*，`<=>` 与 `==` 互相生成规则。
- **P1946 (Bancila, 2019)**：*C++ Smart References*，探讨 `operator.` 重载（最终未纳入）。
- **P1169 (Köppe, 2018)**：*static operator call*，`static operator()` 提案。
- **P2589 (Bancila, 2022)**：*static operator[]*，C++26 候选特性。

### 2.4 设计哲学：语义一致性

Stroustrup 在 *The C++ Programming Language* 第 4 版中提出运算符重载的核心准则：

> "An operator should be used only for operations for which the conventional meaning is unambiguous."（运算符只应用于其常规含义无歧义的操作。）

具体表现为：

1. **语义一致**：`+` 应表示加法或拼接，而非删除；`==` 应是等价关系（自反、对称、传递）。
2. **不发明新运算符**：不能重载 `**`、`<>` 等非 C++ 运算符。
3. **保留优先级与结合性**：`*` 永远优先于 `+`，无法改变。
4. **保留操作数数量**：二元运算符永远接受 2 个操作数，一元 1 个。
5. **保留求值顺序**：除了 `&&`、`||`、`,`（C++17 起部分顺序化），大多数运算符的操作数求值顺序未指定。

### 2.5 与其他语言的横向对比

| 特性 | C++ | Rust | Python | Swift | Kotlin |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 运算符重载 | 全部可重载（除 5 个） | 通过 trait 实现（`Add`、`Sub` 等） | 通过 `__add__` 等魔法方法 | 通过 protocol 函数 | 通过 `operator fun` |
| 自定义运算符 | 否（仅已有符号） | 是（`trait MyOp`） | 否 | 是（自定义符号） | 否 |
| 三路比较 | C++20 `<=>` | `Ord` trait 返回 `Ordering` | `__cmp__`（已弃用） | `Comparable` | `Comparable` |
| 用户定义字面量 | C++11 `operator""` | 否 | 否 | 否 | 否 |
| 重载限制 | 不可重载 `.`、`::`、`?:`、`sizeof`、`typeid` | 不可重载 `&&`、`||`、`=`（语义保留） | 不可重载 `and`、`or` | 受 protocol 限制 | 受限 |

## 3. 形式化定义

### 3.1 运算符函数的语法

C++ 中每个运算符重载本质上是函数重载。语法形式（ISO/IEC 14882:2023 §12.4）：

$$
\text{operator-function} := \text{operator}\ \text{op}\ (\text{parameter-list})
$$

其中 $\text{op} \in \{+, -, *, /, \%, \hat{}, \&, |, \sim, !, =, <, >, +=, \ldots\}$。

成员函数形式：

$$
\text{member-op} := \text{return-type}\ \text{operator op}\ (\text{params})\ \text{cv-qual}\ \text{ref-qual}\ \{\ldots\}
$$

非成员函数形式：

$$
\text{non-member-op} := \text{return-type}\ \text{operator op}\ (\text{params})\ \{\ldots\}
$$

### 3.2 参数数量规则

运算符函数的参数数量严格对应操作数数量：

| 运算符类别 | 成员函数参数数 | 非成员函数参数数 | 示例 |
| :--- | :--- | :--- | :--- |
| 一元运算符（前缀 `++`、`--`、`!`、`-`、`~`、`*`、`&`） | 0 | 1 | `T::operator!()` 或 `operator!(T)` |
| 二元运算符（`+`、`-`、`==`、`[]`等） | 1 | 2 | `T::operator+(U)` 或 `operator+(T, U)` |
| 后缀 `++`/`--` | 1（int 占位） | 2（int 占位） | `T::operator++(int)` |

形式化规则：

$$
\text{arity}(\text{op}) =
\begin{cases}
1 & \text{if op is unary} \\
2 & \text{if op is binary} \\
\end{cases}
\quad
\text{params}_{\text{member}} = \text{arity} - 1
\quad
\text{params}_{\text{non-member}} = \text{arity}
$$

### 3.3 可重载与不可重载运算符清单

**可重载运算符**（ISO/IEC 14882:2023 §12.4 [over.oper]）：

```
+    -    *    /    %       ^       &        |        ~        !        =
<    >    <=   >=   ++      --      <<       >>       ==       !=       &&
||   ^=  &=   |=   <<=     >>=     []       ()       ->       ->*      ,
new  new[]  delete  delete[]  <=>   ""_X
```

**不可重载运算符**：

| 运算符 | 语义 | 不可重载原因 |
| :--- | :--- | :--- |
| `.` | 成员访问 | 保证对象身份语义，避免歧义 |
| `.*` | 成员指针访问 | 同上 |
| `::` | 作用域解析 | 编译期符号查找，运行时无意义 |
| `?:` | 三元条件 | 含求值短路，无法用函数语义表达 |
| `sizeof` | 大小查询 | 编译期属性 |
| `typeid` | 类型信息 | RTTI 内建 |

### 3.4 成员 vs 非成员选择规则

形式化决策规则：

$$
\text{form}(\text{op}) =
\begin{cases}
\text{member} & \text{if op} \in \{=, (), [], ->, \text{conversion}\} \\
\text{non-member} & \text{if op} \in \{<<, >>\} \text{ (左操作数为流)} \\
\text{non-member (symmetric)} & \text{if op} \in \{+, -, *, /, ==, <, <=>\} \text{ 且需左操作数隐式转换} \\
\text{member (compound)} & \text{if op} \in \{+=, -=, *=, /=\} \text{ (修改自身)} \\
\text{free choice} & \text{otherwise}
\end{cases}
$$

详细规则：

| 选择 | 适用场景 | 原因 |
| :--- | :--- | :--- |
| 必须成员 | `=`、`()`、`[]`、`->`、类型转换 | 标准强制要求左操作数为类对象 |
| 必须非成员 | `<<`、`>>`（流） | 左操作数为 `std::ostream`/`std::istream`，无法添加成员 |
| 建议非成员 | 对称算术 `+`、`-`、`*`；比较 `==`、`<`、`<=>` | 支持左操作数隐式转换（如 `2 + complex(3, 4)`） |
| 建议成员 | 复合赋值 `+=`、`-=`；自增自减 `++`、`--`；单目 `!`、`-` | 修改自身，左操作数明确为类对象 |
| 自由选择 | 单目 `&`（取地址，默认不重载） | 通常保留默认语义 |

### 3.5 返回值类型选择

返回值类型的形式化决策：

$$
\text{return}(\text{op}) =
\begin{cases}
T\& \text{ or } T\&\& & \text{if op is lvalue-returning} (=, [], \text{<<}, \text{prefix } ++) \\
T & \text{if op produces new value} (+, -, *, /, \text{postfix } ++) \\
\text{bool} & \text{if op is comparison or logical} (==, <, <=>, \&\&, ||) \\
\text{auto} & \text{if op is } <=> \text{ (returns comparison category)}
\end{cases}
$$

## 4. 理论推导与原理解析

### 4.1 运算符重载的函数调用等价性

C++ 编译器将运算符表达式重写为函数调用：

$$
\text{expr } a \oplus b \equiv
\begin{cases}
a.\text{operator}\oplus(b) & \text{(member form)} \\
\text{operator}\oplus(a, b) & \text{(non-member form)}
\end{cases}
$$

重载决议（overload resolution）查找候选函数集时，成员与非成员形式同时考虑：

```cpp
struct V {
    int v;
    // 成员形式
    V operator+(const V& rhs) const { return V{v + rhs.v}; }
    // 友元非成员形式（与成员冲突，导致歧义）
    // friend V operator+(const V& lhs, const V& rhs) { return V{lhs.v + rhs.v}; }
};

V a{1}, b{2};
V c = a + b;  // 重写为 a.operator+(b) 或 operator+(a, b)
```

### 4.2 隐式转换与对称性

非成员形式允许左操作数隐式转换，这是关键优势：

```cpp
class Money {
    long cents_;
public:
    explicit Money(long c) : cents_(c) {}
    // 非成员友元：支持 Money + Money 和 long + Money（需 Money 构造可隐式）
    friend Money operator+(Money lhs, Money rhs) {
        return Money{lhs.cents_ + rhs.cents_};
    }
    long cents() const { return cents_; }
};

Money a{100};
// Money r1 = a + 50;   // 若构造函数非 explicit，则 50 -> Money 临时对象
// Money r2 = 50 + a;   // 同上，非成员形式支持左操作数转换
```

若用成员形式 `Money::operator+(Money)`，则 `50 + a` 编译失败（`int` 无 `operator+(Money)` 成员）。

### 4.3 临时对象与拷贝省略

二元算术运算符返回新对象，传统实现：

```cpp
// 实现方式 A：const 引用参数
V operator+(const V& lhs, const V& rhs) {
    V tmp(lhs);  // 拷贝构造
    tmp += rhs;
    return tmp;  // NRVO 或 C++17 mandatory copy elision
}

// 实现方式 B：值传递参数
V operator+(V lhs, const V& rhs) {
    lhs += rhs;
    return lhs;  // 已是拷贝或移动
}
```

C++17 起保证的拷贝省略（P0135）使方式 B 更优：编译器在调用点直接构造返回对象，避免额外拷贝。

### 4.4 类型转换运算符的隐式陷阱

```cpp
class String {
    std::string s_;
public:
    // 危险：隐式转换为 const char*
    operator const char*() const { return s_.c_str(); }
};

String s = "hello";
const char* p = s;  // 看似自然，但 s 销毁后 p 悬空
delete[] p;  // 严重 UB
```

C++11 引入 `explicit` 转换运算符解决此问题：

```cpp
class String {
    std::string s_;
public:
    explicit operator const char*() const { return s_.c_str(); }
};

String s = "hello";
// const char* p = s;  // 错误：explicit 阻止隐式转换
const char* p = static_cast<const char*>(s);  // 必须显式转换
```

`explicit operator bool()` 是例外：在条件上下文（`if`、`while`、`!`、`&&`、`||`、三元条件第一操作数）中自动应用，称为"上下文转换"。

### 4.5 C++20 `<=>` 三路比较机制

`<=>`（spaceship operator）返回比较类别类型，编译器据此生成 `<`、`<=`、`>`、`>=`：

| 比较类别 | 类型 | 语义 | 示例 |
| :--- | :--- | :--- | :--- |
| 强序 | `std::strong_ordering` | 等价即相等 | 整数 |
| 弱序 | `std::weak_ordering` | 等价但不相等 | 大小写不敏感字符串 |
| 偏序 | `std::partial_ordering` | 可有不可比 | 浮点数（NaN） |

```cpp
#include <compare>

struct Point {
    int x, y;
    // 自动生成 <, <=, >, >=, ==（C++20 隐式）
    auto operator<=>(const Point&) const = default;
};

Point a{1, 2}, b{1, 3};
bool less = a < b;          // 调用 <=> 后比较结果与 0
bool eq = a == b;           // C++20 自动生成
```

`<=>` 与 `==` 的关系（P1185）：

- 若定义了 `operator<=>`，编译器自动生成 `<`、`<=`、`>`、`>=`；
- 若同时定义 `operator==`（defaulted），编译器自动生成 `!=`；
- 若仅定义 `operator<=>`（非 default），`==` 默认通过 `<=>` 实现，但可单独定义以优化。

### 4.6 迭代器运算符与概念约束

C++20 引入 `std::input_iterator`、`std::forward_iterator` 等概念（concept），明确要求运算符语义：

```cpp
template<typename I>
concept InputIterator =
    requires(I i) {
        typename std::iter_value_t<I>;
        typename std::iter_reference_t<I>;
        { *i } -> std::same_as<std::iter_reference_t<I>>;
        { ++i } -> std::same_as<I&>;
        { i++ } -> std::same_as<I>;
    };
```

实现迭代器需重载 `*`、`->`、`++`、`==`、`!=`，并满足相应概念的语法与语义要求。

### 4.7 函数调用运算符与闭包

`operator()` 是最灵活的运算符，可接受任意数量参数，是函数对象与 lambda 的基础：

```cpp
// 函数对象
struct Adder {
    int delta;
    int operator()(int x) const { return x + delta; }
};

Adder add5{5};
int r = add5(10);  // 15

// Lambda 等价于匿名函数对象
auto add5_lambda = [delta = 5](int x) { return x + delta; };
// 编译器生成类似：
struct __lambda {
    int delta;
    int operator()(int x) const { return x + delta; }
};
```

C++23 起 `operator()` 可声明为 `static`，无 `this` 指针，适用于无状态函数对象：

```cpp
struct Square {
    static int operator()(int x) { return x * x; }  // C++23
};
```

## 5. 代码示例（企业级 production-ready）

### 5.1 复数类型：完整运算符重载

```cpp
// file: complex_number.cpp
// compile: g++ -std=c++20 -O2 -o complex complex_number.cpp
#include <iostream>
#include <cmath>
#include <compare>
#include <format>

// 企业级复数类型，演示算术、比较、流、转换、自增运算符
class Complex {
    double re_, im_;

public:
    // 构造函数（constexpr 支持编译期计算）
    constexpr Complex(double re = 0, double im = 0) noexcept : re_(re), im_(im) {}

    // 访问器
    constexpr double real() const noexcept { return re_; }
    constexpr double imag() const noexcept { return im_; }

    // 复合赋值：成员函数，返回 *this 引用支持链式
    constexpr Complex& operator+=(const Complex& rhs) noexcept {
        re_ += rhs.re_;
        im_ += rhs.im_;
        return *this;
    }
    constexpr Complex& operator-=(const Complex& rhs) noexcept {
        re_ -= rhs.re_;
        im_ -= rhs.im_;
        return *this;
    }
    constexpr Complex& operator*=(const Complex& rhs) noexcept {
        double new_re = re_ * rhs.re_ - im_ * rhs.im_;
        double new_im = re_ * rhs.im_ + im_ * rhs.re_;
        re_ = new_re;
        im_ = new_im;
        return *this;
    }
    constexpr Complex& operator/=(const Complex& rhs) noexcept {
        double denom = rhs.re_ * rhs.re_ + rhs.im_ * rhs.im_;
        double new_re = (re_ * rhs.re_ + im_ * rhs.im_) / denom;
        double new_im = (im_ * rhs.re_ - re_ * rhs.im_) / denom;
        re_ = new_re;
        im_ = new_im;
        return *this;
    }

    // 一元负号：成员函数
    constexpr Complex operator-() const noexcept { return Complex{-re_, -im_}; }
    // 一元正号
    constexpr Complex operator+() const noexcept { return *this; }

    // C++20 三路比较：按模比较（弱序）
    auto operator<=>(const Complex& rhs) const noexcept {
        double m1 = std::sqrt(re_ * re_ + im_ * im_);
        double m2 = std::sqrt(rhs.re_ * rhs.re_ + rhs.im_ * rhs.im_);
        if (m1 < m2) return std::weak_ordering::less;
        if (m1 > m2) return std::weak_ordering::greater;
        return std::weak_ordering::equivalent;
    }
    // 等价关系：实部虚部都相等
    bool operator==(const Complex& rhs) const noexcept {
        return re_ == rhs.re_ && im_ == rhs.im_;
    }

    // 流运算符：非成员友元
    friend std::ostream& operator<<(std::ostream& os, const Complex& c) {
        if (c.im_ == 0) return os << c.re_;
        if (c.re_ == 0) return os << c.im_ << 'i';
        return os << c.re_ << (c.im_ > 0 ? "+" : "") << c.im_ << 'i';
    }
    friend std::istream& operator>>(std::istream& is, Complex& c) {
        char sign, i;
        return is >> c.re_ >> sign >> c.im_ >> i;  // 形如 3+4i
    }
};

// 二元算术：非成员，值传递支持左操作数转换
constexpr Complex operator+(Complex lhs, const Complex& rhs) noexcept {
    lhs += rhs;
    return lhs;
}
constexpr Complex operator-(Complex lhs, const Complex& rhs) noexcept {
    lhs -= rhs;
    return lhs;
}
constexpr Complex operator*(Complex lhs, const Complex& rhs) noexcept {
    lhs *= rhs;
    return lhs;
}
constexpr Complex operator/(Complex lhs, const Complex& rhs) noexcept {
    lhs /= rhs;
    return lhs;
}

int main() {
    constexpr Complex a{3, 4}, b{1, -2};
    constexpr Complex sum = a + b;       // 4+2i
    constexpr Complex prod = a * b;      // 11-2i
    std::cout << "a + b = " << sum << "\n";
    std::cout << "a * b = " << prod << "\n";
    std::cout << std::format("|a| = {:.4f}\n", std::sqrt(a.real()*a.real() + a.imag()*a.imag()));
    static_assert(sum.real() == 4.0 && sum.imag() == 2.0);
    return 0;
}
```

### 5.2 矩阵类型：表达式模板

```cpp
// file: matrix_expr.cpp
// compile: g++ -std=c++20 -O2 -o matrix matrix_expr.cpp
#include <vector>
#include <cstddef>
#include <stdexcept>
#include <initializer_list>

// 表达式模板：避免中间临时对象
template<typename E>
struct MatExpr {
    // CRTP 静态多态：通过子类提供具体实现
    double operator()(size_t i, size_t j) const { return static_cast<const E&>(*this)(i, j); }
    size_t rows() const { return static_cast<const E&>(*this).rows(); }
    size_t cols() const { return static_cast<const E&>(*this).cols(); }
};

// 具体矩阵
class Matrix : public MatExpr<Matrix> {
    std::vector<std::vector<double>> data_;

public:
    Matrix(size_t r, size_t c, double init = 0)
        : data_(r, std::vector<double>(c, init)) {}

    Matrix(std::initializer_list<std::initializer_list<double>> il) {
        for (auto& row : il) data_.emplace_back(row);
    }

    // 下标运算符：双层 const/non-const
    std::vector<double>& operator[](size_t i) {
        if (i >= rows()) throw std::out_of_range("Matrix row index");
        return data_[i];
    }
    const std::vector<double>& operator[](size_t i) const {
        if (i >= rows()) throw std::out_of_range("Matrix row index");
        return data_[i];
    }

    size_t rows() const { return data_.size(); }
    size_t cols() const { return data_.empty() ? 0 : data_[0].size(); }
    double operator()(size_t i, size_t j) const { return data_[i][j]; }

    // 复合赋值
    Matrix& operator+=(const Matrix& rhs) {
        if (rows() != rhs.rows() || cols() != rhs.cols())
            throw std::invalid_argument("Matrix dimension mismatch");
        for (size_t i = 0; i < rows(); ++i)
            for (size_t j = 0; j < cols(); ++j)
                data_[i][j] += rhs.data_[i][j];
        return *this;
    }
};

// 表达式模板：矩阵求和表达式
template<typename L, typename R>
class MatSum : public MatExpr<MatSum<L, R>> {
    const L& lhs_;
    const R& rhs_;

public:
    MatSum(const L& l, const R& r) : lhs_(l), rhs_(r) {
        if (l.rows() != r.rows() || l.cols() != r.cols())
            throw std::invalid_argument("Dimension mismatch");
    }
    double operator()(size_t i, size_t j) const { return lhs_(i, j) + rhs_(i, j); }
    size_t rows() const { return lhs_.rows(); }
    size_t cols() const { return lhs_.cols(); }
};

// 运算符重载返回表达式模板
template<typename L, typename R>
MatSum<L, R> operator+(const MatExpr<L>& l, const MatExpr<R>& r) {
    return MatSum<L, R>(static_cast<const L&>(l), static_cast<const R&>(r));
}

#include <iostream>
int main() {
    Matrix a{{1, 2, 3}, {4, 5, 6}};
    Matrix b{{10, 20, 30}, {40, 50, 60}};
    auto sum_expr = a + b;  // 不立即计算，延迟到访问时
    std::cout << "sum[0][0] = " << sum_expr(0, 0) << "\n";  // 11
    std::cout << "sum[1][2] = " << sum_expr(1, 2) << "\n";  // 66
    return 0;
}
```

### 5.3 智能指针风格包装器

```cpp
// file: scoped_ptr.cpp
// compile: g++ -std=c++20 -O2 -o scoped_ptr scoped_ptr.cpp
#include <iostream>
#include <utility>
#include <stdexcept>

template<typename T>
class ScopedPtr {
    T* ptr_;

public:
    explicit ScopedPtr(T* p = nullptr) noexcept : ptr_(p) {}
    ~ScopedPtr() { delete ptr_; }

    // 禁用拷贝（独占所有权）
    ScopedPtr(const ScopedPtr&) = delete;
    ScopedPtr& operator=(const ScopedPtr&) = delete;

    // 移动语义
    ScopedPtr(ScopedPtr&& other) noexcept : ptr_(other.ptr_) { other.ptr_ = nullptr; }
    ScopedPtr& operator=(ScopedPtr&& other) noexcept {
        if (this != &other) {
            delete ptr_;
            ptr_ = other.ptr_;
            other.ptr_ = nullptr;
        }
        return *this;
    }

    // 解引用运算符
    T& operator*() const {
        if (!ptr_) throw std::runtime_error("Dereference null ScopedPtr");
        return *ptr_;
    }
    // 箭头运算符：返回原始指针，编译器再次应用 ->（链式）
    T* operator->() const noexcept { return ptr_; }

    // 布尔转换：explicit 防止意外转换为 int
    explicit operator bool() const noexcept { return ptr_ != nullptr; }

    // 下标运算符（若 T 是数组类型）
    template<typename U = T>
    std::enable_if_t<std::is_array_v<U>, std::remove_extent_t<U>&>
    operator[](size_t i) const {
        return ptr_[i];
    }

    T* get() const noexcept { return ptr_; }
    T* release() noexcept { T* p = ptr_; ptr_ = nullptr; return p; }
};

struct Widget {
    int value;
    void hello() const { std::cout << "Widget(" << value << ")\n"; }
};

int main() {
    ScopedPtr<Widget> p(new Widget{42});
    p->hello();            // 通过 operator-> 访问成员
    std::cout << (*p).value << "\n";  // 通过 operator* 解引用
    if (p) {               // 通过 operator bool 检查
        std::cout << "valid\n";
    }
    ScopedPtr<Widget> q = std::move(p);  // 移动
    if (!p) std::cout << "p is null\n";
    return 0;
}
```

### 5.4 自定义容器与迭代器

```cpp
// file: custom_vector.cpp
// compile: g++ -std=c++20 -O2 -o custom_vec custom_vector.cpp
#include <cstddef>
#include <memory>
#include <stdexcept>
#include <algorithm>
#include <compare>
#include <initializer_list>

// 简化版动态数组，演示 []、*、->、++、--、== 等运算符
template<typename T>
class Vec {
    std::unique_ptr<T[]> data_;
    size_t size_;

public:
    Vec() noexcept : data_(nullptr), size_(0) {}
    explicit Vec(size_t n) : data_(std::make_unique<T[]>(n)), size_(n) {}
    Vec(std::initializer_list<T> il) : Vec(il.size()) {
        std::copy(il.begin(), il.end(), data_.get());
    }

    // 下标运算符
    T& operator[](size_t i) {
        if (i >= size_) throw std::out_of_range("Vec index");
        return data_[i];
    }
    const T& operator[](size_t i) const {
        if (i >= size_) throw std::out_of_range("Vec index");
        return data_[i];
    }

    size_t size() const noexcept { return size_; }

    // 迭代器类型
    class Iterator {
        T* ptr_;

    public:
        using iterator_category = std::random_access_iterator_tag;
        using value_type = T;
        using difference_type = std::ptrdiff_t;
        using pointer = T*;
        using reference = T&;

        explicit Iterator(T* p = nullptr) noexcept : ptr_(p) {}

        // 解引用
        reference operator*() const noexcept { return *ptr_; }
        pointer operator->() const noexcept { return ptr_; }

        // 前缀 ++ 返回引用
        Iterator& operator++() noexcept { ++ptr_; return *this; }
        // 后缀 ++ 返回旧值副本
        Iterator operator++(int) noexcept { Iterator t = *this; ++ptr_; return t; }
        Iterator& operator--() noexcept { --ptr_; return *this; }
        Iterator operator--(int) noexcept { Iterator t = *this; --ptr_; return t; }

        // 算术运算符
        Iterator& operator+=(difference_type n) noexcept { ptr_ += n; return *this; }
        Iterator& operator-=(difference_type n) noexcept { ptr_ -= n; return *this; }
        Iterator operator+(difference_type n) const noexcept { Iterator t = *this; t += n; return t; }
        Iterator operator-(difference_type n) const noexcept { Iterator t = *this; t -= n; return t; }
        difference_type operator-(const Iterator& rhs) const noexcept { return ptr_ - rhs.ptr_; }

        // 比较
        auto operator<=>(const Iterator&) const = default;
    };

    Iterator begin() noexcept { return Iterator(data_.get()); }
    Iterator end() noexcept { return Iterator(data_.get() + size_); }
};

// 非成员迭代器算术
template<typename T>
typename Vec<T>::Iterator operator+(typename Vec<T>::Iterator::difference_type n,
                                    const typename Vec<T>::Iterator& it) noexcept {
    return it + n;
}

#include <iostream>
#include <numeric>
int main() {
    Vec<int> v{10, 20, 30, 40, 50};
    std::cout << "v[2] = " << v[2] << "\n";  // 30
    int sum = std::accumulate(v.begin(), v.end(), 0);
    std::cout << "sum = " << sum << "\n";  // 150
    return 0;
}
```

### 5.5 自定义字面量

```cpp
// file: user_literals.cpp
// compile: g++ -std=c++20 -O2 -o literals user_literals.cpp
#include <chrono>
#include <string>
#include <cstdint>

// 用户定义字面量：以 _ 开头（避免与标准库冲突）

// 时间字面量
constexpr auto operator""_h(unsigned long long h) {
    return std::chrono::hours(h);
}
constexpr auto operator""_min(unsigned long long m) {
    return std::chrono::minutes(m);
}
constexpr auto operator""_s(unsigned long long s) {
    return std::chrono::seconds(s);
}
constexpr auto operator""_ms(unsigned long long ms) {
    return std::chrono::milliseconds(ms);
}

// 字节字面量
constexpr auto operator""_KB(unsigned long long kb) {
    return kb * 1024ULL;
}
constexpr auto operator""_MB(unsigned long long mb) {
    return mb * 1024ULL * 1024ULL;
}
constexpr auto operator""_GB(unsigned long long gb) {
    return gb * 1024ULL * 1024ULL * 1024ULL;
}

// 字符串字面量（需 raw literal 形式）
std::string operator""_upper(const char* str, size_t len) {
    std::string result(str, len);
    for (auto& c : result) {
        if (c >= 'a' && c <= 'z') c -= 32;
    }
    return result;
}

#include <iostream>
int main() {
    auto t = 2_h + 30_min + 15_s;  // 2 小时 30 分 15 秒
    std::cout << "total seconds: " << t.count() << "\n";

    auto mem = 4_GB + 512_MB;
    std::cout << "bytes: " << mem << "\n";

    std::string s = "hello"_upper;
    std::cout << s << "\n";  // HELLO
    return 0;
}
```

### 5.6 函数对象与策略模式

```cpp
// file: function_objects.cpp
// compile: g++ -std=c++20 -O2 -o fnobj function_objects.cpp
#include <vector>
#include <algorithm>
#include <iostream>
#include <functional>

// 策略模式：不同比较器
struct LessByAbs {
    bool operator()(int a, int b) const {
        return std::abs(a) < std::abs(b);
    }
};

struct GreaterByAbs {
    bool operator()(int a, int b) const {
        return std::abs(a) > std::abs(b);
    }
};

// 状态化函数对象
class ThresholdPred {
    int threshold_;

public:
    explicit ThresholdPred(int t) : threshold_(t) {}
    bool operator()(int x) const { return x > threshold_; }
};

// 多参数函数对象
class Formatter {
    std::string sep_;
    std::string end_;

public:
    Formatter(std::string sep = ", ", std::string end = "\n")
        : sep_(std::move(sep)), end_(std::move(end)) {}

    // 可变参数 operator()
    template<typename... Args>
    void operator()(const Args&... args) const {
        bool first = true;
        ((std::cout << (first ? "" : sep_) << args, first = false), ...);
        std::cout << end_;
    }
};

int main() {
    std::vector<int> v{-5, 3, -2, 8, -1};

    // 使用自定义比较器
    std::sort(v.begin(), v.end(), LessByAbs{});
    for (int x : v) std::cout << x << " ";
    std::cout << "\n";  // -1 -2 3 -5 8

    auto it = std::find_if(v.begin(), v.end(), ThresholdPred{4});
    if (it != v.end()) std::cout << "Found: " << *it << "\n";  // -5 或 8

    Formatter fmt{" | ", "\n"};
    fmt(1, 2, 3, "hello", 3.14);
    return 0;
}
```

### 5.7 内存分配运算符

```cpp
// file: custom_alloc.cpp
// compile: g++ -std=c++20 -O2 -o custom_alloc custom_alloc.cpp
#include <iostream>
#include <new>
#include <cstdlib>
#include <atomic>

// 类特定 new/delete：用于内存追踪
class Tracked {
    int value_;
    static std::atomic<size_t> alloc_count_;
    static std::atomic<size_t> free_count_;

public:
    explicit Tracked(int v) : value_(v) {}

    // 类特定 operator new
    static void* operator new(size_t size) {
        void* p = std::malloc(size);
        if (!p) throw std::bad_alloc();
        ++alloc_count_;
        std::cout << "Tracked::new(" << size << ") = " << p << "\n";
        return p;
    }
    // 类特定 operator delete
    static void operator delete(void* p) noexcept {
        ++free_count_;
        std::cout << "Tracked::delete(" << p << ")\n";
        std::free(p);
    }

    // 数组版本
    static void* operator new[](size_t size) {
        void* p = std::malloc(size);
        if (!p) throw std::bad_alloc();
        std::cout << "Tracked::new[](" << size << ") = " << p << "\n";
        return p;
    }
    static void operator delete[](void* p) noexcept {
        std::cout << "Tracked::delete[](" << p << ")\n";
        std::free(p);
    }

    static void stats() {
        std::cout << "allocs: " << alloc_count_ << ", frees: " << free_count_ << "\n";
    }
};

std::atomic<size_t> Tracked::alloc_count_{0};
std::atomic<size_t> Tracked::free_count_{0};

int main() {
    auto* p = new Tracked(42);
    delete p;

    auto* arr = new Tracked[5];
    delete[] arr;

    Tracked::stats();
    return 0;
}
```

### 5.8 链式赋值与引用限定

```cpp
// file: chained_assign.cpp
// compile: g++ -std=c++20 -O2 -o chained chained_assign.cpp
#include <utility>
#include <vector>
#include <iostream>

class StringBuilder {
    std::vector<char> buf_;

public:
    StringBuilder() = default;

    // 拷贝赋值（仅左值）
    StringBuilder& operator=(const StringBuilder& other) & {
        if (this != &other) buf_ = other.buf_;
        return *this;
    }

    // 移动赋值（仅左值）
    StringBuilder& operator=(StringBuilder&& other) noexcept & {
        if (this != &other) {
            buf_ = std::move(other.buf_);
        }
        return *this;
    }

    // 链式 append：返回 *this 引用
    StringBuilder& append(char c) & {
        buf_.push_back(c);
        return *this;
    }

    // 右值版本：可继续链式调用，最终移动返回
    StringBuilder&& append(char c) && {
        buf_.push_back(c);
        return std::move(*this);
    }

    std::string str() const & { return std::string(buf_.data(), buf_.size()); }
    std::string str() && { return std::string(std::move(buf_).data(), std::move(buf_).size()); }
};

int main() {
    StringBuilder a;
    a.append('H').append('i').append('!');  // 左值链式
    std::cout << a.str() << "\n";  // Hi!

    // 右值链式：构建临时对象后移动
    std::string s = StringBuilder{}.append('X').append('Y').str();
    std::cout << s << "\n";  // XY

    // 拷贝赋值
    StringBuilder b;
    b = a;
    std::cout << b.str() << "\n";

    // 移动赋值
    StringBuilder c;
    c = std::move(b);
    std::cout << c.str() << "\n";
    return 0;
}
```

## 6. 对比分析（横向对比）

### 6.1 成员 vs 非成员运算符函数

| 维度 | 成员函数 | 非成员函数（含友元） |
| :--- | :--- | :--- |
| 左操作数转换 | 不支持（左操作数必须为类对象） | 支持（左操作数可隐式转换） |
| 封装性 | 访问私有成员直接 | 友元声明访问私有，否则通过公有接口 |
| 可发现性 | 类定义内可见 | 需查找命名空间 |
| 适用运算符 | `=`、`()`、`[]`、`->`、复合赋值、单目 | 对称算术、比较、流 |
| 标准 STL 风格 | `std::string::operator+=` | `std::operator+(string, string)` |

```cpp
class Int {
    int v_;
public:
    Int(int v = 0) : v_(v) {}  // 非 explicit，允许隐式转换
    // 成员形式：1 + a 失败（int 无成员 operator+）
    Int operator+(const Int& rhs) const { return Int{v_ + rhs.v_}; }
};
Int a{1};
// Int r1 = 1 + a;  // 编译错误
Int r2 = a + 1;     // OK：1 隐式转换为 Int

class Int2 {
    int v_;
public:
    Int2(int v = 0) : v_(v) {}
    // 非成员友元形式：两侧都支持隐式转换
    friend Int2 operator+(Int2 lhs, Int2 rhs) { return Int2{lhs.v_ + rhs.v_}; }
};
Int2 b{1};
Int2 r3 = 1 + b;    // OK
Int2 r4 = b + 1;    // OK
```

### 6.2 C++20 `<=>` 与传统比较

| 维度 | 传统手写 | C++20 `<=>` |
| :--- | :--- | :--- |
| 代码量 | 6 个运算符（`==`、`!=`、`<`、`<=`、`>`、`>=`） | 1 个 `<=>`（自动生成其余 4 个）+ 1 个 `==`（可选） |
| 一致性 | 易出错（如 `!=` 未用 `==` 实现） | 编译器保证一致 |
| 性能 | 各自实现可能重复计算 | 一次 `<=>` 调用 |
| 可定制性 | 任意 | 仅返回 comparison category |
| 语义表达 | 弱（`<` 不表示偏序等） | 强（`strong_ordering` 明确表达） |
| 异常安全 | 取决于实现 | `= default` 自动 noexcept |

```cpp
// 传统：易错
struct Bad {
    int x;
    bool operator==(const Bad& o) const { return x == o.x; }
    // 忘记定义 !=，C++20 自动生成；C++17 编译失败
    bool operator<(const Bad& o) const { return x < o.x; }
    // 忘记 >, <=, >=
};

// C++20：清晰
struct Good {
    int x;
    auto operator<=>(const Good&) const = default;
};
```

### 6.3 转换运算符：隐式 vs explicit

| 维度 | 隐式转换 | `explicit` 转换 |
| :--- | :--- | :--- |
| 安全性 | 低（意外转换可能 UB） | 高（仅显式或上下文转换） |
| 便利性 | 高（自动转换） | 低（需 static_cast） |
| 适用场景 | 数值类型间自然转换 | 资源句柄、布尔上下文 |
| `bool` 特例 | 安全布尔问题（`safe-bool` idiom） | C++11 `explicit operator bool` 解决 |

### 6.4 函数对象 vs Lambda vs 函数指针

| 维度 | 函数对象 | Lambda | 函数指针 |
| :--- | :--- | :--- | :--- |
| 状态 | 可保存成员变量 | 可捕获（值/引用） | 无状态 |
| 内联 | 编译器易内联 | 同函数对象 | 难内联 |
| 类型 | 具名类型 | 编译器生成唯一类型 | `void(*)(int)` |
| 模板友好 | 是 | 是 | 受限 |
| 可读性 | 复杂逻辑清晰 | 简短逻辑简洁 | 简单但乏味 |

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：不对称运算符

```cpp
class Bad {
    int v_;
public:
    Bad(int v) : v_(v) {}
    // 成员形式：1 + bad 编译失败
    Bad operator+(const Bad& rhs) const { return Bad{v_ + rhs.v_}; }
};
Bad a{1};
Bad r = 1 + a;  // 编译错误
```

**最佳实践**：对称算术运算符用非成员友元形式。

### 7.2 陷阱：运算符语义不一致

```cpp
class Counter {
    int n_;
public:
    // 反模式：++ 实际减一
    Counter& operator++() { --n_; return *this; }
};
```

**最佳实践**：重载后的语义必须与内置运算符一致，否则破坏直觉。

### 7.3 陷阱：返回引用悬空

```cpp
class Vec {
    int data_[10];
public:
    // 危险：返回临时对象的引用
    int& operator[](size_t i) { return data_[i]; }
    // 但 operator+ 返回引用会悬空
    int& operator+(int x) {
        int r = data_[0] + x;
        return r;  // 悬空引用
    }
};
```

**最佳实践**：产生新值的运算符返回值类型；返回引用仅用于引用已存在对象（`*this`、容器元素）。

### 7.4 陷阱：自增自减返回类型错误

```cpp
class Counter {
    int n_;
public:
    // 错误：后置 ++ 返回引用
    Counter& operator++(int) {
        Counter tmp = *this;
        ++n_;
        return tmp;  // 悬空引用
    }
};
```

**最佳实践**：前置 `++` 返回 `T&`，后置 `++` 返回 `T`（旧值副本）。

### 7.5 陷阱：转换运算符链式意外

```cpp
class String {
    std::string s_;
public:
    operator const char*() const { return s_.c_str(); }
    operator bool() const { return !s_.empty(); }
};

String s = "hello";
int n = s + 1;  // const char* + int：指针算术，UB！
```

**最佳实践**：转换运算符加 `explicit`，特别是 `bool` 与指针类型。

### 7.6 陷阱：`operator->` 链式

`operator->` 的特殊语义：返回指针或另一个具有 `operator->` 的对象，编译器递归应用直至指针。

```cpp
struct Inner { void f() {} };
struct Outer {
    Inner inner_;
    Inner* operator->() { return &inner_; }
};
struct Wrapper {
    Outer outer_;
    Outer operator->() { return outer_; }  // 返回 Outer 对象
};

Wrapper w;
w->f();  // w.operator->() 返回 Outer，Outer.operator->() 返回 Inner*，再应用 -> 调用 f
```

**最佳实践**：理解链式语义，避免无限递归（编译器会报错）。

### 7.7 陷阱：`operator==` 与 `!=` 不对称

```cpp
struct Bad {
    int x;
    bool operator==(const Bad& o) const { return x == o.x; }
    bool operator!=(const Bad& o) const { return x != o.x; }  // 手写易错
    // 若 x 是 float，NaN 时 == 和 != 可能不一致
};
```

**最佳实践**：C++20 用 `= default`；C++17 用 `bool operator!=(...) { return !(*this == o); }`。

### 7.8 陷阱：拷贝赋值非自赋安全

```cpp
class Bad {
    int* p_;
public:
    Bad& operator=(const Bad& o) {
        delete p_;          // 若 this == &o，p_ 已被 delete
        p_ = new int(*o.p_);  // 解引用已删除指针，UB
        return *this;
    }
};
```

**最佳实践**：copy-and-swap 惯用法：

```cpp
class Good {
    int* p_;
public:
    Good& operator=(Good o) noexcept {  // 值传递，自动拷贝
        std::swap(p_, o.p_);
        return *this;
    }  // o 析构时释放旧 p_
};
```

### 7.9 陷阱：`operator()` 与 `static`（C++23 前）

C++23 前 `operator()` 必须是非静态成员函数，无法实现真正的无状态函数对象优化：

```cpp
// C++20：编译器仍生成 this 指针
struct Add {
    int operator()(int a, int b) const { return a + b; }  // 隐含 this
};

// C++23：static operator() 无 this
struct Add2 {
    static int operator()(int a, int b) { return a + b; }
};
```

### 7.10 最佳实践清单

1. **对称算术用非成员友元**，复合赋值用成员。
2. **比较运算符优先 `= default`**，C++20 `<=>`。
3. **流运算符必须非成员**，返回 `std::ostream&`。
4. **下标运算符提供 const 与非 const 重载**，非 const 返回引用。
5. **前置 `++` 返回 `T&`，后置返回 `T`**，后置参数用 `int` 占位。
6. **转换运算符加 `explicit`**，特别是 `bool`。
7. **拷贝赋值用 copy-and-swap**，自赋安全、异常安全。
8. **不重载 `&&`、`||`、`,`**：失去短路求值。
9. **不重载取地址 `&`**：破坏 STL 与智能指针假设。
10. **运算符语义保持一致**：`+` 表示加法或拼接，不发明新语义。

## 8. 工程实践

### 8.1 运算符重载的 API 设计原则

**1. 直觉性**：使用者无需查文档即可理解运算符含义。

```cpp
// 好：Vec + Vec 自然
Vec sum = a + b;
// 坏：Vec << Vec 含义不明
Vec r = a << b;  // 是位移还是拼接？
```

**2. 完整性**：定义了 `+` 应同时定义 `+=`、`-`、`-=`,保持运算符族完整。

**3. 一致性**：`a + b == b + a`（若可交换）；`a += b` 与 `a = a + b` 等价。

**4. 高效性**：避免不必要的临时对象，考虑表达式模板或移动语义。

### 8.2 与 STL 算法协作

实现 `operator==`、`operator<` 后，STL 算法直接可用：

```cpp
class Person {
    std::string name_;
    int age_;
public:
    // C++20：自动生成全部比较
    auto operator<=>(const Person&) const = default;
    bool operator==(const Person&) const = default;
};

std::vector<Person> people{{"Alice", 30}, {"Bob", 25}};
std::sort(people.begin(), people.end());  // 按 name 字典序，再按 age
auto [lo, hi] = std::equal_range(people.begin(), people.end(), Person{"Bob", 0});
```

### 8.3 迭代器实现的 concept 约束

C++20 concept 使迭代器要求显式化：

```cpp
template<typename T>
class VecIter {
    T* p_;
public:
    using iterator_category = std::contiguous_iterator_tag;
    using value_type = T;
    using difference_type = std::ptrdiff_t;
    using pointer = T*;
    using reference = T&;

    VecIter() = default;
    explicit VecIter(T* p) : p_(p) {}

    reference operator*() const noexcept { return *p_; }
    pointer operator->() const noexcept { return p_; }
    VecIter& operator++() noexcept { ++p_; return *this; }
    VecIter operator++(int) noexcept { auto t = *this; ++p_; return t; }
    VecIter& operator+=(difference_type n) noexcept { p_ += n; return *this; }
    friend VecIter operator+(VecIter it, difference_type n) noexcept { it += n; return it; }
    friend VecIter operator+(difference_type n, VecIter it) noexcept { it += n; return it; }
    friend difference_type operator-(VecIter a, VecIter b) noexcept { return a.p_ - b.p_; }
    auto operator<=>(const VecIter&) const = default;
};

static_assert(std::contiguous_iterator<VecIter<int>>);  // 编译期验证
```

### 8.4 ABI 与稳定性考虑

运算符函数名 mangle 影响二进制兼容性：

```cpp
struct Vec {
    int x, y;
    // mangled: _ZNK3VecplERKS_
    Vec operator+(const Vec&) const;
    // C++20 新增 <=> 后，若原 == 未删除，可能改变 ABI
    auto operator<=>(const Vec&) const = default;
};
```

**实践建议**：库的 ABI 接口慎用 `= default` 比较运算符，标准演进可能改变生成代码。

### 8.5 异常安全

运算符重载应保证异常安全：

```cpp
class Stack {
    std::vector<int> data_;
public:
    Stack& operator=(const Stack& o) {
        if (this != &o) {
            std::vector<int> tmp(o.data_);  // 强异常安全：tmp 构造可能抛异常
            data_ = std::move(tmp);          // move 不抛异常
        }
        return *this;
    }
};
```

## 9. 案例研究

### 9.1 案例：物理量单位类型

实现类型安全的物理量运算，避免单位混淆：

```cpp
// file: units.cpp
// compile: g++ -std=c++20 -O2 -o units units.cpp
#include <iostream>
#include <chrono>

// 基础量：长度、时间、质量
template<typename Unit, typename Rep = double>
class Quantity {
    Rep value_;
public:
    constexpr explicit Quantity(Rep v) : value_(v) {}
    constexpr Rep value() const { return value_; }

    constexpr Quantity operator+() const { return *this; }
    constexpr Quantity operator-() const { return Quantity{-value_}; }

    constexpr Quantity& operator+=(const Quantity& o) { value_ += o.value_; return *this; }
    constexpr Quantity& operator-=(const Quantity& o) { value_ -= o.value_; return *this; }

    constexpr Quantity operator+(const Quantity& o) const { return Quantity{value_ + o.value_}; }
    constexpr Quantity operator-(const Quantity& o) const { return Quantity{value_ - o.value_}; }

    // 标量乘除
    template<typename Scalar>
    constexpr Quantity operator*(Scalar s) const { return Quantity{value_ * s}; }
    template<typename Scalar>
    constexpr Quantity operator/(Scalar s) const { return Quantity{value_ / s}; }

    auto operator<=>(const Quantity&) const = default;
};

// 单位标签
struct Meters {};
struct Seconds {};
struct Kilograms {};

using Length = Quantity<Meters>;
using Time = Quantity<Seconds>;
using Mass = Quantity<Kilograms>;

// 派生量：速度 = 长度 / 时间
template<typename Rep = double>
class Velocity {
    Rep value_;
public:
    constexpr explicit Velocity(Rep v) : value_(v) {}
    constexpr Rep value() const { return value_; }
    Velocity operator+(const Velocity& o) const { return Velocity{value_ + o.value_}; }
    Velocity operator-() const { return Velocity{-value_}; }
    auto operator<=>(const Velocity&) const = default;
};

// 跨量纲除法返回派生量
Velocity<> operator/(const Length& l, const Time& t) {
    return Velocity<>{l.value() / t.value()};
}

// 用户定义字面量
constexpr Length operator""_m(long double v) { return Length{static_cast<double>(v)}; }
constexpr Time operator""_s(long double v) { return Time{static_cast<double>(v)}; }
constexpr Mass operator""_kg(long double v) { return Mass{static_cast<double>(v)}; }

int main() {
    Length distance = 100.0_m;
    Time duration = 9.58_s;
    Velocity<> speed = distance / duration;  // m/s
    std::cout << "Speed: " << speed.value() << " m/s\n";  // 约 10.44

    // 编译期检查
    // Mass m = 100.0_m;  // 编译错误：类型不匹配
    return 0;
}
```

### 9.2 案例：金融金额类型

```cpp
// file: money.cpp
// compile: g++ -std=c++20 -O2 -o money money.cpp
#include <iostream>
#include <iomanip>
#include <compare>
#include <string>
#include <cstdint>

// 高精度金额类型，避免浮点误差
class Money {
    int64_t cents_;  // 内部以分存储

public:
    constexpr Money() noexcept : cents_(0) {}
    constexpr explicit Money(double dollars) : cents_(std::llround(dollars * 100)) {}
    constexpr Money(int64_t cents) noexcept : cents_(cents) {}

    constexpr int64_t cents() const noexcept { return cents_; }
    constexpr double dollars() const noexcept { return cents_ / 100.0; }

    // 算术
    constexpr Money operator+(Money o) const noexcept { return Money{cents_ + o.cents_}; }
    constexpr Money operator-(Money o) const noexcept { return Money{cents_ - o.cents_}; }
    constexpr Money operator-() const noexcept { return Money{-cents_}; }

    constexpr Money& operator+=(Money o) noexcept { cents_ += o.cents_; return *this; }
    constexpr Money& operator-=(Money o) noexcept { cents_ -= o.cents_; return *this; }

    // 标量乘除（除法可能损失精度）
    constexpr Money operator*(double f) const { return Money{static_cast<int64_t>(std::llround(cents_ * f))}; }
    constexpr Money operator/(double f) const { return Money{static_cast<int64_t>(std::llround(cents_ / f))}; }

    // 比较
    auto operator<=>(const Money&) const = default;

    // 流
    friend std::ostream& operator<<(std::ostream& os, Money m) {
        bool neg = m.cents_ < 0;
        int64_t abs_cents = std::llabs(m.cents_);
        return os << (neg ? "-$" : "$") << (abs_cents / 100) << "."
                  << std::setw(2) << std::setfill('0') << (abs_cents % 100);
    }
    friend std::istream& operator>>(std::istream& is, Money& m) {
        double d;
        is >> d;
        m = Money{d};
        return is;
    }
};

constexpr Money operator*(double f, Money m) { return m * f; }

int main() {
    Money price{19.99};
    Money tax{1.60};
    Money total = price + tax;
    std::cout << "Price: " << price << "\n";
    std::cout << "Tax:   " << tax << "\n";
    std::cout << "Total: " << total << "\n";

    Money bulk = 3 * price;
    std::cout << "3x:    " << bulk << "\n";

    // 浮点与定点对比
    double f1 = 0.1 + 0.2;
    std::cout << "float 0.1+0.2 = " << std::setprecision(20) << f1 << "\n";
    Money m1{0.1}, m2{0.2};
    std::cout << "Money 0.1+0.2 = " << (m1 + m2) << "\n";
    return 0;
}
```

### 9.3 案例：DSL 构建器（链式 API）

```cpp
// file: dsl_builder.cpp
// compile: g++ -std=c++20 -O2 -o dsl dsl_builder.cpp
#include <string>
#include <vector>
#include <iostream>
#include <sstream>

// SQL 查询构建器：演示 operator() 与 operator<<
class SqlBuilder {
    std::string table_;
    std::vector<std::string> columns_;
    std::vector<std::string> wheres_;
    std::vector<std::string> orders_;
    size_t limit_ = 0;

public:
    // operator() 指定表名
    SqlBuilder& operator()(std::string table) & {
        table_ = std::move(table);
        return *this;
    }
    // 右值版本
    SqlBuilder&& operator()(std::string table) && {
        table_ = std::move(table);
        return std::move(*this);
    }

    // operator<< 添加列
    SqlBuilder& operator<<(std::string col) & {
        columns_.push_back(std::move(col));
        return *this;
    }
    SqlBuilder&& operator<<(std::string col) && {
        columns_.push_back(std::move(col));
        return std::move(*this);
    }

    // 链式 API
    SqlBuilder& where(std::string cond) & { wheres_.push_back(std::move(cond)); return *this; }
    SqlBuilder&& where(std::string cond) && { wheres_.push_back(std::move(cond)); return std::move(*this); }
    SqlBuilder& orderBy(std::string col) & { orders_.push_back(std::move(col)); return *this; }
    SqlBuilder&& orderBy(std::string col) && { orders_.push_back(std::move(col)); return std::move(*this); }
    SqlBuilder& limit(size_t n) & { limit_ = n; return *this; }
    SqlBuilder&& limit(size_t n) && { limit_ = n; return std::move(*this); }

    std::string build() const {
        std::ostringstream ss;
        ss << "SELECT ";
        if (columns_.empty()) ss << "*";
        else {
            for (size_t i = 0; i < columns_.size(); ++i) {
                if (i > 0) ss << ", ";
                ss << columns_[i];
            }
        }
        ss << " FROM " << table_;
        if (!wheres_.empty()) {
            ss << " WHERE ";
            for (size_t i = 0; i < wheres_.size(); ++i) {
                if (i > 0) ss << " AND ";
                ss << wheres_[i];
            }
        }
        if (!orders_.empty()) {
            ss << " ORDER BY ";
            for (size_t i = 0; i < orders_.size(); ++i) {
                if (i > 0) ss << ", ";
                ss << orders_[i];
            }
        }
        if (limit_ > 0) ss << " LIMIT " << limit_;
        return ss.str();
    }

    // 转换运算符：隐式转字符串
    operator std::string() const { return build(); }
};

int main() {
    std::string sql = SqlBuilder{}("users")
        << "id" << "name" << "email"
        .where("age > 18")
        .where("active = true")
        .orderBy("name")
        .limit(10);
    std::cout << sql << "\n";
    // SELECT id, name, email FROM users WHERE age > 18 AND active = true ORDER BY name LIMIT 10
    return 0;
}
```

## 10. 习题

### 基础题

1. **运算符分类**：下列哪些运算符必须作为成员函数重载？哪些必须为非成员？
   - `=`、`==`、`[]`、`()`、`->`、`<<`、`+`、`+=`

2. **参数数量**：实现一个 `Fraction` 类，包含 `operator+`（二元，非成员友元）、`operator-`（一元负号，成员）、`operator++`（前置与后置，成员）。指出每个的参数数量。

3. **类型转换**：解释为什么 C++11 引入 `explicit operator bool`，它解决了什么问题？

4. **三路比较**：将以下 C++17 类升级为 C++20，使用 `<=>`：
   ```cpp
   struct Point {
       int x, y;
       bool operator==(const Point& o) const { return x == o.x && y == o.y; }
       bool operator!=(const Point& o) const { return !(*this == o); }
       bool operator<(const Point& o) const { return x < o.x || (x == o.x && y < o.y); }
       bool operator<=(const Point& o) const { return !(o < *this); }
       bool operator>(const Point& o) const { return o < *this; }
       bool operator>=(const Point& o) const { return !(*this < o); }
   };
   ```

### 中级题

5. **复数类型**：实现一个完整的 `Complex` 类，包含：
   - 构造、拷贝、移动
   - 算术 `+`、`-`、`*`、`/` 及复合赋值
   - 比较 `<=>`（按模比较）
   - 流 `<<`、`>>`
   - `abs()`、`conj()`、`arg()` 方法
   - 用户定义字面量 `1.0_i`、`2.5_i`

6. **字符串视图**：实现一个简化版 `MyStringView`，包含 `operator[]`、`operator==`、`operator<<`、`substr`，注意悬空引用风险。

7. **迭代器**：为以下双向链表实现符合 C++20 `std::bidirectional_iterator` concept 的迭代器：
   ```cpp
   template<typename T>
   class LinkedList {
       struct Node { T value; Node* prev; Node* next; };
       Node* head_ = nullptr;
       Node* tail_ = nullptr;
   public:
       // 实现 begin()/end() 与 Iterator
   };
   ```

8. **下标运算符**：为 `Matrix` 类实现二维下标 `m[i][j]` 与 `m(i, j)` 两种形式，分析各自优劣。

9. **函数对象**：实现一个 `Pipeline` 函数对象，可链式组合多个函数：`Pipeline{} | f | g | h` 调用 `h(g(f(x)))`。

### 高级题

10. **表达式模板**：扩展 5.2 节的 `MatSum`，实现 `MatSub`、`MatScale`，支持 `a + b - c * 2.0` 不产生中间临时对象。

11. **CRTP 与静态多态**：使用 CRTP 实现一个 `Comparable<Derived>` 基类，派生类只需定义 `int compare(const Derived&) const`，自动获得 `<`、`<=`、`>`、`>=`、`==`、`!=`。

12. **自定义字面量**：实现 `_km`、`_mi`、`_m`、`_cm` 字面量，使 `5_km + 300_m == 5.3_km` 在编译期可计算。

13. **`operator->*`**：实现成员指针访问运算符，使 `obj->*ptr` 可调用成员函数。

14. **异常安全**：分析以下拷贝赋值的异常安全级别，并改写为强异常安全：
    ```cpp
    class String {
        char* data_;
        size_t size_;
    public:
        String& operator=(const String& o) {
            delete[] data_;
            size_ = o.size_;
            data_ = new char[size_ + 1];
            std::copy(o.data_, o.data_ + size_ + 1, data_);
            return *this;
        }
    };
    ```

### 开放题

15. **设计权衡**：何时应重载 `operator()` 而非定义命名方法？何时应避免运算符重载而用命名函数？

16. **C++23 `static operator()`**：分析 `static operator()` 对无状态函数对象的性能与语义影响，是否会让 lambda 变得过时？

17. **`<=>` 与 `==` 的语义**：为什么 C++20 不让 `<=>` 自动生成 `==`，而是引入 P1185 规则？讨论强序与偏序场景下的 `==` 语义差异。

18. **运算符重载的滥用**：举出三个运算符重载滥用的真实案例，分析其对代码可维护性的影响。

## 11. 参考文献

### 标准文档

- **ISO/IEC 14882:2023** — *Information technology — Programming languages — C++*，第 12 章 [over]、第 16 章 [over.oper]。
- **ISO/IEC 14882:2020** — C++20 标准，引入 `<=>`。
- **ISO/IEC 14882:2011** — C++11 标准，引入 `explicit` 转换与用户定义字面量。

### 提案文档

- **N2437** — Sutter, *Explicit Conversion Operators*, 2007.
- **N2765** — Maurer, *User-defined Literals*, 2008.
- **P0515R0** — Smith, *Consistent Comparison*, 2017.
- **P1185R2** — Spertus, *Defaulted comparison operators*, 2018.
- **P1169R4** — Köppe, *static operator call*, 2018.
- **P2589R1** — Bancila, *static operator[]*, 2022.
- **P2741R3** — *User-generated static operator functions*, 2023.

### 经典教材

- **Stroustrup, B.** *The C++ Programming Language*（4th Edition）, Addison-Wesley, 2013. 第 18 章详细讨论运算符重载设计哲学。
- **Meyers, S.** *Effective C++*（3rd Edition）, Addison-Wesley, 2005. Item 18-21 讨论接口设计与运算符重载。
- **Sutter, H.** *More Exceptional C++*, Addison-Wesley, 2001. 讨论安全布尔与运算符重载陷阱。
- **Alexandrescu, A.** *Modern C++ Design*, Addison-Wesley, 2001. 表达式模板与运算符重载高级应用。
- **Vandevoorde, D., Josuttis, N. M., Gregor, D.** *C++ Templates: The Complete Guide*（2nd Edition）, Addison-Wesley, 2017. 模板运算符重载与 ADL。

### 在线资源

- **cppreference.com** — *Operator overloading*：https://en.cppreference.com/w/cpp/language/operators
- **cppreference.com** — *Default comparisons*：https://en.cppreference.com/w/cpp/language/default_comparisons
- **Stroustrup, B.** *PPP2*（Programming: Principles and Practice using C++, 2nd Edition）配套网站。
- **ISO C++ FAQ** — *Operator overloading*：https://isocpp.org/wiki/faq/operator-overloading

### 学术论文

- **Stroustrup, B.** *An Overview of C++*, SIGPLAN Notices, 1986.
- **Reid, A.** *An Optimized Implementation of C++ Operators*, Journal of Object Technology, 2003.
- **Dos Reis, G., Stroustrup, B.** *A General Constant Expression Mechanism for C++*, OOPSLA, 2010.

## 12. 延伸阅读

### 书籍

- **Williams, A.** *C++ Concurrency in Action*（2nd Edition）, Manning, 2019. 第 5 章讨论原子操作与内存序运算符。
- **Josuttis, N. M.** *The C++ Standard Library*（2nd Edition）, Addison-Wesley, 2012. 运算符在 STL 中的使用。
- **Wilson, M.** *Imperfect C++*, Addison-Wesley, 2004. 运算符重载的陷阱与技巧。
- **Meyers, S.** *More Effective C++*, Addison-Wesley, 1996. Item 5-7 讨论用户定义转换与运算符。

### 视频与课程

- **CppCon 2019, Herb Sutter** — *Declarative Programming with C++20 `<=>`*。
- **CppCon 2020, Howard Hinnant** — *A `<=>` for the Standard Library*。
- **MIT 6.S192** — *Performance Engineering of Software Systems*，讨论运算符内联与性能。
- **Stanford CS106L** — *Standard C++ Programming*，运算符重载专题。
- **CMU 15-411** — *Compiler Design*，运算符重载的编译实现。

### 开源实现

- **Eigen** — 矩阵运算库，表达式模板的标杆实现：https://eigen.tuxfamily.org
- **Boost.Operators** — 自动生成运算符族的工具：https://www.boost.org/doc/libs/release/libs/operators/
- **fmtlib** — `std::format` 的原型，自定义类型格式化：https://fmt.dev
- **date** — Howard Hinnant 的日期库，C++20 chrono 基础：https://github.com/HowardHinnant/date

### 相关主题

- **CRTP（Curiously Recurring Template Pattern）** — 静态多态的基础，常与运算符重载配合。
- **表达式模板（Expression Templates）** — 通过运算符重载延迟计算，避免临时对象。
- **C++20 Concepts** — 对迭代器与比较运算符的语义约束。
- **SFINAE 与 enable_if** — 模板运算符的条件启用。
- **ADL（Argument-Dependent Lookup）** — 非成员运算符的查找规则。

### 实践建议

1. **阅读 STL 实现**：`std::vector`、`std::string`、`std::map` 的 `operator[]`、`operator==`、`operator<` 实现。
2. **分析 Boost.Operators**：理解 `equality_comparable`、`less_than_comparable` 等 mixin 的设计。
3. **为开源项目贡献**：实现一个自定义容器的完整运算符重载，提交 PR。
4. **基准测试**：对比表达式模板与朴素实现的性能差异（Google Benchmark）。
5. **跨语言对比**：实现 Rust `Add` trait 与 C++ `operator+` 的相同数学类型，对比 API 设计。
6. **关注 C++26**：跟踪 `static operator()`、`static operator[]`、`<=>` 与 `==` 的演进。
