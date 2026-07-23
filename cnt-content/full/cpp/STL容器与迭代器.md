---
order: 90
tags:
  - cpp
difficulty: intermediate
title: 'C++ STL 容器与迭代器'
module: cpp
category: 'C++ Basics'
description: 顺序容器、关联容器、无序容器及迭代器体系。
author: Anonymous
related:
  - cpp/C++格式化输出
  - cpp/C++26与最新标准
  - cpp/并发编程
  - cpp/RAII资源管理
prerequisites:
  - cpp/概述与现代标准
---

## 1. 序列容器

序列容器按顺序存储元素，支持随机访问或顺序访问。

| 容器                | 描述                 | 特点                                | 示例                                     |
| :------------------ | :------------------- | :---------------------------------- | :--------------------------------------- |
| `std::vector`       | 动态数组             | 随机访问快，尾部插入/删除快         | `std::vector<int> v = {1, 2, 3};`        |
| `std::list`         | 双向链表             | 任意位置插入/删除快，不支持随机访问 | `std::list<int> l = {1, 2, 3};`          |
| `std::deque`        | 双端队列             | 两端插入/删除快，随机访问快         | `std::deque<int> d = {1, 2, 3};`         |
| `std::array`        | 固定大小数组 (C++11) | 栈上分配，随机访问快                | `std::array<int, 3> a = {1, 2, 3};`      |
| `std::forward_list` | 单向链表 (C++11)     | 空间开销小，仅支持前向遍历          | `std::forward_list<int> fl = {1, 2, 3};` |

### 1.1 std::vector

```cpp
 #include <vector>
 #include <iostream>
 int main() {
  // 创建向量
  std::vector<int> v;
  // 预分配空间
  v.reserve(10);
  // 添加元素
  v.push_back(1);
  v.push_back(2);
  v.push_back(3);
  // 访问元素
  std::cout << v[0] << std::endl; // 1 (无边界检查)
  std::cout << v.at(1) << std::endl; // 2 (有边界检查)
  // 遍历元素
  for (size_t i = 0; i < v.size(); i++) {
  std::cout << v[i] << " ";
  }
  std::cout << std::endl;
  // 范围 for 循环
  for (int num : v) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 迭代器遍历
  for (auto it = v.begin(); it != v.end(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  // 插入元素
  v.insert(v.begin() + 1, 4); // 在索引 1 处插入 4
  // 删除元素
  v.erase(v.begin() + 2); // 删除索引 2 处的元素
  // 清空容器
  v.clear();
  std::cout << "Size after clear: " << v.size() << std::endl;
  return 0;
 }
```

### 1.2 std::list

```cpp
 #include <list>
 #include <iostream>
 int main() {
  // 创建链表
  std::list<int> l = {1, 2, 3};
  // 添加元素
  l.push_front(0); // 头部添加
  l.push_back(4); // 尾部添加
  // 遍历元素
  for (int num : l) {
  std::cout << num << " ";
  }
  std::cout << std::endl; // 0 1 2 3 4
  // 插入元素
  auto it = l.begin();
  ++it; // 移动到第二个元素
  l.insert(it, 5); // 在 0 和 1 之间插入 5
  // 删除元素
  it = l.begin();
  ++it; // 指向 5
  l.erase(it); // 删除 5
  // 排序
  l.sort();
  // 合并
  std::list<int> l2 = {6, 7, 8};
  l.merge(l2);
  // 移除元素
  l.remove(3); // 移除所有值为 3 的元素
  // 移除满足条件的元素
  l.remove_if([](int n) { return n % 2 == 0; }); // 移除所有偶数
  // 遍历结果
  for (int num : l) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  return 0;
 }
```

### 1.3 std::array

