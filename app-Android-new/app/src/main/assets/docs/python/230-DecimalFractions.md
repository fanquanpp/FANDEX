---
order: 230
title: Python decimal 与 fractions
module: 'python'
category: 后端技术
difficulty: beginner
description: 精确数值两件套：Decimal 十进制定点运算、Context 精度与舍入、Fraction 有理数运算。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/070-BasicDataType'
  - 'python/080-OperatorExpression'
prerequisites:
  - 'python/070-BasicDataType'
---

## 二进制浮点为什么"不准"

`0.1 + 0.2 == 0.3` 返回 False，不是 Python 的 bug：float 是 IEEE 754 二进制浮点，0.1 在二进制下是无限循环小数，只能存近似值。对绘图、游戏、统计模拟，这点误差无所谓；**对钱、对分数、对"必须能对账"的场景，近似就是事故**。标准库给了两把精确钥匙：`decimal.Decimal` 用十进制记录每一位数字（钱的标准答案），`fractions.Fraction` 用分子/分母记录精确比例（数学推导、比例分配的好帮手）。两者都支持任意精度，代价是比 float 慢——这正是"该精确的地方精确"的取舍。

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

---

## 常见陷阱与最佳实践

1. **必须从字符串或整数创建 Decimal**：`Decimal(0.1)` 把 float 的二进制近似值原样搬进来，得到 `0.1000000000000000055...`。任何来自外部的金额先转 `str` 再进 Decimal：`Decimal(str(0.1))` 只是补救，`Decimal("0.1")` 才是正解。

```python
from decimal import Decimal

print(Decimal(0.1))      # 0.1000000000000000055511151231257827021181583404541015625
print(Decimal("0.1"))    # 0.1
```

2. **默认舍入是银行家舍入（ROUND_HALF_EVEN）**：`Decimal("2.5").quantize(Decimal("1"))` 得 2 而不是 3，因为 2.5 平分时"趋向偶数"。业务约定"四舍五入"必须显式指定 `rounding=ROUND_HALF_UP`。
3. **精度只对运算结果生效，不约束你输入的数**：`getcontext().prec = 2` 不影响已有 Decimal 的位数，只影响加减乘除产生的新结果；除不尽的运算才会被截到 prec 位。
4. **别把 Decimal 和 float 混算**：`Decimal("1.1") + 0.1` 直接抛 TypeError——这是特性不是缺陷，它强迫你想清楚哪一边该转换。需要转就用 `Decimal(str(f))` 或 `float(d)`，并想清楚转换点就是精度损失点。
5. **分数用于"关系"，小数用于"金额"**：给 3 个人分 100 元，`Fraction(100, 3) * 3` 精确回到 100；Decimal 除法会被精度截断。比例、比率、推导用 Fraction，展示与结算用 Decimal（并 quantize 到分）。

## 本篇小结

1. float 的不精确来自二进制表示，Decimal 与 Fraction 分别以"十进制逐位"与"分子分母"两条路径换回精确，代价是性能。
2. Decimal 三件套：字符串构造（杜绝 float 污染）、Context 控精度与舍入（global 与 localcontext 两档）、quantize 落到业务小数位。
3. 舍入模式默认 ROUND_HALF_EVEN，"四舍五入"要显式 ROUND_HALF_UP——这一处几乎每个财务系统都踩过。
4. Fraction 运算全程自动约分且无损，`limit_denominator` 是浮点回归可读分数（如 22/7）的利器。

## 动手实践

1. 写一个购物车结算函数：单价与数量用 Decimal，输出未税价、税率 13%（Fraction 定义）、税额（quantize 到分）与总计，并验证 0.1 类商品价不产生误差。
2. 分别用 float、Decimal、Fraction 计算斐波那契相邻项之比趋于黄金分割的过程，观察三种表示在第几步出现差异。
3. 用 `limit_denominator(100)` 求圆周率近似分数（`Fraction(3.14159265)`），与 22/7、333/106 对比误差。
