---
order: 89
title: Go与限流
module: go
category: Go
difficulty: advanced
description: 'Go限流与熔断详解：令牌桶、漏桶、滑动窗口、分布式限流、熔断器、自适应限流与工程实践'
author: fanquanpp
updated: '2026-07-21'
related:
  - go/Go与OAuth2
  - go/Go与分布式追踪
  - go/goroutine与channel通信原理
  - go/GMP调度模型
  - go/Go与时间
  - go/并发模式
prerequisites:
  - go/概述与环境配置
  - go/基础语法
  - go/goroutine与channel通信原理
  - go/Go与时间
  - go/并发原语
tags:
  - rate-limiting
  - token-bucket
  - sliding-window
  - circuit-breaker
  - gobreaker
  - semaphore
  - redis
  - adaptive
keywords:
  - Go 限流
  - 令牌桶
  - 漏桶
  - 滑动窗口
  - 熔断器
  - rate.Limiter
  - gobreaker
  - 自适应限流
  - 分布式限流
  - Redis 限流
---

# Go 与限流（Rate Limiting）

> 限流（Rate Limiting）与熔断（Circuit Breaking）是分布式系统稳定性的两大核心保护机制。限流控制单位时间内请求数量，防止系统过载；熔断在检测到下游异常时主动断开调用，避免故障扩散。Go 标准库与社区生态（`golang.org/x/time/rate`、`gobreaker`、`sony/gobreaker`、`resilience4j` 思想的 Go 实现）提供了完善的限流与熔断能力。本文从算法原理、形式化定义、源码实现、工程实践到生产案例，系统化剖析 Go 限流与熔断的全部要点。

## 1. 学习目标

学完本文后，读者应能够在以下认知层级上掌握 Go 限流与熔断（依据 Bloom 修订版分类法）：

### 1.1 记忆层（Remembering）

- 复述令牌桶（Token Bucket）算法的核心机制：固定速率生成令牌、桶容量限制突发、请求消耗令牌。
- 列举漏桶（Leaky Bucket）、滑动窗口（Sliding Window）、固定窗口（Fixed Window）四种主流限流算法的差异。
- 说明 `golang.org/x/time/rate` 包的核心 API：`NewLimiter`、`Allow`、`Wait`、`Reserve`、`SetRate`、`SetBurst`。
- 列举熔断器的三种状态：Closed（关闭）、Open（打开）、HalfOpen（半开）。

### 1.2 理解层（Understanding）

- 解释令牌桶与漏桶在突发流量（burst）处理上的本质差异：令牌桶允许瞬间突发，漏桶强制匀速。
- 阐述滑动窗口算法如何解决固定窗口的边界问题（相邻两个窗口各 99% 时实际通过 198%）。
- 区分熔断器的"失败计数熔断"与"超时率熔断"两种触发策略。
- 说明 `rate.Limiter` 的 `Reserve` 方法为何返回 `Delay`：基于令牌补充速率精确计算等待时间。

### 1.3 应用层（Applying）

- 使用 `rate.NewLimiter` 为 HTTP 中间件实现单机全局限流。
- 使用 `sync.Map` 为每个客户端（IP / 用户 ID）维护独立限流器。
- 使用 Redis ZSET 实现分布式滑动窗口限流。
- 使用 `gobreaker` 包装下游 HTTP 调用，实现熔断保护。
- 使用 `golang.org/x/sync/semaphore` 限制并发数。

### 1.4 分析层（Analyzing）

- 拆解 `rate.Limiter` 的实现：基于时间戳计算可用令牌数，避免后台 goroutine 不断补充令牌。
- 分析按客户端限流的内存泄漏问题：客户端无限增长导致 `sync.Map` 持续膨胀，需 LRU 淘汰。
- 对比单机限流与分布式限流在多实例部署时的差异：单机限流无法保证全局阈值。
- 评估熔断器参数（`MaxRequests`、`Timeout`、`ReadyToTrip`）对系统恢复速度的影响。

### 1.5 评价层（Evaluating）

- 评价"令牌桶 + 漏桶 + 滑动窗口"三种算法在不同业务场景（API 网关、消息队列、数据库连接池）的适用性。
- 评估自适应限流（如 Netflix Concurrency Limits、BBR-based）相比静态限流的优势与复杂性。
- 权衡"快速失败"（限流返回 429）与"排队等待"（`limiter.Wait`）对用户体验的影响。

### 1.6 创造层（Creating）

- 设计一个支持优先级的限流器：高优先级请求优先获取令牌，低优先级请求排队。
- 实现一个基于 CPU 负载与 P99 延迟的自适应限流器，动态调整阈值。
- 构建一个统一限流组件，集成单机限流、分布式限流、熔断、降级，提供声明式配置。

---

## 2. 历史动机与背景

### 2.1 限流算法的起源

限流（Rate Limiting）最早源于电信网络的流量控制（Traffic Policing）。20 世纪 60 年代，AT&T Bell Labs 在分组交换网络研究中提出了最早的令牌桶算法：

- **1965**：IBM 研究员 J. R. W. Smith 提出"bucket algorithm"概念，用于控制数据传输速率。
- **1989**：ITU-T（国际电信联盟）在 I.371 标准中正式定义了"Token Bucket"与"Leaky Bucket"两种算法。
- **1995**：Cisco 路由器首次实现基于令牌桶的流量监管（Committed Access Rate, CAR）。
- **1999**：Google 在搜索后端引入限流机制，防止爬虫拖垮核心服务。

### 2.2 熔断器的起源

熔断器（Circuit Breaker）概念源于电气工程，由 Michael Nygard 在 2007 年的著作 *Release It!* 中首次引入软件工程领域：

- **2007**：Nygard 提出 Circuit Breaker 模式，保护下游服务调用。
- **2012**：Netflix 开源 Hystrix，将熔断、隔离、降级整合为完整容错框架。
- **2015**：Go 社区出现 `sony/gobreaker`，提供轻量级熔断实现。
- **2017**：Hystrix 停止维护，社区转向 Resilience4j（Java）与各语言的轻量实现。
- **2019**：Netflix 发布 Concurrency Limits，提出自适应限流思想。

### 2.3 Go 限流生态演进

| 年份 | 工具/库 | 说明 |
|------|---------|------|
| 2015 | `golang.org/x/time/rate` | Go 官方扩展库提供令牌桶实现 |
| 2015 | `github.com/sony/gobreaker` | Sony 开源的 Go 熔断器实现 |
| 2016 | `github.com/afex/hystrix-go` | Netflix Hystrix 的 Go 移植版 |
| 2017 | `github.com/ulule/limiter` | 支持多种后端（Redis、Memcached）的限流库 |
| 2018 | `github.com/throttled/throttled` | 支持 Redis 的分布式限流库 |
| 2019 | `github.com/go-redis/redis_rate` | 基于 Redis 的令牌桶限流 |
| 2020 | `github.com/cep21/circuit` | Go 熔断器库（受 Hystrix 启发） |
| 2022 | `github.com/sony/gobreaker/v2` | gobreaker v2 发布，支持泛型 |
| 2023 | `github.com/sourcegraph/conc` | 提供 `pool`、`waitgroup` 等并发原语 |

### 2.4 为什么需要限流与熔断

分布式系统中的稳定性问题：

1. **突发流量（Flash Crowd）**：秒杀、热点新闻、DDoS 攻击可能导致请求量瞬间激增 10-100 倍。
2. **雪崩效应（Cascading Failure）**：下游服务慢响应导致上游连接堆积，拖垮整个调用链。
3. **资源耗尽（Resource Exhaustion）**：连接池、线程池、内存等有限资源被耗尽，拒绝正常请求。
4. **级联故障（Cascading Failure）**：单个服务故障通过同步调用传播至整个系统。

限流与熔断的分工：

- **限流**：控制**进入系统的请求量**，保护自身不被打垮。
- **熔断**：控制**调用下游的请求量**，保护自身不被下游拖垮。
- **隔离**：限制不同业务间资源争抢（信号量、Bulkhead）。
- **降级**：在故障时返回兜底响应，保证核心链路可用。

### 2.5 与其他语言生态对比

- **Java**：Resilience4j（函数式 + 装饰器模式）、Hystrix（已停维护）、Sentinel（阿里，支持流控、熔断、热点限流）。
- **Rust**：`tower` 框架提供限流与熔断中间件，`governor` 实现令牌桶。
- **Python**：`ratelimit` 装饰器、`aiometer` 异步限流。
- **Node.js**：`express-rate-limit`、`bottleneck`。

Go 的优势：

1. **标准库官方维护**：`golang.org/x/time/rate` 由 Go 团队维护，质量有保障。
2. **轻量无依赖**：`gobreaker` 仅数百行代码，无第三方依赖。
3. **goroutine 友好**：`rate.Limiter` 基于时间戳而非后台 goroutine，无锁竞争。

---

## 3. 形式化定义

### 3.1 令牌桶算法的形式化

令牌桶（Token Bucket）由两个参数描述：

- $r$：令牌生成速率（tokens per second），即每秒补充的令牌数。
- $b$：桶容量（burst），桶能容纳的最大令牌数。

设 $T(t)$ 为时刻 $t$ 桶中的令牌数，则令牌数随时间变化：

$$
T(t) = \min\left(b, \, T(t_0) + r \cdot (t - t_0)\right)
$$

其中 $t_0$ 是上次更新时间。请求消耗令牌：

$$
\text{Allow}(n) = \begin{cases}
\text{true} & \text{若 } T(t) \geq n \\
\text{false} & \text{否则}
\end{cases}
$$

若允许则 $T(t) \leftarrow T(t) - n$。

### 3.2 漏桶算法的形式化

