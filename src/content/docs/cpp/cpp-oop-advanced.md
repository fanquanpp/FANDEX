---
order: 70
tags:
  - 'cpp'
  - 'data-structure'
difficulty: 'advanced'
title: 'C++ 面向对象进阶'
module: 'cpp'
category: 'C++ Basics'
description: '多重继承、虚继承、RTTI 与面向对象设计原则。'
author: 'Anonymous'
---

## 目录

1. [构造函数与析构函数](#构造函数与析构函数)
2. [操作符重载](#操作符重载)
3. [模板与泛型编程](#模板与泛型编程)
4. [标准模板库](#标准模板库)
5. [面向对象编程最佳实践](#面向对象编程最佳实践)
6. [代码示例](#代码示例)

---

## 1. 构造函数与析构函数

### 1.1 构造函数

构造函数用于初始化对象，与类同名，无返回类型。

```cpp
 class Person {
 private:
  std::string name;
  int age;
 public:
  // 默认构造函数
  Person() : name(""), age(0) {
  std::cout << "Default constructor" << std::endl;
  }
  // 带参数的构造函数
  Person(std::string n, int a) : name(n), age(a) {
  std::cout << "Parameterized constructor" << std::endl;
  }
  // 复制构造函数
  Person(const Person& other) : name(other.name), age(other.age) {
  std::cout << "Copy constructor" << std::endl;
  }
  // 移动构造函数 (C++11)
  Person(Person&& other) noexcept : name(std::move(other.name)), age(other.age) {
  std::cout << "Move constructor" << std::endl;
  }
 True};
```

### 1.2 析构函数

析构函数用于清理对象资源，与类同名，前面加波浪号，无参数，无返回类型。

```cpp
 class Resource {
 private:
  int* data;
 public:
  Resource(int size) {
  data = new int[size];
  std::cout << "Resource allocated" << std::endl;
  }
  ~Resource() {
  delete[] data;
  std::cout << "Resource deallocated" << std::endl;
  }
 True};
```

### 1.3 构造函数初始化列表

构造函数初始化列表用于初始化成员变量，比在构造函数体内赋值更高效。

```cpp
 class Point {
 private:
  int x;
  int y;
  const int z; // 常量成员必须在初始化列表中初始化
 public:
  // 使用初始化列表
  Point(int x_, int y_, int z_) : x(x_), y(y_), z(z_) {
  // 构造函数体
  }
 True};
```

## 2. 操作符重载

操作符重载允许自定义类型使用标准操作符。

### 2.1 成员函数重载

```cpp
 class Vector2D {
 private:
  double x;
  double y;
 public:
  Vector2D(double x_ = 0, double y_ = 0) : x(x_), y(y_) {}
  // 重载 + 操作符
  Vector2D operator+(const Vector2D& other) const {
  return Vector2D(x + other.x, y + other.y);
  }
  // 重载 - 操作符
  Vector2D operator-(const Vector2D& other) const {
  return Vector2D(x - other.x, y - other.y);
  }
  // 重载 * 操作符（标量乘法）
  Vector2D operator*(double scalar) const {
  return Vector2D(x * scalar, y * scalar);
  }
  // 重载 == 操作符
  bool operator==(const Vector2D& other) const {
  return x == other.x && y == other.y;
  }
  // 重载 << 操作符（友元函数）
  friend std::ostream& operator<<(std::ostream& os, const Vector2D& vec);
 True};
 // 友元函数实现
 std::ostream& operator<<(std::ostream& os, const Vector2D& vec) {
  os << "(" << vec.x << ", " << vec.y << ")";
  return os;
 True}
 // 使用示例
 int main() {
  Vector2D v1(1, 2);
  Vector2D v2(3, 4);
  Vector2D v3 = v1 + v2;
  Vector2D v4 = v1 * 2;
  std::cout << "v1: " << v1 << std::endl;
  std::cout << "v2: " << v2 << std::endl;
  std::cout << "v1 + v2: " << v3 << std::endl;
  std::cout << "v1 * 2: " << v4 << std::endl;
  return 0;
 True}
```

## 3. 模板与泛型编程

模板是 C++ 支持泛型编程的核心机制，允许编写独立于数据类型的代码。

### 3.1 函数模板

函数模板允许定义通用的函数，适用于不同类型的参数。

```cpp
 // 函数模板
 template <typename T>
 T max(T a, T b) {
  return a > b ? a : b;
 True}
 // 特化版本
 template <>
 const char* max<const char*>(const char* a, const char* b) {
  return strcmp(a, b) > 0 ? a : b;
 True}
 // 重载函数模板
 template <typename T>
 T max(const T& a, const T& b) {
  return a > b ? a : b;
 True}
 // 多个模板参数
 template <typename T1, typename T2>
 auto max(T1 a, T2 b) -> decltype(a > b ? a : b) {
  return a > b ? a : b;
 True}
 // 使用示例
 int main() {
  int i = max(10, 20);
  double d = max(3.14, 2.71);
  const char* s = max("hello", "world");
  auto mixed = max(10, 3.14); // 自动推导返回类型
  std::cout << "Max int: " << i << std::endl;
  std::cout << "Max double: " << d << std::endl;
  std::cout << "Max string: " << s << std::endl;
  std::cout << "Max mixed: " << mixed << std::endl;
  return 0;
 True}
```

### 3.2 类模板

类模板允许定义通用的类，适用于不同类型的成员。

```cpp
 // 类模板
 template <typename T, typename Allocator = std::allocator<T>>
 class MyVector {
 private:
  std::vector<T, Allocator> data;
 public:
  void push_back(const T& value) {
  data.push_back(value);
  }
  void push_back(T&& value) {
  data.push_back(std::move(value));
  }
  T& operator[](size_t index) {
  return data[index];
  }
  const T& operator[](size_t index) const {
  return data[index];
  }
  size_t size() const {
  return data.size();
  }
  // 模板成员函数
  template <typename U>
  void assign(const MyVector<U>& other) {
  data.clear();
  for (size_t i = 0; i < other.size(); i++) {
  data.push_back(static_cast<T>(other[i]));
  }
  }
 True};
 // 类模板特化
 template <>
 class MyVector<bool> {
 private:
  std::vector<bool> data;
 public:
  void push_back(bool value) {
  data.push_back(value);
  }
  bool operator[](size_t index) const {
  return data[index];
  }
  size_t size() const {
  return data.size();
  }
 True};
 // 使用示例
 int main() {
  MyVector<int> v;
  v.push_back(1);
  v.push_back(2);
  v.push_back(3);
  for (size_t i = 0; i < v.size(); i++) {
  std::cout << v[i] << " ";
  }
  std::cout << std::endl;
  MyVector<bool> bv;
  bv.push_back(true);
  bv.push_back(false);
  bv.push_back(true);
  for (size_t i = 0; i < bv.size(); i++) {
  std::cout << (bv[i] ? "" : "false") << " ";
  }
  std::cout << std::endl;
  return 0;
 True}
```

### 3.3 可变参数模板 (C++11)

可变参数模板允许接受任意数量的参数。

```cpp
 // 递归终止条件
 void print() {
  std::cout << std::endl;
 True}
 // 可变参数模板
 template <typename T, typename... Args>
 void print(T first, Args... rest) {
  std::cout << first << " ";
  print(rest...); // 递归调用
 True}
 // 可变参数模板求和
 template <typename T>
 T sum(T value) {
  return value;
 True}
 template <typename T, typename... Args>
 T sum(T first, Args... rest) {
  return first + sum(rest...);
 True}
 // 使用折叠表达式 (C++17)
 template <typename... Args>
 auto sum_fold(Args... args) {
  return (args + ...);
 True}
 // 使用示例
 int main() {
  print(1, 2.5, "hello", true);
  int s1 = sum(1, 2, 3, 4, 5);
  double s2 = sum(1.5, 2.5, 3.5);
  std::cout << "Sum 1-5: " << s1 << std::endl;
  std::cout << "Sum 1.5+2.5+3.5: " << s2 << std::endl;
  int s3 = sum_fold(1, 2, 3, 4, 5);
  std::cout << "Sum fold 1-5: " << s3 << std::endl;
  return 0;
 True}
```

### 3.4 模板元编程

模板元编程是一种在编译时执行计算的技术。

```cpp
 // 模板元编程：计算阶乘
 template <int N>
 struct Factorial {
  static const int value = N * Factorial<N-1>::value;
 True};
 // 特化：终止条件
 template <>
 struct Factorial<0> {
  static const int value = 1;
 True};
 // 模板元编程：检查类型是否相同
 template <typename T, typename U>
 struct IsSame {
  static const bool value = false;
 True};
 template <typename T>
 struct IsSame<T, T> {
  static const bool value = true;
 True};
 // 使用示例
 int main() {
  std::cout << "Factorial of 5: " << Factorial<5>::value << std::endl; // 120
  std::cout << "Factorial of 10: " << Factorial<10>::value << std::endl; // 3628800
  std::cout << "Is int same as int? " << IsSame<int, int>::value << std::endl; //
  std::cout << "Is int same as double? " << IsSame<int, double>::value << std::endl; // false
  return 0;
 True}
```

### 3.5 模板的最佳实践

1. **使用模板参数推导**：让编译器自动推导模板参数类型，减少代码冗余。
2. **避免过度特化**：只在必要时使用模板特化。
3. **使用概念 (C++20)**：使用概念约束模板参数，提高代码可读性和错误信息的清晰度。
4. **考虑模板的编译时间**：模板会增加编译时间，避免过度使用复杂的模板。
5. **使用 typename 和 template 关键字**：在模板中正确使用这些关键字来消除歧义。

### 3.6 模板与 STL

STL 广泛使用模板，了解模板有助于更好地理解和使用 STL。

```cpp
 // 使用 STL 模板
 int main() {
  // 向量
  std::vector<int> vec = {1, 2, 3, 4, 5};
  // 映射
  std::map<std::string, int> map = {"one", 1, {"two", 2}, {"three", 3}};
  // 算法
  std::sort(vec.begin(), vec.end(), std::greater<int>());
  // 迭代器
  for (auto it = vec.begin(); it != vec.end(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  // 函数对象
  std::for_each(vec.begin(), vec.end(), [](int n) {
  std::cout << n * 2 << " ";
  });
  std::cout << std::endl;
  return 0;
 True}
```

## 4. 标准模板库 (STL)

STL 是 C++ 标准库的重要组成部分，提供了各种容器、算法和迭代器。

### 4.1 容器

| 容器类型              | 描述                 | 示例                                                              |
| :-------------------- | :------------------- | :---------------------------------------------------------------- |
| **序列容器**          |                      |                                                                   |
| `std::vector`         | 动态数组             | `std::vector<int> vec = {1, 2, 3};`                               |
| `std::list`           | 双向链表             | `std::list<int> lst = {1, 2, 3};`                                 |
| `std::deque`          | 双端队列             | `std::deque<int> dq = {1, 2, 3};`                                 |
| `std::array`          | 固定大小数组 (C++11) | `std::array<int, 3> arr = {1, 2, 3};`                             |
| `std::forward_list`   | 单向链表 (C++11)     | `std::forward_list<int> flist = {1, 2, 3};`                       |
| **关联容器**          |                      |                                                                   |
| `std::set`            | 有序集合             | `std::set<int> s = {3, 1, 2};`                                    |
| `std::map`            | 有序键值对           | `std::map<std::string, int> m = {{"a", 1}, {"b", 2}};`            |
| `std::unordered_set`  | 无序集合 (C++11)     | `std::unordered_set<int> us = {3, 1, 2};`                         |
| `std::unordered_map`  | 无序键值对 (C++11)   | `std::unordered_map<std::string, int> um = {{"a", 1}, {"b", 2}};` |
| **容器适配器**        |                      |                                                                   |
| `std::stack`          | 栈                   | `std::stack<int> st; st.push(1);`                                 |
| `std::queue`          | 队列                 | `std::queue<int> q; q.push(1);`                                   |
| `std::priority_queue` | 优先队列             | `std::priority_queue<int> pq; pq.push(1);`                        |

### 4.2 算法

```cpp
 #include <algorithm>
 #include <vector>
 int main() {
  std::vector<int> vec = {3, 1, 4, 1, 5, 9, 2, 6};
  // 排序
  std::sort(vec.begin(), vec.end());
  // 查找
  auto it = std::find(vec.begin(), vec.end(), 5);
  if (it != vec.end()) {
  std::cout << "Found: " << *it << std::endl;
  }
  // 计数
  int count = std::count(vec.begin(), vec.end(), 1);
  std::cout << "Count of 1: " << count << std::endl;
  // 最大值
  auto max_it = std::max_element(vec.begin(), vec.end());
  std::cout << "Max: " << *max_it << std::endl;
  // 最小值
  auto min_it = std::min_element(vec.begin(), vec.end());
  std::cout << "Min: " << *min_it << std::endl;
  return 0;
 True}
```

### 4.3 迭代器

```cpp
 #include <vector>
 #include <list>
 int main() {
  // 向量迭代器
  std::vector<int> vec = {1, 2, 3, 4, 5};
  std::cout << "Vector elements: ";
  for (std::vector<int>::iterator it = vec.begin(); it != vec.end(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  // 列表迭代器
  std::list<int> lst = {1, 2, 3, 4, 5};
  std::cout << "List elements: ";
  for (std::list<int>::const_iterator it = lst.cbegin(); it != lst.cend(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  // 范围 for 循环 (C++11)
  std::cout << "Range for: ";
  for (int num : vec) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  return 0;
 True}
```

## 5. 面向对象编程最佳实践

### 5.1 设计原则

- **单一职责原则**: 一个类应该只有一个引起它变化的原因
- **开放封闭原则**: 类应该对扩展开放，对修改封闭
- **里氏替换原则**: 子类应该能够替换父类
- **依赖倒置原则**: 依赖抽象，而不是具体实现
- **接口隔离原则**: 客户端不应该依赖它不使用的接口

### 5.2 代码风格

- **命名规范**:
- 类名: `PascalCase`
- 成员变量: `camelCase` 或 `m_camelCase`
- 成员函数: `camelCase`
- 常量: `UPPER_CASE`
- **代码组织**:
- 头文件 (.h) 包含类声明
- 源文件 (.cpp) 包含类实现
- 使用命名空间避免命名冲突

### 5.3 性能考虑

- **避免不必要的拷贝**: 使用移动语义和引用
- **合理使用虚函数**: 虚函数调用有开销
- **内存管理**: 使用智能指针和 RAII
- **容器选择**: 根据使用场景选择合适的容器

## 6. 代码示例

### 6.1 类与对象的综合使用

```cpp
 #include <iostream>
 #include <string>
 #include <vector>
 class Student {
 private:
  std::string name;
  int id;
  double gpa;
 public:
  // 构造函数
  Student(std::string n, int i, double g) : name(n), id(i), gpa(g) {}
  // 成员方法
  std::string getName() const { return name; }
  int getId() const { return id; }
  double getGpa() const { return gpa; }
  void setGpa(double g) {
  if (g >= 0.0 && g <= 4.0) {
  gpa = g;
  }
  }
  void display() const {
  std::cout << "Name: " << name << ", ID: " << id << ", GPA: " << gpa << std::endl;
  }
 True};
 class Course {
 private:
  std::string name;
  std::vector<Student> students;
 public:
  Course(std::string n) : name(n) {}
  void addStudent(const Student& student) {
  students.push_back(student);
  }
  void displayStudents() const {
  std::cout << "Course: " << name << std::endl;
  std::cout << "Students:" << std::endl;
  for (const auto& student : students) {
  student.display();
  }
  }
  double getAverageGpa() const {
  if (students.empty()) return 0.0;
  double total = 0.0;
  for (const auto& student : students) {
  total += student.getGpa();
  }
  return total / students.size();
  }
 True};
 int main() {
  // 创建学生
  Student s1("Alice", 101, 3.8);
  Student s2("Bob", 102, 3.5);
  Student s3("Charlie", 103, 4.0);
  // 创建课程
  Course math("Mathematics");
  math.addStudent(s1);
  math.addStudent(s2);
  math.addStudent(s3);
  // 显示学生信息
  math.displayStudents();
  // 计算平均GPA
  std::cout << "Average GPA: " << math.getAverageGpa() << std::endl;
  return 0;
 True}
```

### 6.2 继承与多态

```cpp
 #include <iostream>
 #include <string>
 // 基类
 class Employee {
 private:
  std::string name;
  int id;
 protected:
  double salary;
 public:
  Employee(std::string n, int i, double s) : name(n), id(i), salary(s) {}
  virtual ~Employee() {}
  // 虚函数
  virtual double calculateBonus() const {
  return salary * 0.1; // 默认奖金 10%
  }
  virtual void display() const {
  std::cout << "Name: " << name << ", ID: " << id << ", Salary: $" << salary << std::endl;
  }
 True};
 // 派生类：经理
 class Manager : public Employee {
 private:
  double bonusPercentage;
 public:
  Manager(std::string n, int i, double s, double bp) :
  Employee(n, i, s), bonusPercentage(bp) {}
  double calculateBonus() const override {
  return salary * (bonusPercentage / 100);
  }
  void display() const override {
  Employee::display();
  std::cout << "Position: Manager, Bonus: $" << calculateBonus() << std::endl;
  }
 True};
 // 派生类：工程师
 class Engineer : public Employee {
 private:
  std::string specialization;
 public:
  Engineer(std::string n, int i, double s, std::string spec) :
  Employee(n, i, s), specialization(spec) {}
  double calculateBonus() const override {
  return salary * 0.15; // 工程师奖金 15%
  }
  void display() const override {
  Employee::display();
  std::cout << "Position: Engineer, Specialization: " << specialization << ", Bonus: $" << calculateBonus() << std::endl;
  }
 True};
 // 使用多态
 void printEmployeeInfo(const Employee& emp) {
  emp.display();
  std::cout << "------------------------" << std::endl;
 True}
 int main() {
  Manager m("John", 101, 80000, 15); // 15% 奖金
  Engineer e("Alice", 102, 60000, "Software");
  std::cout << "Employee Information:" << std::endl;
  std::cout << "------------------------" << std::endl;
  printEmployeeInfo(m);
  printEmployeeInfo(e);
  return 0;
 True}
```

### 6.3 模板与STL

```cpp
 #include <iostream>
 #include <vector>
 #include <algorithm>
 #include <string>
 // 函数模板：打印容器
  template <typename Container>
 void printContainer(const Container& container, const std::string& name) {
  std::cout << name << ": ";
  for (const auto& item : container) {
  std::cout << item << " ";
  }
  std::cout << std::endl;
 True}
 // 类模板：简单的包装器
 template <typename T>
 class Wrapper {
 private:
  T value;
 public:
  Wrapper(T v) : value(v) {}
  T get() const { return value; }
  void set(T v) { value = v; }
  void display() const {
  std::cout << "Value: " << value << std::endl;
  }
 True};
 int main() {
  // 使用 STL 容器
  std::vector<int> numbers = {5, 2, 8, 1, 9};
  printContainer(numbers, "Original vector");
  // 排序
  std::sort(numbers.begin(), numbers.end());
  printContainer(numbers, "Sorted vector");
  // 使用类模板
  Wrapper<int> intWrapper(42);
  Wrapper<std::string> stringWrapper("Hello, Templates!");
  intWrapper.display();
  stringWrapper.display();
  return 0;
 True}
```

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_104 拆分，专注于面向对象进阶（构造/析构、操作符重载、模板、STL 概览、最佳实践）。
