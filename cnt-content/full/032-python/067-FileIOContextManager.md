---
order: 670
title: 文件 I/O 与上下文管理器
module: 'python'
category: 后端技术
difficulty: intermediate
description: 文件读写、路径操作、with 语句与上下文管理。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'python/064-OOP'
  - 'python/066-ExceptionHandling'
  - 'python/068-PythonProjectExampleWebCrawlerDataAnalysis'
  - 'python/069-PythonTheoryKnowledge'
prerequisites: []
---

## 1. 文件打开与关闭 (Open & Close)

### 1.1 `open()` 函数

`open()` 函数用于打开文件并返回文件对象。
**语法**: `open(file, mode='r', buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None)`
**常用参数**:

- `file`: 文件路径
- `mode`: 打开模式
- `encoding`: 编码方式，如 `'utf-8'`
- `errors`: 编码错误处理方式，如 `'strict'`, `'ignore'`, `'replace'`
  **常用模式**:
  | 模式      | 描述                               |
  | --------- | ---------------------------------- |
  | `r`       | 只读模式 (默认)                    |
  | `w`       | 写入模式，会覆盖已有内容           |
  | `a`       | 追加模式，在文件末尾添加内容       |
  | `x`       | 独占创建模式，文件存在则失败       |
  | `b`       | 二进制模式 (如 `rb`, `wb`)         |
  | `+`       | 更新模式 (如 `r+`, `w+`)，可读可写 |
  | **示例**: |

```python
 # 打开文件进行读取
 f = open("data.txt", "r", encoding="utf-8")
 # 打开文件进行写入
 f = open("output.txt", "w", encoding="utf-8")
 # 打开文件进行追加
 f = open("log.txt", "a", encoding="utf-8")
 # 打开二进制文件
 f = open("image.jpg", "rb")
```

### 1.2 `close()` 方法

文件使用完毕后，必须调用 `close()` 方法关闭文件，以释放系统资源。

```python
 f = open("data.txt", "r")
 try:
  content = f.read()
 finally:
  f.close() # 确保文件被关闭
```

### 1.3 自动关闭文件

使用 `with` 语句可以自动关闭文件，无需手动调用 `close()` 方法。

```python
 with open("data.txt", "r") as f:
  content = f.read()
 # 文件会自动关闭
```

## 2. 读写操作 (Read & Write)

### 2.1 读取操作

#### 2.1.1 `read()` 方法

读取整个文件内容，返回字符串。

```python
 with open("data.txt", "r") as f:
  content = f.read()
 print(content)
```

可以指定读取的字节数:

```python
 with open("data.txt", "r") as f:
  chunk = f.read(100) # 读取前 100 个字符
  print(chunk)
```

#### 2.1.2 `readline()` 方法

逐行读取文件，每次读取一行。

```python
 with open("data.txt", "r") as f:
  line = f.readline()
  while line:
  print(line.strip())
  line = f.readline()
```

#### 2.1.3 `readlines()` 方法

读取所有行，返回一个列表。

```python
 with open("data.txt", "r") as f:
  lines = f.readlines()
  for line in lines:
  print(line.strip())
```

#### 2.1.4 迭代文件对象

最推荐的读取方式，逐行读取，内存效率高。

```python
 with open("data.txt", "r") as f:
  for line in f:
  print(line.strip())
```

### 2.2 写入操作

#### 2.2.1 `write()` 方法

写入字符串到文件。

```python
 with open("output.txt", "w") as f:
  f.write("Hello, world!\n")
  f.write("This is a test.\n")
```

#### 2.2.2 `writelines()` 方法

写入字符串列表到文件。

```python
 lines = ["Line 1\n", "Line 2\n", "Line 3\n"]
 with open("output.txt", "w") as f:
  f.writelines(lines)
```

## 3. 上下文管理器 (Context Manager - `with`)

### 3.1 基本用法

上下文管理器用于管理资源，确保资源在使用后被正确释放。

```python
 # 使用 with 语句打开文件
 with open("data.txt", "r") as f:
  content = f.read()
 # 文件会自动关闭，即使发生异常
 # 处理多个文件
 with open("input.txt", "r") as infile, open("output.txt", "w") as outfile:
  content = infile.read()
  outfile.write(content)
 # 两个文件都会自动关闭
```

### 3.2 原理

上下文管理器实现了 `__enter__` 和 `__exit__` 方法：

- `__enter__()`: 进入上下文时调用，返回上下文对象
- `__exit__(exc_type, exc_val, exc_tb)`: 退出上下文时调用，处理异常

### 3.3 自定义上下文管理器

```python
 class FileManager:
  def __init__(self, file_path, mode):
  self.file_path = file_path
  self.mode = mode
  self.file = None
  def __enter__(self):
  self.file = open(self.file_path, self.mode)
  return self.file
  def __exit__(self, exc_type, exc_val, exc_tb):
  if self.file:
  self.file.close()
  # 返回 False 表示异常需要继续传播
  return False
 # 使用自定义上下文管理器
 with FileManager("data.txt", "r") as f:
  content = f.read()
  print(content)
```

