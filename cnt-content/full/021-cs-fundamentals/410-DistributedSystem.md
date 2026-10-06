---
order: 440
title: 分布式系统
module: 'cs-fundamentals'
category: 计算机科学
difficulty: advanced
description: 分布式系统：CAP定理、一致性模型、共识算法、分布式事务与容错机制；文末附 Raft 选举可视化与仲裁读写实验
author: fanquanpp
updated: '2026-10-05'
related:
  - 'cs-fundamentals/130-BusAndInterface'
  - 'cs-fundamentals/140-ParallelComputing'
  - 'cs-fundamentals/520-AlgorithmDesignAnalysis'
  - 'cs-fundamentals/530-FormalLanguageAndAutomata'
prerequisites:
  - 'cs-fundamentals/010-ComputerOverview'
---


## 知识点地图

- **知识类别**：分布式系统理论——多节点协作时的权衡科学（CAP、一致性、
  共识、容错）。
- **解决什么问题**：单机有上限且会宕机，把状态复制到多台机器后，
  网络分区、时钟偏差、部分失效让「看起来简单」的操作（如选一个主节点、
  两次读同一个值）变成难题。
- **什么时候用到**：设计多副本存储与缓存集群、理解 Redis Cluster 与
  Kafka 的分区复制行为、做技术选型时判断「强一致还是可用」、
  面试必考的 CAP/ Raft 问答。

## 1. 分布式系统基础

### 1.1 分布式系统特征

- **并发性**：多个节点同时执行
- **无全局时钟**：节点间时钟存在偏差
- **独立故障**：节点可能独立故障
- **不可靠网络**：消息可能延迟、丢失、重复、乱序

### 1.2 分布式系统目标

| 目标     | 说明                       |
| -------- | -------------------------- |
| 可扩展性 | 水平扩展，增加节点提升性能 |
| 容错性   | 部分节点故障不影响整体     |
| 一致性   | 数据副本之间保持一致       |
| 可用性   | 系统始终可响应             |
| 透明性   | 用户无需感知分布式细节     |

## 2. CAP 定理

### 2.1 三者定义

- **一致性（Consistency）**：所有节点在同一时刻看到相同的数据
- **可用性（Availability）**：每个请求都能在合理时间内收到非错误响应
- **分区容错性（Partition Tolerance）**：网络分区时系统仍能运行

### 2.2 CAP 权衡

CAP 定理指出：在网络分区发生时，只能在 C 和 A 之间选择：

$$\text{CAP} \implies \text{网络分区时：C 和 A 不可兼得}$$

| 选择 | 系统               | 示例                |
| ---- | ------------------ | ------------------- |
| CP   | 牺牲可用性         | ZooKeeper、HBase    |
| AP   | 牺牲一致性         | Cassandra、DynamoDB |
| CA   | 不允许分区（单机） | 传统RDBMS           |

### 2.3 BASE 理论

BASE 是 AP 系统的实践准则：

- **Basically Available**：基本可用，允许响应延迟或功能降级
- **Soft State**：软状态，允许中间状态
- **Eventually Consistent**：最终一致性，数据最终达到一致

## 3. 一致性模型

### 3.1 强一致性模型

**线性一致性（Linearizability）**：

- 每个操作看起来在某个时间点原子性完成
- 所有操作的全序与实时顺序一致
- 实现代价最高

**顺序一致性（Sequential Consistency）**：

- 所有进程看到的操作顺序一致
- 但不要求与实时顺序一致

### 3.2 弱一致性模型

**因果一致性**：有因果关系的操作顺序一致，无因果关系的操作可乱序。

**最终一致性**：如果没有新的更新，最终所有副本会收敛到相同值。

**读己之写（RYOW）**：一个进程写入后，自己后续的读能看到该写入。

### 3.3 一致性模型层级

```
线性一致性
    ↓ (弱于)
顺序一致性
    ↓
因果一致性
    ↓
FIFO一致性
    ↓
最终一致性
```

## 4. 共识算法

### 4.1 共识问题

共识要求：多个节点对某个值达成一致。

