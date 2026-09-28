---
order: 340
title: LeetCode 分类题型手册：十大高频题型的识别信号、解题模板与代表题
module: 'algorithm'
category: 计算机科学
difficulty: advanced
description: LeetCode 分类题型手册按"识别信号、解题模板、代表题与预期输出"三段式整理十大高频题型：双指针（对撞/快慢指针）、滑动窗口（valid 计数框架）、二分查找（精确匹配/左边界/右边界/旋转排序数组）、前缀和与差分、栈与单调栈、哈希表、链表操作（迭代反转/Floyd 判圈/虚拟头节点）、二叉树递归（后序框架/层序遍历）、BFS 与 DFS（无权图最短路/Kahn 拓扑排序/沉岛/二叉树右侧视图）、动态规划入门（线性 DP/二维 DP/优化链路：暴力→记忆化→迭代→状态压缩），另附回溯与位运算补充模板、七大常见陷阱与修正（二分边界死循环、滑动窗口收缩条件、DP 初始条件、回溯去重、二分 mid 溢出、visited 标记时机、Python 递归栈溢出）及工业应用案例（LC-146 与 Redis LRU/LFU、并查集与 Kubernetes/Git、单调队列与 Prometheus、Trie 敏感词过滤、LC-215 QuickSelect 与 Top-K）。每题模板附 Python 实现与可复现的预期输出，关键模板另附 C++；刷题路线与面试策略见姊妹篇《LeetCode 刷题指南》。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'algorithm/300-LeetCodeInterviewGuide'
  - 'algorithm/070-HashTable'
  - 'algorithm/060-LinkedList'
  - 'algorithm/040-StackAndQueue'
  - 'algorithm/080-Tree'
  - 'algorithm/170-BinarySearchAlgorithms'
  - 'algorithm/140-RecursionAndBacktracking'
  - 'algorithm/160-DynamicProgramming'
  - 'algorithm/110-GraphAlgorithms'
prerequisites:
  - 'algorithm/300-LeetCodeInterviewGuide'
---

> 使用方式：本篇是题型速查手册，回答「每类题怎么解」；刷题路线与节奏见姊妹篇 [LeetCode 刷题指南](/algorithm/300-LeetCodeInterviewGuide)。

拿到一道新题，第一步不是写代码，而是识别题型——题面出现「连续子数组」指向滑动窗口，「第 K 大」指向堆，「所有排列组合」指向回溯，「两个有序数组找中位数」指向二分。识别对了，剩下的是默写模板；识别错了，写再多代码也是白费。本篇按十类高频题型组织速查条目：每类给出识别信号、可默写的解题模板与两道带预期输出的代表题。读完后，你应能把「看题、报出算法名、写出主干」压缩到五分钟内。

## 前置知识

- [LeetCode 刷题指南：方法论、路线与面试策略](/algorithm/300-LeetCodeInterviewGuide)（刷题总路线、复杂度反推、三遍刷题法）
- [算法分析基础与学习路线](/algorithm/010-AlgorithmAnalysisBasics)
- [递归与回溯](/algorithm/140-RecursionAndBacktracking)

本篇各章开头的"识别信号"对应刷题指南第 3.2 节的读题清单；数据范围信号对应其定理 3.1（复杂度反推表）。

## 1. 使用说明与十大题型总表

每章按固定三段式组织：

1. **识别信号**：题面关键词（出现什么词想什么算法）与数据范围信号（$n$ 的规模指向什么复杂度）；
2. **解题模板**：可直接背诵与默写的主干代码，Python 为主、关键模板附 C++，单个模板控制在 20 行内；
3. **代表题**：每类 2 道高频题，给出调用示例与 `text` 标注的预期输出，便于自测对照。

约定：示例代码按章节顺序可依次运行（`ListNode`、`TreeNode` 等辅助类在同章定义，依赖仅限标准库）；`text` 代码块中的内容为对应 `print` 的真实输出。刷题顺序建议见刷题指南第 3.3 节总路线表。

| 题型 | 核心技巧 | 代表题目 | 建议刷题数 | 复杂度典型 | 本篇章节 |
| ---- | -------- | -------- | ---------- | ---------- | -------- |
| 数组/双指针 | 排序+对撞/快慢指针 | LC-1/15/11/42 | 25 | $O(n)$ 或 $O(n \log n)$ | 第 2 章 |
| 滑动窗口 | 双指针+哈希/计数 | LC-3/76/239/438 | 12 | $O(n)$ | 第 3 章 |
| 二分查找 | 模板+边界处理 | LC-33/34/69/153 | 15 | $O(\log n)$ | 第 4 章 |
| 前缀和/差分 | 预处理+O(1) 查询/修改 | LC-303/560/1109 | 10 | $O(n)$ 预处理 | 第 5 章 |
| 栈/单调栈 | 后进先出/下一个更大 | LC-20/496/739/84 | 12 | $O(n)$ | 第 6 章 |
| 哈希表 | 空间换时间的查找与计数 | LC-1/217/242/560 | 15 | $O(n)$ | 第 7 章 |
| 链表 | 快慢指针/反转/虚拟头 | LC-206/141/21/19 | 20 | $O(n)$ | 第 8 章 |
| 树（递归） | 递归三问/层序 | LC-104/226/102/98/236 | 25 | $O(n)$ | 第 9 章 |
| 图 BFS/DFS | 队列/栈/拓扑排序 | LC-200/207/210/743 | 20 | $O(V+E)$ | 第 10 章 |
| 动态规划 | 状态定义+转移方程 | LC-70/198/300/322/72 | 30 | $O(n^2)$ 或 $O(n)$ | 第 11 章 |

补充题型（回溯、位运算）见第 12 章；每类的工业应用案例见第 13 章；代码修正类自测题见第 14 章。

## 2. 双指针：对撞与快慢

**识别信号**：

- 题面关键词："有序数组"求两数/三数之和、"回文"、"盛水/接水"（对撞指针）；"原地去重/原地移动"、"链表中点"、"环检测"（快慢指针）
- 数据范围：$n \leq 10^5$ 且要求 $O(n)$ 时间、$O(1)$ 空间——排序后对撞或原地快慢是首选

### 2.1 解题模板

**对撞指针**（不变式：`left < right` 期间每次至少收缩一端）：

```python
def two_sum_sorted(nums: list[int], target: int) -> list[int]:
    """对撞指针：有序数组两数之和
    不变式：若解存在，必在 [left, right] 区间内
    时间 O(n)，空间 O(1)
    """
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1  # 和太小，左端右移
        else:
            right -= 1  # 和太大，右端左移
    return []
```

```cpp
#include <vector>
using namespace std;

// 对撞指针 C++ 实现
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

**快慢指针**（原地去重，不变式：`nums[0..slow]` 为已去重前缀）：

```python
def remove_duplicates(nums: list[int]) -> int:
    """快慢指针：有序数组原地去重
    时间 O(n)，空间 O(1)
    """
    if not nums:
        return 0
    slow = 0
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]
    return slow + 1
