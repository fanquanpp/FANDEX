---
order: 310
title: Redis Functions 函数库编程
module: 'redis'
category: 数据库
difficulty: beginner
description: Redis 7+ Functions 可编程性：函数库结构与 Shebang 头、FUNCTION LOAD/FCALL/LIST/DELETE、与 EVAL/EVALSHA 的区别与迁移路径、多环境脚本一致性管理。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'redis/240-LuaScriptAtomicExecution'
  - 'redis/250-RedlockDistributedLock'
  - 'redis/230-PipeTransactionAtomic'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 知识点地图

- **知识类别**：服务端可编程性——Redis 7.0+ Functions：把 Lua 脚本组织成具名函数库，按名字调用、随库升级。
- **解决什么问题**：EVAL/EVALSHA 时代，脚本是「随请求漂移的字符串」——散落在各服务的代码里，版本对不上就是 `NOSCRIPT` 或行为不一致；升级脚本要在每个调用方同步改。Functions 把脚本变成**服务端管理的具名函数**：调用方只传函数名，升级在服务端一次完成。
- **什么时候用到**：限流器、分布式锁续期、原子计数这类「多服务共享同一段原子逻辑」的场景；脚本有版本演进诉求（灰度、回滚）的场景。

前置：《Lua 脚本原子执行》（redis/240-LuaScriptAtomicExecution）——本文不重复讲 Lua 语言与原子性原理，聚焦 Functions 这层「库管理」能力。选型总览（Pipeline/事务/Lua/锁）见 redis/230 第 5 节。

## 1. 心智模型：从「传脚本」到「装函数库」

三句话建立 Functions 与 EVAL 的关系：

- **EVAL**：每次调用传脚本全文（或 EVALSHA 传哈希），脚本生命周期跟着调用方代码走；
- **Functions**：把一个或多个 Lua 函数装进「库」（library），服务端按函数名长期持有，调用方 `FCALL` 只传名字；
- **迁移路径**：函数体就是 EVAL 时代的脚本正文，包一层 `redis.register_function` 即可搬迁——Lua 代码本身不变。

Functions 解决的正是 EVALSHA 的管理债：EVALSHA 的哈希键意味着「同一个脚本在开发、测试、生产可能对应不同正文」，谁也说不清线上某个哈希是谁；Functions 的函数名是人类可读的契约，`FUNCTION LIST` 一条命令盘点服务端全部脚本资产。

## 2. 函数库结构与 Shebang 头

### 2.1 一个完整的函数库

```lua
#!lua name=ratelimiter

-- 库级辅助函数（不对外暴露）
local function parse_args(keys, args)
    return tonumber(args[1]), tonumber(args[2])
end

-- 注册为可通过 FCALL 调用的函数
redis.register_function(
    'rl_allow',
    function(keys, args)
        local limit, window = parse_args(keys, args)
        local bucket = keys[1]
        local current = redis.call('INCR', bucket)
        if current == 1 then
            redis.call('EXPIRE', bucket, window)
        end
        if current > limit then
            return 0
        end
        return 1
    end
)

-- 一个库可注册多个函数，共享库级辅助代码
redis.register_function(
    'rl_peek',
    function(keys, args)
        return redis.call('GET', keys[1]) or '0'
    end
)
```

逐段讲解：

- `#!lua name=ratelimiter` 是 Shebang 头，**必须是文件第一行**：声明引擎（lua）与库名（name=）。库名是后续 LOAD/DELETE/替换的操作键，重复 LOAD 同名库会报错，除非加 REPLACE（见 3.1）；
- `redis.register_function(名字, 函数)` 是唯一的「导出」方式——没注册的库级函数（如 `parse_args`）只能在库内复用，不占命名空间，这正是「一个库管一组相关函数」的组织方式；
- 函数签名固定为 `function(keys, args)`：KEYS 与 ARGV 的分界规则与 EVAL 完全一致（键进 KEYS、参数进 ARGV，redis/240 已详述）；
- `rl_allow` 的逻辑与 redis/240 的 EVAL 限流脚本同源：INCR 返回 1 时补 EXPIRE（保证窗口从首次访问起算），超过限额返回 0——原子性由 Lua 执行模型保证（redis/010 第 4 节的单线程）。