漏桶（Leaky Bucket）以固定速率 $r$ "漏出"（处理）请求，桶容量 $b$ 限制排队请求数：

$$
Q(t) = \min\left(b, \, Q(t_0) + \text{Arrivals}(t_0, t) - r \cdot (t - t_0)\right)
$$

其中 $Q(t)$ 是队列长度，$\text{Arrivals}(t_0, t)$ 是 $(t_0, t)$ 内到达的请求数。

令牌桶与漏桶的核心差异：

- 令牌桶允许瞬间突发 $b$ 个请求（桶满时），平均速率受 $r$ 限制。
- 漏桶强制匀速 $r$，超出 $b$ 的请求直接丢弃。

### 3.3 滑动窗口算法的形式化

设窗口长度为 $W$，当前时刻 $t$，滑动窗口内请求数：

$$
N(t) = \left| \{ \text{req} \mid t - W \leq \text{time}(\text{req}) \leq t \} \right|
$$

限流决策：

$$
\text{Allow}(t) = \begin{cases}
\text{true} & \text{若 } N(t) < L \\
\text{false} & \text{否则}
\end{cases}
$$

其中 $L$ 是窗口内允许的最大请求数。

滑动窗口的精度优化：将窗口分为 $k$ 个小格子（cell），每个格子记录一个时间段的请求数：

$$
N(t) = \sum_{i=0}^{k-1} \text{cell}_i(t - i \cdot W/k)
$$

复杂度从 $O(N)$ 降至 $O(k)$，$k$ 通常取 5-10。

### 3.4 熔断器状态机的形式化

熔断器是一个三状态有限自动机：

$$
\text{State} = \{ \text{Closed}, \text{Open}, \text{HalfOpen} \}
$$

状态转移：

$$
\begin{aligned}
\text{Closed} &\xrightarrow{\text{failures} \geq \text{threshold}} \text{Open} \\
\text{Open} &\xrightarrow{t > \text{Timeout}} \text{HalfOpen} \\
\text{HalfOpen} &\xrightarrow{\text{successes} \geq \text{successThreshold}} \text{Closed} \\
\text{HalfOpen} &\xrightarrow{\text{failure}} \text{Open}
\end{aligned}
$$

在 Open 状态下，所有请求直接失败（快速失败，fail-fast）；在 HalfOpen 状态下，允许有限个测试请求通过。

### 3.5 限流决策的代价模型

限流的代价包括：

$$
C_{\text{limit}} = C_{\text{decision}} + C_{\text{state}} + C_{\text{storage}}
$$

- $C_{\text{decision}}$：算法决策开销。令牌桶 $O(1)$，滑动窗口 $O(k)$。
- $C_{\text{state}}$：状态维护开销。单机内存 $O(1)$，分布式需同步。
- $C_{\text{storage}}$：状态存储开销。单机 `sync.Map` $O(N)$，Redis $O(N)$。

对 `rate.Limiter`：$C_{\text{limit}} \approx O(1)$（原子操作 + 时间戳计算）。

---

## 4. 理论推导

### 4.1 令牌桶的无锁实现

`golang.org/x/time/rate` 的核心实现基于"惰性补充"（lazy refill）：

1. **记录上次更新时间**：`last time.Time`。
2. **请求时计算当前可用令牌数**：

$$
\text{tokens}(t) = \min\left(b, \, \text{tokens}(t_0) + r \cdot (t - t_0)\right)
$$

3. **判断与消耗**：若 $\text{tokens}(t) \geq n$ 则消耗 $n$ 个令牌，更新 $\text{tokens}$ 与 $t_0$。

这种实现避免了后台 goroutine 不断补充令牌，仅需原子操作即可。伪代码：

```go
// Allow 判断是否允许消耗 n 个令牌
func (lim *Limiter) AllowN(now time.Time, n int) bool {
    lim.mu.Lock()
    defer lim.mu.Unlock()

    // 计算从上次到现在新增的令牌
    elapsed := now.Sub(lim.last)
    delta := int(elapsed.Seconds() * float64(lim.rate))
    tokens := min(lim.burst, lim.tokens + delta)

    if tokens >= n {
        lim.tokens = tokens - n
        lim.last = now
        return true
    }
    return false
}
```

注意：实际实现使用浮点数表示令牌数，以支持小于 1 的速率（如 0.5 token/s）。

### 4.2 Reserve 方法的延迟计算

`Reserve` 方法不立即拒绝请求，而是计算需要等待多久才能获取令牌：

$$
\text{Delay}(t, n) = \max\left(0, \, \frac{n - \text{tokens}(t)}{r}\right)
$$

若 $n > b$（请求令牌数超过桶容量），`Delay` 无穷大，`Reserve` 返回 `OK=false`。

使用 `time.Sleep(reservation.Delay())` 可精确等待，实现"匀速 + 排队"语义。

### 4.3 滑动窗口的 Redis 实现

使用 Redis ZSET 存储请求时间戳：

1. **移除窗口外记录**：`ZREMRANGEBYSCORE key 0 (now - window)`。
2. **添加当前请求**：`ZADD key now member`。
3. **统计窗口内数量**：`ZCARD key`。
4. **设置过期**：`EXPIRE key window`（避免内存泄漏）。

复杂度：$O(\log N + N)$，$N$ 为窗口内请求数。

优化：使用 Lua 脚本保证原子性：

```lua
-- KEYS[1]: 限流 key
-- ARGV[1]: 当前时间戳
-- ARGV[2]: 窗口大小（秒）
-- ARGV[3]: 限制数量
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)
local count = redis.call('ZCARD', key)
if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('PEXPIRE', key, window * 1000)
    return 1
else
    return 0
end
```

### 4.4 令牌桶的分布式实现

Redis 令牌桶需保证原子性。常用方案：

1. **Redis + Lua 脚本**：在 Redis 内计算令牌数，原子操作。
2. **Redis Cell 模块**：Redis 官方的限流模块（`CL.THROTTLE` 命令）。

Lua 脚本核心逻辑：

```lua
-- 令牌桶：维护上次更新时间与剩余令牌
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(data[1]) or capacity
local last = tonumber(data[2]) or now

local delta = max(0, now - last) * rate
tokens = min(capacity, tokens + delta)

local allowed = tokens >= 1
if allowed then
    tokens = tokens - 1
end

redis.call('HMSET', key, 'tokens', tokens, 'last', now)
redis.call('EXPIRE', key, 60)

return allowed
```

### 4.5 熔断器的状态转移推导

熔断器的核心是"失败统计"与"状态转移"。

设时间窗口 $W$ 内的总请求数为 $N$，失败数为 $F$，则失败率：

$$
\text{failRate} = \frac{F}{N}
$$

熔断触发条件：

$$
\text{trip} = (N \geq \text{minRequests}) \land \left( \text{failRate} \geq \text{threshold} \lor F \geq \text{consecutiveFailures} \right)
$$

其中 `minRequests` 避免少量请求时的误判（如 3 次请求失败 2 次，失败率 67%，但样本不足）。

恢复策略：

- **定时恢复**：Open 状态持续 `Timeout` 时间后转入 HalfOpen。
- **探测恢复**：HalfOpen 状态下允许 `MaxRequests` 个请求通过，若全部成功则恢复 Closed，任一失败则回到 Open。

### 4.6 复杂度分析

| 操作 | 时间复杂度 | 备注 |
|------|----------|------|
| `rate.Limiter.Allow` | $O(1)$ | 原子操作 + 时间戳计算 |
| `rate.Limiter.Wait` | $O(\text{delay})$ | 阻塞等待 |
| 滑动窗口（内存） | $O(k)$ | $k$ 个格子 |
| 滑动窗口（Redis ZSET） | $O(\log N)$ | ZSET 操作 |
| 熔断器状态更新 | $O(1)$ | 计数器更新 |
| 按客户端限流查找 | $O(1)$ 均摊 | `sync.Map` |

---

## 5. 代码示例

### 5.1 基础：rate.Limiter 基本用法

```go
// Package main 演示 golang.org/x/time/rate 的基本用法
package main

import (
    "context"
    "fmt"
    "time"

    "golang.org/x/time/rate"
)

func main() {
    // 创建限流器：每秒 10 个令牌，桶容量 5（允许 5 个突发）
    limiter := rate.NewLimiter(10, 5)

    // 方式1：Allow - 立即返回是否允许
    for i := 0; i < 10; i++ {
        if limiter.Allow() {
            fmt.Printf("请求 %d 通过\n", i+1)
        } else {
            fmt.Printf("请求 %d 被限流\n", i+1)
        }
    }

    // 方式2：Wait - 阻塞等待直到获取令牌
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    if err := limiter.Wait(ctx); err != nil {
        fmt.Println("等待超时或被取消:", err)
    }

    // 方式3：Reserve - 预留令牌，返回需要等待的时间
    reservation := limiter.Reserve()
    if !reservation.OK() {
        fmt.Println("令牌数超过桶容量")
        return
    }
    delay := reservation.Delay()
    fmt.Printf("需要等待 %v\n", delay)
    time.Sleep(delay)

    // 动态调整速率
    limiter.SetLimit(20) // 调整为每秒 20 个
    limiter.SetBurst(10) // 调整桶容量为 10
}
```

### 5.2 HTTP 中间件限流

