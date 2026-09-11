---
order: 530
title: C23 新特性
module: 'c'
category: 计算机科学
difficulty: intermediate
description: C23（ISO/IEC 9899:2024）核心新特性教学：nullptr、constexpr、typeof、auto、属性、_BitInt、#embed 与标准库新增函数，含可运行示例与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'c/520-C23C2y'
  - 'c/540-AttributeCompilerExtension'
  - 'c/290-PreprocessorMacro'
prerequisites:
  - 'c/030-ProgramStructureBasicSyntax'
---

## 前置知识

- [程序结构与基本语法](/c/030-ProgramStructureBasicSyntax)：会写、会编译一个基础的 C 程序
- 了解 `const`、指针、结构体的基本用法（本文会在用到时简要回顾）

## 学习目标

- 说出 C23 的正式名称（ISO/IEC 9899:2024）与版本宏 `__STDC_VERSION__`（202311L）
- 在代码中正确使用 nullptr、bool/true/false、constexpr 对象、auto、typeof、二进制字面量与数字分隔符
- 用标准属性（[[deprecated]]、[[nodiscard]] 等）让编译器帮你查错
- 使用 #embed、#elifdef、__has_include 等新预处理能力
- 使用 <stdckdint.h>、memset_explicit、strdup 等 C23 新增标准库设施
- 知道哪些写法在 C23 中仍然不合法（如 constexpr 函数），避免把 C++ 习惯带进 C

## C23 是什么，如何启用

C23 于 2024 年正式发布，正式名称是 **ISO/IEC 9899:2024**，是当前 C 语言的最新标准（C17 只是一次小幅修订）。它把大量编译器已实践多年的扩展（typeof、二进制字面量等）收编为标准，并补上了 nullptr、constexpr 这类"现代化缺口"。

```bash
# GCC 14 / Clang 18 起接受 -std=c23（特性覆盖度因版本而异）
gcc -std=c23 main.c -o main
```

```c
// 用版本宏探测标准级别，让同一份代码兼容旧编译器
#if __STDC_VERSION__ >= 202311L
    #define HAS_C23 1
#else
    #define HAS_C23 0
#endif
```

一个直观感受 C23 变化量的角度：过去写布尔值要 `#include <stdbool.h>`，写空指针常量只能用宏 `NULL`（或裸写 `0`），写"取表达式类型"的泛型宏要靠 GNU 扩展 `__typeof__`——这些在 C23 里全部成为语言本身的一部分。

## nullptr：类型安全的空指针

**是什么**：`nullptr` 是 C23 新增的空指针常量。老写法 `NULL` 是一个展开为 `0`（或 `(void*)0`）的宏，本质是整数，在重载解析、泛型宏等场景会与整数 0 产生歧义；`nullptr` 只表示"空指针"，不会被当成整数。

```c
#include <stdio.h>
#include <stddef.h>   // nullptr_t 类型在这里定义

// nullptr 只能转换为指针：传给指针参数含义明确
void take_int_ptr(int *p) {
    printf("收到指针: %s\n", p ? "非空" : "空");
}

// 用 _Generic 区分类型：nullptr 的类型是 nullptr_t，不是 int
#define WHAT(x) _Generic((x), \
    int:        "int",        \
    nullptr_t:  "nullptr_t",  \
    int *:      "int *",      \
    default:    "other")

int main(void) {
    int *p = nullptr;         // C23：明确表示空指针
    // int *q = NULL;         // 旧写法，仍然可用

    printf("type of 0:       %s\n", WHAT(0));        // int
    printf("type of nullptr: %s\n", WHAT(nullptr));  // nullptr_t

    take_int_ptr(nullptr);    // 传入空指针
    if (p == nullptr) {
        printf("p 是空指针\n");
    }
    return 0;
}
```

`nullptr_t` 是与 nullptr 配套的类型（`typedef typeof(nullptr) nullptr_t;`），可用于编写"只接受空指针"的接口：

```c
#include <stddef.h>

// 该函数只能传 nullptr，传 0 或整数会编译报错
void reset_to_null(nullptr_t);
```

**陷阱**：`nullptr` 与整数之间不能隐式互转。`int x = nullptr;` 是错误的——这正是它比 `NULL` 更安全的地方。

## bool / true / false 成为关键字

C23 之前，`bool` 是 `<stdbool.h>` 里的宏（展开为 `_Bool`），`true`/`false` 也是宏。C23 让它们成为语言关键字，直接可用：

```c
#include <stdio.h>

// 不再需要 #include <stdbool.h>
bool is_even(int n) {
    return n % 2 == 0;
}

int main(void) {
    bool ready = true;
    ready = false;

    printf("4 是偶数: %d\n", is_even(4));   // 1
    printf("size of bool: %zu\n", sizeof(bool));  // 1，与 _Bool 一致
    return 0;
}
```

