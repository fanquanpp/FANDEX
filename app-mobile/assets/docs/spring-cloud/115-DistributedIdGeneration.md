---
order: 140
title: 分布式 ID 生成
module: 'spring-cloud'
category: 后端技术
difficulty: beginner
description: UUID/雪花/号段三种方案取舍、雪花位分配与时钟回拨处理、workerId 多机分配
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：分布式唯一 ID 生成——UUID、雪花算法（Snowflake）、号段模式。
- 解决什么问题：分库分表后自增主键会撞号；需要"全局唯一、趋势递增（对索引友好）、高可用、高性能"的 ID 生成方案，并为幂等设计提供业务号来源。
- 什么时候用到：分库分表订单号、营销活动发券号、跨服务业务流水号；以及《分布式锁与幂等》第 4 节唯一业务号（biz_no）的生成源头。
- 前置：单库自增主键的局限、Redis 基本操作（号段方案用）、二进制位运算（雪花方案用）。

## 前置知识

- MySQL InnoDB 主键的聚簇索引特性（为什么主键乱序伤性能）；
- 《分布式锁与幂等》第 4 节：唯一业务号 + 去重表是幂等的地基，本篇回答"号从哪来"。

## 学习目标

- 能对比 UUID/雪花/号段三种方案在唯一性、有序性、性能、依赖上的取舍；
- 理解雪花算法的 64 位结构、每段位数的含义与时钟回拨的两种工程处理；
- 能为多机房部署规划 workerId 分配；
- 会实现号段模式（含双 buffer 优化）并说出它与雪花的分工。

## 1. 你现在要解决什么问题

单库时代订单表用 `AUTO_INCREMENT`，简单可靠。分库分表之后：

```text
订单库拆成 8 库 64 表，每张表的 AUTO_INCREMENT 都从 1 开始
     -> 订单 A 在 db0 是第 100 号，订单 B 在 db1 也是第 100 号
     -> 主键冲突、全局排序混乱、跨库合并报表时 ID 无法区分
```

需求清单由此确定：**全局唯一**（硬要求）、**趋势递增**（InnoDB 聚簇索引按主键物理有序插入，乱序 UUID 导致页分裂、写放大）、**分布式下不依赖单点**（生成器挂了订单没法下）、**每秒数十万级吞吐**。没有方案四项全满分，取舍就是本篇的主线。

## 2. 三种方案速览

| 维度 | UUID | 雪花算法 | 号段模式 |
| --- | --- | --- | --- |
| 唯一性 | 全球唯一（随机碰撞概率忽略） | 同 worker 内毫秒级唯一 | 发号器保证段内唯一 |
| 有序性 | 完全无序 | 趋势递增（毫秒时间戳打底） | 段内连续、段间递增 |
| 性能 | 本地生成，极高 | 本地生成，单机 40 万+/秒 | 依赖一次 DB/Redis 往返，之后本地发号 |
| 外部依赖 | 无 | 无（但需时钟） | DB 或 Redis（双 buffer 后低频） |
| 长度 | 36 字符（128 位） | 64 位整数 | 64 位整数 |
| 主要风险 | 索引写放大、信息泄漏（v1 含 MAC） | 时钟回拨、workerId 分配 | 发号器宕机需高可用、段浪费 |

**讲解：**

1. UUID 的"无序"不是风格问题而是性能问题：InnoDB 按主键有序组织数据页，随机主键让每次插入都可能写到任意页，引发页分裂与缓冲池命中率下降。UUID 还有 36 字符的空间开销（相比 8 字节 bigint）。它的正确位置：**traceId、临时文件名**这类"只求唯一不求入库排序"的场景。
2. 雪花的正确位置：无外部依赖、本地生成、趋势有序——绝大多数业务 ID 的默认选择。
3. 号段的正确位置：要求**近似连续**（报表归档友好）或不想引入时钟依赖时的选择；代价是发号器自身要高可用。
4. 选型不是三选一：大厂常见形态是"业务 ID 用雪花、全局 traceId 用 UUID、财务流水用号段"，按场景分工。

