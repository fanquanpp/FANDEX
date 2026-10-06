---
order: 170
title: 结构模式匹配：match/case 与数据解构
module: 'python'
category: 后端技术
difficulty: beginner
description: 以「服务器告警日志按严重级别分派处理」与「曲库元数据路由」两个任务讲 PEP 634 的 match/case：字面量、捕获、序列、映射、类模式与 guard 守卫，逐段对比 if-elif 链的差异、漏写分支时的行为，练习含成绩五档分档的 match 改写。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 3.10 引入的结构模式匹配（structural pattern matching，PEP 634），属于控制流与数据解构的交汇点。
- **解决什么问题**：`if-elif` 链只能判断「值等不等」，但真实数据往往是有结构的——一条告警是 `(级别, 指标, 数值)` 三元组，一个事件是带 `type` 字段的字典。要从结构里取值再分派处理，`if-elif` 得先判类型、再取下标、再比内容，层层嵌套。`match/case` 把「匹配结构 + 解构取值 + 分派」合成一条语句。
- **什么时候用到**：解析带标签的日志/报文、按消息类型路由（WebSocket 事件、Bot 指令）、处理 JSON API 返回的异构数据、状态机转移。全库此前的分派场景都由 [分支与循环](/python/060-ControlFlow) 的 if-elif 承担，本篇补上结构化的那一半。

## 你现在要解决什么问题

任务一：巡检系统每分钟吐出一条告警，格式是元组 `(级别, 指标名, 数值)`，要按级别分派处理——`CRITICAL` 要打紧急电话，`WARN` 记录后观察，`INFO` 只累计。先看 if-elif 怎么写：

```python
def handle_alarm_v1(alarm):
    if alarm[0] == "CRITICAL" and alarm[1] == "disk":
        return f"电话通知：磁盘使用率 {alarm[2]}%"
    elif alarm[0] == "CRITICAL":
        return f"电话通知：{alarm[1]} 异常，数值 {alarm[2]}"
    elif alarm[0] == "WARN":
        return f"记录观察：{alarm[1]} = {alarm[2]}"
    elif alarm[0] == "INFO":
        return "累计"
    else:
        raise ValueError(f"未知级别: {alarm}")
```

问题不在「跑不通」，而在每取一个字段都要写一遍 `alarm[N]`，读代码的人要在脑子里做下标换算。match 版把「解构」和「分派」写在一起：

```python
def handle_alarm(alarm):
    match alarm:
        case ("CRITICAL", "disk", usage):
            return f"电话通知：磁盘使用率 {usage}%"
        case ("CRITICAL", metric, value):
            return f"电话通知：{metric} 异常，数值 {value}"
        case ("WARN", metric, value):
            return f"记录观察：{metric} = {value}"
        case ("INFO", _, _):
            return "累计"
        case _:
            raise ValueError(f"未知级别: {alarm}")
```

`case ("CRITICAL", "disk", usage)` 一行同时做了三件事：判断第一个元素等于 `"CRITICAL"`、第二个等于 `"disk"`、把第三个元素**绑定**到变量 `usage`。这就是模式匹配与 if-elif 的本质差异：if 比较的是值，模式匹配匹配的是**形状**。

任务二（曲库元数据路由，本文练习环节继续用）：音乐库导入器会收到四种不同形状的元数据——裸歌名字符串、`(歌名, 歌手)` 二元组、完整字典、以及非法输入——要根据形状路由到不同的入库函数。

## 字面量模式：最像 switch 的部分

```python
def http_verb_meaning(verb):
    match verb:
        case "GET":
            return "读"
        case "POST":
            return "建"
        case "PUT" | "PATCH":
            return "改"
        case "DELETE":
            return "删"
        case _:
            return "未知方法"
```

逐段解释：

- `case "GET":` 是字面量模式，语义与 `if verb == "GET"` 相同，比较用的是 `==`；
- `"PUT" | "PATCH"` 是**或模式**：一个 case 列出多个备选值，替代 `elif verb == "PUT" or verb == "PATCH"`；
- `case _:` 的 `_` 是**通配符**，匹配任何值且不绑定变量，等价于 else。

换成别的写法会发生什么：这五段 if-elif 也能写，行为完全一样。**字面量匹配不是 match 的价值所在**——它的价值在后面几种「能解构」的模式。把 match 只当 switch 用，是初学阶段最常见的降级用法。