```

链表环检测的 Floyd 判圈版本见第 8 章链表操作（快慢指针在链表上的典型应用）。

### 2.2 代表题

**LC-167 两数之和 II（输入有序数组）**：

```python
print(two_sum_sorted([2, 7, 11, 15], 9))
print(two_sum_sorted([2, 3, 4], 6))
```

```text
[0, 1]
[0, 2]
```

**LC-125 验证回文串**（对撞指针跳过非字母数字字符）：

```python
def is_palindrome(s: str) -> bool:
    """LC-125 验证回文串，忽略大小写与非字母数字字符"""
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left, right = left + 1, right - 1
    return True

print(is_palindrome("A man, a plan, a canal: Panama"))
print(is_palindrome("race a car"))
```

```text
True
False
```

**经典题目**：LC-11 Container With Most Water（每次移动较短边）、LC-15 3Sum（排序+对撞，$O(n^2)$）、LC-42 Trapping Rain Water（对撞或单调栈，见第 6 章）、LC-125 Valid Palindrome、LC-26/27 原地删除。

## 3. 滑动窗口

**识别信号**：

- 题面关键词："连续子数组/子串" + "最长/最短/计数/覆盖"；"包含 t 的全部字符"（覆盖类）；"无重复字符"
- 数据范围：$n \leq 10^5$ 且要求 $O(n)$——暴力枚举所有子串为 $O(n^2)$，不可行时窗口是信号
- 变体提示：定长窗口用固定步进；"窗口内最大值"要用单调队列而非普通窗口（见第 6 章与第 13 章 Prometheus 案例）

### 3.1 解题模板

**valid 计数框架**（不变式：`window` 恒等于 `s[left..right]` 的字符计数）：

```python
def find_anagrams(s: str, t: str) -> list[int]:
    """滑动窗口模板（LC-438 找所有字母异位词）
    valid 记录计数恰好满足 need 的字符种类数
    时间 O(n)，空间 O(k)，k 为字符集大小
    """
    from collections import Counter
    need, window, valid = Counter(t), Counter(), 0
    left, result = 0, []
    for right, ch in enumerate(s):
        window[ch] += 1
        if ch in need and window[ch] == need[ch]:
            valid += 1
        while valid == len(need):
            if right - left + 1 == len(t):
                result.append(left)
            out = s[left]
            if out in need and window[out] == need[out]:
                valid -= 1
            window[out] -= 1
            left += 1
    return result
```

```cpp
#include <string>
#include <unordered_map>
#include <climits>
using namespace std;

// 最小覆盖子串 LC-76
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

### 3.2 代表题

**LC-3 无重复字符的最长子串**：

```python
def length_of_longest_substring(s: str) -> int:
    """LC-3：window 集合维护无重复窗口"""
    window = set()
    left = ans = 0
    for right, ch in enumerate(s):
        while ch in window:
            window.remove(s[left])
            left += 1
        window.add(ch)
        ans = max(ans, right - left + 1)
    return ans

print(length_of_longest_substring("abcabcbb"))
print(length_of_longest_substring("bbbbb"))
print(length_of_longest_substring("pwwkew"))
```

```text
3
1
3
```

**LC-438 找到字符串中所有字母异位词**（即第 3.1 节模板本体）：

```python
print(find_anagrams("cbaebabacd", "abc"))
print(find_anagrams("abab", "ab"))
```

```text
[0, 6]
[0, 1, 2]
```

### 3.3 常见陷阱：收缩条件写错

::: danger
**错误示例**：用 `len(window) == len(need)` 判断窗口是否覆盖 `t`。

```python
while len(window) == len(need):  # 错误
    ...
```

**错误原因**：`window` 记录的是窗口内所有字符（含 `t` 中不存在的字符），字符种类通常会超过 `need`，该条件永远不成立或提前成立。正确做法是用 `valid` 计数（有多少种字符的计数恰好满足 `need`），即第 3.1 节模板的写法。
:::

**经典题目**：LC-3、LC-76 Minimum Window Substring（Hard）、LC-438、LC-239 Sliding Window Maximum（Hard，单调队列，见第 13 章）。

## 4. 二分查找

**识别信号**：

- 题面关键词："有序数组"、"旋转排序数组"、"第一个/最后一个满足条件的位置"、"最小化最大值/最大化最小值"（二分答案）
- 数据范围：$n \leq 10^9$ 或对"答案空间"二分（运算次数 $O(\log n)$）——复杂度反推的高频出口（刷题指南定理 3.1 最后一行）

### 4.1 解题模板

三种二分的边界互不相同，务必整组记忆（记忆口诀见本章陷阱一）：

```python
def binary_search(nums: list[int], target: int) -> int:
    """模板一：精确匹配（闭区间 [left, right]）"""
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2  # 防溢出写法
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

def find_left_bound(nums: list[int], target: int) -> int:
    """模板二：左边界（第一个 >= target 的位置，左闭右开）"""
    left, right = 0, len(nums)
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left

def find_right_bound(nums: list[int], target: int) -> int:
    """模板三：右边界（最后一个 <= target 的位置）"""
    left, right = 0, len(nums)
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] <= target:
            left = mid + 1
        else:
            right = mid
    return left - 1
```

**旋转排序数组搜索**（LC-33，关键：先判断哪一半有序）：

```python
def search_rotated(nums: list[int], target: int) -> int:
    """旋转排序数组搜索，时间 O(log n)"""
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        if nums[left] <= nums[mid]:  # 左半段有序
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:  # 右半段有序
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1
```

### 4.2 代表题

**LC-704 二分查找**：

```python
print(binary_search([-1, 0, 3, 5, 9, 12], 9))
print(binary_search([-1, 0, 3, 5, 9, 12], 2))
print(find_left_bound([5, 7, 7, 8, 8, 10], 8))
print(find_right_bound([5, 7, 7, 8, 8, 10], 8))
```

```text
4
-1
3
4
```

**LC-33 搜索旋转排序数组**：

```python
print(search_rotated([4, 5, 6, 7, 0, 1, 2], 0))
print(search_rotated([4, 5, 6, 7, 0, 1, 2], 3))
```

```text
4
-1
```

### 4.3 常见陷阱

::: danger
**陷阱一：边界混用导致死循环**。左边界二分中若写成 `right = len(nums) - 1` 配 `while left <= right` 与 `right = mid`，当 `left == right` 时 `mid == left`，反复进入死循环。修正：三套边界一一配对——

- **精确匹配**：`right = len(nums) - 1`，`while left <= right`，`left = mid + 1` / `right = mid - 1`
- **左边界**：`right = len(nums)`，`while left < right`，`right = mid`
- **右边界**：`right = len(nums)`，`while left < right`，`nums[mid] <= target` 时 `left = mid + 1`，返回 `left - 1`
:::