### 2.2 只读函数与 flags

```lua
redis.register_function{
    function_name = 'rl_peek',
    callback = function(keys, args)
        return redis.call('GET', keys[1]) or '0'
    end,
    flags = { 'no-writes' }   -- 声明为只读函数
}
```

`no-writes` flag 让函数可以在**只读副本**上通过 `FCALL_RO` 执行——查询类函数（peek/get 类）从副本读，把主库让给写路径。不声明 flag 的函数一律按「可能写」处理，只能在主库调用。

## 3. 命令面：LOAD / FCALL / LIST / DELETE

### 3.1 加载与替换

```bash
# 加载（首次）
FUNCTION LOAD "$(cat ratelimiter.lua)"

# 升级（同库名覆盖加载）
FUNCTION LOAD REPLACE "$(cat ratelimiter.lua)"

# 带描述的库（Shebang 头里写 description）
#!lua name=ratelimiter description="token-bucket style rate limiter v2"
```

`LOAD` 校验 Lua 语法与库名冲突，失败即整体拒绝（旧版本保持不变）——函数库的升级是**原子的**：要么新版本完整生效，要么停在旧版，不存在「改了一半」的中间态。

### 3.2 调用

```bash
# FCALL 函数名 numkeys key1 key2... arg1 arg2...
FCALL rl_allow 1 rl:user:1001 5 60
# (integer) 1

# 只读调用（配合 no-writes flag，可在副本执行）
FCALL_RO rl_peek 1 rl:user:1001
# "3"
```

参数布局与 EVAL 一致（`numkeys` 之后先键后参数），迁移时调用方的参数顺序不用动，变的只是「脚本正文换成函数名」。

### 3.3 盘点、删除与备份

```bash
FUNCTION LIST                              # 全部库：名称、引擎、描述
FUNCTION LIST LIBRARYNAME ratelimiter WITHCODE   # 带源码
FUNCTION DELETE ratelimiter                # 删除库
FUNCTION DUMP                              # 序列化全部库（备份/迁移用）
FUNCTION RESTORE "<dump-payload>"          # 从序列化恢复
```

`FUNCTION DUMP/RESTORE` 的定位是「把一台实例的函数资产搬到另一台」——从自建迁云、从测试环境采样到压测环境，不必重新走「源码文件 + LOAD」的流程。

### 3.4 持久化：重启不丢

Functions 与「脚本缓存」（SCRIPT LOAD 的哈希缓存）根本不同的一点：**函数库会持久化**。Redis 把已加载的函数写进数据目录的 `functions.cbor` 文件，重启自动恢复。这意味着：

- 函数是实例的**资产**而不是请求的一部分——换实例、重启实例，函数名依然可用；
- 对比 EVALSHA：脚本缓存纯内存，主库重启或 `SCRIPT FLUSH` 后所有调用方集体撞 `NOSCRIPT`，Functions 没有这个问题；
- 运维含义：functions.cbor 要纳入数据目录的备份范围，`FUNCTION DUMP` 的产物存进配置仓库是双保险。

## 4. 与 EVAL/EVALSHA 的对比与迁移

### 4.1 全维度对比

| 维度 | EVAL/EVALSHA | Functions |
| :--- | :--- | :--- |
| 调用凭证 | 脚本正文 / SHA1 哈希 | 函数名 |
| 脚本存放 | 调用方代码里 | 服务端函数库 |
| 持久化 | 无（重启丢，NOSCRIPT） | functions.cbor，重启自恢复 |
| 升级方式 | 改代码重新部署 | 服务端 LOAD REPLACE |
| 多服务共享 | 各服务复制脚本 | 共享同一个函数库 |
| 版本可见性 | 哈希对不上人 | FUNCTION LIST 可盘点 |
| 引入版本 | 2.6 | 7.0 |

### 4.2 迁移路径

存量 EVALSHA 调用迁到 Functions 的三步：

