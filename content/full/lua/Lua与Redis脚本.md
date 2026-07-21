---
order: 59
title: Lua与Redis脚本
module: lua
category: Lua
difficulty: intermediate
description: 'Redis Lua脚本'
author: fanquanpp
updated: '2026-06-14'
related:
  - lua/Lua与Love2D
  - lua/Lua与Neovim
  - lua/Lua与Nginx
  - lua/模块与包
prerequisites:
  - lua/概述与环境配置
---

## 1. 学习目标（Bloom 分类法）

本篇文档采用 Bloom 认知分类法组织学习目标，帮助读者从基础认知到高阶创造系统化掌握 Redis 中的 Lua 脚本编程。

### 1.1 记忆层（Remember）

完成本节后，学习者应能：

- 列举 Redis 执行 Lua 脚本的两条主要命令（`EVAL` 与 `EVALSHA`）及其区别。
- 复述 `redis.call` 与 `redis.pcall` 的语义差异与错误处理行为。
- 说出 `KEYS` 与 `ARGV` 两个全局变量的用途与索引约定。
- 列出 Redis Lua 沙箱中禁止使用的 API（如 `os.execute`、`io.open`、`require`）。
- 复述 Redis 7.0 引入的 Functions 机制与传统 Lua 脚本的区别。

### 1.2 理解层（Understand）

完成本节后，学习者应能：

- 解释 Redis Lua 脚本的原子性原理，说明它如何保证多条命令不可分割。
- 阐述 Redis 与 Lua 之间的类型转换规则，特别是 `nil → false` 的特殊映射。
- 对比 `EVAL` 与 `EVALSHA` 的网络开销，解释为什么生产环境推荐使用 `EVALSHA`。
- 描述 Redis Cluster 中脚本执行的键分布约束（hash tag 机制）。
- 说明 `lua-time-limit` 配置的作用与 `SCRIPT KILL` 的局限性。

### 1.3 应用层（Apply）

完成本节后，学习者应能：

- 使用 `EVAL` 执行包含条件判断的复合命令（如"仅当键不存在时设置"）。
- 编写 Lua 脚本实现可重入的分布式锁（包含加锁、解锁、续期三件套）。
- 实现滑动窗口与令牌桶两种限流算法，并理解其性能差异。
- 使用 `SCRIPT LOAD` 与 `EVALSHA` 优化客户端的脚本调用性能。
- 编写基于 Stream 与消费者组的消息处理脚本。

### 1.4 分析层（Analyze）

完成本节后，学习者应能：

- 拆解一段复杂的 Lua 脚本，识别其中的原子性边界、错误处理路径与性能热点。
- 分析 Redis 单线程模型下脚本执行对整体吞吐量的影响。
- 比较分布式锁的多种实现方案（SETNX、Redlock、Redisson），指出各自的可靠性边界。
- 解构限流算法的数学模型，将其分解为计数器更新、时间窗口滑动、过期清理等子任务。

### 1.5 评价层（Evaluate）

完成本节后，学习者应能：

- 评估某段 Lua 脚本是否会阻塞 Redis 主线程，给出量化的执行时间预估。
- 评判 Redis Cluster 中脚本的键分布是否合理，提出 hash tag 优化方案。
- 评估 Functions 与传统 Lua 脚本在不同业务场景下的选型依据。
- 评判 Redis 实现分布式锁的可靠性边界，指出其在网络分区下的失效场景。

### 1.6 创造层（Create）

完成本节后，学习者应能：

- 设计一个基于 Redis Lua 脚本的秒杀系统，支持库存预热、原子扣减、订单记录。
- 实现一个支持优先级与延迟的消息队列，基于 Redis Sorted Set 与 Stream 组合。
- 构建一套脚本版本管理工具，支持灰度发布与回滚。
- 编写自定义的 Redis Function 库，封装常用业务逻辑（如计数器、排行榜、布隆过滤器）。

## 2. 历史动机与背景

### 2.1 Redis 早期局限与 MULTI/EXEC 事务的不足

Redis 自 2009 年由 Salvatore Sanfilippo（antirez）开源以来，以其纯内存、单线程、丰富数据结构的特性迅速成为缓存与队列的首选。然而，随着业务复杂度提升，开发者很快遇到了"多命令原子性"问题。

Redis 提供了 `MULTI`/`EXEC` 事务机制，允许将多条命令打包执行。但这一机制存在三个根本性局限：

1. **无逻辑分支**：事务内不能包含 `if`、`for` 等控制流，无法根据中间结果决定后续命令。
2. **无中间结果读取**：事务内所有命令的返回值只能在 `EXEC` 后一次性获得，无法在事务内读取并使用。
3. **乐观锁的局限**：`WATCH` 只能在简单场景下防止并发修改，复杂的条件检查仍无法实现。

例如，"仅当库存大于 0 且用户未下单时才扣减库存"这一逻辑，无法用 `MULTI`/`EXEC` 表达。

### 2.2 Lua 脚本的引入

为解决上述问题，Redis 2.6（2012 年发布）引入了 `EVAL` 命令，允许在服务端执行 Lua 脚本。Lua 脚本在 Redis 主线程中原子性执行，期间不会穿插其他客户端命令，天然保证了多命令的原子性。

引入 Lua 的设计考量包括：

1. **语言轻量**：Lua 解释器仅 ~200KB，对 Redis 二进制体积影响小。
2. **沙箱安全**：Lua 易于沙箱化，禁用文件 I/O、网络、系统调用即可保证安全。
3. **性能可控**：Lua 脚本在主线程执行，与 Redis 单线程模型契合，无锁竞争。
4. **生态成熟**：Lua 已在游戏（World of Warcraft）、Nginx（OpenResty）等场景验证。

### 2.3 关键里程碑

| 时间 | 版本 | 事件 |
| :--- | :--- | :--- |
| 2012 | Redis 2.6 | 引入 `EVAL` 命令，支持 Lua 脚本 |
| 2013 | Redis 2.8 | 新增 `SCRIPT LOAD`、`EVALSHA` 优化 |
| 2015 | Redis 3.0 | 支持 Cluster 模式下的脚本（需 hash tag） |
| 2017 | Redis 4.0 | 引入 modules 机制，Lua 与 module 协同 |
| 2020 | Redis 6.0 | 多线程 I/O，但脚本仍在主线程 |
| 2022 | Redis 7.0 | 引入 Functions，替代部分 Lua 脚本场景 |
| 2024 | Redis 7.4 | 优化 Lua 沙箱，限制部分不安全 API |

### 2.4 设计哲学

Redis Lua 脚本的设计哲学可归纳为四点：

1. **原子性优先**：脚本作为整体执行，期间无任何穿插，保证业务一致性。
2. **沙箱化**：禁用一切外部 I/O，确保脚本可重现且无副作用。
3. **键显式声明**：通过 `KEYS` 数组显式声明操作的键，便于 Cluster 路由与审计。
4. **客户端缓存**：服务端缓存脚本编译结果，客户端通过 SHA1 引用，减少网络开销。

## 3. 形式化定义

### 3.1 EVAL 命令语义

`EVAL` 命令的形式化语义为：

$$
\text{EVAL}(script, numkeys, K, A) = \sigma(\text{eval\_lua}(script, \text{ENV}_{K,A}))
$$

其中：

- $script$ 为 Lua 代码字符串。
- $numkeys$ 为键的数量。
- $K = [k_1, k_2, \ldots, k_{numkeys}]$ 为键数组。
- $A = [a_1, a_2, \ldots, a_m]$ 为参数数组。
- $\text{ENV}_{K,A}$ 为 Lua 执行环境，包含全局变量 `KEYS = K`、`ARGV = A`。
- $\sigma$ 为 Redis 与 Lua 之间的类型映射函数。

### 3.2 原子性形式化

设 Redis 主线程在时刻 $t$ 接收到脚本执行请求，其原子性可形式化为：

$$
\forall t' \in [t_{\text{start}}, t_{\text{end}}]: \text{exec}(t') = \text{script}
$$

即在脚本执行的整个时间区间 $[t_{\text{start}}, t_{\text{end}}]$ 内，主线程不处理任何其他客户端命令。这一性质保证了脚本内的所有 Redis 命令作为一个不可分割的整体被执行。

### 3.3 沙箱模型

Redis Lua 沙箱通过移除以下 API 实现：

$$
\text{Sandbox} = \text{Lua}_{\text{full}} \setminus \{\text{os}, \text{io}, \text{require}, \text{dofile}, \text{loadfile}, \text{package}\}
$$

具体禁用模块：

