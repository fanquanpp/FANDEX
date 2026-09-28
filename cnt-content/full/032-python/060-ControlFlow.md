---
order: 70
title: 控制流：让程序会判断、会重复
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以猜数字游戏为主线讲透 if/elif/else、while 与 for、range 与 break/continue：条件怎么写、两种循环怎么选，附 IndentationError 与死循环的真实调试实录、预测题与修 Bug 练习。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'python/050-ProgramStructureBasicSyntax'
  - 'python/070-BasicDataType'
  - 'python/080-OperatorExpression'
  - 'python/130-ExceptionHandling'
prerequisites:
  - 'python/050-ProgramStructureBasicSyntax'
---

## 前置知识

- 已完成 [程序结构与基本语法](/python/050-ProgramStructureBasicSyntax)：知道缩进块是 Python 语法的一部分，会写赋值语句并运行脚本；
- 没学过也能跟：本文只用最少的数据类型与运算符，首次出现时会注明后面哪一篇讲透。

## 学习目标

读完本文你将能够：

1. 用 `if`/`elif`/`else` 让程序对不同输入做出不同回应，并说清三个分支的执行顺序；
2. 在「次数已知」与「次数未知」之间正确选择 `for` 或 `while`，并用 `range()` 生成序列；
3. 用 `break` 与 `continue` 控制循环，独立写出完整可玩的猜数字游戏；
4. 看到 `IndentationError` 时按报错定位到缺缩进的那一行；
5. 程序卡死时知道按 `Ctrl+C` 紧急中断，并排查循环条件为什么永远为真。

预计 45 到 60 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

程序不能只会从上往下。猜数字游戏为什么需要判断和重复？来看一个最小版本：电脑心里想一个数（先写死成 7），你输入一个猜测。立刻会遇到两件「从上往下逐行执行」做不到的事：

- 回应必须分情况：猜小了、猜大了、猜对了是三种不同的话，不可能三行都打印；
- 只许猜一次的游戏没法玩，程序得反复问你，直到猜对为止。

前者靠**条件**（if），后者靠**循环**（while/for）。合称控制流：控制程序走哪条路、走多少遍。

## 2. 先解决「分情况」：if / elif / else

保存为 `guess1.py` 并运行：

```python
secret = 7
guess = int(input("猜一个 1 到 10 的数: "))

if guess < secret:
    print("小了")
elif guess > secret:
    print("大了")
else:
    print("猜对了")
```

预期输出（跑两次，输入不同）：

```text
猜一个 1 到 10 的数: 3
小了
```

```text
猜一个 1 到 10 的数: 7
猜对了
```

三件事值得注意：

- `guess < secret` 是条件，成立时才执行下面缩进的块。050 篇的缩进在这里第一次有了「意义」：缩进决定哪些行属于这个分支；
- 三个分支从上往下逐个检查，**命中一个就跳过其余**：猜对了就不可能再报「大了」；
- `else` 兜底，前面全不成立时执行。

`int(input(...))` 先照着用：`input()` 拿到的永远是文字，`int()` 把文字变成数字。输入的不是数字会当场崩溃，这个坑在 [异常处理](/python/130-ExceptionHandling) 解决。

## 3. 条件里能写什么：比较与逻辑运算

在 REPL（终端输入 `python` 进入）里逐行试：

```python
>>> hp = 70
>>> hp < 100
True
>>> hp == 70          # 两个等号才是「相等」，一个等号是赋值
True
>>> 0 < hp <= 100     # 链式比较，Python 特有的直观写法
True
>>> hp > 0 and hp < 100
True
>>> hp <= 0 or hp >= 100
False
>>> not (hp == 70)
False
```

`and` 要求两边都成立，`or` 只要求一边，`not` 翻转结果。比较的结果 `True`/`False` 本身是一种数据（布尔值），070 篇正式介绍；运算符的完整规则（优先级、短路求值）在 [运算符与表达式](/python/080-OperatorExpression) 讲透，这里先混个眼熟。

## 4. 再解决「重复」：while 与完整版猜数字

`while 条件:` 的意思：条件成立就反复执行缩进块，执行完回头再检查条件。把「猜一次」装进循环，就是完整版游戏：

