---
order: 43
title: 函数与模块化
module: 'getting-started'
category: 入门指南
difficulty: beginner
description: 函数定义与参数传递、模块化编程、文件操作、异常处理与调试基础。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'getting-started/数的表示与编码'
  - 'getting-started/程序设计基础'
  - 'getting-started/学习路线规划'
  - 'getting-started/环境变量与PATH'
prerequisites:
  - 'getting-started/入门指南'
---

## 1. 函数定义

函数是将一段特定功能的代码封装起来、可以重复调用的程序单元。使用函数可以让代码更清晰、更易维护。

### 1.1 函数的四个组成部分

```
返回类型  函数名(参数列表)
{
    函数体
}
```

| 组成部分 | 说明                                   | 示例               |
| -------- | -------------------------------------- | ------------------ |
| 返回类型 | 函数返回值的数据类型，void表示无返回值 | `int`, `void`      |
| 函数名   | 函数的标识符，调用时使用               | `add`, `printInfo` |
| 参数列表 | 函数接收的输入，可以为空               | `(int a, int b)`   |
| 函数体   | 花括号内的执行代码                     | `{ return a+b; }`  |

### 1.2 函数定义与调用

```c
#include <stdio.h>

// 函数定义：计算两个整数的最大值
int max(int a, int b) {
    return a > b ? a : b;
}

// 函数定义：无返回值
void greet(const char* name) {
    printf("Hello, %s!\n", name);
}

int main() {
    // 函数调用
    int result = max(10, 20);
    printf("较大值: %d\n", result);  // 20

    greet("FANDEX");                  // Hello, FANDEX!
    return 0;
}
```

### 1.3 函数声明（原型）

如果函数定义在调用之后，需要在调用前声明函数原型：

```c
#include <stdio.h>

// 函数声明（原型），告诉编译器函数的存在
int factorial(int n);

int main() {
    printf("5! = %d\n", factorial(5));  // 120
    return 0;
}

// 函数定义在main之后
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

### 1.4 函数的执行流程

```
main() 调用 max(10, 20)
  │
  ├── 保存当前执行位置
  ├── 将实参 10, 20 传递给形参 a, b
  ├── 进入 max 函数体执行
  ├── return 返回结果 20
  ├── 恢复之前的执行位置
  │
  ▼
继续执行 main 中的下一行
```

### 1.5 递归函数

函数直接或间接调用自身称为递归。递归必须要有**终止条件**，否则会无限递归导致栈溢出。

```c
// 递归求斐波那契数列第n项
int fibonacci(int n) {
    if (n <= 0) return 0;       // 终止条件1
    if (n == 1) return 1;       // 终止条件2
    return fibonacci(n - 1) + fibonacci(n - 2);  // 递归调用
}

// 递归求阶乘
int factorial(int n) {
    if (n <= 1) return 1;       // 终止条件
    return n * factorial(n - 1); // 递归调用
}
```

> 递归代码简洁但效率可能较低（如斐波那契的重复计算）。实际开发中，简单的递归可以用循环替代，复杂的递归可以用记忆化（缓存已计算结果）优化。

## 2. 参数传递方式

### 2.1 值传递

将实参的**副本**传递给形参，函数内对形参的修改不影响实参。

```c
void try_change(int x) {
    x = 100;  // 只修改了副本，不影响原始变量
}

int main() {
    int a = 10;
    try_change(a);
    printf("a = %d\n", a);  // a = 10，值未改变
    return 0;
}
```

值传递的内存示意：

```
调用前:  a ──► [10]
调用时:  a ──► [10]    x ──► [10]  (复制了一份)
修改后:  a ──► [10]    x ──► [100] (x变了，a不变)
```

### 2.2 指针传递（模拟引用传递）

C语言没有真正的引用传递，但可以通过传递指针来修改原始变量：

```c
void swap(int* pa, int* pb) {
    int temp = *pa;
    *pa = *pb;
    *pb = temp;
}