## 3. 雪花算法：64 位怎么切

Twitter 开源的 Snowflake 结构（标准切法）：

```text
0 | 0000000000 0000000000 0000000000 0000000000 0 | 00000 00000 | 000000000000
  |
  1 位符号位（恒 0，保证正数）
   -- 41 位毫秒时间戳（相对自定义纪元，可用约 69 年）--
   -- 10 位机器 ID（5 位机房 + 5 位机器，共 1024 个 worker）--
   -- 12 位序列号（同一毫秒内 0-4095 循环）--
```

核心实现骨架：

```java
public class SnowflakeIdGenerator {

    private final long epoch = 1735689600000L;   // 自定义纪元：2025-01-01，晚启动省 41 位余量
    private final long workerIdBits = 10L;
    private final long sequenceBits = 12L;

    private final long workerId;                 // 0 ~ 1023
    private long sequence = 0L;
    private long lastTimestamp = -1L;

    public synchronized long nextId() {
        long timestamp = System.currentTimeMillis();

        if (timestamp < lastTimestamp) {
            // 时钟回拨：见下方两种工程选择的讨论
            throw new IllegalStateException(
                "clock moved back " + (lastTimestamp - timestamp) + "ms, refuse to issue");
        }

        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & 4095;            // 同毫秒内序列推进
            if (sequence == 0) {                          // 本毫秒发满 4096 个
                timestamp = waitNextMillis(lastTimestamp); // 自旋等下一毫秒
            }
        } else {
            sequence = 0L;
        }

        lastTimestamp = timestamp;
        return ((timestamp - epoch) << 22)   // 时间戳左移 22 位（腾出机器+序列位）
             | (workerId << 12)              // 机器 ID 左移 12 位
             | sequence;
    }

    private long waitNextMillis(long last) {
        long ts = System.currentTimeMillis();
        while (ts <= last) ts = System.currentTimeMillis();
        return ts;
    }
}
```

**讲解：**

1. `synchronized` 让同一 JVM 内发号串行——单机每秒 400 万的上限远高于业务需求，锁开销可忽略；真正想榨性能时用无锁 CAS，但先把正确性做对。
2. 位运算三行就是"拼装"：时间戳占高位（保证趋势递增）、机器 ID 居中（隔离不同机器）、序列垫底（毫秒内区分）。**位数是预算**：41 位约 69 年（从纪元起算）、10 位 1024 台、12 位单毫秒 4096 个——业务要"百年不溢出"就得从纪元或位分配上省，要"单毫秒更多并发"就得从机器位里抠，没有免费午餐。
3. 纪元（epoch）用自定义的近期时间而非 Twitter 的 2010 年——不是必须，但晚的纪元让 41 位余量更长；**一旦上线不可更改**，改纪元等于历史 ID 全部换算错位。
4. 序列溢出自旋 `waitNextMillis` 是"单毫秒超 4096 个"的兜底：并发极高时它表现为偶发毛刺，监控上能看到；持续毛刺说明该扩 workerId 或本地预取（见第 5 节号段的启示）。

## 4. 时钟回拨：抛异常还是等待

时钟回拨 = NTP 校时让 `System.currentTimeMillis()` 变小。此时若继续按"当前时间"发号，新 ID 的时间段可能与已发 ID 重叠 -> 撞号。两种工程选择：

1. **直接抛异常**（上面代码的写法）：最安全，发不出号业务快速失败。代价：回拨期间服务不可发号；回拨幅度大时（运维手动改时间）可能长时间不可用。适合金融、订单这类"宁可不可用不可撞号"的场景。
2. **等待追平**：回拨幅度小（NTP 步进通常在毫秒级到秒级）时自旋等待时钟追上 lastTimestamp 再发号。可用性好，但大回拨时线程堆积。常见折中：**小回拨等待 + 大回拨抛异常**（阈值如 2 秒），并把等待时间上报监控。
3. 还有一类是"扩展位吸收回拨"（借未来毫秒的序列位），实现复杂、只值得在基础设施团队里做；业务团队用前两种即可。

