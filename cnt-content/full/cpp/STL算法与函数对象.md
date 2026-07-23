---
order: 100
tags:
  - cpp
difficulty: intermediate
title: 'C++ STL 算法与函数对象'
module: cpp
category: 'C++ Basics'
description: '标准算法、lambda 表达式、函数对象与范围库。'
author: Anonymous
related:
  - cpp/并发编程
  - cpp/RAII资源管理
  - cpp/移动语义详解
  - cpp/完美转发与引用折叠
prerequisites:
  - cpp/概述与现代标准
---

## 1. 常用算法

STL 算法位于 `<algorithm>` 头文件中，提供了各种操作容器元素的函数。

### 1.1 算法一览

| 算法                  | 描述                 | 示例                                                                                |
| :-------------------- | :------------------- | :---------------------------------------------------------------------------------- |
| **排序**              |                      |                                                                                     |
| `std::sort`           | 排序元素             | `std::sort(vec.begin(), vec.end());`                                                |
| `std::stable_sort`    | 稳定排序             | `std::stable_sort(vec.begin(), vec.end());`                                         |
| `std::partial_sort`   | 部分排序             | `std::partial_sort(vec.begin(), vec.begin() + 3, vec.end());`                       |
| `std::nth_element`    | 第 n 小元素          | `std::nth_element(vec.begin(), vec.begin() + 2, vec.end());`                        |
| **查找**              |                      |                                                                                     |
| `std::find`           | 查找元素             | `auto it = std::find(vec.begin(), vec.end(), 5);`                                   |
| `std::binary_search`  | 二分查找             | `bool found = std::binary_search(vec.begin(), vec.end(), 5);`                       |
| `std::lower_bound`    | 查找下界             | `auto it = std::lower_bound(vec.begin(), vec.end(), 5);`                            |
| `std::upper_bound`    | 查找上界             | `auto it = std::upper_bound(vec.begin(), vec.end(), 5);`                            |
| **修改**              |                      |                                                                                     |
| `std::copy`           | 复制元素             | `std::copy(src.begin(), src.end(), dest.begin());`                                  |
| `std::move`           | 移动元素             | `std::move(src.begin(), src.end(), dest.begin());`                                  |
| `std::fill`           | 填充元素             | `std::fill(vec.begin(), vec.end(), 0);`                                             |
| `std::replace`        | 替换元素             | `std::replace(vec.begin(), vec.end(), 5, 10);`                                      |
| `std::transform`      | 转换元素             | `std::transform(vec.begin(), vec.end(), vec.begin(), [](int n) { return n * 2; });` |
| **计数**              |                      |                                                                                     |
| `std::count`          | 计数元素             | `int count = std::count(vec.begin(), vec.end(), 5);`                                |
| `std::count_if`       | 条件计数             | `int count = std::count_if(vec.begin(), vec.end(), is_even);`                       |
| **最值**              |                      |                                                                                     |
| `std::min_element`    | 最小值               | `auto it = std::min_element(vec.begin(), vec.end());`                               |
| `std::max_element`    | 最大值               | `auto it = std::max_element(vec.begin(), vec.end());`                               |
| `std::minmax_element` | 最小值和最大值       | `auto pair = std::minmax_element(vec.begin(), vec.end());`                          |
| **其他**              |                      |                                                                                     |
| `std::reverse`        | 反转元素             | `std::reverse(vec.begin(), vec.end());`                                             |
| `std::unique`         | 去重元素             | `auto last = std::unique(vec.begin(), vec.end());`                                  |
| `std::for_each`       | 遍历元素             | `std::for_each(vec.begin(), vec.end(), print);`                                     |
| `std::accumulate`     | 累积计算             | `int sum = std::accumulate(vec.begin(), vec.end(), 0);`                             |
| `std::all_of`         | 检查所有元素满足条件 | `bool all_even = std::all_of(vec.begin(), vec.end(), is_even);`                     |
| `std::any_of`         | 检查任一元素满足条件 | `bool any_even = std::any_of(vec.begin(), vec.end(), is_even);`                     |
| `std::none_of`        | 检查无元素满足条件   | `bool none_even = std::none_of(vec.begin(), vec.end(), is_even);`                   |

