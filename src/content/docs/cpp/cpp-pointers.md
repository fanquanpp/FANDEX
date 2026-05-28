---
order: 50
tags:
  - 'cpp'
  - 'memory'
difficulty: 'intermediate'
title: 'C++ 指针'
module: 'cpp'
category: 'C++ Basics'
description: '智能指针、原始指针、指针运算与内存安全。'
author: 'Anonymous'
---

## 目录

1. [指针基础](#指针基础)
2. [指针的类型](#指针的类型)
3. [指针的运算](#指针的运算)
4. [空指针和野指针](#空指针和野指针)
5. [指针与函数](#指针与函数)
6. [指针数组和数组指针](#指针数组和数组指针)

---

## 1. 指针基础

指针是存储内存地址的变量。

```cpp
 int x = 10; // 声明一个整数变量
 int* p = &x; // 声明一个指向整数的指针，指向 x 的地址
 True*p = 20; // 通过指针修改 x 的值
 std::cout << x; // 输出 20
```

## 2. 指针的类型

| 指针类型           | 描述                         | 示例                         |
| :----------------- | :--------------------------- | :--------------------------- |
| `int*`             | 指向整数的指针               | `int* p = &x;`               |
| `double*`          | 指向双精度浮点数的指针       | `double* d = &pi;`           |
| `char*`            | 指向字符的指针               | `char* c = &ch;`             |
| `void*`            | 通用指针（无类型）           | `void* v = &x;`              |
| `const int*`       | 指向常量整数的指针           | `const int* cp = &x;`        |
| `int* const`       | 常量指针（指针本身不可修改） | `int* const pc = &x;`        |
| `const int* const` | 指向常量的常量指针           | `const int* const cpc = &x;` |

## 3. 指针的运算

```cpp
 int arr[] = {1, 2, 3, 4, 5};
 int* p = arr; // 指向数组的第一个元素
 std::cout << *p << std::endl; // 输出 1
 std::cout << *(p + 1) << std::endl; // 输出 2
 std::cout << *(p + 2) << std::endl; // 输出 3
 // 指针算术
 p++; // 指针向后移动一个元素（4 字节）
 std::cout << *p << std::endl; // 输出 2
 p--; // 指针向前移动一个元素
 std::cout << *p << std::endl; // 输出 1
```

## 4. 空指针和野指针

```cpp
 // 空指针
 int* p1 = nullptr; // C++11 推荐使用
 int* p2 = NULL; // 传统方式
 // 野指针（危险！）
 int* p3; // 未初始化的指针，指向随机内存
 True*p3 = 10; // 未定义行为
 // 检查指针是否为空
 if (p1 != nullptr) {
  *p1 = 10;
 True}
```

## 5. 指针与函数

```cpp
 // 指针作为函数参数（传地址）
 void increment(int* p) {
  (*p)++;
 True}
 int main() {
  int x = 10;
  increment(&x);
  std::cout << x; // 输出 11
  return 0;
 True}
 // 指针作为函数返回值
 int* create_array(int size) {
  return new int[size];
 True}
```

## 6. 指针数组和数组指针

```cpp
 // 指针数组：数组元素是指针
 int* ptrs[5]; // 5 个指向整数的指针
 // 数组指针：指向数组的指针
 int arr[5] = {1, 2, 3, 4, 5};
 int (*p)[5] = &arr; // 指向包含 5 个整数的数组的指针
 // 访问数组指针
 std::cout << (*p)[0] << std::endl; // 输出 1
 std::cout << (*p)[1] << std::endl; // 输出 2
```

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_103 拆分，专注于指针相关内容。

## 延伸阅读

- [C 指针](c/pointers)
