---
order: 100
tags:
  - c
difficulty: intermediate
title: 结构体与联合体
module: c
category: 'C Basics'
description: 结构体定义、内存对齐、联合体应用及枚举类型。
author: Anonymous
related:
  - c/内存管理
  - c/内存对齐
  - c/函数调用栈帧
  - c/指针与数组的区别
prerequisites:
  - c/概述
---

## 1. 结构体 (Structures)

### 1.1 结构体的概念

- **结构体**是一种用户定义的数据类型，用于将不同类型的数据打包在一起，形成一个逻辑整体。
- **作用**：
- 组织相关数据，提高代码的可读性和可维护性
- 实现复杂的数据结构（如链表、树等）
- 作为函数参数传递多个相关数据

### 1.2 结构体的定义与声明

#### 1.2.1 基本定义

```c
 // 结构体定义
 struct Person {
  char name[50]; // 姓名
  int age; // 年龄
  float height; // 身高
 }
```

#### 1.2.2 同时定义结构体变量

```c
 // 定义结构体的同时声明变量
 struct Person {
  char name[50];
  int age;
 }
```

#### 1.2.3 匿名结构体

```c
 // 匿名结构体（只能在定义时声明变量）
 struct {
  int x;
  int y;
 }
```

### 1.3 结构体的初始化

#### 1.3.1 静态初始化

```c
 // 按顺序初始化
 struct Person p1 = {"Alice", 25, 1.65};
 // 部分初始化（未初始化的成员为 0 或空）
 struct Person p2 = {"Bob"}; // age 和 height 为 0
 // C99 及以上：指定成员初始化
 struct Person p3 = {
  .name = "Charlie",
  .age = 30
 }
```

#### 1.3.2 动态初始化

```c
 struct Person p4;
 strcpy(p4.name, "David");
 p4.age = 35;
 p4.height = 1.75;
```

### 1.4 结构体成员的访问

#### 1.4.1 直接访问（使用点运算符）

```c
 printf("Name: %s\n", p1.name);
 printf("Age: %d\n", p1.age);
 printf("Height: %.2f\n", p1.height);
```

#### 1.4.2 通过指针访问（使用箭头运算符）

```c
 struct Person *ptr = &p1;
 printf("Name: %s\n", ptr->name);
 printf("Age: %d\n", ptr->age);
 printf("Height: %.2f\n", ptr->height);
 // 也可以使用解引用后再使用点运算符
 printf("Name: %s\n", (*ptr).name);
```

### 1.5 结构体作为函数参数

#### 1.5.1 传值调用

```c
 void print_person(struct Person p) {
  printf("Name: %s\n", p.name);
  printf("Age: %d\n", p.age);
  printf("Height: %.2f\n", p.height);
 }
 // 调用
 print_person(p1);
```

#### 1.5.2 传址调用（推荐，避免复制开销）

```c
 void update_person(struct Person *p, int new_age) {
  p->age = new_age;
 }
 // 调用
 update_person(&p1, 26);
```

### 1.6 结构体数组

```c
 // 定义结构体数组
 struct Person people[3] = {
  {"Alice", 25, 1.65},
  {"Bob", 30, 1.75},
  {"Charlie", 35, 1.80}
 }
 // 访问数组元素
 for (int i = 0; i < 3; i++) {
  printf("Person %d: %s, %d, %.2f\n",
  i+1, people[i].name, people[i].age, people[i].height);
 }
```

### 1.7 嵌套结构体

```c
 // 定义日期结构体
 struct Date {
  int day;
  int month;
  int year;
 }
 // 定义包含日期的结构体
 struct Person {
  char name[50];
  int age;
  struct Date birthday; // 嵌套结构体
 }
 // 初始化
 struct Person p = {
  "Alice",
  25,
  {15, 5, 1999} // 初始化嵌套的 Date 结构体
 }
 // 访问嵌套结构体成员
 printf("Birthday: %d/%d/%d\n",
  p.birthday.day, p.birthday.month, p.birthday.year);
```

### 1.8 结构体的内存对齐

#### 1.8.1 内存对齐的概念

- **内存对齐**是编译器为了提高内存访问效率，按照一定规则对结构体成员进行内存布局的过程。
- **原因**：大多数 CPU 访问内存时，以字长为单位（如 4 字节或 8 字节），对齐的内存访问会更高效。

#### 1.8.2 对齐规则

