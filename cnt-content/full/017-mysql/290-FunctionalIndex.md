---
order: 290
title: 函数索引：给表达式建索引
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL 8.0.13 函数索引：为什么对列套函数会废掉索引、函数索引如何救、隐藏列原理、与虚拟生成列方案的对比与选型。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/240-PrefixIndex'
  - 'mysql/280-InvisibleIndex'
  - 'mysql/310-IndexFailureScene'
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
prerequisites:
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/310-IndexFailureScene'
---

## 前置知识

- 二级索引的有序性来源（[聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)）；
- 常见索引失效场景（[索引失效场景](/mysql/310-IndexFailureScene)）——本篇是其第一条的完整解法。

## 问题引入：一条被函数废掉的查询

用户表的 `phone` 列存的是各种格式的手机号（有的带 +86、有的带横线），查询前先规范化：

```sql
SELECT * FROM users WHERE LOWER(email) = 'zhangsan@example.com';
```

`email` 上明明有索引，EXPLAIN 却显示全表扫描。原因一句话讲清：**索引里存的是原始值（区分大小写的 email），而查询找的是函数处理后的值**。B+ 树的有序性建立在"原始值"上，对每行先算 `LOWER(email)` 再比较，等于放弃索引逐行计算——这就是"对索引列套函数导致失效"。

MySQL 8.0.13 之前的土办法是把表达式写进应用层或用生成列兜着。8.0.13 之后，标准答案叫**函数索引（Functional Index）**：直接给表达式建索引。

## 语法与工作原理

```sql
-- 给 LOWER(email) 建函数索引
CREATE INDEX idx_email_lower ON users ((LOWER(email)));

-- 之后这条查询就能用上索引
SELECT * FROM users WHERE LOWER(email) = 'zhangsan@example.com';
```

注意语法细节：表达式**外层必须多包一层括号**——`((LOWER(email)))` 中内层括号圈定表达式，外层括号是索引列定义的边界。

工作原理揭底：函数索引**不是什么新数据结构**，MySQL 在内部自动创建了一个**隐藏的虚拟生成列**（不占数据行空间），把表达式值存进去，再对这个隐藏列建普通索引。所以：

- 表达式的结果类型、字符集、排序规则都有明确要求（可用 `SHOW CREATE TABLE` 看到隐藏列）；
- 查询必须**写出与索引定义完全相同的表达式**才能匹配——`LOWER(email)` 建的索引救不了 `UPPER(email)` 的查询，甚至字符集或空格写法不同都匹配不上；
- 表达式需要满足确定性（同一输入永远同一输出），`NOW()`、`RAND()` 之类不行。

## 三个高频落地场景

```sql
-- 场景 1：大小写归一（上例），等值与范围都受益
CREATE INDEX idx_email_lower ON users ((LOWER(email)));

-- 场景 2：日期取整——只按天查询时间戳列
CREATE INDEX idx_created_day ON orders ((DATE(created_at)));
SELECT * FROM orders WHERE DATE(created_at) = '2026-09-01';

-- 场景 3：JSON 内部字段——配合多值或普通函数索引
CREATE INDEX idx_city ON users ((CAST(userInfo ->> '$.city' AS CHAR(20))));
SELECT * FROM users WHERE userInfo ->> '$.city' = '北京';
```

场景 2 值得展开说：`DATE(created_at)` 在 8.0.13 之前是慢查询榜的常客，传统替代方案是范围改写：

```sql
-- 老方案：把函数从列上挪到常量上（至今仍是好习惯）
SELECT * FROM orders
WHERE created_at >= '2026-09-01' AND created_at < '2026-09-02';
```

范围改写不需要函数索引、兼容一切版本、还能用上 `created_at` 的普通索引。**能改写 SQL 就改写，改写不了的（尤其表达式被 ORM 固化在代码里）才上函数索引。**这是两者的选型顺序，不是二选一。

## 函数索引 vs 手工生成列

两者本质是同一机制的手动版与自动版，取舍如下：

| | 函数索引 | 显式生成列 + 索引 |
| --- | --- | --- |
| 版本要求 | 8.0.13+ | 5.7+ |
| SQL 改造成本 | 查询写原表达式即可 | 查询要改成查生成列名 |
| 可见性 | 隐藏列，`SHOW CREATE TABLE` 才见 | 真实列，可 SELECT、可统计 |
| 类型控制 | 依赖表达式推导，偶有隐式转换坑 | 显式声明类型，完全可控 |
| 适用 | 快速救急、表达式简单 | 长期方案、需要引用该值的场景 |

经验法则：**临时优化与简单表达式用函数索引；表达式复杂（多层嵌套、带条件逻辑）或多个查询要复用这个值时，显式生成列更稳**——它把"计算"固化成 schema 的一部分，所有开发者都看得见。

## 动手环节：从失效到痊愈

```sql
-- 1. 复现失效
CREATE TABLE func_demo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL
);
INSERT INTO func_demo (email)
SELECT CONCAT('User', n, '@Example.COM')
FROM (SELECT a.N + b.N*10 + c.N*100 n
      FROM (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
            UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
           (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
            UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
           (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
            UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c) t;
CREATE INDEX idx_email_raw ON func_demo(email);

-- 2. 确认失效：函数在列上，索引作废
EXPLAIN SELECT * FROM func_demo WHERE LOWER(email) = 'user123@example.com';
-- type=ALL

-- 3. 建函数索引后痊愈
CREATE INDEX idx_email_func ON func_demo ((LOWER(email)));
EXPLAIN SELECT * FROM func_demo WHERE LOWER(email) = 'user123@example.com';
-- type=ref, key=idx_email_func

-- 4. 看穿它的本质：SHOW CREATE TABLE 里藏着隐藏列
SHOW CREATE TABLE func_demoG
-- 注意 DEFAULT 的隐藏虚拟列 `!hidden_col` 及其上的索引

-- 5. 反例：表达式写得不一样就匹配不上
EXPLAIN SELECT * FROM func_demo WHERE LOWER(TRIM(email)) = 'user123@example.com';
-- type=ALL —— 多了 TRIM，与索引定义不一致
```

第 5 步是生产事故的高发区：ORM 或重构时顺手改了表达式，索引悄悄失效、性能无声劣化。把函数索引纳入变更评审，表达式改动必须连带检查索引定义。

## 常见困惑

**"函数索引和普通索引能同时存在吗？该删谁？"**——可以并存。用[不可见索引](/mysql/280-InvisibleIndex)验证：把原始列索引隐身，观察是否仍有查询依赖它；没有依赖再删除。反向同理。

**"为什么我的函数索引建不起来？"**——高频原因三条：版本低于 8.0.13；表达式含非确定性函数；表达式结果类型是 TEXT/BLOB（需包一层 `CAST` 限定长度）。

## 检验清单

- 能解释"对列套函数为什么废索引"的有序性原理；
- 会写函数索引（含双层括号语法）并知道匹配条件是"表达式完全一致"；
- 能说出函数索引与显式生成列的选型原则；
- 完成本篇从失效到痊愈的动手实验，并亲眼见过 `SHOW CREATE TABLE` 里的隐藏列。

## 下一步

表达式救完了列上的函数，但优化器对**数据分布**的误判是另一类问题：进入[索引统计信息与直方图](/mysql/300-IndexStatsHistogram)。
