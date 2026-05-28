---
order: 90
tags:
  - 'exercises'
  - 'data-analysis'
difficulty: 'intermediate'
title: '数据分析练习题'
module: 'data-analysis'
description: '数据分析核心知识点配套练习，涵盖 NumPy、Pandas 与可视化。'
---

<summary>查看答案</summary>
**答案**: C
**解析**: `df['col']` 返回的是 Series（一维），而 `df['col']('col')` 返回 DataFrame（二维）。这是 Pandas 初学者常见的混淆点。
</details>
### 2. NumPy 中 `arr = np.array([[1,2],[3,4]])`，`arr.sum(axis=0)` 的结果是？
A. `[3, 7]`
B. `[4, 6]`
C. `10`
D. `[[1, 2], [3, 4]]`
<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `axis=0` 表示沿第 0 轴（行方向）压缩，即对每列求和：第 0 列 `1+3=4`，第 1 列 `2+4=6`，结果为 `[4, 6]`。记忆技巧：`axis=0` 沿行方向压缩 = 对列求和，`axis=1` 沿列方向压缩 = 对行求和。
</details>
### 3. 使用 Matplotlib 绘制子图，以下哪种方式最灵活？
A. `plt.subplot(2, 2, 1)`
B. `fig, axes = plt.subplots(2, 2)`
C. `plt.figure()` + `plt.add_subplot()`
D. `plt.subplots_adjust()`
<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `plt.subplots()` 返回 Figure 和 Axes 数组，可以方便地通过 `axes[i, j]` 索引操作每个子图，是最灵活且推荐的面向对象方式。
</details>
### 4. 处理缺失值时，以下哪种方式可能引入偏差？
A. 删除含缺失值的行 `dropna()`
B. 用中位数填充 `fillna(df.median())`
C. 用固定值 0 填充 `fillna(0)`
D. 以上都可能引入偏差
<details>
<summary>查看答案</summary>
**答案**: D
**解析**: 删除行可能导致样本不具代表性（若缺失非随机）；中位数填充会降低方差；0 填充可能扭曲分布。任何缺失值处理方法都可能引入偏差，需根据数据缺失机制（MCAR/MAR/MNAR）选择合适策略。
</details>
### 5. 关于描述性统计，以下说法正确的是？
A. 均值不受极端值影响
B. 中位数不受极端值影响
C. 标准差衡量数据的集中趋势
D. 众数只适用于数值型数据
<details>
<summary>查看答案</summary>
**答案**: B
**解析**: 中位数是排序后中间位置的值，不受极端值影响，是稳健的集中趋势度量。均值对极端值敏感。标准差衡量离散程度而非集中趋势。众数也适用于分类数据。
</details>
## 编程题
### 1. 数据清洗流水线
给定一个包含缺失值、重复行和异常值的 DataFrame，编写清洗函数：去除重复行、填充缺失值（数值列用中位数，分类列用众数）、移除数值列中超过 3 倍标准差的异常值。
**输入**:
```python
 df = pd.DataFrame({
  'age': [25, 30, None, 25, 200, 28],
  'city': ['Beijing', 'Shanghai', 'Beijing', None, 'Beijing', 'Beijing']
 True})
 ```

**输出**: 清洗后的 DataFrame

<details>
<summary>查看参考答案</summary>
```python
 import pandas as pd
 import numpy as np
 def clean_dataframe(df):
  df = df.drop_duplicates()
  for col in df.select_dtypes(include=[np.number]).columns:
  median = df[col].median()
  std = df[col].std()
  mean = df[col].mean()
  mask = (df[col] - mean).abs() <= 3 * std
  df = df[mask]
  df[col] = df[col].fillna(median)
  for col in df.select_dtypes(exclude=[np.number]).columns:
  mode = df[col].mode()[0]
  df[col] = df[col].fillna(mode)
  df = df.reset_index(drop=True)
  return df
 ```
</details>
### 2. 分组聚合与透视表
给定销售数据，按月份和产品类别分组，计算每月各类别的销售额总和和平均订单金额，并生成透视表。
**输入**:
```python
 df = pd.DataFrame({
  'date': pd.to_datetime(['2024-01-05','2024-01-15','2024-02-03','2024-02-20','2024-01-25']),
  'category': ['A','B','A','B','A'],
  'amount': [100, 200, 150, 300, 120]
 True})
 ```

**输出**: 透视表（行=月份，列=类别，值=销售额总和）

<details>
<summary>查看参考答案</summary>
```python
 def sales_pivot(df):
  df['month'] = df['date'].dt.to_period('M')
  summary = df.groupby(['month', 'category']).agg(
  total_amount=('amount', 'sum'),
  avg_amount=('amount', 'mean')
  ).reset_index()
  pivot = df.pivot_table(
  index='month',
  columns='category',
  values='amount',
  aggfunc='sum',
  fill_value=0
  )
  return summary, pivot
 ```
</details>
### 3. 可视化分析
编写函数，对给定 DataFrame 生成综合分析图表：包含数值列的分布直方图、相关系数热力图、以及指定列的箱线图。
**输入**: 包含多个数值列的 DataFrame
**输出**: 2×2 子图布局的分析图表
<details>
<summary>查看参考答案</summary>
```python
 import matplotlib.pyplot as plt
 import seaborn as sns
 def exploratory_plot(df, box_col=None):
  numeric_df = df.select_dtypes(include='number')
  fig, axes = plt.subplots(2, 2, figsize=(12, 10))
  numeric_df.hist(ax=axes[0, 0], bins=20, edgecolor='black')
  axes[0, 0].set_title('Distribution Histograms')
  corr = numeric_df.corr()
  sns.heatmap(corr, annot=True, cmap='coolwarm', ax=axes[0, 1],
  fmt='.2f', square=True)
  axes[0, 1].set_title('Correlation Heatmap')
  if box_col and box_col in numeric_df.columns:
  numeric_df.boxplot(column=box_col, ax=axes[1, 0])
  axes[1, 0].set_title(f'Boxplot: {box_col}')
  else:
  numeric_df.boxplot(ax=axes[1, 0])
  axes[1, 0].set_title('Boxplot (All Columns)')
  numeric_df.plot(kind='kde', ax=axes[1, 1])
  axes[1, 1].set_title('KDE Plot')
  plt.tight_layout()
  plt.savefig('exploratory_analysis.png', dpi=150)
  plt.show()
 ```
</details>
