---
order: 410
title: 指针深度解析
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 指针概念、指针运算、数组与指针、函数指针及多级指针。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'c/039-PreprocessorMacro'
  - 'c/040-C23C2y'
  - 'c/042-MemoryManagement'
  - 'c/043-MemoryAlignment'
prerequisites:
  - 'c/002-CLanguageOverview'
---

## 前置知识

- [C23 与 C2y 新标准](/c/040-C23C2y)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 指针的概念与重要性」的核心机制、典型用法与常见陷阱
- 掌握「2. 指针的定义与初始化」的核心机制、典型用法与常见陷阱
- 掌握「3. 指针运算」的核心机制、典型用法与常见陷阱
- 掌握「4. 指针与数组」的核心机制、典型用法与常见陷阱
- 掌握「5. 指针数组与数组指针」的核心机制、典型用法与常见陷阱


## 1. 指针的概念与重要性

### 1.1 什么是指针

- **指针**是一种变量，用于存储内存地址。
- **作用**：
- 直接访问内存，提高程序效率
- 实现函数间的数据共享（通过传址调用）
- 动态内存管理
- 实现复杂的数据结构（如链表、树、图等）
- 函数指针用于回调机制

### 1.2 内存地址

- 计算机内存被划分为多个字节，每个字节都有一个唯一的地址。
- 指针存储的就是这些地址值。

## 2. 指针的定义与初始化

### 2.1 指针的定义

- **格式**：`type *pointer_name;`
- **示例**：

```c
 int *p; // 整型指针
 float *fp; // 浮点型指针
 char *cp; // 字符型指针
 void *vp; // 通用指针（可以指向任何类型）
```

### 2.2 指针的初始化

- **使用取地址符 `&`**：

```c
 int a = 10;
 int *p = &a; // p 存储 a 的地址
```

- **使用 NULL**：

```c
 int *p = NULL; // 空指针
```

- **使用其他指针**：

```c
 int *p1 = &a;
 int *p2 = p1; // p2 指向与 p1 相同的地址
```

### 2.3 指针的解引用

- **解引用**：使用 `*` 运算符访问指针指向的内存内容。
- **示例**：

```c
 int a = 10;
 int *p = &a;
 printf("a 的值: %d\n", a); // 输出 10
 printf("p 存储的地址: %p\n", p); // 输出 a 的地址
 printf("*p 的值: %d\n", *p); // 输出 10（解引用）
 *p = 20; // 通过指针修改 a 的值
 printf("修改后 a 的值: %d\n", a); // 输出 20
```

## 3. 指针运算

### 3.1 指针加法

- **格式**：`pointer + n`
- **含义**：指针向前移动 `n` 个元素的位置。
- **步长**：移动的字节数 = `n * sizeof(type)`

```c
 int arr[] = {10, 20, 30, 40, 50};
 int *p = arr; // 指向 arr[0]
 printf("*p = %d\n", *p); // 输出 10
 p = p + 1; // 移动到下一个元素
 printf("*p = %d\n", *p); // 输出 20
 p = p + 2; // 移动 2 个元素
 printf("*p = %d\n", *p); // 输出 40
```

### 3.2 指针减法

- **格式**：`pointer - n`
- **含义**：指针向后移动 `n` 个元素的位置。

```c
 int arr[] = {10, 20, 30, 40, 50};
 int *p = &arr[4]; // 指向 arr[4]
 printf("*p = %d\n", *p); // 输出 50
 p = p - 1; // 移动到前一个元素
 printf("*p = %d\n", *p); // 输出 40
```

### 3.3 指针比较

- 指针可以进行相等 (`==`)、不等 (`!=`)、大于 (`>`)、小于 (`<`) 等比较运算。
- 通常用于比较指针是否指向同一个内存位置，或在数组中比较位置。

```c
 int arr[] = {10, 20, 30};
 int *p1 = &arr[0];
 int *p2 = &arr[2];
 if (p1 < p2) {
  printf("p1 在 p2 的前面\n");
 }
 if (p1 == &arr[0]) {
  printf("p1 指向数组的第一个元素\n");
 }
```

### 3.4 指针差值

- **格式**：`pointer1 - pointer2`
- **含义**：两个指针之间的元素个数。
- **条件**：两个指针必须指向同一个数组。

```c
 int arr[] = {10, 20, 30, 40, 50};
 int *p1 = &arr[0];
 int *p2 = &arr[3];
 int diff = p2 - p1;
 printf("p2 和 p1 之间的元素个数: %d\n", diff); // 输出 3
```

