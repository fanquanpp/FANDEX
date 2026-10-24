---
order: 320
title: 归档与压缩：zipfile、tarfile、gzip 与 shutil.make_archive
module: 'python'
category: 后端技术
difficulty: beginner
description: 标准库归档压缩家族全景——zip/tar/gzip 三种格式的选型与压缩级别、shutil.make_archive 一行打包、流式解包大 tar 的内存安全写法、zip slip 路径穿越防御；日志按天归档、构建产物发布、批量解压用户附件三个工程场景逐行拆解。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 标准库的「归档与压缩」家族——`zipfile`（zip 格式）、`tarfile`（tar 系格式）、`gzip`（单文件压缩）、`shutil.make_archive`（一行打包的便捷层）。它们是文件 I/O 之上的一个独立知识类别：把「多个文件收进一个包」与「把字节流压小」两件事组合完成。
- **解决什么问题**：日志按天滚动后目录里堆了几千个文件要归档；CI 产出的构建物要打成 zip 发布；用户上传的压缩附件要在服务端解开做内容分析——这些都是「文件读写」盖不住的领域：涉及格式选型（zip 还是 tar.gz）、压缩级别与速度的权衡、大包的内存安全，以及一个纯文件操作没有的攻击面：**解压出来的路径由压缩包内嵌的元数据决定，可以指向任意位置**。
- **什么时候用到**：定时归档、备份打包、构建产物发布、批量解包外部不可信压缩包。归档的「收」与「散」依赖的路径与遍历能力见 [文件系统操作与 pathlib/shutil](/python/302-FilesystemPathlibShutil)，文件读写与编码的地基见 [文件 IO 与上下文管理器](/python/300-FileIOContextManager)；自动化脚本的整体编排见 [Python 自动化手册](/python/980-PythonAutomationCookbook)。

## 选型：zip、tar、gzip 各管什么

三种格式的分工经常被混为一谈，先立心智模型：

| 格式 | 标准库模块 | 本质 | 保留元数据 | 典型场景 |
| --- | --- | --- | --- | --- |
| zip | `zipfile` | 归档 + 压缩一体 | 基本时间戳（字节权限在 extra 字段，跨平台不完整） | 与 Windows 交互、构建产物发布、用户上传 |
| tar | `tarfile` | **只归档不压缩**（常配 gz/bz2/xz 后缀变体） | 完整 Unix 权限/属主/软链接 | Linux 服务器备份、Docker 镜像层 |
| gzip | `gzip` | **只压缩单文件**（无归档概念） | 原文件名与时间戳 | 单个大日志、网络传输流 |

关键认知：`tar.gz` 是「tar 归档、gzip 压缩」两层操作的组合名——tar 负责把一群文件变成一个流（保留 Unix 权限），gzip 负责把这个流压小。zip 则是一步做完两件事，但代价是压缩粒度是「逐文件」的，相似文件之间没有上下文冗余可吃，**整体压缩率通常低于 tar.gz**。选型口诀：给 Windows 用户或浏览器下载用 zip；在 Linux 服务器上备份目录用 tar.gz；压单个大文件用 gzip。

压缩级别三家共用一个约定：`compresslevel` 从 0（不压缩）到 9（最高），级别越高越小越慢。0 与 9 的体积差通常不到一倍，耗时差可达数倍——**定时任务、CI 流水线默认用中级（6）或低级（1）**，别为了几 MB 把流水线拖慢几分钟。

## zipfile：读、写、安全三件事

### 写入：逐文件 add 与从目录递归打包

```python
import zipfile
from pathlib import Path

def zip_directory(source_dir: str, zip_path: str) -> int:
    """把目录打进 zip，返回打包的文件数。"""
    root = Path(source_dir)
    count = 0
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED,
                         compresslevel=6) as zf:
        for f in sorted(root.rglob("*")):
            if f.is_file():
                zf.write(f, arcname=f.relative_to(root))   # 关键：arcname 去掉绝对前缀
                count += 1
    return count

n = zip_directory("build/dist", "release-1.4.2.zip")
print(f"打包 {n} 个文件")
```

