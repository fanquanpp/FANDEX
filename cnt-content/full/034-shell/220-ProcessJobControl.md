---
order: 230
title: 进程与作业控制
module: 'shell'
category: 工具链
difficulty: intermediate
description: 进程与作业控制：ps/top/kill、后台任务、nohup 与 timeout 限时运行
author: fanquanpp
updated: '2026-10-11'
related:
  - 'shell/160-EnvVariablesConfig'
  - 'shell/200-TextProcessingTools'
prerequisites:
  - 'shell/130-CommandLineBasics'
  - 'shell/150-ShellBasics'
---

## 知识点地图

- **知识类别**：进程与作业控制——进程概念、ps/top 查看、kill 信号体系、前后台作业切换、脱离终端运行、限时执行。
- **解决什么问题**：程序卡死怎么优雅地停；跑一半的任务怎么放到后台；关了终端任务为什么会死、怎么保活；脚本里怎么防止一条命令卡死全局。
- **什么时候用到**：日常开发中管理本地进程（起服务、杀残留）、服务器上跑长任务（部署、编译）、写健壮脚本（超时保护、优雅重启）。

与《进程管理速查》（shell/230-ProcessManage）的分工：**本篇教学讲解（信号机制、作业控制为什么这样设计），230 是命令速查（翻查用）**——重叠的命令表述以 230 为准，本篇负责讲清背后的机制。

## 1. 从"工厂车间"说起

### 1.1 进程是什么

想象一个工厂（操作系统），每台正在工作的机器就是一个**进程**：有机器编号（PID）、知道在干什么（命令行）、可以开也可以停。

**进程是操作系统中的运行实例**。每个进程有唯一 PID（进程号），并有父进程 PPID：

- **前台进程**：占据终端，命令执行期间终端不可用
- **后台进程**：命令末尾加 `&`，终端可继续输入
- **作业（job）**：Shell 对"一条命令及其子进程"的管理单元，前台作业、后台作业可切换

```bash
echo $$                 # 当前 Shell 的 PID
echo $PPID              # 当前 Shell 父进程的 PID
```

`$$` 常用于生成临时文件名（如 `/tmp/tmp.$$`），避免多进程冲突。

## 2. 查看进程：ps 与 top

### 2.1 ps：静态快照

```bash
ps                      # 只显示当前终端会话的进程
ps -ef                  # 全格式列出所有进程（BSD 风格：ps aux 亦可）
ps aux | grep nginx     # 查看 nginx 相关进程
ps -ef --sort=-%mem     # 按内存占用排序
pgrep -f "python app"   # 只输出匹配进程的 PID
pstree -p               # 树状显示进程父子关系
```

```text
ps aux 输出示例：
USER   PID %CPU %MEM  VSZ  RSS TTY STAT START TIME COMMAND
root     1  0.0  0.1 168M 13M ?    Ss   08:00 0:01 /sbin/init
```

**常用列含义**：

| 列 | 含义 |
| --- | --- |
| `PID` | 进程号 |
| `%CPU` / `%MEM` | 占用率 |
| `STAT` | 状态（S 睡眠、R 运行、Z 僵尸、T 停止） |
| `TIME` | 累计 CPU 时间 |

`pgrep` 按进程名取 PID，是脚本中"先查再杀"的标准前置命令。

### 2.2 top：动态监控

```bash
top                     # 每 3 秒刷新，按 CPU 排序（q 退出）
top -o %MEM             # 按内存排序
top -p 1234 -p 5678     # 只监控指定 PID
htop                    # 交互式增强版（需安装）
```

**top 交互快捷键**：`M` 按内存排序、`P` 按 CPU 排序、`k` 输入 PID 杀进程、`z` 高亮颜色。

## 3. 终止进程：kill

**kill 的本质是向进程发送"信号"**，进程可以自行决定如何响应：

| 信号 | 编号 | 行为 |
| --- | --- | --- |
| SIGHUP | 1 | 挂断；终端关闭时默认发给会话内进程 |
| SIGINT | 2 | 键盘中断（Ctrl + C） |
| SIGTERM | 15 | 优雅终止（默认），进程可清理后退出 |
| SIGKILL | 9 | 强制杀死，进程无法拦截 |
| SIGTSTP | 20 | 键盘暂停（Ctrl + Z 发送），进程可捕获处理 |
| SIGSTOP | 19 | 强制暂停（只能 kill -STOP 发送），进程无法拦截 |
| SIGCONT | 18 | 恢复暂停的进程 |

