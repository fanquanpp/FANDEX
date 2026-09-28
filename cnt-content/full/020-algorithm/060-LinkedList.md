---
order: 70
title: "链表：改两根指针，不搬家"
module: 'algorithm'
category: 计算机科学
difficulty: intermediate
description: "以「播放列表频繁插歌删歌」引入：亲手把单链表建出来，用实测看清按位访问的代价，掌握哨兵节点、三指针反转、快慢指针三大技巧，双链表与 LRU 缓存、环形链表与约瑟夫问题，以及链表六大坑。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'algorithm/020-ArrayAndDynamicArray'
  - 'algorithm/040-StackAndQueue'
  - 'algorithm/070-HashTable'
  - 'algorithm/090-HeapAndPriorityQueue'
prerequisites:
  - 'algorithm/010-AlgorithmAnalysisBasics'
---

## 前置知识

- 已完成 [算法分析基础](/algorithm/010-AlgorithmAnalysisBasics)：会用大 O 描述代价；
- 了解数组的连续内存模型（[数组与动态数组](/algorithm/020-ArrayAndDynamicArray)）——链表是它的镜像对照。

## 学习目标

读完本文你将能够：

1. 用「指针」亲手实现一个单链表，并解释插入删除 O(1) 这个结论的前提（已知前驱）；
2. 独立写出三大高频子程序：哨兵节点删除、三指针反转、快慢指针（找中点、判环、找环入口）；
3. 用哈希表 + 双链表实现 LRU 缓存，说清为什么缺一不可；
4. 用环形链表解约瑟夫问题，并推导递推公式；
5. 识别链表的六大典型 bug（丢后继、丢尾指针、环上死循环等）并能自纠。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

你在给一个音乐播放器写播放列表：用户会频繁地在中间插歌、删歌、拖动调整顺序，但几乎不会说「给我第 8371 首歌」。用数组实现会很难受——[数组篇](/algorithm/020-ArrayAndDynamicArray)实测过，中间插入是 O(n)，一万首歌的列表每插一次就搬家五千次。

链表是这类「频繁中间增删、顺序遍历为主」需求的答案：数据存在一个个**节点**里，每个节点带一根指向下一节点的指针。插一首歌只需要改两根指针，一个节点都不用搬。代价是失去了「按下标一步到位」的能力——本文会用实验让你亲眼看到这笔交易的两端。

## 2. 最小可运行实验：把链表建出来，再和数组比一次

先建一个最朴素的单链表，并让它支持基本操作：

```python
class Node:
    """单链表节点：一个数据域，一根指针"""
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def build_chain(vals):
    """把列表建成链表，返回头节点。头插法：新节点总插在最前面"""
    head = None
    for v in reversed(vals):
        head = Node(v, head)
    return head

def to_list(head):
    """遍历链表，收集所有值"""
    result = []
    curr = head
    while curr:
        result.append(curr.val)
        curr = curr.next
    return result

chain = build_chain([1, 2, 3])
print(to_list(chain))   # [1, 2, 3]
```

注意 `build_chain` 里 `Node(v, head)` 的写法：新节点出生时就把指针接在旧头上，`head` 再回指新节点——**全程只动了两根指针，没有任何搬动**。这就是头部插入 O(1) 的全部秘密。

接着实测链表最痛的地方——按位置访问。数组的 `arr[99999]` 是一次寻址，链表只能从头数九万九千九百九十九步：

```python
import timeit

def walk_to(head, k):
    """从 head 出发走 k 步，返回到达的节点的值"""
    curr = head
    for _ in range(k):
        curr = curr.next
    return curr.val

arr = list(range(100000))
chain = build_chain(list(range(100000)))

print(arr[99999])             # 立即输出 99999
print(walk_to(chain, 99999))  # 逐个数，慢很多

t_arr = timeit.timeit(lambda: arr[99999], number=100000)
t_chain = timeit.timeit(lambda: walk_to(chain, 99999), number=1000)
print(f"数组取第 10 万元素 x10 万次: {t_arr:.3f}s")
print(f"链表数 10 万步     x1 千次: {t_chain:.3f}s")
```