::: danger
**陷阱二：mid 计算溢出**。`(left + right) // 2` 在 C++/Java 中 `left + right` 可能超过 `int` 上限 $2^{31}-1$，使 `mid` 为负。修正：`mid = left + (right - left) / 2`（Python 整数无溢出，但面试写法应与工业一致）。
:::

**经典题目**：LC-33、LC-34 Find First and Last Position（左右边界组合）、LC-69 Sqrt(x)、LC-153 Find Minimum in Rotated Sorted Array、LC-4 Median of Two Sorted Arrays（Hard）。

## 5. 前缀和与差分

**识别信号**：

- 题面关键词："多次询问区间和"（前缀和）、"区间整体加减"（差分）、"和为 k 的子数组"（前缀和 + 哈希）
- 数据范围：多次查询 $O(1)$ 化——预处理 $O(n)$，查询 $O(1)$；若要求可修改，则升级为线段树/树状数组（超出本篇，见刷题指南第 9.4 节）

### 5.1 解题模板

```python
class PrefixSum:
    """前缀和：构造 O(n)，区间和查询 O(1)"""

    def __init__(self, nums: list[int]):
        self.prefix = [0] * (len(nums) + 1)
        for i in range(len(nums)):
            self.prefix[i + 1] = self.prefix[i] + nums[i]

    def range_sum(self, left: int, right: int) -> int:
        """返回 nums[left..right] 的和"""
        return self.prefix[right + 1] - self.prefix[left]

class DifferenceArray:
    """差分数组：区间修改 O(1)，还原 O(n)"""

    def __init__(self, nums: list[int]):
        self.diff = [0] * len(nums)
        self.diff[0] = nums[0]
        for i in range(1, len(nums)):
            self.diff[i] = nums[i] - nums[i - 1]

    def range_add(self, left: int, right: int, val: int) -> None:
        self.diff[left] += val
        if right + 1 < len(self.diff):
            self.diff[right + 1] -= val

    def get_result(self) -> list[int]:
        result = [self.diff[0]]
        for i in range(1, len(self.diff)):
            result.append(result[-1] + self.diff[i])
        return result
```

"和为 k 的子数组"是前缀和与第 7 章哈希表的组合技：

```python
def subarray_sum(nums: list[int], k: int) -> int:
    """LC-560：前缀和之差等于 k 的配对计数
    时间 O(n)，空间 O(n)
    """
    from collections import defaultdict
    count = defaultdict(int)
    count[0] = 1  # 空前缀
    ans = s = 0
    for x in nums:
        s += x
        ans += count[s - k]
        count[s] += 1
    return ans
```

### 5.2 代表题

**LC-303 区域和检索（数组不可变）**：

```python
ps = PrefixSum([-2, 0, 3, -5, 2, -1])
print(ps.range_sum(0, 2))
print(ps.range_sum(2, 5))
print(ps.range_sum(0, 5))
```

```text
1
-1
-3
```

**LC-560 和为 K 的子数组**：

```python
print(subarray_sum([1, 1, 1], 2))
print(subarray_sum([1, 2, 3], 3))
```

```text
2
2
```

差分的使用示例：对 `[1, 2, 3, 4, 5]` 执行 `range_add(1, 3, 10)` 后 `get_result()` 输出 `[1, 12, 13, 14, 5]`。

**经典题目**：LC-303、LC-304 二维前缀和、LC-560、LC-1109 Corporate Flight Bookings（差分）、LC-1094 Car Pooling（差分）。

## 6. 栈与单调栈

**识别信号**：

- 题面关键词："括号匹配/表达式求值"（普通栈）；"下一个更大/更小元素"、"第一个比它高/大的"、"柱状图最大矩形"、"接雨水"（单调栈）
- 数据范围：$n \leq 10^5$ 暴力 $O(n^2)$ 超时，需要"每个元素最多入栈出栈一次"的 $O(n)$ 单调结构

### 6.1 解题模板

```python
def next_greater_element(nums: list[int]) -> list[int]:
    """单调栈：每个元素的下一个更大元素（无则 -1）
    不变式：栈内索引对应的值从栈底到栈顶单调递减
    时间 O(n)，空间 O(n)
    """
    n = len(nums)
    result = [-1] * n
    stack = []  # 存索引
    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            result[stack.pop()] = nums[i]
        stack.append(i)
    return result
```

```cpp
#include <vector>
#include <stack>
using namespace std;

// 每日温度 LC-739：返回等待天数
vector<int> dailyTemperatures(vector<int>& temperatures) {
    int n = temperatures.size();
    vector<int> result(n, 0);
    stack<int> stk;  // 存索引
    for (int i = 0; i < n; i++) {
        while (!stk.empty() && temperatures[stk.top()] < temperatures[i]) {
            result[stk.top()] = i - stk.top();
            stk.pop();
        }
        stk.push(i);
    }
    return result;
}
```

Python 版每日温度与 C++ 版逻辑一致；普通栈的括号匹配见下一节代表题。滑动窗口最值的单调队列变体见第 13.3 节工程案例。

### 6.2 代表题

**LC-20 有效的括号**：

```python
def is_valid(s: str) -> bool:
    """LC-20 有效的括号：右括号必须匹配最近的左括号"""
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack

print(is_valid("()[]{}"))
print(is_valid("(]"))
print(is_valid("([)]"))
```

```text
True
False
False
```

**LC-739 每日温度**：

```python
def daily_temperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    result = [0] * n
    stack = []
    for i, t in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < t:
            j = stack.pop()
            result[j] = i - j
        stack.append(i)
    return result

print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))
```

```text
[1, 1, 4, 2, 1, 1, 0, 0]
```

**经典题目**：LC-20、LC-155 Min Stack、LC-496 Next Greater Element I、LC-739、LC-84 Largest Rectangle in Histogram（Hard）、LC-42 Trapping Rain Water（Hard，也可用对撞指针）、LC-239（单调队列，Hard）。

## 7. 哈希表

**识别信号**：

- 题面关键词："是否存在/出现过"（两数之和、判重）、"出现次数/异位词/多数元素"（计数）、"分组归类"（字母异位词分组）
- 数据范围：需要把 $O(n)$ 查找降为 $O(1)$ 以满足整体 $O(n)$（$n \leq 10^5$ 以上常伴此需求）；常见组合是"哈希 + 前缀和"（第 5 章）、"哈希 + 滑动窗口"（第 3 章）

### 7.1 解题模板

```python
def two_sum(nums: list[int], target: int) -> list[int]:
    """LC-1 两数之和：一次遍历 + 哈希表
    时间 O(n)，空间 O(n)
    """
    seen = {}  # value -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

def is_anagram(s: str, t: str) -> bool:
    """LC-242 有效的字母异位词：计数后比较"""
    from collections import Counter
    return Counter(s) == Counter(t)
```