- `os`：禁止系统调用（`os.execute`、`os.exit`、`os.getenv`）。
- `io`：禁止文件 I/O（`io.open`、`io.read`）。
- `require`：禁止加载外部模块。
- `dofile`/`loadfile`：禁止从文件加载代码。
- `package`：禁止访问包管理。

允许使用的扩展：

- `redis.call(cmd, ...)`：执行 Redis 命令，错误时抛出。
- `redis.pcall(cmd, ...)`：执行 Redis 命令，错误时返回错误表。
- `redis.error_reply(msg)`：构造错误返回值。
- `redis.status_reply(msg)`：构造状态返回值。
- `redis.sha1hex(str)`：计算 SHA1 哈希。
- `redis.log(level, msg)`：写入 Redis 日志。
- `redis.LOG_DEBUG`、`redis.LOG_VERBOSE`、`redis.LOG_NOTICE`、`redis.LOG_WARNING`：日志级别常量。

### 3.4 类型映射

Redis 与 Lua 之间的类型映射 $\sigma$ 定义为：

| Redis 类型 | Lua 类型 | 说明 |
| :--- | :--- | :--- |
| 整数回复 | number | 如 `INCR` 返回值 |
| 批量字符串回复 | string | 如 `GET` 返回值 |
| 多条批量回复 | table（数组） | 如 `LRANGE` 返回值 |
| 状态回复 | table `{ok = msg}` | 如 `SET` 返回 "OK" |
| 错误回复 | table `{err = msg}` | 如命令执行失败 |
| 空回复（nil） | false | 注意：不是 Lua nil！ |

反向映射（Lua → Redis）：

| Lua 类型 | Redis 类型 |
| :--- | :--- |
| number | 整数回复（若可整除）或字符串 |
| string | 批量字符串回复 |
| table（数组） | 多条批量回复 |
| table `{ok = msg}` | 状态回复 |
| table `{err = msg}` | 错误回复 |
| boolean true | 整数 1 |
| boolean false | 空回复（nil） |
| nil | 空回复（nil） |

特别需要注意：**Redis 的 nil（键不存在）映射为 Lua 的 `false`，而非 `nil`**。这是初学者最常踩的坑。

### 3.5 Cluster 路由约束

在 Redis Cluster 中，脚本的所有键必须位于同一哈希槽。形式化定义为：

$$
\forall k_i, k_j \in K: \text{slot}(k_i) = \text{slot}(k_j)
$$

其中 $\text{slot}(k) = \text{crc16}(k) \mod 16384$。

若键不指定 hash tag，则需保证所有键的 CRC16 取模结果相同。常见做法是使用 hash tag：

```
user:{1000}:profile
user:{1000}:orders
```

大括号内的 `1000` 参与 CRC16 计算，大括号外的部分被忽略，从而保证两个键映射到同一槽。

## 4. 理论推导与复杂度分析

### 4.1 脚本执行时间模型

设脚本中包含 $n$ 条 Redis 命令，每条命令的平均执行时间为 $t_i$，Lua 解释执行开销为 $t_{\text{lua}}$，则脚本总执行时间为：

$$
T = t_{\text{lua}} + \sum_{i=1}^{n} t_i
$$

由于 Redis 单线程，脚本执行期间所有其他客户端请求被阻塞。设系统 QPS 为 $Q$，则脚本执行期间的请求积压量为：

$$
B = Q \times T
$$

为避免雪崩，Redis 设置了 `lua-time-limit`（默认 5 秒），超时后允许 `SCRIPT KILL` 中止脚本。但若脚本已执行写命令，`SCRIPT KILL` 将拒绝执行，只能通过 `SHUTDOWN NOSAVE` 强制重启。

### 4.2 EVALSHA 网络优化

设脚本长度为 $L$ 字节，网络带宽为 $B$ 字节/秒，则 `EVAL` 的网络传输时间为：

$$
T_{\text{eval}} = \frac{L}{B}
$$

`EVALSHA` 仅传输 40 字节的 SHA1 哈希，网络时间为：

$$
T_{\text{evalsha}} = \frac{40}{B}
$$

对于 1KB 的脚本，在 100Mbps 网络下，`EVAL` 传输约 80μs，`EVALSHA` 仅 3μs，优化明显。

但 `EVALSHA` 存在首次未命中的风险。客户端库通常采用"先 EVALSHA，失败则 EVAL"的策略：

$$
T_{\text{client}} = \begin{cases}
T_{\text{evalsha}} & \text{if cache hit} \\
T_{\text{evalsha}} + T_{\text{eval}} & \text{if cache miss}
\end{cases}
$$

### 4.3 分布式锁正确性分析

基于 Redis 的分布式锁存在一个经典争议：在网络分区下，锁可能被多个客户端同时持有。

设锁的 TTL 为 $T$，客户端 A 获取锁后因 GC 暂停 $\Delta t > T$，锁自动过期。客户端 B 此时获取锁，导致 A 与 B 同时认为自己持有锁。

为缓解此问题，Redlock 算法在多个独立 Redis 实例上获取锁，要求多数节点成功。但即使如此，仍存在时钟漂移与网络分区下的失效场景。

形式化地，设单实例锁的失效概率为 $p$，则 Redlock（5 节点，要求 3 个成功）的失效概率为：

$$
P_{\text{redlock}} = \sum_{i=3}^{5} \binom{5}{i} p^i (1-p)^{5-i}
$$

当 $p$ 较小时，$P_{\text{redlock}} \approx 10 p^3$，显著优于单实例。但需注意，这仅在节点完全独立的假设下成立。

### 4.4 滑动窗口限流的复杂度

滑动窗口限流使用 Sorted Set 存储请求时间戳。设窗口大小为 $W$，请求速率为 $\lambda$，则 Sorted Set 中的元素数量约为 $\lambda \times W$。

每次限流检查的复杂度为：

$$
T_{\text{check}} = O(\log(\lambda W)) + O(\lambda W) + O(\log(\lambda W))
$$

分别为 `ZREMRANGEBYSCORE`（清理过期）、`ZCARD`（计数）、`ZADD`（添加）。当 $\lambda W$ 较大时（如 1000 QPS × 60 秒 = 60000 元素），复杂度仍可接受。

为避免 Sorted Set 无限增长，应设置 TTL：

```lua
redis.call('EXPIRE', key, window + 1)
```

### 4.5 令牌桶算法的数学模型

令牌桶算法的核心是按速率 $r$ 补充令牌，桶容量为 $C$。设当前令牌数为 $T_{\text{now}}$，上次更新时间为 $t_{\text{last}}$，当前时间为 $t_{\text{now}}$，则：

$$
T_{\text{now}} = \min\left(C, T_{\text{last}} + r \times (t_{\text{now}} - t_{\text{last}})\right)
$$

若请求消耗 $n$ 个令牌，则：

$$
\text{allow}(n) = \begin{cases}
\text{true}, T_{\text{now}} \geq n & \text{且 } T_{\text{now}} \leftarrow T_{\text{now}} - n \\
\text{false}, T_{\text{now}} < n & \text{且 } T_{\text{now}} \text{ 不变}
\end{cases}
$$

令牌桶允许突发流量（最多 $C$ 个），适合票务、秒杀等场景。

## 5. 代码示例

### 5.1 基础 EVAL

最简单的 Lua 脚本，返回固定字符串：

```bash
# 在 redis-cli 中执行
# EVAL script numkeys key [key ...] arg [arg ...]
# 返回 "Hello, Lua!"
redis-cli EVAL "return 'Hello, Lua!'" 0
```

使用 `KEYS` 与 `ARGV`：

```bash
# 设置键值并返回旧值
# KEYS[1] = mykey, ARGV[1] = newvalue
redis-cli EVAL "local old = redis.call('GET', KEYS[1]); redis.call('SET', KEYS[1], ARGV[1]); return old" 1 mykey newvalue
```

### 5.2 条件判断脚本

实现"仅当键不存在时设置"：

```lua
-- setnx.lua：仅当键不存在时设置
-- KEYS[1]: 键名
-- ARGV[1]: 值
-- ARGV[2]: 过期时间（秒）

-- 检查键是否存在
if redis.call('EXISTS', KEYS[1]) == 0 then
    -- 键不存在，设置值
    redis.call('SET', KEYS[1], ARGV[1])
    -- 设置过期时间
    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
    return 1  -- 设置成功
end
return 0  -- 键已存在，未设置
```

执行：

```bash
redis-cli --eval setnx.lua mykey , "hello" 60
```

注意 `--eval` 语法：逗号前为 KEYS，逗号后为 ARGV。

### 5.3 类型转换注意事项

演示 Redis 与 Lua 之间的类型转换：

