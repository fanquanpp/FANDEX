---
order: 330
title: 序列化：JSON 往返与 pickle 的边界
description: 以「把分析结果交给下一个程序」为场景，建立「序列化是类型降维」的心智模型：JSON 的六种类型宇宙、往返不对称实测、default 与 object_hook 双向挂钩、金额与 Decimal 的精度处理、dataclass 与 pydantic 的出口，最后划清 pickle 的适用边界与反序列化任意代码执行的安全红线。
module: 'python'
category: 后端技术
difficulty: intermediate
author: fanquanpp
updated: '2026-10-05'
related:
  - 'python/300-FileIOContextManager'
  - 'python/550-DataClassPydantic'
  - 'python/230-DecimalFractions'
prerequisites:
  - 'python/070-BasicDataType'
  - 'python/300-FileIOContextManager'
---

## 前置知识

- [文件 IO 与上下文管理器](/python/300-FileIOContextManager)：会用 `with open` 读写文件，见过 `json.load` 的基础用法；
- [基本数据类型](/python/070-BasicDataType)：熟悉 dict、list、tuple 的区别。

## 你现在要解决什么问题

跑完一次分析，内存里是一个嵌套的 Python 对象：dict 套 list 套 dataclass，字段里还有 `datetime` 时间戳、`Decimal` 金额。现在要把它存盘、或者发给另一个服务（对端也许是 Java，也许是浏览器）。直接 `f.write(str(result))` 当然不行——下一个程序没法把一段「人话」解析回结构。

**序列化（serialization）就是把内存中的对象图压平成一串可传输的字节或文本；反序列化是从这串数据重建对象。**Python 世界两大主流方案：通用的 **JSON** 与 Python 专属的 **pickle**。本篇讲清 JSON 的类型宇宙与往返陷阱、双向定制的方法，以及 pickle 那条不能踩的安全红线。

## 先动手：撞一次类型墙

```python
import json
from datetime import datetime, timezone

result = {
    "device": "bedroom-01",
    "recorded_at": datetime.now(timezone.utc),
    "readings": [23.1, 22.8, 23.0],
}

json.dumps(result)
```

```text
TypeError: Object of type datetime is not JSON serializable
```

报错不是说 JSON 不好，而是在告诉你它的设计前提：**JSON 只认六种类型**——字符串、数字、布尔、null、数组、对象（键必须是字符串）。Python 里的 `datetime`、`Decimal`、`UUID`、`set`、`bytes`、自定义类，都不在这六种之内。序列化方案设计的核心问题因此只有一个：**你的领域类型怎么映射到这六种里去，回来时怎么映射回来。**

## 心智模型：往返不是恒等变换

很多人默认「dump 再 load 就回到原对象」。实测一遍就知道这是个危险的假设：

```python
import json

d = {3: "n", True: "b", "x": (1, 2.5), "y": None}
back = json.loads(json.dumps(d))
print(d)
print(back)
```

```text
{3: 'n', True: 'b', 'x': (1, 2.5), 'y': None}
{'3': 'n', 'true': 'b', 'x': [1, 2.5], 'y': None}
```

三处静默变形：**整数键 `3` 变成字符串 `"3"`；布尔键 `True` 变成字符串 `"true"`；元组变列表**。因为 JSON 的对象键只能是字符串、值没有元组概念。这些变形不报错、不警告，等你在下游用 `data[3]` 取值时才炸。

于是有两条实践纪律：

- **序列化前主动整形**：dict 键统一用 `str`，不需要键值语义的序列用 list；先转换再 dump，而不是指望 load 帮你变回去；
- **往返之后做一次对账**：关键数据用 `assert` 或测试固定住「load 回来的结构长什么样」。

## 双向挂钩：default 与 object_hook

`json` 模块在两个方向各留了一个钩子。**编码方向**用 `default`：遇到不认识的类型时被调用，返回「能表达的替身」。行业约定俗成的映射是把领域类型转成带类型的 ISO 字符串：

```python
import json
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

def json_default(o):
    if isinstance(o, datetime):
        return o.isoformat()               # "2026-10-04T07:30:00+00:00"
    if isinstance(o, Decimal):
        return str(o)                      # "19.99"，绝不用 float 承载金额
    if isinstance(o, UUID):
        return str(o)
    raise TypeError(f"{type(o).__name__} is not JSON serializable")

record = {"t": datetime.now(timezone.utc), "price": Decimal("19.99"),
          "id": UUID("12345678-1234-5678-1234-567812345678")}
text = json.dumps(record, default=json_default)
print(text)
```

