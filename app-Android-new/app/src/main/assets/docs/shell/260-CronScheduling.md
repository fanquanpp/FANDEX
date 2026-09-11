---
order: 260
title: 定时任务与调度
module: 'shell'
category: 工具链
difficulty: intermediate
description: 定时任务与调度：crontab 五字段、环境陷阱与日志、at 一次性任务、systemd timer 与 flock 防重叠
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/250-PracticalScripts'
  - 'shell/230-ProcessManage'
prerequisites:
  - 'shell/250-PracticalScripts'
---


## 1. 从"闹钟"说起：定时任务是什么

你每天早上 7 点被闹钟叫醒，不用自己盯着表看。**定时任务就是给脚本设的闹钟**：你告诉操作系统"每天 2 点执行 backup.sh"，之后它会在指定时刻自动把脚本拉起来跑，无论你在不在电脑前。

没有定时任务的世界：备份靠人肉记得敲命令、报表靠人肉每天点一次、证书续期靠人肉翻日历——忘一次就是事故。学会定时任务后，"重复且有规律"的工作全部交给操作系统。

Linux 世界的三大调度工具：

| 工具 | 适合场景 | 状态 |
| :--- | :--- | :--- |
| **cron** | 周期性固定时刻任务（每天、每周） | 各发行版标配 |
| **at** | 一次性延迟任务（10 分钟后跑一次） | 需单独安装 at 包 |
| **systemd timer** | cron 的现代替代，依赖管理更强 | systemd 系统标配 |

本篇以 Linux 为主（cron 与 systemd timer）；macOS 官方推荐 launchd，但 cron 依然可用，概念相通。

前置知识：本篇假设你已会写一个能独立运行的脚本（见《实战脚本案例》的 backup.sh），并且了解基本的进程与日志概念（见《进程与作业控制》）。

## 2. crontab：五字段语法

### 2.1 用户级 crontab

```bash
crontab -e               # 编辑当前用户的定时任务
crontab -l               # 列出当前用户的定时任务
crontab -r               # 删除全部定时任务（高危，误敲请立即重写）
crontab -l -u deploy     # root 查看指定用户的任务（-u 仅 root 可用）
```

每行一个任务，前 5 个字段是时间，后面是命令：

```text
┌───────── 分钟        (0-59)
│ ┌───────── 小时      (0-23)
│ │ ┌───────── 日      (1-31)
│ │ │ ┌───────── 月    (1-12)
│ │ │ │ ┌───────── 星期 (0-7，0 和 7 都是周日)
│ │ │ │ │
* * * * *  要执行的命令
```

### 2.2 字段取值与特殊符号

| 符号 | 含义 | 示例 |
| :--- | :--- | :--- |
| `*` | 每一个可能的值 | `* * * * *` 每分钟 |
| `,` | 列表 | `0 8,12,18 * * *` 每天 8/12/18 点整 |
| `-` | 范围 | `0 9-18 * * *` 每天 9 点到 18 点整 |
| `/` | 步长 | `*/5 * * * *` 每 5 分钟；`0 */2 * * *` 每隔 2 小时 |

### 2.3 常用节奏速查

```bash
*/5 * * * *    cmd    # 每 5 分钟
0 * * * *      cmd    # 每小时整点
0 2 * * *      cmd    # 每天凌晨 2 点（备份最常用）
30 3 * * 0     cmd    # 每周日 3:30（0 = 周日）
0 0 1 * *      cmd    # 每月 1 号零点
@reboot        cmd    # 每次开机后执行一次
@daily         cmd    # 等价 0 0 * * *
@hourly        cmd    # 等价 0 * * * *
```

`@reboot`、`@daily` 这类写法叫快捷串（string），大部分 cron 实现都支持，比数字字段更易读。

## 3. 最大的陷阱：cron 的环境与你以为的不一样

cron 是本篇最容易踩坑的地方：**定时任务运行在一个"精简环境"里**，和你登录后敲命令的环境几乎是两个世界。

### 3.1 环境差异对照

