---
order: 80
title: 运算符与表达式：让数据算起来
module: 'python'
category: 后端技术
difficulty: intermediate
description: 用排行榜平均分与角色血条场景讲透 Python 运算符：/ 与 // 的分野、% 的分页与轮询、逻辑短路、增强赋值与优先级括号，附 TypeError 与 ZeroDivisionError 调试实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/070-BasicDataType'
  - 'python/090-VariableConstant'
  - 'python/130-ExceptionHandling'
  - 'python/230-DecimalFractions'
prerequisites:
  - 'python/060-ControlFlow'
  - 'python/070-BasicDataType'
---

## 前置知识

- 已完成 [基本数据类型](/python/070-BasicDataType)：认识 int、float、str、bool 与 list，会用 print 和 f-string；
- [控制流](/python/060-ControlFlow) 里见过 if 的写法——本文只有一处修复用到一行 if，不熟也不影响主线。

## 学习目标

读完本文你将能够：

1. 预测 `/`、`//`、`%` 三种除法的输出，并说出各自的真实用途；
2. 用 `and`、`or`、`not` 组合条件，解释短路为什么让右侧「根本没执行」；
3. 用增强赋值改写「自己更新自己」的变量，并警惕 `/=` 偷偷改类型；
4. 读懂 `TypeError` 与 `ZeroDivisionError` 的报错原文，三步内定位修复；
5. 拿到复杂条件表达式，判断要不要加括号，并加在正确的位置。

预计 40 到 55 分钟，包含 1 组动手实验与 4 道练习。

## 1. 你现在要解决什么问题

你在写一个游戏排行榜。榜单不会自己出平均分，角色也不会自己掉血——数据只有被**运算**才有用：

```python
scores = [92, 87, 78, 95, 88]
total = 92 + 87 + 78 + 95 + 88    # 五个数字手抄了一遍
average = total / len(scores)
print(average)                    # 88.0

hp = 100
hp = hp - 30                      # 挨了一下打
print(hp)                         # 70
```

`+`、`-`、`/` 这些记号就是**运算符**，被运算符连起来的式子叫**表达式**——它总能算出一个值。这段程序能跑，但有两个疑问值得带在身上：

1. `440 / 5` 明明整除，结果为什么是 `88.0` 带个小数点？
2. `total` 那行把每个分数都抄了一遍，换一份榜单就得重抄——有没有更好的写法？

## 2. 先不要看解释，先试试看

进入 `python` 交互模式（REPL），逐行输入，**每行先在纸上预测结果再回车**：

```python
>>> 10 / 3
>>> 10 // 3
>>> 10 % 3
>>> 7 % 2
>>> 8 % 2
```

它们都叫「除法家族」，干的活却完全不同。记住你预测的输出，下一节对照。

## 3. 最小可运行示例：一个分页计算器

帖子有 235 条回复，每页显示 20 条。产品要算出总页数，以及第 47 条（从 0 开始数）在第几页。保存为 `pagination.py` 并运行：

```python
total_records = 235
page_size = 20

# 总页数：先假设末页装满，再给余数补一页
last_page = (total_records - 1) // page_size + 1
print(last_page)

# 第 47 条记录在第几页
record_index = 47
print(record_index // page_size + 1)
```

预期输出：

```text
12
11
3
```

用 `/` 算会得到 `235 / 20 == 11.75`——页数不可能是 11.75 页。整页数要用 `//`，末尾不满一页的零头要用 `%`。三个符号各司其职，这就是分页功能的全部数学。

## 4. 发生了什么：算术运算符与两种除法

`+`、`-`、`*` 的行为和数学课一致，不赘述。真正要展开的是除法家族的分工：

- `/` **真除法**：永远返回 float，哪怕整除。`440 / 5` 是 `88.0`——第 1 节的小数点之谜就是它；
- `//` **地板除**：向下取整。`235 // 20` 是 11，含义是「能装满 11 页」；
- `%` **取模**：取余数。`235 % 20` 是 15，含义是「最后一页只有 15 条」。

