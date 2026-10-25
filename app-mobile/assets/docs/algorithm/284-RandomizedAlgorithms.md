---
order: 350
title: 随机化算法
module: 'algorithm'
category: 计算机科学
difficulty: beginner
description: 随机化快排、Fisher-Yates 洗牌、蓄水池抽样、蒙特卡洛与拉斯维加斯——用随机换简单与公平
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：随机化算法——在算法流程中掷骰子的三类收益：避免对抗性最坏输入（随机快排）、保证公平分布（洗牌）、单遍处理无限流（蓄水池抽样），以及按「错误方向」分类的蒙特卡洛与拉斯维加斯两大范式。
- **解决什么问题**：快排被构造性输入打成 O(n^2)；「随机推荐一首歌」要求每首等概率且无偏；日志文件太大存不下却要等概率抽样一条；某些精确算法写不出来或太慢，宁可要一个 99.99% 可靠的近似答案。
- **什么时候用到**：任何调用通用排序库之前理解它为什么内部随机化；抽样与 A/B 分流；流式采样；用随机重试换确定性构造。

## 1. 为什么把硬币掺进算法

确定性算法的性能由最坏输入决定——而最坏输入往往恰好是真实世界会出现的（已排序数组打快排、哈希表遭遇连续碰撞）。随机化把「输入决定命运」改成「输入与算法共同决定命运」： adversary 仍可挑选输入，但无法预知你的随机种子。

两个经典收益维度：

1. **性能**：期望复杂度优于确定性最坏复杂度（随机化快排期望 O(n log n)）；
2. **公平性/无偏性**：洗牌、抽样要求每个样本等概率——确定性方法做不到「无偏」，随机是唯一正解。

**随机与可复现的工程折衷（真实工程例）**：随机不等于不可复现。本仓库 c-projects 素材项目（speed-rouge）的地牢生成器在 `tools/progen_level.gd:73-74` 用确定性 RNG 并以 `--seed` 命令行参数为契约——同一种子必出同一关卡，调试与「分享种子复现同图」都依赖它。工程惯例：算法内部掷骰子，但骰子来源可注入（DI），生产跑真随机、测试与调试注入固定种子。

## 2. 随机化快排与期望复杂度

快排的性能取决于 pivot 的分割质量。固定取首位 pivot 时，精心构造的输入（如已排序）让每轮只分割出 0/1 两半，退化为 $O(n^2)$。随机化只需一行改动：

```python
import random

def randomized_quicksort(arr: list[int]) -> list[int]:
    """随机化快排：期望 O(n log n)，与输入分布无关"""
    if len(arr) <= 1:
        return arr
    pivot = arr[random.randrange(len(arr))]   # 唯一的随机点
    lt = [x for x in arr if x < pivot]
    eq = [x for x in arr if x == pivot]
    gt = [x for x in arr if x > pivot]
    return randomized_quicksort(lt) + eq + randomized_quicksort(gt)
```

**期望复杂度的直觉**：pivot 随机取时，无论输入长什么样，「取到中位附近 1/4 到 3/4 区间」的概率是 1/2——期望上每两轮至少把区间砍到 3/4，递归深度期望 $O(\log n)$，总期望比较次数 $O(n \log n)$（严格推导见 CLRS 第 7 章）。注意它与「平均情况分析」的区别：平均情况假设输入服从某分布（主观），随机化期望对**任意输入分布**成立（客观）——这与 282 篇摊还分析 vs 平均情况的辨析同构。

**工程对照**：C++ 的 `std::sort`（introsort）走「快排 + 递归过深转堆排 + 小段转插排」的混合路线，多数标准库同时用三点取样或随机取样防构造输入——「防御性随机化」已是通用库的标配。

## 3. Fisher-Yates 洗牌

需求：把 n 个元素均匀随机排列，n! 种排列每种概率恰为 1/n。

```python
import random

def fisher_yates_shuffle(arr: list[int]) -> list[int]:
    """Fisher-Yates 洗牌：O(n)，每个排列等概率"""
    a = arr[:]                    # 不污染原数组
    for i in range(len(a) - 1, 0, -1):
        j = random.randint(0, i)  # 从 [0, i] 均匀取
        a[i], a[j] = a[j], a[i]
    return a
```

**归纳证明等概率**：第 i 轮从 [0, i] 均匀选一个位置放到末位——每个元素被选中进入位置 i 的概率 1/(i+1)；连乘 $\frac{1}{n} \cdot \frac{n-1}{n-1} \cdots$ 归纳得每个排列概率 $1/n!$。

