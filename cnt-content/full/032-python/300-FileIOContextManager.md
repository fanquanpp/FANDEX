---
order: 300
title: 文件 I/O 与上下文管理器
module: 'python'
category: 后端技术
difficulty: beginner
description: 文件读写的完整主线——open 模式表与 with 自动关闭、读四式与写三式的选择、tell/seek 指针控制、二进制分块复制、编码显式声明与 errors 策略、大文件逐行与分块处理；附文本批处理与日志追加两个实践场景及遮代码自检练习。
author: fanquanpp
updated: '2026-10-11'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 的「文件 I/O」——`open()` 返回的文件对象的读写、模式、指针、编码与二进制处理，以及 `with` 语句对文件生命周期的自动管理。它与「文件系统操作」是两个类别：本篇管**文件内容怎么读怎么写**，路径与目录的组织见 [文件系统操作与 pathlib/shutil](/python/302-FilesystemPathlibShutil)。
- **解决什么问题**：把分析结果落成文件、读取配置与数据、逐行清洗日志——这些是每个脚本与服务的第一手 I/O。新手在这层的典型事故：忘关文件导致句柄泄漏、默认编码在 Windows 上读出乱码、`read()` 把 10 GB 日志整个读进内存、`"w"` 模式一把覆盖了要追加的历史。
- **什么时候用到**：所有需要持久化或读取字节的场景——配置加载、日志写入、批处理、缓存落盘。结构化格式（JSON/CSV/pickle）的读写见 [序列化](/python/310-SerializationJsonAndPickle)；`with` 背后的上下文管理器协议见 [上下文管理器](/python/520-ContextManager)；目录与路径见 [文件系统操作](/python/302-FilesystemPathlibShutil)。

## 打开与关闭：模式表是第一张地图

### open() 的参数与模式表

```python
f = open("data.txt", mode="r", encoding="utf-8")   # 完整签名见官方文档，常用四个参数
```

常用参数：`file`（路径，字符串或 Path 对象皆可）、`mode`（模式）、`encoding`（文本模式的编码，**必须显式给**）、`errors`（解码失败策略：`strict` 抛错 / `replace` 换问号 / `ignore` 丢弃）。模式是本节的地形图：

| 模式 | 含义 | 文件不存在 | 文件已存在 | 指针位置 |
| --- | --- | --- | --- | --- |
| `r` | 只读（默认） | 报 FileNotFoundError | 从头读 | 开头 |
| `w` | 只写 | 新建 | **清空** | 开头 |
| `a` | 追加 | 新建 | 保留原文 | 末尾 |
| `x` | 独占创建 | 新建 | 报 FileExistsError | 开头 |
| `r+` | 读写 | 报错 | 保留原文 | 开头 |
| `b` 后缀 | 二进制（`rb`/`wb`...） | 同上 | 同上 | 同上 |

逐行讲风险最高的两个：`"w"` 一打开就**清空**已有内容——「先 open 再决定写什么」的顺序就足以销毁数据；日志、增量记录一律用 `"a"`。`"x"` 是并发安全创建：多个进程同时抢建同一个文件时只有一个成功，其余拿 `FileExistsError`（[归档与压缩](/python/305-FileArchiveCompression) 的防并发打包正是用它）。`+` 系模式（`r+`）读写共用一个指针，读完后指针在末尾，直接 `write` 是**追加**而不是覆盖开头——想覆盖要用 `seek(0)`。

### close 与 with：为什么永远用 with

```python
# 反例：手动 close，异常路径必然泄漏
f = open("data.txt", "r", encoding="utf-8")
content = f.read()
f.close()                       # read() 抛异常时这行永远执行不到

# 正解：with 语句，正常与异常路径都保证关闭
with open("data.txt", "r", encoding="utf-8") as f:
    content = f.read()
# 离开 with 块（含抛异常）文件已关闭
```

