---
order: 300
title: SQL 中的 JSON
module: 'sql'
category: 数据库
difficulty: intermediate
description: 关系库中的半结构化数据：PostgreSQL jsonb、MySQL JSON、SQLite JSON 函数与 SQL Server 方案，提取、修改、索引、校验全流程与选型边界。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/090-DataType'
  - 'sql/290-TypeConversion'
  - 'sql/440-PerformanceOptimization'
  - 'sql/280-PivotUnpivot'
prerequisites:
  - 'sql/090-DataType'
---

## 1. 一句话入门

现实里总有一类数据：**结构因行而异、字段时常增减**——商品的扩展属性、第三方 API
的返回、应用的配置项。为每个可能的变化都 ALTER TABLE 加列并不现实。把这类数据
以 JSON 形式存进关系库的一列，就是"关系模型 + 半结构化"的组合拳：
**稳定的、要参与连接/聚合/约束的字段用普通列；易变的、只读写的附属信息用 JSON 列。**

> **类比**：普通列像快递单上的印刷字段（收件人、地址，格式固定）；
> JSON 列像随包裹附带的便签（内容随意，但要用的时候得翻开看）。
> 便签多了会拖慢分拣——所以关键检索字段永远不要只写在便签里。

SQL 标准从 **SQL:2016** 起把 JSON 处理纳入规范（SQL/JSON：路径语言、`JSON_TABLE`、
构造与查询函数），SQL:2023 进一步扩充。三大开源库的实现都已相当成熟。

## 2. 支持面总览（2026-09）

| 数据库 | 存储类型 | 关键里程碑 |
| ------ | -------- | ---------- |
| PostgreSQL | `json` / `jsonb` 两种 | 9.4（2014）引入 jsonb；12 起支持 SQL/JSON 路径语言；16 加 `IS JSON` 谓词；17 加标准 `JSON_TABLE` |
| MySQL | `JSON` 原生类型 | 5.7.8 引入；8.0 加 `JSON_TABLE`、多值索引、`JSON_SCHEMA_VALID` |
| SQLite | `TEXT` 存储 + 函数族 | 3.38.0（2022）起 JSON 函数与 `->`/`->>` 默认内置；3.45.0（2024）起提供 JSONB 内部格式 |
| SQL Server | `NVARCHAR(MAX)` + 函数族 | 2016 起 `JSON_VALUE`/`JSON_QUERY`/`OPENJSON`；原生 `json` 类型自 2024 年起才在 Azure SQL/新版本中落地（以官方文档为准） |

PostgreSQL 的 `json` 与 `jsonb` 必须分清：`json` 原样保存文本（保留空格、键顺序、
重复键），每次读取都要重新解析；`jsonb` 解析后以规范化二进制存储（去重、乱序、
去空白），**支持等值、包含查询与 GIN 索引**。现代实践默认选 `jsonb`，
`json` 仅用于需要逐字节保留原文的场景（如合规存档）。

## 3. 建表与写入

```sql
-- PostgreSQL：扩展属性用 jsonb
CREATE TABLE products (
    id       INT PRIMARY KEY,
    name     TEXT NOT NULL,
    attrs    JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT attrs_is_object CHECK (attrs::text LIKE '{%}')  -- 简单兜底（严格校验见第 8 节）
);

INSERT INTO products VALUES
  (1, '机械键盘', '{"switch":"红轴","layout":87,"wireless":true}'),
  (2, '显示器',   '{"panel":"IPS","size":27,"refresh":165}');
```

```sql
-- MySQL：JSON 列不能有字面量 DEFAULT（可用表达式默认值），需显式传值
CREATE TABLE products (
    id    INT PRIMARY KEY,
    name  VARCHAR(100) NOT NULL,
    attrs JSON
);
INSERT INTO products VALUES (1, '机械键盘', JSON_OBJECT('switch','红轴','layout',87));

-- SQLite：没有 JSON 类型，用 TEXT 加 CHECK 校验
CREATE TABLE products (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL,
    attrs TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(attrs))
);
INSERT INTO products VALUES (1, '机械键盘', '{"switch":"红轴","layout":87}');
```

SQLite 的类型亲和性下 JSON 就是文本；`json_valid()` 约束挡住非法字符串，
是 SQLite 场景的"最低限度类型安全"。

## 4. 提取：-> 与 ->>（三库趋同的幸运设计）

现代三库统一了两个操作符，这是可移植性最好的一段 JSON 语法：

- `->`：取出 JSON 子对象/数组元素（结果仍是 JSON）；
- `->>`：取出并转为 **SQL 标量**（文本/数字），可直接参与比较、排序、聚合。