| 项目 | 你的终端 | cron 环境 |
| :--- | :--- | :--- |
| PATH | 含 `~/.local/bin` 等自定义目录 | 通常仅 `/usr/bin:/bin` |
| SHELL | 你的登录 Shell（如 bash/zsh） | `/bin/sh`（常是 dash） |
| 家目录变量 | 齐全 | 有 HOME，但不读你的 `.bashrc` |
| 终端 | 有 | 无（不是交互式会话） |

```bash
# 复现 cron 环境，排查"手动能跑、cron 不跑"
env -i SHELL=/bin/sh PATH=/usr/bin:/bin HOME=/home/deploy \
    /usr/local/bin/backup.sh
```

`env -i` 清空环境后按 cron 的默认值重建，能在终端里直接复现定时任务的运行条件——排查定时任务问题的第一步。

### 3.2 三条铁律

**铁律一：全部用绝对路径。** 命令、脚本、日志都用绝对路径；脚本内部要 cd 的地方显式 `cd`。

```bash
# 反例：依赖 PATH 与当前目录
0 2 * * * backup.sh >> backup.log

# 正例：绝对路径 + 显式重定向
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

**铁律二：永远重定向输出。** cron 默认把任务的 stdout/stderr 通过邮件发给本地用户；多数机器没配邮件服务，输出就无声消失，出错也不知道。末尾 `>> 日志 2>&1` 是标准收尾。

**铁律三：警惕 `%` 字符。** crontab 中 `%` 表示换行（其后内容被当作下一条命令），命令里要用 `%` 必须转义：

```bash
# 错误：date 的格式串含 %，任务会莫名其妙被截断
0 2 * * * /usr/local/bin/backup.sh $(date +%F)

# 正确：转义每个 %（或干脆把 date 写进脚本里）
0 2 * * * /usr/local/bin/backup.sh "$(date +\%F)"
```

### 3.3 日与星期同时限制时的语义陷阱

当"日"和"星期"都受限（不是 `*`）时，cron 的规则是**二者满足其一即执行**（OR），不是多数人以为的"同时满足"（AND）：

```bash
# 想要"每月 1 号且恰好是周一"？这条做不到——1 号或每个周一都会执行
0 9 1 * 1  /usr/local/bin/report.sh

# 确保只用其中一个字段限制，另一个写 *
0 9 1 * *  /usr/local/bin/report.sh    # 每月 1 号
0 9 * * 1  /usr/local/bin/report.sh    # 每周一
```

需要"1 号且周一"这类逻辑时，把日期判断写进脚本：`[ "$(date +\%u)" = "1" ] || exit 0`。

## 4. 完整案例：给备份脚本定时

以《实战脚本案例》中的 backup.sh 为例，配置每天 2 点的滚动备份：

```bash
# 1. 先手动跑通一次，确认脚本自身没问题
/usr/local/bin/backup.sh /var/www/myapp 7

# 2. 编辑 crontab
crontab -e

# 3. 写入任务行：日志按天分割，错误也进日志
0 2 * * * /usr/local/bin/backup.sh /var/www/myapp 7 >> /var/log/backup_cron.log 2>&1
```

```text
预期验证（第二天检查）：
$ crontab -l
0 2 * * * /usr/local/bin/backup.sh /var/www/myapp 7 >> /var/log/backup_cron.log 2>&1

$ tail -3 /var/log/backup_cron.log
2026-09-09 02:00:01 开始备份 /var/www/myapp -> /backups/myapp/myapp-20260909-020001.tar.gz
2026-09-09 02:00:03 压缩包校验通过
2026-09-09 02:00:03 备份完成，共 156M

$ ls /var/log/syslog | xargs -I{} grep -c CRON {} 2>/dev/null
# 系统日志中能看到 CRON 进程拉起记录（Debian/Ubuntu 在 /var/log/syslog）
```

调试口诀：**任务没跑，先看系统日志里有没有 CRON 拉起记录**。有记录但没结果，查任务自身的日志；连记录都没有，查 cron 服务状态（`systemctl status cron`）。

## 5. at：一次性延迟任务

cron 管"周期"，at 管"某一次"——"10 分钟后重启服务"、"今晚 23 点跑一次迁移"：

```bash
# 安装（多数发行版默认未装）
sudo apt install at          # Debian/Ubuntu
sudo dnf install at          # Fedora/RHEL

