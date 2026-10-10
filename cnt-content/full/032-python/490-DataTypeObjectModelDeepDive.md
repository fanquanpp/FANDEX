---
order: 430
title: 数据类型深水区：对象模型、浮点精度与可变性
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以「AA 收款程序的两个诡异 bug」为线索下潜数据类型底层：一切皆对象与 is/==、小整数缓存与字符串驻留实验、IEEE 754 浮点误差与 Decimal/Fraction 记账方案、可变性与引用语义（含可变默认参数事故）、str 与 bytes、bool 是 int 子类等边角行为，附对象别名排查法与四类练习。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'python/070-BasicDataType'
  - 'python/090-VariableConstant'
  - 'python/160-ListComprehensionAdvanced'
  - 'python/480-OOPAdvanced'
prerequisites:
  - 'python/070-BasicDataType'
  - 'python/460-OOP'
---

## 前置知识

- [基本数据类型](/python/070-BasicDataType)：会用 int / float / str / bool / list / dict，会用 type() 看类型、会 int() / float() 转换；
- [面向对象基础](/python/460-OOP)：知道「对象」「类」「属性」这几个词的含义。

> 定位说明：070 教「这些类型怎么用」，本篇回答「它们底下是什么」。深潜的动机来自真实事故：浮点对不上账、列表莫名共享——学完你将能解释并预防这一类 bug，而不只是绕开它们。

## 学习目标

读完本文你将能够：

1. 解释「一切皆对象」：变量是标签不是盒子，并用 `id()` 与 `is` 验证两个名字是否指向同一个对象；
2. 亲手复现小整数缓存与字符串驻留现象，说清它们是性能优化而非语言承诺；
3. 讲出 0.1 + 0.2 != 0.3 的原因（IEEE 754 二进制浮点），并用 Decimal 或 Fraction 正确处理金额；
4. 排查「两个变量改一个」类问题：引用语义、可变默认参数事故、浅拷贝与深拷贝的选择；
5. 处理 str 与 bytes 的边界：什么时候会拿到 bytes、怎么正确编解码。

预计 50 到 70 分钟，含 3 组动手实验与 4 道练习。

## 1. 你现在要解决什么问题

你给室友们写了个 AA 收款小程序，两天内连撞两个玄学 bug：

**bug 一**：账单汇总里出现 `330.36000000000004`。三人餐 336.9 元，减去两人已付的 6.54，屏幕上多了 14 位小数。你明明只做了加减法。

```python
>>> 336.9 - 6.54
330.36000000000004
```

**bug 二**：新账单「忘了上一位」。函数签名用了 `def add_bill(bill, items=[])`，结果第二个人的账单里混进了第一个人的菜。

两个 bug 都不是粗心，而是数据类型底层的两件事在咬人：**浮点的二进制表示**与**引用语义**。这篇把这两处底层挖开，顺带把「对象」「相等」「拷贝」这一整套概念一次理清。

## 2. 一切皆对象：变量是标签，不是盒子

先建立一个反直觉的心智模型。很多语言里「变量是盒子，值放进去」；Python 里**变量是贴在对象上的标签，对象住在别处**：

```python
>>> a = [1, 2, 3]
>>> b = a              # 没有复制列表！只是又贴了一张标签
>>> b.append(4)
>>> a
[1, 2, 3, 4]           # a 也「变」了——因为根本只有一个列表
```

验证工具有两个：`id()` 返回对象的身份编号（CPython 里是内存地址），`is` 判断两个名字是否**同一个对象**：

```python
>>> id(a) == id(b)
True
>>> a is b
True
```

`is` 与 `==` 的分工由此而来：**`==` 问「值相等吗」（调用对象的 __eq__），`is` 问「是同一个对象吗」**。日常比较值一律 `==`；`is` 只留给两类固定对象——`x is None` 与 `x is True/False`。给列表用 `is` 判等是经典错误（两个内容相同的列表 `is` 为 False）；反过来，`if x == None` 能跑但不符合惯例，None 判断就用 `is`。

