---
order: 320
title: 数论与模运算算法
module: 'algorithm'
category: 计算机科学
difficulty: beginner
description: GCD、扩展欧几里得、快速幂、素数筛、同余与逆元——以 RSA 直观流程收束
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：数论基础算法——整除关系上的可计算工具：最大公约数、线性同余方程、模幂、素数筛、模逆元。
- **解决什么问题**：分数化简要约掉最大公约数；循环队列/哈希取模要知道模运算规则；密码学要算大数的模幂与模逆；判断大数是否为质数校验哈希。本文素材源自 C 语言题库中的特殊数系列（最大公约数与最小公倍数、素数判断题组）与整除类题目，改写为 Python 实现并系统化。
- **什么时候用到**：竞赛/笔试的 GCD 与筛法题；工程里的分页分组、循环缓冲、哈希取模；理解 RSA 这类公钥密码的最小原理。

## 1. GCD 与辗转相除

### 1.1 两个起点：gcd 与 lcm

最大公约数是一切数论算法的地基。欧几里得算法（辗转相除）基于恒等式 $\gcd(a, b) = \gcd(b, a \bmod b)$：

```python
def gcd(a: int, b: int) -> int:
    """欧几里得算法：O(log min(a, b))"""
    while b:
        a, b = b, a % b
    return a

def lcm(a: int, b: int) -> int:
    """最小公倍数：lcm(a,b) = a*b / gcd(a,b)，先除后乘防溢出"""
    return a // gcd(a, b) * b

assert gcd(48, 18) == 6
assert lcm(4, 6) == 12
```

`a % b` 让较大数每两轮至少减半，复杂度 $O(\log \min(a,b))$——最坏情形是相邻 Fibonacci 数（反证见 TAOCP）。`lcm` 先除后乘：`a * b // gcd(a,b)` 在两个大数相乘时可能溢出（Python 无所谓，C++/Java 是真 bug）。

**为什么恒等式成立**：设 $d$ 整除 $a$ 与 $b$，则 $a \bmod b = a - kb$ 也被 $d$ 整除——公约数集合在变换前后不变，最大公约数自然不变。

### 1.2 场景例子

**例一：分数化简**。计算 $48/18$，先约分：`g = gcd(48, 18) = 6`，得 $8/3$。任何分数运算库的第一步都是约分，否则分子分母在连乘中指数级膨胀。

**例二：等差分组**。30 人分批做实验，每批人数必须同时能被实验台数 6 与指导老师数 4 整除——每批最少人数就是 $\text{lcm}(6, 4) = 12$。铺砖、齿轮啮合、信号周期对齐都是 lcm 问题。

**例三：循环队列取模**。容量为 n 的环形缓冲区，写入指针 `head = (head + 1) % n`——取模把线性递增折回环上。这里 n 取 2 的幂时 `% n` 可换位运算 `& (n-1)`（见 240 篇位运算），一次与运算快于一次除法。

## 2. 扩展欧几里得与线性同余方程

标准 gcd 只回答「最大公约数是多少」，扩展版额外回答「它怎么由 a、b 线性组合出来」：求 $x, y$ 使 $ax + by = \gcd(a, b)$（Bézout 恒等式）。

```python
def ext_gcd(a: int, b: int) -> tuple[int, int, int]:
    """返回 (g, x, y) 使 a*x + b*y == g == gcd(a, b)"""
    if b == 0:
        return a, 1, 0
    g, x1, y1 = ext_gcd(b, a % b)
    # b*x1 + (a % b)*y1 = g
    # a % b = a - (a // b) * b 代入整理：
    # a*y1 + b*(x1 - (a//b)*y1) = g
    return g, y1, x1 - (a // b) * y1

assert ext_gcd(48, 18) == (6, -1, 3)   # 48*(-1) + 18*3 = 6
```

递归回代那一步是全部难点：下一层已给出 `b*x1 + (a%b)*y1 = g`，把 `a % b = a - (a//b)*b` 代入并按 a、b 归并系数，就得到上一层的 x、y。**用途**：解线性同余方程 $ax \equiv c \pmod m$——有解当且仅当 $\gcd(a, m) \mid c$，一组解为 $x = x_0 \cdot (c/g) \bmod (m/g)$，其中 $ax_0 + my_0 = g$ 由 ext_gcd 给出。

## 3. 快速幂与模运算

### 3.1 快速幂：把 O(n) 次乘法压到 O(log n)

计算 $a^n$，朴素连乘要 n 次；快速幂利用

$$a^n = \begin{cases} (a^{n/2})^2 & n \text{ 偶} \\ a \cdot (a^{(n-1)/2})^2 & n \text{ 奇} \end{cases}$$

```python
def qpow(a: int, n: int, mod: int | None = None) -> int:
    """快速幂：O(log n) 次乘法；给定 mod 时全程取模"""
    result = 1
    a %= mod if mod else a
    while n:
        if n & 1:                 # 当前二进制位是 1，乘上这一位的权重
            result = result * a if not mod else result * a % mod
        a = a * a if not mod else a * a % mod   # 权重逐位平方
        n >>= 1
    return result

assert qpow(2, 10) == 1024
assert qpow(2, 10, 1000) == 24
```

