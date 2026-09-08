---
order: 750
title: C++ 链接与符号
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ 链接与符号完整教学：名字修饰、内/外部链接、ODR、undefined reference 与 multiple definition 排查、静态/动态库、符号可见性。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'cpp/025-NamespaceLinkage'
  - 'cpp/012-Cpp20Module'
  - 'cpp/073-CMakeBuild'
  - 'cpp/030-CppToolchain'
prerequisites:
  - 'cpp/003-CppBasicSyntax'
---

## 学习目标

- 理解「编译 → 汇编 → 链接」全流程中符号扮演的角色，读懂 `nm`/`ldd` 输出
- 解释两大经典链接错误（undefined reference / multiple definition）的成因并独立修复
- 掌握 `extern "C"`、`inline`、匿名命名空间、符号可见性这几个控制链接行为的工具

## 前置知识

- 声明与定义的区别（头文件放声明、源文件放定义）
- 命名空间与存储期基础：[命名空间与链接](/cpp/025-NamespaceLinkage)

## 概念引入

C++ 程序的构建分三步：每个 `.cpp` 独立编译成目标文件（`.o`），链接器再把它们
**缝合成一个可执行文件**。缝合的依据就是**符号（symbol）**——每个函数、每个全局
变量在目标文件里都有一个符号名。

可以把链接器想象成「拼图的质检员」：每个 `.o` 都是一块拼图，上面贴着两列清单——
「我提供了这些符号（定义）」和「我需要这些符号（引用）」。质检员的工作是把所有
「需要」对上「提供」；对不上的名字就是 `undefined reference`，同一个名字出现两张
「提供」就是 `multiple definition`。**这两类错误占了新手链接问题的九成**。

### 名字修饰（name mangling）

C++ 支持重载，`foo(int)` 和 `foo(double)` 必须有不同的符号名。编译器把名字、
命名空间、参数类型一起编码成修饰名（mangled name），例如 `foo::bar()` 在 GCC 下
变成 `_ZN3foo3barEv`。这就是链接错误信息里「外星文」的来源，`c++filt` 可以还原：

```bash
echo _ZN3foo3barEv | c++filt   # 输出 foo::bar()
nm -C main.o                   # -C 直接让 nm 输出 demangle 后的可读名字
```

## 链接基础命令

```bash
# 链接多个目标文件
g++ main.o utils.o io.o -o app

# 链接时指定库：-L 添加搜索路径，-l 链接库（libutils.a/.so 写作 -lutils）
g++ main.o -L./lib -lutils -o app

# 完全静态链接（把 libc 等也打进来，产物大但部署简单）
g++ main.cpp -static -o app

# 动态链接：产物小，运行时需要找得到 .so
g++ main.cpp -lutils -o app
LD_LIBRARY_PATH=/path/to/lib ./app    # 临时指定运行时搜索路径
```

**库顺序陷阱**：GNU ld 按从左到右的顺序解析符号，「谁依赖谁，被依赖者放后面」：
`g++ main.cpp -lA -lB` 表示 A 依赖 B。放错顺序是 undefined reference 的常见成因。

## 符号查看工具速查

### nm：列出目标文件符号

```bash
nm main.o            # 列出符号
nm -C main.o         # C++ 名字 demangle
nm -D libutils.so    # 只看动态符号（导出表）
```

常见符号类型（首字母大写 = 全局，小写 = 局部）：

| 类型 | 含义 |
| --- | --- |
| `T`/`t` | 代码段（已定义的函数） |
| `U` | 未定义（本文件引用、别处定义）——链接器要替它找到下家 |
| `D`/`d` | 已初始化数据 |
| `B`/`b` | 未初始化数据（BSS） |
| `W`/`w` | 弱符号 |
| `V`/`v` | 弱对象（如虚函数表） |

`U` 的意义值得专门体会：**编译是逐文件进行的**，`main.o` 只知道「我要调 `utils.o`
里的函数」，至于是谁、在哪，全留给链接器。这解释了为什么语法正确的程序仍会链接失败。

### objdump / readelf / ldd

```bash
objdump -d main.o             # 反汇编（-M intel 用 Intel 语法）
objdump -t libutils.so        # 符号表；-T 只看动态符号
readelf -h app                # ELF 头；-S 段表；-s 符号表；-d 动态段
ldd ./app                     # 列出运行期动态库依赖与解析结果
ldconfig -p | grep utils      # 查询动态链接器缓存
```

`ldd` 输出中 `not found` 是「编译能过、运行必崩」的预告：动态库在链接期只是记了
个名字，真正加载在运行期。部署环境的库搜索路径可用 RPATH 内置进可执行文件：

```bash
# $ORIGIN 表示可执行文件所在目录（注意 shell 转义）
g++ main.cpp -L./lib -lutils -Wl,-rpath,'$ORIGIN/../lib' -o app
```

## 内部链接与外部链接：从源头控制符号

每个名字都有**链接属性（linkage）**：

- **外部链接（external linkage）**：跨编译单元可见。普通函数、全局变量默认如此。
- **内部链接（internal linkage）**：仅本编译单元可见。`static` 全局、匿名命名空间成员、
  `constexpr` 变量（默认内部链接）。

```cpp
// a.cpp
int counter = 0;                    // 外部链接：b.cpp 里 extern int counter 可见
static int hidden = 1;              // 内部链接：仅 a.cpp 可见

namespace {                         // 匿名命名空间：现代 C++ 推荐的内部链接写法
    int alsoHidden = 2;
}

// b.cpp
extern int counter;                 // 声明（不定义），使用 a.cpp 的定义
// extern int hidden;               // 链接错误：hidden 是内部链接
```