```text
{"t": "2026-10-04T07:30:00+00:00", "price": "19.99", "id": "12345678-1234-5678-1234-567812345678"}
```

**解码方向**用 `object_hook`：每解析完一个 JSON 对象就调用一次，你可以在里面把特定形状的字符串还原成领域类型：

```python
def as_datetime(d):
    if "t" in d and isinstance(d["t"], str) and d["t"].endswith(("Z", "+00:00")):
        d["t"] = datetime.fromisoformat(d["t"])
    return d

obj = json.loads(text, object_hook=as_datetime)
print(type(obj["t"]))       # <class 'datetime.datetime'>
```

写不写 `object_hook` 取决于团队约定：很多项目故意只还原一层（时间），其余留给调用方判断——**反序列化端恢复的类型越多，两端耦合越深**。

## 常用参数：这四个值得记住

| 参数 | 作用 | 典型场景 |
| --- | --- | --- |
| `ensure_ascii=False` | 中文直接输出而非 `\uXXXX` 转义 | 面向人的文件、日志 |
| `indent=2` | 缩进美化 | 配置文件、调试 |
| `sort_keys=True` | 键排序，输出稳定 | 生成 diff 友好的快照 |
| `parse_float=Decimal` | 小数解析为 Decimal 而非 float | 金额、计费 |

`parse_float` 值得单独强调：JSON 文本里的 `19.99` 默认解析成二进制浮点数，从此就是 `19.989999999999998...` 的邻居（浮点原理见 [小数、分数与精度](/python/230-DecimalFractions)）。金额类数据在解析端就换成 `Decimal`，比事后 `Decimal(str(x))` 干净。

## dataclass 与 pydantic 的出口

手写 `default` 适合零散字段；成体系的业务对象有更顺的出口。dataclass 用标准库的 `asdict` 先降维再 dump：

```python
from dataclasses import dataclass, asdict
import json

@dataclass
class Reading:
    device: str
    value: float

r = Reading("bedroom-01", 23.1)
json.dumps(asdict(r))            # '{"device": "bedroom-01", "value": 23.1}'
```

`asdict` 只递归转换 dataclass、dict、list 这些「安全」容器，遇到 `datetime` 照样要 `default` 接住。字段多、还要校验输入时，直接用 pydantic：`model_dump_json()` / `model_validate_json()` 一行完成双向，校验规则写在模型里（完整用法见 [DataClass 与 Pydantic](/python/550-DataClassPydantic)）。

## pickle：Python 专属的任意对象序列化

JSON 装不下的东西，pickle 几乎都能装：任意嵌套的 Python 对象图、自定义类实例、bytes、函数引用。用法对称而简单：

```python
import pickle

with open("cache.pkl", "wb") as f:      # 二进制模式，pickle 产物不是文本
    pickle.dump(result, f)

with open("cache.pkl", "rb") as f:
    result2 = pickle.load(f)
```

它的三个边界决定了「什么时候不该用」：

**边界一：只连得回 Python。**pickle 产物是 Python 专有二进制协议（3.8 起默认协议 5），Java、浏览器、数据库都读不了。跨语言一律 JSON。

**边界二：反序列化等于执行代码——这是安全红线。**pickle 格式里可以内嵌「重建对象时要调用的代码」，`pickle.load` 一个恶意构造的文件，等于在你的进程里运行攻击者的任意代码。官方文档用整段警告强调这一点。推论非常具体：**绝不 `pickle.load` 任何来源不可信的数据**——网上下载的 `.pkl` 模型文件、别人发的缓存、用户上传的附件都算。跨进程消息队列、RPC 里传 pickle 时，「对端可信」必须是显式前提。

**边界三：对代码演化脆弱。**pickle 记录的是「类在哪个模块、叫什么名字」+ 属性快照。之后你把类改名、挪模块、增删字段，旧 pickle 大概率读不回来或读出半新半旧的对象。它适合**短期缓存、进程间传输**这类「代码与数据同生共死」的场景，不适合长期归档——归档用 JSON（人还能读）加显式版本号。

## CSV：表格数据的读写与 newline 约定

