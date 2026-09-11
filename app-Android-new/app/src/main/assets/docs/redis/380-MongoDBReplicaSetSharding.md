---
order: 380
title: 副本集与分片架构
module: 'redis'
category: 数据库
difficulty: advanced
description: 副本集高可用与水平分片：oplog、选举、shard key 选型与数据分布。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'redis/350-MongoDBIndexPerformance'
prerequisites:
  - 'redis/360-MongoDBSchemaDesign'
---

## 0. 从单机到分片：演进路线（先读这里）

> 学习目标：复述副本集的三大机制（oplog、心跳、选举）；区分 Priority / Hidden / Delayed / Arbiter 四种成员角色；按业务场景组合 readPreference / readConcern / writeConcern；独立完成单机副本集搭建，并说出 shard key 选型的四条原则。

单机 MongoDB 是绝大多数人的起点，但它有两个天花板：**机器坏了服务就停**（可用性），**一台机器装不下、写不动**（容量与吞吐）。副本集解决第一个问题，分片集群解决第二个。这一篇先拆开副本集看内部机制，再动手搭环境，最后进入分片的世界。

## 1. 三级演进：什么时候需要什么架构

| 阶段 | 解决什么 | 代价 |
| --- | --- | --- |
| 单机 mongod | 学习、原型、内部小工具 | 无高可用，故障即停服 |
| 副本集（一主多从） | 高可用、读扩展、容灾备份 | 写仍是单点；数据量受单机限制 |
| 分片集群 | 写吞吐与数据量的水平扩展 | 组件变多，shard key 选型不可轻易反悔，跨分片查询与事务更贵 |

判断口诀：**先上副本集保可用；当单机磁盘装不下、写吞吐到顶、热点数据撑不进内存时，才考虑分片。** 分片引入的复杂度（路由、再均衡、跨分片聚合）是实打实的运维成本，不要为"以后可能用上"提前分片。

## 2. 副本集原理：oplog、心跳与选举

副本集由一个主节点（PRIMARY）与若干从节点（SECONDARY）组成：所有写都进主节点，主节点把操作记录进 **oplog**（操作日志，一个固定大小的环形集合 `local.oplog.rs`），从节点持续拉取 oplog 并重放，最终达到与主节点一致。

```javascript
// 查看最近的 oplog 条目（local 库只读，绝不要往里写）
db.getSiblingDB("local").oplog.rs.find().sort({ $natural: -1 }).limit(3)

// 两条常用体检命令
rs.printReplicationInfo()           // oplog 窗口大小：能"回放"多长时间的操作
rs.printSecondaryReplicationInfo()  // 各从节点落后主节点多少
```

**故障检测与切换：**

1. **心跳**：成员之间默认每 2 秒互发心跳，用于感知彼此存活。
2. **选举**：主节点失联后，有投票权的成员发起选举，获得**多数派**票数的节点成为新主；默认约 10 秒完成切换（`electionTimeoutMillis` 可调）。因此副本集投票节点数必须是奇数——偶数票等于浪费一张票。
3. 成员数量：一个副本集最多约 50 个成员，其中只有 7 个拥有投票权；生产常用 3 节点或 5 节点。

```javascript
rs.status()  // 成员健康、角色、延迟的一览表，排障第一站
rs.conf()    // 当前配置：成员列表、优先级、隐藏、延迟等
```

## 3. 成员角色：Priority、Hidden、Delayed 与 Arbiter

| 角色 | 关键配置 | 用途 |
| --- | --- | --- |
| 普通成员 | 默认 | 参与投票、可被选为主、可承接读流量 |
| 零优先级 | `priority: 0` | 永不竞选主节点，只做数据冗余与读 |
| 隐藏节点 | `hidden: true`（需配 priority: 0） | 对客户端读路由不可见，专供备份、报表 |
| 延迟节点 | `secondaryDelaySecs`（如 3600） | 滞后一段时间重放 oplog，误删数据后的"后悔药" |
| 仲裁节点 | 不存数据，只投票 | 官方更推荐用带数据的奇数节点替代，新版本中已不推荐，以官方文档为准 |

```javascript
// 把 2 号成员设为"隐藏 + 零优先级"（例如专跑 nightly 备份）
cfg = rs.conf()
cfg.members[2].priority = 0
cfg.members[2].hidden = true
rs.reconfig(cfg)
```

**讲解：**

