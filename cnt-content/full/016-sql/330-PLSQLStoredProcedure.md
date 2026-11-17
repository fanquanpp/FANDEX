---
order: 350
title: PL/SQL 与存储过程
module: 'sql'
category: 数据库
difficulty: advanced
description: 存储过程与函数、触发器、游标、异常处理、动态 SQL 与方言对比
author: fanquanpp
updated: '2026-11-17'
related:
  - 'sql/250-RecursiveCTETreeTraversal'
  - 'sql/440-PerformanceOptimization'
  - 'sql/450-SQLPracticeInterview'
  - 'sql/090-DataType'
prerequisites: []
---

## 学习目标

本文是「SQL」模块的第 33 篇，难度定位为高级。重点内容：存储过程与函数、触发器、游标、异常处理、动态 SQL 与方言对比

主要章节：

- 心智模型：库端可编程代码的四件套与取舍
- 游标
- 异常处理
- 触发器
- 存储过程
- 动态 SQL
- 方言对比
- 遮码自检
- ……共 10 个章节（含学习目标与小结）

## 心智模型：库端可编程代码的四件套与取舍

本篇四个主题共享一个心智：**把一段"流程化的数据操作"搬进数据库端执行**。存储过程
是可调用的 SQL 程序块（PostgreSQL 用 plpgsql 的 `$$ ... $$`，MySQL 用
`BEGIN ... END` 配 DELIMITER，Oracle 用 PL/SQL），函数与过程的分工从 PostgreSQL 11
起明确：`FUNCTION` 有返回值、能出现在 SQL 表达式里（`SELECT f()`），`PROCEDURE`
无返回值、用 `CALL` 调用、且能在体内管理事务。游标是"逐行处理结果集的指针"，触发器
是"写路径上的隐式钩子"，动态 SQL 是"运行时才确定语句文本"。

什么时候用、什么时候不用，比语法重要：

- **默认把逻辑放应用层**。存储过程把代码散在库端，版本管理、测试、灰度都难做；
  适合留下的是数据密集的批量任务（大表分批清理、报表加工）与必须贴近数据的
  事务封装。
- **游标与"集合思维"对立**。SQL 的强项是整批操作，游标逐行循环通常慢一个数量级；
  写游标前先问"这能不能改成一条 INSERT ... SELECT / UPDATE ... JOIN"。只有每行都
  要调用外部系统、或逻辑真的无法用集合表达时才动用游标。
- **触发器是隐式副作用**。适合审计流水、时间戳兜底这类"永远该发生"的小事；
  业务规则塞进触发器会让写路径"看不见地变重"，接手的人排查问题先翻触发器。
- **动态 SQL 必须参数绑定**。运行时拼接语句文本就有注入风险——用
  `EXECUTE ... USING`（PostgreSQL）或 PREPARE 的占位符（MySQL）把数据当参数传，
  永远不把用户输入拼进 SQL 字符串。

流程控制与异常语法几乎完全不可移植（MySQL 的 HANDLER 对 PG 的
`EXCEPTION WHEN`），跨库项目把库端代码当方言资产维护，别指望一套过程三个库通用。

## 游标

**基本写法：声明游标**
`DECLARE <游标名> CURSOR FOR <SELECT语句>`
```sql
-- MySQL 游标
DELIMITER //
CREATE PROCEDURE process_employees()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_name VARCHAR(50);
  DECLARE v_salary DECIMAL(10,2);
  
  DECLARE emp_cursor CURSOR FOR
    SELECT name, salary FROM employees WHERE active = 1;
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN emp_cursor;
  read_loop: LOOP
    FETCH emp_cursor INTO v_name, v_salary;
    IF done THEN LEAVE read_loop;
    END IF;
    -- 处理每行数据
    INSERT INTO salary_log (name, salary) VALUES (v_name, v_salary);
  END LOOP;
  CLOSE emp_cursor;
END //
DELIMITER ;
```

---

