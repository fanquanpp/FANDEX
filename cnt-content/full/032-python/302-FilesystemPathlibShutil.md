---
order: 310
title: 文件系统操作与 pathlib/shutil
module: 'python'
category: 后端技术
difficulty: beginner
description: 路径与目录的工程化操作——Path 与 os.path 的对照迁移、glob/rglob 通配遍历、shutil 复制与清理家族、tempfile 临时目录、os.walk 递归遍历及其 pathlib 迁移写法；批量整理爬取图片、清理构建缓存、自动化手册整理脚本三个工程场景逐行拆解。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 的「文件系统操作」——`pathlib`（面向对象的路径抽象）、`os.path`（字符串式路径函数）、`shutil`（复制/移动/删除目录树的高级操作）、`tempfile`（临时文件与目录）、`glob`/`os.walk`（目录遍历）。它们与「文件读写」是两个类别：读写关心**文件内容**，本篇关心**文件的位置、名字、组织与生命周期**。
- **解决什么问题**：爬虫抓回的十万张图片要按日期分目录归档；构建产物 `dist/`、`node_modules/`、`__pycache__/` 要周期性清理；自动化脚本要在 Windows 与 Linux 上都跑——字符串拼接路径（`"data/" + name + ".json"`）在 Windows 上生成 `data\name.json` 与 `data/name.json` 的混血，分隔符、盘符、大小写全是坑。`pathlib` 用一个 `Path` 对象把分隔符、平台差异、常用判断全部收进去，是当代 Python 的标准做法。
- **什么时候用到**：任何「按路径找文件、按规则整理文件、跨目录批量操作」的场景。文件内容的读写与编码见 [文件 IO 与上下文管理器](/python/300-FileIOContextManager)；归档打包（把目录收进压缩包）见 [归档与压缩](/python/305-FileArchiveCompression)；本篇的整理脚本在自动化手册里的完整编排见 [Python 自动化手册](/python/980-PythonAutomationCookbook)。

## 心智模型：路径是对象，不是字符串

`os.path` 时代，路径就是字符串，每个操作是一个函数；`pathlib` 把路径变成**对象**，操作变成方法与运算符。先看同一件事的两种写法：

```python
import os
from pathlib import Path

# os.path：字符串进、字符串出
config_path = os.path.join(os.getcwd(), "config", "app.ini")
if os.path.exists(config_path):
    size = os.path.getsize(config_path)
    print(os.path.basename(config_path), size)

# pathlib：Path 进、Path 出，操作即属性
config = Path.cwd() / "config" / "app.ini"     # / 运算符拼路径
if config.exists():
    print(config.name, config.stat().st_size)
```

