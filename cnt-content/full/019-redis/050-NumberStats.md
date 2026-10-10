---
order: 70
title: 基数统计
module: 'redis'
category: 数据库
difficulty: intermediate
description: "精确计数与估算计数：INCR 的原子性从哪来、固定窗口限流器的竞态坑与三种修法、HyperLogLog 的伯努利直觉与 0.81% 误差来源、PFCOUNT 单键与多键的性能差异，附内存选型对照与动手练习。"
author: fanquanpp
updated: '2026-10-11'
related:
  - 'redis/060-BitMapRedis'
  - 'redis/070-GeoSpatial'
  - 'redis/090-Stream'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 1. 学习目标与前置知识

前置：读过 [概述与核心数据结构](/redis/010-OverviewCoreDataStructure)，知道 String 可以存数字；会用 redis-cli 跑命令。

读完本文你将能够：

1. 在「精确计数」与「估算计数」之间做选型，说出各自的内存与精度代价；
2. 解释 `INCR` 为什么天然并发安全（原子性来自服务端单线程，不来自锁）；
3. 亲手搭一个固定窗口限流器，重现「INCR 与 EXPIRE 分两条执行」的竞态坑并给出三种修法；
4. 用伯努利试验的直觉解释 HyperLogLog 为什么 12KB 能估到亿级、0.81% 的误差从哪来；
5. 记住 `PFCOUNT` 的三个反直觉行为（多键慢、读命令可能写缓存、集群下按写命令路由）。

预计 40 到 60 分钟，含一组必须动手的限流器实验。

## 2. 先分清：三套计数工具

「计数」在 Redis 里有两套思路、三种工具，选错会白费内存或引入不可接受的误差：

| 工具          | 命令              | 精度 | 内存             | 能否取出明细     |
| :------------ | :---------------- | :--- | :--------------- | :--------------- |
| 字符串计数    | INCR / INCRBY     | 精确 | O(1)，几十字节   | 不能（只有总数） |
| 位图          | SETBIT / BITCOUNT | 精确 | 按最大编号       | 能（按位还原）   |
| HyperLogLog   | PFADD / PFCOUNT   | 估算 | 约 12KB，与元素数无关 | 不能         |

选型的第一问不是「哪个快」，而是：**你到底要不要「谁」的明细？** 只问「多少个」——三种都行，拼内存；还要问「是谁」——HLL 直接出局；要按位还原签到明细——位图上场。本文展开字符串计数与 HLL 两个极端，位图见 [BitMap](/redis/060-BitMapRedis)。

## 3. 精确计数：INCR 家族与原子性从哪来

```bash
SET pv:home 100
INCR pv:home            # 101（原子自增）
INCRBY pv:home 10       # 111
DECRBY pv:home 5        # 106
INCRBYFLOAT pv:home 2.5 # 108.5（浮点自增）
```

两个基本功先钉死：

- **键不存在时 `INCR` 自动从 0 开始**。所以「首次访问 +1」不需要先 GET 判断存在性——这正是各类计数器、限流器的地基。
- **键里存的是非数字字符串时 `INCR` 报错**（`value is not an integer`）。把 String 当「万能容器」又想计数，会在这里翻车。

### 原子性来自哪里

「先 GET 再 +1 再 SET」为什么错？三个操作之间会被别的客户端插队：两个请求同时读到 100，各自写回 101，丢一次计数——经典的读改写竞态。`INCR` 没有这个问题，原因不在锁，而在架构：

> Redis 命令执行是单线程串行的，一条 `INCR` 在服务端把「读、加、写」作为不可分割的一步完成。下一个命令永远排队等它做完。

这就是「把逻辑下沉到服务端」的第一课：能用一条命令表达的并发安全，就不要在客户端用锁拼出来。当一条命令不够时，下文会看到第二课——把多条命令打包成原子执行（Lua），而不是让客户端加锁。

### 两个边界

