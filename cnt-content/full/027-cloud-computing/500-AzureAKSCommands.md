---
order: 560
title: Azure AKS Kubernetes 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'AKS 学习笔记：从零创建第一个集群并跑起一个应用，再到节点池、伸缩、升级与成本控制的全过程命令。'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'cloud-computing/110-KubernetesCore'
  - 'cloud-computing/360-AzureCliConfigure'
  - 'cloud-computing/250-LoadBalanceAutoScaling'
prerequisites:
  - 'cloud-computing/110-KubernetesCore'
  - 'cloud-computing/360-AzureCliConfigure'
---

## 场景

假设你在一家小团队做后端，CI 里已经能用 GitHub Actions 构建出容器镜像，现在想让这个镜像跑在托管 Kubernetes 上：不用自己维护控制面，流量来了能扩容，半夜挂了有人兜底。Azure 上对应的服务就是 AKS（Azure Kubernetes Service）。

这篇笔记按真实操作顺序走一遍：创建集群、连上去、跑应用、配伸缩、做升级、控成本。所有命令都基于 Azure CLI（`az`），先用 `az login` 登录再动手。

## 第一步：创建集群

最小可用的创建命令只需要三样东西：名字、资源组、节点数。

```bash
# 创建资源组（资源的"文件夹"）
az group create --name my-rg --location eastasia

# 创建 3 节点 AKS 集群
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --node-count 3 \
  --node-vm-size Standard_DS2_v2 \
  --generate-ssh-keys
```

第一次执行要等 5-10 分钟。`--generate-ssh-keys` 让 CLI 复用你本机的 SSH 公钥用于节点排障。创建完先别急着用，真实项目还要回答几个选择题。

### 生产集群要多加的参数

下面的参数默认都不开，但生产集群几乎都要：

```bash
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --node-count 3 \
  --zones 1 2 3 \
  --enable-aad \
  --aad-admin-group-object-ids 00000000-0000-0000-0000-000000000000 \
  --enable-azure-rbac \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --pod-cidr 10.244.0.0/16
```

为什么是这几项：

| 参数 | 解决什么问题 | 不加的后果 |
| :--- | :--- | :--- |
| `--zones 1 2 3` | 节点分散到三个可用区 | 整个可用区故障时集群全灭 |
| `--enable-aad` + 管理组 ID | 用 Azure AD 组管理集群管理员 | 只能靠集群本地证书和 kubeconfig 分发，人走了权限收不回 |
| `--enable-azure-rbac` | K8s RBAC 角色由 Azure 统一管理 | 两套权限体系各管各的，审计困难 |
| `--network-plugin azure --network-plugin-mode overlay` | Pod 走 Overlay 网络，不消耗 VNet IP | Azure CNI 默认模式给每个 Pod 分配 VNet 真实 IP，子网容易打满 |

如果想让系统组件和应用分开跑，可以在创建时就拆出系统节点池：

```bash
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --nodepool-name systempool \
  --node-count 3 \
  --mode System
```

`--mode System` 表示这个池只跑 CoreDNS、metrics-server 等系统组件；业务负载后面放到 User 池，互不拖累。

## 第二步：连上集群

```bash
# 将 AKS 凭证合并到本机 kubeconfig
az aks get-credentials \
  --name my-aks \
  --resource-group my-rg

# 验证
kubectl get nodes
```

这条命令做的工作是把集群的访问端点和凭证写进 `~/.kubeconfig`，并设置当前 context。三个变体各有用途：

```bash
# 机器上已有同名 context 时，不覆盖会报错，加参数强制覆盖
az aks get-credentials --name my-aks --resource-group my-rg --overwrite-existing

# 获取 cluster-admin 级别的管理员凭证（应急用，绕过 Azure RBAC）
az aks get-credentials --name my-aks --resource-group my-rg --admin
```

日常用默认凭证（受 Azure RBAC 约束），`--admin` 只留给"RBAC 配坏了把自己锁在门外"的应急场景。

了解集群状态的两个查询：