```go
// Package middleware 提供 HTTP 限流中间件
package middleware

import (
    "net/http"

    "golang.org/x/time/rate"
)

// RateLimitMiddleware 全局限流中间件
// 参数：
//   - limiter: 限流器实例
// 返回：HTTP 中间件函数
func RateLimitMiddleware(limiter *rate.Limiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if !limiter.Allow() {
                // 设置 Retry-After 头，告知客户端重试等待时间
                w.Header().Set("Retry-After", "1")
                http.Error(w, "请求过于频繁，请稍后再试", http.StatusTooManyRequests)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}

// 使用示例
// limiter := rate.NewLimiter(100, 10) // 每秒 100 个，突发 10
// handler := RateLimitMiddleware(limiter)(mux)
// http.ListenAndServe(":8080", handler)
```

### 5.3 按客户端限流（IP 维度）

```go
// Package middleware 提供按 IP 限流中间件
package middleware

import (
    "net"
    "net/http"
    "sync"

    "golang.org/x/time/rate"
)

// IPRateLimiter 按 IP 限流器
type IPRateLimiter struct {
    limiters sync.Map // map[string]*rate.Limiter
    rate     rate.Limit
    burst    int
}

// NewIPRateLimiter 创建按 IP 限流器
// 参数：
//   - r: 每秒令牌数
//   - burst: 桶容量
func NewIPRateLimiter(r rate.Limit, burst int) *IPRateLimiter {
    return &IPRateLimiter{
        rate:  r,
        burst: burst,
    }
}

// GetLimiter 获取或创建指定 IP 的限流器
func (l *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
    if limiter, ok := l.limiters.Load(ip); ok {
        return limiter.(*rate.Limiter)
    }
    limiter := rate.NewLimiter(l.rate, l.burst)
    l.limiters.Store(ip, limiter)
    return limiter
}

// Middleware 返回 HTTP 中间件
func (l *IPRateLimiter) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 提取客户端 IP（考虑反向代理）
        ip, _, err := net.SplitHostPort(r.RemoteAddr)
        if err != nil {
            ip = r.RemoteAddr
        }
        if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
            ip = forwarded
        }

        if !l.GetLimiter(ip).Allow() {
            w.Header().Set("Retry-After", "1")
            http.Error(w, "请求过于频繁", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

### 5.4 按 IP 限流 + LRU 淘汰（防内存泄漏）

```go
// Package middleware 提供带 LRU 淘汰的按 IP 限流器
package middleware

import (
    "container/list"
    "sync"
    "time"

    "golang.org/x/time/rate"
)

// ipEntry 限流器条目
type ipEntry struct {
    ip      string
    limiter *rate.Limiter
    lastUse time.Time
}

// LRUIPRateLimiter 带 LRU 淘汰的按 IP 限流器
type LRUIPRateLimiter struct {
    mu       sync.Mutex
    entries  map[string]*list.Element
    lru      *list.List
    rate     rate.Limit
    burst    int
    maxSize  int           // 最大 IP 数量
    ttl      time.Duration  // 不活跃超时
}

// NewLRUIPRateLimiter 创建带 LRU 的限流器
func NewLRUIPRateLimiter(r rate.Limit, burst, maxSize int, ttl time.Duration) *LRUIPRateLimiter {
    l := &LRUIPRateLimiter{
        entries: make(map[string]*list.Element),
        lru:     list.New(),
        rate:    r,
        burst:   burst,
        maxSize: maxSize,
        ttl:     ttl,
    }
    // 启动后台清理 goroutine
    go l.cleanup()
    return l
}

// GetLimiter 获取限流器，同时更新 LRU
func (l *LRUIPRateLimiter) GetLimiter(ip string) *rate.Limiter {
    l.mu.Lock()
    defer l.mu.Unlock()

    if elem, ok := l.entries[ip]; ok {
        l.lru.MoveToFront(elem)
        entry := elem.Value.(*ipEntry)
        entry.lastUse = time.Now()
        return entry.limiter
    }

    // 创建新条目
    entry := &ipEntry{
        ip:      ip,
        limiter: rate.NewLimiter(l.rate, l.burst),
        lastUse: time.Now(),
    }
    elem := l.lru.PushFront(entry)
    l.entries[ip] = elem

    // 超出容量则淘汰最久未使用
    if l.lru.Len() > l.maxSize {
        oldest := l.lru.Back()
        if oldest != nil {
            entry := oldest.Value.(*ipEntry)
            delete(l.entries, entry.ip)
            l.lru.Remove(oldest)
        }
    }
    return entry.limiter
}

// cleanup 定期清理不活跃的 IP 限流器
func (l *LRUIPRateLimiter) cleanup() {
    ticker := time.NewTicker(time.Minute)
    defer ticker.Stop()
    for range ticker.C {
        l.mu.Lock()
        now := time.Now()
        var toRemove []string
        for ip, elem := range l.entries {
            entry := elem.Value.(*ipEntry)
            if now.Sub(entry.lastUse) > l.ttl {
                toRemove = append(toRemove, ip)
            }
        }
        for _, ip := range toRemove {
            if elem, ok := l.entries[ip]; ok {
                l.lru.Remove(elem)
                delete(l.entries, ip)
            }
        }
        l.mu.Unlock()
    }
}
```

### 5.5 Redis 滑动窗口限流

```go
// Package ratelimit 提供 Redis 分布式限流
package ratelimit

import (
    "context"
    "errors"
    "time"

    "github.com/redis/go-redis/v9"
)

// SlidingWindowLimiter 滑动窗口限流器
type SlidingWindowLimiter struct {
    rdb    *redis.Client
    key    string        // 限流 key（如 "rate:user:123"）
    limit  int           // 窗口内最大请求数
    window time.Duration // 窗口大小
    script *redis.Script // 预编译 Lua 脚本
}

// NewSlidingWindowLimiter 创建滑动窗口限流器
func NewSlidingWindowLimiter(rdb *redis.Client, key string, limit int, window time.Duration) *SlidingWindowLimiter {
    return &SlidingWindowLimiter{
        rdb:    rdb,
        key:    key,
        limit:  limit,
        window: window,
        script: redis.NewScript(slidingWindowScript),
    }
}

// 滑动窗口 Lua 脚本（保证原子性）
const slidingWindowScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- 移除窗口外的记录
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- 统计当前窗口内请求数
local count = redis.call('ZCARD', key)

if count < limit then
    -- 添加当前请求
    redis.call('ZADD', key, now, now)
    -- 设置过期时间，避免内存泄漏
    redis.call('PEXPIRE', key, window)
    return 1
else
    return 0
end
`

// Allow 判断是否允许通过
func (l *SlidingWindowLimiter) Allow(ctx context.Context) (bool, error) {
    now := time.Now().UnixMilli()
    windowMs := l.window.Milliseconds()
    result, err := l.script.Run(ctx, l.rdb, []string{l.key}, now, windowMs, l.limit).Int()
    if err != nil {
        return false, err
    }
    return result == 1, nil
}

// 使用示例
func ExampleUsage() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    limiter := NewSlidingWindowLimiter(rdb, "rate:user:123", 100, time.Minute)

    ctx := context.Background()
    allowed, err := limiter.Allow(ctx)
    if err != nil {
        // 处理错误（如 Redis 不可用）
        // 实践中应降级为单机限流或直接拒绝
        _ = errors.New("rate limit check failed")
    }
    _ = allowed
}
```

### 5.6 Redis 令牌桶限流

```go
// Package ratelimit 提供 Redis 令牌桶限流
package ratelimit

import (
    "context"
    "time"

    "github.com/redis/go-redis/v9"
)

// TokenBucketLimiter Redis 令牌桶限流器
type TokenBucketLimiter struct {
    rdb      *redis.Client
    key      string
    capacity int           // 桶容量
    rate     float64       // 令牌生成速率（tokens/s）
    script   *redis.Script
}

// 令牌桶 Lua 脚本
const tokenBucketScript = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- 获取当前状态
local data = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(data[1]) or capacity
local last = tonumber(data[2]) or now

-- 计算补充的令牌
local elapsed = math.max(0, now - last)
local refill = elapsed * rate / 1000  -- now 单位为毫秒
tokens = math.min(capacity, tokens + refill)

-- 判断与消耗
local allowed = 0
if tokens >= requested then
    tokens = tokens - requested
    allowed = 1
end

-- 更新状态
redis.call('HMSET', key, 'tokens', tokens, 'last', now)
redis.call('EXPIRE', key, 60)

return allowed
`

// NewTokenBucketLimiter 创建 Redis 令牌桶限流器
func NewTokenBucketLimiter(rdb *redis.Client, key string, capacity int, rate float64) *TokenBucketLimiter {
    return &TokenBucketLimiter{
        rdb:      rdb,
        key:      key,
        capacity: capacity,
        rate:      rate,
        script:   redis.NewScript(tokenBucketScript),
    }
}

// Allow 判断是否允许通过
func (l *TokenBucketLimiter) Allow(ctx context.Context) (bool, error) {
    now := time.Now().UnixMilli()
    result, err := l.script.Run(ctx, l.rdb, []string{l.key}, l.capacity, l.rate, now, 1).Int()
    if err != nil {
        return false, err
    }
    return result == 1, nil
}
```

### 5.7 熔断器（gobreaker）

```go
// Package breaker 提供 gobreaker 熔断器封装
package breaker

import (
    "context"
    "errors"
    "fmt"
    "time"

    "github.com/sony/gobreaker"
)

// CircuitBreaker 熔断器封装
type CircuitBreaker struct {
    cb *gobreaker.CircuitBreaker
}

// Config 熔断器配置
type Config struct {
    Name          string          // 熔断器名称
    MaxRequests   uint32          // 半开状态下允许的测试请求数
    Interval      time.Duration   // Closed 状态下的统计周期
    Timeout       time.Duration   // Open 状态持续多久后进入 HalfOpen
    FailThreshold uint32          // 连续失败多少次触发熔断
    FailRate      float64         // 失败率阈值（0-1）
    MinRequests   uint32          // 触发失败率判断的最小请求数
}

