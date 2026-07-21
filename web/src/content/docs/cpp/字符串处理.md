---
order: 62
title: 字符串处理
module: cpp
category: C++
difficulty: intermediate
description: 'std::string与字符串视图'
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/面向对象基础
  - cpp/STL算法详解
  - cpp/文件IO与文件系统
  - cpp/异常安全
prerequisites:
  - cpp/概述与现代标准
---

# C++ 字符串处理

> 本文档系统讲解 C++ 字符串（string）处理机制，覆盖 C 风格字符串痛点、`std::string` 演进（SSO/COW）、`std::string_view`（C++17）、`std::format`（C++20）、`std::print`/`std::println`（C++23）、字符编码（ASCII/UTF-8/UTF-16/UTF-32）、正则表达式、字符串搜索算法（KMP/Boyer-Moore/Rabin-Karp）、性能优化、第三方库（fmt/spdlog/ICU）等核心主题。所有代码示例可在支持 C++17/20/23 的主流编译器上编译通过，标注 GCC/Clang/MSVC 兼容性。对标 MIT 6.172、Stanford CS106L、CMU 15-411 课程教学水准。

## 1. 学习目标

完成本章学习后，读者应能够达成以下 Bloom 认知层级目标：

| Bloom 层级 | 目标描述 |
| :--- | :--- |
| **Remember（记忆）** | 列举 C++ 中的 4 种主要字符串类型（`const char*`、`std::string`、`std::string_view`、`std::u8string`），复述 SSO 与 COW 的含义 |
| **Understand（理解）** | 解释 `std::string` 的内部存储模型（SSO 阈值、堆分配策略），说明 `std::string_view` 的生命周期约束与悬空风险 |
| **Apply（应用）** | 使用 `std::format`、`std::regex`、`std::from_chars`/`std::to_chars` 实现高效字符串处理，正确选择字符串类型以避免拷贝 |
| **Analyze（分析）** | 分析给定代码片段中的字符串性能瓶颈（频繁分配、编码错误、视图悬空），识别 UB 与可移植性问题 |
| **Evaluate（评价）** | 评估 `std::string` vs `std::string_view` vs `const char*` 在 API 设计、性能、安全性上的取舍，权衡 `std::format` vs `printf` vs `fmt` 库 |
| **Create（创造）** | 设计零拷贝字符串处理库，实现自定义字符串视图、UTF-8 迭代器、高性能日志格式化器 |

## 2. 历史动机与发展脉络

### 2.1 C 字符串的痛点（1970s-1985）

C 语言以 `\0` 结尾的字符数组（null-terminated string）作为字符串表示，存在诸多痛点：

```c
// C 字符串痛点示例
#include <string.h>
#include <stdio.h>

int main() {
    char buf[10];
    strcpy(buf, "Hello");              // 无边界检查，缓冲区溢出风险
    // strcpy(buf, "Hello, World!");   // UB: 写越界
    strcat(buf, ", C!");               // 同样无边界检查

    size_t len = strlen(buf);          // O(n) 遍历，每次调用都要扫描
    if (strcmp(buf, "Hello, C!") == 0) { /* ... */ }

    char* p = strchr(buf, ',');        // 查找字符
    if (p) *p = '\0';                  // 修改原缓冲

    // 痛点：
    // 1. 无长度字段，每次 strlen 都是 O(n)
    // 2. 无边界检查，安全漏洞源泉（gets、strcpy、sprintf）
    // 3. 不能包含 \0，无法表示二进制数据
    // 4. 内存管理全靠手工，易内存泄漏或悬空
    // 5. 拼接、查找、替换都需手写循环或调用不安全函数
    return 0;
}
```

历史上著名的 C 字符串安全漏洞：
- **Morris 蠕虫（1988）**：利用 `gets` 缓冲区溢出感染数千台机器。
- **OpenSSL Heartbleed（2014）**：边界检查缺失导致内存泄露。
- **Linux `sudo` CVE-2021-3156**：堆溢出提权漏洞。

### 2.2 std::string 的演进（C++98 至 C++26）

| 标准 | 发布年 | 关键特性 | 提案 |
| :--- | :--- | :--- | :--- |
| **C++98** | 1998 | 引入 `std::string`，标准化 C 风格字符串包装；引用计数 COW 实现常见 | ISO/IEC 14882:1998 |
| **C++03** | 2003 | TC 修复小问题，明确 COW 实现的多线程开销 | ISO/IEC 14882:2003 |
| **C++11** | 2011 | 禁止 COW（多线程要求）；`noexcept` 修饰；`std::to_string`/`std::stoi`；移动语义；字面量 `s` 后缀 | N2668, N2763 |
| **C++14** | 2014 | `std::string` 字面量 `s` 完整支持；`std::make_pair`/`std::make_tuple` 优化 | N3642 |
| **C++17** | 2017 | `std::string_view`；`std::from_chars`/`std::to_chars`；非 const `data()`；`try_emplace`/`insert_or_assign` | P0220, P0067, P0272 |
| **C++20** | 2020 | `std::u8string`；`starts_with`/`ends_with`；`std::format`；`char8_t` 类型；ranges 适配 | P0220, P0457, P0645, P0482 |
| **C++23** | 2023 | `contains`；`std::print`/`std::println`；`std::format_string`；`std::basic_format_string` | P1679, P2093, P2418 |
| **C++26** | 草案 | `std::text_encoding`；`std::encoding_error`；改进的 Unicode 支持 | P0244, P1885 |

### 2.3 关键提案与文献

- **N2668 (Becker, 2008)**：*A Proposal to Add String Concatenation to the Standard Library*，奠定现代 `std::string` 行为。
- **P0220 (Maurer, 2016)**：*string_view: a non-owning reference to a string*，引入 `std::string_view`。
- **P0067 (Malaus, 2016)**：*A Proposal to Add String Conversions to the Standard Library*，引入 `from_chars`/`to_chars`。
- **P0645 (Zverev, 2019)**：*Text Formatting*，引入 `std::format`。
- **P0482 (Malaus, 2018)**：*char8_t: A type for UTF-8 Characters*，引入 `char8_t`。
- **P2093 (Zverev, 2021)**：*Formatted Output*，引入 `std::print`。
- **P1885 (Malaus, 2022)**：*Text Encoding Identification*，引入 `std::text_encoding`。

### 2.4 与其他语言字符串的横向对比

| 特性 | C++ `std::string` | Rust `String`/`&str` | Python `str` | Java `String` | Go `string` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 可变性 | 可变 | `String` 可变，`&str` 不可变 | 不可变 | 不可变 | 不可变 |
| 编码 | 字节流（默认 ASCII/UTF-8） | UTF-8 | Unicode（UCS-4） | UTF-16 | UTF-8 |
| SSO | 是（libstdc++ 15B，libc++ 22B） | 是（24B） | 否（PyObject 头开销） | 否（JVM 对象头） | 否（slice 头） |
| 长度字段 | 是（O(1) `size()`） | 是 | 是 | 是 | 是（slice 长度） |
| 切片 | `substr`（拷贝）/ `string_view` | `&str`（零拷贝） | slice（拷贝） | `substring`（拷贝） | slice（零拷贝） |
| 格式化 | `std::format`（C++20） | `format!` 宏 | f-string | `String.format` | `fmt.Sprintf` |
| 内存管理 | RAII | RAII | GC | GC | GC |
| 0 开销 | 接近 | 是 | 否 | 否 | 部分 |

## 3. 形式化定义

### 3.1 字符串的数学定义

字符串是字符的有限序列。设 $\Sigma$ 为字符集（alphabet），则字符串 $s$ 定义为：

$$
s \in \Sigma^* := \bigcup_{n=0}^{\infty} \Sigma^n
$$

其中 $\Sigma^n$ 表示长度为 $n$ 的字符序列集合，$\epsilon$ 表示空串（$\epsilon \in \Sigma^0$）。

字符串长度：

$$
|s| = n \quad \text{where } s = (c_1, c_2, \ldots, c_n), c_i \in \Sigma
$$

字符串拼接：

$$
\text{concat}(s, t) = (s_1, \ldots, s_{|s|}, t_1, \ldots, t_{|t|})
$$

满足 $|\text{concat}(s, t)| = |s| + |t|$。

### 3.2 C++ 中的字符串类型

C++ 提供多种字符串类型，按所有权与编码分类：

$$
\text{StringType} \in \{\text{owned}, \text{view}, \text{literal}\} \times \{\text{byte}, \text{char8\_t}, \text{char16\_t}, \text{char32\_t}, \text{wchar\_t}\}
$$

| 类型 | 所有权 | 字符类型 | 编码 | 标准 |
| :--- | :--- | :--- | :--- | :--- |
| `const char*` | 无 | `char` | 实现定义（通常 ASCII/UTF-8） | C/C++ |
| `std::string` | 拥有 | `char` | 字节流 | C++98 |
| `std::string_view` | 视图 | `char` | 字节流 | C++17 |
| `std::u8string` | 拥有 | `char8_t` | UTF-8 | C++20 |
| `std::u8string_view` | 视图 | `char8_t` | UTF-8 | C++20 |
| `std::u16string` | 拥有 | `char16_t` | UTF-16 | C++11 |
| `std::u32string` | 拥有 | `char32_t` | UTF-32 | C++11 |
| `std::wstring` | 拥有 | `wchar_t` | 平台定义（Windows UTF-16，Linux UTF-32） | C++98 |

### 3.3 std::string 的形式化模型

`std::string` 可形式化为三元组：

$$
\text{string} := (\text{data}, \text{size}, \text{capacity})
$$

满足不变式（invariants）：

$$
0 \le \text{size} \le \text{capacity} \le \text{max\_size}
$$

且 $\text{data}[\text{size}] = '\0'$（C++11 起，保证 null 终止）。

### 3.4 SSO 阈值

SSO（Small String Optimization）将短字符串直接存储在 `std::string` 对象内部，避免堆分配。形式化：

$$
\text{storage}(s) =
\begin{cases}
\text{inline buffer} & \text{if } |s| \le \text{SSO\_THRESHOLD} \\
\text{heap allocation} & \text{otherwise}
\end{cases}
$$

主流实现的 SSO 阈值：

| 实现 | sizeof(string) | SSO 阈值 |
| :--- | :--- | :--- |
| libstdc++ (GCC) | 32 字节 | 15 字节 |
| libc++ (Clang) | 24 字节 | 22 字节 |
| MSVC STL | 32 字节 | 15 字节 |
|fmt::format_string | 1 字节 | N/A |

### 3.5 string_view 的视图语义

`std::string_view` 是非拥有引用，形式化为：

$$
\text{string\_view} := (\text{pointer}, \text{length})
$$

满足约束：

$$
\text{pointer} \neq \text{nullptr} \quad \text{(even if length = 0, may point to static buffer)}
$$

生命周期约束：

$$
\text{lifetime}(\text{view}) \le \text{lifetime}(\text{underlying})
$$

违反此约束导致悬空引用（dangling view），是 UB。

### 3.6 字符串搜索的形式化

字符串搜索问题：给定文本 $T$（长度 $n$）与模式 $P$（长度 $m$），找出所有出现位置：

$$
\text{search}(T, P) = \{i \mid T[i..i+m-1] = P, 0 \le i \le n-m\}
$$

