# PostgreSQL 触发器与事件触发器

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 触发器基础

**换行写法：创建 BEFORE 触发器函数**
`CREATE FUNCTION <函数名>() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN <逻辑> RETURN NEW END $$`
```sql
-- 创建插入前触发器函数
CREATE FUNCTION before_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.created_at := NOW();
    NEW.updated_at := NOW();
    RETURN NEW;
END $$;
```

**换行写法：创建 BEFORE 触发器**
`CREATE TRIGGER <触发器名> BEFORE INSERT ON <表名> FOR EACH ROW EXECUTE FUNCTION <函数名>()`
```sql
-- 绑定插入前触发器
CREATE TRIGGER trg_before_user_insert
BEFORE INSERT ON users
FOR EACH ROW EXECUTE FUNCTION before_user_insert();
```

**换行写法：创建 AFTER 触发器**
`CREATE TRIGGER <触发器名> AFTER INSERT ON <表名> FOR EACH ROW EXECUTE FUNCTION <函数名>()`
```sql
-- 绑定插入后触发器
CREATE TRIGGER trg_after_user_insert
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION after_user_insert();
```

**单行写法：删除触发器**
`DROP TRIGGER [IF EXISTS] <触发器名> ON <表名>`
```sql
-- 删除触发器
DROP TRIGGER IF EXISTS trg_before_user_insert ON users;
```

**单行写法：禁用触发器**
`ALTER TABLE <表名> DISABLE TRIGGER <触发器名>`
```sql
-- 禁用指定触发器
ALTER TABLE users DISABLE TRIGGER trg_before_user_insert;
```

**单行写法：启用触发器**
`ALTER TABLE <表名> ENABLE TRIGGER <触发器名>`
```sql
-- 启用指定触发器
ALTER TABLE users ENABLE TRIGGER trg_before_user_insert;
```

---

## BEFORE 触发器

**换行写法：BEFORE INSERT 数据验证**
`IF <条件> THEN RAISE EXCEPTION '<错误信息>' END IF`
```sql
-- 插入前验证薪资不能低于最低标准
CREATE FUNCTION validate_salary()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.salary < 3000 THEN
        RAISE EXCEPTION '薪资不能低于最低标准3000元';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_salary
BEFORE INSERT OR UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION validate_salary();
```

**换行写法：BEFORE UPDATE 自动维护时间**
`NEW.<列名> := NOW()`
```sql
-- 更新前自动维护修改时间
CREATE FUNCTION update_modified_time()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END $$;

CREATE TRIGGER trg_update_modified_time
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_modified_time();
```

**换行写法：BEFORE INSERT 自动生成编号**
`NEW.<列名> := <生成表达式>`
```sql
-- 插入前自动生成订单编号
CREATE FUNCTION generate_order_no()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.order_no IS NULL THEN
        NEW.order_no := 'ORD' || TO_CHAR(NOW(), 'YYYYMMDD') ||
            LPAD((SELECT COUNT(*) + 1 FROM orders WHERE order_date = CURRENT_DATE)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_generate_order_no
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION generate_order_no();
```

---

## AFTER 触发器

**换行写法：AFTER INSERT 审计日志**
`INSERT INTO <日志表> VALUES (NEW.<列名>...)`
```sql
-- 插入后记录审计日志
CREATE FUNCTION log_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO user_audit_log (user_id, action, action_time, details)
    VALUES (NEW.id, 'INSERT', NOW(), 'Created user: ' || NEW.username);
    RETURN NEW;
END $$;

CREATE TRIGGER trg_log_user_insert
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION log_user_insert();
```

**换行写法：AFTER UPDATE 记录变更**
`IF OLD.<列名> IS DISTINCT FROM NEW.<列名> THEN INSERT INTO ... END IF`
```sql
-- 更新后记录字段变更
CREATE FUNCTION log_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.username IS DISTINCT FROM NEW.username THEN
        INSERT INTO user_change_log (user_id, field_name, old_value, new_value, changed_at)
        VALUES (OLD.id, 'username', OLD.username, NEW.username, NOW());
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_log_user_update
AFTER UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION log_user_update();
```

