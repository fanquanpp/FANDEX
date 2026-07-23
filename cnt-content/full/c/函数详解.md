---
order: 70
tags:
  - c
difficulty: intermediate
title: 函数详解
module: c
category: 'C Basics'
description: 函数定义、参数传递、作用域、递归及函数指针。
author: Anonymous
related:
  - c/共享内存与信号量
  - c/文件系统操作
  - c/国际化与本地化
  - c/构建系统
prerequisites:
  - c/概述
---

## 1. 函数的概念与重要性

### 1.1 函数的定义

- **函数**是一段完成特定任务的代码块，具有名称、参数和返回值。
- **作用**：
- 代码复用：避免重复代码
- 模块化：将复杂问题分解为小问题
- 可读性：提高代码的可读性和可维护性
- 可测试性：便于单元测试

## 2. 函数的声明与定义

### 2.1 函数声明 (Function Prototype)

- **目的**：告诉编译器函数的名称、返回类型和参数列表。
- **位置**：通常放在头文件中或源文件的开头。
- **格式**：`return_type function_name(parameter_list);`

```c
 // 函数声明
 int add(int, int); // 省略参数名
 int subtract(int a, int b); // 包含参数名
 void print_message(void); // 无参数
```

### 2.2 函数定义 (Function Definition)

- **目的**：实现函数的具体逻辑。
- **格式**：

```c
 return_type function_name(parameter_list) {
 // 函数体
 return expression; // 对于非 void 返回类型
 }
```

```c
 // 函数定义
 int add(int a, int b) {
  return a + b;
 }
 void print_message(void) {
  printf("Hello, Function!\n");
  // 无 return 语句
 }
```

### 2.3 函数声明与定义的关系

- **声明**是函数的"签名"，告诉编译器函数的接口。
- **定义**是函数的"实现"，包含具体的代码。
- 函数必须先声明后使用，或在使用前定义。

## 3. 参数传递

### 3.1 传值调用 (Pass by Value)

- **原理**：复制实参的值到形参，形参是实参的副本。
- **特点**：修改形参不会影响实参。
- **适用场景**：参数为基本数据类型（如 int、float 等）。

```c
 void increment(int x) {
  x++; // 只修改形参
  printf("Inside function: %d\n", x); // 输出 11
 }
 int main() {
  int a = 10;
  increment(a);
  printf("Outside function: %d\n", a); // 输出 10，实参未被修改
  return 0;
 }
```

### 3.2 传址调用 (Pass by Address)

- **原理**：传递实参的地址，形参是指向实参的指针。
- **特点**：通过指针可以修改实参的值。
- **适用场景**：需要修改实参、传递大型数据结构（避免复制开销）。

```c
 void increment_by_address(int *x) {
  (*x)++; // 通过指针修改实参
  printf("Inside function: %d\n", *x); // 输出 11
 }
 int main() {
  int a = 10;
  increment_by_address(&a);
  printf("Outside function: %d\n", a); // 输出 11，实参被修改
  return 0;
 }
```

### 3.3 数组作为参数

- **特点**：数组作为参数时，实际上传递的是数组的首地址（指针）。
- **注意**：函数内部无法通过 `sizeof` 获取数组的总大小。

```c
 void print_array(int arr[], int size) {
  for (int i = 0; i < size; i++) {
  printf("%d ", arr[i]);
  }
  printf("\n");
 }
 int main() {
  int numbers[] = {1, 2, 3, 4, 5};
  int size = sizeof(numbers) / sizeof(numbers[0]);
  print_array(numbers, size); // 传递数组首地址和大小
  return 0;
 }
```

## 4. 函数的返回值

### 4.1 返回基本类型

- **格式**：`return expression;`
- **注意**：返回值的类型必须与函数声明的返回类型一致。

```c
 int max(int a, int b) {
  if (a > b) {
  return a;
  } else {
  return b;
  }
 }
```

### 4.2 返回指针

- **注意**：不要返回局部变量的指针，因为局部变量在函数返回后会被销毁。

