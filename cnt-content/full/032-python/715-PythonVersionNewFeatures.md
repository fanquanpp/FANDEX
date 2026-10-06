---
order: 640
title: 版本新特性时间线：3.12 到 3.14
module: 'python'
category: 后端技术
difficulty: beginner
description: 把 2022 到 2025 三年版本演进按「3.12 语法表达力、3.13 性能与自由线程实验、3.14 自由线程转正与延迟注解」串成时间线，逐特性配前后对照代码并标注版本下限（PEP 695/701/649/750/779/734），练习含 TypeVar 改写与 t-string 转义器。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 语言与解释器的版本演进——3.12（2023）、3.13（2024）、3.14（2025）三个版本的关键特性，是「语法篇与性能篇」的横向时间轴。
- **解决什么问题**：网上教程与代码片段混杂着新旧写法：有的用 `TypeVar` 三行声明泛型，有的直接 `class Stack[T]`；有的 f-string 不能嵌套同类引号，有的可以。不知道版本下限，读到新语法不知道是「新特性」还是「写错了」，自己写的代码也不知道能依赖哪些能力。
- **什么时候用到**：升级解释器前评估收益、读开源代码认出新语法、在 CI 里锁最低支持版本（`requires-python`）时对照。泛型语法的类型系统含义见 [类型注解与 mypy](/python/530-TypeAnnotationMypy)，自由线程的并发原理见 [GIL 与自由线程](/python/650-GILAndFreeThreading)，解释器与版本管理工具见 [pyenv 与 uv](/python/030-PyenvUvManage)。

## 3.12（2023）：类型参数与 f-string 解禁

### PEP 695 类型参数语法：泛型声明的瘦身

3.12 之前声明泛型要「先造 TypeVar、再挂 Generic、再到处引用」三件套：

```python
# Python 3.11 及以前
from typing import TypeVar, Generic

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self) -> None:
        self.items: list[T] = []

    def push(self, item: T) -> None:
        self.items.append(item)

    def pop(self) -> T:
        return self.items.pop()

def first(items: list[T]) -> T:
    return items[0]
```

3.12 起类型参数直接写在方括号里，TypeVar 变量消失：

```python
# Python 3.12+
class Stack[T]:
    def __init__(self) -> None:
        self.items: list[T] = []

    def push(self, item: T) -> None:
        self.items.append(item)

    def pop(self) -> T:
        return self.items.pop()

def first[T](items: list[T]) -> T:
    return items[0]
```

逐段对照：`class Stack[T]` 一行替代了「`T = TypeVar("T")` + `Generic[T]`」两处声明；约束类型参数用下界元组语法 `class Numeric[T: (int, float)]`（替代 `TypeVar("T", int, float)`）。为什么值得升级写法：TypeVar 的名字是字符串参数（`TypeVar("T")` 的 `"T"` 与变量名 `T` 不一致不报错，历史上是隐性 bug 源），新语法让作用域由词法决定，检查器更容易验证。

类型别名也换了关键字。旧的 `Vector = list[float]` 是普通赋值（mypy 靠约定识别），3.12 的 `type` 语句是**真正的别名声明**，支持递归与惰性求值：

```python
# Python 3.12+
type Vector = list[float]
type Matrix = list[list[float]]          # 递归引用没问题
type Json = int | float | str | bool | None | list["Json"] | dict[str, "Json"]
```

递归的 `Json` 别名在旧写法里需要字符串引号加显式 TypeAlias 注解才能工作，`type` 语句直接支持。

### PEP 701：f-string 不再有三条禁令

3.12 之前 f-string 有三条历史限制：不能复用与外层相同的引号、不能含反斜杠、表达式部分不能有注释。全部解除：

```python
# Python 3.12+
name = "world"
greeting = f"Hello, {f"inner {name}"}!"        # 同引号嵌套
path = f"{'\\'.join(['home', 'user'])}"        # 表达式里用反斜杠
total = f"""
    合计: {
        a + b   # 表达式里写注释
    }
"""                                             # 多行表达式
```

