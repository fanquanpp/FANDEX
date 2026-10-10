---
order: 100
title: "树：留住顺序，代价是每步一次选择"
module: 'algorithm'
category: 计算机科学
difficulty: intermediate
description: "以「哈希表快但没顺序」引入：亲手建二叉树并跑四种遍历，理解递归结构与栈/队列的迭代化，二叉搜索树的查找插入删除与退化实验，自平衡家族（AVL/红黑/B+ 树/LSM）的取舍地图，Trie 前缀树与自动补全，以及验证 BST 的经典 bug。"
author: fanquanpp
updated: '2026-10-07'
related:
  - 'algorithm/070-HashTable'
  - 'algorithm/090-HeapAndPriorityQueue'
  - 'algorithm/100-BalancedTreeAdvanced'
  - 'algorithm/040-StackAndQueue'
prerequisites:
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/040-StackAndQueue'
---

## 前置知识

- 已完成 [算法分析基础](/algorithm/010-AlgorithmAnalysisBasics) 与 [哈希表](/algorithm/070-HashTable)——本文从它结尾的「要顺序请去树下」接棒；
- 会用栈与队列改写递归（[栈与队列](/algorithm/040-StackAndQueue)）。

## 学习目标

读完本文你将能够：

1. 亲手构建二叉树，写出前序、中序、后序、层序四种遍历（递归与迭代各一版）；
2. 说出每种遍历顺序的用途（序列化、排序输出、资源释放）；
3. 实现二叉搜索树的查找、插入、删除，并用实验演示「退化成链表」的过程；
4. 画出 BST 删除的三种情形，理解「中序后继替换」；
5. 说清 AVL、红黑树、B+ 树、LSM 各自用什么代价换取什么保证，能做场景选型；
6. 实现 Trie 前缀树并支持自动补全；
7. 识别树的四个高频坑（验证 BST 只查一层、递归栈溢出等）。

预计 75 到 105 分钟。

## 1. 你现在要解决什么问题

两类真实需求都指向树。第一类是**层次本身**：文件系统的目录、浏览器的 DOM、公司的组织架构、游戏里的技能树——父子关系天然非线性，数组与链表表达不了。

第二类更隐蔽：上一章结尾说哈希表「要范围与顺序时请去树下」。想象一个订单表：按订单号精确查 O(1) 很好，但业务还要「查出今天上午的订单」「按金额排序分页取第 100 页」——哈希表完全不会。你需要一个**查找快、还能保序**的结构：二叉搜索树（BST）让每次查找都变成一次「往左还是往右」的选择，n 个元素只需约 log2(n) 次选择；中序遍历随手就得到有序序列。数据库索引、语言标准库的有序 Map，全是这条思路的后代。

## 2. 最小可运行实验：建一棵树，跑四种遍历

```python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

#      1
#     / \
#    2   3
#   / \
#  4   5
root = TreeNode(1,
    TreeNode(2, TreeNode(4), TreeNode(5)),
    TreeNode(3))

def preorder(node, out):
    if node:
        out.append(node.val)          # 根
        preorder(node.left, out)      # 左
        preorder(node.right, out)     # 右

def inorder(node, out):
    if node:
        inorder(node.left, out)
        out.append(node.val)          # 根夹在中间
        inorder(node.right, out)

def postorder(node, out):
    if node:
        postorder(node.left, out)
        postorder(node.right, out)
        out.append(node.val)          # 根最后

def levelorder(root):
    from collections import deque
    out, queue = [], deque([root])
    while queue:
        node = queue.popleft()
        out.append(node.val)
        if node.left:  queue.append(node.left)
        if node.right: queue.append(node.right)
    return out

a, b, c = [], [], []
preorder(root, a); inorder(root, b); postorder(root, c)
print(a, b, c, levelorder(root))
```

预期输出：

```text
[1, 2, 4, 5, 3] [4, 2, 5, 1, 3] [4, 5, 2, 3, 1] [1, 2, 3, 4, 5]
```

三种深度优先遍历的代码**一字不差地同构**，唯一区别是「访问根」放在三行中的哪一行：前（根左右）、中（左根右）、后（左右根）。这不是巧合——递归就是「每个节点都是更小的树的根」这一结构性质的自然翻译。层序则换用队列，一层一层扫（040 篇的 BFS 原样落地）。

三个顺序各有本职，记住「什么任务配什么遍历」：