`%` 的出场率远高于直觉，三个高频用途：

```python
# 用途一：奇偶判断（余 0 是偶数，余 1 是奇数）
print(17 % 2, 8 % 2)          # 1 0

# 用途二：轮询：请求轮流分发到 3 台服务器
servers = ["api-1", "api-2", "api-3"]
request_count = 7
target = servers[request_count % len(servers)]
print(target)                 # api-2
```

`%` 还有第三个常见身份：周期与冷却——`elapsed % cooldown` 直接得到新一轮已过时间。三个细节补齐：负数的地板除向更小方向取整，`-7 // 2` 是 `-4` 不是 `-3`；幂用 `**`，`2 ** 10` 是 1024；浮点数自带表示误差，与钱相关的运算别用 float 硬扛——`0.1 + 0.2` 的结果是 `0.30000000000000004`，等于 `0.3` 的判断是 False（二进制浮点的本性，精确小数见 [decimal 与 fractions](/python/230-DecimalFractions)）。

回收第 1 节的疑问二：求和不必手抄数字，内置 `sum(scores)` 一行解决。

## 5. 比较与逻辑：表达式怎么变成 True 和 False

比较运算符 `==`、`!=`、`>`、`<`、`>=`、`<=` 的返回值永远是 bool：

```python
hp = 70
print(hp > 0)             # True
print(hp == 100)          # False
print(0 <= hp <= 100)     # True：链式比较，等价于 0 <= hp and hp <= 100
```

单个条件常常不够用。「活着且等级够」「管理员或会员」需要逻辑运算符 `and`、`or`、`not`，它们的关键行为是**短路**——结果已定时，右边不再执行。让除零来当证人：右边若被执行，`x` 为 0 时必然崩溃，而它没有：

```python
x = 0
print(x != 0 and 10 / x > 1)   # False，而不是 ZeroDivisionError
```

左边 `x != 0` 一票否决，右边 `10 / x` 根本没算——这就是防护写法的全部原理：把便宜的、能拦住危险的条件放左边。

`or` 常用来给默认值，但它认的是「假值」而不只是 None：

```python
nickname = ""
print(nickname or "无名玩家")   # 无名玩家

score = 0
print(score or 100)             # 100 —— 0 是合法成绩，也被换掉了，这是坑
```

顺带认识成员运算符 `in`：判断值在不在容器里，返回 bool。`"治疗药水" in bag` 查列表元素，`"age" in player` 查字典的**键**。

## 6. 赋值与增强赋值：自己更新自己

「血量减少」是同一个变量自己更新自己：`hp = hp - 30`。Python 给了它简写——增强赋值：

```python
hp = 100
damage = 30
hp -= damage              # 等价于 hp = hp - damage
print(hp)                 # 70

count = 10
count /= 2                # 等价于 count = count / 2
print(count)              # 5.0 —— 注意：count 已经不是 int，是 float
```

常用的五个：`+=`、`-=`、`*=`、`/=`、`//=`。`/=` 会把 int 变 float（因为 `/` 永远真除），要保持整数用 `//=`。至于 `=` 本身做了什么，比「把值放进去」微妙得多，下一篇 [变量与常量](/python/090-VariableConstant) 用整篇讲清。

运算符不只服务数字。字符串的 `+` 是拼接，`*` 是重复——游戏血条一行画出来：

```python
hp = 70
bar = "[" + "#" * (hp // 10) + "." * (10 - hp // 10) + "]"
print(bar)
```

预期输出：

```text
[#######...]
```

七格实心代表 70 点血。拼接量小到一行时用 `+` 没问题；上百段拼接请改用 `join`（[字符串格式化与方法](/python/120-StringFormattingMethods)）。

## 7. 优先级与括号：谁先算

