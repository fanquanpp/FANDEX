---
order: 50
title: JSONB 与 JSON：一个存文本，一个存索引
module: 'postgresql'
category: 数据库
difficulty: intermediate
description: 以智能音箱上报事件为练习场，弄清 jsonb 与 json 的本质差异（解析时机）、练全提取/包含/存在三类操作符与 SQL/JSON 路径，配好表达式索引与 GIN 索引，并避开 ->> 文本比较、GIN 写放大等真实坑。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'postgresql/120-JSONTABLE'
  - 'postgresql/080-AdvancedSQL'
  - 'postgresql/080-AdvancedSQL'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 1. 场景：设备上报的 JSON 该怎么存

你接手一个智能音箱平台。几十万台设备持续上报事件，固件版本不同，报文字段也不同：

```json
{ "device_id": "SPK-08817", "fw": "2.3.1", "level": "error",
  "metrics": { "wifi_rssi": -71, "uptime_s": 86400 },
  "tags": ["speaker", "bedroom"] }
```

新固件加字段、老固件少字段，表结构追不上。方案有三：拆成 `text` 列、用 `json` 类型、用 `jsonb` 类型。本篇回答三个问题：json 和 jsonb 差在哪？查询怎么写？索引怎么配？

### 1.1 练习场数据

```sql
CREATE TABLE device_events (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload  JSONB NOT NULL
);

INSERT INTO device_events (payload) VALUES
  ('{"device_id": "SPK-08817", "fw": "2.3.1", "level": "error",
     "metrics": {"wifi_rssi": -71, "uptime_s": 86400},
     "tags": ["speaker", "bedroom"]}'),
  ('{"device_id": "SPK-09004", "fw": "2.4.0", "level": "info",
     "metrics": {"wifi_rssi": -55, "uptime_s": 172800},
     "tags": ["speaker"]}'),
  ('{"device_id": "SPK-07721", "fw": "2.2.9", "level": "error",
     "battery": 12,
     "tags": ["speaker", "kitchen"]}'),
  ('{"device_id": "SPK-06155", "fw": "2.4.0", "level": "info",
     "tags": ["display"]}');

-- 同样事件也存一份 json 类型做对照（演示用）
CREATE TABLE device_events_json AS
SELECT id, reported_at, payload::json AS payload FROM device_events;
```

## 2. json 与 jsonb 的本质差异：解析发生在什么时候

一个类型存**原始文本**，一个类型存**解析后的二进制**——其他所有差异都是这一句的推论：

| 维度      | JSON                  | JSONB                    |
| --------- | --------------------- | ------------------------ |
| 存储格式  | 原始文本，照抄        | 分解后的二进制树         |
| 写入      | 快（只检查合法性）    | 慢一点（要解析、建树）   |
| 查询      | 慢（每次取值都重新解析文本） | 快（解析成本写时已付） |
| 键顺序/空格 | 保留原文            | 不保留（键按长度+字节序排） |
| 重复键    | 原样保留              | 只留最后一个             |
| 索引      | 基本没有              | GIN / 表达式索引全家桶   |
| 适用      | 需要原文逐字节一致的场合（验签、归档） | 日常业务默认选它 |

用插入时的"归一化"直接验证：

```sql
SELECT '{"b": 2, "a": 1, "a": 3}'::json;
-- {"b": 2, "a": 1, "a": 3}          ← 原样，连重复键都留着

SELECT '{"b": 2, "a": 1, "a": 3}'::jsonb;
-- {"a": 3, "b": 2}                  ← 重排序、去重取最后、去空格

SELECT '{"n": 1e2}'::jsonb;
-- {"n": 100}                        ← 数字也按数值语义重写
```

两张不同的表、两种世界观：`json` 像把 JSON 打印件塞进抽屉；`jsonb` 像把 JSON 拆解归档进检索柜。**除非业务要求逐字节保真（对报文验签、法律存证），一律选 jsonb**。后文只讲 jsonb。

顺带一提 TOAST：jsonb 超过约 2 KB 会被压缩、超过阈值移出行外存储，所以"大 JSON"在 PostgreSQL 里不至于拖垮表页——但每次取值要解压，超大 payload 本身就是反模式。

## 3. 提取：从 jsonb 里把值拿出来

三对操作符，差别只有一个箭头（多一个 `>` 返回文本）：

```sql
-- ->  返回 jsonb（可以继续链式取）
SELECT payload -> 'device_id' FROM device_events WHERE id = 1;
-- "SPK-08817"   （注意还带着引号，它仍是 jsonb）

-- ->> 返回 text（直接得到裸字符串）
SELECT payload ->> 'device_id' FROM device_events WHERE id = 1;
-- SPK-08817

-- 数组用下标
SELECT '["a","b","c"]'::jsonb -> 1;          -- "b"（0 起）
SELECT '["a","b","c"]'::jsonb ->> 1;         -- b

-- 嵌套：链式 或 路径
SELECT payload -> 'metrics' ->> 'wifi_rssi' FROM device_events WHERE id = 1;  -- -71
SELECT payload #>> '{metrics, wifi_rssi}'   FROM device_events WHERE id = 1;  -- -71
```

