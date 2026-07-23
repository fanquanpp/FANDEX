# 集合操作

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## UNION

**换行写法：UNION 合并去重**
`<查询 1> UNION <查询 2>`
```sql
-- 合并 2025 年和 2026 年的客户（自动去重）
SELECT customer_id FROM orders_2025
UNION
SELECT customer_id FROM orders_2026;
```

**换行写法：UNION 合并多表**
`<查询 1> UNION <查询 2> UNION <查询 3>`
```sql
-- 合并三年的客户
SELECT customer_id FROM orders_2024
UNION
SELECT customer_id FROM orders_2025
UNION
SELECT customer_id FROM orders_2026;
```

---

## UNION ALL

**换行写法：UNION ALL 合并不去重**
`<查询 1> UNION ALL <查询 2>`
```sql
-- 合并 2025 年和 2026 年的客户（保留重复）
SELECT customer_id FROM orders_2025
UNION ALL
SELECT customer_id FROM orders_2026;
```

**换行写法：UNION ALL 合并不同表**
`<查询 1> UNION ALL <查询 2>`
```sql
-- 合并活跃用户和归档用户
SELECT id, name, email FROM active_users
UNION ALL
SELECT id, name, email FROM archived_users;
```

---

## INTERSECT

**换行写法：INTERSECT 交集**
`<查询 1> INTERSECT <查询 2>`
```sql
-- 查询两年都下单的客户
SELECT customer_id FROM orders_2025
INTERSECT
SELECT customer_id FROM orders_2026;
```

**换行写法：INTERSECT 多查询交集**
`<查询 1> INTERSECT <查询 2> INTERSECT <查询 3>`
```sql
-- 查询三年都下单的客户
SELECT customer_id FROM orders_2024
INTERSECT
SELECT customer_id FROM orders_2025
INTERSECT
SELECT customer_id FROM orders_2026;
```

---

## EXCEPT

**换行写法：EXCEPT 差集**
`<查询 1> EXCEPT <查询 2>`
```sql
-- 查询 2025 年下单但 2026 年未下单的客户
SELECT customer_id FROM orders_2025
EXCEPT
SELECT customer_id FROM orders_2026;
```

**换行写法：MySQL 用 LEFT JOIN 模拟 EXCEPT**
`SELECT ... FROM <表 1> LEFT JOIN <表 2> ON ... WHERE <表 2>.<列> IS NULL`
```sql
-- MySQL 不支持 EXCEPT，使用 LEFT JOIN 模拟
SELECT a.customer_id
FROM orders_2025 a
LEFT JOIN orders_2026 b ON a.customer_id = b.customer_id
WHERE b.customer_id IS NULL;
```

---

## 集合操作排序

**换行写法：UNION 结果排序**
`<查询 1> UNION <查询 2> ORDER BY <列>`
```sql
-- 合并结果后按 customer_id 排序
SELECT customer_id FROM orders_2025
UNION
SELECT customer_id FROM orders_2026
ORDER BY customer_id;
```

**换行写法：UNION ALL 结果带来源标记排序**
`SELECT ..., '<来源>' AS source FROM ... UNION ALL ... ORDER BY <列>`
```sql
-- 合并结果并标记来源，按 customer_id 排序
SELECT customer_id, '2025' AS year FROM orders_2025
UNION ALL
SELECT customer_id, '2026' AS year FROM orders_2026
ORDER BY customer_id, year;
```

---

## 集合操作规则

**换行写法：列数和类型必须一致**
`SELECT <列 1>, <列 2> UNION SELECT <列 1>, <列 2>`
```sql
-- 两个查询的列数和数据类型必须一致
SELECT name, email FROM active_users
UNION
SELECT name, email FROM archived_users;
```

**换行写法：使用 NULL 占位对齐列数**
`SELECT <列 1>, NULL AS <列 2> UNION SELECT <列 1>, <列 2>`
```sql
-- 使用 NULL 占位使列数一致
SELECT name, email, phone FROM users
UNION
SELECT name, email, NULL FROM archived_users;
```

---

## 集合操作优先级

**换行写法：INTERSECT 优先于 UNION**
`<查询 1> UNION <查询 2> INTERSECT <查询 3>`
```sql
-- INTERSECT 先执行，再执行 UNION
-- 等价于：查询 1 UNION (查询 2 INTERSECT 查询 3)
SELECT customer_id FROM orders_2024
UNION
SELECT customer_id FROM orders_2025
INTERSECT
SELECT customer_id FROM orders_2026;
```

**换行写法：括号改变优先级**
`(<查询 1> UNION <查询 2>) INTERSECT <查询 3>`
```sql
-- 使用括号改变优先级
(SELECT customer_id FROM orders_2024
 UNION
 SELECT customer_id FROM orders_2025)
INTERSECT
SELECT customer_id FROM orders_2026;
```
