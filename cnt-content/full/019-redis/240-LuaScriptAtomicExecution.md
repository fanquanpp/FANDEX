---
order: 300
title: Lua 脚本原子执行
module: 'redis'
category: 数据库
difficulty: advanced
description: Redis Lua 脚本原子执行机制：EVAL/EVALSHA、脚本缓存、沙箱限制、调试与性能优化。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'redis/220-RedisClusterHashSlot'
  - 'redis/230-PipeTransactionAtomic'
  - 'redis/120-CachePenetrationBreakdownAvalanche'
  - 'redis/130-MemoryEvictionPolicy'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---



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
-- 该配置的新名字是 busy-reply-threshold（7.0+），旧名仍是别名、两者等价

-- 超时后:
-- 1. 其他客户端收到 BUSY 错误
-- 2. 可执行 SCRIPT KILL 终止脚本
-- 3. 如果脚本正在写入，只能 shutdown nosave
```

### 4.3 复制模式：效果复制（5.0 默认，7.0 起唯一模式）

脚本在主库执行后怎么同步到从库/AOF？两种历史模式：

- **逐字复制**（verbatim，老模式）：把整个脚本原文发过去，从库再执行一遍——要求脚本本身确定性，非确定命令会让主从结果不一致；
- **效果复制**（effect replication）：只把脚本**实际产生的写命令**复制过去——`TIME`、`SRANDMEMBER`、`math.random()` 这类非确定命令的返回值在主库落定后，变成一条条确定的写命令同步出去。

变迁时间线：3.2 引入效果复制（需显式调 `redis.replicate_commands()`）→ 5.0 起默认开启 → 7.0 移除逐字复制，效果复制成为**唯一模式**。所以「脚本里不能调 TIME/random」是逐字复制时代的老约束，7.0+ 已不存在：

```lua
-- 7.0+ 这些都是合法的（老教程标「禁止」的写法已过时）
redis.call('TIME')
redis.call('SRANDMEMBER', 'myset')
math.random()

-- 剩下可控的是「效果要不要复制」：
redis.set_repl(redis.REPL_ALL)   -- 默认：复制给从库并写 AOF
redis.set_repl(redis.REPL_REPLICA) -- 只复制给从库、不写 AOF
redis.set_repl(redis.REPL_AOF)   -- 只写 AOF、不复制给从库
redis.set_repl(redis.REPL_NONE)  -- 不复制任何效果
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

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：Lua 脚本的原子性从哪来？它与「执行很快」是不是一回事？

参考答案（先自己答，再对照）：原子性来自 Redis 单线程命令执行——脚本作为一条命令排队，执行期间不会插入其他客户端的命令，脚本内的多次读写对外是「一步」。它与「快」无关：脚本里跑 10 秒的循环，这 10 秒所有其他请求都在等（超过 busy-reply-threshold 后其他客户端收到 BUSY）——原子但不快，是脚本最常见的滥用。

2. 动手自问：EVAL 与 EVALSHA 的分工是什么？客户端的「NOSCRIPT 回落」具体在回落什么？

参考答案（先自己答，再对照）：EVAL 每次传脚本全文（首次执行顺便缓存，返回 SHA1）；EVALSHA 只传 SHA1，省传输——前提是脚本已在服务端缓存。脚本缓存是纯内存的，主库重启或 SCRIPT FLUSH 后全部失效：客户端调 EVALSHA 收到 NOSCRIPT 错误，就回落用 EVAL 重发全文（顺便重新缓存）。redis-py 的 register_script 把这套降级封装好了。

3. 判断题：Redis 7+ 的脚本里不能调用 TIME 和 math.random。

参考答案（先自己答，再对照）：错，这是逐字复制时代的老约束。5.0 起默认效果复制、7.0 起逐字复制被移除——脚本复制的是「实际产生的写命令」，非确定命令的结果在主库落定后原样同步，所以 TIME/SRANDMEMBER/math.random 都合法。剩下可控的是 redis.set_repl() 决定效果复制给谁（从库/AOF/都不）。

4. 概念自问：redis.call 与 redis.pcall 的选择标准是什么？错误处理分别长什么样？

参考答案（先自己答，再对照）：redis.call 遇到命令错误直接终止脚本并把错误返回给调用方——用于「错就是错」的路径；redis.pcall 返回错误表（{err=...}）让脚本继续执行——用于「想兜住某些预期内的失败」（比如探测键类型再分支）。标准：错误是否是业务逻辑的一部分，是则 pcall 接住处理，否则让它终止。