预期输出（数值因机器而异，量级关系稳定）：

```text
99999
99999
数组取第 10 万元素 x10 万次: 0.005s
链表数 10 万步     x1 千次: 4.7s
```

读法：链表那次只重复了一千次，就已经比数组的十万次慢了近千倍——**单次数 10 万步约 47 微秒，数组单次寻址约 50 纳秒**，差三个数量级。这就是「链表用指针换灵活性」的账单。

## 3. 发生了什么：指针即线索，线索会断

链表像寻宝游戏：每个节点的线索卡上只写着「下一个节点在哪」。由此能推出一切性质：

| 操作 | 复杂度 | 前提 |
| --- | --- | --- |
| 头部插入/删除 | O(1) | 持有 head |
| 尾部插入 | O(1) | 额外维护尾指针 tail |
| 查找第 i 个 / 按值查找 | O(n) | 只能从头顺着数 |
| 已知前驱的插入/删除 | O(1) | **必须先站在 prev 上** |

最后一行是链表一切技巧的核心：`prev.next = prev.next.next` 一句话完成删除，但你必须先走 O(n) 步**找到 prev**。所以严格说法是「插入删除 O(1)，定位 O(n)」——「链表插入快」不带前提就是错的。

还有一个真实代价要诚实说：**缓存不友好**。数组连续存放，CPU 一次能预取一整段；链表节点散落在堆内存各处，每次跳转都可能 miss。这个差距在 Python 里被解释器开销掩盖，但在 C/C++ 里实测口径是：遍历 100 万个 int，数组约 1ms，链表约 5 到 10ms。工程选型时它是压过渐近复杂度的现实因素（第 13 节展开）。

## 4. 核心技巧一：哨兵节点——把头节点变成普通节点

需求：删掉链表里所有值为 2 的节点。难点在头节点没有「前驱」，普通删除逻辑对它不适用，要写特判。

哨兵（dummy head）的做法：在真正的头前面挂一个**不存数据的假节点**，之后所有真实节点都有前驱了，一套逻辑走天下：

```python
def remove_elements(head, val):
    dummy = Node(0, head)      # 假头，值随便填
    prev = dummy
    while prev.next:
        if prev.next.val == val:
            prev.next = prev.next.next   # 跳过待删节点
        else:
            prev = prev.next
    return dummy.next         # 真正的头可能已变，从假头后面取
```

逐步追踪（链表 `1 -> 2 -> 3`，删 2）：

| 步骤 | prev 站在 | prev.next 是 | 动作 | 链表状态 |
| --- | --- | --- | --- | --- |
| 初始 | dummy(0) | 1 | 1 不等于 2，prev 前进 | 0 -> 1 -> 2 -> 3 |
| 1 | 1 | 2 | 等于 2，执行跳过 | 0 -> 1 -> 3 |
| 2 | 1 | 3 | 3 不等于 2，prev 前进 | 0 -> 1 -> 3 |
| 3 | 3 | None | 循环结束 | 返回 dummy.next 即 1 -> 3 |

追踪时把两件事写清楚：**prev 站在哪个节点、即将检查哪个节点**。绝大多数链表 bug 源于把这两者混为一谈。写任何涉及删除、合并的链表代码，先加哨兵——这是投入产出比最高的一行。

## 5. 核心技巧二：反转链表——三指针与「先拍快照」

反转是链表的「第一礼仪」：`1 -> 2 -> 3` 变成 `3 -> 2 -> 1`。难点在于把 `curr.next` 改指向前驱的那一刻，原来的后继线索就断了——必须先拍快照：

```python
def reverse_list(head):
    prev, curr = None, head
    while curr:
        next_node = curr.next   # 第一步永远是拍快照
        curr.next = prev        # 掉头指向
        prev, curr = curr, next_node  # 双指针整体右移
    return prev
```

