---
order: 280
title: '*args、**kwargs 与解包'
module: 'python'
category: 后端技术
difficulty: beginner
description: 可变参数与序列/字典解包：函数签名里的星号完全指南。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'python/027-FunctionDetailed'
  - 'python/053-ComprehensionGenerator'
prerequisites:
  - 'python/027-FunctionDetailed'
---

# *args、**kwargs 与解包

星号是 Python 参数系统里最"一词多义"的符号：写在函数定义里是**收集**（把零散实参打包成元组/字典），写在调用处是**展开**（把序列/字典拆成一堆实参）；夹在参数列表中间还承担"分界线"的角色，划分仅位置与仅关键字参数。本篇围绕虚拟歌手音乐平台的票务与曲单场景，把这几个方向一次理清，最后落到签名设计的实践原则。

## 前置知识

- [函数详解](/python/027-FunctionDetailed)：掌握默认参数、返回值与作用域，本篇在其上补齐"可变参数"这最后一块。
- [内置数据结构](/python/039-BuiltinDataStructure)：理解序列与映射两类容器，是 `*`/`**` 解包的前提。
- [推导式与生成器](/python/053-ComprehensionGenerator)：解包常与推导式组合出简洁的装配代码。

## 学习目标

1. 能区分定义侧收集（`*args`/`**kwargs`）与调用侧解包（`*`/`**`）这两个相反方向。
2. 会用 `/` 与 `*` 划分仅位置、普通、仅关键字三段参数。
3. 能用解包合并序列与字典，并解释键冲突时的覆盖规则。
4. 会读带 `*args`/`**kwargs` 的第三方签名并安全转发。
5. 形成"明写优于收集"的签名设计直觉。

## 1. 定义侧收集：*args 与 **kwargs

```python
# stage.py —— 舞台调度：定义侧收集参数
def schedule_concert(headliner, *guests, **options):
    """安排一场演唱会。

    Args:
        headliner: 头牌歌姬，必须显式给出。
        *guests: 嘉宾歌姬，收集为元组，可为空。
        **options: 附加配置，收集为字典，可为空。
    """
    print(f"头牌：{headliner}")
    print(f"嘉宾：{guests}")      # 元组
    print(f"配置：{options}")     # 字典

schedule_concert("miku", "teto", "luka", encore=True, duration=180)
# 头牌：miku
# 嘉宾：('teto', 'luka')
# 配置：{'encore': True, 'duration': 180}
```

```python
# dispatch.py —— 收集型签名的典型用途：事件注册器
handlers = {}

def on(event, *args, **kwargs):
    """注册监听器：参数形状交给回调自己决定"""
    handlers.setdefault(event, []).append((args, kwargs))

def emit(event):
    for args, kwargs in handlers.get(event, []):
        print(f"{event} 触发，参数：{args} {kwargs}")

on("concert-open", "c001", seat_limit=5000)
on("concert-open", "c002")
emit("concert-open")
```

**讲解：**

1. `*args` 把"多出来的位置参数"收成元组；`**kwargs` 把"多出来的关键字参数"收成字典。名字可以换（`*songs`、`**opts`），args/kwargs 只是约定。
2. 两者都可选：实参不足时得到空元组/空字典，不会报错——这让函数天然支持"最少只传头牌"的调用方式。
3. 声明顺序固定：普通参数 -> `*args` -> 仅关键字参数 -> `**kwargs`。头牌必须给，嘉宾与配置随缘，正符合业务直觉；这也让最简调用只剩一个参数，接口天然易用。
4. 收集型签名最常见的两类用途是注册器（`on("play", *args)` 收集监听参数）与委托包装器（转发给内部实现）；业务函数尽量明写参数，收集留给"透传"场景。
5. 注册器的价值在于把"参数形状"的决定权交给回调：on/emit 只负责收集与转发，`*args/**kwargs` 是唯一不侵入业务双方的写法。
6. 一个帮助记忆的心智模型：定义侧的星号是"容器"（把散装收进元组/字典），调用侧的星号是"漏斗"（把容器倒回散装）——记住收与倒，其余规则都能现场推出来。

## 2. 调用侧解包：* 与 ** 的另一面

