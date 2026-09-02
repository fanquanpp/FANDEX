# constexpr 与编译期计算（Constant Expression & Compile-time Computation）

## 前置知识

- [变参模板](/cpp/023-VariadicTemplate)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 历史动机与演化」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义」的核心机制、典型用法与常见陷阱
- 掌握「3. 理论推导与证明」的核心机制、典型用法与常见陷阱
- 掌握「4. 代码示例」的核心机制、典型用法与常见陷阱
- 掌握「5. 对比分析」的核心机制、典型用法与常见陷阱


> 本章节系统讲解 C++ 编译期计算体系：从 C++11 引入的 `constexpr` 关键字，到 C++14 放宽的函数体约束，到 C++17 的 `constexpr if` 与 `constexpr` lambda，再到 C++20 引入的 `consteval`（立即函数）、`constinit`（编译期初始化）、constexpr 容器与 constexpr 虚函数，以及 C++23 进一步扩展的 constexpr 标准库与 constexpr 多态。内容对标 MIT 6.172 / Stanford CS106L / CMU 15-410 课程深度，融合 GCC、Clang、MSVC 三大编译器的实现差异与 Boost.Hana、Boost.Mp11、EASTL 等工业级库的实践。

---

## 1. 历史动机与演化

### 1.1 前置背景：C 时代的 `const` 与宏（1972-1985）

C 语言通过 `#define` 宏与 `const` 关键字定义常量：

```c
#define MAX_SIZE 1024
const double PI = 3.14159;
```

二者存在根本缺陷：
- **宏**：无类型检查、作用域全局、调试困难、容易被意外重定义。
- **`const` 变量**：在 C 中并非真正的编译期常量，不能用于数组大小、`case` 标签等需要"常量表达式"的场合（C++ 中 `const` 整型变量可作为常量表达式，但仍是"运行期只读"语义）。

```c
const int N = 10;
int arr[N];            // C 中错误（N 不是常量表达式），C++ 中正确
switch (n) {
    case N: break;     // C 中错误，C++ 中正确
}
```

### 1.2 C++98 的折中：`const` 与模板枚举

C++98 通过放宽 `const` 整型的限制部分解决了问题，但浮点、字符串等仍无法作为常量表达式：

```cpp
const double PI = 3.14159;
// constexpr double arr[PI];  // 错误：PI 不是常量表达式（C++98）

// 开发者只能通过模板元编程模拟编译期计算
template <int N>
struct Factorial {
    static const int value = N * Factorial<N - 1>::value;
};
template <>
struct Factorial<0> {
    static const int value = 1;
};

int x = Factorial<5>::value;  // 120，编译期计算
```

模板元编程虽然强大，但语法晦涩、错误信息冗长、开发体验极差，业界急需"普通 C++ 代码表达编译期计算"的机制。

### 1.3 C++11：`constexpr` 的诞生（2011）

C++11 引入 `constexpr` 关键字，允许在编译期求值的函数与变量：

```cpp
// C++11 constexpr 函数：限制为单条 return 语句
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

constexpr int val = factorial(5);  // 120，编译期计算
static_assert(val == 120, "factorial(5) should be 120");
```

C++11 `constexpr` 的核心限制：
- 函数体只能包含一条 `return` 语句（可通过三元运算符与递归模拟分支与循环）。
- 函数返回类型不能为 `void`（C++14 放宽）。
- 不能使用局部变量、循环、`if-else` 语句。
- 不能调用非 `constexpr` 函数。

### 1.4 C++14：放宽函数体约束（2014）

C++14 大幅放宽 `constexpr` 函数的限制，允许使用局部变量、循环、条件语句、多 return：

```cpp
// C++14 constexpr 函数：完整 C++ 语法
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

constexpr int fibonacci(int n) {
    if (n <= 1) return n;
    int a = 0, b = 1;
    for (int i = 2; i <= n; ++i) {
        int tmp = a + b;
        a = b;
        b = tmp;
    }
    return b;
}

static_assert(factorial(10) == 3628800, "");
static_assert(fibonacci(20) == 6765, "");
```

C++14 仍有的限制：
- 不能使用 `goto`、`asm`、`try-catch`（C++20 部分放宽）。
- 不能调用非 `constexpr` 函数。
- 不能使用 `thread_local`、`static` 局部变量（C++23 部分放宽）。
- 不能有虚函数调用（C++20 放宽）。

### 1.5 C++17：`constexpr if` 与 `constexpr` lambda（2017）

C++17 引入 `constexpr if`，在编译期进行条件分支，未选中的分支不会被实例化：

```cpp
template <typename T>
auto process(T value) {
    if constexpr (std::is_integral_v<T>) {
        return value * 2;
    } else if constexpr (std::is_floating_point_v<T>) {
        return value + 0.5;
    } else {
        return value;
    }
}
```

`constexpr if` 的革命性意义：
- 简化 SFINAE 与标签派发的复杂写法。
- 未选中分支不会被实例化，避免无效代码生成错误。
- 编译期与运行期逻辑统一表达。

C++17 同时允许 lambda 隐式或显式声明为 `constexpr`：

```cpp
auto square = [](int n) constexpr { return n * n; };
static_assert(square(5) == 25, "");
```

### 1.6 C++20：`consteval`、`constinit`、constexpr 容器与虚函数（2020）

C++20 是编译期计算的"大爆发"标准，引入多项关键特性：

#### 1.6.1 `consteval`：立即函数

```cpp
consteval int square(int n) { return n * n; }

constexpr int x = square(5);   // 正确：编译期调用
// int y = square(std::cin.get());  // 错误：不能在运行期调用
```

`consteval` 强制函数在编译期执行，是"必须编译期"语义的明确表达。

#### 1.6.2 `constinit`：编译期初始化

```cpp
constinit int counter = square(5);  // 编译期初始化为 25
counter++;                           // 运行期可修改

// 对比：constexpr 全局变量不可修改
constexpr int MAX = 100;
// MAX++;  // 错误
```

`constinit` 解决"静态初始化顺序问题"（SIOF）：保证变量在编译期完成初始化，不依赖运行期动态初始化顺序。

#### 1.6.3 constexpr 容器

C++20 允许 `std::vector`、`std::string` 在 constexpr 上下文中使用：

```cpp
#include <vector>
#include <string>

constexpr int sum_vector() {
    std::vector<int> v = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int x : v) sum += x;
    return sum;
}

static_assert(sum_vector() == 15, "");

constexpr std::string make_greeting() {
    std::string s = "Hello, ";
    s += "World!";
    return s;
}

// C++20 允许 constexpr std::string，但其析构必须在编译期完成
```

constexpr 容器要求"编译期分配的内存必须在编译期释放"，称为"constexpr 内存模型"。

#### 1.6.4 constexpr 虚函数

```cpp
struct Base {
    constexpr virtual int f() const { return 1; }
};

struct Derived : Base {
    constexpr int f() const override { return 2; }
};

constexpr int call(Base const& b) { return b.f(); }

constexpr Derived d;
static_assert(call(d) == 2, "");  // 编译期多态调用
```

#### 1.6.5 其他 C++20 constexpr 扩展

- `std::is_constant_evaluated()`：在运行期与编译期产生不同代码。
- `try-catch` 在 constexpr 函数中允许（但 `throw` 仍不允许）。
- `dynamic_cast`、`typeid` 在 constexpr 上下文允许（C++23 进一步标准化）。
- `union` 的活跃成员切换允许。
- `asm` 与 `goto` 仍不允许。

### 1.7 C++23：constexpr 标准库扩展（2023）

C++23 进一步扩展 constexpr 的适用范围：

```cpp
#include <cmath>

// C++23: std::atan2 等数学函数标记为 constexpr
constexpr double compute_angle(double x, double y) {
    return std::atan2(y, x);
}

// C++23: constexpr 容器更宽松
// 允许 constexpr std::optional、std::variant、std::expected
#include <optional>
constexpr std::optional<int> parse_int(const char* s) {
    int val = 0;
    if (!*s) return std::nullopt;
    while (*s) {
        if (*s < '0' || *s > '9') return std::nullopt;
        val = val * 10 + (*s - '0');
        ++s;
    }
    return val;
}

static_assert(parse_int("123").value() == 123, "");
static_assert(!parse_int("abc").has_value(), "");
```

C++23 关键扩展：
- `<cmath>` 中大量数学函数标记为 constexpr。
- `std::optional`、`std::variant`、`std::expected` 支持 constexpr。
- `std::bitset`、`std::format` 支持 constexpr。
- `if consteval` 替代 `std::is_constant_evaluated()`，更清晰的编译期分支。
- 允许 constexpr 函数中的 `static` 局部变量（受限）。

### 1.8 C++26 展望：反射与编译期编程

C++26 提案（P2996 静态反射）将革命性扩展编译期计算能力：

```cpp
// C++26 提案（示意，尚未标准化）
#include <meta>

struct Point { int x, y; };

constexpr auto reflect_point() {
    // 编译期反射：获取类的所有成员
    auto members = std::meta::members_of(^Point);
    for (auto m : members) {
        std::cout << std::meta::name_of(m) << "\n";  // x, y
    }
    return members.size();
}

static_assert(reflect_point() == 2, "");
```

反射与 constexpr 的结合将使编译期元编程达到新高度：编译期生成序列化代码、编译期 ORM、编译期依赖注入等。

---

## 2. 形式化定义

### 2.1 常量表达式（Constant Expression）

**定义 3.1**（常量表达式）：常量表达式是 C++ 程序中可在编译期求值的表达式，其求值结果可作为编译期常量使用（如数组大小、模板参数、`case` 标签等）。

$$
\text{ConstantExpr} \triangleq \{ e \mid \text{eval}(e, \text{compile\_time}) \text{ is well-defined} \}
$$

**归类**：
- 字面量（literal）：`42`、`3.14`、`"hello"`、`true`。
- `constexpr` 变量：`constexpr int N = 10;`。
- `const` 整型变量且以常量表达式初始化：`const int N = 10;`（C++98 起允许）。
- `constexpr` 函数在编译期上下文中的调用：`factorial(5)`。
- 模板非类型参数：`template <int N>` 中的 `N`。

### 2.2 `constexpr` 函数

**定义 3.2**（constexpr 函数）：`constexpr` 函数是声明为可在编译期求值的函数，其求值上下文既可以是编译期也可以是运行期：

$$
\text{constexpr } f : \text{Args} \to \text{Result} \triangleq \forall a \in \text{ConstantExpr}^n: f(a) \in \text{ConstantExpr}
$$

即：当所有参数都是常量表达式时，调用结果也是常量表达式。

