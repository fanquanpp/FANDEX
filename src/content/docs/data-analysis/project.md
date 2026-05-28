---
order: 80
tags:
  - 'project'
  - 'data-analysis'
  - 'database'
  - 'functional'
  - 'math'
difficulty: 'intermediate'
title: '实战案例 -- 电商用户行为分析'
module: 'data-analysis'
category: 'Data Science / Project'
description: '完整数据分析项目实战：从业务问题定义到结论输出，覆盖数据加载、清洗、EDA、统计检验与可视化全流程'
author: 'fanquanpp'
---

## 目录

- [1. 项目背景与问题定义](#1-项目背景与问题定义)
- [2. 数据加载与初探](#2-数据加载与初探)
- [3. 数据清洗](#3-数据清洗)
- [4. 探索性数据分析](#4-探索性数据分析)
- [5. 统计检验](#5-统计检验)
- [6. 用户分群分析](#6-用户分群分析)
- [7. 漏斗分析](#7-漏斗分析)
- [8. RFM 模型](#8-rfm-模型)
- [9. 结论与建议](#9-结论与建议)
- [10. 项目复盘](#10-项目复盘)
- [11. 速查表](#11-速查表)
- [12. 延伸阅读](#12-延伸阅读)

---

## 1. 项目背景与问题定义

### 1.1 业务背景

某电商平台希望了解用户行为模式，优化运营策略。具体业务问题：

1. 用户消费金额的分布特征是什么？
2. 不同时段的用户行为是否有显著差异？
3. 哪些因素与用户留存相关？
4. 如何基于用户行为进行分群？

### 1.2 问题定义（SMART 原则）

| 问题     | Specific             | Measurable         | Achievable     | Relevant       | Time-bound  |
| -------- | -------------------- | ------------------ | -------------- | -------------- | ----------- |
| 消费分布 | 描述消费金额分布     | 均值/中位数/分位数 | 有交易数据     | 理解用户消费力 | 近6个月数据 |
| 时段差异 | 工作日vs周末消费差异 | t检验p值           | 有时间标签     | 优化促销时段   | 近6个月数据 |
| 留存因素 | 首次消费额与留存关系 | 相关系数           | 有首次消费记录 | 提升留存率     | 近6个月数据 |
| 用户分群 | 基于RFM分群          | 分群数量和特征     | 有消费记录     | 精准营销       | 近6个月数据 |

> 跨模块参考：本案例综合运用 [pandas.md](pandas.md) 数据处理、[statistics.md](statistics.md) 统计检验、[seaborn.md](seaborn.md) 可视化、[data-cleaning.md](data-cleaning.md) 数据清洗。

---

## 2. 数据加载与初探

### 2.1 模拟数据生成

由于本案例为教学示例，我们生成模拟数据：

```python
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

rng = np.random.default_rng(42)

n_users = 500
n_orders = 3000

user_ids = rng.integers(1000, 9999, size=n_users)
user_table = pd.DataFrame({
    'user_id': user_ids,
    'gender': rng.choice(['M', 'F'], size=n_users, p=[0.45, 0.55]),
    'age': rng.integers(18, 65, size=n_users),
    'city_tier': rng.choice([1, 2, 3], size=n_users, p=[0.3, 0.4, 0.3]),
    'register_date': pd.to_datetime('2023-01-01') + pd.to_timedelta(
        rng.integers(0, 365, size=n_users), unit='D'
    )
})

base_date = pd.to_datetime('2023-07-01')
order_table = pd.DataFrame({
    'order_id': range(10001, 10001 + n_orders),
    'user_id': rng.choice(user_ids, size=n_orders),
    'order_date': base_date + pd.to_timedelta(rng.integers(0, 180, size=n_orders), unit='D'),
    'amount': np.round(np.maximum(rng.exponential(scale=200, size=n_orders), 10), 2),
    'category': rng.choice(['Electronics', 'Clothing', 'Food', 'Home', 'Beauty'],
                           size=n_orders, p=[0.2, 0.25, 0.2, 0.15, 0.2]),
    'payment_method': rng.choice(['Credit Card', 'Debit Card', 'E-Wallet', 'Cash on Delivery'],
                                 size=n_orders, p=[0.35, 0.2, 0.3, 0.15]),
    'is_returned': rng.choice([0, 1], size=n_orders, p=[0.9, 0.1])
})

print(f"用户表: {user_table.shape}")
print(f"订单表: {order_table.shape}")
print(f"\n用户表前5行:\n{user_table.head()}")
print(f"\n订单表前5行:\n{order_table.head()}")
```

**输出说明**：生成了 500 个用户和 3000 条订单的模拟数据。用户表包含人口统计信息，订单表包含消费行为信息。数据结构与真实电商场景一致。

### 2.2 数据初探

```python
print("=== 用户表概览 ===")
print(user_table.info())
print(f"\n描述统计:\n{user_table.describe()}")

print("\n=== 订单表概览 ===")
print(order_table.info())
print(f"\n描述统计:\n{order_table.describe()}")
print(f"\n缺失值:\n{order_table.isna().sum()}")
```

**输出说明**：`info()` 查看数据类型和非空值数量，`describe()` 查看数值列的统计摘要，`isna().sum()` 检查缺失值。这是每次拿到新数据后的标准操作。

---

## 3. 数据清洗

### 3.1 数据合并

```python
df = pd.merge(order_table, user_table, on='user_id', how='left')
print(f"合并后: {df.shape}")
print(f"缺失值:\n{df.isna().sum()}")
```

**输出说明**：将订单表与用户表通过 `user_id` 进行左连接，使每条订单附带用户信息。检查是否有订单的 user_id 在用户表中不存在。

### 3.2 特征工程

```python
df['order_month'] = df['order_date'].dt.to_period('M')
df['order_weekday'] = df['order_date'].dt.day_name()
df['is_weekend'] = df['order_date'].dt.dayofweek >= 5
df['hour_period'] = pd.cut(
    df['order_date'].dt.hour,
    bins=[0, 6, 12, 18, 24],
    labels=['Night', 'Morning', 'Afternoon', 'Evening'],
    right=False
)

df['age_group'] = pd.cut(
    df['age'],
    bins=[17, 25, 35, 45, 65],
    labels=['18-25', '26-35', '36-45', '46-65']
)

print(f"新增特征后: {df.shape}")
print(f"\n时段分布:\n{df['hour_period'].value_counts()}")
print(f"\n年龄组分布:\n{df['age_group'].value_counts()}")
```

**输出说明**：从原始字段派生出更有分析价值的特征：

- `order_month`：月份，用于趋势分析
- `is_weekend`：是否周末，用于时段对比
- `hour_period`：时段分类，用于行为模式分析
- `age_group`：年龄段，用于人群对比

> **为什么特征工程在清洗阶段做？** 原始数据往往不直接包含分析所需的维度。特征工程将原始字段转化为可分析的维度，是连接"数据"和"分析"的桥梁。

### 3.3 异常值检查

```python
Q1 = df['amount'].quantile(0.25)
Q3 = df['amount'].quantile(0.75)
IQR = Q3 - Q1
lower = Q1 - 1.5 * IQR
upper = Q3 + 1.5 * IQR

outliers = df[df['amount'] > upper]
print(f"消费金额异常值: {len(outliers)} 条 ({len(outliers)/len(df)*100:.1f}%)")
print(f"异常值金额范围: [{outliers['amount'].min():.2f}, {outliers['amount'].max():.2f}]")

import seaborn as sns
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(10, 4))
sns.boxplot(x=df['amount'], ax=ax)
ax.set_title('Order Amount Distribution (Box Plot)')
plt.show()
```

**输出说明**：指数分布生成的消费金额天然右偏，IQR 方法会标记较多"异常值"。在电商场景中，高消费用户（VIP）不应被视为异常值删除，而是单独分析。因此这里保留所有数据。

---

## 4. 探索性数据分析

### 4.1 消费金额分布

```python
import seaborn as sns
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

sns.histplot(df['amount'], bins=50, kde=True, ax=axes[0])
axes[0].axvline(df['amount'].mean(), color='red', linestyle='--', label=f"Mean: {df['amount'].mean():.0f}")
axes[0].axvline(df['amount'].median(), color='green', linestyle='--', label=f"Median: {df['amount'].median():.0f}")
axes[0].set_title('Order Amount Distribution')
axes[0].legend()

sns.histplot(np.log1p(df['amount']), bins=50, kde=True, ax=axes[1], color='darkorange')
axes[1].set_title('Log-Transformed Amount Distribution')

plt.tight_layout()
plt.show()

print(f"均值: {df['amount'].mean():.2f}")
print(f"中位数: {df['amount'].median():.2f}")
print(f"偏度: {df['amount'].skew():.2f}")
print(f"峰度: {df['amount'].kurtosis():.2f}")
```

**输出说明**：

- 消费金额呈右偏分布（偏度 > 0），均值 > 中位数
- 对数变换后分布更接近正态，便于后续统计检验
- 右偏分布是消费数据的典型特征——少数用户贡献大部分收入

> **为什么消费数据总是右偏？** 消费金额有下界（最低消费）但无上界，少数高消费用户拉长了右侧尾部。这种分布符合帕累托法则（80/20 法则），在电商分析中极为常见。

### 4.2 月度趋势

```python
import seaborn as sns
import matplotlib.pyplot as plt

monthly = df.groupby('order_month').agg(
    order_count=('order_id', 'count'),
    total_amount=('amount', 'sum'),
    avg_amount=('amount', 'mean')
).reset_index()
monthly['order_month'] = monthly['order_month'].astype(str)

fig, ax1 = plt.subplots(figsize=(12, 5))

color1 = 'steelblue'
ax1.bar(monthly['order_month'], monthly['order_count'], color=color1, alpha=0.6, label='Order Count')
ax1.set_ylabel('Order Count', color=color1)
ax1.tick_params(axis='y', labelcolor=color1)

ax2 = ax1.twinx()
color2 = 'darkorange'
ax2.plot(monthly['order_month'], monthly['total_amount'], color=color2, marker='o', linewidth=2, label='Total Amount')
ax2.set_ylabel('Total Amount', color=color2)
ax2.tick_params(axis='y', labelcolor=color2)

ax1.set_title('Monthly Order Trends')
ax1.set_xlabel('Month')

lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left')

plt.tight_layout()
plt.show()
```

**输出说明**：双轴图同时展示订单量（柱状图）和总消费额（折线图）的月度趋势。如果两个指标走势不一致，说明客单价在变化。

### 4.3 品类与支付方式

```python
import seaborn as sns
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

cat_stats = df.groupby('category')['amount'].agg(['mean', 'sum', 'count']).sort_values('sum', ascending=False)
sns.barplot(data=cat_stats.reset_index(), x='category', y='sum', ax=axes[0], palette='Set2')
axes[0].set_title('Total Revenue by Category')
axes[0].set_ylabel('Total Amount')

payment_counts = df['payment_method'].value_counts()
axes[1].pie(payment_counts, labels=payment_counts.index, autopct='%1.1f%%',
            colors=sns.color_palette('Set2', len(payment_counts)))
axes[1].set_title('Payment Method Distribution')

plt.tight_layout()
plt.show()
```

**输出说明**：左图展示各品类总销售额，右图展示支付方式占比。这些信息直接影响品类运营策略和支付渠道优化。

### 4.4 用户维度分析

```python
import seaborn as sns
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 3, figsize=(18, 5))

sns.boxplot(data=df, x='gender', y='amount', ax=axes[0])
axes[0].set_title('Amount by Gender')

sns.boxplot(data=df, x='age_group', y='amount', ax=axes[1])
axes[1].set_title('Amount by Age Group')

sns.boxplot(data=df, x='city_tier', y='amount', ax=axes[2])
axes[2].set_title('Amount by City Tier')
axes[2].set_xticklabels(['Tier 1', 'Tier 2', 'Tier 3'])

plt.tight_layout()
plt.show()
```

**输出说明**：箱线图对比不同用户群体的消费金额分布。如果某群体的中位数明显高于其他群体，说明该群体是高价值用户。

---

## 5. 统计检验

### 5.1 工作日 vs 周末消费差异

```python
from scipy import stats
import numpy as np

weekday = df[df['is_weekend'] == False]['amount']
weekend = df[df['is_weekend'] == True]['amount']

print(f"工作日: n={len(weekday)}, mean={weekday.mean():.2f}, median={weekday.median():.2f}")
print(f"周末:   n={len(weekend)}, mean={weekend.mean():.2f}, median={weekend.median():.2f}")

t_stat, p_value = stats.ttest_ind(weekday, weekend)
print(f"\nt检验: t={t_stat:.4f}, p={p_value:.4f}")

u_stat, p_mann = stats.mannwhitneyu(weekday, weekend)
print(f"Mann-Whitney U: U={u_stat:.1f}, p={p_mann:.4f}")

cohen_d = (weekday.mean() - weekend.mean()) / np.sqrt(
    (weekday.std(ddof=1)**2 + weekend.std(ddof=1)**2) / 2
)
print(f"Cohen's d: {abs(cohen_d):.3f}")
```

**输出说明**：

- t 检验假设正态分布，消费金额右偏时可能不可靠
- Mann-Whitney U 检验不要求数据正态，更适合此场景
- Cohen's d 衡量效应量，判断差异是否有实际意义
- 如果 p < 0.05 但 Cohen's d < 0.2，差异统计显著但实际意义不大

### 5.2 性别消费差异

```python
from scipy import stats

male = df[df['gender'] == 'M']['amount']
female = df[df['gender'] == 'F']['amount']

t_stat, p_value = stats.ttest_ind(male, female)
print(f"性别消费差异: t={t_stat:.4f}, p={p_value:.4f}")

if p_value < 0.05:
    print("结论: 男女消费金额有显著差异")
else:
    print("结论: 不能拒绝H0，男女消费金额无显著差异")
```

**输出说明**：t 检验判断两组均值差异是否统计显著。在 A/B 测试中，这是判断实验效果是否真实的标准方法。

### 5.3 品类消费差异（ANOVA）

```python
from scipy import stats

groups = [group['amount'].values for _, group in df.groupby('category')]
f_stat, p_value = stats.f_oneway(*groups)
print(f"ANOVA: F={f_stat:.4f}, p={p_value:.4f}")

if p_value < 0.05:
    print("结论: 至少两个品类的平均消费金额有显著差异")
else:
    print("结论: 品类间消费金额无显著差异")
```

**输出说明**：ANOVA 检验多组均值是否有显著差异。如果结果显著，需要事后比较（如 Tukey HSD）确定具体哪两组不同。

---

## 6. 用户分群分析

### 6.1 基于消费行为的分群

```python
import pandas as pd
import numpy as np

user_stats = df.groupby('user_id').agg(
    order_count=('order_id', 'count'),
    total_amount=('amount', 'sum'),
    avg_amount=('amount', 'mean'),
    category_variety=('category', 'nunique'),
    return_rate=('is_returned', 'mean')
).reset_index()

user_stats['frequency_segment'] = pd.cut(
    user_stats['order_count'],
    bins=[0, 3, 7, 15, 100],
    labels=['Low', 'Medium', 'High', 'Very High']
)

user_stats['value_segment'] = pd.qcut(
    user_stats['total_amount'],
    q=4,
    labels=['Bronze', 'Silver', 'Gold', 'Platinum']
)

print(f"频次分群:\n{user_stats['frequency_segment'].value_counts()}")
print(f"\n价值分群:\n{user_stats['value_segment'].value_counts()}")
```

**输出说明**：

- 频次分群基于订单数量，使用固定阈值
- 价值分群基于总消费额，使用四分位数确保每组人数相近
- 两种分群可以交叉，形成更精细的用户画像

### 6.2 分群可视化

```python
import seaborn as sns
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

cross_tab = pd.crosstab(user_stats['frequency_segment'], user_stats['value_segment'])
sns.heatmap(cross_tab, annot=True, fmt='d', cmap='YlOrRd', ax=axes[0])
axes[0].set_title('Frequency vs Value Segment')

sns.scatterplot(data=user_stats, x='order_count', y='total_amount',
                hue='value_segment', alpha=0.6, ax=axes[1])
axes[1].set_title('Order Count vs Total Amount')
axes[1].set_xlabel('Order Count')
axes[1].set_ylabel('Total Amount')

plt.tight_layout()
plt.show()
```

**输出说明**：热力图展示频次和价值分群的交叉分布，散点图展示订单数与总消费额的关系。高价值用户通常也是高频用户，但并非总是如此。

---

## 7. 漏斗分析

### 7.1 转化漏斗

```python
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

total_users = len(user_table)
purchased_users = df['user_id'].nunique()
repeat_users = df.groupby('user_id').filter(lambda x: len(x) > 1)['user_id'].nunique()
high_value_users = user_stats[user_stats['value_segment'] == 'Platinum']['user_id'].nunique()

funnel = pd.DataFrame({
    'stage': ['Registered', 'Purchased', 'Repeat Purchase', 'High Value'],
    'count': [total_users, purchased_users, repeat_users, high_value_users]
})
funnel['rate'] = funnel['count'] / funnel['count'].iloc[0] * 100
funnel['drop_rate'] = funnel['rate'].diff().fillna(0)

print(funnel)

fig, ax = plt.subplots(figsize=(10, 6))
bars = ax.barh(funnel['stage'][::-1], funnel['count'][::-1], color=['#4C72B0', '#55A868', '#DD8452', '#C44E52'])

for bar, count, rate in zip(bars, funnel['count'][::-1], funnel['rate'][::-1]):
    ax.text(bar.get_width() + 5, bar.get_y() + bar.get_height()/2,
            f'{count} ({rate:.1f}%)', va='center')

ax.set_title('User Conversion Funnel')
ax.set_xlabel('Number of Users')
plt.tight_layout()
plt.show()
```

**输出说明**：漏斗分析展示用户从注册到高价值用户的转化路径。每一步的流失率指示了优化方向——流失最大的环节是优先改进的目标。

> **漏斗分析的关键指标**：
>
> - 整体转化率：最终环节 / 最初环节
> - 环节转化率：下一环节 / 当前环节
> - 最大流失环节：转化率最低的相邻环节

---

## 8. RFM 模型

### 8.1 RFM 指标计算

RFM 是用户价值分析的经典模型：

| 指标      | 含义                 | 计算方式                    |
| --------- | -------------------- | --------------------------- |
| Recency   | 最近一次消费距今多久 | 当前日期 - 最后一次消费日期 |
| Frequency | 消费频次             | 订单数量                    |
| Monetary  | 消费金额             | 总消费额                    |

```python
import pandas as pd
import numpy as np

analysis_date = df['order_date'].max() + pd.Timedelta(days=1)

rfm = df.groupby('user_id').agg(
    recency=('order_date', lambda x: (analysis_date - x.max()).days),
    frequency=('order_id', 'count'),
    monetary=('amount', 'sum')
).reset_index()

rfm['R_score'] = pd.qcut(rfm['recency'], q=5, labels=[5, 4, 3, 2, 1]).astype(int)
rfm['F_score'] = pd.qcut(rfm['frequency'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
rfm['M_score'] = pd.qcut(rfm['monetary'], q=5, labels=[1, 2, 3, 4, 5]).astype(int)

rfm['RFM_score'] = rfm['R_score'] * 100 + rfm['F_score'] * 10 + rfm['M_score']

print(f"RFM 统计:\n{rfm['recency', 'frequency', 'monetary']('recency', 'frequency', 'monetary').describe()}")
print(f"\nRFM 评分分布:\n{rfm['R_score', 'F_score', 'M_score']('R_score', 'F_score', 'M_score').describe()}")
```

**输出说明**：

- Recency 越小越好，所以 R_score 用反向标签（天数越少分数越高）
- Frequency 和 Monetary 越大越好，正向标签
- RFM_score 是三位数组合，如 555 表示最高价值用户

### 8.2 RFM 分群

```python
import pandas as pd
import numpy as np

def rfm_segment(row):
    if row['R_score'] >= 4 and row['F_score'] >= 4 and row['M_score'] >= 4:
        return 'Champions'
    elif row['R_score'] >= 3 and row['F_score'] >= 3:
        return 'Loyal Customers'
    elif row['R_score'] >= 4 and row['F_score'] <= 2:
        return 'New Customers'
    elif row['R_score'] <= 2 and row['F_score'] >= 3:
        return 'At Risk'
    elif row['R_score'] <= 2 and row['F_score'] <= 2:
        return 'Lost'
    else:
        return 'Need Attention'

rfm['segment'] = rfm.apply(rfm_segment, axis=1)

segment_stats = rfm.groupby('segment').agg(
    count=('user_id', 'count'),
    avg_monetary=('monetary', 'mean'),
    avg_frequency=('frequency', 'mean')
).round(2)
print(segment_stats.sort_values('count', ascending=False))
```

**输出说明**：RFM 分群将用户分为 6 个群体：

- **Champions**：最近消费、高频、高消费——最优质用户
- **Loyal Customers**：稳定消费——维护对象
- **New Customers**：刚消费但频次低——培育对象
- **At Risk**：曾经高频但最近未消费——挽回对象
- **Lost**：长期未消费且频次低——流失用户
- **Need Attention**：其他——需进一步分析

### 8.3 RFM 可视化

```python
import seaborn as sns
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(14, 6))

segment_counts = rfm['segment'].value_counts()
colors = {'Champions': '#55A868', 'Loyal Customers': '#4C72B0', 'New Customers': '#64B5F6',
          'At Risk': '#DD8452', 'Lost': '#C44E52', 'Need Attention': '#8172B2'}

axes[0].barh(segment_counts.index, segment_counts.values,
             color=[colors.get(s, 'gray') for s in segment_counts.index])
axes[0].set_title('User Count by RFM Segment')
axes[0].set_xlabel('Number of Users')

sns.scatterplot(data=rfm, x='recency', y='monetary',
                hue='segment', alpha=0.6, ax=axes[1],
                palette=colors)
axes[1].set_title('Recency vs Monetary by Segment')
axes[1].set_xlabel('Recency (days)')
axes[1].set_ylabel('Monetary ($)')

plt.tight_layout()
plt.show()
```

**输出说明**：左图展示各分群的用户数量，右图展示 Recency 与 Monetary 的关系。Champions 集中在左上角（低 Recency、高 Monetary），Lost 集中在右下角。

---

## 9. 结论与建议

### 9.1 核心发现

| 发现            | 证据                       | 业务含义                           |
| --------------- | -------------------------- | ---------------------------------- |
| 消费金额右偏    | 偏度 > 0，均值远大于中位数 | 少数高消费用户贡献大部分收入       |
| 品类消费差异    | ANOVA p < 0.05             | 不同品类客单价差异大，需差异化运营 |
| 工作日/周末差异 | t 检验/Mann-Whitney U      | 可针对高消费时段加大促销力度       |
| 用户分层明显    | RFM 分群 6 类              | 不同群体需不同运营策略             |

### 9.2 行动建议

| 目标群体        | 策略                       | 预期效果               |
| --------------- | -------------------------- | ---------------------- |
| Champions       | VIP 专属权益、新品优先体验 | 维持高价值、提升满意度 |
| Loyal Customers | 会员积分、定期优惠券       | 提升消费频次           |
| New Customers   | 首单优惠、品类推荐         | 提升复购率             |
| At Risk         | 召回活动、个性化推荐       | 降低流失率             |
| Lost            | 低成本触达（邮件/短信）    | 尝试挽回               |

### 9.3 后续分析方向

- **A/B 测试**：对 At Risk 用户测试不同召回策略的效果
- **时间序列预测**：预测未来月度 GMV 趋势
- **推荐系统**：基于用户品类偏好做个性化推荐
- **归因分析**：分析不同渠道的转化贡献

---

## 10. 项目复盘

### 10.1 常见错误与规避

| 错误         | 描述                   | 规避方法           |
| ------------ | ---------------------- | ------------------ |
| 跳过问题定义 | 直接分析数据           | 先写 SMART 问题    |
| 忽视数据偏态 | 对右偏数据用均值       | 优先看中位数       |
| 相关当因果   | 发现关联就下因果结论   | 用 A/B 测试验证    |
| 忽视效应量   | 只看 p 值              | 同时报告 Cohen's d |
| 过度拟合     | 在同一数据上检验和建模 | 留出测试集         |

### 10.2 分析报告结构

一份完整的数据分析报告应包含：

```
1. 执行摘要（1页）
   - 核心发现（3-5条）
   - 关键建议（2-3条）

2. 背景与方法
   - 业务问题
   - 数据来源与范围
   - 分析方法

3. 分析过程
   - 数据质量评估
   - EDA 发现
   - 统计检验结果

4. 结论与建议
   - 数据驱动的结论
   - 可执行的建议
   - 预期影响

5. 附录
   - 技术细节
   - 完整图表
   - 数据字典
```

---

## 11. 速查表

### 11.1 项目流程速查

```
1. 定义问题 -> SMART 原则
2. 加载数据 -> read_csv / read_sql / 模拟生成
3. 数据初探 -> info / describe / head
4. 数据清洗 -> 缺失值 / 异常值 / 类型转换 / 特征工程
5. EDA -> 分布 / 趋势 / 对比 / 相关
6. 统计检验 -> t检验 / ANOVA / 卡方
7. 深度分析 -> 分群 / 漏斗 / RFM
8. 结论建议 -> 发现 -> 策略 -> 预期效果
```

### 11.2 常用聚合模式

```python
df.groupby('dim').agg(
    metric1=('col1', 'mean'),
    metric2=('col2', 'sum'),
    metric3=('col3', 'count'),
    metric4=('col4', 'nunique')
)
```

### 11.3 可视化选择

| 分析目标   | 图表            | 代码                           |
| ---------- | --------------- | ------------------------------ |
| 单变量分布 | 直方图+KDE      | `sns.histplot(kde=True)`       |
| 组间对比   | 箱线图          | `sns.boxplot(x, y)`            |
| 趋势变化   | 折线图          | `ax.plot()`                    |
| 占比构成   | 饼图/堆叠柱状图 | `ax.pie()` / `ax.bar(stacked)` |
| 多变量关系 | 散点图          | `sns.scatterplot(x, y, hue)`   |
| 相关矩阵   | 热力图          | `sns.heatmap(corr)`            |
| 转化路径   | 漏斗图          | 水平柱状图                     |

---

## 12. 延伸阅读

- Python for Data Analysis 第 3 版 (Wes McKinney) -- 真实数据案例
- Storytelling with Data (Cole Nussbaumer Knaflic) -- 数据叙事
- Lean Analytics (Alistair Croll) -- 创业数据分析框架
- Kaggle 竞赛案例：https://www.kaggle.com/competitions