1. 结构体的起始地址必须是其最大成员大小的整数倍
2. 每个成员的起始地址必须是其自身大小的整数倍
3. 结构体的总大小必须是其最大成员大小的整数倍

#### 1.8.3 示例

```c
 struct Example {
  char c; // 1 字节
  // 3 字节填充
  int i; // 4 字节
  double d; // 8 字节
  // 4 字节填充（使总大小为 8 的整数倍）
 }
 // sizeof(struct Example) 通常为 24 字节
 // 解释：1 + 3 + 4 + 8 + 4 = 20？不，实际是 24
 // 正确计算：
 // c: 偏移 0 (1字节)
 // 填充 3字节 (偏移 1-3)
 // i: 偏移 4 (4字节)
 // d: 偏移 8 (8字节)
 // 总大小 16，是 8 的整数倍，所以不需要额外填充
 // 实际大小为 16 字节
```

#### 1.8.4 内存对齐的影响

- **优点**：提高内存访问速度
- **缺点**：可能浪费一些内存空间

#### 1.8.5 控制内存对齐

- **`#pragma pack(n)`**：设置对齐字节数为 n
- **`__attribute__((packed))`**：取消对齐，按实际大小排列

```c
 // 设置对齐字节数为 1
 #pragma pack(1)
 struct PackedExample {
  char c;
  int i;
  double d;
 }
 #pragma pack() // 恢复默认对齐
 // 使用 packed 属性
 struct __attribute__((packed)) PackedStruct {
  char c;
  int i;
  double d;
 }
```

### 1.9 结构体的应用示例

#### 1.9.1 链表节点

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
 // 添加节点
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
```

#### 1.9.2 学生信息管理

```c
 typedef struct Student {
  char name[50];
  int id;
  float grades[3]; // 三门课的成绩
  float average;
 }
 // 计算平均成绩
 void calculate_average(Student *s) {
  s->average = (s->grades[0] + s->grades[1] + s->grades[2]) / 3.0;
 }
 // 打印学生信息
 void print_student(Student s) {
  printf("Name: %s\n", s.name);
  printf("ID: %d\n", s.id);
  printf("Grades: %.2f, %.2f, %.2f\n", s.grades[0], s.grades[1], s.grades[2]);
  printf("Average: %.2f\n", s.average);
 }
```

## 2. 联合体 (Unions)

### 2.1 联合体的概念

- **联合体**是一种特殊的数据类型，所有成员共享同一块内存空间。
- **特点**：
- 联合体的大小等于最大成员的大小
- 同一时间只能使用一个成员
- 修改一个成员会影响其他成员

### 2.2 联合体的定义与使用

```c
 // 联合体定义
 union Data {
  int i; // 4 字节
  float f; // 4 字节
  char c; // 1 字节
  char str[20]; // 20 字节
 }
 // 使用
 union Data data;
 data.i = 100;
 printf("data.i = %d\n", data.i); // 输出 100
 data.f = 3.14;
 printf("data.f = %f\n", data.f); // 输出 3.14
 printf("data.i = %d\n", data.i); // 输出会改变，因为共享内存
```

### 2.3 联合体的应用场景

#### 2.3.1 节省内存

- 当不同类型的数据不会同时使用时，可以使用联合体节省内存。

#### 2.3.2 类型转换

- 可以通过联合体实现不同类型之间的转换。

```c
 union FloatInt {
  float f;
  int i;
 }
 // 查看浮点数的二进制表示
 void print_float_bits(float f) {
  union FloatInt fi;
  fi.f = f;
  printf("Float: %f, Int: %d, Hex: 0x%X\n", f, fi.i, fi.i);
 }
```

#### 2.3.3 判别式联合（Tagged Union）

- 结合结构体和联合体，实现带类型标签的联合。

```c
 enum DataType {
  INT, FLOAT, STRING
 }
 struct TaggedUnion {
  enum DataType type; // 类型标签
  union {
  int i;
  float f;
  char str[50];
  } data; // 数据
 }
 void print_data(struct TaggedUnion tu) {
  switch (tu.type) {
  case INT:
  printf("Integer: %d\n", tu.data.i);
  break;
  case FLOAT:
  printf("Float: %f\n", tu.data.f);
  break;
  case STRING:
  printf("String: %s\n", tu.data.str);
  break;
  default:
  printf("Unknown type\n");
  }
 }
 // 使用
 struct TaggedUnion tu1;
 tu1.type = INT;
 tu1.data.i = 42;
 print_data(tu1);
 struct TaggedUnion tu2;
 tu2.type = FLOAT;
 tu2.data.f = 3.14;
 print_data(tu2);