## 4. 指针与数组

### 4.1 数组名与指针的关系

- **数组名**是数组首元素的地址，是一个常量指针（不能修改）。
- **等价关系**：`arr` 等同于 `&arr[0]`

```c
 int arr[5] = {1, 2, 3, 4, 5};
 int *p = arr; // 等同于 int *p = &arr[0];
 // 访问数组元素的两种方式
 printf("arr[2] = %d\n", arr[2]); // 使用数组下标
 printf("*(p + 2) = %d\n", *(p + 2)); // 使用指针
```

### 4.2 指针遍历数组

```c
 int arr[] = {1, 2, 3, 4, 5};
 int *p = arr;
 int size = sizeof(arr) / sizeof(arr[0]);
 for (int i = 0; i < size; i++) {
  printf("%d ", *p);
  p++; // 指针移动到下一个元素
 }
 printf("\n");
```

### 4.3 数组作为函数参数

- 数组作为函数参数时，会退化为指向首元素的指针。
- 函数内部无法通过 `sizeof` 获取数组的总大小。

```c
 // 函数声明
 void print_array(int *arr, int size);
 // 函数定义
 void print_array(int *arr, int size) {
  for (int i = 0; i < size; i++) {
  printf("%d ", arr[i]);
  }
  printf("\n");
 }
 // 调用
 int main() {
  int numbers[] = {1, 2, 3, 4, 5};
  int size = sizeof(numbers) / sizeof(numbers[0]);
  print_array(numbers, size);
  return 0;
 }
```

## 5. 指针数组与数组指针

### 5.1 指针数组

- **定义**：`type *array_name[size];`
- **含义**：一个数组，每个元素都是指针。
- **示例**：

```c
 // 整型指针数组
 int *ptr_array[3];
 int a = 10, b = 20, c = 30;
 ptr_array[0] = &a;
 ptr_array[1] = &b;
 ptr_array[2] = &c;
 // 字符串数组（字符指针数组）
 char *str_array[] = {
 "Hello",
 "World",
 "C Language"
 };
```

### 5.2 数组指针

- **定义**：`type (*pointer_name)[size];`
- **含义**：一个指针，指向一个数组。
- **示例**：

```c
 int arr[3] = {1, 2, 3};
 int (*p)[3] = &arr; // 指向整个数组
 printf("*(*p) = %d\n", *(*p)); // 输出 1
 printf("*(*p + 1) = %d\n", *(*p + 1)); // 输出 2
 printf("(*p)[2] = %d\n", (*p)[2]); // 输出 3
```

### 5.3 区别与应用

- **指针数组**：适用于存储多个不同内存位置的地址，如字符串数组。
- **数组指针**：适用于指向二维数组的行，或作为函数参数传递二维数组。

## 6. 多级指针

### 6.1 二级指针

- **定义**：`type **pointer_name;`
- **含义**：指向指针的指针。
- **示例**：

```c
 int a = 10;
 int *p = &a; // 一级指针
 int **pp = &p; // 二级指针
 printf("a = %d\n", a); // 输出 10
 printf("*p = %d\n", *p); // 输出 10
 printf("**pp = %d\n", **pp); // 输出 10
 // 通过二级指针修改 a 的值
 **pp = 20;
 printf("修改后 a = %d\n", a); // 输出 20
```

### 6.2 三级及以上指针

- **定义**：`type ***pointer_name;`
- **使用场景**：较少使用，通常用于复杂的数据结构或函数参数。

### 6.3 应用场景

- **动态二维数组**：

```c
 int rows = 3, cols = 4;
 int **matrix = (int **)malloc(rows * sizeof(int *));
 for (int i = 0; i < rows; i++) {
 matrix[i] = (int *)malloc(cols * sizeof(int));
 }
 // 使用二维数组
 for (int i = 0; i < rows; i++) {
 for (int j = 0; j < cols; j++) {
 matrix[i][j] = i * cols + j;
 }
 }
 // 释放内存
 for (int i = 0; i < rows; i++) {
 free(matrix[i]);
 }
 free(matrix);
```

## 7. 函数指针

### 7.1 函数指针的定义

- **格式**：`return_type (*pointer_name)(parameter_list);`
- **示例**：

```c
 int add(int a, int b) {
 return a + b;
 }
 // 定义函数指针
 int (*func_ptr)(int, int);
 // 赋值
 func_ptr = add;
 // 或直接初始化
 int (*func_ptr)(int, int) = add;
```

