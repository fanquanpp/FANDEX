---
title: '动态规划'
module: 'algorithm'
category: 'Algorithm/DynamicProgramming'
description: '动态规划核心思想、状态定义与转移方程推导，涵盖背包、LCS、编辑距离、子序列等经典问题，附复杂度分析与多语言实现。'
author: 'fanquanpp'
order: 90
tags:
  - 'algorithm'
  - 'algorithm-dynamicprogramming'
  - 'data-structure'
difficulty: 'intermediate'
---

- [3. 0-1 背包问题](#3-0-1-背包问题)
- [4. 完全背包与多重背包](#4-完全背包与多重背包)
- [5. 最长公共子序列 (LCS)](#5-最长公共子序列-lcs)
- [6. 编辑距离](#6-编辑距离)
- [7. 最长递增子序列 (LIS)](#7-最长递增子序列-lis)
- [8. 子序列与子串问题](#8-子序列与子串问题)
- [9. 状态压缩与优化](#9-状态压缩与优化)
- [10. DP速查表](#10-dp速查表)
- [11. 延伸阅读](#11-延伸阅读)

---

## 1. 动态规划思想

### 1.1 从暴力递归到动态规划

动态规划的演进路径：暴力递归 -> 记忆化搜索 -> 自底向上DP。以斐波那契数列为例展示三种写法的本质差异。

**暴力递归**：存在大量重复计算，时间O(2^n)

```python
def fib_recursive(n):
    if n <= 1:
        return n
    return fib_recursive(n - 1) + fib_recursive(n - 2)
```

递归树中，fib(5)的计算过程：

```
                    fib(5)
                   /      \
              fib(4)       fib(3)
             /     \       /    \
         fib(3)  fib(2)  fib(2) fib(1)
        /    \   /   \   /   \
    fib(2) fib(1) fib(1) fib(0) fib(1) fib(0)
    /   \
fib(1) fib(0)

fib(3)被计算2次，fib(2)被计算3次 -- 大量冗余
```

**记忆化搜索（自顶向下）**：用数组/哈希表缓存已计算结果，时间O(n)

```python
def fib_memo(n, memo=None):
    if memo is None:
        memo = {}
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    return memo[n]
```

**自底向上DP**：按依赖顺序填表，消除递归开销，时间O(n)，空间可优化至O(1)

```python
def fib_dp(n):
    if n <= 1:
        return n
    prev, curr = 0, 1
    for i in range(2, n + 1):
        prev, curr = curr, prev + curr
    return curr
```

```cpp
int fibDP(int n) {
    if (n <= 1) return n;
    int prev = 0, curr = 1;
    for (int i = 2; i <= n; i++) {
        int next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}
```

### 1.2 DP的本质：记忆与重叠

动态规划与分治的根本区别在于子问题是否重叠：

- 分治：子问题独立，如归并排序的左右两半
- DP：子问题重叠，不同决策路径会到达相同的子问题

DP的核心价值：用空间换时间，将指数级的搜索空间压缩为多项式级。

> 跨模块引用：DP与贪心、分治的本质区别参见 [算法分析基础](algorithm/overview) 中的范式对比。

---

## 2. 最优子结构与无后效性

### 2.1 最优子结构

**定义**：一个问题的最优解包含其子问题的最优解。

**验证方法**：假设子问题的解不是最优的，则可以用更优的子问题解替换，得到更优的全局解，矛盾。

**反例**：最长简单路径（无权图中最长不重复路径）不满足最优子结构。从u到w的最长路径经过v时，u到v的子路径不一定是最长的（因为最长路径可能已经使用了v，导致重复）。

### 2.2 无后效性

**定义**：一旦某个状态确定，其未来的决策只依赖当前状态值，不依赖到达该状态的路径。

**反例**：棋盘上从左上到右下的路径计数，如果要求路径不能经过某些已走过的格子，则不满足无后效性（未来决策依赖历史路径）。

**消除后效性的方法**：增加状态维度。例如，将"当前位置"扩展为"当前位置+已访问集合"，用位掩码表示已访问集合（TSP问题的状态压缩DP）。

### 2.3 DP解题四步法

1. **定义状态**：dp[i]或dp[i][j]代表什么
2. **推导转移方程**：dp[i]如何从更小的子问题得到
3. **确定初始条件与边界**：dp[0]、dp[1]等基础情况
4. **确定计算顺序**：自底向上或自顶向下

---

## 3. 0-1 背包问题

### 3.1 问题描述

给定n个物品，每个物品有重量w[i]和价值v[i]，背包容量为W。每个物品只能选0或1个，求最大总价值。

### 3.2 思路分析

**状态定义**：dp[i][w] = 从前i个物品中选取，总重量不超过w时的最大价值。

**转移方程**：

- 不选第i个物品：dp[i][w] = dp[i-1][w]
- 选第i个物品：dp[i][w] = dp[i-1]w-w[i]] + v[i]（前提：w >= w[i]）
- 取两者最大值：dp[i][w] = max(dp[i-1][w], dp[i-1]w-w[i]] + v[i])

**填表可视化**（3个物品，W=5）：

```
物品: (w=2,v=3), (w=3,v=4), (w=4,v=5)

dp[i][w]:
     w=0  w=1  w=2  w=3  w=4  w=5
i=0 |  0    0    0    0    0    0
i=1 |  0    0    3    3    3    3
i=2 |  0    0    3    4    4    7
i=3 |  0    0    3    4    5    7
```

### 3.3 复杂度分析

- 时间复杂度：O(nW)
- 空间复杂度：O(nW)，可优化至O(W)

注意：O(nW)不是多项式时间！W的输入编码长度为log W，因此O(nW)实际上是伪多项式时间。

### 3.4 代码实现

```python
def knapsack_01(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            dp[i][w] = dp[i - 1][w]
            if w >= weights[i - 1]:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1])
    return dp[n][capacity]

def knapsack_01_optimized(weights, values, capacity):
    n = len(weights)
    dp = [0] * (capacity + 1)
    for i in range(n):
        for w in range(capacity, weights[i] - 1, -1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]
```

```cpp
int knapsack01(const vector<int>& weights, const vector<int>& values, int capacity) {
    int n = weights.size();
    vector<vector<int>> dp(n + 1, vector<int>(capacity + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= capacity; w++) {
            dp[i][w] = dp[i - 1][w];
            if (w >= weights[i - 1]) {
                dp[i][w] = max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
            }
        }
    }
    return dp[n][capacity];
}

int knapsack01Optimized(const vector<int>& weights, const vector<int>& values, int capacity) {
    int n = weights.size();
    vector<int> dp(capacity + 1, 0);
    for (int i = 0; i < n; i++) {
        for (int w = capacity; w >= weights[i]; w--) {
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i]);
        }
    }
    return dp[capacity];
}
```

---

## 4. 完全背包与多重背包

### 4.1 完全背包

物品可以无限次选取。转移方程与0-1背包类似，但遍历顺序不同：

```python
def knapsack_complete(weights, values, capacity):
    n = len(weights)
    dp = [0] * (capacity + 1)
    for i in range(n):
        for w in range(weights[i], capacity + 1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]
```

关键区别：0-1背包内层循环从大到小（保证每个物品只用一次），完全背包内层循环从小到大（允许重复选取）。

```cpp
int knapsackComplete(const vector<int>& weights, const vector<int>& values, int capacity) {
    int n = weights.size();
    vector<int> dp(capacity + 1, 0);
    for (int i = 0; i < n; i++) {
        for (int w = weights[i]; w <= capacity; w++) {
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i]);
        }
    }
    return dp[capacity];
}
```

### 4.2 多重背包

第i个物品有s[i]个可用。朴素做法是将s[i]个物品展开为0-1背包，但效率低。

**二进制拆分优化**：将s[i]拆分为1, 2, 4, ..., 2^k, r（其中r = s[i] - 2^(k+1) + 1），将O(s[i])降为O(log s[i])。

```python
def knapsack_multiple(weights, values, counts, capacity):
    items = []
    for i in range(len(weights)):
        cnt = counts[i]
        k = 1
        while cnt > 0:
            take = min(k, cnt)
            items.append((weights[i] * take, values[i] * take))
            cnt -= take
            k *= 2
    dp = [0] * (capacity + 1)
    for w, v in items:
        for j in range(capacity, w - 1, -1):
            dp[j] = max(dp[j], dp[j - w] + v)
    return dp[capacity]
```

```cpp
int knapsackMultiple(vector<int>& weights, vector<int>& values,
                     vector<int>& counts, int capacity) {
    vector<pair<int,int>> items;
    for (int i = 0; i < weights.size(); i++) {
        int cnt = counts[i], k = 1;
        while (cnt > 0) {
            int take = min(k, cnt);
            items.push_back({weights[i] * take, values[i] * take});
            cnt -= take;
            k *= 2;
        }
    }
    vector<int> dp(capacity + 1, 0);
    for (auto& [w, v] : items) {
        for (int j = capacity; j >= w; j--) {
            dp[j] = max(dp[j], dp[j - w] + v);
        }
    }
    return dp[capacity];
}
```

### 4.3 三种背包对比

| 类型     | 物品数量 | 内层遍历方向 | 时间复杂度  |
| -------- | -------- | ------------ | ----------- |
| 0-1背包  | 1个      | 从大到小     | O(nW)       |
| 完全背包 | 无限     | 从小到大     | O(nW)       |
| 多重背包 | s[i]个   | 二进制拆分   | O(nW\*logS) |

---

## 5. 最长公共子序列 (LCS)

### 5.1 问题描述

给定两个序列X和Y，求它们的最长公共子序列的长度。子序列不要求连续。

### 5.2 思路分析

**状态定义**：dp[i][j] = X[0..i-1]与Y[0..j-1]的LCS长度。

**转移方程**：

- 若X[i-1] == Y[j-1]：dp[i][j] = dp[i-1][j-1] + 1
- 若X[i-1] != Y[j-1]：dp[i][j] = max(dp[i-1][j], dp[i][j-1])

**填表可视化**（X="ABCBDAB", Y="BDCABA"）：

```
      ""  B  D  C  A  B  A
  ""   0  0  0  0  0  0  0
  A    0  0  0  0  1  1  1
  B    0  1  1  1  1  2  2
  C    0  1  1  2  2  2  2
  B    0  1  1  2  2  3  3
  D    0  1  2  2  2  3  3
  A    0  1  2  2  3  3  4
  B    0  1  2  2  3  4  4

LCS长度 = 4, LCS = "BCBA" 或 "BDAB"
```

### 5.3 复杂度分析

- 时间复杂度：O(mn)
- 空间复杂度：O(mn)，可优化至O(min(m,n))

### 5.4 代码实现

```python
def lcs_length(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]

def lcs_string(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    result = []
    i, j = m, n
    while i > 0 and j > 0:
        if text1[i - 1] == text2[j - 1]:
            result.append(text1[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] > dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return ''.join(reversed(result))
```

```cpp
int lcsLength(const string& text1, const string& text2) {
    int m = text1.size(), n = text2.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1[i - 1] == text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}

string lcsString(const string& text1, const string& text2) {
    int m = text1.size(), n = text2.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1[i - 1] == text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    string result;
    int i = m, j = n;
    while (i > 0 && j > 0) {
        if (text1[i - 1] == text2[j - 1]) {
            result += text1[i - 1];
            i--; j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) i--;
        else j--;
    }
    reverse(result.begin(), result.end());
    return result;
}
```

---

## 6. 编辑距离

### 6.1 问题描述

给定两个字符串word1和word2，允许三种操作（插入、删除、替换），求将word1转换为word2的最少操作次数。

### 6.2 思路分析

**状态定义**：dp[i][j] = word1[0..i-1]转换为word2[0..j-1]的最少操作数。

**转移方程**：

- 若word1[i-1] == word2[j-1]：dp[i][j] = dp[i-1][j-1]（无需操作）
- 若word1[i-1] != word2[j-1]：
- 插入：dp[i][j-1] + 1（在word1中插入word2[j-1]）
- 删除：dp[i-1][j] + 1（删除word1[i-1]）
- 替换：dp[i-1][j-1] + 1（将word1[i-1]替换为word2[j-1]）
- dp[i][j] = min(插入, 删除, 替换)

### 6.3 复杂度分析

- 时间复杂度：O(mn)
- 空间复杂度：O(mn)，可优化至O(min(m,n))

### 6.4 代码实现

```python
def edit_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1
    return dp[m][n]

def edit_distance_optimized(word1, word2):
    m, n = len(word1), len(word2)
    if m < n:
        word1, word2 = word2, word1
        m, n = n, m
    prev = list(range(n + 1))
    for i in range(1, m + 1):
        curr = [i] + [0] * n
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                curr[j] = prev[j - 1]
            else:
                curr[j] = min(prev[j], curr[j - 1], prev[j - 1]) + 1
        prev = curr
    return prev[n]
```

```cpp
int editDistance(const string& word1, const string& word2) {
    int m = word1.size(), n = word2.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1));
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1[i - 1] == word2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]}) + 1;
        }
    }
    return dp[m][n];
}
```

### 6.5 变体与优化

**加权编辑距离**：不同操作赋予不同代价（如替换代价2，插入/删除代价1）。

**DNA序列比对**：使用仿射空位罚分（affine gap penalty），连续的插入/删除只需一次开罚+多次延伸罚。

---

## 7. 最长递增子序列 (LIS)

### 7.1 问题描述

给定一个整数数组，找到最长严格递增子序列的长度。

### 7.2 O(n^2) DP解法

**状态定义**：dp[i] = 以nums[i]结尾的LIS长度。

**转移方程**：dp[i] = max(dp[j] + 1) for all j < i where nums[j] < nums[i]

```python
def lis_dp(nums):
    n = len(nums)
    dp = [1] * n
    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp) if dp else 0
```

```cpp
int lisDP(const vector<int>& nums) {
    int n = nums.size();
    vector<int> dp(n, 1);
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = max(dp[i], dp[j] + 1);
        }
    }
    return *max_element(dp.begin(), dp.end());
}
```

### 7.3 O(n log n) 贪心+二分解法

维护一个数组tails，tails[i]表示长度为i+1的递增子序列的最小末尾元素。对每个元素，用二分查找确定其在tails中的位置。

```python
import bisect

def lis_binary(nums):
    tails = []
    for x in nums:
        pos = bisect.bisect_left(tails, x)
        if pos == len(tails):
            tails.append(x)
        else:
            tails[pos] = x
    return len(tails)
```

```cpp
int lisBinary(const vector<int>& nums) {
    vector<int> tails;
    for (int x : nums) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    return tails.size();
}
```

**等价性证明**：tails数组始终递增。当新元素x大于tails末尾时，可以扩展最长子序列；否则用x替换tails中第一个>=x的元素，保证了未来能接上更小的元素，获得更长的递增子序列。

### 7.4 复杂度对比

| 方法                 | 时间       | 空间 | 能否还原序列 |
| -------------------- | ---------- | ---- | ------------ |
| O(n^2) DP            | O(n^2)     | O(n) | 是           |
| O(n log n) 贪心+二分 | O(n log n) | O(n) | 需额外记录   |

---

## 8. 子序列与子串问题

### 8.1 最长回文子序列

**状态定义**：dp[i][j] = s[i..j]中最长回文子序列的长度。

**转移方程**：

- 若s[i] == s[j]：dp[i][j] = dp[i+1][j-1] + 2
- 若s[i] != s[j]：dp[i][j] = max(dp[i+1][j], dp[i][j-1])

```python
def longest_palindrome_subseq(s):
    n = len(s)
    dp = [[0] * n for _ in range(n)]
    for i in range(n):
        dp[i][i] = 1
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = dp[i + 1][j - 1] + 2 if length > 2 else 2
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])
    return dp[0][n - 1]
```

```cpp
int longestPalindromeSubseq(const string& s) {
    int n = s.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));
    for (int i = 0; i < n; i++) dp[i][i] = 1;
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            if (s[i] == s[j]) dp[i][j] = (len > 2 ? dp[i + 1][j - 1] : 0) + 2;
            else dp[i][j] = max(dp[i + 1][j], dp[i][j - 1]);
        }
    }
    return dp[0][n - 1];
}
```

### 8.2 最长回文子串

**中心扩展法**：O(n^2)时间，O(1)空间。

```python
def longest_palindrome_substring(s):
    def expand(l, r):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        return r - l - 1

    start, max_len = 0, 0
    for i in range(len(s)):
        len1 = expand(i, i)
        len2 = expand(i, i + 1)
        curr = max(len1, len2)
        if curr > max_len:
            max_len = curr
            start = i - (curr - 1) // 2
    return s[start:start + max_len]
```

**Manacher算法**：O(n)时间，利用回文的对称性避免重复计算。

### 8.3 最大子数组和 (Kadane算法)

```python
def max_subarray(nums):
    max_sum = curr_sum = nums[0]
    for x in nums[1:]:
        curr_sum = max(x, curr_sum + x)
        max_sum = max(max_sum, curr_sum)
    return max_sum
```

```cpp
int maxSubarray(const vector<int>& nums) {
    int maxSum = nums[0], currSum = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        currSum = max(nums[i], currSum + nums[i]);
        maxSum = max(maxSum, currSum);
    }
    return maxSum;
}
```

### 8.4 子序列 vs 子串：状态定义差异

| 问题 | 子序列（不连续）           | 子串（连续）           |
| ---- | -------------------------- | ---------------------- |
| LCS  | dp[i][j]从dp[i-1][j-1]转移 | 最长公共子串需连续匹配 |
| 回文 | dp[i][j]从dp[i+1][j-1]转移 | 中心扩展法             |
| 递增 | dp[i]从所有j<i转移         | 需要连续递增条件       |

---

## 9. 状态压缩与优化

### 9.1 位运算状态压缩

当状态中包含集合信息时，可以用整数的二进制位表示集合，将多维状态压缩为一维。

**旅行商问题（TSP）**：

```python
def tsp(dist):
    n = len(dist)
    INF = float('inf')
    dp = [[INF] * n for _ in range(1 << n)]
    dp[1][0] = 0
    for mask in range(1, 1 << n):
        for u in range(n):
            if not (mask & (1 << u)):
                continue
            for v in range(n):
                if mask & (1 << v):
                    continue
                new_mask = mask | (1 << v)
                dp[new_mask][v] = min(dp[new_mask][v], dp[mask][u] + dist[u][v])
    full_mask = (1 << n) - 1
    return min(dp[full_mask][u] + dist[u][0] for u in range(1, n))
```

```cpp
int tsp(vector<vector<int>>& dist) {
    int n = dist.size();
    int fullMask = (1 << n) - 1;
    vector<vector<int>> dp(1 << n, vector<int>(n, INT_MAX / 2));
    dp[1][0] = 0;
    for (int mask = 1; mask < (1 << n); mask++) {
        for (int u = 0; u < n; u++) {
            if (!(mask & (1 << u))) continue;
            for (int v = 0; v < n; v++) {
                if (mask & (1 << v)) continue;
                int newMask = mask | (1 << v);
                dp[newMask][v] = min(dp[newMask][v], dp[mask][u] + dist[u][v]);
            }
        }
    }
    int result = INT_MAX;
    for (int u = 1; u < n; u++) {
        result = min(result, dp[fullMask][u] + dist[u][0]);
    }
    return result;
}
```

复杂度：O(2^n _ n^2)，空间O(2^n _ n)。

### 9.2 单调队列优化

适用于形如 dp[i] = min/max(dp[j] + cost(j,i)) 的转移，其中cost满足单调性。

**滑动窗口最大值**：

```python
from collections import deque

def sliding_window_max(nums, k):
    dq = deque()
    result = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result
```

### 9.3 斜率优化

当转移方程可以写成 dp[i] = min(dp[j] + a[i]\*b[j] + c[i] + d[j]) 的形式时，可以通过凸包维护将O(n^2)优化为O(n log n)或O(n)。

### 9.4 优化前后复杂度对比

| 优化技术     | 适用场景      | 优化前      | 优化后     |
| ------------ | ------------- | ----------- | ---------- |
| 滚动数组     | 依赖前一行/列 | O(mn)空间   | O(n)空间   |
| 位压缩       | 集合状态      | O(2^n \* n) | O(2^n)空间 |
| 单调队列     | 窗口最值转移  | O(n^2)      | O(n)       |
| 斜率优化     | 凸包转移      | O(n^2)      | O(n log n) |
| 四边形不等式 | 区间DP        | O(n^3)      | O(n^2)     |

---

## 10. DP速查表

| 问题           | 状态定义             | 转移方程                          | 时间         | 空间        |
| -------------- | -------------------- | --------------------------------- | ------------ | ----------- |
| 斐波那契       | dp[i]: 第i项         | dp[i]=dp[i-1]+dp[i-2]             | O(n)         | O(1)        |
| 爬楼梯         | dp[i]: 到第i阶方法数 | dp[i]=dp[i-1]+dp[i-2]             | O(n)         | O(1)        |
| 0-1背包        | dp[i][w]: 前i个容量w | max(dp[i-1][w], dp[i-1][w-wi]+vi) | O(nW)        | O(W)        |
| 完全背包       | dp[w]: 容量w最大价值 | dp[w]=max(dp[w], dp[w-wi]+vi)     | O(nW)        | O(W)        |
| LCS            | dp[i][j]: 前i前j     | 见5.2节                           | O(mn)        | O(mn)       |
| 编辑距离       | dp[i][j]: 前i前j     | 见6.2节                           | O(mn)        | O(min(m,n)) |
| LIS            | dp[i]: 以i结尾       | max(dp[j]+1)                      | O(nlogn)     | O(n)        |
| 最长回文子序列 | dp[i][j]: s[i..j]    | 见8.1节                           | O(n^2)       | O(n^2)      |
| 最大子数组     | curr: 当前和         | curr=max(x,curr+x)                | O(n)         | O(1)        |
| 零钱兑换       | dp[a]: 金额a最少硬币 | dp[a]=min(dp[a-ci]+1)             | O(n\*amount) | O(amount)   |
| TSP            | dp[mask][i]          | 见9.1节                           | O(2^n\*n^2)  | O(2^n\*n)   |

---

## 11. 延伸阅读

- CLRS 第 14-15 章
- 《动态规划从入门到精通》(GitHub 开源书)
- [DP Visualizer](https://algorithm-visualizer.org/dynamic-programming)
- 《算法竞赛进阶指南》(李煜东) DP专题
- AtCoder DP Contest (Educational DP Contest)

> 跨模块引用：DP与贪心的边界讨论参见 [贪心算法](algorithm/greedy)。DP在图算法中的应用（如Floyd-Warshall）参见 [图论算法](algorithm/graph)。刷题实践参见 [LeetCode刷题指南](algorithm/leetcode-guide)。
