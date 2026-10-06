---
order: 220
title: 迭代器协议与 itertools：for 循环脚下踩着的东西
module: 'python'
category: 后端技术
difficulty: intermediate
description: 从「sum 一个生成器表达式」的真实场景切入，亲手实现迭代器类看穿 for 循环的脱糖过程，理清可迭代对象与迭代器的分界，再按场景过一遍 itertools 高频函数，最后以 close 与 GeneratorExit 收尾衔接生成器协程篇。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'python/160-ListComprehensionAdvanced'
  - 'python/180-GeneratorCoroutine'
  - 'python/150-EnumerateZipBuiltinPairs'
prerequisites:
  - 'python/160-ListComprehensionAdvanced'
---

## 前置知识

- [列表推导式进阶](/python/160-ListComprehensionAdvanced)：会写四种推导式，知道圆括号版本「不立即建列表」；
- [enumerate、zip 与成对遍历](/python/150-EnumerateZipBuiltinPairs)：用过 `enumerate` 与 `zip`。

## 你现在要解决什么问题

你在给 ESP32 设备做巡检脚本（作者项目 FoloToy-calendar 同款场景）：一份几十万行的传感器日志，要统计所有高于阈值的读数之和。第一版写成了推导式：

```python
readings = load_readings("sensor.log")   # 返回几十万个 float
total = sum([r for r in readings if r > 100.0])
```

功能没错，但这一行先在内存里建了一个完整的中间列表，统计完就扔。把方括号改成圆括号：

```python
total = sum(r for r in readings if r > 100.0)
```

结果一样，中间列表消失了——`sum` 一边收一边算。为什么圆括号能做到这一点？`sum` 收到的东西到底是什么？答案是一句话：**它是一个迭代器**。本篇就把「迭代器」这三个字拆开看清楚，顺手把标准库里专门配合它的 `itertools` 工具箱过一遍。

## 先动手：亲手造一个迭代器

实现一个倒数器，要求 `for i in Countdown(5)` 能打出 `5 4 3 2 1`：

```python
class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self          # 迭代器返回自己

    def __next__(self):
        if self.current <= 0:
            raise StopIteration   # 说完了就抛这个
        value = self.current
        self.current -= 1
        return value

for i in Countdown(3):
    print(i, end=" ")
```

```text
3 2 1
```

两个方法就是全部门槛：`__iter__` 返回迭代器自身，`__next__` 给出下一个值，没有值时抛 `StopIteration`。不用 try 去接它——那是 for 循环的活。

for 循环没有魔法，它只是把下面这段脱糖执行：

```python
it = iter(Countdown(3))     # 调 __iter__ 拿迭代器
while True:
    try:
        value = next(it)    # 调 __next__ 取值
    except StopIteration:
        break
    print(value, end=" ")
```

```text
3 2 1
```

`iter()` 和 `next()` 是两个内置函数，就是协议方法的官方入口。`next()` 还有一个好用第二参数——默认值，取空时不抛异常而是返回它：

```python
it = iter([])
print(next(it, "没有了"))
```

```text
没有了
```

## 为什么：可迭代对象与迭代器是两个角色

上面 `Countdown` 把两个方法都实现了，所以它自己既是「可被 for 的东西」又是「迭代器」。但列表不是这样：

```python
nums = [10, 20, 30]
print(iter(nums))          # 列表自己不是迭代器，iter() 给出的是另一个对象
next(nums)                 # 直接 next 会怎样？
```

```text
<list_iterator object at 0x000001D4BC71E5E0>
Traceback (most recent call last):
  File "demo.py", line 3, in <module>
    next(nums)
TypeError: 'list' object is not an iterator
```

对列表调 `next(nums)` 会直接 `TypeError: 'list' object is not an iterator`。真实分工是：

| 角色 | 要实现 | 例子 | 特点 |
| --- | --- | --- | --- |
| 可迭代对象（iterable） | `__iter__` | list、str、dict、文件对象 | 可以反复遍历，每次 `iter()` 给一个新迭代器 |
| 迭代器（iterator） | `__iter__` + `__next__` | `iter(list)` 的产物、生成器 | 一次性，取完就耗尽 |

记住这张表，两个常见现象立刻能解释：

- 文件对象为什么只能顺序读一遍——它同时是可迭代对象和迭代器，行游标只有一个；
- 下面这段为什么第二个循环空转：

```python
gen = (x * 2 for x in [1, 2, 3])   # 生成器表达式给的是迭代器
print(list(gen))
print(list(gen))                   # 已经耗尽
```

```text
[2, 4, 6]
[]
```

生成器（包括生成器表达式）就是「用函数语法写出来的迭代器」——它是迭代器的一种，所以也一次性。这件事的完整展开（`send`、`yield from`、协程血缘）在下一篇 [生成器与协程](/python/180-GeneratorCoroutine)。

## itertools：迭代器的标准配件箱

`itertools` 全部返回迭代器、全部 C 实现，是配合本篇协议的标准工具。不背目录，按手头的活查：

**活一：把无限的东西掐成有限。** 无限序列自己写 `while True` 也行，`count` 是现成的；`islice` 是迭代器版切片：

```python
from itertools import count, islice

sensor_id = count(1)                     # 1, 2, 3, ... 永不停止
first_five = list(islice(sensor_id, 5))
print(first_five)
```

```text
[1, 2, 3, 4, 5]
```

