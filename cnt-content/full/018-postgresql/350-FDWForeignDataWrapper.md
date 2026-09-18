---
order: 350
title: FDW 外部数据包装器：在 SQL 里查一切
module: 'postgresql'
category: 数据库
difficulty: advanced
description: FDW 体系与 postgres_fdw 实战：外部服务器、用户映射、外部表三层结构、条件下推与 fetch_size 调优、file_fdw 读文件、典型场景与性能边界。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'postgresql/330-ExtensionModule'
  - 'postgresql/340-ExtensionModuleDetailed'
  - 'postgresql/390-StreamingReplication'
  - 'postgresql/430-SubscribePublish'
prerequisites:
  - 'postgresql/330-ExtensionModule'
---

## 前置知识

- PostgreSQL 扩展机制（[扩展模块](/postgresql/330-ExtensionModule)）——FDW 是"协议级"扩展的统称；
- 知道远程库的连接信息怎么拿到即可，本篇不要求任何外部环境准备。

## 问题引入：数据在别处，SQL 只会查本地

典型困境：订单库在 A 实例，用户库在 B 实例，老板要一张"订单量按用户城市分布"的报表。传统做法是应用层拉两份数据到内存里手工拼接——写了三层循环、丢了索引、耗尽了体面。

**FDW（Foreign Data Wrapper）**给出的答案：把外部数据源**映射成本地表**，之后 JOIN、WHERE、聚合照常写，PostgreSQL 替你负责"去远处取数"。FDW 是一个协议标准：每种数据源一个实现——`postgres_fdw`（连别的 PostgreSQL）、`file_fdw`（读本地文件）、MySQL/Oracle/ClickHouse/ES 都有社区实现，甚至有连 Twitter API 的。本篇以最常用的 postgres_fdw 为主线。

## 三层结构：服务器、用户映射、外部表

```mermaid
flowchart LR
    A[CREATE SERVER<br/>远程在哪] --> B[CREATE USER MAPPING<br/>用谁的身份连]
    B --> C[CREATE FOREIGN TABLE<br/>远端的表长什么样]
    C --> D[像本地表一样 SELECT/JOIN]
```

完整搭一遍（把远程库的 employees 表映射进来）：

```sql
-- 0. 启用扩展
CREATE EXTENSION postgres_fdw;

-- 1. 声明远程服务器（连接信息）
CREATE SERVER remote_hr
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host '10.0.0.8', dbname 'hrdb', port '5432');

-- 2. 用户映射：本地以什么身份连远程（密码存这里，注意权限保护）
CREATE USER MAPPING FOR current_user
SERVER remote_hr
OPTIONS (user 'hr_reader', password '***');

-- 3a. 批量导入远程 schema 的表定义（推荐，自动生成外部表）
IMPORT FOREIGN SCHEMA public
LIMIT TO (employees, departments)
FROM SERVER remote_hr INTO local_hr_schema;

-- 3b. 或手工定义外部表（列必须与远程实际结构一致）
CREATE FOREIGN TABLE remote_employees (
  id INTEGER,
  name VARCHAR(100),
  salary NUMERIC
) SERVER remote_hr
OPTIONS (schema_name 'public', table_name 'employees');

-- 4. 用起来与本地表无差别
SELECT d.dept_name, count(*), avg(e.salary)
FROM remote_employees e
JOIN departments d ON e.dept_id = d.id
GROUP BY d.dept_name;
```

权限语义要理清：**本地对外部表的 SELECT 权限**与**远程账号的真实权限**是两道独立的门——本地 GRANT 了远程没有的数据照样取不到；反过来远程账号权限过大则是安全隐患（用户映射表里的密码用 `CREATE USER MAPPING ... WITHOUT PASSWORD` 配合 `password_file` 或 `.pgpass` 管理更规范）。

## 性能关键：条件下推

FDW 的性能生死线是"过滤发生在哪边"。聪明的实现会把 WHERE 条件**推到远程执行**，只传回结果集：

```sql
EXPLAIN VERBOSE
SELECT * FROM remote_employees WHERE salary > 50000;
-- Remote SQL: SELECT id, name, salary FROM public.employees
--             WHERE ((salary > 50000))
-- "Remote SQL" 里带着 WHERE = 条件已下推，传输量被远程过滤削减
```

影响下推与传输效率的旋钮：

```sql
-- fetch_size：每次网络往返取多少行（默认 100，偏小）
ALTER SERVER remote_hr OPTIONS (ADD fetch_size '5000');

-- 远程聚合下推：GROUP BY/聚合函数尽量让远程做
--（postgres_fdw 支持把整个聚合下推，前提是远程版本够新、表达式可识别）
EXPLAIN VERBOSE
SELECT dept_id, count(*) FROM remote_employees GROUP BY dept_id;
-- 若 Remote SQL 里看到整个 GROUP BY，说明远程聚合生效
```