逐步追踪（`1 -> 2 -> 3`）：

| 轮次开头 | prev | curr | 快照 next_node | 执行后 |
| --- | --- | --- | --- | --- |
| 初始 | None | 1 | 2 | 1 -> None |
| 第 1 轮后 | 1 | 2 | 3 | 2 -> 1 -> None |
| 第 2 轮后 | 2 | 3 | None | 3 -> 2 -> 1 -> None |
| 第 3 轮后 | 3 | None | - | 循环结束，返回 prev = 3 |

递归版更短，但递归深度等于链表长度：

```python
def reverse_list_recursive(head):
    if not head or not head.next:
        return head
    new_head = reverse_list_recursive(head.next)
    head.next.next = head   # 让后继指回自己
    head.next = None        # 断开旧线索，防成环
    return new_head
```

Python 默认递归上限约 1000 层，10 万节点的链表会直接 `RecursionError`。递归版适合展示思路，工程与面试终稿用迭代版。

## 6. 核心技巧三：快慢指针——中点、判环与环入口

快慢指针是链题的第一技巧，一套思想覆盖四个高频题型。起点：两指针都从头出发，快的一次走 2 步，慢的一次走 1 步。

**找中点**——快指针到终点时，慢指针恰在中点：

```python
def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow
```

**判环**——链表若带环（尾节点指回中间某节点），朴素遍历 `while curr` 永不终止。快慢指针则像操场跑圈：只要跑道是环，跑得快的人终会从后面套圈追上慢的人；直线跑道上快的人先到终点，永不相遇。

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
```

**为何必相遇**：进入环后，快指针每轮比慢指针多走 1 步，两者的环上距离每轮严格减 1，至多环长 c 轮内必追上。正因为依赖「每轮减 1」，判环固定用 2 倍速——改成 3 倍速后距离每轮减 2，「必追上」的保证就没了（距离可能永远跳不过 0），不要自行换倍速。

**找环入口**（LC-142）——相遇后，一个指针回到 head，两个指针同速前进，再次相遇处就是环入口。依据是一个简单等式：设 head 到入口距离 a，入口到相遇点距离 b，环长 c。快指针走了慢指针两倍的步数，多走的全部落在环上，故 `a + b = k·c`，于是 `a = (k-1)·c + (c - b)`——从 head 走 a 步，与从相遇点走 (k-1) 圈再走 c-b 步，终点相同，都是入口。

```python
def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            ptr = head
            while ptr is not slow:
                ptr = ptr.next
                slow = slow.next
            return ptr
    return None
```

顺带一提：`while fast and fast.next` 与 `while fast.next and fast.next.next` 两种循环条件在偶数长度链表上取到的「中点」不同（前者取后一个中点，后者取前一个）。回文判断、归并切分对中点位置敏感，**固定一种写法**并用长度 1/2/3/4 的链表逐一验证，能省掉一类隐蔽 bug。

## 7. 调试实录：链表六大坑

### 坑 1：先改指针，后丢节点

`curr.next = curr.next.next` 直接覆盖，旧后继若无引用即永久丢失，链表从该处断裂。修正就是第 5 节的铁律：**先快照，再改指向**。

### 坑 2：删尾节点后忘记维护 tail

维护尾指针的实现里，删尾后必须回置 `tail`，否则尾部插入会接到已删除的节点上：

```python
class LinkedList:
    def __init__(self):
        self.head = self.tail = None

    def add_tail(self, val):
        node = Node(val)
        if self.tail is None:
            self.head = self.tail = node
        else:
            self.tail.next = node
            self.tail = node

    def remove_last(self):
        if self.head is None:
            return None
        if self.head is self.tail:            # 唯一节点
            val = self.head.val
            self.head = self.tail = None
            return val
        prev = self.head
        while prev.next is not self.tail:     # 走到倒数第二个
            prev = prev.next
        val = self.tail.val
        prev.next = None
        self.tail = prev                      # 关键：回置尾指针
        return val

