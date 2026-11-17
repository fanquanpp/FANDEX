---
order: 60
title: JSON_TABLE 关系化查询
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL JSON_TABLE：标准化JSON处理、路径表达式、嵌套列与关系化输出
author: fanquanpp
updated: '2026-11-17'
related:
  - 'postgresql/080-AdvancedSQL'
  - 'postgresql/290-MERGEStatementEnhancement'
  - 'postgresql/300-FullTextSearch'
  - 'postgresql/310-GeoSpatialObject'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 1. JSON_TABLE 解决什么问题

用 `->>`/`#>>` 操作符取 JSON 里的值，遇到"一个字段里装着数组、数组元素里还有嵌套对象"的结构时会写出一长串取值链，而且没法把数组元素变成"行"去 JOIN、GROUP BY、聚合——SQL 的整套关系工具在 JSON 面前用不上。

JSON_TABLE 是 SQL:2016 标准函数（PostgreSQL 17+ 支持），做的事就一件：**把 JSON 展平成关系表**。它的工作位置在 FROM 子句，像一个 LATERAL 表函数——对左侧的每一行 JSON，按路径展开成 0 到 N 行。两个核心概念决定你会不会用它：

- **行路径**（第二个参数）：哪里切开算"一行"；
- **COLUMNS**：切开的每一行里，怎么取"一列"。

```sql
-- 将 JSON 数组展开为行: 行路径 '$.items[*]' 把数组每个元素变成一行
SELECT jt.*
FROM api_logs,
JSON_TABLE(payload, '$.items[*]' COLUMNS (
    product_id INTEGER PATH '$.product_id',   -- 列路径相对行路径元素
    quantity INTEGER PATH '$.quantity',
    price NUMERIC PATH '$.price'
)) AS jt;
```

展平之后 WHERE、JOIN、GROUP BY 全是普通 SQL，这正是它比操作符取值链强大的原因。

## 2. 嵌套列与错误处理

NESTED PATH 处理"行里还有子结构"——子路径在每一行内再展开：

```sql
-- 处理嵌套 JSON
SELECT jt.name, addr.street, addr.city
FROM users,
JSON_TABLE(data, '$' COLUMNS (
    name VARCHAR(100) PATH '$.name',
    NESTED PATH '$.address' COLUMNS (
        street VARCHAR(200) PATH '$.street',
        city VARCHAR(100) PATH '$.city',
        zip VARCHAR(20) PATH '$.zip'
    )
)) AS jt;
```

路径不存在、类型不匹配、展开为空，都会触发 ON ERROR / ON EMPTY 两个行为开关：

```sql
-- ERROR ON ERROR：遇到错误报错（用于"脏数据必须立刻暴露"的校验场景）
-- NULL ON ERROR：遇到错误返回 NULL（默认, 容忍脏数据继续跑）
-- EMPTY [ON ERROR]：返回空（JSON_QUERY 返回 JSON 值时用 EMPTY 更贴切）

SELECT jt.*
FROM documents,
JSON_TABLE(data, '$.items[*]' COLUMNS (
    id INTEGER PATH '$.id' ERROR ON ERROR,
    name VARCHAR(100) PATH '$.name' NULL ON ERROR
)) AS jt;
```

选择依据：数据是"可信契约"（自家系统产出）用 ERROR ON ERROR 尽早暴露；是"外部输入"（用户上传、第三方接口）用默认 NULL 并在应用层补数据质量监控。静默吞错的代价是字段悄悄全变 NULL。

## 3. 与操作符取值的分工

```sql
-- JSONB 操作符方式: 取一两个标量, 一行对一行
SELECT payload->>'name' AS name,
       payload->'address'->>'city' AS city
FROM users;

-- JSON_TABLE 方式: 结构复杂、需要展平/JOIN/聚合时
SELECT jt.name, jt.city
FROM users,
JSON_TABLE(payload, '$' COLUMNS (
    name VARCHAR(100) PATH '$.name',
    city VARCHAR(100) PATH '$.address.city'
)) AS jt;
```

分工口诀：**取一两个标量用操作符；把数组当行、要 JOIN/聚合/批量提取用 JSON_TABLE**。与 JSONB 两大存储差异（json/jsonb）的对比见 [JSONB 与 JSON 的区别](/postgresql/110-JSONBJSONDifference)。
## JSONB 基础操作速查