注意：`<stdbool.h>` 头文件仍保留，以兼容旧代码；`NULL` 也仍是需要头文件的库宏，没有变成关键字。

## constexpr 对象：真正的编译期常量

**是什么**：`constexpr` 声明的对象是"编译期常量"——它的值在编译时确定，可用于数组长度、case 标签、静态初始化等一切需要常量表达式的场合。

**与 const 的区别**是初学者最容易混淆的点：`const` 只表示"运行期不可修改"，其值未必在编译期可知（比如可以用一个运行期变量初始化）；`constexpr` 则强制要求编译期可求值。

```c
constexpr int MAX_USERS = 100;         // 编译期常量
int user_buffer[MAX_USERS];            // 可以：数组长度需要常量表达式

const int runtime_size = 100;          // const 但不是常量表达式
// int other_buffer[runtime_size];     // 未必可以（严格 C 中，VLA/非法，视编译器）

_Static_assert(MAX_USERS > 10, "容量过小");  // constexpr 可参与静态断言
```

**重要陷阱**：C23 的 `constexpr` **只支持对象，不支持函数**。下面的写法是 C++ 的，不是 C23：

```c
// 错误写法：C23 没有 constexpr 函数
// constexpr int square(int x) { return x * x; }
// int arr[square(5)];   // C23 下编译报错
```

需要在编译期计算的场景，C23 中仍用宏或 `_Generic` 等手段；constexpr 函数是 C++ 的特性，勿混用。

## auto：对象类型推断

C23 的 `auto` 不再是"自动存储期"的老关键字，而是"让编译器从初始化器推断类型"。写复杂类型时可以少敲很多字：

```c
#include <stdio.h>

struct Config { int level; char name[16]; };

struct Config *load_config(void) {
    static struct Config c = { 3, "default" };
    return &c;
}

int main(void) {
    auto x = 42;              // int
    auto y = 3.14;            // double
    auto cfg = load_config(); // struct Config *，不用手写冗长类型

    printf("%d %.2f %s\n", x, y, cfg->name);
    return 0;
}
```

**限制**（与 C++ 的 auto 不同，注意区分）：

- 仅限"对象定义 + 初始化器"的场合，且通常在块作用域内
- 必须有初始化器：`auto x;` 是错误的
- **不支持函数返回类型推导**：`auto f(void) { ... }` 不是合法的 C23
- 没有后置返回类型语法：`auto f() -> int` 是 C++ 语法，C23 中不存在

## typeof / typeof_unqual：取表达式的类型

`typeof(expr)` 在类型位置上引用表达式的类型（含 const/volatile 限定），`typeof_unqual(expr)` 则去掉所有限定符。它们原先就是 GCC 扩展，C23 将其标准化，是编写类型安全宏的利器：

```c
#include <stdio.h>

// 类型安全的交换宏：不限定参数类型，也不重复求值副作用
#define SWAP(a, b) do {         \
    typeof(a) _tmp = (a);       \
    (a) = (b);                  \
    (b) = _tmp;                 \
} while (0)

int main(void) {
    int    i = 1,  j = 2;
    double p = 3.5, q = 7.5;

    SWAP(i, j);   // 交换两个 int
    SWAP(p, q);   // 交换两个 double

    printf("%d %d\n", i, j);      // 2 1
    printf("%.1f %.1f\n", p, q);  // 7.5 3.5

    const int ci = 10;
    typeof_unqual(ci) mutable = 20;  // 去掉 const，得到 int
    mutable = 30;                    // 可以修改
    printf("%d\n", mutable);
    return 0;
}
```

## 二进制字面量与数字分隔符

写位掩码、寄存器配置时，二进制字面量比十六进制更直观；数字分隔符 `'` 让长数字可读：

```c
int    mask = 0b1010'1010;   // 二进制 + 分隔符
long   big  = 1'000'000;     // 一百万
double avog = 6.022'140'76e23;
```

## _BitInt(N)：位精确整数

`_BitInt(N)` 声明精确 N 位宽的整数，N 从 1 到实现上限（常见实现至少几千位）。适合协议解析、位级数据结构等对位宽敏感的场景：

```c
_BitInt(8)         small  = 127;    // 精确 8 位有符号：-128..127
unsigned _BitInt(3) tiny   = 7;      // 精确 3 位无符号：0..7

// _BitInt 没有专属 printf 格式符，先转换再打印
printf("%d\n", (int)small);
```