```bash
# 查看集群详细配置
az aks show --name my-aks --resource-group my-rg

# 列出资源组下所有集群
az aks list --resource-group my-rg --output table
```

## 第三步：把镜像跑起来

AKS 不会自己变出镜像，镜像要从容器注册表拉。Azure 的注册表叫 ACR（Azure Container Registry），和 AKS 配套使用是标准姿势：

```bash
# 创建 ACR（名字全局唯一，只能小写字母数字）
az acr create --name myacr123 --resource-group my-rg --sku Premium

# 本机登录 ACR，之后才能 docker push
az acr login --name myacr123

# 查看里面已有哪些镜像仓库
az acr repository list --name myacr123 --output table
```

关键一步是让 AKS 有权限从 ACR 拉镜像——`--attach-acr` 一条命令搞定（它内部创建的是 kubelet 身份的 `AcrPull` 角色授权）：

```bash
az aks update --name my-aks --resource-group my-rg --attach-acr myacr123
```

然后按正常 Kubernetes 流程部署（`kubectl apply` 一个 Deployment，镜像地址写 `myacr123.azurecr.io/myapp:1.0`）。这部分属于 K8s 本身的知识，见 [Kubernetes Core](/cloud-computing/110-KubernetesCore)。

临时排查时不必本机装 kubectl 也能查集群——`command invoke` 直接在集群侧执行：

```bash
az aks command invoke \
  --name my-aks \
  --resource-group my-rg \
  --command "kubectl get pods -A"
```

私有集群（下文）控制面不可公网访问时，这条命令是主要的排障通道。

## 第四步：伸缩

两条伸缩路线，对应两种流量模式：

### 手动与自动的节点伸缩

```bash
# 手动：把默认节点池调到 5 个节点
az aks scale --name my-aks --resource-group my-rg --node-count 5
```

```bash
# 自动：开集群自动伸缩器，节点数在 3-10 之间随负载变化
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10

# 关闭自动伸缩
az aks update --name my-aks --resource-group my-rg --disable-cluster-autoscaler
```

集群自动伸缩器响应的是"Pod 调度不上去"这个信号：Pod 因为资源不足处于 Pending 时它加节点，节点空闲太久它减节点。所以 min/max 的意义是给成本画一条上下界。

### 节点池级别的伸缩

更常见的做法是给业务单独开一个 User 池再配自动伸缩，让 System 池保持稳定：

```bash
# 添加用户节点池
az aks nodepool add \
  --cluster-name my-aks \
  --name userpool \
  --resource-group my-rg \
  --node-count 5 \
  --node-vm-size Standard_DS3_v2 \
  --mode User

# 查看所有节点池
az aks nodepool list --cluster-name my-aks --resource-group my-rg --output table

# 手动缩放用户池
az aks nodepool scale --cluster-name my-aks --name userpool --resource-group my-rg --node-count 8

# 给用户池单独开自动伸缩（2-20 个节点）
az aks nodepool update \
  --cluster-name my-aks \
  --name userpool \
  --resource-group my-rg \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 20
```

### Pod 侧伸缩

节点伸缩解决"没有机器"，Pod 伸缩解决"Pod 不够"：

- HPA（水平 Pod 伸缩）由 Kubernetes 自带，按 CPU/内存/自定义指标扩 Pod。
- KEDA 处理事件驱动场景（队列长度、消息积压），AKS 里一条命令开托管版：

```bash
az aks update --name my-aks --resource-group my-rg --enable-keda
```

为什么层级要分清：流量涨了先扩 Pod（秒级）→ Pod 扩到 max 还不够再扩节点（分钟级）。两层都配好，才叫弹性。

## 第五步：升级

Kubernetes 平均每几个月出一个小版本，AKS 会逐步淘汰旧版本，升级是逃不掉的日常维护。

```bash
# 先看集群能升到哪些版本
az aks get-upgrades --name my-aks --resource-group my-rg

# 升级控制面到指定版本
az aks upgrade --name my-aks --resource-group my-rg --kubernetes-version 1.31.0

# 也可以只升控制面、暂不动节点（分两步走降低风险）
az aks upgrade --name my-aks --resource-group my-rg --kubernetes-version 1.31.0 --control-plane-only

# 节点池单独升级
az aks nodepool upgrade \
  --cluster-name my-aks \
  --name userpool \
  --resource-group my-rg \
  --kubernetes-version 1.31.0
```

