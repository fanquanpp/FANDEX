---
order: 100
title: 变量与常量：名字、对象与赋值
module: 'python'
category: 后端技术
difficulty: beginner
description: 用游戏角色状态与排行榜场景讲透 Python 变量：名字绑定对象、可变与不可变、别名陷阱、常量约定与 typing.Final，附预测题与调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'python/070-BasicDataType'
  - 'python/100-FunctionDetailed'
  - 'python/530-TypeAnnotationMypy'
  - 'python/460-OOP'
prerequisites:
  - 'python/050-ProgramStructureBasicSyntax'
  - 'python/070-BasicDataType'
---

## 前置知识

- 已完成 [程序结构基本语法](/python/050-ProgramStructureBasicSyntax)：会写赋值语句、知道缩进块；
- 已完成 [基本数据类型](/python/070-BasicDataType)：认识 int、str、list、dict。

不需要任何更深的背景。本文解决一个前几篇一直没明说的问题：**`=` 到底做了什么？**

## 学习目标

读完本文你将能够：

1. 说出「变量是名字，不是盒子」这句话的准确含义，并用 `id()` 验证；
2. 预测别名（两个名字指向同一对象）时代码的行为，避开「改了 b，a 也变了」的经典陷阱；
3. 区分可变对象与不可变对象，并解释为什么 `b = b + [4]` 和 `b += [4]` 结果可能不同；
4. 用 `UPPER_CASE` 命名与 `typing.Final` 声明常量，知道 Python 为什么没有真正的常量；
5. 独立读懂并修复 `UnboundLocalError`。

预计 45 到 60 分钟，包含 3 组动手实验与 4 道练习。

## 1. 你现在要解决什么问题

假设你在写一个游戏的角色模块：

```python
hp = 100
player = {"name": "小明", "hp": hp}

hp = hp - 30          # 角色掉血
print(player["hp"])   # 请问输出多少？
```

直觉说「hp 已经减了，字典里应该也是 70」。运行结果是 **100**。为什么一个减了、一个没减？把这个问题带在身上，往下读。

## 2. 先不要看解释，先试试看

在终端进入 `python` 交互模式（REPL），逐段输入并**先预测再回车**：

```python
>>> x = 10
>>> y = x
>>> x = 20
>>> y
```

你预测 `y` 是 10 还是 20？记住你的答案，再输入最后一行。然后换个数据类型再来一次：

```python
>>> a = [1, 2]
>>> b = a
>>> b.append(3)
>>> a
```

这次 `a` 是 `[1, 2]` 还是 `[1, 2, 3]`？

两段代码结构完全一样（都是「第二个名字 = 第一个名字，然后改变第一个」），结果却一个不变、一个变了。接下来解释为什么。

## 3. 最小可运行示例：用 id() 看见「名字」

把下面的内容保存为 `alias.py` 并运行（`python alias.py`）：

```python
a = [1, 2]
b = a                 # 没有复制列表，只是给同一个列表起了第二个名字
print(id(a), id(b))   # 两个数字完全相同：同一个对象
print(a is b)         # True：is 判断「是不是同一个对象」

b.append(3)
print(a)              # [1, 2, 3] —— 你通过 b 改的，a 看得见

c = [1, 2]
d = [1, 2]
print(c == d)         # True：值相等
print(c is d)         # False：但是两个不同的对象
```

预期输出（`id` 的数字每次运行都不同，重要的是两个一样）：

```text
140234567890112 140234567890112
True
[1, 2, 3]
True
False
```

## 4. 发生了什么：变量是名字，不是盒子

Python 的 `=` 不做「把值装进盒子」，它做的是**绑定**：在当前作用域里，把一个**名字**贴到某个**对象**上。

```text
a = [1, 2]          名字 a ──→ 对象 [1, 2]
b = a               名字 b ──→ 同一个对象 [1, 2]（没有复制）
b.append(3)         对象被修改成 [1, 2, 3]，a 和 b 都指着它
```

回到开头两个实验：

- `x = 10; y = x`：`y` 绑定到对象 `10`。之后 `x = 20` 只是把 `x` 这个名字**改贴**到新对象 `20`，`y` 还贴在 `10` 上——所以 `y` 是 10。数字不可变，「改 x」从来不是改对象，而是换绑定；
- `a = [1, 2]; b = a`：`a`、`b` 是同一个列表的两个名字。`b.append(3)` 修改的是那个对象本身，两个名字都看得见。

