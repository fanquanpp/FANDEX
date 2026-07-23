---
order: 18
title: Flink流处理
module: 'big-data'
category: data
difficulty: advanced
description: 'Flink流处理架构、窗口机制、水位线、状态管理、Checkpoint与Exactly-Once保证。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'big-data/HBase列族数据库'
  - 'big-data/Kafka消息队列'
  - 'big-data/数据湖'
  - 'big-data/Zookeeper协调服务'
prerequisites: []
---

## 1. Flink架构与核心概念

Apache Flink 是一个**有状态的流处理框架**，原生支持流处理，批处理被视为流处理的特例。

### 1.1 核心特性

| 特性         | 说明                       |
| :----------- | :------------------------- |
| 真正的流处理 | 逐条处理，非微批           |
| 有状态计算   | 内置状态管理，支持增量计算 |
| Exactly-Once | 端到端精确一次语义         |
| 事件时间     | 基于数据产生时间处理       |
| 流批一体     | DataStream API统一流批     |

### 1.2 运行架构

```
┌──────────────────────────────────────────────┐
│                JobManager                     │
│  ┌────────────┐  ┌────────────────────────┐  │
│  │ Dispatcher │  │  ResourceManager       │  │
│  └────────────┘  └────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  JobMaster (每个Job一个)               │  │
│  │  ├── ExecutionGraph                    │  │
│  │  └── CheckpointCoordinator             │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│TaskManager│ │TaskManager│ │TaskManager│
│ Slot 0   │ │ Slot 0   │ │ Slot 0   │
│ Slot 1   │ │ Slot 1   │ │ Slot 1   │
│ Task A   │ │ Task C   │ │ Task E   │
│ Task B   │ │ Task D   │ │ Task F   │
└──────────┘ └──────────┘ └──────────┘
```

### 1.3 作业执行层次

$$\text{StreamGraph} \rightarrow \text{JobGraph} \rightarrow \text{ExecutionGraph} \rightarrow \text{Physical Execution}$$

| 层次           | 说明                                     |
| :------------- | :--------------------------------------- |
| StreamGraph    | 用户API生成的逻辑图                      |
| JobGraph       | 优化后提交给JobManager的图（算子链合并） |
| ExecutionGraph | 并行化后的执行图                         |
| Physical       | 实际运行在TaskManager上的任务            |

## 2. 窗口机制

窗口是流处理中**将无限流切割为有限流**的核心机制。

### 2.1 窗口类型

```
滚动窗口 (Tumbling Window):
|──── 5s ────|──── 5s ────|──── 5s ────|

滑动窗口 (Sliding Window):
|──── 5s ────|
   |──── 5s ────|
      |──── 5s ────|

会话窗口 (Session Window):
|── 3s ──|  gap  |──── 5s ────|  gap  |── 2s ──|

全局窗口 (Global Window):
|────────────────── 无限 ──────────────────|
```

### 2.2 窗口API

```java
// 滚动窗口
dataStream.keyBy(t -> t.key)
    .window(TumblingEventTimeWindows.of(Time.seconds(5)));

// 滑动窗口
dataStream.keyBy(t -> t.key)
    .window(SlidingEventTimeWindows.of(Time.seconds(5), Time.seconds(1)));

// 会话窗口
dataStream.keyBy(t -> t.key)
    .window(EventTimeSessionWindows.withGap(Time.minutes(10)));

// 计数窗口
dataStream.keyBy(t -> t.key)
    .countWindow(100);  // 每100条触发
```

### 2.3 窗口触发器

| 触发器                     | 说明                         |
| :------------------------- | :--------------------------- |
| EventTimeTrigger           | 水位线超过窗口结束时间触发   |
| ProcessingTimeTrigger      | 处理时间超过窗口结束时间触发 |
| ContinuousEventTimeTrigger | 持续事件时间触发             |
| CountTrigger               | 元素计数触发                 |
| PurgingTrigger             | 触发后清除窗口状态           |

## 3. 水位线（Watermark）

水位线是 Flink 处理**事件时间**和**迟到数据**的核心机制。

### 3.1 水位线定义

水位线是一个**时间戳**，表示**到此时间点之前的所有数据应该已经到达**：

$$W(t) = \max(\text{eventTime}) - \text{allowedLateness}$$

```
事件时间轴:
  e1(3)  e2(5)  e3(4)  e4(8)  e5(7)  e6(10)
   │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼
───┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──→ 时间
   3  4  5  6  7  8  9  10

水位线: W=3  W=4  W=5  W=7  W=8  W=10
```

### 3.2 水位线生成策略

```java
// 有序流（单调递增）
WatermarkStrategy.forMonotonousTimestamps()

// 乱序流（允许延迟）
WatermarkStrategy.forBoundedOutOfOrderness(Duration.ofSeconds(5))

// 自定义
WatermarkStrategy.forGenerator(ctx -> new PunctuatedWatermarkGenerator())
```

**有序流水位线**：

$$W_n = \max(\text{eventTime}_n)$$

**乱序流水位线**：

$$W_n = \max(\text{eventTime}_n) - \Delta$$

