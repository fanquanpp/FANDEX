---
order: 70
title: 启发式搜索与博弈树
module: 'algorithm'
category: 计算机科学
difficulty: beginner
description: 双向 BFS、IDDFS、A*、IDA* 与 Minimax/Alpha-Beta：利用额外信息加速搜索与对抗决策
author: fanquanpp
updated: '2026-10-07'
related:
  - 'algorithm/050-SearchAlgorithm'
  - 'algorithm/115-ShortestPathAndMST'
prerequisites:
  - 'algorithm/050-SearchAlgorithm'
---

## 知识点地图

本篇属于「搜索算法」知识类别中的**有信息搜索与对抗搜索**，是
050-SearchAlgorithm（线性/二分/哈希/BFS/DFS 的通用搜索篇）的续篇。

解决什么问题：当状态空间大到 $O(b^d)$ 级别（棋局、拼图、路径规划），
无信息的 BFS/DFS 要么内存爆炸要么时间爆炸。本篇讲的是如何利用问题的
**额外信息**（启发式估计、目标位置、对手模型）把搜索代价压下来。

什么时候用到：

1. 网格/地图上找路且知道目标在哪（A* 家族）；
2. 内存装不下开表但解必须最优（IDA*）；
3. 两人零和博弈要选下一步（Minimax/Alpha-Beta）；
4. 图很大但起点与终点都已知（双向 BFS）。

与 115-ShortestPathAndMST 的分工：115 在**最短路语境**下讲 Dijkstra
与 A*（边权、图论口径）；本篇在**通用状态空间搜索语境**下讲同一批
算法（状态、启发式、博弈树口径）。两边互链不重复：读 115 是为了
图论根基，读本篇是为了搜索框架与博弈。

三个先记住的名字与出处：A*（Hart-Nilsson-Raphael 1968）、IDA*
（Korf 1985）、Alpha-Beta 严格分析（Knuth-Moore 1975）。

## 1. 心智模型：把「知道什么」变成「先看哪里」

050 篇的 BFS/DFS 是**无信息**的：它们对「离目标还有多远」一无所知，
只能按固定顺序铺开。本篇所有算法的共同思路是：**给每个候选节点算
一个「看起来有多近」的分数，优先看分数好的**。区别只在分数怎么算：

| 算法 | 用什么信息 | 代价 |
| :--- | :--- | :--- |
| 双向 BFS | 目标状态已知 | 从两端各搜一半 |
| IDDFS | 无信息，但按深度迭代 | 换取 $O(d)$ 空间 |
| A* | 启发式 $h(n)$ | 需保证 $h$ 不高估 |
| IDA* | 同 A*，但用 $f$ 当深度阈值 | 空间 $O(d)$ |
| Minimax | 对手模型 | 博弈树指数膨胀，靠 Alpha-Beta 剪枝 |

一个贯穿全篇的判断标准：**启发式 $h(n)$ 从不高估真实剩余代价**
（$h(n) \leq h^*(n)$，称可采纳性）时，搜索才保证找到最优解。这个
性质会在第 4 节被严格证明一次，其余算法都在它之上变体。

## 2. 双向 BFS（Bidirectional BFS）

### 2.1 算法思想

**双向 BFS** 由 Ira Pohl 在 1971 年《Bi-directional Search》（Machine Intelligence 6:127-140）中提出。核心思想：从起点与终点同时执行 BFS，当两端的搜索前沿相遇时即可拼接出最短路径。

复杂度对比：单向 BFS 为 $O(b^d)$，双向 BFS 为 $O(b^{d/2})$——分支因子 $b$ 与解深度 $d$ 较大时收益显著（如 $b=10, d=6$ 时，单向 $10^6$ 次扩展，双向仅 $2 \times 10^3$ 次）。

### 2.2 Python 实现

```python
from collections import deque

def bidirectional_bfs(graph: dict, start, end) -> list | None:
    """双向 BFS：从起点和终点同时搜索，中间相遇"""
    if start == end:
        return [start]

    # 前向搜索：从 start 出发
    front_visited = {start: None}  # node -> parent
    back_visited = {end: None}
    front_queue = deque([start])
    back_queue = deque([end])
    meeting_point = None

    while front_queue and back_queue:
        # 扩展前向一层
        for _ in range(len(front_queue)):
            node = front_queue.popleft()
            for neighbor in graph.get(node, []):
                if neighbor not in front_visited:
                    front_visited[neighbor] = node
                    front_queue.append(neighbor)
                    if neighbor in back_visited:
                        meeting_point = neighbor
                        break
            if meeting_point:
                break

        if meeting_point:
            break

        # 扩展后向一层
        for _ in range(len(back_queue)):
            node = back_queue.popleft()
            for neighbor in graph.get(node, []):
                if neighbor not in back_visited:
                    back_visited[neighbor] = node
                    back_queue.append(neighbor)
                    if neighbor in front_visited:
                        meeting_point = neighbor
                        break
            if meeting_point:
                break

    if not meeting_point:
        return None

    # 拼接路径：start -> meeting_point -> end
    # 前半段
    path = []
    cur = meeting_point
    while cur is not None:
        path.append(cur)
        cur = front_visited[cur]
    path.reverse()
    # 后半段
    cur = back_visited[meeting_point]
    while cur is not None:
        path.append(cur)
        cur = back_visited[cur]
    return path
```