逐段解释：文件句柄是操作系统配额内的有限资源，泄漏积累到上限后进程所有 I/O 报 `OSError: [Errno 24] Too many open files`。`with` 的保证来自上下文管理器协议：进入时调 `__enter__`、**无论**块内是否抛异常退出时都调 `__exit__`，文件对象的 `__exit__` 里执行关闭——机制的完整展开见 [上下文管理器](/python/520-ContextManager)。一个文件要同时读写时用逗号并列：`with open(src) as fin, open(dst, "w") as fout:`，两份资源都会被管理。换 `try/finally` 手写关闭的写法：语义等价但四行换一行且容易漏 finally，评审时直接要求改 with。

## 读四式与写三式

### 读取：按数据规模选方法

```python
with open("data.txt", "r", encoding="utf-8") as f:
    # 式一：read() 整读——小文件（配置、模板）专用
    whole = f.read()

    # 式二：read(n) 定量读——配合循环做分块，大文件二进制的读法
    first_100 = f.read(100)

    # 式三：readline() 单行——与 while 搭配（需要手动判断空串结束）
    line = f.readline()
    while line:
        print(line.strip())
        line = f.readline()

    # 式四：直接迭代文件对象——逐行读的事实标准
    for line in f:
        print(line.strip())
```

逐式讲清边界：`read()` 无参会把**整个文件**读进内存，10 GB 日志直接 OOM——它只属于「确定很小」的文件；带参数的 `read(100)` 读的是 100 个**字符**（文本模式，受编码影响）或 100 个**字节**（二进制模式）。`readlines()` 把所有行存成列表，内存特征与 `read()` 相同（整文件 + 列表开销），只该用于「确实需要行列表」的场合。式四（`for line in f`）是默认选型：文件对象是迭代器，逐行产出、内存 O(1)。易错点：迭代产出的行**自带结尾换行符**，`print` 之前习惯性 `.strip()` 或 `rstrip("\n")`，否则输出隔行空一行。

### 写入：write、writelines 与追加

```python
with open("output.txt", "w", encoding="utf-8") as f:
    f.write("Hello, world!\n")          # write 不自动加换行，自己带 \n
    f.writelines(["Line 1\n", "Line 2\n", "Line 3\n"])   # 逐个写，同样不自动加换行

with open("app.log", "a", encoding="utf-8") as log:      # 追加模式：多次运行累积
    log.write(f"[{__import__('datetime').datetime.now():%Y-%m-%d %H:%M:%S}] 启动\n")
```

逐段解释：`write` 的返回值是**写入的字符数**不是文件对象，链式 `f.write(a).write(b)` 直接 AttributeError——老教程里偶见的错误写法。`writelines` 名字有误导：它接受任何可迭代字符串、**不加分隔符**，想逐行必须自己带 `\n`；绝大多数场景不如一个生成器加循环 `write` 直白。写缓冲：`write` 先进内存缓冲，攒够（默认约 8 KB）或关闭时才真正落盘——这就是为什么崩溃时可能丢最后几行、以及为什么**必须 with 关闭**（close 触发最终 flush）。要即时可见（如被别的进程 tail）用 `f.flush()`。

## 文件指针：tell 与 seek

```python
with open("data.txt", "rb") as f:        # 指针实验用二进制模式，语义纯粹（无编码位移）
    print(f.tell())                      # 0 —— 指针是「下一个读写字节」的位置
    f.read(10)
    print(f.tell())                      # 10

    f.seek(0)                            # 回到开头：重读的标准动作
    head = f.read(5)

    f.seek(-5, 2)                        # whence=2 相对末尾回退 5 字节（只能二进制模式）
    tail = f.read()
print(head, tail)
```

逐段解释：`tell()` 报告指针当前位置，`seek(offset, whence)` 移动它——`whence=0`（默认）相对文件头、`1` 相对当前位置、`2` 相对末尾。两个易错点：其一，**文本模式下只允许 `seek(0)` 与 tell 返回的不透明值**——`seek(10)` 这类裸偏移在 UTF-8 文本上可能落在多字节字符中间直接抛错，做字节级跳转请用 `"rb"`；其二，`whence=1/2` 在文本模式被禁止（`io.UnsupportedOperation: can't do nonzero cur-relative seeks`），二进制畅通。典型用途：`seek(-2, 2)` 读日志最后一行、`seek(0)` 让 `r+` 文件重写头部。