// NewCircuitBreaker 创建熔断器
func NewCircuitBreaker(cfg Config) *CircuitBreaker {
    settings := gobreaker.Settings{
        Name:        cfg.Name,
        MaxRequests: cfg.MaxRequests,
        Interval:    cfg.Interval,
        Timeout:     cfg.Timeout,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            // 连续失败数触发
            if counts.ConsecutiveFailures > cfg.FailThreshold {
                return true
            }
            // 失败率触发（需达到最小请求数）
            if counts.Requests >= uint32(cfg.MinRequests) {
                failRate := float64(counts.TotalFailures) / float64(counts.Requests)
                if failRate >= cfg.FailRate {
                    return true
                }
            }
            return false
        },
        OnStateChange: func(name string, from, to gobreaker.State) {
            // 状态变更回调（可用于监控、告警）
            fmt.Printf("[Breaker %s] %s -> %s\n", name, from, to)
        },
    }
    return &CircuitBreaker{cb: gobreaker.NewCircuitBreaker(settings)}
}

// ErrCircuitOpen 熔断器打开错误
var ErrCircuitOpen = errors.New("circuit breaker is open")

// Execute 执行请求，自动熔断
func (b *CircuitBreaker) Execute(ctx context.Context, fn func(ctx context.Context) (interface{}, error)) (interface{}, error) {
    result, err := b.cb.Execute(func() (interface{}, error) {
        return fn(ctx)
    })
    if err == gobreaker.ErrOpenCircuit {
        return nil, ErrCircuitOpen
    }
    if errors.Is(err, gobreaker.ErrTooManyRequests) {
        return nil, errors.New("half-open: too many requests")
    }
    return result, err
}

// State 返回当前状态
func (b *CircuitBreaker) State() gobreaker.State {
    return b.cb.State()
}

// Counts 返回统计信息
func (b *CircuitBreaker) Counts() gobreaker.Counts {
    return b.cb.Counts()
}

// 使用示例
type UserService struct {
    breaker *CircuitBreaker
    client  *http.Client
}

func (s *UserService) GetUser(ctx context.Context, id string) (*User, error) {
    result, err := s.breaker.Execute(ctx, func(ctx context.Context) (interface{}, error) {
        // 调用下游服务
        req, _ := http.NewRequestWithContext(ctx, "GET", "http://user-service/users/"+id, nil)
        resp, err := s.client.Do(req)
        if err != nil {
            return nil, err
        }
        defer resp.Body.Close()
        if resp.StatusCode >= 500 {
            return nil, fmt.Errorf("server error: %d", resp.StatusCode)
        }
        if resp.StatusCode == 404 {
            return nil, ErrNotFound
        }
        var user User
        if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
            return nil, err
        }
        return &user, nil
    })
    if err != nil {
        return nil, err
    }
    return result.(*User), nil
}
```

### 5.8 并发限制（信号量）

```go
// Package middleware 提供并发数限制中间件
package middleware

import (
    "net/http"

    "golang.org/x/sync/semaphore"
)

// ConcurrencyLimitMiddleware 并发数限制中间件
// 参数：
//   - max: 最大并发数
func ConcurrencyLimitMiddleware(max int64) func(http.Handler) http.Handler {
    sem := semaphore.NewWeighted(max)
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // 尝试获取信号量（非阻塞）
            if !sem.TryAcquire(1) {
                http.Error(w, "服务器繁忙，请稍后再试", http.StatusServiceUnavailable)
                return
            }
            defer sem.Release(1)
            next.ServeHTTP(w, r)
        })
    }
}

// ConcurrencyLimitWithWait 带等待的并发数限制
func ConcurrencyLimitWithWait(max int64) func(http.Handler) http.Handler {
    sem := semaphore.NewWeighted(max)
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // 阻塞等待信号量（支持 Context 取消）
            if err := sem.Acquire(r.Context(), 1); err != nil {
                http.Error(w, "请求超时", http.StatusServiceUnavailable)
                return
            }
            defer sem.Release(1)
            next.ServeHTTP(w, r)
        })
    }
}
```

### 5.9 自适应限流

```go
// Package ratelimit 提供基于 CPU 与延迟的自适应限流
package ratelimit

import (
    "math"
    "runtime"
    "sync"
    "sync/atomic"
    "time"

    "golang.org/x/time/rate"
)

// AdaptiveLimiter 自适应限流器
// 根据 CPU 使用率与请求延迟动态调整限流阈值
type AdaptiveLimiter struct {
    mu          sync.Mutex
    limiter     *rate.Limiter
    minRate     rate.Limit // 最小速率
    maxRate     rate.Limit // 最大速率
    currentRate rate.Limit

    // 指标采集
    cpuUsage       float64 // 0-1
    p99Latency     time.Duration
    latencyThreshold time.Duration

    // 窗口内统计
    requests  int64
    failures  int64
    lastReset time.Time
}

// NewAdaptiveLimiter 创建自适应限流器
func NewAdaptiveLimiter(initialRate, minRate, maxRate rate.Limit, latencyThreshold time.Duration) *AdaptiveLimiter {
    return &AdaptiveLimiter{
        limiter:          rate.NewLimiter(initialRate, int(initialRate)),
        minRate:          minRate,
        maxRate:          maxRate,
        currentRate:      initialRate,
        latencyThreshold: latencyThreshold,
        lastReset:        time.Now(),
    }
}

// Allow 判断是否允许通过
func (l *AdaptiveLimiter) Allow() bool {
    return l.limiter.Allow()
}

// Record 记录请求结果
func (l *AdaptiveLimiter) Record(latency time.Duration, success bool) {
    atomic.AddInt64(&l.requests, 1)
    if !success {
        atomic.AddInt64(&l.failures, 1)
    }

    // 更新 P99 延迟（简化版，实际需用滑动窗口或 t-digest）
    l.mu.Lock()
    if latency > l.p99Latency {
        l.p99Latency = latency
    }
    l.mu.Unlock()
}

// Adjust 根据系统负载动态调整速率
// CPU 使用率高或延迟超阈值则降低速率，反之提高
func (l *AdaptiveLimiter) Adjust() {
    l.mu.Lock()
    defer l.mu.Unlock()

    now := time.Now()
    if now.Sub(l.lastReset) < time.Second {
        return
    }

    // 计算窗口内失败率
    reqs := atomic.LoadInt64(&l.requests)
    fails := atomic.LoadInt64(&l.failures)
    failRate := 0.0
    if reqs > 0 {
        failRate = float64(fails) / float64(reqs)
    }

    // AIMD（Additive Increase, Multiplicative Decrease）策略
    switch {
    case l.cpuUsage > 0.8 || failRate > 0.1 || l.p99Latency > l.latencyThreshold:
        // 过载：乘性降低（降低 20%）
        newRate := rate.Limit(float64(l.currentRate) * 0.8)
        if newRate < l.minRate {
            newRate = l.minRate
        }
        l.setRate(newRate)
    case l.cpuUsage < 0.5 && failRate < 0.01:
        // 轻载：加性增加（提升 10%）
        newRate := rate.Limit(float64(l.currentRate) * 1.1)
        if newRate > l.maxRate {
            newRate = l.maxRate
        }
        l.setRate(newRate)
    }

    // 重置统计
    atomic.StoreInt64(&l.requests, 0)
    atomic.StoreInt64(&l.failures, 0)
    l.lastReset = now
    l.p99Latency = 0
}

// setRate 设置新速率
func (l *AdaptiveLimiter) setRate(r rate.Limit) {
    if r != l.currentRate {
        l.currentRate = r
        l.limiter.SetLimit(r)
        l.limiter.SetBurst(int(math.Max(1, float64(r))))
    }
}

// SetCPUUsage 更新 CPU 使用率（由外部采集）
func (l *AdaptiveLimiter) SetCPUUsage(usage float64) {
    l.mu.Lock()
    l.cpuUsage = usage
    l.mu.Unlock()
}

// CPU 使用率采集 goroutine
func collectCPUUsage(limiter *AdaptiveLimiter, interval time.Duration) {
    var lastCPU time.Time
    var lastStats *runtime.MemStats
    _ = lastStats

    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    for range ticker.C {
        // 简化版：使用 runtime 估算 CPU 使用率
        // 生产中应读取 /proc/stat（Linux）或用 gopsutil 库
        now := time.Now()
        _ = now.Sub(lastCPU)
        lastCPU = now

        // 占位：实际应采集真实 CPU 使用率
        // limiter.SetCPUUsage(cpuUsage)
    }
}
```

### 5.10 完整限流中间件组合

```go
// Package middleware 提供组合限流中间件
package middleware

import (
    "net/http"
    "time"

    "golang.org/x/time/rate"
)

// CompositeLimitConfig 组合限流配置
type CompositeLimitConfig struct {
    GlobalRate     rate.Limit // 全局速率
    GlobalBurst    int        // 全局突发
    UserRate       rate.Limit // 单用户速率
    UserBurst      int        // 单用户突发
    MaxConcurrency int64      // 最大并发数
    RetryAfter     int        // Retry-After 头值（秒）
}

