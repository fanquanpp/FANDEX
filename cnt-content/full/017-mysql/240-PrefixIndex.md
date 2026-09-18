---
order: 240
title: 前缀索引：长字符串列的空间优化术
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 理解前缀索引为什么能省空间、如何用选择性科学地挑选前缀长度、它牺牲了什么能力，以及在邮箱与 URL 列上的完整实战。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
  - 'mysql/250-IndexConditionPushdown'
  - 'mysql/280-InvisibleIndex'
prerequisites:
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
---

## 前置知识

本篇假设你已经理解：

- 二级索引的叶子节点存的是"索引列值 + 主键"，查询其他列要**回表**（见[聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)）；
- 联合索引的最左前缀原则（见[联合索引与最左前缀](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)）。

## 问题引入：邮箱列的索引有多大

假设有一张千万行的用户表，`email` 列平均 30 个字符。给它建普通索引，InnoDB 会把**完整的 30 个字符**连同主键存进每一棵索引 B+ 树：

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL,
  nickname VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE INDEX idx_email ON users(email);
```

问题来了：`email` 大部分辨识度集中在前 15 个字符以内（`zhangsan1990@g` 已经几乎唯一），后 15 个字符（`mail.com` 之类的尾巴）只是白白占据索引空间、拖慢比较速度。**能不能只索引前一段？**这就是前缀索引。

## 语法与行为

只对字符串列的**前 N 个字符**建索引：

```sql
-- 只索引 email 的前 15 个字符
CREATE INDEX idx_email_prefix ON users(email(15));

-- URL 列更长，取前 50
CREATE INDEX idx_url_prefix ON web_pages(url(50));
```

三条关键行为规则：

1. **只对字符串类型有效**（CHAR/VARCHAR/TEXT/BLOB），数字列没有前缀索引的需求；
2. **索引里只有前缀，没有完整值**。查询 `WHERE email = 'x@y.com'` 时，引擎先用前缀缩小范围，**找到候选行后必须回表**取出完整 email 再精确比对——所以前缀索引**永远无法成为覆盖索引**；
3. **ORDER BY / GROUP BY 用不上它**：排序需要完整值的前后关系，前缀可能相同而完整值不同，引擎不会冒险使用。

## 核心：用"选择性"挑出最划算的前缀长度

前缀太短，大量行共享同一个前缀，索引退化成"先捞一大把再逐行过滤"；前缀太长，省空间的优势消失。**选择性的定义是"不重复值个数 / 总行数"**，越接近 1 越好。方法是：完整列的选择性作为天花板，逐长度逼近它。

```sql
-- 第一步：完整列的选择性（天花板）
SELECT COUNT(DISTINCT email) / COUNT(*) AS full_selectivity FROM users;
-- 假设输出 0.9876

-- 第二步：各前缀长度的选择性
SELECT
  COUNT(DISTINCT LEFT(email, 5))  / COUNT(*) AS s5,
  COUNT(DISTINCT LEFT(email, 10)) / COUNT(*) AS s10,
  COUNT(DISTINCT LEFT(email, 15)) / COUNT(*) AS s15,
  COUNT(DISTINCT LEFT(email, 20)) / COUNT(*) AS s20
FROM users;
-- 假设输出：s5=0.5123  s10=0.9514  s15=0.9870  s20=0.9876
```

解读：`s15 = 0.9870` 已经达到天花板的 99.9%，`s20` 与天花板几乎持平却要多存 5 个字符。**选 15**——这是"接近天花板的最短前缀"。

工程实践建议：把这条查询写成例行脚本，在建索引前先跑一遍。与"拍脑袋取 10"相比，两分钟的测量经常能省下几十 GB 的索引空间或十倍的过滤成本。

## 动手环节：完整走一遍

```sql
-- 1. 造一批可复现的测试数据
CREATE TABLE demo_email (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL
);
INSERT INTO demo_email (email)
SELECT CONCAT('user', n, '@example.com')
FROM (
  SELECT (a.N + b.N * 10 + c.N * 100 + d.N * 1000) AS n
  FROM (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
        UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
       (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
        UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
       (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
        UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c,
       (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
        UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d
) t;

-- 2. 测量选择性（本例 user 前缀相同，s 数字会直观展示前缀过短的灾难）
SELECT
  COUNT(DISTINCT LEFT(email, 4))  / COUNT(*) AS s4,
  COUNT(DISTINCT LEFT(email, 8))  / COUNT(*) AS s8,
  COUNT(DISTINCT LEFT(email, 9))  / COUNT(*) AS s9,
  COUNT(DISTINCT email)           / COUNT(*) AS full_s
FROM demo_email;
-- 观察：前 4 位都是 "user"，s4 必然为极小值；从第 9 位开始唯一

-- 3. 建前缀索引并验证计划
CREATE INDEX idx_demo_prefix ON demo_email(email(9));
EXPLAIN SELECT * FROM demo_email WHERE email = 'user1234@example.com';
-- type=ref，key=idx_demo_prefix

-- 4. 验证"无法覆盖索引"
EXPLAIN SELECT email FROM demo_email WHERE email LIKE 'user1%';
-- Extra 会出现 Using index condition / Using where，而非 Using index
```

第 2 步的结果值得咀嚼：**选择性完全取决于数据分布**。同样是 4 个字符，在随机用户名上可能足够，在 `user` 这种统一前缀上就是灾难——所以永远测量，不要猜。

## 适用与不适用清单

适合前缀索引：

- 长字符串列的**等值/前缀匹配**查询（URL、邮箱、订单号、设备号）；
- 索引空间敏感的大表；
- TEXT 类超长列（整列索引本就受限，前缀几乎是唯一选择）。

不适合：

- 需要**覆盖索引**的查询（前缀索引天然做不到）；
- 依赖 **ORDER BY / GROUP BY** 走索引避免排序的查询；
- 前缀区分度天然差的列（如都是同一国家码的手机号，应去掉公共前缀或换列）。

## 常见困惑

**"前缀索引和 LIKE 'xxx%' 是一回事吗？"**——不是一回事但互相配合。前缀索引是**存储结构**（索引里只存前 N 字符），`LIKE 'abc%'` 是**访问模式**。前者索引后，后者能用上索引定位；但 `LIKE '%abc'`（前置通配符）无论如何都用不上 B+ 树的有序性。

**"和哈希索引比呢？"**——哈希索引（如 CRC32 散列列 + 常规索引）等值查询更快且空间更小，但不支持范围与前缀匹配。等值为主的超长列可以考虑"冗余一个哈希列"方案，前缀索引则是更通用的默认选择。

**"改了前缀长度要重建索引吗？"**——是。前缀长度是索引定义的一部分，修改等于删掉重建，大表请在低峰期用在线 DDL（`ALGORITHM=INPLACE, LOCK=NONE`）执行。

## 检验清单

- 能说清前缀索引"索引里存什么、不存什么"；
- 会用两条 SELECT 测量并选出前缀长度，且能解释为什么选它；
- 能举出两个"不该用前缀索引"的查询场景并说明原因；
- 在测试表上完整跑通过本篇动手环节。

## 下一步

前缀索引解决"存得多"，[索引条件下推 ICP](/mysql/250-IndexConditionPushdown) 解决"回表回得冤"——两者常常在同一条慢查询的优化方案里联手出现。
