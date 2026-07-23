# 文件IO与上下文管理器

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 文件打开与关闭

**基本写法：使用 open() 打开文件**
`open(<文件路径>, <模式>)`

```python
# 使用 open() 打开文件
file = open("test.txt", "r")
content = file.read()
file.close()
```

---

**基本写法：使用 with 语句自动关闭**
`with open(<文件路径>, <模式>) as <变量>: <语句>`

```python
# 使用 with 语句自动管理文件资源
with open("test.txt", "r") as f:
    content = f.read()
```

---

## 文件读取

**基本写法：读取整个文件**
`<文件>.read()`

```python
# 读取整个文件内容
with open("test.txt", "r") as f:
    content = f.read()
```

---

**基本写法：读取指定字节数**
`<文件>.read(<字节数>)`

```python
# 读取指定字节数
with open("test.txt", "r") as f:
    content = f.read(100)
```

---

**基本写法：逐行读取**
`for <行> in <文件>: <语句>`

```python
# 逐行读取文件
with open("test.txt", "r") as f:
    for line in f:
        print(line.strip())
```

---

**基本写法：使用 readline() 读取一行**
`<文件>.readline()`

```python
# 使用 readline() 读取一行
with open("test.txt", "r") as f:
    first_line = f.readline()
```

---

**基本写法：使用 readlines() 读取所有行**
`<文件>.readlines()`

```python
# 使用 readlines() 读取所有行为列表
with open("test.txt", "r") as f:
    lines = f.readlines()
```

---

## 文件写入

**基本写法：写入字符串**
`<文件>.write(<字符串>)`

```python
# 写入字符串到文件
with open("test.txt", "w") as f:
    f.write("Hello, World!")
```

---

**基本写法：写入多行**
`<文件>.writelines(<字符串列表>)`

```python
# 写入多行到文件
lines = ["line1\n", "line2\n", "line3\n"]
with open("test.txt", "w") as f:
    f.writelines(lines)
```

---

**基本写法：追加写入**
`with open(<文件路径>, "a") as <变量>: <语句>`

```python
# 追加写入到文件
with open("test.txt", "a") as f:
    f.write("追加的内容\n")
```

---

## 文件模式

**基本写法：读取模式**
`open(<文件路径>, "r")`

```python
# 读取模式（默认）
with open("test.txt", "r") as f:
    content = f.read()
```

---

**基本写法：写入模式**
`open(<文件路径>, "w")`

```python
# 写入模式（覆盖原有内容）
with open("test.txt", "w") as f:
    f.write("新内容")
```

---

**基本写法：追加模式**
`open(<文件路径>, "a")`

```python
# 追加模式（在文件末尾添加）
with open("test.txt", "a") as f:
    f.write("追加内容")
```

---

**基本写法：二进制读取模式**
`open(<文件路径>, "rb")`

```python
# 二进制读取模式
with open("image.png", "rb") as f:
    data = f.read()
```

---

**基本写法：二进制写入模式**
`open(<文件路径>, "wb")`

```python
# 二进制写入模式
with open("data.bin", "wb") as f:
    f.write(b"\x00\x01\x02")
```

---

**基本写法：读写模式**
`open(<文件路径>, "r+")`

```python
# 读写模式
with open("test.txt", "r+") as f:
    content = f.read()
    f.write("新内容")
```

---

## 文件指针操作

**基本写法：移动文件指针**
`<文件>.seek(<偏移量>)`

```python
# 移动文件指针到指定位置
with open("test.txt", "r") as f:
    f.seek(10)
    content = f.read()
```

---

**基本写法：获取文件指针位置**
`<文件>.tell()`

```python
# 获取当前文件指针位置
with open("test.txt", "r") as f:
    f.read(10)
    position = f.tell()
```

---

## 文件与目录操作

**基本写法：检查文件是否存在**
`os.path.exists(<路径>)`

```python
# 检查文件是否存在
import os
if os.path.exists("test.txt"):
    print("文件存在")
```

---

**基本写法：创建目录**
`os.makedirs(<目录路径>)`

```python
# 创建目录（包括父目录）
import os
os.makedirs("path/to/directory")
```

---

**基本写法：删除文件**
`os.remove(<文件路径>)`

```python
# 删除文件
import os
os.remove("test.txt")
```

---

**基本写法：删除目录**
`os.rmdir(<目录路径>)`

```python
# 删除空目录
import os
os.rmdir("empty_directory")
```

---

**基本写法：重命名文件**
`os.rename(<旧路径>, <新路径>)`

```python
# 重命名文件
import os
os.rename("old.txt", "new.txt")
```

---

**基本写法：列出目录内容**
`os.listdir(<目录路径>)`

```python
# 列出目录内容
import os
files = os.listdir(".")
```

---

**基本写法：使用 pathlib 操作路径**
`Path(<路径>)`

```python
# 使用 pathlib 操作路径
from pathlib import Path
path = Path("test.txt")
if path.exists():
    print("文件存在")
```

