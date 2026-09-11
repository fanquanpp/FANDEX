---
order: 230
title: 进程管理命令速查手册
module: 'shell'
category: 工具链
difficulty: beginner
description: 进程查看、信号与终止、后台作业、免挂断运行与资源监控命令速查
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/220-ProcessJobControl'
  - 'shell/170-PipeRedirect'
  - 'shell/240-CompressArchive'
prerequisites:
  - 'shell/130-CommandLineBasics'
---


本篇是进程管理的**速查手册**：按"看、停、放、养、量"五个动作组织——看进程、停进程、放后台、脱离终端养着它、量化资源占用；原理与作业控制的系统讲解见《进程与作业控制》。

## 0. 心智模型：进程是"活的程序"

程序是硬盘上的文件，**进程是跑起来的程序实例**：每个进程有唯一编号 PID、有父进程 PPID（谁拉起它的）、有自己的内存与打开的文件。Shell 里每敲一条命令，就是 Shell（父）fork 出一个子进程去执行，命令结束后留下一个**退出码**（0 成功，非 0 失败）供父进程检查。

```bash
echo $$      # 当前 Shell 的 PID
echo $!      # 最近一个后台进程的 PID
echo $?      # 上一条命令的退出码
```

管进程的一切操作都围绕三件事：**找到它（PID）、给它发信号（kill）、看它吃了多少资源（监控）**。

## 1. 查看进程：ps / top / htop

**ps 快照** `ps [选项]`

```bash
ps -ef                 # System V 风格：全格式列出所有进程
ps aux                 # BSD 风格：含 %CPU/%MEM 列
ps aux | grep nginx    # 过滤指定进程（grep 自身也会出现，见下）
ps -ef --sort=-%mem    # 按内存倒序（GNU procps，Linux 可用）
pgrep -af "python app" # 按名称/命令行查 PID（-a 同时显示命令行）
pstree -p              # 树状展示父子关系
```

```text
ps aux 输出示例（节选）：
USER   PID %CPU %MEM    VSZ   RSS TTY  STAT START  TIME COMMAND
root     1  0.0  0.1 168000 13000 ?    Ss   08:00  0:01 /sbin/init
```

STAT 列速记：`R` 运行、`S` 睡眠（等事件）、`D` 不可中断 IO、`T` 停止、`Z` 僵尸（已死未收尸）、`s` 会话首领、`+` 前台。

`ps aux | grep xxx` 会多出一条 grep 自身，标准排除法：

```bash
ps aux | grep "[n]ginx"        # 技巧：字符集让 grep 匹配不到自己
pgrep -af nginx                # 或直接用 pgrep，更干净
```

**top / htop 动态监控**

```bash
top                    # 默认 3 秒刷新，按 CPU 排序（q 退出）
top -o %MEM            # 按内存排序
top -p 1234            # 只盯一个 PID
htop                   # 彩色交互式（需安装），鼠标可点
```

top 快捷键：`P` 按 CPU、`M` 按内存、`k` 杀进程、`1` 展开每核负载。

## 2. 终止进程：信号与 kill

**kill 的本质是发信号**，不是"杀死"。常用信号：

| 信号 | 编号 | 谁发出 | 可否被捕获 | 典型用途 |
| :--- | :--- | :--- | :--- | :--- |
| SIGTERM | 15 | 默认 kill | 可 | 优雅终止：进程保存状态后退出 |
| SIGKILL | 9 | 手动指定 | 不可 | 强制杀死，最后手段 |
| SIGINT | 2 | Ctrl+C | 可 | 中断前台进程 |
| SIGTSTP | 20 | Ctrl+Z | 可 | 暂停前台进程（可捕获版暂停） |
| SIGSTOP | 19 | 手动指定 | 不可 | 强制暂停，进程无法拦截 |
| SIGHUP | 1 | 终端关闭 | 可 | 挂断；守护进程常拿它当"重读配置" |
| SIGCONT | 18 | bg/fg | 可 | 恢复暂停的进程 |

注意：**Ctrl+Z 发送的是 SIGTSTP（20）**，它是"可捕获的暂停"；SIGSTOP（19）不可捕获，只能由 kill 发出——两者效果都是暂停，可捕获与否决定了程序有没有机会做善后。

```bash
kill 1234                    # 默认 SIGTERM，优雅终止
kill -9 1234                 # SIGKILL 强杀（先 TERM 无效再用）
kill -TERM 1234              # 显式写信号名，更可读
kill -TERM $(pgrep -f myapp) # 动态取 PID 再发信号
killall nginx                # 按进程名杀所有同名进程
pkill -f "python train"      # 按完整命令行匹配
```

