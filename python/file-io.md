# 文件 I/O 与上下文管理器 (File I/O & Context Manager)
 False
 False> @Version: v3.5.0
 False
 False> @Author: Anonymous
 False> @Category: Python Basics
 False> @Description: 文件读写模式、二进制处理、编码及 Context Manager (With)。 | File modes, binary handling, encoding, and Context Manager.
 False
 False---
 False
 False## 目录
 False
 False1. [文件打开与关闭](#文件打开与关闭)
 False2. [读写操作](#读写操作)
 False3. [上下文管理器](#上下文管理器)
 False4. [文件指针](#文件指针)
 False5. [二进制文件处理](#二进制文件处理)
 False6. [文件编码](#文件编码)
 False7. [大文件处理](#大文件处理)
 False8. [文件系统操作](#文件系统操作)
 False9. [实际应用示例](#实际应用示例)
 False10. [最佳实践](#最佳实践)
 False
 False---
 False
 False## 1. 文件打开与关闭 (Open & Close)
 False
 False### 1.1 `open()` 函数
 False
 False`open()` 函数用于打开文件并返回文件对象。
 False
 False**语法**: `open(file, mode='r', buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None)`
 False
 False**常用参数**:
 False
 False- `file`: 文件路径
 False- `mode`: 打开模式
 False- `encoding`: 编码方式，如 `'utf-8'`
 False- `errors`: 编码错误处理方式，如 `'strict'`, `'ignore'`, `'replace'`
 False
 False**常用模式**:
 False
 False| 模式 | 描述 |
 False|------|------|
 False| `r` | 只读模式 (默认) |
 False| `w` | 写入模式，会覆盖已有内容 |
 False| `a` | 追加模式，在文件末尾添加内容 |
 False| `x` | 独占创建模式，文件存在则失败 |
 False| `b` | 二进制模式 (如 `rb`, `wb`) |
 False| `+` | 更新模式 (如 `r+`, `w+`)，可读可写 |
 False
 False**示例**:
 False
```python
 True# 打开文件进行读取
 Truef = open("data.txt", "r", encoding="utf-8")
 True
 True# 打开文件进行写入
 Truef = open("output.txt", "w", encoding="utf-8")
 True
 True# 打开文件进行追加
 Truef = open("log.txt", "a", encoding="utf-8")
 True
 True# 打开二进制文件
 Truef = open("image.jpg", "rb")
 True```

 False### 1.2 `close()` 方法
 False
 False文件使用完毕后，必须调用 `close()` 方法关闭文件，以释放系统资源。
 False
```python
 Truef = open("data.txt", "r")
 Truetry:
 True content = f.read()
 Truefinally:
 True f.close() # 确保文件被关闭
 True```

 False### 1.3 自动关闭文件
 False
 False使用 `with` 语句可以自动关闭文件，无需手动调用 `close()` 方法。
 False
```python
 Truewith open("data.txt", "r") as f:
 True content = f.read()
 True# 文件会自动关闭
 True```

 False## 2. 读写操作 (Read & Write)
 False
 False### 2.1 读取操作
 False
 False#### 2.1.1 `read()` 方法
 False
 False读取整个文件内容，返回字符串。
 False
```python
 Truewith open("data.txt", "r") as f:
 True content = f.read()
 Trueprint(content)
 True```

 False可以指定读取的字节数:
 False
```python
 Truewith open("data.txt", "r") as f:
 True chunk = f.read(100) # 读取前 100 个字符
 True print(chunk)
 True```

 False#### 2.1.2 `readline()` 方法
 False
 False逐行读取文件，每次读取一行。
 False
```python
 Truewith open("data.txt", "r") as f:
 True line = f.readline()
 True while line:
 True print(line.strip())
 True line = f.readline()
 True```

 False#### 2.1.3 `readlines()` 方法
 False
 False读取所有行，返回一个列表。
 False
```python
 Truewith open("data.txt", "r") as f:
 True lines = f.readlines()
 True for line in lines:
 True print(line.strip())
 True```

 False#### 2.1.4 迭代文件对象
 False
 False最推荐的读取方式，逐行读取，内存效率高。
 False
```python
 Truewith open("data.txt", "r") as f:
 True for line in f:
 True print(line.strip())
 True```

 False### 2.2 写入操作
 False
 False#### 2.2.1 `write()` 方法
 False
 False写入字符串到文件。
 False
```python
 Truewith open("output.txt", "w") as f:
 True f.write("Hello, world!\n")
 True f.write("This is a test.\n")
 True```

 False#### 2.2.2 `writelines()` 方法
 False
 False写入字符串列表到文件。
 False
```python
 Truelines = ["Line 1\n", "Line 2\n", "Line 3\n"]
 Truewith open("output.txt", "w") as f:
 True f.writelines(lines)
 True```

 False## 3. 上下文管理器 (Context Manager - `with`)
 False
 False### 3.1 基本用法
 False
 False上下文管理器用于管理资源，确保资源在使用后被正确释放。
 False
```python
 True# 使用 with 语句打开文件
 Truewith open("data.txt", "r") as f:
 True content = f.read()
 True# 文件会自动关闭，即使发生异常
 True
 True# 处理多个文件
 Truewith open("input.txt", "r") as infile, open("output.txt", "w") as outfile:
 True content = infile.read()
 True outfile.write(content)
 True# 两个文件都会自动关闭
 True```

 False### 3.2 原理
 False
 False上下文管理器实现了 `__enter__` 和 `__exit__` 方法：
 False
 False- `__enter__()`: 进入上下文时调用，返回上下文对象
 False- `__exit__(exc_type, exc_val, exc_tb)`: 退出上下文时调用，处理异常
 False
 False### 3.3 自定义上下文管理器
 False
```python
 Trueclass FileManager:
 True def __init__(self, file_path, mode):
 True self.file_path = file_path
 True self.mode = mode
 True self.file = None
 True 
 True def __enter__(self):
 True self.file = open(self.file_path, self.mode)
 True return self.file
 True 
 True def __exit__(self, exc_type, exc_val, exc_tb):
 True if self.file:
 True self.file.close()
 True # 返回 False 表示异常需要继续传播
 True return False
 True
 True# 使用自定义上下文管理器
 Truewith FileManager("data.txt", "r") as f:
 True content = f.read()
 True print(content)
 True```

 False### 3.4 使用 `contextmanager` 装饰器
 False
```python
 Truefrom contextlib import contextmanager
 True
 True@contextmanager
 Truedef file_manager(file_path, mode):
 True """文件管理上下文管理器"""
 True try:
 True f = open(file_path, mode)
 True yield f # 生成文件对象
 True finally:
 True f.close()
 True
 True# 使用
 Truewith file_manager("data.txt", "r") as f:
 True content = f.read()
 True print(content)
 True```

 False## 4. 文件指针 (Positioning)
 False
 False### 4.1 `tell()` 方法
 False
 False返回当前文件指针的位置（字节数）。
 False
```python
 Truewith open("data.txt", "r") as f:
 True print(f.tell()) # 输出: 0（文件开头）
 True f.read(10)
 True print(f.tell()) # 输出: 10（读取了 10 个字符）
 True```

 False### 4.2 `seek()` 方法
 False
 False移动文件指针到指定位置。
 False
 False**语法**: `seek(offset, whence=0)`
 False
 False- `offset`: 偏移量
 False- `whence`: 参考位置，0 表示文件开头（默认），1 表示当前位置，2 表示文件末尾
 False
```python
 Truewith open("data.txt", "r") as f:
 True # 移动到文件开头
 True f.seek(0)
 True 
 True # 移动到文件第 10 个字节
 True f.seek(10)
 True 
 True # 从当前位置向后移动 5 个字节
 True current_pos = f.tell()
 True f.seek(current_pos + 5, 0)
 True 
 True # 移动到文件末尾
 True f.seek(0, 2)
 True print(f.tell()) # 输出: 文件长度
 True```

 False## 5. 二进制文件处理
 False
 False### 5.1 读取二进制文件
 False
```python
 Truewith open("image.jpg", "rb") as f:
 True data = f.read()
 True print(f"File size: {len(data)} bytes")
 True```

 False### 5.2 写入二进制文件
 False
```python
 Truewith open("copy.jpg", "wb") as f:
 True f.write(data)
 True```

 False### 5.3 示例：复制文件
 False
```python
 Truedef copy_file(source, destination):
 True """复制文件"""
 True with open(source, "rb") as src, open(destination, "wb") as dst:
 True # 分块读取，避免一次性加载大文件到内存
 True while True:
 True chunk = src.read(4096) # 4KB 块
 True if not chunk:
 True break
 True dst.write(chunk)
 True
 True# 使用
 Truecopy_file("source.jpg", "destination.jpg")
 True```

 False## 6. 文件编码
 False
 False### 6.1 编码设置
 False
 False在打开文件时，应该显式指定编码方式，避免编码错误。
 False
```python
 True# 使用 UTF-8 编码
 Truewith open("data.txt", "r", encoding="utf-8") as f:
 True content = f.read()
 True
 True# 处理编码错误
 Truewith open("data.txt", "r", encoding="utf-8", errors="replace") as f:
 True content = f.read()
 True```

 False### 6.2 常见编码
 False
 False| 编码 | 描述 |
 False|------|------|
 False| `utf-8` | 通用编码，支持所有字符 |
 False| `gbk` | 中文编码，Windows 默认 |
 False| `ascii` | 仅支持 ASCII 字符 |
 False| `latin-1` | ISO-8859-1，支持 Western 字符 |
 False
 False### 6.3 编码转换
 False
```python
 True# 读取 GBK 编码文件
 Truewith open("data_gbk.txt", "r", encoding="gbk") as f:
 True content = f.read()
 True
 True# 写入 UTF-8 编码文件
 Truewith open("data_utf8.txt", "w", encoding="utf-8") as f:
 True f.write(content)
 True```

 False## 7. 大文件处理
 False
 False### 7.1 逐行读取
 False
```python
 Truedef process_large_file(file_path):
 True """处理大文件"""
 True with open(file_path, "r") as f:
 True for line in f:
 True # 处理每一行
 True process_line(line)
 True
 True# 使用
 Trueprocess_large_file("large_file.txt")
 True```

 False### 7.2 分块读取
 False
```python
 Truedef process_large_binary_file(file_path):
 True """处理大二进制文件"""
 True with open(file_path, "rb") as f:
 True while True:
 True chunk = f.read(1024 * 1024) # 1MB 块
 True if not chunk:
 True break
 True # 处理每一块
 True process_chunk(chunk)
 True
 True# 使用
 Trueprocess_large_binary_file("large_file.bin")
 True```

 False### 7.3 示例：统计大文件中的单词数
 False
```python
 Truedef count_words(file_path):
 True """统计文件中的单词数"""
 True word_count = 0
 True with open(file_path, "r") as f:
 True for line in f:
 True words = line.split()
 True word_count += len(words)
 True return word_count
 True
 True# 使用
 Trueprint(f"Word count: {count_words('large_file.txt')}")
 True```

 False## 8. 文件系统操作
 False
 False### 8.1 路径操作
 False
```python
 Trueimport os
 True
 True# 获取当前目录
 Truecurrent_dir = os.getcwd()
 Trueprint(f"Current directory: {current_dir}")
 True
 True# 路径拼接
 Truefile_path = os.path.join(current_dir, "data.txt")
 Trueprint(f"File path: {file_path}")
 True
 True# 检查文件是否存在
 Trueif os.path.exists(file_path):
 True print("File exists")
 Trueelse:
 True print("File does not exist")
 True
 True# 检查是否是文件
 Trueif os.path.isfile(file_path):
 True print("It's a file")
 True
 True# 检查是否是目录
 Trueif os.path.isdir(current_dir):
 True print("It's a directory")
 True
 True# 获取文件大小
 Trueif os.path.exists(file_path):
 True size = os.path.getsize(file_path)
 True print(f"File size: {size} bytes")
 True
 True# 获取文件修改时间
 Trueif os.path.exists(file_path):
 True mtime = os.path.getmtime(file_path)
 True print(f"Last modified: {mtime}")
 True```

 False### 8.2 文件和目录操作
 False
```python
 Trueimport os
 Trueimport shutil
 True
 True# 创建目录
 Trueos.makedirs("new_directory", exist_ok=True)
 True
 True# 重命名文件
 Trueif os.path.exists("old_name.txt"):
 True os.rename("old_name.txt", "new_name.txt")
 True
 True# 删除文件
 Trueif os.path.exists("file_to_delete.txt"):
 True os.remove("file_to_delete.txt")
 True
 True# 复制文件
 Trueif os.path.exists("source.txt"):
 True shutil.copy("source.txt", "destination.txt")
 True
 True# 复制目录
 Trueif os.path.exists("source_dir"):
 True shutil.copytree("source_dir", "destination_dir", dirs_exist_ok=True)
 True
 True# 删除目录
 Trueif os.path.exists("directory_to_delete"):
 True shutil.rmtree("directory_to_delete")
 True```

 False## 9. 实际应用示例
 False
 False### 9.1 文本文件处理
 False
```python
 Truedef read_and_process_text(file_path):
 True """读取并处理文本文件"""
 True try:
 True with open(file_path, "r", encoding="utf-8") as f:
 True lines = f.readlines()
 True 
 True # 处理内容
 True processed_lines = []
 True for line in lines:
 True # 去除首尾空白
 True line = line.strip()
 True # 跳过空行
 True if not line:
 True continue
 True # 处理行
 True processed_lines.append(line.upper())
 True 
 True # 写入处理后的内容
 True with open("processed_" + os.path.basename(file_path), "w", encoding="utf-8") as f:
 True f.write("\n".join(processed_lines))
 True 
 True print(f"Processing completed. Output saved to processed_{os.path.basename(file_path)}")
 True except Exception as e:
 True print(f"Error: {e}")
 True
 True# 使用
 Trueread_and_process_text("input.txt")
 True```

 False### 9.2 CSV 文件处理
 False
```python
 Trueimport csv
 True
 Truedef read_csv(file_path):
 True """读取 CSV 文件"""
 True with open(file_path, "r", encoding="utf-8", newline="") as f:
 True reader = csv.reader(f)
 True for row in reader:
 True print(row)
 True
 Truedef write_csv(file_path, data):
 True """写入 CSV 文件"""
 True with open(file_path, "w", encoding="utf-8", newline="") as f:
 True writer = csv.writer(f)
 True writer.writerows(data)
 True
 True# 使用
 Trueread_csv("data.csv")
 True
 True# 写入数据
 Truedata = [
 True ["Name", "Age", "City"],
 True ["Alice", 30, "New York"],
 True ["Bob", 25, "London"],
 True ["Charlie", 35, "Paris"]
 True]
 Truewrite_csv("output.csv", data)
 True```

 False### 9.3 JSON 文件处理
 False
```python
 Trueimport json
 True
 Truedef read_json(file_path):
 True """读取 JSON 文件"""
 True with open(file_path, "r", encoding="utf-8") as f:
 True data = json.load(f)
 True return data
 True
 Truedef write_json(file_path, data):
 True """写入 JSON 文件"""
 True with open(file_path, "w", encoding="utf-8") as f:
 True json.dump(data, f, indent=2, ensure_ascii=False)
 True
 True# 使用
 True# 读取 JSON
 Truedata = read_json("data.json")
 Trueprint(data)
 True
 True# 写入 JSON
 Truenew_data = {
 True "name": "Alice",
 True "age": 30,
 True "city": "New York",
 True "hobbies": ["reading", "traveling", "coding"]
 True}
 Truewrite_json("output.json", new_data)
 True```

 False### 9.4 日志文件处理
 False
```python
 Truedef log_message(message, log_file="app.log"):
 True """记录日志"""
 True import datetime
 True timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
 True log_entry = f"[{timestamp}] {message}\n"
 True 
 True with open(log_file, "a", encoding="utf-8") as f:
 True f.write(log_entry)
 True
 True# 使用
 Truelog_message("Application started")
 Truelog_message("User logged in: Alice")
 Truelog_message("Error: Database connection failed")
 True```

 False## 10. 最佳实践
 False
 False### 10.1 文件操作最佳实践
 False
 False- **总是使用 `with` 语句**：确保文件自动关闭
 False- **显式指定编码**：避免编码错误
 False- **处理异常**：捕获并处理可能的文件操作异常
 False- **分块处理大文件**：避免内存溢出
 False- **使用相对路径**：提高代码可移植性
 False- **关闭文件**：即使使用 `with` 语句，也要确保文件被正确关闭
 False- **清理资源**：在 finally 块中清理资源
 False
 False### 10.2 性能优化
 False
 False- **使用迭代器**：逐行读取文件，减少内存使用
 False- **分块读取**：处理大文件时使用分块读取
 False- **选择合适的打开模式**：根据需要选择读写模式
 False- **使用缓冲**：适当调整缓冲大小，提高读写性能
 False- **避免频繁 I/O**：批量读写，减少 I/O 操作次数
 False
 False### 10.3 安全性
 False
 False- **验证文件路径**：避免路径遍历攻击
 False- **检查文件权限**：确保有足够的权限读写文件
 False- **处理异常**：避免因文件操作失败导致程序崩溃
 False- **清理临时文件**：使用后删除临时文件
 False- **加密敏感数据**：对于敏感文件，考虑加密存储
 False
 False---
 False
 False### 更新日志 (Changelog)
 False
 False- 2026-04-05: 细化 Pythonic 文件操作与 Context Manager 细节。
 False- 2026-04-05: 扩写内容，增加详细的文件打开与关闭、读写操作、上下文管理器、文件指针、二进制文件处理、文件编码、大文件处理、文件系统操作和实际示例等内容。

## 延伸阅读

- [[data-analysis/data-cleaning|数据清洗]]
 False