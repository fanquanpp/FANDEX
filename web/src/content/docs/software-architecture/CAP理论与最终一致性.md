---
order: 15
title: CAP理论与最终一致性
module: 'software-architecture'
category: 'eng-infra'
difficulty: advanced
description: CAP定理、BASE理论、一致性模型与分布式系统权衡。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'software-architecture/事件驱动架构'
  - 'software-architecture/质量属性'
  - 'software-architecture/领域驱动设计'
  - 'software-architecture/架构评估'
prerequisites: []
---

## 1. CAP定理

### 1.1 定义

分布式系统最多同时满足以下三个属性中的**两个**：

| 属性                            | 说明                   |
| :------------------------------ | :--------------------- |
| Consistency（一致性）           | 所有节点看到相同数据   |
| Availability（可用性）          | 每个请求都得到响应     |
| Partition tolerance（分区容忍） | 网络分区时系统继续运行 |

### 1.2 三种组合

| 组合 | 放弃     | 示例                         |
| :--- | :------- | :--------------------------- |
| CP   | 可用性   | ZooKeeper、HBase             |
| AP   | 一致性   | Cassandra、DynamoDB          |
| CA   | 分区容忍 | 单机数据库（不存在于分布式） |

### 1.3 现代理解

> "In a distributed system, you can't avoid network partitions, so the choice is really between CP and AP." — Martin Kleppmann

实际中网络分区不可避免，选择是在**分区发生时**优先保证一致性还是可用性。

## 2. 一致性模型

### 2.1 一致性级别

| 级别       | 说明                 | 示例         |
| :--------- | :------------------- | :----------- |
| 强一致性   | 写入后立即可读       | 关系数据库   |
| 顺序一致性 | 所有节点看到相同顺序 | ZooKeeper    |
| 因果一致性 | 因果关系的事件有序   | 因果时钟系统 |
| 最终一致性 | 最终所有节点一致     | DNS、Dynamo  |
| 读己之写   | 自己写入后自己可读   | 社交媒体     |

### 2.2 最终一致性变体

| 变体           | 保证             |
| :------------- | :--------------- |
| 读己之写一致性 | 写入者可立即读到 |
| 会话一致性     | 同一会话内一致   |
| 单调读一致性   | 不会读到旧数据   |
| 单调写一致性   | 写操作有序       |

## 3. BASE理论

### 3.1 BASE vs ACID

| 维度     | ACID     | BASE       |
| :------- | :------- | :--------- |
| 一致性   | 强一致   | 最终一致   |
| 可用性   | 可能牺牲 | 优先保证   |
| 隔离性   | 严格隔离 | 宽松隔离   |
| 适用场景 | 金融交易 | 互联网应用 |

### 3.2 BASE三要素

| 要素                  | 说明                   |
| :-------------------- | :--------------------- |
| Basically Available   | 基本可用，允许降级响应 |
| Soft State            | 软状态，允许中间状态   |
| Eventually Consistent | 最终一致，最终达到一致 |

## 4. 分布式共识

### 4.1 共识算法

| 算法  | 类型 | 容错                    | 适用场景     |
| :---- | :--- | :---------------------- | :----------- |
| Paxos | 理论 | $\lfloor(n-1)/2\rfloor$ | 理论基础     |
| Raft  | 实用 | $\lfloor(n-1)/2\rfloor$ | etcd、Consul |
| ZAB   | 实用 | $\lfloor(n-1)/2\rfloor$ | ZooKeeper    |

### 4.2 Raft算法

```
角色: Leader / Follower / Candidate

选举:
1. Follower超时 → 成为Candidate
2. 向其他节点请求投票
3. 获得多数票 → 成为Leader

日志复制:
1. 客户端请求 → Leader
2. Leader追加日志 → 复制到Follower
3. 多数确认 → 提交
```

## 5. 实践选择

| 场景     | 一致性选择 | 原因               |
| :------- | :--------- | :----------------- |
| 金融交易 | 强一致     | 资金安全           |
| 社交动态 | 最终一致   | 高可用优先         |
| 库存管理 | 强一致     | 超卖风险           |
| 购物车   | 最终一致   | 用户体验优先       |
| 配置中心 | 强一致     | 配置不一致导致故障 |