逐行解释：`compression=zipfile.ZIP_DEFLATED` 指定 DEFLATE 算法（zip 的事实标准）；不传时默认 `ZIP_STORED`——**只归档不压缩**，这是 `zipfile` 最常见的无声坑：打出来的包体积与源文件一样大，还不报错。`compresslevel=6` 是速度与体积的折中。`arcname=f.relative_to(root)` 决定包内路径：不传 `arcname` 时 `zf.write` 会把传入路径原样（含绝对路径的盘符、上级目录）写进包——解开就是一串目录噪声，还会暴露打包机的目录结构。为什么先 `sorted`：保证两次打包同一目录产生字节级一致的包，diff 两个构建产物时才有意义。

对照命令行 `zip -r`：功能等价，但脚本内嵌 `zipfile` 的好处是可选文件、改 arcname、加密都能用代码表达，进 CI 不依赖目标机装没装 zip 工具。

### 读取：列表、校验与按需解压

```python
import zipfile

with zipfile.ZipFile("release-1.4.2.zip") as zf:
    names = zf.namelist()                      # 包内路径列表
    bad = zf.testzip()                         # 逐成员校验 CRC，返回第一个坏成员或 None
    print(f"成员 {len(names)} 个，校验{'通过' if bad is None else '失败: ' + bad}")

    # 只解出需要的一个成员到内存，不解全包
    manifest = zf.read("manifest.json").decode("utf-8")
    print(manifest[:80])
```

`testzip()` 为什么值得在解压前调用：zip 的 CRC 校验能发现传输损坏（下载中断、磁盘坏块），在写盘之前发现比解到一半失败再清理干净便宜得多。`zf.read(member)` 把成员读进内存——适合配置、清单这类小文件；大文件用 `zf.open(member)` 拿到文件对象流式读（它与普通文件的 `read`/`readline` 接口一致，见 [文件 IO](/python/300-FileIOContextManager)）。

### 例子一（真实工程）：日志按天归档打包

把 980 手册「文件批量整理」场景延伸一步：图片文件按年归档之后，再把上个月的归档目录打成一个月度 zip，转存到冷存储：

```python
import zipfile
from datetime import date, timedelta
from pathlib import Path

def archive_monthly(base_dir: Path, archive_root: Path, month_first: date) -> Path:
    """把 base_dir 下属于 month_first 所在月的文件打成 zip。"""
    next_month = (month_first.replace(day=28) + timedelta(days=4)).replace(day=1)
    stem = f"logs-{month_first:%Y%m}.zip"
    out = archive_root / stem
    if out.exists():                       # 幂等：定时任务重跑不重复打包
        return out

    count = 0
    with zipfile.ZipFile(out, "x", compression=zipfile.ZIP_DEFLATED,
                         compresslevel=1) as zf:      # 后台任务，用低级别换速度
        for f in sorted(base_dir.rglob("*.log")):
            if month_first <= date.fromtimestamp(f.stat().st_mtime) < next_month:
                zf.write(f, arcname=f.name)
                count += 1
    if count == 0:
        out.unlink()                       # 空包不留垃圾
    return out

# out = archive_monthly(Path("logs/2026/09"), Path("archive"), date(2026, 9, 1))
```

逐段解释：模式用 `"x"`（独占创建）而不是 `"w"`——并发跑两个调度器时，`"w"` 会静默截断对方写了一半的包，`"x"` 让后到者直接抛 `FileExistsError`，配合前置的 `exists()` 检查构成幂等双保险（幂等原则的展开见 [Python 自动化手册](/python/980-PythonAutomationCookbook)）。`compresslevel=1` 是刻意选择：凌晨窗口只有十分钟，日志文本量到 GB 级时级别 9 的耗时不可接受。月份边界用「28 号加 4 天再取 1 号」这个惯用法绕开大小月与闰年的讨论。易错点：`f.stat().st_mtime` 的时区是本地时间，服务器 UTC、业务按北京时间分月时会有 8 小时的边界漂移——严谨做法是记录文件名里的日期而不是文件系统时间戳。

