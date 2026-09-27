---
order: 100
title: 函数详解：不重复自己
module: 'python'
category: 后端技术
difficulty: intermediate
description: 从三处复制的结算逻辑讲起：参数设计、返回值、局部作用域、可变默认参数事故、docstring 与类型提示，最后把排行榜封装成函数库，附真实 TypeError 调试实录。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'python/140-BuiltinDataStructure'
  - 'python/110-ArgsKwargsUnpacking'
  - 'python/130-ExceptionHandling'
  - 'python/530-TypeAnnotationMypy'
  - 'python/460-OOP'
prerequisites:
  - 'python/090-VariableConstant'
  - 'python/070-BasicDataType'
---

## 前置知识

- 已完成 [变量与常量](/python/090-VariableConstant)：知道「变量是名字绑定对象」，见过 `UnboundLocalError` 实录；
- 已完成 [内置数据结构](/python/140-BuiltinDataStructure)：会对列表 `append`、取 `len`，会读写字典。

只在 070 篇认识过这两种容器也可以读。这是模块承上启下的一篇：前面的零件在这里组装成「能复用的程序」。

## 学习目标

读完本文你将能够：

1. 把复制了三遍的结算逻辑封装成一个函数，说清「参数进、返回值出」的数据流；
2. 用位置参数、关键字参数与默认值设计好用的函数签名；
3. 预测函数内赋值的行为，并用 `None` 默认值修掉「共享列表」的事故；
4. 给函数写 docstring 与最小类型提示；
5. 把排行榜逻辑重构成可复用、可断言的函数库。

预计 60 到 75 分钟，含 1 组实验、4 道练习与 1 个综合小项目。

## 1. 你现在要解决什么问题

同样的结算逻辑，复制了三遍：

```python
players = {"小明": [92, 87, 78], "小红": [95, 99, 91], "小刚": [60, 75, 81]}

# 结算小明
total = sum(players["小明"])
average = total / len(players["小明"])
if average >= 85:
    status = "达标"
else:
    status = "未达标"
print(f"小明: 总分 {total}，平均 {average:.1f}，{status}")
# 结算小红 —— 复制
total = sum(players["小红"])
average = total / len(players["小红"])
if average >= 85:
    status = "达标"
else:
    status = "未达标"
print(f"小红: 总分 {total}，平均 {average:.1f}，{status}")
# 结算小刚 —— 又复制，而且手滑把 85 敲成了 58
total = sum(players["小刚"])
average = total / len(players["小刚"])
if average >= 58:
    status = "达标"
else:
    status = "未达标"
print(f"小刚: 总分 {total}，平均 {average:.1f}，{status}")
```

预期输出：

```text
小明: 总分 257，平均 85.7，达标
小红: 总分 285，平均 95.0，达标
小刚: 总分 216，平均 72.0，达标
```

最后一行是错的：小刚 72 分低于 85，应该是「未达标」。但 85 被敲成 58 之后，输出看起来一切正常——**复制粘贴的事故不会在粘贴时爆炸，而在你意想不到的时刻**。三天后策划说「达标线改成 90」，要改三处，改一处漏两处几乎是必然。函数的使命只有一个：**把重复的逻辑写成一份，让不同的数据复用它**。

## 2. 先不要看解释，先试试看

进入 REPL，逐段输入并先预测：

```python
>>> def add(a, b):
...     return a + b
...
>>> add(2, 3) * 10
50

>>> def add_bad(a, b):
...     print(a + b)
...
>>> add_bad(2, 3)
5
>>> add_bad(2, 3) * 10
```

两个函数的第一个输出都是 5，看起来只差一个词。但最后一步 `* 10`，两边会同样顺利吗？第 4 节揭晓。

## 3. 最小可运行示例：结算函数

把三份复制收编成一个函数，保存为 `settle.py` 并运行：

```python
def settle(name, scores, threshold=85):
    total = sum(scores)
    average = total / len(scores)
    if average >= threshold:
        status = "达标"
    else:
        status = "未达标"
    return f"{name}: 总分 {total}，平均 {average:.1f}，{status}"

print(settle("小明", [92, 87, 78]))
print(settle("小红", [95, 99, 91]))
print(settle("小刚", [60, 75, 81]))
print(settle("小刚", [60, 75, 81], threshold=60))
```

