# MySQL 存储过程与函数

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 存储过程基础

**换行写法：创建无参存储过程**
`CREATE PROCEDURE <过程名>() BEGIN <过程体> END`
```sql
-- 创建查询所有用户的存储过程
DELIMITER //
CREATE PROCEDURE GetAllUsers()
BEGIN
    SELECT id, username, email, created_at
    FROM users
    ORDER BY created_at DESC;
END //
DELIMITER ;
```

**单行写法：调用存储过程**
`CALL <过程名>([<参数>...])`
```sql
-- 调用存储过程
CALL GetAllUsers();
```

**单行写法：删除存储过程**
`DROP PROCEDURE [IF EXISTS] <过程名>`
```sql
-- 删除存储过程
DROP PROCEDURE IF EXISTS GetAllUsers;
```

**单行写法：查看存储过程定义**
`SHOW CREATE PROCEDURE <过程名>`
```sql
-- 查看存储过程定义
SHOW CREATE PROCEDURE GetAllUsers;
```

---

## 参数类型

**换行写法：IN 参数**
`IN <参数名> <类型>`
```sql
-- 创建带 IN 输入参数的存储过程
DELIMITER //
CREATE PROCEDURE GetUserById(IN p_user_id INT)
BEGIN
    SELECT id, username, email
    FROM users
    WHERE id = p_user_id;
END //
DELIMITER ;
```

**换行写法：OUT 参数**
`OUT <参数名> <类型>`
```sql
-- 创建带 OUT 输出参数的存储过程
DELIMITER //
CREATE PROCEDURE GetUserCount(OUT p_count INT)
BEGIN
    SELECT COUNT(*) INTO p_count FROM users;
END //
DELIMITER ;
```

**换行写法：INOUT 参数**
`INOUT <参数名> <类型>`
```sql
-- 创建带 INOUT 输入输出参数的存储过程
DELIMITER //
CREATE PROCEDURE DoubleValue(INOUT p_value INT)
BEGIN
    SET p_value = p_value * 2;
END //
DELIMITER ;
```

---

## 变量声明

**单行写法：声明局部变量**
`DECLARE <变量名> <类型> [DEFAULT <默认值>]`
```sql
-- 声明带默认值的局部变量
DECLARE v_name VARCHAR(100) DEFAULT 'Unknown';
```

**单行写法：SELECT INTO 赋值**
`SELECT <列名> INTO <变量名> FROM <表名> WHERE <条件>`
```sql
-- 查询结果赋值给变量
SELECT COUNT(*) INTO v_count FROM users;
```

**单行写法：SET 变量赋值**
`SET <变量名> = <值>`
```sql
-- 为局部变量赋值
SET v_total = v_count * 9.99;
```

**单行写法：设置用户变量**
`SET @<变量名> = <值>`
```sql
-- 设置会话级别的用户变量
SET @user_var = 'Hello';
```

---

## 条件判断

**换行写法：IF 多分支**
`IF <条件> THEN <语句> [ELSEIF <条件> THEN <语句>] [ELSE <语句>] END IF`
```sql
-- 根据金额计算折扣率
DELIMITER //
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
DELIMITER ;
```

**换行写法：CASE 多分支**
`CASE <表达式> WHEN <值> THEN <语句> [WHEN ...] [ELSE <语句>] END CASE`
```sql
-- 根据地区计算运费
DELIMITER //
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

---

## 循环

**换行写法：WHILE 循环**
`[<标签>:] WHILE <条件> DO <语句> END WHILE [<标签>]`
```sql
-- WHILE 循环生成数字串
DELIMITER //
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
DELIMITER ;
```

**换行写法：REPEAT 循环**
`[<标签>:] REPEAT <语句> UNTIL <条件> END REPEAT [<标签>]`
```sql
-- REPEAT 循环至少执行一次
DELIMITER //
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
DELIMITER ;
```

**换行写法：LOOP 循环**
`[<标签>:] LOOP <语句> END LOOP [<标签>]`
```sql
-- LOOP 配合 LEAVE 跳出循环
DELIMITER //
CREATE PROCEDURE LoopDemo(IN p_limit INT)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE total INT DEFAULT 0;

    add_loop: LOOP
        SET i = i + 1;
        IF i > p_limit THEN
            LEAVE add_loop;
        END IF;
        SET total = total + i;
    END LOOP;

    SELECT total AS sum_result;