### zip slip：解压前的路径校验是安全底线

zip 包内每个成员自带一个**路径字符串**，它是打包方随便写的：`../../etc/cron.d/backdoor`、绝对路径 `C:\Windows\...` 都合法存在。直接把成员名拼到解压目录上，恶意包就能把文件写到目标目录之外——这个攻击有正式名字 **zip slip**（路径穿越），因此「解压前校验成员路径」不是代码洁癖，是安全底线：

```python
import zipfile

def safe_extract(zf: zipfile.ZipFile, dest_dir: str) -> list[str]:
    """防御 zip slip 的解压：成员路径必须落在 dest_dir 内。"""
    dest = Path(dest_dir).resolve()
    extracted = []
    for info in zf.infolist():
        target = (dest / info.filename).resolve()
        if dest != target and dest not in target.parents:
            raise ValueError(f"非法成员路径，疑似 zip slip: {info.filename}")
        if info.filename.endswith("/"):       # 目录成员只负责建目录
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(info) as src, open(target, "wb") as dst:
            for chunk in iter(lambda: src.read(1 << 20), b""):
                dst.write(chunk)               # 1 MB 分块，内存不随成员变大
        extracted.append(str(target))
    return extracted
```

逐段解释这段防御逻辑：`(dest / info.filename).resolve()` 把「相对路径 + 可能的 `..`」一起规范化成绝对真实路径；`dest not in target.parents` 判定解压目标是否仍在目标目录的子树里——`/data/uploads/../../etc/passwd` 规范化后是 `/etc/passwd`，它的 parents 里没有 `/data/uploads`，被当场拒绝。为什么用 `zf.open` 分块拷贝而不是 `zf.extract`：`ZipFile.extract` 的历史行为对路径清洗不完全一致（不同 Python 版本处理 `..` 的策略有差异），自己控制目标路径才是确定性防御。为什么分块：`zf.read(info)` 会把整个成员读进内存，用户上传一个声明 4 GB 的成员就能打爆服务——「不可信输入不给它决定内存大小的权力」。

补充一条 zip 特有限制：包内文件的**大小字段在写包时**就已记录（zip 尾部中央目录），`ZipFile` 不支持「边生成边追加未知大小」的流式写入；需要流式生成 zip（边压边发 HTTP 响应）得手动改写 zip64 头或借助第三方库。tar 没有这个限制。

## tarfile：服务器备份的格式

### 打包与两种解包姿势

```python
import tarfile

# 打包整个日志目录（gz 压缩由 mode 里的 "gz" 声明）
with tarfile.open("logs-2026-09.tar.gz", "w:gz") as tf:
    tf.add("logs/2026/09", arcname="logs-202609")

# 解包方式一：整体解开（信任来源时）
with tarfile.open("logs-2026-09.tar.gz") as tf:
    tf.extractall(path="restore")          # 内部成员路径同样可穿越，见下文

# 解包方式二：流式逐成员（大包、边解边处理）
with tarfile.open("logs-2026-09.tar.gz") as tf:
    for member in tf:                      # tarfile.TarFile 可迭代出 TarInfo
        if member.isfile() and member.size < 10 * 1024 * 1024:
            f = tf.extractfile(member)     # 文件对象，惰性读
            total = sum(chunk.count(b"ERROR") for chunk in iter(lambda: f.read(1 << 20), b""))
            print(member.name, total)
```