**活二：按连续相同值分组。** `groupby` 只对**相邻**的相同键分组，所以排序是前置动作，漏了排序分组结果就是碎片：

```python
from itertools import groupby

logs = [
    ("bedroom-01", "on"), ("bedroom-01", "off"),
    ("kitchen-01", "on"), ("kitchen-01", "on"),
]
logs.sort(key=lambda row: row[0])        # 必须先按键排序
for device, rows in groupby(logs, key=lambda row: row[0]):
    print(device, len(list(rows)))
```

```text
bedroom-01 2
kitchen-01 2
```

**活三：把所有配置组合跑一遍。** 测试矩阵、参数扫描都是笛卡尔积：

```python
from itertools import product

for vol, lang in product([0.5, 1.0], ["zh", "en"]):
    print(vol, lang)
```

```text
0.5 zh
0.5 en
1.0 zh
1.0 en
```

**活四：展平嵌套序列。** 矩阵、多文件行合并：

```python
from itertools import chain

matrix = [[1, 2], [3, 4], [5]]
print(list(chain.from_iterable(matrix)))
```

```text
[1, 2, 3, 4, 5]
```

**活五：排列组合与前缀和。** `permutations` 是排列（有序）、`combinations` 是组合（无序）；`accumulate` 给运行累计值：

```python
from itertools import combinations, accumulate

print(list(combinations(["a", "b", "c"], 2)))
print(list(accumulate([10, 20, 30])))    # 流量按日累计
```

```text
[('a', 'b'), ('a', 'c'), ('b', 'c')]
[10, 30, 60]
```

还有两个一句话就够：`cycle(["on", "off"])` 无限循环一个序列（轮询场景常用），`reduce` 来自 `functools` 能把序列折叠成一个值，但 `sum`、`any`、`all` 覆盖九成需求，写 `reduce` 前先想想可读性。

## 一个必须会的收尾动作：close 与清理

迭代器被中途丢弃时，生成器会收到 `GeneratorExit` 异常——这是给资源清理留的钩子：

```python
def device_session(name):
    print(f"{name}: 连接")
    try:
        while True:
            yield f"{name}: 心跳"
    finally:
        print(f"{name}: 断开")       # 无论正常耗尽还是 close 都会执行

session = device_session("bedroom-01")
print(next(session))
session.close()                      # 主动中止，finally 兜底
```

```text
bedroom-01: 连接
bedroom-01: 心跳
bedroom-01: 断开
```

不手动 close 也没关系：生成器对象被垃圾回收时同样触发 `GeneratorExit`。要点是清理代码放进 `finally`，别指望调用方记得收拾。`throw()` 能从外部往生成器里塞异常，日常很少直接用，留到协程篇再碰。

## 常见坑点与真实报错

坑一：迭代器复用。把生成器表达式（或 `map`、`filter` 的结果、文件对象）赋给变量用两次，第二次必空。上面耗尽的例子就是现场。修法：要多次用就转成 `list`，或每次重新创建。

坑二：迭代时增删容器。

```python
nums = [1, 2, 3, 4]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)
print(nums)
```

```text
[1, 3, 4]
```

`4` 没被移除——迭代器内部按位置前进，`remove` 让后面的元素整体左移，下一个元素被跳过。修法：遍历副本 `for n in nums[:]`，或干脆 `[n for n in nums if n % 2]` 重建。

坑三：`groupby` 不排序。上面已演示，结果碎片化且不报错，属于静默出错，最难查。

坑四：把「可迭代」当「迭代器」传给手写函数。函数参数若直接 `next(x)`，传入列表就炸 `TypeError`；进函数先 `it = iter(x)` 是标准防御写法，顺便兼容两种角色。

## 自我检查

- 能不看书写出 `__iter__` 与 `__next__` 的最小实现，并说出 `StopIteration` 由谁接住；
- 能用一张表说清可迭代对象与迭代器的分工，以及列表为什么不能直接 `next`；
- 被问到「生成器和迭代器什么关系」能一句话回答（生成器是迭代器的一种）；
- 知道 `groupby` 前必须排序、`islice` 用来截无限序列；
- 知道生成器的清理逻辑要放 `finally`，触发时机是 `close` 或回收。

## 练习

1. 预测题：`it = iter("ab"); print(next(it)); print(list(it))` 输出什么？先写再运行。
2. 修改题：把本文 `Countdown` 改成 `Stepper(start, step)`，支持任意步长与负步长，`Stepper(10, -3)` 应产出 `10 7 4 1`。
3. 实战题：写函数 `window_sums(values, k)`，用 `accumulate` 在 O(n) 内算出每个长度为 k 的窗口和（提示：`acc[i] - acc[i-k]`），并用断言 `assert window_sums([1,2,3,4], 2) == [3, 5, 7]` 自测。
4. 挑战题：用 `groupby` 统计一段文本里连续重复的字符（`"aaabbc"` 得 `[("a", 3), ("b", 2), ("c", 1)]`），先想清楚要不要排序、为什么。

## 下一步

- 生成器函数、`send` 与 `yield from` 流水线：[生成器与协程](/python/180-GeneratorCoroutine)；
- 想知道推导式与生成器表达式在字节码层差在哪：[字节码一窥](/python/165-PythonBytecodeInternals)；
- 迭代器协议只是对象模型的一角，完整协议清单见 [数据类型与对象模型深潜](/python/490-DataTypeObjectModelDeepDive)。
