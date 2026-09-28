---
order: 160
title: 列表推导式进阶：把三行循环压成一行
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以音游成绩单清洗为线索，从「for + append」机械改写法讲透列表推导式：过滤与变换、字典与集合推导式、嵌套与海象运算符、生成器表达式省内存，附可读性红线与四类练习。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'python/140-BuiltinDataStructure'
  - 'python/150-EnumerateZipBuiltinPairs'
  - 'python/165-PythonBytecodeInternals'
  - 'python/170-ComprehensionGenerator'
  - 'python/130-ExceptionHandling'
prerequisites:
  - 'python/140-BuiltinDataStructure'
  - 'python/150-EnumerateZipBuiltinPairs'
---

## 前置知识

- [内置数据结构](/python/140-BuiltinDataStructure)：会操作列表、字典、集合，知道 append 与 in；
- [enumerate 与 zip](/python/150-EnumerateZipBuiltinPairs)：见过「遍历同时拿序号」的写法；
- 基础 for 循环与 if：来自 [控制流](/python/060-ControlFlow)。

本文解决的是品味问题：循环你会写了，但代码里十次有八次在重复同一个套路——「建个空列表，循环，筛选，append」。套路写多了，就该学它的官方简称。

## 学习目标

读完本文你将能够：

1. 用「三步机械改写法」把任何简单的 for + append 循环改写成列表推导式，也能把推导式读回循环；
2. 掌握带 if 过滤、if-else 变换两种条件的位置区别——这是推导式最经典的坑；
3. 会写字典推导式与集合推导式，解决「按规则建映射」「按规则去重」两类高频需求；
4. 用生成器表达式替代「为了求和 / 求是否存在而临时建的列表」，省掉中间大列表；
5. 划出可读性红线：什么时候该把推导式退回成普通循环。

预计 40 到 55 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

你在给一个音游（比如某虚拟歌手音乐平台的新作）写成绩分析脚本。好友的成绩单长这样——每条记录是「歌名、难度、得分、是否 Full Combo」：

```python
scores = [
    {"song": "Melt", "diff": "Master", "score": 1012000, "fc": True},
    {"song": "Melt", "diff": "Hard", "score": 988000, "fc": True},
    {"song": "Ghost Rule", "diff": "Master", "score": 994500, "fc": False},
    {"song": "Rolling Girl", "diff": "Master", "score": 1009000, "fc": True},
    {"song": "Rolling Girl", "diff": "Easy", "score": 610000, "fc": False},
]
```

你想要四个东西：满分线以上的歌名列表、每首歌在 Master 难度的最高分映射、打出过 FC 的歌名集合（去重）、以及「有没有任何一关满分」这个 yes/no 问题。

用你已经会的写法，每个需求都是同一个模子：

```python
full_scores = []
for s in scores:
    if s["score"] >= 1009000:
        full_scores.append(s["song"])

best_master = {}
for s in scores:
    if s["diff"] == "Master" and s["score"] > best_master.get(s["song"], 0):
        best_master[s["song"]] = s["score"]

fc_songs = set()
for s in scores:
    if s["fc"]:
        fc_songs.add(s["song"])
```

能跑，但你发现自己写了三遍「建容器、循环、if、塞进去」。列表推导式就是让这个模子消失的语法。学完本文，上面三段各自变成一行。

## 2. 先不要看解释，先试试看

打开 REPL（终端敲 `python`），逐行输入：

```python
>>> scores = ["Melt", "Ghost Rule", "Rolling Girl", "Tell Your World"]
>>> upper = [name.upper() for name in scores]
>>> upper
['MELT', 'GHOST RULE', 'ROLLING GIRL', 'TELL YOUR WORLD']
```

一行干完了「建列表、循环、变换、收结果」四件事。读法是从左往右的英语语序：「取 `name` 变大写，对 scores 里的每个 name」。先用这个手感往下走，原理第 3 节讲。

## 3. 三步机械改写法

任何「循环 + append」都能按固定步骤改写。拿第 1 节的第一个需求演示：