lst = LinkedList()
for v in [1, 2, 3]:
    lst.add_tail(v)
lst.remove_last()
print(to_list(lst.head))                        # [1, 2]
lst.remove_last(); lst.remove_last()
print(lst.head is None and lst.tail is None)    # True
```

### 坑 3：带环链表上的朴素遍历死循环

带环链表不能用 `while curr` 遍历。除了快慢指针，还有一版 O(n) 空间的直观解法——哈希集合记足迹，调试时也好用：

```python
def has_cycle_set(head):
    seen = set()
    while head:
        if head in seen:
            return True
        seen.add(head)
        head = head.next
    return False
```

### 坑 4：C++ 手写链表的内存释放顺序

C++ 里每个 `new` 的节点都要 `delete`，且必须**先保存后继再释放**：

```cpp
// 错误：delete 之后再读 head->next，已释放内存
while (head) { delete head; head = head->next; }

// 正确：先拍快照
while (head) { ListNode* nxt = head->next; delete head; head = nxt; }
```

工程上优先用 `std::unique_ptr` 管理节点，析构自动级联释放。

### 坑 5：中点取前还是取后

见第 6 节末尾：两种循环条件、两种中点，回文与归并场景必须固定一种并验证长度 1 到 4 的边界。

### 坑 6：递归解法的栈深度

递归深度等于链表长度，Python 约 1000 层封顶。10 万节点的反转用递归会崩；递归写完应主动给出迭代版并说明取舍。

## 8. 综合演练：双链表与 LRU 缓存

单链表只认「下一个」。双链表给每个节点再加一根 `prev`，换来两项能力：O(1) 反向遍历、**已知节点 O(1) 删除自身**（不需要前驱，节点自己就知道前驱是谁）。

```python
class DNode:
    def __init__(self, key=0, val=0, prev=None, next=None):
        self.key, self.val = key, val
        self.prev, self.next = prev, next
```

能力落到真实需求上就是 LRU 缓存（LC-146）：容量有限，`get`/`put` 都要 O(1)，满了淘汰「最久未使用」的键。方案是两个结构各出一样绝活：

- 哈希表负责「按 key 一步定位」——没有它，找节点要 O(n)；
- 双链表负责「O(1) 调整新旧顺序」——没有它，把命中节点搬到「最近使用」端要 O(n)。

```python
class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.map = {}                 # key -> DNode
        self.head = DNode()           # 哨兵头：最近使用一侧
        self.tail = DNode()           # 哨兵尾：最久未用一侧
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_front(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)            # 从原位摘下
        self._add_front(node)         # 搬到最近使用端
        return node.val

    def put(self, key, value):
        if key in self.map:
            self._remove(self.map[key])
        node = DNode(key, value)
        self.map[key] = node
        self._add_front(node)
        if len(self.map) > self.cap:
            lru = self.tail.prev      # 哨兵尾的前一个就是最久未用
            self._remove(lru)
            del self.map[lru.key]

cache = LRUCache(2)
cache.put(1, 1)
cache.put(2, 2)
print(cache.get(1))   # 1，此时 1 成为最近使用
cache.put(3, 3)       # 容量满，淘汰最久未用的 2
print(cache.get(2))   # -1
```

注意头尾各挂一个哨兵：`_remove` 因此无需判断「是否头/尾节点」，四条指针赋值无条件成立——第 4 节的哨兵思想在双链表上的第二次兑现。工程实现里一般还会把节点放进对象池复用，避免高频分配释放（见第 13 节）。

## 9. 环形链表的正用：约瑟夫问题

环不总是 bug。n 个人围成一圈，从第 1 个开始报数，报到 m 的出列，求最后剩下的人——「转一圈回到起点」的语义用环形链表零成本表达。

数学解是一个递推：`f(n, m) = (f(n-1, m) + m) mod n`，`f(1, m) = 0`。推导（理解它，别背它）：

1. n 人编号 0 到 n-1，出列者是编号 `(m-1) mod n`；
2. 出列后剩 n-1 人，把出列者的下一位重新看作「0 号」，问题变成规模 n-1 的同构子问题，设其解为 f(n-1, m)；
3. 换算回原坐标系：子问题的 0 号对应原编号 `m mod n`，所以原编号 = `(f(n-1, m) + m) mod n`；
4. 只剩 1 人时幸存者编号为 0。

```python
def josephus_math(n, m):
    result = 0
    for i in range(2, n + 1):
        result = (result + m) % i
    return result + 1                     # 换回 1 起始编号

