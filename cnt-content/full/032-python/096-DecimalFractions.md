---
order: 960
title: Python decimal 与 fractions
module: 'python'
category: 后端技术
difficulty: beginner
description: Python decimal 与 fractions 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## decimal Decimal

**基本写法：创建 Decimal**
`decimal.Decimal(<数值>)`
```python
# 精确十进制运算
from decimal import Decimal

a = Decimal("0.1")
b = Decimal("0.2")
print(a + b)  # 0.3，精确
```

**基本写法：从整数创建**
`Decimal(<整数>)`
```python
# 从整数创建
d = Decimal(100)
```

**基本写法：从浮点创建（谨慎）**
`Decimal.from_float(<浮点>)`
```python
# 从 float 创建会保留浮点误差
print(Decimal.from_float(0.1))  # 0.1000000000000000055...
```

**基本写法：算术运算**
`Decimal + - * /`
```python
# 支持所有算术运算
x = Decimal("1.5")
y = Decimal("2.5")
print(x + y, x * y, x / y)
```

**基本写法：比较**
`Decimal < > ==`
```python
# 精确比较
print(Decimal("0.1") + Decimal("0.2") == Decimal("0.3"))  # True
```

---

## Context 上下文

**基本写法：getcontext 获取上下文**
`decimal.getcontext()`
```python
# 获取当前十进制上下文
from decimal import getcontext

ctx = getcontext()
print(ctx.prec)  # 28 位精度
```

**基本写法：设置精度**
`getcontext().prec = <位数>`
```python
# 设置全局精度
getcontext().prec = 6
print(Decimal(1) / Decimal(7))  # 0.142857
```

**基本写法：设置舍入**
`getcontext().rounding = <常量>`
```python
# 舍入模式
from decimal import ROUND_HALF_UP, ROUND_DOWN

getcontext().rounding = ROUND_HALF_UP
```

**基本写法：localcontext 局部上下文**
`with decimal.localcontext() as ctx:`
```python
# 临时上下文
import decimal

with decimal.localcontext() as ctx:
    ctx.prec = 10
    print(Decimal(1) / Decimal(7))
```

**基本写法：舍入方法**
`<Decimal>.quantize(<模式>, rounding=<舍入>)`
```python
# 量化到指定小数位
d = Decimal("3.14159")
print(d.quantize(Decimal("0.01")))  # 3.14
```

---

## Decimal 特殊值

**基本写法：Infinity 与 NaN**
`Decimal("Infinity")` | `Decimal("NaN")`
```python
# 无穷与 NaN
print(Decimal("Infinity"))
print(Decimal("NaN"))
print(Decimal("-Infinity"))
```

**基本写法：signed 零**
`Decimal("-0")`
```python
# 带符号零
print(Decimal("-0") + Decimal("0"))  # 0
```

---

## fractions Fraction

**基本写法：创建分数**
`fractions.Fraction(<分子>, <分母>)`
```python
# 精确分数运算
from fractions import Fraction

f = Fraction(1, 3)
print(f)  # 1/3
```

**基本写法：从字符串创建**
`Fraction(<字符串>)`
```python
# 从字符串创建
f = Fraction("3/7")
f2 = Fraction("1.5")  # 3/2
```

**基本写法：从 Decimal 创建**
`Fraction(<Decimal>)`
```python
# 从 Decimal 创建
f = Fraction(Decimal("0.1"))  # 1/10
```

**基本写法：算术运算**
`Fraction + - * /`
```python
# 分数运算自动约分
a = Fraction(1, 2)
b = Fraction(1, 3)
print(a + b)  # 5/6
print(a * b)  # 1/6
```

**基本写法：约分**
`Fraction(<分子>, <分母>)`
```python
# 自动约分
print(Fraction(4, 6))  # 2/3
```

---

## Fraction 属性与方法

**基本写法：分子分母**
`f.numerator` | `f.denominator`
```python
# 获取分子分母
f = Fraction(3, 4)
print(f.numerator, f.denominator)  # 3 4
```

**基本写法：转 float**
`float(f)`
```python
# 转换为浮点
print(float(Fraction(1, 3)))  # 0.333...
```

**基本写法：limit_denominator 限制分母**
`f.limit_denominator(<最大分母>)`
```python
# 限制分母上限，常用浮点转分数
print(Fraction(0.5).limit_denominator(100))  # 1/2
print(Fraction(3.14159).limit_denominator(10))  # 22/7
```

---

## 应用场景

**基本写法：货币计算**
`Decimal` 用于货币
```python
# 货币精确计算
price = Decimal("19.99")
qty = Decimal("3")
total = price * qty
print(total.quantize(Decimal("0.00")))  # 59.97
```

**基本写法：百分比计算**
`Fraction` 用于比例
```python
# 比例运算保持精度
tax_rate = Fraction(5, 100)
amount = Decimal("100.00")
tax = amount * Decimal(tax_rate.numerator) / Decimal(tax_rate.denominator)
print(tax)
```

---

## 数值类型转换

**基本写法：Decimal 转 int**
`int(<Decimal>)`
```python
# 取整数部分
print(int(Decimal("3.99")))  # 3
```

**基本写法：Fraction 转 Decimal**
`Decimal(<Fraction>)`
```python
# 转换可能损失精度，建议先转字符串
f = Fraction(1, 3)
print(Decimal(f.numerator) / Decimal(f.denominator))
```
