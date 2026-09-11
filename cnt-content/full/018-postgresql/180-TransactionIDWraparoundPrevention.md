---
order: 180
title: 事务 ID 回卷预防
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL事务ID回卷预防：XID环形比较空间、FREEZE冻结、autovacuum_freeze_max_age与紧急处理
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/200-DeadlockDetectionHandling'
  - 'postgresql/210-VACUUMMechanism'
  - 'postgresql/220-IndexType'
  - 'postgresql/230-CoveringIndexPartialIndex'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 1. 为什么会有回卷问题

PostgreSQL 用 MVCC 实现并发：每一行都记录"是哪个事务插入/删除的我"，
这个事务编号就是 **XID（Transaction ID）**。可见性判断的核心是
比较"这行的事务"与"当前事务"谁先谁后。

XID 是 32 位无符号整数，全空间约 2^32（约 42.9 亿），总会用完；
而"谁先谁后"的比较又必须有限度。PostgreSQL 的解法是把 XID 视为一个
**模 2^31（约 21.5 亿）的环**：与当前 XID 距离小于 2^31 的算"过去"，
大于 2^31 的算"未来"。

```
            过去（可见）
          ......|
                |
   旧 XID ----->|-----> 当前 XID
                |
                v
          环的另一半 = 未来（不可见）
   距离一旦超过半圈 2^31, "过去"就会被误判成"未来"
```

## 2. 回卷问题的数学本质

假设当前 XID 为 C，某行的插入事务为 X：

```
若 (X - C) mod 2^32 <  2^31  ->  X 在过去, 元组可见
若 (X - C) mod 2^32 >= 2^31  ->  X 在未来, 元组不可见（或不应被看到）
```

回卷灾难的具体演算：

```
当前 XID = 2^31 + 100（刚越过半圈）
某 20 年前的老行: X = 100

(100 - (2^31 + 100)) mod 2^32
= (-2^31) mod 2^32
= 2^31          -> 判定为"未来事务插入的行" -> 数据"消失"!
实际它是最古老的"过去" -> 本应可见
```

后果：旧数据整体不可见（数据"消失"）、业务逻辑错乱；PostgreSQL
最后的自保手段是**拒绝分配新 XID、强制实例只读**，业务全面停摆。
所以回卷预防的口号是：**别让任何一行在"未冻结"状态下落后超过 20 亿**。

## 3. FREEZE 冻结机制

解决思路直白：把足够老、且已经提交的行"盖章"为**永久可见**，
让它从此不参与 XID 比较——这道工序叫 FREEZE（冻结）。

```sql
-- PostgreSQL 9.4+ 的实现: 在元组 infomask 上设置 HEAP_XMIN_FROZEN 标志位,
-- 不再改写 xmin 的值（更早版本是把 xmin 覆写为特殊值 FrozenTransactionId=2）

-- 手动冻结: 语义是把 vacuum_freeze_min_age 视为 0, 尽可能冻结全表
VACUUM FREEZE employees;

-- 带输出观察冻结效果
VACUUM (FREEZE, VERBOSE) employees;
-- INFO:  "employees": 找到 0 个可移除的死元组版本 ...
--        新冻结: 1523410 （本次冻结的元组数）
```

冻结由 VACUUM 执行，因此**回卷预防本质上是 VACUUM 的职责之一**，
与表膨胀、autovacuum 调优是同一套机制的不同侧面。

### 3.1 控制冻结的参数

```sql
-- 单行年龄低于此值的元组暂不冻结（避免反复重写热行, 默认 5000 万）
ALTER SYSTEM SET vacuum_freeze_min_age = 50000000;

-- 表年龄超过此值时, VACUUM 升级为"激进模式"（扫描全表并尽量冻结, 默认 1.5 亿）
ALTER SYSTEM SET vacuum_freeze_table_age = 150000000;

-- 表年龄超过此值时, autovacuum 被"防回卷自动清理"强制唤醒（默认 2 亿）
ALTER SYSTEM SET autovacuum_freeze_max_age = 200000000;
-- 注意: 该参数最大 20 亿, 修改需要重启; 即使 autovacuum = off 也会触发

-- 紧急兜底（默认 16 亿）: 年龄逼近危险线时, VACUUM 放弃代价延迟等一切限制,
-- 不再等待删除旧元组（绕过 xmin horizon）, 优先把年龄压下去
ALTER SYSTEM SET vacuum_failsafe_age = 1600000000;
```

三者的关系是一条**渐进的防线**：平时按 min_age 懒惰冻结 -> 表变老到
table_age 就激进扫描 -> 到 max_age 强制 autovacuum -> 到 failsafe_age
进入不计代价的救火模式。

## 4. 监控：年龄即倒计时

