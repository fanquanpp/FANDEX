---
order: 240
title: Python math/random/statistics
module: 'python'
category: 后端技术
difficulty: beginner
description: Python math/random/statistics 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## math 数学函数

**基本写法：平方根与幂**
`math.sqrt(<数>) / math.pow(<底>, <指数>)`
```python
# 开方与幂运算
import math
print(math.sqrt(16))      # 4.0
print(math.pow(2, 10))    # 1024.0
```

**基本写法：数学常量**
`math.pi / math.e / math.inf / math.nan`
```python
# 内置数学常量
print(math.pi)     # 3.141592653589793
print(math.e)      # 2.718281828459045
print(math.inf)    # 正无穷
```

**基本写法：向上向下取整**
`math.ceil(<数>) / math.floor(<数>)`
```python
# 取整运算
print(math.ceil(3.2))    # 4
print(math.floor(3.8))   # 3
```

**基本写法：绝对值与符号**
`math.fabs(<数>) / math.copysign(<数1>, <数2>)`
```python
# 取绝对值与复制符号
print(math.fabs(-5))         # 5.0
print(math.copysign(3, -1))  # -3.0
```

**基本写法：阶乘**
`math.factorial(<整数>)`
```python
# 计算阶乘
print(math.factorial(5))  # 120
```

**基本写法：最大公约数与最小公倍数**
`math.gcd(<a>, <b>) / math.lcm(<a>, <b>)`
```python
# Python 3.9+ lcm 计算最小公倍数
print(math.gcd(12, 18))  # 6
print(math.lcm(4, 6))    # 12
```

**基本写法：对数运算**
`math.log(<数>[, <底>]) / math.log2 / math.log10`
```python
# 各类对数
print(math.log(8, 2))    # 3.0
print(math.log10(1000))  # 3.0
```

**基本写法：三角函数**
`math.sin(<弧度>) / math.cos / math.tan`
```python
# 角度需先转弧度
print(math.sin(math.pi / 2))  # 1.0
print(math.degrees(math.pi))  # 180.0
```

**基本写法：浮点判断**
`math.isfinite(<数>) / math.isnan(<数>)`
```python
# 判断有限与 NaN
print(math.isfinite(1.0))  # True
print(math.isnan(math.nan))  # True
```

**基本写法：精确求和**
`math.fsum(<可迭代>)`
```python
# 避免浮点累计误差
print(math.fsum([0.1] * 10))  # 1.0
```

**基本写法：融合乘加（Python 3.13+）**
`math.fma(<a>, <b>, <c>)`
```python
# 单次舍入的 a*b+c，精度更高
print(math.fma(2.0, 3.0, 1.0))  # 7.0
```

---

## random 随机数

**基本写法：设置随机种子**
`random.seed(<种子>)`
```python
# 固定种子保证结果可复现
import random
random.seed(42)
print(random.random())
```

**基本写法：0 到 1 随机浮点**
`random.random()`
```python
# 生成 [0.0, 1.0) 随机浮点数
x = random.random()
```

**基本写法：指定范围随机整数**
`random.randint(<起>, <止>)`
```python
# 生成 [a, b] 闭区间整数
print(random.randint(1, 100))
```

**基本写法：随机选择元素**
`random.choice(<序列>)`
```python
# 从非空序列随机选一个
print(random.choice(["a", "b", "c"]))
```

**基本写法：加权随机选择**
`random.choices(<序列>, weights=<权重>, k=<数量>)`
```python
# 按权重有放回抽样
result = random.choices(["红", "蓝"], weights=[1, 3], k=5)
```

**基本写法：打乱序列**
`random.shuffle(<列表>)`
```python
# 原地打乱列表顺序
cards = list(range(1, 11))
random.shuffle(cards)
```

**基本写法：无放回抽样**
`random.sample(<序列>, k=<数量>)`
```python
# 不重复抽取 k 个元素
print(random.sample(range(1, 50), 6))  # 随机 6 个不重复
```

**基本写法：区间随机浮点**
`random.uniform(<起>, <止>)`
```python
# 生成 [a, b] 随机浮点数
print(random.uniform(1.5, 3.5))
```

**基本写法：高斯分布**
`random.gauss(<均值>, <标准差>)`
```python
# 生成正态分布随机数
print(random.gauss(0, 1))
```

**基本写法：随机字节**
`random.randbytes(<字节数>)`
```python
# Python 3.9+ 生成随机字节
print(random.randbytes(8))
```

**基本写法：命令行生成随机数**
`python -m random`
```python
# Python 3.13+ 可通过命令行生成随机数
# 命令行执行：python -m random
```

---

## statistics 统计函数

**基本写法：平均值**
`statistics.mean(<数据>)`
```python
# 计算算术平均数
import statistics
print(statistics.mean([1, 2, 3, 4]))  # 2.5
```

**基本写法：中位数**
`statistics.median(<数据>)`
```python
# 计算中位数
print(statistics.median([1, 3, 2, 4]))  # 2.5
```

**基本写法：众数**
`statistics.mode(<数据>) / statistics.multimode(<数据>)`
```python
# 计算众数，multimode 返回所有众数
print(statistics.mode([1, 2, 2, 3]))      # 2
print(statistics.multimode([1, 1, 2, 2]))  # [1, 2]
```

**基本写法：标准差**
`statistics.stdev(<数据>) / statistics.pstdev(<数据>)`
```python
# 样本标准差与总体标准差
data = [1, 2, 3, 4, 5]
print(statistics.stdev(data))   # 1.5811...
print(statistics.pstdev(data))  # 1.4142...
```

**基本写法：方差**
`statistics.variance(<数据>) / statistics.pvariance(<数据>)`
```python
# 样本方差与总体方差
print(statistics.variance(data))
```

**基本写法：分位数**
`statistics.quantiles(<数据>, n=<份数>)`
```python
# 将数据分为 n 份返回分位点
print(statistics.quantiles([1, 2, 3, 4, 5, 6], n=4))  # 四分位数
```

**基本写法：相关系数与线性回归**
`statistics.linear_regression(<x>, <y>)`
```python
# 计算线性回归斜率与截距
x = [1, 2, 3, 4]
y = [2, 4, 6, 8]
slope, intercept = statistics.linear_regression(x, y)
print(slope, intercept)  # 2.0 0.0
```

**基本写法：几何平均与调和平均**
`statistics.geometric_mean(<数据>) / statistics.harmonic_mean(<数据>)`
```python
# 几何平均与调和平均
print(statistics.geometric_mean([1, 2, 4]))  # 2.0
print(statistics.harmonic_mean([1, 2, 4]))   # 1.714...
```