易错点一：`case "GET"` 匹配的是**值相等**，与字符串内容有关、与对象身份无关，这与 Java 的 `switch`（字符串走 equals）语义一致，不用担心。

易错点二：Python 的 match **不会隐式掉落到下一个 case**（不像 C 的 switch 忘写 break），每个 case 匹配成功后自动退出，没有 break 可写。

## 捕获模式与下划线：解构即取值

`case ("WARN", metric, value)` 里的 `metric`、`value` 是**捕获模式**：匹配任何值并绑定到这个名字。两个关键行为：

```python
match ("WARN", "cpu", 91.5):
    case (level, metric, value):
        print(level, metric, value)   # WARN cpu 91.5 —— 三个都绑定
    case _:
        pass
```

- 捕获变量不需要提前声明，直接在模式里出现即可，作用域仅限 case 分支内；
- `_` 是「匹配但丢弃」：`case ("INFO", _, _)` 表示 INFO 后面跟什么都接受，且不引入变量。

为什么这样设计：解构出来的名字直接可用，省掉 `metric = alarm[1]` 这类搬运代码。写成 `alarm[1]` 版本时，改数据结构（比如元组中间加一列）要改所有下标；match 模式只改一处形状。

易错点：**裸的小写名字是捕获，永远匹配成功**。写 `case CRITICAL:`（想匹配常量 CRITICAL）实际是「捕获一个值绑定到 CRITICAL」，前面的字面量 case 永远轮不到它。要匹配点号路径之外的名字，必须写成 `case Topic.CRITICAL:` 或 `case "CRITICAL"`。这是 match 最著名的坑，静态检查器（mypy 的 pattern 匹配检查）会提示，值得开启。

## 序列模式：元组与列表一起解构

序列模式匹配 `list`、`tuple`（以及任何序列），支持嵌套与星号收尾：

```python
points = [(0, 0), (1, 2), (3, 4)]
match points:
    case []:
        print("空数据集")
    case [(0, 0)]:
        print("只有原点")
    case [(x1, y1), (x2, y2)]:
        print(f"两点：({x1},{y1}) 到 ({x2},{y2})")
    case [first, *rest]:
        print(f"首点 {first}，其余 {len(rest)} 个")
```

逐段解释：

- `case []` 匹配空序列；`case [(0, 0)]` 匹配「只有一个元素且为原点」的列表；
- `case [(x1, y1), (x2, y2)]` 匹配**恰好两个**点的列表并解开每个点的坐标；
- `case [first, *rest]` 用星号捕获剩余元素——与 110 篇（参数解包）的星号语义一脉相承；
- 注意序列模式**不匹配字符串**（str 被刻意排除，避免 `"abc"` 被逐字符拆解）。

换成别的写法会发生什么：第三条分支的 if 版是 `if len(points) == 2 and isinstance(points[0], tuple) and len(points[0]) == 2 and ...`——四层条件才能表达「两个点的列表」，而 match 一行。

## 映射模式：按字典的键解构

映射模式匹配 `dict`，按**键**匹配、对**值**捕获，这是处理 JSON 响应的利器：

```python
def route_metadata(item):
    match item:
        case {"type": "song", "title": title, "artist": artist}:
            return f"入库歌曲：{title} - {artist}"
        case {"type": "album", "title": title, "tracks": tracks}:
            return f"入库专辑：{title}（{len(tracks)} 首）"
        case {"type": "song", **rest}:
            return f"歌曲但字段不全，原始数据 {rest}"
        case _:
            return "无法识别的元数据"
```

```python
print(route_metadata({"type": "song", "title": "千本樱", "artist": "黒うさP"}))
# 入库歌曲：千本樱 - 黒うさP
print(route_metadata({"type": "song", "title": "未完成曲目"}))
# 歌曲但字段不全，原始数据 {'title': '未完成曲目'}
```

逐段解释：

- `{"type": "song", "title": title}` 要求字典**包含**键 `"type"`（值等于 `"song"`）与键 `"title"`（值绑定到 `title`）——多余的键不影响匹配，这是「至少包含」语义而非「完全相等」；
- `{**rest}` 的星号字典模式把**未匹配到的其余键值**整体捕获进 `rest`，做降级处理时特别顺手。

换成别的写法会发生什么：if 版要先 `isinstance(item, dict)`、再 `"type" in item`、再 `item["type"] == "song"`、再 `"title" in item`——四重判断才安全，漏掉 `in` 判断就是 `KeyError`。映射模式把「键存在性检查」内建进了匹配，天然免疫 KeyError。

