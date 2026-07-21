---
order: 4
title: 缓存策略与高级特性
module: redis
category: Redis
difficulty: intermediate
description: 过期键删除、内存淘汰策略、事务与乐观锁、Lua脚本、发布订阅、管道、客户端缓存、ACL、TLS、慢查询日志。
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/持久化与模块
  - redis/集群与高可用
  - redis/语法速查
  - redis/位图
prerequisites: []
---

## 1. 过期键删除

### 1.1 删除策略

```
Redis 采用惰性删除 + 定期删除的组合策略:

1. 惰性删除（Lazy Expiration）:
   - 访问键时检查是否过期
   - 过期则删除并返回空
   - 优点: CPU 友好
   - 缺点: 过期键不被访问则一直占用内存

2. 定期删除（Periodic Expiration）:
   - 每 100ms 执行一次
   - 随机抽取 20 个设置了过期的键
   - 删除其中已过期的键
   - 如果过期比例 > 25%，重复执行
   - 限制: 每次执行时间不超过 25ms（默认）
```

### 1.2 过期时间设置

```bash
# 设置过期时间
EXPIRE key 3600                    # 3600 秒后过期
PEXPIRE key 3600000                # 3600000 毫秒后过期
EXPIREAT key 1704153600            # Unix 时间戳过期
TTL key                            # 查看剩余秒数
PTTL key                           # 查看剩余毫秒数

# SET 时指定过期
SET key value EX 3600              # 3600 秒过期
SET key value PX 3600000           # 毫秒过期
SETEX key 3600 value               # 等效 SET + EXPIRE

# 取消过期
PERSIST key                        # 移除过期时间，变为永久键

# 注意: 过期时间精度为毫秒级
```

## 2. 内存淘汰策略

### 2.1 八种淘汰策略

| 策略            | 淘汰范围 | 说明                       |
| :-------------- | :------- | :------------------------- |
| noeviction      | 不淘汰   | 写操作报错（默认）         |
| allkeys-lru     | 所有键   | 最近最少使用               |
| allkeys-lfu     | 所有键   | 最少频率使用（Redis 4.0+） |
| allkeys-random  | 所有键   | 随机淘汰                   |
| volatile-lru    | 有过期键 | 最近最少使用               |
| volatile-lfu    | 有过期键 | 最少频率使用               |
| volatile-random | 有过期键 | 随机淘汰                   |
| volatile-ttl    | 有过期键 | 优先淘汰 TTL 最短的        |

### 2.2 策略选择

```
决策流程:
  是否有明确的热数据/冷数据区分?
    ├── 是 → allkeys-lru 或 allkeys-lfu
    │         有频率统计需求? → allkeys-lfu
    │         否则 → allkeys-lru
    └── 否 → 是否所有键都可能被访问?
              ├── 是 → noeviction（增加内存）
              └── 否 → allkeys-random

  是否有明确可丢弃的数据（设置了过期）?
    └── 是 → volatile-ttl 或 volatile-lru

   volatile-* 策略: 如果没有键设置过期，等同于 noeviction
```

### 2.3 内存配置

```ini
# redis.conf
maxmemory 4gb                     # 最大内存限制
maxmemory-policy allkeys-lfu      # 淘汰策略
maxmemory-samples 5               # LRU/LFU 采样数（越大越精确，越慢）

# LFU 配置
lfu-log-factor 10                 # 计数器增长因子（越大越慢增长）
lfu-decay-time 1                  # 衰减时间（分钟）
```

## 3. 事务

### 3.1 MULTI/EXEC 事务

```bash
# Redis 事务: 将命令打包，一次性顺序执行
MULTI
SET account:A 800
SET account:B 200
INCR account:A
EXEC

# 事务中的错误:
# 1. 命令语法错误 → 整个事务取消
# 2. 运行时错误（如对字符串 INCR）→ 仅该命令失败，其余继续执行

# DISCARD 放弃事务
MULTI
SET key1 val1
DISCARD       # 放弃所有排队命令
```

### 3.2 乐观锁（WATCH/CAS）

```bash
# WATCH: 监控键，若被其他客户端修改则事务失败
WATCH account:A

balance = GET account:A       # 读取余额
new_balance = balance - 100   # 计算新余额

MULTI
SET account:A new_balance
EXEC                          # 如果 account:A 被修改，返回 nil（事务失败）

# 乐观锁实现秒杀
WATCH stock:product:123
stock = GET stock:product:123
if stock > 0:
    MULTI
    DECR stock:product:123
    EXEC      # 成功则返回结果，失败则重试
else:
    UNWATCH
```