---

**基本写法：使用 pathlib 读取文件**
`Path(<路径>).read_text()`

```python
# 使用 pathlib 读取文件内容
from pathlib import Path
content = Path("test.txt").read_text()
```

---

**基本写法：使用 pathlib 写入文件**
`Path(<路径>).write_text(<内容>)`

```python
# 使用 pathlib 写入文件内容
from pathlib import Path
Path("test.txt").write_text("Hello, World!")
```

---

## JSON 文件处理

**基本写法：读取 JSON 文件**
`json.load(<文件>)`

```python
# 读取 JSON 文件
import json
with open("data.json", "r") as f:
    data = json.load(f)
```

---

**基本写法：写入 JSON 文件**
`json.dump(<对象>, <文件>)`

```python
# 写入 JSON 文件
import json
data = {"name": "Alice", "age": 30}
with open("data.json", "w") as f:
    json.dump(data, f)
```

---

**基本写法：JSON 字符串与对象转换**
`json.loads(<字符串>)`

```python
# JSON 字符串转换为 Python 对象
import json
json_str = '{"name": "Alice", "age": 30}'
data = json.loads(json_str)
```

---

**基本写法：Python 对象转换为 JSON 字符串**
`json.dumps(<对象>)`

```python
# Python 对象转换为 JSON 字符串
import json
data = {"name": "Alice", "age": 30}
json_str = json.dumps(data)
```

---

**基本写法：格式化 JSON 输出**
`json.dumps(<对象>, indent=<n>)`

```python
# 格式化 JSON 输出
import json
data = {"name": "Alice", "age": 30}
json_str = json.dumps(data, indent=2)
```

---

## CSV 文件处理

**基本写法：读取 CSV 文件**
`csv.reader(<文件>)`

```python
# 读取 CSV 文件
import csv
with open("data.csv", "r") as f:
    reader = csv.reader(f)
    for row in reader:
        print(row)
```

---

**基本写法：使用 DictReader 读取 CSV**
`csv.DictReader(<文件>)`

```python
# 使用 DictReader 读取 CSV 为字典
import csv
with open("data.csv", "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["age"])
```

---

**基本写法：写入 CSV 文件**
`csv.writer(<文件>)`

```python
# 写入 CSV 文件
import csv
with open("output.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["name", "age"])
    writer.writerow(["Alice", 30])
```

---

**基本写法：使用 DictWriter 写入 CSV**
`csv.DictWriter(<文件>, fieldnames=[<字段>])`

```python
# 使用 DictWriter 写入 CSV
import csv
with open("output.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "age"])
    writer.writeheader()
    writer.writerow({"name": "Alice", "age": 30})
```

---

## 上下文管理器

**换行写法：自定义上下文管理器类**
`class <上下文管理器>:`
`    def __enter__(self): <语句>`
`    def __exit__(self, exc_type, exc_val, exc_tb): <语句>`

```python
# 自定义上下文管理器类
class FileManager:
    def __init__(self, filename, mode):
        self.filename = filename
        self.mode = mode

    def __enter__(self):
        self.file = open(self.filename, self.mode)
        return self.file

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.file.close()
```

---

**基本写法：使用自定义上下文管理器**
`with <上下文管理器>(<参数>) as <变量>: <语句>`

```python
# 使用自定义上下文管理器
with FileManager("test.txt", "r") as f:
    content = f.read()
```

---

**换行写法：使用 contextlib.contextmanager**
`@contextmanager`
`def <函数名>(<参数>):`
`    <前置处理>`
`    yield <值>`
`    <后置处理>`

```python
# 使用 contextlib.contextmanager 装饰器
from contextlib import contextmanager

@contextmanager
def open_file(filename, mode):
    f = open(filename, mode)
    try:
        yield f
    finally:
        f.close()
```

---

**基本写法：使用 contextmanager 创建的上下文**
`with <函数名>(<参数>) as <变量>: <语句>`

```python
# 使用 contextmanager 创建的上下文管理器
with open_file("test.txt", "r") as f:
    content = f.read()
```

---

## contextlib 模块工具

**基本写法：使用 suppress 抑制异常**
`with suppress(<异常>): <语句>`

```python
# 使用 suppress 抑制特定异常
from contextlib import suppress

with suppress(FileNotFoundError):
    with open("nonexistent.txt", "r") as f:
        content = f.read()
```

---

**基本写法：使用 redirect_stdout 重定向输出**
`with redirect_stdout(<目标>): <语句>`

```python
# 使用 redirect_stdout 重定向标准输出
from contextlib import redirect_stdout
import io

output = io.StringIO()
with redirect_stdout(output):
    print("这会被重定向")
print(output.getvalue())
```

---

**基本写法：使用 redirect_stderr 重定向错误**
`with redirect_stderr(<目标>): <语句>`

```python
# 使用 redirect_stderr 重定向标准错误
from contextlib import redirect_stderr
import io

error_output = io.StringIO()
with redirect_stderr(error_output):
    import sys
    sys.stderr.write("错误信息")
```