```lua
-- types.lua：类型转换演示

-- 1. Redis 整数 -> Lua number
local count = redis.call('INCR', KEYS[1])
-- count 是 number 类型，可参与算术运算
redis.log(redis.LOG_NOTICE, "count type: " .. type(count))
redis.log(redis.LOG_NOTICE, "count value: " .. count)

-- 2. Redis 字符串 -> Lua string
local value = redis.call('GET', KEYS[2])
-- value 是 string 类型
redis.log(redis.LOG_NOTICE, "value type: " .. type(value))

-- 3. Redis nil -> Lua false（注意！不是 nil）
local missing = redis.call('GET', 'nonexistent_key')
-- missing 是 boolean false
if missing == false then
    redis.log(redis.LOG_NOTICE, "key does not exist")
elseif missing == nil then
    -- 这个分支永远不会执行！
    redis.log(redis.LOG_NOTICE, "this won't happen")
end

-- 4. Lua 返回值 -> Redis 类型
return {
    1,              -- number -> 整数回复
    "hello",        -- string -> 批量字符串回复
    {1, 2, 3},      -- table -> 多条批量回复
    true,           -- boolean true -> 整数 1
    false,          -- boolean false -> nil 回复
    {ok = "OK"},    -- table -> 状态回复
}
```

### 5.4 分布式锁（可重入）

完整的可重入分布式锁实现：

```lua
-- lock.lua：加锁脚本（可重入）
-- KEYS[1]: 锁键名
-- ARGV[1]: 持有者标识（如客户端 UUID + 线程 ID）
-- ARGV[2]: 过期时间（毫秒）
-- ARGV[3]: 重入计数（默认 1）

local lock_key = KEYS[1]
local holder = ARGV[1]
local ttl = tonumber(ARGV[2])
local count = tonumber(ARGV[3]) or 1

-- 使用 Hash 存储持有者与重入计数
-- 格式：lock_key -> {holder = holder, count = n}

local current = redis.call('HMGET', lock_key, 'holder', 'count')
local current_holder = current[1]
local current_count = tonumber(current[2]) or 0

if current_holder == false then
    -- 锁未被持有，直接加锁
    redis.call('HMSET', lock_key, 'holder', holder, 'count', count)
    redis.call('PEXPIRE', lock_key, ttl)
    return 1  -- 加锁成功
end

if current_holder == holder then
    -- 同一持有者，重入加锁
    redis.call('HMSET', lock_key, 'holder', holder, 'count', current_count + count)
    redis.call('PEXPIRE', lock_key, ttl)
    return 1  -- 重入成功
end

-- 锁被其他持有者占用
return 0
```

解锁脚本：

```lua
-- unlock.lua：解锁脚本（可重入）
-- KEYS[1]: 锁键名
-- ARGV[1]: 持有者标识

local lock_key = KEYS[1]
local holder = ARGV[1]

local current = redis.call('HMGET', lock_key, 'holder', 'count')
local current_holder = current[1]
local current_count = tonumber(current[2]) or 0

-- 锁不存在或已被其他持有者接管
if current_holder == false then
    return -1  -- 锁已过期
end

if current_holder ~= holder then
    return 0  -- 非持有者，无法解锁
end

-- 减少重入计数
current_count = current_count - 1
if current_count > 0 then
    -- 仍有重入，更新计数
    redis.call('HSET', lock_key, 'count', current_count)
    return 1  -- 部分解锁
end

-- 完全解锁
redis.call('DEL', lock_key)
return 2  -- 完全解锁
```

续期脚本：

```lua
-- renew.lua：锁续期脚本
-- KEYS[1]: 锁键名
-- ARGV[1]: 持有者标识
-- ARGV[2]: 新的过期时间（毫秒）

local lock_key = KEYS[1]
local holder = ARGV[1]
local ttl = tonumber(ARGV[2])

local current_holder = redis.call('HGET', lock_key, 'holder')
if current_holder == false then
    return -1  -- 锁已过期
end

if current_holder ~= holder then
    return 0  -- 非持有者
end

redis.call('PEXPIRE', lock_key, ttl)
return 1  -- 续期成功
```

### 5.5 滑动窗口限流

```lua
-- sliding_window.lua：滑动窗口限流
-- KEYS[1]: 限流键名
-- ARGV[1]: 窗口内最大请求数
-- ARGV[2]: 窗口大小（秒）
-- ARGV[3]: 当前时间戳（毫秒，由客户端传入避免时钟漂移）

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- 转换为毫秒
local window_ms = window * 1000
local window_start = now - window_ms

-- 清理窗口外的旧记录
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- 统计当前窗口内的请求数
local current = redis.call('ZCARD', key)

if current >= limit then
    -- 请求被拒绝，计算最早请求的过期时间
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local oldest_time = tonumber(oldest[2])
    local retry_after = math.ceil((oldest_time + window_ms - now) / 1000)
    return {0, 0, retry_after}  -- 拒绝、剩余配额 0、重试等待时间
end

-- 记录本次请求（使用纳秒级唯一 ID 避免成员冲突）
local member = now .. ':' .. redis.call('TIME')[2]
redis.call('ZADD', key, now, member)

-- 设置键的过期时间，避免无限增长
redis.call('EXPIRE', key, window + 1)

return {1, limit - current - 1, 0}  -- 允许、剩余配额、无需等待
```

### 5.6 令牌桶限流

```lua
-- token_bucket.lua：令牌桶限流
-- KEYS[1]: 令牌桶键名
-- ARGV[1]: 桶容量（最大令牌数）
-- ARGV[2]: 令牌生成速率（每秒令牌数）
-- ARGV[3]: 当前时间戳（秒）
-- ARGV[4]: 请求消耗的令牌数

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- 使用 Hash 存储当前令牌数与上次更新时间
local bucket = redis.call('HMGET', key, 'tokens', 'timestamp')
local tokens = tonumber(bucket[1])
local last_time = tonumber(bucket[2])

-- 首次使用，初始化为满桶
if tokens == nil then
    tokens = capacity
    last_time = now
end

-- 计算新增的令牌数
local elapsed = math.max(0, now - last_time)
local new_tokens = elapsed * rate
tokens = math.min(capacity, tokens + new_tokens)

-- 检查令牌是否充足
if tokens >= requested then
    -- 扣减令牌
    tokens = tokens - requested
    redis.call('HMSET', key, 'tokens', tokens, 'timestamp', now)
    -- 设置过期时间，避免桶数据无限驻留
    local ttl = math.ceil(capacity / rate) + 1
    redis.call('EXPIRE', key, ttl)
    return {1, math.floor(tokens), 0}  -- 允许、剩余令牌、无需等待
else
    -- 令牌不足，更新时间但不扣减
    redis.call('HMSET', key, 'tokens', tokens, 'timestamp', now)
    local ttl = math.ceil(capacity / rate) + 1
    redis.call('EXPIRE', key, ttl)
    -- 计算需要等待的时间
    local wait = math.ceil((requested - tokens) / rate)
    return {0, math.floor(tokens), wait}  -- 拒绝、当前令牌、等待时间
end
```

### 5.7 库存扣减（秒杀场景）

```lua
-- seckill.lua：秒杀库存扣减
-- KEYS[1]: 库存键名
-- KEYS[2]: 订单记录键名（Set 类型）
-- ARGV[1]: 用户 ID
-- ARGV[2]: 购买数量

local stock_key = KEYS[1]
local order_key = KEYS[2]
local user_id = ARGV[1]
local quantity = tonumber(ARGV[2])

-- 1. 检查用户是否已下单（防止重复秒杀）
if redis.call('SISMEMBER', order_key, user_id) == 1 then
    return -1  -- 用户已下单
end

-- 2. 检查库存是否充足
local stock = tonumber(redis.call('GET', stock_key) or '0')
if stock < quantity then
    return 0  -- 库存不足
end

-- 3. 扣减库存
redis.call('DECRBY', stock_key, quantity)

-- 4. 记录订单
redis.call('SADD', order_key, user_id)

return 1  -- 秒杀成功
```

使用 hash tag 保证 Cluster 路由：

```bash
# 库存键与订单键使用相同的 hash tag {item1000}
redis-cli --eval seckill.lua stock:{item1000} orders:{item1000} , user123 1
```

### 5.8 消息队列（优先级）

```lua
-- pq_producer.lua：优先级队列生产者
-- KEYS[1]: 队列键名
-- ARGV[1]: 消息内容
-- ARGV[2]: 优先级（数值越小优先级越高）

local queue_key = KEYS[1]
local message = ARGV[1]
local priority = tonumber(ARGV[2]) or 0

-- 生成唯一消息 ID
local msg_id = redis.call('INCR', queue_key .. ':seq')

-- 使用 Sorted Set 存储消息，score 为优先级
-- member 格式：id:content
local member = msg_id .. ':' .. message
redis.call('ZADD', queue_key, priority, member)

return msg_id
```

