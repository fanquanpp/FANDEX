---
order: 59
title: 容器安全
module: devops
category: 运维
difficulty: advanced
description: 容器安全：镜像安全、运行时安全、K8s安全、安全策略与合规
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/自动化测试
  - devops/故障排查
  - devops/GitOps与持续交付
  - devops/监控与告警
prerequisites:
  - devops/概述与Linux基础
---

## 1. 容器安全概述

### 1.1 容器安全四层模型

```
应用代码安全
    ↓
容器镜像安全
    ↓
容器运行时安全
    ↓
宿主机/平台安全
```

### 1.2 安全原则

- 最小权限原则
- 防御纵深
- 不可变基础设施
- 零信任

## 2. 镜像安全

### 2.1 镜像扫描

```bash
# Trivy 扫描
trivy image nginx:latest
trivy image --severity HIGH,CRITICAL myapp:1.0
trivy image --ignore-unfixed myapp:1.0

# Grype 扫描
grype nginx:latest

# Docker Scout
docker scout cves nginx:latest
```

### 2.2 镜像签名与验证

```bash
# Cosign 签名
cosign sign --key cosign.key myregistry/myapp:1.0

# 验证签名
cosign verify --key cosign.pub myregistry/myapp:1.0

# K8s 中强制验证（Kyverno）
# 拒绝未签名镜像
```

### 2.3 安全基础镜像

| 基础镜像    | 大小  | 攻击面 | 适用场景     |
| ----------- | ----- | ------ | ------------ |
| ubuntu      | ~77MB | 大     | 需要完整环境 |
| debian-slim | ~80MB | 中     | 折中方案     |
| alpine      | ~5MB  | 小     | 精简环境     |
| distroless  | ~2MB  | 最小   | 仅需运行时   |
| scratch     | 0     | 无     | 静态编译     |

### 2.4 Dockerfile 安全最佳实践

```dockerfile
# 使用特定版本标签
FROM node:20.11-alpine3.19

# 创建非root用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 最小安装
RUN apk add --no-cache tini

# COPY 而非 ADD
COPY --chown=appuser:appgroup . /app

# 不以root运行
USER appuser

# 健康检查
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8080/health || exit 1

# 使用 tini 作为入口
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

## 3. 运行时安全

### 3.1 容器安全策略

```yaml
# Pod 安全标准（Pod Security Standards）
apiVersion: v1
kind: Pod
metadata:
  name: restricted-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: myapp:1.0
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
        runAsNonRoot: true
      resources:
        limits:
          memory: '512Mi'
          cpu: '500m'
```

### 3.2 三级安全策略

| 级别       | 说明         | 适用场景     |
| ---------- | ------------ | ------------ |
| Privileged | 无限制       | 系统组件     |
| Baseline   | 禁止明显提权 | 一般应用     |
| Restricted | 最严格       | 安全敏感应用 |

### 3.3 Seccomp 配置

限制容器可用的系统调用：

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [{ "names": ["read", "write", "exit", "sigreturn"], "action": "SCMP_ACT_ALLOW" }]
}
```

### 3.4 AppArmor / SELinux

**AppArmor 配置**：

```
#include <tunables/global>
profile docker-myapp flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  deny /etc/shadow r,
  deny /proc/*/mem rw,
  /app/** r,
  /tmp/** rw,
}
```

## 4. Kubernetes 安全

### 4.1 RBAC

```yaml
# 最小权限角色
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
  - apiGroups: ['']
    resources: ['pods']
    verbs: ['get', 'list', 'watch']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
  - kind: ServiceAccount
    name: myapp
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### 4.2 NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 8080
```

### 4.3 Secret 加密

- 启用 K8s Secret 加密（EncryptionConfiguration）
- 使用外部密钥管理（Vault + External Secrets Operator）
- 审计 Secret 访问

### 4.4 准入控制

**OPA Gatekeeper**：

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          properties:
            labels:
              type: array
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        violation[{"msg": msg}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing labels: %v", [missing])
        }
```

## 5. 安全监控

### 5.1 Falco

运行时安全监控：

```yaml
# Falco 规则
- rule: Terminal Shell in Container
  desc: A shell was spawned in a container
  condition: >
    spawned_process and container and
    proc.name in (bash, zsh, sh) and
    not proc.pname in (docker-entrypoint)
  output: 'Shell spawned in container (user=%user.name container=%container.name shell=%proc.name)'
  priority: WARNING
```

### 5.2 审计日志

```yaml
# K8s 审计策略
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: RequestResponse
    resources:
      - group: ''
        resources: ['secrets']
  - level: Metadata
    resources:
      - group: ''
        resources: ['pods', 'services']
    verbs: ['delete']
```

## 6. 合规与认证

### 6.1 CIS Benchmark

```bash
# kube-bench 检查
kube-bench run --targets master,node
kube-bench run --benchmark cis-1.8
```

### 6.2 SOC2 / ISO27001

容器环境合规要求：

- 镜像来源可信
- 漏洞扫描和修复
- 访问控制和审计
- 加密传输和存储
- 变更管理流程
