---
order: 95
tags:
  - mysql
  - 'stored-procedure'
difficulty: advanced
title: 存储过程与函数
module: mysql
category: 'MySQL Basics'
description: MySQL存储过程与自定义函数详解：创建、参数、变量、流程控制、游标与异常处理。
author: fanquanpp
updated: '2026-06-13'
related:
  - mysql/性能调优与安全
  - mysql/函数索引
  - mysql/MVCC快照读与当前读
  - mysql/索引原理与性能优化
prerequisites:
  - mysql/语法速查
---

## 1. 存储过程基础

### 1.1 什么是存储过程

存储过程是一组预编译的SQL语句集合，存储在数据库中，可通过名称调用执行。

**优势**：

- **性能**：预编译执行，减少网络传输
- **安全**：可控制数据访问权限
- **复用**：封装业务逻辑，多处调用
- **维护**：修改逻辑只需更新存储过程

### 1.2 创建与调用

```sql
-- 创建简单存储过程
DELIMITER //

CREATE PROCEDURE GetAllUsers()
BEGIN
    SELECT id, username, email, created_at
    FROM users
    ORDER BY created_at DESC;
END //

DELIMITER ;

-- 调用存储过程
CALL GetAllUsers();

-- 删除存储过程
DROP PROCEDURE IF EXISTS GetAllUsers;

-- 查看存储过程定义
SHOW CREATE PROCEDURE GetAllUsers;
```

### 1.3 参数类型

```sql
DELIMITER //

-- IN 参数（默认，传入值）
CREATE PROCEDURE GetUserById(IN p_user_id INT)
BEGIN
    SELECT id, username, email
    FROM users
    WHERE id = p_user_id;
END //

-- OUT 参数（返回值）
CREATE PROCEDURE GetUserCount(OUT p_count INT)
BEGIN
    SELECT COUNT(*) INTO p_count FROM users;
END //

-- INOUT 参数（传入并返回）
CREATE PROCEDURE DoubleValue(INOUT p_value INT)
BEGIN
    SET p_value = p_value * 2;
END //

DELIMITER ;

-- 调用带参数的存储过程
CALL GetUserById(1);

-- 调用OUT参数
CALL GetUserCount(@total);
SELECT @total;

-- 调用INOUT参数
SET @num = 10;
CALL DoubleValue(@num);
SELECT @num;  -- 20
```

## 2. 变量与流程控制

### 2.1 变量声明

```sql
DELIMITER //

CREATE PROCEDURE VariableDemo()
BEGIN
    -- 局部变量（用DECLARE声明，有默认值）
    DECLARE v_name VARCHAR(100) DEFAULT 'Unknown';
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_total DECIMAL(10, 2);

    -- 使用SELECT INTO赋值
    SELECT COUNT(*) INTO v_count FROM users;

    -- 使用SET赋值
    SET v_total = v_count * 9.99;

    -- 用户变量（@前缀，会话级别）
    SET @user_var = 'Hello';

    SELECT v_name, v_count, v_total;
END //

DELIMITER ;
```

### 2.2 条件判断

```sql
DELIMITER //

-- IF语句
CREATE PROCEDURE GetDiscount(IN p_amount DECIMAL(10, 2))
BEGIN
    DECLARE v_discount DECIMAL(4, 2);

    IF p_amount >= 1000 THEN
        SET v_discount = 0.20;
    ELSEIF p_amount >= 500 THEN
        SET v_discount = 0.10;
    ELSEIF p_amount >= 100 THEN
        SET v_discount = 0.05;
    ELSE
        SET v_discount = 0.00;
    END IF;

    SELECT p_amount AS original,
           p_amount * (1 - v_discount) AS discounted,
           v_discount AS discount_rate;
END //

-- CASE语句
CREATE PROCEDURE GetShippingCost(IN p_region VARCHAR(50))
BEGIN
    DECLARE v_cost DECIMAL(10, 2);

    CASE p_region
        WHEN 'North' THEN SET v_cost = 10.00;
        WHEN 'South' THEN SET v_cost = 15.00;
        WHEN 'East' THEN SET v_cost = 12.00;
        WHEN 'West' THEN SET v_cost = 12.00;
        ELSE SET v_cost = 20.00;
    END CASE;

    SELECT v_cost AS shipping_cost;
END //

DELIMITER ;
```