求值顺序有规则：`**` 高于乘除，乘除高于加减，比较高于 `not`，`not` 高于 `and`，`and` 高于 `or`。多数时候符合直觉，但 `and` 与 `or` 混用极易翻车：

```python
hp = 0          # 玩家已死
level = 2
is_admin = True

# 意图一：活人且 3 级以上才能进，管理员无条件放行
print((hp > 0 and level >= 3) or is_admin)   # True：管理员放行，没问题

# 意图二：活人，且（3 级以上或是管理员）
print(hp > 0 and level >= 3 or is_admin)     # 还是 True —— 出事了
```

意图二的代码省掉括号后，实际含义是 `(hp > 0 and level >= 3) or is_admin`：死掉的 2 级管理员照样进场。**`and` 与 `or` 混用不加括号是经典权限事故**。规则只有一条：没把握就加括号——括号不要钱，还替读的人省一次查表。

## 8. 修改实验

以下实验基于 `pagination.py` 与第 5、6 节的代码，每个先预测再运行：

1. 把 `page_size` 改成 50，预测 `last_page`；再把 `total_records` 改成 201，验证整除边界上公式也不翻车；
2. 把轮询的 `request_count` 改成 9 和 10，验证请求重新落回 `api-1` 与 `api-2`；想让它「跳过 api-2」，该改哪个数？
3. 把血条的 `hp` 改成 35 与 5，数一数格子；再把表达式里两处 `hp // 10` 只改一处，看看程序如何无声地错起来——重复定义正是下一篇函数要终结的问题。

## 9. 常见错误与调试实录

错误一：`TypeError`。运行这个文件：

```python
# battleground.py
hp = "满血"
print(hp - 30)
```

报错（真实文本）：

```text
Traceback (most recent call last):
  File "battleground.py", line 2, in <module>
    print(hp - 30)
          ~~~^~~~
TypeError: unsupported operand type(s) for -: 'str' and 'int'
```

读报错三步：`line 2` 定位到行；`unsupported operand type(s) for -: 'str' and 'int'` 说明 `-` 不接受「字符串减整数」；问题在源头——数字存成了字符串。新手最常见的变体来自 `input()`：它**永远返回字符串**，`"5" + 1` 会得到另一条原文为 `TypeError: can only concatenate str (not "int") to str` 的报错。修法都是在源头用 `int(变量)` 转换，而不是在运算处硬转。

错误二：`ZeroDivisionError`。排行榜空了还要求平均分：

```python
# average.py
scores = []
average = sum(scores) / len(scores)
print(average)
```

报错（真实文本）：

```text
Traceback (most recent call last):
  File "average.py", line 2, in <module>
    average = sum(scores) / len(scores)
              ~~~~~~~~~~~~^~~~~~~~~~~~~
ZeroDivisionError: division by zero
```

三步定位：`line 2`、`division by zero`、除数是 `len(scores)` 且它为 0。修复思路是「先检查再除」：

```python
if len(scores) == 0:
    average = 0.0
else:
    average = sum(scores) / len(scores)
```

有人用 `and` 短路压成一行 `len(scores) > 0 and sum(scores) / len(scores)`——空列表时得到的是 `False` 而不是数字，不如老实的 if。系统性的捕获与抛出在 [异常处理](/python/130-ExceptionHandling) 展开。

## 10. 实际项目中的使用场景

- 分页与游标：`(total - 1) // page_size + 1` 算总页数；
- 负载分配：`request_count % len(servers)` 轮询分发，`hash(key) % shard_count` 简单分片；
- 界面表现：`"#" * percent` 画进度条与血条，`(now - last_time) % cooldown` 算冷却剩余。

## 11. 小练习

预测题（5 分钟，先写答案再运行验证）：

```python
print(True + True)
print(10 / 3, 10 // 3, 10 % 3)
print(-7 // 2)
print(2 + 3 * 2 ** 2)
```

