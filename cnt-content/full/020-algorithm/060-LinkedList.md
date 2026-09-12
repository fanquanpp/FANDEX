---
order: 60
title: 链表
module: 'algorithm'
category: 计算机科学
difficulty: intermediate
description: 单链表、双链表与环形链表的原理、操作复杂度分析与多语言实现，涵盖常见面试题型。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'algorithm/030-SortAlgorithm'
  - 'algorithm/050-SearchAlgorithm'
  - 'algorithm/070-HashTable'
  - 'algorithm/080-Tree'
prerequisites:
  - 'algorithm/010-AlgorithmAnalysisBasics'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [算法分析基础与学习路线](/algorithm/010-AlgorithmAnalysisBasics)

## 1. 链表概述

### 1.1 链表 vs 数组

链表和数组是两种最基本的线性数据结构，它们在内存模型上有根本差异：

| 维度         | 数组           | 链表                 |
| ------------ | -------------- | -------------------- |
| 内存布局     | 连续           | 离散（通过指针连接） |
| 随机访问     | O(1)           | O(n)                 |
| 头部插入     | O(n)           | O(1)                 |
| 尾部插入     | O(1) amortized | O(n)/O(1)(有尾指针)  |
| 任意位置插入 | O(n)           | O(1)(已知前驱)       |
| 缓存局部性   | 好             | 差                   |
| 空间开销     | 无额外         | 每节点多一个指针     |

### 1.2 缓存局部性分析

数组在内存中连续存储，CPU缓存行（通常64字节）可以预取相邻元素，缓存命中率高。链表节点分散在堆内存各处，每次访问可能触发缓存未命中。

实际性能差异：遍历100万个int元素，数组约1ms，链表约5-10ms（取决于内存分配器）。

**类比**：数组像一排编了号的储物柜——知道编号就能一步走到任意柜子；链表像寻宝游戏——每个线索只写着"下一条线索在哪儿"，想找第 100 条线索必须依次走过前 99 条。这就是"随机访问 $O(1)$ vs $O(n)$"的直观来源，也解释了为什么链表"删除/插入只需改动一两根指针"：换掉某条线索上的字条即可，不必搬动后面的所有柜子。

### 1.3 学习目标

完成本文档学习后，你应当能够：

1. **说出**单链表、双链表、循环链表各自支持的操作及时间复杂度，并解释"已知前驱时插入删除 $O(1)$"这一结论的前提；
2. **手写**反转链表（迭代与递归）、快慢指针找中点、判环与找环入口、合并两个有序链表五个核心子程序，且能逐步追踪每一步指针变化；
3. **运用**哨兵节点（dummy head）统一边界处理，解决删除、合并、分组翻转类面试题；
4. **推导**环入口公式的数学证明与约瑟夫问题递推式 $f(n,m) = (f(n-1,m)+m) \bmod n$；
5. **识别**链表题的六大常见陷阱（丢后继、丢尾指针、环上死循环、内存泄漏、中点奇偶差异、递归栈深）并给出修正方案。

> 跨模块引用：链表在哈希表冲突处理中的应用参见 [哈希表](/algorithm/070-HashTable)。C++ STL list的实现参见 [C++基础](/cpp/030-CppBasicSyntax)。

---

## 2. 单链表

### 2.1 节点定义与基本操作

单链表每个节点包含数据域和指向下一个节点的指针域。

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class SinglyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0

    def add_at_head(self, val):
        node = ListNode(val, self.head)
        self.head = node
        if self.tail is None:
            self.tail = node
        self.size += 1

    def add_at_tail(self, val):
        node = ListNode(val)
        if self.tail is None:
            self.head = self.tail = node
        else:
            self.tail.next = node
            self.tail = node
        self.size += 1

    def delete_at_head(self):
        if self.head is None:
            return None
        val = self.head.val
        self.head = self.head.next
        if self.head is None:
            self.tail = None
        self.size -= 1
        return val

    def find(self, val):
        curr = self.head
        while curr:
            if curr.val == val:
                return curr
            curr = curr.next
        return None

    def to_list(self):
        result = []
        curr = self.head
        while curr:
            result.append(curr.val)
            curr = curr.next
        return result
