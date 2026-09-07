---
order: 380
title: GitOps 与 ArgoCD
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: GitOps 与 ArgoCD 持续交付：声明式基础设施、Git 单一事实来源与自动同步。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'devops/036-ELKStackLogAnalysis'
  - 'devops/037-OpenTelemetry'
prerequisites:
  - 'devops/001-OverviewLinuxBasics'
---

## 1. GitOps 原则

### 1.1 声明式描述

声明式描述是GitOps与ArgoCD的重要组成部分。本节详细介绍声明式描述的核心概念、工作原理和实际应用。

**关键要点**：

- 声明式描述的定义与核心原理
- 声明式描述的实现方式与技术细节
- 声明式描述在实际场景中的应用与最佳实践
- 声明式描述的常见问题与解决方案

声明式描述在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 1.2 Git 单一事实来源

Git 单一事实来源是GitOps与ArgoCD的重要组成部分。本节详细介绍Git 单一事实来源的核心概念、工作原理和实际应用。

**关键要点**：

- Git 单一事实来源的定义与核心原理
- Git 单一事实来源的实现方式与技术细节
- Git 单一事实来源在实际场景中的应用与最佳实践
- Git 单一事实来源的常见问题与解决方案

Git 单一事实来源在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 1.3 自动化交付

自动化交付是GitOps与ArgoCD的重要组成部分。本节详细介绍自动化交付的核心概念、工作原理和实际应用。

**关键要点**：

- 自动化交付的定义与核心原理
- 自动化交付的实现方式与技术细节
- 自动化交付在实际场景中的应用与最佳实践
- 自动化交付的常见问题与解决方案

自动化交付在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 2. ArgoCD 架构

### 2.1 核心组件

核心组件是GitOps与ArgoCD的重要组成部分。本节详细介绍核心组件的核心概念、工作原理和实际应用。

**关键要点**：

- 核心组件的定义与核心原理
- 核心组件的实现方式与技术细节
- 核心组件在实际场景中的应用与最佳实践
- 核心组件的常见问题与解决方案

核心组件在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.2 Application CRD

Application CRD是GitOps与ArgoCD的重要组成部分。本节详细介绍Application CRD的核心概念、工作原理和实际应用。

**关键要点**：

- Application CRD的定义与核心原理
- Application CRD的实现方式与技术细节
- Application CRD在实际场景中的应用与最佳实践
- Application CRD的常见问题与解决方案

Application CRD在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 3. 同步策略

### 3.1 自动同步

自动同步是GitOps与ArgoCD的重要组成部分。本节详细介绍自动同步的核心概念、工作原理和实际应用。

**关键要点**：

- 自动同步的定义与核心原理
- 自动同步的实现方式与技术细节
- 自动同步在实际场景中的应用与最佳实践
- 自动同步的常见问题与解决方案

自动同步在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.2 手动同步

手动同步是GitOps与ArgoCD的重要组成部分。本节详细介绍手动同步的核心概念、工作原理和实际应用。

**关键要点**：

- 手动同步的定义与核心原理
- 手动同步的实现方式与技术细节
- 手动同步在实际场景中的应用与最佳实践
- 手动同步的常见问题与解决方案

手动同步在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.3 Sync Hook

Sync Hook是GitOps与ArgoCD的重要组成部分。本节详细介绍Sync Hook的核心概念、工作原理和实际应用。

**关键要点**：

- Sync Hook的定义与核心原理
- Sync Hook的实现方式与技术细节
- Sync Hook在实际场景中的应用与最佳实践
- Sync Hook的常见问题与解决方案

Sync Hook在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 4. 多环境管理

### 4.1 App of Apps 模式

App of Apps 模式是GitOps与ArgoCD的重要组成部分。本节详细介绍App of Apps 模式的核心概念、工作原理和实际应用。

**关键要点**：

- App of Apps 模式的定义与核心原理
- App of Apps 模式的实现方式与技术细节
- App of Apps 模式在实际场景中的应用与最佳实践
- App of Apps 模式的常见问题与解决方案

App of Apps 模式在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 4.2 ApplicationSet

ApplicationSet是GitOps与ArgoCD的重要组成部分。本节详细介绍ApplicationSet的核心概念、工作原理和实际应用。

**关键要点**：

- ApplicationSet的定义与核心原理
- ApplicationSet的实现方式与技术细节
- ApplicationSet在实际场景中的应用与最佳实践
- ApplicationSet的常见问题与解决方案

ApplicationSet在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。
## 应用管理

**基本用法:创建应用**
`argocd app create <应用名> --repo <仓库> --path <路径> --dest-server <集群> --dest-namespace <命名空间>`

