# MySQL 触发器与事件

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 触发器基础

**换行写法：创建插入后触发器**
`CREATE TRIGGER <触发器名> AFTER INSERT ON <表名> FOR EACH ROW BEGIN <触发体> END`
```sql
-- 插入后记录审计日志
DELIMITER //
CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_audit_log (user_id, action, action_time, details)
    VALUES (NEW.id, 'INSERT', NOW(), CONCAT('Created user: ', NEW.username));
END //
DELIMITER ;
```

**单行写法：删除触发器**
`DROP TRIGGER [IF EXISTS] <触发器名>`
```sql
-- 删除触发器
DROP TRIGGER IF EXISTS before_user_insert;
```

---

## NEW 与 OLD 关键字

**换行写法：NEW 关键字访问新数据**
`NEW.<列名>`
```sql
-- 更新前比较新旧值并记录变更
DELIMITER //
CREATE TRIGGER before_user_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.username != NEW.username THEN
        INSERT INTO user_change_log (user_id, field_name, old_value, new_value, changed_at)
        VALUES (OLD.id, 'username', OLD.username, NEW.username, NOW());
    END IF;
END //
DELIMITER ;
```

**换行写法：OLD 关键字访问旧数据**
`OLD.<列名>`
```sql
-- 删除后记录被删除的数据
DELIMITER //
CREATE TRIGGER after_user_delete
AFTER DELETE ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_delete_log (user_id, username, deleted_at)
    VALUES (OLD.id, OLD.username, NOW());
END //
DELIMITER ;
```

---

## BEFORE 触发器

**换行写法：BEFORE 触发器数据验证**
`SIGNAL SQLSTATE '<状态码>' SET MESSAGE_TEXT = '<错误信息>'`
```sql
-- 更新前验证薪资不能低于最低标准
DELIMITER //
CREATE TRIGGER before_salary_update
BEFORE UPDATE ON employees
FOR EACH ROW
BEGIN
    IF NEW.salary < 3000 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '薪资不能低于最低标准3000元';
    END IF;
END //
DELIMITER ;
```

**换行写法：BEFORE 触发器验证订单金额**
`SIGNAL SQLSTATE '<状态码>' SET MESSAGE_TEXT = '<错误信息>'`
```sql
-- 插入前验证订单金额必须大于 0
DELIMITER //
CREATE TRIGGER before_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.total_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '订单金额必须大于0';
    END IF;
END //
DELIMITER ;
```

**换行写法：BEFORE 触发器自动计算字段**
`SET NEW.<列名> = <值>`
```sql
-- 插入前自动计算商品总价
DELIMITER //
CREATE TRIGGER before_order_item_insert
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
    SET NEW.line_total = NEW.quantity * NEW.unit_price;
END //
DELIMITER ;
```

**换行写法：BEFORE 触发器自动更新时间**
`SET NEW.<列名> = NOW()`
```sql
-- 更新前自动维护修改时间
DELIMITER //
CREATE TRIGGER before_product_update
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END //
DELIMITER ;
```

**换行写法：BEFORE 触发器自动生成编号**
`SET NEW.<列名> = <生成表达式>`
```sql
-- 插入前自动生成订单编号
DELIMITER //
CREATE TRIGGER before_order_insert2
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_no IS NULL THEN
        SET NEW.order_no = CONCAT('ORD', DATE_FORMAT(NOW(), '%Y%m%d'),
            LPAD((SELECT COUNT(*) FROM orders WHERE order_date = CURDATE()) + 1, 4, '0'));
    END IF;
END //
DELIMITER ;
```

---

## AFTER 触发器

**换行写法：AFTER 插入审计**
`INSERT INTO <日志表> VALUES (NEW.<列名>...)`
```sql
-- 插入后记录产品审计日志
DELIMITER //
CREATE TRIGGER after_product_insert
AFTER INSERT ON products
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_data, action_time)
    VALUES ('products', NEW.id, 'INSERT',
            JSON_OBJECT('name', NEW.name, 'price', NEW.price, 'stock', NEW.stock),
            NOW());
END //
DELIMITER ;
```

**换行写法：AFTER 更新审计**
`INSERT INTO <日志表> VALUES (OLD.<列名>..., NEW.<列名>...)`
```sql
-- 更新后记录新旧数据审计日志
DELIMITER //
CREATE TRIGGER after_product_update
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, action_time)
    VALUES ('products', NEW.id, 'UPDATE',
            JSON_OBJECT('name', OLD.name, 'price', OLD.price, 'stock', OLD.stock),
            JSON_OBJECT('name', NEW.name, 'price', NEW.price, 'stock', NEW.stock),
            NOW());
END //
DELIMITER ;
```

**换行写法：AFTER 删除审计**
`INSERT INTO <日志表> VALUES (OLD.<列名>...)`
```sql
-- 删除后记录被删除数据审计日志
DELIMITER //
CREATE TRIGGER after_product_delete
AFTER DELETE ON products
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_data, action_time)
    VALUES ('products', OLD.id, 'DELETE',
            JSON_OBJECT('name', OLD.name, 'price', OLD.price, 'stock', OLD.stock),
            NOW());
END //
DELIMITER ;
```

**换行写法：AFTER 触发器扣减库存**
`UPDATE <关联表> SET <列名> = <列名> - NEW.<列名> WHERE <条件>`
```sql
-- 订单项插入后扣减商品库存
DELIMITER //
CREATE TRIGGER after_order_item_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
END //
DELIMITER ;
```

**换行写法：AFTER 触发器恢复库存**
`UPDATE <关联表> SET <列名> = <列名> + OLD.<列名> WHERE <条件>`
```sql
-- 订单项删除后恢复商品库存
DELIMITER //
CREATE TRIGGER after_order_item_delete
AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
    UPDATE products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;
END //
DELIMITER ;
```

