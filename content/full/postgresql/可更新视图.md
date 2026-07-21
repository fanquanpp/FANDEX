---
order: 84
title: 可更新视图
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: 'PostgreSQL可更新视图：自动可更新条件、INSTEAD OF触发器、WITH CHECK OPTION'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/序列与自增列
  - postgresql/生成列
  - postgresql/并行查询
  - postgresql/逻辑复制与物理复制对比
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 自动可更新视图

PostgreSQL 自动使简单视图可更新：

```sql
CREATE VIEW active_employees AS
SELECT id, name, salary, dept_id
FROM employees
WHERE status = 'active';

-- 可以直接 INSERT/UPDATE/DELETE
INSERT INTO active_employees (name, salary, dept_id)
VALUES ('Alice', 50000, 1);

UPDATE active_employees SET salary = 55000 WHERE name = 'Alice';

DELETE FROM active_employees WHERE name = 'Alice';
```

### 1.1 自动可更新条件

- 从单表选择
- 不包含聚合、窗口函数、GROUP BY、HAVING、DISTINCT
- 不包含 UNION/INTERSECT/EXCEPT
- SELECT 列直接引用表列（无表达式）

## 2. WITH CHECK OPTION

```sql
-- 确保通过视图插入/更新的行满足视图条件
CREATE VIEW active_employees AS
SELECT id, name, salary, dept_id
FROM employees
WHERE status = 'active'
WITH CHECK OPTION;

-- 以下操作会被拒绝
INSERT INTO active_employees (name, salary, dept_id, status)
VALUES ('Bob', 50000, 1, 'inactive');
-- ERROR: new row violates check option for view "active_employees"
```

## 3. INSTEAD OF 触发器

```sql
-- 复杂视图需要 INSTEAD OF 触发器
CREATE VIEW employee_details AS
SELECT e.id, e.name, e.salary, d.dept_name
FROM employees e JOIN departments d ON e.dept_id = d.id;

CREATE OR REPLACE FUNCTION update_employee_details()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE employees SET name = NEW.name, salary = NEW.salary
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_employee_details
INSTEAD OF UPDATE ON employee_details
FOR EACH ROW EXECUTE FUNCTION update_employee_details();
```
