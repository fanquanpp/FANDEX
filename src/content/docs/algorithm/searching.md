---
order: 30
tags:
  - 'algorithm'
  - 'data-structure'
difficulty: 'intermediate'
title: '搜索算法'
module: 'algorithm'
category: 'Algorithm/Searching'
description: '线性搜索、二分搜索、哈希查找、广度优先搜索与深度优先搜索的原理、复杂度分析与多语言实现。'
author: 'fanquanpp'
---

- [6. 深度优先搜索 (DFS)](#6-深度优先搜索-dfs)
- [7. 搜索策略对比](#7-搜索策略对比)
- [8. 搜索算法速查表](#8-搜索算法速查表)
- [9. 延伸阅读](#9-延伸阅读)

---

## 1. 搜索问题总论

### 1.1 搜索问题的分类

搜索是计算机科学中最基础的操作之一。根据不同维度，搜索问题可做如下分类：
**按数据组织方式**：

- 静态搜索：数据集合不变，只需支持查找操作
- 动态搜索：数据集合动态变化，需支持插入、删除、查找
  **按匹配方式**：
- 精确匹配：查找与目标完全相等的元素
- 近似匹配：查找最接近目标的元素（如最近邻搜索）
- 范围查询：查找满足范围条件的所有元素
  **按数据结构**：
- 线性结构搜索：数组、链表
- 树形结构搜索：BST、B树、Trie
- 图结构搜索：BFS、DFS
- 哈希结构搜索：哈希表

### 1.2 搜索的评估指标

| 指标             | 定义                         | 典型值       |
| ---------------- | ---------------------------- | ------------ |
| 查找成功ASL      | 找到元素的平均比较次数       | 依赖数据结构 |
| 查找失败ASL      | 确定元素不存在的平均比较次数 | 依赖数据结构 |
| 最坏情况比较次数 | 任何输入下的最大比较次数     | 衡量保证     |
| 空间开销         | 额外存储需求                 | 权衡因素     |

> 跨模块引用：搜索算法的复杂度分析基于 [算法分析基础](algorithm/overview) 中的渐进符号。排序是搜索的预处理步骤，参见 [排序算法](algorithm/sorting)。

---

## 2. 线性搜索

### 2.1 问题描述

在无序数组中查找目标值，返回其下标（不存在则返回-1）。

### 2.2 思路分析

线性搜索是最朴素的搜索策略：从头到尾逐个比较。虽然简单，但在以下场景中不可替代：

- 数据量小（n < 20），线性搜索的常数因子最小
- 数据无序且只需查找一次，排序的预处理成本不值得
- 数据存储在链表等不支持随机访问的结构中
  **哨兵优化**：在数组末尾放置目标值作为哨兵，省去每次循环的越界检查。

```
 普通线性搜索:
 for i in range(n):
  if arr[i] == target: # 每次需要检查 i < n
  return i
 哨兵搜索:
 arr.append(target) # 末尾放哨兵
 i = 0
 while arr[i] != target: # 只需一次比较
  i += 1
 arr.pop()
 return i if i < n else -1
```

### 2.3 复杂度分析

| 指标         | 无序数组 | 有序数组         |
| ------------ | -------- | ---------------- |
| 查找成功ASL  | (n+1)/2  | (n+1)/2          |
| 查找失败ASL  | n        | n/2 (可提前终止) |
| 最坏比较次数 | n        | n                |
| 时间复杂度   | O(n)     | O(n)             |

空间复杂度：O(1)。

### 2.4 代码实现

```python
 def linear_search(arr, target):
  for i, val in enumerate(arr):
  if val == target:
  return i
  return -1
 def linear_search_sentinel(arr, target):
  arr.append(target)
  i = 0
  while arr[i] != target:
  i += 1
  arr.pop()
  return i if i < len(arr) else -1
 def linear_search_ordered(arr, target):
  for i, val in enumerate(arr):
  if val == target:
  return i
  if val > target:
  return -1
  return -1
```

```cpp
 int linearSearch(const vector<int>& arr, int target) {
  for (int i = 0; i < arr.size(); i++) {
  if (arr[i] == target) return i;
  }
  return -1;
 True}
 int linearSearchSentinel(vector<int>& arr, int target) {
  arr.push_back(target);
  int i = 0;
  while (arr[i] != target) i++;
  arr.pop_back();
  return (i < arr.size()) ? i : -1;
 True}
 int linearSearchOrdered(const vector<int>& arr, int target) {
  for (int i = 0; i < arr.size(); i++) {
  if (arr[i] == target) return i;
  if (arr[i] > target) return -1;
  }
  return -1;
 True}
```

---

## 3. 二分搜索

### 3.1 问题描述

在有序数组中查找目标值，利用有序性每次将搜索范围缩小一半。

### 3.2 思路分析

二分搜索的核心是**循环不变量**：每次迭代后，目标值（若存在）一定在[lo, hi]范围内。

```
 数组: [1, 3, 5, 7, 9, 11, 13, 15], target = 7
 第1轮: lo=0, hi=7, mid=3, arr[3]=7 == target, 找到!
```

更复杂的例子：

```
 数组: [1, 3, 5, 7, 9, 11, 13, 15], target = 6
 第1轮: lo=0, hi=7, mid=3, arr[3]=7 > 6, hi=2
 第2轮: lo=0, hi=2, mid=1, arr[1]=3 < 6, lo=2
 第3轮: lo=2, hi=2, mid=2, arr[2]=5 < 6, lo=3
 lo > hi, 未找到
```

### 3.3 经典二分及其变种

**标准二分**：查找目标值，存在返回下标，不存在返回-1。
**左边界二分**：查找第一个等于目标值的元素（lower_bound）。
**右边界二分**：查找最后一个等于目标值的元素（upper_bound - 1）。
**旋转数组搜索**：在旋转有序数组中搜索。
**峰值查找**：在先增后减的数组中找峰值。

### 3.4 复杂度分析

每次迭代将搜索范围减半：n -> n/2 -> n/4 -> ... -> 1
最多迭代 log2(n) 次，因此时间复杂度为 O(log n)。
空间复杂度：迭代版O(1)，递归版O(log n)。

### 3.5 代码实现

```python
 def binary_search(arr, target):
  lo, hi = 0, len(arr) - 1
  while lo <= hi:
  mid = lo + (hi - lo) // 2
  if arr[mid] == target:
  return mid
  elif arr[mid] < target:
  lo = mid + 1
  else:
  hi = mid - 1
  return -1
 def lower_bound(arr, target):
  lo, hi = 0, len(arr)
  while lo < hi:
  mid = lo + (hi - lo) // 2
  if arr[mid] < target:
  lo = mid + 1
  else:
  hi = mid
  return lo
 def upper_bound(arr, target):
  lo, hi = 0, len(arr)
  while lo < hi:
  mid = lo + (hi - lo) // 2
  if arr[mid] <= target:
  lo = mid + 1
  else:
  hi = mid
  return lo
 def search_rotated(arr, target):
  lo, hi = 0, len(arr) - 1
  while lo <= hi:
  mid = lo + (hi - lo) // 2
  if arr[mid] == target:
  return mid
  if arr[lo] <= arr[mid]:
  if arr[lo] <= target < arr[mid]:
  hi = mid - 1
  else:
  lo = mid + 1
  else:
  if arr[mid] < target <= arr[hi]:
  lo = mid + 1
  else:
  hi = mid - 1
  return -1
 def find_peak(arr):
  lo, hi = 0, len(arr) - 1
  while lo < hi:
  mid = lo + (hi - lo) // 2
  if arr[mid] < arr[mid + 1]:
  lo = mid + 1
  else:
  hi = mid
  return lo
```

```cpp
 int binarySearch(const vector<int>& arr, int target) {
  int lo = 0, hi = arr.size() - 1;
  while (lo <= hi) {
  int mid = lo + (hi - lo) / 2;
  if (arr[mid] == target) return mid;
  else if (arr[mid] < target) lo = mid + 1;
  else hi = mid - 1;
  }
  return -1;
 True}
 int lowerBound(const vector<int>& arr, int target) {
  int lo = 0, hi = arr.size();
  while (lo < hi) {
  int mid = lo + (hi - lo) / 2;
  if (arr[mid] < target) lo = mid + 1;
  else hi = mid;
  }
  return lo;
 True}
 int upperBound(const vector<int>& arr, int target) {
  int lo = 0, hi = arr.size();
  while (lo < hi) {
  int mid = lo + (hi - lo) / 2;
  if (arr[mid] <= target) lo = mid + 1;
  else hi = mid;
  }
  return lo;
 True}
 int searchRotated(const vector<int>& arr, int target) {
  int lo = 0, hi = arr.size() - 1;
  while (lo <= hi) {
  int mid = lo + (hi - lo) / 2;
  if (arr[mid] == target) return mid;
  if (arr[lo] <= arr[mid]) {
  if (arr[lo] <= target && target < arr[mid]) hi = mid - 1;
  else lo = mid + 1;
  } else {
  if (arr[mid] < target && target <= arr[hi]) lo = mid + 1;
  else hi = mid - 1;
  }
  }
  return -1;
 True}
 int findPeak(const vector<int>& arr) {
  int lo = 0, hi = arr.size() - 1;
  while (lo < hi) {
  int mid = lo + (hi - lo) / 2;
  if (arr[mid] < arr[mid + 1]) lo = mid + 1;
  else hi = mid;
  }
  return lo;
 True}
```

### 3.6 二分答案（参数搜索）

当问题的判定比求解更容易时，可以对答案进行二分搜索：

1. 确定答案的取值范围[lo, hi]
2. 对mid判断是否可行（判定问题）
3. 根据判定结果缩小范围
   **经典应用**：最小化最大值、最大化最小值、第k小问题。

```python
 def binary_search_answer(lo, hi, check):
  while lo < hi:
  mid = lo + (hi - lo) // 2
  if check(mid):
  hi = mid
  else:
  lo = mid + 1
  return lo
```

### 3.7 变体与优化

**快速选择（Quickselect）**：在无序数组中找第k小元素，平均O(n)，最坏O(n^2)。

```python
 import random
 def quickselect(arr, k):
  def select(lo, hi, k):
  if lo == hi:
  return arr[lo]
  pivot_idx = random.randint(lo, hi)
  arr[pivot_idx], arr[hi] = arr[hi], arr[pivot_idx]
  pivot = arr[hi]
  i = lo - 1
  for j in range(lo, hi):
  if arr[j] <= pivot:
  i += 1
  arr[i], arr[j] = arr[j], arr[i]
  arr[i + 1], arr[hi] = arr[hi], arr[i + 1]
  pivot_idx = i + 1
  if k == pivot_idx:
  return arr[k]
  elif k < pivot_idx:
  return select(lo, pivot_idx - 1, k)
  else:
  return select(pivot_idx + 1, hi, k)
  return select(0, len(arr) - 1, k)
```

```cpp
 int quickselect(vector<int>& arr, int k) {
  int lo = 0, hi = arr.size() - 1;
  while (lo < hi) {
  int pivotIdx = lo + rand() % (hi - lo + 1);
  swap(arr[pivotIdx], arr[hi]);
  int pivot = arr[hi];
  int i = lo - 1;
  for (int j = lo; j < hi; j++) {
  if (arr[j] <= pivot) { i++; swap(arr[i], arr[j]); }
  }
  swap(arr[i + 1], arr[hi]);
  pivotIdx = i + 1;
  if (k == pivotIdx) return arr[k];
  else if (k < pivotIdx) hi = pivotIdx - 1;
  else lo = pivotIdx + 1;
  }
  return arr[lo];
 True}
```

> 跨模块引用：快速选择的分区思想来源于 [排序算法](algorithm/sorting) 中的快速排序。

---

## 4. 哈希查找

### 4.1 问题描述

通过哈希函数将键映射到数组下标，实现O(1)平均时间的查找。

### 4.2 思路分析

哈希查找的核心思想是"直接寻址"的推广：

- 直接寻址表：键k直接存储在数组位置k。当键域U很大但实际键很少时浪费空间。
- 哈希表：用哈希函数h(k)将键映射到有限的槽位中，空间O(m)（m为槽位数）。
  冲突是不可避免的（鸽巢原理），因此需要冲突处理策略。

### 4.3 复杂度分析

| 操作 | 平均 | 最坏 |
| ---- | ---- | ---- |
| 查找 | O(1) | O(n) |
| 插入 | O(1) | O(n) |
| 删除 | O(1) | O(n) |

最坏情况发生在所有键都映射到同一个槽位（哈希函数退化）。

### 4.4 代码实现

```python
 class HashTable:
  def __init__(self, capacity=16):
  self.capacity = capacity
  self.size = 0
  self.buckets = [[] for _ in range(capacity)]
  def _hash(self, key):
  return hash(key) % self.capacity
  def _resize(self):
  old_buckets = self.buckets
  self.capacity *= 2
  self.buckets = [[] for _ in range(self.capacity)]
  self.size = 0
  for bucket in old_buckets:
  for k, v in bucket:
  self.put(k, v)
  def put(self, key, value):
  if self.size >= self.capacity * 0.75:
  self._resize()
  idx = self._hash(key)
  bucket = self.buckets[idx]
  for i, (k, v) in enumerate(bucket):
  if k == key:
  bucket[i] = (key, value)
  return
  bucket.append((key, value))
  self.size += 1
  def get(self, key):
  idx = self._hash(key)
  bucket = self.buckets[idx]
  for k, v in bucket:
  if k == key:
  return v
  return None
  def remove(self, key):
  idx = self._hash(key)
  bucket = self.buckets[idx]
  for i, (k, v) in enumerate(bucket):
  if k == key:
  del bucket[i]
  self.size -= 1
  return
```

```cpp
 #include <vector>
 #include <list>
 #include <functional>
 using namespace std;
 template<typename K, typename V>
 class HashTable {
  vector<list<pair<K,V>>> buckets;
  int sz;
  int capacity;
  int hashFunc(const K& key) const {
  return hash<K>()(key) % capacity;
  }
  void resize() {
  vector<list<pair<K,V>>> oldBuckets = move(buckets);
  capacity *= 2;
  buckets.assign(capacity, list<pair<K,V>>());
  sz = 0;
  for (auto& bucket : oldBuckets) {
  for (auto& kv : bucket) {
  put(kv.first, kv.second);
  }
  }
  }
 public:
  HashTable(int cap = 16) : capacity(cap), sz(0) {
  buckets.assign(capacity, list<pair<K,V>>());
  }
  void put(const K& key, const V& value) {
  if (sz >= capacity * 0.75) resize();
  int idx = hashFunc(key);
  for (auto& kv : buckets[idx]) {
  if (kv.first == key) { kv.second = value; return; }
  }
  buckets[idx].push_back({key, value});
  sz++;
  }
  V* get(const K& key) {
  int idx = hashFunc(key);
  for (auto& kv : buckets[idx]) {
  if (kv.first == key) return &kv.second;
  }
  return nullptr;
  }
  void remove(const K& key) {
  int idx = hashFunc(key);
  auto& bucket = buckets[idx];
  for (auto it = bucket.begin(); it != bucket.end(); ++it) {
  if (it->first == key) { bucket.erase(it); sz--; return; }
  }
  }
 True};
```

> 跨模块引用：哈希表的完整分析参见 [哈希表](algorithm/hashtable)。

---

## 5. 广度优先搜索 (BFS)

### 5.1 问题描述

从起始节点出发，按层次逐步扩展，先访问距离为1的所有节点，再访问距离为2的节点，依此类推。

### 5.2 思路分析

BFS使用队列作为核心数据结构，保证节点按距离递增的顺序被访问：

```
 图: 0 -- 1 -- 3
  | |
  2 -- 4 -- 5
 BFS从0出发:
 第0层: {0}
 第1层: {1, 2}
 第2层: {3, 4}
 第3层: {5}
 访问顺序: 0, 1, 2, 3, 4, 5
```

BFS的关键性质：在无权图中，BFS首次到达某节点时的路径就是最短路径。

### 5.3 复杂度分析

- 时间复杂度：O(V + E)，每个顶点和边最多访问一次
- 空间复杂度：O(V)，队列和visited数组

### 5.4 代码实现

```python
 from collections import deque, defaultdict
 def bfs(graph, start):
  visited = set([start])
  queue = deque([start])
  order = []
  while queue:
  node = queue.popleft()
  order.append(node)
  for neighbor in graph[node]:
  if neighbor not in visited:
  visited.add(neighbor)
  queue.append(neighbor)
  return order
 def bfs_shortest_path(graph, start, end):
  visited = set([start])
  queue = deque([(start, [start])])
  while queue:
  node, path = queue.popleft()
  if node == end:
  return path
  for neighbor in graph[node]:
  if neighbor not in visited:
  visited.add(neighbor)
  queue.append((neighbor, path + [neighbor]))
  return None
 def bfs_distance(graph, start):
  dist = {start: 0}
  queue = deque([start])
  while queue:
  node = queue.popleft()
  for neighbor in graph[node]:
  if neighbor not in dist:
  dist[neighbor] = dist[node] + 1
  queue.append(neighbor)
  return dist
```

```cpp
 #include <vector>
 #include <queue>
 #include <unordered_set>
 #include <unordered_map>
 using namespace std;
 vector<int> bfs(const vector<vector<int>>& graph, int start) {
  int n = graph.size();
  vector<bool> visited(n, false);
  vector<int> order;
  queue<int> q;
  visited[start] = true;
  q.push(start);
  while (!q.empty()) {
  int node = q.front(); q.pop();
  order.push_back(node);
  for (int neighbor : graph[node]) {
  if (!visited[neighbor]) {
  visited[neighbor] = true;
  q.push(neighbor);
  }
  }
  }
  return order;
 True}
 unordered_map<int, int> bfsDistance(const vector<vector<int>>& graph, int start) {
  unordered_map<int, int> dist;
  queue<int> q;
  dist[start] = 0;
  q.push(start);
  while (!q.empty()) {
  int node = q.front(); q.pop();
  for (int neighbor : graph[node]) {
  if (dist.find(neighbor) == dist.end()) {
  dist[neighbor] = dist[node] + 1;
  q.push(neighbor);
  }
  }
  }
  return dist;
 True}
```

### 5.5 BFS的应用

1. **无权最短路径**：BFS天然保证按距离递增访问
2. **连通分量**：对每个未访问节点启动BFS
3. **层序遍历**：二叉树的按层输出
4. **拓扑排序**：Kahn算法（BFS入度法）
5. **状态空间搜索**：八数码、走迷宫等
   > 跨模块引用：BFS在图中的应用详见 [图论算法](algorithm/graph)，树中层序遍历参见 [树结构](algorithm/tree)。

---

## 6. 深度优先搜索 (DFS)

### 6.1 问题描述

从起始节点出发，沿一条路径尽可能深入，无法继续时回溯到上一个分支点，尝试其他路径。

### 6.2 思路分析

DFS使用栈（或递归调用栈）作为核心数据结构：

```
 图: 0 -- 1 -- 3
  | |
  2 -- 4 -- 5
 DFS从0出发（递归版）:
 访问0 -> 访问1 -> 访问3（回溯）-> 访问4 -> 访问5（回溯）-> 访问2
 访问顺序: 0, 1, 3, 4, 5, 2
```

DFS的关键性质：通过时间戳和颜色标记，可以识别图的拓扑结构。
**颜色标记法**：

- 白色：未发现
- 灰色：已发现但未完成
- 黑色：已完成
  **边的分类**：
- 树边：DFS树中的边
- 回边：指向祖先节点的边（灰色节点），表示存在环
- 前向边：指向后代节点的边（黑色节点，非树边）
- 横叉边：指向其他DFS子树的边（黑色节点）

### 6.3 复杂度分析

- 时间复杂度：O(V + E)
- 空间复杂度：O(V)（递归栈和visited数组）

### 6.4 代码实现

```python
 def dfs_recursive(graph, start, visited=None, order=None):
  if visited is None:
  visited = set()
  if order is None:
  order = []
  visited.add(start)
  order.append(start)
  for neighbor in graph[start]:
  if neighbor not in visited:
  dfs_recursive(graph, neighbor, visited, order)
  return order
 def dfs_iterative(graph, start):
  visited = set([start])
  stack = [start]
  order = []
  while stack:
  node = stack.pop()
  order.append(node)
  for neighbor in reversed(graph[node]):
  if neighbor not in visited:
  visited.add(neighbor)
  stack.append(neighbor)
  return order
 def dfs_cycle_detect(graph):
  n = len(graph)
  WHITE, GRAY, BLACK = 0, 1, 2
  color = [WHITE] * n
  has_cycle = False
  def dfs(node):
  nonlocal has_cycle
  color[node] = GRAY
  for neighbor in graph[node]:
  if color[neighbor] == GRAY:
  has_cycle =
  return
  if color[neighbor] == WHITE:
  dfs(neighbor)
  color[node] = BLACK
  for i in range(n):
  if color[i] == WHITE:
  dfs(i)
  return has_cycle
 def dfs_topological_sort(graph):
  n = len(graph)
  visited = [False] * n
  order = []
  def dfs(node):
  visited[node] =
  for neighbor in graph[node]:
  if not visited[neighbor]:
  dfs(neighbor)
  order.append(node)
  for i in range(n):
  if not visited[i]:
  dfs(i)
  return order[::-1]
```

```cpp
 #include <vector>
 #include <stack>
 #include <algorithm>
 using namespace std;
 void dfsRecursive(const vector<vector<int>>& graph, int node,
  vector<bool>& visited, vector<int>& order) {
  visited[node] = true;
  order.push_back(node);
  for (int neighbor : graph[node]) {
  if (!visited[neighbor]) {
  dfsRecursive(graph, neighbor, visited, order);
  }
  }
 True}
 vector<int> dfsIterative(const vector<vector<int>>& graph, int start) {
  int n = graph.size();
  vector<bool> visited(n, false);
  vector<int> order;
  stack<int> stk;
  visited[start] = true;
  stk.push(start);
  while (!stk.empty()) {
  int node = stk.top(); stk.pop();
  order.push_back(node);
  for (int i = graph[node].size() - 1; i >= 0; i--) {
  int neighbor = graph[node][i];
  if (!visited[neighbor]) {
  visited[neighbor] = true;
  stk.push(neighbor);
  }
  }
  }
  return order;
 True}
 bool dfsCycleDetect(const vector<vector<int>>& graph) {
  int n = graph.size();
  vector<int> color(n, 0);
  bool hasCycle = false;
  function<void(int)> dfs = [&](int node) {
  color[node] = 1;
  for (int neighbor : graph[node]) {
  if (color[neighbor] == 1) { hasCycle = true; return; }
  if (color[neighbor] == 0) dfs(neighbor);
  }
  color[node] = 2;
  };
  for (int i = 0; i < n; i++) {
  if (color[i] == 0) dfs(i);
  }
  return hasCycle;
 True}
```

### 6.5 DFS的应用

1. **环检测**：遇到灰色节点即发现环
2. **拓扑排序**：DFS后序逆序
3. **连通分量**：对每个未访问节点启动DFS
4. **回溯搜索**：排列、组合、子集等问题
5. **割点与桥**：Tarjan算法
6. **强连通分量**：Kosaraju/Tarjan算法
   > 跨模块引用：DFS在图论中的深入应用参见 [图论算法](algorithm/graph)。

---

## 7. 搜索策略对比

### 7.1 综合对比表

| 算法     | 数据结构要求 | 时间复杂度 | 空间复杂度 | 典型应用         |
| -------- | ------------ | ---------- | ---------- | ---------------- |
| 线性搜索 | 无           | O(n)       | O(1)       | 无序小规模数据   |
| 二分搜索 | 有序数组     | O(log n)   | O(1)       | 有序数据查找     |
| 哈希查找 | 哈希表       | O(1)\*     | O(n)       | 快速键值查找     |
| BFS      | 图/树        | O(V+E)     | O(V)       | 最短路径、层序   |
| DFS      | 图/树        | O(V+E)     | O(V)       | 环检测、拓扑排序 |

\*平均复杂度

### 7.2 搜索策略选择决策树

```
 数据是否有序？
 |-- 否 --> 数据量是否小(n<50)？ --是--> 线性搜索
 | |
 | +--否--> 是否需要频繁查找？ --是--> 建立哈希表
 | |
 | +--否--> 排序后二分搜索
 |
 True+--是 --> 是否需要精确匹配？ --是--> 二分搜索
  |
  +--否--> 是否需要范围查询？ --是--> BST/B树
  |
  +--否--> 二分搜索变种
```

### 7.3 BFS vs DFS 选择指南

| 场景             | 选择 | 原因              |
| ---------------- | ---- | ----------------- |
| 求最短路径(无权) | BFS  | 天然按距离递增    |
| 检测环           | DFS  | 回边检测更自然    |
| 拓扑排序         | DFS  | 后序逆序          |
| 层次遍历         | BFS  | 按层输出          |
| 求所有路径       | DFS  | 回溯枚举          |
| 连通分量         | 均可 | 效率相同          |
| 空间受限(深图)   | BFS  | DFS栈深度可能很大 |
| 空间受限(宽图)   | DFS  | BFS队列可能很大   |

---

## 8. 搜索算法速查表

| 算法       | 最好    | 平均       | 最坏    | 空间 | 前置条件      |
| ---------- | ------- | ---------- | ------- | ---- | ------------- |
| 线性搜索   | O(1)    | O(n)       | O(n)    | O(1) | 无            |
| 二分搜索   | O(1)    | O(logn)    | O(logn) | O(1) | 有序          |
| 插值搜索   | O(1)    | O(loglogn) | O(n)    | O(1) | 有序+均匀分布 |
| 哈希查找   | O(1)    | O(1)       | O(n)    | O(n) | 哈希表        |
| BST查找    | O(1)    | O(logn)    | O(n)    | O(n) | BST           |
| 红黑树查找 | O(logn) | O(logn)    | O(logn) | O(n) | 红黑树        |
| BFS        | O(V+E)  | O(V+E)     | O(V+E)  | O(V) | 图            |
| DFS        | O(V+E)  | O(V+E)     | O(V+E)  | O(V) | 图            |

---

## 9. 延伸阅读

- CLRS 第 11 章（哈希表）、第 22 章（BFS/DFS）
- 《算法竞赛入门经典》(刘汝佳) 搜索专题
- [Binary Search -- VisuAlgo](https://visualgo.net/en/bst)
- Sedgewick & Wayne, _Algorithms_, Chapter 3 (Searching)
- Knuth, _The Art of Computer Programming_, Vol.3, Sorting and Searching
  > 跨模块引用：搜索算法的实现语言基础参见 [C++基础](cpp/overview) 和 [Python基础](python/overview)。哈希表细节参见 [哈希表](algorithm/hashtable)，图搜索参见 [图论算法](algorithm/graph)。
