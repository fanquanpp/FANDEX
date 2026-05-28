---
order: 80
tags:
  - 'cpp'
  - 'memory'
  - 'data-structure'
difficulty: 'advanced'
title: 'C++ 内存管理'
module: 'cpp'
category: 'C++ Basics'
description: '栈与堆、RAII、智能指针、内存池与自定义分配器。'
author: 'Anonymous'
---

## 目录

1. [内存管理](#内存管理)
2. [RAII 模式](#raii-模式)
3. [智能指针](#智能指针)
4. [内存管理最佳实践](#内存管理最佳实践)
5. [高级内存管理](#高级内存管理)
6. [总结](#总结)
7. [代码示例](#代码示例)

---

## 1. 内存管理 (Memory Management)

### 1.1 内存布局

C++ 程序的内存空间通常分为以下几个区域：
| 内存区域 | 描述 | 管理方式 |
| :--- | :--- | :--- |
| **代码区 (Code Segment)** | 存储程序的可执行指令 | 由操作系统管理 |
| **全局/静态区 (Data Segment)** | 存储全局变量和静态变量 | 程序启动时分配，结束时释放 |
| **常量区 (Constant Segment)** | 存储常量 | 程序启动时分配，结束时释放 |
| **栈 (Stack)** | 存储局部变量和函数调用信息 | 自动管理，后进先出 |
| **堆 (Heap)** | 存储动态分配的内存 | 手动管理，需要显式分配和释放 |

### 1.2 栈内存

- **特点**: 自动管理，速度快，空间有限
- **分配方式**: 编译时确定
- **生命周期**: 作用域结束时自动释放

```cpp
 void func() {
  int x = 10; // 栈内存分配
  int arr[10]; // 栈内存分配
 True} // x 和 arr 在这里自动释放
```

### 1.3 堆内存

- **特点**: 手动管理，空间大，速度较慢
- **分配方式**: 运行时动态分配
- **生命周期**: 直到显式释放

#### 1.3.1 动态内存分配

```cpp
 // 分配单个对象
 int* p = new int(10); // 分配一个整数，初始化为 10
 // 分配数组
 int* arr = new int[5]; // 分配 5 个整数的数组
 // 释放内存
 delete p; // 释放单个对象
 delete[] arr; // 释放数组（必须使用 []）
```

#### 1.3.2 内存泄漏

当动态分配的内存没有被释放时，就会发生内存泄漏。

```cpp
 void leak() {
  int* p = new int(10);
  // 没有 delete p; 导致内存泄漏
 True}
 int main() {
  for (int i = 0; i < 1000000; i++) {
  leak(); // 每次调用都会泄漏 4 字节内存
  }
  return 0;
 True}
```

#### 1.3.3 常见内存问题

| 问题           | 描述                       | 后果                                 |
| :------------- | :------------------------- | :----------------------------------- |
| **内存泄漏**   | 未释放动态分配的内存       | 内存使用持续增长，最终导致程序崩溃   |
| **野指针**     | 指针指向已释放的内存       | 未定义行为，可能导致程序崩溃         |
| **重复释放**   | 对同一块内存释放多次       | 未定义行为，可能导致程序崩溃         |
| **缓冲区溢出** | 写入超出分配内存范围的数据 | 覆盖其他内存，导致程序崩溃或安全漏洞 |

## 2. RAII 模式 (Resource Acquisition Is Initialization)

### 2.1 RAII 核心思想

RAII（资源获取即初始化）是一种 C++ 编程技术，利用对象的生命周期来管理资源。

- **构造函数**: 获取资源
- **析构函数**: 释放资源
- **核心优势**: 无论函数如何退出（正常返回或异常），资源都会被正确释放

### 2.2 RAII 示例

#### 2.2.1 简单 RAII 类

```cpp
 class FileHandler {
 private:
  FILE* file;
 public:
  FileHandler(const char* filename, const char* mode) {
  file = fopen(filename, mode);
  if (!file) {
  throw std::runtime_error("Failed to open file");
  }
  }
  ~FileHandler() {
  if (file) {
  fclose(file);
  }
  }
  // 禁用拷贝和移动，避免资源重复释放
  FileHandler(const FileHandler&) = delete;
  FileHandler& operator=(const FileHandler&) = delete;
  // 提供访问文件的方法
  FILE* get() const { return file; }
 True};
 // 使用示例
 void read_file(const char* filename) {
  FileHandler file(filename, "r");
  // 文件操作...
 True} // 这里 file 析构，自动关闭文件
```

#### 2.2.2 RAII 与异常

```cpp
 void func() {
  FileHandler file("data.txt", "r");
  // 如果这里抛出异常
  throw std::runtime_error("Something went wrong");
  // 文件仍然会被正确关闭，因为析构函数会被调用
 True}
```

### 2.3 RAII 的应用场景

- **文件操作**: 自动关闭文件
- **内存管理**: 自动释放内存
- **锁管理**: 自动释放锁
- **网络连接**: 自动关闭连接
- **数据库连接**: 自动关闭连接

## 3. 智能指针 (Smart Pointers - C++11+)

智能指针是 C++11 引入的模板类，用于自动管理动态内存，避免内存泄漏。

### 3.1 std::unique_ptr

`std::unique_ptr` 是一种独占所有权的智能指针，同一时间只能有一个 `unique_ptr` 指向同一个对象。

```cpp
 #include <memory>
 // 创建 unique_ptr
 std::unique_ptr<int> p1(new int(10));
 // 使用 make_unique (C++14)
 auto p2 = std::make_unique<int>(20);
 // 访问对象
 std::cout << *p1 << std::endl; // 输出 10
 // 转移所有权
 std::unique_ptr<int> p3 = std::move(p1); // p1 现在为空
 // 不需要手动 delete，离开作用域时自动释放
```

### 3.2 std::shared_ptr

`std::shared_ptr` 是一种共享所有权的智能指针，使用引用计数来跟踪有多少个 `shared_ptr` 指向同一个对象。

```cpp
 #include <memory>
 // 创建 shared_ptr
 std::shared_ptr<int> p1(new int(10));
 // 使用 make_shared (推荐)
 auto p2 = std::make_shared<int>(20);
 // 共享所有权
 std::shared_ptr<int> p3 = p1; // 引用计数变为 2
 // 访问引用计数
 std::cout << p1.use_count() << std::endl; // 输出 2
 // 当最后一个 shared_ptr 离开作用域时，对象自动释放
```

### 3.3 std::weak_ptr

`std::weak_ptr` 是一种不增加引用计数的智能指针，用于解决 `shared_ptr` 的循环引用问题。

```cpp
 #include <memory>
 class B; // 前向声明
 class A {
 public:
  std::shared_ptr<B> b_ptr;
  ~A() { std::cout << "A destroyed" << std::endl; }
 True};
 class B {
 public:
  std::weak_ptr<A> a_ptr; // 使用 weak_ptr 避免循环引用
  ~B() { std::cout << "B destroyed" << std::endl; }
 True};
 int main() {
  auto a = std::make_shared<A>();
  auto b = std::make_shared<B>();
  a->b_ptr = b;
  b->a_ptr = a;
  // 引用计数分析：
  // a 的引用计数：1 (a) + 0 (b->a_ptr 是 weak_ptr)
  // b 的引用计数：1 (b) + 1 (a->b_ptr)
  return 0; // a 和 b 都会被正确销毁
 True}
```

### 3.4 智能指针的最佳实践

- **优先使用 `std::make_shared` 和 `std::make_unique`**：避免裸指针
- **尽量使用 `unique_ptr`**：独占所有权更安全
- **仅在需要共享所有权时使用 `shared_ptr`**：引用计数有开销
- **使用 `weak_ptr` 解决循环引用**：避免内存泄漏
- **不要混合使用智能指针和裸指针**：容易导致双重释放
- **不要手动管理智能指针指向的内存**：交给智能指针管理

## 4. 内存管理最佳实践

### 4.1 一般原则

- **优先使用栈内存**：自动管理，速度快
- **最小化动态内存使用**：只在必要时使用堆内存
- **使用 RAII**：利用对象生命周期管理资源
- **使用智能指针**：避免手动内存管理错误
- **定期检查内存泄漏**：使用工具如 Valgrind

### 4.2 代码示例

#### 4.2.1 智能指针的使用

```cpp
 #include <memory>
 #include <vector>
 // 使用 unique_ptr
 void use_unique_ptr() {
  auto p = std::make_unique<int>(42);
  std::cout << *p << std::endl;
  // p 离开作用域时自动释放
 True}
 // 使用 shared_ptr
 void use_shared_ptr() {
  auto p1 = std::make_shared<int>(100);
  {
  auto p2 = p1; // 共享所有权
  std::cout << *p2 << std::endl;
  } // p2 离开作用域，引用计数减为 1
  std::cout << *p1 << std::endl;
 True} // p1 离开作用域，引用计数减为 0，内存释放
 // 智能指针与容器
 void use_smart_pointers_in_container() {
  std::vector<std::unique_ptr<int>> vec;
  for (int i = 0; i < 10; i++) {
  vec.push_back(std::make_unique<int>(i));
  }
  for (const auto& p : vec) {
  std::cout << *p << " ";
  }
  std::cout << std::endl;
  // 容器销毁时，所有 unique_ptr 自动释放
 True}
```

#### 4.2.2 自定义 RAII 类

```cpp
 #include <mutex>
 // 锁的 RAII 包装
 class LockGuard {
 private:
  std::mutex& mtx;
 public:
  explicit LockGuard(std::mutex& mutex) : mtx(mutex) {
  mtx.lock();
  }
  ~LockGuard() {
  mtx.unlock();
  }
  // 禁用拷贝
  LockGuard(const LockGuard&) = delete;
  LockGuard& operator=(const LockGuard&) = delete;
 True};
 // 使用示例
 std::mutex mtx;
 void critical_section() {
  LockGuard lock(mtx); // 自动加锁
  // 临界区代码...
 True} // 自动解锁
```

### 4.3 内存泄漏检测

#### 4.3.1 使用 Valgrind

```bash
 # 编译程序
 g++ -g -o program program.cpp
 # 使用 Valgrind 检测内存泄漏
 valgrind --leak-check=full ./program
```

#### 4.3.2 使用 AddressSanitizer

```bash
 # 编译程序
 g++ -fsanitize=address -g -o program program.cpp
 # 运行程序
 ./program
```

## 5. 高级内存管理

### 5.1 内存池

内存池是一种预分配内存的技术，用于减少频繁的内存分配和释放开销。它特别适用于需要频繁分配和释放小对象的场景，如游戏开发、高频交易系统等。

#### 5.1.1 内存池的优势

- **减少内存碎片**：预分配大块内存，避免频繁的小内存分配
- **提高性能**：内存分配和释放操作非常快速
- **控制内存使用**：可以限制最大内存使用量
- **简化内存管理**：统一管理内存分配和释放

#### 5.1.2 内存池实现

**基本内存池**：

```cpp
 #include <iostream>
 #include <cstddef>
 class MemoryPool {
 private:
  char* pool; // 内存池指针
  size_t size; // 内存池大小
  size_t used; // 已使用内存
  size_t alignment; // 内存对齐要求
 public:
  MemoryPool(size_t pool_size, size_t align = alignof(std::max_align_t))
  : size(pool_size), used(0), alignment(align) {
  // 分配内存，确保对齐
  pool = static_cast<char*>(aligned_alloc(alignment, size));
  if (!pool) {
  throw std::bad_alloc();
  }
  std::cout << "Memory pool created with size: " << size << " bytes" << std::endl;
  }
  ~MemoryPool() {
  if (pool) {
  free(pool);
  std::cout << "Memory pool destroyed" << std::endl;
  }
  }
  // 禁用拷贝和移动
  MemoryPool(const MemoryPool&) = delete;
  MemoryPool& operator=(const MemoryPool&) = delete;
  MemoryPool(MemoryPool&&) = delete;
  MemoryPool& operator=(MemoryPool&&) = delete;
  void* allocate(size_t bytes) {
  // 计算对齐后的大小
  size_t aligned_bytes = ((bytes + alignment - 1) / alignment) * alignment;
  if (used + aligned_bytes > size) {
  std::cerr << "Memory pool exhausted!" << std::endl;
  return nullptr; // 内存不足
  }
  void* ptr = pool + used;
  used += aligned_bytes;
  std::cout << "Allocated " << aligned_bytes << " bytes, used: " << used << "/" << size << std::endl;
  return ptr;
  }
  template <typename T, typename... Args>
  T* allocate(Args&&... args) {
  void* ptr = allocate(sizeof(T));
  if (!ptr) {
  return nullptr;
  }
  return new (ptr) T(std::forward<Args>(args)...);
  }
  void deallocate(void* ptr) {
  // 简单内存池不单独释放内存，而是通过 reset() 重置
  // 复杂内存池会实现空闲块管理
  }
  template <typename T>
  void deallocate(T* ptr) {
  if (ptr) {
  ptr->~T(); // 调用析构函数
  }
  }
  void reset() {
  used = 0; // 重置内存池，不释放内存
  std::cout << "Memory pool reset" << std::endl;
  }
  size_t get_used() const {
  return used;
  }
  size_t get_size() const {
  return size;
  }
  bool is_full() const {
  return used >= size;
  }
  bool has_available(size_t bytes) const {
  size_t aligned_bytes = ((bytes + alignment - 1) / alignment) * alignment;
  return used + aligned_bytes <= size;
  }
 True};
 // 使用示例
 void use_memory_pool() {
  try {
  MemoryPool pool(1024);
  // 分配基本类型
  int* p1 = static_cast<int*>(pool.allocate(sizeof(int)));
  *p1 = 42;
  std::cout << "p1 value: " << *p1 << std::endl;
  double* p2 = static_cast<double*>(pool.allocate(sizeof(double)));
  *p2 = 3.14;
  std::cout << "p2 value: " << *p2 << std::endl;
  // 分配自定义类型
  class Point {
  public:
  Point(int x, int y) : x(x), y(y) {
  std::cout << "Point constructed: (" << x << ", " << y << ")" << std::endl;
  }
  ~Point() {
  std::cout << "Point destructed: (" << x << ", " << y << ")" << std::endl;
  }
  int x, y;
  };
  Point* p3 = pool.allocate<Point>(10, 20);
  std::cout << "p3 value: (" << p3->x << ", " << p3->y << ")" << std::endl;
  // 检查内存使用情况
  std::cout << "Memory used: " << pool.get_used() << "/" << pool.get_size() << std::endl;
  // 重置内存池
  pool.deallocate(p3); // 调用析构函数
  pool.reset();
  std::cout << "After reset, memory used: " << pool.get_used() << std::endl;
  // 重新使用内存
  Point* p4 = pool.allocate<Point>(30, 40);
  std::cout << "p4 value: (" << p4->x << ", " << p4->y << ")" << std::endl;
  pool.deallocate(p4);
  } catch (const std::exception& e) {
  std::cerr << "Error: " << e.what() << std::endl;
  }
 True}
 int main() {
  use_memory_pool();
  return 0;
 True}
```

**带空闲块管理的内存池**：

```cpp
 #include <iostream>
 #include <cstddef>
 class MemoryPool {
 private:
  struct FreeBlock {
  size_t size;
  FreeBlock* next;
  };
  char* pool; // 内存池指针
  size_t size; // 内存池大小
  FreeBlock* free_list; // 空闲块链表
  size_t alignment; // 内存对齐要求
 public:
  MemoryPool(size_t pool_size, size_t align = alignof(std::max_align_t))
  : size(pool_size), alignment(align) {
  // 分配内存，确保对齐
  pool = static_cast<char*>(aligned_alloc(alignment, size));
  if (!pool) {
  throw std::bad_alloc();
  }
  // 初始化空闲块链表
  free_list = reinterpret_cast<FreeBlock*>(pool);
  free_list->size = size;
  free_list->next = nullptr;
  std::cout << "Memory pool created with size: " << size << " bytes" << std::endl;
  }
  ~MemoryPool() {
  if (pool) {
  free(pool);
  std::cout << "Memory pool destroyed" << std::endl;
  }
  }
  // 禁用拷贝和移动
  MemoryPool(const MemoryPool&) = delete;
  MemoryPool& operator=(const MemoryPool&) = delete;
  MemoryPool(MemoryPool&&) = delete;
  MemoryPool& operator=(MemoryPool&&) = delete;
  void* allocate(size_t bytes) {
  // 计算对齐后的大小，加上 FreeBlock 大小
  size_t aligned_bytes = ((bytes + alignment - 1) / alignment) * alignment;
  size_t total_bytes = aligned_bytes + sizeof(FreeBlock);
  FreeBlock* prev = nullptr;
  FreeBlock* curr = free_list;
  // 查找合适的空闲块
  while (curr) {
  if (curr->size >= total_bytes) {
  // 找到合适的块
  if (curr->size > total_bytes + sizeof(FreeBlock)) {
  // 分割块
  size_t remaining = curr->size - total_bytes;
  FreeBlock* new_block = reinterpret_cast<FreeBlock*>(
  reinterpret_cast<char*>(curr) + total_bytes
  );
  new_block->size = remaining;
  new_block->next = curr->next;
  if (prev) {
  prev->next = new_block;
  } else {
  free_list = new_block;
  }
  } else {
  // 使用整个块
  if (prev) {
  prev->next = curr->next;
  } else {
  free_list = curr->next;
  }
  }
  // 返回用户可用内存
  void* ptr = reinterpret_cast<char*>(curr) + sizeof(FreeBlock);
  std::cout << "Allocated " << aligned_bytes << " bytes" << std::endl;
  return ptr;
  }
  prev = curr;
  curr = curr->next;
  }
  std::cerr << "Memory pool exhausted!" << std::endl;
  return nullptr; // 内存不足
  }
  void deallocate(void* ptr) {
  if (!ptr) {
  return;
  }
  // 计算块的起始地址
  FreeBlock* block = reinterpret_cast<FreeBlock*>(
  reinterpret_cast<char*>(ptr) - sizeof(FreeBlock)
  );
  // 将块插入到空闲链表头部
  block->next = free_list;
  free_list = block;
  std::cout << "Deallocated memory" << std::endl;
  // 可选：合并相邻的空闲块
  coalesce_free_blocks();
  }
  void coalesce_free_blocks() {
  // 简单的合并逻辑
  FreeBlock* curr = free_list;
  while (curr && curr->next) {
  char* curr_end = reinterpret_cast<char*>(curr) + curr->size;
  char* next_start = reinterpret_cast<char*>(curr->next);
  if (curr_end == next_start) {
  // 合并相邻块
  curr->size += curr->next->size;
  curr->next = curr->next->next;
  std::cout << "Coalesced free blocks" << std::endl;
  } else {
  curr = curr->next;
  }
  }
  }
  void print_free_list() {
  FreeBlock* curr = free_list;
  int count = 0;
  std::cout << "Free blocks: " << std::endl;
  while (curr) {
  std::cout << " Block " << count << ": size = " << curr->size << " bytes" << std::endl;
  curr = curr->next;
  count++;
  }
  }
 True};
 // 使用示例
 void use_advanced_memory_pool() {
  try {
  MemoryPool pool(1024);
  // 分配内存
  void* p1 = pool.allocate(64);
  void* p2 = pool.allocate(128);
  void* p3 = pool.allocate(256);
  pool.print_free_list();
  // 释放内存
  pool.deallocate(p2);
  pool.print_free_list();
  pool.deallocate(p1);
  pool.print_free_list();
  pool.deallocate(p3);
  pool.print_free_list();
  } catch (const std::exception& e) {
  std::cerr << "Error: " << e.what() << std::endl;
  }
 True}
 int main() {
  use_advanced_memory_pool();
  return 0;
 True}
```

### 5.2 内存对齐

内存对齐是指数据在内存中的存储位置按照特定的边界对齐，这对于提高内存访问效率和满足硬件要求非常重要。

#### 5.2.1 内存对齐的重要性

- **提高访问速度**：对齐的内存访问比未对齐的访问更快
- **避免硬件异常**：某些硬件平台要求特定类型的数据必须对齐
- **减少内存浪费**：合理的对齐可以减少内存空洞

#### 5.2.2 C++ 中的内存对齐

**使用 alignas 关键字**：

```cpp
 #include <iostream>
 #include <cstdalign>
 // 基本类型的对齐要求
 void check_alignment() {
  std::cout << "Alignment requirements:" << std::endl;
  std::cout << "char: " << alignof(char) << " bytes" << std::endl;
  std::cout << "short: " << alignof(short) << " bytes" << std::endl;
  std::cout << "int: " << alignof(int) << " bytes" << std::endl;
  std::cout << "long: " << alignof(long) << " bytes" << std::endl;
  std::cout << "float: " << alignof(float) << " bytes" << std::endl;
  std::cout << "double: " << alignof(double) << " bytes" << std::endl;
  std::cout << "max_align_t: " << alignof(std::max_align_t) << " bytes" << std::endl;
 True}
 // 自定义对齐要求
 struct alignas(16) AlignedStruct {
  char c;
  int i;
  double d;
 True};
 // 对齐的数组
 typedef alignas(32) float AlignedFloat[4];
 void use_aligned_memory() {
  check_alignment();
  std::cout << "\nAlignedStruct:" << std::endl;
  std::cout << "Size: " << sizeof(AlignedStruct) << " bytes" << std::endl;
  std::cout << "Alignment: " << alignof(AlignedStruct) << " bytes" << std::endl;
  // 使用 aligned_alloc 分配对齐内存
  void* ptr = aligned_alloc(16, 1024);
  if (ptr) {
  std::cout << "\nAligned memory allocated at: " << ptr << std::endl;
  std::cout << "Alignment check: " << (reinterpret_cast<uintptr_t>(ptr) % 16 == 0 ? "OK" : "Failed") << std::endl;
  free(ptr);
  }
  // 使用 std::aligned_alloc (C++17)
  #if __cplusplus >= 201703L
  void* cpp17_ptr = std::aligned_alloc(32, 256);
  if (cpp17_ptr) {
  std::cout << "\nC++17 aligned memory allocated at: " << cpp17_ptr << std::endl;
  std::cout << "Alignment check: " << (reinterpret_cast<uintptr_t>(cpp17_ptr) % 32 == 0 ? "OK" : "Failed") << std::endl;
  std::free(cpp17_ptr);
  }
  #endif
 True}
 int main() {
  use_aligned_memory();
  return 0;
 True}
```

### 5.3 自定义内存分配器

C++ 允许自定义内存分配器，用于控制容器的内存分配行为。

```cpp
 #include <iostream>
 #include <vector>
 #include <memory>
 // 自定义分配器
 template <typename T>
 class CustomAllocator {
 public:
  using value_type = T;
  CustomAllocator() noexcept = default;
  template <typename U>
  CustomAllocator(const CustomAllocator<U>&) noexcept {}
  T* allocate(size_t n) {
  if (n > std::numeric_limits<size_t>::max() / sizeof(T)) {
  throw std::bad_alloc();
  }
  void* ptr = std::malloc(n * sizeof(T));
  if (!ptr) {
  throw std::bad_alloc();
  }
  std::cout << "CustomAllocator: Allocated " << n * sizeof(T) << " bytes" << std::endl;
  return static_cast<T*>(ptr);
  }
  void deallocate(T* ptr, size_t n) noexcept {
  std::cout << "CustomAllocator: Deallocated " << n * sizeof(T) << " bytes" << std::endl;
  std::free(ptr);
  }
  template <typename U>
  bool operator==(const CustomAllocator<U>&) const noexcept {
  return true;
  }
  template <typename U>
  bool operator!=(const CustomAllocator<U>&) const noexcept {
  return false;
  }
 True};
 // 使用自定义分配器
 void use_custom_allocator() {
  std::vector<int, CustomAllocator<int>> vec;
  vec.push_back(10);
  vec.push_back(20);
  vec.push_back(30);
  vec.push_back(40);
  vec.push_back(50);
  std::cout << "Vector size: " << vec.size() << std::endl;
  std::cout << "Vector capacity: " << vec.capacity() << std::endl;
  for (int i : vec) {
  std::cout << i << " ";
  }
  std::cout << std::endl;
  // 当 vec 离开作用域时，会自动释放内存
 True}
 int main() {
  use_custom_allocator();
  return 0;
 True}
```

### 5.4 内存屏障与原子操作

内存屏障（Memory Barrier）是一种同步原语，用于控制内存操作的顺序，确保多线程环境下的内存可见性。

#### 5.4.1 内存屏障的作用

- **确保内存操作顺序**：防止编译器和 CPU 重排序
- **保证内存可见性**：确保一个线程的修改对其他线程可见
- **同步多线程操作**：协调不同线程之间的内存访问

#### 5.4.2 C++ 中的内存屏障

**使用 std::atomic**：

```cpp
 #include <iostream>
 #include <thread>
 #include <atomic>
 #include <vector>
 std::atomic<int> counter(0);
 std::atomic<bool> ready(false);
 void increment_counter(int id) {
  // 等待信号
  while (!ready.load(std::memory_order_acquire)) {
  std::this_thread::yield();
  }
  // 增加计数器
  for (int i = 0; i < 1000; i++) {
  counter.fetch_add(1, std::memory_order_relaxed);
  }
 True}
 void test_atomics() {
  std::vector<std::thread> threads;
  // 创建 10 个线程
  for (int i = 0; i < 10; i++) {
  threads.emplace_back(increment_counter, i);
  }
  // 发送开始信号
  ready.store(true, std::memory_order_release);
  // 等待所有线程完成
  for (auto& t : threads) {
  t.join();
  }
  std::cout << "Final counter value: " << counter.load() << std::endl;
  std::cout << "Expected: 10000" << std::endl;
 True}
 int main() {
  test_atomics();
  return 0;
 True}
```

**内存序说明**：

- `memory_order_relaxed`：最宽松的内存序，只保证原子操作本身的原子性
- `memory_order_acquire`：获取操作，确保后续操作不会重排序到前面
- `memory_order_release`：释放操作，确保前面的操作不会重排序到后面
- `memory_order_acq_rel`：同时具有获取和释放语义
- `memory_order_seq_cst`：顺序一致性，最严格的内存序

### 5.5 内存映射

内存映射（Memory Mapping）是一种将文件或设备映射到进程地址空间的技术，允许直接通过内存访问文件内容。

```cpp
 #include <iostream>
 #include <fstream>
 #include <sys/mman.h>
 #include <sys/stat.h>
 #include <fcntl.h>
 #include <unistd.h>
 void use_memory_mapping() {
  // 创建测试文件
  std::ofstream outfile("test.txt");
  outfile << "Hello, Memory Mapping!" << std::endl;
  outfile.close();
  // 打开文件
  int fd = open("test.txt", O_RDWR);
  if (fd == -1) {
  perror("open");
  return;
  }
  // 获取文件大小
  struct stat sb;
  if (fstat(fd, &sb) == -1) {
  perror("fstat");
  close(fd);
  return;
  }
  // 映射文件到内存
  void* addr = mmap(nullptr, sb.st_size, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
  if (addr == MAP_FAILED) {
  perror("mmap");
  close(fd);
  return;
  }
  // 读取文件内容
  std::cout << "File content: " << static_cast<char*>(addr) << std::endl;
  // 修改文件内容
  char* data = static_cast<char*>(addr);
  data[0] = 'h'; // 小写 h
  // 同步到文件
  if (msync(addr, sb.st_size, MS_SYNC) == -1) {
  perror("msync");
  }
  // 解除映射
  if (munmap(addr, sb.st_size) == -1) {
  perror("munmap");
  }
  close(fd);
  // 验证修改
  std::ifstream infile("test.txt");
  std::string line;
  std::getline(infile, line);
  std::cout << "Modified content: " << line << std::endl;
  infile.close();
 True}
 int main() {
  use_memory_mapping();
  return 0;
 True}
```

### 5.6 垃圾回收

虽然 C++ 主要依赖手动内存管理，但对于某些场景，可以使用垃圾回收器来自动管理内存。

#### 5.6.1 Boehm 垃圾回收器

Boehm 是一个保守的垃圾回收器，可以集成到 C++ 程序中。
**使用示例**：

```cpp
 #include <iostream>
 #include <gc/gc.h>
 void use_boehm_gc() {
  // 初始化垃圾回收器
  GC_INIT();
  // 分配内存
  int* p1 = (int*)GC_MALLOC(sizeof(int));
  *p1 = 42;
  std::cout << "p1 value: " << *p1 << std::endl;
  int* p2 = (int*)GC_MALLOC_ATOMIC(sizeof(int));
  *p2 = 100;
  std::cout << "p2 value: " << *p2 << std::endl;
  // 不需要手动释放内存
  // 垃圾回收器会自动回收不再使用的内存
  std::cout << "Garbage collection will happen automatically" << std::endl;
 True}
 int main() {
  use_boehm_gc();
  return 0;
 True}
```

**编译命令**：

```bash
 g++ -o program program.cpp -lgc
```

#### 5.6.2 垃圾回收的优缺点

**优点**：

- 减少内存泄漏的可能性
- 简化内存管理
- 提高代码安全性
  **缺点**：
- 性能开销
- 不可预测的暂停时间
- 与 C++ 的 RAII 模式不完全兼容
- 增加可执行文件大小

### 5.7 内存管理的未来发展

C++ 标准委员会一直在努力改进内存管理，未来可能的发展方向包括：

1. **更智能的智能指针**：进一步简化内存管理
2. **更高效的内存分配器**：标准库提供更优化的分配器
3. **更好的内存安全**：减少内存相关的错误
4. **垃圾回收的整合**：可能提供可选的垃圾回收机制
5. **更强大的编译时内存分析**：在编译时检测内存问题

## 6. 总结

C++ 的内存管理是一个复杂但重要的主题，掌握好内存管理对于编写高效、安全的 C++ 程序至关重要。

### 6.1 关键要点

1. **指针与引用**：

- 指针是存储内存地址的变量，引用是变量的别名
- 正确使用指针和引用可以提高代码的灵活性和效率
- 注意避免野指针、空指针等问题

2. **内存管理**：

- 了解内存布局（栈、堆、全局区等）
- 优先使用栈内存，合理使用堆内存
- 避免内存泄漏、双重释放等问题

3. **RAII 模式**：

- 利用对象生命周期管理资源
- 确保资源在使用完毕后被正确释放
- 提高代码的异常安全性

4. **智能指针**：

- `unique_ptr`：独占所有权
- `shared_ptr`：共享所有权
- `weak_ptr`：解决循环引用
- 优先使用 `make_shared` 和 `make_unique`

5. **高级内存管理**：

- 内存池：提高内存分配效率
- 内存对齐：提高访问速度
- 自定义分配器：控制内存分配行为
- 内存屏障：确保多线程内存可见性
- 内存映射：高效文件访问

### 6.2 最佳实践

- **优先使用栈内存**：自动管理，速度快
- **使用 RAII 和智能指针**：避免手动内存管理
- **最小化动态内存使用**：只在必要时使用堆内存
- **定期检查内存泄漏**：使用工具如 Valgrind、AddressSanitizer
- **优化内存使用**：减少不必要的内存分配和释放
- **选择合适的内存管理策略**：根据具体场景选择合适的方法

### 6.3 学习建议

- **实践**：编写各种内存管理场景的代码
- **调试**：使用内存调试工具检测问题
- **阅读源码**：学习标准库和优秀开源项目的内存管理实现
- **持续学习**：关注 C++ 标准的最新发展
  通过掌握 C++ 的内存管理技术，你将能够编写更高效、更安全、更可靠的 C++ 程序。

## 7. 代码示例

### 7.1 指针与引用的综合使用

```cpp
 #include <iostream>
 // 使用指针交换两个数
 void swap_with_pointers(int* a, int* b) {
  int temp = *a;
  *a = *b;
  *b = temp;
 True}
 // 使用引用交换两个数
 void swap_with_references(int& a, int& b) {
  int temp = a;
  a = b;
  b = temp;
 True}
 int main() {
  int x = 10, y = 20;
  std::cout << "Before swap: x = " << x << ", y = " << y << std::endl;
  swap_with_pointers(&x, &y);
  std::cout << "After swap with pointers: x = " << x << ", y = " << y << std::endl;
  swap_with_references(x, y);
  std::cout << "After swap with references: x = " << x << ", y = " << y << std::endl;
  return 0;
 True}
```

### 7.2 智能指针的使用

```cpp
 #include <iostream>
 #include <memory>
 class Resource {
 public:
  Resource() {
  std::cout << "Resource acquired" << std::endl;
  }
  ~Resource() {
  std::cout << "Resource released" << std::endl;
  }
  void use() {
  std::cout << "Using resource" << std::endl;
  }
 True};
 int main() {
  std::cout << "Creating unique_ptr..." << std::endl;
  {
  auto res = std::make_unique<Resource>();
  res->use();
  } // res 离开作用域，资源自动释放
  std::cout << "Creating shared_ptr..." << std::endl;
  {
  auto res1 = std::make_shared<Resource>();
  std::cout << "Reference count: " << res1.use_count() << std::endl;
  {
  auto res2 = res1;
  std::cout << "Reference count: " << res1.use_count() << std::endl;
  res2->use();
  } // res2 离开作用域，引用计数减为 1
  std::cout << "Reference count: " << res1.use_count() << std::endl;
  } // res1 离开作用域，引用计数减为 0，资源释放
  return 0;
 True}
```

### 7.3 RAII 模式的应用

```cpp
 #include <iostream>
 #include <fstream>
 #include <stdexcept>
 class FileRAII {
 private:
  std::ofstream file;
 public:
  FileRAII(const std::string& filename) {
  file.open(filename);
  if (!file) {
  throw std::runtime_error("Failed to open file");
  }
  std::cout << "File opened: " << filename << std::endl;
  }
  ~FileRAII() {
  if (file.is_open()) {
  file.close();
  std::cout << "File closed" << std::endl;
  }
  }
  // 禁用拷贝
  FileRAII(const FileRAII&) = delete;
  FileRAII& operator=(const FileRAII&) = delete;
  // 提供文件访问
  std::ofstream& get() {
  return file;
  }
 True};
 void write_to_file(const std::string& filename, const std::string& content) {
  FileRAII file(filename);
  file.get() << content;
  // 这里可以抛出异常，文件仍然会被关闭
  // throw std::runtime_error("Test exception");
 True}
 int main() {
  try {
  write_to_file("test.txt", "Hello, RAII!");
  std::cout << "File written successfully" << std::endl;
  } catch (const std::exception& e) {
  std::cerr << "Error: " << e.what() << std::endl;
  }
  return 0;
 True}
```

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_103 拆分，专注于内存管理（内存布局、RAII、智能指针、高级内存管理）。
