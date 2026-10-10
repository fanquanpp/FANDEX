---
order: 470
title: 类型注解与 mypy：让错误在运行前现形
module: 'python'
category: 后端技术
difficulty: advanced
description: 以「素材库清单函数在线上吞了错误字段」为事故切入，渐进式学类型注解：现代内建泛型与联合类型、mypy 首跑与 strict、TypedDict/Protocol/TypeVar/overload 的适用现场、3.12 的 type 语句与泛型新语法，附 Any 泄漏与运行时不校验两大误区、工具对比与四类练习。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'python/100-FunctionDetailed'
  - 'python/460-OOP'
  - 'python/550-DataClassPydantic'
  - 'python/770-PythonCodeQuality'
prerequisites:
  - 'python/460-OOP'
  - 'python/100-FunctionDetailed'
---

## 前置知识

- [函数详解](/python/100-FunctionDetailed)：会定义函数、写参数与返回值；
- [面向对象基础](/python/460-OOP)：懂类、方法、继承——Protocol 一节要和继承对照着讲。

> 先校准预期：类型注解**不改变运行时行为**。`def f(x: int)` 传字符串进去照样跑，Python 不会在运行时拦你。类型的价值在另一个地方：mypy 这类**静态检查器**读注解、不运行代码，就能指出「这里会炸」。本文学的是「写给检查器看的 Python」。

## 学习目标

读完本文你将能够：

1. 用现代写法（`list[int]`、`str | None`、`dict[str, int]`）给变量、函数、容器标注，并说清它与运行时的关系；
2. 在零安装依赖的情况下用 `uv run --with mypy` 跑第一次类型检查，读懂典型报错并修复；
3. 分辨四种结构化标注的适用现场：TypedDict（字典形状）、dataclass（业务实体，详见下一篇）、Protocol（鸭子类型的形式化）、TypeAlias（复用类型）；
4. 会写泛型函数（3.12 的 `def first[T](xs: list[T]) -> T` 新语法）与 `@overload` 重载声明；
5. 避开两大误区：把 `Any` 当万能解药；以为加了注解运行时就会校验。

预计 55 到 75 分钟，含 3 组动手实验与 4 道练习。

## 1. 你现在要解决什么问题

你在维护 pixel-vault（一个像素素材库），有个函数从素材清单里取主色调：

```python
def dominant_color(asset):
    return asset["palette"][asset["primary"]]
```

某天清单里有一条记录少了 `primary` 字段——程序当场 KeyError，排查半小时。你心想：要是有人在合并代码前就知道这条记录形状不对就好了。

更疼的还在后面：重构时把 `primary` 改名为 `primary_index`，全仓库搜替换，漏掉一个动态拼接的调用点，测试没覆盖到，线上又炸一次。

这两次事故的共同根因：**字典太自由，约定全靠记忆**。类型注解就是把「记忆里的约定」写成机器可查的文本：

```python
type Palette = dict[str, str]          # 色号 -> 颜色值

def dominant_color(asset: Asset) -> str:
    return asset.palette[asset.primary]
```

配合 mypy，改名字、少字段、传错类型，**在你保存文件时**就被点名，不用等运行时。这就是「渐进式类型」：Python 不强迫你全标注，你可以从最容易炸的接口开始，逐步铺开。

## 2. 先不要看解释，先试试看

零安装体验一次类型检查的威力。随便找个目录写 `buggy.py`：

```python
def greet(name: str) -> str:
    return f"你好，{name}"

greet(42)          # 忘了转字符串
```

跑起来才发现问题？不用跑，直接让检查器看：

```bash
uv run --with mypy mypy buggy.py
```

```text
buggy.py:4: error: Argument 1 to "greet" has incompatible type "int"; expected "str"  [arg-type]
Found 1 error in 1 file (checked 1 source file)
```