逐行对照：`Path.cwd() / "config" / "app.ini"` 的 `/` 是重载的拼接运算符，自动处理分隔符（Windows 上产出 `\`）——这是 pathlib 最日常的胜利；`config.name` 是属性不是调用（对应 `os.path.basename`），同类属性还有 `config.stem`（不带扩展名的名字）、`config.suffix`（`.ini`）、`config.parent`（父目录 Path）、`config.parts`（按段拆分的元组）。`config.stat().st_size` 对应 `os.path.getsize`——`stat()` 一次拿全部元数据（大小、mtime、权限），比连续调多个 `os.path` 函数更省系统调用。换成字符串拼接写法会发生什么：`"config" + "/" + "app.ini"` 在 Windows 上虽然多数 API 容忍混用分隔符，但 `os.path.join("data", "/abs.txt")` 会**静默丢弃**前面的部分（绝对路径参数重置拼接），`Path` 的 `/` 对绝对路径片段也有同样语义（`Path("a") / "/b"` 得 `/b`）——这是两个体系共同的坑，显式判断比隐式容忍好。

为什么 pathlib 成了标准：其一，路径判断（`exists`/`is_file`/`is_dir`/`is_absolute`）是属性式方法，链起来读起来是句子；其二，遍历（`iterdir`/`glob`/`rglob`）直接产出 Path 迭代器，不再需要 `os.path.join(root, file)` 的手工重组；其三，`read_text`/`write_text`/`mkdir` 让「一步小操作」不再需要 with-open 的仪式。`os.path` 没有被废弃——纯字符串场景（配置文件里存的路径、URL 转换）与极老代码库仍在用它，读懂即可，新代码选 pathlib。

### os.path 与 pathlib 速查对照表

| 任务 | os.path 写法 | pathlib 写法 |
| --- | --- | --- |
| 当前目录 | `os.getcwd()` | `Path.cwd()` |
| 拼接 | `os.path.join(a, b)` | `Path(a) / b` |
| 是否存在 | `os.path.exists(p)` | `Path(p).exists()` |
| 是文件/目录 | `os.path.isfile(p)` / `isdir` | `Path(p).is_file()` / `.is_dir()` |
| 文件名/目录名 | `os.path.basename(p)` / `dirname` | `Path(p).name` / `.parent` |
| 扩展名 | `os.path.splitext(p)[1]` | `Path(p).suffix` |
| 绝对路径 | `os.path.abspath(p)` | `Path(p).resolve()` |
| 列目录 | `os.listdir(d)` | `Path(d).iterdir()` |
| 大小 | `os.path.getsize(p)` | `Path(p).stat().st_size` |
| 家目录 | `os.path.expanduser("~")` | `Path.home()` |

`resolve()` 与 `abspath` 的差异值得单独记：`resolve()` 额外解析符号链接并把 `..` 规范化（[归档与压缩](/python/305-FileArchiveCompression) 的 zip slip 防御正是靠它），`abspath` 只拼绝对前缀。安全校验场景一律 `resolve()`。

## 目录遍历：glob、rglob 与 os.walk

### 三种遍历的选择

```python
from pathlib import Path

# 浅层列出：只看直接子项
for entry in Path("logs").iterdir():
    print(entry.name, "目录" if entry.is_dir() else "文件")

# 通配一层：glob 不递归
for log in Path("logs").glob("*.log"):
    print(log)

# 递归通配：rglob = recursive glob，** 表示任意深度
for py in Path("src").rglob("*.py"):
    print(py)

# glob 模块：字符串风格的同一能力（pathlib 之前的老接口）
import glob
files = glob.glob("src/**/*.py", recursive=True)
```

逐段解释：`glob("*.log")` 的模式语法与 shell 相同（`*` 任意名字、`?` 单字符、`[0-9]` 字符集）；`rglob("*.py")` 等价于 `glob("**/*.py")`——`**` 跨任意层级目录。三者怎么选：`iterdir` 用于「我要自己按 is_dir 分类」的场合；`glob`/`rglob` 用于「按模式找」；`os.walk` 用于「要目录级的控制（跳过子树、修改遍历顺序）」。注意 `rglob` 在巨大目录树（如整个用户主目录）上会**预先构建完整列表**吗？不会——它是生成器、惰性产出，但**没有排序保证**，结果顺序随文件系统而定，要确定性顺序自己 `sorted()`。

### os.walk：目录级控制的老将

`os.walk` 至今是不可替代的场景：需要**在遍历中途决定剪掉哪些子树**（跳过 `node_modules`）：

```python
import os

def find_source_files(root: str, skip: set[str] = frozenset({"node_modules", ".git", "__pycache__"})):
    matches = []
    for dirpath, dirnames, filenames in os.walk(root):
        # 关键：原地修改 dirnames 剪枝——walk 会尊重这个修改，不再深入
        dirnames[:] = [d for d in dirnames if d not in skip]
        for name in filenames:
            if name.endswith((".py", ".ts")):
                matches.append(os.path.join(dirpath, name))
    return matches

# print(len(find_source_files(".")))
```

逐行解释：`os.walk` 产出三元组 `(当前目录路径, 子目录名列表, 文件名列表)`；`dirnames[:] = [...]` 的**切片赋值**是官方约定的剪枝手法——修改的是列表本身（walk 下一步会读它），写成 `dirnames = [...]` 只是让局部变量指向新列表，剪枝无效，这是 os.walk 的头号易错点。pathlib 没有内建剪枝（`rglob` 一路走到底），「大目录树 + 排除规则」仍是 `os.walk` 的主场。迁移写法：不需要剪枝时，`rglob` 加一层过滤即可替代绝大多数 walk 用途：

```python
SKIP = {"node_modules", ".git", "__pycache__"}