### 7.2 通过函数指针调用函数

```c
 int result = func_ptr(10, 20); // 调用 add 函数
 printf("Result: %d\n", result); // 输出 30
 // 也可以使用 (*func_ptr) 的形式
 int result = (*func_ptr)(10, 20);
```

### 7.3 函数指针的应用

#### 7.3.1 回调函数

```c
 // 回调函数类型
 typedef int (*CompareFunc)(int, int);
 // 排序函数
 void sort(int arr[], int size, CompareFunc compare) {
  for (int i = 0; i < size - 1; i++) {
  for (int j = 0; j < size - i - 1; j++) {
  if (compare(arr[j], arr[j + 1]) > 0) {
  // 交换元素
  int temp = arr[j];
  arr[j] = arr[j + 1];
  arr[j + 1] = temp;
  }
  }
  }
 }
 // 比较函数
 int ascending(int a, int b) {
  return a - b;
 }
 int descending(int a, int b) {
  return b - a;
 }
 // 使用
 int main() {
  int arr[] = {5, 2, 8, 1, 9};
  int size = sizeof(arr) / sizeof(arr[0]);
  // 升序排序
  sort(arr, size, ascending);
  // 降序排序
  sort(arr, size, descending);
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
  char *op_names[] = {"+", "-", "*", "/"};
  int a = 10, b = 5;
  for (int i = 0; i < 4; i++) {
  int result = operations[i](a, b);
  printf("%d %s %d = %d\n", a, op_names[i], b, result);
  }
  return 0;
 }
```

## 8. void 指针

### 8.1 概念

- **void 指针**：通用指针，可以指向任何类型的内存地址。
- **特点**：
- 不能直接解引用，需要先转换为具体类型的指针
- 不能进行指针算术运算
- 常用于函数参数和返回值，以实现通用性

### 8.2 示例

```c
 void *generic_ptr;
 int a = 10;
 char c = 'A';
 // 指向整型
 generic_ptr = &a;
 printf("Value: %d\n", *(int *)generic_ptr); // 先转换为 int* 再解引用
 // 指向字符
 generic_ptr = &c;
 printf("Value: %c\n", *(char *)generic_ptr); // 先转换为 char* 再解引用
```

### 8.3 应用场景

- **内存分配函数**：`malloc`, `calloc`, `realloc` 返回 void 指针
- **通用数据处理函数**：如 `memcpy`, `memset` 等
- **回调函数参数**：实现多态

## 9. 指针与动态内存管理

### 9.1 动态内存分配

- **malloc**：分配指定字节数的内存

```c
 int *p = (int *)malloc(5 * sizeof(int));
```

- **calloc**：分配指定数量和大小的内存，并初始化为 0

```c
 int *p = (int *)calloc(5, sizeof(int));
```

- **realloc**：重新分配内存大小

```c
 int *new_p = (int *)realloc(p, 10 * sizeof(int));
```

### 9.2 内存释放

- **free**：释放动态分配的内存

```c
 free(p);
 p = NULL; // 避免野指针
```

### 9.3 示例

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
  // 使用数组
  printf("Array elements: ");
  for (int i = 0; i < size; i++) {
  printf("%d ", arr[i]);
  }
  printf("\n");
  // 释放内存
  free(arr);
  arr = NULL; // 避免野指针
  return 0;
 }
