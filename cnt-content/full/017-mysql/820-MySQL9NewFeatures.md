---
order: 820
title: MySQL9 新特性与并行查询
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 'MySQL 9.x新特性：VECTOR向量类型与HeatWave边界、JSON增强、窗口函数能力边界、函数索引、innodb_parallel_read_threads适用面'
author: fanquanpp
updated: '2026-09-13'
related:
  - 'mysql/720-DataEncryption'
  - 'mysql/330-MySQLIndexExecutionPlan'
  - 'mysql/830-VectorType'
  - 'mysql/800-JSONSchemaValidationAggregate'
prerequisites:
  - 'mysql/160-View'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [视图语法速查手册](/mysql/160-View)

## 1. MySQL 9.x 概述

MySQL 9.x 是 MySQL 数据库的最新主要版本，引入了大量面向现代应用场景的特性，包括 AI 向量搜索支持、JSON 功能增强、查询优化器改进和并行查询能力提升。本章系统梳理 MySQL 9.x 的核心新特性及并行查询机制。

### 1.1 版本演进路线

| 版本        | 发布时间  | 定位与核心特性                                   |
| :---------- | :-------- | :----------------------------------------------- |
| MySQL 8.0   | 2018-04   | 窗口函数、CTE、JSON 增强、角色管理                |
| MySQL 8.4   | 2024-04   | **LTS**：移除大量废弃语法（CHANGE MASTER TO 等）  |
| MySQL 9.0   | 2024-07   | 创新版：VECTOR 类型、EXPLAIN INTO 等准备语句增强  |
| MySQL 9.1+  | 2024-10 起 | 每季度一个创新版，小步迭代                       |

> 版本策略提示：官方已宣布转向**日历版本号**（YY.M），2026-07 起为 26.7 系列，
> 下一 LTS 为 28.4（2028-04）。写作与选型时以"8.4 LTS / 9.x 创新版"为主线表述，
> 避免把 9.x 描述成"最新稳定版"——LTS 仍是 8.4。

### 1.2 MySQL 9.x 安装与版本确认

```sql
-- 查看当前版本
SELECT VERSION();

-- 查看支持的特性
SELECT * FROM performance_schema.global_variables
WHERE VARIABLE_NAME LIKE '%vector%';

-- 检查并行查询支持
SHOW VARIABLES LIKE '%parallel%';
```

## 2. VECTOR 向量类型

### 2.1 向量类型基础

MySQL 9.0 引入 `VECTOR` 数据类型，原生支持向量数据的存储与检索，为 AI/ML 应用场景（语义搜索、推荐系统、相似度匹配）提供数据库层面的支持。

```sql
-- 创建包含向量列的表
CREATE TABLE product_embeddings (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(200),
    description TEXT,
    embedding VECTOR(768)   -- 768维向量（如 BERT 模型输出）
);

-- 插入向量数据（以 JSON 数组格式传入）
INSERT INTO product_embeddings VALUES (
    1,
    '无线蓝牙耳机',
    '高品质音效，降噪功能',
    '[0.123, -0.456, 0.789, ..., 0.012]'  -- 768维向量
);

-- 查询向量数据（返回 JSON 数组格式）
SELECT product_id, product_name,
       VECTOR_TO_STRING(embedding) AS embedding_str
FROM product_embeddings;
```

### 2.2 向量函数（社区版边界）

社区版 MySQL 9.x 提供的向量函数是三类**纯转换/取维**函数：

```sql
-- 字符串 ↔ 向量 互转（二进制存储，4 字节浮点/维）
SELECT STRING_TO_VECTOR('[0.1, 0.2, 0.3]');       -- 别名 TO_VECTOR
SELECT VECTOR_TO_STRING(embedding) FROM documents LIMIT 1;
SELECT VECTOR_DIM(embedding) FROM documents LIMIT 1;  -- 返回维度
```

而**距离计算与向量索引属于 MySQL HeatWave（OCI 上的分析加速服务）**，
社区版没有 `DISTANCE()` 函数、也没有向量索引：