### 7.2 代表题

**LC-1 两数之和**（无序数组，双指针需先排序会打乱索引，哈希是标准解）：

```python
print(two_sum([2, 7, 11, 15], 9))
print(two_sum([3, 2, 4], 6))
print(two_sum([3, 3], 6))
```

```text
[0, 1]
[1, 2]
[0, 1]
```

**LC-242 有效的字母异位词**：

```python
print(is_anagram("anagram", "nagaram"))
print(is_anagram("rat", "car"))
```

```text
True
False
```

**经典题目**：LC-1、LC-217 Contains Duplicate、LC-242、LC-49 Group Anagrams、LC-128 Longest Consecutive Sequence、LC-560（哈希+前缀和）、LC-146 LRU Cache（哈希+双向链表，见第 13.1 节）。

## 8. 链表操作

**识别信号**：

- 题面关键词："反转链表"、"判断环/环的入口"、"链表中点"、"合并两个有序链表"、"删除倒数第 N 个"
- 工具箱三件套：**快慢指针**（判圈/中点）、**迭代反转**（prev/curr 双引用）、**虚拟头节点**（头节点可能被删/改时统一处理）

### 8.1 解题模板

```python
class ListNode:
    def __init__(self, val: int = 0, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def reverse_list(head: ListNode | None) -> ListNode | None:
    """LC-206 反转链表（迭代）
    时间 O(n)，空间 O(1)；链表题优先迭代，见本章陷阱
    """
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev, curr = curr, nxt
    return prev

def has_cycle(head: ListNode | None) -> bool:
    """LC-141 环检测：Floyd 判圈
    不变式：若有环，快指针必然追上慢指针
    时间 O(n)，空间 O(1)
    """
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
```

测试辅助函数（构造链表与可成环的用例）：

```python
def build_linked(values: list[int], pos: int = -1) -> ListNode | None:
    """按 values 建链表；pos >= 0 时尾节点指向第 pos 个节点（成环）"""
    nodes = [ListNode(v) for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if nodes and pos >= 0:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def to_list(head: ListNode | None) -> list[int]:
    vals = []
    while head:
        vals.append(head.val)
        head = head.next
    return vals
```

### 8.2 代表题

**LC-206 反转链表**：

```python
head = build_linked([1, 2, 3, 4, 5])
print(to_list(reverse_list(head)))
```

```text
[5, 4, 3, 2, 1]
```

**LC-141 环形链表**：

```python
print(has_cycle(build_linked([3, 2, 0, -4], pos=1)))
print(has_cycle(build_linked([1, 2])))
```

```text
True
False
```

### 8.3 常见陷阱：Python 递归栈溢出

::: danger
**错误示例**：用递归反转长链表。

```python
def reverse_list_recursive(head):
    if not head or not head.next:
        return head
    new_head = reverse_list_recursive(head.next)  # 深度 > 1000 时 RecursionError
    head.next.next = head
    head.next = None
    return new_head
```

**错误原因**：Python 默认递归深度限制为 1000，LeetCode 链表题链长可达 $10^4$，必触发 `RecursionError`。修正：一律用第 8.1 节迭代版本；`sys.setrecursionlimit` 只是缓解且可能真栈溢出，不推荐。该陷阱同样适用于深树 DFS 与网格 DFS，见第 10 章陷阱与第 14 章练习。
:::

**经典题目**：LC-206、LC-141、LC-21 Merge Two Sorted Lists（虚拟头节点）、LC-19 Remove Nth Node From End（快慢指针）、LC-142 环形链表 II（环入口）、LC-146 LRU Cache（虚拟头尾双向链表，见第 13.1 节）。

## 9. 二叉树递归

**识别信号**：

- 题面关键词：树的"深度/直径/路径和/翻转/对称/最近公共祖先"——后序递归；"逐层输出/右侧视图/最小深度"——层序 BFS（模板见第 10 章，本章给出层序实现）
- 递归三问（每道树题先回答这三问）：base case 是什么（通常 `root is None`）？对左右子树递归调用后，返回值的语义是什么？如何把两个子结果与当前节点合并？

### 9.1 解题模板

```python
class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None,
                 right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def max_depth(root: TreeNode | None) -> int:
    """LC-104 最大深度：后序递归骨架
    时间 O(n)，空间 O(h)，h 为树高
    """
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

def invert_tree(root: TreeNode | None) -> TreeNode | None:
    """LC-226 翻转二叉树：交换每个节点的左右子树"""
    if not root:
        return None
    root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root
```

层序遍历（BFS 在树上的形态，逐层输出的标准实现）：

```python
def level_order(root: TreeNode | None) -> list[list[int]]:
    """LC-102 层序遍历：按层分组
    时间 O(n)，空间 O(n)
    """
    from collections import deque
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
```

### 9.2 代表题

**LC-104 二叉树的最大深度**：

```python
root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print(max_depth(root))
```

```text
3
```

**LC-226 翻转二叉树**（用层序遍历验证结果）：

```python
root = TreeNode(4,
                TreeNode(2, TreeNode(1), TreeNode(3)),
                TreeNode(7, TreeNode(6), TreeNode(9)))
print(level_order(invert_tree(root)))
```

```text
[[4], [7, 2], [9, 6, 3, 1]]
```

**经典题目**：LC-104、LC-226、LC-102、LC-98 验证二叉搜索树（BST 有序性）、LC-236 最近公共祖先、LC-124 最大路径和（Hard）、LC-199 右侧视图（层序取最右，见第 10.2 节）。

## 10. BFS 与 DFS

**识别信号**：

- 题面关键词："最短/最少步数（无权图、网格、状态转换）"——BFS；"连通分量/岛屿/能否到达"——DFS 或 BFS；"课程顺序/依赖编译顺序"——拓扑排序
- 数据范围：网格 $m \times n \leq 3 \times 10^4$ 量级、图 $V, E \leq 10^5$，都要求 $O(V+E)$ 的线性遍历；注意 Python 递归深度陷阱（第 8.3 节），大网格优先迭代 BFS 或手写栈

### 10.1 解题模板

**BFS 求无权图最短路径**（不变式：队列中节点到起点的距离单调递增）：

```python
from collections import deque

def bfs_shortest_path(graph: dict, start: int, end: int) -> int:
    """无权图最短路；不可达返回 -1
    时间 O(V + E)，空间 O(V)
    """
    if start == end:
        return 0
    visited = {start}
    queue = deque([(start, 0)])
    while queue:
        node, dist = queue.popleft()
        for neighbor in graph[node]:
            if neighbor == end:
                return dist + 1
            if neighbor not in visited:
                visited.add(neighbor)  # 入队时立即标记
                queue.append((neighbor, dist + 1))
    return -1
```

**拓扑排序（Kahn 算法，LC-210）**：

