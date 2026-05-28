---
order: 60
tags:
  - 'algorithm'
  - 'networking'
  - 'memory'
  - 'data-structure'
difficulty: 'intermediate'
title: '树'
module: 'algorithm'
category: 'Algorithm/Tree'
description: '二叉树遍历、BST操作、堆与优先队列、Trie字典树的原理、复杂度分析与多语言实现。'
author: 'fanquanpp'
---

- [3. 二叉搜索树 (BST)](#3-二叉搜索树-bst)
- [4. 平衡二叉树 (AVL)](#4-平衡二叉树-avl)
- [5. 堆与优先队列](#5-堆与优先队列)
- [6. 字典树 (Trie)](#6-字典树-trie)
- [7. 树算法速查表](#7-树算法速查表)
- [8. 延伸阅读](#8-延伸阅读)

---

## 1. 树的基本概念

### 1.1 树的定义与性质

树是一种非线性的层次数据结构。形式化定义：树是n(n>=0)个节点的有限集合，当n=0时为空树，当n>0时满足：

1. 有且仅有一个根节点
2. 其余节点可分为m(m>0)个互不相交的有限集合，每个集合本身也是一棵树

**核心性质**：

- n个节点的树有n-1条边
- 树中任意两节点间存在唯一路径
- 树是连通无环图

### 1.2 术语表

| 术语         | 定义                         |
| ------------ | ---------------------------- |
| 度(degree)   | 节点的子树个数               |
| 叶子节点     | 度为0的节点                  |
| 深度(depth)  | 根到该节点的边数             |
| 高度(height) | 该节点到最远叶子的边数       |
| 层(level)    | 根在第1层，子节点在第2层     |
| 祖先         | 从根到该节点路径上的所有节点 |
| 后代         | 该节点子树中的所有节点       |

### 1.3 二叉树的分类

| 类型       | 定义                           | 性质                                 |
| ---------- | ------------------------------ | ------------------------------------ |
| 满二叉树   | 每个节点度为0或2               | 第k层有2^(k-1)个节点                 |
| 完全二叉树 | 除最后一层外满，最后一层左对齐 | 堆的底层结构                         |
| 完美二叉树 | 所有层都满                     | n个节点的完美二叉树高度为log2(n+1)-1 |
| 平衡二叉树 | 任意节点左右子树高度差<=1      | 保证O(log n)操作                     |

> 跨模块引用：树是图的特例（无环连通图），图算法参见 [图论算法](algorithm/graph)。堆排序参见 [排序算法](algorithm/sorting)。

---

## 2. 二叉树遍历

### 2.1 节点定义

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

```cpp
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};
```

### 2.2 四种遍历方式

```
        1
       / \
      2   3
     / \
    4   5

前序(根左右): 1, 2, 4, 5, 3
中序(左根右): 4, 2, 5, 1, 3
后序(左右根): 4, 5, 2, 3, 1
层序(BFS):    1, 2, 3, 4, 5
```

**递归实现**：

```python
def preorder(root):
    if not root:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)

def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def postorder(root):
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]
```

```cpp
void preorder(TreeNode* root, vector<int>& res) {
    if (!root) return;
    res.push_back(root->val);
    preorder(root->left, res);
    preorder(root->right, res);
}

void inorder(TreeNode* root, vector<int>& res) {
    if (!root) return;
    inorder(root->left, res);
    res.push_back(root->val);
    inorder(root->right, res);
}

void postorder(TreeNode* root, vector<int>& res) {
    if (!root) return;
    postorder(root->left, res);
    postorder(root->right, res);
    res.push_back(root->val);
}
```

**迭代实现**：

```python
def preorder_iterative(root):
    if not root:
        return []
    result = []
    stack = [root]
    while stack:
        node = stack.pop()
        result.append(node.val)
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)
    return result

def inorder_iterative(root):
    result = []
    stack = []
    curr = root
    while curr or stack:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        result.append(curr.val)
        curr = curr.right
    return result

def postorder_iterative(root):
    if not root:
        return []
    result = []
    stack = [root]
    while stack:
        node = stack.pop()
        result.append(node.val)
        if node.left:
            stack.append(node.left)
        if node.right:
            stack.append(node.right)
    return result[::-1]
```

```cpp
vector<int> preorderIterative(TreeNode* root) {
    vector<int> res;
    if (!root) return res;
    stack<TreeNode*> stk;
    stk.push(root);
    while (!stk.empty()) {
        auto node = stk.top(); stk.pop();
        res.push_back(node->val);
        if (node->right) stk.push(node->right);
        if (node->left) stk.push(node->left);
    }
    return res;
}

vector<int> inorderIterative(TreeNode* root) {
    vector<int> res;
    stack<TreeNode*> stk;
    TreeNode* curr = root;
    while (curr || !stk.empty()) {
        while (curr) { stk.push(curr); curr = curr->left; }
        curr = stk.top(); stk.pop();
        res.push_back(curr->val);
        curr = curr->right;
    }
    return res;
}
```

**层序遍历**：

```python
from collections import deque

def level_order(root):
    if not root:
        return []
    result = []
    q = deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
        result.append(level)
    return result
```

```cpp
vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> res;
    if (!root) return res;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int sz = q.size();
        vector<int> level;
        for (int i = 0; i < sz; i++) {
            auto node = q.front(); q.pop();
            level.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        res.push_back(level);
    }
    return res;
}
```

### 2.3 遍历的应用

| 遍历方式 | 典型应用                 |
| -------- | ------------------------ |
| 前序     | 序列化/反序列化、复制树  |
| 中序     | BST得到有序序列          |
| 后序     | 释放树内存、计算子树信息 |
| 层序     | 按层处理、求树宽度       |

### 2.4 根据遍历序列重建二叉树

**前序+中序**：前序第一个元素为根，在中序中找到根的位置，左边为左子树，右边为右子树。

```python
def build_tree(preorder, inorder):
    if not preorder or not inorder:
        return None
    root_val = preorder[0]
    root = TreeNode(root_val)
    mid = inorder.index(root_val)
    root.left = build_tree(preorder[1:mid+1], inorder[:mid])
    root.right = build_tree(preorder[mid+1:], inorder[mid+1:])
    return root
```

```cpp
TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
    unordered_map<int, int> idxMap;
    for (int i = 0; i < inorder.size(); i++) idxMap[inorder[i]] = i;
    int preIdx = 0;
    function<TreeNode*(int, int)> build = [&](int left, int right) -> TreeNode* {
        if (left > right) return nullptr;
        int rootVal = preorder[preIdx++];
        TreeNode* root = new TreeNode(rootVal);
        int mid = idxMap[rootVal];
        root->left = build(left, mid - 1);
        root->right = build(mid + 1, right);
        return root;
    };
    return build(0, inorder.size() - 1);
}
```

---

## 3. 二叉搜索树 (BST)

### 3.1 BST的定义与性质

BST满足：左子树所有节点值 < 根节点值 < 右子树所有节点值。中序遍历BST得到有序序列。

### 3.2 基本操作

```python
class BST:
    def __init__(self):
        self.root = None

    def search(self, val):
        curr = self.root
        while curr:
            if val == curr.val:
                return curr
            elif val < curr.val:
                curr = curr.left
            else:
                curr = curr.right
        return None

    def insert(self, val):
        if not self.root:
            self.root = TreeNode(val)
            return
        curr = self.root
        while True:
            if val < curr.val:
                if not curr.left:
                    curr.left = TreeNode(val)
                    return
                curr = curr.left
            else:
                if not curr.right:
                    curr.right = TreeNode(val)
                    return
                curr = curr.right

    def delete(self, val):
        def delete_node(node, val):
            if not node:
                return None
            if val < node.val:
                node.left = delete_node(node.left, val)
            elif val > node.val:
                node.right = delete_node(node.right, val)
            else:
                if not node.left:
                    return node.right
                if not node.right:
                    return node.left
                successor = node.right
                while successor.left:
                    successor = successor.left
                node.val = successor.val
                node.right = delete_node(node.right, successor.val)
            return node
        self.root = delete_node(self.root, val)

    def find_min(self):
        curr = self.root
        while curr and curr.left:
            curr = curr.left
        return curr

    def find_max(self):
        curr = self.root
        while curr and curr.right:
            curr = curr.right
        return curr

    def is_valid_bst(self):
        def validate(node, lo, hi):
            if not node:
                return              if node.val <= lo or node.val >= hi:
                return False
            return validate(node.left, lo, node.val) and validate(node.right, node.val, hi)
        return validate(self.root, float('-inf'), float('inf'))
```

```cpp
class BST {
    TreeNode* root;
    TreeNode* deleteNode(TreeNode* node, int val) {
        if (!node) return nullptr;
        if (val < node->val) node->left = deleteNode(node->left, val);
        else if (val > node->val) node->right = deleteNode(node->right, val);
        else {
            if (!node->left) return node->right;
            if (!node->right) return node->left;
            TreeNode* succ = node->right;
            while (succ->left) succ = succ->left;
            node->val = succ->val;
            node->right = deleteNode(node->right, succ->val);
        }
        return node;
    }
public:
    BST() : root(nullptr) {}

    TreeNode* search(int val) {
        TreeNode* curr = root;
        while (curr) {
            if (val == curr->val) return curr;
            curr = (val < curr->val) ? curr->left : curr->right;
        }
        return nullptr;
    }

    void insert(int val) {
        if (!root) { root = new TreeNode(val); return; }
        TreeNode* curr = root;
        while (true) {
            if (val < curr->val) {
                if (!curr->left) { curr->left = new TreeNode(val); return; }
                curr = curr->left;
            } else {
                if (!curr->right) { curr->right = new TreeNode(val); return; }
                curr = curr->right;
            }
        }
    }

    void remove(int val) { root = deleteNode(root, val); }
};
```

### 3.3 复杂度分析

| 操作 | 平均     | 最坏(退化为链表) |
| ---- | -------- | ---------------- |
| 查找 | O(log n) | O(n)             |
| 插入 | O(log n) | O(n)             |
| 删除 | O(log n) | O(n)             |
| 遍历 | O(n)     | O(n)             |

---

## 4. 平衡二叉树 (AVL)

### 4.1 AVL树的定义

AVL树是任意节点的左右子树高度差（平衡因子）不超过1的BST。通过旋转操作维持平衡。

### 4.2 四种旋转

| 失衡类型 | 条件               | 修复操作     |
| -------- | ------------------ | ------------ |
| LL       | 左子树的左子树过深 | 右旋         |
| RR       | 右子树的右子树过深 | 左旋         |
| LR       | 左子树的右子树过深 | 先左旋再右旋 |
| RL       | 右子树的左子树过深 | 先右旋再左旋 |

```python
class AVLNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None
        self.height = 1

class AVLTree:
    def get_height(self, node):
        return node.height if node else 0

    def get_balance(self, node):
        return self.get_height(node.left) - self.get_height(node.right) if node else 0

    def right_rotate(self, y):
        x = y.left
        t2 = x.right
        x.right = y
        y.left = t2
        y.height = 1 + max(self.get_height(y.left), self.get_height(y.right))
        x.height = 1 + max(self.get_height(x.left), self.get_height(x.right))
        return x

    def left_rotate(self, x):
        y = x.right
        t2 = y.left
        y.left = x
        x.right = t2
        x.height = 1 + max(self.get_height(x.left), self.get_height(x.right))
        y.height = 1 + max(self.get_height(y.left), self.get_height(y.right))
        return y

    def insert(self, node, val):
        if not node:
            return AVLNode(val)
        if val < node.val:
            node.left = self.insert(node.left, val)
        else:
            node.right = self.insert(node.right, val)

        node.height = 1 + max(self.get_height(node.left), self.get_height(node.right))
        balance = self.get_balance(node)

        if balance > 1 and val < node.left.val:
            return self.right_rotate(node)
        if balance < -1 and val > node.right.val:
            return self.left_rotate(node)
        if balance > 1 and val > node.left.val:
            node.left = self.left_rotate(node.left)
            return self.right_rotate(node)
        if balance < -1 and val < node.right.val:
            node.right = self.right_rotate(node.right)
            return self.left_rotate(node)

        return node
```

### 4.3 AVL vs 红黑树

| 维度       | AVL树           | 红黑树                  |
| ---------- | --------------- | ----------------------- |
| 平衡严格度 | 严格(高度差<=1) | 近似(最长路径<=2倍最短) |
| 查找性能   | 略优(更矮)      | 略差                    |
| 插入/删除  | 旋转较多        | 旋转较少                |
| 适用场景   | 查找密集        | 增删频繁                |
| 实际应用   | 数据库索引      | STL map/set             |

---

## 5. 堆与优先队列

### 5.1 堆的定义

堆是一棵完全二叉树，满足堆性质：

- 最大堆：每个节点值 >= 其子节点值
- 最小堆：每个节点值 <= 其子节点值

堆通常用数组实现，下标关系：

- 父节点：(i - 1) / 2
- 左子节点：2 \* i + 1
- 右子节点：2 \* i + 2

### 5.2 优先队列实现

```python
class MinHeap:
    def __init__(self):
        self.heap = []

    def push(self, val):
        self.heap.append(val)
        self._sift_up(len(self.heap) - 1)

    def pop(self):
        if not self.heap:
            return None
        if len(self.heap) == 1:
            return self.heap.pop()
        result = self.heap[0]
        self.heap[0] = self.heap.pop()
        self._sift_down(0)
        return result

    def peek(self):
        return self.heap[0] if self.heap else None

    def _sift_up(self, i):
        while i > 0:
            parent = (i - 1) // 2
            if self.heap[i] >= self.heap[parent]:
                break
            self.heap[i], self.heap[parent] = self.heap[parent], self.heap[i]
            i = parent

    def _sift_down(self, i):
        n = len(self.heap)
        while True:
            smallest = i
            left = 2 * i + 1
            right = 2 * i + 2
            if left < n and self.heap[left] < self.heap[smallest]:
                smallest = left
            if right < n and self.heap[right] < self.heap[smallest]:
                smallest = right
            if smallest == i:
                break
            self.heap[i], self.heap[smallest] = self.heap[smallest], self.heap[i]
            i = smallest

    def heapify(self, arr):
        self.heap = arr[:]
        for i in range(len(self.heap) // 2 - 1, -1, -1):
            self._sift_down(i)
```

```cpp
class MinHeap {
    vector<int> heap;
    void siftUp(int i) {
        while (i > 0) {
            int parent = (i - 1) / 2;
            if (heap[i] >= heap[parent]) break;
            swap(heap[i], heap[parent]);
            i = parent;
        }
    }
    void siftDown(int i) {
        int n = heap.size();
        while (true) {
            int smallest = i, left = 2 * i + 1, right = 2 * i + 2;
            if (left < n && heap[left] < heap[smallest]) smallest = left;
            if (right < n && heap[right] < heap[smallest]) smallest = right;
            if (smallest == i) break;
            swap(heap[i], heap[smallest]);
            i = smallest;
        }
    }
public:
    void push(int val) { heap.push_back(val); siftUp(heap.size() - 1); }
    int pop() {
        int result = heap[0];
        heap[0] = heap.back();
        heap.pop_back();
        if (!heap.empty()) siftDown(0);
        return result;
    }
    int top() const { return heap[0]; }
    bool empty() const { return heap.empty(); }
    void heapify(vector<int>& arr) {
        heap = arr;
        for (int i = heap.size() / 2 - 1; i >= 0; i--) siftDown(i);
    }
};
```

### 5.3 Top-K问题

```python
import heapq

def top_k_frequent(nums, k):
    count = {}
    for n in nums:
        count[n] = count.get(n, 0) + 1
    return heapq.nlargest(k, count.keys(), key=count.get)

def top_k_smallest(nums, k):
    return heapq.nsmallest(k, nums)
```

```cpp
vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int, int> count;
    for (int n : nums) count[n]++;
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    for (auto& [num, freq] : count) {
        pq.push({freq, num});
        if (pq.size() > k) pq.pop();
    }
    vector<int> result;
    while (!pq.empty()) { result.push_back(pq.top().second); pq.pop(); }
    return result;
}
```

### 5.4 复杂度分析

| 操作         | 时间复杂度 |
| ------------ | ---------- |
| 建堆         | O(n)       |
| 插入         | O(log n)   |
| 删除堆顶     | O(log n)   |
| 查看堆顶     | O(1)       |
| 查找任意元素 | O(n)       |

---

## 6. 字典树 (Trie)

### 6.1 问题描述

Trie（前缀树）是一种树形数据结构，用于高效存储和检索字符串集合。每个节点代表一个字符前缀。

### 6.2 思路分析

Trie的核心优势在于前缀查询：查找所有以某前缀开头的字符串只需O(m)时间（m为前缀长度），与集合大小无关。

```
存储 "app", "apple", "apply", "bat", "batch"

          root
         /    \
        a      b
        |      |
        p      a
        |      |
        p*     t*
       / \      |
      l   l     c
      |   |     |
      e*  y*    h*
```

\*标记表示该节点是某个单词的结尾

### 6.3 代码实现

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end =
    def search(self, word):
        node = self._find(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find(prefix) is not None

    def _find(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def delete(self, word):
        def _delete(node, word, depth):
            if not node:
                return False
            if depth == len(word):
                if node.is_end:
                    node.is_end = False
                    return len(node.children) == 0
                return False
            ch = word[depth]
            if ch not in node.children:
                return False
            should_delete = _delete(node.children[ch], word, depth + 1)
            if should_delete:
                del node.children[ch]
                return len(node.children) == 0 and not node.is_end
            return False
        _delete(self.root, word, 0)
```

```cpp
struct TrieNode {
    unordered_map<char, TrieNode*> children;
    bool isEnd;
    TrieNode() : isEnd(false) {}
};

class Trie {
    TrieNode* root;
public:
    Trie() : root(new TrieNode()) {}

    void insert(const string& word) {
        TrieNode* node = root;
        for (char c : word) {
            if (!node->children.count(c))
                node->children[c] = new TrieNode();
            node = node->children[c];
        }
        node->isEnd = true;
    }

    bool search(const string& word) {
        TrieNode* node = find(word);
        return node && node->isEnd;
    }

    bool startsWith(const string& prefix) {
        return find(prefix) != nullptr;
    }

private:
    TrieNode* find(const string& s) {
        TrieNode* node = root;
        for (char c : s) {
            if (!node->children.count(c)) return nullptr;
            node = node->children[c];
        }
        return node;
    }
};
```

### 6.4 复杂度分析

| 操作     | 时间复杂度 | 空间复杂度 |
| -------- | ---------- | ---------- |
| 插入     | O(m)       | O(m)       |
| 查找     | O(m)       | O(1)       |
| 前缀查找 | O(m)       | O(1)       |
| 删除     | O(m)       | O(1)       |

m为字符串长度。

### 6.5 变体与应用

**压缩Trie（Radix Tree / Patricia Trie）**：合并只有一个子节点的链，减少空间。

**后缀Trie**：存储一个字符串的所有后缀，用于模式匹配。

**应用场景**：

- 自动补全/搜索建议
- 拼写检查
- IP路由表（最长前缀匹配）
- 字符串集合的前缀统计

---

## 7. 树算法速查表

| 操作     | BST       | AVL     | 红黑树  | 堆      | Trie    |
| -------- | --------- | ------- | ------- | ------- | ------- |
| 查找     | O(logn)\* | O(logn) | O(logn) | O(n)    | O(m)    |
| 插入     | O(logn)\* | O(logn) | O(logn) | O(logn) | O(m)    |
| 删除     | O(logn)\* | O(logn) | O(logn) | O(logn) | O(m)    |
| 最值     | O(logn)\* | O(logn) | O(logn) | O(1)    | --      |
| 前缀查询 | --        | --      | --      | --      | O(m)    |
| 空间     | O(n)      | O(n)    | O(n)    | O(n)    | O(N\*m) |

\*平均复杂度，最坏O(n)；m为字符串长度；N为字符串数量

---

## 8. 延伸阅读

- CLRS 第 12 章（BST）、第 18 章（B树）、第 6 章（堆）
- 《数据结构与算法分析》(Weiss) 第4章
- [BST -- VisuAlgo](https://visualgo.net/en/bst)
- Sedgewick & Wayne, _Algorithms_, Chapter 3 (BST) & Chapter 5 (Trie)

> 跨模块引用：堆排序参见 [排序算法](algorithm/sorting)。BFS层序遍历参见 [搜索算法](algorithm/searching)。刷题实践参见 [LeetCode刷题指南](algorithm/leetcode-guide)。
