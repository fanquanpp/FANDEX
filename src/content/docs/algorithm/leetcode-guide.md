---
title: 'LeetCode 刷题指南'
module: 'algorithm'
category: 'Algorithm/LeetCode'
description: '系统化刷题方法论、题型分类与解题模板、时间管理与面试策略。'
author: 'fanquanpp'
order: 100
tags:
  - 'algorithm'
  - 'algorithm-leetcode'
  - 'data-structure'
  - 'devops'
difficulty: 'intermediate'
---

- [3. 高频题型详解](#3-高频题型详解)
- [4. 刷题节奏与时间管理](#4-刷题节奏与时间管理)
- [5. 面试策略](#5-面试策略)
- [6. 经典题目索引](#6-经典题目索引)
- [7. 刷题速查表](#7-刷题速查表)
- [8. 延伸阅读](#8-延伸阅读)

---

## 1. 刷题方法论

### 1.1 三遍刷题法

**第一遍：理解题意，参考解答**

目标：理解题目要求，学习标准解法。

- 限时20分钟思考，若无思路直接看解答
- 理解解答的每一步，手动模拟执行过程
- 独立写出代码，不要复制粘贴
- 确保代码通过所有测试用例

**第二遍：独立求解，优化方案**

目标：不看解答独立完成，追求最优解。

- 间隔1-2天后重做
- 先写暴力解，再逐步优化
- 分析时间和空间复杂度
- 尝试不同的解法（如递归改迭代、BFS改DFS）

**第三遍：归纳模式，举一反三**

目标：提炼解题模式，建立条件反射。

- 总结题目的核心模式和变形
- 与同类题目对比异同
- 写出解题模板（通用代码框架）
- 尝试一题多解

### 1.2 刷题的常见误区

| 误区             | 正确做法                  |
| ---------------- | ------------------------- |
| 只刷不总结       | 每题写一句话总结核心思路  |
| 追求题量忽视质量 | 一题多解优于多题一解      |
| 只看解答不手写   | 必须手写代码并提交        |
| 跳过Easy直接Hard | Easy建立信心和基础        |
| 只用一种语言     | 至少用Python和C++各写一遍 |
| 忽视边界条件     | 列出所有边界case          |
| 不分析复杂度     | 每题必须分析时间和空间    |

### 1.3 解题四步法

1. **审题**：明确输入输出、约束条件、边界情况
2. **建模**：将问题抽象为已知算法/数据结构问题
3. **编码**：先写伪代码，再翻译为实际代码
4. **验证**：手动模拟、边界测试、复杂度分析

> 跨模块引用：各专题的详细算法参见 [算法分析基础](algorithm/overview) 及子章节。

---

## 2. 题型分类与解题模板

### 2.1 十大题型分类

| 题型        | 核心技巧        | 代表题目       | 建议刷题数 |
| ----------- | --------------- | -------------- | ---------- |
| 数组/双指针 | 排序+双指针     | LC-1/15/11     | 20         |
| 链表        | 快慢指针/反转   | LC-206/141/21  | 15         |
| 树          | 递归/层序遍历   | LC-104/226/102 | 20         |
| 图          | BFS/DFS/拓扑    | LC-200/207/210 | 15         |
| 二分搜索    | 模板+边界       | LC-33/34/69    | 15         |
| 回溯        | DFS+剪枝        | LC-46/78/39    | 15         |
| 动态规划    | 状态定义+转移   | LC-70/322/72   | 25         |
| 贪心        | 排序+局部最优   | LC-55/45/135   | 10         |
| 滑动窗口    | 双指针+哈希     | LC-3/76/209    | 10         |
| 栈/队列     | 单调栈/优先队列 | LC-20/155/239  | 10         |

### 2.2 双指针模板

**对撞指针**：从两端向中间收缩

```python
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1
        else:
            right -= 1
    return []
```

```cpp
vector<int> twoSumSorted(vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    while (left < right) {
        int s = nums[left] + nums[right];
        if (s == target) return {left, right};
        else if (s < target) left++;
        else right--;
    }
    return {};
}
```

**快慢指针**：同向不同速

```python
def remove_duplicates(nums):
    if not nums:
        return 0
    slow = 0
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]
    return slow + 1
```

### 2.3 滑动窗口模板

```python
def sliding_window(s, t):
    from collections import Counter
    need = Counter(t)
    window = Counter()
    left = 0
    valid = 0
    result = []

    for right, ch in enumerate(s):
        window[ch] += 1
        if ch in need and window[ch] == need[ch]:
            valid += 1

        while valid == len(need):
            if right - left + 1 == len(t):
                result.append(left)
            left_ch = s[left]
            if left_ch in need and window[left_ch] == need[left_ch]:
                valid -= 1
            window[left_ch] -= 1
            left += 1

    return result
```

```cpp
string minWindow(string s, string t) {
    unordered_map<char, int> need, window;
    for (char c : t) need[c]++;
    int left = 0, valid = 0, start = 0, minLen = INT_MAX;
    for (int right = 0; right < s.size(); right++) {
        char c = s[right];
        if (need.count(c)) {
            window[c]++;
            if (window[c] == need[c]) valid++;
        }
        while (valid == need.size()) {
            if (right - left + 1 < minLen) {
                start = left;
                minLen = right - left + 1;
            }
            char d = s[left];
            if (need.count(d)) {
                if (window[d] == need[d]) valid--;
                window[d]--;
            }
            left++;
        }
    }
    return minLen == INT_MAX ? "" : s.substr(start, minLen);
}
```

### 2.4 二分搜索模板

```python
def binary_search_template(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

def find_left_bound(nums, target):
    left, right = 0, len(nums)
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left

def find_right_bound(nums, target):
    left, right = 0, len(nums)
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] <= target:
            left = mid + 1
        else:
            right = mid
    return left - 1
```

### 2.5 回溯模板

```python
def backtrack_template(nums):
    result = []

    def backtrack(path, choices):
        if len(path) == len(nums):
            result.append(path[:])
            return
        for choice in choices:
            if choice in path:
                continue
            path.append(choice)
            backtrack(path, choices)
            path.pop()

    backtrack([], nums)
    return result

def combination_sum(candidates, target):
    result = []

    def backtrack(start, path, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        if remaining < 0:
            return
        for i in range(start, len(candidates)):
            path.append(candidates[i])
            backtrack(i, path, remaining - candidates[i])
            path.pop()

    backtrack(0, [], target)
    return result
```

```cpp
vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
    vector<vector<int>> result;
    vector<int> path;
    function<void(int, int)> backtrack = [&](int start, int remaining) {
        if (remaining == 0) { result.push_back(path); return; }
        if (remaining < 0) return;
        for (int i = start; i < candidates.size(); i++) {
            path.push_back(candidates[i]);
            backtrack(i, remaining - candidates[i]);
            path.pop_back();
        }
    };
    backtrack(0, target);
    return result;
}
```

### 2.6 BFS模板

```python
from collections import deque

def bfs_template(graph, start):
    visited = set([start])
    queue = deque([(start, 0)])
    while queue:
        node, dist = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    return visited
```

### 2.7 DFS/递归模板

```python
def dfs_template(root):
    if not root:
        return base_case_value
    left_result = dfs_template(root.left)
    right_result = dfs_template(root.right)
    return combine(left_result, right_result, root)
```

---

## 3. 高频题型详解

### 3.1 子集/排列/组合

| 题型 | 特征     | 解法                 |
| ---- | -------- | -------------------- |
| 子集 | 选或不选 | 回溯，每层选/不选    |
| 排列 | 顺序有关 | 回溯，用used数组去重 |
| 组合 | 顺序无关 | 回溯，用start去重    |

**去重技巧**：排序后跳过相同元素

```python
def subsets_with_dup(nums):
    nums.sort()
    result = []
    def backtrack(start, path):
        result.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i-1]:
                continue
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()
    backtrack(0, [])
    return result
```

### 3.2 单调栈

单调栈用于寻找"下一个更大/更小元素"。

```python
def next_greater_element(nums):
    n = len(nums)
    result = [-1] * n
    stack = []
    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            result[stack.pop()] = nums[i]
        stack.append(i)
    return result
```

```cpp
vector<int> nextGreaterElement(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, -1);
    stack<int> stk;
    for (int i = 0; i < n; i++) {
        while (!stk.empty() && nums[stk.top()] < nums[i]) {
            result[stk.top()] = nums[i];
            stk.pop();
        }
        stk.push(i);
    }
    return result;
}
```

**应用场景**：

- 柱状图最大矩形（LC-84）
- 每日温度（LC-739）
- 接雨水（LC-42）

### 3.3 前缀和与差分

**前缀和**：快速计算区间和

```python
class PrefixSum:
    def __init__(self, nums):
        self.prefix = [0] * (len(nums) + 1)
        for i in range(len(nums)):
            self.prefix[i + 1] = self.prefix[i] + nums[i]

    def range_sum(self, left, right):
        return self.prefix[right + 1] - self.prefix[left]
```

**差分数组**：快速区间修改

```python
class DifferenceArray:
    def __init__(self, nums):
        self.diff = [0] * len(nums)
        self.diff[0] = nums[0]
        for i in range(1, len(nums)):
            self.diff[i] = nums[i] - nums[i - 1]

    def range_add(self, left, right, val):
        self.diff[left] += val
        if right + 1 < len(self.diff):
            self.diff[right + 1] -= val

    def get_result(self):
        result = [self.diff[0]]
        for i in range(1, len(self.diff)):
            result.append(result[-1] + self.diff[i])
        return result
```

### 3.4 位运算技巧

| 技巧        | 表达式                  | 应用        |
| ----------- | ----------------------- | ----------- |
| 判断奇偶    | n & 1                   | 代替 n % 2  |
| 最低位1     | n & (-n)                | 树状数组    |
| 去掉最低位1 | n & (n-1)               | 计数1的个数 |
| 交换两数    | a ^= b; b ^= a; a ^= b  | 无临时变量  |
| 子集枚举    | for mask in range(1<<n) | 状态压缩DP  |

```python
def count_bits(n):
    result = [0] * (n + 1)
    for i in range(1, n + 1):
        result[i] = result[i & (i - 1)] + 1
    return result
```

---

## 4. 刷题节奏与时间管理

### 4.1 分阶段计划

**入门期（1-4周）**：

| 天数      | 内容          | 题量   |
| --------- | ------------- | ------ |
| 第1-7天   | 数组+链表基础 | 2题/天 |
| 第8-14天  | 树+递归       | 2题/天 |
| 第15-21天 | 二分+栈/队列  | 2题/天 |
| 第22-28天 | 哈希表+字符串 | 2题/天 |

**进阶期（5-12周）**：

| 天数      | 内容            | 题量     |
| --------- | --------------- | -------- |
| 第5-6周   | 动态规划入门    | 3题/天   |
| 第7-8周   | 回溯+DFS/BFS    | 3题/天   |
| 第9-10周  | 图算法          | 3题/天   |
| 第11-12周 | 综合练习+Hard题 | 2-3题/天 |

**冲刺期（面试前2-4周）**：

- 每天模拟1场面试（45分钟2题）
- 重点复习高频题Top 100
- 针对目标公司刷公司标签题

### 4.2 每日时间分配

| 时段 | 活动             | 时长  |
| ---- | ---------------- | ----- |
| 早晨 | 新题（头脑清醒） | 45min |
| 午间 | 复习昨日题目     | 20min |
| 晚间 | 总结+模板整理    | 30min |

### 4.3 题目难度分配

| 阶段   | Easy | Medium | Hard |
| ------ | ---- | ------ | ---- |
| 入门期 | 60%  | 40%    | 0%   |
| 进阶期 | 20%  | 60%    | 20%  |
| 冲刺期 | 10%  | 50%    | 40%  |

---

## 5. 面试策略

### 5.1 面试中的解题流程

```
1. 确认题意（2-3分钟）
   - 复述题目
   - 确认输入输出格式
   - 询问约束条件
   - 讨论边界情况

2. 思路与沟通（5-8分钟）
   - 先说暴力解
   - 分析瓶颈
   - 提出优化思路
   - 与面试官确认方向

3. 编码实现（15-20分钟）
   - 先写框架，再填细节
   - 变量命名清晰
   - 适当添加注释

4. 测试与优化（5-10分钟）
   - 用示例手动模拟
   - 检查边界条件
   - 分析复杂度
   - 讨论可能的优化
```

### 5.2 常见面试公司侧重

| 公司      | 侧重方向        | 典型题目风格   |
| --------- | --------------- | -------------- |
| Google    | 算法设计+复杂度 | 图/DP/数学     |
| Meta      | 代码实现+速度   | 双指针/BFS/树  |
| Amazon    | 行为面试+基础   | 设计题/树/数组 |
| Microsoft | 边界处理+工程   | 字符串/模拟    |
| 字节跳动  | 算法难度+手写   | DP/图/贪心     |
| 腾讯      | 基础扎实+变通   | 链表/树/排序   |

### 5.3 代码风格建议

1. **命名规范**：变量名体现含义，避免a/b/c
2. **模块化**：抽取公共逻辑为辅助函数
3. **防御性编程**：检查空输入、越界等
4. **复杂度声明**：代码开头注释时间和空间复杂度

```python
def two_sum(nums, target):
    """
    Time: O(n), Space: O(n)
    """
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
```

---

## 6. 经典题目索引

### 6.1 必刷100题（按专题）

**数组与双指针**：

- LC-1 Two Sum / LC-15 3Sum / LC-11 Container With Most Water
- LC-26 Remove Duplicates / LC-27 Remove Element / LC-283 Move Zeroes
- LC-42 Trapping Rain Water / LC-75 Sort Colors

**链表**：

- LC-206 Reverse Linked List / LC-141 Linked List Cycle
- LC-21 Merge Two Sorted Lists / LC-23 Merge K Sorted Lists
- LC-19 Remove Nth From End / LC-160 Intersection of Two Linked Lists

**树**：

- LC-104 Max Depth / LC-226 Invert Binary Tree / LC-102 Level Order
- LC-98 Validate BST / LC-236 Lowest Common Ancestor
- LC-124 Binary Tree Max Path Sum / LC-297 Serialize/Deserialize

**二分搜索**：

- LC-33 Search in Rotated Array / LC-34 Find First and Last
- LC-69 Sqrt(x) / LC-153 Find Min in Rotated Array
- LC-162 Find Peak Element / LC-4 Median of Two Sorted Arrays

**动态规划**：

- LC-70 Climbing Stairs / LC-198 House Robber / LC-213 House Robber II
- LC-322 Coin Change / LC-72 Edit Distance / LC-300 LIS
- LC-1143 LCS / LC-139 Word Break / LC-312 Burst Balloons

**图与搜索**：

- LC-200 Number of Islands / LC-207 Course Schedule
- LC-210 Course Schedule II / LC-133 Clone Graph
- LC-127 Word Ladder / LC-785 Is Graph Bipartite

**回溯**：

- LC-46 Permutations / LC-78 Subsets / LC-39 Combination Sum
- LC-17 Letter Combinations / LC-22 Generate Parentheses
- LC-51 N-Queens / LC-37 Sudoku Solver

**栈与队列**：

- LC-20 Valid Parentheses / LC-155 Min Stack
- LC-232 Implement Queue using Stacks / LC-239 Sliding Window Maximum
- LC-84 Largest Rectangle in Histogram

**字符串**：

- LC-3 Longest Substring Without Repeating / LC-5 Longest Palindromic Substring
- LC-76 Minimum Window Substring / LC-49 Group Anagrams

### 6.2 按难度递进

**Easy入门（前30题）**：
1, 7, 9, 13, 14, 20, 21, 26, 27, 35, 53, 58, 66, 70, 83, 88, 94, 100, 101, 104, 108, 110, 111, 112, 118, 119, 121, 122, 125, 136

**Medium进阶（核心50题）**：
2, 3, 5, 11, 15, 17, 19, 22, 33, 34, 39, 40, 46, 48, 49, 50, 55, 56, 62, 64, 69, 75, 78, 79, 82, 86, 92, 98, 102, 114, 127, 139, 142, 148, 150, 152, 153, 162, 198, 200, 207, 209, 210, 215, 221, 236, 238, 287, 300, 322

**Hard挑战（精选20题）**：
4, 23, 25, 30, 37, 42, 44, 51, 65, 72, 76, 84, 85, 124, 126, 128, 140, 146, 212, 239

---

## 7. 刷题速查表

### 7.1 解题模式速查

| 关键词       | 推荐算法/技巧               |
| ------------ | --------------------------- |
| "有序数组"   | 二分搜索                    |
| "最短路径"   | BFS / Dijkstra              |
| "所有方案"   | 回溯                        |
| "最大/最小"  | DP / 贪心 / 二分答案        |
| "连续子数组" | 滑动窗口 / 前缀和           |
| "下一个更大" | 单调栈                      |
| "前K个"      | 堆 / 快速选择               |
| "去重"       | 哈希表 / 排序               |
| "拓扑排序"   | Kahn / DFS后序              |
| "环检测"     | 快慢指针 / 并查集 / DFS颜色 |
| "区间问题"   | 排序+贪心 / DP              |
| "位运算"     | 状态压缩 / 位掩码           |

### 7.2 数据结构选择速查

| 需求          | 推荐数据结构      |
| ------------- | ----------------- |
| O(1)查找      | 哈希表            |
| 有序遍历      | BST / 红黑树      |
| 最大/最小值   | 堆                |
| 前缀查询      | Trie              |
| 最近使用      | 哈希表+双向链表   |
| 区间查询      | 线段树 / 树状数组 |
| 连通性        | 并查集            |
| 最近更小/更大 | 单调栈            |

### 7.3 复杂度速查

| n的范围   | 可接受的复杂度        |
| --------- | --------------------- |
| n <= 10   | O(n!), O(2^n)         |
| n <= 20   | O(2^n), O(n^2 \* 2^n) |
| n <= 100  | O(n^3)                |
| n <= 1000 | O(n^2)                |
| n <= 10^5 | O(n sqrt(n))          |
| n <= 10^6 | O(n log n)            |
| n <= 10^8 | O(n)                  |
| n > 10^8  | O(log n), O(1)        |

---

## 8. 延伸阅读

- [LeetCode官方题解](https://leetcode.cn/problemset/all/)
- [labuladong的算法小抄](https://labuladong.github.io/algo/)
- [Grind 75](https://www.techinterviewhandbook.org/grind75)
- [NeetCode 150](https://neetcode.io/)
- 《剑指 Offer》(何海涛)
- 《编程之美》

> 跨模块引用：各算法专题的详细分析参见 [排序算法](algorithm/sorting)、[搜索算法](algorithm/searching)、[动态规划](algorithm/dynamic-programming)、[贪心算法](algorithm/greedy)、[图论算法](algorithm/graph)、[链表](algorithm/linked-list)、[树结构](algorithm/tree)、[哈希表](algorithm/hashtable)。语言基础参见 [C++基础](cpp/overview) 和 [Python基础](python/overview)。
