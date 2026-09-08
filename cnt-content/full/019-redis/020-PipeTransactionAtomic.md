---
order: 200
title: 管道与事务原子性
module: 'redis'
category: 数据库
difficulty: intermediate
description: Redis Pipeline 管道与 Multi/Exec 事务：批量命令优化、事务原子性、WATCH 乐观锁与 CAS 模式。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'redis/018-SentinelElection'
  - 'redis/019-RedisClusterHashSlot'
  - 'redis/021-LuaScriptAtomicExecution'
  - 'redis/022-CachePenetrationBreakdownAvalanche'
prerequisites:
  - 'redis/001-OverviewCoreDataStructure'
---

## 1. Pipeline 管道

### 1.1 为什么需要 Pipeline

Redis 客户端与服务端通过 TCP 通信，每次命令都有网络往返延迟（RTT）：

```mermaid
sequenceDiagram
    participant C as 客户端
    participant S as 服务端
    C->>S: SET key1 val1
    S-->>C: OK
    C->>S: SET key2 val2
    S-->>C: OK
    C->>S: SET key3 val3
    S-->>C: OK
    Note over C,S: 无 Pipeline：3 RTT
```

有 Pipeline：客户端一次性发送 3 条命令，服务端返回 OK, OK, OK，总计 1 RTT

### 1.2 Pipeline 性能对比

```
10000 次 PING 命令:
  无 Pipeline: ~1s (10000 × 0.1ms RTT)
  有 Pipeline: ~2ms (1 RTT + 处理时间)

提升: ~500倍
```

### 1.3 Pipeline 使用

```python
# Python redis-py
import redis
r = redis.Redis()

# 使用 Pipeline
pipe = r.pipeline()
for i in range(10000):
    pipe.set(f'key:{i}', f'value:{i}')
pipe.execute()  # 一次性发送所有命令
```

### 1.4 Pipeline 注意事项

```
1. Pipeline 不是原子性的
   - 命令之间可能插入其他客户端的命令
   - 部分命令可能失败，其他命令仍执行

2. Pipeline 不是事务
   - 不保证隔离性
   - 不支持回滚

3. 避免超大 Pipeline
   - 一次发送过多命令会阻塞服务端
   - 建议每批 100-1000 条

4. Pipeline 命令数限制
   - Redis 输入缓冲区默认 1GB
   - 超过会被断开连接
```

## 2. 事务（Multi/Exec）

### 2.1 事务基本用法

```redis
MULTI         # 开启事务
SET key1 val1 # 命令入队
SET key2 val2 # 命令入队
INCR counter  # 命令入队
EXEC          # 执行所有命令
```

```
执行流程:
  MULTI → 事务状态
  SET key1 val1 → QUEUED
  SET key2 val2 → QUEUED
  INCR counter  → QUEUED
  EXEC → 1) OK  2) OK  3) 1
```

### 2.2 事务的 ACID 分析

| 特性   | Redis 事务         | 关系数据库事务 |
| ------ | ------------------ | -------------- |
| 原子性 | 部分（不支持回滚） | 完全支持       |
| 一致性 | 单命令一致         | 完全支持       |
| 隔离性 | 无隔离级别         | 多级隔离       |
| 持久性 | 取决于持久化配置   | 完全支持       |

### 2.3 Redis 事务的"原子性"

```
情况1: 命令语法错误 → 整个事务取消
  MULTI
  SET key1 val1
  INVALID_COMMAND   ← 语法错误
  EXEC → 报错，所有命令不执行

情况2: 命令运行时错误 → 仅错误命令失败，其他正常执行
  MULTI
  SET key1 val1
  INCR key1         ← key1 不是整数，运行时报错
  SET key2 val2
  EXEC → 1) OK  2) (error)  3) OK  ← key2 正常设置！

结论: Redis 事务不支持回滚，不保证原子性
```

### 2.4 DISCARD 取消事务

```redis
MULTI
SET key1 val1
DISCARD    # 取消事务，所有命令不执行
```

## 3. WATCH 乐观锁

### 3.1 WATCH 机制

WATCH 实现 CAS（Compare-And-Swap）乐观锁：

```redis
# 监视 key
WATCH counter

# 读取值
GET counter  # 返回 5

# 计算新值（应用层）
new_val = 5 + 1 = 6

# 开启事务
MULTI
SET counter 6
EXEC
```

**如果其他客户端在 WATCH 和 EXEC 之间修改了 counter**：

```redis
# 事务A
WATCH counter
GET counter  # 5
# 此时事务B执行: SET counter 100
MULTI
SET counter 6
EXEC         # 返回 nil（事务取消，因为 counter 被修改）
```

### 3.2 WATCH 实现秒杀

```python
import redis

def seckill(user_id, item_id):
    r = redis.Redis()
    key = f'stock:{item_id}'

    while True:
        try:
            r.watch(key)
            stock = int(r.get(key) or 0)
            if stock <= 0:
                r.unwatch()
                return False  # 库存不足

            pipe = r.pipeline()
            pipe.multi()
            pipe.decr(key)
            pipe.sadd(f'users:{item_id}', user_id)
            pipe.execute()
            return True
        except redis.WatchError:
            continue  # 重试
```