```

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v) : val(v), next(nullptr) {}
};

class SinglyLinkedList {
    ListNode* head;
    ListNode* tail;
    int sz;
public:
    SinglyLinkedList() : head(nullptr), tail(nullptr), sz(0) {}

    void addAtHead(int val) {
        ListNode* node = new ListNode(val);
        node->next = head;
        head = node;
        if (!tail) tail = node;
        sz++;
    }

    void addAtTail(int val) {
        ListNode* node = new ListNode(val);
        if (!tail) head = tail = node;
        else { tail->next = node; tail = node; }
        sz++;
    }

    int deleteAtHead() {
        if (!head) return -1;
        int val = head->val;
        ListNode* tmp = head;
        head = head->next;
        delete tmp;
        if (!head) tail = nullptr;
        sz--;
        return val;
    }

    ListNode* find(int val) {
        ListNode* curr = head;
        while (curr) {
            if (curr->val == val) return curr;
            curr = curr->next;
        }
        return nullptr;
    }
};
```

### 2.2 哨兵节点（Dummy Head）

哨兵节点是一个不存储实际数据的头节点，用于简化边界处理：

```python
def remove_elements(head, val):
    dummy = ListNode(0, head)
    prev = dummy
    while prev.next:
        if prev.next.val == val:
            prev.next = prev.next.next
        else:
            prev = prev.next
    return dummy.next
```

不使用哨兵时，删除头节点需要特殊处理；使用哨兵后，所有删除操作统一为"删除prev.next"。

**逐步追踪**（删除值为 2 的节点，链表 `1 -> 2 -> 3`）：

| 步骤 | prev | prev.next | 动作 | 链表状态 |
| ---- | ---- | --------- | ---- | -------- |
| 初始 | dummy(0) | 1 | 1 != 2，prev 前进 | 0 -> 1 -> 2 -> 3 |
| 1 | 1 | 2 | 2 == 2，执行 `prev.next = prev.next.next` | 0 -> 1 -> 3 |
| 2 | 1 | 3 | 3 != 2，prev 前进 | 0 -> 1 -> 3 |
| 3 | 3 | None | 循环结束，返回 `dummy.next` | 1 -> 3 |

追踪时建议把"prev 站在哪个节点、即将检查哪个节点"两件事写清楚——绝大多数链表 bug 都源于把这两者混为一谈。

### 2.3 O(1) 删除给定节点：欺骗式删除及其局限

常规删除需要前驱，但面试中有一道经典变体（LeetCode 237）：只给你待删节点的指针，不给头节点。解法是"欺骗式删除"——不删当前节点，而是把下一个节点复制过来再删掉下一个：

```python
def delete_node(node):
    """O(1) 删除给定节点（该节点不能是尾节点）"""
    node.val = node.next.val      # 用后继的值覆盖当前节点
    node.next = node.next.next    # 跳过后继节点
```

**局限必须说清楚**：一是尾节点无法处理（没有后继可复制）；二是若外部还持有指向原后继的引用，会观察到节点被"偷梁换柱"。这道题考察的是对"链表中节点的身份由指针定义"的理解，工程代码中不推荐这种语义含糊的写法。

### 2.4 复杂度分析

| 操作               | 时间 | 空间 |
| ------------------ | ---- | ---- |
| 头部插入           | O(1) | O(1) |
| 尾部插入(有尾指针) | O(1) | O(1) |
| 尾部插入(无尾指针) | O(n) | O(1) |
| 查找               | O(n) | O(1) |
| 删除(已知前驱)     | O(1) | O(1) |
| 删除(已知节点指针) | O(n) | O(1) |

---

## 3. 双链表

### 3.1 节点定义与基本操作

双链表每个节点额外包含指向前驱节点的指针，支持双向遍历。

```python
class DoublyListNode:
    def __init__(self, val=0, prev=None, next=None):
        self.val = val
        self.prev = prev
        self.next = next

class DoublyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None

    def add_at_head(self, val):
        node = DoublyListNode(val, None, self.head)
        if self.head:
            self.head.prev = node
        else:
            self.tail = node
        self.head = node

    def add_at_tail(self, val):
        node = DoublyListNode(val, self.tail, None)
        if self.tail:
            self.tail.next = node
        else:
            self.head = node
        self.tail = node

    def remove_node(self, node):
        if node.prev:
            node.prev.next = node.next
        else:
            self.head = node.next
        if node.next:
            node.next.prev = node.prev
        else:
            self.tail = node.prev
```

