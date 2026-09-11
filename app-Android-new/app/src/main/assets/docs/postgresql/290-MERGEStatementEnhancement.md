---
order: 290
title: MERGE 语句增强
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL MERGE语句：条件分支UPSERT、WHEN NOT MATCHED BY SOURCE、RETURNING与merge_action（PG17增强）
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/280-PartitionPruningPartitionJoin'
  - 'postgresql/080-AdvancedSQL'
  - 'postgresql/040-DML'
  - 'postgresql/300-FullTextSearch'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
  - 'postgresql/040-DML'
---

## 1. MERGE 是什么，为什么需要它

同步两张表是后端开发的日常："源表里有就更新，没有就插入，目标表里
多余的标记删除"。用普通 SQL 写需要"UPDATE + INSERT + DELETE"三条语句
加事务包裹，还可能引入中间状态的竞态。**MERGE**（SQL:2008 标准）
把这套"对账"逻辑收敛为一条原子的语句。

类比：MERGE 像一趟**分拣流水线**——源包裹（USING 的数据集）逐个
送到分拣口（ON 条件），每个包裹按单据状态（MATCHED / NOT MATCHED）
流向不同出口（UPDATE / INSERT / DELETE / DO NOTHING）。

PostgreSQL 15 引入 MERGE；**PostgreSQL 17 补齐了 RETURNING、
`WHEN NOT MATCHED BY SOURCE` 分支与视图支持**，使其功能完整。

## 2. 完整语法与最小示例

```sql
MERGE INTO 目标表 [别名]
USING 源（表 / 子查询 / VALUES） [别名]
ON <连接条件>
WHEN MATCHED [AND <条件>] THEN
    UPDATE SET ... | DELETE | DO NOTHING
WHEN NOT MATCHED [BY TARGET] [AND <条件>] THEN
    INSERT (...) VALUES (...)
WHEN NOT MATCHED BY SOURCE [AND <条件>] THEN
    UPDATE SET ... | DELETE | DO NOTHING
RETURNING ...;   -- PostgreSQL 17+
```

```sql
-- 示例环境
CREATE TABLE stock (sku TEXT PRIMARY KEY, qty INT, archived BOOLEAN DEFAULT false);
CREATE TABLE incoming (sku TEXT PRIMARY KEY, qty INT);

INSERT INTO stock VALUES ('A-100', 5), ('B-200', 9);
INSERT INTO incoming VALUES ('A-100', 3), ('C-300', 7);
```

```sql
MERGE INTO stock s
USING incoming i ON s.sku = i.sku
WHEN MATCHED THEN
  UPDATE SET qty = i.qty
WHEN NOT MATCHED THEN
  INSERT (sku, qty) VALUES (i.sku, i.qty);

SELECT * FROM stock ORDER BY sku;
--  sku   | qty | archived
-- -------+-----+----------
--  A-100 |   3 | f        <- MATCHED, 被更新
--  B-200 |   9 | f        <- 源里没有, 不受影响
--  C-300 |   7 | f        <- NOT MATCHED, 被插入
```

## 3. 条件分支：一条语句多种去向

WHEN 子句按书写顺序求值，第一个命中的分支生效（类似 CASE WHEN），
每行至多被一个分支处理：

```sql
MERGE INTO employees e
USING staging s ON e.id = s.id
WHEN MATCHED AND e.salary < s.salary THEN
    UPDATE SET salary = s.salary, updated_at = now()
WHEN MATCHED AND e.salary > s.salary * 1.5 THEN
    DELETE                              -- 异常薪资数据直接删除
WHEN MATCHED THEN
    DO NOTHING                          -- 兜底分支必须放最后
WHEN NOT MATCHED THEN
    INSERT (id, name, salary) VALUES (s.id, s.name, s.salary);
```

### 3.1 WHEN NOT MATCHED BY SOURCE（PostgreSQL 17）

默认的 `WHEN NOT MATCHED` 全称是 `WHEN NOT MATCHED BY TARGET`——
"源有、目标没有"（走 INSERT）。PG 17 新增反向分支："目标有、源没有"，
用于对账式清理：

```sql
MERGE INTO stock s
USING incoming i ON s.sku = i.sku
WHEN MATCHED THEN
  UPDATE SET qty = i.qty
WHEN NOT MATCHED THEN
  INSERT (sku, qty) VALUES (i.sku, i.qty)
WHEN NOT MATCHED BY SOURCE THEN
  UPDATE SET archived = true;    -- 源里不再出现的库存, 标记归档而非物理删除

SELECT * FROM stock ORDER BY sku;
--  sku   | qty | archived
-- -------+-----+----------
--  A-100 |   3 | f
--  B-200 |   9 | t        <- BY SOURCE 分支: 被归档
--  C-300 |   7 | f
```

注意：BY SOURCE 分支里只能 UPDATE/DELETE/DO NOTHING，不能 INSERT。

## 4. RETURNING 与 merge_action（PostgreSQL 17）