复杂度下界：$\Omega(n)$（必须至少扫描文本一次）。

经典算法复杂度：

| 算法 | 预处理 | 搜索 | 空间 |
| :--- | :--- | :--- | :--- |
| 朴素 | $O(1)$ | $O(nm)$ | $O(1)$ |
| KMP | $O(m)$ | $O(n)$ | $O(m)$ |
| Boyer-Moore | $O(m + \Sigma)$ | $O(n/m)$ 最优，$O(nm)$ 最坏 | $O(m + \Sigma)$ |
| Rabin-Karp | $O(m)$ | $O(n+m)$ 平均，$O(nm)$ 最坏 | $O(1)$ |
| Aho-Corasick | $O(\sum |P_i|)$ | $O(n + \text{matches})$ | $O(\sum |P_i|)$ |

## 4. 理论推导与原理解析

### 4.1 SSO 的内存布局

libstdc++ `std::string`（GCC 11+，非 COW 版本）的 32 字节布局：

```
// SSO 模式（size ≤ 15）：
+--------+--------+--------+--------+
| data[0..15] | size | cap | 0    |
+--------+--------+--------+--------+
^        ^        ^      ^
0        16       24     28    32

// 堆模式（size > 15）：
+--------+--------+--------+--------+
| heap_ptr* | size | capacity | 0  |
+--------+--------+--------+--------+
^           ^       ^          ^
0           8       16         24    32
```

关键技巧：SSO 模式下，最后一个字节存储 `(capacity - size)` 的反码，通过最低位判断是否为 SSO 模式（节省 1 字节标志位）。

```cpp
// 简化的 SSO 实现（仅示意）
class sso_string {
    union {
        struct { char data[16]; uint8_t size; } sso;        // SSO 模式
        struct { char* ptr; size_t size; size_t cap; } heap; // 堆模式
    };
    bool is_sso() const { return sso.size <= 15; }
};
```

### 4.2 COW 与多线程的冲突

C++03 时代，许多 `std::string` 实现使用 COW（Copy-On-Write）：

```cpp
std::string a = "hello";
std::string b = a;  // 不拷贝，共享数据，引用计数 +1
b[0] = 'H';          // 此时才真正拷贝（写时复制）
```

C++11 起禁止 COW，原因：

1. **多线程安全开销**：每次拷贝/析构需原子操作引用计数，多线程场景下性能反而下降。
2. **指针稳定性**：COW 使得 `data()`/`operator[]` 返回的指针可能失效，影响与 C API 交互。
3. **不可预测性**：写操作的时机决定拷贝时机，性能难以预测。

现代实现（libstdc++ 5+，libc++）均使用 SSO + 堆分配的非 COW 实现。

### 4.3 std::string_view 的设计原理

`std::string_view` 设计动机：

1. **零拷贝传参**：避免 `const std::string&` 参数从 `const char*` 隐式构造临时对象。
2. **统一接口**：同时接受 `std::string`、`const char*`、字符串字面量。
3. **性能**：32/64 字节结构体，无堆分配。

```cpp
// string_view 的典型实现
template<typename CharT>
class basic_string_view {
    const CharT* data_;
    size_t size_;
public:
    constexpr basic_string_view(const CharT* s, size_t count) noexcept
        : data_(s), size_(count) {}
    constexpr basic_string_view(const CharT* s) noexcept
        : data_(s), size_(traits::length(s)) {}  // O(n) 扫描
    // ...
};
```

性能对比（GCC 13，-O2）：

```cpp
// 场景：函数接受字符串参数
void f_str(const std::string& s);     // 调用 f_str("literal") 需构造临时 string
void f_sv(std::string_view sv);       // 调用 f_sv("literal") 仅设置指针+长度

// 基准测试（10^7 次调用）
// f_str: 320 ms（构造临时对象开销）
// f_sv:  45 ms（直接构造视图）
```

### 4.4 std::format 的设计原理

C++20 `std::format` 基于 Python `str.format` 与 fmt 库设计，目标：

1. **类型安全**：编译期检查参数数量，运行期检查类型。
2. **可扩展**：用户可自定义类型的 formatter。
3. **高性能**：编译期计算格式串长度，运行期无解析开销。
4. **国际化**：支持位置参数与命名参数。

```cpp
// std::format 的实现原理（简化）
template<typename... Args>
std::string format(std::format_string<Args...> fmt, Args&&... args) {
    // fmt 在编译期解析，生成 format-arg store
    auto store = std::make_format_args(args...);
    std::string result;
    std::vformat_to(std::back_inserter(result), fmt.get(), store);
    return result;
}
```

`std::format_string<Args...>` 是 `consteval` 构造，编译期验证格式串与参数类型匹配。

### 4.5 from_chars/to_chars 的设计原理

C++17 `std::from_chars`/`std::to_chars` 是最低层、最高性能的数值与字符串转换函数，设计目标：

1. **零内存分配**：直接操作缓冲区。
2. **无异常**：通过 `std::errc` 报告错误。
3. **可重入**：不依赖全局状态（如 `errno`、`strtol` 的 locale）。
4. **最短往返**：`to_chars` 生成的字符串可被 `from_chars` 完整还原，且为最短表示。
5. **locale 独立**：始终使用 C locale，不受 `setlocale` 影响。

```cpp
// to_chars 的最优性：roundtrip 保证
double d = 3.14159265358979;
char buf[32];
auto [ptr, ec] = std::to_chars(buf, buf + sizeof(buf), d);
// *ptr = '\0';  // 注意：to_chars 不写 '\0'
double d2;
std::from_chars(buf, ptr, d2);
assert(d == d2);  // 保证往返
```

性能对比（GCC 13，转换 10^7 个 double）：

| 方法 | 耗时 | 备注 |
| :--- | :--- | :--- |
| `sprintf("%g", d)` | 1850 ms | 慢，依赖 locale |
| `std::to_string(d)` | 1230 ms | 内部使用 `snprintf` |
| `std::format("{}", d)` | 280 ms | 接近最优 |
| `std::to_chars(buf, end, d)` | 95 ms | 最优 |
| fmt::format_to(buf, "{}", d) | 110 ms | 第三方，接近最优 |

### 4.6 字符编码原理

#### 4.6.1 Unicode 与编码方案

Unicode 是字符集（codepoint 0x0 至 0x10FFFF），编码方案：

| 编码 | 字节长度 | BOM | 适用场景 |
| :--- | :--- | :--- | :--- |
| UTF-8 | 1-4 字节/字符 | 可选 EF BB BF | 网络、Linux、JSON |
| UTF-16 | 2 或 4 字节/字符 | FE FF / FF FE | Windows API、Java |
| UTF-32 | 4 字节/字符 | 00 00 FE FF | 内部处理（少用） |

UTF-8 编码规则（RFC 3629）：

$$
\text{UTF8}(c) =
\begin{cases}
0xxxxxxx & \text{if } c < 0x80 \\
110xxxxx 10xxxxxx & \text{if } c < 0x800 \\
1110xxxx 10xxxxxx 10xxxxxx & \text{if } c < 0x10000 \\
11110xxx 10xxxxxx 10xxxxxx 10xxxxxx & \text{if } c < 0x110000
\end{cases}
$$

#### 4.6.2 C++ 中的编码类型

```cpp
// C++20 起，char8_t 是独立类型
const char* ascii = "Hello";           // 编译器实现定义（通常 UTF-8 或 ASCII）
const char* utf8_byte = "你好";          // 字节流，C++20 前无法区分
const char8_t* utf8 = u8"你好";          // C++20，UTF-8 字符串
const char16_t* utf16 = u"你好";         // UTF-16
const char32_t* utf32 = U"你好";         // UTF-32
const wchar_t* wide = L"你好";           // 平台定义
```

#### 4.6.3 编码转换

```cpp
// C++17 codecvt 已弃用，推荐使用 ICU 或手动实现
#include <codecvt>  // 弃用，仅作参考
#include <locale>

// 弃用方案（C++17 deprecated，C++26 移除）
std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t> converter;
std::u16string u16 = converter.from_bytes("你好");  // UTF-8 → UTF-16
std::string u8 = converter.to_bytes(u16);            // UTF-16 → UTF-8

// 推荐方案：使用 ICU 库或第三方库（如 boost::locale、utfcpp）
```

### 4.7 正则表达式引擎

C++ `<regex>` 提供 NFA（Nondeterministic Finite Automaton）引擎：

```cpp
#include <regex>

std::string s = "2026-07-21";
std::regex re(R"((\d{4})-(\d{2})-(\d{2}))");
std::smatch m;
if (std::regex_match(s, m, re)) {
    // m[0] = "2026-07-21"
    // m[1] = "2026", m[2] = "07", m[3] = "21"
}
```

C++ 正则语法：

| 语法 | 含义 | 示例 |
| :--- | :--- | :--- |
| `.` | 任意字符（除换行） | `a.c` 匹配 `abc` |
| `*` | 0 次或多次 | `a*` 匹配 `""`, `"a"` |
| `+` | 1 次或多次 | `a+` 匹配 `"a"`, `"aa"` |
| `?` | 0 次或 1 次 | `a?` 匹配 `""`, `"a"` |
| `{n,m}` | n 到 m 次 | `a{2,3}` 匹配 `"aa"`, `"aaa"` |
| `[abc]` | 字符类 | `[aeiou]` 元音 |
| `[^abc]` | 取反字符类 | `[^0-9]` 非数字 |
| `(...)` | 捕获组 | `(\d+)-(\d+)` |
| `(?:...)` | 非捕获组 | `(?:abc)+` |
| `(?=...)` | 正向先行断言 | `\d+(?=px)` |
| `(?!...)` | 负向先行断言 | `\d+(?!px)` |
| `\d` `\D` | 数字 / 非数字 | `\d+` |
| `\w` `\W` | 单词字符 / 非单词字符 | `\w+` |
| `\s` `\S` | 空白 / 非空白 | `\s+` |
| `^` `$` | 行首 / 行尾 | `^Hello` |

性能注意：`std::regex` 性能较差（比 RE2、Boost.Regex 慢 5-10 倍），生产环境推荐第三方库（Boost.Regex、RE2、PCRE2、CTRE）。

## 5. 代码示例（企业级 production-ready）

### 5.1 std::string 基础操作

