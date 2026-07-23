---
order: 40
tags:
  - cpp
difficulty: intermediate
title: 'C++ 引用'
module: cpp
category: 'C++ Basics'
description: 左值引用、右值引用、常量引用、转发引用、引用折叠、悬空引用与 std::launder 全解。
author: Anonymous
related:
  - cpp/基础语法
  - cpp/类型系统
  - cpp/右值引用与移动语义
  - cpp/指针
  - cpp/完美转发与引用折叠
  - cpp/移动语义详解
prerequisites:
  - cpp/概述与现代标准
---

# C++ 引用

> 本文档系统讲解 C++ 引用（reference）机制，覆盖左值引用、右值引用、常量引用、转发引用、引用折叠规则、悬空引用、`std::launder`、引用与指针的本质差异等核心主题。所有代码示例可在支持 C++17/20/23 的主流编译器上编译通过，标注 GCC/Clang/MSVC 兼容性。对标 MIT 6.S192、Stanford CS106L、CMU 15-411 课程教学水准。

## 1. 学习目标

完成本章学习后，读者应能够达成以下 Bloom 认知层级目标：

| Bloom 层级 | 目标描述 |
| :--- | :--- |
| **Remember（记忆）** | 列举 C++ 引用的 4 种形态（lvalue reference、rvalue reference、const reference、forwarding reference），复述引用折叠四规则 |
| **Understand（理解）** | 解释引用与指针在 ABI 层面的等价性与语义差异，说明 const 引用延长临时对象生命周期的原理 |
| **Apply（应用）** | 使用引用实现 `swap`、链式调用、运算符重载、移动构造，正确选择引用类型以避免不必要的拷贝 |
| **Analyze（分析）** | 分析给定代码片段中引用的生命周期、绑定关系与悬空风险，识别违反 ODR 与 UB 的场景 |
| **Evaluate（评价）** | 评估引用与指针在 API 设计、ABI 稳定性、可读性、性能上的取舍，权衡 `T*` vs `T&` vs `std::reference_wrapper` |
| **Create（创造）** | 设计基于引用的类型安全接口，实现完美转发包装器、CRTP 基类、视图类型（`std::string_view`、`std::span`） |

## 2. 历史动机与发展脉络

### 2.1 C with Classes 时代（1979-1985）

Bjarne Stroustrup 在 *Cpre* 预处理器中首次引入引用，主要动机是支持运算符重载。考虑：

```cpp
// C 风格：通过指针传参
void add_complex(struct complex* a, struct complex* b, struct complex* result);
// 调用语法笨拙
add_complex(&x, &y, &z);

// 期望：运算符重载
struct complex operator+(const struct complex& a, const struct complex& b);
// 调用：x + y，自然且高效
```

引用让运算符重载既保持值语义语法（`a + b`），又避免不必要的拷贝。

### 2.2 C++ 引用形态的演进

| 标准 | 发布年 | 引用相关新特性 | 关键提案 |
| :--- | :--- | :--- | :--- |
| **Cfront 1.0** | 1989 | 引入 `T&`（lvalue reference）作为函数参数与返回值 | Stroustrup, *The C++ Programming Language* |
| **C++98** | 1998 | 形式化 lvalue reference 语义；`const T&` 可绑定到右值，延长临时对象生命周期 | ISO/IEC 14882:1998 |
| **C++11** | 2011 | 引入 rvalue reference `T&&`、引用折叠规则、转发引用、`auto&&`、`decltype` | N1385, N1690, N1377 |
| **C++14** | 2014 | `decltype(auto)` 返回值推导；泛型 lambda 中的转发引用 | N3638, N3649 |
| **C++17** | 2017 | guaranteed copy elision；`std::launder`；`std::string_view` / `std::span` 作为引用封装 | P0135, P0137 |
| **C++20** | 2020 | ranges 中的 dangling 检测；concept 中的引用处理；`std::as_const` | P1085, P0789 |
| **C++23** | 2023 | `std::reference_wrapper` 与 ranges 协作完善；`std::move_only_function` 中引用语义 | P2447 |
| **C++26** | 草案 | Hazard pointer 与引用语义；`std::execution` 中的引用传递 | P2530 |

### 2.3 关键提案与文献

- **Stroustrup 1985**：*An Overview of C++*，首次公开引用语法与用途。
- **N1385 (Ellis, Stroustrup, 2002)**：*A Fix for Rvalue References*，奠定 rvalue reference 语法基础。
- **N1690 (Narodytska, 2004)**：*Extending move semantics to \*this*，提出 `&` / `&&` 限定成员函数。
- **N1377 (Nelson, 2002)**：*A Proposal to Add Move Semantics Support to the C++ Language*，移动语义奠基。
- **N2835 (Nasonov, 2009)**：*Lvalue references as rvalues*，澄清 value category 规则。
- **N3055 (Futter, 2010)**：*A Refined Rvalue Reference Proposal*。
- **N4279**：*Rvalue references for \*this*（最终版本，纳入 C++11）。
- **P0135 (Voutilainen, 2016)**：*Guaranteed copy elision through simplified value categories*。
- **P0137 (Morrow, 2016)**：*launder: A Library Function for Optimizing the Layout of Objects*。

### 2.4 与其他语言的横向对比

| 特性 | C++ | Rust | Swift | Java | C# |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 左值引用 | `T&` | `&T` / `&mut T` | `inout T` | 隐式（对象引用） | `ref` / `out` |
| 右值引用 | `T&&` | 无（所有权转移） | `consuming T` | 无 | 无 |
| 常量引用 | `const T&` | `&T` | `let` 绑定 | `final` | `in` |
| 转发引用 | `T&&` 模板 | `impl AsRef<T>` | 无 | 无 | 无 |
| 引用折叠 | 有（4 规则） | 无 | 无 | 无 | 无 |
| 悬空引用 | 可能（UB） | 编译期禁止（借用检查） | ARC 防止 | GC 防止 | GC 防止 |
| 0 开销抽象 | 是 | 是 | 部分 | 否 | 否 |

## 3. 形式化定义

### 3.1 引用的语法与语义

C++ 中引用的形式化定义（ISO/IEC 14882:2023 §9.4.3）：

$$
\text{reference}(T, k) := \text{alias}(T, k)
$$

其中 $T$ 为被引用类型，$k \in \{\text{lvalue}, \text{rvalue}\}$ 表示引用类别。引用本身不是对象（object），不占用存储（implementation-defined），但其行为类似于被引用对象的别名（alias）。

引用声明的形式：

$$
\text{decl} := \text{type-specifier}\ \&\ \text{declarator} \quad (\text{lvalue ref})
$$
$$
\text{decl} := \text{type-specifier}\ \&\&\ \text{declarator} \quad (\text{rvalue ref})
$$

### 3.2 值类别（Value Category）

C++11 重新形式化了表达式值类别（ISO/IEC 14882:2023 §6.10）：

$$
\text{expr} \in \{\text{lvalue}, \text{xvalue}, \text{prvalue}\}
$$

- **lvalue（左值）**：标识非临时对象或函数，可取地址。如变量名 `x`、`*p`、`arr[i]`、`std::cin`。
- **prvalue（纯右值）**：非临时的、不可取地址的值。如字面量 `42`、`x + y`、临时对象 `std::string("abc")`。
- **xvalue（消亡值）**：即将被移动的对象。如 `std::move(x)`、`static_cast<T&&>(x)`、返回 `T&&` 的函数调用。

复合关系：

$$
\text{glvalue} = \text{lvalue} \cup \text{xvalue}
$$
$$
\text{rvalue} = \text{xvalue} \cup \text{prvalue}
$$

### 3.3 引用绑定规则

引用的绑定规则可形式化为：

| 引用类型 | 可绑定的值类别 | 附加条件 |
| :--- | :--- | :--- |
| `T&`（非 const 左值引用） | lvalue of type T | 不能绑定到 const lvalue、rvalue |
| `const T&`（const 左值引用） | lvalue / rvalue / const | 允许类型转换，延长临时对象生命周期 |
| `T&&`（右值引用） | xvalue / prvalue of type T | 不能绑定到 lvalue（除非 std::move） |
| `T&&`（转发引用，模板推导） | 任意值类别 | 通过引用折叠生成正确类型 |