// NewCompositeMiddleware 创建组合限流中间件
// 包含：全局限流 + 按用户限流 + 并发限制
func NewCompositeMiddleware(cfg CompositeLimitConfig) func(http.Handler) http.Handler {
    globalLimiter := rate.NewLimiter(cfg.GlobalRate, cfg.GlobalBurst)
    userLimiter := NewLRUIPRateLimiter(cfg.UserRate, cfg.UserBurst, 100000, 10*time.Minute)
    concurrencySem := semaphore.NewWeighted(cfg.MaxConcurrency)

    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // 1. 全局限流
            if !globalLimiter.Allow() {
                respondRateLimited(w, cfg.RetryAfter, "系统繁忙，请稍后再试")
                return
            }

            // 2. 用户限流
            ip := extractIP(r)
            if !userLimiter.GetLimiter(ip).Allow() {
                respondRateLimited(w, cfg.RetryAfter, "请求过于频繁")
                return
            }

            // 3. 并发限制（非阻塞）
            if !concurrencySem.TryAcquire(1) {
                http.Error(w, "服务器繁忙", http.StatusServiceUnavailable)
                return
            }
            defer concurrencySem.Release(1)

            next.ServeHTTP(w, r)
        })
    }
}

// respondRateLimited 返回标准限流响应
func respondRateLimited(w http.ResponseWriter, retryAfter int, message string) {
    w.Header().Set("Retry-After", fmt.Sprintf("%d", retryAfter))
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusTooManyRequests)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "error":       "too_many_requests",
        "message":     message,
        "retry_after": retryAfter,
    })
}

// extractIP 提取客户端 IP
func extractIP(r *http.Request) string {
    if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
        return forwarded
    }
    if real := r.Header.Get("X-Real-IP"); real != "" {
        return real
    }
    host, _, err := net.SplitHostPort(r.RemoteAddr)
    if err != nil {
        return r.RemoteAddr
    }
    return host
}
```

### 5.11 限流与熔断的协同

```go
// Package gateway 提供 API 网关限流与熔断协同
package gateway

import (
    "context"
    "net/http"
    "time"

    "github.com/sony/gobreaker"
    "golang.org/x/time/rate"
)

// Gateway API 网关
type Gateway struct {
    // 入口限流（保护自身）
    globalLimiter *rate.Limiter
    userLimiters  *LRUIPRateLimiter

    // 下游熔断（保护下游）
    downstreamBreakers map[string]*CircuitBreaker
}

// HandleRequest 处理请求
func (g *Gateway) HandleRequest(downstream string, handler http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 1. 入口限流
        if !g.globalLimiter.Allow() {
            respondRateLimited(w, 1, "系统繁忙")
            return
        }
        ip := extractIP(r)
        if !g.userLimiters.GetLimiter(ip).Allow() {
            respondRateLimited(w, 1, "请求过于频繁")
            return
        }

        // 2. 下游熔断
        breaker, ok := g.downstreamBreakers[downstream]
        if !ok {
            http.Error(w, "unknown downstream", http.StatusInternalServerError)
            return
        }
        if breaker.State() == gobreaker.StateOpen {
            http.Error(w, "downstream unavailable", http.StatusServiceUnavailable)
            return
        }

        // 3. 执行请求（被熔断器包装）
        _, err := breaker.Execute(r.Context(), func(ctx context.Context) (interface{}, error) {
            handler(w, r)
            return nil, nil
        })
        if err != nil {
            // 熔断或下游错误
            return
        }
    }
}
```

---

## 6. 算法对比与选型

### 6.1 限流算法对比

| 算法 | 原理 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|---------|
| 令牌桶 | 固定速率补充令牌，请求消耗令牌 | 允许突发、实现简单 | 无法保证匀速 | API 网关、通用场景 |
| 漏桶 | 固定速率处理请求，超出排队 | 强制匀速、平滑 | 无法应对突发 | 消息队列、流处理 |
| 滑动窗口 | 统计滑动时间窗口内请求数 | 精确、无边界问题 | 内存开销大 | 精确限流、审计场景 |
| 固定窗口 | 每个固定时间窗口内限制请求数 | 实现简单、内存开销小 | 边界问题（窗口切换瞬间可通过 2L） | 粗略限流 |
| 滑动日志 | 记录每个请求时间戳 | 最精确 | 内存开销大、查询慢 | 精确审计 |

### 6.2 限流粒度对比

| 粒度 | 实现方式 | 适用场景 |
|------|---------|---------|
| 全局限流 | 单个 `rate.Limiter` 实例 | 保护系统总容量 |
| 按 IP 限流 | `sync.Map` 维护每 IP 限流器 | 防止单 IP 滥用 |
| 按用户限流 | 以用户 ID 为 key | VIP 分级限流 |
| 按接口限流 | 按路由 + 方法组合 | 保护慢接口 |
| 按租户限流 | SaaS 多租户隔离 | 租户配额管理 |
| 按地域限流 | 按 GeoIP 限流 | 异地容灾 |

### 6.3 熔断器实现对比

| 库 | 优点 | 缺点 | 适用场景 |
|----|------|------|---------|
| `sony/gobreaker` | 简单、无依赖、API 清晰 | 功能较少 | 通用熔断 |
| `afex/hystrix-go` | 功能完整、支持隔离 | 已停维护、较重 | 遗留系统 |
| `cep21/circuit` | 高性能、可配置 | API 较复杂 | 高性能场景 |
| `failsafe-go/failsafe` | 支持重试、熔断、限流组合 | 学习曲线 | 综合容错 |

### 6.4 单机 vs 分布式限流

| 维度 | 单机限流 | 分布式限流 |
|------|---------|----------|
| 实现 | `rate.Limiter` | Redis + Lua |
| 性能 | $O(1)$，亚微秒 | $O(1)$，毫秒级（网络） |
| 一致性 | 单机内存 | Redis 强一致 |
| 部署 | 单实例 | 多实例共享 |
| 适用 | 单机或近似限流 | 精确全局限流 |
| 复杂性 | 低 | 高（需处理 Redis 故障） |

---

## 7. 常见陷阱与反模式

### 7.1 陷阱一：按 IP 限流内存泄漏

**问题**：直接用 `sync.Map` 维护每 IP 限流器，IP 数量无限增长导致内存耗尽。

```go
// 反例：无淘汰的按 IP 限流
limiters := sync.Map{}
func getLimiter(ip string) *rate.Limiter {
    if l, ok := limiters.Load(ip); ok {
        return l.(*rate.Limiter)
    }
    l := rate.NewLimiter(rate.Limit(10), 5)
    limiters.Store(ip, l) // 永不淘汰，内存泄漏！
    return l
}
```

**修复**：使用 LRU 淘汰或定期清理不活跃的限流器（见 5.4）。

### 7.2 陷阱二：限流粒度过粗

**问题**：仅全局限流，单个高频用户挤占其他用户配额。

```go
// 反例：仅全局限流
globalLimiter := rate.NewLimiter(1000, 50)
// 一个恶意 IP 可以打满全局配额，导致正常用户被限流
```

**修复**：全局 + 用户双层限流。

### 7.3 陷阱三：分布式限流未考虑 Redis 故障

**问题**：Redis 不可用时限流完全失效或完全拒绝。

```go
// 反例：Redis 故障时直接拒绝所有请求
allowed, err := limiter.Allow(ctx)
if err != nil {
    return false // Redis 故障 → 全部拒绝 → 服务不可用
}
```

**修复**：Redis 故障时降级为单机限流（允许一定误差）或快速失败（fail-open，避免完全不可用）。

```go
allowed, err := limiter.Allow(ctx)
if err != nil {
    // Redis 故障：降级为本地限流
    return localLimiter.Allow(), nil
}
return allowed, nil
```

### 7.4 陷阱四：熔断器未区分业务错误与系统错误

**问题**：将 404、参数错误等业务错误计入熔断失败率，导致误熔断。

```go
// 反例：所有错误都计入熔断
result, err := breaker.Execute(func() (interface{}, error) {
    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    if resp.StatusCode != 200 {
        return nil, fmt.Errorf("error: %d", resp.StatusCode) // 404 也算失败！
    }
    return nil, nil
})
```

**修复**：仅系统错误（5xx、超时、连接失败）触发熔断。

```go
result, err := breaker.Execute(func() (interface{}, error) {
    resp, err := http.Get(url)
    if err != nil {
        return nil, err // 系统错误
    }
    if resp.StatusCode >= 500 {
        return nil, fmt.Errorf("server error: %d", resp.StatusCode) // 系统错误
    }
    if resp.StatusCode == 404 {
        return nil, ErrNotFound // 业务错误，不计入熔断
    }
    return nil, nil
})
```

### 7.5 陷阱五：限流响应缺少 Retry-After

**问题**：返回 429 但未告知客户端何时重试，导致客户端立即重试加剧拥塞。

```go
// 反例：无 Retry-After
http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
```

**修复**：返回 `Retry-After` 头。

```go
w.Header().Set("Retry-After", "1")
http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
```

### 7.6 陷阱六：熔断器恢复过快导致二次故障

**问题**：HalfOpen 状态下允许过多测试请求，下游未完全恢复又被打垮。

**修复**：`MaxRequests` 设为 1（逐个探测），`Timeout` 设为下游恢复时间的 2-3 倍。

### 7.7 陷阱七：Wait 阻塞导致 goroutine 泄漏

**问题**：在高并发下用 `limiter.Wait(ctx)` 阻塞等待，goroutine 堆积。

```go
// 反例：每个请求阻塞等待
for i := 0; i < 10000; i++ {
    go func() {
        limiter.Wait(ctx) // 1 万个 goroutine 同时等待
        process()
    }()
}
```

**修复**：用 `Allow` 非阻塞模式 + 快速失败，或限制 goroutine 数量。

### 7.8 陷阱八：未对 WebSocket / 长连接限流

**问题**：WebSocket 连接建立后不再经过限流，长连接持续占用资源。

**修复**：对连接数限制（信号量），对消息速率限流。

### 7.9 陷阱九：滑动窗口边界问题

**问题**：固定窗口算法在窗口切换瞬间可通过 2L 请求（如 0.9s 时通过 L 个，1.0s 时新窗口又通过 L 个）。

**修复**：使用滑动窗口或令牌桶。

### 7.10 陷阱十：限流器未考虑时钟回拨

**问题**：NTP 时钟同步导致 `time.Now()` 回拨，令牌桶计算出现负的 elapsed。

**修复**：`elapsed = max(0, now - last)`。

---

## 8. 工程实践

### 8.1 限流组件设计

一个生产级限流组件应具备：

1. **多维度限流**：全局、用户、接口、租户。
2. **多算法支持**：令牌桶、滑动窗口、漏桶。
3. **单机 + 分布式**：单机优先，分布式精确。
4. **降级策略**：Redis 故障时降级单机。
5. **监控指标**：QPS、限流率、等待时间。
6. **配置热更新**：运行时调整限流参数。

### 8.2 配置化限流

```yaml
# config.yaml 限流配置示例
rate_limit:
  global:
    rate: 10000        # 每秒 1 万请求
    burst: 1000
  user:
    rate: 100         # 每用户每秒 100 请求
    burst: 20
  api:
    - path: "/api/v1/search"
      method: "GET"
      rate: 50        # 搜索接口每秒 50
      burst: 10
    - path: "/api/v1/upload"
      method: "POST"
      rate: 5         # 上传接口每秒 5
      burst: 2
  redis:
    addr: "redis:6379"
    enabled: true     # 启用分布式限流
    fallback: true    # Redis 故障时降级单机