```

#### 2.3.4 位域操作

- 可以使用联合体和位域来操作数据的特定位。

```c
 // 位域结构体
 struct Flags {
  unsigned int is_active : 1; // 1位
  unsigned int is_admin : 1; // 1位
  unsigned int level : 3; // 3位
 }
 // 联合体
 union FlagUnion {
  struct Flags flags;
  unsigned char value; // 1字节
 }
 // 使用
 union FlagUnion fu;
 fu.value = 0; // 初始化
 fu.flags.is_active = 1;
 fu.flags.level = 3;
 printf("Value: 0x%X\n", fu.value); // 输出 0x0B (1011)
```

## 3. 枚举 (Enums)

### 3.1 枚举的概念

- **枚举**是一种用户定义的数据类型，用于为整数常量分配有意义的名称。
- **作用**：
- 提高代码可读性
- 减少魔法数字
- 提供类型安全

### 3.2 枚举的定义与使用

#### 3.2.1 基本定义

```c
 enum Color {
  RED, // 默认值 0
  GREEN, // 默认值 1
  BLUE // 默认值 2
 }
 // 使用
 enum Color my_color = GREEN;
 printf("Color value: %d\n", my_color); // 输出 1
```

#### 3.2.2 显式指定值

```c
 enum Day {
  MONDAY = 1, // 1
  TUESDAY, // 2
  WEDNESDAY, // 3
  THURSDAY, // 4
  FRIDAY, // 5
  SATURDAY = 10, // 10
  SUNDAY // 11
 }
 // 使用
 enum Day today = WEDNESDAY;
 printf("Today is day %d\n", today); // 输出 3
```

#### 3.2.3 枚举的大小

- 枚举的大小通常与 int 相同，但在某些编译器中可能会根据枚举值的范围进行优化。

### 3.3 枚举的应用场景

#### 3.3.1 状态码

```c
 enum ErrorCode {
  SUCCESS = 0,
  ERROR_INVALID_INPUT = 1,
  ERROR_MEMORY = 2,
  ERROR_NETWORK = 3
 }
 int process_data(int input) {
  if (input < 0) {
  return ERROR_INVALID_INPUT;
  }
  // 处理数据
  return SUCCESS;
 }
```

#### 3.3.2 选项标志

```c
 enum FileOpenMode {
  MODE_READ = 1 << 0, // 0b0001
  MODE_WRITE = 1 << 1, // 0b0010
  MODE_APPEND = 1 << 2, // 0b0100
  MODE_BINARY = 1 << 3 // 0b1000
 }
 void open_file(const char *filename, int mode) {
  if (mode & MODE_READ) {
  printf("Opening file for reading\n");
  }
  if (mode & MODE_WRITE) {
  printf("Opening file for writing\n");
  }
  // 打开文件
 }
 // 使用
 open_file("data.txt", MODE_READ | MODE_WRITE);
```

## 4. `typedef` 类型别名

### 4.1 `typedef` 的概念

- **`typedef`** 是 C 语言中的一个关键字，用于为现有类型创建一个新的名称（别名）。
- **作用**：
- 简化复杂类型的声明
- 提高代码的可读性和可维护性
- 便于类型的统一管理和修改

### 4.2 `typedef` 的使用

#### 4.2.1 为基本类型创建别名

```c
 // 为基本类型创建别名
 typedef unsigned int uint;
 typedef long long int64;
 typedef double real;
 // 使用
 uint count = 100;
 int64 large_number = 9999999999;
 real pi = 3.14159;
```

#### 4.2.2 为结构体创建别名

```c
 // 方式 1：先定义结构体，再创建别名
 struct Person {
  char name[50];
  int age;
 }
 typedef struct Person Person;
 // 方式 2：定义结构体的同时创建别名
 typedef struct {
  char name[50];
  int age;
 }
 // 方式 3：带标签的结构体
 typedef struct Person {
  char name[50];
  int age;
 }
 // 使用
 Person p = {"Alice", 25};
```

#### 4.2.3 为指针类型创建别名

```c
 // 为指针类型创建别名
 typedef int *IntPtr;
 typedef char *StrPtr;
 // 使用
 intPtr p1, p2; // 相当于 int *p1, *p2;
 StrPtr s1, s2; // 相当于 char *s1, *s2;