易错点：映射模式对键用 `==` 判断，**值捕获永远成功**。`case {"type": wrong_type}` 不是「type 等于变量 wrong_type 时匹配」，而是「只要有 type 键就绑定」。想按已知常量值匹配要写字面量或点号路径。

## 类模式：按类型与属性匹配

类模式 `类名(属性=模式)` 先做 isinstance 检查，再对属性做子匹配：

```python
from dataclasses import dataclass

@dataclass
class Song:
    title: str
    artist: str

@dataclass
class Error:
    code: int
    message: str

def dispatch(event):
    match event:
        case Song(title="千本樱"):
            return "这首有特别皮肤"
        case Song(title=title, artist=artist) if artist == "wowaka":
            return f"wowaka 的 {title}，标记翻唱关系"
        case Error(code=500 | 502 | 503):
            return "服务端错误，进入重试队列"
        case Error(code=code, message=msg):
            return f"其他错误 {code}：{msg}"
        case _:
            return "未知事件"
```

逐段解释：

- `Song(title="千本樱")`：只匹配 Song 实例且 title 属性等于 `"千本樱"`，artist 不关心；
- 第二个分支演示**关键字子模式 + guard**：`if artist == "wowaka"` 是守卫（下一节展开）；
- `Error(code=500 | 502 | 503)`：类模式内嵌或模式，一行覆盖三种错误码；
- 位置参数写法 `Song("千本樱", artist)` 依赖类的 `__match_args__`，dataclass 与 namedtuple 自动生成，自定义类要手动声明——建议统一用关键字写法，可读且不依赖隐式约定。

与 140 篇的 `namedtuple` 组合时，`Reading(sensor=s, value=v)` 这种模式让「解析一行传感器数据再按阈值分派」变成一条流水线。

## guard 守卫：模式表达不了的条件

守卫是 case 后面的 `if` 子句，覆盖「值域比较」这类结构匹配表达不了的条件：

```python
def grade_level(score):
    match score:
        case n if n >= 90:
            return "A"
        case n if n >= 80:
            return "B"
        case n if n >= 70:
            return "C"
        case n if n >= 60:
            return "D"
        case _:
            return "F"
```

这段是练习环节「成绩五档」的对照预览（详见动手实践）。守卫的求值顺序：**先匹配模式，成功后再求守卫**；守卫为 False 就继续尝试下一个 case，`n` 的绑定不会泄漏。

为什么需要守卫：模式匹配擅长「形状」，比较运算（`>=`、区间）不是形状。硬用类模式写区间（`case Score(value=v) if v >= 90`）与直接写守卫等价，所以裸值 + 守卫是最简形式。

易错点：守卫里访问的变量**必须已在当前模式（或外层）绑定**，访问未绑定的名字会 NameError。守卫不能有副作用——它可能在多次尝试中被求值多次，把「发通知」这类动作放守卫里是 bug。

## 漏写分支与穷尽性：静默掉空的另一半

if-elif 链漏写 else，数据悄悄滑过所有分支；match 的行为一摸一样——**没有通配 case 时，不匹配任何模式就什么都不做**：

```python
def handle(level):
    match level:
        case "CRITICAL":
            return "电话"
        case "WARN":
            return "记录"
    # level == "INFO" 时函数返回 None，不报错

print(handle("INFO"))    # None —— 静默掉空
```

Python（截至 3.14）不会对「漏分支」做编译期穷尽性检查，这是它与 Rust/Rust 系 match 的显著差异。工程上的补偿手段有三层，按成本递增：

1. **习惯层**：每个生产代码的 match 都以 `case _:` 收尾，把「意外数据」变成显式可见的分支（抛异常或记日志），永不静默；
2. **类型层**：配合 `Literal` 类型注解与 mypy，把合法取值收敛到类型里，mypy 的 `--enable-error-code=exhaustive-match`（较新版本）能对 `assert_never` 收尾的 match 报穷尽性错误；
3. **测试层**：参数化测试枚举所有合法取值，让漏分支在 CI 里现形（见 [Python 测试](/python/750-PythonTest)）。

写法一示例：

```python
def handle_strict(level):
    match level:
        case "CRITICAL":
            return "电话"
        case "WARN":
            return "记录"
        case unknown:
            raise ValueError(f"未处理的告警级别: {unknown}")
```