旧版跑这三行分别报 `SyntaxError: f-string: unmatched '('`、`f-string expression part cannot include a backslash` 等。为什么原来有禁令：旧 f-string 在词法层一次性解析，3.12 改成真正的 PEG 解析器递归处理——这是「实现改进解锁语言能力」的典型案例。

### 其他 3.12 变化

- **错误消息改进**：拼写错误的模块名会给出建议（`did you mean: 'dataclasses'?`），未闭合括号能指出具体位置；
- **每解释器实例化**（PEP 684 内核侧铺垫）：为 3.12 后续子解释器多核铺路；
- **`itertools.batched`**：把序列切成定长批次（`list(batched("ABCDE", 2))` 得 `[('A','B'),('C','D'),('E',)]`），配合 [itertools](/python/170-IteratorProtocolAndItertools) 使用。

## 3.13（2024）：性能与自由线程实验

### 实验性 JIT 与解释器提速

Faster CPython 项目在 3.13 落地两个层面：解释器层面的优化（大整数运算、推导式内联）与**实验性 copy-and-patch JIT 编译器**（默认关闭）。JIT 的启用方式：

```bash
python -X jit myscript.py        # 命令行开关
PYTHON_JIT=1 python myscript.py  # 环境变量等价
python -c "import sys; print(sys._jit.is_enabled())"   # 检查
```

注意两个版本边界：JIT 仍是实验特性（3.14 亦然），不要在生产依赖它；性能收益随负载类型浮动，评估用 [性能优化](/python/690-PythonPerformance) 的测量流程，别看跑分。

### 自由线程构建（PEP 703 实验）

3.13 提供了「无 GIL 的实验性构建」（free-threaded build）：同一个解释器编号加 `t` 后缀，GIL 可被禁用，多线程真正并行 CPU 密集任务：

```python
# 自由线程下的真正并行（对 CPU 密集任务）
import threading
import time

def cpu_work(n: int) -> int:
    return sum(i * i for i in range(n))

if __name__ == "__main__":
    start = time.perf_counter()
    threads = [threading.Thread(target=cpu_work, args=(5_000_000,)) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print(f"并行耗时: {time.perf_counter() - start:.2f}s")
    # GIL 构建: 约 4 倍串行时间；自由线程构建: 接近 4 核并行
```

这段代码在两种构建上行为**都正确**，差别只在耗时——自由线程改变的是性能模型，不是语义。自由线程的安装命令、与 GIL 构建的共存、线程安全代价见 [pyenv 与 uv](/python/030-PyenvUvManage) 与 [GIL 与自由线程](/python/650-GILAndFreeThreading)，此处只记一句验证命令：

```bash
python -c "import sys; print(sys._is_gil_enabled())"   # 自由线程构建上为 False
```

### 其他 3.13 变化

- **新交互式 REPL（PyREPL）**：多行编辑、语法高亮、历史浏览——日常实验体验大升级；
- **大扫除**：移除一批僵尸标准库模块（`cgi`、`imghdr`、`aifc` 等，PEP 594 死电池清理）——老代码升级 3.13 先跑一遍看 import 报错；
- **实验性 JIT**（见上）与改进的错误消息继续推进。

## 3.14（2025）：自由线程转正与注解惰性化

Python 3.14（2025 年 10 月发布）是近年变化最大的一版，按影响排序。

### PEP 779：自由线程进入「正式支持」阶段

自由线程构建从「实验」转为「正式支持」：PEP 703 的解释器与 C API 适配完成，单线程损耗收敛到约 5-10%，调试语义检查默认启用。**注意两点边界**：它仍与 GIL 构建并存，默认安装依旧是 GIL 构建；「正式支持」意味着承诺稳定与生态适配，不等于「默认开启」。决策仍然看负载——IO 密集用 asyncio，CPU 密集多线程现在多了一个真并行选项（对照见 [GIL 与自由线程](/python/650-GILAndFreeThreading)）。