```cpp
struct DoublyListNode {
    int val;
    DoublyListNode* prev;
    DoublyListNode* next;
    DoublyListNode(int v) : val(v), prev(nullptr), next(nullptr) {}
};

class DoublyLinkedList {
    DoublyListNode* head;
    DoublyListNode* tail;
public:
    DoublyLinkedList() : head(nullptr), tail(nullptr) {}

    void addAtHead(int val) {
        auto node = new DoublyListNode(val);
        node->next = head;
        if (head) head->prev = node;
        else tail = node;
        head = node;
    }

    void addAtTail(int val) {
        auto node = new DoublyListNode(val);
        node->prev = tail;
        if (tail) tail->next = node;
        else head = node;
        tail = node;
    }

    void removeNode(DoublyListNode* node) {
        if (node->prev) node->prev->next = node->next;
        else head = node->next;
        if (node->next) node->next->prev = node->prev;
        else tail = node->prev;
        delete node;
    }
};
```

### 3.2 LRU缓存中的双链表应用

LRU（Least Recently Used）缓存使用哈希表+双链表实现O(1)的get和put操作：

```python
class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = {}
        self.head = DoublyListNode()
        self.tail = DoublyListNode()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_to_front(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._add_to_front(node)
        return node.val

    def put(self, key, value):
        if key in self.cache:
            self._remove(self.cache[key])
            del self.cache[key]
        node = DoublyListNode(value)
        node.key = key
        self._add_to_front(node)
        self.cache[key] = node
        if len(self.cache) > self.cap:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]
```

注意头尾各挂一个哨兵：`_remove` 因此无需判断"是否为头/尾节点"，四个指针赋值无条件成立——这正是哨兵思想在双链表上的价值。get/put 均为 $O(1)$：哈希表负责"按 key 一步定位"，双链表负责"$O(1)$ 调整新旧顺序"，两者缺一不可。

> 跨模块引用：LRU缓存的完整分析参见 [哈希表](/algorithm/070-HashTable)。

### 3.3 单链表 vs 双链表：逐操作对比

| 操作 | 单链表 | 双链表 |
| ---- | ------ | ------ |
| 已知前驱插入/删除 | $O(1)$ | $O(1)$ |
| 已知节点删除自身 | $O(n)$（需找前驱） | $O(1)$ |
| 反向遍历 | 不支持 | $O(n)$ |
| 每节点空间开销 | 1 个指针 | 2 个指针 |
| LRU 这类"频繁删任意节点"场景 | 需配合哈希表存前驱，实现繁琐 | 直接 $O(1)$，工业标准做法 |

选型经验：需要"删给定节点"或双向遍历（如浏览器前进后退、文本编辑器撤销栈）选双链表；只做单向扫描（如邻接表、流式处理）选单链表省内存。

---

## 4. 环形链表

### 4.1 循环链表结构

循环链表的尾节点指向头节点，形成环。常用于操作系统进程调度（轮转调度）、约瑟夫问题等。与普通链表相比，循环链表的遍历终止条件从 `curr != None` 变为"回到出发点"，任何节点都可以充当入口——这一性质让"轮转"语义（转一圈回到起点）可以零成本表达。

### 4.2 约瑟夫问题

n个人围成一圈，从第1个人开始报数，报到m的人出列，求最后剩下的人。

**数学解法**：f(n,m) = (f(n-1,m) + m) % n，f(1,m) = 0

**递推式的直觉推导**（这是理解该公式的关键，不是死记）：

1. 给 $n$ 个人编号 $0 \dots n-1$，从 0 开始报数，报到 $m-1$ 的人（第 $m$ 个）出列，出列者是编号 $(m-1) \bmod n$；
2. 出列后剩下 $n-1$ 人。把出列者的下一位重新看作"0 号"，问题变成规模为 $n-1$ 的同构子问题——设其解为 $f(n-1, m)$（这是子问题坐标系下的编号）；
3. 把子问题的坐标系换回原坐标系：子问题的 0 号对应原坐标的 $m \bmod n$ 号，因此原坐标编号 = $(f(n-1,m) + m) \bmod n$；
4. 边界：只剩 1 人时，幸存者编号为 0，即 $f(1,m)=0$。

```python
def josephus_math(n, m):
    result = 0
    for i in range(2, n + 1):
        result = (result + m) % i
    return result + 1

def josephus_simulate(n, m):
    people = list(range(1, n + 1))
    idx = 0
    while len(people) > 1:
        idx = (idx + m - 1) % len(people)
        people.pop(idx)
    return people[0]
```

**交叉验证**（$n=5, m=3$）：模拟出列顺序为 3, 1, 5, 2，幸存者 4；数学解 `josephus_math(5, 3)` 返回 4。两者一致，建议用 $n \le 8$ 的小规模对拍验证实现。