def josephus_simulate(n, m):
    people = list(range(1, n + 1))
    idx = 0
    while len(people) > 1:
        idx = (idx + m - 1) % len(people)
        people.pop(idx)
    return people[0]

print(josephus_math(5, 3), josephus_simulate(5, 3))   # 4 4
```

模拟出列顺序为 3, 1, 5, 2，幸存者 4，两解一致。数学解 O(n)，模拟解 O(nm)——小规模对拍验证、大规模用公式，是处理这类问题的标准姿势。

## 10. 经典题地图：从本文到题图鉴

掌握第 4 到 6 节的三大技巧后，链表经典题基本都能归位：

| 题型 | 核心技巧 | 代表题（LeetCode） |
| --- | --- | --- |
| 反转系列 | 三指针 | 206 反转链表、25 K 个一组翻转 |
| 合并系列 | 双指针归并 | 21 合并两个有序链表、23 合并 K 个 |
| 环检测 | 快慢指针 | 141 环形链表、142 环形链表 II |
| 定位删除 | 哨兵 + 快慢指针 | 19 删除倒数第 N 个 |
| 相交链表 | 双指针交叉遍历 | 160 相交链表 |
| 重排/回文 | 中点 + 反转 + 合并 | 143 重排链表、234 回文链表 |

本站的[算法题图鉴](/algorithms)收有上表全部 LeetCode 题的图解、思路与参考实现（反转、合并、判环、找入口、删倒数第 N、相交、重排、K 组翻转、LRU），适合逐题过；VisuAlgo 的链表可视化（见文末）能逐帧看指针变化。这里只保留两道图鉴未收、但很能练手的题。

**两数相加（LC-2）**：数字按逆序存进链表（个位在头），求和。核心是逐位相加加进位，**循环条件必须带上 carry**：

```python
def add_two_numbers(l1, l2):
    dummy = Node(0)
    curr, carry = dummy, 0
    while l1 or l2 or carry:
        s = (l1.val if l1 else 0) + (l2.val if l2 else 0) + carry
        carry, digit = divmod(s, 10)
        curr.next = Node(digit)
        curr = curr.next
        l1 = l1.next if l1 else None
        l2 = l2.next if l2 else None
    return dummy.next

# 342 + 465：(2->4->3) + (5->6->4)
h = add_two_numbers(build_chain([2, 4, 3]), build_chain([5, 6, 4]))
print(to_list(h))   # [7, 0, 8]，即 807
```

逐步追踪：第 1 轮 2+5=7 无进位；第 2 轮 4+6=10，本位 0 进位 1；第 3 轮 3+4+1=8。若删掉循环条件里的 `carry`，5+5 这类「等长且最高位进位」的输入会丢最高位——本题最高频的提交错误。

**旋转链表（LC-61）**：每个节点右移 k 位。技巧是先成环再断环：

```python
def rotate_right(head, k):
    if not head or not head.next or k == 0:
        return head
    n, tail = 1, head
    while tail.next:
        tail = tail.next
        n += 1
    k %= n                     # k 可达 10^9，先取模
    if k == 0:
        return head
    tail.next = head           # 成环
    new_tail = head
    for _ in range(n - k - 1): # 走到新尾（新头的前驱）
        new_tail = new_tail.next
    new_head = new_tail.next
    new_tail.next = None       # 断环
    return new_head

