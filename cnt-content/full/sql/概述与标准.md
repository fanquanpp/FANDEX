---
order: 1
title: 概述与标准
module: sql
category: SQL
difficulty: beginner
description: 'SQL 概述、标准演进、方言差异与数据库选型'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/数据查询基础
  - sql/多表查询
prerequisites: []
---

# SQL 概述与标准

## 什么是 SQL

SQL（Structured Query Language，结构化查询语言）是用于管理关系型数据库管理系统（RDBMS）的标准化语言。它由 IBM 的 Donald D. Chamberlin 和 Raymond F. Boyce 于 1974 年首次提出，最初被称为 SEQUEL（Structured English Query Language），后因商标问题改名为 SQL。

SQL 并非一般的编程语言，而是一种**声明式**语言——你只需描述"要什么"，而不必告诉数据库"怎么做"。数据库的查询优化器会自动决定最优的执行路径。

### SQL 的核心子语言

| 子语言 | 全称                         | 用途     | 关键字示例              |
| ------ | ---------------------------- | -------- | ----------------------- |
| DQL    | Data Query Language          | 数据查询 | SELECT                  |
| DML    | Data Manipulation Language   | 数据操作 | INSERT, UPDATE, DELETE  |
| DDL    | Data Definition Language     | 数据定义 | CREATE, ALTER, DROP     |
| DCL    | Data Control Language        | 数据控制 | GRANT, REVOKE           |
| TCL    | Transaction Control Language | 事务控制 | BEGIN, COMMIT, ROLLBACK |

## SQL 标准演进

SQL 是 ANSI/ISO 的国际标准。从 1986 年第一个标准发布至今，SQL 标准经历了多次重大修订：

### 标准版本时间线

```
SQL-86 ──→ SQL-89 ──→ SQL-92 ──→ SQL:1999 ──→ SQL:2003 ──→ SQL:2006 ──→ SQL:2008 ──→ SQL:2011 ──→ SQL:2016 ──→ SQL:2023
  (1.0)     (1.1)     (2.0)     (3.0)        (3.1)       (3.2)       (3.3)       (3.4)       (3.5)       (4.0)
```

### 各版本核心特性

#### SQL-92（SQL2）—— 奠基之作

SQL-92 是最广泛实现的标准，几乎所有数据库都声称兼容此标准：

- 完善了 `JOIN` 语法（`INNER JOIN`、`LEFT OUTER JOIN` 等）
- 引入 `CAST` 函数进行类型转换
- 标准化 `CASE` 表达式
- 支持 `INTERSECT` 和 `EXCEPT` 集合运算
- 定义了 `SCHEMA`、`CATALOG` 等层级概念

#### SQL:1999（SQL3）—— 面向对象扩展

- **递归查询**：引入 `WITH RECURSIVE` 通用表表达式（CTE）
- **窗口函数**：`OVER()`、`RANK()`、`ROW_NUMBER()` 等
- **用户自定义类型**（UDT）
- **OLAP 功能**：`ROLLUP`、`CUBE`、`GROUPING SETS`
- **SQL/PSM**：持久存储模块（存储过程标准）

#### SQL:2003 —— 分析能力增强

- **窗口函数增强**：正式标准化窗口函数规范
- **MERGE 语句**：合并插入与更新操作
- **XML 支持**：SQL/XML 标准
- **序列对象**：`CREATE SEQUENCE`
- **自动生成列**：`GENERATED ALWAYS AS`

#### SQL:2008 / SQL:2011

- **TRUNCATE TABLE** 标准化
- **INSTEAD OF 触发器**
- **时态表**（Temporal Tables）：系统版本化表，自动追踪数据历史
- **增强的窗口函数**：`NTH_VALUE`、帧定义改进

#### SQL:2016 —— JSON 与多模型

- **SQL/JSON**：标准化 JSON 处理函数（`JSON_OBJECT`、`JSON_ARRAY`、`JSON_TABLE`）
- **多态表函数**（PTF）
- **行模式识别**（`MATCH_RECOGNIZE`）—— 用于时序数据分析

#### SQL:2023 —— 最新标准

- **属性图查询**（SQL/PGQ）：图查询语言集成到 SQL
- **JSON 增强**：更多 JSON 构造与查询函数
- **增强的窗口函数**：更多帧选项
- **IF NOT EXISTS / OR REPLACE** 语法标准化

### 标准兼容性现实