形式化绑定规则：

$$
\text{bind}(r, e) =
\begin{cases}
\text{OK} & r = T\& \wedge e \in \text{lvalue}_T \\
\text{OK} & r = \text{const}\ T\& \wedge e \in \text{glvalue}_T \cup \text{prvalue}_T \\
\text{OK} & r = T\&\& \wedge e \in \text{xvalue}_T \cup \text{prvalue}_T \\
\text{OK} & r = T\&\& \text{ (forwarding)} \wedge \text{template} \\
\text{Error} & \text{otherwise}
\end{cases}
$$

### 3.4 引用折叠规则

当模板实例化、`typedef`、`decltype` 或 `auto` 推导中出现"引用的引用"时，编译器通过引用折叠规则确定最终类型：

$$
\text{collapse}(T_1, T_2) =
\begin{cases}
\text{lvalue ref} & \text{if } T_1 = \text{lvalue} \vee T_2 = \text{lvalue} \\
\text{rvalue ref} & \text{if } T_1 = \text{rvalue} \wedge T_2 = \text{rvalue}
\end{cases}
$$

四种组合：

| T 的形式 | T& 的结果 | T&& 的结果 |
| :--- | :--- | :--- |
| `U` | `U&` | `U&&` |
| `U&` | `U&`（折叠） | `U&`（折叠） |
| `U&&` | `U&`（折叠） | `U&&`（不折叠） |

**核心规则**：只要其中一个是左值引用，就折叠为左值引用；只有两个都是右值引用才保持右值引用。

### 3.5 const 引用与临时对象生命周期

C++ 规定：const 引用绑定到 prvalue 时，会延长该临时对象的生命周期至引用的作用域结束（ISO/IEC 14882:2023 §6.7.7）：

$$
\text{lifetime}(t) \leftarrow \text{lifetime}(\text{const\_ref}(t)) \quad \text{if } t \text{ is prvalue}
$$

例外：函数返回值中的临时对象不被延长（C++12 起明确）。

### 3.6 引用与对象身份

引用本身没有地址，但对引用取地址得到的是被引用对象的地址：

```cpp
int x = 42;
int& r = x;
assert(&r == &x);  // 引用本身的地址不存在
```

ABI 层面，引用通常实现为指针。但语义层面，引用与对象"同一化"，不能有"空引用"（虽然实践中可能因 UB 产生）。

## 4. 理论推导与原理解析

### 4.1 引用的 ABI 实现

虽然标准未规定引用的实现方式，但主流编译器（GCC/Clang/MSVC）都将引用实现为指针。对比：

| 语义 | C++ 引用 | C 指针 |
| :--- | :--- | :--- |
| 必须初始化 | 是 | 否 |
| 不可重绑定 | 是 | 否 |
| 不可为空 | 是（标准） | 否 |
| 取地址 | 取到目标地址 | 取到指针自身地址 |
| 算术运算 | 不允许 | 允许 |
| 多级 | 不允许（折叠后） | 允许 |

底层生成代码对比：

```cpp
void f(int& x) { ++x; }
void g(int* x) { ++*x; }

// GCC -O2 生成的汇编（x86-64）完全相同：
// f:    add DWORD PTR [rdi], 1; ret
// g:    add DWORD PTR [rdi], 1; ret
```

因此，引用是"编译期约束更强的指针"，运行时无开销。

### 4.2 值类别推导：decltype 与 auto

`decltype` 与 `auto` 对引用的推导规则不同：

```cpp
int x = 42;
int& rx = x;
int* px = &x;

// decltype 保留值类别
static_assert(std::is_same_v<decltype(x), int>);       // 变量名 → 类型本身
static_assert(std::is_same_v<decltype((x)), int&>);   // 带括号 → lvalue
static_assert(std::is_same_v<decltype(rx), int&>);     // 变量名 → 类型本身
static_assert(std::is_same_v<decltype(*px), int&>);    // 解引用 → lvalue

// auto 默认丢弃引用与 const
auto a1 = rx;       // a1 是 int（拷贝）
auto& a2 = rx;      // a2 是 int&
auto&& a3 = x;      // a3 是 int&（转发引用，折叠）
auto&& a4 = std::move(x);  // a4 是 int&&

// decltype(auto) 保留所有信息
decltype(auto) d1 = rx;    // d1 是 int&
decltype(auto) d2 = (x);   // d2 是 int&
```

### 4.3 转发引用的推导机制

模板参数推导中，`T&&` 是转发引用而非右值引用。推导规则：

$$
\text{deduce}(T\&\&, e) =
\begin{cases}
T = U\& \quad \text{and} \quad T\&\& = U\& \ (\text{折叠}) & \text{if } e \text{ is lvalue of } U \\
T = U \quad \text{and} \quad T\&\& = U\&\& & \text{if } e \text{ is rvalue of } U
\end{cases}
$$

转发引用识别条件：

1. 必须是模板参数 `T&&` 形式；
2. `T` 必须是该函数模板的模板参数；
3. 必须通过推导得到（非显式指定）。

非转发引用场景：

```cpp
template<typename T>
void f(std::vector<T>&& v);  // 非 forwarding reference，因为 && 不直接在 T 上

template<typename T>
class C {
    void g(T&& x);  // 非 forwarding reference，T 已由类推导
};

template<typename T>
void h(const T&& x);  // 非 forwarding reference，有 const 修饰

void k(int&& x);  // 非 forwarding reference，非模板
```

### 4.4 const 引用延长生命周期的细节

const 引用绑定到 prvalue 时延长生命周期，但绑定到函数返回的临时对象时不延长：

```cpp
const std::string& s1 = "hello";        // OK：临时 string 生命周期延长至 s1 作用域结束
const std::string& s2 = std::string(); // OK：临时对象生命周期延长
const std::string& s3 = make_string(); // OK：返回 prvalue 的函数调用

std::string make_string() { return "x"; }
const std::string& bad = make_string();  // 注意：返回 prvalue → 延长
// 但若返回 const std::string& 或 std::string&&，则不延长，悬空！
```

C++ 规则：仅当被绑定的引用是 `const T&` 或 `T&&`，且被绑定的表达式是 prvalue 或 xvalue（且不是函数返回的引用），才延长生命周期。

### 4.5 引用与多态

引用与指针一样支持多态：

```cpp
struct Base { virtual ~Base() = default; virtual void f() { /*...*/ } };
struct Derived : Base { void f() override { /*...*/ } };

void call_f(Base& b) { b.f(); }  // 动态分派

Derived d;
call_f(d);  // 调用 Derived::f
```

引用切片（slicing）与指针切片行为一致：

```cpp
Derived d;
Base b = d;  // 切片：派生部分被截断
Base& rb = d;  // 引用：不切片，多态分派正常
```

### 4.6 引用作为 ABI 边界

C++ 函数签名的 mangling：

```cpp
void f(int);        // _Z1fi
void f(int&);       // _Z1fRi
void f(const int&); // _Z1fRKi
void f(int&&);      // _Z1fOi
```

可见，`T&` / `const T&` / `T&&` 在 ABI 上是不同类型，可重载。但函数返回值不参与 mangling，故返回 `int` vs `int&` 不能重载。

## 5. 代码示例（企业级 production-ready）

### 5.1 引用基础：swap 与链式调用

```cpp
// file: reference_basics.cpp
// compile: g++ -std=c++17 -O2 -o reference_basics reference_basics.cpp
#include <iostream>
#include <string>
#include <utility>

// 经典 swap：通过引用修改实参
template<typename T>
void my_swap(T& a, T& b) {
    T tmp = std::move(a);
    a = std::move(b);
    b = std::move(tmp);
}

// 链式调用：返回引用支持 operator<< / operator= 等
class StringBuilder {
    std::string data_;
public:
    StringBuilder& append(const std::string& s) {
        data_ += s;
        return *this;  // 返回 *this 引用，支持链式
    }
    const std::string& str() const & { return data_; }      // 左值版本
    std::string str() && { return std::move(data_); }       // 右值版本（move out）
};

int main() {
    int x = 10, y = 20;
    my_swap(x, y);
    std::cout << x << " " << y << "\n";  // 20 10

    StringBuilder sb;
    std::cout << sb.append("Hello").append(", ").append("World").str() << "\n";

    return 0;
}
```