配套的两大规则值得背下来：

1. **头文件里只放声明**。定义放头文件、被多个 `.cpp` 包含，就会触发
   `multiple definition`（非 inline 的函数/变量）。
2. **需要放定义进头文件时给 `inline`**。`inline` 在此的语义是「允许多个编译单元
   重复定义，链接器合并成一份」，与「内联展开」的性能含义是两回事。

## 两大链接错误排查手册

### undefined reference to `xxx`

链接器找不到「需要的符号」。按以下顺序排查：

```bash
# 1. 拼写/签名不一致：C++ 修饰名包含参数类型，声明与定义参数不同就是两个符号
nm -C utils.o | grep bar       # 确认目标符号真的存在

# 2. 忘了链接库或路径
g++ main.o -L./lib -lutils -o app

# 3. 库顺序：被依赖的放后面
g++ main.o -lA -lB             # A 依赖 B 时这样放

# 4. C/C++ 混链：C 编译器不修饰名字，C++ 调 C 库要加 extern "C"
```

```cpp
#ifdef __cplusplus
extern "C" {
#endif
void c_api_init(int flags);    // 按 C 语言规则生成符号，不加修饰
#ifdef __cplusplus
}
#endif
```

`extern "C"` 只影响**链接期符号名**（以及函数类型的一部分），不改变语言语义；
它是 C++/C 库互操作的桥梁。

### multiple definition of `xxx`

同一个外部符号有多份定义。常见成因与修法：

```cpp
// 错误写法：头文件里定义非 inline 函数
// utils.h
void log_time() { /* ... */ }          // 每个 include 它的 .cpp 都定义一次

// 修法 1：头文件声明 + 源文件定义（首选）
// utils.h:  void log_time();
// utils.cpp: void log_time() { /* ... */ }

// 修法 2：头文件 inline 定义（短函数）
inline void log_time() { /* ... */ }

// 修法 3：匿名命名空间/static —— 仅当「故意每单元一份」时使用，会增大体积
```

头文件还要有 include guard 或 `#pragma once`，但注意：**guard 防的是同一编译单元内
重复包含，防不了跨编译单元的重复定义**——两者是不同的问题。

## 弱符号与符号可见性

### 弱符号（扩展特性）

GCC/Clang 的 `__attribute__((weak))` 让定义成为「可被覆盖的默认实现」，常用于
回调挂钩、嵌入式启动代码：

```cpp
// 用户定义同名强符号时，链接器选择强符号；否则保留此默认实现
__attribute__((weak)) void on_tick() {
    // 默认什么都不做
}
```

**注意**：这是编译器扩展而非标准 C++，跨平台项目慎用；混链 MSVC 时应改用
「注册函数指针」等标准手法。

### 动态库符号可见性

动态库默认导出所有外部符号，导致：符号冲突风险、加载慢、无法有效内联。工程惯例是
**默认隐藏、显式导出**：

```bash
g++ -fvisibility=hidden -fvisibility-inlines-hidden -c engine.cpp
```

```cpp
__attribute__((visibility("default"))) void api_open();   // 导出
void internal_helper();                                    // 默认隐藏
```

大型项目（LLVM、Qt 等）与跨平台动态库基本都采用这套策略。

## 链接脚本与 Map 文件（进阶）

```bash
# 自定义链接脚本（嵌入式、裸机开发常见；用 g++ 而不是裸 ld 以带上 C++ 运行时）
g++ -T linker.ld main.o -o firmware.elf

# 生成 map 文件：记录每个符号的最终地址与来源，查体积膨胀/符号冲突利器
g++ main.cpp -Wl,-Map,app.map -o app
```

## 常见陷阱清单

1. **改了函数签名只改了头文件**：忘了重编译某个 `.cpp`，运行期调用旧符号。清理构建
   缓存（CMake 用户执行干净构建）再链。
2. **模板定义放 `.cpp`**：模板必须在头文件中定义（或显式实例化），否则别的单元
   无法实例化出符号，链接报 undefined reference。
3. **`const` 全局变量跨文件不可见**：`const`/`constexpr` 全局变量默认内部链接，
   跨文件共享要 `inline constexpr`（C++17 起）或 `extern`。
4. **动态库版本不匹配**：链接时和运行时的 `.so` 版本不同，轻则 not found 重则
   符号解析错误。用 `ldd` 与 `readelf -d` 核对 SONAME。
5. **`extern "C"` 里放模板或重载**：修饰规则不允许，直接编译错误——extern "C"
   只适用于非模板、不重载的名字。

## 小结

**初学者记住这三点：**

1. 链接错误分两类：找不到（undefined reference，查拼写/库/顺序）与重复
   （multiple definition，查头文件里的定义，补 inline）；
2. 头文件放声明，定义进 `.cpp`；要放头文件就 `inline`；
3. `nm -C`、`ldd`、`c++filt` 是排障三件套，学会读它们比背结论更快。

**进阶者还需注意：**

- 内部链接（`static`、匿名命名空间、`constexpr`）是控制符号污染的第一道闸门；
- 动态库遵循「默认隐藏、显式导出」，可见性属性比全局默认导出更工程化；
- `extern "C"`、弱符号、链接脚本、map 文件是跨语言互操作与嵌入式场景的进阶工具。
