import type { AlgoProblem } from './types';

/**
 * 算法题图鉴 · 树与堆篇
 * 二叉树 / 堆与优先队列
 * 题面为便于学习的概括复述，参考实现为 Python。
 */
export const TREE_PROBLEMS: AlgoProblem[] = [
  // ==================== 二叉树 ====================
  {
    slug: 'maximum-depth-of-binary-tree',
    lc: 104,
    title: '二叉树的最大深度',
    titleEn: 'Maximum Depth of Binary Tree',
    difficulty: 'easy',
    category: 'tree',
    tags: ['递归', 'DFS'],
    brief: '求二叉树根到最远叶子节点的最长路径上的节点数。',
    statement:
      '给定一个二叉树 root，返回其最大深度（根节点到最远叶子节点的最长路径上的节点数）。\n\n示例：树 [3, 9, 20, null, null, 15, 7]，最大深度为 3。',
    idea: [
      '树的最大深度 = max(左子树深度, 右子树深度) + 1，天然的递归定义。',
      '递归基：空节点深度为 0；自底向上汇总即得答案。',
      '迭代写法用 BFS 层序计数或 DFS 显式栈，面试时能写出递归版并说明复杂度即可。',
    ],
    code: `def maxDepth(root):
    # 自底向上：深度 = 左右子树深度的最大值 + 1
    if not root:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))`,
    time: 'O(n)',
    space: 'O(h)',
    related: ['080-Tree'],
  },
  {
    slug: 'invert-binary-tree',
    lc: 226,
    title: '翻转二叉树',
    titleEn: 'Invert Binary Tree',
    difficulty: 'easy',
    category: 'tree',
    tags: ['递归', '镜像'],
    brief: '将二叉树左右子树互换得到镜像。',
    statement:
      '给你一棵二叉树的根节点 root，翻转这棵二叉树，并返回其根节点（每个节点的左右子树互换）。\n\n示例：[4, 2, 7, 1, 3, 6, 9] 翻转后为 [4, 7, 2, 9, 6, 3, 1]。',
    idea: [
      '递归定义同样直白：翻转当前树 = 交换左右孩子后分别翻转左右子树。',
      '先交换还是先递归都可以，递归基是空节点返回 None。',
    ],
    code: `def invertTree(root):
    # 交换左右孩子，再递归翻转左右子树
    if not root:
        return None
    root.left, root.right = invertTree(root.right), invertTree(root.left)
    return root`,
    time: 'O(n)',
    space: 'O(h)',
    related: ['080-Tree'],
  },
  {
    slug: 'symmetric-tree',
    lc: 101,
    title: '对称二叉树',
    titleEn: 'Symmetric Tree',
    difficulty: 'easy',
    category: 'tree',
    tags: ['递归', '双指针式比较'],
    brief: '判断二叉树是否轴对称。',
    statement:
      '给你一个二叉树的根节点 root，检查它是否轴对称（镜像对称）。\n\n示例：[1, 2, 2, 3, 4, 4, 3] 是对称的，返回 true。',
    idea: [
      '对称等价于：左子树与右子树互为镜像。把问题转化为比较两棵树。',
      '两棵树互为镜像的条件：根值相等，且"左的左"与"右的右"互为镜像、"左的右"与"右的左"互为镜像。',
      '递归比较两个节点即可；迭代版用队列成对入队，本质相同。',
    ],
    code: `def isSymmetric(root):
    def isMirror(a, b):
        # 双方都空对称，单方空不对称
        if not a and not b:
            return True
        if not a or not b or a.val != b.val:
            return False
        # 外侧对外侧，内侧对内侧
        return isMirror(a.left, b.right) and isMirror(a.right, b.left)

    return isMirror(root, root) if root else True`,
    time: 'O(n)',
    space: 'O(h)',
    related: ['080-Tree'],
  },
  {
    slug: 'binary-tree-level-order-traversal',
    lc: 102,
    title: '二叉树的层序遍历',
    titleEn: 'Binary Tree Level Order Traversal',
    difficulty: 'medium',
    category: 'tree',
    tags: ['BFS', '队列'],
    brief: '按层返回二叉树节点值。',
    statement:
      '给你二叉树的根节点 root，返回其节点值的层序遍历结果（逐层地，从左到右访问所有节点）。\n\n示例：[3, 9, 20, null, null, 15, 7] 输出 [[3], [9, 20], [15, 7]]。',
    idea: [
      'BFS 模板题：队列维护"当前层"节点，每轮记录队列长度（即本层节点数），逐个出队并把孩子入队。',
      '关键点是"按层切分"：处理前先固定 len(queue)，避免新入队的孩子与本层混在一起。',
      '变式（之字形遍历、自底向上）都只需在此骨架上加层号奇偶翻转或反转结果列表。',
    ],
    code: `from collections import deque

def levelOrder(root):
    if not root:
        return []
    res = []
    queue = deque([root])
    while queue:
        level = []
        # 先固定本层节点数，再逐个出队
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        res.append(level)
    return res`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['080-Tree', '110-GraphAlgorithms'],
  },
  {
    slug: 'construct-binary-tree-from-preorder-and-inorder-traversal',
    lc: 105,
    title: '从前序与中序遍历序列构造二叉树',
    titleEn: 'Construct Binary Tree from Preorder and Inorder Traversal',
    difficulty: 'medium',
    category: 'tree',
    tags: ['递归', '哈希表', '分治'],
    brief: '根据前序与中序遍历结果重建二叉树。',
    statement:
      '给定两个整数数组 preorder 和 inorder，其中 preorder 是二叉树的前序遍历，inorder 是同一棵树的中序遍历，请构造二叉树并返回其根节点（假设无重复值）。\n\n示例：preorder = [3, 9, 20, 15, 7]，inorder = [9, 3, 15, 20, 7]，构造出 [3, 9, 20, null, null, 15, 7]。',
    idea: [
      '前序的第一个元素是根；在中序里找到它，左侧是左子树、右侧是右子树，由此确定两段子数组规模。',
      '递归构造：按左右子树的规模切分前序与中序数组，分别建树后接到根上。',
      '为避免每次线性查找根的位置，用哈希表预存「值 -> 中序下标」；传区间下标代替切片，避免复制数组。',
      '无重复值是哈希定位成立的前提；重复值时该问题无唯一解。',
    ],
    code: `def buildTree(preorder, inorder):
    # 值 -> 中序下标，O(1) 定位根
    idx = {v: i for i, v in enumerate(inorder)}

    def build(pre_l, pre_r, in_l, in_r):
        if pre_l > pre_r:
            return None
        root_val = preorder[pre_l]
        root = TreeNode(root_val)
        mid = idx[root_val]
        left_size = mid - in_l
        root.left = build(pre_l + 1, pre_l + left_size, in_l, mid - 1)
        root.right = build(pre_l + left_size + 1, pre_r, mid + 1, in_r)
        return root

    return build(0, len(preorder) - 1, 0, len(inorder) - 1)`,
    time: 'O(n)',
    space: 'O(n)',
    related: ['080-Tree', '120-DivideAndConquer'],
  },
  {
    slug: 'lowest-common-ancestor-of-a-binary-tree',
    lc: 236,
    title: '二叉树的最近公共祖先',
    titleEn: 'Lowest Common Ancestor of a Binary Tree',
    difficulty: 'medium',
    category: 'tree',
    tags: ['递归', '后序遍历'],
    brief: '找出二叉树中两个指定节点的最近公共祖先。',
    statement:
      '给定一个二叉树，找到该树中两个指定节点 p 和 q 的最近公共祖先（LCA）。祖先的定义为：如果节点 p 在节点 root 的子树中，或 p == root，那么 root 是 p 的祖先。\n\n示例：树 [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]，p = 5，q = 1，LCA 为 3。',
    idea: [
      '后序递归：对每个节点，先在左右子树中分别查找 p、q。',
      '若左右子树各命中一个，当前节点即最近公共祖先（p、q 分居两侧，交汇点必是 LCA）。',
      '若只有一侧命中，说明两个目标都在那一侧（或一个目标本身就是祖先），把命中结果向上传递。',
      '递归基：节点为空返回 None，等于 p 或 q 返回自身。',
    ],
    code: `def lowestCommonAncestor(root, p, q):
    # 后序遍历：自底向上汇聚命中信息
    if not root or root is p or root is q:
        return root
    left = lowestCommonAncestor(root.left, p, q)
    right = lowestCommonAncestor(root.right, p, q)
    if left and right:
        return root
    return left if left else right`,
    time: 'O(n)',
    space: 'O(h)',
    related: ['080-Tree'],
  },
  {
    slug: 'validate-binary-search-tree',
    lc: 98,
    title: '验证二叉搜索树',
    titleEn: 'Validate Binary Search Tree',
    difficulty: 'medium',
    category: 'tree',
    tags: ['递归', '中序遍历', '上下界'],
    brief: '判断给定的树是否为合法的二叉搜索树。',
    statement:
      '给你一个二叉树的根节点 root，判断其是否是一个有效的二叉搜索树（BST）。有效 BST 定义：左子树所有节点值严格小于根，右子树所有节点值严格大于根，左右子树也必须是 BST。\n\n示例：[2, 1, 3] 有效；[5, 1, 4, null, null, 3, 6] 无效（4 大于根 5 却在右子树内违反约束）。',
    idea: [
      '常见错误是只比较节点与直接孩子；正确做法是把祖先的约束向下传递——每个节点有取值上下界 (low, high)。',
      '递归检查当前值落在开区间 (low, high) 内，再以 (low, val) 检查左子树、(val, high) 检查右子树。',
      '另一种等价思路：BST 的中序遍历严格递增，中序扫描时比较当前值与前一个值即可。',
    ],
    code: `def isValidBST(root):
    def check(node, low, high):
        if not node:
            return True
        if not low < node.val < high:
            return False
        # 左子树上界收缩为当前值，右子树下界抬升为当前值
        return check(node.left, low, node.val) and check(node.right, node.val, high)

    return check(root, float('-inf'), float('inf'))`,
    time: 'O(n)',
    space: 'O(h)',
    related: ['080-Tree', '100-BalancedTreeAdvanced'],
  },
  {
    slug: 'binary-tree-maximum-path-sum',
    lc: 124,
    title: '二叉树中的最大路径和',
    titleEn: 'Binary Tree Maximum Path Sum',
    difficulty: 'hard',
    category: 'tree',
    tags: ['递归', '后序遍历', '负值剪枝'],
    brief: '求二叉树中任意路径（不重复经过节点）的最大和。',
    statement:
      '二叉树中的「路径」被定义为一条节点序列，序列中每对相邻节点之间都存在边，且每个节点至多出现一次；路径至少包含一个节点，不必经过根节点。路径和是路径中各节点值的总和。给你二叉树的根节点 root，返回其最大路径和（节点值可能为负）。\n\n示例：[1, 2, 3] 输出 6（路径 2 -> 1 -> 3）；[-10, 9, 20, null, null, 15, 7] 输出 42（15 -> 20 -> 7）。',
    idea: [
      '区分两个量：「穿过当前节点的路径和」（左链 + 右链 + 自身，用于更新答案）与「向上贡献的链和」（自身 + 左右链中较大的一条，用于递归）。',
      '链和若为负，贡献只会拖累父节点，取 max(链和, 0) 实现负值剪枝。',
      '答案在递归过程中全局更新：ans = max(ans, left + right + val)；注意至少包含一个节点，负值也要正确处理。',
    ],
    code: `def maxPathSum(root):
    best = float('-inf')

    def gain(node):
        # 返回以 node 为端点向下的最大链和（负贡献剪为 0）
        nonlocal best
        if not node:
            return 0
        left = max(gain(node.left), 0)
        right = max(gain(node.right), 0)
        best = max(best, node.val + left + right)
        return node.val + max(left, right)

    gain(root)
    return best`,
    time: 'O(n)',
    space: 'O(h)',
    related: ['080-Tree', '160-DynamicProgramming'],
  },

  // ==================== 堆与优先队列 ====================
  {
    slug: 'kth-largest-element-in-an-array',
    lc: 215,
    title: '数组中的第K个最大元素',
    titleEn: 'Kth Largest Element in an Array',
    difficulty: 'medium',
    category: 'heap',
    tags: ['快速选择', '堆'],
    brief: '不用排序找出数组中第 k 大的元素。',
    statement:
      '给定整数数组 nums 和整数 k，请返回数组中第 k 个最大的元素。注意是排序后第 k 个最大的元素，不是第 k 个不同的元素。要求不使用排序库完成（进阶：O(n) 时间）。\n\n示例：nums = [3, 2, 1, 5, 6, 4]，k = 2，输出 5。',
    idea: [
      '建大小为 k 的小顶堆扫一遍是 O(n log k) 的稳当解法；达到 O(n) 平均要用快速选择。',
      '快速选择是快排的变体：partition 后基准落在最终位置 p，若 p == 目标位直接返回，否则只递归包含目标的一侧。',
      '目标下标为 len(nums) - k（升序第 k 大的位置）；每轮期望丢弃一半数据，平均 O(n)，最坏 O(n^2)（随机选 pivot 可避免）。',
    ],
    code: `import random

def findKthLargest(nums, k):
    # 快速选择：只递归包含目标位置的一侧
    target = len(nums) - k
    l, r = 0, len(nums) - 1
    while True:
        pivot = nums[random.randint(l, r)]
        i, j = l, r
        while i <= j:
            while nums[i] < pivot:
                i += 1
            while nums[j] > pivot:
                j -= 1
            if i <= j:
                nums[i], nums[j] = nums[j], nums[i]
                i += 1
                j -= 1
        if target <= j:
            r = j
        elif target >= i:
            l = i
        else:
            return nums[target]`,
    time: 'O(n) 平均',
    space: 'O(1)',
    related: ['090-HeapAndPriorityQueue', '030-SortAlgorithm'],
  },
  {
    slug: 'top-k-frequent-elements',
    lc: 347,
    title: '前 K 个高频元素',
    titleEn: 'Top K Frequent Elements',
    difficulty: 'medium',
    category: 'heap',
    tags: ['哈希表', '堆', '桶排序'],
    brief: '返回出现频率前 k 高的元素。',
    statement:
      '给你一个整数数组 nums 和一个整数 k，请你返回其中出现频率前 k 高的元素，答案顺序任意，题目保证答案唯一。\n\n示例：nums = [1, 1, 1, 2, 2, 3]，k = 2，输出 [1, 2]。',
    idea: [
      '第一步用哈希表统计频率；问题转化为"按频率取前 k 个"。',
      '小顶堆维护 k 个最高频候选：堆满后新元素频率高于堆顶才替换，总代价 O(n log k)。',
      '频率上界为 n，还可以做桶排序：频率作桶下标，倒序收集桶，得到 O(n) 解法。',
    ],
    code: `import heapq
from collections import Counter

def topKFrequent(nums, k):
    count = Counter(nums)
    # 大小为 k 的小顶堆，堆顶是当前第 k 高频
    heap = []
    for val, freq in count.items():
        heapq.heappush(heap, (freq, val))
        if len(heap) > k:
            heapq.heappop(heap)
    return [val for _, val in heap]`,
    time: 'O(n log k)',
    space: 'O(n)',
    related: ['090-HeapAndPriorityQueue', '070-HashTable'],
  },
  {
    slug: 'merge-k-sorted-lists',
    lc: 23,
    title: '合并 K 个升序链表',
    titleEn: 'Merge k Sorted Lists',
    difficulty: 'hard',
    category: 'heap',
    tags: ['堆', '分治', '归并'],
    brief: '将 k 个升序链表合并成一个升序链表。',
    statement:
      '给你一个链表数组，每个链表都已经按升序排列。请你将所有链表合并到一个升序链表中，返回合并后的链表。\n\n示例：lists = [[1, 4, 5], [1, 3, 4], [2, 6]]，输出 [1, 1, 2, 3, 4, 4, 5, 6]。',
    idea: [
      '小顶堆做法：把 k 个链表头放入堆，每次弹出最小节点接到结果尾部，再把它的 next 入堆，O(N log k)。',
      'Python 的 heapq 不能直接比较节点，堆元素用 (节点值, 序号, 节点) 三元组回避比较。',
      '分治做法同样优秀：两两合并、逐层向上，共 log k 层，每层总代价 O(N)，与堆做法同数量级且常数更小。',
    ],
    code: `import heapq

def mergeKLists(lists):
    # 小顶堆维护 k 个链表的当前头节点
    heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
    heapq.heapify(heap)
    dummy = tail = ListNode(0)
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next`,
    time: 'O(N log k)',
    space: 'O(k)',
    related: ['090-HeapAndPriorityQueue', '120-DivideAndConquer'],
  },
  {
    slug: 'find-median-from-data-stream',
    lc: 295,
    title: '数据流的中位数',
    titleEn: 'Find Median from Data Stream',
    difficulty: 'hard',
    category: 'heap',
    tags: ['双堆', '设计'],
    brief: '动态添加整数，随时查询当前所有数的中位数。',
    statement:
      '中位数是有序整数列表中的中间值。实现 MedianFinder 类：addNum(num) 从数据流中添加一个整数；findMedian() 返回目前所有元素的中位数。两方法都要求尽量高效。\n\n示例：依次 addNum(1)、addNum(2)，findMedian() 返回 1.5；addNum(3) 后 findMedian() 返回 2。',
    idea: [
      '双堆结构：大顶堆 small 存较小的一半，小顶堆 large 存较大的一半，两堆大小差不超过 1。',
      '中位数：两堆等大时取堆顶平均；不等时取较大堆的堆顶。',
      '插入规则：新数先进 large，再把 large 堆顶移到 small 保持有序划分；按两堆大小交替平衡。每次 O(log n)。',
      '查询 O(1)——双堆把"动态有序集合取中位数"的成本压到了插入侧。',
    ],
    code: `import heapq

class MedianFinder:
    def __init__(self):
        self.small = []  # 大顶堆（存负值）
        self.large = []  # 小顶堆

    def addNum(self, num):
        # 先进 large，再搬运堆顶保持划分有序
        heapq.heappush(self.large, num)
        heapq.heappush(self.small, -heapq.heappop(self.large))
        # 平衡两堆大小：small 允许多一个
        if len(self.small) > len(self.large):
            heapq.heappush(self.large, -heapq.heappop(self.small))

    def findMedian(self):
        if len(self.large) > len(self.small):
            return float(self.large[0])
        return (self.large[0] - self.small[0]) / 2`,
    time: 'O(log n) 插入 / O(1) 查询',
    space: 'O(n)',
    related: ['090-HeapAndPriorityQueue'],
  },
];