复杂度：数学解O(n)，模拟解O(nm)。

```cpp
int josephusMath(int n, int m) {
    int result = 0;
    for (int i = 2; i <= n; i++) {
        result = (result + m) % i;
    }
    return result + 1;
}
```

复杂度：数学解O(n)，模拟解O(nm)。

---

## 5. 经典操作与技巧

### 5.1 快慢指针

快慢指针是链表最核心的技巧，两个指针以不同速度前进。

**找中点**：快指针走两步，慢指针走一步，快指针到末尾时慢指针在中点。

**判环**：快慢指针相遇则存在环。

**找环入口**：快慢指针相遇后，一个指针从头部出发，另一个从相遇点出发，两者相遇即为环入口。

```python
def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False

def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            ptr = head
            while ptr != slow:
                ptr = ptr.next
                slow = slow.next
            return ptr
    return None
```

```cpp
ListNode* findMiddle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

bool hasCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            ListNode* ptr = head;
            while (ptr != slow) { ptr = ptr->next; slow = slow->next; }
            return ptr;
        }
    }
    return nullptr;
}
```

**类比**：操场跑道上，跑得快的人终会从后面"套圈"追上跑得慢的人——只要跑道是环，快慢必相遇；反之在直线跑道（无环链表）上，快指针先到终点，永不相遇。这就是判环的正确性直觉。

**找中点逐步追踪**（链表 `1 -> 2 -> 3 -> 4 -> 5`，偶数长度 6 时见下）：

| 轮次 | slow 指向 | fast 指向 | 循环条件 fast/ fast.next |
| ---- | --------- | --------- | ------------------------ |
| 初始 | 1 | 1 | 成立 |
| 1 | 2 | 3 | 成立 |
| 2 | 3 | 5 | fast.next 为 None，退出 |

返回 slow = 3，即 5 个节点的中点（第 3 个）。若链表为 `1 -> 2 -> 3 -> 4`，追踪结束条件在 fast 指向 4、fast.next 为 None 时触发，slow = 3——即偶数长度取"后一个中点"，这与 7.5 节陷阱 5 的讨论直接相关。

**判环为何必相遇**：进入环后，快指针每轮比慢指针多走 1 步，两者的"环上距离"每轮严格减 1（模环长 c），故至多 $c$ 轮内必相遇。若快指针每次走 3 步，"距离"每轮减 2，当 c 为偶数时可能从 0 跳到 c-1 再跳回 0 之外形成 2-周期 miss——因此判环代码固定用"2 倍速"，不要自行改成其他倍速。

**环入口的数学证明**：设head到环入口距离为a，环入口到相遇点距离为b，环长度为c。慢指针走到相遇点共走 a+b 步，快指针走 2(a+b) 步，多走的 a+b 全部消耗在环上，故 a+b 是环长 c 的整数倍：a+b = kc。于是：

$$a = kc - b = (k-1)c + (c - b)$$

其中 $c - b$ 恰是"相遇点沿环前进到环入口"的距离。这个等式说明：从 head 出发走 $a$ 步，与从相遇点出发走 $(k-1)c + (c-b)$ 步（即沿环走 $(k-1)$ 圈再走 $c-b$ 步），终点都是环入口。这正是 `detect_cycle` 中两个同速指针从 head 与相遇点同时出发、必在环入口相遇的原理。

### 5.2 反转链表

```python
def reverse_list(head):
    prev = None
    curr = head
    while curr:
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node
    return prev

def reverse_list_recursive(head):
    if not head or not head.next:
        return head
    new_head = reverse_list_recursive(head.next)
    head.next.next = head
    head.next = None
    return new_head

def reverse_between(head, left, right):
    dummy = ListNode(0, head)
    prev = dummy
    for _ in range(left - 1):
        prev = prev.next
    curr = prev.next
    for _ in range(right - left):
        next_node = curr.next
        curr.next = next_node.next
        next_node.next = prev.next
        prev.next = next_node
    return dummy.next
```

```cpp
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr) {
        ListNode* nextNode = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nextNode;
    }
    return prev;
}

ListNode* reverseBetween(ListNode* head, int left, int right) {
    ListNode* dummy = new ListNode(0);
    dummy->next = head;
    ListNode* prev = dummy;
    for (int i = 0; i < left - 1; i++) prev = prev->next;
    ListNode* curr = prev->next;
    for (int i = 0; i < right - left; i++) {
        ListNode* nextNode = curr->next;
        curr->next = nextNode->next;
        nextNode->next = prev->next;
        prev->next = nextNode;
    }
    return dummy->next;
}
```

