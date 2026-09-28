---
order: 80
title: 基本数据类型：数据是有形状的
module: 'python'
category: 后端技术
difficulty: beginner
description: 用游戏角色档案讲透 int/float/str/bool/list/tuple/dict/set 七类数据的「什么时候用哪种」决策表、f-string 最小用法与类型转换，附 ValueError/TypeError 真实调试实录与四类练习。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'python/060-ControlFlow'
  - 'python/080-OperatorExpression'
  - 'python/090-VariableConstant'
  - 'python/140-BuiltinDataStructure'
prerequisites:
  - 'python/050-ProgramStructureBasicSyntax'
  - 'python/060-ControlFlow'
---

## 前置知识

- 已完成 [程序结构与基本语法](/python/050-ProgramStructureBasicSyntax)：会写赋值语句并运行脚本；
- 已完成 [控制流](/python/060-ControlFlow)：见过 if 与 for——本文两处示例用到 for，文中会说明，没学透也不影响主线。

## 学习目标

读完本文你将能够：

1. 拿到一段数据，按决策表选出正确的类型并说出理由；
2. 用 `type()` 查看任意数据的形状；
3. 在 str 与 int/float 之间正确转换，看到 `ValueError` 能定位是哪个值转不动；
4. 用 f-string 的最小用法把数字嵌进文字（细节在 120 篇）；
5. 预测 list 的增删、tuple 的拒绝修改与 set 的去重行为。

预计 45 到 60 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

数据有形状：分数是数字、名字是文字、装备是一排东西。写一个游戏角色档案，第一版随手一写：

```python
hp = "100"    # 血量，随手加了引号
hp = hp - 30  # 掉血
```

真实报错：

```text
Traceback (most recent call last):
  File "player.py", line 2, in <module>
    hp = hp - 30
         ~~~^~~~
TypeError: unsupported operand type(s) for -: 'str' and 'int'
```

`"100"` 和 `100` 看起来一样，在 Python 眼里是两种东西：前者是**文字**，后者是**数字**，文字不能做减法。程序怎么知道一个值是什么形状？你又该怎么决定给每个值什么形状？这就是本文要解决的。

## 2. 最小可运行示例：type() 看形状

把角色档案的每个字段都建出来，保存为 `types.py` 运行：

```python
name = "小明"                      # 文字
hp = 100                           # 整数
speed = 7.5                        # 小数
alive = True                       # 真 / 假
bag = ["木剑", "面包", "面包"]      # 一排东西
position = (12, 8)                 # 一组定死的坐标
stats = {"hp": 100, "mp": 30}      # 按名字查的属性表

print(type(name), type(hp), type(speed))
print(type(alive), type(bag))
print(type(position), type(stats))
```

预期输出：

```text
<class 'str'> <class 'int'> <class 'float'>
<class 'bool'> <class 'list'>
<class 'tuple'> <class 'dict'>
```

`type()` 返回值的类型。七种形状各管一摊，先看决策表，再逐个上手。

## 3. 核心概念：什么时候用哪种

| 类型 | 装什么 | 用在这 | 别用在这 |
| --- | --- | --- | --- |
| int / float | 数字：血量 100、移速 7.5 | 计数、次数、下标、运算 | 精确金额（用 int 存「分」，或见 230 篇 Decimal） |
| str | 文字：名字、输入、展示 | 一切「内容」 | 拿去做算术的数 |
| bool | True / False | 是否存活、是否完成 | 当数字参与运算 |
| list | 一排可增删的东西：背包 | 有顺序、会变化的集合 | 不许被改动的数据 |
| tuple | 一组定死的值：坐标 (12, 8) | 固定搭配 | 需要增删的集合 |
| dict | 名字对值：{"hp": 100} | 按名字查属性 | 键会重复的数据 |
| set | 一堆不重复的东西 | 去重、判断「在不在」 | 需要顺序或下标 |

记忆抓手是三个问题：要不要算术（数字）、会不会变（list 与 tuple 之争）、按什么找（按顺序 list、按名字 dict、只关心有没有 set）。

## 4. 逐个上手：最小示例与预期输出

**int / float**：

```python
hp = 100
speed = 7.5
print(hp / 4)            # 除法永远得到 float
print(10 // 3, 10 % 3)   # 整除取商、取余
print(0.1 + 0.2)
```

```text
25.0
3 1
0.30000000000000004
```