```sql
MERGE INTO stock s
USING incoming i ON s.sku = i.sku
WHEN MATCHED THEN
  UPDATE SET qty = i.qty
WHEN NOT MATCHED THEN
  INSERT (sku, qty) VALUES (i.sku, i.qty)
RETURNING merge_action() AS action, s.sku, s.qty;

--  action  | sku   | qty
-- ---------+-------+-----
--  UPDATE  | A-100 |   3
--  INSERT  | C-300 |   7
```

- `merge_action()` 返回该行实际执行的分支（INSERT/UPDATE/DELETE），
  这是 PG 17 新函数；RETURNING 中引用目标表列返回更新后的新值。
- 应用场景：同步后直接得知"新插入多少、更新多少"，不必再 count 对账。

## 5. MERGE vs INSERT ON CONFLICT 怎么选

```sql
-- 简单单行 UPSERT: ON CONFLICT 更简洁且更不易出错
INSERT INTO stock (sku, qty) VALUES ('A-100', 3)
ON CONFLICT (sku) DO UPDATE SET qty = EXCLUDED.qty;
```

| 维度 | MERGE | INSERT ... ON CONFLICT |
| ---- | ----- | ---------------------- |
| 场景 | 源是结果集的对账式同步（多分支、含删除） | 单点 UPSERT |
| 分支数 | 任意多个 WHEN 条件分支 | 仅 DO NOTHING / DO UPDATE |
| 删除/归档多余行 | 支持（BY SOURCE, PG 17+） | 不支持 |
| 并发唯一冲突 | 源数据重复会报错（见下） | 天然防并发冲突（仲裁等待） |
| 来源 | SQL 标准 | PostgreSQL 扩展 |

经验法则：**同步整批数据用 MERGE，写单行/高并发 UPSERT 用
ON CONFLICT**。

## 6. 实战：夜间批量同步脚本

一个贴近生产的模板：从上游 staging 表同步到正式表，带去重、
审计字段与执行回执。

```sql
-- 准备: staging 可能含重复 SKU, 先聚合保证"源按键唯一"
CREATE TABLE incoming_stage (
    sku     TEXT,
    qty     INT,
    synced_at TIMESTAMPTZ DEFAULT now()
);

MERGE INTO stock s
USING (
    SELECT sku, sum(qty) AS qty
    FROM incoming_stage
    WHERE synced_at > now() - interval '1 day'
    GROUP BY sku              -- 关键: 消除"影响同一行两次"报错
) i ON s.sku = i.sku
WHEN MATCHED AND s.qty <> i.qty THEN
    UPDATE SET qty = i.qty
WHEN NOT MATCHED THEN
    INSERT (sku, qty) VALUES (i.sku, i.qty)
WHEN NOT MATCHED BY SOURCE AND NOT s.archived THEN
    UPDATE SET archived = true
RETURNING merge_action() AS action, s.sku;

-- RETURNING 的结果由客户端接收后统计（INSERT x 行 / UPDATE y 行）
-- 注意: MERGE 不能像 SELECT 那样包在子查询或 CTE 里做服务端二次聚合,
-- 若必须在数据库内统计, 可用 PL/pgSQL 循环处理 RETURNING 结果
```

批量同步的三条纪律：

1. **源必须按键唯一**（GROUP BY / DISTINCT ON），否则 MERGE 直接报错；
2. **条件尽量收紧**（如 `AND s.qty <> i.qty`），减少无谓的行版本与 WAL；
3. **放低峰期单事务执行**，超大批次可按主键分段循环，避免长事务。

## 7. 常见陷阱

- **源数据不唯一直接报错**：若源结果集里有两行命中目标的同一行，
  MERGE 报 `MERGE command cannot affect row a second time`。
  对策：USING 子查询先 GROUP BY 去重/聚合。
- **WHEN 顺序敏感**：条件分支按书写顺序短路，宽泛的 MATCHED 分支
  放在前面会让后面的条件永远不生效；`DO NOTHING` 兜底必须放最后。
- **BY TARGET / BY SOURCE 混淆**：默认 WHEN NOT MATCHED 指目标缺行
  （可 INSERT）；BY SOURCE 指源缺行（不可 INSERT）。PG 15/16 没有
  BY SOURCE 分支。
- **误以为 MERGE 能防止并发丢更新**：两个会话对同一目标行并发
  MERGE，仍是行锁排队 + 各自快照的语义，关键计数列同样建议
  `SELECT ... FOR UPDATE` 或乐观锁保护。
- **PG 15/16 的 MERGE 没有 RETURNING**：需要回执时用 PG 17+，
  或退回"ON CONFLICT + RETURNING"的组合。

## 小结

- 初学者要点：MERGE 用一条原子语句完成"有则更新、无则插入"；
  WHEN 分支按顺序短路；简单 UPSERT 场景 INSERT ON CONFLICT 仍然是
  更顺手的选择。
- 进阶注意：PG 17 起才有 `WHEN NOT MATCHED BY SOURCE`、RETURNING 与
  `merge_action()`，且 MERGE 开始支持视图（含 INSTEAD OF 触发器）；
  使用前先保证源数据按连接键唯一；条件分支的书写顺序就是执行顺序。
