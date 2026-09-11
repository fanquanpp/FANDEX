---
order: 30
title: Hash 命令
module: 'redis'
category: 数据库
difficulty: beginner
description: Redis Hash 命令全解：对象存储与购物车模式、listpack/hashtable 编码转换、7.4 字段级过期与 8.0 HGETDEL/HGETEX/HSETEX、大哈希防御。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'redis/010-OverviewCoreDataStructure'
  - 'redis/020-KeyManagement'
  - 'redis/040-ListSetZSetCommand'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 1. 是什么：对象字段级读写

Hash 是「键 -> 字段 -> 值」的两级映射，类比「一张表格：键是表名，
field 是列，value 是单元格」。与把整个 JSON 序列化成 String 相比，
Hash 支持**只读写一个字段**：

```
String 存对象:  GET user:1      → 取回整个 JSON（改一个字段要读-改-写回，有并发覆盖风险）
Hash  存对象:   HGET user:1 age → 只取一个字段，HINCRBY 原子自增
```

底层编码随体量自动切换：字段少且值短时用 **listpack**（紧凑连续内存），
超过 `hash-max-listpack-entries`（默认 512）或任一值超过
`hash-max-listpack-value`（默认 64 字节）转为 **hashtable**，可用
`OBJECT ENCODING user:1` 验证。

## 2. 一次完整会话

```bash
127.0.0.1:6379> HSET user:1 name zhangsan age 25
(integer) 2                     # 返回新建字段数
127.0.0.1:6379> HGET user:1 name
"zhangsan"
127.0.0.1:6379> HSETNX user:1 age 99
(integer) 0                     # 字段已存在，设置失败
127.0.0.1:6379> HINCRBY user:1 age 1
(integer) 26
127.0.0.1:6379> HMGET user:1 name age
1) "zhangsan"
2) "26"
127.0.0.1:6379> HDEL user:1 age
(integer) 1
127.0.0.1:6379> HGETALL user:1
1) "name"
2) "zhangsan"
```

## 3. 经典模式：购物车

```bash
# 加购/加数量：字段=商品ID，值=数量，HINCRBY 原子累加
HINCRBY cart:u42 product:1001 2
HINCRBY cart:u42 product:1001 1
HGET cart:u42 product:1001
# 返回: "3"

# 减数量/移除
HINCRBY cart:u42 product:1001 -1
HDEL cart:u42 product:1001      # 数量归零后删字段

# 购物车商品数与全量渲染
HLEN cart:u42
HGETALL cart:u42
```

字段级过期（7.4+）让它进一步覆盖「购物车商品 30 分钟未结算自动失效」：

```bash
HSET cart:u42 product:2002 1
HEXPIRE cart:u42 1800 FIELDS 1 product:2002
# 返回: 1) (integer) 1          ← 每个字段各自返回结果码（1=设置成功）
HTTL cart:u42 FIELDS 1 product:2002
# 返回: 1) (integer) 1798
```

## 4. 陷阱与调试

- **HGETALL 是 O(N)**：百万字段的大 Hash 一次全取会阻塞；大键用
  HSCAN 分批（见文末速查）。
- **字段过期 ≠ 键过期**：7.4+ 字段 TTL 独立于键 TTL；键上 `TTL` 仍是
  -1/键剩余时间，字段剩余时间要用 `HTTL/HPTTL`。8.0 新增
  HGETDEL/HGETEX/HSETEX 可在读写时顺带删除/续期（示例见
  《Redis 8 新特性》）。
- **值只能是字符串**：`HSET obj meta {"a":1}` 存的是文本 JSON；
  需要字段级 JSONPath 操作用 8.0 内置的 JSON 类型。
- **HSETNX 只保证单字段原子**：多字段「都不存在才写」没有对应命令，
  需要时用 MULTI/EXEC + WATCH 或 Lua。
- **HMSET 已弃用**（4.0 起）：功能被 HSET 多字段形式覆盖，新代码用 HSET。

---

## 命令速查

## 基本读写

**基本写法：HSET 设置单个字段**
`HSET <key> <field> <value>`
```bash
# 设置哈希表字段值
HSET user:1 name zhangsan
```

**基本写法：HSET 设置多个字段**
`HSET <key> <field1> <value1> <field2> <value2> [field value ...]`
```bash
# 一次性设置多个字段
HSET user:1 name zhangsan age 25 email zs@example.com
```

**基本写法：HGET 获取字段值**
`HGET <key> <field>`
```bash
# 获取哈希表指定字段值
HGET user:1 name
```

**基本写法：HMGET 批量获取字段**
`HMGET <key> <field1> <field2> [field ...]`
```bash
# 批量获取多个字段值
HMGET user:1 name age email
```

**基本写法：HGETALL 获取所有字段**
`HGETALL <key>`
```bash
# 获取哈希表所有字段和值
HGETALL user:1
```

**基本写法：HSETNX 字段不存在时设置**
`HSETNX <key> <field> <value>`
```bash
# 仅当字段不存在时设置
HSETNX user:1 status active
```

