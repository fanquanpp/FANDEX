---
order: 30
tags:
  - 'data-analysis'
difficulty: intermediate
title: 'Pandas -- DataFrame/Series、数据清洗、合并重塑'
module: 'data-analysis'
category: 'Data Science / Pandas'
description: 'Pandas 核心数据结构与操作：Series/DataFrame 创建、索引筛选、分组聚合、合并拼接与重塑'
author: fanquanpp
related:
  - 'data-analysis/数据分析概述'
  - 'data-analysis/NumPy数组操作-线性代数与随机数'
  - 'data-analysis/Matplotlib-折线图-柱状图-散点图与子图'
  - 'data-analysis/Seaborn-统计可视化-热力图与分布图'
prerequisites: []
---

## 1. Pandas 简介

### 1.1 为什么需要 Pandas

如果说 NumPy 解决的是"数值计算"问题，那么 Pandas 解决的是"表格数据处理"问题。真实世界的数据分析面对的是：

- 异构数据类型（同一表中包含数值、字符串、日期）
- 缺失值与不规则数据
- 需要类似 SQL 的分组、聚合、连接操作
- 时间序列的复杂处理需求
  NumPy 的 `ndarray` 要求所有元素同类型，无法直接处理这些问题。Pandas 在 NumPy 之上构建了 `Series` 和 `DataFrame` 两个数据结构，专门为表格数据分析设计。
  > **Pandas 与 SQL 的关系**：Pandas 的很多操作可以直接映射到 SQL 语句。理解这种映射有助于从 SQL 思维过渡到 Pandas 思维。详见 [MySQL](mysql/overview) 中的 SQL 基础。

### 1.2 核心设计理念

Pandas 的设计灵感来自 R 语言的 data.frame，核心设计理念：

- **标签对齐**：数据操作自动对齐索引，避免位置错位
- **缺失值处理**：NaN 是一等公民，所有操作都考虑缺失值
- **向量化操作**：避免显式循环，利用底层 NumPy 的性能

```python
 import pandas as pd
 import numpy as np
 print(f"Pandas version: {pd.__version__}")
```

---

## 2. Series 基础

### 2.1 创建 Series

Series 是一维带标签的数组，由数据和索引两部分组成：

```python
 import pandas as pd
 import numpy as np
 s1 = pd.Series([10, 20, 30, 40, 50])
 print(f"默认索引:\n{s1}")
 s2 = pd.Series([10, 20, 30], index=['a', 'b', 'c'])
 print(f"自定义索引:\n{s2}")
 s3 = pd.Series({'apple': 3, 'banana': 5, 'cherry': 2})
 print(f"从字典创建:\n{s3}")
 s4 = pd.Series(5, index=['a', 'b', 'c'])
 print(f"标量创建:\n{s4}")
```

**输出说明**：

- 不指定索引时自动生成 0,1,2,... 的整数索引
- 自定义索引可以是字符串或其他可哈希类型
- 从字典创建时，键成为索引，值成为数据
- 标量创建时，所有元素值相同

### 2.2 Series 属性与方法

```python
 import pandas as pd
 import numpy as np
 s = pd.Series([10, 20, 30, 40, 50], index=['a', 'b', 'c', 'd', 'e'], name='scores')
 print(f"values: {s.values}")
 print(f"index: {s.index}")
 print(f"dtype: {s.dtype}")
 print(f"name: {s.name}")
 print(f"shape: {s.shape}")
 print(f"size: {s.size}")
```

**输出说明**：

- `values` 返回底层的 NumPy 数组
- `index` 返回索引对象
- `dtype` 返回数据类型
- `name` 是 Series 的名称标识，在 DataFrame 中自动成为列名

### 2.3 Series 向量化运算

```python
 import pandas as pd
 import numpy as np
 s = pd.Series([10, 20, 30, 40, 50], index=['a', 'b', 'c', 'd', 'e'])
 print(f"乘以2:\n{s * 2}")
 print(f"加100:\n{s + 100}")
 print(f"布尔筛选:\n{s[s > 25]}")
 print(f"数学函数:\n{np.sqrt(s)}")
 s2 = pd.Series([1, 2, 3], index=['a', 'c', 'e'])
 print(f"索引对齐运算:\n{s + s2}")
```