最后一行不是 bug：小数以二进制存储必有舍入，0.1 加 0.2 差之毫厘。精确算钱的方案见 [小数与分数](/python/230-DecimalFractions)。

**str**：

```python
name = "小明"
print(len(name))
print(name + "号玩家")
print("胜" * 3)
```

```text
2
小明号玩家
胜胜胜
```

`+` 两边必须都是文字；文字加数字会当场报错（第 7 节实录）。

**bool**：

```python
hp = 100
alive = True
print(alive, not alive)
print(hp == 100)         # 比较的结果就是 bool
print(bool(0), bool(""))
```

```text
True False
True
False False
```

为零、为空的算 False，非零非空算 True——060 篇 if 里的条件，本质就是 bool。

**list**：

```python
bag = ["木剑", "面包"]
bag.append("红药水")
print(bag, len(bag))
print(bag[0], bag[-1])   # 下标从 0 开始；-1 是最后一个
```

```text
['木剑', '面包', '红药水'] 3
木剑 红药水
```

**tuple**：

```python
position = (12, 8)
x, y = position          # 一次拆给两个变量
print(x, y)
```

```text
12 8
```

tuple 的存在意义是「不许改」：写 `position[0] = 20` 会被当场拒绝，报错原文见第 7 节。

**dict**：

```python
stats = {"hp": 100, "mp": 30}
print(stats["hp"])
stats["mp"] = stats["mp"] - 10
print(stats)
```

```text
100
{'hp': 100, 'mp': 20}
```

键是名字，值是数据，像给每个格子贴标签。

**set**：

```python
bag = ["面包", "红药水", "面包"]
print(set(bag))
print("红药水" in set(bag))
```

```text
{'面包', '红药水'}
True
```

set 自动去重且**无序**：换台机器打印顺序可能不同，别依赖顺序。

埋一句伏笔：list/dict/set 可以原地改，int/str/tuple 不可以——这个差异会造出「改了 b，a 也跟着变」的经典坑，细节在 [变量与常量](/python/090-VariableConstant) 讲透。

## 5. f-string：把值嵌进文字（最小用法）

```python
name = "小明"
hp = 86.5
print(f"{name} 的血量是 {hp:.1f}")
```

```text
小明 的血量是 86.5
```

引号前加 `f`，大括号里放变量或表达式；`:.1f` 表示保留一位小数。对齐、百分比、千分位等格式见 [字符串格式化与方法](/python/120-StringFormattingMethods)。

## 6. 类型转换：int() / float() / str()

从 `input()`、文件、网页读来的一切都是 str，计算前必须转换：

```python
hp_text = input("输入当前血量: ")   # 输入 80
hp = int(hp_text)
print(hp + 20)
```

输入 `80` 时输出 `100`。输入「八十」时真实报错：

```text
Traceback (most recent call last):
  File "convert.py", line 2, in <module>
    hp = int(hp_text)
ValueError: invalid literal for int() with base 10: '八十'
```

读报错三步：最后一行的 `ValueError` 是类型；`invalid literal ... with base 10` 说明 int() 只认「长得像整数的文字」；冒号后回显了闯祸的原文 `'八十'`——问题在输入内容，不在代码结构。

两个常用补充：

```python
print(int(float("3.14")))   # int 不认小数样式，先转 float 再取整
print(str(100) + " 分")     # 反方向：数字转成文字后才能拼接
```

```text
3
100 分
```

## 7. 常见错误与调试实录

错误一：文字减数字。第 1 节的现场完整走一遍三步：`TypeError` 指明「运算不支持这组操作数类型」；`for -: 'str' and 'int'` 说明减号左边是文字、右边是数字；`line 2` 定位到 `hp - 30`。修法：`hp = int("100")`，让两边同为数字。

错误二：改 tuple。

```python
position = (12, 8)
position[0] = 20
```

```text
Traceback (most recent call last):
  File "player.py", line 2, in <module>
    position[0] = 20
    ~~~~~~~~^^^
TypeError: 'tuple' object does not support item assignment
```

tuple 拒绝修改是设计而非缺陷：坐标这类「定死的值」正需要这层保护。需要增删就换 list。

错误三：浮点比较。

```python
import math
print(0.1 + 0.2 == 0.3)
print(math.isclose(0.1 + 0.2, 0.3))
```

```text
False
True
```

不要用 `==` 比较两个浮点计算结果，改用 `math.isclose` 判断「足够接近」（math 模块在 240 篇展开）。第 4 节的 `0.30000000000000004` 就是根源。

