---
order: 20
title: Zookeeper协调服务
module: 'big-data'
category: data
difficulty: intermediate
description: ZooKeeper架构、ZAB协议、Watcher机制、Leader选举与分布式协调应用。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'big-data/Flink流处理'
  - 'big-data/数据湖'
  - 'big-data/YARN资源管理'
prerequisites: []
---

## 1. ZooKeeper架构

ZooKeeper 是一个**分布式协调服务**，为分布式应用提供一致性管理、配置维护、组服务和命名等功能。

### 1.1 集群架构

```
┌──────────────────────────────────────────┐
│              Client                       │
└──────┬──────────┬──────────┬─────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐┌──────────┐┌──────────┐
│ Leader   ││Follower  ││Follower  │
│ (读写)   ││ (读+转发)││ (读+转发)│
│ 事务处理 ││ 投票参与 ││ 投票参与 │
└──────────┘└──────────┘└──────────┘
       │          │          │
       └──────────┼──────────┘
                  ▼
         ┌──────────────┐
         │  Quorum      │
         │  过半协议     │
         └──────────────┘
```

### 1.2 核心概念

| 概念        | 说明                                |
| :---------- | :---------------------------------- |
| **ZNode**   | 数据节点，类似文件系统中的文件/目录 |
| **zxid**    | 事务ID，全局单调递增，标识操作顺序  |
| **epoch**   | Leader周期号，每次选举递增          |
| **Quorum**  | 法定人数，集群半数以上节点          |
| **Session** | 客户端与服务器之间的会话            |

### 1.3 数据模型

ZooKeeper 的数据模型是**树形命名空间**，每个节点（ZNode）可以存储数据（默认1MB上限）：

```
/
├── services
│   ├── service-a
│   │   └── instance-1  (data: "host1:8080")
│   │   └── instance-2  (data: "host2:8080")
│   └── service-b
├── config
│   └── db-config       (data: "jdbc:mysql://...")
└── leaders
    └── job-leader      (data: "node-3")
```

**ZNode类型**：

| 类型         | 说明                         | 创建方式             |
| :----------- | :--------------------------- | :------------------- |
| 持久节点     | 持久存储，客户端断开后不删除 | `create /path`       |
| 临时节点     | 客户端会话结束自动删除       | `create -e /path`    |
| 持久顺序节点 | 持久 + 自动递增序号后缀      | `create -s /path`    |
| 临时顺序节点 | 临时 + 自动递增序号后缀      | `create -s -e /path` |
| 容器节点     | 最后一个子节点删除后自动删除 | `create -c /path`    |
| TTL节点      | 超时未修改自动删除           | `create -t /path`    |

## 2. ZAB协议

ZAB（ZooKeeper Atomic Broadcast）是 ZooKeeper 的**核心一致性协议**，保证所有事务按顺序广播到所有节点。

### 2.1 协议状态

```
                ┌──────────┐
                │ LOOKING  │ ← 选举中
                └────┬─────┘
                     │ 选举完成
            ┌────────┴────────┐
            ▼                 ▼
     ┌────────────┐    ┌────────────┐
     │ FOLLOWING  │    │ LEADING    │
     │ 跟随Leader │    │ 成为Leader │
     └────────────┘    └────────────┘
```

### 2.2 消息广播（Broadcast）

Leader 将客户端请求转化为**事务提案（Proposal）**，通过两阶段提交广播：

```
Leader                Follower1    Follower2
  │                       │            │
  │── Proposal(zxid) ──→│            │
  │── Proposal(zxid) ──────────────→│
  │                       │            │
  │←── ACK(zxid) ───────│            │
  │←── ACK(zxid) ───────────────────│
  │                       │            │
  │  过半ACK，提交        │            │
  │── Commit(zxid) ────→│            │
  │── Commit(zxid) ────────────────→│
```

**关键保证**：

- 所有事务按 **zxid 顺序**提交
- 过半节点ACK即可提交（不需要全部）
- Leader崩溃时，已完成的事务不会丢失

### 2.3 崩溃恢复（Recovery）

当Leader崩溃或失去过半Follower时，进入崩溃恢复模式：

1. **选举阶段**：所有节点进入LOOKING状态，选举新Leader
2. **发现阶段**：新Leader与Follower同步事务日志
3. **同步阶段**：确保所有节点数据一致
4. **广播阶段**：新Leader开始处理客户端请求

**选举约束**：

- 新Leader必须拥有**最完整的**事务日志（最大zxid）
- 已提交的事务不能丢失
- 未提交的事务需要被丢弃

