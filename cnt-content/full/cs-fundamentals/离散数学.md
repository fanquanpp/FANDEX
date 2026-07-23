---
title: 离散数学
module: 'cs-fundamentals'
category: 'Computer Science / Discrete Mathematics'
description: 离散数学核心：逻辑与证明、集合与关系、图论、组合计数、代数结构、形式语言与自动机。
author: fanquanpp
order: 50
tags:
  - 'cs-fundamentals'
  - 'computer-science---discrete-mathematics'
  - algorithm
  - math
difficulty: intermediate
related:
  - 'cs-fundamentals/计算机网络'
  - 'cs-fundamentals/数字逻辑'
  - 'cs-fundamentals/计算机组成原理'
  - 'cs-fundamentals/数据表示与运算'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 逻辑与证明

### 1.1 命题逻辑

```
命题逻辑的基本联结词:

  否定:   NOT p          ~p
  合取:   p AND q        p ^ q
  析取:   p OR q         p v q
  蕴含:   p IMPLIES q    p -> q
  等价:   p IFF q        p <-> q

真值表:

  p | q | ~p | p^q | pvq | p->q | p<->q
  --+---+----+-----+-----+------+------
  T | T | F  |  T  |  T  |  T   |  T
  T | F | F  |  F  |  T  |  F   |  F
  F | T | T  |  F  |  T  |  T   |  F
  F | F | T  |  F  |  F  |  T   |  T

重要等价律:

  双重否定:  ~~p <=> p
  德摩根律:  ~(p ^ q) <=> ~p v ~q
             ~(p v q) <=> ~p ^ ~q
  交换律:    p ^ q <=> q ^ p
  结合律:    (p ^ q) ^ r <=> p ^ (q ^ r)
  分配律:    p v (q ^ r) <=> (p v q) ^ (p v r)
  蕴含等价:  p -> q <=> ~p v q
  逆否命题:  p -> q <=> ~q -> ~p
```

### 1.2 谓词逻辑

```
量词:

  全称量词:  forall x: P(x)   -- 对所有x, P(x)成立
  存在量词:  exists x: P(x)   -- 存在x, 使P(x)成立

量词否定:

  ~forall x: P(x) <=> exists x: ~P(x)
  ~exists x: P(x) <=> forall x: ~P(x)

量词与联结词的分配:

  forall x: (P(x) ^ Q(x)) <=> (forall x: P(x)) ^ (forall x: Q(x))
  exists x: (P(x) v Q(x)) <=> (exists x: P(x)) v (exists x: Q(x))

  注意: forall 对 v 不分配, exists 对 ^ 不分配
```

### 1.3 证明方法

```
常见证明策略:

1. 直接证明:
   假设P为真, 通过逻辑推导证明Q为真
   用于: P -> Q

2. 反证法 (归谬法):
   假设结论为假, 推导出矛盾
   用于: 证明命题P为真 -> 假设~P, 推出矛盾

3. 逆否证明:
   证明 ~Q -> ~P 等价于证明 P -> Q

4. 数学归纳法:
   基础步: P(1) 为真
   归纳步: P(k) -> P(k+1)
   结论: 对所有 n >= 1, P(n) 为真

   强归纳法:
   归纳步: P(1) ^ P(2) ^ ... ^ P(k) -> P(k+1)

5. 构造性证明:
   直接构造满足条件的对象
   用于: 存在性命题 exists x: P(x)
```

**归纳法示例**：

```
命题: 1 + 2 + ... + n = n(n+1)/2

基础步: n=1: 1 = 1*2/2 = 1  成立

归纳步: 假设 1+2+...+k = k(k+1)/2
  1+2+...+k+(k+1) = k(k+1)/2 + (k+1)
                   = (k+1)(k/2 + 1)
                   = (k+1)(k+2)/2
  成立

结论: 对所有 n >= 1, 公式成立
```

> 跨模块引用：[概述](overview)的停机问题证明使用了反证法。[编译原理](compiler)的类型正确性证明使用了归纳法。[C语言](c/overview)的断言(assert)是命题逻辑在编程中的应用。

---

## 2. 集合、关系与函数

### 2.1 集合论基础