### 2.3 应用：LeetCode 127 单词接龙

```python
def ladderLength(beginWord: str, endWord: str, wordList: list) -> int:
    """单词接龙：双向 BFS"""
    word_set = set(wordList)
    if endWord not in word_set:
        return 0

    front = {beginWord}
    back = {endWord}
    visited = set()
    steps = 1

    while front and back:
        # 总是扩展较小的一侧（优化）
        if len(front) > len(back):
            front, back = back, front

        next_front = set()
        for word in front:
            for i in range(len(word)):
                for c in 'abcdefghijklmnopqrstuvwxyz':
                    if c == word[i]:
                        continue
                    new_word = word[:i] + c + word[i+1:]
                    if new_word in back:
                        return steps + 1
                    if new_word in word_set and new_word not in visited:
                        visited.add(new_word)
                        next_front.add(new_word)
        front = next_front
        steps += 1
    return 0
```

### 2.4 复杂度分析

- **时间**：$O(b^{d/2})$，相比单向 $O(b^d)$ 减少指数级常数；
- **空间**：$O(b^{d/2})$；
- **完备性**：是；
- **最优性**：无权图最优；
- **限制**：需预先知道目标节点；目标不明确（如多个目标）时不适用。

## 3. 迭代深化 DFS（IDDFS）

### 3.1 算式思想

**迭代深化 DFS**（Iterative Deepening DFS, IDDFS）结合 BFS 的完备性与 DFS 的空间效率。Korf 1985 在《Depth-first iterative-deepening: An optimal admissible tree search》中证明：IDDFS 在分支因子 $b > 1$ 时，重复扩展的代价仅多出常数倍（约 $\frac{b}{b-1}$ 倍）。

工作流程：
1. 设深度阈值 $L = 0$，执行受限 DFS（深度不超过 $L$）；
2. 若找到解则返回；否则 $L \leftarrow L + 1$ 重复。

### 3.2 Python 实现

```python
def iddfs(graph: dict, start, is_goal) -> int | None:
    """迭代深化 DFS：返回目标所在深度"""
    def _dls(node, depth, visited):
        """Depth-Limited Search"""
        if is_goal(node):
            return depth
        if depth == 0:
            return None
        visited.add(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                result = _dls(neighbor, depth - 1, visited)
                if result is not None:
                    return result
        return None

    for depth in range(0, 100):  # 上限防无限循环
        visited = set()
        result = _dls(start, depth, visited)
        if result is not None:
            return result
    return None
```

### 3.3 复杂度分析

IDDFS 在深度 $d$ 找到解时的总扩展次数：

$$
N_{\text{IDDFS}} = \sum_{i=0}^{d} b^i \cdot (d - i + 1) \approx \frac{b}{b-1} \cdot b^d = O(b^d)
$$

而 BFS 的扩展次数为 $b^d$。两者渐近相同，但 IDDFS 空间仅 $O(d)$（远低于 BFS 的 $O(b^d)$）。

- **时间**：$O(b^d)$，与 BFS 同阶；
- **空间**：$O(d)$，远优于 BFS；
- **完备性**：是；
- **最优性**：所有边权相等时最优；加权图需 IDA*。

### 3.4 工程应用

1. **国际象棋引擎**：Stockfish 使用 IDDFS 作为搜索框架（结合 Alpha-Beta 剪枝）；
2. **游戏 AI**：井字棋、Connect Four 等深度有限博弈；
3. **约束满足问题**：N 皇后、数独求解；
4. **路径规划**：分支因子大、内存受限的场景。

## 4. A* 启发式搜索

### 4.1 算法思想