### 2.3 循环

```sql
DELIMITER //

-- WHILE循环
CREATE PROCEDURE GenerateNumbers(IN p_count INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE result VARCHAR(1000) DEFAULT '';

    WHILE i <= p_count DO
        SET result = CONCAT(result, IF(i > 1, ',', ''), i);
        SET i = i + 1;
    END WHILE;

    SELECT result AS numbers;
END //

-- REPEAT循环（至少执行一次）
CREATE PROCEDURE RepeatDemo(IN p_limit INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE total INT DEFAULT 0;

    REPEAT
        SET total = total + i;
        SET i = i + 1;
    UNTIL i > p_limit
    END REPEAT;

    SELECT total AS sum_result;
END //

-- LOOP + LEAVE（类似break）
CREATE PROCEDURE LoopDemo(IN p_limit INT)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE total INT DEFAULT 0;

    add_loop: LOOP
        SET i = i + 1;
        IF i > p_limit THEN
            LEAVE add_loop;  -- 跳出循环
        END IF;
        SET total = total + i;
    END LOOP;

    SELECT total AS sum_result;
END //

-- ITERATE（类似continue）
CREATE PROCEDURE OddSum(IN p_limit INT)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE total INT DEFAULT 0;

    odd_loop: LOOP
        SET i = i + 1;
        IF i > p_limit THEN
            LEAVE odd_loop;
        END IF;
        IF i % 2 = 0 THEN
            ITERATE odd_loop;  -- 跳过偶数
        END IF;
        SET total = total + i;
    END LOOP;

    SELECT total AS odd_sum;
END //

DELIMITER ;
```

## 3. 游标

### 3.1 游标基本用法

```sql
DELIMITER //

CREATE PROCEDURE ProcessUsers()
BEGIN
    -- 声明变量
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_id INT;
    DECLARE v_username VARCHAR(50);
    DECLARE v_email VARCHAR(100);

    -- 声明游标
    DECLARE cur CURSOR FOR
        SELECT id, username, email FROM users WHERE status = 'active';

    -- 声明结束处理程序
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- 打开游标
    OPEN cur;

    -- 循环读取
    read_loop: LOOP
        FETCH cur INTO v_id, v_username, v_email;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        -- 处理每行数据
        INSERT INTO user_log (user_id, action, created_at)
        VALUES (v_id, CONCAT('Processed user: ', v_username), NOW());
    END LOOP;

    -- 关闭游标
    CLOSE cur;

    SELECT 'Processing complete' AS status;
END //

DELIMITER ;
```

### 3.2 游标与分组统计

```sql
DELIMITER //

CREATE PROCEDURE CategoryStats()
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_category VARCHAR(50);
    DECLARE v_count INT;
    DECLARE v_avg_price DECIMAL(10, 2);

    DECLARE cur CURSOR FOR
        SELECT category,
               COUNT(*) AS cnt,
               AVG(price) AS avg_price
        FROM products
        GROUP BY category;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- 创建临时结果表
    DROP TEMPORARY TABLE IF EXISTS temp_stats;
    CREATE TEMPORARY TABLE temp_stats (
        category VARCHAR(50),
        product_count INT,
        avg_price DECIMAL(10, 2)
    );

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_category, v_count, v_avg_price;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        INSERT INTO temp_stats VALUES (v_category, v_count, v_avg_price);
    END LOOP;

    CLOSE cur;

    SELECT * FROM temp_stats;
    DROP TEMPORARY TABLE IF EXISTS temp_stats;
END //

DELIMITER ;
```

## 4. 异常处理

### 4.1 Handler 类型