```
集合运算:

  并集:  A U B = {x | x in A or x in B}
  交集:  A n B = {x | x in A and x in B}
  差集:  A - B = {x | x in A and x not in B}
  补集:  A^c  = U - A  (U为全集)
  对称差: A xor B = (A-B) U (B-A)

集合恒等式:

  A U (B n C) = (A U B) n (A U C)    分配律
  A n (B U C) = (A n B) U (A n C)    分配律
  (A U B)^c = A^c n B^c              德摩根律
  (A n B)^c = A^c U B^c              德摩根律

幂集:
  P(A) = A的所有子集构成的集合
  |P(A)| = 2^|A|

笛卡尔积:
  A x B = {(a,b) | a in A, b in B}
  |A x B| = |A| * |B|
```

### 2.2 关系

```
关系定义:
  集合A上的关系R是A x A的子集
  (a,b) in R 写作 aRb

关系的性质:

  自反 (Reflexive):    forall a: aRa
  对称 (Symmetric):    aRb => bRa
  反对称 (Antisymmetric): aRb ^ bRa => a=b
  传递 (Transitive):   aRb ^ bRc => aRc

等价关系: 自反 + 对称 + 传递
  例: 模n同余, 集合的等势

偏序关系: 自反 + 反对称 + 传递
  例: 整除关系, 子集包含, 小于等于

等价类与划分:
  等价关系R将A划分为等价类
  [a] = {x | xRa}
  等价类的集合构成A的划分 (partition)

  例: 模3等价关系将Z划分为:
    [0] = {..., -3, 0, 3, 6, ...}
    [1] = {..., -2, 1, 4, 7, ...}
    [2] = {..., -1, 2, 5, 8, ...}
```

### 2.3 函数

```
函数定义:
  f: A -> B 是从A到B的映射
  每个a in A 恰好对应一个 b = f(a) in B

函数性质:

  单射 (Injective):   f(a1) = f(a2) => a1 = a2
  满射 (Surjective):  forall b in B, exists a: f(a) = b
  双射 (Bijective):   单射 + 满射

  |A| < |B|: 不存在A到B的满射
  |A| > |B|: 不存在A到B的单射
  |A| = |B|: 存在双射

可数与不可数:

  可数集: 与自然数N等势的集合
    N, Z, Q 都是可数的
    |Q| = |N| (有理数可数)

  不可数集:
    R, P(N) 是不可数的
    |R| > |N| (Cantor对角线论证)

Cantor定理:
  |P(A)| > |A|  对任何集合A
  即: 2^|A| > |A|
```

> 跨模块引用：[操作系统](os)的进程等价类划分（同组进程）使用了等价关系。[计算机网络](network)的子网划分本质上是IP地址集合上的等价关系。[编译原理](compiler)的类型等价判断依赖于名字等价或结构等价关系。

---

## 3. 图论

### 3.1 图的基本概念

```
图定义: G = (V, E)
  V = 顶点集合
  E = 边集合 (V中元素的无序/有序对)

图的类型:
  无向图: E中的元素是无序对 {u,v}
  有向图: E中的元素是有序对 (u,v)
  加权图: 每条边有权重 w(e)
  简单图: 无自环, 无重边

基本度量:
  度数 d(v): 与v关联的边数
  握手定理: sum(d(v)) = 2|E|  (无向图)
  入度/出度: 有向图中 d_in(v), d_out(v)
  sum(d_in(v)) = sum(d_out(v)) = |E|
```

### 3.2 特殊图

```
完全图 K_n:  每对顶点间都有边
  |E| = n(n-1)/2

二部图:  顶点可分为两个独立集, 边只在两集之间
  判定: 图中无奇数长度的环

树:  连通无环图
  |E| = |V| - 1
  任意两点间有唯一路径
  删去任一边则不连通
  添加任一边则产生环

平面图:  可在平面上画出且边不相交
  欧拉公式: |V| - |E| + |F| = 2  (连通平面图)
  |F| = 面数 (含外部面)
  推论: |E| <= 3|V| - 6  (|V| >= 3)

  非平面图: K_5, K_{3,3} (Kuratowski定理)
```

### 3.3 图的遍历