**基本写法：PostgreSQL 游标**
`FOR <变量> IN SELECT <语句> LOOP <处理> END LOOP`
```sql
-- PostgreSQL FOR-IN 循环游标
CREATE OR REPLACE FUNCTION log_salaries()
RETURNS VOID AS $$
DECLARE
  emp_record RECORD;
BEGIN
  FOR emp_record IN SELECT name, salary FROM employees LOOP
    INSERT INTO salary_log (name, salary)
    VALUES (emp_record.name, emp_record.salary);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 异常处理

**基本写法：MySQL 异常处理**
`DECLARE <CONTINUE|EXIT> HANDLER FOR <条件> <处理语句>`
```sql
-- 异常处理
DELIMITER //
CREATE PROCEDURE safe_insert(IN p_name VARCHAR(50))
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SELECT '插入失败' AS result;
  END;
  
  START TRANSACTION;
  INSERT INTO users (name) VALUES (p_name);
  INSERT INTO logs (action) VALUES (CONCAT('user_created: ', p_name));
  COMMIT;
END //
DELIMITER ;
```

---

**基本写法：PostgreSQL 异常处理**
`BEGIN <语句> EXCEPTION WHEN <异常> THEN <处理> END`
```sql
-- PostgreSQL 异常处理
CREATE OR REPLACE FUNCTION safe_divide(a NUMERIC, b NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN a / b;
EXCEPTION
  WHEN division_by_zero THEN
    RETURN NULL;
  WHEN OTHERS THEN
    RAISE NOTICE '未知错误: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

---

## 触发器

**基本写法：创建触发器**
`CREATE TRIGGER <名称> <BEFORE|AFTER> <INSERT|UPDATE|DELETE> ON <表> FOR EACH ROW <动作>`
```sql
-- MySQL 触发器
DELIMITER //
CREATE TRIGGER before_insert_employee
BEFORE INSERT ON employees
FOR EACH ROW
BEGIN
  SET NEW.created_at = NOW();
  IF NEW.salary IS NULL THEN
    SET NEW.salary = 0;
  END IF;
END //
DELIMITER ;
```

---

**基本写法：PostgreSQL 触发器函数**
`CREATE FUNCTION <名>() RETURNS TRIGGER AS $$ BEGIN <动作>; RETURN NEW; END; $$ LANGUAGE plpgsql`
```sql
-- PostgreSQL 触发器（需要先创建函数）
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_time
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_modified_time();
```

---

## 存储过程

存储过程是预编译并存储在数据库中的 SQL 程序，可被多次调用。

### PostgreSQL 存储过程

```sql
-- 创建存储过程（PostgreSQL 11+ 支持 PROCEDURE）
CREATE PROCEDURE transfer_funds(
  p_from INT,
  p_to INT,
  p_amount DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
  -- 转账必须原子：过程体内不写 COMMIT，提交时机交给调用方
  -- （PG 11+ 的 PROCEDURE 虽允许体内 COMMIT/ROLLBACK，但"两条 UPDATE 缺一不可"
  --  的转账中途提交等于放弃原子性，第二条失败时第一条已无法回滚）
END;
$$;

-- 调用
CALL transfer_funds(1, 2, 100.00);

-- 创建函数（返回值）
CREATE FUNCTION get_dept_avg_salary(p_dept VARCHAR)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_avg DECIMAL(10,2);
BEGIN
  SELECT AVG(salary) INTO v_avg
  FROM employees
  WHERE department = p_dept;
  RETURN v_avg;
END;
$$;

-- 调用函数
SELECT get_dept_avg_salary('IT');

-- 返回表的函数
CREATE FUNCTION get_employees_by_dept(p_dept VARCHAR)
RETURNS TABLE(name VARCHAR, salary DECIMAL(10,2))
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT e.name, e.salary
  FROM employees e
  WHERE e.department = p_dept
  ORDER BY e.salary DESC;
END;
$$;

SELECT * FROM get_employees_by_dept('IT');
```

### MySQL 存储过程

```sql
-- 创建存储过程
DELIMITER //
CREATE PROCEDURE transfer_funds(
  IN p_from INT,
  IN p_to INT,
  IN p_amount DECIMAL(10,2)
)
BEGIN
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
  COMMIT;
END //
DELIMITER ;

-- 调用
CALL transfer_funds(1, 2, 100.00);

-- 带输出参数
DELIMITER //
CREATE PROCEDURE get_user_stats(
  IN p_user_id INT,
  OUT p_order_count INT,
  OUT p_total_amount DECIMAL(10,2)
)
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO p_order_count, p_total_amount
  FROM orders
  WHERE user_id = p_user_id;
END //
DELIMITER ;

CALL get_user_stats(1, @count, @total);
SELECT @count, @total;

-- 创建函数
DELIMITER //
CREATE FUNCTION get_dept_avg_salary(p_dept VARCHAR(50))
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_avg DECIMAL(10,2);
  SELECT AVG(salary) INTO v_avg
  FROM employees
  WHERE department = p_dept;
  RETURN v_avg;
END //
DELIMITER ;
```

### SQL Server 存储过程

```sql
-- 创建存储过程
CREATE PROCEDURE transfer_funds
  @from INT,
  @to INT,
  @amount DECIMAL(10,2)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE accounts SET balance = balance - @amount WHERE id = @from;
  UPDATE accounts SET balance = balance + @amount WHERE id = @to;
  COMMIT;
END;

-- 调用
EXEC transfer_funds @from = 1, @to = 2, @amount = 100.00;

-- 返回结果集
CREATE PROCEDURE get_employees_by_dept
  @dept VARCHAR(50)
AS
BEGIN
  SELECT name, salary
  FROM employees
  WHERE department = @dept
  ORDER BY salary DESC;
END;

EXEC get_employees_by_dept @dept = 'IT';
```

### PostgreSQL 触发器

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_at();

-- 审计触发器
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, operation, new_data, changed_at)
    VALUES(TG_TABLE_NAME, 'INSERT', to_jsonb(NEW), CURRENT_TIMESTAMP);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, operation, old_data, new_data, changed_at)
    VALUES(TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, operation, old_data, changed_at)
    VALUES(TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), CURRENT_TIMESTAMP);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_audit
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION audit_changes();

