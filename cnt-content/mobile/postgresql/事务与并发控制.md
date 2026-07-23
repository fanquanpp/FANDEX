# PostgreSQL 事务与并发控制

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 事务控制

**单行写法：开启事务**
`BEGIN` / `BEGIN TRANSACTION`
```sql
-- 开启事务
BEGIN;
```

**换行写法：提交事务**
`COMMIT` / `END`
```sql
-- 提交事务并持久化变更
BEGIN;
INSERT INTO users (username, email) VALUES ('张三', 'zhangsan@example.com');
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
COMMIT;
```

**单行写法：回滚事务**
`ROLLBACK` / `ABORT`
```sql
-- 回滚事务撤销变更
ROLLBACK;
```

**换行写法：使用保存点**
`SAVEPOINT <保存点名>` / `ROLLBACK TO <保存点名>`
```sql
-- 使用保存点部分回滚
BEGIN;
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

**单行写法：查看当前隔离级别**
`SHOW transaction_isolation`
```sql
-- 查看当前事务隔离级别
SHOW transaction_isolation;
```

**换行写法：设置会话隔离级别**
`SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL <级别>`
```sql
-- 设置会话隔离级别为读已提交
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

**换行写法：设置事务隔离级别**
`SET TRANSACTION ISOLATION LEVEL <级别>`
```sql
-- 设置当前事务隔离级别为可序列化
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM users;
COMMIT;
```

**单行写法：设置默认隔离级别**
`ALTER DATABASE <库名> SET default_transaction_isolation TO '<级别>'`
```sql
-- 设置数据库默认隔离级别
ALTER DATABASE mydb SET default_transaction_isolation TO 'read committed';
```

---

## 锁机制

**单行写法：加共享锁**
`SELECT ... FOR SHARE`
```sql
-- 查询时加共享锁
SELECT * FROM users WHERE id = 1 FOR SHARE;
```

**单行写法：加排他锁**
`SELECT ... FOR UPDATE`
```sql
-- 查询时加排他锁
SELECT * FROM users WHERE id = 1 FOR UPDATE;
```

**单行写法：加无等待排他锁**
`SELECT ... FOR UPDATE NOWAIT`
```sql
-- 查询时加排他锁不等待
SELECT * FROM users WHERE id = 1 FOR UPDATE NOWAIT;
```

**换行写法：加跳过锁定排他锁**
`SELECT ... FOR UPDATE SKIP LOCKED`
```sql
-- 查询时加排他锁并跳过已锁定行
SELECT * FROM job_queue WHERE status = 'pending'
    FOR UPDATE SKIP LOCKED LIMIT 10;
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
`SHOW lock_timeout`
```sql
-- 查看锁等待超时时间
SHOW lock_timeout;
```

**单行写法：设置锁等待超时**
`SET lock_timeout = '<时间>'`
```sql
-- 设置锁等待超时为 5 秒
SET lock_timeout = '5s';
```

**单行写法：查看死锁超时**
`SHOW deadlock_timeout`
```sql
-- 查看死锁检测超时
SHOW deadlock_timeout;
```

**单行写法：设置死锁超时**
`SET deadlock_timeout = '<时间>'`
```sql
-- 设置死锁检测超时为 100 毫秒
SET deadlock_timeout = '100ms';
```

---

## 死锁检测

**单行写法：查看锁信息**
`SELECT <列名> FROM pg_locks WHERE <条件>`
```sql
-- 查看当前锁信息
SELECT locktype, relation::regclass, mode, pid
FROM pg_locks WHERE granted = false;
```

**单行写法：查看阻塞进程**
`SELECT <列名> FROM pg_stat_activity WHERE <条件>`
```sql
-- 查看阻塞的进程
SELECT pid, usename, query, state, wait_event
FROM pg_stat_activity WHERE state = 'active';
```

**单行写法：终止进程**
`SELECT pg_terminate_backend(<PID>)`
```sql
-- 终止指定进程
SELECT pg_terminate_backend(12345);
```

**单行写法：取消进程查询**
`SELECT pg_cancel_backend(<PID>)`
```sql
-- 取消指定进程的查询
SELECT pg_cancel_backend(12345);
```

---

## 事务实战

**换行写法：转账事务**
`BEGIN; <DML>; COMMIT;`
```sql
-- 转账事务保证原子性
BEGIN;
UPDATE accounts SET balance = balance - 1000 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE user_id = 2;
COMMIT;
```

**换行写法：条件提交**
`IF <条件> THEN COMMIT; ELSE ROLLBACK; END IF`
```sql
-- 检查余额后决定提交或回滚
BEGIN;
UPDATE accounts SET balance = balance - 1000 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE user_id = 2;
DO $$
BEGIN
    IF (SELECT balance FROM accounts WHERE user_id = 1) < 0 THEN
        RAISE EXCEPTION '余额不足';
    END IF;
END $$;
COMMIT;
```

**换行写法：订单创建事务**
`BEGIN; <DML>; COMMIT;`
```sql
-- 订单创建事务包含订单和订单项
BEGIN;
INSERT INTO orders (user_id, total_amount) VALUES (1, 500) RETURNING id;
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
    (1, 101, 2, 200),
    (1, 102, 1, 100);
UPDATE products SET stock = stock - 3 WHERE id IN (101, 102);
COMMIT;
```

**换行写法：悲观锁查询**
`SELECT ... FOR UPDATE`
```sql
-- 先锁定再更新
BEGIN;
SELECT * FROM users WHERE id = 1 FOR UPDATE;
UPDATE users SET status = 0 WHERE last_login_time < '2023-01-01';
COMMIT;
```

**换行写法：批量删除事务**
`BEGIN; <DML>; COMMIT;`
```sql
-- 批量更新避免长事务
BEGIN;
UPDATE users SET status = 0 WHERE last_login_time < '2023-01-01';
UPDATE stats SET inactive_users = inactive_users + 1;
COMMIT;
```

**换行写法：分批删除**
`DELETE FROM <表名> WHERE id IN (SELECT id FROM <表名> WHERE <条件> LIMIT <N>)`
```sql
-- 分批删除避免锁表
DELETE FROM logs WHERE id IN (
    SELECT id FROM logs WHERE created_at < '2023-01-01' LIMIT 1000
);
```

---

## 并发问题

**换行写法：使用 SELECT FOR UPDATE 防止丢失更新**
`SELECT ... FOR UPDATE`
```sql
-- 先锁定行再更新防止丢失更新
BEGIN;
SELECT balance FROM accounts WHERE user_id = 1 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
COMMIT;
```

**换行写法：使用乐观锁防止丢失更新**
`UPDATE <表名> SET <列名> = <值>, version = version + 1 WHERE id = <值> AND version = <版本>`
```sql
-- 使用版本号实现乐观锁
UPDATE products SET stock = stock - 1, version = version + 1
WHERE id = 1 AND version = 10;
```

**换行写法：使用 SERIALIZABLE 防止幻读**
`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`
```sql
-- 使用可序列化隔离级别防止幻读
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT COUNT(*) FROM orders WHERE user_id = 1;
INSERT INTO orders (user_id, amount) VALUES (1, 100);
COMMIT;
```
