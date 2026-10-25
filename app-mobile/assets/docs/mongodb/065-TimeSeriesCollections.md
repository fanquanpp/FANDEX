---
order: 80
title: 时间序列集合
module: 'mongodb'
category: 数据库
difficulty: beginner
description: timeSeries 集合的创建与参数、桶存储与查询行为、granularity 调整与 TTL 生命周期管理
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：MongoDB 时间序列集合（Time Series Collections，5.0 引入）——创建参数、内部桶存储、写入查询行为、生命周期（granularity 与过期）。
- 解决什么问题：传感器心跳、行情分钟线、监控指标这类"按时间持续写入、按设备+时间段查询、到期批量淘汰"的数据——普通集合存它索引大、压缩差、淘汰难；timeSeries 集合为这个形态专门优化。
- 什么时候用到：服务器指标每 10 秒一条、股价分钟线落库、温湿度传感器按设备分组、任何"append-only 的时间点数据"。
- 衔接：《索引与查询性能》第 5 节的 TTL 索引是普通集合的过期手段，本篇第 5 节讲 timeSeries 自己的过期参数；《模式设计》的建模原则在时序数据上的特化就是本篇。

## 前置知识

- 《CRUD》插入与查询；《索引与查询性能》TTL 一节；《模式设计》的"为读取模式建模"。

## 学习目标

- 会用 timeField/metaField/granularity 三参数创建时间序列集合，并说清每个参数的作用；
- 理解桶（bucket）存储：为什么同一设备的测量值会被打包、压缩率从哪来；
- 能按数据频率选 granularity，知道"只能调大不能调小"的限制；
- 会用 expireAfterSeconds 管理 TTL，区分它与普通集合 TTL 索引。

## 1. 场景：心跳数据压垮普通集合

服务器监控每 10 秒写一条心跳：1 万台机器 x 每天下午的峰值时段，一天就是近亿条小文档。普通集合的三个痛点逐个出现：

1. **每条文档独立存储**：字段名重复存亿遍，存储成本失控；
2. **_id 索引 + 业务索引巨大**：索引内存比数据还大；
3. **过期难**：TTL 索引逐条删除，删除产生的写放大与磁盘空洞让晚上正好是删除高峰。

```javascript
// 创建时间序列集合
db.createCollection("heartbeats", {
  timeseries: {
    timeField: "ts",          // 必填：每条测量值的时间戳字段
    metaField: "deviceId",    // 可选：分组元数据（哪台机器）
    granularity: "seconds",   // 可选：seconds | minutes | hours（默认 seconds）
  },
  expireAfterSeconds: 7 * 24 * 3600,   // 7 天过期
})

// 写入：与普通集合完全一样
db.heartbeats.insertOne({
  ts: new Date(),
  deviceId: "srv-0001",
  cpu: 0.62,
  mem: 0.71,
})

// 查询：也与普通集合完全一样
db.heartbeats.find({
  deviceId: "srv-0001",
  ts: { $gte: new Date("2026-10-07T00:00:00Z"), $lt: new Date("2026-10-07T01:00:00Z") },
})
```

**讲解：**

1. **写入与查询的 API 完全不变**——变化在存储引擎内部：驱动与 mongosh 按"一条条文档"交互，引擎按"桶"组织。这是时间序列集合最重要的设计决定：使用成本极低，收益全在底层。
2. `timeField` 是每个集合唯一的必填项，必须每个文档都有且类型是日期；没有它插入直接报错。
3. `metaField` 是"这条数据属于哪个主体"：设备号、股票代码、容器 id。它决定**分桶边界**——同主体同时间窗的测量值进同一个桶。
4. `expireAfterSeconds` 写在 createCollection 参数里（不是建 TTL 索引），过期以 timeField 为基准整体淘汰桶——这就是痛点 3 的解法：淘汰按桶不按条。

## 2. 桶存储：压缩率从哪来

时间序列集合把测量值按 **metaField 分组 + 按时间窗切桶**：一小时内同一设备的成千上万条测量值，打包成一个内部桶文档——时间戳列存一份增量序列、每个数值字段一列、字段名只存一份（桶级）。

**讲解：**

