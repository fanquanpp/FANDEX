---
order: 60
title: Lua与Nginx
module: lua
category: Lua
difficulty: intermediate
description: 'OpenResty Lua开发'
author: fanquanpp
updated: '2026-06-14'
related:
  - lua/Lua与Neovim
  - lua/Lua与Redis脚本
  - lua/模块与包
  - lua/Lua错误处理
prerequisites:
  - lua/概述与环境配置
---

## 1. 学习目标（Bloom 分类法）

本篇文档采用 Bloom 认知分类法组织学习目标，覆盖从基础记忆到高阶创造的六个层级，帮助读者系统化掌握 OpenResty 与 Lua 在 Nginx 中的工程实践。

### 1.1 记忆层（Remember）

完成本节后，学习者应能：

- 列举 OpenResty 的核心组件（ngx_lua、lua-resty-* 库、LuaJIT）。
- 复述 Nginx 请求处理的 11 个阶段（rewrite、access、content、log 等）及其执行顺序。
- 说出 `ngx.shared.DICT`、`cosocket`、`ngx.timer` 三大核心机制的定义。
- 列举至少 6 个常用的 `lua-resty-*` 库及其用途。
- 复述 `init_by_lua`、`init_worker_by_lua`、`rewrite_by_lua` 等 11 个 `*_by_lua` 指令的作用域与执行时机。

### 1.2 理解层（Understand）

完成本节后，学习者应能：

- 解释 OpenResty 如何将 Lua 嵌入 Nginx worker 进程，并保持非阻塞 I/O 特性。
- 阐述 cosocket 基于协程的调度原理，说明它为何不会阻塞 worker。
- 对比 `ngx.shared.DICT` 与进程内 Lua 表的语义差异，解释为何前者是跨 worker 共享的。
- 描述 `ngx.ctx` 的生命周期与作用域限制。
- 说明 `lua_code_cache` 开关在开发与生产环境中的不同影响。

### 1.3 应用层（Apply）

完成本节后，学习者应能：

- 在 `nginx.conf` 中配置 `content_by_lua_block`，实现 Hello World 接口。
- 使用 `lua-resty-redis` 实现简单的缓存读穿透防护逻辑。
- 编写 `access_by_lua_block` 完成 JWT 认证与权限校验。
- 使用 `ngx.shared.DICT` 实现基于滑动窗口的限流器。
- 通过 `ngx.timer.at` 注册后台任务，定时刷新共享内存中的配置。

### 1.4 分析层（Analyze）

完成本节后，学习者应能：

- 拆解一个 OpenResty 应用的请求处理链路，识别每个阶段执行的 Lua 代码与原生 Nginx 模块。
- 分析连接池参数（`set_keepalive(max_idle, pool_size)`）对吞吐量与资源占用的影响。
- 比较子请求（`ngx.location.capture`）与 cosocket（`lua-resty-http`）在内部调用场景下的优劣。
- 解构一个限流算法（如令牌桶），将其分解为共享内存原子操作、时间戳计算、超时处理等子任务。

### 1.5 评价层（Evaluate）

完成本节后，学习者应能：

- 评估在生产环境关闭 `lua_code_cache` 的代价，并给出量化指标。
- 评判某段 Lua 代码是否存在阻塞风险，提出改造方案。
- 评估共享内存字典容量的合理性，给出基于 QPS 与 TTL 的容量估算公式。
- 对比 OpenResty 与 APISIX、Kong 等上层网关的选型决策依据。

### 1.6 创造层（Create）

完成本节后，学习者应能：

- 设计一个支持动态路由、熔断、灰度发布的 API 网关架构。
- 实现一个基于 OpenResty 的分布式限流集群，使用共享内存 + Redis 二级存储。
- 构建一套 OpenResty 应用的可观测性体系，包含 trace、metrics、logs 三位一体。
- 编写自定义的 `balancer_by_lua` 模块，支持加权轮询与一致性哈希混合策略。

## 2. 历史动机与背景

### 2.1 Nginx 的诞生与架构局限

Nginx 由 Igor Sysoev 于 2002 年开始开发，2004 年发布首个公开版本，初衷是为高并发的俄罗斯门户网站 Rambler 提供静态资源服务。其核心设计哲学是事件驱动（event-driven）与非阻塞 I/O，通过 epoll/kqueue 多路复用实现单 worker 进程处理数万并发连接。

然而，Nginx 原生的配置语言是声明式的，无法表达复杂逻辑。开发者若需在请求处理中插入动态行为，只能通过：

1. **CGI/FastCGI 转发**：将请求转发到外部 PHP、Python、Java 进程，引入进程间通信开销。
2. **C 模块扩展**：编写自定义 Nginx 模块，需要重新编译 Nginx，开发与部署成本极高。
3. **嵌入式脚本**：使用 Perl、JavaScript（njs）等嵌入式脚本，但能力受限。

这些方案都无法满足"在 Nginx 进程内完成复杂逻辑"这一诉求。

### 2.2 OpenResty 的诞生

2009 年，章亦春（agentzh）发起了 ngx_lua 项目，将 LuaJIT 嵌入 Nginx worker 进程，并通过协程（coroutine）机制实现非阻塞 I/O。2011 年，章亦春加入 Cloudflare，将 ngx_lua 与一系列 `lua-resty-*` 库打包为 OpenResty 软件包，正式对外发布。

OpenResty 的命名源自 agentzh 早期的一个play on words："Open"代表开放源代码，"Resty"则取自 "REST" 与 "Y"（意指 "Why not REST?"）。其设计目标是让开发者用 Lua 脚本直接处理 HTTP 请求的各个阶段，构建高并发、低延迟的 Web 应用与 API 网关。

### 2.3 关键里程碑

| 时间 | 版本/事件 | 意义 |
| :--- | :--- | :--- |
| 2009 | ngx_lua 项目启动 | 首次将 LuaJIT 嵌入 Nginx |
| 2011 | OpenResty 1.0 发布 | 打包 lua-resty-* 库，形成完整生态 |
| 2013 | lua-resty-core 引入 | 将 FFI 实现的核心库暴露给 Lua 层 |
| 2015 | OpenResty 成立商业公司 | 提供企业级支持 |
| 2017 | Kong 1.0 发布 | 基于 OpenResty 的 API 网关 |
| 2019 | APISIX 开源 | 新一代云原生 API 网关 |
| 2021 | OpenResty 1.19 | 支持 Nginx 1.19，引入新阶段指令 |
| 2023 | OpenResty 1.25 | 跟随 Nginx 1.25，支持 HTTP/3 |
| 2025 | OpenResty 1.27 | 性能与稳定性持续优化 |

### 2.4 设计哲学

OpenResty 的核心设计哲学可归纳为四点：

1. **进程内嵌入**：Lua 代码在 Nginx worker 进程内执行，无进程间通信开销。
2. **非阻塞 I/O**：所有网络 I/O 通过 cosocket 实现，基于协程自动让出，不阻塞 worker。
3. **阶段化处理**：复用 Nginx 的 11 阶段模型，开发者可在任意阶段插入 Lua 逻辑。
4. **共享内存优先**：跨 worker 数据共享通过 `ngx.shared.DICT` 实现，避免文件锁与外部存储依赖。

## 3. 形式化定义

### 3.1 Nginx 多进程模型

设 Nginx 主进程为 $M$，worker 进程集合为 $W = \{w_1, w_2, \ldots, w_n\}$，每个 worker 进程独立持有 LuaJIT 虚拟机 $V_i$。请求 $r$ 由内核负载均衡到某个 worker $w_i$，其 Lua 代码在 $V_i$ 中执行：

$$
\text{exec}(r, w_i) = V_i.\text{run}(\text{lua\_chunk}, r)
$$

由于每个 worker 拥有独立的 Lua VM，进程内全局变量 `_G` 不跨 worker 共享。跨 worker 数据交换必须通过共享内存字典 $D$：

$$
D = \{ (k, v) \mid k \in \text{Keys}, v \in \text{Values} \}
$$

其中 $D$ 通过 `lua_shared_dict` 在 `nginx.conf` 中声明，所有 worker 通过原子操作访问。

### 3.2 请求处理阶段状态机

Nginx 将 HTTP 请求处理划分为 11 个阶段，OpenResty 为关键阶段提供 Lua 入口。形式化定义为一个状态机 $\mathcal{M} = (S, \Sigma, \delta, s_0, F)$，其中：

- 状态集 $S = \{s_{\text{post-read}}, s_{\text{rewrite}}, s_{\text{access}}, s_{\text{content}}, s_{\text{header-filter}}, s_{\text{body-filter}}, s_{\text{log}}\}$
- 输入字母表 $\Sigma = \{\text{request}, \text{lua\_result}, \text{error}\}$
- 转移函数 $\delta: S \times \Sigma \to S$
- 初始状态 $s_0 = s_{\text{post-read}}$
- 终止状态集 $F = \{s_{\text{log}}\}$

Lua 代码在某个状态 $s_i$ 执行后，根据返回值决定状态转移：