`#>`/`#>>` 接收 `{a,b}` 形式的路径数组，深嵌套时比连环 `->` 可读。

业务查询立即能写："固件 2.3.1 且报错的设备"：

```sql
SELECT payload ->> 'device_id'
FROM device_events
WHERE payload ->> 'fw' = '2.3.1'
  AND payload ->> 'level' = 'error';
```

**第一坑就在这里**：`->>` 返回 text，text 比较是字典序。`payload ->> 'uptime_s' > '1000'` 会认为 `'999' > '1000'`（按字符比 9 > 1）。要数值比较必须显式转型：

```sql
SELECT (payload #>> '{metrics, uptime_s}')::bigint AS uptime
FROM device_events
WHERE (payload #>> '{metrics, uptime_s}')::bigint > 100000;
```

## 4. 包含与存在：jsonb 的看家本领

比起"取出值再比"，jsonb 更擅长"整体形状匹配"：

```sql
-- @> 包含：左边是否包含右边的结构（数组是子集语义）
SELECT id FROM device_events
WHERE payload @> '{"level": "error"}';                   -- 所有报错事件

SELECT id FROM device_events
WHERE payload -> 'tags' @> '["bedroom"]';                -- 标签含 bedroom

-- <@ 被包含（方向反过来）
SELECT '{"a":1}'::jsonb <@ '{"a":1,"b":2}'::jsonb;       -- true

-- ? 顶层键存在 / ?| 任一存在 / ?& 全部存在
SELECT id FROM device_events WHERE payload ? 'battery';  -- 老固件才上报电池
SELECT payload ?| array['battery', 'metrics'] FROM device_events;
```

更复杂的条件（嵌套过滤、数组内筛选）用 SQL/JSON 路径表达式（PostgreSQL 12+）：

```sql
-- $ 表示根，?() 是过滤器
SELECT jsonb_path_query(
  '[{"name":"iPhone","price":7999},
    {"name":"AirPods","price":1299},
    {"name":"MacBook","price":12999}]'::jsonb,
  '$[*] ? (@.price > 5000)'
);
-- {"name": "iPhone", ...} 与 {"name": "MacBook", ...}

-- jsonb_path_exists 判断有无匹配，适合写 WHERE
SELECT id FROM device_events
WHERE jsonb_path_exists(payload, '$.metrics ? (@.wifi_rssi < -70)');

-- ** 递归下钻任意深度
SELECT jsonb_path_query('{"a":{"b":{"c":1}},"d":2}'::jsonb, '$.**.c');  -- 1
```

`jsonb_path_query` 返回全部匹配，`jsonb_path_query_first` 只取第一个。简单等值场景用操作符，路径语法留给操作符表达不了的层级条件。

## 5. 改：更新 JSON 内部

```sql
-- || 合并：右侧同键覆盖左侧
UPDATE device_events
SET payload = payload || '{"level": "resolved"}'
WHERE id = 3;

-- jsonb_set：精准改嵌套字段（路径， 新值， 缺路径时是否创建）
UPDATE device_events
SET payload = jsonb_set(payload, '{metrics, wifi_rssi}', '-60')
WHERE id = 1;

-- - 删键 / #- 按路径删
SELECT '{"a":1,"b":2}'::jsonb - 'a';                    -- {"b": 2}
SELECT '{"a":{"b":1,"c":2}}'::jsonb #- '{a,b}';         -- {"a": {"c": 2}}
```

注意：jsonb 的"原地修改"实际是整值重写（MVCC 里旧行作废、新行诞生），见[事务与并发控制](/postgresql/170-TransactionConcurrencyControl)。高频更新的热 JSON 列，膨胀与清理压力都来自这里。

## 6. 索引：按查询形状配

jsonb 默认无索引，配法取决于你的 WHERE 长什么样。

### 6.1 点查一个字段：表达式 btree 索引

```sql
CREATE INDEX idx_events_device ON device_events ((payload ->> 'device_id'));

SELECT id FROM device_events WHERE payload ->> 'device_id' = 'SPK-08817';
-- 普通索引扫描，等价于给虚拟列建索引
```

表达式必须原样出现在 WHERE 里（包括 `->>` 与类型转换），查询里多一层 `(payload ->> 'x')::int` 而索引里没有转型，索引就用不上。

### 6.2 形状匹配：GIN 索引

```sql
-- 默认 GIN：支持 @>、?、?|、?& 与 jsonb_path 查询
CREATE INDEX idx_events_payload ON device_events USING gin (payload);

SELECT id FROM device_events WHERE payload @> '{"level": "error"}';
-- Bitmap Index Scan on idx_events_payload

-- jsonb_path_ops 变体：只支持 @>，但更小更快
CREATE INDEX idx_events_payload_ops
  ON device_events USING gin (payload jsonb_path_ops);
```