- 64 位上限：`INCR` 加到 `9223372036854775807`（2^63 - 1）再自增会报 `increment or decrement would overflow`。日常计数器碰不到，但把毫秒时间戳当计数器起点做偏移计算时要心里有数。
- `INCRBYFLOAT` 是浮点运算，结果是十进制浮点字符串，**不适合金额**——金额要么用整数「分」存储，要么放关系库。

## 4. 动手实验：固定窗口限流器与它的竞态坑

限流器是 `INCR` 的招牌应用：同一用户 60 秒内最多 100 次请求。最直觉的写法是「计数 + 过期」两条命令：

```bash
# 方案 A：两条命令（有坑，先照着踩一遍）
INCR rate:user:42
EXPIRE rate:user:42 60
```

单独跑没问题，但把方案 A 放进真实客户端代码，想象第一次 `INCR` 执行后、`EXPIRE` 执行前进程崩溃或网络断开：**键留下了，过期时间永远没设上**。此后这个用户的计数器永不重置，60 秒窗口名存实亡——而且这种键在生产里极难排查（它是合法存在的键，只是没有 TTL）。

两种修法：

```bash
# 方案 B：用 SET 的原子选项把「创建 + 过期」绑成一条命令
SET rate:user:42 0 EX 60 NX
INCR rate:user:42

# 方案 C：Lua 脚本，把整段逻辑下沉为原子执行
EVAL "local n = redis.call('INCR', KEYS[1])
if redis.call('TTL', KEYS[1]) == -1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return n" 1 rate:user:42 60
```

方案 B 的要点：`EX` 过期时间随 `SET` 原子生效，`NX` 保证只有首次创建才设置；就算 `INCR` 那一步丢了，键也会按时过期，窗口语义不破。方案 C 的要点：脚本内多条命令一次执行完，不存在「执行到一半」；用 `TTL == -1` 判断「没设过期」而不是「是否第一次」，连历史遗留的无 TTL 键都能自动补救。

> [Lua 脚本原子执行](/redis/240-LuaScriptAtomicExecution) 专篇展开脚本模式；这里先记住结论。

## 5. 估算计数：HyperLogLog 为什么 12KB 就够

场景切换：统计一个页面每天有多少**不同**用户访问（UV）。百万 UV 用 Set 存要几十 MB，亿级要数 GB——而绝大多数业务只关心「多少个」，不关心「是谁」。HyperLogLog（HLL）把这件事压到固定 12KB，代价是约 0.81% 的标准误差。

### 概率直觉：扔硬币连正记录

HLL 的原理可以不用公式讲清。想象抛硬币，记录「连续正面」的最长次数：

- 你声称最长连正 3 次，说明大概率只抛了十来次；
- 你声称最长连正 20 次，说明大概率抛了几十万次。

「最长连正次数」是对「抛了多少次」的粗略但可用的估计器。哈希值是均匀分布的 0/1 比特串，「哈希值末尾有 k 个连续零」的概率同样是 2^-k——于是：**对每个元素取哈希，记录见过的最长连续零个数，就能反推出元素总量**。

单个估计器噪声太大，HLL 的工程化处理是：把哈希空间切成 16384 个桶（寄存器），每个桶独立记录自己见过的最长零前缀，最后对 16384 个估计值做调和平均与偏差修正。误差由此可算：约 `1.04 / sqrt(16384)` ≈ 0.81%。16384 个 6-bit 计数器拼起来是 12288 字节，加上头部就是「约 12KB」的出处——**内存与元素总量无关，只取决于桶数**。

小基数的优化：Redis 对「大部分桶还是零」的早期状态用 run-length 压缩（sparse 表示），通常几十上百字节就够；基数涨上去自动切换到 12288 字节的 dense 表示。所以「HLL 固定 12KB」是说上限，小基数时更省。

### 基本操作

```bash
# 添加元素；返回 1 表示寄存器有更新（可能是新用户），0 表示没有（多半是重复）
PFADD uv:2026-06-14 user1 user2 user3
PFADD uv:2026-06-14 user1               # 返回 0：重复元素自动去重

# 估算基数
PFCOUNT uv:2026-06-14                   # 3

# 合并多天数据（union 语义，结果可继续 PFCOUNT）
PFMERGE uv:2026-week uv:2026-06-08 uv:2026-06-09 uv:2026-06-10
PFCOUNT uv:2026-week
```