与 190 篇（TypeScript never）对照着理解：TS 靠 `never` 类型让漏分支在编译期爆红，Python 目前主要靠运行时约定——所以「`case _` 收尾 + 抛错」在 Python 里不是风格偏好，而是防静默错误的刚需。

## 什么时候还该用 if-elif

match 不是 if-elif 的替代品，边界大致是：

| 场景 | 用什么 |
| --- | --- |
| 单值等值判断（1-2 个分支） | if / if-else，别为了一个比较引入 match |
| 3 个以上分支的等值分派 | match 字面量 + 或模式，分支一目了然 |
| 需要解构（元组/字典/对象） | match，独占优势 |
| 区间比较、复合布尔条件为主 | if-elif，守卫多了反而啰嗦 |
| 分支内逻辑互斥且后续可能扩展 | match，新增 case 不动其他分支 |

## 动手实践

练习一（预测题）：不运行代码，判断输出——

```python
cmd = {"op": "add", "x": 1, "y": 2}
match cmd:
    case {"op": op, **rest}:
        print(op, rest)
```

提示：映射模式是「至少包含」语义，星号字典捕获的是什么。

<details>
<summary>参考实现</summary>

```text
add {'x': 1, 'y': 2}
```

`op` 绑定了键 `"op"` 的值 `"add"`；`**rest` 捕获**未出现在模式里的其余键值对**。注意 rest 不含 `op`——已匹配的键不会再进星号捕获。
</details>

练习二（修改题）：把 Java 篇同题的「百分制成绩五档」改写成 match 版（原题：90 分以上 A、80 以上 B、70 以上 C、60 以上 D、其余 F；输入是 0-100 的整数）。要求：非法输入（负数、超过 100）单独一个分支给出错误信息，合法分支用守卫。

提示：守卫按从大到小排列，想想为什么顺序反了会出错；非法分支可以放在最前，用 `case n if n < 0 or n > 100`。

<details>
<summary>参考实现</summary>

```python
def grade(score: int) -> str:
    match score:
        case n if n < 0 or n > 100:
            return f"非法分数: {n}"
        case n if n >= 90:
            return "A"
        case n if n >= 80:
            return "B"
        case n if n >= 70:
            return "C"
        case n if n >= 60:
            return "D"
        case _:
            return "F"

for s in (95, 85, 73, 61, 42, -1, 120):
    print(s, "->", grade(s))
```

守卫必须从高到低排列：match 按顺序尝试，若把 `case n if n >= 60` 写在最前，95 分会先落入 D 分支。最后一个 `case _` 收尾保证任何整数都有归属，与讲义题的 else 分支语义一致。这道题同样出现在 Java（switch 版）与 C 篇，同题不同语言便于对照各语言的分支语法。
</details>

练习三（实战题）：写 `dispatch_metadata(item)` 完成曲库导入路由，处理四种输入并写断言自测：

- 字符串 `"千本樱"` -> `("title_only", "千本樱")`
- 元组 `("达拉崩吧", "ilem")` -> `("song", "达拉崩吧", "ilem")`
- 字典 `{"type": "album", "title": "凡尔赛玫瑰", "tracks": [...]}`
- 其他任何输入 -> 抛 `ValueError`

提示：match 的目标可以是一个变量，四种模式依次是字面量之外的……先想想字符串模式怎么写才不会误伤其他类型（提示：`case str() as title`）。

<details>
<summary>参考实现</summary>

```python
def dispatch_metadata(item):
    match item:
        case str() as title:
            return ("title_only", title)
        case (title, artist):
            return ("song", title, artist)
        case {"type": "album", "title": title, "tracks": tracks}:
            return ("album", title, len(tracks))
        case _:
            raise ValueError(f"无法识别的元数据: {item!r}")

assert dispatch_metadata("千本樱") == ("title_only", "千本樱")
assert dispatch_metadata(("达拉崩吧", "ilem")) == ("song", "达拉崩吧", "ilem")
assert dispatch_metadata({"type": "album", "title": "凡尔赛玫瑰", "tracks": [1, 2]}) == ("album", "凡尔赛玫瑰", 2)
try:
    dispatch_metadata(42)
except ValueError:
    print("拒收 OK")
```

`case str() as title` 用类模式判断类型再用 `as` 绑定，避免 `case title`（裸捕获）把所有输入都吞掉。`case (title, artist)` 会匹配任何二元组——如果要求元素必须是字符串，可以写 `case (str() as title, str() as artist)`。
</details>

