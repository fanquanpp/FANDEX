---
order: 310
title: MERGE 与 UPSERT
module: 'sql'
category: 数据库
difficulty: intermediate
description: 合并写入三件套：PostgreSQL/SQLite 的 ON CONFLICT、MySQL 的 ON DUPLICATE KEY UPDATE、标准 MERGE 语句，附方言对照与并发陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/120-DML'
  - 'sql/100-Constraint'
prerequisites:
  - 'sql/120-DML'
---

## 1. 一句话入门

**UPSERT** 解决一个极常见的问题：记录存在就更新，不存在就插入。不用它之前，
你要写"先 SELECT 判断、再 INSERT 或 UPDATE"两步——并发下两个请求会同时判断
"不存在"、同时插入，主键冲突直接报错。UPSERT 把"判断 + 写入"合并成一条
**原子语句**，数据库在行锁保护下完成，天然无竞态。

三种主流写法分属不同阵营：

| 写法 | 阵营 | 说明 |
| ---- | ---- | ---- |
| `INSERT ... ON CONFLICT` | PostgreSQL、SQLite | 推荐掌握，语义清晰 |
| `INSERT ... ON DUPLICATE KEY UPDATE` | MySQL / MariaDB | MySQL 唯一原生选择 |
| `MERGE INTO` | SQL 标准（SQL Server、Oracle、PostgreSQL 15+） | 功能最全，还能删除 |

> **类比**：UPSERT 像"置顶便签"——便签不存在就贴一张新的，存在就改写原便签；
> 无论谁来操作，墙上永远只有一张同名的便签。

## 2. 准备练习数据

以下示例都可以整段复制运行（以 PostgreSQL / SQLite 为主，MySQL 差异单独标注）：

```sql
CREATE TABLE inventory (
    product_id INT PRIMARY KEY,
    qty        INT NOT NULL,
    updated_at DATE
);

INSERT INTO inventory VALUES (100, 10, DATE '2026-01-01');
```

## 3. PostgreSQL / SQLite：ON CONFLICT

### 3.1 基本用法

```sql
-- 冲突时更新：新数量与旧数量累加
INSERT INTO inventory (product_id, qty, updated_at)
VALUES (100, 5, DATE '2026-09-01')
ON CONFLICT (product_id)
DO UPDATE SET qty = inventory.qty + EXCLUDED.qty,
              updated_at = EXCLUDED.updated_at;
-- EXCLUDED 是"本想插入但被冲突拦下"的那一行，qty = 5
-- 执行后 product_id=100 的 qty 从 10 变为 15

-- 冲突时什么都不做
INSERT INTO inventory (product_id, qty)
VALUES (100, 1)
ON CONFLICT (product_id) DO NOTHING;
-- 表数据不变，也不报错
```

要点：

- `ON CONFLICT (列)` 的冲突目标必须是**唯一约束或主键**覆盖的列——数据库靠它
  判断"是否存在"；普通列做不了仲裁。
- `EXCLUDED` 是 SQL 标准里的特殊表名，代表"被拒绝的候选行"，只能在这条
  语句内部使用。
- `DO UPDATE` 里引用目标表要写表名（`inventory.qty`）而不是别名。

### 3.2 带条件的 UPSERT

```sql
-- 仅当新值更大时才更新（适合"取最大值"语义）
INSERT INTO inventory (product_id, qty)
VALUES (100, 20)
ON CONFLICT (product_id)
DO UPDATE SET qty = EXCLUDED.qty
WHERE EXCLUDED.qty > inventory.qty;
-- 20 > 15 成立，qty 变为 20；
-- 若再来一条 qty=5 的插入，条件不满足，DO UPDATE 跳过，原值保留
```

### 3.3 SQLite 差异

SQLite 3.24.0（2018 年）起支持同样的 `ON CONFLICT` 语法，关键字和语义与
PostgreSQL 一致（`excluded` 小写也可），是移动端、嵌入式场景做幂等写入的标准手段。

## 4. MySQL：ON DUPLICATE KEY UPDATE

MySQL 没有 `ON CONFLICT`，对应能力由 `ON DUPLICATE KEY UPDATE` 提供——
冲突判断依据是**任何**唯一键（主键或唯一索引）：