**换行写法：AFTER 触发器更新统计**
`UPDATE <统计表> SET <列名> = <列名> + NEW.<列名> WHERE <条件>`
```sql
-- 订单插入后更新客户统计信息
DELIMITER //
CREATE TRIGGER after_order_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    UPDATE customers
    SET total_orders = total_orders + 1,
        total_spent = total_spent + NEW.total_amount,
        last_order_date = NEW.order_date
    WHERE id = NEW.customer_id;
END //
DELIMITER ;
```

---

## 事件调度器

**单行写法：查看调度器状态**
`SHOW VARIABLES LIKE 'event_scheduler'`
```sql
-- 检查事件调度器状态
SHOW VARIABLES LIKE 'event_scheduler';
```

**单行写法：启用调度器**
`SET GLOBAL event_scheduler = ON`
```sql
-- 启用事件调度器
SET GLOBAL event_scheduler = ON;
```

**换行写法：创建每日定时事件**
`CREATE EVENT [IF NOT EXISTS] <事件名> ON SCHEDULE EVERY 1 DAY [STARTS <时间>] DO BEGIN <事件体> END`
```sql
-- 每天凌晨清理过期会话
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_expired_sessions
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 2 HOUR
DO
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    INSERT INTO event_log (event_name, executed_at, rows_affected)
    VALUES ('cleanup_expired_sessions', NOW(), ROW_COUNT());
END //
DELIMITER ;
```

**换行写法：创建每小时定时事件**
`CREATE EVENT [IF NOT EXISTS] <事件名> ON SCHEDULE EVERY 1 HOUR DO BEGIN <事件体> END`
```sql
-- 每小时更新热门商品
DELIMITER //
CREATE EVENT IF NOT EXISTS update_hot_products
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    TRUNCATE TABLE hot_products;
    INSERT INTO hot_products (product_id, view_count, sales_count)
    SELECT p.id, p.view_count, COALESCE(SUM(oi.quantity), 0)
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY p.id
    ORDER BY p.view_count DESC, sales_count DESC
    LIMIT 100;
END //
DELIMITER ;
```

**换行写法：创建每月定时事件**
`CREATE EVENT [IF NOT EXISTS] <事件名> ON SCHEDULE EVERY 1 MONTH STARTS '<时间>' DO BEGIN <事件体> END`
```sql
-- 每月 1 号生成统计报表
DELIMITER //
CREATE EVENT IF NOT EXISTS monthly_report
ON SCHEDULE EVERY 1 MONTH
STARTS '2026-07-01 00:00:00'
DO
BEGIN
    INSERT INTO monthly_reports (report_month, total_orders, total_revenue, new_users)
    SELECT
        DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m'),
        (SELECT COUNT(*) FROM orders WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
         AND order_date < CURDATE()),
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders
         WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
         AND order_date < CURDATE()),
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
         AND created_at < CURDATE());
END //
DELIMITER ;
```

**换行写法：创建一次性事件**
`CREATE EVENT <事件名> ON SCHEDULE AT <时间> DO BEGIN <事件体> END`
```sql
-- 5 分钟后执行一次性任务
DELIMITER //
CREATE EVENT IF NOT EXISTS one_time_task
ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 5 MINUTE
DO
BEGIN
    UPDATE system_config SET value = 'initialized' WHERE key = 'status';
END //
DELIMITER ;
```

**单行写法：查看所有事件**
`SHOW EVENTS`
```sql
-- 查看所有事件
SHOW EVENTS;
```

**单行写法：查看事件详情**
`SHOW CREATE EVENT <事件名>`
```sql
-- 查看事件定义详情
SHOW CREATE EVENT cleanup_expired_sessions;
```

**单行写法：禁用事件**
`ALTER EVENT <事件名> DISABLE`
```sql
-- 禁用指定事件
ALTER EVENT cleanup_expired_sessions DISABLE;
```

**单行写法：启用事件**
`ALTER EVENT <事件名> ENABLE`
```sql
-- 启用指定事件
ALTER EVENT cleanup_expired_sessions ENABLE;
```

**单行写法：修改事件调度周期**
`ALTER EVENT <事件名> ON SCHEDULE EVERY <间隔>`
```sql
-- 修改事件的调度周期
ALTER EVENT cleanup_expired_sessions
ON SCHEDULE EVERY 2 DAY;
```

**单行写法：删除事件**
`DROP EVENT [IF EXISTS] <事件名>`
```sql
-- 删除事件
DROP EVENT IF EXISTS one_time_task;
```

**换行写法：查询事件信息**
`SELECT <列名> FROM information_schema.events WHERE <条件>`
```sql
-- 从 information_schema 查询事件信息
SELECT event_name, status, interval_value, interval_field, last_executed
FROM information_schema.events
WHERE event_schema = 'mydb';
```

---

## 条件触发器

**换行写法：使用标志变量控制触发器**
`IF @<变量名> IS NULL OR @<变量名> = 0 THEN <逻辑> END IF`
```sql
-- 批量操作时通过标志变量跳过触发器逻辑
DELIMITER //
CREATE TRIGGER conditional_trigger
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
    IF @skip_trigger IS NULL OR @skip_trigger = 0 THEN
        SET NEW.updated_at = NOW();
    END IF;
END //
DELIMITER ;
```

**换行写法：批量操作时设置标志变量**
`SET @<变量名> = <值>`
```sql
-- 批量更新时设置标志变量跳过触发器
SET @skip_trigger = 1;
UPDATE products SET price = price * 1.1;
SET @skip_trigger = 0;
```
