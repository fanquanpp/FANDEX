---
order: 68
title: 触发器与事件触发器
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL触发器与事件触发器：行级触发器、语句级触发器、DDL事件触发器与触发器函数
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/地理空间对象
  - postgresql/存储过程与函数
  - postgresql/扩展模块
  - postgresql/FDW外部数据包装器
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 触发器概述

| 类型       | 触发时机 | 级别    | 用途           |
| ---------- | -------- | ------- | -------------- |
| BEFORE     | 操作前   | 行/语句 | 验证、修改数据 |
| AFTER      | 操作后   | 行/语句 | 审计、同步     |
| INSTEAD OF | 替代操作 | 行      | 可更新视图     |

## 2. 行级触发器

```sql
-- 触发器函数
CREATE OR REPLACE FUNCTION update_modified_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trg_employees_modified
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_modified_at();
```

## 3. 审计触发器

```sql
CREATE OR REPLACE FUNCTION audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_table (table_name, operation, new_data, changed_at)
        VALUES (TG_TABLE_NAME, 'INSERT', to_jsonb(NEW), NOW());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_table (table_name, operation, old_data, new_data, changed_at)
        VALUES (TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NOW());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_table (table_name, operation, old_data, changed_at)
        VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), NOW());
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_audit
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION audit_log();
```

## 4. 事件触发器

```sql
-- DDL 事件触发器
CREATE OR REPLACE FUNCTION prevent_drop_table()
RETURNS EVENT_TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '不允许删除表！';
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER trg_prevent_drop
ON sql_drop
EXECUTE FUNCTION prevent_drop_table();

-- DDL 完成后触发
CREATE OR REPLACE FUNCTION log_ddl()
RETURNS EVENT_TRIGGER AS $$
BEGIN
    INSERT INTO ddl_log (event, object_type, object_name, timestamp)
    VALUES (tg_tag, tg_event, tg_objectid, NOW());
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER trg_log_ddl
ON ddl_command_end
EXECUTE FUNCTION log_ddl();
```