**输出说明**：Series 运算自动按索引对齐。当两个 Series 索引不完全匹配时，未对齐的位置结果为 NaN。这是 Pandas 的核心特性——标签对齐，避免了位置错位的常见 Bug。

> **为什么索引对齐很重要？** 在 SQL 中，JOIN 操作需要显式指定连接键。Pandas 的索引对齐相当于自动 JOIN，减少了出错的可能。但也意味着你需要时刻注意索引是否正确设置。

---

## 3. DataFrame 基础

### 3.1 创建 DataFrame

```python
 import pandas as pd
 import numpy as np
 df1 = pd.DataFrame({
  'name': ['Alice', 'Bob', 'Charlie', 'Diana'],
  'age': [25, 30, 35, 28],
  'score': [85.5, 92.0, 78.5, 95.0],
  'passed': [True, True, False, True]
 }
 print(f"从字典创建:\n{df1}")
 df2 = pd.DataFrame([
  {'name': 'Alice', 'age': 25},
  {'name': 'Bob', 'age': 30},
  {'name': 'Charlie', 'age': 35}
 ]
 print(f"从字典列表创建:\n{df2}")
 df3 = pd.DataFrame(
  np.random.default_rng(42).integers(0, 100, size=(3, 4)),
  columns=['A', 'B', 'C', 'D'],
  index=['row1', 'row2', 'row3']
 )
 print(f"从NumPy数组创建:\n{df3}")
```

**输出说明**：

- 从字典创建时，键成为列名，值长度必须一致
- 从字典列表创建时，每个字典代表一行，缺失键自动填 NaN
- 从 NumPy 数组创建时，需要指定 columns 和 index

### 3.2 核心属性与信息查看

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
  'age': [25, 30, 35, 28, None],
  'score': [85.5, 92.0, 78.5, 95.0, 88.0],
  'city': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Beijing']
 }
 print(f"shape: {df.shape}")
 print(f"columns: {df.columns.tolist()}")
 print(f"index: {df.index.tolist()}")
 print(f"dtypes:\n{df.dtypes}")
 print(f"\ninfo():")
 df.info()
 print(f"\ndescribe():\n{df.describe()}")
 print(f"\ndescribe(include='all'):\n{df.describe(include='all')}")
```

**输出说明**：

- `shape` 返回 (行数, 列数)
- `dtypes` 显示每列的数据类型，`None` 值导致 age 列变为 float64
- `info()` 显示非空值数量和内存使用
- `describe()` 默认只统计数值列，`include='all'` 包含所有列

### 3.3 行列操作

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'name': ['Alice', 'Bob', 'Charlie'],
  'age': [25, 30, 35],
  'score': [85, 92, 78]
 }
 df['grade'] = ['B', 'A', 'C']
 print(f"添加列:\n{df}")
 df.insert(1, 'gender', ['F', 'M', 'M'])
 print(f"插入列到指定位置:\n{df}")
 df_dropped = df.drop(columns=['grade'])
 print(f"删除列:\n{df_dropped}")
 df_row = df.drop(index=[0])
 print(f"删除行:\n{df_row}")
```

**输出说明**：

- `df['new_col'] = ...` 在末尾添加新列
- `df.insert(pos, name, values)` 在指定位置插入列
- `df.drop()` 返回新 DataFrame，不修改原数据（除非 `inplace=`）

---

## 4. 索引与数据选择

### 4.1 选择方法对比

Pandas 提供了多种数据选择方式，初学者容易混淆。核心区分：

| 方法                               | 基于标签 | 基于位置 | 返回类型  |
| ---------------------------------- | -------- | -------- | --------- |
| `df['col']`                        | 列名     | -        | Series    |
| `df['col1','col2']('col1','col2')` | 列名列表 | -        | DataFrame |
| `df.loc[row, col]`                 | 标签     | -        | 灵活      |
| `df.iloc[row, col]`                | -        | 整数位置 | 灵活      |
| `df.at[row, col]`                  | 标签     | -        | 标量      |
| `df.iat[row, col]`                 | -        | 整数位置 | 标量      |