注意区分两个"暂停"：Ctrl + Z 发送的是 SIGTSTP（20），程序可以捕获它做善后；SIGSTOP（19）不可捕获，进程只能被硬性冻住。

```bash
kill 1234                # 默认 SIGTERM，优雅终止
kill -9 1234             # SIGKILL 强制杀死（最后手段）
kill -TERM $(pgrep -f "myapp")   # 按名称动态取 PID 再杀
killall nginx            # 按进程名杀死所有匹配进程
pkill -f "python main"   # 按命令行全文匹配
```

**安全顺序**：

1. 优先用 `SIGTERM`（15）让程序自行清理（保存状态、释放端口）
2. 无效时才升级为 `SIGKILL`（9）
3. `kill -9` 会留下未清理的锁文件、socket 文件，是故障隐患

`pkill -f` 匹配完整命令行，比进程名更精准。

## 4. 后台任务与作业控制

### 4.1 & 与 jobs

```bash
sleep 100 &              # 放入后台运行，立即返回作业号 [1]
python server.py > log.txt 2>&1 &   # 后台运行并记录日志
jobs                     # 查看当前终端的所有作业
jobs -l                  # 显示作业的 PID
```

```text
[1]+  运行中               sleep 100 &
[2]-  运行中               python server.py > log.txt 2>&1 &
```

**要点**：

- 后台任务的输出仍会打印到终端，因此通常配合重定向把输出写入文件
- 作业号 `[1]`、`[2]` 与 PID 不同，作业控制命令（bg/fg/kill %n）使用作业号

### 4.2 bg、fg 与 Ctrl + Z

```bash
Ctrl + Z                 # 暂停当前前台任务，转为停止态
jobs                     # 此时显示 "已停止"
bg %1                    # 让作业 1 在后台继续运行
fg %1                    # 把作业 1 调回前台运行
fg                       # 不带参数恢复最近一个作业
kill %2                  # 终止作业 2（支持作业号）
```

**工作流程**：`Ctrl + Z 暂停 → bg 放后台 → 继续做别的事`。`fg`/`bg`/`kill` 均可使用 `%作业号` 定位作业。

**注意**：关闭终端后这些作业会收到 SIGHUP 被终止，需要 `nohup` 或 `disown` 保护。

## 5. 脱离终端运行

### 5.1 nohup 与 disown

```bash
nohup python app.py > app.log 2>&1 &
disown -h %1             # 标记作业 1：收到 SIGHUP 时忽略（作业仍在表中）
disown -a                # 把所有作业从作业表移除（Shell 退出时都不再发 SIGHUP）
```

- `nohup`（no hangup）：让进程忽略挂断信号，即使关闭终端进程也不退出；输出默认写入 `nohup.out`，建议显式重定向到自己的日志文件
- `disown`：把作业从 Shell 作业表中移除，Shell 退出时不再给它发 SIGHUP

### 5.2 setsid 与终端复用器

```bash
setsid python app.py &   # 创建新会话，彻底脱离终端
tmux new -s web          # 开启 tmux 会话（重连不中断）
```

- `setsid`：让进程成为新会话首领，连控制终端都没有
- `tmux`/`screen`：运维标配——在会话中跑长任务，断线重连后任务仍在，适合部署、编译等耗时操作

三种手段的完整对比（保活/可回看/可交互）与选型边界（交付给系统的服务用 systemd、交互式长任务用 tmux）见《tmux 终端复用与会话保持》（shell/272-TmuxTerminalMultiplexer）——tmux 是本节三者的「可交互」唯一解，值得单独一篇展开。

## 6. timeout：限时运行

```bash
timeout 10 ping 8.8.8.8          # 10 秒后自动终止
timeout -k 5 10 ./slow_job.sh    # 10 秒后先发 TERM，5 秒后仍不退则 KILL
timeout 30s curl -s https://api.example.com   # 请求限时
```

**要点**：

- `timeout` 防止命令"卡死"整个脚本，是脚本健壮性的关键工具
- 对可能无限等待的命令（网络请求、交互式程序）务必加超时
- 返回码 124 表示命令因超时被终止