- **前序**：复制树、序列化（父节点必须先于子节点存在）；
- **中序**：BST 上得到**升序序列**——树的「排序输出键」；
- **后序**：释放资源、统计子树信息（必须先算完孩子才能算父亲）。

## 3. 发生了什么：递归的另一面，与两个经典复用

递归版优雅但有代价：递归深度等于树高，极端歪斜的树会打爆调用栈（040 篇坑 5 的变体）。迭代版用显式数据结构替掉系统调用栈，正好是两种结构的复习：

```python
def inorder_iterative(root):
    """中序迭代：一路向左压栈，弹出访问，再转向右子树"""
    out, stack, cur = [], [], root
    while cur or stack:
        while cur:                    # 一路向左
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()             # 左边走完了，访问自己
        out.append(cur.val)
        cur = cur.right               # 转向右子树
    return out
```

第一个经典复用：**BST 迭代器**（LC-173）。把上面的中序迭代拆成「按需走一步」，就能像遍历数组一样遍历一棵 BST，空间只有 O(h)（h 为树高）：

```python
class BSTIterator:
    def __init__(self, root):
        self.stack = []
        while root:
            self.stack.append(root)
            root = root.left

    def next(self) -> int:
        node = self.stack.pop()
        cur = node.right              # 轮到右子树里最小的
        while cur:
            self.stack.append(cur)
            cur = cur.left
        return node.val

    def hasNext(self) -> bool:
        return bool(self.stack)

it = BSTIterator(root)
print([it.next() for _ in range(5)])   # [4, 2, 5, 1, 3] 按中序逐个吐出
```

第二个经典事实：**前序 + 中序可以唯一还原一棵二叉树**（后序 + 中序同样可以；前序 + 后序不行）。因为前序第一个是根，拿它去中序里一切，左边是左子树、右边是右子树，递归即得——LC-105 从遍历序列建树，题图鉴有完整实现。

## 4. 核心概念一：二叉搜索树——每一步都是一次二分

BST 只加了一条规矩：**任何节点，左子树所有值 < 它 < 右子树所有值**。于是查找变成「每步排除一半」：

```python
class BST:
    class Node:
        __slots__ = ('key', 'val', 'left', 'right')
        def __init__(self, key, val=None):
            self.key, self.val = key, val
            self.left = self.right = None

    def __init__(self):
        self.root = None

    def search(self, key):
        cur = self.root
        while cur:
            if key == cur.key:
                return cur.val
            cur = cur.left if key < cur.key else cur.right
        return None

    def insert(self, key, val=None):
        if self.root is None:
            self.root = BST.Node(key, val)
            return
        cur = self.root
        while True:
            if key == cur.key:          # 已存在则更新
                cur.val = val
                return
            if key < cur.key:
                if cur.left is None:
                    cur.left = BST.Node(key, val)
                    return
                cur = cur.left
            else:
                if cur.right is None:
                    cur.right = BST.Node(key, val)
                    return
                cur = cur.right

t = BST()
for k in [5, 3, 8, 1, 4, 7, 9]:
    t.insert(k)
out = []
inorder(t.root, out)
print(out)                              # [1, 3, 4, 5, 7, 8, 9] —— 白送的排序
```

 BST 把有序数组的二分查找搬进了动态世界：二分要求数组有序但插入 O(n)，BST 插入只加一个叶子 O(log n)，**代价是树形由插入顺序决定**。立刻实验：

```python
import random, time

def build(keys):
    t = BST()
    for k in keys:
        t.insert(k)
    return t

keys = list(range(10000))
degenerate = build(keys)                # 升序插入
random.shuffle(keys)
balanced = build(keys)                  # 随机顺序插入

t0 = time.perf_counter()
for k in range(10000):
    degenerate.search(k)
t1 = time.perf_counter()
for k in range(10000):
    balanced.search(k)
t2 = time.perf_counter()
print(f"升序插入的 BST 查 1 万次: {t1 - t0:.3f}s")
print(f"随机插入的 BST 查 1 万次: {t2 - t1:.3f}s")
```

预期输出（数值因机器而异）：

```text
升序插入的 BST 查 1 万次: 3.412s
随机插入的 BST 查 1 万次: 0.058s
```

同样是 BST、同样 1 万个 key，性能差 60 倍：升序插入让树退化成一条向右延伸的**链表**，每次查找都走满全表。这正是哈希表篇末尾那个表格里「BST 最坏 O(n)」的来历。