> **为什么推荐用 `.loc` 和 `.iloc`？** `df['col']` 和 `df[condition]` 的行为不一致——前者选择列，后者选择行。这种不一致是 Pandas 设计的历史遗留问题。使用 `.loc` 和 `.iloc` 可以明确表达意图，减少歧义。

### 4.2 loc 标签选择

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'name': ['Alice', 'Bob', 'Charlie', 'Diana'],
  'age': [25, 30, 35, 28],
  'score': [85, 92, 78, 95],
  'city': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen']
 }
 print(f"选择行:\n{df.loc['a']}")
 print(f"\n选择多行:\n{df.loc['a', 'c']('a', 'c')}")
 print(f"\n行切片:\n{df.loc['a':'c']}")
 print(f"\n行列同时选择:\n{df.loc[['a', 'c'], ['name', 'score']]}")
 print(f"\n布尔选择:\n{df.loc[df['age'] > 28, ['name', 'score']]}")
```

**输出说明**：

- `loc` 使用标签索引，切片包含端点（与 Python 列表切片不同）
- `loc` 支持布尔数组作为行选择器
- `loc[row, col]` 可以同时选择行和列

### 4.3 iloc 位置选择

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'name': ['Alice', 'Bob', 'Charlie', 'Diana'],
  'age': [25, 30, 35, 28],
  'score': [85, 92, 78, 95]
 }
 print(f"第一行:\n{df.iloc[0]}")
 print(f"\n前两行，前两列:\n{df.iloc[:2, :2]}")
 print(f"\n间隔选取:\n{df.iloc[[0, 2], [0, 2]]}")
 print(f"\n最后一行:\n{df.iloc[-1]}")
```

**输出说明**：

- `iloc` 使用整数位置，切片不包含端点（与 Python 列表切片一致）
- 支持负数索引
- 适合在不知道列名但知道位置的场景下使用

### 4.4 高级筛选

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
  'age': [25, 30, 35, 28, 22],
  'score': [85, 92, 78, 95, 88],
  'city': ['Beijing', 'Shanghai', 'Beijing', 'Shenzhen', 'Shanghai']
 }
 print(f"isin筛选:\n{df[df['city'].isin(['Beijing', 'Shanghai'])]}")
 print(f"\nquery方法:\n{df.query('age > 25 and score > 80')}")
 print(f"\n多条件筛选:\n{df[(df['age'] > 25) & (df['score'] > 80)]}")
 print(f"\n字符串包含:\n{df[df['name'].str.contains('a', case=False)]}")
```

**输出说明**：

- `isin()` 等价于 SQL 的 `WHERE col IN (...)`
- `query()` 使用字符串表达式，更简洁但性能略差
- 多条件需要用 `&`（与）、`|`（或），每个条件必须用括号包裹
- `str.contains()` 支持正则表达式的字符串筛选

---

## 5. 数据类型与转换

### 5.1 Pandas dtype 体系

| dtype         | 说明        | 内存占用      | 示例             |
| ------------- | ----------- | ------------- | ---------------- |
| `int64`       | 整数        | 8 字节        | 1, 2, 3          |
| `float64`     | 浮点数      | 8 字节        | 1.5, NaN         |
| `bool`        | 布尔        | 1 字节        | True, False      |
| `object`      | Python 对象 | 不定          | 字符串、混合类型 |
| `category`    | 分类        | 远小于 object | 有限个离散值     |
| `datetime64`  | 日期时间    | 8 字节        | 2024-01-01       |
| `timedelta64` | 时间差      | 8 字节        | 3 days           |

> **为什么 `object` 类型是性能杀手？** `object` 类型存储的是 Python 对象的引用，无法利用 NumPy 的向量化运算。将 `object` 列转换为合适的类型（如 `category` 或数值类型）可以大幅提升性能和降低内存占用。

### 5.2 类型转换

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'price': ['10.5', '20.0', 'invalid', '30.5'],
  'date': ['2024-01-01', '2024-02-15', '2024-03-30', '2024-04-10'],
  'status': ['active', 'inactive', 'active', 'active']
 }
 df['price_num'] = pd.to_numeric(df['price'], errors='coerce')
 print(f"to_numeric (errors='coerce'):\n{df['price', 'price_num']('price', 'price_num')}")
 df['date_dt'] = pd.to_datetime(df['date'], format='%Y-%m-%d')
 print(f"\nto_datetime:\n{df['date', 'date_dt']('date', 'date_dt')}")
 print(f"date_dt dtype: {df['date_dt'].dtype}")
 df['status_cat'] = df['status'].astype('category')
 print(f"\nastype('category'):\n{df['status_cat']}")
 print(f"类别: {df['status_cat'].cat.categories.tolist()}")
 print(f"内存对比: object={df['status'].memory_usage(deep=True)}B, category={df['status_cat'].memory_usage(deep=True)}B")
```

