---
order: 9
title: 'PL-SQL与存储过程'
module: sql
category: SQL
difficulty: advanced
description: '存储过程与函数、触发器、游标、异常处理、动态 SQL 与方言对比'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/高级查询
  - sql/性能优化
  - sql/SQL实战与面试
  - sql/数据类型
prerequisites: []
---

# PL-SQL与存储过程

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
  COMMIT;
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

## 触发器

触发器是在特定事件（INSERT/UPDATE/DELETE）发生时自动执行的存储过程。

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

## 游标

游标用于逐行处理查询结果。

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

## 异常处理

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

## 小结

- 存储过程适合封装复杂业务逻辑，函数适合计算并返回值
- 触发器用于自动化操作（审计日志、数据同步），但应避免过度使用
- 游标逐行处理性能差，优先使用集合操作
- 异常处理保证程序健壮性，PostgreSQL 用 `EXCEPTION` 块，MySQL 用 `HANDLER`
- 动态 SQL 注意 SQL 注入风险，使用参数化方式（`EXECUTE ... USING`）
- 四种方言在语法上差异较大，但核心概念相通
