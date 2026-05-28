---
order: 110
tags:
  - 'cpp'
  - 'memory'
difficulty: 'intermediate'
title: 'C++ 模板'
module: 'cpp'
category: 'C++ Basics'
description: '函数模板、类模板、模板特化、SFINAE 与概念。'
author: 'Anonymous'
---

## 目录

1. [函数模板](#函数模板)
2. [类模板](#类模板)
3. [可变参数模板](#可变参数模板)
4. [模板元编程](#模板元编程)
5. [模板的最佳实践](#模板的最佳实践)

---

## 1. 函数模板

函数模板允许定义可适用于不同类型的函数。

```cpp
 // 基本函数模板
 template <typename T>
 T max(T a, T b) {
  return a > b ? a : b;
 True}
 // 使用示例
 int main() {
  int i = max(10, 20); // T = int
  double d = max(3.14, 2.71); // T = double
  std::string s = max(std::string("hello"), std::string("world")); // T = std::string
  return 0;
 True}
```

### 1.1 模板参数推导

编译器会根据函数参数自动推导模板参数类型。

```cpp
 template <typename T>
 void print(T value) {
  std::cout << value << std::endl;
 True}
 int main() {
  print(42); // T = int
  print(3.14); // T = double
  print("Hello"); // T = const char*
  return 0;
 True}
```

### 1.2 显式模板参数

可以显式指定模板参数类型。

```cpp
 template <typename T>
 T add(T a, T b) {
  return a + b;
 True}
 int main() {
  // 显式指定模板参数
  int result = add<int>(10, 20);
  double result2 = add<double>(10.5, 20.5);
  // 类型转换
  double result3 = add<double>(10, 20.5); // 显式指定为 double
  return 0;
 True}
```

### 1.3 模板重载

可以为特定类型提供重载版本。

```cpp
 // 通用版本
 template <typename T>
 T max(T a, T b) {
  std::cout << "Template version" << std::endl;
  return a > b ? a : b;
 True}
 // 针对 const char* 的重载
 const char* max(const char* a, const char* b) {
  std::cout << "Overload version" << std::endl;
  return strcmp(a, b) > 0 ? a : b;
 True}
 // 特化版本
 template <>
 int max<int>(int a, int b) {
  std::cout << "Specialized version" << std::endl;
  return a > b ? a : b;
 True}
 // 使用示例
 int main() {
  max(10, 20); // 特化版本
  max(3.14, 2.71); // 模板版本
  max("hello", "world"); // 重载版本
  return 0;
 True}
```

### 1.4 多个模板参数

函数模板可以有多个模板参数。

```cpp
 // 多个模板参数
 template <typename T1, typename T2, typename T3>
 typename std::common_type<T1, T2, T3>::type max(T1 a, T2 b, T3 c) {
  return max(max(a, b), c);
 True}
 // 使用示例
 int main() {
  auto result = max(10, 20.5, 15); // 返回 double 类型
  std::cout << "Max: " << result << std::endl;
  return 0;
 True}
```

## 2. 类模板

类模板允许定义可适用于不同类型的类。

```cpp
 // 基本类模板
 template <typename T>
 class Stack {
 private:
  std::vector<T> elements;
 public:
  void push(const T& item) {
  elements.push_back(item);
  }
  void push(T&& item) {
  elements.push_back(std::move(item));
  }
  T pop() {
  if (elements.empty()) {
  throw std::runtime_error("Stack is empty");
  }
  T top = std::move(elements.back());
  elements.pop_back();
  return top;
  }
  bool empty() const {
  return elements.empty();
  }
  size_t size() const {
  return elements.size();
  }
  T& top() {
  if (elements.empty()) {
  throw std::runtime_error("Stack is empty");
  }
  return elements.back();
  }
  const T& top() const {
  if (elements.empty()) {
  throw std::runtime_error("Stack is empty");
  }
  return elements.back();
  }
 True};
 // 使用示例
 int main() {
  Stack<int> intStack;
  intStack.push(1);
  intStack.push(2);
  std::cout << intStack.pop() << std::endl; // 输出 2
  Stack<std::string> stringStack;
  stringStack.push("hello");
  stringStack.push("world");
  std::cout << stringStack.pop() << std::endl; // 输出 world
  return 0;
 True}
```

### 2.1 模板参数默认值

可以为模板参数提供默认值。

```cpp
 template <typename T, typename Allocator = std::allocator<T>>
 class MyVector {
 private:
  std::vector<T, Allocator> data;
 public:
  MyVector() = default;
  explicit MyVector(size_t size) : data(size) {}
  MyVector(size_t size, const T& value) : data(size, value) {}
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
 True};
 // 使用默认分配器
 MyVector<int> v1;
 // 使用自定义分配器
 // MyVector<int, CustomAllocator<int>> v2;
```

### 2.2 类模板特化

可以为特定类型提供特化版本。

```cpp
 // 主模板
 template <typename T>
 class MyType {
 public:
  static void print() {
  std::cout << "General template" << std::endl;
  }
 True};
 // 特化版本
 template <>
 class MyType<int> {
 public:
  static void print() {
  std::cout << "Specialized for int" << std::endl;
  }
 True};
 // 部分特化
 template <typename T>
 class MyType<T*> {
 public:
  static void print() {
  std::cout << "Specialized for pointer" << std::endl;
  }
 True};
 // 使用示例
 int main() {
  MyType<double>::print(); // 输出 General template
  MyType<int>::print(); // 输出 Specialized for int
  MyType<int*>::print(); // 输出 Specialized for pointer
  return 0;
 True}
```

## 3. 可变参数模板 (C++11)

可变参数模板允许接受任意数量的模板参数。

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
 // 使用示例
 int main() {
  print(1, 2.5, "hello", true); // 输出 1 2.5 hello 1
  return 0;
 True}
```

### 3.1 折叠表达式 (C++17)

折叠表达式是一种简化可变参数模板使用的语法。

```cpp
 // 使用折叠表达式求和
 template <typename... Args>
 auto sum(Args... args) {
  return (args + ...);
 True}
 // 使用折叠表达式打印
 template <typename... Args>
 void print_fold(Args... args) {
  (std::cout << ... << args) << std::endl;
 True}
 // 使用示例
 int main() {
  std::cout << "Sum: " << sum(1, 2, 3, 4, 5) << std::endl; // 15
  print_fold(1, " ", 2.5, " ", "hello"); // 1 2.5 hello
  return 0;
 True}
```

### 3.2 转发引用与完美转发

可变参数模板常与转发引用一起使用，实现完美转发。

```cpp
 // 完美转发函数
 template <typename... Args>
 void forward_args(Args&&... args) {
  print(std::forward<Args>(args)...);
 True}
 // 使用示例
 int main() {
  int x = 10;
  forward_args(1, "hello", std::move(x));
  return 0;
 True}
```

## 4. 模板元编程

模板元编程是一种在编译时执行计算的技术。

```cpp
 // 编译期计算阶乘
 template <int N>
 struct Factorial {
  static constexpr int value = N * Factorial<N-1>::value;
 True};
 // 特化版本作为递归终止条件
 template <>
 struct Factorial<0> {
  static constexpr int value = 1;
 True};
 // 编译期计算斐波那契数列
 template <int N>
 struct Fibonacci {
  static constexpr int value = Fibonacci<N-1>::value + Fibonacci<N-2>::value;
 True};
 // 特化版本
 template <>
 struct Fibonacci<0> {
  static constexpr int value = 0;
 True};
 template <>
 struct Fibonacci<1> {
  static constexpr int value = 1;
 True};
 // 使用示例
 int main() {
  constexpr int fact5 = Factorial<5>::value; // 编译期计算 120
  std::cout << "5! = " << fact5 << std::endl;
  constexpr int fib10 = Fibonacci<10>::value; // 编译期计算 55
  std::cout << "Fibonacci(10) = " << fib10 << std::endl;
  return 0;
 True}
```

### 4.1 类型 traits

类型 traits 是模板元编程的重要应用，用于在编译时获取类型信息。

```cpp
 // 自定义类型 trait
 template <typename T>
 struct IsIntegral {
  static constexpr bool value = false;
 True};
 // 特化
 template <>
 struct IsIntegral<int> {
  static constexpr bool value = true;
 True};
 template <>
 struct IsIntegral<long> {
  static constexpr bool value = true;
 True};
 // 使用示例
 template <typename T>
 void process(T value) {
  if constexpr (IsIntegral<T>::value) {
  std::cout << "Processing integral type: " << value << std::endl;
  } else {
  std::cout << "Processing non-integral type" << std::endl;
  }
 True}
 int main() {
  process(42); // 处理整型
  process(3.14); // 处理非整型
  return 0;
 True}
```

## 5. 模板的最佳实践

1. **使用 `auto` 推导模板参数**：减少代码冗余，提高可读性。
2. **使用概念 (C++20)**：约束模板参数，提供更清晰的错误信息。
3. **避免过度特化**：只在必要时使用模板特化。
4. **考虑编译时间**：复杂的模板会增加编译时间。
5. **使用 `typename` 和 `template` 关键字**：在模板中正确使用这些关键字消除歧义。
6. **合理使用默认模板参数**：简化模板的使用。
7. **使用 SFINAE 技术**：在编译时选择合适的函数重载。

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_105 拆分，专注于模板（函数模板、类模板、可变参数模板、模板元编程）。