这也解释了函数传参：Python 是**传对象的引用**——传进去的是标签的副本，标签指向的还是同一个对象。所以函数内修改可变参数（列表、字典），外面看得见；给参数整体重新赋值（换了标签指向），外面看不见。

## 3. 实验一：小整数缓存与字符串驻留

有了 `is` 这把探针，可以观察两个著名现象。先看整数：

```python
>>> a = 256; b = 256
>>> a is b
True
>>> c = 257; d = 257
>>> c is d
False          # 注意：REPL 里分行定义时
```

CPython 把 -5 到 256 的整数**预先造好缓存**，程序里所有这个范围的数字都指向同一批对象——整数字面量太高频，每次新建太浪费。257 超出范围，各自新建，`is` 为 False。

字符串有类似机制，叫**驻留（interning）**：像标识符名字（字母数字下划线组成）这类字符串会被共享：

```python
>>> s1 = "hello"; s2 = "hello"
>>> s1 is s2
True
>>> s3 = "hello world!"; s4 = "hello world!"
>>> s3 is s4       # 含空格与叹号，不驻留，各自新建
False
```

必须刻在脑子里的结论：**这两个现象是 CPython 的实现优化，不是语言承诺**——范围、时机都可能随版本变（比如同一行里写 `c = 257; d = 257` 时编译器可能合并常量导致 `is` 为 True）。所以它们永远只该出现在「解释为什么」，永远不该出现在「利用它」：判断值相等用 `==`，这个纪律在任何版本、任何实现上都安全。

## 4. 浮点真相：0.1 + 0.2 为什么不等于 0.3

回到 bug 一。亲手看证据：

```python
>>> 0.1 + 0.2
0.30000000000000004
>>> 0.1 + 0.2 == 0.3
False
```

原因：float 是 IEEE 754 双精度二进制浮点。二进制里 0.1 是无限循环小数（类比十进制里的 1/3 = 0.333...），存进 64 位必然截断，误差在每一次运算里累积。这不是 Python 的 bug，C、Java、JS 同款行为；也不是你换语言的借口，而是**所有二进制浮点的天性**。

两个认知修正：

**比较浮点用容差，不用 ==**：

```python
>>> import math
>>> math.isclose(0.1 + 0.2, 0.3)
True
```

**涉及钱，别用 float，用 Decimal**：

```python
>>> from decimal import Decimal
>>> Decimal("336.9") - Decimal("6.54")
Decimal('330.36')
```

三个关键细节：用**字符串**构造 Decimal（`Decimal(0.1)` 会把 float 的误差原样带进来）；四舍五入用显式的 `quantize` 指定规则与位数；计算成本比 float 高一个量级，但记账场景完全无感。分数场景还有更雅的选择 `fractions.Fraction(1, 3)`，精确表示有理数，科学计算与教学场景好用。本文开头那个 AA 程序的正确姿势：金额全程 `Decimal`，只在最终展示时格式化。

## 5. 可变与不可变：bug 二的解剖

Python 的类型分两大阵营。**不可变**：int、float、str、tuple、frozenset——对象一旦创建不能改，「修改」其实是造新对象换标签。**可变**：list、dict、set——原地改，所有标签同时看见。

bug 二的完整解剖：

```python
def add_bill(bill, items=[]):        # 默认值在函数定义时创建，只创建一次！
    items.append(bill)
    return items

>>> add_bill("鱼香肉丝")
['鱼香肉丝']
>>> add_bill("宫保鸡丁")
['鱼香肉丝', '宫保鸡丁']              # 上一位的菜还在
```

默认值 `[]` 不是「每次调用新建」，而是**函数对象身上的一个属性，全程同一个列表**。修复三选一：

```python
def add_bill(bill, items=None):      # 惯用修法：哨兵 None + 函数内新建
    if items is None:
        items = []
    items.append(bill)
    return items
```

或者签名收 `items: list[str] | None = None`（注解版，本质相同）；或者干脆要求调用方显式传入。检验你是否真懂了：`def f(x, box=[])` 中往 box 里 append 能被下一次调用看见，但 `box = box + [x]` 不能——前者原地改共享对象，后者造新对象换本地标签。

## 6. 实验二：拷贝的两层深度