```c
 // 错误：返回局部变量的指针
 int *create_array() {
  int arr[5]; // 局部变量
  return arr; // 危险：返回局部变量的地址
 }
 // 正确：返回动态分配的内存
 int *create_dynamic_array(int size) {
  int *arr = (int *)malloc(size * sizeof(int));
  return arr; // 安全：返回动态分配的内存
 }
```

### 4.3 无返回值 (void)

- **格式**：`void function_name(...)`
- **特点**：函数可以没有 return 语句，或使用 `return;` 提前返回。

```c
 void print_hello() {
  printf("Hello!\n");
  // 无 return 语句
 }
 void check_number(int n) {
  if (n < 0) {
  printf("Negative number!\n");
  return; // 提前返回
  }
  printf("Non-negative number: %d\n", n);
 }
```

## 5. 递归

### 5.1 递归的概念

- **递归**：函数直接或间接地调用自身。
- **必要条件**：
- **基准情况 (Base Case)**：停止递归的条件。
- **递归步 (Recursive Step)**：将问题分解为更小的子问题，趋向基准情况。

### 5.2 递归示例

#### 5.2.1 阶乘计算

```c
 long factorial(int n) {
  if (n <= 1) return 1; // 基准情况
  return n * factorial(n - 1); // 递归调用
 }
```

#### 5.2.2 斐波那契数列

```c
 int fibonacci(int n) {
  if (n <= 1) return n; // 基准情况
  return fibonacci(n - 1) + fibonacci(n - 2); // 递归调用
 }
```

#### 5.2.3 二分查找

```c
 int binary_search(int arr[], int low, int high, int target) {
  if (low > high) return -1; // 基准情况：未找到
  int mid = low + (high - low) / 2;
  if (arr[mid] == target) return mid; // 基准情况：找到
  else if (arr[mid] > target) return binary_search(arr, low, mid - 1, target);
  else return binary_search(arr, mid + 1, high, target);
 }
```

### 5.3 递归的优缺点

- **优点**：代码简洁，逻辑清晰。
- **缺点**：可能导致栈溢出（递归深度过大），效率可能低于迭代。
- **优化**：尾递归优化（某些编译器支持）、记忆化（避免重复计算）。

## 6. 作用域与存储类

### 6.1 变量的作用域

- **局部变量**：在函数内部定义，只在函数内部有效。
- **全局变量**：在函数外部定义，在整个程序中有效。

```c
 int global_var = 100; // 全局变量
 void function() {
  int local_var = 50; // 局部变量
  printf("Global: %d, Local: %d\n", global_var, local_var);
 }
 int main() {
  function();
  printf("Global: %d\n", global_var);
  // printf("Local: %d\n", local_var); // 错误：local_var 未定义
  return 0;
 }
```

### 6.2 存储类说明符

#### 6.2.1 `auto`

- **默认存储类**：局部变量的默认存储类。
- **特点**：自动存储期，函数结束时销毁。

#### 6.2.2 `static`

- **静态局部变量**：
- 存储期：程序整个运行期间
- 作用域：函数内部
- 初始化：仅在首次调用时初始化

```c
 void counter() {
  static int count = 0; // 静态局部变量
  count++;
  printf("Count: %d\n", count);
 }
 int main() {
  counter(); // 输出 1
  counter(); // 输出 2
  counter(); // 输出 3
  return 0;
 }
```

- **静态全局变量**：
- 存储期：程序整个运行期间
- 作用域：仅限于定义它的文件
- 优点：避免命名冲突，提高代码安全性

#### 6.2.3 `extern`

- **外部变量**：声明在其他文件中定义的全局变量。
- **作用**：实现跨文件访问全局变量。

```c
 // file1.c
 extern int global_var; // 声明外部变量
 void function() {
  printf("Global var: %d\n", global_var);
 }
 // file2.c
 int global_var = 100; // 定义全局变量
```

#### 6.2.4 `register`

- **寄存器变量**：建议编译器将变量存储在寄存器中以提高访问速度。
- **注意**：现代编译器通常会自动优化，这个关键字的作用已经不大。