1. 三个收益的来源都在"列式打包"：字段名不重复（痛点 1）、同列数值类型一致压缩率高、桶作为整体淘汰（痛点 3）。痛点 2 的索引压力也缓解——内部桶文档数量远小于测量值条数。
2. 查询时引擎按查询条件定位桶、解出桶内相关列——"按设备查某时段"正好顺着桶的组织方式切，是它最快的查询形态；反之"全集合时间范围扫描"（跨所有设备）就要解大量桶，规划查询模式时想清楚主轴是"设备 x 时段"。
3. 桶有默认时间窗（granularity 决定：seconds 约 1 小时一桶、minutes 约 24 小时、hours 约 30 天），超限的桶自动翻新页——理解"granularity 是桶的时间窗刻度"即可，不必记精确阈值。

## 3. granularity：按数据频率选对刻度

| 数据频率 | 推荐 granularity | 理由 |
| --- | --- | --- |
| 秒级/分钟级（心跳、行情 tick） | seconds | 小时间窗一桶，桶不超限、查询解桶少 |
| 小时级以上（日报表点、天级采样） | minutes 或 hours | 桶窗太密会造出海量小桶，反而低效 |
| 混合频率 | 按"主体 x 最细频率"建多集合 | granularity 是集合级参数，不能按文档变 |

**讲解：**

1. 选错刻度的两种症状：刻度太小（seconds 存天级数据）——海量小桶，元数据开销反噬压缩收益；刻度太大（hours 存秒级数据）——桶内容积超限频繁翻新页，写入路径变碎。
2. **granularity 可以调大、不能调小**（collMod 修改）：数据频率变细时（原来小时采样改成秒级心跳），只能调大的规则意味着要一步到位选细刻度，或者拆新集合迁移。这就是"二次采样 granularity 改大的前提"——观测粒度只会越来越细的系统，初始值选细一档。
3. 列压缩的收益前提是"同主体数据连续到达"：乱序/极晚到达的数据会落进旧桶或新开桶，压缩与查询效率都打折——采集端保证基本按时间顺序写入，是使用时间序列集合的配套纪律。

## 4. 写入与查询行为差异：和普通集合不一样的地方

API 相同，语义有四处差异，逐条记住：

1. **更新与删除受限**：直接 update/delete 单条测量值不是设计用途（append-only 是前提）；7.0 起支持有限的针对 metaField 的删除。业务要求"可修正的历史数据"时，普通集合 + 手工分桶设计更合适。
2. **二级索引受限**：主要靠"metaField + timeField"的内在组织；6.3 起允许在 metaField/timeField 上建二级索引（含 TTL 索引）覆盖特殊查询，但"给任意字段建索引"的普通集合思维在这里不适用。
3. **_id 语义弱化**：不按 _id 点查——测量值的身份是"主体 + 时间"，不是"_id"。
4. **聚合可用且是主力**：`$match`（metaField + 时间窗）后接 `$group`（按小时均值）是标准管道；窗口函数 `$dateTrunc` + `$group` 做降采样（秒级数据聚合分钟线）是典型用法。

## 5. 生命周期：TTL 与归档

```javascript
// 建集合时就声明 30 天过期
db.createCollection("stock_ticks", {
  timeseries: { timeField: "ts", metaField: "symbol", granularity: "seconds" },
  expireAfterSeconds: 30 * 24 * 3600,
})

// 运行期修改过期时间（collMod）
db.runCommand({
  collMod: "stock_ticks",
  expireAfterSeconds: 90 * 24 * 3600,
})
```

**讲解：**

1. 与 040 篇 TTL 索引的对照：TTL 索引逐条删（普通集合），timeSeries 的 expireAfterSeconds 按桶淘汰（整桶过期才删，写入放大小）；两者语义都是"过期的数据自动消失"，实现与成本模型不同。
2. 到期前的降采样归档是常见组合：分钟线从 tick 数据 `$group` 而来，存进另一个 granularity=minutes 的集合，tick 集合 7 天过期、分钟线集合两年过期——**原始数据与聚合数据分层过期**，存储成本可控且查询体验不变。
3. 易错点：expireAfterSeconds 建集合时忘配，运行期才发现数据只进不出——collMod 补配即可，但已经堆积的数据要等淘汰循环消化；监控里加一条"集合物理大小"告警兜底。

## 6. 三个真实场景

**场景一：服务器心跳指标（每 10 秒）。** 1 万台机器的心跳写入 timeSeries 集合（metaField=deviceId，granularity=seconds，7 天过期）。对比改造前的普通集合：存储占用约降一个数量级（字段名与时间戳列压缩），TTL 删除高峰消失（按桶淘汰），"查单机最近 1 小时 CPU 曲线"顺桶切分毫秒返回。给 Grafana 供数的是聚合管道：`$match` 设备 + 时间窗 -> `$dateTrunc` 分钟对齐 -> `$group` 均值。