### 1.2 算法使用示例

```cpp
 #include <algorithm>
 #include <vector>
 #include <iostream>
 #include <numeric>
 // 辅助函数
 bool is_even(int n) {
  return n % 2 == 0;
 }
 bool is_odd(int n) {
  return n % 2 != 0;
 }
 void print(int n) {
  std::cout << n << " ";
 }
 int main() {
  std::vector<int> vec = {3, 1, 4, 1, 5, 9, 2, 6};
  // 排序
  std::sort(vec.begin(), vec.end());
  std::cout << "Sorted: ";
  std::for_each(vec.begin(), vec.end(), print);
  std::cout << std::endl;
  // 部分排序（前3个元素）
  std::vector<int> vec2 = {3, 1, 4, 1, 5, 9, 2, 6};
  std::partial_sort(vec2.begin(), vec2.begin() + 3, vec2.end());
  std::cout << "Partially sorted: ";
  std::for_each(vec2.begin(), vec2.end(), print);
  std::cout << std::endl;
  // 查找
  auto it = std::find(vec.begin(), vec.end(), 5);
  if (it != vec.end()) {
  std::cout << "Found 5 at position: " << std::distance(vec.begin(), it) << std::endl;
  }
  // 二分查找（需要先排序）
  bool found = std::binary_search(vec.begin(), vec.end(), 5);
  std::cout << "Binary search for 5: " << (found ? "found" : "not found") << std::endl;
  // 下界和上界
  auto lower = std::lower_bound(vec.begin(), vec.end(), 5);
  auto upper = std::upper_bound(vec.begin(), vec.end(), 5);
  std::cout << "Lower bound of 5: position " << std::distance(vec.begin(), lower) << std::endl;
  std::cout << "Upper bound of 5: position " << std::distance(vec.begin(), upper) << std::endl;
  // 计数
  int count = std::count(vec.begin(), vec.end(), 1);
  std::cout << "Count of 1: " << count << std::endl;
  // 条件计数
  int even_count = std::count_if(vec.begin(), vec.end(), is_even);
  std::cout << "Count of even numbers: " << even_count << std::endl;
  // 最值
  auto min_it = std::min_element(vec.begin(), vec.end());
  auto max_it = std::max_element(vec.begin(), vec.end());
  std::cout << "Min: " << *min_it << ", Max: " << *max_it << std::endl;
  // 同时获取最小值和最大值
  auto minmax = std::minmax_element(vec.begin(), vec.end());
  std::cout << "Min (minmax): " << *minmax.first << ", Max (minmax): " << *minmax.second << std::endl;
  // 反转
  std::reverse(vec.begin(), vec.end());
  std::cout << "Reversed: ";
  std::for_each(vec.begin(), vec.end(), print);
  std::cout << std::endl;
  // 去重（需要先排序）
  std::sort(vec.begin(), vec.end());
  auto last = std::unique(vec.begin(), vec.end());
  vec.erase(last, vec.end());
  std::cout << "Unique: ";
  std::for_each(vec.begin(), vec.end(), print);
  std::cout << std::endl;
  // 转换
  std::transform(vec.begin(), vec.end(), vec.begin(), [](int n) { return n * 2; });
  std::cout << "Transformed (x2): ";
  std::for_each(vec.begin(), vec.end(), print);
  std::cout << std::endl;
  // 累积
  int sum = std::accumulate(vec.begin(), vec.end(), 0);
  std::cout << "Sum: " << sum << std::endl;
  // 检查条件
  bool all_even = std::all_of(vec.begin(), vec.end(), is_even);
  bool any_odd = std::any_of(vec.begin(), vec.end(), is_odd);
  bool none_negative = std::none_of(vec.begin(), vec.end(), [](int n) { return n < 0; });
  std::cout << "All even: " << (all_even ? "yes" : "no") << std::endl;
  std::cout << "Any odd: " << (any_odd ? "yes" : "no") << std::endl;
  std::cout << "None negative: " << (none_negative ? "yes" : "no") << std::endl;
  return 0;
 }
```