升级节点池的方式是"滚动替换"：按扩容阈值新建新版本节点、迁移 Pod、再删旧节点，所以要保证集群有足够的 IP 和配额余量。两个降低惊吓度的配置：

```bash
# 把升级放进维护窗口（配置写在 JSON 文件里，例如每周六凌晨）
az aks maintenanceconfiguration add \
  --cluster-name my-aks \
  --resource-group my-rg \
  --name default \
  --config-file maintenance.json

# 或干脆交给自动升级通道（patch 只收补丁，stable 跟随稳定版）
az aks update --name my-aks --resource-group my-rg --auto-upgrade-channel stable
```

自检：升级前确认所有 Deployment 的副本数至少为 2 并且配了 PodDisruptionBudget，否则滚动替换时会甩掉你的服务。

## 第六步：身份与安全

这一节是 AKS 与"裸 Kubernetes"差异最大的地方。

### 工作负载身份（Workload Identity）

Pod 里要读 Azure 资源（比如读 Key Vault 拿数据库密码）时，正确姿势不是往 Pod 里塞密码，而是给工作负载发一个 Azure AD 身份：

```bash
# 开启 OIDC 颁发者与工作负载身份支持
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-workload-identity \
  --enable-oidc-issuer

# 查看 OIDC 颁发者 URL（建联合身份凭证时要用）
az aks show \
  --name my-aks \
  --resource-group my-rg \
  --query oidcIssuerProfile.issuerURL \
  --output tsv
```

原理一句话：AKS 变成一个 OIDC 身份提供方，K8s ServiceAccount 可以换取 Azure AD 的令牌，Pod 用令牌直接访问 Azure 资源，全程没有静态密钥。

### Key Vault 密钥同步

已有密钥想挂载进 Pod，可以开 Key Vault Secrets Provider 附加组件：

```bash
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-keyvault-secrets-provider \
  --rotate-secret-after 30d
```

### 授权别人访问集群

```bash
# 给用户授予"集群用户"角色（能 get-credentials 并按 RBAC 访问）
az role assignment create \
  --role "Azure Kubernetes Service Cluster User Role" \
  --assignee 00000000-0000-0000-0000-000000000000 \
  --scope /subscriptions/xxx/resourceGroups/my-rg/providers/Microsoft.ContainerService/managedClusters/my-aks
```

### 网络隔离选项

```bash
# 私有集群：API 服务器不可公网访问
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --enable-private-cluster \
  --enable-private-cluster-public-fqdn

# 指定固定公网 IP 作为服务出口（白名单对接外部系统时必需）
az aks create \
  --name my-aks \
  --resource-group my-rg \
  --load-balancer-outbound-ips /subscriptions/.../providers/Microsoft.Network/publicIPAddresses/my-ip
```

私有集群下本机 kubectl 连不上 API 服务器，排障走 `az aks command invoke`。

## 第七步：可观测与附加组件

按需开启，每个附加组件都有成本或资源开销，不是越多越好：

```bash
# Container Insights：容器指标与日志进 Log Analytics（需要指定工作区）
az aks update \
  --name my-aks \
  --resource-group my-rg \
  --enable-azure-monitor \
  --workspace-resource-id /subscriptions/.../providers/Microsoft.OperationalInsights/workspaces/my-law

# Azure Policy：用策略约束集群配置（禁止 privileged 容器等）
az aks update --name my-aks --resource-group my-rg --enable-azure-policy

# Image Cleaner：定期清理节点上没被引用的镜像，省磁盘
az aks update --name my-aks --resource-group my-rg \
  --enable-image-cleaner --image-cleaner-interval-hours 24

# Azure Service Mesh：托管 Istio 服务网格
az aks update --name my-aks --resource-group my-rg --enable-azure-service-mesh

# HTTP 应用路由附加组件（入门演示用，生产建议换 ingress-nginx/AGIC）
az aks update --name my-aks --resource-group my-rg --enable-http-application-routing
```