```python
# 原始循环
full_scores = []
for s in scores:
    if s["score"] >= 1009000:
        full_scores.append(s["song"])
```

- 第一步，找到**最后塞进列表的表达式**：`s["song"]`——它将成为推导式的开头；
- 第二步，找到**循环谁**：`for s in scores`——原样搬到表达式后面；
- 第三步，找到**剩余的 if 条件**：`s["score"] >= 1009000`——放在最末尾。

```python
full_scores = [s["song"] for s in scores if s["score"] >= 1009000]
```

反过来读也一样：看到推导式，先找 `for`，再找末尾 `if`，最后看开头表达式，就能复原成循环。**读不出来的推导式就是坏推导式**——这是后面可读性一节的判断基准。

修改实验一：把第 1 节收集 `fc_songs` 的循环按三步法改写成集合推导式（提示：把 `[]` 换成 `{}`，append 换成 add 的角色由语法自动承担）。对照答案：`fc_songs = {s["song"] for s in scores if s["fc"]}`。

## 4. 两种条件，位置天差地别

推导式里 if 能出现在两个位置，含义完全不同，这是新手第一大坑。

**末尾的 if 是过滤器**：不满足的元素直接跳过，输出数量可能变少。

```python
masters = [s["song"] for s in scores if s["diff"] == "Master"]
# 只留下 Master 难度的记录
```

**开头的 if-else 是变换器**：每个元素都必须产出一个结果，只是值不同，数量不变。

```python
labels = [s["song"] + "(满分线)" if s["score"] >= 1009000 else s["song"] for s in scores]
```

记法：**过滤用没有 else 的 if，放最后；变换用带 else 的 if-else，放最前**。带 else 的 if 写到末尾是语法错误，因为末尾位置只认「过滤」语义。两者还可以组合：先末尾过滤、再开头变换——从左往右读正好是「取什么，从哪取，留哪些」。

## 5. 字典与集合推导式：另外两个模子

第 1 节的第二个需求（每首歌 Master 最高分）用字典推导式更顺：

```python
best_master: dict[str, int] = {}
for s in scores:
    if s["diff"] == "Master":
        best_master[s["song"]] = max(best_master.get(s["song"], 0), s["score"])
```

这类「边遍历边比较」的逻辑推导式写不了，老实写循环。但如果数据里每首歌 Master 只有一条记录，映射就是纯变换：

```python
best_master = {s["song"]: s["score"] for s in scores if s["diff"] == "Master"}
# {键表达式: 值表达式 for ... if 过滤}
```

字典推导式的高频用途还有**反转映射**和**按规则换值**：

```python
diff_levels = {"Easy": 1, "Hard": 2, "Master": 3}
rank_of = {name: i for i, name in enumerate(diff_levels)}   # 键值互换
```

集合推导式（第 2 节实验已经见过）的核心价值是**顺路去重**：`{s["song"] for s in scores}` 直接得到出现过的歌名集合，不用先建列表再 `set()`。

三个推导式共用同一个语法骨架，只是容器的括号和「产出物」不同：

| 写法 | 括号 | 产出物 | 典型场景 |
| --- | --- | --- | --- |
| `[x for x in xs]` | 方括号 | 列表 | 变换 / 过滤出一批值 |
| `{k: v for ...}` | 花括号带冒号 | 字典 | 建映射、反转映射 |
| `{x for ...}` | 花括号 | 集合 | 收集并去重 |
| `(x for ...)` | 圆括号 | 生成器 | 喂给 sum / any / all，不建列表 |

## 6. 第四种：不想建列表时，用圆括号

第四个需求「有没有任何一关满分」只需要一个 yes / no。用列表推导式也能答：

```python
any([s["score"] >= 1009000 for s in scores])   # True
```

但它有个浪费：为了一个布尔值，先把**所有**记录的比较结果存成了一个完整列表。把方括号换成圆括号——生成器表达式——结果逐个产出、随用随取，不占中间内存：