```python
import random

secret = random.randint(1, 20)   # 电脑随机想一个 1 到 20 的数
tries = 0

while True:
    guess = int(input("猜一个 1 到 20 的数: "))
    tries = tries + 1
    if guess < secret:
        print("小了，再猜")
    elif guess > secret:
        print("大了，再猜")
    else:
        print(f"猜对了！你一共猜了 {tries} 次")
        break    # 跳出循环，游戏结束
```

预期输出（一次真实对局）：

```text
猜一个 1 到 20 的数: 10
大了，再猜
猜一个 1 到 20 的数: 5
小了，再猜
猜一个 1 到 20 的数: 7
猜对了！你一共猜了 3 次
```

- `while True` 是故意永远成立的条件：循环自己不知道何时结束，由玩家猜中时的 `break` 决定退出；
- `f"猜对了！...{tries} 次"` 是 f-string：引号前加 `f`，大括号里放变量，值会被拼进文字，120 篇讲透；
- `import random` 引入标准库，`randint(1, 20)` 返回 1 到 20 的随机整数（含两端）。

## 5. 次数已知：for 与 range

打印倒数歌词，用 for 更直接：

```python
for count in range(5, 0, -1):
    print(f"{count} 只小鸭子游啊游")
print("一只也不剩了")
```

预期输出：

```text
5 只小鸭子游啊游
4 只小鸭子游啊游
3 只小鸭子游啊游
2 只小鸭子游啊游
1 只小鸭子游啊游
一只也不剩了
```

`range()` 是内置函数——「函数」这个概念本身在第 100 篇讲透，现在先混个眼熟：名字后面带括号，给它参数，它替你生成一串数。四种用法：

```python
range(5)         # 0 1 2 3 4（从 0 起，不含 5）
range(2, 7)      # 2 3 4 5 6
range(0, 10, 2)  # 0 2 4 6 8（步长 2）
range(5, 0, -1)  # 5 4 3 2 1（负步长即倒数）
```

注意 `range(5)` 不包含 5——「含头不含尾」是 Python 的高频约定，后面到处都是。

## 6. break、continue 与两种循环的分工

`break` 立刻退出整个循环；`continue` 跳过本次，直接进入下一次：

```python
for i in range(1, 6):
    if i == 3:
        continue    # 3 跳过不打印
    if i == 5:
        break       # 走到 5 提前收工
    print(i)
```

预期输出：

```text
1
2
4
```

两种循环怎么选：

| 场景 | 用哪个 | 例子 |
| --- | --- | --- |
| 次数已知，或对一堆东西挨个处理 | for（配 range 或直接遍历） | 打印歌词、倒计时 |
| 次数未知，由条件或用户决定 | while | 猜数字、菜单主循环 |

## 7. 常见错误与调试实录

错误一：少缩进。运行：

```python
secret = 7
guess = int(input("你的猜测: "))

if guess < secret:
print("小了")
```

真实报错：

```text
  File "guess.py", line 5
    print("小了")
    ^^^^^
IndentationError: expected an indented block after 'if' statement on line 4
```

读报错三步：最后一行的类型是 `IndentationError`（缩进错误）；`after 'if' statement on line 4` 说的是 if 下面缺了缩进块；`line 5` 与插入符 `^^^^^` 指向具体位置。修法：`print` 前补 4 个空格。缩进在 Python 里是语法，不是风格。

错误二：`=` 与 `==` 写混。

```python
hp = 100
if hp = 100:
    print("满血")
```

真实报错（Python 3.10+）：

```text
  File "hp.py", line 2
    if hp = 100:
       ^^^^^^^^
SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?
```

报错把方向都指好了：条件要用 `==`。（`:=` 是另一种赋值写法，080 篇见。）

错误三：死循环。下面的倒计时忘了让条件趋向结束：

```python
count = 3
while count > 0:
    print("倒计时", count)
    # 忘了写 count = count - 1
```

程序永远不结束，同一行疯狂刷屏。处置两步：

1. 按 `Ctrl+C` 紧急中断，traceback 停在哪一行，中断就发生在哪一行：

```text
Traceback (most recent call last):
  File "countdown.py", line 3, in <module>
    print("倒计时", count)
KeyboardInterrupt
```

2. 检查循环体里有没有让条件最终变假的语句——本例补上 `count = count - 1` 即可。

## 8. 修改实验

