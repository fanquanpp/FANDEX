---
order: 20
tags:
  - 'algorithm'
  - 'git-workflow'
  - 'data-structure'
difficulty: 'intermediate'
title: '排序算法'
module: 'algorithm'
category: 'Algorithm/Sorting'
description: '六大经典排序算法的原理、复杂度分析、可视化过程与 Python / C++ 多语言实现。'
author: 'fanquanpp'
---

- [6. 归并排序](#6-归并排序)
- [7. 堆排序](#7-堆排序)
- [8. 非比较排序](#8-非比较排序)
- [9. 综合对比与选择](#9-综合对比与选择)
- [10. 排序算法速查表](#10-排序算法速查表)
- [11. 延伸阅读](#11-延伸阅读)

---

## 1. 排序问题总论

### 1.1 排序的评估维度

排序算法的性能评估不仅限于时间复杂度，还需从多个维度综合考量：
| 维度 | 定义 | 意义 |
|------|------|------|
| 时间复杂度 | 最好/平均/最坏情况下的运行时间 | 核心性能指标 |
| 空间复杂度 | 额外使用的存储空间 | 内存受限场景的关键约束 |
| 稳定性 | 相等元素的相对顺序是否保持 | 多关键字排序的基础 |
| 原地性 | 是否仅需O(1)额外空间 | 大数据量排序的必要条件 |
| 自适应性 | 对部分有序输入是否更快 | 实际场景中常见的优化点 |

### 1.2 比较排序的下界

**定理**：任何基于比较的排序算法，在最坏情况下至少需要 Omega(n log n) 次比较。
**证明（决策树方法）**：
n个元素的排列共有n!种可能。每次比较将候选集合分为两个子集，因此决策树是一棵二叉树。要区分n!种排列，决策树至少需要n!个叶子节点。高度为h的二叉树最多有2^h个叶子，因此：
2^h >= n! => h >= log2(n!) = Omega(n log n)
由Stirling公式：log2(n!) = n log2(n) - n log2(e) + Theta(log n) = Omega(n log n)
这意味着归并排序和堆排序已经达到了比较排序的理论最优。

### 1.3 非比较排序的突破

当元素具有特殊性质（如整数范围有限），可以绕过比较下界，实现O(n)排序。这就是计数排序、基数排序等非比较排序的理论基础。

> 跨模块引用：排序算法的复杂度分析依赖于 [算法分析基础](algorithm/overview) 中的渐进符号体系。

---

## 2. 冒泡排序

### 2.1 问题描述

给定一个包含n个元素的数组，将其按非递减顺序排列。冒泡排序通过反复遍历数组，比较相邻元素并在逆序时交换，使最大元素逐步"冒泡"到数组末尾。

### 2.2 思路分析

冒泡排序的核心操作是相邻比较与交换。每一轮遍历将当前未排序部分的最大值推到正确位置：

```
 初始: [5, 3, 8, 1, 2]
 第1轮: [3, 5, 1, 2, 8] -- 8冒泡到末尾
 第2轮: [3, 1, 2, 5, 8] -- 5冒泡到倒数第二
 第3轮: [1, 2, 3, 5, 8] -- 3冒泡到倒数第三
 第4轮: [1, 2, 3, 5, 8] -- 无交换，提前终止
```

**优化1：提前终止**：若某轮遍历未发生交换，说明数组已有序，可提前终止。
**优化2：鸡尾酒排序（双向冒泡）**：交替从左到右和从右到左遍历，可加速处理"乌龟"（尾部小值）问题。

### 2.3 复杂度分析

| 情况           | 比较次数 | 交换次数 | 时间复杂度 |
| -------------- | -------- | -------- | ---------- |
| 最好（已有序） | n-1      | 0        | O(n)       |
| 平均           | n(n-1)/4 | n(n-1)/4 | O(n^2)     |
| 最坏（逆序）   | n(n-1)/2 | n(n-1)/2 | O(n^2)     |

空间复杂度：O(1)，原地排序。稳定性：稳定（相等元素不交换）。

### 2.4 代码实现

```python
 def bubble_sort(arr):
  n = len(arr)
  for i in range(n - 1):
  swapped = False
  for j in range(n - 1 - i):
  if arr[j] > arr[j + 1]:
  arr[j], arr[j + 1] = arr[j + 1], arr[j]
  swapped =
  if not swapped:
  break
  return arr
 def cocktail_sort(arr):
  n = len(arr)
  left, right = 0, n - 1
  while left < right:
  swapped = False
  for i in range(left, right):
  if arr[i] > arr[i + 1]:
  arr[i], arr[i + 1] = arr[i + 1], arr[i]
  swapped =
  right -= 1
  for i in range(right, left, -1):
  if arr[i] < arr[i - 1]:
  arr[i], arr[i - 1] = arr[i - 1], arr[i]
  swapped =
  left += 1
  if not swapped:
  break
  return arr
```

```cpp
 #include <vector>
 #include <algorithm>
 using namespace std;
 void bubbleSort(vector<int>& arr) {
  int n = arr.size();
  for (int i = 0; i < n - 1; i++) {
  bool swapped = false;
  for (int j = 0; j < n - 1 - i; j++) {
  if (arr[j] > arr[j + 1]) {
  swap(arr[j], arr[j + 1]);
  swapped = true;
  }
  }
  if (!swapped) break;
  }
 True}
 void cocktailSort(vector<int>& arr) {
  int n = arr.size();
  int left = 0, right = n - 1;
  while (left < right) {
  bool swapped = false;
  for (int i = left; i < right; i++) {
  if (arr[i] > arr[i + 1]) {
  swap(arr[i], arr[i + 1]);
  swapped = true;
  }
  }
  right--;
  for (int i = right; i > left; i--) {
  if (arr[i] < arr[i - 1]) {
  swap(arr[i], arr[i - 1]);
  swapped = true;
  }
  }
  left++;
  if (!swapped) break;
  }
 True}
```

---

## 3. 选择排序

### 3.1 问题描述

每轮从未排序部分选出最小元素，放到已排序部分的末尾，直到所有元素有序。

### 3.2 思路分析

选择排序的核心思想是"选择最小值"：

```
 初始: [5, 3, 8, 1, 2]
 第1轮: [1, 3, 8, 5, 2] -- 选择最小值1，与5交换
 第2轮: [1, 2, 8, 5, 3] -- 选择最小值2，与3交换
 第3轮: [1, 2, 3, 5, 8] -- 选择最小值3，与8交换
 第4轮: [1, 2, 3, 5, 8] -- 选择最小值5，已在位
```

选择排序的一个关键特征：比较次数固定为n(n-1)/2，不受输入分布影响。交换次数最多n-1次，是所有O(n^2)排序中交换次数最少的。

### 3.3 复杂度分析

| 情况 | 比较次数 | 交换次数 | 时间复杂度 |
| ---- | -------- | -------- | ---------- |
| 最好 | n(n-1)/2 | 0        | O(n^2)     |
| 平均 | n(n-1)/2 | O(n)     | O(n^2)     |
| 最坏 | n(n-1)/2 | n-1      | O(n^2)     |

空间复杂度：O(1)。稳定性：不稳定（交换可能跨越相等元素）。

### 3.4 代码实现

```python
 def selection_sort(arr):
  n = len(arr)
  for i in range(n - 1):
  min_idx = i
  for j in range(i + 1, n):
  if arr[j] < arr[min_idx]:
  min_idx = j
  arr[i], arr[min_idx] = arr[min_idx], arr[i]
  return arr
```

```cpp
 void selectionSort(vector<int>& arr) {
  int n = arr.size();
  for (int i = 0; i < n - 1; i++) {
  int minIdx = i;
  for (int j = i + 1; j < n; j++) {
  if (arr[j] < arr[minIdx]) {
  minIdx = j;
  }
  }
  swap(arr[i], arr[minIdx]);
  }
 True}
```

### 3.5 变体：稳定选择排序

## 标准选择排序不稳定的原因在于交换操作可能跨越相等元素。可以通过将交换改为"插入"来实现稳定版本，但代价是插入操作需要O(n)移动元素，总复杂度仍为O(n^2)。

## 4. 插入排序

### 4.1 问题描述

将数组分为已排序和未排序两部分，每次取未排序部分的第一个元素，插入到已排序部分的正确位置。

### 4.2 思路分析

插入排序模拟了打扑克牌时整理手牌的过程：

```
 初始: [5, 3, 8, 1, 2]
 取3: [3, 5, 8, 1, 2] -- 3插入5前面
 取8: [3, 5, 8, 1, 2] -- 8已在正确位置
 取1: [1, 3, 5, 8, 2] -- 1插入最前面
 取2: [1, 2, 3, 5, 8] -- 2插入1和3之间
```

插入排序是自适应排序的典型代表：输入越接近有序，性能越好。

### 4.3 复杂度分析

| 情况           | 比较次数 | 移动次数 | 时间复杂度 |
| -------------- | -------- | -------- | ---------- |
| 最好（已有序） | n-1      | 0        | O(n)       |
| 平均           | n^2/4    | n^2/4    | O(n^2)     |
| 最坏（逆序）   | n(n-1)/2 | n(n-1)/2 | O(n^2)     |

空间复杂度：O(1)。稳定性：稳定。

### 4.4 代码实现

```python
 def insertion_sort(arr):
  n = len(arr)
  for i in range(1, n):
  key = arr[i]
  j = i - 1
  while j >= 0 and arr[j] > key:
  arr[j + 1] = arr[j]
  j -= 1
  arr[j + 1] = key
  return arr
 def binary_insertion_sort(arr):
  import bisect
  n = len(arr)
  for i in range(1, n):
  key = arr[i]
  pos = bisect.bisect_left(arr, key, 0, i)
  for j in range(i, pos, -1):
  arr[j] = arr[j - 1]
  arr[pos] = key
  return arr
```

```cpp
 void insertionSort(vector<int>& arr) {
  int n = arr.size();
  for (int i = 1; i < n; i++) {
  int key = arr[i];
  int j = i - 1;
  while (j >= 0 && arr[j] > key) {
  arr[j + 1] = arr[j];
  j--;
  }
  arr[j + 1] = key;
  }
 True}
 void binaryInsertionSort(vector<int>& arr) {
  int n = arr.size();
  for (int i = 1; i < n; i++) {
  int key = arr[i];
  int left = 0, right = i;
  while (left < right) {
  int mid = left + (right - left) / 2;
  if (arr[mid] <= key) left = mid + 1;
  else right = mid;
  }
  for (int j = i; j > left; j--) {
  arr[j] = arr[j - 1];
  }
  arr[left] = key;
  }
 True}
```

### 4.5 变体：Shell排序

Shell排序通过引入间隔序列（gap sequence）将数组分为多个子序列分别进行插入排序，逐步缩小间隔直到1。间隔序列的选择直接影响性能：
| 间隔序列 | 最坏时间复杂度 |
|----------|---------------|
| Shell原始: n/2, n/4, ..., 1 | O(n^2) |
| Hibbard: 2^k - 1 | O(n^1.5) |
| Sedgewick: 4^k + 3\*2^(k-1) + 1 | O(n^4/3) |

```python
 def shell_sort(arr):
  n = len(arr)
  gap = n // 2
  while gap > 0:
  for i in range(gap, n):
  key = arr[i]
  j = i
  while j >= gap and arr[j - gap] > key:
  arr[j] = arr[j - gap]
  j -= gap
  arr[j] = key
  gap //= 2
  return arr
```

```cpp
 void shellSort(vector<int>& arr) {
  int n = arr.size();
  for (int gap = n / 2; gap > 0; gap /= 2) {
  for (int i = gap; i < n; i++) {
  int key = arr[i];
  int j = i;
  while (j >= gap && arr[j - gap] > key) {
  arr[j] = arr[j - gap];
  j -= gap;
  }
  arr[j] = key;
  }
  }
 True}
```

---

## 5. 快速排序

### 5.1 问题描述

快速排序采用分治策略：选择一个基准元素（pivot），将数组分为小于基准和大于基准的两部分，递归排序这两部分。

### 5.2 思路分析

快速排序的核心在于分区（partition）操作。有两种经典分区方案：
**Lomuto分区方案**：以最后一个元素为pivot，维护一个分界指针i，遍历数组将小于pivot的元素交换到左侧。

```
 数组: [5, 3, 8, 1, 2], pivot = 2
 i=-1, j=0: 5>2, 跳过
 i=-1, j=1: 3>2, 跳过
 i=-1, j=2: 8>2, 跳过
 i=-1, j=3: 1<2, i=0, swap(5,1) -> [1, 3, 8, 5, 2]
 i=0, j=4: 2<=2, i=1, swap(3,2) -> [1, 2, 8, 5, 3]
 最终: [1, 2, | 8, 5, 3], pivot在位置1
```

**Hoare分区方案**：双指针从两端向中间扫描，交换逆序对。平均交换次数更少，但实现更复杂。

### 5.3 复杂度分析

| 情况 | 递归深度 | 时间复杂度 | 触发条件        |
| ---- | -------- | ---------- | --------------- |
| 最好 | log n    | O(n log n) | 每次分区均匀    |
| 平均 | log n    | O(n log n) | 随机输入        |
| 最坏 | n        | O(n^2)     | 已排序/逆序输入 |

空间复杂度：O(log n)（递归栈，最坏O(n)）。稳定性：不稳定。

### 5.4 代码实现

```python
 import random
 def quick_sort_lomuto(arr, lo=0, hi=None):
  if hi is None:
  hi = len(arr) - 1
  if lo < hi:
  pivot_idx = partition_lomuto(arr, lo, hi)
  quick_sort_lomuto(arr, lo, pivot_idx - 1)
  quick_sort_lomuto(arr, pivot_idx + 1, hi)
  return arr
 def partition_lomuto(arr, lo, hi):
  pivot = arr[hi]
  i = lo - 1
  for j in range(lo, hi):
  if arr[j] <= pivot:
  i += 1
  arr[i], arr[j] = arr[j], arr[i]
  arr[i + 1], arr[hi] = arr[hi], arr[i + 1]
  return i + 1
 def quick_sort_hoare(arr, lo=0, hi=None):
  if hi is None:
  hi = len(arr) - 1
  if lo < hi:
  pivot_idx = partition_hoare(arr, lo, hi)
  quick_sort_hoare(arr, lo, pivot_idx)
  quick_sort_hoare(arr, pivot_idx + 1, hi)
  return arr
 def partition_hoare(arr, lo, hi):
  pivot = arr[lo]
  i, j = lo - 1, hi + 1
  while True:
  i += 1
  while arr[i] < pivot:
  i += 1
  j -= 1
  while arr[j] > pivot:
  j -= 1
  if i >= j:
  return j
  arr[i], arr[j] = arr[j], arr[i]
 def quick_sort_randomized(arr, lo=0, hi=None):
  if hi is None:
  hi = len(arr) - 1
  if lo < hi:
  rand_idx = random.randint(lo, hi)
  arr[rand_idx], arr[hi] = arr[hi], arr[rand_idx]
  pivot_idx = partition_lomuto(arr, lo, hi)
  quick_sort_randomized(arr, lo, pivot_idx - 1)
  quick_sort_randomized(arr, pivot_idx + 1, hi)
  return arr
```

```cpp
 #include <vector>
 #include <algorithm>
 #include <cstdlib>
 #include <ctime>
 using namespace std;
 int partitionLomuto(vector<int>& arr, int lo, int hi) {
  int pivot = arr[hi];
  int i = lo - 1;
  for (int j = lo; j < hi; j++) {
  if (arr[j] <= pivot) {
  i++;
  swap(arr[i], arr[j]);
  }
  }
  swap(arr[i + 1], arr[hi]);
  return i + 1;
 True}
 void quickSortLomuto(vector<int>& arr, int lo, int hi) {
  if (lo < hi) {
  int p = partitionLomuto(arr, lo, hi);
  quickSortLomuto(arr, lo, p - 1);
  quickSortLomuto(arr, p + 1, hi);
  }
 True}
 int partitionHoare(vector<int>& arr, int lo, int hi) {
  int pivot = arr[lo];
  int i = lo - 1, j = hi + 1;
  while (true) {
  do { i++; } while (arr[i] < pivot);
  do { j--; } while (arr[j] > pivot);
  if (i >= j) return j;
  swap(arr[i], arr[j]);
  }
 True}
 void quickSortHoare(vector<int>& arr, int lo, int hi) {
  if (lo < hi) {
  int p = partitionHoare(arr, lo, hi);
  quickSortHoare(arr, lo, p);
  quickSortHoare(arr, p + 1, hi);
  }
 True}
 void quickSortRandomized(vector<int>& arr, int lo, int hi) {
  if (lo < hi) {
  int randIdx = lo + rand() % (hi - lo + 1);
  swap(arr[randIdx], arr[hi]);
  int p = partitionLomuto(arr, lo, hi);
  quickSortRandomized(arr, lo, p - 1);
  quickSortRandomized(arr, p + 1, hi);
  }
 True}
```

### 5.5 优化策略

**三路分区（Dutch National Flag）**：当存在大量重复元素时，将数组分为< pivot、= pivot、> pivot三部分，避免对重复元素的递归。

```python
 def quick_sort_3way(arr, lo=0, hi=None):
  if hi is None:
  hi = len(arr) - 1
  if lo >= hi:
  return
  pivot = arr[lo]
  lt, gt = lo, hi
  i = lo
  while i <= gt:
  if arr[i] < pivot:
  arr[lt], arr[i] = arr[i], arr[lt]
  lt += 1
  i += 1
  elif arr[i] > pivot:
  arr[gt], arr[i] = arr[i], arr[gt]
  gt -= 1
  else:
  i += 1
  quick_sort_3way(arr, lo, lt - 1)
  quick_sort_3way(arr, gt + 1, hi)
```

**内省排序（Introsort）**：C++ STL的sort实现。先使用快速排序，当递归深度超过2\*log2(n)时切换为堆排序，小规模子数组切换为插入排序。

> 跨模块引用：堆排序的sift-down操作参见下文第7节。快速排序的分区思想也用于快速选择算法，参见 [搜索算法](algorithm/searching)。

---

## 6. 归并排序

### 6.1 问题描述

归并排序采用分治策略：将数组递归地分成两半，分别排序后合并。其核心操作是两个有序数组的合并。

### 6.2 思路分析

归并排序的递归树是一棵完美平衡二叉树：

```
  [5,3,8,1,2,7,4,6]
  / \
  [5,3,8,1] [2,7,4,6]
  / \ / \
  [5,3] [8,1] [2,7] [4,6]
  / \ / \ / \ / \
  [5] [3] [8] [1] [2] [7] [4] [6]
  \ / \ / \ / \ /
  [3,5] [1,8] [2,7] [4,6]
  \ / \ /
  [1,3,5,8] [2,4,6,7]
  \ /
  [1,2,3,4,5,6,7,8]
```

合并过程：使用双指针分别指向两个子数组，每次取较小元素放入结果。

### 6.3 复杂度分析

归并排序的时间复杂度恒为Theta(n log n)，不受输入分布影响：

- 分割：O(1)（仅计算中点）
- 合并：O(n)（遍历所有元素）
- 递推式：T(n) = 2T(n/2) + O(n)
- 由主定理情形2：T(n) = O(n log n)
  空间复杂度：O(n)（辅助数组）。稳定性：稳定。

### 6.4 代码实现

```python
 def merge_sort_topdown(arr):
  if len(arr) <= 1:
  return arr
  mid = len(arr) // 2
  left = merge_sort_topdown(arr[:mid])
  right = merge_sort_topdown(arr[mid:])
  return merge(left, right)
 def merge(left, right):
  result = []
  i = j = 0
  while i < len(left) and j < len(right):
  if left[i] <= right[j]:
  result.append(left[i])
  i += 1
  else:
  result.append(right[j])
  j += 1
  result.extend(left[i:])
  result.extend(right[j:])
  return result
 def merge_sort_bottomup(arr):
  n = len(arr)
  width = 1
  while width < n:
  for i in range(0, n, 2 * width):
  left = arr[i:i + width]
  right = arr[i + width:i + 2 * width]
  arr[i:i + len(left) + len(right)] = merge(left, right)
  width *= 2
  return arr
```

```cpp
 void merge(vector<int>& arr, int left, int mid, int right) {
  vector<int> tmp(right - left + 1);
  int i = left, j = mid + 1, k = 0;
  while (i <= mid && j <= right) {
  if (arr[i] <= arr[j]) tmp[k++] = arr[i++];
  else tmp[k++] = arr[j++];
  }
  while (i <= mid) tmp[k++] = arr[i++];
  while (j <= right) tmp[k++] = arr[j++];
  for (int p = 0; p < k; p++) arr[left + p] = tmp[p];
 True}
 void mergeSort(vector<int>& arr, int left, int right) {
  if (left >= right) return;
  int mid = left + (right - left) / 2;
  mergeSort(arr, left, mid);
  mergeSort(arr, mid + 1, right);
  merge(arr, left, mid, right);
 True}
 void mergeSortBottomUp(vector<int>& arr) {
  int n = arr.size();
  for (int width = 1; width < n; width *= 2) {
  for (int i = 0; i < n; i += 2 * width) {
  int mid = min(i + width - 1, n - 1);
  int right = min(i + 2 * width - 1, n - 1);
  if (mid < right) merge(arr, i, mid, right);
  }
  }
 True}
```

### 6.5 变体与优化

**原地归并排序**：理论上可行但实际效率低，常数因子大，工程中几乎不使用。
**自然归并排序**：利用输入中已有的有序子序列（run），减少合并次数。Timsort即基于此思想。
**Timsort**：Python和Java的默认排序算法。结合了归并排序和插入排序，对真实世界数据（部分有序）表现优异。时间复杂度：最好O(n)，最坏O(n log n)。

---

## 7. 堆排序

### 7.1 问题描述

利用堆这种数据结构进行排序。先将数组构建为最大堆，然后反复取出堆顶（最大值）放到数组末尾，对剩余元素重新调整堆。

### 7.2 思路分析

堆排序分为两个阶段：
**阶段1：建堆**。从最后一个非叶节点开始，自底向上执行sift-down操作。
**阶段2：排序**。每次将堆顶元素与末尾元素交换，缩小堆的范围，对新的堆顶执行sift-down。

```
 建堆过程（sift-down可视化）:
  4 4 8
  / \ -> / \ -> / \
  10 3 10 3 10 3
  / \ / \ / \
 8 5 8 5 4 5
 排序过程:
 [8,10,3,4,5] -> 交换8和5 -> [5,10,3,4,|8] -> sift-down -> [10,5,3,4,|8]
 [10,5,3,4,|8] -> 交换10和4 -> [4,5,3,|10,8] -> sift-down -> [5,4,3,|10,8]
 ...
```

### 7.3 复杂度分析

**建堆复杂度**：O(n)。虽然直觉上建堆应为O(n log n)，但精确分析显示：
第i层（从底向上计数）有2^(h-i)个节点，每个节点最多sift-down i次。总工作量：
sum(i=0 to h) i \* 2^(h-i) = O(2^h) = O(n)
**排序阶段**：n-1次sift-down，每次O(log n)，总计O(n log n)。
总时间复杂度：O(n) + O(n log n) = O(n log n)。空间复杂度：O(1)。稳定性：不稳定。

### 7.4 代码实现

```python
 def heap_sort(arr):
  n = len(arr)
  def sift_down(start, end):
  root = start
  while True:
  child = 2 * root + 1
  if child > end:
  break
  if child + 1 <= end and arr[child] < arr[child + 1]:
  child += 1
  if arr[root] < arr[child]:
  arr[root], arr[child] = arr[child], arr[root]
  root = child
  else:
  break
  for i in range(n // 2 - 1, -1, -1):
  sift_down(i, n - 1)
  for i in range(n - 1, 0, -1):
  arr[0], arr[i] = arr[i], arr[0]
  sift_down(0, i - 1)
  return arr
```

```cpp
 void siftDown(vector<int>& arr, int start, int end) {
  int root = start;
  while (true) {
  int child = 2 * root + 1;
  if (child > end) break;
  if (child + 1 <= end && arr[child] < arr[child + 1]) child++;
  if (arr[root] < arr[child]) {
  swap(arr[root], arr[child]);
  root = child;
  } else {
  break;
  }
  }
 True}
 void heapSort(vector<int>& arr) {
  int n = arr.size();
  for (int i = n / 2 - 1; i >= 0; i--) {
  siftDown(arr, i, n - 1);
  }
  for (int i = n - 1; i > 0; i--) {
  swap(arr[0], arr[i]);
  siftDown(arr, 0, i - 1);
  }
 True}
```

> 跨模块引用：堆是优先队列的底层实现，参见 [树结构](algorithm/tree) 中关于堆的详细讨论。

---

## 8. 非比较排序

### 8.1 计数排序

适用于元素范围为有限整数的情况。
**思路**：统计每个值出现的次数，然后按顺序输出。
**复杂度**：时间O(n + k)，空间O(n + k)，其中k为值域范围。

```python
 def counting_sort(arr):
  if not arr:
  return arr
  min_val, max_val = min(arr), max(arr)
  k = max_val - min_val + 1
  count = [0] * k
  for x in arr:
  count[x - min_val] += 1
  result = []
  for i, c in enumerate(count):
  result.extend([i + min_val] * c)
  return result
```

```cpp
 vector<int> countingSort(vector<int>& arr) {
  if (arr.empty()) return arr;
  int minVal = *min_element(arr.begin(), arr.end());
  int maxVal = *max_element(arr.begin(), arr.end());
  int k = maxVal - minVal + 1;
  vector<int> count(k, 0);
  for (int x : arr) count[x - minVal]++;
  vector<int> result;
  for (int i = 0; i < k; i++) {
  for (int j = 0; j < count[i]; j++) {
  result.push_back(i + minVal);
  }
  }
  return result;
 True}
```

### 8.2 基数排序

按位排序，从最低位到最高位（LSD）或从最高位到最低位（MSD），每位使用稳定排序。
**复杂度**：时间O(d \* (n + b))，空间O(n + b)，其中d为位数，b为基数。

```python
 def radix_sort(arr):
  if not arr:
  return arr
  max_val = max(arr)
  exp = 1
  while max_val // exp > 0:
  counting_sort_by_digit(arr, exp)
  exp *= 10
  return arr
 def counting_sort_by_digit(arr, exp):
  n = len(arr)
  output = [0] * n
  count = [0] * 10
  for i in range(n):
  digit = (arr[i] // exp) % 10
  count[digit] += 1
  for i in range(1, 10):
  count[i] += count[i - 1]
  for i in range(n - 1, -1, -1):
  digit = (arr[i] // exp) % 10
  output[count[digit] - 1] = arr[i]
  count[digit] -= 1
  for i in range(n):
  arr[i] = output[i]
```

```cpp
 void countingSortByDigit(vector<int>& arr, int exp) {
  int n = arr.size();
  vector<int> output(n);
  vector<int> count(10, 0);
  for (int i = 0; i < n; i++) {
  int digit = (arr[i] / exp) % 10;
  count[digit]++;
  }
  for (int i = 1; i < 10; i++) count[i] += count[i - 1];
  for (int i = n - 1; i >= 0; i--) {
  int digit = (arr[i] / exp) % 10;
  output[count[digit] - 1] = arr[i];
  count[digit]--;
  }
  for (int i = 0; i < n; i++) arr[i] = output[i];
 True}
 void radixSort(vector<int>& arr) {
  if (arr.empty()) return;
  int maxVal = *max_element(arr.begin(), arr.end());
  for (int exp = 1; maxVal / exp > 0; exp *= 10) {
  countingSortByDigit(arr, exp);
  }
 True}
```

### 8.3 桶排序

将元素分配到有限数量的桶中，每个桶内单独排序后合并。
**复杂度**：平均O(n + n^2/k)，当k=Theta(n)时为O(n)。最坏O(n^2)。

---

## 9. 综合对比与选择

### 9.1 场景选择指南

| 场景           | 推荐算法           | 理由                   |
| -------------- | ------------------ | ---------------------- |
| 小规模(n < 50) | 插入排序           | 常数因子小，无递归开销 |
| 近乎有序       | 插入排序           | O(n)自适应特性         |
| 要求稳定       | 归并排序/Timsort   | 稳定且O(n log n)       |
| 内存受限       | 堆排序             | O(1)额外空间           |
| 大规模通用     | 快速排序/Introsort | 缓存友好，平均最快     |
| 整数范围有限   | 计数排序/基数排序  | O(n)线性时间           |
| 链表排序       | 归并排序           | 顺序访问，无需随机     |

### 9.2 缓存性能分析

快速排序在实际中往往比归并排序快，原因之一是缓存友好性：

- 快速排序的分区操作是顺序扫描，局部性好
- 归并排序需要额外的辅助数组，访问模式不够局部
- 堆排序的sift-down操作跳跃式访问，缓存命中率最低
  实验数据（n=10^6随机整数，单位ms）：
  | 算法 | 运行时间 |
  |------|----------|
  | 快速排序 | 85 |
  | 归并排序 | 120 |
  | 堆排序 | 160 |
  | std::sort (Introsort) | 78 |

---

## 10. 排序算法速查表

| 算法  | 最好     | 平均     | 最坏     | 空间    | 稳定 | 原地 | 自适应 |
| ----- | -------- | -------- | -------- | ------- | ---- | ---- | ------ |
| 冒泡  | O(n)     | O(n^2)   | O(n^2)   | O(1)    | Y    | Y    | Y      |
| 选择  | O(n^2)   | O(n^2)   | O(n^2)   | O(1)    | N    | Y    | N      |
| 插入  | O(n)     | O(n^2)   | O(n^2)   | O(1)    | Y    | Y    | Y      |
| Shell | O(nlogn) | O(n^1.3) | O(n^2)   | O(1)    | N    | Y    | Y      |
| 快速  | O(nlogn) | O(nlogn) | O(n^2)   | O(logn) | N    | Y    | N      |
| 归并  | O(nlogn) | O(nlogn) | O(nlogn) | O(n)    | Y    | N    | N      |
| 堆    | O(nlogn) | O(nlogn) | O(nlogn) | O(1)    | N    | Y    | N      |
| 计数  | O(n+k)   | O(n+k)   | O(n+k)   | O(n+k)  | Y    | N    | N      |
| 基数  | O(dn)    | O(dn)    | O(dn)    | O(n+d)  | Y    | N    | N      |
| 桶    | O(n+k)   | O(n+k)   | O(n^2)   | O(n+k)  | Y    | N    | N      |

---

## 11. 延伸阅读

- CLRS 第 6-8 章
- Tim Peters 对 Timsort 的设计说明
- [Sorting -- VisuAlgo](https://visualgo.net/en/sorting)
- Musser, "Introspective Sorting and Selection Algorithms", 1997
- Sedgewick, "Analysis of Shellsort and Related Algorithms", 1996
  > 跨模块引用：排序算法在搜索预处理中广泛应用，参见 [搜索算法](algorithm/searching)。C++ STL排序实现参见 [C++基础](cpp/overview)。

### 跨模块关联

- [STL 算法](cpp/cpp-stl-algorithms)
