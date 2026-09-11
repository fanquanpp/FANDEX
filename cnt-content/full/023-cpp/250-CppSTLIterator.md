---
order: 250
title: C++ STL 迭代器
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ STL 迭代器 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 迭代器类别

**基本写法：输入迭代器**
`std::input_iterator<T>`
```cpp
// 只读、单遍递增，如 istream_iterator
std::istream_iterator<int> it(std::cin), end;
while (it != end) { std::cout << *it++; }
```

---

**基本写法：前向迭代器**
`std::forward_iterator<T>`
```cpp
// 只读或多遍递增，如 forward_list 的迭代器
std::forward_list<int> l{1, 2, 3};
for (auto it = l.begin(); it != l.end(); ++it) { *it += 1; }
```

---

**基本写法：双向迭代器**
`std::bidirectional_iterator<T>`
```cpp
// 支持递减，如 list/set/map 的迭代器
std::list<int> l{1, 2, 3};
auto it = l.end(); --it; // 指向 3
```

---

**基本写法：随机访问迭代器**
`std::random_access_iterator<T>`
```cpp
// 支持 + n / - n 与下标，如 vector/deque/array
std::vector<int> v{10, 20, 30};
auto it = v.begin() + 2; // 指向 30
```

---

**基本写法：连续迭代器（C++20）**
`std::contiguous_iterator<T>`
```cpp
// 元素连续存储，最强保证，如 vector/array
int* p = v.data(); // 等价裸指针访问
```

---

## 容器迭代器

**基本写法：begin/end**
`<容器>.begin()` / `<容器>.end()`
```cpp
// 返回首元素与尾后位置迭代器
std::vector<int> v{1, 2, 3};
for (auto it = v.begin(); it != v.end(); ++it) { std::cout << *it; }
```

---

**基本写法：只读迭代器**
`<容器>.cbegin()` / `<容器>.cend()`
```cpp
// const 版本，元素不可修改
for (auto it = v.cbegin(); it != v.cend(); ++it) { /* *it = 0; 错误 */ }
```

---

**基本写法：反向迭代器**
`<容器>.rbegin()` / `<容器>.rend()`
```cpp
// 反向遍历，rbegin 指向末元素
for (auto it = v.rbegin(); it != v.rend(); ++it) { std::cout << *it; }
```

---

**基本写法：自由函数版本**
`std::begin(<容器>)` / `std::end(<容器>)`
```cpp
// 适配原生数组与容器
int arr[] = {1, 2, 3};
auto total = std::accumulate(std::begin(arr), std::end(arr), 0);
```

---

## 迭代器辅助函数

**基本写法：距离**
`std::distance(<首>, <尾>)`
```cpp
// 计算两个迭代器间距离
auto n = std::distance(v.begin(), v.end()); // 元素个数
```

---

**基本写法：前进**
`std::advance(<迭代器>, <步数>)`
```cpp
// 原地移动迭代器，负数需双向或随机访问
auto it = v.begin();
std::advance(it, 2); // 指向第 3 个元素
```

---

**基本写法：移动到下一位置**
`std::next(<迭代器> [, <步数>])`
```cpp
// 返回前进后的副本，不修改原迭代器
auto it = std::next(v.begin()); // 指向第 2 个元素
auto it2 = std::next(v.begin(), 2);
```

---

**基本写法：移动到上一位置**
`std::prev(<迭代器> [, <步数>])`
```cpp
// 返回后退后的副本，需双向迭代器
auto it = std::prev(v.end()); // 指向末元素
```

---

## 插入迭代器

**基本写法：尾插迭代器**
`std::back_inserter(<容器>)`
```cpp
// 每次赋值调用 push_back
std::vector<int> dst;
std::copy(v.begin(), v.end(), std::back_inserter(dst));
```

---

**基本写法：头插迭代器**
`std::front_inserter(<容器>)`
```cpp
// 每次赋值调用 push_front，需有该接口
std::list<int> dst;
std::copy(v.begin(), v.end(), std::front_inserter(dst));
```

---

**基本写法：任意位置插入迭代器**
`std::inserter(<容器>, <位置>)`
```cpp
// 在指定位置前插入
auto it = std::inserter(dst, dst.begin());
```

---

**基本写法：移动迭代器**
`std::make_move_iterator(<迭代器>)`
```cpp
// 将解引用转为右值引用，触发移动
std::vector<std::string> v2(std::make_move_iterator(v.begin()),
                           std::make_move_iterator(v.end()));
```

---

## 流迭代器

**基本写法：输入流迭代器**
`std::istream_iterator<T>(<流>)`
```cpp
// 从输入流读取 T 序列
std::vector<int> v2((std::istream_iterator<int>(std::cin)),
                    std::istream_iterator<int>());
```

---

**基本写法：输出流迭代器**
`std::ostream_iterator<T>(<流> [, <分隔串>])`
```cpp
// 将元素写入输出流
std::copy(v.begin(), v.end(),
          std::ostream_iterator<int>(std::cout, ", "));
```

---

## C++20 哨兵与范围

**基本写法：哨兵判断结束**
`<范围>.end()` 可与迭代器不同类型
```cpp
// C++20 允许 end() 返回哨兵类型，如 read_until_eof 的结束判断
// 算法用 == 比较迭代器与哨兵
```

---

**基本写法：ranges 迭代器**
`std::ranges::begin(<范围>)`
```cpp
// 范式库的迭代器接口，返回第一元素
auto it = std::ranges::begin(v);
auto end = std::ranges::end(v);
```

---

**基本写法：view 迭代**
`for (auto&& <x> : <视图>)`
```cpp
// 视图是惰性迭代的轻量范围
auto even = v | std::views::filter([](int x){ return x % 2 == 0; });
for (int x : even) { std::cout << x; }
```

---

## 自定义迭代器

**基本写法：迭代器特征别名**
`std::iterator_traits<<迭代器类型>>`
```cpp
// 提取 value_type/difference_type/pointer/reference
using traits = std::iterator_traits<std::vector<int>::iterator>;
traits::value_type n = 0;
```

---

**基本写法：C++20 概念约束迭代器**
`std::input_iterator<I>`
```cpp
#include <iterator>
// 用 concept 约束模板迭代器类型
template <std::input_iterator It>
auto sum(It first, It last) {
    return std::accumulate(first, last, 0);
}
```