```sql
-- PostgreSQL（jsonb 操作符）
SELECT attrs ->> 'switch'          AS switching,   -- '红轴'（文本）
       attrs -> 'wireless'         AS wireless_json -- true（jsonb，非布尔）
FROM products WHERE id = 1;

-- 路径下钻：数组与嵌套
SELECT attrs #> '{tags,0}'   AS first_tag,      -- 第 1 个标签（jsonb）
       attrs #>> '{tags,0}'  AS first_tag_text  -- 转文本
FROM products WHERE id = 1;

-- MySQL（路径写法：单引号路径字符串）
SELECT attrs ->> '$.switch' AS switching,
       attrs -> '$.layout'  AS layout_json
FROM products WHERE id = 1;

-- SQLite 3.38+（与 MySQL 同形）
SELECT attrs ->> '$.switch' AS switching FROM products WHERE id = 1;
```

老函数（`jsonb_extract`/`json_extract`/`JSON_UNQUOTE(JSON_EXTRACT(...))`）仍然
可用且语义等价，但新代码统一 `->`/`->>` 更易读。注意方向差异：**MySQL/SQLite
取纯文本用 `->>`；PostgreSQL 取文本用 `->>`、取 jsonb 用 `->`**——三库恰好一致，
不会混乱。

SQL Server 走函数路线：`JSON_VALUE(col, '$.switch')` 取标量、
`JSON_QUERY(col, '$.tags')` 取对象/数组、`OPENJSON(col)` 展开为行。

## 5. 展开为行：JSON_TABLE 与 json_each

把 JSON 数组"竖过来"当表用，是半结构化数据关系化的核心动作。

```sql
-- PostgreSQL 17+ / MySQL 8.0+：标准 JSON_TABLE
SELECT p.id, t.tag
FROM products p,
JSON_TABLE(p.attrs, '$.tags[*]'
    COLUMNS (tag VARCHAR(50) PATH '$')) AS t;
-- 预期：每个产品每个标签一行（1,'红轴'）…（2,'IPS'）…

-- PostgreSQL 12+ 的 jsonb_path_query（SQL/JSON 路径语言）
SELECT jsonb_path_query(attrs, '$.specs[*].name') FROM products;

-- SQLite：json_each 表值函数，能力等同 JSON_TABLE
SELECT p.id, je.value AS tag
FROM products p, json_each(p.attrs, '$.tags') je;
```

反方向"多行聚合成 JSON"同样常用：

```sql
-- PostgreSQL
SELECT jsonb_object_agg(k, v) FROM (VALUES ('a',1),('b',2)) t(k,v);

-- MySQL 5.7.22+ / 8.0
SELECT JSON_ARRAYAGG(name) FROM products;        -- ["机械键盘","显示器"]

-- SQLite
SELECT json_group_array(name) FROM products;
```

## 6. 修改 JSON

```sql
-- PostgreSQL：jsonb_set(目标, 路径数组, 新值[, 存在才改?])
UPDATE products
SET attrs = jsonb_set(attrs, '{refresh}', '180', true)
WHERE id = 2;                       -- refresh 改为 180

-- MySQL
UPDATE products SET attrs = JSON_SET(attrs, '$.refresh', 180) WHERE id = 2;

-- SQLite
UPDATE products SET attrs = json_set(attrs, '$.refresh', 180) WHERE id = 2;

-- 删除键
-- PostgreSQL：attrs = attrs - 'refresh'
-- MySQL：JSON_REMOVE(attrs, '$.refresh')
-- SQLite：json_remove(attrs, '$.refresh')
```

共同点是"**读出-改写-整列回写**"：JSON 列内部不发生行级部分更新，深度嵌套的
高频修改适合拆成普通列或独立的子表。

## 7. 索引与性能

JSON 列默认**没有索引**，`WHERE attrs->>'switch' = '红轴'` 是全表扫描。
三种主流的加速方案：

```sql
-- PostgreSQL：表达式索引（点查）或 GIN（包含查询）
CREATE INDEX idx_products_switch ON products ((attrs->>'switch'));   -- 等值/范围
CREATE INDEX idx_products_attrs  ON products USING gin (attrs);      -- 包含查询专用
SELECT * FROM products WHERE attrs @> '{"switch":"红轴"}';           -- 走 GIN

-- MySQL：生成列 + 索引（把常用键"提升"为虚拟列）
ALTER TABLE products
  ADD COLUMN switch VARCHAR(20)
      GENERATED ALWAYS AS (attrs->>'$.switch') STORED;
CREATE INDEX idx_products_switch ON products(switch);
-- 数组成员过滤可用多值索引（8.0.17+）：
-- CREATE INDEX idx_tags ON products((CAST(attrs->'$.tags' AS UNSIGNED ARRAY)));

-- SQLite：表达式索引
CREATE INDEX idx_products_switch ON products (json_extract(attrs, '$.switch'));
```