END //
DELIMITER ;
```

**单行写法：ITERATE 跳过当前循环**
`ITERATE <标签>`
```sql
-- ITERATE 跳过偶数只累加奇数
DELIMITER //
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
            ITERATE odd_loop;
        END IF;
        SET total = total + i;
    END LOOP;

    SELECT total AS odd_sum;
END //
DELIMITER ;
```

---

## 游标

**换行写法：游标基本遍历**
`DECLARE <游标名> CURSOR FOR <SELECT 语句>`
```sql
-- 游标遍历用户并记录日志
DELIMITER //
CREATE PROCEDURE ProcessUsers()
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_id INT;
    DECLARE v_username VARCHAR(50);
    DECLARE v_email VARCHAR(100);

    DECLARE cur CURSOR FOR
        SELECT id, username, email FROM users WHERE status = 'active';

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_id, v_username, v_email;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        INSERT INTO user_log (user_id, action, created_at)
        VALUES (v_id, CONCAT('Processed user: ', v_username), NOW());
    END LOOP;

    CLOSE cur;

    SELECT 'Processing complete' AS status;
END //
DELIMITER ;
```

**换行写法：游标配合临时表**
`DECLARE <游标名> CURSOR FOR <聚合查询>`
```sql
-- 游标遍历聚合结果写入临时表
DELIMITER //
CREATE PROCEDURE CategoryStats()
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_category VARCHAR(50);
    DECLARE v_count INT;
    DECLARE v_avg_price DECIMAL(10, 2);

    DECLARE cur CURSOR FOR
        SELECT category, COUNT(*) AS cnt, AVG(price) AS avg_price
        FROM products
        GROUP BY category;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

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

---

## 异常处理

**换行写法：CONTINUE HANDLER**
`DECLARE CONTINUE HANDLER FOR <异常> BEGIN <处理> END`
```sql
-- 捕获异常后继续执行
DELIMITER //
CREATE PROCEDURE SafeInsertUser(
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(100)
)
BEGIN
    DECLARE v_error VARCHAR(255) DEFAULT '';

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
DELIMITER ;
```

**换行写法：EXIT HANDLER**
`DECLARE EXIT HANDLER FOR <异常> BEGIN <处理> END`
```sql
-- 捕获异常后退出并回滚
DELIMITER //
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

---

## 自定义函数

**换行写法：创建函数**
`CREATE FUNCTION <函数名>([<参数>]) RETURNS <返回类型> [DETERMINISTIC] BEGIN <函数体> RETURN <值> END`
```sql
-- 计算订单总金额的函数
DELIMITER //
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
DELIMITER ;
```

**换行写法：创建格式化函数**
`CREATE FUNCTION <函数名>(<参数>) RETURNS <返回类型> BEGIN RETURN <表达式> END`
```sql
-- 格式化金额显示的函数
DELIMITER //
CREATE FUNCTION FormatCurrency(
    p_amount DECIMAL(12, 2),
    p_currency VARCHAR(3)
)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    RETURN CONCAT(p_currency, ' ', FORMAT(p_amount, 2));
END //
DELIMITER ;
```

**单行写法：调用函数**
`SELECT <函数名>(<参数>)`
```sql
-- 使用自定义函数查询
SELECT CalculateOrderTotal(1001) AS total;
```

**单行写法：在查询中使用函数**
`SELECT <列名>, <函数名>(<列名>) AS <别名> FROM <表名>`
```sql
-- 在 SELECT 中使用函数计算年龄
SELECT name, CalculateAge(birthdate) AS age FROM employees;
```

---

## DELIMITER 使用

**单行写法：修改分隔符**
`DELIMITER <分隔符>`
```sql
-- 临时更改语句分隔符
DELIMITER //
```

**换行写法：DELIMITER 完整用法**
`DELIMITER <分隔符> <创建语句> <分隔符> DELIMITER ;`
```sql
-- 使用 DELIMITER 创建存储过程
DELIMITER //
CREATE PROCEDURE MyProc()
BEGIN
    SELECT * FROM users;
END //
DELIMITER ;
```
