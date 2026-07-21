---
order: 2
title: 持久化与模块
module: redis
category: Redis
difficulty: intermediate
description: 'RDB快照、AOF日志、混合持久化、无盘复制；RedisJSON、RedisTimeSeries、RedisBloom、RediSearch、Cuckoo Filter、T-Digest；统一模块化架构。'
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/概述与核心数据结构
  - redis/集群与高可用
  - redis/缓存策略与高级特性
prerequisites: []
---

## 1. RDB 快照

### 1.1 RDB 原理

RDB（Redis Database）将某一时刻的内存数据以二进制形式写入磁盘文件。

```
RDB 触发方式:
1. save — 同步保存（阻塞主线程，生产禁用）
2. bgsave — 异步保存（fork 子进程）
3. 自动保存（配置触发条件）
4. shutdown 时自动保存
5. 主从全量同步时

bgsave 流程:
  主进程 ──fork()──→ 子进程
    │                   │
    │ 继续处理请求      │ 写入临时 RDB 文件
    │（写时复制 COW）   │
    │                   │ 写入完成
    │←── 信号通知 ──────│
    │ 替换旧 RDB 文件
```

### 1.2 RDB 配置

```ini
# redis.conf
# 自动保存条件（满足任一即触发）
save 3600 1         # 3600秒内有1次修改
save 300 100        # 300秒内有100次修改
save 60 10000       # 60秒内有10000次修改

# 禁用 RDB
save ""

# RDB 文件配置
dbfilename dump.rdb
dir /var/lib/redis

# 压缩
rdbcompression yes       # LZF 压缩字符串
rdbchecksum yes          # CRC64 校验

# 写时复制期间不执行 save
stop-writes-on-bgsave-error yes

# RDB 增量备份（Redis 7.0+）
rdb-del-sync-files no
```

### 1.3 RDB 优缺点

| 优点                   | 缺点                         |
| :--------------------- | :--------------------------- |
| 文件紧凑，适合备份     | 非实时，可能丢失数据         |
| 恢复速度快（直接加载） | fork() 有内存开销（COW）     |
| 对性能影响小（子进程） | 数据量大时 fork 耗时         |
| 适合灾难恢复           | 不适合要求高数据安全性的场景 |

## 2. AOF 日志

### 2.1 AOF 原理

AOF（Append Only File）以日志形式记录每次写操作。

```
AOF 写入流程:
  命令 → AOF 缓冲区 → fsync 到磁盘

三种同步策略（appendfsync）:
  always    — 每条命令 fsync（最安全，最慢）
  everysec  — 每秒 fsync（推荐，最多丢1秒数据）
  no        — 由 OS 决定（最快，可能丢数据）
```

### 2.2 AOF 配置

```ini
# redis.conf
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# AOF 目录（Redis 7.0+ 多文件 AOF）
appenddirname "appendonlydir"

# AOF 重写配置
auto-aof-rewrite-percentage 100    # AOF 文件大小增长 100% 时触发
auto-aof-rewrite-min-size 64mb     # AOF 文件最小 64MB 才触发

no-appendfsync-on-rewrite no       # 重写期间是否暂停 fsync
```

### 2.3 AOF 重写

```
AOF 重写原理:
  fork 子进程 → 遍历内存数据 → 生成最简命令 → 写入新 AOF

重写过程:
  1. 主进程 fork 子进程
  2. 子进程生成新 AOF（基于当前内存状态）
  3. 主进程将新写命令追加到重写缓冲区
  4. 子进程完成后，主进程追加重写缓冲区
  5. 用新 AOF 替换旧 AOF

示例:
  旧 AOF:
    SET counter 1
    INCR counter
    INCR counter
    INCR counter
    DEL temp_key
    SET counter 4

  重写后:
    SET counter 4
    # temp_key 已删除，不记录
```

### 2.4 多文件 AOF（Redis 7.0+）

```
AOF 目录结构:
  appendonlydir/
  ├── appendonly.aof.manifest     # 清单文件
  ├── base-1.aof                  # 基础文件（RDB 格式或 AOF 格式）
  └── incr-1.aof                  # 增量文件（新增写命令）

优势:
  - 重写时只需生成新的 base 文件
  - 增量文件可以独立追加
  - 避免单文件过大
  - 支持增量备份
```