## 5. 核心概念二：BST 的删除——三种情形与中序后继

插入只加叶子，删除却可能拆家。设待删节点为 x，按孩子数分三种情形：

1. **x 是叶子**：直接摘掉；
2. **x 只有一个孩子**：让孩子顶替自己的位置（把父节点的指针改接到孩子）；
3. **x 有两个孩子**：不能直接拆。找一个「秩序上的合法继任者」——**中序后继**（右子树里最小的节点，一路向左走到底），把它的值抄给 x，然后转而去删除那个后继。后继至多只有右孩子，于是情形 3 化解为情形 2。

```python
    def delete(self, key):
        def _del(node, key):
            if node is None:
                return None
            if key < node.key:
                node.left = _del(node.left, key)
            elif key > node.key:
                node.right = _del(node.right, key)
            else:
                if node.left is None:    # 情形 1/2：叶子或只有右子
                    return node.right
                if node.right is None:   # 情形 2：只有左子
                    return node.left
                succ = node.right        # 情形 3：右子树最小者
                while succ.left:
                    succ = succ.left
                node.key, node.val = succ.key, succ.val
                node.right = _del(node.right, succ.key)
            return node
        self.root = _del(self.root, key)

for k in [3, 5, 8]:
    t.delete(k)
out = []
inorder(t.root, out)
print(out)                              # [1, 4, 7, 9] —— 删完仍有序
```

为什么选中序后继？因为它是「比 x 大的最小值」，用它顶替 x 后，左 < 根 < 右 的规矩在每个节点上依然成立——**有序性是靠继任者的选择保住的**，这是 BST 删除全部的智慧。

## 6. 核心概念三：自平衡家族——谁用什么换什么

朴素 BST 会退化，平衡树家族用不同手段守住 O(log n)，各自的取舍构成一张选型地图：

| 结构 | 平衡手段 | 换来了什么 | 付了什么 | 代表应用 |
| --- | --- | --- | --- | --- |
| AVL 树 | 严格平衡（左右高差不超过 1） | 查找最快（树最矮） | 删除可能引发一路旋转 | 读多写少的内存索引 |
| 红黑树 | 松散平衡（五条颜色性质） | 删除至多 3 次旋转，写快 | 树略高 | Java TreeMap、C++ map、Linux CFS 调度器 |
| B/B+ 树 | 多叉 + 所有叶子同层 | 树高极低，磁盘 I/O 次数少 | 单节点更复杂 | MySQL InnoDB 索引 |
| LSM 树 | 写内存、追加刷盘、后台合并 | 写入极快（顺序写） | 读要查多层 | LevelDB、RocksDB |

两个最值得讲的工程故事：

**红黑树为什么统治内存有序结构**：进程调度、事件管理都是「删除极频繁」的场景，AVL 删除可能沿路径连锁旋转 O(log n) 次，红黑树靠更松的平衡条件把删除的旋转封顶在 3 次——牺牲约 40% 的查找深度（树高 2log n 对 1.44log n），换来写的稳定。Linux CFS 调度器拿红黑树按「虚拟运行时间」排进程，每次取最左节点（跑得最少的先跑），就是红黑树的标准用法。完整的旋转推导与实现见 [平衡树与高级树](/algorithm/100-BalancedTreeAdvanced)。

**B+ 树为什么统治磁盘索引**：磁盘 I/O 按「页」（16KB）为单位，树高每降一层就少一次 I/O。B+ 树让每个节点装下几百个键（高扇出），16KB 的页、3 层 B+ 树就能索引约 2000 万行——10 亿行的表也只需 4 到 5 次 I/O。而数据全部放在叶子层、叶子串成链表，范围扫描（「今天上午的订单」）顺着链表走就行。哈希索引做不到这件事，这就是数据库索引选 B+ 树不选哈希的根本原因。

还有一个反向思路值得知道：**LSM 树**干脆放弃原地更新——写入先进内存表，满了整体顺序刷盘，后台再合并。用「读要查多层」换「写没有随机 I/O」，写密集的日志与监控系统的标配。

## 7. 核心概念四：Trie——按字符走的前缀树

需求：输入法与搜索引擎的自动补全——「输入 ap，给出 app、apple、apply」。哈希表只能整串精确匹配，对「前缀」无能为力。Trie（字典树）让每个节点代表一个字符，从根到节点的路径拼出一个前缀：