「我不想共享，复制一份」也有深度之分：

```python
import copy

matrix = [[1, 2], [3, 4]]
shallow = matrix.copy()          # 浅拷贝：只复制外层
shallow[0][0] = 99
matrix                           # [[99, 2], [3, 4]] —— 内层还是共享的！

deep = copy.deepcopy(matrix)
deep[0][0] = 77
matrix                           # [[99, 2], [3, 4]] —— 这次真的独立了
```

浅拷贝（`list.copy()`、`list(...)`、切片 `[:]`、`dict.copy()`）只复制最外层容器，内层对象照旧共享——嵌套结构会「漏」。`copy.deepcopy` 递归复制全部层级，代价是慢。选择口诀：一层结构用浅拷贝，嵌套结构且要真独立才 deepcopy，多数业务场景其实该用不可变数据或重建新字典（`{**old, "key": new}`）从根上避免共享。

修改实验一：预测 `a = [1, [2, 3]]; b = a[:]` 之后执行 `a[1].append(4)` 与 `a.append(5)`，各对 b 有无影响；运行验证，并用 `id()` 指出哪一层共享、哪一层独立。

## 7. str 与 bytes：文字与字节的两层世界

字符串在内存里有两种形态：`str` 是**字符**序列（Python 3 的 str 内部存的是 Unicode 码点），`bytes` 是**字节**序列（8 位一组，文件与网络的原生语言）。两者靠编解码转换：

```python
>>> "多肉".encode("utf-8")
b'\xe5\xa4\x9a\xe8\x82\x89'          # 每个汉字 3 字节
>>> b'\xe5\xa4\x9a\xe8\x82\x89'.decode("utf-8")
'多肉'
```

什么时候会撞上 bytes：读写二进制文件（`open(path, "rb")`）、网络收发、看文件头魔数（PNG 开头固定是 `b'\x89PNG'`，判断文件真实类型的土办法）。两个高频报错都在编解码的缺省假设上：拿到 bytes 直接和 str 拼接抛 `TypeError: can't concat str to bytes`；decode 用错编码抛 `UnicodeDecodeError`——互联网时代文本十有八九是 UTF-8，但老系统有 GBK，读外部数据遇乱码第一件事查编码，别改代码硬扛。

## 8. 边角行为补遗：bool、None 与转换

几个零散但常被面试与事故光顾的点，一次扫清：

- **bool 是 int 的子类**：`True == 1`、`True + True == 2` 都成立，`isinstance(True, int)` 为 True。后果是 `sum(...)` 统计布尔列表直接得数量（`sum(s["fc"] for s in scores)` 数 FC 场次的原理）；代价是 `1 == True` 会让字典把两者当同一个键。
- **None 是单例**：全程序只有一个 None 对象，所以判断恒用 `is None`；None 不是 0、不是空串、不是 False，是「这里有个刻意的空」。
- **bool("") 为 False**：空容器、0、None 在条件里都是假——`if items:` 等价于「items 非空吗」，是 Python 惯用法；但接受外部数据时要小心 0 与空串被误当「没填」。
- **转换的脾气**：`int("3.5")` 直接 ValueError（先 float 再 int，或用 `int(float(s))`）；`int(3.9)` 是截断不是四舍五入（得 3）；四舍五入去 `round()`，且它是「银行家舍入」（`round(0.5)` 得 0、`round(1.5)` 得 2——舍向偶数），财务场景请用 Decimal 的 `quantize` 显式指定。

## 9. 排查工具箱：给「莫名共享」做体检

遇到「改了一个另一个也变」类问题，三步定位：

1. `id(a) == id(b)`：确认是否同一对象（99% 的此类 bug 在这一步现形）；
2. 回溯共享源头：是赋值别名（`b = a`）、函数传参、浅拷贝漏内层，还是默认参数共享；
3. 按语义选断开方式：浅拷贝 / deepcopy / 重建新对象 / 改用不可变类型。

养成肌肉记忆：把可变对象装进容器前先问一句「这个容器会被复制或共享吗」；写函数时默认参数永远用 None 哨兵。

## 10. 什么时候应该 / 不应该