## 3. 混合持久化

### 3.1 混合持久化原理

```
混合持久化 = RDB + AOF
  AOF 重写时，前半部分写入 RDB 格式（快速加载），后半部分写入 AOF 格式（增量数据）

文件结构:
  ┌─────────────────────┐
  │ RDB 格式数据（前半） │  ← 快速加载
  ├─────────────────────┤
  │ AOF 增量命令（后半） │  ← 完整数据
  └─────────────────────┘
```

```ini
# redis.conf
aof-use-rdb-preamble yes    # 启用混合持久化（默认开启）
```

### 3.2 持久化方案对比

| 方案       | 数据安全         | 恢复速度 | 磁盘占用 | 适用场景               |
| :--------- | :--------------- | :------- | :------- | :--------------------- |
| 仅 RDB     | 可能丢分钟级数据 | 快       | 小       | 缓存场景               |
| 仅 AOF     | 最多丢1秒        | 慢       | 大       | 数据存储场景           |
| 混合持久化 | 最多丢1秒        | 较快     | 中       | 推荐（兼顾安全和性能） |

## 4. 无盘复制

```ini
# 无盘复制：主节点直接通过网络发送 RDB 给从节点，不生成磁盘文件
repl-diskless-sync yes
repl-diskless-sync-delay 5    # 等待5秒让更多从节点一起接收

# 无盘复制加载（Redis 7.0+）
repl-diskless-load swapdb     # 先加载到备用数据库，成功后切换

# 适用场景:
# - 磁盘 I/O 慢（云盘、网络存储）
# - 多个从节点同时全量同步
# - 内存充足
```

## 5. Redis 模块

### 5.1 RedisJSON

```bash
# 安装
# redis-server --loadmodule /path/to/rejson.so

# 设置 JSON
JSON.SET user:1001 $ '{"name":"Alice","age":30,"address":{"city":"Beijing"}}'

# JSONPath 查询
JSON.GET user:1001 $.name                    # "Alice"
JSON.GET user:1001 $.address.city            # "Beijing"
JSON.GET user:1001 $                         # 完整 JSON

# 修改 JSON
JSON.SET user:1001 $.age 31
JSON.SET user:1001 $.address.city "Shanghai"

# 数组操作
JSON.SET tags:1 $ '["redis","database"]'
JSON.ARRAPPEND tags:1 $ '"nosql"'            # 追加元素
JSON.ARRLEN tags:1 $                          # 数组长度
JSON.ARRPOP tags:1 $ -1                       # 弹出最后一个

# 数值操作
JSON.NUMINCRBY user:1001 $.age 1              # 年龄+1

# 删除字段
JSON.DEL user:1001 $.address
```

### 5.2 RedisTimeSeries

```bash
# 创建时间序列
TS.CREATE cpu:usage:server1 RETENTION 86400000 LABELS host server1 metric cpu
# RETENTION: 保留时间（毫秒），0=永久

# 添加数据点
TS.ADD cpu:usage:server1 * 75.5              # * = 当前时间戳
TS.ADD cpu:usage:server1 1704067200000 80.2  # 指定时间戳

# 批量添加
TS.MADD cpu:usage:server1 1704067200000 80.2 \
         cpu:usage:server1 1704067260000 82.1 \
         cpu:usage:server1 1704067320000 78.5

# 查询
TS.RANGE cpu:usage:server1 - + AGGREGATION avg 60000  # 按分钟平均
TS.RANGE cpu:usage:server1 - + COUNT 100               # 最近100个点

# 降采样规则
TS.CREATE cpu:usage:server1:1min RULES cpu:usage:server1:1h avg 3600000
# 每小时平均值存入 1h 序列

# 多序列查询
TS.MRANGE - + AGGREGATION avg 60000 FILTER metric=cpu
```

### 5.3 RedisBloom

