---
order: 40
tags:
  - 'data-analysis'
difficulty: intermediate
title: 'Matplotlib -- 折线图、柱状图、散点图与子图'
module: 'data-analysis'
category: 'Data Science / Matplotlib'
description: 'Matplotlib 数据可视化核心：基础图表类型、样式定制、子图布局与 Jupyter 交互式绘图'
author: fanquanpp
related:
  - 'data-analysis/NumPy数组操作-线性代数与随机数'
  - 'data-analysis/Pandas-DataFrameSeries-数据清洗-合并重塑'
  - 'data-analysis/Seaborn-统计可视化-热力图与分布图'
  - 'data-analysis/统计学-描述统计-推断统计与假设检验'
prerequisites:
  - 'data-analysis/数据分析概述'
---

## 1. Matplotlib 简介

### 1.1 两种绘图风格

Matplotlib 提供两种绘图接口：

- **Pyplot 风格（MATLAB-like）**：`plt.plot()`、`plt.xlabel()` 等函数式调用，适合快速绘图
- **面向对象风格**：`fig, ax = plt.subplots()` 后操作 `ax` 对象，适合复杂图表

> **为什么推荐面向对象风格？** Pyplot 风格内部维护全局状态，在多子图、多图表场景下容易出错。面向对象风格显式操作 Figure 和 Axes 对象，代码更清晰、更可维护。本笔记统一使用面向对象风格。

### 1.2 Jupyter 中的配置

```python
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

%matplotlib inline

plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['font.size'] = 12
plt.rcParams['axes.unicode_minus'] = False

print(f"Matplotlib version: {plt.matplotlib.__version__}")
```

**输出说明**：`%matplotlib inline` 将图表嵌入 Notebook 输出。`rcParams` 设置全局默认参数，`axes.unicode_minus` 解决负号显示问题。

> 跨模块参考：绘图数据通常来自 [numpy.md](numpy.md) 的数组操作或 [pandas.md](pandas.md) 的 DataFrame 处理。

---

## 2. Figure 与 Axes 体系

### 2.1 核心对象层级

```
Figure (画布)
  |
  +-- Axes (绘图区域，即一张图)
  |     |
  |     +-- Axis (坐标轴：XAxis, YAxis)
  |     +-- Line2D (线条)
  |     +-- Text (文本)
  |     +-- Legend (图例)
  |     +-- ...
  |
  +-- Axes (可以有多个)
```

- **Figure**：整个画布，可以包含多个 Axes
- **Axes**：一个独立的绘图区域，包含坐标轴、数据、标签等
- **Axis**：坐标轴，控制刻度、标签和样式

> **为什么区分 Figure 和 Axes？** 这使得一个画布上可以放置多个子图，每个子图有独立的坐标轴和样式。理解这个层级是掌握 Matplotlib 的关键。

### 2.2 创建 Figure 和 Axes

```python
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(10, 6))
print(f"Figure size: {fig.get_size_inches()}")
print(f"Axes position: {ax.get_position()}")

fig2 = plt.figure(figsize=(8, 4))
ax1 = fig2.add_subplot(1, 2, 1)
ax2 = fig2.add_subplot(1, 2, 2)
ax1.set_title('Subplot 1')
ax2.set_title('Subplot 2')
plt.show()
```

**输出说明**：

- `plt.subplots()` 同时创建 Figure 和 Axes，是最常用的方式
- `figsize` 参数控制画布大小，单位为英寸
- `plt.figure()` 只创建画布，需要手动添加子图

---

## 3. 折线图（Line Plot）

### 3.1 基础折线图

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2 * np.pi, 100)
y_sin = np.sin(x)
y_cos = np.cos(x)

fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(x, y_sin, label='sin(x)')
ax.plot(x, y_cos, label='cos(x)', linestyle='--')
ax.set_xlabel('x')
ax.set_ylabel('y')
ax.set_title('Trigonometric Functions')
ax.legend()
ax.grid(True, alpha=0.3)
plt.show()
```

**输出说明**：图表显示两条曲线——sin(x) 为实线，cos(x) 为虚线。`label` 参数指定图例文字，`grid` 添加网格线。

### 3.2 样式参数

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.arange(10)
y1 = x ** 1.5
y2 = x ** 2

fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(x, y1, color='#2196F3', marker='o', markersize=6, linewidth=2,
        linestyle='-', label='x^1.5')
ax.plot(x, y2, color='#FF5722', marker='s', markersize=6, linewidth=2,
        linestyle='--', label='x^2')
ax.set_xlabel('x')
ax.set_ylabel('y')
ax.set_title('Power Functions with Custom Styles')
ax.legend(loc='upper left')
plt.show()
```

**输出说明**：

- `color`：支持十六进制、颜色名、RGB 元组
- `marker`：'o' 圆形，'s' 方形，'^' 三角，'D' 菱形
- `linestyle`：'-' 实线，'--' 虚线，':' 点线，'-.' 点划线
- `linewidth`：线宽，`markersize`：标记大小

### 3.3 时间序列折线图

```python
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

dates = pd.date_range('2024-01-01', periods=30, freq='D')
values = np.random.default_rng(42).normal(100, 10, 30).cumsum()

fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(dates, values, color='steelblue', linewidth=1.5)
ax.fill_between(dates, values, alpha=0.15, color='steelblue')
ax.set_xlabel('Date')
ax.set_ylabel('Cumulative Value')
ax.set_title('Time Series with Area Fill')

fig.autofmt_xdate()
plt.show()
```

**输出说明**：`fill_between` 在曲线下方填充半透明区域，增强视觉效果。`autofmt_xdate` 自动旋转日期标签，避免重叠。

> **为什么折线图适合时间序列？** 折线图通过线段连接相邻数据点，天然表达了时间的连续性和趋势的走向。这是时间序列数据最自然的可视化方式。

---

## 4. 柱状图（Bar Chart）

### 4.1 基础柱状图

```python
import matplotlib.pyplot as plt
import numpy as np

categories = ['Product A', 'Product B', 'Product C', 'Product D']
values = [350, 480, 290, 620]
colors = ['#4C72B0', '#55A868', '#C44E52', '#8172B2']

fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.bar(categories, values, color=colors, width=0.6, edgecolor='white')

for bar, val in zip(bars, values):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 10,
            f'{val}', ha='center', va='bottom', fontsize=11)

ax.set_ylabel('Sales (units)')
ax.set_title('Product Sales Comparison')
ax.set_ylim(0, 700)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.show()
```

**输出说明**：柱状图显示四个产品的销量对比。`ax.text` 在每根柱子上方添加数值标签。`spines['top'].set_visible(False)` 隐藏顶部和右侧边框，使图表更简洁。

### 4.2 分组柱状图

```python
import matplotlib.pyplot as plt
import numpy as np

categories = ['Q1', 'Q2', 'Q3', 'Q4']
sales_2023 = [250, 320, 280, 380]
sales_2024 = [280, 350, 310, 420]

x = np.arange(len(categories))
width = 0.35

fig, ax = plt.subplots(figsize=(10, 5))
bars1 = ax.bar(x - width/2, sales_2023, width, label='2023', color='#4C72B0')
bars2 = ax.bar(x + width/2, sales_2024, width, label='2024', color='#DD8452')

ax.set_xlabel('Quarter')
ax.set_ylabel('Sales')
ax.set_title('Quarterly Sales: 2023 vs 2024')
ax.set_xticks(x)
ax.set_xticklabels(categories)
ax.legend()
plt.show()
```

**输出说明**：分组柱状图通过偏移 x 坐标实现并列显示。`x - width/2` 和 `x + width/2` 使两组柱子对称分布在刻度两侧。

### 4.3 水平柱状图与堆叠柱状图