```
深度优先搜索 (DFS):

DFS(G, v):
  mark v as visited
  for each neighbor w of v:
    if w not visited:
      DFS(G, w)

  应用: 连通性检测, 环检测, 拓扑排序
  时间复杂度: O(|V| + |E|)

广度优先搜索 (BFS):

BFS(G, s):
  queue = [s]
  mark s as visited
  while queue not empty:
    v = queue.dequeue()
    for each neighbor w of v:
      if w not visited:
        mark w as visited
        queue.enqueue(w)

  应用: 最短路径(无权图), 层次遍历
  时间复杂度: O(|V| + |E|)
```

### 3.4 最小生成树

```
Kruskal算法:

  1. 将所有边按权重排序
  2. 依次取最短边, 若不形成环则加入MST
  3. 直到MST有|V|-1条边

  环检测: 并查集 (Union-Find)
  时间复杂度: O(|E| log |E|)

Prim算法:

  1. 从任一顶点开始
  2. 每次选择连接MST内外且权重最小的边
  3. 将新顶点加入MST
  4. 直到所有顶点都在MST中

  实现: 优先队列
  时间复杂度: O(|E| log |V|)

Dijkstra最短路径:

  1. dist[s] = 0, 其余 = infinity
  2. 选择dist最小的未访问顶点u
  3. 松弛: 对u的每个邻居v: dist[v] = min(dist[v], dist[u] + w(u,v))
  4. 标记u为已访问
  5. 重复直到所有顶点已访问

  要求: 所有边权重非负
  时间复杂度: O(|E| log |V|) (优先队列实现)
```

**Dijkstra伪代码**：

```python
def dijkstra(graph, source):
    dist = {v: float('inf') for v in graph}
    dist[source] = 0
    pq = [(0, source)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))
    return dist
```

### 3.5 图着色

```
图着色问题:
  给图的每个顶点着色, 使相邻顶点颜色不同
  最少颜色数 = 色数 chi(G)

  chi(K_n) = n
  chi(二部图) = 2
  chi(平面图) <= 4  (四色定理)

应用:
  [编译原理](compiler)的寄存器分配: 干涉图着色
  [操作系统](os)的资源分配: 无死锁检测
  [计算机网络](network)的信道分配: 频率分配
```

> 跨模块引用：[计算机网络](network)的路由算法（OSPF）基于Dijkstra算法。[编译原理](compiler)的寄存器分配使用图着色算法。[操作系统](os)的资源分配图用于死锁检测。[设计模式](design-patterns)的组合模式形成树结构。

---

## 4. 组合计数

### 4.1 基本计数原理

```
加法原理: 若任务A有m种方式, 任务B有n种方式, 且互斥
  则完成A或B有 m+n 种方式

乘法原理: 若任务A有m种方式, 任务B有n种方式, 且独立
  则完成A然后B有 m*n 种方式

排列:
  P(n, k) = n! / (n-k)!    从n个中选k个排列

组合:
  C(n, k) = n! / (k!(n-k)!)  从n个中选k个组合

  C(n, k) = C(n, n-k)
  C(n, 0) = C(n, n) = 1
  C(n, k) = C(n-1, k-1) + C(n-1, k)  (Pascal恒等式)

有重复的排列:
  n^k  (每个位置有n种选择)

有重复的组合:
  C(n+k-1, k)  (k个不可区分物品放入n个可区分盒子)
```

### 4.2 容斥原理

```
两个集合:
  |A U B| = |A| + |B| - |A n B|

三个集合:
  |A U B U C| = |A| + |B| + |C|
              - |A n B| - |A n C| - |B n C|
              + |A n B n C|

一般形式:
  |U A_i| = sum|A_i| - sum|A_i n A_j| + sum|A_i n A_j n A_k| - ...

应用 - 错排问题:
  D_n = n!(1 - 1/1! + 1/2! - 1/3! + ... + (-1)^n/n!)
  D_n: n个元素的排列中, 没有元素在原来位置的排列数
```

### 4.3 生成函数

```
普通生成函数 (OGF):
  序列 a_0, a_1, a_2, ... 的OGF:
  A(x) = a_0 + a_1*x + a_2*x^2 + ...

  例: C(n,0), C(n,1), ..., C(n,n) 的OGF:
  (1+x)^n = sum C(n,k) * x^k

常见OGF:
  {1,1,1,...}   -> 1/(1-x)
  {1,2,3,...}   -> x/(1-x)^2
  {C(n,k)}      -> (1+x)^n
  {1/n!}        -> e^x

指数生成函数 (EGF):
  B(x) = b_0 + b_1*x/1! + b_2*x^2/2! + ...

  用于排列计数 (考虑顺序)
```