**约束**（C++20）：
- 函数体不能包含 `goto`、`asm`、`thread_local`、非字面类型的 `static` 变量。
- 不能调用非 `constexpr` 函数（除非在运行期上下文中）。
- 不能有 `try-catch` 中的 `throw` 表达式（C++20 允许 `try-catch`，但 `throw` 仍禁止）。
- 虚函数可为 `constexpr`（C++20）。

### 2.3 `consteval` 函数（立即函数）

**定义 3.3**（立即函数）：`consteval` 函数是必须在编译期求值的函数，其求值上下文只能是编译期：

$$
\text{consteval } f : \text{ConstantExpr}^n \to \text{ConstantExpr} \triangleq \forall a: f(a) \text{ requires } a \in \text{ConstantExpr}^n
$$

**约束**：
- 参数必须是常量表达式。
- 不能在运行期上下文中调用。
- 不能取地址形成运行期函数指针。
- 不能用于 `constexpr` 函数的非编译期分支（除非通过 `if consteval` 显式区分）。

**对比**：

| 属性                | `constexpr` 函数        | `consteval` 函数        |
| ------------------- | ----------------------- | ----------------------- |
| 编译期调用          | 允许                    | 允许（必须）            |
| 运行期调用          | 允许                    | 禁止                    |
| 取函数地址          | 允许                    | 仅在编译期上下文允许    |
| 参数约束            | 无                      | 必须是常量表达式        |
| 用途                | 双模式（编译期/运行期） | 强制编译期              |

### 2.4 `constinit` 变量

**定义 3.4**（constinit 变量）：`constinit` 变量是具有静态存储期（static storage duration）或线程存储期（thread storage duration）的变量，必须在编译期完成初始化：

$$
\text{constinit } v \triangleq \text{storage\_duration}(v) \in \{\text{static}, \text{thread}\} \land \text{init}(v) \in \text{ConstantExpr}
$$

**性质**：
- 仅约束初始化时机，不约束可变性：`constinit` 变量在运行期可修改（与 `constexpr` 不同）。
- 解决静态初始化顺序问题（SIOF）：保证编译期完成初始化，不依赖运行期动态初始化顺序。
- 不能与 `constexpr` 同时使用（`constexpr` 隐含 `const`，而 `constinit` 不要求 `const`）。
- 不能与 `thread_local` 同时使用（C++20 起允许）。

### 2.5 求值上下文（Evaluation Context）

**定义 3.5**（求值上下文）：求值上下文是表达式求值发生的环境，分为编译期上下文（constant evaluation context）与运行期上下文（runtime evaluation context）：

$$
\text{Context} \triangleq \text{CompileTime} \mid \text{RunTime}
$$

**编译期上下文**包括：
- `static_assert` 的参数。
- 模板非类型参数。
- 数组大小、`case` 标签、位域长度。
- `constexpr` 或 `constinit` 变量的初始化器。
- `if constexpr` 的条件。
- `consteval` 函数的参数与返回值。

**运行期上下文**：除上述以外的所有表达式求值。

**关键性质**：同一 `constexpr` 函数可在两种上下文中产生不同代码：

```cpp
constexpr int f(int n) {
    if (std::is_constant_evaluated()) {  // C++20
        return n * 2;       // 编译期路径
    } else {
        return n * 3;       // 运行期路径
    }
}

constexpr int a = f(5);     // 10（编译期）
int x = std::cin.get();
int b = f(x);               // 3x（运行期）
```

### 2.6 `if constexpr` 与 `if consteval`

**定义 3.6**（`if constexpr`）：`if constexpr` 是编译期条件分支，条件必须是常量表达式，未选中分支不会被实例化：

$$
\text{if constexpr } (c) S_1 \text{ else } S_2 \triangleq \text{if } c \text{ then instantiate } S_1 \text{ else instantiate } S_2
$$

**定义 3.7**（`if consteval`，C++23）：`if consteval` 是基于求值上下文的条件分支，不要求条件为常量表达式：

$$
\text{if consteval } S_1 \text{ else } S_2 \triangleq \text{if } \text{in\_compile\_time\_context} \text{ then } S_1 \text{ else } S_2
$$

**对比**：

| 特性           | `if constexpr`            | `if consteval`             |
| -------------- | ------------------------- | -------------------------- |
| 条件           | 必须是常量表达式          | 无条件，自动判断求值上下文 |
| 未选中分支     | 不实例化                  | 实例化但不执行             |
| 主要用途       | 模板元编程中的类型分支    | 区分编译期与运行期代码     |
| 引入标准       | C++17                     | C++23                      |

### 2.7 字面类型（Literal Type）

**定义 3.8**（字面类型）：字面类型是可作为 `constexpr` 变量类型的类型，其对象可在编译期构造、析构、复制：

$$
\text{LiteralType} \triangleq \{ T \mid \text{trivial\_dtor}(T) \lor \text{constexpr\_dtor}(T) \land \text{all\_members\_literal}(T) \}
$$

**字面类型的条件**（C++20）：
- 析构函数是平凡的，或为 `constexpr` 析构函数。
- 所有非静态数据成员是字面类型。
- 若有基类，基类必须是字面类型。
- 若有联合体成员，活跃成员是字面类型。

**字面类型的例子**：
- 标量类型：`int`、`double`、`char*`、枚举。
- 字面类：`constexpr` 构造的类。
- `std::array<T, N>`（若 `T` 为字面类型）。
- `std::vector<T>`（C++20 起，但析构必须在编译期）。
- `std::string`（C++20 起，同上）。

### 2.8 常量初始化（Constant Initialization）

**定义 3.9**（常量初始化）：常量初始化是静态存储期或线程存储期变量在编译期完成的初始化：

$$
\text{ConstantInit}(v) \triangleq \text{init}(v) \text{ is performed at compile time}
$$

**与动态初始化的对比**：

| 属性           | 常量初始化                       | 动态初始化                         |
| -------------- | -------------------------------- | ---------------------------------- |
| 时机           | 编译期                           | 运行期（程序启动时）               |
| 顺序           | 编译期确定，无 SIOF              | 跨翻译单元不确定，可能 SIOF        |
| 触发条件       | 初始化器是常量表达式             | 初始化器不是常量表达式             |
| `constinit`    | 强制要求                         | 禁止                               |

### 2.9 编译期内存模型

**定义 3.10**（编译期内存模型）：C++20 起，`constexpr` 函数中可使用 `new`/`delete` 分配内存，但所有编译期分配的内存必须在编译期释放：

$$
\forall p \text{ allocated in } \text{CompileTime}: \text{deallocate}(p) \text{ before end of } \text{CompileTime}
$$

**约束**：
- 编译期分配的内存不能泄漏到运行期。
- `constexpr` 函数返回的 `std::vector`、`std::string` 必须在编译期析构，或转换为非 constexpr 上下文。
- C++20 的"constexpr 内存"由编译器模拟实现，并非真正的堆分配。

---

## 3. 理论推导与证明

### 3.1 `constexpr` 函数的双模式正确性

**定理 4.1**（constexpr 双模式正确性）：`constexpr` 函数在编译期与运行期产生相同结果（若无 `std::is_constant_evaluated()` 分支）。

**证明**：设 `constexpr` 函数 `f` 不含 `std::is_constant_evaluated()` 分支。

1. 编译期求值：编译器解释执行 `f` 的源码，按照 C++ 抽象机语义求值。
2. 运行期求值：编译器生成 `f` 的机器码，运行时按相同语义执行。
3. C++ 标准规定：`constexpr` 函数在两种上下文中具有相同的可观察行为（observable behavior）。

因此，`f` 在编译期与运行期产生相同结果。$\square$

**例外**：若 `f` 使用 `std::is_constant_evaluated()` 或 `if consteval`，则编译期与运行期可产生不同结果（这是 C++20 起的"上下文敏感"特性）。

### 3.2 编译期计算的停机性

**定理 4.2**（编译期计算的停机性）：C++ 编译期计算保证停机，编译器通过深度限制强制终止无限递归。

**证明**：C++ 标准规定编译器必须对编译期递归深度与模板实例化深度施加实现定义的限制：

- 递归深度：典型为 512（GCC `constexpr-depth`，Clang `fconstexpr-steps`）。
- 模板实例化深度：典型为 1024（GCC `ftemplate-depth`）。
- 编译期求值步数：典型为 1,048,576 步（Clang `constexpr-steps`）。

超过限制时编译器报错：

```
error: constexpr evaluation exceeded maximum depth of 512 calls
```

由于存在有限上限，编译期计算保证停机。$\square$

**推论**：C++ 编译期计算是图灵完备的（理论上），但实际受限于编译器的深度与步数限制，无法表达任意长计算。

### 3.3 `constexpr` 与模板元编程的等价性

**定理 4.3**（编译期计算等价性）：`constexpr` 函数与模板元编程（TMP）在表达能力上等价（均可表达任意编译期可计算函数）。

**证明**：

**方向 1**：TMP 可表达 `constexpr` 函数能表达的所有计算。
- TMP 通过模板特化模拟条件分支。
- TMP 通过递归模板实例化模拟循环与递归。
- TMP 通过模板参数列表模拟函数参数。
- TMP 通过 `static const` 成员模拟返回值。

**方向 2**：`constexpr` 函数可表达 TMP 能表达的所有计算。
- `constexpr` 函数可直接使用普通 C++ 语法。
- 通过 `if constexpr` 实现编译期条件分支。
- 通过递归 `constexpr` 函数实现循环。
- 通过 `consteval` 强制编译期求值。

因此二者表达能力等价。$\square$

**实践差异**：
- `constexpr` 语法更直观、错误信息更友好、调试更方便。
- TMP 在某些场景（如类型计算）仍是必要的，因为 `constexpr` 不能操作类型。
- 现代实践倾向于"类型计算用 TMP，值计算用 `constexpr`"。

### 3.4 `consteval` 的强制编译期语义

**定理 4.4**（consteval 强制性）：`consteval` 函数的调用必然在编译期求值，不能在运行期执行。

**证明**：C++ 标准规定 `consteval` 函数是"立即函数"（immediate function），其调用必须是常量表达式。

考虑：

```cpp
consteval int f(int n) { return n * 2; }

int x = std::cin.get();
// int y = f(x);  // 错误：x 不是常量表达式
```

编译器在语义分析阶段检查 `consteval` 函数调用的参数是否为常量表达式，若不是则报错。

**唯一例外**：在 `consteval` 函数内部调用其他 `consteval` 函数时，参数可以是该函数的形参（形参在立即函数上下文中视为常量表达式）：

```cpp
consteval int g(int n) { return f(n); }  // 正确：n 在 g 内部视为常量
```

$\square$

### 3.5 `constinit` 解决 SIOF 的正确性