**A\*** 由 Peter Hart、Nils Nilsson、Bertram Raphael 在 1968 年为 SRI International（斯坦福研究院）的 Shakey 机器人路径规划而设计，发表于《A Formal Basis for the Heuristic Determination of Minimum Cost Paths》（IEEE Trans. SSC-4(2):100-107, DOI:10.1109/TSSC.1968.300136）。A* 是 Dijkstra 算法与贪婪最佳优先搜索的结合，评估函数：

$$
f(n) = g(n) + h(n)
$$

- $g(n)$：从起点到 $n$ 的实际代价；
- $h(n)$：从 $n$ 到目标的启发式估计；
- $f(n)$：经过 $n$ 的估计总代价。

A* 每次从开表中取出 $f$ 值最小的节点扩展，与 Dijkstra 的区别仅在于优先级函数从 $g$ 改为 $f = g + h$。当 $h \equiv 0$ 时 A* 退化为 Dijkstra；当 $h$ 严格等于实际最优代价 $h^*$ 时 A* 直接找到最短路径不扩展任何多余节点。

### 4.2 启发式函数

| 启发式 | 公式 | 适用场景 | 可采纳性 |
| ---- | ---- | ---- | ---- |
| 曼哈顿距离 | $h = |x_1 - x_2| + |y_1 - y_2|$ | 四连通网格 | 是（仅四方向移动） |
| 欧氏距离 | $h = \sqrt{(x_1-x_2)^2 + (y_1-y_2)^2}$ | 任意方向移动 | 是 |
| 切比雪夫距离 | $h = \max(|x_1-x_2|, |y_1-y_2|)$ | 八连通网格 | 是 |
| 汉明距离 | $h = \sum_i [s_i \neq t_i]$ | 字符串匹配 | 视问题而定 |
| 错位牌数 | $h = \sum_i [s_i \neq g_i]$ | 八数码 | 是（弱启发） |
| 曼哈顿距离和 | $h = \sum_i |x_i - x_i^*| + |y_i - y_i^*|$ | 八数码/15 数码 | 是（强启发） |

### 4.3 Python 实现（优先队列）

```python
import heapq

def astar(grid: list[list[int]], start: tuple, end: tuple) -> int:
    """A* 算法：在二维网格中求最短路径。0=可走, 1=障碍"""
    rows, cols = len(grid), len(grid[0])

    def manhattan(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    # 优先队列：(f, g, pos)
    open_set = [(manhattan(start, end), 0, start)]
    g_score = {start: 0}
    visited = set()

    while open_set:
        f, g, pos = heapq.heappop(open_set)
        if pos == end:
            return g
        if pos in visited:
            continue
        visited.add(pos)

        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = pos[0] + dx, pos[1] + dy
            if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == 0:
                neighbor = (nx, ny)
                new_g = g + 1
                if neighbor not in g_score or new_g < g_score[neighbor]:
                    g_score[neighbor] = new_g
                    new_f = new_g + manhattan(neighbor, end)
                    heapq.heappush(open_set, (new_f, new_g, neighbor))
    return -1  # 不可达
```

### 4.4 最优性证明（可采纳性保证）

**定理 4.1（A\* 最优性）**：若启发式 $h$ 可采纳（$h(n) \leq h^*(n)$），且图搜索使用闭表（已扩展节点不再重开），则 A* 找到的解为最优解。

**证明**（反证法）：设 A* 终止时返回的解代价为 $C'$，但最优解代价为 $C^* < C'$。在 A* 终止前，最优路径上必存在某个节点 $n$ 在开表中（因为最优路径从起点扩展，每一步都不会错过）。由于 $h$ 可采纳：

$$
f(n) = g(n) + h(n) \leq g^*(n) + h^*(n) = C^*
$$

而 A* 选择 $f$ 最小的节点扩展，故终止时所选节点的 $f$ 值 $\leq C^* < C'$。但终止节点 $g$ 满足 $f(g) = g(g) + h(g) = g(g) = C'$（目标节点的 $h=0$），矛盾。因此 $C' = C^*$。$\blacksquare$

### 4.5 一致性与闭表优化

**一致性**（monotonicity）：$h(n) \leq c(n, n') + h(n')$。Hart-Nilsson-Raphael 1968 称此为 monotonicity。一致性保证：A* 在扩展节点 $n$ 时已找到 $g^*(n)$，故闭表中的节点无需重开。

**定理 11.2**：一致性蕴含可采纳性。

**证明**：对最优路径 $n \to n_1 \to n_2 \to \dots \to g$ 反复应用一致性：

$$
h(n) \leq c(n, n_1) + h(n_1) \leq c(n, n_1) + c(n_1, n_2) + h(n_2) \leq \dots \leq h^*(n)
$$

### 4.6 应用：八数码问题