```python
import matplotlib.pyplot as plt
import numpy as np

categories = ['Feature A', 'Feature B', 'Feature C', 'Feature D']
satisfied = [85, 72, 90, 65]
neutral = [10, 18, 5, 20]
unsatisfied = [5, 10, 5, 15]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

ax1.barh(categories, satisfied, color='#55A868')
ax1.set_xlabel('Satisfaction Score')
ax1.set_title('Horizontal Bar Chart')

ax2.bar(categories, satisfied, label='Satisfied', color='#55A868')
ax2.bar(categories, neutral, bottom=satisfied, label='Neutral', color='#C44E52')
ax2.bar(categories, unsatisfied, bottom=np.array(satisfied)+np.array(neutral),
        label='Unsatisfied', color='#4C72B0')
ax2.set_ylabel('Count')
ax2.set_title('Stacked Bar Chart')
ax2.legend()

plt.tight_layout()
plt.show()
```

**输出说明**：

- `barh` 绘制水平柱状图，适合类别名称较长时
- 堆叠柱状图通过 `bottom` 参数指定每层的起始高度
- `tight_layout` 自动调整子图间距

---

## 5. 散点图（Scatter Plot）

### 5.1 基础散点图

```python
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(42)
x = rng.normal(50, 15, 100)
y = 0.8 * x + rng.normal(0, 10, 100)

fig, ax = plt.subplots(figsize=(8, 6))
ax.scatter(x, y, color='#2196F3', alpha=0.6, edgecolors='white', s=50)
ax.set_xlabel('Advertising Spend')
ax.set_ylabel('Revenue')
ax.set_title('Advertising vs Revenue')
plt.show()
```

**输出说明**：散点图展示广告支出与收入的正相关关系。`alpha` 控制透明度，`edgecolors` 设置标记边框颜色，`s` 控制标记大小。

### 5.2 颜色映射散点图

```python
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(42)
x = rng.uniform(0, 10, 200)
y = rng.uniform(0, 10, 200)
z = np.sin(x) * np.cos(y)

fig, ax = plt.subplots(figsize=(9, 7))
scatter = ax.scatter(x, y, c=z, cmap='viridis', s=60, alpha=0.8, edgecolors='gray')
cbar = fig.colorbar(scatter, ax=ax, label='Intensity (sin(x)*cos(y))')
ax.set_xlabel('X')
ax.set_ylabel('Y')
ax.set_title('Scatter Plot with Color Mapping')
plt.show()
```

**输出说明**：`c` 参数指定颜色映射的数据，`cmap` 选择配色方案。`colorbar` 添加颜色条，显示数值与颜色的对应关系。

> **为什么散点图适合展示相关关系？** 散点图将两个变量的值分别映射到 x 和 y 坐标，点的分布模式直接反映变量间的相关方向和强度。加上颜色映射（`c` 参数），可以同时展示第三个变量的信息。

### 5.3 气泡图

```python
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(42)
n = 30
x = rng.uniform(0, 100, n)
y = rng.uniform(0, 100, n)
size = rng.uniform(50, 500, n)
category = rng.choice(['A', 'B', 'C'], n)

color_map = {'A': '#4C72B0', 'B': '#55A868', 'C': '#C44E52'}
colors = [color_map[c] for c in category]

fig, ax = plt.subplots(figsize=(10, 7))
for cat in ['A', 'B', 'C']:
    mask = np.array(category) == cat
    ax.scatter(x[mask], y[mask], s=size[mask], c=color_map[cat],
               alpha=0.6, edgecolors='gray', label=f'Category {cat}')

ax.set_xlabel('Market Share')
ax.set_ylabel('Growth Rate')
ax.set_title('Bubble Chart: Market Analysis')
ax.legend()
plt.show()
```

**输出说明**：气泡图通过点的大小编码第三个变量，配合颜色区分类别，一张图可以同时展示四个维度的信息。

---

## 6. 直方图（Histogram）

### 6.1 基础直方图