逐行解释：`mode="w:gz"` 的冒号前是行为（w 写）、冒号后是压缩（gz/gzip、bz2、xz、或空表示不压缩）；读的时候 `tarfile.open` 自动探测压缩格式，不用写 `r:gz`。`tf.add` 递归目录并保留 Unix 权限与属主——这是 tar 相对 zip 的核心优势，所以**服务器上的备份请用 tar 而不是 zip**，否则恢复出来的脚本会丢执行位。流式循环里 `for member in tf` 配 `tf.extractfile(member)` 是处理 T 级备份的正确姿势：任何时刻只有一个成员在内存里。

### tar 的解包安全（Python 3.12+ 的 filter 参数）

tar 与 zip 有同样的路径穿越攻击面，且 tar 还会**恢复权限位与链接**，攻击面更大（一个指向 `/etc` 的软链接成员就能把后续写入导向系统目录）。Python 3.12 起 `extractall` 引入 `filter` 参数，3.14 起默认值改为 `'data'`：

```python
# Python 3.12+ 明确声明过滤策略；3.14 起不写也默认 'data'
with tarfile.open("backup.tar.gz") as tf:
    tf.extractall(path="restore", filter="data")
```

三种 filter 的语义：`'fully_trusted'` 是 3.12-3.13 的默认（旧行为，恢复一切）；`'tar'` 阻止路径穿越与特殊设备文件但保留权限属主；`'data'` 最严格——只留常规文件与目录，剥掉属主与高级权限位，专为「解别人给的包」设计。决策口诀：解自己的备份用 `tar`（保权限），解外部来源一律 `data`。旧版本 Python（3.8-3.11）没有 filter 参数，需要按前文 zip 的方式手工校验成员路径。

### 例子二（真实工程）：批量解压用户上传附件的安全流水线

内容分析服务接收用户上传的 zip/tar 附件并解包做文本抽取。解包层要同时防三种攻击：路径穿越（zip slip）、zip 炸弹（高压缩比耗尽磁盘）、超大单文件（耗尽内存或配额）：

```python
import tarfile
import zipfile
from pathlib import Path

MAX_TOTAL = 512 * 1024 * 1024      # 解压后总量上限 512 MB
MAX_MEMBER = 64 * 1024 * 1024      # 单成员上限 64 MB
MAX_RATIO = 200                    # 压缩比超过 200 倍视为炸弹

def inspect_zip(attachment: Path, dest: Path) -> int:
    total_uncompressed = 0
    with zipfile.ZipFile(attachment) as zf:
        for info in zf.infolist():
            ratio = info.file_size / max(info.compress_size, 1)
            if ratio > MAX_RATIO:
                raise ValueError(f"压缩比异常（{ratio:.0f} 倍），疑似 zip 炸弹: {info.filename}")
            if info.file_size > MAX_MEMBER:
                raise ValueError(f"单文件超限: {info.filename}")
            total_uncompressed += info.file_size
        if total_uncompressed > MAX_TOTAL:
            raise ValueError("解压总量超限")
        # 数值关卡全部通过后，才进入带路径校验的解压（safe_extract 见上节）
        safe_extract(zf, dest)
    return total_uncompressed

# 返回值供计费/配额系统扣减；任何一处 raise 都不会在磁盘留下半解压产物
```

逐段解释防御顺序：先做**纯元数据检查**（`infolist()` 只读中央目录，不解压任何字节，成本 O(成员数)），全部通过才动磁盘——把拒绝动作放在最便宜的阶段。压缩比检查 `file_size / compress_size` 是识别炸弹的核心信号：42 GB 的 `zip-bomb.zip` 压缩后只有几 MB，比值数万倍；正常文本压缩比在 2-10 倍之间，200 是留足余量的业务阈值。为什么先总量后逐个：先算总量可以在不写任何字节的情况下拒掉超限包。换成「边解边统计、超限再删」的写法：磁盘可能瞬间被写满（拒绝晚了），还要处理清理失败的重试，得不偿失。

## gzip：单文件压缩与流

