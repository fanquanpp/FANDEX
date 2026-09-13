import type { AlgoProblem } from './types';

/**
 * 算法题图鉴 · 动态规划篇
 * 线性 DP / 背包 / 子序列 / 网格与字符串 DP
 * 题面为便于学习的概括复述，参考实现为 Python。
 */
export const DP_PROBLEMS: AlgoProblem[] = [
  {
    slug: 'climbing-stairs',
    lc: 70,
    title: '爬楼梯',
    titleEn: 'Climbing Stairs',
    difficulty: 'easy',
    category: 'dp',
    tags: ['动态规划', '斐波那契', '滚动变量'],
    brief: '每次爬 1 或 2 阶，求爬到 n 阶的不同方法数。',
    statement:
      '你正在爬楼梯，需要 n 阶你才能到达楼顶。每次你可以爬 1 或 2 个台阶，你有多少种不同的方法可以爬到楼顶？\n\n示例：n = 3，方法为 1+1+1、1+2、2+1，输出 3。',
    idea: [
      '到第 n 阶的最后一步只有两种来源：从 n-1 阶爬 1 阶，或从 n-2 阶爬 2 阶，故 f(n) = f(n-1) + f(n-2)，即斐波那契数列。',
      '只需最近两个状态，用两个滚动变量替代数组，空间降到 O(1)。',
      '这是理解"状态定义 + 转移方程 + 边界"三要素的最小例子。',
    ],
    code: `def climbStairs(n):
    # f(n) = f(n-1) + f(n-2)，滚动变量省空间
    prev, cur = 1, 1
    for _ in range(2, n + 1):
        prev, cur = cur, prev + cur
    return cur`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['160-DynamicProgramming'],
  },
  {
    slug: 'maximum-subarray',
    lc: 53,
    title: '最大子数组和',
    titleEn: 'Maximum Subarray',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', 'Kadane 算法'],
    brief: '找出具有最大和的连续子数组并返回其和。',
    statement:
      '给你一个整数数组 nums，请你找出一个具有最大和的连续子数组（子数组最少包含一个元素），返回其最大和。\n\n示例：nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]，连续子数组 [4, -1, 2, 1] 的和最大，输出 6。',
    idea: [
      '状态定义：dp[i] 为「以 nums[i] 结尾」的最大子数组和——必须强制包含 nums[i]，保证状态连续推进。',
      '转移：前面的累计是资产还是负资产？dp[i] = max(dp[i-1] + nums[i], nums[i])，即负贡献直接舍弃重启。',
      '答案为所有 dp[i] 的最大值；用单变量滚动即可，空间 O(1)，这就是 Kadane 算法。',
    ],
    code: `def maxSubArray(nums):
    # cur 为以当前元素结尾的最大和，负贡献则重启
    cur = best = nums[0]
    for x in nums[1:]:
        cur = max(cur + x, x)
        best = max(best, cur)
    return best`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['160-DynamicProgramming'],
  },
  {
    slug: 'house-robber',
    lc: 198,
    title: '打家劫舍',
    titleEn: 'House Robber',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '状态转移'],
    brief: '沿街房屋不能偷相邻两家，求能偷到的最高金额。',
    statement:
      '你是一个小偷，计划偷窃沿街的房屋。每间房内都藏有一定的现金，影响你偷窃的唯一制约因素是相邻的房屋装有相互连通的防盗系统，如果两间相邻的房屋在同一晚上被偷窃，系统会自动报警。给定一个代表每个房屋存放金额的非负整数数组，计算不触动警报装置的情况下，一夜之内能够偷窃到的最高金额。\n\n示例：nums = [2, 7, 9, 3, 1]，输出 12（偷 2 + 9 + 1）。',
    idea: [
      '状态：dp[i] 为考虑前 i+1 间房能偷到的最高金额。第 i 间只有偷或不偷两种选择。',
      '偷第 i 间则第 i-1 间不能偷，得 dp[i-2] + nums[i]；不偷则维持 dp[i-1]，取两者较大。',
      '同样只需两个滚动变量；边界从"前两间"的最大值起步。',
    ],
    code: `def rob(nums):
    # prev/cur 分别对应 dp[i-2] 与 dp[i-1]
    prev = cur = 0
    for x in nums:
        prev, cur = cur, max(cur, prev + x)
    return cur`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['160-DynamicProgramming'],
  },
  {
    slug: 'house-robber-ii',
    lc: 213,
    title: '打家劫舍 II',
    titleEn: 'House Robber II',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '环形拆解'],
    brief: '房屋围成环（首尾相邻），求最高偷窃金额。',
    statement:
      '这个地方所有的房屋都围成一圈，这意味着第一个房屋和最后一个房屋是紧挨着的。给定一个代表每个房屋存放金额的非负整数数组，计算在不触动警报装置的情况下，今晚能够偷窃到的最高金额。\n\n示例：nums = [2, 3, 2]，输出 3（首尾不能同时偷，只能偷 3）。',
    idea: [
      '环形约束的本质：首尾两间不能同时偷。拆成两个线性子问题即可。',
      '子问题一：偷 [0, n-2]（不含尾）；子问题二：偷 [1, n-1]（不含首），各自用第 198 题解法。',
      '答案取两子问题较大值；单间房屋与空输入要单独处理。',
    ],
    code: `def rob(nums):
    def rob_line(houses):
        prev = cur = 0
        for x in houses:
            prev, cur = cur, max(cur, prev + x)
        return cur

    if len(nums) == 1:
        return nums[0]
    # 首尾不相容，拆成两条线性链取较大
    return max(rob_line(nums[:-1]), rob_line(nums[1:]))`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['160-DynamicProgramming'],
  },
  {
    slug: 'coin-change',
    lc: 322,
    title: '零钱兑换',
    titleEn: 'Coin Change',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '完全背包'],
    brief: '凑出 amount 所需的最少硬币数。',
    statement:
      '给你一个整数数组 coins 表示不同面额的硬币，以及一个整数 amount 表示总金额。计算并返回可以凑成总金额所需的最少的硬币个数；任何硬币组合都无法凑出总金额则返回 -1。每种硬币数量无限。\n\n示例：coins = [1, 2, 5]，amount = 11，输出 3（5 + 5 + 1）。',
    idea: [
      '完全背包的"最少件数"版本：dp[x] 表示凑出金额 x 的最少硬币数，答案 dp[amount]。',
      '转移：枚举每种硬币 c，dp[x] = min(dp[x - c] + 1)，含义是"最后用一枚 c"。',
      '初始化 dp[0] = 0、其余为正无穷表示不可达；外层枚举金额、内层枚举硬币的顺序均可（求最少件数与组合/排列无关）。',
    ],
    code: `def coinChange(coins, amount):
    INF = amount + 1  # 正无穷哨兵
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x:
                dp[x] = min(dp[x], dp[x - c] + 1)
    return -1 if dp[amount] > amount else dp[amount]`,
    time: 'O(amount × 硬币数)',
    space: 'O(amount)',
    related: ['160-DynamicProgramming'],
  },
  {
    slug: 'partition-equal-subset-sum',
    lc: 416,
    title: '分割等和子集',
    titleEn: 'Partition Equal Subset Sum',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '0-1 背包'],
    brief: '判断数组能否分割成两个元素和相等的子集。',
    statement:
      '给你一个只包含正整数的非空数组 nums，判断是否可以将这个数组分割成两个子集，使得两个子集的元素和相等。\n\n示例：nums = [1, 5, 11, 5]，输出 true（[1, 5, 5] 与 [11]）。',
    idea: [
      '能否分割等和 = 能否从数组中选出子集使和恰为 sum / 2，这是 0-1 背包的可行性判定版。',
      'sum 为奇数直接不可行；dp[x] 表示能否用已处理元素凑出和 x。',
      '转移为布尔 OR：dp[x] |= dp[x - c]；内层金额必须倒序遍历，保证每个元素只用一次。',
    ],
    code: `def canPartition(nums):
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    dp = [True] + [False] * target
    for c in nums:
        # 0-1 背包：金额倒序防止重复选取
        for x in range(target, c - 1, -1):
            dp[x] = dp[x] or dp[x - c]
    return dp[target]`,
    time: 'O(n × target)',
    space: 'O(target)',
    related: ['160-DynamicProgramming'],
  },
  {
    slug: 'longest-increasing-subsequence',
    lc: 300,
    title: '最长递增子序列',
    titleEn: 'Longest Increasing Subsequence',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '贪心 + 二分'],
    brief: '求严格递增子序列的最大长度。',
    statement:
      '给你一个整数数组 nums，找到其中最长严格递增子序列的长度（子序列可以不连续，但需保持相对顺序）。\n\n示例：nums = [10, 9, 2, 5, 3, 7, 101, 18]，最长递增子序列为 [2, 3, 7, 101]，输出 4。',
    idea: [
      '基础 DP：dp[i] 为以 nums[i] 结尾的 LIS 长度，转移枚举所有更小值的前驱，O(n^2)。',
      'O(n log n) 解法用"贪心 + 二分"：维护数组 tails，tails[k] 为长度 k+1 的递增子序列的最小结尾值，它单调递增。',
      '每个新元素二分查找它在 tails 中的位置：越界则 LIS 变长，否则替换该位置使结尾更小（更有利于后续扩展）。',
      '注意 tails 不是任何一个具体的 LIS，只用于维护长度信息。',
    ],
    code: `import bisect

def lengthOfLIS(nums):
    # tails[k]：长度为 k+1 的 LIS 的最小可能结尾值（单调递增）
    tails = []
    for x in nums:
        pos = bisect.bisect_left(tails, x)
        if pos == len(tails):
            tails.append(x)
        else:
            tails[pos] = x
    return len(tails)`,
    time: 'O(n log n)',
    space: 'O(n)',
    related: ['160-DynamicProgramming', '170-BinarySearchAlgorithms'],
  },
  {
    slug: 'longest-common-subsequence',
    lc: 1143,
    title: '最长公共子序列',
    titleEn: 'Longest Common Subsequence',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '二维 DP'],
    brief: '求两个字符串的最长公共子序列长度。',
    statement:
      '给定两个字符串 text1 和 text2，返回这两个字符串的最长公共子序列的长度；不存在则返回 0。子序列是从原字符串中删除部分（或不删除）字符而不改变相对顺序形成的新字符串。\n\n示例：text1 = "abcde"，text2 = "ace"，最长公共子序列为 "ace"，输出 3。',
    idea: [
      '二维状态 dp[i][j]：text1 前 i 个字符与 text2 前 j 个字符的 LCS 长度。',
      '末字符相等：dp[i][j] = dp[i-1][j-1] + 1；不等：两侧分别退一位取较大值。',
      '滚动数组可把空间压到 O(min(m, n))，注意用临时变量保存左上角状态。',
    ],
    code: `def longestCommonSubsequence(t1, t2):
    m, n = len(t1), len(t2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if t1[i - 1] == t2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]`,
    time: 'O(m · n)',
    space: 'O(m · n)',
    related: ['160-DynamicProgramming', '150-StringAlgorithms'],
  },
  {
    slug: 'edit-distance',
    lc: 72,
    title: '编辑距离',
    titleEn: 'Edit Distance',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '二维 DP'],
    brief: '把一个单词转换成另一个单词所需的最少操作数（增删改）。',
    statement:
      '给你两个单词 word1 和 word2，请返回将 word1 转换成 word2 所使用的最少操作数。可以对一个单词进行三种操作：插入一个字符、删除一个字符、替换一个字符。\n\n示例：word1 = "horse"，word2 = "ros"，输出 3（horse -> rorse -> rose -> ros）。',
    idea: [
      '状态 dp[i][j]：word1 前 i 个字符变成 word2 前 j 个字符的最少操作数。',
      '末字符相等时免费继承 dp[i-1][j-1]；不等时在「删、插、改」三种操作中取最小再加一。',
      '边界是空串情形：dp[i][0] = i（全删）、dp[0][j] = j（全插）；该状态定义同时给出了边界含义。',
    ],
    code: `def minDistance(word1, word2):
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
                dp[i][j] = 1 + min(dp[i - 1][j],      # 删除
                                   dp[i][j - 1],      # 插入
                                   dp[i - 1][j - 1])  # 替换
    return dp[m][n]`,
    time: 'O(m · n)',
    space: 'O(m · n)',
    related: ['160-DynamicProgramming', '150-StringAlgorithms'],
  },
  {
    slug: 'longest-palindromic-substring',
    lc: 5,
    title: '最长回文子串',
    titleEn: 'Longest Palindromic Substring',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '中心扩展'],
    brief: '返回字符串中最长的回文子串。',
    statement:
      '给你一个字符串 s，找到 s 中最长的回文子串（正读反读相同的连续子串）。\n\n示例：s = "babad"，输出 "bab"（或 "aba"）；s = "cbbd"，输出 "bb"。',
    idea: [
      '中心扩展法最直观：回文由中心向两侧对称，枚举 2n - 1 个中心（每个字符 + 每对相邻字符间），向两侧扩展记录最长。',
      '偶长度回文没有单一字符中心，所以相邻两字符相等也要作为一类中心处理。',
      'DP 解法 dp[i][j] 表示 s[i..j] 是否回文，转移看 s[i] == s[j] 且内部回文，空间 O(n^2)；中心扩展空间 O(1) 更优。',
    ],
    code: `def longestPalindrome(s):
    def expand(l, r):
        # 由中心向两侧扩展，返回回文半径内区间
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        return l + 1, r - 1

    best_l, best_r = 0, 0
    for i in range(len(s)):
        for l, r in (expand(i, i), expand(i, i + 1)):
            if r - l > best_r - best_l:
                best_l, best_r = l, r
    return s[best_l:best_r + 1]`,
    time: 'O(n^2)',
    space: 'O(1)',
    related: ['160-DynamicProgramming', '150-StringAlgorithms'],
  },
  {
    slug: 'unique-paths',
    lc: 62,
    title: '不同路径',
    titleEn: 'Unique Paths',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '网格 DP', '组合数学'],
    brief: '机器人从网格左上角走到右下角的路径总数。',
    statement:
      '一个机器人位于一个 m x n 网格的左上角（起始点在下图中标记为 Start），机器人每次只能向下或者向右移动一步，机器人试图达到网格的右下角（标记为 Finish），问总共有多少条不同的路径。\n\n示例：m = 3，n = 7，输出 28。',
    idea: [
      '状态 dp[i][j]：到达格 (i, j) 的路径数，只能从上方或左方转移，dp[i][j] = dp[i-1][j] + dp[i][j-1]。',
      '首行首列路径恒为 1；用一维滚动数组滚动更新即可，空间 O(n)。',
      '组合数学视角：路径由 m-1 次下移与 n-1 次右移组成，答案为 C(m+n-2, m-1)，可直接计算。',
    ],
    code: `def uniquePaths(m, n):
    # 一维滚动：dp[j] 为当前行到达第 j 列的路径数
    dp = [1] * n
    for _ in range(1, m):
        for j in range(1, n):
            dp[j] += dp[j - 1]
    return dp[n - 1]`,
    time: 'O(m · n)',
    space: 'O(n)',
    related: ['160-DynamicProgramming'],
  },
  {
    slug: 'word-break',
    lc: 139,
    title: '单词拆分',
    titleEn: 'Word Break',
    difficulty: 'medium',
    category: 'dp',
    tags: ['动态规划', '哈希表'],
    brief: '判断字符串能否被字典中的单词拼接而成。',
    statement:
      '给你一个字符串 s 和一个字符串列表 wordDict 作为字典，判定 s 是否可以由空格分割为一个或多个在字典中出现的单词（字典单词可重复使用）。\n\n示例：s = "leetcode"，wordDict = ["leet", "code"]，输出 true。',
    idea: [
      '状态 dp[i]：s 的前 i 个字符能否被字典拆分；dp[0] = true 表示空串可拆。',
      '转移：枚举最后一个单词 s[j..i)，dp[i] = exists j 使 dp[j] 且 s[j:i] 在字典中。',
      '字典用哈希集合保证 O(1) 查询；枚举上限可设为字典最长单词长度，避免无效长度的子串查询。',
    ],
    code: `def wordBreak(s, wordDict):
    words = set(wordDict)
    max_len = max(map(len, words))
    dp = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        # 枚举最后一个单词的起点
        for j in range(max(0, i - max_len), i):
            if dp[j] and s[j:i] in words:
                dp[i] = True
                break
    return dp[len(s)]`,
    time: 'O(n · L)',
    space: 'O(n)',
    related: ['160-DynamicProgramming', '150-StringAlgorithms'],
  },
];