```python
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(42)
data_normal = rng.normal(loc=50, scale=10, size=1000)
data_skewed = rng.exponential(scale=20, size=1000)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

ax1.hist(data_normal, bins=30, color='steelblue', edgecolor='white', alpha=0.8)
ax1.set_xlabel('Value')
ax1.set_ylabel('Frequency')
ax1.set_title('Normal Distribution')
ax1.axvline(data_normal.mean(), color='red', linestyle='--', label=f'Mean={data_normal.mean():.1f}')
ax1.legend()

ax2.hist(data_skewed, bins=30, color='darkorange', edgecolor='white', alpha=0.8)
ax2.set_xlabel('Value')
ax2.set_ylabel('Frequency')
ax2.set_title('Exponential Distribution (Right Skewed)')
ax2.axvline(data_skewed.mean(), color='red', linestyle='--', label=f'Mean={data_skewed.mean():.1f}')
ax2.axvline(np.median(data_skewed), color='green', linestyle='--', label=f'Median={np.median(data_skewed):.1f}')
ax2.legend()

plt.tight_layout()
plt.show()
```

**输出说明**：

- 正态分布的均值和中位数接近，直方图左右对称
- 指数分布右偏，均值大于中位数，直方图向右拖尾
- `axvline` 添加垂直参考线，`density=` 可将 y 轴切换为概率密度

### 6.2 密度直方图与叠加

```python
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(42)
group_a = rng.normal(65, 8, 200)
group_b = rng.normal(72, 10, 200)

fig, ax = plt.subplots(figsize=(10, 5))
ax.hist(group_a, bins=25, density=True, alpha=0.5, color='steelblue', label='Group A')
ax.hist(group_b, bins=25, density=True, alpha=0.5, color='darkorange', label='Group B')
ax.set_xlabel('Score')
ax.set_ylabel('Density')
ax.set_title('Overlapping Histograms (Density)')
ax.legend()
plt.show()
```

**输出说明**：`density=` 将 y 轴从频数切换为概率密度，使不同样本量的分布可以直观对比。`alpha=0.5` 使重叠区域可见。

> **为什么直方图的 bins 数量很重要？** bins 太少会掩盖分布细节，太多会引入噪声。经验法则：Sturges 公式 `bins = 1 + log2(n)`，或 Freedman-Diaconis 公式 `bin_width = 2 * IQR * n^(-1/3)`。在实践中，建议尝试 20-50 的范围。

---

## 7. 饼图与环形图

### 7.1 基础饼图

```python
import matplotlib.pyplot as plt

labels = ['Direct', 'Organic Search', 'Social Media', 'Referral', 'Email']
sizes = [35, 28, 18, 12, 7]
colors = ['#4C72B0', '#55A868', '#C44E52', '#8172B2', '#CCB974']
explode = (0.05, 0, 0, 0, 0)

fig, ax = plt.subplots(figsize=(8, 8))
ax.pie(sizes, explode=explode, labels=labels, colors=colors,
       autopct='%1.1f%%', startangle=90, pctdistance=0.85)
ax.set_title('Traffic Sources Distribution')
ax.axis('equal')
plt.show()
```

**输出说明**：

- `autopct` 格式化百分比显示
- `explode` 使某扇区突出
- `startangle` 控制起始角度
- `axis('equal')` 确保饼图为正圆

### 7.2 环形图

```python
import matplotlib.pyplot as plt

labels = ['Completed', 'In Progress', 'Not Started']
sizes = [60, 25, 15]
colors = ['#55A868', '#DD8452', '#C44E52']

fig, ax = plt.subplots(figsize=(8, 8))
wedges, texts, autotexts = ax.pie(
    sizes, labels=labels, colors=colors,
    autopct='%1.1f%%', startangle=90,
    wedgeprops=dict(width=0.4, edgecolor='white')
)
ax.set_title('Project Status (Donut Chart)')
plt.show()
```

**输出说明**：`wedgeprops=dict(width=0.4)` 将饼图变为环形图，`width` 控制环的宽度。环形图中心可以放置汇总信息。

> **什么时候用饼图？** 饼图适合展示少量类别（3-7个）的占比关系。类别过多时，饼图难以阅读，应改用柱状图。永远不要用 3D 饼图——透视变形会扭曲数据的视觉感知。

