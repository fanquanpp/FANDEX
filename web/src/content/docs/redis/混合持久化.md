---
order: 57
title: 混合持久化
module: redis
category: Redis
difficulty: advanced
description: Redis混合持久化：RDB+AOF组合方案、加载流程、配置与性能权衡
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/RDB快照持久化
  - redis/AOF日志持久化
  - redis/无盘复制
  - redis/模块系统
prerequisites:
  - redis/概述与核心数据结构
---

## 1. 混合持久化概述

混合持久化是 Redis 4.0 引入的持久化方案，结合了 RDB 的高效恢复和 AOF 的数据安全性。在 AOF 重写时，将当前数据以 RDB 格式写入 AOF 文件开头，后续增量命令仍以 AOF 格式追加。

**核心思想**：

```
┌─────────────────────────────────────────┐
│              混合 AOF 文件               │
│  ┌──────────────┬───────────────────┐   │
│  │  RDB 格式    │   AOF 格式        │   │
│  │  (全量快照)   │  (增量命令)       │   │
│  └──────────────┴───────────────────┘   │
└─────────────────────────────────────────┘
```

## 2. 混合持久化工作原理

### 2.1 重写时的文件生成

当 AOF 重写触发时：

1. 子进程将当前内存数据以 **RDB 二进制格式**写入临时文件开头
2. 重写期间的新命令以 **AOF 文本格式**追加到临时文件末尾
3. 重写完成后，临时文件替换旧 AOF 文件

```
重写过程：

旧 AOF 文件：
  SET key1 val1
  SET key2 val2
  DEL key1
  SET key3 val3
  SET key2 newval2
  ...（数百万条命令）

新 AOF 文件（混合格式）：
  [RDB 二进制数据：key2=newval2, key3=val3, ...]
  SET key4 val4        ← 重写期间的增量命令
  SET key5 val5
  ...
```

### 2.2 文件体积对比

假设 Redis 中有 100 万个 key，每个 key 平均 100 字节：

| 格式     | 估算大小       | 说明                    |
| -------- | -------------- | ----------------------- |
| 纯 AOF   | ~200 MB        | 每条命令的文本表示      |
| 纯 RDB   | ~100 MB        | 压缩二进制格式          |
| 混合 AOF | ~100 MB + 增量 | RDB 部分 + 少量增量 AOF |

混合 AOF 的体积约为纯 AOF 的 50%~70%，接近 RDB 的紧凑程度。

## 3. 混合持久化加载流程

Redis 启动加载混合 AOF 文件时：

```
1. 读取 AOF 文件头部
2. 检测到 RDB 格式标记（REDIS 前缀）
3. 以 RDB 方式加载前半部分（快速恢复全量数据）
4. 以 AOF 方式重放后半部分（恢复增量数据）
5. 加载完成，开始接受请求
```

详细流程：

```
加载混合 AOF 文件
     │
     ▼
读取前 9 字节 ──→ 判断是否为 RDB 格式
     │                        │
  纯 AOF                   混合格式
     │                        │
  逐条重放命令          RDB 加载全量数据
                              │
                        AOF 重放增量命令
                              │
                        加载完成
```

### 3.1 格式检测

Redis 通过检查 AOF 文件开头来判断格式：

- 以 `REDIS` 开头 → RDB 格式（混合 AOF）
- 以 `*` 开头 → 纯 AOF 格式（RESP 协议）

```c
// 伪代码
int loadAppendOnlyFile(char *filename) {
    if (starts_with(buf, "REDIS")) {
        // 混合格式：先加载 RDB 部分
        rdbLoadRio(&rdb);
        // 再加载 AOF 增量部分
        while (readCommand(&cmd)) {
            executeCommand(cmd);
        }
    } else {
        // 纯 AOF 格式
        while (readCommand(&cmd)) {
            executeCommand(cmd);
        }
    }
}
```

## 4. 配置与启用

### 4.1 开启混合持久化

```redis
# redis.conf
appendonly yes                    # 开启 AOF
aof-use-rdb-preamble yes          # 开启混合持久化（Redis 4.0+ 默认开启）
```