### 2.4 zxid结构

$$\text{zxid} = \text{epoch} \ll 32 \mid \text{counter}$$

| 部分    | 位数   | 说明           |
| :------ | :----- | :------------- |
| epoch   | 高32位 | Leader周期号   |
| counter | 低32位 | 周期内事务计数 |

每次Leader选举，epoch递增，counter归零。

## 3. Watcher机制

Watcher 是 ZooKeeper 的**事件通知机制**，客户端可以在ZNode上注册监听器，当ZNode发生变化时收到通知。

### 3.1 事件类型

| 事件                | 触发条件    | 注册方法                   |
| :------------------ | :---------- | :------------------------- |
| NodeCreated         | ZNode被创建 | exists                     |
| NodeDeleted         | ZNode被删除 | exists/getData/getChildren |
| NodeDataChanged     | 数据变更    | exists/getData             |
| NodeChildrenChanged | 子节点变更  | getChildren                |

### 3.2 Watcher特性

- **一次性触发**：Watcher触发后自动失效，需要重新注册
- **有序性**：事件按zxid顺序触发，客户端看到的事件顺序与服务器一致
- **轻量级**：通知只包含事件类型，不包含变更后的数据

```java
// 注册Watcher
zk.exists("/config", new Watcher() {
    @Override
    public void process(WatchedEvent event) {
        if (event.getType() == EventType.NodeDataChanged) {
            // 重新读取数据并重新注册Watcher
            byte[] data = zk.getData("/config", this, null);
        }
    }
});
```

## 4. Leader选举

### 4.1 选举算法（FastLeaderElection）

```
每个节点投票: (self_id, self_zxid)

Round 1:
  Node1 投票: (1, zxid_1) → 发送给所有节点
  Node2 投票: (2, zxid_2) → 发送给所有节点
  Node3 投票: (3, zxid_3) → 发送给所有节点

比较规则:
  1. 比较 epoch（大的优先）
  2. 比较 zxid（大的优先）
  3. 比较 myid（大的优先）

假设 zxid_3 > zxid_2 > zxid_1:
  Node1 收到 (2,zxid_2) → 更新投票为 (2,zxid_2)
  Node1 收到 (3,zxid_3) → 更新投票为 (3,zxid_3)
  Node2 收到 (3,zxid_3) → 更新投票为 (3,zxid_3)

  Node3 获得过半投票 → 成为Leader
```

### 4.2 分布式锁实现

利用**临时顺序节点**实现公平锁：

```
1. 在 /locks 下创建临时顺序节点 → /locks/lock-0000000001
2. 获取 /locks 下所有子节点并排序
3. 如果自己是最小节点 → 获得锁
4. 如果不是 → Watch前一个节点的删除事件
5. 前一个节点删除 → 重新检查是否获得锁
6. 释放锁：删除自己的临时节点
```

```java
public class DistributedLock {
    private final ZooKeeper zk;
    private final String lockPath = "/locks";
    private String currentLock;

    public void lock() throws Exception {
        // 创建临时顺序节点
        currentLock = zk.create(lockPath + "/lock-",
            new byte[0], ZooDefs.Ids.OPEN_ACL_UNSAFE,
            CreateMode.EPHEMERAL_SEQUENTIAL);

        // 获取所有子节点
        List<String> children = zk.getChildren(lockPath, false);
        Collections.sort(children);

        // 检查是否是最小节点
        String currentNode = currentLock.substring(lockPath.length() + 1);
        int index = children.indexOf(currentNode);

        if (index == 0) {
            return; // 获得锁
        }

        // 等待前一个节点删除
        String prevNode = lockPath + "/" + children.get(index - 1);
        final CountDownLatch latch = new CountDownLatch(1);
        zk.exists(prevNode, event -> {
            if (event.getType() == EventType.NodeDeleted) {
                latch.countDown();
            }
        });
        latch.await();
    }

    public void unlock() throws Exception {
        zk.delete(currentLock, -1);
    }
}
```

## 5. 典型应用场景

| 场景           | 实现方式           | 说明                               |
| :------------- | :----------------- | :--------------------------------- |
| 服务注册与发现 | 临时节点 + Watcher | 服务上线创建临时节点，下线自动删除 |
| 分布式锁       | 临时顺序节点       | 公平锁实现                         |
| 配置中心       | 持久节点 + Watcher | 配置变更通知                       |
| Leader选举     | 临时节点           | 主备切换                           |
| 命名服务       | 顺序节点           | 全局唯一ID生成                     |
| 集群管理       | 临时节点           | 成员管理与存活检测                 |
