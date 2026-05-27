# 统计学 -- 描述统计、推断统计与假设检验

> @Version: v4.0.0
> @Author: fanquanpp
> @Category: Data Science / Statistics
> @Description: 数据分析所需的统计学基础：描述统计量、概率分布、参数估计、假设检验与 Python 实现

---

## 目录

- [1. 统计学概述](#1-统计学概述)
- [2. 描述统计](#2-描述统计)
- [3. 概率基础](#3-概率基础)
- [4. 常见概率分布](#4-常见概率分布)
- [5. 抽样与抽样分布](#5-抽样与抽样分布)
- [6. 参数估计](#6-参数估计)
- [7. 假设检验](#7-假设检验)
- [8. 方差分析（ANOVA）](#8-方差分析anova)
- [9. 相关与回归](#9-相关与回归)
- [10. 非参数检验](#10-非参数检验)
- [11. Python 实现工具](#11-python-实现工具)
- [12. 速查表](#12-速查表)
- [13. 延伸阅读](#13-延伸阅读)

---

## 1. 统计学概述

### 1.1 描述统计 vs 推断统计

统计学分为两大分支：

| 分支 | 目标 | 方法 | 示例 |
|------|------|------|------|
| 描述统计 | 总结和描述已有数据 | 均值、标准差、图表 | 计算班级平均分 |
| 推断统计 | 从样本推断总体 | 假设检验、置信区间 | 从样本推断全校平均分 |

> **为什么推断统计比描述统计更难？** 描述统计只涉及已有数据，结论确定。推断统计涉及从部分推断整体，结论具有不确定性，需要量化这种不确定性（p 值、置信区间）。

### 1.2 核心术语

| 术语 | 含义 | 示例 |
|------|------|------|
| 总体（Population） | 研究对象的全体 | 全校学生 |
| 样本（Sample） | 从总体中抽取的子集 | 抽取的 100 名学生 |
| 参数（Parameter） | 总体的数量特征 | 全校平均身高 |
| 统计量（Statistic） | 样本的数量特征 | 100 名学生的平均身高 |
| 自由度（df） | 独立信息的数量 | n-1（样本方差） |

> 跨模块参考：统计计算依赖 [numpy.md](numpy.md) 的数组运算，数据整理依赖 [pandas.md](pandas.md)，可视化依赖 [seaborn.md](seaborn.md)。

---

## 2. 描述统计

### 2.1 集中趋势度量

```python
import numpy as np
import pandas as pd
from scipy import stats

data = np.array([23, 25, 22, 30, 28, 35, 22, 27, 29, 24, 26, 31, 22, 28, 100])

print(f"均值 (mean): {np.mean(data):.2f}")
print(f"中位数 (median): {np.median(data):.2f}")
print(f"众数 (mode): {stats.mode(data, keepdims=True).mode[0]}")
print(f"截尾均值 (trimmed mean, 10%): {stats.trim_mean(data, 0.1):.2f}")
```

**输出说明**：
- 均值受极端值影响大（100 拉高了均值）
- 中位数不受极端值影响，更适合偏态分布
- 众数适用于分类数据
- 截尾均值去掉两端极值后计算，兼顾均值和中位数的优点

> **为什么均值不一定代表"典型值"？** 当数据有极端值或严重偏态时，均值会被拉偏。例如上述数据中，100 是异常值，使均值（30.8）远高于中位数（27）。此时中位数更能代表"典型"水平。

### 2.2 离散程度度量

```python
import numpy as np
import pandas as pd

data = np.array([23, 25, 22, 30, 28, 35, 22, 27, 29, 24, 26, 31, 22, 28, 100])

print(f"极差 (range): {np.ptp(data)}")
print(f"方差 (variance): {np.var(data, ddof=1):.2f}")
print(f"标准差 (std): {np.std(data, ddof=1):.2f}")
print(f"变异系数 (CV): {np.std(data, ddof=1) / np.mean(data) * 100:.1f}%")

Q1 = np.percentile(data, 25)
Q3 = np.percentile(data, 75)
IQR = Q3 - Q1
print(f"Q1: {Q1}, Q3: {Q3}, IQR: {IQR}")
print(f"异常值边界: [{Q1 - 1.5*IQR:.1f}, {Q3 + 1.5*IQR:.1f}]")
```

**输出说明**：
- `ddof=1` 使用样本方差（除以 n-1），而非总体方差（除以 n）
- 标准差与原始数据同量纲，比方差更易解释
- 变异系数（CV）消除量纲影响，适合比较不同量级的数据
- IQR 不受极端值影响，是箱线图中异常值检测的基础

> **为什么样本方差除以 n-1？** 这是贝塞尔校正。用样本均值代替总体均值会引入偏差，除以 n-1 可以修正这个偏差，使样本方差成为总体方差的无偏估计。

### 2.3 分布形态

```python
import numpy as np
from scipy import stats

data = np.array([23, 25, 22, 30, 28, 35, 22, 27, 29, 24, 26, 31, 22, 28, 100])

print(f"偏度 (skewness): {stats.skew(data):.3f}")
print(f"峰度 (kurtosis): {stats.kurtosis(data):.3f}")
```

**输出说明**：
- 偏度 > 0：右偏（正偏），右侧尾部更长
- 偏度 < 0：左偏（负偏），左侧尾部更长
- 峰度 > 0：比正态分布更尖（重尾）
- 峰度 < 0：比正态分布更平（轻尾）
- `stats.kurtosis` 返回超额峰度（减去 3 后的值）

### 2.4 Pandas 快速描述统计

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'score_A': np.random.default_rng(42).normal(75, 10, 100),
    'score_B': np.random.default_rng(43).normal(70, 15, 100),
    'score_C': np.random.default_rng(44).normal(80, 8, 100)
})

print(df.describe())

print(f"\n偏度:\n{df.skew()}")
print(f"\n峰度:\n{df.kurtosis()}")
print(f"\n分位数:\n{df.quantile([0.1, 0.25, 0.5, 0.75, 0.9])}")
```

**输出说明**：`describe()` 一次性输出计数、均值、标准差、最小值、四分位数和最大值。结合 `skew()` 和 `kurtosis()` 可以全面了解数据分布。

---

## 3. 概率基础

### 3.1 基本概念

| 概念 | 定义 | 示例 |
|------|------|------|
| 样本空间 | 所有可能结果的集合 | 掷骰子 {1,2,3,4,5,6} |
| 事件 | 样本空间的子集 | 掷出偶数 {2,4,6} |
| 概率 | 事件发生的可能性度量 | P(偶数) = 3/6 = 0.5 |
| 互斥事件 | 不能同时发生 | 掷出 1 和掷出 2 |
| 独立事件 | 一个事件不影响另一个 | 两次掷骰子的结果 |

### 3.2 条件概率与贝叶斯定理

```python
p_disease = 0.001
p_positive_given_disease = 0.99
p_positive_given_healthy = 0.05

p_positive = p_positive_given_disease * p_disease + p_positive_given_healthy * (1 - p_disease)
p_disease_given_positive = (p_positive_given_disease * p_disease) / p_positive

print(f"P(阳性) = {p_positive:.4f}")
print(f"P(患病|阳性) = {p_disease_given_positive:.4f}")
print(f"即阳性结果中只有 {p_disease_given_positive*100:.1f}% 真正患病")
```

**输出说明**：贝叶斯定理的核心——即使检测准确率高达 99%，由于患病率极低（0.1%），阳性结果中真正患病的概率只有约 1.9%。这就是"基础率忽视"谬误的数学基础。

> **为什么贝叶斯定理在数据分析中如此重要？** 它提供了从观测数据更新先验信念的数学框架。在 A/B 测试、垃圾邮件过滤、医疗诊断等场景中，贝叶斯思维是正确解读结果的关键。

---

## 4. 常见概率分布

### 4.1 离散分布

```python
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 3, figsize=(15, 4))

x_bern = [0, 1]
p_bern = [1 - 0.3, 0.3]
axes[0].bar(x_bern, p_bern, color='steelblue')
axes[0].set_title('Bernoulli(p=0.3)')
axes[0].set_xlabel('x')

x_binom = np.arange(0, 11)
p_binom = stats.binom.pmf(x_binom, n=10, p=0.3)
axes[1].bar(x_binom, p_binom, color='darkorange')
axes[1].set_title('Binomial(n=10, p=0.3)')
axes[1].set_xlabel('x')

x_pois = np.arange(0, 15)
p_pois = stats.poisson.pmf(x_pois, mu=3)
axes[2].bar(x_pois, p_pois, color='green')
axes[2].set_title('Poisson(lambda=3)')
axes[2].set_xlabel('x')

plt.tight_layout()
plt.show()
```

**输出说明**：
- **伯努利分布**：单次试验，结果为 0 或 1（如抛硬币）
- **二项分布**：n 次独立伯努利试验的成功次数（如 10 次投篮命中次数）
- **泊松分布**：单位时间/空间内稀有事件的发生次数（如每小时客服来电数）

### 4.2 连续分布

```python
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 3, figsize=(15, 4))

x = np.linspace(-4, 4, 200)
axes[0].plot(x, stats.norm.pdf(x, loc=0, scale=1), label='N(0,1)')
axes[0].plot(x, stats.norm.pdf(x, loc=0, scale=1.5), label='N(0,1.5)')
axes[0].plot(x, stats.norm.pdf(x, loc=1, scale=0.8), label='N(1,0.8)')
axes[0].set_title('Normal Distribution')
axes[0].legend()

x_exp = np.linspace(0, 5, 200)
axes[1].plot(x_exp, stats.expon.pdf(x_exp, scale=0.5), label='Exp(0.5)')
axes[1].plot(x_exp, stats.expon.pdf(x_exp, scale=1), label='Exp(1)')
axes[1].plot(x_exp, stats.expon.pdf(x_exp, scale=2), label='Exp(2)')
axes[1].set_title('Exponential Distribution')
axes[1].legend()

x_chi2 = np.linspace(0, 20, 200)
axes[2].plot(x_chi2, stats.chi2.pdf(x_chi2, df=2), label='df=2')
axes[2].plot(x_chi2, stats.chi2.pdf(x_chi2, df=5), label='df=5')
axes[2].plot(x_chi2, stats.chi2.pdf(x_chi2, df=10), label='df=10')
axes[2].set_title('Chi-Square Distribution')
axes[2].legend()

plt.tight_layout()
plt.show()
```

**输出说明**：
- **正态分布**：对称钟形，由均值和标准差决定。中心极限定理使得正态分布在统计学中地位特殊
- **指数分布**：右偏，常用于等待时间建模
- **卡方分布**：右偏，用于拟合优度检验和方差检验

### 4.3 正态分布的性质

```python
from scipy import stats

print(f"P(-1sd < X < 1sd) = {stats.norm.cdf(1) - stats.norm.cdf(-1):.4f}")
print(f"P(-2sd < X < 2sd) = {stats.norm.cdf(2) - stats.norm.cdf(-2):.4f}")
print(f"P(-3sd < X < 3sd) = {stats.norm.cdf(3) - stats.norm.cdf(-3):.4f}")
```

**输出说明**：68-95-99.7 法则：
- 约 68% 的数据在均值 +/- 1 个标准差内
- 约 95% 在 +/- 2 个标准差内
- 约 99.7% 在 +/- 3 个标准差内

> **为什么正态分布如此重要？** 中心极限定理保证了：无论总体分布如何，样本均值的分布在大样本下趋近正态分布。这使得正态分布成为推断统计的理论基础。

---

## 5. 抽样与抽样分布

### 5.1 中心极限定理验证

```python
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(42)
population = rng.exponential(scale=2, size=100000)

sample_means_5 = [rng.choice(population, 5).mean() for _ in range(10000)]
sample_means_30 = [rng.choice(population, 30).mean() for _ in range(10000)]
sample_means_100 = [rng.choice(population, 100).mean() for _ in range(10000)]

fig, axes = plt.subplots(1, 4, figsize=(18, 4))

axes[0].hist(population, bins=50, density=True, color='gray', alpha=0.7)
axes[0].set_title('Population (Exponential)')

axes[1].hist(sample_means_5, bins=50, density=True, color='steelblue', alpha=0.7)
axes[1].set_title('Sample Means (n=5)')

axes[2].hist(sample_means_30, bins=50, density=True, color='darkorange', alpha=0.7)
axes[2].set_title('Sample Means (n=30)')

axes[3].hist(sample_means_100, bins=50, density=True, color='green', alpha=0.7)
axes[3].set_title('Sample Means (n=100)')

plt.tight_layout()
plt.show()
```

**输出说明**：即使总体是指数分布（严重右偏），随着样本量增大，样本均值的分布逐渐趋近正态分布。n=30 时已接近正态，这就是"n>=30"经验法则的来源。

> **中心极限定理的意义**：它使得我们不需要知道总体分布，就可以对样本均值进行统计推断。这是假设检验和置信区间的理论基础。

### 5.2 标准误

```python
import numpy as np

population_std = 15
sample_sizes = [10, 30, 100, 500, 1000]

for n in sample_sizes:
    se = population_std / np.sqrt(n)
    print(f"n={n:4d}: SE = {se:.2f}")
```

**输出说明**：标准误（SE）= 总体标准差 / sqrt(n)。样本量越大，标准误越小，估计越精确。n 增加 4 倍，标准误减半（而非减为 1/4）。

---

## 6. 参数估计

### 6.1 点估计

```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(42)
sample = rng.normal(loc=50, scale=10, size=100)

mu_hat = sample.mean()
sigma_hat = sample.std(ddof=1)

print(f"样本均值 (总体均值估计): {mu_hat:.2f}")
print(f"样本标准差 (总体标准差估计): {sigma_hat:.2f}")
```

**输出说明**：点估计用单一数值估计总体参数。样本均值是总体均值的无偏估计，样本方差（ddof=1）是总体方差的无偏估计。

### 6.2 置信区间

```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(42)
sample = rng.normal(loc=50, scale=10, size=100)

ci_95 = stats.t.interval(0.95, df=len(sample)-1, loc=sample.mean(), scale=stats.sem(sample))
ci_99 = stats.t.interval(0.99, df=len(sample)-1, loc=sample.mean(), scale=stats.sem(sample))

print(f"95% 置信区间: [{ci_95[0]:.2f}, {ci_95[1]:.2f}]")
print(f"99% 置信区间: [{ci_99[0]:.2f}, {ci_99[1]:.2f}]")
print(f"区间宽度: 95%={ci_95[1]-ci_95[0]:.2f}, 99%={ci_99[1]-ci_99[0]:.2f}")
```

**输出说明**：
- 95% 置信区间意味着：如果重复抽样 100 次，约 95 次的区间会包含真实参数
- 99% 置信区间更宽，覆盖概率更高但精度更低
- 使用 t 分布而非正态分布，因为总体标准差未知

> **置信区间的常见误解**：95% 置信区间不表示"真实值有 95% 的概率落在此区间内"。真实值是固定的，区间是随机的。正确理解是"此方法生成的区间有 95% 的概率覆盖真实值"。

---

## 7. 假设检验

### 7.1 假设检验流程

```
1. 建立假设
   H0 (原假设): 无差异/无效果
   H1 (备择假设): 有差异/有效果

2. 选择检验方法与显著性水平 alpha (通常 0.05)

3. 计算检验统计量

4. 计算 p 值

5. 做出决策
   p < alpha: 拒绝 H0 (结果统计显著)
   p >= alpha: 不能拒绝 H0 (结果不显著)
```

> **为什么用"不能拒绝 H0"而非"接受 H0"？** 假设检验只能提供"证据不足"的结论，不能证明 H0 为真。就像法庭判决"证据不足，无罪释放"不等于"证明无辜"。

### 7.2 独立样本 t 检验

```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(42)
group_a = rng.normal(loc=72, scale=10, size=50)
group_b = rng.normal(loc=78, scale=12, size=50)

t_stat, p_value = stats.ttest_ind(group_a, group_b)
print(f"t统计量: {t_stat:.4f}")
print(f"p值: {p_value:.6f}")
print(f"结论: {'拒绝H0 (两组均值有显著差异)' if p_value < 0.05 else '不能拒绝H0'}")

cohen_d = (group_b.mean() - group_a.mean()) / np.sqrt((group_a.std(ddof=1)**2 + group_b.std(ddof=1)**2) / 2)
print(f"Cohen's d (效应量): {cohen_d:.3f}")
```

**输出说明**：
- t 检验比较两组均值是否有显著差异
- p 值 < 0.05 表示差异统计显著
- Cohen's d 衡量效应大小：<0.2（小）、0.2-0.8（中）、>0.8（大）
- 统计显著不等于业务显著，必须看效应量

> **为什么需要效应量？** 大样本下，即使微小的差异也会统计显著。效应量衡量差异的实际大小，避免"统计显著但实际无意义"的结论。

### 7.3 配对样本 t 检验

```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(42)
before = rng.normal(loc=70, scale=8, size=30)
after = before + rng.normal(loc=3, scale=5, size=30)

t_stat, p_value = stats.ttest_rel(before, after)
print(f"配对t检验: t={t_stat:.4f}, p={p_value:.6f}")
print(f"均值变化: {after.mean() - before.mean():.2f}")
```

**输出说明**：配对 t 检验用于同一组对象的前后对比（如培训前后成绩）。它考虑了个体间的配对关系，比独立样本 t 检验更灵敏。

### 7.4 第一类与第二类错误

| | H0 为真 | H0 为假 |
|---|---------|---------|
| 拒绝 H0 | 第一类错误 (alpha) | 正确 (功效 1-beta) |
| 不拒绝 H0 | 正确 (1-alpha) | 第二类错误 (beta) |

```python
from scipy import stats
import numpy as np

def power_analysis(effect_size, n, alpha=0.05):
    se = 1 / np.sqrt(n)
    z_alpha = stats.norm.ppf(1 - alpha/2)
    z_beta = effect_size / se - z_alpha
    power = stats.norm.cdf(z_beta)
    return power

for n in [20, 50, 100, 200]:
    power = power_analysis(effect_size=0.5, n=n)
    print(f"n={n:3d}: power={power:.3f}")
```

**输出说明**：功效（Power）是正确拒绝错误 H0 的概率。样本量越大，功效越高。通常要求功效 >= 0.8。

---

## 8. 方差分析（ANOVA）

### 8.1 单因素方差分析

```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(42)
group1 = rng.normal(loc=70, scale=10, size=30)
group2 = rng.normal(loc=75, scale=10, size=30)
group3 = rng.normal(loc=80, scale=10, size=30)

f_stat, p_value = stats.f_oneway(group1, group2, group3)
print(f"F统计量: {f_stat:.4f}")
print(f"p值: {p_value:.6f}")
print(f"结论: {'至少两组均值有显著差异' if p_value < 0.05 else '不能拒绝H0'}")
```

**输出说明**：ANOVA 检验多组均值是否有显著差异。F 统计量 = 组间方差 / 组内方差。F 值越大，组间差异相对于组内差异越显著。

> **为什么不用多次 t 检验？** 每次 t 检验有 5% 的第一类错误率。3 组两两比较需要 3 次检验，总错误率膨胀为 1-(0.95)^3 = 14.3%。ANOVA 一次检验控制总错误率。

### 8.2 事后多重比较

```python
from scipy import stats
import numpy as np

rng = np.random.default_rng(42)
group1 = rng.normal(loc=70, scale=10, size=30)
group2 = rng.normal(loc=75, scale=10, size=30)
group3 = rng.normal(loc=80, scale=10, size=30)

pairs = [(group1, group2, '1vs2'), (group1, group3, '1vs3'), (group2, group3, '2vs3')]
for g1, g2, name in pairs:
    t, p = stats.ttest_ind(g1, g2)
    p_bonferroni = min(p * len(pairs), 1.0)
    print(f"{name}: p={p:.4f}, p_bonferroni={p_bonferroni:.4f}")
```

**输出说明**：Bonferroni 校正将 p 值乘以比较次数，控制族错误率。更精确的方法是 Tukey HSD，需要 `statsmodels` 或 `pingouin` 库。

---

## 9. 相关与回归

### 9.1 相关系数

```python
import numpy as np
from scipy import stats
import pandas as pd

rng = np.random.default_rng(42)
x = rng.normal(50, 10, 100)
y_linear = 0.8 * x + rng.normal(0, 5, 100)
y_nonlinear = x**2 + rng.normal(0, 100, 100)

r_linear, p_linear = stats.pearsonr(x, y_linear)
r_nonlinear, p_nonlinear = stats.pearsonr(x, y_nonlinear)
rho_nonlinear, p_rho = stats.spearmanr(x, y_nonlinear)

print(f"线性关系: Pearson r={r_linear:.3f}, p={p_linear:.6f}")
print(f"非线性关系: Pearson r={r_nonlinear:.3f}, Spearman rho={rho_nonlinear:.3f}")
```

**输出说明**：
- Pearson r 衡量线性相关，范围 [-1, 1]
- Spearman rho 衡量单调相关（秩相关），对非线性关系更敏感
- 非线性关系中，Pearson r 可能很低但 Spearman rho 很高

> **相关不等于因果**：相关性只说明两个变量同时变化，不说明因果关系。冰激凌销量和溺水人数正相关，但不是因为吃冰激凌导致溺水，而是因为夏天同时影响了两者。

### 9.2 简单线性回归

```python
import numpy as np
import statsmodels.api as sm
import matplotlib.pyplot as plt

rng = np.random.default_rng(42)
x = rng.uniform(10, 50, 100)
y = 2.5 * x + 10 + rng.normal(0, 8, 100)

X = sm.add_constant(x)
model = sm.OLS(y, X).fit()
print(model.summary())

print(f"\n回归方程: y = {model.params[1]:.2f}*x + {model.params[0]:.2f}")
print(f"R-squared: {model.rsquared:.4f}")
print(f"斜率 p值: {model.pvalues[1]:.6f}")
```

**输出说明**：
- `add_constant` 添加截距项
- R-squared 表示模型解释的方差比例（0-1）
- 斜率的 p 值检验斜率是否显著不为零
- `summary()` 输出完整的回归诊断信息

---

## 10. 非参数检验

### 10.1 何时使用非参数检验

| 场景 | 参数方法 | 非参数替代 |
|------|----------|------------|
| 两组独立样本 | t 检验 | Mann-Whitney U |
| 两组配对样本 | 配对 t 检验 | Wilcoxon 符号秩 |
| 多组比较 | ANOVA | Kruskal-Wallis |
| 分类变量关联 | - | 卡方检验 |

> **为什么需要非参数检验？** 参数检验要求数据满足正态分布等假设。当数据严重偏态、有极端值、样本量太小或为有序分类数据时，参数检验结果不可靠，需要非参数替代。

### 10.2 Mann-Whitney U 检验

```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(42)
group_a = rng.exponential(scale=10, size=30)
group_b = rng.exponential(scale=15, size=30)

u_stat, p_value = stats.mannwhitneyu(group_a, group_b, alternative='two-sided')
print(f"Mann-Whitney U: U={u_stat:.1f}, p={p_value:.4f}")
```

**输出说明**：Mann-Whitney U 检验比较两组的秩（排序位置）而非均值，不要求数据正态分布。

### 10.3 卡方独立性检验

```python
import numpy as np
from scipy import stats

observed = np.array([[50, 30], [20, 40]])
chi2, p_value, dof, expected = stats.chi2_contingency(observed)

print(f"观测频数:\n{observed}")
print(f"期望频数:\n{expected}")
print(f"卡方统计量: {chi2:.4f}")
print(f"p值: {p_value:.4f}")
print(f"自由度: {dof}")
```

**输出说明**：卡方检验判断两个分类变量是否独立。如果 p < 0.05，拒绝独立性假设，认为两个变量有关联。

---

## 11. Python 实现工具

### 11.1 三大统计库对比

| 库 | 定位 | 优势 | 典型用法 |
|----|------|------|----------|
| scipy.stats | 统计计算 | 函数全面、接口简洁 | 假设检验、分布计算 |
| statsmodels | 统计建模 | 回归诊断详细、R 风格输出 | 回归分析、时间序列 |
| pingouin | 现代统计 | API 友好、效应量内置 | 效应量、重复测量 ANOVA |

```python
from scipy import stats
import statsmodels.api as sm

data = [23, 25, 22, 30, 28, 35, 22, 27, 29, 24]

ci = stats.t.interval(0.95, df=len(data)-1, loc=np.mean(data), scale=stats.sem(data))
print(f"scipy 置信区间: [{ci[0]:.2f}, {ci[1]:.2f}]")

result = stats.descstats(data)
```

---

## 12. 速查表

### 12.1 假设检验选择

| 数据类型 | 比较对象 | 样本量 | 正态性 | 检验方法 |
|----------|----------|--------|--------|----------|
| 连续 | 单组 vs 已知值 | 任意 | 满足 | 单样本 t 检验 |
| 连续 | 两组独立 | 任意 | 满足 | 独立样本 t 检验 |
| 连续 | 两组配对 | 任意 | 满足 | 配对 t 检验 |
| 连续 | 三组及以上 | 任意 | 满足 | ANOVA |
| 连续 | 两组独立 | 小 | 不满足 | Mann-Whitney U |
| 连续 | 三组及以上 | 小 | 不满足 | Kruskal-Wallis |
| 分类 | 两组关联 | - | - | 卡方检验 |

### 12.2 效应量速查

| 指标 | 适用场景 | 小 | 中 | 大 |
|------|----------|----|----|-----|
| Cohen's d | 两组均值差异 | 0.2 | 0.5 | 0.8 |
| Pearson r | 相关强度 | 0.1 | 0.3 | 0.5 |
| eta-squared | ANOVA | 0.01 | 0.06 | 0.14 |
| Cramer's V | 卡方检验 | 0.1 | 0.3 | 0.5 |

### 12.3 scipy.stats 常用函数

| 函数 | 用途 |
|------|------|
| `stats.ttest_1samp()` | 单样本 t 检验 |
| `stats.ttest_ind()` | 独立样本 t 检验 |
| `stats.ttest_rel()` | 配对 t 检验 |
| `stats.f_oneway()` | 单因素 ANOVA |
| `stats.pearsonr()` | Pearson 相关 |
| `stats.spearmanr()` | Spearman 相关 |
| `stats.mannwhitneyu()` | Mann-Whitney U |
| `stats.wilcoxon()` | Wilcoxon 符号秩 |
| `stats.kruskal()` | Kruskal-Wallis |
| `stats.chi2_contingency()` | 卡方独立性检验 |
| `stats.t.interval()` | 置信区间 |

---

## 13. 延伸阅读

- OpenIntro Statistics (David Diez)
- Practical Statistics for Data Scientists (Peter Bruce)
- scipy.stats 官方文档：https://docs.scipy.org/doc/scipy/reference/stats.html
- Statistical Inference (George Casella)

### 跨模块关联

- [[algorithm/overview|算法]]