```python
# unpack_call.py —— 同一对星号，在调用处是"展开"
def book_ticket(concert_id, seat, price, insurance=False):
    print(f"订单：{concert_id}｜座位 {seat}｜票价 {price}｜保险 {insurance}")

seat_info = ["c001", "A12", 680]   # 座位三要素恰好按位置对应
book_ticket(*seat_info)            # 等价 book_ticket("c001", "A12", 680)

buyer = {"insurance": True}        # 可选项用字典维护，随业务增减
book_ticket(*seat_info, **buyer)   # 等价 book_ticket("c001", "A12", 680, insurance=True)

# 混合书写：解包、位置、关键字可自由组合
book_ticket(*seat_info[:1], "B03", price=480)
```

```python
# unpack_mix.py —— 解包与"捕获剩余"：一键拆分首尾
first, *rest = ["miku", "teto", "luka", "luka"]
print(first, rest)                    # miku ['teto', 'luka', 'luka']

head, *mid, tail = sorted([98, 87, 92, 76])
print(head, mid, tail)                # 去掉最高最低分，取中段求均值
```

**讲解：**

1. 调用处的 `*` 把序列展开成一串位置参数，`**` 把字典展开成一串关键字参数——与定义侧的"收集"方向恰好相反，两者共享同一套符号。
2. 字典的键必须是与形参名匹配的字符串，出现多余键或不存在的形参都会抛 `TypeError`，这是天然的拼写检查；习惯把可选参数集中放在一个配置字典里，调用前先过滤一次。
3. 解包的价值在"零胶水装配"：座位数据在列表里、选项在配置字典里，调用时一行铺开，不需要写 `book_ticket(info[0], info[1], info[2])` 这种下标搬运。星号语义在赋值侧同样成立：`first, *rest = songs` 用星号捕获剩余元素，与调用侧解包互为镜像。
4. 解包还有两处日常出镜：日志输出 `print(*names, sep=", ")` 把列表铺成一行，函数返回 `return a, *rest` 合法（返回元组）——同一套语义处处复用。

## 3. 仅位置与仅关键字参数：/ 与 * 的分界

```python
# signature.py —— 用 / 与 * 给参数划分三段身份
def ticket_price(base, /, seat="自由席", *, fast_pass=False):
    """base 仅位置；seat 位置关键字皆可；fast_pass 仅关键字。"""
    total = base + (150 if fast_pass else 0)
    return f"{seat} 票价 {total}"

print(ticket_price(680, "A12"))            # 正确：base 按位置传
print(ticket_price(680, seat="A12", fast_pass=True))  # 正确：开关写名字
# ticket_price(base=680)                   # TypeError：base 在 / 之前，仅限位置
print(ticket_price(680, True))             # 能跑但语义错乱：True 被当成 seat
```

**讲解：**

1. `/` 之前的参数仅限位置：形参名是实现细节，重命名不会破坏任何调用方——标准库大量用它保持演进自由，自己库的"纯数据"参数也建议加 `/`。
2. `*` 之后的参数必须按关键字传：布尔开关、可选配置强制写名字，调用点一眼看清 `fast_pass=True` 是什么意思，避免 `ticket_price(680, True)` 这种靠位置猜语义的错误。

```python
# keyword_only.py —— 仅关键字参数的收益：调用点即文档
def transfer(ticket, *, to_fan, keep_copy=False):
    print(f"票 {ticket} 转给 {to_fan}，保留副本 {keep_copy}")

transfer("A12", to_fan="粉丝乙")   # 清晰：转给谁、是否保留一目了然
# transfer("A12", "粉丝乙")        # TypeError：to_fan 必须按关键字传
```
3. 三段记法：`/` 在左守位置，`*` 在右守关键字，中间是普通区。完整顺序为：仅位置、普通、`*args` 或 `*`、仅关键字、`**kwargs`。
4. 标准库的 `sorted(data, /, *, key=None, reverse=False)` 是教科书式签名：数据仅位置、配置仅关键字——模仿这个结构写自己的函数不会错。

## 4. 解包合并序列与字典

```python
# merge.py —— 解包做合并：曲单与应援色配置
song_a = ["星之歌", "回声"]
song_b = ["Tell Your World", "Melt"]
print([*song_a, *song_b])        # 列表解包合并，元素逐个铺平

defaults = {"lang": "zh", "theme": "#39c5bb"}
custom = {"theme": "#eba9ee", "seat": "A12"}   # 粉丝定制了应援色

merged = {**defaults, **custom}  # 后者覆盖前者
print(merged)                    # {'lang': 'zh', 'theme': '#eba9ee', 'seat': 'A12'}

print({**defaults, "seat": "A12"})  # 混入字面量也合法
print(defaults | custom)            # 3.9+ 的 | 运算符，语义相同
```

