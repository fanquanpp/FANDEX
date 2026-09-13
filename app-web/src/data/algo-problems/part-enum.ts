import type { AlgoProblem } from './types';

/**
 * 算法题图鉴 · 枚举与设计篇
 * 回溯 / 贪心 / 设计与位运算
 * 题面为便于学习的概括复述，参考实现为 Python。
 */
export const ENUM_PROBLEMS: AlgoProblem[] = [
  // ==================== 回溯 ====================
  {
    slug: 'subsets',
    lc: 78,
    title: '子集',
    titleEn: 'Subsets',
    difficulty: 'medium',
    category: 'backtrack',
    tags: ['回溯', '子集树'],
    brief: '返回数组所有可能的子集（幂集）。',
    statement:
      '给你一个整数数组 nums（元素互不相同），返回该数组所有可能的子集（幂集），解集不能包含重复的子集，顺序任意。\n\n示例：nums = [1, 2, 3]，输出 [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]。',
    idea: [
      '每个元素都有"选 / 不选"两种状态，全部 n 个元素的决定构成一棵深度为 n 的子集树，回溯就是这棵树的深度优先枚举。',
      '常用实现：路径 path 记录已选元素，每次递归先把当前 path 存入结果，再从下一个下标开始继续选择。',
      '"从 start 开始"保证组合内部元素有序，天然去重；元素互不相同使问题无需剪枝。',
    ],
    code: `def subsets(nums):
    res, path = [], []

    def backtrack(start):
        # 当前路径本身就是一个子集
        res.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1)
            path.pop()

    backtrack(0)
    return res`,
    time: 'O(n · 2^n)',
    space: 'O(n)',
    related: ['140-RecursionAndBacktracking'],
  },
  {
    slug: 'permutations',
    lc: 46,
    title: '全排列',
    titleEn: 'Permutations',
    difficulty: 'medium',
    category: 'backtrack',
    tags: ['回溯', '排列树'],
    brief: '返回不含重复数字的数组的全部排列。',
    statement:
      '给定一个不含重复数字的数组 nums，返回其所有可能的全排列，顺序任意。\n\n示例：nums = [1, 2, 3]，输出 [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]。',
    idea: [
      '排列与子集的区别：排列关心顺序，每一层都可以从"所有未使用"的元素中选，而非只从 start 之后选。',
      '用 used 数组标记已选元素，回溯时先标记、递归、再撤销，保证路径可复用。',
      '路径长度达到 n 即收集答案；时间被结果数量 2 界定在 O(n · n!)。',
    ],
    code: `def permute(nums):
    res, path = [], []
    used = [False] * len(nums)

    def backtrack():
        if len(path) == len(nums):
            res.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            path.append(nums[i])
            backtrack()
            path.pop()
            used[i] = False

    backtrack()
    return res`,
    time: 'O(n · n!)',
    space: 'O(n)',
    related: ['140-RecursionAndBacktracking'],
  },
  {
    slug: 'combinations',
    lc: 77,
    title: '组合',
    titleEn: 'Combinations',
    difficulty: 'medium',
    category: 'backtrack',
    tags: ['回溯', '剪枝'],
    brief: '返回 [1, n] 中所有 k 个数的组合。',
    statement:
      '给定两个整数 n 和 k，返回范围 [1, n] 中所有可能的 k 个数的组合，顺序任意。\n\n示例：n = 4，k = 2，输出 [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]。',
    idea: [
      '子集模板的直接应用：从 1..n 中选，路径长度到 k 即收集。',
      '剪枝是本题的考察点：剩余可选元素数量不足以凑满 k 个时提前返回，即 i <= n - (k - len(path)) + 1。',
      '剪枝不影响正确性，只砍掉注定失败的分支，对 n、k 接近时收益显著。',
    ],
    code: `def combine(n, k):
    res, path = [], []

    def backtrack(start):
        if len(path) == k:
            res.append(path[:])
            return
        # 剪枝：剩余元素不够凑满 k 个时不再展开
        for i in range(start, n - (k - len(path)) + 2):
            path.append(i)
            backtrack(i + 1)
            path.pop()

    backtrack(1)
    return res`,
    time: 'O(k · C(n, k))',
    space: 'O(k)',
    related: ['140-RecursionAndBacktracking'],
  },
  {
    slug: 'combination-sum',
    lc: 39,
    title: '组合总和',
    titleEn: 'Combination Sum',
    difficulty: 'medium',
    category: 'backtrack',
    tags: ['回溯', '可重复选取'],
    brief: '找出 candidates 中和为 target 的所有组合（数字可重复选）。',
    statement:
      '给你一个无重复元素的整数数组 candidates 和一个目标整数 target，找出 candidates 中可以使数字和为目标数 target 的所有不同组合。同一个数字可以无限制重复被选取。\n\n示例：candidates = [2, 3, 6, 7]，target = 7，输出 [[2, 2, 3], [7]]。',
    idea: [
      '与组合模板的差异在递归出口与重复选取：和恰好等于 target 时收集；超过时剪枝返回。',
      '允许重复选同一个数：递归时传 i 而不是 i + 1（当前层仍可再选自己）。',
      '不重复的组合靠"只向后选"保证；candidates 先排序后可在和超过 target 时整层 break，剪枝更彻底。',
    ],
    code: `def combinationSum(candidates, target):
    candidates.sort()
    res, path = [], []

    def backtrack(start, rest):
        if rest == 0:
            res.append(path[:])
            return
        for i in range(start, len(candidates)):
            x = candidates[i]
            if x > rest:
                break  # 后面更大，整层剪枝
            path.append(x)
            backtrack(i, rest - x)  # i 不 +1，允许重复选
            path.pop()

    backtrack(0, target)
    return res`,
    time: 'O(解的规模)',
    space: 'O(target)',
    related: ['140-RecursionAndBacktracking'],
  },
  {
    slug: 'generate-parentheses',
    lc: 22,
    title: '括号生成',
    titleEn: 'Generate Parentheses',
    difficulty: 'medium',
    category: 'backtrack',
    tags: ['回溯', '剪枝'],
    brief: '生成所有由 n 对括号组成的合法组合。',
    statement:
      '数字 n 代表生成括号的对数，请你设计一个函数，用于能够生成所有可能的并且有效的括号组合。\n\n示例：n = 3，输出 ["((()))", "(()())", "(())()", "()(())", "()()()"]。',
    idea: [
      '把"合法"翻译成可执行的剪枝条件：任意前缀中左括号数不少于右括号数，且最终两者相等。',
      '维护已用左括号数 l 与右括号数 r：l < n 时可以放左括号，r < l 时可以放右括号，其他分支全部剪掉。',
      '路径长度达到 2n 即收集；剪枝保证生成的每个前缀都合法，无需事后校验。',
    ],
    code: `def generateParenthesis(n):
    res, path = [], []

    def backtrack(l, r):
        if len(path) == 2 * n:
            res.append(''.join(path))
            return
        if l < n:
            path.append('(')
            backtrack(l + 1, r)
            path.pop()
        if r < l:
            path.append(')')
            backtrack(l, r + 1)
            path.pop()

    backtrack(0, 0)
    return res`,
    time: 'O(卡特兰数 · n)',
    space: 'O(n)',
    related: ['140-RecursionAndBacktracking'],
  },
  {
    slug: 'word-search',
    lc: 79,
    title: '单词搜索',
    titleEn: 'Word Search',
    difficulty: 'medium',
    category: 'backtrack',
    tags: ['回溯', '网格 DFS', '原地标记'],
    brief: '判断网格中是否存在一条按序连成给定单词的路径。',
    statement:
      '给定一个 m x n 二维字符网格 board 和一个字符串单词 word，如果 word 存在于网格中，返回 true；否则返回 false。单词必须按照字母顺序，通过相邻的单元格内的字母构成，同一个单元格内的字母不允许被重复使用。\n\n示例：board 含路径 ["A","B","C","E"], ["S","F","C","S"], ["A","D","E","E"]，word = "ABCCED" 返回 true。',
    idea: [
      '从每个格子尝试作为起点做 DFS：当前字符匹配则向四个方向扩展匹配下一个字符。',
      '访问标记用原地修改（把当前格临时改成特殊字符）实现，回溯时恢复，省去 visited 数组。',
      '任一起点成功即返回 true；配合"字符不匹配立即回退"的剪枝即可通过数据规模。',
    ],
    code: `def exist(board, word):
    m, n = len(board), len(board[0])

    def dfs(i, j, k):
        # k 为待匹配的 word 下标
        if board[i][j] != word[k]:
            return False
        if k == len(word) - 1:
            return True
        board[i][j] = '#'  # 原地标记防重复访问
        found = False
        for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
            if 0 <= x < m and 0 <= y < n and dfs(x, y, k + 1):
                found = True
                break
        board[i][j] = word[k]  # 回溯恢复
        return found

    return any(dfs(i, j, 0) for i in range(m) for j in range(n))`,
    time: 'O(m · n · 3^L)',
    space: 'O(L)',
    related: ['140-RecursionAndBacktracking', '110-GraphAlgorithms'],
  },
  {
    slug: 'n-queens',
    lc: 51,
    title: 'N 皇后',
    titleEn: 'N-Queens',
    difficulty: 'hard',
    category: 'backtrack',
    tags: ['回溯', '集合剪枝'],
    brief: '把 n 个皇后摆到 n x n 棋盘上使其互不攻击，返回所有方案。',
    statement:
      '按照国际象棋的规则，皇后可以攻击与之处在同一行或同一列或同一斜线上的棋子。n 皇后问题研究如何将 n 个皇后放置在 n x n 的棋盘上，并且使皇后彼此之间不能互相攻击。给你整数 n，返回所有不同的解，每种解以字符串棋盘形式呈现。\n\n示例：n = 4 有两个解。',
    idea: [
      '按行放置是关键简化：每行恰好一个皇后，冲突检查只剩列、主对角线（row - col）、副对角线（row + col）三个维度。',
      '用三个集合记录已被占用的列与两条对角线，O(1) 判冲突；主对角线差恒定、副对角线和恒定。',
      '第 row 行尝试每一列，放置时登记、递归、撤销；row 达到 n 即得到一个完整解并格式化输出。',
    ],
    code: `def solveNQueens(n):
    res = []
    queens = []          # queens[row] = col
    cols, diag1, diag2 = set(), set(), set()

    def backtrack(row):
        if row == n:
            res.append(['.' * c + 'Q' + '.' * (n - c - 1) for c in queens])
            return
        for col in range(n):
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue
            queens.append(col)
            cols.add(col)
            diag1.add(row - col)
            diag2.add(row + col)
            backtrack(row + 1)
            queens.pop()
            cols.remove(col)
            diag1.remove(row - col)
            diag2.remove(row + col)

    backtrack(0)
    return res`,
    time: 'O(n!)',
    space: 'O(n)',
    related: ['140-RecursionAndBacktracking'],
  },

  // ==================== 贪心 ====================
  {
    slug: 'best-time-to-buy-and-sell-stock',
    lc: 121,
    title: '买卖股票的最佳时机',
    titleEn: 'Best Time to Buy and Sell Stock',
    difficulty: 'easy',
    category: 'greedy',
    tags: ['贪心', '一次遍历'],
    brief: '一次买卖（先买后卖）所能获取的最大利润。',
    statement:
      '给定一个数组 prices，其中 prices[i] 表示某支股票第 i 天的价格。你只能选择某一天买入并在未来的某个不同的日子卖出，求所能获取的最大利润；无法获利则返回 0。\n\n示例：prices = [7, 1, 5, 3, 6, 4]，第 2 天买入、第 5 天卖出，利润 6 - 1 = 5。',
    idea: [
      '遍历时维护"至今为止的最低买入价"，当天的最优卖出利润 = 当天价格 - 最低价。',
      '全局答案就是各天最优卖出利润的最大值，一遍扫描完成。',
      '贪心成立的直观理由：最优卖出日 j 的最佳搭档一定是 j 之前的历史最低价，拆开看每个卖出日即可独立计算。',
    ],
    code: `def maxProfit(prices):
    # min_price 为历史最低买入价，逐日更新最大利润
    min_price = float('inf')
    profit = 0
    for p in prices:
        min_price = min(min_price, p)
        profit = max(profit, p - min_price)
    return profit`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['130-GreedyAlgorithm', '160-DynamicProgramming'],
  },
  {
    slug: 'jump-game',
    lc: 55,
    title: '跳跃游戏',
    titleEn: 'Jump Game',
    difficulty: 'medium',
    category: 'greedy',
    tags: ['贪心', '可达性'],
    brief: '判断能否从数组起点跳到最后一格。',
    statement:
      '给你一个非负整数数组 nums，你最初位于数组的第一个下标。数组中的每个元素代表你在该位置可以跳跃的最大长度。判断你是否能够到达最后一个下标。\n\n示例：nums = [2, 3, 1, 1, 4]，输出 true；nums = [3, 2, 1, 0, 4]，输出 false。',
    idea: [
      '维护"当前能到达的最远下标" farthest，从左向右扫描。',
      '若下标 i 超出 farthest，说明 i 不可达且右侧更不可达，返回 false；否则用 i + nums[i] 更新 farthest。',
      'farthest 覆盖末尾即成功；扫描一趟即可，本质是贪心式区间扩展。',
    ],
    code: `def canJump(nums):
    farthest = 0
    for i, step in enumerate(nums):
        if i > farthest:
            return False
        farthest = max(farthest, i + step)
    return farthest >= len(nums) - 1`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['130-GreedyAlgorithm'],
  },
  {
    slug: 'jump-game-ii',
    lc: 45,
    title: '跳跃游戏 II',
    titleEn: 'Jump Game II',
    difficulty: 'medium',
    category: 'greedy',
    tags: ['贪心', '层序思想'],
    brief: '求跳到数组末尾的最少跳跃次数。',
    statement:
      '给定一个长度为 n 的 0 索引整数数组 nums，初始位置为 nums[0]，每个元素代表在该位置可以跳跃的最大长度，目标是到达数组最后一个位置并使用最少的跳跃次数（数据保证可达）。\n\n示例：nums = [2, 3, 1, 1, 4]，输出 2（跳到下标 1，再跳 3 步到末尾）。',
    idea: [
      '把跳跃想成 BFS 分层：每次跳跃覆盖一个连续可达区间，层与层之间由"本层能延伸到的最远点"衔接。',
      '维护当前层的边界 cur_end 与下一步可达的最远点 farthest：扫描到 i == cur_end 时不得不起跳，次数加一并把边界推到 farthest。',
      '贪心正确性：在边界前任意选择都不会比"覆盖到 farthest"更优，因为 farthest 已是两层之内的极限。',
    ],
    code: `def jump(nums):
    steps = cur_end = farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        # 走到当前层边界，必须再跳一次
        if i == cur_end:
            steps += 1
            cur_end = farthest
    return steps`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['130-GreedyAlgorithm'],
  },
  {
    slug: 'merge-intervals',
    lc: 56,
    title: '合并区间',
    titleEn: 'Merge Intervals',
    difficulty: 'medium',
    category: 'greedy',
    tags: ['排序', '扫描合并'],
    brief: '合并所有存在重叠的区间。',
    statement:
      '以数组 intervals 表示若干个区间的集合，其中单个区间为 intervals[i] = [starti, endi]。请你合并所有重叠的区间，并返回一个不重叠的区间数组，该数组需恰好覆盖输入中的所有区间。\n\n示例：intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]，输出 [[1, 6], [8, 10], [15, 18]]。',
    idea: [
      '先按左端点排序，使所有可能重叠的区间相邻，扫描一遍即可完成合并。',
      '维护当前合并区间：下一个区间左端点 <= 当前右端点则重叠，右端点取两者较大值（覆盖包含关系）。',
      '不重叠则把当前区间存档，开启新区间。',
    ],
    code: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    res = []
    for start, end in intervals:
        # 与上一区间重叠则延伸右端点
        if res and start <= res[-1][1]:
            res[-1][1] = max(res[-1][1], end)
        else:
            res.append([start, end])
    return res`,
    time: 'O(n log n)',
    space: 'O(log n)',
    related: ['130-GreedyAlgorithm', '030-SortAlgorithm'],
  },
  {
    slug: 'non-overlapping-intervals',
    lc: 435,
    title: '无重叠区间',
    titleEn: 'Non-overlapping Intervals',
    difficulty: 'medium',
    category: 'greedy',
    tags: ['贪心', '区间调度'],
    brief: '求最少移除多少个区间可使剩余区间互不重叠。',
    statement:
      '给定一个区间的集合 intervals，其中 intervals[i] = [starti, endi]。返回需要移除区间的最小数量，使剩余区间互不重叠（端点相触不算重叠）。\n\n示例：intervals = [[1, 2], [2, 3], [3, 4], [1, 3]]，移除 [1, 3] 后无重叠，输出 1。',
    idea: [
      '等价转换：最小移除数 = 总数 - 最多能保留的互不重叠区间数，这是经典区间调度问题。',
      '贪心策略：按右端点升序排列，每次选右端点最小的区间保留，给后面留出最大空间。',
      '扫描时若当前区间左端点 >= 已保留区间的最大右端点则保留，否则计入移除。',
    ],
    code: `def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[1])
    keep = 0
    end = float('-inf')
    for start, e in intervals:
        # 右端点最小者优先保留
        if start >= end:
            keep += 1
            end = e
    return len(intervals) - keep`,
    time: 'O(n log n)',
    space: 'O(log n)',
    related: ['130-GreedyAlgorithm'],
  },
  {
    slug: 'minimum-number-of-arrows-to-burst-balloons',
    lc: 452,
    title: '用最少数量的箭引爆气球',
    titleEn: 'Minimum Number of Arrows to Burst Balloons',
    difficulty: 'medium',
    category: 'greedy',
    tags: ['贪心', '区间交集'],
    brief: '沿 x 轴射箭引爆所有气球，求最少箭数。',
    statement:
      '在一个二维空间中有许多气球，每个气球用水平直径的坐标 [start, end] 表示。一支垂直射出的箭可以引爆所有与射线相交的气球（端点相触算相交）。求引爆所有气球所需的最少弓箭数。\n\n示例：points = [[10, 16], [2, 8], [1, 6], [7, 12]]，输出 2。',
    idea: [
      '一支箭能引爆的气球集合 = 与某条竖线都相交的气球 = 一组"有公共交集"的区间。',
      '按左端点排序后扫描，维护当前箭的公共交集右端 limit（各区间右端点的最小值）。',
      '新气球左端 > limit 时交集断裂，需要新箭；否则 limit 收缩为 min(limit, 当前右端)。',
    ],
    code: `def findMinArrowShots(points):
    points.sort(key=lambda x: x[0])
    arrows = 1
    limit = points[0][1]
    for start, end in points[1:]:
        if start > limit:
            arrows += 1
            limit = end
        else:
            limit = min(limit, end)
    return arrows`,
    time: 'O(n log n)',
    space: 'O(log n)',
    related: ['130-GreedyAlgorithm'],
  },

  // ==================== 设计与位运算 ====================
  {
    slug: 'lru-cache',
    lc: 146,
    title: 'LRU 缓存',
    titleEn: 'LRU Cache',
    difficulty: 'medium',
    category: 'design',
    tags: ['设计', '哈希表', '双向链表'],
    brief: '设计容量受限、淘汰最久未使用的缓存结构。',
    statement:
      '请你设计并实现一个满足 LRU（最近最少使用）缓存约束的数据结构：LRUCache(int capacity) 以正整数容量初始化；get(key) 存在则返回值并使其成为最近使用，否则返回 -1；put(key, value) 存在则修改并置为最近使用，不存在则插入；容量超限时淘汰最久未使用的键。get 与 put 均要求 O(1) 平均时间。\n\n示例：capacity = 2，依次 put(1,1)、put(2,2)、get(1)、put(3,3)（淘汰 2）、get(2) 返回 -1。',
    idea: [
      'O(1) 读写 + O(1) 排序使用时间，只有「哈希表 + 双向链表」的组合能做到：哈希表定位节点，链表维护使用顺序。',
      '双向链表的优势是 O(1) 摘除任意节点——把最近使用的移到头部，淘汰时删尾部。',
      '用哑头哑尾节点消除对头尾的特判；Python 也可直接使用 OrderedDict，但手写更能体现原理。',
    ],
    code: `class LRUCache:
    class Node:
        __slots__ = ('key', 'val', 'prev', 'next')

        def __init__(self, key=0, val=0):
            self.key, self.val = key, val
            self.prev = self.next = None

    def __init__(self, capacity):
        self.cap = capacity
        self.map = {}  # key -> 节点
        self.head, self.tail = self.Node(), self.Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _move_to_front(self, node):
        self._remove(node)
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        node = self.map.get(key)
        if not node:
            return -1
        self._move_to_front(node)
        return node.val

    def put(self, key, value):
        node = self.map.get(key)
        if node:
            node.val = value
            self._move_to_front(node)
            return
        if len(self.map) >= self.cap:
            # 淘汰链表尾部最久未使用节点
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]
        node = self.Node(key, value)
        self.map[key] = node
        self._move_to_front(node)`,
    time: 'O(1) 各操作',
    space: 'O(capacity)',
    related: ['060-LinkedList', '070-HashTable'],
  },
  {
    slug: 'single-number',
    lc: 136,
    title: '只出现一次的数字',
    titleEn: 'Single Number',
    difficulty: 'easy',
    category: 'design',
    tags: ['位运算', '异或'],
    brief: '找出只出现一次的元素，其余元素均出现两次。',
    statement:
      '给你一个非空整数数组 nums，除了某个元素只出现一次以外，其余每个元素均出现两次。找出那个只出现了一次的元素。要求线性时间、不使用额外空间。\n\n示例：nums = [4, 1, 2, 1, 2]，输出 4。',
    idea: [
      '异或的三条性质是解题核心：x ^ x = 0，x ^ 0 = x，异或满足交换律与结合律。',
      '把全部数字异或在一起，成对的元素互相抵消为 0，只剩出现一次的那个。',
    ],
    code: `def singleNumber(nums):
    # 成对元素异或抵消，剩余即答案
    ans = 0
    for x in nums:
        ans ^= x
    return ans`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['010-AlgorithmAnalysisBasics'],
  },
  {
    slug: 'number-of-1-bits',
    lc: 191,
    title: '位 1 的个数',
    titleEn: 'Number of 1 Bits',
    difficulty: 'easy',
    category: 'design',
    tags: ['位运算', 'Brian Kernighan'],
    brief: '统计无符号整数的二进制表示中 1 的个数。',
    statement:
      '编写一个函数，输入是一个无符号整数（二进制串形式），返回其二进制表达式中数字位数为 1 的个数（也称汉明重量）。\n\n示例：n = 11（二进制 1011），输出 3。',
    idea: [
      '逐位检查是 O(log n)；Brian Kernighan 技巧 n &= n - 1 每次消除最低位的 1，循环次数恰为 1 的个数。',
      '原理：n - 1 会把最低位的 1 变 0、其后的 0 变 1，按位与恰好把这最低位的 1 清掉。',
    ],
    code: `def hammingWeight(n):
    # n & (n-1) 消除最低位的 1
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count`,
    time: 'O(k)',
    space: 'O(1)',
    related: ['010-AlgorithmAnalysisBasics'],
  },
  {
    slug: 'counting-bits',
    lc: 338,
    title: '比特位计数',
    titleEn: 'Counting Bits',
    difficulty: 'easy',
    category: 'design',
    tags: ['位运算', '动态规划'],
    brief: 'O(n) 求出 0 到 n 每个数的二进制 1 的个数。',
    statement:
      '给你一个整数 n，对于 0 <= i <= n 中的每个 i，计算其二进制表示中 1 的个数，返回长度为 n + 1 的数组作为答案。进阶：能否用 O(n) 的一次遍历完成，不使用内置函数？\n\n示例：n = 5，输出 [0, 1, 1, 2, 1, 2]。',
    idea: [
      '递推性质一：i 的二进制是 i >> 1 左移一位，1 的个数与 i >> 1 相同，末位由 i & 1 决定，故 bits[i] = bits[i >> 1] + (i & 1)。',
      '递推性质二（Kernighan）：bits[i] = bits[i & (i - 1)] + 1，去掉最低位的 1 后查表。',
      '两个递推都只用更小的下标，一次线性扫描完成，是"以自身数组为记忆表"的迷你 DP。',
    ],
    code: `def countBits(n):
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        # i 右移一位的 1 的个数 + 最低位
        bits[i] = bits[i >> 1] + (i & 1)
    return bits`,
    time: 'O(n)',
    space: 'O(1)（输出数组不计）',
    related: ['010-AlgorithmAnalysisBasics', '160-DynamicProgramming'],
  },
  {
    slug: 'powx-n',
    lc: 50,
    title: 'Pow(x, n)',
    titleEn: 'Pow(x, n)',
    difficulty: 'medium',
    category: 'design',
    tags: ['快速幂', '分治', '递归'],
    brief: '实现 x 的 n 次幂（n 可为负），要求 O(log |n|)。',
    statement:
      '实现 pow(x, n)，即计算 x 的整数 n 次幂函数（x 为浮点数，n 为整数，n 可能为负数）。不允许直接调用库函数，时间复杂度要求 O(log |n|)。\n\n示例：x = 2.0，n = 10，输出 1024.0；x = 2.0，n = -2，输出 0.25。',
    idea: [
      '快速幂：n 为偶数时 x^n = (x * x)^(n/2)；n 为奇数时先分离出一个 x。指数每次减半，共 O(log n) 次乘法。',
      '负指数转化为正指数的倒数：x^(-n) = 1 / x^n，注意 n 取绝对值时可能溢出 int 下限（其他语言需转 long）。',
      '迭代写法从低位到高位拆 n 的二进制，遇 1 就把当前的平方底数乘进结果，免递归栈。',
    ],
    code: `def myPow(x, n):
    if n < 0:
        x = 1 / x
        n = -n
    # 迭代快速幂：按 n 的二进制位累乘
    ans = 1.0
    while n:
        if n & 1:
            ans *= x
        x *= x
        n >>= 1
    return ans`,
    time: 'O(log |n|)',
    space: 'O(1)',
    related: ['120-DivideAndConquer', '010-AlgorithmAnalysisBasics'],
  },
];