1. `priority` 越高越容易当选；把硬件最好、网络最居中的节点设为高优先级，其余设 0，可以让主节点稳定落在指定机器上。
2. 延迟节点的价值：`DROP TABLE` 这类误操作会立刻同步到所有从节点，只有延迟节点还留着"一小时前"的数据。
3. 改配置用 `rs.reconfig(cfg)`，生产上改投票成员数量等敏感项时注意官方文档对多数派的要求。

## 4. 读写语义三件套：readPreference / readConcern / writeConcern

三者各管一件事：**读偏好管"读谁"，读关注管"读到的多可信"，写关注管"写多稳才算成功"**（readConcern 与 writeConcern 的细节语义在 006 第 6 节已展开，这里补上读偏好与组合）。

readPreference 五个取值：`primary`（只读主）、`primaryPreferred`（主优先）、`secondary`（只读从）、`secondaryPreferred`（从优先）、`nearest`（就近）。读从节点时建议配 `maxStalenessSeconds` 限制从节点最大延迟（下限 90 秒，以官方文档为准）。

```javascript
// mongosh 会话级设置读偏好（也可以写在连接串 ?readPreference=... 里）
db.getMongo().setReadPref("secondaryPreferred")

// 单次查询同时指定读关注与读偏好（mongosh 游标方法）
db.orders.find({ status: "paid" }).readConcern("majority").readPref("secondaryPreferred")

// 写入时指定写关注：多数派 + journal + 5 秒超时
db.orders.insertOne(
  { orderNo: "C001" },
  { writeConcern: { w: "majority", j: true, wtimeout: 5000 } }
)
```

**组合建议：**

| 场景 | readPreference | readConcern | writeConcern |
| --- | --- | --- | --- |
| 订单写入 | primary（默认） | - | majority |
| 报表、数据导出 | secondaryPreferred | local | - |
| 金融单点强一致读 | primary | linearizable | majority |
| "读自己刚写的" | 任意 + 因果一致会话 | majority | majority |

**讲解：** 读从节点不是免费的——复制延迟意味着可能读到旧数据；报表能容忍，购物车不能。把"哪些读容忍旧数据"想清楚，读偏好才有答案。

## 5. 动手：本机搭建副本集

### 方式一：单机副本集（最省事，学习推荐）

```bash
# 一个 mongod 就能变成副本集，事务、变更流等特性都能练
mkdir -p ~/mongo-rs0
mongod --dbpath ~/mongo-rs0 --replSet rs0 --port 27017 --bind_ip 127.0.0.1
```

```javascript
// 另开终端，初始化副本集
rs.initiate({ _id: "rs0", members: [ { _id: 0, host: "127.0.0.1:27017" } ] })
rs.status()  // 稍等几秒，members 里出现 PRIMARY 即成功
```

### 方式二：Docker 一主两从

```yaml
# docker-compose.yml：同一网络里跑三个 mongod
services:
  mongo1:
    image: mongo:8.0
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    ports: ["30001:27017"]
    networks: [mongonet]
  mongo2:
    image: mongo:8.0
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    ports: ["30002:27017"]
    networks: [mongonet]
  mongo3:
    image: mongo:8.0
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    ports: ["30003:27017"]
    networks: [mongonet]
networks:
  mongonet: {}
```

```bash
docker compose up -d
# 在 mongo1 容器里初始化三成员副本集（容器间用容器名互相发现）
docker compose exec mongo1 mongosh --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
})'
```

**讲解：**

1. rs 配置里写的是容器名，因为成员之间走容器网络；从宿主机连接时加 `?directConnection=true` 直连单个节点做管理，或在 `/etc/hosts` 里把 mongo1/2/3 映射到 127.0.0.1。
2. 生产副本集必须配 keyFile 内部认证（见安全篇 008）与 majority 写关注，本例为了演示省略了认证。
3. 搭好后把 006 的转账事务跑一遍：单机 mongod 会直接报错，副本集上则正常提交——事务的第一道门槛就是环境。

## 6. 分片集群：mongos、config server 与 shard

分片集群由三类角色组成，理解数据流就理解了架构：

1. **mongos（路由）**：无状态查询路由器。应用只连 mongos；它根据元数据把请求发给对应 shard，再合并结果返回。
2. **config server（配置副本集，CSRS）**：保存"哪段数据在哪个 shard"的元数据；balancer 也在其主节点上运行（新版本行为，旧版本由 mongos 协调，以官方文档为准）。
3. **shard（分片）**：每个 shard 本身就是一个完整的副本集，复用上一节的高可用机制。