---

## 8. 子图与布局

### 8.1 规则网格 subplots

```python
import matplotlib.pyplot as plt
import numpy as np

fig, axes = plt.subplots(2, 3, figsize=(15, 8), sharex=True, sharey=True)
fig.suptitle('2x3 Subplot Grid', fontsize=14)

for i, ax in enumerate(axes.flat):
    data = np.random.default_rng(i).normal(0, 1, 500)
    ax.hist(data, bins=30, color=f'C{i}', alpha=0.7)
    ax.set_title(f'Seed={i}')

plt.tight_layout()
plt.show()
```

**输出说明**：

- `sharex=`/`sharey=` 使子图共享坐标轴，减少重复标签
- `axes.flat` 将二维数组展平为一维迭代器
- `tight_layout` 自动调整间距

### 8.2 不规则布局 GridSpec

```python
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np

fig = plt.figure(figsize=(12, 8))
gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.3, wspace=0.3)

ax_main = fig.add_subplot(gs[0:2, 0:2])
ax_right = fig.add_subplot(gs[0:2, 2])
ax_bottom = fig.add_subplot(gs[2, :])

x = np.random.default_rng(42).normal(50, 10, 200)
y = 0.7 * x + np.random.default_rng(43).normal(0, 8, 200)

ax_main.scatter(x, y, alpha=0.5, color='steelblue')
ax_main.set_title('Main Scatter Plot')

ax_right.hist(y, bins=20, orientation='horizontal', color='darkorange', alpha=0.7)
ax_right.set_title('Y Distribution')

ax_bottom.hist(x, bins=20, color='green', alpha=0.7)
ax_bottom.set_title('X Distribution')

fig.suptitle('Custom Layout with GridSpec', fontsize=14)
plt.show()
```

**输出说明**：GridSpec 允许子图跨越多行多列。`gs[0:2, 0:2]` 占据左上 2x2 区域，`gs[0:2, 2]` 占据右侧 2 行，`gs[2, :]` 占据底部整行。这种布局常用于联合分布图。

### 8.3 inset_axes 嵌入图

```python
import matplotlib.pyplot as plt
import numpy as np

from mpl_toolkits.axes_grid1.inset_locator import inset_axes

x = np.linspace(0, 10, 100)
y = np.sin(x) * np.exp(-0.1 * x)

fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(x, y, color='steelblue', linewidth=2)
ax.set_title('Damped Sine Wave with Inset')

ax_inset = inset_axes(ax, width="35%", height="35%", loc='upper right')
x_zoom = np.linspace(0, 2, 100)
y_zoom = np.sin(x_zoom) * np.exp(-0.1 * x_zoom)
ax_inset.plot(x_zoom, y_zoom, color='red', linewidth=2)
ax_inset.set_title('Zoomed: 0-2', fontsize=9)
ax_inset.tick_params(labelsize=7)

plt.show()
```

**输出说明**：`inset_axes` 在主图中嵌入一个缩放视图，适合展示局部细节。

---

## 9. 样式与美化

### 9.1 预设样式

```python
import matplotlib.pyplot as plt
import numpy as np

available_styles = plt.style.available
print(f"可用样式: {available_styles[:10]}...")

plt.style.use('seaborn-v0_8-whitegrid')

x = np.linspace(0, 2 * np.pi, 100)
fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(x, np.sin(x), label='sin(x)')
ax.plot(x, np.cos(x), label='cos(x)')
ax.set_title('With seaborn-v0_8-whitegrid Style')
ax.legend()
plt.show()
```

**输出说明**：`plt.style.available` 列出所有可用样式。常用样式：`seaborn-v0_8-whitegrid`（带网格）、`ggplot`（R风格）、`bmh`（Bayesian风格）、`dark_background`（暗色主题）。

### 9.2 自定义 rcParams