**定理 4.5**（constinit 解决 SIOF）：使用 `constinit` 声明的全局变量不会受静态初始化顺序问题影响。

**证明**：静态初始化顺序问题（SIOF）的根源是：跨翻译单元的动态初始化顺序未定义。

```cpp
// file1.cpp
extern int b;
int a = b + 1;  // 动态初始化，依赖 b

// file2.cpp
extern int a;
int b = a + 1;  // 动态初始化，依赖 a
```

若 `a` 先初始化，则 `a = 0 + 1 = 1`，`b = 1 + 1 = 2`。
若 `b` 先初始化，则 `b = 0 + 1 = 1`，`a = 1 + 1 = 2`。
结果不确定，是 SIOF。

`constinit` 强制变量在编译期完成初始化：

```cpp
// file1.cpp
constinit int a = 10;  // 编译期初始化，不依赖运行期

// file2.cpp
constinit int b = 20;  // 编译期初始化
```

常量初始化在编译期完成，不依赖运行期动态初始化顺序，因此 `constinit` 变量不受 SIOF 影响。$\square$

**注意**：`constinit` 仅保证自身初始化在编译期，不保证其引用的其他变量也是常量初始化。若 `constinit int a = b + 1;` 中 `b` 不是常量表达式，则编译失败。

### 3.6 编译期与运行期开销权衡

**定理 4.6**（编译期开销权衡）：将计算从运行期转移到编译期，运行期开销减少，但编译期开销增加，且增加的编译期开销可能不线性。

**证明**：设函数 `f` 的运行期开销为 $T_r$，编译期开销为 $T_c$，被调用 $N$ 次。

- 运行期方案：总开销 $N \cdot T_r$。
- 编译期方案（`constexpr` 且参数为编译期常量）：总开销 $T_c + N \cdot T_{inline}$，其中 $T_{inline} \approx 0$（编译期结果直接嵌入机器码）。

**关键问题**：$T_c$ 与 $N$ 的关系。
- 若 $N$ 个调用的参数各不相同，编译器需对每个调用独立求值，总编译期开销 $N \cdot T_c$。
- 若 $N$ 个调用的参数相同，编译器可缓存结果，总编译期开销 $T_c$（GCC、Clang 有缓存机制）。

**结论**：
- 编译期计算适合"少量不同参数"的场景（如配置常量、查找表）。
- 不适合"大量不同参数"的场景（如百万次不同输入），否则编译时间爆炸。$\square$

---

## 4. 代码示例

### 4.1 基础：`constexpr` 变量与函数

```cpp
// file: constexpr_basic.cpp
// 编译: g++ -std=c++20 -O2 constexpr_basic.cpp -o constexpr_basic
//       clang++ -std=c++20 -O2 constexpr_basic.cpp -o constexpr_basic
//       cl /std:c++20 /EHsc constexpr_basic.cpp     (MSVC)
#include <iostream>
#include <array>

// C++11 风格：单 return 语句
constexpr int factorial_cxx11(int n) {
    return n <= 1 ? 1 : n * factorial_cxx11(n - 1);
}

// C++14 风格：多语句与循环
constexpr int factorial_cxx14(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

// 编译期常量
constexpr int MAX_SIZE = 1024;
constexpr double PI = 3.14159265358979323846;

// 编译期调用
constexpr int val = factorial_cxx14(10);  // 3628800
static_assert(val == 3628800, "factorial(10) should be 3628800");

// 运行期调用
int main() {
    int n;
    std::cin >> n;
    int result = factorial_cxx14(n);  // 运行期计算
    std::cout << "factorial(" << n << ") = " << result << "\n";
    return 0;
}
```

### 4.2 `consteval`：强制编译期计算

```cpp
// file: consteval_demo.cpp
// 编译: g++ -std=c++20 -O2 consteval_demo.cpp -o consteval_demo
#include <iostream>
#include <cstdint>

// consteval 函数：必须在编译期执行
consteval uint32_t fnv1a_hash(const char* str) {
    uint32_t hash = 2166136261u;
    while (*str) {
        hash ^= static_cast<uint32_t>(*str);
        hash *= 16777619u;
        ++str;
    }
    return hash;
}

// 编译期字符串哈希
constexpr uint32_t hash_start = fnv1a_hash("start");
constexpr uint32_t hash_stop = fnv1a_hash("stop");
constexpr uint32_t hash_restart = fnv1a_hash("restart");

// 运行期使用编译期哈希值
void handle_command(const char* cmd) {
    uint32_t h = fnv1a_hash(cmd);  // 错误：cmd 是运行期值
    // 改用运行期哈希函数
    // uint32_t h = runtime_hash(cmd);
    
    if (h == hash_start) {
        std::cout << "Starting...\n";
    } else if (h == hash_stop) {
        std::cout << "Stopping...\n";
    } else if (h == hash_restart) {
        std::cout << "Restarting...\n";
    }
}

// consteval 用于编译期类型注册
template <typename T>
consteval uint32_t type_id() {
    // 使用 __FUNCSIG__ (MSVC) 或 __PRETTY_FUNCTION__ (GCC/Clang)
    #ifdef _MSC_VER
        return fnv1a_hash(__FUNCSIG__);
    #else
        return fnv1a_hash(__PRETTY_FUNCTION__);
    #endif
}

static_assert(type_id<int>() != type_id<double>(), "type ids should differ");
static_assert(type_id<int>() == type_id<int>(), "type ids should match");

int main() {
    std::cout << "hash_start = " << hash_start << "\n";
    std::cout << "type_id<int> = " << type_id<int>() << "\n";
    std::cout << "type_id<double> = " << type_id<double>() << "\n";
    return 0;
}
```

### 4.3 `constinit`：编译期初始化与运行期可变

```cpp
// file: constinit_demo.cpp
// 编译: g++ -std=c++20 -O2 constinit_demo.cpp -o constinit_demo
#include <iostream>

// 编译期初始化的全局计数器，运行期可修改
constinit int global_counter = 0;

// constinit 解决 SIOF
constinit int config_value = 42;

// 对比：constexpr 全局变量不可修改
constexpr int MAX_BUFFER = 1024;

// 错误示例：constinit 不能用于局部变量
// void foo() { constinit int x = 0; }  // 错误：constinit 仅用于静态存储期

// constinit 与 const 组合：编译期初始化且不可修改
constinit const int VERSION = 1;

int main() {
    std::cout << "Initial counter: " << global_counter << "\n";  // 0
    global_counter++;
    global_counter += 10;
    std::cout << "After modification: " << global_counter << "\n";  // 11
    
    std::cout << "MAX_BUFFER: " << MAX_BUFFER << "\n";
    // MAX_BUFFER++;  // 错误：constexpr 变量是 const
    
    std::cout << "VERSION: " << VERSION << "\n";
    return 0;
}
```

### 4.4 `constexpr if`：编译期条件分支

```cpp
// file: constexpr_if_demo.cpp
// 编译: g++ -std=c++20 -O2 constexpr_if_demo.cpp -o constexpr_if_demo
#include <iostream>
#include <type_traits>
#include <string>

// 替代 SFINAE：根据类型选择不同实现
template <typename T>
auto to_string(const T& value) {
    if constexpr (std::is_same_v<T, std::string>) {
        return value;
    } else if constexpr (std::is_arithmetic_v<T>) {
        return std::to_string(value);
    } else if constexpr (std::is_enum_v<T>) {
        return std::to_string(static_cast<int>(value));
    } else {
        return std::string("[unknown]");
    }
}

// 编译期递归展开：处理变参包
template <typename... Ts>
void print_all(const Ts&... args) {
    ((std::cout << args << " "), ...);
    std::cout << "\n";
}

// constexpr if 用于条件编译
template <typename T>
void process(T value) {
    if constexpr (std::is_integral_v<T>) {
        std::cout << "Integral: " << value * 2 << "\n";
    } else if constexpr (std::is_floating_point_v<T>) {
        std::cout << "Floating: " << value + 0.5 << "\n";
    } else {
        std::cout << "Other: " << value << "\n";
    }
}

// 编译期选择不同算法
template <typename Iterator>
void sort(Iterator begin, Iterator end) {
    auto size = std::distance(begin, end);
    if constexpr (sizeof(typename Iterator::value_type) <= 8) {
        // 小类型使用快速排序
        std::cout << "Using quicksort\n";
    } else {
        // 大类型使用归并排序
        std::cout << "Using mergesort\n";
    }
}

int main() {
    std::cout << to_string(42) << "\n";
    std::cout << to_string(3.14) << "\n";
    std::cout << to_string(std::string("hello")) << "\n";
    
    print_all(1, 2.5, "hello", 'c');
    
    process(10);      // Integral: 20
    process(3.14);    // Floating: 3.64
    
    return 0;
}
```

### 4.5 `constexpr` 类与字面类型

```cpp
// file: constexpr_class.cpp
// 编译: g++ -std=c++20 -O2 constexpr_class.cpp -o constexpr_class
#include <iostream>
#include <cmath>
#include <array>

// constexpr 类：所有成员函数都可在编译期调用
class Point {
    double x_, y_;
public:
    // constexpr 构造函数
    constexpr Point() : x_(0), y_(0) {}
    constexpr Point(double x, double y) : x_(x), y_(y) {}
    
    // constexpr 访问器
    constexpr double x() const { return x_; }
    constexpr double y() const { return y_; }
    
    // constexpr 修改器
    constexpr void set_x(double x) { x_ = x; }
    constexpr void set_y(double y) { y_ = y; }
    
    // constexpr 方法
    constexpr double distance_squared() const {
        return x_ * x_ + y_ * y_;
    }
    
    // constexpr 运算符
    constexpr Point operator+(const Point& other) const {
        return Point(x_ + other.x_, y_ + other.y_);
    }
    
    constexpr Point operator-(const Point& other) const {
        return Point(x_ - other.x_, y_ - other.y_);
    }
    
    constexpr bool operator==(const Point& other) const {
        return x_ == other.x_ && y_ == other.y_;
    }
};

// constexpr 容器：编译期生成
constexpr std::array<Point, 4> create_square() {
    std::array<Point, 4> points = {
        Point(0, 0),
        Point(1, 0),
        Point(1, 1),
        Point(0, 1)
    };
    return points;
}

// 编译期计算多边形周长
constexpr double perimeter(const std::array<Point, 4>& points) {
    double sum = 0;
    for (size_t i = 0; i < points.size(); ++i) {
        Point diff = points[(i + 1) % points.size()] - points[i];
        sum += std::sqrt(diff.distance_squared());
    }
    return sum;
}

// 编译期验证
constexpr Point p1(3, 4);
static_assert(p1.distance_squared() == 25.0, "");

constexpr auto square = create_square();
static_assert(square[0] == Point(0, 0), "");
static_assert(square[1] == Point(1, 0), "");

// C++23: std::sqrt 标记为 constexpr
// static_assert(perimeter(square) == 4.0, "");  // C++23 起

int main() {
    constexpr Point origin(0, 0);
    constexpr Point p(3, 4);
    constexpr Point sum = origin + p;
    
    std::cout << "p.distance_squared() = " << p.distance_squared() << "\n";
    std::cout << "sum = (" << sum.x() << ", " << sum.y() << ")\n";
    
    // 运行期使用
    Point runtime_p(5, 12);
    std::cout << "runtime_p.distance_squared() = " 
              << runtime_p.distance_squared() << "\n";
    
    return 0;
}
```