```python
def topological_sort(num_courses: int, prerequisites: list[list[int]]) -> list[int]:
    """拓扑排序：每次入队 0 入度节点，处理时邻居入度减一
    时间 O(V + E)，空间 O(V + E)；存在环时返回 []
    """
    from collections import deque, defaultdict
    in_degree = [0] * num_courses
    graph = defaultdict(list)
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1
    queue = deque([i for i in range(num_courses) if in_degree[i] == 0])
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    return result if len(result) == num_courses else []
```

### 10.2 代表题

**LC-200 岛屿数量**（DFS 沉岛；大网格迭代化改造见第 14 章练习）：

```python
def num_islands(grid: list[list[str]]) -> int:
    """LC-200 岛屿数量：遍历到 '1' 即计数并把整座岛沉为 '0'
    时间 O(mn)，空间 O(mn) 最坏递归深度
    """
    rows, cols = len(grid), len(grid[0])

    def dfs(r: int, c: int) -> None:
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == "0":
            return
        grid[r][c] = "0"
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                count += 1
                dfs(r, c)
    return count

grid = [["1", "1", "0", "0", "0"],
        ["1", "1", "0", "0", "0"],
        ["0", "0", "1", "0", "0"],
        ["0", "0", "0", "1", "1"]]
print(num_islands(grid))
```

```text
3
```

**LC-210 课程表 II**（拓扑排序模板本体）：

```python
print(topological_sort(4, [[1, 0], [2, 0], [3, 1], [3, 2]]))
print(topological_sort(2, [[1, 0], [0, 1]]))
```

```text
[0, 1, 2, 3]
[]
```

附：LC-199 二叉树右侧视图取每层最右节点，其代码与工程应用见第 13.4 节。

### 10.3 常见陷阱：未标记 visited

::: danger
**错误示例**：BFS 出队后不检查、也不在入队时标记 `visited`。

```python
while queue:
    node = queue.popleft()
    result.append(node)
    for neighbor in graph[node]:
        queue.append(neighbor)  # 错误：有环时死循环
```

**错误原因**：图中有环时节点被反复入队形成死循环；即使无环，重复入队也让复杂度退化为指数级。修正：见第 10.1 节 BFS 模板——`visited` 应在**入队时**标记而非出队时，否则同一节点可能被多次入队。
:::

**经典题目**：LC-200、LC-127 Word Ladder（BFS 最短路）、LC-207 Course Schedule（拓扑判环）、LC-210、LC-743 Network Delay Time（Dijkstra，见[图算法](/algorithm/110-GraphAlgorithms)）、LC-547/684（并查集，见第 13.2 节）。

## 11. 动态规划入门

**识别信号**：

- 题面关键词："最大值/最小值/最长/最短"或"多少种方法/是否可行"，且大问题的解可由子问题的解构造（最优子结构 + 重叠子问题）
- 数据范围：$n \leq 10^3 \sim 10^4$ 指向 $O(n^2)$ 二维 DP；$n \leq 20$ 且涉及子集集合指向状态压缩 DP（刷题指南定理 3.1 与推论 3.1）；序列问题先问"以 i 结尾"还是"前 i 个"两种状态定义哪个更好转移

### 11.1 DP 解题三要素

1. **状态定义**：`dp[i]` 或 `dp[i][j]` 表示什么？
2. **转移方程**：`dp[i]` 如何由更小的子问题得到？
3. **初始条件与边界**：`dp[0]`、`dp[1]` 是什么？（陷阱高发区，见本章陷阱）

### 11.2 解题模板

**线性 DP 入门（爬楼梯 LC-70）**：

```python
def climb_stairs(n: int) -> int:
    """状态：dp[i] = 爬到第 i 阶的方法数
    转移：dp[i] = dp[i-1] + dp[i-2]；初始：dp[0] = dp[1] = 1
    时间 O(n)，空间 O(1)（滚动变量）
    """
    if n <= 2:
        return n
    prev, curr = 1, 2
    for _ in range(3, n + 1):
        prev, curr = curr, prev + curr
    return curr
```

**优化链路：暴力 → 记忆化 → 迭代 DP → 状态压缩**（LC-198 打家劫舍四阶段演进，Hard 题的通用优化路径）：

```python
def rob_brute(nums):
    # 1. 暴力递归 O(2^n) - TLE
    def dfs(i):
        if i >= len(nums):
            return 0
        return max(dfs(i + 1), dfs(i + 2) + nums[i])
    return dfs(0)

def rob_memo(nums):
    # 2. 记忆化 O(n) - AC
    from functools import lru_cache
    @lru_cache(None)
    def dfs(i):
        if i >= len(nums):
            return 0
        return max(dfs(i + 1), dfs(i + 2) + nums[i])
    return dfs(0)

def rob_optimal(nums):
    # 3/4. 迭代 DP O(n)，再压缩为滚动变量 O(1) 空间 - 最优解
    prev, curr = 0, 0
    for num in nums:
        prev, curr = curr, max(curr, prev + num)
    return curr
```

**二维 DP（LC-1143 LCS 与 LC-72 编辑距离）**：

```python
def longest_common_subsequence(text1: str, text2: str) -> int:
    """状态：dp[i][j] = text1[:i] 与 text2[:j] 的 LCS 长度
    时间 O(mn)，空间 O(mn)，可压缩为 O(min(m, n))
    """
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]

def edit_distance(word1: str, word2: str) -> int:
    """LC-72 Hard：word1[:i] 转为 word2[:j] 的最少操作数
    转移：相同则继承对角线；否则 1 + min(删除, 插入, 替换)
    """
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i  # 边界：删光前 i 个字符
    for j in range(n + 1):
        dp[0][j] = j  # 边界：插入 j 个字符
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]
```

```cpp
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

// 编辑距离 C++ 实现
int editDistance(string word1, string word2) {
    int m = word1.size(), n = word2.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1[i-1] == word2[j-1]) {
                dp[i][j] = dp[i-1][j-1];
            } else {
                dp[i][j] = 1 + min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});
            }
        }
    }
    return dp[m][n];
}
```

### 11.3 代表题

**LC-70 爬楼梯**：

```python
print(climb_stairs(3))
print(climb_stairs(5))
```

```text
3
8
```

**LC-1143 最长公共子序列**：

```python
print(longest_common_subsequence("abcde", "ace"))
print(longest_common_subsequence("abc", "def"))
print(edit_distance("horse", "ros"))
```

```text
3
0
3
```

### 11.4 常见陷阱：初始条件错误

::: danger
**错误示例**：编辑距离漏掉 `dp[i][0] = i` 与 `dp[0][j] = j` 的初始化，直接从 `dp` 全 0 开始转移。

**错误原因**：`dp[i][j]` 的语义是"前 i 个字符转为前 j 个字符的最少操作数"。当 `j = 0` 时需删除 i 个字符、`i = 0` 时需插入 j 个字符，边界不为 0；漏初始化会让所有依赖边界的转移系统性偏小。修正：见第 11.2 节 `edit_distance` 模板中的两段边界初始化。
:::