### 4.4 递推关系

```
线性递推:

  一阶: a_n = c * a_{n-1}
    解: a_n = c^n * a_0

  二阶常系数齐次: a_n = p*a_{n-1} + q*a_{n-2}
    特征方程: r^2 = p*r + q
    若两不同根 r1, r2: a_n = A*r1^n + B*r2^n
    若重根 r: a_n = (A + B*n) * r^n

  例: Fibonacci数列
    F_n = F_{n-1} + F_{n-2}, F_0=0, F_1=1
    特征方程: r^2 = r + 1
    r1 = (1+sqrt(5))/2, r2 = (1-sqrt(5))/2
    F_n = (r1^n - r2^n) / sqrt(5)

主定理 (Master Theorem):

  T(n) = a*T(n/b) + f(n)

  情况1: f(n) = O(n^(log_b(a)-e))  =>  T(n) = Theta(n^log_b(a))
  情况2: f(n) = Theta(n^log_b(a))   =>  T(n) = Theta(n^log_b(a) * log n)
  情况3: f(n) = Omega(n^(log_b(a)+e)) => T(n) = Theta(f(n))

  例:
    归并排序: T(n) = 2T(n/2) + O(n)  => T(n) = O(n log n)
    二分搜索: T(n) = T(n/2) + O(1)   => T(n) = O(log n)
    Strassen: T(n) = 7T(n/2) + O(n^2) => T(n) = O(n^2.81)
```

> 跨模块引用：[体系结构](architecture)的缓存关联度计算使用组合计数。[编译原理](compiler)的解析表构造使用容斥原理。[计算机网络](network)的子网划分使用组合计数。[概述](overview)的复杂性类分析使用递推关系和主定理。

---

## 5. 代数结构

### 5.1 群论基础

```
群 (Group) 定义:
  集合G和运算*满足:
  1. 封闭性: a*b in G
  2. 结合律: (a*b)*c = a*(b*c)
  3. 单位元: exists e: e*a = a*e = a
  4. 逆元:   forall a, exists a^-1: a*a^-1 = e

群的例子:
  (Z, +)       整数加法群
  (Z_n, +_n)   模n加法群 (有限循环群)
  (S_n, o)     n元对称群 (n!个置换)
  (Z_p*, *)    模p乘法群 (p为素数, p-1个元素)

子群判定:
  H是G的子群 <=> forall a,b in H: a*b^-1 in H

Lagrange定理:
  |H| 整除 |G|  (有限群中子群的阶整除群的阶)

循环群:
  生成元g: G = {g^0, g^1, ..., g^(n-1)}
  Z_n是循环群, 生成元为1
  Z_p*是循环群 (p为素数)
```

### 5.2 环与域

```
环 (Ring):
  集合R和两个运算+, *满足:
  1. (R, +) 是交换群
  2. (R, *) 满足结合律
  3. 分配律: a*(b+c) = a*b + a*c

域 (Field):
  环R满足:
  1. (R-{0}, *) 是交换群
  2. 乘法交换律

域的例子:
  Q (有理数), R (实数), C (复数)
  Z_p (模p, p为素数) -- 有限域 GF(p)

有限域 GF(2^n):
  元素: 次数 < n 的多项式, 系数在 GF(2) = {0,1}
  加法: 多项式加法 (系数模2)
  乘法: 多项式乘法模不可约多项式

  应用:
    AES加密使用 GF(2^8)
    纠错码 (Reed-Solomon, BCH)
```

### 5.3 数论基础