```python
class Trie:
    class Node:
        __slots__ = ('children', 'is_end')
        def __init__(self):
            self.children = {}          # 字符 -> 子节点
            self.is_end = False         # 到此是否构成完整单词

    def __init__(self):
        self.root = Trie.Node()

    def insert(self, word):
        cur = self.root
        for ch in word:
            if ch not in cur.children:
                cur.children[ch] = Trie.Node()
            cur = cur.children[ch]
        cur.is_end = True

    def _find(self, s):
        cur = self.root
        for ch in s:
            if ch not in cur.children:
                return None
            cur = cur.children[ch]
        return cur

    def search(self, word):
        node = self._find(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find(prefix) is not None

    def autocomplete(self, prefix, limit=10):
        start = self._find(prefix)
        if start is None:
            return []
        result = []
        def dfs(node, path):
            if len(result) >= limit:
                return
            if node.is_end:
                result.append(prefix + path)
            for ch, child in node.children.items():
                dfs(child, path + ch)
        dfs(start, "")
        return result

t = Trie()
for w in ["apple", "app", "apply", "ape", "banana"]:
    t.insert(w)
print(t.search("app"), t.starts_with("ap"))   # True True
print(t.autocomplete("ap"))                   # ['app', 'apple', 'apply', 'ape']
```

查找、插入、前缀匹配都是 O(L)（L 为字符串长度），**与词典里有多少词无关**——这是「按结构走」对「按值比较」的碾压。代价是空间：键共享前缀多时（自然语言）很省，键毫无共享时（随机 ID）节点数爆炸，届时改用压缩版（Radix Tree，Linux 页缓存与 IP 路由用的就是它）。

## 8. 调试实录：树的四个高频坑

坑 1：**验证 BST 只查一层**。这是树题第一陷阱，代码看起来天衣无缝：

```python
def is_valid_bst_wrong(root):        # 错误！
    if root is None:
        return True
    if root.left and root.left.val >= root.val:
        return False
    if root.right and root.right.val <= root.val:
        return False
    return is_valid_bst_wrong(root.left) and is_valid_bst_wrong(root.right)
```

反例：

```text
    5
   / \
  1   8
     / \
    4   9
```

4 是 8 的左孩子（4 < 8 通过），但它同时待在 5 的**右子树**里，违反了「右子树全部大于 5」。规矩约束的是**整棵子树**，不是相邻父子。修正思路一：给递归传上下界 `(low, high)`，进入左子树就把上界收紧为当前值；思路二：中序遍历，检查结果是否严格递增（题图鉴 LC-98 有完整解法）。

坑 2：**递归遍历打爆调用栈**。链式歪斜到十万层的树，递归版遍历就是十万层递归。改用第 3 节的显式栈/队列迭代版，或保证结构平衡。

坑 3：**没意识到 BST 在退化**。用有序数据灌 BST 是常见事故（日志按时间戳顺序插入！）。要么插入前打乱，要么直接上自平衡树——第 4 节的 60 倍实验就是为你准备的醒脑剂。

坑 4：**Trie 拿去存随机字符串**。无共享前缀的键让 Trie 节点数接近「键数 × 长度」，内存远超哈希表。Trie 的主场是前缀与共享前缀丰富的场景，不是通用字典。

## 9. 修改实验

1. 给 TreeNode 加 `parent` 指针，实现「不递归、不用栈」的后继查找：给定 BST 中某节点，找出中序后继（有右子树走右子树最左；否则沿 parent 向上找到「自己是左孩子」的祖先），对照 `BSTIterator` 验证；
2. 实现镜像翻转（LC-226，题图鉴有解）：交换每个节点的左右子树，用翻转前后的中序遍历互为逆序来验证；
3. 把第 2 节的树序列化成字符串再用反序列化还原（前序 + 空位标记 `#`），用「还原后的前序遍历与原树相同」自检；
4. 用 BST 实现 `range_query(lo, hi)`：利用有序性剪枝（key < lo 就不走右子树、key > hi 就不走左子树），与「全树中序再过滤」对比节点访问次数。

## 10. 小练习

预测题（先写答案再运行）：依次插入 `[5, 3, 8, 1, 4, 7, 9]` 后，树的高度是多少？再依次插入 `[1, 2, 3, 4, 5, 6, 7]`，高度又是多少？两次的中序遍历输出分别是什么？