$$
\delta(s_i, \text{lua\_result}) = \begin{cases}
s_{i+1} & \text{if } \text{lua\_result} = \text{ok} \\
s_{\text{log}} & \text{if } \text{lua\_result} = \text{error} \\
s_{\text{log}} & \text{if } \text{lua\_result} = \text{exit}(n)
\end{cases}
$$

### 3.3 cosocket 调度模型

cosocket（coroutine-based socket）基于 Lua 协程实现非阻塞网络 I/O。设当前协程为 $c$，发起 socket 操作 $op$（如 `connect`、`receive`），其执行流程可形式化为：

$$
\text{cosocket}(op) = \begin{cases}
\text{register}(c, \text{event\_queue}) & \text{step 1: 注册事件} \\
\text{yield}(c) & \text{step 2: 让出协程} \\
\text{resume}(c, \text{data}) & \text{step 3: 事件就绪后恢复} \\
\text{return data} & \text{step 4: 返回数据}
\end{cases}
$$

在协程让出期间，Nginx worker 可继续处理其他请求，实现高并发。关键特性是：从 Lua 代码视角看，cosocket 是同步阻塞调用；从 worker 视角看，它是非阻塞的。

### 3.4 共享内存原子性

`ngx.shared.DICT` 提供的原子操作（如 `incr`、`add`）基于 Nginx 自旋锁实现。设操作 $op$ 对键 $k$ 执行，其语义为：

