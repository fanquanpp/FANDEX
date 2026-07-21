---
order: 50
tags:
  - 'data-analysis'
difficulty: intermediate
title: 'Seaborn -- 统计可视化、热力图与分布图'
module: 'data-analysis'
category: 'Data Science / Seaborn'
description: 'Seaborn 高级统计可视化：分布图、关系图、分类图、热力图与多图网格'
author: fanquanpp
related:
  - 'data-analysis/Pandas-DataFrameSeries-数据清洗-合并重塑'
  - 'data-analysis/Matplotlib-折线图-柱状图-散点图与子图'
  - 'data-analysis/统计学-描述统计-推断统计与假设检验'
  - 'data-analysis/数据清洗-缺失值-异常值与数据类型转换'
prerequisites:
  - 'data-analysis/数据分析概述'
---

## 1. Seaborn 简介

### 1.1 为什么需要 Seaborn

Matplotlib 是底层绘图库，功能强大但 API 繁琐。Seaborn 在 Matplotlib 之上提供了：

- **面向 DataFrame 的 API**：直接传入 DataFrame 和列名，无需手动提取数组
- **语义映射**：`hue`、`style`、`size` 参数自动将数据映射为颜色、样式、大小
- **统计图表**：内置均值估计、置信区间、核密度估计等统计功能
- **美观默认样式**：开箱即用的专业外观

> **Seaborn 与 Matplotlib 的关系**：Seaborn 不是 Matplotlib 的替代品，而是补充。Seaborn 负责统计图表的快速绘制，Matplotlib 负责精细定制。两者可以无缝混用。

### 1.2 内置数据集

```python
import seaborn as sns
import pandas as pd
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')
print(f"Shape: {tips.shape}")
print(f"Columns: {tips.columns.tolist()}")
print(f"\nFirst 5 rows:\n{tips.head()}")
print(f"\nData types:\n{tips.dtypes}")
```

**输出说明**：Seaborn 内置多个示例数据集，`tips` 是最常用的餐厅小费数据集，包含总账单、小费、性别、是否吸烟、日期、时间、人数等字段。这些数据集适合练习各种图表类型。

> 跨模块参考：Seaborn 的 DataFrame 接口依赖 [pandas.md](pandas.md) 的数据结构，底层绘图依赖 [matplotlib.md](matplotlib.md)。

---

## 2. 样式与主题

### 2.1 五种内置主题

```python
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np

themes = ['darkgrid', 'whitegrid', 'dark', 'white', 'ticks']

fig, axes = plt.subplots(1, 5, figsize=(20, 4))
x = np.linspace(0, 10, 50)

for ax, theme in zip(axes, themes):
    plt.sca(ax)
    sns.set_theme(style=theme)
    plt.plot(x, np.sin(x))
    plt.title(f'style="{theme}"')

sns.set_theme(style='whitegrid')
plt.tight_layout()
plt.show()
```

**输出说明**：

- `darkgrid`：深色背景 + 网格，适合数据密集型图表
- `whitegrid`：白色背景 + 网格，最常用的分析风格
- `dark`：深色背景无网格
- `white`：白色背景无网格
- `ticks`：白色背景 + 刻度线

### 2.2 全局配置

```python
import seaborn as sns
import matplotlib.pyplot as plt

sns.set_theme(
    style='whitegrid',
    palette='deep',
    font_scale=1.2,
    rc={'figure.figsize': (10, 6)}
)

sns.despine()
```

**输出说明**：`set_theme` 一次性设置样式、调色板、字体缩放和 rcParams。`despine()` 去除顶部和右侧边框，使图表更简洁。

---

## 3. 分布图