def find_source_files_pathlib(root: Path) -> list[Path]:
    return [
        p for p in root.rglob("*")
        if p.is_file()
        and p.suffix in {".py", ".ts"}
        and not (set(p.parts) & SKIP)          # parts 拆段比对，等效剪枝（但已走完该子树）
    ]
```

两版的功能差异：pathlib 版无法**避免进入**被跳过的目录（只过滤结果），巨树上有真实性能差；os.walk 版真的不进去。选型：树小、规则简单用 pathlib 版（可读性赢）；树大或规则复杂用 walk 版（性能与控制力赢）。

### 例子一（真实工程）：批量整理爬取图片

爬虫按任务落了满盘散图，要按「抓取日期 + 站点」两级目录归档，文件名规范化为日期序号。这是 980 手册整理场景的路径细节展开：

```python
from datetime import datetime
from pathlib import Path
import shutil

def organize_images(inbox: Path, archive: Path) -> list[Path]:
    moved = []
    for img in sorted(inbox.glob("*.jpg")):
        mtime = datetime.fromtimestamp(img.stat().st_mtime)
        site = img.stem.split("_", 1)[0] or "unknown"       # 约定：站点_序号.jpg
        target_dir = archive / mtime.strftime("%Y-%m") / site
        target_dir.mkdir(parents=True, exist_ok=True)       # 二级目录一步建全

        target = target_dir / img.name
        if target.exists():                                  # 幂等：已归档跳过
            continue
        shutil.move(str(img), str(target))
        moved.append(target)
    return moved

# moved = organize_images(Path("spider_inbox"), Path("archive"))
# print(f"归档 {len(moved)} 张")
```

逐段解释：`img.stem.split("_", 1)[0] or "unknown"` 用 `or` 兜空串——`"".split("_", 1)[0]` 是 `""`（假值），命名不合规的文件落进 `unknown/` 而不是抛错，批处理脚本的健壮性来自这种兜底。`mkdir(parents=True, exist_ok=True)` 两个参数都是幂等关键：`parents=True` 免去逐级判断，`exist_ok=True` 让重复运行不抛 `FileExistsError`（390 篇之外的定时脚本第一原则，980 篇有完整论述）。`shutil.move` 能跨文件系统移动（copy + delete 的回退），`Path.rename` 同盘改名更快但跨盘抛 `OSError`——批量搬文件用 move，同盘重排用 rename。为什么先 `sorted`：归档顺序确定，中断后重跑的补录顺序可预期。

## shutil：复制、清理与目录树操作

### 复制家族的四个成员

```python
import shutil
from pathlib import Path

# 四个复制的语义差异
shutil.copy("src.txt", "dst.txt")              # 复制内容与权限位，不带元数据
shutil.copy2("src.txt", "dst.txt")             # 复制内容 + 全部元数据（mtime 等）——备份场景选它
shutil.copyfile("src.txt", "dst.txt")          # 只复制内容，权限位用目标默认
shutil.copytree("src_dir", "dst_dir",          # 整棵目录树
                dirs_exist_ok=True,            # 3.8+ 允许目标已存在（增量合并）
                ignore=shutil.ignore_patterns("*.pyc", "__pycache__"))
```

逐个说清差异：`copy` 与 `copy2` 的区别只在**元数据**——备份、同步类场景用 `copy2`（保持修改时间，增量同步才能判断「哪个新」）；临时中转用 `copy`（少一次元数据设置的系统调用）。`copytree` 的 `dirs_exist_ok=True` 是 3.8+ 的关键开关：没有它，目标目录存在就抛 `FileExistsError`，「往已有备份里增量补文件」这个高频需求在 3.7 及以前要自己写递归。`ignore_patterns` 支持通配——同步源码目录时排除缓存与编译产物是标准动作。

### 例子二（真实工程）：清理构建缓存

CI 与本机开发都需要「把构建垃圾一次扫净」：`__pycache__`、`node_modules`、`dist`、`.pytest_cache`。删除是危险操作，脚本要带防护：

```python
import shutil
from pathlib import Path