**FLP 不可能定理**：在异步系统中，即使只有一个节点可能故障，也不存在确定性共识算法。

**实践方案**：通过超时和随机化绕过 FLP 限制。

### 4.2 Paxos

**Basic Paxos**：三类角色——Proposer、Acceptor、Learner。

执行流程：

```
Phase 1 (Prepare):
  Proposer → Acceptor: Prepare(n)
  Acceptor → Proposer: Promise(n, accepted_value)

Phase 2 (Accept):
  Proposer → Acceptor: Accept(n, value)
  Acceptor → Proposer: Accepted(n, value)
```

**Multi-Paxos**：优化版，选举 Leader 后省略 Prepare 阶段。

### 4.3 Raft

Raft 将共识分解为三个子问题：

**Leader 选举**：

- 节点状态：Follower → Candidate → Leader
- 任期（Term）递增，每个任期最多一个 Leader
- 获得多数票的 Candidate 成为 Leader

**日志复制**：

```
Client → Leader: 请求
Leader → Followers: AppendEntries
Followers → Leader: 确认
Leader → Client: 响应
```

**安全性**：

- 选举限制：Candidate 的日志至少与多数节点一样新
- Leader 完整性：已提交的日志不会丢失

**Raft vs Paxos**：

| 特性     | Raft         | Paxos           |
| -------- | ------------ | --------------- |
| 理解难度 | 低           | 高              |
| Leader   | 强 Leader    | 无固定 Leader   |
| 日志管理 | 简单         | 复杂            |
| 实际应用 | etcd, Consul | Chubby, Spanner |

### 4.4 ZAB（ZooKeeper Atomic Broadcast）

ZooKeeper 使用的共识协议，类似 Raft：

-崩溃恢复模式：Leader 选举

- 消息广播模式：类似 2PC 的日志复制

## 5. 分布式事务

### 5.1 两阶段提交（2PC）

```
Phase 1 (Prepare):
  Coordinator → Participants: "准备提交"
  Participants → Coordinator: "同意" 或 "中止"

Phase 2 (Commit/Abort):
  Coordinator → Participants: "提交" 或 "中止"
```

**问题**：

- 同步阻塞：参与者持有锁等待
- 单点故障：Coordinator 故障导致阻塞
- 数据不一致：Phase 2 部分参与者未收到决定

### 5.2 三阶段提交（3PC）

增加 PreCommit 阶段，减少阻塞：

```
Phase 1: CanCommit
Phase 2: PreCommit
Phase 3: DoCommit
```

**超时机制**：参与者在 PreCommit 后超时自动提交。

3PC 仍无法完全避免数据不一致（网络分区场景）。

### 5.3 TCC（Try-Confirm-Cancel）

业务层面的分布式事务：

```
Try:    预留资源
Confirm: 确认提交
Cancel:  取消预留
```

需要业务实现三个接口，侵入性强但灵活性高。

### 5.4 SAGA 模式

将长事务拆分为多个本地事务，每个本地事务有对应的补偿操作：

```
T1 → T2 → T3 → ... → Tn
如果 Tk 失败：
Ck-1 → Ck-2 → ... → C1  (反向补偿)
```

**前向恢复**：重试失败的步骤。
**后向恢复**：执行补偿操作。

### 5.5 分布式事务对比

| 方案 | 一致性   | 性能 | 侵入性 | 适用场景   |
| ---- | -------- | ---- | ------ | ---------- |
| 2PC  | 强一致   | 低   | 低     | 数据库层面 |
| 3PC  | 强一致   | 低   | 低     | 理论改进   |
| TCC  | 最终一致 | 中   | 高     | 资金交易   |
| SAGA | 最终一致 | 高   | 中     | 长流程业务 |

## 6. 容错与恢复

### 6.1 故障模型

| 故障类型   | 表现     | 检测难度 |
| ---------- | -------- | -------- |
| 崩溃故障   | 节点停止 | 容易     |
| 遗漏故障   | 丢失消息 | 中等     |
| 时序故障   | 响应超时 | 中等     |
| 拜占庭故障 | 任意行为 | 困难     |

### 6.2 拜占庭容错（BFT）

