---
order: 56
title: AOF日志持久化
module: redis
category: Redis
difficulty: advanced
description: 'Redis AOF日志持久化：appendfsync策略、AOF重写机制、配置优化与恢复流程'
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/向量集
  - redis/RDB快照持久化
  - redis/混合持久化
  - redis/无盘复制
prerequisites:
  - redis/概述与核心数据结构
---

## 1. AOF 概述

AOF（Append Only File）以日志形式记录 Redis 服务器收到的每一条写命令，以追加（append）方式写入 AOF 文件。Redis 重启时通过重放 AOF 文件中的命令来恢复数据。

AOF 的核心优势：

- **数据安全性高**：最多丢失 1 秒数据（`everysec` 策略）
- **可读性好**：AOF 文件是文本格式，可直接查看和修改
- **容错性强**：即使 AOF 文件尾部损坏，`redis-check-aof` 可修复
- **实时性**：每条写命令都追加到日志

AOF 的主要不足：

- **文件体积大**：记录所有写命令，远大于 RDB
- **恢复速度慢**：需要重放所有命令
- **对性能有影响**：频繁的磁盘写入

## 2. AOF 工作流程

```
客户端写命令
     │
     ▼
Redis 服务器执行命令
     │
     ▼
命令追加到 AOF 缓冲区（aof_buf）
     │
     ▼
根据 appendfsync 策略刷盘
     │
     ▼
AOF 文件
```

### 2.1 命令追加

每执行一条写命令后，Redis 将该命令以 Redis 协议格式追加到 `aof_buf` 缓冲区：

```c
// 伪代码
void feedAppendOnlyFile(struct redisCommand *cmd, int argc, robj **argv) {
    // 将命令转换为 RESP 协议格式
    buf = catAppendOnlyGenericCommand(argc, argv);
    // 追加到 aof_buf
    aof_buf = sdscatlen(aof_buf, buf, sdslen(buf));
}
```

### 2.2 文件写入与同步

Redis 的事件循环（`beforeSleep`）中，将 `aof_buf` 的内容写入 AOF 文件：

```c
// 伪代码
void flushAppendOnlyFile(int force) {
    // 将 aof_buf 写入 AOF 文件
    nwritten = write(server.aof_fd, server.aof_buf, sdslen(server.aof_buf));
    // 根据 appendfsync 策略决定是否 fsync
    if (server.aof_fsync == APPENDFSYNC_ALWAYS) {
        fsync(server.aof_fd);
    }
}
```

## 3. appendfsync 策略

`appendfsync` 配置项决定了 AOF 数据刷盘的频率，是数据安全与性能之间的关键权衡：

```redis
appendfsync always     # 每条命令都 fsync
appendfsync everysec   # 每秒 fsync（默认推荐）
appendfsync no         # 由操作系统决定刷盘时机
```

### 3.1 always

- **行为**：每条写命令执行后立即调用 `fsync()`
- **数据安全**：最高，最多丢失一条命令
- **性能影响**：最严重，每秒只能处理数百到数千次写入
- **适用场景**：对数据安全要求极高的金融场景

### 3.2 everysec

- **行为**：每秒调用一次 `fsync()`
- **数据安全**：较高，最多丢失 1 秒数据
- **性能影响**：可接受，与 `no` 策略性能差距不大
- **适用场景**：大多数生产环境（默认推荐）

### 3.3 no

- **行为**：不主动 `fsync()`，由操作系统决定
- **数据安全**：最低，可能丢失最近数秒数据
- **性能影响**：最好，依赖 OS 缓冲区刷盘
- **适用场景**：纯缓存或可容忍数据丢失的场景

### 3.4 三种策略对比

| 策略     | fsync 频率 | 最多丢失数据 | 写入性能 | 推荐度 |
| -------- | ---------- | ------------ | -------- | ------ |
| always   | 每条命令   | 1条命令      | 低       |        |
| everysec | 每秒       | 1秒数据      | 中       |        |
| no       | OS决定     | 数秒数据     | 高       |        |

## 4. AOF 重写机制

随着时间推移，AOF 文件会不断增长。Redis 通过 AOF 重写（rewrite）机制压缩文件体积。

### 4.1 重写原理

AOF 重写不是读取旧 AOF 文件进行分析，而是**直接读取当前数据库状态**，用最少的命令重新生成 AOF 文件。

**示例**：

```redis
# 旧 AOF 文件中可能有以下 6 条命令
SET counter 1
INCR counter
INCR counter
INCR counter
DEL counter
SET counter 100

# 重写后只需 1 条命令
SET counter 100
```

**列表合并示例**：

```redis
# 旧 AOF 文件
RPUSH list a b c
RPUSH list d e
LPOP list
RPUSH list f

# 重写后
RPUSH list b c d e f
```

### 4.2 AOF 重写触发条件

```redis
# 自动触发条件
auto-aof-rewrite-percentage 100   # AOF 文件大小比上次重写后增长 100%
auto-aof-rewrite-min-size 64mb    # AOF 文件最小 64MB 才触发重写

# 手动触发
BGREWRITEAOF
```

自动触发判断逻辑：

