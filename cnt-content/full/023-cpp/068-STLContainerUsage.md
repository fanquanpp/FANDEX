---
order: 680
title: C++ STL 容器使用语法速查手册
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ STL 容器使用速查 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## vector

**基本写法：创建 vector**
`std::vector<<类型>> <变量>;`
```cpp
// 动态数组
std::vector<int> v;
```

---

**基本写法：初始化列表**
`std::vector<<类型>> <变量> = {<元素>...};`
```cpp
// 列表初始化
std::vector<int> v = {1, 2, 3};
```

---

**基本写法：尾部添加**
`<v>.push_back(<值>);`
```cpp
// 末尾追加元素
v.push_back(4);
```

---

**基本写法：原地构造**
`<v>.emplace_back(<参数>...);`
```cpp
// 原地构造避免临时对象
v.emplace_back(42, "name");
```

---

**基本写法：访问元素**
`<v>[<索引>]` 或 `<v>.at(<索引>)`
```cpp
// at 带边界检查
int x = v.at(0);
```

---

**基本写法：删除尾部**
`<v>.pop_back();`
```cpp
// 移除末尾元素
v.pop_back();
```

---

## deque

**基本写法：双端队列**
`std::deque<<类型>> <变量>;`
```cpp
// 支持头尾高效增删
std::deque<int> dq;
```

---

**基本写法：头部添加**
`<dq>.push_front(<值>);`
```cpp
// 头部插入
dq.push_front(1);
```

---

## list / forward_list

**基本写法：双向链表**
`std::list<<类型>> <变量>;`
```cpp
// 双向链表
std::list<int> lst;
```

---

**基本写法：单链表**
`std::forward_list<<类型>> <变量>;`
```cpp
// 单向链表节省内存
std::forward_list<int> fl;
```

---

**基本写法：链表插入**
`<lst>.insert(<迭代器>, <值>);`
```cpp
// 指定位置插入
auto it = lst.begin();
lst.insert(it, 10);
```

---

**基本写法：链表删除**
`<lst>.remove(<值>);`
```cpp
// 按值删除所有匹配
lst.remove(10);
```

---

## array

**基本写法：固定大小数组**
`std::array<<类型>, <大小>> <变量>;`
```cpp
// 编译期固定大小数组
std::array<int, 5> arr = {1, 2, 3, 4, 5};
```

---

**基本写法：获取大小**
`<arr>.size()`
```cpp
// 编译期已知大小
size_t n = arr.size();
```

---

## map / unordered_map

**基本写法：有序映射**
`std::map<<键>, <值>> <变量>;`
```cpp
// 按键有序的映射
std::map<std::string, int> m;
```

---

**基本写法：哈希映射**
`std::unordered_map<<键>, <值>> <变量>;`
```cpp
// 哈希表实现查找更快
std::unordered_map<std::string, int> um;
```

---

**基本写法：插入键值对**
`<m>[<键>] = <值>;`
```cpp
// 下标操作插入或更新
m["apple"] = 3;
```

---

**基本写法：插入**
`<m>.insert({<键>, <值>});`
```cpp
// 插入键值对
m.insert({"pear", 5});
```

---

**基本写法：查找**
`<m>.find(<键>);`
```cpp
// 返回迭代器
auto it = m.find("apple");
if (it != m.end()) { /* 找到 */ }
```

---

**基本写法：判断包含 C++20**
`<m>.contains(<键>);`
```cpp
// 返回布尔值
bool has = m.contains("apple");
```

---

**基本写法：删除**
`<m>.erase(<键>);`
```cpp
// 按键删除
m.erase("apple");
```

---

## set / unordered_set

**基本写法：有序集合**
`std::set<<类型>> <变量>;`
```cpp
// 自动排序去重
std::set<int> s;
```

---

**基本写法：哈希集合**
`std::unordered_set<<类型>> <变量>;`
```cpp
// 哈希实现去重集合
std::unordered_set<int> us;
```

---

**基本写法：插入元素**
`<s>.insert(<值>);`
```cpp
// 插入元素
s.insert(10);
```

---

## stack / queue

**基本写法：栈**
`std::stack<<类型>> <变量>;`
```cpp
// 后进先出
std::stack<int> st;
st.push(1);
st.top();
st.pop();
```

---

**基本写法：队列**
`std::queue<<类型>> <变量>;`
```cpp
// 先进先出
std::queue<int> q;
q.push(1);
q.front();
q.pop();
```

---

**基本写法：优先队列**
`std::priority_queue<<类型>> <变量>;`
```cpp
// 大顶堆默认
std::priority_queue<int> pq;
pq.push(3);
pq.top();   // 最大值
```

---

**基本写法：小顶堆**
`std::priority_queue<<类型>, std::vector<<类型>>, std::greater<>> <变量>;`
```cpp
// 最小元素在顶
std::priority_queue<int, std::vector<int>, std::greater<>> min_pq;
```

---

## 通用操作

**基本写法：获取大小**
`<容器>.size()`
```cpp
// 元素个数
size_t n = v.size();
```

---

**基本写法：判断空**
`<容器>.empty()`
```cpp
// 是否为空
bool e = v.empty();
```

---

**基本写法：清空**
`<容器>.clear()`
```cpp
// 清空所有元素
v.clear();
```

---

**基本写法：遍历**
`for (auto& <项> : <容器>) { }`
```cpp
// 范围 for 循环
for (auto& x : v) { x *= 2; }
```

---

**基本写法：迭代器**
`<容器>.begin()` / `<容器>.end()`
```cpp
// 起止迭代器
for (auto it = v.begin(); it != v.end(); ++it) { }
```
