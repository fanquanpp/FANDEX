---
order: 160
title: Kubernetes 安全
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: RBAC 最小权限拆分、Pod 安全准入三级、Secret 加密与外部密钥管理、镜像供应链收口。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Kubernetes 集群与工作负载安全——RBAC 授权、Pod 安全准入（PSS）、密钥管理与镜像供应链。
- **解决什么问题**：默认配置的 K8s 集群里，任何一个能进 Pod 的人都能读集群所有 Secret、起特权容器；「能跑起来」和「能上生产」之间隔着这一整层。
- **什么时候用到**：给团队/服务划分命名空间与权限时；CI 与应用需要的 ServiceAccount 收权时；上线前过安全基线评审；接外部审计工具（Trivy、falco）前搭基础。

前置：[Kubernetes 核心](/cloud-computing/110-KubernetesCore)（RBAC 提示在此首次出现，本文展开）、[Kubernetes 架构](/cloud-computing/120-KubernetesArchitecture)（准入控制链路）；云厂商层的 IAM/KMS 概念见[云安全服务](/cloud-computing/230-CloudSecurityService)。

## 1. RBAC：谁能在哪个范围做什么

RBAC 的四个对象与两个维度：

| 对象            | 作用域   | 内容                 |
| --------------- | -------- | -------------------- |
| Role            | 命名空间 | 一组规则（资源+动词）|
| ClusterRole     | 集群     | 一组规则             |
| RoleBinding     | 命名空间 | 把(Cluster)Role 绑给主体 |
| ClusterRoleBinding | 集群  | 把(Cluster)Role 绑给主体 |

```yaml
# 给支付服务命名空间的部署账号：只读核心资源
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deploy-reader
  namespace: payments
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deploy-reader-binding
  namespace: payments
subjects:
  - kind: ServiceAccount
    name: payments-ci
    namespace: payments
roleRef:
  kind: Role
  name: deploy-reader
  apiGroup: rbac.authorization.k8s.io
```

逐段解释与易错点：

- **最小权限拆分**：先写 `verbs: ["get", "list", "watch"]`（只读），发布流水线另建 `deploy-writer`（只需 `patch` deployments，不需要 `create`/`delete`）。新人常犯的是一把梭 `verbs: ["*"]`——CI 凭据泄露时攻击面是整个命名空间的增删改。
- RoleBinding 可以绑 ClusterRole：这是**复用规则的常用姿势**——集群里建一个通用的 `namespace-admin` ClusterRole，每个命名空间用 RoleBinding 把各自的团队组绑上去，权限自动限定在本命名空间。误以为「绑 ClusterRole 就有集群权限」是最常见的误解。
- `apiGroups: [""]` 是核心组（Pod、Service、ConfigMap 等无 apiVersion 前缀的资源），漏写或写错会让规则静默不匹配——`kubectl auth can-i` 永远返回 no 却不报错。
- 验证越权被拒（也是交付验收项）：

```bash
kubectl auth can-i delete deployments -n payments --as=system:serviceaccount:payments:payments-ci
# no

kubectl auth can-i patch deployments -n payments --as=system:serviceaccount:payments:payments-ci
# no   （deploy-writer 才是 yes）
```

**工程场景（支付命名空间收权）**：改造前 CI 的 ServiceAccount 挂着 `cluster-admin`（为图省事），安全审计判高危。改造三步：拆只读/发布两条 Role；CI 流水线按阶段用两个账号；用 `kubectl auth can-i --list` 输出实际权限矩阵进评审。改造后误删 `kubectl delete namespace` 这类操作在凭据泄露的假设下也不再可能。

## 2. Pod 安全准入（PSS）：拦住危险 Pod

Pod Security Admission（K8s 1.25+ 内置，取代已废弃的 PodSecurityPolicy）定义三个递进等级：

| 等级       | 含义                         | 典型拒绝项                       |
| ---------- | ---------------------------- | -------------------------------- |
| privileged | 无限制                       | -                                |
| baseline   | 拒绝已知提权手段             | privileged: true、hostNetwork、hostPath |
| restricted | baseline + 深度加固          | 还要求 runAsNonRoot、drop ALL capabilities、seccompProfile |

在命名空间上打标签启用：

```bash
# payments 命名空间强制 restricted，违反的 Pod 创建直接被拒
kubectl label ns payments \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest

# audit/warn 只告警不拦截（存量应用迁移期先用这两个）
kubectl label ns legacy-app \
  pod-security.kubernetes.io/audit=baseline \
  pod-security.kubernetes.io/warn=baseline
```

满足 restricted 的 Pod 模板关键字段：

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        capabilities:
          drop: ["ALL"]
        readOnlyRootFilesystem: true
```

- 迁移路径：存量命名空间先上 `audit` + `warn`（事件里能看到会被拒的原因），改完工作负载再切 `enforce`——直接 enforce 会让老应用一夜之间无法发布。
- 易错点：`readOnlyRootFilesystem: true` 对写临时文件的应用要配 `emptyDir` 挂 `/tmp`，否则应用一写盘就崩——这是 restricted 上线后最高频的故障。
- Istio 服务网格场景的 sidecar 注入要求与 PSS 的配合见[服务网格](/cloud-computing/160-ServiceMesh)。

**工程场景**：用 PSS restricted 拦截一个第三方 helm chart 里的 `privileged: true` 容器——`kubectl apply` 直接报 `forbidden: violates PodSecurity "restricted"`，比等到渗透测试报告才发现早了几个季度。

## 3. Secret：编码不是加密

K8s Secret 默认只是 **Base64 编码**存储在 etcd，任何能读该 Secret 的 API 请求都能还原明文。三层加固：

1. **etcd 静态加密**：API Server 配置 `EncryptionConfiguration`，用 KMS（云厂商密钥服务）加密 etcd 中的 Secret 数据。
2. **RBAC 收权**：`secrets` 资源单独建 Role，`list` 权限尤其危险（一次列出命名空间全部密钥）；按需 `get` 单个名字。
3. **外部密钥管理**：Secret 根本不进集群，Pod 通过 External Secrets Operator 或 Vault Agent 从 Vault/云密钥服务**同步或注入**，轮换与审计都在密钥服务侧。

```yaml
# External Secrets Operator：把 AWS Secrets Manager 的密钥同步为 K8s Secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payment-db
  namespace: payments
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: payment-db-credentials
  data:
    - secretKey: password
      remoteRef:
        key: prod/payment-db
        property: password