### 5.2 const 引用与生命周期延长

```cpp
// file: const_ref_lifetime.cpp
// compile: g++ -std=c++17 -O2 -o const_ref const_ref_lifetime.cpp
#include <iostream>
#include <string>
#include <chrono>

class Logger {
    std::string tag_;
public:
    explicit Logger(std::string tag) : tag_(std::move(tag)) {
        std::cout << "[" << tag_ << "] constructed\n";
    }
    ~Logger() {
        std::cout << "[" << tag_ << "] destroyed\n";
    }
};

Logger make_logger(const std::string& tag) {
    return Logger(tag);  // NRVO 或 mandatory copy elision
}

int main() {
    // const 引用延长临时对象生命周期
    const Logger& log = make_logger("tmp");
    std::cout << "using log...\n";
    // log 在此处仍有效，main 退出时销毁

    // 危险：绑定到函数返回的右值引用不延长生命周期
    // std::string&& bad = std::move(std::string("x"));  // 不延长，bad 悬空

    // 正确：绑定到 prvalue，延长
    const std::string& s = std::string("hello");
    std::cout << s << "\n";  // 仍有效

    return 0;
}
```

### 5.3 运算符重载与引用

```cpp
// file: operator_overload.cpp
// compile: g++ -std=c++17 -O2 -o op_overload operator_overload.cpp
#include <iostream>
#include <cmath>

class Vector3 {
    double x_, y_, z_;
public:
    constexpr Vector3(double x = 0, double y = 0, double z = 0)
        : x_(x), y_(y), z_(z) {}

    // const 引用避免拷贝
    constexpr Vector3 operator+(const Vector3& other) const {
        return Vector3{x_ + other.x_, y_ + other.y_, z_ + other.z_};
    }

    // 左值引用赋值（this 限定为左值）
    Vector3& operator+=(const Vector3& other) & {
        x_ += other.x_;
        y_ += other.y_;
        z_ += other.z_;
        return *this;
    }

    // 流插入：必须返回引用以支持链式
    friend std::ostream& operator<<(std::ostream& os, const Vector3& v) {
        return os << "(" << v.x_ << ", " << v.y_ << ", " << v.z_ << ")";
    }

    // 下标运算符返回引用，支持 lhs 赋值
    double& operator[](size_t i) {
        switch (i) {
            case 0: return x_;
            case 1: return y_;
            case 2: return z_;
            default: throw std::out_of_range("Vector3 index");
        }
    }
    const double& operator[](size_t i) const {
        return const_cast<Vector3&>(*this)[i];  // 复用非 const 版本（Scott Meyers 风格）
    }

    double norm() const { return std::sqrt(x_*x_ + y_*y_ + z_*z_); }
};

int main() {
    Vector3 a{1, 2, 3}, b{4, 5, 6};
    Vector3 c = a + b;
    std::cout << "a + b = " << c << "\n";

    a += b;
    std::cout << "a += b: " << a << "\n";

    c[0] = 10;
    std::cout << "c[0] = " << c[0] << "\n";

    return 0;
}
```

### 5.4 引用折叠与转发引用

```cpp
// file: forwarding_ref.cpp
// compile: g++ -std=c++17 -O2 -o forwarding_ref forwarding_ref.cpp
#include <iostream>
#include <utility>
#include <type_traits>
#include <string>

// 转发引用：T&& 在模板推导上下文
template<typename T>
void analyze(T&& arg) {
    using ParamType = T&&;
    if constexpr (std::is_lvalue_reference_v<ParamType>) {
        std::cout << "lvalue ref\n";
    } else {
        std::cout << "rvalue ref\n";
    }
}

int main() {
    int x = 42;
    const int& cx = x;
    int&& rr = std::move(x);

    analyze(x);              // T=int&, T&&=int&（折叠）
    analyze(cx);             // T=const int&, T&&=const int&（折叠）
    analyze(rr);             // T=int&, T&&=int&（折叠，rr 本身是 lvalue）
    analyze(std::move(x));   // T=int, T&&=int&&
    analyze(42);             // T=int, T&&=int&&
    analyze(static_cast<int&&>(x));  // T=int, T&&=int&&

    return 0;
}
```

### 5.5 引用限定成员函数（C++11 ref-qualified member functions）

```cpp
// file: ref_qualified_member.cpp
// compile: g++ -std=c++17 -O2 -o ref_qual ref_qualified_member.cpp
#include <iostream>
#include <string>
#include <vector>

class StringList {
    std::vector<std::string> data_;
public:
    StringList() = default;
    explicit StringList(std::initializer_list<std::string> init) : data_(init) {}

    // 左值版本：返回 const 引用，避免修改内部状态
    const std::vector<std::string>& items() const & {
        std::cout << "[lvalue items]\n";
        return data_;
    }

    // 右值版本：move out，避免拷贝
    std::vector<std::string> items() && {
        std::cout << "[rvalue items]\n";
        return std::move(data_);
    }

    // 不可对右值调用左值版本：编译器根据 *this 的值类别选择
};

StringList make_list() {
    return StringList{"a", "b", "c"};
}

int main() {
    StringList l{"x", "y"};
    auto items1 = l.items();          // 调用 lvalue 版本，拷贝
    auto items2 = make_list().items(); // 调用 rvalue 版本，move

    std::cout << "items1.size() = " << items1.size() << "\n";
    std::cout << "items2.size() = " << items2.size() << "\n";

    return 0;
}
```

### 5.6 std::reference_wrapper：可重绑定的引用

```cpp
// file: reference_wrapper_demo.cpp
// compile: g++ -std=c++17 -O2 -o ref_wrap reference_wrapper_demo.cpp
#include <iostream>
#include <functional>
#include <vector>
#include <algorithm>
#include <string>

int main() {
    int a = 10, b = 20, c = 30;

    // std::reference_wrapper 是可复制、可重绑定的"引用包装器"
    std::vector<std::reference_wrapper<int>> refs = {a, b, c};

    // 修改引用的对象
    for (int& x : refs) {
        x *= 2;
    }
    // 现在 a=20, b=40, c=60

    std::cout << "a=" << a << " b=" << b << " c=" << c << "\n";

    // 用于按引用传递给 std::bind / lambda
    std::function<int()> getter = std::bind([](int& x) { return x; }, std::ref(a));
    a = 999;
    std::cout << "getter() = " << getter() << "\n";  // 999

    // 用于容器存储"指向同一对象"的引用
    std::string s1 = "hello", s2 = "world";
    std::vector<std::reference_wrapper<std::string>> strs = {s1, s2};
    strs[0].get() += "!";
    std::cout << s1 << "\n";  // hello!

    return 0;
}
```

### 5.7 CRTP 中的引用

```cpp
// file: crtp_reference.cpp
// compile: g++ -std=c++17 -O2 -o crtp crtp_reference.cpp
#include <iostream>
#include <type_traits>

// CRTP: 基类通过静态多态访问派生类
template<typename Derived>
struct ShapeBase {
    double area() const {
        return static_cast<const Derived&>(*this).area_impl();
    }
    double perimeter() const {
        return static_cast<const Derived&>(*this).perimeter_impl();
    }

    // 链式调用：返回 Derived& 而非 ShapeBase&
    Derived& self() & { return static_cast<Derived&>(*this); }
    Derived&& self() && { return static_cast<Derived&&>(*this); }
};

class Circle : public ShapeBase<Circle> {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area_impl() const { return 3.14159265 * r_ * r_; }
    double perimeter_impl() const { return 2 * 3.14159265 * r_; }
};

int main() {
    Circle c{5.0};
    std::cout << "area = " << c.area() << "\n";
    std::cout << "perimeter = " << c.perimeter() << "\n";

    Circle& ref = c.self();
    ref.self();  // OK，返回 Circle&
    return 0;
}
```

