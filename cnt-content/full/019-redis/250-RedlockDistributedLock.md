---
order: 250
title: 分布式锁与 Redlock
description: 'Redis 分布式锁：单实例 SET NX PX + 唯一值 + Lua 安全释放、主从切换丢锁场景、Redlock 多数派算法与 Kleppmann/antirez 安全性争议、fencing token 与选型建议。'
module: 'redis'
category: 数据库
difficulty: advanced
author: fanquanpp
updated: '2026-09-12'
related:
  - 'redis/110-CacheStrategyAdvancedFeature'
  - 'redis/240-LuaScriptAtomicExecution'
  - 'redis/200-ReplicationBuffer'
  - 'redis/180-ClusterHA'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
  - 'redis/240-LuaScriptAtomicExecution'
---

## 1. 学习目标与前置知识

- 前置：用过 SET/DEL，了解 Lua 脚本的原子性（《Lua 脚本原子执行》）
  与主从异步复制（《复制缓冲区》）。
- 学完本篇你将能：
  1. 写出单实例 Redis 锁的正确姿势（加锁、释放、续期）；
  2. 解释「主从切换丢锁」到底怎么发生；
  3. 描述 Redlock 算法步骤，以及它为什么充满争议；
  4. 按业务场景选锁：效率锁用 Redis，正确性锁换共识存储。

## 2. 为什么单机锁不够用

JVM 里 `synchronized`、Go 里 `sync.Mutex` 只在**一个进程内**生效。服务
部署 10 个实例时，「防止同一订单被重复处理」的互斥必须落在所有实例
都能访问的第三方存储上——这就是分布式锁。类比：单机锁是「一间房只配
一把钥匙」，分布式锁是「十间房共用一个前台发钥匙」。

Redis 是最常用的锁载体：快、命令天然适合 CAS（SET NX）。但要注意它的
定位：**Redis 锁是为「效率」设计的，不是为「正确性」设计的**——下文
Redlock 争议的核心正是这句话。

## 3. 单实例锁的正确姿势

### 3.1 加锁：一条命令完成

```bash
# NX：不存在才设置；PX：过期时间毫秒；值必须是请求方唯一随机串
SET lock:order:1001 "f7a1b2c3-myhost-pid123" NX PX 10000
# 返回: OK          ← 拿到锁
# 返回: (nil)       ← 锁被别人持有
```

三个要素缺一不可：

| 要素 | 防什么事故 |
| :--- | :--- |
| `NX` | 已有锁时不覆盖（不用 SETNX+EXPIRE 两步，后者非原子，宕机变死锁） |
| `PX` 过期 | 持有方崩溃后锁能自动释放，避免永久死锁 |
| 唯一值 | 释放时校验，防止删掉别人的锁（任务超时后的经典误删） |

### 3.2 释放与续期：必须用 Lua 做到「读-判-删」原子

```bash
# 加载安全释放脚本（返回 1=自己释放成功，0=锁不是自己的）
SCRIPT LOAD "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end"
# 返回: "5a9d...（SHA1）"

# 之后用 EVALSHA 调用，KEYS[1]=锁键 ARGV[1]=加锁时的唯一值
EVALSHA <sha1> 1 lock:order:1001 "f7a1b2c3-myhost-pid123"
# 返回: 1
```

为什么不能 `GET` 后再 `DEL`：两条命令之间锁恰好过期并被第三方抢到，
DEL 就会误删他人的锁。Lua 在 Redis 单线程内原子执行，没有这个窗口。

任务执行时间不可预估时，用**看门狗（watchdog）**：后台线程每隔
TTL/3 用同样的 Lua 逻辑把 PX 续期（校验值仍是自己的），任务结束后停
止续期并释放。Redisson、redlock-py 等客户端库已内置。

### 3.3 单实例锁的致命场景：主从切换丢锁

主从复制是**异步**的，丢锁过程如下（无需任何 Bug 参与）：

```
T0  客户端A 在 master 上 SET NX 成功，拿到锁
T1  该写命令还没来得及复制到 replica
T2  master 宕机，Sentinel 把 replica 提升为新 master
T3  客户端B 向新 master SET NX → 成功（锁数据随旧 master 一起消失）
    → A、B 同时持锁，互斥被打破
```

对「给请求去重、防止缓存击穿」这类效率锁，偶发双持无所谓；对「扣款
幂等、库存不超卖」这类正确性要求，这就不够了。Redlock 是对这一问题的
官方回应。

## 4. Redlock 算法

### 4.1 部署与流程

Redlock（Redis 官方提出的分布式锁算法）要求 **N 个完全独立的主节点**
（官方建议 N=5，既不是主从也不是集群，彼此无复制关系），锁在多数派
上同时成立才算持有：

```
1. 取当前时间 t1（毫秒）。
2. 依次向 5 个实例执行 SET lock "唯一值" NX PX <TTL>，
   每个实例设一个很小的连接/响应超时（如 5~50ms），
   某实例失败立即尝试下一个。
3. 取当前时间 t2，计算耗时 elapsed = t2 - t1。
4. 满足以下两条才算获取成功：
   a. 至少在 N/2+1（5 取 3）个实例上拿到锁；
   b. elapsed < 锁的有效时间（TTL - elapsed 再减时钟漂移余量）。
5. 失败则向**全部**实例广播 Lua 释放脚本（无论是否拿到过），
   避免留下只占一半的残锁。
```

有效性直觉：锁在多数节点同时存在，单个实例故障转移丢锁后，竞争者
仍要在**其余多数实例**上拿锁，难度大大提高；官方还要求各实例时钟
漂移受控（漂移只影响有效期的计算精度）。

### 4.2 一个 Java 风格的伪代码骨架

