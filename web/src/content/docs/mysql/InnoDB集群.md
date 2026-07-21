---
order: 84
title: 'InnoDB-Cluster'
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL InnoDB Cluster与InnoDB ClusterSet：MySQL Shell、MGR、MySQL Router集成高可用方案'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/并行复制
  - mysql/组复制
  - mysql/分区表
  - mysql/分库分表中间件
prerequisites:
  - mysql/语法速查
---

## 1. InnoDB Cluster 概述

InnoDB Cluster 是 MySQL 官方的高可用方案，整合三个组件：

| 组件                             | 作用               |
| -------------------------------- | ------------------ |
| MySQL Server + Group Replication | 数据复制与一致性   |
| MySQL Router                     | 读写路由与故障转移 |
| MySQL Shell                      | 管理与配置工具     |

## 2. 部署

### 2.1 使用 MySQL Shell 创建集群

```javascript
// 连接主节点
mysqlsh root@node1:3306

// 创建集群
var cluster = dba.createCluster('myCluster');

// 添加实例
cluster.addInstance('root@node2:3306');
cluster.addInstance('root@node3:3306');

// 查看集群状态
cluster.status();
```

### 2.2 配置 MySQL Router

```bash
# 引导 Router
mysqlrouter --bootstrap root@node1:3306 --user=mysqlrouter

# 启动 Router
systemctl start mysqlrouter

# 应用连接 Router
# 读写端口：6446（指向主节点）
# 只读端口：6447（指向从节点）
mysql -h 127.0.0.1 -P 6446 -u root -p  # 读写
mysql -h 127.0.0.1 -P 6447 -u root -p  # 只读
```

## 3. InnoDB ClusterSet

### 3.1 概述

ClusterSet 将多个 InnoDB Cluster 连接起来，提供跨数据中心的高可用和灾难恢复。

```javascript
// 创建 ClusterSet
var clusterset = dba.createClusterSet('myClusterSet');

// 添加副本集群
clusterset.createReplicaCluster('root@replica-node1:3306', 'replicaCluster');

// 查看状态
clusterset.status();
```

### 3.2 故障切换

```javascript
// 强制切换到副本集群
clusterset.forcePrimaryCluster('replicaCluster');
```