## 2. 仿函数与函数对象

仿函数是重载了 `operator()` 的类，可以像函数一样使用。

```cpp
 // 仿函数类
 class Add {
 private:
  int value;
 public:
  Add(int v) : value(v) {}
  int operator()(int x) const {
  return x + value;
  }
 }
 // 比较仿函数
 class Compare {
 public:
  bool operator()(int a, int b) const {
  return a > b; // 降序排序
  }
 }
 // 使用示例
 int main() {
  Add add5(5);
  int result = add5(10); // 调用 operator()
  std::cout << result << std::endl; // 15
  // 使用 STL 算法
  std::vector<int> vec = {1, 2, 3, 4, 5};
  std::transform(vec.begin(), vec.end(), vec.begin(), Add(10));
  for (int num : vec) {
  std::cout << num << " "; // 11 12 13 14 15
  }
  std::cout << std::endl;
  // 使用比较仿函数
  std::sort(vec.begin(), vec.end(), Compare());
  for (int num : vec) {
  std::cout << num << " "; // 15 14 13 12 11
  }
  std::cout << std::endl;
  return 0;
 }
```

## 3. lambda 表达式 (C++11)

lambda 表达式是一种创建匿名函数对象的简便方法。

```cpp
 int main() {
  // 基本 lambda
  auto add = [](int a, int b) { return a + b; };
  std::cout << add(5, 3) << std::endl; // 8
  // 捕获外部变量
  int x = 10;
  auto add_x = [x](int y) { return x + y; };
  std::cout << add_x(5) << std::endl; // 15
  // 引用捕获
  auto add_x_ref = [&x](int y) { return x + y; };
  x = 20;
  std::cout << add_x_ref(5) << std::endl; // 25
  // 捕获所有变量
  auto func = [&]() { std::cout << x << std::endl; };
  func(); // 20
  // 混合捕获
  int y = 5;
  auto mixed = [x, &y](int z) { return x + y + z; };
  y = 10;
  std::cout << mixed(5) << std::endl; // 20 + 10 + 5 = 35
  // 使用 lambda 与 STL 算法
  std::vector<int> vec = {1, 2, 3, 4, 5};
  // 转换
  std::transform(vec.begin(), vec.end(), vec.begin(), [](int n) { return n * 2; });
  for (int num : vec) {
  std::cout << num << " "; // 2 4 6 8 10
  }
  std::cout << std::endl;
  // 条件判断
  auto is_even = [](int n) { return n % 2 == 0; };
  int even_count = std::count_if(vec.begin(), vec.end(), is_even);
  std::cout << "Even count: " << even_count << std::endl; // 5
  // 排序
  std::sort(vec.begin(), vec.end(), [](int a, int b) { return a > b; });
  for (int num : vec) {
  std::cout << num << " "; // 10 8 6 4 2
  }
  std::cout << std::endl;
  // 查找
  auto it = std::find_if(vec.begin(), vec.end(), [](int n) { return n == 6; });
  if (it != vec.end()) {
  std::cout << "Found 6 at position: " << std::distance(vec.begin(), it) << std::endl;
  }
  return 0;
 }
```

## 4. 智能指针与 STL

智能指针可以与 STL 容器结合使用，管理动态内存。

