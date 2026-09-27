---
order: 50
title: 程序结构基本语法：写下你的第一个程序
module: 'python'
category: 后端技术
difficulty: beginner
description: 以记账小票程序为线索一次备齐语句与行、缩进即语法、注释、print 与 input 五个零件，用真实的 SyntaxError/IndentationError/TypeError 报错学会读报错三步，附修改实验与四类练习。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/060-ControlFlow'
  - 'python/070-BasicDataType'
  - 'python/090-VariableConstant'
prerequisites:
  - 'python/020-PythonOverviewEnvSetup'
  - 'shell/130-CommandLineBasics'
---

## 前置知识

- 已完成 [Python 概述与环境搭建](/python/020-PythonOverviewEnvSetup)：终端里 `python --version` 与 `python -c "print(...)"` 都能正常回应；
- 建议先完成 [命令行基础](/shell/130-CommandLineBasics)，至少知道 `cd` 是切换目录；没学过也没关系，本文每条命令都写全，照抄即可。

本文是语法主线的第一课：环境你已有，缺的只是动笔。

## 学习目标

读完本文你将能够：

1. 说出 Python 的两条格式铁律——一条语句占一行、缩进决定代码归属——并用它们预判一段代码的对错；
2. 会用 print 输出多个值、用 input 接收输入，并牢记 input 交回来的永远是字符串；
3. 独立写出并运行你的第一个完整程序：一个跑一次记一笔的小账本；
4. 拿到 SyntaxError 与 IndentationError 的报错，能用「读报错三步」自己定位修复；
5. 分清注释的用法：写「为什么」，而不是把代码复述一遍。

预计 45 到 60 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

上一节你运行的都是别人写好的代码——010 篇的 hello.py、020 篇的验证命令。这次换成你自己的。

目标很具体：一个记一笔、打一张小票的账本。运行后程序问你「花在什么上」「花了多少钱」，你答完，它打印一张小票。写出它只需要五个零件：语句、缩进、注释、print、input——这一篇全部备齐。

## 2. 先不要看解释，先试试看

新建一个目录（比如 `python-lab`），在里面新建文本文件 `ledger.py`。注意两件事：后缀必须是 `.py`；文件用 UTF-8 编码保存（现代编辑器默认如此，VS Code 右下角可以看到并切换）。

```python
# ledger.py
# 我的第一个记账程序

note = input("这笔钱花在什么上？")
amount = input("花了多少钱？")

print("---------- 今日账本 ----------")
print("支出项目：", note)
print("金额：", amount, "元")
print("明天继续，别忘了记账。")
```

终端里 `cd` 进这个目录，运行：

```bash
python ledger.py
```

程序会停下来等你输入。按要求回答（前两行里的「奶茶」「15」是你敲进去的）：

```text
这笔钱花在什么上？奶茶
花了多少钱？15
---------- 今日账本 ----------
支出项目： 奶茶
金额： 15 元
明天继续，别忘了记账。
```

六行代码，一个完整程序。下面把零件逐个拆开。

## 3. 发生了什么：五个零件

**语句与行。** Python 的一条语句占一行，行尾不需要分号：

```python
x = 1
y = 2
print(x + y)   # 3
```

分号其实合法——`x = 1; y = 2` 能跑——但别用：解释器按「行」报错，一行挤三条语句，报错位置就失去了精度，人也更难读。

**注释。** `#` 开头的内容是给人看的，解释器整行忽略；`#` 也可以缀在行尾。注释的正确姿势是写「代码里看不出来的原因」：

```python
# 差：把代码再念一遍
amount = input("花了多少钱？")   # 获取输入

# 好：写出代码说不出的原因
amount = input("花了多少钱？")   # 暂存为字符串，类型转换到 070 篇再说
```

**print。** 逗号隔开的多个参数，输出时用空格连起来，末尾自动换行——所以小票上「支出项目：」和「奶茶」之间有一个空格。

**input。** `input("提示")` 打印提示后暂停，等你敲完一整行按回车，把你敲的字符原样交回来。`note = input(...)` 里的 `=` 把交回来的值贴上名字 note（「贴名字」的完整机制在 [变量与常量](/python/090-VariableConstant) 讲透，现在会贴就行）。