```

#### 4.2.4 为函数指针创建别名

```c
 // 为函数指针创建别名
 typedef int (*CompareFunc)(int, int);
 // 使用
 int ascending(int a, int b) {
  return a - b;
 }
 CompareFunc cmp = ascending;
 int result = cmp(5, 3);
```

## 5. 综合应用示例

### 5.1 学生信息管理系统

```c
 #include <stdio.h>
 #include <string.h>
 // 定义日期结构体
 typedef struct {
  int day;
  int month;
  int year;
 }
 // 定义学生结构体
 typedef struct {
  char name[50];
  int id;
  Date birthday;
  float grades[3];
  float average;
 }
 // 计算平均成绩
 void calculate_average(Student *s) {
  s->average = (s->grades[0] + s->grades[1] + s->grades[2]) / 3.0;
 }
 // 打印学生信息
 void print_student(Student s) {
  printf("Name: %s\n", s.name);
  printf("ID: %d\n", s.id);
  printf("Birthday: %d/%d/%d\n",
  s.birthday.day, s.birthday.month, s.birthday.year);
  printf("Grades: %.2f, %.2f, %.2f\n",
  s.grades[0], s.grades[1], s.grades[2]);
  printf("Average: %.2f\n\n", s.average);
 }
 int main() {
  // 初始化学生数组
  Student students[3] = {
  {
  "Alice",
  1001,
  {15, 5, 1999},
  {85.5, 90.0, 92.5},
  0.0
  },
  {
  "Bob",
  1002,
  {20, 8, 1998},
  {78.0, 82.5, 85.0},
  0.0
  },
  {
  "Charlie",
  1003,
  {5, 12, 1999},
  {92.0, 95.5, 90.0},
  0.0
  }
  };
  // 计算平均成绩并打印信息
  for (int i = 0; i < 3; i++) {
  calculate_average(&students[i]);
  print_student(students[i]);
  }
  return 0;
 }
```

### 5.2 图形库中的形状表示

```c
 #include <stdio.h>
 // 形状类型枚举
 enum ShapeType {
  CIRCLE,
  RECTANGLE,
  TRIANGLE
 }
 // 点结构体
 typedef struct {
  int x;
  int y;
 }
 // 圆形结构体
 typedef struct {
  Point center;
  int radius;
 }
 // 矩形结构体
 typedef struct {
  Point top_left;
  int width;
  int height;
 }
 // 三角形结构体
 typedef struct {
  Point p1;
  Point p2;
  Point p3;
 }
 // 形状联合体
 typedef union {
  Circle circle;
  Rectangle rectangle;
  Triangle triangle;
 }
 // 形状结构体
 typedef struct {
  enum ShapeType type;
  ShapeData data;
 }
 // 计算面积
 float calculate_area(Shape shape) {
  switch (shape.type) {
  case CIRCLE:
  return 3.14159 * shape.data.circle.radius * shape.data.circle.radius;
  case RECTANGLE:
  return shape.data.rectangle.width * shape.data.rectangle.height;
  case TRIANGLE:
  // 使用海伦公式计算三角形面积
  int x1 = shape.data.triangle.p1.x;
  int y1 = shape.data.triangle.p1.y;
  int x2 = shape.data.triangle.p2.x;
  int y2 = shape.data.triangle.p2.y;
  int x3 = shape.data.triangle.p3.x;
  int y3 = shape.data.triangle.p3.y;
  float a = sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
  float b = sqrt((x3-x2)*(x3-x2) + (y3-y2)*(y3-y2));
  float c = sqrt((x1-x3)*(x1-x3) + (y1-y3)*(y1-y3));
  float s = (a + b + c) / 2;
  return sqrt(s * (s-a) * (s-b) * (s-c));
  default:
  return 0.0;
  }
 }
 // 打印形状信息
 void print_shape(Shape shape) {
  switch (shape.type) {
  case CIRCLE:
  printf("Circle: center=(%d,%d), radius=%d\n",
  shape.data.circle.center.x,
  shape.data.circle.center.y,
  shape.data.circle.radius);
  break;
  case RECTANGLE:
  printf("Rectangle: top_left=(%d,%d), width=%d, height=%d\n",
  shape.data.rectangle.top_left.x,
  shape.data.rectangle.top_left.y,
  shape.data.rectangle.width,
  shape.data.rectangle.height);
  break;
  case TRIANGLE:
  printf("Triangle: p1=(%d,%d), p2=(%d,%d), p3=(%d,%d)\n",
  shape.data.triangle.p1.x, shape.data.triangle.p1.y,
  shape.data.triangle.p2.x, shape.data.triangle.p2.y,
  shape.data.triangle.p3.x, shape.data.triangle.p3.y);
  break;
  default:
  printf("Unknown shape\n");
  }
 }
 int main() {
  // 创建圆形
  Shape circle_shape;
  circle_shape.type = CIRCLE;
  circle_shape.data.circle.center.x = 10;
  circle_shape.data.circle.center.y = 10;
  circle_shape.data.circle.radius = 5;
  // 创建矩形
  Shape rect_shape;
  rect_shape.type = RECTANGLE;
  rect_shape.data.rectangle.top_left.x = 0;
  rect_shape.data.rectangle.top_left.y = 0;
  rect_shape.data.rectangle.width = 10;
  rect_shape.data.rectangle.height = 8;
  // 打印信息并计算面积
  print_shape(circle_shape);
  printf("Area: %.2f\n\n", calculate_area(circle_shape));
  print_shape(rect_shape);
  printf("Area: %.2f\n\n", calculate_area(rect_shape));
  return 0;
 }