CACHE_DIRS = {"__pycache__", ".pytest_cache", ".mypy_cache", "node_modules", "dist"}

def clean_build_cache(root: Path, dry_run: bool = True) -> list[str]:
    """清理构建缓存。默认 dry_run 只报告不删除，确认后再真跑。"""
    freed_hint = []
    for cache_dir in sorted(root.rglob("*")):
        if cache_dir.is_dir() and cache_dir.name in CACHE_DIRS:
            # 防护一：绝不碰项目根自身的 dist（那是发布产物），只清 __pycache__ 级缓存
            if cache_dir.name == "dist" and cache_dir.parent == root:
                continue
            size = sum(f.stat().st_size for f in cache_dir.rglob("*") if f.is_file())
            freed_hint.append(f"{cache_dir}  ({size / 1e6:.1f} MB)")
            if not dry_run:
                shutil.rmtree(cache_dir)
    return freed_hint

# report = clean_build_cache(Path("."), dry_run=True)     # 先看清单
# print("\n".join(report))
# clean_build_cache(Path("."), dry_run=False)             # 确认后再执行
```

逐段解释防护设计：`dry_run=True` 默认只读——任何 rmtree 脚本的第一版都必须先以「只报告」形态跑过一遍再开真删，这是不可逆操作的标准流程。`cache_dir.parent == root` 的特判表达业务规则「根目录的 dist 是发布产物要保留」——业务豁免要写显式条件，不要靠 `ignore` 参数的通配暗操作。`rglob("*")` 全树扫一遍才能找到嵌套的 `__pycache__`（它们散落在每个包目录里）。为什么用 `shutil.rmtree` 而不是 `Path.rmdir`：`rmdir` 只删**空**目录，`rmtree` 递归强删整棵树——能力越强越要前面那些防护。换成交互式确认（`input`）的写法：脚本无法进 CI 定时任务，`dry_run` 两段式更适合无人值守。

### 例子三（真实工程）：给 980 自动化手册的整理脚本补路径细节

980 手册的 `organize()` 按日期归档安装包，这里补上它依赖的三个路径细节：相对路径基准、路径安全的文件名清洗、跨平台输出：

```python
from datetime import datetime
from pathlib import Path
import re
import shutil

BASE_DIR = Path(__file__).resolve().parent      # 锚定脚本自身位置，不随 cwd 漂移
UNSAFE = re.compile(r'[\\/:*?"<>|]')            # Windows 非法字符集

def sanitize(name: str) -> str:
    """清洗文件名：替换 Windows 非法字符，限制长度。"""
    cleaned = UNSAFE.sub("_", name).strip(". ")   # 末尾的点与空格在 Windows 上也非法
    return cleaned[:80] or "unnamed"

def organize(downloads: Path) -> None:
    archive = BASE_DIR / "archive" / datetime.now().strftime("%Y")
    for pkg in sorted(downloads.glob("*.zip")):
        target = archive / sanitize(pkg.stem) / pkg.name
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            shutil.move(str(pkg), str(target))

# organize(Path.home() / "Downloads")
```

逐段解释：`Path(__file__).resolve().parent` 是「相对路径基准」的正确写法——`Path.cwd()` 取决于**从哪里启动脚本**（双击、IDE、定时任务的 cwd 各不相同），`__file__` 锚定脚本文件自身，定时任务里才不会把文件散落到执行器的 cwd。`UNSAFE` 正则把 Windows 文件名禁用的九个字符（`\ / : * ? " < > |`）替换成下划线——爬来的标题直接做文件名是经典翻车点，Linux 上开发没事、部署到 Windows 全线报错。`strip(". ")` 处理另一条 Windows 规则：文件名不能以点或空格结尾。`[:80] or "unnamed"` 同时防超长路径（Windows MAX_PATH 260 的老限制）与清洗后变空串。这三个细节对应 980 篇「文件批量整理」一节的生产化加固。

## tempfile：临时文件与目录