### 4.6 `constexpr` Lambda

```cpp
// file: constexpr_lambda.cpp
// 编译: g++ -std=c++20 -O2 constexpr_lambda.cpp -o constexpr_lambda
#include <iostream>
#include <array>

// constexpr lambda：可在编译期调用
auto square = [](int n) constexpr { return n * n; };

// 隐式 constexpr：若 lambda 体满足 constexpr 约束，自动为 constexpr
auto cube = [](int n) { return n * n * n; };  // 隐式 constexpr

// 模板 lambda 与 constexpr if 结合
auto process = []<typename T>(T value) {
    if constexpr (std::is_integral_v<T>) {
        return value * 2;
    } else {
        return value;
    }
};

// 编译期算法：使用 constexpr lambda
constexpr int sum_of_squares(int n) {
    int sum = 0;
    for (int i = 1; i <= n; ++i) {
        sum += square(i);
    }
    return sum;
}

static_assert(square(5) == 25, "");
static_assert(sum_of_squares(10) == 385, "");

// constexpr lambda 用于编译期生成查找表
constexpr auto make_sin_table() {
    std::array<double, 360> table{};
    for (int i = 0; i < 360; ++i) {
        // 使用泰勒展开近似 sin（避免依赖 __builtin_sin）
        double x = i * 3.14159265358979 / 180.0;
        double result = x;
        double term = x;
        for (int n = 1; n < 10; ++n) {
            term *= -x * x / ((2 * n) * (2 * n + 1));
            result += term;
        }
        table[i] = result;
    }
    return table;
}

constexpr auto SIN_TABLE = make_sin_table();
static_assert(SIN_TABLE[0] == 0.0, "");
static_assert(SIN_TABLE[90] > 0.99 && SIN_TABLE[90] < 1.01, "");
static_assert(SIN_TABLE[180] < 0.01 && SIN_TABLE[180] > -0.01, "");

int main() {
    std::cout << "square(7) = " << square(7) << "\n";
    std::cout << "sum_of_squares(10) = " << sum_of_squares(10) << "\n";
    std::cout << "sin(30) = " << SIN_TABLE[30] << "\n";
    std::cout << "sin(90) = " << SIN_TABLE[90] << "\n";
    return 0;
}
```

### 4.7 C++20 constexpr 容器

```cpp
// file: constexpr_containers.cpp
// 编译: g++ -std=c++20 -O2 constexpr_containers.cpp -o constexpr_containers
#include <vector>
#include <string>
#include <algorithm>
#include <iostream>

// C++20: constexpr std::vector
constexpr int sum_vector() {
    std::vector<int> v;
    v.push_back(1);
    v.push_back(2);
    v.push_back(3);
    v.push_back(4);
    v.push_back(5);
    
    int sum = 0;
    for (int x : v) {
        sum += x;
    }
    return sum;
}

static_assert(sum_vector() == 15, "");

// constexpr std::string
constexpr std::string make_greeting(const char* name) {
    std::string s = "Hello, ";
    s += name;
    s += "!";
    return s;
}

// 注意：constexpr std::string 必须在编译期析构
// 不能直接 constexpr auto greeting = make_greeting("World");
// 而应：
constexpr std::size_t greeting_length() {
    auto s = make_greeting("World");
    return s.size();
}

static_assert(greeting_length() == 13, "");  // "Hello, World!"

// constexpr 算法
constexpr bool is_sorted_constexpr() {
    std::vector<int> v = {1, 2, 3, 4, 5};
    return std::is_sorted(v.begin(), v.end());
}

static_assert(is_sorted_constexpr(), "");

// constexpr 排序
constexpr int sorted_median() {
    std::vector<int> v = {5, 2, 8, 1, 9, 3, 7};
    std::sort(v.begin(), v.end());
    return v[v.size() / 2];
}

static_assert(sorted_median() == 5, "");

int main() {
    std::cout << "sum_vector() = " << sum_vector() << "\n";
    std::cout << "greeting_length() = " << greeting_length() << "\n";
    std::cout << "sorted_median() = " << sorted_median() << "\n";
    
    // 运行期使用
    std::string greeting = make_greeting("C++20");
    std::cout << greeting << "\n";
    
    return 0;
}
```

### 4.8 `std::is_constant_evaluated()` 与 `if consteval`

```cpp
// file: is_constant_evaluated.cpp
// 编译: g++ -std=c++20 -O2 is_constant_evaluated.cpp -o is_constant_evaluated
//       g++ -std=c++23 -O2 is_constant_evaluated.cpp -o is_constant_evaluated  (if consteval)
#include <iostream>
#include <cmath>

// C++20: std::is_constant_evaluated()
constexpr double sqrt_smart(double x) {
    if (std::is_constant_evaluated()) {
        // 编译期：使用牛顿迭代法
        if (x <= 0) return 0;
        double guess = x / 2;
        for (int i = 0; i < 20; ++i) {
            guess = (guess + x / guess) / 2;
        }
        return guess;
    } else {
        // 运行期：使用 std::sqrt
        return std::sqrt(x);
    }
}

// C++23: if consteval（更清晰）
constexpr double sqrt_cxx23(double x) {
    if consteval {
        if (x <= 0) return 0;
        double guess = x / 2;
        for (int i = 0; i < 20; ++i) {
            guess = (guess + x / guess) / 2;
        }
        return guess;
    } else {
        return std::sqrt(x);
    }
}

// 编译期与运行期产生不同实现
static_assert(sqrt_smart(16.0) == 4.0, "");
static_assert(sqrt_cxx23(25.0) == 5.0, "");

int main() {
    // 编译期调用
    constexpr double compile_time_result = sqrt_smart(16.0);
    std::cout << "Compile-time sqrt(16) = " << compile_time_result << "\n";
    
    // 运行期调用
    double x;
    std::cin >> x;
    double runtime_result = sqrt_smart(x);
    std::cout << "Runtime sqrt(" << x << ") = " << runtime_result << "\n";
    
    return 0;
}
```

### 4.9 编译期字符串解析

```cpp
// file: compile_time_string.cpp
// 编译: g++ -std=c++20 -O2 compile_time_string.cpp -o compile_time_string
#include <iostream>
#include <cstdint>
#include <array>

// 编译期字符串包装
template <size_t N>
struct FixedString {
    char data[N]{};
    
    constexpr FixedString(const char (&str)[N]) {
        for (size_t i = 0; i < N; ++i) {
            data[i] = str[i];
        }
    }
    
    constexpr char operator[](size_t i) const { return data[i]; }
    constexpr size_t size() const { return N - 1; }  // 不含末尾 '\0'
    
    constexpr bool starts_with(const char* prefix) const {
        size_t i = 0;
        while (prefix[i]) {
            if (i >= N - 1 || data[i] != prefix[i]) return false;
            ++i;
        }
        return true;
    }
    
    constexpr bool ends_with(const char* suffix) const {
        size_t suffix_len = 0;
        while (suffix[suffix_len]) ++suffix_len;
        if (suffix_len > N - 1) return false;
        for (size_t i = 0; i < suffix_len; ++i) {
            if (data[N - 2 - i] != suffix[suffix_len - 1 - i]) return false;
        }
        return true;
    }
};

// 编译期版本号解析
struct Version {
    int major, minor, patch;
    
    constexpr bool operator==(const Version& other) const {
        return major == other.major && minor == other.minor && patch == other.patch;
    }
    
    constexpr bool operator<(const Version& other) const {
        if (major != other.major) return major < other.major;
        if (minor != other.minor) return minor < other.minor;
        return patch < other.patch;
    }
};

constexpr Version parse_version(const char* str) {
    Version v{0, 0, 0};
    int* current = &v.major;
    while (*str) {
        if (*str == '.') {
            if (current == &v.major) current = &v.minor;
            else if (current == &v.minor) current = &v.patch;
        } else if (*str >= '0' && *str <= '9') {
            *current = *current * 10 + (*str - '0');
        }
        ++str;
    }
    return v;
}

// 编译期验证
constexpr auto ver = parse_version("2.4.1");
static_assert(ver.major == 2, "");
static_assert(ver.minor == 4, "");
static_assert(ver.patch == 1, "");

constexpr Version v1 = parse_version("1.0.0");
constexpr Version v2 = parse_version("2.0.0");
static_assert(v1 < v2, "");

// 编译期路由匹配
constexpr auto api_path = FixedString("/api/users");
static_assert(api_path.starts_with("/api"), "");
static_assert(api_path.ends_with("users"), "");

// 编译期 JSON 解析（简化版）
struct JsonValue {
    enum class Type { Null, Bool, Int, String };
    Type type = Type::Null;
    bool bool_val = false;
    int int_val = 0;
    char string_val[64] = "";
};

constexpr JsonValue parse_json(const char* str) {
    JsonValue v;
    // 跳过空白
    while (*str == ' ' || *str == '\t') ++str;
    
    if (*str == 'n') {
        v.type = JsonValue::Type::Null;
    } else if (*str == 't' || *str == 'f') {
        v.type = JsonValue::Type::Bool;
        v.bool_val = (*str == 't');
    } else if (*str == '"') {
        v.type = JsonValue::Type::String;
        ++str;  // 跳过开头引号
        size_t i = 0;
        while (*str && *str != '"' && i < 63) {
            v.string_val[i++] = *str++;
        }
    } else if (*str >= '0' && *str <= '9' || *str == '-') {
        v.type = JsonValue::Type::Int;
        bool negative = false;
        if (*str == '-') { negative = true; ++str; }
        while (*str >= '0' && *str <= '9') {
            v.int_val = v.int_val * 10 + (*str - '0');
            ++str;
        }
        if (negative) v.int_val = -v.int_val;
    }
    return v;
}

constexpr auto json_null = parse_json("null");
static_assert(json_null.type == JsonValue::Type::Null, "");

constexpr auto json_true = parse_json("true");
static_assert(json_true.type == JsonValue::Type::Bool && json_true.bool_val, "");

constexpr auto json_int = parse_json("42");
static_assert(json_int.type == JsonValue::Type::Int && json_int.int_val == 42, "");

int main() {
    std::cout << "Version: " << ver.major << "." << ver.minor << "." << ver.patch << "\n";
    std::cout << "API path: ";
    for (size_t i = 0; i < api_path.size(); ++i) {
        std::cout << api_path[i];
    }
    std::cout << "\n";
    return 0;
}
```