**场景二：股价分钟线落库。** tick 级原始数据进 granularity=seconds 的集合（3 天过期），`$dateTrunc`+`$group` 产出 OHLC 分钟线存进 granularity=minutes 的集合（两年过期），日线再聚合一层。分层的理由：回测查询命中分钟线集合（桶少、查询快），tick 只服务于"当天分时图"这种短窗口需求——**查询时间窗决定数据该在哪一层**。

**场景三：温湿度传感器按设备分组。** 冷链监控 5000 个探头，每 30 秒上报温湿度。metaField 用 `{ warehouseId, sensorId }` 组合文档（metaField 可以是嵌套文档）：按仓库查询是一等公民（metaField 前缀命中桶组织），单探头溯源也支持。踩过的坑：最初把传感器型号放 metaField（变化慢、区分度低），桶按型号分组导致单桶混杂上百个探头的数据——metaField 的选择标准是"查询的主体单位"，不是"静态属性"。

## 7. 动手实践

**任务一：两种集合的存储对比。** 分别创建普通集合与时间序列集合，各插入同一批 1 万条心跳（同结构同数据），用 `db.coll.stats()` 对比 size 与 storageSize，并各建 deviceId+ts 查询对比 explain。提示：数据量再放大 10 倍差距更明显；实验结论要写"压缩来自哪里"（字段名去重 + 数值列压缩），不要只抄数字。

**任务二：granularity 的翻新页观察。** 用 granularity=hours 的集合写入秒级间隔数据，观察插入性能与 `stats()` 中桶数量变化；再对比 granularity=seconds 的同数据集合。提示：小时桶被秒级数据塞爆后频繁翻新页，写入路径变碎——这就是"刻度与频率匹配"的反例实验。

**任务三：降采样归档管道。** 把任务一的心跳数据聚合成分钟线写进第二个时间序列集合（`$dateTrunc` + `$group`），验证分钟线集合的查询（任意设备任意小时）耗时低于查原始数据。提示：`$merge` 写入聚合结果的用法比逐条 insert 高效；降采样管道是你以后给监控大盘供数的模板。

先自己操作，再对照参考实现：

<details>
<summary>任务三参考实现</summary>

```javascript
// 分钟线降采样：tick 集合 -> minute_bars 集合
db.createCollection("minute_bars", {
  timeseries: {
    timeField: "ts",
    metaField: "deviceId",
    granularity: "minutes",     // 分钟线配 minutes 刻度
  },
  expireAfterSeconds: 365 * 24 * 3600,
})

db.heartbeats.aggregate([
  { $match: { ts: { $gte: new Date("2026-10-07T00:00:00Z"),
                    $lt:  new Date("2026-10-07T01:00:00Z") } } },
  { $group: {
      _id: {
        deviceId: "$deviceId",
        minute: { $dateTrunc: { date: "$ts", unit: "minute" } },
      },
      cpuAvg: { $avg: "$cpu" },
      cpuMax: { $max: "$cpu" },
      samples: { $sum: 1 },
  } },
  { $project: {
      _id: 0,
      deviceId: "$_id.deviceId",
      ts: "$_id.minute",
      cpuAvg: 1, cpuMax: 1, samples: 1,
  } },
  { $merge: {
      into: "minute_bars",
      on: ["deviceId", "ts"],      // 幂等：重跑同窗口会覆盖而不是重复
  } },
])
```

要点：a) `$dateTrunc` 把秒级时间戳对齐到分钟，是降采样的核心算子；b) `$merge` 的 on 指定合并键，重跑幂等——夜间批量任务重跑不产生重复数据；c) 分钟线集合的 granularity 选 minutes 而不是 seconds：聚合产物天然分钟间隔，刻度与数据频率再次对齐——任务二学到的原则在归档层同样适用。
</details>

## 8. 一句话记住

> 时间序列集合 = "普通集合的 API + 桶式列存引擎"：timeField 必填、metaField 定分桶主体、granularity 是桶窗刻度（只能调大）、expireAfterSeconds 按桶过期；metaField 选"查询主体"、数据按时间顺序写、降采样分层归档，是它的三条使用纪律。

## 参考与致谢

- MongoDB Manual：Time Series Collections，来源：https://www.mongodb.com/docs/manual/core/timeseries-collections/ ，许可证 CC BY-NC-SA 3.0 US。本文创建参数、granularity 规则（只能调大）、TTL 语义与二级索引版本边界依据官方手册（6.0/7.0 版）整理；场景数值为教学示例，以本机实测为准。