以下速查覆盖与 JSON_TABLE 配套的日常操作（存储、取值、过滤、修改、聚合、索引）。JSONB 与 JSON 的存储差异及选型心智模型集中在 [JSONB 与 JSON 的区别](/postgresql/110-JSONBJSONDifference)一篇。

### 创建与插入

**单行写法：创建 JSONB 列**
`<列名> JSONB`
```sql
-- 创建带 JSONB 列的表
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  attributes JSONB
);
```

**单行写法：插入 JSON 数据**
`INSERT INTO <表名> (<列>) VALUES ('<JSON字符串>'::jsonb);`
```sql
-- 插入 JSONB 数据
INSERT INTO products (name, attributes)
VALUES ('手机', '{"品牌": "Xiaomi", "价格": 2999, "颜色": "黑色"}'::jsonb);
```

**单行写法：使用 JSON 构造函数（PG17+）**
`INSERT INTO <表名> (<列>) VALUES (JSON_OBJECT('key', 'value'));`
```sql
-- 使用 SQL 标准 JSON 构造函数
INSERT INTO products (name, attributes)
VALUES ('手机', JSON_OBJECT('品牌', 'Xiaomi', '价格', 2999));
```

**单行写法：插入 JSON 数组**
`INSERT INTO <表名> (<列>) VALUES ('[1, 2, 3]'::jsonb);`
```sql
-- 插入 JSON 数组
INSERT INTO logs (tags) VALUES ('["redis", "mysql", "pg"]'::jsonb);
```

---

### 查询操作

**单行写法：使用 -> 获取 JSON 对象字段**
`SELECT <列>->'<键>' FROM <表名>;`
```sql
-- 获取 JSON 对象字段（返回 JSONB）
SELECT attributes->'品牌' AS brand FROM products;
```

**单行写法：使用 ->> 获取文本值**
`SELECT <列>->>'<键>' FROM <表名>;`
```sql
-- 获取 JSON 字段文本值（返回 TEXT）
SELECT attributes->>'品牌' AS brand FROM products;
```

**单行写法：路径访问嵌套字段**
`SELECT <列>#>'{<路径1>, <路径2>}' FROM <表名>;`
```sql
-- 按路径获取嵌套 JSONB 值
SELECT attributes#>'{地址, 城市}' AS city FROM users;
```

**单行写法：路径访问文本**
`SELECT <列>#>>'{<路径1>, <路径2>}' FROM <表名>;`
```sql
-- 按路径获取嵌套字段文本值
SELECT attributes#>>'{地址, 城市}' AS city FROM users;
```

**单行写法：获取数组元素**
`SELECT <列>-><索引> FROM <表名>;`
```sql
-- 获取 JSON 数组指定索引元素
SELECT tags->0 AS first_tag FROM logs;
```

---

### 条件查询

**单行写法：按 JSON 字段过滤**
`SELECT * FROM <表名> WHERE <列>->>'<键>' = '<值>';`
```sql
-- 查询品牌为 Xiaomi 的商品
SELECT * FROM products WHERE attributes->>'品牌' = 'Xiaomi';
```

**单行写法：使用 @> 包含操作符**
`SELECT * FROM <表名> WHERE <列> @> '<JSON对象>';`
```sql
-- 查询包含指定键值对的记录
SELECT * FROM products WHERE attributes @> '{"品牌": "Xiaomi"}';
```

**单行写法：使用 ? 键存在判断**
`SELECT * FROM <表名> WHERE <列> ? '<键>';`
```sql
-- 查询存在指定键的记录
SELECT * FROM products WHERE attributes ? '价格';
```

**单行写法：使用 ?| 任一键存在**
`SELECT * FROM <表名> WHERE <列> ?| ARRAY['<键1>', '<键2>'];`
```sql
-- 查询存在任一键的记录
SELECT * FROM products WHERE attributes ?| ARRAY['价格', '库存'];
```

**单行写法：使用 ?& 所有关键存在**
`SELECT * FROM <表名> WHERE <列> ?& ARRAY['<键1>', '<键2>'];`
```sql
-- 查询同时存在多个键的记录
SELECT * FROM products WHERE attributes ?& ARRAY['价格', '库存'];
```