再回头解开第 1 节的谜题：`hp = hp - 30` 把名字 `hp` 贴到新对象 `70`；而字典 `player` 里存的 `"hp"` 键仍然指向旧对象 `100`。整数不可变，字典里的值不会跟着外面的名字换绑定。

两个判断符的分工从此清晰：

- `==` 问「值一样吗」；
- `is` 问「是不是同一个对象」。日常代码用 `==`；`is` 主要用于 `x is None` 这类单例判断。

## 5. 核心概念：可变与不可变

| 类别 | 类型 | 赋值之后的「修改」行为 |
| --- | --- | --- |
| 不可变对象 | int、float、str、tuple、bool | 不能改对象本身，任何「修改」都是把名字贴到新对象 |
| 可变对象 | list、dict、set | 对象原地修改，所有绑定到它的名字同时看到变化 |

这解释了为什么字符串永远没有 `b.append` 之类的坑：

```python
s1 = "hello"
s2 = s1
s1 = s1 + "!"        # 产生新字符串对象，s1 换绑；s2 不受影响
print(s1, s2)        # hello! hello
```

## 6. 修改实验：亲手制造三种行为差异

以下实验都在 REPL 里做，**每个都先预测输出再运行**。

实验一：`+=` 对列表是原地修改还是换绑？

```python
a = [1, 2]
b = a
b += [3]      # 列表的 += 等价于 extend：原地修改
print(a)
```

实验二：把 `+=` 换成显式加法呢？

```python
a = [1, 2]
b = a
b = b + [3]   # 产生新列表，b 换绑
print(a)
```

实验三：元组（不可变）模仿一下列表的实验：

```python
t1 = (1, 2)
t2 = t1
t2 += (3,)
print(t1, t2)
```

正确答案：实验一输出 `[1, 2, 3]`（别名共享），实验二输出 `[1, 2]`（换绑隔离），实验三输出 `(1, 2) (1, 2, 3)`（不可变对象的 `+=` 只能换绑）。三个实验合起来说明：**行为差异不来自写法，而来自对象可不可变**。

## 7. 常量：约定、工具与现实

Python 没有 Java 的 `final`、JS 的 `const` 那样语言级不可重新赋值的常量。事实上的规则分三层：

第一层，社区约定：全大写 + 下划线表示「这个值不该被改」。

```python
MAX_RETRY = 3
DEFAULT_TIMEOUT_SECONDS = 30
PI = 3.14159
```

第二层，类型标注：`typing.Final` 把意图写进类型系统，静态检查工具会抓住重新赋值。

```python
from typing import Final

MAX_RETRY: Final = 3
MAX_RETRY = 5    # mypy 报错：Cannot assign to final name "MAX_RETRY"
```

（`mypy` 的安装与使用见 [类型标注与 mypy](/python/530-TypeAnnotationMypy)。）

第三层，认清现实：`Final` 只在静态检查时报警，解释器运行时依然允许改。**Python 的常量靠纪律与工具，不靠解释器**——这是它与很多语言的真实差异，写团队代码时尤其要记住。

什么时候值得提常量？当同一个魔法数字在文件里出现第三次的时候：

```python
# 差：3 是什么意思？改需求要改几处？
if retries > 3:
    ...

# 好：含义自解释，全局只改一处
MAX_RETRY = 3
if retries > MAX_RETRY:
    ...
```

## 8. 常见错误与调试实录

错误一：`UnboundLocalError`。运行下面的文件：

```python
count = 0

def increase():
    count = count + 1    # 这一行崩溃
    return count

increase()
```

报错（真实文本）：

```text
UnboundLocalError: cannot access local variable 'count' where it is not associated with a value
```

原因：函数体里只要对 `count` **赋过值**，`count` 在整个函数里就被当作局部名字；而赋值右边要先读它，读的时候局部 `count` 还不存在。修法不是背规则，而是想清楚数据流——函数应该通过参数收、返回值出：

```python
def increase(count):
    return count + 1

count = increase(count)   # 3 行解决，不碰作用域魔法
```

（`global` 语句存在，但让函数隐式修改外部状态，是团队代码的常见差评来源，入门期一律不用。）

