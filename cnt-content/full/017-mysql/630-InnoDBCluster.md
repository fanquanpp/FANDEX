---
order: 660
title: InnoDB Cluster：官方开箱即用的高可用方案
module: 'mysql'
category: 数据库
difficulty: advanced
description: InnoDB Cluster 三组件架构（MGR 复制、Router 路由、Shell 管理）、从零搭建流程、故障切换的真实行为、ClusterSet 跨机房容灾，以及与自建主从的选型对比。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/620-GroupReplication'
  - 'mysql/640-ReplicationHA'
  - 'mysql/650-ReplicationDelayCauseSolution'
  - 'mysql/680-ShardingMiddleware'
prerequisites:
  - 'mysql/620-GroupReplication'
  - 'mysql/590-Replication'
---

## 前置知识

- Group Replication 的组复制原理（[MGR 组复制](/mysql/620-GroupReplication)）——InnoDB Cluster 的数据层就是它；
- 传统主从复制（[主从复制](/mysql/590-Replication)）作为对照系。

## 它解决什么问题

传统主从架构做高可用，你需要自己回答一堆问题：主库挂了谁决定切换（仲裁）、怎么防止旧主回来双写（脑裂）、应用连的是谁（VIP/中间件）、半同步还是异步。**InnoDB Cluster 是 MySQL 官方把这些问题打包好的答案**：三个组件各管一段，

| 组件 | 职责 | 替代了自建方案里的什么 |
| --- | --- | --- |
| MySQL Server + Group Replication | 多节点复制与一致性仲裁（基于 Paxos，自动选主、防脑裂） | 主从复制 + 自研切换脚本 |
| MySQL Router | 轻量代理：写端口转发主节点，读端口分摊备节点，主挂了自动改指新主 | Keepalived/VIP 或应用层连接配置 |
| MySQL Shell（AdminAPI） | 一条命令建集群、加节点、看状态、执行切换 | 手工运维的全部脚本 |

一句话心智模型：**MGR 管"数据不出错"，Router 管"流量找对门"，Shell 管"人少敲命令"**。

## 动手：三节点集群从零搭建

前提：三台机器各装好 MySQL 8.0+，网络互通，且实例开启 MGR 所需配置（Shell 的 `dba.configureInstance()` 会自动检查并代改）。MySQL Shell 的安装、语言模式与 util 工具族见 [MySQL Shell 工具链](/mysql/925-MySQLShellToolkit)；本篇聚焦 AdminAPI 的集群搭建与切换语义，**日常巡检脚本**（status 三字段、RECOVERING 告警、摘流量维护）也在 925 篇。

```javascript
// ===== 在 node1 上（MySQL Shell）=====
mysqlsh root@node1:3306

// 1. 检查并自动修复实例配置（MGR 参数、持久化设置）
dba.configureInstance('root@node1:3306')

// 2. 创建集群（单主模式默认：自动选一个 PRIMARY，其余 SECONDARY）
var cluster = dba.createCluster('myCluster')

// 3. 加入另外两个节点（会自动做一次全量数据初始化）
cluster.addInstance('root@node2:3306')
cluster.addInstance('root@node3:3306')

// 4. 查看集群拓扑与健康状况
cluster.status()
// "primary": "node1:3306", "node2": "SECONDARY", "node3": "SECONDARY"
```

```bash
# ===== 任意一台装 Router 并引导 =====
mysqlrouter --bootstrap root@node1:3306 --user=mysqlrouter
systemctl start mysqlrouter

# 应用只认识这两个端口：
mysql -h router-host -P 6446   # 读写端口 → 自动指向当前 PRIMARY
mysql -h router-host -P 6447   # 只读端口 → 负载分摊到 SECONDARY
```

应用从"直连数据库 IP"改为"连 Router"，这就是切换对应用透明的全部秘密：主库故障时 MGR 选出新主，Router 感知后把 6446 指向新主——**应用侧零改动**。

## 故障切换的真实行为

手工演练一次主库故障（在演练环境做）：

```bash
# 强制杀掉当前主库的 mysqld
systemctl stop mysqld   # 在 node1 上

# 数秒后查看集群状态（在任意存活节点）
mysqlsh root@node2:3306 -e "cluster.status()"
# PRIMARY 已自动切到 node2 或 node3
# 原 node1 标记为 MISSING，恢复后自动以 SECONDARY 身份追平数据
```

值得记住的三条行为细节：

1. **多数派活着才能切换**：三节点集群最多容忍一节点故障；两台同时挂掉时集群进入只读保护（宁可不可写，不可脑裂）——这是 Paxos 多数派语义的直接体现，规划节点数时按"能坏几台"倒推（容忍 2 台要 5 节点）；
2. **故障节点恢复后自动回归**：以 SECONDARY 身份增量追平，不需要人工重建（差距过大时 Shell 会提示自动走克隆恢复）；
3. **切换期间有短暂写中断**（秒级），应用需要连接池重试机制配合，Router 不解决"正在执行中的那笔事务"。

## ClusterSet：当一套集群还不够

InnoDB Cluster 解决**机房内**高可用；如果一个机房整体故障（断电、火灾、区域级云故障），需要 **ClusterSet**：把一个主集群与多个副本集群（可跨城市）串成异步复制的容灾体系。