## 7. 函数指针

### 7.1 函数指针的定义

- **格式**：`return_type (*pointer_name)(parameter_list);`

```c
 // 定义函数指针
 int (*add_ptr)(int, int);
 // 赋值
 add_ptr = add;
 // 或直接初始化
 int (*add_ptr)(int, int) = add;
```

### 7.2 通过函数指针调用函数

```c
 int result = add_ptr(10, 20);
 // 或
 int result = (*add_ptr)(10, 20); // 更明确的写法
```

### 7.3 函数指针的应用

#### 7.3.1 回调函数

```c
 // 回调函数类型
 typedef void (*Callback)(int);
 // 执行回调的函数
 void process_array(int arr[], int size, Callback callback) {
  for (int i = 0; i < size; i++) {
  callback(arr[i]);
  }
 }
 // 具体的回调函数
 void print_number(int num) {
  printf("%d ", num);
 }
 void square_number(int num) {
  printf("%d ", num * num);
 }
 int main() {
  int numbers[] = {1, 2, 3, 4, 5};
  int size = sizeof(numbers) / sizeof(numbers[0]);
  printf("Original numbers: ");
  process_array(numbers, size, print_number);
  printf("\n");
  printf("Squared numbers: ");
  process_array(numbers, size, square_number);
  printf("\n");
  return 0;
 }
```

#### 7.3.2 函数指针数组

```c
 int add(int a, int b) { return a + b; }
 int subtract(int a, int b) { return a - b; }
 int multiply(int a, int b) { return a * b; }
 int divide(int a, int b) { return b != 0 ? a / b : 0; }
 int main() {
  // 函数指针数组
  int (*operations[])(int, int) = {add, subtract, multiply, divide};
  int a = 10, b = 5;
  for (int i = 0; i < 4; i++) {
  printf("Result: %d\n", operations[i](a, b));
  }
  return 0;
 }
```

## 8. 可变参数函数

### 8.1 基本概念

- **可变参数函数**：参数个数可变的函数，如 `printf`、`scanf`。
- **实现**：使用 `<stdarg.h>` 头文件中的宏。

### 8.2 实现步骤

1. 包含头文件 `<stdarg.h>`
2. 定义函数，最后一个参数为 `...`
3. 使用 `va_list` 类型声明参数列表
4. 使用 `va_start` 初始化参数列表
5. 使用 `va_arg` 获取各个参数
6. 使用 `va_end` 结束参数处理

### 8.3 示例

```c
 #include <stdarg.h>
 #include <stdio.h>
 // 计算多个整数的和
 double sum(int count, ...) {
  va_list valist;
  double sum = 0.0;
  // 初始化参数列表
  va_start(valist, count);
  // 遍历参数
  for (int i = 0; i < count; i++) {
  sum += va_arg(valist, int);
  }
  // 结束参数处理
  va_end(valist);
  return sum;
 }
 // 格式化输出
 typedef enum {
  INT, // 整数
  DOUBLE, // 双精度浮点数
  STRING // 字符串
 }
 void print_values(int count, ...) {
  va_list valist;
  va_start(valist, count);
  for (int i = 0; i < count; i++) {
  Type type = va_arg(valist, Type);
  switch (type) {
  case INT:
  printf("%d ", va_arg(valist, int));
  break;
  case DOUBLE:
  printf("%f ", va_arg(valist, double));
  break;
  case STRING:
  printf("%s ", va_arg(valist, char*));
  break;
  default:
  printf("Unknown type ");
  break;
  }
  }
  va_end(valist);
  printf("\n");
 }
 int main() {
  printf("Sum: %.2f\n", sum(5, 1, 2, 3, 4, 5));
  print_values(4,
  INT, 10,
  DOUBLE, 3.14,
  STRING, "Hello",
  INT, 20);
  return 0;
 }
```

### 8.4 注意事项

- 必须有至少一个固定参数
- 必须知道参数的类型和个数（通常通过固定参数或格式字符串指定）
- `va_arg` 必须使用正确的类型，否则会导致未定义行为