**换行写法：AFTER DELETE 记录删除**
`INSERT INTO <日志表> VALUES (OLD.<列名>...)`
```sql
-- 删除后记录被删除的数据
CREATE FUNCTION log_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO user_delete_log (user_id, username, deleted_at)
    VALUES (OLD.id, OLD.username, NOW());
    RETURN OLD;
END $$;

CREATE TRIGGER trg_log_user_delete
AFTER DELETE ON users
FOR EACH ROW EXECUTE FUNCTION log_user_delete();
```

**换行写法：AFTER INSERT 扣减库存**
`UPDATE <关联表> SET <列名> = <列名> - NEW.<列名> WHERE <条件>`
```sql
-- 订单项插入后扣减商品库存
CREATE FUNCTION decrease_stock()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_decrease_stock
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION decrease_stock();
```

**换行写法：AFTER DELETE 恢复库存**
`UPDATE <关联表> SET <列名> = <列名> + OLD.<列名> WHERE <条件>`
```sql
-- 订单项删除后恢复商品库存
CREATE FUNCTION restore_stock()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;
    RETURN OLD;
END $$;

CREATE TRIGGER trg_restore_stock
AFTER DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION restore_stock();
```

---

## INSTEAD OF 触发器

**换行写法：INSTEAD OF 触发器用于视图**
`CREATE TRIGGER <触发器名> INSTEAD OF INSERT ON <视图名> FOR EACH ROW EXECUTE FUNCTION <函数名>()`
```sql
-- 视图插入时实际写入基础表
CREATE FUNCTION instead_of_insert_user_view()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO users (username, email) VALUES (NEW.username, NEW.email);
    RETURN NEW;
END $$;

CREATE TRIGGER trg_instead_of_insert
INSTEAD OF INSERT ON user_view
FOR EACH ROW EXECUTE FUNCTION instead_of_insert_user_view();
```

---

## 事件触发器

**换行写法：创建事件触发器函数**
`CREATE FUNCTION <函数名>() RETURNS EVENT_TRIGGER LANGUAGE plpgsql AS $$ BEGIN <逻辑> END $$`
```sql
-- 创建 DDL 事件触发器函数
CREATE FUNCTION log_ddl_events()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO ddl_log (event_type, tag, user_name, action_time)
    VALUES (tg_event, tg_tag, current_user, NOW());
END $$;
```

**换行写法：创建 DDL 事件触发器**
`CREATE EVENT TRIGGER <触发器名> ON ddl_command_end EXECUTE FUNCTION <函数名>()`
```sql
-- 绑定 DDL 命令结束事件
CREATE EVENT TRIGGER trg_log_ddl
ON ddl_command_end
EXECUTE FUNCTION log_ddl_events();
```

**换行写法：过滤特定 TAG 的事件触发器**
`CREATE EVENT TRIGGER <触发器名> ON ddl_command_end WHEN tag IN ('<标签>') EXECUTE FUNCTION <函数名>()`
```sql
-- 仅对 CREATE TABLE 和 DROP TABLE 触发
CREATE EVENT TRIGGER trg_log_table_changes
ON ddl_command_end
WHEN tag IN ('CREATE TABLE', 'DROP TABLE', 'ALTER TABLE')
EXECUTE FUNCTION log_ddl_events();
```

**单行写法：删除事件触发器**
`DROP EVENT TRIGGER [IF EXISTS] <触发器名>`
```sql
-- 删除事件触发器
DROP EVENT TRIGGER IF EXISTS trg_log_ddl;
```

---

## 触发器管理

**单行写法：查看表触发器**
`SELECT <列名> FROM information_schema.triggers WHERE <条件>`
```sql
-- 查看表的触发器信息
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users';
```

**单行写法：查看触发器函数**
`SELECT <列名> FROM pg_proc WHERE <条件>`
```sql
-- 查看触发器函数定义
SELECT proname, prosrc FROM pg_proc WHERE proname = 'before_user_insert';
```

**单行写法：重命名触发器**
`ALTER TRIGGER <触发器名> ON <表名> RENAME TO <新名>`
```sql
-- 重命名触发器
ALTER TRIGGER trg_before_user_insert ON users RENAME TO trg_before_insert;
```