```

## 10. 常见指针错误与陷阱

### 10.1 野指针 (Wild Pointer)

- **定义**：指向随机内存或已释放内存的指针。
- **原因**：
- 未初始化的指针
- 指针指向的内存已被释放
- 指针越界
- **避免方法**：
- 初始化指针为 NULL
- 释放内存后将指针置为 NULL
- 避免指针越界

### 10.2 空指针解引用

- **定义**：对 NULL 指针进行解引用操作。
- **后果**：程序崩溃（段错误）。
- **避免方法**：使用指针前检查是否为 NULL。

### 10.3 内存泄漏

- **定义**：动态分配的内存未被释放，导致内存资源浪费。
- **避免方法**：
- 每一次 `malloc`/`calloc` 都对应一次 `free`
- 使用 RAII 模式（在 C++ 中）
- 使用内存管理工具如 Valgrind 检测

### 10.4 指针越界

- **定义**：指针访问超出其指向内存范围的位置。
- **后果**：
- 访问无效内存，导致程序崩溃
- 修改其他变量的值，导致数据损坏
- 安全漏洞（如缓冲区溢出）
- **避免方法**：
- 确保指针操作在有效范围内
- 使用边界检查
- 避免使用魔法数字

### 10.5 悬垂指针 (Dangling Pointer)

- **定义**：指针指向的内存已被释放，但指针本身未置为 NULL。
- **后果**：再次使用该指针会导致未定义行为。
- **避免方法**：释放内存后将指针置为 NULL。

## 11. 指针的最佳实践

### 11.1 命名规范

- 指针变量名通常以 `p` 或 `ptr` 开头，如 `int *p_value`, `char *ptr_name`
- 函数指针通常以 `func` 或 `callback` 开头，如 `int (*func_add)(int, int)`

### 11.2 代码风格

- **缩进**：使用一致的缩进风格
- **注释**：为复杂的指针操作添加注释
- **格式**：保持代码格式的一致性
- **括号**：使用括号明确指针操作的优先级

### 11.3 安全使用

- **初始化**：总是初始化指针（为 NULL 或有效地址）
- **检查**：使用指针前检查是否为 NULL
- **释放**：动态分配的内存必须释放
- **置空**：释放内存后将指针置为 NULL
- **边界**：避免指针越界

### 11.4 性能优化

- **缓存友好**：按内存顺序访问数据
- **减少解引用**：减少不必要的指针解引用操作
- **避免频繁分配**：减少动态内存分配的次数
- **使用局部变量**：局部变量存储在栈中，访问速度快

## 12. 指针示例：完整应用

```c
 #include <stdio.h>
 #include <stdlib.h>
 // 函数声明
 int *create_array(int size);
 void initialize_array(int *arr, int size);
 void print_array(int *arr, int size);
 int *find_max(int *arr, int size);
 void free_array(int *arr);
 int main() {
  int size;
  printf("Enter array size: ");
  scanf("%d", &size);
  // 创建动态数组
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
  int *max_ptr = find_max(arr, size);
  printf("Maximum value: %d\n", *max_ptr);
  printf("Maximum value at index: %d\n", max_ptr - arr);
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
  arr[i] = rand() % 100;
  }
 }
 // 打印数组
 void print_array(int *arr, int size) {
  for (int i = 0; i < size; i++) {
  printf("%d ", arr[i]);
  }
  printf("\n");
 }
 // 查找最大值并返回其指针
 int *find_max(int *arr, int size) {
  int *max_ptr = arr;
  for (int *p = arr + 1; p < arr + size; p++) {
  if (*p > *max_ptr) {
  max_ptr = p;
  }
  }
  return max_ptr;
 }
 // 释放数组内存
 void free_array(int *arr) {
  free(arr);
 }
```

## 13. 指针与其他语言的对比

### 13.1 C++ 中的指针

- C++ 保留了 C 语言的指针特性
- 额外提供了引用 (reference) 作为更安全的替代
- 提供了智能指针 (smart pointers) 如 `unique_ptr`, `shared_ptr` 来管理内存

### 13.2 Java 中的引用

- Java 没有显式的指针概念，只有引用
- 引用不能进行算术运算
- 内存管理由垃圾回收器自动处理

### 13.3 Python 中的引用

- Python 中的变量都是引用
- 没有指针算术
- 内存管理由垃圾回收器自动处理

## 14. 指针的高级应用

### 14.1 链表实现

```c
 typedef struct Node {
  int data;
  struct Node *next;
 }
 // 创建新节点
 Node *create_node(int data) {
  Node *new_node = (Node *)malloc(sizeof(Node));
  if (new_node == NULL) {
  return NULL;
  }
  new_node->data = data;
  new_node->next = NULL;
  return new_node;
 }
 // 添加节点到链表末尾
 void append(Node **head, int data) {
  Node *new_node = create_node(data);
  if (*head == NULL) {
  *head = new_node;
  return;
  }
  Node *temp = *head;
  while (temp->next != NULL) {
  temp = temp->next;
  }
  temp->next = new_node;
 }
 // 打印链表
 void print_list(Node *head) {
  Node *temp = head;
  while (temp != NULL) {
  printf("%d -> ", temp->data);
  temp = temp->next;
  }
  printf("NULL\n");
 }
 // 释放链表
 void free_list(Node *head) {
  Node *temp;
  while (head != NULL) {
  temp = head;
  head = head->next;
  free(temp);
  }
 }