### PEP 649/749：注解默认延迟求值

3.14 起注解**不再在函数定义时立即求值**，而是像 `__future__` 注解一样惰性化——前向引用不用再加引号，新增 `annotationlib` 模块按需读取：

```python
# Python 3.14：前向引用不再需要引号
class Node:
    def __init__(self, value: int, children: list[Node]):   # 旧版这里要写 "Node"
        self.value = value
        self.children = children

    def append(self, child: Node) -> None:
        self.children.append(child)
```

逐段解释：旧机制里 `list[Node]` 在函数定义行执行，`Node` 还没定义完，只能写字符串 `"Node"` 骗过求值。延迟求值把「名字查找」推迟到真正读取 `__annotations__` 的时刻，自引用类型自然成立。对运行时读注解的库（Pydantic、dataclasses）影响最大——它们通过 `annotationlib` 统一取注解，用户代码通常无感；自己写过「运行时解析注解」的工具要迁移到新接口。

### PEP 750：模板字符串 t-string

`t'...'` 与 f-string 同形，但返回 **Template 对象**而非字符串——静态片段与插值被结构化分开保存，渲染前可以统一处理每个插值：

```python
# Python 3.14
from string.templatelib import Interpolation

user_input = "<script>alert(1)</script>"
template = t"<div>{user_input}</div>"       # Template 对象，不是 str

safe_parts = [
    part.value if not isinstance(part, Interpolation)   # 静态片段原样保留
    else escape_html(str(part.value))                   # 插值统一转义
    for part in template
]
html = "".join(safe_parts)
```

为什么要有这个东西：f-string 的产物是字符串，`f"<div>{user}</div>"` 在拼接那一刻注入风险已经定格，下游无从区分「哪段是骨架哪段是数据」。t-string 保留结构，HTML 转义、SQL 参数化（配合驱动而非拼接）、国际化拼接都多了一个安全抓手。3.14 标准库只有 `string.templatelib` 与 Template 类型本身，转义器等待生态实现（各类模板/数据库库会提供 `render(template)` 风格接口）。

### PEP 734：子解释器进标准库

`concurrent.interpreters` 模块与 `InterpreterPoolExecutor` 让「每个解释器独立 GIL」的多核并行可以直接用 Python 调用——不用自由线程构建也能绕开 GIL 传数据（通过共享队列）：

```python
# Python 3.14
from concurrent import interpreters

interp = interpreters.create()
interp.exec("import math; result = math.factorial(20)")
print(interp.globals["result"])
```

定位：子解释器适合「隔离的多核并行」，进程隔离弱于 [多进程](/python/630-MultiprocessingMultithreading)、并行能力是真核级；与自由线程是互补选项，不是替代。

### 其他 3.14 变化

- **PEP 758**：`except A, B:` 不加括号也能捕获多个异常（与 `except (A, B):` 等价）；
- **PEP 784**：标准库新增 `compression.zstd`（Zstandard 压缩）；
- **PEP 768**：外部调试器接口——调试器可以在运行中的解释器上安全注入断点，配合 [调试篇](/python/695-PythonDebuggingPdb) 的工具生态；
- **REPL 改进**继续；JIT 仍默认关闭。

## 版本选型与迁移清单

| 版本 | 状态（2026） | 升级动机 |
| --- | --- | --- |
| 3.10/3.11 | 维护收尾期 | 已有生态兼容基础 |
| 3.12 | 主力版本 | PEP 695 泛型语法、f-string 解禁 |
| 3.13 | 主力版本 | REPL、错误消息、准备自由线程 |
| 3.14 | 新主力 | 自由线程转正、延迟注解、t-string |