```python
def eight_puzzle(start: tuple, goal: tuple) -> int:
    """八数码问题：A* + 曼哈顿距离和"""
    def h(state):
        dist = 0
        for i in range(9):
            if state[i] == 0:
                continue
            target = goal.index(state[i])
            dist += abs(i // 3 - target // 3) + abs(i % 3 - target % 3)
        return dist

    open_set = [(h(start), 0, start)]
    g_score = {start: 0}
    while open_set:
        f, g, state = heapq.heappop(open_set)
        if state == goal:
            return g
        zero = state.index(0)
        zx, zy = zero // 3, zero % 3
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = zx + dx, zy + dy
            if 0 <= nx < 3 and 0 <= ny < 3:
                new_zero = nx * 3 + ny
                lst = list(state)
                lst[zero], lst[new_zero] = lst[new_zero], lst[zero]
                new_state = tuple(lst)
                new_g = g + 1
                if new_state not in g_score or new_g < g_score[new_state]:
                    g_score[new_state] = new_g
                    heapq.heappush(open_set, (new_g + h(new_state), new_g, new_state))
    return -1
```

### 4.7 复杂度分析

- **时间**：最坏 $O(b^d)$（启发式无效时退化为 BFS）；理想 $O(b^{\epsilon d})$（启发式误差 $\epsilon$ 较小）；
- **空间**：$O(b^d)$，需存储所有已扩展节点（最大瓶颈）；
- **完备性**：是（有限分支、可采纳启发式）；
- **最优性**：是（可采纳启发式）。

## 5. IDA* 内存受限搜索

### 5.1 算法思想

**IDA\***（Iterative Deepening A*）由 Richard Korf 1985 在《Depth-first iterative-deepening: An optimal admissible tree search》（Artificial Intelligence 27(1):97-109, DOI:10.1016/0004-3702(85)90084-0）中提出。结合 IDDFS 与 A*：用 $f(n) = g(n) + h(n)$ 作为深度阈值，每次循环用上一轮的最小超阈值作为新阈值。

IDA* 的核心优势：**空间 $O(d)$**——仅需保存当前路径，无需开表。这使其能解决 A* 因内存爆炸无法求解的问题（如 15 数码、24 数码）。

### 5.2 Python 实现

```python
def ida_star(start, goal, h, neighbors):
    """IDA* 算法：内存受限启发式搜索"""
    def search(path, g, threshold):
        node = path[-1]
        f = g + h(node, goal)
        if f > threshold:
            return f, None
        if node == goal:
            return f, list(path)
        min_threshold = float('inf')
        for neighbor, cost in neighbors(node):
            if neighbor in path:  # 简单环检测
                continue
            path.append(neighbor)
            t, result = search(path, g + cost, threshold)
            if result is not None:
                return t, result
            if t < min_threshold:
                min_threshold = t
            path.pop()
        return min_threshold, None

    threshold = h(start, goal)
    path = [start]
    while True:
        t, result = search(path, 0, threshold)
        if result is not None:
            return result
        if t == float('inf'):
            return None  # 不可达
        threshold = t
```

### 5.3 完备性与最优性证明

**定理 5.1（IDA\* 完备性）**：若解存在且有限分支，IDA* 必能找到。

**证明**：阈值序列 $T_0 < T_1 < T_2 < \dots$ 严格递增（每轮取所有超阈值中的最小值），且 $T_i \to C^*$（最优代价）。当 $T_i \geq C^*$ 时，最优路径上所有节点的 $f \leq C^* \leq T_i$，故 DFS 必能到达目标。$\blacksquare$

**定理 5.2（IDA\* 最优性）**：若 $h$ 可采纳，IDA* 找到的解为最优解。

**证明**：IDA* 在阈值 $T_i < C^*$ 时不会终止（因为最优路径节点 $f \leq C^*$，但若 $T_i < C^*$ 则这些节点仍可能被扩展且找不到目标）；首次终止时 $T_k = C^*$，返回的解代价恰为 $C^*$。$\blacksquare$

### 5.4 复杂度分析

- **时间**：$O(b^d)$（与 A* 同阶），但常数较大（重复扩展）；
- **空间**：$O(d)$，远优于 A* 的 $O(b^d)$；
- **完备性**：是；
- **最优性**：是（可采纳启发式）。

### 5.5 应用：15 数码问题

15 数码的状态空间约为 $16!/2 \approx 10^{13}$，A* 内存爆炸无法求解。Korf 1985 用 IDA* + Manhattan distance + Linear conflict 启发式在 SUN-3 工作站上平均 50 秒内求解随机 15 数码实例，奠定 IDA* 在内存受限搜索中的地位。现代优化（pattern database、PDB）可将求解时间降至毫秒级。