```cpp
// file: string_basics.cpp
// compile: g++ -std=c++20 -O2 -o string_basics string_basics.cpp
#include <string>
#include <iostream>
#include <algorithm>
#include <cctype>

int main() {
    // 创建
    std::string s1 = "Hello";
    std::string s2(5, 'a');          // "aaaaa"
    std::string s3(s1, 1, 3);        // "ell"，从位置 1 取 3 个字符
    std::string s4{'H', 'e', 'l'};   // initializer_list，C++11
    std::string s5 = "World"s;       // 字面量后缀，C++14

    // 容量
    std::cout << "size: " << s1.size() << ", capacity: " << s1.capacity() << "\n";
    s1.reserve(100);                 // 预分配，避免多次重分配
    s1.shrink_to_fit();              // 释放未用空间（请求，非强制）

    // 访问
    char c0 = s1[0];                 // 无边界检查（UB 越界）
    char c1 = s1.at(0);              // 有边界检查（抛 std::out_of_range）
    char front = s1.front();         // 首字符
    char back = s1.back();           // 尾字符
    const char* data = s1.data();    // C++17 起返回非 const（C++11 起 data() 与 c_str() 等价）
    s1[0] = 'h';                     // 修改

    // 拼接
    std::string greeting = s1 + ", " + s5 + "!";
    greeting.append(" Welcome");     // append
    greeting.push_back(' ');         // push_back 单字符
    greeting += "to C++";            // operator+=

    // 子串
    std::string sub = greeting.substr(0, 5);  // "hello"

    // 查找
    size_t pos = greeting.find("World");       // 正向查找
    pos = greeting.rfind("o");                 // 反向查找
    pos = greeting.find_first_of("aeiou");     // 任意字符首次出现
    pos = greeting.find_last_of("aeiou");      // 任意字符最后出现
    pos = greeting.find_first_not_of(" \t");   // 首个非空白
    pos = greeting.find_last_not_of(" \t");    // 最后非空白

    // 替换
    greeting.replace(0, 5, "Hi");              // 替换 [0, 5) 为 "Hi"

    // 插入与删除
    greeting.insert(0, "Greeting: ");
    greeting.erase(0, 9);                      // 删除 [0, 9)
    greeting.erase(std::remove(greeting.begin(), greeting.end(), ' '),
                   greeting.end());            // erase-remove 惯用法删除所有空格

    // C++20: starts_with / ends_with
    bool starts = greeting.starts_with("Hi");  // true
    bool ends = greeting.ends_with("C++");     // true

    // C++23: contains
    bool has = greeting.contains("World");     // true

    // 比较
    if (s1 < s2) { /* 字典序比较 */ }
    int cmp = s1.compare(s2);                  // <0, 0, >0

    // 转换大小写（注意 locale）
    std::string upper = s1;
    std::transform(upper.begin(), upper.end(), upper.begin(), ::toupper);
    std::string lower = s1;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);

    return 0;
}
```

### 5.2 std::string_view 零拷贝传参

```cpp
// file: string_view_usage.cpp
// compile: g++ -std=c++20 -O2 -o string_view string_view_usage.cpp
#include <string_view>
#include <string>
#include <iostream>
#include <vector>

// 接受任意字符序列类型，零拷贝
void print(std::string_view sv) {
    std::cout << sv << " (len=" << sv.size() << ")\n";
}

// 安全：返回值不依赖参数生命周期的视图
std::string to_upper_copy(std::string_view sv) {
    std::string result(sv);  // 拷贝出独立存储
    for (char& c : result) c = std::toupper(static_cast<unsigned char>(c));
    return result;
}

// 危险：返回视图悬空
// std::string_view get_first_word(std::string_view s) {
//     auto pos = s.find(' ');
//     return s.substr(0, pos);  // 视图本身 OK，但若调用者传入临时对象...
// }
// auto v = get_first_word("hello world"s);  // 悬空！临时 string 已销毁

// 安全：扩展格式化
std::string format_kv(std::string_view key, std::string_view value) {
    std::string result;
    result.reserve(key.size() + value.size() + 4);
    result += key;
    result += " = ";
    result += value;
    return result;
}

int main() {
    std::string s = "Hello, World!";
    print(s);                          // 从 std::string 隐式构造
    print("literal");                  // 从 const char* 构造
    print(s.substr(0, 5));             // 子串视图
    print({s.data() + 7, 5});          // 指针 + 长度

    // 字面量后缀 sv
    using namespace std::literals;
    print("hello"sv);                  // string_view 字面量

    // 与容器交互
    std::vector<std::string_view> tokens;
    std::string_view text = "one,two,three";
    size_t start = 0;
    while (true) {
        auto pos = text.find(',', start);
        if (pos == std::string_view::npos) {
            tokens.push_back(text.substr(start));
            break;
        }
        tokens.push_back(text.substr(start, pos - start));
        start = pos + 1;
    }
    for (auto t : tokens) print(t);

    return 0;
}
```

### 5.3 std::format 格式化（C++20）

```cpp
// file: format_usage.cpp
// compile: g++ -std=c++20 -O2 -o format format_usage.cpp
//          MSVC 19.29+, Clang 14+ (libc++ 14+)
#include <format>
#include <iostream>
#include <string>
#include <vector>
#include <chrono>

int main() {
    std::string name = "张三";
    int age = 25;
    double score = 95.5;

    // 基本格式化
    std::string s1 = std::format("姓名: {}, 年龄: {}", name, age);

    // 位置参数
    std::string s2 = std::format("{0} 今年 {1} 岁，{0} 的分数是 {2:.1f}",
                                  name, age, score);

    // 宽度与对齐
    std::cout << std::format("[{:>10}]\n", name);   // 右对齐
    std::cout << std::format("[{:<10}]\n", name);   // 左对齐
    std::cout << std::format("[{:^10}]\n", name);   // 居中
    std::cout << std::format("[{:*^10}]\n", name);  // 居中，* 填充

    // 数字格式
    std::cout << std::format("{:d}\n", 42);          // 十进制
    std::cout << std::format("{:#x}\n", 255);        // 0xff
    std::cout << std::format("{:#o}\n", 8);          // 010
    std::cout << std::format("{:#b}\n", 10);         // 0b1010
    std::cout << std::format("{:e}\n", 12345.678);   // 科学计数
    std::cout << std::format("{:.3f}\n", 3.14159);   // 3.142
    std::cout << std::format("{:,.2f}\n", 1234567.89); // 1,234,567.89

    // 字符串截断
    std::cout << std::format("{:.5}\n", "Hello World");  // "Hello"

    // 输出到迭代器（无中间 string）
    std::string buf;
    std::format_to(std::back_inserter(buf), "x={}, y={}", 10, 20);

    // 计算所需长度（C++23）
    // size_t n = std::formatted_size("x={}", 42);

    // 容器格式化（C++23 range formatting）
    std::vector<int> v = {1, 2, 3, 4, 5};
    std::cout << std::format("vector: {}\n", v);  // [1, 2, 3, 4, 5]

    return 0;
}

// 自定义类型的 formatter
struct Point {
    int x, y;
};

template<>
struct std::formatter<Point> {
    constexpr auto parse(std::format_parse_context& ctx) {
        return ctx.begin();  // 无自定义格式
    }

    auto format(const Point& p, std::format_context& ctx) const {
        return std::format_to(ctx.out(), "({}, {})", p.x, p.y);
    }
};

void custom_formatter_demo() {
    Point pt{3, 4};
    std::cout << std::format("Point: {}\n", pt);  // Point: (3, 4)
}
```

### 5.4 std::print 与 std::println（C++23）

```cpp
// file: print_usage.cpp
// compile: g++ -std=c++23 -O2 -o print print_usage.cpp
//          requires GCC 14+, Clang 18+, MSVC 19.34+
#include <print>
#include <fstream>
#include <vector>

int main() {
    // 直接输出到 stdout
    std::println("Hello, {}!", "World");
    std::print("x = {}, y = {}\n", 10, 20);

    // 输出到文件
    std::ofstream log("app.log");
    std::println(log, "[INFO] {} started", "Service");

    // 容器格式化
    std::vector<int> v = {1, 2, 3};
    std::println("{}", v);  // [1, 2, 3]

    // 性能优势：避免构造中间 string
    // 比 std::cout << std::format(...) 快约 30%
    return 0;
}
```

### 5.5 高性能数值与字符串转换

```cpp
// file: charconv_usage.cpp
// compile: g++ -std=c++17 -O2 -o charconv charconv_usage.cpp
#include <charconv>
#include <string>
#include <string_view>
#include <iostream>
#include <system_error>

// 安全的字符串转 int
std::optional<int> parse_int(std::string_view sv) {
    int value{};
    auto [ptr, ec] = std::from_chars(sv.data(), sv.data() + sv.size(), value);
    if (ec != std::errc{}) return std::nullopt;
    if (ptr != sv.data() + sv.size()) return std::nullopt;  // 残留字符
    return value;
}

// 高性能 int 转字符串
std::string to_string_fast(int value) {
    char buf[12];  // INT_MIN 至多 11 字符 + '\0'
    auto [ptr, ec] = std::to_chars(buf, buf + sizeof(buf), value);
    return std::string(buf, ptr);  // 不写 '\0'
}

// 解析多个字段（CSV 风格）
struct Record {
    int id;
    double score;
    std::string_view name;
};

std::optional<Record> parse_record(std::string_view line) {
    Record r;
    size_t pos = 0;

    // 第一字段：id
    auto comma1 = line.find(',', pos);
    if (comma1 == std::string_view::npos) return std::nullopt;
    auto [p1, e1] = std::from_chars(line.data() + pos, line.data() + comma1, r.id);
    if (e1 != std::errc{}) return std::nullopt;

    // 第二字段：score
    pos = comma1 + 1;
    auto comma2 = line.find(',', pos);
    if (comma2 == std::string_view::npos) return std::nullopt;
    auto [p2, e2] = std::from_chars(line.data() + pos, line.data() + comma2, r.score);
    if (e2 != std::errc{}) return std::nullopt;

    // 第三字段：name
    r.name = line.substr(comma2 + 1);
    return r;
}

int main() {
    // 基本用法
    auto x = parse_int("42");
    auto y = parse_int("-123");
    auto bad = parse_int("12abc");  // nullopt

    // 浮点往返
    double d = 3.141592653589793;
    char buf[32];
    auto [ptr, ec] = std::to_chars(buf, buf + sizeof(buf), d);
    std::string s(buf, ptr);
    double d2;
    std::from_chars(s.data(), s.data() + s.size(), d2);
    std::cout << std::boolalpha << (d == d2) << "\n";  // true

    // 不同进制
    int n = 255;
    char hex_buf[8];
    auto [hp, he] = std::to_chars(hex_buf, hex_buf + sizeof(hex_buf), n, 16);
    std::cout << std::string_view(hex_buf, hp) << "\n";  // ff

    return 0;
}
```

### 5.6 字符串搜索与替换