逐行看：n 的二进制展开 $n = \sum b_i 2^i$ 意味着 $a^n = \prod a^{b_i 2^i}$——`a` 每轮平方一次就是 $a^{2^i}$，遇到二进制位 1 就乘进结果。10 = `1010₂`，计算 $2^{10}$ 只做了 2 次有效乘法。**模运算规则**（全程取模的依据）：$(a \cdot b) \bmod m = ((a \bmod m) \cdot (b \bmod m)) \bmod m$，加法同理——乘积会溢出/爆精度时，每步取模数值不变。

**易错点**：模运算下 `result * a` 本身可能仍超界（C++ 的 long long 里两个 $10^9$ 级数相乘溢出），竞赛惯用 `__int128` 或龟速乘；Python 的无限精度整数无此忧。

### 3.2 场景例子

**例一：密码学模幂**。RSA 的核心运算就是模幂 $c = m^e \bmod n$，指数是几百位大数——朴素连乘在宇宙热寂前都跑不完，快速幂约两千次乘法完成。第 6 节完整展开。

**例二：幂取余的循环检测**。$3^{2024}$ 的个位数：个位只由底数个位的幂决定，且 3 的幂个位按 3,9,7,1 循环（周期 4）——`3 ** (2024 % 4)` 直接得 1。周期取模是这类「天文数字的尾数」题的通用解法。

**例三：哈希与随机种子**。多项式滚动哈希 $h = (h \cdot B + c) \bmod M$（150 篇字符串哈希）依赖模运算的均匀性；线性同余生成器 `seed = (seed * a + c) % m` 是最小可用伪随机数发生器（可复现随机的工程取舍见 284 篇）。

## 4. 素数：判断与筛

### 4.1 单个数判断：试除到平方根

```python
def is_prime(n: int) -> bool:
    """判断 n 是否为质数：O(√n)"""
    if n < 2:
        return False
    if n < 4:
        return True          # 2, 3
    if n % 2 == 0 or n % 3 == 0:
        return False
    # 6k±1 优化：所有质数 (>3) 都在 6k±1 位置
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True
```

为什么只试除到 $\sqrt{n}$：若 $n = a \cdot b$ 且 $a > \sqrt{n}$，则 $b < \sqrt{n}$——小因子先现身。6k±1 优化的依据：2、3 的倍数已排除，剩余候选只剩 $6k\pm1$ 形式（其他位置都能被 2 或 3 整除），试除次数再降 2/3。

### 4.2 批量筛法：埃氏筛与欧拉筛

```python
def sieve_eratosthenes(n: int) -> list[bool]:
    """埃拉托斯特尼筛：O(n log log n)，is_prime[i] 表示 i 是否质数"""
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    for i in range(2, int(n ** 0.5) + 1):
        if is_prime[i]:
            # 从 i*i 开始标记：更小的倍数已被更小的质数标记过
            for j in range(i * i, n + 1, i):
                is_prime[j] = False
    return is_prime

def sieve_euler(n: int) -> list[int]:
    """欧拉筛（线性筛）：O(n)，每个合数只被最小质因数筛一次，返回质数表"""
    is_comp = [False] * (n + 1)
    primes = []
    for i in range(2, n + 1):
        if not is_comp[i]:
            primes.append(i)
        for p in primes:
            if i * p > n:
                break
            is_comp[i * p] = True
            if i % p == 0:
                break   # p 是 i 的最小质因数，再往后 i*p 会被更大的循环重复筛
    return primes

assert sum(sieve_eratosthenes(30)) and sieve_euler(30) == [2,3,5,7,11,13,17,19,23,29]
```

埃氏筛从 `i*i` 起标记（小倍数已被更小质数处理）已是 $O(n \log \log n)$；欧拉筛的关键在 `if i % p == 0: break`——保证每个合数只被它的**最小质因数**筛掉一次，12 = 2x6 被筛、不会又以 3x4 再筛一次，总操作数恰为 n。需要「1 到 n 每个数是否质数」时用埃氏筛（更好写），需要「每个数的最小质因数」做分解时用欧拉筛（顺便记录）。

### 4.3 大数判质：概率路线的一瞥

$10^{18}$ 级的数试除 $10^9$ 次不可接受。工程答案是把「必对」换成「1 - 极小概率错」：Miller-Rabin 用随机基底做费马小定理检验，单轮错误概率 $\leq 1/4$，20 轮后错误率低于硬件翻转概率——Python 标准库 `sympy.isprime` 即此路线。这与 284 篇「蒙特卡洛方法」同一哲学。

## 5. 同余与模逆元

模 m 下没有除法——$a / b \bmod m$ 不等于 $(a \bmod m) / (b \bmod m)$。替代品是**模逆元**：$b^{-1}$ 使 $b \cdot b^{-1} \equiv 1 \pmod m$，除以 b 等价于乘 $b^{-1}$。