```bash
# 从 Git 仓库创建应用
argocd app create web-app \
  --repo https://github.com/org/repo.git \
  --path manifests/web \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production

# 从 Helm Chart 创建应用
argocd app create helm-app \
  --repo https://github.com/org/charts.git \
  --path charts/nginx \
  --helm-chart nginx \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production
```

---

**基本用法:查看应用列表**
`argocd app list`

```bash
# 列出所有应用
argocd app list

# 按命名空间筛选
argocd app list -A | grep production

# 输出 JSON 格式
argocd app list -o json | jq '.[].metadata.name'
```

---

**基本用法:查看应用详情**
`argocd app get <应用名>`

```bash
# 查看应用配置与同步状态
argocd app get web-app

# 查看应用完整 YAML
argocd app get web-app -o yaml

# 查看应用状态简报
argocd app get web-app --show-params
```

---

**基本用法:删除应用**
`argocd app delete <应用名>`

```bash
# 删除应用(保留集群中的资源)
argocd app delete web-app

# 级联删除(同时删除集群中资源)
argocd app delete web-app --cascade

# 强制删除
argocd app delete web-app --yes
```

---

## 同步操作

**基本用法:手动同步应用**
`argocd app sync <应用名>`

```bash
# 同步应用
argocd app sync web-app

# 同步指定修订版
argocd app sync web-app --revision=v1.2.0

# 同步前先刷新 Git
argocd app sync web-app --refresh

# 干运行(仅显示变更不执行)
argocd app sync web-app --dry-run
```

---

**基本用法:选择性同步**
`argocd app sync <应用名> --resource <资源>`

```bash
# 仅同步指定资源
argocd app sync web-app --resource deployment:web

# 仅同步指定资源类型
argocd app sync web-app --resource Deployment

# 排除某些资源同步
argocd app sync web-app --resource '!Service'

# 应用同步前钩子
argocd app sync web-app --apply-out-of-sync-only
```

---

**基本用法:同步策略**
`argocd app set <应用名> --sync-policy <策略>`

```bash
# 设置自动同步
argocd app set web-app --sync-policy automated

# 自动同步时自动修剪资源
argocd app set web-app --auto-prune

# 自动同步时自愈(防止手动修改)
argocd app set web-app --self-heal

# 禁用自动同步
argocd app set web-app --sync-policy none
```

---

**基本用法:查看同步状态**
`argocd app sync <应用名> --dry-run`

```bash
# 查看同步差异
argocd app diff web-app

# 查看与指定版本的差异
argocd app diff web-app --revision=HEAD

# 查看本地文件与应用差异
argocd app diff web-app --local=manifests/
```

---

## 应用配置

**基本用法:修改应用参数**
`argocd app set <应用名> [选项]`

```bash
# 设置 Helm 参数
argocd app set web-app --helm-set image.tag=v1.2.0

# 设置 Helm 参数(从文件)
argocd app set web-app --values values-production.yaml

# 设置 Kustomize 镜像
argocd app set web-app --kustomize-image web=nginx:1.25

# 修改目标命名空间
argocd app set web-app --dest-namespace staging
```

---

**基本用法:查看应用参数**
`argocd app get <应用名> --show-params`

```bash
# 显示应用所有参数
argocd app get web-app --show-params

# 查看应用 manifests
argocd app manifests web-app

# 查看应用历史
argocd app history web-app
```

---

**基本用法:回滚应用**
`argocd app rollback <应用名> <版本号>`

```bash
# 查看历史版本
argocd app history web-app

# 回滚到指定版本
argocd app rollback web-app 3

# 回滚后禁用自动同步(避免被自动同步回去)
argocd app set web-app --sync-policy none
```

---

## 仓库与项目

**基本用法:添加仓库**
`argocd repo add <仓库URL>`

```bash
# 添加 Git 仓库
argocd repo add https://github.com/org/repo.git --username user --password pass

# 添加私有仓库(SSH)
argocd repo add git@github.com:org/repo.git --ssh-private-key-path ~/.ssh/id_rsa

# 添加 HTTPS 仓库(带凭据)
argocd repo add https://github.com/org/repo.git --username ci --password $GITHUB_TOKEN
```

---

**基本用法:查看仓库**
`argocd repo list`

```bash
# 列出已配置的仓库
argocd repo list

# 测试仓库连接
argocd repo list -o json | jq '.[].repo'

# 查看仓库详情
argocd repo get https://github.com/org/repo.git
```

---

**基本用法:管理项目**
`argocd proj create <项目名>`

```bash
# 创建项目
argocd proj create my-project \
  --dest https://kubernetes.default.svc,production \
  --src https://github.com/org/repo.git

# 添加允许的目标集群
argocd proj add-destination my-project https://kubernetes.default.svc staging

# 添加允许的源仓库
argocd proj add-source my-project https://github.com/org/another-repo.git

# 查看项目列表
argocd proj list
```