## 6. Minimax 与 Alpha-Beta 剪枝

### 6.1 算法思想

**Minimax** 由 John von Neumann 1928 在《Zur Theorie der Gesellschaftsspiele》（Mathematische Annalen 100:295-320）中证明的极小极大定理奠基。Claude Shannon 1950 在《Programming a Computer for Playing Chess》（Philosophical Magazine 41:256-275, DOI:10.1080/14786445008521796）中首次将 Minimax 应用于国际象棋程序设计。

在两人零和博弈中，玩家分两类：
- **MAX**：希望效用最大化；
- **MIN**：希望效用最小化（即希望 MAX 的效用最小）。

博弈树中叶节点给出效用值，内部节点交替为 MAX/MIN 层。Minimax 递归计算：

$$
\text{Minimax}(n) = \begin{cases}
\text{utility}(n) & n \text{ 为叶节点} \\
\max_{c \in \text{children}(n)} \text{Minimax}(c) & n \text{ 为 MAX 节点} \\
\min_{c \in \text{children}(n)} \text{Minimax}(c) & n \text{ 为 MIN 节点}
\end{cases}
$$

### 6.2 Python 实现

```python
def minimax(state, is_max_turn, terminal_value, children, depth=10):
    """Minimax 算法
    - state: 当前状态
    - is_max_turn: 当前是否为 MAX 玩家回合
    - terminal_value(state): 终局估值（None 表示非终局）
    - children(state): 返回所有合法后继状态
    - depth: 最大搜索深度
    """
    val = terminal_value(state)
    if val is not None:
        return val
    if depth == 0:
        return heuristic_eval(state)

    if is_max_turn:
        best = -float('inf')
        for child in children(state):
            best = max(best, minimax(child, False, terminal_value, children, depth - 1))
        return best
    else:
        best = float('inf')
        for child in children(state):
            best = min(best, minimax(child, True, terminal_value, children, depth - 1))
        return best

def heuristic_eval(state):
    """启发式估值函数（需根据具体博弈定义）"""
    return 0
```

### 6.3 Alpha-Beta 剪枝

**Alpha-Beta 剪枝** 思想由 John McCarthy 1956 在 Dartmouth 会议提出，Knuth 与 Moore 1975 在《An analysis of alpha-beta pruning》（Artificial Intelligence 6(4):293-326, DOI:10.1016/0004-3702(75)90019-3）中给出严格分析。维护两个值：

- $\alpha$：MAX 节点当前能保证的最佳下界（初始 $-\infty$）；
- $\beta$：MIN 节点当前能保证的最佳上界（初始 $+\infty$）。

**剪枝不变式**：当 $\alpha \geq \beta$ 时，当前节点不可能影响最终决策，剪枝。

```python
def alphabeta(state, depth, alpha, beta, is_max_turn, terminal_value, children):
    """Alpha-Beta 剪枝"""
    val = terminal_value(state)
    if val is not None:
        return val
    if depth == 0:
        return heuristic_eval(state)

    if is_max_turn:
        best = -float('inf')
        for child in children(state):
            best = max(best, alphabeta(child, depth - 1, alpha, beta, False, terminal_value, children))
            alpha = max(alpha, best)
            if alpha >= beta:
                break  # beta 剪枝
        return best
    else:
        best = float('inf')
        for child in children(state):
            best = min(best, alphabeta(child, depth - 1, alpha, beta, True, terminal_value, children))
            beta = min(beta, best)
            if beta <= alpha:
                break  # alpha 剪枝
        return best
```

### 6.4 复杂度分析（Knuth-Moore 1975）

Knuth 与 Moore 1975 证明：
- **最坏情况**（无剪枝）：$O(b^d)$，与 Minimax 相同；
- **最优情况**（节点排序完美）：$O(b^{d/2})$，相当于搜索深度加倍；
- **平均情况**：$O(b^{3d/4})$。

**直观理解**：完美排序下，Alpha-Beta 剪掉一半的"无用"分支。这是为什么 Stockfish 等引擎投入大量工程优化节点排序（killer move、history heuristic、transposition table）。

### 6.5 正确性证明

**定理 6.1（Alpha-Beta 正确性）**：Alpha-Beta 剪枝返回的根节点值等于 Minimax 值。

**证明**（不变式归纳）：归纳证明每个节点的返回值 $v$ 满足：
- MAX 节点：$v \leq \beta$ 时 $v$ 为真实 Minimax 值；$v > \beta$ 时 $v$ 为真实 Minimax 值的下界；
- MIN 节点：$v \geq \alpha$ 时 $v$ 为真实 Minimax 值；$v < \alpha$ 时 $v$ 为真实 Minimax 值的上界。