```java
String value = UUID.randomUUID().toString();
long ttlMs = 10_000;
int success = 0;
long t1 = System.currentTimeMillis();
for (Jedis node : fiveIndependentMasters) {      // 5 个互不复制的主节点
    if ("OK".equals(node.set(lockKey, value, SetParams.setParams()
            .nx().px(ttlMs)))) success++;
}
long elapsed = System.currentTimeMillis() - t1;
if (success >= 3 && elapsed < ttlMs - driftMs) {
    // 持锁执行业务；结束后向 5 个节点都执行安全释放 Lua
} else {
    unlockAll(fiveIndependentMasters, lockKey, value);  // 释放全部
}
```

生产不建议手写，直接用 redisson 的 RedLock 或语言对应实现。

## 5. 争议：Redlock 到底安不安全

这是分布式系统领域一场著名的技术辩论，双方都是顶级专家。此处客观
呈现双方论点，结论留给读者结合场景判断。

### 5.1 Kleppmann 的质疑（2016，《How to do distributed locking》）

Martin Kleppmann（《Designing Data-Intensive Applications》作者）认为
Redlock 不安全：

1. **进程暂停绕不过**：持锁线程发生 GC 停顿/虚拟机休眠，恢复后根本
   「不知道时间已经过了很久」，锁可能已过期而它仍在写共享资源——
   任何基于超时的锁都对此无解，Redlock 也不例外。
2. **时钟假设可疑**：Redlock 的有效性计算依赖各节点本地时钟大体同步；
   时钟跳变（NTP 校时、管理员改时间）可能让两个客户端同时认为自己
   持有多数派锁。
3. **建议改用共识系统**：ZooKeeper/etcd 等基于共识协议的锁服务，
   并配合 **fencing token**（一个单调递增的令牌）：存储层拒绝比已见
   过的令牌更小的写入，从根上让「过期持锁者」的写操作失效。

### 5.2 antirez 的回应（《Is Redlock safe?》）

Redis 作者 Salvatore Sanfilippo 逐条反驳：

1. 进程暂停问题对 **etcd/ZooKeeper 同样存在**——共识锁过期后照样有
   「僵尸客户端」，没有 fencing token 谁都不安全，所以这不是 Redlock
   特有的缺陷；
2. fencing token 本质上要求存储侧配合做单调性校验，那是一个额外的
   分布式系统特性，并不能由锁服务单方面提供；
3. 实际系统中时钟跳变可以通过运维约束（禁用跳变式校时）压到极低，
   Redlock 在工程上足够安全。

### 5.3 双方都同意的部分（工程上最该记住的）

- 超时锁 + 不做写侧校验，就无法对抗进程暂停——**要正确性必须上
  fencing token 或幂等校验**，与用不用 Redlock 无关；
- 争议只关乎「Redlock 是否比单实例锁更值得为它付出 5 节点成本」；
- Kleppmann 的建议归纳为：**锁只是优化（efficiency）→ 单实例 Redis 锁
  足够；锁是正确性（correctness）要求 → 用共识存储 + fencing token，
  或干脆把互斥下沉到数据库的唯一约束/乐观锁**。

## 6. 选型建议

| 场景 | 推荐 |
| :--- | :--- |
| 防重复计算、防缓存击穿（偶尔双持无害） | 单实例 `SET NX PX` + 唯一值 + Lua 释放 |
| 多实例互斥但有幂等兜底 | Redis 锁 + 业务侧唯一键/版本号校验 |
| 资金、库存等强正确性 | etcd/ZooKeeper + fencing token，或数据库乐观锁/唯一约束 |
| 坚持用 Redlock | 锁版本实现、监控双持（持锁方互检）、TTL 留足漂移余量 |

类比总结：Redis 锁像「便利贴占座」，多数时候够用、被撕掉重贴也无伤
大雅；银行金库的钥匙不能靠便利贴，得用「取号机 + 叫号无效化」
（共识 + fencing token）。

## 7. 陷阱与调试

- **SETNX + EXPIRE 两步加锁**：两命令间宕机即死锁；一律用
  `SET ... NX PX` 一条命令。
- **释放不校验值**：误删他人锁引发连环双持；释放/续期永远走 Lua。
- **TTL 拍脑袋设小**：任务 30s 锁 5s，看门狗又没接，任务未完锁先过期。
  TTL = 任务 P99 耗时的 3~5 倍起步，或必须接看门狗。
- **把主从/集群当「多实例」跑 Redlock**：Redlock 要求 N 个**互相独立**
  的主节点（无复制关系）；拿主从架构的 5 个节点跑 Redlock 是无效部署。
- **锁粒度错位**：`lock:order` 锁住全部订单，把无关请求串行化；
  锁键应细到业务实体（`lock:order:1001`）。
- **重入支持**：上面的方案都不可重入；同线程需要重入时改用 Hash 结构
  （字段=持有者，值=重入计数）+ Lua，或直接用 Redisson 的可重入锁。

## 8. 小结

- 初学者要点：加锁 `SET key 唯一值 NX PX`，释放与续期用 Lua 校验值；
  有 TTL 就不怕死锁，有唯一值就不怕误删。
- 进阶注意：异步复制使单实例锁在故障转移时可能双持；Redlock 用 5
  独立实例多数派缓解，但其安全性存在 Kleppmann/antirez 之争，共识是
  「超时锁都需要 fencing token 或幂等兜底才能谈正确性」；效率场景用
  Redis 锁，正确性场景换共识存储或下沉到数据库约束。
- 下一步：《Lua 脚本原子执行》（redis/240-LuaScriptAtomicExecution）把
  释放/续期脚本写扎实；《哨兵选举》（redis/210-SentinelElection）理解
  丢锁场景中的故障转移细节。