```

### 8.3 监控指标

```go
// Package metrics 提供限流监控指标
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // 请求总数
    requestTotal = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "rate_limit_requests_total",
        Help: "Total rate limit requests",
    }, []string{"path", "method", "result"}) // result: allowed, denied

    // 限流延迟
    limitDelay = promauto.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "rate_limit_delay_seconds",
        Help:    "Rate limit delay",
        Buckets: prometheus.ExponentialBuckets(0.001, 2, 10),
    }, []string{"path", "method"})

    // 熔断器状态
    breakerState = promauto.NewGaugeVec(prometheus.GaugeOpts{
        Name: "circuit_breaker_state",
        Help: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
    }, []string{"name"})

    // 熔断器统计
    breakerRequests = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "circuit_breaker_requests_total",
        Help: "Circuit breaker requests",
    }, []string{"name", "result"})
)

// RecordRequest 记录限流请求
func RecordRequest(path, method, result string) {
    requestTotal.WithLabelValues(path, method, result).Inc()
}

// RecordDelay 记录限流延迟
func RecordDelay(path, method string, delay float64) {
    limitDelay.WithLabelValues(path, method).Observe(delay)
}

// RecordBreakerState 记录熔断器状态
func RecordBreakerState(name string, state int) {
    breakerState.WithLabelValues(name).Set(float64(state))
}
```

### 8.4 限流与降级协同

```go
// Package gateway 提供限流 + 熔断 + 降级的统一处理
package gateway

import (
    "context"
    "net/http"
)

// FallbackHandler 降级处理器
type FallbackHandler func(ctx context.Context, req *http.Request) (interface{}, error)

// GatewayConfig 网关配置
type GatewayConfig struct {
    EnableRateLimit bool
    EnableCircuit   bool
    EnableFallback  bool
    Fallbacks       map[string]FallbackHandler // 按 downstream 名称
}

// Handle 处理请求，统一限流 + 熔断 + 降级
func (g *Gateway) Handle(downstream string, handler http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 1. 限流检查
        if g.cfg.EnableRateLimit && !g.checkRateLimit(r) {
            respondRateLimited(w, 1, "rate limited")
            return
        }

        // 2. 熔断检查
        if g.cfg.EnableCircuit {
            breaker := g.breakers[downstream]
            if breaker != nil && breaker.State() == gobreaker.StateOpen {
                // 3. 降级处理
                if g.cfg.EnableFallback {
                    if fb, ok := g.cfg.Fallbacks[downstream]; ok {
                        result, err := fb(r.Context(), r)
                        if err == nil {
                            respondJSON(w, result)
                            return
                        }
                    }
                }
                http.Error(w, "service unavailable", http.StatusServiceUnavailable)
                return
            }
        }

        // 4. 执行请求
        handler(w, r)
    }
}
```

### 8.5 测试限流逻辑

```go
// Package ratelimit_test 提供限流器测试
package ratelimit_test

import (
    "context"
    "sync"
    "testing"
    "time"

    "yourapp/ratelimit"
    "golang.org/x/time/rate"
)

// TestTokenBucket 测试令牌桶限流
func TestTokenBucket(t *testing.T) {
    limiter := rate.NewLimiter(10, 5) // 每秒 10，突发 5

    // 突发 5 个应全部通过
    for i := 0; i < 5; i++ {
        if !limiter.Allow() {
            t.Fatalf("请求 %d 应通过", i)
        }
    }

    // 第 6 个应被拒绝
    if limiter.Allow() {
        t.Fatal("第 6 个请求应被限流")
    }

    // 等待 100ms 后应能再获取 1 个令牌
    time.Sleep(100 * time.Millisecond)
    if !limiter.Allow() {
        t.Fatal("等待后应能通过")
    }
}

// TestSlidingWindow 测试滑动窗口限流
func TestSlidingWindow(t *testing.T) {
    // 使用内存版的滑动窗口
    sw := ratelimit.NewLocalSlidingWindow(10, time.Second)

    // 10 个请求应通过
    for i := 0; i < 10; i++ {
        if !sw.Allow() {
            t.Fatalf("请求 %d 应通过", i)
        }
    }

    // 第 11 个应被拒绝
    if sw.Allow() {
        t.Fatal("第 11 个请求应被限流")
    }

    // 等待 1 秒后窗口滑动，应能再次通过
    time.Sleep(time.Second)
    if !sw.Allow() {
        t.Fatal("窗口滑动后应通过")
    }
}

// TestCircuitBreaker 测试熔断器
func TestCircuitBreaker(t *testing.T) {
    cfg := Config{
        Name:          "test",
        MaxRequests:   1,
        Interval:      time.Second,
        Timeout:       100 * time.Millisecond,
        FailThreshold: 3,
    }
    cb := NewCircuitBreaker(cfg)

    // 触发 3 次失败，应进入 Open 状态
    for i := 0; i < 3; i++ {
        _, err := cb.Execute(context.Background(), func(ctx context.Context) (interface{}, error) {
            return nil, errors.New("fail")
        })
        if err == nil {
            t.Fatal("应返回错误")
        }
    }

    // 第 4 次应被熔断
    _, err := cb.Execute(context.Background(), func(ctx context.Context) (interface{}, error) {
        return "ok", nil
    })
    if err != ErrCircuitOpen {
        t.Fatalf("应返回熔断错误，实际：%v", err)
    }

    // 等待 Timeout 后进入 HalfOpen
    time.Sleep(150 * time.Millisecond)

    // 半开状态下允许 1 个请求
    result, err := cb.Execute(context.Background(), func(ctx context.Context) (interface{}, error) {
        return "recovered", nil
    })
    if err != nil || result != "recovered" {
        t.Fatalf("应恢复，实际：%v, %v", result, err)
    }
}

// TestConcurrency 测试并发场景下的限流
func TestConcurrency(t *testing.T) {
    limiter := rate.NewLimiter(100, 10)
    var allowed, denied int64
    var wg sync.WaitGroup

    // 并发 1000 个请求
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            if limiter.Allow() {
                atomic.AddInt64(&allowed, 1)
            } else {
                atomic.AddInt64(&denied, 1)
            }
        }()
    }
    wg.Wait()

    // 突发 10 个应通过，其余被限流
    if allowed != 10 {
        t.Errorf("应允许 10 个，实际 %d", allowed)
    }
}
```

### 8.6 压测与基准测试

```go
// BenchmarkRateLimiter 基准测试 rate.Limiter 性能
func BenchmarkRateLimiter(b *testing.B) {
    limiter := rate.NewLimiter(1000000, 1000000) // 高速率避免限流
    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            limiter.Allow()
        }
    })
}

// BenchmarkSlidingWindow 基准测试滑动窗口
func BenchmarkSlidingWindow(b *testing.B) {
    sw := NewLocalSlidingWindow(1000000, time.Second)
    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            sw.Allow()
        }
    })
}
```

---

## 9. 案例研究

### 9.1 案例一：电商 API 网关限流

某电商平台 API 网关限流策略：

- **全局**：10 万 QPS（保护网关总容量）。
- **按用户**：普通用户 100 QPS，VIP 1000 QPS。
- **按接口**：搜索 50 QPS，下单 5 QPS，秒杀 1 QPS。
- **熔断**：下游服务 5xx 失败率 > 10% 时熔断 30s。
- **降级**：熔断时返回缓存或默认推荐。

```go
// 电商网关限流配置
config := CompositeLimitConfig{
    GlobalRate:     100000,
    GlobalBurst:    10000,
    UserRate:       100,
    UserBurst:      20,
    MaxConcurrency: 5000,
    RetryAfter:     1,
}

// VIP 用户提升限流
func getUserRate(user *User) rate.Limit {
    if user.IsVIP {
        return 1000
    }
    return 100
}
```

### 9.2 案例二：秒杀系统限流

秒杀场景特点：瞬间极高并发、库存有限。

- **多级限流**：CDN → 网关 → 应用 → 数据库。
- **库存预热**：库存加载到 Redis，用 `DECR` 原子扣减。
- **请求排队**：用 Kafka 削峰，控制消费速率。
- **熔断**：下游服务故障时返回"活动太火爆"。

```go
// 秒杀限流：每秒仅允许 100 个请求进入下单流程
seckillLimiter := rate.NewLimiter(100, 50)