---

## 字段删除与判断

**基本写法：HDEL 删除字段**
`HDEL <key> <field1> [field2 ...]`
```bash
# 删除一个或多个字段
HDEL user:1 email
```

**基本写法：HEXISTS 判断字段是否存在**
`HEXISTS <key> <field>`
```bash
# 判断字段是否存在
HEXISTS user:1 name
```

**基本写法：HLEN 获取字段数量**
`HLEN <key>`
```bash
# 获取哈希表字段总数
HLEN user:1
```

---

## 获取字段与值

**基本写法：HKEYS 获取所有字段名**
`HKEYS <key>`
```bash
# 获取哈希表所有字段名
HKEYS user:1
```

**基本写法：HVALS 获取所有值**
`HVALS <key>`
```bash
# 获取哈希表所有字段值
HVALS user:1
```

**基本写法：HSTRLEN 获取字段值长度**
`HSTRLEN <key> <field>`
```bash
# 获取指定字段值的字节长度
HSTRLEN user:1 name
```

---

## 计数操作

**基本写法：HINCRBY 字段自增**
`HINCRBY <key> <field> <增量>`
```bash
# 哈希字段整数值自增
HINCRBY user:1 age 1
```

**基本写法：HINCRBYFLOAT 字段浮点自增**
`HINCRBYFLOAT <key> <field> <增量>`
```bash
# 哈希字段浮点数值自增
HINCRBYFLOAT product:1 price 9.9
```

---

## 批量与扫描

**基本写法：HMSET 批量设置（已弃用，推荐 HSET）**
`HMSET <key> <field1> <value1> <field2> <value2> [field value ...]`
```bash
# 批量设置多个字段（建议改用 HSET）
HMSET user:1 name zhangsan age 25
```

**基本写法：HSCAN 增量扫描**
`HSCAN <key> <游标> [MATCH <模式>] [COUNT <数量>]`
```bash
# 增量扫描哈希字段
HSCAN user:1 0 MATCH "na*" COUNT 10
```

---

## 字段过期（7.4+）

**基本写法：HEXPIRE 设置字段过期秒数**
`HEXPIRE <key> <秒> [NX|XX|GT|LT] FIELDS <数量> <field> [field ...]`
```bash
# 设置哈希字段 60 秒后过期（Redis 7.4+）
HEXPIRE user:1 60 FIELDS 1 session_token
```

**基本写法：HPEXPIRE 设置字段过期毫秒**
`HPEXPIRE <key> <毫秒> [NX|XX|GT|LT] FIELDS <数量> <field> [field ...]`
```bash
# 毫秒级字段过期（Redis 7.4+）
HPEXPIRE user:1 60000 FIELDS 1 session_token
```

**基本写法：HEXPIREAT 设置字段过期时间戳**
`HEXPIREAT <key> <Unix时间戳> [NX|XX|GT|LT] FIELDS <数量> <field> [field ...]`
```bash
# 指定时间戳过期（Redis 7.4+）
HEXPIREAT user:1 1735689600 FIELDS 1 session_token
```

**基本写法：HTTL 查看字段剩余秒数**
`HTTL <key> FIELDS <数量> <field> [field ...]`
```bash
# 查看字段剩余存活秒数（Redis 7.4+）
HTTL user:1 FIELDS 1 session_token
```

**基本写法：HPERSIST 移除字段过期**
`HPERSIST <key> FIELDS <数量> <field> [field ...]`
```bash
# 移除字段过期时间（Redis 7.4+）
HPERSIST user:1 FIELDS 1 session_token
```

---

## 实用模式

**基本写法：存储对象信息**
`HSET <对象key> <字段> <值> <字段> <值>`
```bash
# 用哈希表存储用户对象
HSET user:1001 name 张三 age 25 email zs@example.com city 北京
```

**基本写法：购物车实现**
`HINCRBY <cart:用户> <商品ID> <数量>`
```bash
# 购物车添加商品
HINCRBY cart:user1 product:1001 2
```

**基本写法：商品库存**
`HSET <stock:商品> <规格> <库存数>`
```bash
# 按规格管理库存
HSET stock:item:1001 red 50 blue 30 green 20
```

**基本写法：点赞计数**
`HINCRBY <like:文章> <用户ID> 1`
```bash
# 文章点赞计数
HINCRBY like:article:100 user:1 1
```

**基本写法：部分更新对象**
`HSET <key> <字段> <新值>`
```bash
# 仅更新对象的某个字段
HSET user:1001 email new@example.com
```

---

## 性能建议

**基本写法：避免 HGETALL 大哈希**
`HSCAN <key> <游标> [COUNT <数量>]`
```bash
# 大哈希表使用 HSCAN 避免阻塞
HSCAN big:hash 0 COUNT 100
```

**基本写法：使用 HGET 替代 HGETALL**
`HGET <key> <field>`
```bash
# 仅获取需要的字段而非全部
HGET user:1 name
```