### 3.4 使用 `contextmanager` 装饰器

```python
 from contextlib import contextmanager
 @contextmanager
 def file_manager(file_path, mode):
  """文件管理上下文管理器"""
  try:
  f = open(file_path, mode)
  yield f # 生成文件对象
  finally:
  f.close()
 # 使用
 with file_manager("data.txt", "r") as f:
  content = f.read()
  print(content)
```

## 4. 文件指针 (Positioning)

### 4.1 `tell()` 方法

返回当前文件指针的位置（字节数）。

```python
 with open("data.txt", "r") as f:
  print(f.tell()) # 输出: 0（文件开头）
  f.read(10)
  print(f.tell()) # 输出: 10（读取了 10 个字符）
```

### 4.2 `seek()` 方法

移动文件指针到指定位置。
**语法**: `seek(offset, whence=0)`

- `offset`: 偏移量
- `whence`: 参考位置，0 表示文件开头（默认），1 表示当前位置，2 表示文件末尾

```python
 with open("data.txt", "r") as f:
  # 移动到文件开头
  f.seek(0)
  # 移动到文件第 10 个字节
  f.seek(10)
  # 从当前位置向后移动 5 个字节
  current_pos = f.tell()
  f.seek(current_pos + 5, 0)
  # 移动到文件末尾
  f.seek(0, 2)
  print(f.tell()) # 输出: 文件长度
```

## 5. 二进制文件处理

### 5.1 读取二进制文件

```python
 with open("image.jpg", "rb") as f:
  data = f.read()
  print(f"File size: {len(data)} bytes")
```

### 5.2 写入二进制文件

```python
 with open("copy.jpg", "wb") as f:
  f.write(data)
```

### 5.3 示例：复制文件

```python
 def copy_file(source, destination):
  """复制文件"""
  with open(source, "rb") as src, open(destination, "wb") as dst:
  # 分块读取，避免一次性加载大文件到内存
  while True:
  chunk = src.read(4096) # 4KB 块
  if not chunk:
  break
  dst.write(chunk)
 # 使用
 copy_file("source.jpg", "destination.jpg")
```

## 6. 文件编码

### 6.1 编码设置

在打开文件时，应该显式指定编码方式，避免编码错误。

```python
 # 使用 UTF-8 编码
 with open("data.txt", "r", encoding="utf-8") as f:
  content = f.read()
 # 处理编码错误
 with open("data.txt", "r", encoding="utf-8", errors="replace") as f:
  content = f.read()
```

### 6.2 常见编码

| 编码      | 描述                          |
| --------- | ----------------------------- |
| `utf-8`   | 通用编码，支持所有字符        |
| `gbk`     | 中文编码，Windows 默认        |
| `ascii`   | 仅支持 ASCII 字符             |
| `latin-1` | ISO-8859-1，支持 Western 字符 |

### 6.3 编码转换

```python
 # 读取 GBK 编码文件
 with open("data_gbk.txt", "r", encoding="gbk") as f:
  content = f.read()
 # 写入 UTF-8 编码文件
 with open("data_utf8.txt", "w", encoding="utf-8") as f:
  f.write(content)
```

## 7. 大文件处理

### 7.1 逐行读取

```python
 def process_large_file(file_path):
  """处理大文件"""
  with open(file_path, "r") as f:
  for line in f:
  # 处理每一行
  process_line(line)
 # 使用
 process_large_file("large_file.txt")
```

### 7.2 分块读取

```python
 def process_large_binary_file(file_path):
  """处理大二进制文件"""
  with open(file_path, "rb") as f:
  while True:
  chunk = f.read(1024 * 1024) # 1MB 块
  if not chunk:
  break
  # 处理每一块
  process_chunk(chunk)
 # 使用
 process_large_binary_file("large_file.bin")
```

### 7.3 示例：统计大文件中的单词数

```python
 def count_words(file_path):
  """统计文件中的单词数"""
  word_count = 0
  with open(file_path, "r") as f:
  for line in f:
  words = line.split()
  word_count += len(words)
  return word_count
 # 使用
 print(f"Word count: {count_words('large_file.txt')}")
```

## 8. 文件系统操作

### 8.1 路径操作

```python
 import os
 # 获取当前目录
 current_dir = os.getcwd()
 print(f"Current directory: {current_dir}")
 # 路径拼接
 file_path = os.path.join(current_dir, "data.txt")
 print(f"File path: {file_path}")
 # 检查文件是否存在
 if os.path.exists(file_path):
  print("File exists")
 else:
  print("File does not exist")
 # 检查是否是文件
 if os.path.isfile(file_path):
  print("It's a file")
 # 检查是否是目录
 if os.path.isdir(current_dir):
  print("It's a directory")
 # 获取文件大小
 if os.path.exists(file_path):
  size = os.path.getsize(file_path)
  print(f"File size: {size} bytes")
 # 获取文件修改时间
 if os.path.exists(file_path):
  mtime = os.path.getmtime(file_path)
  print(f"Last modified: {mtime}")
```