`gzip` 没有归档概念，就是「一个文件的压缩外壳」，但它的接口刻意模仿内置 `open`：

```python
import gzip

# 写：压一个当天日志（open 的二进制模式套 gzip 即可）
with open("app-2026-10-06.log", "rb") as src, \
     gzip.open("app-2026-10-06.log.gz", "wb", compresslevel=6) as dst:
    for line in src:                       # 源文件按行迭代（见 300 篇）
        dst.write(line)

# 读：透明解压，接口与普通文件一致
with gzip.open("app-2026-10-06.log.gz", "rt", encoding="utf-8") as f:
    errors = [line for line in f if "ERROR" in line]
print(f"错误行 {len(errors)} 条")
```

逐段解释：`gzip.open` 的模式字符串与内置 `open` 相同（`rb`/`wb`/`rt`...），`"rt"` 直接得到文本流、连编码参数都一致——这是刻意设计：任何接受文件对象的代码（csv.reader、json.load）都能无缝吃 gzip 流。为什么用行迭代而不是 `src.read()` 全读：日志文件可能几个 GB，行迭代内存 O(1)。对照 `shutil` 的压缩函数：`shutil.compress("app.log")` 一行也能出 gzip 文件，适合一次性脚本；要控制级别、要处理流（HTTP 响应的 gzip 编码）时就用 `gzip` 模块本体。

## shutil.make_archive：一行打包与它的边界

如果需求只是「把这个目录打个包，格式随意」，`shutil` 的便捷层一行完成：

```python
import shutil

# 产出 release-1.4.2.zip（root_dir 会被包名吸收，base_dir 决定包内起点）
shutil.make_archive(
    base_name="dist/release-1.4.2",   # 输出路径（不含扩展名，扩展名由 format 决定）
    format="zip",                     # "zip" / "tar" / "gztar" / "bztar" / "xztar"
    root_dir="build",                 # 从哪个目录出发
    base_dir="dist",                  # 打包该子目录（包内路径从 dist 起算）
)
```

逐参数解释：`root_dir` 与 `base_dir` 的组合最容易读错——`root_dir="build", base_dir="dist"` 产出的包内路径以 `dist/` 开头（打进的是 `build/dist`）；若 `base_dir` 用默认 `.`，包内会从 `build/` 起算、带着 build 这层目录名。为什么 `format` 没有单独的「zip 加压缩级别」参数：`make_archive` 是便捷层，zip 固定用默认级别、tar 的 gz 压缩同理——要控制压缩级别就得退回 `zipfile`/`tarfile` 手写。它的边界总结：**格式固定五选一、级别不可调、没有安全过滤**（`make_archive` 只管打包不管解包，解包侧的安全仍靠上一节的防御代码）。

### 例子三（真实工程）：CI 构建产物的发布包

发布流水线把构建产物打成 zip 并生成校验文件，供运维下载后核对：

```python
import hashlib
import shutil
import zipfile
from pathlib import Path

def build_release(artifact_dir: Path, version: str) -> tuple[Path, str]:
    stem = artifact_dir.parent / f"release-{version}"
    zip_path = Path(shutil.make_archive(str(stem), "zip",
                                        root_dir=artifact_dir.parent,
                                        base_dir=artifact_dir.name))
    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    zip_path.with_suffix(".zip.sha256").write_text(f"{digest}  {zip_path.name}\n",
                                                   encoding="ascii")
    # 上线前抽查：包必须能打开且关键文件在
    with zipfile.ZipFile(zip_path) as zf:
        assert "app/main.py" in zf.namelist()
    return zip_path, digest

# zp, d = build_release(Path("build/dist"), "1.4.2")
# print(zp, d[:16])
```