---

### 修改操作

**单行写法：合并 JSON 对象**
`SELECT <列> || '<JSON对象>' FROM <表名>;`
```sql
-- 合并两个 JSON 对象（后者覆盖前者）
UPDATE products SET attributes = attributes || '{"库存": 100}'::jsonb WHERE id = 1;
```

**单行写法：删除键**
`SELECT <列> - '<键>' FROM <表名>;`
```sql
-- 删除 JSON 对象指定键
UPDATE products SET attributes = attributes - '颜色' WHERE id = 1;
```

**单行写法：删除多个键**
`SELECT <列> - '<键1>' - '<键2>' FROM <表名>;`
```sql
-- 删除多个键
UPDATE products SET attributes = attributes - '颜色' - '库存' WHERE id = 1;
```

**单行写法：按路径删除**
`SELECT <列> #- '{<路径>}' FROM <表名>;`
```sql
-- 按路径删除嵌套字段
UPDATE users SET attributes = attributes #- '{地址, 城市}' WHERE id = 1;
```

**单行写法：更新指定路径值**
`SELECT jsonb_set(<列>, '{<路径>}', '<新值>');`
```sql
-- 更新嵌套字段值
UPDATE users SET attributes = jsonb_set(attributes, '{地址, 城市}', '"北京"'::jsonb) WHERE id = 1;
```

**单行写法：设置值不存在时才插入**
`SELECT jsonb_set(<列>, '{<路径>}', '<新值>', true);`
```sql
-- 仅当键不存在时插入新值
UPDATE products SET attributes = jsonb_set(attributes, '{折扣}', '"0.9"'::jsonb, true) WHERE id = 1;
```

---

### 聚合与展开

**单行写法：JSON 聚合**
`SELECT json_agg(<列>) FROM <表名>;`
```sql
-- 将多行数据聚合成 JSON 数组
SELECT json_agg(username) AS usernames FROM users;
```

**单行写法：JSONB 聚合**
`SELECT jsonb_agg(<列>) FROM <表名>;`
```sql
-- 将多行聚合成 JSONB 数组
SELECT jsonb_agg(row_to_json(u)) AS users FROM users u;
```

**单行写法：构建 JSON 对象**
`SELECT json_build_object('<键>', <值>[, ...]);`
```sql
-- 构建键值对 JSON 对象
SELECT json_build_object('id', id, 'name', username) FROM users;
```

**单行写法：行转 JSON 对象**
`SELECT row_to_json(<表别名>) FROM <表名> <别名>;`
```sql
-- 将整行转为 JSON 对象
SELECT row_to_json(u) FROM users u WHERE id = 1;
```

**换行写法：展开 JSON 数组**
`SELECT * FROM jsonb_array_elements(<列>) AS <别名>;`
```sql
-- 将 JSON 数组展开为多行
SELECT * FROM jsonb_array_elements('["a", "b", "c"]'::jsonb) AS elem;
```

**换行写法：展开 JSON 对象**
`SELECT * FROM jsonb_each(<列>) AS <别名>(键, 值);`
```sql
-- 将 JSON 对象展开为键值对多行
SELECT * FROM jsonb_each('{"a": 1, "b": 2}'::jsonb) AS x(key, value);
```

---

### 索引与性能

**单行写法：创建 GIN 索引**
`CREATE INDEX <索引名> ON <表名> USING GIN (<列>);`
```sql
-- 为 JSONB 列创建 GIN 索引
CREATE INDEX idx_products_attr ON products USING GIN (attributes);
```

**单行写法：创建表达式索引**
`CREATE INDEX <索引名> ON <表名> ((<列>->>'<键>'));`
```sql
-- 为 JSONB 某字段创建表达式索引
CREATE INDEX idx_products_brand ON products ((attributes->>'品牌'));
```

**单行写法：查看 JSONB 键**
`SELECT jsonb_object_keys(<列>) FROM <表名>;`
```sql
-- 获取 JSONB 对象所有键
SELECT jsonb_object_keys(attributes) FROM products WHERE id = 1;
```

---