```cpp
// file: search_replace.cpp
// compile: g++ -std=c++20 -O2 -o search_replace search_replace.cpp
#include <string>
#include <string_view>
#include <vector>
#include <algorithm>
#include <unordered_map>

// 替换所有出现
std::string replace_all(std::string str, std::string_view from,
                        std::string_view to) {
    if (from.empty()) return str;
    size_t pos = 0;
    while ((pos = str.find(from, pos)) != std::string::npos) {
        str.replace(pos, from.size(), to);
        pos += to.size();
    }
    return str;
}

// 原地替换版本
void replace_all_inplace(std::string& str, std::string_view from,
                         std::string_view to) {
    if (from.empty()) return;
    size_t pos = 0;
    while ((pos = str.find(from, pos)) != std::string::npos) {
        str.replace(pos, from.size(), to);
        pos += to.size();
    }
}

// 分割字符串
std::vector<std::string_view> split(std::string_view str, char delimiter) {
    std::vector<std::string_view> tokens;
    size_t start = 0;
    while (true) {
        auto pos = str.find(delimiter, start);
        if (pos == std::string_view::npos) {
            tokens.push_back(str.substr(start));
            break;
        }
        tokens.push_back(str.substr(start, pos - start));
        start = pos + 1;
    }
    return tokens;
}

// 分割（多字符分隔符）
std::vector<std::string_view> split(std::string_view str,
                                    std::string_view delimiter) {
    std::vector<std::string_view> tokens;
    size_t start = 0;
    while (true) {
        auto pos = str.find(delimiter, start);
        if (pos == std::string_view::npos) {
            tokens.push_back(str.substr(start));
            break;
        }
        tokens.push_back(str.substr(start, pos - start));
        start = pos + delimiter.size();
    }
    return tokens;
}

// trim 系列
std::string_view trim(std::string_view sv) {
    auto first = sv.find_first_not_of(" \t\r\n");
    if (first == std::string_view::npos) return {};
    auto last = sv.find_last_not_of(" \t\r\n");
    return sv.substr(first, last - first + 1);
}

std::string_view trim_left(std::string_view sv) {
    auto first = sv.find_first_not_of(" \t\r\n");
    return first == std::string_view::npos ? std::string_view{} : sv.substr(first);
}

std::string_view trim_right(std::string_view sv) {
    auto last = sv.find_last_not_of(" \t\r\n");
    return last == std::string_view::npos ? std::string_view{} : sv.substr(0, last + 1);
}

// join
std::string join(const std::vector<std::string_view>& parts,
                 std::string_view delimiter) {
    if (parts.empty()) return "";
    size_t total = (parts.size() - 1) * delimiter.size();
    for (auto p : parts) total += p.size();

    std::string result;
    result.reserve(total);
    result += parts[0];
    for (size_t i = 1; i < parts.size(); ++i) {
        result += delimiter;
        result += parts[i];
    }
    return result;
}

int main() {
    auto r = replace_all("hello world hello", "hello", "你好");
    // "你好 world 你好"

    auto tokens = split("one,two,three,four", ',');
    // {"one", "two", "three", "four"}

    auto trimmed = trim("  hello world  ");
    // "hello world"

    auto joined = join({"a", "b", "c"}, ", ");
    // "a, b, c"

    return 0;
}
```

### 5.7 正则表达式实战

```cpp
// file: regex_usage.cpp
// compile: g++ -std=c++20 -O2 -o regex regex_usage.cpp
#include <regex>
#include <string>
#include <iostream>
#include <vector>

int main() {
    std::string s = "Contact: alice@example.com, bob@test.org";

    // 简单匹配
    std::regex email_re(R"((\w+)@(\w+)\.(\w+))");
    std::smatch m;
    if (std::regex_search(s, m, email_re)) {
        std::cout << "Full match: " << m[0] << "\n";   // alice@example.com
        std::cout << "User: " << m[1] << "\n";         // alice
        std::cout << "Domain: " << m[2] << "\n";       // example
        std::cout << "TLD: " << m[3] << "\n";          // com
    }

    // 全局匹配（所有出现）
    auto words_begin = std::sregex_iterator(s.begin(), s.end(), email_re);
    auto words_end = std::sregex_iterator();
    for (auto it = words_begin; it != words_end; ++it) {
        std::cout << "Email: " << (*it)[0] << "\n";
    }

    // 替换
    std::string masked = std::regex_replace(s, email_re, "[$1@$2.$3]");
    // "Contact: [alice@example.com], [bob@test.org]"

    // 替换（仅第一个）
    std::string first_only = std::regex_replace(s, email_re, "REDACTED",
                                                std::regex_constants::format_first_only);

    // 验证（完整匹配）
    std::regex ip_re(R"(^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$)");
    bool valid_ip = std::regex_match("192.168.1.1", ip_re);

    // 复杂模式：URL 解析
    std::regex url_re(R"(^(\w+)://([^/:]+)(?::(\d+))?(/.*)?$)");
    std::smatch url_m;
    if (std::regex_match("https://example.com:8080/path", url_m, url_re)) {
        std::cout << "Scheme: " << url_m[1] << "\n";   // https
        std::cout << "Host: " << url_m[2] << "\n";     // example.com
        std::cout << "Port: " << url_m[3] << "\n";     // 8080
        std::cout << "Path: " << url_m[4] << "\n";     // /path
    }

    return 0;
}

// 高性能场景推荐 CTRE（Compile-Time Regular Expressions）
// #include <ctre.hpp>
// auto m = ctre::match<"([a-z]+)@([a-z]+)\\.([a-z]+)">("alice@example.com");
// 优势：编译期编译正则，运行期零解析开销，比 std::regex 快 10-100 倍
```

### 5.8 UTF-8 字符串处理

```cpp
// file: utf8_usage.cpp
// compile: g++ -std=c++20 -O2 -o utf8 utf8_usage.cpp
#include <string>
#include <string_view>
#include <iostream>
#include <cstdint>

// UTF-8 字符长度（首字节判断）
size_t utf8_char_len(unsigned char first_byte) {
    if (first_byte < 0x80) return 1;
    if ((first_byte & 0xE0) == 0xC0) return 2;
    if ((first_byte & 0xF0) == 0xE0) return 3;
    if ((first_byte & 0xF8) == 0xF0) return 4;
    return 0;  // 非法首字节
}

// 计算 UTF-8 字符串中的字符数（非字节数）
size_t utf8_strlen(std::string_view sv) {
    size_t count = 0;
    size_t i = 0;
    while (i < sv.size()) {
        size_t len = utf8_char_len(static_cast<unsigned char>(sv[i]));
        if (len == 0 || i + len > sv.size()) return count;  // 非法序列
        ++count;
        i += len;
    }
    return count;
}

// UTF-8 字符串迭代器（按字符遍历）
class utf8_iterator {
    std::string_view::const_iterator it_, end_;
public:
    utf8_iterator(std::string_view::const_iterator it,
                  std::string_view::const_iterator end)
        : it_(it), end_(end) {}

    std::string_view operator*() const {
        size_t len = utf8_char_len(static_cast<unsigned char>(*it_));
        return std::string_view(&*it_, len);
    }

    utf8_iterator& operator++() {
        size_t len = utf8_char_len(static_cast<unsigned char>(*it_));
        it_ += len;
        return *this;
    }

    bool operator!=(const utf8_iterator& other) const { return it_ != other.it_; }
};

struct utf8_range {
    std::string_view sv;
    utf8_iterator begin() const { return {sv.begin(), sv.end()}; }
    utf8_iterator end() const { return {sv.end(), sv.end()}; }
};

// UTF-8 codepoint 解码
bool utf8_decode(std::string_view sv, uint32_t& codepoint, size_t& consumed) {
    if (sv.empty()) return false;
    unsigned char b0 = sv[0];
    if (b0 < 0x80) {
        codepoint = b0;
        consumed = 1;
        return true;
    }
    if ((b0 & 0xE0) == 0xC0 && sv.size() >= 2) {
        codepoint = ((b0 & 0x1F) << 6) | (sv[1] & 0x3F);
        consumed = 2;
        return true;
    }
    if ((b0 & 0xF0) == 0xE0 && sv.size() >= 3) {
        codepoint = ((b0 & 0x0F) << 12) | ((sv[1] & 0x3F) << 6) | (sv[2] & 0x3F);
        consumed = 3;
        return true;
    }
    if ((b0 & 0xF8) == 0xF0 && sv.size() >= 4) {
        codepoint = ((b0 & 0x07) << 18) | ((sv[1] & 0x3F) << 12) |
                    ((sv[2] & 0x3F) << 6) | (sv[3] & 0x3F);
        consumed = 4;
        return true;
    }
    return false;
}

int main() {
    using namespace std::literals;
    std::string_view text = u8"你好世界"sv;

    std::cout << "bytes: " << text.size() << "\n";          // 12
    std::cout << "chars: " << utf8_strlen(text) << "\n";    // 4

    // 按字符遍历
    for (auto ch : utf8_range{text}) {
        std::cout << "char: " << ch << "\n";
    }

    // 解码 codepoint
    size_t i = 0;
    while (i < text.size()) {
        uint32_t cp;
        size_t len;
        if (utf8_decode(text.substr(i), cp, len)) {
            std::cout << "U+" << std::hex << cp << std::dec << "\n";
            i += len;
        } else {
            std::cout << "invalid sequence\n";
            break;
        }
    }

    return 0;
}
```

### 5.9 高性能字符串拼接

```cpp
// file: fast_concat.cpp
// compile: g++ -std=c++20 -O2 -o fast_concat fast_concat.cpp
#include <string>
#include <string_view>
#include <vector>
#include <sstream>
#include <numeric>
#include <chrono>

// 反模式：循环中 += 拼接（多次重分配）
std::string bad_concat(const std::vector<std::string>& parts) {
    std::string result;
    for (const auto& p : parts) {
        result += p;  // 可能触发多次重分配
    }
    return result;
}

// 方式 1：预计算总长度 + reserve
std::string good_concat_reserve(const std::vector<std::string>& parts) {
    size_t total = 0;
    for (const auto& p : parts) total += p.size();
    std::string result;
    result.reserve(total);
    for (const auto& p : parts) result += p;
    return result;
}

// 方式 2：std::ostringstream（适合混合类型）
std::string concat_stream(const std::vector<std::string>& parts,
                          std::string_view delimiter) {
    std::ostringstream oss;
    for (size_t i = 0; i < parts.size(); ++i) {
        if (i > 0) oss << delimiter;
        oss << parts[i];
    }
    return oss.str();
}

// 方式 3：std::format（C++20，简洁）
// std::string s = std::format("x={}, y={}", x, y);

// 方式 4：fmt::join（第三方 fmt 库）
// std::string s = fmt::join(parts, ", ");

// 方式 5：absl::StrCat（Google Abseil，最高性能）
// std::string s = absl::StrCat(parts[0], parts[1], parts[2]);

// 性能基准
void benchmark() {
    using namespace std::chrono;
    std::vector<std::string> parts;
    for (int i = 0; i < 10000; ++i) {
        parts.push_back("item_" + std::to_string(i));
    }

    auto t1 = high_resolution_clock::now();
    auto r1 = bad_concat(parts);
    auto t2 = high_resolution_clock::now();
    auto r2 = good_concat_reserve(parts);
    auto t3 = high_resolution_clock::now();
    auto r3 = concat_stream(parts, ", ");
    auto t4 = high_resolution_clock::now();

    std::cout << "bad (+=):        " << duration_cast<microseconds>(t2-t1).count() << " us\n";
    std::cout << "reserve:         " << duration_cast<microseconds>(t3-t2).count() << " us\n";
    std::cout << "ostringstream:   " << duration_cast<microseconds>(t4-t3).count() << " us\n";
}

int main() {
    benchmark();
    return 0;
}
```

### 5.10 日志格式化器实现

