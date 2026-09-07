---
order: 240
title: 进程管理命令速查手册
module: 'shell'
category: 工具链
difficulty: beginner
description: 进程查看、后台运行、终止与资源监控命令的速查。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'shell/017-ProcessJobControl'
  - 'shell/023-PipeRedirect'
  - 'shell/025-CompressArchive'
prerequisites:
  - 'shell/002-CommandLineBasics'
---

## 查看进程

**基本用法:查看进程快照**
`ps [选项]`

```bash
# 查看所有进程详细信息
ps -ef

# BSD 风格全格式列表
ps aux

# 查找指定进程
ps -ef | grep nginx
```

---

**基本用法:实时进程监控**
`top [选项]`

```bash
# 启动交互式监控
top

# 按内存使用排序
top -o %MEM

# 仅监控指定用户
top -u deploy
```

---

**基本用法:更友好的监控**
`htop`

```bash
# 彩色交互式监控(需安装)
htop

# 树状查看进程
htop -t
```

---

## 后台运行

**基本用法:命令放后台执行**
`<命令> &`

```bash
# 后台运行脚本
python train.py &

# 查看后台任务列表
jobs

# 把最近后台任务调到前台
fg %1
```

---

**基本用法:免挂断运行**
`nohup <命令> &`

```bash
# 关闭终端后仍运行
nohup node server.js > app.log 2>&1 &
```

---

## 终止进程

**基本用法:发送信号**
`kill [选项] <PID>`

```bash
# 优雅终止
kill 1234

# 强制杀死
kill -9 1234

# 发送指定信号
kill -SIGTERM 1234
```

---

**基本用法:按名称杀进程**
`killall <进程名>`

```bash
# 杀死所有同名进程
killall nginx

# pkill 按模式匹配
pkill -f "python train"
```

---

## 资源监控

**基本用法:查看内存使用**
`free [选项]`

```bash
# 以 MB 显示
free -m

# 每秒刷新
free -s 1
```

---

**基本用法:查看磁盘使用**
`df [选项]`

```bash
# 人类可读格式
df -h
```

---

**基本用法:查看目录大小**
`du [选项] <路径>`

```bash
# 显示各目录大小并汇总
du -sh *

# 按大小排序找出最大目录
du -sh * | sort -rh | head
```

---

## 系统信息

**基本用法:查看系统负载**
`uptime`

```bash
# 显示运行时间与平均负载
uptime
```

---

**基本用法:Windows 进程管理**
`Get-Process`

```powershell
# 列出所有进程
Get-Process

# 按名称查找
Get-Process node

# 停止进程
Stop-Process -Name node -Force
```
