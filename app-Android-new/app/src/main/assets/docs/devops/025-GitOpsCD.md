---
order: 250
title: GitOps 与持续交付
module: 'devops'
category: 云与基础设施
difficulty: advanced
description: GitOps与持续交付：ArgoCD、Flux、渐进式交付与发布策略
author: fanquanpp
updated: '2026-08-01'
related:
  - 'devops/023-Troubleshooting'
  - 'devops/024-ContainerSecurity'
  - 'devops/026-MonitorAndAlert'
  - 'devops/027-NetworkSecurityAdvanced'
prerequisites:
  - 'devops/001-OverviewLinuxBasics'
---


## 1. GitOps 原则

### 1.1 核心原则

1. **声明式**：系统描述是声明式的
2. **版本控制**：期望状态存储在 Git
3. **自动拉取**：自动应用期望状态
4. **持续协调**：持续确保一致性

### 1.2 Push vs Pull 模式

| 模式 | 触发方式       | 安全性       | 适用场景   |
| ---- | -------------- | ------------ | ---------- |
| Push | CI 推送部署    | 需要凭证     | 传统 CI/CD |
| Pull | Agent 拉取变更 | 凭证在集群内 | GitOps     |

## 2. ArgoCD

### 2.1 核心概念

```mermaid
flowchart LR
    G[Git 仓库] --> A[ArgoCD] --> K[Kubernetes 集群]
    K -.->|状态同步| G
```

### 2.2 Application 配置

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/k8s-manifests.git
    targetRevision: main
    path: overlays/production
    helm:
      valueFiles:
        - values-prod.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### 2.3 App of Apps 模式

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: apps
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/argocd-apps.git
    path: apps
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
```

### 2.4 ApplicationSet

多集群/多环境自动生成 Application：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp
spec:
  generators:
    - git:
        repoURL: https://github.com/org/k8s-manifests.git
        files:
          - path: 'clusters/**/config.json'
  template:
    metadata:
      name: '{{cluster_name}}-myapp'
    spec:
      source:
        repoURL: https://github.com/org/k8s-manifests.git
        targetRevision: '{{branch}}'
        path: overlays/{{overlay}}
      destination:
        server: '{{server}}'
        namespace: myapp
```

## 3. Flux

### 3.1 核心组件

| 组件                    | 功能                 |
| ----------------------- | -------------------- |
| source-controller       | 管理 Git/Helm/OCI 源 |
| kustomize-controller    | Kustomize 构建       |
| helm-controller         | Helm 发布            |
| notification-controller | 通知                 |
| image-automation        | 自动镜像更新         |

### 3.2 基本配置

```yaml
# Git 仓库源
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/org/k8s-manifests.git
  ref:
    branch: main
---
# Kustomize 部署
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: myapp
  path: ./overlays/production
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: default
```

### 3.3 自动镜像更新

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myapp
spec:
  image: registry/myapp
  interval: 1m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp
spec:
  imageRepositoryRef:
    name: myapp
  policy:
    semver:
      range: '^1.x'
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: myapp
spec:
  sourceRef:
    kind: GitRepository
    name: myapp
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxbot
        email: fluxbot@example.com
      messageTemplate: 'Update image to {{ .Image }}'
    push:
      branch: main
  interval: 1m
```

## 4. 渐进式交付

### 4.1 Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - setWeight: 30
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 80
        - pause: { duration: 5m }
      canaryService: myapp-canary
      stableService: myapp-stable
      trafficRouting:
        istio:
          virtualServices:
            - name: myapp-vsvc
              routes:
                - primary
      analysis:
        templates:
          - templateName: success-rate
        args:
          - name: service-name
            value: myapp-canary
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status!~"5.."}[5m]))
            /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
      successCondition: result[0] >= 0.99
      interval: 30s
      count: 10
```

### 4.2 Flagger

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: load-test
        url: http://flagger-loadtester/
        timeout: 5s
        metadata:
          cmd: 'hey -z 1m -q 10 -c 2 http://myapp:8080/'
```

### 4.3 发布策略对比

| 策略     | 流量切换 | 回滚速度 | 资源开销  | 风险 |
| -------- | -------- | -------- | --------- | ---- |
| 滚动更新 | 逐步     | 中       | 低        | 中   |
| 蓝绿部署 | 一次性   | 快       | 高（2倍） | 低   |
| 金丝雀   | 渐进     | 快       | 中        | 低   |
| 影子测试 | 复制流量 | 即时     | 高        | 最低 |

## 5. 多环境管理

### 5.1 环境隔离

```mermaid
flowchart TD
    T0["Git 仓库结构："]
    T1["base/                    # 基础配置"]
    T2["kustomization.yaml"]
    T3["deployment.yaml"]
    T4["overlays/"]
    T5["development/         # 开发环境"]
    T6["staging/             # 预发布"]
    T7["production/          # 生产"]
    T8["apps/"]
    T9["dev.yaml             # ArgoCD Application"]
    T10["staging.yaml"]
    T11["prod.yaml"]
    T0 --> T1
    T3 --> T4
    T7 --> T8
    T8 --> T9
    T8 --> T10
    T8 --> T11
```

### 5.2 促销流程（Promotion）

```mermaid
flowchart LR
    D[开发环境] -->|合并到 dev 分支| S[预发布环境]
    S -->|合并到 staging 分支| P[生产环境]
    P -->|合并到 main 分支| P
```

### 5.3 配置差异管理

| 方法               | 说明       | 适用场景   |
| ------------------ | ---------- | ---------- |
| Kustomize overlays | 覆盖差异   | 简单差异   |
| Helm values        | 值文件差异 | Helm 项目  |
| 环境变量           | 运行时注入 | 通用       |
| 配置中心           | 动态配置   | 需要热更新 |