**讲解：**

1. `[*a, *b]` 能合并任意可迭代对象（列表、元组、生成器），`(*a, *b)`、`{*a, *b}` 对应元组与集合版本。
2. `{**defaults, **custom}` 的覆盖规则是后者覆盖前者——所以默认值在前、用户配置在后，顺序反了就会用默认值覆盖用户的选择。
3. 3.9+ 的 `dict | dict` 更简洁，但 `{**a, **b}` 可以在合并的同时塞进字面量键值，一个表达式完成"默认值 + 定制项"。解包也常配合排序取最值：`a, *rest = sorted(scores)` 把第一名与后续一次分离，比切片加索引更不易越界。

## 5. 签名设计最佳实践

```python
# design.py —— 从 *args 滥用到清晰签名
# 反例：什么都收，调用方只能翻源码猜参数
# def create_song(*args, **kwargs): ...

# 正例：必填明写并锁位置，开关仅关键字，真正不定长才交给 *
def create_song(title, producer, /, *, singers=(), bpm=120, lyrics=None):
    return {
        "title": title,
        "producer": producer,
        "singers": list(singers),   # 元组转列表，调用方好处理
        "bpm": bpm,
        "lyrics": lyrics,
    }

song = create_song("星之歌", "DECO*27", singers=("miku",), bpm=128)
print(song["singers"], song["bpm"])
```

**讲解：**

1. 参数设计的默认次序：必填的明写（必要时加 `/` 锁位置），开关与可选配置放 `*` 之后仅关键字，只有"同类数据流不定长"才用 `*args`，配置透传才用 `**kwargs`。
2. 不要用 `*args` 传"结构化数据"：接口接受任意位置参数会让调用顺序变成隐式契约；该传列表的传列表（`singers=("miku",)`）。
3. 装饰器与代理函数转发参数时才写 `def wrapper(*args, **kwargs): return f(*args, **kwargs)`，并配合 `functools.wraps` 保留原函数元信息（见 [装饰器](/python/033-Decorator)）。
4. 类型标注与签名相辅相成：`singers: tuple[str, ...] = ()` 精确表达了"不定长但同型"，比裸 `*args` 更能让调用方与静态检查器安心（类型体系见 [类型注解与 mypy](/python/063-TypeAnnotationMypy)）。
5. 标准库里随处可见这套设计：`print(*objects, sep=..., end=...)` 的 sep/end 仅关键字、`sorted(data, /, *, key=None, reverse=False)` 的 key/reverse 仅关键字——读完本篇再读标准库签名会非常顺。
6. 签名是 API 的合同，改动要讲兼容：新增参数给默认值并放进仅关键字区，废弃参数先标弃用再删除——这套纪律让"明写"不至于变成"改不动"。

```python
# typed_signature.py —— 类型标注与星号组合：既灵活又可查
def create_song(
    title: str,
    producer: str,
    /,
    *,
    singers: tuple[str, ...] = (),
    bpm: int = 120,
) -> dict:
    return {"title": title, "producer": producer, "singers": singers, "bpm": bpm}

print(create_song("回声", "ryuryu", singers=("luka",), bpm=96))
```

## 6. 进阶：用 inspect 读懂签名

面对第三方库的 `*args`/`**kwargs`，源码之外还有更可靠的入口：inspect 模块能把任意函数的签名还原成结构化对象，也能在不真正调用的情况下校验一组实参能否匹配。

```python
# signature_introspect.py —— 读取并校验函数签名
import inspect

def ticket_price(base, /, seat="自由席", *, fast_pass=False):
    return base + (150 if fast_pass else 0)

sig = inspect.signature(ticket_price)
print(sig)                      # (base, /, seat='自由席', *, fast_pass=False)

# 每个参数的种类一目了然：仅位置 / 普通 / 仅关键字
for name, param in sig.parameters.items():
    print(name, "->", param.kind.name)

# bind：不执行函数，先校验这组实参能否与签名对上
bound = sig.bind(680, fast_pass=True)
print(bound.arguments)          # {'base': 680, 'fast_pass': True}
```

**讲解：**