**升级纪律**：先 SIGTERM 给程序留清理机会（释放端口、落盘），等待数秒无果再 SIGKILL——`kill -9` 会留下锁文件、脏数据，是故障隐患而非捷径。

## 3. 后台作业：& 与 jobs

```bash
python train.py &                    # 末尾加 & 放后台，立即返回作业号
python server.py > log.txt 2>&1 &    # 后台 + 重定向（标准组合）
jobs                                 # 当前 Shell 的作业列表
jobs -l                              # 附带 PID
fg %1                                # 把 1 号作业调回前台
bg %1                                # 让暂停的 1 号作业在后台继续
kill %2                              # 支持作业号（等价 kill 对应 PID）
```

```text
$ sleep 100 &
[1] 3456
$ jobs
[1]+  运行中              sleep 100 &
```

**流程口诀**：`Ctrl+Z 暂停 -> bg 丢后台 -> fg 拉回来`。注意后台进程的输出依然打到终端，习惯性配 `> 文件 2>&1`。

## 4. 脱离终端：nohup / disown / setsid

关闭终端时，系统会向会话内进程发 SIGHUP，普通后台作业随之退出。三种"续命"方案：

```bash
# 方案一：nohup 启动时就免疫挂断（输出默认进 nohup.out，建议显式重定向）
nohup node server.js > app.log 2>&1 &

# 方案二：disown 把已启动的作业从 Shell 作业表摘除
python worker.py &
disown %1           # 此后关终端不再给它发 SIGHUP

# 方案三：setsid 让进程开新会话，从一开始就没有控制终端
setsid python app.py > app.log 2>&1 &
```

| 方案 | 时机 | 特点 |
| :--- | :--- | :--- |
| `nohup` | 启动时 | 简单直接，注意输出重定向 |
| `disown` | 已启动后补救 | 只摘作业表，不改进程属性 |
| `setsid` | 启动时 | 彻底脱离终端，连 TTY 都没有 |

长期任务的正解是终端复用器：`tmux new -s deploy` 里跑长命令，断线后 `tmux attach -t deploy` 回到现场（任务从未中断）；系统服务则交给 systemd 托管（见《进程与作业控制》第 4 节）。

## 5. 资源监控：free / df / du / uptime

```bash
free -h               # 内存用量（-h 人类可读；-m 以 MB 计）
free -s 1             # 每秒刷新

df -h                 # 各文件系统磁盘占用
df -h /var            # 只看指定挂载点

du -sh *              # 当前目录各项总大小（-s 汇总 -h 可读）
du -sh * | sort -rh | head    # 找出最占空间的目录 TOP
uptime                # 运行时长与最近 1/5/15 分钟负载
```

```text
$ free -h
               total   used   free   available
Mem:            15Gi   6.2Gi   4.1Gi        8.7Gi
Swap:          2.0Gi      0B  2.0Gi
```

看内存优先看 `available`（真正可分配的量），而不是 free（含可回收缓存）。磁盘报警的标准排查链：`df -h` 定位哪个分区满 -> `du -sh * | sort -rh | head` 一层层钻下去。

## 6. Windows 对照（PowerShell）

```powershell
Get-Process                       # 列出进程（ps 的等价物）
Get-Process node                  # 按名称查看
Stop-Process -Name node -Force    # 强制终止（无优雅等待）
Get-Process | Sort-Object CPU -Descending | Select-Object -First 5   # CPU TOP5
```

PowerShell 没有 Unix 信号体系，`Stop-Process` 直接终止（等价 SIGKILL 语义）；需要优雅停止的服务请用 `Stop-Service` 走服务管理。

## 7. 小结

**初学者要点**：

- `ps aux` 看快照、`top` 看动态、`pgrep -af` 查 PID
- 停进程先 `kill PID`（TERM）等几秒，无效再 `kill -9`；按名字用 `pkill -f`
- 后台三件套：`&` 放后台、`jobs` 看、`fg/bg` 切；`Ctrl+Z` 是暂停不是终止
- 关终端会杀后台作业，长任务用 `nohup ... > log 2>&1 &` 或 `tmux`

**进阶注意**：

- Ctrl+Z 发 SIGTSTP（可捕获），与不可捕获的 SIGSTOP 是两个信号；写信号处理脚本时别混淆
- `jobs` 只看得到本 Shell 的作业，跨终端找进程一律 `ps`/`pgrep`
- 内存判断看 `free -h` 的 available 列；磁盘排查沿 `df` -> `du` 链路下钻
- 生产环境的长驻进程建议交给 systemd 或终端复用器管理，裸 nohup 只适合临时任务