```python
# Python 乐观锁示例
import redis

r = redis.Redis()

def transfer(from_key, to_key, amount, max_retries=10):
    for i in range(max_retries):
        try:
            pipe = r.pipeline()
            pipe.watch(from_key)
            balance = int(pipe.get(from_key) or 0)
            if balance < amount:
                pipe.unwatch()
                return False
            pipe.multi()
            pipe.decrby(from_key, amount)
            pipe.incrby(to_key, amount)
            pipe.execute()
            return True
        except redis.WatchError:
            continue
    return False
```

## 4. Lua 脚本

### 4.1 基本语法

```bash
# EVAL 执行 Lua 脚本
EVAL "return redis.call('SET', KEYS[1], ARGV[1])" 1 mykey myvalue
# 参数: script numkeys key [key...] arg [arg...]

# EVALSHA 使用脚本 SHA1（避免重复传输）
SCRIPT LOAD "return redis.call('SET', KEYS[1], ARGV[1])"
# 返回: "c686f316aaf1eb01d5a4de1b0b63cd233010e63d"
EVALSHA c686f316aaf1eb01d5a4de1b0b63cd233010e63d 1 mykey myvalue
```

### 4.2 分布式锁实现

```lua
-- 加锁
-- KEYS[1]: 锁名  ARGV[1]: 唯一标识  ARGV[2]: 过期时间(ms)
if redis.call('EXISTS', KEYS[1]) == 0 then
    redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2], 'NX')
    return 1
end
return 0

-- 解锁（仅锁持有者可解锁）
-- KEYS[1]: 锁名  ARGV[1]: 唯一标识
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0

-- 续期
-- KEYS[1]: 锁名  ARGV[1]: 唯一标识  ARGV[2]: 新过期时间(ms)
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 0
```

### 4.3 限流器

```lua
-- 滑动窗口限流
-- KEYS[1]: 限流键  ARGV[1]: 窗口时间(ms)  ARGV[2]: 最大请求数  ARGV[3]: 当前时间戳
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- 移除窗口外的记录
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- 当前窗口请求数
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
    redis.call('PEXPIRE', key, window)
    return 1   -- 允许
else
    return 0   -- 拒绝
end
```

## 5. 发布订阅（Pub/Sub）

### 5.1 基本用法

```bash
# 订阅频道
SUBSCRIBE channel:notifications channel:alerts

# 模式订阅
PSUBSCRIBE channel:*          # 订阅所有 channel: 开头的频道

# 发布消息
PUBLISH channel:notifications "New order received"
PUBLISH channel:alerts "Server CPU > 90%"

# 取消订阅
UNSUBSCRIBE channel:notifications
PUNSUBSCRIBE channel:*
```

### 5.2 Pub/Sub 特点

```
优点:
  - 实时推送，延迟极低
  - 支持模式匹配
  - 简单易用

缺点:
  - 不持久化（离线客户端收不到消息）
  - 无 ACK 机制（不保证送达）
  - 消息堆积影响性能
  - 不支持消费组

适用场景:
  - 实时通知
  - 配置变更广播
  - 聊天室
  - 不适合: 消息队列（用 Stream 代替）
```

### 5.3 键空间通知

```ini
# redis.conf
notify-keyspace-events ExK$g$
# E: 键事件通知
# x: 过期事件
# K: 键空间通知
# $: String 命令
# g: 通用命令（DEL/EXPIRE等）
# A: 所有事件（等同 $gshzxeK）
```

```bash
# 订阅键事件
SUBSCRIBE __keyevent@0__:expired      # 过期事件
SUBSCRIBE __keyevent@0__:del          # 删除事件
SUBSCRIBE __keyspace@0__:mykey        # mykey 的所有事件
```

## 6. 管道（Pipeline）

### 6.1 Pipeline 原理

```
普通模式:  发送命令1 → 等待响应1 → 发送命令2 → 等待响应2 → ...
           RTT × N

Pipeline:  发送命令1 → 发送命令2 → ... → 发送命令N → 接收响应1~N
           RTT × 1

性能提升:
  - 100 条命令: 普通模式 ~100ms, Pipeline ~2ms
  - 10000 条命令: 普通模式 ~10s, Pipeline ~50ms
```

### 6.2 Pipeline 使用

```python
import redis

r = redis.Redis()

# Pipeline 批量操作
pipe = r.pipeline(transaction=False)  # 非事务模式
for i in range(10000):
    pipe.set(f'key:{i}', f'value:{i}')
pipe.execute()

# Pipeline + 事务
pipe = r.pipeline(transaction=True)
pipe.set('key1', 'val1')
pipe.set('key2', 'val2')
pipe.incr('counter')
pipe.execute()

# 控制批量大小（避免内存溢出）
def batch_set(data, batch_size=1000):
    for i in range(0, len(data), batch_size):
        pipe = r.pipeline(transaction=False)
        for key, value in data[i:i+batch_size]:
            pipe.set(key, value)
        pipe.execute()
```

## 7. 客户端缓存

### 7.1 普通模式（Client-side Caching）

