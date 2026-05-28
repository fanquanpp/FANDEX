---
order: 20
tags:
  - 'c'
difficulty: 'beginner'
title: '程序结构与基本语法'
module: 'c'
category: 'C Basics'
description: 'C 程序的组成部分、注释规范、标识符规则及关键字。'
author: 'Anonymous'
---

## 目录

1. [程序结构](#程序结构)
2. [注释规范](#注释规范)
3. [标识符](#标识符)
4. [关键字](#关键字)
5. [编译过程](#编译过程)
6. [程序执行流程](#程序执行流程)

---

## 1. 程序结构 (Program Structure)

### 1.1 源文件结构

一个典型的 C 语言源文件 (`.c`) 通常包含以下部分：

```c
 /*
  * 预处理器指令：包含头文件
  * Preprocessor Directives: Include headers
  */
 #include <stdio.h>
 /*
  * 宏定义与常量
  * Macros and Constants
  */
 #define PI 3.14159
 #define MAX_SIZE 100
 /*
  * 类型定义
  * Type Definitions
  */
 typedef unsigned int uint;
 typedef struct {
  int x;
  int y;
 True} Point;
 /*
  * 全局变量声明
  * Global Variables
  */
 int global_count = 0;
 const double GRAVITY = 9.8;
 /*
  * 函数原型声明
  * Function Prototypes
  */
 void print_hello();
 double calculate_area(double radius);
 /*
  * 主函数：程序的入口
  * Main Function: Entry point
  */
 int main() {
  // 局部变量 | Local Variables
  int local_val = 10;
  double radius = 5.0;
  // 执行语句 | Statements
  printf("Hello C! Value: %d\n", local_val);
  print_hello();
  double area = calculate_area(radius);
  printf("Area of circle: %.2f\n", area);
  // 返回值 | Return value (0 means success)
  return 0;
 True}
 /*
  * 函数实现
  * Function Implementation
  */
 void print_hello() {
  printf("Hello from function!\n");
 True}
 double calculate_area(double radius) {
  return PI * radius * radius;
 True}
```

### 1.2 头文件结构

头文件 (`.h`) 通常包含：

```c
 /*
  * 防止重复包含的头文件保护
  * Header guard
  */
 #ifndef MY_HEADER_H
 #define MY_HEADER_H
 /*
  * 包含其他头文件
  * Include other headers
  */
 #include <stdio.h>
 /*
  * 宏定义
  * Macros
  */
 #define VERSION "1.0"
 /*
  * 类型定义
  * Type definitions
  */
 typedef struct {
  int id;
  char name[50];
 True} Student;
 /*
  * 函数原型
  * Function prototypes
  */
 void init_student(Student *s, int id, const char *name);
 void print_student(const Student *s);
 #endif /* MY_HEADER_H */
```

## 2. 注释规范 (Comments)

### 2.1 注释类型

- **单行注释**: 使用 `//` (C99+ 支持)，用于简短的说明。

```c
 // 这是一个单行注释
 int x = 10; // 行尾注释
```

- **多行注释**: 使用 `/* ... */`，用于较长的说明或注释掉代码块。

```c
 /*
 * 这是一个多行注释
 * 可以跨越多行
 */
 /* 注释掉的代码
 int y = 20;
 printf("%d\n", y);
 */
```

- **文档注释**: 采用 Doxygen 格式，用于生成文档。

```c
 /**
 * @brief 计算圆的面积
 * @param radius 圆的半径
 * @return 圆的面积
 */
 double calculate_area(double radius) {
 return PI * radius * radius;
 }
```

### 2.2 注释最佳实践

- **适度注释**: 只注释难以理解的代码，避免过多注释。
- **清晰明了**: 注释应简洁明了，说明代码的意图而非实现细节。
- **保持更新**: 代码修改时，同步更新相关注释。
- **一致风格**: 团队内保持统一的注释风格。

## 3. 标识符 (Identifiers)

### 3.1 命名规则

用于命名变量、函数、数组、结构体等。

- **基本规则**:
- 只能由字母 (A-Z, a-z)、数字 (0-9) 和下划线 (\_) 组成。
- 第一个字符必须是字母或下划线。
- 区分大小写 (`myVar` 和 `myvar` 是不同的)。
- 不能使用关键字或保留字。
- 长度通常限制为 31 个字符（不同编译器可能有差异）。

### 3.2 命名约定

- **变量名**: 通常使用 `snake_case`，如 `user_age`、`total_count`。
- **函数名**: 通常使用 `snake_case`，如 `calculate_area`、`print_student`。
- **常量名**: 通常使用全大写加下划线，如 `MAX_SIZE`、`PI`。
- **结构体名**: 通常使用 `PascalCase`，如 `Student`、`Point`。
- **类型定义**: 通常使用 `snake_case` 并加 `_t` 后缀，如 `uint8_t`、`size_t`。

### 3.3 命名最佳实践

- **描述性**: 变量名应清晰描述其用途，如 `user_name` 而非 `un`。
- **一致性**: 同一项目中保持命名风格一致。
- **避免缩写**: 除非是广为人知的缩写（如 `id`、`url`）。
- **避免单字母变量**: 除了循环计数器（如 `i`、`j`）和数学变量（如 `x`、`y`）。

## 4. 关键字 (Keywords)

### 4.1 基本关键字 (C89/90)

C 语言共有 32 个基本关键字：
| 分类 | 关键字 |
|------|--------|
| 类型 | `int`, `char`, `float`, `double`, `void`, `long`, `short`, `signed`, `unsigned` |
| 控制流 | `if`, `else`, `switch`, `case`, `default`, `for`, `while`, `do`, `break`, `continue`, `return`, `goto` |
| 存储类 | `auto`, `register`, `static`, `extern`, `const`, `volatile` |
| 复合类型 | `struct`, `union`, `enum`, `typedef` |
| 运算符相关 | `sizeof` |

### 4.2 C99 新增关键字

- `inline`, `restrict`, `_Bool`, `_Complex`, `_Imaginary`

### 4.3 C11 新增关键字

- `_Alignas`, `_Alignof`, `_Atomic`, `_Generic`, `_Noreturn`, `_Static_assert`, `_Thread_local`

### 4.4 C23 新增关键字

- `nullptr`, `typeof`, `__VA_OPT__`

## 5. 编译过程 (Compilation Process)

### 5.1 详细编译步骤

1. **预处理 (Preprocessing)**:

- 处理 `#include` 指令，将头文件内容插入到源文件中
- 处理 `#define` 指令，替换宏定义
- 处理条件编译指令（如 `#if`, `#ifdef`, `#ifndef`）
- 删除注释
- 输出预处理后的文件（通常为 `.i` 文件）

2. **编译 (Compilation)**:

- 将预处理后的代码转换为汇编代码
- 进行语法检查和语义分析
- 进行优化（根据编译选项）
- 输出汇编文件（通常为 `.s` 文件）

3. **汇编 (Assembly)**:

- 将汇编代码转换为机器码
- 生成目标文件（通常为 `.o` 文件，Windows 下为 `.obj`）

4. **链接 (Linking)**:

- 将多个目标文件合并
- 解析外部符号引用
- 链接标准库和第三方库
- 生成可执行文件（Linux 下无扩展名，Windows 下为 `.exe`）

### 5.2 编译示例

```bash
 # 1. 预处理
 gcc -E hello.c -o hello.i
 # 2. 编译
  gcc -S hello.i -o hello.s
 # 3. 汇编
 gcc -c hello.s -o hello.o
 # 4. 链接
 gcc hello.o -o hello
 # 一步完成所有步骤
 gcc hello.c -o hello
 # 启用优化
 gcc -O2 hello.c -o hello
 # 生成调试信息
 gcc -g hello.c -o hello
```

### 5.3 多文件编译

```bash
 # 编译多个源文件
 gcc file1.c file2.c -o program
 # 分别编译，然后链接
 gcc -c file1.c -o file1.o
 gcc -c file2.c -o file2.o
 gcc file1.o file2.o -o program
```

## 6. 程序执行流程

### 6.1 主函数执行

- 程序从 `main()` 函数开始执行
- `main()` 函数可以有参数：

```c
 // 无参数形式
 int main() {
 // 代码
 return 0;
 }
 // 带命令行参数形式
 int main(int argc, char *argv[]) {
 // argc: 参数个数
 // argv: 参数数组
 for (int i = 0; i < argc; i++) {
 printf("Argument %d: %s\n", i, argv[i]);
 }
 return 0;
 }
```

### 6.2 程序终止

- 正常终止：执行 `return 0;` 或 `exit(0);`
- 异常终止：执行 `exit(n);` 其中 n ≠ 0
- `return` 语句会返回到调用者，而 `exit()` 会直接终止整个程序

---

### 更新日志 (Changelog)

- 2026-04-05: 拆分并细化基础语法。
- 2026-04-05: 详细扩写内容，增加了头文件结构、注释最佳实践、命名约定、关键字分类、编译过程详解和程序执行流程。
