import type { AlgoProblem } from './types';

/**
 * 算法题图鉴 · 图论篇
 * BFS / DFS / 拓扑排序 / 并查集 / Dijkstra
 * 题面为便于学习的概括复述，参考实现为 Python。
 */
export const GRAPH_PROBLEMS: AlgoProblem[] = [
  {
    slug: 'number-of-islands',
    lc: 200,
    title: '岛屿数量',
    titleEn: 'Number of Islands',
    difficulty: 'medium',
    category: 'graph',
    tags: ['DFS', 'BFS', '连通分量'],
    brief: '统计由陆地组成的岛屿数量。',
    statement:
      '给你一个由 1（陆地）和 0（水）组成的二维网格，请你计算网格中岛屿的数量。岛屿总是被水包围，并且每座岛屿只能由水平方向和/或竖直方向上相邻的陆地连接形成。\n\n示例：网格 [["1","1","0"],["1","0","0"],["0","0","1"]] 有 2 个岛屿。',
    idea: [
      '岛屿 = 陆地格子的连通分量。遍历所有格子，遇到未访问的陆地时计数加一，并把整片相连的陆地"淹掉"。',
      'DFS 从当前位置向四方向递归扩散；BFS 用队列逐层扩散，效果等价。',
      '标记访问可直接把格子改写为 0（或 2），省去 visited 矩阵，且不影响后续判断。',
    ],
    code: `def numIslands(grid):
    m, n = len(grid), len(grid[0])

    def sink(i, j):
        # 深度优先把整片陆地标记为水
        if not (0 <= i < m and 0 <= j < n) or grid[i][j] != '1':
            return
        grid[i][j] = '0'
        sink(i + 1, j)
        sink(i - 1, j)
        sink(i, j + 1)
        sink(i, j - 1)

    count = 0
    for i in range(m):
        for j in range(n):
            if grid[i][j] == '1':
                count += 1
                sink(i, j)
    return count`,
    time: 'O(m · n)',
    space: 'O(m · n)',
    related: ['110-GraphAlgorithms'],
  },
  {
    slug: 'max-area-of-island',
    lc: 695,
    title: '岛屿的最大面积',
    titleEn: 'Max Area of Island',
    difficulty: 'medium',
    category: 'graph',
    tags: ['DFS', '连通分量'],
    brief: '计算岛屿中陆地格子数的最大值。',
    statement:
      '给你一个大小为 m x n 的二进制矩阵 grid，岛屿由一些相邻的 1 组成（只考虑上下左右方向），求岛屿的最大面积（即格子数最多的岛屿的格子数）。\n\n示例：grid = [[0,0,1,0,0,0,0,1,0,0,0,0,0], ...]，最大岛屿面积为 6。',
    idea: [
      '与"岛屿数量"同一框架：DFS 求连通分量，只是这次要返回分量大小。',
      '递归函数返回以当前格为起点的面积：自身 1 + 四个方向合法陆地面积之和；访问过的格子标记为 0 防止重复计数。',
      '全局扫描取最大值。',
    ],
    code: `def maxAreaOfIsland(grid):
    m, n = len(grid), len(grid[0])

    def dfs(i, j):
        if not (0 <= i < m and 0 <= j < n) or grid[i][j] != 1:
            return 0
        grid[i][j] = 0
        # 自身 + 四方向子面积
        return 1 + dfs(i + 1, j) + dfs(i - 1, j) + dfs(i, j + 1) + dfs(i, j - 1)

    return max((dfs(i, j) for i in range(m) for j in range(n)), default=0)`,
    time: 'O(m · n)',
    space: 'O(m · n)',
    related: ['110-GraphAlgorithms'],
  },
  {
    slug: 'rotting-oranges',
    lc: 994,
    title: '腐烂的橘子',
    titleEn: 'Rotting Oranges',
    difficulty: 'medium',
    category: 'graph',
    tags: ['多源 BFS', '分层'],
    brief: '求所有新鲜橘子腐烂所需的最少分钟数。',
    statement:
      '在给定的 m x n 网格 grid 中，每个单元格有三个可能的值：0 空格子、1 新鲜橘子、2 腐烂的橘子。每分钟腐烂橘子四周相邻的新鲜橘子都会腐烂。返回直到单元格中没有新鲜橘子为止所必须经过的最小分钟数；如果不可能返回 -1。\n\n示例：grid = [[2,1,1],[1,1,0],[0,1,1]]，输出 4。',
    idea: [
      '这是"多源最短路"：所有腐烂橘子同时开始扩散，用多源 BFS——初始把全部腐烂橘子入队。',
      'BFS 的层数即扩散的分钟数；每层处理完当前队列全部元素后再进入下一层。',
      '新鲜橘子被腐烂时计数递减，结束后仍有剩余则返回 -1；注意无新鲜橘子的边界（返回 0）。',
    ],
    code: `from collections import deque

def orangesRotting(grid):
    m, n = len(grid), len(grid[0])
    queue = deque()
    fresh = 0
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 2:
                queue.append((i, j))
            elif grid[i][j] == 1:
                fresh += 1
    minutes = 0
    while queue and fresh:
        # 一分钟处理一整层
        for _ in range(len(queue)):
            i, j = queue.popleft()
            for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                if 0 <= x < m and 0 <= y < n and grid[x][y] == 1:
                    grid[x][y] = 2
                    fresh -= 1
                    queue.append((x, y))
        minutes += 1
    return minutes if not fresh else -1`,
    time: 'O(m · n)',
    space: 'O(m · n)',
    related: ['110-GraphAlgorithms'],
  },
  {
    slug: 'course-schedule',
    lc: 207,
    title: '课程表',
    titleEn: 'Course Schedule',
    difficulty: 'medium',
    category: 'graph',
    tags: ['拓扑排序', '入度'],
    brief: '判断带先修约束的课程安排是否可行（检测有向图是否有环）。',
    statement:
      '你这个学期必须选修 numCourses 门课程，记为 0 到 numCourses - 1。有些课程有先修课程要求，用 prerequisites[i] = [a, b] 表示想学课程 a 必须先完成课程 b。判断是否可能完成所有课程的学习。\n\n示例：numCourses = 2，prerequisites = [[1, 0]]，输出 true；prerequisites = [[1, 0], [0, 1]]，输出 false（互相依赖成环）。',
    idea: [
      '建模为有向图：b -> a 表示先修边；"能修完所有课"等价于图中无环。',
      'Kahn 算法（BFS 拓扑排序）：统计各点入度，入度为 0 的节点入队，出队时把它指向的节点入度减一，减到 0 再入队。',
      '最终出队节点数等于总节点数则无环；有环时环内节点入度永远无法降到 0，会被剩余下来。',
    ],
    code: `from collections import deque

def canFinish(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    indeg = [0] * numCourses
    for a, b in prerequisites:
        graph[b].append(a)
        indeg[a] += 1
    queue = deque(i for i in range(numCourses) if indeg[i] == 0)
    taken = 0
    while queue:
        node = queue.popleft()
        taken += 1
        for nxt in graph[node]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                queue.append(nxt)
    return taken == numCourses`,
    time: 'O(V + E)',
    space: 'O(V + E)',
    related: ['270-TopologicalSorting', '110-GraphAlgorithms'],
  },
  {
    slug: 'course-schedule-ii',
    lc: 210,
    title: '课程表 II',
    titleEn: 'Course Schedule II',
    difficulty: 'medium',
    category: 'graph',
    tags: ['拓扑排序', 'Kahn 算法'],
    brief: '返回一个满足先修约束的合法修课顺序。',
    statement:
      '现在你总共有 numCourses 门课需要选，记为 0 到 numCourses - 1。给定课程总量和先修关系 prerequisites，返回你为了学完所有课程所安排的学习顺序（可能有多个正确答案，返回任意一种）；不可能完成则返回空数组。\n\n示例：numCourses = 4，prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]，输出 [0, 1, 2, 3]（或 [0, 2, 1, 3]）。',
    idea: [
      '在第 207 题 Kahn 算法的基础上，把"出队顺序"记录下来就是拓扑序。',
      '每次从队列取出的节点，其全部先修节点都已输出，因此追加到结果末尾总是合法的。',
      '结果长度不足 numCourses 说明存在环，按题意返回空数组。',
    ],
    code: `from collections import deque

def findOrder(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    indeg = [0] * numCourses
    for a, b in prerequisites:
        graph[b].append(a)
        indeg[a] += 1
    queue = deque(i for i in range(numCourses) if indeg[i] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in graph[node]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                queue.append(nxt)
    return order if len(order) == numCourses else []`,
    time: 'O(V + E)',
    space: 'O(V + E)',
    related: ['270-TopologicalSorting'],
  },
  {
    slug: 'clone-graph',
    lc: 133,
    title: '克隆图',
    titleEn: 'Clone Graph',
    difficulty: 'medium',
    category: 'graph',
    tags: ['哈希表', 'DFS', 'BFS'],
    brief: '深拷贝一个无向连通图。',
    statement:
      '给你一个无向连通图中一个节点的引用，请你返回该图的深拷贝（克隆）。图中的每个节点都包含它的值 val 和其邻居的列表 neighbors。\n\n示例：邻接表 [[2, 4], [1, 3], [2, 4], [1, 3]] 克隆后结构一致。',
    idea: [
      '图的克隆难点在"环"：直接递归会无限循环。用哈希表记录「原节点 -> 克隆节点」，兼作访问标记。',
      'DFS：当前节点不在表中就先创建克隆并登记（先登记再递归，防止成环时重复创建），再递归克隆邻居列表。',
      'BFS 版本用队列同样以映射表去重，两个方向都可以，重点是"先建映射再建边"。',
    ],
    code: `def cloneGraph(node):
    if not node:
        return None
    clones = {}  # 原节点 -> 克隆节点

    def dfs(cur):
        if cur in clones:
            return clones[cur]
        copy = Node(cur.val)
        clones[cur] = copy  # 先登记再递归，防止环内重复创建
        for nb in cur.neighbors:
            copy.neighbors.append(dfs(nb))
        return copy

    return dfs(node)`,
    time: 'O(V + E)',
    space: 'O(V)',
    related: ['110-GraphAlgorithms'],
  },
  {
    slug: 'number-of-provinces',
    lc: 547,
    title: '省份数量',
    titleEn: 'Number of Provinces',
    difficulty: 'medium',
    category: 'graph',
    tags: ['并查集', '连通分量'],
    brief: '统计邻接矩阵表示的城市网络中有多少个省份。',
    statement:
      '有 n 个城市，其中一些彼此相连，另一些没有相连。如果城市 a 与城市 b 直接相连，且城市 b 与城市 c 直接相连，那么城市 a 与城市 c 间接相连。「省份」是一组直接或间接相连的城市，组内不含其他没有相连的城市。给你一个 n x n 的矩阵 isConnected，其中 isConnected[i][j] = 1 表示第 i 个城市和第 j 个城市直接相连，返回矩阵中省份的数量。\n\n示例：isConnected = [[1,1,0],[1,1,0],[0,0,1]]，输出 2。',
    idea: [
      '省份即无向图的连通分量，并查集（Union-Find）是这类"动态合并集合 + 查询代表元"问题的标配结构。',
      '初始化每个城市自成一个集合；遍历邻接矩阵，相连的城市执行 union 合并。',
      '合并时按秩/大小连接并在查找时路径压缩，均摊复杂度近似 O(1)；最终省份个数 = 独立集合数（可由合并成功次数倒数得到）。',
      'DFS/BFS 求连通分量同样可行，本题数据形态（邻接矩阵）与并查集特别契合。',
    ],
    code: `def findCircleNum(isConnected):
    n = len(isConnected)
    parent = list(range(n))

    def find(x):
        # 路径压缩：查找途中把节点直接挂到根上
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    provinces = n
    for i in range(n):
        for j in range(i + 1, n):
            if isConnected[i][j]:
                ri, rj = find(i), find(j)
                if ri != rj:
                    parent[ri] = rj
                    provinces -= 1
    return provinces`,
    time: 'O(n^2 · α(n))',
    space: 'O(n)',
    related: ['180-UnionFind', '110-GraphAlgorithms'],
  },
  {
    slug: 'network-delay-time',
    lc: 743,
    title: '网络延迟时间',
    titleEn: 'Network Delay Time',
    difficulty: 'medium',
    category: 'graph',
    tags: ['Dijkstra', '最短路', '优先队列'],
    brief: '求信号从源节点传播到所有节点的最短时间（最短路的最大值）。',
    statement:
      '有 n 个网络节点，标记为 1 到 n。给你一个列表 times，表示信号经过有向边的传递时间 times[i] = (ui, vi, wi)，该信号从节点 ui 经边传到 vi 需要 wi 时间。现在从某个节点 k 发出一个信号，需要多久才能使所有节点都收到信号？如果不能使所有节点收到信号，返回 -1。\n\n示例：times = [[2,1,1],[2,3,1],[3,4,1]]，n = 4，k = 2，输出 2。',
    idea: [
      '单源最短路模板题（边权非负），标准解法是堆优化 Dijkstra，答案为源点到各点最短距离的最大值。',
      '维护「已确定最短距离」与「未确定」两个集合：每次从优先队列取出距离最小的节点，它不可能再被更短路径更新，将其定案。',
      '松弛：取出节点时若队列中记录的距离大于 dist 表，说明是过期条目，直接跳过；对邻居做 dist 更新并入堆。',
      '复杂度 O(E log V)；存在不可达节点时 dist 保持无穷，返回 -1。',
    ],
    code: `import heapq
from collections import defaultdict

def networkDelayTime(times, n, k):
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))
    dist = {}
    heap = [(0, k)]  # (距离, 节点)
    while heap:
        d, node = heapq.heappop(heap)
        if node in dist:
            continue  # 过期条目跳过
        dist[node] = d
        for nxt, w in graph[node]:
            if nxt not in dist:
                heapq.heappush(heap, (d + w, nxt))
    return max(dist.values()) if len(dist) == n else -1`,
    time: 'O(E log V)',
    space: 'O(V + E)',
    related: ['110-GraphAlgorithms', '250-FloydWarshall'],
  },
];