```lua
-- pq_consumer.lua：优先级队列消费者
-- KEYS[1]: 队列键名
-- KEYS[2]: 处理中队列键名
-- ARGV[1]: 消费者 ID
-- ARGV[2]: 可见性超时（秒）
-- ARGV[3]: 当前时间戳

local queue_key = KEYS[1]
local processing_key = KEYS[2]
local consumer_id = ARGV[1]
local timeout = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- 取优先级最高（score 最小）的消息
local messages = redis.call('ZRANGE', queue_key, 0, 0)
if #messages == 0 then
    return nil  -- 队列为空
end

local message = messages[1]

-- 从待处理队列移除
redis.call('ZREM', queue_key, message)

-- 加入处理中队列，score 为超时时间戳
redis.call('ZADD', processing_key, now + timeout, message)

-- 记录消费者
redis.call('HSET', queue_key .. ':consumers', message, consumer_id)

return message
```

```lua
-- pq_ack.lua：消息确认（ACK）
-- KEYS[1]: 处理中队列键名
-- ARGV[1]: 消息内容

local processing_key = KEYS[1]
local message = ARGV[1]

-- 从处理中队列移除
local removed = redis.call('ZREM', processing_key, message)
if removed == 0 then
    return 0  -- 消息不在处理中队列（可能已被重新投递）
end

return 1  -- ACK 成功
```

### 5.9 Stream 消费者组

```lua
-- stream_consumer.lua：Stream 消费者组处理
-- KEYS[1]: Stream 键名
-- ARGV[1]: 消费者组名
-- ARGV[2]: 消费者名
-- ARGV[3]: 最大处理数量
-- ARGV[4]: 阻塞时间（毫秒，0 表示不阻塞）

local stream_key = KEYS[1]
local group = ARGV[1]
local consumer = ARGV[2]
local count = tonumber(ARGV[3])
local block = tonumber(ARGV[4]) or 0

-- 读取消息
local messages
if block > 0 then
    messages = redis.call('XREADGROUP', 'GROUP', group, consumer,
        'COUNT', count, 'BLOCK', block, 'STREAMS', stream_key, '>')
else
    messages = redis.call('XREADGROUP', 'GROUP', group, consumer,
        'COUNT', count, 'STREAMS', stream_key, '>')
end

if not messages or #messages == 0 then
    return nil  -- 无新消息
end

-- 返回消息列表
return messages
```

### 5.10 缓存击穿防护

```lua
-- cache_lock.lua：缓存击穿防护
-- KEYS[1]: 缓存键名
-- KEYS[2]: 锁键名
-- ARGV[1]: 锁过期时间（秒）
-- ARGV[2]: 缓存过期时间（秒）

local cache_key = KEYS[1]
local lock_key = KEYS[2]
local lock_ttl = tonumber(ARGV[1])
local cache_ttl = tonumber(ARGV[2])

-- 1. 检查缓存
local cached = redis.call('GET', cache_key)
if cached ~= false then
    return {1, cached}  -- 缓存命中
end

-- 2. 缓存未命中，尝试获取锁
local ok = redis.call('SET', lock_key, '1', 'NX', 'EX', lock_ttl)
if ok == false then
    -- 锁被其他客户端持有，稍后重试
    return {2, nil}  -- 需要等待并重试
end

-- 3. 获取锁成功，返回 "需要回源" 标记
-- 客户端收到此标记后回源获取数据，再调用 cache_set.lua 写入缓存
return {0, nil}  -- 需要回源
```

```lua
-- cache_set.lua：写入缓存并释放锁
-- KEYS[1]: 缓存键名
-- KEYS[2]: 锁键名
-- ARGV[1]: 缓存值
-- ARGV[2]: 缓存过期时间（秒）

local cache_key = KEYS[1]
local lock_key = KEYS[2]
local value = ARGV[1]
local cache_ttl = tonumber(ARGV[2])

-- 写入缓存
redis.call('SET', cache_key, value, 'EX', cache_ttl)

-- 释放锁
redis.call('DEL', lock_key)

return 1
```

### 5.11 计数器（防刷）

```lua
-- counter.lua：带过期时间的计数器
-- KEYS[1]: 计数器键名
-- ARGV[1]: 计数器上限
-- ARGV[2]: 过期时间（秒）

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

-- 原子递增
local current = redis.call('INCR', key)

-- 首次递增时设置过期时间
if current == 1 then
    redis.call('EXPIRE', key, ttl)
end

if current > limit then
    return {0, current, ttl}  -- 超限
end

return {1, current, ttl}  -- 允许
```

### 5.12 排行榜

```lua
-- leaderboard.lua：排行榜操作
-- KEYS[1]: 排行榜键名
-- ARGV[1]: 用户 ID
-- ARGV[2]: 分数
-- ARGV[3]: 是否更新（1=更新，0=仅当高于现有分数时更新）

local key = KEYS[1]
local user_id = ARGV[1]
local score = tonumber(ARGV[2])
local update_mode = tonumber(ARGV[3])

if update_mode == 1 then
    -- 强制更新
    redis.call('ZADD', key, score, user_id)
else
    -- 仅当高于现有分数时更新
    local current = redis.call('ZSCORE', key, user_id)
    if current == false or tonumber(current) < score then
        redis.call('ZADD', key, score, user_id)
    end
end

-- 返回用户当前排名（从高到低）
local rank = redis.call('ZREVRANK', key, user_id)
if rank == false then
    return nil
end

-- 返回排名（0-based）与总分
local total = redis.call('ZCARD', key)
return {rank, total, score}
```

## 6. 对比分析

### 6.1 EVAL vs EVALSHA

| 维度 | EVAL | EVALSHA |
| :--- | :--- | :--- |
| 命令格式 | `EVAL script numkeys ...` | `EVALSHA sha1 numkeys ...` |
| 网络开销 | 大（需传输完整脚本） | 小（仅 40 字节 SHA1） |
| 服务端缓存 | 每次重新解析（但编译结果缓存） | 直接复用已编译结果 |
| 失败场景 | 脚本语法错误 | SHA1 未缓存（NOSCRIPT 错误） |
| 客户端库 | 简单 | 需实现"先 EVALSHA 后 EVAL"回退 |
| 推荐场景 | 调试、一次性脚本 | 生产环境、高频调用 |

### 6.2 Lua 脚本 vs Functions（Redis 7.0+）

| 维度 | Lua 脚本 | Functions |
| :--- | :--- | :--- |
| 引入版本 | Redis 2.6 | Redis 7.0 |
| 注册方式 | 每次调用传脚本 | 一次性 `FUNCTION LOAD` 注册 |
| 调用方式 | `EVAL`/`EVALSHA` | `FCALL`/`FCALL_RO` |
| 持久化 | 不持久化（重启丢失） | 持久化到 RDB/AOF |
| 库管理 | 无 | 支持库（library）组织 |
| 标志位 | 无 | 支持 `no-writes`、`allow-stale` 等 |
| 集群同步 | 需客户端在每节点加载 | 自动同步到所有节点 |
| 推荐场景 | 简单一次性脚本 | 复杂业务逻辑、需持久化 |

### 6.3 分布式锁实现对比

| 方案 | 实现复杂度 | 可靠性 | 性能 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| SETNX + EX | 低 | 中（单点故障） | 高 | 单 Redis 实例 |
| SET NX EX | 低 | 中 | 高 | 单 Redis 实例 |
| Redlock | 高 | 高（多数节点） | 中 | 多 Redis 实例 |
| Redisson | 中（库封装） | 高 | 中 | Java 生态 |
| Zookeeper | 高 | 极高 | 低 | 强一致性需求 |
| etcd | 高 | 极高 | 中 | 云原生场景 |

### 6.4 限流算法对比

| 算法 | 复杂度 | 突发流量 | 精确性 | 内存占用 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 固定窗口 | O(1) | 不支持 | 低（边界突刺） | 低 | 简单计数 |
| 滑动窗口 | O(log n) | 不支持 | 高 | 中（n=窗口内请求数） | 精确限流 |
| 令牌桶 | O(1) | 支持 | 中 | 低 | 突发流量场景 |
| 漏桶 | O(1) | 不支持 | 高 | 低 | 平滑流量 |
| 滑动日志 | O(n) | 不支持 | 极高 | 高（n=窗口内请求数） | 审计场景 |

## 7. 常见陷阱与反模式

### 7.1 陷阱一：硬编码键名（生产事故案例）

**事故背景**：某电商在 Redis Cluster 中使用 Lua 脚本查询用户信息，脚本中硬编码了键名 `user:1000`，导致 Cluster 路由错误，部分请求返回错误。