```bash
# 布隆过滤器
BF.CREATE users:seen EXPANSION 2 ERROR 0.01 CAPACITY 1000000
BF.ADD users:seen "user:1001"               # 添加
BF.EXISTS users:seen "user:1001"            # 判断是否存在（可能有假阳性）
BF.EXISTS users:seen "user:9999"            # 不存在则一定不存在
BF.MADD users:seen "user:1002" "user:1003"
BF.INFO users:seen

# Cuckoo Filter（支持删除）
CF.CREATE emails:seen CAPACITY 1000000
CF.ADD emails:seen "test@example.com"
CF.EXISTS emails:seen "test@example.com"
CF.DEL emails:seen "test@example.com"        # 支持删除！
CF.COUNT emails:seen

# Count-Min Sketch（频率统计）
CMS.CREATE page:views 2000 10
CMS.INCRBY page:views "home" 1 "about" 3
CMS.QUERY page:views "home" "about"

# Top-K（高频元素）
TOPK.CREATE search:topk 10 50 4 0.9
TOPK.ADD search:topk "redis" "python" "redis" "java" "redis"
TOPK.LIST search:topk
TOPK.QUERY search:topk "redis" "python"
```

### 5.4 RediSearch

```bash
# 创建索引
FT.CREATE idx:products ON JSON PREFIX 1 product: SCHEMA
  $.name TEXT WEIGHT 2.0
  $.description TEXT
  $.price NUMERIC
  $.category TAG
  $.created_at NUMERIC SORTABLE

# 全文搜索
FT.SEARCH idx:products "redis database"
FT.SEARCH idx:products "@name:redis @category:database"

# 数值过滤
FT.SEARCH idx:products "redis" FILTER price 0 100

# 标签过滤
FT.SEARCH idx:products "*" FILTER category nosql

# 聚合查询
FT.AGGREGATE idx:products "*" GROUPBY 1 @category REDUCE COUNT 0 AS count

# 高亮和摘要
FT.SEARCH idx:products "redis" HIGHLIGHT FIELDS name description SUMMARIZE

# 拼写建议
FT.SPELLCHECK idx:products "reddis"

# 删除索引
FT.DROPINDEX idx:products
```

### 5.5 T-Digest

```bash
# T-Digest: 流式分位数估算
# 安装: redis-server --loadmodule /path/to/tdigest.so

# 创建
TDIGEST.CREATE latency:api

# 添加数据
TDIGEST.ADD latency:api 12.5 18.3 15.7 22.1 19.8 14.2 25.6

# 查询分位数
TDIGEST.QUANTILE latency:api 0.5    # 中位数
TDIGEST.QUANTILE latency:api 0.95   # P95
TDIGEST.QUANTILE latency:api 0.99   # P99

# 查询 CDF
TDIGEST.CDF latency:api 20          # ≤20ms 的请求比例

# 合并
TDIGEST.MERGE latency:all 2 latency:api latency:db

# 信息
TDIGEST.INFO latency:api
```

## 6. 统一模块化架构

### 6.1 模块管理

```bash
# 加载模块
redis-server --loadmodule /path/to/rejson.so \
             --loadmodule /path/to/redisearch.so \
             --loadmodule /path/to/redisbloom.so

# redis.conf 配置
loadmodule /path/to/rejson.so
loadmodule /path/to/redisearch.so
loadmodule /path/to/redisbloom.so

# 运行时加载
MODULE LOAD /path/to/rejson.so

# 查看已加载模块
MODULE LIST

# 卸载模块
MODULE UNLOAD rejson
```

### 6.2 模块生态

| 模块            | 功能               | 适用场景              |
| :-------------- | :----------------- | :-------------------- |
| RedisJSON       | JSON 文档存储      | 文档型数据、配置管理  |
| RediSearch      | 全文检索与二级索引 | 搜索引擎、自动补全    |
| RedisBloom      | 概率数据结构       | 去重、频率统计、Top-K |
| RedisTimeSeries | 时间序列数据库     | 监控指标、IoT 数据    |
| RedisGraph      | 图数据库           | 社交关系、知识图谱    |
| RedisCell       | 限流器             | API 限流、速率控制    |
| T-Digest        | 分位数估算         | 延迟监控、SLA 告警    |