```sql
-- 以下仅 HeatWave 可用（社区版执行会报函数不存在）：
-- SELECT DISTANCE(embedding, query_vec, 'COSINE') FROM documents ORDER BY 1 LIMIT 10;
-- ALTER TABLE documents ADD VECTOR INDEX idx_emb (embedding);
```

社区版做相似度检索的现实做法：应用层取回向量自行计算（数据量小），
或使用 HeatWave / 外部向量数据库。向量列本身（VECTOR 类型）社区版可用，
适合"存"这一半；"搜"这一半要认清版本边界。

### 2.4 向量类型应用场景

```sql
-- 语义搜索：查找与查询文本语义相似的商品
CREATE TABLE search_cache (
    query_hash VARCHAR(64) PRIMARY KEY,
    query_text TEXT,
    query_embedding VECTOR(768),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 推荐系统：基于用户偏好向量推荐商品
CREATE TABLE user_profiles (
    user_id INT PRIMARY KEY,
    preference_vector VECTOR(256),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 相似度匹配：图像特征向量检索
CREATE TABLE image_features (
    image_id BIGINT PRIMARY KEY,
    feature_vector VECTOR(512),
    image_url VARCHAR(500)
);
```

## 3. JSON 功能增强

### 3.1 自动 JSON 模式验证

MySQL 9.0 支持为 JSON 列定义 JSON Schema，自动验证插入和更新的 JSON 数据是否符合预定义的结构。

```sql
-- 创建带 JSON Schema 验证的表
CREATE TABLE user_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    profile JSON,
    CHECK (
        JSON_SCHEMA_VALID(
            '{
                "type": "object",
                "required": ["name", "email"],
                "properties": {
                    "name": {"type": "string", "minLength": 1},
                    "email": {"type": "string", "format": "email"},
                    "age": {"type": "integer", "minimum": 0, "maximum": 150},
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                }
            }',
            profile
        )
    )
);

-- 合法数据：包含必填字段且类型正确
INSERT INTO user_profiles (profile) VALUES (
    '{"name": "张三", "email": "zhang@example.com", "age": 28, "tags": ["vip"]}'
);

-- 非法数据：缺少必填字段 → 报错
INSERT INTO user_profiles (profile) VALUES (
    '{"name": "李四"}'
);
-- ERROR: Check constraint failed

-- 非法数据：类型不匹配 → 报错
INSERT INTO user_profiles (profile) VALUES (
    '{"name": "王五", "email": "wang@example.com", "age": "not_a_number"}'
);
```

### 3.2 JSON 聚合函数

```sql
-- JSON_ARRAYAGG：将多行值聚合为 JSON 数组
SELECT department,
       JSON_ARRAYAGG(JSON_OBJECT('name', name, 'salary', salary)) AS employees
FROM employees
GROUP BY department;

-- JSON_OBJECTAGG：将键值对聚合为 JSON 对象
SELECT department,
       JSON_OBJECTAGG(name, salary) AS salary_map
FROM employees
GROUP BY department;

-- MySQL 9.x 增强的 JSON_TABLE 嵌套路径
SELECT jt.*
FROM orders,
     JSON_TABLE(
         order_items,
         '$[*]' COLUMNS(
             item_id VARCHAR(20) PATH '$.id',
             quantity INT PATH '$.qty',
             NESTED PATH '$.details[*]' COLUMNS(
                 detail_name VARCHAR(50) PATH '$.name',
                 detail_value VARCHAR(100) PATH '$.value'
             )
         )
     ) AS jt;
```

### 3.3 JSON 空间优化

```sql
-- MySQL 9.x 对 JSON 存储进行了优化
-- JSON 列的存储更紧凑，部分更新不再重写整个 JSON 文档

-- 查看表的 JSON 列信息
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE DATA_TYPE = 'json'
AND TABLE_SCHEMA = 'your_database';

-- JSON 部分更新（in-place update）
UPDATE user_profiles
SET profile = JSON_SET(profile, '$.age', 29)
WHERE id = 1;
-- 如果修改的字段大小未超出原值，可原地更新，避免重写整个 JSON
```