预期输出：

```text
小明: 总分 257，平均 85.7，达标
小红: 总分 285，平均 95.0，达标
小刚: 总分 216，平均 72.0，未达标
小刚: 总分 216，平均 72.0，达标
```

18 行复制缩成一个定义加四次调用；85 到 58 的手滑不再可能——阈值只写一处，第四行还证明它能按需覆盖。

## 4. 发生了什么：定义与调用

`def settle(name, scores, threshold=85):` 把一段代码打包成**函数对象**，并把名字 `settle` 绑定到它——和 090 篇的 `=` 是同一种绑定。打包不等于执行：**函数体只在被调用时才跑**。调用时发生两件事：**参数绑定**——把 `"小明"` 贴给 `name`、列表贴给 `scores`，与 `name = "小明"` 同种绑定，别名行为遵循 090 篇；**执行到 return**——立即结束函数，把后面的值交回调用处。

第 2 节的悬念揭晓：`add_bad` 只有 `print` 没有 `return`，函数本身交回 `None`，那步运算等于 `None * 10`，当场崩溃（完整报错在第 11 节）。**「看着有输出」和「交回了值」是两回事**——新手函数的头号陷阱。

## 5. 参数设计：位置、关键字与默认值

**位置参数**按顺序对号入座，数量必须吻合。**关键字参数**用 `名字=值` 传，可读性大增且顺序自由。**默认值**让参数可选：签名 `create_player(name, level=1, region="国服")` 允许 `create_player("小明")` 用全套默认值、`create_player("小红", level=10)` 只覆盖一项、`create_player("小刚", region="亚服", level=5)` 乱序覆盖。

两条语法与设计规则：

1. 有默认值的参数必须排在无默认值后面（`def f(a, b=1)` 合法，`def f(a=1, b)` 直接语法错误）；
2. 调用时位置实参在前、关键字实参在后，`settle(name="小刚", [60, 75, 81])` 这样的写法是语法错误。

数量给多了会当场收到 `TypeError: settle() takes from 2 to 3 positional arguments but 4 were given`——「允许几个」「实际几个」都报了。参数个数不固定时，`*args` 与 `**kwargs` 分别收集多余的位置与关键字参数；先混个眼熟，[第 110 篇](/python/110-ArgsKwargsUnpacking) 用整篇讲透星号。

## 6. 返回值：参数进，返回值出

函数与外界的正当通道只有两条：参数进，返回值出（「返回多个值」是打包成元组，见 110 篇）。先看更重要的模式——**早退**：

```python
def average_of(scores):
    if len(scores) == 0:
        return 0.0          # 早退：没有数据就不往下算
    return sum(scores) / len(scores)

print(average_of([]))       # 0.0
print(average_of([92, 87])) # 89.5
```

080 篇那个 `ZeroDivisionError`，在这里变成「先检查、再计算」的守卫条款：危险输入在函数门口就被拦下。函数一执行到 `return` 就结束，特殊情况与主逻辑各归各位。

## 7. 作用域：函数内赋值是局部的

本文只讲一条规则：**函数体里赋过值的名字都是局部的**，函数一结束就消失。

```python
MIN_SCORE = 60

def is_passed(score):
    verdict = score >= MIN_SCORE    # 读外面的名字：允许
    return verdict

print(is_passed(75))    # True
# print(verdict)        # NameError：verdict 是局部名字，函数外不存在
```

需要外部数据就走参数。`count = count + 1` 为何在函数里崩出 `UnboundLocalError`，090 篇第 8 节有完整实录，本文不重复。记一条纪律：**数据一律参数进、返回值出；全局常量只读不写**。

## 8. 可变默认参数：一场真实事故

默认值是数字与字符串时相安无事，换成列表立刻失控：

```python
def add_member(member, roster=[]):
    roster.append(member)
    return roster

team_a = add_member("小明")
print(team_a)
team_b = add_member("小红")
print(team_b)
```

预期输出——请先预测再运行，多数人会错：

```text
['小明']
['小明', '小红']
```

小红的队伍里凭空躺着小明。原因：**默认值在 `def` 执行时创建一次，之后所有调用共享同一个列表对象**——每次不传 `roster` 的调用都在往同一个对象 append。函数把这个默认值一直揣在身上：

