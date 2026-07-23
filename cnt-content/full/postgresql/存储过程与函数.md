---
order: 67
title: 存储过程与函数
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL存储过程与函数：PL/pgSQL、PL/Python、PL/Perl与过程语言扩展
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/全文检索
  - postgresql/地理空间对象
  - postgresql/触发器与事件触发器
  - postgresql/扩展模块
prerequisites:
  - postgresql/概述与安装配置
---

## 1. PL/pgSQL

### 1.1 函数

```sql
CREATE OR REPLACE FUNCTION calculate_bonus(
    p_salary NUMERIC,
    p_performance INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    v_bonus NUMERIC;
BEGIN
    v_bonus := p_salary * p_performance / 100.0;
    RETURN v_bonus;
END;
$$ LANGUAGE plpgsql;

-- 调用
SELECT calculate_bonus(50000, 15);
```

### 1.2 存储过程（PROCEDURE）

```sql
CREATE OR REPLACE PROCEDURE transfer_funds(
    p_from INTEGER,
    p_to INTEGER,
    p_amount NUMERIC
) AS $$
BEGIN
    UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
    UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
    COMMIT;
END;
$$ LANGUAGE plpgsql;

-- 调用
CALL transfer_funds(1, 2, 1000);
```

### 1.3 控制流

```sql
CREATE OR REPLACE FUNCTION get_grade(p_score INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
    IF p_score >= 90 THEN
        RETURN 'A';
    ELSIF p_score >= 80 THEN
        RETURN 'B';
    ELSIF p_score >= 70 THEN
        RETURN 'C';
    ELSE
        RETURN 'D';
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 1.4 游标与循环

```sql
CREATE OR REPLACE PROCEDURE process_orders() AS $$
DECLARE
    order_record RECORD;
BEGIN
    FOR order_record IN
        SELECT id, amount FROM orders WHERE status = 'pending'
    LOOP
        UPDATE orders SET status = 'processing' WHERE id = order_record.id;
        -- 处理逻辑
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## 2. PL/Python

```sql
CREATE EXTENSION plpython3u;

CREATE OR REPLACE FUNCTION python_hash(p_text TEXT)
RETURNS TEXT AS $$
import hashlib
return hashlib.sha256(p_text.encode()).hexdigest()
$$ LANGUAGE plpython3u;
```

## 3. PL/Perl

```sql
CREATE EXTENSION plperl;

CREATE OR REPLACE FUNCTION perl_reverse(p_text TEXT)
RETURNS TEXT AS $$
return reverse($_[0]);
$$ LANGUAGE plperl;
```
