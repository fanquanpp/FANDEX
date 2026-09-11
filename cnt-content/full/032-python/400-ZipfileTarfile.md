---
order: 400
title: Python zipfile 与 tarfile
module: 'python'
category: 后端技术
difficulty: beginner
description: Python zipfile 与 tarfile 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## zipfile 读取

**基本写法：打开 ZIP**
`zipfile.ZipFile(<文件>, <模式>)`
```python
# 打开 zip 文件
import zipfile

with zipfile.ZipFile("archive.zip", "r") as zf:
    print(zf.namelist())
```

**基本写法：列出文件**
`zf.namelist()`
```python
# 列出 zip 内所有文件
with zipfile.ZipFile("archive.zip") as zf:
    for name in zf.namelist():
        print(name)
```

**基本写法：读取文件**
`zf.read(<文件名>)`
```python
# 读取 zip 内文件内容
with zipfile.ZipFile("archive.zip") as zf:
    data = zf.read("data.txt")
    print(data.decode())
```

**基本写法：提取文件**
`zf.extract(<文件名>, <目录>)`
```python
# 提取单个文件
with zipfile.ZipFile("archive.zip") as zf:
    zf.extract("data.txt", "output")
```

**基本写法：提取全部**
`zf.extractall(<目录>)`
```python
# 提取全部文件
with zipfile.ZipFile("archive.zip") as zf:
    zf.extractall("output")
```

---

## zipfile 写入

**基本写法：创建 ZIP**
`zipfile.ZipFile(<文件>, "w", <压缩>)`
```python
# 创建新 zip 文件
import zipfile

with zipfile.ZipFile("new.zip", "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write("data.txt")
    zf.write("config.json")
```

**基本写法：追加文件**
`zipfile.ZipFile(<文件>, "a")`
```python
# 追加文件到已有 zip
with zipfile.ZipFile("new.zip", "a") as zf:
    zf.write("extra.txt")
```

**基本写法：writestr 写入字符串**
`zf.writestr(<文件名>, <数据>)`
```python
# 直接写入字符串/字节
with zipfile.ZipFile("new.zip", "w") as zf:
    zf.writestr("hello.txt", "Hello, World!")
    zf.writestr("data.json", '{"a": 1}')
```

---

## zipfile 信息

**基本写法：获取文件信息**
`zf.getinfo(<文件名>)`
```python
# 获取 ZipInfo 对象
with zipfile.ZipFile("archive.zip") as zf:
    info = zf.getinfo("data.txt")
    print(info.file_size, info.compress_size, info.date_time)
```

**基本写法：infolist 全部信息**
`zf.infolist()`
```python
# 获取所有文件信息
with zipfile.ZipFile("archive.zip") as zf:
    for info in zf.infolist():
        print(info.filename, info.file_size)
```

---

## ZIP 加密

**基本写法：密码解密**
`zf.setpassword(<密码>)`
```python
# 解密 zip
with zipfile.ZipFile("secret.zip") as zf:
    zf.setpassword(b"password")
    print(zf.read("data.txt"))
```

---

## tarfile 读取

**基本写法：打开 tar**
`tarfile.open(<文件>, <模式>)`
```python
# 打开 tar 文件
import tarfile

with tarfile.open("archive.tar.gz", "r:gz") as tf:
    print(tf.getnames())
```

**基本写法：列出成员**
`tf.getnames()` | `tf.getmembers()`
```python
# 列出 tar 内文件
with tarfile.open("archive.tar") as tf:
    for m in tf.getmembers():
        print(m.name, m.size, m.isfile())
```

**基本写法：提取文件**
`tf.extract(<成员>, <目录>)`
```python
# 提取单个文件
with tarfile.open("archive.tar") as tf:
    tf.extract("data.txt", "output")
```

**基本写法：提取全部**
`tf.extractall(<目录>)`
```python
# 提取全部
with tarfile.open("archive.tar") as tf:
    tf.extractall("output")
```

**基本写法：安全提取（3.12+）**
`tf.extractall(<目录>, filter="data")`
```python
# 3.12+ 推荐使用 filter 防止路径穿越
with tarfile.open("archive.tar") as tf:
    tf.extractall("output", filter="data")
```

---

## tarfile 写入

**基本写法：创建 tar**
`tarfile.open(<文件>, "w:<压缩>")`
```python
# 创建 tar.gz
with tarfile.open("new.tar.gz", "w:gz") as tf:
    tf.add("data.txt")
    tf.add("config.json")
```

**基本写法：添加文件**
`tf.add(<文件>, arcname=<归档名>)`
```python
# 指定归档内文件名
with tarfile.open("new.tar", "w") as tf:
    tf.add("data.txt", arcname="dir/data.txt")
```

**基本写法：addfile 写入**
`tf.addfile(<TarInfo>, <文件对象>)`
```python
# 手动构造 TarInfo 写入
import io

info = tarfile.TarInfo(name="hello.txt")
data = b"Hello, World!"
info.size = len(data)
with tarfile.open("new.tar", "w") as tf:
    tf.addfile(info, io.BytesIO(data))
```

---

## tarfile 模式

**基本写法：压缩模式**
`"w:gz"` | `"w:bz2"` | `"w:xz"`
```python
# 不同压缩格式
tarfile.open("a.tar.gz", "w:gz")
tarfile.open("a.tar.bz2", "w:bz2")
tarfile.open("a.tar.xz", "w:xz")
```

**基本写法：流式读取**
`"r|gz"`
```python
# 流式读取大文件
with tarfile.open("big.tar.gz", "r|gz") as tf:
    for member in tf:
        f = tf.extractfile(member)
        if f:
            print(f.read()[:50])
```

---

## TarInfo 对象

**基本写法：创建 TarInfo**
`tarfile.TarInfo(<名称>)`
```python
# 创建文件信息
info = tarfile.TarInfo("data.txt")
info.size = 100
info.mode = 0o644
```

**基本写法：从文件创建**
`tf.gettarinfo(<文件对象>)`
```python
# 从现有文件创建 TarInfo
with open("data.txt", "rb") as f:
    info = tf.gettarinfo(fileobj=f)
```
