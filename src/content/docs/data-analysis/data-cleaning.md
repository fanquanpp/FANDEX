---
order: 70
tags:
  - 'data-analysis'
  - 'design-patterns'
  - 'database'
  - 'functional'
  - 'devops'
  - 'math'
difficulty: 'intermediate'
title: '数据清洗 -- 缺失值、异常值与数据类型转换'
module: 'data-analysis'
category: 'Data Science / Data Cleaning'
description: '数据清洗实战技巧：缺失值处理策略、异常值检测与修正、数据类型转换与格式统一'
author: 'fanquanpp'
---

## 目录

- [1. 数据清洗概述](#1-数据清洗概述)
- [2. 数据质量评估](#2-数据质量评估)
- [3. 缺失值处理](#3-缺失值处理)
- [4. 异常值检测](#4-异常值检测)
- [5. 异常值处理](#5-异常值处理)
- [6. 数据类型转换](#6-数据类型转换)
- [7. 字符串清洗](#7-字符串清洗)
- [8. 重复数据处理](#8-重复数据处理)
- [9. 数据验证与断言](#9-数据验证与断言)
- [10. 清洗流程自动化](#10-清洗流程自动化)
- [11. 速查表](#11-速查表)
- [12. 延伸阅读](#12-延伸阅读)

---

## 1. 数据清洗概述

### 1.1 为什么数据清洗是第一步

"Garbage In, Garbage Out" -- 如果输入数据有问题，再先进的分析方法也产出不了有价值的结论。数据清洗通常占整个分析项目 60%-80% 的时间，但这一步不可跳过。

数据质量问题的常见来源：

- 人工录入错误（拼写、格式不一致）
- 系统迁移导致的数据丢失或格式变化
- 传感器故障导致的异常值
- 多源数据合并时的格式冲突
- 用户主动不填导致的缺失值

> 跨模块参考：数据清洗依赖 [pandas.md](pandas.md) 的 DataFrame 操作，统计分析方法参考 [statistics.md](statistics.md)。

### 1.2 数据清洗的核心任务

| 任务         | 典型问题               | 工具                                  |
| ------------ | ---------------------- | ------------------------------------- |
| 缺失值处理   | NaN、空字符串、占位符  | `fillna`、`dropna`、`interpolate`     |
| 异常值处理   | 极端值、不合理值       | IQR、Z-Score、Winsorize               |
| 类型转换     | 字符串数字、日期格式   | `to_numeric`、`to_datetime`、`astype` |
| 字符串清洗   | 空格、大小写、特殊字符 | `str.strip`、`str.replace`、正则      |
| 重复数据处理 | 完全重复、部分重复     | `duplicated`、`drop_duplicates`       |
| 格式统一     | 编码不一致、单位不统一 | 自定义映射函数                        |

---

## 2. 数据质量评估

### 2.1 全面体检

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'user_id': [1, 2, 3, np.nan, 5, 6, 7, 8, 9, 10],
    'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'alice', 'Frank', None, 'Grace', 'Bob'],
    'age': [25, 30, -5, 28, 150, 22, 35, 29, 31, 30],
    'email': ['a@test.com', 'b@test.com', 'invalid', 'd@test.com', 'e@test.com',
              'a@test.com', 'g@test.com', 'h@test', 'i@test.com', 'b@test.com'],
    'signup_date': ['2024-01-15', '2024/02/20', '2024-03-10', '2024-04-05',
                    '2024-05-01', '2024-06-15', 'not-a-date', '2024-08-20', '2024-09-10', '2024-10-25'],
    'purchase_amount': [120.5, 89.9, 0, 250.0, np.nan, 75.5, 99999.0, 180.0, 95.0, 89.9]
})

print(f"Shape: {df.shape}")
print(f"\nData types:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isna().sum()}")
print(f"\nMissing rate:\n{df.isna().mean().round(4) * 100}%")
print(f"\nDuplicate rows: {df.duplicated().sum()}")
print(f"\nBasic stats:\n{df.describe()}")
```

**输出说明**：

- `shape` 了解数据规模
- `dtypes` 检查类型是否正确（如 age 应为整数而非浮点数）
- `isna().sum()` 统计每列缺失数
- `describe()` 快速发现异常值（如 age=-5, age=150, purchase_amount=99999）

### 2.2 数据质量报告

```python
import pandas as pd
import numpy as np

def quality_report(df):
    report = pd.DataFrame({
        'dtype': df.dtypes,
        'non_null': df.notna().sum(),
        'null_count': df.isna().sum(),
        'null_pct': (df.isna().mean() * 100).round(2),
        'unique': df.nunique(),
        'sample': df.apply(lambda x: x.dropna().unique()[:3].tolist())
    })
    return report

print(quality_report(df))
```

**输出说明**：自定义质量报告函数汇总每列的类型、缺失情况、唯一值数量和样本值，帮助快速定位问题列。

---

## 3. 缺失值处理

### 3.1 缺失机制分类

| 机制         | 缩写 | 含义                   | 处理策略           |
| ------------ | ---- | ---------------------- | ------------------ |
| 完全随机缺失 | MCAR | 缺失与任何变量无关     | 删除或简单填充     |
| 随机缺失     | MAR  | 缺失与已观测变量有关   | 多重插补、模型填充 |
| 非随机缺失   | MNAR | 缺失与未观测值本身有关 | 需要领域知识处理   |

> **为什么区分缺失机制很重要？** MCAR 下删除缺失行不会引入偏差。MAR 下删除可能引入偏差，应使用填充。MNAR 下任何统计方法都无法完全修正偏差，需要领域知识辅助。

### 3.2 删除法

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'A': [1, np.nan, 3, np.nan, 5],
    'B': [10, 20, np.nan, 40, 50],
    'C': ['x', 'y', np.nan, 'z', 'w']
})

df_drop_any = df.dropna()
print(f"删除任意缺失行:\n{df_drop_any}")

df_drop_subset = df.dropna(subset=['A'])
print(f"\n只看A列缺失:\n{df_drop_subset}")

df_drop_all = df.dropna(how='all')
print(f"\n删除全缺失行:\n{df_drop_all}")

threshold = df.dropna(thresh=2)
print(f"\n保留至少2个非缺失值的行:\n{threshold}")
```

**输出说明**：

- `dropna()` 删除任何含缺失值的行
- `subset` 指定只根据某列判断
- `how='all'` 只删除全部缺失的行
- `thresh=2` 保留至少有 2 个非缺失值的行

> **什么时候应该删除而非填充？** 当缺失率很低（<5%）且数据量充足时，删除最简单安全。当缺失率很高（>50%）时，填充可能引入过多噪声，也建议删除该列。

### 3.3 填充法

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'age': [25, np.nan, 35, 28, np.nan, 42],
    'category': ['A', 'B', np.nan, 'A', 'B', np.nan],
    'value': [100, 120, np.nan, 80, 110, np.nan]
})

df['age'] = df['age'].fillna(df['age'].median())
print(f"中位数填充age:\n{df['age']}")

df['category'] = df['category'].fillna('Unknown')
print(f"\n众数/指定值填充category:\n{df['category']}")

df['value_forward'] = df['value'].fillna(method='ffill')
df['value_backward'] = df['value'].fillna(method='bfill')
print(f"\n前向填充:\n{df['value_forward']}")
print(f"\n后向填充:\n{df['value_backward']}")
```

**输出说明**：

- 数值列常用中位数填充（比均值更抗异常值）
- 分类列用众数或 "Unknown" 填充
- 时间序列用前向/后向填充（`ffill`/`bfill`）
- 选择填充策略时需要考虑业务含义

### 3.4 插值法

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=10),
    'value': [10, 12, np.nan, np.nan, 18, 20, np.nan, 25, 27, 30]
})

df['linear'] = df['value'].interpolate(method='linear')
df['quadratic'] = df['value'].interpolate(method='quadratic')
df['time'] = df['value'].interpolate(method='time')

print(df['value', 'linear', 'quadratic', 'time']('value', 'linear', 'quadratic', 'time'))
```

**输出说明**：

- `linear`：线性插值，适合变化均匀的数据
- `quadratic`：二次插值，适合有曲率的数据
- `time`：时间感知插值，考虑时间间隔

> **为什么插值比简单填充好？** 插值利用了相邻数据点的趋势信息，填充值更合理。特别是时间序列数据，插值能保持趋势的连续性。

---

## 4. 异常值检测

### 4.1 IQR 法则

```python
import pandas as pd
import numpy as np

rng = np.random.default_rng(42)
data = np.concatenate([rng.normal(50, 10, 95), [150, 160, -20, -30, 200]])
df = pd.DataFrame({'value': data})

Q1 = df['value'].quantile(0.25)
Q3 = df['value'].quantile(0.75)
IQR = Q3 - Q1
lower = Q1 - 1.5 * IQR
upper = Q3 + 1.5 * IQR

outliers = df[(df['value'] < lower) | (df['value'] > upper)]
print(f"Q1={Q1:.2f}, Q3={Q3:.2f}, IQR={IQR:.2f}")
print(f"正常范围: [{lower:.2f}, {upper:.2f}]")
print(f"异常值数量: {len(outliers)}")
print(f"异常值:\n{outliers}")
```

**输出说明**：IQR 法则将超出 [Q1-1.5*IQR, Q3+1.5*IQR] 范围的值标记为异常。这是箱线图中异常值检测的标准方法。

> **为什么用 1.5 倍 IQR？** 对于正态分布，1.5\*IQR 大约对应 +/- 2.7 个标准差，覆盖约 99.3% 的数据。这个倍数是经验值，可以根据业务需求调整（如 3 倍 IQR 只标记极端异常值）。

### 4.2 Z-Score 法

```python
import numpy as np
from scipy import stats

rng = np.random.default_rng(42)
data = np.concatenate([rng.normal(50, 10, 95), [150, 160, -20, -30, 200]])

z_scores = np.abs(stats.zscore(data))
threshold = 3
outlier_mask = z_scores > threshold

print(f"Z-Score > {threshold} 的异常值数量: {outlier_mask.sum()}")
print(f"异常值索引: {np.where(outlier_mask)[0]}")
print(f"异常值: {data[outlier_mask]}")
```

**输出说明**：Z-Score = (x - mean) / std。|Z| > 3 的值被视为异常（正态分布下概率 < 0.3%）。Z-Score 法对正态分布数据效果好，但对偏态分布不适用。

### 4.3 可视化检测

```python
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt

rng = np.random.default_rng(42)
data = np.concatenate([rng.normal(50, 10, 95), [150, 160, -20, -30, 200]])
df = pd.DataFrame({'value': data})

fig, axes = plt.subplots(1, 2, figsize=(12, 5))

sns.boxplot(y=df['value'], ax=axes[0])
axes[0].set_title('Box Plot for Outlier Detection')

sns.histplot(df['value'], bins=30, kde=True, ax=axes[1])
axes[1].axvline(df['value'].mean(), color='red', linestyle='--', label='Mean')
axes[1].set_title('Histogram with Distribution')
axes[1].legend()

plt.tight_layout()
plt.show()
```

**输出说明**：箱线图直观展示异常值（独立点），直方图展示整体分布形态。两种图表结合使用，可以更全面地判断异常值。

---

## 5. 异常值处理

### 5.1 处理策略选择

| 策略              | 适用场景           | 优点         | 缺点         |
| ----------------- | ------------------ | ------------ | ------------ |
| 删除              | 确认数据错误       | 简单直接     | 损失信息     |
| 截断（Winsorize） | 保留数据但限制影响 | 保留样本量   | 改变分布形态 |
| 替换              | 有合理替代值       | 保留样本量   | 引入主观判断 |
| 分箱              | 将极端值归入边界组 | 保留排序信息 | 损失精度     |
| 保留              | 异常值本身有意义   | 不丢失信息   | 影响统计量   |

### 5.2 Winsorize 截断

```python
import numpy as np
from scipy.stats import mstats

data = np.array([10, 12, 15, 18, 20, 22, 25, 28, 30, 150, 200])

winsorized = mstats.winsorize(data, limits=[0.05, 0.05])
print(f"原始数据: {data}")
print(f"截断后:   {winsorized}")
print(f"最大值从 {data.max()} 变为 {winsorized.max()}")
```

**输出说明**：Winsorize 将两端各 5% 的极端值替换为对应百分位的值。与删除不同，截断保留了样本量，只是将极端值"拉回"到合理范围。

### 5.3 Clipping 裁剪

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({'age': [25, 30, -5, 28, 150, 22, 35, 29]})

df['age_clipped'] = df['age'].clip(lower=0, upper=120)
print(f"裁剪后:\n{df}")
```

**输出说明**：`clip` 将超出范围的值替换为边界值。比 Winsorize 更直观，适合有明确合理范围的字段（如年龄 0-120）。

---

## 6. 数据类型转换

### 6.1 常见转换场景

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'price_str': ['10.5', '20.0', 'N/A', '30.5', 'unknown'],
    'date_str': ['2024-01-15', '2024/02/20', '2024-03-10', 'not-a-date', '2024-05-01'],
    'status': ['active', 'inactive', 'active', 'active', 'pending'],
    'quantity': [1.0, 2.0, 3.0, 4.0, 5.0]
})

df['price'] = pd.to_numeric(df['price_str'], errors='coerce')
print(f"字符串转数值:\n{df['price_str', 'price']('price_str', 'price')}")

df['date'] = pd.to_datetime(df['date_str'], errors='coerce', format='mixed')
print(f"\n字符串转日期:\n{df['date_str', 'date']('date_str', 'date')}")

df['status_cat'] = df['status'].astype('category')
print(f"\n对象转分类:\n{df['status_cat'].cat.categories.tolist()}")

df['quantity_int'] = df['quantity'].astype('int32')
print(f"\n浮点转整数:\n{df['quantity', 'quantity_int']('quantity', 'quantity_int').dtypes}")
```

**输出说明**：

- `errors='coerce'` 将无法转换的值设为 NaN（而非报错）
- `format='mixed'` 自动识别多种日期格式
- `astype('category')` 将低基数字符串转为分类类型
- 浮点数转整数前确保没有小数部分

### 6.2 布尔转换

```python
import pandas as pd

df = pd.DataFrame({
    'flag': ['yes', 'no', 'YES', 'No', 'y', 'n', '1', '0', True, False]
})

bool_map = {'yes': True, 'y': True, '1': True, True: True,
            'no': False, 'n': False, '0': False, False: False}

df['flag_bool'] = df['flag'].astype(str).str.lower().map(
    {'yes': True, 'y': True, '1': True, '': True,
     'no': False, 'n': False, '0': False, 'false': False}
)
print(f"布尔转换:\n{df['flag', 'flag_bool']('flag', 'flag_bool')}")
```

**输出说明**：实际数据中布尔值的表示千奇百怪（yes/no, Y/N, 1/0, True/False），统一转换是清洗的常见步骤。

---

## 7. 字符串清洗

### 7.1 基础清洗

```python
import pandas as pd

df = pd.DataFrame({
    'name': ['  Alice ', 'BOB', 'charlie  ', '  Diana', 'EVE  '],
    'city': ['New York', 'los angeles', 'CHICAGO', 'san francisco', 'BOSTON'],
    'phone': ['(123) 456-7890', '123-456-7890', '123.456.7890', '+1 123 456 7890', '1234567890']
})

df['name_clean'] = df['name'].str.strip().str.title()
print(f"去除空格+首字母大写:\n{df['name', 'name_clean']('name', 'name_clean')}")

df['city_clean'] = df['city'].str.strip().str.title()
print(f"\n城市名标准化:\n{df['city', 'city_clean']('city', 'city_clean')}")

df['phone_clean'] = df['phone'].str.replace(r'\D', '', regex=True)
print(f"\n电话号码只保留数字:\n{df['phone', 'phone_clean']('phone', 'phone_clean')}")
```

**输出说明**：

- `strip()` 去除首尾空白
- `title()` 首字母大写
- `replace(r'\D', '', regex=True)` 移除所有非数字字符

### 7.2 正则提取

```python
import pandas as pd

df = pd.DataFrame({
    'product': ['iPhone 15 Pro Max', 'Samsung Galaxy S24', 'Google Pixel 8 Pro'],
    'price_with_unit': ['$1,199.00', 'EUR 899,50', 'GBP 799.99'],
    'email': ['Contact: user@example.com', 'admin@test.org', 'no-email-here']
})

df['brand'] = df['product'].str.extract(r'^(\w+)')
print(f"提取品牌:\n{df['product', 'brand']('product', 'brand')}")

df['email_extracted'] = df['email'].str.extract(r'([\w.]+@[\w.]+)')
print(f"\n提取邮箱:\n{df['email', 'email_extracted']('email', 'email_extracted')}")

df['has_email'] = df['email'].str.contains(r'@', regex=True)
print(f"\n是否包含邮箱:\n{df['email', 'has_email']('email', 'has_email')}")
```

**输出说明**：

- `str.extract(r'pattern')` 提取第一个匹配组
- `str.contains(r'pattern')` 检查是否包含匹配
- `str.match(r'pattern')` 检查是否从开头匹配

---

## 8. 重复数据处理

### 8.1 完全重复与部分重复

```python
import pandas as pd

df = pd.DataFrame({
    'email': ['a@test.com', 'b@test.com', 'a@test.com', 'a@test.com', 'c@test.com'],
    'name': ['Alice', 'Bob', 'Alice', 'Alice2', 'Charlie'],
    'score': [85, 92, 85, 90, 78]
})

print(f"完全重复:\n{df.duplicated()}")
print(f"\n完全重复数量: {df.duplicated().sum()}")

print(f"\n基于email的重复:\n{df.duplicated(subset=['email'])}")

df_dedup = df.drop_duplicates(subset=['email'], keep='last')
print(f"\n去重(保留最后出现):\n{df_dedup}")
```

**输出说明**：

- `duplicated()` 标记完全重复行（所有列都相同）
- `subset` 指定判断重复的关键列
- `keep='first'`（默认）保留第一条，`keep='last'` 保留最后一条，`keep=False` 删除所有重复

### 8.2 重复记录合并

```python
import pandas as pd

df = pd.DataFrame({
    'user_id': [1, 1, 2, 3, 3],
    'action': ['view', 'purchase', 'view', 'view', 'purchase'],
    'timestamp': ['2024-01-01', '2024-01-02', '2024-01-01', '2024-01-01', '2024-01-03']
})

agg_result = df.groupby('user_id').agg(
    action_count=('action', 'count'),
    latest_action=('action', 'last'),
    latest_timestamp=('timestamp', 'max')
).reset_index()
print(f"重复记录聚合:\n{agg_result}")
```

**输出说明**：当重复记录包含不同信息时，不能简单删除，需要聚合。`groupby` + `agg` 是合并重复记录的标准方法。

---

## 9. 数据验证与断言

### 9.1 使用 assert 语句

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'age': [25, 30, 35, 28, 22],
    'score': [85, 92, 78, 95, 88],
    'email': ['a@test.com', 'b@test.com', 'c@test.com', 'd@test.com', 'e@test.com']
})

assert df['age'].notna().all(), 'Age contains NaN'
assert (df['age'] >= 0).all() and (df['age'] <= 150).all(), 'Age out of range'
assert df['email'].str.contains('@').all(), 'Invalid email format'
assert df['score'].between(0, 100).all(), 'Score out of range'
assert not df.duplicated(subset=['email']).any(), 'Duplicate emails'

print('All validations passed!')
```

**输出说明**：`assert` 语句在条件为 False 时抛出 AssertionError。将验证逻辑放在清洗之后，确保数据质量可控。

### 9.2 使用 pandera 库

```python
import pandas as pd
import pandera as pa

schema = pa.DataFrameSchema({
    'age': pa.Column(int, checks=[
        pa.Check.ge(0),
        pa.Check.le(150)
    ], nullable=False),
    'score': pa.Column(float, checks=[
        pa.Check.ge(0),
        pa.Check.le(100)
    ]),
    'email': pa.Column(str, checks=[
        pa.Check.str_matches(r'^[\w.]+@[\w.]+\.\w+$')
    ], nullable=False),
})

df = pd.DataFrame({
    'age': [25, 30, 35],
    'score': [85.5, 92.0, 78.5],
    'email': ['a@test.com', 'b@test.com', 'c@test.com']
})

validated = schema.validate(df)
print('Pandera validation passed!')
```

**输出说明**：`pandera` 提供声明式的数据验证框架，支持类型检查、范围检查、正则匹配、唯一性检查等。比 `assert` 更结构化，适合生产环境。

---

## 10. 清洗流程自动化

### 10.1 Pipeline 模式

```python
import pandas as pd
import numpy as np

def remove_duplicates(df, subset=None, keep='last'):
    before = len(df)
    df = df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)
    after = len(df)
    print(f'  remove_duplicates: {before} -> {after} rows')
    return df

def handle_missing(df, strategy='median_fill'):
    missing_before = df.isna().sum().sum()
    for col in df.select_dtypes(include='number').columns:
        if strategy == 'median_fill':
            df[col] = df[col].fillna(df[col].median())
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].fillna('Unknown')
    missing_after = df.isna().sum().sum()
    print(f'  handle_missing: {missing_before} -> {missing_after} missing values')
    return df

def fix_types(df):
    for col in df.select_dtypes(include='object').columns:
        try:
            df[col] = pd.to_numeric(df[col], errors='ignore')
        except:
            pass
    print(f'  fix_types: {df.dtypes.value_counts().to_dict()}')
    return df

def remove_outliers_iqr(df, columns, factor=1.5):
    before = len(df)
    for col in columns:
        Q1, Q3 = df[col].quantile([0.25, 0.75])
        IQR = Q3 - Q1
        mask = (df[col] >= Q1 - factor * IQR) & (df[col] <= Q3 + factor * IQR)
        df = df[mask]
    after = len(df)
    print(f'  remove_outliers_iqr: {before} -> {after} rows')
    return df

def clean_pipeline(df):
    print('Starting cleaning pipeline...')
    df = remove_duplicates(df, subset=['email'])
    df = handle_missing(df)
    df = fix_types(df)
    df = remove_outliers_iqr(df, ['age', 'score'])
    print('Cleaning pipeline complete!')
    return df

df_raw = pd.DataFrame({
    'email': ['a@test.com', 'b@test.com', 'a@test.com'],
    'age': [25, np.nan, 200],
    'score': [85, 92, 78]
})

df_clean = clean_pipeline(df_raw)
print(f'\nCleaned data:\n{df_clean}')
```

**输出说明**：Pipeline 模式将清洗步骤封装为独立函数，按顺序执行。每个步骤打印处理前后的变化，便于追踪。这种模式的好处是：

- 每个步骤职责单一，易于测试
- 可以灵活增删步骤
- 处理日志便于审计

---

## 11. 速查表

### 11.1 缺失值处理速查

| 场景       | 方法        | 代码                                   |
| ---------- | ----------- | -------------------------------------- |
| 缺失率 <5% | 删除        | `df.dropna(subset=[col])`              |
| 数值列     | 中位数填充  | `df[col].fillna(df[col].median())`     |
| 分类列     | 众数/指定值 | `df[col].fillna(df[col].mode()[0])`    |
| 时间序列   | 前向填充    | `df[col].fillna(method='ffill')`       |
| 趋势数据   | 插值        | `df[col].interpolate(method='linear')` |

### 11.2 异常值检测速查

| 方法     | 适用场景   | 代码                         |
| -------- | ---------- | ---------------------------- |
| IQR      | 通用       | `Q1-1.5*IQR ~ Q3+1.5*IQR`    |
| Z-Score  | 正态分布   | `abs(zscore) > 3`            |
| 箱线图   | 可视化     | `sns.boxplot()`              |
| 领域规则 | 有明确范围 | `df[col].clip(lower, upper)` |

### 11.3 类型转换速查

| 转换         | 代码                                 |
| ------------ | ------------------------------------ |
| 字符串转数值 | `pd.to_numeric(s, errors='coerce')`  |
| 字符串转日期 | `pd.to_datetime(s, errors='coerce')` |
| 对象转分类   | `s.astype('category')`               |
| 浮点转整数   | `s.astype('int32')`                  |
| 布尔统一     | `s.map({'yes':True, 'no':False})`    |

---

## 12. 延伸阅读

- Pandas 官方文档 -- Missing Data：https://pandas.pydata.org/docs/user_guide/missing_data.html
- Python for Data Analysis 第 3 版 (Wes McKinney)
- pandera 数据验证库：https://pandera.readthedocs.io/
- Great Expectations 数据质量框架：https://greatexpectations.io/
