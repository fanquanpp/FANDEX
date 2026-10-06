---
order: 100
title: 备份恢复与数据保护
module: 'mongodb'
category: 数据库
difficulty: beginner
description: mongodump/mongorestore 的范围与压缩、文件系统快照与 journal 一致性、oplog 时间点恢复（PIT）
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：MongoDB 备份恢复——逻辑备份（mongodump/mongorestore）、文件系统快照、副本集 oplog 时间点恢复（PIT），以及备份与副本集角色、账号体系的配合。
- 解决什么问题：误删集合、磁盘损坏、升级失败时"把数据拿回来"；而且要回答三个工程问题：备份期间能不能写、能恢复到哪个时间点、谁有权限做备份。
- 什么时候用到：夜间全量备份策略制定、误删数据的恢复演练、版本升级前的回滚保障、副本集搭建时规划备份成员。
- 衔接：《副本集与分片》第 3 节的 hidden 成员是备份的专属载体，《安全与用户管理》第 4 节的 backup/restore 角色是备份账号的最小权限形态——本篇把这两条线接上。

## 前置知识

- 《副本集与分片》：oplog 的原理与成员角色；
- 《安全与用户管理》：内置角色体系；
- mongosh 与基本 shell 操作。

## 学习目标

- 会用 mongodump/mongorestore 做库/集合/查询级备份与恢复，理解 --gzip 与 --oplog 的作用；
- 理解文件系统快照的 journal 一致性前提（WiredTiger 与 fsyncLock）；
- 会用 oplog 做 PIT：恢复到误删之前的那个瞬间；
- 会把备份落到 hidden 成员与专用账号上，形成完整备份策略。

## 1. 场景：误删集合的第一现场

```javascript
// 运维本想清测试数据，连的是生产……
use shop
db.orders.drop()
// { ok: 1 } —— 400 万订单没了
```

drop 返回 ok 的那一刻，恢复能力决定事故等级。备份策略要先想清楚三个问题，工具只是答案的载体：

1. **备份期间业务能不能写？**（决定选逻辑备份、快照还是延迟成员）
2. **能恢复到哪个时间点？**（只有全量备份 = 只能回到昨晚；有 oplog = 能回到误删前 1 秒）
3. **恢复演练过吗？**（没验证过的备份等于没有备份——介质损坏、格式不兼容都在恢复时才暴露）

## 2. mongodump / mongorestore：逻辑备份

```bash
# 全实例备份，压缩输出
mongodump --host rs0/node1:27017 --gzip --out /backup/dump-20261007

# 只备一个库、一个集合（范围收窄）
mongodump --db shop --collection orders --gzip --out /backup/orders-only

# 带查询条件的部分备份（只备最近 7 天）
mongodump --db shop --collection orders \
  --query '{"createdAt": {"$gte": {"$date": "2026-09-30T00:00:00Z"}}}' \
  --gzip --out /backup/recent

# 恢复
mongorestore --gzip --drop --host rs0/node1:27017 /backup/dump-20261007
```

**讲解：**

1. mongodump 是**逻辑备份**：读出文档写成 BSON 文件（metadata.json 记录索引定义）。恢复 = 重新插入 + 重建索引。它有三大代价：大集合导出慢、恢复时要重建全部索引（时间加倍）、备份期间的全表读挤占缓存。
2. `--gzip` 压缩产物，文本占比高的集合压缩比可观；`--drop` 让恢复先清空目标集合——**重复恢复不 --drop 会把数据翻倍**，这是恢复演练最经典的二次事故。
3. 范围按需收窄（--db/--collection/--query）：日常高频备份用小范围，全量低频跑。查询级备份用 Extended JSON 写日期（`{"$date": ...}`），普通 `new Date()` 在 --query 里不识别。
4. 适用判断：数据量 GB 级以内、允许分钟级恢复窗口——mongodump 够用；TB 级或要求秒级恢复——上快照/延迟成员/专业方案（Ops Manager、Percona Backup for MongoDB）。

## 3. 文件系统快照：journal 一致性

快照方案绕过"逐条导出"：在文件系统层（LVM/EBS/存储阵列）给数据目录打一个即时快照，恢复 = 挂载快照目录直接启动。

**讲解：**