### 4.10 编译期查找表生成

```cpp
// file: lookup_tables.cpp
// 编译: g++ -std=c++20 -O2 lookup_tables.cpp -o lookup_tables
#include <iostream>
#include <array>
#include <cstdint>

// 编译期生成质数表（埃拉托斯特尼筛法）
constexpr std::array<bool, 1000> sieve_of_eratosthenes() {
    std::array<bool, 1000> is_prime{};
    for (int i = 2; i < 1000; ++i) is_prime[i] = true;
    for (int i = 2; i * i < 1000; ++i) {
        if (is_prime[i]) {
            for (int j = i * i; j < 1000; j += i) {
                is_prime[j] = false;
            }
        }
    }
    return is_prime;
}

constexpr auto PRIME_TABLE = sieve_of_eratosthenes();

constexpr bool is_prime(int n) {
    if (n < 2 || n >= 1000) return false;
    return PRIME_TABLE[n];
}

static_assert(is_prime(2), "");
static_assert(is_prime(17), "");
static_assert(!is_prime(15), "");
static_assert(is_prime(997), "");

// 编译期生成斐波那契数列
constexpr std::array<uint64_t, 50> fibonacci_table() {
    std::array<uint64_t, 50> table{};
    table[0] = 0;
    table[1] = 1;
    for (int i = 2; i < 50; ++i) {
        table[i] = table[i - 1] + table[i - 2];
    }
    return table;
}

constexpr auto FIB_TABLE = fibonacci_table();
static_assert(FIB_TABLE[10] == 55, "");
static_assert(FIB_TABLE[20] == 6765, "");
static_assert(FIB_TABLE[49] == 7778742049ULL, "");

// 编译期 CRC32 表
constexpr uint32_t crc32_poly = 0xEDB88320;

constexpr uint32_t crc32_table_entry(int i) {
    uint32_t crc = static_cast<uint32_t>(i);
    for (int j = 0; j < 8; ++j) {
        crc = (crc >> 1) ^ ((crc & 1) * crc32_poly);
    }
    return crc;
}

constexpr std::array<uint32_t, 256> make_crc32_table() {
    std::array<uint32_t, 256> table{};
    for (int i = 0; i < 256; ++i) {
        table[i] = crc32_table_entry(i);
    }
    return table;
}

constexpr auto CRC32_TABLE = make_crc32_table();

// 运行期使用编译期生成的表
uint32_t crc32(const char* data, size_t len) {
    uint32_t crc = 0xFFFFFFFF;
    for (size_t i = 0; i < len; ++i) {
        crc = (crc >> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xFF];
    }
    return crc ^ 0xFFFFFFFF;
}

// 编译期计算 CRC32
constexpr uint32_t crc32_constexpr(const char* str) {
    uint32_t crc = 0xFFFFFFFF;
    while (*str) {
        crc = (crc >> 8) ^ CRC32_TABLE[(crc ^ static_cast<uint8_t>(*str)) & 0xFF];
        ++str;
    }
    return crc ^ 0xFFFFFFFF;
}

static_assert(crc32_constexpr("hello") != 0, "");

int main() {
    std::cout << "is_prime(17) = " << is_prime(17) << "\n";
    std::cout << "FIB_TABLE[20] = " << FIB_TABLE[20] << "\n";
    std::cout << "crc32(\"hello\") = " << crc32("hello", 5) << "\n";
    std::cout << "crc32_constexpr(\"hello\") = " << crc32_constexpr("hello") << "\n";
    return 0;
}
```

---

## 5. 对比分析

### 5.1 C++ `constexpr` vs Rust `const fn`

| 特性               | C++ `constexpr`                       | Rust `const fn`                       |
| ------------------ | ------------------------------------- | ------------------------------------- |
| 引入版本           | C++11（2011）                         | Rust 1.32（2019）                     |
| 函数体约束         | C++14 起基本无限制                    | 严格限制（不能有堆分配、浮点运算等）  |
| 条件分支           | `if constexpr`（C++17）              | `if`/`match`（有限支持）              |
| 强制编译期         | `consteval`（C++20）                  | 无（需通过上下文约束）                |
| 编译期初始化       | `constinit`（C++20）                  | `static`/`const` 自动判断             |
| 容器支持           | `std::vector`、`std::string`（C++20）| 仅基本类型与数组                      |
| 浮点运算           | 允许（但实现定义）                    | 1.0 起允许（受 IEEE 754 约束）        |
| 错误信息           | 较友好                                | 较友好                                |

**评价**：
- C++ `constexpr` 更强大、更灵活，支持容器、虚函数、动态分配。
- Rust `const fn` 更保守、更安全，但功能受限。
- 两者均朝"扩展编译期能力"方向演进。

### 5.2 C++ `constexpr` vs Zig `comptime`

| 特性               | C++ `constexpr`                       | Zig `comptime`                        |
| ------------------ | ------------------------------------- | ------------------------------------- |
| 表达方式           | `constexpr`/`consteval`/`constinit`   | `comptime` 关键字标记任意表达式       |
| 类型计算           | 需 TMP，`constexpr` 不能操作类型      | `comptime` 可操作类型，统一类型与值   |
| 泛型               | 模板                                  | `comptime` 函数                       |
| 编译期反射         | C++26 提案                            | 内置支持                              |
| 学习曲线           | 陡峭（多个关键字、TMP）               | 平缓（统一 `comptime`）               |

**评价**：
- Zig 的 `comptime` 设计更统一、更优雅，将类型与值计算合并。
- C++ 的 `constexpr` 是历史演进的产物，与 TMP 并存，复杂度高。
- Zig 的设计哲学值得 C++ 借鉴（C++26 反射提案朝此方向发展）。

### 5.3 C++ `constexpr` vs D `CTFE`

| 特性               | C++ `constexpr`                       | D `CTFE`（Compile-Time Function Evaluation） |
| ------------------ | ------------------------------------- | --------------------------------------------- |
| 引入版本           | C++11（2011）                         | D 2.0（2007）                                 |
| 函数体约束         | 逐步放宽                              | 几乎无限制                                    |
| 字符串操作         | C++20 起支持 `std::string`            | 原生支持                                      |
| 编译期 I/O         | 不支持                                | 支持（编译期 `writeln`）                      |
| 性能               | 高（编译器优化）                      | 较慢（解释执行）                              |

**评价**：
- D 的 CTFE 是 C++ `constexpr` 的先驱，理念更激进。
- C++ `constexpr` 更注重性能与安全，演进更保守。
- D 的 CTFE 启发了 C++ 的设计（特别是 C++14 的放宽）。

### 5.4 `constexpr` vs 模板元编程（TMP）

| 维度               | `constexpr`                           | 模板元编程（TMP）                     |
| ------------------ | ------------------------------------- | ------------------------------------- |
| 表达能力           | 值计算                                | 类型计算 + 值计算                     |
| 语法               | 普通 C++ 语法                         | 模板特化、递归实例化                  |
| 可读性             | 高                                    | 低                                    |
| 错误信息           | 友好                                  | 冗长晦涩                              |
| 调试性             | 可在运行期调试                        | 难以调试                              |
| 编译速度           | 快                                    | 慢（实例化开销）                      |
| 适用场景           | 值计算、编译期常量、查找表            | 类型计算、SFINAE、概念约束            |

**最佳实践**：
- 值计算优先用 `constexpr`。
- 类型计算仍需 TMP 或 `if constexpr`。
- 复杂编译期逻辑用 `constexpr` 函数组织。
- 类型与值混合计算时，TMP 与 `constexpr` 配合使用。

### 5.5 `constexpr` vs `const`

| 特性               | `constexpr`                           | `const`                               |
| ------------------ | ------------------------------------- | ------------------------------------- |
| 语义               | 编译期可求值                          | 运行期只读                            |
| 初始化时机         | 必须编译期                            | 可运行期                              |
| 可修改性           | 变量不可修改（隐式 `const`）          | 不可修改                              |
| 作为常量表达式     | 是                                    | 仅整型且编译期初始化时                |
| 适用范围           | 变量、函数、成员函数                  | 变量、成员函数、指针                  |
| 引入标准           | C++11                                 | C++98（C 继承）                       |

**关键区别**：
```cpp
const int runtime_val = std::cin.get();  // 正确：运行期初始化
// constexpr int runtime_val2 = std::cin.get();  // 错误：必须编译期

constexpr int compile_val = 42;  // 正确：编译期，隐式 const
const int const_val = 42;        // 正确：可作为常量表达式（整型特例）
```

---

## 6. 常见陷阱与反模式

### 6.1 陷阱 1：误以为 `constexpr` 函数一定在编译期执行

**问题描述**：开发者误以为 `constexpr` 函数总是在编译期执行。

**错误代码**：

```cpp
constexpr int f(int n) { return n * 2; }

int main() {
    int x;
    std::cin >> x;
    int y = f(x);  // 运行期执行，不是编译期
    // 期望 y 是编译期常量，实际不是
    // constexpr int z = f(x);  // 错误：x 不是常量表达式
    return 0;
}
```

**正确做法**：
- `constexpr` 函数"可以"在编译期执行，但不"必须"。
- 若需强制编译期，使用 `consteval` 或将结果赋给 `constexpr` 变量。

```cpp
constexpr int f(int n) { return n * 2; }

int main() {
    constexpr int compile_time = f(5);  // 编译期执行
    int x = std::cin.get();
    int runtime = f(x);                 // 运行期执行
    return 0;
}
```

### 6.2 陷阱 2：`constexpr` 函数中调用非 `constexpr` 函数

**问题描述**：在 `constexpr` 函数中调用非 `constexpr` 函数，导致编译错误或运行期降级。

**错误代码**：

```cpp
int runtime_func(int n) { return n + 1; }

constexpr int bad_func(int n) {
    return runtime_func(n);  // 错误：runtime_func 不是 constexpr
}
```

**正确做法**：
- 将 `runtime_func` 改为 `constexpr`。
- 或将 `bad_func` 改为非 `constexpr`。
- 或使用 `if consteval` 在编译期与运行期使用不同实现。