### 3.1 直方图 histplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, ax = plt.subplots(figsize=(10, 5))
sns.histplot(data=tips, x='total_bill', bins=30, kde=True, color='steelblue', ax=ax)
ax.set_title('Distribution of Total Bill')
ax.set_xlabel('Total Bill ($)')
plt.show()
```

**输出说明**：`kde=` 在直方图上叠加核密度估计曲线，同时展示离散频数和连续密度。直方图显示总账单呈右偏分布，多数集中在 10-25 美元。

### 3.2 分组直方图

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, ax = plt.subplots(figsize=(10, 5))
sns.histplot(data=tips, x='total_bill', hue='time', multiple='dodge', bins=20, ax=ax)
ax.set_title('Total Bill by Time of Day')
plt.show()
```

**输出说明**：`hue='time'` 按用餐时间分组着色，`multiple='dodge'` 使两组柱子并排显示（而非叠加）。其他选项：`'layer'`（叠加，默认）、`'stack'`（堆叠）、`'fill'`（填充百分比）。

### 3.3 核密度估计 kdeplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, ax = plt.subplots(figsize=(10, 5))
sns.kdeplot(data=tips, x='total_bill', hue='time', fill=True, alpha=0.5, ax=ax)
ax.set_title('KDE of Total Bill by Time')
plt.show()
```

**输出说明**：KDE（核密度估计）是直方图的平滑版本，不受 bins 选择的影响。`fill=` 填充曲线下方区域。KDE 更适合比较不同组的分布形态。

> **为什么 KDE 比直方图更适合比较分布？** 直方图的形状受 bins 数量和起始位置影响，不同参数可能呈现不同形态。KDE 通过核函数平滑，结果更稳定，且曲线更容易视觉比较。

### 3.4 经验累积分布 ecdfplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, ax = plt.subplots(figsize=(10, 5))
sns.ecdfplot(data=tips, x='total_bill', hue='time', ax=ax)
ax.set_title('ECDF of Total Bill by Time')
ax.axhline(y=0.5, color='gray', linestyle='--', alpha=0.5)
plt.show()
```

**输出说明**：ECDF（经验累积分布函数）显示小于等于某个值的观测比例。在 y=0.5 处的水平线与曲线的交点即为中位数。ECDF 不做任何平滑假设，是最忠实的分布表示。

### 3.5 统一接口 displot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

g = sns.displot(data=tips, x='total_bill', col='time', row='smoker',
                kind='kde', fill=True, height=4, aspect=1.2)
g.fig.suptitle('Distribution by Time and Smoker', y=1.02)
plt.show()
```

**输出说明**：`displot` 是分布图的统一接口，通过 `kind` 参数选择 `'hist'`、`'kde'`、`'ecdf'`。`col` 和 `row` 参数创建分面网格。注意 `displot` 返回 FacetGrid 对象，不能传入 `ax` 参数。

---

## 4. 关系图

### 4.1 散点图 scatterplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, ax = plt.subplots(figsize=(10, 6))
sns.scatterplot(data=tips, x='total_bill', y='tip', hue='time',
                style='smoker', size='size', sizes=(30, 200), ax=ax)
ax.set_title('Tips vs Total Bill')
plt.show()
```

**输出说明**：一个散点图同时编码了四个变量：

- x 轴：总账单
- y 轴：小费
- 颜色（hue）：用餐时间
- 标记样式（style）：是否吸烟
- 标记大小（size）：用餐人数

> **为什么语义映射比手动编码好？** 手动编码需要为每个类别创建子集并分别绘制，代码冗长且容易出错。Seaborn 的语义映射自动处理图例、配色和标记，代码简洁且一致。

### 4.2 线图 lineplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

fmri = sns.load_dataset('fmri')

fig, ax = plt.subplots(figsize=(10, 5))
sns.lineplot(data=fmri, x='timepoint', y='signal', hue='event',
             style='region', markers=True, ax=ax)
