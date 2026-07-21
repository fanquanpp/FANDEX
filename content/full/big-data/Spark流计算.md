---
order: 14
title: 'Spark-Streaming'
module: 'big-data'
category: data
difficulty: intermediate
description: 'Spark Streaming流处理原理、DStream、Structured Streaming、窗口操作与Exactly-Once语义。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'big-data/MapReduce编程模型'
  - 'big-data/Spark核心'
  - 'big-data/Hive数据仓库'
  - 'big-data/HBase列族数据库'
prerequisites: []
---

## 1. Spark Streaming概述

Spark Streaming 是 Spark 生态中的**微批处理**流计算组件，将实时数据流按时间间隔切分为一系列**离散化流（DStream）**，每批数据作为 RDD 处理。

### 1.1 微批处理模型

```
实时数据流
    │
    ▼
┌─────────────────────────────────────────┐
│  t1批次    t2批次    t3批次    t4批次    │
│  [0-1s]   [1-2s]   [2-3s]   [3-4s]    │
│    │         │         │         │      │
│    ▼         ▼         ▼         ▼      │
│  RDD1      RDD2      RDD3      RDD4     │
└─────────────────────────────────────────┘
```

- **批处理间隔（Batch Interval）**：数据切分的时间窗口（如1秒、5秒）
- **延迟**：秒级（取决于批处理间隔）
- **吞吐量**：高（利用 Spark 批处理引擎）

### 1.2 DStream抽象

DStream（Discretized Stream）是 Spark Streaming 的核心抽象，表示**连续的数据流**：

```
DStream = RDD序列
DStream[t] = 时间区间 [t, t+interval) 内的数据对应的RDD
```

DStream 操作会转化为底层 RDD 操作：

```
DStream.map(f) → 每个RDD.map(f)
DStream.filter(f) → 每个RDD.filter(f)
DStream.reduceByKey(f) → 每个RDD.reduceByKey(f)
```

## 2. DStream操作

### 2.1 转换操作

| 算子          | 说明        | 示例                                   |
| :------------ | :---------- | :------------------------------------- |
| `map`         | 逐元素转换  | `ds.map(x => x * 2)`                   |
| `flatMap`     | 展平转换    | `ds.flatMap(x => x.split(" "))`        |
| `filter`      | 过滤        | `ds.filter(x => x > 0)`                |
| `reduceByKey` | 按Key聚合   | `ds.reduceByKey(_ + _)`                |
| `join`        | 流关联      | `ds1.join(ds2)`                        |
| `transform`   | 任意RDD操作 | `ds.transform(rdd => rdd.sortByKey())` |

### 2.2 窗口操作

窗口操作基于**滑动窗口**对多个批次的数据进行聚合：

$$\text{Window}(t) = \bigcup_{i=t-\text{windowLength}+1}^{t} \text{DStream}[i]$$

| 参数          | 说明                             |
| :------------ | :------------------------------- |
| windowLength  | 窗口长度（必须为批间隔的整数倍） |
| slideInterval | 滑动间隔（默认等于批间隔）       |

```python
# 每5秒统计最近30秒的词频
wordCounts = words.reduceByKeyAndWindow(
    lambda a, b: a + b,        # reduce函数
    lambda a, b: a - b,        # inverseReduce函数（优化）
    windowDuration=30,         # 窗口长度
    slideDuration=5            # 滑动间隔
)
```

**窗口操作类型**：

| 算子                    | 说明                |
| :---------------------- | :------------------ |
| `window`                | 返回窗口内的DStream |
| `countByWindow`         | 窗口内元素计数      |
| `reduceByWindow`        | 窗口内聚合          |
| `reduceByKeyAndWindow`  | 窗口内按Key聚合     |
| `countByValueAndWindow` | 窗口内按值计数      |

### 2.3 输出操作

```python
# 打印前10个元素
dstream.pprint()

# 保存到文件
dstream.saveAsTextFiles("prefix", "suffix")

# ForeachRDD：最灵活的输出方式
dstream.foreachRDD(lambda rdd: rdd.foreach(process))
```

## 3. Structured Streaming