**错误代码**：

```lua
-- 反模式：硬编码键名
local user = redis.call('GET', 'user:1000')  -- 错误！
return user
```

**问题分析**：在 Redis Cluster 中，所有键必须通过 `KEYS` 数组传入，Cluster 才能正确路由到对应节点。硬编码键名导致 Cluster 无法判断键所在节点，可能将脚本发送到错误节点。

**正确做法**：

```lua
-- 通过 KEYS 数组传入键名
local user = redis.call('GET', KEYS[1])  -- KEYS[1] = 'user:1000'
return user
```

调用时：

```bash
redis-cli --eval script.lua user:1000 ,
```

### 7.2 陷阱二：长脚本阻塞 Redis

**事故背景**：某团队在 Lua 脚本中使用 `KEYS *` 遍历所有键，在百万级键的实例上执行，导致 Redis 阻塞 30 秒，所有客户端超时。

**错误代码**：

```lua
-- 反模式：在脚本中使用 KEYS 命令
local all_keys = redis.call('KEYS', '*')
local result = {}
for i, key in ipairs(all_keys) do
    local type = redis.call('TYPE', key)
    table.insert(result, {key = key, type = type})
end
return result
```

**问题分析**：`KEYS *` 的时间复杂度为 O(n)，n 为键总数。在百万级键的实例上，单次 `KEYS` 即可阻塞数秒。加之循环内逐个查询 `TYPE`，总耗时爆炸式增长。

**正确做法**：使用 `SCAN` 命令分批扫描：

```lua
-- 使用 SCAN 分批扫描（但注意：脚本内 SCAN 仍有阻塞风险）
local cursor = '0'
local result = {}
repeat
    local reply = redis.call('SCAN', cursor, 'COUNT', 100)
    cursor = reply[1]
    for _, key in ipairs(reply[2]) do
        local type = redis.call('TYPE', key)
        table.insert(result, {key = key, type = type})
    end
until cursor == '0'
return result
```

**更佳实践**：避免在 Lua 脚本中执行全量扫描，改为在客户端分批处理。

### 7.3 陷阱三：误判 nil 与 false

**事故背景**：开发者检查 `GET` 返回值时，用 `== nil` 判断键不存在，结果永远不成立。

**错误代码**：

```lua
-- 反模式：误判 nil 与 false
local value = redis.call('GET', KEYS[1])
if value == nil then
    -- 这个分支永远不会执行！
    return 'key_not_exist'
end
return value
```

**问题分析**：Redis 的 nil（键不存在）映射为 Lua 的 `false`，而非 `nil`。`value == nil` 永远为 `false`。

**正确做法**：

```lua
local value = redis.call('GET', KEYS[1])
if value == false then
    return 'key_not_exist'  -- 键不存在
end
return value
```

或使用 `not` 判断：

```lua
if not value then
    -- value 是 false 或 nil，但 Redis 不会返回 nil，所以是 false
    return 'key_not_exist'
end
```

### 7.4 陷阱四：浮点数精度丢失

**事故背景**：某计费系统使用 Lua 脚本累加金额，运行一段时间后金额出现微小偏差，导致对账失败。

**错误代码**：

```lua
-- 反模式：使用浮点数累加金额
local amount = redis.call('GET', KEYS[1]) or '0'
amount = tonumber(amount) + tonumber(ARGV[1])
redis.call('SET', KEYS[1], amount)
return amount
```

**问题分析**：Lua 5.1 的 `number` 类型是双精度浮点数，精度有限。当金额超过 $2^{53}$ 时，整数精度丢失。此外，浮点数累加存在累积误差（如 `0.1 + 0.2 = 0.30000000000000004`）。

**正确做法**：使用整数（分）表示金额：

```lua
-- 使用整数（分）表示金额
local amount_cents = redis.call('GET', KEYS[1]) or '0'
amount_cents = tonumber(amount_cents) + tonumber(ARGV[1])
redis.call('SET', KEYS[1], amount_cents)
return amount_cents
```

或在 Redis 5.0+ 使用 `INCRBY` 命令直接操作整数：

```lua
redis.call('INCRBY', KEYS[1], tonumber(ARGV[1]))
```

### 7.5 陷阱五：未设置 TTL 导致内存泄漏

**事故背景**：某限流服务使用 Sorted Set 存储请求时间戳，未设置 TTL，导致 Sorted Set 无限增长，最终 Redis 内存耗尽。

**错误代码**：

```lua
-- 反模式：未设置 TTL
redis.call('ZADD', KEYS[1], now, member)
-- 缺少 EXPIRE！
```

**问题分析**：虽然 `ZREMRANGEBYSCORE` 会清理过期成员，但若限流键长时间未被访问，Sorted Set 本身不会被回收。

**正确做法**：

```lua
redis.call('ZADD', KEYS[1], now, member)
redis.call('EXPIRE', KEYS[1], window + 1)  -- 设置 TTL
```

### 7.6 陷阱六：SCRIPT KILL 无法中止写脚本

**事故背景**：某脚本因逻辑错误进入死循环，运维尝试 `SCRIPT KILL` 中止，但 Redis 返回 "UNKILLABLE" 错误。

**问题分析**：`SCRIPT KILL` 只能中止尚未执行写命令的脚本。一旦脚本执行了任何写命令（如 `SET`、`INCR`），Redis 为保证原子性，拒绝中止脚本，只能通过 `SHUTDOWN NOSAVE` 强制重启。

**预防措施**：

1. 在脚本中加入超时检查：

```lua
local start = redis.call('TIME')
-- ... 业务逻辑 ...
local elapsed = redis.call('TIME')[1] - start[1]
if elapsed > 3 then
    return {err = "script timeout"}
end
```

2. 使用 `lua-time-limit` 配置设置超时阈值（默认 5 秒）。

3. 上线前充分测试，避免长循环。

## 8. 工程实践

### 8.1 脚本版本管理

为避免脚本变更导致的不一致，建议建立版本管理流程：

1. **脚本命名**：使用语义化版本号，如 `lock_v1.lua`、`lock_v2.lua`。
2. **Git 仓库**：所有脚本纳入 Git 仓库，通过 Pull Request 审查变更。
3. **CI 加载**：在 CI/CD 流程中，使用 `SCRIPT LOAD` 预加载脚本到所有 Redis 实例。
4. **SHA1 映射**：维护脚本名到 SHA1 的映射，便于客户端调用。

示例 CI 脚本：

```bash
#!/bin/bash
# load_scripts.sh：加载所有 Lua 脚本到 Redis

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

# 遍历 scripts 目录下的所有 .lua 文件
for script in scripts/*.lua; do
    name=$(basename "$script" .lua)
    content=$(cat "$script")

    # 加载脚本，获取 SHA1
    sha1=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SCRIPT LOAD "$content")

    # 写入映射文件
    echo "$name=$sha1" >> scripts/sha1_map.txt
    echo "Loaded $name -> $sha1"
done
```

### 8.2 客户端封装

主流客户端库（如 Python redis-py、Java Jedis、Go go-redis）均提供脚本封装：

**Python 示例**：

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# 注册脚本（内部自动使用 EVALSHA，失败回退 EVAL）
lock_script = """
if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[2]) then
    return 1
else
    return 0
end
"""
lock = r.register_script(lock_script)

# 调用脚本
result = lock(keys=['my_lock'], args=['holder1', 30])
print("加锁结果:", result)
```

**Java Jedis 示例**：

```java
import redis.clients.jedis.Jedis;

public class RedisLuaExample {
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            String script =
                "if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[2]) then " +
                "  return 1 " +
                "else " +
                "  return 0 " +
                "end";

            // 第一次调用会 SCRIPT LOAD，后续自动使用 EVALSHA
            Object result = jedis.eval(
                script,
                1,  // numkeys
                "my_lock",  // KEYS[1]
                "holder1", "30"  // ARGV[1], ARGV[2]
            );
            System.out.println("加锁结果: " + result);
        }
    }
}
```

### 8.3 错误处理与日志

在脚本中使用 `redis.log` 记录日志：

```lua
-- 日志级别常量
-- redis.LOG_DEBUG    (0)
-- redis.LOG_VERBOSE  (1)
-- redis.LOG_NOTICE   (2)
-- redis.LOG_WARNING  (3)

local function log_info(msg)
    redis.log(redis.LOG_NOTICE, "[INFO] " .. msg)
end

local function log_warn(msg)
    redis.log(redis.LOG_WARNING, "[WARN] " .. msg)
end

local function log_error(msg)
    redis.log(redis.LOG_WARNING, "[ERROR] " .. msg)  -- 注意：无 ERROR 级别
end