**workerId 多机分配**是另一处事故高发地：两台机器 workerId 相同 -> 同一毫秒可能发出相同 ID。分配策略按运维能力选：

- **配置文件静态指定**：最简单，靠人肉纪律，k8s 里用 StatefulSet 的 ordinal（pod-0 -> workerId 0）；
- **注册中心分配**：启动时到 ZooKeeper/Nacos 注册临时节点领号，宕机自动回收——灵活但引入依赖；
- **数据库表分配**：启动事务 `UPDATE worker_id SET owner=me WHERE owner IS NULL`，简单可靠；
- 多机房部署：5 位机房位天然隔离——机房 A 用 0-31、机房 B 用 32-63 的 workerId 段，物理上杜绝跨机房撞号；单机房标准时把 10 位全给机器。

## 5. 号段模式：批量预取的思路

```sql
CREATE TABLE id_segment (
  biz_tag   VARCHAR(64) PRIMARY KEY COMMENT '业务标签：order/coupon/...',
  max_id    BIGINT      NOT NULL COMMENT '当前已发到的最大值',
  step      INT         NOT NULL DEFAULT 1000 COMMENT '号段长度',
  updated_at DATETIME   NOT NULL
) COMMENT = '号段发号表';
```

```java
@Transactional
public long nextSegment(String bizTag) {
    // UPDATE id_segment SET max_id = max_id + step, updated_at = now()
    //   WHERE biz_tag = ?            <- 行锁保证并发安全，事务结束才释放
    // SELECT max_id FROM id_segment WHERE biz_tag = ?
    long newMax = segmentMapper.bumpAndGet(bizTag, step);
    return newMax - step + 1;        // 本地拿到 [newMax-step+1, newMax] 区间，内存中依次发放
}
```

**讲解：**

1. 一次 DB 往返领 1000 个号，之后 999 次发号在内存完成——DB 压力降三个数量级，这就是号段抗高并发的原理。
2. **双 buffer 优化**：当前号段用到 10% 时异步预取下一个号段，避免"号段发尽时恰好赶上一个 DB 往返"的毛刺；美团开源的 Leaf 项目（https://github.com/Meituan-Dianping/Leaf ）是这套思路的成熟实现，同时提供雪花模式（号段与雪花二合一，workerId 由发号服务统一分配）。
3. 发号器是单点风险：发号表所在库不可用则全公司发不出号。缓解：发号表放独立小库做高可用、双 buffer 让短暂故障有缓冲、客户端本地残留号段可撑一会。
4. 逐行读 `bumpAndGet`：单条 UPDATE 自带行锁，`WHERE biz_tag` 决定不同业务互不阻塞——订单和优惠券各领各的段，事故半径隔离。
5. 段的浪费是接受的代价：服务重启，没发完的半段作废，ID 出现空洞——对"唯一性"无影响，只对"连续无洞"有洁癖的报表要提前知晓。

## 6. 真实场景三则

**场景一：分库分表订单号。** 8 库 64 表的订单系统用雪花 ID 做主键兼分片键：ID 高位是时间戳，按 ID 哈希取模路由等价于按时间大致均匀打散；同时趋势递增让 B+ 树顺序插入。配套纪律：**订单号对用户可见**时要把 64 位转成带业务前缀的字符串（如 `ORD` + 数字），防止暴露发号器结构；内部存储仍用 bigint。

**场景二：营销活动发券号。** 大促 0 点百万级发券，用号段模式（biz_tag=coupon，step=5000）：0 点前发号服务预热好双 buffer，活动开始后纯内存发号扛住峰值；券号近似连续让对账 SQL 可以按号段范围扫描。对比雪花的反例：某活动用单机雪花，0 点瞬间同毫秒并发超 4096，自旋等待造成发券接口毛刺——高峰场景"内存预取"天然优于"实时生成"。

