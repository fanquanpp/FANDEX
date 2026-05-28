---
order: 40
tags:
  - 'algorithm'
  - 'data-structure'
difficulty: 'intermediate'
title: '链表'
module: 'algorithm'
category: 'Algorithm/LinkedList'
description: '单链表、双链表与环形链表的原理、操作复杂度分析与多语言实现，涵盖常见面试题型。'
author: 'fanquanpp'
---

- [3. 双链表](#3-双链表)
- [4. 环形链表](#4-环形链表)
- [5. 经典操作与技巧](#5-经典操作与技巧)
- [6. 常见面试题型](#6-常见面试题型)
- [7. 链表操作速查表](#7-链表操作速查表)
- [8. 延伸阅读](#8-延伸阅读)

---

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

> 跨模块引用：链表在哈希表冲突处理中的应用参见 [哈希表](algorithm/hashtable)。C++ STL list的实现参见 [C++基础](cpp/overview)。

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

### 2.3 复杂度分析

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

> 跨模块引用：LRU缓存的完整分析参见 [哈希表](algorithm/hashtable)。

---

## 4. 环形链表

### 4.1 循环链表结构

循环链表的尾节点指向头节点，形成环。常用于操作系统进程调度（轮转调度）、约瑟夫问题等。

### 4.2 约瑟夫问题

n个人围成一圈，从第1个人开始报数，报到m的人出列，求最后剩下的人。

**数学解法**：f(n,m) = (f(n-1,m) + m) % n，f(1,m) = 0

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
            return      return False

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

**环入口的数学证明**：设head到环入口距离为a，环入口到相遇点距离为b，环长度为c。快指针走2(a+b)步，慢指针走a+b步。快指针多走a+b = kc步。因此a = kc - b = (k-1)c + (c-b)。从head和相遇点同时出发，各走a步后必在环入口相遇。

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

## 6. 常见面试题型

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
        return      slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    second_half = reverse_list(slow.next)
    p1, p2 = head, second_half
    result =      while p2:
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

---

## 7. 链表操作速查表

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

## 8. 延伸阅读

- CLRS 第 10 章（链表基础）
- 《剑指 Offer》链表专题
- [Linked List -- VisuAlgo](https://visualgo.net/en/list)
- Skiena, _The Algorithm Design Manual_, Section 3.1

> 跨模块引用：链表在哈希表和LRU缓存中的应用参见 [哈希表](algorithm/hashtable)。刷题实践参见 [LeetCode刷题指南](algorithm/leetcode-guide)。