1. **打包**：把散落的脚本正文按业务域归并成库（限流一个库、锁一个库），脚本正文包上 Shebang 头与 `register_function`，KEYS/ARGV 逻辑不动；
2. **双轨**：调用方改成「先试 `FCALL`，捕获 unknown command/function 异常则回落 EVALSHA」——过渡期老实例（< 7.0）与新实例（7.0+）并存时都可用；
3. **收口**：全部实例上 7.0+ 后删回落分支，脚本正文从代码仓库移除，以函数库文件为唯一真源。

写路径里「换成别的写法会发生什么」：如果跳过双轨直接切换，低于 7.0 的实例会报 `unknown command 'FCALL'`——版本摸底是迁移第一步，`INFO server` 的 `redis_version` 拉一遍清单。

## 5. 多环境脚本一致性管理

Functions 把「脚本版本管理」从代码部署问题变成「函数库发布问题」。推荐流程：

```text
函数库源码进仓库（如 deploy/redis-functions/ratelimiter.lua）
    ↓ CI 阶段：语法校验（FUNCTION LOAD 到一次性实例）
    ↓ 发布阶段：FUNCTION LOAD REPLACE 到目标环境
    ↓ 版本记录：Shebang 的 description 字段带版本号与变更说明
```

- **幂等发布**：LOAD REPLACE 天然幂等，重复执行结果一致——发布流水线不需要「判断是否变化」的逻辑；
- **回滚**：把旧版本源码再 LOAD REPLACE 一次即是回滚，秒级完成（对比 EVALSHA 时代要回滚调用方代码）；
- **审计**：`FUNCTION LIST WITHCODE` 的输出 diff 就是当前环境与仓库版本的差异报告——漂移检测一条命令。

### 5.1 灰度升级脚本

```bash
# 1. 灰度实例（先升级的从库/新实例）
FUNCTION LOAD REPLACE "$(cat ratelimiter-v2.lua)"

# 2. 观察期：FCALL 流量全走新逻辑，对比指标
FCALL rl_allow 1 rl:user:1001 5 60

# 3. 全量：其余实例逐台 REPLACE
# 4. 回滚预案：v1 源码保持可一键 REPLACE 回去
```

灰度的价值点是「函数在服务端」，同一批调用方代码无需任何改动就吃到新逻辑——这也意味着**灰度窗口内不同实例行为不一致**（有的新有的旧），依赖「全实例行为一致」的调用方（如同一用户请求被负载均衡到不同实例）要把灰度窗口压短，或在应用侧按用户分片固定路由。

## 6. 工程场景

### 6.1 场景一：限流器脚本的版本管理

支付网关的接口限流用 5.1 节的 `rl_allow`。痛点与演进：v1 是固定窗口（INCR+EXPIRE），有窗口边界双倍流量问题；v2 改滑动窗口（ZADD 时间戳 + ZREMRANGEBYSCORE 清理 + ZCARD 计数）。Functions 下的升级路径：v2 源码进仓库 → CI 校验 → 生产 LOAD REPLACE，全部调用方零改动。**易错点**：REPLACE 前确认 v2 的 KEYS 语义与 v1 兼容（还是同一个计数键），调用方传参顺序没变——函数升级的兼容性责任在「库的维护者」，不象 EVALSHA 时代「脚本与调用方同仓同发布」天然同步；库一旦多服务共享，就要像维护公共 API 一样维护 KEYS/ARGV 契约。

### 6.2 场景二：替代散落的 EVALSHA 调用

一个微服务体系里，订单服务、营销服务、风控服务各自内嵌了一份「库存扣减」Lua 脚本——三份代码 90% 相同但细节漂移（风控的版本多了日志埋点），排查「为什么风控扣减行为不一样」花了一下午。治理动作：脚本归并为 `inventory` 库（deduct/rollback/peek 三函数），三个服务全部改 `FCALL inventory.deduct`；`FUNCTION LIST WITHCODE` 导出贴进架构文档作为契约。收益不只是代码统一：脚本升级从「三次发布」变「一次 LOAD」，行为差异类 bug 从此失去滋生地。

### 6.3 场景三：分布式锁续期函数

锁自动续期（看门狗）需要「检查持有者 + 续期」原子执行（redis/250-RedlockDistributedLock 的锁语义），这段脚本被定时任务高频调用：

