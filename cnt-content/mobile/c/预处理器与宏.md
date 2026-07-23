# 预处理器与宏

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 文件包含

**系统头文件写法：包含系统头文件**
`#include <<header>>`
```c
// 包含标准输入输出头文件
#include <stdio.h>
```

---

**用户头文件写法：包含自定义头文件**
`#include "<header>"`
```c
// 包含当前目录下的头文件
#include "myheader.h"
```

---

## 宏定义

**基本写法：无参宏定义常量**
`#define <NAME> <value>`
```c
// 定义缓冲区大小常量
#define MAX_BUFFER 1024
```

---

**字符串写法：宏定义字符串**
`#define <NAME> "<string>"`
```c
// 定义版本号字符串
#define VERSION "1.0.0"
```

---

**带参写法：带参宏定义**
`#define <NAME>(<params>) <expression>`
```c
// 定义求最大值的宏
#define MAX(a, b) ((a) > (b) ? (a) : (b))
```

---

**多行写法：多行宏定义**
`#define <NAME>(<params>) do { ... } while(0)`
```c
// 多行宏定义
#define LOG_ERROR(msg) do { \
    fprintf(stderr, "Error: %s\n", msg); \
    exit(1); \
} while(0)
```

---

**字符串化写法：# 运算符**
`#define <NAME>(x) #x`
```c
// 将参数转换为字符串
#define STRINGIFY(x) #x
```

---

**标记拼接写法：## 运算符**
`#define <NAME>(a, b) a##b`
```c
// 拼接两个标记
#define CONCAT(a, b) a##b
```

---

**可变参数写法：可变参数宏**
`#define <NAME>(<fixed>, ...) <expr>(__VA_ARGS__)`
```c
// 可变参数宏
#define LOG(fmt, ...) printf(fmt, __VA_ARGS__)
```

---

## 宏取消定义

**基本写法：取消宏定义**
`#undef <NAME>`
```c
// 取消 MAX_BUFFER 的定义
#undef MAX_BUFFER
```

---

## 条件编译

**基本写法：ifdef 条件编译**
`#ifdef <MACRO> ... #endif`
```c
// 如果定义了 DEBUG 宏则编译
#ifdef DEBUG
    printf("Debug mode\n");
#endif
```

---

**基本写法：ifndef 条件编译**
`#ifndef <MACRO> ... #endif`
```c
// 如果未定义 HEADER_H 则编译
#ifndef HEADER_H
#define HEADER_H
void my_function();
#endif
```

---

**基本写法：if 条件编译**
`#if <condition> ... #endif`
```c
// 根据条件编译
#if VERSION >= 2
    printf("Version 2+\n");
#endif
```

---

**多分支写法：if-elif-else 条件编译**
`#if <cond1> ... #elif <cond2> ... #else ... #endif`
```c
// 多分支条件编译
#if defined(WIN32)
    #define OS "Windows"
#elif defined(LINUX)
    #define OS "Linux"
#else
    #define OS "Unknown"
#endif
```

---

**defined 写法：检查宏是否定义**
`#if defined(<MACRO>)`
```c
// 检查宏是否已定义
#if defined(DEBUG) && defined(VERBOSE)
    printf("Debug verbose mode\n");
#endif
```

---

## 预定义宏

**基本写法：使用预定义宏**
`__FILE__` / `__LINE__` / `__DATE__` / `__TIME__`
```c
// 输出文件名和行号
printf("File: %s, Line: %d\n", __FILE__, __LINE__);
```

---

**基本写法：使用 __func__**
`__func__`
```c
// 输出当前函数名
void my_function() {
    printf("Function: %s\n", __func__);
}
```

---

## pragma 指令

**基本写法：使用 pragma**
`#pragma <directive>`
```c
// 使用 once 防止重复包含
#pragma once
```

---

**pack 写法：设置结构体对齐**
`#pragma pack(<n>)`
```c
// 设置 1 字节对齐
#pragma pack(1)
struct Packed {
    char c;
    int i;
};
#pragma pack()
```

---

**message 写法：编译时输出消息**
`#pragma message("<message>")`
```c
// 编译时输出提示信息
#pragma message("Compiling " __FILE__)
```

---

## 行控制

**基本写法：修改行号和文件名**
`#line <line_number> "<filename>"`
```c
// 修改编译器报告的行号和文件名
#line 100 "custom_file.c"
```

---

## 错误指令

**基本写法：编译时错误**
`#error <message>`
```c
// 编译时产生错误
#ifndef VERSION
#error "VERSION must be defined"
#endif
```

---

## 宏与函数对比

**宏写法：使用宏实现简单函数**
`#define <NAME>(<params>) <expression>`
```c
// 使用宏实现平方运算
#define SQUARE(x) ((x) * (x))
```

---

**内联写法：使用内联函数替代宏**
`inline <type> <func>(<params>) { ... }`
```c
// 使用内联函数实现平方运算
inline int square(int x) {
    return x * x;
}
```

---

## 头文件保护

**基本写法：使用 ifndef 保护头文件**
`#ifndef <HEADER_H> / #define <HEADER_H> / ... / #endif`
```c
// 头文件保护宏
#ifndef MY_HEADER_H
#define MY_HEADER_H
void my_function();
#endif /* MY_HEADER_H */
```

---

**once 写法：使用 pragma once**
`#pragma once`
```c
// 使用 pragma once 防止重复包含
#pragma once
void my_function();
```

---

## 预处理运算符

**字符串化写法：# 运算符**
`#define <NAME>(x) #x`
```c
// 将宏参数转换为字符串
#define PRINT_VAR(x) printf(#x " = %d\n", x)
```

---

**标记拼接写法：## 运算符**
`#define <NAME>(a, b) a##b`
```c
// 拼接两个标记形成新标识符
#define CREATE_VAR(name) int name##Var = 0
```