```cpp
 #include <vector>
 #include <memory>
 #include <iostream>
 class MyClass {
 private:
  int value;
 public:
  MyClass(int v) : value(v) {
  std::cout << "Constructor: " << value << std::endl;
  }
  ~MyClass() {
  std::cout << "Destructor: " << value << std::endl;
  }
  int getValue() const { return value; }
 }
 int main() {
  // 使用 unique_ptr
  std::vector<std::unique_ptr<MyClass>> vec;
  // 添加元素
  vec.push_back(std::make_unique<MyClass>(1));
  vec.push_back(std::make_unique<MyClass>(2));
  vec.push_back(std::make_unique<MyClass>(3));
  // 遍历元素
  for (const auto& ptr : vec) {
  std::cout << ptr->getValue() << " ";
  }
  std::cout << std::endl;
  // 移除元素
  vec.pop_back(); // 自动调用析构函数
  // 清空容器
  vec.clear(); // 自动调用所有剩余元素的析构函数
  std::cout << "Done" << std::endl;
  return 0;
 }
```

## 5. STL 最佳实践

### 5.1 容器选择

| 场景          | 推荐容器                                  | 原因                    |
| :------------ | :---------------------------------------- | :---------------------- |
| 随机访问      | `std::vector`                             | 提供 O(1) 随机访问      |
| 频繁插入/删除 | `std::list`                               | 提供 O(1) 插入/删除     |
| 两端操作      | `std::deque`                              | 两端插入/删除高效       |
| 固定大小      | `std::array`                              | 栈上分配，性能好        |
| 查找操作      | `std::unordered_set`/`std::unordered_map` | 平均 O(1) 查找          |
| 有序集合      | `std::set`/`std::map`                     | 自动排序，O(log n) 查找 |
| 先进先出      | `std::queue`                              | 队列接口                |
| 后进先出      | `std::stack`                              | 栈接口                  |
| 优先级处理    | `std::priority_queue`                     | 自动排序                |

### 5.2 性能优化

- **避免不必要的拷贝**: 使用移动语义和引用
- **合理使用 reserve**: 对于 `std::vector`，预先分配空间
- **选择合适的迭代器**: 随机访问迭代器比双向迭代器快
- **避免频繁重新哈希**: 对于无序容器，合理设置桶大小
- **使用 emplace 系列函数**: 直接在容器中构造对象，避免拷贝

### 5.3 代码风格

- **使用 `auto`**: 简化代码，提高可读性
- **使用范围 for 循环**: 更简洁的遍历方式
- **使用 lambda 表达式**: 简化函数对象的使用
- **使用 STL 算法**: 利用标准库的优化实现
- **注意异常安全**: 确保容器操作的异常安全性

## 6. 代码示例

### 6.1 模板的综合使用

```cpp
 #include <iostream>
 #include <vector>
 #include <string>
 // 函数模板：打印容器
 template <typename Container>
 void printContainer(const Container& container, const std::string& name) {
  std::cout << name << ": ";
  for (const auto& item : container) {
  std::cout << item << " ";
  }
  std::cout << std::endl;
 }
 // 类模板：栈
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
 }
 // 可变参数模板：求和
 template <typename T>
 T sum(T first) {
  return first;
 }
 template <typename T, typename... Args>
 T sum(T first, Args... rest) {
  return first + sum(rest...);
 }
 int main() {
  // 测试函数模板
  std::vector<int> vec = {1, 2, 3, 4, 5};
  printContainer(vec, "Vector");
  // 测试类模板
  Stack<int> intStack;
  intStack.push(1);
  intStack.push(2);
  intStack.push(3);
  std::cout << "Stack size: " << intStack.size() << std::endl;
  while (!intStack.empty()) {
  std::cout << "Popped: " << intStack.pop() << std::endl;
  }
  // 测试可变参数模板
  int total = sum(1, 2, 3, 4, 5);
  std::cout << "Sum: " << total << std::endl;
  double total_d = sum(1.5, 2.5, 3.5);
  std::cout << "Sum (double): " << total_d << std::endl;
  return 0;
 }
```

### 6.2 STL 容器的综合使用