### 3.3 WATCH 的限制

```
1. WATCH 只能检测键是否被修改，不能检测具体修改内容
2. WATCH 是乐观锁，高并发下重试开销大
3. WATCH 在 EXEC 后自动取消
4. WATCH 不支持条件表达式（只能监视整个键）
```

## 4. Pipeline + 事务

### 4.1 组合使用

```python
# Pipeline 中使用事务
pipe = r.pipeline()
pipe.multi()           # 开启事务
pipe.set('key1', 'v1')
pipe.set('key2', 'v2')
pipe.incr('counter')
pipe.execute()         # 提交事务

# 等价于
pipe = r.pipeline(True)  # transaction=True
pipe.set('key1', 'v1')
pipe.set('key2', 'v2')
pipe.incr('counter')
pipe.execute()
```

### 4.2 性能对比

```
10000 次 SET 操作:

1. 逐条执行:     ~1s     (10000 RTT)
2. Pipeline:     ~2ms    (1 RTT)
3. Multi/Exec:   ~1s     (10000 RTT + 事务开销)
4. Pipeline+事务: ~3ms    (1 RTT + 事务开销)

结论: Pipeline+事务 兼顾性能与原子性
```

## 5. 替代方案

### 5.1 Lua 脚本

需要真正原子性时，使用 Lua 脚本：

```redis
-- 原子性秒杀
local stock = tonumber(redis.call('GET', KEYS[1]))
if stock and stock > 0 then
    redis.call('DECR', KEYS[1])
    redis.call('SADD', KEYS[2], ARGV[1])
    return 1
end
return 0
```

### 5.2 方案选择

| 场景                 | 推荐方案       |
| -------------------- | -------------- |
| 批量写入，无需原子性 | Pipeline       |
| 多命令需原子执行     | Multi/Exec     |
| 条件更新（CAS）      | WATCH + Multi  |
| 复杂原子操作         | Lua 脚本       |
| 高并发 CAS           | 分布式锁 + Lua |
## Pipeline 管道

**基本写法：Python 批量发送命令减少 RTT**
`pipe = r.pipeline()`
```python
# Python redis-py 使用 Pipeline 批量发送命令
import redis
r = redis.Redis()

pipe = r.pipeline()
for i in range(10000):
    pipe.set(f'key:{i}', f'value:{i}')
pipe.execute()
```

---

## 事务基本用法

**基本写法：开启并提交事务**
`MULTI ... EXEC`
```bash
# 开启事务，命令入队后统一执行
MULTI
SET key1 val1
SET key2 val2
INCR counter
EXEC
```

**基本写法：取消事务**
`MULTI ... DISCARD`
```bash
# 取消事务，所有入队命令不执行
MULTI
SET key1 val1
DISCARD
```

---

## WATCH 乐观锁

**基本写法：CAS 乐观锁**
`WATCH <key> [key ...] ... MULTI ... EXEC`
```bash
# 监视 counter 键，读取后开启事务设置新值
WATCH counter
GET counter
MULTI
SET counter 6
EXEC
```

**基本写法：被监视键被修改时事务失败**
`WATCH <key> ... MULTI ... EXEC`
```bash
# 事务A监视counter，事务B修改counter后事务A的EXEC返回nil
WATCH counter
GET counter
MULTI
SET counter 6
EXEC
```

**基本写法：Python WATCH 秒杀乐观锁重试**
`r.watch(<key>)`
```python
# Python 乐观锁重试秒杀
import redis

def seckill(user_id, item_id):
    r = redis.Redis()
    key = f'stock:{item_id}'

    while True:
        try:
            r.watch(key)
            stock = int(r.get(key) or 0)
            if stock <= 0:
                r.unwatch()
                return False

            pipe = r.pipeline()
            pipe.multi()
            pipe.decr(key)
            pipe.sadd(f'users:{item_id}', user_id)
            pipe.execute()
            return True
        except redis.WatchError:
            continue
```

---

## Pipeline + 事务

**基本写法：Pipeline 中使用事务**
`pipe.multi()`
```python
# Pipeline 中开启事务，兼顾性能与原子性
pipe = r.pipeline()
pipe.multi()
pipe.set('key1', 'v1')
pipe.set('key2', 'v2')
pipe.incr('counter')
pipe.execute()
```

**基本写法：Pipeline 事务模式快捷方式**
`pipe = r.pipeline(True)`
```python
# transaction=True 等价于先 pipeline 再 multi
pipe = r.pipeline(True)
pipe.set('key1', 'v1')
pipe.set('key2', 'v2')
pipe.incr('counter')
pipe.execute()
```

---

## Lua 脚本替代方案

**基本写法：Lua 原子性秒杀**
`EVAL <script> <numkeys> <key> [key ...] <arg> [arg ...]`
```bash
# 使用 Lua 脚本保证秒杀操作的原子性
EVAL "local stock = tonumber(redis.call('GET', KEYS[1])) if stock and stock > 0 then redis.call('DECR', KEYS[1]) redis.call('SADD', KEYS[2], ARGV[1]) return 1 end return 0" 2 stock:item1 users:item1 user42
```