数据流：带 shard key 的查询走**定点路由**（只碰一个 shard）；不带 shard key 的查询是 **scatter-gather**（发到所有 shard 再汇总），成本随 shard 数量线性上涨——这就是 shard key 要贴合查询的原因。分片集合上的多文档事务、跨 shard 聚合同理，都比单 shard 贵。

## 7. shard key 选型：决定分片成败的一步

```javascript
use shop
// 新版本中 shardCollection 会隐式开启库的分片；显式 enableSharding 在旧版本必需
sh.enableSharding("shop")

// 哈希分片：写入均匀，适合等值查询多的场景
sh.shardCollection("shop.orders", { userId: "hashed" })

// 复合键范围分片：需先建索引，适合"按用户查订单"这类模式
db.orders.createIndex({ userId: 1, orderId: 1 })
sh.shardCollection("shop.orders", { userId: 1, orderId: 1 })
```

| 策略 | 写入分布 | 等值点查 | 范围查询 | 适用 |
| --- | --- | --- | --- | --- |
| 单调递增键 + 范围（如 _id、时间戳） | 差：永远写最后一段，单 shard 热点 | 好 | 好 | 几乎不该用 |
| 哈希键（hashed） | 好 | 好 | 差（哈希打散了顺序） | 写多、按 key 等值查 |
| 复合键范围（如 userId + orderId） | 好（userId 足够分散时） | 好 | 按 userId 的范围查询好 | 多数业务首选 |

**四条选型原则：**

1. **基数要高**：userId 有千万个取值，status 只有三个，前者才撑得起几百个 chunk。
2. **避免单调递增**：ObjectId、时间戳在范围分片下全部落在最后一个 chunk（热点）；要么用 hashed，要么把无序字段放在最前面。
3. **贴合查询**：最高频的查询必须带上 shard key 前缀，否则退化为 scatter-gather。
4. **想好不可逆**：shard key 一经选定，修改代价很高（新版本支持在线 resharding，但条件多、耗时长，以官方文档为准），选型前把读写模式画出来再决定。

补充：地域合规、冷热分层等需求可用 zone 分片，把指定 key 范围"钉"在指定 shard 上。

## 8. balancer 与 chunk 迁移

分片集合的数据按 shard key 切成若干 **chunk**（每段连续 key 区间，阈值随版本变化，以官方文档为准）。**balancer** 在后台巡检各 shard 的 chunk 数量，差异超过阈值就发起迁移，让数据尽量均匀。

```javascript
sh.status()                // 总览：shard 列表、分片库、集合与 chunk 分布
sh.isBalancerRunning()     // balancer 是否正在迁移
sh.setBalancerState(false) // 大批量导入等窗口期可暂停（办完事记得恢复 true）
```

**讲解：**

1. chunk 迁移期间要在 shard 之间搬数据，占用带宽与缓存，高峰期会放大延迟——这就是大导入前先停 balancer、选低峰迁移的原因。
2. **jumbo chunk**：同一个 shard key 值的数据量大到无法再拆（比如某超级大 V 的全部数据），balancer 搬不动它；哈希键几乎不会产生 jumbo，这正是它受欢迎的原因之一。
3. 实践顺序：**先定分片、再灌数据**。往一个已分片的空集合写入比"先写满再补分片"便宜得多，后者要做一次全量均衡。

## 小结与延伸

> 副本集解决"坏了怎么办"，分片解决"大了怎么办"；oplog 是副本集的血液，shard key 是分片的命门。

收工自查清单：

1. 心跳 2 秒、选举默认约 10 秒；投票节点取奇数，最多 7 票。
2. 四种成员角色能区分：priority 0 不当主、hidden 不接客、delayed 留后悔药、arbiter 不存数据（不推荐）。
3. 三件套各管一件事：读偏好管"读谁"，读关注管"多可信"，写关注管"多稳"。
4. shard key 四原则：高基数、非单调、贴合查询、想好不可逆；递增键配 hashed。
5. 学习环境一条命令：`mongod --replSet rs0` 加 `rs.initiate()`。

延伸阅读：副本集是多文档事务（006）的运行前提；分片集合的索引设计见 004；建模范式见 005。官方文档关键词：Replication、Replica Set Members、Sharding Introduction、Shard Key，各默认值与版本差异以官方文档为准。