## JSON_TABLE（PG17+）

**换行写法：JSON 数据转关系表**
`SELECT * FROM JSON_TABLE(<JSON>, '<路径>' COLUMNS (<列定义>));`
```sql
-- 将 JSON 数组转为关系表行
SELECT * FROM JSON_TABLE(
  '[{"name": "张三", "age": 25}, {"name": "李四", "age": 30}]'::jsonb,
  '$[*]' COLUMNS (
    name TEXT PATH '$.name',
    age INT PATH '$.age'
  )
);
```

**单行写法：JSON_EXISTS 判断路径存在**
`SELECT JSON_EXISTS(<JSON>, '<路径>');`
```sql
-- 判断 JSON 路径是否存在
SELECT JSON_EXISTS(attributes, '$.品牌') FROM products WHERE id = 1;
```

**单行写法：JSON_VALUE 提取标量**
`SELECT JSON_VALUE(<JSON>, '<路径>');`
```sql
-- 提取 JSON 标量值
SELECT JSON_VALUE(attributes, '$.价格') FROM products WHERE id = 1;
```

**单行写法：JSON_QUERY 提取对象**
`SELECT JSON_QUERY(<JSON>, '<路径>');`
```sql
-- 提取 JSON 对象或数组
SELECT JSON_QUERY(attributes, '$.地址') FROM users WHERE id = 1;
```

## 教学自检

遮住示例代码，先自己写再对照参考答案。

### 任务一：把订单数组展平成行并求总额

需求：`orders` 表有 `payload JSONB` 列，内容形如 `{"order_id": 7, "items": [{"product": "A", "price": 30}, {"product": "B", "price": 12}]}`。写出查询：每个订单一行总额。提示：行路径选哪里、外层要不要 GROUP BY。

<details>
<summary>参考实现与讲解</summary>

```sql
SELECT o.order_id, sum(jt.price) AS total
FROM orders o,
JSON_TABLE(o.payload, '$.items[*]'
  COLUMNS (price NUMERIC PATH '$.price')) AS jt
GROUP BY o.order_id;
```
要点：行路径 `$.items[*]` 把数组元素切成行，每个订单展开出的行数等于元素个数；外层 FROM 里保留了 `orders o`，GROUP BY 回到订单维度聚合——"先展平再按原行聚合"是 JSON_TABLE 最常见的使用形状。若数组不存在，JSON_TABLE 对该行展开 0 行，LEFT JOIN 语义下该订单总额为 NULL 而不是消失，取决于 FROM 写法（`,` 隐式 CROSS JOIN 会丢行，`LEFT JOIN LATERAL` 保行）。

</details>

### 任务二：行路径与列路径的相对关系

需求：行路径写 `$.items[*]`，COLUMNS 里写 `PATH '$.price'`——这个 `$.price` 相对于谁？如果想取订单 id（在数组外层，`$.order_id`），列路径怎么写？

<details>
<summary>参考实现与讲解</summary>

列路径相对于行路径匹配出的每个元素（即 `$.items[i]`），所以 `$.price` 实际指 `$.items[i].price`。行路径写 `$.items[*]` 时，数组外的字段（如 `$.order_id`）在 COLUMNS 里拿不到——正确做法是把行路径设为 `$`、在 COLUMNS 里用 `NESTED PATH '$.items[*]'` 展开数组：订单 id 与 NESTED 列共存一行。这也是 NESTED 存在的核心价值：一层路径展一个数组，外层字段仍在。

</details>

### 任务三：脏 JSON 该 ERROR 还是 NULL

需求：第三方回传的 JSON 偶尔缺字段。报表查询想"缺了就当 NULL"，审计查询想"缺了直接失败"。分别怎么写？默认行为是什么？

<details>
<summary>参考实现与讲解</summary>

报表用默认（省略子句即 NULL ON ERROR）；审计在列定义后加 `ERROR ON ERROR`（如 `id INTEGER PATH '$.id' ERROR ON ERROR`）。PG 17 的默认是静默 NULL——字段缺失不会报错而是返回 NULL，这让"路径写错"和"数据真的没有"难以区分，审计/校验场景必须显式 ERROR ON ERROR 才能让脏数据尽早暴露。

</details>