int main() {
    int a = 3, b = 5;
    swap(&a, &b);  // 传递a和b的地址
    printf("a=%d, b=%d\n", a, b);  // a=5, b=3，值已交换
    return 0;
}
```

指针传递的内存示意：

```
调用前:  a ──► [3]    b ──► [5]
调用时:  pa ──► a ──► [3]    pb ──► b ──► [5]
修改后:  pa ──► a ──► [5]    pb ──► b ──► [3] (通过指针修改了原始值)
```

### 2.3 C++ 的引用传递

C++ 提供了真正的引用传递语法：

```cpp
// 引用传递：形参是实参的别名
void swap(int& a, int& b) {
    int temp = a;
    a = b;
    b = temp;
}

int main() {
    int x = 3, y = 5;
    swap(x, y);  // 不需要取地址符
    printf("x=%d, y=%d\n", x, y);  // x=5, y=3
    return 0;
}
```

### 2.4 两种传递方式对比

| 特性       | 值传递               | 引用/指针传递        |
| ---------- | -------------------- | -------------------- |
| 传递内容   | 实参的副本           | 实参的地址/引用      |
| 函数内修改 | 不影响实参           | 可以修改实参         |
| 内存开销   | 需要复制数据         | 只传地址，开销小     |
| 安全性     | 较高（不会意外修改） | 需要注意空指针等问题 |
| 适用场景   | 基本类型、小型对象   | 大对象、需要修改实参 |

### 2.5 数组作为参数

数组传递给函数时，实际传递的是数组首元素的地址（退化为指针）：

```c
// 以下三种写法等价
void print_array(int arr[], int len);
void print_array(int arr[10], int len);  // 10会被忽略
void print_array(int* arr, int len);     // 本质是指针