-- 语句级触发器（每条 SQL 触发一次）
CREATE TRIGGER trg_orders_after_batch
  AFTER UPDATE ON orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_materialized_view();
```

### MySQL 触发器

```sql
-- BEFORE INSERT 触发器
DELIMITER //
CREATE TRIGGER trg_users_before_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  SET NEW.created_at = CURRENT_TIMESTAMP;
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- AFTER UPDATE 触发器
DELIMITER //
CREATE TRIGGER trg_orders_after_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO order_status_log(order_id, old_status, new_status, changed_at)
    VALUES(NEW.id, OLD.status, NEW.status, CURRENT_TIMESTAMP);
  END IF;
END //
DELIMITER ;
```

### PostgreSQL 游标

```sql
CREATE FUNCTION process_orders()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  order_cursor CURSOR FOR
    SELECT id, customer_id, amount FROM orders WHERE status = 'pending';
  v_id INT;
  v_customer_id INT;
  v_amount DECIMAL(10,2);
BEGIN
  OPEN order_cursor;
  LOOP
    FETCH order_cursor INTO v_id, v_customer_id, v_amount;
    EXIT WHEN NOT FOUND;

    -- 处理每笔订单
    UPDATE orders SET status = 'processing' WHERE id = v_id;
    INSERT INTO order_log(order_id, action, created_at)
    VALUES(v_id, 'processing_started', CURRENT_TIMESTAMP);

    -- 模拟业务逻辑
    IF v_amount > 10000 THEN
      UPDATE orders SET priority = 'high' WHERE id = v_id;
    END IF;
  END LOOP;
  CLOSE order_cursor;
END;
$$;

-- FOR 循环游标（更简洁）
CREATE FUNCTION batch_update_prices()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  FOR rec IN
    SELECT id, price FROM products WHERE category = 'electronics'
  LOOP
    UPDATE products SET price = rec.price * 1.1 WHERE id = rec.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
```

### SQL Server 游标

```sql
CREATE PROCEDURE process_orders
AS
BEGIN
  DECLARE @id INT, @customer_id INT, @amount DECIMAL(10,2);

  DECLARE order_cursor CURSOR FOR
    SELECT id, customer_id, amount FROM orders WHERE status = 'pending';

  OPEN order_cursor;
  FETCH NEXT FROM order_cursor INTO @id, @customer_id, @amount;

  WHILE @@FETCH_STATUS = 0
  BEGIN
    UPDATE orders SET status = 'processing' WHERE id = @id;
    FETCH NEXT FROM order_cursor INTO @id, @customer_id, @amount;
  END

  CLOSE order_cursor;
  DEALLOCATE order_cursor;