性能心智模型：**提取成本随 JSON 体积线性增长**。PostgreSQL 的 jsonb 超过约 2KB
会走 TOAST（行外存储），提取时多一次解压；MySQL 的 JSON 文档超过约 1MB 才有
行外问题，但部分更新需要二进制 diff（8.0 有优化）。通用的对策是"大 JSON 拆小、
热键提成列"。

## 8. 校验与约束

关系库不会替你理解 JSON 内部结构，校验要自己搭：

```sql
-- 语法层面
-- PostgreSQL 16+：CHECK (attrs IS JSON)     （SQL/JSON 谓词）
-- MySQL 8.0.17+：CHECK (JSON_SCHEMA_VALID('{"type":"object"}', attrs))
-- SQLite：CHECK (json_valid(attrs))
-- SQL Server：CHECK (ISJSON(col) = 1)

-- 结构层面（以 PostgreSQL 为例：CHECK + 函数）
ALTER TABLE products
  ADD CONSTRAINT attrs_keys CHECK (
    jsonb_typeof(attrs) = 'object'
  );

-- MySQL 用 JSON Schema 声明结构（最有表达力的方案）
ALTER TABLE products
  ADD CONSTRAINT attrs_schema
  CHECK (JSON_SCHEMA_VALID(
    '{"type":"object","properties":{"switch":{"type":"string"}},"required":["switch"]}',
    attrs));
```

## 9. 陷阱与调试

1. **json 与 jsonb 混用**（PostgreSQL）：对 `json` 列建 GIN 索引、用包含运算符
   都会报错；先确认列类型再写查询。
2. **`->>` 结果是文本**：`attrs->>'layout' > 100` 在 PostgreSQL 里是文本比较
   （'87' > '100' 为真！）——需要数值比较时显式转型
   `(attrs->>'layout')::int > 100`（这条转换正是索引失效的经典来源，
   参见 [类型转换](/sql/290-TypeConversion)）。
3. **路径不存在返回 NULL 还是报错**：`->>/JSON_VALUE` 缺路径返回 NULL（静默）；
   SQL Server 的 `JSON_VALUE` 遇到"路径指向对象/数组"也返回 NULL，要改用
   `JSON_QUERY`——排查"取不出来"时先打印整列确认路径层级。
4. **键名大小写敏感**：`{"Switch":1}` 与 `switch` 是两个键；三库都不会自动忽略
   大小写，与普通列名不区分大小写的行为不一致。
5. **重复键与顺序**：PostgreSQL jsonb 解析时会去掉重复键、打乱键顺序；
   需要保序保真的存档用 `json` 类型。
6. **别把 JSON 当万能逃生舱**：本该是外键的 id、本该建索引的状态字段塞进 JSON，
   等于放弃了关系库最重要的能力（约束、连接、统计信息）。判断标准：
   "这个字段要不要出现在 WHERE / JOIN / 聚合里？"——要，就用普通列。

## 10. 实战场景

- **产品扩展属性**（本篇主线）：稳定属性（价格、类目）用列，长尾属性用 jsonb +
  GIN；爆款属性出现频率升高后再提升为普通列。
- **API 载荷暂存**：Webhook 原始报文整包入库（jsonb/JSON 列 + 时间列），
  异步任务用 `JSON_TABLE`/`json_each` 关系化后处理——先落盘再解析，天然具备重放能力。
- **配置中心**：多层级配置存 JSON，`JSON_SCHEMA_VALID`/CHECK 做结构兜底，
  版本列表存"每行一版"而不是一列大 JSON。
- **ETL 中转区**：异构源数据先入 staging 表的 JSON 列，用 JSON_TABLE 映射到
  规范化的目标表，映射错误不会污染目标库。

## 11. 小结

- 初学者要点：JSON 列解决"结构易变的数据"；取值记 `->`（还是 JSON）与 `->>`
  （转标量）两个操作符，PostgreSQL/MySQL/SQLite 通用；没有索引意识就一定全表扫描。
- 进阶注意：PostgreSQL 选 `jsonb` 不选 `json`（可索引、可包含查询）；SQLite 3.38
  起函数默认内置、3.45 起有 JSONB 内部格式；MySQL 的结构校验首选
  `JSON_SCHEMA_VALID`；`->>` 取出的都是文本，数值比较必须显式转型；
  JSON 列负责"灵活性"，普通列与约束负责"正确性"，两者各司其职才是成熟设计。