**为什么不能「每张牌随机换到任意位置」**（新手写法）：`for i in range(n): swap(arr[i], arr[randrange(n)])` 产生 $n^n$ 条等概率交换路径，而排列只有 $n!$ 种——$n^n$ 无法整除 $n!$，必有排列概率偏高。n=3 时 216 条路径对应 6 种排列，无法均分（216/6=36 恰好整除？不——路径不与排列一一对应，直接计数模拟可见偏差约 8%）。**洗牌必须用 Fisher-Yates**，这是「看着差不多」与「数学正确」的经典分野。

**真实工程例**：音乐 App 的随机播放。朴素「真随机下一首」会连续重复；正确姿势是 Fisher-Yates 洗整张歌单、按顺序播放、播完重洗——既保证短窗口内无重复又长期均匀。

## 4. 蓄水池抽样：单遍等概率抽 k 条

需求：数据流长度未知（可能读不完），要求每个元素入选 k 个样本的概率相等 = k/N。不能先数长度再抽样（要两遍），蓄水池抽样一遍完成：

```python
import random

def reservoir_sample(stream, k: int):
    """蓄水池抽样：流中任意元素入选概率恰为 k/N（N 为流总长）"""
    reservoir = []
    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)          # 前 k 个直接入池
        else:
            j = random.randint(0, i)        # 第 i+1 个元素以 k/(i+1) 概率替换
            if j < k:
                reservoir[j] = item
    return reservoir
```

**正确性归纳**：第 i 个元素（0 起）到手的概率——它出现时以 k/(i+1) 进池，之后每个后来者把它挤出去的概率是 k/(i+2) x 1/k = 1/(i+2)，存活概率连乘 $\frac{k}{i+1} \prod_{t=i+2}^{N} \frac{t-1}{t} = \frac{k}{N}$，与 i 无关。

**变体**：k=1 的特例「流式等概率抽一条」最常用——第 i 个元素以 1/i 概率替换当前样本；加权版（A-Res 算法）按权重抽样，用于带优先级的探索。

## 5. 两大范式：蒙特卡洛与拉斯维加斯

按「随机影响答案还是只影响速度」分类：

| 范式       | 正确性         | 运行时间   | 例子                     |
| :--------- | :------------- | :--------- | :----------------------- |
| 拉斯维加斯 | 永远正确       | 随机       | 随机化快排、随机 pivot 选择 |
| 蒙特卡洛   | 有小概率出错   | 固定/可控  | Miller-Rabin、蒙特卡洛积分 |

- **拉斯维加斯（Las Vegas）**：宁可慢，不说错。随机化快排结果永远正确，波动只在耗时；
- **蒙特卡洛（Monte Carlo）**：限定时间，接受可控错误率。275 篇的 Miller-Rabin 是 20 轮后错误率低于 $4^{-20}$ 的蒙特卡洛质数检验；估算圆周率（随机撒点数比例）是最小教学例。

**可以互相转化**：把蒙特卡洛反复跑（错误率指数下降）近似拉斯维加斯；拉斯维加斯限死运行时间近似蒙特卡洛。

## 6. 概率视角回顾：跳表与布隆过滤器

210/220 篇的两个结构本质上都是随机化算法的受益者，从本文视角收拢：

- **跳表（210 篇）**：每个节点「以 1/2 概率晋升到上一层」——随机化替代 AVL 的严格旋转维护，期望 O(log n)；它的正确性来自概率，属于「性能靠随机」的拉斯维加斯式设计；
- **布隆过滤器（220 篇）**：多哈希 + 位数组，判「一定没有 / 可能有」，误报率由位数组大小与哈希数精确控制——典型的蒙特卡洛（可能给出假阳性）结构。

## 7. 不同场景下的例子

**例一：确定性 RNG 的游戏关卡（真实工程例，见第 1 节）**。speed-rouge 的 `progen_level.gd:73-74` 以种子驱动的 RNG 生成关卡并暴露 `--seed` 参数——bug 报告附上种子即可精确复现关卡；玩家社区「种子挑战」也因此成立。实现要点：所有随机调用走同一个可注入的 RNG 实例，禁止直接调全局随机函数（否则测试无法固定）。

**例二：从数据流等概率抽一条日志**。线上日志每秒百万条且不可回放，要抽 1% 做人工审阅。蓄水池抽样（k=1000，每小时重置）一遍流过、内存恒定；每条日志入选概率严格 1%——比「取哈希尾数」的朴素办法好在**无偏可证**，审计与合规场景认这个性质。