```lua
#!lua name=lockrenew description="renew lock if holder matches"
redis.register_function(
    'lock_renew',
    function(keys, args)
        local holder = redis.call('GET', keys[1])
        if holder == args[1] then
            redis.call('PEXPIRE', keys[1], args[2])
            return 1
        end
        return 0
    end
)
```

用 Functions 的理由在这个场景最硬：续期是**每秒级高频调用**，EVAL 传全文浪费带宽，EVALSHA 的 NOSCRIPT 风险（主库重启后首批续期失败）会导致锁提前过期——Functions 既省传输又免 NOSCRIPT，`no-writes` 都不需要（它确实写 TTL）。函数名 `lock_renew` 同时成了可观测点：`FUNCTION LIST` 能确认线上续期逻辑是哪一版。

## 7. 动手实践

**任务一**：把 redis/240 的秒杀 Lua 脚本迁移成 Functions。任务：写出带 Shebang 头的库文件（函数名自定，如 `seckill`），LOAD 到本机 Redis 8 实例，用 FCALL 模拟 3 次扣减（库存 2），验证第三次返回 0；再执行 FUNCTION LIST 与 FUNCTION DUMP 看输出结构。

<details>
<summary>任务一参考流程</summary>

文件 `seckill.lua`：`#!lua name=seckill` 头 + `redis.register_function('seckill', function(keys, args) ... end)`，函数体沿用 240 篇的 GET/DECR/SADD 逻辑。LOAD 报错自查清单：Shebang 不在第一行（LOAD 拒绝）、库名与已有库重复（加 REPLACE 或换名）、KEYS/ARGV 索引写错（Lua 运行时报错定位到行）。DUMP 返回二进制序列化——别试图编辑它，备份的编辑仍以源码文件为准。
</details>

**任务二**：验证持久化与 NOSCRIPT 的差别。同一实例上：a) `SCRIPT LOAD "return 1"` 后 `DEBUG SLEEP 0`（或重启容器）再 `EVALSHA`，观察 NOSCRIPT；b) FUNCTION LOAD 你的库后重启容器，直接 FCALL。回答：为什么 Functions 重启不丢而脚本缓存会丢？

<details>
<summary>任务二参考观察</summary>

重启后 EVALSHA 报 `NOSCRIPT`（缓存纯内存），FCALL 正常（functions.cbor 随数据目录加载）。机制差异：脚本缓存的设计目标是「省重复传输」，生命周期等同进程；Functions 的设计目标是「服务端持有可编程资产」，所以落盘恢复。这个差异决定了 EVALSHA 的调用方必须写 NOSCRIPT 回落（重发 EVAL），Functions 的调用方不用。
</details>

**任务三**：做一次「漂移检测」演练。在两个 Redis 实例分别 LOAD 不同版本的限流库（v1 与 v2 的 description 里带版本号），然后写一个脚本（shell 或任意语言）调 `FUNCTION LIST WITHCODE` 对比两实例输出，输出「哪个实例落后哪个版本」的报告。

<details>
<summary>任务三参考设计</summary>

对比维度：库名集合是否一致（缺失库）、description 版本号（落后版本）、code 的哈希（正文漂移）。要点自查：如果 v2 只改了函数体没改 description，代码哈希对比是唯一能抓到漂移的维度——description 是给人看的版本标识，自动化检测必须以 code 哈希为准。这演练对应生产上的实际操作：发布流水线最后一步跑全实例漂移检测，不通过即告警。
</details>

## 8. 下一步与延伸阅读

- 《Lua 脚本原子执行》（redis/240-LuaScriptAtomicExecution）：函数体的语言与原子性原理（redis.call、KEYS/ARGV、随机命令限制）；
- 《Redlock 分布式锁》（redis/250-RedlockDistributedLock）：锁续期函数服务的锁语义；
- 《管道与事务原子性》（redis/230-PipeTransactionAtomic）：第 5 节选型表里 Lua/Functions 的位置。

## 参考与致谢

- Redis 官方文档 Functions：<https://redis.io/docs/latest/develop/interact/programmability/functions-intro/>（CC-BY-SA 4.0），Shebang 头、register_function 与 FUNCTION 命令族说明；
- 本篇为对照官方 Programmability 主题新增的教学文档，代码示例均为教学重写。