参考答案（先自己算完再看）：`True + True` 是 `2`——bool 是 int 的子类，`True` 参与算术时就是 1；第二行 `3.3333333333333335 3 1`；第三行 `-4`；第四行 `14`（先 `**` 再 `*` 后 `+`）。

修改题（5 分钟）：把第 6 节的血条改成每格 20 点血（共 5 格），观察 `hp = 70` 与 `hp = 5` 的输出。预期：`[###..]` 与 `[.....]`——5 点血一格都画不出来，要不要「至少显示一格」？

修 Bug 题（10 分钟）：记账脚本崩溃了，报错原文 `TypeError: unsupported operand type(s) for -: 'str' and 'int'`。按读报错三步定位并修复：

```python
# budget.py
budget = input("本月预算：")    # 用户输入 500
left = budget - 350
print(left)
```

挑战题（15 分钟，不看提示先自己试）：不用 if，只用 `//` 与 `%` 写一个表达式，根据总条数 `total` 与页大小 `page_size` 算出总页数，并用断言自测。下面的验收借用了函数定义 `def` 的写法——现在先照抄即可，下一篇 [函数详解](/python/100-FunctionDetailed) 讲透；不想提前碰函数，就把表达式直接 `print` 出来对照：

```python
def pages(total, page_size):
    return (total + page_size - 1) // page_size

assert pages(235, 20) == 12
assert pages(200, 20) == 10
assert pages(1, 20) == 1
```

提示：想想「把总数补齐到整页」该怎么补。展开：`(total + page_size - 1) // page_size`，真实代码库里出现频率极高。

## 12. 什么时候应该 / 不应该

应该：整数场景（页数、个数、下标）用 `//` 与 `%`；复杂条件主动加括号；把能一票否决的条件放 `and` 左侧吃短路红利。不应该：背优先级表硬读多层表达式而不加括号；用 `or` 默认值接管可能是 `0` 或 `""` 的合法输入；金额计算裸用 float；炫技写单行长表达式。

## 13. 与之前和之后的知识的关系

- 往前：[基本数据类型](/python/070-BasicDataType) 给了数据的「名词」，本文给了「动词」；
- 往后：[变量与常量](/python/090-VariableConstant) 解释 `=` 的绑定本质，让运算结果存得住、可复用；两类报错的系统性处理在 [异常处理](/python/130-ExceptionHandling) 展开；
- 更远：按位运算符（`&`、`|`）业务代码很少遇到，用到时查官方参考即可。

## 14. 官方文档

- 表达式与运算符（权威参考）：https://docs.python.org/zh-cn/3/reference/expressions.html
- 运算符优先级表：https://docs.python.org/zh-cn/3/reference/expressions.html#operator-precedence
- 数字类型的运算规则：https://docs.python.org/zh-cn/3/library/stdtypes.html#numeric-types-int-float-complex

## 15. 自我检查

- 能不看资料预测 `/`、`//`、`%` 在 10 与 3 上的全部输出，并各举一个真实用途；
- 能解释为什么 `True + True` 是 2、为什么 `0.1 + 0.2 != 0.3`；
- 给一段 `and`/`or` 混用代码，能说出求值顺序并正确加括号；
- 拿到 `TypeError` 或 `ZeroDivisionError`，能三步内定位到行与类型组合。

## 本章总结

`/` 永远给 float，`//` 给整页数，`%` 给零头——分页、奇偶、轮询全靠这对组合；比较产生 bool，`and`/`or` 用短路拦住危险计算，但 `or` 认的是假值；增强赋值是自我更新的简写，`/=` 会改类型；优先级没把握就加括号。报错原文是最好的老师：`TypeError` 报类型组合，`ZeroDivisionError` 报除数为零，读三步就能定位。

## 下一步

进入 [变量与常量](/python/090-VariableConstant)：算出来的值总得存下来复用，而 `=` 的真实行为比你想的更有意思。
