---
order: 260
title: 密钥管理与配置中心
module: 'devops'
category: 云与基础设施
difficulty: beginner
description: 配置管理的原则与工具版图、集中式配置中心（Nacos/Spring Cloud Config）、多环境管理（Kustomize overlay）、密钥治理（Vault/K8s Secrets/ESO）
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：DevOps 基础设施 / 配置与密钥治理（应用"参数从哪来、密码谁保管"）。
- **解决什么问题**：数据库密码写死在代码里进了 Git；改一个超时参数要重新构建发布；测试环境的配置串到生产——这些都是配置没被当"一等公民"管理。
- **什么时候用到**：应用接入配置中心；多环境部署差异化；接手"密码散落在十几个地方"的系统做集中治理。
- **分工声明**：Ansible 这类"机器级配置下发"工具见 [Ansible](/devops/220-AnsiblePlaybookConfigManagement)；GitOps 的仓库结构与 ArgoCD/Flux 实操见 [GitOps 与 ArgoCD](/devops/190-GitOpsArgoCD)与[Flux 与多环境 GitOps](/devops/185-FluxAndMultiEnvGitOps)。本篇管**应用级**配置与密钥。

## 心智模型：配置的四个来源与一条优先级链

```text
命令行参数 > 环境变量 > 配置中心 > 本地配置文件 > 代码内默认值
```

优先级链是所有配置系统的公理——同一参数多处定义时谁赢靠它裁决。工程含义：

- **环境变量**是容器时代的通用接口（12-Factor App 的核心条款），配置中心也常把值最终注成环境变量；
- **代码内默认值**只给"绝对安全的非敏感值"——任何密钥出现在默认值里都是事故；
- 密钥永远不进优先级链的 Git 端——见密钥管理一节。

配置管理的四原则（承接配置管理总纲）：

1. **基础设施即代码**：配置以代码形式管理、可评审；
2. **版本控制**：每次变更可追溯（谁、何时、为什么）；
3. **幂等性**：同一份配置下发多次结果一致；
4. **不可变基础设施**：改配置=发新版本替换，而不是登机器改。

## 工具版图：先分清三类"配置管理"

| 类别 | 回答的问题 | 代表 |
| --- | --- | --- |
| 机器配置管理 | 100 台机器的软件与文件状态 | Ansible、Puppet、Chef、SaltStack |
| 应用配置中心 | 运行中应用的参数，改了立即生效 | Nacos、Apollo、Spring Cloud Config |
| 密钥管理 | 密码、证书的存储、分发与轮换 | Vault、K8s Secrets、云 KMS |

机器级三强对比（历史脉络一张表）：

| 工具 | 语言 | Agent | 模式 | 一句话定位 |
| --- | --- | --- | --- | --- |
| Ansible | YAML | 无 | 推送 | 无代理、上手最快，中小规模主流 |
| Puppet | Ruby | 有 | 拉取 | 老牌，大型传统企业存量多 |
| Chef | Ruby | 有 | 拉取 | 代码化最强，学习曲线陡 |
| SaltStack | Python | 有 | 推/拉 | 大规模速度快 |

选型一句话：新项目 Ansible（无 agent、SSH 即用）；已有 Puppet/Chef 存量不必迁；万级节点看 SaltStack。

## 场景一：接入配置中心（Nacos 为例）

需求：应用的超时参数、限流阈值要能**不重启**修改。Spring Cloud Config 与 Nacos 的接入：

```yaml
# Spring Cloud Config 服务端：配置仓库就是 Git（配置也有版本历史）
spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/org/config-repo
          searchPaths: '{application}/{profile}'   # 按应用/环境分目录
```

```bash
# Nacos：发布与获取配置（HTTP API）
curl -X POST "http://nacos:8848/nacos/v1/cs/configs" \
  -d "dataId=myapp.properties&group=DEFAULT_GROUP&content=server.port=8080"

curl "http://nacos:8848/nacos/v1/cs/configs?dataId=myapp.properties&group=DEFAULT_GROUP"
```

