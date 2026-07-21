---
order: 12
title: MapReduce
module: 'big-data'
category: data
difficulty: intermediate
description: MapReduce编程模型、Shuffle机制、Combiner优化、数据流与性能调优。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'big-data/大数据概述'
  - 'big-data/HDFS分布式文件系统'
  - 'big-data/Spark核心'
  - 'big-data/Spark流计算'
prerequisites: []
---

## 1. MapReduce编程模型

MapReduce 是一种**分而治之**的分布式计算模型，将复杂计算分解为 Map（映射）和 Reduce（归约）两个阶段。

### 1.1 核心思想

```
输入数据 ──→ [Split] ──→ [Map] ──→ [Shuffle] ──→ [Reduce] ──→ 输出
              分片       映射       洗牌         归约
```

**函数签名**：

$$\text{Map}: (k_1, v_1) \rightarrow \text{list}(k_2, v_2)$$

$$\text{Reduce}: (k_2, \text{list}(v_2)) \rightarrow \text{list}(k_3, v_3)$$

### 1.2 WordCount 示例

```java
public class WordCount {
    public static class TokenizerMapper
        extends Mapper<Object, Text, Text, IntWritable> {

        private final static IntWritable one = new IntWritable(1);
        private Text word = new Text();

        public void map(Object key, Text value, Context context)
            throws IOException, InterruptedException {
            StringTokenizer itr = new StringTokenizer(value.toString());
            while (itr.hasMoreTokens()) {
                word.set(itr.nextToken());
                context.write(word, one);
            }
        }
    }

    public static class IntSumReducer
        extends Reducer<Text, IntWritable, Text, IntWritable> {

        private IntWritable result = new IntWritable();

        public void reduce(Text key, Iterable<IntWritable> values,
                           Context context)
            throws IOException, InterruptedException {
            int sum = 0;
            for (IntWritable val : values) {
                sum += val.get();
            }
            result.set(sum);
            context.write(key, result);
        }
    }
}
```

**数据流**：

```
输入: "hello world hello hadoop"

Map阶段:
  "hello" → (hello, 1)
  "world" → (world, 1)
  "hello" → (hello, 1)
  "hadoop" → (hadoop, 1)

Shuffle阶段:
  (hello, [1, 1])
  (world, [1])
  (hadoop, [1])

Reduce阶段:
  (hello, 2)
  (world, 1)
  (hadoop, 1)
```

## 2. Shuffle机制详解

Shuffle 是 MapReduce 的**核心**，连接 Map 和 Reduce 阶段，包括分区、排序、分组和数据传输。

### 2.1 Shuffle全流程

```
Map端                          Reduce端
┌─────────────────────┐        ┌─────────────────────┐
│  Map输出            │        │  Copy               │
│    │                │        │  从Map端拉取数据     │
│    ▼                │        │    │                │
│  Partition          │        │    ▼                │
│  按Key分区          │  网络传输  │  Merge             │
│    │                │ ──────→ │  合并排序           │
│    ▼                │        │    │                │
│  Sort               │        │    ▼                │
│  内存排序           │        │  Group              │
│    │                │        │  按Key分组           │
│    ▼                │        │    │                │
│  Spill              │        │    ▼                │
│  溢写到磁盘         │        │  Reduce             │
│    │                │        │  调用Reduce函数      │
│    ▼                │        └─────────────────────┘
│  Merge              │
│  合并溢写文件       │
└─────────────────────┘
```

### 2.2 Map端Shuffle

1. **环形缓冲区**：Map 输出写入内存环形缓冲区（默认100MB）
2. **分区（Partition）**：根据 `hash(key) % numReduceTasks` 决定数据归属
3. **排序（Sort）**：缓冲区达到阈值（0.8）时，对分区内的数据按 Key 排序
4. **溢写（Spill）**：排序后的数据写入磁盘临时文件
5. **合并（Merge）**：所有溢写文件合并为一个已排序的输出文件

