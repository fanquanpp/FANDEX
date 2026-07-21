---
order: 54
title: Kubernetes核心资源
module: 'cloud-computing'
category: 'eng-infra'
difficulty: intermediate
description: 'Kubernetes核心资源：Pod、Service、Deployment、StatefulSet、ConfigMap 等详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/Kubernetes架构'
  - 'cloud-computing/云数据库服务'
  - 'cloud-computing/云存储服务'
  - 'cloud-computing/Kubernetes网络'
prerequisites:
  - 'cloud-computing/云计算基础'
---

## 1. Pod

### 1.1 Pod 概念

Pod 是 Kubernetes 最小调度单元，包含一个或多个容器，共享网络和存储。

### 1.2 Pod 生命周期

| 阶段      | 描述               |
| --------- | ------------------ |
| Pending   | 已创建，等待调度   |
| Running   | 已调度，容器运行中 |
| Succeeded | 容器正常退出       |
| Failed    | 容器异常退出       |
| Unknown   | 状态未知           |

### 1.3 Pod 配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 80
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
      livenessProbe:
        httpGet:
          path: /healthz
          port: 80
        initialDelaySeconds: 15
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 80
        initialDelaySeconds: 5
        periodSeconds: 5
      env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: database_host
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: app-data
```

### 1.4 探针类型

| 探针           | 用途     | 失败动作     |
| -------------- | -------- | ------------ |
| livenessProbe  | 存活检查 | 重启容器     |
| readinessProbe | 就绪检查 | 移出 Service |
| startupProbe   | 启动检查 | 杀死容器     |

## 2. Deployment

### 2.1 概念

管理无状态应用，维护 Pod 副本数和滚动更新。

### 2.2 配置示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deployment
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.25
          ports:
            - containerPort: 80
```

### 2.3 更新策略

| 策略          | 描述             |
| ------------- | ---------------- |
| RollingUpdate | 滚动更新（默认） |
| Recreate      | 先删后建         |

### 2.4 常用操作

```bash
# 查看滚动更新状态
kubectl rollout status deployment/web

# 查看历史版本
kubectl rollout history deployment/web

# 回滚
kubectl rollout undo deployment/web

# 回滚到指定版本
kubectl rollout undo deployment/web --to-revision=2

# 暂停/恢复更新
kubectl rollout pause deployment/web
kubectl rollout resume deployment/web
```

## 3. Service

### 3.1 概念

Service 为一组 Pod 提供稳定的访问入口和负载均衡。

### 3.2 Service 类型

| 类型         | 描述                | 访问范围 |
| ------------ | ------------------- | -------- |
| ClusterIP    | 集群内部 IP（默认） | 集群内   |
| NodePort     | 节点端口映射        | 集群外   |
| LoadBalancer | 云负载均衡器        | 互联网   |
| ExternalName | CNAME 映射          | DNS      |

### 3.3 配置示例

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
```

### 3.4 服务发现

```
# 集群内访问
web-service.default.svc.cluster.local

# 简写（同命名空间）
web-service
```

## 4. StatefulSet

### 4.1 概念

管理有状态应用，提供稳定的网络标识和持久化存储。

### 4.2 与 Deployment 区别

| 特性     | Deployment | StatefulSet |
| -------- | ---------- | ----------- |
| Pod 名称 | 随机后缀   | 有序编号    |
| 网络标识 | 不稳定     | 稳定 DNS    |
| 存储     | 共享       | 独立 PVC    |
| 扩缩容   | 随机顺序   | 有序        |
| 更新     | 随机顺序   | 逆序        |

### 4.3 配置示例

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ['ReadWriteOnce']
        resources:
          requests:
            storage: 10Gi
```

## 5. ConfigMap 与 Secret

### 5.1 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_host: 'mysql.default.svc.cluster.local'
  database_port: '3306'
  app.properties: |
    key1=value1
    key2=value2
```

### 5.2 Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: YWRtaW4= # base64(admin)
  password: cGFzc3dvcmQ= # base64(password)
```

> 注意：Secret 默认仅 Base64 编码，建议启用加密存储或使用外部密钥管理（Vault）。

## 6. DaemonSet 与 Job

### 6.1 DaemonSet

每个节点运行一个 Pod 副本，适用于日志采集、监控代理等。

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      containers:
        - name: fluentd
          image: fluentd:latest
```

### 6.2 Job 与 CronJob

```yaml
# 一次性任务
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
spec:
  completions: 1
  backoffLimit: 3
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:migrate
      restartPolicy: Never
```

```yaml
# 定时任务
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-backup
spec:
  schedule: '0 2 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: myapp:backup
          restartPolicy: OnFailure
```