## 8. 修改实验

1. 给第 4 节的 stats 加一个 `"atk"` 键（攻击力 15），用 f-string 打印「攻击力: 15」。预计 5 分钟；
2. 把 position 改成三维坐标 (12, 8, 5)，一次拆给三个变量并打印。预计 5 分钟；
3. 向第 4 节的 bag 里再放两件重复装备，先预测 `len(set(bag))` 再运行验证；连跑三次脚本，观察 set 的打印顺序。预计 5 分钟。

## 9. 实际项目中的使用场景

- 游戏存档与业务数据同构：角色属性用 dict，背包与订单明细用 list，坐标与时间段用 tuple，标签去重用 set；
- 外部数据第一站：从文件、JSON、接口读来的一切先当 str 处理，转换后再计算（290 篇序列化、320 篇 HTTP 客户端都建立在本篇之上）；
- 报表与日志：f-string 拼装人类可读的输出。

## 10. 小练习

预测题一（先写答案再运行）：

```python
bag = ["红药水", "蓝药水", "红药水"]
print(len(bag), len(set(bag)))
```

预测题二：

```python
print(int("7") + float("2.5"))
print(str(7) + "0")
```

（两题预期输出从后往前读：`3 2` 与 `9.5`、`70`。）

修改题：把第 4 节的 stats 扩成完整角色卡（hp、mp、atk 三项），再写一段扣血代码：血量到 0 时把另一个变量 alive 改成 False 并打印验证。

修 Bug 题：下面的战斗计算运行即报错。按读报错三步定位后修复：

```python
hp_text = "100"
damage_text = "30"
hp = int(hp_text)
print(hp - damage_text)
```

```text
Traceback (most recent call last):
  File "battle.py", line 4, in <module>
    print(hp - damage_text)
          ~~~^~~~~~~~~~~~~
TypeError: unsupported operand type(s) for -: 'int' and 'str'
```

挑战题：建一个 dict 名叫 player，含 name（str）、hp（int）、alive（bool）、items（list，至少 3 件且恰好一件重复）、position（tuple）。用下面的断言自测：

```python
assert isinstance(player["alive"], bool)
assert len(player["items"]) == len(set(player["items"])) + 1
assert player["position"][0] + player["position"][1] == 20
```

提示：第二条断言的关键是 set 去重后恰好少一个。展开：重复装备放两件相同的即可；坐标选 (12, 8) 这类前两项之和为 20 的组合。

## 11. 与之前和之后的知识的关系

- 往前：050 篇的赋值语句从此知道自己在赋什么；060 篇里循环遍历的对象、if 里比较的结果，从此有了正式身份；
- 往后：[运算符与表达式](/python/080-OperatorExpression) 讲透 `+` 在 str 与 int 上行为为何完全不同；[变量与常量](/python/090-VariableConstant) 兑现第 4 节的可变/不可变伏笔；[字符串格式化与方法](/python/120-StringFormattingMethods) 展开 f-string 全部用法；[内置数据结构](/python/140-BuiltinDataStructure) 深入 list/tuple/dict/set 的方法大全与性能。

## 12. 官方文档

- 内置类型总览：https://docs.python.org/zh-cn/3/library/stdtypes.html
- 内置函数（int、float、str、type）：https://docs.python.org/zh-cn/3/library/functions.html
- 浮点算术的官方说明：https://docs.python.org/zh-cn/3/tutorial/floatingpoint.html

## 13. 自我检查

- 合上文档能复述决策表七行的「用在这 / 别用在这」；
- 看到 ValueError 报错能指出是哪个值、转哪个类型失败；
- 能预测 list 增删、tuple 赋值、set 去重三种行为；
- 能用 f-string 输出保留一位小数的数字；
- 能说出「可变 / 不可变」是哪几类之间的分界（细节允许现在不懂）。

## 本章总结

数据有形状：数字参与运算、文字承载内容、bool 表达真假、list 有序可变、tuple 定死不变、dict 按名查找、set 去重无序；str 到数字靠 int()/float() 转换，转不动就 ValueError；浮点有舍入，别用 == 比较计算结果。类型选对，后面的运算符、循环与函数才有的放矢。

## 下一步

进入 [运算符与表达式](/python/080-OperatorExpression)：这些形状的数据加、减、比较、组合起来会发生什么。