节点可能发送错误信息，需要 $3f+1$ 个节点容忍 $f$ 个拜占庭节点。

**PBFT 算法**：

```
Client → Primary: 请求
Primary → Replicas: Pre-prepare
Replicas → Replicas: Prepare (2f+1 确认)
Replicas → Replicas: Commit (2f+1 确认)
Replicas → Client: 回复
```

### 6.3 心跳与故障检测

**心跳机制**：节点定期发送心跳，超时未收到则认为故障。

$$\text{超时时间} = \text{基础超时} + \text{网络抖动余量}$$

**Phi Accrual 故障检测器**：使用概率模型，输出故障概率 $\phi$：

$$\phi = -\log_{10}(1 - F(t))$$

其中 $F(t)$ 为心跳间隔的累积分布函数。

### 6.4 副本与数据冗余

**主从复制**：一个主副本接受写入，同步到从副本。

**多主复制**：多个副本接受写入，需解决写冲突。

**无主复制**：任何副本可接受写入，通过仲裁（Quorum）保证一致性：

$$\begin{cases} W + R > N \\ W > N/2 \end{cases}$$

其中 $N$ 为副本总数，$W$ 为写仲裁，$R$ 为读仲裁。

## 动手实践

**任务**：用 Python 多进程模拟一个 3 节点 Raft 集群的「脑裂与仲裁」，
亲手验证两个论断——少数派分区内无法选出主、W+R>N 保证读到新值。

1. 用 3 个进程代表 3 个节点，进程间用管道或本地 UDP 互发消息；
2. 实现最简选举：节点随机超时后自荐（RequestVote），收到过半（2/3）选票者成为 leader，每 100ms 广播心跳；
3. 用防火墙规则或直接在消息层丢包模拟「分区」：切断节点 3 与其他节点的通信；
4. 观察节点 1、2 选出新 leader，节点 3 自荐永远得不到 2 票；
5. 实现 W=2/R=2 的仲裁读写：向 leader 写入后，故意从旧 leader（分区期间残留）读取，验证读不到未复制的值。

**提示**：不要真实现 Raft 日志复制，只保留「过半票数」这一个核心不变量；
随机超时建议在 150-300ms 之间抖动，固定超时会导致三个节点同时自荐活锁；
消息丢包直接在发送函数里按目标节点过滤即可，不必动防火墙。

<details>
<summary>参考实现骨架（先自己写，再展开对照）</summary>

```python
# raft_mock.py —— 每个节点一个进程，UDP 通信，只验证过半选举
import socket, random, threading, time

N, PEERS = 3, [("127.0.0.1", 9100 + i) for i in range(3)]
PARTITION = {2}                        # 节点 2 被隔离（收不到也发不出）

def node(me):
    addr = PEERS[me]
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(addr)
    state, votes, term = "follower", set(), 0
    while True:
        try:
            msg, _ = s.recvfrom(256)
            tag, t = msg.decode().split(":")
            if tag == "VOTE":
                votes.add(t)
                if len(votes) >= N // 2 + 1 and state != "leader":
                    state = "leader"   # 过半 -> 当选
                    print(f"node{me} LEADER term{t}")
        except socket.timeout:
            pass
        if state == "follower" and random.random() < 0.02:
            term += 1                  # 简化：概率性触发自荐
            state = "candidate"; votes = {str(me)}
            for i, p in enumerate(PEERS):
                if i not in PARTITION and i != me:
                    s.sendto(f"VOTE:{term}".encode(), p)
        time.sleep(0.05)

for i in range(N):
    threading.Thread(target=node, args=(i,), daemon=True).start()
time.sleep(5)
```

**逐段讲解**：`N // 2 + 1` 就是仲裁数——本文第 6 节 Quorum 公式
`W > N/2` 的整数形式；`PARTITION` 集合在发送与接收两端同时过滤，
模拟网络分区是「双向不可达」；活锁规避靠 `random.random()` 的抖动，
真实 Raft 用随机化选举超时是同一个目的。本骨架没有实现日志复制与
任期比较，请把它当作「验证过半不变量」的最小实验，而不是 Raft 教程。

</details>
