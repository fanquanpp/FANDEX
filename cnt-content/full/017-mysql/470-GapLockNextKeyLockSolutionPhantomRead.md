---
order: 500
title: 间隙锁与临键锁解决幻读
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL InnoDB 间隙锁（Gap Lock）与临键锁（Next-Key Lock）详解：锁结构、加锁规则、幻读解决方案与死锁分析。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/520-RedoUndoBinlogWriteTiming'
  - 'mysql/530-TwoPhaseCommit'
  - 'mysql/650-ReplicationDelayCauseSolution'
  - 'mysql/670-ShardingStrategy'
prerequisites:
  - 'mysql/160-View'
---


## 1. 幻读问题

### 1.1 什么是幻读

同一事务内，两次相同的范围查询返回了不同的行集：

```sql
-- RR 隔离级别
BEGIN;
-- 第一次查询：2行
SELECT * FROM users WHERE age BETWEEN 20 AND 30;
-- id=2, age=25 | id=5, age=28

-- 其他事务插入了一行
-- INSERT INTO users VALUES (8, 'new', 26);

-- 第二次查询：3行 ← 幻读！
SELECT * FROM users WHERE age BETWEEN 20 AND 30;
-- id=2, age=25 | id=5, age=28 | id=8, age=26
```

### 1.2 快照读不会幻读

RR 隔离级别下，快照读通过 MVCC 的 ReadView 机制，始终读取事务开始时的数据快照，不会出现幻读。

### 1.3 当前读的幻读

当前读读取最新数据，不加间隙锁时会出现幻读：

```sql
BEGIN;
-- 当前读
SELECT * FROM users WHERE age BETWEEN 20 AND 30 FOR UPDATE;
-- 锁定 id=2 和 id=5 两行

-- 其他事务可以插入 age=26 的新行（行间间隙未被锁定）
INSERT INTO users VALUES (8, 'new', 26);  -- 成功！

-- 再次当前读
SELECT * FROM users WHERE age BETWEEN 20 AND 30 FOR UPDATE;
-- 多了一行！幻读！
```

## 2. 间隙锁（Gap Lock）

### 2.1 间隙锁概念

间隙锁锁定**索引记录之间的间隙**，阻止其他事务在间隙中插入新记录。

```
索引 age: ... | 20 | 25 | 28 | 30 | ...

间隙: (-∞, 20), (20, 25), (25, 28), (28, 30), (30, +∞)

Gap Lock 锁定 (20, 25) → 阻止插入 age=21,22,23,24
```

### 2.2 间隙锁的特性

- **纯抑制锁**：间隙锁之间不互斥，只阻止插入
- **不锁定记录本身**：只锁定记录间的间隙
- **仅在 RR 隔离级别生效**：RC 隔离级别下间隙锁失效
- **自动释放**：事务提交或回滚后释放

```sql
-- 两个事务可以同时持有同一间隙的 Gap Lock
-- 事务A: SELECT * FROM users WHERE age = 26 FOR UPDATE;  -- Gap Lock (25, 28)
-- 事务B: SELECT * FROM users WHERE age = 27 FOR UPDATE;  -- Gap Lock (25, 28) — 不冲突！
-- 但事务A或B都无法在 (25, 28) 间隙中插入数据
```

## 3. 临键锁（Next-Key Lock）

### 3.1 临键锁概念

临键锁 = **行锁（Record Lock） + 间隙锁（Gap Lock）**，锁定一条记录及其前面的间隙。

```
Next-Key Lock = Gap Lock (前间隙) + Record Lock (记录)

索引 age: ... | 20 | 25 | 28 | 30 | ...

Next-Key Lock 锁定 (20, 25]：
  - Gap Lock: (20, 25) — 阻止插入 age=21,22,23,24
  - Record Lock: 25 — 阻止修改/删除 age=25 的行
```

### 3.2 临键锁的加锁规则

InnoDB 的加锁规则（基于 MySQL 8.0）：

**规则1**：加锁的基本单位是 Next-Key Lock

**规则2**：查找过程中访问到的对象才会加锁

**规则3**：等值查询，唯一索引，Next-Key Lock 退化为行锁

**规则4**：等值查询，向右遍历到最后一个不满足条件的值时，Next-Key Lock 退化为 Gap Lock

**规则5**：范围查询，会对扫描到的范围加 Next-Key Lock

### 3.3 加锁示例

```sql
-- 表结构
CREATE TABLE t (id INT PRIMARY KEY, c INT, KEY(c));
INSERT INTO t VALUES (5,5), (10,10), (15,15), (20,20);

-- 示例1：等值查询唯一索引
SELECT * FROM t WHERE id = 10 FOR UPDATE;
-- 加锁: 行锁 id=10（规则3：唯一索引退化为行锁）

-- 示例2：等值查询普通索引
SELECT * FROM t WHERE c = 10 FOR UPDATE;
-- 加锁: Next-Key Lock (5, 10] + Gap Lock (10, 15)
-- (5,10]: c=10 的 Next-Key Lock
-- (10,15): 规则4，向右遍历到15不满足，退化为 Gap Lock

-- 示例3：范围查询
SELECT * FROM t WHERE c >= 10 AND c < 15 FOR UPDATE;
-- 加锁: Next-Key Lock (5, 10] + Next-Key Lock (10, 15]
-- 扫描到 c=10 和 c=15

-- 示例4：无匹配的等值查询
SELECT * FROM t WHERE c = 12 FOR UPDATE;
-- 加锁: Gap Lock (10, 15)
-- 规则4：c=12不存在，向右遍历到15，退化为 Gap Lock
```