1. 把第 4 节游戏的范围改成 1 到 100，并新增规则：猜满 7 次还没中就打印「游戏失败」并退出（提示：`tries` 与 `if` 组合）。预计 10 分钟；
2. 把第 5 节歌词从倒数 5 到 1 改成顺数 1 到 5，每句后追加一行「嘎嘎嘎」。预计 5 分钟；
3. 把第 6 节代码中 `continue` 与 `break` 两个分支互换，先预测输出再运行验证。预计 5 分钟。

## 9. 实际项目中的使用场景

- `while True` + `break` 是一切命令行工具主循环的骨架：打印菜单、读命令、执行、循环，直到用户选退出；
- 输入校验：反复询问，直到拿到合法输入才放行；
- 批量处理：for 遍历文件列表、日志行、接口返回的每条数据（190 篇文件处理、290 篇 JSON 都以此为基础）。

## 10. 小练习

预测题一（先写答案再运行；`%` 是取余数，080 篇讲）：

```python
total = 0
for n in range(1, 6):
    if n % 2 == 0:
        continue
    total = total + n
print(total)
```

预测题二：

```python
count = 3
while count > 0:
    print(count)
    count = count - 1
print("发射")
```

（两题预期输出从后往前读：`9` 与 `3 2 1 发射`。）

修改题：给第 4 节游戏加一条彩蛋——第一次就猜中时，额外打印「运气爆棚」。

修 Bug 题：下面的代码想比较猜测，运行即报错。按读报错三步定位后修复：

```python
secret = 7
guess = int(input("你的猜测: "))

if guess < secret:
print("小了")
elif guess > secret:
    print("大了")
else:
    print("对了")
```

```text
  File "guess.py", line 5
    print("小了")
    ^^^^^
IndentationError: expected an indented block after 'if' statement on line 4
```

挑战题：给猜数字加「最多 5 次机会」：5 次内猜中正常结束；用完 5 次打印「游戏结束，答案是 X」退出。自测：故意连错 5 次验证失败分支。提示：次数进入循环条件时，`while` 该怎么写？展开：用 `while tries < 5` 作条件，循环结束后用 `if guess != secret` 区分胜负。

## 11. 什么时候应该 / 不应该

应该：交互循环用 `while True` + `break`；「对一堆东西挨个处理」先想 for；每个分支只做一件事。

不应该：用 for 加手动计数器模拟 while（两者语义不同）；写条件永远为真又没有 break 的循环；if 嵌套超过两层（先想条件能否合并或提前退出）。

## 12. 与之前和之后的知识的关系

- 往前：050 篇的缩进块在本文第一次承担语法职责——它决定哪些行属于哪个分支或循环；
- 往后：[基本数据类型](/python/070-BasicDataType) 给循环补上真正的主角（列表等数据）；[运算符与表达式](/python/080-OperatorExpression) 讲透条件里的比较与逻辑符号；[异常处理](/python/130-ExceptionHandling) 解决 `int(input(...))` 输入文字就崩的问题；[列表推导式](/python/160-ListComprehensionAdvanced) 是 for + if 的浓缩写法。

## 13. 官方文档

- 更多控制流工具（官方教程）：https://docs.python.org/zh-cn/3/tutorial/controlflow.html
- while 语句参考：https://docs.python.org/zh-cn/3/reference/compound_stmts.html#the-while-statement
- random 模块：https://docs.python.org/zh-cn/3/library/random.html

## 14. 自我检查

- 能默写 if/elif/else 并说清「命中即跳过其余」的顺序性；
- 给一个新场景能立刻判断 for 还是 while，并说出理由；
- 能口头区分 break 与 continue；
- 拿到 IndentationError 能三步内定位；
- 程序卡死时知道 Ctrl+C，并能检查「谁让条件变假」。

## 本章总结

条件让程序分情况（命中即走，互不穿透），循环让程序重复：次数未知用 while，次数已知用 for 配 range（含头不含尾）；break 退出整个循环，continue 跳过本次；缩进是语法不是风格，死循环先 Ctrl+C 再找「谁让条件变假」。流程有了，下一篇给流程填上主角：数据。

## 下一步

进入 [基本数据类型](/python/070-BasicDataType)：认识文字、数字与它们的脾气，让猜数字里的每个值都名正言顺。
