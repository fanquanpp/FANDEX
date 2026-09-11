---
order: 540
title: PostgreSQL 18 新特性
description: PostgreSQL 18（2025-09）核心特性详解：异步I/O、uuidv7、虚拟生成列、B-tree跳跃扫描、时态约束、OAuth认证与升级改进。
module: 'postgresql'
category: 数据库
difficulty: intermediate
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/010-OverviewInstallConfig'
  - 'postgresql/150-GeneratedColumn'
  - 'postgresql/240-IndexQueryOptimization'
  - 'postgresql/450-IncrementalBackup'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 1. 版本定位

PostgreSQL 18 于 2025 年 9 月 25 日发布。它不是"17 的常规迭代"，
而是包含了近年少见的底层重构（异步 I/O 子系统）与一组直接改变
日常开发习惯的特性（uuidv7、虚拟生成列、跳跃扫描）。本文按
"影响面从大到小"逐个展开，示例均在 18 上可直接运行。

## 2. 异步 I/O：读取路径的重构

### 2.1 是什么

过去 PostgreSQL 的读取是同步阻塞的：一次只发一个 I/O 请求，
等回来再发下一个。PostgreSQL 18 引入**异步 I/O（AIO）子系统**，
允许同时向存储发出多个读请求（顺序扫描、位图堆扫描、VACUUM
率先受益，官方基准下读取最高约 3 倍提升）。

```ini
# postgresql.conf: 新参数 io_method
io_method = worker      # 默认值: 用一组 I/O worker 进程实现异步
# io_method = io_uring  # Linux 5.1+, 性能最好, 需要 liburing 支持
# io_method = sync      # 旧行为（18 之前的方式）

# io_method = worker 时的工作进程数
io_workers = 3
```

### 2.2 怎么用/怎么验证

```sql
SHOW io_method;
--  io_method
-- -----------
--  worker

-- 顺序扫描是主要受益者, 对比方式: 切换方法后各跑一次大表扫描
SET io_method = 'sync';   -- 会话级不允许切换时可全局修改后重启对比
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM big_table;

-- pg_stat_io 视图可观察读写统计（PG 16+ 引入, 18 中字段更完善）
SELECT reads, read_time, writes
FROM pg_stat_io
WHERE backend_type = 'client backend';
```

运维提示：升级到 18 后一般无需改动即默认受益（io_method 默认 worker）；
Linux 内核新且编译支持时，io_uring 值得更进一步测试。

## 3. uuidv7：时间有序的 UUID

### 3.1 为什么 UUIDv4 伤索引

UUIDv4 完全随机，插入位置在 B-tree 索引中随机分布，导致：

- 索引页频繁整页写、缓存命中率低；
- 表越大写入性能越差（随机写放大）。

UUIDv7 把 **48 位毫秒级时间戳**放在高位，剩余位保证唯一性，
因此生成的 UUID 按时间自然有序，插入永远落在索引右侧。

```sql
-- PG 18 新函数: uuidv7(); 同时 uuidv4() 成为 gen_random_uuid() 的别名
SELECT uuidv7();
--           uuidv7
-- --------------------------------------
--  01987e6a-4c2f-7cc0-9a1b-3d5e7f9a2b4c
--  ^~~~ 48位毫秒时间戳

-- 可指定时间戳保留位数（12 是默认, 介于 0-12 之间可调唯一性/有序性权衡）
SELECT uuidv7(12);

-- 新表推荐写法
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    payload JSONB
);
```

### 3.2 选型建议

| 方案 | 有序性 | 生成方 | 适用 |
| ---- | ------ | ------ | ---- |
| BIGINT IDENTITY | 全局有序 | 单库 | 无分布式诉求, 首选 |
| uuidv7() | 时间有序 | 任意节点 | 分布式 + 高写入 |
| uuidv4() | 无序 | 任意节点 | 兼容存量/极低写入 |

## 4. 虚拟生成列（VIRTUAL）

PG 12 只支持 STORED 生成列（写入时算好存盘）。PG 18 引入
**VIRTUAL**：查询时实时计算、不占存储，且成为**默认种类**。

```sql
CREATE TABLE order_items (
    id       SERIAL PRIMARY KEY,
    price    NUMERIC(10,2),
    quantity INT,
    subtotal NUMERIC(10,2) GENERATED ALWAYS AS (price * quantity) VIRTUAL
);

INSERT INTO order_items (price, quantity) VALUES (19.90, 3);
SELECT subtotal FROM order_items WHERE id = 1;
--  subtotal
-- ---------
--     59.70

-- PG 18 起省略 VIRTUAL/STORED 时默认 VIRTUAL:
--   total NUMERIC GENERATED ALWAYS AS (price * quantity)
```

选型：读多、要建索引 -> STORED（PG 18 起存储生成列还可被逻辑复制）；
写多、计算廉价、省存储 -> VIRTUAL。VIRTUAL 列不能直接建索引，
需要索引时改用表达式索引或 STORED。详见
[生成列](postgresql/150-GeneratedColumn)一文。

## 5. B-tree 跳跃扫描（Skip Scan）

复合索引 `(a, b)` 在旧版本中，查询缺 `a =` 前导列等值条件时无法用索引：

