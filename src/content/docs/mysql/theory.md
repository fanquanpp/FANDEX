---
title: 'MySQL 理论知识点'
module: 'mysql'
order: 200
tags:
  - 'mysql'
  - 'theory'
  - 'database'
  - 'data-structure'
difficulty: 'intermediate'
description: '存储引擎、事务模型、锁机制与日志体系。'
---

          [10|20]   [30|40|50]   [60|70|80]
          /    \     /  |  \      /  |  \
        ->10->20->  ->30->40->50->  ->60->70->80->
        |___________leaf linked list______________|

```

### B+ 树 vs B 树

| 特性 | B+ 树 | B 树 |
|------|-------|------|
| 数据存储位置 | 仅叶子节点 | 所有节点 |
| 叶子节点链接 | 双向链表 | 无 |
| 非叶子节点 | 仅存键值+指针 | 存键值+数据+指针 |
| 单次查找 | 必须到叶子节点 | 可能在中间节点找到 |
| 范围查询 | 高效（遍历链表） | 需要中序遍历 |
| 空间利用率 | 非叶子节点更紧凑 | 非叶子节点存数据，扇出低 |

### 为什么 MySQL 选择 B+ 树

1. **磁盘 I/O 优化** -- B+ 树的扇出（fan-out）远大于 B 树，因为非叶子节点不存数据，同样大小的磁盘页能容纳更多键值。一棵 3 层的 B+ 树（假设每页 16KB，键值 8 字节+指针 6 字节）可存储约 2000 万条记录。

2. **范围查询高效** -- 叶子节点的双向链表使得范围查询只需找到起点后顺序遍历，无需回溯父节点。

3. **查询性能稳定** -- 每次查找都从根到叶子，路径长度相同，查询时间稳定。

### B+ 树的插入与分裂

当叶子节点的键值数超过阶数时，节点分裂：

1. 将节点分为两半
2. 中间键值提升到父节点
3. 如果父节点也满了，递归分裂

树的高度增长是从底部向上传播的，这保证了树的平衡性。

### B+ 树与哈希索引的对比

| 特性 | B+ 树 | 哈希索引 |
|------|-------|---------|
| 等值查询 | O(log n) | O(1) |
| 范围查询 | 支持 | 不支持 |
| 排序 | 支持 | 不支持 |
| 最左前缀 | 支持 | 不支持 |
| 存储空间 | 较大 | 较小 |
| 适用场景 | 通用 | 等值查询密集 |

InnoDB 的自适应哈希索引（AHI）会在检测到某些索引页被频繁访问时，自动为这些页构建哈希索引。

---

## MVCC（Multi-Version Concurrency Control）

### MVCC 的目的

MVCC 解决读写冲突问题，使得读操作不阻塞写操作，写操作不阻塞读操作。每个事务看到的是数据在某个时间点的一致性快照。

### InnoDB 的 MVCC 实现

MVCC 通过三个机制协同工作：

1. **隐藏列** -- 每行记录包含两个隐藏列
2. **Undo Log** -- 存储数据的历史版本
3. **Read View** -- 决定事务能看到哪个版本

#### 隐藏列

每行记录包含：
- `DB_TRX_ID`（6 字节）-- 最后修改该行的事务 ID
- `DB_ROLL_PTR`（7 字节）-- 指向 undo log 中该行的前一个版本
- `DB_ROW_ID`（6 字节）-- 隐藏自增 ID（无主键时使用）

#### 版本链

通过 `DB_ROLL_PTR` 将一行数据的多个版本串联成链表：

```

当前版本: {data_v3, trx_id=300, roll_ptr -> v2}
|
v
历史版本: {data_v2, trx_id=200, roll_ptr -> v1}
|
v
历史版本: {data_v1, trx_id=100, roll_ptr -> NULL}