```cpp
 #include <array>
 #include <iostream>
 int main() {
  // 创建数组
  std::array<int, 5> arr = {1, 2, 3, 4, 5};
  // 访问元素
  std::cout << "First element: " << arr[0] << std::endl;
  std::cout << "Last element: " << arr.back() << std::endl;
  // 遍历元素
  for (size_t i = 0; i < arr.size(); i++) {
  std::cout << arr[i] << " ";
  }
  std::cout << std::endl;
  // 范围 for 循环
  for (int num : arr) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 检查是否为空
  std::cout << "Is empty: " << (arr.empty() ? "yes" : "no") << std::endl;
  // 填充元素
  arr.fill(10);
  for (int num : arr) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  return 0;
 }
```

## 2. 关联容器

关联容器按键值对存储元素，自动排序。

| 容器            | 描述         | 特点                     | 示例                                                         |
| :-------------- | :----------- | :----------------------- | :----------------------------------------------------------- |
| `std::set`      | 有序集合     | 自动排序，无重复元素     | `std::set<int> s = {3, 1, 2};`                               |
| `std::map`      | 有序键值对   | 自动按键排序             | `std::map<std::string, int> m = {{"a", 1}, {"b", 2}};`       |
| `std::multiset` | 有序多重集合 | 自动排序，允许重复元素   | `std::multiset<int> ms = {1, 2, 1, 3};`                      |
| `std::multimap` | 有序多重映射 | 自动按键排序，允许重复键 | `std::multimap<std::string, int> mm = {{"a", 1}, {"a", 2}};` |

### 2.1 std::map

```cpp
 #include <map>
 #include <iostream>
 int main() {
  // 创建映射
  std::map<std::string, int> m;
  // 添加元素
  m["Alice"] = 25;
  m["Bob"] = 30;
  m["Charlie"] = 35;
  // 插入元素的另一种方式
  m.insert(std::make_pair("David", 40));
  m.insert({"Eve", 45});
  // 访问元素
  std::cout << m["Alice"] << std::endl; // 25
  // 检查键是否存在
  if (m.find("David") != m.end()) {
  std::cout << "David found: " << m["David"] << std::endl;
  } else {
  std::cout << "David not found" << std::endl;
  }
  // 使用 at() 访问（有边界检查）
  try {
  std::cout << m.at("Bob") << std::endl;
  // std::cout << m.at("Frank") << std::endl; // 会抛出异常
  } catch (const std::out_of_range& e) {
  std::cout << "Exception: " << e.what() << std::endl;
  }
  // 遍历元素
  for (const auto& pair : m) {
  std::cout << pair.first << ": " << pair.second << std::endl;
  }
  // 删除元素
  m.erase("Bob");
  // 清空容器
  // m.clear();
  return 0;
 }
```

### 2.2 std::multimap

```cpp
 #include <map>
 #include <iostream>
 int main() {
  // 创建多重映射
  std::multimap<std::string, int> mm;
  // 添加元素
  mm.insert({"Alice", 25});
  mm.insert({"Alice", 30});
  mm.insert({"Bob", 35});
  mm.insert({"Bob", 40});
  mm.insert({"Charlie", 45});
  // 遍历所有元素
  std::cout << "All elements: " << std::endl;
  for (const auto& pair : mm) {
  std::cout << pair.first << ": " << pair.second << std::endl;
  }
  // 查找特定键的范围
  std::cout << "\nAlice's entries: " << std::endl;
  auto range = mm.equal_range("Alice");
  for (auto it = range.first; it != range.second; ++it) {
  std::cout << it->first << ": " << it->second << std::endl;
  }
  // 计算特定键的元素个数
  std::cout << "\nNumber of Bob's entries: " << mm.count("Bob") << std::endl;
  return 0;
 }
```

## 3. 无序容器 (C++11)

无序容器使用哈希表实现，提供平均常数时间的查找、插入和删除操作。