判读口诀：**Remote SQL 里出现你的 WHERE/聚合 = 好；本地节点出现 Foreign Scan 后再接 Filter/Sort = 数据全量拉过来了，要警惕**。跨网络大表 JOIN 是 FDW 最痛的场景——两张远程大表 JOIN 会触发大量往返，解法是把 JOIN 条件也下推（postgres_fdw 对同服务器上的外部表 JOIN 支持远程执行），或改用物化/复制方案（见下）。

## file_fdw：把 CSV 当表查

轻量但常用的姊妹实现——直接查询服务器上的文件（如应用日志、上游导出的 CSV）：

```sql
CREATE EXTENSION file_fdw;
CREATE SERVER local_files FOREIGN DATA WRAPPER file_fdw;

CREATE FOREIGN TABLE sales_csv (
  id INTEGER,
  product TEXT,
  amount NUMERIC
) SERVER local_files
OPTIONS (filename '/data/export.csv', format 'csv', header 'true');

SELECT product, sum(amount) FROM sales_csv GROUP BY product;
```

注意 file_fdw 只读且**无谓词下推**（文件就在本地，每次全文件扫描）——一次性导入分析够用，频繁访问应改用 `COPY` 落地成真表。

## 适用边界：什么时候用 FDW，什么时候不用

| 场景 | 用 FDW | 换方案 |
| --- | --- | --- |
| 偶发的跨库报表、数据抽查 | 合适（零 ETL 成本） | |
| 跨库 JOIN 的低频管理查询 | 合适 | |
| 高频线上服务的跨库访问 | 不行——每次查询都是网络往返+远程负载 | [逻辑复制同步](/postgresql/430-SubscribePublish) 到本地再查 |
| 大表批量迁移 | 勉强 | pg_dump/COPY 或专门的迁移工具 |
| 异构库（MySQL/ES/CH）联合查询 | 有对应 FDW，小数据量可试 | 生产级走 ETL/数仓 |

一句话：**FDW 是"联邦查询"的胶水，不是"数据集成"的架构**。它最闪光的时刻是让 ad-hoc 查询省掉一整条 ETL 流水线；被误用在核心链路上时，远程库抖动会直接传导成本地查询的超时。

## 动手环节：自己连自己

没有第二台数据库也能完整实验——让本机实例 FDW 连自己（两个 database 即可）：

```bash
# 1. 创建第二个数据库当"远程"
createdb remote_db
psql -d remote_db -c "
  CREATE TABLE employees (id int, name text, salary numeric);
  INSERT INTO employees SELECT n, 'emp'||n, 5000 + n % 9000
  FROM generate_series(1, 100000) n;"
```

```sql
-- 2. 回到主库，建立三层映射
CREATE EXTENSION postgres_fdw;
CREATE SERVER self_ref FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'localhost', dbname 'remote_db', port '5432');
CREATE USER MAPPING FOR current_user SERVER self_ref
  OPTIONS (user 'postgres');
IMPORT FOREIGN SCHEMA public FROM SERVER self_ref INTO public;

-- 3. 亲眼看条件下推
EXPLAIN VERBOSE SELECT * FROM employees WHERE salary > 13000;
-- Remote SQL 带 WHERE —— 过滤发生在 remote_db，只传回约 30% 的行

-- 4. 对比 fetch_size 的影响
ALTER SERVER self_ref OPTIONS (ADD fetch_size '100');
EXPLAIN ANALYZE SELECT count(*) FROM employees;
ALTER SERVER self_ref OPTIONS (SET fetch_size '10000');
EXPLAIN ANALYZE SELECT count(*) FROM employees;
-- 观察网络往返次数与总耗时的差异
```

## 常见困惑

**"外部表能写吗（INSERT/UPDATE）？"**——postgres_fdw 支持写（写操作同样下发远程执行），但事务语义是"本地提交时远程提交"的两阶段行为，失败重试语义不如本地表可靠。FDW 优先当只读联邦层用，写路径走应用层。

**"密码明文存在 USER MAPPING 里安全吗？"**——`information_schema.user_mappings` 只对超级管理员可见，但磁盘上仍在系统目录里。生产规范：最小权限的专用远程账号 + 定期轮换，或改用 `.pgpass`/证书认证。

**"和 dblink 什么关系？"**——dblink 是更古老的函数式方案（`dblink('conn', 'SELECT ...')` 返回结果集），SQL 不可组合、无计划优化。FDW 是它的全面替代品，新项目一律 FDW。

## 检验清单

- 能画出 SERVER / USER MAPPING / FOREIGN TABLE 三层结构并说出各自职责；
- 会用 EXPLAIN VERBOSE 判断条件下推是否生效，知道 fetch_size 的调节作用；
- 能复述"FDW 适合偶发联邦查询、不适合核心链路"的边界与替代方案（逻辑复制）；
- 完成自连实验：建表、下推验证、fetch_size 前后对比。

## 下一步

数据能"连进来"之后，下一个问题是"如何持续同步进来"：[流复制](/postgresql/390-StreamingReplication) 与 [订阅发布](/postgresql/430-SubscribePublish) 是两个层级的答案。