**经典题目**：LC-70、LC-198 House Robber、LC-300 Longest Increasing Subsequence（贪心+二分可到 $O(n \log n)$）、LC-322 Coin Change（完全背包）、LC-72、LC-1143、LC-139 Word Break、LC-312 Burst Balloons（区间 DP，Hard）。DP 进阶（背包、状态压缩、区间 DP）见[动态规划](/algorithm/160-DynamicProgramming)与[动态规划状态压缩](/algorithm/240-BitmaskDynamicProgramming)。

## 12. 补充题型：回溯与位运算

回溯本质是"带撤销的 DFS"，覆盖排列/组合/子集三大族；位运算是状态压缩与去重技巧的底座。方法论与深入讨论见[递归与回溯](/algorithm/140-RecursionAndBacktracking)。

### 12.1 回溯模板

```python
def permute(nums: list[int]) -> list[list[int]]:
    """全排列通用模板：做选择 -> 递归 -> 撤销选择
    时间 O(n * n!)，空间 O(n)
    """
    result = []

    def backtrack(path: list[int]):
        if len(path) == len(nums):
            result.append(path[:])
            return
        for choice in nums:
            if choice in path:  # 剪枝：已使用
                continue
            path.append(choice)
            backtrack(path)
            path.pop()

    backtrack([])
    return result

def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    """LC-39 组合总和：start 参数避免重复组合，i 可重复使用"""
    result = []

    def backtrack(start: int, path: list[int], remaining: int):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                continue  # 剪枝（需候选有序时更有效）
            path.append(candidates[i])
            backtrack(i, path, remaining - candidates[i])  # i 而非 i+1：可重复
            path.pop()

    backtrack(0, [], target)
    return result
```

含重复元素的子集去重（排序 + 跳过同层相同元素）：

```python
def subsets_with_dup(nums: list[int]) -> list[list[int]]:
    """LC-90 子集 II：排序后同层去重"""
    nums.sort()
    result = []

    def backtrack(start: int, path: list[int]):
        result.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:
                continue  # 同层去重
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()

    backtrack(0, [])
    return result
```

### 12.2 代表题

**LC-46 全排列**：

```python
print(permute([1, 2, 3]))
```

```text
[[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
```

**LC-39 组合总和**：

```python
print(combination_sum([2, 3, 6, 7], 7))
print(subsets_with_dup([1, 2, 2]))
```

```text
[[2, 2, 3], [7]]
[[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
```

### 12.3 回溯常见陷阱：未做去重

::: danger
**错误示例**：`nums = [1, 2, 2]` 的子集问题中不排序也不跳过同层相同元素，结果会包含重复的 `[1, 2]` 与 `[2]`（从索引 1 或索引 2 选 2 是两条不同路径但同一方案）。修正：见第 12.1 节 `subsets_with_dup`——先排序，再在 `i > start and nums[i] == nums[i-1]` 时 `continue`。
:::

**经典题目**：LC-46、LC-78 Subsets、LC-39、LC-90 Subsets II、LC-22 Generate Parentheses、LC-51 N-Queens（Hard）、LC-37 Sudoku Solver（Hard）。

### 12.4 位运算技巧

| 技巧 | 表达式 | 应用 |
| ---- | ------ | ---- |
| 判断奇偶 | `n & 1` | 代替 `n % 2` |
| 最低位 1 | `n & (-n)` | 树状数组 |
| 去掉最低位 1 | `n & (n - 1)` | 计数 1 的个数 |
| 异或找单数 | 全员异或 | LC-136 Single Number |
| 子集枚举 | `for mask in range(1 << n)` | 状态压缩 DP |
| 子集遍历 | `for sub = mask; sub; sub = (sub-1) & mask` | 枚举子集 |

```python
def count_bits(n: int) -> list[int]:
    """LC-338 比特位计数：n & (n-1) 去掉最低位 1
    时间 O(n)
    """
    result = [0] * (n + 1)
    for i in range(1, n + 1):
        result[i] = result[i & (i - 1)] + 1
    return result

print(count_bits(5))
```

```text
[0, 1, 1, 2, 1, 2]
```

**经典题目**：LC-136、LC-338、LC-461 Hamming Distance、LC-78（位运算枚举子集）、LC-526 Beautiful Arrangement（状态压缩 DP）。

## 13. 工程应用与案例

LeetCode 题目并非纯学术练习，许多题目直接映射到工业场景。方法论视角的讨论（如何把工程映射写进面试回答）见刷题指南第 5 章。

### 13.1 映射总表与 LRU Cache

| LeetCode 题目 | 算法 | 工业应用 | 项目案例 |
| -------------- | ---- | -------- | -------- |
| LC-146 LRU Cache | 哈希表+双向链表 | 缓存淘汰策略 | Redis、Memcached、Guava Cache |
| LC-460 LFU Cache | 频率桶+哈希表 | 缓存淘汰策略 | Redis 4.0+ LFU 模式 |
| LC-208 Trie | 字典树 | 自动补全、IP 路由 | Linux 内核路由、Elasticsearch |
| LC-547/684 Union-Find | 并查集 | 网络连通性、Kruskal MST | Kubernetes CNI、Git merge |
| LC-239 Sliding Window Max | 单调队列 | 流式数据监控 | Prometheus、Flink |
| LC-303/304 Prefix Sum | 前缀和 | 区间查询、监控聚合 | Prometheus Range Query |
| LC-743 Network Delay Time | Dijkstra | 网络延迟分析 | BGP 路由、CDN 调度 |
| LC-207/210 Course Schedule | 拓扑排序 | 依赖管理、构建系统 | Make、Bazel、Webpack |
| LC-76 Minimum Window | 滑动窗口 | 日志分析、基因序列 | ELK、生物信息学 |
| LC-212 Word Search II | Trie+DFS | 搜索引擎、敏感词过滤 | Solr、Elasticsearch |

**LC-146 LRU Cache** 要求 $O(1)$ 的 `get` 与 `put`，标准实现是哈希表 + 双向链表（虚拟头尾节点消除边界判断）：

```python
class DLinkedNode:
    """双向链表节点"""
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None

class LRUCache:
    """LRU 缓存：哈希表 + 双向链表，get/put 均摊 O(1)"""

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}  # key -> DLinkedNode
        self.head = DLinkedNode()
        self.tail = DLinkedNode()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _add_node(self, node: DLinkedNode) -> None:
        """在头部之后插入（表示最近使用）"""
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node

    def _remove_node(self, node: DLinkedNode) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _move_to_head(self, node: DLinkedNode) -> None:
        self._remove_node(node)
        self._add_node(node)

    def _pop_tail(self) -> DLinkedNode:
        node = self.tail.prev
        self._remove_node(node)
        return node

    def get(self, key: int) -> int:
        node = self.cache.get(key)
        if not node:
            return -1
        self._move_to_head(node)  # 访问即移至头部
        return node.value

    def put(self, key: int, value: int) -> None:
        node = self.cache.get(key)
        if node:
            node.value = value
            self._move_to_head(node)
        else:
            if len(self.cache) >= self.capacity:
                tail = self._pop_tail()  # 淘汰最久未使用
                del self.cache[tail.key]
            new_node = DLinkedNode(key, value)
            self.cache[key] = new_node
            self._add_node(new_node)
```