### 热更新的三种模式

| 模式 | 机制 | 一句话 |
| --- | --- | --- |
| 推送 | 配置中心主动通知应用 | 秒级生效，要求长连接 |
| 拉取 | 应用定期轮询 | 简单但有延迟与空转 |
| 长轮询 | 应用挂起等变更事件 | 折中方案，Nacos 默认 |

易错点：热更新只对**监听了配置变化**的 Bean 生效（Spring 里要 `@RefreshScope`）——"改了配置没生效"先查作用域注解，再查应用是不是根本没接配置中心（还读着本地文件）。

## 场景二：多环境管理（Kustomize overlay）

需求：同一套 YAML 部署到 dev/staging/production，差异只有副本数、镜像 tag、资源配额。原则：**base 定义相同、overlay 定义差异**：

```text
config/
├── base/                      # 三环境相同的骨架
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/                  # 环境差异覆盖
    ├── development/kustomization.yaml
    ├── staging/kustomization.yaml
    └── production/kustomization.yaml
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../../base
patchesStrategicMerge:
  - deployment-patch.yaml     # 生产专属的补丁（副本数、资源）
replicas:
  - name: myapp
    count: 5
```

部署生产就是 `kubectl apply -k overlays/production`。环境隔离的三个层级按预算选：namespace 隔离（同集群省资源，够大多数团队）、集群隔离（生产独占集群，故障与权限边界清晰）、云账号隔离（合规硬要求时）。三环境的"环境漂移"问题（某环境手改了配置）在 GitOps 体系里有系统解法，见 [GitOps 与 ArgoCD](/devops/190-GitOpsArgoCD)。

## 场景三：密钥治理（Vault + K8s Secrets）

五条密钥纪律（违反任何一条都迟早出事）：

1. 密钥不硬编码；
2. 密钥不入版本控制（.gitignore + pre-commit 扫描双保险）；
3. 密钥加密存储；
4. 密钥定期轮换（轮换成本是检验架构的试金石）；
5. 最小权限（应用只读自己那几个密钥）。

### Vault：动态数据库凭证

```bash
vault kv put secret/myapp db_password="s3cret" api_key="key123"   # 静态密钥
vault kv get secret/myapp

# 动态凭证：不预存密码，按需生成、到期自动回收
vault secrets enable database
vault write database/config/mydb \
  plugin_name=mysql-database-plugin \
  connection_url="{{username}}:{{password}}@tcp(db:3306)/" \
  allowed_roles="readonly"

vault write database/roles/readonly \
  db_name=mydb \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; GRANT SELECT ON *.* TO '{{name}}'@'%';" \
  default_ttl="1h" max_ttl="24h"
```

动态凭证是 Vault 区别于"加密保险箱"的本质能力：数据库账号按需创建、1 小时后自动删除——**密码泄露的最大杀伤被 TTL 拆掉了**。代价是 Vault 本身成为强依赖（它挂了新申请不到凭证），生产部署要高可用 + 灾备。与 Ansible 的结合（playbook 加密密钥文件）见 [Ansible](/devops/220-AnsiblePlaybookConfigManagement) 的 Vault 一节。

### K8s Secrets 与它的真实安全边界

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secret
type: Opaque
data:
  db-password: c2VjcmV0      # base64——这是编码不是加密！
stringData:
  api-key: 'plain-text'      # 明文写法，创建时自动编码
```

第一课就是那句注释：**base64 只是编码，拿到 etcd 数据的人直接可读**。K8s Secrets 的默认安全级别是"比 ConfigMap 略好"（可单独授权 RBAC），要真加密需要开 etcd 静态加密：

```yaml
# EncryptionConfiguration：apiserver 层加密，密钥存 KMS 更佳
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-key>
      - identity: {}
```

### External Secrets Operator：两边的好处都要

Vault 管密钥生命周期、K8s Secret 当注入接口——ESO 自动同步：

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-secret
spec:
  refreshInterval: 1h                      # 每小时同步（轮换自动跟上）
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: myapp-secret
  data:
    - secretKey: db-password
      remoteRef:
        key: secret/myapp
        property: db_password
```