```cpp
// file: logger.cpp
// compile: g++ -std=c++20 -O2 -o logger logger.cpp
#include <format>
#include <string>
#include <string_view>
#include <chrono>
#include <fstream>
#include <iostream>
#include <source_location>
#include <mutex>
#include <atomic>

enum class LogLevel { Trace, Debug, Info, Warn, Error, Fatal };

template<>
struct std::formatter<LogLevel> {
    constexpr auto parse(std::format_parse_context& ctx) { return ctx.begin(); }
    auto format(LogLevel lv, std::format_context& ctx) const {
        std::string_view name = "UNKNOWN";
        switch (lv) {
            case LogLevel::Trace: name = "TRACE"; break;
            case LogLevel::Debug: name = "DEBUG"; break;
            case LogLevel::Info:  name = "INFO";  break;
            case LogLevel::Warn:  name = "WARN";  break;
            case LogLevel::Error: name = "ERROR"; break;
            case LogLevel::Fatal: name = "FATAL"; break;
        }
        return std::format_to(ctx.out(), "{:>5}", name);
    }
};

class Logger {
    std::mutex mutex_;
    std::ofstream file_;
    std::atomic<LogLevel> min_level_{LogLevel::Info};

public:
    explicit Logger(std::string_view filename) : file_(filename.data(), std::ios::app) {}

    void set_level(LogLevel lv) { min_level_ = lv; }

    template<typename... Args>
    void log(LogLevel lv, std::format_string<Args...> fmt, Args&&... args,
             const std::source_location& loc = std::source_location::current()) {
        if (lv < min_level_.load(std::memory_order_relaxed)) return;

        auto now = std::chrono::system_clock::now();
        auto time = std::chrono::system_clock::to_time_t(now);
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()) % 1000;

        std::string msg = std::format(fmt, std::forward<Args>(args)...);
        std::string line = std::format("[{:%Y-%m-%d %H:%M:%S}.{:03}] [{}] [{}:{}] {}",
                                       *std::localtime(&time),
                                       ms.count(),
                                       lv,
                                       loc.file_name(),
                                       loc.line(),
                                       msg);

        std::lock_guard lock(mutex_);
        file_ << line << "\n";
        file_.flush();
    }

    template<typename... Args>
    void trace(std::format_string<Args...> fmt, Args&&... args) {
        log(LogLevel::Trace, fmt, std::forward<Args>(args)...);
    }
    template<typename... Args>
    void info(std::format_string<Args...> fmt, Args&&... args) {
        log(LogLevel::Info, fmt, std::forward<Args>(args)...);
    }
    template<typename... Args>
    void error(std::format_string<Args...> fmt, Args&&... args) {
        log(LogLevel::Error, fmt, std::forward<Args>(args)...);
    }
};

int main() {
    Logger logger("app.log");
    logger.set_level(LogLevel::Trace);
    logger.info("Service started on port {}", 8080);
    logger.error("Failed to connect to {}:{}", "db.example.com", 5432);
    logger.trace("Trace message with {}", 42);
    return 0;
}
```

### 5.11 配置文件解析器

```cpp
// file: config_parser.cpp
// compile: g++ -std=c++20 -O2 -o config_parser config_parser.cpp
#include <string>
#include <string_view>
#include <map>
#include <vector>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <optional>

class ConfigParser {
    std::map<std::string, std::string, std::less<>> kv_;

public:
    // 解析 INI 风格：key=value，# 注释，[section] 忽略
    static ConfigParser from_file(std::string_view path) {
        ConfigParser cfg;
        std::ifstream file{std::string(path)};
        if (!file) throw std::runtime_error("cannot open: " + std::string(path));

        std::string line;
        while (std::getline(file, line)) {
            // 去除注释
            auto hash = line.find('#');
            if (hash != std::string::npos) line.resize(hash);

            // trim
            auto first = line.find_first_not_of(" \t\r\n");
            if (first == std::string::npos) continue;
            auto last = line.find_last_not_of(" \t\r\n");
            line = line.substr(first, last - first + 1);

            // 跳过 section
            if (line.front() == '[' && line.back() == ']') continue;

            // 解析 key=value
            auto eq = line.find('=');
            if (eq == std::string::npos) continue;

            std::string key = line.substr(0, eq);
            std::string value = line.substr(eq + 1);

            // trim key 与 value
            auto trim = [](std::string& s) {
                auto f = s.find_first_not_of(" \t");
                auto l = s.find_last_not_of(" \t");
                if (f == std::string::npos) { s.clear(); return; }
                s = s.substr(f, l - f + 1);
            };
            trim(key);
            trim(value);

            cfg.kv_[std::move(key)] = std::move(value);
        }
        return cfg;
    }

    std::optional<std::string> get(std::string_view key) const {
        auto it = kv_.find(key);
        if (it == kv_.end()) return std::nullopt;
        return it->second;
    }

    template<typename T>
    T get_as(std::string_view key, T default_value = T{}) const {
        auto v = get(key);
        if (!v) return default_value;
        if constexpr (std::is_integral_v<T>) {
            int result;
            auto [ptr, ec] = std::from_chars(v->data(), v->data() + v->size(), result);
            if (ec != std::errc{}) return default_value;
            return static_cast<T>(result);
        } else if constexpr (std::is_floating_point_v<T>) {
            double result;
            auto [ptr, ec] = std::from_chars(v->data(), v->data() + v->size(), result);
            if (ec != std::errc{}) return default_value;
            return static_cast<T>(result);
        } else {
            return *v;
        }
    }

    std::vector<std::string_view> keys() const {
        std::vector<std::string_view> result;
        for (const auto& [k, v] : kv_) result.push_back(k);
        return result;
    }
};

int main() {
    try {
        auto cfg = ConfigParser::from_file("config.ini");
        std::cout << "host = " << cfg.get_as<std::string>("host", "localhost") << "\n";
        std::cout << "port = " << cfg.get_as<int>("port", 8080) << "\n";
        std::cout << "debug = " << cfg.get_as<int>("debug", 0) << "\n";
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
    }
    return 0;
}
```

### 5.12 字符串搜索算法实现

```cpp
// file: search_algorithms.cpp
// compile: g++ -std=c++20 -O2 -o search search_algorithms.cpp
#include <string>
#include <string_view>
#include <vector>
#include <unordered_map>
#include <algorithm>

// 1. 朴素搜索（baseline）
std::vector<size_t> naive_search(std::string_view text, std::string_view pattern) {
    std::vector<size_t> result;
    if (pattern.empty() || text.size() < pattern.size()) return result;
    for (size_t i = 0; i <= text.size() - pattern.size(); ++i) {
        size_t j = 0;
        while (j < pattern.size() && text[i + j] == pattern[j]) ++j;
        if (j == pattern.size()) result.push_back(i);
    }
    return result;
}

// 2. KMP 算法
std::vector<size_t> kmp_search(std::string_view text, std::string_view pattern) {
    std::vector<size_t> result;
    if (pattern.empty()) return result;
    if (text.size() < pattern.size()) return result;

    // 构建 failure 函数
    std::vector<size_t> failure(pattern.size(), 0);
    for (size_t i = 1, j = 0; i < pattern.size(); ++i) {
        while (j > 0 && pattern[i] != pattern[j]) j = failure[j - 1];
        if (pattern[i] == pattern[j]) ++j;
        failure[i] = j;
    }

    // 搜索
    for (size_t i = 0, j = 0; i < text.size(); ++i) {
        while (j > 0 && text[i] != pattern[j]) j = failure[j - 1];
        if (text[i] == pattern[j]) ++j;
        if (j == pattern.size()) {
            result.push_back(i - j + 1);
            j = failure[j - 1];
        }
    }
    return result;
}

// 3. Rabin-Karp 算法（单一模式）
std::vector<size_t> rabin_karp_search(std::string_view text,
                                       std::string_view pattern) {
    std::vector<size_t> result;
    if (pattern.empty() || text.size() < pattern.size()) return result;

    const uint64_t BASE = 256;
    const uint64_t MOD = 1000000007ULL;

    uint64_t pattern_hash = 0;
    uint64_t text_hash = 0;
    uint64_t h = 1;

    for (size_t i = 0; i < pattern.size() - 1; ++i) {
        h = (h * BASE) % MOD;
    }

    for (size_t i = 0; i < pattern.size(); ++i) {
        pattern_hash = (pattern_hash * BASE + static_cast<unsigned char>(pattern[i])) % MOD;
        text_hash = (text_hash * BASE + static_cast<unsigned char>(text[i])) % MOD;
    }

    for (size_t i = 0; i <= text.size() - pattern.size(); ++i) {
        if (pattern_hash == text_hash) {
            if (std::equal(pattern.begin(), pattern.end(), text.begin() + i)) {
                result.push_back(i);
            }
        }
        if (i < text.size() - pattern.size()) {
            text_hash = (text_hash + MOD - (h * static_cast<unsigned char>(text[i])) % MOD) % MOD;
            text_hash = (text_hash * BASE + static_cast<unsigned char>(text[i + pattern.size()])) % MOD;
        }
    }
    return result;
}

// 4. Boyer-Moore 算法（简化版，坏字符规则）
std::vector<size_t> boyer_moore_search(std::string_view text,
                                        std::string_view pattern) {
    std::vector<size_t> result;
    if (pattern.empty() || text.size() < pattern.size()) return result;

    // 坏字符表
    std::unordered_map<char, size_t> bad_char;
    for (size_t i = 0; i < pattern.size(); ++i) {
        bad_char[pattern[i]] = i;
    }

    size_t i = 0;
    while (i <= text.size() - pattern.size()) {
        long long j = static_cast<long long>(pattern.size()) - 1;
        while (j >= 0 && pattern[j] == text[i + j]) --j;
        if (j < 0) {
            result.push_back(i);
            // 移动到下一个可能位置
            char next = (i + pattern.size() < text.size()) ? text[i + pattern.size()] : 0;
            size_t shift = pattern.size() - (bad_char.count(next) ? bad_char[next] : 0);
            i += (shift == 0) ? 1 : shift;
        } else {
            char bad = text[i + j];
            size_t shift = j - (bad_char.count(bad) ? bad_char[bad] : -1ULL);
            i += (shift == 0) ? 1 : shift;
        }
    }
    return result;
}

#include <cassert>
int main() {
    std::string text = "ABABDABACDABABCABAB";
    std::string pattern = "ABABC";

    auto r1 = naive_search(text, pattern);
    auto r2 = kmp_search(text, pattern);
    auto r3 = rabin_karp_search(text, pattern);
    auto r4 = boyer_moore_search(text, pattern);

    assert(r1 == r2 && r2 == r3 && r3 == r4);
    return 0;
}
```

## 6. 对比分析

### 6.1 字符串类型选型矩阵

| 场景 | 推荐类型 | 理由 |
| :--- | :--- | :--- |
| 函数参数（只读） | `std::string_view` | 零拷贝，统一接口 |
| 函数参数（需存储） | `const std::string&` 或 `std::string` | 避免视图悬空 |
| 函数返回值（拥有） | `std::string` | RAII 管理 |
| 函数返回值（视图） | `std::string_view`（谨慎） | 调用者需保证生命周期 |
| 成员变量 | `std::string` | 拥有数据 |
| 成员变量（视图） | 不推荐 | 生命周期难以管理 |
| C API 交互 | `std::string`（调用 `c_str()`） | 保证 null 终止 |
| 二进制数据 | `std::string` 或 `std::vector<char>` | 可包含 `\0` |
| UTF-8 文本 | `std::u8string`（C++20） | 类型安全 |
| 大文本处理 | `std::string` + `reserve` | 避免多次分配 |
| 字符串字面量 | `const char*` 或 `std::string_view` | 静态存储 |

### 6.2 格式化方案对比

| 方案 | 类型安全 | 性能 | 可读性 | 标准 | 扩展性 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `printf` | 否（UB 风险） | 中 | 中 | C89 | 弱 |
| `iostream` | 是 | 低 | 低 | C++98 | 强 |
| `std::format` | 是 | 高 | 高 | C++20 | 强 |
| `std::print` | 是 | 最高 | 高 | C++23 | 强 |
| `fmt::format` | 是 | 最高 | 高 | 第三方 | 强 |
| `boost::format` | 是 | 低 | 中 | 第三方 | 中 |

