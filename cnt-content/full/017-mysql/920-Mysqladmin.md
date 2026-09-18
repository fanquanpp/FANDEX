---
order: 920
title: mysqladmin：一条命令的运维工具箱
module: 'mysql'
category: 数据库
difficulty: beginner
description: mysqladmin 命令行工具实战：存活探测与状态速览、进程与连接治理、安全关机与密码修改，以及它在现代监控体系里的位置。
author: fanquanpp
updated: '2026-09-19'
related:
  - 'mysql/910-CLI'
  - 'mysql/850-MySQLConfigOps'
  - 'mysql/860-PerformanceTuningSecurity'
  - 'mysql/740-SQLInjectionBasicsDetection'
prerequisites:
  - 'mysql/910-CLI'
  - 'start/030-DevEnvironmentSetup'
---

## 前置知识

- mysql 客户端的基本使用（[CLI 客户端](/mysql/910-CLI)）——mysqladmin 是"不进交互界面直接发管理指令"的兄弟工具；
- 会打开终端（零基础者先过 [命令行入门](/start/040-TerminalAndShellBasics)）。

## mysqladmin 是什么：把管理动作变成一行命令

`mysql -uroot -p` 进交互界面再敲 `SHOW STATUS` 固然万能，但脚本监控、健康检查、定时巡检需要**非交互式**的一行命令——mysqladmin 就是为此存在的管理工具箱。它把高频管理动作封装成子命令：

```bash
mysqladmin [选项] 子命令 [子命令...]
# 常用选项：-u 用户  -p 密码（回车补输）  -h 主机  -P 端口
```

## 日常四件套：探活、速览、详查、版本

```bash
# 1. 探活：脚本健康检查的第一行（存活输出 mysqld is alive，退出码 0）
mysqladmin -uroot -p ping

# 2. 速览：一行概览关键健康指标
mysqladmin -uroot -p status
# Uptime: 86400   Threads: 32   Questions: 987654
# Slow queries: 12   Opens: 210   Flush tables: 1
# Open tables: 180   Queries per second avg: 11.4

# 3. 详查：全部状态变量（接 grep 过滤才是正确姿势）
mysqladmin -uroot -p extended-status | grep -i threads

# 4. 版本：升级前后核对
mysqladmin -uroot -p version
```

`status` 的速览值值得逐个认识：**Threads**（当前连接数，逼近 `max_connections` 就是告警信号）、**Questions**（累计请求数）、**Slow queries**（慢查询累计值，配合[慢查询日志](/mysql/340-SlowQueryLog)的开启才有意义）、**Queries per second avg**（平均 QPS——除的是 Uptime，长期运行值会失真，精确 QPS 要两次采样差分）。

## 进程与连接治理

```bash
# 等价于交互界面的 SHOW PROCESSLIST
mysqladmin -uroot -p processlist

# 脚本化找出并结束超长连接（谨慎使用，先看清再 kill）
mysqladmin -uroot -p processlist | grep -i "sleep" 
mysqladmin -uroot -p kill <线程id>
```

连接堆积的处置链路：先 `processlist` 看是什么在占（大量 Sleep 是应用连接池配置问题，大量 Query 是慢查询风暴）——**kill 是止血，根因在应用侧或慢查询**，直接批量 kill 掩盖问题。

## 两个高危动作：关机与改密

```bash
# 优雅关机（等事务收尾、落盘干净，比 kill 进程文明一百倍）
mysqladmin -uroot -p shutdown

# 修改密码（老脚本常用；8.0 推荐用 SQL 的 ALTER USER）
mysqladmin -uroot -p'旧密码' password '新密码'
```

`shutdown` 在运维脚本里常用于受控重启流程，但**必须确认没有活跃业务事务**（配合 processlist 检查）。`password` 子命令在 8.0 能用但语法老旧，且密码明文出现在命令行会被 history 记录——安全规范：交互式用 `ALTER USER` 改密，脚本里用配置文件（`--defaults-extra-file`）传凭据，杜绝 `ps` 命令行暴露密码。

## 与现代运维体系的关系

mysqladmin 是单机工具，云与容器时代它的角色在收缩但没消失：

| 场景 | 用 mysqladmin | 更现代的替代 |
| --- | --- | --- |
| 探活脚本/容器健康检查 | 合适（一行命令零依赖） | 同样合适，难有更简方案 |
| 指标监控 | 手动差分，简陋 | mysqld_exporter + Prometheus |
| 日常管理 | 够用 | mysql 交互界面 / 图形工具 |

学习建议：**探活与 status 两个子命令必须肌肉记忆**（健康检查脚本与故障第一响应都会用到）；其余子命令知道存在即可，用到时 `mysqladmin --help` 现查。

## 动手环节：写一个最小健康检查脚本

```bash
#!/bin/bash
# health-check.sh —— 每分钟由 crontab 调用的最小巡检
HOST="127.0.0.1"; USER="monitor"; PASS="你的监控账号密码"

# 1. 探活：不通立即报警退出
if ! mysqladmin -h "$HOST" -u "$USER" -p"$PASS" ping >/dev/null 2>&1; then
  echo "[$(date '+%F %T')] ALERT: MySQL down" >> /var/log/mysql-hc.log
  exit 1
fi

# 2. 采样状态：提取连接数与慢查询数
STATUS=$(mysqladmin -h "$HOST" -u "$USER" -p"$PASS" extended-status |
         grep -E 'Threads_connected|Slow_queries' | awk '{print $4}')
echo "[$(date '+%F %T')] $STATUS" >> /var/log/mysql-hc.log

# 3. 阈值判断（示例：连接数超 400 报警）
THREADS=$(echo "$STATUS" | head -1)
if [ "$THREADS" -gt 400 ]; then
  echo "[$(date '+%F %T')] ALERT: connections=${THREADS}" >> /var/log/mysql-hc.log
fi
```

这个脚本的价值不在功能（监控平台远强于此），而在**它把探活、采样、阈值三个动作焊成了你自己的故障响应直觉**——每个字段都亲手采过，监控平台上的曲线才不是黑盒。

## 常见困惑

**"mysqladmin status 与 SHOW GLOBAL STATUS 什么关系？"**——status 子命令是后者若干变量的"摘要视图"（Uptime/Threads/Questions 等精选项），extended-status 才是全集。数据同源，只是呈现方式不同。

**"监控账号需要什么权限？"**——探活与 status 只需 USAGE（最低权限）加 PROCESS（看 processlist 时）。为巡检建专用最小权限账号，别用 root 跑脚本——与 [权限管理](/mysql/690-AccountPermissionManagement) 的最小权限原则一致。

**"为什么我 ping 返回 access denied？"**——ping 也要认证。容器与脚本里最常见的坑是凭据传递方式：环境变量或 defaults-extra-file 文件，而不是命令行明文。

## 检验清单

- 会用 ping/status/extended-status/version 四个日常子命令，并读懂 status 输出的每个字段；
- 知道 kill 子命令是止血手段及连接堆积的正确排查顺序；
- 能说出 shutdown 与 password 两个高危动作的安全规范；
- 完成最小健康检查脚本的编写与一次真实运行。

## 下一步

命令行工具箱的另一半是交互式客户端 mysql：进入 [CLI 客户端](/mysql/910-CLI) 补全日常操作；运维体系的全貌在 [MySQL 配置运维](/mysql/850-MySQLConfigOps)。