```cpp
constexpr int good_runtime_func(int n) { return n + 1; }

constexpr int good_func(int n) {
    return good_runtime_func(n);  // 正确
}

// 或双模式
constexpr int smart_func(int n) {
    if consteval {
        return n + 1;  // 编译期路径
    } else {
        return runtime_func(n);  // 运行期路径
    }
}
```

### 6.3 陷阱 3：`consteval` 函数在运行期上下文调用

**问题描述**：`consteval` 函数不能在运行期上下文调用。

**错误代码**：

```cpp
consteval int square(int n) { return n * n; }

int main() {
    int x = std::cin.get();
    int y = square(x);  // 错误：x 不是常量表达式
    return 0;
}
```

**正确做法**：
- 检查参数是否为编译期常量。
- 若需运行期调用，改用 `constexpr`。

```cpp
constexpr int square(int n) { return n * n; }  // 改用 constexpr

int main() {
    int x = std::cin.get();
    int y = square(x);  // 正确：运行期执行
    return 0;
}
```

### 6.4 陷阱 4：`constinit` 用于非静态存储期变量

**问题描述**：`constinit` 仅适用于静态存储期或线程存储期变量。

**错误代码**：

```cpp
void foo() {
    constinit int x = 10;  // 错误：局部变量是自动存储期
}
```

**正确做法**：
- `constinit` 仅用于全局变量、静态变量、`thread_local` 变量。

```cpp
constinit int global_x = 10;  // 正确：全局变量
void foo() {
    static constinit int static_x = 10;  // 正确：静态局部变量
    thread_local constinit int tls_x = 10;  // 正确（C++20）
}
```

### 6.5 陷阱 5：过度使用编译期计算导致编译时间爆炸

**问题描述**：将大量计算转移到编译期，导致编译时间显著增加。

**错误代码**：

```cpp
// 编译期计算 1000 万次不同输入的哈希
template <int N>
struct MassiveCompute {
    static constexpr int value = MassiveCompute<N - 1>::value + hash(N);
};

// 实例化 1000 万次，编译时间爆炸
int x = MassiveCompute<10000000>::value;
```

**正确做法**：
- 评估编译期与运行期的权衡。
- 仅对"少量不同参数"的计算使用编译期。
- 对"大量不同参数"的计算保留在运行期。

```cpp
// 仅对常用配置常量使用编译期
constexpr int config_value = compute_config("production");
constexpr int max_connections = compute_max(64);

// 大量输入的计算保留在运行期
int runtime_hash(const std::string& input) { /* ... */ }
```

### 6.6 陷阱 6：`constexpr` 函数中的 `std::is_constant_evaluated()` 误用

**问题描述**：在非 `constexpr` 函数中使用 `std::is_constant_evaluated()` 永远返回 `false`。

**错误代码**：

```cpp
int bad_func(int n) {  // 非 constexpr
    if (std::is_constant_evaluated()) {  // 永远 false
        return n * 2;
    } else {
        return n * 3;
    }
}
```

**正确做法**：
- `std::is_constant_evaluated()` 仅在 `constexpr` 或 `consteval` 函数中有意义。

```cpp
constexpr int good_func(int n) {
    if (std::is_constant_evaluated()) {  // 仅在编译期调用时为 true
        return n * 2;
    } else {
        return n * 3;
    }
}
```

### 6.7 陷阱 7：`constexpr` 容器内存泄漏到运行期

**问题描述**：C++20 起 `constexpr` 函数可使用 `std::vector`、`std::string`，但编译期分配的内存必须在编译期释放。

**错误代码**：

```cpp
// 错误：constexpr std::string 不能直接作为全局变量
constexpr std::string greeting = "Hello, World!";  // 错误：编译期分配的内存未释放

// 错误：constexpr std::vector 不能作为返回值传递到运行期
constexpr std::vector<int> make_vec() {
    std::vector<int> v = {1, 2, 3};
    return v;  // 错误：返回值需在运行期持有，但内存是编译期分配
}
```

**正确做法**：
- `constexpr` 容器仅在编译期上下文使用。
- 若需运行期使用，将结果转换为非 constexpr 变量。

```cpp
// 编译期计算，运行期构造
std::vector<int> make_vec() {  // 非 constexpr
    std::vector<int> v = {1, 2, 3};
    return v;
}

// 编译期计算长度，运行期构造
constexpr size_t vec_size() {
    std::vector<int> v = {1, 2, 3};
    return v.size();  // 正确：返回 size_t，不是容器
}

int main() {
    constexpr size_t n = vec_size();  // 编译期：3
    std::vector<int> v(n);  // 运行期构造
    return 0;
}
```

### 6.8 陷阱 8：编译期浮点数精度问题

**问题描述**：`constexpr` 浮点运算的精度可能与运行期不同（实现定义行为）。

**错误代码**：

```cpp
constexpr double sin_30 = compute_sin(30.0);  // 编译期计算
double runtime_sin_30 = std::sin(30.0 * M_PI / 180.0);  // 运行期计算

// sin_30 与 runtime_sin_30 可能略有差异
static_assert(sin_30 == runtime_sin_30, "");  // 可能失败
```

**正确做法**：
- 编译期浮点运算避免精确比较。
- 使用容差比较。

```cpp
constexpr bool approx_equal(double a, double b, double eps = 1e-9) {
    return (a - b < eps) && (b - a < eps);
}

constexpr double sin_30 = compute_sin(30.0);
static_assert(approx_equal(sin_30, 0.5), "");
```

### 6.9 陷阱 9：递归深度超限

**问题描述**：`constexpr` 递归函数深度超过编译器限制。

**错误代码**：

```cpp
constexpr int deep_recursion(int n) {
    return n <= 0 ? 0 : 1 + deep_recursion(n - 1);
}

constexpr int x = deep_recursion(10000);  // 错误：超过递归深度限制
```

**正确做法**：
- 使用循环替代递归。
- 或调整编译器递归深度限制。

```cpp
constexpr int iter_loop(int n) {
    int sum = 0;
    for (int i = 0; i < n; ++i) {
        sum += 1;
    }
    return sum;
}

constexpr int x = iter_loop(10000);  // 正确
```

### 6.10 陷阱 10：`constexpr` 虚函数的 ABI 影响

**问题描述**：C++20 允许 `constexpr` 虚函数，但虚函数的 `constexpr` 性可能影响 ABI。

**错误代码**：

```cpp
struct Base {
    constexpr virtual int f() const { return 1; }
};

struct Derived : Base {
    constexpr int f() const override { return 2; }
};

// 运行期调用虚函数
int runtime_call(Base& b) { return b.f(); }
```

**注意**：`constexpr` 虚函数仍占用 vtable 槽位，运行期调用仍走虚函数机制，性能无改善。

**正确理解**：
- `constexpr` 虚函数的价值在于"编译期多态调用"。
- 运行期调用与普通虚函数无差异。

```cpp
constexpr int compile_time_call(Base const& b) { return b.f(); }

constexpr Derived d;
static_assert(compile_time_call(d) == 2, "");  // 编译期多态
```

---

## 7. 工程实践与最佳实践

### 7.1 何时使用 `constexpr`、`consteval`、`constinit`

**决策框架**：

| 场景                                   | 推荐              | 理由                           |
| -------------------------------------- | ----------------- | ------------------------------ |
| 编译期常量（如数组大小、配置值）       | `constexpr` 变量  | 标准做法                       |
| 可在编译期或运行期执行的函数           | `constexpr` 函数  | 双模式灵活性                   |
| 必须编译期执行的函数（如哈希、解析）   | `consteval`       | 强制编译期，防止误用           |
| 全局变量需编译期初始化但运行期可变     | `constinit`       | 解决 SIOF，保留可变性          |
| 全局常量                               | `constexpr`       | 既是编译期初始化又不可修改     |
| 模板中的编译期条件分支                 | `if constexpr`    | 简化 SFINAE                    |

### 7.2 `constexpr` 函数的设计原则

1. **保持简单**：`constexpr` 函数应保持简单，避免复杂逻辑导致编译时间增加。
2. **避免副作用**：`constexpr` 函数不能有副作用（纯函数），保证可重现性。
3. **使用 `if constexpr` 简化分支**：替代 SFINAE 与标签派发。
4. **提供运行期备选**：若 `constexpr` 函数过于复杂，提供运行期版本。
5. **错误处理**：`constexpr` 函数中不能 `throw`，使用返回值或 `std::expected`。

### 7.3 编译期计算的性能优化

1. **避免重复计算**：使用 `constexpr` 变量缓存编译期结果。
2. **使用查找表**：编译期生成查找表，运行期查表。
3. **限制递归深度**：递归改为循环，避免深度超限。
4. **批量计算**：将多个编译期计算合并，减少实例化次数。

```cpp
// 不推荐：重复计算
template <int N>
struct Factorial {
    static constexpr int value = N * Factorial<N - 1>::value;
};

// 推荐：使用 constexpr 函数与变量
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}

constexpr int cached_result = factorial(10);  // 编译期缓存
```

### 7.4 `constinit` 解决 SIOF 的工程实践

**问题场景**：跨翻译单元的全局变量初始化顺序不确定。

**传统解决方案**：
- 使用 Construct On First Use 惯用法（局部静态变量）。
- 缺点：线程不安全（C++11 前），有运行期开销。

**`constinit` 方案**：

```cpp
// config.cpp
constinit int global_config = 42;  // 编译期初始化

// user.cpp
extern constinit int global_config;
void use_config() {
    std::cout << global_config;  // 安全：编译期已初始化
}
```

**注意事项**：
- `constinit` 变量必须以常量表达式初始化。
- 不能用于依赖运行期初始化的变量。
- 跨翻译单元使用时需 `extern constinit` 声明。

### 7.5 编译期字符串处理库设计

```cpp
// 编译期字符串处理库示例
template <size_t N>
struct ConstString {
    char data[N];
    size_t length;
    
    constexpr ConstString(const char (&str)[N]) : length(N - 1) {
        for (size_t i = 0; i < N; ++i) data[i] = str[i];
    }
    
    constexpr char operator[](size_t i) const { return data[i]; }
    
    constexpr bool operator==(const ConstString& other) const {
        if (length != other.length) return false;
        for (size_t i = 0; i < length; ++i) {
            if (data[i] != other.data[i]) return false;
        }
        return true;
    }
    
    template <size_t M>
    constexpr ConstString<N + M - 1> operator+(const ConstString<M>& other) const {
        ConstString<N + M - 1> result("");
        for (size_t i = 0; i < length; ++i) result.data[i] = data[i];
        for (size_t i = 0; i < other.length; ++i) result.data[length + i] = other.data[i];
        result.data[N + M - 1] = '\0';
        result.length = N + M - 1;
        return result;
    }
};

// 使用
constexpr ConstString hello = "Hello, ";
constexpr ConstString world = "World!";
constexpr auto greeting = hello + world;  // 编译期字符串拼接

static_assert(greeting.length == 13, "");
```