```
整除与模运算:

  a | b (a整除b): exists k: b = a*k
  a = b*q + r, 0 <= r < b  (带余除法)

  模运算性质:
    (a + b) mod n = ((a mod n) + (b mod n)) mod n
    (a * b) mod n = ((a mod n) * (b mod n)) mod n

最大公因数:
  gcd(a, b) = gcd(b, a mod b)  (Euclid算法)

  扩展Euclid算法:
    gcd(a, b) = s*a + t*b  (Bezout等式)

模逆元:
  a^-1 mod n 存在 <=> gcd(a, n) = 1
  用扩展Euclid算法求

Euler定理:
  a^phi(n) = 1 (mod n), 其中 gcd(a, n) = 1
  phi(n) = Euler函数 = {1 <= k <= n : gcd(k,n) = 1} 的大小

Fermat小定理:
  a^(p-1) = 1 (mod p), p为素数, gcd(a,p) = 1

RSA加密:
  1. 选两个大素数 p, q
  2. n = p*q, phi(n) = (p-1)(q-1)
  3. 选 e: gcd(e, phi(n)) = 1
  4. 计算 d: e*d = 1 (mod phi(n))
  5. 公钥: (n, e), 私钥: (n, d)
  6. 加密: c = m^e mod n
  7. 解密: m = c^d mod n

  正确性: m^(e*d) = m^(1 + k*phi(n)) = m * (m^phi(n))^k = m (mod n)
```

> 跨模块引用：[计算机网络](network)的RSA/ECC加密建立在数论和群论基础上。[编译原理](compiler)的哈希函数使用模运算。[C语言](c/overview)的整数溢出行为与模运算直接相关。[体系结构](architecture)的ALU实现了模2^n的算术运算。

---

## 6. 形式语言与自动机

### 6.1 Chomsky层次

```
Chomsky文法层次 (参见 [编译原理](compiler) 8.2节):

Type-0: 无限制文法
  产生式: alpha -> beta (无限制)
  识别器: 图灵机
  语言: 递归可枚举语言

Type-1: 上下文有关文法
  产生式: alpha A beta -> alpha gamma beta (|gamma| >= 1)
  识别器: 线性有界自动机 (LBA)
  语言: 上下文有关语言

Type-2: 上下文无关文法
  产生式: A -> gamma
  识别器: 下推自动机 (PDA)
  语言: 上下文无关语言

Type-3: 正则文法
  产生式: A -> aB 或 A -> a (右线性)
  识别器: 有限自动机 (DFA/NFA)
  语言: 正则语言

包含关系:
  正则语言 C 上下文无关语言 C 上下文有关语言 C 递归可枚举语言
```

### 6.2 有限自动机

```
DFA (确定性有限自动机):

  M = (Q, Sigma, delta, q0, F)

  Q     = 有限状态集合
  Sigma = 输入字母表
  delta = Q x Sigma -> Q  (转移函数)
  q0    = 初始状态
  F     = 接受状态集合

  DFA状态转移图:

  识别 "以ab结尾的字符串":
        a        b        a        b
  -->[q0]--->[q1]--->[q2]--->[q1]--->[q2]*
                |                    ^
                +---a---(stay q1)---+
                +---b--->(back q0)--+

NFA (非确定性有限自动机):

  delta: Q x (Sigma U {epsilon}) -> P(Q)
  允许: 多个转移, epsilon转移

  NFA -> DFA转换 (子集构造法):
    DFA状态 = NFA状态的子集
    DFA的每个状态对应NFA的一组状态

DFA最小化 (Hopcroft算法):

  1. 初始划分: {接受状态}, {非接受状态}
  2. 对每个划分块, 检查是否可区分:
     若同一块中两个状态对某输入转移到不同块 -> 可区分, 分裂
  3. 重复直到无法再分裂
```

### 6.3 正则表达式

```
正则表达式运算:

  基本符号: a (匹配字符a)
  连接:     ab (a后跟b)
  选择:     a|b (a或b)
  闭包:     a* (零或多个a)
  正闭包:   a+ (一或多个a)
  可选:     a? (零或一个a)

  优先级: 闭包 > 连接 > 选择

正则表达式 <-> DFA/NFA 等价性:

  正则表达式 -> Thompson构造 -> NFA -> 子集构造 -> DFA -> 最小化

  反方向: DFA -> 状态消除法 -> 正则表达式

  Kleene定理: 正则表达式 = DFA = NFA
  三者描述同一语言类: 正则语言

正则语言的性质:

  封闭性: 并, 交, 补, 连接, 闭包
  判定性质: 空性, 等价性, 包含性 均可判定

  泵引理 (Pumping Lemma):
    若L是正则语言, 则存在p(泵长度), 使得
    L中长度>=p的字符串w可分解为xyz:
      1. |xy| <= p
      2. |y| > 0
      3. xy^iz in L 对所有 i >= 0

    用途: 证明某语言不是正则语言
    例: {a^n b^n | n >= 0} 不是正则语言
```

