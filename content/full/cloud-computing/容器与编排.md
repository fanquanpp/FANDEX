---
order: 3
title: 容器与编排
module: 'cloud-computing'
category: 云计算
difficulty: intermediate
description: 'Docker 容器技术、Kubernetes 编排、Helm 包管理与容器镜像仓库。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/云计算基础'
  - 'cloud-computing/云网络与存储'
  - 'cloud-computing/基础设施即代码'
  - 'cloud-computing/IaaS与PaaS与SaaS'
prerequisites: []
---

## 1. Docker 容器技术

### 1.1 Docker 核心概念

| 概念           | 说明                             |
| :------------- | :------------------------------- |
| **镜像**       | 只读模板，包含运行应用所需的一切 |
| **容器**       | 镜像的运行实例，隔离的进程       |
| **Dockerfile** | 构建镜像的指令文件               |
| **Registry**   | 镜像仓库，存储和分发镜像         |
| **Volume**     | 数据卷，持久化容器数据           |
| **Network**    | 容器网络，容器间通信             |

### 1.2 Dockerfile 编写

```dockerfile
# 多阶段构建 - Node.js 应用
# 阶段1: 构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# 阶段2: 运行
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 非 root 用户
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### 1.3 Dockerfile 最佳实践

| 实践              | 说明               |
| :---------------- | :----------------- |
| **多阶段构建**    | 减小最终镜像体积   |
| **使用 Alpine**   | 基础镜像选择精简版 |
| **合并 RUN 指令** | 减少镜像层数       |
| **.dockerignore** | 排除不需要的文件   |
| **非 root 运行**  | 安全性考虑         |
| **固定版本标签**  | 避免使用 latest    |

```dockerfile
# 合并 RUN 指令减少层数
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    rm -rf /var/lib/apt/lists/*
```

### 1.4 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U app -d myapp']
      interval: 10s
      timeout: 5s
      retries: 5
    secrets:
      - db_password

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app

volumes:
  pgdata:
  redisdata:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### 1.5 常用 Docker 命令

```bash
# 镜像操作
docker build -t myapp:v1 .              # 构建镜像
docker images                            # 列出镜像
docker push registry/myapp:v1           # 推送镜像
docker rmi myapp:v1                     # 删除镜像

# 容器操作
docker run -d -p 3000:3000 --name app myapp:v1  # 运行容器
docker ps                                # 运行中的容器
docker logs -f app                       # 查看日志
docker exec -it app sh                   # 进入容器
docker stop app && docker rm app         # 停止并删除

# Compose 操作
docker compose up -d                     # 启动所有服务
docker compose down -v                   # 停止并删除（含数据卷）
docker compose logs -f app               # 跟踪日志
docker compose ps                        # 服务状态
```

## 2. Kubernetes 编排

### 2.1 K8s 核心概念

```
┌──────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  Control Plane                      │  │
│  │  API Server │ etcd │ Scheduler │ Controller Mgr    │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Node 1     │  │   Node 2     │  │   Node 3     │   │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │   │
│  │ │ Pod A    │ │  │ │ Pod C    │ │  │ │ Pod E    │ │   │
│  │ │ Pod B    │ │  │ │ Pod D    │ │  │ │ Pod F    │ │   │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │   │
│  │  kubelet     │  │  kubelet     │  │  kubelet     │   │
│  │  kube-proxy  │  │  kube-proxy  │  │  kube-proxy  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Pod

```yaml
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
    app: myapp
    tier: frontend
spec:
  containers:
    - name: app
      image: registry/myapp:v1
      ports:
        - containerPort: 3000
      resources:
        requests:
          memory: '256Mi'
          cpu: '250m'
        limits:
          memory: '512Mi'
          cpu: '500m'
      env:
        - name: NODE_ENV
          value: 'production'
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
      livenessProbe:
        httpGet:
          path: /health
          port: 3000
        initialDelaySeconds: 15
        periodSeconds: 20
      readinessProbe:
        httpGet:
          path: /ready
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 10
    - name: log-sidecar
      image: fluent/fluentd:latest
      volumeMounts:
        - name: log-volume
          mountPath: /var/log/app
  volumes:
    - name: log-volume
      emptyDir: {}
```

### 2.3 Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-deployment
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1 # 滚动更新时最多多出1个Pod
      maxUnavailable: 0 # 滚动更新时不允许不可用
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: registry/myapp:v2
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
```

### 2.4 Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80 # Service 端口
      targetPort: 3000 # Pod 端口
  type: ClusterIP # 集群内部访问
```

| Service 类型     | 说明                        | 适用场景     |
| :--------------- | :-------------------------- | :----------- |
| **ClusterIP**    | 集群内部 IP（默认）         | 内部服务通信 |
| **NodePort**     | 节点端口映射（30000-32767） | 开发测试     |
| **LoadBalancer** | 云商负载均衡器              | 生产对外服务 |
| **ExternalName** | CNAME 映射到外部域名        | 外部服务引用 |

### 2.5 Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/rate-limit: '100'
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: tls-secret
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: myapp-v1-service
                port:
                  number: 80
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: myapp-v2-service
                port:
                  number: 80
```

### 2.6 ConfigMap 与 Secret

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: 'production'
  LOG_LEVEL: 'info'
  MAX_CONNECTIONS: '100'
  app.json: |
    {
      "theme": "dark",
      "language": "zh-CN"
    }

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: YWRtaW4= # base64("admin")
  password: cGFzc3dvcmQxMjM= # base64("password123")
stringData:
  connection-string: 'postgresql://admin:password123@db:5432/myapp'
```

### 2.7 HPA 自动伸缩

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp-deployment
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
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

### 2.8 常用 kubectl 命令

```bash
# 资源查看
kubectl get pods -A                          # 所有命名空间的 Pod
kubectl get deploy,svc,ing -n production     # 查看多种资源
kubectl describe pod myapp-pod               # Pod 详情
kubectl logs -f deployment/myapp -c app      # 跟踪日志

# 资源操作
kubectl apply -f deployment.yaml             # 应用配置
kubectl delete -f deployment.yaml            # 删除资源
kubectl scale deployment myapp --replicas=5  # 手动扩缩容

# 调试
kubectl exec -it myapp-pod -- sh             # 进入容器
kubectl port-forward svc/myapp 8080:80       # 端口转发
kubectl top pods                             # 资源使用

# 滚动更新
kubectl set image deployment/myapp app=registry/myapp:v3
kubectl rollout status deployment/myapp
kubectl rollout undo deployment/myapp        # 回滚
```

## 3. Helm 包管理

### 3.1 Helm Chart 结构

```
myapp-chart/
├── Chart.yaml          # Chart 元数据
├── values.yaml         # 默认配置值
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   ├── _helpers.tpl    # 模板辅助函数
│   └── NOTES.txt       # 安装后说明
├── charts/             # 依赖 Chart
└── .helmignore
```

### 3.2 Chart.yaml

```yaml
apiVersion: v2
name: myapp
description: My Application Helm Chart
type: application
version: 1.2.3 # Chart 版本
appVersion: '2.3.1' # 应用版本
dependencies:
  - name: postgresql
    version: '14.x.x'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: postgresql.enabled
  - name: redis
    version: '18.x.x'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: redis.enabled
```

### 3.3 values.yaml

```yaml
# 镜像配置
image:
  repository: registry/myapp
  tag: '2.3.1'
  pullPolicy: IfNotPresent

# 副本数
replicaCount: 3

# 资源限制
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

# Service 配置
service:
  type: ClusterIP
  port: 80

# Ingress 配置
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: tls-secret
      hosts:
        - api.example.com

# 自动伸缩
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

# 依赖开关
postgresql:
  enabled: true
redis:
  enabled: true
```

### 3.4 Helm 常用命令

```bash
# 添加仓库
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# 安装/升级
helm install myapp ./myapp-chart -n production
helm upgrade myapp ./myapp-chart -n production
helm upgrade --install myapp ./myapp-chart -n production -f values-prod.yaml

# 查看
helm list -n production
helm status myapp -n production
helm history myapp -n production

# 回滚
helm rollback myapp 1 -n production

# 卸载
helm uninstall myapp -n production
```

## 4. 容器镜像仓库

### 4.1 仓库类型

| 类型         | 产品             | 特点       |
| :----------- | :--------------- | :--------- |
| **公有仓库** | Docker Hub、GHCR | 免费、公开 |
| **云商仓库** | ECR、ACR、Harbor | 集成、安全 |
| **私有仓库** | Harbor、Nexus    | 完全自控   |

### 4.2 Harbor 私有仓库

```bash
# Docker 登录私有仓库
docker login harbor.example.com

# 镜像标签与推送
docker tag myapp:v1 harbor.example.com/project/myapp:v1
docker push harbor.example.com/project/myapp:v1

# 拉取镜像
docker pull harbor.example.com/project/myapp:v1

# K8s 使用私有仓库
kubectl create secret docker-registry harbor-secret \
  --docker-server=harbor.example.com \
  --docker-username=admin \
  --docker-password=Harbor12345 \
  -n production
```

### 4.3 镜像安全扫描

```bash
# Trivy 扫描
trivy image harbor.example.com/project/myapp:v1

# 扫描严重漏洞
trivy image --severity HIGH,CRITICAL harbor.example.com/project/myapp:v1

# CI 中集成扫描
trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:v1
```

### 4.4 镜像标签策略

| 标签         | 说明                       | 示例            |
| :----------- | :------------------------- | :-------------- |
| **Git SHA**  | 精确对应代码版本           | `sha-abc1234`   |
| **语义版本** | 正式发布版本               | `v2.3.1`        |
| **分支名**   | 开发分支构建               | `main-20260614` |
| **latest**   | 最新构建（不推荐生产使用） | `latest`        |
