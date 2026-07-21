# PostgreSQL 存储过程与函数

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 存储过程基础

**换行写法：创建无参存储过程**
`CREATE PROCEDURE <过程名>() LANGUAGE plpgsql AS $$ BEGIN <过程体> END $$`
```sql
-- 创建查询所有用户的存储过程
CREATE PROCEDURE GetAllUsers()
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT id, username, email, created_at
    FROM users
    ORDER BY created_at DESC;
END $$;
```

**单行写法：调用存储过程**
`CALL <过程名>([<参数>...])`
```sql
-- 调用存储过程
CALL GetAllUsers();
```

**单行写法：删除存储过程**
`DROP PROCEDURE [IF EXISTS] <过程名>([<参数类型>...])`
```sql
-- 删除存储过程
DROP PROCEDURE IF EXISTS GetAllUsers();
```

---

## PL/pgSQL 控制结构

**换行写法：IF 条件判断**
`IF <条件> THEN <语句> [ELSIF <条件> THEN <语句>] [ELSE <语句>] END IF`
```sql
-- 根据金额计算折扣率
CREATE FUNCTION GetDiscount(p_amount DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql AS $$
DECLARE
    v_discount DECIMAL;
BEGIN
    IF p_amount >= 1000 THEN
        v_discount := 0.20;
    ELSIF p_amount >= 500 THEN
        v_discount := 0.10;
    ELSE
        v_discount := 0.00;
    END IF;
    RETURN v_discount;
END $$;
```

**换行写法：CASE 多分支**
`CASE WHEN <条件> THEN <值> [WHEN ...] [ELSE <值>] END`
```sql
-- 根据状态返回描述
CREATE FUNCTION GetStatusDesc(p_status INT)
RETURNS TEXT
LANGUAGE plpgsql AS $$
BEGIN
    RETURN CASE
        WHEN p_status = 1 THEN 'Active'
        WHEN p_status = 0 THEN 'Inactive'
        ELSE 'Unknown'
    END;
END $$;
```

**换行写法：WHILE 循环**
`WHILE <条件> LOOP <语句> END LOOP`
```sql
-- WHILE 循环累加
CREATE FUNCTION SumToN(p_n INT)
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
    v_i INT := 1;
    v_sum INT := 0;
BEGIN
    WHILE v_i <= p_n LOOP
        v_sum := v_sum + v_i;
        v_i := v_i + 1;
    END LOOP;
    RETURN v_sum;
END $$;
```

**换行写法：FOR 循环**
`FOR <变量> IN <起始>..<结束> LOOP <语句> END LOOP`
```sql
-- FOR 循环累加
CREATE FUNCTION SumRange(p_start INT, p_end INT)
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
    v_sum INT := 0;
BEGIN
    FOR i IN p_start..p_end LOOP
        v_sum := v_sum + i;
    END LOOP;
    RETURN v_sum;
END $$;
```

**换行写法：FOR IN 查询循环**
`FOR <记录> IN <SELECT 语句> LOOP <语句> END LOOP`
```sql
-- 遍历查询结果
CREATE PROCEDURE ProcessUsers()
LANGUAGE plpgsql AS $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN SELECT id, username FROM users WHERE status = 1 LOOP
        INSERT INTO user_log (user_id, action) VALUES (v_user.id, 'processed');
    END LOOP;
END $$;
```

**换行写法：LOOP 循环**
`LOOP <语句> EXIT WHEN <条件> END LOOP`
```sql
-- LOOP 循环配合 EXIT 跳出
CREATE FUNCTION LoopDemo(p_limit INT)
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
    v_i INT := 0;
    v_sum INT := 0;
BEGIN
    LOOP
        v_i := v_i + 1;
        EXIT WHEN v_i > p_limit;
        v_sum := v_sum + v_i;
    END LOOP;
    RETURN v_sum;
END $$;
```

---

## 函数创建

**换行写法：创建标量函数**
`CREATE FUNCTION <函数名>([<参数>]) RETURNS <类型> LANGUAGE plpgsql AS $$ BEGIN RETURN <值> END $$`
```sql
-- 计算订单总金额的函数
CREATE FUNCTION CalculateOrderTotal(p_order_id INT)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql AS $$
DECLARE
    v_total DECIMAL(12, 2);
BEGIN
    SELECT SUM(quantity * unit_price)
    INTO v_total
    FROM order_items
    WHERE order_id = p_order_id;
    RETURN COALESCE(v_total, 0);
END $$;
```

**换行写法：创建返回表函数**
`CREATE FUNCTION <函数名>([<参数>]) RETURNS TABLE(<列定义>) LANGUAGE plpgsql AS $$ BEGIN <查询> END $$`
```sql
-- 返回表结果集的函数
CREATE FUNCTION GetUsersByStatus(p_status INT)
RETURNS TABLE(id INT, username VARCHAR, email VARCHAR)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT id, username, email FROM users WHERE status = p_status;
END $$;
```

**换行写法：创建集合返回函数**
`CREATE FUNCTION <函数名>([<参数>]) RETURNS SETOF <表名> LANGUAGE plpgsql AS $$ BEGIN <查询> END $$`
```sql
-- 返回整张表的函数
CREATE FUNCTION GetActiveUsers()
RETURNS SETOF users
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT * FROM users WHERE status = 1;
END $$;
```

---

## 函数调用

**单行写法：SELECT 调用函数**
`SELECT <函数名>(<参数>)`
```sql
-- 调用标量函数
SELECT CalculateOrderTotal(1001) AS total;
```

**换行写法：FROM 调用表函数**
`SELECT * FROM <函数名>(<参数>)`
```sql
-- 调用返回表函数
SELECT * FROM GetUsersByStatus(1);
```

**换行写法：在查询中使用函数**
`SELECT <列名>, <函数名>(<列名>) AS <别名> FROM <表名>`
```sql
-- 在 SELECT 中使用函数
SELECT name, CalculateAge(birthdate) AS age FROM employees;
```

---

## 存储过程调用

**换行写法：带参数的存储过程**
`CALL <过程名>(<参数值>[, ...])`
```sql
-- 调用带参数的存储过程
CALL UpdateUserStatus(1, 0);
```

**换行写法：带事务的存储过程**
`CREATE PROCEDURE <过程名>(<参数>) LANGUAGE plpgsql AS $$ BEGIN <事务> END $$`
```sql
-- 存储过程内使用事务
CREATE PROCEDURE TransferFunds(p_from INT, p_to INT, p_amount DECIMAL)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
    UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
    COMMIT;
END $$;
```

---

## 存储过程删除

**单行写法：删除存储过程**
`DROP PROCEDURE [IF EXISTS] <过程名>([<参数类型>...])`
```sql
-- 删除带参数的存储过程
DROP PROCEDURE IF EXISTS TransferFunds(INT, INT, DECIMAL);
```

**单行写法：删除函数**
`DROP FUNCTION [IF EXISTS] <函数名>([<参数类型>...])`
```sql
-- 删除函数
DROP FUNCTION IF EXISTS CalculateOrderTotal(INT);
```

**单行写法：修改函数**
`ALTER FUNCTION <函数名>([<参数类型>...]) OWNER TO <用户>`
```sql
-- 修改函数所有者
ALTER FUNCTION CalculateOrderTotal(INT) OWNER TO admin;
```
