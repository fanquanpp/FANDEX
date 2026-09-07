---
order: 290
title: Redis 7.0+ 新特性命令速查手册
module: 'redis'
category: 数据库
difficulty: beginner
description: Redis 7.0+ 新特性命令速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## Redis Functions（7.0+）

**基本写法：FUNCTION LOAD 加载函数库**
`FUNCTION LOAD [REPLACE] '#!lua name=<库名> ...'`
```redis
-- Redis 7.0 用 Function 替代 Lua 脚本，可持久化、可读
FUNCTION LOAD "#!lua name=mylib
redis.register_function('myset',
  function(keys, args)
    redis.call('SET', keys[1], args[1])
    redis.call('EXPIRE', keys[1], args[2])
    return redis.call('GET', keys[1])
  end
)"

-- REPLACE 覆盖同名库
FUNCTION LOAD REPLACE "#!lua name=mylib ..."

-- 调用函数
FCALL myset 1 mykey myvalue 60
-- 参数：函数名 key数量 key... arg...
```

---

**基本写法：FUNCTION 管理命令**
`FUNCTION LIST | DUMP | RESTORE | DELETE | STATS`
```redis
-- 列出所有函数库
FUNCTION LIST
FUNCTION LIST WITHCODE          -- 显示代码

-- 导出函数库（二进制）
FUNCTION DUMP

-- 恢复函数库
FUNCTION RESTORE <serialized> [FLUSH|APPEND|REPLACE]

-- 删除函数库
FUNCTION DELETE mylib

-- 查看函数执行统计
FUNCTION STATS
-- 返回：running_script, engines
```

---

**基本写法：FCALL vs EVAL 对比**
`FCALL <函数> <key数> ... | EVAL <脚本> <key数> ...`
```redis
-- 传统 Lua 脚本（每次传输脚本，重启缓存丢失）
EVAL 'return redis.call('GET', KEYS[1])' 1 mykey

-- Redis Function（持久化、可读、可管理）
FCALL my_get 1 mykey

-- 优势对比：
-- 持久化：Function 随 RDB/AOF 持久化，重启不丢；Lua 重启丢失需重新 LOAD
-- 主从复制：Function 定义复制到从库；Lua 脚本内容复制
-- 可读性：函数名 vs SHA1 哈希
-- RESP3：Function 可返回 Map/Set 类型
```

---

## Sharded Pub/Sub（7.0+）

**基本写法：SSUBSCRIBE / SPUBLISH**
`SSUBSCRIBE <频道> | SPUBLISH <频道> <消息>`
```redis
-- 分片发布订阅：消息只在频道所属分片传播，不广播全集群
-- 订阅分片频道（必须连接拥有该频道槽位的节点）
SSUBSCRIBE orders

-- 发布到分片频道
SPUBLISH orders '{"id":123}'

-- 返回收到消息的订阅者数
-- 优势：集群环境下线性扩展吞吐量
-- 限制：不支持 PSUBSCRIBE 模式订阅
```

---

**基本写法：Hash Tag 共址订阅**
`SSUBSCRIBE {user100}.events`
```redis
-- 用 Hash Tag 确保相关频道在同一分片
SSUBSCRIBE {user100}.events
SPUBLISH {user100}.events 'login'

-- 查看分片频道订阅（在所属节点执行）
PUBSUB SHARDCHANNELS orders*
PUBSUB SHARDNUMSUB orders
```

---

## Multi-Part AOF（7.0+）

**基本写法：AOF 多文件结构**
`appendonly yes`
```conf
# Redis 7.0 AOF 重构为多文件结构
appendonly yes
appenddirname "appendonlydir"

# 文件结构：
# appendonlydir/
#   appendonly.aof.manifest          -- 清单
#   appendonly.aof.1.base.rdb        -- Base：RDB 格式全量快照
#   appendonly.aof.1.incr.aof        -- 增量 AOF
#   appendonly.aof.2.incr.aof        -- 下一个增量

# 优势：
# - 重写时无需大内存缓冲区
# - 增量文件轮转，渐进清理
# - 可选择性恢复
```