```

### 14.2 二叉树实现

```c
 typedef struct TreeNode {
  int data;
  struct TreeNode *left;
  struct TreeNode *right;
 }
 // 创建新节点
 TreeNode *create_node(int data) {
  TreeNode *new_node = (TreeNode *)malloc(sizeof(TreeNode));
  if (new_node == NULL) {
  return NULL;
  }
  new_node->data = data;
  new_node->left = NULL;
  new_node->right = NULL;
  return new_node;
 }
 // 插入节点
 TreeNode *insert(TreeNode *root, int data) {
  if (root == NULL) {
  return create_node(data);
  }
  if (data < root->data) {
  root->left = insert(root->left, data);
  } else if (data > root->data) {
  root->right = insert(root->right, data);
  }
  return root;
 }
 // 中序遍历
 void inorder_traversal(TreeNode *root) {
  if (root != NULL) {
  inorder_traversal(root->left);
  printf("%d ", root->data);
  inorder_traversal(root->right);
  }
 }
 // 释放树
 void free_tree(TreeNode *root) {
  if (root != NULL) {
  free_tree(root->left);
  free_tree(root->right);
  free(root);
  }
 }
```

---

## 指针基础

**基本写法：指针声明与初始化**
`<type> *<ptr_name> = &<var>;`
```c
// ptr 指向 x 的地址
int x = 10;
int *ptr = &x;
```

---

**基本写法：指针声明（未初始化）**
`<type> *<ptr_name>;`
```c
// 声明未初始化的指针
int *ptr;
```

---

**空指针写法：初始化为 NULL**
`<type> *<ptr_name> = NULL;`
```c
// 初始化为空指针
int *ptr = NULL;
```

---

**解引用写法：通过指针读取值**
`*<ptr>`
```c
// 解引用获取指针指向的值
int x = 10;
int *ptr = &x;
printf("值: %d\n", *ptr);
```

---

**解引用写法：通过指针修改值**
`*<ptr> = <new_value>;`
```c
// 通过指针修改变量的值
int x = 10;
int *ptr = &x;
*ptr = 20;
```

---

**取地址写法：获取变量地址**
`&<var>`
```c
// 获取变量地址
int x = 10;
printf("地址: %p\n", (void*)&x);
```

---

## 指针类型

**基本写法：不同类型指针**
`<type> *<ptr_name>;`
```c
// 不同类型的指针
int *int_ptr;
char *char_ptr;
double *double_ptr;
```

---

**void 指针写法：通用指针**
`void *<ptr_name>;`
```c
// 可以指向任何类型的通用指针
void *generic_ptr;
int x = 10;
generic_ptr = &x;
```

---

**void 指针转换写法：类型转换**
`(<target_type> *)<void_ptr>`
```c
// void 指针转换为具体类型指针
void *ptr = &x;
int *int_ptr = (int *)ptr;
```

---

**const 指针写法：指向常量的指针**
`const <type> *<ptr_name>;`
```c
// 不能通过指针修改所指向的值
const int *p1;
```

---

**常量指针写法：指针本身为常量**
`<type> * const <ptr_name> = &<var>;`
```c
// 指针本身不能改变指向
int x = 10;
int* const p3 = &x;
```

---

**双重 const 写法：指向常量的常量指针**
`const <type> * const <ptr_name> = &<var>;`
```c
// 既不能修改值，也不能修改指针
int x = 10;
const int* const p4 = &x;
```

---

## 指针与数组

**基本写法：数组名作为指针**
`<type> *<ptr> = <array_name>;`
```c
// 数组名即首元素地址
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
```

---

**指针算术写法：指针加减运算**
`<ptr> + <n>` 或 `<ptr> - <n>`
```c
// 指针向后移动 n 个元素
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
int *q = p + 2;
```

---

**自增写法：指针自增**
`<ptr>++` 或 `++<ptr>`
```c
// 指针指向下一个元素
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
p++;
```

---

**指针差写法：计算两个指针间元素个数**
`<ptr1> - <ptr2>`
```c
// 计算指针间元素个数
int arr[5] = {1, 2, 3, 4, 5};
int *p1 = &arr[0];
int *p2 = &arr[3];
int diff = p2 - p1;
```

---

**下标写法：指针下标访问**
`<ptr>[<index>]`
```c
// 指针使用下标访问
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
printf("%d\n", p[2]);
```

---

## 指针数组与数组指针

**指针数组写法：存储指针的数组**
`<type> *<array_name>[<size>];`
```c
// 指针数组
int *ptr_array[3];
int a = 10, b = 20, c = 30;
ptr_array[0] = &a;
```

---

**数组指针写法：指向数组的指针**
`<type> (*<ptr_name>)[<size>];`
```c
// 指向整个数组的指针
int arr[5] = {1, 2, 3, 4, 5};
int (*p)[5] = &arr;
```

---

## 字符串指针

**基本写法：字符串指针**
`char *<str> = "<string>";`
```c
// 字符串指针指向字符串常量
char *str = "Hello C";
```

---

**字符数组写法：字符数组**
`char <str>[] = "<string>";`
```c
// 字符数组存储字符串
char str[] = "Hello C";
```

---

**遍历写法：使用指针遍历字符串**
`while (*<ptr> != '\0') { ... <ptr>++; }`
```c
// 使用指针遍历字符串
char *str = "Hello";
while (*str != '\0') {
    printf("%c", *str);
    str++;
}
```

---

## 函数指针

**基本写法：函数指针定义**
`<return_type> (*<ptr_name>)(<parameter_list>);`
```c
// 定义函数指针
int (*add_ptr)(int, int);
```

---

**赋值写法：函数指针赋值**
`<func_ptr> = <func_name>;`
```c
// 将函数地址赋给指针
add_ptr = add;
```

---

**调用写法：通过函数指针调用**
`<result> = <func_ptr>(<args>);`
```c
// 通过函数指针调用函数
int result = add_ptr(10, 20);
```

---

**typedef 写法：定义回调函数类型**
`typedef <return_type> (*<CallbackName>)(<params>);`
```c
// 定义回调函数类型
typedef void (*Callback)(int);
```

---

**回调写法：使用回调函数**
`void <func>(<type> <arr>[], int <size>, <CallbackType> <callback>) { ... }`
```c
// 执行回调的函数
void process_array(int arr[], int size, Callback callback) {
    for (int i = 0; i < size; i++) {
        callback(arr[i]);
    }
}
```

---

**数组写法：函数指针数组**
`<return_type> (*<array_name>[])(<params>) = { <func1>, <func2>, ... };`
```c
// 函数指针数组
int (*operations[])(int, int) = {add, subtract, multiply};
```

---

## 多级指针

**二级指针写法：指向指针的指针**
`<type> **<ptr_name>;`
```c
// 二级指针
int x = 10;
int *p = &x;
int **pp = &p;
```

---

**二级指针访问写法：解引用二级指针**
`**<ptr_name>`
```c
// 通过二级指针访问原始值
int x = 10;
int *p = &x;
int **pp = &p;
printf("%d\n", **pp);
```

---

**三级指针写法：三级指针**
`<type> ***<ptr_name>;`
```c
// 三级指针
int x = 10;
int *p = &x;
int **pp = &p;
int ***ppp = &pp;
```

---

## 动态内存分配

**malloc 写法：分配内存**
`<type> *<ptr> = (<type> *)malloc(<size> * sizeof(<type>));`
```c
#include <stdlib.h>
// 分配单个变量的内存
int *p = (int *)malloc(sizeof(int));
```

---

**calloc 写法：分配并清零**
`<type> *<ptr> = (<type> *)calloc(<count>, sizeof(<type>));`
```c
#include <stdlib.h>
// 分配数组并初始化为 0
int *arr = (int *)calloc(10, sizeof(int));
```

---

**realloc 写法：重新分配内存**
`<type> *<new_ptr> = (<type> *)realloc(<ptr>, <new_size> * sizeof(<type>));`
```c
#include <stdlib.h>
// 重新调整内存大小
int *new_arr = (int *)realloc(arr, 20 * sizeof(int));
```

---

**free 写法：释放内存**
`free(<ptr>);`
```c
#include <stdlib.h>
// 释放动态分配的内存
free(p);
```

---

## 指针与结构体

**基本写法：指向结构体的指针**
`<StructType> *<ptr_name> = &<var>;`
```c
// 指向结构体的指针
typedef struct { int x; int y; } Point;
Point p = {10, 20};
Point *ptr = &p;
```

---

**成员访问写法：通过指针访问成员**
`<ptr>-><member>`
```c
// 使用 -> 访问结构体成员
printf("x: %d\n", ptr->x);
```

---

## 指针常见陷阱

**野指针写法：未初始化的指针**
`<type> *<ptr>;` （危险）
```c
// 危险：未初始化的指针
int *ptr;
// *ptr = 10; // 未定义行为
```

---

**悬空指针写法：释放后仍使用**
`free(<ptr>); <ptr> = NULL;`
```c
// 释放后将指针置空
free(p);
p = NULL;
```