```javascript
// 主集群上任一节点执行
var cs = cluster.createClusterSet('myClusterSet')

// 从机房搭建副本集群（异步复制主集群）
cs.createReplicaCluster('root@dr-node1:3306', 'replicaCluster')

// 灾难演练：查看整体拓扑
cs.status()

// 区域级故障时的强制切换（有数据丢失窗口，需人工确认 RPO）
cs.forcePrimaryCluster('replicaCluster')
```

层级关系一目了然：

```text
ClusterSet（跨机房容灾，异步）
  └─ InnoDB Cluster（机房内高可用，同步多数派）
       └─ MGR 节点（单机故障，秒级切换）
```

注意 `forcePrimaryCluster` 是"强制作主"——异步复制意味着副本集群可能落后主集群，强制切换前先评估可接受的数据丢失量（这正是灾备演练里 RPO 的现实含义）。

## 选型：官方全家桶 vs 自建主从

| 维度 | InnoDB Cluster | 自建主从 + 切换工具 |
| --- | --- | --- |
| 搭建与运维成本 | 低（AdminAPI 高度自动化） | 中到高（脚本自治） |
| 一致性保证 | 多数派提交，RPO=0（单机房内） | 取决于半同步/异步配置 |
| 灵活性 | 受框架约束（单主为主） | 完全可控，可做延迟从库等花样 |
| 生态成熟度 | 官方支持，8.0 起生产可用 | 社区方案（Orchestrator 等）久经考验 |
| 适合 | 中小规模、团队无 DBA 深度储备 | 大规模、有特殊拓扑需求 |

务实建议：**没有专职 DBA 的团队优先官方全家桶**——把切换仲裁这类"低频高危"操作交给官方实现，比自己维护脚本靠谱；有深度定制需求（延迟从库、跨版本、异构）再回到自建方案。

## 常见困惑

**"InnoDB Cluster 和 MGR 什么关系？"**——MGR 是底层复制技术（插件形态），Cluster 是用它搭好的"成品高可用方案"（加了 Router 与 Shell 的封装）。直接裸用 MGR 意味着切换路由与运维全部自理。

**"为什么三节点是最小生产配置？"**——多数派仲裁需要奇数节点：两节点坏一台时无法形成多数派（与单机无差别），三节点起才有真正的容错意义。测试环境单节点集群可以跑，但那只是"单机的另一种写法"。

**"Router 挂了怎么办？"**——Router 是无状态代理，多台部署 + 应用侧配多个 Router 地址（或前置 LVS/云负载均衡）即可；Router 重启后自动重新引导发现拓扑。

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：Shell、Router、MGR 三件套各自的职责是什么？去掉 Router 会少掉哪块能力？

参考答案（先自己答，再对照）：MGR（组复制插件）提供多数派复制与自动选主；MySQL Shell 的 AdminAPI 负责部署、加节点、巡检（把 MGR 的配置流程产品化）；Router 是无状态代理——维护拓扑视图，把写路由到 Primary、读分摊到 Secondary，Primary 变化时自动跟随。去掉 Router 少掉的是"应用无感切换"：应用直连节点，Primary 切换要靠 DNS/连接池配合人工或自研路由。

2. 概念自问：为什么"三节点"是最小生产配置？两节点集群坏一台时发生什么？

参考答案（先自己答，再对照）：多数派需要在线节点超过半数。三节点坏一台：2/3 在线，形成多数派，服务继续。两节点坏一台：1/2 不构成多数派——集群无法选出新主、无法认证新事务，整组进入只读等待，与单机故障无异且更难恢复。多数派语义决定了"偶数节点 = 浪费 + 危险"，所以官方模板永远是奇数。

3. 判断题：ClusterSet 的 forcePrimaryCluster 逃生通道可以随时用，RPO=0 一样保证。

参考答案（先自己答，再对照）：不是随时可用、也不保证 RPO=0。forcePrimaryCluster 用于主集群整体不可用的灾备接管——在被切到只读后强行提升副集群为主。若接管时副集群还有未同步的事务（异步复制积压），提升动作会把差异"斩断"，丢失窗口取决于积压量——这是它作为逃生通道的代价，演练时要明确"接管 = 接受可能的少量丢失"，而不是把它当成日常切换工具。

4. 概念自问：InnoDB Cluster vs 自建主从 + MHA 类方案，选型的三个决定性问题是什么？

参考答案（先自己答，再对照）：其一，切换谁做——Cluster 自动选主 + Router 自动寻址；自建要靠外部工具与人工预案。其二，一致性谁保证——Cluster 多数派认证杜绝脑裂；自建主从的"新主比从库旧"风险要靠工具配置兜底。其三，运维面谁来养——Cluster 依赖官方组件链路升级；自建胜在团队熟悉的工具与更低的资源开销。小团队、标准需求选 Cluster；深度定制、成本敏感的大团队自建仍是合理路径。

## 检验清单

- 能说出三组件的分工，以及各自替代了自建方案里的哪一块；
- 跑通（或在演练环境跑通）"建集群 → 加节点 → Router 引导 → 杀主观察切换"全流程；
- 能解释多数派语义与"三节点容忍一台故障"的换算关系；
- 能画出 Cluster → ClusterSet 的层级图，并说出 forcePrimaryCluster 的 RPO 代价；
- 有官方全家桶 vs 自建方案的选型判断依据。

## 下一步

集群解决"坏了怎么办"，分片解决"大了怎么办"：进入[分库分表中间件](/mysql/680-ShardingMiddleware)，看数据量突破单机后的架构演进。
