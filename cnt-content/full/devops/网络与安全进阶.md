---
order: 62
title: 网络与安全进阶
module: devops
category: 运维
difficulty: advanced
description: 网络与安全进阶：零信任网络、服务网格安全、证书管理与安全自动化
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/GitOps与持续交付
  - devops/监控与告警
  - devops/数据库运维
  - devops/Dockerfile多阶段构建
prerequisites:
  - devops/概述与Linux基础
---

## 1. 零信任网络

### 1.1 零信任原则

- 永不信任，始终验证
- 最小权限访问
- 假设已被入侵
- 微分段隔离
- 持续监控和验证

### 1.2 BeyondCorp 模型

Google BeyondCorp 架构：

```
用户/设备 → 访问代理 → 信任评估 → 资源
              ↑
         身份/设备/上下文
```

核心组件：

| 组件       | 功能               |
| ---------- | ------------------ |
| 信任代理   | 评估设备和用户信任 |
| 访问代理   | 执行访问策略       |
| 身份提供者 | 认证和授权         |
| 设备清单   | 设备注册和状态     |

### 1.3 零信任实现

**Tailscale**：基于 WireGuard 的零信任网络：

```bash
# 安装
curl -fsSL https://tailscale.com/install.sh | sh

# 认证
tailscale up

# 查看状态
tailscale status

# 访问内部服务
curl http://internal-service:8080
```

**Cloudflare Access**：

```
用户 → Cloudflare Edge → 身份验证 → 内部应用
```

## 2. 证书管理

### 2.1 cert-manager

Kubernetes 证书管理工具：

```yaml
# 安装
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# ClusterIssuer（Let's Encrypt）
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

```yaml
# 证书签发
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: myapp-cert
spec:
  secretName: myapp-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - myapp.example.com
```

### 2.2 内部 CA

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ca-issuer
spec:
  ca:
    secretName: ca-key-pair
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-cert
spec:
  secretName: internal-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
    - myapp.internal
  duration: 720h # 30天
  renewBefore: 168h # 提前7天续签
```

### 2.3 证书轮换

- 自动续签：cert-manager 在到期前自动续签
- 滚动更新：新证书生效后 Pod 自动重启
- mTLS 证书：服务网格自动轮换

## 3. 安全自动化

### 3.1 安全扫描流水线

```yaml
# CI/CD 安全扫描
stages:
  - test
  - security
  - deploy

sast:
  stage: security
  image: returntocorp/semgrep
  script:
    - semgrep --config auto --json -o sast-results.json .
  artifacts:
    paths:
      - sast-results.json

container-scan:
  stage: security
  image: aquasec/trivy
  script:
    - trivy image --exit-code 1 --severity HIGH,CRITICAL $IMAGE

secret-scan:
  stage: security
  image: zricethezav/gitleaks
  script:
    - gitleaks detect --source . --report-format json --report-path leaks.json
```

### 3.2 安全策略即代码

**Open Policy Agent（OPA）**：

```rego
# 禁止特权容器
package kubernetes.admission

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.privileged
    msg := sprintf("Privileged container not allowed: %v", [container.name])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.memory
    msg := sprintf("Memory limit required: %v", [container.name])
}
```

### 3.3 安全合规自动化

| 检查项   | 工具                | 频率     |
| -------- | ------------------- | -------- |
| 镜像漏洞 | Trivy/Grype         | 每次构建 |
| 代码漏洞 | Semgrep/SonarQube   | 每次提交 |
| 密钥泄露 | GitLeaks/TruffleHog | 每次提交 |
| K8s 安全 | kube-bench/Polaris  | 每日     |
| 依赖漏洞 | Dependabot/Snyk     | 每日     |
| 合规检查 | InSpec/OPA          | 每周     |

## 4. 网络策略与隔离

### 4.1 Kubernetes 网络策略

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
# 允许特定服务访问
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: database
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - port: 5432
```

### 4.2 服务网格安全

Istio 安全策略：

```yaml
# 严格 mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# 授权策略
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: api-to-db
  namespace: production
spec:
  selector:
    matchLabels:
      app: database
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ['cluster.local/ns/production/sa/api']
      to:
        - operation:
            methods: ['GET', 'POST']
            paths: ['/api/*']
```

## 5. 安全事件响应

### 5.1 安全事件分级

| 级别 | 描述                 | 响应时间 |
| ---- | -------------------- | -------- |
| P1   | 数据泄露、系统被入侵 | 立即     |
| P2   | 漏洞被利用、异常访问 | 1小时    |
| P3   | 可疑行为、策略违规   | 4小时    |
| P4   | 安全发现、改进建议   | 24小时   |

### 5.2 应急响应流程

```
1. 检测：安全监控发现异常
2. 遏制：隔离受影响系统
3. 根除：消除威胁
4. 恢复：恢复服务
5. 复盘：改进安全措施
```

### 5.3 取证分析

```bash
# 容器取证
docker commit <container> forensic-image
docker save forensic-image -o forensic.tar

# 日志收集
kubectl logs <pod> --previous > crash.log
journalctl -u docker --since "1 hour ago"

# 网络取证
tcpdump -i any -w capture.pcap host <suspicious-ip>
```