**反转链表逐步追踪**（链表 `1 -> 2 -> 3`，迭代版三指针）：

| 轮次开头 | prev | curr | next_node（先行保存） | 执行后 |
| -------- | ---- | ---- | -------------------- | ------ |
| 初始 | None | 1 | 2 | 1->None |
| 第1轮后 | 1 | 2 | 3 | 2->1->None |
| 第2轮后 | 2 | 3 | None | 3->2->1->None |
| 第3轮后 | 3 | None | - | 循环结束，返回 prev=3 |

注意 `next_node = curr.next` 永远是第一步：它是在给"唯一的后继线索"拍快照，之后 `curr.next = prev` 才敢覆盖这条线索。7.1 节的错误版本正是省略了这一步。

### 5.3 合并有序链表

```python
def merge_two_lists(l1, l2):
    dummy = ListNode()
    curr = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            curr.next = l1
            l1 = l1.next
        else:
            curr.next = l2
            l2 = l2.next
        curr = curr.next
    curr.next = l1 or l2
    return dummy.next

def merge_k_lists(lists):
    import heapq
    dummy = ListNode()
    curr = dummy
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))
    while heap:
        val, i, node = heapq.heappop(heap)
        curr.next = node
        curr = curr.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

```cpp
ListNode* mergeTwoLists(ListNode* l1, ListNode* l2) {
    ListNode dummy(0);
    ListNode* curr = &dummy;
    while (l1 && l2) {
        if (l1->val <= l2->val) { curr->next = l1; l1 = l1->next; }
        else { curr->next = l2; l2 = l2->next; }
        curr = curr->next;
    }
    curr->next = l1 ? l1 : l2;
    return dummy.next;
}
```

---

## 6. 经典面试题型

### 6.1 题型分类与解题模板

| 题型     | 核心技巧         | 代表题目     |
| -------- | ---------------- | ------------ |
| 反转系列 | 迭代/递归反转    | LC-206/92/25 |
| 合并系列 | 双指针归并       | LC-21/23     |
| 环检测   | 快慢指针         | LC-141/142   |
| 相交链表 | 双指针交叉遍历   | LC-160       |
| 回文链表 | 快慢指针+反转    | LC-234       |
| 删除节点 | 哨兵+双指针      | LC-19/203/83 |
| 排序链表 | 归并排序         | LC-148       |
| 重排链表 | 找中点+反转+合并 | LC-143       |

### 6.2 相交链表（LC-160）

两个链表在某节点相交后共享后续节点。双指针交叉遍历：pA走完A后走B，pB走完B后走A，两者必在交点相遇（或同时为None）。

```python
def get_intersection_node(headA, headB):
    if not headA or not headB:
        return None
    pA, pB = headA, headB
    while pA != pB:
        pA = pA.next if pA else headB
        pB = pB.next if pB else headA
    return pA
```

```cpp
ListNode* getIntersectionNode(ListNode* headA, ListNode* headB) {
    if (!headA || !headB) return nullptr;
    ListNode *pA = headA, *pB = headB;
    while (pA != pB) {
        pA = pA ? pA->next : headB;
        pB = pB ? pB->next : headA;
    }
    return pA;
}
```

**正确性证明**：设A独有a个节点，B独有b个节点，共享c个节点。pA走a+c+b步，pB走b+c+a步，两者步数相等，必在交点相遇。

### 6.3 删除链表倒数第N个节点（LC-19）

快指针先走n步，然后快慢指针同时前进，快指针到末尾时慢指针在倒数第n+1个位置。

```python
def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n):
        fast = fast.next
    while fast.next:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next
```

```cpp
ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode* dummy = new ListNode(0);
    dummy->next = head;
    ListNode *fast = dummy, *slow = dummy;
    for (int i = 0; i < n; i++) fast = fast->next;
    while (fast->next) { fast = fast->next; slow = slow->next; }
    ListNode* toDelete = slow->next;
    slow->next = slow->next->next;
    delete toDelete;
    return dummy->next;
}
```

### 6.4 回文链表（LC-234）

找中点 -> 反转后半部分 -> 双指针比较 -> 恢复（可选）

```python
def is_palindrome(head):
    if not head or not head.next:
        return True
    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    second_half = reverse_list(slow.next)
    p1, p2 = head, second_half
    result = True
    while p2:
        if p1.val != p2.val:
            result = False
            break
        p1 = p1.next
        p2 = p2.next
    slow.next = reverse_list(second_half)
    return result
