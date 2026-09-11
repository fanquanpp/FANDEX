---
order: 670
title: C++ 调试命令
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ 调试命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## gdb 基础

**基本写法：启动 gdb**
`gdb <可执行文件>`
```bash
# 启动调试器
gdb ./app
# 带参数运行
gdb --args ./app arg1 arg2
# 带核心转储
gdb ./app core.dump
```

---

**基本写法：运行程序**
`run [参数]` 或 `r`
```bash
gdb> run              # 开始运行
gdb> run arg1 arg2    # 带参数运行
gdb> start            # 在 main 处暂停
```

---

**基本写法：断点**
`break <位置>` 或 `b <位置>`
```bash
gdb> break main         # 函数处断点
gdb> break main.cpp:42  # 文件行号断点
gdb> break 42           # 当前行号断点
gdb> tbreak main        # 临时断点（触发一次后删除）
gdb> break if x == 5    # 条件断点
```

---

**基本写法：管理断点**
`delete/info/disable/enable <断点号>`
```bash
gdb> info breakpoints   # 列出所有断点
gdb> delete 2           # 删除 2 号断点
gdb> delete             # 删除所有断点
gdb> disable 1          # 禁用 1 号断点
gdb> enable 1           # 启用
gdb> ignore 1 5         # 忽略前 5 次触发
```

---

**基本写法：单步执行**
`step / next / finish`
```bash
gdb> step        # 单步进入函数（s）
gdb> next        # 单步不进入函数（n）
gdb> finish      # 运行到当前函数结束
gdb> continue    # 继续运行（c）
gdb> until 50    # 运行到第 50 行
```

---

**基本写法：查看变量**
`print <表达式>` 或 `p <表达式>`
```bash
gdb> print x          # 查看变量
gdb> print x = 10     # 修改变量值
gdb> print *arr@5     # 查看数组前 5 个元素
gdb> print myvec.size()
gdb> display x        # 每次停止自动显示
```

---

**基本写法：查看内存**
`x/<数量><格式><大小> <地址>`
```bash
# 检查内存
gdb> x/10xw 0xaddr    # 10 个 16 进制 4 字节
gdb> x/4cb &ch        # 4 个字符字节
# 格式：x 16进制 d 十进制 c 字符 s 字符串
# 大小：b 字节 h 半字 w 字 g 双字
```

---

**基本写法：查看栈**
`backtrace` 或 `bt`
```bash
gdb> backtrace        # 查看调用栈
gdb> bt full          # 带局部变量
gdb> frame 2          # 切换到第 2 帧
gdb> up / down        # 上一帧/下一帧
gdb> info locals      # 当前帧局部变量
gdb> info args        # 当前帧参数
```

---

**基本写法：监视点**
`watch <表达式>`
```bash
# 数据变化时暂停
gdb> watch x          # 写入时触发
gdb> rwatch x         # 读取时触发
gdb> awatch x         # 读写都触发
```

---

## gdb 进阶

**基本写法：线程调试**
`info threads / thread <号>`
```bash
gdb> info threads        # 列出所有线程
gdb> thread 2            # 切换到 2 号线程
gdb> thread apply all bt # 所有线程栈
gdb> set scheduler-locking on # 锁定其他线程
```

---

**基本写法：信号处理**
`handle <信号> <动作>`
```bash
gdb> handle SIGINT stop    # 收到信号暂停
gdb> handle SIGUSR1 nostop # 不暂停
gdb> handle SIGSEGV stop print # 暂停并打印
```

---

**基本写法：调试已运行进程**
`gdb -p <PID>`
```bash
# 附加到运行中的进程
gdb -p 12345
# 或在 gdb 内
gdb> attach 12345
gdb> detach  # 分离
```

---

**基本写法：核心转储**
`gcore <PID>` 或 `ulimit -c unlimited`
```bash
# 启用核心转储
ulimit -c unlimited
# 运行崩溃后生成 core 文件
gdb ./app core
```

---

## lldb 调试

**基本写法：启动 lldb**
`lldb <可执行文件>`
```bash
# lldb 命令与 gdb 类似但语法不同
lldb ./app
lldb -- ./app arg1 arg2
```

---

**基本写法：lldb 常用命令对照**
`breakpoint / step / next / continue / frame`
```bash
lldb> breakpoint set --name main       # 设断点（b main）
lldb> breakpoint set --file main.cpp --line 42
lldb> run                              # 运行
lldb> step                             # 单步进入
lldb> next                             # 单步不进入
lldb> continue                         # 继续
lldb> frame variable                   # 查看局部变量
lldb> thread backtrace                 # 调用栈
```

---

**基本写法：lldb 查看变量**
`frame variable` 或 `expression`
```bash
lldb> frame variable x       # 查看变量
lldb> expression x           # 查看表达式
lldb> expression x = 10      # 修改变量
lldb> p x                    # print 简写
```

---

## 调试技巧

**基本写法：编译时加调试信息**
`g++ -g -O0 <源文件>`
```bash
# 调试专用编译选项
g++ -g -O0 -Wall main.cpp -o app
# -g3      最详细调试信息
# -O0      不优化（避免变量被优化掉）
```

---

**基本写法：AddressSanitizer**
`g++ -fsanitize=address -g <源文件>`
```bash
# 内存错误检测
g++ -fsanitize=address -g main.cpp -o app
./app
# 检测：越界、释放后使用、双重释放等
# 组合多个消毒器
g++ -fsanitize=address,undefined -g main.cpp -o app
```

---

**基本写法：命令脚本**
`gdb -x <脚本文件> <程序>`
```bash
# 自动执行 gdb 命令
# script.gdb 内容：
# break main
# run
# bt
gdb -x script.gdb ./app
```