## 二进制文件：分块复制的模板

```python
def copy_file(src: str, dst: str, chunk_size: int = 1 << 20) -> int:
    """分块复制任意大文件，返回复制的字节数。"""
    total = 0
    with open(src, "rb") as fin, open(dst, "wb") as fout:
        while chunk := fin.read(chunk_size):     # 海象运算符：读到 b'' 即假，循环止
            fout.write(chunk)
            total += len(chunk)
    return total

# n = copy_file("image.jpg", "copy.jpg")
```

逐段解释：二进制模式 `rb/wb` 的读写单位是 `bytes`（`b"\x00\x01"`），**没有 encoding 参数**——给 `open(..., "rb")` 传 `encoding` 是 TypeError，模式与参数的绑定关系要记牢。`while chunk := fin.read(...)` 是分块读的惯用法：`read(n)` 在文件尾返回 `b""`（假值），海象运算符（3.8+）把「读」与「判空」合成一行；换 `while True: chunk = ...; if not chunk: break` 的老写法功能相同但多两行。`chunk_size=1 MB` 是通用起点：太小系统调用开销大，太大内存占用高。同一模板换个中间步骤就是校验和计算、加密流处理（见 [Python 与密码学](/python/370-PythonAndCryptography)）。日常直接复制文件不必手写——`shutil.copy2` 一行（见 [文件系统操作](/python/302-FilesystemPathlibShutil)），手写模板的价值在「复制过程中要加工」的场景。

## 编码：显式声明与 errors 策略

```python
# 显式 UTF-8 是跨平台的第一纪律（Windows 默认 gbk/cp936）
with open("data.txt", "r", encoding="utf-8") as f:
    text = f.read()

# 遇到来源不明的脏数据：replace 保流程不断
with open("mixed.txt", "r", encoding="utf-8", errors="replace") as f:
    safe = f.read()

# 编码转换 = 以 A 编码读、以 B 编码写
with open("legacy_gbk.txt", "r", encoding="gbk") as fin, \
     open("modern_utf8.txt", "w", encoding="utf-8") as fout:
    fout.write(fin.read())
```

逐段解释：`encoding` 省略时用 `locale.getpreferredencoding()`——Linux 上通常是 UTF-8，Windows 中文环境是 gbk，**同一份代码两边结果不同**，这就是 PEP 686 在未来版本把默认值改为 UTF-8 的动机（3.15 计划）。纪律：生产代码里 `open` 的文本模式**永远写 encoding**。`errors` 三档的取舍：`strict`（默认）让坏字节立刻炸出来——数据校验场景要的就是这声爆炸；`replace` 把坏字节换成 `\ufffd`——日志清洗这类「宁缺毋断」的批处理选它；`ignore` 静默丢弃——几乎不该用（丢了什么无从审计）。常见编码对照：`utf-8`（通用首选）、`gbk`（Windows 中文历史遗留）、`ascii`（ASCII 子集）、`latin-1`（字节到码点一一映射，处理来路不明的字节流的万能钥匙）。编码转换的本质：「字节流 + 编码解释 = 文本」，换个解释重新编码即转码——字符串与编码的完整心智模型见 [字符串格式化](/python/120-StringFormattingMethods)。

## 大文件处理：迭代与分块

文本大文件用行迭代（内存 O(1)）：

```python
def count_words(path: str) -> int:
    """逐行统计单词数：内存恒定，文件多大都不怕。"""
    total = 0
    with open(path, "r", encoding="utf-8") as f:
        for line in f:                 # 迭代器逐行产出，不会整载
            total += len(line.split())
    return total

# print(count_words("huge.log"))
```

