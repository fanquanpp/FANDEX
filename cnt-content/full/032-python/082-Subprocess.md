---
order: 820
title: Python subprocess 子进程
module: 'python'
category: 后端技术
difficulty: beginner
description: Python subprocess 子进程 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## subprocess.run 推荐用法

**基本写法：执行命令**
`subprocess.run([<命令>, <参数1>, <参数2>])`
```python
# 以列表形式执行命令（推荐，避免注入）
import subprocess
result = subprocess.run(["echo", "hello"], capture_output=True, text=True)
print(result.stdout)  # hello
```

**基本写法：捕获输出**
`subprocess.run(<命令>, capture_output=True, text=True)`
```python
# 捕获标准输出与错误输出
r = subprocess.run(["python", "-V"], capture_output=True, text=True)
print(r.stdout, r.stderr)
```

**基本写法：字符串命令（shell 模式）**
`subprocess.run(<命令字符串>, shell=True)`
```python
# 使用 shell 解析管道与通配符
r = subprocess.run("dir | findstr py", shell=True, capture_output=True, text=True)
```

**基本写法：检查返回码**
`subprocess.run(<命令>, check=True)`
```python
# 非零返回码抛出 CalledProcessError
try:
    subprocess.run(["false"], check=True)
except subprocess.CalledProcessError as e:
    print(f"命令失败: {e.returncode}")
```

**基本写法：设置工作目录**
`subprocess.run(<命令>, cwd=<目录>)`
```python
# 指定子进程工作目录
subprocess.run(["ls"], cwd="/tmp", capture_output=True, text=True)
```

**基本写法：设置环境变量**
`subprocess.run(<命令>, env=<环境字典>)`
```python
# 自定义子进程环境变量
import os
env = {**os.environ, "DEBUG": "1"}
subprocess.run(["python", "main.py"], env=env)
```

**基本写法：设置超时**
`subprocess.run(<命令>, timeout=<秒数>)`
```python
# 超时抛出 TimeoutExpired
try:
    subprocess.run(["sleep", "10"], timeout=3)
except subprocess.TimeoutExpired:
    print("执行超时")
```

**基本写法：传入输入**
`subprocess.run(<命令>, input=<字符串>, text=True)`
```python
# 通过 stdin 传入输入
r = subprocess.run(["python", "-c", "print(input()*2)"], input="ab", text=True, capture_output=True)
print(r.stdout)  # abab
```

**基本写法：输入输出编码**
`subprocess.run(<命令>, encoding=<编码>)`
```python
# 指定编码替代 text=True
r = subprocess.run(["echo", "中文"], encoding="utf-8", capture_output=True)
```

---

## Popen 进程对象

**基本写法：创建子进程**
`subprocess.Popen([<命令>, <参数>])`
```python
# 获取进程对象进行交互
p = subprocess.Popen(["python", "-u", "task.py"], stdout=subprocess.PIPE, text=True)
out = p.communicate()[0]
print(out)
```

**基本写法：管道通信**
`<进程>.communicate([input=<输入>])`
```python
# 一次性读取全部输出并等待结束
p = subprocess.Popen(["cat"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
out, err = p.communicate(input="hello")
print(out)  # hello
```

**基本写法：等待进程结束**
`<进程>.wait([timeout=<秒>])`
```python
# 阻塞等待子进程退出
p = subprocess.Popen(["sleep", "2"])
p.wait()
print("进程已结束")
```

**基本写法：轮询状态**
`<进程>.poll()`
```python
# 非阻塞检查是否结束
p = subprocess.Popen(["sleep", "2"])
while p.poll() is None:
    print("运行中")
```

**基本写法：终止进程**
`<进程>.terminate() / <进程>.kill()`
```python
# terminate 发送 SIGTERM，kill 发送 SIGKILL
p = subprocess.Popen(["sleep", "100"])
p.terminate()
```

**基本写法：获取进程号**
`<进程>.pid`
```python
# 获取子进程 PID
p = subprocess.Popen(["sleep", "1"])
print(p.pid)
```

---

## 管道串联

**基本写法：命令管道串联**
`Popen(stdout=Popen.stdin)`
```python
# 模拟 shell 管道：ps | grep python
p1 = subprocess.Popen(["ps", "aux"], stdout=subprocess.PIPE, text=True)
p2 = subprocess.Popen(["grep", "python"], stdin=p1.stdout, stdout=subprocess.PIPE, text=True)
p1.stdout.close()
out = p2.communicate()[0]
print(out)
```

---

## check_output / call / check_call

**基本写法：获取标准输出**
`subprocess.check_output(<命令>)`
```python
# 直接返回标准输出，失败抛异常
out = subprocess.check_output(["python", "-V"], text=True, stderr=subprocess.STDOUT)
print(out)
```

**基本写法：仅执行并取返回码**
`subprocess.call(<命令>)`
```python
# 返回退出码，不抛异常
code = subprocess.call(["ls", "-l"])
```

**基本写法：执行并校验**
`subprocess.check_call(<命令>)`
```python
# 返回码非零抛 CalledProcessError
subprocess.check_call(["echo", "ok"])
```

---

## 输入输出重定向

**基本写法：输出重定向到文件**
`subprocess.run(<命令>, stdout=<文件对象>)`
```python
# 将输出写入文件
with open("out.log", "w", encoding="utf-8") as f:
    subprocess.run(["python", "-V"], stdout=f)
```

**基本写法：合并标准错误到标准输出**
`subprocess.run(<命令>, stderr=subprocess.STDOUT)`
```python
# 合并 stderr 到 stdout 一起捕获
r = subprocess.run(["python", "err.py"], capture_output=True, stderr=subprocess.STDOUT, text=True)
print(r.stdout)
```

**基本写法：从文件输入**
`subprocess.run(<命令>, stdin=<文件对象>)`
```python
# 从文件读取 stdin
with open("input.txt", encoding="utf-8") as f:
    subprocess.run(["python", "process.py"], stdin=f)
```