### 2.3 Reduce端Shuffle

1. **拉取（Copy）**：Reduce 任务从所有 Map 输出中拉取属于自己的分区数据
2. **合并排序（Merge Sort）**：对拉取的数据进行归并排序
3. **分组（Group）**：相同 Key 的 Value 组成迭代器传给 Reduce 函数

### 2.4 分区策略

默认分区函数：

$$\text{partition} = \text{hash}(k_2) \bmod R$$

其中 $R$ 为 Reduce 任务数。自定义分区器需实现 `Partitioner` 接口：

```java
public class CustomPartitioner extends Partitioner<Text, IntWritable> {
    @Override
    public int getPartition(Text key, IntWritable value, int numReduceTasks) {
        if (key.toString().startsWith("A-M")) return 0;
        else return 1 % numReduceTasks;
    }
}
```

## 3. Combiner优化

### 3.1 Combiner原理

Combiner 是 Map 端的**局部 Reduce**，在数据发送到 Reduce 端之前进行预聚合，减少网络传输量。

```
无Combiner:
  Map: (hello, 1), (hello, 1), (hello, 1) ──网络──→ Reduce: (hello, [1,1,1]) → (hello, 3)

有Combiner:
  Map: (hello, 1), (hello, 1), (hello, 1) → Combiner: (hello, 3) ──网络──→ Reduce: (hello, [3]) → (hello, 3)
```

### 3.2 Combiner使用约束

- **幂等性**：Combiner 的输入输出类型必须一致
- **可交换可结合**：操作必须满足交换律和结合律（如求和、最大值）
- **不保证执行**：框架可能不调用 Combiner，或调用多次
- **不适合求平均数**：$\text{avg}(\text{avg}(a,b), c) \neq \text{avg}(a,b,c)$

## 4. MapReduce执行流程

### 4.1 完整执行阶段

```
1. 作业提交
   Client → JobTracker/ResourceManager

2. 作业初始化
   创建Job对象，获取InputSplit列表

3. 任务分配
   TaskTracker/NodeManager领取Map/Reduce任务

4. 任务执行
   Map Task: InputSplit → Map → Shuffle
   Reduce Task: Shuffle → Sort → Reduce → Output

5. 作业完成
   所有任务完成，作业状态更新为SUCCEEDED
```

### 4.2 InputFormat与Split

| InputFormat             | 说明                  |
| :---------------------- | :-------------------- |
| TextInputFormat         | 按行读取，Key为偏移量 |
| KeyValueTextInputFormat | 按分隔符分割Key/Value |
| NLineInputFormat        | 每N行一个Split        |
| CombineFileInputFormat  | 合并小文件            |

Split 大小计算：

$$\text{splitSize} = \max(\text{minSize}, \min(\text{maxSize}, \text{blockSize}))$$

## 5. 性能调优

### 5.1 关键调优参数

| 参数                                      | 说明             | 建议值 |
| :---------------------------------------- | :--------------- | :----- |
| `mapreduce.task.io.sort.mb`               | Map端排序缓冲区  | 256MB  |
| `mapreduce.map.sort.spill.percent`        | 溢写阈值         | 0.8    |
| `mapreduce.reduce.shuffle.parallelcopies` | Reduce并行拉取数 | 5~10   |
| `mapreduce.reduce.input.buffer.percent`   | Reduce内存缓冲   | 0.7    |
| `mapreduce.map.memory.mb`                 | Map任务内存      | 2048MB |
| `mapreduce.reduce.memory.mb`              | Reduce任务内存   | 4096MB |

### 5.2 常见优化策略

1. **小文件合并**：使用 CombineFileInputFormat 或预处理合并
2. **数据压缩**：Map 输出使用 Snappy，Reduce 输出使用 Gzip
3. **Combiner 使用**：Map 端预聚合减少网络 IO
4. **推测执行**：慢任务启动备份任务（`mapreduce.map.speculative`）
5. **JVM 重用**：复用 JVM 减少启动开销