**摊还分析**（Sleator-Tarjan 1985 势能法）：设 $\Phi(D) = 2 \cdot |\text{cache}|$，`get` 命中的实际代价约 5（哈希查找 + 链表移动），势能不变，摊还代价 $O(1)$；`put` 淘汰时势能下降 2，摊还代价仍为 $O(1)$。

**Redis 的近似 LRU 与 LFU 演进**：Redis 采用近似 LRU——随机采样 N 个 key（默认 5）淘汰其中最久未使用者，避免精确 LRU 的每 key 双指针内存开销。Redis 4.0 起提供 LFU：每 key 用 24 bit 元数据（16 bit 分钟级时间戳 + 8 bit 对数计数器），计数器低频时线性增长、高频时按概率对数增长并周期性衰减，适配动态热点数据。演进链：LC-146 标准结构 → Redis 2.x 近似 LRU → Redis 4.0 LFU → Redis 5.0 lazy free 与删除策略配置 → Redis 7.0 多线程 IO。与 LC-460 标准 LFU（频率桶+哈希表、精确、内存大）相比，Redis LFU 以精度换内存，更适合大规模动态负载。

### 13.2 并查集与 Kubernetes/Git

**LC-547 省份数量**、**LC-684 冗余连接**是并查集的经典应用，工业中用于 Kubernetes 网络策略的作用域判定、Git 合并的依赖检测、图像连通分量标记与 Kruskal 最小生成树：

```python
class UnionFind:
    """并查集：路径压缩 + 按秩合并
    find/union 均摊 O(alpha(n)) 约等于 O(1)，基于 Tarjan 1975 分析
    """

    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n  # 连通分量数

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # 路径压缩
        return self.parent[x]

    def union(self, x: int, y: int) -> bool:
        """按秩合并；返回是否成功合并（原本不同集合）"""
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        self.count -= 1
        return True

def find_redundant_connection(edges: list[list[int]]) -> list[int]:
    """LC-684 冗余连接：第一条连接同集合的边即冗余
    应用：K8s 网络策略循环依赖检测。时间 O(E alpha(V))
    """
    uf = UnionFind(len(edges) + 1)
    for u, v in edges:
        if not uf.union(u, v):
            return [u, v]
    return []

print(find_redundant_connection([[1, 2], [2, 3], [3, 4], [1, 4]]))
```

```text
[1, 4]
```

**Git merge 的对比**：Git 合并分支时同样需要检测循环依赖，思路与 LC-684 一致——若待合并的边连接同一等价类，则合并会产生循环。但注意差异：Git 操作的对象是 commit DAG（有向无环图），真实环检测用拓扑排序或 DFS 颜色标记（见第 10 章），并查集只适用于无向等价类合并；LC-684 的模型适合检测无向依赖关系。

### 13.3 单调队列与 Prometheus

**LC-239 滑动窗口最大值**的单调队列技术广泛用于流式数据：Prometheus Range Query（`rate(http_requests_total[5m])`）、Flink Windowed Stream、Kafka Streams 时间窗口 Join、股票移动平均线：

```python
from collections import deque

def sliding_window_max(nums: list[int], k: int) -> list[int]:
    """LC-239 滑动窗口最大值：单调队列存索引，对应值单调递减
    时间 O(n)，空间 O(k)
    """
    queue = deque()  # 存索引
    result = []
    for i, x in enumerate(nums):
        while queue and nums[queue[-1]] <= x:
            queue.pop()  # 维护单调递减
        queue.append(i)
        if queue[0] <= i - k:  # 移除窗口外元素
            queue.popleft()
        if i >= k - 1:
            result.append(nums[queue[0]])
    return result

print(sliding_window_max([1, 3, -1, -3, 5, 3, 6, 7], 3))
```

```text
[3, 3, 5, 5, 6, 7]
```

Prometheus 的实际实现更复杂：时序数据用 chunk 编码 + delta-of-delta 压缩存储，range query 遍历 chunk 并按窗口聚合，但核心思想与单调队列一致——不重复扫描窗口内的全部样本。

### 13.4 Trie 与敏感词过滤

**LC-208 实现 Trie** 的工业应用：内容平台敏感词过滤（微博、微信、抖音）、搜索框自动补全、Linux 内核 IP 路由 LPM、拼写检查：

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    """Trie 字典树：插入/查找 O(L)，L 为词长"""

    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def starts_with(self, prefix: str) -> bool:
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True

class SensitiveWordFilter:
    """敏感词过滤器：Trie 前缀剪枝替代逐词暴力匹配"""

    def __init__(self, words: list[str]):
        self.trie = Trie()
        for word in words:
            self.trie.insert(word.lower())

    def filter(self, text: str, replace_char: str = "*") -> str:
        text_lower = text.lower()
        result = list(text)
        n = len(text_lower)
        for i in range(n):
            node = self.trie.root
            j = i
            while j < n and text_lower[j] in node.children:
                node = node.children[text_lower[j]]
                j += 1
                if node.is_end:
                    for k in range(i, j):
                        result[k] = replace_char
        return "".join(result)

filter = SensitiveWordFilter(["spam", "abuse", "violence"])
print(filter.filter("This is SPAM content with abuse words"))
```

```text
This is **** content with ***** words
```

大规模词库（百万级）下，单纯 Trie 匹配为 $O(N \cdot L)$（$N$ 文本长度、$L$ 最长敏感词）；AC 自动机（Aho-Corasick）通过失败指针将复杂度降至 $O(N + M)$。

**LC-199 二叉树右侧视图**的层序取最右思想，对应 Elasticsearch 聚合对倒排索引的分层取 top N（B+ 树层级遍历同理）。实现附于下方：

```python
from collections import deque

def right_side_view(root) -> list[int]:
    """LC-199 右侧视图：层序遍历取每层最后一个节点。时间 O(n)"""
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level_size = len(queue)
        for i in range(level_size):
            node = queue.popleft()
            if i == level_size - 1:
                result.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
    return result

root = TreeNode(1, TreeNode(2, None, TreeNode(5)), TreeNode(3))
print(right_side_view(root))
```

```text
[1, 3, 5]
```

### 13.5 QuickSelect 与 Top-K

**LC-215 数组中的第 K 个最大元素**的 QuickSelect 用于搜索引擎 Top-K、数据库 `ORDER BY ... LIMIT` 优化、Prometheus `topk()` 与 K8s top pods：

```python
import random