```

- 分工对比：etcd 加密防「磁盘被拿走」；RBAC 防「集群内横向移动」；External Secrets 把密钥的生命周期（轮换、吊销、审计）交还给专业系统，GitOps 仓库里也不再出现密文。
- 易错点：密钥不进 Git 的同时**也别进 CI 日志**——`kubectl get secret -o yaml` 的输出贴进 issue/日志等于泄漏；CI 里一律用变量注入且对日志脱敏。

## 4. 镜像供应链

容器逃逸的最短路径往往是「镜像里有后门或有洞」。四个收口动作：

1. **固定标签到摘要**：`image: repo/app@sha256:abc123...`——标签可被覆盖重推，摘要不可变。GitOps 场景由 CI 提交摘要级 tag（见 [GitOps 持续交付](/cloud-computing/155-GitOpsContinuousDelivery)）。
2. **扫描**：CI 阶段 Trivy/Grype 扫镜像 CVE，高危阻断合入；集群侧定期重扫（老洞配新披露）。
3. **签名与验签**：cosign 对镜像签名，集群侧策略（Kyverno/Gatekeeper）只放行「本组织签名」的镜像——`kubectl apply` 一个陌生来源镜像直接被准入拒绝。
4. **最小基础镜像**：distroless/scratch 基础镜像把 shell、包管理器都裁掉，攻击者进容器后没有可用工具链；镜像也从 800MB 降到 20MB（拉取更快、扫描面更小）。

```yaml
# Kyverno 策略：只允许带本组织 cosign 签名的镜像（示意）
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-signature
      match:
        any:
          - resources:
              kinds: [Pod]
      verifyImages:
        - imageReferences: ["registry.example.com/*"]
          attestors:
            - entries:
                - keyless:
                    issuer: https://token.actions.githubusercontent.com
```

## 动手实践

**任务**：在测试集群完成一次「收权 + 拦截」演练：

1. 建命名空间 `payments`，启用 PSS `enforce=restricted`；
2. 部署一个 `privileged: true` 的 Pod，观察被拒并记录报错；
3. 改成满足 restricted 的最小 Pod（含 `/tmp` emptyDir）让它跑起来；
4. 建 `payments-ci` ServiceAccount 与只读 Role，用 `--as` 验证它能读 Deployment、不能删。

提示：

1. 被拒的报错在 `kubectl apply` 的 stderr 与命名空间事件里都会出现，关键字 `violates PodSecurity`；
2. restricted 校验清单逐条对：runAsNonRoot、seccompProfile、allowPrivilegeEscalation、capabilities.drop；
3. `kubectl auth can-i --list --as=system:serviceaccount:payments:payments-ci -n payments` 输出权限矩阵做自检。

<details>
<summary>自检清单（先自己做，再展开对照）</summary>

- privileged Pod 的报错应包含 `privileges must not be allowed` 或 `host namespaces` 等具体字段提示——按提示逐个修字段比查文档快。
- 只读账号验证：`can-i get deployments` 为 yes、`can-i delete deployments` 为 no、`can-i list secrets` 为 no（Secret 收权单独建了 Role 的话）。
- 常见翻车：Pod 起了但立刻 CrashLoopBackOff，`logs` 显示写盘失败——是 `readOnlyRootFilesystem` 没配 `/tmp` emptyDir，不是镜像坏了。

</details>

## 常见陷阱

1. **`verbs: ["*"]` 一把梭**：CI 与应用的 ServiceAccount 全量权限，泄露即沦陷；按动作拆 Role。
2. **以为 Secret 是加密**：Base64 只是编码；etcd 加密 + RBAC + 外部密钥三层至少配齐两层。
3. **直接 enforce restricted**：存量应用一夜无法发布；先 audit/warn 观察期再 enforce。
4. **镜像用 `latest` 或可变标签**：回滚失效、两节点版本漂移；固定摘要。
5. **`kubectl get secret -o yaml` 进日志/issue**：等于明文泄漏；日志脱敏与最小读取权限同样重要。

## 相关阅读

- 命名空间与资源对象基础：[Kubernetes 核心](/cloud-computing/110-KubernetesCore)
- 准入控制与 API Server 链路：[Kubernetes 架构](/cloud-computing/120-KubernetesArchitecture)
- NetworkPolicy 与云安全组收口：[Kubernetes 网络](/cloud-computing/130-KubernetesNetwork) 与 [云网络服务](/cloud-computing/220-CloudNetworkService)
- 云厂商 IAM/KMS（集群外层）：[云安全服务](/cloud-computing/230-CloudSecurityService)

## 参考与致谢

- Kubernetes 官方文档 Security 章节（CC-BY 4.0）：https://kubernetes.io/docs/concepts/security/
- Pod Security Admission（CC-BY 4.0）：https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Using RBAC Authorization（CC-BY 4.0）：https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- External Secrets Operator 文档（Apache-2.0）：https://external-secrets.io/