## 4. 幻读解决方案

### 4.1 当前读 + 临键锁

```sql
BEGIN;
-- 当前读加临键锁
SELECT * FROM users WHERE age BETWEEN 20 AND 30 FOR UPDATE;

-- 加锁范围:
-- 假设索引 age 有值: 20, 25, 28, 30
-- Next-Key Lock: (20, 25], (25, 28], (28, 30]
-- Gap Lock: (30, +∞) 如果扫描到30之后

-- 其他事务无法在锁定范围内插入
INSERT INTO users VALUES (8, 'new', 26);  -- 阻塞！被 (25, 28] 阻止
INSERT INTO users VALUES (9, 'new', 22);  -- 阻塞！被 (20, 25] 阻止

-- 再次查询结果一致
SELECT * FROM users WHERE age BETWEEN 20 AND 30 FOR UPDATE;
COMMIT;
```

### 4.2 不同索引的加锁差异

```sql
-- 无索引：锁全表
SELECT * FROM users WHERE name = 'Alice' FOR UPDATE;
-- 所有行和间隙都被锁定

-- 主键索引：只锁行
SELECT * FROM users WHERE id = 5 FOR UPDATE;
-- 只锁 id=5 这一行

-- 唯一索引：锁索引行 + 主键行
SELECT * FROM users WHERE email = 'a@b.com' FOR UPDATE;
-- 唯一索引上的行锁 + 主键上的行锁

-- 普通索引：临键锁 + 主键行锁
SELECT * FROM users WHERE age = 25 FOR UPDATE;
-- age 索引: Next-Key Lock + Gap Lock
-- 主键索引: 行锁
```

## 5. 死锁场景分析

### 5.1 间隙锁导致的死锁

```sql
-- 初始数据: id=5(c=5), id=10(c=10)

-- 事务A
BEGIN;
SELECT * FROM t WHERE c = 7 FOR UPDATE;
-- Gap Lock (5, 10)

-- 事务B
BEGIN;
SELECT * FROM t WHERE c = 8 FOR UPDATE;
-- Gap Lock (5, 10) — 间隙锁不互斥

-- 事务A
INSERT INTO t VALUES (7, 7);
-- 等待事务B的 Gap Lock 释放

-- 事务B
INSERT INTO t VALUES (8, 8);
-- 等待事务A的 Gap Lock 释放
-- 死锁！
```

### 5.2 避免死锁的策略

1. **按固定顺序访问**：避免交叉锁定
2. **缩小锁定范围**：使用索引减少锁定行数
3. **降低隔离级别**：RC 下无间隙锁
4. **缩短事务**：减少持锁时间
5. **使用乐观锁**：避免使用 FOR UPDATE

```sql
-- 查看死锁日志
SHOW ENGINE INNODB STATUS;

-- 锁等待超时（秒，默认 50；注意这是"等锁超时"，死锁本身由等待图即时检测）
SET GLOBAL innodb_lock_wait_timeout = 50;
```

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：幻读是什么？"快照读"为什么天然看不见幻影行？

参考答案（先自己答，再对照）：幻读 = 同一事务内两次相同范围查询，第二次多出（或少）了行——其他事务在范围内插入了新行。快照读走 MVCC：RR 下 ReadView 事务内只拍一次，新插入行的事务 ID 大于 ReadView 的活跃边界，可见性判定为"不可见"，所以快照读的两次结果天然一致。幻读只在当前读路径（FOR UPDATE/普通 UPDATE）上暴露。

2. 概念自问：间隙锁与临键锁（Next-Key Lock）的加锁区间分别是什么？唯一索引等值命中的特例是什么？

参考答案（先自己答，再对照）：间隙锁锁住开区间 (前一个值, 后一个值)，只防插入、不互斥（两个事务可同时持有同一间隙的间隙锁）；临键锁 = 间隙锁 + 右端点的记录锁，即左开右闭区间 (a, b]，是 RR 下范围查询的默认加锁单位。特例：唯一索引（含主键）等值且命中时，行存在则退化为纯记录锁，不需要防插入——范围锁是给"值可能不存在"的场景准备的。

3. 判断题：两个事务同时对同一间隙加间隙锁会互相等待，谁也走不动。

参考答案（先自己答，再对照）：不会等待——间隙锁彼此兼容（这正是它"只防插入"的代价：防插入的意图靠插入意向锁与间隙锁冲突实现）。真正的死锁模式是：A、B 各自拿到同一间隙的间隙锁，随后 A 插入等待 B 的间隙锁释放、B 插入等待 A 的——插入意向锁被对方的间隙锁挡住，互相等待构成死锁。这也是 RR 下"先 SELECT FOR UPDATE 空范围再 INSERT"是反模式的原因。

4. 概念自问：RR 下防止幻读的两条路径分别是什么？各自的代价？

参考答案（先自己答，再对照）：路径一，当前读显式加锁（SELECT ... FOR UPDATE），范围查询加临键锁把插入彻底挡在区间外——代价是锁范围大、并发骤降、间隙锁死锁概率上升；路径二，业务层用唯一约束兜底（重复插入被 1062 拦下），读侧接受快照语义——代价是"查询看不到但数据存在"的语义折衷。数据库给出的工具就这两类，大多数业务选"唯一约束 + 快照读"的组合。

## 下一步