echo "reboot" | at now + 10 minutes      # 10 分钟后执行
at 23:00                                  # 交互式输入，今晚 23 点执行
atq                                       # 查看待执行队列
atrm 3                                    # 删除 3 号任务
```

```text
$ echo "echo done > /tmp/at-test.txt" | at now + 1 minute
warning: commands will be executed using /bin/sh
job 5 at Thu Sep 10 10:30:00 2026

# 一分钟后：
$ cat /tmp/at-test.txt
done
```

at 同样运行在精简环境里（铁律照旧适用），且输出的邮件投递问题与 cron 相同。

## 6. systemd timer：cron 的现代替代

systemd 系统上，**定时任务可以不写 cron，而用一对单元文件**：`.service` 定义做什么，`.timer` 定义什么时候做。

### 6.1 最小可用示例

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=每日备份 myapp

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh /var/www/myapp 7
```

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=每天 02:00 触发备份

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload        # 让 systemd 读到新单元
sudo systemctl enable --now backup.timer
systemctl list-timers backup.timer  # 查看下次触发时间
```

```text
$ systemctl list-timers backup.timer
NEXT                        LEFT  LAST PASSED UNIT          ACTIVATES
Thu 2026-09-10 02:00:00 CST 15h   ...        backup.timer  backup.service
```

### 6.2 timer 相比 cron 的优势

| 能力 | cron | systemd timer |
| :--- | :--- | :--- |
| 错过补跑（关机期间错过的任务开机后补执行） | 不支持（anacron 部分补救） | `Persistent=true` 原生支持 |
| 日志 | 邮件 + 自行重定向 | 直接进 journal：`journalctl -u backup.service` |
| 依赖与并发控制 | 自己写 flock | 单元天然串行，`Conflicts=` 等机制 |
| 随机延迟错峰 | 手写 sleep | `RandomizedDelaySec=30min` |

`OnCalendar` 语法比 cron 五字段更直白（`daily`、`weekly`、`*-*-* 02:00:00` 均可），还支持 `OnBootSec=`、`OnUnitActiveSec=` 这类"相对上次运行"的写法。迁移存量 cron 时逐条对应即可，不必一次全换。

## 7. 防重叠：flock 保证单实例

任务跑得比周期长（备份 10 分钟没跑完，下一个整点又拉起一份），就会出现两个实例同时写同一个文件。`flock` 用文件锁保证同一时刻只有一个实例：

```bash
# crontab 写法：拿不到锁立即放弃（-n），绝不排队堆积
*/10 * * * * flock -n /tmp/backup.lock /usr/local/bin/backup.sh /var/www/myapp 7 >> /var/log/backup_cron.log 2>&1
```

```bash
# 手动验证锁的效果：开两个终端各执行一次
flock -n /tmp/demo.lock sleep 30    # 终端 A：持锁 30 秒
flock -n /tmp/demo.lock sleep 30    # 终端 B：立即失败退出（退出码 1）
echo $?                             # B 的退出码为 1，说明被锁拒绝
```

`-n`（nonblocking）拿不到锁就退出，适合定时任务；去掉 `-n` 则会排队等待，谨慎用于周期任务——排队可能越积越多。systemd timer 没这个问题：同一 service 上一次没跑完，timer 不会重复触发。

## 8. 小结

**初学者要点**：

- crontab 五字段：分 时 日 月 星期；`*/5`、`8,12,18`、`9-18` 覆盖大多数节奏
- 三条铁律：绝对路径、重定向日志、转义 `%`
- 一次性任务用 at（记得先安装），周期任务用 cron
- 排查顺序：系统日志里找 CRON 拉起记录 → 任务自身日志 → cron 服务状态

**进阶注意**：

- 日与星期同时受限是 OR 语义，复杂条件写进脚本判断
- `env -i` 可精确复现 cron 环境，是"手动能跑、定时不跑"的标准排查手段
- systemd timer 的 `Persistent=true` 与 journal 日志在可靠性上全面优于 cron，新任务值得直接用 timer
- 长任务套 `flock -n` 防重叠；备份、同步这类任务尤其要防"上一轮未结束又开一轮"
- macOS 的等价物是 launchd（LaunchAgent/LaunchDaemon），cron 在 macOS 上仍可用但属非主流路径
