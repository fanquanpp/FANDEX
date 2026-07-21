---
order: 56
title: Kubernetes存储
module: 'cloud-computing'
category: 'eng-infra'
difficulty: intermediate
description: 'Kubernetes存储：PV、PVC、StorageClass、CSI 与数据持久化详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/Kubernetes网络'
  - 'cloud-computing/云网络服务'
  - 'cloud-computing/云安全服务'
  - 'cloud-computing/Helm包管理'
prerequisites:
  - 'cloud-computing/云计算基础'
---

## 1. 存储概述

### 1.1 存储分层

```
┌──────────────────────────┐
│     应用 (Pod)            │
├──────────────────────────┤
│     PVC (声明)            │
├──────────────────────────┤
│     PV (卷)               │
├──────────────────────────┤
│     StorageClass (类)     │
├──────────────────────────┤
│     CSI (驱动)            │
├──────────────────────────┤
│     后端存储              │
└──────────────────────────┘
```

### 1.2 存储类型

| 类型      | 描述     | 生命周期 |
| --------- | -------- | -------- |
| emptyDir  | 临时目录 | 随 Pod   |
| hostPath  | 节点路径 | 独立     |
| PV/PVC    | 持久卷   | 独立     |
| ConfigMap | 配置     | 独立     |
| Secret    | 敏感数据 | 独立     |

## 2. PV 与 PVC

### 2.1 PersistentVolume (PV)

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-nfs
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs
  nfs:
    server: 10.0.0.100
    path: /data/share
```

### 2.2 PersistentVolumeClaim (PVC)

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: fast-ssd
```

### 2.3 访问模式

| 模式             | 缩写 | 描述                 |
| ---------------- | ---- | -------------------- |
| ReadWriteOnce    | RWO  | 单节点读写           |
| ReadOnlyMany     | ROX  | 多节点只读           |
| ReadWriteMany    | RWX  | 多节点读写           |
| ReadWriteOncePod | RWOP | 单 Pod 读写（1.27+） |

### 2.4 回收策略

| 策略    | 描述                 |
| ------- | -------------------- |
| Retain  | 保留数据，需手动清理 |
| Delete  | 删除 PV 和后端存储   |
| Recycle | 已废弃               |

### 2.5 绑定流程

```
PVC 创建 → 控制器匹配 PV → 绑定 → Pod 使用 PVC
```

## 3. StorageClass

### 3.1 概念

StorageClass 定义存储"类"，支持动态供给。

### 3.2 配置示例

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iopsPerGB: '50'
  throughput: '250'
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

### 3.3 动态供给流程

```
PVC 创建（指定 StorageClass）→
  Provisioner 检测 →
    自动创建 PV →
      PVC 绑定 PV →
        Pod 使用
```

### 3.4 卷绑定模式

| 模式                 | 描述              |
| -------------------- | ----------------- |
| Immediate            | 立即绑定          |
| WaitForFirstConsumer | 等 Pod 调度后绑定 |

## 4. CSI（容器存储接口）

### 4.1 概念

CSI 是 Kubernetes 存储插件的标准接口，使存储供应商无需修改 Kubernetes 代码。

### 4.2 CSI 架构

```
Kubernetes → CSI Sidecar → CSI Driver → 存储后端
```

### 4.3 常见 CSI 驱动

| 驱动                      | 后端存储            |
| ------------------------- | ------------------- |
| ebs.csi.aws.com           | AWS EBS             |
| disk.csi.azure.com        | Azure Disk          |
| pd.csi.storage.gke.io     | GCP Persistent Disk |
| disk.csi.alibabacloud.com | 阿里云云盘          |
| csi-hostpath              | 本地存储（测试）    |
| ceph-csi                  | Ceph RBD/CephFS     |
| nfs.csi.k8s.io            | NFS                 |

## 5. 临时存储

### 5.1 emptyDir

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cache-pod
spec:
  containers:
    - name: app
      image: nginx
      volumeMounts:
        - name: cache
          mountPath: /cache
  volumes:
    - name: cache
      emptyDir:
        medium: Memory # 可选：使用内存
        sizeLimit: 256Mi
```

### 5.2 hostPath

```yaml
volumes:
  - name: data
    hostPath:
      path: /data/app
      type: DirectoryOrCreate
```

> 注意：hostPath 不推荐生产使用，存在安全和调度问题。

## 6. 存储最佳实践

| 实践                 | 描述             |
| -------------------- | ---------------- |
| 使用 PVC 而非直接 PV | 解耦应用与存储   |
| 使用 StorageClass    | 动态供给         |
| WaitForFirstConsumer | 避免跨区绑定     |
| 数据备份             | 定期快照         |
| 加密存储             | 启用加密         |
| 监控                 | 监控存储使用率   |
| 清理策略             | 合理设置回收策略 |