**场景三：多机房 workerId 规划。** 同城双机房容灾部署，每机房各 200 台应用实例。规划：机房 A 用 workerId 0-255、机房 B 用 256-511（10 位里拿高 2 位当机房段），每机房内由注册中心临时节点分配低位。一次机房 A 的 NTP 故障把时钟拨快了 3 分钟后又被拨回——机房 A 全部实例因"大回拨抛异常"停止发号，但订单系统切换到机房 B 继续服务（机房位不同，绝无撞号）。这个案例里两个设计各自兜了一次底：机房位隔离 + 回拨抛异常快速失败。

## 7. 实验

单机实现雪花发号器并做三个观测：

1. 唯一性：多线程发 100 万个 ID，用 HashSet 验证无重复；
2. 趋势性：按生成顺序写入 TreeMap/数据库，验证严格递增；
3. 时钟回拨：用 `ReflectionTestUtils`/反射把 `lastTimestamp` 拨到未来 1 秒，观察 nextId 的行为，再实现"小回拨等待 + 大回拨抛异常"的折中版本。

先自己操作，再对照参考实现：

<details>
<summary>实验参考实现（折中版回拨处理）</summary>

```java
private static final long MAX_BACKWARD_MS = 2000L;

public synchronized long nextId() {
    long timestamp = System.currentTimeMillis();
    if (timestamp < lastTimestamp) {
        long offset = lastTimestamp - timestamp;
        if (offset <= MAX_BACKWARD_MS) {
            // 小回拨：等待追平（NTP 微调的常态），并上报观测
            log.warn("clock backward {}ms, waiting", offset);
            timestamp = waitNextMillis(lastTimestamp);
        } else {
            // 大回拨：拒绝发号，快速失败并告警（人工介入校时）
            meterRegistry.counter("snowflake.clock.backward.refused").increment();
            throw new IllegalStateException("clock moved back " + offset + "ms");
        }
    }
    // ...后续与第 3 节骨架一致
}
```

```java
// 唯一性验证（JUnit 形态）
@Test
void noDuplicateUnderConcurrency() throws Exception {
    SnowflakeIdGenerator gen = new SnowflakeIdGenerator(1);
    Set<Long> ids = ConcurrentHashMap.newKeySet();
    IntStream.range(0, 16).forEach(t ->
        executor.submit(() -> IntStream.range(0, 62_500)
            .forEach(i -> ids.add(gen.nextId()))));
    executor.shutdown();
    executor.awaitTermination(1, TimeUnit.MINUTES);
    assertEquals(1_000_000, ids.size());   // 16 线程 x 6.25 万，无重复
}
```

要点：a) 阈值 2 秒是示例，NTP 的正常步进幅度决定真实取值；b) 等待分支必须带监控打点——它可能是"机器时间不准"的前兆；c) 并发唯一性测试里 `synchronized` 让 100 万次发号约几百毫秒完成，这也顺带验证了性能余量。
</details>

## 8. 官方参考

- Twitter Snowflake 原始实现（Apache 2.0）：https://github.com/twitter-archive/snowflake
- 美团 Leaf（号段 + 雪花双模式，开源实现）：https://github.com/Meituan-Dianping/Leaf
- 百度 uid-generator（雪花变体，RingBuffer 预取思路）：https://github.com/baidu/uid-generator
- 本文三种方案的代码均为教学重写，未整段复用上述仓库代码。

## 自检

1. 为什么"趋势递增"是数据库主键的刚需而"严格连续"不是？
2. 雪花 64 位的每段预算是什么？单毫秒并发超过 4096 时会发生什么？
3. 时钟回拨的两种工程选择各自适合什么业务？折中方案的阈值怎么定？
4. 两台机器 workerId 相同会发生什么？列举三种分配策略与多机房的隔离做法。
5. 号段模式靠什么抗高并发？它的单点风险怎么缓解？