练习四（实战题）：从 CSV 读题库并按题型分派。验证码语料 CSV 每行形如 `1,选择题,Java Web 连接池,HikariCP,C3P0,DBCP,Druid`（序号、类型、题干、四个选项）。用 `csv` 模块读入，match 每行记录，选择题转 `(id, stem, options_dict)`，判断题（选项列为空）转 `(id, stem, None)`，列数不足的脏行归入 `("bad", row)` 并计数。

提示：`csv.reader` 给的是字符串列表，正好用序列模式解构；`case [sid, "选择题", stem, a, b, c, d]:` 注意列数不匹配的行会掉到哪个 case。

<details>
<summary>参考实现</summary>

```python
import csv
from collections import Counter

def parse_exam_rows(path):
    parsed, bad = [], []
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.reader(f):
            match row:
                case [sid, "选择题", stem, a, b, c, d]:
                    parsed.append((sid, stem, {"A": a, "B": b, "C": c, "D": d}))
                case [sid, "判断题", stem]:
                    parsed.append((sid, stem, None))
                case _:
                    bad.append(row)
    return parsed, Counter(len(r) for r in bad)

# parsed, bad_stats = parse_exam_rows("验证码数据_样本.csv")
# print(len(parsed), bad_stats)
```

模式 `[sid, "选择题", stem, a, b, c, d]` 隐含「恰好 7 列」：少一列的脏行自然落进 `case _`，不用手写 `len(row) == 7`。`Counter` 统计脏行列数分布，能一眼看出脏数据主要坏在哪。
</details>

练习五（找错题）：下面的 match 想把状态码分类，有三处问题，先找再修：

```python
OK = 200

def classify(code):
    match code:
        case OK:
            return "成功"
        case 400, 404:
            return "客户端错误"
        case code:
            return f"其他: {code}"
```

<details>
<summary>参考实现</summary>

```python
def classify(code):
    match code:
        case 200:
            return "成功"
        case 400 | 404:
            return "客户端错误"
        case other:
            return f"其他: {other}"
```

三处问题：`case OK` 是裸捕获（匹配一切值并绑定到 OK），永远命中第一分支——匹配常量要写字面量或 `case code if code == OK`；`case 400, 404` 是序列模式（匹配元组 `(400, 404)`）而非或模式，应为 `400 | 404`；最后一个 `case code` 覆盖了前面变量名，重名虽不报错但语义混乱，改名 `other` 以示区别。
</details>

## 常见坑点速记

- 裸小写名字是捕获不是比较，`case CRITICAL:` 永远命中；
- 映射模式是「至少包含这些键」语义，多余键不影响匹配；
- 序列模式不匹配字符串，`match "abc"` 走 `case _`；
- match 不做穷尽性检查，漏分支静默返回 None——生产代码一律 `case _:` 收尾抛错或记日志；
- 守卫在模式之后求值，可能被求值多次，别放有副作用的动作。

## 与之前和之后的知识的关系

- 往前：元组解包（[可变参数与解包](/python/110-ArgsKwargsUnpacking)）是序列模式的地基；字典的 get 与 in 检查（[内置数据结构](/python/140-BuiltinDataStructure)）被映射模式内建替代；
- 并行：[数据类](/python/550-DataClassPydantic) 的 dataclass 实例配类模式最顺手；[异常处理](/python/130-ExceptionHandling) 的 except 子句本质上也是一种模式匹配（按异常类型）；
- 往后：mypy 的 exhaustive 检查与 Literal 类型见 [类型注解与 mypy](/python/530-TypeAnnotationMypy)；TypeScript 侧的同构能力（判别联合收窄）见 [类型守卫与收窄](/python/../008-typescript/150-TypeGuardCustomGuard) 对照阅读。

## 官方文档

- PEP 634 结构模式匹配规范：https://peps.python.org/pep-0634/
- 官方教程 match 语句一节：https://docs.python.org/zh-cn/3/tutorial/controlflow.html#match-statements

## 自我检查

- 能说出 match 与 if-elif 的本质差异（匹配形状并解构，不只是比较值）；
- 能解释 `case CRITICAL:` 为什么永远命中，以及两种正确写法；
- 能用映射模式写出「至少包含 type 键，其余键进 rest」的降级分支；
- 能说清漏写通配 case 时的行为，以及三层补偿手段；
- 能判断一个场景该用 match 还是 if-elif（解构为主用 match，区间比较为主用 if-elif）。