ax.set_title('FMRI Signal Over Time')
plt.show()
```

**输出说明**：`lineplot` 自动计算每个 x 值对应的均值和置信区间。阴影区域表示 95% 置信区间，线条表示均值。这是 Seaborn 与 Matplotlib `ax.plot` 的关键区别——Seaborn 自动添加统计摘要。

### 4.3 统一接口 relplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

g = sns.relplot(data=tips, x='total_bill', y='tip', col='time',
                hue='smoker', style='smoker', kind='scatter', height=5)
g.fig.suptitle('Tips by Time and Smoker Status', y=1.02)
plt.show()
```

**输出说明**：`relplot` 是关系图的统一接口，`kind='scatter'` 或 `kind='line'`。`col` 参数创建分面，每个用餐时间一个子图。

---

## 5. 分类图

### 5.1 箱线图 boxplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, ax = plt.subplots(figsize=(10, 5))
sns.boxplot(data=tips, x='day', y='total_bill', hue='smoker', ax=ax)
ax.set_title('Total Bill by Day and Smoker Status')
plt.show()
```

**输出说明**：箱线图展示五个统计量：最小值、Q1、中位数、Q3、最大值。箱体外的点是异常值（超过 1.5 IQR 的点）。`hue` 参数按吸烟状态分组，每个日期显示两个箱体。

> **箱线图各部分解读**：
>
> - 箱体下边：Q1（25%分位数）
> - 箱体中线：Q2（中位数）
> - 箱体上边：Q3（75%分位数）
> - 须线：1.5 IQR 范围内的最远点
> - 独立点：异常值

### 5.2 小提琴图 violinplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, ax = plt.subplots(figsize=(10, 5))
sns.violinplot(data=tips, x='day', y='total_bill', hue='time',
               split=True, inner='quartile', ax=ax)
ax.set_title('Violin Plot of Total Bill by Day and Time')
plt.show()
```

**输出说明**：小提琴图是箱线图与核密度估计的结合。`split=` 将两个组分别显示在小提琴的两侧，便于对比。`inner='quartile'` 在内部显示四分位数线。小提琴的宽度表示该位置的密度。

> **箱线图 vs 小提琴图**：箱线图精确展示分位数，适合少量数据；小提琴图展示完整分布形态，适合数据量较大时。小提琴图的信息量更大，但对小样本的 KDE 估计可能不可靠。

### 5.3 条形图 barplot 与点图 pointplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

sns.barplot(data=tips, x='day', y='total_bill', hue='smoker', ax=ax1)
ax1.set_title('Bar Plot (Mean + CI)')

sns.pointplot(data=tips, x='day', y='total_bill', hue='smoker', ax=ax2)
ax2.set_title('Point Plot (Mean + CI)')

plt.tight_layout()
plt.show()
```

**输出说明**：

- `barplot`：柱高表示均值，误差棒表示 95% 置信区间
- `pointplot`：点表示均值，连线便于比较不同类别间的趋势变化
- 两者都计算均值和置信区间，但 pointplot 更适合展示交互效应

### 5.4 散点分类图 stripplot 与 swarmplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

sns.stripplot(data=tips, x='day', y='total_bill', hue='smoker',
              dodge=True, alpha=0.5, ax=ax1)
ax1.set_title('Strip Plot')

sns.swarmplot(data=tips, x='day', y='total_bill', hue='smoker',
              dodge=True, ax=ax2)
ax2.set_title('Swarm Plot')

plt.tight_layout()
plt.show()
```

**输出说明**：

- `stripplot`：在类别轴上添加随机抖动，避免点重叠
- `swarmplot`：智能排列点避免重叠，展示每个数据点的精确位置
- `dodge=` 将 hue 组分开显示

### 5.5 统一接口 catplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

g = sns.catplot(data=tips, x='day', y='total_bill', col='time',
                kind='box', height=5, aspect=0.8)
g.fig.suptitle('Total Bill by Day and Time', y=1.02)
plt.show()
```

**输出说明**：`catplot` 是分类图的统一接口，`kind` 可选 `'box'`、`'violin'`、`'bar'`、`'point'`、`'strip'`、`'swarm'`。

---

## 6. 热力图

### 6.1 相关性矩阵热力图

```python
import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