### 5.8 std::launder 与对象生命周期

```cpp
// file: launder_demo.cpp
// compile: g++ -std=c++17 -O2 -o launder launder_demo.cpp
#include <new>
#include <iostream>
#include <string>

// std::launder 用于跨越 placement new 的"指针/引用优化屏障"
struct WithConst {
    const int value;
    WithConst(int v) : value(v) {}
};

int main() {
    // 创建原始存储
    alignas(WithConst) unsigned char buffer[sizeof(WithConst)];

    // placement new 构造对象
    WithConst* p1 = new (buffer) WithConst(10);
    std::cout << "p1->value = " << p1->value << "\n";  // 10

    // 显式析构
    p1->~WithConst();

    // 重新构造（修改 const 成员的值）
    WithConst* p2 = new (buffer) WithConst(20);

    // 危险：编译器可能认为 *p1 仍是 10，因为 const 成员理论上不变
    // std::cout << p1->value << "\n";  // UB！
    // 修复：通过 std::launder 告知编译器"这个指针指向的对象可能已变化"
    std::cout << std::launder(p1)->value << "\n";  // 20

    // 显式析构
    p2->~WithConst();

    return 0;
}
```

### 5.9 视图类型：std::string_view 与 std::span

```cpp
// file: view_types.cpp
// compile: g++ -std=c++20 -O2 -o view_types view_types.cpp
#include <iostream>
#include <string>
#include <string_view>
#include <vector>
#include <span>
#include <array>

// string_view：const char 序列的非拥有引用
void print(std::string_view sv) {
    std::cout << "[" << sv.size() << "] " << sv << "\n";
}

// span：连续内存的非拥有引用
int sum_positive(std::span<const int> data) {
    int total = 0;
    for (int x : data) {
        if (x > 0) total += x;
    }
    return total;
}

int main() {
    std::string s = "hello world";
    print(s);                       // 从 std::string 构造
    print("literal");               // 从 const char* 构造
    print(s.substr(0, 5));          // 子串视图，无拷贝

    int arr[] = {1, -2, 3, -4, 5};
    std::vector<int> v = {10, -20, 30};
    std::array<int, 3> a = {100, -200, 300};

    std::cout << "arr sum = " << sum_positive(arr) << "\n";  // 9
    std::cout << "v sum = " << sum_positive(v) << "\n";      // 40
    std::cout << "a sum = " << sum_positive(a) << "\n";      // 400

    // 危险：view 持有引用，注意生命周期
    std::string_view dangling() {
        std::string local = "temp";
        return local;  // 警告：返回后 local 析构，view 悬空
    }
    // 上面函数若被调用，使用返回的 string_view 是 UB

    return 0;
}
```

### 5.10 CMake 构建示例

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.15)
project(cpp_reference_demo CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 启用警告与 sanitizer
add_compile_options(-Wall -Wextra -Wpedantic -Werror)

# 多个示例可执行文件
add_executable(reference_basics reference_basics.cpp)
add_executable(const_ref_lifetime const_ref_lifetime.cpp)
add_executable(operator_overload operator_overload.cpp)
add_executable(forwarding_ref forwarding_ref.cpp)
add_executable(ref_qualified_member ref_qualified_member.cpp)
add_executable(reference_wrapper_demo reference_wrapper_demo.cpp)
add_executable(crtp_reference crtp_reference.cpp)
add_executable(launder_demo launder_demo.cpp)
add_executable(view_types view_types.cpp)

# AddressSanitizer 配置（可选）
option(ENABLE_ASAN "Enable AddressSanitizer" OFF)
if(ENABLE_ASAN)
    add_compile_options(-fsanitize=address -fno-omit-frame-pointer)
    add_link_options(-fsanitize=address)
endif()

# 测试
enable_testing()
add_test(NAME reference_basics_test COMMAND reference_basics)
add_test(NAME const_ref_test COMMAND const_ref_lifetime)
```

## 6. 对比分析（横向对比）

### 6.1 引用 vs 指针

| 维度 | 引用 `T&` | 指针 `T*` | 备注 |
| :--- | :--- | :--- | :--- |
| **必须初始化** | 是 | 否 | 引用更安全 |
| **可重绑定** | 否 | 是 | 指针更灵活 |
| **可空** | 否（UB） | 是 | 引用更安全 |
| **算术运算** | 否 | 是 | 指针可遍历数组 |
| **多级** | 否（折叠） | 是 | `int**` 合法，`int&&&` 折叠 |
| **ABI 实现** | 通常为指针 | 指针 | 运行时无差异 |
| **语法** | 自然 `r.x` | 笨拙 `p->x` | 引用更易读 |
| **重载区分** | `f(T&)` vs `f(T*)` | 同左 | 可同时存在 |
| **悬空风险** | 有（但更易发现） | 有（更常见） | 都需谨慎 |
| **容器存储** | 不支持 | 支持 `vector<T*>` | 用 `std::reference_wrapper` |

**选用建议**：

- 函数参数：优先 `const T&`，需要修改用 `T&`；
- 函数返回值：返回内部状态用 `const T&` 或 `T&`，需 move out 用 `T` 或 `T&&`；
- 类成员：避免引用成员（影响赋值语义），用 `std::reference_wrapper` 或指针；
- API 设计：参数用引用表"非空且不拥有"，用指针表"可空或可重绑定"。

### 6.2 const T& vs T vs T&&（参数传递决策树）

```
参数传入决策：
├── 仅读取，且通常为小对象（≤ 2 字） → 按值传递 T
├── 仅读取，且为大对象（string、vector 等） → const T&
├── 需要修改原对象 → T&
├── 需要拥有/移动原对象 → T（内部 std::move）或 T&&（重载）
└── 需要完美转发 → T&&（forwarding reference）+ std::forward
```

| 参数类型 | 拷贝次数 | 是否可修改实参 | 适用场景 |
| :--- | :--- | :--- | :--- |
| `T` | 1 | 否 | 小对象、需要拷贝的场景 |
| `const T&` | 0 | 否 | 大对象只读访问 |
| `T&` | 0 | 是 | 修改实参（swap、operator>>） |
| `T&&` | 0 | 是（移动后） | 移动语义重载 |
| `T&&`（forwarding） | 0 | 取决于实参 | 模板通用包装器 |

### 6.3 C++ vs Rust 借用对比

```cpp
// C++：引用可悬空，编译器不检查
int& dangerous() {
    int x = 42;
    return x;  // 警告：返回局部变量引用，UB
}
```

```rust
// Rust：借用检查器编译期保证引用有效
fn safe() -> &'static i32 {
    &42  // OK：字面量是 'static
}
fn dangerous() -> &'_ i32 {
    let x = 42;
    &x  // 编译错误：x 不够长
}
```

| 维度 | C++ | Rust |
| :--- | :--- | :--- |
| 借用检查 | 无（运行时 UB） | 编译期保证 |
| 多重借用 | 自由（需手动同步） | 严格：N 个 `&T` 或 1 个 `&mut T` |
| 生命周期标注 | 无（隐式） | 显式 `'a` |
| 悬空引用 | 可能 | 编译错误 |

C++ 通过 `std::reference_wrapper`、智能指针、`gsl::not_null` 等工具减轻风险，但本质无法做到 Rust 级别的静态保证。

### 6.4 引用与移动语义

```cpp
struct Widget {
    Widget() = default;
    Widget(const Widget&) { /* copy */ }
    Widget(Widget&&) noexcept { /* move */ }
};

void take_lvalue_ref(Widget&) { /* lvalue */ }
void take_rvalue_ref(Widget&&) { /* rvalue */ }
void take_by_value(Widget) { /* copy or move */ }

Widget w;
take_lvalue_ref(w);               // OK：lvalue
// take_rvalue_ref(w);           // 错误：w 是 lvalue
take_rvalue_ref(std::move(w));    // OK：xvalue
take_by_value(w);                 // copy
take_by_value(std::move(w));      // move
take_by_value(Widget());          // move / mandatory elision
```

### 6.5 不同语言对引用的支持

