import type { AlgoProblem } from './types';

export const BASIC_PROBLEMS: AlgoProblem[] = [
  {
    slug: 'remove-element',
    lc: 27,
    title: '移除元素',
    titleEn: 'Remove Element',
    difficulty: 'easy',
    category: 'array',
    tags: ['双指针', '原地操作'],
    brief: '原地删除数组中所有等于 val 的元素，返回新长度。',
    statement:
      '给你一个数组 nums 和一个值 val，你需要原地移除所有数值等于 val 的元素，并返回移除后数组的新长度。要求不使用额外的数组空间，元素的相对顺序可以改变。\n\n示例：nums = [3, 2, 2, 3]，val = 3，输出新长度 2，且前两个元素为 [2, 2]。',
    idea: [
      '原地删除的通用套路是「快慢双指针」：慢指针指向下一个合法元素的写入位置，快指针负责扫描。',
      '快指针读到的元素不等于 val 时，写入慢指针位置并右移慢指针；等于 val 时直接跳过。',
      '由于写入位置永远不超前于读取位置，后面的元素覆盖前面的元素是安全的。',
    ],
    code: `def removeElement(nums, val):
    # slow 指向下一个合法元素的写入位置
    slow = 0
    for x in nums:
        if x != val:
            nums[slow] = x
            slow += 1
    return slow`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['020-ArrayAndDynamicArray'],
  },
  {
    slug: 'remove-duplicates-from-sorted-array',
    lc: 26,
    title: '删除有序数组中的重复项',
    titleEn: 'Remove Duplicates from Sorted Array',
    difficulty: 'easy',
    category: 'array',
    tags: ['双指针', '原地操作'],
    brief: '原地删除有序数组的重复项，使每个元素只出现一次。',
    statement:
      '给你一个升序排列的数组 nums，请你原地删除重复出现的元素，使每个元素只出现一次，返回新长度。要求空间复杂度为 O(1)。\n\n示例：nums = [0, 0, 1, 1, 1, 2]，输出长度 3，前三个元素为 [0, 1, 2]。',
    idea: [
      '数组有序，所以重复元素一定相邻，这是本题能用快慢指针的前提。',
      '慢指针左侧始终是「已去重的前缀」；快指针遇到与前一保留元素不同的新值时，把它追加到慢指针处。',
      '第一个元素必然保留，因此慢指针从 1 开始。',
    ],
    code: `def removeDuplicates(nums):
    if not nums:
        return 0
    # slow 左侧区间为已去重前缀
    slow = 1
    for i in range(1, len(nums)):
        if nums[i] != nums[slow - 1]:
            nums[slow] = nums[i]
            slow += 1
    return slow`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['020-ArrayAndDynamicArray'],
  },
  {
    slug: 'merge-sorted-array',
    lc: 88,
    title: '合并两个有序数组',
    titleEn: 'Merge Sorted Array',
    difficulty: 'easy',
    category: 'array',
    tags: ['双指针', '从后往前填充'],
    brief: '把两个有序数组合并进 nums1 的剩余空间，保持有序。',
    statement:
      'nums1 与 nums2 均为非递减排列，nums1 的末尾预留了恰好容纳 nums2 的空间（用 0 占位）。请把 nums2 合并进 nums1，使合并后的数组仍然有序，要求原地完成。\n\n示例：nums1 = [1, 2, 3, 0, 0, 0]，nums2 = [2, 5, 6]，合并后 nums1 = [1, 2, 2, 3, 5, 6]。',
    idea: [
      '正向合并会把 nums1 未处理的元素覆盖掉，而nums1 的尾部是空位——所以从后往前填。',
      '用三个指针分别指向 nums1 有效部分的末尾、nums2 的末尾、以及整个数组的写入末尾。',
      '每一步把两指针所指中较大的数放进写入位，哪个用完就把剩余部分整体搬入。',
      'nums2 先耗尽时 nums1 前缀本来就在正确位置，无需额外处理。',
    ],
    code: `def merge(nums1, m, nums2, n):
    # 从后往前填充，避免覆盖 nums1 未处理元素
    i, j, k = m - 1, n - 1, m + n - 1
    while j >= 0:
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[k] = nums1[i]
            i -= 1
        else:
            nums1[k] = nums2[j]
            j -= 1
        k -= 1`,
    time: 'O(m + n)',
    space: 'O(1)',
    related: ['020-ArrayAndDynamicArray', '030-SortAlgorithm'],
  },
  {
    slug: 'rotate-array',
    lc: 189,
    title: '轮转数组',
    titleEn: 'Rotate Array',
    difficulty: 'medium',
    category: 'array',
    tags: ['数组翻转', '数学'],
    brief: '将数组向右轮转 k 个位置，要求 O(1) 额外空间。',
    statement:
      '给定一个整数数组，将数组中的元素向右轮转 k 个位置，其中 k 是非负数。要求使用空间复杂度 O(1) 的原地算法。\n\n示例：nums = [1, 2, 3, 4, 5, 6, 7]，k = 3，输出 [5, 6, 7, 1, 2, 3, 4]。',
    idea: [
      '观察结果结构：右旋 k 位后，数组由「后 k 个元素 + 前 n-k 个元素」拼接而成。',
      '三次翻转技巧：先整体翻转，再分别翻转前 k 个与后 n-k 个元素，即得结果。',
      '注意 k 可能大于数组长度，实际位移为 k mod n。',
      '三次翻转共移动每个元素常数次，比循环移位的 O(n·k) 高效得多。',
    ],
    code: `def rotate(nums, k):
    def reverse(l, r):
        # 双指针原地翻转闭区间 [l, r]
        while l < r:
            nums[l], nums[r] = nums[r], nums[l]
            l += 1
            r -= 1

    n = len(nums)
    k %= n
    reverse(0, n - 1)
    reverse(0, k - 1)
    reverse(k, n - 1)`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['020-ArrayAndDynamicArray'],
  },
  {
    slug: 'majority-element',
    lc: 169,
    title: '多数元素',
    titleEn: 'Majority Element',
    difficulty: 'easy',
    category: 'array',
    tags: ['Boyer-Moore 投票', '计数'],
    brief: '找出数组中出现次数超过一半的元素。',
    statement:
      '给定一个大小为 n 的数组，其中多数元素指出现次数大于 n/2 的元素。你可以假设数组非空且多数元素一定存在，请找出它。进阶：尝试空间复杂度 O(1)、时间复杂度 O(n) 的解法。\n\n示例：nums = [2, 2, 1, 1, 1, 2, 2]，输出 2。',
    idea: [
      '哈希计数是平凡解法，但要 O(n) 空间；题目保证多数元素过半，可用 Boyer-Moore 投票法做到 O(1) 空间。',
      '维护候选数 candidate 与票数 count：遇到相同元素票数加一，不同则减一，减到零就换当前元素当候选。',
      '正确性直观理解：多数元素与其他所有元素"捉对抵消"后仍有剩余，因此最终候选一定是它。',
    ],
    code: `def majorityElement(nums):
    # Boyer-Moore 投票：不同元素互相抵消，多数元素必有剩余
    candidate, count = 0, 0
    for x in nums:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
    return candidate`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['020-ArrayAndDynamicArray'],
  },
  {
    slug: 'container-with-most-water',
    lc: 11,
    title: '盛最多水的容器',
    titleEn: 'Container With Most Water',
    difficulty: 'medium',
    category: 'array',
    tags: ['双指针', '贪心收缩'],
    brief: '两条竖线与 x 轴围成的容器，求能容纳的最大水量。',
    statement:
      '给定一个长度为 n 的整数数组 height，第 i 条竖线两端位于 (i, 0) 与 (i, height[i])。任选两条竖线与 x 轴构成容器，水量 = 两线间距 × 较短线的高度，求最大水量。\n\n示例：height = [1, 8, 6, 2, 5, 4, 8, 3, 7]，选第 2 与第 9 条线，输出 49。',
    idea: [
      '暴力枚举两条线是 O(n^2)；双指针从两端开始，每步只移动较短的板。',
      '缩小区间必然使宽度变小，若移动较长的板，高度上限不变或更小，水量只会更差——可以安全排除。',
      '因此每次淘汰短板是"不丢最优解"的收缩，左右指针相遇前记录的面积最大值即为答案。',
    ],
    code: `def maxArea(height):
    # 双指针向内收缩，每次移动较短的一侧
    l, r, best = 0, len(height) - 1, 0
    while l < r:
        best = max(best, (r - l) * min(height[l], height[r]))
        if height[l] < height[r]:
            l += 1
        else:
            r -= 1
    return best`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['020-ArrayAndDynamicArray'],
  },
  {
    slug: '3sum',
    lc: 15,
    title: '三数之和',
    titleEn: '3Sum',
    difficulty: 'medium',
    category: 'array',
    tags: ['排序', '双指针', '去重'],
    brief: '找出数组中所有和为 0 且不重复的三元组。',
    statement:
      '给你一个整数数组 nums，判断是否存在三元组 [a, b, c] 满足 a + b + c = 0，请返回所有不重复的三元组。\n\n示例：nums = [-1, 0, 1, 2, -1, -4]，输出 [[-1, -1, 2], [-1, 0, 1]]。',
    idea: [
      '先排序是关键预处理：排序后可以用双指针扫配对，也便于跳过重复元素。',
      '固定最小数 nums[i]，在右侧区间用左右双指针找和为 -nums[i] 的两个数：和偏小移左指针，偏大移右指针。',
      '去重三处：i 跳过与前一个相同的值；找到一组解后，左指针跳过重复值、右指针跳过重复值。',
      '排序后若 nums[i] > 0 可直接终止——三个正数之和不可能为零。',
    ],
    code: `def threeSum(nums):
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if nums[i] > 0:
            break
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]])
                # 跳过重复的左右元素
                while l < r and nums[l] == nums[l + 1]:
                    l += 1
                while l < r and nums[r] == nums[r - 1]:
                    r -= 1
                l += 1
                r -= 1
    return res`,
    time: 'O(n^2)',
    space: 'O(log n)',
    related: ['020-ArrayAndDynamicArray', '030-SortAlgorithm'],
  },
  {
    slug: 'trapping-rain-water',
    lc: 42,
    title: '接雨水',
    titleEn: 'Trapping Rain Water',
    difficulty: 'hard',
    category: 'array',
    tags: ['双指针', '单调栈', '动态规划'],
    brief: '给定柱子高度，计算下雨后能接多少水。',
    statement:
      '给定 n 个非负整数表示宽度为 1 的柱子高度图，计算按此排列的柱子，下雨之后能接多少雨水。\n\n示例：height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]，输出 6。',
    idea: [
      '按列思考：位置 i 能接的水 = min(左侧最高柱, 右侧最高柱) - height[i]，与 0 取 max。',
      '预处理前后缀最大值数组即可 O(n) 计算；再用双指针优化空间：哪一侧最大值更小，就先结算那一侧的列。',
      '因为较小的一侧已经确定了该列水位的"瓶颈"，另一侧再高也不影响。',
      '另有单调栈解法：栈内维护递减柱子，遇到更高柱时逐层弹出按"横向水层"累加，两种思路都值得掌握。',
    ],
    code: `def trap(height):
    # 双指针：结算较小侧的列，left_max/right_max 为已扫过的最大高度
    l, r = 0, len(height) - 1
    left_max = right_max = water = 0
    while l < r:
        left_max = max(left_max, height[l])
        right_max = max(right_max, height[r])
        if left_max < right_max:
            water += left_max - height[l]
            l += 1
        else:
            water += right_max - height[r]
            r -= 1
    return water`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['020-ArrayAndDynamicArray', '040-StackAndQueue'],
  },

  {
    slug: 'minimum-size-subarray-sum',
    lc: 209,
    title: '长度最小的子数组',
    titleEn: 'Minimum Size Subarray Sum',
    difficulty: 'medium',
    category: 'window',
    tags: ['滑动窗口', '前缀和'],
    brief: '找和大于等于 target 的最短连续子数组长度。',
    statement:
      '给定一个含有 n 个正整数的数组和一个正整数 target，找出该数组中满足「和 ≥ target」的长度最小的连续子数组，并返回其长度；不存在则返回 0。\n\n示例：target = 7，nums = [2, 3, 1, 2, 4, 3]，子数组 [4, 3] 最短，输出 2。',
    idea: [
      '元素全为正数，窗口和具有单调性：右扩必增、左缩必减，滑动窗口适用。',
      '右指针不断扩张累加；当窗口和 ≥ target 时，尽量收缩左指针，用最短窗口长度更新答案。',
      '每个元素最多进出窗口各一次，总时间 O(n)。',
      '若数组含负数则单调性破坏，需改用前缀和 + 单调队列或二分，注意适用条件。',
    ],
    code: `def minSubArrayLen(target, nums):
    # 窗口和 >= target 时收缩左端，取最短长度
    l = 0
    total = 0
    best = len(nums) + 1
    for r, x in enumerate(nums):
        total += x
        while total >= target:
            best = min(best, r - l + 1)
            total -= nums[l]
            l += 1
    return 0 if best > len(nums) else best`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['020-ArrayAndDynamicArray'],
  },
  {
    slug: 'longest-substring-without-repeating-characters',
    lc: 3,
    title: '无重复字符的最长子串',
    titleEn: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    category: 'window',
    tags: ['滑动窗口', '哈希表'],
    brief: '求不含重复字符的最长子串的长度。',
    statement:
      '给定一个字符串 s，请你找出其中不含有重复字符的最长子串的长度。\n\n示例：s = "abcabcbb"，最长子串是 "abc"，输出 3；s = "bbbbb"，输出 1。',
    idea: [
      '维护窗口 [l, r] 内字符均不重复：右移 r 时若字符已在窗口内，则移动 l 直到去掉旧的那个字符。',
      '用哈希表记录每个字符最近出现的下标，可直接把 l 跳到「重复位置 + 1」，省去逐步收缩。',
      '注意 l 只能前进不能后退，所以要与当前 l 取 max，防止窗口左界回跳。',
      '每步更新答案为当前窗口长度 r - l + 1 的最大值。',
    ],
    code: `def lengthOfLongestSubstring(s):
    # last 记录字符最近下标，l 为窗口左界
    last = {}
    l = best = 0
    for r, ch in enumerate(s):
        if ch in last and last[ch] >= l:
            l = last[ch] + 1
        last[ch] = r
        best = max(best, r - l + 1)
    return best`,
    time: 'O(n)',
    space: 'O(|Σ|)',
    related: ['150-StringAlgorithms', '070-HashTable'],
  },
  {
    slug: 'minimum-window-substring',
    lc: 76,
    title: '最小覆盖子串',
    titleEn: 'Minimum Window Substring',
    difficulty: 'hard',
    category: 'window',
    tags: ['滑动窗口', '计数'],
    brief: '在 s 中找出包含 t 所有字符的最小子串。',
    statement:
      '给你字符串 s 和 t，返回 s 中涵盖 t 所有字符（含重复次数）的最小子串；不存在则返回空串。数据保证答案唯一。\n\n示例：s = "ADOBECODEBANC"，t = "ABC"，输出 "BANC"。',
    idea: [
      '不定长窗口模板题：右指针扩张到窗口满足要求，再尽量收缩左指针，反复记录最短可行窗口。',
      '用两个计数器：need 记录 t 的字符需求，window 记录当前窗口内相关字符数。',
      '引入满足变量 formed：每当某字符数量首次达标 formed 加一，收缩时首次跌破则减一，避免每次全表比较。',
      '收缩到刚好不满足为止，期间的最小窗口即答案，整体 O(|s| + |t|)。',
    ],
    code: `from collections import Counter

def minWindow(s, t):
    need = Counter(t)
    window = {}
    formed = l = 0
    best_len, best_l = len(s) + 1, 0
    for r, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1
        if ch in need and window[ch] == need[ch]:
            formed += 1
        # 满足全部需求时收缩左端
        while formed == len(need):
            if r - l + 1 < best_len:
                best_len, best_l = r - l + 1, l
            left = s[l]
            window[left] -= 1
            if left in need and window[left] < need[left]:
                formed -= 1
            l += 1
    return '' if best_len > len(s) else s[best_l:best_l + best_len]`,
    time: 'O(|s| + |t|)',
    space: 'O(|Σ|)',
    related: ['150-StringAlgorithms'],
  },
  {
    slug: 'find-all-anagrams-in-a-string',
    lc: 438,
    title: '找到字符串中所有字母异位词',
    titleEn: 'Find All Anagrams in a String',
    difficulty: 'medium',
    category: 'window',
    tags: ['滑动窗口', '定长窗口'],
    brief: '找出 s 中所有 p 的异位词子串的起始下标。',
    statement:
      '给定两个字符串 s 和 p，找到 s 中所有 p 的异位词（字母相同、顺序可不同）子串，返回这些子串的起始索引。\n\n示例：s = "cbaebabacd"，p = "abc"，输出 [0, 6]，对应子串 "cba" 与 "bac"。',
    idea: [
      '异位词长度固定为 len(p)，是典型的定长滑动窗口：窗口每次右移一格，进一个字符出一个字符。',
      '维护窗口内字母计数与 p 的计数，比较是否相等；用「差值计数」或 matched 变量避免每步 O(26) 全比较。',
      '窗口长度未达到 len(p) 前只进不出，达到后每步先出后进（或先判再出），保持定长。',
    ],
    code: `from collections import Counter

def findAnagrams(s, p):
    need = Counter(p)
    window = Counter()
    res = []
    k = len(p)
    for i, ch in enumerate(s):
        window[ch] += 1
        if i >= k:
            left = s[i - k]
            window[left] -= 1
            if window[left] == 0:
                del window[left]
        # 定长窗口计数与目标一致即为异位词
        if i >= k - 1 and window == need:
            res.append(i - k + 1)
    return res`,
    time: 'O(n)',
    space: 'O(|Σ|)',
    related: ['150-StringAlgorithms'],
  },
  {
    slug: 'subarray-sum-equals-k',
    lc: 560,
    title: '和为 K 的子数组',
    titleEn: 'Subarray Sum Equals K',
    difficulty: 'medium',
    category: 'window',
    tags: ['前缀和', '哈希表'],
    brief: '统计数组中和恰好为 k 的连续子数组个数。',
    statement:
      '给你一个整数数组 nums 和一个整数 k，请统计并返回该数组中「和恰好为 k」的连续子数组的个数（数组可能含负数）。\n\n示例：nums = [1, 1, 1]，k = 2，输出 2；nums = [1, 2, 3]，k = 3，输出 2（[1,2] 与 [3]）。',
    idea: [
      '含负数时窗口单调性失效，滑动窗口不可用；转用前缀和：区间 [i, j] 的和 = prefix[j] - prefix[i-1]。',
      '要统计和为 k 的区间数，等价于对每个 j 统计有多少个前缀值等于 prefix[j] - k。',
      '用哈希表统计每个前缀和出现的次数，边扫边查、边存，一遍完成。',
      '初始时前缀和 0 出现一次（空前缀），保证从下标 0 开始的区间被正确统计。',
    ],
    code: `def subarraySum(nums, k):
    # count 存每个前缀和出现次数；0 出现一次代表空前缀
    count = {0: 1}
    prefix = ans = 0
    for x in nums:
        prefix += x
        ans += count.get(prefix - k, 0)
        count[prefix] = count.get(prefix, 0) + 1
    return ans`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['020-ArrayAndDynamicArray', '070-HashTable'],
  },
  {
    slug: 'sliding-window-maximum',
    lc: 239,
    title: '滑动窗口最大值',
    titleEn: 'Sliding Window Maximum',
    difficulty: 'hard',
    category: 'window',
    tags: ['单调队列', '双端队列'],
    brief: '返回每个长度为 k 的滑动窗口中的最大值。',
    statement:
      '给你一个整数数组 nums 和滑动窗口大小 k，窗口从数组最左侧滑到最右侧，返回每个窗口中的最大值组成的数组。\n\n示例：nums = [1, 3, -1, -3, 5, 3, 6, 7]，k = 3，输出 [3, 3, 5, 5, 6, 7]。',
    idea: [
      '暴力每窗取最大是 O(n·k)；维护一个「值单调递减」的双端队列可把均摊代价降到 O(1)。',
      '队列存下标，对应值从头到尾递减，队头永远是当前窗口最大值。',
      '新元素入队前，把队尾所有比它小的元素弹出——它们不可能再成为之后任何窗口的最大值。',
      '队头下标滑出窗口范围（<= i - k）时从头部弹出；窗口形成后（i >= k-1）每步记录队头值。',
    ],
    code: `from collections import deque

def maxSlidingWindow(nums, k):
    dq = deque()  # 存下标，对应值单调递减
    res = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res`,
    time: 'O(n)',
    space: 'O(k)',
    related: ['040-StackAndQueue'],
  },

  {
    slug: 'binary-search',
    lc: 704,
    title: '二分查找',
    titleEn: 'Binary Search',
    difficulty: 'easy',
    category: 'binary-search',
    tags: ['二分', '基础'],
    brief: '在升序数组中查找目标值的下标。',
    statement:
      '给定一个 n 个元素升序排列的整数数组 nums 和一个目标值 target，写一个函数搜索 nums 中的 target，存在则返回下标，否则返回 -1。\n\n示例：nums = [-1, 0, 3, 5, 9, 12]，target = 9，输出 4。',
    idea: [
      '二分的骨架：在闭区间 [l, r] 内，取中点与目标比较，每次淘汰一半。',
      ' nums[mid] < target 说明答案只可能在右半段，l = mid + 1；反之 r = mid - 1。',
      '循环条件 l <= r 对应闭区间语义；区间语义（闭/左闭右开）一旦选定，边界增减必须成套，这是二分出 bug 的主要来源。',
      '中点用 l + (r - l) // 2 计算可避免大数相加溢出（其他语言中尤其重要）。',
    ],
    code: `def search(nums, target):
    # 闭区间 [l, r] 标准二分
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = l + (r - l) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            l = mid + 1
        else:
            r = mid - 1
    return -1`,
    time: 'O(log n)',
    space: 'O(1)',
    related: ['170-BinarySearchAlgorithms'],
  },
  {
    slug: 'find-first-and-last-position-of-element-in-sorted-array',
    lc: 34,
    title: '在排序数组中查找元素的第一个和最后一个位置',
    titleEn: 'Find First and Last Position of Element in Sorted Array',
    difficulty: 'medium',
    category: 'binary-search',
    tags: ['二分', '边界查找'],
    brief: '在非递减数组中找出目标值的开始与结束位置。',
    statement:
      '给你一个按非递减顺序排列的整数数组 nums 和一个目标值 target，请找出目标值在数组中的开始位置和结束位置；不存在则返回 [-1, -1]。要求时间复杂度 O(log n)。\n\n示例：nums = [5, 7, 7, 8, 8, 10]，target = 8，输出 [3, 4]。',
    idea: [
      '普通二分命中即返回，无法确定边界；改写为「找左边界」与「找右边界」两次独立二分。',
      '找左边界：nums[mid] >= target 时 r = mid - 1 并记录 mid，否则 l = mid + 1，最终得到第一个 >= target 的位置。',
      '找右边界同理，条件 nums[mid] <= target 时继续向右收缩。',
      '也可以用统一写法 lowerBound(target) 与 lowerBound(target + 1) - 1，思路是把边界查找归约为"第一个大于等于 x 的位置"。',
    ],
    code: `def searchRange(nums, target):
    def lowerBound(x):
        # 第一个 >= x 的下标
        l, r, ans = 0, len(nums) - 1, len(nums)
        while l <= r:
            mid = l + (r - l) // 2
            if nums[mid] >= x:
                ans, r = mid, mid - 1
            else:
                l = mid + 1
        return ans

    lo = lowerBound(target)
    hi = lowerBound(target + 1) - 1
    if lo <= hi:
        return [lo, hi]
    return [-1, -1]`,
    time: 'O(log n)',
    space: 'O(1)',
    related: ['170-BinarySearchAlgorithms'],
  },
  {
    slug: 'search-in-rotated-sorted-array',
    lc: 33,
    title: '搜索旋转排序数组',
    titleEn: 'Search in Rotated Sorted Array',
    difficulty: 'medium',
    category: 'binary-search',
    tags: ['二分', '分段有序'],
    brief: '在旋转过的升序数组中查找目标值。',
    statement:
      '升序数组在某个未知下标处发生旋转（如 [0,1,2,4,5,6,7] 旋转后变为 [4,5,6,7,0,1,2]），在数组中搜索 target，返回下标或 -1。要求 O(log n)。\n\n示例：nums = [4, 5, 6, 7, 0, 1, 2]，target = 0，输出 4。',
    idea: [
      '旋转数组的关键性质：从中点切开，左右两半至少有一半是完全有序的。',
      '判断 nums[l] <= nums[mid] 即可确定左半是否有序，再判断 target 是否落在该有序区间内。',
      '若 target 在有序半段内则收缩到那一半，否则去另一半；每步仍淘汰一半，保持 O(log n)。',
      '注意 l == mid 的退化情况（区间仅剩一两个元素），用 <= 保证判断正确。',
    ],
    code: `def search(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = l + (r - l) // 2
        if nums[mid] == target:
            return mid
        if nums[l] <= nums[mid]:
            # 左半段有序
            if nums[l] <= target < nums[mid]:
                r = mid - 1
            else:
                l = mid + 1
        else:
            # 右半段有序
            if nums[mid] < target <= nums[r]:
                l = mid + 1
            else:
                r = mid - 1
    return -1`,
    time: 'O(log n)',
    space: 'O(1)',
    related: ['170-BinarySearchAlgorithms'],
  },
  {
    slug: 'find-minimum-in-rotated-sorted-array',
    lc: 153,
    title: '寻找旋转排序数组中的最小值',
    titleEn: 'Find Minimum in Rotated Sorted Array',
    difficulty: 'medium',
    category: 'binary-search',
    tags: ['二分', '分段有序'],
    brief: '找出旋转后升序数组中的最小元素。',
    statement:
      '已知一个长度为 n 的数组原本按升序排序，经 1 到 n 次旋转后得到输入数组，请找出其中的最小元素。要求 O(log n)。\n\n示例：nums = [3, 4, 5, 1, 2]，输出 1。',
    idea: [
      '最小值是「第二段升序」的开头；与右端点 nums[r] 比较是这类题的关键技巧。',
      'nums[mid] > nums[r]：最小值一定在 mid 右侧，l = mid + 1。',
      'nums[mid] < nums[r]：mid 到 r 之间是有序的，最小值在 mid 及其左侧，r = mid。',
      '循环以 l < r 为条件，结束时 l == r 即最小值下标；与找目标值不同，这里不需要命中判断。',
    ],
    code: `def findMin(nums):
    # 与右端点比较，收缩包含最小值的区间
    l, r = 0, len(nums) - 1
    while l < r:
        mid = l + (r - l) // 2
        if nums[mid] > nums[r]:
            l = mid + 1
        else:
            r = mid
    return nums[l]`,
    time: 'O(log n)',
    space: 'O(1)',
    related: ['170-BinarySearchAlgorithms'],
  },
  {
    slug: 'find-peak-element',
    lc: 162,
    title: '寻找峰值',
    titleEn: 'Find Peak Element',
    difficulty: 'medium',
    category: 'binary-search',
    tags: ['二分', '边界虚拟值'],
    brief: '找出数组中的峰值元素（大于相邻元素）下标。',
    statement:
      '峰值元素是严格大于左右相邻值的元素。给定数组 nums（相邻元素不等），nums[-1] 与 nums[n] 视为负无穷，返回任意一个峰值的下标。要求 O(log n)。\n\n示例：nums = [1, 2, 3, 1]，输出 2。',
    idea: [
      '峰值一定存在：整体最大值必然是峰值。比较中点与右邻 nums[mid] 与 nums[mid + 1]。',
      '若 nums[mid] < nums[mid + 1]，说明处于"上坡"，右半区间内必有峰值（上坡尽头或到边界前必转折）。',
      '反之处于"下坡或峰顶"，左半区间（含 mid）必有峰值。',
      '每次安全淘汰一半，看似无序的数组因此可以二分——核心是"爬坡方向必有峰"这一存在性论证。',
    ],
    code: `def findPeakElement(nums):
    l, r = 0, len(nums) - 1
    while l < r:
        mid = l + (r - l) // 2
        if nums[mid] < nums[mid + 1]:
            l = mid + 1  # 上坡，峰在右侧
        else:
            r = mid      # 下坡/峰顶，峰在左侧含 mid
    return l`,
    time: 'O(log n)',
    space: 'O(1)',
    related: ['170-BinarySearchAlgorithms'],
  },
  {
    slug: 'median-of-two-sorted-arrays',
    lc: 4,
    title: '寻找两个正序数组的中位数',
    titleEn: 'Median of Two Sorted Arrays',
    difficulty: 'hard',
    category: 'binary-search',
    tags: ['二分', '分割线', '归并'],
    brief: 'O(log(m+n)) 求两个有序数组合并后的中位数。',
    statement:
      '给定两个大小分别为 m 和 n 的正序（从小到大）数组 nums1 和 nums2，请你找出并返回这两个正序数组的「中位数」。要求算法的时间复杂度为 O(log(m + n))。\n\n示例：nums1 = [1, 3]，nums2 = [2]，输出 2.0；nums1 = [1, 2]，nums2 = [3, 4]，输出 2.5。',
    idea: [
      '中位数本质是把全部元素分成数量相等（或多一）的两组，且左组最大值 <= 右组最小值。',
      '在较短数组上枚举分割线 i（取 0..m），较长数组的分割线 j 由总数约束 j = (m + n + 1) // 2 - i 直接确定。',
      '合法性只需检查边界：nums1[i-1] <= nums2[j] 且 nums2[j-1] <= nums1[i]，不满足时二分调整 i。',
      '总数为奇数时中位数是左组最大值；偶数时取左组最大与右组最小的平均。对 i=0 或 i=m 等边界用正无穷哨兵处理。',
    ],
    code: `def findMedianSortedArrays(nums1, nums2):
    # 始终在较短数组上二分分割线
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    half = (m + n + 1) // 2
    lo, hi = 0, m
    while lo <= hi:
        i = (lo + hi) // 2
        j = half - i
        # 边界哨兵：分割线外侧视为正/负无穷
        l1 = nums1[i - 1] if i > 0 else float('-inf')
        r1 = nums1[i] if i < m else float('inf')
        l2 = nums2[j - 1] if j > 0 else float('-inf')
        r2 = nums2[j] if j < n else float('inf')
        if l1 <= r2 and l2 <= r1:
            if (m + n) % 2:
                return max(l1, l2)
            return (max(l1, l2) + min(r1, r2)) / 2
        if l1 > r2:
            hi = i - 1
        else:
            lo = i + 1
    raise ValueError('输入不是有序数组')`,
    time: 'O(log(min(m, n)))',
    space: 'O(1)',
    related: ['170-BinarySearchAlgorithms', '010-AlgorithmAnalysisBasics'],
  },

  {
    slug: 'two-sum',
    lc: 1,
    title: '两数之和',
    titleEn: 'Two Sum',
    difficulty: 'easy',
    category: 'hash',
    tags: ['哈希表', '一次遍历'],
    brief: '在数组中找出和为目标值的两个数的下标。',
    statement:
      '给定一个整数数组 nums 和目标值 target，请找出数组中和等于 target 的两个整数，返回它们的下标。\n\n示例：nums = [2, 7, 11, 15]，target = 9，因为 2 + 7 = 9，返回 [0, 1]。\n\n数据范围：每个输入恰好有唯一解，同一元素不能重复使用。',
    idea: [
      '最直观的做法是枚举所有两两组合，时间复杂度 O(n^2)，在数据量大时会超时。',
      '优化的关键在于换一个问法：遍历到 x 时，不再向前找配对，而是问"target - x 之前出现过吗"。',
      '用哈希表记录「数值 -> 下标」，每次先查补数是否存在，再把当前数存入表内，一趟遍历即可完成。',
      '先查后存的顺序天然避免了自己与自己配对的问题。',
    ],
    code: `def twoSum(nums, target):
    # seen 记录「数值 -> 下标」，一次遍历查补数
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['070-HashTable', '020-ArrayAndDynamicArray'],
  },
  {
    slug: 'group-anagrams',
    lc: 49,
    title: '字母异位词分组',
    titleEn: 'Group Anagrams',
    difficulty: 'medium',
    category: 'hash',
    tags: ['哈希表', '排序键'],
    brief: '把字母异位词组合在一起分组返回。',
    statement:
      '给你一个字符串数组，请你将「字母异位词」组合在一起（字母相同、排列不同的词），返回分组结果。\n\n示例：输入 ["eat", "tea", "tan", "ate", "nat", "bat"]，输出 [["eat","tea","ate"],["tan","nat"],["bat"]]。',
    idea: [
      '分组问题要有「组键」：同一组内所有元素映射到同一个键。',
      '键的两种取法：把字符串排序后的结果（如 eat/tea/ate 都变成 aet）；或 26 位字母计数向量转元组。',
      '用哈希表「键 -> 分组列表」聚合，最后输出全部值；计数键对长字符串更优（免排序）。',
    ],
    code: `from collections import defaultdict

def groupAnagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        # 排序结果作为异位词的统一组键
        key = ''.join(sorted(s))
        groups[key].append(s)
    return list(groups.values())`,
    time: 'O(n · k log k)',
    space: 'O(n · k)',
    related: ['070-HashTable', '150-StringAlgorithms'],
  },
  {
    slug: 'longest-consecutive-sequence',
    lc: 128,
    title: '最长连续序列',
    titleEn: 'Longest Consecutive Sequence',
    difficulty: 'medium',
    category: 'hash',
    tags: ['哈希表', '序列起点'],
    brief: 'O(n) 求未排序数组中最长连续数字序列的长度。',
    statement:
      '给定一个未排序的整数数组 nums，找出数字连续的最长序列（如 1, 2, 3, 4）的长度。不要求序列元素在原数组中连续。请设计 O(n) 的算法。\n\n示例：nums = [100, 4, 200, 1, 3, 2]，最长连续序列为 [1, 2, 3, 4]，输出 4。',
    idea: [
      '排序后扫描是 O(n log n)，达不到要求；用哈希集合把"查某个数在不在"降到 O(1)。',
      '关键去重技巧：只有当 x - 1 不在集合中时，x 才是某条连续序列的起点，只从起点向后数。',
      '这样每条序列只被完整遍历一次，所有元素总访问次数仍是 O(n)，避免了重复计数导致的 O(n^2)。',
    ],
    code: `def longestConsecutive(nums):
    num_set = set(nums)
    best = 0
    for x in num_set:
        # 只从序列起点向后统计
        if x - 1 in num_set:
            continue
        cur = 1
        while x + cur in num_set:
            cur += 1
        best = max(best, cur)
    return best`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['070-HashTable'],
  },
  {
    slug: 'first-missing-positive',
    lc: 41,
    title: '缺失的第一个正数',
    titleEn: 'First Missing Positive',
    difficulty: 'hard',
    category: 'hash',
    tags: ['原地哈希', '置换'],
    brief: 'O(n) 时间 O(1) 空间找出未排序数组中缺失的最小正整数。',
    statement:
      '给你一个未排序的整数数组 nums，请你找出其中没有出现的最小的正整数。要求时间 O(n) 且只使用常数级别的额外空间。\n\n示例：nums = [3, 4, -1, 1]，输出 2；nums = [7, 8, 9, 11, 12]，输出 1。',
    idea: [
      '答案一定落在 [1, n + 1] 内（n 为数组长度）：最理想的情况是数组恰好装着 1..n。',
      '把数组本身当哈希表：让数值 v 回到下标 v - 1（置换 nums[i] = v），用 while 循环不断把当前值换到它该去的位置。',
      '注意跳过越界值与重复值，否则死循环；置换完成后第一个 nums[i] != i + 1 的位置即答案。',
      '每个值最多被换一次到位，总交换次数 O(n)，满足时间要求。',
    ],
    code: `def firstMissingPositive(nums):
    n = len(nums)
    # 原地置换：让数值 v 回到下标 v-1
    for i in range(n):
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            j = nums[i] - 1
            nums[i], nums[j] = nums[j], nums[i]
    for i in range(n):
        if nums[i] != i + 1:
            return i + 1
    return n + 1`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['070-HashTable', '020-ArrayAndDynamicArray'],
  },
  {
    slug: 'insert-delete-getrandom-o1',
    lc: 380,
    title: 'O(1) 时间插入、删除和获取随机元素',
    titleEn: 'Insert Delete GetRandom O(1)',
    difficulty: 'medium',
    category: 'hash',
    tags: ['哈希表', '数组', '设计'],
    brief: '设计支持均摊 O(1) 插入、删除与等概率随机获取的数据结构。',
    statement:
      '实现 RandomizedSet 类：insert(val) 不存在时插入并返回 true；remove(val) 存在时删除并返回 true；getRandom() 等概率返回现有元素之一。三个方法平均时间复杂度都要求 O(1)。\n\n示例：依次 insert(1)、remove(2)、insert(2)、getRandom() 从 {1, 2} 等概率返回。',
    idea: [
      '单用哈希表无法等概率随机取值，单用数组无法 O(1) 删除——两者结合：数组存元素，哈希表存「值 -> 数组下标」。',
      '随机取值直接对数组下标抽样，O(1)。',
      '删除的技巧是把待删元素与数组末尾交换后 pop：先改哈希表映射，再改数组，保持两者一致。',
    ],
    code: `import random

class RandomizedSet:
    def __init__(self):
        self.items = []      # 值的动态数组
        self.pos = {}        # 值 -> 数组下标

    def insert(self, val):
        if val in self.pos:
            return False
        self.pos[val] = len(self.items)
        self.items.append(val)
        return True

    def remove(self, val):
        if val not in self.pos:
            return False
        # 末尾元素补到被删位置再弹出，保持 O(1)
        i = self.pos.pop(val)
        last = self.items.pop()
        if i < len(self.items):
            self.items[i] = last
            self.pos[last] = i
        return True

    def getRandom(self):
        return random.choice(self.items)`,
    time: 'O(1) 均摊',
    space: 'O(n)',
    related: ['070-HashTable', '020-ArrayAndDynamicArray'],
  },
];
