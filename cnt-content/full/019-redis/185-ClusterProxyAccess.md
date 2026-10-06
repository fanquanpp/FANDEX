---
order: 210
title: 集群代理接入
module: 'redis'
category: 数据库
difficulty: beginner
description: redis-cluster-proxy 单入口接入 Redis Cluster：为什么需要代理、跨槽命令如何被翻译、迁移路径设计与代理层的监控口径。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'redis/220-RedisClusterHashSlot'
  - 'redis/186-RedisFlexTieredStorage'
  - 'redis/187-RedisForAISuite'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 知识点地图

- **知识类别**：平台级扩展——集群代理（redis-cluster-proxy）接入。
- **解决什么问题**：Redis Cluster 的客户端必须自己懂集群协议（连任意节点、缓存槽位映射、处理 MOVED/ASK 重定向）。改不动客户端时，代理在中间把集群伪装成单机，让老系统零改造上集群。
- **什么时候用到**：遗留系统的 SDK 只支持单机协议、小众语言没有集群感知客户端、临时运维脚本不值得引集群依赖。能用集群感知客户端直连的团队不该用它。

前置：了解 Redis Cluster 哈希槽与 MOVED/ASK 重定向（redis/220-RedisClusterHashSlot）。

## 1. 集群代理 redis-cluster-proxy

（本节内容承接自原《集群与高可用》集群代理一节，全部保留并扩写。）

```bash
# redis-cluster-proxy（实验性）
# 提供单入口访问 Redis Cluster

# 安装
git clone https://github.com/RedisLabs/redis-cluster-proxy.git
cd redis-cluster-proxy && make

# 启动代理
redis-cluster-proxy -p 7777 192.168.1.10:6379

# 客户端连接代理（像单机一样使用）
redis-cli -p 7777
SET key1 val1
MGET key1 key2 key3    # 代理自动处理跨槽
```

为什么需要代理？Redis Cluster 的客户端必须自己懂集群协议：连接任意节点、缓存「槽→节点」映射、处理 MOVED/ASK 重定向（详见 redis/220 的 3.1/3.2 节）。三类场景撑不起这个改造，代理的价值就出现了：

1. **老客户端**：五年前的 SDK 只会说单机协议，升级成本高于引入代理的成本；
2. **异构语言**：小众语言没有维护良好的集群感知客户端；
3. **命令行/脚本**：临时运维脚本不值得引依赖。

代理做的事：对外伪装成一个单机 Redis，对内维护到所有节点的连接池与槽位映射，把命令按槽位拆分路由（MGET 三个键不同槽，代理拆成三个请求并发转发再合并结果）。

**易错点与局限**（决定你是否真的该用它）：

- 该项目长期处于**实验状态**，官方没有给出生产级 SLA，代理自身是新的故障点与延迟来源（多一跳网络）；
- 代理无法翻译所有语义：跨槽的 `MULTI/EXEC` 事务、依赖本地键序的命令仍可能报错——能用集群感知客户端就用客户端，代理是过渡方案而非终极方案；
- 监控口径：经代理访问时 `CLIENT LIST` 看到的是代理的连接，业务定位要用代理自己的日志。

生产环境更多团队的选择是「应用层轻路由」：客户端库升级（Lettuce/Jedis/go-redis 均内建集群支持，零成本获得 220 篇讲的智能路由），代理仅保留给改不动的遗留系统。

## 2. 工程场景：老客户端借代理接入集群

背景：某 2019 年的 PHP 系统用的是只支持单机协议的 phpredis 旧版本，业务要迁入 6 节点集群，PHP 团队短期内无法升级 SDK 与适配重定向逻辑。

```bash
# 运维侧：代理节点（与集群同 VPC）
redis-cluster-proxy -p 7777 \
  192.168.1.10:6379 192.168.1.11:6379 192.168.1.12:6379

# 应用侧：连接串只改端口，从 6379 指向 7777，代码零改动
# redis://:pass@proxy-lb.internal:7777/0
```

迁移路径设计：第一阶段全量流量过代理（观察代理层 QPS/延迟基线）；第二阶段逐接口改为集群感知客户端直连（新代码先用新 SDK）；第三阶段代理只留遗留接口。代理监控三件事：连接数（代理到后端是连接池，池参数要按后端 maxclients 算账）、错峰后的 P99 增量（多一跳通常 +0.3~1ms）、跨槽命令占比（占比高说明业务键设计没跟上，见 220 的 Hash Tag 一节）。