应用侧代码零改动（Pod 还是挂 K8s Secret），密钥的真实来源与轮换在 Vault——这是当前生产环境的主流组合。

## 动手实践：给一个应用配齐配置与密钥

任务：

1. 用 docker 起 Nacos 单机版，创建 `demo.properties`，写一个读它的应用配置项；
2. 用 Kustomize 搭 base + 两个 overlay（dev 1 副本、prod 3 副本），diff 验证渲染结果；
3. 建 K8s Secret 并挂进 Pod 环境变量，进容器 `env` 验证；
4. （进阶）装 ESO，把 Secret 的来源换成 Vault；或用 `kubectl get secret -o jsonpath` 演示 base64 解码，体会"编码非加密"。

<details>
<summary>参考实现（先自己写再展开）</summary>

```bash
# 1
docker run -d --name nacos -p 8848:8848 -e MODE=standalone nacos/nacos-server
curl -X POST "http://127.0.0.1:8848/nacos/v1/cs/configs" \
  -d "dataId=demo.properties&group=DEFAULT_GROUP&content=app.timeout=3000"
curl "http://127.0.0.1:8848/nacos/v1/cs/configs?dataId=demo.properties&group=DEFAULT_GROUP"

# 2
mkdir -p config/base config/overlays/dev config/overlays/prod
# base/kustomization.yaml: resources 列出 deployment/service
# overlays/dev/kustomization.yaml:
cat > config/overlays/dev/kustomization.yaml <<'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases: [../../base]
replicas:
  - name: myapp
    count: 1
EOF
# prod 同理 count: 3
kubectl kustomize config/overlays/dev  | grep -A1 replicas    # 渲染检查
kubectl diff -k config/overlays/prod   # 应用前先 diff

# 3
kubectl create secret generic myapp-secret \
  --from-literal=db-password='s3cret'
kubectl set env deployment/myapp --from=secret/myapp-secret
kubectl exec deploy/myapp -- env | grep DB_PASSWORD

# 4 的解码演示
kubectl get secret myapp-secret -o jsonpath='{.data.db-password}' | base64 -d
# 输出 s3cret —— 证明 base64 只是编码
```

判读要点：任务 2 的 `kubectl diff` 是环境变更的最后一道闸；任务 4 的解码实验要形成肌肉记忆——看到"Secret 已 base64 加密"的说法要能当场反驳。
</details>

## 检验清单

- 能背出配置优先级链并解释环境变量为何是容器时代通用接口；
- 能分清机器配置管理、应用配置中心、密钥管理三类工具的边界；
- 能解释热更新三种模式与"改了没生效"的两个排查点；
- 能用 Kustomize base/overlay 结构表达多环境差异；
- 能说出 K8s Secrets 的安全边界（base64 非加密）与 etcd 静态加密的位置；
- 能描述 Vault 动态凭证与 ESO 组合的架构及各自收益。

## 下一步

- [Ansible](/devops/220-AnsiblePlaybookConfigManagement)：机器级配置的下发工具；
- [GitOps 与 ArgoCD](/devops/190-GitOpsArgoCD)：把本篇的配置仓库纳入声明式管理；
- [Kubernetes 核心资源](/devops/090-KubernetesCoreDetailed)：Secret/ConfigMap 在 Pod 里的挂载细节。

## 参考与致谢

- Kubernetes 官方文档 Secrets / Encrypting Secret Data at Rest（CC BY 4.0）：<https://kubernetes.io/docs/concepts/configuration/secret/>
- HashiCorp Vault 官方文档（BUSL，文档可自由阅读引用）：<https://developer.hashicorp.com/vault/docs>
- External Secrets Operator 官方文档（Apache-2.0）：<https://external-secrets.io/>
- 本篇配置中心/环境管理/密钥管理/工具版图各节承接自旧篇 230 并重写扩写。
