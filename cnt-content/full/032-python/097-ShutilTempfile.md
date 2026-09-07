---
order: 970
title: Python shutil 与 tempfile
module: 'python'
category: 后端技术
difficulty: beginner
description: Python shutil 与 tempfile 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## shutil 文件操作

**基本写法：复制文件**
`shutil.copy(<源>, <目标>)`
```python
# 复制文件（保留权限）
import shutil

shutil.copy("src.txt", "dst.txt")
shutil.copy2("src.txt", "dst.txt")  # 保留元数据
```

**基本写法：复制文件内容**
`shutil.copyfile(<源>, <目标>)`
```python
# 仅复制内容，不保留权限
shutil.copyfile("src.txt", "dst.txt")
```

**基本写法：复制目录树**
`shutil.copytree(<源目录>, <目标目录>)`
```python
# 递归复制目录
shutil.copytree("src_dir", "dst_dir")
```

**基本写法：复制目录（忽略）**
`shutil.copytree(<源>, <目标>, ignore=shutil.ignore_patterns(*<模式>))`
```python
# 复制时忽略指定模式
shutil.copytree("src", "dst", ignore=shutil.ignore_patterns("*.tmp", "*.log"))
```

**基本写法：删除目录树**
`shutil.rmtree(<目录>)`
```python
# 递归删除目录
shutil.rmtree("dst_dir")
```

**基本写法：移动文件**
`shutil.move(<源>, <目标>)`
```python
# 移动文件或目录
shutil.move("src.txt", "subdir/dst.txt")
```

---

## shutil 元数据与权限

**基本写法：复制模式**
`shutil.copymode(<源>, <目标>)`
```python
# 仅复制权限位
shutil.copymode("src.txt", "dst.txt")
```

**基本写法：复制元数据**
`shutil.copystat(<源>, <目标>)`
```python
# 复制权限、时间、扩展属性
shutil.copystat("src.txt", "dst.txt")
```

**基本写法：chown 改属主**
`shutil.chown(<路径>, user=<用户>, group=<组>)`
```python
# 修改所有者（Unix）
shutil.chown("file", user="alice", group="staff")
```

---

## shutil 压缩归档

**基本写法：创建归档**
`shutil.make_archive(<基础名>, <格式>, <根目录>)`
```python
# 创建 zip/tar 归档
shutil.make_archive("backup", "zip", "src_dir")
shutil.make_archive("backup", "gztar", "src_dir")
```

**基本写法：解包归档**
`shutil.unpack_archive(<文件>, <目录>)`
```python
# 解压归档
shutil.unpack_archive("backup.zip", "output")
```

**基本写法：查看支持的格式**
`shutil.get_archive_formats()`
```python
# 列出支持的归档格式
print(shutil.get_archive_formats())
```

---

## shutil 磁盘信息

**基本写法：磁盘使用情况**
`shutil.disk_usage(<路径>)`
```python
# 获取磁盘使用情况
usage = shutil.disk_usage("/")
print(usage.total, usage.used, usage.free)
```

**基本写法：获取终端大小**
`shutil.get_terminal_size()`
```python
# 获取终端列数行数
size = shutil.get_terminal_size()
print(size.columns, size.lines)
```

**基本写法：which 查找可执行文件**
`shutil.which(<命令>)`
```python
# 查找命令路径
print(shutil.which("python"))
```

---

## tempfile 临时文件

**基本写法：临时文件**
`tempfile.TemporaryFile()`
```python
# 创建临时文件，关闭自动删除
import tempfile

with tempfile.TemporaryFile() as f:
    f.write(b"hello")
    f.seek(0)
    print(f.read())
```

**基本写法：命名临时文件**
`tempfile.NamedTemporaryFile()`
```python
# 可访问文件名的临时文件
with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
    f.write(b"hello")
    print(f.name)
```

**基本写法：临时目录**
`tempfile.TemporaryDirectory()`
```python
# 临时目录，退出自动删除
with tempfile.TemporaryDirectory() as d:
    print(d)
    # 在 d 下创建文件
```

**基本写法：mkstemp 创建临时文件**
`tempfile.mkstemp(suffix=<后缀>, prefix=<前缀>, dir=<目录>)`
```python
# 低层创建，返回 fd 与路径
fd, path = tempfile.mkstemp(suffix=".log")
os.close(fd)
```

**基本写法：mkdtemp 创建临时目录**
`tempfile.mkdtemp(prefix=<前缀>)`
```python
# 创建临时目录（需手动删除）
d = tempfile.mkdtemp(prefix="myapp_")
```

**基本写法：gettempdir 临时目录**
`tempfile.gettempdir()`
```python
# 获取系统临时目录
print(tempfile.gettempdir())
```

**基本写法：gettempdirb 字节路径**
`tempfile.gettempdirb()`
```python
# 字节形式临时目录
print(tempfile.gettempdirb())
```

---

## fileinput 文件输入

**基本写法：迭代多文件**
`fileinput.input(<文件列表>)`
```python
# 串联读取多个文件
import fileinput

for line in fileinput.input(["a.txt", "b.txt"]):
    print(fileinput.filename(), fileinput.lineno(), line.rstrip())
```

**基本写法：原地编辑**
`fileinput.input(<文件>, inplace=True)`
```python
# 原地修改文件（stdout 重定向到文件）
for line in fileinput.input("data.txt", inplace=True):
    print(line.rstrip().upper())
```

**基本写法：备份数据**
`fileinput.input(<文件>, backup=".bak")`
```python
# 编辑前创建备份
for line in fileinput.input("data.txt", backup=".bak", inplace=True):
    print(line.rstrip())
```

**基本写法：files 与 filelineno**
`fileinput.filename()` | `fileinput.filelineno()`
```python
# 当前文件名与文件内行号
for line in fileinput.input(["a.txt", "b.txt"]):
    print(fileinput.filename(), fileinput.filelineno())
```

**基本写法：isfirstline 判断首行**
`fileinput.isfirstline()`
```python
# 判断是否为当前文件首行
for line in fileinput.input(files):
    if fileinput.isfirstline():
        print("新文件:", fileinput.filename())
```

---

## fnmatch 文件名匹配

**基本写法：匹配文件名**
`fnmatch.fnmatch(<文件名>, <模式>)`
```python
# shell 风格通配符匹配
import fnmatch

print(fnmatch.fnmatch("data.txt", "*.txt"))
print(fnmatch.fnmatch("file.PY", "*.py"))  # 大小写不敏感（Windows）
```

**基本写法：大小写敏感**
`fnmatch.fnmatchcase(<文件名>, <模式>)`
```python
# 严格大小写匹配
print(fnmatch.fnmatchcase("file.PY", "*.py"))  # False
```

**基本写法：filter 过滤**
`fnmatch.filter(<名称列表>, <模式>)`
```python
# 过滤匹配的名称
files = ["a.txt", "b.py", "c.txt"]
print(fnmatch.filter(files, "*.txt"))
```

**基本写法：translate 转正则**
`fnmatch.translate(<模式>)`
```python
# 通配符转正则表达式
print(fnmatch.translate("*.txt"))
```