"表/数据库的年龄"指 `当前 XID - relfrozenxid（或 datfrozenxid）`，
即距离强制冻结还差多少个事务。

```sql
-- 最紧急的视图: 整个集群里"最老"的数据库
SELECT datname, age(datfrozenxid) AS xid_age
FROM pg_database
ORDER BY xid_age DESC;
--   datname   |  xid_age
-- ------------+-----------
--  production |  183244901   <-- 接近 2 亿, 防回卷清理随时会启动
--  postgres   |   99432112

-- 按表列出年龄（重点关注最大的几张）
SELECT relname, age(relfrozenxid) AS xid_age,
       pg_size_pretty(pg_total_relation_size(oid)) AS size
FROM pg_class
WHERE relkind IN ('r', 'm')   -- 普通表与物化视图
ORDER BY xid_age DESC
LIMIT 10;

-- 估算本库距离危险线还剩多少个 XID（比较空间 2^31 = 2147483648）
SELECT 2147483648 - age(datfrozenxid) AS xids_left
FROM pg_database
WHERE datname = current_database();
--  xids_left
-- -----------
--  1974389021

-- 当前事务的年龄
SELECT txid_current(), age(txid_current());
```

告警基线建议：

```
age(relfrozenxid) > 0.5 x autovacuum_freeze_max_age   -> 关注
age(relfrozenxid) > 0.8 x autovacuum_freeze_max_age   -> 告警, 排查为何没冻结
age(relfrozenxid) > 1 x autovacuum_freeze_max_age     -> 立即人工介入
日志出现 "to avoid wraparound data loss in database"   -> 防回卷清理已强制运行
```

## 5. 紧急处理

```sql
-- 场景: 某张巨大的分区父表年龄逼近红线, 防回卷清理反复运行仍未达标

-- 步骤1: 定位最老的表（注意 relkind 过滤掉索引/序列等非表对象）
SELECT relname, age(relfrozenxid) AS xid_age
FROM pg_class
WHERE relkind = 'r'
ORDER BY xid_age DESC LIMIT 5;

-- 步骤2: 手动对最老的表执行激进冻结（比等 autovacuum 更可控）
VACUUM (FREEZE, VERBOSE) giant_table;

-- 步骤3: 若普通 VACUUM 收效慢, 临时提高维护内存与并行度（PG 13+ 支持并行索引处理）
SET maintenance_work_mem = '2GB';
VACUUM (FREEZE, PARALLEL 4, VERBOSE) giant_table;

-- 步骤4: 长期方案 - 把大表改造成按时间分区,
-- 历史分区做一次 VACUUM FREEZE 后年龄即固定, 不再随业务增长恶化
```

如果最坏情况发生（数据库因回卷威胁进入只读）：

```
1. 实例会拒绝分配新 XID, 报错: database is not accepting commands
   to avoid wraparound data loss
2. 唯一出路是让防回卷清理跑完: 停掉长事务、必要时单用户模式执行
   postgres --single -D $PGDATA postgres  然后 VACUUM FREEZE;
3. 预防远胜抢救: 监控年龄 + 保证 autovacuum 可正常运行
```

## 6. 常见陷阱

- **长事务是头号帮凶**：一个数天不提交的事务会把 xmin horizon 钉死，
  VACUUM 无法推进 relfrozenxid，年龄只涨不降。先查
  `pg_stat_activity WHERE state = 'idle in transaction'` 和
  `pg_stat_activity WHERE xact_start < now() - interval '1 day'`。
- **废弃的复制槽**：逻辑/物理槽保留的 WAL 与 ymin 同样会拖住清理，
  检查 `pg_replication_slots WHERE NOT active`。
- **分区父表年龄高不等于大问题**：父表的年龄取所有分区最大值，
  应逐个分区查看并处理最老的分区。
- **以为 autovacuum = off 能"省资源"**：防回卷自动清理会无视该开关
  强制运行，等于在最糟的时机以最糟的状态救火。
- **温度计式的误解**：年龄大本身不是错误，只是"欠账"；只要
  VACUUM 能推进它就有惊无险，真正危险的是**年龄大 + 推不动**的组合。

## 小结

- 初学者要点：XID 是行的"出生编号"；比较空间是 21.5 亿的环；
  FREEZE 把老行盖章为永久可见，使其不再参与比较；autovacuum 负责自动
  冻结，默认在表年龄 2 亿时强制触发。
- 进阶注意：防线由 `vacuum_freeze_min_age`（5000 万）、
  `vacuum_freeze_table_age`（1.5 亿）、`autovacuum_freeze_max_age`（2 亿）、
  `vacuum_failsafe_age`（16 亿）层层组成；年龄监控是必做告警项；
  长事务与死复制槽是防线上最常被忽视的两个漏洞。