应该：金额与精确计算用 Decimal / Fraction；浮点比较用 math.isclose；默认参数用 None 哨兵；共享可变结构跨函数传递前想清楚所有权；判断 None 用 is。

不应该：用 is 比较数值或字符串内容；依赖小整数缓存或驻留写代码；float 存钱；嵌套结构用浅拷贝假装独立；在热路径上滥用 deepcopy。

## 11. 与之前和之后的知识的关系

- 往前：[基本数据类型](/python/070-BasicDataType) 是本文的用法层地基；[变量与常量](/python/090-VariableConstant) 的「名字绑定」在这里得到 id 级解释；[面向对象](/python/460-OOP) 的「一切皆对象」在本文第一次被实证；
- 往后：[数据类与 Pydantic](/python/550-DataClassPydantic) 把「不可变、可校验的数据容器」做成一行声明，是本文可变性纪律的工程化落地；同一批对象在性能视角下的成本账，[Python 与性能](/python/690-PythonPerformance) 从时间维度再算一遍；[装饰器](/python/500-Decorator) 一开口就是「函数也是对象」——本文的世界观直接垫底。

## 12. 官方文档

- 浮点算术（官方教程，IEEE 754 权威短文）：https://docs.python.org/zh-cn/3/tutorial/floatingpoint.html
- decimal 模块：https://docs.python.org/zh-cn/3/library/decimal.html
- copy 模块（浅深拷贝语义）：https://docs.python.org/zh-cn/3/library/copy.html

## 13. 自我检查

- 能用标签与盒子两种模型解释 `b = a` 后 `b.append` 为什么影响 a；
- 能复现小整数缓存实验，并说出「实现优化、不可依赖」六个字；
- 能讲清 0.1 + 0.2 != 0.3 的二进制根源，并给出 Decimal 构造的两个细节（字符串构造、quantize）；
- 能完整解剖可变默认参数 bug 并默写 None 哨兵修法；
- 能说清浅拷贝与深拷贝在嵌套结构上的差异，并用 id() 验证；
- 遇到「改一个动两个」能按三步体检法定位。

## 练习

预测题：

```python
a = [1, 2, 3]
b = a
a = a + [4]
print(b)
```

先写答案再运行（提示：`a + [4]` 造了新对象；对比如果是 `a += [4]` 呢？）。

修改题：把开头 AA 程序的金额计算全部改写为 Decimal 版，并处理「按人头分摊除不尽」的场景（提示：Decimal 除法默认 28 位精度，分摊用「前 n-1 人除法 + 最后一人拿余额」保证总和精确）。

排错题：同事的缓存函数永远返回第一条数据：

```python
def cached(key, cache={}):
    if key not in cache:
        cache[key] = expensive_compute(key)
    return cache[key]
```

这个函数「看起来」恰好能工作，为什么仍然要重写？给出重写版（提示：共享状态藏在默认参数里，等于全局变量；跨调用、跨线程的行为都不受控）。

挑战题：写一个 `deep_freeze(obj)`，把任意嵌套的 list / dict 递归转成 tuple / 对键排序后的 tuple，返回「不可变快照」，并用 id() 自证：对快照做任何操作都不影响原对象、对原对象修改也不影响快照。

## 本章总结

变量是标签不是盒子，is 问身份、== 问值；小整数缓存与字符串驻留是 CPython 的性能优化，解释现象可以、写代码依赖不行；float 是二进制浮点，0.1 + 0.2 的误差是天性，比较用 isclose、算钱用 Decimal（字符串构造 + quantize）；可变对象原地改、所有标签同见，可变默认参数全程只建一次，None 哨兵是标准修法；浅拷贝漏内层、deepcopy 才真独立；str 是字符、bytes 是字节，编解码显式写 UTF-8；bool 是 int 子类、None 是单例、round 是银行家舍入——底层清楚一分，玄学 bug 少一半。

## 下一步

「函数也是对象」不再是一句话，而是下篇的建筑材料：进入 [装饰器](/python/500-Decorator)，用本文的对象模型亲手造出第一个不修改源码就能给函数加功能的工具。