根节点 $\alpha = -\infty, \beta = +\infty$，故返回值为真实 Minimax 值。$\blacksquare$

### 6.6 Negamax 形式

棋类引擎普遍使用 Negamax 形式（统一 MAX/MIN）：利用零和博弈性质 $\text{Minimax}(MIN) = -\text{Minimax}(MAX)$，将所有节点视为"当前玩家最大化"。

```python
def negamax(state, depth, alpha, beta, color, terminal_value, children):
    """Negamax + Alpha-Beta：所有节点统一为当前玩家最大化"""
    val = terminal_value(state)
    if val is not None:
        return color * val
    if depth == 0:
        return color * heuristic_eval(state)

    best = -float('inf')
    for child in children(state):
        val = -negamax(child, depth - 1, -beta, -alpha, -color, terminal_value, children)
        best = max(best, val)
        alpha = max(alpha, best)
        if alpha >= beta:
            break
    return best
```

### 6.7 应用：LeetCode 486 预测赢家

```python
def predict_the_winner(nums: list) -> bool:
    """LeetCode 486：Minimax 判断玩家 1 是否必胜"""
    def minimax(nums, l, r, turn):
        if l == r:
            return turn * nums[l]
        pick_left = nums[l] + turn * minimax(nums, l + 1, r, -turn)
        pick_right = nums[r] + turn * minimax(nums, l, r - 1, -turn)
        return max(pick_left, pick_right) if turn == 1 else min(pick_left, pick_right)

    score = minimax(nums, 0, len(nums) - 1, 1)
    return score >= 0
```

### 6.8 工程应用

1. **国际象棋引擎**：Stockfish、Crafty、Fritz 使用 Alpha-Beta + 启发式排序 + 置换表；
2. **围棋**：AlphaGo（2016）用 MCTS + 神经网络（超越传统 Alpha-Beta）；
3. **五子棋/黑白棋**：桌面博弈普遍采用 Alpha-Beta；
4. **多人博弈**：MaxN 算法（多人 Minimax 推广）。

## 7. 真实工程场景

### 7.1 刷题场景：LeetCode 773 滑动谜题（A* 求解）

```python
import heapq

def slidingPuzzle(board: list[list[int]]) -> int:
    """2x3 滑动谜题：A* + 曼哈顿距离"""
    goal = (1, 2, 3, 4, 5, 0)
    start = tuple(board[0] + board[1])
    if start == goal:
        return 0

    def h(state):
        dist = 0
        for i in range(6):
            if state[i] == 0:
                continue
            target = state[i] - 1
            dist += abs(i // 3 - target // 3) + abs(i % 3 - target % 3)
        return dist

    # 邻居索引
    neighbors = {0: [1, 3], 1: [0, 2, 4], 2: [1, 5],
                 3: [0, 4], 4: [1, 3, 5], 5: [2, 4]}

    open_set = [(h(start), 0, start)]
    visited = {start}

    while open_set:
        f, g, state = heapq.heappop(open_set)
        if state == goal:
            return g
        zero = state.index(0)
        for npos in neighbors[zero]:
            lst = list(state)
            lst[zero], lst[npos] = lst[npos], lst[zero]
            new_state = tuple(lst)
            if new_state not in visited:
                visited.add(new_state)
                heapq.heappush(open_set, (g + 1 + h(new_state), g + 1, new_state))
    return -1
```

逐段看：`neighbors` 是预计算的空格位邻居表——2x3 棋盘每个位置的空格
能滑向哪些格子是固定事实，写成查表比每次动态计算快且不易错；状态用
`tuple` 而不是 `list`，因为 tuple 可哈希、能进集合；启发式 $h$ 直接
复用第 4 节的曼哈顿距离和，保证可采纳。

### 7.2 地图场景：Google Maps 路径规划

Google Maps 早期使用 Dijkstra + A* 进行路径规划，2010 年后引入 **Contraction Hierarchies**（Geisberger et al. 2008）与 **ALT 算法**（A* + Landmarks + Triangle inequality），将跨大陆路径查询从秒级降至毫秒级。

关键优化：
1. **Landmark 启发式**：选取若干"地标"节点 $L$，预计算所有节点到地标的距离。启发式 $h(u, v) = \max_{l \in L} |d(u, l) - d(v, l)|$ 满足三角不等式；
2. **分层图**：将高速公路作为高层、城市道路作为低层，A* 优先扩展高层；
3. **双向 A***：从起点和终点同时搜索，中间相遇。