逐段解释：`make_archive` 返回实际产出的路径（它可能给名字追加平台后缀），所以**永远用返回值**而不是自己拼 `stem + ".zip"`——这是它 API 的一个暗坑。校验文件用 SHA-256 而不是 zip 自带的 CRC-32：CRC 是检错码不是摘要，防不了恶意篡改，发布场景要的是密码学摘要。最后的抽查断言把「打包成功」升级为「包内容正确」——CI 里宁可红着失败也不发一个空包出去（测试的展开见 [Python 测试](/python/750-PythonTest)）。对照手写 `zip_directory`：需要控制级别、排除规则、确定性排序时用 zipfile；`make_archive` 适合「标准产物、不挑参数」的发布件。

## 常见坑点速记

- `zipfile.ZipFile(..., "w")` 默认 `ZIP_STORED` 不压缩——没写 `compression=ZIP_DEFLATED` 的「压缩包」是假压缩；
- `zf.write(path)` 不传 `arcname` 会把绝对路径写进包内，解压出一串目录噪声；
- 解压外部压缩包前必须校验成员路径（zip slip / tar 穿越），Python 3.12+ 的 tar 解包显式传 `filter="data"`；
- zip 炸弹靠「元数据阶段检查压缩比与总量」拦截，不要边解边发现；
- `tarfile` 保留权限与属主是特性也是攻击面，外部包用 `'data'` 过滤；
- `make_archive` 的产物路径要看**返回值**，不要自己拼扩展名；
- 定时/CI 场景压缩级别从 1 或 6 起步，级别 9 只留给一次性的归档冷数据；
- 幂等三件套：`"x"` 模式防并发、`exists()` 防重跑、空包 `unlink()` 防垃圾（呼应 980 的定时脚本原则）。

## 动手实践

练习一（预测题）：不运行代码，指出下面打包脚本的三个问题：

```python
import zipfile

zf = zipfile.ZipFile("backup.zip", "w")
zf.write("/home/deploy/app/config.ini")
zf.write("/home/deploy/app/main.py")
zf.close()
print("done")
```

提示：默认压缩算法是什么？arcname 会是什么样子？如果 `main.py` 打包过程中抛异常会怎样？

<details>
<summary>参考实现</summary>

```python
import zipfile
from pathlib import Path

with zipfile.ZipFile("backup.zip", "w",
                     compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    app = Path("/home/deploy/app")
    for f in (app / "config.ini", app / "main.py"):
        zf.write(f, arcname=str(f.relative_to(app)))
```

三个问题：其一，未指定 `compression`，默认 `ZIP_STORED`，包没有压缩；其二，未传 `arcname`，包内路径是 `/home/deploy/app/config.ini` 这样的绝对路径，既泄露服务器目录结构又造成解压噪声；其三，未用 `with`，`main.py` 若抛异常 `zf.close()` 不会执行，产出一个损坏的 zip（zip 的目录信息在 close 时写入尾部）。顺带：修复版把公共前缀 `relative_to` 掉，包内路径干净且确定。
</details>

练习二（实战题）：写 `extract_member_safely(zip_path, member_name, dest_dir)`：只把压缩包里指定的一个成员解到目标目录，要求：成员路径穿越校验、成员不存在时抛 `KeyError`、目标已存在同名文件时不覆盖而是抛 `FileExistsError`。

提示：`namelist()` 找成员、`zf.open(member)` 拿文件对象、`Path.exists()` 检查覆盖；路径校验逻辑直接复用本篇 `safe_extract` 的 `parents` 判定。

<details>
<summary>参考实现</summary>

```python
import zipfile
from pathlib import Path

def extract_member_safely(zip_path: str, member_name: str, dest_dir: str) -> Path:
    dest = Path(dest_dir).resolve()
    with zipfile.ZipFile(zip_path) as zf:
        if member_name not in zf.namelist():
            raise KeyError(member_name)
        target = (dest / member_name).resolve()
        if dest != target and dest not in target.parents:
            raise ValueError(f"非法成员路径: {member_name}")
        if target.exists():
            raise FileExistsError(target)
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(member_name) as src, open(target, "wb") as dst:
            for chunk in iter(lambda: src.read(1 << 20), b""):
                dst.write(chunk)
    return target

# 成员名 ../evil.txt 会在 resolve 后落到 dest 之外，被 ValueError 拦下
```