### PFCOUNT 的三个反直觉行为

这三条都写在官方 PFCOUNT 文档里，都是实际生产会撞上的：

1. **单键 O(1)，多键是另一条命令**。单键 PFCOUNT 用缓存返回上次计算结果；多键 PFCOUNT 要现场把所有键的 16384 个寄存器合并一遍，毫秒级量级，且**结果不可缓存**。文档原话级别的建议：多键形式「should be not abused」。要频繁查合并值，用 PFMERGE 落成实体键再单键查。
2. **读命令，技术上会写键**。缓存基数存在 HLL 键的最后 8 字节里，单键 PFCOUNT 可能把缓存写回键——键规格（key spec）因此标注 RW。集群与代理层按命令语义路由时，它会按写命令处理。
3. **HLL 本质是个带 16 字节头的 Redis 字符串**。所以 `GET` / `SET` 能把整个 HLL 搬走再原样恢复——迁移数据时是特性，被误当普通字符串读时是灾难。

## 6. 内存选型对照

| 特性   | HyperLogLog     | Set            |
| ------ | --------------- | -------------- |
| 内存   | 上限约 12KB     | 随元素数增长   |
| 精度   | 约 0.81% 标准误差 | 精确         |
| 百万 UV | 12KB（小基数远小于此） | 数十 MB |
| 亿级 UV | 12KB            | 数 GB          |
| 判断「某人在不在」 | 不支持 | SISMEMBER O(1) |

数量级感受：Set 每个成员要付「哈希表条目 + 字符串对象」的存储成本，百万级短 ID 实测通常在几十 MB 量级（用 `MEMORY USAGE key` 验证）；HLL 无论 1 万还是 1 亿个元素都不超过约 12KB。**不要为了省这几十 MB 把需要判重的业务硬塞进 HLL**——「在不在」的问题 HLL 答不了，误差预算也得业务点头（0.81% 意味着百万 UV 的展示值差几千个）。

## 7. 常见坑清单

1. **INCR 与 EXPIRE 分两条执行**。中间断连就留下永不过期的计数键。用 `SET ... EX ... NX` 或 Lua 绑定（见第 4 节）。
2. **把 HLL 当 Set 用**。PFADD 之后无法判断某个元素是否加入过（没有 PFEXISTS），要判重请回 Set 或位图。
3. **热路径上多键 PFCOUNT**。现场合并毫秒级且不可缓存，接口里对几十个键循环 PFCOUNT 会把 Redis 拖慢。改成 PFMERGE 实体键。
4. **INCRBYFLOAT 管钱**。浮点计数器不适合金额，金额用整数分。
5. **以为 HLL 能删元素**。HLL 只能整键 DEL，没有「移除某个成员」——数据敏感期（如 GDPR 删除请求）要设计成短周期键 + PFMERGE 的组合。
6. **把无 TTL 的计数键当正常现象**。定期 `SCAN` 配合 `TTL` 巡检 `-1` 的计数键，是限流器事故的常规体检项。

## 8. 动手练习

先只看任务与提示，写完再展开参考实现。

**练习 1：重现限流器竞态，然后修好它。**
写一个脚本模拟方案 A 的事故：`INCR` 之后不执行 `EXPIRE`（模拟崩溃），再验证这个键 `TTL` 返回 -1。然后分别用方案 B 与方案 C 重新实现，并用「两个终端交替计数」验证窗口 60 秒后计数清零。提示：方案 C 的 EVAL 里 `TTL` 判断是修复历史脏键的关键，想想为什么 `current == 1` 的判断修不了脏键。

**练习 2：用内存数字说服自己。**
分别用 Set 与 HLL 向键里灌 10 万个用户 ID（`SADD` / `PFADD`），各跑 `MEMORY USAGE`，把两个数字写下来。再用 `DBSIZE` 确认键数相同——对比「同一份业务数据，两种结构的内存账单」。

