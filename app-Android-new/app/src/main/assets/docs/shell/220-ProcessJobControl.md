---
order: 220
title: 进程与作业控制
module: 'shell'
category: 工具链
difficulty: intermediate
description: 进程与作业控制：ps/top/kill、后台任务、nohup 与 timeout 限时运行
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/160-EnvVariablesConfig'
  - 'shell/200-TextProcessingTools'
prerequisites:
  - 'shell/130-CommandLineBasics'
  - 'shell/150-ShellBasics'
---


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
screen -S deploy         # 开启 screen 会话
```

- `setsid`：让进程成为新会话首领，连控制终端都没有
- `tmux`/`screen`：运维标配——在会话中跑长任务，断线重连后任务仍在，适合部署、编译等耗时操作

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