---

**基本写法：使用 closing 自动关闭**
`with closing(<对象>) as <变量>: <语句>`

```python
# 使用 closing 自动关闭对象
from contextlib import closing
from urllib.request import urlopen

with closing(urlopen("http://example.com")) as response:
    content = response.read()
```

---

## 临时文件与目录

**基本写法：创建临时文件**
`tempfile.NamedTemporaryFile()`

```python
# 创建临时文件
import tempfile
with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
    f.write("临时内容")
    print(f.name)
```

---

**基本写法：创建临时目录**
`tempfile.TemporaryDirectory()`

```python
# 创建临时目录
import tempfile
with tempfile.TemporaryDirectory() as tmpdir:
    print(f"临时目录: {tmpdir}")
```

---

## 文件编码处理

**基本写法：指定编码打开文件**
`open(<文件路径>, <模式>, encoding=<编码>)`

```python
# 指定编码打开文件
with open("test.txt", "r", encoding="utf-8") as f:
    content = f.read()
```

---

**基本写法：处理编码错误**
`open(<文件路径>, <模式>, encoding=<编码>, errors=<策略>)`

```python
# 处理编码错误
with open("test.txt", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()
```

---

## 二进制文件处理

**基本写法：读取二进制文件**
`open(<文件路径>, "rb")`

```python
# 读取二进制文件
with open("image.png", "rb") as f:
    data = f.read()
```

---

**基本写法：写入二进制文件**
`open(<文件路径>, "wb")`

```python
# 写入二进制文件
with open("data.bin", "wb") as f:
    f.write(b"\x00\x01\x02\x03")
```

---

**基本写法：使用 pickle 序列化对象**
`pickle.dump(<对象>, <文件>)`

```python
# 使用 pickle 序列化对象到文件
import pickle
data = {"name": "Alice", "age": 30}
with open("data.pkl", "wb") as f:
    pickle.dump(data, f)
```

---

**基本写法：使用 pickle 反序列化**
`pickle.load(<文件>)`

```python
# 使用 pickle 从文件反序列化
import pickle
with open("data.pkl", "rb") as f:
    data = pickle.load(f)
```

---

## 文件路径处理

**基本写法：拼接路径**
`os.path.join(<路径1>, <路径2>)`

```python
# 拼接路径
import os
path = os.path.join("folder", "subfolder", "file.txt")
```

---

**基本写法：获取文件名**
`os.path.basename(<路径>)`

```python
# 获取文件名
import os
filename = os.path.basename("/path/to/file.txt")
```

---

**基本写法：获取目录名**
`os.path.dirname(<路径>)`

```python
# 获取目录名
import os
dirname = os.path.dirname("/path/to/file.txt")
```

---

**基本写法：分割文件名和扩展名**
`os.path.splitext(<路径>)`

```python
# 分割文件名和扩展名
import os
name, ext = os.path.splitext("file.txt")
```

---

**基本写法：使用 pathlib 拼接路径**
`Path(<路径>) / <子路径>`

```python
# 使用 pathlib 拼接路径
from pathlib import Path
path = Path("folder") / "subfolder" / "file.txt"
```

---

**基本写法：使用 pathlib 获取文件名**
`Path(<路径>).name`

```python
# 使用 pathlib 获取文件名
from pathlib import Path
filename = Path("/path/to/file.txt").name
```

---

**基本写法：使用 pathlib 获取文件后缀**
`Path(<路径>).suffix`

```python
# 使用 pathlib 获取文件后缀
from pathlib import Path
ext = Path("file.txt").suffix
```

---

## 文件遍历

**基本写法：使用 os.walk 遍历目录**
`for <根>, <目录>, <文件> in os.walk(<路径>): <语句>`

```python
# 使用 os.walk 遍历目录树
import os
for root, dirs, files in os.walk("."):
    for file in files:
        print(os.path.join(root, file))
```

---

**基本写法：使用 pathlib 遍历目录**
`Path(<路径>).rglob(<模式>)`

```python
# 使用 pathlib 递归遍历目录
from pathlib import Path
for file in Path(".").rglob("*.py"):
    print(file)
```

---

**基本写法：使用 glob 模块匹配文件**
`glob.glob(<模式>, recursive=True)`

```python
# 使用 glob 模块匹配文件
import glob
files = glob.glob("**/*.py", recursive=True)
```

---

## 异步文件IO

**换行写法：使用 aiofiles 异步读写**
`import aiofiles`
`async with aiofiles.open(<路径>, <模式>) as f: await f.read()`

```python
# 使用 aiofiles 异步读写文件
import asyncio
import aiofiles

async def read_file(path):
    async with aiofiles.open(path, "r") as f:
        content = await f.read()
    return content
```

---

**基本写法：异步写入文件**
`await f.write(<内容>)`

```python
# 异步写入文件
async def write_file(path, content):
    async with aiofiles.open(path, "w") as f:
        await f.write(content)
```
