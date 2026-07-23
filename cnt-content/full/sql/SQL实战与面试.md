---
order: 10
title: SQL实战与面试
module: sql
category: SQL
difficulty: advanced
description: '经典面试题、业务场景 SQL、数据仓库 SQL 与编码规范'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/性能优化
  - 'sql/PL-SQL与存储过程'
  - sql/数据类型
  - sql/约束
prerequisites: []
---

# SQL实战与面试

## 经典面试题

### 1. Top N 问题

**题目**：查询每个部门薪资排名前 3 的员工。

```sql
-- 方法一：窗口函数（推荐）
WITH ranked AS (
  SELECT
    name,
    department,
    salary,
    DENSE_RANK() OVER(PARTITION BY department ORDER BY salary DESC) AS rnk
  FROM employees
)
SELECT name, department, salary
FROM ranked
WHERE rnk <= 3;

-- 方法二：相关子查询（通用但性能差）
SELECT e1.name, e1.department, e1.salary
FROM employees e1
WHERE (
  SELECT COUNT(DISTINCT e2.salary)
  FROM employees e2
  WHERE e2.department = e1.department AND e2.salary > e1.salary
) < 3;

-- 方法三：PostgreSQL DISTINCT ON（取每组第一条）
SELECT DISTINCT ON (department) name, department, salary
FROM employees
ORDER BY department, salary DESC;
```

### 2. 连续登录问题

**题目**：找出连续登录 3 天及以上的用户。

```sql
-- 方法一：日期减 ROW_NUMBER（经典解法）
WITH daily_logins AS (
  SELECT DISTINCT user_id, DATE(login_time) AS login_date
  FROM user_logins
),
grouped AS (
  SELECT
    user_id,
    login_date,
    login_date - (ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY login_date))::INT AS grp
  FROM daily_logins
)
SELECT
  user_id,
  MIN(login_date) AS start_date,
  MAX(login_date) AS end_date,
  COUNT(*) AS consecutive_days
FROM grouped
GROUP BY user_id, grp
HAVING COUNT(*) >= 3;

-- 方法二：LEAD 偏移法
WITH daily_logins AS (
  SELECT DISTINCT user_id, DATE(login_time) AS login_date
  FROM user_logins
),
with_next AS (
  SELECT
    user_id,
    login_date,
    LEAD(login_date, 2) OVER(PARTITION BY user_id ORDER BY login_date) AS date_2_days_later
  FROM daily_logins
)
SELECT DISTINCT user_id
FROM with_next
WHERE date_2_days_later = login_date + INTERVAL '2 days';
```

### 3. 行列转换

**题目**：将学生成绩从行格式转为列格式。

```sql
-- 原始数据
-- student | subject | score
-- Alice   | Math    | 90
-- Alice   | English | 85
-- Bob     | Math    | 78

-- 目标
-- student | Math | English
-- Alice   | 90   | 85
-- Bob     | 78   | NULL

-- 方法一：CASE WHEN（通用）
SELECT
  student,
  MAX(CASE WHEN subject = 'Math' THEN score END) AS Math,
  MAX(CASE WHEN subject = 'English' THEN score END) AS English,
  MAX(CASE WHEN subject = 'Science' THEN score END) AS Science
FROM scores
GROUP BY student;

-- 方法二：SQL Server PIVOT
SELECT student, [Math], [English], [Science]
FROM scores
PIVOT (MAX(score) FOR subject IN ([Math], [English], [Science])) p;

-- 反向：列转行
SELECT student, 'Math' AS subject, Math AS score FROM wide_scores WHERE Math IS NOT NULL
UNION ALL
SELECT student, 'English', English FROM wide_scores WHERE English IS NOT NULL
UNION ALL
SELECT student, 'Science', Science FROM wide_scores WHERE Science IS NOT NULL;
```

### 4. 中位数

**题目**：计算每个部门的薪资中位数。

```sql
-- 方法一：PERCENTILE_CONT（PostgreSQL / SQL Server / Oracle）
SELECT
  department,
  PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY salary) AS median_salary
FROM employees
GROUP BY department;

-- 方法二：窗口函数（通用）
WITH ranked AS (
  SELECT
    department,
    salary,
    ROW_NUMBER() OVER(PARTITION BY department ORDER BY salary) AS rn,
    COUNT(*) OVER(PARTITION BY department) AS cnt
  FROM employees
)
SELECT
  department,
  AVG(salary) AS median_salary
FROM ranked
WHERE rn IN (FLOOR((cnt + 1) / 2.0), CEIL((cnt + 1) / 2.0))
GROUP BY department;
```

### 5. 留存分析

**题目**：计算用户的次日、7日、30日留存率。