```

## 6. 最佳实践

### 6.1 结构体的最佳实践

- **命名规范**：结构体名使用 PascalCase，成员名使用 snake_case
- **初始化**：使用指定成员初始化（C99+）提高可读性
- **内存管理**：结构体较大时，使用指针传递以避免复制开销
- **内存对齐**：了解内存对齐规则，合理安排成员顺序以减少内存浪费
- **封装**：将相关数据和操作封装在结构体中

### 6.2 联合体的最佳实践

- **使用场景**：只在确实需要共享内存时使用联合体
- **判别式**：使用判别式联合（Tagged Union）来安全地使用联合体
- **类型安全**：确保在访问联合体成员前，了解当前存储的类型
- **内存布局**：注意不同成员的内存布局，避免未定义行为

### 6.3 枚举的最佳实践

- **命名规范**：枚举名使用 PascalCase，枚举值使用全大写加下划线
- **值管理**：为枚举值赋予有意义的名称，避免魔法数字
- **类型安全**：使用枚举类型而不是整数类型，提高代码可读性和类型安全
- **范围管理**：确保枚举值在合理范围内，避免溢出

### 6.4 typedef 的最佳实践

- **命名规范**：类型别名使用 PascalCase 或 snake_case，根据项目约定
- **适度使用**：不要过度使用 typedef，以免降低代码可读性
- **一致性**：在整个项目中保持 typedef 的一致性
- **文档**：为复杂的 typedef 提供注释，说明其用途

## 7. 常见错误与调试

### 7.1 结构体相关错误

- **忘记初始化**：结构体成员未初始化，导致未定义行为
- **内存泄漏**：动态分配的结构体未释放
- **指针错误**：结构体指针未初始化或指向无效内存
- **内存对齐误解**：不了解内存对齐规则，导致 sizeof 计算错误

### 7.2 联合体相关错误

- **类型混淆**：在不知道当前存储类型的情况下访问联合体成员
- **内存覆盖**：修改一个成员后，错误地假设其他成员的值仍然有效
- **大小计算错误**：错误计算联合体的大小

### 7.3 枚举相关错误

- **隐式转换**：将枚举值隐式转换为整数，可能导致类型错误
- **值冲突**：不同枚举类型的值冲突
- **范围溢出**：枚举值超出底层类型的范围

### 7.4 调试技巧

- **打印调试**：使用 printf 打印结构体成员的值
- **内存检查**：使用工具如 Valgrind 检查内存泄漏和访问错误
- **断言**：使用 assert 验证结构体和联合体的状态
- **调试器**：使用 GDB 等调试器查看结构体和联合体的内存布局

---

### 更新日志 (Changelog)

- 2026-04-05: 拆分并细化结构体知识。
- 2026-04-05: 详细扩写内容，增加了结构体的详细定义与使用、内存对齐详解、嵌套结构体、结构体数组、联合体的应用场景、枚举的高级用法、typedef的详细应用、综合应用示例和最佳实践。

## 延伸阅读

- [C++ OOP](cpp/cpp-oop-basics)
