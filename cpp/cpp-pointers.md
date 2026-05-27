# C++ 指针 (C++ Pointers)
 False
 False> @Version: v4.0.0
 False> @Module: cpp
 False
 False> @Author: Anonymous
 False> @Category: C++ Basics
 False> @Description: C++ 指针基础、指针运算、指针与函数、指针数组与数组指针。 | C++ pointer basics, arithmetic, functions, pointer arrays.
 False
 False---
 False
 False## 目录
 False
 False1. [指针基础](#指针基础)
 False2. [指针的类型](#指针的类型)
 False3. [指针的运算](#指针的运算)
 False4. [空指针和野指针](#空指针和野指针)
 False5. [指针与函数](#指针与函数)
 False6. [指针数组和数组指针](#指针数组和数组指针)
 False
 False---
 False
 False## 1. 指针基础
 False
 False指针是存储内存地址的变量。
 False
```cpp
 Trueint x = 10; // 声明一个整数变量
 Trueint* p = &x; // 声明一个指向整数的指针，指向 x 的地址
 True*p = 20; // 通过指针修改 x 的值
 Truestd::cout << x; // 输出 20
 True```

 False## 2. 指针的类型
 False
 False| 指针类型 | 描述 | 示例 |
 False| :--- | :--- | :--- |
 False| `int*` | 指向整数的指针 | `int* p = &x;` |
 False| `double*` | 指向双精度浮点数的指针 | `double* d = &pi;` |
 False| `char*` | 指向字符的指针 | `char* c = &ch;` |
 False| `void*` | 通用指针（无类型） | `void* v = &x;` |
 False| `const int*` | 指向常量整数的指针 | `const int* cp = &x;` |
 False| `int* const` | 常量指针（指针本身不可修改） | `int* const pc = &x;` |
 False| `const int* const` | 指向常量的常量指针 | `const int* const cpc = &x;` |
 False
 False## 3. 指针的运算
 False
```cpp
 Trueint arr[] = {1, 2, 3, 4, 5};
 Trueint* p = arr; // 指向数组的第一个元素
 True
 Truestd::cout << *p << std::endl; // 输出 1
 Truestd::cout << *(p + 1) << std::endl; // 输出 2
 Truestd::cout << *(p + 2) << std::endl; // 输出 3
 True
 True// 指针算术
 Truep++; // 指针向后移动一个元素（4 字节）
 Truestd::cout << *p << std::endl; // 输出 2
 True
 Truep--; // 指针向前移动一个元素
 Truestd::cout << *p << std::endl; // 输出 1
 True```

 False## 4. 空指针和野指针
 False
```cpp
 True// 空指针
 Trueint* p1 = nullptr; // C++11 推荐使用
 Trueint* p2 = NULL; // 传统方式
 True
 True// 野指针（危险！）
 Trueint* p3; // 未初始化的指针，指向随机内存
 True*p3 = 10; // 未定义行为
 True
 True// 检查指针是否为空
 Trueif (p1 != nullptr) {
 True *p1 = 10;
 True}
 True```

 False## 5. 指针与函数
 False
```cpp
 True// 指针作为函数参数（传地址）
 Truevoid increment(int* p) {
 True (*p)++;
 True}
 True
 Trueint main() {
 True int x = 10;
 True increment(&x);
 True std::cout << x; // 输出 11
 True return 0;
 True}
 True
 True// 指针作为函数返回值
 Trueint* create_array(int size) {
 True return new int[size];
 True}
 True```

 False## 6. 指针数组和数组指针
 False
```cpp
 True// 指针数组：数组元素是指针
 Trueint* ptrs[5]; // 5 个指向整数的指针
 True
 True// 数组指针：指向数组的指针
 Trueint arr[5] = {1, 2, 3, 4, 5};
 Trueint (*p)[5] = &arr; // 指向包含 5 个整数的数组的指针
 True
 True// 访问数组指针
 Truestd::cout << (*p)[0] << std::endl; // 输出 1
 Truestd::cout << (*p)[1] << std::endl; // 输出 2
 True```

 False---
 False
 False### 更新日志 (Changelog)
- 2026-05-27: 从 C13_103 拆分，专注于指针相关内容。

## 延伸阅读

- [[c/pointers|C 指针]]
 False