print(to_list(rotate_right(build_chain([1, 2, 3, 4, 5]), 2)))   # [4, 5, 1, 2, 3]
```

两个易错点：忘写 `k %= n`（k 极大时超时）；成环后忘断开（结果带环，评测死循环）。整个过程 O(n) 时间 O(1) 空间，比「逐步转 k 次」的 O(nk) 高效得多。

另外两个高频子程序直接给出，作为归并排序（链表版）与相交判断的积木：

```python
def merge_two_lists(l1, l2):
    """合并两个有序链表：归并排序的积木"""
    dummy = curr = Node(0)
    while l1 and l2:
        if l1.val <= l2.val:
            curr.next, l1 = l1, l1.next
        else:
            curr.next, l2 = l2, l2.next
        curr = curr.next
    curr.next = l1 or l2       # 剩下的整段直接接上
    return dummy.next

def get_intersection_node(headA, headB):
    """相交链表：pA 走完 A 走 B，pB 走完 B 走 A，必在交点相遇。
    正确性：两边步数同为 a+c+b 与 b+c+a，相等。"""
    if not headA or not headB:
        return None
    pA, pB = headA, headB
    while pA is not pB:
        pA = pA.next if pA else headB
        pB = pB.next if pB else headA
    return pA
```

## 11. 修改实验

1. 把 `find_middle` 的循环条件换成 `while fast.next and fast.next.next`，对长度 4 和 5 的链表分别输出中点，确认「取前/取后」的差异；
2. 给 `has_cycle` 加一个 3 倍速版本（`fast = fast.next.next.next`，注意判空），构造第 7 节坑 3 之外的带环链表对拍，观察两者都能检出，但用计时器比较收敛速度，体会「2 倍速每轮距离减 1」的收敛保证；
3. 用 `timeit` 对比「头部插入 10 万元素」：数组 `insert(0, x)` 循环 vs 本文头插法建链——数组会卡到怀疑人生，链表瞬间完成，这是链表的主场；
4. 把 LRU 缓存容量设为 1，连续 `put(1,1)`、`put(2,2)`、`get(1)`，手推每步的链表形状，再用代码验证你的推演。

## 12. 小练习

预测题（先写答案再运行）：

```python
a, b, c = Node(1), Node(2), Node(3)
a.next, b.next = b, c
b.next = a
print(to_list(a))
```

这段代码运行后输出什么？会不会停？为什么？（提示：此刻谁还指着 c。）

修改题：把 `remove_elements` 改成「重复元素保留一个」（LC-83：`1 -> 1 -> 2 -> 3 -> 3` 变 `1 -> 2 -> 3`），用有序输入验证；再想想为什么这题可以不加哨兵。

修改题：判断回文链表（LC-234，如 `1 -> 2 -> 2 -> 1` 是回文），要求 O(n) 时间 O(1) 额外空间。组合拳：快慢指针找中点、反转后半段、双指针比较、（可选）再反转还原。参考骨架：

```python
def is_palindrome(head):
    if not head or not head.next:
        return True
    slow = fast = head
    while fast.next and fast.next.next:   # slow 停在前半段末尾
        slow = slow.next
        fast = fast.next.next
    second_half = reverse_list(slow.next) # 复用第 5 节的三指针反转
    p1, p2, ok = head, second_half, True
    while p2:
        if p1.val != p2.val:
            ok = False
            break
        p1, p2 = p1.next, p2.next
    slow.next = reverse_list(second_half) # 还原链表
    return ok