```sql
-- SQL 标准定义的语法（并非所有数据库都支持）
SELECT * FROM t1
UNION ALL CORRESPONDING BY (id, name)
SELECT * FROM t2;

-- 实际开发中，更常见的写法
SELECT id, name FROM t1
UNION ALL
SELECT id, name FROM t2;
```

> **注意**：SQL 标准是"建议"而非"强制"。各数据库厂商通常只实现标准的子集，并添加自己的扩展。因此，写可移植的 SQL 比写可移植的代码更困难。

## SQL 方言差异

主流关系型数据库在语法和功能上存在显著差异。以下是关键差异对照：

### 数据类型差异

| 概念     | MySQL                    | PostgreSQL             | SQL Server             | Oracle                                |
| -------- | ------------------------ | ---------------------- | ---------------------- | ------------------------------------- |
| 自增整数 | `INT AUTO_INCREMENT`     | `SERIAL` / `BIGSERIAL` | `INT IDENTITY(1,1)`    | `NUMBER GENERATED ALWAYS AS IDENTITY` |
| 布尔类型 | `TINYINT(1)` / `BOOLEAN` | `BOOLEAN`              | `BIT`                  | 无原生（用 `NUMBER(1)`）              |
| 字符串   | `VARCHAR(n)`             | `VARCHAR(n)` / `TEXT`  | `NVARCHAR(n)`          | `VARCHAR2(n)`                         |
| 二进制   | `BLOB`                   | `BYTEA`                | `VARBINARY(n)`         | `BLOB` / `RAW(n)`                     |
| JSON     | `JSON` (5.7+)            | `JSON` / `JSONB`       | `NVARCHAR(MAX)` + 函数 | 无原生（21c+ 支持）                   |
| 数组     | 无原生                   | `ANY[]`                | 无原生                 | 无原生                                |

### 分页查询差异

```sql
-- MySQL / PostgreSQL / SQLite
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20;

-- SQL Server (2012+)
SELECT * FROM users ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- Oracle (12c+)
SELECT * FROM users ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- Oracle (传统方式)
SELECT * FROM (
  SELECT a.*, ROWNUM rn FROM (
    SELECT * FROM users ORDER BY id
  ) a WHERE ROWNUM <= 30
) WHERE rn > 20;
```

### 字符串拼接差异

```sql
-- SQL 标准 / PostgreSQL / SQLite / Oracle
SELECT first_name || ' ' || last_name AS full_name FROM users;

-- MySQL
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users;

-- SQL Server（两种都支持）
SELECT first_name + ' ' + last_name AS full_name FROM users;
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users;
```

### 日期函数差异

```sql
-- 获取当前日期时间
-- MySQL
SELECT NOW();

-- PostgreSQL
SELECT NOW();          -- timestamp with time zone
SELECT CURRENT_TIMESTAMP;

-- SQL Server
SELECT GETDATE();

-- Oracle
SELECT SYSDATE FROM DUAL;
```

### 条件表达式差异

```sql
-- CASE WHEN（所有数据库通用）
SELECT
  CASE
    WHEN score >= 90 THEN 'A'
    WHEN score >= 80 THEN 'B'
    ELSE 'C'
  END AS grade
FROM students;

-- MySQL 特有的 IF 函数
SELECT IF(score >= 60, 'Pass', 'Fail') AS result FROM students;

-- SQL Server 特有的 IIF 函数
SELECT IIF(score >= 60, 'Pass', 'Fail') AS result FROM students;

-- Oracle 的 DECODE 函数
SELECT DECODE(sign(score - 60), 1, 'Pass', 0, 'Pass', -1, 'Fail') AS result FROM students;
```

### UPSERT 差异

```sql
-- MySQL: ON DUPLICATE KEY UPDATE
INSERT INTO users (id, name, email)
VALUES (1, 'Alice', 'alice@example.com')
ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email);

-- PostgreSQL: ON CONFLICT
INSERT INTO users (id, name, email)
VALUES (1, 'Alice', 'alice@example.com')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

-- SQL Server: MERGE
MERGE INTO users AS target
USING (VALUES (1, 'Alice', 'alice@example.com')) AS source (id, name, email)
ON target.id = source.id
WHEN MATCHED THEN UPDATE SET name = source.name, email = source.email
WHEN NOT MATCHED THEN INSERT (id, name, email) VALUES (source.id, source.name, source.email);

-- Oracle: MERGE
MERGE INTO users target
USING (SELECT 1 AS id, 'Alice' AS name, 'alice@example.com' AS email FROM DUAL) source
ON (target.id = source.id)
WHEN MATCHED THEN UPDATE SET name = source.name, email = source.email
WHEN NOT MATCHED THEN INSERT (id, name, email) VALUES (source.id, source.name, source.email);
```

