import type { AlgoProblem } from './types';

/**
 * 算法题图鉴 · 线性结构篇
 * 链表 / 栈与队列（单调栈）/ 字符串
 * 题面为便于学习的概括复述，参考实现为 Python。
 */
export const LINEAR_PROBLEMS: AlgoProblem[] = [
  // ==================== 链表 ====================
  {
    slug: 'reverse-linked-list',
    lc: 206,
    title: '反转链表',
    titleEn: 'Reverse Linked List',
    difficulty: 'easy',
    category: 'linked-list',
    tags: ['链表', '迭代', '递归'],
    brief: '反转单链表并返回新头节点。',
    statement:
      '给你单链表的头节点 head，请你反转链表，并返回反转后的链表。\n\n示例：1 -> 2 -> 3 -> 4 -> 5 反转后为 5 -> 4 -> 3 -> 2 -> 1。',
    idea: [
      '迭代版用三个指针：prev（已反转部分的头）、curr（待处理节点）、next（暂存后继）。',
      '每步先把 next 存下来，再让 curr 指回 prev，然后三个指针整体右移一格。',
      '循环结束时 curr 为空，prev 即新头节点；全程只改指针域，空间 O(1)。',
      '递归版先递归到尾部，回溯时让 head 的下一个节点指回 head，注意要把 head.next 置空防止成环。',
    ],
    code: `def reverseList(head):
    # 迭代：逐个把节点头插到 prev 链上
    prev = None
    while head:
        nxt = head.next
        head.next = prev
        prev = head
        head = nxt
    return prev`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['060-LinkedList'],
  },
  {
    slug: 'merge-two-sorted-lists',
    lc: 21,
    title: '合并两个有序链表',
    titleEn: 'Merge Two Sorted Lists',
    difficulty: 'easy',
    category: 'linked-list',
    tags: ['链表', '双指针'],
    brief: '将两个升序链表合并为一个升序链表。',
    statement:
      '将两个升序链表合并为一个新的升序链表并返回，新链表由拼接给定的两个链表的所有节点组成。\n\n示例：1 -> 2 -> 4 与 1 -> 3 -> 4 合并得 1 -> 1 -> 2 -> 3 -> 4 -> 4。',
    idea: [
      '与归并排序的合并步骤同构：每次比较两链表头节点，摘下较小者接到结果尾部。',
      '引入哑节点（dummy）统一"第一个节点"的接法，免去对头节点的特判，最后返回 dummy.next。',
      '一条链耗尽后，另一条剩余部分天然有序且都大于已接结果，直接整体接上即可。',
    ],
    code: `def mergeTwoLists(l1, l2):
    # 哑节点简化头部接法
    dummy = tail = ListNode(0)
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next = l1
            l1 = l1.next
        else:
            tail.next = l2
            l2 = l2.next
        tail = tail.next
    tail.next = l1 if l1 else l2
    return dummy.next`,
    time: 'O(m + n)',
    space: 'O(1)',
    related: ['060-LinkedList', '030-SortAlgorithm'],
  },
  {
    slug: 'linked-list-cycle',
    lc: 141,
    title: '环形链表',
    titleEn: 'Linked List Cycle',
    difficulty: 'easy',
    category: 'linked-list',
    tags: ['快慢指针', 'Floyd 判圈'],
    brief: '判断链表中是否存在环。',
    statement:
      '给你一个链表的头节点 head，判断链表中是否有环。链表中某节点的 next 指针回指到之前出现过的节点即构成环。要求 O(1) 空间。\n\n示例：3 -> 2 -> 0 -> -4，尾节点指向下标 1 的节点，存在环，输出 true。',
    idea: [
      '哈希表记录访问过的节点是平凡解，但要 O(n) 空间。',
      'Floyd 判圈（快慢指针）：慢指针每次走一步，快指针每次走两步。',
      '无环时快指针先到尾部；有环时快指针会在环内"追上"慢指针，两者相遇即有环。',
      '直觉：相对速度为每步一格，快指针相对慢指针在环内逐格逼近，必然相遇而不会跳过。',
    ],
    code: `def hasCycle(head):
    # 快慢指针，相遇即有环
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['060-LinkedList'],
  },
  {
    slug: 'linked-list-cycle-ii',
    lc: 142,
    title: '环形链表 II',
    titleEn: 'Linked List Cycle II',
    difficulty: 'medium',
    category: 'linked-list',
    tags: ['快慢指针', '数学证明'],
    brief: '找出环的入口节点。',
    statement:
      '给定一个链表，返回链表开始入环的第一个节点；无环则返回 null。要求 O(1) 空间且不修改链表。\n\n示例：3 -> 2 -> 0 -> -4，尾节点指向下标 1 的节点，环入口是值为 2 的节点。',
    idea: [
      '先用快慢指针判定有环并拿到相遇点（同第 141 题做法）。',
      '数学推导：设头到入口距离 a，入口到相遇点距离 b，环长为 c。相遇时慢指针走 a + b，快指针走 a + b + k·c。',
      '由"快指针步数是慢指针两倍"得 a = c - b + (k-1)·c，即从头到入口的距离等于从相遇点继续走到入口的距离。',
      '因此相遇后把一个指针放回头部，两指针同速前进，再次相遇处就是环入口。',
    ],
    code: `def detectCycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            # 相遇后同速前进，再次相遇点即环入口
            p = head
            while p is not slow:
                p = p.next
                slow = slow.next
            return p
    return None`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['060-LinkedList'],
  },
  {
    slug: 'remove-nth-node-from-end-of-list',
    lc: 19,
    title: '删除链表的倒数第 N 个结点',
    titleEn: 'Remove Nth Node From End of List',
    difficulty: 'medium',
    category: 'linked-list',
    tags: ['快慢指针', '哑节点'],
    brief: '一趟扫描删除链表倒数第 n 个节点。',
    statement:
      '给你一个链表，删除链表的倒数第 n 个结点，并且返回链表的头结点。要求使用一趟扫描实现。\n\n示例：1 -> 2 -> 3 -> 4 -> 5，n = 2，删除倒数第 2 个后为 1 -> 2 -> 3 -> 5。',
    idea: [
      '要删除倒数第 n 个节点，需要找到它的前驱节点；两趟扫描（先算长度）容易，一趟扫描用快慢指针。',
      '快指针先走 n + 1 步，随后快慢指针同步前进；快指针到尾部时，慢指针恰好停在倒数第 n + 1 个节点（前驱）。',
      '用哑节点指向头部，统一处理"删除头节点"的边界情况。',
    ],
    code: `def removeNthFromEnd(head, n):
    # 快指针先走 n+1 步，慢指针停在待删节点的前驱
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['060-LinkedList'],
  },
  {
    slug: 'intersection-of-two-linked-lists',
    lc: 160,
    title: '相交链表',
    titleEn: 'Intersection of Two Linked Lists',
    difficulty: 'easy',
    category: 'linked-list',
    tags: ['双指针', '等距交换'],
    brief: '找到两个单链表相交的起始节点。',
    statement:
      '给你两个单链表的头节点 headA 与 headB，请你找出并返回两个单链表相交的起始节点；若不相交返回 null。整个链式结构中不存在环。要求 O(n) 时间、O(1) 空间。\n\n示例：两链表在值为 8 的节点相交。',
    idea: [
      '两链表长度不同，直接同步走无法对齐；核心是消除长度差。',
      '指针 p 从 A 出发、q 从 B 出发，各自走到底后跳到另一条链表的头继续走。',
      '这样两者走过的总长度同为 la + lb，长度差被"换轨"抵消；若相交必然在交点相遇，不相交则同时到达 null。',
      '也可以先算长度差让长链先走差值步，本质相同。',
    ],
    code: `def getIntersectionNode(headA, headB):
    # 双指针换轨：走完自己的路再走对方的路，等距消除长度差
    p, q = headA, headB
    while p is not q:
        p = p.next if p else headB
        q = q.next if q else headA
    return p`,
    time: 'O(m + n)',
    space: 'O(1)',
    related: ['060-LinkedList'],
  },
  {
    slug: 'reorder-list',
    lc: 143,
    title: '重排链表',
    titleEn: 'Reorder List',
    difficulty: 'medium',
    category: 'linked-list',
    tags: ['快慢指针', '反转', '合并'],
    brief: '将链表重排为 L0 -> Ln -> L1 -> Ln-1 的交错序列。',
    statement:
      '给定单链表 L：L0 -> L1 -> ... -> Ln-1 -> Ln，重排为 L0 -> Ln -> L1 -> Ln-1 -> ...。不能只改节点值，必须实际交换节点，要求原地完成。\n\n示例：1 -> 2 -> 3 -> 4 -> 5 重排为 1 -> 5 -> 2 -> 4 -> 3。',
    idea: [
      '目标序列是"前半段正序 + 后半段逆序"交错，因此拆成三步经典操作的组合。',
      '第一步快慢指针找中点，把链表一分为二；第二步反转后半段；第三步把两段按"前一个 + 后一个"交错合并。',
      '三个子操作都是链表基本功（206 反转、876 中点、21 合并），组合即解，注意断开中点前先断链防环。',
    ],
    code: `def reorderList(head):
    # 1. 快慢指针找中点
    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    second = slow.next
    slow.next = None

    # 2. 反转后半段
    prev = None
    while second:
        nxt = second.next
        second.next = prev
        prev = second
        second = nxt

    # 3. 交错合并两段
    p, q = head, prev
    while q:
        nxt = q.next
        q.next = p.next
        p.next = q
        p = q.next
        q = nxt`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['060-LinkedList'],
  },
  {
    slug: 'reverse-nodes-in-k-group',
    lc: 25,
    title: 'K 个一组翻转链表',
    titleEn: 'Reverse Nodes in k-Group',
    difficulty: 'hard',
    category: 'linked-list',
    tags: ['链表', '分组反转'],
    brief: '每 k 个节点一组进行翻转，不足 k 个保持原序。',
    statement:
      '给你链表的头节点 head，每 k 个节点一组进行翻转，请你返回修改后的链表。节点总数不是 k 的整数倍时，最后剩余节点保持原有顺序。要求只使用常数额外空间，不能只改节点值。\n\n示例：1 -> 2 -> 3 -> 4 -> 5，k = 3，输出 3 -> 2 -> 1 -> 4 -> 5。',
    idea: [
      '分组处理：先从当前组头探测是否凑满 k 个节点，不足则直接结束。',
      '凑满则对这一组内部执行标准反转（同 206 题），返回新的组头与组尾。',
      '把上一组的组尾接到新组头，再从原组尾（新组尾）继续处理下一组；用哑节点统一第一组的接法。',
      '关键细节：探测与反转都要小心保持对"下一组起点"的引用，防止断链丢失。',
    ],
    code: `def reverseKGroup(head, k):
    dummy = ListNode(0, head)
    prev_group = dummy
    while True:
        # 探测本组第 k 个节点是否还存在
        end = prev_group
        for _ in range(k):
            end = end.next
            if not end:
                return dummy.next
        start = prev_group.next
        nxt_group = end.next
        # 组内反转 [start, end]
        prev, cur = nxt_group, start
        while cur != nxt_group:
            tmp = cur.next
            cur.next = prev
            prev = cur
            cur = tmp
        prev_group.next = end
        prev_group = start`,
    time: 'O(n)',
    space: 'O(1)',
    related: ['060-LinkedList'],
  },

  // ==================== 栈与队列 ====================
  {
    slug: 'valid-parentheses',
    lc: 20,
    title: '有效的括号',
    titleEn: 'Valid Parentheses',
    difficulty: 'easy',
    category: 'stack-queue',
    tags: ['栈', '匹配'],
    brief: '判断括号字符串是否完全闭合匹配。',
    statement:
      '给定一个只包括 (、)、{、}、[、] 的字符串 s，判断字符串是否有效。有效字符串需满足：左括号必须用相同类型的右括号闭合，且必须以正确的顺序闭合。\n\n示例：s = "()[]{}" 有效；s = "([)]" 无效。',
    idea: [
      '括号匹配的"后进先出"结构天然对应栈：遇到左括号入栈，遇到右括号与栈顶配对。',
      '栈顶不匹配或栈已空却遇到右括号，立即判无效。',
      '遍历结束后栈必须为空，否则还有未闭合的左括号。',
    ],
    code: `def isValid(s):
    # 右括号 -> 对应左括号 的配对表
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['040-StackAndQueue'],
  },
  {
    slug: 'min-stack',
    lc: 155,
    title: '最小栈',
    titleEn: 'Min Stack',
    difficulty: 'medium',
    category: 'stack-queue',
    tags: ['栈', '设计', '辅助栈'],
    brief: '设计支持 O(1) 获取最小值的栈。',
    statement:
      '设计一个支持 push、pop、top 操作，并能在常数时间内检索到最小元素的栈。push、pop、top 和 getMin 都必须在 O(1) 时间内完成。\n\n示例：依次 push(-2)、push(0)、push(-3)，getMin() 返回 -3；pop() 后 top() 返回 0，getMin() 返回 -2。',
    idea: [
      '每个元素入栈时，"当前时刻的最小值"也随之确定，且出栈后要恢复上一个最小值——这是典型的状态随栈帧存取。',
      '辅助栈与主栈同步压入"到本层为止的最小值"，出栈时同步弹出，天然实现回滚。',
      '空间优化：只在 x <= 当前最小值时才压辅助栈，出栈时若弹出的值等于最小值则同步弹出。',
    ],
    code: `class MinStack:
    def __init__(self):
        self.stack = []
        self.mins = []  # mins[i] 为前 i+1 个元素的最小值

    def push(self, val):
        self.stack.append(val)
        cur = self.mins[-1] if self.mins else val
        self.mins.append(min(cur, val))

    def pop(self):
        self.stack.pop()
        self.mins.pop()

    def top(self):
        return self.stack[-1]

    def getMin(self):
        return self.mins[-1]`,
    time: 'O(1) 各操作',
    space: 'O(n)',
    related: ['040-StackAndQueue'],
  },
  {
    slug: 'implement-queue-using-stacks',
    lc: 232,
    title: '用栈实现队列',
    titleEn: 'Implement Queue using Stacks',
    difficulty: 'easy',
    category: 'stack-queue',
    tags: ['栈', '队列', '设计'],
    brief: '仅用两个栈实现队列的先进先出操作。',
    statement:
      '请你仅使用两个栈实现先入先出队列，支持 push、pop、peek 操作，且所有操作均摊时间复杂度为 O(1)。\n\n示例：push(1)、push(2)、peek() 返回 1、pop() 返回 1、empty() 返回 false。',
    idea: [
      '两个栈分工：入栈 inStack 只管进，出栈 outStack 只管出。',
      '出栈栈为空时，把入栈栈整体倒灌进出栈栈——顺序恰好被第二次"反转"纠正为先进先出。',
      '均摊分析：每个元素一生最多被搬运两次，单次操作看似 O(n)，均摊 O(1)。',
    ],
    code: `class MyQueue:
    def __init__(self):
        self.in_stack = []
        self.out_stack = []

    def push(self, x):
        self.in_stack.append(x)

    def _shift(self):
        # 出栈为空时倒入全部元素，恢复队列顺序
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())

    def pop(self):
        self._shift()
        return self.out_stack.pop()

    def peek(self):
        self._shift()
        return self.out_stack[-1]

    def empty(self):
        return not self.in_stack and not self.out_stack`,
    time: 'O(1) 均摊',
    space: 'O(n)',
    related: ['040-StackAndQueue'],
  },
  {
    slug: 'daily-temperatures',
    lc: 739,
    title: '每日温度',
    titleEn: 'Daily Temperatures',
    difficulty: 'medium',
    category: 'stack-queue',
    tags: ['单调栈'],
    brief: '求每天等到下一个更暖天气所需等待的天数。',
    statement:
      '给定一个整数数组 temperatures 表示每天的温度，返回一个数组 answer，其中 answer[i] 是指对第 i 天来说，还要等多少天才能等到更暖和的温度；之后都没有更暖的则记 0。\n\n示例：temperatures = [73, 74, 75, 71, 69, 72, 76, 73]，输出 [1, 1, 4, 2, 1, 1, 0, 0]。',
    idea: [
      '本质是"下一个更大元素"的变体：对每个 i 找右边第一个比它大的下标 j，答案为 j - i。',
      '单调递减栈：栈里存"还在等更暖天"的下标，对应温度自栈底到栈顶递减。',
      '新温度高于栈顶时，栈顶元素的答案确定（当前下标减栈顶），弹出并重复。',
      '每个下标最多入栈出栈各一次，O(n) 完成。',
    ],
    code: `def dailyTemperatures(T):
    # 单调递减栈存下标，遇到更暖天即结算栈顶
    stack = []
    ans = [0] * len(T)
    for i, t in enumerate(T):
        while stack and T[stack[-1]] < t:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['040-StackAndQueue'],
  },
  {
    slug: 'next-greater-element-ii',
    lc: 503,
    title: '下一个更大元素 II',
    titleEn: 'Next Greater Element II',
    difficulty: 'medium',
    category: 'stack-queue',
    tags: ['单调栈', '循环数组'],
    brief: '循环数组中找每个元素的下一个更大元素。',
    statement:
      '给定一个循环数组 nums（最后一个元素的下一个元素是数组第一个元素），返回每个元素的下一个更大元素；不存在则输出 -1。\n\n示例：nums = [1, 2, 1]，输出 [2, -1, 2]。',
    idea: [
      '循环数组的标准处理：遍历下标 i 取模，总长度扫描 2n 次，模拟"绕圈"。',
      '单调栈存下标，遇到更大的值就结算栈顶，与线性版一致。',
      '第二次扫描开始前不清栈：前一轮留在栈中的元素会在第二轮被后续更大元素结算，天然处理跨界查找。',
    ],
    code: `def nextGreaterElements(nums):
    n = len(nums)
    ans = [-1] * n
    stack = []
    # 扫描 2n 次模拟循环数组
    for i in range(2 * n):
        x = nums[i % n]
        while stack and nums[stack[-1]] < x:
            ans[stack.pop()] = x
        if i < n:
            stack.append(i)
    return ans`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['040-StackAndQueue'],
  },
  {
    slug: 'largest-rectangle-in-histogram',
    lc: 84,
    title: '柱状图中最大的矩形',
    titleEn: 'Largest Rectangle in Histogram',
    difficulty: 'hard',
    category: 'stack-queue',
    tags: ['单调栈', '边界扩展'],
    brief: '求柱状图中能勾勒出的最大矩形面积。',
    statement:
      '给定 n 个非负整数表示柱状图中各柱子的高度，每根柱子宽度为 1，求在该柱状图中能够勾勒出来的矩形的最大面积。\n\n示例：heights = [2, 1, 5, 6, 2, 3]，最大矩形取高度 5、6 两柱，宽 2，面积 10。',
    idea: [
      '换个角度：枚举"以每根柱子为最矮柱"能向左右扩展多远，面积 = 高度 × 扩展宽度。',
      '朴素扩展是 O(n^2)；单调递增栈在"遇到更矮柱"时一次性确定栈顶柱的左右边界。',
      '弹出栈顶时：右边界是当前下标 i，左边界是弹出后新栈顶（其右边第一个更矮柱），宽度为 i - new_top - 1。',
      '末尾追加哨兵高度 0，保证所有柱子都被弹出结算；左右相等高度的情况不影响正确性。',
    ],
    code: `def largestRectangleArea(heights):
    # 哨兵：末尾高度 0 触发全部出栈结算
    stack = []
    best = 0
    for i, h in enumerate(heights + [0]):
        while stack and heights[stack[-1]] >= h:
            height = heights[stack.pop()]
            left = stack[-1] if stack else -1
            best = max(best, height * (i - left - 1))
        stack.append(i)
    return best`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['040-StackAndQueue'],
  },
  {
    slug: 'decode-string',
    lc: 394,
    title: '字符串解码',
    titleEn: 'Decode String',
    difficulty: 'medium',
    category: 'stack-queue',
    tags: ['栈', '递归'],
    brief: '解码形如 k[encoded_string] 的编码字符串。',
    statement:
      '给定一个经过编码的字符串，编码规则为 k[encoded_string]，表示方括号内的字符串恰好重复 k 次。输入保证编码合法，k 为正整数，可能存在嵌套。\n\n示例：s = "3[a2[c]]"，解码为 "accaccacc"。',
    idea: [
      '嵌套结构天然适合栈：遇到 [ 时把当前串与重复次数压栈，开始构建新层。',
      '遇到 ] 时弹栈，把刚构建的层重复 k 次接到上一层串尾。',
      '数字可能多位，需要持续读入拼接成完整倍数；字母直接追加到当前层。',
    ],
    code: `def decodeString(s):
    stack = []   # [上一层字符串, 重复次数]
    cur, num = '', 0
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)
        elif ch == '[':
            stack.append((cur, num))
            cur, num = '', 0
        elif ch == ']':
            prev, k = stack.pop()
            cur = prev + cur * k
        else:
            cur += ch
    return cur`,
    time: 'O(输出展开规模)',
    space: 'O(n)',
    related: ['040-StackAndQueue', '140-RecursionAndBacktracking'],
  },

  // ==================== 字符串 ====================
  {
    slug: 'longest-common-prefix',
    lc: 14,
    title: '最长公共前缀',
    titleEn: 'Longest Common Prefix',
    difficulty: 'easy',
    category: 'string',
    tags: ['字符串', '纵向扫描'],
    brief: '查找字符串数组中的最长公共前缀。',
    statement:
      '编写一个函数来查找字符串数组中的最长公共前缀，不存在公共前缀时返回空串。\n\n示例：["flower", "flow", "flight"] 输出 "fl"；["dog", "racecar", "car"] 输出 ""。',
    idea: [
      '纵向扫描：以第一个串为基准逐列比较，第 i 列所有字符相同则前缀延长一格，否则立即停止。',
      '也可以横向两两归并（前两个的公共前缀再与第三个比较），复杂度相同。',
      '任一字符串率先耗尽也应当停止，注意下标越界。',
    ],
    code: `def longestCommonPrefix(strs):
    # 以第一个串为基准逐列比较
    for i, ch in enumerate(strs[0]):
        for s in strs[1:]:
            if i == len(s) or s[i] != ch:
                return strs[0][:i]
    return strs[0]`,
    time: 'O(n · m)',
    space: 'O(1)',
    related: ['150-StringAlgorithms'],
  },
  {
    slug: 'find-the-index-of-the-first-occurrence-in-a-string',
    lc: 28,
    title: '找出字符串中第一个匹配项的下标',
    titleEn: 'Find the Index of the First Occurrence in a String',
    difficulty: 'easy',
    category: 'string',
    tags: ['KMP', '字符串匹配'],
    brief: '返回模式串 needle 在文本串 haystack 中首次出现的下标。',
    statement:
      '给你两个字符串 haystack 和 needle，请你在 haystack 字符串中找出 needle 字符串出现的第一个位置（下标从 0 开始）；不存在则返回 -1。\n\n示例：haystack = "sadbutsad"，needle = "sad"，输出 0；needle = "but"，输出 -1。',
    idea: [
      '朴素匹配逐起点比较最坏 O(n·m)；KMP 利用已匹配前缀的信息避免文本指针回退。',
      '先对模式串自匹配构建 next（失配）数组：next[i] 表示模式串 [0, i] 的相等最长真前后缀长度。',
      '匹配时失配则模式串指针 j = next[j-1] 跳到该前缀继续比较，文本指针 i 永不回退，整体 O(n + m)。',
      '理解 next 数组的构建过程本身也是一次模式串自匹配，两段代码结构几乎一致。',
    ],
    code: `def strStr(haystack, needle):
    n, m = len(haystack), len(needle)
    # 构建 KMP 失配数组
    nxt = [0] * m
    j = 0
    for i in range(1, m):
        while j and needle[i] != needle[j]:
            j = nxt[j - 1]
        if needle[i] == needle[j]:
            j += 1
        nxt[i] = j
    # 主匹配：文本指针不回退
    j = 0
    for i in range(n):
        while j and haystack[i] != needle[j]:
            j = nxt[j - 1]
        if haystack[i] == needle[j]:
            j += 1
        if j == m:
            return i - m + 1
    return -1`,
    time: 'O(n + m)',
    space: 'O(m)',
    related: ['230-KmpStringMatching', '150-StringAlgorithms'],
  },
  {
    slug: 'reverse-words-in-a-string',
    lc: 151,
    title: '反转字符串中的单词',
    titleEn: 'Reverse Words in a String',
    difficulty: 'medium',
    category: 'string',
    tags: ['字符串', '双指针'],
    brief: '反转单词顺序并压缩多余空格。',
    statement:
      '给你一个字符串 s，请你反转字符串中单词的顺序。单词由非空格字符组成，输入中单词之间可能存在多个空格，结果应仅用单个空格分隔且不含首尾空格。\n\n示例：s = "  the sky  is blue  "，输出 "blue is sky the"。',
    idea: [
      '语言内置 split + reverse 一行可解；面试常要求 O(1) 空间的原地解法，练习手动处理。',
      '原地三步：先整体反转全串，再逐个单词反转回来，最后清理多余空格（原地压缩）。',
      '也可以先扫描切词再倒序拼接，实现简单且易于说清，注意空格压缩细节。',
    ],
    code: `def reverseWords(s):
    # 扫描切词后倒序拼接，兼顾空格压缩
    words = []
    i, n = 0, len(s)
    while i < n:
        if s[i] != ' ':
            j = i
            while j < n and s[j] != ' ':
                j += 1
            words.append(s[i:j])
            i = j
        else:
            i += 1
    return ' '.join(reversed(words))`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['150-StringAlgorithms', '020-ArrayAndDynamicArray'],
  },
  {
    slug: 'add-strings',
    lc: 415,
    title: '字符串相加',
    titleEn: 'Add Strings',
    difficulty: 'easy',
    category: 'string',
    tags: ['模拟', '进位'],
    brief: '模拟手算加法，求两个非负整数字符串的和。',
    statement:
      '给定两个以字符串形式表示的非负整数 num1 和 num2（不能直接转整数或用内置大数库），返回它们相加结果的字符串形式。\n\n示例：num1 = "456"，num2 = "77"，输出 "533"。',
    idea: [
      '模拟竖式加法：从末位开始对齐，逐位相加并维护进位。',
      '循环条件是两串未耗尽或进位非零——"或进位"是最容易漏的分支。',
      '结果逐位追加后整体反转即答案。',
    ],
    code: `def addStrings(num1, num2):
    # 从末位起模拟竖式加法
    i, j, carry = len(num1) - 1, len(num2) - 1, 0
    digits = []
    while i >= 0 or j >= 0 or carry:
        s = carry
        if i >= 0:
            s += int(num1[i])
            i -= 1
        if j >= 0:
            s += int(num2[j])
            j -= 1
        digits.append(s % 10)
        carry = s // 10
    return ''.join(map(str, reversed(digits)))`,
    time: 'O(max(m, n))',
    space: 'O(1)',
    related: ['150-StringAlgorithms'],
  },
  {
    slug: 'zigzag-conversion',
    lc: 6,
    title: 'Z 字形变换',
    titleEn: 'Zigzag Conversion',
    difficulty: 'medium',
    category: 'string',
    tags: ['模拟', '规律'],
    brief: '把字符串按 Z 字形排布后逐行读取。',
    statement:
      '将一个给定字符串 s 根据给定的行数 numRows，以从上往下、从左到右进行 Z 字形排列，然后按行连接输出。\n\n示例：s = "PAYPALISHIRING"，numRows = 3，Z 形排列后按行读出 "PAHNAPLSIIGYIR"。',
    idea: [
      'Z 形排列按列分组周期为 2 numRows - 2：第一列竖直向下 numRows 个字符，斜线部分 numRows - 2 个。',
      '按周期规律分配下标即可模拟：用行指针上下弹跳，方向在触顶或触底时翻转。',
      '两行与一行的边界情况要单独处理（周期退化为 1 或 2，弹跳逻辑需防除零）。',
    ],
    code: `def convert(s, numRows):
    if numRows == 1:
        return s
    rows = [''] * numRows
    r, step = 0, 1  # step 控制行指针弹跳方向
    for ch in s:
        rows[r] += ch
        if r == 0:
            step = 1
        elif r == numRows - 1:
            step = -1
        r += step
    return ''.join(rows)`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['150-StringAlgorithms'],
  },
];