```python
import tempfile
from pathlib import Path

# 临时目录：with 退出即整树删除，测试与中间产物的首选
with tempfile.TemporaryDirectory() as tmpdir:
    work = Path(tmpdir)
    (work / "scratch.txt").write_text("中间结果")
    print(work)                    # /tmp/tmpXXXX 或 C:\Users\...\Temp\tmpXXXX

# 临时文件：默认 delete=True 自动删除；需要文件名给别人用时 delete=False
with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
    f.write("name,age\nAda,30\n")
    print(f.name)                  # 拿到真实路径（例如要交给外部进程）
```

逐段解释：`TemporaryDirectory` 的 with 语义是「退出即 `shutil.rmtree`」——临时产物永不泄漏，这与 [上下文管理器](/python/520-ContextManager) 的确定性清理是同一机制。`suffix=".csv"` 让临时文件带正确扩展名——有些外部工具按扩展名认格式，默认无后缀会翻车。`delete=False` 的取舍：文件名要传给子进程/其他程序时必须关掉自动删除（句柄还开着时 Windows 不允许别人打开该文件），代价是**删除责任回到你手上**——用完记得 `Path(f.name).unlink(missing_ok=True)`。临时目录位置尊重 `TMPDIR`/`TEMP` 环境变量；需要「重启也还在」的临时数据别用 tempfile（它按「最短生命周期」设计），用带时间戳的专用目录。

## 常见坑点速记

- 新代码用 pathlib，`os.path` 读懂即可；两套的判断函数名相似但调用方式不同（属性方法 vs 字符串函数）；
- `os.walk` 剪枝必须**切片赋值** `dirnames[:] = ...`，普通赋值不生效；
- `rglob`/`glob` 结果无排序保证，要确定性顺序自己 `sorted()`；巨树剪枝用 os.walk 而不是 rglob 过滤；
- 删除三件套的能力阶梯：`Path.unlink`（单文件）、`Path.rmdir`（空目录）、`shutil.rmtree`（任意树）——能力越强，前面越要有 dry_run 与豁免规则；
- `Path.rename` 跨文件系统抛错，`shutil.move` 才能跨盘；
- 备份/同步用 `copy2`（保 mtime），`copytree` 增量补目录开 `dirs_exist_ok=True`；
- `Path(__file__).resolve().parent` 锚定脚本位置，`Path.cwd()` 随启动方式漂移——定时任务脚本必须用前者；
- 爬来的外部字符串做文件名前过一遍非法字符清洗（Windows 九字符 + 末尾点空格）；
- `NamedTemporaryFile(delete=False)` 之后删除责任在自己，用完 `unlink`。

## 动手实践

练习一（预测题）：在 Windows 上，下面每个表达式的结果是什么？

```python
from pathlib import Path

p1 = Path("data") / "logs" / "app.log"
p2 = Path("data") / "/abs.txt"
p3 = Path("a/b/c.txt")
print(p1.name, p1.suffix, p1.stem)
print(p2)
print(p3.parent / p3.name)
```

提示：`/` 对绝对路径片段的语义；name/suffix/stem 各取哪一段。

<details>
<summary>参考实现</summary>

- `p1`：Windows 上为 `data\logs\app.log`（分隔符自动本地化）；`name` 是 `app.log`、`suffix` 是 `.log`、`stem` 是 `app`。
- `p2`：`/abs.txt`——右侧是绝对路径时**重置**拼接（与 `os.path.join` 同语义），前缀 `data` 被丢弃。这是从字符串拼接思维迁移过来最容易踩的坑：变量里存着用户给的绝对路径时，`base / user_path` 的结果可能完全脱离 base。
- `p3`：`a/b/c.txt`（`p3.parent` 是 `a/b`，拼上 `c.txt` 还原全路径）。
</details>

练习二（实战题）：写 `dedup_by_hash(dir: Path) -> int`：找出目录（含子目录）里内容完全相同的文件，保留每个哈希组中最早修改的一个，删除其余，返回删除数。用 `dry_run` 参数控制是否真删。

提示：文件内容哈希用 `hashlib.sha256` 分块读（读取模式参考 300 篇）；分组前先按文件大小分桶，大小不同的必不等，能省大半哈希计算。

<details>
<summary>参考实现</summary>

