---
order: 53
title: Kubernetes架构
module: 'cloud-computing'
category: 'eng-infra'
difficulty: intermediate
description: 'Kubernetes核心架构：控制平面、节点组件、etcd、API Server 等详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/Docker深度解析'
  - 'cloud-computing/云原生应用'
  - 'cloud-computing/云数据库服务'
  - 'cloud-computing/Kubernetes核心资源'
prerequisites:
  - 'cloud-computing/云计算基础'
---

## 1. Kubernetes 整体架构

### 1.1 架构图

```
┌──────────────────── 控制平面 ────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │API Server │ │Scheduler │ │Controller│        │
│  │          │ │          │ │ Manager  │        │
│  └────┬─────┘ └──────────┘ └──────────┘        │
│       │                                          │
│  ┌────┴─────┐                                   │
│  │  etcd    │                                   │
│  └──────────┘                                   │
└──────────────────────────────────────────────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
┌─────────┐   ┌─────────┐
│  Node 1 │   │  Node 2 │
│ ┌─────┐ │   │ ┌─────┐ │
│ │kubelet│ │   │ │kubelet│ │
│ └─────┘ │   │ └─────┘ │
│ ┌─────┐ │   │ ┌─────┐ │
│ │Proxy │ │   │ │Proxy │ │
│ └─────┘ │   │ └─────┘ │
│ ┌─────┐ │   │ ┌─────┐ │
│ │ Pods │ │   │ │ Pods │ │
│ └─────┘ │   │ └─────┘ │
└─────────┘   └─────────┘
```

### 1.2 设计理念

| 理念       | 描述                       |
| ---------- | -------------------------- |
| 声明式 API | 描述期望状态，系统自动趋近 |
| 控制循环   | 持续观测并调和状态         |
| 松耦合     | 组件间通过 API 通信        |
| 可扩展     | CRD、Operator、插件        |

## 2. 控制平面组件

### 2.1 API Server

集群的统一入口，所有操作都通过 API Server 进行。

**核心功能**：

- RESTful API 网关
- 认证、授权、准入控制
- 数据验证与持久化
- Watch 机制（变更通知）

**请求流程**：

```
请求 → 认证 → 授权 → 准入控制 → 验证 → etcd 持久化 → 响应
```

### 2.2 etcd

分布式键值存储，Kubernetes 的唯一状态存储。

| 特性   | 描述            |
| ------ | --------------- |
| 一致性 | Raft 共识协议   |
| Watch  | 监听键值变化    |
| 事务   | Compare-and-Set |
| TTL    | 键值过期        |

**运维要点**：

- 奇数节点（3/5/7）
- SSD 存储
- 独立部署
- 定期备份

### 2.3 Scheduler

负责将 Pod 调度到合适的节点。

**调度流程**：

```
1. 过滤（Filter）：排除不满足条件的节点
2. 评分（Score）：对可行节点打分
3. 绑定（Bind）：将 Pod 绑定到最高分节点
```

**调度策略**：

| 策略            | 描述                          |
| --------------- | ----------------------------- |
| 节点选择器      | `nodeSelector`                |
| 节点亲和性      | `nodeAffinity`                |
| Pod 亲和/反亲和 | `podAffinity/podAntiAffinity` |
| 污点与容忍      | `taints/tolerations`          |
| 资源限制        | CPU/内存请求与限制            |

### 2.4 Controller Manager

运行各种控制器，每个控制器是一个控制循环。

| 控制器                     | 功能            |
| -------------------------- | --------------- |
| Deployment Controller      | 管理 ReplicaSet |
| ReplicaSet Controller      | 维护 Pod 副本数 |
| Node Controller            | 节点健康监测    |
| Job Controller             | 一次性任务      |
| Endpoints Controller       | Service 端点    |
| Service Account Controller | 服务账户        |

## 3. 节点组件

### 3.1 kubelet

节点上的代理，负责 Pod 的生命周期管理。

**核心职责**：

- Pod 创建与销毁
- 容器健康检查
- 资源使用上报
- Volume 挂载

### 3.2 kube-proxy

维护网络规则，实现 Service 的负载均衡。

**代理模式**：

| 模式      | 描述          | 性能         |
| --------- | ------------- | ------------ |
| iptables  | iptables 规则 | 中           |
| IPVS      | IPVS 负载均衡 | 高           |
| userspace | 用户空间代理  | 低（已弃用） |

### 3.3 容器运行时

| 运行时     | 特点            |
| ---------- | --------------- |
| containerd | 默认推荐        |
| CRI-O      | 轻量级          |
| Docker     | 已弃用（1.24+） |

## 4. API 对象与资源

### 4.1 核心资源

| 资源        | API 组     | 描述               |
| ----------- | ---------- | ------------------ |
| Pod         | core       | 最小调度单元       |
| Service     | core       | 服务发现与负载均衡 |
| ConfigMap   | core       | 配置管理           |
| Secret      | core       | 敏感数据           |
| Namespace   | core       | 资源隔离           |
| Deployment  | apps       | 无状态应用         |
| StatefulSet | apps       | 有状态应用         |
| DaemonSet   | apps       | 每节点一个 Pod     |
| Job         | batch      | 一次性任务         |
| CronJob     | batch      | 定时任务           |
| Ingress     | networking | HTTP 路由          |
| PV/PVC      | storage    | 持久化存储         |

### 4.2 声明式管理

```yaml
# 期望状态
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
```

## 5. 高可用架构

### 5.1 控制平面 HA

```
┌─────────────────────────────────┐
│        负载均衡器 (LB)           │
└───────┬─────────┬───────────────┘
        │         │
   ┌────▼───┐ ┌──▼────┐ ┌───────┐
   │Master 1│ │Master2│ │Master3│
   │(leader)│ │(follower)│ │(follower)│
   └────────┘ └───────┘ └───────┘
```

### 5.2 etcd HA

- 3 节点容忍 1 节点故障
- 5 节点容忍 2 节点故障
- 使用 Raft 协议选举 Leader