1. **一致性前提是 journal**：WiredTiger 的写先落 journal（预写日志）再落数据文件。快照只要捕捉到"journal 与数据文件在同一瞬间状态"，恢复时引擎重放 journal 就能恢复一致——所以快照必须是**原子**的（一瞬间全卷生效），分卷先后打快照会得到撕裂的不一致状态。
2. 副本集成员上打快照天然更稳：先让该成员的复制追平（lag 为 0），快照即"某个确定时刻的完整状态"；单机要一致性暂停可以用 `db.fsyncLock()`（锁写并把脏页刷盘）——注意锁住期间业务写入阻塞，打完快照立刻 `fsyncUnlock`。
3. 快照的代价模型与 mongodump 互补：快照几乎瞬间完成、恢复即启动（快）；但它是整卷粗粒度、跨版本恢复受限（引擎版本要对齐）、云盘快照的成本模型另算。
4. 易错点：把快照当备份而不是"备份的原料"——快照留在同一块盘/同一个可用区里，盘坏一起坏；快照必须复制到异地/异账号存储才算落袋。

## 4. oplog 时间点恢复（PIT）

全量备份 + oplog 的组合让恢复粒度从"昨晚"细化到"误删前 1 秒"：

```bash
# 1. 备份时带上 --oplog：捕获备份期间的写操作，保证恢复出来的是某个一致时刻
mongodump --oplog --gzip --out /backup/full-20261007

# 2. 事故发生：10:32:05 有人 drop 了 orders

# 3. 恢复到 10:32:00（误删前 5 秒）
mongorestore --gzip --drop /backup/full-20261007   # 先恢复全量

# 4. 重放 oplog 到指定时间点（从全量备份的 stop 时间起，到 10:32:00 止）
mongorestore --oplogReplay \
  --oplogLimit 1760000000:1 \
  /backup/full-20261007
```

**讲解：**

1. `--oplog`（dump 侧）在备份窗口内同步记录 oplog，产物里多一个 oplog.bson——它保证恢复结果是"备份结束时刻"的一致快照，而不是"备份期间持续变化"的四不像。备份期间写入越频繁，这个参数越必要。
2. `--oplogReplay`（restore 侧）把 oplog.bson 按顺序重放；`--oplogLimit` 控制重放到哪个时间点（秒:序号）。误删场景的恢复公式：**全量 + 重放 oplog 到误删动作之前**——drop 操作本身也是一条 oplog（dropDatabase 命令），跳过它就等于它没发生过。
3. 前提与边界：oplog 只保留最近一段（oplog 窗口，受写入量决定，可能只有几小时）；备份间隔必须小于 oplog 窗口，否则两次备份之间有 oplog 空档，PIT 就接不上。**oplog 窗口与备份间隔的匹配检查要进巡检清单**。
4. PIT 是"最后一道防线"的用法：日常先靠延迟恢复（第 6 节场景三）止损，PIT 用于把数据精确补回——两者不互斥。

## 5. 备份落在谁身上：hidden 成员与专用账号

备份策略的两个配套决策，直接引用既有篇章的结论：

1. **备份成员选 hidden**（《副本集与分片》第 3 节）：hidden 成员不出现在读偏好候选里、不接业务读流量，mongodump 在它上面跑全表读不会拖累线上查询；给备份专用成员配 `priority: 0, hidden: true`，dump 命令 `--host` 直指它。
2. **备份账号用最小权限**（《安全与用户管理》第 4 节）：备份用 `backup` 角色（可读全部库 + 读 oplog），恢复用 `restore` 角色——不要拿 root 跑备份脚本。备份脚本把凭据放配置管理而非命令行明文（ps 历史会泄露）。
3. 备份产物本身是"全库数据的拷贝"，它的存储安全等同于数据库安全：加密落盘、访问控制、异地副本三件套缺一不可——备份盘泄露是真实的入侵路径。

## 6. 三个真实场景

**场景一：夜间全量 + 小时级 oplog 增量。** 中型业务（数据 200GB）的策略：凌晨 2 点 mongodump 全量（--oplog，在 hidden 成员上执行），白天每 2 小时 mongodump 增量（--query 按 updatedAt 过滤 + 单独导出 oplog 段）。RPO（最多丢多少数据）= 2 小时，恢复步骤手册化：全量恢复 -> 逐段重放增量 oplog -> 校验文档数与索引数。演练每季度跑一次，**恢复耗时实测值**写进手册——事故夜没人有时间给你现场测。

**场景二：误删集合的 PIT 恢复演练。** 演练脚本制造真实事故节奏：备份数据 -> 模拟写入 10 分钟 -> drop 集合 -> 按第 4 节流程恢复到 drop 前 1 秒 -> 校验"最后一条写入还在、drop 之后的写入丢失"（PIT 的语义边界要亲手验证）。演练的最大收获通常不是流程而是**发现 oplog 窗口不够**——写入高峰时段 oplog 被冲掉大半，备份间隔 2 小时根本接不上，当场把备份频率改密。