```sql
DELIMITER //

CREATE PROCEDURE SafeInsertUser(
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(100)
)
BEGIN
    -- 声明异常状态变量
    DECLARE v_error VARCHAR(255) DEFAULT '';

    -- CONTINUE HANDLER: 捕获异常后继续执行
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
        SELECT CONCAT('Error: ', v_error) AS error_message;
    END;

    INSERT INTO users (username, email, created_at)
    VALUES (p_username, p_email, NOW());

    IF v_error = '' THEN
        SELECT 'User inserted successfully' AS result;
    END IF;
END //

-- 特定错误码处理
CREATE PROCEDURE SafeTransfer(
    IN p_from_id INT,
    IN p_to_id INT,
    IN p_amount DECIMAL(10, 2)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 'Transfer failed, transaction rolled back' AS result;
    END;

    START TRANSACTION;

    UPDATE accounts SET balance = balance - p_amount WHERE id = p_from_id;
    UPDATE accounts SET balance = balance + p_amount WHERE id = p_to_id;

    COMMIT;
    SELECT 'Transfer completed' AS result;
END //

DELIMITER ;
```

## 5. 自定义函数

### 5.1 创建函数

```sql
DELIMITER //

-- 计算订单总金额
CREATE FUNCTION CalculateOrderTotal(p_order_id INT)
RETURNS DECIMAL(12, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(12, 2);

    SELECT SUM(oi.quantity * oi.unit_price)
    INTO v_total
    FROM order_items oi
    WHERE oi.order_id = p_order_id;

    RETURN IFNULL(v_total, 0);
END //

-- 格式化金额
CREATE FUNCTION FormatCurrency(
    p_amount DECIMAL(12, 2),
    p_currency VARCHAR(3)
)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    RETURN CONCAT(p_currency, ' ', FORMAT(p_amount, 2));
END //

-- 计算年龄
CREATE FUNCTION CalculateAge(p_birthdate DATE)
RETURNS INT
DETERMINISTIC
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_birthdate, CURDATE());
END //

DELIMITER ;

-- 使用自定义函数
SELECT CalculateOrderTotal(1001) AS total;
SELECT FormatCurrency(1234.56, 'CNY') AS formatted;
SELECT name, CalculateAge(birthdate) AS age FROM employees;
```

### 5.2 存储过程 vs 函数

| 特性     | 存储过程        | 函数           |
| :------- | :-------------- | :------------- |
| 返回值   | OUT参数或结果集 | 单个标量值     |
| SQL调用  | CALL            | SELECT中使用   |
| DML操作  | 允许            | 不允许（一般） |
| 事务控制 | 允许            | 不允许         |
| 结果集   | 可返回多个      | 只返回一个值   |

## 6. 常见问题与解决方案

### 6.1 DELIMITER 问题

```sql
-- 问题：在存储过程中使用分号导致提前结束
-- 解决方案：临时更改分隔符

DELIMITER //
CREATE PROCEDURE MyProc()
BEGIN
    -- 这里的分号不会结束CREATE PROCEDURE
    SELECT * FROM users;
END //
DELIMITER ;  -- 恢复默认分隔符
```

### 6.2 游标性能

```sql
-- 问题：大数据量游标处理慢
-- 解决方案：尽量用集合操作替代游标

-- 不推荐：逐行处理
-- 游标循环UPDATE...

-- 推荐：批量操作
UPDATE orders o
JOIN customers c ON o.customer_id = c.id
SET o.discount = CASE
    WHEN c.tier = 'gold' THEN 0.20
    WHEN c.tier = 'silver' THEN 0.10
    ELSE 0.00
END;
```

### 6.3 函数中不能执行DML

```sql
-- 问题：函数中执行INSERT/UPDATE/DELETE报错
-- 解决方案：改用存储过程

-- 函数只能做计算，不能修改数据
-- 如果需要修改数据，使用存储过程
```

## 7. 总结与最佳实践

### 7.1 选择指南

- **简单计算**：用自定义函数，可在SQL中直接调用
- **复杂业务逻辑**：用存储过程，支持事务和DML
- **批量数据处理**：优先用集合操作，游标作为最后手段

### 7.2 最佳实践

1. **命名规范**：存储过程用 `sp_` 前缀，函数用 `fn_` 前缀
2. **参数校验**：在存储过程开头验证输入参数
3. **错误处理**：始终包含异常处理逻辑
4. **避免游标**：能用集合操作就不用游标
5. **添加注释**：存储过程和函数应包含用途说明
6. **权限控制**：通过存储过程控制数据访问，不直接暴露表
