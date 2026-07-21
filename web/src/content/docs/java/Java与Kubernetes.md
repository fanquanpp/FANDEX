---
order: 83
title: Java与Kubernetes
module: java
category: Java
difficulty: intermediate
description: Java云原生部署
author: fanquanpp
updated: '2026-06-14'
related:
  - java/Java与虚拟线程
  - java/Java与GraalVM
  - java/Java记录类
  - java/Java文本块
prerequisites:
  - java/概述与开发环境
---

## 概述

Kubernetes 是容器编排的事实标准，Java 应用的云原生部署需要关注资源限制、健康检查、优雅停机和自动伸缩等方面。本文介绍 Java 应用在 Kubernetes 上的部署最佳实践，包括 Deployment 配置、服务发现、配置管理和监控集成。

## 基础概念

### Kubernetes 核心资源

| 资源       | 说明                            |
| ---------- | ------------------------------- |
| Deployment | 管理无状态应用，控制 Pod 副本数 |
| Service    | 为 Pod 提供稳定的访问入口       |
| ConfigMap  | 存储非敏感配置信息              |
| Secret     | 存储敏感信息（密码、密钥）      |
| HPA        | 水平 Pod 自动伸缩器             |
| Ingress    | HTTP 路由和 TLS 终止            |

### Java 容器化关键点

- JVM 需要正确识别容器的 CPU 和内存限制
- 合理设置堆内存，避免 OOM Killed
- 配置健康检查端点
- 实现优雅停机，确保请求处理完成

## 快速上手

### Deployment 配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: registry.example.com/myapp:1.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
          env:
            - name: JAVA_OPTS
              value: '-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC'
            - name: SPRING_PROFILES_ACTIVE
              value: 'prod'
```

### Service 与 Ingress

```yaml
# Service：集群内部访问
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP

---
# Ingress：外部访问入口
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
spec:
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-service
                port:
                  number: 80
```

## 详细用法

### 健康检查

```yaml
# 配置存活和就绪探针
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          # 存活探针：检测应用是否卡死
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
            failureThreshold: 3
          # 就绪探针：检测应用是否就绪
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
```

```java
// Spring Boot 健康检查端点
@RestController
@RequestMapping("/actuator/health")
public class HealthController {
    @GetMapping("/liveness")
    public Map<String, String> liveness() {
        return Map.of("status", "UP");
    }

    @GetMapping("/readiness")
    public Map<String, String> readiness() {
        // 检查数据库连接等依赖是否就绪
        boolean dbReady = dataSource.getConnection().isValid(1);
        return Map.of("status", dbReady ? "UP" : "DOWN");
    }
}
```

### 配置管理

```yaml
# ConfigMap：存储配置
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  application.yml: |
    server:
      port: 8080
    spring:
      datasource:
        url: jdbc:postgresql://db-service:5432/mydb
    logging:
      level:
        com.example: DEBUG

---
# Secret：存储敏感信息
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secret
type: Opaque
data:
  db-password: c2VjcmV0 # base64 编码
  api-key: YXBpLWtleQ==
```

```yaml
# 在 Deployment 中引用配置
spec:
  containers:
    - name: myapp
      envFrom:
        - configMapRef:
            name: myapp-config
        - secretRef:
            name: myapp-secret
      volumeMounts:
        - name: config-volume
          mountPath: /config
  volumes:
    - name: config-volume
      configMap:
        name: myapp-config
```

### 优雅停机

```yaml
# 配置优雅停机
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60 # 最多等待 60 秒
      containers:
        - name: myapp
          lifecycle:
            preStop:
              exec:
                command: ['sh', '-c', 'sleep 10'] # 等待 Service 摘除
```

```yaml
# Spring Boot 优雅停机配置
# application.yml
server:
  shutdown: graceful # 启用优雅停机
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s # 最多等待 30 秒
```

## 常见场景

### HPA 自动伸缩

```yaml
# 基于 CPU 使用率自动伸缩
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300 # 缩容冷却期 5 分钟
    scaleUp:
      stabilizationWindowSeconds: 60
```

### Spring Cloud Kubernetes 服务发现

```yaml
# 使用 Kubernetes 原生服务发现替代 Eureka
# pom.xml 添加依赖
# spring-cloud-starter-kubernetes-client

# application.yml
spring:
  cloud:
    kubernetes:
      discovery:
        enabled: true
      config:
        enabled: true
        sources:
          - name: myapp-config
```

## 注意事项

- JVM 内存设置必须小于容器内存限制，留出堆外内存空间
- 使用 MaxRAMPercentage 代替硬编码 Xmx，适配不同规格的 Pod
- 初始延迟（initialDelaySeconds）应大于应用启动时间
- 优雅停机的超时时间应小于 terminationGracePeriodSeconds
- ConfigMap 更新后需要重启 Pod 才能生效，或使用 Spring Cloud Kubernetes 动态刷新
- 生产环境建议使用 PodDisruptionBudget 保证最小可用副本数

## 进阶用法

### Init Container 初始化

```yaml
# 使用 Init Container 等待依赖服务就绪
spec:
  initContainers:
    - name: wait-for-db
      image: busybox
      command: ['sh', '-c', 'until nc -z db-service 5432; do echo waiting for db; sleep 2; done']
    - name: wait-for-redis
      image: busybox
      command:
        ['sh', '-c', 'until nc -z redis-service 6379; do echo waiting for redis; sleep 2; done']
  containers:
    - name: myapp
      image: myapp:latest
```

### PodPreset 与 PodTemplate

```yaml
# 使用 PodDisruptionBudget 保证服务可用性
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  minAvailable: 2 # 至少保持 2 个 Pod 可用
  selector:
    matchLabels:
      app: myapp
```

### GraalVM Native Image 部署

```yaml
# Native Image 镜像部署，资源需求更低
spec:
  containers:
    - name: myapp-native
      image: myapp-native:latest
      resources:
        requests:
          memory: '64Mi' # Native Image 内存需求极低
          cpu: '100m'
        limits:
          memory: '128Mi'
          cpu: '500m'
      # Native Image 启动极快，缩短初始延迟
      livenessProbe:
        httpGet:
          path: /actuator/health/liveness
          port: 8080
        initialDelaySeconds: 5
```