### 6.3 性能基准对比

GCC 13，-O2，10^7 次操作：

| 操作 | 耗时 | 备注 |
| :--- | :--- | :--- |
| `std::string` 构造（SSO） | 8 ns | 15 字节内 |
| `std::string` 构造（堆） | 65 ns | 15+ 字节 |
| `std::string_view` 构造 | 1 ns | 仅指针+长度 |
| `std::string` 拷贝（SSO） | 8 ns | 15 字节内 |
| `std::string` 移动 | 4 ns | O(1) |
| `std::string::find` | O(n) | 朴素算法 |
| `std::string_view::find` | O(n) | 同上 |
| `std::regex_match` | 3200 ns | 慢，NFA |
| CTRE match | 45 ns | 编译期编译 |
| `std::from_chars`（int） | 12 ns | 最优 |
| `std::stoi` | 85 ns | 含异常/locale |
| `std::to_chars`（int） | 9 ns | 最优 |
| `std::to_string`（int） | 75 ns | 内部 sprintf |
| `std::format`（int） | 18 ns | 接近最优 |
| `sprintf`（int） | 55 ns | 慢 |

## 7. 常见陷阱与最佳实践

### 7.1 std::string_view 悬空引用

```cpp
// 反模式：返回临时对象的视图
std::string_view get_first_word(std::string_view s) {
    return s.substr(0, s.find(' '));  // 视图本身 OK
}

// 调用：临时 string 销毁后视图悬空
auto v = get_first_word("hello world"s);  // UB! 临时 string 已销毁

// 正确：延长生命周期或返回拥有类型
std::string get_first_word_safe(std::string_view s) {
    return std::string(s.substr(0, s.find(' ')));
}

// 或：保证底层 string 生命周期
std::string text = "hello world";
auto v = get_first_word(text);  // OK，text 生命周期足够长
```

### 7.2 string_view 与 null 终止

```cpp
// 反模式：将 string_view 传给需要 null 终止的 C 函数
std::string_view sv = "hello";
// printf("%s", sv);  // UB: 隐式转换为 const char* 不存在

// 需要 null 终止时，转为 std::string
std::string s(sv);
printf("%s", s.c_str());  // OK

// 或确保视图来源是 null 终止的
std::string_view sv2 = "hello";  // 字面量，null 终止
printf("%s", sv2.data());  // OK（但需手动确认 null 终止）
```

### 7.3 频繁字符串拼接

```cpp
// 反模式：循环中 += 导致多次重分配
std::string result;
for (int i = 0; i < 1000; ++i) {
    result += std::to_string(i) + ", ";  // 多次临时对象 + 多次重分配
}

// 正确：reserve + 简单拼接
std::string result;
result.reserve(4000);  // 预估容量
for (int i = 0; i < 1000; ++i) {
    result += std::to_string(i);
    result += ", ";
}

// 或使用 ostringstream
std::ostringstream oss;
for (int i = 0; i < 1000; ++i) oss << i << ", ";
std::string result = oss.str();
```

### 7.4 编码混淆

```cpp
// 反模式：在 UTF-8 字符串上用 size() 计算字符数
std::string utf8 = "你好世界";
std::cout << utf8.size() << "\n";  // 12（字节数，非字符数）

// 正确：使用 UTF-8 感知的方法
size_t char_count = utf8_strlen(utf8);  // 4

// 反模式：按字节下标访问
char first = utf8[0];  // 0xE4，'你' 的首字节，无意义

// 正确：按 codepoint 迭代
for (auto ch : utf8_range{utf8}) {
    std::cout << ch;  // 输出完整字符
}
```

### 7.5 std::regex 性能陷阱

```cpp
// 反模式：在循环中构造 regex
for (const auto& line : lines) {
    std::regex re("\\d+");  // 每次循环都编译正则，开销巨大
    if (std::regex_search(line, re)) { /* ... */ }
}

// 正确：循环外构造一次
std::regex re("\\d+");
for (const auto& line : lines) {
    if (std::regex_search(line, re)) { /* ... */ }
}

// 更优：使用编译期正则（CTRE）
// auto re = ctre::search<R"(\d+)">;
// for (auto line : lines) {
//     if (re(line)) { /* ... */ }
// }
```

### 7.6 to_string 的精度问题

```cpp
// 反模式：to_string 浮点数精度不足
double pi = 3.141592653589793;
std::string s = std::to_string(pi);  // "3.141593"（默认 6 位）

// 正确：使用 to_chars 或 format
char buf[32];
auto [ptr, ec] = std::to_chars(buf, buf + sizeof(buf), pi);
std::string s1(buf, ptr);  // "3.141592653589793"（最短往返）

std::string s2 = std::format("{}", pi);       // "3.141592653589793"
std::string s3 = std::format("{:.2f}", pi);   // "3.14"
```

### 7.7 其他陷阱

- **`std::string::c_str()` 失效**：修改或销毁 string 后，c_str() 指针失效。
- **`std::string_view` 与 `const char*` 隐式转换**：`string_view` 不能隐式转 `const char*`，需显式 `sv.data()`（且需保证 null 终止）。
- **`std::stoi` 抛异常**：解析失败抛 `std::invalid_argument` 或 `std::out_of_range`，性能敏感场景用 `from_chars`。
- **`std::string` 与 `nullptr`**：`std::string(nullptr)` 是 UB（C++23 起明确）。
- **编码假设**：`std::string` 不感知编码，按字节处理，需手动保证 UTF-8 一致性。

## 8. 工程实践

### 8.1 API 设计原则

```cpp
// 现代 C++ 字符串 API 设计

// 1. 只读参数：使用 string_view
void process(std::string_view input);

// 2. 需存储的参数：const std::string& 或 std::string
void store(const std::string& data);
void store(std::string data);  // C++17 起推荐，避免拷贝

// 3. 返回拥有字符串：std::string
std::string format();

// 4. 返回视图（谨慎）：string_view，文档明确生命周期
// 注意：调用者必须保证底层 string 生命周期
std::string_view get_name() const;

// 5. 输出参数：std::string&
void append_to(std::string& out);

// 6. 编码明确：使用 u8string（C++20）
std::u8string get_utf8() const;
```

### 8.2 性能优化清单

1. **使用 `string_view` 传参**：避免临时 string 构造。
2. **`reserve()` 预分配**：已知大小时避免多次重分配。
3. **`shrink_to_fit()`**：内存紧张时释放多余容量。
4. **`std::to_chars`/`from_chars`**：高性能数值转换。
5. **`std::format`**：替代 `sprintf` 和 `ostringstream`。
6. **移动语义**：`std::move` 转移所有权。
7. **编译期正则**：使用 CTRE 替代 `std::regex`。
8. **避免 COW 依赖**：C++11 起禁止 COW，但避免假设 `data()` 指针稳定性。
9. **批量操作**：`append(string_view)` 优于循环 `push_back`。
10. **缓存 SSO 状态**：避免对短字符串的 `reserve`（无意义）。

### 8.3 字符串与多线程

```cpp
// std::string 本身线程安全（不同实例可并发操作）
// 但同一实例的并发读写需同步

std::string shared_data;
std::mutex mtx;

// 线程安全写入
void write(std::string_view sv) {
    std::lock_guard lock(mtx);
    shared_data = sv;
}

// 线程安全读取
std::string read() {
    std::lock_guard lock(mtx);
    return shared_data;  // 返回拷贝，避免外部访问时锁竞争
}

// 注意：std::string_view 不能跨线程安全传递
// 视图本身不拥有数据，多线程访问需保证底层 string 生命周期
```

### 8.4 内存优化

```cpp
// 大量小字符串：考虑使用自定义分配器或 arena
std::vector<std::string> many_strings;
// 或使用 boost::small_vector<char, 23> 自定义 SSO 阈值

// 长字符串共享：std::shared_ptr<std::string>
auto shared_text = std::make_shared<std::string>("very long text...");

// 字符串池：避免重复存储相同字符串
class StringPool {
    std::unordered_set<std::string> pool_;
public:
    std::string_view intern(std::string_view sv) {
        auto [it, _] = pool_.emplace(sv);
        return *it;
    }
};
```

### 8.5 国际化与本地化

```cpp
// C++20 之前的 iostream locale
#include <locale>
#include <iostream>

void localized_output() {
    std::locale::global(std::locale("zh_CN.UTF-8"));
    std::cout.imbue(std::locale());
    std::cout << 1234567.89 << "\n";  // 1,234,567.89（取决于 locale）
}

// C++20 std::format 不依赖 locale（除显式 n 格式说明符）
std::cout << std::format("{:n}", 1234567.89);  // 本地化格式

// 推荐：使用 ICU 库处理复杂国际化
// #include <unicode/unistr.h>
// icu::UnicodeString ustr = icu::UnicodeString::fromUTF8("你好");
```

## 9. 案例研究

### 9.1 案例一：HTTP URL 解析器