```python
print(add_member.__defaults__)    # (['小明', '小红'],)
```

修法是固定搭配「`None` 默认值 + 函数内新建」：

```python
def add_member(member, roster=None):
    if roster is None:
        roster = []
    roster.append(member)
    return roster
```

规则：**默认值永远用不可变对象**（`None`、数字、字符串、元组）；要「可变的空容器」就写 `=None` 再在函数里新建。这个坑在官方 FAQ 里挂了十几年。

## 9. 文档字符串与类型提示

函数写完只是开始。两件低成本高回报的事：

**docstring**：函数体第一行写三引号字符串（第 13 节函数库每个函数都带了），`help(settle)` 能把它读出来。**类型提示**：把参数与返回值的类型写进签名：

```python
def settle(name: str, scores: list[float], threshold: int = 85) -> str:
```

认清边界：注解写给人看、给工具看，**解释器运行时不强制**——类型错误要靠 mypy 在运行前抓（`list[float]` 需要 Python 3.9+）。完整工作流见 [类型注解与 mypy](/python/530-TypeAnnotationMypy)。

## 10. 修改实验

以下实验基于 `settle.py`，每个先预测再运行：

1. 把达标线默认值改成 90 重跑——谁的达标状态变了？再删掉第四个调用的 `threshold=60`，体会「一处定义，处处生效」；
2. 把调用改成 `settle(threshold=85, name="测试", scores=[100])`——关键字乱序也能跑通；把 `[100]` 挪到 `name` 的位置就跑不通，这就是位置参数的规矩；
3. 把 `average_of` 的早退分支删掉，用 `average_of([])` 调用——080 篇的 `ZeroDivisionError` 当场复活。

## 11. 常见错误与调试实录

把 `print` 当 `return` 用：

```python
# calc.py
def add(a, b):
    print(a + b)

result = add(2, 3)
print(result * 10)
```

报错（真实文本）：

```text
Traceback (most recent call last):
  File "calc.py", line 5, in <module>
    print(result * 10)
          ~~~~~^~~~~~
TypeError: unsupported operand type(s) for *: 'NoneType' and 'int'
```

读报错三步：`line 5` 是崩溃点；`'NoneType' and 'int'` 说明 `result` 是 `None`；问题上移——`add` 没有 `return`，改成 `return a + b` 即修复。以后见到 `NoneType` 参与运算，先怀疑「函数忘了返回值」。

## 12. 实际项目中的使用场景

- 函数签名就是接口：参数名与默认值是给同事的文档，类型提示是给工具的合同；参数进、返回值出的函数才可测试（见 [测试基础](/software-testing/010-TestBasicsMethod)）。

边界：逻辑出现第二次就警觉、第三次必须封装；不要写大杂烩函数，不要用 `global`，不要拿可变对象当默认值，不要把 `print` 当返回值。

## 13. 综合小项目：排行榜函数库

把排行榜逻辑收编成 `leaderboard.py`——每个函数只做一件事，互相复用：

```python
def average(scores):
    """平均分；空列表返回 0.0，不抛 ZeroDivisionError。"""
    if len(scores) == 0:
        return 0.0
    return sum(scores) / len(scores)


def settle(name, scores, threshold=85):
    """结算一名玩家，返回一行报告。"""
    avg = average(scores)
    if avg >= threshold:
        status = "达标"
    else:
        status = "未达标"
    return f"{name}: 平均 {avg:.1f}，{status}"


def report(players, threshold=85):
    """打印整份榜单的结算报告，返回达标人数。"""
    passed = 0
    for name in players:
        scores = players[name]
        print(settle(name, scores, threshold))
        if average(scores) >= threshold:
            passed += 1
    return passed


players = {"小明": [92, 87, 78], "小红": [95, 99, 91], "小刚": [60, 75, 81]}

qualified = report(players)
print(f"共 {qualified} 人达标")
```

预期输出：

```text
小明: 平均 85.7，达标
小红: 平均 95.0，达标
小刚: 平均 72.0，未达标
共 2 人达标
```