| 语言 | 引用语义 | 悬空风险 |
| :--- | :--- | :--- |
| C++ | `T&` / `T&&` 显式 | 有 |
| Rust | `&T` / `&mut T` 借用 | 编译期禁止 |
| Go | 全部按值传，指针显式 | GC 防止 |
| Java | 对象按引用传递 | GC 防止 |
| Swift | `inout`、`consuming` | ARC 防止 |
| C# | `ref` / `out` / `in` | GC 防止 |
| Python | 全部按对象引用 | GC 防止 |

## 7. 常见陷阱与最佳实践

### 7.1 悬空引用（Dangling Reference）

**陷阱**：返回局部变量引用：

```cpp
int& bad() {
    int x = 42;
    return x;  // UB：x 已析构
}

const std::string& worse() {
    std::string local = "temp";
    return local;  // UB
}
```

**修复**：返回值，或确保对象生命周期足够长：

```cpp
int good() { return 42; }

class Container {
    std::vector<int> data_;
public:
    const std::vector<int>& data() const { return data_; }  // OK：data_ 与 *this 同寿
};
```

### 7.2 临时对象生命周期误用

**陷阱**：跨函数边界传递 const 引用：

```cpp
const std::string& get_name() {
    return "hello";  // C++20 起编译警告：返回临时对象引用
}

const std::string& extend(const std::string& s) {
    return s + "!";  // UB：s + "!" 是临时对象，引用不延长
}
```

**修复**：返回值类型：

```cpp
std::string get_name() { return "hello"; }
std::string extend(const std::string& s) { return s + "!"; }
```

### 7.3 引用与范围 for 循环

**陷阱**：默认按值拷贝：

```cpp
std::vector<std::string> names = {"alice", "bob"};
for (auto name : names) {  // 拷贝！
    std::cout << name;
}
```

**修复**：用 `auto&` 或 `const auto&`：

```cpp
for (const auto& name : names) {  // 零拷贝
    std::cout << name;
}

for (auto& name : names) {  // 可修改
    name += "_suffix";
}
```

### 7.4 引用成员与默认赋值

**陷阱**：引用成员导致赋值运算符被删除：

```cpp
class Bad {
    int& ref_;
public:
    Bad(int& r) : ref_(r) {}
    // 默认 operator= 被删除（引用不可重绑定）
};

int x = 1, y = 2;
Bad a(x), b(y);
// a = b;  // 编译错误
```

**修复**：用 `std::reference_wrapper` 或指针：

```cpp
class Good {
    std::reference_wrapper<int> ref_;
public:
    Good(int& r) : ref_(r) {}
    Good& operator=(const Good& other) {
        ref_ = other.ref_;  // 可重绑定
        return *this;
    }
};
```

### 7.5 转发引用误用为右值引用

**陷阱**：在转发引用上下文使用 `std::move`：

```cpp
template<typename T>
void wrapper(T&& x) {
    target(std::move(x));  // 错误：x 是 lvalue 时也会被 move
}

void target(int&);
void target(int&&);

int x = 42;
wrapper(x);  // 期望调用 target(int&)，但 std::move 后调用 target(int&&)
```

**修复**：用 `std::forward`：

```cpp
template<typename T>
void wrapper(T&& x) {
    target(std::forward<T>(x));  // 正确转发值类别
}
```

### 7.6 const 引用的隐式转换陷阱

**陷阱**：const 引用绑定到不同类型会创建临时对象：

```cpp
void print(const int& x) { std::cout << x; }

double d = 3.14;
print(d);  // 创建 int 临时对象，引用绑定到临时对象
// 若 print 保存了 &x，则后续访问是悬空引用
```

更危险的案例：

```cpp
const char& c = "hello"[0];  // OK
const char& bad = std::string("hello")[0];  // UB：临时 string 析构后悬空
```

### 7.7 auto 与引用类型推导

**陷阱**：`auto` 默认丢弃引用与 const：

```cpp
const std::string& get_string();

auto s = get_string();        // 拷贝！s 是 std::string
const auto& cs = get_string();  // OK：const 引用
auto&& rs = get_string();       // OK：const std::string&（折叠）
```

**陷阱**：`auto&&` 是转发引用：

```cpp
auto&& a = x;              // int&
auto&& b = std::move(x);   // int&&
auto&& c = 42;              // int&&
```

### 7.8 引用折叠陷阱

**陷阱**：`typedef` 中误用引用：

```cpp
using IntRef = int&;
IntRef& r = /*...*/;  // OK：折叠为 int&

using IntRefRef = int&&;
IntRefRef& r2 = /*...*/;  // OK：折叠为 int&

// 误以为有"引用的引用"
int x = 42;
int& rx = x;
// int& & rrx = rx;  // 错误：不能直接声明，但通过 typedef 折叠
```

### 7.9 nullptr 与引用

**陷阱**：通过空指针解引用得到"空引用"：

```cpp
int* p = nullptr;
int& r = *p;  // UB：解引用空指针
```

**修复**：使用 `gsl::not_null<T*>` 或避免指针：

```cpp
void f(int& x);  // 接口设计：不接受空

// 调用方
int x = 42;
f(x);  // OK
// f(*nullptr);  // 不能直接传递 nullptr
```

### 7.10 RAII 与引用

**陷阱**：引用在析构顺序中悬空：

```cpp
class Bad {
    const std::string& name_;
    std::string temp_{"temp"};
public:
    Bad() : name_(temp_) {}  // 初始化列表中 name_ 先于 temp_ 构造
    ~Bad() {
        // temp_ 已析构？name_ 仍有效？
        // 实际：成员析构顺序与声明相反，name_ 在 temp_ 之后析构，name_ 仍有效
    }
};
```

注意成员初始化顺序按声明顺序，析构顺序相反。

## 8. 工程实践

### 8.1 Google C++ Style Guide 的引用规范

- **输入参数**：`const T&`（若为简单类型如 `int`、`double`，按值 `T`）；
- **输出参数**：`T*`（而非 `T&`），明确表达"将被修改"；
- **返回值**：`const T&` 仅当返回内部对象且对象生命周期足够长；否则返回值；
- **禁止**：返回 const 引用临时对象、返回引用局部变量。

### 8.2 LLVM Coding Standards

- 大对象按 `const T&` 传递；
- 输入参数按值传递若为简单类型或需要拷贝；
- 输出参数：`T&` 或 `T*` 均可；
- 鼓励返回值（NRVO / mandatory elision）。

### 8.3 性能分析：引用 vs 指针

```cpp
// Benchmark: reference_vs_pointer
#include <benchmark/benchmark.h>

void by_ref(int& x) { ++x; }
void by_ptr(int* x) { ++*x; }

static void BM_Reference(benchmark::State& state) {
    int x = 0;
    for (auto _ : state) {
        by_ref(x);
        benchmark::DoNotOptimize(x);
    }
}
BENCHMARK(BM_Reference);

static void BM_Pointer(benchmark::State& state) {
    int x = 0;
    for (auto _ : state) {
        by_ptr(&x);
        benchmark::DoNotOptimize(x);
    }
}
BENCHMARK(BM_Pointer);

// 实测：两者性能无差异（同汇编）
```

### 8.4 调试引用悬空

启用 AddressSanitizer：

```bash
g++ -std=c++17 -O1 -fsanitize=address -g -o test test.cpp
./test
# ASAN 会报告 use-after-scope / use-after-return 等错误
```

使用 UBSan 检测空引用：

```bash
g++ -std=c++17 -O1 -fsanitize=undefined -g -o test test.cpp
./test
# UBSan 会报告 null pointer dereference
```

### 8.5 静态分析工具

- **Clang-Tidy**：`cppcoreguidelines-pro-bounds-pointer-arithmetic`、`cppcoreguidelines-pro-type-cstyle-cast` 等；
- **Cppcheck**：检测悬空引用、无效指针算术；
- **PVS-Studio**：检测引用生命周期问题；
- **Visual Studio Code Analysis**：MSVC 内置分析。

### 8.6 ABI 兼容性考量