二进制大文件用块循环（上一节模板），文本要**跨行的结构**（JSON 数组、CSV）才需要真正的流式解析器（`json` 逐对象流、`csv.reader` 本身就是行迭代器——见 [序列化](/python/310-SerializationJsonAndPickle)）。判断口诀：**处理单元能按行切就行迭代，切不动就块循环 + 自己找边界**。

## 实践场景一：文本批处理

```python
import os

def normalize_text(path: str) -> str:
    """去空行、统一大写，输出到 processed_ 前缀文件。"""
    base = os.path.basename(path)
    out_path = "processed_" + base
    with open(path, "r", encoding="utf-8") as fin:
        cleaned = [line.strip().upper() for line in fin if line.strip()]
    with open(out_path, "w", encoding="utf-8") as fout:
        fout.write("\n".join(cleaned) + "\n")
    return out_path

# print(normalize_text("input.txt"))
```

逐段解释：`if line.strip()` 一行同时完成「跳过纯空白行」与「取行」两个过滤——列表推导式里条件在后（见 [列表推导式](/python/160-ListComprehensionAdvanced)）。读写分两个 with 块是刻意的：**先读完再写**避免「同文件边读边写」的指针混乱；若目标就是原文件（就地改写），需要先读全量或借助临时文件 + 替换（原子写入的完整方案见 [上下文管理器](/python/520-ContextManager) 的 4.7 节）。`os.path.basename` 取文件名拼输出名——路径拼接的规范写法（`Path` 对象）见 [文件系统操作](/python/302-FilesystemPathlibShutil)。

## 实践场景二：追加式日志

```python
from datetime import datetime

def log_message(message: str, log_file: str = "app.log") -> None:
    with open(log_file, "a", encoding="utf-8") as f:     # a 模式：多次运行累积
        f.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}\n")

log_message("应用启动")
log_message("用户登录: Alice")
```

逐段解释：`"a"` 模式保证写入总在文件末尾、不碰已有内容——进程重启后日志连续；换 `"w"` 则每次运行清空重来，日志只剩最后一次。日期用 f-string 的格式化规格 `%Y-%m-%d %H:%M:%S` 一行完成（f-string 时间格式化见 [字符串格式化](/python/120-StringFormattingMethods)）。生产服务的日志别手写这个函数——`logging` 模块提供级别、轮转、格式模板（见 [Python 日志](/python/430-PythonLog)）；本例的价值是理解「追加模式 + 时间戳」这个日志文件的最小模型。

## 最佳实践清单

- **永远 with**：自动关闭覆盖异常路径；try/finally 是它的展开形式；
- **文本模式永远显式 encoding**：默认编码随平台漂移（Windows gbk / Linux utf-8）；
- **`"w"` 是破坏性模式**：追加用 `"a"`，独占创建用 `"x"`；
- **迭代文件对象读大文本，read(n) 循环读大二进制**：`read()`/`readlines()` 只属于确定很小的文件；
- **write 不加换行**：`\n` 自己带；writelines 不加分隔符；
- **字节级 seek 用二进制模式**：文本模式只认 seek(0)；
- **errors 策略按场景选**：校验场景 strict 炸出来，清洗场景 replace 保流程，别用 ignore；
- **路径操作交给 pathlib**：本篇只管读写，拼接、遍历、整理见 [文件系统操作](/python/302-FilesystemPathlibShutil)。

## 动手实践

练习一（预测题）：文件 `nums.txt` 内容为 `12345`（5 个字符，无换行），下面代码输出什么？

```python
with open("nums.txt", "r") as f:
    print(f.read(2))
    print(f.tell())
    f.seek(1)
    print(f.read(3))
```

提示：文件对象是有状态的——read 推进指针，seek 重置指针。

<details>
<summary>参考实现</summary>