tips = sns.load_dataset('tips')

corr = tips.select_dtypes(include='number').corr()

fig, ax = plt.subplots(figsize=(8, 6))
mask = np.triu(np.ones_like(corr, dtype=bool))
sns.heatmap(corr, mask=mask, annot=True, fmt='.2f', cmap='coolwarm',
            center=0, square=True, linewidths=0.5, ax=ax)
ax.set_title('Correlation Matrix (Lower Triangle)')
plt.show()
```

**输出说明**：

- `mask` 参数隐藏上三角（因为相关矩阵是对称的）
- `annot=` 显示相关系数数值
- `cmap='coolwarm'` 使用发散配色，`center=0` 以 0 为中心
- `square=` 使每个单元格为正方形

> **为什么相关矩阵热力图用发散配色？** 相关系数范围为 [-1, 1]，0 表示无相关。发散配色以 0 为中性色，正值偏暖色，负值偏冷色，使正负相关一目了然。

### 6.2 数据矩阵热力图

```python
import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

flights = sns.load_dataset('flights')
flights_pivot = flights.pivot(index='month', columns='year', values='passengers')

fig, ax = plt.subplots(figsize=(12, 8))
sns.heatmap(flights_pivot, annot=True, fmt='d', cmap='YlOrRd',
            linewidths=0.5, ax=ax)
ax.set_title('Airline Passengers (1949-1960)')
plt.show()
```

**输出说明**：`flights` 数据集展示航空公司月度乘客数。热力图的颜色深浅直观展示数值大小，可以清晰看到乘客数逐年增长和夏季高峰的季节性模式。`fmt='d'` 格式化整数显示。

### 6.3 聚类热力图 clustermap

```python
import seaborn as sns
import matplotlib.pyplot as plt

iris = sns.load_dataset('iris')
iris_numeric = iris.select_dtypes(include='number')

g = sns.clustermap(iris_numeric.corr(), annot=True, cmap='coolwarm',
                   center=0, figsize=(8, 8))
g.fig.suptitle('Clustered Correlation Matrix', y=1.02)
plt.show()
```

**输出说明**：`clustermap` 在热力图基础上添加层次聚类，对行和列重新排序使相似项相邻。树状图（dendrogram）显示聚类关系。

---

## 7. 回归图

### 7.1 regplot 与 lmplot

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, ax = plt.subplots(figsize=(10, 6))
sns.regplot(data=tips, x='total_bill', y='tip', scatter_kws={'alpha': 0.5},
            line_kws={'color': 'red'}, ax=ax)
ax.set_title('Regression: Tip vs Total Bill')
plt.show()
```

**输出说明**：`regplot` 绘制散点图并叠加线性回归拟合线和 95% 置信区间带。阴影区域越窄，回归估计越精确。

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

g = sns.lmplot(data=tips, x='total_bill', y='tip', hue='smoker',
               col='time', height=5, aspect=1)
g.fig.suptitle('Regression by Smoker and Time', y=1.02)
plt.show()
```

**输出说明**：`lmplot` 是 `regplot` 的分面版本，支持 `hue`、`col`、`row` 参数。每个子图独立拟合回归线，可以比较不同组的回归关系。

### 7.2 多项式拟合与残差

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

sns.regplot(data=tips, x='total_bill', y='tip', order=2,
            scatter_kws={'alpha': 0.5}, ax=ax1)
ax1.set_title('Polynomial Regression (order=2)')

sns.residplot(data=tips, x='total_bill', y='tip', scatter_kws={'alpha': 0.5}, ax=ax2)
ax2.set_title('Residual Plot')
ax2.axhline(y=0, color='red', linestyle='--')

plt.tight_layout()
plt.show()
```

**输出说明**：

