---
order: 190
title: Python pathlib 路径操作
module: 'python'
category: 后端技术
difficulty: beginner
description: Python pathlib 路径操作 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 路径创建

**基本写法：创建路径对象**
`Path(<路径字符串>)`
```python
# 创建 Path 对象
from pathlib import Path
p = Path("/usr/local/bin")
```

**基本写法：当前目录**
`Path.cwd()`
```python
# 获取当前工作目录
cwd = Path.cwd()
```

**基本写法：用户主目录**
`Path.home()`
```python
# 获取用户主目录
home = Path.home()
```

**基本写法：路径拼接**
`Path(<父路径>) / <子路径>`
```python
# 使用 / 运算符拼接路径
config = Path("/etc") / "nginx" / "nginx.conf"
```

**基本写法：joinpath 多级拼接**
`<路径>.joinpath(<子路径1>, <子路径2>)`
```python
# 拼接多个路径段
p = Path("/var").joinpath("log", "app.log")
```

---

## 路径属性

**基本写法：获取文件名**
`<路径>.name`
```python
# 返回最后一级路径名
p = Path("/a/b/c.txt")
print(p.name)  # c.txt
```

**基本写法：获取文件名（不含扩展名）**
`<路径>.stem`
```python
# 返回不含扩展名的文件名
p = Path("archive.tar.gz")
print(p.stem)  # archive.tar
```

**基本写法：获取扩展名**
`<路径>.suffix`
```python
# 返回最后一个扩展名
p = Path("file.tar.gz")
print(p.suffix)  # .gz
```

**基本写法：获取所有扩展名**
`<路径>.suffixes`
```python
# 返回所有扩展名列表
p = Path("file.tar.gz")
print(p.suffixes)  # ['.tar', '.gz']
```

**基本写法：获取父目录**
`<路径>.parent`
```python
# 返回上一级目录
p = Path("/a/b/c.txt")
print(p.parent)  # /a/b
```

**基本写法：获取所有父目录**
`<路径>.parents`
```python
# 返回所有上级目录的可迭代对象
p = Path("/a/b/c.txt")
for parent in p.parents:
    print(parent)
```

**基本写法：获取绝对路径**
`<路径>.resolve()`
```python
# 返回解析后的绝对路径
p = Path("./config").resolve()
```

**基本写法：获取路径各部分**
`<路径>.parts`
```python
# 返回路径各段组成的元组
p = Path("/usr/local/bin")
print(p.parts)  # ('/', 'usr', 'local', 'bin')
```

---

## 路径判断

**基本写法：判断文件是否存在**
`<路径>.exists()`
```python
# 检查路径是否存在
if Path("file.txt").exists():
    print("存在")
```

**基本写法：判断是否为文件**
`<路径>.is_file()`
```python
# 检查是否为普通文件
Path("file.txt").is_file()
```

**基本写法：判断是否为目录**
`<路径>.is_dir()`
```python
# 检查是否为目录
Path("/usr").is_dir()
```

**基本写法：判断是否为绝对路径**
`<路径>.is_absolute()`
```python
# 检查是否为绝对路径
Path("/usr").is_absolute()  # True
Path("usr").is_absolute()   # False
```

---

## 文件读写

**基本写法：读取文本文件**
`<路径>.read_text([encoding=<编码>])`
```python
# 一次性读取整个文本文件
content = Path("file.txt").read_text(encoding="utf-8")
```

**基本写法：写入文本文件**
`<路径>.write_text(<内容>, [encoding=<编码>])`
```python
# 一次性写入文本
Path("output.txt").write_text("hello", encoding="utf-8")
```

**基本写法：读取二进制文件**
`<路径>.read_bytes()`
```python
# 读取二进制内容
data = Path("image.png").read_bytes()
```

**基本写法：写入二进制文件**
`<路径>.write_bytes(<数据>)`
```python
# 写入二进制数据
Path("data.bin").write_bytes(b"\x00\x01")
```

**换行写法：打开文件上下文管理**
`with <路径>.open([mode], [encoding]) as <变量>:`
```python
# 使用 open 方法逐行读取
with Path("file.txt").open("r", encoding="utf-8") as f:
    for line in f:
        print(line.strip())
```

---

## 目录操作