**输出说明**：

- `pd.to_numeric` 将字符串转数值，`errors='coerce'` 将无法转换的值设为 NaN
- `pd.to_datetime` 将字符串转日期，`format` 参数指定格式
- `astype('category')` 将低基数字符串列转为分类类型，大幅减少内存占用

### 5.3 类型优化实践

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'id': range(100000),
  'small_int': np.random.randint(0, 100, 100000),
  'flag': np.random.choice([True, False], 100000),
  'category_col': np.random.choice(['A', 'B', 'C'], 100000)
 }
 print(f"优化前内存使用:")
 print(df.memory_usage(deep=True))
 print(f"总计: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
 df['small_int'] = df['small_int'].astype('int8')
 df['category_col'] = df['category_col'].astype('category')
 print(f"\n优化后内存使用:")
 print(df.memory_usage(deep=True))
 print(f"总计: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
```

## **输出说明**：将 `int64` 降级为 `int8`（范围 0-100 足够），将 `object` 转为 `category`，内存占用可减少 80% 以上。在处理大数据集时，这种优化至关重要。

## 6. 数据清洗概览

> 详细内容见 [data-cleaning.md](data-cleaning.md)，此处仅列出核心操作速查。

### 6.1 缺失值检测与处理

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'A': [1, np.nan, 3, np.nan, 5],
  'B': [10, 20, np.nan, 40, 50],
  'C': ['x', 'y', np.nan, 'z', 'w']
 }
 print(f"缺失值统计:\n{df.isna().sum()}")
 print(f"\n缺失率:\n{df.isna().mean()}")
 df_fill = df.fillna({'A': df['A'].median(), 'B': 0, 'C': 'unknown'})
 print(f"\n按列填充:\n{df_fill}")
 df_drop = df.dropna(subset=['A'])
 print(f"\n删除A列缺失行:\n{df_drop}")
 df_ffill = df.fillna(method='ffill')
 print(f"\n前向填充:\n{df_ffill}")
```

**输出说明**：

- `isna()` 返回布尔 DataFrame，`sum()` 统计每列缺失数
- `fillna()` 支持按列指定不同填充值
- `dropna(subset=...)` 只根据指定列判断是否删除
- `method='ffill'` 用前一个有效值填充

### 6.2 重复值处理

```python
 import pandas as pd
 df = pd.DataFrame({
  'email': ['a@test.com', 'b@test.com', 'a@test.com', 'c@test.com'],
  'name': ['Alice', 'Bob', 'Alice2', 'Charlie'],
  'score': [85, 92, 90, 78]
 }
 print(f"重复标记:\n{df.duplicated(subset=['email'])}")
 print(f"\n删除重复(保留最后):\n{df.drop_duplicates(subset=['email'], keep='last')}")
```

## **输出说明**：`duplicated` 标记重复行，`drop_duplicates` 删除重复行。`subset` 指定判断重复的列，`keep` 决定保留哪一条。

## 7. 分组与聚合

### 7.1 groupby 机制

`groupby` 遵循 split-apply-combine 三步模式：

1. **Split**：按分组键将数据拆分为多个组
2. **Apply**：对每个组独立应用聚合函数
3. **Combine**：将结果合并为新的 DataFrame
   > **为什么理解 split-apply-combine 很重要？** 因为它解释了 groupby 的惰性求值——调用 `groupby` 本身不做任何计算，只是创建了一个分组对象。只有在调用聚合函数时才真正执行计算。这种设计允许链式操作和优化。

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'department': ['Sales', 'Sales', 'Engineering', 'Engineering', 'Marketing', 'Marketing'],
  'level': ['Junior', 'Senior', 'Junior', 'Senior', 'Junior', 'Senior'],
  'salary': [5000, 8000, 6000, 10000, 4500, 7500],
  'experience': [1, 5, 2, 8, 1, 6]
 }
 grouped = df.groupby('department')
 print(f"分组对象: {type(grouped)}")
 print(f"分组键: {grouped.groups.keys()}")
 print(f"\n单列聚合:\n{grouped['salary'].mean()}")
 print(f"\n多列多函数聚合:\n{grouped.agg({'salary': ['mean', 'std', 'count'], 'experience': ['mean', 'max']})}")
```

**输出说明**：

- `groupby()` 返回 DataFrameGroupBy 对象，是惰性的
- 选择单列后聚合返回 Series
- `agg()` 支持对每列应用不同的聚合函数

### 7.2 命名聚合与 as_index

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'department': ['Sales', 'Sales', 'Engineering', 'Engineering', 'Marketing'],
  'salary': [5000, 8000, 6000, 10000, 4500]
 }
 result = df.groupby('department').agg(
  avg_salary=('salary', 'mean'),
  max_salary=('salary', 'max'),
  count=('salary', 'count')
 )
 print(f"命名聚合:\n{result}")
 result2 = df.groupby('department', as_index=False).agg(
  avg_salary=('salary', 'mean')
 )
 print(f"\nas_index=False:\n{result2}")
```

**输出说明**：

- 命名聚合语法 `agg(name=(column, func))` 避免了多级列名
- `as_index=False` 将分组键保留为普通列而非索引，便于后续处理

### 7.3 transform 与 apply

```python
 import pandas as pd
 import numpy as np
 df = pd.DataFrame({
  'department': ['Sales', 'Sales', 'Engineering', 'Engineering', 'Marketing'],
  'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
  'salary': [5000, 8000, 6000, 10000, 4500]
 }
 df['dept_avg'] = df.groupby('department')['salary'].transform('mean')
 df['salary_diff'] = df['salary'] - df['dept_avg']
 print(f"transform(保持原形状):\n{df}")
 def top_earner(group):
  return group.loc[group['salary'].idxmax()]
 result = df.groupby('department').apply(top_earner, include_groups=False)
 print(f"\napply(灵活操作):\n{result['name', 'salary']('name', 'salary')}")
```

**输出说明**：

- `transform` 返回与原 DataFrame 相同形状的结果，每行的值是其所属组的聚合值
- `apply` 可以返回任意形状的结果，最灵活但最慢
- `transform` 适合添加组级统计列，`apply` 适合复杂的组级操作
  > **transform vs apply 的选择原则**：能用 `transform`/`agg` 解决的就不要用 `apply`。`apply` 是最后的手段，因为它无法利用 Pandas 的内部优化。

---

## 8. 合并与拼接

### 8.1 merge 数据库风格连接

```python
 import pandas as pd
 df_orders = pd.DataFrame({
  'order_id': [1, 2, 3, 4],
  'user_id': [101, 102, 101, 103],
  'amount': [250, 180, 320, 150]
 }
 df_users = pd.DataFrame({
  'user_id': [101, 102, 104],
  'name': ['Alice', 'Bob', 'Diana'],
  'city': ['Beijing', 'Shanghai', 'Shenzhen']
 }
 inner = pd.merge(df_orders, df_users, on='user_id', how='inner')
 print(f"inner join:\n{inner}")
 left = pd.merge(df_orders, df_users, on='user_id', how='left')
 print(f"\nleft join:\n{left}")
 right = pd.merge(df_orders, df_users, on='user_id', how='right')
 print(f"\nright join:\n{right}")
 outer = pd.merge(df_orders, df_users, on='user_id', how='outer')
 print(f"\nouter join:\n{outer}")
```

**输出说明**：

- `inner`：只保留两表都有的 user_id（101, 102），103 和 104 被排除
- `left`：保留左表所有行，右表无匹配时填 NaN（103 号用户无信息）
- `right`：保留右表所有行，左表无匹配时填 NaN（104 号用户无订单）
- `outer`：保留所有行，无匹配处填 NaN
  > **与 SQL 的对应关系**：`how='inner'` 对应 `INNER JOIN`，`how='left'` 对应 `LEFT JOIN`，以此类推。详见 [MySQL](mysql/overview) 中的 JOIN 语法。

### 8.2 多键合并与后缀处理

```python
 import pandas as pd
 df1 = pd.DataFrame({
  'key1': ['A', 'A', 'B'],
  'key2': ['X', 'Y', 'X'],
  'value': [1, 2, 3]
 }
 df2 = pd.DataFrame({
  'key1': ['A', 'B', 'B'],
  'key2': ['X', 'X', 'Y'],
  'value': [10, 20, 30]
 }
 result = pd.merge(df1, df2, on=['key1', 'key2'], how='outer', suffixes=('_left', '_right'))
 print(f"多键合并:\n{result}")
```

**输出说明**：当两表有同名列（非合并键）时，`suffixes` 参数指定后缀以区分。

### 8.3 concat 轴向拼接

```python
 import pandas as pd
 df1 = pd.DataFrame({'A': [1, 2], 'B': [3, 4]})
 df2 = pd.DataFrame({'A': [5, 6], 'B': [7, 8]})
 df3 = pd.DataFrame({'C': [9, 10], 'D': [11, 12]})
 vertical = pd.concat([df1, df2], axis=0, ignore_index=True)
 print(f"垂直拼接:\n{vertical}")
 horizontal = pd.concat([df1, df3], axis=1)
 print(f"\n水平拼接:\n{horizontal}")
 result = pd.concat([df1, df3], axis=0)
 print(f"\n列不一致时:\n{result}")
```

**输出说明**：

- `axis=0` 垂直拼接（追加行），`axis=1` 水平拼接（追加列）
- `ignore_index=` 重新生成索引
- 列不一致时，缺失列自动填 NaN

---

## 9. 重塑与透视

### 9.1 melt 宽表转长表

```python
 import pandas as pd
 df_wide = pd.DataFrame({
  'date': ['2024-01', '2024-02', '2024-03'],
  'Beijing': [100, 120, 110],
  'Shanghai': [90, 95, 105],
  'Guangzhou': [80, 85, 90]
 }
 df_long = df_wide.melt(id_vars=['date'], var_name='city', value_name='sales')
 print(f"长表:\n{df_long}")
```

**输出说明**：`melt` 将多列"融化"为行。`id_vars` 指定保留的标识列，其余列变为 `var_name` 和 `value_name` 两列。这是 tidy data 格式转换的核心操作。

> **为什么 tidy data 格式重要？** Hadley Wickham 提出的 tidy data 原则：每列一个变量，每行一个观测。Seaborn 和大多数统计工具都假设数据是 tidy 格式。如果你的数据是"宽表"（每个城市一列），需要先 melt 为"长表"才能用 Seaborn 绘图。

### 9.2 pivot_table 长表转宽表

```python
 import pandas as pd
 df_long = pd.DataFrame({
  'date': ['2024-01']*3 + ['2024-02']*3 + ['2024-03']*3,
  'city': ['Beijing', 'Shanghai', 'Guangzhou'] * 3,
  'sales': [100, 90, 80, 120, 95, 85, 110, 105, 90]
 }
 pivot = df_long.pivot_table(index='date', columns='city', values='sales', aggfunc='sum')
 print(f"透视表:\n{pivot}")
 pivot_mean = df_long.pivot_table(index='city', values='sales', aggfunc=['mean', 'sum', 'count'])
 print(f"\n多聚合函数:\n{pivot_mean}")
```

**输出说明**：

- `pivot_table` 是 Excel 透视表的 Pandas 实现
- `aggfunc` 默认为 `mean`，可指定 `sum`、`count` 或自定义函数
- 支持多聚合函数，结果为多级列名

### 9.3 stack/unstack

```python
 import pandas as pd
 df = pd.DataFrame({
  'Q1': [100, 200, 150],
  'Q2': [120, 210, 160],
  'Q3': [110, 190, 170]
 }
 df.index.name = 'city'
 stacked = df.stack()
 print(f"stack(列转行):\n{stacked}")
 unstacked = stacked.unstack()
 print(f"\nunstack(行转列):\n{unstacked}")
```

## **输出说明**：`stack` 将列索引转为行索引（宽变长），`unstack` 将行索引转为列索引（长变宽）。它们是 `melt`/`pivot` 的索引操作版本。

## 10. 时间序列处理

### 10.1 日期解析与 DatetimeIndex

```python
 import pandas as pd
 import numpy as np
 dates = pd.date_range('2024-01-01', periods=10, freq='D')
 df = pd.DataFrame({
  'date': dates,
  'value': np.random.default_rng(42).normal(100, 10, 10)
 }
 df['date'] = pd.to_datetime(df['date'])
 df = df.set_index('date')
 print(f"DatetimeIndex:\n{df}")
 print(f"\n索引属性:")
 print(f" year: {df.index.year.tolist()}")
 print(f" month: {df.index.month.tolist()}")
 print(f" dayofweek: {df.index.dayofweek.tolist()}")
```

**输出说明**：`pd.to_datetime` 将字符串转为 datetime64 类型。设置为索引后，可以利用 `.year`、`.month`、`.dayofweek` 等属性快速提取时间特征。

### 10.2 重采样（Resample）

```python
 import pandas as pd
 import numpy as np
 dates = pd.date_range('2024-01-01', periods=90, freq='D')
 df = pd.DataFrame({
  'value': np.random.default_rng(42).normal(100, 15, 90)
 }
 monthly = df.resample('M').agg({'value': ['mean', 'std', 'count']})
 print(f"月度重采样:\n{monthly}")
 weekly = df.resample('W').mean()
 print(f"\n周度重采样:\n{weekly.head()}")
```

**输出说明**：

- `resample('M')` 按月重采样，`'W'` 按周，`'Q'` 按季
- 重采样后需要跟聚合函数（`mean`、`sum`、`ohlc` 等）
- 类似 groupby，但按时间区间分组
  > **resample 频率速查**：`D`=日，`W`=周，`M`=月末，`MS`=月初，`Q`=季末，`Y`=年末，`H`=小时，`T`=分钟

### 10.3 滚动窗口与偏移

```python
 import pandas as pd
 import numpy as np
 dates = pd.date_range('2024-01-01', periods=30, freq='D')
 df = pd.DataFrame({
  'value': np.random.default_rng(42).normal(100, 10, 30)
 }
 df['rolling_7d'] = df['value'].rolling(window=7).mean()
 df['shift_1'] = df['value'].shift(1)
 df['diff_1'] = df['value'].diff(1)
 df['pct_change'] = df['value'].pct_change()
 print(f"滚动与偏移:\n{df.head(10)}")
```

**输出说明**：

- `rolling(window=7).mean()` 计算 7 日滚动均值，前 6 行为 NaN
- `shift(1)` 将数据下移一行，用于计算同比/环比
- `diff(1)` 计算与前一行的差值
- `pct_change()` 计算环比变化率

---

## 11. IO 操作

### 11.1 常用读写接口

| 格式    | 读取                | 写入              | 说明                 |
| ------- | ------------------- | ----------------- | -------------------- |
| CSV     | `pd.read_csv()`     | `df.to_csv()`     | 最通用，纯文本       |
| Excel   | `pd.read_excel()`   | `df.to_excel()`   | 需安装 openpyxl      |
| JSON    | `pd.read_json()`    | `df.to_json()`    | API 数据常见格式     |
| SQL     | `pd.read_sql()`     | `df.to_sql()`     | 需要数据库连接       |
| Parquet | `pd.read_parquet()` | `df.to_parquet()` | 列式存储，大数据推荐 |
| Feather | `pd.read_feather()` | `df.to_feather()` | 极速读写             |

### 11.2 常用参数

```python
 import pandas as pd
 df = pd.read_csv(
  'data.csv',
  encoding='utf-8',
  parse_dates=['order_date', 'ship_date'],
  dtype={'user_id': 'int64', 'status': 'category'},
  na_values=['NA', 'N/A', 'null', ''],
  usecols=['order_id', 'user_id', 'order_date', 'amount', 'status'],
  nrows=10000
 )
 df.to_csv(
  'output.csv',
  index=False,
  encoding='utf-8-sig',
  float_format='%.2f'
 )
```

**输出说明**：

- `encoding`：中文数据常用 `utf-8`、`gbk`、`latin-1`
- `parse_dates`：自动将指定列转为 datetime
- `dtype`：指定列类型，避免自动推断错误
- `na_values`：自定义缺失值标记
- `usecols`：只读取需要的列，节省内存
- `nrows`：只读取前 N 行，用于快速预览

### 11.3 大文件处理

```python
 import pandas as pd
 chunk_iter = pd.read_csv('large_data.csv', chunksize=50000)
 results = []
 for chunk in chunk_iter:
  filtered = chunk[chunk['amount'] > 100]
  results.append(filtered)
 df_result = pd.concat(results, ignore_index=True)
 print(f"分块处理后结果: {df_result.shape}")
```

**输出说明**：`chunksize` 参数将大文件分块读取，每次只加载一部分数据到内存。适合处理超过内存大小的文件。

> 跨模块参考：如果数据存储在数据库中，可以使用 [MySQL](mysql/overview) 技能在数据库端完成部分过滤和聚合，减少传输到 Python 的数据量。

---

## 12. 速查表

### 12.1 数据选择

| 操作       | 语法                                             |
| ---------- | ------------------------------------------------ |
| 选择列     | `df['col']` / `df['col1','col2']('col1','col2')` |
| 标签选择   | `df.loc[row_label, col_label]`                   |
| 位置选择   | `df.iloc[row_pos, col_pos]`                      |
| 布尔筛选   | `df[df['col'] > value]`                          |
| ISIN       | `df[df['col'].isin([v1,v2])]`                    |
| 字符串包含 | `df[df['col'].str.contains('pattern')]`          |
| Query      | `df.query('expr')`                               |

### 12.2 分组聚合

| 操作       | 语法                                           |
| ---------- | ---------------------------------------------- |
| 单列单函数 | `df.groupby('key')['col'].mean()`              |
| 多函数     | `df.groupby('key')['col'].agg(['mean','std'])` |
| 命名聚合   | `df.groupby('key').agg(name=('col','func'))`   |
| transform  | `df.groupby('key')['col'].transform('mean')`   |
| apply      | `df.groupby('key').apply(func)`                |

### 12.3 合并

| 操作     | 语法                                     | SQL 对应   |
| -------- | ---------------------------------------- | ---------- |
| 内连接   | `pd.merge(df1,df2,on='key',how='inner')` | INNER JOIN |
| 左连接   | `pd.merge(df1,df2,on='key',how='left')`  | LEFT JOIN  |
| 垂直拼接 | `pd.concat([df1,df2],axis=0)`            | UNION ALL  |
| 水平拼接 | `pd.concat([df1,df2],axis=1)`            | -          |

### 12.4 重塑

| 操作    | 语法                                     | 方向           |
| ------- | ---------------------------------------- | -------------- |
| 宽变长  | `df.melt(id_vars, var_name, value_name)` | 列转行         |
| 长变宽  | `df.pivot_table(index, columns, values)` | 行转列         |
| stack   | `df.stack()`                             | 列索引转行索引 |
| unstack | `df.unstack()`                           | 行索引转列索引 |

---

## 13. 延伸阅读

- Pandas 官方文档：https://pandas.pydata.org/docs/
- Python for Data Analysis 第 3 版 (Wes McKinney)
- Effective Pandas (Matt Harrison)
- Pandas Cookbook：https://pandas.pydata.org/pandas-docs/stable/user_guide/cookbook.html

### 跨模块关联

- [Python 数据结构](python/built-in-data-structures)