排查集群本身的问题：

```bash
# 查看集群是否处于运行状态
az aks show --name my-aks --resource-group my-rg --query 'powerState'

# 看 Azure 侧对集群做过什么操作（升级、伸缩都有记录）
az monitor activity-log list \
  --resource-id /subscriptions/.../resourceGroups/my-rg/providers/Microsoft.ContainerService/managedClusters/my-aks \
  --max-events 50
```

## 第八步：成本控制与清理

开发/测试集群按需停机，能省下绝大部分计算费用（控制面免费层不收费，节点 VM 停了就不计费）：

```bash
# 下班停机（保留集群状态）
az aks stop --name my-aks --resource-group my-rg

# 早上开机
az aks start --name my-aks --resource-group my-rg
```

删集群只有两种情况：彻底不用，或者重建。注意 `az aks delete` 只删集群本身，节点等资源所在的自动创建的 `MC_<rg>_<cluster>` 资源组会一起清理，但你自己创建在 `my-rg` 里的其他资源（ACR、公网 IP）不会动：

```bash
# 交互式确认删除
az aks delete --name my-aks --resource-group my-rg

# 脚本里免确认、后台删除
az aks delete --name my-aks --resource-group my-rg --yes --no-wait
```

## 坑点清单

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| kubeconfig 同名 context 冲突 | `get-credentials` 报错 | 加 `--overwrite-existing` |
| 用 `--admin` 凭证当日常凭证 | 绕过了 Azure RBAC 审计 | 日常用默认凭证，`--admin` 只留应急 |
| 默认 Azure CNI 打满子网 IP | 新节点/Pod 起不来 | 创建时用 CNI Overlay 模式 |
| 删集群后发现 ACR/IP 还在 | 继续计费 | 删集群后检查资源组，逐项清理 |
| 单副本应用没配 PDB 就升级 | 滚动升级时服务中断 | 副本至少 2 + PodDisruptionBudget |
| 只升控制面不升节点池 | 版本偏差过大，新版 API 不可用 | 控制面升级后尽快跟进节点池升级 |
| 开了一堆附加组件不看账单 | 月底费用超预期 | 每个附加组件评估必要性，Log Analytics 按量收费要盯 |

## 自检

1. `kubectl get nodes` 能看到节点，但 `kubectl get pods` 报 Forbidden——最可能少了哪一步？（提示：Azure RBAC 角色分配）
2. Pod 一直 Pending，集群自动伸缩器却没有加节点，先检查什么？（提示：min/max 配置与配额）
3. `az aks stop` 之后，ACR 里的镜像还计费吗？

## 练习

1. 用最简命令创建一个 1 节点集群，跑通 `get-credentials` 到 `kubectl run` 的全流程，然后 `az aks stop`，第二天再启动，观察节点恢复需要多久。
2. 创建 System/User 两个节点池，把一个测试 Deployment 用 nodeSelector 调度到 User 池，再给 User 池开自动伸缩（1-3）。
3. 用 `az aks get-upgrades` 查看可升级版本，模拟一次 `--control-plane-only` 升级，记录控制面与节点池版本偏差时 `kubectl version` 的输出。
4. 把本仓库 GitHub Actions 构建出的镜像推到你自己的 ACR，用 `--attach-acr` 打通后部署一个 hello 应用。

## 下一步

- 集群用 Helm 管理（见 [Helm 包管理](/cloud-computing/150-HelmPackageManagement)），不要手写一堆 YAML。
- 监控深入：Log Analytics 查询与告警（见 [可观测性](/cloud-computing/170-Observability)）。
- 让升级和部署全自动：GitOps（见 [GitOps 持续交付](/cloud-computing/155-GitOpsContinuousDelivery) 的 ArgoCD/Flux 部分）。
- 命令记不全没关系，`az aks create --help` 和 `az find "az aks nodepool"` 是随身的官方手册。