-- 使用示例
log_info("开始处理请求")
local value = redis.call('GET', KEYS[1])
if value == false then
    log_warn("键不存在: " .. KEYS[1])
end
```

使用 `redis.error_reply` 返回结构化错误：

```lua
local function check_args()
    if #KEYS < 1 then
        return redis.error_reply("wrong number of keys, expected at least 1")
    end
    if #ARGV < 2 then
        return redis.error_reply("wrong number of args, expected at least 2")
    end
    return nil
end

local err = check_args()
if err then
    return err
end

-- 正常逻辑...
```

### 8.4 性能优化

#### 8.4.1 减少 Redis 命令调用

每次 `redis.call` 都涉及 Lua 与 Redis 之间的上下文切换，应尽量合并：

```lua
-- 反模式：多次调用
local name = redis.call('HGET', KEYS[1], 'name')
local age = redis.call('HGET', KEYS[1], 'age')
local email = redis.call('HGET', KEYS[1], 'email')

-- 优化：使用 HMGET 一次性获取
local fields = redis.call('HMGET', KEYS[1], 'name', 'age', 'email')
local name, age, email = fields[1], fields[2], fields[3]
```

#### 8.4.2 使用 pipeline 友好的命令

某些命令的批量版本性能优于循环单条：

```lua
-- 反模式：循环 SADD
for _, member in ipairs(members) do
    redis.call('SADD', KEYS[1], member)
end

-- 优化：一次性 SADD
redis.call('SADD', KEYS[1], unpack(members))
```

#### 8.4.3 避免大表序列化

Lua 返回值需序列化为 RESP 协议，大表序列化开销大：

```lua
-- 反模式：返回 10000 个元素
local result = {}
for i = 1, 10000 do
    table.insert(result, i)
end
return result

-- 优化：分批返回或使用游标
local start = tonumber(ARGV[1]) or 0
local batch_size = 100
local result = {}
for i = start, math.min(start + batch_size - 1, 10000) do
    table.insert(result, i)
end
return {result, start + batch_size}  -- 返回下一批游标
```

### 8.5 监控指标

监控 Redis Lua 脚本执行情况的关键指标：

1. **脚本执行次数**：通过 `INFO commandstats` 查看 `eval`、`evalsha`、`fcall` 的调用次数。
2. **脚本执行时间**：通过 `LATENCY` 监控慢脚本。
3. **脚本缓存命中率**：`EVALSHA` 失败次数（`NOSCRIPT` 错误）。
4. **脚本超时次数**：`SCRIPT KILL` 调用次数。

示例监控命令：

```bash
# 查看命令统计
redis-cli INFO commandstats | grep -E "eval|fcall"

# 监控慢脚本
redis-cli CONFIG SET slowlog-log-slower-than 10000  # 10ms
redis-cli SLOWLOG GET 10
```

### 8.6 安全审计

审计 Lua 脚本的安全性：

1. **键访问范围**：脚本是否只访问 `KEYS` 数组声明的键？
2. **写操作审计**：脚本是否包含意外的写操作？
3. **执行时间**：脚本是否有循环？预估最长执行时间。
4. **资源消耗**：脚本是否会创建大表或递归？

示例审计清单：

```lua
-- 审计清单模板
-- 1. 键访问：所有 redis.call 的 key 参数都来自 KEYS 数组？
-- 2. 写操作：列出所有写命令（SET/DEL/INCR/...）
-- 3. 循环：是否有 for/while？最大迭代次数？
-- 4. 资源：是否创建大表？是否会递归？

-- 标注示例：
-- [AUDIT] keys: KEYS[1], KEYS[2] (declared)
-- [AUDIT] writes: SET, DEL
-- [AUDIT] loops: for i=1,100 (bounded)
-- [AUDIT] resources: table max size 100
```

## 9. 案例研究

### 9.1 案例一：某电商秒杀系统

**项目背景**：某电商在双十一大促期间，热门商品秒杀 QPS 达 10 万级，使用 Redis Lua 脚本实现原子库存扣减。

**架构设计**：

1. **库存预热**：活动开始前，将库存数量写入 Redis。
2. **原子扣减**：使用 Lua 脚本保证"检查库存 + 扣减 + 记录订单"原子执行。
3. **订单异步落库**：扣减成功后，通过消息队列异步写入数据库。

**关键脚本**：

```lua
-- seckill_v2.lua：秒杀脚本（增强版）
-- KEYS[1]: 库存键 stock:{item_id}
-- KEYS[2]: 已下单用户集合 seckill:{item_id}:users
-- KEYS[3]: 订单队列 seckill:{item_id}:orders (List)
-- ARGV[1]: 用户 ID
-- ARGV[2]: 购买数量
-- ARGV[3]: 时间戳

local stock_key = KEYS[1]
local users_key = KEYS[2]
local orders_key = KEYS[3]
local user_id = ARGV[1]
local quantity = tonumber(ARGV[2])
local timestamp = ARGV[3]

-- 1. 检查用户是否已下单
if redis.call('SISMEMBER', users_key, user_id) == 1 then
    return {-1, "already_purchased"}
end

-- 2. 检查库存
local stock = tonumber(redis.call('GET', stock_key) or '0')
if stock < quantity then
    return {0, "out_of_stock", stock}
end

-- 3. 扣减库存
redis.call('DECRBY', stock_key, quantity)

-- 4. 记录用户
redis.call('SADD', users_key, user_id)

-- 5. 推送订单到队列（异步落库）
local order = string.format('{"user":"%s","quantity":%d,"timestamp":%s}', user_id, quantity, timestamp)
redis.call('LPUSH', orders_key, order)

return {1, "success", stock - quantity}
```

**经验总结**：

- Lua 脚本保证了秒杀的原子性，避免了超卖。
- 使用 Set 记录已下单用户，防止重复秒杀。
- 订单异步落库，避免数据库成为瓶颈。
- 使用 hash tag 保证 Cluster 路由：`stock:{item1000}`、`seckill:{item1000}:users`、`seckill:{item1000}:orders`。

### 9.2 案例二：某社交平台动态计数

**项目背景**：某社交平台需要实时统计每条动态的点赞数、评论数、转发数，QPS 达 50 万级。

**架构设计**：

1. **多计数器**：每条动态维护三个计数器（likes、comments、shares）。
2. **Lua 聚合**：使用 Lua 脚本一次性更新多个计数器。
3. **异步同步**：定期将 Redis 计数同步到数据库。

**关键脚本**：

```lua
-- update_counters.lua：更新动态计数器
-- KEYS[1]: 动态计数器 Hash post:{post_id}:counters
-- ARGV[1]: 操作类型（like/unlike/comment/uncomment/share/unshare）
-- ARGV[2]: 用户 ID（用于去重）

local counters_key = KEYS[1]
local action = ARGV[1]
local user_id = ARGV[2]

-- 操作映射
local delta_map = {
    like = {field = 'likes', delta = 1},
    unlike = {field = 'likes', delta = -1},
    comment = {field = 'comments', delta = 1},
    uncomment = {field = 'comments', delta = -1},
    share = {field = 'shares', delta = 1},
    unshare = {field = 'shares', delta = -1},
}

local op = delta_map[action]
if not op then
    return redis.error_reply("invalid action: " .. action)
end

-- 原子更新计数器
local new_value = redis.call('HINCRBY', counters_key, op.field, op.delta)

-- 防止计数器变为负数
if new_value < 0 then
    redis.call('HINCRBY', counters_key, op.field, -op.delta)
    return {0, "counter_would_be_negative"}
end

-- 返回所有计数器
local all = redis.call('HGETALL', counters_key)
return {1, new_value, all}
```

**经验总结**：

- Hash 结构存储多计数器，减少键数量。
- Lua 脚本保证原子更新与负数检查。
- 异步同步到数据库，避免数据库压力。

### 9.3 案例三：某金融系统风控

**项目背景**：某金融系统需要实时检测异常交易（如短时间高频转账、异地登录等），使用 Redis Lua 脚本实现规则引擎。

**架构设计**：

1. **规则定义**：每条规则用 Lua 脚本表达。
2. **数据存储**：用户行为日志存入 Redis Sorted Set。
3. **实时检测**：每笔交易触发规则检测。

**关键脚本**：

```lua
-- risk_check.lua：风控规则检测
-- KEYS[1]: 用户交易历史 user:{user_id}:transactions (Sorted Set)
-- ARGV[1]: 用户 ID
-- ARGV[2]: 交易金额
-- ARGV[3]: 当前时间戳
-- ARGV[4]: 高频阈值（如 5 分钟内 10 次）
-- ARGV[5]: 大额阈值