```sql
CREATE INDEX idx_orders_ua ON orders (user_group, amount);

-- PG 17 及以前: 下面查询无法使用 idx_orders_ua（前导列 user_group 无条件）
-- PG 18: 跳跃扫描会"虚拟枚举"每个 user_group 值, 逐段探测 amount
EXPLAIN SELECT * FROM orders WHERE amount = 199;
--                     QUERY PLAN
-- --------------------------------------------------------------
--  Index Only Scan using idx_orders_ua on orders
--    Index Cond: (amount = 199)
```

适用条件与预期：user_group 的不同值**较少**时收益明显（如状态位、
国家代码）；前导列基数极大时优化器可能仍选全表扫描。另外 PG 18
还改进了 WHERE 中 OR 条件的索引使用、并行构建 GIN 索引。

## 6. 时态约束：WITHOUT OVERLAPS 与 PERIOD

处理"有效期不重叠"这类业务（房价日历、合同、排班）再也不用
排他约束 + range 类型的组合拳，标准 SQL 时态语法直接内建：

```sql
CREATE TABLE room_prices (
    room_id  INT,
    price    NUMERIC,
    valid_at daterange,
    CONSTRAINT room_prices_pk PRIMARY KEY (room_id, valid_at WITHOUT OVERLAPS)
);

-- 外键侧: 引用端也可以携带 PERIOD, 保证引用区间落在被引用区间内
CREATE TABLE bookings (
    room_id      INT,
    stay_period  daterange,
    FOREIGN KEY (room_id, PERIOD stay_period)
      REFERENCES room_prices (room_id, PERIOD valid_at)
);

-- 插入重叠区间会被主键约束拒绝
INSERT INTO room_prices VALUES (1, 300, '[2026-09-01, 2026-09-10)');
INSERT INTO room_prices VALUES (1, 350, '[2026-09-05, 2026-09-15)');
-- ERROR: conflicting key value violates exclusion constraint "room_prices_pk"
```

## 7. 安全与认证

- **OAuth 2.0 客户端认证**：通过扩展提供 OAuth 机制，连接数据库可
  走统一的企业身份平台（SSO）。
- **md5 密码认证正式弃用**：`password_encryption` 默认早已是
  scram-sha-256，18 中 md5 认证被标记弃用，尽快迁移存量账号：

```sql
-- 查出仍在用 md5 存储密码的角色
SELECT rolname FROM pg_authid WHERE rolpassword LIKE 'md5%';
-- 重新设置密码即按当前 password_encryption 存储
ALTER ROLE legacy_user PASSWORD '新口令';
-- 确认 pg_hba.conf 中对应行的方法为 scram-sha-256
```

- TLS 方面：新增 `ssl_tls13_ciphers` 控制 TLS 1.3 套件。

## 8. 升级与运维改进

```
- pg_upgrade 升级后保留优化器统计信息（此前必须升级后全库 ANALYZE,
  大库要数小时; 现在升级完即可达到预期性能）
- pg_upgrade --jobs 并行执行检查, --swap 直接交换目录（不再复制/克隆）
- 新集群默认开启数据页校验和; 从无校验和老集群升级时注意用
  pg_upgrade --no-data-checksums 保持一致
- RETURNING 支持 OLD / NEW: UPDATE/DELETE/INSERT/MERGE 均可同时
  返回新旧值
UPDATE tasks SET status = 'done' WHERE id = 42
RETURNING id, OLD.status AS old_status, NEW.status AS new_status;
--  id | old_status | new_status
-- ----+------------+------------
--  42 | pending    | done
- 逻辑复制: 冲突信息写入日志与 pg_stat_subscription_stats;
  CREATE SUBSCRIPTION 默认 streaming = parallel; 新增
  idle_replication_slot_timeout 自动清理闲置复制槽
- EXPLAIN ANALYZE 默认显示缓冲区访问与索引查找次数
```

## 9. 升级建议与注意事项

1. **升级路径**：17 -> 18 使用 pg_upgrade（本次可保留统计信息）；
   跨大版本升级前先在预生产环境跑应用回归。
2. **校验和默认值变化**：新 initdb 的集群默认开校验和；从旧集群
   pg_upgrade 时会保持旧集群设置，如需开启用 `pg_checksums`。
3. **全文检索与 pg_trgm 索引**：18 改用集群默认 collation provider
   构建 FTS，升级后相关索引需要 REINDEX（升级日志与文档有明确提示）。
4. **驱动兼容**：新线上协议 3.2，旧驱动仍可用 3.0 连接；建议同步
   升级 libpq/JDBC/psycopg 以获得完整特性。
5. **回滚预案**：pg_upgrade --swap 模式下保留旧目录即可快速回切，
   升级演练时确认该路径。

## 小结

- 初学者要点：PG 18（2025-09）四个最常用的新玩具——`uuidv7()`
  替代随机 UUID 主键、VIRTUAL 虚拟生成列省存储、B-tree 跳跃扫描
  让复合索引第二列也能"单飞"、`io_method = worker` 默认加速读取。
- 进阶注意：时态约束（WITHOUT OVERLAPS / PERIOD）可替代大量手写
  排他校验；md5 认证已弃用应尽快迁移；pg_upgrade 保留统计信息
  显著缩短升级窗口；开启增量备份仍需 PG 17+ 的 WAL 摘要机制
  （见[增量备份](postgresql/450-IncrementalBackup)一文）。