`requires-python` 的写法见 [pyenv 与 uv](/python/030-PyenvUvManage) 的项目管理节；升级检查清单：先在 CI 矩阵加新版本跑全量测试，重点盯 PEP 594 移除模块的 import、注解相关库（Pydantic v2 新版已适配 3.14）与 C 扩展的 ABI 兼容（[C 扩展](/python/700-CExtensionsAndFfi)）。

## 动手实践

练习一（预测题）：不运行代码，判断下面哪个版本会报语法错误，报什么——

```python
def first[T](items: list[T]) -> T:
    return items[0]

print(first([1, 2, 3]))
```

提示：回想 PEP 695 的版本下限，以及「旧版本看到未知语法」的反应是什么。

<details>
<summary>参考实现</summary>

3.11 及以前报 `SyntaxError: invalid syntax`（或 `SyntaxError: expected '('`，指向 `def first[T]` 的方括号）——语法错误在编译期就爆，不是运行期。3.12+ 正常返回 `1`。这也是为什么跨版本库代码里旧写法仍大量存在：语法新特性无法「优雅降级」，库作者必须等最低支持版本到位才能用。
</details>

练习二（修改题）：把下面的旧写法改成 3.12 风格（TypeVar 与 Generic 全部消除），并给 `push` 加一个约束——类型参数只允许 `int` 与 `str`：

```python
from typing import TypeVar, Generic

T = TypeVar("T")

class Box(Generic[T]):
    def __init__(self, item: T) -> None:
        self.item = item

    def get(self) -> T:
        return self.item
```

提示：约束类型参数在方括号里写元组。

<details>
<summary>参考实现</summary>

```python
class Box[T: (int, str)]:
    def __init__(self, item: T) -> None:
        self.item = item

    def get(self) -> T:
        return self.item

print(Box(42).get())       # 42
print(Box("hi").get())     # hi
```

约束写成 `T: (int, str)`，含义与旧的 `TypeVar("T", int, str)` 相同：类型参数取值被限制在列出的类型里。泛型的类型系统语义（型变、约束求解）没有变化——变的只是声明语法，深度讨论见 [类型注解与 mypy](/python/530-TypeAnnotationMypy)。
</details>

练习三（实战题）：写一个 `html_escape_render(template)` 函数：接收 PEP 750 的 Template 对象，返回「插值全部 HTML 转义、静态片段原样」的字符串。用恶意输入 `<script>alert(1)</script>` 自测转义生效。需要 Python 3.14。

提示：遍历 Template 得到静态 str 与 Interpolation 两种对象；转义至少处理 `<`、`>`、`&`（`html.escape` 现成可用）。

<details>
<summary>参考实现</summary>

```python
import html
from string.templatelib import Interpolation

def html_escape_render(template) -> str:
    parts = []
    for part in template:
        if isinstance(part, Interpolation):
            parts.append(html.escape(str(part.value)))
        else:
            parts.append(part)          # 静态片段是 str
    return "".join(parts)

user_input = "<script>alert(1)</script>"
t = t"<div>{user_input}</div>"
print(html_escape_render(t))
# <div>&lt;script&gt;alert(1)&lt;/script&gt;</div>
```

对照 f-string 版 `f"<div>{user_input}</div>"`：产物已经是注入完成的字符串，函数无从下手；t-string 把「骨架与数据」分开，转义器才能只处理数据段。这正是 PEP 750 的设计动机。
</details>

练习四（实战题）：在自由线程构建（3.13t/3.14t）上运行本篇 3.13 节的四线程 `cpu_work` 基准，再在普通 GIL 构建上跑同一脚本，记录两组耗时并计算加速比；若加速比远低于 4，写一句你认为的原因。

提示：`sys._is_gil_enabled()` 确认两种构建各自的状态；想想线程调度、内存分配器与 `sys.monitoring` 开销各自的影响。

<details>
<summary>参考实现</summary>

```bash
# 假设 uv 已装好两种构建（安装命令见 030 篇）
uv run --python 3.14 python bench.py     # GIL 构建
uv run --python 3.14t python bench.py    # 自由线程构建
```