两者取舍：默认 GIN 功能全（`?` 键存在查询只能靠它）；`jsonb_path_ops` 只保留值指纹，索引显著更小、写入更快，代价是不支持 `?` 系列与"仅键存在"类查询。**只做 `@>` 包含查询的大表，用 jsonb_path_ops**。

GIN 的写放大要心里有数：GIN 条目多、更新慢，且默认异步维护一个"待更新列表"（fastupdate），积压首次刷盘的那次 UPDATE 会特别久。写入密集的表给 GIN 索引减列（只对必要子字段建表达式索引）常比全列 GIN 更划算。

### 6.3 策略速查

| 查询模式              | 推荐索引                  |
| --------------------- | ------------------------- |
| `->>` 等值/范围点查   | btree 表达式索引          |
| `@>` 包含             | GIN（大表选 jsonb_path_ops） |
| `?` / `?|` / `?&` 键存在 | GIN（默认 ops）        |
| SQL/JSON 路径查询     | GIN（默认 ops）           |
| 按 jsonb 整体排序     | btree（很少真需要）       |

## 7. 构造与展开：jsonb 和 SQL 互相转化

聚合方向（行变 JSON）在[聚合函数](/sql/060-AggregateFunction)见过 PG 版：

```sql
SELECT jsonb_build_object('device', payload ->> 'device_id', 'fw', payload ->> 'fw')
FROM device_events WHERE id = 1;

SELECT jsonb_agg(payload ->> 'device_id') FROM device_events;        -- 变数组
SELECT jsonb_object_agg(payload ->> 'device_id', payload ->> 'fw')
FROM device_events;                                                  -- 变对象
```

展开方向（JSON 变行）：

```sql
-- 数组展开：每个元素一行
SELECT id, jsonb_array_elements_text(payload -> 'tags') AS tag
FROM device_events;

-- 对象展开：每个键值对一行（_text 版本值为 text）
SELECT * FROM jsonb_each('{"a":1,"b":2}'::jsonb);
```

辅助函数三件套：

```sql
SELECT jsonb_typeof('123'::jsonb);       -- number / string / boolean / null / array / object
SELECT jsonb_pretty('{"a":1}'::jsonb);   -- 缩进美化，人看用
SELECT jsonb_object('{a,b}', '{1,2}');   -- {"a": "1", "b": "2"}
```

要把 JSON 拆成带列定义的关系表（列名、类型、嵌套过滤条件），用第 120 篇的 `JSON_TABLE`（PG 17 起更顺滑）。

## 8. 坑点清单与自检

1. **`->>` 拿来当数字比**：text 字典序让 `'999' > '1000'` 成立。数值比较先 `::numeric`/`::bigint`。
2. **驱动里的问号冲突**：JDBC/部分 ORM 把 `?` 当占位符，jsonb 的 `?` 操作符要写成 `??`，或改用 `jsonb_path_exists` 绕开。
3. **依赖键顺序或重复键的业务**：jsonb 会重排键、静默去重取最后一个。验签、报文存证用 `json`。
4. **GIN 索引慢写入**：写入密集表评估表达式索引替代全列 GIN；留意 fastupdate 待刷队列造成的周期性抖动。
5. **表达式索引与查询不同形**：索引 `(payload ->> 'fw')` 匹配不上 `payload -> 'fw'`；类型转换要两边一致。
6. **高频 UPDATE 的 JSON 热点**：整值重写 + 行版本膨胀，膨胀治理见[VACUUM 机制](/postgresql/210-VACUUMMechanism)。
7. **无边界地塞 JSON**：需要约束、索引、统计的核心字段拆成普通列；jsonb 收留的是"结构多变的长尾"。

## 9. 练习

基于 device_events 表：

1. 查询所有"wifi_rssi 低于 -70"的设备 id（注意转型），并用 EXPLAIN 看当前有没有索引可用。
2. 为 `payload ->> 'level'` 建表达式索引，重跑第 1 题中"level = error"的过滤，对比计划变化。
3. 把 id = 2 的事件的 tags 数组追加一个 "living_room"（提示：`jsonb_set` + `||`）。
4. 用 `jsonb_path_exists` 找出"metrics 存在且 uptime_s 超过一天"的事件。
5. 统计每种 level 的事件数：先把 level 从 JSON 提出来，再 GROUP BY。
6. （思考题）同一份报文存 `json` 与 `jsonb` 各一份，对报文做 SHA256 验签，哪份能对上、哪份不能？为什么？

## 下一步

- [JSON_TABLE 关系化查询](/postgresql/120-JSONTABLE)：把 JSON 拆成带列定义的临时表。
- [高级 SQL](/postgresql/080-AdvancedSQL)：jsonb_agg 与窗口函数、CTE 的组合用法。
- [索引类型](/postgresql/220-IndexType)：GIN 的底层原理与其他索引家族。
- [VACUUM 机制](/postgresql/210-VACUUMMechanism)：高频更新的 JSON 列为什么会膨胀、谁来清理。