注意需要较新的编译器（如 GCC 14+ 或较新 Clang）；其位宽上限与可用性因平台而异，使用前建议用 `_Static_assert` 验证假设。

## unreachable()：标记不可达路径

`unreachable()` 定义在 `<stddef.h>`，告诉编译器"程序执行到此处即为未定义行为"，常用于 switch 全覆盖后的默认分支，帮助编译器优化并让审计者一眼看出意图：

```c
#include <stddef.h>

enum state { IDLE, RUNNING, DONE };

int state_name(enum state s) {
    switch (s) {
        case IDLE:    return 0;
        case RUNNING: return 1;
        case DONE:    return 2;
    }
    unreachable();   // 三个状态已全覆盖，走到这里说明内存已损坏
}
```

## 标准属性 [[...]]

C23 采用 C++ 风格的属性语法，把常见意图交给编译器检查。用 `__has_c_attribute` 探测支持情况：

| 属性              | 作用                                       |
| :---------------- | :----------------------------------------- |
| `[[deprecated]]`  | 标记弃用，使用处产生编译警告               |
| `[[nodiscard]]`   | 返回值不应忽略，忽略时产生警告             |
| `[[fallthrough]]` | 标注 switch 中有意的穿透，抑制警告         |
| `[[maybe_unused]]`| 声明可能未使用，抑制未使用警告             |
| `[[noreturn]]`    | 函数不会返回（如内部调用 exit 的错误处理） |

```c
[[nodiscard]] int allocate_id(void);          // 丢弃返回值会有警告
[[deprecated("use v2_read()")]] int read(void);
[[noreturn]] void fatal(const char *msg);     // 内部 exit，不会返回
```

更多属性与编译器扩展的对照见 [属性与编译器扩展](/c/540-AttributeCompilerExtension)。

## 预处理新能力

```c
// #elifdef / #elifndef：条件编译更简洁（C23）
#ifdef _WIN32
    #define PLATFORM "Windows"
#elifdef __linux__
    #define PLATFORM "Linux"
#elifdef __APPLE__
    #define PLATFORM "macOS"
#else
    #define PLATFORM "Unknown"
#endif

// #warning：产生编译警告但继续编译（C23 标准化）
#warning "此模块将在下个版本重构"

// __has_include：探测头文件是否存在（C23 标准化）
#if __has_include(<stdbit.h>)
    #include <stdbit.h>
#endif
```

**#embed：把文件内容嵌入为字节数组**。过去要把图片、字体等资源编进程序，得用 `xxd -i` 之类工具生成临时头文件；#embed 让编译器直接读文件：

```c
const unsigned char logo[] = {
    #embed "logo.png"          // 整个文件嵌入
};

const unsigned char header[] = {
    #embed "data.bin" limit(16)   // 只嵌入前 16 字节
};

printf("%zu\n", sizeof(logo));    // 编译期即知大小
```

需要 GCC 15 / Clang 19 及以上支持；文件以预处理期路径解析，找不到会直接编译失败。

## 标准库新增

### <stdckdint.h>：检查整数溢出的运算

C 语言的整数溢出是未定义行为，手工检查又容易写错。`ckd_add` / `ckd_sub` / `ckd_mul` 把"运算 + 溢出检查"合成一步：发生溢出返回 true，且结果按回绕值写入。

```c
#include <stdio.h>
#include <stdckdint.h>

int main(void) {
    int r;
    if (ckd_add(&r, 2000000000, 2000000000)) {
        printf("溢出！\n");           // int 加法溢出，走这里
    } else {
        printf("结果: %d\n", r);
    }

    long big;
    ckd_mul(&big, 100000L, 100000L);  // 换更大类型就不溢出
    printf("%ld\n", big);             // 10000000000
    return 0;
}
```

三个函数对**任意整数类型**（包括 _BitInt）的结果指针都适用，是编写安全数值代码的首选。

### 安全与实用函数

| 函数               | 头文件     | 作用                                             |
| :----------------- | :--------- | :----------------------------------------------- |
| `memset_explicit`  | `<string.h>` | 填充内存且禁止编译器"优化掉"，用于擦除密码/密钥  |
| `strdup` / `strndup` | `<string.h>` | 复制字符串到新分配的内存（原为 POSIX，C23 转正） |
| `unreachable`      | `<stddef.h>` | 标记不可达代码                                   |

```c
// 旧问题：memset(buf, 0, n) 可能被编译器判定为"死代码"而删除，
// 导致密码残留在内存中。memset_explicit 保证真正执行：
#include <string.h>

void erase_password(char *pw, size_t len) {
    // ... 使用 pw ...
    memset_explicit(pw, 0, len);   // 一定不会被优化掉
}
```

### <stdbit.h>：标准化位操作速查