注意发生了什么：代码没有运行，`greet` 函数体都没执行，但错误已经被指出——文件、行号、期望类型、实际类型全齐。这是静态检查的全部工作方式：**只读代码，对照注解推理**。把 `greet(42)` 改成 `greet("阿甜")`，再跑，输出 `Success: no issues found in 1 source file`。

## 3. 现代注解语法：内建泛型与联合类型

2026 年写注解，一套就够，全部来自内建类型，无需 import：

```python
# 变量
count: int = 0
names: list[str] = []                 # 3.9 起，不再是 List[str]
prices: dict[str, float] = {}
point: tuple[float, float] = (1.0, 2.0)
flags: set[str] = set()

# 函数
def find_asset(vid: int, label: str | None = None) -> dict | None:
    ...
```

三个现代要点：

- **容器泛型直接写内建类型**：`list[int]`、`dict[str, int]`。老的 `typing.List`、`typing.Dict` 是 3.9 前的遗物，别再写；
- **联合类型用竖线**：`str | None` 表示「字符串或 None」。老的 `Optional[str]`、`Union[str, None]` 与它完全等价，新代码统一用竖线；
- **返回值不省略**：公开函数永远标注返回类型，它是调用方最需要的信息；局部变量在类型显而易见时可以不标（`count = 0` 就够了），在「初始化为空、后续填充」时必须标（`names: list[str] = []`——不然检查器不知道后面该装什么）。

参数默认值 `None` 时，注解必须是 `| None` 而不能只写实际类型——`def f(label: str = None)` 会被 mypy 当错误（`Incompatible default`），这是新手最常撞的第一类报错。

## 4. mypy 上手与 strict

真实项目用法：安装后配一个最简 `mypy.ini`（或 `pyproject.toml` 里的 `[tool.mypy]`）：

```bash
uv add --dev mypy
uv run mypy src/
```

```toml
[tool.mypy]
python_version = "3.12"
warn_unused_ignores = true
```

检查强度从「默认」到「严格」差很多。团队推类型的正确姿势是**渐进收紧**：默认档起步，核心模块先开 `strict = true`，跑通后再扩大。`--strict` 一览（不必背，知道它是「一组开关打包」即可）：禁止无类型函数定义、`Any` 显性化、要求标注完整等。

两个高频工作流：

```python
# 1. 询问类型：检查器认为这个表达式是什么类型？
reveal_type(dominant_color(asset))   # mypy 输出: Revealed type is "builtins.str"

# 2. 压制误报：明确告诉检查器「这里我懂，别管」
data = json.loads(raw)               # json 返回 Any
asset_id = data["id"]                # ignore 前先想想能不能用 TypedDict 收窄（下一节）
```

`# type: ignore[...]` 是逃生门不是日常：带错误码（`ignore[arg-type]`）并配 `warn_unused_ignores`，保证 ignore 不腐化。

修改实验一：把 buggy.py 改成 `greet("42")` 加一行 `reveal_type(greet("42"))`，跑 mypy 看输出；再故意传 `None`，读报错，补 `| None` 修复。

## 5. 给「形状」正名：TypedDict 与别名

回到 pixel-vault。素材记录是字典，结构固定——TypedDict 专门管这个：

```python
from typing import TypedDict

class Asset(TypedDict):
    vid: int
    name: str
    palette: dict[str, str]
    primary: str

def dominant_color(asset: Asset) -> str:
    return asset["palette"][asset["primary"]]

dominant_color({"vid": 1, "name": "miku", "palette": {"#39C5BB": "teal"}})
# error: Missing typed dict entry "primary" —— 少字段的清单，保存时就被抓
```

TypedDict 时刻提醒自己是**字典**：运行时就是普通 dict，检查器只核对键的形状。字段可缺省用 `total=False` 或 3.11+ 的 `NotRequired`。

复用形状起名用 `type` 语句（3.12 起）：

```python
type Palette = dict[str, str]
type AssetPair = tuple[Asset, Asset]

def swap(a: AssetPair) -> AssetPair: ...
```