1. `inspect.signature` 对带 `*args`/`**kwargs` 的函数同样有效，VAR_POSITIONAL 与 VAR_KEYWORD 会如实出现在参数表中——调试第三方包装器时先看它，比翻文档快。
2. `param.kind` 区分五种参数种类，写"参数转发/适配层"时靠它判断哪些实参能安全透传；配合 `bind_partial` 还能只校验前几个参数，做渐进式适配。
3. `sig.bind(...)` 只做匹配不执行：参数校验器、注册表、依赖注入容器常用它实现"调用前先验证"，不匹配会抛 `TypeError`，与真实调用完全同源。
4. `inspect.signature` 也能读类与方法的签名：框架的依赖注入、ORM 的字段收集，底层都靠签名对象——读懂它，就读懂了一半的 Python 框架魔法。
5. 把签名对象存下来还能做"签名审计"：遍历包的公开函数，找出仍接受 `*args/**kwargs` 的旧式接口，排进重构计划。

## 易错点与最佳实践

1. **kwargs 的键拼错静默失效**：调用传 `singers=("miku",)`，形参写的是 `vocalists`，多余键全部溜进 `**kwargs` 被无声丢弃。必填参数明写 + 可选参数仅关键字，让拼错在 `TypeError` 阶段暴露。

2. **以为 *args 是列表，试图原地修改**：每次调用都新建元组，`append` 直接报 `AttributeError`：

```python
# 错误：元组没有 append
# def add_guest(*guests): guests.append("teto")
# 正确：转成列表再操作，或从一开始就接受列表参数
def add_guest(*guests):
    roster = list(guests)
    roster.append("teto")
    return roster
```

3. **调用解包的键与形参不匹配**：字典里有形参没有的键会抛 `TypeError: unexpected keyword argument`。先过滤或显式挑选需要的键，不要把任意配置字典整体灌进函数：

```python
# 错误：配置里有函数不认识的键
# book_ticket("c001", "A12", 680, **{"coupon": "X", "vip": True})
# 正确：按需挑选
config = {"coupon": "X", "insurance": True}
book_ticket("c001", "A12", 680, **{k: config[k] for k in ("insurance",) if k in config})
```

4. **合并字典顺序写反**：`{**custom, **defaults}` 让默认值覆盖了用户配置。固定口诀"默认在前，定制在后"；用 `|` 时同理是右操作数胜出。

5. **转发时忘记二次解包**：包装函数把 `args`/`kwargs` 当普通参数传下去，形参只收到一个元组和一个字典：

```python
# 错误：单层传递，f 只收到两个参数
# def wrapper(*args, **kwargs): return f(args, kwargs)
# 正确：调用处再次解包
def wrapper(*args, **kwargs):
    return f(*args, **kwargs)
```

## 本篇小结

1. 星号一词两义：定义侧收集（`*args` 成元组、`**kwargs` 成字典），调用侧展开（`*seq` 铺位置、`**dct` 铺关键字），方向相反、符号同一。
2. `/` 与 `*` 是签名里的两道分界线：仅位置参数保护形参名的演进自由，仅关键字参数保护调用点的可读性；两道线一起用就是最稳的公共签名。
3. 解包合并是装配数据的标准姿势：`[*a, *b]` 铺平序列，`{**defaults, **custom}` 合并字典且后者胜出。
4. 签名设计优先级：明写必填 > 仅关键字开关 > `*args`/`**kwargs` 兜底；转发场景（装饰器、代理）才是可变参数的主场。
5. 报错是朋友：`TypeError` 指出的多余键、缺参、位置错误，正是这套显式签名体系在替你挡住静默 bug——把每次 TypeError 都当成一次签名教育，而不是麻烦。

## 动手实践

1. **通用重试装饰器**：写一个 `retry(times=3)` 装饰器，能装饰任意签名的购票函数并转发参数，用 `functools.wraps` 保留元信息。提示：`def wrapper(*args, **kwargs)` 配合调用侧双星解包；测试时分别装饰位置参数与关键字参数风格的函数。
2. **配置合并器**：实现 `merge_settings(defaults, *overrides)`，按传入顺序依次覆盖，返回合并后的字典，并保证用户配置永远压过默认值。提示：循环里用 `{**acc, **item}` 或 `acc |= item`，最后用"默认在前"的单测验证覆盖方向。
3. **签名重构**：找一个 `def f(*args, **kwargs)` 风格的旧函数（或自己上篇的作业），按"必填明写、开关仅关键字"重构成新签名，并让旧调用方式仍然可用。提示：新签名加 `/` 与 `*` 分段，旧入口用 `*args, **kwargs` 转发到新函数，两代签名并存过渡。重构时逐条核对新旧调用的参数形态，确保没有任何调用方被静默改变行为。