void print_array(int arr[], int len) {
    for (int i = 0; i < len; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");
}

int main() {
    int nums[] = {1, 2, 3, 4, 5};
    print_array(nums, 5);  // 1 2 3 4 5
    return 0;
}
```

> 因为数组退化为指针，函数内无法用 `sizeof` 获取数组长度，所以必须额外传递长度参数。

## 3. 模块化编程

当程序规模变大时，将代码拆分为多个文件是必要的。模块化编程的核心思想是**声明与实现分离**。

### 3.1 头文件与源文件分离

```
项目结构:
├── math_utils.h    ← 头文件：声明（告诉别人"有什么"）
├── math_utils.c    ← 源文件：实现（告诉编译器"怎么做"）
└── main.c          ← 主程序：调用
```

**math_utils.h（头文件）：**

```c
#ifndef MATH_UTILS_H
#define MATH_UTILS_H

// 函数声明
int max(int a, int b);
int min(int a, int b);
int factorial(int n);

#endif // MATH_UTILS_H
```

**math_utils.c（源文件）：**

```c
#include "math_utils.h"

int max(int a, int b) {
    return a > b ? a : b;
}

int min(int a, int b) {
    return a < b ? a : b;
}

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

**main.c（主程序）：**

```c
#include <stdio.h>
#include "math_utils.h"  // 包含自定义头文件

int main() {
    printf("max(3,7) = %d\n", max(3, 7));
    printf("min(3,7) = %d\n", min(3, 7));
    printf("5! = %d\n", factorial(5));
    return 0;
}
```

### 3.2 编译多文件项目

```bash
# 分别编译各源文件为目标文件
gcc -c math_utils.c -o math_utils.o
gcc -c main.c -o main.o

# 链接所有目标文件
gcc math_utils.o main.o -o program

# 运行
./program
```

### 3.3 #pragma once

`#pragma once` 是比传统头文件保护更简洁的方式：

```c
// 传统方式（跨平台，推荐）
#ifndef MATH_UTILS_H
#define MATH_UTILS_H
// ... 内容
#endif

// #pragma once 方式（简洁，主流编译器都支持）
#pragma once
// ... 内容
```

| 方式         | 优点              | 缺点                 |
| ------------ | ----------------- | -------------------- |
| #ifndef 保护 | 标准C，完全可移植 | 冗长，宏名可能冲突   |
| #pragma once | 简洁，不会冲突    | 非标准（但广泛支持） |

### 3.4 static 关键字在模块化中的作用

```c
// math_utils.c

// static 函数：只在当前文件可见（内部链接）
static int helper(int x) {
    return x * x;
}

// 非static函数：可以被其他文件调用（外部链接）
int compute(int x) {
    return helper(x) + 1;
}
```

```c
// 全局变量同理
static int file_count = 0;  // 只在当前文件可见
int total_count = 0;         // 其他文件可通过 extern 访问
```

### 3.5 extern 关键字

```c
// config.h
extern int global_config;  // 声明：告诉编译器这个变量存在

// config.c
int global_config = 42;    // 定义：实际分配内存

// main.c
#include "config.h"
#include <stdio.h>
int main() {
    printf("config = %d\n", global_config);  // 42
    return 0;
}
```

## 4. 文件操作

文件操作是程序与外部数据交互的基本方式。C语言通过标准库 `<stdio.h>` 提供文件操作函数。

### 4.1 文件操作基本流程

```
打开文件(fopen) → 读写操作(fread/fwrite等) → 关闭文件(fclose)
```

### 4.2 fopen — 打开文件

```c
FILE* fopen(const char* filename, const char* mode);
```

| 模式 | 含义       | 文件不存在时 | 文件已存在时     |
| ---- | ---------- | ------------ | ---------------- |
| "r"  | 只读       | 失败         | 从头读取         |
| "w"  | 只写       | 创建新文件   | 清空内容         |
| "a"  | 追加写入   | 创建新文件   | 在末尾追加       |
| "r+" | 读写       | 失败         | 从头读写         |
| "w+" | 读写       | 创建新文件   | 清空后读写       |
| "a+" | 读+追加    | 创建新文件   | 读从开头，写追加 |
| "rb" | 二进制只读 | 失败         | 从头读取         |
| "wb" | 二进制只写 | 创建新文件   | 清空内容         |

```c
FILE* fp = fopen("data.txt", "r");
if (fp == NULL) {
    printf("文件打开失败\n");
    return -1;
}
```

### 4.3 字符与字符串读写

```c
// 写入字符
fputc('A', fp);
fputs("Hello, World!\n", fp);

// 读取字符
int ch = fgetc(fp);    // 返回int而非char，为了区分EOF(-1)

// 读取一行
char line[256];
fgets(line, sizeof(line), fp);  // 最多读255个字符，保留'\n'
```

### 4.4 格式化读写

```c
// 写入格式化数据
fprintf(fp, "Name: %s, Age: %d\n", "Alice", 25);

// 读取格式化数据
char name[50];
int age;
fscanf(fp, "Name: %s, Age: %d", name, &age);
```

### 4.5 二进制读写（fread / fwrite）

```c
#include <stdio.h>
#include <string.h>

typedef struct {
    int id;
    char name[32];
    float score;
} Student;

int main() {
    Student stu = {1, "Alice", 95.5f};

    // 写入二进制文件
    FILE* fp = fopen("students.dat", "wb");
    if (fp) {
        fwrite(&stu, sizeof(Student), 1, fp);
        fclose(fp);
    }

    // 读取二进制文件
    Student read_stu;
    fp = fopen("students.dat", "rb");
    if (fp) {
        fread(&read_stu, sizeof(Student), 1, fp);
        fclose(fp);
        printf("ID: %d, Name: %s, Score: %.1f\n",
               read_stu.id, read_stu.name, read_stu.score);
    }

    return 0;
}
```

### 4.6 文件定位

```c
// 移动文件指针
fseek(fp, 0, SEEK_SET);   // 移到文件开头
fseek(fp, 0, SEEK_END);   // 移到文件末尾
fseek(fp, -10, SEEK_CUR); // 从当前位置后退10字节

// 获取当前偏移量
long pos = ftell(fp);

// 获取文件大小
fseek(fp, 0, SEEK_END);
long file_size = ftell(fp);
fseek(fp, 0, SEEK_SET);
```

### 4.7 完整示例：文件复制

```c
#include <stdio.h>

int main() {
    FILE* src = fopen("input.txt", "rb");
    FILE* dst = fopen("output.txt", "wb");

    if (!src || !dst) {
        printf("文件打开失败\n");
        return -1;
    }

    // 逐字节复制
    int ch;
    while ((ch = fgetc(src)) != EOF) {
        fputc(ch, dst);
    }

    fclose(src);
    fclose(dst);
    printf("复制完成\n");
    return 0;
}
```

## 5. 异常处理机制

程序运行时可能遇到各种意外情况（文件不存在、内存不足、除零等），需要异常处理来保证程序健壮性。

### 5.1 C语言的错误处理

C语言没有内置的异常处理机制，通常通过返回值和全局变量 `errno` 处理错误：

```c
#include <stdio.h>
#include <errno.h>
#include <string.h>

int main() {
    FILE* fp = fopen("nonexistent.txt", "r");
    if (fp == NULL) {
        // 方式1: 使用perror（自动输出errno对应的错误信息）
        perror("打开文件失败");

        // 方式2: 使用strerror
        printf("错误码: %d, 错误信息: %s\n", errno, strerror(errno));

        return -1;
    }
    fclose(fp);
    return 0;
}
```

### 5.2 C++ 的 try-catch

C++ 提供了结构化的异常处理机制：

```cpp
#include <iostream>
#include <stdexcept>
using namespace std;

double divide(double a, double b) {
    if (b == 0) {
        throw invalid_argument("除数不能为零");
    }
    return a / b;
}

int main() {
    try {
        double result = divide(10, 0);
        cout << "结果: " << result << endl;
    }
    catch (const invalid_argument& e) {
        cout << "参数错误: " << e.what() << endl;
    }
    catch (const exception& e) {
        cout << "异常: " << e.what() << endl;
    }
    catch (...) {
        cout << "未知异常" << endl;
    }
    return 0;
}
```

### 5.3 C++ 异常的执行流程

```
try {
    语句1;
    语句2;  ← 抛出异常
    语句3;  ← 不会执行
}
catch (...) {
    语句4;  ← 跳转到这里执行
}
语句5;      ← catch处理后继续执行
```

### 5.4 自定义异常类

```cpp
#include <iostream>
#include <string>
using namespace std;

class FileError : public exception {
private:
    string message;
public:
    FileError(const string& filename, int code)
        : message("文件错误: " + filename + " (错误码: " + to_string(code) + ")") {}

    const char* what() const noexcept override {
        return message.c_str();
    }
};

void read_config(const string& filename) {
    // 模拟文件读取失败
    throw FileError(filename, 404);
}

int main() {
    try {
        read_config("config.json");
    }
    catch (const FileError& e) {
        cerr << e.what() << endl;  // 文件错误: config.json (错误码: 404)
    }
    return 0;
}
```

### 5.5 Windows 结构化异常（try-except）

Windows 平台提供了 SEH（Structured Exception Handling）：

```c
#include <windows.h>
#include <stdio.h>

int main() {
    int* ptr = NULL;

    __try {
        // 可能引发异常的代码
        *ptr = 42;  // 空指针写入，会触发异常
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        // 异常处理
        DWORD code = GetExceptionCode();
        printf("捕获异常，代码: 0x%08X\n", code);
        // 输出: 捕获异常，代码: 0xC0000005 (ACCESS_VIOLATION)
    }

    printf("程序继续执行\n");
    return 0;
}
```

### 5.6 错误处理策略对比

| 策略       | 语言      | 优点             | 缺点         |
| ---------- | --------- | ---------------- | ------------ |
| 返回值检查 | C         | 简单，无额外开销 | 容易遗漏检查 |
| errno      | C         | 标准化           | 需要及时检查 |
| try-catch  | C++/Java  | 结构化，自动传播 | 有性能开销   |
| try-except | Windows C | 可捕获硬件异常   | 平台相关     |

## 6. 调试基础

调试是找出并修复程序错误的过程，是开发者最重要的技能之一。

### 6.1 常见错误类型

| 错误类型   | 定义                   | 示例                   | 发现时机 |
| ---------- | ---------------------- | ---------------------- | -------- |
| 语法错误   | 违反语言语法规则       | 缺少分号、括号不匹配   | 编译时   |
| 逻辑错误   | 程序可运行但结果不正确 | 条件写反、循环次数错误 | 运行时   |
| 运行时错误 | 程序运行时异常终止     | 除零、空指针、越界访问 | 运行时   |

### 6.2 打印日志调试

最基本也最常用的调试方法——在关键位置插入打印语句：

```c
#include <stdio.h>

int binary_search(int arr[], int len, int target) {
    int left = 0, right = len - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        printf("[DEBUG] left=%d, right=%d, mid=%d, arr[mid]=%d\n",
               left, right, mid, arr[mid]);

        if (arr[mid] == target) {
            printf("[DEBUG] 找到目标，索引=%d\n", mid);
            return mid;
        } else if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    printf("[DEBUG] 未找到目标\n");
    return -1;
}
```

更规范的日志输出：

```c
// 使用宏控制调试输出
#ifdef DEBUG
  #define LOG(fmt, ...) printf("[LOG %s:%d] " fmt "\n", __FILE__, __LINE__, ##__VA_ARGS__)
#else
  #define LOG(fmt, ...)  // 发布版本不输出
#endif

// 使用
LOG("变量值: x=%d, y=%d", x, y);
// 输出: [LOG main.c:42] 变量值: x=10, y=20
```

### 6.3 断点调试

断点调试允许程序在指定位置暂停，检查当前状态。

**GDB 基本命令（Linux/macOS）：**

```bash
# 编译时加入调试信息
gcc -g program.c -o program

# 启动GDB
gdb ./program
```

| GDB 命令       | 缩写   | 功能                   |
| -------------- | ------ | ---------------------- |
| break main     | b main | 在main函数设置断点     |
| break 42       | b 42   | 在第42行设置断点       |
| run            | r      | 运行程序               |
| next           | n      | 单步执行（不进入函数） |
| step           | s      | 单步执行（进入函数）   |
| continue       | c      | 继续运行到下一个断点   |
| print variable | p var  | 打印变量值             |
| list           | l      | 显示源代码             |
| quit           | q      | 退出GDB                |

**VS Code 调试（Windows推荐）：**

1. 在代码行号左侧点击设置断点（红点）
2. 按 `F5` 启动调试
3. 使用调试工具栏：

| 快捷键    | 功能             |
| --------- | ---------------- |
| F5        | 继续运行         |
| F10       | 单步跳过（next） |
| F11       | 单步进入（step） |
| Shift+F11 | 跳出函数         |
| Shift+F5  | 停止调试         |

### 6.4 监视变量

调试时可以监视变量的值变化：

```c
// 示例：调试排序算法
void bubble_sort(int arr[], int len) {
    for (int i = 0; i < len - 1; i++) {
        for (int j = 0; j < len - 1 - i; j++) {
            // 在此处设置断点，监视以下变量：
            // - i, j 的值
            // - arr[j], arr[j+1] 的值
            // - 是否发生交换
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}
```

**VS Code 监视窗口使用：**

1. 在调试面板找到"监视"区域
2. 点击 `+` 添加表达式，如 `arr[j]`、`i * len + j`
3. 每次暂停时自动显示当前值

### 6.5 常用调试技巧

**① 二分法定位Bug**

```c
// 如果程序在某个位置出错，用二分法逐步缩小范围
// 在中间位置设置断点或打印
printf("CHECKPOINT 1: ok\n");  // 前半段
// ... 大段代码 ...
printf("CHECKPOINT 2: ok\n");  // 后半段
// 如果CHECKPOINT 1正常但2没输出，Bug在中间
```

**② 断言（Assert）**

```c
#include <assert.h>

int factorial(int n) {
    assert(n >= 0);  // 如果n<0，程序终止并报错
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

**③ 内存检查**

```bash
# 使用Valgrind检查内存泄漏（Linux/macOS）
valgrind --leak-check=full ./program

# 使用AddressSanitizer（编译器内置）
gcc -fsanitize=address -g program.c -o program
./program
```

### 6.6 调试流程总结

```
1. 复现问题
   │
2. 定位问题（打印/断点/二分法）
   │
3. 分析原因（监视变量/检查逻辑）
   │
4. 修复代码
   │
5. 验证修复（确认原问题解决，无新问题）
```

## 7. 小结

| 主题     | 核心要点                                        |
| -------- | ----------------------------------------------- |
| 函数定义 | 返回类型+函数名+参数列表+函数体，声明与定义分离 |
| 参数传递 | 值传递（副本）vs 指针/引用传递（可修改原值）    |
| 模块化   | 头文件声明、源文件实现、#pragma once 防重复包含 |
| 文件操作 | fopen→读写→fclose，注意模式与错误检查           |
| 异常处理 | C用返回值/errno，C++用try-catch，Windows用SEH   |
| 调试基础 | 打印日志、断点、单步执行、监视变量，二分法定位  |

函数与模块化是编写可维护代码的基础。将复杂问题拆分为小函数，将相关功能组织为模块，配合规范的错误处理和调试手段，才能构建出健壮的程序。