修改题：求二叉树的最大深度（LC-104）：递归版只需三行（空树 0，否则 1 + max(左深， 右深)）；再用 040 篇的层序队列写一版迭代（数层数），两版对照验证。

修 Bug 题：同事的 `is_valid_bst_wrong`（见第 8 节坑 1）对 `[5, 1, 8, null, null, 4, 9]` 这棵树返回 True。先手工复现这个错误结论，再分别用「上下界传递」与「中序递增检查」两种方法修复，两版互相验证。

挑战题（不看提示）：返回 BST 中第 k 小的元素（LC-230）：要求 O(h) 额外空间、插入删除后仍高效——把 BSTIterator 的栈保留在对象里，`kth(k)` 就是连续调用 k 次 `next`；进一步思考：如果 `kth` 调用极频繁，每个节点多存一个「子树节点数」字段，能否做到 O(h) 而不用逐个弹栈？

## 11. 什么时候应该 / 不应该用树

应该：既要按 key 查找又要有序遍历、范围查询、最大最小（TreeMap、订单与分数区间）；天然层次的数据（DOM、文件系统、组织架构、JSON）；字符串前缀场景（Trie）；磁盘索引（B+ 树）；写密集存储（LSM）。

不应该：只要精确查找不要顺序（哈希表 O(1) 更快）；只要「最重要的先出」（堆，[堆与优先队列](/algorithm/090-HeapAndPriorityQueue)）；只要「是否同属一伙」（并查集，[并查集](/algorithm/180-UnionFind)）。选型口诀：**精确查找哈希表，有序世界找树，优先级找堆，连通性找并查集**。

## 12. 与之前和之后的知识的关系

- 往前：040 篇的栈与队列分别驱动了 DFS 与层序遍历；070 篇的「要范围与顺序请去树下」在本文兑现，第 6 节也回答了「数据库索引为什么不用哈希」；
- 往后：[堆与优先队列](/algorithm/090-HeapAndPriorityQueue) 是「完全二叉树 + 数组存储」的特化，第 4 节完全二叉树的下标公式（父 i/2、孩子 2i 与 2i+1）在那里全力登场；[平衡树与高级树](/algorithm/100-BalancedTreeAdvanced) 接管 AVL、红黑、B 树、Splay、Treap 的完整实现；[线段树](/algorithm/190-SegmentTree) 与 [树状数组](/algorithm/200-FenwickTree) 是「区间统计」的专用树；
- 更远：编译原理的语法树、游戏引擎的场景图、Git 的提交历史 DAG——树的层次思想渗透在所有工程现场。

## 13. 官方文档与延伸资源

- VisuAlgo: BST/AVL（插入删除与旋转的逐步动画）：https://visualgo.net/en/bst
- Wikipedia: Binary search tree（删除三情形的图示）：https://en.wikipedia.org/wiki/Binary_search_tree
- 本站[算法题图鉴](/algorithms)收有本篇配套经典题：104 二叉树的最大深度、226 翻转二叉树、101 对称二叉树、102 二叉树的层序遍历、105 从前序与中序遍历构造二叉树、236 最近公共祖先、98 验证二叉搜索树、124 二叉树中的最大路径和，均带思路与参考实现。

## 14. 自我检查

- 能白板写出三种深度优先遍历并说出各自的典型用途；
- 能演示「升序插入导致退化」的实验并解释 60 倍差距从哪来；
- 能画出 BST 删除的三种情形，讲清中序后继为什么能保住有序性；
- 能对着场景（读多写少、写多读少、磁盘、写密集）为 AVL、红黑、B+ 树、LSM 排座次；
- 能指出「验证 BST 只查一层」的反例并给出两种正确解法。

## 本章总结

树用「每次一步选择」把查找压到 O(log n)，用中序遍历白送排序，代价是树形依赖插入顺序、可能退化成链表——自平衡家族（AVL 严格、红黑松散、B+ 树多叉、LSM 追加）用不同的代价封死退化，Trie 则把「按值比较」换成「按结构行走」专攻前缀。遍历的四种顺序各司其职，递归与栈/队列可以互相翻译。选型口诀：精确找哈希，有序找树，前缀找 Trie。

## 下一步

进入 [堆与优先队列](/algorithm/090-HeapAndPriorityQueue)：树的又一特化——完全二叉树直接躺进数组，父比子大（或小）一条性质，就撑起了「永远先处理最重要的」的优先级世界，也是本文删除「中序后继」思路的近亲。