| 函数                  | 说明                     | 示例（`0xFFu`）        |
| :-------------------- | :----------------------- | :--------------------- |
| `stdc_count_ones`     | 置位计数（popcount）     | 8                      |
| `stdc_count_zeros`    | 零位计数                 | 0                      |
| `stdc_leading_zeros`  | 前导零                   | 24（unsigned int）     |
| `stdc_trailing_zeros` | 尾随零                   | 0                      |
| `stdc_bit_width`      | 表示该值所需位数         | 8                      |
| `stdc_bit_floor`      | 不超过该值的最大 2 的幂  | 255                    |
| `stdc_bit_ceil`       | 不小于该值的最小 2 的幂  | 256                    |

它们是类型安全的泛型宏，返回类型与操作数类型对应；printf 时建议先转换再打印，避免格式符不匹配。

## 综合示例

下面的程序把本章大部分特性串在一起，可用 `gcc -std=c23` 直接编译运行：

```c
#include <stdio.h>
#include <stddef.h>
#include <stdckdint.h>

constexpr int TABLE_MAX = 64;              // 编译期常量

[[nodiscard]] int square_table(int *out, int n) {
    if (n > TABLE_MAX) return -1;          // 越界保护
    for (int i = 0; i < n; i++) {
        int sq;
        if (ckd_mul(&sq, i, i)) return -2; // 溢出检查
        out[i] = sq;
    }
    return n;
}

int main(void) {
    int table[TABLE_MAX] = {};             // C23 空初始化 = 零初始化
    [[maybe_unused]] int unused_flag = 0;

    int n = square_table(table, 8);
    if (n == -1) {                         // nodiscard 返回值被检查
        puts("容量不足");
        return 1;
    }

    int *cursor = nullptr;                 // 空指针常量
    for (int i = 0; i < n; i++) {
        printf("%d^2 = %5d\n", i, table[i]);
        if (i == 3) cursor = &table[i];    // 演示指针赋值，指向 table[3]
    }

    printf("数字分隔符: %d, 二进制: %d\n", 1'000'000, 0b101);
    printf("cursor points to: %d\n", *cursor);
    return 0;
}
```

预期输出：

```text
0^2 =     0
1^2 =     1
2^2 =     4
3^2 =     9
4^2 =    16
5^2 =    25
6^2 =    36
7^2 =    49
数字分隔符: 1000000, 二进制: 5
cursor points to: 9
```

## 常见陷阱

- **把 C++ 习惯带进 C23**：constexpr 函数、auto 函数返回类型、后置返回类型 `-> T` 都不是 C23 的内容，写了会编译失败。
- **nullptr 当整数用**：`int x = nullptr;` 非法。它只表示空指针，也不能与整数做算术。
- **constexpr 对象必须用常量表达式初始化**：`int n = f(); constexpr int m = n;` 非法——n 的值编译期未知。
- **auto 忘写初始化器**：`auto x;` 编译错误；推断出来的数组类型（如 `typeof(arr)`）声明的新数组也不会自动初始化。
- **忽略 #embed 的编译器要求**：GCC 15 / Clang 19 以下版本不支持，跨平台构建要加版本探测。
- **以为 bool 的大小是 1 位**：`sizeof(bool)` 是 1 字节，位打包请用位域或 _BitInt。
- **stdc_* 宏的返回类型与操作数对应**：直接用 `%zu` 打印 unsigned int 结果属于格式符不匹配，先做显式转换最稳妥。

## 小结

**初学者记住这三点：**

1. C23 是 2024 年正式发布的最新 C 标准，编译时用 `gcc -std=c23`，版本宏为 `202311L`。
2. 最常用的五个新东西：`nullptr`（空指针）、`bool/true/false` 关键字、`constexpr` 常量、`auto` 类型推断、`typeof` 泛型宏。
3. C23 不是 C++：constexpr 函数、auto 返回类型推导等 C++ 语法在 C23 中不存在。

**进阶者还需注意：**

- 用 `__has_include`、`__has_c_attribute`、`__STDC_VERSION__` 写特性探测，让代码在 C11/C17/C23 间平滑降级。
- 数值代码优先使用 `<stdckdint.h>` 的 ckd_* 函数处理溢出；敏感数据擦除用 `memset_explicit` 而非 `memset`。
- 特性落地的编译器版本差异很大（#embed 需 GCC 15/Clang 19，_BitInt 需 GCC 14+），发布前用 CI 矩阵验证。
- 下一版标准 C2y 仍处草案阶段（GCC 15 / Clang 20 提供早期开关），defer 等特性在正式发布前随时可能调整，详见 [C23 与 C2y 新标准](/c/520-C23C2y)。