逆元存在当且仅当 $\gcd(b, m) = 1$，用扩展欧几里得求：

```python
def mod_inverse(b: int, m: int) -> int:
    """求 b 在模 m 下的逆元：要求 gcd(b, m) == 1"""
    g, x, _ = ext_gcd(b, m)
    if g != 1:
        raise ValueError(f"{b} has no inverse mod {m}")
    return x % m

assert mod_inverse(3, 7) == 5      # 3 * 5 = 15 ≡ 1 (mod 7)
```

m 为质数时还有费马小定理路线：$b^{-1} \equiv b^{m-2} \pmod m$，一次快速幂搞定：

```python
def mod_inverse_fermat(b: int, m: int) -> int:
    """m 为质数时：b^(m-2) mod m 即逆元"""
    return qpow(b, m - 2, m)

assert mod_inverse_fermat(3, 7) == 5
```

**为什么组合计数离不开逆元**：$C(n, k) = n! / (k!(n-k)!)$ 中除法在模意义下必须换成乘逆元，竞赛取模题的标准套路是预处理阶乘与逆元表。

## 6. 收束：RSA 的直观流程

全部零件就位后，RSA 可以用六行伪流程讲清：

```text
1. 选两个大质数 p、q（Miller-Rabin 找的），n = p*q
2. 取 e 与 φ(n) = (p-1)(q-1) 互质（gcd(e, φ(n)) = 1）
3. 算私钥 d = e^{-1} mod φ(n)        ← 模逆元（ext_gcd 路线）
4. 加密：c = m^e mod n               ← 快速幂
5. 解密：m = c^d mod n               ← 快速幂（数论可证还原明文）
6. 安全性根基：已知 n 求 φ(n) 需分解 n = p*q，大数分解目前无有效算法
```

「为什么解密能还原」由欧拉定理保证：$m^{ed} = m^{1 + k\varphi(n)} \equiv m \pmod n$——$ed \equiv 1 \pmod{\varphi(n)}$ 正是第 3 步逆元的定义。GCD、逆元、快速幂、大数判质四个工具在一个真实系统里全部登场，这就是本文所有小节的收束点。真实工程用现成密码库（Python `cryptography`），不要手写 RSA——这里的价值是理解原理。

## 动手实践

**练习 1（GCD 应用）**：写 `simplify(num, den)` 把分数约成最简并返回 `(分子, 分母)`；再写 `add_fraction(f1, f2)` 做分数加法，结果自动约分。用 $1/6 + 1/10 = 4/15$ 验证。

**提示**：加法通分用 lcm；结果符号放分子上。

**练习 2（筛法对比）**：分别用埃氏筛与欧拉筛筛出 $10^6$ 内全部质数并计时对比；再给欧拉筛加一行记录最小质因数，用它分解 360 = 2^3 x 3^2 x 5。

**提示**：分解就是反复除以最小质因数；对照埃氏筛的循环起点理解「为什么 i*i 开始」。

**练习 3（RSA 玩具版）**：用 p=61、q=53 走完 RSA 六步（n=3233，φ=3120，e=17，d=2753），加密 m=65 得 c=2747，再解密还原。全部用本文的 `qpow`/`ext_gcd` 完成。

**提示**：这组数字是维基百科 RSA 条目的经典示例，方便核对；d 用 `mod_inverse(17, 3120)` 算。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```python
# 练习 1
def simplify(num: int, den: int) -> tuple[int, int]:
    g = gcd(abs(num), abs(den))
    return num // g, den // g

def add_fraction(f1, f2):
    n1, d1 = f1; n2, d2 = f2
    return simplify(n1 * d2 + n2 * d1, d1 * d2)

assert simplify(48, 18) == (8, 3)
assert add_fraction((1, 6), (1, 10)) == (4, 15)

# 练习 2（分解）
def factorize(n: int, smallest: list[int]) -> list[int]:
    factors = []
    while n > 1:
        p = smallest[n]
        factors.append(p)
        while n % p == 0:
            n //= p
    return factors

# smallest 数组：欧拉筛循环里加 is_comp[i*p] 的同时记录 spf[i*p] = p
# factorize(360, spf) → [2, 2, 2, 3, 3, 5]

# 练习 3（RSA 玩具版）
p, q, e = 61, 53, 17
n = p * q                 # 3233
phi = (p - 1) * (q - 1)   # 3120
assert gcd(e, phi) == 1
d = mod_inverse(e, phi)   # 2753
m = 65
c = qpow(m, e, n)         # 2747
assert qpow(c, d, n) == m
```

</details>

## 参考与致谢

- Cormen et al.,《Introduction to Algorithms》第 31 章 Number-Theoretic Algorithms（CLRS, MIT Press）
- Knuth, TAOCP Vol.2 §4.5.2（扩展欧几里得与模逆元）
- Wikipedia RSA (cryptosystem) 条目的示例参数（p=61, q=53），CC BY-SA 4.0
- 本文素数题组与 GCD/LCM 题目素材源自本仓库 C 语言题库扫描素材（仓库内部素材），实现改写为 Python。