5. 动手自问：写出「检查库存并扣减、扣完返回 0、重复购买返回 -1」的原子脚本骨架，并说出它在集群模式下对 KEYS 的约束。

参考答案（先自己答，再对照）：`local stock = tonumber(redis.call('GET', KEYS[1]))` 判断，不足返回 0；`redis.call('SISMEMBER', KEYS[2], ARGV[1])` 为 1 返回 -1；否则 DECRBY + SADD 返回 1。集群约束：脚本涉及的所有键必须落在同一槽——KEYS[1]/KEYS[2] 要用同一个哈希标签（如 `stock:{item1}` 与 `users:{item1}`），否则报 CROSSSLOT；键一律从 KEYS[] 取、参数从 ARGV[] 取，不要把键名硬编码进脚本正文（这会让集群与 ACL 分析失效）。

## EVAL 命令

**基本写法：执行 Lua 脚本**
`EVAL <script> <numkeys> <key> [key ...] <arg> [arg ...]`
```bash
# 执行简单的 GET + SET 脚本
EVAL "redis.call('SET', KEYS[1], ARGV[1]); return 'OK'" 1 mykey myvalue
```

**基本写法：原子性限流器**
`EVAL <script> 1 <key> <expire> <limit>`
```bash
# 使用 Lua 脚本实现原子性限流器
EVAL "local count = redis.call('INCR', KEYS[1]) if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end if count > tonumber(ARGV[2]) then return 0 end return 1" 1 rate_limit:user1 60 100
```

---

## redis.call 与 redis.pcall

**基本写法：redis.call 错误时脚本终止**
`redis.call(<command>, <args>)`
```lua
-- redis.call 遇到错误时脚本终止
local val = redis.call('INCR', 'non_numeric_key')
```

**基本写法：redis.pcall 错误时返回错误表**
`redis.pcall(<command>, <args>)`
```lua
-- redis.pcall 遇到错误时返回错误表，脚本继续执行
local result = redis.pcall('INCR', 'non_numeric_key')
if type(result) == 'table' and result.err then
    redis.call('SET', 'error_log', result.err)
end
```

---

## EVALSHA 与脚本缓存

**基本写法：加载脚本到缓存**
`SCRIPT LOAD <script>`
```bash
# 加载脚本到缓存，返回 SHA1 校验和
SCRIPT LOAD "return redis.call('GET', KEYS[1])"
```

**基本写法：使用 SHA1 执行缓存脚本**
`EVALSHA <sha1> <numkeys> <key> [key ...] <arg> [arg ...]`
```bash
# 使用 SHA1 执行已缓存的脚本
EVALSHA a1b2c3d4e5f6 1 mykey
```

**单脚本写法：检查单个脚本是否在缓存中**
`SCRIPT EXISTS <sha1>`
```bash
# 检查单个脚本是否在缓存中
SCRIPT EXISTS a1b2c3d4e5f6
```

**多脚本写法：检查多个脚本是否在缓存中**
`SCRIPT EXISTS <sha1> [sha1 ...]`
```bash
# 检查多个脚本是否在缓存中
SCRIPT EXISTS a1b2c3d4e5f6 f7g8h9i0j1k2
```

**基本写法：清空脚本缓存**
`SCRIPT FLUSH`
```bash
# 清空所有脚本缓存
SCRIPT FLUSH
```

**基本写法：同步清空脚本缓存**
`SCRIPT FLUSH SYNC`
```bash
# 同步方式清空脚本缓存（Redis 7.0+）
SCRIPT FLUSH SYNC
```

**基本写法：异步清空脚本缓存**
`SCRIPT FLUSH ASYNC`
```bash
# 异步方式清空脚本缓存（Redis 7.0+）
SCRIPT FLUSH ASYNC
```