为什么不用 `zf.extract(member, dest)`：`extract` 内部有自己的一套路径清洗，但「不覆盖已存在文件」这条业务规则它给不了（`extract` 默认直接覆盖），确定性防御必须自己握目标路径。
</details>

练习三（实战题）：给 980 手册的归档脚本加「冷存储转存」步骤：把 `archive/` 目录下所有 `*.zip` 打成一个 `gztar`，用 `shutil.make_archive` 完成，要求压缩产物小于原 zip 总体积时才保留（否则删除并打印跳过原因）。

提示：`make_archive` 的返回值拿产物路径；总体积用 `sum(f.stat().st_size ...)`；gzip 对「已经是 zip 的数据」压缩率接近 1，先预测结果再验证。

<details>
<summary>参考实现</summary>

```python
import shutil
from pathlib import Path

def cold_store(archive_dir: Path, out_dir: Path) -> Path | None:
    zips = sorted(archive_dir.glob("*.zip"))
    if not zips:
        return None
    total = sum(z.stat().st_size for z in zips)
    out = Path(shutil.make_archive(str(out_dir / "cold-store"), "gztar",
                                   root_dir=archive_dir))
    if out.stat().st_size < total:
        return out
    out.unlink()
    print(f"二次压缩无收益（{out.stat().st_size if out.exists() else 0}），已跳过")
    return None
```

预期结论：**几乎总是跳过**。zip 成员已经各自 DEFLATE 压缩过，gzip 对高熵字节流基本压不动——这就是「压缩不可叠加」的工程直觉：检测「再压是否划算」再落盘，比无脑套两层压缩省时间也省空间。真实冷存储方案应直接把原始文件打 tar.gz，跳过中间的 zip。
</details>

练习四（找错题）：下面的附件解压流水线有两处安全问题，先找再修：

```python
import zipfile

def handle_upload(upload_path: str, dest: str) -> None:
    with zipfile.ZipFile(upload_path) as zf:
        for name in zf.namelist():
            zf.extract(name, dest)
```

提示：成员名可以是 `../../x`；成员声明的解压大小可以远超磁盘容量。

<details>
<summary>参考实现</summary>

```python
import zipfile
from pathlib import Path

MAX_MEMBER = 64 * 1024 * 1024
MAX_TOTAL = 512 * 1024 * 1024

def handle_upload(upload_path: str, dest: str) -> None:
    dest_p = Path(dest).resolve()
    with zipfile.ZipFile(upload_path) as zf:
        infos = zf.infolist()
        if sum(i.file_size for i in infos) > MAX_TOTAL:
            raise ValueError("解压总量超限")
        for info in infos:
            target = (dest_p / info.filename).resolve()
            if dest_p != target and dest_p not in target.parents:
                raise ValueError(f"非法成员路径: {info.filename}")
            if info.file_size > MAX_MEMBER:
                raise ValueError(f"单文件超限: {info.filename}")
            zf.extract(info, dest)
```

两处问题：其一，`zf.extract(name, dest)` 直接信任成员名，`../../etc/cron.d/x` 会被写到目标目录之外（zip slip）；其二，没有大小关卡，解压总量与单成员大小都不设防，zip 炸弹可以直接写满磁盘。修复版在动磁盘之前完成全部元数据检查，路径校验用 `resolve()` 后比对 `parents` 子树关系。注意逐成员也要检查单文件上限——总量达标不代表没有单个超大成员挤爆配额。
</details>

练习五（实战题）：写一个 `tail_gz(path, n)`：不解压整个 `.gz` 日志，返回最后 n 行。提示 gzip 流不可随机访问，但可以从文件末尾向前按块读、在内存里反着找换行符。