**例三：抽奖公平性**。运营抽奖从百万参与者抽 100 名中奖者：全量入内存 Fisher-Yates 后取前 100 是教科书解；量更大用蓄水池抽样流式抽。共同点：每个参与者中奖概率可数学证明为 100/N——抽奖审计要求的就是这个证明，而不是「感觉上随机」。

**例四：负载均衡的随机幂次选择（power of two choices）**。把新请求随机挑两台服务器、发给较闲的一台——两行代码的随机化让集群负载方差远低于纯随机，接近最优调度。这是「少量随机 + 简单比较胜过复杂全局策略」的名例（分布式系统经典结果）。

## 动手实践

**练习 1（洗牌正确性验证）**：对 3 元素数组 [1,2,3] 分别用 Fisher-Yates 与「每张牌随机换任意位置」各跑 10 万次，统计 6 种排列的出现频率；对比两者的偏差（卡方或直接看极差）。

**提示**：正确实现的频率应全在 16667 附近（±300 内）；错误实现某些排列会明显偏多（约 18000+）。

**练习 2（蓄水池抽样验证）**：对 1..1000 的流用 k=10 抽样跑 2000 轮，统计每个元素入选次数，验证均值约 20（= 10 x 2000/1000）且无明显离群。

**提示**：任何元素入选率应接近 1%；系统性偏高/偏低说明实现写错（常见错误：randint(0, i-1) 或先判 j<k 后生成）。

**练习 3（随机快排的防御性）**：构造 10^5 规模的已排序数组，分别用「首位 pivot」与「随机 pivot」的快排计时；再给随机版注入固定种子重跑三次，验证结果一致且耗时稳定。

**提示**：首位 pivot 版在有序输入上会卡到近似 O(n^2)（Python 上注意递归深度限制，可改成迭代或减小规模）；固定种子用 `random.seed(42)`。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```python
import random
from collections import Counter

# 练习 1
def naive_shuffle(a):
    a = a[:]
    for i in range(len(a)):
        j = random.randint(0, len(a) - 1)
        a[i], a[j] = a[j], a[i]
    return a

cnt_fy, cnt_naive = Counter(), Counter()
perms = [(1,2,3),(1,3,2),(2,1,3),(2,3,1),(3,1,2),(3,2,1)]
for _ in range(100_000):
    cnt_fy[tuple(fisher_yates_shuffle([1,2,3]))] += 1
    cnt_naive[tuple(naive_shuffle([1,2,3]))] += 1
for p in perms:
    print(p, cnt_fy[p], cnt_naive[p])
# FY 各约 16667；naive 出现明显不均（如 (3,1,2)/(3,2,1) 约 18500）

# 练习 2
counts = Counter()
for _ in range(2000):
    for x in reservoir_sample(iter(range(1, 1001)), 10):
        counts[x] += 1
vals = [counts[x] for x in range(1, 1001)]
print(sum(vals) / 1000)          # ≈ 20
print(max(vals), min(vals))      # 离群应在 ±3σ（约 20±13）内

# 练习 3
import time
def quicksort_first(arr):
    if len(arr) <= 1: return arr
    pivot = arr[0]               # 首位 pivot
    lt = [x for x in arr if x < pivot]
    eq = [x for x in arr if x == pivot]
    gt = [x for x in arr if x > pivot]
    return quicksort_first(lt) + eq + quicksort_first(gt)

data = list(range(50_000))       # 有序输入 = 快排最坏输入
t = time.perf_counter(); quicksort_first(data[:5000]); print(time.perf_counter() - t)
# 5000 已可感知卡顿；随机 pivot 版 10 万级毫秒完成
random.seed(42)
r1 = randomized_quicksort(data[:]); random.seed(42)
r2 = randomized_quicksort(data[:])
assert r1 == r2 == sorted(data)  # 同种子同结果：可复现
```

</details>

## 参考与致谢

- Cormen et al.,《Introduction to Algorithms》第 5 章（概率分析与随机化算法）、第 7 章（随机化快排期望分析）（CLRS, MIT Press）
- Motwani & Raghavan,《Randomized Algorithms》, Cambridge University Press（蒙特卡洛/拉斯维加斯分类的标准出处）
- Vitter,「Random Sampling with a Reservoir」, ACM TOMS 11(1), 1985（蓄水池抽样原始论文）
- Mitzenmacher & Upfal,《Probability and Computing》（power of two choices 等结果）
- 本文确定性 RNG 工程例引自本仓库 c-projects 素材项目 speed-rouge（仓库内部素材）。
