---
order: 120
title: ss 与 netstat
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: ss 与 netstat：套接字状态查看、连接统计与端口监听排查，TIME_WAIT/CLOSE_WAIT 分析。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'networking/290-NetworkTroubleshootTools'
  - 'networking/020-OSITCPIPModel'
  - 'networking/270-Tcpdump'
prerequisites: []
---

## ss 与 netstat：谁取代了谁

netstat 在 Linux 上已进入维护退役状态（net-tools 包停更多年，部分发行版不再预装），ss
是官方替代：ss 通过 netlink 直接从内核取 socket 状态，速度快、信息全（TCP 内部计时器、
拥塞窗口、内存占用都是 netstat 没有的），socket 数量大时差距尤其明显。本篇顺序是「先学
ss，把 netstat 当旧系统的方言」——参数映射记住一张就够：`netstat -tlnp` ≈ `ss -tlnp`，
`netstat -ant` ≈ `ss -ant`。

ss 过滤表达式是它比 netstat 强的地方：`state <状态>` 按连接状态筛选（如
`ss -t state established`），`exclude <状态>` 反向排除，`sport =` / `dport =` / `dst <IP>`
按端口地址精确筛选。这组表达式把「统计 TIME_WAIT」「找某个对端的连接」从 grep 管道变成
内核级过滤。

## ss 基本用法

**基本写法：查看所有连接**
`ss`
```bash
# 查看所有 socket 连接
ss
```

**基本写法：查看 TCP 连接**
`ss -t`
```bash
# 查看所有 TCP 连接
ss -t
```

**基本写法：查看 UDP 连接**
`ss -u`
```bash
# 查看所有 UDP 连接
ss -u
```

**基本写法：查看监听端口**
`ss -l`
```bash
# 查看所有监听端口
ss -l
```

**基本写法：查看 TCP 监听端口**
`ss -tln`
```bash
# 查看 TCP 监听端口（数字格式）
ss -tln
```

**基本写法：查看所有连接含进程**
`ss -tlnp`
```bash
# 查看 TCP 监听端口和对应进程
ss -tlnp
```

---

## ss 详细信息

**基本写法：显示详细信息**
`ss -tlnpe`
```bash
# 显示 TCP 监听端口的扩展信息
ss -tlnpe
```

**基本写法：显示内存使用**
`ss -m`
```bash
# 显示 socket 内存使用情况
ss -m
```

**基本写法：显示内部信息**
`ss -i`
```bash
# 显示 TCP 内部信息
ss -ti
```

**基本写法：显示所有 socket 类型**
`ss -a`
```bash
# 查看所有类型的 socket
ss -a
```

---

## ss 过滤查询

**基本写法：按状态过滤**
`ss -t state <状态>`
```bash
# 查看已建立的 TCP 连接
ss -t state established
```

**基本写法：按端口过滤**
`ss -tln sport = :<端口>`
```bash
# 查看 80 端口的监听情况
ss -tln sport = :80
```

**基本写法：按目标端口过滤**
`ss -t dport = :<端口>`
```bash
# 查看连接到 443 端口的连接
ss -t dport = :443
```

**基本写法：按 IP 过滤**
`ss -t dst <IP>`
```bash
# 查看到指定 IP 的连接
ss -t dst 192.168.1.100
```

**基本写法：过滤特定状态组合**
`ss -t state connected`
```bash
# 查看所有已连接状态的 TCP
ss -t state connected
```

**基本写法：排除特定状态**
`ss -t exclude time-wait`
```bash
# 查看除 TIME-WAIT 外的 TCP 连接
ss -t exclude time-wait
```

---

## ss 统计信息

**基本写法：按状态统计**
`ss -s`
```bash
# 显示 socket 统计摘要
ss -s
```

**基本写法：统计各状态连接数**
`ss -ant | awk '{print $1}' | sort | uniq -c | sort -rn`
```bash
# 统计各 TCP 状态的连接数
ss -ant | awk '{print $1}' | sort | uniq -c | sort -rn
```

**基本写法：统计各端口连接数**
`ss -tn | awk '{print $4}' | cut -d: -f2 | sort | uniq -c | sort -rn`
```bash
# 统计各端口的连接数
ss -tn | awk '{print $4}' | cut -d: -f2 | sort | uniq -c | sort -rn
```

---

## netstat 经典命令

**基本写法：查看所有连接**
`netstat -a`
```bash
# 查看所有连接和监听端口
netstat -a
```

**基本写法：查看 TCP 连接**
`netstat -t`
```bash
# 查看 TCP 连接
netstat -t
```

**基本写法：查看监听端口**
`netstat -l`
```bash
# 查看所有监听端口
netstat -l
```

**基本写法：查看 TCP 监听端口含进程**
`netstat -tlnp`
```bash
# 查看 TCP 监听端口和进程（需 root）
netstat -tlnp
```