```python
any(s["score"] >= 1009000 for s in scores)     # True，没有中间列表
```

注意这里连圆括号都省了：生成器表达式作为函数唯一参数时，外层括号可以借用函数的。同类高频搭档：

```python
total = sum(s["score"] for s in scores)                 # 总分
all_fc = all(s["fc"] for s in scores)                   # 是否全部 FC
best = max(scores, key=lambda s: s["score"])            # 顺手认识一下 max 的 key
```

数据量小的时候两者性能差别可以忽略；数据到十万行级别（日志、导出文件），差别就是「秒开」和「卡一下」。习惯从现在养起：**只为了 sum / any / all / max 这类一次性消费建的东西，用圆括号**。

修改实验二：用 `python -m timeit` 分别测列表版与生成器版求和，体会「省掉中间列表」在量级上来后的意义：

```bash
python -m timeit -s "scores=[[i, i] for i in range(1000000)]" "sum(x[0] for x in scores)"
python -m timeit -s "scores=[[i, i] for i in range(1000000)]" "sum([x[0] for x in scores])"
```

## 7. 嵌套、海象与作用域

**嵌套推导式**最典型的场景是矩阵转置。先看循环版，再看推导式：

```python
matrix = [[1, 2, 3], [4, 5, 6]]
transposed = [[row[col] for row in matrix] for col in range(3)]
# [[1, 4], [2, 5], [3, 6]]
```

读法：外层 `for col` 在后写但先执行，内层列表对每个 col 收集各行的对应位。两层是极限——**三层以上的嵌套推导式，几乎永远是普通循环更清楚**。

**海象运算符**（`:=`，3.8 起）让推导式里能「算一次、用两次」，最舒服的位置是「条件里算，开头用」：

```python
import re
lines = ["score=1012000", "song=Melt", "score=994500"]
values = [int(m.group(1)) for line in lines if (m := re.fullmatch(r"score=(\d+)", line))]
# [1012000, 994500] —— 正则匹配一次，开头直接用匹配结果
```

说实话，海象一旦塞进太多逻辑就会牺牲可读性，只建议在「重复计算一个中间值」时使用。

**作用域**：推导式有自己的小作用域，循环变量不会泄漏到外面——这点与普通 for 语句不同：

```python
y = [x * 2 for x in range(3)]
# x 在这里不存在，不会污染外部命名空间
```

还有一个实用的现代行为：3.12 起推导式被内联实现，执行比旧版本更快。你不需要做什么，升级本身就在提速。

## 8. 可读性红线：什么时候退回循环

推导式的存在理由是「让简单变换一眼看穿」，超过这个范围就是负资产。红线清单：

- **超过一个 for 或两个 if**：退回循环。`[f(x, y) for x in a for y in b if p(x) if q(y)]` 已经需要读者在脑子里展开循环了；
- **开头表达式超过一次调用或三元**：比如 `[transform(deep_clean(x)) for x in xs if not skip(x)]`，抽个带名字的辅助函数，`[clean(x) for x in xs if keep(x)]` 立刻恢复可读；
- **只要副作用不要结果**：往推导式里塞 print、写文件、发请求，是明确的反模式——读代码的人会以为你在收集结果。这种场景用普通 for；
- **读一遍读不懂**：第 3 节的机械读法失败，就是最终裁决。代码是写给人看的，机器两种都认。

一个务实的习惯：先写循环，跑对了，再按三步法收成推导式；收完读一遍，读不顺就退回去。写推导式不是目的，**让下一个人（三个月后的你）一眼看懂**才是。

## 9. 常见坑点与真实报错

坑一：把带 else 的 if 写到末尾。

```python
>>> [s for s in scores if s["score"] >= 1009000 else 0]
  File "<stdin>", line 1
    [s for s in scores if s["score"] >= 1009000 else 0]
                                                ^^^^
SyntaxError: invalid syntax
```

报错指在 else 附近。回忆第 4 节：过滤 if 放末尾且不带 else；要 else 就整体挪到开头。