```redis
# 运行时修改
CONFIG SET aof-use-rdb-preamble yes
```

### 4.2 关键配置项

```redis
# AOF 基础配置
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# 混合持久化开关
aof-use-rdb-preamble yes

# 重写触发条件
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### 4.3 版本兼容性

| Redis 版本 | 混合持久化支持 | 默认值 |
| ---------- | -------------- | ------ |
| < 4.0      | 不支持         | -      |
| 4.0        | 支持           | no     |
| 5.0+       | 支持           | yes    |
| 7.0+       | 支持（MP-AOF） | yes    |

**注意**：Redis 7.0 引入了 Multi Part AOF（MP-AOF），将 AOF 拆分为基础文件（BASE）和增量文件（INCR），进一步优化了混合持久化的实现。

## 5. 三种持久化方案对比

| 特性       | 纯 RDB           | 纯 AOF         | 混合持久化     |
| ---------- | ---------------- | -------------- | -------------- |
| 数据安全性 | 低（分钟级丢失） | 高（秒级丢失） | 高（秒级丢失） |
| 恢复速度   | 快               | 慢             | 较快           |
| 文件体积   | 最小             | 最大           | 中等           |
| 性能影响   | fork 开销        | 写入开销       | 两者兼具       |
| 可读性     | 不可读           | 可读           | 部分可读       |
| 兼容性     | 所有版本         | 所有版本       | Redis 4.0+     |

### 5.1 恢复速度对比

对于 1000 万个 key 的数据集：

| 方案     | 恢复时间 | 说明                         |
| -------- | -------- | ---------------------------- |
| 纯 RDB   | ~10 秒   | 直接加载二进制               |
| 纯 AOF   | ~120 秒  | 逐条重放命令                 |
| 混合 AOF | ~15 秒   | RDB 快速加载 + 少量 AOF 重放 |

混合持久化的恢复速度约为纯 AOF 的 **8~10 倍**，接近纯 RDB 的水平。

## 6. Redis 7.0 Multi Part AOF

Redis 7.0 对 AOF 进行了重大重构，引入 Multi Part AOF（MP-AOF）：

### 6.1 文件结构

```
appendonlydir/
├── appendonly.aof.1.base.rdb       # BASE 文件（RDB 格式）
├── appendonly.aof.1.incr.aof       # INCR 文件（增量 AOF）
├── appendonly.aof.2.incr.aof       # INCR 文件（重写期间增量）
└── appendonly.aof.manifest         # 清单文件
```

### 6.2 Manifest 文件

```json
file appendonly.aof.1.base.rdb seq 1 type b
file appendonly.aof.1.incr.aof seq 1 type h
file appendonly.aof.2.incr.aof seq 2 type h
```

### 6.3 重写流程变化

1. 创建新的 BASE 文件（RDB 格式）
2. 重写期间的增量写入新的 INCR 文件
3. 更新 manifest 文件（原子替换）
4. 异步删除旧的 BASE 和 INCR 文件

**优势**：

- 不再需要将增量命令追加到重写后的文件
- 重写完成后只需更新 manifest，无需修改数据文件
- 减少了重写期间的内存占用

## 7. 最佳实践

### 7.1 生产环境推荐配置

```redis
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### 7.2 场景选择

| 场景         | 推荐方案            | 理由               |
| ------------ | ------------------- | ------------------ |
| 数据安全优先 | 混合持久化          | 兼顾安全和恢复速度 |
| 纯缓存       | 禁用持久化          | 最大化性能         |
| 备份为主     | RDB + 定时归档      | 文件紧凑，便于传输 |
| 金融/支付    | 混合 + always fsync | 最高数据安全       |

### 7.3 监控要点

```redis
# 查看持久化状态
INFO Persistence

# 关键指标
# aof_current_size: 当前 AOF 文件大小
# aof_base_size: 上次重写后的大小
# aof_rewrite_in_progress: 是否正在重写
# aof_last_bgrewrite_status: 上次重写状态
```