CSV 与 JSON/pickle 不同类：它没有嵌套结构，只有「行 + 列」的平面表格，换来的好处是 Excel、数据库导出、任何语言都认。标准库 `csv` 模块的读写四个入口：

```python
import csv

def read_rows(path: str) -> None:
    with open(path, "r", encoding="utf-8", newline="") as f:   # newline="" 是硬约定
        for row in csv.reader(f):              # 每行是字符串列表
            print(row)

def read_dicts(path: str) -> None:
    with open(path, "r", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):          # 首行当表头，每行是字典
            print(row["name"], row["age"])

def write_rows(path: str, data: list[list]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows(data)          # 逐批写入

def write_dicts(path: str, rows: list[dict]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "age"])
        writer.writeheader()                   # DictWriter 必须先写表头
        writer.writerows(rows)
```

逐段解释两条最容易踩的纪律。其一，`newline=""` 是官方文档明确要求的硬约定：csv 模块自己管理换行，若让 `open` 的通用换行翻译介入（默认行为），Windows 上写出的文件会出现 `\r\r\n`、Excel 打开行间多出空行——`newline=""` 把换行控制权完整交给 csv 模块。换成不写 `newline` 的写法：Linux 上看不出来（都是 `\n`），一到 Windows 就双倍换行，是「我这好好的、同事打开全乱了」的典型来源。其二，`DictWriter` 的 `fieldnames` 是**列序契约**：写入按 fieldnames 的顺序取字典字段，字典里多出的字段默认被忽略（不报错）、缺的写成空值——列序对不上的下游导入事故多源于此，要严格校验配 `extrasaction="raise"`。

reader 与 DictReader 的选型：`reader` 快、省内存（无表头解析），适合列位置固定的机器间交换；`DictReader` 按列名取值、列序变化不敏感，适合人维护的表格与字段较多的数据——按名取值 `row["age"]` 也让代码可读。JSON 配置与 CSV 报表的分工：结构化嵌套用 JSON，平面表格给 Excel/下游系统用 CSV。

## 选型速查

| 方案 | 互通性 | 能装什么 | 典型用途 |
| --- | --- | --- | --- |
| `json` | 任何语言 | 六种 JSON 类型 + 你的映射 | API、配置、文件交换 |
| `csv` | 任何语言 + Excel | 平面表格（行 + 列） | 报表导出、数据库批量交换 |
| orjson / msgpack | 通用（二进制更快更小） | 同 JSON | 高吞吐服务间传输 |
| `pickle` | 仅 Python | 几乎任意对象 | 进程间通信、可信缓存 |
| pydantic | JSON | 带校验的业务模型 | FastAPI 输入输出 |

标准库 `multiprocessing` 在进程之间传对象用的正是 pickle——这也是「传给子进程的参数必须可 pickle」这个报错的出处（见 [多进程与多线程](/python/630-MultiprocessingMultithreading)）。Celery 这类任务队列默认用 JSON 序列化任务参数，正是为了规避 pickle 的安全面。

## 坑点实录

坑一：整数键往返变字符串。上文实测过。下游按 `int` 取键就炸；要么键统一 `str`，要么改用「键值对列表」表达。

坑二：金额用 float 走完一生。`19.99` dump 成 `19.99`、load 成 `19.989999...`，最后差一分钱对不上账。编码侧 `str(o)`，解码侧 `parse_float=Decimal`。

坑三：`NaN`/`Infinity` 默认能写进「JSON」。`json.dumps(float("nan"))` 默认输出 `NaN`——这不是合法 JSON，浏览器和 Java 的解析器会直接报错。开 `allow_nan=False` 让 Python 在编码时就拒绝，把问题拦在自己这边。

坑四：中文变 `\u4e2d\u6587`。默认 `ensure_ascii=True`，文件照样能用但人没法读、diff 也没法看。面向人的输出记得 `ensure_ascii=False`（文件用 `encoding="utf-8"` 打开）。

坑五：给不可信数据 `pickle.load`。上文安全红线的日常形态：同事从网上下载的预训练模型缓存、爬虫存的 `.pkl`。一句 `pickle.load` 就交出了整个进程。不可信来源只有一条路：JSON 加 schema 校验。

坑六：pickle 过了半个版本读不回。类挪了模块、改了名、`__init__` 签名变了，旧缓存文件集体报废。把「缓存文件带 schema 版本号」写进习惯，升级时主动失效重建。

## 官方文档