```

用 `1 -> 2 -> 2 -> 1` 与 `1 -> 2 -> 3` 各验证一次，注意奇数长度时中点属于前半段、无需参与比较。

修 Bug 题：同事写的删除倒数第 N 个总是删错位置，代码是「先遍历求长度 n，再正向走 `n - n` 步删除」——指出逻辑错误，改用第 6 节的快慢指针间隔法或修正正向步数，用 `[1, 2, 3, 4, 5]`、n=2 验证输出 `[1, 2, 3, 5]`。

挑战题（不看提示）：实现「重排链表」`L0 -> Ln -> L1 -> Ln-1 -> ...`（LC-143），只用 O(1) 额外空间——组合第 6 节找中点、第 5 节反转、第 10 节合并三个子程序即可；用 `1 -> 2 -> 3 -> 4 -> 5` 验证输出 `1 -> 5 -> 2 -> 4 -> 3`。

## 13. 什么时候应该 / 不应该用链表

应该：频繁中间插删且持有前驱（或用双链表持有节点本身）、只需要顺序遍历、需要环形轮转语义（约瑟夫、轮转调度）、实现 LRU 这类「任意位置 O(1) 摘除」的复合结构。

不应该：按下标随机访问（数组的主场）；以查找为主的场景（哈希表，070 篇）。**工业界的默认答案是数组**：C++ 社区长期的经验是 `std::vector` 在绝大多数场景胜过 `std::list`，Python 标准库干脆没有链表类型、需要两端 O(1) 时用 `collections.deque`（分块双向链表，兼顾缓存与两端操作）。渐近复杂度只是选型的一半，缓存局部性是另一半。

两则值得知道的工程实现：一是 Linux 内核的侵入式链表 `list_head`——不是「节点里包含数据」，而是「数据结构里内嵌 prev/next 钩子」，同一个结构体能同时挂在多个链表上（进程既在就绪队列又在哈希桶里），靠 `container_of` 宏从钩子反推宿主地址；二是引用计数型内存管理（如 CPython）回收不了循环引用的双向链表，把「从属」方向声明为弱引用（`weakref`）或手动断环是标准解法。高频分配节点的场景（LRU、内存页管理）用对象池：预分配节点数组、空闲节点串成备用链，分配释放退化为两次指针赋值。

## 14. 与之前和之后的知识的关系

- 往前：数组篇的「连续内存」是本文一切对照的基准；010 篇的大 O 语言用来给「定位 O(n) + 操作 O(1)」拆账；
- 往后：[栈与队列](/algorithm/040-StackAndQueue) 本质是「限制操作位置的链表/数组」；[哈希表](/algorithm/070-HashTable) 的链地址法用链表解决冲突，LRU 是两者合作的巅峰；[堆与优先队列](/algorithm/090-HeapAndPriorityQueue) 提供合并 K 个有序链表的 O(N log k) 解法；
- 更远：操作系统内核的进程队列、内存页链，全是本文环形与双链表思想的工业级放大。

## 15. 官方文档与延伸资源

- collections.deque（Python 双端队列，头尾 O(1)）：https://docs.python.org/zh-cn/3/library/collections.html#collections.deque
- VisuAlgo: Linked List（逐步动画看指针变化）：https://visualgo.net/en/list
- Hello 算法（中文图解与多语言实现）：https://www.hello-algo.com/

## 16. 自我检查

- 能不看书写出：建链、哨兵删除、三指针反转、快慢指针找中点与判环；
- 能解释「插入删除 O(1)」的前提，以及缓存不友好为什么让数组在工程上常胜出；
- 能完整讲出 LRU 缓存中哈希表与双链表各负责什么；
- 能推导约瑟夫递推式并用模拟解对拍；
- 六大坑各能举出一个自己踩过或差点踩过的例子。

## 本章总结

链表把「顺序」从内存的连续性里解放出来，交给指针：换来已知前驱时 O(1) 的插删，付出按位访问 O(n) 与缓存不友好。三大技巧——哨兵统一边界、三指针反转、快慢指针——覆盖了绝大多数链表题；哈希表加双链表合作出 LRU，环形结构承接约瑟夫问题。选型口诀：随机访问找数组，中间插删找链表，按 key 秒查找哈希表。

## 下一步

进入 [栈与队列](/algorithm/040-StackAndQueue)：把本文的「限制操作位置」用到极致——只许一端进出的栈、一端进一端出的队列，以及它们如何撑起括号匹配、表达式求值与广度优先搜索。