| 容器                      | 描述         | 特点                     | 示例                                                                    |
| :------------------------ | :----------- | :----------------------- | :---------------------------------------------------------------------- |
| `std::unordered_set`      | 无序集合     | 哈希表实现，无序         | `std::unordered_set<int> us = {3, 1, 2};`                               |
| `std::unordered_map`      | 无序键值对   | 哈希表实现，无序         | `std::unordered_map<std::string, int> um = {{"a", 1}, {"b", 2}};`       |
| `std::unordered_multiset` | 无序多重集合 | 哈希表实现，允许重复元素 | `std::unordered_multiset<int> ums = {1, 2, 1, 3};`                      |
| `std::unordered_multimap` | 无序多重映射 | 哈希表实现，允许重复键   | `std::unordered_multimap<std::string, int> umm = {{"a", 1}, {"a", 2}};` |

### 3.1 std::unordered_map

```cpp
 #include <unordered_map>
 #include <iostream>
 int main() {
  // 创建无序映射
  std::unordered_map<std::string, int> um;
  // 添加元素
  um["Alice"] = 25;
  um["Bob"] = 30;
  um["Charlie"] = 35;
  // 访问元素
  std::cout << um["Alice"] << std::endl; // 25
  // 遍历元素（顺序不确定）
  std::cout << "Elements: " << std::endl;
  for (const auto& pair : um) {
  std::cout << pair.first << ": " << pair.second << std::endl;
  }
  // 桶相关操作
  std::cout << "Bucket count: " << um.bucket_count() << std::endl;
  std::cout << "Load factor: " << um.load_factor() << std::endl;
  std::cout << "Max load factor: " << um.max_load_factor() << std::endl;
  // 查找元素
  auto it = um.find("Bob");
  if (it != um.end()) {
  std::cout << "Found Bob: " << it->second << std::endl;
  }
  // 删除元素
  um.erase("Charlie");
  return 0;
 }
```

## 4. 容器适配器

容器适配器是对现有容器的封装，提供特定的接口。

| 容器                  | 描述               | 底层容器        | 示例                                       |
| :-------------------- | :----------------- | :-------------- | :----------------------------------------- |
| `std::stack`          | 栈（后进先出）     | `deque` (默认)  | `std::stack<int> st; st.push(1);`          |
| `std::queue`          | 队列（先进先出）   | `deque` (默认)  | `std::queue<int> q; q.push(1);`            |
| `std::priority_queue` | 优先队列（最大堆） | `vector` (默认) | `std::priority_queue<int> pq; pq.push(1);` |

### 4.1 std::stack

```cpp
 #include <stack>
 #include <iostream>
 int main() {
  // 创建栈
  std::stack<int> st;
  // 压入元素
  st.push(1);
  st.push(2);
  st.push(3);
  // 查看栈顶元素
  std::cout << "Top: " << st.top() << std::endl; // 3
  // 弹出元素
  st.pop();
  std::cout << "Top after pop: " << st.top() << std::endl; // 2
  // 检查大小
  std::cout << "Size: " << st.size() << std::endl; // 2
  // 检查是否为空
  std::cout << "Empty: " << (st.empty() ? "yes" : "no") << std::endl; // no
  // 清空栈
  while (!st.empty()) {
  st.pop();
  }
  std::cout << "Size after clear: " << st.size() << std::endl; // 0
  return 0;
 }
```

### 4.2 std::queue

```cpp
 #include <queue>
 #include <iostream>
 int main() {
  // 创建队列
  std::queue<int> q;
  // 入队
  q.push(1);
  q.push(2);
  q.push(3);
  // 查看队首元素
  std::cout << "Front: " << q.front() << std::endl; // 1
  // 查看队尾元素
  std::cout << "Back: " << q.back() << std::endl; // 3
  // 出队
  q.pop();
  std::cout << "Front after pop: " << q.front() << std::endl; // 2
  // 检查大小
  std::cout << "Size: " << q.size() << std::endl; // 2
  // 检查是否为空
  std::cout << "Empty: " << (q.empty() ? "yes" : "no") << std::endl; // no
  return 0;
 }
```

### 4.3 std::priority_queue