END;
```

> **注意**：游标性能较差，应尽量用集合操作替代。只在必须逐行处理时才使用游标。

### PostgreSQL 异常处理

```sql
CREATE FUNCTION safe_transfer(
  p_from INT,
  p_to INT,
  p_amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  -- 检查余额
  SELECT balance INTO v_balance FROM accounts WHERE id = p_from FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION '余额不足: 当前 %, 需要 %', v_balance, p_amount;
  END IF;

  -- 执行转账
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;

  RETURN true;

EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE NOTICE '账户不存在: %', p_from;
    RETURN false;
  WHEN OTHERS THEN
    RAISE NOTICE '转账失败: %', SQLERRM;
    RETURN false;
END;
$$;

-- 自定义异常
CREATE FUNCTION validate_order(p_order_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION '订单 % 不存在', p_order_id USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM orders WHERE id = p_order_id AND status = 'cancelled') THEN
    RAISE EXCEPTION '订单 % 已取消', p_order_id USING ERRCODE = 'P0002';
  END IF;
END;
$$;
```

### MySQL 异常处理

```sql
DELIMITER //
CREATE PROCEDURE safe_transfer(
  IN p_from INT,
  IN p_to INT,
  IN p_amount DECIMAL(10,2),
  OUT p_success BOOLEAN
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_success = FALSE;
  END;

  START TRANSACTION;

  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;

  COMMIT;
  SET p_success = TRUE;
END //
DELIMITER ;

-- 条件处理
DELIMITER //
CREATE PROCEDURE insert_user(
  IN p_name VARCHAR(100),
  IN p_email VARCHAR(255)
)
BEGIN
  DECLARE CONTINUE HANDLER FOR 1062  -- Duplicate entry
  BEGIN
    SELECT '邮箱已存在' AS message;
  END;

  INSERT INTO users (name, email) VALUES (p_name, p_email);
END //
DELIMITER ;
```

## 动态 SQL

### PostgreSQL 动态 SQL

```sql
CREATE FUNCTION dynamic_query(
  p_table TEXT,
  p_column TEXT,
  p_value TEXT
)
RETURNS SETOF RECORD
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT * FROM %I WHERE %I = $1',
    p_table, p_column
  ) USING p_value;
END;
$$;

-- 调用（需指定列类型）
SELECT * FROM dynamic_query('users', 'email', 'alice@example.com')
  AS (id INT, name VARCHAR, email VARCHAR);

-- 更安全的动态 SQL
CREATE FUNCTION search_orders(p_conditions JSONB)
RETURNS TABLE(id INT, amount DECIMAL, order_date DATE)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sql TEXT;
  v_where TEXT := '';
BEGIN
  v_sql := 'SELECT id, amount, order_date FROM orders WHERE 1=1';

  IF p_conditions ? 'status' THEN
    v_where := v_where || ' AND status = $1';
  END IF;

  IF p_conditions ? 'min_amount' THEN
    v_where := v_where || ' AND amount >= $2';
  END IF;

  v_sql := v_sql || v_where;

  RETURN QUERY EXECUTE v_sql
    USING p_conditions->>'status',
          (p_conditions->>'min_amount')::DECIMAL;
END;
$$;
```

### SQL Server 动态 SQL

```sql
CREATE PROCEDURE search_orders
  @status VARCHAR(20) = NULL,
  @min_amount DECIMAL(10,2) = NULL
AS
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  DECLARE @params NVARCHAR(MAX);

  SET @sql = N'SELECT id, amount, order_date FROM orders WHERE 1=1';
  SET @params = N'@status VARCHAR(20), @min_amount DECIMAL(10,2)';

  IF @status IS NOT NULL
    SET @sql = @sql + N' AND status = @status';

  IF @min_amount IS NOT NULL
    SET @sql = @sql + N' AND amount >= @min_amount';

  EXEC sp_executesql @sql, @params, @status, @min_amount;
END;
```

## 方言对比

### 变量声明

```sql
-- PostgreSQL (PL/pgSQL)
DECLARE
  v_name VARCHAR(100) := 'default';
  v_count INT DEFAULT 0;
  v_data RECORD;

-- MySQL
DECLARE v_name VARCHAR(100) DEFAULT 'default';
DECLARE v_count INT DEFAULT 0;

-- SQL Server (T-SQL)
DECLARE @name VARCHAR(100) = 'default';
DECLARE @count INT = 0;

-- Oracle (PL/SQL)
v_name VARCHAR2(100) := 'default';
v_count NUMBER := 0;
```

### 控制流

```sql
-- IF 语句
-- PostgreSQL
IF v_score >= 90 THEN
  v_grade := 'A';
ELSIF v_score >= 80 THEN
  v_grade := 'B';
ELSE
  v_grade := 'C';
END IF;

-- MySQL
IF v_score >= 90 THEN
  SET v_grade = 'A';
ELSEIF v_score >= 80 THEN
  SET v_grade = 'B';
ELSE
  SET v_grade = 'C';
END IF;

-- SQL Server
IF @score >= 90
  SET @grade = 'A';
ELSE IF @score >= 80
  SET @grade = 'B';
ELSE
  SET @grade = 'C';

-- LOOP 语句
-- PostgreSQL
LOOP
  v_count := v_count + 1;
  EXIT WHEN v_count > 10;
END LOOP;

-- WHILE
WHILE v_count <= 10 LOOP
  v_count := v_count + 1;
END LOOP;

-- SQL Server
WHILE @count <= 10
BEGIN
  SET @count = @count + 1;
END

-- FOR 循环
-- PostgreSQL
FOR i IN 1..10 LOOP
  -- ...
END LOOP;

-- Oracle
FOR i IN 1..10 LOOP
  -- ...
END LOOP;
```

### 完整方言对比表

| 特性       | PL/pgSQL     | MySQL           | T-SQL         | PL/SQL            |
| ---------- | ------------ | --------------- | ------------- | ----------------- |
| 变量前缀   | 无           | 无              | @             | 无                |
| 赋值       | `:=` 或 `=`  | `SET var =`     | `SET @var =`  | `:=`              |
| IF         | ELSIF        | ELSEIF          | ELSE IF       | ELSIF             |
| 字符串拼接 | `\|\|`       | CONCAT()        | +             | `\|\|`            |
| 异常处理   | EXCEPTION块  | HANDLER         | TRY/CATCH     | EXCEPTION块       |
| 游标循环   | FOR rec IN   | FETCH + WHILE   | FETCH + WHILE | FOR rec IN        |
| 动态SQL    | EXECUTE      | PREPARE/EXECUTE | sp_executesql | EXECUTE IMMEDIATE |
| 返回结果集 | RETURN QUERY | SELECT          | SELECT        | PIPELINED         |
| 数组支持   |              |                 |               | (VARRAY)          |
| 事务控制   |              |                 |               |                   |

## 遮码自检

遮住答案先写；本篇的自检重点是"选型判断 + 方言对照"两条线。

**第 1 题：把"逐行读员工、逐行 INSERT 进 salary_log"的游标过程改写成集合写法。改完说说两者差在哪。**

<details><summary>参考答案</summary>

```sql
INSERT INTO salary_log (name, salary)
SELECT name, salary FROM employees WHERE active = 1;
```

一条语句替代 OPEN/FETCH/LOOP/CLOSE 整套机械，数据库可以并行、可以走索引、一次写
批量的页——游标版逐行往返慢一个数量级。判断顺序：先找集合写法，找不到才用游标。
</details>

**第 2 题：PostgreSQL 11+ 里 PROCEDURE 和 FUNCTION 的三个差别？"转账"该用哪个？**

<details><summary>参考答案</summary>

函数有返回值、能嵌进 SQL 表达式（`SELECT get_dept_avg_salary('IT')`），用 SELECT 调；
过程无返回值、用 `CALL` 调，且**体内可以 COMMIT/ROLLBACK 管理事务**（函数不行）。
转账该用 PROCEDURE——但要记住：允许体内管理事务不等于该中途提交，原子性靠
"过程内不提交、由调用方控制提交边界"来保证。
</details>

**第 3 题：除零防护，MySQL 的 HANDLER 与 PostgreSQL 的 EXCEPTION 各怎么写？POSTGRES 的 `WHEN OTHERS` 相当于 MySQL 的什么？**

<details><summary>参考答案</summary>

MySQL：`DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ... END;`（按错误码或条件声明
处理器，声明必须排在变量之后）；PostgreSQL：`EXCEPTION WHEN division_by_zero THEN
... WHEN OTHERS THEN ...`（块级异常分支）。`WHEN OTHERS` 对应 MySQL 的
`SQLEXCEPTION` 通配处理——两者都要慎用：兜底吞错会把问题埋深，至少记日志。
</details>

**第 4 题：动态 SQL 拼接表名/条件时，哪些部分可以参数绑定、哪些必须白名单？"直接拼接用户输入"的后果是什么？**

<details><summary>参考答案</summary>

**值**永远走参数绑定（`EXECUTE ... USING p_val` / PREPARE 的 `?` 占位符）；**标识符**
（表名、列名）与 SQL 关键字没法绑定，只能来自代码内白名单或 `quote_ident()`
（PostgreSQL）/ `quote_ident` 等引用函数，绝不直接拼接用户输入。直接拼接的后果是
SQL 注入：`' OR '1'='1` 一类输入改变语句语义——这是库端动态 SQL 与应用层共享的
同一条铁律：数据是参数，结构是代码。
</details>

**第 5 题：BEFORE 触发器里改 `NEW.salary` 和 AFTER 触发器里写审计表，各自为什么是对的搭配？换过来会怎样？**

<details><summary>参考答案</summary>

BEFORE 阶段行还没落盘，修改 NEW.* 能改变**本次写入的最终值**（补默认值、纠偏）；
AFTER 阶段写入已定局，适合做"对既成事实的反应"（审计、同步统计）。换过来：AFTER
里改 NEW 无效（行已写入），BEFORE 里写审计表则审计的是"未发生的写入"——回滚后
审计表却留了记录。选择口诀：改数据 BEFORE，记事实 AFTER。
</details>

## 小结

- 存储过程适合封装复杂业务逻辑，函数适合计算并返回值
- 触发器用于自动化操作（审计日志、数据同步），但应避免过度使用
- 游标逐行处理性能差，优先使用集合操作
- 异常处理保证程序健壮性，PostgreSQL 用 `EXCEPTION` 块，MySQL 用 `HANDLER`
- 动态 SQL 注意 SQL 注入风险，使用参数化方式（`EXECUTE ... USING`）
- 四种方言在语法上差异较大，但核心概念相通
## 存储过程创建

**基本写法：MySQL 存储过程**
`CREATE PROCEDURE <名称>([<参数>]) BEGIN <SQL语句> END`
```sql
-- MySQL 创建存储过程
DELIMITER //
CREATE PROCEDURE get_employee_count(OUT count INT)
BEGIN
  SELECT COUNT(*) INTO count FROM employees;
END //
DELIMITER ;

-- 调用
CALL get_employee_count(@total);
SELECT @total;
```

---

**基本写法：PostgreSQL 函数**
`CREATE OR REPLACE FUNCTION <名称>(<参数>) RETURNS <类型> AS $$ BEGIN <SQL> END; $$ LANGUAGE plpgsql`
```sql
-- PostgreSQL PL/pgSQL 函数
CREATE OR REPLACE FUNCTION get_dept_count(p_dept VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM employees WHERE dept = p_dept;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 调用
SELECT get_dept_count('IT');
```

---

**基本写法：带 IN 参数**
`CREATE PROCEDURE <名>(IN <参数> <类型>)`
```sql
-- MySQL 带输入参数
DELIMITER //
CREATE PROCEDURE get_by_salary(IN min_sal DECIMAL(10,2))
BEGIN
  SELECT name, salary FROM employees WHERE salary >= min_sal;
END //
DELIMITER ;

CALL get_by_salary(50000);
```

---

**基本写法：带 OUT 参数**
`CREATE PROCEDURE <名>(OUT <参数> <类型>)`
```sql
-- MySQL 带输出参数
DELIMITER //
CREATE PROCEDURE get_avg_salary(OUT avg_sal DECIMAL(10,2))
BEGIN
  SELECT AVG(salary) INTO avg_sal FROM employees;
END //
DELIMITER ;

CALL get_avg_salary(@avg);
SELECT @avg;
```

---

**基本写法：带 INOUT 参数**
`CREATE PROCEDURE <名>(INOUT <参数> <类型>)`
```sql
-- INOUT 参数可读可写
DELIMITER //
CREATE PROCEDURE double_value(INOUT val INT)
BEGIN
  SET val = val * 2;
END //
DELIMITER ;

SET @x = 10;
CALL double_value(@x);
SELECT @x;  -- 20
```

---

## 变量与控制流

**基本写法：声明变量**
`DECLARE <变量名> <类型> [DEFAULT <默认值>];`
```sql
-- MySQL 存储过程中声明变量
DELIMITER //
CREATE PROCEDURE demo_vars()
BEGIN
  DECLARE v_name VARCHAR(50) DEFAULT 'unknown';
  DECLARE v_count INT DEFAULT 0;
  DECLARE v_active BOOLEAN DEFAULT TRUE;
  
  SET v_name = 'Alice';
  SELECT COUNT(*) INTO v_count FROM employees;
  
  SELECT v_name, v_count, v_active;
END //
DELIMITER ;
```

---

**基本写法：IF 条件**
`IF <条件> THEN <语句> ELSEIF <条件> THEN <语句> ELSE <语句> END IF`
```sql
-- IF/ELSEIF/ELSE
DELIMITER //
CREATE PROCEDURE get_salary_level(IN sal DECIMAL(10,2), OUT level VARCHAR(20))
BEGIN
  IF sal >= 100000 THEN
    SET level = '高薪';
  ELSEIF sal >= 50000 THEN
    SET level = '中薪';
  ELSE
    SET level = '普通';
  END IF;
END //
DELIMITER ;
```

---

**基本写法：CASE 语句**
`CASE WHEN <条件> THEN <值> ... ELSE <值> END CASE`
```sql
-- CASE WHEN 控制流
DELIMITER //
CREATE PROCEDURE get_grade(IN score INT, OUT grade CHAR(1))
BEGIN
  CASE
    WHEN score >= 90 THEN SET grade = 'A';
    WHEN score >= 80 THEN SET grade = 'B';
    WHEN score >= 70 THEN SET grade = 'C';
    WHEN score >= 60 THEN SET grade = 'D';
    ELSE SET grade = 'F';
  END CASE;
END //
DELIMITER ;
```

---

**基本写法：WHILE 循环**
`WHILE <条件> DO <语句> END WHILE`
```sql
-- WHILE 循环
DELIMITER //
CREATE PROCEDURE fill_numbers(IN max_n INT)
BEGIN
  DECLARE i INT DEFAULT 1;
  WHILE i <= max_n DO
    INSERT INTO numbers (value) VALUES (i);
    SET i = i + 1;
  END WHILE;
END //
DELIMITER ;
```

---

**基本写法：LOOP 循环**
`<标签>: LOOP <语句> IF <条件> THEN LEAVE <标签>; END IF; END LOOP`
```sql
-- LOOP + LEAVE
DELIMITER //
CREATE PROCEDURE process_loop(IN max_count INT)
BEGIN
  DECLARE i INT DEFAULT 0;
  loop1: LOOP
    SET i = i + 1;
    IF i > max_count THEN
      LEAVE loop1;
    END IF;
    -- 处理逻辑
  END LOOP loop1;
END //
DELIMITER ;
```

---

**基本写法：REPEAT 循环**
`REPEAT <语句> UNTIL <条件> END REPEAT`
```sql
-- REPEAT UNTIL（先执行后判断）
DELIMITER //
CREATE PROCEDURE repeat_demo(IN max_n INT)
BEGIN
  DECLARE i INT DEFAULT 0;
  REPEAT
    SET i = i + 1;
  UNTIL i >= max_n
  END REPEAT;
END //
DELIMITER ;
```

---

## 删除与查看

**基本写法：删除存储过程**
`DROP PROCEDURE [IF EXISTS] <名称>`
```sql
-- 删除存储过程
DROP PROCEDURE IF EXISTS get_employee_count;
```

---

**基本写法：查看存储过程**
`SHOW CREATE PROCEDURE <名称>`
```sql
-- MySQL 查看存储过程定义
SHOW CREATE PROCEDURE get_employee_count;

-- 查看所有存储过程
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'mydb';
```

---

**基本写法：PostgreSQL 查看函数**
`SELECT proname FROM pg_proc WHERE proname LIKE '<模式>';`
```sql
-- PostgreSQL 查看函数
SELECT proname, prosrc FROM pg_proc
WHERE proname = 'get_dept_count';
```