```

### 6.5 K个一组翻转链表（LC-25）

```python
def reverse_k_group(head, k):
    def get_kth(node, k):
        while node and k > 0:
            node = node.next
            k -= 1
        return node

    dummy = ListNode(0, head)
    group_prev = dummy
    while True:
        kth = get_kth(group_prev, k)
        if not kth:
            break
        group_next = kth.next
        prev, curr = kth.next, group_prev.next
        while curr != group_next:
            next_node = curr.next
            curr.next = prev
            prev = curr
            curr = next_node
        tmp = group_prev.next
        group_prev.next = kth
        group_prev = tmp
    return dummy.next
```

### 6.6 两数相加（LC-2）

数字按**逆序**存储在链表中（个位在头），求和并返回同格式链表。核心是"逐位相加 + 进位"，注意循环条件要包含 `carry`——它决定了结果的最高位：

```python
def add_two_numbers(l1, l2):
    """两数相加（LC-2）：数字按逆序存储，返回和的逆序链表"""
    dummy = ListNode()
    curr = dummy
    carry = 0
    while l1 or l2 or carry:
        s = (l1.val if l1 else 0) + (l2.val if l2 else 0) + carry
        carry, digit = divmod(s, 10)      # 进位与本位一次算出
        curr.next = ListNode(digit)
        curr = curr.next
        l1 = l1.next if l1 else None
        l2 = l2.next if l2 else None
    return dummy.next
```

**逐步追踪**（342 + 465，即 `(2->4->3) + (5->6->4)`）：

| 轮 | l1 / l2 当前位 | s = 和 + 进位 | 本位输出 | carry |
| -- | -------------- | ------------- | -------- | ----- |
| 1 | 2 / 5 | 7 | 7 | 0 |
| 2 | 4 / 6 | 10 | 0 | 1 |
| 3 | 3 / 4 | 8 | 8 | 0 |

输出 `7 -> 0 -> 8`，即 807。若删掉循环条件中的 `carry`，当两链等长且最高位产生进位（如 5 + 5 = 10）时会丢失最高位——这是本题最高频的提交错误。

时间 $O(\max(m, n))$，空间 $O(1)$（不计输出）。

### 6.7 旋转链表（LC-61）

将链表每个节点向右移动 k 个位置。技巧是**先成环再断环**：遍历求长度 n 并找到尾节点，`k %= n` 后将尾节点接到头节点形成环，再走 `n - k - 1` 步找到新尾，从新尾处断开：

```python
def rotate_right(head, k):
    """旋转链表（LC-61）：每个节点右移 k 位"""
    if not head or not head.next or k == 0:
        return head
    n = 1
    tail = head
    while tail.next:
        tail = tail.next
        n += 1
    k %= n                 # k 可能大于 n，先取模
    if k == 0:
        return head
    tail.next = head       # 成环
    new_tail = head
    for _ in range(n - k - 1):   # 走到新尾（新头的前驱）
        new_tail = new_tail.next
    new_head = new_tail.next
    new_tail.next = None   # 断环
    return new_head
```

两个易错点：一是忘记 `k %= n`（k 可达 $10^9$，直接走 k 步会超时）；二是成环后忘记断开，导致结果链表带环、评测死循环。整个过程只需一次遍历求长度加一次定位，时间 $O(n)$、空间 $O(1)$，比"逐步旋转 k 次"的 $O(nk)$ 做法高效得多。

---

## 7. 常见陷阱与调试

链表题的大多数错误源于指针操作顺序不当或边界遗漏。以下按出现频率排列六个典型陷阱。

### 7.1 陷阱 1：先改指针，后丢节点

**错误代码**（反转链表）：

```python
def reverse_list_wrong(head):
    curr = head
    while curr:
        curr.next = curr.next.next  # 错误：旧的后继直接丢失
        curr = curr.next
    return head
