---
order: 320
title: EXPLAIN 输出详解
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL EXPLAIN执行计划详解：type、key、key_len、rows、filtered、Extra字段语义、FORMAT=TREE与EXPLAIN ANALYZE实战诊断
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/310-IndexFailureScene'
  - 'mysql/340-SlowQueryLog'
  - 'mysql/350-OptimizerTrace'
  - 'mysql/330-MySQLIndexExecutionPlan'
prerequisites:
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
---

## 1. EXPLAIN 的三种形态

```sql
-- 传统表格输出（默认）
EXPLAIN SELECT * FROM employees WHERE dept_id = 5;

-- JSON 输出：包含成本估算、优化器细节（8.0 中信息最全）
EXPLAIN FORMAT = JSON SELECT * FROM employees WHERE dept_id = 5;

-- 树状输出：8.0.16+，直观展示迭代器/算子树，EXPLAIN ANALYZE 的基础
EXPLAIN FORMAT = TREE SELECT * FROM employees WHERE dept_id = 5;

-- 分析其他连接正在执行的语句的执行计划（8.0.3+）
EXPLAIN FOR CONNECTION 42;
```

注意：8.4 起 `EXPLAIN FORMAT = JSON` 的部分内容（成本细节）逐步迁移到
`FORMAT = TREE`，学习时以 TREE 形态为主即可覆盖绝大多数场景。

## 2. 输出列总览

| 列            | 含义                         | 关注点                     |
| ------------- | ---------------------------- | -------------------------- |
| id            | SELECT 标识符，越大越先执行  | 子查询/UNION 的执行顺序    |
| select_type   | 查询类型                     | SIMPLE/PRIMARY/SUBQUERY 等 |
| table         | 访问的表                     | 派生表为 `<derivedN>`      |
| partitions    | 匹配的分区                   | 分区裁剪是否生效           |
| **type**      | 访问类型（最重要）           | 至少 range，理想 ref/const |
| possible_keys | 可能使用的索引               | 为 NULL 说明无可用索引     |
| **key**       | 实际使用的索引               | NULL = 没走索引            |
| key_len       | 使用的索引字节数             | 判断联合索引用了几列       |
| ref           | 与索引比较的列或常量         | const 表示等值常量         |
| **rows**      | 估算扫描行数                 | 越小越好，是估算值         |
| **filtered**  | 经存储引擎返回后剩余行比例   | 与 rows 相乘估算结果集     |
| **Extra**     | 附加执行信息                 | filesort/temporary 需警惕  |

## 3. type 访问类型

从优到差（官方文档排序）：

| type            | 说明                           | 示例                              |
| --------------- | ------------------------------ | --------------------------------- |
| system          | 表只有一行（const 特例）       | 系统表                            |
| const           | 主键/唯一索引等值查询          | `WHERE id = 1`                    |
| eq_ref          | JOIN 中被驱动表主键/唯一索引   | `JOIN ON a.id = b.id`             |
| ref             | 非唯一索引等值查询             | `WHERE dept_id = 5`               |
| fulltext        | 全文索引检索                   | `MATCH ... AGAINST`               |
| ref_or_null     | 类似 ref，附带一次 NULL 查找   | `WHERE dept_id = 5 OR dept_id IS NULL` |
| index_merge     | 多索引结果合并（intersection/union/sort_union） | `WHERE a=1 OR b=2` |
| unique_subquery | IN 子查询被改写为唯一索引查找  | `WHERE id IN (SELECT ...)`        |
| index_subquery  | IN 子查询被改写为非唯一索引查找 | `WHERE dept_id IN (...)`         |
| range           | 索引范围扫描                   | `WHERE id > 100`、`IN (...)`      |
| index           | 全索引扫描（按索引顺序扫全表） | 覆盖索引扫描、`ORDER BY id`       |
| ALL             | 全表扫描                       | 无可用索引                        |

经验基准：线上大表查询至少要 `range`，高频路径应达到 `ref` 及以上；
`index` 虽然走索引，但扫描量仍是全量，与 ALL 差距通常没有想象的大。

## 4. key 与 key_len

```sql
-- key：实际选择的索引名；key = NULL 说明未使用索引
-- key_len：索引中被"真正使用"的前缀字节数，可反推联合索引用了几个列

-- 以联合索引 idx(dept_id INT, name VARCHAR(50))、utf8mb4、列均允许 NULL 为例：
-- dept_id：4 字节(INT) + 1 字节(NULL 标记) = 5
-- name  ：50 × 4(utf8mb4 每字符 4 字节) + 2(变长长度前缀) + 1(NULL 标记) = 203
--
-- key_len = 5   → 只用到 dept_id
-- key_len = 208 → 用到 dept_id + name（5 + 203）
```

计算要点：

1. 定长类型按声明字节数：INT=4、BIGINT=8、DATE=3、DATETIME=5（8.0 小数秒另计）；
2. 变长类型 = 声明字符数 × 字符集最大字节数 + 长度前缀（utf8mb4 为 4）；
3. 列允许 NULL 时 +1 字节（NOT NULL 列不加）；
4. 常见错误：按 utf8（每字符 3 字节）去算 utf8mb4 的 key_len。

## 5. rows 与 filtered