```cpp
 #include <queue>
 #include <vector>
 #include <iostream>
 // 自定义类型
 struct Person {
  std::string name;
  int age;
  Person(const std::string& n, int a) : name(n), age(a) {}
  // 重载 < 运算符（用于最大堆）
  bool operator<(const Person& other) const {
  return age < other.age; // 年龄大的优先级高
  }
 }
 int main() {
  // 创建优先队列（默认最大堆）
  std::priority_queue<int> pq;
  // 压入元素
  pq.push(3);
  pq.push(1);
  pq.push(4);
  pq.push(1);
  pq.push(5);
  // 查看队首元素（最大值）
  std::cout << "Top: " << pq.top() << std::endl; // 5
  // 弹出元素
  pq.pop();
  std::cout << "Top after pop: " << pq.top() << std::endl; // 4
  // 创建最小堆
  std::priority_queue<int, std::vector<int>, std::greater<int>> min_pq;
  min_pq.push(3);
  min_pq.push(1);
  min_pq.push(4);
  std::cout << "Min top: " << min_pq.top() << std::endl; // 1
  // 使用自定义类型
  std::priority_queue<Person> person_pq;
  person_pq.emplace("Alice", 25);
  person_pq.emplace("Bob", 30);
  person_pq.emplace("Charlie", 20);
  while (!person_pq.empty()) {
  const Person& p = person_pq.top();
  std::cout << p.name << " (" << p.age << ")" << std::endl;
  person_pq.pop();
  }
  // 输出：Bob (30), Alice (25), Charlie (20)
  return 0;
 }
```

## 5. 迭代器 (Iterators)

迭代器是连接容器与算法的桥梁，提供了访问容器元素的统一接口。

### 5.1 迭代器类型

| 迭代器类型         | 描述               | 支持的操作                                                   |
| :----------------- | :----------------- | :----------------------------------------------------------- |
| **输入迭代器**     | 只读，单向移动     | `++`, `*`, `==`, `!=`                                        |
| **输出迭代器**     | 只写，单向移动     | `++`, `*`                                                    |
| **前向迭代器**     | 可读可写，单向移动 | `++`, `*`, `==`, `!=`                                        |
| **双向迭代器**     | 可读可写，双向移动 | `++`, `--`, `*`, `==`, `!=`                                  |
| **随机访问迭代器** | 可读可写，随机访问 | `++`, `--`, `+`, `-`, `[]`, `==`, `!=`, `<`, `>`, `<=`, `>=` |

### 5.2 迭代器使用示例

```cpp
 #include <vector>
 #include <list>
 #include <iostream>
 int main() {
  // 向量迭代器（随机访问）
  std::vector<int> vec = {1, 2, 3, 4, 5};
  std::cout << "Vector elements: ";
  for (std::vector<int>::iterator it = vec.begin(); it != vec.end(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  // 常量迭代器
  std::cout << "Vector elements (const): ";
  for (std::vector<int>::const_iterator it = vec.cbegin(); it != vec.cend(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  // 列表迭代器（双向）
  std::list<int> lst = {1, 2, 3, 4, 5};
  std::cout << "List elements: ";
  for (std::list<int>::const_iterator it = lst.cbegin(); it != lst.cend(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  // 反向迭代器
  std::cout << "Vector reversed: ";
  for (std::vector<int>::reverse_iterator it = vec.rbegin(); it != vec.rend(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  // 常量反向迭代器
  std::cout << "Vector reversed (const): ";
  for (std::vector<int>::const_reverse_iterator it = vec.crbegin(); it != vec.crend(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  // 范围 for 循环 (C++11)
  std::cout << "Range for: ";
  for (int num : vec) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 使用 auto 简化迭代器声明
  std::cout << "Using auto: ";
  for (auto it = vec.begin(); it != vec.end(); ++it) {
  std::cout << *it << " ";
  }
  std::cout << std::endl;
  return 0;
 }
```

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_105 拆分，专注于 STL 容器与迭代器。