---

**基本用法:项目角色与令牌**
`argocd proj role create <项目> <角色>`

```bash
# 创建项目角色
argocd proj role create my-project ci-role

# 添加策略(允许操作应用)
argocd proj role add-policy my-project ci-role \
  --action '*' --resource '*' --permission allow

# 生成角色令牌
argocd proj role create-token my-project ci-role

# 查看角色
argocd proj role get my-project ci-role
```

---

## 集群管理

**基本用法:添加集群**
`argocd cluster add <上下文名>`

```bash
# 添加当前 kubectl 上下文对应的集群
argocd cluster add my-cluster

# 添加集群到指定命名空间
argocd cluster add my-cluster --name prod-cluster -n argocd

# 添加外部集群(通过 kubeconfig)
argocd cluster add prod-cluster --kubeconfig /path/to/kubeconfig
```

---

**基本用法:查看集群**
`argocd cluster list`

```bash
# 列出所有注册的集群
argocd cluster list

# 查看集群详情
argocd cluster get https://kubernetes.default.svc

# 查看集群名称
argocd cluster list -o json | jq '.[].name'
```

---

## 账户与认证

**基本用法:登录 ArgoCD**
`argocd login <服务器地址>`

```bash
# 登录(交互式)
argocd login argocd.example.com

# 使用用户名密码登录
argocd login argocd.example.com --username admin --password $ARGOCD_PASS

# 跳过 TLS 验证(测试环境)
argocd login argocd.example.com --username admin --password $ARGOCD_PASS --insecure
```

---

**基本用法:管理账户**
`argocd account list`

```bash
# 列出所有账户
argocd account list

# 查看当前用户
argocd account get-user-info

# 修改密码
argocd account update-password

# 生成 API 令牌
argocd account generate-token
```

---

**基本用法:RBAC 配置**
`argocd account get-user-info`

```bash
# 查看当前用户权限
argocd account get-user-info

# 查看项目角色绑定
argocd proj role list my-project

# 通过 ConfigMap 编辑 RBAC 规则
kubectl edit configmap argocd-rbac-cm -n argocd
```

---

## ApplicationSet 多集群部署

**基本用法:创建 ApplicationSet**
`kubectl apply -f <appset.yaml>`

```yaml
# appset.yaml 多集群部署
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: web-multi-cluster
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: https://kubernetes.default.svc
        env: prod
      - cluster: https://staging-cluster.example.com
        env: staging
  template:
    metadata:
      name: 'web-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/repo.git
        targetRevision: HEAD
        path: manifests/web
      destination:
        server: '{{cluster}}'
        namespace: '{{env}}'
      syncPolicy:
        automated:
          prune: true
```

---

**基本用法:Git 生成器**
`spec.generators.git`

```yaml
# 基于 Git 目录结构生成应用
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: git-generator
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/org/mono-repo.git
      revision: HEAD
      directories:
      - path: apps/*
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      source:
        repoURL: https://github.com/org/mono-repo.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated: {}
```

---

## 通知与钩子

**基本用法:Sync Hooks**
`metadata.annotations.argocd.argoproj.io/hook`

```yaml
# deployment-with-hook.yaml 带 PreSync 钩子
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: migrate/migrate
        command: ["migrate", "-path", "/migrations", "-database", "$DB_URL", "up"]
      restartPolicy: Never
  backoffLimit: 3
```

---

**基本用法:配置通知**
`kubectl edit configmap argocd-notifications-cm -n argocd`

```yaml
# 通知配置示例
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [slack-deployed]
  template.slack-deployed: |
    message: |
      {{.app.metadata.name}} 已成功部署
```

---

## 排查与诊断

**基本用法:查看应用事件**
`argocd app get <应用名> --show-operation`

```bash
# 查看最近的同步操作
argocd app get web-app --show-operation

# 查看应用资源树
argocd app resources web-app

# 查看应用同步日志
argocd app logs web-app
```

---

**基本用法:排查同步失败**
`argocd app sync <应用名> --dry-run`

```bash
# 干运行查看将同步的资源
argocd app sync web-app --dry-run

# 查看同步错误
argocd app get web-app | grep -A 20 "sync"

# 强制重新同步
argocd app sync web-app --replace --force

# 查看 ArgoCD 控制器日志
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=50
```

---

**基本用法:刷新与缓存**
`argocd app get <应用名> --refresh`

```bash
# 强制刷新 Git 状态
argocd app get web-app --refresh

# 重新评估应用
argocd app get web-app --hard-refresh

# 刷新所有应用
argocd app list -o json | jq -r '.[].metadata.name' | xargs -I {} argocd app get {} --refresh
```