```cpp
// file: url_parser.cpp
// compile: g++ -std=c++20 -O2 -o url_parser url_parser.cpp
#include <string>
#include <string_view>
#include <optional>
#include <iostream>
#include <vector>

struct Url {
    std::string scheme;
    std::string user;
    std::string password;
    std::string host;
    std::optional<uint16_t> port;
    std::string path;
    std::string query;
    std::string fragment;
};

// URL percent-decoding
std::string percent_decode(std::string_view sv) {
    std::string result;
    result.reserve(sv.size());
    for (size_t i = 0; i < sv.size(); ++i) {
        if (sv[i] == '%' && i + 2 < sv.size()) {
            auto hex = [](char c) -> int {
                if (c >= '0' && c <= '9') return c - '0';
                if (c >= 'a' && c <= 'f') return c - 'a' + 10;
                if (c >= 'A' && c <= 'F') return c - 'A' + 10;
                return -1;
            };
            int h = hex(sv[i + 1]);
            int l = hex(sv[i + 2]);
            if (h >= 0 && l >= 0) {
                result.push_back(static_cast<char>(h * 16 + l));
                i += 2;
                continue;
            }
        }
        result.push_back(sv[i]);
    }
    return result;
}

std::optional<Url> parse_url(std::string_view url) {
    Url result;
    size_t pos = 0;

    // scheme:
    auto scheme_end = url.find("://");
    if (scheme_end == std::string_view::npos) return std::nullopt;
    result.scheme = std::string(url.substr(0, scheme_end));
    pos = scheme_end + 3;

    // userinfo@host:port/path?query#fragment
    auto authority_end = url.find_first_of("/?#", pos);
    std::string_view authority = url.substr(pos, authority_end == std::string_view::npos ?
                                            std::string_view::npos : authority_end - pos);

    // userinfo
    auto at = authority.rfind('@');
    std::string_view host_port;
    if (at != std::string_view::npos) {
        std::string_view userinfo = authority.substr(0, at);
        auto colon = userinfo.find(':');
        if (colon != std::string_view::npos) {
            result.user = percent_decode(userinfo.substr(0, colon));
            result.password = percent_decode(userinfo.substr(colon + 1));
        } else {
            result.user = percent_decode(userinfo);
        }
        host_port = authority.substr(at + 1);
    } else {
        host_port = authority;
    }

    // host:port
    if (host_port.starts_with('[')) {
        // IPv6
        auto bracket = host_port.find(']');
        if (bracket == std::string_view::npos) return std::nullopt;
        result.host = std::string(host_port.substr(0, bracket + 1));
        if (bracket + 1 < host_port.size() && host_port[bracket + 1] == ':') {
            int port;
            auto [_, ec] = std::from_chars(host_port.data() + bracket + 2,
                                            host_port.data() + host_port.size(), port);
            if (ec == std::errc{}) result.port = static_cast<uint16_t>(port);
        }
    } else {
        auto colon = host_port.find(':');
        if (colon != std::string_view::npos) {
            result.host = std::string(host_port.substr(0, colon));
            int port;
            auto [_, ec] = std::from_chars(host_port.data() + colon + 1,
                                            host_port.data() + host_port.size(), port);
            if (ec == std::errc{}) result.port = static_cast<uint16_t>(port);
        } else {
            result.host = std::string(host_port);
        }
    }

    pos = authority_end;
    if (pos == std::string_view::npos) return result;

    // path
    if (pos < url.size() && url[pos] == '/') {
        auto path_end = url.find_first_of("?#", pos);
        result.path = std::string(url.substr(pos, path_end == std::string_view::npos ?
                                              std::string_view::npos : path_end - pos));
        pos = path_end;
    }

    if (pos == std::string_view::npos) return result;

    // query
    if (url[pos] == '?') {
        auto query_end = url.find('#', pos);
        result.query = std::string(url.substr(pos + 1, query_end == std::string_view::npos ?
                                                std::string_view::npos : query_end - pos - 1));
        pos = query_end;
    }

    // fragment
    if (pos != std::string_view::npos && url[pos] == '#') {
        result.fragment = std::string(url.substr(pos + 1));
    }

    return result;
}

int main() {
    auto url = parse_url("https://alice:secret@example.com:8080/path/to/file?q=1&lang=zh#section");
    if (url) {
        std::cout << "scheme:   " << url->scheme << "\n";
        std::cout << "user:     " << url->user << "\n";
        std::cout << "password: " << url->password << "\n";
        std::cout << "host:     " << url->host << "\n";
        std::cout << "port:     " << url->port.value_or(0) << "\n";
        std::cout << "path:     " << url->path << "\n";
        std::cout << "query:    " << url->query << "\n";
        std::cout << "fragment: " << url->fragment << "\n";
    }
    return 0;
}
```

### 9.2 案例二：JSON 字符串解析器

```cpp
// file: json_parser.cpp
// 简化版 JSON 字符串解析（仅演示字符串处理技巧）
// compile: g++ -std=c++20 -O2 -o json_parser json_parser.cpp
#include <string>
#include <string_view>
#include <map>
#include <vector>
#include <variant>
#include <memory>
#include <stdexcept>
#include <sstream>

class JsonValue {
public:
    using Object = std::map<std::string, JsonValue, std::less<>>;
    using Array = std::vector<JsonValue>;
    using Value = std::variant<std::nullptr_t, bool, double, std::string,
                               Array, Object>;
    Value value;

    JsonValue() : value(nullptr) {}
    JsonValue(Value v) : value(std::move(v)) {}

    bool is_null() const { return std::holds_alternative<std::nullptr_t>(value); }
    bool is_bool() const { return std::holds_alternative<bool>(value); }
    bool is_number() const { return std::holds_alternative<double>(value); }
    bool is_string() const { return std::holds_alternative<std::string>(value); }
    bool is_array() const { return std::holds_alternative<Array>(value); }
    bool is_object() const { return std::holds_alternative<Object>(value); }

    const std::string& as_string() const { return std::get<std::string>(value); }
    double as_number() const { return std::get<double>(value); }
    bool as_bool() const { return std::get<bool>(value); }
    const Object& as_object() const { return std::get<Object>(value); }
    const Array& as_array() const { return std::get<Array>(value); }
};

class JsonParser {
    std::string_view text_;
    size_t pos_ = 0;

    void skip_whitespace() {
        while (pos_ < text_.size() && (text_[pos_] == ' ' || text_[pos_] == '\t' ||
                                        text_[pos_] == '\n' || text_[pos_] == '\r')) {
            ++pos_;
        }
    }

    char peek() {
        skip_whitespace();
        if (pos_ >= text_.size()) throw std::runtime_error("unexpected end");
        return text_[pos_];
    }

    char get() {
        char c = peek();
        ++pos_;
        return c;
    }

    JsonValue parse_value() {
        char c = peek();
        if (c == '{') return parse_object();
        if (c == '[') return parse_array();
        if (c == '"') return parse_string();
        if (c == 't' || c == 'f') return parse_bool();
        if (c == 'n') return parse_null();
        return parse_number();
    }

    JsonValue parse_object() {
        JsonValue::Object obj;
        get();  // consume '{'
        if (peek() == '}') { get(); return obj; }
        while (true) {
            auto key = parse_string_raw();
            if (get() != ':') throw std::runtime_error("expected ':'");
            obj.emplace(std::move(key), parse_value());
            char c = get();
            if (c == '}') break;
            if (c != ',') throw std::runtime_error("expected ',' or '}'");
        }
        return obj;
    }

    JsonValue parse_array() {
        JsonValue::Array arr;
        get();  // consume '['
        if (peek() == ']') { get(); return arr; }
        while (true) {
            arr.push_back(parse_value());
            char c = get();
            if (c == ']') break;
            if (c != ',') throw std::runtime_error("expected ',' or ']'");
        }
        return arr;
    }

    std::string parse_string_raw() {
        if (get() != '"') throw std::runtime_error("expected '\"'");
        std::string result;
        while (pos_ < text_.size() && text_[pos_] != '"') {
            if (text_[pos_] == '\\') {
                ++pos_;
                if (pos_ >= text_.size()) throw std::runtime_error("bad escape");
                char esc = text_[pos_++];
                switch (esc) {
                    case '"': result.push_back('"'); break;
                    case '\\': result.push_back('\\'); break;
                    case '/': result.push_back('/'); break;
                    case 'b': result.push_back('\b'); break;
                    case 'f': result.push_back('\f'); break;
                    case 'n': result.push_back('\n'); break;
                    case 'r': result.push_back('\r'); break;
                    case 't': result.push_back('\t'); break;
                    case 'u': {
                        if (pos_ + 4 > text_.size()) throw std::runtime_error("bad unicode");
                        uint32_t cp = 0;
                        for (int i = 0; i < 4; ++i) {
                            char h = text_[pos_++];
                            cp <<= 4;
                            if (h >= '0' && h <= '9') cp |= h - '0';
                            else if (h >= 'a' && h <= 'f') cp |= h - 'a' + 10;
                            else if (h >= 'A' && h <= 'F') cp |= h - 'A' + 10;
                            else throw std::runtime_error("bad hex");
                        }
                        // 简化：仅处理 BMP
                        if (cp < 0x80) {
                            result.push_back(static_cast<char>(cp));
                        } else if (cp < 0x800) {
                            result.push_back(static_cast<char>(0xC0 | (cp >> 6)));
                            result.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
                        } else {
                            result.push_back(static_cast<char>(0xE0 | (cp >> 12)));
                            result.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
                            result.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
                        }
                        break;
                    }
                    default: throw std::runtime_error("bad escape");
                }
            } else {
                result.push_back(text_[pos_++]);
            }
        }
        if (pos_ >= text_.size()) throw std::runtime_error("unterminated string");
        ++pos_;  // consume '"'
        return result;
    }

    JsonValue parse_string() {
        return parse_string_raw();
    }

    JsonValue parse_number() {
        size_t start = pos_;
        if (text_[pos_] == '-') ++pos_;
        while (pos_ < text_.size() && (text_[pos_] >= '0' && text_[pos_] <= '9')) ++pos_;
        if (pos_ < text_.size() && text_[pos_] == '.') {
            ++pos_;
            while (pos_ < text_.size() && (text_[pos_] >= '0' && text_[pos_] <= '9')) ++pos_;
        }
        if (pos_ < text_.size() && (text_[pos_] == 'e' || text_[pos_] == 'E')) {
            ++pos_;
            if (pos_ < text_.size() && (text_[pos_] == '+' || text_[pos_] == '-')) ++pos_;
            while (pos_ < text_.size() && (text_[pos_] >= '0' && text_[pos_] <= '9')) ++pos_;
        }
        double value;
        auto [ptr, ec] = std::from_chars(text_.data() + start, text_.data() + pos_, value);
        if (ec != std::errc{}) throw std::runtime_error("bad number");
        return value;
    }

    JsonValue parse_bool() {
        if (text_.substr(pos_, 4) == "true") { pos_ += 4; return true; }
        if (text_.substr(pos_, 5) == "false") { pos_ += 5; return false; }
        throw std::runtime_error("bad bool");
    }

    JsonValue parse_null() {
        if (text_.substr(pos_, 4) == "null") { pos_ += 4; return nullptr; }
        throw std::runtime_error("bad null");
    }

public:
    explicit JsonParser(std::string_view text) : text_(text) {}

    JsonValue parse() {
        skip_whitespace();
        JsonValue v = parse_value();
        skip_whitespace();
        if (pos_ != text_.size()) throw std::runtime_error("trailing characters");
        return v;
    }
};

int main() {
    std::string json = R"({"name":"张三","age":25,"scores":[95.5,88.0,92.5],"active":true})";
    JsonParser parser(json);
    auto v = parser.parse();
    const auto& obj = v.as_object();
    std::cout << "name: " << obj.at("name").as_string() << "\n";
    std::cout << "age: " << obj.at("age").as_number() << "\n";
    std::cout << "active: " << std::boolalpha << obj.at("active").as_bool() << "\n";
    return 0;
}
```

### 9.3 案例三：CSV 解析器

```cpp
// file: csv_parser.cpp
// compile: g++ -std=c++20 -O2 -o csv_parser csv_parser.cpp
#include <string>
#include <string_view>
#include <vector>
#include <fstream>
#include <stdexcept>

class CsvParser {
    std::string_view line_;
    size_t pos_ = 0;
    char delimiter_;
    char quote_;

public:
    CsvParser(std::string_view line, char delimiter = ',', char quote = '"')
        : line_(line), delimiter_(delimiter), quote_(quote) {}

    std::vector<std::string> parse() {
        std::vector<std::string> fields;
        while (pos_ <= line_.size()) {
            fields.push_back(parse_field());
            if (pos_ < line_.size() && line_[pos_] == delimiter_) {
                ++pos_;
            } else {
                break;
            }
        }
        return fields;
    }

private:
    std::string parse_field() {
        if (pos_ < line_.size() && line_[pos_] == quote_) {
            return parse_quoted_field();
        }
        return parse_unquoted_field();
    }

    std::string parse_unquoted_field() {
        size_t start = pos_;
        while (pos_ < line_.size() && line_[pos_] != delimiter_) {
            ++pos_;
        }
        return std::string(line_.substr(start, pos_ - start));
    }

    std::string parse_quoted_field() {
        ++pos_;  // consume opening quote
        std::string result;
        while (pos_ < line_.size()) {
            if (line_[pos_] == quote_) {
                if (pos_ + 1 < line_.size() && line_[pos_ + 1] == quote_) {
                    // 双引号转义
                    result.push_back(quote_);
                    pos_ += 2;
                } else {
                    ++pos_;  // consume closing quote
                    break;
                }
            } else {
                result.push_back(line_[pos_++]);
            }
        }
        return result;
    }
};

// 流式 CSV 读取
class CsvReader {
    std::ifstream file_;
    char delimiter_;
    char quote_;

public:
    CsvReader(std::string_view path, char delimiter = ',', char quote = '"')
        : file_(std::string(path)), delimiter_(delimiter), quote_(quote) {
        if (!file_) throw std::runtime_error("cannot open: " + std::string(path));
    }

    std::vector<std::string> read_row() {
        std::string line;
        if (!std::getline(file_, line)) return {};
        CsvParser parser(line, delimiter_, quote_);
        return parser.parse();
    }

    bool has_more() { return file_.good(); }
};

int main() {
    // 示例：解析 CSV 行
    CsvParser parser(R"(张三,25,"北京市,朝阳区",95.5)");
    auto fields = parser.parse();
    for (const auto& f : fields) {
        std::cout << "[" << f << "]\n";
    }
    return 0;
}
```