```

#### Read View

Read View 记录当前活跃事务的 ID 列表，用于判断某个版本对当前事务是否可见。

Read View 包含：
- `m_ids` -- 创建 Read View 时活跃事务 ID 列表
- `min_trx_id` -- `m_ids` 中的最小值
- `max_trx_id` -- 下一个将分配的事务 ID（即当前最大事务 ID + 1）
- `creator_trx_id` -- 创建该 Read View 的事务 ID

可见性判断规则：

1. 如果 `trx_id == creator_trx_id`，可见（自己修改的）
2. 如果 `trx_id < min_trx_id`，可见（事务已提交）
3. 如果 `trx_id >= max_trx_id`，不可见（事务在 Read View 创建后开始）
4. 如果 `min_trx_id <= trx_id < max_trx_id`：
   - 如果 `trx_id` 在 `m_ids` 中，不可见（事务未提交）
   - 如果 `trx_id` 不在 `m_ids` 中，可见（事务已提交）

如果当前版本不可见，沿版本链继续查找前一个版本。

### 不同隔离级别的 Read View 策略

| 隔离级别 | Read View 创建时机 | 效果 |
|---------|-------------------|------|
| READ COMMITTED | 每次 SELECT 创建新 Read View | 可看到其他事务已提交的修改 |
| REPEATABLE READ | 事务中第一次 SELECT 创建 Read View | 事务中始终看到一致的快照 |
| READ UNCOMMITTED | 不使用 Read View | 可看到未提交的修改 |
| SERIALIZABLE | 不使用 MVCC，加锁 | 完全串行化 |

---

## WAL（Write-Ahead Logging）

### WAL 的原理

WAL 的核心思想：在修改数据页之前，先将修改记录写入日志。保证即使系统崩溃，也可以通过日志恢复数据。

```

事务操作 --> 写入 Redo Log Buffer --> 刷入 Redo Log File --> 修改内存数据页 --> 刷入磁盘数据文件

```

### Redo Log

Redo Log 记录的是物理修改（"在某个页的某个偏移量写入了什么值"），用于崩溃恢复。

Redo Log 的写入流程：

1. 事务修改数据时，先写入 Redo Log Buffer（内存）
2. 根据刷盘策略，将 Redo Log Buffer 刷入 Redo Log File
3. 事务提交时，必须将 Redo Log 刷盘（保证持久性）

刷盘策略由 `innodb_flush_log_at_trx_commit` 控制：

| 值 | 行为 | 安全性 | 性能 |
|----|------|--------|------|
| 0 | 每秒刷盘 | 可能丢失 1 秒数据 | 最高 |
| 1 | 每次提交刷盘 | 不丢数据 | 最低 |
| 2 | 每次提交写入 OS 缓存，每秒 fsync | OS 崩溃可能丢数据 | 中等 |

### Undo Log

Undo Log 记录的是逻辑修改的反向操作（"插入的行需要删除，更新的行需要恢复旧值"），用于：
- 事务回滚
- MVCC 版本链

### Binlog vs Redo Log

| 特性 | Redo Log | Binlog |
|------|----------|--------|
| 存储引擎 | InnoDB 特有 | MySQL Server 层 |
| 内容 | 物理日志（页修改） | 逻辑日志（SQL/行变更） |
| 写入方式 | 循环写，空间固定 | 追加写，文件递增 |
| 用途 | 崩溃恢复 | 主从复制、数据恢复 |
| 事务性 | 事务中持续写入 | 事务提交时一次写入 |

### 两阶段提交

为保证 Redo Log 和 Binlog 的一致性，InnoDB 采用两阶段提交：

1. **Prepare 阶段** -- 写入 Redo Log，标记为 prepare 状态
2. **Commit 阶段** -- 写入 Binlog，将 Redo Log 标记为 commit 状态

如果崩溃发生在 Prepare 后、Commit 前，恢复时检查 Binlog 中是否有对应事务：
- 有：提交事务
- 无：回滚事务

---

## 查询优化器

### 优化器的工作流程

```

SQL 文本 --> 解析器 --> AST --> 预处理器 --> 逻辑查询计划 --> 优化器 --> 物理查询计划 --> 执行器

```

优化器分为逻辑优化和物理优化：

1. **逻辑优化** -- 基于规则的优化（RBO）
   - 条件下推（Predicate Pushdown）
   - 列裁剪（Column Pruning）
   - 子查询展开
   - 外连接消除
   - 视图合并

2. **物理优化** -- 基于代价的优化（CBO）
   - 选择访问路径（全表扫描 vs 索引扫描）
   - 选择连接算法（Nested Loop、Hash Join、Merge Join）
   - 选择连接顺序
   - 估算代价选择最优计划

### 代价模型

优化器使用代价模型估算不同执行计划的代价：

```