它等价于老写法 `Palette: TypeAlias = dict[str, str]`，新代码用 `type`。判断器：「一组键值约定」用 TypedDict；「一个业务实体、带行为」用 dataclass（下一篇的主角）；「纯粹想给复杂类型起名」用 type 别名。

## 6. Protocol：鸭子类型终于有了体检单

Python 的信条是鸭子类型：「走起来像鸭子就叫鸭子」，函数从不检查参数是不是某个类，只关心它有没有那个方法。代价是约定无法检查。**Protocol（结构化子类型）把约定写下来，但不要求继承**：

```python
from typing import Protocol

class Exporter(Protocol):
    def export(self, data: dict[str, str]) -> str: ...

class PNGExporter:                     # 注意：没有继承 Exporter！
    def export(self, data: dict[str, str]) -> str:
        return "\n".join(f"{k}={v}" for k, v in data.items())

def save(exporter: Exporter, data: dict[str, str]) -> None:
    print(exporter.export(data))

save(PNGExporter(), {"name": "miku"})   # 通过：有同签名的 export 就是 Exporter
```

mypy 检查的是「形状匹配」：`PNGExporter` 与 `Exporter` 毫无继承关系，方法签名对上就算数。这解决了继承式接口（ABC）的两个老问题：第三方类没法挂你的基类；继承把类型耦合拖进运行时。判断器：**想约束「能干什么」（方法集合），用 Protocol；想复现「是什么」（共享实现），才用继承**。

## 7. 泛型：写「类型跟着输入走」的函数

先看没有泛型的尴尬：

```python
def first(xs: list[int]) -> int: ...      # 只能用于 int
def first(xs: list) -> object: ...        # 通用了，但丢了类型信息
```

泛型把「元素类型」变成参数。3.12 的新语法把这件事写得前所未有地直白：

```python
def first[T](xs: list[T]) -> T:
    return xs[0]

first([1, 2, 3])     # 推断为 int
first(["a", "b"])    # 推断为 str
```

`[T]` 声明类型参数，T 由调用现场自动推断。泛型类同款：

```python
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()
```

老写法（`T = TypeVar("T")` + `Generic[T]`）在 2026 年的代码里仍大量存在，看得懂即可；新代码一律用方括号直书。进阶约束用界：`def scale[C: Complex](c: C, k: float) -> C` 限定 C 必须支持复数运算——「能参与运算」的语义约束，比裸 T 更准确。

修改实验二：给 Stack 加 `peek()`（返回栈顶但不出栈），标注返回类型；在 mypy 下验证 `s = Stack[str](); s.push(1)` 会被拒绝。

## 8. overload：一个函数的多副面孔

有的函数返回类型取决于参数，比如「传两个 int 得 int，传两个 str 得拼接 str」。单一注解只能写错一边：

```python
from typing import overload

@overload
def concat(a: int, b: int) -> int: ...
@overload
def concat(a: str, b: str) -> str: ...

def concat(a, b):                      # 真正的实现不标注（已由上面声明覆盖）
    return a + b

concat("hel", "lo") + "!"              # mypy 知道结果是 str，接 str 合法
concat("hel", 5)                       # error: No overload variant matches
```

两个 `@overload` 只是给检查器的「说明书」，函数体全是 `...`；最后的实现才是运行时执行的那份。适用场景不多但不可替代：`open()` 就是靠 overload 声明「文本模式返回 TextIO、二进制模式返回 BufferedIO」的。

## 8.5 进阶工具速览：Callable、ParamSpec、TypeIs

三个查表时常见、按需取用的进阶件，收在这里避免翻文档：

**Callable：给「函数本身」标注**。参数列表用下标写、返回类型放末位：

```python
from collections.abc import Callable   # 3.9 起 Callable 归 collections.abc

def apply(op: Callable[[int, int], int], a: int, b: int) -> int:
    return op(a, b)
```

无参数的函数写 `Callable[[], str]`。回调与策略函数的标配。

