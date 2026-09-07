---
order: 800
title: Python sys/os 平台接口
module: 'python'
category: 后端技术
difficulty: beginner
description: Python sys/os 平台接口 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## sys 解释器接口

**基本写法：命令行参数**
`sys.argv`
```python
# 获取命令行参数列表
import sys
print(sys.argv)         # ['script.py', 'arg1', 'arg2']
print(sys.argv[1:])     # 用户传入的参数
```

**基本写法：退出程序**
`sys.exit([<状态码>])`
```python
# 退出并返回状态码
if len(sys.argv) < 2:
    sys.exit(1)  # 非零表示异常退出
```

**基本写法：标准输入输出**
`sys.stdin / sys.stdout / sys.stderr`
```python
# 重定向或直接使用标准流
sys.stdout.write("标准输出\n")
sys.stderr.write("错误信息\n")
name = sys.stdin.readline().strip()
```

**基本写法：递归深度**
`sys.getrecursionlimit() / sys.setrecursionlimit(<n>)`
```python
# 查询与设置递归深度上限
print(sys.getrecursionlimit())  # 1000
sys.setrecursionlimit(2000)
```

**基本写法：版本信息**
`sys.version / sys.version_info`
```python
# 获取解释器版本
print(sys.version_info.major, sys.version_info.minor)  # 3 12
```

**基本写法：平台标识**
`sys.platform`
```python
# 获取操作系统平台标识
print(sys.platform)  # win32 / linux / darwin
```

**基本写法：最大整数值**
`sys.maxsize`
```python
# 获取平台最大整数
print(sys.maxsize)  # 64 位系统为 2**63 - 1
```

**基本写法：模块搜索路径**
`sys.path`
```python
# 查看与修改模块搜索路径
import sys
sys.path.append("/custom/libs")
```

**基本写法：递增打印进度**
`sys.stdout.write + \r`
```python
# 原地刷新输出进度条
for i in range(101):
    sys.stdout.write(f"\r进度: {i}%")
    sys.stdout.flush()
```

---

## os 目录与文件操作

**基本写法：当前工作目录**
`os.getcwd()`
```python
# 获取当前工作目录
import os
print(os.getcwd())
```

**基本写法：切换目录**
`os.chdir(<路径>)`
```python
# 改变当前工作目录
os.chdir("/tmp")
```

**基本写法：列出目录内容**
`os.listdir(<路径>)`
```python
# 列出目录下所有条目
for name in os.listdir("."):
    print(name)
```

**基本写法：创建目录**
`os.mkdir(<路径>) / os.makedirs(<路径>)`
```python
# 创建单层或多层目录
os.mkdir("newdir")
os.makedirs("a/b/c", exist_ok=True)
```

**基本写法：删除文件与目录**
`os.remove(<文件>) / os.rmdir(<空目录>)`
```python
# 删除文件或空目录
os.remove("data.txt")
os.rmdir("emptydir")
```

**基本写法：递归删除目录树**
`shutil.rmtree(<目录>)`
```python
# 递归删除非空目录
import shutil
shutil.rmtree("old_project")
```

**基本写法：重命名与移动**
`os.rename(<旧名>, <新名>)`
```python
# 重命名文件或目录
os.rename("old.txt", "new.txt")
```

**基本写法：递归遍历目录**
`os.walk(<路径>)`
```python
# 自顶向下遍历目录树
for root, dirs, files in os.walk("."):
    for f in files:
        print(os.path.join(root, f))
```

**基本写法：文件信息**
`os.stat(<路径>)`
```python
# 获取文件大小、修改时间等元信息
st = os.stat("data.txt")
print(st.st_size, st.st_mtime)
```

---

## os 环境与进程

**基本写法：环境变量**
`os.environ`
```python
# 读取与设置环境变量
print(os.environ.get("HOME"))
os.environ["MY_VAR"] = "value"
```

**基本写法：获取进程号**
`os.getpid() / os.getppid()`
```python
# 获取当前进程与父进程 ID
print(os.getpid(), os.getppid())
```

**基本写法：执行系统命令**
`os.system(<命令>)`
```python
# 执行 shell 命令并返回退出码
ret = os.system("echo hello")
```

**基本写法：CPU 核数**
`os.cpu_count()`
```python
# 获取系统 CPU 核心数
print(os.cpu_count())
```

**基本写法：获取系统随机字节**
`os.urandom(<字节数>)`
```python
# 生成密码学安全的随机字节
token = os.urandom(16)
```

---

## os.path 路径操作

**基本写法：拼接路径**
`os.path.join(<路径1>, <路径2>)`
```python
# 跨平台安全拼接路径
p = os.path.join("dir", "sub", "file.txt")
```

**基本写法：判断存在**
`os.path.exists(<路径>)`
```python
# 判断路径是否存在
print(os.path.exists("data.txt"))
```

**基本写法：判断文件与目录**
`os.path.isfile(<路径>) / os.path.isdir(<路径>)`
```python
# 区分文件与目录
print(os.path.isfile("a.txt"), os.path.isdir("d"))
```

**基本写法：取文件名与目录名**
`os.path.basename(<路径>) / os.path.dirname(<路径>)`
```python
# 拆分路径末尾与父目录
print(os.path.basename("/a/b/c.txt"))  # c.txt
print(os.path.dirname("/a/b/c.txt"))   # /a/b
```

**基本写法：扩展名拆分**
`os.path.splitext(<路径>)`
```python
# 分离文件名与扩展名
name, ext = os.path.splitext("archive.tar.gz")
print(name, ext)  # archive.tar .gz
```

**基本写法：绝对路径**
`os.path.abspath(<路径>) / os.path.realpath(<路径>)`
```python
# 转换为绝对路径并解析软链接
print(os.path.abspath("../a.txt"))
print(os.path.realpath("link.txt"))
```

**基本写法：路径大小与时间**
`os.path.getsize(<路径>) / os.path.getmtime(<路径>)`
```python
# 获取文件大小与修改时间
print(os.path.getsize("a.txt"))
```

---

## platform 平台信息

**基本写法：操作系统类型**
`platform.system()`
```python
# 获取操作系统名称
import platform
print(platform.system())  # Windows / Linux / Darwin
```

**基本写法：Python 版本**
`platform.python_version()`
```python
# 获取当前 Python 版本字符串
print(platform.python_version())  # 3.12.0
```

**基本写法：机器架构**
`platform.machine()`
```python
# 获取 CPU 架构
print(platform.machine())  # AMD64 / arm64
```