```sql
INSERT INTO inventory (product_id, qty, updated_at)
VALUES (100, 5, '2026-09-01')
ON DUPLICATE KEY UPDATE
  qty = qty + 5,
  updated_at = '2026-09-01';
-- qty 从 20 变为 25

-- MySQL 8.0.19+ 可用行别名引用"想插入的行"（推荐，可读性更好）
INSERT INTO inventory (product_id, qty, updated_at) VALUES (100, 3, '2026-09-02') AS new_row
ON DUPLICATE KEY UPDATE qty = qty + new_row.qty, updated_at = new_row.updated_at;
-- qty 25 + 3 = 28
```

注意：`VALUES(col)` 函数式的旧写法（`qty = qty + VALUES(qty)`）在 MySQL 8.0.20
起已被弃用，新代码统一用行别名。

**affected rows 的特殊语义**：插入成功返回 1，冲突转更新返回 2，值没变化返回 0。
程序里依赖该返回值做判断时要记得这条规则。

MySQL 另有两个"伪 UPSERT"，行为差异大，必须分清：

```sql
-- INSERT IGNORE：冲突时静默跳过，既不插入也不更新（只给 warning）
INSERT IGNORE INTO inventory VALUES (100, 1, '2026-09-01');

-- REPLACE INTO：先 DELETE 冲突行，再插入新行
REPLACE INTO inventory VALUES (100, 99, '2026-09-01');
-- 注意三个副作用：自增主键换了新值；DELETE 触发器会触发；
-- 被外键引用的行若为 RESTRICT 策略会直接失败
```

`REPLACE INTO` 不是"更新"，是"删旧插新"，大多数字段会被整行覆盖，慎用。

## 5. MERGE：标准的多分支合并

### 5.1 语法与语义

`MERGE` 是 SQL:2003 标准语句，一次扫描源数据，按匹配情况分别执行更新、插入、删除：

```sql
MERGE INTO inventory t
USING (VALUES (100, 5), (101, 30)) AS s(product_id, qty)
ON t.product_id = s.product_id
WHEN MATCHED THEN
  UPDATE SET t.qty = t.qty + s.qty
WHEN NOT MATCHED THEN
  INSERT (product_id, qty) VALUES (s.product_id, s.qty);
-- 100 已存在：qty 28 + 5 = 33（走 UPDATE 分支）
-- 101 不存在：插入新行 (101, 30)（走 INSERT 分支）
```

`USING` 后面可以是任何表、视图或子查询；每个分支都可以加 `AND 条件` 做更细的
分流，还可以有 `WHEN MATCHED THEN DELETE` 分支——"同步增量数据"场景
（源表有删除、目标表也要跟着删）只有 MERGE 能一句写完。

### 5.2 支持面（重要）

| 数据库   | MERGE 支持情况 |
| -------- | -------------- |
| SQL Server / Oracle | 早年即支持，语法成熟 |
| PostgreSQL | **15**（2022-10）才引入；初版不能删除、不能 RETURNING；17（2024-09）补上 `WHEN NOT MATCHED ... BY SOURCE` 与 `RETURNING` |
| MySQL / MariaDB | 至今不支持，用 `ON DUPLICATE KEY UPDATE` |
| SQLite   | 不支持，用 `ON CONFLICT` |

因此跨库代码首选 UPSERT 写法；MERGE 留给"需要删除分支或复杂条件分流"的场景。

### 5.3 经典陷阱：源数据重复

```sql
-- s 里有两行 product_id=100 → 目标行被试图更新两次 → 直接报错
-- PostgreSQL: ON CONFLICT DO UPDATE command cannot affect row a second time
-- SQL Server: attempted to UPDATE or DELETE the same row more than once
```

正确姿势：先在源里聚合去重，保证每个目标键只出现一次：

```sql
MERGE INTO inventory t
USING (SELECT product_id, SUM(qty) AS qty
       FROM incoming GROUP BY product_id) AS s
ON t.product_id = s.product_id
WHEN MATCHED THEN UPDATE SET t.qty = t.qty + s.qty
WHEN NOT MATCHED THEN INSERT (product_id, qty) VALUES (s.product_id, s.qty);
```

## 6. 完整实战：每日库存对账

场景：每天有一份 `daily_incoming`（当日入库流水），要合并进总量表 `inventory`，
已存在的累加、新商品插入、在 `daily_removed` 里登记下架的商品从总量表删除。

