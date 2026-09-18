---
order: 680
title: 分库分表中间件：数据量突破单机之后
module: 'mysql'
category: 数据库
difficulty: advanced
description: 分库分表中间件全景：先问要不要分片、分片键与路由策略设计、ShardingSphere 与 Vitess 对比选型、跨分片查询的四种化解手段与分布式 ID。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/660-PartitionedTable'
  - 'mysql/670-ShardingStrategy'
  - 'mysql/630-InnoDBCluster'
  - 'mysql/540-DistributedTransaction'
prerequisites:
  - 'mysql/660-PartitionedTable'
  - 'mysql/670-ShardingStrategy'
---

## 前置知识

- MySQL 原生分区表（[分区表](/mysql/660-PartitionedTable)）——分片的"库内版"，先理解它才明白为什么需要跨库；
- 分片策略概念（[分库分表策略](/mysql/670-ShardingStrategy)）——本篇专注中间件层。

## 先泼冷水：你可能不需要分库分表

分库分表是**用架构复杂度换容量**的重型手段，正确顺序永远是先榨干轻量方案：

```text
索引与 SQL 优化 → 读写分离 → 分区表 → 归档冷数据 → 缓存挡读 → 最后才是分库分表
```

触发分片的典型信号：单表数据量到亿级且持续增长、单机磁盘/写入 QPS 触顶、分区表也已不足以救。注意"千万行"不是必然信号——索引良好的千万级单表对 MySQL 只是轻负载。**没有容量数据的分片设计，大概率是过度架构**；反之真到了量级，早规划比晚补救便宜。

## 四种拆法与中间件的定位

| 拆法 | 做法 | 解决什么 |
| --- | --- | --- |
| 垂直分库 | 按业务域把表拆到不同库（订单库/用户库） | 微服务数据边界、单实例压力 |
| 垂直分表 | 大字段、低频列拆出去 | 行过宽、缓存效率 |
| 水平分表 | 同库内按规则拆成 orders_0 到 orders_N | 单表过大 |
| 水平分库 | 同一表的数据按规则散到多个实例 | 写入与容量触顶（终极手段） |

真正难的是**水平分库**——数据散到多个 MySQL 实例后，"SQL 该发往哪个库"的路由问题冒出来。中间件的全部价值就是让应用"感觉还在用一个数据库"：解析 SQL、按分片键路由、改写表名、聚合结果、处理跨分片事务。

## 分片键：整个方案最贵的一个决定

分片键一旦选定，迁移成本极高（等于数据重分布）。设计原则按优先级：

1. **绝大多数查询都带它**：路由靠它命中单片。订单系统选 `user_id`（买家查单是高频路径）而不选 `order_id`（只有精确查单才用）；
2. **分布均匀**：用 `user_id % 16` 这类哈希取模而非自增范围（范围分片会让新数据全砸在最后一片，热点显著）；
3. **避免跨片查询**：非分片键的查询会扇出到所有分片再聚合，规模越大越痛。

```yaml
# ShardingSphere-JDBC 典型配置：orders 按 user_id 取模散到 4 库 8 表
rules:
  - !SHARDING
    tables:
      orders:
        actualDataNodes: ds_${0..3}.orders_${0..1}
        tableStrategy:
          standard:
            shardingColumn: user_id
            shardingAlgorithmName: orders_mod
    shardingAlgorithms:
      orders_mod:
        type: MOD
        props:
          sharding-count: 8
```

主键也要换方案：分库后自增 ID 必然冲突，改用**雪花算法（Snowflake）**或号段模式生成全局 ID（配置里 `keyGenerateStrategy` 的职责）。

## 选型：ShardingSphere 与 Vitess

| 维度 | ShardingSphere | Vitess |
| --- | --- | --- |
| 出身 | Apache 顶级项目，国内主流 | YouTube 开源，CNCF 毕业项目 |
| 接入形态 | JDBC 嵌入应用（ShardingSphere-JDBC）或独立代理（Proxy） | 独立代理集群（VTGate），MySQL 生态的"分布式数据库外壳" |
| 侵入性 | JDBC 版随应用发布，语言绑定 Java | 应用无感知，任何语言经 MySQL 协议接入 |
| 运维复杂度 | 中（Proxy 版需独立集群） | 高（etcd/vtctld 等多组件，但动态 resharding 强） |
| 适合 | Java 技术栈、中等规模分片 | 超大规模、多语言、频繁在线扩缩容 |

