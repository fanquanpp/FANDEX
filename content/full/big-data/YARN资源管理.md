---
order: 21
title: YARN资源管理
module: 'big-data'
category: data
difficulty: intermediate
description: YARN架构设计、ResourceManager/NodeManager机制、调度器对比、容器与队列管理。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'big-data/数据湖'
  - 'big-data/Zookeeper协调服务'
prerequisites: []
---

## 1. YARN架构设计

YARN（Yet Another Resource Negotiator）是 Hadoop 的**资源管理和任务调度框架**，将资源管理和作业调度解耦。

### 1.1 核心架构

```
┌──────────────────────────────────────────────────┐
│              ResourceManager                      │
│  ┌────────────────┐  ┌────────────────────────┐  │
│  │ Scheduler      │  │ ApplicationsManager    │  │
│  │ (调度器)       │  │ (应用管理器)           │  │
│  └────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────┘
         │                    │
    ┌────┴────┐          ┌───┴────┐
    ▼         ▼          ▼        ▼
┌────────┐┌────────┐┌────────┐┌────────┐
│NodeMgr ││NodeMgr ││NodeMgr ││NodeMgr │
│Container││Container││Container││Container│
│ AppMgr ││ AppMgr ││        ││        │
└────────┘└────────┘└────────┘└────────┘
```

### 1.2 核心组件

**ResourceManager（RM）**：

- 全局资源管理和调度
- **Scheduler**：纯调度，不负责应用监控
- **ApplicationsManager**：接收作业提交、启动AM

**NodeManager（NM）**：

- 单节点资源管理
- 向RM汇报节点资源（CPU、内存）和Container状态
- 启动/停止Container
- 监控Container资源使用

**ApplicationMaster（AM）**：

- 每个应用一个AM
- 向RM申请资源
- 与NM协作启动/监控Task
- 应用失败时负责重试

**Container**：

- YARN中资源分配的**基本单位**
- 封装CPU核数和内存大小
- 运行在NM上，由NM管理生命周期

### 1.3 作业执行流程

```
Client → RM(提交应用) → AM(启动) → RM(申请资源) → NM(启动Container)
  │                                                    │
  │              RM分配Container                        │
  │         ┌──────────────────┐                       │
  │         │ 1. Client提交应用 │                       │
  │         │ 2. RM分配AM容器  │                       │
  │         │ 3. AM启动并注册  │                       │
  │         │ 4. AM申请资源    │                       │
  │         │ 5. RM分配Container│                      │
  │         │ 6. AM通知NM启动  │                       │
  │         │ 7. Task运行      │                       │
  │         │ 8. AM注销       │                       │
  │         └──────────────────┘                       │
```

## 2. 调度器

### 2.1 FIFO调度器

```
队列: [Job1] → [Job2] → [Job3]
       先到先服务，简单但不公平
```

- 优点：实现简单
- 缺点：大作业阻塞小作业

### 2.2 Capacity调度器

```
┌────────────────────────────────────────┐
│              Root Queue                │
│  ┌──────────┐  ┌──────────┐  ┌──────┐│
│  │  dev(60%) │  │ test(20%)│  │prod  ││
│  │          │  │          │  │(20%) ││
│  │ ┌──┬──┐ │  │          │  │      ││
│  │ │d1│d2│ │  │          │  │      ││
│  │ └──┴──┘ │  │          │  │      ││
│  └──────────┘  └──────────┘  └──────┘│
└────────────────────────────────────────┘
```

- 每个队列保证**最低资源量**
- 队列空闲资源可被其他队列**临时借用**
- 支持**多级子队列**
- 支持**用户限制**（最大资源占比）

**关键配置**：

```xml
<configuration>
  <property>
    <name>yarn.scheduler.capacity.root.queues</name>
    <value>dev,test,prod</value>
  </property>
  <property>
    <name>yarn.scheduler.capacity.root.dev.capacity</name>
    <value>60</value>
  </property>
  <property>
    <name>yarn.scheduler.capacity.root.dev.maximum-capacity</name>
    <value>80</value>
  </property>
</configuration>
```

### 2.3 Fair调度器

```
时间T1: [Job1: 100%资源]
时间T2: [Job1: 50%, Job2: 50%]  ← Job2提交
时间T3: [Job1: 33%, Job2: 33%, Job3: 33%]  ← Job3提交
```

- 所有作业**公平共享**资源
- 短作业优先完成
- 支持**权重**配置
- 支持**最小资源保证**