```

`curr.next` 一旦被覆盖，原后继节点若无其他引用便无法找回，链表从该处断裂。**修正**：先用临时变量保存后继，再改指针——反转三指针法中 `next_node = curr.next` 必须放在第一步。

### 7.2 陷阱 2：删除尾节点后忘记维护尾指针

维护 `tail` 指针的实现中，删除尾节点（或删除唯一节点）后必须回置 `tail`：

```python
class LinkedListWithTail(SinglyLinkedList):
    """在 2.1 节实现的基础上补充尾部删除"""

    def remove_last(self):
        if self.head is None:
            return None
        if self.head is self.tail:          # 唯一节点
            val = self.head.val
            self.head = self.tail = None
            self.size -= 1
            return val
        prev = self.head
        while prev.next is not self.tail:   # 找倒数第二个节点
            prev = prev.next
        val = self.tail.val
        prev.next = None
        self.tail = prev                    # 关键：更新尾指针
        self.size -= 1
        return val

# 测试
lst = LinkedListWithTail()
for v in [1, 2, 3]:
    lst.add_at_tail(v)
lst.remove_last()
print(lst.to_list())   # 输出: [1, 2]
lst.remove_last(); lst.remove_last()
print(lst.head is None and lst.tail is None)  # 输出: True
```

### 7.3 陷阱 3：环链表上的普通遍历死循环

带环链表不能用 `while curr` 这类朴素遍历——尾节点不指向 `None`，循环永不终止。判环必须用快慢指针（见 5.1 节）；调试时可设置步数上限或用哈希集合记录访问过的节点：

```python
def has_cycle_set(head):
    """哈希集合判环：O(n) 时间、O(n) 空间，直观易懂"""
    seen = set()
    while head:
        if head in seen:
            return True
        seen.add(head)
        head = head.next
    return False
```

### 7.4 陷阱 4：C++ 手写链表的内存泄漏

C++ 中每个 `new` 出的节点都必须 `delete`。删除节点时先保存待删指针再前进，否则悬空：

```cpp
// 错误：delete 前已覆盖指针
void clear_wrong() {
    while (head) {
        delete head;
        head = head->next;   // 未定义行为：使用已释放内存
    }
}

// 正确：先保存后继
void clear() {
    while (head) {
        ListNode* nxt = head->next;
        delete head;
        head = nxt;
    }
    tail = nullptr;
    sz = 0;
}
```

工程实践中优先使用 `std::unique_ptr<Node>` 管理节点生命周期，析构自动级联释放（深链表需注意递归析构深度）。

### 7.5 陷阱 5：快慢指针求中点的奇偶差异

`while fast and fast.next` 与 `while fast.next and fast.next.next` 两种写法在偶数长度链表上取到的"中点"不同（前者取后一个，后者取前一个）。回文判断、归并排序切分对中点位置敏感，混用两种写法是隐蔽 bug 的常见来源。建议固定一种写法并用长度 1/2/3/4 的链表逐一验证。

### 7.6 陷阱 6：递归解法的栈深度限制

递归反转、递归回文判断等写法递归深度等于链表长度。Python 默认递归上限约 1000 层，10 万节点的链表会触发 `RecursionError`；C++ 上深度链表递归则有栈溢出风险。面试中可提递归解法展示思路，但应主动说明其空间代价 $O(n)$ 并给出迭代版本。

---

## 8. 工程实践

### 8.1 Linux 内核的侵入式链表（list_head）

工程中最著名的链表实现是 Linux 内核的 `list_head`：它不是"节点里包含数据"，而是"数据结构里内嵌链表钩子"：

```c
// 简化示意：侵入式双向循环链表
struct list_head {
    struct list_head *prev, *next;
};

// 使用者把 list_head 内嵌在自己的结构体里
struct task {
    int pid;
    struct list_head run_list;   // 钩子
};

// 由钩子指针反推宿主结构体地址（container_of 技巧）
#define container_of(ptr, type, member) \
    ((type *)((char *)(ptr) - offsetof(type, member)))