## 4. 窗口函数（8.0 引入，9.x 持续可用）

### 4.1 能力边界先说清

MySQL 窗口函数**不支持** `IGNORE NULLS`，也**不支持** `GROUPS` 窗口帧——
这两者官方文档明确标注"语法被解析但执行时报错"，网上教程里的示例多数跑不通：

```sql
-- 均会报错（Error 3587 / 3584），勿在 MySQL 中使用：
-- FIRST_VALUE(salary) IGNORE NULLS OVER (...)          ← 不支持 IGNORE NULLS
-- SUM(amount) OVER (ORDER BY d GROUPS BETWEEN ...)     ← 不支持 GROUPS 帧
```

需要"取组内第一个非 NULL 值"时，用子查询过滤 NULL 再开窗：

```sql
SELECT employee_id, department, salary,
       FIRST_VALUE(salary) OVER (
         PARTITION BY department ORDER BY hire_date
       ) AS first_salary
FROM employees
WHERE salary IS NOT NULL;   -- 先过滤，窗口内自然没有 NULL
```

可用的常用窗口能力：ROWS/RANGE 帧、NTILE、LAG/LEAD、聚合开窗等（8.0+）。

### 4.2 窗口函数性能优化

```sql
-- 使用窗口函数替代自连接，提升性能
-- 旧写法：自连接
SELECT e1.employee_id, e1.salary,
       (SELECT AVG(e2.salary)
        FROM employees e2
        WHERE e2.department = e1.department) AS dept_avg
FROM employees e1;

-- 新写法：窗口函数（更高效）
SELECT
    employee_id,
    department,
    salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg,
    salary - AVG(salary) OVER (PARTITION BY department) AS diff_from_avg
FROM employees;
```

## 5. CTE 与递归查询

### 5.1 通用表表达式 (CTE)

```sql
-- 非递归 CTE：简化复杂查询
WITH monthly_revenue AS (
    SELECT
        DATE_FORMAT(order_date, '%Y-%m') AS month,
        SUM(amount) AS revenue,
        COUNT(*) AS order_count
    FROM orders
    WHERE status = 'completed'
    GROUP BY month
),
monthly_avg AS (
    SELECT AVG(revenue) AS avg_revenue FROM monthly_revenue
)
SELECT
    m.month,
    m.revenue,
    m.order_count,
    a.avg_revenue,
    ROUND((m.revenue - a.avg_revenue) / a.avg_revenue * 100, 2) AS pct_diff
FROM monthly_revenue m
CROSS JOIN monthly_avg a
ORDER BY m.month;
```

### 5.2 递归 CTE

```sql
-- 组织架构层级查询
WITH RECURSIVE org_hierarchy AS (
    -- 锚点查询：顶级管理者
    SELECT
        employee_id,
        name,
        manager_id,
        1 AS level,
        CAST(name AS CHAR(500)) AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- 递归查询：逐级展开
    SELECT
        e.employee_id,
        e.name,
        e.manager_id,
        h.level + 1 AS level,
        CONCAT(h.path, ' → ', e.name) AS path
    FROM employees e
    INNER JOIN org_hierarchy h ON e.manager_id = h.employee_id
)
SELECT * FROM org_hierarchy ORDER BY level, path;

-- 物料清单 (BOM) 展开
WITH RECURSIVE bom AS (
    SELECT
        parent_part,
        child_part,
        quantity,
        1 AS level
    FROM parts_relation
    WHERE parent_part = 'PRODUCT-A'

    UNION ALL

    SELECT
        p.parent_part,
        p.child_part,
        p.quantity,
        b.level + 1
    FROM parts_relation p
    INNER JOIN bom b ON p.parent_part = b.child_part
)
SELECT
    level,
    parent_part,
    child_part,
    quantity,
    RPAD('', level * 2, '  ') || child_part AS indented_name
FROM bom
ORDER BY level, parent_part;
```

### 5.3 递归 CTE 注意事项

