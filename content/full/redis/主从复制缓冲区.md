---
order: 102
title: 主从复制缓冲区
module: redis
category: database
difficulty: advanced
description: 'Redis 主从复制缓冲区机制：repl_backlog 环形缓冲区、全量同步与部分同步、缓冲区溢出与配置优化。'
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/字符串SDS结构
  - redis/跳表与有序集合
  - redis/哨兵选举
  - 'redis/Redis-Cluster哈希槽'
prerequisites:
  - redis/概述与核心数据结构
---

## 1. 复制缓冲区体系

### 1.1 三种复制缓冲区

| 缓冲区              | 位置 | 作用                         | 大小     |
| ------------------- | ---- | ---------------------------- | -------- |
| repl_backlog        | 主库 | 存储最近写命令，支持部分同步 | 默认 1MB |
| replication buffer  | 主库 | 为每个从库维护的输出缓冲区   | 动态增长 |
| replication backlog | 从库 | 接收主库数据的临时缓冲       | 动态     |

### 1.2 数据流

```
主库写入命令 → repl_backlog（环形缓冲）
             → replication buffer（每从库一个）
                 ↓ 网络传输
             从库接收 → 执行命令
```

## 2. repl_backlog 环形缓冲区

### 2.1 结构

```
repl_backlog 是一个定长环形缓冲区：

┌──────────────────────────────────────────┐
│  [cmd1][cmd2][cmd3]...[cmdN]             │
│     ↑                              ↑     │
│  repl_backlog_histlen         repl_backlog_idx
│  (有效数据起始)               (写入位置)
└──────────────────────────────────────────┘
  总大小: repl_backlog_size (默认1MB)

新数据写入 repl_backlog_idx 位置
写满后环绕到开头，覆盖最旧的数据
```

### 2.2 全局偏移量

```
repl_backlog_off: 缓冲区起始位置对应的全局偏移量
master_repl_offset: 主库当前的全局偏移量

有效数据范围: [repl_backlog_off, master_repl_offset]
```

### 2.3 部分同步（PSYNC）

```
从库断线重连时:
1. 发送 PSYNC {runid} {offset}
   - runid: 主库运行ID
   - offset: 从库最后收到的偏移量

2. 主库判断:
   - runid 匹配 且 offset 在 backlog 范围内 → 部分同步
   - 否则 → 全量同步

部分同步:
  主库从 backlog 中提取 [offset, master_repl_offset] 的数据
  发送给从库
```

### 2.4 部分同步判断

```
条件: offset >= repl_backlog_off

如果 offset < repl_backlog_off:
  说明从库缺失的数据已被覆盖 → 全量同步

示例:
  repl_backlog_size = 1MB
  repl_backlog_off = 1000000
  master_repl_offset = 1100000

  从库 offset = 1050000 → 1050000 >= 1000000 → 部分同步
  从库 offset = 900000  → 900000 < 1000000  → 全量同步
```

## 3. replication buffer

### 3.1 作用

主库为每个从库维护一个独立的输出缓冲区，暂存待发送的写命令：

```
主库
├── replication buffer for slave1
├── replication buffer for slave2
└── replication buffer for slave3
```

### 3.2 缓冲区溢出

当从库消费速度慢于主库写入速度时，buffer 持续增长：

```
写入速度: 100MB/s
从库消费: 10MB/s
每秒积压: 90MB

1分钟后: 5.4GB → 触发内存限制 → 从库被断开
```

### 3.3 缓冲区限制配置

```redis
# 客户端输出缓冲区限制（包括从库）
# 格式: client-output-buffer-limit <class> <hard> <soft> <soft_seconds>

# 从库缓冲区：硬限制 256MB，软限制 64MB 持续 60秒
client-output-buffer-limit replica 256mb 64mb 60

# 普通客户端
client-output-buffer-limit normal 0 0 0

# Pub/Sub 客户端
client-output-buffer-limit pubsub 32mb 8mb 60
```

**触发断开条件**：

- 缓冲区超过硬限制 → 立即断开
- 缓冲区超过软限制持续 N 秒 → 断开

## 4. 全量同步流程

### 4.1 触发条件

- 从库首次连接主库
- 从库发送的 runid 不匹配
- 从库请求的 offset 已被 backlog 覆盖

### 4.2 全量同步步骤

```
1. 从库发送 PSYNC ? -1（请求全量同步）
2. 主库执行 BGSAVE 生成 RDB
3. 主库将 RDB 发送给从库
4. 主库同时将新写入命令存入 replication buffer
5. 从库接收 RDB 后清空数据并加载
6. 主库发送 replication buffer 中的增量命令
7. 从库执行增量命令，数据一致
```

### 4.3 全量同步开销

```
BGSAVE: fork 子进程，COW 写时复制
RDB 传输: 网络带宽
从库加载: 阻塞服务（加载期间不可用）
增量缓冲: 内存占用
```

## 5. 配置优化

### 5.1 repl_backlog 大小

```redis
# 根据写入速度和断线时间估算
# 假设: 写入速度 10MB/s，最大断线时间 60s
# backlog 大小 >= 10MB/s × 60s = 600MB

repl-backlog-size 600mb
```

**计算公式**：

$$\text{backlog\_size} \geq \text{write\_rate} \times \text{max\_disconnect\_time}$$

### 5.2 关键参数

```redis
# repl_backlog 大小
repl-backlog-size 256mb

# repl_backlog TTL（无从库时多久删除）
repl-backlog-ttl 3600

# 从库发送 PING 的频率
repl-ping-replica-period 10

# 复制超时（包括SYNC、PING）
repl-timeout 60

# 禁用 TCP_NODELAY（启用后延迟更低但带宽更大）
repl-disable-tcp-nodelay no

# 从库优先级（Sentinel 选举用）
replica-priority 100
```

### 5.3 监控命令

```redis
# 主库查看复制信息
INFO replication

# 关键指标:
# repl_backlog_active: 1
# repl_backlog_size: 268435456
# repl_backlog_first_byte_offset: 12345
# repl_backlog_histlen: 268435400
# connected_slaves: 3
# master_repl_offset: 9999999
```