输出依次为：`12`（读前两个字符）、`2`（指针停在字符 2 之后）、`234`（seek(1) 回到位置 1，读三个字符 2、3、4）。核心：`read(n)` 之后指针停在**已读内容之后**，连续 read 是接力不是重叠；`seek(k)` 把指针拨到第 k 个字节，下一次 read 从这里开始。把题目变体一下：若文件是二进制模式且内容含中文（UTF-8 每字三字节），`read(2)` 可能劈开一个多字节字符——文本模式 read(n) 按字符计数不受影响，这正是文本/二进制 read 单位差异的体现。
</details>

练习二（实战题）：写 `tail(path, n=10)`：返回文件最后 n 行（列表，含顺序）。小文件允许 `readlines()`；再写一个大文件友好版：先 `seek` 到末尾附近分块向前找换行，凑够 n 行即停。

提示：`seek(0, 2)` 到末尾、`tell()` 得文件大小；向前分块用 `seek(max(0, pos - chunk))`；行数够后从断点读到末尾。

<details>
<summary>参考实现</summary>

```python
def tail(path: str, n: int = 10, chunk: int = 4096) -> list[str]:
    with open(path, "rb") as f:                     # 字节级 seek，必须二进制
        f.seek(0, 2)                                # whence=2：相对末尾
        size = f.tell()
        if size == 0:
            return []
        pos = size
        breaks = []                                 # 换行符位置（从后往前）
        while pos > 0 and len(breaks) <= n:
            read_from = max(0, pos - chunk)
            f.seek(read_from)
            block = f.read(pos - read_from)
            breaks = [read_from + i for i, b in enumerate(block) if b == 0x0A] + breaks
            pos = read_from
        start = breaks[-n - 1] + 1 if len(breaks) > n else 0
        f.seek(start)
        return f.read().decode("utf-8").rstrip("\n").split("\n")[-n:]

# lines = tail("app.log", 3)
# print("\n".join(lines))
```

要点回顾：`seek(0, 2)` 只在二进制模式合法（文本模式禁止非零 whence）；块内扫描换行字节 `0x0A` 而不是按字符——UTF-8 的续字节不会是 0x0A，字节级找换行是安全的；`breaks` 列表保持从前往后有序，`[-n-1]` 定位第 n+1 个换行即最后一行的起点。日志尾部查看（`tail -f` 的离线版）是这套指针操作的典型工程用途。
</details>

练习三（实战题）：实现 `atomic_append_json(path, record)`：把一条记录追加到 JSON Lines 文件（每行一个 JSON 对象）。要求：文件不存在时创建并带 `\n` 结尾的合法行；读回时能逐行 `json.loads`。

提示：追加模式 `"a"` + 手动 `\n`；JSON Lines 与单个大 JSON 数组的取舍：前者可追加可流式读，后者必须整读整写。

<details>
<summary>参考实现</summary>

```python
import json

def append_record(path: str, record: dict) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

def iter_records(path: str):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)

append_record("events.jsonl", {"event": "login", "user": "ada"})
append_record("events.jsonl", {"event": "purchase", "user": "bob"})
for rec in iter_records("events.jsonl"):
    print(rec["event"])
```

为什么用 JSON Lines 而不是 JSON 数组：追加场景下数组要求「读出整个数组、加元素、重写全文件」，O(n) 每次追加；JSON Lines 天然增量——`"a"` 模式一行一个对象，读侧也用行迭代流式解析，事件日志、爬虫落盘的标准形态。`ensure_ascii=False` 让中文可读（见 [序列化](/python/310-SerializationJsonAndPickle) 的坑点四）。损坏行（写一半崩溃）的容错可以在 iter_records 里 try/except 跳过并告警——日志类数据的健壮性惯例。
</details>

练习四（找错题）：这段「统计错误行数」的代码有一处资源问题与一处逻辑问题，先找再修：

```python
f = open("app.log", encoding="utf-8")
count = 0
for line in f.readlines():
    if "ERROR" in line:
        count += 1
f.close()
print(count)
```

提示：异常路径下 close 会怎样？这个文件可能有 10 GB。

<details>
<summary>参考实现</summary>

