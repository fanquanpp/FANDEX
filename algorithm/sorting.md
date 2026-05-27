# 排序算法
 False
 False> @Version: v4.0.0
 False> @Author: fanquanpp
 False> @Category: Algorithm/Sorting
 False> @Description: 六大经典排序算法的原理、复杂度分析、可视化过程与 Python / C++ 多语言实现。
 False
 False## 目录
 False
 False- [1. 排序问题总论](#1-排序问题总论)
 False- [2. 冒泡排序](#2-冒泡排序)
 False- [3. 选择排序](#3-选择排序)
 False- [4. 插入排序](#4-插入排序)
 False- [5. 快速排序](#5-快速排序)
 False- [6. 归并排序](#6-归并排序)
 False- [7. 堆排序](#7-堆排序)
 False- [8. 非比较排序](#8-非比较排序)
 False- [9. 综合对比与选择](#9-综合对比与选择)
 False- [10. 排序算法速查表](#10-排序算法速查表)
 False- [11. 延伸阅读](#11-延伸阅读)
 False
 False---
 False
 False## 1. 排序问题总论
 False
 False### 1.1 排序的评估维度
 False
 False排序算法的性能评估不仅限于时间复杂度，还需从多个维度综合考量：
 False
 False| 维度 | 定义 | 意义 |
 False|------|------|------|
 False| 时间复杂度 | 最好/平均/最坏情况下的运行时间 | 核心性能指标 |
 False| 空间复杂度 | 额外使用的存储空间 | 内存受限场景的关键约束 |
 False| 稳定性 | 相等元素的相对顺序是否保持 | 多关键字排序的基础 |
 False| 原地性 | 是否仅需O(1)额外空间 | 大数据量排序的必要条件 |
 False| 自适应性 | 对部分有序输入是否更快 | 实际场景中常见的优化点 |
 False
 False### 1.2 比较排序的下界
 False
 False**定理**：任何基于比较的排序算法，在最坏情况下至少需要 Omega(n log n) 次比较。
 False
 False**证明（决策树方法）**：
 False
 Falsen个元素的排列共有n!种可能。每次比较将候选集合分为两个子集，因此决策树是一棵二叉树。要区分n!种排列，决策树至少需要n!个叶子节点。高度为h的二叉树最多有2^h个叶子，因此：
 False
 False2^h >= n! => h >= log2(n!) = Omega(n log n)
 False
 False由Stirling公式：log2(n!) = n log2(n) - n log2(e) + Theta(log n) = Omega(n log n)
 False
 False这意味着归并排序和堆排序已经达到了比较排序的理论最优。
 False
 False### 1.3 非比较排序的突破
 False
 False当元素具有特殊性质（如整数范围有限），可以绕过比较下界，实现O(n)排序。这就是计数排序、基数排序等非比较排序的理论基础。
 False
 False> 跨模块引用：排序算法的复杂度分析依赖于 [[algorithm/overview|算法分析基础]] 中的渐进符号体系。
 False
 False---
 False
 False## 2. 冒泡排序
 False
 False### 2.1 问题描述
 False
 False给定一个包含n个元素的数组，将其按非递减顺序排列。冒泡排序通过反复遍历数组，比较相邻元素并在逆序时交换，使最大元素逐步"冒泡"到数组末尾。
 False
 False### 2.2 思路分析
 False
 False冒泡排序的核心操作是相邻比较与交换。每一轮遍历将当前未排序部分的最大值推到正确位置：
 False
```
 True初始: [5, 3, 8, 1, 2]
 True
 True第1轮: [3, 5, 1, 2, 8] -- 8冒泡到末尾
 True第2轮: [3, 1, 2, 5, 8] -- 5冒泡到倒数第二
 True第3轮: [1, 2, 3, 5, 8] -- 3冒泡到倒数第三
 True第4轮: [1, 2, 3, 5, 8] -- 无交换，提前终止
 True```

 False**优化1：提前终止**：若某轮遍历未发生交换，说明数组已有序，可提前终止。
 False
 False**优化2：鸡尾酒排序（双向冒泡）**：交替从左到右和从右到左遍历，可加速处理"乌龟"（尾部小值）问题。
 False
 False### 2.3 复杂度分析
 False
 False| 情况 | 比较次数 | 交换次数 | 时间复杂度 |
 False|------|----------|----------|-----------|
 False| 最好（已有序） | n-1 | 0 | O(n) |
 False| 平均 | n(n-1)/4 | n(n-1)/4 | O(n^2) |
 False| 最坏（逆序） | n(n-1)/2 | n(n-1)/2 | O(n^2) |
 False
 False空间复杂度：O(1)，原地排序。稳定性：稳定（相等元素不交换）。
 False
 False### 2.4 代码实现
 False
```python
 Truedef bubble_sort(arr):
 True n = len(arr)
 True for i in range(n - 1):
 True swapped = False
 True for j in range(n - 1 - i):
 True if arr[j] > arr[j + 1]:
 True arr[j], arr[j + 1] = arr[j + 1], arr[j]
 True swapped = True
 True if not swapped:
 True break
 True return arr
 True
 Truedef cocktail_sort(arr):
 True n = len(arr)
 True left, right = 0, n - 1
 True while left < right:
 True swapped = False
 True for i in range(left, right):
 True if arr[i] > arr[i + 1]:
 True arr[i], arr[i + 1] = arr[i + 1], arr[i]
 True swapped = True
 True right -= 1
 True for i in range(right, left, -1):
 True if arr[i] < arr[i - 1]:
 True arr[i], arr[i - 1] = arr[i - 1], arr[i]
 True swapped = True
 True left += 1
 True if not swapped:
 True break
 True return arr
 True```

```cpp
 True#include <vector>
 True#include <algorithm>
 Trueusing namespace std;
 True
 Truevoid bubbleSort(vector<int>& arr) {
 True int n = arr.size();
 True for (int i = 0; i < n - 1; i++) {
 True bool swapped = false;
 True for (int j = 0; j < n - 1 - i; j++) {
 True if (arr[j] > arr[j + 1]) {
 True swap(arr[j], arr[j + 1]);
 True swapped = true;
 True }
 True }
 True if (!swapped) break;
 True }
 True}
 True
 Truevoid cocktailSort(vector<int>& arr) {
 True int n = arr.size();
 True int left = 0, right = n - 1;
 True while (left < right) {
 True bool swapped = false;
 True for (int i = left; i < right; i++) {
 True if (arr[i] > arr[i + 1]) {
 True swap(arr[i], arr[i + 1]);
 True swapped = true;
 True }
 True }
 True right--;
 True for (int i = right; i > left; i--) {
 True if (arr[i] < arr[i - 1]) {
 True swap(arr[i], arr[i - 1]);
 True swapped = true;
 True }
 True }
 True left++;
 True if (!swapped) break;
 True }
 True}
 True```

 False---
 False
 False## 3. 选择排序
 False
 False### 3.1 问题描述
 False
 False每轮从未排序部分选出最小元素，放到已排序部分的末尾，直到所有元素有序。
 False
 False### 3.2 思路分析
 False
 False选择排序的核心思想是"选择最小值"：
 False
```
 True初始: [5, 3, 8, 1, 2]
 True
 True第1轮: [1, 3, 8, 5, 2] -- 选择最小值1，与5交换
 True第2轮: [1, 2, 8, 5, 3] -- 选择最小值2，与3交换
 True第3轮: [1, 2, 3, 5, 8] -- 选择最小值3，与8交换
 True第4轮: [1, 2, 3, 5, 8] -- 选择最小值5，已在位
 True```

 False选择排序的一个关键特征：比较次数固定为n(n-1)/2，不受输入分布影响。交换次数最多n-1次，是所有O(n^2)排序中交换次数最少的。
 False
 False### 3.3 复杂度分析
 False
 False| 情况 | 比较次数 | 交换次数 | 时间复杂度 |
 False|------|----------|----------|-----------|
 False| 最好 | n(n-1)/2 | 0 | O(n^2) |
 False| 平均 | n(n-1)/2 | O(n) | O(n^2) |
 False| 最坏 | n(n-1)/2 | n-1 | O(n^2) |
 False
 False空间复杂度：O(1)。稳定性：不稳定（交换可能跨越相等元素）。
 False
 False### 3.4 代码实现
 False
```python
 Truedef selection_sort(arr):
 True n = len(arr)
 True for i in range(n - 1):
 True min_idx = i
 True for j in range(i + 1, n):
 True if arr[j] < arr[min_idx]:
 True min_idx = j
 True arr[i], arr[min_idx] = arr[min_idx], arr[i]
 True return arr
 True```

```cpp
 Truevoid selectionSort(vector<int>& arr) {
 True int n = arr.size();
 True for (int i = 0; i < n - 1; i++) {
 True int minIdx = i;
 True for (int j = i + 1; j < n; j++) {
 True if (arr[j] < arr[minIdx]) {
 True minIdx = j;
 True }
 True }
 True swap(arr[i], arr[minIdx]);
 True }
 True}
 True```

 False### 3.5 变体：稳定选择排序
 False
 False标准选择排序不稳定的原因在于交换操作可能跨越相等元素。可以通过将交换改为"插入"来实现稳定版本，但代价是插入操作需要O(n)移动元素，总复杂度仍为O(n^2)。
 False
 False---
 False
 False## 4. 插入排序
 False
 False### 4.1 问题描述
 False
 False将数组分为已排序和未排序两部分，每次取未排序部分的第一个元素，插入到已排序部分的正确位置。
 False
 False### 4.2 思路分析
 False
 False插入排序模拟了打扑克牌时整理手牌的过程：
 False
```
 True初始: [5, 3, 8, 1, 2]
 True
 True取3: [3, 5, 8, 1, 2] -- 3插入5前面
 True取8: [3, 5, 8, 1, 2] -- 8已在正确位置
 True取1: [1, 3, 5, 8, 2] -- 1插入最前面
 True取2: [1, 2, 3, 5, 8] -- 2插入1和3之间
 True```

 False插入排序是自适应排序的典型代表：输入越接近有序，性能越好。
 False
 False### 4.3 复杂度分析
 False
 False| 情况 | 比较次数 | 移动次数 | 时间复杂度 |
 False|------|----------|----------|-----------|
 False| 最好（已有序） | n-1 | 0 | O(n) |
 False| 平均 | n^2/4 | n^2/4 | O(n^2) |
 False| 最坏（逆序） | n(n-1)/2 | n(n-1)/2 | O(n^2) |
 False
 False空间复杂度：O(1)。稳定性：稳定。
 False
 False### 4.4 代码实现
 False
```python
 Truedef insertion_sort(arr):
 True n = len(arr)
 True for i in range(1, n):
 True key = arr[i]
 True j = i - 1
 True while j >= 0 and arr[j] > key:
 True arr[j + 1] = arr[j]
 True j -= 1
 True arr[j + 1] = key
 True return arr
 True
 Truedef binary_insertion_sort(arr):
 True import bisect
 True n = len(arr)
 True for i in range(1, n):
 True key = arr[i]
 True pos = bisect.bisect_left(arr, key, 0, i)
 True for j in range(i, pos, -1):
 True arr[j] = arr[j - 1]
 True arr[pos] = key
 True return arr
 True```

```cpp
 Truevoid insertionSort(vector<int>& arr) {
 True int n = arr.size();
 True for (int i = 1; i < n; i++) {
 True int key = arr[i];
 True int j = i - 1;
 True while (j >= 0 && arr[j] > key) {
 True arr[j + 1] = arr[j];
 True j--;
 True }
 True arr[j + 1] = key;
 True }
 True}
 True
 Truevoid binaryInsertionSort(vector<int>& arr) {
 True int n = arr.size();
 True for (int i = 1; i < n; i++) {
 True int key = arr[i];
 True int left = 0, right = i;
 True while (left < right) {
 True int mid = left + (right - left) / 2;
 True if (arr[mid] <= key) left = mid + 1;
 True else right = mid;
 True }
 True for (int j = i; j > left; j--) {
 True arr[j] = arr[j - 1];
 True }
 True arr[left] = key;
 True }
 True}
 True```

 False### 4.5 变体：Shell排序
 False
 FalseShell排序通过引入间隔序列（gap sequence）将数组分为多个子序列分别进行插入排序，逐步缩小间隔直到1。间隔序列的选择直接影响性能：
 False
 False| 间隔序列 | 最坏时间复杂度 |
 False|----------|---------------|
 False| Shell原始: n/2, n/4, ..., 1 | O(n^2) |
 False| Hibbard: 2^k - 1 | O(n^1.5) |
 False| Sedgewick: 4^k + 3*2^(k-1) + 1 | O(n^4/3) |
 False
```python
 Truedef shell_sort(arr):
 True n = len(arr)
 True gap = n // 2
 True while gap > 0:
 True for i in range(gap, n):
 True key = arr[i]
 True j = i
 True while j >= gap and arr[j - gap] > key:
 True arr[j] = arr[j - gap]
 True j -= gap
 True arr[j] = key
 True gap //= 2
 True return arr
 True```

```cpp
 Truevoid shellSort(vector<int>& arr) {
 True int n = arr.size();
 True for (int gap = n / 2; gap > 0; gap /= 2) {
 True for (int i = gap; i < n; i++) {
 True int key = arr[i];
 True int j = i;
 True while (j >= gap && arr[j - gap] > key) {
 True arr[j] = arr[j - gap];
 True j -= gap;
 True }
 True arr[j] = key;
 True }
 True }
 True}
 True```

 False---
 False
 False## 5. 快速排序
 False
 False### 5.1 问题描述
 False
 False快速排序采用分治策略：选择一个基准元素（pivot），将数组分为小于基准和大于基准的两部分，递归排序这两部分。
 False
 False### 5.2 思路分析
 False
 False快速排序的核心在于分区（partition）操作。有两种经典分区方案：
 False
 False**Lomuto分区方案**：以最后一个元素为pivot，维护一个分界指针i，遍历数组将小于pivot的元素交换到左侧。
 False
```
 True数组: [5, 3, 8, 1, 2], pivot = 2
 True
 Truei=-1, j=0: 5>2, 跳过
 Truei=-1, j=1: 3>2, 跳过
 Truei=-1, j=2: 8>2, 跳过
 Truei=-1, j=3: 1<2, i=0, swap(5,1) -> [1, 3, 8, 5, 2]
 Truei=0, j=4: 2<=2, i=1, swap(3,2) -> [1, 2, 8, 5, 3]
 True
 True最终: [1, 2, | 8, 5, 3], pivot在位置1
 True```

 False**Hoare分区方案**：双指针从两端向中间扫描，交换逆序对。平均交换次数更少，但实现更复杂。
 False
 False### 5.3 复杂度分析
 False
 False| 情况 | 递归深度 | 时间复杂度 | 触发条件 |
 False|------|----------|-----------|----------|
 False| 最好 | log n | O(n log n) | 每次分区均匀 |
 False| 平均 | log n | O(n log n) | 随机输入 |
 False| 最坏 | n | O(n^2) | 已排序/逆序输入 |
 False
 False空间复杂度：O(log n)（递归栈，最坏O(n)）。稳定性：不稳定。
 False
 False### 5.4 代码实现
 False
```python
 Trueimport random
 True
 Truedef quick_sort_lomuto(arr, lo=0, hi=None):
 True if hi is None:
 True hi = len(arr) - 1
 True if lo < hi:
 True pivot_idx = partition_lomuto(arr, lo, hi)
 True quick_sort_lomuto(arr, lo, pivot_idx - 1)
 True quick_sort_lomuto(arr, pivot_idx + 1, hi)
 True return arr
 True
 Truedef partition_lomuto(arr, lo, hi):
 True pivot = arr[hi]
 True i = lo - 1
 True for j in range(lo, hi):
 True if arr[j] <= pivot:
 True i += 1
 True arr[i], arr[j] = arr[j], arr[i]
 True arr[i + 1], arr[hi] = arr[hi], arr[i + 1]
 True return i + 1
 True
 Truedef quick_sort_hoare(arr, lo=0, hi=None):
 True if hi is None:
 True hi = len(arr) - 1
 True if lo < hi:
 True pivot_idx = partition_hoare(arr, lo, hi)
 True quick_sort_hoare(arr, lo, pivot_idx)
 True quick_sort_hoare(arr, pivot_idx + 1, hi)
 True return arr
 True
 Truedef partition_hoare(arr, lo, hi):
 True pivot = arr[lo]
 True i, j = lo - 1, hi + 1
 True while True:
 True i += 1
 True while arr[i] < pivot:
 True i += 1
 True j -= 1
 True while arr[j] > pivot:
 True j -= 1
 True if i >= j:
 True return j
 True arr[i], arr[j] = arr[j], arr[i]
 True
 Truedef quick_sort_randomized(arr, lo=0, hi=None):
 True if hi is None:
 True hi = len(arr) - 1
 True if lo < hi:
 True rand_idx = random.randint(lo, hi)
 True arr[rand_idx], arr[hi] = arr[hi], arr[rand_idx]
 True pivot_idx = partition_lomuto(arr, lo, hi)
 True quick_sort_randomized(arr, lo, pivot_idx - 1)
 True quick_sort_randomized(arr, pivot_idx + 1, hi)
 True return arr
 True```

```cpp
 True#include <vector>
 True#include <algorithm>
 True#include <cstdlib>
 True#include <ctime>
 Trueusing namespace std;
 True
 Trueint partitionLomuto(vector<int>& arr, int lo, int hi) {
 True int pivot = arr[hi];
 True int i = lo - 1;
 True for (int j = lo; j < hi; j++) {
 True if (arr[j] <= pivot) {
 True i++;
 True swap(arr[i], arr[j]);
 True }
 True }
 True swap(arr[i + 1], arr[hi]);
 True return i + 1;
 True}
 True
 Truevoid quickSortLomuto(vector<int>& arr, int lo, int hi) {
 True if (lo < hi) {
 True int p = partitionLomuto(arr, lo, hi);
 True quickSortLomuto(arr, lo, p - 1);
 True quickSortLomuto(arr, p + 1, hi);
 True }
 True}
 True
 Trueint partitionHoare(vector<int>& arr, int lo, int hi) {
 True int pivot = arr[lo];
 True int i = lo - 1, j = hi + 1;
 True while (true) {
 True do { i++; } while (arr[i] < pivot);
 True do { j--; } while (arr[j] > pivot);
 True if (i >= j) return j;
 True swap(arr[i], arr[j]);
 True }
 True}
 True
 Truevoid quickSortHoare(vector<int>& arr, int lo, int hi) {
 True if (lo < hi) {
 True int p = partitionHoare(arr, lo, hi);
 True quickSortHoare(arr, lo, p);
 True quickSortHoare(arr, p + 1, hi);
 True }
 True}
 True
 Truevoid quickSortRandomized(vector<int>& arr, int lo, int hi) {
 True if (lo < hi) {
 True int randIdx = lo + rand() % (hi - lo + 1);
 True swap(arr[randIdx], arr[hi]);
 True int p = partitionLomuto(arr, lo, hi);
 True quickSortRandomized(arr, lo, p - 1);
 True quickSortRandomized(arr, p + 1, hi);
 True }
 True}
 True```

 False### 5.5 优化策略
 False
 False**三路分区（Dutch National Flag）**：当存在大量重复元素时，将数组分为< pivot、= pivot、> pivot三部分，避免对重复元素的递归。
 False
```python
 Truedef quick_sort_3way(arr, lo=0, hi=None):
 True if hi is None:
 True hi = len(arr) - 1
 True if lo >= hi:
 True return
 True pivot = arr[lo]
 True lt, gt = lo, hi
 True i = lo
 True while i <= gt:
 True if arr[i] < pivot:
 True arr[lt], arr[i] = arr[i], arr[lt]
 True lt += 1
 True i += 1
 True elif arr[i] > pivot:
 True arr[gt], arr[i] = arr[i], arr[gt]
 True gt -= 1
 True else:
 True i += 1
 True quick_sort_3way(arr, lo, lt - 1)
 True quick_sort_3way(arr, gt + 1, hi)
 True```

 False**内省排序（Introsort）**：C++ STL的sort实现。先使用快速排序，当递归深度超过2*log2(n)时切换为堆排序，小规模子数组切换为插入排序。
 False
 False> 跨模块引用：堆排序的sift-down操作参见下文第7节。快速排序的分区思想也用于快速选择算法，参见 [[algorithm/searching|搜索算法]]。
 False
 False---
 False
 False## 6. 归并排序
 False
 False### 6.1 问题描述
 False
 False归并排序采用分治策略：将数组递归地分成两半，分别排序后合并。其核心操作是两个有序数组的合并。
 False
 False### 6.2 思路分析
 False
 False归并排序的递归树是一棵完美平衡二叉树：
 False
```
 True [5,3,8,1,2,7,4,6]
 True / \
 True [5,3,8,1] [2,7,4,6]
 True / \ / \
 True [5,3] [8,1] [2,7] [4,6]
 True / \ / \ / \ / \
 True [5] [3] [8] [1] [2] [7] [4] [6]
 True \ / \ / \ / \ /
 True [3,5] [1,8] [2,7] [4,6]
 True \ / \ /
 True [1,3,5,8] [2,4,6,7]
 True \ /
 True [1,2,3,4,5,6,7,8]
 True```

 False合并过程：使用双指针分别指向两个子数组，每次取较小元素放入结果。
 False
 False### 6.3 复杂度分析
 False
 False归并排序的时间复杂度恒为Theta(n log n)，不受输入分布影响：
 False
 False- 分割：O(1)（仅计算中点）
 False- 合并：O(n)（遍历所有元素）
 False- 递推式：T(n) = 2T(n/2) + O(n)
 False- 由主定理情形2：T(n) = O(n log n)
 False
 False空间复杂度：O(n)（辅助数组）。稳定性：稳定。
 False
 False### 6.4 代码实现
 False
```python
 Truedef merge_sort_topdown(arr):
 True if len(arr) <= 1:
 True return arr
 True mid = len(arr) // 2
 True left = merge_sort_topdown(arr[:mid])
 True right = merge_sort_topdown(arr[mid:])
 True return merge(left, right)
 True
 Truedef merge(left, right):
 True result = []
 True i = j = 0
 True while i < len(left) and j < len(right):
 True if left[i] <= right[j]:
 True result.append(left[i])
 True i += 1
 True else:
 True result.append(right[j])
 True j += 1
 True result.extend(left[i:])
 True result.extend(right[j:])
 True return result
 True
 Truedef merge_sort_bottomup(arr):
 True n = len(arr)
 True width = 1
 True while width < n:
 True for i in range(0, n, 2 * width):
 True left = arr[i:i + width]
 True right = arr[i + width:i + 2 * width]
 True arr[i:i + len(left) + len(right)] = merge(left, right)
 True width *= 2
 True return arr
 True```

```cpp
 Truevoid merge(vector<int>& arr, int left, int mid, int right) {
 True vector<int> tmp(right - left + 1);
 True int i = left, j = mid + 1, k = 0;
 True while (i <= mid && j <= right) {
 True if (arr[i] <= arr[j]) tmp[k++] = arr[i++];
 True else tmp[k++] = arr[j++];
 True }
 True while (i <= mid) tmp[k++] = arr[i++];
 True while (j <= right) tmp[k++] = arr[j++];
 True for (int p = 0; p < k; p++) arr[left + p] = tmp[p];
 True}
 True
 Truevoid mergeSort(vector<int>& arr, int left, int right) {
 True if (left >= right) return;
 True int mid = left + (right - left) / 2;
 True mergeSort(arr, left, mid);
 True mergeSort(arr, mid + 1, right);
 True merge(arr, left, mid, right);
 True}
 True
 Truevoid mergeSortBottomUp(vector<int>& arr) {
 True int n = arr.size();
 True for (int width = 1; width < n; width *= 2) {
 True for (int i = 0; i < n; i += 2 * width) {
 True int mid = min(i + width - 1, n - 1);
 True int right = min(i + 2 * width - 1, n - 1);
 True if (mid < right) merge(arr, i, mid, right);
 True }
 True }
 True}
 True```

 False### 6.5 变体与优化
 False
 False**原地归并排序**：理论上可行但实际效率低，常数因子大，工程中几乎不使用。
 False
 False**自然归并排序**：利用输入中已有的有序子序列（run），减少合并次数。Timsort即基于此思想。
 False
 False**Timsort**：Python和Java的默认排序算法。结合了归并排序和插入排序，对真实世界数据（部分有序）表现优异。时间复杂度：最好O(n)，最坏O(n log n)。
 False
 False---
 False
 False## 7. 堆排序
 False
 False### 7.1 问题描述
 False
 False利用堆这种数据结构进行排序。先将数组构建为最大堆，然后反复取出堆顶（最大值）放到数组末尾，对剩余元素重新调整堆。
 False
 False### 7.2 思路分析
 False
 False堆排序分为两个阶段：
 False
 False**阶段1：建堆**。从最后一个非叶节点开始，自底向上执行sift-down操作。
 False
 False**阶段2：排序**。每次将堆顶元素与末尾元素交换，缩小堆的范围，对新的堆顶执行sift-down。
 False
```
 True建堆过程（sift-down可视化）:
 True
 True 4 4 8
 True / \ -> / \ -> / \
 True 10 3 10 3 10 3
 True / \ / \ / \
 True8 5 8 5 4 5
 True
 True排序过程:
 True[8,10,3,4,5] -> 交换8和5 -> [5,10,3,4,|8] -> sift-down -> [10,5,3,4,|8]
 True[10,5,3,4,|8] -> 交换10和4 -> [4,5,3,|10,8] -> sift-down -> [5,4,3,|10,8]
 True...
 True```

 False### 7.3 复杂度分析
 False
 False**建堆复杂度**：O(n)。虽然直觉上建堆应为O(n log n)，但精确分析显示：
 False
 False第i层（从底向上计数）有2^(h-i)个节点，每个节点最多sift-down i次。总工作量：
 False
 Falsesum(i=0 to h) i * 2^(h-i) = O(2^h) = O(n)
 False
 False**排序阶段**：n-1次sift-down，每次O(log n)，总计O(n log n)。
 False
 False总时间复杂度：O(n) + O(n log n) = O(n log n)。空间复杂度：O(1)。稳定性：不稳定。
 False
 False### 7.4 代码实现
 False
```python
 Truedef heap_sort(arr):
 True n = len(arr)
 True
 True def sift_down(start, end):
 True root = start
 True while True:
 True child = 2 * root + 1
 True if child > end:
 True break
 True if child + 1 <= end and arr[child] < arr[child + 1]:
 True child += 1
 True if arr[root] < arr[child]:
 True arr[root], arr[child] = arr[child], arr[root]
 True root = child
 True else:
 True break
 True
 True for i in range(n // 2 - 1, -1, -1):
 True sift_down(i, n - 1)
 True
 True for i in range(n - 1, 0, -1):
 True arr[0], arr[i] = arr[i], arr[0]
 True sift_down(0, i - 1)
 True
 True return arr
 True```

```cpp
 Truevoid siftDown(vector<int>& arr, int start, int end) {
 True int root = start;
 True while (true) {
 True int child = 2 * root + 1;
 True if (child > end) break;
 True if (child + 1 <= end && arr[child] < arr[child + 1]) child++;
 True if (arr[root] < arr[child]) {
 True swap(arr[root], arr[child]);
 True root = child;
 True } else {
 True break;
 True }
 True }
 True}
 True
 Truevoid heapSort(vector<int>& arr) {
 True int n = arr.size();
 True for (int i = n / 2 - 1; i >= 0; i--) {
 True siftDown(arr, i, n - 1);
 True }
 True for (int i = n - 1; i > 0; i--) {
 True swap(arr[0], arr[i]);
 True siftDown(arr, 0, i - 1);
 True }
 True}
 True```

 False> 跨模块引用：堆是优先队列的底层实现，参见 [[algorithm/tree|树结构]] 中关于堆的详细讨论。
 False
 False---
 False
 False## 8. 非比较排序
 False
 False### 8.1 计数排序
 False
 False适用于元素范围为有限整数的情况。
 False
 False**思路**：统计每个值出现的次数，然后按顺序输出。
 False
 False**复杂度**：时间O(n + k)，空间O(n + k)，其中k为值域范围。
 False
```python
 Truedef counting_sort(arr):
 True if not arr:
 True return arr
 True min_val, max_val = min(arr), max(arr)
 True k = max_val - min_val + 1
 True count = [0] * k
 True for x in arr:
 True count[x - min_val] += 1
 True result = []
 True for i, c in enumerate(count):
 True result.extend([i + min_val] * c)
 True return result
 True```

```cpp
 Truevector<int> countingSort(vector<int>& arr) {
 True if (arr.empty()) return arr;
 True int minVal = *min_element(arr.begin(), arr.end());
 True int maxVal = *max_element(arr.begin(), arr.end());
 True int k = maxVal - minVal + 1;
 True vector<int> count(k, 0);
 True for (int x : arr) count[x - minVal]++;
 True vector<int> result;
 True for (int i = 0; i < k; i++) {
 True for (int j = 0; j < count[i]; j++) {
 True result.push_back(i + minVal);
 True }
 True }
 True return result;
 True}
 True```

 False### 8.2 基数排序
 False
 False按位排序，从最低位到最高位（LSD）或从最高位到最低位（MSD），每位使用稳定排序。
 False
 False**复杂度**：时间O(d * (n + b))，空间O(n + b)，其中d为位数，b为基数。
 False
```python
 Truedef radix_sort(arr):
 True if not arr:
 True return arr
 True max_val = max(arr)
 True exp = 1
 True while max_val // exp > 0:
 True counting_sort_by_digit(arr, exp)
 True exp *= 10
 True return arr
 True
 Truedef counting_sort_by_digit(arr, exp):
 True n = len(arr)
 True output = [0] * n
 True count = [0] * 10
 True for i in range(n):
 True digit = (arr[i] // exp) % 10
 True count[digit] += 1
 True for i in range(1, 10):
 True count[i] += count[i - 1]
 True for i in range(n - 1, -1, -1):
 True digit = (arr[i] // exp) % 10
 True output[count[digit] - 1] = arr[i]
 True count[digit] -= 1
 True for i in range(n):
 True arr[i] = output[i]
 True```

```cpp
 Truevoid countingSortByDigit(vector<int>& arr, int exp) {
 True int n = arr.size();
 True vector<int> output(n);
 True vector<int> count(10, 0);
 True for (int i = 0; i < n; i++) {
 True int digit = (arr[i] / exp) % 10;
 True count[digit]++;
 True }
 True for (int i = 1; i < 10; i++) count[i] += count[i - 1];
 True for (int i = n - 1; i >= 0; i--) {
 True int digit = (arr[i] / exp) % 10;
 True output[count[digit] - 1] = arr[i];
 True count[digit]--;
 True }
 True for (int i = 0; i < n; i++) arr[i] = output[i];
 True}
 True
 Truevoid radixSort(vector<int>& arr) {
 True if (arr.empty()) return;
 True int maxVal = *max_element(arr.begin(), arr.end());
 True for (int exp = 1; maxVal / exp > 0; exp *= 10) {
 True countingSortByDigit(arr, exp);
 True }
 True}
 True```

 False### 8.3 桶排序
 False
 False将元素分配到有限数量的桶中，每个桶内单独排序后合并。
 False
 False**复杂度**：平均O(n + n^2/k)，当k=Theta(n)时为O(n)。最坏O(n^2)。
 False
 False---
 False
 False## 9. 综合对比与选择
 False
 False### 9.1 场景选择指南
 False
 False| 场景 | 推荐算法 | 理由 |
 False|------|----------|------|
 False| 小规模(n < 50) | 插入排序 | 常数因子小，无递归开销 |
 False| 近乎有序 | 插入排序 | O(n)自适应特性 |
 False| 要求稳定 | 归并排序/Timsort | 稳定且O(n log n) |
 False| 内存受限 | 堆排序 | O(1)额外空间 |
 False| 大规模通用 | 快速排序/Introsort | 缓存友好，平均最快 |
 False| 整数范围有限 | 计数排序/基数排序 | O(n)线性时间 |
 False| 链表排序 | 归并排序 | 顺序访问，无需随机 |
 False
 False### 9.2 缓存性能分析
 False
 False快速排序在实际中往往比归并排序快，原因之一是缓存友好性：
 False
 False- 快速排序的分区操作是顺序扫描，局部性好
 False- 归并排序需要额外的辅助数组，访问模式不够局部
 False- 堆排序的sift-down操作跳跃式访问，缓存命中率最低
 False
 False实验数据（n=10^6随机整数，单位ms）：
 False
 False| 算法 | 运行时间 |
 False|------|----------|
 False| 快速排序 | 85 |
 False| 归并排序 | 120 |
 False| 堆排序 | 160 |
 False| std::sort (Introsort) | 78 |
 False
 False---
 False
 False## 10. 排序算法速查表
 False
 False| 算法 | 最好 | 平均 | 最坏 | 空间 | 稳定 | 原地 | 自适应 |
 False|------|------|------|------|------|------|------|--------|
 False| 冒泡 | O(n) | O(n^2) | O(n^2) | O(1) | Y | Y | Y |
 False| 选择 | O(n^2) | O(n^2) | O(n^2) | O(1) | N | Y | N |
 False| 插入 | O(n) | O(n^2) | O(n^2) | O(1) | Y | Y | Y |
 False| Shell | O(nlogn) | O(n^1.3) | O(n^2) | O(1) | N | Y | Y |
 False| 快速 | O(nlogn) | O(nlogn) | O(n^2) | O(logn) | N | Y | N |
 False| 归并 | O(nlogn) | O(nlogn) | O(nlogn) | O(n) | Y | N | N |
 False| 堆 | O(nlogn) | O(nlogn) | O(nlogn) | O(1) | N | Y | N |
 False| 计数 | O(n+k) | O(n+k) | O(n+k) | O(n+k) | Y | N | N |
 False| 基数 | O(dn) | O(dn) | O(dn) | O(n+d) | Y | N | N |
 False| 桶 | O(n+k) | O(n+k) | O(n^2) | O(n+k) | Y | N | N |
 False
 False---
 False
 False## 11. 延伸阅读
 False
 False- CLRS 第 6-8 章
 False- Tim Peters 对 Timsort 的设计说明
 False- [Sorting -- VisuAlgo](https://visualgo.net/en/sorting)
 False- Musser, "Introspective Sorting and Selection Algorithms", 1997
 False- Sedgewick, "Analysis of Shellsort and Related Algorithms", 1996
 False
 False> 跨模块引用：排序算法在搜索预处理中广泛应用，参见 [[algorithm/searching|搜索算法]]。C++ STL排序实现参见 [[cpp/overview|C++基础]]。

### 跨模块关联

- [[cpp/cpp-stl-algorithms|STL 算法]]