**先混个眼熟。** `print(f"支出项目：{note}")` 这种 f-string 写法 010 篇见过，效果与逗号版几乎一样——第 6 节的实验会请你对比两者的差别。

## 4. input 的真相：它交回来的永远是字符串

给账本加个「多花一块钱提醒」，很多人的第一版会这么写（`ledger_plus.py`）：

```python
amount = input("花了多少钱？")
total = amount + 1
print("加一后：", total)
```

运行，输入 15。预期输出（真实文本）：

```text
Traceback (most recent call last):
  File "C:\Users\you\ledger_plus.py", line 2, in <module>
    total = amount + 1
            ~~~~~~^~~
TypeError: can only concatenate str (not "int") to str
```

用「读报错三步」完整走一遍：

1. 先读最后一行：`TypeError: can only concatenate str (not "int") to str`——类型错误，字符串没法和整数相加；
2. 再找 File 行与代码行：第 2 行 `total = amount + 1`，出错的就是它；
3. 最后看标记：波浪线圈住 `amount`，尖号指着 `+`——出事的是这次加法里的两个操作数。

真相：**input 交回来的永远是字符串**。你敲的是 15，程序拿到的是 `"15"`，字符串加数字会被直接拒绝。在交互模式（终端输入 `python` 回车）里可以亲自确认字符串的行为：

```python
>>> "15" + "1"
'151'
>>> "15" * 3
'151515'
```

加号变拼接、乘号变重复（输出里带的引号是交互模式在「显示值」，用 print 输出时没有）。

修复预览一行：把出错的行改成 `total = float(amount) + 1` 就能把字符串转成数字——`float` 与类型转换在 [基本数据类型](/python/070-BasicDataType) 讲透，今天只记结论：**从 input 拿到的东西默认是字符串**。

## 5. 缩进即语法：IndentationError 与 SyntaxError

010 篇提过「Python 用缩进表示代码块」，当时是知识，现在它开始管你了。规则两条：

- 顶层语句顶格写，前面不能有任何空格；
- 冒号（`:`）之后的内容要缩进——冒号是 [控制流](/python/060-ControlFlow) 的主角，今天先把「顶层不缩进」守住。

缩进统一用 4 个空格，不要用 Tab，尤其不要混用；去编辑器设置里把 Tab 键锁定为「插入 4 空格」（VS Code 与 PyCharm 都有这个开关）。

实录一，多余缩进（`indent_demo.py`）：

```python
print("第一行")
    print("多缩了一层")
```

预期输出（真实文本）：

```text
  File "C:\Users\you\indent_demo.py", line 2
    print("多缩了一层")
IndentationError: unexpected indent
```

实录二，漏了半个引号（`quote_demo.py`）：

```python
print("账本启动)
```

预期输出（真实文本，尖号指着那个孤零零的开引号）：

```text
  File "C:\Users\you\quote_demo.py", line 1
    print("账本启动)
          ^
SyntaxError: unterminated string literal (detected at line 1)
```

这两种错误与第 4 节的 `TypeError` 有个本质区别：`SyntaxError` 与 `IndentationError` 发生在**还没开始运行**的阶段——解释器读代码时就发现了，所以报错里没有 `Traceback (most recent call last):` 这一行；`TypeError` 则是程序跑到那一行才炸。中文输入法还要多防一手：全角引号「""」和半角引号 `"` 长得像，混进代码会得到另一个报错——`SyntaxError: invalid character '“' (U+201C)`，看到 U+201C 就去查引号；同理，全角逗号会报 U+FF0C。

## 6. 修改实验

1. 给账本加第三个字段「支付方式」：照着现有两行各仿写一行（一行 input、一行 print），运行验证小票真的多了一行；
2. 把 `print("支出项目：", note)` 改成 `print(f"支出项目：{note}")`，对比输出——逗号版冒号后的空格去哪了？f-string 不自动加空格；
3. 先预测再运行：`print("账本" * 2)` 输出什么？
4. 故意删掉 print 一行末尾的一个引号再运行，把报错与第 5 节的两份实录对号入座，然后改回来。

## 7. 实际项目中的使用场景