## 7. 实战：一键重启服务

```bash
#!/bin/bash
set -euo pipefail
SERVICE="myapp"

# 1. 优雅停止：先 TERM，等待 10 秒，仍存活则 KILL
pkill -f "$SERVICE" || true
for i in $(seq 1 10); do
    pgrep -f "$SERVICE" > /dev/null || break
    sleep 1
done
pkill -9 -f "$SERVICE" 2>/dev/null || true

# 2. 启动并记录 PID
nohup python /opt/$SERVICE/main.py > /var/log/$SERVICE.log 2>&1 &
echo "新 PID: $!"

# 3. 健康检查
sleep 2
pgrep -f "$SERVICE" > /dev/null && echo "启动成功" || echo "启动失败"
```

**要点**：

- 生产环境的重启脚本必须"等进程真正退出再启动"，避免端口冲突
- `|| true` 容忍"没有匹配进程"的正常情况（否则 set -e 会让脚本退出）
- `$!` 保存刚启动后台进程的 PID

## 8. 常见误区

**误区一：kill 就是"杀死"进程。** → kill 是"发信号"，默认是优雅终止（SIGTERM），进程可以清理后退出；只有 `kill -9` 才是强制杀死。

**误区二：后台任务关了终端还能跑。** → 关闭终端会给后台任务发 SIGHUP，需要 `nohup` 或 `disown` 保护。

**误区三：`kill -9` 是最快最安全的。** → 恰恰相反，`kill -9` 跳过清理会留下脏状态。先 TERM，无效再 KILL。

**误区四：jobs 看不到就说明进程没了。** → jobs 只显示当前 Shell 的作业；别的终端/进程用 `ps` 查看。

## 9. 动手实践

先只读任务与提示，自己操作再展开参考观察。

**任务一：走完一次完整的作业控制循环。** 起一个前台任务（`sleep 100`），Ctrl+Z 暂停后依次执行 `jobs`、`bg %1`、`jobs -l`、`fg %1`，每步记录屏幕输出；最后用 `kill %1` 收尾。回答：作业号与 PID 分别在哪一步出现？

<details>
<summary>任务一参考观察</summary>

Ctrl+Z 后 jobs 显示 `[1]+ 已停止 sleep 100`（作业号出现）；`bg %1` 后同一作业变「运行中」；`jobs -l` 额外给出 PID；`fg %1` 调回前台（Ctrl+Z 之前它占着终端）；`kill %1` 用作业号终止。这题验证作业号是 shell 层的管理单位、PID 是内核层的单位，两套编号不要混用（kill %n 只在当前 shell 有效）。
</details>

**任务二：验证 SIGHUP 与 nohup 的差别。** 在终端 A 起两个进程：`sleep 300 &` 和 `nohup sleep 400 > /dev/null 2>&1 &`；关掉终端 A，开终端 B 用 `ps -ef | grep sleep` 查看两个进程谁还活着。

<details>
<summary>任务二参考观察</summary>

裸 `sleep 300` 随终端关闭死亡（SIGHUP 沿进程树传播，终端退出时 shell 向作业发挂断信号）；nohup 的 `sleep 400` 存活（忽略 SIGHUP）。追问一层：如果把终端 A 的退出换成 `disown -a` 后再退出，裸 sleep 也能活——因为 disown 把作业从表里移除，shell 退出不再发信号。三个手段（nohup/disown/tmux）解决同一个问题，tmux 是唯一保交互的（见第 5.2 节与 272 篇）。
</details>

**任务三：给一条会卡死的命令装上超时。** 用 `timeout -k 3 5 ssh 随意主机`（或任何会挂起的命令）体验：5 秒后 TERM、再 3 秒后 KILL 的完整流程；然后写一行「用 timeout 包住 curl」的命令放进你的脚本笔记，并验证返回码 124。

<details>
<summary>任务三参考观察</summary>

`echo $?` 在 timeout 触发后返回 124（第 6 节要点）；`-k 3` 的意义是 TERM 不响应时兜底 KILL——不响应 TERM 的程序并不少见（卡死在不可中断 IO 时连 KILL 都要等 IO 返回）。脚本里 `timeout 30 curl ... || 处理失败` 是网络命令的标准写法：把「卡死」变成「可预期的失败分支」。
</details>