坑二：在推导式里访问还没绑定的名字。

```python
>>> [x for x in range(3) if flag]
NameError: name 'flag' is not defined
```

推导式的作用域里，外面的变量要看清在何时定义；反过来推导式内部的变量也不会泄漏出去（第 7 节），两边都别想当然。

坑三：字典推导式键重复。`{s["song"]: s["score"] for s in scores}` 在同一首歌出现多次时**后面的覆盖前面的**，不报错、静默丢数据。数据可能有重复键时，先想清楚「留哪个」——通常那意味着老实写循环或先排序。

坑四：对生成器表达式二次遍历。生成器是「一次性水条」，`total = sum(g)` 之后 `list(g)` 是空列表。要复用就先 `list(...)` 落成真列表。

## 10. 什么时候应该 / 不应该

应该：简单的变换、过滤、建映射、去重用推导式；一次性求和 / 判断用生成器表达式；先写循环跑通，再机械收拢。

不应该：嵌套超过两层；在推导式里做副作用；为了炫技写超长单行；对可能重复的键做字典推导式而不考虑覆盖。

## 11. 与之前和之后的知识的关系

- 往前：本文是 [内置数据结构](/python/140-BuiltinDataStructure) 的「批量加工篇」——容器是原料，推导式是流水线；[enumerate 与 zip](/python/150-EnumerateZipBuiltinPairs) 的搭档在推导式里同样适用；
- 往后：[推导式与生成器](/python/170-ComprehensionGenerator) 把圆括号那一支展开成完整的迭代器与生成器体系；[函数详解](/python/100-FunctionDetailed) 里的 `map` / `filter` 与推导式互为替代，团队里二选一保持一致；后续数据分析（pandas）与本文的「变换 - 过滤 - 聚合」思维一脉相承。

## 12. 官方文档

- 推导式（官方教程）：https://docs.python.org/zh-cn/3/tutorial/datastructures.html#list-comprehensions
- 生成器表达式：https://docs.python.org/zh-cn/3/reference/expressions.html#generator-expressions
- 海象运算符 PEP 572：https://peps.python.org/pep-0572/

## 13. 自我检查

- 能不看资料完成「循环与推导式」的双向改写，并说出三步法；
- 能讲清末尾 if 与开头 if-else 的语义区别，并举一个各自报错的例子；
- 能用字典推导式建映射、用集合推导式去重，并说出键覆盖的风险；
- 能解释 sum 搭配圆括号比方括号好在哪；
- 拿到一段三层嵌套推导式，能判断它该不该退回循环。

## 练习

预测题：`[n for n in range(10) if n % 3 == 0]` 的输出是什么？改成 `{n % 3 for n in range(10)}` 呢？先写下来再运行。

修改题：把第 1 节的三段循环全部收成推导式（提示：Master 最高分那段需要先确认数据没有同歌同难度的重复记录；如果有，保留循环版并说明为什么）。

排错题：下面的代码想收集所有 FC 歌名，运行却得到一列 None。找出病因并修复：

```python
fc = [print(s["song"]) for s in scores if s["fc"]]
```

挑战题：给成绩单加一个派生等级（满分线以上 S，99 万以上 A，其余 B），用一条字典推导式建成 `{歌名+难度: 等级}` 映射；再用生成器表达式统计 S 级数量。自测：三种等级都要至少命中一条。

## 本章总结

推导式是「建容器、循环、过滤、塞结果」套路的语法简称：方括号产列表、花括号带冒号产字典、花括号产集合、圆括号产一次性生成器；三步机械改写法保证双向可读；末尾 if 过滤、开头 if-else 变换；sum / any / all 配圆括号省掉中间列表；超过两层嵌套或一行读不懂就退回循环——简洁是手段，可读才是目的。

## 下一步

推导式的圆括号一支远比「省内存」有料，进入 [推导式与生成器](/python/170-ComprehensionGenerator)：认识迭代器协议与 yield，学会写「用到哪个数才算哪个数」的惰性数据流。