---

**基本写法：AOF 相关命令**
`BGREWRITEAOF | CONFIG SET auto-aof-rewrite-percentage`
```redis
-- 手动触发 AOF 重写
BGREWRITEAOF

-- 自动重写触发条件
CONFIG SET auto-aof-rewrite-percentage 100
CONFIG SET auto-aof-rewrite-min-size 64mb

-- AOF 策略
CONFIG SET appendfsync everysec    -- always|everysec|no
```

---

## listpack 全面替代 ziplist（7.0+）

**基本写法：listpack 配置**
`hash-max-listpack-entries | zset-max-listpack-entries`
```conf
# Redis 7.0 用 listpack 替代 ziplist，消除连锁更新问题
hash-max-listpack-entries 512
hash-max-listpack-value 64
zset-max-listpack-entries 128
zset-max-listpack-value 64
list-max-listpack-size -2
stream-node-max-bytes 4096

# 旧的 ziplist 配置自动忽略
# hash-max-ziplist-entries (已废弃)
```

---

**基本写法：查看编码**
`OBJECT ENCODING <key>`
```redis
-- 小数据用 listpack 编码，大数据用 hashtable/skiplist
SET k v
OBJECT ENCODING k    -- listpack（小）或 skiplist（大）

-- listpack 优势：
-- 无 prevlen 字段，彻底消除连锁更新
-- 高并发写入下无延迟抖动
```

---

## ACL v2（7.0+）

**基本写法：Selector 选择器**
`ACL SETUSER <用户> on >pwd (<规则组1>) (<规则组2>)`
```redis
-- ACL v2 支持多组规则，根规则或任一 selector 匹配即允许
ACL SETUSER dev on >pwd \
  (~dev:* +@all) \
  (~prod:* +@read -@dangerous)

-- 频道权限独立控制
ACL SETUSER sub on >pwd &channel:* +@pubsub

-- 查看 selector
ACL GETUSER dev
-- 返回 selectors 字段列出所有选择器
```

---

## Redis 7.2 新特性

**基本写法：JSON.MERGE / JSON.MSET（RedisJSON 2.6+）**
`JSON.MERGE <key> <path> <value> | JSON.MSET <key> <path> <value> ...`
```redis
-- JSON.MERGE 合并值到匹配路径
JSON.SET doc $ {"a":1,"b":{"c":2}}
JSON.MERGE doc $.b {"d":3}
-- 结果：{"a":1,"b":{"c":2,"d":3}}

-- JSON.MSET 批量设置
JSON.MSET k1 $.a 1 k2 $.a 2 k3 $.a 3
```

---

**基本写法：地理多边形搜索（7.2）**
`GEOSEARCH <key> FROBMEMBER <成员> BYRADIUS ... | ...`
```redis
-- Redis 7.2 RedisSearch 支持多边形地理查询
-- 基础 GEOSEARCH（圆形）
GEOSEARCH stores FROMLONLAT 116.40 39.90 BYRADIUS 5 km ASC

-- 多边形搜索（需 RedisSearch 模块）
FT.SEARCH idx '@location:[POLYGON 116.38 39.88 116.42 39.88 116.42 39.92 116.38 39.92]'
```

---

**基本写法：sorted set 性能提升**
`ZADD | ZRANGE（7.2 优化）`
```redis
-- Redis 7.2 sorted set 性能提升 30%~100%
-- 命令语法不变，底层优化
ZADD leaderboard 100 'Alice' 200 'Bob'
ZRANGE leaderboard 0 9 WITHSCORES REV
```

---

## Redis 7.4 新特性预览

**基本写法：Hash 字段过期（7.4+）**
`HEXPIRE <key> <秒> FIELDS <n> <字段> | HTTL <key> FIELDS <n> <字段>`
```redis
-- Redis 7.4 支持 Hash 单字段过期
HEXPIRE user:1001 3600 FIELDS 1 session_token
HTTL user:1001 FIELDS 1 session_token
HPERSIST user:1001 FIELDS 1 session_token

-- 字段过期后自动删除，不影响其他字段
```