## 数据库系统选型

选型时需要综合考虑多个维度，没有"最好"的数据库，只有"最适合"的。

### 主流数据库对比

| 维度             | MySQL      | PostgreSQL          | SQL Server | Oracle |
| ---------------- | ---------- | ------------------- | ---------- | ------ |
| **许可**         | GPL / 商业 | PostgreSQL（类BSD） | 商业       | 商业   |
| **易用性**       |            |                     |            |        |
| **扩展性**       |            |                     |            |        |
| **性能（OLTP）** |            |                     |            |        |
| **分析能力**     |            |                     |            |        |
| **JSON 支持**    |            |                     |            |        |
| **全文搜索**     |            |                     |            |        |
| **社区生态**     |            |                     |            |        |
| **运维成本**     | 低         | 低                  | 中         | 高     |

### 选型决策树

```
项目需要数据库
│
├─ 预算有限 / 开源优先？
│   ├─ 是
│   │   ├─ 需要复杂查询 / 分析 / JSON / GIS？
│   │   │   └─  PostgreSQL
│   │   └─ 简单 Web 应用 / 高并发读？
│   │       └─  MySQL
│   └─ 否
│       ├─ 微软技术栈 / 企业级 Windows 环境？
│       │   └─  SQL Server
│       └─ 大型企业 / 关键业务 / 需要极致可靠性？
│           └─  Oracle
│
├─ 需要嵌入式数据库？
│   └─  SQLite
│
└─ 需要云原生 / Serverless？
    ├─  Amazon Aurora
    ├─  Google Cloud Spanner
    └─  CockroachDB
```

### 典型场景推荐

#### Web 应用 / 中小型项目

**推荐：MySQL 或 PostgreSQL**

```yaml
MySQL:
  适合: 内容管理、电商、博客、论坛
  优势: 部署简单、社区资源丰富、读写性能优秀
  典型用户: WordPress、Facebook、淘宝(早期)

PostgreSQL:
  适合: SaaS 平台、金融科技、地理信息系统
  优势: 数据类型丰富、扩展性强、SQL 标准兼容性好
  典型用户: Instagram、Spotify、Apple
```

#### 数据仓库 / OLAP

**推荐：PostgreSQL + 扩展 或 专用分析引擎**

```yaml
PostgreSQL + Citus:
  适合: 中等规模分析
  优势: 分布式扩展、保持 PostgreSQL 生态

ClickHouse:
  适合: 海量日志分析、实时 BI
  优势: 列式存储、极致查询性能

DuckDB:
  适合: 本地分析、嵌入式 OLAP
  优势: 零配置、兼容 PostgreSQL 语法
```

#### 企业级关键业务

**推荐：Oracle 或 SQL Server**

```yaml
Oracle:
  适合: 银行、电信、大型 ERP
  优势: 成熟的高可用方案、RAC 集群、丰富运维工具

SQL Server:
  适合: .NET 生态企业、中型企业 ERP
  优势: 与 Azure 深度集成、SSRS/SSIS/SSAS 全套 BI 工具
```

## SQL 学习路线

```
入门阶段                    进阶阶段                     高级阶段
─────────────────────────────────────────────────────────────────
SELECT / WHERE       →     JOIN / 子查询          →    窗口函数
INSERT / UPDATE      →     聚合与分组             →    递归 CTE
CREATE TABLE         →     索引基础               →    执行计划分析
基本数据类型          →     事务与锁               →    查询优化
简单过滤与排序        →     CTE / 视图             →    物化视图 / 分区
                      →     存储过程               →    性能调优
```

## 小结

- SQL 是关系型数据库的统一查询语言，采用声明式范式
- SQL 标准从 SQL-86 演进到 SQL:2023，每个版本都引入了重要特性
- 各数据库方言在数据类型、函数、语法上存在显著差异
- 选型应基于业务需求、团队技能、预算和生态综合考虑
- PostgreSQL 在功能丰富度和标准兼容性上表现最优，MySQL 在简单场景下更易上手