$$
\text{atomic}(op, k) = \begin{cases}
\text{lock}(k) & \text{获取自旋锁} \\
v = \text{read}(k) & \text{读取当前值} \\
v' = f(v, op) & \text{计算新值} \\
\text{write}(k, v') & \text{写入新值} \\
\text{unlock}(k) & \text{释放自旋锁} \\
\text{return } v' & \text{返回新值}
\end{cases}
$$

由于自旋锁是忙等待锁，在高并发场景下可能成为瓶颈。设计时应尽量减少锁持有时间，避免在锁内执行耗时操作。

### 3.5 协程并发度

设 worker 进程数为 $n$，每个 worker 的最大协程数为 $m$（由 `lua_max_running_timers` 等配置控制），则集群总并发协程数为：

$$
C_{\text{total}} = n \times m
$$

单个请求可能触发多个子协程（如 `ngx.timer.at`），实际并发协程数受限于：

$$
C_{\text{actual}} = \min(C_{\text{total}}, C_{\text{cpu}} \times \beta)
$$

其中 $C_{\text{cpu}}$ 为 CPU 核心数，$\beta$ 为 I/O 等待比（通常 $\beta \in [10, 100]$）。

## 4. 理论推导与复杂度分析

### 4.1 cosocket 吞吐量模型

设单次 cosocket 请求的 I/O 等待时间为 $t_{\text{io}}$，CPU 处理时间为 $t_{\text{cpu}}$，则单协程吞吐量为：

$$
T_{\text{coroutine}} = \frac{1}{t_{\text{io}} + t_{\text{cpu}}}
$$

由于 cosocket 在 I/O 等待期间让出协程，worker 可处理其他请求。设 worker 同时管理 $k$ 个协程，则 worker 吞吐量近似为：

$$
T_{\text{worker}} \approx \min\left(\frac{k}{t_{\text{io}} + t_{\text{cpu}}}, \frac{1}{t_{\text{cpu}}}\right)
$$

当 $t_{\text{io}} \gg t_{\text{cpu}}$ 时（典型场景，如等待 Redis 响应），$T_{\text{worker}} \approx k / t_{\text{io}}$，即吞吐量随并发数线性增长。当 $t_{\text{cpu}} \gg t_{\text{io}}$ 时（CPU 密集型任务），吞吐量受限于 CPU，增加并发数无益。

### 4.2 共享内存锁竞争

设 $N$ 个 worker 同时争抢同一键的自旋锁，单次锁获取的期望等待时间为：

$$
E[W] = \frac{N - 1}{2} \times t_{\text{critical}}
$$

其中 $t_{\text{critical}}$ 为临界区执行时间。当 $N$ 较大或 $t_{\text{critical}}$ 较长时，锁竞争成为瓶颈。优化策略包括：

1. **分片**：将单一键拆分为多个分片键，分散锁争用。
2. **本地缓存**：worker 内缓存热点数据，定期从共享内存刷新。
3. **批量操作**：合并多次小操作为一次大操作，减少锁获取次数。

### 4.3 LuaJIT trace 编译

LuaJIT 的 trace 编译器将热点循环编译为本地机器码，性能接近 C。设某段 Lua 代码的解释执行时间为 $t_{\text{interp}}$，JIT 编译后执行时间为 $t_{\text{jit}}$，编译开销为 $t_{\text{compile}}$，则总执行时间为：

$$
T = \begin{cases}
n \times t_{\text{interp}} & \text{if no JIT} \\
t_{\text{compile}} + n \times t_{\text{jit}} & \text{if JIT triggered}
\end{cases}
$$

JIT 触发条件通常为循环执行次数超过阈值（默认 1000 次）。对于短生命周期的请求处理代码，JIT 可能来不及触发，导致性能不如预期。生产环境应通过 `lua_code_cache on` 确保编译结果被复用。

### 4.4 连接池效率

设连接池大小为 $P$，单次请求的平均连接获取时间为 $t_{\text{acquire}}$，新建连接时间为 $t_{\text{new}}$（含 TCP 握手与认证），则连接池命中率 $\eta$ 满足：

$$
\eta = \frac{\text{hits}}{\text{hits} + \text{misses}} \approx 1 - \frac{\lambda}{\mu \times P}
$$

其中 $\lambda$ 为请求到达率，$\mu$ 为单连接处理速率。当 $\lambda / \mu \ll P$ 时，命中率接近 100%，平均连接获取时间近似为 $t_{\text{acquire}}$（常数）。当 $\lambda / \mu \geq P$ 时，部分请求需要新建连接，平均获取时间上升。

### 4.5 内存占用模型

设 worker 进程的基础内存为 $M_{\text{base}}$，每个协程的栈空间为 $M_{\text{coroutine}}$，共享内存字典总大小为 $M_{\text{shared}}$，则 worker 进程的 RSS 近似为：

$$
\text{RSS} \approx M_{\text{base}} + k \times M_{\text{coroutine}} + \frac{M_{\text{shared}}}{n}
$$

其中 $k$ 为当前协程数，$n$ 为 worker 进程数（共享内存由所有 worker 共享，但通过 mmap 映射到各自地址空间，故 RSS 中按 $1/n$ 计入）。

## 5. 代码示例

### 5.1 Hello World

最基础的 OpenResty 应用，在 `content_by_lua_block` 中返回响应：

```nginx
# nginx.conf
worker_processes auto;
events {
    worker_connections 1024;
}
http {
    server {
        listen 8080;
        location /hello {
            # content 阶段执行 Lua 代码，直接输出响应
            content_by_lua_block {
                ngx.say("Hello, OpenResty!")
                -- ngx.say 会在末尾添加换行符
                -- 等价于 ngx.print("Hello, OpenResty!\n")
            }
        }
    }
}
```

启动并测试：

```bash
# 启动 OpenResty（-p 指定工作目录，-c 指定配置文件路径）
openresty -p /usr/local/openresty-app -c conf/nginx.conf

# 测试请求
curl http://localhost:8080/hello
# 输出: Hello, OpenResty!
```

### 5.2 多阶段协同处理

展示 set、rewrite、access、content、log 五个阶段的协同工作：

```nginx
server {
    listen 8080;

    # set 阶段：初始化变量（必须返回字符串）
    set_by_lua_block $request_id {
        -- 生成唯一请求 ID，用于全链路追踪
        local resty_random = require "resty.random"
        local str = require "resty.string"
        local bytes = resty_random.bytes(16)
        return str.to_hex(bytes)
    }

    # rewrite 阶段：URL 重写
    rewrite_by_lua_block {
        local uri = ngx.var.uri
        -- 将旧版 API 路径重写为新版
        -- 例如 /api/v1/users -> /api/v2/users
        local new_uri, n = uri:gsub("^/api/v1/", "/api/v2/")
        if n > 0 then
            ngx.req.set_uri(new_uri)
        end
    }

    # access 阶段：访问控制
    access_by_lua_block {
        -- 从请求头提取认证令牌
        local auth = ngx.var.http_authorization
        if not auth then
            ngx.status = 401
            ngx.header.content_type = "application/json"
            ngx.say('{"error": "missing_token"}')
            return ngx.exit(401)
        end

        -- 简单的令牌格式校验（实际应调用 JWT 验证）
        if not auth:match("^Bearer%s+%S+$") then
            ngx.status = 403
            ngx.header.content_type = "application/json"
            ngx.say('{"error": "invalid_token_format"}')
            return ngx.exit(403)
        end

        -- 将解析出的用户信息存入 ngx.ctx，供后续阶段使用
        ngx.ctx.user_token = auth:match("Bearer%s+(%S+)")
    }

    # content 阶段：生成响应
    location /api/v2/users {
        content_by_lua_block {
            ngx.header.content_type = "application/json"
            -- 模拟返回用户列表
            local response = {
                request_id = ngx.var.request_id,
                users = {
                    {id = 1, name = "Alice"},
                    {id = 2, name = "Bob"},
                }
            }
            -- 使用 cjson 编码
            local cjson = require "cjson"
            ngx.say(cjson.encode(response))
        }
    }

    # log 阶段：记录请求日志
    log_by_lua_block {
        -- 计算请求总耗时（秒）
        local elapsed = ngx.now() - ngx.req.start_time()
        -- 写入 error.log，级别为 INFO
        ngx.log(ngx.INFO,
            "request_id=", ngx.var.request_id,
            " method=", ngx.var.request_method,
            " uri=", ngx.var.uri,
            " status=", ngx.var.status,
            " elapsed=", elapsed)
    }
}
```

### 5.3 共享内存限流器

利用 `ngx.shared.DICT` 实现固定窗口限流：

```nginx
http {
    # 声明共享内存区域，大小 10MB
    lua_shared_dict rate_limit 10m;

    server {
        listen 8080;

        location /api {
            access_by_lua_block {
                local limit_dict = ngx.shared.rate_limit
                -- 限流键：使用客户端 IP
                local client_ip = ngx.var.remote_addr
                local key = "rate:" .. client_ip

                -- 原子递增计数器，初始值为 0
                -- incr(key, value, init, init_ttl)
                local count, err = limit_dict:incr(key, 1, 0, 60)
                if not count then
                    ngx.log(ngx.ERR, "限流计数器更新失败: ", err)
                    ngx.exit(500)
                end

                -- 每分钟最多 100 次请求
                if count > 100 then
                    ngx.status = 429
                    ngx.header.content_type = "application/json"
                    ngx.header["Retry-After"] = "60"
                    ngx.say('{"error": "rate_limited", "retry_after": 60}')
                    return ngx.exit(429)
                end

                -- 将当前计数写入响应头，便于调试
                ngx.header["X-RateLimit-Remaining"] = 100 - count
            }

            content_by_lua_block {
                ngx.say('{"status": "ok"}')
            }
        }
    }
}
```

### 5.4 滑动窗口限流器

更精确的滑动窗口限流，使用 `ngx.shared.DICT` 存储时间戳：

```lua
-- 滑动窗口限流模块：sliding_window.lua
local _M = {}

-- 限流函数
-- 参数：
--   limit_dict: 共享内存字典对象
--   key: 限流键（如 "rate:192.168.1.1"）
--   limit: 窗口内最大请求数
--   window: 窗口大小（秒）
-- 返回值：
--   allowed: 是否允许
--   remaining: 剩余配额
--   retry_after: 重试等待时间（秒）
function _M.limit(limit_dict, key, limit, window)
    local now = ngx.now()
    local window_start = now - window

    -- 使用 Lua 表作为滑动窗口内的请求时间戳列表
    -- 注意：共享内存不能直接存储 table，需序列化为字符串
    local raw = limit_dict:get(key)
    local timestamps = {}
    if raw then
        -- 反序列化：使用简单分隔符格式
        for ts in raw:gmatch("[^,]+") do
            local t = tonumber(ts)
            if t and t > window_start then
                table.insert(timestamps, t)
            end
        end
    end

    -- 检查是否超限
    if #timestamps >= limit then
        -- 计算最早请求的过期时间
        local oldest = timestamps[1]
        local retry_after = math.ceil(oldest + window - now)
        return false, 0, retry_after
    end

    -- 记录当前请求
    table.insert(timestamps, now)

    -- 序列化并写回共享内存
    local serialized = table.concat(timestamps, ",")
    -- TTL 设为窗口大小 + 1 秒，避免无限增长
    limit_dict:set(key, serialized, window + 1)

    return true, limit - #timestamps, 0
end

return _M
```

使用方式：

```nginx
location /api {
    access_by_lua_block {
        local sliding_window = require "sliding_window"
        local limit_dict = ngx.shared.rate_limit

        local client_ip = ngx.var.remote_addr
        local key = "sliding:" .. client_ip

        -- 每分钟最多 100 次
        local allowed, remaining, retry_after = sliding_window.limit(
            limit_dict, key, 100, 60
        )

        if not allowed then
            ngx.status = 429
            ngx.header["Retry-After"] = tostring(retry_after)
            ngx.say('{"error": "rate_limited"}')
            return ngx.exit(429)
        end

        ngx.header["X-RateLimit-Remaining"] = tostring(remaining)
    }
}
```

### 5.5 cosocket HTTP 请求

使用 `lua-resty-http` 发起非阻塞 HTTP 请求：

```lua
-- 引入 http 库（需通过 opm 安装：opm get ledgetech/lua-resty-http）
local http = require "resty.http"
local httpc = http.new()

-- 发起 GET 请求
-- request_uri 是简化接口，内部创建协程并自动让出
local res, err = httpc:request_uri("http://backend-service:8080/api/data", {
    method = "GET",
    headers = {
        ["Authorization"] = ngx.var.http_authorization,
        ["X-Request-Id"] = ngx.var.request_id,
    },
    timeout = 3000,  -- 3 秒超时
    ssl_verify = false,  -- 测试环境关闭证书校验
})

if not res then
    -- 网络错误或超时
    ngx.log(ngx.ERR, "上游请求失败: ", err)
    ngx.status = 502
    ngx.header.content_type = "application/json"
    ngx.say('{"error": "upstream_unavailable"}')
    return ngx.exit(502)
end

-- 转发上游响应
ngx.status = res.status
-- 复制响应头
for k, v in pairs(res.headers) do
    ngx.header[k] = v
end
ngx.print(res.body)
```

### 5.6 Redis 连接池

使用 `lua-resty-redis` 并启用连接池：

```lua
local redis = require "resty.redis"
local red = redis:new()

-- 设置三个超时：连接、发送、接收（毫秒）
red:set_timeouts(1000, 1000, 1000)

-- 从连接池获取连接（若池为空则新建）
local ok, err = red:connect("127.0.0.1", 6379)
if not ok then
    ngx.log(ngx.ERR, "Redis 连接失败: ", err)
    return nil, err
end

-- 执行命令
local res, err = red:get("cache:" .. ngx.var.uri)
if err then
    ngx.log(ngx.ERR, "Redis GET 失败: ", err)
    return nil, err
end

-- 关键：归还连接池而非关闭
-- 参数：最大空闲时间（毫秒），连接池大小
local ok, err = red:set_keepalive(10000, 100)
if not ok then
    ngx.log(ngx.WARN, "归还连接池失败: ", err)
end

-- 注意：red:get 返回 ngx.null 表示键不存在（不是 nil）
if res == ngx.null then
    return nil  -- 缓存未命中
end
return res
```

### 5.7 MySQL 查询

使用 `lua-resty-mysql` 查询数据库：

```lua
local mysql = require "resty.mysql"
local db, err = mysql:new()
if not db then
    ngx.log(ngx.ERR, "创建 MySQL 对象失败: ", err)
    return nil, err
end

db:set_timeout(5000)  -- 5 秒超时

local ok, err = db:connect({
    host = "127.0.0.1",
    port = 3306,
    database = "myapp",
    user = "root",
    password = "secret",
    charset = "utf8mb4",
    max_packet_size = 1024 * 1024,  -- 1MB
})
if not ok then
    ngx.log(ngx.ERR, "MySQL 连接失败: ", err)
    return nil, err
end

-- 执行查询（注意：必须使用参数化查询防止 SQL 注入）
local user_id = tonumber(ngx.var.arg_id) or 0
-- 使用 ngx.quote_sql_str 转义字符串参数
local sql = string.format("SELECT id, name, email FROM users WHERE id = %d", user_id)

local res, err, errcode, sqlstate = db:query(sql)
if not res then
    ngx.log(ngx.ERR, "查询失败: ", err, " [", errcode, "] ", sqlstate)
    return nil, err
end

-- 归还连接池
db:set_keepalive(10000, 50)

return res
```

### 5.8 定时器任务

使用 `ngx.timer.at` 注册后台任务：

```nginx
http {
    # 声明配置共享内存
    lua_shared_dict app_config 1m;

    init_worker_by_lua_block {
        -- 定义定时器回调函数
        local function refresh_config(premature)
            -- premature=true 表示 Nginx 正在关闭，应清理资源
            if premature then
                ngx.log(ngx.INFO, "定时器退出（worker 关闭）")
                return
            end

            -- 拉取配置
            local http = require "resty.http"
            local httpc = http.new()
            local res, err = httpc:request_uri("http://config-server:8080/api/config", {
                method = "GET",
                timeout = 5000,
            })

            if res and res.status == 200 then
                -- 写入共享内存
                local dict = ngx.shared.app_config
                dict:set("routes", res.body)
                ngx.log(ngx.INFO, "配置刷新成功")
            else
                ngx.log(ngx.ERR, "配置刷新失败: ", err or "HTTP " .. (res and res.status or "unknown"))
            end

            -- 注册下一次执行（30 秒后）
            local ok, err = ngx.timer.at(30, refresh_config)
            if not ok then
                ngx.log(ngx.ERR, "注册定时器失败: ", err)
            end
        end

        -- 首次延迟 1 秒执行
        local ok, err = ngx.timer.at(1, refresh_config)
        if not ok then
            ngx.log(ngx.ERR, "首次注册定时器失败: ", err)
        end
    }
}
```

### 5.9 balancer 负载均衡

使用 `balancer_by_lua_block` 实现自定义负载均衡：

```nginx
http {
    upstream backend {
        server 0.0.0.0;  -- 占位，实际由 balancer_by_lua 决定
        balancer_by_lua_block {
            local balancer = require "ngx.balancer"
            local dict = ngx.shared.upstreams

            -- 从共享内存获取后端列表
            local backends_str = dict:get("backends") or "10.0.0.1:8080"
            local backends = {}
            for backend in backends_str:gmatch("[^,]+") do
                table.insert(backends, backend)
            end

            -- 轮询策略
            local idx = (dict:incr("counter", 1, 0) % #backends) + 1
            local host, port = backends[idx]:match("([^:]+):(%d+)")

            local ok, err = balancer.set_current_peer(host, tonumber(port))
            if not ok then
                ngx.log(ngx.ERR, "设置后端失败: ", err)
                return ngx.exit(500)
            end

            -- 可选：设置重试策略
            balancer.set_more_tries(2)
        }
    }
}
```

### 5.10 JWT 认证中间件

完整的 JWT 验证示例：

```lua
-- jwt_auth.lua：JWT 认证模块
local _M = {}

local jwt = require "resty.jwt"
local cjson = require "cjson"

-- 验证 JWT 令牌
-- 参数：
--   token: JWT 字符串
--   secret: HMAC 密钥
-- 返回值：
--   payload: 解码后的负载（验证成功）
--   err: 错误信息（验证失败）
function _M.verify(token, secret)
    if not token or token == "" then
        return nil, "missing_token"
    end

    -- 调用 lua-resty-jwt 验证
    local jwt_obj = jwt:verify(secret, token)
    if not jwt_obj.verified then
        return nil, "invalid_token"
    end

    -- 检查过期时间
    local now = ngx.now()
    if jwt_obj.payload.exp and jwt_obj.payload.exp < now then
        return nil, "token_expired"
    end

    -- 检查签发者
    if jwt_obj.payload.iss ~= "fandex-auth" then
        return nil, "invalid_issuer"
    end

    return jwt_obj.payload, nil
end

-- 从请求头提取 Bearer 令牌
function _M.extract_token()
    local auth = ngx.var.http_authorization
    if not auth then
        return nil, "no_authorization_header"
    end

    local token = auth:match("Bearer%s+(%S+)")
    if not token then
        return nil, "invalid_authorization_format"
    end

    return token, nil
end

return _M
```

在 `access_by_lua_block` 中使用：

```nginx
location /api {
    access_by_lua_block {
        local jwt_auth = require "jwt_auth"

        -- 提取令牌
        local token, err = jwt_auth.extract_token()
        if not token then
            ngx.status = 401
            ngx.header.content_type = "application/json"
            ngx.say('{"error": "' .. err .. '"}')
            return ngx.exit(401)
        end

        -- 验证令牌
        local secret = "your-256-bit-secret"
        local payload, err = jwt_auth.verify(token, secret)
        if not payload then
            ngx.status = 401
            ngx.header.content_type = "application/json"
            ngx.say('{"error": "' .. err .. '"}')
            return ngx.exit(401)
        end

        -- 将用户信息存入 ngx.ctx，供后续阶段使用
        ngx.ctx.user_id = payload.sub
        ngx.ctx.user_role = payload.role
        ngx.ctx.user_permissions = payload.permissions or {}
    }
}
```

### 5.11 响应缓存

基于共享内存的响应缓存：

```lua
-- response_cache.lua：响应缓存模块
local _M = {}

-- 生成缓存键
local function cache_key()
    -- 使用请求方法 + URI + 查询参数作为键
    local method = ngx.var.request_method
    local uri = ngx.var.uri
    local args = ngx.var.args or ""
    return method .. ":" .. uri .. "?" .. args
end

-- 从缓存读取
function _M.get()
    local dict = ngx.shared.response_cache
    local key = cache_key()

    local cached = dict:get(key)
    if cached then
        -- 缓存命中，写入响应头并返回
        ngx.header["X-Cache"] = "HIT"
        ngx.header.content_type = "application/json"
        ngx.print(cached)
        return true
    end

    -- 缓存未命中
    ngx.header["X-Cache"] = "MISS"
    return false
end

-- 写入缓存
function _M.set(body, ttl)
    local dict = ngx.shared.response_cache
    local key = cache_key()
    -- TTL 默认 30 秒
    dict:set(key, body, ttl or 30)
end

return _M
```

### 5.12 链路追踪

生成与传播 trace ID：

```lua
-- tracing.lua：链路追踪模块
local _M = {}

local resty_random = require "resty.random"
local str = require "resty.string"

-- 生成 32 位十六进制 trace ID
function _M.generate_trace_id()
    local bytes = resty_random.bytes(16)
    return str.to_hex(bytes)
end

-- 从请求头提取或生成 trace ID
function _M.ensure_trace_id()
    local trace_id = ngx.var.http_x_trace_id
    if not trace_id or trace_id == "" then
        trace_id = _M.generate_trace_id()
    end

    -- 存入 ctx，供整个请求生命周期使用
    ngx.ctx.trace_id = trace_id

    -- 设置响应头，方便客户端关联
    ngx.header["X-Trace-Id"] = trace_id
    return trace_id
end

-- 记录请求日志（在 log_by_lua_block 中调用）
function _M.log()
    local trace_id = ngx.ctx.trace_id or "-"
    local elapsed = ngx.now() - ngx.req.start_time()

    -- 结构化日志，便于 ELK 采集
    local cjson = require "cjson"
    local log_entry = {
        trace_id = trace_id,
        method = ngx.var.request_method,
        uri = ngx.var.uri,
        status = ngx.var.status,
        elapsed = elapsed,
        client_ip = ngx.var.remote_addr,
        upstream_addr = ngx.var.upstream_addr or "-",
        timestamp = ngx.time(),
    }

    -- 写入 error.log
    ngx.log(ngx.INFO, cjson.encode(log_entry))
end

return _M
```

## 6. 对比分析

### 6.1 OpenResty 与其他 Web 技术栈对比

| 维度 | OpenResty | Node.js | Go (net/http) | Java Servlet |
| :--- | :--- | :--- | :--- | :--- |
| 并发模型 | Nginx 多进程 + 协程 | 单进程事件循环 | Goroutine | 线程池 |
| 内存占用 | 低（每 worker ~10MB） | 中（V8 堆） | 低（Goroutine 栈） | 高（JVM 堆） |
| 开发效率 | 中（Lua 语法简洁） | 高（npm 生态） | 高（标准库完善） | 高（Spring 生态） |
| 热更新 | 支持（HUP 信号） | 需 PM2 重启 | 需重新编译 | 需重启容器 |
| 典型 QPS | 5万+ | 1万+ | 3万+ | 5000+ |
| 适用场景 | API 网关、限流、缓存 | Web 应用、SSR | 微服务、CLI | 企业应用 |

### 6.2 OpenResty 与 APISIX、Kong 对比

| 维度 | OpenResty | APISIX | Kong |
| :--- | :--- | :--- | :--- |
| 定位 | 底层运行时 | API 网关 | API 网关 |
| 配置存储 | nginx.conf | etcd | PostgreSQL/Cassandra |
| 插件机制 | Lua 模块 | Lua + 多语言 | Lua + Go/JS |
| 动态路由 | 需自定义 | 内置 | 内置 |
| 管理界面 | 无 | Dashboard | Kong Manager |
| 商业支持 | OpenResty Inc. | Apache 2.0 | Kong Inc. |
| 学习曲线 | 陡峭（需懂 Nginx+Lua） | 中等 | 中等 |

### 6.3 共享内存 vs Redis vs 进程内缓存

| 维度 | ngx.shared.DICT | Redis | 进程内 Lua 表 |
| :--- | :--- | :--- | :--- |
| 访问延迟 | ~1μs | ~1ms | ~100ns |
| 跨 worker 共享 | 是 | 是 | 否 |
| 跨进程一致性 | 自旋锁保证 | 单线程模型 | 无需保证 |
| 持久化 | 否 | 是（RDB/AOF） | 否 |
| 容量限制 | 配置时固定 | 受内存限制 | 受 worker 内存限制 |
| 适用场景 | 高频热点数据 | 大容量缓存 | 单请求临时数据 |

### 6.4 cosocket vs ngx.location.capture

| 维度 | cosocket | ngx.location.capture |
| :--- | :--- | :--- |
| 调用方式 | 直接 TCP 连接 | 子请求（Nginx 内部） |
| 适用场景 | 调用外部服务 | 调用本 Nginx 内部 location |
| 性能 | 略低（需 TCP 握手） | 略高（无网络开销） |
| 灵活性 | 高（任意 HTTP 请求） | 低（仅限本机） |
| 并发支持 | 是（可并发多个） | 是（可并发多个） |
| 推荐场景 | 调用后端微服务 | 复用本机 location 逻辑 |

## 7. 常见陷阱与反模式

### 7.1 陷阱一：使用阻塞 I/O（生产事故案例）

**事故背景**：某电商网站使用 OpenResty 作为 API 网关，开发者在 `content_by_lua_block` 中调用 `io.open` 读取本地配置文件，导致 QPS 从 5 万骤降至 200。

**错误代码**：

```lua
content_by_lua_block {
    -- 反模式：io.open 是阻塞调用！
    local f = io.open("/etc/config.json", "r")
    local config = f:read("*a")
    f:close()
    ngx.say(config)
}
```

**问题分析**：`io.open` 是标准 Lua 的阻塞 I/O 函数，调用期间整个 worker 进程被挂起，无法处理其他请求。在高并发场景下，所有请求堆积，导致 worker 饱和。

**正确做法**：

```lua
content_by_lua_block {
    -- 方案 1：在 init_by_lua_block 中预加载配置到共享内存
    local dict = ngx.shared.app_config
    local config = dict:get("config")
    if config then
        ngx.say(config)
    else
        ngx.status = 500
        ngx.say("config not loaded")
    end
}
```

或使用 `lua-resty-core` 的 `ngx.re.opt` 等非阻塞 API：

```lua
init_by_lua_block {
    -- 启动时读取配置（此时 worker 未启动，阻塞可接受）
    local f = io.open("/etc/config.json", "r")
    if f then
        local config = f:read("*a")
        f:close()
        -- 写入共享内存供后续使用
        ngx.shared.app_config:set("config", config)
    end
}
```

### 7.2 陷阱二：连接泄漏

**事故背景**：某限流服务运行 2 小时后开始报 "too many connections"，最终 Redis 连接数耗尽。

**错误代码**：

```lua
local redis = require "resty.redis"
local red = redis:new()
red:connect("127.0.0.1", 6379)

local res, err = red:get("key")
if not res then
    ngx.log(ngx.ERR, "get failed: ", err)
    -- 反模式：错误分支未归还连接！
    return
end

-- 仅在成功路径归还连接
red:set_keepalive(10000, 100)
```

**问题分析**：当 `red:get` 返回错误时，代码直接 return，未调用 `set_keepalive`，连接被泄漏。每次错误都泄漏一个连接，最终耗尽 Redis 连接池。

**正确做法**：使用 `pcall` 包裹或确保所有路径都归还连接：

```lua
local redis = require "resty.redis"
local red = redis:new()
local ok, err = red:connect("127.0.0.1", 6379)
if not ok then
    return nil, err
end

-- 使用 pcall 包裹业务逻辑，确保 finally 归还连接
local function business()
    return red:get("key")
end

local res, err = pcall(business)
-- 无论成功失败都归还连接
red:set_keepalive(10000, 100)

if not res then
    return nil, err
end
return err  -- pcall 成功时第二个返回值是业务结果
```

### 7.3 陷阱三：全局变量污染

**事故背景**：某网关在不同请求间出现"用户 A 看到 用户 B 的订单"的串号问题。

**错误代码**：

```lua
-- 反模式：模块级变量被多个请求共享
local current_user = {}  -- 这是模块级 table，跨请求共享！

local function handle_request()
    current_user.id = ngx.ctx.user_id  -- 修改共享状态
    -- 其他请求可能在此期间读取到错误的 current_user.id
    return get_user_orders(current_user.id)
end
```

**问题分析**：Lua 模块在 worker 中只加载一次，模块级变量被所有请求共享。高并发下，多个请求交替修改 `current_user`，导致数据串号。

**正确做法**：使用 `ngx.ctx` 存储请求级状态：

```lua
-- 使用 ngx.ctx 存储请求级数据（每个请求独立）
local function handle_request()
    ngx.ctx.current_user = {id = ngx.ctx.user_id}
    return get_user_orders(ngx.ctx.current_user.id)
end
```

或每次创建新的局部变量：

```lua
local function handle_request()
    local current_user = {id = ngx.ctx.user_id}  -- 局部变量，请求隔离
    return get_user_orders(current_user.id)
end
```

### 7.4 陷阱四：错误的热加载策略

**事故背景**：某团队在配置文件中设置 `lua_code_cache off` 以便调试，上线后忘记改回，导致 QPS 从 5 万降至 100。

**错误配置**：

```nginx
http {
    lua_code_cache off;  -- 反模式：生产环境关闭代码缓存！
    ...
}
```

**问题分析**：`lua_code_cache off` 会导致每次请求都重新编译 Lua 代码，丧失 LuaJIT 的 JIT 优化，性能下降数十倍。此选项仅适用于开发环境。

**正确做法**：生产环境必须开启代码缓存：

```nginx
http {
    lua_code_cache on;  -- 默认值，生产环境必须保持
    ...
}
```

开发环境的热加载可通过 `nginx -s reload` 实现：

```bash
# 修改 Lua 代码后，发送 HUP 信号重新加载配置
nginx -s reload
```

### 7.5 陷阱五：共享内存数据膨胀

**事故背景**：某缓存服务运行一周后，共享内存字典写满，新数据无法写入，导致缓存命中率从 90% 降至 10%。

**错误代码**：

```lua
local dict = ngx.shared.cache
-- 反模式：未设置 TTL，数据永久驻留
dict:set("user:" .. user_id, user_data)
```

**问题分析**：`set` 未指定 TTL 时，数据永久驻留共享内存，直到被 LRU 淘汰。但若写入速度超过淘汰速度，共享内存会迅速写满。

**正确做法**：

```lua
local dict = ngx.shared.cache
-- 设置合理的 TTL（如 1 小时）
dict:set("user:" .. user_id, user_data, 3600)

-- 或使用 add（仅当键不存在时写入），避免覆盖
dict:add("user:" .. user_id, user_data, 3600)
```

### 7.6 陷阱六：协程上下文丢失

**事故背景**：开发者在 `ngx.timer.at` 回调中尝试访问 `ngx.var.uri`，结果报错 "no request found"。

**错误代码**：

```lua
local function timer_callback(premature)
    -- 反模式：定时器中无请求上下文，ngx.var 不可用
    local uri = ngx.var.uri  -- 报错！
    ngx.log(ngx.INFO, "processing uri: ", uri)
end
ngx.timer.at(10, timer_callback)
```

**问题分析**：`ngx.timer.at` 回调运行在独立协程中，脱离请求上下文，`ngx.var`、`ngx.req` 等 API 不可用。

**正确做法**：在创建定时器时捕获所需数据：

```lua
local function timer_callback(premature, uri)
    -- 通过闭包参数传递数据
    ngx.log(ngx.INFO, "processing uri: ", uri)
end

-- 创建定时器时传入 uri
ngx.timer.at(10, timer_callback, ngx.var.uri)
```

## 8. 工程实践

### 8.1 项目结构规范

推荐的 OpenResty 项目目录结构：

```
my-app/
├── conf/
│   └── nginx.conf          # Nginx 配置文件
├── lua/
│   ├── lib/                # 第三方库（通过 opm 或 luarocks 安装）
│   │   └── resty/
│   ├── modules/            # 业务模块
│   │   ├── auth.lua
│   │   ├── rate_limit.lua
│   │   └── cache.lua
│   └── init.lua            # 初始化脚本
├── logs/
│   ├── access.log
│   └── error.log
├── t/                      # 测试目录（Test::Nginx）
│   └── auth.t
└── Makefile
```

`nginx.conf` 中配置 Lua 路径：

```nginx
http {
    # 设置 Lua 模块搜索路径
    lua_package_path "/usr/local/openresty/lualib/?.lua;/path/to/my-app/lua/modules/?.lua;;";
    lua_package_cpath "/usr/local/openresty/lualib/?.so;;";

    # 启动时执行初始化
    init_by_lua_block {
        require "init"
    }

    # ...
}
```

### 8.2 连接池管理

统一的连接池管理模块：

```lua
-- connection_pool.lua：连接池管理
local _M = {}

local pools = {}

-- 获取连接（带连接池）
-- 参数：
--   module: 模块名（"redis" / "mysql"）
--   config: 连接配置
-- 返回值：
--   conn: 连接对象
--   err: 错误信息
function _M.get(module, config)
    local mod = require("resty." .. module)
    local conn = mod:new()
    conn:set_timeout(config.timeout or 5000)

    local ok, err = conn:connect(config.host, config.port)
    if not ok then
        return nil, err
    end

    -- 模块特定的初始化
    if module == "redis" and config.auth then
        local ok, err = conn:auth(config.auth)
        if not ok then
            return nil, err
        end
    elseif module == "mysql" then
        local ok, err = conn:connect(config)
        if not ok then
            return nil, err
        end
    end

    return conn
end

-- 归还连接（必须调用）
function _M.release(conn, idle_time, pool_size)
    idle_time = idle_time or 10000
    pool_size = pool_size or 100
    local ok, err = conn:set_keepalive(idle_time, pool_size)
    if not ok then
        ngx.log(ngx.WARN, "归还连接池失败: ", err)
        -- 归还失败则关闭连接
        conn:close()
    end
end

return _M
```

### 8.3 错误处理与日志

统一的错误处理与结构化日志：

```lua
-- error_handler.lua：错误处理模块
local _M = {}

local cjson = require "cjson"

-- 标准化错误响应
-- 参数：
--   status: HTTP 状态码
--   code: 业务错误码
--   message: 错误信息
--   details: 附加详情（可选）
function _M.respond_error(status, code, message, details)
    ngx.status = status
    ngx.header.content_type = "application/json"
    local body = {
        error = {
            code = code,
            message = message,
            trace_id = ngx.ctx.trace_id or "-",
        }
    }
    if details then
        body.error.details = details
    end
    ngx.say(cjson.encode(body))
    return ngx.exit(status)
end

-- 结构化日志
-- 参数：
--   level: 日志级别（ngx.INFO / ngx.WARN / ngx.ERR）
--   event: 事件名
--   data: 日志数据（table）
function _M.log(level, event, data)
    local entry = {
        timestamp = ngx.time(),
        level = level,
        event = event,
        trace_id = ngx.ctx.trace_id or "-",
        data = data,
    }
    ngx.log(level, cjson.encode(entry))
end

-- pcall 包装器，自动捕获错误并记录
function _M.safe_call(fn, ...)
    local ok, err = pcall(fn, ...)
    if not ok then
        _M.log(ngx.ERR, "safe_call_error", {error = err})
        return nil, err
    end
    return err  -- pcall 成功时第二个返回值是函数返回值
end

return _M
```

### 8.4 性能调优

#### 8.4.1 LuaJIT 优化

```nginx
http {
    # 启用 LuaJIT 的 JIT 编译
    lua_jit_enable on;

    # 设置 JIT 缓存大小（默认 32K）
    lua_jit_cache_size 128k;

    # 设置 Lua 协程栈大小（默认 8K）
    lua coroutine_stack_size 16k;
}
```

#### 8.4.2 共享内存优化

```nginx
http {
    # 根据业务量合理设置共享内存大小
    lua_shared_dict rate_limit 10m;      # 限流计数器
    lua_shared_dict response_cache 50m;  # 响应缓存
    lua_shared_dict app_config 1m;       # 配置数据

    # 启用共享内存的 LRU 淘汰
    lua_shared_dict_lru on;
}
```

#### 8.4.3 连接池优化

```lua
-- 根据后端服务能力调整连接池大小
-- 经验值：worker 数 * 单 worker 池大小 = 总连接数
-- 例如：4 workers * 100 connections = 400 总连接数
local POOL_SIZE = 100
local IDLE_TIME = 60000  -- 60 秒空闲超时
red:set_keepalive(IDLE_TIME, POOL_SIZE)
```

### 8.5 监控指标

#### 8.5.1 Prometheus 指标暴露

```lua
-- metrics.lua：Prometheus 指标模块
local _M = {}

local prometheus = require "prometheus"

local metric_registry

-- 初始化指标（在 init_by_lua_block 中调用）
function _M.init()
    metric_registry = prometheus.init("prometheus_metrics", 1024 * 1024)

    -- 定义指标
    _M.http_requests_total = metric_registry:counter(
        "http_requests_total",
        "Total HTTP requests",
        {"status", "method"}
    )
    _M.http_request_duration = metric_registry:histogram(
        "http_request_duration_seconds",
        "HTTP request duration",
        {"method"},
        {0.001, 0.01, 0.1, 0.5, 1, 5}
    )
    _M.lua_memory_bytes = metric_registry:gauge(
        "lua_memory_bytes",
        "Lua memory usage"
    )
end

-- 记录请求
function _M.record_request(method, status, duration)
    _M.http_requests_total:inc(1, {tostring(status), method})
    _M.http_request_duration:observe(duration, {method})
end

-- 暴露指标
function _M.collect()
    ngx.header.content_type = "text/plain"
    metric_registry:collect()
end

return _M
```

#### 8.5.2 日志聚合

```lua
-- 在 log_by_lua_block 中聚合日志
log_by_lua_block {
    local metrics = require "metrics"
    local elapsed = ngx.now() - ngx.req.start_time()
    metrics.record_request(ngx.var.request_method, ngx.var.status, elapsed)
}
```

### 8.6 CI/CD 集成

#### 8.6.1 测试（Test::Nginx）

```perl
# t/auth.t
use Test::Nginx::Socket 'no_plan';

run_tests();

__DATA__

=== TEST 1: 无 token 应返回 401
--- http_config
    lua_shared_dict test 1m;
--- config
    location /api {
        access_by_lua_block {
            local auth = ngx.var.http_authorization
            if not auth then
                ngx.status = 401
                ngx.say('{"error": "missing_token"}')
                return ngx.exit(401)
            end
        }
    }
--- request
GET /api
--- response_body
{"error": "missing_token"}
--- error_code: 401
```

#### 8.6.2 部署脚本

```bash
#!/bin/bash
# deploy.sh：部署脚本

set -e

APP_DIR="/opt/my-app"
NGINX_BIN="/usr/local/openresty/nginx/sbin/nginx"

# 拉取最新代码
cd $APP_DIR
git pull origin main

# 语法检查
$NGINX_BIN -t -p $APP_DIR -c conf/nginx.conf

# 平滑重载
$NGINX_BIN -s reload -p $APP_DIR -c conf/nginx.conf

echo "部署完成"
```

## 9. 案例研究

### 9.1 案例一：Kong API 网关

**项目背景**：Kong 是基于 OpenResty 的开源 API 网关，由 Mashape 于 2015 年开源，目前是 CNCF 旗下的知名项目。Kong 利用 OpenResty 的阶段化处理能力，实现了插件化的网关功能。

**架构设计**：

Kong 的核心架构包括：

1. **路由层**：基于 Nginx 的 location 匹配，结合 Lua 实现动态路由。
2. **插件层**：每个插件在请求处理的不同阶段注册回调函数。
3. **数据层**：使用 PostgreSQL 或 Cassandra 存储路由配置，通过 Lua 共享内存缓存。

**关键实现**：

```lua
-- Kong 的插件接口（简化版）
local BasePlugin = require "kong.plugins.base_plugin"

local MyPlugin = BasePlugin:extend()

function MyPlugin:new()
    MyPlugin.super.new(self, "my-plugin")
end

-- 在 access 阶段执行
function MyPlugin:access(conf)
    MyPlugin.super.access(self)

    -- 实现认证逻辑
    local token = ngx.var.http_authorization
    if not token or not verify_token(token) then
        return kong.response.exit(401, {error = "unauthorized"})
    end

    -- 注入自定义请求头
    kong.service.request.set_header("X-Authenticated", "true")
end

-- 在 log 阶段执行
function MyPlugin:log(conf)
    MyPlugin.super.log(self)
    -- 记录访问日志
    kong.log.notice({
        method = kong.request.get_method(),
        uri = kong.request.get_path(),
        status = kong.response.get_status(),
    })
end

return MyPlugin
```

**经验总结**：

- Kong 的成功证明了 OpenResty 在 API 网关场景的适用性。
- 插件化设计允许功能扩展而不修改核心代码。
- 共享内存缓存大幅降低数据库压力，支持高并发。

### 9.2 案例二：APISIX 云原生网关

**项目背景**：APISIX 由支流云（API7）于 2019 年开源，定位为云原生 API 网关。与 Kong 不同，APISIX 使用 etcd 作为配置存储，实现真正的动态配置。

**架构特点**：

1. **配置中心**：etcd 提供强一致性的配置存储，所有 worker 通过 watch 机制订阅变更。
2. **路由匹配**：基于 radixtree 实现高性能路由匹配，支持前缀、正则、Host 等多种匹配方式。
3. **插件热加载**：插件配置变更无需重启，通过 etcd watch 实时生效。

**关键实现**：

```lua
-- APISIX 的路由匹配（简化版）
local radixtree = require "resty.radixtree"
local core = require "apisix.core"

local router

-- 初始化路由
function _M.init_worker()
    local routes = fetch_routes_from_etcd()
    router = radixtree.new(routes)
end

-- 路由匹配
function _M.match(method, uri, headers)
    local opts = {
        method = method,
        host = headers["Host"],
        remote_addr = ngx.var.remote_addr,
    }
    return router:match(uri, opts)
end

-- 监听 etcd 变更
function _M.watch_etcd()
    local etcd = require "resty.etcd"
    local client = etcd.new({...})

    -- watch 路由变更
    local res, err = client:watch("/apisix/routes", function(event)
        if event.type == "PUT" then
            update_route(event.value)
        elseif event.type == "DELETE" then
            delete_route(event.key)
        end
        -- 重建路由树
        rebuild_router()
    end)
end
```

**经验总结**：

- etcd 的 watch 机制实现了配置的实时同步，无需重启。
- radixtree 提供了 O(log n) 的路由匹配性能，支持复杂规则。
- 插件机制与 Kong 类似，但配置动态化是关键差异。

### 9.3 案例三：Bilibili 动态分发

**项目背景**：Bilibili 在视频动态分发场景中使用 OpenResty 作为接入层，处理每秒数十万级的请求。

**架构设计**：

1. **多级缓存**：本地 Lua 缓存 + Redis 集群 + 数据库，层层递进。
2. **限流降级**：基于共享内存的滑动窗口限流，超限时自动降级到默认数据。
3. **灰度发布**：通过请求头或用户 ID 哈希，将流量分流到不同后端。

**关键代码**：

```lua
-- 多级缓存查询
local function get_user_feed(user_id)
    -- L1: 本地缓存（ngx.shared.DICT）
    local dict = ngx.shared.feed_cache
    local cache_key = "feed:" .. user_id
    local cached = dict:get(cache_key)
    if cached then
        ngx.header["X-Cache"] = "L1-HIT"
        return cached
    end

    -- L2: Redis 集群
    local redis = require "resty.rediscluster"
    local red = redis:new({nodes = {...}})
    local res, err = red:get("feed:" .. user_id)
    if res and res ~= ngx.null then
        -- 回填 L1
        dict:set(cache_key, res, 30)
        ngx.header["X-Cache"] = "L2-HIT"
        return res
    end

    -- L3: 数据库（最终回源）
    local mysql = require "resty.mysql"
    local db = mysql:new()
    -- ... 数据库查询 ...
    local data = db:query("SELECT feed FROM user_feed WHERE user_id = " .. user_id)

    -- 回填 L1 和 L2
    dict:set(cache_key, data, 30)
    red:set("feed:" .. user_id, data, "EX", 3600)

    ngx.header["X-Cache"] = "MISS"
    return data
end
```

**经验总结**：

- 多级缓存是应对高并发读的关键，L1 缓存命中率应保持在 90% 以上。
- 限流降级是系统稳定性保障，避免后端雪崩。
- 灰度发布是平滑升级的核心，降低发布风险。

### 9.4 案例四：12306 票务系统

**项目背景**：12306 在春运期间的峰值 QPS 达数十万，使用 OpenResty 作为接入层进行限流与缓存。

**关键应用**：

1. **余票查询缓存**：将余票查询结果缓存到共享内存，TTL 30 秒，大幅降低数据库压力。
2. **排队限流**：基于令牌桶算法，控制下单请求速率，防止系统过载。
3. **熔断降级**：当后端不可用时，返回缓存数据或默认提示，保证用户可用性。

**令牌桶实现**：

```lua
-- token_bucket.lua：令牌桶限流
local _M = {}

function _M.acquire(dict, key, capacity, rate, now, requested)
    -- 获取当前令牌数与上次更新时间
    local bucket = dict:get(key)
    local tokens, last_time
    if bucket then
        -- 解析序列化数据
        tokens, last_time = bucket:match("^(%d+):(%d+)$")
        tokens = tonumber(tokens)
        last_time = tonumber(last_time)
    else
        -- 首次初始化为满桶
        tokens = capacity
        last_time = now
    end

    -- 按速率补充令牌
    local elapsed = now - last_time
    local new_tokens = elapsed * rate
    tokens = math.min(capacity, tokens + new_tokens)

    -- 检查令牌是否充足
    if tokens < requested then
        -- 不足，更新时间但拒绝
        dict:set(key, tokens .. ":" .. now, 3600)
        return false, math.ceil((requested - tokens) / rate)
    end

    -- 扣减令牌
    tokens = tokens - requested
    dict:set(key, tokens .. ":" .. now, 3600)
    return true, 0
end

return _M
```

**经验总结**：

- 令牌桶算法允许突发流量，适合票务场景。
- 共享内存的原子操作保证了限流的准确性。
- 熔断降级是最后一道防线，必须提前规划。

## 10. 习题

### 10.1 基础题

**题目 1**：OpenResty 的请求处理阶段顺序是？

A. rewrite → access → content → log  
B. access → rewrite → content → log  
C. rewrite → content → access → log  
D. content → access → rewrite → log  

**答案要点**：A。Nginx 请求处理阶段顺序为 rewrite → access → content → log（中间还有其他阶段如 find_config、post_access 等）。

**题目 2**：以下哪个 API 在 `init_by_lua_block` 中不可用？

A. `ngx.shared.DICT`  
B. `ngx.timer.at`  
C. `ngx.socket.tcp`  
D. `print`  

**答案要点**：C。`init_by_lua_block` 在 Nginx 启动时执行，此时 worker 进程尚未启动，cosocket API（包括 `ngx.socket.tcp`）不可用。

**题目 3**：`ngx.shared.DICT` 的 `incr` 方法返回值是？

A. 单个布尔值表示成功  
B. 新值与错误信息  
C. 旧值与新值  
D. 仅新值  

**答案要点**：B。`incr` 返回 `new_value, err`，其中 `new_value` 为递增后的新值，`err` 为错误信息（成功时为 nil）。

### 10.2 进阶题

**题目 4**：设计一个基于 `ngx.shared.DICT` 的熔断器，要求：

- 当 1 分钟内错误率超过 50% 时熔断。
- 熔断后 30 秒内直接拒绝请求。
- 30 秒后进入半开状态，放行 10% 的请求。
- 半开状态下成功率恢复到 80% 后关闭熔断。

**答案要点**：

```lua
-- circuit_breaker.lua
local _M = {}

local STATES = {CLOSED = "closed", OPEN = "open", HALF_OPEN = "half_open"}

function _M.acquire(dict, name, config)
    local key = "cb:" .. name
    local state = dict:get(key .. ":state") or STATES.CLOSED
    local now = ngx.now()

    if state == STATES.OPEN then
        -- 检查是否到半开时间
        local open_time = tonumber(dict:get(key .. ":open_time")) or 0
        if now - open_time >= 30 then
            state = STATES.HALF_OPEN
            dict:set(key .. ":state", state)
        else
            return false, "circuit_open"
        end
    end

    if state == STATES.HALF_OPEN then
        -- 10% 放行
        if math.random() > 0.1 then
            return false, "half_open_rejected"
        end
    end

    return true, state
end

function _M.record(dict, name, success)
    local key = "cb:" .. name
    local state = dict:get(key .. ":state") or STATES.CLOSED

    -- 更新计数器
    local total = dict:incr(key .. ":total", 1, 0, 60)
    if not success then
        dict:incr(key .. ":errors", 1, 0, 60)
    end

    local errors = tonumber(dict:get(key .. ":errors")) or 0
    local error_rate = errors / total

    if state == STATES.HALF_OPEN then
        -- 半开状态下检查恢复
        if total >= 10 and error_rate < 0.2 then
            dict:set(key .. ":state", STATES.CLOSED)
            dict:delete(key .. ":total")
            dict:delete(key .. ":errors")
        elseif error_rate >= 0.5 then
            dict:set(key .. ":state", STATES.OPEN)
            dict:set(key .. ":open_time", ngx.now())
        end
    elseif state == STATES.CLOSED then
        if total >= 100 and error_rate >= 0.5 then
            dict:set(key .. ":state", STATES.OPEN)
            dict:set(key .. ":open_time", ngx.now())
        end
    end
end

return _M
```

**题目 5**：解释为什么 `ngx.ctx` 不能用于跨阶段传递大数据，并提出替代方案。

**答案要点**：

`ngx.ctx` 是请求级上下文，其生命周期与请求一致。但它存在两个限制：

1. **内存占用**：`ngx.ctx` 存储在 worker 进程内存中，若存储大数据（如 MB 级），高并发时会导致 worker 内存暴涨。
2. **阶段间拷贝**：某些阶段间会触发 `ngx.ctx` 的深拷贝（如 `balancer_by_lua`），大数据拷贝开销大。

替代方案：

- **共享内存**：将大数据存入 `ngx.shared.DICT`，在 `ngx.ctx` 中只存引用键。
- **Redis**：跨请求或跨 worker 共享大数据。
- **文件描述符传递**：对于流式数据，使用 `ngx.pipe` 或 cosocket 传递。

### 10.3 挑战题

**题目 6**：设计一个基于 OpenResty 的分布式限流集群，要求：

- 支持每秒 10 万级 QPS 的限流。
- 限流规则可动态更新。
- 支持滑动窗口与令牌桶两种算法。
- 集群中任意节点故障不影响限流准确性。

**答案要点**：

设计要点：

1. **两级架构**：本地限流（共享内存）+ 集群限流（Redis）。
2. **本地预扣**：每个节点从 Redis 批量获取令牌（如 1000 个），本地消耗，减少 Redis 访问。
3. **动态规则**：规则存入 etcd，watch 机制推送到所有节点。
4. **算法选择**：滑动窗口用 ZSET，令牌桶用 Lua 脚本。
5. **容错**：Redis 不可用时降级为本地限流，避免单点故障。

核心代码：

```lua
-- distributed_limiter.lua
local _M = {}

function _M.acquire(rule_name, requested)
    local dict = ngx.shared.limiter
    local local_key = "local:" .. rule_name

    -- 本地预扣
    local local_tokens = dict:incr(local_key, -requested, 0)
    if local_tokens >= 0 then
        return true, "local"
    end

    -- 本地不足，从 Redis 批量获取
    local redis = require "resty.redis"
    local red = redis:new()
    red:connect("redis-cluster", 6379)

    -- Lua 脚本：原子获取令牌
    local script = [[
        local key = KEYS[1]
        local requested = tonumber(ARGV[1])
        local batch = tonumber(ARGV[2])
        local current = tonumber(redis.call('GET', key) or 0)

        if current < requested then
            return 0
        end

        -- 批量获取
        redis.call('DECRBY', key, batch)
        return batch
    ]]

    local batch_size = 1000
    local batch = red:eval(script, 1, "global:" .. rule_name, requested, batch_size)

    if batch and batch > 0 then
        -- 回填本地
        dict:incr(local_key, batch, 0)
        return true, "global"
    end

    return false, "rejected"
end

return _M
```

**题目 7**：分析以下代码的并发安全问题，并给出修复方案。

```lua
local dict = ngx.shared.cache
local value = dict:get("key")
if not value then
    -- 缓存未命中，回源获取
    value = fetch_from_backend()
    dict:set("key", value, 60)
end
return value
```

**答案要点**：

**问题**：典型的"缓存击穿"问题。高并发下，多个请求同时发现 `key` 不存在，同时回源，导致后端压力骤增。

**修复方案**：

1. **互斥锁**：使用 `add` 原子操作获取锁，仅一个请求回源。

```lua
local dict = ngx.shared.cache
local lock_key = "lock:key"

-- 尝试获取锁（add 仅在键不存在时成功）
local ok, err = dict:add(lock_key, "1", 5)  -- 锁 TTL 5 秒
if ok then
    -- 获取锁成功，回源
    local value = fetch_from_backend()
    dict:set("key", value, 60)
    dict:delete(lock_key)
    return value
else
    -- 获取锁失败，等待并重试
    for i = 1, 10 do
        ngx.sleep(0.1)
        local value = dict:get("key")
        if value then
            return value
        end
    end
    -- 等待超时，返回默认值或报错
    return nil, "wait_timeout"
end
```

2. **单飞模式**（singleflight）：同一键的并发请求合并为一个回源。

3. **预热**：在键即将过期前主动刷新，避免失效瞬间。

**题目 8**：实现一个 OpenResty 插件，根据请求头中的 `X-Canary-User` 将流量灰度到新版本后端。

**答案要点**：

```lua
-- canary_release.lua：灰度发布插件
local _M = {}

function _M.canary(canary_backend, stable_backend, canary_users)
    local canary_user = ngx.var.http_x_canary_user

    -- 优先根据用户头判断
    if canary_user and canary_users[canary_user] then
        return canary_backend
    end

    -- 默认按 10% 流量灰度
    local user_id = ngx.ctx.user_id or ngx.var.remote_addr
    local hash = ngx.crc32_long(user_id)
    if hash % 100 < 10 then
        return canary_backend
    end

    return stable_backend
end

-- 在 balancer_by_lua_block 中使用
function _M.balancer()
    local balancer = require "ngx.balancer"
    local backend = _M.canary(
        "10.0.0.2:8080",  -- canary
        "10.0.0.1:8080",  -- stable
        {user1 = true, user2 = true}  -- 指定灰度用户
    )
    local host, port = backend:match("([^:]+):(%d+)")
    balancer.set_current_peer(host, tonumber(port))
end

return _M
```

## 11. 参考文献

[1] Agentzh. 2015. OpenResty Documentation. OpenResty Inc. https://openresty.org/en/docs.html

[2] Ngixn Inc. 2024. Nginx HTTP Request Processing Phase. Nginx Documentation. https://nginx.org/en/docs/dev/development_guide.html#http_phases

[3] Mike Pall. 2020. LuaJIT 2.1 Documentation. LuaJIT Project. https://luajit.org/luajit.html

[4] Yichun Zhang. 2017. Building High-Performance Web Applications with OpenResty. In Proceedings of the Lua Workshop 2017 (LW'17). ACM, Article 4, 1–8. DOI: 10.1145/3126815.3126820

[5] Apache Software Foundation. 2024. Apache APISIX Documentation. https://apisix.apache.org/docs/

[6] Kong Inc. 2024. Kong Gateway Documentation. https://docs.konghq.com/

[7] Roberto Ierusalimschy, Luiz Henrique de Figueiredo, and Waldemar Celes. 2018. Lua 5.4 Reference Manual. PUC-Rio. https://www.lua.org/manual/5.4/

[8] Cloudflare. 2023. Engineering at Cloudflare: How We Use OpenResty. Cloudflare Blog. https://blog.cloudflare.com/

[9] Bilibili. 2022. High-Performance API Gateway Practice at Bilibili. In Proceedings of the QCon Beijing 2022. 45–52.

[10] Tao Wang and Junji Zhi. 2021. Distributed Rate Limiting with Redis and OpenResty. In Proceedings of the International Conference on Web Engineering (ICWE 2021). Springer, 234–248. DOI: 10.1007/978-3-030-77096-6_18

[11] Redis Ltd. 2024. Redis Lua Scripting Documentation. https://redis.io/docs/manual/programmability/lua/

[12] OpenResty Inc. 2023. lua-resty-core Documentation. https://github.com/openresty/lua-resty-core

## 12. 延伸阅读

### 12.1 官方文档

- **OpenResty 官方文档**：https://openresty.org/en/docs.html
  涵盖所有 `*_by_lua` 指令的详细说明、API 参考与最佳实践。

- **Nginx 开发指南**：https://nginx.org/en/docs/dev/development_guide.html
  深入理解 Nginx 内部机制，包括请求处理阶段、模块架构等。

- **LuaJIT 文档**：https://luajit.org/luajit.html
  LuaJIT 的 JIT 编译原理、FFI 接口、性能优化技巧。

### 12.2 经典书籍

- **《OpenResty 完全开发指南》**（罗曼·季先科 著）：系统讲解 OpenResty 开发，包含大量实战案例。
- **《Lua 程序设计》**（Roberto Ierusalimschy 著）：Lua 语言作者亲笔，深入理解 Lua 设计哲学。
- **《Nginx 高性能 Web 服务器详解》**：理解 Nginx 架构，为 OpenResty 开发打下基础。

### 12.3 社区资源

- **OpenResty GitHub**：https://github.com/openresty
  源码、issue、PR，跟踪最新进展。

- **OpenResty 邮件列表**：https://groups.google.com/group/openresty
  与开发者交流，获取技术支持。

- **lua-resty-* 库集合**：https://github.com/openresty/lua-resty-*
  官方维护的库集合，涵盖 Redis、MySQL、HTTP、JWT 等常用组件。

### 12.4 进阶主题

- **lua-resty-core 与 FFI**：理解如何使用 LuaJIT FFI 直接调用 C 函数，绕过 Lua/C API，获得极致性能。

- **ngx.ssl 模块**：动态加载 SSL 证书，实现 SNI 与证书热更新。

- **ngx.stream 模块**：处理 TCP/UDP 流量，扩展 OpenResty 到非 HTTP 场景。

- **OpenResty XRay**：商业性能诊断工具，提供火焰图、内存分析等高级功能。

- **WebAssembly 支持**：通过 lua-resty-wasm 在 OpenResty 中运行 WebAssembly 模块，实现多语言插件。

### 12.5 相关项目

- **Kong**：https://konghq.com/
  基于 OpenResty 的 API 网关，插件生态丰富。

- **APISIX**：https://apisix.apache.org/
  云原生 API 网关，支持 etcd 动态配置。

- **Lor**：https://github.com/sumory/lor
  基于 OpenResty 的 MVC 框架，简化 Web 应用开发。

- **Lor Framework**：类似 Express 的路由框架，适合构建 RESTful API。

- **OpenResty Edge**：OpenResty 官方的商业边缘计算平台，提供可视化配置与监控。

通过本篇文档的系统学习，读者应能掌握 OpenResty 的核心机制、工程实践与高阶应用，具备构建高性能 API 网关、限流系统、缓存层等生产级应用的能力。建议结合实际项目反复实践，深化对 Lua 嵌入 Nginx 这一独特编程模型的理解。
