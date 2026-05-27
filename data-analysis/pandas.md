# Pandas -- DataFrame/Series、数据清洗、合并重塑
 False
 False> @Version: v4.0.0
 False> @Author: fanquanpp
 False> @Category: Data Science / Pandas
 False> @Description: Pandas 核心数据结构与操作：Series/DataFrame 创建、索引筛选、分组聚合、合并拼接与重塑
 False
 False---
 False
 False## 目录
 False
 False- [1. Pandas 简介](#1-pandas-简介)
 False- [2. Series 基础](#2-series-基础)
 False- [3. DataFrame 基础](#3-dataframe-基础)
 False- [4. 索引与数据选择](#4-索引与数据选择)
 False- [5. 数据类型与转换](#5-数据类型与转换)
 False- [6. 数据清洗概览](#6-数据清洗概览)
 False- [7. 分组与聚合](#7-分组与聚合)
 False- [8. 合并与拼接](#8-合并与拼接)
 False- [9. 重塑与透视](#9-重塑与透视)
 False- [10. 时间序列处理](#10-时间序列处理)
 False- [11. IO 操作](#11-io-操作)
 False- [12. 速查表](#12-速查表)
 False- [13. 延伸阅读](#13-延伸阅读)
 False
 False---
 False
 False## 1. Pandas 简介
 False
 False### 1.1 为什么需要 Pandas
 False
 False如果说 NumPy 解决的是"数值计算"问题，那么 Pandas 解决的是"表格数据处理"问题。真实世界的数据分析面对的是：
 False
 False- 异构数据类型（同一表中包含数值、字符串、日期）
 False- 缺失值与不规则数据
 False- 需要类似 SQL 的分组、聚合、连接操作
 False- 时间序列的复杂处理需求
 False
 FalseNumPy 的 `ndarray` 要求所有元素同类型，无法直接处理这些问题。Pandas 在 NumPy 之上构建了 `Series` 和 `DataFrame` 两个数据结构，专门为表格数据分析设计。
 False
 False> **Pandas 与 SQL 的关系**：Pandas 的很多操作可以直接映射到 SQL 语句。理解这种映射有助于从 SQL 思维过渡到 Pandas 思维。详见 [[mysql/overview|MySQL]] 中的 SQL 基础。
 False
 False### 1.2 核心设计理念
 False
 FalsePandas 的设计灵感来自 R 语言的 data.frame，核心设计理念：
 False
 False- **标签对齐**：数据操作自动对齐索引，避免位置错位
 False- **缺失值处理**：NaN 是一等公民，所有操作都考虑缺失值
 False- **向量化操作**：避免显式循环，利用底层 NumPy 的性能
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 Trueprint(f"Pandas version: {pd.__version__}")
 True```

 False---
 False
 False## 2. Series 基础
 False
 False### 2.1 创建 Series
 False
 FalseSeries 是一维带标签的数组，由数据和索引两部分组成：
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Trues1 = pd.Series([10, 20, 30, 40, 50])
 Trueprint(f"默认索引:\n{s1}")
 True
 Trues2 = pd.Series([10, 20, 30], index=['a', 'b', 'c'])
 Trueprint(f"自定义索引:\n{s2}")
 True
 Trues3 = pd.Series({'apple': 3, 'banana': 5, 'cherry': 2})
 Trueprint(f"从字典创建:\n{s3}")
 True
 Trues4 = pd.Series(5, index=['a', 'b', 'c'])
 Trueprint(f"标量创建:\n{s4}")
 True```

 False**输出说明**：
 False- 不指定索引时自动生成 0,1,2,... 的整数索引
 False- 自定义索引可以是字符串或其他可哈希类型
 False- 从字典创建时，键成为索引，值成为数据
 False- 标量创建时，所有元素值相同
 False
 False### 2.2 Series 属性与方法
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Trues = pd.Series([10, 20, 30, 40, 50], index=['a', 'b', 'c', 'd', 'e'], name='scores')
 True
 Trueprint(f"values: {s.values}")
 Trueprint(f"index: {s.index}")
 Trueprint(f"dtype: {s.dtype}")
 Trueprint(f"name: {s.name}")
 Trueprint(f"shape: {s.shape}")
 Trueprint(f"size: {s.size}")
 True```

 False**输出说明**：
 False- `values` 返回底层的 NumPy 数组
 False- `index` 返回索引对象
 False- `dtype` 返回数据类型
 False- `name` 是 Series 的名称标识，在 DataFrame 中自动成为列名
 False
 False### 2.3 Series 向量化运算
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Trues = pd.Series([10, 20, 30, 40, 50], index=['a', 'b', 'c', 'd', 'e'])
 True
 Trueprint(f"乘以2:\n{s * 2}")
 Trueprint(f"加100:\n{s + 100}")
 Trueprint(f"布尔筛选:\n{s[s > 25]}")
 Trueprint(f"数学函数:\n{np.sqrt(s)}")
 True
 Trues2 = pd.Series([1, 2, 3], index=['a', 'c', 'e'])
 Trueprint(f"索引对齐运算:\n{s + s2}")
 True```

 False**输出说明**：Series 运算自动按索引对齐。当两个 Series 索引不完全匹配时，未对齐的位置结果为 NaN。这是 Pandas 的核心特性——标签对齐，避免了位置错位的常见 Bug。
 False
 False> **为什么索引对齐很重要？** 在 SQL 中，JOIN 操作需要显式指定连接键。Pandas 的索引对齐相当于自动 JOIN，减少了出错的可能。但也意味着你需要时刻注意索引是否正确设置。
 False
 False---
 False
 False## 3. DataFrame 基础
 False
 False### 3.1 创建 DataFrame
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf1 = pd.DataFrame({
 True 'name': ['Alice', 'Bob', 'Charlie', 'Diana'],
 True 'age': [25, 30, 35, 28],
 True 'score': [85.5, 92.0, 78.5, 95.0],
 True 'passed': [True, True, False, True]
 True})
 Trueprint(f"从字典创建:\n{df1}")
 True
 Truedf2 = pd.DataFrame([
 True {'name': 'Alice', 'age': 25},
 True {'name': 'Bob', 'age': 30},
 True {'name': 'Charlie', 'age': 35}
 True])
 Trueprint(f"从字典列表创建:\n{df2}")
 True
 Truedf3 = pd.DataFrame(
 True np.random.default_rng(42).integers(0, 100, size=(3, 4)),
 True columns=['A', 'B', 'C', 'D'],
 True index=['row1', 'row2', 'row3']
 True)
 Trueprint(f"从NumPy数组创建:\n{df3}")
 True```

 False**输出说明**：
 False- 从字典创建时，键成为列名，值长度必须一致
 False- 从字典列表创建时，每个字典代表一行，缺失键自动填 NaN
 False- 从 NumPy 数组创建时，需要指定 columns 和 index
 False
 False### 3.2 核心属性与信息查看
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
 True 'age': [25, 30, 35, 28, None],
 True 'score': [85.5, 92.0, 78.5, 95.0, 88.0],
 True 'city': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Beijing']
 True})
 True
 Trueprint(f"shape: {df.shape}")
 Trueprint(f"columns: {df.columns.tolist()}")
 Trueprint(f"index: {df.index.tolist()}")
 Trueprint(f"dtypes:\n{df.dtypes}")
 Trueprint(f"\ninfo():")
 Truedf.info()
 Trueprint(f"\ndescribe():\n{df.describe()}")
 Trueprint(f"\ndescribe(include='all'):\n{df.describe(include='all')}")
 True```

 False**输出说明**：
 False- `shape` 返回 (行数, 列数)
 False- `dtypes` 显示每列的数据类型，`None` 值导致 age 列变为 float64
 False- `info()` 显示非空值数量和内存使用
 False- `describe()` 默认只统计数值列，`include='all'` 包含所有列
 False
 False### 3.3 行列操作
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'name': ['Alice', 'Bob', 'Charlie'],
 True 'age': [25, 30, 35],
 True 'score': [85, 92, 78]
 True})
 True
 Truedf['grade'] = ['B', 'A', 'C']
 Trueprint(f"添加列:\n{df}")
 True
 Truedf.insert(1, 'gender', ['F', 'M', 'M'])
 Trueprint(f"插入列到指定位置:\n{df}")
 True
 Truedf_dropped = df.drop(columns=['grade'])
 Trueprint(f"删除列:\n{df_dropped}")
 True
 Truedf_row = df.drop(index=[0])
 Trueprint(f"删除行:\n{df_row}")
 True```

 False**输出说明**：
 False- `df['new_col'] = ...` 在末尾添加新列
 False- `df.insert(pos, name, values)` 在指定位置插入列
 False- `df.drop()` 返回新 DataFrame，不修改原数据（除非 `inplace=True`）
 False
 False---
 False
 False## 4. 索引与数据选择
 False
 False### 4.1 选择方法对比
 False
 FalsePandas 提供了多种数据选择方式，初学者容易混淆。核心区分：
 False
 False| 方法 | 基于标签 | 基于位置 | 返回类型 |
 False|------|----------|----------|----------|
 False| `df['col']` | 列名 | - | Series |
 False| `df[['col1','col2']]` | 列名列表 | - | DataFrame |
 False| `df.loc[row, col]` | 标签 | - | 灵活 |
 False| `df.iloc[row, col]` | - | 整数位置 | 灵活 |
 False| `df.at[row, col]` | 标签 | - | 标量 |
 False| `df.iat[row, col]` | - | 整数位置 | 标量 |
 False
 False> **为什么推荐用 `.loc` 和 `.iloc`？** `df['col']` 和 `df[condition]` 的行为不一致——前者选择列，后者选择行。这种不一致是 Pandas 设计的历史遗留问题。使用 `.loc` 和 `.iloc` 可以明确表达意图，减少歧义。
 False
 False### 4.2 loc 标签选择
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'name': ['Alice', 'Bob', 'Charlie', 'Diana'],
 True 'age': [25, 30, 35, 28],
 True 'score': [85, 92, 78, 95],
 True 'city': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen']
 True}, index=['a', 'b', 'c', 'd'])
 True
 Trueprint(f"选择行:\n{df.loc['a']}")
 Trueprint(f"\n选择多行:\n{df.loc[['a', 'c']]}")
 Trueprint(f"\n行切片:\n{df.loc['a':'c']}")
 Trueprint(f"\n行列同时选择:\n{df.loc[['a', 'c'], ['name', 'score']]}")
 Trueprint(f"\n布尔选择:\n{df.loc[df['age'] > 28, ['name', 'score']]}")
 True```

 False**输出说明**：
 False- `loc` 使用标签索引，切片包含端点（与 Python 列表切片不同）
 False- `loc` 支持布尔数组作为行选择器
 False- `loc[row, col]` 可以同时选择行和列
 False
 False### 4.3 iloc 位置选择
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'name': ['Alice', 'Bob', 'Charlie', 'Diana'],
 True 'age': [25, 30, 35, 28],
 True 'score': [85, 92, 78, 95]
 True})
 True
 Trueprint(f"第一行:\n{df.iloc[0]}")
 Trueprint(f"\n前两行，前两列:\n{df.iloc[:2, :2]}")
 Trueprint(f"\n间隔选取:\n{df.iloc[[0, 2], [0, 2]]}")
 Trueprint(f"\n最后一行:\n{df.iloc[-1]}")
 True```

 False**输出说明**：
 False- `iloc` 使用整数位置，切片不包含端点（与 Python 列表切片一致）
 False- 支持负数索引
 False- 适合在不知道列名但知道位置的场景下使用
 False
 False### 4.4 高级筛选
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
 True 'age': [25, 30, 35, 28, 22],
 True 'score': [85, 92, 78, 95, 88],
 True 'city': ['Beijing', 'Shanghai', 'Beijing', 'Shenzhen', 'Shanghai']
 True})
 True
 Trueprint(f"isin筛选:\n{df[df['city'].isin(['Beijing', 'Shanghai'])]}")
 True
 Trueprint(f"\nquery方法:\n{df.query('age > 25 and score > 80')}")
 True
 Trueprint(f"\n多条件筛选:\n{df[(df['age'] > 25) & (df['score'] > 80)]}")
 True
 Trueprint(f"\n字符串包含:\n{df[df['name'].str.contains('a', case=False)]}")
 True```

 False**输出说明**：
 False- `isin()` 等价于 SQL 的 `WHERE col IN (...)`
 False- `query()` 使用字符串表达式，更简洁但性能略差
 False- 多条件需要用 `&`（与）、`|`（或），每个条件必须用括号包裹
 False- `str.contains()` 支持正则表达式的字符串筛选
 False
 False---
 False
 False## 5. 数据类型与转换
 False
 False### 5.1 Pandas dtype 体系
 False
 False| dtype | 说明 | 内存占用 | 示例 |
 False|-------|------|----------|------|
 False| `int64` | 整数 | 8 字节 | 1, 2, 3 |
 False| `float64` | 浮点数 | 8 字节 | 1.5, NaN |
 False| `bool` | 布尔 | 1 字节 | True, False |
 False| `object` | Python 对象 | 不定 | 字符串、混合类型 |
 False| `category` | 分类 | 远小于 object | 有限个离散值 |
 False| `datetime64` | 日期时间 | 8 字节 | 2024-01-01 |
 False| `timedelta64` | 时间差 | 8 字节 | 3 days |
 False
 False> **为什么 `object` 类型是性能杀手？** `object` 类型存储的是 Python 对象的引用，无法利用 NumPy 的向量化运算。将 `object` 列转换为合适的类型（如 `category` 或数值类型）可以大幅提升性能和降低内存占用。
 False
 False### 5.2 类型转换
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'price': ['10.5', '20.0', 'invalid', '30.5'],
 True 'date': ['2024-01-01', '2024-02-15', '2024-03-30', '2024-04-10'],
 True 'status': ['active', 'inactive', 'active', 'active']
 True})
 True
 Truedf['price_num'] = pd.to_numeric(df['price'], errors='coerce')
 Trueprint(f"to_numeric (errors='coerce'):\n{df[['price', 'price_num']]}")
 True
 Truedf['date_dt'] = pd.to_datetime(df['date'], format='%Y-%m-%d')
 Trueprint(f"\nto_datetime:\n{df[['date', 'date_dt']]}")
 Trueprint(f"date_dt dtype: {df['date_dt'].dtype}")
 True
 Truedf['status_cat'] = df['status'].astype('category')
 Trueprint(f"\nastype('category'):\n{df['status_cat']}")
 Trueprint(f"类别: {df['status_cat'].cat.categories.tolist()}")
 Trueprint(f"内存对比: object={df['status'].memory_usage(deep=True)}B, category={df['status_cat'].memory_usage(deep=True)}B")
 True```

 False**输出说明**：
 False- `pd.to_numeric` 将字符串转数值，`errors='coerce'` 将无法转换的值设为 NaN
 False- `pd.to_datetime` 将字符串转日期，`format` 参数指定格式
 False- `astype('category')` 将低基数字符串列转为分类类型，大幅减少内存占用
 False
 False### 5.3 类型优化实践
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'id': range(100000),
 True 'small_int': np.random.randint(0, 100, 100000),
 True 'flag': np.random.choice([True, False], 100000),
 True 'category_col': np.random.choice(['A', 'B', 'C'], 100000)
 True})
 True
 Trueprint(f"优化前内存使用:")
 Trueprint(df.memory_usage(deep=True))
 Trueprint(f"总计: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
 True
 Truedf['small_int'] = df['small_int'].astype('int8')
 Truedf['category_col'] = df['category_col'].astype('category')
 True
 Trueprint(f"\n优化后内存使用:")
 Trueprint(df.memory_usage(deep=True))
 Trueprint(f"总计: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
 True```

 False**输出说明**：将 `int64` 降级为 `int8`（范围 0-100 足够），将 `object` 转为 `category`，内存占用可减少 80% 以上。在处理大数据集时，这种优化至关重要。
 False
 False---
 False
 False## 6. 数据清洗概览
 False
 False> 详细内容见 [data-cleaning.md](data-cleaning.md)，此处仅列出核心操作速查。
 False
 False### 6.1 缺失值检测与处理
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'A': [1, np.nan, 3, np.nan, 5],
 True 'B': [10, 20, np.nan, 40, 50],
 True 'C': ['x', 'y', np.nan, 'z', 'w']
 True})
 True
 Trueprint(f"缺失值统计:\n{df.isna().sum()}")
 Trueprint(f"\n缺失率:\n{df.isna().mean()}")
 True
 Truedf_fill = df.fillna({'A': df['A'].median(), 'B': 0, 'C': 'unknown'})
 Trueprint(f"\n按列填充:\n{df_fill}")
 True
 Truedf_drop = df.dropna(subset=['A'])
 Trueprint(f"\n删除A列缺失行:\n{df_drop}")
 True
 Truedf_ffill = df.fillna(method='ffill')
 Trueprint(f"\n前向填充:\n{df_ffill}")
 True```

 False**输出说明**：
 False- `isna()` 返回布尔 DataFrame，`sum()` 统计每列缺失数
 False- `fillna()` 支持按列指定不同填充值
 False- `dropna(subset=...)` 只根据指定列判断是否删除
 False- `method='ffill'` 用前一个有效值填充
 False
 False### 6.2 重复值处理
 False
```python
 Trueimport pandas as pd
 True
 Truedf = pd.DataFrame({
 True 'email': ['a@test.com', 'b@test.com', 'a@test.com', 'c@test.com'],
 True 'name': ['Alice', 'Bob', 'Alice2', 'Charlie'],
 True 'score': [85, 92, 90, 78]
 True})
 True
 Trueprint(f"重复标记:\n{df.duplicated(subset=['email'])}")
 Trueprint(f"\n删除重复(保留最后):\n{df.drop_duplicates(subset=['email'], keep='last')}")
 True```

 False**输出说明**：`duplicated` 标记重复行，`drop_duplicates` 删除重复行。`subset` 指定判断重复的列，`keep` 决定保留哪一条。
 False
 False---
 False
 False## 7. 分组与聚合
 False
 False### 7.1 groupby 机制
 False
 False`groupby` 遵循 split-apply-combine 三步模式：
 False
 False1. **Split**：按分组键将数据拆分为多个组
 False2. **Apply**：对每个组独立应用聚合函数
 False3. **Combine**：将结果合并为新的 DataFrame
 False
 False> **为什么理解 split-apply-combine 很重要？** 因为它解释了 groupby 的惰性求值——调用 `groupby` 本身不做任何计算，只是创建了一个分组对象。只有在调用聚合函数时才真正执行计算。这种设计允许链式操作和优化。
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'department': ['Sales', 'Sales', 'Engineering', 'Engineering', 'Marketing', 'Marketing'],
 True 'level': ['Junior', 'Senior', 'Junior', 'Senior', 'Junior', 'Senior'],
 True 'salary': [5000, 8000, 6000, 10000, 4500, 7500],
 True 'experience': [1, 5, 2, 8, 1, 6]
 True})
 True
 Truegrouped = df.groupby('department')
 Trueprint(f"分组对象: {type(grouped)}")
 Trueprint(f"分组键: {grouped.groups.keys()}")
 True
 Trueprint(f"\n单列聚合:\n{grouped['salary'].mean()}")
 True
 Trueprint(f"\n多列多函数聚合:\n{grouped.agg({'salary': ['mean', 'std', 'count'], 'experience': ['mean', 'max']})}")
 True```

 False**输出说明**：
 False- `groupby()` 返回 DataFrameGroupBy 对象，是惰性的
 False- 选择单列后聚合返回 Series
 False- `agg()` 支持对每列应用不同的聚合函数
 False
 False### 7.2 命名聚合与 as_index
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'department': ['Sales', 'Sales', 'Engineering', 'Engineering', 'Marketing'],
 True 'salary': [5000, 8000, 6000, 10000, 4500]
 True})
 True
 Trueresult = df.groupby('department').agg(
 True avg_salary=('salary', 'mean'),
 True max_salary=('salary', 'max'),
 True count=('salary', 'count')
 True)
 Trueprint(f"命名聚合:\n{result}")
 True
 Trueresult2 = df.groupby('department', as_index=False).agg(
 True avg_salary=('salary', 'mean')
 True)
 Trueprint(f"\nas_index=False:\n{result2}")
 True```

 False**输出说明**：
 False- 命名聚合语法 `agg(name=(column, func))` 避免了多级列名
 False- `as_index=False` 将分组键保留为普通列而非索引，便于后续处理
 False
 False### 7.3 transform 与 apply
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedf = pd.DataFrame({
 True 'department': ['Sales', 'Sales', 'Engineering', 'Engineering', 'Marketing'],
 True 'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
 True 'salary': [5000, 8000, 6000, 10000, 4500]
 True})
 True
 Truedf['dept_avg'] = df.groupby('department')['salary'].transform('mean')
 Truedf['salary_diff'] = df['salary'] - df['dept_avg']
 Trueprint(f"transform(保持原形状):\n{df}")
 True
 Truedef top_earner(group):
 True return group.loc[group['salary'].idxmax()]
 True
 Trueresult = df.groupby('department').apply(top_earner, include_groups=False)
 Trueprint(f"\napply(灵活操作):\n{result[['name', 'salary']]}")
 True```

 False**输出说明**：
 False- `transform` 返回与原 DataFrame 相同形状的结果，每行的值是其所属组的聚合值
 False- `apply` 可以返回任意形状的结果，最灵活但最慢
 False- `transform` 适合添加组级统计列，`apply` 适合复杂的组级操作
 False
 False> **transform vs apply 的选择原则**：能用 `transform`/`agg` 解决的就不要用 `apply`。`apply` 是最后的手段，因为它无法利用 Pandas 的内部优化。
 False
 False---
 False
 False## 8. 合并与拼接
 False
 False### 8.1 merge 数据库风格连接
 False
```python
 Trueimport pandas as pd
 True
 Truedf_orders = pd.DataFrame({
 True 'order_id': [1, 2, 3, 4],
 True 'user_id': [101, 102, 101, 103],
 True 'amount': [250, 180, 320, 150]
 True})
 True
 Truedf_users = pd.DataFrame({
 True 'user_id': [101, 102, 104],
 True 'name': ['Alice', 'Bob', 'Diana'],
 True 'city': ['Beijing', 'Shanghai', 'Shenzhen']
 True})
 True
 Trueinner = pd.merge(df_orders, df_users, on='user_id', how='inner')
 Trueprint(f"inner join:\n{inner}")
 True
 Trueleft = pd.merge(df_orders, df_users, on='user_id', how='left')
 Trueprint(f"\nleft join:\n{left}")
 True
 Trueright = pd.merge(df_orders, df_users, on='user_id', how='right')
 Trueprint(f"\nright join:\n{right}")
 True
 Trueouter = pd.merge(df_orders, df_users, on='user_id', how='outer')
 Trueprint(f"\nouter join:\n{outer}")
 True```

 False**输出说明**：
 False- `inner`：只保留两表都有的 user_id（101, 102），103 和 104 被排除
 False- `left`：保留左表所有行，右表无匹配时填 NaN（103 号用户无信息）
 False- `right`：保留右表所有行，左表无匹配时填 NaN（104 号用户无订单）
 False- `outer`：保留所有行，无匹配处填 NaN
 False
 False> **与 SQL 的对应关系**：`how='inner'` 对应 `INNER JOIN`，`how='left'` 对应 `LEFT JOIN`，以此类推。详见 [[mysql/overview|MySQL]] 中的 JOIN 语法。
 False
 False### 8.2 多键合并与后缀处理
 False
```python
 Trueimport pandas as pd
 True
 Truedf1 = pd.DataFrame({
 True 'key1': ['A', 'A', 'B'],
 True 'key2': ['X', 'Y', 'X'],
 True 'value': [1, 2, 3]
 True})
 True
 Truedf2 = pd.DataFrame({
 True 'key1': ['A', 'B', 'B'],
 True 'key2': ['X', 'X', 'Y'],
 True 'value': [10, 20, 30]
 True})
 True
 Trueresult = pd.merge(df1, df2, on=['key1', 'key2'], how='outer', suffixes=('_left', '_right'))
 Trueprint(f"多键合并:\n{result}")
 True```

 False**输出说明**：当两表有同名列（非合并键）时，`suffixes` 参数指定后缀以区分。
 False
 False### 8.3 concat 轴向拼接
 False
```python
 Trueimport pandas as pd
 True
 Truedf1 = pd.DataFrame({'A': [1, 2], 'B': [3, 4]})
 Truedf2 = pd.DataFrame({'A': [5, 6], 'B': [7, 8]})
 Truedf3 = pd.DataFrame({'C': [9, 10], 'D': [11, 12]})
 True
 Truevertical = pd.concat([df1, df2], axis=0, ignore_index=True)
 Trueprint(f"垂直拼接:\n{vertical}")
 True
 Truehorizontal = pd.concat([df1, df3], axis=1)
 Trueprint(f"\n水平拼接:\n{horizontal}")
 True
 Trueresult = pd.concat([df1, df3], axis=0)
 Trueprint(f"\n列不一致时:\n{result}")
 True```

 False**输出说明**：
 False- `axis=0` 垂直拼接（追加行），`axis=1` 水平拼接（追加列）
 False- `ignore_index=True` 重新生成索引
 False- 列不一致时，缺失列自动填 NaN
 False
 False---
 False
 False## 9. 重塑与透视
 False
 False### 9.1 melt 宽表转长表
 False
```python
 Trueimport pandas as pd
 True
 Truedf_wide = pd.DataFrame({
 True 'date': ['2024-01', '2024-02', '2024-03'],
 True 'Beijing': [100, 120, 110],
 True 'Shanghai': [90, 95, 105],
 True 'Guangzhou': [80, 85, 90]
 True})
 True
 Truedf_long = df_wide.melt(id_vars=['date'], var_name='city', value_name='sales')
 Trueprint(f"长表:\n{df_long}")
 True```

 False**输出说明**：`melt` 将多列"融化"为行。`id_vars` 指定保留的标识列，其余列变为 `var_name` 和 `value_name` 两列。这是 tidy data 格式转换的核心操作。
 False
 False> **为什么 tidy data 格式重要？** Hadley Wickham 提出的 tidy data 原则：每列一个变量，每行一个观测。Seaborn 和大多数统计工具都假设数据是 tidy 格式。如果你的数据是"宽表"（每个城市一列），需要先 melt 为"长表"才能用 Seaborn 绘图。
 False
 False### 9.2 pivot_table 长表转宽表
 False
```python
 Trueimport pandas as pd
 True
 Truedf_long = pd.DataFrame({
 True 'date': ['2024-01']*3 + ['2024-02']*3 + ['2024-03']*3,
 True 'city': ['Beijing', 'Shanghai', 'Guangzhou'] * 3,
 True 'sales': [100, 90, 80, 120, 95, 85, 110, 105, 90]
 True})
 True
 Truepivot = df_long.pivot_table(index='date', columns='city', values='sales', aggfunc='sum')
 Trueprint(f"透视表:\n{pivot}")
 True
 Truepivot_mean = df_long.pivot_table(index='city', values='sales', aggfunc=['mean', 'sum', 'count'])
 Trueprint(f"\n多聚合函数:\n{pivot_mean}")
 True```

 False**输出说明**：
 False- `pivot_table` 是 Excel 透视表的 Pandas 实现
 False- `aggfunc` 默认为 `mean`，可指定 `sum`、`count` 或自定义函数
 False- 支持多聚合函数，结果为多级列名
 False
 False### 9.3 stack/unstack
 False
```python
 Trueimport pandas as pd
 True
 Truedf = pd.DataFrame({
 True 'Q1': [100, 200, 150],
 True 'Q2': [120, 210, 160],
 True 'Q3': [110, 190, 170]
 True}, index=['Beijing', 'Shanghai', 'Guangzhou'])
 Truedf.index.name = 'city'
 True
 Truestacked = df.stack()
 Trueprint(f"stack(列转行):\n{stacked}")
 True
 Trueunstacked = stacked.unstack()
 Trueprint(f"\nunstack(行转列):\n{unstacked}")
 True```

 False**输出说明**：`stack` 将列索引转为行索引（宽变长），`unstack` 将行索引转为列索引（长变宽）。它们是 `melt`/`pivot` 的索引操作版本。
 False
 False---
 False
 False## 10. 时间序列处理
 False
 False### 10.1 日期解析与 DatetimeIndex
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedates = pd.date_range('2024-01-01', periods=10, freq='D')
 Truedf = pd.DataFrame({
 True 'date': dates,
 True 'value': np.random.default_rng(42).normal(100, 10, 10)
 True})
 Truedf['date'] = pd.to_datetime(df['date'])
 Truedf = df.set_index('date')
 Trueprint(f"DatetimeIndex:\n{df}")
 Trueprint(f"\n索引属性:")
 Trueprint(f" year: {df.index.year.tolist()}")
 Trueprint(f" month: {df.index.month.tolist()}")
 Trueprint(f" dayofweek: {df.index.dayofweek.tolist()}")
 True```

 False**输出说明**：`pd.to_datetime` 将字符串转为 datetime64 类型。设置为索引后，可以利用 `.year`、`.month`、`.dayofweek` 等属性快速提取时间特征。
 False
 False### 10.2 重采样（Resample）
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedates = pd.date_range('2024-01-01', periods=90, freq='D')
 Truedf = pd.DataFrame({
 True 'value': np.random.default_rng(42).normal(100, 15, 90)
 True}, index=dates)
 True
 Truemonthly = df.resample('M').agg({'value': ['mean', 'std', 'count']})
 Trueprint(f"月度重采样:\n{monthly}")
 True
 Trueweekly = df.resample('W').mean()
 Trueprint(f"\n周度重采样:\n{weekly.head()}")
 True```

 False**输出说明**：
 False- `resample('M')` 按月重采样，`'W'` 按周，`'Q'` 按季
 False- 重采样后需要跟聚合函数（`mean`、`sum`、`ohlc` 等）
 False- 类似 groupby，但按时间区间分组
 False
 False> **resample 频率速查**：`D`=日，`W`=周，`M`=月末，`MS`=月初，`Q`=季末，`Y`=年末，`H`=小时，`T`=分钟
 False
 False### 10.3 滚动窗口与偏移
 False
```python
 Trueimport pandas as pd
 Trueimport numpy as np
 True
 Truedates = pd.date_range('2024-01-01', periods=30, freq='D')
 Truedf = pd.DataFrame({
 True 'value': np.random.default_rng(42).normal(100, 10, 30)
 True}, index=dates)
 True
 Truedf['rolling_7d'] = df['value'].rolling(window=7).mean()
 Truedf['shift_1'] = df['value'].shift(1)
 Truedf['diff_1'] = df['value'].diff(1)
 Truedf['pct_change'] = df['value'].pct_change()
 Trueprint(f"滚动与偏移:\n{df.head(10)}")
 True```

 False**输出说明**：
 False- `rolling(window=7).mean()` 计算 7 日滚动均值，前 6 行为 NaN
 False- `shift(1)` 将数据下移一行，用于计算同比/环比
 False- `diff(1)` 计算与前一行的差值
 False- `pct_change()` 计算环比变化率
 False
 False---
 False
 False## 11. IO 操作
 False
 False### 11.1 常用读写接口
 False
 False| 格式 | 读取 | 写入 | 说明 |
 False|------|------|------|------|
 False| CSV | `pd.read_csv()` | `df.to_csv()` | 最通用，纯文本 |
 False| Excel | `pd.read_excel()` | `df.to_excel()` | 需安装 openpyxl |
 False| JSON | `pd.read_json()` | `df.to_json()` | API 数据常见格式 |
 False| SQL | `pd.read_sql()` | `df.to_sql()` | 需要数据库连接 |
 False| Parquet | `pd.read_parquet()` | `df.to_parquet()` | 列式存储，大数据推荐 |
 False| Feather | `pd.read_feather()` | `df.to_feather()` | 极速读写 |
 False
 False### 11.2 常用参数
 False
```python
 Trueimport pandas as pd
 True
 Truedf = pd.read_csv(
 True 'data.csv',
 True encoding='utf-8',
 True parse_dates=['order_date', 'ship_date'],
 True dtype={'user_id': 'int64', 'status': 'category'},
 True na_values=['NA', 'N/A', 'null', ''],
 True usecols=['order_id', 'user_id', 'order_date', 'amount', 'status'],
 True nrows=10000
 True)
 True
 Truedf.to_csv(
 True 'output.csv',
 True index=False,
 True encoding='utf-8-sig',
 True float_format='%.2f'
 True)
 True```

 False**输出说明**：
 False- `encoding`：中文数据常用 `utf-8`、`gbk`、`latin-1`
 False- `parse_dates`：自动将指定列转为 datetime
 False- `dtype`：指定列类型，避免自动推断错误
 False- `na_values`：自定义缺失值标记
 False- `usecols`：只读取需要的列，节省内存
 False- `nrows`：只读取前 N 行，用于快速预览
 False
 False### 11.3 大文件处理
 False
```python
 Trueimport pandas as pd
 True
 Truechunk_iter = pd.read_csv('large_data.csv', chunksize=50000)
 True
 Trueresults = []
 Truefor chunk in chunk_iter:
 True filtered = chunk[chunk['amount'] > 100]
 True results.append(filtered)
 True
 Truedf_result = pd.concat(results, ignore_index=True)
 Trueprint(f"分块处理后结果: {df_result.shape}")
 True```

 False**输出说明**：`chunksize` 参数将大文件分块读取，每次只加载一部分数据到内存。适合处理超过内存大小的文件。
 False
 False> 跨模块参考：如果数据存储在数据库中，可以使用 [[mysql/overview|MySQL]] 技能在数据库端完成部分过滤和聚合，减少传输到 Python 的数据量。
 False
 False---
 False
 False## 12. 速查表
 False
 False### 12.1 数据选择
 False
 False| 操作 | 语法 |
 False|------|------|
 False| 选择列 | `df['col']` / `df[['col1','col2']]` |
 False| 标签选择 | `df.loc[row_label, col_label]` |
 False| 位置选择 | `df.iloc[row_pos, col_pos]` |
 False| 布尔筛选 | `df[df['col'] > value]` |
 False| ISIN | `df[df['col'].isin([v1,v2])]` |
 False| 字符串包含 | `df[df['col'].str.contains('pattern')]` |
 False| Query | `df.query('expr')` |
 False
 False### 12.2 分组聚合
 False
 False| 操作 | 语法 |
 False|------|------|
 False| 单列单函数 | `df.groupby('key')['col'].mean()` |
 False| 多函数 | `df.groupby('key')['col'].agg(['mean','std'])` |
 False| 命名聚合 | `df.groupby('key').agg(name=('col','func'))` |
 False| transform | `df.groupby('key')['col'].transform('mean')` |
 False| apply | `df.groupby('key').apply(func)` |
 False
 False### 12.3 合并
 False
 False| 操作 | 语法 | SQL 对应 |
 False|------|------|----------|
 False| 内连接 | `pd.merge(df1,df2,on='key',how='inner')` | INNER JOIN |
 False| 左连接 | `pd.merge(df1,df2,on='key',how='left')` | LEFT JOIN |
 False| 垂直拼接 | `pd.concat([df1,df2],axis=0)` | UNION ALL |
 False| 水平拼接 | `pd.concat([df1,df2],axis=1)` | - |
 False
 False### 12.4 重塑
 False
 False| 操作 | 语法 | 方向 |
 False|------|------|------|
 False| 宽变长 | `df.melt(id_vars, var_name, value_name)` | 列转行 |
 False| 长变宽 | `df.pivot_table(index, columns, values)` | 行转列 |
 False| stack | `df.stack()` | 列索引转行索引 |
 False| unstack | `df.unstack()` | 行索引转列索引 |
 False
 False---
 False
 False## 13. 延伸阅读
 False
 False- Pandas 官方文档：https://pandas.pydata.org/docs/
 False- Python for Data Analysis 第 3 版 (Wes McKinney)
 False- Effective Pandas (Matt Harrison)
 False- Pandas Cookbook：https://pandas.pydata.org/pandas-docs/stable/user_guide/cookbook.html

### 跨模块关联

- [[python/built-in-data-structures|Python 数据结构]]
 False