## 10. 习题

### 10.1 基础题

1. **选择题**：下列关于 `std::string_view` 的描述，错误的是？
   - A. `sizeof(std::string_view)` 通常是 16 字节
   - B. `string_view` 不拥有底层字符串的内存
   - C. `string_view` 保证以 null 终止
   - D. `string_view` 的构造是 O(1) 或 O(n)（取决于构造方式）

   **答案**：C。`string_view` 不保证 null 终止，从 `std::string` 构造时虽然底层是 null 终止的，但 `substr` 后的视图可能不指向 null 终止位置。

2. **填空题**：C++17 引入的 `std::from_chars` 与 `std::to_chars` 相比 `std::stoi`/`std::to_string` 的三大优势是：______、______、______。

   **答案**：零内存分配、无异常（通过 `std::errc` 报告错误）、locale 独立（不受 `setlocale` 影响）。

3. **简答题**：解释 SSO（Small String Optimization）的工作原理，并说明其在 32 位与 64 位系统上的典型阈值差异。

4. **编程题**：实现一个函数 `bool is_palindrome(std::string_view sv)`，判断字符串是否为回文（忽略大小写与非字母字符）。

### 10.2 中级题

5. **分析题**：分析以下代码的性能问题并提出优化方案：
   ```cpp
   std::string build_sql(const std::vector<std::string>& fields) {
       std::string sql = "SELECT ";
       for (size_t i = 0; i < fields.size(); ++i) {
           if (i > 0) sql += ", ";
           sql += fields[i];
       }
       sql += " FROM table";
       return sql;
   }
   ```

   **参考答案**：循环中 `+=` 可能触发多次重分配。优化方案：预计算总长度并 `reserve`，或使用 `std::ostringstream`，或使用 `std::format`（C++20）。

6. **编程题**：实现一个函数 `std::vector<std::string_view> tokenize(std::string_view text, std::string_view delimiters)`，按多个分隔符分割字符串。

7. **编程题**：实现一个简单的 URL 编码函数 `std::string url_encode(std::string_view sv)`，将非字母数字字符编码为 `%XX` 形式。

8. **分析题**：解释为什么 C++11 起禁止 `std::string` 的 COW 实现，并说明 COW 在多线程场景下的具体问题。

### 10.3 高级题

9. **编程题**：实现一个 UTF-8 字符串类 `Utf8String`，提供：
   - `size()` 返回字符数（非字节数）
   - `at(size_t i)` 返回第 i 个字符的 codepoint
   - `substr(size_t start, size_t count)` 返回子串
   - 迭代器支持按字符遍历

10. **设计题**：设计一个零拷贝的日志格式化库，要求：
    - 接受任意类型参数（使用变参模板）
    - 编译期检查格式串（C++20 `consteval`）
    - 支持自定义类型的 formatter
    - 高性能（避免临时 `std::string` 构造）

11. **编程题**：实现 KMP 字符串搜索算法，并编写基准测试对比与 `std::string::find` 的性能差异。

12. **分析题**：分析 `std::regex` 与 CTRE（编译期正则）的性能差异原因，并讨论在什么场景下应选择哪种方案。

### 10.4 开放题

13. **思考题**：C++ 标准库为何不内置强大的字符串处理功能（如 Python 的 `str.split`、`str.replace`）？这是设计哲学还是历史包袱？

14. **调研题**：调研 ICU、boost::locale、utfcpp 三个 Unicode 处理库，对比其功能、性能、易用性，并给出选型建议。

15. **设计题**：设计一个支持多种编码（UTF-8/UTF-16/UTF-32）的通用字符串类型，要求：
    - 类型安全（编译期区分编码）
    - 零开销（不引入额外运行时开销）
    - 可互转（显式转换）
    - 与标准库兼容

## 11. 参考文献

### 11.1 标准文档

- **ISO/IEC 14882:2023** — *Information technology — Programming languages — C++*，第 6 章 Strings，第 22 章 String views libraries，第 20.20 章 Format library。
- **ISO/IEC 10646:2020** — *Information technology — Universal Coded Character Set (UCS)*，Unicode 字符集标准。
- **RFC 3629** — *UTF-8, a transformation format of ISO 10646*，UTF-8 编码规范。
- **RFC 3986** — *Uniform Resource Identifier (URI): Generic Syntax*，URL 编码规范。

### 11.2 提案文档

- **P0220R1** — *A Proposal to Add string_view to the Standard Library*.
- **P0067R5** — *Elementary string conversions*.
- **P0645R10** — *Text Formatting*.
- **P0482R6** — *char8_t: A type for UTF-8 Characters*.
- **P2093R14** — *Formatted Output*.
- **P1885R12** — *Text Encoding Identification*.
- **P1679R3** — *contains() for string/string_view*.

### 11.3 教材与书籍

- **Stroustrup, B.** (2013). *The C++ Programming Language* (4th ed.). Addison-Wesley. 第 36 章 Strings。
- **Meyers, S.** (2005). *Effective STL*. Addison-Wesley. 第 13/15/16 条款。
- **Sutter, H., & Alexandrescu, A.** (2004). *C++ Coding Standards*. Addison-Wesley. 第 50 条款字符串处理。
- **Williams, A.** (2019). *C++ Concurrency in Action* (2nd ed.). Manning. 字符串与多线程。
- **Nicol, B.** (2020). *Professional CMake: A Practical Guide*.
- **Zverev, V.** (2021). *fmt Library Documentation*. https://fmt.dev

### 11.4 论文与文章

- **Boyer, R. S., & Moore, J. S.** (1977). *A Fast String Searching Algorithm*. Communications of the ACM, 20(10).
- **Knuth, D. E., Morris, J. H., & Pratt, V. R.** (1977). *Fast Pattern Matching in Strings*. SIAM Journal on Computing, 6(2).
- **Karp, R. M., & Rabin, M. O.** (1987). *Efficient randomized pattern-matching algorithms*. IBM Journal of Research and Development, 31(2).
- **Davis, T.** (2002). *Unicode and Software Internationalization*. https://unicode.org
- **Malaus, J.** (2018). *The strange details of std::format*. https://www.zverovich.net/

### 11.5 在线资源

- **cppreference.com** — *Strings library*. https://en.cppreference.com/w/cpp/string
- **cppreference.com** — *String views library*. https://en.cppreference.com/w/cpp/string_view
- **cppreference.com** — *Format library*. https://en.cppreference.com/w/cpp/utility/format
- **Unicode Consortium** — *Unicode Technical Reports*. https://www.unicode.org/reports/
- **fmt GitHub** — https://github.com/fmtlib/fmt
- **CTRE GitHub** — https://github.com/hanickadot/compile-time-regular-expressions
- **ICU Project** — https://icu.unicode.org/

## 12. 延伸阅读

### 12.1 书籍推荐

- **Sutter, H.** (1999). *Exceptional C++*. Addison-Wesley. 第 1-4 条款字符串与异常安全。
- **Alexandrescu, A.** (2001). *Modern C++ Design*. Addison-Wesley. 第 4 章基于策略的字符串设计。
- **Wilson, M.** (2004). *Imperfect C++*. Addison-Wesley. 第 12 章字符串优化。
- **Meyers, S.** (2001). *Effective STL*. Addison-Wesley. 字符串相关条款。

### 12.2 视频与课程

- **CppCon 2018: Victor Zverev, "std::format: What it is and why you should use it"** — `std::format` 作者讲解设计动机。
- **CppCon 2019: Marshall Clow, "string_view: The past, present, and future"** — `string_view` 演进与陷阱。
- **CppCon 2021: Jean Guegant, "Compile-time Regular Expressions"** — CTRE 介绍。
- **MIT 6.172: Performance Engineering of Software Systems** — 字符串处理性能优化案例。
- **Stanford CS106L: Standard C++ Programming** — 字符串与 STL 实战。

### 12.3 开源实现参考

- **fmt** — 高性能格式化库，`std::format` 的原型。https://github.com/fmtlib/fmt
- **CTRE** — 编译期正则表达式库。https://github.com/hanickadot/compile-time-regular-expressions
- **RE2** — Google 的高性能正则引擎，线性时间复杂度保证。https://github.com/google/re2
- **ICU** — IBM 的 Unicode 国际化库。https://github.com/unicode-org/icu
- **utfcpp** — 轻量级 UTF-8 处理库。https://github.com/nemtrif/utfcpp
- **abseil StrCat** — Google 的高性能字符串拼接。https://abseil.io/docs/cpp/guides/strings
- **boost::string_ref / boost::string_view** — `std::string_view` 的前身。
- **boost::spirit** — 基于 EDSL 的字符串解析框架。

### 12.4 相关主题

- **C++ 标准**：C++20 `std::format`、C++23 `std::print`、C++26 `std::text_encoding`
- **字符编码**：Unicode、UTF-8/16/32、Big5、GBK、Shift-JIS、Latin-1
- **国际化**：gettext、ICU、boost::locale、Android resources
- **解析**：PEG parser、spirit、ANTLR、bison/flex
- **协议**：JSON、XML、YAML、TOML、CSV、URL、URI
- **安全**：缓冲区溢出、注入攻击、编码混淆、Unicode 同形攻击
- **性能**：SIMD 字符串搜索、Hyperscan、Ragel、boost::xpressive

### 12.5 实践建议

1. **优先使用 `std::string_view`** 作为只读字符串参数，减少拷贝。
2. **优先使用 `std::format`** 替代 `sprintf` 和 `iostream`，类型安全且高性能。
3. **数值转换优先 `std::from_chars`/`std::to_chars`**，性能最优且无 locale 依赖。
4. **避免 `std::regex`** 在性能敏感场景，使用 CTRE 或 RE2。
5. **明确字符串编码**，C++20 起优先使用 `std::u8string` 表示 UTF-8。
6. **避免 `string_view` 悬空**，文档明确生命周期，或返回 `std::string`。
7. **预分配字符串**，已知大小时调用 `reserve()`。
8. **使用 RAII**，避免手动 `malloc`/`free` 字符串。
9. **测试 UTF-8 边界**，包括代理对、组合字符、零宽字符。
10. **关注第三方库**，fmt、ICU、RE2 是字符串处理的瑞士军刀。