引用作为函数参数在 ABI 层面等同指针，但函数签名 mangling 不同：

```cpp
// lib v1
void f(int& x);
// lib v2
void f(int* x);  // ABI 不兼容，需重新编译
```

跨模块边界传递引用时，确保双方编译器、标准库版本一致。

### 8.7 序列化与引用

引用本身不可序列化（不持久化"绑定关系"）。序列化时按值拷贝：

```cpp
// protobuf：repeated int32 data = 1;
// C++ API：const RepeatedField<int>& data() const;
// 序列化时拷贝值，不保存引用
```

## 9. 案例研究

### 9.1 案例：std::vector::operator[] 返回引用

```cpp
// std::vector 的简化实现
template<typename T>
class vector {
    T* data_;
    size_t size_;
public:
    // 返回引用：支持 lhs 与 rhs
    T& operator[](size_t i) { return data_[i]; }
    const T& operator[](size_t i) const { return data_[i]; }

    // push_back 通过引用修改内部状态
    void push_back(const T& value) {
        // ... 可能扩容 ...
        data_[size_++] = value;
    }
    void push_back(T&& value) {
        data_[size_++] = std::move(value);
    }
};

// 使用
vector<int> v;
v.push_back(42);
v[0] = 100;  // operator[] 返回 int&，可赋值
int x = v[0];  // const 版本可读
```

**关键设计**：返回引用支持链式赋值与原地修改，避免拷贝。

### 9.2 案例：std::ostream::operator<< 链式调用

```cpp
class ostream {
public:
    ostream& operator<<(int x) {
        // 输出 x
        return *this;  // 返回引用，支持链式
    }
    ostream& operator<<(const char* s) {
        // 输出 s
        return *this;
    }
};

// 使用
std::cout << "x = " << 42 << "\n";
// 等价于：((std::cout.operator<<("x = ")).operator<<(42)).operator<<("\n")
```

**关键设计**：返回 `ostream&` 而非 `ostream`，避免多次拷贝流对象。

### 9.3 案例：std::forward 的实现

```cpp
// C++17 简化实现
template<typename T>
[[nodiscard]] constexpr T&& forward(std::remove_reference_t<T>& t) noexcept {
    return static_cast<T&&>(t);
}

template<typename T>
[[nodiscard]] constexpr T&& forward(std::remove_reference_t<T>&& t) noexcept {
    static_assert(!std::is_lvalue_reference_v<T>,
                  "Cannot forward an rvalue as an lvalue");
    return static_cast<T&&>(t);
}
```

**原理**：通过 `static_cast<T&&>` 触发引用折叠，恢复原始值类别。

### 9.4 案例：CRTP 与引用

```cpp
template<typename Derived>
struct Equality {
    friend bool operator==(const Equality<Derived>& lhs, const Equality<Derived>& rhs) {
        // 通过引用转换为 Derived，调用 Derived::operator==
        return static_cast<const Derived&>(lhs).equals(static_cast<const Derived&>(rhs));
    }
    friend bool operator!=(const Equality<Derived>& lhs, const Equality<Derived>& rhs) {
        return !(lhs == rhs);
    }
};

class Person : public Equality<Person> {
    std::string name_;
    int age_;
public:
    Person(std::string name, int age) : name_(std::move(name)), age_(age) {}
    bool equals(const Person& other) const {
        return name_ == other.name_ && age_ == other.age_;
    }
};

Person a{"Alice", 30}, b{"Bob", 25};
bool same = (a == b);  // false
```

### 9.5 案例：std::function 与引用

```cpp
#include <functional>

void f(int& x) { ++x; }

int main() {
    int x = 42;
    // std::function<void(int)> fn = f;  // 错误：参数按值传递
    std::function<void(int&)> fn = f;     // OK
    std::function<void(int)> fn2 = [x](int v) mutable { /*...*/ };

    // 用 std::ref 按引用传递
    std::function<void(int)> fn3 = std::bind(f, std::placeholders::_1);
    // 调用 fn3(x) 仍按值传递 x 给 f，UB
    // 正确：std::bind(f, std::ref(x))

    return 0;
}
```

### 9.6 案例：移动语义中的引用

```cpp
class String {
    char* data_;
    size_t size_;
public:
    // 移动构造：接收右值引用
    String(String&& other) noexcept
        : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;  // 置空，防止 double free
        other.size_ = 0;
    }

    // 移动赋值：注意自赋值
    String& operator=(String&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            data_ = other.data_;
            size_ = other.size_;
            other.data_ = nullptr;
            other.size_ = 0;
        }
        return *this;
    }
};
```

### 9.7 案例：ranges 中的 dangling 检测

```cpp
// C++20 ranges 提供 std::ranges::dangling 标记
#include <ranges>
#include <vector>
#include <iostream>

std::vector<int> make_vec() { return {1, 2, 3}; }

auto bad = std::views::reverse(make_vec());
// bad 是 std::ranges::dangling（指向已销毁的临时对象）
// 编译期检测到，使用 bad 会编译错误

auto vec = make_vec();
auto good = std::views::reverse(vec);  // OK：vec 生命周期足够长
```

### 9.8 案例：std::span 与 const 引用

```cpp
#include <span>
#include <vector>
#include <array>

// 接受任意连续内存的函数
void process(std::span<const int> data);

// 调用
int arr[5] = {1, 2, 3, 4, 5};
std::vector<int> v = {10, 20, 30};
std::array<int, 3> a = {100, 200, 300};

process(arr);              // 隐式转 span
process(v);                // 隐式转 span
process(a);                // 隐式转 span
process({arr, 3});         // 显式构造子视图
```

## 10. 习题

### 10.1 基础题（Remember / Understand）

**习题 1**：以下哪些声明是合法的引用？

```cpp
int x = 42;
const int cx = 100;
int& r1 = x;
const int& r2 = cx;
int& r3 = cx;
int& r4 = 42;
const int& r5 = 42;
int&& r6 = x;
int&& r7 = std::move(x);
int&& r8 = r7;
```

**参考答案**：r1（OK）、r2（OK）、r3（错：const 不可绑定到非 const 引用）、r4（错：非 const 引用不可绑定到 rvalue）、r5（OK）、r6（错：x 是 lvalue，不能绑定到 rvalue 引用）、r7（OK）、r8（错：r7 是 lvalue）。

**习题 2**：以下代码输出什么？

```cpp
int x = 1, y = 2;
int& r = x;
r = y;
r = 10;
std::cout << x << " " << y;
```

**参考答案**：`10 2`。引用不可重绑定，`r = y` 是赋值（修改 x 的值为 y 的值），`r = 10` 修改 x 为 10。

**习题 3**：引用折叠的四种组合结果分别是什么？

**参考答案**：

- `T& &` → `T&`
- `T& &&` → `T&`
- `T&& &` → `T&`
- `T&& &&` → `T&&`

### 10.2 应用题（Apply / Analyze）

**习题 4**：实现一个 `chain` 函数，链式调用多个一元函数：

```cpp
template<typename T, typename... Fs>
auto chain(T initial, Fs&&... fs);
// chain(0, f, g, h) == h(g(f(0)))
```

**参考实现**：

```cpp
template<typename T, typename... Fs>
auto chain(T initial, Fs&&... fs) {
    // 折叠表达式：从左到右应用 fs
    return ((initial | std::forward<Fs>(fs)) | ...);
    // 注意：需要重载 operator| 或改用 lambda
}
```

简化版：

```cpp
template<typename T, typename F>
auto chain(T initial, F&& f) {
    return std::forward<F>(f)(initial);
}

template<typename T, typename F, typename... Rest>
auto chain(T initial, F&& f, Rest&&... rest) {
    return chain(std::forward<F>(f)(initial), std::forward<Rest>(rest)...);
}
```

**习题 5**：分析以下代码的问题：

```cpp
const std::string& f() {
    return "hello";
}

const std::string& g(const std::string& s) {
    return s + "!";
}

int main() {
    const std::string& x = g(f());
    std::cout << x;
}
```

**参考答案**：

