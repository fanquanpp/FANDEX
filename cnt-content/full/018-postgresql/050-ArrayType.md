---
order: 500
title: 数组类型操作语法速查手册
module: 'postgresql'
category: 数据库
difficulty: beginner
description: 数组类型操作 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 数组定义与构造

**基本写法：建表定义数组列**
`<列名> <元素类型>[]`

```sql
-- 定义整型数组和文本数组列
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  tags TEXT[],
  member_ids BIGINT[],
  scores INTEGER[]
);
```

**基本写法：数组字面量构造**
`ARRAY[<值1>, <值2>, ...]` 或 `'{<值1>,<值2>,...}'`

```sql
-- 使用 ARRAY 构造器（推荐）
INSERT INTO projects (tags) VALUES (ARRAY['java','spring','web']);
-- 使用字符串字面量
INSERT INTO projects (tags) VALUES ('{java,spring,web}');
```

**基本写法：从子查询构造数组**
`ARRAY(SELECT <列> FROM <表> WHERE <条件>)`

```sql
-- 将查询结果转为数组
SELECT id, ARRAY(SELECT name FROM users WHERE dept_id = 1) AS dept_members;
```

**基本写法：多维数组**
`<元素类型>[][]`

```sql
-- 二维数组
CREATE TABLE matrix (data INTEGER[][]);
INSERT INTO matrix VALUES (ARRAY[[1,2],[3,4]]);
```

---

## 数组访问

**基本写法：按下标访问元素**
`<数组列>[<下标>]`

```sql
-- PostgreSQL 数组下标从 1 开始
SELECT tags[1] AS first_tag FROM projects WHERE id = 1;
SELECT member_ids[1:3] AS first_three FROM projects WHERE id = 1;  -- 切片
```

**基本写法：获取数组长度**
`array_length(<数组列>, <维度>)`

```sql
-- 获取第一维长度
SELECT array_length(tags, 1) AS tag_count FROM projects;
-- 获取多维数组各维长度
SELECT array_length(data, 1), array_length(data, 2) FROM matrix;
```

**基本写法：数组展开为行**
`unnest(<数组列>)`

```sql
-- 将数组展开为多行（常用于关联查询）
SELECT id, unnest(tags) AS tag FROM projects;
-- 多数组同步展开
SELECT id, tag, score
FROM projects
CROSS JOIN unnest(tags, scores) AS t(tag, score);
```

---

## 数组包含与匹配

**基本写法：包含元素判断**
`<值> = ANY(<数组>)` / `<数组> @> <数组>`

```sql
-- 是否包含任一等于该值的元素
SELECT * FROM projects WHERE 'java' = ANY(tags);
-- 是否包含指定子集（@> 包含）
SELECT * FROM projects WHERE tags @> ARRAY['java','spring'];
-- 是否被包含（<@）
SELECT * FROM projects WHERE ARRAY['java'] <@ tags;
```

**基本写法：重叠判断**
`<数组> && <数组>`

```sql
-- 两个数组是否有公共元素（存在交集）
SELECT * FROM projects WHERE tags && ARRAY['java','python'];
```

**基本写法：查找元素位置**
`array_position(<数组>, <值>)`

```sql
-- 返回元素首次出现的下标（从 1 开始）
SELECT array_position(tags, 'spring') FROM projects WHERE id = 1;
-- 所有出现位置
SELECT array_positions(tags, 'java') FROM projects;
```

---

## 数组修改

**基本写法：连接数组**
`<数组1> || <数组2>`

```sql
-- 数组连接
SELECT ARRAY[1,2] || ARRAY[3,4] AS result;  -- {1,2,3,4}
-- 追加元素
SELECT tags || 'new_tag' FROM projects WHERE id = 1;
```

**基本写法：追加元素**
`array_append(<数组>, <值>)`

```sql
-- 在末尾追加元素
UPDATE projects SET tags = array_append(tags, 'microservice') WHERE id = 1;
```

**基本写法：删除元素**
`array_remove(<数组>, <值>)`

```sql
-- 删除所有匹配元素
UPDATE projects SET tags = array_remove(tags, 'deprecated') WHERE id = 1;
```

**基本写法：替换元素**
`array_replace(<数组>, <旧值>, <新值>)`

```sql
-- 替换所有匹配元素
UPDATE projects SET tags = array_replace(tags, 'old', 'new') WHERE id = 1;
```

**基本写法：数组去重**
`ARRAY(SELECT DISTINCT unnest(<数组>))`

```sql
-- 数组去重
SELECT id, ARRAY(SELECT DISTINCT unnest(tags)) AS unique_tags FROM projects;
```

---

## 数组函数

**基本写法：数组转字符串**
`array_to_string(<数组>, <分隔符> [, <NULL替代>])`

```sql
-- 拼接为逗号分隔字符串
SELECT array_to_string(tags, ', ') AS tag_str FROM projects;
-- NULL 用占位符替代
SELECT array_to_string(scores, ',', 'N/A') FROM projects;
```

**基本写法：字符串转数组**
`string_to_array(<字符串>, <分隔符>)`

```sql
-- 按分隔符拆分为数组
SELECT string_to_array('a,b,c', ',') AS arr;  -- {a,b,c}
```

**基本写法：数组聚合**
`array_agg(<列>)`

```sql
-- 将分组内的值聚合为数组
SELECT dept_id, array_agg(user_name) AS members
FROM users GROUP BY dept_id;
```

**基本写法：数组与集合运算**
`array_cat / array_intersect / array_union`

```sql
-- 数组并集
SELECT ARRAY(SELECT unnest(ARRAY[1,2,3]) UNION SELECT unnest(ARRAY[3,4,5]));
-- 数组交集
SELECT ARRAY(SELECT unnest(ARRAY[1,2,3]) INTERSECT SELECT unnest(ARRAY[2,3,4]));
```

---

## 数组索引

**基本写法：创建 GIN 索引加速数组查询**
`CREATE INDEX <索引名> ON <表名> USING GIN (<数组列>);`

```sql
-- 为数组列建 GIN 索引（支持 @>、&& 等操作符）
CREATE INDEX idx_projects_tags ON projects USING GIN (tags);
-- 使用索引加速包含查询
SELECT * FROM projects WHERE tags @> ARRAY['java'];
```