三个设计点：**组合代替复制**——`settle` 调 `average`，`report` 调 `settle`，18 行复制变成一条流水线；**前几篇在此会师**——`avg >= threshold` 是 080 的比较运算，`players[name]` 是 090 的绑定，数据全走参数与返回值；这个文件已经是一个**模块**，别的文件 `from leaderboard import settle` 就能复用（见 720 篇）。

## 14. 小练习

预测题（5 分钟，先写答案再运行）：

```python
def double(x):
    x = x * 2
    return x

n = 5
result = double(n)
print(n, result)

def greet(name, greeting="你好"):
    return greeting + "，" + name

print(greet("小明"))
print(greet("小明", "早上好"))
print(greet(greeting="晚上好", name="小红"))
```

参考答案（先算再看）：`5 10`——函数内对 `x` 赋值是局部的，外面的 `n` 纹丝不动（090 与第 7 节的合体应用）；后面三行是 `你好，小明`、`早上好，小明`、`晚上好，小红`。

修改题（10 分钟）：给 `settle` 升级输出，达标报出高出多少、未达标报出差多少，例如 `小明: 平均 85.7，达标（高出 0.7 分）`。只需要算术与 f-string。

修 Bug 题（15 分钟）：购物车订单串单了。先预测输出，运行对照，再按第 8 节修复：

```python
# cart.py
def add_item(item, cart=[]):
    cart.append(item)
    return cart

order_a = add_item("苹果")
order_b = add_item("牛奶")
print(order_a)
print(order_b)
```

真实行为演示——你会看到：

```text
['苹果', '牛奶']
['苹果', '牛奶']
```

订单 A 的购物车凭空多出一瓶牛奶。按第 8 节修好，重跑到两行分别是 `['苹果']` 与 `['牛奶']`。

挑战题（半小时，不给代码）：给 `leaderboard.py` 新增函数 `best(players)`，返回平均分最高的玩家名，空字典返回 `None`。验收断言：

```python
assert best({"甲": [50, 60], "乙": [80]}) == "乙"
assert best({}) is None
```

提示：维护「目前为止最高」的两个变量，边遍历边更新。展开：`for` 加 `if` 比较即可，不需要排序；排整张榜单等 160 篇的 `sorted`。

## 15. 与之前和之后的知识的关系

- 往前：[变量与常量](/python/090-VariableConstant) 的绑定行为就是参数传递，可变默认参数事故正是别名规则在签名上的重演；080 的 `ZeroDivisionError` 在本文进化成早退守卫；
- 往后：[第 110 篇](/python/110-ArgsKwargsUnpacking) 补齐 `*args`、`**kwargs` 与解包；[异常处理](/python/130-ExceptionHandling) 教函数体面报错；[面向对象](/python/460-OOP) 的方法就是住在类里的函数；[类型注解与 mypy](/python/530-TypeAnnotationMypy) 把第 9 节讲成完整工作流。

## 官方文档

- 函数定义（权威参考）：https://docs.python.org/zh-cn/3/reference/compound_stmts.html#function-definitions
- 编程 FAQ（含默认参数求值时机）：https://docs.python.org/zh-cn/3/faq/programming.html
- PEP 257（docstring 约定）：https://peps.python.org/pep-0257/

## 自我检查

- 能不看示例写出「参数进、返回值出」的函数，并说清 `print` 与 `return` 的区别；
- 能预测共享默认列表的输出，用 `__defaults__` 验证并用 `None` 默认值修复；
- 拿到重复三遍的代码块，能十分钟内收编成带默认参数与 docstring 的函数。

## 本章总结

函数是把逻辑打包复用的正道：`def` 绑定名字，调用时绑定参数，`return` 交回值（没有就是 `None`）。签名三板斧是位置参数、关键字参数、默认值；数据只走参数进、返回值出，函数内赋值都是局部的。可变默认参数是 FAQ 级经典事故——默认值在定义时创建一次并被所有调用共享，修法永远是 `None` 加函数内新建。签名即文档：docstring 给人读，类型提示给工具查。排行榜函数库证明前几篇的零件已能组装成真正的程序。

## 下一步

进入 [\*args、\*\*kwargs 与解包](/python/110-ArgsKwargsUnpacking)：当参数个数本身都不固定时，星号登场——那是参数系统的最后一块拼图。
