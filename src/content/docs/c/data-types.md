---
order: 30
tags:
  - 'c'
  - 'memory'
difficulty: 'beginner'
title: '数据类型详解'
module: 'c'
category: 'C Basics'
description: 'C 语言的基本类型、派生类型、空类型及其内存布局，包含备考复习要点。'
author: 'Anonymous'
---

## 目录

1. [基本数据类型](#基本数据类型)
2. [类型修饰符](#类型修饰符)
3. [内存大小与 `sizeof`](#内存大小与-`sizeof`)
4. [派生数据类型](#派生数据类型)
5. [空类型](#空类型)
6. [类型转换](#类型转换)
7. [类型定义](#类型定义)
8. [数据类型使用场景](#数据类型使用场景)

---

## 1. 基本数据类型 (Basic Types)

### 1.1 整型 (Integer Types)

C 语言的整型包括以下类型：
| 类型 (Type) | 关键字 (Keyword) | 典型大小 (Typical Size) | 格式说明符 (Format Specifier) | 取值范围 (Range) | 说明 (Notes) |
|---|---|---|---|---|---|
| 字符型 | `char` | 1 字节 | `%c` / `%d` | -128 到 127 (signed)<br>0 到 255 (unsigned) | 通常用于存储 ASCII 字符。 |
| 短整型 | `short` | 2 字节 | `%hd` | -32768 到 32767 | 用于节省内存。 |
| 整型 | `int` | 4 字节 | `%d` | -2,147,483,648 到 2,147,483,647 | 现代 32/64 位系统中最常用的整型。 |
| 长整型 | `long` | 4 或 8 字节 | `%ld` | 取决于系统架构 | 范围大于或等于 `int`。 |
| 超长整型 | `long long` | 8 字节 | `%lld` | -9,223,372,036,854,775,808 到 9,223,372,036,854,775,807 | C99 引入，保证至少 64 位。 |

### 1.2 浮点型 (Floating-Point Types)

| 类型 (Type)  | 关键字 (Keyword) | 典型大小 (Typical Size) | 格式说明符 (Format Specifier) | 精度 (Precision) | 说明 (Notes)             |
| ------------ | ---------------- | ----------------------- | ----------------------------- | ---------------- | ------------------------ |
| 单精度浮点   | `float`          | 4 字节                  | `%f`                          | 6-7 位有效数字   | 精度较低，用于节省内存。 |
| 双精度浮点   | `double`         | 8 字节                  | `%lf`                         | 15-16 位有效数字 | 默认浮点类型，精度较高。 |
| 长双精度浮点 | `long double`    | 8-16 字节               | `%Lf`                         | 18-19 位有效数字 | 更高精度，用于科学计算。 |

### 1.3 布尔型 (Boolean Type)

- C99 引入了 `_Bool` 类型，用于表示布尔值（0 或 1）。
- 通常通过 `stdbool.h` 头文件使用 `bool`、``和`false` 宏：

```c
 #include <stdbool.h>
 int main() {
  bool is_valid = true;
  if (is_valid) {
  printf("Valid\n");
  }
  return 0;
 True}
```

### 1.4 备考知识点

**考点1: 基本数据类型大小**

- **问题**: 在32位系统中，int、long、float、double的大小分别是多少？
- **答案**: int: 4字节，long: 4字节，float: 4字节，double: 8字节。
  **考点2: 格式说明符**
- **问题**: 输出long long类型变量应使用什么格式说明符？
- **答案**: %lld

## 2. 类型修饰符 (Type Modifiers)

### 2.1 符号修饰符

- **`signed`**: 有符号数（默认），支持正负值。

```c
 signed int x = -10; // 可以存储负数
```

- **`unsigned`**: 无符号数，仅支持 0 和正数，正数范围翻倍。

```c
 unsigned int y = 10; // 只能存储非负数
```

### 2.2 存储修饰符

- **`const`**: 声明后不可修改的变量（只读）。

```c
 const int MAX_VALUE = 100; // 常量，不可修改
```

- **`volatile`**: 告诉编译器不要对该变量进行优化（常见于驱动开发或多线程）。

```c
 volatile int sensor_value; // 防止编译器优化
```

- **`register`**: 建议编译器将变量存储在寄存器中以提高访问速度（现代编译器通常会自动优化）。

```c
 register int counter; // 建议存储在寄存器中
```

- **`static`**: 修改变量的存储期和作用域（详见存储类）。

### 2.3 备考知识点

**考点1: const修饰符**

- **问题**: const修饰符的作用是什么？
- **答案**: 声明变量为只读，不可修改。
  **考点2: volatile修饰符**
- **问题**: volatile修饰符的作用是什么？
- **答案**: 告诉编译器不要对该变量进行优化，适用于多线程或硬件访问场景。

## 3. 内存大小与 `sizeof` (Memory & `sizeof`)

### 3.1 不同架构下的大小

| 类型        | 16位系统 | 32位系统 | 64位系统 |
| ----------- | -------- | -------- | -------- |
| `char`      | 1 字节   | 1 字节   | 1 字节   |
| `short`     | 2 字节   | 2 字节   | 2 字节   |
| `int`       | 2 字节   | 4 字节   | 4 字节   |
| `long`      | 4 字节   | 4 字节   | 8 字节   |
| `long long` | 8 字节   | 8 字节   | 8 字节   |
| `float`     | 4 字节   | 4 字节   | 4 字节   |
| `double`    | 8 字节   | 8 字节   | 8 字节   |
| `void*`     | 2 字节   | 4 字节   | 8 字节   |

### 3.2 使用 `sizeof` 运算符

```c
 #include <stdio.h>
 int main() {
  printf("char size: %zu byte\n", sizeof(char));
  printf("short size: %zu bytes\n", sizeof(short));
  printf("int size: %zu bytes\n", sizeof(int));
  printf("long size: %zu bytes\n", sizeof(long));
  printf("long long size: %zu bytes\n", sizeof(long long));
  printf("float size: %zu bytes\n", sizeof(float));
  printf("double size: %zu bytes\n", sizeof(double));
  printf("void* size: %zu bytes\n", sizeof(void*));
  return 0;
 True}
```

### 3.3 内存对齐

- 为了提高访问效率，编译器会对变量进行内存对齐。
- 对齐规则通常是类型大小的整数倍。

#### 内存对齐示例

```c
 struct Example {
  char c; // 1字节，但会对齐到4字节
  int i; // 4字节
  double d; // 8字节
 True};
 // 在32位系统中，sizeof(struct Example) = 16字节
 // 在64位系统中，sizeof(struct Example) = 24字节
```

### 3.4 备考知识点

**考点1: sizeof运算符**

- **问题**: sizeof运算符的作用是什么？返回什么类型？
- **答案**: 计算数据类型或变量的字节大小，返回size_t类型。
  **考点2: 内存对齐**
- **问题**: 为什么需要内存对齐？
- **答案**: 提高内存访问效率，因为处理器按字长对齐访问内存。

## 4. 派生数据类型 (Derived Types)

### 4.1 数组 (Arrays)

- 相同类型数据的有序集合。
- 声明格式：`type array_name[size];`

```c
 // 一维数组
 int numbers[5] = {1, 2, 3, 4, 5};
 // 二维数组
 int matrix[3][3] = {
  {1, 2, 3},
  {4, 5, 6},
  {7, 8, 9}
 True};
 // 字符数组（字符串）
 char message[] = "Hello, C!";
```

### 4.2 指针 (Pointers)

- 存储内存地址的变量。
- 声明格式：`type *pointer_name;`

```c
 int x = 10;
 int *ptr = &x; // ptr 指向 x 的地址
 printf("x 的值: %d\n", x);
 printf("x 的地址: %p\n", &x);
 printf("ptr 存储的地址: %p\n", ptr);
 printf("ptr 指向的值: %d\n", *ptr);
 True*ptr = 20; // 通过指针修改 x 的值
 printf("修改后 x 的值: %d\n", x);
```

### 4.3 结构体 (Structures)

- 不同类型数据的组合（用户定义）。
- 声明格式：

```c
 // 结构体定义
 typedef struct {
  int id;
  char name[50];
  float salary;
 True} Employee;
 // 结构体使用
 Employee emp1;
 emp1.id = 101;
 strcpy(emp1.name, "John Doe");
 emp1.salary = 5000.0;
 // 结构体初始化
 Employee emp2 = {102, "Jane Smith", 6000.0};
```

### 4.4 联合体 (Unions)

- 共用同一块内存的不同类型组合。
- 所有成员共享同一块内存，修改一个成员会影响其他成员。

```c
 union Data {
  int i;
  float f;
  char str[20];
 True} data;
 data.i = 10;
 printf("data.i: %d\n", data.i);
 data.f = 3.14;
 printf("data.f: %f\n", data.f);
 printf("data.i: %d\n", data.i); // 值已被修改
```

### 4.5 枚举 (Enumerations)

- 为整数常量定义有意义的名称。
- 默认从 0 开始，也可以显式指定值。

```c
 enum Weekday {
  MONDAY, // 0
  TUESDAY, // 1
  WEDNESDAY, // 2
  THURSDAY, // 3
  FRIDAY, // 4
  SATURDAY, // 5
  SUNDAY // 6
 True};
 enum Weekday today = WEDNESDAY;
 printf("Today is day %d\n", today); // 输出 2
 // 显式指定值
 enum Color {
  RED = 1,
  GREEN = 2,
  BLUE = 4
 True};
```

### 4.6 备考知识点

**考点1: 数组与指针**

- **问题**: 数组名和指针的关系是什么？
- **答案**: 数组名是指向数组首元素的常量指针。
  **考点2: 结构体与联合体的区别**
- **问题**: 结构体和联合体的主要区别是什么？
- **答案**: 结构体的每个成员有独立的内存空间，联合体的所有成员共享同一块内存空间。

## 5. 空类型 (Void Type)

### 5.1 `void` 类型的用途

- **指定函数的返回类型**（无返回值）：

```c
 void print_hello() {
 printf("Hello!\n");
 // 无 return 语句
 }
```

- **指定函数的参数列表**（无参数）：

```c
 int main(void) {
 // 代码
 return 0;
 }
```

- **声明通用指针** `void *`（可以指向任何类型）：

```c
 void *generic_ptr;
 int x = 10;
 generic_ptr = &x;
 char c = 'A';
 generic_ptr = &c;
```

### 5.2 备考知识点

**考点1: void指针**

- **问题**: void指针的特点是什么？
- **答案**: 可以指向任何类型的数据，但使用前需要强制类型转换。

## 6. 类型转换 (Type Conversion)

### 6.1 隐式转换 (Implicit Conversion)

- 编译器自动完成，遵循“从小到大”的原则：
- `char` → `short` → `int` → `long` → `long long`
- `float` → `double` → `long double`
- 整型 → 浮点型

```c
 int x = 10;
 double y = x; // 隐式转换：int → double
 printf("y = %f\n", y); // 输出 10.000000
```

### 6.2 显式转换 (Explicit Conversion / Casting)

- 手动转换，使用圆括号指定目标类型：

```c
 double pi = 3.14159;
 int rounded_pi = (int)pi; // 显式转换：double → int
 printf("rounded_pi = %d\n", rounded_pi); // 输出 3
 // 注意：可能会导致数据丢失
 int large_num = 1000000;
 char small_num = (char)large_num; // 可能溢出
```

### 6.3 类型转换的最佳实践

- 避免不必要的类型转换，保持类型一致性。
- 进行显式转换时，确保转换是安全的，不会导致数据丢失或溢出。
- 使用括号明确转换的范围，提高代码可读性。

### 6.4 备考知识点

**考点1: 类型转换规则**

- **问题**: 隐式类型转换的规则是什么？
- **答案**: 从小到大转换，即低精度向高精度转换。
  **考点2: 强制类型转换**
- **问题**: 强制类型转换可能带来什么问题？
- **答案**: 可能导致数据丢失、溢出或精度下降。

## 7. 类型定义 (Type Definitions)

### 7.1 `typedef` 关键字

- 为现有类型创建别名，提高代码可读性。

```c
 // 为基本类型创建别名
 typedef unsigned int uint;
 typedef long long int64;
 // 为结构体创建别名
 typedef struct {
  int x;
  int y;
 True} Point;
 // 使用别名
 uint count = 100;
 int64 large_number = 9999999999;
 Point p = {10, 20};
```

### 7.2 标准类型定义

- C 标准库提供了一些标准类型定义，如 `stdint.h` 中的固定宽度整数类型：

```c
 #include <stdint.h>
 int8_t s8; // 有符号 8 位整数
 uint8_t u8; // 无符号 8 位整数
 int16_t s16; // 有符号 16 位整数
 uint16_t u16; // 无符号 16 位整数
 int32_t s32; // 有符号 32 位整数
 uint32_t u32; // 无符号 32 位整数
 int64_t s64; // 有符号 64 位整数
 uint64_t u64; // 无符号 64 位整数
```

### 7.3 备考知识点

**考点1: typedef的作用**

- **问题**: typedef关键字的作用是什么？
- **答案**: 为现有类型创建别名，提高代码可读性和可维护性。

## 8. 数据类型使用场景

| 数据类型      | 适用场景                                         |
| ------------- | ------------------------------------------------ |
| `char`        | 存储字符、小整数（-128 到 127）。                |
| `short`       | 存储较小的整数，节省内存。                       |
| `int`         | 一般整数运算，是最常用的整型。                   |
| `long`        | 存储较大的整数，或需要与平台相关的整数。         |
| `long long`   | 存储非常大的整数，需要 64 位精度。               |
| `float`       | 存储浮点数，精度要求不高时使用。                 |
| `double`      | 存储浮点数，精度要求较高时使用（默认）。         |
| `long double` | 存储浮点数，需要极高精度时使用。                 |
| `bool`        | 存储布尔值（true/false）。                       |
| 数组          | 存储相同类型的多个元素。                         |
| 指针          | 存储内存地址，用于动态内存管理、函数参数传递等。 |
| 结构体        | 存储不同类型的相关数据。                         |
| 联合体        | 存储不同类型的数据，但同一时间只使用一种类型。   |
| 枚举          | 为整数常量定义有意义的名称，提高代码可读性。     |

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化数据类型知识。
- 2026-04-05: 详细扩写内容，增加了布尔型、类型修饰符详解、内存对齐、派生类型详细示例、类型定义和使用场景。