**基本写法：创建目录**
`<路径>.mkdir([parents=True], [exist_ok=True])`
```python
# 递归创建目录，已存在不报错
Path("a/b/c").mkdir(parents=True, exist_ok=True)
```

**基本写法：删除空目录**
`<路径>.rmdir()`
```python
# 删除空目录
Path("empty_dir").rmdir()
```

**基本写法：删除文件**
`<路径>.unlink()`
```python
# 删除单个文件
Path("file.txt").unlink()
```

**基本写法：删除文件（不存在不报错）**
`<路径>.unlink(missing_ok=True)`
```python
# Python 3.8+ 文件不存在时不抛出异常
Path("file.txt").unlink(missing_ok=True)
```

**基本写法：重命名或移动**
`<路径>.rename(<目标路径>)`
```python
# 移动文件或重命名
Path("old.txt").rename("new.txt")
```

**基本写法：Python 3.13+ replace 兼容性**
`<路径>.replace(<目标路径>)`
```python
# 覆盖目标路径并替换
Path("temp.txt").replace("final.txt")
```

---

## 遍历目录

**基本写法：列出目录内容**
`<路径>.iterdir()`
```python
# 遍历目录下的直接子项
for item in Path(".").iterdir():
    print(item.name)
```

**基本写法：glob 模式匹配**
`<路径>.glob(<模式>)`
```python
# 递归匹配文件
for p in Path(".").glob("**/*.py"):
    print(p)
```

**基本写法：rglob 递归匹配**
`<路径>.rglob(<模式>)`
```python
# 递归搜索所有子目录
for p in Path(".").rglob("*.py"):
    print(p)
```

**基本写法：Python 3.12+ 模式参数**
`<路径>.glob(<模式>, case_sensitive=<布尔>)`
```python
# Python 3.12+ 支持大小写敏感控制
for p in Path(".").glob("*.PY", case_sensitive=False):
    print(p)
```

---

## 文件信息

**基本写法：获取文件状态**
`<路径>.stat()`
```python
# 获取文件元数据
info = Path("file.txt").stat()
print(info.st_size, info.st_mtime)
```

**基本写法：获取文件大小**
`<路径>.stat().st_size`
```python
# 返回文件字节数
size = Path("file.txt").stat().st_size
```

**基本写法：获取修改时间**
`<路径>.stat().st_mtime`
```python
# 返回最后修改时间戳
import time
mtime = Path("file.txt").stat().st_mtime
print(time.ctime(mtime))
```

---

## 路径匹配与变换

**基本写法：路径模式匹配**
`<路径>.match(<模式>)`
```python
# 判断路径是否匹配模式
Path("a/b/c.txt").match("*.txt")  # True
Path("a/b/c.txt").match("a/*.txt")  # False
```

**基本写法：修改文件名**
`<路径>.with_name(<新名称>)`
```python
# 返回替换文件名后的新路径
p = Path("/a/b/c.txt")
new_p = p.with_name("d.txt")  # /a/b/d.txt
```

**基本写法：修改扩展名**
`<路径>.with_suffix(<新扩展名>)`
```python
# 返回替换扩展名后的新路径
p = Path("file.txt")
new_p = p.with_suffix(".md")
```

**基本写法：修改父目录**
`<路径>.with_parent(<新父目录>)`
```python
# Python 3.12+ 替换父目录
p = Path("/old/file.txt")
new_p = p.with_parent("/new")  # /new/file.txt
```

**基本写法：相对路径**
`<路径>.relative_to(<基准路径>)`
```python
# 计算相对路径
p = Path("/usr/local/bin")
rel = p.relative_to("/usr")  # local/bin
```

---

## Python 3.13+ pathlib 增强

**基本写法：Python 3.13+ from_uri**
`Path.from_uri(<URI>)`
```python
# Python 3.13+ 从 URI 创建路径
p = Path.from_uri("file:///usr/local/bin")
```

**基本写法：Python 3.13+ as_uri**
`<路径>.as_uri()`
```python
# 将绝对路径转为 file URI
uri = Path("/usr/local").as_uri()
```

**基本写法：Python 3.13+ full_match**
`<路径>.full_match(<模式>)`
```python
# Python 3.13+ 完整路径匹配
Path("/a/b/c.txt").full_match("/a/**/*.txt")
```