```sql
WITH first_login AS (
  -- 每个用户的首次登录日期
  SELECT user_id, MIN(DATE(login_time)) AS first_date
  FROM user_logins
  GROUP BY user_id
),
login_dates AS (
  -- 每个用户每天的登录记录
  SELECT DISTINCT user_id, DATE(login_time) AS login_date
  FROM user_logins
),
retention AS (
  -- 计算留存
  SELECT
    f.first_date AS cohort_date,
    l.login_date,
    l.login_date - f.first_date AS day_diff
  FROM first_login f
  JOIN login_dates l ON f.user_id = l.user_id
)
SELECT
  cohort_date,
  COUNT(DISTINCT CASE WHEN day_diff = 0 THEN user_id END) AS day_0,
  COUNT(DISTINCT CASE WHEN day_diff = 1 THEN user_id END) AS day_1,
  COUNT(DISTINCT CASE WHEN day_diff = 7 THEN user_id END) AS day_7,
  COUNT(DISTINCT CASE WHEN day_diff = 30 THEN user_id END) AS day_30,
  ROUND(
    COUNT(DISTINCT CASE WHEN day_diff = 1 THEN user_id END) * 100.0
    / COUNT(DISTINCT CASE WHEN day_diff = 0 THEN user_id END),
    2
  ) AS day1_rate,
  ROUND(
    COUNT(DISTINCT CASE WHEN day_diff = 7 THEN user_id END) * 100.0
    / COUNT(DISTINCT CASE WHEN day_diff = 0 THEN user_id END),
    2
  ) AS day7_rate
FROM retention
GROUP BY cohort_date
ORDER BY cohort_date;
```

### 6. 去重问题

**题目**：删除表中重复记录，只保留 id 最小的一条。

```sql
-- 方法一：窗口函数
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER(PARTITION BY email ORDER BY id) AS rn
  FROM users
)
DELETE FROM users WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 方法二：自连接（MySQL）
DELETE u1 FROM users u1
JOIN users u2 ON u1.email = u2.email AND u1.id > u2.id;

-- 方法三：NOT IN
DELETE FROM users
WHERE id NOT IN (
  SELECT MIN(id) FROM users GROUP BY email
);
```

### 7. 累计求和与分组求和

**题目**：计算每月累计销售额，以及每月占全年的比例。

```sql
SELECT
  month,
  monthly_sales,
  SUM(monthly_sales) OVER(ORDER BY month) AS cumulative_sales,
  SUM(monthly_sales) OVER() AS yearly_total,
  ROUND(
    monthly_sales * 100.0 / SUM(monthly_sales) OVER(),
    2
  ) AS pct_of_year,
  ROUND(
    SUM(monthly_sales) OVER(ORDER BY month) * 100.0
    / SUM(monthly_sales) OVER(),
    2
  ) AS cumulative_pct
FROM monthly_sales_data;
```

## 业务场景 SQL

### 电商场景

```sql
-- 1. RFM 分析（最近购买时间、购买频率、消费金额）
WITH rfm AS (
  SELECT
    customer_id,
    CURRENT_DATE - MAX(order_date) AS recency,
    COUNT(*) AS frequency,
    SUM(amount) AS monetary
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT
  customer_id,
  NTILE(5) OVER(ORDER BY recency DESC) AS r_score,
  NTILE(5) OVER(ORDER BY frequency) AS f_score,
  NTILE(5) OVER(ORDER BY monetary) AS m_score
FROM rfm;

-- 2. 购物篮分析（频繁项集）
SELECT
  a.product_id AS product_a,
  b.product_id AS product_b,
  COUNT(*) AS pair_count
FROM order_items a
JOIN order_items b ON a.order_id = b.order_id AND a.product_id < b.product_id
GROUP BY a.product_id, b.product_id
HAVING COUNT(*) > 10
ORDER BY pair_count DESC;

-- 3. 用户漏斗分析
SELECT
  '访问' AS step,
  COUNT(DISTINCT user_id) AS users
FROM page_views
WHERE page = 'home'
UNION ALL
SELECT
  '搜索',
  COUNT(DISTINCT user_id)
FROM page_views
WHERE page = 'search'
UNION ALL
SELECT
  '加购',
  COUNT(DISTINCT user_id)
FROM cart_adds
UNION ALL
SELECT
  '下单',
  COUNT(DISTINCT user_id)
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### SaaS 场景

```sql
-- 1. MRR（月度经常性收入）
SELECT
  DATE_TRUNC('month', date) AS month,
  SUM(CASE WHEN action = 'new' THEN amount
           WHEN action = 'upgrade' THEN amount_diff
           WHEN action = 'downgrade' THEN amount_diff
           WHEN action = 'churn' THEN -amount
           ELSE 0 END) AS mrr_change,
  SUM(SUM(CASE WHEN action = 'new' THEN amount
              WHEN action = 'upgrade' THEN amount_diff
              WHEN action = 'downgrade' THEN amount_diff
              WHEN action = 'churn' THEN -amount
              ELSE 0 END)) OVER(ORDER BY DATE_TRUNC('month', date)) AS mrr