**ParamSpec 与 TypeVarTuple**。装饰器要「原样转发参数」时，普通 TypeVar 描述不了参数形状，ParamSpec 专管这个：

```python
from collections.abc import Callable
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")

def logged(func: Callable[P, R]) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print(f"调用 {func.__name__}")
        return func(*args, **kwargs)
    return wrapper
```

TypeVarTuple（`*Ts`）对应「可变数量的类型参数」，服务于形状计算类的库（NumPy 封装等），业务代码极少直接用。

**TypeIs：比 TypeGuard 更强的类型守卫**（3.13）。两者都让 `if` 分支收窄类型，区别在 TypeGuard 只承诺「是」，进入分支收窄、else 分支不收窄；TypeIs 承诺「是且仅是」，双向收窄：

```python
from typing import TypeIs

def is_str_list(val: list[object]) -> TypeIs[list[str]]:
    return all(isinstance(x, str) for x in val)
```

写类型谓词函数时默认选 TypeIs，仅在「检查通过不能推出检查失败」的场景退回 TypeGuard。

**Concatenate：描述「装饰器吃掉/补上参数」后的签名**。ParamSpec 描述「参数原样转发」，还有一种形状是「转发前先塞一个参数」（最典型：给每个被装饰函数补一个 logger 首参）——`Concatenate` 专管这个：

```python
from collections.abc import Callable
from typing import Concatenate

def with_logging[**P, R](fn: Callable[Concatenate[str, P], R]) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return fn("app.logger", *args, **kwargs)   # 第一个参数是装饰器注入的
    return wrapper
```

逐段读：`Callable[Concatenate[str, P], R]` 的含义是「第一个参数必须是 str，其余参数形状是 P」；返回值 `Callable[P, R]` 表示装饰后的函数**不再需要**那个 str——它由 wrapper 内部注入。没有 Concatenate 时这层「吃掉首参」的变换没法标注，mypy 只能报不匹配或放过。3.12 起 `def with_logging[**P, R]` 的泛型语法把外层 TypeVar 声明一并收进签名（见前文 type 语句一节）。

**override 装饰器：让「想重写却拼错了」变成检查错误**（3.12）。子类重写父类方法时，方法名打错字母不会报错——Python 只会安静地新增一个方法，父类接口悄悄漏实现。`typing.override` 把意图写给检查器：

```python
from typing import override

class Animal:
    def speak(self) -> str:
        return "..."

class Dog(Animal):
    @override
    def speak(self) -> str:          # 父类确有 speak，检查通过
        return "汪"

    @override
    def ftech(self) -> str:          # mypy: Method "ftech" is marked as override,
        return "捡球"                 # but no base method "fetch" —— 拼写错误当场暴露
```

与 Java 的 `@Override` 注解同一动机：**重写是契约，拼错了就该是错误而不是新方法**。启用方式：mypy 加 `--enable-error-code=explicit-override`（或配置文件对应项）。判断器：继承体系里所有「我有意重写」的方法都标 override——它不改变任何运行时行为，纯粹把「父类里到底有没有这个名字」变成机器可查。与 Protocol 的分工：Protocol 管「形状对不对」，override 管「重写关系对不对」。


误区一：**把 Any 当万能解**。任何值都能赋给 `Any`，`Any` 也能赋给任何类型——等于关掉检查。json、数据库驱动返回 `Any` 是现实，正确姿势是**尽快收窄**：包一层返回 TypedDict 或 dataclass 的解析函数，让 `Any` 活不过三行。

误区二：**以为注解 = 运行时校验**。注解对解释器基本是注释；要运行时校验（用户输入、API 报文）用 Pydantic——它的模型类会用注解在运行时真的检查并转换数据，是下一篇的主场。一句话分工：**mypy 管代码内部约定，Pydantic 管边界上的外部数据**。

检查器选择速查：