func SeckillHandler(w http.ResponseWriter, r *http.Request) {
    if !seckillLimiter.Allow() {
        respondJSON(w, map[string]interface{}{
            "code":    429,
            "message": "活动太火爆，请稍后再试",
        })
        return
    }

    // 检查库存（Redis 原子操作）
    stock, err := rdb.Incr(ctx, "seckill:stock").Result()
    if err != nil || stock > maxStock {
        respondJSON(w, map[string]interface{}{
            "code":    410,
            "message": "已售罄",
        })
        return
    }

    // 发送到 Kafka 异步处理
    produceOrder(stock)
}
```

### 9.3 案例三：微服务熔断保护

某微服务架构中，订单服务调用用户、商品、库存、支付四个下游服务：

- 每个下游服务独立熔断器。
- 熔断时返回缓存或默认值。
- 监控告警：熔断次数 > 5 次/分钟触发告警。

```go
type OrderService struct {
    userBreaker    *CircuitBreaker
    productBreaker *CircuitBreaker
    stockBreaker   *CircuitBreaker
    payBreaker     *CircuitBreaker
}

func (s *OrderService) CreateOrder(ctx context.Context, req *OrderReq) (*Order, error) {
    // 并行调用下游
    var wg sync.WaitGroup
    var user *User
    var product *Product
    var stockErr, userErr, productErr error

    wg.Add(2)
    go func() {
        defer wg.Done()
        result, err := s.userBreaker.Execute(ctx, func(ctx context.Context) (interface{}, error) {
            return userClient.Get(ctx, req.UserID)
        })
        if err != nil {
            userErr = err
            return
        }
        user = result.(*User)
    }()
    go func() {
        defer wg.Done()
        result, err := s.productBreaker.Execute(ctx, func(ctx context.Context) (interface{}, error) {
            return productClient.Get(ctx, req.ProductID)
        })
        if err != nil {
            productErr = err
            return
        }
        product = result.(*Product)
    }()
    wg.Wait()

    // 降级：用户服务熔断时使用默认用户
    if userErr == ErrCircuitOpen {
        user = &User{ID: req.UserID, Name: "unknown"}
    }

    // 创建订单
    return s.createOrder(ctx, user, product, req)
}
```

### 9.4 案例四：多租户 SaaS 限流

SaaS 平台按租户配额限流：

```go
// 租户配置
type TenantConfig struct {
    TenantID string
    Plan     string // free, pro, enterprise
    RateLimit int   // 每秒请求数
}

// 租户限流器
type TenantLimiter struct {
    limiters sync.Map // map[tenantID]*rate.Limiter
    configs  map[string]TenantConfig
}

func (l *TenantLimiter) Allow(tenantID string) bool {
    cfg, ok := l.configs[tenantID]
    if !ok {
        return false // 未知租户
    }

    limiter, _ := l.limiters.LoadOrStore(tenantID,
        rate.NewLimiter(rate.Limit(cfg.RateLimit), cfg.RateLimit))
    return limiter.(*rate.Limiter).Allow()
}
```

### 9.5 案例五：Netflix 自适应限流思想

Netflix Concurrency Limits 的核心思想：

1. **测量延迟**：记录每次请求的延迟。
2. **计算 Limit**：基于 Little's Law：$L = \frac{\text{throughput} \times \text{tolerantLatency}}{1}$
3. **AIMD 调整**：
   - 增加（Additive Increase）：低延迟时缓慢增加。
   - 减少（Multiplicative Decrease）：高延迟时快速减少。

```go
// 简化版 Netflix 自适应限流
type NetflixAdaptiveLimiter struct {
    mu              sync.Mutex
    currentLimit    int
    minLimit        int
    maxLimit        int
    latencyThreshold time.Duration
    queue           *Queue // 滑动窗口队列记录延迟
}

func (l *NetflixAdaptiveLimiter) OnSuccess(latency time.Duration) {
    l.mu.Lock()
    defer l.mu.Unlock()

    if latency < l.latencyThreshold {
        // 低延迟：加性增加
        if l.currentLimit < l.maxLimit {
            l.currentLimit++
        }
    }
}

func (l *NetflixAdaptiveLimiter) OnFailure(latency time.Duration) {
    l.mu.Lock()
    defer l.mu.Unlock()

    if latency > l.latencyThreshold {
        // 高延迟：乘性减少
        newLimit := l.currentLimit / 2
        if newLimit < l.minLimit {
            newLimit = l.minLimit
        }
        l.currentLimit = newLimit
    }
}
```

---

## 10. 练习与答案

### 10.1 练习一：实现令牌桶

**题目**：不使用 `golang.org/x/time/rate`，手动实现一个令牌桶限流器，支持 `Allow()` 方法。

**参考答案**：

```go
package main

import (
    "sync"
    "time"
)

// TokenBucket 手动实现的令牌桶
type TokenBucket struct {
    mu       sync.Mutex
    rate     float64   // 令牌生成速率（tokens/s）
    capacity float64   // 桶容量
    tokens   float64   // 当前令牌数
    lastTime time.Time // 上次更新时间
}

// NewTokenBucket 创建令牌桶
func NewTokenBucket(rate float64, capacity float64) *TokenBucket {
    return &TokenBucket{
        rate:     rate,
        capacity: capacity,
        tokens:   capacity, // 初始满桶
        lastTime: time.Now(),
    }
}

// Allow 判断是否允许通过
func (tb *TokenBucket) Allow() bool {
    return tb.AllowN(1)
}

// AllowN 判断是否允许消耗 n 个令牌
func (tb *TokenBucket) AllowN(n float64) bool {
    tb.mu.Lock()
    defer tb.mu.Unlock()

    // 计算补充的令牌
    now := time.Now()
    elapsed := now.Sub(tb.lastTime).Seconds()
    tb.tokens += elapsed * tb.rate
    if tb.tokens > tb.capacity {
        tb.tokens = tb.capacity
    }
    tb.lastTime = now

    // 判断与消耗
    if tb.tokens >= n {
        tb.tokens -= n
        return true
    }
    return false
}
```

### 10.2 练习二：实现滑动窗口

**题目**：实现一个基于内存的滑动窗口限流器。

**参考答案**：

```go
package main

import (
    "sync"
    "time"
)

// SlidingWindow 滑动窗口限流器
type SlidingWindow struct {
    mu       sync.Mutex
    requests []time.Time // 请求时间戳列表
    limit    int
    window   time.Duration
}

// NewSlidingWindow 创建滑动窗口限流器
func NewSlidingWindow(limit int, window time.Duration) *SlidingWindow {
    return &SlidingWindow{
        requests: make([]time.Time, 0, limit),
        limit:    limit,
        window:   window,
    }
}

// Allow 判断是否允许通过
func (sw *SlidingWindow) Allow() bool {
    sw.mu.Lock()
    defer sw.mu.Unlock()

    now := time.Now()
    windowStart := now.Add(-sw.window)

    // 移除窗口外的请求（从头部移除）
    i := 0
    for i < len(sw.requests) && sw.requests[i].Before(windowStart) {
        i++
    }
    sw.requests = sw.requests[i:]

    // 判断是否超限
    if len(sw.requests) >= sw.limit {
        return false
    }

    // 添加当前请求
    sw.requests = append(sw.requests, now)
    return true
}
```

### 10.3 练习三：实现熔断器

**题目**：不使用第三方库，实现一个基础的熔断器，支持 Closed/Open/HalfOpen 三态。

**参考答案**：

```go
package main

import (
    "errors"
    "sync"
    "time"
)

// State 熔断器状态
type State int

const (
    StateClosed State = iota
    StateOpen
    StateHalfOpen
)

// CircuitBreaker 基础熔断器
type CircuitBreaker struct {
    mu               sync.Mutex
    state            State
    failureThreshold int
    timeout          time.Duration
    failures         int
    successes        int
    lastFailure      time.Time
}

// NewCircuitBreaker 创建熔断器
func NewCircuitBreaker(failureThreshold int, timeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        state:            StateClosed,
        failureThreshold: failureThreshold,
        timeout:          timeout,
    }
}

// Execute 执行请求
func (cb *CircuitBreaker) Execute(fn func() error) error {
    cb.mu.Lock()
    // 检查状态
    switch cb.state {
    case StateOpen:
        // 检查是否到恢复时间
        if time.Since(cb.lastFailure) > cb.timeout {
            cb.state = StateHalfOpen
            cb.successes = 0
        } else {
            cb.mu.Unlock()
            return errors.New("circuit open")
        }
    }
    cb.mu.Unlock()

    // 执行请求
    err := fn()

    cb.mu.Lock()
    defer cb.mu.Unlock()

    if err != nil {
        cb.onFailure()
        return err
    }
    cb.onSuccess()
    return nil
}

func (cb *CircuitBreaker) onFailure() {
    cb.failures++
    cb.lastFailure = time.Now()

    switch cb.state {
    case StateHalfOpen:
        // 半开状态下失败，重新打开
        cb.state = StateOpen
    case StateClosed:
        if cb.failures >= cb.failureThreshold {
            cb.state = StateOpen
        }
    }
}

func (cb *CircuitBreaker) onSuccess() {
    switch cb.state {
    case StateHalfOpen:
        cb.successes++
        if cb.successes >= 3 { // 连续 3 次成功则恢复
            cb.state = StateClosed
            cb.failures = 0
        }
    case StateClosed:
        cb.failures = 0 // 重置失败计数
    }
}
```

### 10.4 练习四：设计分布式限流

**题目**：设计一个支持 1000 QPS 的分布式限流方案，要求多实例部署时全局限流精确。

**参考答案**：

方案：Redis + Lua 令牌桶

```go
// 见 5.6 节的 Redis 令牌桶实现

