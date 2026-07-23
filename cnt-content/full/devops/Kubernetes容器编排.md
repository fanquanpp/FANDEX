---
order: 4
title: Kubernetes
module: devops
category: 运维
difficulty: advanced
description: 'K8s 架构、核心资源、存储、网络策略、Helm 与 Operator 模式。'
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/网络与安全
  - devops/容器与Docker
  - 'devops/CI-CD流水线'
  - devops/语法速查
prerequisites: []
---

## 1. Kubernetes 架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   Control Plane                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ API Server│ │Scheduler │ │ Controller Manager   │ │
│  └──────────┘ └──────────┘ └──────────────────────┘ │
│  ┌──────────┐                                       │
│  │   etcd   │  ← 集群状态存储                        │
│  └──────────┘                                       │
└─────────────────────────────────────────────────────┘
         │                │
    ┌────┴────┐     ┌────┴────┐
    ↓         ↓     ↓         ↓
┌────────┐┌────────┐┌────────┐┌────────┐
│ Node 1 ││ Node 2 ││ Node 3 ││ Node N │
│┌──────┐││┌──────┐││┌──────┐││┌──────┐│
││kubelet││││kubelet││││kubelet││││kubelet││
│├──────┤││├──────┤││├──────┤││├──────┤│
││Proxy ││││Proxy ││││Proxy ││││Proxy ││
│├──────┤││├──────┤││├──────┤││├──────┤│
││Pods  ││││Pods  ││││Pods  ││││Pods  ││
│└──────┘││└──────┘││└──────┘││└──────┘│
└────────┘└────────┘└────────┘└────────┘
```

### 1.2 核心组件

| 组件                   | 职责                                 |
| :--------------------- | :----------------------------------- |
| **API Server**         | 集群入口，RESTful API                |
| **etcd**               | 分布式 KV 存储，保存集群状态         |
| **Scheduler**          | Pod 调度到 Node                      |
| **Controller Manager** | 控制器（Deployment/ReplicaSet/Node） |
| **kubelet**            | 节点代理，管理 Pod 生命周期          |
| **kube-proxy**         | 网络代理，Service 转发               |

## 2. 核心资源

### 2.1 Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
  labels:
    app: web
    version: v1
spec:
  containers:
    - name: web
      image: nginx:1.25-alpine
      ports:
        - containerPort: 80
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
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
          port: 80
        initialDelaySeconds: 15
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 80
        initialDelaySeconds: 5
        periodSeconds: 5
      volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
  volumes:
    - name: config
      configMap:
        name: app-config
  restartPolicy: Always
```

### 2.2 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: myapp:v2
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

### 2.3 Service

```yaml
# ClusterIP（集群内部访问）
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

---
# NodePort（节点端口暴露）
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080

---
# LoadBalancer（云厂商负载均衡）
apiVersion: v1
kind: Service
metadata:
  name: web-lb
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
```

### 2.4 Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/rate-limit: '100'
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - example.com
      secretName: example-tls
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

## 3. ConfigMap 与 Secret

### 3.1 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  # 键值对
  DATABASE_HOST: 'postgres.default.svc.cluster.local'
  DATABASE_PORT: '5432'
  LOG_LEVEL: 'info'
  # 完整配置文件
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://web-service:8080;
      }
    }
```

### 3.2 Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  # Base64 编码
  username: YWRtaW4= # admin
  password: c2VjcmV0MTIz # secret123
stringData:
  # 明文（创建时自动编码）
  api-key: 'my-api-key-12345'
```

```bash
# 创建 Secret
kubectl create secret generic db-secret \
  --from-literal=username=admin \
  --from-literal=password=secret123

# 从文件创建
kubectl create secret generic tls-secret \
  --from-file=tls.crt=./cert.pem \
  --from-file=tls.key=./key.pem
```

## 4. 自动扩缩容

### 4.1 HPA（水平扩缩容）

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-deployment
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

### 4.2 VPA（垂直扩缩容）

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-deployment
  updatePolicy:
    updateMode: Auto # Off / Initial / Recreate / Auto
  resourcePolicy:
    containerPolicies:
      - containerName: web
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: '2'
          memory: 2Gi
```

## 5. 存储

### 5.1 PV 与 PVC

```yaml
# PersistentVolume
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: nfs-server.default.svc.cluster.local
    path: /data/share

---
# PersistentVolumeClaim
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: standard
```

### 5.2 StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iopsPerGB: '50'
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## 6. 网络策略

```yaml
# 默认拒绝所有入站
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress

---
# 允许特定 Pod 访问
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

## 7. Helm

### 7.1 Chart 结构

```
mychart/
├── Chart.yaml          # Chart 元数据
├── values.yaml         # 默认值
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── _helpers.tpl    # 模板辅助函数
│   └── NOTES.txt       # 安装说明
└── .helmignore
```

### 7.2 Chart.yaml

```yaml
apiVersion: v2
name: myapp
description: My Application Helm Chart
type: application
version: 1.0.0
appVersion: '2.0.0'
dependencies:
  - name: postgresql
    version: '14.x.x'
    repository: 'https://charts.bitnami.com/bitnami'
    condition: postgresql.enabled
```

### 7.3 values.yaml

```yaml
replicaCount: 3

image:
  repository: myapp
  pullPolicy: IfNotPresent
  tag: '2.0.0'

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

postgresql:
  enabled: true
  auth:
    database: myapp
    username: app
    password: changeme
```

### 7.4 Helm 命令

```bash
# 仓库管理
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# 安装/升级
helm install myapp ./mychart                    # 本地 Chart
helm install myapp bitnami/nginx                # 仓库 Chart
helm upgrade myapp ./mychart --set replicaCount=5  # 升级
helm upgrade --install myapp ./mychart -f values-prod.yaml  # 安装或升级

# 管理
helm list                                       # 列出发布
helm status myapp                               # 查看状态
helm rollback myapp 1                           # 回滚
helm uninstall myapp                            # 卸载

# 调试
helm template myapp ./mychart                   # 渲染模板
helm lint ./mychart                             # 检查 Chart
helm diff upgrade myapp ./mychart               # 查看变更（需插件）
```

## 8. Operator 模式

### 8.1 Operator 原理

Operator = CRD（自定义资源） + Controller（控制器逻辑），将运维知识编码为软件。

```
┌─────────────────────────────────────┐
│            Operator                  │
│  ┌─────────┐    ┌───────────────┐   │
│  │   CRD    │    │  Controller   │   │
│  │ 自定义资源│←──│  协调循环      │   │
│  └─────────┘    │  (Reconcile)  │   │
│                 └───────────────┘   │
└─────────────────────────────────────┘
```

### 8.2 CRD 定义

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: webapps.apps.example.com
spec:
  group: apps.example.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 100
                image:
                  type: string
  scope: Namespaced
  names:
    plural: webapps
    singular: webapp
    kind: WebApp
    shortNames:
      - wa
```

### 8.3 常用 Operator

| Operator                | 功能           | 适用场景     |
| :---------------------- | :------------- | :----------- |
| **Prometheus Operator** | 管控监控栈     | 可观测性     |
| **Cert Manager**        | 证书管理       | TLS 自动化   |
| **ArgoCD**              | GitOps 部署    | 持续交付     |
| **MySQL Operator**      | MySQL 集群管理 | 数据库运维   |
| **Kafka Operator**      | Kafka 集群管理 | 消息队列运维 |

## 9. 常用 kubectl 命令

```bash
# 资源查看
kubectl get pods -A                        # 所有命名空间的 Pod
kubectl get pods -o wide                   # 详细信息
kubectl get all -n production              # 命名空间所有资源
kubectl describe pod web-app               # 详细描述
kubectl top pods                           # 资源使用

# 调试
kubectl logs -f web-app                    # 查看日志
kubectl logs web-app -c sidecar            # 指定容器
kubectl exec -it web-app -- bash           # 进入容器
kubectl port-forward svc/web 8080:80       # 端口转发

# 资源管理
kubectl apply -f deployment.yaml           # 应用配置
kubectl delete -f deployment.yaml          # 删除资源
kubectl scale deployment web --replicas=5  # 扩缩容
kubectl rollout restart deployment web     # 重启
kubectl rollout undo deployment web        # 回滚
kubectl rollout status deployment web      # 查看状态

# 上下文管理
kubectl config get-contexts
kubectl config use-context prod-cluster
```

## 10. 小结

Kubernetes 是容器编排的事实标准：

1. **架构**理解 Control Plane 和 Node 组件的职责是排障基础
2. **核心资源**（Pod/Deployment/Service/Ingress）覆盖了大部分应用场景
3. **ConfigMap/Secret** 管理配置和敏感信息，避免硬编码
4. **HPA/VPA** 实现自动扩缩容，应对流量波动
5. **Helm** 是 K8s 应用的包管理器，简化部署和管理
6. **Operator** 将运维知识编码化，适合有状态应用