```sql
-- 设置递归深度限制（防止无限递归）
SET cte_max_recursion_depth = 1000;  -- 默认1000

-- 使用 LIMIT 控制递归层级
WITH RECURSIVE tree AS (
    SELECT id, parent_id, name, 1 AS lvl
    FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.parent_id, c.name, t.lvl + 1
    FROM categories c JOIN tree t ON c.parent_id = t.id
    WHERE t.lvl < 5  -- 限制最大5层
)
SELECT * FROM tree;
```

## 6. 函数索引与不可见索引

### 6.1 函数索引

MySQL 8.0+ 支持基于函数表达式的索引，解决列上函数运算导致索引失效的问题。

```sql
-- 传统方式：WHERE 条件中使用函数导致索引失效
SELECT * FROM users WHERE YEAR(created_at) = 2024;
-- 无法使用 created_at 上的索引

-- 函数索引：为函数表达式创建索引
CREATE INDEX idx_year ON users ((YEAR(created_at)));
SELECT * FROM users WHERE YEAR(created_at) = 2024;
-- 可以使用 idx_year 索引

-- 常用函数索引场景
-- 大小写不敏感查询
CREATE INDEX idx_lower_name ON users ((LOWER(name)));
SELECT * FROM users WHERE LOWER(name) = 'zhang san';

-- JSON 字段索引
CREATE INDEX idx_json_age ON user_profiles ((CAST(profile->'$.age' AS UNSIGNED)));
SELECT * FROM user_profiles WHERE CAST(profile->'$.age' AS UNSIGNED) > 25;

-- 计算列索引
CREATE INDEX idx_full_name ON employees ((CONCAT(first_name, ' ', last_name)));
SELECT * FROM employees WHERE CONCAT(first_name, ' ', last_name) = 'Zhang San';
```

### 6.2 不可见索引

不可见索引不会被优化器使用，但仍然维护更新，用于安全地测试删除索引的影响。

```sql
-- 创建不可见索引
CREATE INDEX idx_status ON orders(status) INVISIBLE;

-- 将已有索引设为不可见
ALTER TABLE orders ALTER INDEX idx_status SET INVISIBLE;

-- 恢复可见
ALTER TABLE orders ALTER INDEX idx_status SET VISIBLE;

-- 会话级别强制使用不可见索引（仅用于测试）
SET SESSION optimizer_switch = 'use_invisible_indexes=on';

-- 验证索引是否被使用
EXPLAIN SELECT * FROM orders WHERE status = 'shipped';
-- 不可见索引不会出现在执行计划中
```

## 7. 直方图统计

### 7.1 直方图基础

直方图提供列值分布的统计信息，帮助优化器在索引不可用时做出更好的执行计划选择。

```sql
-- 创建直方图
ANALYZE TABLE orders UPDATE HISTOGRAM ON status, customer_id WITH 100 BUCKETS;

-- 查看直方图信息
SELECT TABLE_NAME, COLUMN_NAME, HISTOGRAM
FROM information_schema.COLUMN_STATISTICS
WHERE TABLE_SCHEMA = 'your_database';

-- 删除直方图
ANALYZE TABLE orders DROP HISTOGRAM ON status;

-- 查看直方图详细内容
SELECT JSON_PRETTY(HISTOGRAM) AS histogram_detail
FROM information_schema.COLUMN_STATISTICS
WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'status';
```

### 7.2 直方图适用场景

```sql
-- 场景1：低基数列的选择性评估
-- status 列只有几个值，直方图帮助优化器判断过滤性
ANALYZE TABLE orders UPDATE HISTOGRAM ON status WITH 10 BUCKETS;

-- 场景2：关联查询的行数估算
-- 无索引的关联列，直方图改善估算精度
ANALYZE TABLE order_items UPDATE HISTOGRAM ON product_id WITH 256 BUCKETS;

-- 场景3：范围查询的选择性
-- 价格范围查询，直方图帮助估算匹配行数
ANALYZE TABLE products UPDATE HISTOGRAM ON price WITH 100 BUCKETS;

-- 对比执行计划
EXPLAIN FORMAT=JSON
SELECT * FROM orders WHERE status = 'shipped';
-- 查看 "filtered" 字段，直方图可改善此估算值
```