```sql
-- rows：优化器基于统计信息的估算扫描行数（不是精确值）
-- filtered：经索引取数后剩余比例（0.00-100.00）
-- 预估结果集 ≈ rows × filtered / 100

-- rows=1000, filtered=10.00 → 预估最终约 100 行

-- rows 明显失真（比如实际 10 行估成 100 万）时：
ANALYZE TABLE employees;   -- 重新采样统计信息
```

rows 失真是「计划选错」最常见的原因：估算行数影响成本模型，
进而影响索引选择、JOIN 顺序与 JOIN 算法。持续失真可考虑
`ANALYZE TABLE ... UPDATE HISTOGRAM ON col`（直方图，见统计信息一章）。

## 6. Extra 常见值速查

| Extra 值                          | 含义与处置                                       |
| --------------------------------- | ------------------------------------------------ |
| Using index                       | 覆盖索引，无需回表（好信号）                     |
| Using where                       | Server 层再做过滤（中性，需结合 rows 判断）      |
| Using index condition             | 索引下推 ICP：条件在引擎层用索引数据过滤         |
| Using temporary                   | 使用内部临时表（GROUP BY/DISTINCT），考虑优化    |
| Using filesort                    | 额外排序（内存或磁盘），大结果集需警惕           |
| Using join buffer (hash join)     | 无可用索引时 Hash Join（8.0.20+ 的统一标签）     |
| Using join buffer (Batched Key Access) | BKA 批量索引访问                            |
| Using MRR                         | 多范围读：先收集主键排序再回表，降低随机 IO      |
| Using index for group-by          | 松散索引扫描完成 GROUP BY/MIN/MAX                |
| Backward index scan               | 按索引反向扫描（8.0+ 显式标出）                  |
| Select tables optimized away      | MIN/MAX/COUNT 直接读索引极值，零扫描             |
| Impossible WHERE                  | WHERE 恒为假，语句未执行                         |
| Using where with pushed condition | 仅 NDB 集群：条件下推到数据节点                  |

> 8.0.20 起 `Block Nested Loop` 标签已消失，无索引连接统一显示
> `Using join buffer (hash join)`，老资料里的 BNL 优化技巧对 8.0.20+ 不再适用。

## 7. EXPLAIN FORMAT=TREE 输出解读

```sql
EXPLAIN FORMAT=TREE
SELECT e.name, d.dept_name
FROM employees e JOIN departments d ON e.dept_id = d.id
WHERE d.dept_name = 'QA';
```

典型输出（示意）：

```
-> Nested loop inner join  (cost=1012 rows=98)
    -> Index lookup on d using uk_dept_name (dept_name='QA')  (cost=0.35 rows=1)
    -> Index lookup on e using idx_dept_id (dept_id=d.id)  (cost=98 rows=98)
```

自上而下阅读：第一行是整体算子与总成本，缩进越深越先执行；
`cost` 是估算成本，`rows` 是估算行数。Hash Join、BKA 在 TREE 输出中
一眼可辨，这是 8.0.16+ 推荐的日常阅读方式。

## 8. EXPLAIN ANALYZE：真实执行统计

```sql
-- MySQL 8.0.18+：真正执行查询并报告每个算子的实际耗时与行数
EXPLAIN ANALYZE
SELECT * FROM employees WHERE dept_id = 5 AND salary > 8000;
```

典型输出（示意）：

```
-> Filter: (e.salary > 8000)  (cost=1020 rows=30) (actual time=0.12..0.45 rows=12 loops=1)
    -> Index lookup on e using idx_dept_id (dept_id=5)  (cost=1020 rows=98) (actual time=0.10..0.30 rows=98 loops=1)
```

| 指标         | 含义                                   |
| ------------ | -------------------------------------- |
| actual time  | 实际耗时（毫秒），第一个数是首行，第二个是全部 |
| actual rows  | 实际返回行数，与估算 rows 对比         |
| loops        | 该算子被执行的次数（嵌套循环内层会大） |

核心用法：**估算 rows 与 actual rows 严重偏离时，优先怀疑统计信息**，
其次检查是否有更优索引。注意 EXPLAIN ANALYZE 会真正执行语句（只支持
SELECT 类查询），大查询和带锁读要谨慎在生产库直接运行。

## 9. 常见误读清单

1. **type=ALL 未必是问题**：小表（几十行）全表扫描比走索引更快；
2. **key 有值不等于高效**：`type=index` 是全索引扫描，可能比 ALL 更慢；
3. **possible_keys 为 NULL 但 key 有值**：常见于覆盖索引扫描，正常；
4. **Using filesort 不一定是磁盘排序**：小数据集在内存完成，先看 rows 再下结论；
5. **rows/filtered 都是估算**：判断计划好坏用 EXPLAIN ANALYZE 的实测值。

## 10. 小结

- 先看 `type/key/rows/Extra` 四件套定位数量级问题，再用 TREE 输出理解算子结构；
- `key_len` 按「字节数 × 字符集 + NULL 标记 + 变长前缀」手工核算，验证联合索引前缀利用；
- 估算失真先 `ANALYZE TABLE`，再配合直方图与 optimizer trace 深挖；
- `EXPLAIN ANALYZE` 是 8.0 时代排障的分水岭工具：让「猜计划」变成「看实测」。