教学要点：真实路网的最短路径查询量是每秒百万级，纯 A* 也要秒级；
工程答案不是换更聪明的单次搜索，而是**预计算 + 分层 + 双向**的组合。
Landmark 启发式是「预计算换实时」的典型：牺牲存储与预处理时间，
换取在线查询的强启发式。

### 7.3 对弈场景：Stockfish 国际象棋引擎

Stockfish 是开源国际象棋引擎的标杆，搜索框架基于：
1. **Iterative Deepening**：从深度 1 开始逐步加深，便于时间控制；
2. **Alpha-Beta + Negamax**：核心搜索算法；
3. **节点排序优化**：
   - **TT move**（置换表最佳着法）优先扩展；
   - **Killer move**（同一层引发剪枝的着法）；
   - **History heuristic**（历史启发式，按历史得分排序）；
4. **Quiescence Search**（静默搜索）：在叶节点继续搜索吃子、将军等"非静默"着法，避免水平线效应；
5. **Null Move Pruning**：跳过一步"空着"看对方能否取胜，若不能则当前局面优势明显可剪枝；
6. **Late Move Reduction**：排序靠后的着法降低搜索深度。

对照第 6 节理论：Iterative Deepening 就是 IDDFS（第 3 节）的工程化；
节点排序直接决定 Alpha-Beta 能否逼近 $O(b^{d/2})$；Quiescence 与
Null Move 是纯理论之外、由对弈经验驱动的补丁——**引擎 = 搜索框架
+ 一堆针对性的启发式补丁**。

### 7.4 状态空间场景：Sokoban 求解器

推箱子游戏是经典的状态空间搜索问题，工业级求解器（如 Sokoban Solver）结合：
1. **IDA*** + 强启发式（deadlock detection、tunnel macros）；
2. **状态压缩**：用位图表示箱子位置；
3. **模式数据库**：预计算子问题最优解。

推箱子选 IDA* 而不是 A* 的原因和 15 数码一样：状态空间远超内存。
deadlock detection（死锁检测）是把「剪枝知识」写进启发式的例子——
发现局面必败就立刻回溯，等价于让 $h$ 返回无穷大。

## 8. 常见陷阱

- **A* 启发式不可采纳**：若 $h(n) > h^*(n)$，A* 可能返回次优解。例如八数码用"欧氏距离"虽不严格大于 $h^*$ 但效率低；用"曼哈顿距离和"保证可采纳且强启发。
- **A* 闭表未重开**：若启发式不满足一致性（monotonicity），闭表中的节点可能需要重开。简单做法：始终检查 `new_g < g_score[neighbor]`。
- **IDDFS 重复扩展**：IDDFS 在深度 $d$ 找到解时，前 $d$ 轮的扩展看似浪费。但 Korf 1985 证明：分支因子 $b > 1$ 时总开销仅 $O(b^d)$（与 BFS 同阶），重复扩展代价是常数倍。
- **Alpha-Beta 节点排序不当**：无节点排序时 Alpha-Beta 退化为 Minimax，剪枝几乎无效。务必先排序：TT move > killer move > history heuristic > 其他。
- **双向 BFS 中间相遇误判**：需在双向搜索都"扩展完一层"后检查相遇，否则可能错过最短路径。简单做法：在节点"弹出"时检查而非"入队"时检查。
- **启发式过弱导致 A* 退化为 Dijkstra**：$h \equiv 0$ 时 A* = Dijkstra。需选择合适的启发式（如网格用曼哈顿距离，而非 0）。

## 9. 分工边界：本篇、050 与 115 各管什么

- **050-SearchAlgorithm**：无信息搜索的通用篇——线性/二分/哈希查找
  与 BFS/DFS 基础，以及哈希、B+ 树、Redis 字典等静态查找的工程实现。
  读完它你知道「朴素地搜」的极限在哪，才明白本篇为什么存在。
- **115-ShortestPathAndMST**：图论语境的最短路——Dijkstra、
  Bellman-Ford、Floyd 与 MST。边权、负权、稠密稀疏的取舍在那一篇。
- **本篇**：状态空间语境的有信息搜索与博弈——知道目标位置（A*）、
  内存受限（IDA*）、两端已知（双向 BFS）、有对手（Minimax/Alpha-Beta）。
  三篇互相引用，但每个算法的完整讲解只出现在其中一篇。

## 10. 动手实践

**任务一（修正题）**：以下 A* 实现存在一个 bug，请找出并修正：