**场景三：版本升级前的回滚保障。** MongoDB 大版本升级（6.0 -> 7.0）不可原地降级——featureCompatibility 一旦开到新版本，旧版本二进制拒绝启动。升级 SOP 因此必然包含备份：升级前 mongodump 全量（或快照副本集成员），升级失败时用旧版本二进制 + 备份恢复回滚节点。这条"升级必备份"纪律的依据正是版本升级的不可逆性——回滚的唯一路径是数据。

## 7. 动手实践

**任务一：单机备份恢复闭环。** 对本机一个测试库做 mongodump --gzip，然后 drop 两个集合，mongorestore --drop 恢复，校验文档数与索引数与备份前一致。提示：恢复前后各跑一次 `db.coll.stats()` 与 `db.coll.getIndexes().length`，"数据一致"的定义是两者都对上。

**任务二：PIT 恢复演练。** 副本集（或单节点副本集）上完整走一遍第 4 节流程：--oplog 备份 -> 写入标记数据 -> drop -> 恢复全量 -> --oplogReplay --oplogLimit 到 drop 前的时刻 -> 验证标记数据存活。提示：单节点副本集也能产 oplog（单机 standalone 没有 oplog，做不了 PIT——这本身就是实验结论之一）；--oplogLimit 的秒值从 oplog 里查（`db.getSiblingDB("local").oplog.rs.find().sort({$natural:-1})`）。

**任务三：备份账号最小权限验证。** 创建只有 backup 角色的账号，用它跑 mongodump 成功；再尝试用同一个账号 mongorestore，观察失败——然后换带 restore 角色的账号恢复成功。提示：这个实验把"备份与恢复是两个权限"变成肌肉记忆；生产上两个动作应使用两个账号、两套凭据。

先自己操作，再对照参考流程：

<details>
<summary>任务二参考流程</summary>

```bash
# 0. 前提：单机也能起单节点副本集（mongod --replSet rs0），standalone 无 oplog
# 1. 备份（带 oplog）
mongodump --host rs0/localhost:27017 --oplog --gzip --out /backup/pit-lab

# 2. 写入并记录标记（mongosh）
use shop
db.orders.insertOne({ memo: "PIT-MARK-1", ts: new Date() })
# 记下此刻时间：date +%s（记为 T_MARK）

# 3. 3 分钟后模拟事故
db.orders.drop()

# 4. 恢复：先全量
mongorestore --host rs0/localhost:27017 --drop --gzip /backup/pit-lab

# 5. 找 drop 之前的 oplog 时间戳（mongosh）
db.getSiblingDB("local").oplog.rs.find(
  { op: "c", ns: "shop.$cmd" }        # c = 命令（drop 属于命令类）
).sort({ $natural: -1 })
# 记下 drop 那条 oplog 之前的最后一条的 ts（形如 Timestamp({t: 1760000000, i: 1})）

# 6. 重放 oplog 到 drop 前
mongorestore --host rs0/localhost:27017 --oplogReplay \
  --oplogLimit 1760000000:1 \
  /backup/pit-lab

# 7. 验证
# db.orders.findOne({memo:"PIT-MARK-1"}) 存在 -> 恢复成功
# drop 之后新写入的数据不存在 -> PIT 语义边界（恢复点之后的写不复活）
```

要点：a) --oplogLimit 的参数是 `秒:序号`，取"drop 前最后一条 oplog 的 ts"意味着重放在 drop 之前停止；b) drop 后写入的数据不复活——PIT 恢复的是时间点，不是 undone 的未来；c) 若第 6 步报 oplog 空档错误，说明备份间隔超过了 oplog 窗口，这正是场景二说的巡检项。
</details>

## 8. 一句话记住

> mongodump 管小库与演练（--gzip 压缩、--drop 防重复恢复），快照管大库但要 journal 一致且异地落袋，oplog 把恢复粒度从"昨晚"推到"误删前 1 秒"；备份跑在 hidden 成员上、用 backup/restore 专用角色，恢复演练每季度实跑一次。

## 参考与致谢

- MongoDB Manual：Backup and Restore Methods、mongodump、mongorestore（--oplogReplay/--oplogLimit）参考页，来源：https://www.mongodb.com/docs/manual/core/backups/ ，许可证 CC BY-NC-SA 3.0 US。本文命令参数、PIT 流程与 journal 一致性说明依据官方手册整理；演练流程为教学重写，生产参数以实测与官方版本为准。