**基本写法：数字格式显示**
`netstat -n`
```bash
# 不解析主机名和端口名
netstat -tn
```

---

## netstat 统计信息

**基本写法：查看接口统计**
`netstat -i`
```bash
# 查看网络接口收发包统计
netstat -i
```

**基本写法：查看路由表**
`netstat -r`
```bash
# 查看内核路由表
netstat -r
```

**基本写法：查看协议统计**
`netstat -s`
```bash
# 查看各协议的统计信息
netstat -s
```

**基本写法：查看 TCP 统计**
`netstat -st`
```bash
# 查看 TCP 协议统计
netstat -st
```

---

## netstat 高级用法

**基本写法：持续刷新**
`netstat -c`
```bash
# 每秒刷新一次连接状态
netstat -c
```

**基本写法：查看指定端口**
`netstat -tlnp | grep <端口>`
```bash
# 查看 8080 端口占用情况
netstat -tlnp | grep 8080
```

**基本写法：统计各状态连接数**
`netstat -ant | awk '{print $6}' | sort | uniq -c | sort -rn`
```bash
# 统计 TCP 各状态连接数
netstat -ant | awk '{print $6}' | sort | uniq -c | sort -rn
```

**基本写法：查看指定进程的连接**
`netstat -tlnp | grep <进程名>`
```bash
# 查看 nginx 的监听端口
netstat -tlnp | grep nginx
```

---

## lsof 端口查看

**基本写法：查看指定端口占用**
`lsof -i :<端口>`
```bash
# 查看 80 端口的进程
lsof -i :80
```

**基本写法：查看所有网络连接**
`lsof -i`
```bash
# 查看所有网络连接
lsof -i
```

**基本写法：查看 TCP 连接**
`lsof -i tcp`
```bash
# 查看所有 TCP 连接
lsof -i tcp
```

**基本写法：查看指定进程的网络连接**
`lsof -i -a -p <PID>`
```bash
# 查看 PID 为 1234 的网络连接
lsof -i -a -p 1234
```

**基本写法：查看指定用户网络连接**
`lsof -i -u <用户>`
```bash
# 查看 root 用户的网络连接
lsof -i -u root
```

---

## TCP 状态排查

**基本写法：统计 TIME_WAIT 连接数**
`ss -ant | grep TIME-WAIT | wc -l`
```bash
# 统计 TIME_WAIT 状态连接数
ss -ant | grep TIME-WAIT | wc -l
```

**基本写法：统计 ESTABLISHED 连接数**
`ss -ant | grep ESTAB | wc -l`
```bash
# 统计已建立连接数
ss -ant | grep ESTAB | wc -l
```

**基本写法：查看指定 IP 的连接数**
`ss -tn | grep <IP> | wc -l`
```bash
# 统计到 192.168.1.100 的连接数
ss -tn | grep 192.168.1.100 | wc -l
```

**基本写法：找出连接数最多的 IP**
`ss -tn | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10`
```bash
# 找出连接数最多的前 10 个 IP
ss -tn | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10
```

---

## 常用组合命令

**基本写法：快速查看所有监听端口**
`ss -tulnp`
```bash
# 查看 TCP 和 UDP 监听端口及进程
ss -tulnp
```

**基本写法：查看连接数排行**
`ss -tn state established | awk '{print $4}' | sort | uniq -c | sort -rn`
```bash
# 查看已建立连接中本地端口连接数排行
ss -tn state established | awk '{print $4}' | sort | uniq -c | sort -rn
```

**基本写法：监控连接数变化**
`watch -n 1 'ss -s'`
```bash
# 每秒刷新 socket 统计摘要
watch -n 1 'ss -s'
```

## 教学自检

按遮码自检法：遮住上文代码块，先自己写命令或推演答案，再对照。

- `ss -t`、`ss -tl`、`ss -tln`、`ss -tlnp` 四个命令各比前一个多了什么信息？排「端口被占用」
  时用哪个？为什么 -p 要 root 才显示全？
- TIME_WAIT 多是「服务端并发能力不足」还是「主动关闭方在等协议要求」？它是问题吗，什么
  情况才要处理？（提示：主动关闭方进 TIME_WAIT，等 2MSL；高并发压测服务端才会堆积）
- CLOSE_WAIT 大量堆积说明应用代码哪一类 bug？和 TIME_WAIT 的成因差别在哪？
- 用 ss 过滤表达式（不用 grep）写出「查看 443 端口的所有 ESTABLISHED 连接」。
- `ss -ti` 能看到 netstat 看不到的什么信息？什么故障用它判断？
- lsof -i :80 与 ss -tlnp 的视角差在哪？lsof 多了什么能力（文件描述符视角、用户过滤）？