Structured Streaming 是 Spark 2.x 引入的**高级流处理API**，基于 DataFrame/SQL，提供更简洁的编程模型和更强的优化能力。

### 3.1 核心模型

**连续处理模型**：将流数据视为一个**无界表**，新数据不断追加到表末尾：

```
无界输入表
┌──────┬───────┬──────────┐
│ key  │ value │ timestamp│
├──────┼───────┼──────────┤
│  A   │  10   │ 10:00:01 │  ← 批次1
│  B   │  20   │ 10:00:02 │
├──────┼───────┼──────────┤
│  A   │  30   │ 10:00:03 │  ← 批次2
│  C   │  40   │ 10:00:04 │
├──────┼───────┼──────────┤
│ ...  │  ...  │   ...    │  ← 持续追加
└──────┴───────┴──────────┘
        │
        ▼ 查询
结果表（Result Table）
```

### 3.2 编程示例

```python
# 从Kafka读取
df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "topic1") \
    .load()

# 处理
wordCounts = df.select(
    explode(split(df.value, " ")).alias("word")
).groupBy("word").count()

# 输出
query = wordCounts.writeStream \
    .outputMode("complete") \
    .format("console") \
    .trigger(processingTime="10 seconds") \
    .start()
```

### 3.3 输出模式

| 模式         | 说明           | 适用场景                 |
| :----------- | :------------- | :----------------------- |
| **Append**   | 只输出新增行   | 无聚合查询、事件时间窗口 |
| **Complete** | 输出整个结果表 | 聚合查询                 |
| **Update**   | 只输出变更行   | 聚合查询、需要增量更新   |

### 3.4 事件时间与水印

**事件时间（Event Time）**：数据实际产生的时间，而非处理时间。

**水印（Watermark）**：处理迟到数据的机制，设定最大允许延迟：

$$\text{Watermark} = \max(\text{eventTime}) - \text{delayThreshold}$$

```python
df.withWatermark("timestamp", "10 minutes") \
    .groupBy(window("timestamp", "5 minutes", "1 minute")) \
    .count()
```

- 水印之前的数据：正常处理
- 水印之后但未超时的数据：可能更新结果
- 超过水印+延迟的数据：丢弃

## 4. 容错与Exactly-Once语义

### 4.1 Checkpoint机制

```python
# 启用Checkpoint
ssc.checkpoint("hdfs://checkpoint-dir")

# Structured Streaming Checkpoint
query = df.writeStream \
    .option("checkpointLocation", "hdfs://checkpoint-dir") \
    .start()
```

Checkpoint 存储：

- 元数据：DStream DAG、配置、操作
- 数据：已处理的 Offset 范围

### 4.2 语义保证

| 语义          | 说明         | 实现方式          |
| :------------ | :----------- | :---------------- |
| At Most Once  | 最多处理一次 | 不做重试          |
| At Least Once | 至少处理一次 | 重试 + Checkpoint |
| Exactly Once  | 精确一次     | 幂等写入 + 事务   |

**Structured Streaming Exactly-Once**：

- Source 支持 Offset 管理（如 Kafka Commit）
- Sink 支持事务写入
- Checkpoint 记录处理进度

## 5. 性能调优

### 5.1 关键参数

| 参数                                            | 说明           | 建议           |
| :---------------------------------------------- | :------------- | :------------- |
| `spark.streaming.batchInterval`                 | 批处理间隔     | 1~5秒          |
| `spark.streaming.backpressure.enabled`          | 背压机制       | true           |
| `spark.streaming.kafka.maxRatePerPartition`     | 每分区最大速率 | 根据吞吐量调整 |
| `spark.streaming.blockInterval`                 | Block间隔      | 200ms          |
| `spark.streaming.receiver.writeAheadLog.enable` | 预写日志       | 生产环境true   |

### 5.2 调优策略

1. **合理设置批间隔**：确保处理时间 < 批间隔
2. **启用背压**：动态调整数据摄入速率
3. **Kafka Direct Approach**：避免 Receiver 模式的单点瓶颈
4. **序列化优化**：使用 Kryo 序列化
5. **并行度调整**：Receiver 数量 = Kafka 分区数