```python
import matplotlib.pyplot as plt
import numpy as np

plt.rcParams.update({
    'figure.figsize': (10, 6),
    'font.size': 12,
    'axes.titlesize': 14,
    'axes.labelsize': 12,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
    'legend.fontsize': 11,
    'axes.spines.top': False,
    'axes.spines.right': False,
    'axes.grid': True,
    'grid.alpha': 0.3,
})

fig, ax = plt.subplots()
ax.plot(np.arange(10), np.random.default_rng(42).standard_normal(10).cumsum())
ax.set_title('Custom rcParams Style')
ax.set_xlabel('Index')
ax.set_ylabel('Value')
plt.show()
```

**输出说明**：`rcParams` 是 Matplotlib 的全局配置字典，可以精细控制所有视觉元素。`axes.spines.top: False` 隐藏顶部边框是数据可视化的常见做法。

### 9.3 中文字体配置

```python
import matplotlib.pyplot as plt
import numpy as np

plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

fig, ax = plt.subplots(figsize=(8, 4))
months = ['1月', '2月', '3月', '4月', '5月', '6月']
sales = [120, 150, 180, 160, 200, 220]
ax.plot(months, sales, marker='o', color='steelblue')
ax.set_title('月度销售趋势')
ax.set_ylabel('销售额（万元）')
plt.show()
```

**输出说明**：中文字体配置是中文环境下最常见的 Matplotlib 问题。`SimHei`（黑体）在 Windows 上可用，macOS 使用 `Arial Unicode MS`。

### 9.4 色盲友好配色

```python
import matplotlib.pyplot as plt
import numpy as np

cb_colors = ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7', '#56B4E9']

fig, ax = plt.subplots(figsize=(8, 5))
for i, color in enumerate(cb_colors):
    ax.barh(i, 1, color=color, height=0.6)
    ax.text(0.5, i, f'Color {i+1}', ha='center', va='center', fontsize=11, color='white')
ax.set_yticks(range(len(cb_colors)))
ax.set_yticklabels([f'C{i}' for i in range(len(cb_colors))])
ax.set_title('Colorblind-Friendly Palette')
plt.show()
```

**输出说明**：使用 Wong 色盲友好配色方案，确保图表对色觉障碍人群也可读。避免红绿对比，使用蓝橙对比替代。

---

## 10. 注释与文本

### 10.1 标题与轴标签

```python
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(8, 5))
x = np.linspace(0, 10, 100)
ax.plot(x, np.sin(x))

ax.set_title('Sine Function', fontsize=16, fontweight='bold', pad=15)
ax.set_xlabel('x (radians)', fontsize=12, labelpad=10)
ax.set_ylabel('sin(x)', fontsize=12, labelpad=10)

plt.show()
```

**输出说明**：`pad` 控制标题与图表的间距，`labelpad` 控制轴标签与刻度的间距。

### 10.2 箭头注释

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 4 * np.pi, 200)
y = np.sin(x) * np.exp(-0.2 * x)

fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(x, y, color='steelblue', linewidth=2)

max_idx = np.argmax(y)
ax.annotate('Maximum',
            xy=(x[max_idx], y[max_idx]),
            xytext=(x[max_idx] + 2, y[max_idx] + 0.15),
            fontsize=12,
            arrowprops=dict(arrowstyle='->', color='red', lw=2),
            color='red')

ax.annotate('Decay region',
            xy=(8, 0.05),
            xytext=(9, 0.3),
            fontsize=11,
            arrowprops=dict(arrowstyle='->', color='gray', lw=1.5),
            color='gray')

ax.set_title('Annotated Damped Sine Wave')
plt.show()
```

**输出说明**：`annotate` 的 `xy` 指向注释目标点，`xytext` 指定文字位置，`arrowprops` 控制箭头样式。

### 10.3 文本与数学公式

```python
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(8, 5))
x = np.linspace(-3, 3, 100)
y = np.exp(-x**2 / 2) / np.sqrt(2 * np.pi)
ax.plot(x, y, color='steelblue', linewidth=2)
ax.fill_between(x, y, alpha=0.2, color='steelblue')