FROM subscription_changes
GROUP BY month
ORDER BY month;

-- 2. 用户活跃度分层
WITH user_activity AS (
  SELECT
    user_id,
    COUNT(DISTINCT DATE(activity_time)) AS active_days
  FROM user_activities
  WHERE activity_time >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id
)
SELECT
  CASE
    WHEN active_days >= 20 THEN '高活跃'
    WHEN active_days >= 10 THEN '中活跃'
    WHEN active_days >= 3 THEN '低活跃'
    ELSE '沉默'
  END AS activity_level,
  COUNT(*) AS user_count
FROM user_activity
GROUP BY activity_level;
```

## 数据仓库 SQL

### 星型模型查询

```sql
-- 事实表: fact_sales
-- 维度表: dim_date, dim_product, dim_store, dim_customer

-- 多维分析：按时间、产品类别、地区统计销售额
SELECT
  d.year,
  d.quarter,
  p.category,
  s.region,
  COUNT(f.sale_id) AS sale_count,
  SUM(f.amount) AS total_amount,
  AVG(f.amount) AS avg_amount
FROM fact_sales f
JOIN dim_date d ON f.date_id = d.id
JOIN dim_product p ON f.product_id = p.id
JOIN dim_store s ON f.store_id = s.id
WHERE d.year = 2024
GROUP BY d.year, d.quarter, p.category, s.region;

-- SCD Type 2 维度查询（历史版本追踪）
SELECT
  p.product_name,
  p.category,
  f.amount,
  p.valid_from,
  p.valid_to
FROM fact_sales f
JOIN dim_product p ON f.product_id = p.id
  AND f.sale_date BETWEEN p.valid_from AND COALESCE(p.valid_to, '9999-12-31')
WHERE f.sale_date = '2024-06-01';
```

### ETL 常用模式

```sql
-- 1. 缓慢变化维度（SCD Type 2）更新
-- 关闭旧记录
UPDATE dim_customer
SET valid_to = CURRENT_DATE, is_current = false
WHERE natural_key = :customer_id AND is_current = true;

-- 插入新记录
INSERT INTO dim_customer (natural_key, name, email, valid_from, is_current)
VALUES (:customer_id, :name, :email, CURRENT_DATE, true);

-- 2. 增量加载（MERGE）
MERGE INTO fact_sales_daily target
USING staging_sales source
ON target.sale_id = source.sale_id
WHEN MATCHED AND source.updated_at > target.updated_at THEN
  UPDATE SET amount = source.amount, updated_at = source.updated_at
WHEN NOT MATCHED THEN
  INSERT (sale_id, date_id, product_id, amount, updated_at)
  VALUES (source.sale_id, source.date_id, source.product_id, source.amount, source.updated_at);

-- 3. 事实表分区交换（快速加载）
-- PostgreSQL
CREATE TABLE fact_sales_new (LIKE fact_sales INCLUDING INDEXES);
-- 加载数据到 fact_sales_new ...
ALTER TABLE fact_sales EXCHANGE PARTITION p202406 WITH TABLE fact_sales_new;
```

## SQL 编码规范

### 命名规范

```sql
--  推荐
SELECT
  user_id,
  order_date,
  total_amount
FROM orders
WHERE order_status = 'completed';

--  不推荐
SELECT UserID, OrderDate, TotalAmount FROM ORDERS WHERE OrderStatus = 'completed';

-- 表名：小写，下划线分隔，复数形式
-- users, order_items, product_categories

-- 列名：小写，下划线分隔
-- user_id, created_at, is_active

-- 索引名：idx_表名_列名
-- idx_users_email, idx_orders_customer_id_date

-- 约束名：类型缩写_表名_列名
-- pk_users_id, fk_orders_customer_id, uk_users_email, chk_orders_amount
```

### 格式规范

```sql
--  关键字大写，合理缩进
SELECT
  u.name,
  u.email,
  COUNT(o.id) AS order_count,
  SUM(o.amount) AS total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
  AND u.created_at >= '2024-01-01'
GROUP BY
  u.name,
  u.email
HAVING COUNT(o.id) > 0
ORDER BY total_amount DESC
LIMIT 100;

