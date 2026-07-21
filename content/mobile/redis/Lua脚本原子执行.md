# Lua 脚本原子执行

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

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