### 7.6 编译期状态机

```cpp
// 编译期状态机示例
enum class State { Idle, Running, Paused, Stopped };
enum class Event { Start, Pause, Resume, Stop };

constexpr State transition(State current, Event event) {
    switch (current) {
        case State::Idle:
            if (event == Event::Start) return State::Running;
            break;
        case State::Running:
            if (event == Event::Pause) return State::Paused;
            if (event == Event::Stop) return State::Stopped;
            break;
        case State::Paused:
            if (event == Event::Resume) return State::Running;
            if (event == Event::Stop) return State::Stopped;
            break;
        case State::Stopped:
            break;
    }
    return current;
}

// 编译期验证状态转移
static_assert(transition(State::Idle, Event::Start) == State::Running, "");
static_assert(transition(State::Running, Event::Pause) == State::Paused, "");
static_assert(transition(State::Paused, Event::Resume) == State::Running, "");

// 生成状态转移表
constexpr std::array<std::array<State, 4>, 4> transition_table() {
    std::array<std::array<State, 4>, 4> table{};
    for (int s = 0; s < 4; ++s) {
        for (int e = 0; e < 4; ++e) {
            table[s][e] = transition(static_cast<State>(s), static_cast<Event>(e));
        }
    }
    return table;
}

constexpr auto TRANSITIONS = transition_table();
```

### 7.7 跨编译器兼容性

```cpp
// 跨编译器兼容的 constexpr 实践
#include <version>

#if __has_include(<cxxabi.h>)
    #include <cxxabi.h>
    #define HAS_CXXABI 1
#else
    #define HAS_CXXABI 0
#endif

// 检测编译器对 constexpr 的支持
#if __cplusplus >= 202002L
    #define HAS_CONSTEVAL 1
    #define HAS_CONSTINIT 1
#else
    #define HAS_CONSTEVAL 0
    #define HAS_CONSTINIT 0
#endif

// 条件使用 consteval
#if HAS_CONSTEVAL
    #define FORCE_CONSTEVAL consteval
#else
    #define FORCE_CONSTEVAL constexpr
#endif

// 跨编译器的编译期哈希
FORCE_CONSTEVAL uint32_t compile_time_hash(const char* str) {
    uint32_t hash = 2166136261u;
    while (*str) {
        hash ^= static_cast<uint8_t>(*str);
        hash *= 16777619u;
        ++str;
    }
    return hash;
}

// 使用 __PRETTY_FUNCTION__ 或 __FUNCSIG__
template <typename T>
FORCE_CONSTEVAL uint32_t type_id() {
    #if defined(__GNUC__) || defined(__clang__)
        return compile_time_hash(__PRETTY_FUNCTION__);
    #elif defined(_MSC_VER)
        return compile_time_hash(__FUNCSIG__);
    #else
        return 0;  // 不支持的编译器
    #endif
}
```

### 7.8 编译期测试与验证

```cpp
// 编译期单元测试
#include <cassert>

constexpr bool test_factorial() {
    assert(factorial(0) == 1);
    assert(factorial(1) == 1);
    assert(factorial(5) == 120);
    assert(factorial(10) == 3628800);
    return true;
}

static_assert(test_factorial(), "factorial tests failed");

// 编译期集成测试
constexpr bool test_string_parsing() {
    auto v1 = parse_version("1.2.3");
    assert(v1.major == 1 && v1.minor == 2 && v1.patch == 3);
    
    auto v2 = parse_version("10.20.30");
    assert(v2.major == 10 && v2.minor == 20 && v2.patch == 30);
    
    return true;
}

static_assert(test_string_parsing(), "version parsing tests failed");
```

---

## 8. 案例研究

### 8.1 案例研究 1：Boost.Hana 的编译期元编程

Boost.Hana 是 C++17 编译期元编程库，结合 `constexpr` 与 TMP：

```cpp
#include <boost/hana.hpp>

namespace hana = boost::hana;

// 编译期类型序列
auto types = hana::tuple_t<int, double, char, float>;

// 编译期过滤
auto integral_types = hana::filter(types, [](auto t) {
    return hana::traits::is_integral(t);
});

// 编译期变换
auto sizes = hana::transform(types, [](auto t) {
    return hana::traits::sizeof_(t);
});

// 编译期折叠
auto total_size = hana::fold_left(sizes, 0, [](auto acc, auto s) {
    return acc + s;
});
```

**分析**：
- Hana 使用 `constexpr` lambda 与 `constexpr` 函数实现编译期计算。
- 与传统 TMP 相比，语法更直观，错误信息更友好。
- 但 Hana 仍是 TMP 的高层抽象，底层依赖模板实例化。

### 8.2 案例研究 2：Boost.Mp11 的类型计算

Boost.Mp11 是纯 TMP 库，但与 `constexpr` 配合：

```cpp
#include <boost/mp11.hpp>

using namespace boost::mp11;

// 类型列表
using types = mp_list<int, double, char, float>;

// 编译期类型过滤
using integral_types = mp_filter<std::is_integral, types>;
// 结果：mp_list<int, char>

// 编译期类型变换
using pointers = mp_transform<std::add_pointer_t, types>;
// 结果：mp_list<int*, double*, char*, float*>

// 编译期类型折叠
using first_type = mp_front<types>;  // int
```

**分析**：
- Mp11 是纯 TMP，不使用 `constexpr` 函数。
- 但可与 `constexpr` 配合：类型用 Mp11，值用 `constexpr`。

### 8.3 案例研究 3：EASTL 的编译期容器

EASTL（Electronic Arts Standard Template Library）是游戏行业定制的 STL 实现：

```cpp
// EASTL 在 C++20 之前就支持 constexpr 容器
#include <EASTL/vector.h>

constexpr int sum_eastl_vector() {
    eastl::vector<int> v;
    v.push_back(1);
    v.push_back(2);
    v.push_back(3);
    
    int sum = 0;
    for (int x : v) sum += x;
    return sum;
}
```

**分析**：
- EASTL 针对 game development 优化，更早支持 constexpr 容器。
- EASTL 的设计影响了 C++20 标准 `std::vector` 的 constexpr 支持。

### 8.4 案例研究 4：Folly 的编译期字符串哈希

Facebook 的 Folly 库大量使用 `consteval` 进行编译期字符串哈希：

```cpp
// Folly 风格的编译期哈希
consteval uint64_t compile_time_hash(const char* str) {
    uint64_t hash = 14695981039346656037ULL;  // FNV offset basis
    while (*str) {
        hash ^= static_cast<uint8_t>(*str);
        hash *= 1099511628211ULL;  // FNV prime
        ++str;
    }
    return hash;
}

// 编译期哈希用于 switch-case
void handle_event(const char* event_name) {
    // 运行期计算哈希
    uint64_t h = runtime_hash(event_name);
    
    // 与编译期哈希比较
    if (h == compile_time_hash("click")) {
        // 处理点击
    } else if (h == compile_time_hash("hover")) {
        // 处理悬停
    }
}
```

**分析**：
- 编译期哈希将字符串比较从 `O(n)` 降到 `O(1)`。
- 适用于事件系统、配置解析、路由匹配等场景。
- 注意：运行期哈希需与编译期哈希使用相同算法。

### 8.5 案例研究 5：Chromium 的编译期配置

Chromium 浏览器使用 `constexpr` 进行编译期配置：

```cpp
// Chromium 风格的编译期配置
constexpr int kMaxTabs = 100;
constexpr int kMaxHistorySize = 1000;
constexpr bool kEnableExperimentalFeatures = false;

template <bool enabled>
class FeatureFlag {
    static constexpr bool value = enabled;
};

using ExperimentalFeatures = FeatureFlag<kEnableExperimentalFeatures>;

// 编译期条件编译
template <bool enabled>
void enable_feature() {
    if constexpr (enabled) {
        // 启用功能
    } else {
        // 禁用功能
    }
}
```

**分析**：
- 编译期配置消除运行期分支，提升性能。
- 适用于嵌入式、游戏等性能敏感场景。
- 缺点：修改配置需重新编译。

### 8.6 案例研究 6：Unreal Engine 的编译期反射

Unreal Engine 使用宏与 `constexpr` 实现编译期反射：

```cpp
// UE 风格的编译期反射（简化）
UCLASS()
class APlayerCharacter : public ACharacter {
    GENERATED_BODY()
    
    UPROPERTY(EditAnywhere, Category = "Stats")
    int32 Health = 100;
    
    UPROPERTY(EditAnywhere, Category = "Stats")
    int32 MaxHealth = 100;
    
    UFUNCTION(BlueprintCallable)
    void TakeDamage(int32 Amount);
};

// GENERATED_BODY 宏展开后包含 constexpr 元数据
class APlayerCharacter_MetaData {
public:
    static constexpr const char* ClassName = "APlayerCharacter";
    static constexpr auto Properties = std::make_tuple(
        std::make_pair("Health", &APlayerCharacter::Health),
        std::make_pair("MaxHealth", &APlayerCharacter::MaxHealth)
    );
    static constexpr auto Functions = std::make_tuple(
        std::make_pair("TakeDamage", &APlayerCharacter::TakeDamage)
    );
};
```

**分析**：
- UE 的反射系统通过宏 + `constexpr` 实现编译期元数据生成。
- 与 C++26 反射提案相比，UE 的方案需要手动标注宏。
- C++26 反射将使此类系统更优雅、更通用。

---

### 11.1 标准与规范