| 工具 | 出品 | 特点 |
| --- | --- | --- |
| mypy | 类型系统参考实现 | 生态最广、报错规范，CI 首选 |
| pyright | 微软（Pylance 内核） | 快、IDE 体验最好，配置语系独立 |
| pyre | Meta | 大库规模快，使用者偏少 |

团队二选一（mypy 或 pyright）即可，另一者装着当 IDE 提示；两者对标准语法结论一致，分歧多在边角与严格档含义。

## 10. 什么时候应该 / 不应该

应该：所有公开函数与 API 标注；从最容易炸的数据边界（清单解析、配置读取）开始铺；CI 里跑检查器并逐步收紧；`Any` 出现后立刻收窄。

不应该：给每次临时实验的类型练习全量标注；为通过检查写下成片的 `type: ignore`；用注解替代输入校验；在旧代码上一次性全量 strict（先增量）。

## 11. 与之前和之后的知识的关系

- 往前：[函数详解](/python/100-FunctionDetailed) 的参数与返回值是注解的宿主；[面向对象](/python/460-OOP) 的继承与本文 Protocol 的结构化检查互为对照；
- 往后：[数据类与 Pydantic](/python/550-DataClassPydantic) 把注解变成运行时的校验与序列化引擎；[测试](/python/750-PythonTest) 与 [代码质量](/python/770-PythonCodeQuality) 把 mypy 接进 CI 闸口；[上下文管理器](/python/520-ContextManager) 里 `__enter__` 的返回类型注解是 Protocol 的日常受害者。类型与测试不互替：类型挡「形状错误」，测试挡「逻辑错误」，都要。

## 12. 官方文档

- typing 模块（标准库参考）：https://docs.python.org/zh-cn/3/library/typing.html
- 官方类型系统规格（含新语法演进）：https://typing.readthedocs.io/
- mypy 文档：https://mypy.readthedocs.io/

## 13. 自我检查

- 能向同事解释「注解不改变运行时行为，价值在静态检查」；
- 能默写 `list[int]`、`str | None`、`dict[str, str]` 三种现代写法并说出旧写法名；
- 能现场用 `uv run --with mypy` 跑一次检查并读懂一条 [arg-type] 报错；
- 能按「字典形状 / 业务实体 / 方法约定 / 类型起名」四问分别选对 TypedDict / dataclass / Protocol / type；
- 能写出 3.12 泛型函数并解释 T 如何被推断；
- 记得 Any 要收窄、注解不校验边界数据。

## 练习

预测题：`def f(x: int) -> int: return x`，调用 `f("3")`。运行它会发生什么？跑 mypy 又会发生什么？先分别预测再动手。

修改题：把 pixel-vault 的 `dominant_color` 完整 TypedDict 化：Asset、Palette、函数签名，并写两条「缺字段」用例，用 mypy 验证被拒。

排错题：同事写了 `def parse(s: str = None) -> list: ...`，mypy 报两条错。指出是哪两条（默认值类型不符；返回缺参数化），给出修好的签名。

挑战题：用 Protocol + 泛型实现 `dump_all(items: list[T], exporter: Exporter) -> list[str]`，其中 Exporter 的 export 方法接受任意类型 T；再用两个不同类验证结构化匹配，最后故意让其中一个类的 export 改名，确认 mypy 拦截。

## 本章总结

注解是写给检查器的约定：现代写法内建泛型加竖线联合，3.12 起连泛型与别名都是一等语法；mypy 只读代码就能报错，reveal_type 是探针、ignore 是带码逃生门；形状约定用 TypedDict、实体用 dataclass、方法约定用 Protocol（结构匹配不问血统）、复用命名用 type；多面返回值交给 overload；Any 要收窄、边界校验归 Pydantic、mypy 与测试互不替代——类型不是给 Python 添规矩，是把你们团队本来就有的约定变成机器可查的事实。

## 下一步

注解写好了，让它在运行时真正干活：进入 [数据类与 Pydantic](/python/550-DataClassPydantic)，看同一份注解如何变成校验、默认值与序列化的一等公民。