错误二：「改了 b，a 也变了」。症状：函数里对传入的列表 `append`，调用方的列表也变了。这不是 bug，是第 3 节的别名行为；真需要独立副本时用 `b = a.copy()`（浅拷贝；嵌套结构的浅拷贝与深拷贝差异见官方 copy 模块文档：https://docs.python.org/zh-cn/3/library/copy.html ）。

错误三：把 `==` 写成 `is` 去比较值。`x is 10` 有时碰巧为 True（小整数缓存），换个大数就 False——这种「本地能跑、线上就炸」的问题最难查。规则：**比值用 `==`，`is` 只留给 `None`**。

## 9. 实际项目中的使用场景

- 配置常量集中在模块顶部或 `settings.py`：`MAX_UPLOAD_MB`、`API_BASE_URL`，配合 `Final` 与环境变量读取；
- 游戏角色、订单这类「会被修改的状态」用可变 dict 或类实例；「一经生成就不变」的数据（坐标、日期段）用 tuple 或 frozenset，天然免疫别名误改；
- 函数间传大列表时不复制、直接传名字（Python 的默认行为），省内存也省心——前提是双方约定好「谁有权改它」。

## 10. 小练习

预测题（不运行，先写答案）：

```python
m = [1, 2, 3]
n = m
m = m + [4]
print(n)
```

修改题：把第 1 节的角色代码改成 `player["hp"] = player["hp"] - 30`，让字典里的血量真正减少，并打印验证。

修 Bug 题：下面的代码想统计出现次数，运行报 `UnboundLocalError`。先读报错定位，再用「参数进、返回值出」修好它：

```python
total = 0

def add_score(points):
    total = total + points
    return total

add_score(10)
```

挑战题（不看答案，自己实现）：写一个函数 `swap(point)`，接收元组 `(x, y)`，返回 x、y 交换后的**新元组**，并保证传入的原元组不变。写完后用 `assert swap((1, 2)) == (2, 1)` 和 `assert point == (1, 2)` 自测。本文的修 Bug 题里已经照抄过 `def` 的写法，函数的完整讲解在下一篇——提前用没问题，理解不了的部分标记下来，[函数详解](/python/100-FunctionDetailed) 会全部揭晓。

## 11. 什么时候应该 / 不应该这样用

应该：给一切有业务含义的魔法数字提名字；状态用可变对象、不变数据用不可变对象；函数之间用参数与返回值传数据。

不应该：用全大写常量去装「运行中会变」的值（那不是常量，是命名错误）；用 `global` 绕开 `UnboundLocalError`；用 `is` 比较普通值。

## 12. 与之前和之后的知识的关系

- 往前：[运算符与表达式](/python/080-OperatorExpression) 算出来的值，从本文起有了「存住并复用」的正式机制；本文也解释了 070 篇里「字符串拼接产生新对象」的本质；
- 往后：[函数详解](/python/100-FunctionDetailed) 的参数传递**就是**本文的绑定行为（把实参对象贴给形参名字），第 8 节的 `UnboundLocalError` 也将在作用域一节彻底展开；
- 更远：理解「名字 vs 对象」后，[面向对象](/python/460-OOP) 的实例引用、[类型标注与 mypy](/python/530-TypeAnnotationMypy) 的 `Final` 才是水到渠成。

## 13. 官方文档

- 数据模型（绑定与对象的权威定义）：https://docs.python.org/zh-cn/3/reference/datamodel.html
- `typing.Final`：https://docs.python.org/zh-cn/3/library/typing.html#typing.Final
- PEP 8 命名约定（常量大写）：https://peps.python.org/pep-0008/#naming-conventions

## 14. 自我检查

- 能向别人解释「变量是名字不是盒子」，并现场用 `id()` 演示；
- 能预测别名场景下 list 与 int 的不同行为；
- 能不查资料写出 `Final` 常量并说出它何时报警、何时不拦；
- 拿到 `UnboundLocalError` 知道三步内定位并修复。

## 本章总结

`=` 是绑定名字到对象，不是复制值进盒子；可变对象原地改、别名共享，不可变对象「修改」即换绑；常量靠 `UPPER_CASE` 约定与 `Final` 工具，不靠解释器强制。这三件事解释了你目前写过的一半 Python 代码的真实行为，也是下一篇函数参数传递的全部基础。

## 下一步

进入 [函数详解](/python/100-FunctionDetailed)：带着「参数就是名字绑定」的视角，你会发现自己已经会一半了。
