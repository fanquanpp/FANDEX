---
order: 120
tags:
  - 'algorithm'
  - 'exercises'
  - 'git-workflow'
difficulty: 'intermediate'
title: '算法练习题'
module: 'algorithm'
description: '算法核心知识点配套练习，涵盖排序、图论与动态规划。'
---

<summary>查看答案</summary>
**答案**: B
**解析**: 快速排序平均情况下每次划分将数组近似对半分，递归深度 O(log n)，每层比较 O(n)，总复杂度 O(n log n)。最坏情况（如已排序数组且选首元素为 pivot）每次划分极不均匀，退化为 O(n²)。可通过随机化 pivot 或三数取中避免最坏情况。
</details>
### 2. 0-1 背包问题的时间复杂度是？
A. O(nW)，其中 n 是物品数，W 是背包容量
B. O(2ⁿ)
C. O(n²)
D. O(n log n)
<details>
<summary>查看答案</summary>
**答案**: A
**解析**: 0-1 背包的 DP 解法状态数为 n × W，每个状态转移 O(1)，总复杂度 O(nW)。注意这是伪多项式时间，因为 W 的输入大小为 log W。暴力枚举是 O(2ⁿ)。
</details>
### 3. 在有序数组中二分查找目标值，若目标不存在，`left` 指针最终指向？
A. 小于目标的最大元素位置
B. 大于等于目标的最小元素位置
C. 目标应插入的位置
D. B 和 C 都正确
<details>
<summary>查看答案</summary>
**答案**: D
**解析**: 标准二分查找中，循环结束时 `left` 指向第一个大于等于目标的位置（即下界），这也是目标应插入的位置以保持有序。这正是 `bisect_left` / `lower_bound` 的语义。
</details>
### 4. BFS 和 DFS 的主要区别是？
A. BFS 用栈，DFS 用队列
B. BFS 用队列，DFS 用栈（或递归调用栈）
C. BFS 只能用于树，DFS 只能用于图
D. BFS 空间复杂度总是优于 DFS
<details>
<summary>查看答案</summary>
**答案**: B
**解析**: BFS 使用队列（先进先出）实现层序遍历，DFS 使用栈（后进先出）或递归实现深度优先遍历。两者都可用于树和图。空间复杂度取决于具体场景：BFS 最坏 O(宽度)，DFS 最坏 O(深度)。
</details>
### 5. 以下哪个问题不适合用贪心算法求解？
A. 活动选择问题
B. Huffman 编码
C. 0-1 背包问题
D. Dijkstra 最短路径
<details>
<summary>查看答案</summary>
**答案**: C
**解析**: 0-1 背包问题中，局部最优选择（贪心选性价比最高的物品）不能保证全局最优，因为物品不可分割。需要用动态规划求解。活动选择、Huffman 编码和 Dijkstra 都有贪心选择性质和最优子结构。
</details>
## 编程题
### 1. 合并区间（排序）
给定一组区间，合并所有重叠区间。
**输入**: `[[1,3],[2,6],[8,10],[15,18]]`
**输出**: `[[1,6],[8,10],[15,18]]`
<details>
<summary>查看参考答案</summary>
```python
 def merge(intervals):
  if not intervals:
  return []
  intervals.sort(key=lambda x: x[0])
  merged = [intervals[0]]
  for start, end in intervals[1:]:
  if start <= merged[-1][1]:
  merged[-1][1] = max(merged[-1][1], end)
  else:
  merged.append([start, end])
  return merged
 ```
</details>
### 2. 最长递增子序列（动态规划）
给定整数数组，找到最长严格递增子序列的长度。
**输入**: `[10, 9, 2, 5, 3, 7, 101, 18]`
**输出**: `4`（子序列为 [2, 3, 7, 101]）
<details>
<summary>查看参考答案</summary>
```python
 import bisect
 def length_of_lis(nums):
  tails = []
  for num in nums:
  pos = bisect.bisect_left(tails, num)
  if pos == len(tails):
  tails.append(num)
  else:
  tails[pos] = num
  return len(tails)
 ```
</details>
### 3. 搜索旋转排序数组（二分查找）
升序数组在某个未知点旋转后，搜索目标值，返回索引，不存在返回 -1。时间复杂度 O(log n)。
**输入**: `nums = [4,5,6,7,0,1,2], target = 0`
**输出**: `4`
<details>
<summary>查看参考答案</summary>
```python
 def search(nums, target):
  left, right = 0, len(nums) - 1
  while left <= right:
  mid = (left + right) // 2
  if nums[mid] == target:
  return mid
  if nums[left] <= nums[mid]:
  if nums[left] <= target < nums[mid]:
  right = mid - 1
  else:
  left = mid + 1
  else:
  if nums[mid] < target <= nums[right]:
  left = mid + 1
  else:
  right = mid - 1
  return -1
 ```
</details>
### 4. 岛屿数量（BFS/DFS）
给定二维网格（`'1'` 表示陆地，`'0'` 表示水），计算岛屿数量。
**输入**:
```
 [['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1']]
 ```
**输出**: `3`
<details>
<summary>查看参考答案</summary>
```python
 def num_islands(grid):
  if not grid:
  return 0
  rows, cols = len(grid), len(grid[0])
  count = 0
  def dfs(r, c):
  if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
  return
  grid[r][c] = '#'
  dfs(r + 1, c)
  dfs(r - 1, c)
  dfs(r, c + 1)
  dfs(r, c - 1)
  for r in range(rows):
  for c in range(cols):
  if grid[r][c] == '1':
  dfs(r, c)
  count += 1
  return count
 ```
</details>
### 5. 跳跃游戏 II（贪心）
给定非负整数数组，每个元素表示该位置可跳跃的最大步数，求到达最后一个位置的最少跳跃次数。
**输入**: `nums = [2,3,1,1,4]`
**输出**: `2`（从索引 0 跳到索引 1，再跳到索引 4）
<details>
<summary>查看参考答案</summary>
```python
 def jump(nums):
  jumps = 0
  current_end = 0
  farthest = 0
  for i in range(len(nums) - 1):
  farthest = max(farthest, i + nums[i])
  if i == current_end:
  jumps += 1
  current_end = farthest
  return jumps
 ```
</details>