```bash
# Redis 6.0+ 客户端缓存
# 1. 客户端开启 tracking
CLIENT TRACKING ON

# 2. 客户端读取键
GET user:1001        # Redis 记录客户端对此键感兴趣

# 3. 其他客户端修改键
SET user:1001 "new_value"   # Redis 发送失效消息给跟踪的客户端

# 4. 客户端收到失效消息，清除本地缓存
# -> invalidation message for key: user:1001
```

### 7.2 广播模式

```bash
# 广播模式: 客户端订阅键前缀
CLIENT TRACKING ON BCAST PREFIX user: PREFIX session:

# 所有 user: 和 session: 前缀的键变更都会通知
# 不需要先 GET 才跟踪
# 适合: 客户端预先知道需要缓存哪些前缀
```

### 7.3 Python 客户端缓存

```python
import redis

r = redis.Redis()

# 使用 Redis 客户端缓存（需要支持 RESP3）
# 或使用应用层缓存 + 失效通知

class RedisCache:
    def __init__(self, redis_client):
        self.r = redis_client
        self.local_cache = {}

    def get(self, key):
        if key in self.local_cache:
            return self.local_cache[key]
        value = self.r.get(key)
        if value:
            self.local_cache[key] = value
        return value

    def invalidate(self, key):
        self.local_cache.pop(key, None)
```

## 8. ACL 访问控制

### 8.1 ACL 配置

```bash
# 查看所有用户
ACL LIST

# 添加用户
ACL SETUSER app_readonly on >ReadPass123 ~* +@read
# on: 启用  >密码  ~*: 所有键  +@read: 只读命令

ACL SETUSER app_write on >WritePass123 ~orders:* +@read +@write -@dangerous
ACL SETUSER admin on >AdminPass123 ~* +@all

# 命令类别
+@read       # 所有读命令
+@write      # 所有写命令
+@string     # String 命令
+@hash       # Hash 命令
+@list       # List 命令
+@set        # Set 命令
+@sortedset  # ZSet 命令
+@pubsub     # Pub/Sub 命令
-@dangerous  # 排除危险命令（FLUSHALL/CONFIG等）

# 键模式
~*           # 所有键
~user:*      # 仅 user: 前缀
~order:* ~product:*  # 多个模式

# 禁用危险命令
ACL SETUSER app_readonly -@dangerous -FLUSHALL -FLUSHDB -CONFIG -DEBUG
```

### 8.2 ACL 持久化

```bash
# 保存 ACL 到文件
ACL SAVE

# redis.conf 配置
aclfile /etc/redis/users.acl

# 加载 ACL 文件
ACL LOAD
```

## 9. TLS 加密

```ini
# redis.conf
tls-port 6380
tls-cert-file /etc/redis/tls/server.crt
tls-key-file /etc/redis/tls/server.key
tls-ca-cert-file /etc/redis/tls/ca.crt

# 客户端认证
tls-auth-clients optional    # no/optional/yes

# 复制 TLS
tls-replication yes

# 集群 TLS
tls-cluster yes
```

```bash
# 客户端 TLS 连接
redis-cli --tls --cert client.crt --key client.key --cacert ca.crt -p 6380

# 从节点 TLS 复制
replicaof 192.168.1.10 6380
tls-replication yes
```

## 10. 慢查询日志

### 10.1 配置

```ini
# redis.conf
slowlog-log-slower-than 10000    # 超过 10ms 记录（微秒）
slowlog-max-len 128              # 最多记录 128 条

# 设为 0: 记录所有命令
# 设为 -1: 禁用慢查询日志
```

### 10.2 查看慢查询

```bash
# 查看慢查询日志
SLOWLOG GET 10
# 返回:
# 1) 1) (integer) 12              # 日志 ID
#    2) (integer) 1704067200       # 时间戳
#    3) (integer) 15000            # 执行时间(微秒)
#    4) 1) "KEYS"                  # 命令
#       2) "*"
#    5) "192.168.1.100:52341"      # 客户端地址
#    6) ""                         # 客户端名称

# 慢查询数量
SLOWLOG LEN

# 重置慢查询
SLOWLOG RESET
```

### 10.3 常见慢查询原因

```
1. KEYS * — 全库扫描，生产禁用
2. 大 Key 操作 — DEL/GET 一个很大的值
3. 复杂聚合 — SORT、SUNION 等大集合操作
4. 全量获取 — HGETALL 大哈希、SMEMBERS 大集合
5. 短连接 — 频繁建立/断开连接
6. AOF fsync — always 模式下每条命令 fsync
7. 内存不足 — 频繁触发淘汰策略

优化建议:
- 使用 SCAN 替代 KEYS
- 拆分大 Key
- 使用 HSCAN/SSCAN 替代全量获取
- 使用 Pipeline 减少网络往返
- 监控 SLOWLOG 并告警
```