### 2.1 第二个场景：灰度切换的回退预案

迁移期间最怕「切了就回不去」。预案设计：代理层前面挂负载均衡（如 HAProxy），健康检查直接探代理端口；应用配置中心保留两组连接串（代理地址、集群直连地址），切换用配置推送而不是发版。回退触发条件提前写死：代理层错误率连续 1 分钟超过 0.5%，或 P99 超过直连基线 2ms——触发即推配置回滚，全程 5 分钟内完成。**易错点**：跨槽 MULTI/EXEC 在直连集群协议下本来就会报错，但经代理时部分场景「碰巧能跑」，切直连后这些接口会突然炸出来——迁移清单里要专门 grep 代码里的事务与 Lua 调用（事务原子性的完整讨论见 redis/230-PipeTransactionAtomic）。

### 2.2 第三个场景：异构语言的最低成本验证

某团队用 Elixir 接入 Redis Cluster，社区没有成熟的集群客户端。评估三条路：自己实现槽位路由（约两周工作量且要长期维护）、上代理（一天）、换语言支持最好的中间层。他们选了代理先行验证业务可行性，三个月后业务稳定才决定自己封装——代理在这里的角色是**验证期脚手架**：用最小的成本回答「业务在集群上跑不跑得通」，跑通后再评估长期形态。

## 3. 动手实践

**任务一**：本机起 3 主集群（可用 220 篇的创建命令），装 redis-cluster-proxy 后用不带集群支持的 redis-cli（默认 `-p 7777` 连代理）执行 `MSET k1 v1 k2 v2 k3 v3`，观察代理日志中的拆分路由记录；再直接连节点端口试同一命令，对比 CROSSSLOT 报错。

<details>
<summary>任务一参考观察</summary>

经代理：MSET 三键不同槽也能成功（代理按槽拆成三条 SET 分别转发后合并）；直连节点：报 `(error) CROSSSLOT Keys in request don't hash to the same slot`。体会代理「翻译语义」的价值与代价：它把错误吞掉换来了兼容性，但也把「业务键设计问题」（该用 Hash Tag 收拢）掩盖了——长期跑在代理上会失去键设计的演进压力。
</details>

**任务二**：测量代理的延迟税。用 `redis-cli --latency` 分别直连节点与经代理压 10000 次 PING，记录两者 P50/P99；再把 `redis-benchmark` 的 `-p 7777` 指向代理跑 SET/GET 混合负载，对比吞吐量差异。

<details>
<summary>任务二参考观察</summary>

典型数据：直连 P50 约 0.2ms、经代理 P50 约 0.5ms（一跳内网 RTT 加拆分合并开销）；吞吐量经代理通常下降 20%~40%，跨槽命令占比越高降幅越大。结论：延迟税是常数项但吞吐损失随业务键设计恶化——代理监控里「跨槽命令占比」这个指标值得每次发布后看一眼。
</details>

**任务三**：写一份「代理适用性评估清单」：对照第 1 节的三类适用场景与三条局限，检查你手头（或你了解的）一个系统，逐条回答「是否属于三类场景」「是否踩了三条局限」，最后给出用/不用的结论与理由。

## 4. 下一步与延伸阅读

- 《Redis Cluster 哈希槽》（redis/220-RedisClusterHashSlot）：代理路由与 MOVED/ASK 的协议基础，也是「不用代理」时客户端智能路由的原理；
- 《Redis Flex 分层存储》（redis/186-RedisFlexTieredStorage）与《Redis for AI 套件》（redis/187-RedisForAISuite）：同属平台级扩展的成本侧与 AI 侧能力。

## 参考与致谢

- redis-cluster-proxy 仓库：<https://github.com/RedisLabs/redis-cluster-proxy>（Redis Source Available License），安装与启动命令；
- 本篇正文为教学重写；原《集群代理、Flex 混合存储与 Redis for AI》的集群代理小节与工程场景一保留于本篇；Redis Flex 部分已搬移至 186 号、Redis for AI 部分已搬移至 187 号落位。