// 部署架构：
// 1. 应用实例 × N（无状态）
// 2. Redis 集群（主从 + 哨兵）
// 3. 限流 key: rate:global 或 rate:user:{id}

// 性能优化：
// 1. 本地缓存：每个实例缓存 100ms 的令牌，减少 Redis 调用
// 2. 批量获取：一次请求获取多个令牌
// 3. 降级：Redis 故障时降级单机限流
```

### 10.5 练习五：分析限流场景

**题目**：分析以下场景应选择哪种限流算法，并说明理由。

1. API 网关限制每用户 100 QPS。
2. 消息队列消费者匀速处理消息。
3. 限制每分钟登录尝试次数（防暴力破解）。
4. 数据库连接池限制最大 100 个连接。

**参考答案**：

1. **令牌桶**：允许突发（用户瞬间点击多个按钮），但平均速率受限。
2. **漏桶**：强制匀速消费，避免下游被打垮。
3. **滑动窗口**：精确统计 1 分钟内尝试次数，避免固定窗口边界问题。
4. **并发限制（信号量）**：限制并发数而非 QPS，连接是长期持有的资源。

---

## 11. 参考文献

[1] ITU-T. 1996. *Recommendation I.371: Traffic control and congestion control in B-ISDN*. International Telecommunication Union. https://www.itu.int/rec/T-REC-I.371

[2] Nygard, Michael T. 2007. *Release It!: Design and Deploy Production-Ready Software*. Pragmatic Bookshelf. ISBN 978-0-9745140-2-5.

[3] Netflix. 2012. *Hystrix: Latency and Fault Tolerance for Distributed Systems*. GitHub Repository. https://github.com/Netflix/Hystrix

[4] Netflix. 2019. *Concurrency Limits*. GitHub Repository. https://github.com/Netflix/concurrency-limits

[5] Google. 2015. *guava: RateLimiter*. GitHub Repository. https://github.com/google/guava/wiki/RateLimiterExplained

[6] Go Team. 2024. *golang.org/x/time/rate package documentation*. https://pkg.go.dev/golang.org/x/time/rate

[7] Sony. 2023. *gobreaker: Circuit Breaker for Go*. GitHub Repository. https://github.com/sony/gobreaker

[8] Oracle. 2018. *Resilience4j: Functional fault tolerance for Java*. https://resilience4j.readme.io

[9] Redis Labs. 2023. *Redis Cell Module: Rate Limiting*. https://github.com/brandur/redis-cell

[10] Russell, Daniel. 2020. *Distributed Rate Limiting in Go*. https://medium.com/@santifdeo/rate-limiting-in-go

[11] Wijaya, Tobi. 2022. *Adaptive Concurrency Limit in Go*. https://github.com/tobi/go-air-concurrency

[12] Little, John D. C. 1961. *A Proof for the Queuing Formula L = λW*. Operations Research 9, 3 (June 1961), 383–387. DOI:10.1287/opre.9.3.383

[13] Wikipedia. 2024. *Token Bucket*. https://en.wikipedia.org/wiki/Token_bucket

[14] Wikipedia. 2024. *Leaky Bucket*. https://en.wikipedia.org/wiki/Leaky_bucket

[15] Resilience4j. 2023. *Circuit Breaker Documentation*. https://resilience4j.readme.io/docs/circuitbreaker

[16] Bougouin, Jean-Baptiste. 2021. *Rate Limiting Strategies and Techniques*. NGINX Blog. https://www.nginx.com/blog/rate-limiting-nginx/

---

## 12. 扩展阅读

### 12.1 算法理论

- **Little's Law**：排队论基础，$L = \lambda W$，用于计算自适应限流。
- **AIMD（Additive Increase, Multiplicative Decrease）**：TCP 拥塞控制的核心算法，被限流借鉴。
- **Network Calculus**：网络演算，用于理论分析限流算法的性能边界。

### 12.2 工程实践

- **Sentinel**（阿里巴巴）：支持流控、熔断、热点限流、系统自适应限流。
- **Envoy**：Service Mesh 代理，内置限流与熔断能力。
- **Kong**：API 网关，插件化限流。
- **Istio**：基于 Envoy 的限流策略。

### 12.3 自适应限流

- **Netflix Concurrency Limits**：基于梯度2算法的自适应限流。
- **Google BBR**：基于带宽与延迟的拥塞控制，思想可借鉴。
- **Twitter RPC Adaptive Concurrency**：基于请求延迟的自适应。

### 12.4 监控与可观测性

- **Prometheus**：监控限流指标（QPS、限流率、延迟）。
- **Grafana**：可视化限流与熔断状态。
- **OpenTelemetry**：分布式追踪，关联限流与请求链路。

### 12.5 Go 生态

- **`golang.org/x/sync/semaphore`**：基于 channel 的信号量实现。
- **`github.com/sourcegraph/conc`**：提供 `pool`、`waitgroup` 等并发原语。
- **`github.com/uber-go/ratelimit`**：Uber 开源的漏桶限流器。

---

## 13. 附录

### 13.1 限流算法速查表

| 算法 | Go 实现 | 复杂度 | 突发 | 匀速 | 适用 |
|------|--------|-------|------|------|------|
| 令牌桶 | `rate.Limiter` | $O(1)$ | 允许 | 否 | 通用 |
| 漏桶 | `uber-go/ratelimit` | $O(1)$ | 否 | 是 | 流处理 |
| 滑动窗口 | 自实现 / Redis ZSET | $O(k)$ / $O(\log N)$ | 否 | 否 | 精确限流 |
| 固定窗口 | 自实现 | $O(1)$ | 部分 | 否 | 粗略 |
| 并发限制 | `semaphore` | $O(1)$ | - | - | 连接池 |

### 13.2 rate.Limiter API 速查

| 方法 | 说明 | 阻塞 |
|------|------|------|
| `Allow()` | 立即判断 | 否 |
| `AllowN(now, n)` | 判断 n 个令牌 | 否 |
| `Wait(ctx)` | 阻塞等待 | 是 |
| `WaitN(ctx, n)` | 阻塞等待 n 个 | 是 |
| `Reserve()` | 预留令牌 | 否（返回延迟） |
| `ReserveN(now, n)` | 预留 n 个 | 否 |
| `SetLimit(r)` | 动态调整速率 | - |
| `SetBurst(b)` | 动态调整容量 | - |
| `Limit()` | 获取当前速率 | - |
| `Burst()` | 获取当前容量 | - |
| `Tokens()` | 获取当前令牌数 | - |

### 13.3 熔断器状态转换图

```
        失败率超阈值
    Closed ────────────► Open
      ▲                    │
      │                    │ 等待 Timeout
      │ 成功 N 次            ▼
    HalfOpen ◄────────── HalfOpen
      │                    │
      │ 失败                │ 成功
      ▼                    ▼
    Open              Closed
```

### 13.4 HTTP 限流响应头

| Header | 说明 | 示例 |
|--------|------|------|
| `Retry-After` | 重试等待秒数 | `Retry-After: 1` |
| `X-RateLimit-Limit` | 总配额 | `X-RateLimit-Limit: 1000` |
| `X-RateLimit-Remaining` | 剩余配额 | `X-RateLimit-Remaining: 950` |
| `X-RateLimit-Reset` | 配额重置时间戳 | `X-RateLimit-Reset: 1625000000` |

### 13.5 限流配置参考值

| 场景 | 全局 QPS | 单用户 QPS | 突发 |
|------|---------|----------|------|
| API 网关 | 10000-100000 | 100-1000 | 10-100 |
| Web 应用 | 1000-10000 | 10-100 | 5-20 |
| 秒杀 | 100-1000 | 1-10 | 1-5 |
| 搜索 | 1000-10000 | 10-100 | 5-20 |
| 数据库 | 100-1000 | 10-50 | 5-10 |

### 13.6 常见问题 FAQ

**Q1：令牌桶与漏桶如何选择？**

A：大多数场景选令牌桶（允许突发，更友好）；强制匀速选漏桶（如消息消费、数据库写入）。

**Q2：分布式限流必须用 Redis 吗？**

A：不必须。也可用 etcd、ZooKeeper、Consul 的分布式锁。但 Redis 因其高性能与 Lua 脚本支持，是最常用方案。

**Q3：熔断器的 `Timeout` 设多少合适？**

A：设为下游服务平均恢复时间的 2-3 倍。如下游重启需 10s，`Timeout` 设为 20-30s。

**Q4：如何实现优先级限流？**

A：维护多个限流器，按优先级顺序检查；高优先级先消耗令牌，低优先级排队。

**Q5：限流与熔断有何区别？**

A：限流保护自身不被打垮（控制请求入口）；熔断保护自身不被下游拖垮（控制调用出口）。两者互补。

### 13.7 调试技巧

1. **查看限流决策日志**：记录每次 Allow 的结果与原因。
2. **Prometheus 指标**：监控 QPS、限流率、延迟分布。
3. **压测验证**：用 `wrk` 或 `vegeta` 压测，验证限流是否生效。
4. **熔断器状态查询**：暴露 `/debug/breaker` 接口查询熔断状态。

### 13.8 版本兼容性

| Go 版本 | rate.Limiter | gobreaker | 备注 |
|---------|-------------|-----------|------|
| Go 1.13+ | 支持 | 支持 | 基础功能 |
| Go 1.18+ | 支持泛型 | - | 泛型减少部分需求 |
| Go 1.20+ | 支持 | v2 支持泛型 | 推荐使用 |
| Go 1.22+ | 支持 | v2 | 当前推荐 |