### 2.4 调度器对比

| 维度       | FIFO     | Capacity       | Fair           |
| :--------- | :------- | :------------- | :------------- |
| 资源分配   | 先到先得 | 队列容量保证   | 公平共享       |
| 小作业     | 被阻塞   | 不被阻塞       | 快速完成       |
| 队列支持   | 无       | 多级队列       | 多级队列       |
| 资源利用率 | 低       | 中             | 高             |
| 配置复杂度 | 低       | 中             | 高             |
| 适用场景   | 测试     | 生产（多租户） | 生产（多用户） |

## 3. 资源模型与容器

### 3.1 资源维度

| 资源      | 说明       | 配置                                   |
| :-------- | :--------- | :------------------------------------- |
| Memory    | 内存（MB） | `yarn.nodemanager.resource.memory-mb`  |
| CPU VCore | 虚拟核     | `yarn.nodemanager.resource.cpu-vcores` |
| GPU       | GPU卡数    | `yarn.nodemanager.resource.gpus`       |

### 3.2 Container生命周期

```
NEW → LOCALIZED → RUNNING → EXITED → DONE
                ↑          │
                └── KILLED ←
```

| 状态      | 说明                    |
| :-------- | :---------------------- |
| NEW       | Container已分配，未启动 |
| LOCALIZED | 资源本地化完成          |
| RUNNING   | 正在运行                |
| EXITED    | 正常退出                |
| KILLED    | 被杀死                  |
| DONE      | 清理完成                |

### 3.3 资源申请与分配

AM 向 RM 申请资源的流程：

```
1. AM通过AMRMProtocol申请资源
   ├── ResourceRequest: <priority, hostname, capability, numContainers>
   └── 例如: <1, *, <4096MB, 2vcore>, 10>

2. Scheduler分配Container
   ├── 满足资源需求
   └── 考虑数据本地性

3. RM返回Container列表给AM

4. AM通知NM启动Container
   └── ContainerLaunchContext: 命令、环境变量、本地资源
```

**数据本地性优先级**：

$$\text{Node Local} > \text{Rack Local} > \text{Off Switch}$$

## 4. YARN高可用

### 4.1 RM高可用

```
┌────────────────┐     ┌────────────────┐
│  RM (Active)   │     │  RM (Standby)  │
│  处理客户端请求 │     │  接收状态同步   │
└───────┬────────┘     └───────┬────────┘
        │                      │
        └──────────┬───────────┘
                   ▼
          ┌────────────────┐
          │   ZooKeeper    │
          │  Leader选举    │
          └────────────────┘
```

**故障转移方式**：

- **手动转移**：`yarn rmadmin -transitionToStandby`
- **自动转移**：基于ZooKeeper的自动选举

### 4.2 关键配置

| 参数                                    | 说明      | 建议值         |
| :-------------------------------------- | :-------- | :------------- |
| `yarn.resourcemanager.ha.enabled`       | 启用HA    | true           |
| `yarn.resourcemanager.ha.rm-ids`        | RM ID列表 | rm1,rm2        |
| `yarn.resourcemanager.recovery.enabled` | 状态恢复  | true           |
| `yarn.resourcemanager.store.class`      | 状态存储  | ZKRMStateStore |

## 5. YARN调优

### 5.1 内存配置

$$\text{Container内存} = \text{Map内存} \text{ 或 } \text{Reduce内存}$$

$$\text{NM总内存} \geq \sum(\text{Container内存})$$

| 参数                                   | 说明         | 建议          |
| :------------------------------------- | :----------- | :------------ |
| `yarn.nodemanager.resource.memory-mb`  | NM可用总内存 | 物理内存的75% |
| `yarn.scheduler.minimum-allocation-mb` | 最小分配     | 512MB         |
| `yarn.scheduler.maximum-allocation-mb` | 最大分配     | NM总内存      |
| `yarn.nodemanager.vmem-pmem-ratio`     | 虚拟内存比   | 2.1           |

### 5.2 常见问题与解决

| 问题            | 原因         | 解决                        |
| :-------------- | :----------- | :-------------------------- |
| Container被Kill | 内存超限     | 增大Container内存或优化程序 |
| AM启动失败      | 资源不足     | 检查队列容量和最大分配      |
| 作业长时间等待  | 调度器排队   | 调整队列权重或优先级        |
| NM不健康        | 磁盘空间不足 | 清理磁盘或调整健康检查阈值  |
