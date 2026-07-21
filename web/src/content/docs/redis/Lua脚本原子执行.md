---
order: 106
title: Lua脚本原子执行
module: redis
category: database
difficulty: advanced
description: 'Redis Lua 脚本原子执行机制：EVAL/EVALSHA、脚本缓存、沙箱限制、调试与性能优化。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'redis/Redis-Cluster哈希槽'
  - redis/管道与事务原子性
  - redis/缓存穿透击穿雪崩
  - redis/内存淘汰策略
prerequisites:
  - redis/概述与核心数据结构
---

## 1. Lua 脚本基础

### 1.1 为什么需要 Lua 脚本

Redis 执行 Lua 脚本时，整个脚本是**原子性**的——脚本执行期间不会插入其他客户端命令：

```
普通方式:
  GET key → 应用层计算 → SET key  ← 中间可能被其他客户端修改

Lua 脚本:
  EVAL "local v = redis.call('GET', KEYS[1]); ..." 1 key
  ← 整个过程原子执行，不会被中断
```

### 1.2 EVAL 命令

```redis
EVAL script numkeys key [key ...] arg [arg ...]

-- script: Lua 脚本
-- numkeys: 键的数量
-- key: 键名列表（通过 KEYS[1], KEYS[2]... 访问）
-- arg: 参数列表（通过 ARGV[1], ARGV[2]... 访问）
```

### 1.3 基本示例

```redis
-- 简单的 GET + SET
EVAL "redis.call('SET', KEYS[1], ARGV[1]); return 'OK'" 1 mykey myvalue

-- 限流器
EVAL "
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  if count > tonumber(ARGV[2]) then
    return 0
  end
  return 1
" 1 rate_limit:user1 60 100
```

## 2. redis.call 与 redis.pcall

### 2.1 区别

| 函数          | 错误处理 | 行为                   |
| ------------- | -------- | ---------------------- |
| `redis.call`  | 抛出错误 | 脚本终止，返回错误     |
| `redis.pcall` | 捕获错误 | 返回错误对象，脚本继续 |

```lua
-- redis.call: 错误时脚本终止
local val = redis.call('INCR', 'non_numeric_key')  -- 如果key不是整数，报错终止

-- redis.pcall: 错误时返回错误表
local result = redis.pcall('INCR', 'non_numeric_key')
if type(result) == 'table' and result.err then
    -- 处理错误
    redis.call('SET', 'error_log', result.err)
end
```

### 2.2 返回值类型映射

| Redis 返回 | Lua 类型 | 示例              |
| ---------- | -------- | ----------------- |
| 状态回复   | table    | `{ok="OK"}`       |
| 错误回复   | table    | `{err="ERR ..."}` |
| 整数       | number   | `42`              |
| 字符串     | string   | `"hello"`         |
| 多行字符串 | table    | `{"a","b"}`       |
| 空回复     | false    | `false`           |

## 3. EVALSHA 与脚本缓存

### 3.1 脚本缓存机制

```
1. 首次 EVAL: 脚本被计算 SHA1 并缓存
2. 后续 EVALSHA: 只发送 SHA1，减少网络传输

SHA1 = SHA1(script)
```

### 3.2 EVALSHA 使用

```redis
-- 加载脚本到缓存
SCRIPT LOAD "return redis.call('GET', KEYS[1])"
-- 返回: "a1b2c3d4..." (SHA1)

-- 使用 SHA1 执行
EVALSHA a1b2c3d4... 1 mykey
```

### 3.3 脚本缓存管理

```redis
-- 检查脚本是否在缓存中
SCRIPT EXISTS a1b2c3d4... e5f6g7h8...
-- 返回: 1 0 (第一个存在，第二个不存在)

-- 清空所有脚本缓存
SCRIPT FLUSH

-- 清空并同步（Redis 7.0+）
SCRIPT FLUSH SYNC
SCRIPT FLUSH ASYNC
```

### 3.4 客户端最佳实践

```python
# Python: 自动 EVAL → EVALSHA 降级
r = redis.Redis()

# redis-py 内部自动处理:
# 1. 计算 script 的 SHA1
# 2. 尝试 EVALSHA
# 3. 如果 NOSCRIPT 错误 → 降级为 EVAL
script = r.register_script("""
    local stock = tonumber(redis.call('GET', KEYS[1]))
    if stock and stock > 0 then
        redis.call('DECR', KEYS[1])
        return 1
    end
    return 0
""")
result = script(keys=['stock:item1'])
```

## 4. Lua 沙箱限制

### 4.1 安全限制

```lua
-- 禁止的操作:
os.execute('rm -rf /')   -- 禁止系统调用
io.open('/etc/passwd')    -- 禁止文件操作
require('socket')         -- 禁止加载模块

-- 允许的函数:
redis.call()              -- 调用 Redis 命令
redis.pcall()             -- 调用 Redis 命令（安全模式）
redis.log()               -- 写日志
redis.sha1hex()           -- SHA1 计算
redis.status_reply()      -- 构造状态回复
redis.error_reply()       -- 构造错误回复
cjson.encode()            -- JSON 编码
cjson.decode()            -- JSON 解码
cmsgpack.pack()           -- MessagePack 编码
cmsgpack.unpack()         -- MessagePack 解码
```

### 4.2 时间限制

```redis
-- Lua 脚本最大执行时间（毫秒），0=无限制
lua-time-limit 5000

-- 超时后:
-- 1. 其他客户端收到 BUSY 错误
-- 2. 可执行 SCRIPT KILL 终止脚本
-- 3. 如果脚本正在写入，只能 shutdown nosave
```

### 4.3 确定性限制（Redis 7.0+）

Redis 7.0 引入**效果复制**（effect replication），脚本默认必须确定性：

```lua
-- 非确定性脚本（每次执行结果不同）
math.random()              -- 禁止
redis.call('TIME')         -- 禁止
redis.call('SRANDMEMBER')  -- 禁止

-- 如果需要非确定性，使用 redis.set_repl()
redis.set_repl(redis.REPL_ALL)  -- 默认，复制所有写命令
redis.set_repl(redis.REPL_NONE) -- 不复制
```

## 5. 实战模式

### 5.1 分布式锁释放

```lua
-- 原子性检查并释放锁
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0
```

### 5.2 限流器（滑动窗口）

```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count < limit then
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
    redis.call('PEXPIRE', key, window)
    return 1
end
return 0
```

### 5.3 库存扣减

```lua
local stock_key = KEYS[1]
local user_key = KEYS[2]
local user_id = ARGV[1]
local quantity = tonumber(ARGV[2])

-- 检查是否已购买
if redis.call('SISMEMBER', user_key, user_id) == 1 then
    return -1  -- 已购买
end

-- 检查库存
local stock = tonumber(redis.call('GET', stock_key))
if not stock or stock < quantity then
    return 0  -- 库存不足
end

-- 扣减库存 + 记录用户
redis.call('DECRBY', stock_key, quantity)
redis.call('SADD', user_key, user_id)
return 1  -- 成功
```