**基本写法：Python EVALSHA 自动降级**
`r.register_script(<script>)`
```python
# Python redis-py 自动处理 EVAL 到 EVALSHA 的降级
import redis
r = redis.Redis()

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

---

## Lua 沙箱限制

**基本写法：调用 Redis 命令**
`redis.call(<command>, <args>)`
```lua
-- 在 Lua 脚本中调用 Redis 命令
redis.call('SET', 'key', 'value')
```

**基本写法：安全模式调用 Redis 命令**
`redis.pcall(<command>, <args>)`
```lua
-- 安全模式调用 Redis 命令，错误时不终止脚本
redis.pcall('GET', 'key')
```

**基本写法：写日志**
`redis.log(<level>, <message>)`
```lua
-- 在 Lua 脚本中写日志
redis.log(redis.LOG_WARNING, 'something went wrong')
```

**基本写法：SHA1 计算**
`redis.sha1hex(<string>)`
```lua
-- 计算字符串的 SHA1 哈希值
local hash = redis.sha1hex('hello')
```

**基本写法：构造状态回复**
`redis.status_reply(<message>)`
```lua
-- 构造状态回复
return redis.status_reply('OK')
```

**基本写法：构造错误回复**
`redis.error_reply(<message>)`
```lua
-- 构造错误回复
return redis.error_reply('something went wrong')
```

**基本写法：JSON 编码**
`cjson.encode(<value>)`
```lua
-- 将 Lua 表编码为 JSON 字符串
local json_str = cjson.encode({name='redis', version=7})
```

**基本写法：JSON 解码**
`cjson.decode(<json_string>)`
```lua
-- 将 JSON 字符串解码为 Lua 表
local data = cjson.decode('{"name":"redis","version":7}')
```

**基本写法：MessagePack 编码**
`cmsgpack.pack(<value>)`
```lua
-- 将 Lua 表编码为 MessagePack 二进制
local packed = cmsgpack.pack({1, 2, 3})
```

**基本写法：MessagePack 解码**
`cmsgpack.unpack(<packed_string>)`
```lua
-- 将 MessagePack 二进制解码为 Lua 表
local data = cmsgpack.unpack(packed_string)
```

**禁止写法：系统调用**
`os.execute(<command>)`
```lua
-- 沙箱禁止系统调用
os.execute('rm -rf /')
```

**禁止写法：文件操作**
`io.open(<path>)`
```lua
-- 沙箱禁止文件操作
io.open('/etc/passwd')
```

**禁止写法：加载模块**
`require(<module>)`
```lua
-- 沙箱禁止加载外部模块
require('socket')
```

**基本写法：设置脚本最大执行时间**
`lua-time-limit <ms>`
```bash
# 配置 Lua 脚本最大执行时间为5000毫秒
lua-time-limit 5000
```

**基本写法：复制所有写命令（默认）**
`redis.set_repl(redis.REPL_ALL)`
```lua
-- 默认行为，复制所有写命令到从节点
redis.set_repl(redis.REPL_ALL)
```

**基本写法：不复制写命令**
`redis.set_repl(redis.REPL_NONE)`
```lua
-- 不复制写命令到从节点
redis.set_repl(redis.REPL_NONE)
```

---

## 实战模式

**基本写法：分布式锁释放**
`EVAL <script> 1 <lock_key> <lock_value>`
```bash
# 原子性检查并释放分布式锁
EVAL "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0" 1 lock:resource1 my_token
```

**基本写法：滑动窗口限流器**
`EVAL <script> 1 <key> <limit> <window> <now>`
```bash
# 基于 ZSET 实现滑动窗口限流
EVAL "local key = KEYS[1] local limit = tonumber(ARGV[1]) local window = tonumber(ARGV[2]) local now = tonumber(ARGV[3]) redis.call('ZREMRANGEBYSCORE', key, 0, now - window) local count = redis.call('ZCARD', key) if count < limit then redis.call('ZADD', key, now, now .. '-' .. math.random(1000000)) redis.call('PEXPIRE', key, window) return 1 end return 0" 1 rate_limit:user1 100 60000 1718334600000
```

**基本写法：库存扣减**
`EVAL <script> 2 <stock_key> <user_key> <user_id> <quantity>`
```bash
# 原子性检查库存并扣减
EVAL "local stock_key = KEYS[1] local user_key = KEYS[2] local user_id = ARGV[1] local quantity = tonumber(ARGV[2]) if redis.call('SISMEMBER', user_key, user_id) == 1 then return -1 end local stock = tonumber(redis.call('GET', stock_key)) if not stock or stock < quantity then return 0 end redis.call('DECRBY', stock_key, quantity) redis.call('SADD', user_key, user_id) return 1" 2 stock:item1 users:item1 user42 1
```
