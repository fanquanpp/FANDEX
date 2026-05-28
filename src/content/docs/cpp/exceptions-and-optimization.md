---
order: 120
tags:
  - 'cpp'
  - 'performance'
difficulty: 'advanced'
title: 'C++ 异常处理与性能优化'
module: 'cpp'
category: 'C++ Basics'
description: '异常机制、错误处理策略、性能分析与优化技巧。'
author: 'Anonymous'
---

## 目录

1. [异常处理](#异常处理)
2. [性能优化](#性能优化)
3. [性能分析与调试工具](#性能分析与调试工具)
4. [性能优化最佳实践](#性能优化最佳实践)
5. [代码示例](#代码示例)

---

## 1. 异常处理 (Exceptions)

异常是 C++ 中处理错误的一种机制，允许程序在遇到错误时跳转到相应的处理代码。

### 1.1 基本异常处理

使用 `try-catch` 块捕获和处理异常。

```cpp
 #include <iostream>
 #include <stdexcept>
 int main() {
  try {
  // 可能抛出异常的代码
  int divisor = 0;
  if (divisor == 0) {
  throw std::runtime_error("Division by zero");
  }
  int result = 10 / divisor;
  } catch (const std::exception& e) {
  // 异常处理代码
  std::cerr << "Exception caught: " << e.what() << std::endl;
  }
  return 0;
 True}
```

### 1.2 异常类型

C++ 标准库提供了多种异常类型，位于 `<stdexcept>` 头文件中。
| 异常类型 | 描述 | 示例 |
| :--- | :--- | :--- |
| `std::exception` | 所有标准异常的基类 | 基类，通常不直接使用 |
| `std::runtime_error` | 运行时错误 | `throw std::runtime_error("Runtime error");` |
| `std::logic_error` | 逻辑错误 | `throw std::logic_error("Logic error");` |
| `std::bad_alloc` | 内存分配失败 | 由 `new` 操作符抛出 |
| `std::out_of_range` | 越界访问 | `throw std::out_of_range("Out of range");` |
| `std::invalid_argument` | 无效参数 | `throw std::invalid_argument("Invalid argument");` |

### 1.3 自定义异常

可以通过继承 `std::exception` 或其子类来创建自定义异常。

```cpp
 #include <iostream>
 #include <stdexcept>
 class MyException : public std::exception {
 private:
  std::string message;
 public:
  explicit MyException(const std::string& msg) : message(msg) {}
  const char* what() const noexcept override {
  return message.c_str();
  }
 True};
 void function_that_throws() {
  throw MyException("Custom exception occurred");
 True}
 int main() {
  try {
  function_that_throws();
  } catch (const MyException& e) {
  std::cerr << "Custom exception caught: " << e.what() << std::endl;
  } catch (const std::exception& e) {
  std::cerr << "Standard exception caught: " << e.what() << std::endl;
  }
  return 0;
 True}
```

### 1.4 异常处理最佳实践

- **只在特殊情况下使用异常**: 异常用于处理意外情况，而不是常规控制流。
- **捕获具体异常类型**: 优先捕获具体的异常类型，而不是通用的 `std::exception`。
- **保持异常处理代码简洁**: 异常处理代码应该简洁明了，只处理必要的逻辑。
- **析构函数不抛异常**: 析构函数抛出异常会导致程序终止。
- **使用 RAII 管理资源**: 利用 RAII 机制确保资源在异常发生时正确释放。
- **异常规范 (C++11 前)**: 使用 `throw()` 或 `throw(type)` 声明函数可能抛出的异常类型（C++11 后推荐使用 `noexcept`）。

### 1.5 noexcept 说明符 (C++11)

`noexcept` 说明符用于声明函数不会抛出异常，帮助编译器优化。

```cpp
 // 声明函数不会抛出异常
 void function_noexcept() noexcept {
  // 函数体
 True}
 // 条件 noexcept
 void function_conditionally_noexcept() noexcept(noexcept(expression)) {
  // 函数体
 True}
 // 检查函数是否会抛出异常
 template <typename T>
 void check_noexcept() {
  static_assert(noexcept(std::declval<T>().some_method()),
  "some_method() must be noexcept");
 True}
```

### 1.6 异常与构造函数/析构函数

- **构造函数**: 可以抛出异常，但需要确保已分配的资源被正确释放。
- **析构函数**: 严禁抛出异常，否则会导致程序终止。

```cpp
 class Resource {
 private:
  int* data;
 public:
  Resource(int size) {
  data = new int[size];
  // 如果分配失败，new 会抛出 std::bad_alloc
  }
  ~Resource() noexcept { // 析构函数应标记为 noexcept
  delete[] data;
  // 析构函数中不应抛出异常
  }
 True};
```

## 2. 性能优化 (Performance)

性能优化是 C++ 编程中的重要环节，涉及代码设计、编译器优化、内存管理等多个方面。

### 2.1 代码级优化

#### 2.1.1 内联函数

内联函数可以减少函数调用开销，适用于短小频繁调用的函数。

```cpp
 // 内联函数声明
 inline int max(int a, int b) {
  return a > b ? a : b;
 True}
 // 类内定义的成员函数默认内联
 class MyClass {
 public:
  int getValue() const { // 默认内联
  return value;
  }
 private:
  int value;
 True};
```

#### 2.1.2 常量优化

使用 `const` 可以帮助编译器进行优化，同时提高代码安全性。

```cpp
 // 常量引用参数，避免拷贝
 void printValue(const std::string& str) {
  std::cout << str << std::endl;
 True}
 // 常量成员函数，保证不修改对象状态
 class MyClass {
 public:
  int getValue() const { // 常量成员函数
  return value;
  }
 private:
  int value;
 True};
 // 编译期常量
 constexpr int square(int x) {
  return x * x;
 True}
 constexpr int SQUARE_OF_5 = square(5); // 编译期计算
```

#### 2.1.3 移动语义 (C++11)

移动语义可以避免昂贵的深拷贝，提高性能。

```cpp
 #include <iostream>
 #include <vector>
 #include <string>
 class MyClass {
 private:
  std::string data;
 public:
  // 构造函数
  MyClass(const std::string& d) : data(d) {
  std::cout << "Copy constructor called" << std::endl;
  }
  // 移动构造函数
  MyClass(std::string&& d) : data(std::move(d)) {
  std::cout << "Move constructor called" << std::endl;
  }
  // 移动赋值运算符
  MyClass& operator=(std::string&& d) {
  data = std::move(d);
  std::cout << "Move assignment called" << std::endl;
  return *this;
  }
 True};
 int main() {
  // 使用移动语义
  MyClass obj1("Hello"); // 拷贝构造
  MyClass obj2(std::move(std::string("World"))); // 移动构造
  std::string s = "Test";
  MyClass obj3(std::move(s)); // 移动构造，s 现在为空
  return 0;
 True}
```

#### 2.1.4 避免不必要的拷贝

使用引用、指针或移动语义避免不必要的拷贝操作。

```cpp
 // 不好的做法：拷贝参数
 std::vector<int> process_vector(std::vector<int> v) {
  // 处理 v
  return v; // 返回时再次拷贝
 True}
 // 好的做法：使用引用
 void process_vector(const std::vector<int>& v) {
  // 处理 v（只读）
 True}
 // 好的做法：使用移动语义
 std::vector<int> create_vector() {
  std::vector<int> v = {1, 2, 3, 4, 5};
  return v; // 编译器会进行返回值优化 (RVO)
 True}
```

#### 2.1.5 预分配内存

对于容器，预先分配内存可以减少动态内存分配的次数。

```cpp
 std::vector<int> v;
 v.reserve(1000); // 预先分配 1000 个元素的空间
 for (int i = 0; i < 1000; i++) {
  v.push_back(i); // 不需要频繁重新分配内存
 True}
```

### 2.2 编译器优化

#### 2.2.1 优化级别

不同的编译器优化级别会对代码性能产生显著影响。
| 优化级别 | 描述 | 适用场景 |
| :--- | :--- | :--- |
| `-O0` | 无优化 | 调试阶段 |
| `-O1` | 基本优化 | 平衡调试和性能 |
| `-O2` | 更高级别优化 | 生产环境 |
| `-O3` | 最高级别优化 | 对性能要求高的场景 |
| `-Os` | 优化代码大小 | 内存受限环境 |

#### 2.2.2 编译器特定优化

不同编译器有特定的优化选项。

- **GCC**: `-march=native` (使用本地 CPU 架构), `-ffast-math` (快速数学运算)
- **Clang**: `-Weverything` (开启所有警告), `-fsanitize=address` (地址 sanitizer)
- **MSVC**: `/O2` (优化速度), `/Oi` (内联函数)

### 2.3 内存管理优化

#### 2.3.1 智能指针

使用智能指针管理内存，避免内存泄漏。

```cpp
 #include <memory>
 // 推荐使用 make_unique 和 make_shared
 std::unique_ptr<int> up = std::make_unique<int>(42);
 std::shared_ptr<int> sp = std::make_shared<int>(100);
 // 避免循环引用
 class A {
 public:
  std::weak_ptr<B> b; // 使用 weak_ptr 打破循环
 True};
 class B {
 public:
  std::shared_ptr<A> a;
 True};
```

#### 2.3.2 内存池

对于频繁分配和释放小对象的场景，使用内存池可以提高性能。

```cpp
 // 简单的内存池实现
 class MemoryPool {
 private:
  std::vector<void*> blocks;
  size_t blockSize;
  size_t currentBlockIndex;
  size_t currentPosition;
 public:
  MemoryPool(size_t blockSize, size_t initialBlocks = 10)
  : blockSize(blockSize), currentBlockIndex(0), currentPosition(0) {
  for (size_t i = 0; i < initialBlocks; i++) {
  blocks.push_back(std::malloc(blockSize));
  }
  }
  ~MemoryPool() {
  for (void* block : blocks) {
  std::free(block);
  }
  }
  void* allocate() {
  if (currentBlockIndex >= blocks.size() || currentPosition >= blockSize) {
  blocks.push_back(std::malloc(blockSize));
  currentBlockIndex = blocks.size() - 1;
  currentPosition = 0;
  }
  void* result = static_cast<char*>(blocks[currentBlockIndex]) + currentPosition;
  currentPosition += sizeof(int); // 假设分配 int 大小的内存
  return result;
  }
  void deallocate(void* ptr) {
  // 简单实现，不做实际释放
  }
 True};
```

### 2.4 算法与数据结构优化

选择合适的算法和数据结构对性能至关重要。
| 场景 | 推荐数据结构 | 时间复杂度 |
| :--- | :--- | :--- |
| 随机访问 | `std::vector` | O(1) |
| 频繁插入/删除 | `std::list` | O(1) |
| 查找操作 | `std::unordered_map` | O(1) 平均 |
| 有序集合 | `std::set` | O(log n) |
| 优先级队列 | `std::priority_queue` | O(log n) |

### 2.5 并行计算

利用多核处理器进行并行计算可以显著提高性能。

#### 2.5.1 标准库并行算法 (C++17)

```cpp
 #include <algorithm>
 #include <execution>
 #include <vector>
 int main() {
  std::vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6};
  // 并行排序
  std::sort(std::execution::par, v.begin(), v.end());
  // 并行变换
  std::transform(std::execution::par, v.begin(), v.end(), v.begin(),
  [](int x) { return x * 2; });
  return 0;
 True}
```

#### 2.5.2 线程库 (C++11)

```cpp
 #include <thread>
 #include <vector>
 #include <iostream>
 void process_chunk(const std::vector<int>& data, size_t start, size_t end) {
  for (size_t i = start; i < end; i++) {
  // 处理数据
  std::cout << data[i] << " ";
  }
 True}
 int main() {
  std::vector<int> data(1000);
  for (int i = 0; i < 1000; i++) {
  data[i] = i;
  }
  // 创建线程
  std::vector<std::thread> threads;
  size_t chunk_size = data.size() / 4;
  for (size_t i = 0; i < 4; i++) {
  size_t start = i * chunk_size;
  size_t end = (i == 3) ? data.size() : (i + 1) * chunk_size;
  threads.emplace_back(process_chunk, std::ref(data), start, end);
  }
  // 等待所有线程完成
  for (auto& t : threads) {
  t.join();
  }
  return 0;
 True}
```

## 3. 性能分析与调试工具

### 3.1 性能分析工具

#### 3.1.1 Google Benchmark

Google Benchmark 是一个用于基准测试的框架，可以测量代码的执行性能。

```cpp
 #include <benchmark/benchmark.h>
 static void BM_Square(benchmark::State& state) {
  for (auto _ : state) {
  int result = 0;
  for (int i = 0; i < 1000; i++) {
  result += i * i;
  }
  benchmark::DoNotOptimize(result);
  }
 True}
 BENCHMARK(BM_Square);
 BENCHMARK_MAIN();
```

#### 3.1.2 gprof

`gprof` 是 GCC 提供的性能分析工具，可以分析函数调用次数和执行时间。

```bash
 # 编译时添加 -pg 选项
 g++ -pg -O2 program.cpp -o program
 # 运行程序，生成 gmon.out 文件
 ./program
 # 分析结果
 gprof program gmon.out > analysis.txt
```

#### 3.1.3 perf

`perf` 是 Linux 系统下的性能分析工具，可以分析 CPU 使用率、缓存命中率等。

```bash
 # 记录性能数据
 perf record ./program
 # 查看分析结果
 perf report
 # 查看热点函数
 perf top -p <pid>
```

### 3.2 内存分析工具

#### 3.2.1 Valgrind

Valgrind 是一个内存调试和内存泄漏检测工具。

```bash
 # 检测内存泄漏
 valgrind --leak-check=full ./program
 # 检测内存访问错误
 valgrind --tool=memcheck ./program
 # 检测缓存使用情况
 valgrind --tool=cachegrind ./program
```

#### 3.2.2 AddressSanitizer

AddressSanitizer (ASan) 是一个内存错误检测工具，集成在 GCC 和 Clang 中。

```bash
 # 编译时添加 -fsanitize=address 选项
 g++ -fsanitize=address -g program.cpp -o program
 # 运行程序
 ./program
```

### 3.3 调试工具

#### 3.3.1 GDB

GDB 是一个强大的命令行调试器。

```bash
 # 编译时添加 -g 选项
 g++ -g program.cpp -o program
 # 启动 GDB
 gdb ./program
 # 常用命令
 # break main # 在 main 函数处设置断点
 # run # 运行程序
 # print variable # 打印变量值
 # step # 单步执行
 # continue # 继续执行
 # backtrace # 查看调用栈
```

#### 3.3.2 LLDB

LLDB 是 LLVM 项目的调试器，功能类似于 GDB。

```bash
 # 编译时添加 -g 选项
 clang++ -g program.cpp -o program
 # 启动 LLDB
 lldb ./program
 # 常用命令
 # breakpoint set --name main # 在 main 函数处设置断点
 # run # 运行程序
 # print variable # 打印变量值
 # step # 单步执行
 # continue # 继续执行
 # thread backtrace # 查看调用栈
```

#### 3.3.3 可视化调试器

- **Visual Studio**: Windows 平台的集成开发环境，提供强大的可视化调试功能。
- **CLion**: JetBrains 开发的跨平台 IDE，集成了 GDB/LLDB 调试器。
- **VS Code**: 轻量级编辑器，通过插件支持调试功能。

## 4. 性能优化最佳实践

### 4.1 分析先行

- **使用性能分析工具**：在优化前，先使用性能分析工具找出性能瓶颈。
- **建立基准测试**：创建基准测试用例，用于评估优化效果。
- **测量而不是猜测**：基于实际测量结果进行优化，而不是凭感觉。

### 4.2 代码优化

- **优先优化热点代码**：重点优化执行频率高的代码。
- **避免过早优化**：先确保代码正确，再进行优化。
- **保持代码可读性**：优化不应以牺牲代码可读性为代价。
- **使用适当的数据结构**：根据具体场景选择合适的数据结构。
- **减少内存分配**：避免频繁的动态内存分配和释放。

### 4.3 编译优化

- **选择合适的优化级别**：根据实际需求选择适当的编译器优化级别。
- **启用架构特定优化**：使用 `-march=native` 等选项利用 CPU 特性。
- **使用链接时优化**：启用 `-flto` (Link Time Optimization) 进行全局优化。

### 4.4 内存管理

- **使用智能指针**：避免内存泄漏和悬空指针。
- **合理使用内存池**：对于频繁分配的小对象，使用内存池提高性能。
- **注意内存对齐**：合理安排数据结构，提高缓存命中率。

### 4.5 并行计算

- **利用多线程**：对于计算密集型任务，使用多线程并行处理。
- **避免线程竞争**：使用互斥锁、原子操作等同步机制避免线程竞争。
- **使用标准库并行算法**：优先使用 C++17 提供的并行算法。

## 5. 代码示例

### 5.1 异常处理示例

```cpp
 #include <iostream>
 #include <stdexcept>
 #include <string>
 // 自定义异常类
 class FileException : public std::runtime_error {
 public:
  explicit FileException(const std::string& message)
  : std::runtime_error(message) {}
 True};
 // 文件操作类
 class FileHandler {
 private:
  std::string filename;
 public:
  FileHandler(const std::string& name) : filename(name) {
  // 模拟文件打开失败
  if (name.empty()) {
  throw FileException("Empty filename");
  }
  std::cout << "File " << name << " opened" << std::endl;
  }
  ~FileHandler() noexcept {
  // 析构函数不应抛出异常
  std::cout << "File " << filename << " closed" << std::endl;
  }
  void read() {
  // 模拟读取失败
  if (filename == "error.txt") {
  throw FileException("Failed to read file");
  }
  std::cout << "Reading from file " << filename << std::endl;
  }
 True};
 int main() {
  try {
  // 测试正常情况
  FileHandler file1("data.txt");
  file1.read();
  // 测试异常情况
  FileHandler file2("");
  } catch (const FileException& e) {
  std::cerr << "File exception: " << e.what() << std::endl;
  } catch (const std::exception& e) {
  std::cerr << "Standard exception: " << e.what() << std::endl;
  } catch (...) {
  std::cerr << "Unknown exception" << std::endl;
  }
  try {
  FileHandler file3("error.txt");
  file3.read();
  } catch (const FileException& e) {
  std::cerr << "File exception: " << e.what() << std::endl;
  }
  return 0;
 True}
```

### 5.2 性能优化示例

```cpp
 #include <iostream>
 #include <vector>
 #include <chrono>
 #include <algorithm>
 #include <execution>
 // 测量函数执行时间的模板函数
 template <typename Func>
 double measure_time(Func&& func) {
  auto start = std::chrono::high_resolution_clock::now();
  func();
  auto end = std::chrono::high_resolution_clock::now();
  return std::chrono::duration<double, std::milli>(end - start).count();
 True}
 // 普通排序
 void regular_sort(std::vector<int>& v) {
  std::sort(v.begin(), v.end());
 True}
 // 并行排序
 void parallel_sort(std::vector<int>& v) {
  std::sort(std::execution::par, v.begin(), v.end());
 True}
 // 不使用 reserve
 void without_reserve() {
  std::vector<int> v;
  for (int i = 0; i < 1000000; i++) {
  v.push_back(i);
  }
 True}
 // 使用 reserve
 void with_reserve() {
  std::vector<int> v;
  v.reserve(1000000);
  for (int i = 0; i < 1000000; i++) {
  v.push_back(i);
  }
 True}
 int main() {
  // 测试排序性能
  std::vector<int> v1(1000000);
  std::generate(v1.begin(), v1.end(), []() { return rand(); });
  std::vector<int> v2 = v1;
  double time_regular = measure_time([&]() { regular_sort(v1); });
  double time_parallel = measure_time([&]() { parallel_sort(v2); });
  std::cout << "Regular sort: " << time_regular << " ms" << std::endl;
  std::cout << "Parallel sort: " << time_parallel << " ms" << std::endl;
  std::cout << "Speedup: " << time_regular / time_parallel << "x" << std::endl;
  // 测试 reserve 性能
  double time_without_reserve = measure_time(without_reserve);
  double time_with_reserve = measure_time(with_reserve);
  std::cout << "Without reserve: " << time_without_reserve << " ms" << std::endl;
  std::cout << "With reserve: " << time_with_reserve << " ms" << std::endl;
  std::cout << "Speedup: " << time_without_reserve / time_with_reserve << "x" << std::endl;
  return 0;
 True}
```

### 5.3 内存管理示例

```cpp
 #include <iostream>
 #include <memory>
 #include <vector>
 // 自定义删除器
 struct CustomDeleter {
  void operator()(int* p) {
  std::cout << "Custom deleter called" << std::endl;
  delete p;
  }
 True};
 int main() {
  // 智能指针示例
  std::cout << "=== Unique_ptr ===" << std::endl;
  {
  std::unique_ptr<int> up1(new int(42));
  std::cout << "up1 value: " << *up1 << std::endl;
  // 转移所有权
  std::unique_ptr<int> up2 = std::move(up1);
  if (!up1) {
  std::cout << "up1 is null" << std::endl;
  }
  std::cout << "up2 value: " << *up2 << std::endl;
  } // up2 超出作用域，自动释放
  std::cout << "\n=== Shared_ptr ===" << std::endl;
  {
  std::shared_ptr<int> sp1 = std::make_shared<int>(100);
  std::cout << "sp1 use count: " << sp1.use_count() << std::endl;
  {
  std::shared_ptr<int> sp2 = sp1;
  std::cout << "After sp2 creation, use count: " << sp1.use_count() << std::endl;
  } // sp2 超出作用域，引用计数减 1
  std::cout << "After sp2 destruction, use count: " << sp1.use_count() << std::endl;
  } // sp1 超出作用域，引用计数为 0，自动释放
  std::cout << "\n=== Weak_ptr ===" << std::endl;
  {
  std::shared_ptr<int> sp = std::make_shared<int>(200);
  std::weak_ptr<int> wp = sp;
  std::cout << "sp use count: " << sp.use_count() << std::endl;
  std::cout << "wp expired: " << wp.expired() << std::endl;
  if (auto locked = wp.lock()) {
  std::cout << "Locked value: " << *locked << std::endl;
  std::cout << "Locked use count: " << locked.use_count() << std::endl;
  }
  sp.reset(); // 释放 shared_ptr
  std::cout << "After sp.reset(), wp expired: " << wp.expired() << std::endl;
  if (auto locked = wp.lock()) {
  std::cout << "Locked value: " << *locked << std::endl;
  } else {
  std::cout << "wp is expired, cannot lock" << std::endl;
  }
  }
  std::cout << "\n=== Custom deleter ===" << std::endl;
  {
  std::unique_ptr<int, CustomDeleter> up(new int(300));
  std::cout << "up value: " << *up << std::endl;
  } // 自动调用自定义删除器
  return 0;
 True}
```

---

### 更新日志 (Changelog)

- 2026-04-05: 整合 C++ 异常处理与基础优化技巧。
- 2026-04-05: 扩写内容，增加详细的异常处理机制、性能优化技术、调试工具、最佳实践和代码示例等内容。