```

这种"侵入式"设计的好处：同一个结构体可以同时挂在多个链表上（进程既在就绪队列又在哈希桶里）、链表操作不涉及内存分配（无锁失败点）、对数据类型零侵入（宏与 `offsetof` 完成类型擦除）。对比本文 2.1 节的"节点包含数据"写法，可以体会教学实现与工业实现的关注点差异。

### 8.2 缓存不友好是真实代价

1.1 节给出的性能差（遍历 100 万元素数组 1ms vs 链表 5-10ms）在工业选型中的含义是：**默认选数组，除非有明确的频繁中间插入/删除需求**。C++ 标准库的实践佐证：`std::vector` 在绝大多数场景胜过 `std::list`，以致 Herb Sutter 等人公开建议"几乎总是别用 std::list"；Python 的 `list` 底层干脆是动态数组，标准库根本没有链表类型，需要链表语义时用 `collections.deque`（双向块链表，兼顾缓存与两端 $O(1)$）。

### 8.3 节点内存管理：对象池与智能指针

高频分配/释放节点的场景（LRU 缓存、内存页管理）建议使用对象池（memory pool）：预分配节点数组，用空闲链表串起回收节点，`allocate`/`free` 退化为两次指针赋值，既避免 malloc 抖动，又让节点地址集中、改善缓存命中。C++ 中亦可用 `std::unique_ptr` 自动管理节点生命周期（见 7.4 节），但深链表的递归析构需改写为迭代。

### 8.4 GC 语言的环引用问题

带环链表（含双向链表的两个哨兵互指）在引用计数型 GC（如 CPython 主 GC 补以分代回收、Swift ARC）中可能无法自动回收：循环引用使计数永不为零。CPython 的 `weakref`、Apple 的 `weak` 引用是标准解法——把"从属"方向的指针声明为弱引用，只保留"主导"方向的强引用。7.3 节"手动断环"的调试技巧与这一问题同源。

---

## 9. 链表操作速查表

| 操作           | 时间     | 空间 | 关键技巧                   |
| -------------- | -------- | ---- | -------------------------- |
| 头部插入       | O(1)     | O(1) | 直接操作head               |
| 尾部插入       | O(1)\*   | O(1) | 维护tail指针               |
| 查找           | O(n)     | O(1) | 线性遍历                   |
| 删除(已知前驱) | O(1)     | O(1) | prev.next = prev.next.next |
| 反转           | O(n)     | O(1) | 三指针迭代                 |
| 找中点         | O(n)     | O(1) | 快慢指针                   |
| 判环           | O(n)     | O(1) | 快慢指针                   |
| 找环入口       | O(n)     | O(1) | 快慢指针+数学              |
| 合并两个有序   | O(n+m)   | O(1) | 双指针                     |
| 合并K个有序    | O(Nlogk) | O(k) | 最小堆                     |
| 删除倒数第n    | O(n)     | O(1) | 快慢指针间隔n              |
| 回文判断       | O(n)     | O(1) | 中点+反转                  |

\*有尾指针时

---

## 10. 小结

**初学者要点**：

1. 链表与数组的本质差异是**内存布局**：数组靠连续性与下标换随机访问，链表靠指针换 $O(1)$ 的已知前驱插入删除；
2. 哨兵节点（dummy head）统一了"操作头节点"与"操作中间节点"的代码路径，几乎所有涉及删除/合并的题都值得加哨兵；
3. 快慢指针是链表题的第一技巧：找中点、判环、找环入口、删倒数第 n 个，四个高频题型全部围绕它展开；
4. 反转链表必须先写三行指针交换的正确顺序（保存后继、改指向、双指针前进），它是 K 个一组翻转、回文判断等进阶题的子程序。

**进阶注意**：

1. 复杂度结论要带前提：`O(1) 插入`指已知前驱（或尾指针的尾部）情形，"查找 + 插入"整体仍是 $O(n)$；
2. 缓存局部性是链表的真实短板：同样的遍历，数组常快一个数量级，工程选型需实测而非只看渐近复杂度；
3. C++ 实现注意节点生命周期管理，优先智能指针；Java/Python 依赖 GC，但环结构会阻止回收，必要时手动断环；
4. 递归解法空间 $O(n)$，面试写完递归后应主动给出迭代版本并说明两者取舍；
5. 与相邻内容的联系：判环数学证明背后的不变式分析见 [算法分析基础](/algorithm/010-AlgorithmAnalysisBasics) 的摊还分析部分；合并 K 个有序链表的堆解法在 [堆与优先队列](/algorithm/090-HeapAndPriorityQueue) 中有更系统的展开。

## 延伸资源

- [VisuAlgo: Linked List](https://visualgo.net/en/list)：新加坡国立大学的交互式可视化，可逐步动画演示单链表、双链表及基于它们的栈/队列操作的指针变化（英文，适合配合本文逐步追踪表使用）。
- [Hello 算法](https://www.hello-algo.com/)：开源数据结构与算法入门书，链表一章提供中文图解与 Python/C++/Java/Go 等多语言可运行实现（中文，适合初学者系统补充）。

> 外部资源免责声明：以上链接为第三方资源，仅作学习索引；其内容的准确性、合法性与可用性由相应运营方负责，仓库维护者不对使用者使用该等资源所产生的各类问题承担责任。