一句话决策：**Java 栈 + 分片规模可控选 ShardingSphere-JDBC（零代理开销）；多语言、云原生、需要在线 re-sharding 选 Vitess**。MyCat 类老一代方案社区活跃度已明显衰退，新项目不建议入坑。

## 跨分片问题：四种化解手段

分片后的麻烦按出现频率排序：

```sql
-- 1. 广播表（全局表）：字典类小表每个分片各存一份， JOIN 本地完成
--    ShardingSphere: BROADCAST 表；Vitess: UNSHARDED keyspace

-- 2. 绑定表（ER 分片）：关联表用同一分片键，保证同 user 的订单和
--    订单明细落在同一分片，JOIN 不跨片
--    orders 与 order_detail 都按 user_id 分片 → 同路由

-- 3. 冗余字段：把高频 JOIN 的列冗余进主表（订单表冗余 user_name），
--    用一致性代价换查询代价

-- 4. 异构索引：跨片复杂查询不打主库，同步一份按另一维度分片的
--    副本库（如卖家维度），或走 ES/数仓
```

事务同理被拆解：跨分片的强一致事务代价高昂（分布式事务，见[分布式事务](/mysql/540-DistributedTransaction)），务实设计是**让单笔业务事务尽量落在单片内**（按 user_id 分片的天然优势），跨片场景用最终一致（本地消息表 + 补偿）替代 XA。

## 动手环节：最小分片实验

本地用 Docker 起两个 MySQL 实例 + ShardingSphere-Proxy，配置两条分片规则，然后观察路由行为：

```sql
-- 1. 插入不带分片键 → 报错（强制声明分片键，好设计）
INSERT INTO orders(order_id, user_id, amount) VALUES (1, 100, 9.9);

-- 2. 不同 user_id 路由到不同分片
INSERT INTO orders(order_id, user_id, amount) VALUES (1, 100, 9.9);  -- → ds_0
INSERT INTO orders(order_id, user_id, amount) VALUES (2, 201, 19.9); -- → ds_1

-- 3. 分片键等值查询 → 单片路由（看日志 actual SQL 只有一条）
SELECT * FROM orders WHERE user_id = 100;

-- 4. 非分片键查询 → 全路由（actual SQL 翻倍，聚合由中间件完成）
SELECT COUNT(*) FROM orders;
```

第 4 步的 actual SQL 日志值得盯着看：**每一条跨片查询的扇出倍数，就是未来生产的放大系数**——这正是"查询必须带分片键"纪律的视觉化。

## 常见困惑

**"分片后还能扩分片数吗？"**——取模分片扩容等于数据重分布（user_id % 8 改 % 16 后大部分数据要搬家）。工程解法：预分片（一开始就配 1024 逻辑分片映射到少量物理实例，扩容只搬逻辑片）、或选 Vitess 的在线 resharding、或一致性哈希思路。这是"分片键是最贵的决定"的另一层含义。

**"和分区表到底什么区别？"**——分区表是**一个 MySQL 实例内**的物理切分（索引仍全局、SQL 无感知、跨不了机器）；分库分表是**跨实例**的（容量与写入真正水平扩展，代价是 SQL 语义被拆散）。分区是止血，分片是截肢重造——顺序别搞反。

**"NewSQL（TiDB 等）是不是就不用分片了？"**——对很多场景确实是更优雅的答案：存储层自动分片、对应用呈现单库语义。代价是引入新数据库生态、运维复杂度与资源成本。新建系统值得把"直接上分布式数据库"纳入选型对比；存量 MySQL 体系则分库分表中间件仍是主流路径。

## 检验清单

- 能复述"先榨干轻量方案"的顺序与触发分片的真实信号；
- 会按三原则论证一个分片键选择，并说出取模优于范围的原因；
- 能对 ShardingSphere 与 Vitess 给出选型结论及理由；
- 用四种手段化解过跨片 JOIN 场景，理解"单片事务"设计纪律；
- 跑过最小分片实验，亲眼见过全路由的扇出放大。

## 下一步

数据层架构的最后一公里是多活与跨机房：回看[InnoDB ClusterSet](/mysql/630-InnoDBCluster) 的容灾层级，或进入安全篇[SSL 加密连接](/mysql/710-SSLEncryption)补全分片后链路加密。