```cpp
 #include <iostream>
 #include <vector>
 #include <list>
 #include <map>
 #include <unordered_map>
 #include <stack>
 #include <queue>
 #include <algorithm>
 int main() {
  // 向量
  std::vector<int> vec = {5, 2, 8, 1, 9};
  std::sort(vec.begin(), vec.end());
  std::cout << "Sorted vector: ";
  for (int num : vec) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 列表
  std::list<int> lst = {5, 2, 8, 1, 9};
  lst.sort();
  std::cout << "Sorted list: ";
  for (int num : lst) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 映射
  std::map<std::string, int> scores;
  scores["Alice"] = 95;
  scores["Bob"] = 88;
  scores["Charlie"] = 92;
  std::cout << "Scores: " << std::endl;
  for (const auto& pair : scores) {
  std::cout << pair.first << ": " << pair.second << std::endl;
  }
  // 无序映射
  std::unordered_map<std::string, int> ages;
  ages["Alice"] = 25;
  ages["Bob"] = 30;
  ages["Charlie"] = 35;
  std::cout << "Ages: " << std::endl;
  for (const auto& pair : ages) {
  std::cout << pair.first << ": " << pair.second << std::endl;
  }
  // 栈
  std::stack<int> st;
  st.push(1);
  st.push(2);
  st.push(3);
  std::cout << "Stack top: " << st.top() << std::endl;
  st.pop();
  std::cout << "Stack top after pop: " << st.top() << std::endl;
  // 队列
  std::queue<int> q;
  q.push(1);
  q.push(2);
  q.push(3);
  std::cout << "Queue front: " << q.front() << std::endl;
  q.pop();
  std::cout << "Queue front after pop: " << q.front() << std::endl;
  // 优先队列
  std::priority_queue<int> pq;
  pq.push(3);
  pq.push(1);
  pq.push(4);
  std::cout << "Priority queue top: " << pq.top() << std::endl;
  pq.pop();
  std::cout << "Priority queue top after pop: " << pq.top() << std::endl;
  return 0;
 }
```

### 6.3 算法的综合使用

```cpp
 #include <iostream>
 #include <vector>
 #include <algorithm>
 #include <functional>
 int main() {
  std::vector<int> vec = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5};
  std::cout << "Original vector: ";
  for (int num : vec) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 排序
  std::sort(vec.begin(), vec.end());
  std::cout << "Sorted vector: ";
  for (int num : vec) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 去重
  auto last = std::unique(vec.begin(), vec.end());
  vec.erase(last, vec.end());
  std::cout << "Unique vector: ";
  for (int num : vec) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 反转
  std::reverse(vec.begin(), vec.end());
  std::cout << "Reversed vector: ";
  for (int num : vec) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 查找
  auto it = std::find(vec.begin(), vec.end(), 5);
  if (it != vec.end()) {
  std::cout << "Found 5 at position: " << std::distance(vec.begin(), it) << std::endl;
  }
  // 二分查找
  std::sort(vec.begin(), vec.end());
  bool found = std::binary_search(vec.begin(), vec.end(), 5);
  std::cout << "Binary search for 5: " << (found ? "found" : "not found") << std::endl;
  // 最值
  auto min_it = std::min_element(vec.begin(), vec.end());
  auto max_it = std::max_element(vec.begin(), vec.end());
  std::cout << "Min: " << *min_it << ", Max: " << *max_it << std::endl;
  // 计数
  int count = std::count(vec.begin(), vec.end(), 5);
  std::cout << "Count of 5: " << count << std::endl;
  // 条件计数
  int even_count = std::count_if(vec.begin(), vec.end(), [](int n) { return n % 2 == 0; });
  std::cout << "Count of even numbers: " << even_count << std::endl;
  // 转换
  std::vector<int> doubled(vec.size());
  std::transform(vec.begin(), vec.end(), doubled.begin(), [](int n) { return n * 2; });
  std::cout << "Doubled vector: ";
  for (int num : doubled) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 累积
  int sum = std::accumulate(vec.begin(), vec.end(), 0);
  std::cout << "Sum: " << sum << std::endl;
  return 0;
 }
```

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_105 拆分，专注于 STL 算法、仿函数、lambda 表达式及最佳实践。