```sql
CREATE TABLE daily_incoming (product_id INT, qty INT);
CREATE TABLE daily_removed  (product_id INT);
INSERT INTO daily_incoming VALUES (100, 2), (102, 7);   -- 100 存量商品，102 新品
INSERT INTO daily_removed  VALUES (101);

-- 第一步：PostgreSQL 17+ 一条 MERGE 完成三件事
MERGE INTO inventory t
USING (SELECT product_id, SUM(qty) AS qty FROM daily_incoming GROUP BY product_id) s
ON t.product_id = s.product_id
WHEN MATCHED THEN UPDATE SET t.qty = t.qty + s.qty, updated_at = CURRENT_DATE
WHEN NOT MATCHED THEN INSERT (product_id, qty) VALUES (s.product_id, s.qty)
WHEN NOT MATCHED BY SOURCE AND t.product_id IN (SELECT product_id FROM daily_removed)
  THEN DELETE;
-- 预期：100 的 qty 33 + 2 = 35；102 插入 7；下架商品按登记被删除
```

PostgreSQL 15/16 或 SQL Server 上，最后一步删除拆成独立的

```sql
DELETE FROM inventory
WHERE product_id IN (SELECT product_id FROM daily_removed);
```

两步组合语义相同、可移植性更好——**不要为了"一条语句"硬套 MERGE**。

## 7. 陷阱与调试

1. **冲突目标必须唯一**：`ON CONFLICT (qty)` 这种非唯一列会直接报错"没有匹配的
   唯一约束"；先确认表上确实建了主键或唯一索引。
2. **多行插入内部的键重复**：`INSERT ... VALUES (1,..),(1,..) ON CONFLICT ...`
   同一条语句内部自己撞自己，PostgreSQL 会报 cannot affect row a second time——
   先去重再插入。
3. **MySQL 的 affected rows 语义**（1/2/0）与普通 INSERT 不同，ORM 与重试逻辑
   常在这里误判。
4. **REPLACE 的连锁反应**：删旧插新会消耗新的自增号、触发 DELETE 触发器、
   可能被外键拦截，并不是安全的"更新"。
5. **并发下的 SQL Server MERGE**：默认隔离级别下 MERGE 并非原子，高并发可能
   违反唯一约束，需加 `WITH (HOLDLOCK)`；官方与社区的一致建议是——并发密集
   场景改用"`UPDATE` 影响行数为 0 再 `INSERT`（捕获唯一键冲突重试）"的经典组合。
6. **UPSERT 不是幂等保险箱**：`qty = qty + 5` 这类累加语句重复执行会重复累加，
   消息队列重放、接口重试场景要给源数据带唯一业务号（如 `ON CONFLICT (msg_id) DO NOTHING`）。

## 8. 方言对照速查

| 能力 | PostgreSQL | MySQL | SQLite | SQL Server |
| ---- | ---------- | ----- | ------ | ---------- |
| 条件 UPSERT | `ON CONFLICT ... DO UPDATE` | `ON DUPLICATE KEY UPDATE` | `ON CONFLICT ... DO UPDATE`（3.24+） | `MERGE` |
| 引用"想插入的行" | `EXCLUDED` | 行别名（8.0.19+） | `excluded` | `source` 别名 |
| 冲突时跳过 | `DO NOTHING` | `INSERT IGNORE` | `DO NOTHING` | `MERGE ... WHEN MATCHED THEN UPDATE SET 主键=主键`（变通） |
| 先删后插 | 无（不建议） | `REPLACE INTO` | `REPLACE INTO` | 无 |
| 多分支合并（含删除） | `MERGE`（15+，17 起含 BY SOURCE） | 不支持 | 不支持 | `MERGE` |

## 9. 小结

- 初学者要点：UPSERT = "存在则更新，否则插入"的原子操作；PostgreSQL/SQLite 用
  `ON CONFLICT`，MySQL 用 `ON DUPLICATE KEY UPDATE`，背下这两条能覆盖 90% 场景。
- 冲突仲裁只认主键与唯一索引；`EXCLUDED`/行别名是引用"想插入的行"的钥匙。
- 进阶注意：`REPLACE INTO` 是删旧插新不是更新；`INSERT IGNORE` 会吞掉其他错误
  值得警惕；MERGE 在 PostgreSQL 15 才登场且方言差异大，跨库首选 UPSERT；
  并发与消息重放场景下，把幂等性设计（唯一业务键 + 确定性写法）放在语法技巧之前。