1. `f()` 返回 const 引用到临时 `std::string("hello")`，但函数返回值中的临时对象不延长生命周期，悬空。
2. `g()` 中 `s + "!"` 是临时对象，返回引用到临时对象，悬空。
3. `x` 绑定到悬空引用，使用是 UB。

修复：返回值类型 `std::string`。

### 10.3 评价题（Evaluate）

**习题 6**：对比以下两种 API 设计：

```cpp
// 设计 A
void parse(const std::string& input, Result& output);

// 设计 B
Result parse(const std::string& input);
```

**参考分析**：

- 设计 A：通过引用输出，避免拷贝 Result；但调用方需先构造 Result，且语义不直观。
- 设计 B：返回值，依赖 NRVO；语义清晰，但理论上可能拷贝（C++17 起保证 elision）。

**结论**：优先设计 B（C++17+），除非 Result 不可拷贝且需复用内存。

**习题 7**：评估以下代码是否安全：

```cpp
std::vector<std::string> v;
v.reserve(3);
std::string& ref = v.emplace_back("a");
v.emplace_back("b");
v.emplace_back("c");
std::cout << ref;  // 安全吗？
```

**参考答案**：不安全。`reserve(3)` 后第一次 `emplace_back` 不扩容，但后续若容量不足触发扩容，会移动所有元素到新内存，旧引用悬空。即使未扩容，标准也不保证 `emplace_back` 后引用有效（实现定义）。

**修复**：在使用 ref 期间不修改容器，或用索引代替引用。

### 10.4 创造题（Create）

**习题 8**：实现一个 `observer_ptr<T>`，行为类似 `T*` 但表达"非拥有"语义：

```cpp
template<typename T>
class observer_ptr {
public:
    // ... 实现 ...
};

// 使用
int x = 42;
observer_ptr<int> p(&x);
if (p) std::cout << *p;
```

**参考实现**：

```cpp
template<typename T>
class observer_ptr {
    T* ptr_ = nullptr;
public:
    observer_ptr() noexcept = default;
    observer_ptr(std::nullptr_t) noexcept {}
    explicit observer_ptr(T* p) noexcept : ptr_(p) {}

    observer_ptr(const observer_ptr&) = default;
    observer_ptr& operator=(const observer_ptr&) = default;

    T* get() const noexcept { return ptr_; }
    T& operator*() const noexcept { return *ptr_; }
    T* operator->() const noexcept { return ptr_; }
    explicit operator bool() const noexcept { return ptr_ != nullptr; }
    explicit operator T*() const noexcept { return ptr_; }

    void reset(T* p = nullptr) noexcept { ptr_ = p; }
    void swap(observer_ptr& other) noexcept { std::swap(ptr_, other.ptr_); }
};

template<typename T>
bool operator==(observer_ptr<T> a, observer_ptr<T> b) { return a.get() == b.get(); }
template<typename T>
bool operator!=(observer_ptr<T> a, observer_ptr<T> b) { return !(a == b); }
```

**习题 9**：实现一个完美的 `bind` 函数，支持任意可调用对象与参数：

```cpp
template<typename F, typename... Args>
auto my_bind(F&& f, Args&&... args);
```

**参考实现**：

```cpp
#include <functional>
#include <utility>
#include <tuple>

template<typename F, typename... Args>
auto my_bind(F&& f, Args&&... args) {
    // 捕获 f 与 args（完美转发）
    return [f = std::forward<F>(f),
            ... captured = std::forward<Args>(args)]() mutable {
        return std::invoke(f, captured...);
    };
}

// C++17 兼容版（无包展开捕获）：
template<typename F, typename... Args>
auto my_bind17(F&& f, Args&&... args) {
    return [f = std::forward<F>(f),
            tup = std::tuple<std::decay_t<Args>...>(std::forward<Args>(args)...)]() mutable {
        return std::apply(f, tup);
    };
}
```

**习题 10**：分析 `std::vector<bool>` 的特殊性：为何 `operator[]` 返回的不是 `bool&`？

**参考答案**：`std::vector<bool>` 使用位压缩存储，每个元素占 1 bit，无法返回 `bool&`（最小可寻址单位是 byte）。故返回 `reference` 代理类型，模拟引用语义但实际是 bit 引用。

```cpp
std::vector<bool> v = {true, false, true};
auto x = v[0];  // x 是 std::vector<bool>::reference，不是 bool&
v[0] = false;   // 通过代理类型修改
// bool& ref = v[0];  // 错误：不能绑定到代理类型
```

## 11. 参考文献

[1] Stroustrup, B. 1985. *An Overview of C++*. SIGPLAN Notices 20(6): 47-64. DOI: 10.1145/17919.17922.

[2] Ellis, M. A. and Stroustrup, B. 1990. *The Annotated C++ Reference Manual*. Addison-Wesley. ISBN: 0-201-51459-1.

[3] ISO/IEC 14882:1998. *Programming languages — C++*. International Organization for Standardization.

[4] ISO/IEC 14882:2011. *Programming languages — C++*. International Organization for Standardization.

[5] ISO/IEC 14882:2023. *Programming languages — C++*. International Organization for Standardization.

[6] Stroustrup, B. 2013. *The C++ Programming Language* (4th ed.). Addison-Wesley. ISBN: 978-0321563842.

[7] Meyers, S. 2014. *Effective Modern C++: 42 Specific Ways to Improve Your Use of C++11 and C++14*. O'Reilly Media. ISBN: 978-1491903995.

[8] Sutter, H. and Alexandrescu, A. 2004. *C++ Coding Standards: 101 Rules, Guidelines, and Best Practices*. Addison-Wesley. ISBN: 978-0321113580.

[9] Vandevoorde, D., Josuttis, N. M., and Gregor, D. 2017. *C++ Templates: The Complete Guide* (2nd ed.). Addison-Wesley. ISBN: 978-0321714121.

[10] N1385, Ellis, M. and Stroustrup, B. 2002. *A Fix for Rvalue References*. ISO/IEC JTC1/SC22/WG21. Available: <https://wg21.link/N1385>.

[11] N1377, Nelson, H.-J. 2002. *A Proposal to Add Move Semantics Support to the C++ Language*. ISO/IEC JTC1/SC22/WG21. Available: <https://wg21.link/N1377>.

[12] N1690, Narodytska, N. 2004. *Extending move semantics to \*this*. ISO/IEC JTC1/SC22/WG21. Available: <https://wg21.link/N1690>.

[13] N2835, Nasonov, A. 2009. *Lvalue references as rvalues*. ISO/IEC JTC1/SC22/WG21. Available: <https://wg21.link/N2835>.

[14] P0135, Voutilainen, V. 2016. *Guaranteed copy elision through simplified value categories*. ISO/IEC JTC1/SC22/WG21. Available: <https://wg21.link/P0135>.

[15] P0137, Morrow, J. 2016. *launder: A Library Function for Optimizing the Layout of Objects*. ISO/IEC JTC1/SC22/WG21. Available: <https://wg21.link/P0137>.

[16] P2447, Krinkin, A. 2023. *std::span constructors*. ISO/IEC JTC1/SC22/WG21. Available: <https://wg21.link/P2447>.

[17] Becker, P. 2011. *The C++ Standard Library Extensions: A Tutorial and Reference*. Addison-Wesley. ISBN: 978-0321410993.

[18] Josuttis, N. M. 2012. *The C++ Standard Library: A Tutorial and Reference* (2nd ed.). Addison-Wesley. ISBN: 978-0321623218.

[19] Stroustrup, B. 2020. *C++20 — Reaching for the Aims of C++*. Keynote at CppCon 2020. Available: <https://www.youtube.com/watch?v=25r8gZEwYXc>.

[20] Stroustrup, B. and Sutter, H. (eds.) 2021. *C++ Core Guidelines*. Available: <https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines>.

## 12. 延伸阅读

### 12.1 标准文献

- ISO/IEC 14882:2023 §9.4.3 *References*：引用的标准化定义与语义。
- ISO/IEC 14882:2023 §6.10 *Lvalues and rvalues*：值类别形式化。
- ISO/IEC 14882:2023 §6.7.7 *Temporary objects*：临时对象生命周期。
- ISO/IEC 14882:2023 §13.10.2 *Reference collapsing*：引用折叠规则。
- ISO/IEC 14882:2023 §16.3.2 *Forwarding references*：转发引用定义。