### 6.4 下推自动机与上下文无关语言

```
PDA (下推自动机):

  M = (Q, Sigma, Gamma, delta, q0, Z0, F)

  Gamma = 栈字母表
  Z0    = 栈底符号
  delta = Q x (Sigma U {epsilon}) x (Gamma U {epsilon})
          -> P(Q x (Gamma U {epsilon}))

  PDA = NFA + 栈

  例: 识别 {a^n b^n | n >= 0}

  状态转移:
    (q0, a, Z0) -> (q0, AZ0)    读a, 压A
    (q0, a, A)  -> (q0, AA)     读a, 压A
    (q0, b, A)  -> (q1, epsilon) 读b, 弹A
    (q1, b, A)  -> (q1, epsilon) 读b, 弹A
    (q1, epsilon, Z0) -> (q2, Z0) 栈空, 接受

CFL的性质:

  封闭性: 并, 连接, 闭包 (不封闭于交和补)
  CFL交正则语言 = CFL

  CFL泵引理:
    存在p, L中长度>=p的字符串w可分解为uvxyz:
      1. |vxy| <= p
      2. |vy| > 0
      3. uv^ixy^iz in L 对所有 i >= 0

  例: {a^n b^n c^n | n >= 0} 不是CFL
```

> 跨模块引用：[编译原理](compiler)的词法分析使用DFA/正则表达式，语法分析使用CFG/PDA。[概述](overview)的计算理论建立在Chomsky层次之上。[体系结构](architecture)的CPU控制单元本质上是有限状态机。

---

## 7. 速查表

### 7.1 逻辑速查

| 等价律   | 公式                  |
| -------- | --------------------- |
| 德摩根   | ~(p^q) = ~~pv~~q      |
| 蕴含     | p->q = ~pvq           |
| 逆否     | p->q = ~q->~p         |
| 双重否定 | ~~p = p               |
| 分配     | pv(q^r) = (pvq)^(pvr) |

### 7.2 图论速查

| 算法           | 用途                 | 复杂度     |
| -------------- | -------------------- | ---------- |
| DFS            | 遍历/环检测/拓扑排序 | O(V+E)     |
| BFS            | 最短路径(无权)       | O(V+E)     |
| Dijkstra       | 最短路径(非负权)     | O(E log V) |
| Kruskal        | 最小生成树           | O(E log E) |
| Prim           | 最小生成树           | O(E log V) |
| Floyd-Warshall | 全源最短路径         | O(V^3)     |

### 7.3 计数速查

| 场景        | 公式                          |
| ----------- | ----------------------------- |
| 排列 P(n,k) | n!/(n-k)!                     |
| 组合 C(n,k) | n!/(k!(n-k)!)                 |
| 有重复排列  | n^k                           |
| 有重复组合  | C(n+k-1,k)                    |
| 错排 D_n    | n! \* sum((-1)^i/i!)          |
| 容斥(2集)   | \|AUB\| = \|A\|+\|B\|-\|AnB\| |

### 7.4 自动机速查

| 自动机  | 栈   | 语言类         | 应用     |
| ------- | ---- | -------------- | -------- |
| DFA/NFA | 无   | 正则语言       | 词法分析 |
| PDA     | 1个  | 上下文无关语言 | 语法分析 |
| LBA     | 受限 | 上下文有关语言 | 语义分析 |
| TM      | 无限 | 递归可枚举     | 通用计算 |

### 7.5 数论速查

| 定理         | 公式                            |
| ------------ | ------------------------------- |
| Fermat小定理 | a^(p-1) = 1 (mod p)             |
| Euler定理    | a^phi(n) = 1 (mod n)            |
| CRT          | x = a_i (mod m_i) 有解当m_i互素 |
| Wilson定理   | (p-1)! = -1 (mod p)             |

---

## 延伸阅读

- _Discrete Mathematics and Its Applications_ -- Kenneth H. Rosen
- _Introduction to Automata Theory, Languages, and Computation_ -- Hopcroft, Motwani, Ullman
- _Concrete Mathematics_ -- Graham, Knuth, Patashnik
- _A Course in Number Theory and Cryptography_ -- Neal Koblitz
