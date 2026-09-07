---
order: 750
title: Python itertools 迭代工具
module: 'python'
category: 后端技术
difficulty: beginner
description: Python itertools 迭代工具 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 无限迭代器

**基本写法：count 无限计数**
`itertools.count([start], [step])`
```python
# 从 start 开始每次加 step 无限计数
from itertools import count
for i in count(10, 2):
    if i > 20:
        break
    print(i)  # 10, 12, 14, 16, 18, 20
```

**基本写法：cycle 循环重复**
`itertools.cycle(<可迭代对象>)`
```python
# 无限循环遍历可迭代对象
from itertools import cycle
colors = cycle(["red", "green", "blue"])
for i, c in enumerate(colors):
    if i >= 5:
        break
    print(c)
```

**基本写法：repeat 重复元素**
`itertools.repeat(<元素>, [times])`
```python
# 重复元素指定次数
from itertools import repeat
for x in repeat("hi", 3):
    print(x)  # hi hi hi
```

---

## 串联与切分

**基本写法：chain 串联迭代器**
`itertools.chain(<可迭代1>, <可迭代2>)`
```python
# 将多个可迭代对象串联
from itertools import chain
for x in chain([1, 2], [3, 4]):
    print(x)  # 1 2 3 4
```

**基本写法：chain.from_iterable 串联嵌套**
`itertools.chain.from_iterable(<嵌套可迭代>)`
```python
# 串联可迭代对象的可迭代对象
nested = [[1, 2], [3, 4], [5]]
for x in chain.from_iterable(nested):
    print(x)  # 1 2 3 4 5
```

**基本写法：islice 切片**
`itertools.islice(<可迭代>, [start], stop, [step])`
```python
# 对迭代器进行切片
from itertools import islice
for x in islice(range(100), 5, 10, 2):
    print(x)  # 5 7 9
```

**基本写法：tee 分裂迭代器**
`itertools.tee(<可迭代>, n)`
```python
# 复制迭代器为 n 个独立迭代器
from itertools import tee
it1, it2 = tee(range(3), 2)
print(list(it1))  # [0, 1, 2]
print(list(it2))  # [0, 1, 2]
```

---

## 过滤

**基本写法：filterfalse 反向过滤**
`itertools.filterfalse(<函数>, <可迭代>)`
```python
# 保留使函数返回 False 的元素
from itertools import filterfalse
for x in filterfalse(lambda n: n % 2, range(6)):
    print(x)  # 0 2 4
```

**基本写法：takewhile 取到条件不满足**
`itertools.takewhile(<函数>, <可迭代>)`
```python
# 依次取元素直到函数返回 False
from itertools import takewhile
for x in takewhile(lambda n: n < 5, [1, 3, 5, 2]):
    print(x)  # 1 3
```

**基本写法：dropwhile 丢弃到条件不满足**
`itertools.dropwhile(<函数>, <可迭代>)`
```python
# 跳过元素直到函数返回 False，然后取剩余
from itertools import dropwhile
for x in dropwhile(lambda n: n < 5, [1, 3, 5, 2, 7]):
    print(x)  # 5 2 7
```

**基本写法：compress 按选择器过滤**
`itertools.compress(<数据>, <选择器>)`
```python
# 按布尔选择器提取元素
from itertools import compress
for x in compress("ABCDEF", [1, 0, 1, 0, 1, 1]):
    print(x)  # A C E F
```

---

## 映射

**基本写法：starmap 展开映射**
`itertools.starmap(<函数>, <可迭代>)`
```python
# 将每项作为参数展开传给函数
from itertools import starmap
for result in starmap(pow, [(2, 3), (3, 2)]):
    print(result)  # 8 9
```

**基本写法：accumulate 累积**
`itertools.accumulate(<可迭代>, [func])`
```python
# 累积求和或自定义累积函数
from itertools import accumulate
for x in accumulate([1, 2, 3, 4]):
    print(x)  # 1 3 6 10
```

**基本写法：累积求积**
`itertools.accumulate(<可迭代>, operator.mul)`
```python
# 累积乘法
import operator
for x in accumulate([1, 2, 3, 4], operator.mul):
    print(x)  # 1 2 6 24
```

---

## 分组

**基本写法：groupby 分组**
`itertools.groupby(<可迭代>, [key=<函数>])`
```python
# 按键函数分组（需先排序）
from itertools import groupby
data = [("a", 1), ("a", 2), ("b", 3)]
for key, group in groupby(data, lambda x: x[0]):
    print(key, list(group))
# a [('a', 1), ('a', 2)]
# b [('b', 3)]
```

**基本写法：按值分组**
`itertools.groupby(sorted(<可迭代>), key=<函数>)`
```python
# 先排序再分组确保连续
words = ["apple", "bat", "ant", "bear"]
for first, group in groupby(sorted(words), lambda w: w[0]):
    print(first, list(group))
# a ['apple', 'ant']
# b ['bat', 'bear']
```

---

## 排列组合

**基本写法：product 笛卡尔积**
`itertools.product(<可迭代1>, <可迭代2>, [repeat=<次数>])`
```python
# 多个可迭代对象的笛卡尔积
from itertools import product
for combo in product("AB", "12"):
    print(combo)
# ('A','1') ('A','2') ('B','1') ('B','2')
```

**基本写法：product 重复**
`itertools.product(<可迭代>, repeat=<次数>)`
```python
# 与自身做笛卡尔积
for combo in product("AB", repeat=2):
    print(combo)
# AA AB BA BB
```

**基本写法：permutations 排列**
`itertools.permutations(<可迭代>, [r])`
```python
# 全排列
from itertools import permutations
for p in permutations("ABC", 2):
    print(p)
# AB AC BA BC CA CB
```

**基本写法：combinations 组合**
`itertools.combinations(<可迭代>, r)`
```python
# 无放回组合
from itertools import combinations
for c in combinations("ABC", 2):
    print(c)
# AB AC BC
```

**基本写法：combinations_with_replacement 可重复组合**
`itertools.combinations_with_replacement(<可迭代>, r)`
```python
# 有放回组合
from itertools import combinations_with_replacement
for c in combinations_with_replacement("AB", 2):
    print(c)
# AA AB BB
```

---

## 配对与分块

**基本写法：Python 3.10+ pairwise 配对**
`itertools.pairwise(<可迭代>)`
```python
# 相邻元素两两配对
from itertools import pairwise
for a, b in pairwise([1, 2, 3, 4]):
    print(a, b)  # 1 2 / 2 3 / 3 4
```

**基本写法：Python 3.12+ batched 分批**
`itertools.batched(<可迭代>, n)`
```python
# Python 3.12+ 按固定大小分批
from itertools import batched
for batch in batched(range(7), 3):
    print(batch)
# (0, 1, 2) (3, 4, 5) (6,)
```

---

## zip_longest

**基本写法：zip_longest 不等长配对**
`itertools.zip_longest(<可迭代1>, <可迭代2>, [fillvalue=<填充值>])`
```python
# 不等长可迭代对象配对，短端填充
from itertools import zip_longest
for a, b in zip_longest([1, 2, 3], ["a", "b"], fillvalue="?"):
    print(a, b)
# 1 a / 2 b / 3 ?
```