- `order=2` 使用二次多项式拟合而非线性
- `residplot` 绘制残差（观测值 - 拟合值），如果残差随机分布在 0 附近，说明线性模型合适；如果有明显模式，说明需要更高阶模型

---

## 8. 多图网格（FacetGrid）

### 8.1 FacetGrid 分面绘图

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

g = sns.FacetGrid(tips, col='time', row='smoker', height=4, aspect=1.2)
g.map(sns.histplot, 'total_bill', kde=True)
g.add_legend()
g.fig.suptitle('Total Bill Distribution by Time and Smoker', y=1.02)
plt.show()
```

**输出说明**：`FacetGrid` 按分类变量的组合创建子图网格。`map` 方法将绘图函数应用到每个子图。这是 Seaborn 最强大的功能之一——用少量代码创建复杂的多维可视化。

### 8.2 PairGrid 变量两两关系

```python
import seaborn as sns
import matplotlib.pyplot as plt

iris = sns.load_dataset('iris')

g = sns.PairGrid(iris, hue='species', height=2.5)
g.map_diag(sns.histplot, kde=True)
g.map_offdiag(sns.scatterplot, alpha=0.6)
g.add_legend()
g.fig.suptitle('Iris PairGrid', y=1.01)
plt.show()
```

**输出说明**：`PairGrid` 创建所有数值变量两两组合的矩阵图。对角线显示单变量分布，非对角线显示双变量散点图。这是 EDA 中最常用的多变量探索工具。

### 8.3 JointGrid 联合分布

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

g = sns.JointGrid(data=tips, x='total_bill', y='tip', height=8)
g.plot_joint(sns.scatterplot, alpha=0.5, hue=tips['time'])
g.plot_marginals(sns.histplot, kde=True)
g.fig.suptitle('Joint Distribution: Total Bill vs Tip', y=1.01)
plt.show()
```

**输出说明**：`JointGrid` 在中心绘制双变量散点图，在边缘绘制单变量分布。这等价于 [matplotlib.md](matplotlib.md) 中用 GridSpec 手动实现的联合分布图，但代码更简洁。

---

## 9. 调色板与配色

### 9.1 三类调色板

```python
import seaborn as sns
import matplotlib.pyplot as plt

fig, axes = plt.subplots(3, 1, figsize=(12, 8))

sns.palplot(sns.color_palette('deep', 8), ax=axes[0])
axes[0].set_title('Categorical: deep')

sns.palplot(sns.color_palette('viridis', 8), ax=axes[1])
axes[1].set_title('Sequential: viridis')

sns.palplot(sns.color_palette('coolwarm', 8), ax=axes[2])
axes[2].set_title('Diverging: coolwarm')

plt.tight_layout()
plt.show()
```

**输出说明**：

- **分类调色板**（Categorical）：区分离散类别，如 `deep`、`Set2`、`tab10`
- **连续调色板**（Sequential）：编码有序数值，如 `viridis`、`rocket`、`Blues`
- **发散调色板**（Diverging）：编码以中性值为中心的正负偏差，如 `coolwarm`、`vlag`、`RdBu`

### 9.2 调色板选择指南

| 数据类型         | 推荐调色板                  | 说明           |
| ---------------- | --------------------------- | -------------- |
| 分类变量         | `deep`、`Set2`、`tab10`     | 颜色区分度高   |
| 连续变量（正）   | `viridis`、`rocket`、`mako` | 感知均匀       |
| 连续变量（正负） | `coolwarm`、`vlag`、`RdBu`  | 以中性色为中心 |
| 色盲友好         | `colorblind`                | Seaborn 内置   |

```python
import seaborn as sns

sns.set_palette('colorblind')
```

---

## 10. 与 Matplotlib 协作

### 10.1 在 Seaborn 图表上叠加 Matplotlib 元素