其中 $\Delta$ 为最大允许乱序时间。

### 3.3 迟到数据处理

```
水位线 W=10
│
├── eventTime <= 10 → 正常处理
├── 10 < eventTime <= 10 + allowedLateness → 侧输出（可更新结果）
└── eventTime > 10 + allowedLateness → 丢弃
```

```java
OutputTag<Event> lateEvents = new OutputTag<Event>("late-events"){};

dataStream.keyBy(t -> t.key)
    .window(TumblingEventTimeWindows.of(Time.seconds(5)))
    .allowedLateness(Time.minutes(1))
    .sideOutputLateData(lateEvents)
    .process(new MyProcessFunction());

// 获取迟到数据
DataStream<Event> lateStream = result.getSideOutput(lateEvents);
```

## 4. 状态管理

### 4.1 状态类型

| 类型           | 说明             | 示例           |
| :------------- | :--------------- | :------------- |
| Keyed State    | 绑定到Key的状态  | 每个用户的计数 |
| Operator State | 绑定到算子的状态 | Kafka Offset   |

**Keyed State 分类**：

| State            | 说明               | 用途   |
| :--------------- | :----------------- | :----- |
| ValueState       | 单值状态           | 计数器 |
| ListState        | 列表状态           | 缓冲区 |
| MapState         | 映射状态           | 去重   |
| ReducingState    | 聚合状态           | 累加   |
| AggregatingState | 聚合状态（IN≠OUT） | 均值   |

### 4.2 状态后端

| 后端                        | 存储            | 适用场景           |
| :-------------------------- | :-------------- | :----------------- |
| HashMapStateBackend         | TaskManager内存 | 小状态、低延迟     |
| EmbeddedRocksDBStateBackend | 本地RocksDB     | 大状态、可溢写磁盘 |

```java
// 配置RocksDB状态后端
env.setStateBackend(new EmbeddedRocksDBStateBackend());
env.getCheckpointConfig().setCheckpointStorage("hdfs://checkpoints");
```

## 5. Checkpoint与容错

### 5.1 Checkpoint机制

Flink 基于 **Chandy-Lamport 算法**的分布式快照实现容错：

```
Source-1 ──→ Map ──→ Sink
Source-2 ──→ Map ──→ Sink

Checkpoint Barrier注入:
Source-1 ──|B1|──→ Map ──|B1|──→ Sink
Source-2 ──|B1|──→ Map ──|B1|──→ Sink

所有算子收到Barrier后保存状态快照
```

**流程**：

1. JobManager 向所有 Source 注入 **Checkpoint Barrier**
2. Barrier 随数据流向下流动
3. 算子收到 Barrier 后**对齐**（所有输入的Barrier到齐）
4. 对齐后**保存状态快照**到持久化存储
5. 向下游转发 Barrier
6. 所有算子完成，Checkpoint 完成

### 5.2 Checkpoint配置

```java
CheckpointConfig config = env.getCheckpointConfig();

// 开启Checkpoint，间隔1秒
env.enableCheckpointing(1000);

// 模式：精确一次 vs 至少一次
config.setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);

// 超时时间
config.setCheckpointTimeout(60000);

// 最小间隔（防止Checkpoint过于频繁）
config.setMinPauseBetweenCheckpoints(500);

// 并发Checkpoint数
config.setMaxConcurrentCheckpoints(1);

// 保留策略
config.setExternalizedCheckpointCleanup(
    ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);

// 允许的Checkpoint失败次数
config.setTolerableCheckpointFailureNumber(3);
```

### 5.3 Savepoint

Savepoint 是**手动触发的、可迁移的**Checkpoint：

```bash
# 触发Savepoint
flink savepoint <jobId> [targetDirectory]

# 从Savepoint恢复
flink run -s <savepointPath> -d <jarFile>

# 取消作业并触发Savepoint
flink cancel -s [targetDirectory] <jobId>
```

### 5.4 端到端Exactly-Once

实现端到端Exactly-Once需要**两阶段提交（2PC）**：

```
1. Checkpoint Barrier 到达 Sink
2. Sink 开启事务 → 写入外部系统
3. 所有算子完成状态快照
4. JobManager 确认 Checkpoint 完成
5. Sink 提交事务
```

**支持Exactly-Once的Sink**：Kafka、HDFS（通过两阶段提交）、数据库（通过XA事务）。

## 6. Flink SQL

```sql
-- 创建Kafka源表
CREATE TABLE orders (
    order_id BIGINT,
    user_id BIGINT,
    amount DECIMAL(10, 2),
    order_time TIMESTAMP(3),
    WATERMARK FOR order_time AS order_time - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'orders',
    'properties.bootstrap.servers' = 'localhost:9092',
    'format' = 'json'
);

-- 窗口聚合查询
SELECT
    window_start,
    window_end,
    user_id,
    SUM(amount) AS total_amount,
    COUNT(*) AS order_count
FROM TABLE(
    HOP(TABLE orders, DESCRIPTOR(order_time), INTERVAL '1' HOUR, INTERVAL '24' HOUR)
)
GROUP BY window_start, window_end, user_id;
```