典型结果（8 核机器，仅供参考量级）：

```text
GIL 构建:    3.9s    加速比 ~1.0x（四线程排队）
自由线程构建: 1.2s    加速比 ~3.2x
```

加速比低于 4 的常见原因：线程创建与 join 的固定开销、自由线程构建的每对象锁（biased reference counting）开销、内存带宽瓶颈。这正是「自由线程不是免费并行」的量化感受——收益取决于负载的 CPU 密度与对象共享程度，结论以自己的测量为准（测量方法见 [性能优化](/python/690-PythonPerformance)）。
</details>

练习五（找错题）：下面这段要在 3.12 上跑，有两处问题，先找再修：

```python
def parse(data: "Json") -> str:
    match data:
        case str() as s:
            return s
        case list(items):
            return ",".join(parse(x) for x in items)

type Json = int | float | str | list["Json"] | dict[str, "Json"]
```

<details>
<summary>参考实现</summary>

```python
type Json = int | float | str | list[Json] | dict[str, Json]

def parse(data: Json) -> str:
    match data:
        case str() as s:
            return s
        case list(items):
            return ",".join(parse(x) for x in items)
```

两处问题：`type` 语句定义的别名本身就是惰性的，递归引用**不需要也不应该**加引号，`list["Json"]` 会把别名变成带引号的字符串（类型检查器报「引号里的名字在 type 语句里已可直写」类错误）；函数签名 `data: "Json"` 在 3.12 上可以运行（字符串注解仍被支持），但既然用的是 type 语句别名，直接写 `data: Json` 即可——顺带说明 3.14 的延迟注解让所有前向引用都不再需要引号。
</details>

## 常见坑点速记

- 语法特性没有降级路：库代码用 PEP 695/type 语句前先看 `requires-python` 下限；
- JIT 与自由线程在 3.13/3.14 都不是默认——评估收益前先确认自己跑的构建与开关状态；
- 自由线程「正式支持」不等于「默认开启」，默认安装仍是 GIL 构建；
- 升级 3.13+ 先排查 PEP 594 移除的僵尸模块 import；
- t-string 的产物是 Template 不是 str，直接当字符串用会得到意外行为；
- 3.14 的延迟注解改变了「定义时求值」假设，运行时解析注解的自研工具要迁到 annotationlib。

## 与之前和之后的知识的关系

- 往前：泛型的类型语义见 [类型注解与 mypy](/python/530-TypeAnnotationMypy)；GIL 的并发史与自由线程原理见 [GIL 与自由线程](/python/650-GILAndFreeThreading)；解释器多版本管理与 `t` 构建的安装见 [pyenv 与 uv](/python/030-PyenvUvManage)；
- 往后：性能视角验证新特性收益见 [性能优化](/python/690-PythonPerformance)；debug 接口（PEP 768）的服务对象见 [调试方法学](/python/695-PythonDebuggingPdb)；C 扩展的版本适配见 [Python 与 C 扩展](/python/700-CExtensionsAndFfi)。

## 官方文档

- Python 3.12/3.13/3.14 What's New：https://docs.python.org/zh-cn/3/whatsnew/3.14.html（各版本同目录）
- PEP 695（类型参数）、PEP 701（f-string）、PEP 750（t-string）、PEP 779（自由线程支持阶段）：https://peps.python.org/

## 自我检查

- 能说出 3.12/3.13/3.14 各自最重要的一个特性并写出前后对照代码；
- 能解释 `type` 语句别名与普通赋值别名的差别（惰性、支持递归）；
- 能用 `sys._is_gil_enabled()` 判断当前构建，并说出自由线程改变的只是性能模型不是语义；
- 能解释 t-string 与 f-string 的产物差异，以及为什么「转义要在渲染时做」需要 Template 对象；
- 能列出升级解释器的三步检查（CI 矩阵、PEP 594 import、C 扩展 ABI）。
