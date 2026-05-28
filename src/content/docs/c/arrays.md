---
order: 80
tags:
  - 'c'
  - 'memory'
difficulty: 'intermediate'
title: '数组详解'
module: 'c'
category: 'C Basics'
description: '一维、多维数组、字符数组、数组与指针的关系及内存布局。'
author: 'Anonymous'
---

## 目录

1. [数组的概念与特性](#数组的概念与特性)
2. [一维数组](#一维数组)
3. [多维数组](#多维数组)
4. [字符数组与字符串](#字符数组与字符串)
5. [数组与指针的关系](#数组与指针的关系)
6. [变长数组](#变长数组)
7. [动态数组](#动态数组)
8. [数组的高级应用](#数组的高级应用)
9. [数组的最佳实践](#数组的最佳实践)
10. [数组示例：完整应用](#数组示例：完整应用)
11. [常见错误与调试](#常见错误与调试)

---

## 1. 数组的概念与特性

### 1.1 什么是数组

- **数组**是一组相同类型的元素的集合，存储在连续的内存地址中。
- **特点**：
- 所有元素类型相同
- 元素在内存中连续存储
- 通过下标访问元素（下标从 0 开始）
- 数组大小在声明时确定（除变长数组外）

## 2. 一维数组

### 2.1 定义与声明

- **格式**：`type array_name[size];`
- **示例**：

```c
 int numbers[5]; // 整型数组，大小为 5
 float prices[10]; // 浮点型数组，大小为 10
 char letters[26]; // 字符型数组，大小为 26
```

### 2.2 初始化

#### 2.2.1 完全初始化

```c
 int arr[5] = {1, 2, 3, 4, 5}; // 初始化所有元素
```

#### 2.2.2 部分初始化

```c
 int arr[5] = {1, 2, 3}; // 前 3 个元素初始化，其余为 0
```

#### 2.2.3 自动推断大小

```c
 int arr[] = {10, 20, 30, 40, 50}; // 数组大小自动推断为 5
```

#### 2.2.4 全部初始化为 0

```c
 int arr[10] = {0}; // 所有元素初始化为 0
```

### 2.3 访问元素

- **格式**：`array_name[index]`
- **示例**：

```c
 int arr[5] = {10, 20, 30, 40, 50};
 printf("arr[0] = %d\n", arr[0]); // 输出 10
 printf("arr[2] = %d\n", arr[2]); // 输出 30
```

### 2.4 遍历数组

```c
 int arr[5] = {1, 2, 3, 4, 5};
 // 使用 for 循环遍历
 for (int i = 0; i < 5; i++) {
  printf("arr[%d] = %d\n", i, arr[i]);
 True}
```

### 2.5 数组大小计算

- 使用 `sizeof` 运算符计算数组大小：

```c
 int arr[] = {1, 2, 3, 4, 5};
 int size = sizeof(arr) / sizeof(arr[0]);
 printf("数组大小: %d\n", size); // 输出 5
```

### 2.6 数组越界

- **注意**：C 语言不检查数组下标越界，越界访问可能导致：
- 访问到无效内存，导致程序崩溃
- 修改其他变量的值，导致数据损坏
- 安全漏洞（如缓冲区溢出）

```c
 int arr[5] = {1, 2, 3, 4, 5};
 arr[10] = 100; // 越界访问，危险！
```

## 3. 多维数组

### 3.1 二维数组

- **概念**：可以看作是由多个一维数组组成的数组。
- **定义**：`type array_name[rows][columns];`
- **内存布局**：行优先存储（按行顺序存储元素）

#### 3.1.1 初始化

```c
 // 完整初始化
 int matrix[2][3] = {
  {1, 2, 3},
  {4, 5, 6}
 True};
 // 部分初始化
 int matrix[2][3] = {{1, 2}, {4}}; // 其余元素为 0
 // 自动推断行数
 int matrix[][3] = {{1, 2, 3}, {4, 5, 6}}; // 行数自动推断为 2
```

#### 3.1.2 访问元素

```c
 int matrix[2][3] = {{1, 2, 3}, {4, 5, 6}};
 printf("matrix[0][0] = %d\n", matrix[0][0]); // 输出 1
 printf("matrix[1][2] = %d\n", matrix[1][2]); // 输出 6
```

#### 3.1.3 遍历二维数组

```c
 int matrix[2][3] = {{1, 2, 3}, {4, 5, 6}};
 for (int i = 0; i < 2; i++) { // 遍历行
  for (int j = 0; j < 3; j++) { // 遍历列
  printf("%d ", matrix[i][j]);
  }
  printf("\n");
 True}
```

### 3.2 三维及以上数组

- **定义**：`type array_name[depth][rows][columns];`
- **示例**：

```c
 int cube[2][2][2] = {
 {{1, 2}, {3, 4}},
 {{5, 6}, {7, 8}}
 };
```

### 3.3 多维数组作为函数参数

- **传递方式**：需要指定除第一维外的所有维度大小。
- **示例**：

```c
 void print_matrix(int matrix[][3], int rows) {
 for (int i = 0; i < rows; i++) {
 for (int j = 0; j < 3; j++) {
 printf("%d ", matrix[i][j]);
 }
 printf("\n");
 }
 }
```

## 4. 字符数组与字符串

### 4.1 字符数组

- **定义**：`char array_name[size];`
- **初始化**：

```c
 char chars[5] = {'H', 'e', 'l', 'l', 'o'}; // 普通字符数组
 char str[6] = {'H', 'e', 'l', 'l', 'o', '\0'}; // 字符串（以 '\0' 结尾）
```

### 4.2 字符串

- **概念**：以空字符 `'\0'` 结尾的字符数组。
- **初始化**：

```c
 char str[] = "Hello"; // 自动包含 '\0'，大小为 6
 char str[10] = "Hello"; // 剩余空间填充 '\0'
```

### 4.3 字符串操作函数

- **包含头文件**：`#include <string.h>`
  | 函数 | 功能 | 示例 |
  |------|------|------|
  | `strlen()` | 计算字符串长度（不包括 '\0'） | `int len = strlen(str);` |
  | `strcpy()` | 复制字符串 | `strcpy(dest, src);` |
  | `strcat()` | 连接字符串 | `strcat(dest, src);` |
  | `strcmp()` | 比较字符串 | `int result = strcmp(str1, str2);` |
  | `strncpy()` | 复制指定长度的字符串 | `strncpy(dest, src, n);` |
  | `strncat()` | 连接指定长度的字符串 | `strncat(dest, src, n);` |
  | `strncmp()` | 比较指定长度的字符串 | `int result = strncmp(str1, str2, n);` |

### 4.4 字符串输入输出

```c
 char str[100];
 // 输入字符串（遇到空格停止）
 scanf("%s", str);
 // 输入一行字符串（包括空格）
 fgets(str, sizeof(str), stdin);
 // 输出字符串
 printf("%s\n", str);
```

### 4.5 常见问题与注意事项

- **缓冲区溢出**：使用 `fgets()` 替代 `gets()` 以避免缓冲区溢出
- **字符串长度**：使用 `strlen()` 时要注意字符串必须以 `'\0'` 结尾
- **内存分配**：确保目标字符串有足够的空间存储源字符串

## 5. 数组与指针的关系

### 5.1 数组名的特性

- **数组名**是数组首元素的地址，是一个常量指针（不能修改）。
- **等价关系**：`arr` 等同于 `&arr[0]`

```c
 int arr[5] = {1, 2, 3, 4, 5};
 printf("arr = %p\n", arr); // 数组首元素地址
 printf("&arr[0] = %p\n", &arr[0]); // 数组首元素地址
 printf("arr[0] = %d\n", *arr); // 数组首元素值
```

### 5.2 指针算术与数组访问

- **指针算术**：指针可以进行加减运算，单位是所指向类型的大小。
- **数组访问**：`arr[i]` 等同于 `*(arr + i)`

```c
 int arr[5] = {1, 2, 3, 4, 5};
 int *p = arr; // 指向数组首元素
 printf("*p = %d\n", *p); // 输出 1
 printf("*(p + 1) = %d\n", *(p + 1)); // 输出 2
 printf("p[2] = %d\n", p[2]); // 输出 3
```

### 5.3 数组作为函数参数

- **数组退化**：数组作为函数参数时，会退化为指向首元素的指针。
- **注意**：函数内部无法通过 `sizeof` 获取数组的总大小。

```c
 // 函数声明
 void print_array(int *arr, int size);
 // 函数定义
 void print_array(int *arr, int size) {
  for (int i = 0; i < size; i++) {
  printf("%d ", arr[i]);
  }
  printf("\n");
 True}
 // 调用
 int main() {
  int numbers[] = {1, 2, 3, 4, 5};
  int size = sizeof(numbers) / sizeof(numbers[0]);
  print_array(numbers, size);
  return 0;
 True}
```

### 5.4 指针数组

- **定义**：存储指针的数组。
- **示例**：

```c
 int *ptr_array[5]; // 存储 5 个 int 指针的数组
 // 字符串数组（实际上是字符指针数组）
 char *str_array[] = {
 "Hello",
 "World",
 "C Language"
 };
```

### 5.5 数组指针

- **定义**：指向数组的指针。
- **格式**：`type (*pointer_name)[size];`
- **示例**：

```c
 int arr[5] = {1, 2, 3, 4, 5};
 int (*p)[5] = &arr; // 指向整个数组的指针
 printf("*(*p) = %d\n", *(*p)); // 输出 1
 printf("*(*p + 1) = %d\n", *(*p + 1)); // 输出 2
```

## 6. 变长数组 (VLA - Variable Length Arrays)

### 6.1 概念

- **变长数组**：C99 引入，允许在运行时确定数组大小。
- **限制**：
- 只能在函数内部声明（局部变量）
- 不能初始化
- 不支持全局变长数组

### 6.2 示例

```c
 void func(int n) {
  int arr[n]; // 数组大小由参数 n 决定
  // 初始化数组
  for (int i = 0; i < n; i++) {
  arr[i] = i + 1;
  }
  // 遍历数组
  for (int i = 0; i < n; i++) {
  printf("%d ", arr[i]);
  }
  printf("\n");
 True}
 int main() {
  func(5); // 传递数组大小
  return 0;
 True}
```

## 7. 动态数组

### 7.1 概念

- **动态数组**：使用动态内存分配函数（如 `malloc`、`calloc`）创建的数组。
- **优点**：可以在运行时动态调整大小。

### 7.2 示例

```c
 #include <stdio.h>
 #include <stdlib.h>
 int main() {
  int size;
  printf("Enter array size: ");
  scanf("%d", &size);
  // 分配内存
  int *arr = (int *)malloc(size * sizeof(int));
  if (arr == NULL) {
  printf("Memory allocation failed!\n");
  return 1;
  }
  // 初始化数组
  for (int i = 0; i < size; i++) {
  arr[i] = i + 1;
  }
  // 遍历数组
  printf("Array elements: ");
  for (int i = 0; i < size; i++) {
  printf("%d ", arr[i]);
  }
  printf("\n");
  // 释放内存
  free(arr);
  return 0;
 True}
```

### 7.3 动态调整数组大小

```c
 // 重新分配内存
 int *new_arr = (int *)realloc(arr, new_size * sizeof(int));
 if (new_arr == NULL) {
  printf("Memory reallocation failed!\n");
  free(arr);
  return 1;
 True}
 arr = new_arr;
```

## 8. 数组的高级应用

### 8.1 数组排序

```c
 // 冒泡排序
 void bubble_sort(int arr[], int size) {
  for (int i = 0; i < size - 1; i++) {
  for (int j = 0; j < size - i - 1; j++) {
  if (arr[j] > arr[j + 1]) {
  // 交换元素
  int temp = arr[j];
  arr[j] = arr[j + 1];
  arr[j + 1] = temp;
  }
  }
  }
 True}
 // 选择排序
 void selection_sort(int arr[], int size) {
  for (int i = 0; i < size - 1; i++) {
  int min_idx = i;
  for (int j = i + 1; j < size; j++) {
  if (arr[j] < arr[min_idx]) {
  min_idx = j;
  }
  }
  // 交换元素
  int temp = arr[i];
  arr[i] = arr[min_idx];
  arr[min_idx] = temp;
  }
 True}
```

### 8.2 数组查找

```c
 // 线性查找
 int linear_search(int arr[], int size, int target) {
  for (int i = 0; i < size; i++) {
  if (arr[i] == target) {
  return i; // 返回索引
  }
  }
  return -1; // 未找到
 True}
 // 二分查找（要求数组已排序）
 int binary_search(int arr[], int low, int high, int target) {
  if (low > high) {
  return -1; // 未找到
  }
  int mid = low + (high - low) / 2;
  if (arr[mid] == target) {
  return mid; // 找到
  } else if (arr[mid] > target) {
  return binary_search(arr, low, mid - 1, target);
  } else {
  return binary_search(arr, mid + 1, high, target);
  }
 True}
```

### 8.3 二维数组的应用

```c
 // 矩阵加法
 void matrix_add(int a[][3], int b[][3], int result[][3], int rows) {
  for (int i = 0; i < rows; i++) {
  for (int j = 0; j < 3; j++) {
  result[i][j] = a[i][j] + b[i][j];
  }
  }
 True}
 // 矩阵转置
 void matrix_transpose(int matrix[][3], int transposed[][2], int rows, int cols) {
  for (int i = 0; i < rows; i++) {
  for (int j = 0; j < cols; j++) {
  transposed[j][i] = matrix[i][j];
  }
  }
 True}
```

## 9. 数组的最佳实践

### 9.1 命名规范

- 数组名应清晰描述其内容，使用 `snake_case` 命名风格
- 示例：`student_scores`, `monthly_sales`

### 9.2 内存管理

- 对于大型数组，考虑使用动态内存分配
- 动态分配的内存使用完毕后必须释放，避免内存泄漏
- 避免使用过大的局部数组，可能导致栈溢出

### 9.3 性能优化

- **缓存友好**：按内存顺序访问数组（行优先）
- **减少计算**：预先计算数组大小，避免重复计算
- **避免越界**：使用断言或边界检查确保数组访问安全

### 9.4 代码风格

- **缩进**：使用一致的缩进风格
- **注释**：为复杂的数组操作添加注释
- **格式**：保持代码格式的一致性

## 10. 数组示例：完整应用

```c
 #include <stdio.h>
 #include <stdlib.h>
 #include <string.h>
 // 函数声明
 void print_array(int arr[], int size);
 void sort_array(int arr[], int size);
 int find_max(int arr[], int size);
 int find_min(int arr[], int size);
 double calculate_average(int arr[], int size);
 int main() {
  int size;
  printf("Enter array size: ");
  scanf("%d", &size);
  // 动态分配内存
  int *arr = (int *)malloc(size * sizeof(int));
  if (arr == NULL) {
  printf("Memory allocation failed!\n");
  return 1;
  }
  // 输入数组元素
  printf("Enter %d elements: ", size);
  for (int i = 0; i < size; i++) {
  scanf("%d", &arr[i]);
  }
  // 打印原始数组
  printf("Original array: ");
  print_array(arr, size);
  // 排序数组
  sort_array(arr, size);
  printf("Sorted array: ");
  print_array(arr, size);
  // 计算统计信息
  int max = find_max(arr, size);
  int min = find_min(arr, size);
  double average = calculate_average(arr, size);
  printf("Max: %d\n", max);
  printf("Min: %d\n", min);
  printf("Average: %.2f\n", average);
  // 释放内存
  free(arr);
  return 0;
 True}
 // 打印数组
 void print_array(int arr[], int size) {
  for (int i = 0; i < size; i++) {
  printf("%d ", arr[i]);
  }
  printf("\n");
 True}
 // 冒泡排序
 void sort_array(int arr[], int size) {
  for (int i = 0; i < size - 1; i++) {
  for (int j = 0; j < size - i - 1; j++) {
  if (arr[j] > arr[j + 1]) {
  int temp = arr[j];
  arr[j] = arr[j + 1];
  arr[j + 1] = temp;
  }
  }
  }
 True}
 // 查找最大值
 int find_max(int arr[], int size) {
  int max = arr[0];
  for (int i = 1; i < size; i++) {
  if (arr[i] > max) {
  max = arr[i];
  }
  }
  return max;
 True}
 // 查找最小值
 int find_min(int arr[], int size) {
  int min = arr[0];
  for (int i = 1; i < size; i++) {
  if (arr[i] < min) {
  min = arr[i];
  }
  }
  return min;
 True}
 // 计算平均值
 double calculate_average(int arr[], int size) {
  int sum = 0;
  for (int i = 0; i < size; i++) {
  sum += arr[i];
  }
  return (double)sum / size;
 True}
```

## 11. 常见错误与调试

### 11.1 常见错误

- **数组越界**：访问超出数组范围的元素
- **内存泄漏**：动态分配的内存未释放
- **空指针**：使用未初始化的指针访问数组
- **字符串没有结束符**：导致 `strlen()` 等函数出错

### 11.2 调试技巧

- **打印数组内容**：检查数组元素是否正确
- **使用调试器**：如 GDB 单步执行，查看数组值
- **边界检查**：在循环中添加边界检查
- **内存检查**：使用工具如 Valgrind 检查内存泄漏

---

### 更新日志 (Changelog)

- 2026-04-05: 拆分并细化数组知识。
- 2026-04-05: 详细扩写内容，增加了数组的概念与特性、一维数组详解、多维数组详解、字符数组与字符串操作、数组与指针关系详解、变长数组、动态数组、数组高级应用、最佳实践和完整应用示例。