def find_kth_largest(nums: list[int], k: int) -> int:
    """QuickSelect：随机 pivot，平均 O(n)，最坏 O(n^2)"""
    target_index = len(nums) - k

    def quick_select(left: int, right: int) -> int:
        pivot_index = random.randint(left, right)  # 随机化避免最坏情况
        nums[pivot_index], nums[right] = nums[right], nums[pivot_index]
        pivot = nums[right]
        i = left
        for j in range(left, right):
            if nums[j] <= pivot:
                nums[i], nums[j] = nums[j], nums[i]
                i += 1
        nums[i], nums[right] = nums[right], nums[i]
        if i == target_index:
            return nums[i]
        elif i < target_index:
            return quick_select(i + 1, right)
        else:
            return quick_select(left, i - 1)

    return quick_select(0, len(nums) - 1)

def top_k_elements(nums: list[int], k: int) -> list[int]:
    """工业版 Top-K：堆实现，稳定 O(n log k)"""
    import heapq
    return heapq.nlargest(k, nums)

print(top_k_elements([3, 2, 1, 5, 6, 4], 2))
```

```text
[6, 5]
```

**对比**：QuickSelect 平均 $O(n)$、原地、但最坏 $O(n^2)$；堆方法稳定 $O(n \log k)$、需 $O(k)$ 额外空间。工业场景通常选堆方法，因为最坏情况可控。堆与优先队列的深入讨论见[堆与优先队列](/algorithm/090-HeapAndPriorityQueue)。

## 14. 练习

以下题目检验本篇模板的掌握程度；方法论与路线类自测题见[LeetCode 刷题指南](/algorithm/300-LeetCodeInterviewGuide)第 7 章。

### 14.1 填空题

**题 14.1.1**（难度：easy）

LC-146 LRU Cache 要求 `get` 与 `put` 操作均为 $O(1)$，其标准实现使用 ____________ 数据结构存储键值对，使用 ____________ 维护访问顺序；Sleator-Tarjan 1985 论文证明其摊还代价为 $O(\text{____________})$。（参考第 13.1 节）

**题 14.1.2**（难度：medium）

LC-215 数组中的第 K 个最大元素有两种经典解法：基于小顶堆的方法时间复杂度为 $O(\text{____________})$、空间 $O(\text{____________})$；基于 QuickSelect 的方法平均时间复杂度 $O(\text{____________})$、最坏 $O(\text{____________})$。（参考第 13.5 节）

### 14.2 代码修正题（code-fix）

**题 14.2.1**（难度：medium）

以下 LC-704 二分查找的实现存在一个典型 bug，请修正：

```python
def search(nums: list[int], target: int) -> int:
    left, right = 0, len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid
    return -1
```

**修正前的运行表现**：对于 `nums = [-1, 0, 3, 5, 9, 12], target = 2`，返回 `-1`（正确）；对于 `nums = [5], target = 5`，返回 `-1`（错误，应返回 0）。

**要求**：

1. 指出 bug 所在（区间约定与返回值/边界的配对，参考第 4.3 节陷阱一）
2. 给出修正后的完整代码（或改写为第 4.1 节模板一的闭区间写法）
3. 用不变式论证正确性

**题 14.2.2**（难度：medium）

以下 LC-3 的滑动窗口实现存在一个导致结果偏小的 bug，请修正：

```python
def lengthOfLongestSubstring(s: str) -> int:
    window = set()
    left = 0
    ans = 0
    for right, ch in enumerate(s):
        while ch in window:
            window.remove(s[left])
            left += 1
        window.add(ch)
        ans = max(ans, right - left)
    return ans
```

**修正前的运行表现**：对于 `s = "abcabcbb"`，返回 `2`（错误，正确答案为 `3`）。

**要求**：

1. 指出 bug 所在行与原因（窗口长度漏了谁？）
2. 给出修正后的完整代码
3. 用循环不变式论证 `[left, right]` 始终是无重复字符窗口

**题 14.2.3**（难度：hard）

以下 LC-200 岛屿数量的 DFS 实现在 $300 \times 300$ 大网格下会抛出 `RecursionError`，请用两种方式修正：

```python
def numIslands(grid: list[list[str]]) -> int:
    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':
            return
        grid[r][c] = '0'
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    return count
```

**要求**：

1. 解释 `RecursionError` 的根本原因（参考第 8.3 节）
2. 给出修正方案 A：手写栈 + 迭代 DFS
3. 给出修正方案 B：BFS + `collections.deque`（参考第 10.1 节模板，注意入队时标记）
4. 对比两种方案在 300×300 网格下的时间与内存开销

### 14.3 开放论述题（open-ended）

**题 14.3.1**（难度：hard）

第 13.1 节给出了 LeetCode 题目到工业应用的映射表（LRU Cache → Redis、并查集 → Kubernetes、滑动窗口 → Prometheus 等）。任选其中一个映射，完成：

1. 阐述工业系统的核心需求与 LeetCode 题目抽象模型的对应关系
2. 分析工业实现与 LeetCode 标准解法的关键差异（数据规模、并发要求、持久化、容错）
3. 设计一个简化版工业级实现（伪代码或 Python 片段），体现至少两项工程考量：并发安全（锁 / CAS / 无锁结构）、持久化（WAL / AOF / snapshot）、可观测性（metrics / logging / tracing）、容错与降级（超时 / 重试 / 熔断）
4. 评估你的实现在 10 万 QPS 下的瓶颈与扩展方向

**要求**：总字数不少于 500 字，代码片段不少于 30 行。

---

## 15. 参考文献与关联文档

- 本篇与《LeetCode 刷题指南》共用同一套参考文献（CLRS、Skiena、McDowell、Sleator-Tarjan、Tarjan 等 21 条，含 DOI），完整列表见[刷题指南](/algorithm/300-LeetCodeInterviewGuide)第 8 章
- 各题型对应的教学文档映射表见刷题指南第 9.6 节；算法可视化工具（VisuAlgo 等）见其第 9.2 节
- 刷题顺序与节奏安排：刷题指南第 3.3 节（总路线）与第 4 章（遗忘曲线与复习表）

---

*文档完*

## 读完自检

- 十大题型各自的「识别信号词」能各说出两个吗？（如滑动窗口：最长/最短连续子数组、字符种类受限；二分：有序、第 K 个、最小化最大值）
- 对撞指针与快慢指针各解决什么形态的问题？（有序数组两数之和；环检测与中点）
- 滑动窗口收缩条件写错会怎样？（窗口可能漏缩或缩过头，漏解或死循环——先用小例子验证收缩与记录答案的顺序）
- 链表题的通用保命招是什么？（哑结点统一头插边界，快慢指针防越界）
- 能对每类题型默写出主干模板，并在 20 行内带出边界处理。