```python
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np

tips = sns.load_dataset('tips')

fig, ax = plt.subplots(figsize=(10, 6))
sns.scatterplot(data=tips, x='total_bill', y='tip', hue='time', ax=ax)

z = np.polyfit(tips['total_bill'], tips['tip'], 1)
p = np.poly1d(z)
x_line = np.linspace(tips['total_bill'].min(), tips['total_bill'].max(), 100)
ax.plot(x_line, p(x_line), color='red', linestyle='--', linewidth=2, label='Trend')

ax.axhline(y=tips['tip'].mean(), color='gray', linestyle=':', alpha=0.5, label='Mean Tip')
ax.set_title('Tips vs Total Bill with Trend Line')
ax.legend()
plt.show()
```

**输出说明**：Seaborn 函数返回 Matplotlib 的 Axes 对象，可以在上面叠加任何 Matplotlib 绘图元素。这种混用模式结合了 Seaborn 的便捷性和 Matplotlib 的灵活性。

### 10.2 使用 ax 参数嵌入子图

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('Multi-View Analysis of Tips Data', fontsize=14)

sns.histplot(data=tips, x='total_bill', kde=True, ax=axes[0, 0])
axes[0, 0].set_title('Distribution')

sns.scatterplot(data=tips, x='total_bill', y='tip', hue='time', ax=axes[0, 1])
axes[0, 1].set_title('Scatter')

sns.boxplot(data=tips, x='day', y='total_bill', ax=axes[1, 0])
axes[1, 0].set_title('Box Plot')

corr = tips.select_dtypes(include='number').corr()
sns.heatmap(corr, annot=True, cmap='coolwarm', center=0, ax=axes[1, 1])
axes[1, 1].set_title('Correlation')

plt.tight_layout()
plt.show()
```

**输出说明**：通过 `ax` 参数将 Seaborn 图表嵌入 Matplotlib 的子图布局中，实现复杂的多图组合。这是制作数据分析报告最常用的模式。

---

## 11. 速查表

### 11.1 图表类型速查

| 分析目标             | 图表类型 | Seaborn 函数                     |
| -------------------- | -------- | -------------------------------- |
| 单变量分布           | 直方图   | `sns.histplot()`                 |
| 单变量分布（平滑）   | KDE      | `sns.kdeplot()`                  |
| 累积分布             | ECDF     | `sns.ecdfplot()`                 |
| 双变量关系           | 散点图   | `sns.scatterplot()`              |
| 双变量趋势           | 线图     | `sns.lineplot()`                 |
| 分类 vs 连续         | 箱线图   | `sns.boxplot()`                  |
| 分类 vs 连续（分布） | 小提琴图 | `sns.violinplot()`               |
| 分类均值             | 条形图   | `sns.barplot()`                  |
| 相关矩阵             | 热力图   | `sns.heatmap()`                  |
| 回归关系             | 回归图   | `sns.regplot()` / `sns.lmplot()` |

### 11.2 语义映射参数

| 参数    | 作用         | 数据类型  |
| ------- | ------------ | --------- |
| `hue`   | 颜色区分     | 分类/连续 |
| `style` | 标记样式区分 | 分类      |
| `size`  | 标记大小区分 | 连续      |
| `col`   | 列方向分面   | 分类      |
| `row`   | 行方向分面   | 分类      |

### 11.3 统一接口

| 接口            | kind 选项                             | 分面支持      |
| --------------- | ------------------------------------- | ------------- |
| `sns.displot()` | hist, kde, ecdf                       | col, row      |
| `sns.relplot()` | scatter, line                         | col, row      |
| `sns.catplot()` | box, violin, bar, point, strip, swarm | col, row      |
| `sns.lmplot()`  | reg                                   | col, row, hue |

---

## 12. 延伸阅读

- Seaborn 官方文档：https://seaborn.pydata.org/
- Seaborn Gallery：https://seaborn.pydata.org/examples/
- Python Data Visualization Cookbook (Igor Milovanovic)
- Seaborn Tutorial：https://seaborn.pydata.org/tutorial.html