local history_key = KEYS[1]
local user_id = ARGV[1]
local amount = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local freq_limit = tonumber(ARGV[4])
local amount_limit = tonumber(ARGV[5])

-- 规则 1：大额交易检测
if amount > amount_limit then
    return {0, "large_amount", amount}
end

-- 规则 2：高频交易检测
-- 清理 5 分钟前的记录
local window = 300  -- 5 分钟
redis.call('ZREMRANGEBYSCORE', history_key, '-inf', now - window)

-- 统计窗口内交易次数
local count = redis.call('ZCARD', history_key)
if count >= freq_limit then
    return {0, "high_frequency", count}
end

-- 记录本次交易
redis.call('ZADD', history_key, now, now .. ':' .. amount)
redis.call('EXPIRE', history_key, window + 1)

-- 规则 3：累计金额检测
local total = 0
local transactions = redis.call('ZRANGE', history_key, 0, -1, 'WITHSCORES')
for i = 2, #transactions, 2 do
    local member = transactions[i - 1]
    local amt = tonumber(member:match(":(.+)$"))
    total = total + amt
end

if total > amount_limit * 10 then
    return {0, "cumulative_amount", total}
end

return {1, "passed", count + 1}
```

**经验总结**：

- Lua 脚本实现复杂规则逻辑，避免多次网络往返。
- Sorted Set 存储时间序列数据，便于窗口统计。
- 规则可动态调整（通过 ARGV 传入参数）。

### 9.4 案例四：某 IoT 平台设备状态

**项目背景**：某 IoT 平台管理百万级设备，需实时维护设备在线状态、传感器数据。

**架构设计**：

1. **设备状态 Hash**：每设备一个 Hash，存储状态、最后上线时间等。
2. **在线设备集合**：全局 Set 存储所有在线设备。
3. **Lua 聚合**：设备上报时原子更新多个数据结构。

**关键脚本**：

```lua
-- device_heartbeat.lua：设备心跳上报
-- KEYS[1]: 设备状态 device:{device_id}
-- KEYS[2]: 在线设备集合 devices:online
-- ARGV[1]: 设备 ID
-- ARGV[2]: 当前时间戳
-- ARGV[3]: 设备状态（JSON）

local device_key = KEYS[1]
local online_key = KEYS[2]
local device_id = ARGV[1]
local timestamp = ARGV[2]
local status = ARGV[3]

-- 更新设备状态
redis.call('HSET', device_key, 'status', status, 'last_seen', timestamp)
redis.call('EXPIRE', device_key, 600)  -- 10 分钟无心跳则过期

-- 加入在线集合
redis.call('SADD', online_key, device_id)

return {1, redis.call('HGETALL', device_key)}
```

```lua
-- device_offline_check.lua：离线检测
-- KEYS[1]: 在线设备集合 devices:online
-- ARGV[1]: 当前时间戳

local online_key = KEYS[1]
local now = tonumber(ARGV[1])

local offline_devices = {}
local online = redis.call('SMEMBERS', online_key)

for _, device_id in ipairs(online) do
    local device_key = 'device:' .. device_id
    local exists = redis.call('EXISTS', device_key)
    if exists == 0 then
        -- 设备 Hash 已过期，说明超过 10 分钟无心跳
        redis.call('SREM', online_key, device_id)
        table.insert(offline_devices, device_id)
    end
end

return offline_devices
```

**经验总结**：

- Hash + Set 组合实现设备状态管理。
- Lua 脚本保证状态更新的原子性。
- TTL 机制实现自动离线检测。

## 10. 习题

### 10.1 基础题

**题目 1**：以下哪个命令用于执行已缓存的 Lua 脚本？

A. `EVAL`  
B. `EVALSHA`  
C. `SCRIPT RUN`  
D. `LUA EXEC`  

**答案要点**：B。`EVALSHA` 通过 SHA1 哈希引用已缓存的脚本，避免重复传输脚本内容。

**题目 2**：Redis 的 nil（键不存在）在 Lua 中映射为？

A. `nil`  
B. `false`  
C. `0`  
D. `""`  

**答案要点**：B。Redis nil 映射为 Lua 的 `false`，这是初学者最常踩的坑。判断键不存在应使用 `if value == false`。

**题目 3**：在 Redis Cluster 中，Lua 脚本的所有键必须满足什么条件？

A. 键名长度相同  
B. 位于同一哈希槽  
C. 数据类型相同  
D. 创建时间相近  

**答案要点**：B。Cluster 中脚本的所有键必须位于同一哈希槽，否则 Cluster 无法正确路由。通常使用 hash tag（如 `user:{1000}:profile`）保证。

### 10.2 进阶题

**题目 4**：设计一个基于 Redis 的延迟队列，要求：

- 支持延迟 1 秒到 1 小时的任务。
- 支持任务取消。
- 支持任务重试（失败后延迟 30 秒重试，最多 3 次）。

**答案要点**：

使用 Sorted Set 存储延迟任务，score 为执行时间戳：

```lua
-- enqueue.lua：入队延迟任务
-- KEYS[1]: 延迟队列 delayed:queue (Sorted Set)
-- ARGV[1]: 任务 ID
-- ARGV[2]: 执行时间戳
-- ARGV[3]: 任务内容

redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1] .. ':' .. ARGV[3])
return 1
```

```lua
-- dequeue.lua：出队到期任务
-- KEYS[1]: 延迟队列 delayed:queue
-- KEYS[2]: 处理中队列 processing:queue
-- ARGV[1]: 当前时间戳
-- ARGV[2]: 最大取出数量

local delayed_key = KEYS[1]
local processing_key = KEYS[2]
local now = tonumber(ARGV[1])
local max_count = tonumber(ARGV[2])

-- 取出到期任务
local tasks = redis.call('ZRANGEBYSCORE', delayed_key, '-inf', now, 'LIMIT', 0, max_count)

if #tasks == 0 then
    return nil
end

-- 从延迟队列移除，加入处理中队列
for _, task in ipairs(tasks) do
    redis.call('ZREM', delayed_key, task)
    redis.call('ZADD', processing_key, now + 300, task)  -- 5 分钟处理超时
end

return tasks
```

```lua
-- retry.lua：任务重试
-- KEYS[1]: 延迟队列 delayed:queue
-- KEYS[2]: 处理中队列 processing:queue
-- ARGV[1]: 任务 ID
-- ARGV[2]: 当前时间戳
-- ARGV[3]: 重试次数

local task_id = ARGV[1]
local now = tonumber(ARGV[2])
local retry_count = tonumber(ARGV[3])

if retry_count >= 3 then
    -- 超过最大重试次数，进入死信队列（此处省略）
    return 0
end

-- 从处理中队列移除
redis.call('ZREM', KEYS[2], task_id)

-- 重新加入延迟队列，30 秒后执行
redis.call('ZADD', KEYS[1], now + 30, task_id .. ':retry:' .. retry_count)
return 1
```

**题目 5**：解释为什么 `redis.call` 在脚本中执行 `KEYS *` 命令是危险的，并给出替代方案。

**答案要点**：

`KEYS *` 的时间复杂度为 O(n)，n 为 Redis 中所有键的数量。在百万级键的实例上，单次 `KEYS *` 可能阻塞数秒，期间所有其他客户端请求被挂起。

替代方案：

1. **SCAN 命令**：分批扫描，每次返回部分键与游标。但注意，脚本内 `SCAN` 仍有阻塞风险（脚本原子执行）。
2. **维护索引**：业务侧维护键的索引集合，如 `Set<string> user_keys`，查询时先获取索引再批量查询。
3. **使用特定前缀**：通过 `KEYS user:*` 缩小范围（但仍不推荐）。
4. **业务设计**：避免全量扫描需求，通过精确键名查询。

## 10.3 挑战题

**题目 6**：设计一个基于 Redis 的分布式限流集群，要求：

- 支持每秒 100 万级 QPS。
- 限流规则可动态更新。
- 集群中任意节点故障不影响限流准确性。
- 支持滑动窗口与令牌桶两种算法。

**答案要点**：

设计要点：

1. **本地预扣 + 集群同步**：每个应用节点本地维护令牌计数器，定期从 Redis 批量获取令牌。
2. **规则中心化**：限流规则存入 Redis，应用节点订阅变更。
3. **多 Redis 实例**：限流数据分片到多个 Redis 实例，避免单点瓶颈。
4. **容错降级**：Redis 不可用时降级为本地限流。

核心架构：

```
应用节点 1 ──┐
应用节点 2 ──┼──> Redis 集群（分片）
应用节点 N ──┘
```

每个应用节点：

- 本地维护令牌计数器（如 AtomicLong）。
- 本地令牌不足时，从 Redis 批量获取（如 1000 个）。
- Redis 不可用时，使用本地计数器继续限流（牺牲准确性保证可用性）。

**题目 7**：分析以下分布式锁实现的缺陷，并提出改进方案。

```lua
-- 加锁
redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', 30)
-- 解锁
if redis.call('GET', KEYS[1]) == ARGV[1] then
    redis.call('DEL', KEYS[1])