ax.text(0, 0.35, r'$\mu=0, \sigma=1$', fontsize=14, ha='center')
ax.text(2, 0.1, r'$f(x) = \frac{1}{\sqrt{2\pi}} e^{-\frac{x^2}{2}}$',
        fontsize=12, ha='center')

ax.set_title('Standard Normal Distribution')
ax.set_xlabel('x')
ax.set_ylabel('f(x)')
plt.show()
```

**输出说明**：Matplotlib 支持 LaTeX 数学公式，用 `r'$...$'` 包裹。常用符号：`\mu`、`\sigma`、`\frac{}{}`、`\sqrt{}`、`\sum`、`\int`。

---

## 11. 保存与导出

### 11.1 保存参数

```python
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(np.arange(10), np.random.default_rng(42).standard_normal(10).cumsum())
ax.set_title('Chart to Export')

fig.savefig('chart.png', dpi=300, bbox_inches='tight', facecolor='white')
fig.savefig('chart.pdf', bbox_inches='tight')
fig.savefig('chart.svg', bbox_inches='tight')
```

**输出说明**：

- `dpi`：分辨率，屏幕显示 72-150，印刷 300+
- `bbox_inches='tight'`：裁剪空白边距
- `facecolor`：背景色，默认透明（PNG）
- 格式选择：PNG（网页/演示）、PDF/SVG（印刷/矢量编辑）

### 11.2 格式选择指南

| 格式 | 类型 | 适用场景                   | 文件大小 |
| ---- | ---- | -------------------------- | -------- |
| PNG  | 位图 | 网页、PPT、屏幕展示        | 中       |
| JPG  | 位图 | 照片类图表（有损压缩）     | 小       |
| PDF  | 矢量 | 印刷、论文                 | 中       |
| SVG  | 矢量 | 网页嵌入、Illustrator 编辑 | 大       |
| EPS  | 矢量 | LaTeX 文档                 | 中       |

> **为什么论文推荐矢量格式？** 矢量图（PDF/SVG/EPS）在任意缩放下都保持清晰，而位图（PNG/JPG）放大后会出现锯齿。论文通常需要高分辨率图表，矢量格式是最佳选择。

---

## 12. 速查表

### 12.1 图表类型选择

| 数据关系 | 图表类型 | 函数                     |
| -------- | -------- | ------------------------ |
| 趋势变化 | 折线图   | `ax.plot()`              |
| 类别比较 | 柱状图   | `ax.bar()` / `ax.barh()` |
| 分布形态 | 直方图   | `ax.hist()`              |
| 相关关系 | 散点图   | `ax.scatter()`           |
| 占比构成 | 饼图     | `ax.pie()`               |

### 12.2 常用参数

| 参数        | 说明     | 常用值               |
| ----------- | -------- | -------------------- |
| `color`     | 颜色     | 十六进制、颜色名     |
| `marker`    | 标记样式 | 'o', 's', '^', 'D'   |
| `linestyle` | 线型     | '-', '--', ':', '-.' |
| `linewidth` | 线宽     | 1-3                  |
| `alpha`     | 透明度   | 0-1                  |
| `figsize`   | 画布大小 | (10, 6)              |
| `dpi`       | 分辨率   | 72/150/300           |

### 12.3 常用方法

| 方法                             | 说明       |
| -------------------------------- | ---------- |
| `ax.set_title()`                 | 设置标题   |
| `ax.set_xlabel()`/`set_ylabel()` | 设置轴标签 |
| `ax.set_xlim()`/`set_ylim()`     | 设置轴范围 |
| `ax.legend()`                    | 显示图例   |
| `ax.grid()`                      | 显示网格   |
| `ax.annotate()`                  | 添加注释   |
| `ax.text()`                      | 添加文本   |
| `fig.savefig()`                  | 保存图表   |

---

## 13. 延伸阅读

- Matplotlib 官方文档：https://matplotlib.org/stable/
- Matplotlib Gallery：https://matplotlib.org/stable/gallery/
- Scientific Visualization (Nicolas Rougier)
- Matplotlib Cheat Sheet：https://matplotlib.org/cheatsheets/