- 工作里大量一次性小脚本——批量改文件名、抽日志字段、拼一张报表——就是这种「顶格语句加 print」的小文件，五分钟写完、跑完、扔掉；
- 编辑器里的「运行」按钮，底层执行的就是 `python 文件名.py`，报错面板与终端同源；理解了终端运行，IDE 对你不再是黑盒；
- 本文的格式规则（4 空格缩进、一行一条语句、注释写为什么）全部来自 PEP 8——Python 社区公认的代码风格基准，也是团队协作的第一道默契。

## 8. 小练习

**预测题**（5 分钟）：不运行，先写答案：

```python
item = input("买了什么？")
print(item * 2, "各来一份")
```

输入 `咖啡` 时输出是什么？写完运行验证。

答案（先写完再看）：`咖啡咖啡 各来一份`——乘号对字符串是重复，逗号输出是空格连接。

**修改题**（10 分钟）：给账本程序新增「日期」与「心情」两个字段，让小票最后一行打印 `今天的心情记录：<你输入的话>`。验收：运行两次、输入不同内容，小票都完整正确。

**修 Bug 题**（15 分钟）：同事发来 `ledger_bug.py`，运行就报错：

```python
note = input("这笔钱花在什么上？)
amount = input("花了多少钱？")
    print("支出项目：", note)
print("金额：", amount, "元")
```

里面埋着两个错。先运行，按读报错三步修掉第一个；**修完立即重跑**，你会遇到第二个（`IndentationError: unexpected indent`，在第 3 行）。全程一次只修一个错——这是修 Bug 的纪律，也是它快的原因。

**挑战题**（半小时）：不看示例，写一个「观影记录器」：程序依次问片名、星级（输入几个 `*` 就打几颗星）、一句话短评，然后按小票格式输出三行。验收清单：

- 换三种输入运行，输出都包含三段信息；
- 星级行用字符串乘法实现，不许手打星号；
- 故意删掉一个引号，报错类型你能叫出名字并说出修法。

提示分两级：第一级——三个 input 加三个 print，照账本的骨架改；第二级——星级行的关键是「字符串乘以数字等于重复」。

## 9. 与之前和之后的知识的关系

- 往前：020 装好的解释器与验证命令本文天天在用；040 的虚拟环境等你学完它就是标准工作区——真实项目里，`python ledger.py` 总是在激活的虚拟环境中执行，尚未建虚拟环境也不影响跟完本文；010 篇「先混个眼熟」的 f-string，今天开始为你干活；
- 往后：缩进的真正用武之地在 [控制流](/python/060-ControlFlow)——冒号引出的缩进块让程序会判断、会重复；input 的字符串问题由 [基本数据类型](/python/070-BasicDataType) 彻底解决；`note = ...` 里那个「贴名字」的动作，[变量与常量](/python/090-VariableConstant) 会讲出全部真相；
- 更远：函数的定义与返回同样靠缩进定边界——今天咬过你的规则，会陪你走完整个 Python 生涯。

## 10. 官方文档

- 缩进与逻辑行的词法规则：https://docs.python.org/zh-cn/3/reference/lexical_analysis.html#indentation
- 输入与输出教程：https://docs.python.org/zh-cn/3/tutorial/inputoutput.html
- PEP 8 代码风格（缩进与行长）：https://peps.python.org/pep-0008/#indentation

## 11. 自我检查

- 能不看本文默写出账本程序并一次跑通；
- 能说出 input 返回的类型、print 多参数如何连接；
- 拿到一份 IndentationError 报错，能三步定位到行，并说出它与 TypeError 的发生时机差别；
- 能解释为什么注释不该复述代码。

## 本章总结

一行一条语句、缩进即归属，是 Python 的两条格式铁律；print 用空格连接多个参数并自动换行，input 交回来的永远是字符串；SyntaxError 与 IndentationError 在程序运行前就被解释器抓住，而 TypeError 要跑到出事那一行才炸——读报错三步（先读最后一行、再找 File 行、最后看标记）是你从今天起的自修工具。五个零件拼出了你的第一个完整程序，语法主线从此开工。

## 下一步

进入 [控制流：让程序会判断、会重复](/python/060-ControlFlow)：账本现在只能记一笔，控制流让它学会问「这周超支了吗」、学会「再记一笔吗」——缩进也将在那里正式成为语法的主角。