```python
import hashlib
from collections import defaultdict
from pathlib import Path

def file_sha256(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(chunk), b""):
            h.update(block)
    return h.hexdigest()

def dedup_by_hash(directory: Path, dry_run: bool = True) -> int:
    by_size: dict[int, list[Path]] = defaultdict(list)
    for p in directory.rglob("*"):
        if p.is_file():
            by_size[p.stat().st_size].append(p)

    removed = 0
    for size, group in by_size.items():
        if len(group) < 2:
            continue
        by_hash: dict[str, list[Path]] = defaultdict(list)
        for p in group:
            by_hash[file_sha256(p)].append(p)
        for dup_group in by_hash.values():
            if len(dup_group) < 2:
                continue
            keeper = min(dup_group, key=lambda p: p.stat().st_mtime)
            for dup in dup_group:
                if dup != keeper:
                    print(f"删除 {dup}（与 {keeper} 相同）")
                    if not dry_run:
                        dup.unlink()
                    removed += 1
    return removed

# n = dedup_by_hash(Path("downloads"), dry_run=True)
# print(f"待删除 {n} 个")
```

设计要点：先按大小分桶，哈希只算「大小相同」的候选——大小不同的文件哈希必不同，这一步剪枝让十万文件的目录通常只需哈希几百个；`min(key=st_mtime)` 选最早修改的保留。`dry_run` 默认 True 与正文清理脚本的纪律一致：不可逆操作先看清单。
</details>

练习三（实战题）：把「清理构建缓存」脚本扩展为可配置：接受一个 YAML/JSON 配置文件（缓存目录名列表 + 全局豁免路径列表），并对「豁免路径下的缓存」只报告不删除。配置解析用标准库 `json` 即可。

提示：豁免判断用 `Path.resolve()` 后的 `is_relative_to`（3.9+）判定子树关系。

<details>
<summary>参考实现</summary>

```python
import json
from pathlib import Path

def clean_with_config(root: Path, config_path: Path, dry_run: bool = True) -> None:
    cfg = json.loads(config_path.read_text(encoding="utf-8"))
    cache_names = set(cfg["cache_dirs"])                     # ["__pycache__", "node_modules", ...]
    exempt = {Path(p).resolve() for p in cfg.get("exempt", [])}

    for cache in sorted(root.rglob("*")):
        if not (cache.is_dir() and cache.name in cache_names):
            continue
        resolved = cache.resolve()
        if any(resolved.is_relative_to(e) for e in exempt):
            print(f"豁免跳过: {resolved}")
            continue
        print(f"{'将删除' if dry_run else '已删除'}: {resolved}")
        if not dry_run:
            import shutil
            shutil.rmtree(resolved)

# clean_with_config(Path("."), Path("clean.json"), dry_run=True)
```

`is_relative_to` 是子树判定的官方方法（3.9+），替代手写 `str(resolved).startswith(str(e))` 的前缀比较——前缀比较有 `dir1` 误匹配 `dir10` 的经典 bug，路径级判断必须用路径 API。
</details>

练习四（找错题）：这段遍历想跳过 `node_modules`，但清理全没生效，找出两处问题：

```python
import os

def clean(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames = [d for d in dirnames if d != "node_modules"]
        for name in filenames:
            if name.endswith(".tmp"):
                os.remove(os.path.join(dirpath, name))
```

提示：walk 对 dirnames 的约定；再想想「进入顺序」——赋值发生在本层处理之后，walk 下一层还认它吗。

<details>
<summary>参考实现</summary>

```python
import os

def clean(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != "node_modules"]   # 切片赋值
        for name in filenames:
            if name.endswith(".tmp"):
                os.remove(os.path.join(dirpath, name))
```

核心问题一处：`dirnames = [...]` 让局部变量指向新列表，`os.walk` 内部保存的仍是**原列表**，下一层照常进入 `node_modules`——必须切片赋值 `dirnames[:] = ...` 修改原列表。第二处（潜在问题）：代码逻辑上「剪枝写在处理 filenames 之前」是对的，但如果有人把剪枝放到 `for name in filenames` 循环**之后**，本层已处理的文件没问题、子树剪枝同样失效——walk 的契约是「产出到你手上、你改完、它下一层再读」，任何对 `dirnames` 的修改都必须在**本轮 yield 结束前**完成。顺带：pathlib 版等价写法见正文，但注意 rglob 版无法避免进入被排除目录，巨树性能不同。
</details>