**练习 3：验证 PFCOUNT 单键与多键的性能差距。**
建 5 个 HLL 键各灌 1 万元素，分别测「循环单键 PFCOUNT x 1000 次」与「5 键联合 PFCOUNT x 1000 次」的耗时（redis-cli 的 `--latency` 或客户端计时均可），用第 5 节的缓存机制解释差距。

<details>
<summary>参考实现（先自己动手）</summary>

练习 1（bash，重现事故与两种修复）：

```bash
# 重现事故：模拟 INCR 后崩溃
redis-cli INCR rate:user:42
redis-cli TTL rate:user:42          # -1：永不过期，事故现场

# 方案 B：原子绑定创建与过期
redis-cli SET rate:user:43 0 EX 60 NX
for i in $(seq 1 5); do redis-cli INCR rate:user:43; done
redis-cli TTL rate:user:43          # 60 以内的正数

# 方案 C：Lua（TTL==-1 判断可修复历史脏键）
redis-cli EVAL "local n = redis.call('INCR', KEYS[1])
if redis.call('TTL', KEYS[1]) == -1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return n" 1 rate:user:44 60
# 对脏键 rate:user:42 再跑一次脚本：TTL 立刻被补上，事故自愈
```

`current == 1` 修不了脏键的原因：脏键的计数已经大于 1，永远不会触发「首次」分支，TTL 永远补不上。

练习 2：

```bash
# Set 版：10 万个 SADD 走管道批量灌入
for i in $(seq 1 100000); do echo "SADD big:set user$i"; done | redis-cli --pipe
# HLL 版：同样一批 ID 换 PFADD
for i in $(seq 1 100000); do echo "PFADD big:hll user$i"; done | redis-cli --pipe
redis-cli MEMORY USAGE big:set      # 数十 MB 量级
redis-cli MEMORY USAGE big:hll      # 上限约 12KB（小基数时更小）
```

也可以用任意语言客户端循环 SADD / PFADD，注意用批量管道而不是逐条往返。

要点：Set 的内存随元素数线性增长，HLL 封顶约 12KB；同一批数据两种结构的账单差千倍以上。

练习 3：

```bash
# 准备 5 个 HLL
for k in 1 2 3 4 5; do
  for i in $(seq 1 10000); do echo "PFADD hll:$k user$i"; done | redis-cli --pipe
done
# 单键循环 x1000 与 5 键联合 x1000，观察量级差
time (for i in $(seq 1 1000); do redis-cli PFCOUNT hll:1 > /dev/null; done)
time (for i in $(seq 1 1000); do redis-cli PFCOUNT hll:1 hll:2 hll:3 hll:4 hll:5 > /dev/null; done)
```

差距来源：单键走缓存（O(1)），5 键每次现场合并 5 × 16384 个寄存器且不可缓存。

</details>

## 9. 自我检查

- 能不看文档说出三种计数工具的精度、内存与「能否取明细」；
- 能解释 INCR 的原子性来自单线程命令执行，并说出「GET-改-SET」竞态的具体丢数路径；
- 能重现限流器「无 TTL 脏键」事故并给出两种修法；
- 能用扔硬币直觉向同事解释 HLL 的 12KB 与 0.81% 误差；
- 能说出 PFCOUNT 单键/多键在性能与集群路由上的差异。

## 下一步

- [BitMap](/redis/060-BitMapRedis)：把「要不要明细」推到另一个极端——按位存亿级签到与活跃；
- [Lua 脚本原子执行](/redis/240-LuaScriptAtomicExecution)：把「多条命令打包原子」的武器补全；
- [跳跃表与有序集合](/redis/270-SkipListAndSortedSet)：HLL 邻居 ZSET 的底层结构。

## 官方文档

- PFCOUNT（含缓存与多键行为）：https://redis.io/docs/latest/commands/pfcount/
- INCR（含溢出行为）：https://redis.io/docs/latest/commands/incr/
- HyperLogLog 数据类型页：https://redis.io/docs/latest/develop/data-types/hyperloglogs/
