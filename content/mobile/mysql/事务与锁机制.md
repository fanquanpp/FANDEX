# MySQL 事务与锁机制

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 事务控制

**单行写法：开启事务**
`START TRANSACTION` / `BEGIN`
```sql
-- 开启事务
START TRANSACTION;
```

**换行写法：提交事务**
`COMMIT`
```sql
-- 提交事务并持久化变更
START TRANSACTION;
INSERT INTO users (username, email) VALUES ('张三', 'zhangsan@example.com');
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;
COMMIT;
```

**单行写法：回滚事务**
`ROLLBACK`
```sql
-- 回滚事务撤销变更
ROLLBACK;
```

**换行写法：使用保存点**
`SAVEPOINT <保存点名>` / `ROLLBACK TO <保存点名>`
```sql
-- 使用保存点部分回滚
START TRANSACTION;
INSERT INTO users (username) VALUES ('张三');
SAVEPOINT sp1;
INSERT INTO users (username) VALUES ('李四');
ROLLBACK TO sp1;
COMMIT;
```

**单行写法：释放保存点**
`RELEASE SAVEPOINT <保存点名>`
```sql
-- 释放指定保存点
RELEASE SAVEPOINT sp1;
```

---

## 隔离级别

**单行写法：查看隔离级别**
`SELECT @@transaction_isolation`
```sql
-- 查看当前事务隔离级别
SELECT @@transaction_isolation;
```

**单行写法：查看旧变量名隔离级别**
`SELECT @@tx_isolation`
```sql
-- 查看旧版本隔离级别变量
SELECT @@tx_isolation;
```

**单行写法：设置会话隔离级别**
`SET SESSION TRANSACTION ISOLATION LEVEL <级别>`
```sql
-- 设置会话隔离级别为读已提交
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

**单行写法：设置全局隔离级别**
`SET GLOBAL TRANSACTION ISOLATION LEVEL <级别>`
```sql
-- 设置全局隔离级别为可序列化
SET GLOBAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

**单行写法：通过变量设置全局隔离级别**
`SET GLOBAL transaction_isolation = '<级别>'`
```sql
-- 通过变量设置全局隔离级别
SET GLOBAL transaction_isolation = 'READ-COMMITTED';
```

**单行写法：通过变量设置会话隔离级别**
`SET SESSION transaction_isolation = '<级别>'`
```sql
-- 通过变量设置会话隔离级别
SET SESSION transaction_isolation = 'REPEATABLE-READ';
```

---

## 锁机制

**单行写法：加共享锁**
`SELECT ... LOCK IN SHARE MODE`
```sql
-- 查询时加共享锁
SELECT * FROM users WHERE id = 1 LOCK IN SHARE MODE;
```

**单行写法：加排他锁**
`SELECT ... FOR UPDATE`
```sql
-- 查询时加排他锁
SELECT * FROM users WHERE id = 1 FOR UPDATE;
```

**单行写法：INSERT 自动加排他锁**
`INSERT INTO <表名> (<列名>) VALUES (<值>)`
```sql
-- 插入操作自动加排他锁
INSERT INTO users (name) VALUES ('John');
```

**单行写法：UPDATE 自动加排他锁**
`UPDATE <表名> SET <列名> = <值> WHERE <条件>`
```sql
-- 更新操作自动加排他锁
UPDATE users SET name = 'John' WHERE id = 1;
```

**单行写法：DELETE 自动加排他锁**
`DELETE FROM <表名> WHERE <条件>`
```sql
-- 删除操作自动加排他锁
DELETE FROM users WHERE id = 1;
```

---

## 锁等待与超时

**单行写法：查看锁等待超时**
`SELECT @@innodb_lock_wait_timeout`
```sql
-- 查看锁等待超时时间
SELECT @@innodb_lock_wait_timeout;
```

**单行写法：设置锁等待超时**
`SET SESSION innodb_lock_wait_timeout = <秒数>`
```sql
-- 设置锁等待超时为 30 秒
SET SESSION innodb_lock_wait_timeout = 30;
```

---

## 死锁检测

**单行写法：查看 InnoDB 状态**
`SHOW ENGINE INNODB STATUS`
```sql
-- 查看死锁日志
SHOW ENGINE INNODB STATUS;
```

**单行写法：开启死锁检测**
`SET GLOBAL innodb_deadlock_detect = ON`
```sql
-- 开启死锁检测
SET GLOBAL innodb_deadlock_detect = ON;
```

---

## 事务实战

**换行写法：转账事务**
`START TRANSACTION; <DML>; COMMIT;`
```sql
-- 转账事务保证原子性
START TRANSACTION;
UPDATE accounts SET balance = balance - 1000 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE user_id = 2;
COMMIT;
```

**换行写法：条件提交**
`IF <条件> THEN COMMIT; ELSE ROLLBACK; END IF`
```sql
-- 检查余额后决定提交或回滚
START TRANSACTION;
UPDATE accounts SET balance = balance - 1000 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE user_id = 2;

IF (SELECT balance FROM accounts WHERE user_id = 1) < 0 THEN
  ROLLBACK;
ELSE
  COMMIT;
END IF;
```

**换行写法：订单创建事务**
`START TRANSACTION; <DML>; SET @变量; <DML>; COMMIT;`
```sql
-- 订单创建事务包含订单和订单项
START TRANSACTION;
INSERT INTO orders (user_id, total_amount) VALUES (1, 500);
SET @order_id = LAST_INSERT_ID();
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
  (@order_id, 101, 2, 200),
  (@order_id, 102, 1, 100);
UPDATE products SET stock = stock - 3 WHERE id IN (101, 102);
COMMIT;
```

**换行写法：悲观锁查询**
`SELECT ... FOR UPDATE`
```sql
-- 先锁定再更新
SELECT * FROM users WHERE id = 1 FOR UPDATE;
UPDATE users SET status = 0 WHERE last_login_time < '2023-01-01';
```

**换行写法：批量删除事务**
`START TRANSACTION; <DML>; COMMIT;`
```sql
-- 批量更新避免长事务
START TRANSACTION;
UPDATE users SET status = 0 WHERE last_login_time < '2023-01-01';
UPDATE stats SET inactive_users = inactive_users + 1;
COMMIT;
```

**单行写法：分批删除**
`DELETE FROM <表名> WHERE <条件> LIMIT <N>`
```sql
-- 分批删除避免锁表
DELETE FROM logs WHERE created_at < '2023-01-01' LIMIT 1000;
```