提示：`gzip.open` 只能顺序读；换思路——用内置 `open`（二进制）从文件尾读固定大小的块，块里凑够 n 个换行后，把这部分字节交给 `gzip.decompress` 局部解压。

<details>
<summary>参考实现</summary>

说明：gzip 是整体流式格式，**不存在严格意义上的尾部解压**——任何「读尾部」都要从最近的可解压点重放。下面的近似实现利用 gzip 文件通常按块（约 64 KB 量级）压缩、末尾块可独立解出的观察，从尾部对齐到 deflate 块边界后局部解压；对日志轮转场景，「tail 用近似、精确统计交给压缩前的滚动文件」才是工程正解：

```python
import gzip

def tail_gz(path: str, n: int = 10, chunk_size: int = 1 << 20) -> list[str]:
    # 精确而简单的做法：顺序解压，只保留 n 行（内存 O(n)，时间 O(文件)）
    tail: list[str] = []
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
        for line in f:
            tail.append(line)
            if len(tail) > n:
                tail.pop(0)          # deque(maxlen=n) 亦可，见 142 篇
    return tail
```

这道题的真正考点是认知边界：**gzip 不支持随机访问**，面试里答「从尾部读块」前要先说明 deflate 流的依赖结构，然后给出「顺序读 + 滑窗」这个正确且够用的版本。真需要随机访问压缩日志，选型应该换格式：zstd（3.14 起标准库 `compression.zstd`）支持可查找的压缩帧，或直接按天切文件。
</details>

## 与之前和之后的知识的关系

- 往前：目录遍历、路径拼接与 `shutil.move/copy` 见 [文件系统操作与 pathlib/shutil](/python/302-FilesystemPathlibShutil)；文件对象与 `with` 的接口约定见 [文件 IO 与上下文管理器](/python/300-FileIOContextManager)；`Path.resolve` 的语义依赖见 [数据结构基础](/python/140-BuiltinDataStructure) 中路径与字符串的关系。
- 往后：把归档放进定时调度见 [Python 自动化手册](/python/980-PythonAutomationCookbook)；安全校验失败路径的异常体系见 [异常处理](/python/130-ExceptionHandling)；hashlib 摘要与完整性校验的安全背景见 [Python 与密码学实践](/python/370-PythonAndCryptography)；zstd 等 3.14 压缩新模块见 [版本新特性时间线](/python/715-PythonVersionNewFeatures)。

## 参考与致谢

- zipfile —— Work with ZIP archives：https://docs.python.org/3/library/zipfile.html（PSF License）
- tarfile —— Read and write tar archive files（含 filter 参数文档）：https://docs.python.org/3/library/tarfile.html（PSF License）
- gzip —— Support for gzip files：https://docs.python.org/3/library/gzip.html（PSF License）
- shutil —— Higher-level file operations（make_archive）：https://docs.python.org/3/library/shutil.html（PSF License）
- 本篇 API 语义、filter 三档行为与版本默认值变化均以以上官方文档为依据（Python 3.12/3.14 行为差异已标注）。

## 自我检查

- 能画出 zip（归档+压缩一体）与 tar.gz（归档、压缩两层）的结构差异，并据此解释为什么整体压缩率 tar.gz 通常更高；
- 能写出带 `ZIP_DEFLATED` 与 `arcname` 的目录打包，并说出默认 `ZIP_STORED` 与绝对路径两个无声坑；
- 能解释 zip slip 的攻击原理，并独立写出 `resolve()` + `parents` 子树判定的防御解压；
- 能说出 zip 炸弹的两个元数据信号（压缩比、解压总量）与「先查元数据后动磁盘」的防御顺序；
- 能说明 tar 解包 `filter="data"` 与 `'tar'` 的语义差异及各自的适用来源；
- 能说出 `make_archive` 的三个边界（格式五选一、级别不可调、返回值才是真实路径）。