### 8.2 文件和目录操作

```python
 import os
 import shutil
 # 创建目录
 os.makedirs("new_directory", exist_ok=True)
 # 重命名文件
 if os.path.exists("old_name.txt"):
  os.rename("old_name.txt", "new_name.txt")
 # 删除文件
 if os.path.exists("file_to_delete.txt"):
  os.remove("file_to_delete.txt")
 # 复制文件
 if os.path.exists("source.txt"):
  shutil.copy("source.txt", "destination.txt")
 # 复制目录
 if os.path.exists("source_dir"):
  shutil.copytree("source_dir", "destination_dir", dirs_exist_ok=True)
 # 删除目录
 if os.path.exists("directory_to_delete"):
  shutil.rmtree("directory_to_delete")
```

## 9. 实际应用示例

### 9.1 文本文件处理

```python
 def read_and_process_text(file_path):
  """读取并处理文本文件"""
  try:
  with open(file_path, "r", encoding="utf-8") as f:
  lines = f.readlines()
  # 处理内容
  processed_lines = []
  for line in lines:
  # 去除首尾空白
  line = line.strip()
  # 跳过空行
  if not line:
  continue
  # 处理行
  processed_lines.append(line.upper())
  # 写入处理后的内容
  with open("processed_" + os.path.basename(file_path), "w", encoding="utf-8") as f:
  f.write("\n".join(processed_lines))
  print(f"Processing completed. Output saved to processed_{os.path.basename(file_path)}")
  except Exception as e:
  print(f"Error: {e}")
 # 使用
 read_and_process_text("input.txt")
```

### 9.2 CSV 文件处理

```python
 import csv
 def read_csv(file_path):
  """读取 CSV 文件"""
  with open(file_path, "r", encoding="utf-8", newline="") as f:
  reader = csv.reader(f)
  for row in reader:
  print(row)
 def write_csv(file_path, data):
  """写入 CSV 文件"""
  with open(file_path, "w", encoding="utf-8", newline="") as f:
  writer = csv.writer(f)
  writer.writerows(data)
 # 使用
 read_csv("data.csv")
 # 写入数据
 data = [
  ["Name", "Age", "City"],
  ["Alice", 30, "New York"],
  ["Bob", 25, "London"],
  ["Charlie", 35, "Paris"]
 ]
 write_csv("output.csv", data)
```

### 9.3 JSON 文件处理

```python
 import json
 def read_json(file_path):
  """读取 JSON 文件"""
  with open(file_path, "r", encoding="utf-8") as f:
  data = json.load(f)
  return data
 def write_json(file_path, data):
  """写入 JSON 文件"""
  with open(file_path, "w", encoding="utf-8") as f:
  json.dump(data, f, indent=2, ensure_ascii=False)
 # 使用
 # 读取 JSON
 data = read_json("data.json")
 print(data)
 # 写入 JSON
 new_data = {
  "name": "Alice",
  "age": 30,
  "city": "New York",
  "hobbies": ["reading", "traveling", "coding"]
 }
 write_json("output.json", new_data)
```

### 9.4 日志文件处理

```python
 def log_message(message, log_file="app.log"):
  """记录日志"""
  import datetime
  timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
  log_entry = f"[{timestamp}] {message}\n"
  with open(log_file, "a", encoding="utf-8") as f:
  f.write(log_entry)
 # 使用
 log_message("Application started")
 log_message("User logged in: Alice")
 log_message("Error: Database connection failed")
```

## 10. 最佳实践

### 10.1 文件操作最佳实践

- **总是使用 `with` 语句**：确保文件自动关闭
- **显式指定编码**：避免编码错误
- **处理异常**：捕获并处理可能的文件操作异常
- **分块处理大文件**：避免内存溢出
- **使用相对路径**：提高代码可移植性
- **关闭文件**：即使使用 `with` 语句，也要确保文件被正确关闭
- **清理资源**：在 finally 块中清理资源

### 10.2 性能优化

- **使用迭代器**：逐行读取文件，减少内存使用
- **分块读取**：处理大文件时使用分块读取
- **选择合适的打开模式**：根据需要选择读写模式
- **使用缓冲**：适当调整缓冲大小，提高读写性能
- **避免频繁 I/O**：批量读写，减少 I/O 操作次数

### 10.3 安全性

- **验证文件路径**：避免路径遍历攻击
- **检查文件权限**：确保有足够的权限读写文件
- **处理异常**：避免因文件操作失败导致程序崩溃
- **清理临时文件**：使用后删除临时文件
- **加密敏感数据**：对于敏感文件，考虑加密存储

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
