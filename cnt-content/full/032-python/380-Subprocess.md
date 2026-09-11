---
order: 380
title: Python subprocess 子进程
module: 'python'
category: 后端技术
difficulty: intermediate
description: subprocess 全解：run/Popen、管道串联、超时与重定向、shell 注入风险与跨平台注意。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/810-PythonCLI'
  - 'python/820-ArgparseCli'
  - 'python/390-SysOsPlatform'
prerequisites: []
---

## 什么时候需要子进程

Python 不是万能胶水：调用 `ffmpeg` 转码、`git` 取提交历史、`psql` 执行导出，重写一遍不如直接调命令行。`subprocess` 模块就是标准库给出的"启动另一个程序并收发数据"的官方答案——`os.system` 与废弃的 `os.popen` 的现代替代品。核心心智模型只有一句话：**新开一个进程，给它命令行参数与标准流（stdin/stdout/stderr），拿回退出码**。优先用 `subprocess.run()`（一次性任务），需要流式交互再用 `Popen`。

注意：`echo`、`dir` 在 Windows 上是 shell 内建命令，列表形式直调可能失败，示例中的 `sleep`/`cat`/`ls` 为 Unix 命令；跨平台代码请先确认目标命令在两端都存在。

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

---

## 常见陷阱与最佳实践

1. **shell=True 拼接用户输入是命令注入**：字符串命令交给 shell 解释，`; rm -rf /` 一类的输入会被原样执行。参数含任何外部输入时，一律用列表形式传参，让特殊字符退化为普通文本。

```python
# 危险：filename 可能包含 shell 元字符
# subprocess.run(f"gzip {filename}", shell=True)
# 安全：列表形式不经过 shell 解析
subprocess.run(["gzip", filename])
```

2. **Windows 下 text=True 默认编码是本地编码（GBK/cp936）**：捕获 UTF-8 输出会乱码或抛 UnicodeDecodeError。跨平台代码显式传 `encoding="utf-8"`，必要时补 `errors="replace"`。
3. **PIPE 满了会死锁**：用 `Popen` 时如果只读 stdout 而 stderr 也在膨胀，管道缓冲区塞满后子进程会卡住。一次性拿结果用 `p.communicate()`（内部并发读两个管道），不要手写 `p.stdout.read()` 再 `p.wait()`。
4. **timeout 只在等待时生效**：`run(timeout=...)` 超时会 kill 子进程并抛 `TimeoutExpired`；但被 shell 包装的孙进程（`shell=True` 下启动的）可能成为孤儿。生产环境终止进程树时，Unix 下用 `start_new_session=True` + `os.killpg`。
5. **run() 返回 CompletedProcess，不抛错**：忘记 `check=True` 时命令失败也会静默继续。脚本类代码默认写 `check=True`，让失败尽早爆炸。

## 本篇小结

1. 心智模型：子进程 = 新进程 + 三条标准流 + 退出码；`run()` 覆盖 90% 场景，`Popen` 服务流式交互。
2. 默认姿势：列表传参（免注入）、`capture_output=True` 收输出、`text=True`/`encoding="utf-8"` 转文本、`check=True` 防静默失败、`timeout` 防挂死。
3. 管道串联遵循"上游 stdout 接下游 stdin，然后立刻 close 上游 stdout"的三行模板；更复杂的组合优先 `shell=True` 交给真正的 shell（输入可信时）。
4. `call`/`check_call`/`check_output` 是历史 API，行为都能用 `run()` 表达，新代码不必再分心记忆。

## 动手实践

1. 写一个函数 `git_last_tag()`，用 `subprocess.run` 执行 `git describe --tags --abbrev=0` 并返回 tag 名，处理"仓库没有 tag"的异常路径。
2. 用两个 `Popen` 串联实现 `type big.log | findstr ERROR`（Windows）或 `cat big.log | grep ERROR`（Unix），统计匹配行数。
3. 给一个外部命令加上 `timeout=5` 与重试三次的逻辑，验证超时进程确实被终止、退出码被正确捕获。