$$\text{当前文件大小} \geq \text{上次重写后大小} \times (1 + \frac{\text{auto-aof-rewrite-percentage}}{100})$$

且当前文件大小 $\geq$ `auto-aof-rewrite-min-size`

### 4.3 AOF 重写流程

```
1. 主进程调用 fork() 创建子进程
2. 子进程根据当前内存状态生成新 AOF 文件（临时文件）
3. 主进程继续处理请求：
   a. 写命令同时追加到 旧AOF缓冲区 和 重写缓冲区
   b. 旧AOF缓冲区 → 旧AOF文件（保证数据安全）
   c. 重写缓冲区 → 记录重写期间的新命令
4. 子进程完成重写，通知主进程
5. 主进程将重写缓冲区的命令追加到新 AOF 文件
6. 用新 AOF 文件原子替换旧 AOF 文件
```

**关键细节**：

- 重写期间，旧 AOF 文件仍然正常写入，确保数据安全
- 重写缓冲区确保重写期间的新命令不会丢失
- 最终替换操作使用 `rename()` 系统调用，原子性保证

### 4.4 重写期间的数据一致性

```
时间线：
  T1: fork() 开始重写
  T2: SET key1 val1  → 旧AOF + 重写缓冲区
  T3: SET key2 val2  → 旧AOF + 重写缓冲区
  T4: 子进程完成重写
  T5: 重写缓冲区追加到新AOF
  T6: rename 新AOF → 正式AOF
```

## 5. AOF 文件格式

AOF 文件使用 Redis 序列化协议（RESP）格式：

```
*2\r\n
$6\r\n
SELECT\r\n
$1\r\n
0\r\n
*3\r\n
$3\r\n
SET\r\n
$4\r\n
key1\r\n
$6\r\n
value1\r\n
```

### 5.1 多命令合并

Redis 4.0+ 支持 AOF 使用 `MULTI/EXEC` 包裹命令，减少文件体积：

```
*1\r\n
$5\r\n
MULTI\r\n
*3\r\n
$3\r\n
SET\r\n
$3\r\n
key\r\n
$5\r\n
value\r\n
*3\r\n
$3\r\n
SET\r\n
$4\r\n
key2\r\n
$6\r\n
value2\r\n
*1\r\n
$4\r\n
EXEC\r\n
```

## 6. AOF 文件恢复

### 6.1 自动恢复

Redis 启动时自动加载 AOF 文件（AOF 优先级高于 RDB）：

1. 检查 AOF 是否开启（`appendonly yes`）
2. 加载 AOF 文件，逐条执行命令
3. 如果 AOF 文件损坏，拒绝启动

### 6.2 AOF 文件修复

```bash
# 检查 AOF 文件
redis-check-aof appendonly.aof

# 修复 AOF 文件（截断损坏部分）
redis-check-aof --fix appendonly.aof
```

### 6.3 AOF 与 RDB 加载优先级

Redis 启动时的加载顺序：

1. 如果 AOF 开启（`appendonly yes`），优先加载 AOF
2. 如果 AOF 未开启，加载 RDB 文件
3. 如果两者都不存在，启动空数据库

## 7. 配置优化

### 7.1 关键配置项

```redis
# 开启 AOF
appendonly yes

# AOF 文件名
appendfilename "appendonly.aof"

# 刷盘策略
appendfsync everysec

# 自动重写条件
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# 重写期间是否禁止 fsync
no-appendfsync-on-rewrite no

# 加载时忽略最后一条不完整命令
aof-load-truncated yes

# AOF 文件存储目录
dir /var/lib/redis
```

### 7.2 no-appendfsync-on-rewrite

当设为 `yes` 时，AOF 重写期间不执行 `fsync()`，减少磁盘 I/O 争用：

- **优点**：避免重写期间主线程因 fsync 阻塞
- **风险**：重写期间如果宕机，可能丢失更多数据
- **建议**：在磁盘 I/O 成为瓶颈时考虑开启

### 7.3 性能调优建议

| 场景         | appendfsync | rewrite 配置 | 说明               |
| ------------ | ----------- | ------------ | ------------------ |
| 数据安全优先 | always      | 100/64mb     | 最高安全，最低性能 |
| 均衡方案     | everysec    | 100/64mb     | 推荐默认配置       |
| 性能优先     | no          | 200/128mb    | 减少磁盘压力       |
| 大数据集     | everysec    | 100/256mb    | 减少重写频率       |

## 8. AOF 常见问题

### 8.1 AOF 文件过大

- 检查重写是否正常触发：`INFO Persistence`
- 手动触发重写：`BGREWRITEAOF`
- 调整 `auto-aof-rewrite-percentage` 降低触发阈值

### 8.2 重写期间内存增长

- 重写缓冲区可能积累大量命令
- 高写入场景下，重写缓冲区可能占用数百 MB
- 考虑在低峰期手动触发重写

### 8.3 fsync 阻塞主线程

- `everysec` 策略下，fsync 由后台线程执行
- 如果后台线程 fsync 耗时超过 1 秒，主线程会等待
- 解决方案：使用更快的磁盘（SSD）或开启 `no-appendfsync-on-rewrite`