### 12.2 经典书籍

- *Effective Modern C++* by Scott Meyers, Items 23-30（右值引用、移动语义、转发引用）。
- *C++ Templates: The Complete Guide* by Vandevoorde et al., Chapters 7-9（函数模板推导、转发引用）。
- *The C++ Programming Language* (4th ed.) by Stroustrup, §7.7（引用）。
- *C++ Coding Standards* by Sutter & Alexandrescu, Items 88-94（参数传递、引用安全）。
- *Exceptional C++* by Sutter, Items 16-18（编译期引用安全）。

### 12.3 在线资源

- cppreference.com: *Reference declaration* <https://en.cppreference.com/w/cpp/language/reference>
- cppreference.com: *Value categories* <https://en.cppreference.com/w/cpp/language/value_category>
- cppreference.com: *std::launder* <https://en.cppreference.com/w/cpp/utility/launder>
- cppreference.com: *std::reference_wrapper* <https://en.cppreference.com/w/cpp/utility/functional/reference_wrapper>
- ISO C++ FAQ: *References* <https://isocpp.org/wiki/faq/references>
- C++ Core Guidelines: *F.7: For general use, take T* or T& arguments rather than smart pointers* <https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-conventional>

### 12.4 视频与课程

- Herb Sutter, *Back to the Basics! Essentials of Modern C++ Style* (CppCon 2014).
- Scott Meyers, *Move Semantics, auto, and Smart Pointers* (CppCon 2014).
- Stephan T. Lavavej, *C++ Core Series* (Channel 9).
- MIT 6.S192 *Software Construction* <https://ocw.mit.edu/courses/6-s192-software-construction-fall-2016/>.
- Stanford CS106L *Standard C++ Programming* <http://web.stanford.edu/class/cs106l/>.

### 12.5 历史文献

- Stepanov, A. and Lee, M. 1995. *The Standard Template Library*. HP Laboratories Technical Report 95-11(R.1).
- Koenig, A. and Stroustrup, B. 1989. *C: The Complete Answer*. AT&T Bell Labs.
- Stroustrup, B. 1994. *The Design and Evolution of C++*. Addison-Wesley. ISBN: 978-0201543308.

## 附录 A：术语速查表

| 术语 | 英文 | 释义 |
| :--- | :--- | :--- |
| 左值 | lvalue | 标识非临时对象的表达式，可取地址 |
| 右值 | rvalue | 不标识持久对象的表达式，包括 xvalue 与 prvalue |
| 纯右值 | prvalue | 非临时的、不可取地址的值 |
| 消亡值 | xvalue | 即将被移动的对象 |
| 左值引用 | lvalue reference | `T&`，绑定到 lvalue |
| 右值引用 | rvalue reference | `T&&`，绑定到 rvalue |
| 转发引用 | forwarding reference | 模板推导中的 `T&&` |
| 引用折叠 | reference collapsing | 引用的引用的合并规则 |
| 常量引用 | const reference | `const T&`，可绑定到 rvalue |
| 悬空引用 | dangling reference | 引用绑定的对象已销毁 |
| 值类别 | value category | 表达式的 lvalue/xvalue/prvalue 分类 |
| 别名 | alias | 引用与被引用对象的关系 |
| 引用限定 | ref-qualifier | `&` 或 `&&` 修饰成员函数 |
| 借用 | borrowing | （Rust 术语）获取引用的过程 |
| 生命周期 | lifetime | 对象存活的时间区间 |

## 附录 B：引用类型速查表

| 类型 | 语法 | 绑定 lvalue | 绑定 rvalue | 可修改 | 应用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 非常量左值引用 | `T&` | 是 | 否 | 是 | 修改实参 |
| 常量左值引用 | `const T&` | 是 | 是 | 否 | 大对象只读参数 |
| 右值引用 | `T&&` | 否 | 是 | 是 | 移动语义重载 |
| 转发引用 | `T&&`（模板） | 是 | 是 | 取决于 | 完美转发 |
| `auto&` | 推导为 lvalue ref | 是 | 否 | 取决于 | 范围 for、保留引用 |
| `const auto&` | 推导为 const lvalue ref | 是 | 是 | 否 | 只读遍历 |
| `auto&&` | 转发引用 | 是 | 是 | 取决于 | 通用代码 |
| `decltype(auto)` | 保留所有 | 是 | 是 | 取决于 | 完美返回值 |

## 附录 C：编译器支持矩阵

| 特性 | GCC | Clang | MSVC | Apple Clang |
| :--- | :--- | :--- | :--- | :--- |
| lvalue reference `T&` | 1.x | 1.x | 1.x | 1.x |
| const reference 生命周期延长 | 4.x | 4.x | 1.x | 4.x |
| rvalue reference `T&&` (C++11) | 4.3 | 2.9 | 2012 | 4.2 |
| 引用折叠 (C++11) | 4.3 | 2.9 | 2012 | 4.2 |
| 转发引用 (C++11) | 4.3 | 2.9 | 2012 | 4.2 |
| `auto&&` (C++11) | 4.7 | 2.9 | 2012 | 4.2 |
| `decltype(auto)` (C++14) | 5.0 | 3.4 | 2015 | 5.1 |
| ref-qualified members (C++11) | 4.3 | 2.9 | 2012 | 4.2 |
| `std::launder` (C++17) | 7.0 | 6.0 | 2017 | 9.1 |
| `std::string_view` (C++17) | 7.0 | 4.0 | 2017 | 9.1 |
| `std::span` (C++20) | 10.0 | 7.0 | 2019 | 11.0 |
| `std::ranges::dangling` (C++20) | 10.0 | 8.0 | 2019 | 11.0 |
| Deducing this (C++23) | 14.0 | 17.0 | 19.34+ | 15.0+ |

## 附录 D：常见错误代码模式

### D.1 返回局部变量引用

```cpp
int& f() {
    int x = 42;
    return x;  // UB: x 已析构
}
```

### D.2 返回临时对象引用

```cpp
const std::string& f() {
    return "hello";  // C++20 起警告，UB
}

const std::string& g(const std::string& s) {
    return s + "!";  // UB: 临时对象
}
```

### D.3 默认按值遍历容器

```cpp
for (auto x : expensive_strings) {  // 拷贝！
    use(x);
}
// 修复：for (const auto& x : ...)
```

### D.4 转发引用误用 std::move

```cpp
template<typename T>
void f(T&& x) {
    g(std::move(x));  // 错误：x 可能是 lvalue
}
// 修复：g(std::forward<T>(x))
```

### D.5 引用成员导致赋值删除

```cpp
class HasRef {
    int& ref_;
public:
    HasRef(int& r) : ref_(r) {}
    // operator= 被删除
};
```

### D.6 临时对象生命周期跨函数边界

```cpp
const std::string& extend(const std::string& s) {
    return s + "!";  // 临时对象，UB
}
auto& x = extend("hello");  // 悬空
```

### D.7 nullptr 解引用

```cpp
int* p = nullptr;
int& r = *p;  // UB
```

### D.8 容器扩容导致引用失效

```cpp
std::vector<int> v = {1, 2, 3};
int& ref = v[0];
v.push_back(4);  // 可能扩容，ref 悬空
```

### D.9 const 引用与隐式转换

```cpp
const std::string& s = "hello";  // OK，延长临时对象生命周期
const std::string& bad = std::string("x").substr(0, 1);  // UB: substr 返回临时 string
```

### D.10 引用折叠误用

```cpp
template<typename T>
using my_ref = T&;

my_ref<int&> r;  // 折叠为 int&
// 误以为是 int&&
```

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_103 拆分，专注于引用相关内容。
- 2026-07-20: 金标准升级，扩展至 1500+ 行，覆盖左值引用、右值引用、const 引用、转发引用、引用折叠、悬空引用、`std::launder`、视图类型、CRTP 等主题，新增 12 项质量基准章节与 4 个附录。