--  子查询使用 CTE
WITH active_users AS (
  SELECT id, name, email
  FROM users
  WHERE status = 'active'
  AND last_login >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT
  au.name,
  COUNT(o.id) AS order_count
FROM active_users au
LEFT JOIN orders o ON au.id = o.user_id
GROUP BY au.name;

--  复杂条件换行
SELECT *
FROM orders
WHERE
  (status = 'pending' AND created_at < CURRENT_DATE - INTERVAL '7 days')
  OR
  (status = 'processing' AND created_at < CURRENT_DATE - INTERVAL '3 days')
  OR
  (status = 'shipped' AND created_at < CURRENT_DATE - INTERVAL '30 days');
```

### 性能规范

```sql
-- 1. 避免 SELECT *
--
SELECT * FROM users;
--
SELECT id, name, email FROM users;

-- 2. 谨慎使用 DISTINCT
--  可能掩盖数据问题
SELECT DISTINCT user_id FROM orders;
--  理解为什么有重复
SELECT user_id FROM orders GROUP BY user_id;

-- 3. 大表操作分批进行
--  锁表时间过长
DELETE FROM logs WHERE created_at < '2023-01-01';
--  分批删除
DELETE FROM logs WHERE created_at < '2023-01-01' LIMIT 10000;
-- 或使用游标循环

-- 4. 使用 EXISTS 替代 IN（大数据量）
-- 5. LIKE 避免前缀通配符
-- 6. 合理使用索引提示（最后手段）

-- 7. 事务保持简短
--  事务中包含耗时操作
BEGIN;
SELECT * FROM large_table WHERE ...;  -- 耗时查询
UPDATE accounts SET ...;
COMMIT;

--  事务只包含必要的操作
-- 先查询，再开事务更新
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

### 安全规范

```sql
-- 1. 永远使用参数化查询
--  SQL 注入
-- "SELECT * FROM users WHERE name = '" + input + "'"
--
-- cursor.execute("SELECT * FROM users WHERE name = %s", (input,))

-- 2. 最小权限原则
-- 应用账号只授予必要权限
GRANT SELECT, INSERT, UPDATE ON orders TO app_user;
-- 不授予 DDL 权限
-- REVOKE CREATE, DROP, ALTER ON * FROM app_user;

-- 3. 敏感数据加密
-- 密码使用 bcrypt/argon2 哈希
-- 身份证号、手机号加密存储
-- 日志中脱敏处理

-- 4. 避免动态 SQL 拼接
--
-- EXECUTE 'SELECT * FROM ' || table_name;
--  使用白名单校验
IF table_name NOT IN ('users', 'orders', 'products') THEN
  RAISE EXCEPTION '非法表名';
END IF;
```

## 面试准备清单

### 必会知识点

| 类别         | 知识点                                                 |
| ------------ | ------------------------------------------------------ |
| **基础**     | SELECT 执行顺序、JOIN 类型、WHERE vs HAVING、NULL 处理 |
| **窗口函数** | ROW_NUMBER/RANK/DENSE_RANK、LAG/LEAD、累计求和         |
| **多表**     | 子查询 vs JOIN、EXISTS vs IN、CTE                      |
| **数据操作** | 事务 ACID、隔离级别、UPSERT                            |
| **性能**     | EXPLAIN 解读、索引类型、索引失效场景                   |
| **实战**     | Top N、连续登录、行列转换、留存分析                    |

### 高频面试题速查

```
1. SQL 执行顺序？        → FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
2. LEFT JOIN vs INNER JOIN？ → 左连接保留左表全部，内连接只返回匹配行
3. WHERE vs HAVING？     → WHERE 分组前过滤行，HAVING 分组后过滤组
4. UNION vs UNION ALL？  → UNION 去重排序，UNION ALL 不去重更快
5. EXISTS vs IN？        → EXISTS 短路求值适合大子查询，IN 适合小子查询
6. 如何去重？            → DISTINCT / GROUP BY / ROW_NUMBER
7. 如何取分组 Top N？    → ROW_NUMBER() OVER(PARTITION BY ... ORDER BY ...)
8. 索引什么时候失效？    → 函数、隐式转换、前缀通配符、不等于、OR
9. 事务隔离级别？        → 读未提交、读已提交、可重复读、串行化
10. 什么是 MVCC？        → 多版本并发控制，读写不阻塞
```

## 小结

- Top N 问题首选窗口函数 `DENSE_RANK`，连续登录问题用日期减 `ROW_NUMBER`
- 行列转换用 `CASE WHEN`，中位数用 `PERCENTILE_CONT`
- 留存分析是数据岗位的核心考点，理解 cohort 概念是关键
- 业务 SQL 注重理解需求，数据仓库 SQL 注重理解模型
- 编码规范提升可读性和可维护性，安全规范防止 SQL 注入
- 面试准备要兼顾理论深度和实战能力，窗口函数和执行计划是重点