end
```

**答案要点**：

**缺陷分析**：

1. **GC 暂停风险**：客户端获取锁后因 GC 暂停超过 30 秒，锁自动过期，其他客户端获取锁，导致多个客户端同时持有锁。
2. **时钟漂移**：TTL 依赖 Redis 服务器时钟，若时钟回拨，锁可能提前或延后过期。
3. **解锁非原子**：`GET` 与 `DEL` 之间存在时间窗口，可能被其他客户端干扰。
4. **无续期机制**：业务执行时间不确定，固定 30 秒 TTL 可能不够。

**改进方案**：

1. **Fencing Token**：每次加锁返回递增的 token，业务操作时携带 token，存储层校验 token 有效性。

```lua
-- 加锁（返回 fencing token）
local token = redis.call('INCR', 'lock:seq')
redis.call('SET', KEYS[1], ARGV[1] .. ':' .. token, 'NX', 'EX', 30)
return token
```

2. **续期机制**：业务执行期间定期续期。

```lua
-- 续期
local value = redis.call('GET', KEYS[1])
if value == ARGV[1] then
    redis.call('EXPIRE', KEYS[1], 30)
    return 1
end
return 0
```

3. **原子解锁**：使用 Lua 脚本保证 GET + DEL 原子。

```lua
-- 原子解锁
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0
```

4. **Redlock 算法**：在多个独立 Redis 实例上获取锁，多数成功才算加锁成功。

**题目 8**：实现一个 Redis Function 库，封装以下功能：

- `counter.incr(key, delta, limit)`：带上限的计数器。
- `counter.reset(key)`：重置计数器。
- `queue.push(key, value, priority)`：优先级队列入队。
- `queue.pop(key)`：优先级队列出队。

**答案要点**：

```lua
-- mylib.lua：自定义 Function 库
#!lua name=mylib

-- 计数器模块
local function counter_incr(keys, args)
    local key = keys[1]
    local delta = tonumber(args[1])
    local limit = tonumber(args[2])

    local current = redis.call('INCRBY', key, delta)
    if current > limit then
        -- 超限，回滚
        redis.call('INCRBY', key, -delta)
        return {err = "limit_exceeded", current = current - delta}
    end
    return current
end

local function counter_reset(keys, args)
    local key = keys[1]
    redis.call('DEL', key)
    return 1
end

-- 队列模块
local function queue_push(keys, args)
    local key = keys[1]
    local value = args[1]
    local priority = tonumber(args[2]) or 0

    redis.call('ZADD', key, priority, value)
    return 1
end

local function queue_pop(keys, args)
    local key = keys[1]

    local result = redis.call('ZPOPMIN', key)
    if #result == 0 then
        return nil
    end
    return result[1]  -- 返回 value（忽略 score）
end

-- 注册函数
redis.register_function('counter.incr', counter_incr)
redis.register_function('counter.reset', counter_reset)
redis.register_function('queue.push', queue_push)
redis.register_function('queue.pop', queue_pop)
```

加载与调用：

```bash
# 加载 Function 库
redis-cli FUNCTION LOAD REPLACE "$(cat mylib.lua)"

# 调用 counter.incr
redis-cli FCALL counter.incr 1 my_counter 1 100

# 调用 queue.push
redis-cli FCALL queue.push 1 my_queue "task1" 1

# 调用 queue.pop
redis-cli FCALL queue.pop 1 my_queue
```

## 11. 参考文献

[1] Salvatore Sanfilippo. 2012. Redis 2.6.0 Release Notes: Lua Scripts Support. Redis Project. https://raw.githubusercontent.com/redis/redis/2.6/00-RELEASENOTES

[2] Redis Ltd. 2024. Redis Lua Scripting Documentation. https://redis.io/docs/manual/programmability/lua/

[3] Redis Ltd. 2024. Redis Functions Documentation. https://redis.io/docs/manual/programmability/functions/

[4] Roberto Ierusalimschy, Luiz Henrique de Figueiredo, and Waldemar Celes. 2018. Lua 5.4 Reference Manual. PUC-Rio. https://www.lua.org/manual/5.4/

[5] Martin Kleppmann. 2017. Designing Data-Intensive Applications. O'Reilly Media, Chapter 8: The Trouble with Distributed Systems.

[6] Salvatore Sanfilippo. 2014. Is Redlock Safe?. Redis Blog. http://antirez.com/news/101

[7] Martin Fowler. 2015. Circuit Breaker. https://martinfowler.com/bliki/CircuitBreaker.html

[8] Tao Wang and Junji Zhi. 2021. Distributed Rate Limiting with Redis and OpenResty. In Proceedings of the International Conference on Web Engineering (ICWE 2021). Springer, 234–248. DOI: 10.1007/978-3-030-77096-6_18

[9] Apache Software Foundation. 2024. Apache APISIX Rate Limiting Plugin. https://apisix.apache.org/docs/apisix/plugins/limit-req/

[10] Redis Ltd. 2023. Redis Cluster Specification. https://redis.io/docs/reference/cluster-spec/

[11] Cloudflare. 2022. How Cloudflare Uses Redis for Rate Limiting. Cloudflare Blog. https://blog.cloudflare.com/

[12] Zhang Wei and Li Ming. 2020. Designing a High-Throughput Seckill System with Redis. In Proceedings of the IEEE International Conference on Web Services (ICWS 2020). IEEE, 312–319. DOI: 10.1109/ICWS49710.2020.00047

## 12. 延伸阅读

### 12.1 官方文档

- **Redis Lua 脚本文档**：https://redis.io/docs/manual/programmability/lua/
  涵盖 `EVAL`、`EVALSHA`、`redis.call`、类型转换等核心概念。

- **Redis Functions 文档**：https://redis.io/docs/manual/programmability/functions/
  Redis 7.0 引入的 Functions 机制，是 Lua 脚本的增强替代方案。

- **Redis Cluster 规范**：https://redis.io/docs/reference/cluster-spec/
  理解 Cluster 中的键分布约束与 hash tag 机制。

### 12.2 经典书籍

- **《Redis 设计与实现》**（黄健宏 著）：深入理解 Redis 内部机制，包括 Lua 脚本执行流程。
- **《Redis 实战》**（Josiah L. Carlson 著）：包含大量 Lua 脚本实战案例。
- **《数据密集型应用系统设计》**（Martin Kleppmann 著）：分布式系统理论的经典之作，含分布式锁的深度讨论。

### 12.3 社区资源

- **Redis GitHub**：https://github.com/redis/redis
  源码、issue、PR，跟踪最新进展。

- **Redis 邮件列表**：https://groups.google.com/g/redis-db
  与开发者交流，获取技术支持。

- **Redis 中文社区**：https://redis.cn/
  中文文档与讨论。

### 12.4 进阶主题

- **Redis Modules**：通过 C 模块扩展 Redis，可实现比 Lua 脚本更高性能的自定义命令。
- **Redis Streams**：Redis 5.0 引入的消息队列数据结构，支持消费者组。
- **RedisJSON**：Redis 模块，支持原生 JSON 数据类型与路径查询。
- **RediSearch**：全文搜索引擎模块，支持复杂查询。
- **RedisTimeSeries**：时序数据模块，适合 IoT 与监控场景。

### 12.5 相关项目

- **Redisson**：https://redisson.org/
  Java 生态的 Redis 客户端，封装了分布式锁、限流器等常用组件。

- **Spring Data Redis**：https://spring.io/projects/spring-data-redis
  Spring 生态的 Redis 集成，支持 `RedisScript` 执行 Lua 脚本。

- **Redis Cell**：https://github.com/brandur/redis-cell
  基于 Redis Module 的限流器，性能优于 Lua 脚本实现。

- **Bucket4j**：https://github.com/bucket4j/bucket4j
  Java 令牌桶限流库，支持 Redis 作为后端。

- **Envoy Ratelimit**：https://github.com/envoyproxy/ratelimit
  Envoy 代理的限流服务，支持 Redis 作为后端。

通过本篇文档的系统学习，读者应能掌握 Redis Lua 脚本的核心机制、工程实践与高阶应用，具备构建高并发、原子性业务逻辑的能力。建议结合实际项目反复实践，深化对 Redis 单线程模型下脚本执行特性的理解。特别需要注意脚本执行时间、键分布约束、类型转换等关键细节，避免生产环境踩坑。