```python
def astar_buggy(graph, start, end, h):
    open_set = [(h(start, end), 0, start)]
    visited = set()
    while open_set:
        f, g, node = heapq.heappop(open_set)
        if node == end:
            return g
        if node in visited:
            continue
        visited.add(node)
        for neighbor, cost in graph[node]:
            heapq.heappush(open_set, (g + cost + h(neighbor, end), g + cost, neighbor))
    return -1
```

提示：注意循环体里 `neighbor` 入队前没有任何比较——对照第 4.3 节
的正确实现里 `g_score` 的用法。

**任务二（修正题）**：以下双向 BFS 实现存在一个 bug，请找出并修正：

```python
def bidirectional_buggy(graph, start, end):
    front, back = {start}, {end}
    steps = 0
    while front and back:
        next_front = set()
        for node in front:
            for neighbor in graph[node]:
                if neighbor in back:
                    return steps + 1
                next_front.add(neighbor)
        front = next_front
        steps += 1
    return -1
```

提示：想象图上有环，`next_front` 里同一个节点被两个路径同时加入
会发生什么；对照第 2.3 节正确实现里的 `visited`。

**任务三（论述）**：比较 A*、IDA*、双向 BFS 在 15 数码问题上的适用性。
要点自查：状态空间规模（约 $10^{13}$）、平均解深度（约 52.6）、三者
各自的内存特征、目标状态反向生成前驱的难度。

遮代码自检——先自己改完，再对照：

<details>
<summary>参考答案（点开前先自己完成）</summary>

**任务一**：未记录每个节点的最优 $g$ 值，可能将次优路径加入开表。
虽不影响正确性（visited 已保证不重扩展），但效率低。修正：维护
`g_score` 字典，仅在 `new_g < g_score[neighbor]` 时入队：

```python
def astar_fixed(graph, start, end, h):
    open_set = [(h(start, end), 0, start)]
    g_score = {start: 0}
    visited = set()
    while open_set:
        f, g, node = heapq.heappop(open_set)
        if node == end:
            return g
        if node in visited:
            continue
        visited.add(node)
        for neighbor, cost in graph[node]:
            new_g = g + cost
            if neighbor not in g_score or new_g < g_score[neighbor]:
                g_score[neighbor] = new_g
                heapq.heappush(open_set, (new_g + h(neighbor, end), new_g, neighbor))
    return -1
```

**任务二**：未做 visited 标记，图上有环时同一节点会被反复加入
`next_front`，搜索永不收敛。修正：增加 `visited` 集合，入队前检查：

```python
def bidirectional_fixed(graph, start, end):
    front, back = {start}, {end}
    visited = {start, end}
    steps = 0
    while front and back:
        next_front = set()
        for node in front:
            for neighbor in graph[node]:
                if neighbor in back:
                    return steps + 1
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_front.add(neighbor)
        front = next_front
        steps += 1
    return -1
```

**任务三**：A* 因 $O(b^d)$ 内存爆炸不可用；IDA* 空间 $O(d) \approx 53$
极优，Korf 1985 用 IDA* + Manhattan + Linear Conflict 在 SUN-3 求解
平均 50 秒，现代 PDB 优化后毫秒级；双向 BFS 不适用，因为目标状态
难以反向生成前驱（15 数码反向搜索同样巨大）。

</details>

## 11. 参考与延伸

- Hart, Nilsson & Raphael (1968). A Formal Basis for the Heuristic Determination of Minimum Cost Paths. A* 算法原论文。
- Pohl (1971). Bi-directional Search. 双向搜索。
- Knuth & Moore (1975). An analysis of alpha-beta pruning. Alpha-Beta 严格分析。
- Korf (1985). Depth-first iterative-deepening: An optimal admissible tree search. IDA* 原论文。
- Shannon (1950). Programming a Computer for Playing Chess. 首次将 Minimax 应用于国际象棋。
- Russell & Norvig (2020). *Artificial Intelligence: A Modern Approach* (4th ed.). Chapter 3（搜索）与 Chapter 5（对抗搜索）。
- Geisberger et al. (2008). Contraction Hierarchies. 路径规划工业基础。
- Pearl (1984). *Heuristics: Intelligent Search Strategies*. 启发式搜索奠基专著。
- Stockfish 引擎源码：https://github.com/official-stockfish/Stockfish
- VisuAlgo：https://visualgo.net/en/dfsbfs （BFS/DFS/A* 可视化）

> 外部资源免责声明：以上链接为第三方资源，仅作学习索引；其内容的准确性、合法性与可用性由相应运营方负责，仓库维护者不对使用者使用该等资源所产生的各类问题承担责任。