练习五（实战题）：实现 `sync_dir(src: Path, dst: Path)`：把 src 增量同步到 dst——新文件复制、内容变化（大小或 mtime 不同）的覆盖、src 已删除的从 dst 删掉。用 `copy2` 保元数据，打印每类操作。

提示：遍历用 `rglob("*")` 并以 `relative_to(src)` 求相对路径；「src 已删除」的检测要把 dst 的相对路径集合与 src 做差集。

<details>
<summary>参考实现</summary>

```python
import shutil
from pathlib import Path

def sync_dir(src: Path, dst: Path, dry_run: bool = True) -> None:
    src_files = {p.relative_to(src): p for p in src.rglob("*") if p.is_file()}
    dst_files = {p.relative_to(dst): p for p in dst.rglob("*") if p.is_file()}

    for rel, sp in sorted(src_files.items()):
        target = dst / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        if rel not in dst_files:
            print(f"新增 {rel}")
            if not dry_run:
                shutil.copy2(sp, target)
        elif (sp.stat().st_size, sp.stat().st_mtime) != \
             (dst_files[rel].stat().st_size, dst_files[rel].stat().st_mtime):
            print(f"更新 {rel}")
            if not dry_run:
                shutil.copy2(sp, target)

    for rel in sorted(set(dst_files) - set(src_files)):
        print(f"删除多余 {rel}")
        if not dry_run:
            (dst / rel).unlink()

# sync_dir(Path("webapp"), Path("backup/webapp"), dry_run=True)
```

要点：`relative_to(src)` 把绝对路径转成「镜像内相对位置」，两个目录树才能按同一坐标系比对；`copy2` 保住 mtime，下一次同步的「内容变化」判断才可靠（若用 copy，mtime 变成复制时刻，每次全量重拷）。修改检测用「大小 + mtime」组合是经典折中——内容哈希最准但全量哈希太贵，与练习二的 dedup 恰好是同一权衡的两侧。
</details>

## 与之前和之后的知识的关系

- 往前：文件对象与 `with` 的接口约定见 [文件 IO 与上下文管理器](/python/300-FileIOContextManager)；`Path.read_text` 背后的字符串与编码见 [字符串格式化](/python/120-StringFormattingMethods)；正则清洗文件名见 [正则表达式](/python/210-Regex)。
- 往后：把目录打包归档见 [归档与压缩](/python/305-FileArchiveCompression)；整理脚本的调度与幂等设计见 [Python 自动化手册](/python/980-PythonAutomationCookbook)；`Path.glob` 的模式匹配思想与 `itertools` 组合见 [迭代器协议与 itertools](/python/170-IteratorProtocolAndItertools)；测试中用 `tmp_path`/`TemporaryDirectory` 隔离文件副作用见 [Python 测试](/python/750-PythonTest)。

## 官方文档

- pathlib —— Object-oriented filesystem paths：https://docs.python.org/3/library/pathlib.html（PSF License）
- shutil —— Higher-level file operations：https://docs.python.org/3/library/shutil.html（PSF License）
- tempfile —— Generate temporary files and directories：https://docs.python.org/3/library/tempfile.html（PSF License）
- os —— Miscellaneous operating system interfaces（os.walk 剪枝约定）：https://docs.python.org/3/library/os.html（PSF License）

## 自我检查

- 能写出 pathlib 与 os.path 的五组对照写法，并说出 `resolve()` 与 `abspath` 的差异；
- 能解释 `/` 拼接遇到绝对路径片段时的重置语义，并说明它在安全上的含义；
- 能正确使用 `os.walk` 剪枝（切片赋值）并解释为什么普通赋值无效；
- 能按「备份用 copy2、增量合并开 dirs_exist_ok」的规则选用 shutil 复制家族；
- 能写出带 dry_run 与豁免规则的缓存清理脚本，并说出三类删除 API 的能力阶梯；
- 能说出临时文件 `delete=False` 的代价与清理责任。