Total Cost = IO Cost + CPU Cost

IO Cost = 页面读取次数 _ 页面读取代价
CPU Cost = 评估条件次数 _ 条件评估代价 + 排序记录数 \* 排序代价

````

### 索引选择的因素

1. **索引选择性** -- `COUNT(DISTINCT col) / COUNT(*)`，选择性越高越好
2. **索引基数（Cardinality）** -- 索引中不同值的数量
3. **回表代价** -- 二级索引需要回表查询聚簇索引
4. **覆盖索引** -- 查询列都在索引中，无需回表
5. **索引排序** -- 索引本身有序，可避免 filesort
6. **范围条件** -- 范围条件后的索引列无法使用

### 优化器追踪

```sql
SET optimizer_trace = 'enabled=on';
SELECT * FROM orders WHERE user_id = 1001;
SELECT * FROM information_schema.OPTIMIZER_TRACE;
SET optimizer_trace = 'enabled=off';
````

---

## 索引选择

### 索引失效的常见场景

1. **对索引列使用函数**

   ```sql
   SELECT * FROM users WHERE YEAR(created_at) = 2024;  -- 索引失效
   SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';  -- 索引有效
   ```

2. **隐式类型转换**

   ```sql
   SELECT * FROM users WHERE phone = 13800138000;  -- phone 是 VARCHAR，索引失效
   SELECT * FROM users WHERE phone = '13800138000';  -- 索引有效
   ```

3. **LIKE 以通配符开头**

   ```sql
   SELECT * FROM products WHERE name LIKE '%phone';  -- 索引失效
   SELECT * FROM products WHERE name LIKE 'phone%';  -- 索引有效
   ```

4. **OR 条件包含非索引列**

   ```sql
   SELECT * FROM users WHERE email = 'a@b.com' OR nickname = 'test';  -- nickname 无索引，整体失效
   ```

5. **不满足最左前缀**

   ```sql
   INDEX (a, b, c)
   WHERE b = 1 AND c = 2  -- 无法使用索引
   WHERE a = 1 AND c = 2  -- 只能使用 a 列
   WHERE a = 1 AND b = 1  -- 可使用 a, b 两列
   ```

6. **使用 NOT IN、NOT EXISTS、!=**
   ```sql
   SELECT * FROM users WHERE status != 0;  -- 优化器可能选择全表扫描
   ```

### 索引优化策略

1. **联合索引顺序** -- 将选择性高的列放在前面，将范围查询列放在最后
2. **覆盖索引** -- 将查询需要的列包含在索引中，避免回表
3. **索引下推（ICP）** -- MySQL 5.6+ 在存储引擎层过滤索引条件，减少回表次数
4. **MRR（Multi-Range Read）** -- 将随机 I/O 转换为顺序 I/O
5. **索引合并** -- 多个索引合并使用（通常不如联合索引高效）

---

## 理论速查表

| 概念       | 核心要点                         | 关键细节                                |
| ---------- | -------------------------------- | --------------------------------------- |
| B+ 树      | 非叶子节点仅存键值，叶子节点链表 | 3 层约 2000 万行，范围查询高效          |
| MVCC       | 多版本并发控制，读不阻塞写       | 隐藏列 + Undo Log + Read View           |
| WAL        | 先写日志再写数据                 | Redo Log 保证持久性                     |
| Redo Log   | 物理日志，循环写                 | innodb_flush_log_at_trx_commit 控制刷盘 |
| Undo Log   | 逻辑日志，版本链                 | 用于回滚和 MVCC                         |
| Binlog     | 逻辑日志，追加写                 | 用于主从复制                            |
| 两阶段提交 | 保证 Redo Log 和 Binlog 一致     | Prepare -> Binlog -> Commit             |
| 查询优化器 | RBO + CBO                        | 代价模型选择最优执行计划                |
| 索引选择   | 选择性、回表代价、覆盖索引       | 避免索引失效场景                        |