## 8. 并行查询：能力与边界

### 8.1 现状：innodb_parallel_read_threads 的真实适用面

```sql
SHOW VARIABLES LIKE 'innodb_parallel_read_threads';   -- 默认 4，最大 256
SET SESSION innodb_parallel_read_threads = 8;

-- 该参数只加速"聚簇索引的全量/大范围并行读"，社区版中实际受益的语句：
SELECT COUNT(*) FROM large_table;      -- 无 WHERE 的计数，EXPLAIN TREE 中可见并行
CHECK TABLE large_table;               -- 一致性检查
```

`EXPLAIN FORMAT=TREE` 中看到 `Gather` 类算子即确认并行生效：

```sql
EXPLAIN FORMAT=TREE SELECT COUNT(*) FROM large_table;
```

### 8.2 常见误传：普通查询并不会自动并行

社区版 MySQL 的普通 SELECT（带 WHERE/ORDER BY/GROUP BY 的 OLTP 查询）
**不会**因为调大 `innodb_parallel_read_threads` 而并行执行——优化器仍是
单线程执行模型。网上流传的"9.x 查询全面并行化"说法不成立；

面向分析场景的并行能力分布：

| 能力                       | 社区版 | HeatWave / 其他 |
| -------------------------- | ------ | ---------------- |
| COUNT(*) / CHECK TABLE 并行 | 有     | 有               |
| 通用查询并行（Join/Agg）    | 无     | HeatWave 列存加速 |
| 向量检索与向量索引          | 无     | HeatWave 支持    |

海量分析的并行需求在社区版中的现实解法：分区裁剪 + 索引、预聚合/汇总表，
或把分析负载分流到 HeatWave、ClickHouse 等专门引擎。

### 8.3 参数与监控

```sql
-- 会话级调整（影响当前会话的 COUNT(*)/CHECK TABLE）
SET SESSION innodb_parallel_read_threads = 8;

-- 观测并行读线程
SELECT * FROM performance_schema.threads WHERE NAME LIKE '%parallel_read%';
```

## 9. 其他 MySQL 9.x 新特性

### 9.1 性能改进

```sql
-- 改进的查询优化器
-- 优化器现在能更好地处理 OR 条件
SELECT * FROM orders
WHERE customer_id = 1001 OR status = 'urgent';
-- 9.x 可能使用 index merge 优化

-- EXPLAIN ANALYZE（实际执行并返回耗时）
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 1001;
-- 返回实际执行时间、行数等信息
```

### 9.2 DDL 增强

```sql
-- 原子 DDL：DDL 操作要么完全成功，要么完全回滚
-- MySQL 8.0+ 支持，9.x 进一步增强
CREATE TABLE test_atomic (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);
-- 如果创建失败，不会留下残留文件

-- 在线 DDL 改进
ALTER TABLE large_table
ADD COLUMN new_col VARCHAR(50),
ALGORITHM=INPLACE, LOCK=NONE;
-- 9.x 减少了在线 DDL 期间的锁等待
```

### 9.3 权限与安全

```sql
-- caching_sha2_password 自 8.0 起就是默认认证插件（并非 9.x 新增）；
-- 注意 8.4 中 mysql_native_password 已默认禁用、9.0 起被移除——
-- 还在用老插件的账号升级前必须迁移：
CREATE USER 'app_user'@'%'
IDENTIFIED WITH caching_sha2_password BY 'StrongP@ss123!';

-- 角色管理增强
CREATE ROLE 'read_only', 'read_write', 'admin';
GRANT SELECT ON app_db.* TO 'read_only';
GRANT SELECT, INSERT, UPDATE ON app_db.* TO 'read_write';
GRANT ALL ON app_db.* TO 'admin';

-- 将角色赋予用户
GRANT 'read_write' TO 'developer1'@'%';

-- 用户激活角色
SET ROLE 'read_write';

-- 设置默认角色
ALTER USER 'developer1'@'%' DEFAULT ROLE 'read_write';
```