```python
count = 0
with open("app.log", encoding="utf-8") as f:
    for line in f:                       # 行迭代代替 readlines
        if "ERROR" in line:
            count += 1
print(count)
```

两处问题：其一，手动 `close` 没有 with 的异常保护——循环内任何异常（编码错误是最常见的一个）都跳过 close，句柄泄漏；其二，`readlines()` 把整个文件读进内存列表，10 GB 日志直接内存爆炸，应改为文件对象本身的行迭代（内存 O(1)）。修后版本两个问题一起解决；顺带，生产日志统计建议交给 `grep -c` 或日志系统，Python 版的价值在需要逐行**加工**的场合。
</details>

练习五（实战题）：写 `find_lines(path, keyword)` 生成器：惰性逐行产出包含关键词的行号（从 1 起）与该行内容，供上层边读边处理。用一个 3 行的小文件自测。

提示：用 `enumerate(f, start=1)` 同时拿行号与行；生成器协议见 [生成器与协程](/python/180-GeneratorCoroutine)。

<details>
<summary>参考实现</summary>

```python
def find_lines(path: str, keyword: str):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for lineno, line in enumerate(f, start=1):
            if keyword in line:
                yield lineno, line.rstrip("\n")

# 建测试文件
with open("sample.txt", "w", encoding="utf-8") as f:
    f.write("INFO 启动完成\nERROR 数据库连接失败\nINFO 重试成功\nERROR 再次失败\n")

for no, text in find_lines("sample.txt", "ERROR"):
    print(f"{no}: {text}")
# 2: ERROR 数据库连接失败
# 4: ERROR 再次失败
```

设计要点：生成器让「找行」与「用行」解耦——调用方可以只取前三个匹配就停止（生成器随即被 GC、文件随 with 关闭），不必扫完全文件；`errors="replace"` 让脏日志不中断扫描；`enumerate(f, 1)` 是行号计数的标准写法（自己维护计数器多两行还容易错）。这是「迭代文件对象」读法与生成器的组合，大日志检索脚本的地基。
</details>

## 与之前和之后的知识的关系

- 往前：`with` 的完整协议（`__enter__`/`__exit__`、异常抑制、contextlib 工具）见 [上下文管理器](/python/520-ContextManager)；字符串与编码的转换规则见 [字符串格式化](/python/120-StringFormattingMethods)；异常体系（FileNotFoundError 等的捕获层次）见 [异常处理](/python/130-ExceptionHandling)。
- 往后：路径与目录操作见 [文件系统操作与 pathlib/shutil](/python/302-FilesystemPathlibShutil)；JSON/CSV/pickle 结构化读写见 [序列化](/python/310-SerializationJsonAndPickle)；zip/tar 归档打包见 [归档与压缩](/python/305-FileArchiveCompression)；生产日志方案见 [Python 日志](/python/430-PythonLog)；大文件管道化的生成器技巧见 [生成器与协程](/python/180-GeneratorCoroutine)。

## 官方文档

- open() 内置函数与 io 模块（模式、编码、缓冲）：https://docs.python.org/3/library/io.html（PSF License）
- pathlib / shutil（本篇互链的路径与目录侧）：https://docs.python.org/3/library/pathlib.html（PSF License）
- PEP 686（UTF-8 mode 默认化的版本计划）：https://peps.python.org/pep-0686/

## 自我检查

- 能默写 r/w/a/x/r+ 五种模式对「不存在/已存在」的行为差异，并说出 `"w"` 与 `"a"` 的选型纪律；
- 能解释 with 保证关闭的机制（`__exit__` 在异常路径也执行）并写出双文件并列的 with；
- 能按数据规模在 read/readline/readlines/行迭代之间选型，并说出各自的内存特征；
- 能写出二进制分块复制模板（海象运算符版）并解释 read(n) 的返回值语义；
- 能说出文本模式 seek 的限制与二进制模式的自由度；
- 能解释 encoding 默认值的平台差异与 errors 三档的适用场景。