- json 模块：https://docs.python.org/zh-cn/3/library/json.html
- pickle 模块（含安全警告）：https://docs.python.org/zh-cn/3/library/pickle.html
- dataclasses.asdict：https://docs.python.org/zh-cn/3/library/dataclasses.html

## 自我检查

- 能背出 JSON 类型宇宙的六种成员，并说出「往返不是恒等变换」的三个实例；
- 能写出带 `default` 的 dumps 与带 `object_hook` 的 loads，说清两个钩子各在哪一侧被调用；
- 知道金额类数据在编码侧与解码侧各该怎么处理；
- 能完整说出 pickle 的三个边界，特别是安全红线的机制与推论；
- 拿到一个新场景能按选型表说出理由。

## 练习

1. 预测题：`json.dumps({"a": {1: "x"}})` 与 `json.loads(json.dumps({"a": {1: "x"}}))["a"][1]` 各是什么结果？先写答案再运行。

2. 修改题：下面的函数在遇到 `set` 字段时抛 `TypeError`，请扩展 `json_default` 让集合变成**排好序的列表**（提示：`set` 无序，先 `sorted`）：

   ```python
   def json_default(o):
       if isinstance(o, datetime):
           return o.isoformat()
       raise TypeError(f"{type(o).__name__} is not JSON serializable")
   ```

3. 实战题：写 `save_snapshot(obj, path)` 与 `load_snapshot(path)`，用 JSON + `json_default` + `object_hook` 实现 `datetime` 与 `Decimal` 的无损往返，并用一个含这两种字段的 dict 写「往返后字段值相等」的断言测试。

4. 挑战题：构造一个演示——把同一个含 `Decimal("19.99")` 的对象分别用「float 一条路」与「Decimal 一条路」序列化再解析，打印两条路径最终参与求和 1000 次后的总额差异，写三句话说明为什么金额从解析入口就不能用 float。

<details>
<summary>点击查看参考实现</summary>

```python
import json
from datetime import datetime
from decimal import Decimal

# 1. 预测题答案
# dumps: {"a": {"1": "x"}}（整数键被转成字符串）
# loads 后 ["a"][1] 抛 KeyError: 1（键已是 "1"）

# 2. 修改题
def json_default(o):
    if isinstance(o, datetime):
        return o.isoformat()
    if isinstance(o, set):
        return sorted(o)               # 集合定序，往返才稳定
    raise TypeError(f"{type(o).__name__} is not JSON serializable")

# 3. 实战题
HOOK_KEY = "__type__"

def save_default(o):
    if isinstance(o, datetime):
        return {HOOK_KEY: "datetime", "value": o.isoformat()}
    if isinstance(o, Decimal):
        return {HOOK_KEY: "decimal", "value": str(o)}
    raise TypeError(f"{type(o).__name__} is not JSON serializable")

def load_hook(d):
    if d.get(HOOK_KEY) == "datetime":
        return datetime.fromisoformat(d["value"])
    if d.get(HOOK_KEY) == "decimal":
        return Decimal(d["value"])
    return d

def save_snapshot(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, default=save_default, ensure_ascii=False, indent=2)

def load_snapshot(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f, object_hook=load_hook)

# 4. 挑战题：两条路径的口径差
import json as j
# float 一条路：文本里的 19.99 直接解析成二进制浮点（默认行为）
via_float = j.loads('{"p": 19.99}')['p']
# Decimal 一条路：解析入口就换成 Decimal
via_decimal = j.loads('{"p": 19.99}', parse_float=Decimal)['p']
total_float = sum(via_float for _ in range(1000))
total_decimal = sum(via_decimal for _ in range(1000))
print(float(total_decimal))   # 19990.0（精确）
print(total_float)            # 19989.999999999672 这类脏值
```

结论三句话：二进制浮点装不下 0.01 这种十进制小数；误差在千次累加里可见；金额的序列化两端（`parse_float=Decimal` 与 `str(o)`）都要守住 Decimal，任何一段漏掉就前功尽弃。

</details>

## 下一步

- 业务模型带校验的序列化正解：[DataClass 与 Pydantic](/python/550-DataClassPydantic)；
- 为什么金额必须 Decimal：[小数、分数与精度](/python/230-DecimalFractions)；
- 进程间传对象撞上「不可 pickle」时的机制解释：[多进程与多线程](/python/630-MultiprocessingMultithreading)。