## 9. 内联函数

### 9.1 概念

- **内联函数**：建议编译器将函数体直接嵌入调用处，减少函数调用的开销。
- **关键字**：`inline`

### 9.2 适用场景

- 函数体短小（通常少于 10 行）
- 被频繁调用
- 不包含复杂的控制结构（如循环、switch）

### 9.3 示例

```c
 inline int max(int a, int b) {
  return a > b ? a : b;
 }
 int main() {
  int x = 10, y = 20;
  int result = max(x, y); // 可能被内联为：int result = x > y ? x : y;
  printf("Max: %d\n", result);
  return 0;
 }
```

### 9.4 注意事项

- `inline` 只是建议，编译器可能会忽略
- 内联函数通常放在头文件中
- 过度使用内联可能会增加代码大小

## 10. 函数的最佳实践

### 10.1 命名规范

- 函数名应清晰描述其功能
- 使用 `snake_case` 命名风格
- 避免使用过长或过于简短的名称

### 10.2 函数设计

- **单一职责**：每个函数只做一件事
- **参数个数**：尽量控制在 3-5 个以内
- **返回值**：明确函数的返回值含义
- **错误处理**：考虑错误情况的处理

### 10.3 代码风格

- **缩进**：使用一致的缩进风格（通常 4 个空格）
- **注释**：为复杂函数添加注释，说明功能、参数和返回值
- **格式**：保持代码格式的一致性

### 10.4 性能优化

- **减少参数传递**：对于大型结构，使用指针传递
- **避免递归过深**：考虑使用迭代替代递归
- **合理使用内联**：只对频繁调用的小函数使用内联
- **避免重复计算**：缓存计算结果

## 11. 函数的测试与调试

### 11.1 单元测试

- 为每个函数编写测试用例
- 测试正常情况和边界情况
- 使用断言验证函数行为

### 11.2 调试技巧

- 使用 `printf` 输出中间结果
- 使用调试器（如 GDB）单步执行
- 检查参数和返回值
- 验证指针的有效性

## 12. 函数示例：完整应用

```c
 #include <stdio.h>
 #include <stdlib.h>
 // 函数声明
 int *create_array(int size);
 void initialize_array(int *arr, int size);
 void print_array(int *arr, int size);
 int find_max(int *arr, int size);
 void free_array(int *arr);
 int main() {
  int size;
  printf("Enter array size: ");
  scanf("%d", &size);
  // 创建数组
  int *arr = create_array(size);
  if (arr == NULL) {
  printf("Memory allocation failed!\n");
  return 1;
  }
  // 初始化数组
  initialize_array(arr, size);
  // 打印数组
  printf("Array elements: ");
  print_array(arr, size);
  // 查找最大值
  int max_val = find_max(arr, size);
  printf("Maximum value: %d\n", max_val);
  // 释放内存
  free_array(arr);
  return 0;
 }
 // 创建动态数组
 int *create_array(int size) {
  return (int *)malloc(size * sizeof(int));
 }
 // 初始化数组为随机值
 void initialize_array(int *arr, int size) {
  for (int i = 0; i < size; i++) {
  arr[i] = rand() % 100; // 0-99 的随机数
  }
 }
 // 打印数组
 void print_array(int *arr, int size) {
  for (int i = 0; i < size; i++) {
  printf("%d ", arr[i]);
  }
  printf("\n");
 }
 // 查找数组最大值
 int find_max(int *arr, int size) {
  int max = arr[0];
  for (int i = 1; i < size; i++) {
  if (arr[i] > max) {
  max = arr[i];
  }
  }
  return max;
 }
 // 释放数组内存
 void free_array(int *arr) {
  free(arr);
 }
```

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化函数知识。
- 2026-04-05: 详细扩写内容，增加了函数的概念与重要性、参数传递详解、返回值详解、递归示例、作用域与存储类详解、函数指针应用、可变参数函数详解、内联函数、最佳实践和完整应用示例。