- ISO/IEC 14882:2020（C++20 标准）第 9.2.6 节"constexpr and consteval functions"。
- ISO/IEC 14882:2023（C++23 标准）第 9.2.6 节与"if consteval"相关章节。
- cppreference.com 的 [constexpr](https://en.cppreference.com/w/cpp/language/constexpr)、[consteval](https://en.cppreference.com/w/cpp/language/consteval)、[constinit](https://en.cppreference.com/w/cpp/language/constinit) 条目。

### 11.2 经典书籍

- Bjarne Stroustrup《A Tour of C++》（第三版，C++20 覆盖）。
- Scott Meyers《Effective Modern C++》（constexpr 相关条款）。
- David Vandevoorde, Nicolai M. Josuttis, Douglas Gregor《C++ Templates: The Complete Guide》（第二版）。
- Klaus Iglberger《C++ Software Design》（constexpr 与设计模式）。

### 11.4 相关视频课程

- Bjarne Stroustrup "C++11 Style" (CppCon 2012)。
- Chandler Carruth "constexpr in C++14" (CppCon 2014)。
- Ben Deane "constexpr ALL the things" (CppCon 2017)。
- Jason Turner "C++17 constexpr if" (C++ Weekly 2017)。
- Bryce Adelstein Lelbach "The C++20 Standard" (CppCon 2020)。

### 11.5 附录

#### 附录 A：术语表

| 术语                          | 英文                                  | 含义                                                       |
| ----------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| 常量表达式                    | Constant Expression                   | 可在编译期求值的表达式                                     |
| `constexpr` 函数              | constexpr function                    | 可在编译期或运行期求值的函数                               |
| 立即函数                      | Immediate Function                    | `consteval` 函数，必须编译期求值                           |
| `constinit` 变量              | constinit variable                    | 必须编译期初始化的静态存储期变量                           |
| 求值上下文                    | Evaluation Context                    | 表达式求值的环境（编译期或运行期）                         |
| 字面类型                      | Literal Type                          | 可作为 constexpr 变量类型的类型                            |
| 常量初始化                    | Constant Initialization               | 编译期完成的初始化                                         |
| 动态初始化                    | Dynamic Initialization                | 运行期完成的初始化                                         |
| 静态初始化顺序问题            | Static Initialization Order Fiasco    | 跨翻译单元动态初始化顺序未定义的问题                       |
| 编译期内存模型                | Compile-time Memory Model             | C++20 起 constexpr 函数中 new/delete 的约束                |
| 模板元编程                    | Template Metaprogramming              | 通过模板实例化进行编译期计算                               |
| `if constexpr`                | constexpr if                          | 编译期条件分支，未选中分支不实例化                         |
| `if consteval`                | if consteval                          | 基于求值上下文的条件分支（C++23）                          |
| `std::is_constant_evaluated()`| std::is_constant_evaluated            | 检测当前是否在编译期上下文（C++20）                        |

#### 附录 B：constexpr 能力演进速查

| 标准  | 特性                                  | 关键约束                                  |
| ----- | ------------------------------------- | ----------------------------------------- |
| C++11 | `constexpr` 函数与变量                | 函数体单 return，不能有循环、局部变量     |
| C++14 | 放宽函数体                            | 允许循环、局部变量、多 return             |
| C++17 | `constexpr if`、`constexpr` lambda    | 条件必须是常量表达式                      |
| C++20 | `consteval`、`constinit`、constexpr 容器 | 编译期内存必须编译期释放                  |
| C++23 | `if consteval`、constexpr 标准库扩展  | 替代 `std::is_constant_evaluated()`       |
| C++26 | 反射（提案）                          | 编译期类型反射与元编程                    |

#### 附录 C：编译器支持矩阵

| 特性                          | GCC   | Clang | MSVC  |
| ----------------------------- | ----- | ----- | ----- |
| C++11 `constexpr`             | 4.6+  | 3.1+  | 2015+ |
| C++14 放宽 constexpr          | 6+    | 3.4+  | 2017+ |
| C++17 `constexpr if`          | 8+    | 3.9+  | 2019+ |
| C++17 `constexpr` lambda      | 8+    | 5.0+  | 2019+ |
| C++20 `consteval`             | 10+   | 9.0+  | 2019+ |
| C++20 `constinit`             | 10+   | 10.0+ | 2019+ |
| C++20 constexpr 容器          | 10+   | 11.0+ | 2019+ |
| C++20 constexpr 虚函数        | 10+   | 12.0+ | 2022+ |
| C++23 `if consteval`          | 13+   | 14.0+ | 2022+ |
| C++23 constexpr `<cmath>`     | 14+   | 16.0+ | 2023+ |
## constexpr 变量

**基本写法：定义编译期常量**
`constexpr <type> <var_name> = <value>;`
```cpp
// 定义编译期常量
constexpr int SIZE = 10;
```

---

**表达式写法：使用常量表达式**
`constexpr <type> <var> = <constexpr_expr>;`
```cpp
// 使用常量表达式
constexpr int AREA = 5 * 5;
```

---

**函数调用写法：使用 constexpr 函数初始化**
`constexpr <type> <var> = <constexpr_func>(<args>);`
```cpp
// 使用 constexpr 函数初始化
constexpr int result = square(5);
```

---

## constexpr 函数

**基本写法：定义 constexpr 函数**
`constexpr <return_type> <func>(<params>) { ... }`
```cpp
// 定义编译期可计算的函数
constexpr int square(int x) {
    return x * x;
}
```

---

**递归写法：constexpr 递归函数**
`constexpr <return_type> <func>(<params>) { if (<base>) return ...; return <recursive>; }`
```cpp
// 编译期递归计算阶乘
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}
```

---

**条件写法：constexpr 函数中使用 if**
`constexpr <return_type> <func>(<params>) { if (<cond>) { ... } else { ... } }`
```cpp
// C++14 constexpr 函数可以使用 if
constexpr int abs_val(int x) {
    if (x >= 0) {
        return x;
    } else {
        return -x;
    }
}
```

---

**循环写法：constexpr 函数中使用循环**
`constexpr <return_type> <func>(<params>) { for (...) { ... } }`
```cpp
// C++14 constexpr 函数可以使用循环
constexpr int sum(int n) {
    int total = 0;
    for (int i = 1; i <= n; i++) {
        total += i;
    }
    return total;
}
```

---

## constexpr 与 const

**const 写法：运行期常量**
`const <type> <var> = <value>;`
```cpp
// 运行期常量
const int runtime_val = 10;
```

---

**constexpr 写法：编译期常量**
`constexpr <type> <var> = <value>;`
```cpp
// 编译期常量
constexpr int compiletime_val = 10;
```

---

**const + constexpr 写法：两者结合**
`const constexpr <type> <var> = <value>;`
```cpp
// const 和 constexpr 结合
const constexpr int VALUE = 100;
```

---

## if constexpr

**基本写法：编译期条件判断**
`if constexpr (<condition>) { ... } else { ... }`
```cpp
// 编译期条件判断
template<typename T>
void process(T value) {
    if constexpr (std::is_integral_v<T>) {
        std::cout << "Integer: " << value << std::endl;
    } else {
        std::cout << "Other: " << value << std::endl;
    }
}
```

---

**无 else 写法：仅 if constexpr**
`if constexpr (<condition>) { ... }`
```cpp
// 仅 if constexpr
template<typename T>
void process(T value) {
    if constexpr (std::is_integral_v<T>) {
        std::cout << "Integer" << std::endl;
    }
}
```

---

## constexpr 类

**基本写法：constexpr 构造函数**
`constexpr <ClassName>(<params>) : <members> { ... }`
```cpp
// constexpr 构造函数
class Point {
    int x, y;
public:
    constexpr Point(int x, int y) : x(x), y(y) {}
};
```

---

**constexpr 成员函数写法**
`constexpr <return_type> <func>() const { ... }`
```cpp
// constexpr 成员函数
class Point {
    int x, y;
public:
    constexpr int get_x() const { return x; }
};
```

---

**constexpr 对象写法**
`constexpr <ClassName> <var>(<args>);`
```cpp
// 创建 constexpr 对象
constexpr Point p(10, 20);
```

---

## constexpr 与模板

**模板写法：constexpr 模板函数**
`template<typename T> constexpr <return_type> <func>(T <param>) { ... }`
```cpp
// constexpr 模板函数
template<typename T>
constexpr T max_val(T a, T b) {
    return a > b ? a : b;
}
```

---

## 编译期计算

**递归写法：模板递归编译期计算**
`template<int N> struct <Factorial> { static constexpr int value = N * <Factorial><N-1>::value; };`
```cpp
// 模板递归计算阶乘
template<int N>
struct Factorial {
    static constexpr int value = N * Factorial<N - 1>::value;
};

template<>
struct Factorial<0> {
    static constexpr int value = 1;
};
```

---

**使用写法：访问编译期计算的值**
`<Factorial><N>::value`
```cpp
// 访问编译期计算的值
constexpr int result = Factorial<5>::value;
```

---

## constexpr 与数组

**数组大小写法：使用 constexpr 作为数组大小**
`<type> <array>[<constexpr_var>];`
```cpp
// 使用 constexpr 作为数组大小
constexpr int SIZE = 10;
int arr[SIZE];
```

---

**std::array 写法：使用 constexpr 作为 std::array 大小**
`std::array<<type>, <constexpr_var>> <arr>;`
```cpp
#include <array>
// 使用 constexpr 作为 std::array 大小
constexpr int SIZE = 10;
std::array<int, SIZE> arr;
```

---

## constexpr 与 std::array

**基本写法：constexpr std::array**
`constexpr std::array<<type>, <size>> <arr> = {<values>};`
```cpp
#include <array>
// constexpr std::array
constexpr std::array<int, 5> arr = {1, 2, 3, 4, 5};
```

---

## constexpr lambda（C++17）

**基本写法：constexpr lambda**
`auto <lambda> = []() constexpr { ... }`
```cpp
// C++17 constexpr lambda
auto square = [](int x) constexpr {
    return x * x;
};
```

---

**调用写法：在编译期调用 constexpr lambda**
`constexpr <type> <var> = <lambda>(<args>);`
```cpp
// 在编译期调用 constexpr lambda
constexpr int result = square(5);
```

---

## consteval（C++20）

**基本写法：定义 consteval 函数**
`consteval <return_type> <func>(<params>) { ... }`
```cpp
// C++20 consteval 函数，必须在编译期执行
consteval int square(int x) {
    return x * x;
}
```

---

**调用写法：调用 consteval 函数**
`constexpr <type> <var> = <func>(<args>);`
```cpp
// 调用 consteval 函数
constexpr int result = square(5);
```

---

## constinit（C++20）

**基本写法：constinit 变量**
`constinit <type> <var> = <value>;`
```cpp
// C++20 constinit 变量，必须编译期初始化
constinit int global_var = 10;
```

---

## 类型检查

**is_constant_evaluated 写法：检查是否在编译期求值**
`if (std::is_constant_evaluated()) { ... }`
```cpp
#include <type_traits>
// 检查是否在编译期求值
constexpr int compute(int x) {
    if (std::is_constant_evaluated()) {
        return x * 2;
    } else {
        return x * 3;
    }
}
```

---

## constexpr 与标准库

**基本写法：constexpr 标准库函数**
`constexpr <type> <var> = std::<func>(<args>);`
```cpp
#include <cmath>
// 使用 constexpr 标准库函数
constexpr double result = std::abs(-3.14);
```

---

**constexpr 容器写法：C++20 constexpr 容器**
`constexpr std::vector<<type>> <vec>;`
```cpp
#include <vector>
// C++20 constexpr vector
constexpr std::vector<int> vec = {1, 2, 3};
```
